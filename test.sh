#!/bin/bash
# ============================================================
# TEST RAPIDE — Vérifie que tous les services fonctionnent
# ============================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

ok()  { echo -e "${GREEN}[✓]${NC} $1"; }
err() { echo -e "${RED}[✗]${NC} $1"; }

echo ""
echo "=== TEST SYSTÈME — Supervision BT Lubumbashi ==="
echo ""

# Mosquitto
if systemctl is-active --quiet mosquitto; then
    ok "Mosquitto MQTT actif"
else
    err "Mosquitto non actif — lancer : sudo systemctl start mosquitto"
fi

# Backend API
if curl -s http://localhost:8000/ > /dev/null 2>&1; then
    ok "Backend API actif (port 8000)"
else
    err "Backend API non actif"
fi

# Frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    ok "Frontend React actif (port 3000)"
else
    err "Frontend non actif"
fi

# Test API noeuds
NOEUDS=$(curl -s http://localhost:8000/api/noeuds 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null)
if [ ! -z "$NOEUDS" ]; then
    ok "API noeuds : $NOEUDS nœuds en base"
else
    err "API noeuds non accessible"
fi

# Test simulation
SIM=$(curl -s -X POST http://localhost:8000/api/simulation/start 2>/dev/null)
if echo "$SIM" | grep -q "Simulation"; then
    ok "Simulation démarrée"
fi

echo ""
echo "Dashboard → http://localhost:3000"
echo "API docs  → http://localhost:8000/docs"
echo ""
