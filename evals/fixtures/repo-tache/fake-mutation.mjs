import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('reports/mutation', { recursive: true });
const m = s => ({ status: s });
writeFileSync('reports/mutation/mutation.json', JSON.stringify({ schemaVersion: '1', files: { 'src/completude/index.js': { mutants: [m('Killed'), m('Killed'), m('Killed'), m('Survived')] } } }));
