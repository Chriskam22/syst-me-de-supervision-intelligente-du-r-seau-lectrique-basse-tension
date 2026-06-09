# Supervision BT Lubumbashi

Groupe 12 - Génie Logiciel - UDBL 2025/2026

Système de supervision intelligente du réseau électrique basse tension de Lubumbashi.

Le projet présente deux modes complémentaires :

- **Demo soutenance** : démonstration réelle avec Arduino UNO, potentiomètre, relais et le nœud matériel `NODE_LUB_001`.
- **Vision ville** : projection simulée multi-cabines, multi-départs BT et multi-poteaux pour montrer l'évolution possible du système.

Le système est centré sur la supervision du réseau basse tension : cabines, départs BT, poteaux stratégiques, mesures, anomalies, délestage et rétablissement. Il ne surveille pas les maisons individuellement.

## Architecture

```text
[Arduino UNO]          [Gateway PC]              [Backend API]
Potentiomètre A0  ->   Serial JSON   ->  MQTT -> FastAPI -> SQLite
Relais D2         <-   Commandes MQTT <- REST/API
                                                    |
                                                    v
                                             [Frontend React]
                                             Carte + SCADA
```

Chaîne technique :

1. L'Arduino mesure une tension simulée par potentiomètre.
2. La gateway lit le JSON série et publie sur MQTT.
3. Le backend FastAPI reçoit les mesures MQTT.
4. Les mesures et anomalies sont stockées en SQLite.
5. Le frontend reçoit les mises à jour par WebSocket.
6. L'opérateur visualise, analyse et envoie les commandes de délestage/rétablissement.

## Mode Demo Soutenance

Le mode Demo soutenance correspond à la maquette matérielle réelle.

Nœud réel utilisé : `NODE_LUB_001`.

| Arduino UNO | Composant | Rôle |
| --- | --- | --- |
| A0 | Potentiomètre 10K | Simule la tension 0-250 V |
| D2 | Relais 5 V | Délestage / rétablissement |
| USB | Câble vers PC | Communication Serial JSON à 9600 bauds |

Ce mode permet de démontrer :

| Action | Résultat attendu |
| --- | --- |
| Tourner le potentiomètre | Variation de la tension affichée |
| Tension normale | État normal sur la carte |
| Tension basse | Alerte / anomalie de tension |
| Cliquer Délester | Ouverture du relais |
| Cliquer Rétablir | Fermeture du relais |
| Consulter le journal SCADA | Événements opérateur et anomalies |

Sans Arduino, il faut rester en mode **Demo soutenance** puis cliquer sur le bouton **Simulation** du dashboard. L'API simule alors uniquement `NODE_LUB_001`.

## Mode Vision Ville

Le mode Vision ville est une projection simulée du système à l'échelle d'un réseau basse tension.

Il affiche :

- plusieurs cabines,
- plusieurs départs BT par cabine,
- des poteaux stratégiques,
- une chute de tension par départ,
- des courants L1/L2/L3 simulés,
- un déséquilibre de phase,
- un journal d'événements SCADA,
- une carte géographique.

Les données Vision ville sont simulées côté application pour la soutenance. Elles ne représentent pas encore un réseau industriel raccordé en production.

## Localisation

Les coordonnées des cabines et poteaux sont considérées comme saisies lors de l'installation du boîtier ou préparées dans la base du réseau.

Le prototype ne suppose pas un GPS permanent embarqué sur chaque poteau.

## Démarrage Rapide

```bash
# 1. Installer les dépendances sur Ubuntu/Debian
sudo bash install.sh

# 2. Lancer backend + gateway + frontend
bash start.sh

# 3. Ouvrir le dashboard
# http://localhost:3000

# 4. Voir la documentation API
# http://localhost:8000/docs
```

## Utilisation Avec Arduino

