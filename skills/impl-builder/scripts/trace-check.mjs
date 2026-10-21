#!/usr/bin/env node
// Vérifie que chaque exemple (EX) et critère d'acceptation (AC) de la tâche en cours est référencé par au moins un test.
// Les identifiants sont cherchés dans les fichiers de tests (étiquettes @EX-004, noms de tests contenant AC-001…).
// Usage : node trace-check.mjs [--task TK-xxx]
import { readFileSync } from 'node:fs';
import { fail } from './lib/common.mjs';
import { loadConfig, readCurrent } from './lib/impl.mjs';
import { listFiles, idsIn } from './lib/testing.mjs';

export function traceCheck(expected, cfg, root = '.') {
  const found = new Map();
  for (const f of listFiles(root, cfg.paths?.tests ?? [])) for (const id of idsIn(readFileSync(f, 'utf8'))) found.set(id, [...(found.get(id) ?? []), f]);
  return { missing: expected.filter(id => !found.has(id)), found };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cur = readCurrent();
  if (!cur) fail('Aucune tâche en cours.');
  const { missing, found } = traceCheck(cur.expected_ids ?? [], loadConfig());
  for (const id of cur.expected_ids ?? []) console.log(`${found.has(id) ? '✓' : '✗'} ${id}${found.has(id) ? ` — ${found.get(id).join(', ')}` : ' — aucun test'}`);
  if (missing.length) { console.log(`Manquent : ${missing.join(', ')}.`); process.exitCode = 1; } else console.log('Traçabilité complète pour la tâche.');
}
