#!/usr/bin/env node
// Ouvre une session de refactorisation : autorisée seulement quand la dernière exécution de la tâche est verte.
// Elle se referme à la prochaine exécution de tests. Chaque ouverture est journalisée.
// Usage : node tdd-phase.mjs refactor
import { fail } from './lib/common.mjs';
import { readCurrent, writeCurrent, readRuns, appendRun } from './lib/impl.mjs';

if (process.argv[2] !== 'refactor') fail('Usage : node tdd-phase.mjs refactor', 2);
const cur = readCurrent();
if (!cur) fail('Aucune tâche en cours.');
const last = readRuns(cur.task).filter(r => ['unit', 'acceptance', 'contract'].includes(r.suite)).pop();
if (!last) fail('Aucune exécution de tests enregistrée : pas de refactorisation sans tests.');
if (last.failed) fail('La dernière exécution est rouge : on ne refactorise que sur du vert. Fais d\'abord passer le test.');
cur.refactor = new Date().toISOString();
writeCurrent(cur);
appendRun({ task: cur.task, suite: 'refactor', at: cur.refactor });
console.log('Refactorisation ouverte : le code de production du périmètre est modifiable sans nouveau test, à comportement constant. Elle se ferme à la prochaine exécution de tests, qui doit rester verte.');
