# Supervision BT Lubumbashi

Prototype de supervision intelligente du reseau electrique basse tension de Lubumbashi, combinant une maquette Arduino, une gateway MQTT, une API FastAPI et un dashboard React.

## Probleme

La surveillance basse tension manque souvent de visibilite en temps reel : tension instable, incidents locaux, delestage manuel et absence de journal d'evenements centralise. Ce projet propose une maquette pedagogique pour visualiser l'etat d'un noeud basse tension, detecter des anomalies et simuler une extension vers plusieurs cabines et depart BT.

## Fonctionnalites

- Lecture d'une tension simulee par potentiometre sur Arduino UNO.
- Commande d'un relais pour representer le delestage et le retablissement.
- Gateway serie vers MQTT.
- API FastAPI avec stockage SQLite.
- Dashboard React avec carte, indicateurs, journal SCADA et graphiques.
- WebSocket pour les mesures en temps reel.
- Mode demo soutenance avec le noeud materiel `NODE_LUB_001`.
- Mode vision ville avec projection multi-cabines, multi-departs et multi-poteaux.
- Simulation utilisable sans Arduino.

## Technologies

- Arduino UNO
- Python
- FastAPI
- SQLite
- MQTT / paho-mqtt
- WebSocket
- React
- Chart.js
- Leaflet
- Bash scripts

## Architecture

```text
[Arduino UNO]
  Potentiometre A0
  Relais D2
      |
      v
[Gateway Python]
  Serial JSON -> MQTT
      |
      v
[Backend FastAPI]
  API REST + WebSocket + SQLite
      |
      v
[Frontend React]
  Carte + mesures + journal SCADA
```

Structure du depot :

```text
arduino/        # Firmware de la maquette
gateway/        # Lecture serie, publication MQTT, simulation
backend/        # API FastAPI, stockage et WebSocket
frontend/       # Dashboard React
presentation/   # Supports de soutenance
install.sh      # Installation Ubuntu/Debian
start.sh        # Lancement des services
test.sh         # Verification rapide
```

## Installation

Sous Ubuntu/Debian :

```bash
sudo bash install.sh
bash start.sh
```

Adresses utiles :

```text
Dashboard : http://localhost:3000
API docs  : http://localhost:8000/docs
```

Installation manuelle :

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

```bash
cd frontend
npm install
npm start
```

## Utilisation avec Arduino

1. Flasher `arduino/noeud_mesure.ino` sur l'Arduino UNO.
2. Brancher l'Arduino au PC par USB.
3. Lancer les services.
4. Ouvrir le dashboard.
5. Selectionner le mode demo soutenance.
6. Tourner le potentiometre pour faire varier la tension.
7. Tester les commandes de delestage et retablissement.

Forcer un port serie :

```bash
SERIAL_PORT=/dev/ttyACM0 SIMULATE=false bash start.sh
```

Sous Windows :

```powershell
$env:SERIAL_PORT="COM3"
$env:SIMULATE="false"
python gateway/gateway.py
```

## Utilisation sans Arduino

Le prototype peut aussi fonctionner en simulation :

```bash
curl -X POST "http://localhost:8000/api/simulation/start?mode=demo"
curl -X POST "http://localhost:8000/api/simulation/start?mode=city"
```

## API principales

| Methode | Route | Description |
| --- | --- | --- |
| GET | `/api/noeuds` | Liste des noeuds avec derniere mesure |
| GET | `/api/noeuds/{id}` | Detail d'un noeud |
| GET | `/api/mesures/historique/{id}` | Historique des mesures |
| GET | `/api/anomalies` | Liste des anomalies |
| POST | `/api/commandes/delestage` | Commande relais |
| POST | `/api/mesures` | Injection d'une mesure de test |
| GET | `/api/stats/resume` | Resume global |
| WS | `/ws` | Flux temps reel |

## Captures d'ecran prevues

- Dashboard global avec carte et etat des noeuds.
- Vue SCADA avec journal d'evenements.
- Graphique d'historique de tension.
- Mode demo soutenance avec `NODE_LUB_001`.
- Mode vision ville multi-cabines.
- Photo de la maquette Arduino, potentiometre et relais.

## Limites du prototype

- Le mode vision ville repose sur des donnees simulees.
- Le projet ne surveille pas individuellement les maisons.
- Le delestage est represente par une maquette a relais.
- Le systeme est pedagogique et n'est pas une solution industrielle certifiee.

## Statut

Projet de Genie Logiciel UDBL 2025/2026. Il demontre une chaine complete IoT vers dashboard : capteur, gateway, message broker, API, stockage, temps reel et interface de supervision.
