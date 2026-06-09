"""
SUPERVISION BT LUBUMBASHI — Backend API
Groupe 12 — Génie Logiciel — UDBL 2025/2026
FastAPI + MQTT + WebSocket temps réel
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import paho.mqtt.client as mqtt
import asyncio
import json
import sqlite3
import os
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from pydantic import BaseModel
import threading
import time
import random
import math

# ── CONFIGURATION ────────────────────────────────────────
MQTT_BROKER   = os.environ.get("MQTT_BROKER", "localhost")
MQTT_PORT     = int(os.environ.get("MQTT_PORT", "1883"))
MQTT_TOPIC    = "supervision/noeuds/#"
API_KEY       = "SUPERVOLT_SECRET_KEY_2026"
DB_PATH       = os.environ.get("DB_PATH", "supervision.db")
DEMO_NODE_ID  = os.environ.get("DEMO_NODE_ID", "NODE_LUB_001")

app = FastAPI(
    title="Supervision BT Lubumbashi",
    description="API de supervision du réseau électrique basse tension",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── BASE DE DONNÉES SQLite ───────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS noeud (
            id            TEXT PRIMARY KEY,
            nom           TEXT NOT NULL,
            adresse       TEXT,
            latitude      REAL DEFAULT -11.6609,
            longitude     REAL DEFAULT 27.4794,
            depart        INTEGER DEFAULT 1,
            statut        TEXT DEFAULT 'Actif',
            date_install  TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS mesure (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            id_noeud     TEXT NOT NULL,
            tension      REAL,
            courant      REAL,
            puissance    REAL,
            charge       REAL,
            temperature  REAL,
            statut       TEXT DEFAULT 'NORMAL',
            horodatage   TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_noeud) REFERENCES noeud(id)
        );

        CREATE TABLE IF NOT EXISTS anomalie (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            id_noeud       TEXT NOT NULL,
            type           TEXT,
            niveau         TEXT,
            description    TEXT,
            date_detection TEXT DEFAULT CURRENT_TIMESTAMP,
            statut         TEXT DEFAULT 'Active',
            FOREIGN KEY (id_noeud) REFERENCES noeud(id)
        );

        CREATE TABLE IF NOT EXISTS commande_delestage (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            id_noeud      TEXT NOT NULL,
            type          TEXT DEFAULT 'Ouverture',
            motif         TEXT,
            statut        TEXT DEFAULT 'Envoyee',
            date_commande TEXT DEFAULT CURRENT_TIMESTAMP
        );

        INSERT OR IGNORE INTO noeud VALUES
            ('NODE_LUB_001','Poteau demo soutenance','Cabine Kampemba 1 - maquette Arduino',-11.6630,27.4790,1,'Actif',CURRENT_TIMESTAMP),
            ('CAB_K1','Cabine Kampemba 1','Av. Sendwe × Tabora',-11.6580,27.4760,0,'Actif',CURRENT_TIMESTAMP),
            ('D1_P1','Départ BT 1 - Poteau 1','Av. Sendwe, D1',-11.6570,27.4780,1,'Actif',CURRENT_TIMESTAMP),
            ('D1_P2','Départ BT 1 - Poteau 2','Av. Sendwe, D1 fin',-11.6560,27.4800,1,'Actif',CURRENT_TIMESTAMP),
            ('D2_P1','Départ BT 2 - Poteau 1','Av. Tabora, D2',-11.6600,27.4780,2,'Actif',CURRENT_TIMESTAMP),
            ('D2_P2','Départ BT 2 - Poteau 2','Av. Tabora, D2 fin',-11.6610,27.4810,2,'Alerte',CURRENT_TIMESTAMP),
            ('D3_P1','Départ BT 3 - Poteau 1','Av. Kasaï, D3',-11.6630,27.4770,3,'Actif',CURRENT_TIMESTAMP),
            ('D3_P2','Départ BT 3 - Poteau 2','Av. Kasaï, D3 fin',-11.6640,27.4790,3,'Critique',CURRENT_TIMESTAMP);
    """)
    conn.commit()
    conn.close()

