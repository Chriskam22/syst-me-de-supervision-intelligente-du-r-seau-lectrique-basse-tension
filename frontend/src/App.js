import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import {
  Activity,
  AlertTriangle,
  Bell,
  Cpu,
  Database,
  GitBranch,
  Map,
  MapPin,
  Power,
  RefreshCw,
  Sliders,
  Users,
  Zap
} from 'lucide-react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const DEMO_NODE_ID = 'NODE_LUB_001';
const API_KEY = 'SUPERVOLT_SECRET_KEY_2026';

const demoNetwork = {
  cabines: [
    {
      id: 'CAB_DEMO',
      nom: 'Cabine Kampemba 1',
      adresse: 'Maquette Arduino USB',
      lat: -11.6630,
      lng: 27.4790,
      kva: 400,
      sourceVoltage: 230,
      chargeActuelleKva: 168,
      phases: { L1: 58, L2: 56, L3: 54 },
      departs: [{ id: 'D1', nom: 'Départ BT démo', couleur: '#3b82f6', sourceVoltage: 230, phases: { L1: 18, L2: 17, L3: 16 }, etat: 'Normal', poteaux: [DEMO_NODE_ID] }]
    }
  ],
  poteaux: [
    {
      id: DEMO_NODE_ID,
      nom: 'Poteau démo soutenance',
      adresse: 'Potentiometre A0 + relais D2',
      lat: -11.6634,
      lng: 27.4801,
      maisons: 1,
      depart: 'D1',
      cabine: 'CAB_DEMO'
    }
  ]
};

const cityNetwork = {
  cabines: [
    {
      id: 'CAB_K1',
      nom: 'Cabine Kampemba 1',
      adresse: 'Av. Sendwe x Tabora',
      lat: -11.6580,
      lng: 27.4760,
      kva: 400,
      sourceVoltage: 230,
      chargeActuelleKva: 338,
      phases: { L1: 82, L2: 54, L3: 47 },
      departs: [
        { id: 'D1', nom: 'Départ BT D1 - Sendwe', couleur: '#3b82f6', sourceVoltage: 230, phases: { L1: 45, L2: 30, L3: 25 }, etat: 'Attention', poteaux: ['D1_P1', 'D1_P2'] },
        { id: 'D2', nom: 'Départ BT D2 - Tabora', couleur: '#10b981', sourceVoltage: 230, phases: { L1: 34, L2: 58, L3: 41 }, etat: 'Attention', poteaux: ['D2_P1', 'D2_P2'] },
        { id: 'D3', nom: 'Départ BT D3 - Kasai', couleur: '#f59e0b', sourceVoltage: 230, phases: { L1: 68, L2: 42, L3: 33 }, etat: 'Critique', poteaux: ['D3_P1', 'D3_P2'] },
        { id: 'D4', nom: 'Départ BT D4 - Industriel', couleur: '#8b5cf6', sourceVoltage: 230, phases: { L1: 28, L2: 27, L3: 25 }, etat: 'Normal', poteaux: ['K1_D4_P1', 'K1_D4_P2'] }
      ]
    },
    {
      id: 'CAB_CENTRE',
      nom: 'Cabine Centre-Ville',
      adresse: 'Rond-point Sendwe',
      lat: -11.6612,
      lng: 27.4797,
      kva: 630,
      sourceVoltage: 230,
      chargeActuelleKva: 410,
      phases: { L1: 76, L2: 74, L3: 68 },
      departs: [
        { id: 'D1', nom: 'Départ BT D1 - Commerces', couleur: '#8b5cf6', sourceVoltage: 230, phases: { L1: 42, L2: 40, L3: 38 }, etat: 'Normal', poteaux: ['CV_P1', 'CV_P2'] },
        { id: 'D2', nom: 'Départ BT D2 - Administratif', couleur: '#06b6d4', sourceVoltage: 230, phases: { L1: 31, L2: 47, L3: 35 }, etat: 'Attention', poteaux: ['CV_P3', 'CV_P4'] },
        { id: 'D3', nom: 'Départ BT D3 - Avenue Moero', couleur: '#f97316', sourceVoltage: 230, phases: { L1: 50, L2: 36, L3: 34 }, etat: 'Attention', poteaux: ['CV_D3_P1', 'CV_D3_P2'] },
        { id: 'D4', nom: 'Départ BT D4 - Hôpital', couleur: '#14b8a6', sourceVoltage: 230, phases: { L1: 29, L2: 28, L3: 27 }, etat: 'Normal', poteaux: ['CV_D4_P1', 'CV_D4_P2'] }
      ]
    },
    {
      id: 'CAB_KAT',
      nom: 'Cabine Katuba',
      adresse: 'Marche central Katuba',
      lat: -11.6780,
      lng: 27.4650,
      kva: 250,
      sourceVoltage: 230,
      chargeActuelleKva: 216,
      phases: { L1: 64, L2: 38, L3: 31 },
      departs: [
        { id: 'D1', nom: 'Départ BT D1 - Résidentiel', couleur: '#ef4444', sourceVoltage: 230, phases: { L1: 52, L2: 31, L3: 27 }, etat: 'Critique', poteaux: ['KT_P1', 'KT_P2'] },
        { id: 'D2', nom: 'Départ BT D2 - Marché', couleur: '#84cc16', sourceVoltage: 230, phases: { L1: 44, L2: 39, L3: 30 }, etat: 'Attention', poteaux: ['KT_P3', 'KT_P4'] },
        { id: 'D3', nom: 'Départ BT D3 - Lufira', couleur: '#22c55e', sourceVoltage: 230, phases: { L1: 24, L2: 23, L3: 22 }, etat: 'Normal', poteaux: ['KT_D3_P1', 'KT_D3_P2'] },
        { id: 'D4', nom: 'Départ BT D4 - Écoles', couleur: '#0ea5e9', sourceVoltage: 230, phases: { L1: 36, L2: 49, L3: 28 }, etat: 'Critique', poteaux: ['KT_D4_P1', 'KT_D4_P2'] }
      ]
    }
  ],
  poteaux: [
    { id: 'D1_P1', nom: 'Poteau D1-P1', adresse: 'Av. Sendwe', lat: -11.6570, lng: 27.4780, maisons: 14, depart: 'D1', cabine: 'CAB_K1' },
    { id: 'D1_P2', nom: 'Poteau D1-P2', adresse: 'Fin Av. Sendwe', lat: -11.6560, lng: 27.4800, maisons: 9, depart: 'D1', cabine: 'CAB_K1' },
    { id: 'D2_P1', nom: 'Poteau D2-P1', adresse: 'Av. Tabora', lat: -11.6600, lng: 27.4780, maisons: 18, depart: 'D2', cabine: 'CAB_K1' },
    { id: 'D2_P2', nom: 'Poteau D2-P2', adresse: 'Fin Av. Tabora', lat: -11.6610, lng: 27.4810, maisons: 22, depart: 'D2', cabine: 'CAB_K1' },
    { id: 'D3_P1', nom: 'Poteau D3-P1', adresse: 'Av. Kasai', lat: -11.6630, lng: 27.4770, maisons: 15, depart: 'D3', cabine: 'CAB_K1' },
    { id: 'D3_P2', nom: 'Poteau D3-P2', adresse: 'Fin Av. Kasai', lat: -11.6640, lng: 27.4790, maisons: 11, depart: 'D3', cabine: 'CAB_K1' },
    { id: 'K1_D4_P1', nom: 'Poteau K1-D4-P1', adresse: 'Zone industrielle', lat: -11.6558, lng: 27.4736, maisons: 8, depart: 'D4', cabine: 'CAB_K1' },
    { id: 'K1_D4_P2', nom: 'Poteau K1-D4-P2', adresse: 'Fin zone industrielle', lat: -11.6542, lng: 27.4718, maisons: 6, depart: 'D4', cabine: 'CAB_K1' },
    { id: 'CV_P1', nom: 'Poteau CV-P1', adresse: 'Centre-Ville', lat: -11.6602, lng: 27.4824, maisons: 25, depart: 'D1', cabine: 'CAB_CENTRE' },
    { id: 'CV_P2', nom: 'Poteau CV-P2', adresse: 'Av. Moero', lat: -11.6626, lng: 27.4841, maisons: 20, depart: 'D1', cabine: 'CAB_CENTRE' },
    { id: 'CV_P3', nom: 'Poteau CV-P3', adresse: 'Quartier administratif', lat: -11.6590, lng: 27.4777, maisons: 12, depart: 'D2', cabine: 'CAB_CENTRE' },
    { id: 'CV_P4', nom: 'Poteau CV-P4', adresse: 'Av. Kilela Balanda', lat: -11.6572, lng: 27.4759, maisons: 16, depart: 'D2', cabine: 'CAB_CENTRE' },
    { id: 'CV_D3_P1', nom: 'Poteau CV-D3-P1', adresse: 'Avenue Moero Est', lat: -11.6638, lng: 27.4864, maisons: 18, depart: 'D3', cabine: 'CAB_CENTRE' },
    { id: 'CV_D3_P2', nom: 'Poteau CV-D3-P2', adresse: 'Fin avenue Moero', lat: -11.6653, lng: 27.4885, maisons: 15, depart: 'D3', cabine: 'CAB_CENTRE' },
    { id: 'CV_D4_P1', nom: 'Poteau CV-D4-P1', adresse: 'Hôpital général', lat: -11.6585, lng: 27.4828, maisons: 10, depart: 'D4', cabine: 'CAB_CENTRE' },
    { id: 'CV_D4_P2', nom: 'Poteau CV-D4-P2', adresse: 'Quartier hôpital', lat: -11.6568, lng: 27.4848, maisons: 11, depart: 'D4', cabine: 'CAB_CENTRE' },
    { id: 'KT_P1', nom: 'Poteau KT-P1', adresse: 'Katuba Marche', lat: -11.6760, lng: 27.4670, maisons: 19, depart: 'D1', cabine: 'CAB_KAT' },
    { id: 'KT_P2', nom: 'Poteau KT-P2', adresse: 'Katuba résidentiel', lat: -11.6810, lng: 27.4630, maisons: 17, depart: 'D1', cabine: 'CAB_KAT' },
    { id: 'KT_P3', nom: 'Poteau KT-P3', adresse: 'Axe Lufira', lat: -11.6742, lng: 27.4628, maisons: 21, depart: 'D2', cabine: 'CAB_KAT' },
    { id: 'KT_P4', nom: 'Poteau KT-P4', adresse: 'Fin ligne Lufira', lat: -11.6724, lng: 27.4594, maisons: 13, depart: 'D2', cabine: 'CAB_KAT' },
    { id: 'KT_D3_P1', nom: 'Poteau KT-D3-P1', adresse: 'Quartier Lufira', lat: -11.6794, lng: 27.4598, maisons: 12, depart: 'D3', cabine: 'CAB_KAT' },
    { id: 'KT_D3_P2', nom: 'Poteau KT-D3-P2', adresse: 'Fin Lufira', lat: -11.6826, lng: 27.4579, maisons: 9, depart: 'D3', cabine: 'CAB_KAT' },
    { id: 'KT_D4_P1', nom: 'Poteau KT-D4-P1', adresse: 'Complexe scolaire', lat: -11.6758, lng: 27.4590, maisons: 14, depart: 'D4', cabine: 'CAB_KAT' },
    { id: 'KT_D4_P2', nom: 'Poteau KT-D4-P2', adresse: 'Fin quartier ecoles', lat: -11.6736, lng: 27.4565, maisons: 10, depart: 'D4', cabine: 'CAB_KAT' }
  ]
};

