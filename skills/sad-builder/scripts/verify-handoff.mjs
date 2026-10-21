#!/usr/bin/env node
// Vérifie l'intégrité d'un handoff avant de l'ingérer, et affiche son empreinte à reporter dans l'état de l'étape suivante.
// Usage : node verify-handoff.mjs <chemin/handoff/v<x.y>/handoff.yaml>
// Code de sortie 1 si le handoff a été altéré : ne pas l'ingérer.
import { dirname, join, resolve } from 'node:path';
import { verifyHandoff, fail } from './lib/common.mjs';

const path = process.argv[2];
if (!path) fail('Usage : node verify-handoff.mjs <handoff.yaml>', 2);
// handoff/v<x.y>/handoff.yaml → versions/v<x.y>/state.yaml
const vdir = dirname(resolve(path));
const frozen = join(dirname(dirname(vdir)), 'versions', vdir.split('/').pop(), 'state.yaml');
const r = verifyHandoff(path, frozen);
if (r.ok) {
  console.log(`Handoff intègre. Empreinte à reporter dans l'état (sha256) : ${r.sha256}`);
} else {
  console.error(`Handoff NON intègre :\n${r.problems.map(p => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