init_db()

# ── WEBSOCKET MANAGER ────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(data)
            except:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

manager = ConnectionManager()
latest_data: Dict[str, dict] = {}
event_loop: Optional[asyncio.AbstractEventLoop] = None

# ── UTILITAIRES API ───────────────────────────────────────
def determine_statut(tension: float, charge: float) -> str:
    if tension < 10:
        return "PANNE"
    if tension < 150 and charge > 90:
        return "SURCHARGE_CRITIQUE"
    if tension < 180 or charge > 85:
        return "ALERTE"
    return "NORMAL"


def ensure_node_exists(conn: sqlite3.Connection, node_id: str):
    exists = conn.execute("SELECT id FROM noeud WHERE id=?", (node_id,)).fetchone()
    if exists:
        return

    nom = "Poteau démo soutenance" if node_id == DEMO_NODE_ID else f"Nœud {node_id}"
    adresse = "Cabine Kampemba 1 - maquette Arduino" if node_id == DEMO_NODE_ID else "Nœud ajouté automatiquement"
    conn.execute("""
        INSERT INTO noeud (id, nom, adresse, latitude, longitude, depart, statut)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (node_id, nom, adresse, -11.6630, 27.4790, 1, "Actif"))


def save_measure_payload(node_id: str, payload: dict):
    node_id = str(node_id or payload.get("id_noeud") or DEMO_NODE_ID)
    payload["id"] = node_id
    payload["id_noeud"] = node_id
    payload["statut"] = payload.get("statut") or determine_statut(
        float(payload.get("tension", 0) or 0),
        float(payload.get("charge", 0) or 0),
    )
    latest_data[node_id] = payload
    conn = get_db()
    c = conn.cursor()
    ensure_node_exists(conn, node_id)
    c.execute("""
        INSERT INTO mesure (id_noeud, tension, courant, puissance, charge, temperature, statut)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        node_id,
        payload.get("tension", 0),
        payload.get("courant", 0),
        payload.get("puissance", 0),
        payload.get("charge", 0),
        payload.get("temperature", 0),
        payload.get("statut", "NORMAL")
    ))

    statut = payload.get("statut", "NORMAL")
    if statut in ("ALERTE", "SURCHARGE", "CHUTE_TENSION", "SURCHARGE_CRITIQUE", "PANNE"):
        c.execute("""
            INSERT INTO anomalie (id_noeud, type, niveau, description)
            VALUES (?, ?, ?, ?)
        """, (
            node_id,
            statut,
            "Critique" if "CRITIQUE" in statut or statut == "PANNE" else "Avertissement",
            f"{statut} détecté — Tension: {payload.get('tension',0):.1f}V, Courant: {payload.get('courant',0):.1f}A"
        ))

    conn.commit()
    conn.close()

    if event_loop and event_loop.is_running():
        asyncio.run_coroutine_threadsafe(
            manager.broadcast({"type": "mesure", "data": payload}),
            event_loop
        )


# ── MQTT CLIENT ──────────────────────────────────────────
def on_mqtt_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        node_id = payload.get("id") or payload.get("id_noeud") or DEMO_NODE_ID
        save_measure_payload(node_id, payload)
    except Exception as e:
        print(f"[MQTT] Erreur: {e}")

mqtt_client = mqtt.Client()
mqtt_client.on_message = on_mqtt_message

def start_mqtt():
    try:
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
        mqtt_client.subscribe(MQTT_TOPIC)
        mqtt_client.loop_forever()
    except Exception as e:
        print(f"[MQTT] Connexion échouée: {e}")

mqtt_thread = threading.Thread(target=start_mqtt, daemon=True)
mqtt_thread.start()

# ── MODÈLES PYDANTIC ─────────────────────────────────────
@app.on_event("startup")
async def capture_event_loop():
    global event_loop
    event_loop = asyncio.get_running_loop()


class CommandeDelestage(BaseModel):
    id_noeud: str
    type: str = "Ouverture"
    motif: Optional[str] = None

class NoeudUpdate(BaseModel):
    nom: Optional[str] = None
    adresse: Optional[str] = None
    statut: Optional[str] = None

