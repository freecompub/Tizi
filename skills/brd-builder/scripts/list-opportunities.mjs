#!/usr/bin/env node
// Portefeuille d'opportunités : liste les initiatives brd/*/state.yaml avec leur décision d'opportunité et leur phase.
// Usage : node list-opportunities.mjs [dossier racine, par défaut .]
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { arr, table, loadState, rootArg } from './lib/common.mjs';

const root = rootArg(process.argv[2], 'Usage : node list-opportunities.mjs [racine] — pour le dépôt courant : node list-opportunities.mjs .');
const dir = join(root, 'brd');
if (!existsSync(dir)) { console.log('Aucune initiative : le dossier brd/ n\'existe pas.'); process.exit(0); }
const etats = new Map();
for (const slug of readdirSync(dir)) {
  const p = join(dir, slug, 'state.yaml');
  if (existsSync(p)) etats.set(slug, loadState(p));
}
const rows = [];
for (const [slug, s] of etats) {
  const o = s.opportunity ?? {};
  const filles = arr(o.split_into);
  const decision = `${o.decision ?? 'en_attente'}${filles.length ? ` → ${filles.join(', ')}` : ''}`;
  // Une initiative née d'une autre n'est pas une idée neuve : sans sa provenance, le portefeuille les
  // confond, et un morceau délibérément différé d'un projet en cours se relit comme un début.
  const df = s.initiative?.derived_from ?? {};
  const venue = df.initiative ? `← ${df.initiative} (${df.reason ?? '?'}${df.decision ? `, ${df.decision}` : ''})` : '';
  rows.push([s.initiative?.name || slug, arr(o.canvas?.problems)[0] ?? s.problem?.statement ?? '', o.canvas?.budget, decision, venue, o.decided_by, s.phase, s.updated]);
}
const order = { en_attente: 0, a_apprendre: 1, aller_plus_loin: 2, reportee: 3, decoupee: 4, jeter: 5 };
rows.sort((a, b) => (order[String(a[3]).split(' ')[0]] ?? 9) - (order[String(b[3]).split(' ')[0]] ?? 9));
console.log(table(['Initiative', 'Problème', 'Budget', 'Décision', 'Venue de', 'Décidé par', 'Phase', 'Mise à jour'], rows));

// Les deux sens de la filiation doivent s'accorder : la mère nomme ses filles (`split_into`, S56), la
// fille nomme sa mère (`derived_from`, S86). Chaque dossier est vérifié chez lui ; l'ACCORD entre les
// deux ne se voit que d'ici, le seul script qui lit toutes les initiatives à la fois.
const ecarts = [];
for (const [slug, s] of etats) {
  const df = s.initiative?.derived_from ?? {};
  if (df.initiative && !etats.has(df.initiative)) ecarts.push(`${slug} : vient de « ${df.initiative} », qui n'est pas dans brd/`);
  else if (df.initiative && df.reason === 'decoupage' && !arr(etats.get(df.initiative).opportunity?.split_into).includes(slug)) {
    ecarts.push(`${slug} : se dit découpée de « ${df.initiative} », qui ne la nomme pas dans split_into`);
  }
  for (const fille of arr(s.opportunity?.split_into)) {
    if (!etats.has(fille)) ecarts.push(`${slug} : découpée en « ${fille} », qui n'est pas dans brd/`);
    else if (etats.get(fille).initiative?.derived_from?.initiative !== slug) ecarts.push(`${slug} : nomme « ${fille} » comme fille, qui ne la déclare pas dans derived_from`);
  }
  // « Rien ne disparaît en silence » devient vérifiable : le besoin poussé ailleurs doit s'y retrouver,
  // sous le même identifiant. En prose, la phrase tenait et le besoin pouvait n'arriver jamais.
  for (const n of arr(s.candidate_needs).filter(n => n.moved_to)) {
    const cible = etats.get(n.moved_to);
    if (!cible) ecarts.push(`${slug} : ${n.id} repris par « ${n.moved_to} », qui n'est pas dans brd/`);
    else if (!arr(cible.candidate_needs).some(x => x.id === n.id)) ecarts.push(`${slug} : ${n.id} déclaré repris par « ${n.moved_to} », qui ne le porte pas`);
  }
}
if (ecarts.length) console.log(`\nFiliations à recoudre :\n${ecarts.map(x => `  ⚠ ${x}`).join('\n')}`);
