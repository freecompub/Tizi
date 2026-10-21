#!/usr/bin/env node
// Reprend, en LECTURE SEULE, les bugs ouverts saisis par les testeurs dans GitHub ou Jira, pour ne pas les ressaisir.
// Chacun entre au registre (.tizi/defauts/<initiative>.yaml) comme signalement à trier, avec sa référence d'origine ;
// un bug déjà repris n'est pas importé deux fois. Le tri reste à faire (defect.mjs --trier), avec le testeur.
//
// GitHub : node import-defects.mjs <initiative> --github [--label bug]           (gh, authentifié en lecture)
// Jira   : node import-defects.mjs <initiative> --jira <url> --projet <CLÉ>      (JIRA_READ_EMAIL, JIRA_READ_TOKEN)
// Sans réseau (tests) : --json <fichier> au format de la source choisie
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fail } from './lib/common.mjs';
import { loadDefects, saveDefects } from './defect.mjs';

const args = process.argv.slice(2);
const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : '');
const slug = args.find(a => !a.startsWith('--') && !['--label', '--jira', '--projet', '--json', '--racine'].includes(args[args.indexOf(a) - 1]));
const root = opt('--racine') || '.';
if (!slug || (!args.includes('--github') && !opt('--jira'))) fail('Usage : node import-defects.mjs <initiative> --github [--label bug] | --jira <url> --projet <CLÉ> [--json <fichier>]', 2);
const versionIn = (text, labels = []) => labels.map(l => String(l)).find(l => /^version[:/]/i.test(l))?.split(/[:/]/)[1] ?? (String(text ?? '').match(/\bversion\s*[:=]?\s*([0-9][\w.+-]*)/i) ?? [])[1] ?? 'inconnue';
let items = [];
if (args.includes('--github')) {
  const raw = opt('--json') ? readFileSync(opt('--json'), 'utf8') : (() => { const r = spawnSync('gh', ['issue', 'list', '--state', 'open', '--label', opt('--label') || 'bug', '--limit', '200', '--json', 'number,title,body,author,createdAt,url,labels'], { encoding: 'utf8' }); if (r.status !== 0) fail(`gh a échoué : ${(r.stderr || r.error?.message || '').trim()}`); return r.stdout; })();
  items = JSON.parse(raw).map(i => ({ source: `github#${i.number}`, url: i.url, title: i.title, observed: String(i.body ?? '').slice(0, 1500), by: i.author?.login ?? '', at: i.createdAt, version: versionIn(i.body, (i.labels ?? []).map(l => l.name)) }));
} else {
  let raw = opt('--json') ? readFileSync(opt('--json'), 'utf8') : null;
  if (!raw) {
    const { JIRA_READ_EMAIL: email, JIRA_READ_TOKEN: token } = process.env;
    if (!email || !token) fail('JIRA_READ_EMAIL et JIRA_READ_TOKEN sont nécessaires (jeton en lecture seule).');
    const jql = encodeURIComponent(`project = ${opt('--projet')} AND issuetype = Bug AND statusCategory != Done ORDER BY created ASC`);
    const res = await fetch(`${opt('--jira').replace(/\/$/, '')}/rest/api/3/search?jql=${jql}&maxResults=200&fields=summary,description,reporter,created,versions,labels`, { headers: { Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`, Accept: 'application/json' } });
    if (!res.ok) fail(`Jira a répondu ${res.status}.`);
    raw = await res.text();
  }
  const text = d => (typeof d === 'string' ? d : JSON.stringify(d ?? '').replace(/"type":"[a-zA-Z]+"|[{}[\]"]|,?"text":/g, ' ').replace(/\s+/g, ' ').trim());
  items = (JSON.parse(raw).issues ?? []).map(i => ({ source: `jira:${i.key}`, url: `${opt('--jira') || ''}/browse/${i.key}`, title: i.fields?.summary ?? i.key, observed: text(i.fields?.description).slice(0, 1500), by: i.fields?.reporter?.displayName ?? '', at: i.fields?.created ?? '', version: (i.fields?.versions ?? [])[0]?.name ?? versionIn(text(i.fields?.description), i.fields?.labels) }));
}
const list = loadDefects(root, slug);
const known = new Set(list.map(d => d.source).filter(Boolean));
let added = 0;
for (const it of items) {
  if (known.has(it.source)) continue;
  list.push({ id: `DEF-${String(list.length + 1).padStart(3, '0')}`, title: it.title, observed: it.observed, found_in: it.version, reported_by: it.by, reported_at: it.at || new Date().toISOString(),
    steps: [], environment: '', data: '', classification: '', status: 'à_trier', source: it.source, source_url: it.url });
  added += 1;
}
saveDefects(root, slug, list);
console.log(`${added} bug(s) repris comme signalements à trier, ${items.length - added} déjà présent(s). ${items.filter(i => i.version === 'inconnue').length} sans version identifiable : à préciser au tri.`);