# ── ROUTES API ───────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Supervision BT Lubumbashi — API v1.0", "status": "ok"}

@app.get("/api/noeuds")
def get_noeuds():
    conn = get_db()
    noeuds = conn.execute("SELECT * FROM noeud").fetchall()
    result = []
    for n in noeuds:
        d = dict(n)
        # Ajouter dernière mesure
        mesure = conn.execute(
            "SELECT * FROM mesure WHERE id_noeud=? ORDER BY id DESC LIMIT 1",
            (d["id"],)
        ).fetchone()
        d["derniere_mesure"] = dict(mesure) if mesure else None
        # Ajouter dernière donnée live
        d["live"] = latest_data.get(d["id"])
        result.append(d)
    conn.close()
    return result

@app.get("/api/noeuds/{node_id}")
def get_noeud(node_id: str):
    conn = get_db()
    n = conn.execute("SELECT * FROM noeud WHERE id=?", (node_id,)).fetchone()
    if not n:
        raise HTTPException(404, "Nœud non trouvé")
    result = dict(n)
    mesures = conn.execute(
        "SELECT * FROM mesure WHERE id_noeud=? ORDER BY id DESC LIMIT 100",
        (node_id,)
    ).fetchall()
    result["mesures"] = [dict(m) for m in mesures]
    conn.close()
    return result

@app.get("/api/mesures/historique/{node_id}")
def get_historique(node_id: str, limit: int = 48):
    conn = get_db()
    mesures = conn.execute(
        "SELECT * FROM mesure WHERE id_noeud=? ORDER BY id DESC LIMIT ?",
        (node_id, limit)
    ).fetchall()
    conn.close()
    return [dict(m) for m in reversed(mesures)]