1. Flasher `arduino/noeud_mesure.ino` sur l'Arduino UNO.
2. Brancher l'Arduino au PC par USB.
3. Lancer le broker MQTT, le backend, la gateway et le frontend.
4. Ouvrir `http://localhost:3000`.
5. Cliquer sur **Demo soutenance**.
6. Vérifier que le dashboard indique `Arduino connecté`.

La gateway détecte automatiquement le port série. Si besoin, forcer le port :

```bash
SERIAL_PORT=/dev/ttyACM0 SIMULATE=false bash start.sh
```

Sous Windows avec PowerShell :

```powershell
$env:SERIAL_PORT="COM3"
$env:SIMULATE="false"
python gateway/gateway.py
```

## Utilisation Sans Arduino

1. Lancer le backend et le frontend.
2. Ouvrir le dashboard.
3. Rester en **Demo soutenance**.
4. Cliquer sur **Simulation**.

Endpoint équivalent :

```bash
curl -X POST "http://localhost:8000/api/simulation/start?mode=demo"
```

Pour la projection ville :

```bash
curl -X POST "http://localhost:8000/api/simulation/start?mode=city"
```

## API Principales

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/api/noeuds` | Liste des nœuds avec dernière mesure |
| GET | `/api/noeuds/{id}` | Détail d'un nœud |
| GET | `/api/mesures/historique/{id}` | Historique des mesures |
| GET | `/api/anomalies` | Liste des anomalies |
| POST | `/api/commandes/delestage` | Ouvrir ou fermer le relais |
| POST | `/api/delestage` | Route de secours avec clé API |
| POST | `/api/mesures` | Injecter une mesure de test |
| GET | `/api/stats/resume` | Résumé global |
| POST | `/api/simulation/start?mode=demo` | Simulation mono-poteau |
| POST | `/api/simulation/start?mode=city` | Simulation multi-poteaux |
| WS | `/ws` | Mesures temps réel |

## Structure

```text
.
├── arduino/noeud_mesure.ino   # Firmware Arduino UNO mono-poteau
├── gateway/gateway.py         # Serial Arduino -> MQTT, simulation fallback
├── backend/main.py            # FastAPI + MQTT + SQLite + WebSocket
├── frontend/src/App.js        # Dashboard React avec modes demo/ville
├── frontend/src/App.css       # Styles SCADA
├── install.sh                 # Installation Ubuntu/Debian
├── start.sh                   # Lancement des services
└── test.sh                    # Vérification rapide
```

## Limites Du Prototype

- Pas de compteur intelligent par maison.
- Pas de surveillance individuelle des maisons.
- Pas d'analyse détaillée des appareils domestiques.
- Pas de GPS embarqué permanent sur chaque poteau.
- Les données du mode Vision ville sont simulées.
- Le délestage est un prototype par relais sur maquette.
- Les commandes restent des actions opérateur de démonstration.
- L'architecture est extensible vers une version industrielle avec modèles de cabines, départs BT, événements SCADA et équipements terrain persistés en base.

## Scénario De Démonstration

1. Lancer le backend.
2. Lancer la gateway.
3. Lancer le frontend.
4. Ouvrir le dashboard.
5. Cliquer sur **Demo soutenance**.
6. Tourner le potentiomètre.
7. Observer la tension et l'état du poteau.
8. Provoquer une chute de tension avec le potentiomètre.
9. Observer l'anomalie et le journal SCADA.
10. Cliquer sur **Délester**.
11. Observer l'ouverture du relais et l'événement SCADA.
12. Cliquer sur **Rétablir**.
13. Observer la fermeture du relais et le nouvel événement SCADA.
14. Cliquer sur **Vision ville**.
15. Expliquer la projection réseau : cabines, départs BT, poteaux, chute de tension, déséquilibre de phase et événements SCADA.

## Positionnement

SuperVolt est un prototype pédagogique de supervision BT. Il montre une architecture crédible et extensible, mais il ne prétend pas remplacer un système industriel certifié.
