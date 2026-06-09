#!/bin/bash
# ============================================================
# DÉMARRAGE — Supervision BT Lubumbashi
# Lance tous les services en parallèle
# ============================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[→]${NC} $1"; }

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   SUPERVISION BT LUBUMBASHI — DÉMARRAGE        ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# 1. Mosquitto
if systemctl is-active --quiet mosquitto; then
    log "Mosquitto déjà actif"
else
    systemctl start mosquitto
    log "Mosquitto démarré"
fi

# 2. Backend FastAPI
warn "Démarrage du backend API (port 8000)..."
cd "$BASE_DIR/backend"
if [ -f "$BASE_DIR/backend/venv/bin/activate" ]; then
    source "$BASE_DIR/backend/venv/bin/activate"
else
    echo "[✗] Environnement Python introuvable dans backend/venv. Exécutez sudo bash install.sh puis relancez start.sh."
    exit 1
fi
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
log "Backend PID: $BACKEND_PID"

# 3. Gateway simulateur (ou port série réel)
warn "Démarrage de la gateway MQTT..."
cd "$BASE_DIR/gateway"
source "$BASE_DIR/backend/venv/bin/activate"
python3 gateway.py &
GATEWAY_PID=$!
log "Gateway PID: $GATEWAY_PID"

# 4. Frontend
warn "Démarrage du frontend (port 3000)..."
cd "$BASE_DIR/frontend"
if [ -d "$BASE_DIR/frontend/node_modules" ]; then
    npm start &
else
    echo "[✗] Dépendances frontend manquantes. Exécutez cd frontend && npm install puis relancez start.sh."
    exit 1
fi
FRONTEND_PID=$!
log "Frontend PID: $FRONTEND_PID"

sleep 3

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   Tous les services sont démarrés !             ║"
echo "║                                                  ║"
echo "║   Dashboard  → http://localhost:3000            ║"
echo "║   API docs   → http://localhost:8000/docs       ║"
echo "║   MQTT       → localhost:1883                   ║"
echo "║                                                  ║"
echo "║   Ctrl+C pour tout arrêter                     ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Attendre et nettoyer à Ctrl+C
trap "kill $BACKEND_PID $GATEWAY_PID $FRONTEND_PID 2>/dev/null; echo 'Arrêt des services...'; exit 0" INT
wait
