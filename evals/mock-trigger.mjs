#!/usr/bin/env node
// Routeur simulé pour valider run-triggers.mjs sans modèle : active le skill dont la description partage le plus de mots
// avec la requête, et recopie son marqueur. Naïf par construction ; il ne mesure rien des vrais agents.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const q = process.argv.slice(2).join(' ');
const words = t => new Set(t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]{5,}/g) ?? []);
const dir = existsSync('.claude/skills') ? '.claude/skills' : '.github/skills';
const qw = words(q);
let best = null, score = 0;
for (const s of readdirSync(dir)) {
  const text = readFileSync(join(dir, s, 'SKILL.md'), 'utf8');
  const desc = (text.match(/^description: (.*)$/m) ?? [])[1] ?? '';
  const n = [...words(desc)].filter(w => qw.has(w)).length;
  if (n > score) { score = n; best = s; }
}
if (best && score >= 2) console.log(`TIZI-SKILL-ACTIF ${best}\nRéponse simulée.`); else console.log('Réponse simulée, sans skill.');
