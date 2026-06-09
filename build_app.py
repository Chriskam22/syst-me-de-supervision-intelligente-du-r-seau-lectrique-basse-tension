import os

app_js = """import React, { useState, useEffect } from 'react';
import './App.css';
import { 
  Bell, Sliders, Map, Cpu, Activity, AlertTriangle, GitBranch, Users, FileText,
  Zap, Shuffle, MapPin, Download, ZapOff, Flame, CloudLightning, CheckCircle, Power, Navigation2, Database, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// ---------------------------------------------------------
// DATA STRUCTURES & HELPERS
// ---------------------------------------------------------

function mkFeeder(label, av, aa, bv, ba, cv, ca, na) {
  return { label, A: { v: av, a: aa }, B: { v: bv, a: ba }, C: { v: cv, a: ca }, N: { a: na } };
}

function feederStatus(fd) {
  const max = Math.max(fd.A.a, fd.B.a, fd.C.a);
  const min = Math.min(fd.A.a, fd.B.a, fd.C.a);
  if (max > 185 || fd.N.a > 60) return 'fault';
  if (max > 140 || (max - min) > 60 || fd.N.a > 35) return 'warn';
  return 'ok';
}

function syncLegacyPhases(t) {
  const fds = t.feeders;
  t.phases = {
    A: { v: Math.round(fds.reduce((s,f)=>s+f.A.v,0)/fds.length), a: fds.reduce((s,f)=>s+f.A.a,0) },
    B: { v: Math.round(fds.reduce((s,f)=>s+f.B.v,0)/fds.length), a: fds.reduce((s,f)=>s+f.B.a,0) },
    C: { v: Math.round(fds.reduce((s,f)=>s+f.C.v,0)/fds.length), a: fds.reduce((s,f)=>s+f.C.a,0) },
    N: { a: fds.reduce((s,f)=>s+f.N.a,0) }
  };
  const worst = t.feeders.map(feederStatus);
  if (worst.includes('fault')) t.status = 'err';
  else if (worst.includes('warn')) t.status = 'warn';
  else if (t.status !== 'off') t.status = 'ok';
  return t;
}

const initialTransformers = [
  syncLegacyPhases({ id: 'T01', name: 'T01 — Lubumbashi Centre', lat: -11.6612, lng: 27.4797, kva: 630, charge: 72, tension: 398, courant: 18.5, status: 'ok', details: 'Rond-point Sendwe, Av. Moero, Centre-Ville', connected: 1840,
    feeders: [ mkFeeder('D1', 231, 108, 229, 115, 230, 112, 7), mkFeeder('D2', 230, 98,  227, 103, 229, 100, 5), mkFeeder('D3', 232, 120, 228, 118, 231, 122, 4), mkFeeder('D4', 229, 90,  228,  95, 230,  92, 5) ]
  }),
  syncLegacyPhases({ id: 'T14', name: 'T14 — Kampemba', lat: -11.6438, lng: 27.5012, kva: 400, charge: 118, tension: 374, courant: 24.2, status: 'err', details: 'Av. Sendwe, Carrefour Industriel, Commune Kampemba', connected: 1240,
    feeders: [ mkFeeder('D1', 226, 115, 202, 198, 224, 112, 86), mkFeeder('D2', 225, 108, 205, 175, 223, 110, 67), mkFeeder('D3', 227, 102, 220, 132, 226, 105, 30), mkFeeder('D4', 228, 95,  224,  98, 227,  97,  3) ]
  }),
  syncLegacyPhases({ id: 'T08', name: 'T08 — Katuba', lat: -11.6780, lng: 27.4650, kva: 250, charge: 88, tension: 382, courant: 10.4, status: 'warn', details: 'Marché Central Katuba, Av. Lufira, Commune Katuba', connected: 980,
    feeders: [ mkFeeder('D1', 222, 82,  218, 95,  220, 88,  13), mkFeeder('D2', 221, 78,  217, 92,  219, 85,  14), mkFeeder('D3', 220, 148, 216, 88,  218, 82,  66), mkFeeder('D4', 223, 72,  219, 76,  221, 74,   4) ]
  })
];

const initialIncidents = [
  { id: 'INC-2026-004', node: 'T14 — Kampemba', type: 'Surcharge Critique', severity: 'critical', impact: '1,240 clients (risque incendie)', duration: '12 min', status: 'Actif', desc: 'Courant phase B à 195A dépassant la limite.', lat: -11.648, lng: 27.495 },
  { id: 'INC-2026-005', node: 'T08 — Katuba', type: 'Tension Basse', severity: 'major', impact: 'Qualité énergie dégradée', duration: '34 min', status: 'Actif', desc: 'Tension moyenne sous limite.', lat: -11.672, lng: 27.468 }
];

const initialSubscribers = [
  { id: 'CNT-99102-LUB', name: 'Clinique Universitaire de Lubumbashi', category: 'Commercial (Tarif B2)', node: 'T01', load: '14.8 kW', credit: '185,000 CDF', state: 'active' },
  { id: 'CNT-44829-KAM', name: 'Boulangerie Moderne Kampemba', category: 'Commercial (Tarif B2)', node: 'T14', load: '18.2 kW', credit: '12,500 CDF', state: 'active' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [transformers, setTransformers] = useState(initialTransformers);
  const [incidents, setIncidents] = useState(initialIncidents);
  const [subscribers, setSubscribers] = useState(initialSubscribers);
  const [sheddingModal, setSheddingModal] = useState({ open: false, node: null, pass: '', error: false });
  const [telemetryTarget, setTelemetryTarget] = useState('T01');

  // Chart data state
  const [chartData, setChartData] = useState({
    labels: Array.from({length: 25}, (_, i) => new Date(Date.now() - (24-i)*3000).toLocaleTimeString('fr-CD')),
    volts: Array.from({length: 25}, () => 390 + Math.floor(Math.random() * 14)),
    amps: Array.from({length: 25}, () => 15 + Math.floor(Math.random() * 8))
  });

  useEffect(() => {
    const fetchLive = async () => {
      try {
        const res = await axios.get('/api/statut_reseau');
        const nodes = res.data;
        setTransformers(prev => {
          let clone = [...prev];
          let t = clone.find(tr => tr.id === 'T01');
          if (t) {
             let sumI = 0, minU = 400;
             nodes.forEach(n => {
                 sumI += n.courant;
                 if(n.tension < minU) minU = n.tension;
             });
             t.tension = minU;
             t.courant = sumI;
             if(minU < 150) t.status = 'err';
             else if(minU < 180) t.status = 'warn';
             else t.status = 'ok';
          }
          return clone;
        });

        // Add telemetry point
        setChartData(prev => {
          const newLabels = [...prev.labels, new Date().toLocaleTimeString('fr-CD')];
          const newVolts = [...prev.volts, 390 + Math.floor(Math.random() * 14)];
          const newAmps = [...prev.amps, 15 + Math.floor(Math.random() * 8)];
          if (newLabels.length > 25) { newLabels.shift(); newVolts.shift(); newAmps.shift(); }
          return { labels: newLabels, volts: newVolts, amps: newAmps };
        });

        const resAnom = await axios.get('/api/anomalies?limite=10');
        setIncidents(resAnom.data.map(a => ({
            id: `INC-${a.id_anomalie}`, node: `Poteau ${a.id_noeud}`, type: a.type_anomalie,
            severity: a.niveau === 'Critique' ? 'critical' : 'major', impact: a.description,
            duration: a.date_detection.split(' ')[1] || '0 min', status: a.statut, desc: a.description,
            lat: -11.6650, lng: 27.4790
        })));
      } catch(e) {
        console.error("API Error", e);
      }
    };
    
    fetchLive();
    const timer = setInterval(fetchLive, 3000);
    return () => clearInterval(timer);
  }, []);

  const openShedding = (id) => setSheddingModal({ open: true, node: transformers.find(t=>t.id===id), pass: '', error: false });
  const closeShedding = () => setSheddingModal({ ...sheddingModal, open: false, error: false });
  const submitShedding = async () => {
    if (sheddingModal.pass === '1234') {
      try {
        const action = sheddingModal.node.status === 'off' ? 'fermer' : 'ouvrir';
        await axios.post('/api/delestage', { id_poteau: 1, action, type: action==='ouvrir'?'Ouverture':'Fermeture' }, {
          headers: { 'X-API-KEY': 'SUPERVOLT_SECRET_KEY_2026' }
        });
        
        setTransformers(prev => prev.map(t => {
          if (t.id === sheddingModal.node.id) {
            if (t.status === 'off') {
              t.status = 'ok'; t.charge = 70; t.tension = 398;
            } else {
              t.status = 'off'; t.charge = 0; t.tension = 0;
            }
          }
          return t;
        }));
        closeShedding();
      } catch (e) {
        console.error("Erreur delestage", e);
      }
    } else {
      setSheddingModal(prev => ({...prev, error: true}));
    }
  };

  const totalLoad = transformers.reduce((sum, t) => sum + (t.status!=='off' ? (t.kva * t.charge * 0.0075) / 1000 : 0), 0);

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100vh', background:'var(--bg-main)', color:'var(--text-main)'}}>
      <header>
        <div className="brand-section">
          <div className="brand-text" style={{marginLeft:10}}>
            <span className="brand-name">SuperVolt</span>
            <span className="brand-sub">SCADA · LUBUMBASHI BT</span>
          </div>
        </div>
        <div className="header-center">
          <span className="scada-clock">SAM. 29 MAI · 12:00:00</span>
          <div className="scada-subinfo">SNEL · Zone Opérationnelle Est Haut-Katanga</div>
        </div>
        <div className="header-right">
          <div className="live-indicator"><div className="live-pulse"></div> SYSTEM LIVE</div>
          <button className="btn-circle" title="Alertes Actives" onClick={() => setActiveTab('incidents')}>
            <Bell size={15} />
            <span className="badge-alert">{incidents.length}</span>
          </button>
          <div className="user-profile">
            <div className="user-avatar">OP</div>
            <span className="user-name">Opérateur 12</span>
          </div>
        </div>
      </header>

      <div className="workspace-layout">
        <nav className="floating-panel sidebar-left">
          <div className="sidebar-label">Réseau Local</div>
          <div className="sidebar-menu">
            <div className={`menu-item ${activeTab==='map'?'active':''}`} onClick={() => setActiveTab('map')}><Map size={16}/> Carte interactive</div>
            <div className={`menu-item ${activeTab==='assets'?'active':''}`} onClick={() => setActiveTab('assets')}><Cpu size={16}/> Transformateurs</div>
            <div className={`menu-item ${activeTab==='telemetry'?'active':''}`} onClick={() => setActiveTab('telemetry')}><Activity size={16}/> Télémesures</div>
            <div className={`menu-item ${activeTab==='incidents'?'active':''}`} onClick={() => setActiveTab('incidents')}><AlertTriangle size={16}/> Registre d'alarmes</div>
          </div>
          <hr className="sidebar-divider" />
          <div className="sidebar-label">Algorithmes & Flux</div>
          <div className="sidebar-menu">
            <div className={`menu-item ${activeTab==='phases'?'active':''}`} onClick={() => setActiveTab('phases')}><GitBranch size={16}/> Équilibrage phases</div>
            <div className={`menu-item ${activeTab==='subscribers'?'active':''}`} onClick={() => setActiveTab('subscribers')}><Users size={16}/> Abonnés BT</div>
          </div>
          <div className="sidebar-status-block">
            <div className="status-container">
              <div className="status-row"><span className="lbl">Passerelle RPi</span><span className="val"><span className="dot active"></span>En ligne</span></div>
            </div>
          </div>
        </nav>

        <div className="center-workspace">
          <div className="kpi-row">
            <div className="kpi-tile">
              <div className="kpi-head"><span className="kpi-title">Charge Globale</span><Zap size={14} color="var(--color-primary)"/></div>
              <div className="kpi-body"><span className="kpi-num">{totalLoad.toFixed(2)}</span><span className="kpi-unit">MW</span></div>
              <div className="kpi-foot up">▲ Stable</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-head"><span className="kpi-title">Tension Moyenne</span><Activity size={14} color="var(--color-success)"/></div>
              <div className="kpi-body"><span className="kpi-num">{transformers[0].tension}</span><span className="kpi-unit">V</span></div>
              <div className="kpi-foot neutral">✓ Nominal ±2%</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-head"><span className="kpi-title">Alarmes Actives</span><AlertTriangle size={14} color="var(--color-danger)"/></div>
              <div className="kpi-body"><span className="kpi-num" style={{color:'var(--color-danger)'}}>{incidents.length}</span><span className="kpi-unit">défauts</span></div>
            </div>
          </div>

          <div className={`panel-view floating-panel ${activeTab==='map'?'active':''}`} style={{position:'relative', background:'#090c15'}}>
            <div style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)', textAlign:'center', color:'var(--text-muted)'}}>
              <Map size={48} style={{margin:'0 auto', marginBottom:12, opacity:0.5}} />
              <div style={{fontFamily:'var(--font-mono)'}}>CARTE LEAFLET DÉSACTIVÉE (Mode Sans Carte)</div>
            </div>
            <div className="map-legend-box">
              <div className="legend-lbl">Réseau basse tension</div>
              <div className="legend-row"><div className="legend-dot" style={{background:'var(--color-success)'}}></div><span>Poste nominal</span></div>
              <div className="legend-row"><div className="legend-dot" style={{background:'var(--color-danger)'}}></div><span>Poste surchargé</span></div>
            </div>
          </div>

          <div className={`panel-view floating-panel ${activeTab==='assets'?'active':''}`}>
            <div className="panel-header">
              <div className="panel-title"><h2>Postes Transformateurs</h2><p>Données d'enroulements et indicateurs d'exploitation par cabine.</p></div>
            </div>
            <div className="panel-body-scroll">
              <div className="assets-grid">
                {transformers.map(t => (
                  <div className="t-card" key={t.id}>
                    <div className="t-head">
                      <div className="t-title-wrap"><span className="t-name">{t.name}</span><span className="t-location"><MapPin size={10}/> {t.details}</span></div>
                      <span className={`status-pill ${t.status}`}>{t.status==='off'?'Délesté':t.status==='err'?'Surcharge':'Normal'}</span>
                    </div>
                    <div className="t-gauge-wrap">
                      <div className="t-gauge-details"><span className="lbl">Taux de charge</span><span className="val">{t.charge}%</span></div>
                    </div>
                    <div className="t-stats-grid">
                      <div className="t-stat-card"><span className="lbl">Puissance active</span><span className="val">{(t.kva*t.charge*0.0075).toFixed(1)} kW</span></div>
                      <div className="t-stat-card"><span className="lbl">Tension phase</span><span className="val">{t.tension} V</span></div>
                    </div>
                    <div className="t-actions-row">
                      <button className="btn-action" onClick={()=>setActiveTab('phases')}><Sliders size={12}/> Départs</button>
                      <button className={`btn-action ${t.status==='off'?'btn-success-outline':'btn-danger-outline'}`} onClick={()=>openShedding(t.id)}>
                        <Power size={12}/> {t.status==='off'?'Enclencher':'Délester'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`panel-view floating-panel ${activeTab==='telemetry'?'active':''}`}>
            <div className="panel-header"><div className="panel-title"><h2>Télémesures Analytiques</h2><p>Courbes oscillographiques en temps réel.</p></div></div>
            <div className="telemetry-split">
              <div className="telemetry-aside">
                 <div className="aside-block">
                    <label>Cabine Cible</label>
                    <select className="custom-select" value={telemetryTarget} onChange={e=>setTelemetryTarget(e.target.value)}>
                      {transformers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                 </div>
              </div>
              <div className="chart-panel-card">
                 <div className="chart-wrapper">
                    <Line data={{
                      labels: chartData.labels,
                      datasets: [{ label: 'Tension (V)', data: chartData.volts, borderColor: '#3b82f6', tension: 0.2 },
                                 { label: 'Courant (A)', data: chartData.amps, borderColor: '#ef4444', tension: 0.2 }]
                    }} options={{ maintainAspectRatio: false }} />
                 </div>
              </div>
            </div>
          </div>

          <div className={`panel-view floating-panel ${activeTab==='incidents'?'active':''}`}>
            <div className="panel-header"><div className="panel-title"><h2>Registre des Alarmes actives</h2></div></div>
            <div className="scada-table-wrap">
              <table className="scada-table">
                <thead><tr><th>Code</th><th>Poste</th><th>Anomalie</th><th>Sévérité</th><th>Durée</th></tr></thead>
                <tbody>
                  {incidents.map(inc => (
                    <tr key={inc.id}>
                      <td style={{color:'var(--color-primary)'}}>{inc.id}</td><td>{inc.node}</td><td>{inc.type}</td>
                      <td><span className={`sev-tag ${inc.severity}`}>{inc.severity}</span></td><td>{inc.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className={`panel-view floating-panel ${activeTab==='phases'?'active':''}`}>
             <div className="panel-header"><div className="panel-title"><h2>Supervision des Départs BT</h2></div></div>
             <div style={{padding: 20}}>Sélectionnez un poste pour afficher les vecteurs de Fresnel...</div>
          </div>
          <div className={`panel-view floating-panel ${activeTab==='subscribers'?'active':''}`}>
             <div className="panel-header"><div className="panel-title"><h2>Registre des Abonnés</h2></div></div>
             <div className="scada-table-wrap">
               <table className="scada-table">
                 <thead><tr><th>Compteur</th><th>Nom</th><th>Catégorie</th><th>Source</th></tr></thead>
                 <tbody>
                   {subscribers.map(sub => (
                     <tr key={sub.id}><td>{sub.id}</td><td>{sub.name}</td><td>{sub.category}</td><td>{sub.node}</td></tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>

        </div>

        <div className="floating-panel sidebar-right">
          <div className="sidebar-right-header"><span>Alertes actives</span><span className="menu-badge danger">{incidents.length}</span></div>
          <div className="alerts-container">
            {incidents.map(inc => (
              <div className="alert-item-card" key={inc.id}>
                <div className="alert-indicator-bar" style={{background: 'var(--color-danger)'}}></div>
                <div className="alert-item-body"><span className="alert-item-title">{inc.type}</span><span className="alert-item-sub">{inc.node}</span></div>
              </div>
            ))}
          </div>
          <div className="sidebar-right-header" style={{borderTop:'1px solid var(--border)'}}><span>Postes surveillés</span></div>
          <div className="right-assets-scroller">
            {transformers.map(t => (
              <div className="right-mini-asset" key={t.id}>
                <div className="mini-asset-head-row"><span>{t.id}</span><span style={{color:t.status==='err'?'var(--color-danger)':'var(--color-success)'}}>{t.charge}%</span></div>
                <div className="mini-asset-bar-wrap"><div className="mini-asset-fill-bar" style={{width:t.charge+'%', background:t.status==='err'?'var(--color-danger)':'var(--color-success)'}}></div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer>
        <span><Database size={12}/> BDD : <span className="val-green">OK</span></span>
        <span><RefreshCw size={12}/> Actualisation : <span className="val-primary">3s</span></span>
        <span className="align-right">SCADA v2.0</span>
      </footer>

      {sheddingModal.open && (
        <div className="modal-backdrop active">
          <div className="modal-panel">
            <div className="modal-head"><AlertTriangle size={18}/> <span>{sheddingModal.node?.status==='off'?'Réenclenchement':'Délestage'}</span></div>
            <div className="modal-body">
              <div className="modal-meta-box">POSTE: {sheddingModal.node?.name}</div>
              <div className="modal-input-group">
                <label>Code autorisation</label>
                <input type="password" value={sheddingModal.pass} onChange={e=>setSheddingModal({...sheddingModal, pass: e.target.value})} className="passcode-field" placeholder="1234"/>
                {sheddingModal.error && <div className="passcode-err" style={{display:'block'}}>CODE INVALIDE.</div>}
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn-action" onClick={closeShedding}>Annuler</button>
              <button className={`btn-action ${sheddingModal.node?.status==='off'?'btn-success-outline':'btn-danger-outline'}`} onClick={submitShedding}>Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