@app.get("/api/anomalies")
def get_anomalies(statut: Optional[str] = None, limite: int = 50):
    limite = max(1, min(limite, 200))
    conn = get_db()
    if statut:
        rows = conn.execute(
            "SELECT * FROM anomalie WHERE statut=? ORDER BY id DESC LIMIT ?",
            (statut, limite)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM anomalie ORDER BY id DESC LIMIT ?",
            (limite,)
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/commandes/delestage")
def commander_delestage(cmd: CommandeDelestage):
    # Envoyer commande via MQTT
    payload = json.dumps({
        "cmd": "DELESTAGE",
        "id": cmd.id_noeud,
        "id_noeud": cmd.id_noeud,
        "type": cmd.type,
        "motif": cmd.motif,
        "timestamp": datetime.now().isoformat()
    })
    mqtt_client.publish(f"supervision/commandes/{cmd.id_noeud}", payload)

    # Sauvegarder
    conn = get_db()
    conn.execute(
        "INSERT INTO commande_delestage (id_noeud, type, motif) VALUES (?,?,?)",
        (cmd.id_noeud, cmd.type, cmd.motif)
    )
    conn.commit()
    conn.close()

    return {"message": f"Commande {cmd.type} envoyée au nœud {cmd.id_noeud}", "status": "ok"}

@app.post("/api/delestage")
def delestage_api(cmd: CommandeDelestage, x_api_key: Optional[str] = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Clé API invalide")
    return commander_delestage(cmd)

@app.post("/api/mesures")
def receive_mesure(data: dict):
    node_id = str(data.get("id_noeud") or data.get("id") or "UNKNOWN")
    tension = float(data.get("tension", 0))
    courant = float(data.get("courant", 0))
    puissance = float(data.get("puissance", round(tension * courant, 1))) if data.get("puissance") is not None else round(tension * courant, 1)
    charge = float(data.get("charge", round((courant / 100) * 100, 1))) if data.get("charge") is not None else round((courant / 100) * 100, 1)
    temperature = float(data.get("temperature", 0))
    statut = data.get("statut") or determine_statut(tension, charge)
    payload = {
        "id": node_id,
        "id_noeud": node_id,
        "tension": tension,
        "courant": courant,
        "puissance": puissance,
        "charge": charge,
        "temperature": temperature,
        "statut": statut,
        "timestamp": datetime.now().isoformat()
    }
    save_measure_payload(node_id, payload)
    return {"statut": "Données et analyses traitées avec succès", "data": payload}

@app.get("/api/statut_reseau")
def get_statut_reseau():
    conn = get_db()
    rows = conn.execute("SELECT id, adresse, latitude, longitude FROM noeud").fetchall()
    result = []
    for r in rows:
        d = dict(r)
        node_id = d["id"]
        live = latest_data.get(node_id)
        if live:
            d.update({
                "id_noeud": node_id,
                "tension": live.get("tension"),
                "courant": live.get("courant"),
                "statut": live.get("statut", "NORMAL")
            })
        else:
            last = conn.execute(
                "SELECT tension, courant, statut FROM mesure WHERE id_noeud=? ORDER BY id DESC LIMIT 1",
                (node_id,)
            ).fetchone()
            if last:
                d.update({
                    "id_noeud": node_id,
                    "tension": last["tension"],
                    "courant": last["courant"],
                    "statut": last["statut"]
                })
            else:
                d.update({
                    "id_noeud": node_id,
                    "tension": None,
                    "courant": None,
                    "statut": "Inconnu"
                })
        result.append(d)
    conn.close()
    return result

@app.get("/api/stats/resume")
def get_resume():
    conn = get_db()
    total_noeuds  = conn.execute("SELECT COUNT(*) FROM noeud").fetchone()[0]
    noeuds_actifs = conn.execute("SELECT COUNT(*) FROM noeud WHERE statut='Actif'").fetchone()[0]
    anomalies_act = conn.execute("SELECT COUNT(*) FROM anomalie WHERE statut='Active'").fetchone()[0]

    # Tension moyenne dernières mesures
    tension_moy = conn.execute("""
        SELECT AVG(tension) FROM mesure
        WHERE id IN (
            SELECT MAX(id) FROM mesure GROUP BY id_noeud
        ) AND tension > 0
    """).fetchone()[0] or 0

    conn.close()

    # Données live si disponibles
    tensions = [d["tension"] for d in latest_data.values() if d.get("tension", 0) > 0]
    if tensions:
        tension_moy = sum(tensions) / len(tensions)

    charges = [d.get("charge", 0) for d in latest_data.values()]
    charge_moy = sum(charges) / len(charges) if charges else 0

    return {
        "total_noeuds":   total_noeuds,
        "noeuds_actifs":  noeuds_actifs,
        "anomalies_actives": anomalies_act,
        "tension_moyenne": round(tension_moy, 1),
        "charge_moyenne":  round(charge_moy, 1),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/stats/historique_global")
def get_historique_global(heures: int = 24):
    """Historique global pour le graphique principal"""
    conn = get_db()
    rows = conn.execute("""
        SELECT id_noeud, tension, courant, charge, statut, horodatage
        FROM mesure
        WHERE horodatage >= datetime('now', ?)
        ORDER BY horodatage ASC
    """, (f"-{heures} hours",)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ── WEBSOCKET TEMPS RÉEL ─────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    # Envoyer état initial
    await ws.send_json({"type": "connected", "message": "Connecté au serveur de supervision"})
    try:
        # Envoyer un heartbeat toutes les 5 secondes
        while True:
            await asyncio.sleep(5)
            await ws.send_json({
                "type": "heartbeat",
                "timestamp": datetime.now().isoformat(),
                "connected_clients": len(manager.active)
            })
    except WebSocketDisconnect:
        manager.disconnect(ws)

# ── ENDPOINT SIMULATION (pour tests sans matériel) ───────
@app.post("/api/simulation/start_legacy")
def start_simulation():
    """Lance la simulation de données pour les tests"""
    def simulate():
        noeuds = ["CAB_K1","D1_P1","D1_P2","D2_P1","D2_P2","D3_P1","D3_P2"]
        base_tensions = {"CAB_K1":220,"D1_P1":215,"D1_P2":210,"D2_P1":175,"D2_P2":162,"D3_P1":90,"D3_P2":0}
        t = 0
        while True:
            for nid in noeuds:
                base_v = base_tensions[nid]
                tension = max(0, base_v + math.sin(t/10)*8 + random.uniform(-3,3))
                courant = random.uniform(20, 95) if tension > 10 else 0
                charge  = (courant / 100) * 100
                statut  = "NORMAL"
                if tension == 0:      statut = "PANNE"
                elif tension < 150:   statut = "SURCHARGE_CRITIQUE"
                elif tension < 180:   statut = "CHUTE_TENSION"
                elif charge > 85:     statut = "SURCHARGE"

                payload = json.dumps({
                    "id": nid, "tension": round(tension,1),
                    "courant": round(courant,1),
                    "puissance": round(tension*courant,1),
                    "charge": round(charge,1),
                    "temperature": round(random.uniform(28,45),1),
                    "statut": statut,
                    "timestamp": datetime.now().isoformat()
                })
                mqtt_client.publish(f"supervision/noeuds/{nid}", payload)
            t += 1
            time.sleep(2)

    thread = threading.Thread(target=simulate, daemon=True)
    thread.start()
    return {"message": "Simulation démarrée — données toutes les 2 secondes"}
simulation_state = {"running": False, "mode": "city", "thread": None}


def build_payload(node_id: str, tension: float, courant: float, temperature: float = 32.0):
    charge = min(100.0, max(0.0, courant))
    statut = determine_statut(tension, charge)
    return {
        "id": node_id,
        "id_noeud": node_id,
        "tension": round(tension, 1),
        "courant": round(courant, 1),
        "puissance": round(tension * courant, 1),
        "charge": round(charge, 1),
        "temperature": round(temperature, 1),
        "statut": statut,
        "timestamp": datetime.now().isoformat(),
    }


def publish_simulated_payload(payload: dict):
    mqtt_client.publish(
        f"supervision/noeuds/{payload['id']}",
        json.dumps(payload, separators=(",", ":")),
    )


@app.post("/api/simulation/start")
def start_simulation(mode: str = "city"):
    """Start either the one-pole demo simulation or the city simulation."""
    mode = "demo" if mode.lower() in ("demo", "soutenance", "single") else "city"
    simulation_state["mode"] = mode

    thread = simulation_state.get("thread")
    if simulation_state["running"] and thread and thread.is_alive():
        return {"message": f"Simulation deja active en mode {mode}", "mode": mode}

    def simulate():
        simulation_state["running"] = True
        city_nodes = {
            "D1_P1": {"base_v": 215, "base_i": 35},
            "D1_P2": {"base_v": 210, "base_i": 42},
            "D2_P1": {"base_v": 175, "base_i": 78},
            "D2_P2": {"base_v": 162, "base_i": 84},
            "D3_P1": {"base_v": 90, "base_i": 95},
            "D3_P2": {"base_v": 0, "base_i": 0},
        }
        demo_sequence = [
            {"v": 220, "i": 42},
            {"v": 168, "i": 70},
            {"v": 132, "i": 95},
            {"v": 0, "i": 0},
        ]
        t = 0
        while True:
            current_mode = simulation_state["mode"]
            if current_mode == "demo":
                step = demo_sequence[(t // 6) % len(demo_sequence)]
                tension = max(0, step["v"] + (math.sin(t / 2) * 2 if step["v"] > 0 else 0))
                publish_simulated_payload(build_payload(DEMO_NODE_ID, tension, step["i"], 32.0))
            else:
                for node_id, cfg in city_nodes.items():
                    tension = max(0, cfg["base_v"] + math.sin(t / 10) * 8 + random.uniform(-3, 3))
                    courant = max(0, cfg["base_i"] + random.uniform(-4, 4)) if tension > 10 else 0
                    publish_simulated_payload(
                        build_payload(node_id, tension, courant, random.uniform(28, 45))
                    )
            t += 1
            time.sleep(2)

    simulation_state["thread"] = threading.Thread(target=simulate, daemon=True)
    simulation_state["thread"].start()
    return {"message": f"Simulation demarree en mode {mode}", "mode": mode}
