#!/usr/bin/env node
// Portefeuille d'opportunités : liste les initiatives brd/*/state.yaml avec leur décision d'opportunité et leur phase.
// Usage : node list-opportunities.mjs [dossier racine, par défaut .]
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { arr, table, loadState } from './lib/common.mjs';

const root = process.argv[2] ?? '.';
const dir = join(root, 'brd');
if (!existsSync(dir)) { console.log('Aucune initiative : le dossier brd/ n\'existe pas.'); process.exit(0); }
const rows = [];
for (const slug of readdirSync(dir)) {
  const p = join(dir, slug, 'state.yaml');
  if (!existsSync(p)) continue;
  const s = loadState(p);
  const o = s.opportunity ?? {};
  rows.push([s.initiative?.name || slug, arr(o.canvas?.problems)[0] ?? s.problem?.statement ?? '', o.canvas?.budget, o.decision ?? 'en_attente', o.decided_by, s.phase, s.updated]);
}
const order = { en_attente: 0, a_apprendre: 1, aller_plus_loin: 2, reportee: 3, jeter: 4 };
rows.sort((a, b) => (order[a[3]] ?? 9) - (order[b[3]] ?? 9));
console.log(table(['Initiative', 'Problème', 'Budget', 'Décision', 'Décidé par', 'Phase', 'Mise à jour'], rows));
