#!/usr/bin/env node
// Portefeuille d'opportunités : liste les initiatives brd/*/state.yaml avec leur décision d'opportunité et leur phase.
// Usage : node list-opportunities.mjs [dossier racine, par défaut .]
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { arr, table, loadState, rootArg } from './lib/common.mjs';

const root = rootArg(process.argv[2], 'Usage : node list-opportunities.mjs [racine] — pour le dépôt courant : node list-opportunities.mjs .');
const dir = join(root, 'brd');
if (!existsSync(dir)) { console.log('Aucune initiative : le dossier brd/ n\'existe pas.'); process.exit(0); }
const rows = [];
for (const slug of readdirSync(dir)) {
  const p = join(dir, slug, 'state.yaml');
  if (!existsSync(p)) continue;
  const s = loadState(p);
  const o = s.opportunity ?? {};
  const filles = arr(o.split_into);
  const decision = `${o.decision ?? 'en_attente'}${filles.length ? ` → ${filles.join(', ')}` : ''}`;
  rows.push([s.initiative?.name || slug, arr(o.canvas?.problems)[0] ?? s.problem?.statement ?? '', o.canvas?.budget, decision, o.decided_by, s.phase, s.updated]);
}
const order = { en_attente: 0, a_apprendre: 1, aller_plus_loin: 2, reportee: 3, decoupee: 4, jeter: 5 };
rows.sort((a, b) => (order[String(a[3]).split(' ')[0]] ?? 9) - (order[String(b[3]).split(' ')[0]] ?? 9));
console.log(table(['Initiative', 'Problème', 'Budget', 'Décision', 'Décidé par', 'Phase', 'Mise à jour'], rows));
