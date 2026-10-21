#!/usr/bin/env node
// Découverte en LECTURE SEULE du tracker cible : types, champs requis, labels, jalons ou versions, issues existantes.
// Écrit exports/<cible>/snapshot.yaml, utilisé par plan-operations.mjs pour valider et dédoublonner.
// Ce script n'émet que des requêtes GET. Il ne lit que des jetons de LECTURE.
// Usage : node discover-tracker.mjs <plan/<slug>/state.yaml> --target github|jira
// Variables : GitHub : GITHUB_READ_TOKEN [GITHUB_API_URL] ; Jira : JIRA_BASE_URL, JIRA_READ_EMAIL, JIRA_READ_TOKEN.
import { dirname, join } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { arr, loadState, writeOut, fail, sha256, today } from './lib/common.mjs';

const args = process.argv.slice(2);
const statePath = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--target');
const target = args.includes('--target') ? args[args.indexOf('--target') + 1] : '';
if (!statePath || !['github', 'jira'].includes(target)) fail('Usage : node discover-tracker.mjs <state.yaml> --target github|jira', 2);
const s = loadState(statePath);
const root = dirname(statePath);
const settings = s.settings ?? {};

async function get(url, headers) {
  const res = await fetch(url, { method: 'GET', headers });
  if (!res.ok) throw new Error(`GET ${url.replace(/\?.*/, '')} → ${res.status} ${(await res.text()).slice(0, 200)}`);
  return { body: await res.json(), link: res.headers.get('link') ?? '' };
}

async function github() {
  const repo = settings.github?.repo, token = process.env.GITHUB_READ_TOKEN, api = process.env.GITHUB_API_URL ?? 'https://api.github.com';
  if (!repo) fail('settings.github.repo est vide (attendu : owner/repo).');
  if (!token) fail('GITHUB_READ_TOKEN n\'est pas défini. Utilise un jeton en lecture seule : la planification n\'écrit jamais.');
  const h = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'plan-builder' };
  const all = async (path, max = 10) => {
    const out = [];
    for (let page = 1; page <= max; page++) {
      const { body } = await get(`${api}${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`, h);
      out.push(...body);
      if (body.length < 100) break;
    }
    return out;
  };
  await get(`${api}/repos/${repo}`, h);
  const labels = (await all(`/repos/${repo}/labels`, 5)).map(l => l.name);
  const milestones = (await all(`/repos/${repo}/milestones?state=all`, 3)).map(m => ({ number: m.number, title: m.title, state: m.state }));
  const issues = (await all(`/repos/${repo}/issues?state=all`)).filter(i => !i.pull_request)
    .map(i => ({ number: i.number, title: i.title, state: i.state, labels: arr(i.labels).map(l => (typeof l === 'string' ? l : l.name)), milestone: i.milestone?.title ?? '', body_sha256: sha256(i.body ?? '') }));
  return { destination: repo, labels, milestones, issues };
}

async function jira() {
  const base = (process.env.JIRA_BASE_URL ?? '').replace(/\/$/, ''), email = process.env.JIRA_READ_EMAIL, token = process.env.JIRA_READ_TOKEN;
  const key = settings.jira?.project_key;
  if (!key) fail('settings.jira.project_key est vide.');
  if (!base || !email || !token) fail('JIRA_BASE_URL, JIRA_READ_EMAIL et JIRA_READ_TOKEN doivent être définis. Utilise un compte ou un jeton limité à la lecture.');
  const h = { Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`, Accept: 'application/json' };
  const { body: project } = await get(`${base}/rest/api/3/project/${encodeURIComponent(key)}`, h);
  const types = [];
  for (const t of arr(project.issueTypes)) {
    let required = [];
    try {
      const { body } = await get(`${base}/rest/api/3/issue/createmeta/${encodeURIComponent(key)}/issuetypes/${t.id}`, h);
      required = arr(body.fields ?? body.values).filter(f => f.required).map(f => f.fieldId ?? f.key);
    } catch (e) { required = ['?']; console.warn(`Avertissement : champs requis du type ${t.name} non lus (${e.message}).`); }
    types.push({ id: t.id, name: t.name, subtask: !!t.subtask, required });
  }
  const { body: versions } = await get(`${base}/rest/api/3/project/${encodeURIComponent(key)}/versions`, h);
  const issues = [];
  let next = '';
  for (let i = 0; i < 20; i++) {
    const q = new URLSearchParams({ jql: `project = "${key}" ORDER BY created ASC`, fields: 'summary,issuetype,parent,labels,description', maxResults: '100', ...(next ? { nextPageToken: next } : {}) });
    const { body } = await get(`${base}/rest/api/3/search/jql?${q}`, h);
    for (const it of arr(body.issues)) issues.push({ key: it.key, title: it.fields?.summary ?? '', type: it.fields?.issuetype?.name ?? '', parent: it.fields?.parent?.key ?? '', labels: arr(it.fields?.labels), body_sha256: sha256(JSON.stringify(it.fields?.description ?? null)) });
    next = body.nextPageToken ?? '';
    if (!next || body.isLast) break;
  }
  return { destination: `${base} / ${key}`, types, versions: arr(versions).map(v => v.name), issues };
}

const snap = { target, discovered: today(), ...(target === 'github' ? await github() : await jira()) };
writeOut(join(root, 'exports', target, 'snapshot.yaml'), `# Découverte en lecture seule du tracker — générée par discover-tracker.mjs.\n${yaml.dump(snap, { lineWidth: 120 })}`);
console.log(`Snapshot ${target} écrit : ${snap.destination} — ${snap.issues.length} issue(s) existante(s)${target === 'jira' ? `, ${snap.types.length} type(s), ${snap.versions.length} version(s)` : `, ${snap.labels.length} label(s), ${snap.milestones.length} jalon(s)`}.`);
