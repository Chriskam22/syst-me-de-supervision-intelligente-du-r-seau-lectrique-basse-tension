#!/bin/bash
# ============================================================
# INSTALLATION AUTOMATIQUE — Supervision BT Lubumbashi
# Groupe 12 — Génie Logiciel — UDBL 2025/2026
# Usage : sudo bash install.sh
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   SUPERVISION RÉSEAU BT — LUBUMBASHI            ║"
echo "║   Installation automatique Ubuntu               ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Vérifier qu'on est bien sur Ubuntu
if ! command -v apt &> /dev/null; then
    err "Ce script nécessite Ubuntu/Debian"
fi

log "Mise à jour des paquets..."
apt update -qq

log "Installation des dépendances système..."
apt install -y python3 python3-pip python3-venv nodejs npm mosquitto mosquitto-clients curl git

log "Configuration de Mosquitto (broker MQTT)..."
cat > /etc/mosquitto/conf.d/supervision.conf << 'MQTT_CONF'
listener 1883
allow_anonymous true
MQTT_CONF
systemctl restart mosquitto
systemctl enable mosquitto
log "Mosquitto MQTT démarré sur port 1883"

log "Création de l'environnement Python..."
cd "$BASE_DIR/backend"
python3 -m venv venv
source venv/bin/activate
pip install -q fastapi uvicorn paho-mqtt influxdb-client python-jose passlib python-multipart aiofiles websockets pyserial

log "Installation des dépendances Node.js frontend..."
cd "$BASE_DIR/frontend"
npm install --silent

log "Installation de InfluxDB..."
if ! command -v influxd &> /dev/null; then
    warn "InfluxDB non trouvé — utilisation de SQLite comme fallback"
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   Installation terminée !                       ║"
echo "║                                                  ║"
echo "║   Pour démarrer :                               ║"
echo "║   bash start.sh                                 ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
