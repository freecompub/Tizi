#!/usr/bin/env node
// Dérogation au garde-fou TDD : ouvre une fenêtre nommée, limitée dans le temps, pendant laquelle une
// écriture hors tâche Tizi est autorisée (chemin « hors Tizi », correctif d'urgence).
//
// Le garde-fou refuse par défaut toute écriture de code, de test ou de contrat hors d'une tâche. C'est
// voulu. Mais le choix du chemin autorise des changements qui ne passent pas par une tâche : sans issue
// nommée, le garde-fou interdit ce que la méthode permet. Une dérogation n'est jamais déduite : elle est
// demandée, motivée, attribuée à une personne, et elle expire.
//
// La trace vit dans .tizi/derogations.jsonl, versionné : une dérogation se relit après coup.
//
// Usage :
//   node derogation.mjs --par "<nom>" --raison "<raison>" [--minutes 60]   ouvre
//   node derogation.mjs --fermer --par "<nom>"                             ferme avant l'échéance
//   node derogation.mjs                                                    état courant
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const REGISTRE = '.tizi/derogations.jsonl';
const MINUTES_PAR_DEFAUT = 60;
const MINUTES_MAX = 480;

const args = process.argv.slice(2);
const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const fail = (m, c = 2) => { console.error(m); process.exit(c); };

// Dernier événement du registre, et dérogation active si cet événement est une ouverture non expirée.
export function derogationActive(root = '.', maintenant = new Date()) {
  const p = join(root, REGISTRE);
  if (!existsSync(p)) return null;
  const lignes = readFileSync(p, 'utf8').split('\n').filter(Boolean);
  for (let i = lignes.length - 1; i >= 0; i--) {
    let e;
    try { e = JSON.parse(lignes[i]); } catch { continue; }
    if (e.action === 'fermee') return null;
    if (e.action === 'ouverte') return new Date(e.expires_at) > maintenant ? e : null;
  }
  return null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--par'
    && args[args.indexOf(a) - 1] !== '--raison' && args[args.indexOf(a) - 1] !== '--minutes') ?? '.';
  const p = join(root, REGISTRE);
  const ecrire = e => {
    mkdirSync(dirname(p), { recursive: true });
    if (existsSync(p)) appendFileSync(p, `${JSON.stringify(e)}\n`);
    else writeFileSync(p, `${JSON.stringify(e)}\n`);
  };

  if (args.includes('--fermer')) {
    const par = opt('--par');
    if (!par) fail('Usage : node derogation.mjs --fermer --par "<nom>"');
    if (!derogationActive(root)) fail('Aucune dérogation active.', 1);
    ecrire({ action: 'fermee', at: new Date().toISOString(), closed_by: par });
    console.log(`Dérogation fermée par ${par}. Le garde-fou TDD s'applique de nouveau.`);
    process.exit(0);
  }

  if (!args.includes('--par') && !args.includes('--raison')) {
    const a = derogationActive(root);
    if (!a) { console.log('Aucune dérogation active : le garde-fou TDD s\'applique.'); process.exit(0); }
    const reste = Math.ceil((new Date(a.expires_at) - new Date()) / 60000);
    console.log(`Dérogation active, ouverte par ${a.approved_by} : « ${a.reason} » — expire dans ${reste} min (${a.expires_at}).`);
    process.exit(0);
  }

  const par = opt('--par'), raison = opt('--raison');
  if (!par || !raison) fail('Usage : node derogation.mjs --par "<nom>" --raison "<raison>" [--minutes 60]');
  const minutes = Number(opt('--minutes') ?? MINUTES_PAR_DEFAUT);
  if (!Number.isFinite(minutes) || minutes <= 0) fail('--minutes attend un nombre de minutes positif.');
  if (minutes > MINUTES_MAX) fail(`--minutes ne dépasse pas ${MINUTES_MAX} (8 h) : au-delà, c'est une tâche du plan, pas une dérogation.`);
  const deja = derogationActive(root);
  if (deja) fail(`Une dérogation est déjà active (ouverte par ${deja.approved_by}, expire le ${deja.expires_at}). Ferme-la avant d'en ouvrir une autre.`, 1);

  const ouverte = new Date();
  const e = {
    action: 'ouverte',
    at: ouverte.toISOString(),
    expires_at: new Date(ouverte.getTime() + minutes * 60000).toISOString(),
    approved_by: par,
    reason: raison,
  };
  ecrire(e);
  console.log(`Dérogation ouverte par ${par} pour ${minutes} min : « ${raison} ».`);
  console.log(`Le garde-fou TDD laisse passer les écritures hors tâche jusqu'au ${e.expires_at}.`);
  console.log(`Trace : ${REGISTRE} (versionné). Ferme-la dès que possible : node derogation.mjs --fermer --par "${par}".`);
}
