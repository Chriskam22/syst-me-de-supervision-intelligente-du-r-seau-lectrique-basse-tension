"""
Gateway - Supervision BT Lubumbashi

Lit les mesures JSON de l'Arduino UNO via Serial et les publie sur MQTT.
Si aucun Arduino n'est detecte, la gateway bascule en simulation ville.
"""

import json
import math
import os
import random
import sys
import threading
import time
from datetime import datetime

import paho.mqtt.client as mqtt

MQTT_BROKER = os.environ.get("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.environ.get("MQTT_PORT", "1883"))
SERIAL_PORT = os.environ.get("SERIAL_PORT")
SERIAL_BAUD = int(os.environ.get("SERIAL_BAUD", "9600"))
SIMULATE = os.environ.get("SIMULATE", "auto").lower()
DEMO_NODE_ID = os.environ.get("DEMO_NODE_ID", "NODE_LUB_001")

client = mqtt.Client(client_id="gateway_lubumbashi")
ser = None
ser_lock = threading.Lock()


def on_connect(c, userdata, flags, rc):
    if rc == 0:
        print("[GATEWAY] Connecte au broker MQTT")
        c.subscribe("supervision/commandes/#")
    else:
        print(f"[GATEWAY] Erreur connexion MQTT: {rc}")


def on_message(c, userdata, msg):
    """Relaye les commandes MQTT vers l'Arduino."""
    global ser
    payload = msg.payload.decode(errors="replace")
    print(f"[GATEWAY] Commande recue: {msg.topic} -> {payload}")

    with ser_lock:
        if not ser or not ser.is_open:
            print("[GATEWAY] Arduino absent, commande conservee cote logiciel uniquement")
            return
        try:
            data = json.loads(payload)
            data.setdefault("cmd", "DELESTAGE")
            line = json.dumps(data, separators=(",", ":")) + "\n"
        except json.JSONDecodeError:
            line = payload + "\n"
        ser.write(line.encode("utf-8"))


client.on_connect = on_connect
client.on_message = on_message


def connect_mqtt():
    for attempt in range(1, 11):
        try:
            client.connect(MQTT_BROKER, MQTT_PORT, 60)
            client.loop_start()
            return True
        except Exception as exc:
            print(f"[GATEWAY] Tentative MQTT {attempt}/10: {exc}")
            time.sleep(2)
    return False


def detect_serial_port():
    if SERIAL_PORT:
        return SERIAL_PORT

    try:
        from serial.tools import list_ports
    except Exception as exc:
        print(f"[GATEWAY] pyserial indisponible: {exc}")
        return None

    ports = list(list_ports.comports())
    if not ports:
        return None

    preferred = []
    for port in ports:
        label = f"{port.device} {port.description} {port.manufacturer}".lower()
        if any(key in label for key in ("arduino", "ch340", "usb serial", "usb-serial", "acm", "uno")):
            preferred.append(port.device)

    return (preferred or [ports[0].device])[0]


def init_serial():
    global ser

    if SIMULATE in ("true", "1", "yes", "on"):
        print("[GATEWAY] Simulation forcee par SIMULATE=true")
        return False

    port = detect_serial_port()
    if not port:
        print("[GATEWAY] Aucun port Arduino detecte")
        return False

    try:
        import serial

        ser = serial.Serial(port, SERIAL_BAUD, timeout=1)
        time.sleep(2)
        print(f"[GATEWAY] Port serie ouvert: {port} ({SERIAL_BAUD} bauds)")
        return True
    except Exception as exc:
        print(f"[GATEWAY] Impossible d'ouvrir le port {port}: {exc}")
        if SIMULATE in ("false", "0", "no", "off"):
            sys.exit(1)
        return False


def publish_measure(data):
    node_id = data.get("id") or data.get("id_noeud") or DEMO_NODE_ID
    data["id"] = node_id
    data["id_noeud"] = node_id
    data["timestamp"] = datetime.now().isoformat()
    topic = f"supervision/noeuds/{node_id}"
    client.publish(topic, json.dumps(data, separators=(",", ":")))
    print(
        f"[SERIAL->MQTT] {node_id}: "
        f"V={data.get('tension', 0):.1f}V I={data.get('courant', 0):.1f}A "
        f"{data.get('statut', '?')}"
    )


def read_serial_loop():
    """Lit les donnees JSON Arduino et les publie sur MQTT."""
    while True:
        try:
            with ser_lock:
                has_data = ser and ser.in_waiting
                line = ser.readline().decode("utf-8", errors="replace").strip() if has_data else ""

            if not line:
                time.sleep(0.05)
                continue

            if not line.startswith("{"):
                print(f"[SERIAL] Ignore: {line}")
                continue

            data = json.loads(line)
            if "ack" in data or "boot" in data:
                print(f"[ARDUINO] {data}")
                continue
            if "tension" not in data:
                print(f"[SERIAL] JSON sans mesure: {data}")
                continue

            publish_measure(data)
        except json.JSONDecodeError as exc:
            print(f"[SERIAL] JSON invalide: {exc}")
        except Exception as exc:
            print(f"[SERIAL] Erreur: {exc}")
            time.sleep(1)


def status_from_values(tension, charge):
    if tension < 10:
        return "PANNE"
    if tension < 150 and charge > 90:
        return "SURCHARGE_CRITIQUE"
    if tension < 180 or charge > 85:
        return "ALERTE"
    return "NORMAL"


def simulation_loop():
    """Simulation ville pour montrer l'extension avec plusieurs boitiers."""
    print("[GATEWAY] Mode simulation ville actif")

    nodes = {
        "D1_P1": {"base_v": 215, "base_i": 35, "depart": 1},
        "D1_P2": {"base_v": 210, "base_i": 42, "depart": 1},
        "D2_P1": {"base_v": 175, "base_i": 78, "depart": 2},
        "D2_P2": {"base_v": 162, "base_i": 84, "depart": 2},
        "D3_P1": {"base_v": 90, "base_i": 94, "depart": 3},
        "D3_P2": {"base_v": 0, "base_i": 0, "depart": 3},
    }

    tick = 0
    while True:
        for node_id, cfg in nodes.items():
            tension = max(0, cfg["base_v"] + math.sin(tick / 8) * 7 + random.uniform(-3, 3))
            courant = max(0, cfg["base_i"] + random.uniform(-4, 4)) if tension > 10 else 0
            charge = min(100, courant)
            statut = status_from_values(tension, charge)

            payload = {
                "id": node_id,
                "id_noeud": node_id,
                "tension": round(tension, 1),
                "courant": round(courant, 1),
                "puissance": round(tension * courant, 1),
                "charge": round(charge, 1),
                "temperature": round(random.uniform(28, 45), 1),
                "statut": statut,
                "depart": cfg["depart"],
                "timestamp": datetime.now().isoformat(),
            }
            client.publish(f"supervision/noeuds/{node_id}", json.dumps(payload, separators=(",", ":")))
            print(f"[SIM] {node_id}: {payload['tension']}V / {payload['courant']}A -> {statut}")

        tick += 1
        time.sleep(3)


if __name__ == "__main__":
    print("[GATEWAY] Supervision BT Lubumbashi")

    if not connect_mqtt():
        print("[GATEWAY] Impossible de connecter au broker MQTT")
        sys.exit(1)

    if init_serial():
        print("[GATEWAY] Mode reel: Arduino connecte")
        read_serial_loop()
    else:
        simulation_loop()
