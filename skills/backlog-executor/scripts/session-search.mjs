#!/usr/bin/env node
// Cherche dans les transcriptions conservées, pour retrouver un détail sans recharger des sessions entières.
// Usage : node session-search.mjs "<mots>" [--initiative brd/<slug>] [--who user|assistant] [--max 10]
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readTranscript, loadIndex } from './lib/sessions.mjs';

const args = process.argv.slice(2);
const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : '');
const query = args.find(a => !a.startsWith('--') && !['--initiative', '--who', '--max'].includes(args[args.indexOf(a) - 1]));
if (!query) { console.error('Usage : node session-search.mjs "<mots>" [--initiative brd/<slug>] [--who user|assistant] [--max 10]'); process.exit(2); }
const words = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(Boolean);
const norm = t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const max = Number(opt('--max') || 10), who = opt('--who'), ini = opt('--initiative');
const hits = [];
for (const s of loadIndex().sessions.filter(s => !ini || (s.initiatives ?? []).includes(ini)).reverse()) {
  if (!existsSync(s.transcript)) continue;
  for (const t of readTranscript(s.transcript)) {
    if (who && t.role !== who) continue;
    const n = norm(t.text ?? '');
    if (!words.every(w => n.includes(w))) continue;
    const pos = n.indexOf(words[0]);
    const snippet = (t.text ?? '').slice(Math.max(0, pos - 200), pos + 300).replace(/\s+/g, ' ');
    hits.push(`[${s.session} · ${String(t.at).slice(0, 16).replace('T', ' ')} · ${t.role === 'user' ? 'utilisateur' : 'assistant'}] …${snippet}…`);
    if (hits.length >= max) break;
  }
  if (hits.length >= max) break;
}
console.log(hits.length ? hits.join('\n\n') : 'Aucun passage trouvé.');