const cityFallback = {
  D1_P1: { tension: 225, courant: 35, charge: 35, puissance: 7875, temperature: 31, statut: 'NORMAL' },
  D1_P2: { tension: 219, courant: 42, charge: 42, puissance: 9198, temperature: 32, statut: 'NORMAL' },
  D2_P1: { tension: 211, courant: 78, charge: 78, puissance: 16458, temperature: 34, statut: 'NORMAL' },
  D2_P2: { tension: 203, courant: 84, charge: 84, puissance: 17052, temperature: 36, statut: 'ALERTE' },
  D3_P1: { tension: 197, courant: 90, charge: 90, puissance: 17730, temperature: 38, statut: 'ALERTE' },
  D3_P2: { tension: 184, courant: 95, charge: 95, puissance: 17480, temperature: 41, statut: 'SURCHARGE_CRITIQUE' },
  K1_D4_P1: { tension: 226, courant: 28, charge: 28, puissance: 6328, temperature: 30, statut: 'NORMAL' },
  K1_D4_P2: { tension: 221, courant: 31, charge: 31, puissance: 6851, temperature: 31, statut: 'NORMAL' },
  CV_P1: { tension: 224, courant: 38, charge: 38, puissance: 8512, temperature: 32, statut: 'NORMAL' },
  CV_P2: { tension: 219, courant: 44, charge: 44, puissance: 9636, temperature: 33, statut: 'NORMAL' },
  CV_P3: { tension: 222, courant: 33, charge: 33, puissance: 7326, temperature: 31, statut: 'NORMAL' },
  CV_P4: { tension: 214, courant: 46, charge: 46, puissance: 9844, temperature: 32, statut: 'NORMAL' },
  CV_D3_P1: { tension: 216, courant: 52, charge: 52, puissance: 11232, temperature: 34, statut: 'NORMAL' },
  CV_D3_P2: { tension: 207, courant: 59, charge: 59, puissance: 12213, temperature: 36, statut: 'ALERTE' },
  CV_D4_P1: { tension: 225, courant: 30, charge: 30, puissance: 6750, temperature: 31, statut: 'NORMAL' },
  CV_D4_P2: { tension: 220, courant: 34, charge: 34, puissance: 7480, temperature: 32, statut: 'NORMAL' },
  KT_P1: { tension: 184, courant: 74, charge: 74, puissance: 13616, temperature: 36, statut: 'NORMAL' },
  KT_P2: { tension: 172, courant: 87, charge: 87, puissance: 14964, temperature: 37, statut: 'ALERTE' },
  KT_P3: { tension: 208, courant: 55, charge: 55, puissance: 11440, temperature: 34, statut: 'ALERTE' },
  KT_P4: { tension: 193, courant: 68, charge: 68, puissance: 13124, temperature: 35, statut: 'ALERTE' },
  KT_D3_P1: { tension: 224, courant: 24, charge: 24, puissance: 5376, temperature: 30, statut: 'NORMAL' },
  KT_D3_P2: { tension: 219, courant: 27, charge: 27, puissance: 5913, temperature: 31, statut: 'NORMAL' },
  KT_D4_P1: { tension: 202, courant: 49, charge: 49, puissance: 9898, temperature: 34, statut: 'ALERTE' },
  KT_D4_P2: { tension: 188, courant: 56, charge: 56, puissance: 10528, temperature: 37, statut: 'SURCHARGE_CRITIQUE' }
};

function statusMeta(statut) {
  const value = String(statut || 'INCONNU').toUpperCase();
  if (value === 'PANNE' || value === 'OFF') {
    return { key: 'off', label: 'Panne', color: '#64748b', severity: 'critical' };
  }
  if (value.includes('CRITIQUE')) {
    return { key: 'crit', label: 'Critique', color: '#ef4444', severity: 'critical' };
  }
  if (value === 'ALERTE' || value === 'SURCHARGE' || value === 'CHUTE_TENSION') {
    return { key: 'warn', label: 'Alerte', color: '#f59e0b', severity: 'major' };
  }
  if (value === 'NORMAL' || value === 'ACTIF') {
    return { key: 'ok', label: 'Normal', color: '#10b981', severity: 'ok' };
  }
  return { key: 'unknown', label: 'Attente', color: '#94a3b8', severity: 'minor' };
}

function cabineStatusMeta(tauxCharge) {
  if (tauxCharge > 85) {
    return { key: 'crit', label: 'Critique', color: '#ef4444' };
  }
  if (tauxCharge >= 70) {
    return { key: 'warn', label: 'Attention', color: '#f59e0b' };
  }
  return { key: 'ok', label: 'Normal', color: '#10b981' };
}

function voltageStatusMeta(voltage) {
  const value = toNumber(voltage);
  if (value === null) {
    return { key: 'unknown', label: 'Attente', color: '#94a3b8' };
  }
  if (value < 190) {
    return { key: 'crit', label: 'Critique', color: '#ef4444' };
  }
  if (value < 210) {
    return { key: 'warn', label: 'Attention', color: '#f59e0b' };
  }
  return { key: 'ok', label: 'Normal', color: '#10b981' };
}

function phaseBalanceStatusMeta(imbalance) {
  const value = toNumber(imbalance, 0);
  if (value > 30) {
    return { key: 'crit', label: 'Critique', color: '#ef4444' };
  }
  if (value >= 15) {
    return { key: 'warn', label: 'Attention', color: '#f59e0b' };
  }
  return { key: 'ok', label: 'Normal', color: '#10b981' };
}

function eventLevelMeta(level) {
  const value = String(level || 'info').toLowerCase();
  if (value === 'critique' || value === 'critical') {
    return { key: 'critique', label: 'Critique', color: '#ef4444' };
  }
  if (value === 'attention' || value === 'avertissement' || value === 'major') {
    return { key: 'attention', label: 'Attention', color: '#f59e0b' };
  }
  return { key: 'info', label: 'Info', color: '#3b82f6' };
}

function departKey(cabineId, departId) {
  return `${cabineId}:${departId}`;
}

function toNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function fmt(value, digits = 1) {
  const n = toNumber(value);
  return n === null ? '--' : n.toFixed(digits);
}

function formatEventDate(value) {
  const date = parseDate(value) || new Date();
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('fr-CD');
}

