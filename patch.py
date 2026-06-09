import re

file_path = '/home/dave/syst-me-de-supervision-intelligente-du-r-seau-lectrique-basse-tension/dashboard_snel/index.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

api_base_url_code = """
    // API Integration
    const API_BASE_URL = 'http://127.0.0.1:8000';
    
    async function envoyerOrdreDelestage(idPoteau, action) {
      try {
        const typeAction = action === 'ouvrir' ? 'Ouverture' : 'Fermeture';
        const response = await fetch(`${API_BASE_URL}/api/delestage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': 'SUPERVOLT_SECRET_KEY_2026'
          },
          body: JSON.stringify({ id_poteau: parseInt(idPoteau), action: action, type: typeAction })
        });
        if (response.ok) {
            logAudit(`Ordre '${action}' transmis avec succès au poteau ${idPoteau}`);
        } else {
            logAudit(`Erreur API: Ordre non autorisé`);
        }
      } catch (e) {
        logAudit('Erreur réseau. Le serveur SCADA est-il joignable ?');
      }
    }

    async function fetchLiveSCADA() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/statut_reseau`);
        const nodes = await res.json();
        
        let t = transformers.find(tr => tr.id === 'T01');
        if (t) {
           let sumI = 0;
           let minU = 400;
           nodes.forEach(n => {
               sumI += n.courant;
               if(n.tension < minU) minU = n.tension;
           });
           t.tension = minU;
           t.courant = sumI;
           if(minU < 150) t.status = 'err';
           else if(minU < 180) t.status = 'warn';
           else t.status = 'ok';
           
           nodes.forEach(n => {
             // Overwrite sub-nodes to subscribers for demo mapping
             let sub = subscribers.find(s => s.id === `CNT-NODE-${n.id_poteau}`);
             if(!sub) {
                 subscribers.push({
                     id: `CNT-NODE-${n.id_poteau}`,
                     name: `Poteau ${n.id_poteau} - ${n.adresse}`,
                     category: 'Domestique',
                     node: 'T01',
                     load: `${(n.courant * 220 / 1000).toFixed(1)} kW`,
                     credit: n.statut,
                     state: n.etat_relais === 'Ouvert' ? 'suspended' : 'active'
                 });
             } else {
                 sub.load = `${(n.courant * 220 / 1000).toFixed(1)} kW`;
                 sub.credit = n.statut;
                 sub.state = n.etat_relais === 'Ouvert' ? 'suspended' : 'active';
             }
           });
        }
        
        const resAnom = await fetch(`${API_BASE_URL}/api/anomalies?limite=10`);
        const anoms = await resAnom.json();
        incidents = anoms.map(a => ({
            id: `INC-${a.id_anomalie}`,
            node: `Poteau ${a.id_noeud}`,
            type: a.type_anomalie,
            severity: a.niveau === 'Critique' ? 'critical' : 'major',
            impact: a.description,
            duration: a.date_detection.split(' ')[1] || '0 min',
            status: a.statut,
            desc: a.description,
            lat: -11.6650, lng: 27.4790
        }));
        
        let sum = 0;
        transformers.forEach(t => {
          if (t.status !== 'off') sum += (t.kva * t.charge * 0.0075) / 1000;
        });
        globalLoadHistory.push(sum);
        if (globalLoadHistory.length > 10) globalLoadHistory.shift();
        drawGlobalSparkline();
        
        syncSCADAState();
      } catch(e) {
        console.error("API Error", e);
      }
    }

    function startSimulation() {
      simulationTimer = setInterval(fetchLiveSCADA, 3000);
      fetchLiveSCADA();
    }
"""

content = re.sub(r'function startSimulation\(\) \{.*?(?=\n    function drawGlobalSparkline\(\))', api_base_url_code, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
