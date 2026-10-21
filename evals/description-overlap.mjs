#!/usr/bin/env node
// Contrôle statique : chevauchement du vocabulaire entre les descriptions des skills (indice de Jaccard sur les mots
// significatifs). Deux descriptions trop proches font hésiter le routeur de l'agent, qui ne lit que celles-ci.
// Usage : node evals/description-overlap.mjs [seuil=0.3] [--json]
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from '../skills/brd-builder/scripts/lib/vendor/js-yaml.mjs';

const SKILLS = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills');
const STOP = new Set('les des une un le la et ou à au aux du de d en pour par sur dans avec sans que qui quand dès son sa ses leur leurs ce cette ces est sont être fait faire utiliser utilisateur parle veut tout toute tous plus puis puis aussi skill étape sdlc tizi'.split(' '));
const words = t => new Set(t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]{4,}/g)?.filter(w => !STOP.has(w)) ?? []);
export function overlaps(threshold = 0.3) {
  const d = readdirSync(SKILLS).filter(s => existsSync(join(SKILLS, s, 'SKILL.md'))).map(s => ({ s, w: words(yaml.load(readFileSync(join(SKILLS, s, 'SKILL.md'), 'utf8').split(/^---$/m)[1]).description) }));
  const out = [];
  for (let i = 0; i < d.length; i++) for (let j = i + 1; j < d.length; j++) {
    const inter = [...d[i].w].filter(x => d[j].w.has(x));
    const jac = inter.length / new Set([...d[i].w, ...d[j].w]).size;
    out.push({ a: d[i].s, b: d[j].s, jaccard: Math.round(jac * 100) / 100, shared: inter.slice(0, 12), over: jac >= threshold });
  }
  return out.sort((x, y) => y.jaccard - x.jaccard);
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const th = Number(process.argv.find(a => /^\d/.test(a)) ?? 0.3);
  const r = overlaps(th);
  if (process.argv.includes('--json')) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }
  for (const x of r.slice(0, 8)) console.log(`${x.over ? '⚠' : ' '} ${x.jaccard.toFixed(2)}  ${x.a} ↔ ${x.b}  (${x.shared.join(', ')})`);
  if (r.some(x => x.over)) process.exitCode = 1;
}