function parseDate(value) {
  if (!value) return null;
  const normalized = typeof value === 'string' && value.includes(' ') && !value.includes('T')
    ? value.replace(' ', 'T')
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function secondsSince(value) {
  const date = parseDate(value);
  if (!date) return null;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
}

function calculatePhaseBalance(phases = {}) {
  const entries = ['L1', 'L2', 'L3'].map((phase) => ({
    phase,
    current: toNumber(phases[phase], 0)
  }));
  const currents = entries.map((entry) => entry.current);
  const maxCurrent = Math.max(...currents);
  const minCurrent = Math.min(...currents);
  const averageCurrent = currents.reduce((sum, current) => sum + current, 0) / currents.length;
  const imbalance = averageCurrent > 0 ? ((maxCurrent - minCurrent) / averageCurrent) * 100 : 0;
  const leastLoadedPhase = entries.reduce((least, entry) => (
    entry.current < least.current ? entry : least
  ), entries[0]);
  const meta = phaseBalanceStatusMeta(imbalance);

  return {
    phases: {
      L1: entries[0].current,
      L2: entries[1].current,
      L3: entries[2].current
    },
    maxCurrent,
    minCurrent,
    averageCurrent,
    imbalance,
    leastLoadedPhase,
    meta,
    recommendation: imbalance > 15
      ? `Raccorder les nouveaux abonnés sur ${leastLoadedPhase.phase}.`
      : 'Répartition acceptable, aucune action urgente.'
  };
}

function readMeasure(node, fallback) {
  const source = node?.live || node?.derniere_mesure || node || fallback || {};
  const tension = toNumber(source.tension);
  const courant = toNumber(source.courant);
  const charge = toNumber(source.charge, courant);
  const puissance = toNumber(source.puissance, tension !== null && courant !== null ? tension * courant : null);
  return {
    tension,
    courant,
    charge,
    puissance,
    temperature: toNumber(source.temperature),
    statut: source.statut || (tension === null ? 'INCONNU' : 'NORMAL'),
    horodatage: source.timestamp || source.horodatage || null
  };
}

function mergeNode(prev, incoming) {
  const id = incoming.id_noeud || incoming.id;
  if (!id) return prev;
  const old = prev[id] || {};
  return {
    ...prev,
    [id]: {
      ...old,
      id,
      id_noeud: id,
      nom: old.nom || incoming.nom,
      adresse: old.adresse || incoming.adresse,
      latitude: old.latitude || incoming.latitude,
      longitude: old.longitude || incoming.longitude,
      live: incoming,
      derniere_mesure: incoming
    }
  };
}

function buildCabineDetails(cabine, visiblePoles) {
  const poleIds = new Set(cabine.departs.flatMap((depart) => depart.poteaux));
  const supervisedPoles = visiblePoles.filter((pole) => poleIds.has(pole.id));
  const tensionValues = supervisedPoles
    .map((pole) => pole.mesure.tension)
    .filter((value) => value !== null);
  const lastUpdate = supervisedPoles
    .map((pole) => pole.mesure.horodatage)
    .filter(Boolean)
    .sort()
    .pop();
  const tensionMoyenne = tensionValues.length
    ? tensionValues.reduce((sum, value) => sum + value, 0) / tensionValues.length
    : null;
  const puissanceNominaleKva = cabine.kva;
  const chargeActuelleKva = toNumber(cabine.chargeActuelleKva, 0);
  const tauxCharge = puissanceNominaleKva > 0
    ? (chargeActuelleKva / puissanceNominaleKva) * 100
    : 0;
  const meta = cabineStatusMeta(tauxCharge);
  const phaseBalance = calculatePhaseBalance(cabine.phases);

  return {
    ...cabine,
    puissanceNominaleKva,
    chargeActuelleKva,
    tauxCharge,
    tensionMoyenne,
    nombreDeparts: cabine.departs.length,
    nombrePoteaux: supervisedPoles.length,
    etat: meta.label,
    meta,
    phaseBalance,
    derniereMiseAJour: lastUpdate || new Date().toLocaleString('fr-CD')
  };
}

function buildVoltageProfile(cabine, depart, poles) {
  const sourceVoltage = toNumber(depart.sourceVoltage, toNumber(cabine.sourceVoltage, 230));
  let previousVoltage = sourceVoltage;
  const profile = [
    {
      id: cabine.id,
      label: `Cabine ${cabine.id}`,
      name: cabine.nom,
      voltage: sourceVoltage,
      type: 'cabine'
    }
  ];

  depart.poteaux.forEach((id, index) => {
    const pole = poles.find((item) => item.id === id);
    const fallbackVoltage = sourceVoltage - ((index + 1) * 6);
    const rawVoltage = toNumber(pole?.mesure.tension, fallbackVoltage);
    const voltage = Math.min(rawVoltage, previousVoltage - 1);
    previousVoltage = voltage;
    profile.push({
      id,
      label: pole?.nom || id,
      name: pole?.adresse || '',
      voltage,
      type: 'poteau',
      pole
    });
  });

  return profile;
}

function summarizeVoltageProfile(profile) {
  const source = profile[0];
  const polePoints = profile.filter((point) => point.type === 'poteau');
  const weakestPoint = polePoints.reduce((weakest, point) => {
    if (!weakest || point.voltage < weakest.voltage) return point;
    return weakest;
  }, null);
  const minVoltage = weakestPoint?.voltage ?? source?.voltage ?? null;
  const sourceVoltage = source?.voltage ?? null;
  return {
    sourceVoltage,
    minVoltage,
    totalDrop: sourceVoltage !== null && minVoltage !== null ? sourceVoltage - minVoltage : null,
    weakestPoint
  };
}

function createEvent({ id, timestamp, type, level = 'info', sourceType, sourceId, sourceName, message, state = 'actif' }) {
  const meta = eventLevelMeta(level);
  return {
    id,
    timestamp: timestamp || new Date().toISOString(),
    type,
    level: meta.key,
    levelLabel: meta.label,
    sourceType,
    sourceId,
    sourceName: sourceName || sourceId,
    message,
    state,
    meta
  };
}

function normalizeAnomalyEvent(item) {
  const type = String(item.type || 'Anomalie').replaceAll('_', ' ');
  const level = item.niveau === 'Critique' ? 'critique' : 'attention';
  return createEvent({
    id: `anomaly-${item.id}`,
    timestamp: item.date_detection,
    type,
    level,
    sourceType: 'poteau',
    sourceId: item.id_noeud,
    sourceName: item.id_noeud,
    message: item.description || `${type} détectée sur ${item.id_noeud}`,
    state: String(item.statut || 'Active').toLowerCase() === 'active' ? 'actif' : 'resolu'
  });
}

function buildVisionCityEvents(cabines, poles) {
  const now = Date.now();
  const events = [];
  const at = (minutesAgo) => new Date(now - minutesAgo * 60000).toISOString();

  cabines.forEach((cabine, cabineIndex) => {
    if (cabine.tauxCharge > 85) {
      events.push(createEvent({
        id: `city-overload-${cabine.id}`,
        timestamp: at(4 + cabineIndex),
        type: 'surcharge',
        level: 'critique',
        sourceType: 'cabine',
        sourceId: cabine.id,
        sourceName: cabine.nom,
        message: `${cabine.nom} en surcharge: taux de charge ${fmt(cabine.tauxCharge)}%.`,
        state: 'actif'
      }));
    }

    if (cabine.phaseBalance.imbalance >= 15) {
      events.push(createEvent({
        id: `city-phase-${cabine.id}`,
        timestamp: at(8 + cabineIndex),
        type: 'déséquilibre de phase',
        level: cabine.phaseBalance.imbalance > 30 ? 'critique' : 'attention',
        sourceType: 'cabine',
        sourceId: cabine.id,
        sourceName: cabine.nom,
        message: `Déséquilibre ${fmt(cabine.phaseBalance.imbalance)}% sur ${cabine.nom}. ${cabine.phaseBalance.recommendation}`,
        state: 'actif'
      }));
    }

    cabine.departs.forEach((depart, departIndex) => {
      const profile = buildVoltageProfile(cabine, depart, poles);
      const voltageSummary = summarizeVoltageProfile(profile);
      const phaseBalance = calculatePhaseBalance(depart.phases);
      if (voltageSummary.minVoltage < 210) {
        events.push(createEvent({
          id: `city-voltage-${cabine.id}-${depart.id}`,
          timestamp: at(12 + cabineIndex * 3 + departIndex),
          type: 'chute de tension',
          level: voltageSummary.minVoltage < 190 ? 'critique' : 'attention',
          sourceType: 'départ BT',
          sourceId: departKey(cabine.id, depart.id),
          sourceName: `${depart.nom}, ${cabine.nom}`,
          message: `Chute de tension détectée sur ${depart.nom}: minimum ${fmt(voltageSummary.minVoltage, 0)} V.`,
          state: 'actif'
        }));
      }
      if (phaseBalance.imbalance >= 15) {
        events.push(createEvent({
          id: `city-depart-phase-${cabine.id}-${depart.id}`,
          timestamp: at(18 + cabineIndex * 3 + departIndex),
          type: 'déséquilibre de phase',
          level: phaseBalance.imbalance > 30 ? 'critique' : 'attention',
          sourceType: 'départ BT',
          sourceId: departKey(cabine.id, depart.id),
          sourceName: `${depart.nom}, ${cabine.nom}`,
          message: `Déséquilibre ${fmt(phaseBalance.imbalance)}% sur ${depart.nom}. ${phaseBalance.recommendation}`,
          state: 'actif'
        }));
      }
    });
  });

  poles.forEach((pole, index) => {
    if (pole.mesure.tension !== null && pole.mesure.tension < 190) {
      events.push(createEvent({
        id: `city-critical-pole-${pole.id}`,
        timestamp: at(24 + index),
        type: 'chute de tension',
        level: 'critique',
        sourceType: 'poteau',
        sourceId: pole.id,
        sourceName: pole.nom,
        message: `${pole.nom} en tension critique: ${fmt(pole.mesure.tension, 0)} V.`,
        state: 'actif'
      }));
    }
    if (pole.mesure.temperature !== null && pole.mesure.temperature >= 40) {
      events.push(createEvent({
        id: `city-heat-${pole.id}`,
        timestamp: at(36 + index),
        type: 'échauffement',
        level: pole.mesure.temperature >= 45 ? 'critique' : 'attention',
        sourceType: 'poteau',
        sourceId: pole.id,
        sourceName: pole.nom,
        message: `Échauffement détecté sur ${pole.nom}: ${fmt(pole.mesure.temperature)} C.`,
        state: 'actif'
      }));
    }
    if (String(pole.mesure.statut || '').toUpperCase() === 'PANNE') {
      events.push(createEvent({
        id: `city-outage-${pole.id}`,
        timestamp: at(42 + index),
        type: 'panne',
        level: 'critique',
        sourceType: 'poteau',
        sourceId: pole.id,
        sourceName: pole.nom,
        message: `Panne détectée sur ${pole.nom}.`,
        state: 'actif'
      }));
    }
  });

  events.push(createEvent({
    id: 'city-comms-loss-cv',
    timestamp: at(52),
    type: 'perte de communication',
    level: 'attention',
    sourceType: 'cabine',
    sourceId: 'CAB_CENTRE',
    sourceName: 'Cabine Centre-Ville',
    message: 'Perte de communication temporaire avec un boîtier du départ BT D3.',
    state: 'resolu'
  }));
  events.push(createEvent({
    id: 'city-comms-return-cv',
    timestamp: at(47),
    type: 'retour de communication',
    level: 'info',
    sourceType: 'cabine',
    sourceId: 'CAB_CENTRE',
    sourceName: 'Cabine Centre-Ville',
    message: 'Communication rétablie avec le boîtier du départ BT D3.',
    state: 'resolu'
  }));

  return events;
}

function PhaseBalanceView({ balance }) {
  if (!balance) return null;
  const maxForBars = Math.max(balance.maxCurrent, 1);

  return (
    <div className="phase-balance-block">
      <div className="phase-current-bars">
        {['L1', 'L2', 'L3'].map((phase) => {
          const current = balance.phases[phase];
          const percent = Math.max(4, (current / maxForBars) * 100);
          const barMeta = current >= balance.maxCurrent
            ? { color: '#ef4444' }
            : current <= balance.minCurrent
              ? { color: '#10b981' }
              : { color: '#f59e0b' };
          return (
            <div className="phase-current-row" key={phase}>
              <div className="phase-current-top">
                <span>{phase}</span>
                <strong>{fmt(current, 0)} A</strong>
              </div>
              <div className="phase-current-track">
                <div style={{ width: `${percent}%`, background: barMeta.color }}></div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="measure-grid">
        <div className="phase-box"><div className="phase-name">Déséquilibre</div><div className="phase-val">{fmt(balance.imbalance)}%</div></div>
        <div className="phase-box"><div className="phase-name">État phases</div><div className="phase-val" style={{ color: balance.meta.color }}>{balance.meta.label}</div></div>
      </div>
      <div className="phase-recommendation">{balance.recommendation}</div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState('demo');
  const [activeTab, setActiveTab] = useState('map');
  const [nodes, setNodes] = useState({});
  const [stats, setStats] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [operatorEvents, setOperatorEvents] = useState([]);
  const [eventFilter, setEventFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(DEMO_NODE_ID);
  const [selectedType, setSelectedType] = useState('poteau');
  const [wsStatus, setWsStatus] = useState('reconnect');
  const [relayState, setRelayState] = useState('ferme');
  const [lastCommand, setLastCommand] = useState(null);
  const [demoResetAt, setDemoResetAt] = useState(null);
  const [demoSourceMode, setDemoSourceMode] = useState('unknown');
  const [simStatus, setSimStatus] = useState('');
  const [clock, setClock] = useState(new Date());
  const [chartData, setChartData] = useState({ labels: [], tension: [], courant: [] });
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);
  const lineLayerRef = useRef(null);
  const previousWsStatusRef = useRef(null);

  const network = mode === 'demo' ? demoNetwork : cityNetwork;
  const visibleIds = useMemo(() => new Set(network.poteaux.map((p) => p.id)), [network]);

  const visiblePoles = useMemo(() => {
    return network.poteaux.map((pole) => {
      const fallback = cityFallback[pole.id];
      const node = nodes[pole.id];
      return {
        ...pole,
        mesure: readMeasure(node, fallback),
        backend: node
      };
    });
  }, [network, nodes]);

  const cabineDetails = useMemo(() => {
    return network.cabines.map((cabine) => buildCabineDetails(cabine, visiblePoles));
  }, [network, visiblePoles]);

  const selectedCabine = useMemo(() => {
    return cabineDetails.find((cabine) => cabine.id === selectedId) || null;
  }, [cabineDetails, selectedId]);

  const selectedDepart = useMemo(() => {
    if (selectedType !== 'depart') return null;
    for (const cabine of cabineDetails) {
      for (const depart of cabine.departs) {
        if (departKey(cabine.id, depart.id) === selectedId) {
          return { cabine, depart };
        }
      }
    }
    return null;
  }, [cabineDetails, selectedId, selectedType]);

  const selectedVoltageProfile = useMemo(() => {
    if (!selectedDepart) return [];
    return buildVoltageProfile(selectedDepart.cabine, selectedDepart.depart, visiblePoles);
  }, [selectedDepart, visiblePoles]);

  const selectedVoltageSummary = useMemo(() => {
    return selectedVoltageProfile.length ? summarizeVoltageProfile(selectedVoltageProfile) : null;
  }, [selectedVoltageProfile]);

  const selectedDepartPhaseBalance = useMemo(() => {
    return selectedDepart ? calculatePhaseBalance(selectedDepart.depart.phases) : null;
  }, [selectedDepart]);

  const selectedPole = useMemo(() => {
    if (selectedType !== 'poteau') return null;
    return visiblePoles.find((pole) => pole.id === selectedId) || visiblePoles[0];
  }, [selectedId, selectedType, visiblePoles]);

  const demoPole = useMemo(() => {
    return visiblePoles.find((pole) => pole.id === DEMO_NODE_ID) || null;
  }, [visiblePoles]);

  const demoLastMeasureAge = secondsSince(demoPole?.mesure.horodatage);
  const demoHasRecentMeasure = demoLastMeasureAge !== null && demoLastMeasureAge <= 15;
  const demoNoRecentMeasure = mode === 'demo' && !demoHasRecentMeasure;
  const demoConnectionLabel = demoHasRecentMeasure
    ? (demoSourceMode === 'backend-simulation' ? 'Mode simulation' : 'Arduino connecte')
    : 'Arduino non confirme';
  const demoConnectionState = demoHasRecentMeasure
    ? (demoSourceMode === 'backend-simulation' ? 'sim' : 'ok')
    : 'warn';

  const visibleAnomalies = useMemo(() => {
    return anomalies.filter((item) => {
      const id = item.id_noeud || item.id || '';
      if (mode === 'demo') {
        const eventDate = parseDate(item.date_detection);
        if (demoResetAt && eventDate && eventDate < demoResetAt) return false;
        return id === DEMO_NODE_ID;
      }
      return visibleIds.has(id);
    });
  }, [anomalies, demoResetAt, mode, visibleIds]);

  const scadaEvents = useMemo(() => {
    const anomalyEvents = visibleAnomalies.map(normalizeAnomalyEvent);
    const cityEvents = mode === 'city' ? buildVisionCityEvents(cabineDetails, visiblePoles) : [];
    const events = [...operatorEvents, ...anomalyEvents, ...cityEvents]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return events;
  }, [cabineDetails, mode, operatorEvents, visibleAnomalies, visiblePoles]);

  const filteredEvents = useMemo(() => {
    if (eventFilter === 'critical') {
      return scadaEvents.filter((event) => event.level === 'critique');
    }
    if (eventFilter === 'active') {
      return scadaEvents.filter((event) => event.state === 'actif');
    }
    return scadaEvents;
  }, [eventFilter, scadaEvents]);

  const activeEventCount = useMemo(() => {
    return scadaEvents.filter((event) => event.state === 'actif').length;
  }, [scadaEvents]);

  const metrics = useMemo(() => {
    const measures = visiblePoles.map((p) => p.mesure).filter((m) => m.tension !== null);
    const active = measures.filter((m) => statusMeta(m.statut).key !== 'off').length;
    const tensionAvg = measures.length
      ? measures.reduce((sum, m) => sum + (m.tension || 0), 0) / measures.length
      : null;
    const chargeAvg = measures.length
      ? measures.reduce((sum, m) => sum + (m.charge || 0), 0) / measures.length
      : null;
    return {
      total: visiblePoles.length,
      active,
      tensionAvg,
      chargeAvg,
      anomalies: visibleAnomalies.length
    };
  }, [visiblePoles, visibleAnomalies]);

  const fetchSnapshot = useCallback(async () => {
    try {
      const [nodesRes, anomaliesRes, statsRes] = await Promise.all([
        axios.get('/api/noeuds'),
        axios.get('/api/anomalies?limite=50'),
        axios.get('/api/stats/resume')
      ]);

      if (Array.isArray(nodesRes.data)) {
        setNodes((prev) => {
          const next = { ...prev };
          nodesRes.data.forEach((node) => {
            const id = node.id_noeud || node.id;
            if (id) next[id] = node;
          });
          return next;
        });
      }
      if (Array.isArray(anomaliesRes.data)) setAnomalies(anomaliesRes.data);
      setStats(statsRes.data || null);
    } catch (error) {
      console.error('Snapshot API error', error);
    }
  }, []);

  useEffect(() => {
    fetchSnapshot();
    const timer = setInterval(fetchSnapshot, 10000);
    return () => clearInterval(timer);
  }, [fetchSnapshot]);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const previous = previousWsStatusRef.current;
    previousWsStatusRef.current = wsStatus;
    if (!previous || previous === wsStatus) return;

    const isLive = wsStatus === 'live';
    setOperatorEvents((prev) => [
      createEvent({
        id: `comms-${Date.now()}-${wsStatus}`,
        type: isLive ? 'retour de communication' : 'perte de communication',
        level: isLive ? 'info' : 'attention',
        sourceType: 'système',
        sourceId: 'WEBSOCKET',
        sourceName: 'Liaison WebSocket backend',
        message: isLive
          ? 'Retour de communication temps réel avec le backend.'
          : 'Perte de communication temps réel avec le backend.',
        state: isLive ? 'resolu' : 'actif'
      }),
      ...prev
    ].slice(0, 30));
  }, [wsStatus]);

  useEffect(() => {
    let ws;
    let retryTimer;
    let closed = false;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const host = window.location.hostname || 'localhost';
      ws = new WebSocket(`${protocol}://${host}:8000/ws`);

      ws.onopen = () => setWsStatus('live');
      ws.onclose = () => {
        setWsStatus('reconnect');
        if (!closed) retryTimer = setTimeout(connect, 3000);
      };
      ws.onerror = () => setWsStatus('reconnect');
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type !== 'mesure' || !message.data) return;
          const data = message.data;
          const id = data.id_noeud || data.id;
          setNodes((prev) => mergeNode(prev, data));
          if (id === selectedId) {
            setChartData((prev) => {
              const labels = [...prev.labels, new Date().toLocaleTimeString('fr-CD')].slice(-30);
              const tension = [...prev.tension, toNumber(data.tension, 0)].slice(-30);
              const courant = [...prev.courant, toNumber(data.courant, 0)].slice(-30);
              return { labels, tension, courant };
            });
          }
        } catch (error) {
          console.error('WS parse error', error);
        }
      };
    };

    connect();
    return () => {
      closed = true;
      clearTimeout(retryTimer);
      if (ws) ws.close();
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedPole) return;
    axios.get(`/api/mesures/historique/${selectedPole.id}?limit=30`)
      .then((res) => {
        if (!Array.isArray(res.data)) return;
        setChartData({
          labels: res.data.map((m) => (m.horodatage || '').slice(11, 19)),
          tension: res.data.map((m) => toNumber(m.tension, 0)),
          courant: res.data.map((m) => toNumber(m.courant, 0))
        });
      })
      .catch(() => setChartData({ labels: [], tension: [], courant: [] }));
  }, [selectedId]);

  useEffect(() => {
    setSelectedType('poteau');
    setSelectedId(mode === 'demo' ? DEMO_NODE_ID : 'D1_P1');
    setActiveTab('map');
  }, [mode]);

  useEffect(() => {
    if (activeTab !== 'map') return;

    if (!mapRef.current) {
      mapRef.current = L.map('map-element', {
        center: [-11.6630, 27.4790],
        zoom: mode === 'demo' ? 16 : 13,
        zoomControl: true
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'OpenStreetMap',
        maxZoom: 19
      }).addTo(mapRef.current);
      markerLayerRef.current = L.layerGroup().addTo(mapRef.current);
      lineLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    markerLayerRef.current.clearLayers();
    lineLayerRef.current.clearLayers();
    const bounds = [];

    cabineDetails.forEach((cabine) => {
      const cabineIcon = L.divIcon({
        className: 'custom-cab-icon',
        html: `<div class="cabine-marker" style="background:${cabine.meta.color}">C</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      L.marker([cabine.lat, cabine.lng], { icon: cabineIcon })
        .bindPopup(
          `<strong>${cabine.nom}</strong><br/>${cabine.adresse}<br/>` +
          `Charge: ${fmt(cabine.tauxCharge)}%<br/>Etat: ${cabine.etat}`
        )
        .on('click', () => {
          setSelectedType('cabine');
          setSelectedId(cabine.id);
        })
        .addTo(markerLayerRef.current);
      bounds.push([cabine.lat, cabine.lng]);

      cabine.departs.forEach((depart) => {
        const points = [[cabine.lat, cabine.lng]];
        depart.poteaux.forEach((id) => {
          const pole = network.poteaux.find((item) => item.id === id);
          if (pole) points.push([pole.lat, pole.lng]);
        });
        if (points.length > 1) {
          L.polyline(points, {
            color: depart.couleur,
            weight: mode === 'demo' ? 5 : 3,
            opacity: 0.9,
            dashArray: mode === 'demo' ? '' : '6,6'
          })
            .on('click', () => {
              setSelectedType('depart');
              setSelectedId(departKey(cabine.id, depart.id));
            })
            .addTo(lineLayerRef.current);
        }
      });
    });

    visiblePoles.forEach((pole) => {
      const meta = mode === 'city' ? voltageStatusMeta(pole.mesure.tension) : statusMeta(pole.mesure.statut);
      const radius = meta.key === 'crit' || meta.key === 'off' ? 14 : mode === 'demo' ? 12 : 9;
      const marker = L.circleMarker([pole.lat, pole.lng], {
        radius,
        fillColor: meta.color,
        color: selectedType === 'poteau' && selectedPole?.id === pole.id ? '#ffffff' : '#080b11',
        weight: selectedType === 'poteau' && selectedPole?.id === pole.id ? 3 : 1.5,
        fillOpacity: 0.95
      });
      marker.bindPopup(
        `<strong>${pole.nom}</strong><br/>${pole.adresse}<br/>` +
        `Tension: ${fmt(pole.mesure.tension)} V<br/>Statut: ${meta.label}`
      );
      marker.on('click', () => {
        setSelectedType('poteau');
        setSelectedId(pole.id);
      });
      marker.addTo(markerLayerRef.current);
      bounds.push([pole.lat, pole.lng]);
    });

    if (bounds.length) {
      try {
        mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: mode === 'demo' ? 17 : 14 });
      } catch (error) {
        console.error('Map bounds error', error);
      }
    }
    setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 120);
  }, [activeTab, mode, network, selectedPole, selectedType, visiblePoles, cabineDetails]);

  const startSimulation = async () => {
    try {
      const res = await axios.post(`/api/simulation/start?mode=${mode}`);
      if (mode === 'demo') setDemoSourceMode('backend-simulation');
      setSimStatus(res.data?.message || 'Simulation active');
      setTimeout(() => setSimStatus(''), 3500);
    } catch (error) {
      setSimStatus('Simulation indisponible');
      setTimeout(() => setSimStatus(''), 3500);
    }
  };

  const resetDemo = () => {
    const now = new Date();
    setDemoResetAt(now);
    setRelayState('ferme');
    setLastCommand({
      type: 'Réinitialisation',
      label: 'Démo réinitialisée',
      timestamp: now.toISOString()
    });
    setSelectedType('poteau');
    setSelectedId(DEMO_NODE_ID);
    setChartData({ labels: [], tension: [], courant: [] });
    setEventFilter('all');
    setOperatorEvents((prev) => [
      createEvent({
        id: `operator-${Date.now()}-reset-demo`,
        type: 'réinitialisation démo',
        level: 'info',
        sourceType: 'poteau',
        sourceId: DEMO_NODE_ID,
        sourceName: 'Poteau démo soutenance',
        message: 'Démo soutenance réinitialisée: relais affiché fermé, sélection recentrée sur NODE_LUB_001.',
        state: 'resolu'
      }),
      ...prev
    ].slice(0, 30));
    setSimStatus('Démo réinitialisée');
    setTimeout(() => setSimStatus(''), 2500);
  };

  const sendRelay = async (type) => {
    if (!selectedPole) return;
    const isOpening = type === 'Ouverture';
    const commandTimestamp = new Date().toISOString();
    setRelayState(isOpening ? 'ouvert' : 'ferme');
    setLastCommand({
      type,
      label: isOpening ? 'Délestage envoyé' : 'Rétablissement envoyé',
      timestamp: commandTimestamp
    });

    const actionEvent = () => {
      setOperatorEvents((prev) => [
        createEvent({
          id: `operator-${Date.now()}-${type}`,
          timestamp: commandTimestamp,
          type: isOpening ? 'délestage' : 'rétablissement',
          level: 'info',
          sourceType: 'poteau',
          sourceId: selectedPole.id,
          sourceName: selectedPole.nom,
          message: `${isOpening ? 'Délestage' : 'Rétablissement'} commandé par l'opérateur sur ${selectedPole.nom}.`,
          state: isOpening ? 'actif' : 'resolu'
        }),
        ...prev
      ].slice(0, 30));
    };
    try {
      await axios.post('/api/commandes/delestage', {
        id_noeud: selectedPole.id,
        type,
        motif: mode === 'demo' ? 'Commande soutenance' : 'Commande opérateur'
      });
      actionEvent();
    } catch (error) {
      try {
        await axios.post('/api/delestage', {
          id_noeud: selectedPole.id,
          type,
          motif: 'Commande secours'
        }, { headers: { 'X-API-KEY': API_KEY } });
        actionEvent();
      } catch (fallbackError) {
        console.error('Relay command error', fallbackError);
      }
    }
  };

  const selectedMeta = selectedType === 'cabine' && selectedCabine
    ? selectedCabine.meta
    : selectedType === 'depart' && selectedVoltageSummary
      ? voltageStatusMeta(selectedVoltageSummary.minVoltage)
      : statusMeta(selectedPole?.mesure.statut);
  const selectedTitle = selectedType === 'cabine'
    ? selectedCabine?.nom
    : selectedType === 'depart'
      ? selectedDepart?.depart.nom
      : selectedPole?.nom;
  const wsLabel = wsStatus === 'live' ? 'En direct' : 'Reconnexion';

  return (
    <div className="app-shell">
      <header>
        <div className="brand-section">
          <div className="brand-text" style={{ marginLeft: 10 }}>
            <span className="brand-name">SuperVolt</span>
            <span className="brand-sub">SUPERVISION BT - LUBUMBASHI</span>
          </div>
        </div>

        <div className="header-center">
          <div className="mode-switch">
            <button className={`mode-btn ${mode === 'demo' ? 'active' : ''}`} onClick={() => setMode('demo')}>
              Demo soutenance
            </button>
            <button className={`mode-btn ${mode === 'city' ? 'active' : ''}`} onClick={() => setMode('city')}>
              Vision ville
            </button>
          </div>
          <div className="scada-subinfo">{clock.toLocaleString('fr-CD')}</div>
          {mode === 'demo' && (
            <div className={`demo-header-status ${demoConnectionState}`}>
              {demoConnectionLabel}
            </div>
          )}
        </div>

        <div className="header-right">
          <button className="btn-action top-action" onClick={startSimulation}>
            <RefreshCw size={13} /> Simulation
          </button>
          <div className={`live-indicator ${wsStatus}`}>
            <div className="live-pulse"></div> {wsLabel}
          </div>
          <button className="btn-circle" title="Alertes actives" onClick={() => setActiveTab('incidents')}>
            <Bell size={15} />
            <span className="badge-alert">{activeEventCount}</span>
          </button>
        </div>
      </header>

      <div className="workspace-layout">
        <nav className="floating-panel sidebar-left">
          <div className="sidebar-label">Exploitation</div>
          <div className="sidebar-menu">
            <div className={`menu-item ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
              <Map size={16} /> Carte
            </div>
            <div className={`menu-item ${activeTab === 'assets' ? 'active' : ''}`} onClick={() => setActiveTab('assets')}>
              <Cpu size={16} /> Ouvrages
            </div>
            <div className={`menu-item ${activeTab === 'telemetry' ? 'active' : ''}`} onClick={() => setActiveTab('telemetry')}>
              <Activity size={16} /> Télémesures
            </div>
            <div className={`menu-item ${activeTab === 'incidents' ? 'active' : ''}`} onClick={() => setActiveTab('incidents')}>
              <AlertTriangle size={16} /> Journal SCADA
            </div>
          </div>
          <hr className="sidebar-divider" />
          <div className="sidebar-label">Projection</div>
          <div className="sidebar-menu">
            <div className={`menu-item ${activeTab === 'phases' ? 'active' : ''}`} onClick={() => setActiveTab('phases')}>
              <GitBranch size={16} /> Départs BT
            </div>
            <div className={`menu-item ${activeTab === 'subscribers' ? 'active' : ''}`} onClick={() => setActiveTab('subscribers')}>
              <Users size={16} /> Abonnés
            </div>
          </div>
          <div className="sidebar-status-block">
            <div className="status-container">
              <div className="status-row"><span className="lbl">Mode</span><span className="val">{mode === 'demo' ? 'Soutenance' : 'Ville'}</span></div>
              <div className="status-row"><span className="lbl">Nœuds</span><span className="val">{metrics.total}</span></div>
            </div>
          </div>
        </nav>

        <main className="center-workspace">
          <div className="kpi-row kpi-row-four">
            <div className="kpi-tile">
              <div className="kpi-head"><span className="kpi-title">Nœuds actifs</span><Cpu size={14} color="var(--color-success)" /></div>
              <div className="kpi-body"><span className="kpi-num">{metrics.active}</span><span className="kpi-unit">/ {metrics.total}</span></div>
              <div className="kpi-foot neutral">{stats ? `${stats.total_noeuds} en base` : 'BDD locale'}</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-head"><span className="kpi-title">Tension moyenne</span><Activity size={14} color="var(--color-primary)" /></div>
              <div className="kpi-body"><span className="kpi-num">{fmt(metrics.tensionAvg)}</span><span className="kpi-unit">V</span></div>
              <div className={`kpi-foot ${metrics.tensionAvg !== null && metrics.tensionAvg < 180 ? 'down' : 'up'}`}>
                {metrics.tensionAvg !== null && metrics.tensionAvg < 180 ? 'Sous seuil' : 'Nominale'}
              </div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-head"><span className="kpi-title">Événements actifs</span><AlertTriangle size={14} color="var(--color-danger)" /></div>
              <div className="kpi-body"><span className="kpi-num" style={{ color: activeEventCount ? 'var(--color-danger)' : 'var(--color-success)' }}>{activeEventCount}</span><span className="kpi-unit">SCADA</span></div>
              <div className="kpi-foot neutral">Anomalies + journal</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-head"><span className="kpi-title">Charge moyenne</span><Zap size={14} color="var(--color-warning)" /></div>
              <div className="kpi-body"><span className="kpi-num">{fmt(metrics.chargeAvg)}</span><span className="kpi-unit">%</span></div>
              <div className={`kpi-foot ${metrics.chargeAvg !== null && metrics.chargeAvg > 85 ? 'down' : 'up'}`}>
                {metrics.chargeAvg !== null && metrics.chargeAvg > 85 ? 'Surcharge' : 'Stable'}
              </div>
            </div>
          </div>

          {simStatus && <div className="sim-toast">{simStatus}</div>}

          <section className={`panel-view floating-panel ${activeTab === 'map' ? 'active' : ''}`} style={{ position: 'relative' }}>
            <div id="map-element" className="map-element"></div>
            <div className="map-legend-box">
              <div className="legend-lbl">{mode === 'demo' ? 'Maquette mono-poteau' : 'Projection multi-boîtiers'}</div>
              <div className="legend-row"><div className="legend-dot" style={{ background: '#10b981' }}></div><span>Normal</span></div>
              <div className="legend-row"><div className="legend-dot" style={{ background: '#f59e0b' }}></div><span>Alerte</span></div>
              <div className="legend-row"><div className="legend-dot" style={{ background: '#ef4444' }}></div><span>Critique</span></div>
            </div>
          </section>

          <section className={`panel-view floating-panel ${activeTab === 'assets' ? 'active' : ''}`}>
            <div className="panel-header">
              <div className="panel-title">
                <h2>{mode === 'demo' ? 'Maquette de soutenance' : 'Cabines et poteaux projetés'}</h2>
                <p>{mode === 'demo' ? 'Arduino UNO, potentiomètre et relais.' : 'Représentation cible avec plusieurs boîtiers terrain.'}</p>
              </div>
            </div>
            <div className="panel-body-scroll">
              <div className="assets-grid">
                {cabineDetails.map((cabine) => (
                  <div
                    className="t-card clickable-card"
                    key={cabine.id}
                    onClick={() => {
                      setSelectedType('cabine');
                      setSelectedId(cabine.id);
                    }}
                  >
                    <div className="t-head">
                      <div className="t-title-wrap">
                        <span className="t-name">{cabine.nom}</span>
                        <span className="t-location"><MapPin size={10} /> {cabine.adresse}</span>
                      </div>
                      <span className={`status-pill ${cabine.meta.key}`}>{cabine.etat}</span>
                    </div>
                    <div className="t-gauge-wrap">
                      <div className="t-gauge-details"><span className="lbl">Puissance</span><span className="val">{cabine.puissanceNominaleKva} kVA</span></div>
                      <div className="t-gauge-details"><span className="lbl">Charge</span><span className="val">{fmt(cabine.tauxCharge)}%</span></div>
                    </div>
                    <div className="item-list compact-list">
                      {cabine.departs.map((dep) => (
                        <div
                          className="list-row clickable"
                          key={dep.id}
                          style={{ borderLeft: `4px solid ${dep.couleur}` }}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedType('depart');
                            setSelectedId(departKey(cabine.id, dep.id));
                          }}
                        >
                          <div className="left"><strong>{dep.nom}</strong></div>
                          <div className="right">{dep.poteaux.length} poteaux</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className={`panel-view floating-panel ${activeTab === 'telemetry' ? 'active' : ''}`}>
            <div className="panel-header">
              <div className="panel-title"><h2>Télémesures</h2><p>{selectedPole?.nom || 'Nœud sélectionné'}</p></div>
            </div>
            <div className="telemetry-split">
              <div className="telemetry-aside">
                <div className="aside-block">
                  <label>Nœud</label>
                  <select
                    className="custom-select"
                    value={selectedPole?.id || ''}
                    onChange={(e) => {
                      setSelectedType('poteau');
                      setSelectedId(e.target.value);
                    }}
                  >
                    {visiblePoles.map((pole) => <option key={pole.id} value={pole.id}>{pole.nom}</option>)}
                  </select>
                </div>
                <div className="telemetry-dial-card">
                  <span className="lbl">Tension</span>
                  <span className="val">{fmt(selectedPole?.mesure.tension)} V</span>
                </div>
                <div className="telemetry-dial-card">
                  <span className="lbl">Courant</span>
                  <span className="val">{fmt(selectedPole?.mesure.courant)} A</span>
                </div>
              </div>
              <div className="chart-panel-card">
                <div className="chart-wrapper">
                  <Line
                    data={{
                      labels: chartData.labels,
                      datasets: [
                        { label: 'Tension (V)', data: chartData.tension, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', tension: 0.25, yAxisID: 'y' },
                        { label: 'Courant (A)', data: chartData.courant, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.25, yAxisID: 'y1' }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: { mode: 'index', intersect: false },
                      scales: {
                        y: { type: 'linear', position: 'left' },
                        y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false } }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className={`panel-view floating-panel ${activeTab === 'incidents' ? 'active' : ''}`}>
            <div className="panel-header">
              <div className="panel-title">
                <h2>Journal des événements SCADA</h2>
                <p>{mode === 'demo' ? 'Actions opérateur et anomalies du nœud réel.' : 'Événements projetés cabines, départs BT et poteaux.'}</p>
              </div>
            </div>
            <div className="event-filter-bar">
              {[
                { id: 'all', label: 'Tous' },
                { id: 'critical', label: 'Critiques' },
                { id: 'active', label: 'Actifs' }
              ].map((filter) => (
                <button
                  key={filter.id}
                  className={`event-filter-btn ${eventFilter === filter.id ? 'active' : ''}`}
                  onClick={() => setEventFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
              <span className="event-filter-count">{filteredEvents.length} événements</span>
            </div>
            <div className="event-log-list">
              {filteredEvents.length === 0 && (
                <div className="event-empty">Aucun événement pour ce filtre.</div>
              )}
              {filteredEvents.slice(0, 80).map((event) => (
                <div className="event-log-row" key={event.id}>
                  <div className="event-time">{formatEventDate(event.timestamp)}</div>
                  <div className="event-main">
                    <div className="event-title-line">
                      <span className="event-type">{event.type}</span>
                      <span className={`sev-tag ${event.level === 'critique' ? 'critical' : event.level === 'attention' ? 'major' : 'minor'}`}>
                        {event.levelLabel}
                      </span>
                      <span className={`event-state ${event.state}`}>{event.state === 'resolu' ? 'résolu' : event.state}</span>
                    </div>
                    <div className="event-message">{event.message}</div>
                    <div className="event-source">{event.sourceType}: {event.sourceName}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={`panel-view floating-panel ${activeTab === 'phases' ? 'active' : ''}`}>
            <div className="panel-header"><div className="panel-title"><h2>Départs BT</h2><p>{mode === 'demo' ? 'Un départ BT instrumenté.' : 'Extension par départ BT et par cabine.'}</p></div></div>
            <div className="panel-body-scroll">
              <div className="assets-grid">
                {cabineDetails.flatMap((cabine) => cabine.departs.map((dep) => (
                  <div
                    className="t-card clickable-card"
                    key={`${cabine.id}-${dep.id}`}
                    onClick={() => {
                      setSelectedType('depart');
                      setSelectedId(departKey(cabine.id, dep.id));
                    }}
                  >
                    <div className="t-head">
                      <div className="t-title-wrap">
                        <span className="t-name">{dep.nom}</span>
                        <span className="t-location">{cabine.nom}</span>
                      </div>
                      <span className={`status-pill ${calculatePhaseBalance(dep.phases).meta.key}`}>
                        {calculatePhaseBalance(dep.phases).meta.label}
                      </span>
                    </div>
                    <div className="item-list compact-list">
                      {dep.poteaux.map((id) => {
                        const pole = visiblePoles.find((item) => item.id === id);
                        const meta = mode === 'city' ? voltageStatusMeta(pole?.mesure.tension) : statusMeta(pole?.mesure.statut);
                        return (
                          <div
                            className="list-row clickable"
                            key={id}
                            style={{ borderLeft: `4px solid ${meta.color}` }}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedType('poteau');
                              setSelectedId(id);
                            }}
                          >
                            <div className="left"><strong>{pole?.nom || id}</strong></div>
                            <div className="right">{fmt(pole?.mesure.tension)} V</div>
                          </div>
                        );
                      })}
                    </div>
                    {mode === 'city' && (
                      <div className="depart-phase-footer">
                        Déséquilibre {fmt(calculatePhaseBalance(dep.phases).imbalance)}%
                      </div>
                    )}
                  </div>
                )))}
              </div>
            </div>
          </section>

          <section className={`panel-view floating-panel ${activeTab === 'subscribers' ? 'active' : ''}`}>
            <div className="panel-header"><div className="panel-title"><h2>Abonnés BT</h2></div></div>
            <div className="scada-table-wrap">
              <table className="scada-table">
                <thead><tr><th>Compteur</th><th>Abonné</th><th>Source</th><th>Charge</th></tr></thead>
                <tbody>
                  <tr><td>CNT-99102-LUB</td><td>Clinique Universitaire</td><td>{mode === 'demo' ? DEMO_NODE_ID : 'CV_P1'}</td><td>14.8 kW</td></tr>
                  <tr><td>CNT-44829-KAM</td><td>Boulangerie Kampemba</td><td>{mode === 'demo' ? DEMO_NODE_ID : 'D2_P2'}</td><td>18.2 kW</td></tr>
                  <tr><td>CNT-77120-KAT</td><td>Quartier résidentiel</td><td>{mode === 'demo' ? DEMO_NODE_ID : 'KT_P2'}</td><td>9.6 kW</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </main>

        <aside className="floating-panel sidebar-right">
          <div className="sidebar-right-header">
            <span>{selectedTitle || 'Selection'}</span>
            <span className={`status-pill ${selectedMeta.key}`}>{selectedMeta.label}</span>
          </div>

          {selectedType === 'cabine' && selectedCabine && (
            <div className="right-detail">
              <div className="scada-card">
                <div className="card-header"><span className="card-title">Fiche cabine</span><span>{selectedCabine.id}</span></div>
                <div className="cabine-summary">
                  <div className="cabine-title">{selectedCabine.nom}</div>
                  <div className="cabine-subtitle">{selectedCabine.adresse}</div>
                </div>
                <div className="measure-grid">
                  <div className="phase-box"><div className="phase-name">Puissance nominale</div><div className="phase-val">{fmt(selectedCabine.puissanceNominaleKva, 0)} kVA</div></div>
                  <div className="phase-box"><div className="phase-name">Charge actuelle</div><div className="phase-val">{fmt(selectedCabine.chargeActuelleKva, 0)} kVA</div></div>
                  <div className="phase-box"><div className="phase-name">Taux de charge</div><div className="phase-val">{fmt(selectedCabine.tauxCharge)}%</div></div>
                  <div className="phase-box"><div className="phase-name">Tension moyenne</div><div className="phase-val">{fmt(selectedCabine.tensionMoyenne)} V</div></div>
                  <div className="phase-box"><div className="phase-name">Départs BT</div><div className="phase-val">{selectedCabine.nombreDeparts}</div></div>
                  <div className="phase-box"><div className="phase-name">Poteaux supervisés</div><div className="phase-val">{selectedCabine.nombrePoteaux}</div></div>
                </div>
                <div className="charge-bar">
                  <div style={{ width: `${Math.min(100, selectedCabine.tauxCharge || 0)}%`, background: selectedCabine.meta.color }}></div>
                </div>
                <div className="last-update">Dernière mise à jour: {selectedCabine.derniereMiseAJour}</div>
              </div>

              <div className="scada-card">
                <div className="card-header"><span className="card-title">Départs BT</span><span>{selectedCabine.nombreDeparts}</span></div>
                <div className="item-list compact-list">
                  {selectedCabine.departs.map((depart) => (
                    <div
                      className="list-row clickable"
                      key={depart.id}
                      style={{ borderLeft: `4px solid ${depart.couleur}` }}
                      onClick={() => {
                        setSelectedType('depart');
                        setSelectedId(departKey(selectedCabine.id, depart.id));
                      }}
                    >
                      <div className="left">
                        <strong>{depart.nom}</strong>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {depart.poteaux.length} poteaux stratégiques - Déséquilibre {fmt(calculatePhaseBalance(depart.phases).imbalance)}%
                        </div>
                      </div>
                      <div className="right">{depart.id}</div>
                    </div>
                  ))}
                </div>
              </div>

              {mode === 'city' && (
                <div className="scada-card">
                  <div className="card-header">
                    <span className="card-title">Équilibre triphasé cabine</span>
                    <span className={`status-pill ${selectedCabine.phaseBalance.meta.key}`}>{selectedCabine.phaseBalance.meta.label}</span>
                  </div>
                  <PhaseBalanceView balance={selectedCabine.phaseBalance} />
                </div>
              )}

              {mode === 'city' && (
                <div className="scada-card">
                  <div className="card-header"><span className="card-title">Chute de tension</span><span>par départ BT</span></div>
                  <div className="voltage-profile-stack">
                    {selectedCabine.departs.map((depart) => {
                      const profile = buildVoltageProfile(selectedCabine, depart, visiblePoles);
                      const summary = summarizeVoltageProfile(profile);
                      const meta = voltageStatusMeta(summary.minVoltage);
                      return (
                        <div
                          className="voltage-mini clickable"
                          key={depart.id}
                          onClick={() => {
                            setSelectedType('depart');
                            setSelectedId(departKey(selectedCabine.id, depart.id));
                          }}
                        >
                          <div className="voltage-mini-head">
                            <span>{depart.nom}</span>
                            <span className={`status-pill ${meta.key}`}>{meta.label}</span>
                          </div>
                          <div className="voltage-chain">
                            {profile.map((point, index) => (
                              <span key={`${depart.id}-${point.id}`}>
                                {index > 0 && <span className="chain-arrow">-&gt;</span>}
                                {point.label}: {fmt(point.voltage, 0)} V
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="scada-card">
                <div className="card-header"><span className="card-title">Poteaux de la cabine</span><span>{selectedCabine.nombrePoteaux}</span></div>
                <div className="item-list compact-list">
                  {visiblePoles
                    .filter((pole) => pole.cabine === selectedCabine.id)
                    .map((pole) => {
                      const meta = mode === 'city' ? voltageStatusMeta(pole.mesure.tension) : statusMeta(pole.mesure.statut);
                      return (
                        <div
                          key={pole.id}
                          className="list-row clickable"
                          onClick={() => {
                            setSelectedType('poteau');
                            setSelectedId(pole.id);
                          }}
                          style={{ borderLeft: `4px solid ${meta.color}` }}
                        >
                          <div className="left"><strong>{pole.nom}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pole.adresse}</div></div>
                          <div className="right">{fmt(pole.mesure.tension)} V</div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {selectedType === 'depart' && selectedDepart && selectedVoltageSummary && (
            <div className="right-detail">
              <div className="scada-card">
                <div className="card-header"><span className="card-title">Profil tension départ BT</span><span>{selectedDepart.depart.id}</span></div>
                <div className="cabine-summary">
                  <div className="cabine-title">{selectedDepart.depart.nom}</div>
                  <div className="cabine-subtitle">{selectedDepart.cabine.nom}</div>
                </div>
                <div className="voltage-profile">
                  {selectedVoltageProfile.map((point, index) => {
                    const previous = selectedVoltageProfile[index - 1];
                    const delta = previous ? point.voltage - previous.voltage : null;
                    const meta = voltageStatusMeta(point.voltage);
                    return (
                      <div className="voltage-point" key={`${point.type}-${point.id}`}>
                        <div className="voltage-label">
                          <strong>{point.label}</strong>
                          <span>{point.type === 'cabine' ? point.name : point.name || 'Poteau supervisé'}</span>
                        </div>
                        <span className="voltage-badge" style={{ color: meta.color }}>{fmt(point.voltage, 0)} V</span>
                        <span className="voltage-delta">{delta === null ? 'Source' : `${fmt(delta, 0)} V`}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="scada-card">
                <div className="card-header"><span className="card-title">Synthèse chute</span><span>{voltageStatusMeta(selectedVoltageSummary.minVoltage).label}</span></div>
                <div className="measure-grid">
                  <div className="phase-box"><div className="phase-name">Tension source</div><div className="phase-val">{fmt(selectedVoltageSummary.sourceVoltage, 0)} V</div></div>
                  <div className="phase-box"><div className="phase-name">Tension minimale</div><div className="phase-val">{fmt(selectedVoltageSummary.minVoltage, 0)} V</div></div>
                  <div className="phase-box"><div className="phase-name">Chute totale</div><div className="phase-val">-{fmt(selectedVoltageSummary.totalDrop, 0)} V</div></div>
                  <div className="phase-box"><div className="phase-name">Poteau faible</div><div className="phase-val">{selectedVoltageSummary.weakestPoint?.label || '--'}</div></div>
                </div>
              </div>

              {mode === 'city' && (
                <div className="scada-card">
                  <div className="card-header">
                    <span className="card-title">Équilibre triphasé départ BT</span>
                    <span className={`status-pill ${selectedDepartPhaseBalance.meta.key}`}>{selectedDepartPhaseBalance.meta.label}</span>
                  </div>
                  <PhaseBalanceView balance={selectedDepartPhaseBalance} />
                </div>
              )}

              <div className="scada-card">
                <div className="card-header"><span className="card-title">Poteaux du départ BT</span><span>{selectedDepart.depart.poteaux.length}</span></div>
                <div className="item-list compact-list">
                  {selectedDepart.depart.poteaux.map((id) => {
                    const pole = visiblePoles.find((item) => item.id === id);
                    const meta = voltageStatusMeta(pole?.mesure.tension);
                    return (
                      <div
                        key={id}
                        className="list-row clickable"
                        onClick={() => {
                          setSelectedType('poteau');
                          setSelectedId(id);
                        }}
                        style={{ borderLeft: `4px solid ${meta.color}` }}
                      >
                        <div className="left"><strong>{pole?.nom || id}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pole?.adresse || 'Poteau BT'}</div></div>
                        <div className="right">{fmt(pole?.mesure.tension)} V</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {selectedType === 'poteau' && selectedPole && (
            <div className="right-detail">
              {mode === 'demo' && (
                <div className="scada-card demo-status-card">
                  <div className="card-header">
                    <span className="card-title">État démo soutenance</span>
                    <span className={`demo-source-pill ${demoConnectionState}`}>{demoConnectionLabel}</span>
                  </div>
                  {demoNoRecentMeasure && (
                    <div className="demo-warning">
                      Aucune mesure récente de NODE_LUB_001. Vérifier le port Arduino, la gateway ou lancer la simulation.
                    </div>
                  )}
                  <div className="measure-grid">
                    <div className="phase-box">
                      <div className="phase-name">Nœud réel</div>
                      <div className="phase-val">{DEMO_NODE_ID}</div>
                    </div>
                    <div className="phase-box">
                      <div className="phase-name">Relais</div>
                      <div className={`phase-val relay-state ${relayState}`}>{relayState === 'ouvert' ? 'Ouvert' : 'Fermé'}</div>
                    </div>
                    <div className="phase-box">
                      <div className="phase-name">Dernière mesure</div>
                      <div className="phase-val">{demoLastMeasureAge === null ? '--' : `${demoLastMeasureAge}s`}</div>
                    </div>
                    <div className="phase-box">
                      <div className="phase-name">Dernière commande</div>
                      <div className="phase-val">{lastCommand ? lastCommand.label : 'Aucune'}</div>
                    </div>
                  </div>
                  {lastCommand && (
                    <div className="last-update">Commande: {formatEventDate(lastCommand.timestamp)}</div>
                  )}
                  <div className="t-actions-row demo-reset-row">
                    <button className="btn-action" onClick={resetDemo}>
                      <RefreshCw size={12} /> Réinitialiser démo
                    </button>
                  </div>
                </div>
              )}

              <div className="scada-card">
                <div className="card-header"><span className="card-title">Mesure live</span><span>{selectedPole.id}</span></div>
                <div className="measure-grid">
                  <div className="phase-box"><div className="phase-name">Tension</div><div className="phase-val">{fmt(selectedPole.mesure.tension)} V</div></div>
                  <div className="phase-box"><div className="phase-name">Courant</div><div className="phase-val">{fmt(selectedPole.mesure.courant)} A</div></div>
                  <div className="phase-box"><div className="phase-name">Charge</div><div className="phase-val">{fmt(selectedPole.mesure.charge)}%</div></div>
                  <div className="phase-box"><div className="phase-name">Puissance</div><div className="phase-val">{fmt((selectedPole.mesure.puissance || 0) / 1000)} kW</div></div>
                </div>
                <div className="charge-bar">
                  <div style={{ width: `${Math.min(100, selectedPole.mesure.charge || 0)}%`, background: selectedMeta.color }}></div>
                </div>
              </div>

              <div className="scada-card">
                <div className="card-header"><span className="card-title">Actionneur local</span><span>{relayState === 'ouvert' ? 'Relais ouvert' : 'Relais fermé'}</span></div>
                <div className="t-actions-row">
                  <button className="btn-action btn-danger-outline" onClick={() => sendRelay('Ouverture')}>
                    <Power size={12} /> Délester
                  </button>
                  <button className="btn-action btn-success-outline" onClick={() => sendRelay('Fermeture')}>
                    <Sliders size={12} /> Rétablir
                  </button>
                </div>
              </div>

              <div className="scada-card">
                <div className="card-header"><span className="card-title">Liste des poteaux</span><span>{visiblePoles.length}</span></div>
                <div className="item-list compact-list">
                  {visiblePoles.map((pole) => {
                    const meta = mode === 'city' ? voltageStatusMeta(pole.mesure.tension) : statusMeta(pole.mesure.statut);
                    return (
                      <div
                        key={pole.id}
                        className={`list-row clickable ${pole.id === selectedPole.id ? 'selected-row' : ''}`}
                        onClick={() => {
                          setSelectedType('poteau');
                          setSelectedId(pole.id);
                        }}
                        style={{ borderLeft: `4px solid ${meta.color}` }}
                      >
                        <div className="left"><strong>{pole.nom}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pole.adresse}</div></div>
                        <div className="right">{fmt(pole.mesure.tension)} V</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      <footer>
        <span><Database size={12} /> BDD : <span className="val-green">OK</span></span>
        <span><RefreshCw size={12} /> Actualisation : <span className="val-primary">10s</span></span>
        <span className="align-right">SCADA v2.1 - {mode === 'demo' ? 'Soutenance' : 'Ville'}</span>
      </footer>
    </div>
  );
}
