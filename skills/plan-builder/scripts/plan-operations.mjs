#!/usr/bin/env node
// Prépare le plan d'opérations à appliquer au tracker, SANS l'appliquer.
// Valide contre la découverte (snapshot.yaml), dédoublonne, applique les garde-fous de contenu, ordonne,
// puis écrit exports/<cible>/operations.yaml avec son empreinte SHA-256 et operations.md pour la relecture.
// L'application est le rôle exclusif du skill backlog-executor, après approbation de cette empreinte.
// Usage : node plan-operations.mjs <plan/<slug>/state.yaml> --target github|jira [--offline]
//   --offline : sans découverte ; toutes les opérations sont alors marquées « à relire ».
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import yaml from './lib/vendor/js-yaml.mjs';
import { arr, txt, table, loadState, writeOut, fail, today, fileSha256, sha256, writeHandoff, planStateDigest } from './lib/common.mjs';

const args = process.argv.slice(2);
const statePath = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--target');
const target = args.includes('--target') ? args[args.indexOf('--target') + 1] : '';
const offline = args.includes('--offline');
if (!statePath || !['github', 'jira'].includes(target)) fail('Usage : node plan-operations.mjs <state.yaml> --target github|jira [--offline]', 2);

const here = dirname(fileURLToPath(import.meta.url));
execFileSync(process.execPath, [join(here, 'render-plan.mjs'), statePath], { stdio: 'inherit' });

const s = loadState(statePath);
const root = dirname(statePath);
const settings = s.settings ?? {};
const refs = existsSync(join(root, 'refs.yaml')) ? loadState(join(root, 'refs.yaml')) : {};
const snapPath = join(root, 'exports', target, 'snapshot.yaml');
if (!offline && !existsSync(snapPath)) fail(`Découverte absente : lance d'abord discover-tracker.mjs --target ${target} (ou --offline, en connaissance de cause).`);
const snap = offline ? { issues: [], labels: [], milestones: [], types: [], versions: [] } : loadState(snapPath);
const syncPath = join(root, 'exports', 'sync-map.yaml');
const sync = existsSync(syncPath) ? (yaml.load(readFileSync(syncPath, 'utf8')) ?? {}) : {};
const mapped = sync[target] ?? {};

// ── Garde-fous de contenu ──────────────────────────────────────────────────────
// G1 secrets, G2 chemins locaux, G3 adresses électroniques, G4 références non résolues,
// G5 contenu non validé (exclu en amont : seuls les éléments validés sont exportés), G6 longueurs maximales.
const guardFindings = [];
const SECRET = /(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[abpr]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*\S{6,})/gi;
const LOCALPATH = /(?:\/Users\/|\/home\/|[A-Za-z]:\\Users\\)[^\s)`'"]+/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PLACEHOLDER = /<(?:US|TK|ACT|REL)-[^>]*>|\bTODO\b|\bTBD\b/g;
function guard(key, field, text, max) {
  let t = String(text ?? '').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n'), review = '';
  const hit = (g, re, label, replace = true) => {
    const m = t.match(re);
    if (m) { guardFindings.push({ guard: g, item: key, field, message: `${label} (${m.length})` }); if (replace) t = t.replace(re, '[masqué]'); }
  };
  hit('G1', SECRET, 'secret probable masqué');
  hit('G2', LOCALPATH, 'chemin local masqué');
  hit('G3', EMAIL, 'adresse électronique masquée');
  if (PLACEHOLDER.test(t)) { guardFindings.push({ guard: 'G4', item: key, field, message: 'référence non résolue ou marque TODO/TBD' }); review = 'contenu avec référence non résolue ou TODO'; }
  PLACEHOLDER.lastIndex = 0;
  if (max && t.length > max) { guardFindings.push({ guard: 'G6', item: key, field, message: `tronqué à ${max} caractères` }); t = `${t.slice(0, max - 60)}\n\n[… tronqué : voir la fiche dans le dépôt]`; review ||= 'contenu tronqué'; }
  return { text: t, review };
}

// ── Éléments à exporter ───────────────────────────────────────────────────────
const exportable = x => x && !['abandonné', 'proposé'].includes(x.status);
const stories = arr(s.stories).filter(exportable), tasks = arr(s.tasks).filter(exportable);
const fileBody = (dir, id) => { const f = join(root, dir, `${id}.md`); return existsSync(f) ? readFileSync(f, 'utf8') : ''; };
const relName = id => arr(refs.prd?.releases).find(r => r.id === id)?.name ?? id;
const releaseTitle = id => (id ? `${id}${relName(id) && relName(id) !== id ? ` ${relName(id)}` : ''}` : '');
const actOf = st => arr(refs.prd?.story_map).find(a => arr(a.tasks).some(t => t.id === st?.map_task));
const remoteOf = key => mapped[key];
const ref = key => (remoteOf(key) !== undefined ? (target === 'github' ? `#${remoteOf(key)}` : remoteOf(key)) : `{{ref:${key}}}`);
const plainRefs = text => text.replace(/\{\{ref:([^}]+)\}\}/g, '$1');

// ── Similarité avec l'existant ────────────────────────────────────────────────
// Comparaison de titres : sans accents ni mots vides, mots réduits à leurs 6 premières lettres (racine grossière,
// pour rapprocher « bloquer » et « bloquée », « transmission » et « transmettre »).
const STOP = new Set(['tant', 'que', 'qui', 'veux', 'veut', 'afin', 'pour', 'dans', 'avec', 'une', 'des', 'les', 'pas', 'sur', 'par', 'est', 'etre', 'son', 'ses', 'aux', 'mais', 'plus', 'the', 'and', 'for', 'with']);
const norm = t => String(t ?? '').toLowerCase().replace(/\[[A-Z]+-\d+\]/gi, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]+/g, ' ')
  .split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)).map(w => w.slice(0, 6));
// Score : le plus élevé entre l'indice de Jaccard et le recouvrement du titre le plus court (s'il a au moins 3 mots).
const jaccard = (a, b) => {
  const A = new Set(a), B = new Set(b); const inter = [...A].filter(x => B.has(x)).length;
  const jac = A.size + B.size ? inter / (A.size + B.size - inter) : 0;
  const small = Math.min(A.size, B.size);
  return Math.max(jac, small >= 3 ? inter / small : 0);
};
const remoteId = i => (target === 'github' ? i.number : i.key);
const mappedRemotes = new Set(Object.values(mapped).map(String));
function existingFor(key, title) {
  const tagged = arr(snap.issues).find(i => String(i.title).includes(`[${key}]`) && !mappedRemotes.has(String(remoteId(i))));
  if (tagged) return { kind: 'tag', issue: tagged };
  const best = arr(snap.issues).filter(i => !mappedRemotes.has(String(remoteId(i))))
    .map(i => ({ issue: i, score: jaccard(norm(title), norm(i.title)) })).sort((a, b) => b.score - a.score)[0];
  return best && best.score >= 0.7 ? { kind: 'similar', issue: best.issue, score: best.score } : null;
}

// ── Construction des opérations ───────────────────────────────────────────────
const ops = [];
const add = op => { const o = { id: `EXE-${String(ops.length + 1).padStart(3, '0')}`, needs_review: '', ...op }; ops.push(o); return o; };
const reviewOffline = offline ? 'non validé contre le tracker (--offline)' : '';
const TITLE_MAX = target === 'github' ? 256 : 255, BODY_MAX = target === 'github' ? 65000 : 32000;

function upsert(key, kind, title, body, fieldsFn, compare) {
  const tg = guard(key, 'titre', title, TITLE_MAX), bg = guard(key, 'corps', body, BODY_MAX);
  const review = [tg.review, bg.review, reviewOffline].filter(Boolean).join(' ; ');
  const remote = remoteOf(key);
  if (remote !== undefined) {
    const current = arr(snap.issues).find(i => String(remoteId(i)) === String(remote));
    if (!offline && !current) return add({ action: 'update', key, kind, remote, fields: fieldsFn(tg.text, bg.text, true), needs_review: `issue ${remote} introuvable dans la découverte` });
    const changes = offline ? ['inconnu'] : compare(current, tg.text, bg.text);
    if (!changes.length) return null;
    return add({ action: 'update', key, kind, remote, changes, fields: fieldsFn(tg.text, bg.text, true), needs_review: review });
  }
  const ex = offline ? null : existingFor(key, title);
  if (ex?.kind === 'tag') return add({ action: 'link', key, kind, remote: remoteId(ex.issue), needs_review: '', note: `issue existante portant déjà l'étiquette [${key}] : rattachement sans écriture` });
  return add({ action: 'create', key, kind, fields: fieldsFn(tg.text, bg.text, false),
    needs_review: [review, ex?.kind === 'similar' ? `ressemble à ${target === 'github' ? '#' : ''}${remoteId(ex.issue)} « ${ex.issue.title} » (similarité ${Math.round(ex.score * 100)} %) : doublon possible` : ''].filter(Boolean).join(' ; ') });
}

const sameSet = (a, b) => JSON.stringify([...arr(a)].sort()) === JSON.stringify([...arr(b)].sort());

if (target === 'github') {
  const labelsOf = (kind, x, st) => kind === 'story'
    ? ['story', `taille:${x.size ?? '?'}`, ...(actOf(x) ? [`activite:${actOf(x).id}`] : []), ...(x.skeleton ? ['walking-skeleton'] : [])]
    : [x.kind === 'spike' ? 'spike' : 'tache', `taille:${x.size ?? '?'}`, x.assignee_type ?? 'humain', ...(x.iteration ? [`iteration:${x.iteration}`] : []), ...(x.kind !== 'spike' && x.kind !== 'dev' ? [`type:${x.kind}`] : [])];
  const allLabels = new Set([...stories.map(x => labelsOf('story', x)), ...tasks.map(t => labelsOf('task', t))].flat());
  if (!offline) for (const l of allLabels) if (!arr(snap.labels).includes(l)) add({ action: 'create_label', key: l, fields: { name: l } });
  const milestoneRef = title => { if (!title) return null; const m = arr(snap.milestones).find(x => x.title === title); return m ? m.number : `{{milestone:${title}}}`; };
  const wanted = new Set([...stories.map(x => releaseTitle(x.release ?? settings.release)), ...tasks.map(t => releaseTitle(stories.find(x => x.id === t.story)?.release ?? settings.release))].filter(Boolean));
  for (const m of wanted) if (!arr(snap.milestones).some(x => x.title === m)) add({ action: 'create_milestone', key: m, fields: { title: m }, needs_review: reviewOffline });
  const compareGh = (cur, title, body, labels, ms) => [
    ...(cur.title !== title ? ['titre'] : []), ...(!sameSet(cur.labels, labels) ? ['labels'] : []),
    ...(cur.body_sha256 !== (body.includes('{{') ? '' : sha256(body)) ? ['corps'] : []), ...(String(cur.milestone ?? '') !== String(ms ?? '') ? ['jalon'] : []),
  ];
  const pendingStoryUpdates = [];
  for (const st of stories) {
    const subs = tasks.filter(t => t.story === st.id);
    const checklist = `\n\n## Tâches\n\n${subs.map(t => `- [${t.status === 'terminé' ? 'x' : ' '}] ${t.id} ${t.title ?? ''} (${ref(t.id)})`).join('\n') || '_Aucune._'}\n`;
    const finalBody = fileBody('stories', st.id) + checklist;
    const unresolved = /\{\{ref:/.test(finalBody);
    const labels = labelsOf('story', st), ms = releaseTitle(st.release ?? settings.release);
    upsert(st.id, 'story', `[${st.id}] ${st.title ?? ''}`, unresolved ? plainRefs(finalBody) : finalBody,
      (title, body) => ({ title, body, labels, milestone: milestoneRef(ms) }), (cur, title, body) => compareGh(cur, title, body, labels, ms));
    if (unresolved) pendingStoryUpdates.push([st, finalBody, labels, ms]);
  }
  for (const t of tasks) {
    const st = stories.find(x => x.id === t.story);
    const body = `${t.story ? `Fait partie de ${t.story} (${ref(t.story)}).\n\n` : ''}${fileBody('tasks', t.id)}`;
    const labels = labelsOf('task', t), ms = releaseTitle(st?.release ?? settings.release);
    upsert(t.id, t.kind === 'spike' ? 'spike' : 'task', `[${t.id}] ${t.title ?? ''}`, body,
      (title, b) => ({ title, body: b, labels, milestone: milestoneRef(ms) }), (cur, title, b) => compareGh(cur, title, b, labels, ms));
  }
  // Une fois les tâches créées, la story reçoit les numéros de ses tâches.
  for (const [st, body, labels, ms] of pendingStoryUpdates) {
    const g = guard(st.id, 'corps', body, BODY_MAX);
    add({ action: 'update', key: st.id, kind: 'story', remote: remoteOf(st.id) ?? `{{ref:${st.id}}}`, changes: ['corps (numéros des tâches)'], fields: { body: g.text, labels, milestone: milestoneRef(ms) }, needs_review: [g.review, reviewOffline].filter(Boolean).join(' ; ') });
  }
} else {
  const types = { epic: 'Epic', story: 'Story', subtask: 'Sub-task', task: 'Task', ...(settings.jira?.issue_types ?? {}) };
  const typeCheck = (name, mustBeSub) => {
    if (offline) return '';
    const t = arr(snap.types).find(x => x.name === name);
    if (!t) return `type « ${name} » absent du projet (régler settings.jira.issue_types)`;
    if (mustBeSub && !t.subtask) return `le type « ${name} » n'est pas un type de sous-tâche`;
    const unsupported = arr(t.required).filter(f => !['summary', 'issuetype', 'project', 'parent', 'reporter', 'description', 'labels'].includes(f));
    return unsupported.length ? `champs requis non fournis par le plan : ${unsupported.join(', ')}` : '';
  };
  const label = l => l.replace(/:/g, '-').replace(/\s+/g, '_');
  const useVersions = settings.jira?.use_fix_versions;
  const versionOk = v => offline || arr(snap.versions).includes(v);
  const adf = md => {
    const content = [];
    const parts = String(md).split(/```(\w*)\n([\s\S]*?)```/g);
    for (let i = 0; i < parts.length; i += 3) {
      for (const para of parts[i].split(/\n{2,}/).map(x => x.trim()).filter(Boolean)) content.push({ type: 'paragraph', content: [{ type: 'text', text: para }] });
      if (parts[i + 2] !== undefined) content.push({ type: 'codeBlock', attrs: { language: parts[i + 1] || 'text' }, content: [{ type: 'text', text: parts[i + 2].replace(/\n$/, '') }] });
    }
    return { type: 'doc', version: 1, content };
  };
  const fieldsFor = (type, parentKey, labels, version) => (title, body, isUpdate) => ({
    ...(isUpdate ? {} : { project: { key: settings.jira?.project_key }, issuetype: { name: type } }),
    summary: title, description: adf(body), labels: labels.map(label),
    ...(parentKey ? { parent: { key: ref(parentKey) } } : {}),
    ...(useVersions && version && versionOk(version) ? { fixVersions: [{ name: version }] } : {}),
  });
  const compareJira = (labels) => (cur, title, body) => [
    ...(cur.title !== title ? ['résumé'] : []), ...(!sameSet(cur.labels, labels.map(label)) ? ['labels'] : []),
    ...(cur.body_sha256 !== sha256(JSON.stringify(adf(body))) ? ['description'] : []),
  ];
  const epicFrom = settings.jira?.epic_from ?? 'activity';
  const epics = new Map();
  for (const st of stories) {
    const k = epicFrom === 'release' ? (st.release ?? settings.release) : actOf(st)?.id;
    if (k && !epics.has(k)) epics.set(k, epicFrom === 'release' ? relName(k) : actOf(st)?.name);
  }
  for (const [k, name] of epics) {
    const op = upsert(k, 'epic', `[${k}] ${name ?? ''}`, `Epic générée depuis le plan (${k}).`, fieldsFor(types.epic, '', ['plan-epic']), compareJira(['plan-epic']));
    if (op) op.needs_review = [op.needs_review, typeCheck(types.epic)].filter(Boolean).join(' ; ');
  }
  for (const st of stories) {
    const parent = epicFrom === 'release' ? (st.release ?? settings.release) : actOf(st)?.id;
    const labels = ['story', `taille:${st.size ?? '?'}`, ...(st.skeleton ? ['walking-skeleton'] : [])];
    const version = relName(st.release ?? settings.release);
    if (useVersions && version && !versionOk(version)) guardFindings.push({ guard: 'V', item: st.id, field: 'fixVersions', message: `version « ${version} » absente du projet : non envoyée` });
    const op = upsert(st.id, 'story', `[${st.id}] ${st.title ?? ''}`, fileBody('stories', st.id), fieldsFor(types.story, parent, labels, version), compareJira(labels));
    if (op) op.needs_review = [op.needs_review, typeCheck(types.story)].filter(Boolean).join(' ; ');
  }
  for (const t of tasks) {
    const spike = t.kind === 'spike';
    const labels = [spike ? 'spike' : 'tache', `taille:${t.size ?? '?'}`, t.assignee_type ?? 'humain', ...(t.iteration ? [`iteration:${t.iteration}`] : [])];
    const type = spike || !t.story ? types.task : types.subtask;
    const op = upsert(t.id, spike ? 'spike' : 'task', `[${t.id}] ${t.title ?? ''}`, fileBody('tasks', t.id), fieldsFor(type, spike ? '' : t.story, labels, ''), compareJira(labels));
    if (op) op.needs_review = [op.needs_review, typeCheck(type, !spike && !!t.story)].filter(Boolean).join(' ; ');
  }
}

// ── Écriture ───────────────────────────────────────────────────────────────────
const payload = {
  kind: 'backlog-operations',
  target,
  destination: target === 'github' ? settings.github?.repo ?? '' : `${settings.jira?.project_key ?? ''}`,
  plan: { slug: s.initiative?.slug ?? '', version: String(s.governance?.version ?? ''), status: s.governance?.status ?? '', state_sha256: planStateDigest(s) },
  snapshot: offline ? { offline: true } : { discovered: snap.discovered ?? '', sha256: fileSha256(snapPath) },
  sync_map_sha256: existsSync(syncPath) ? fileSha256(syncPath) : '',
  generated: today(),
  guards: guardFindings,
  counts: Object.fromEntries(['create', 'update', 'link', 'create_label', 'create_milestone'].map(a => [a, ops.filter(o => o.action === a).length])),
  needs_review: ops.filter(o => o.needs_review).map(o => o.id),
  operations: ops,
};
const opsPath = join(root, 'exports', target, 'operations.yaml');
const opsSha = writeHandoff(opsPath, `# Plan d'opérations ${target} — généré par plan-operations.mjs. Ne pas modifier : toute modification invalide l'empreinte et l'approbation.`, payload, null);

const md = [`# Plan d'opérations ${target} — ${txt(payload.destination)}`, '', `Généré le ${today()} à partir du plan v${txt(payload.plan.version)}. **Rien n'a été écrit dans le tracker.**`, ''];
md.push(`Empreinte SHA-256 à approuver : \`${opsSha}\``, '');
md.push(table(['Action', 'Nombre'], Object.entries(payload.counts).filter(([, n]) => n)));
md.push('## Opérations', '', table(['ID', 'Action', 'Élément', 'Existant', 'Changements', 'À relire'],
  ops.map(o => [o.id, o.action, o.key, o.remote ?? '—', arr(o.changes).join(', ') || '—', o.needs_review || '—'])));
if (guardFindings.length) md.push('## Garde-fous déclenchés', '', table(['Garde-fou', 'Élément', 'Champ', 'Constat'], guardFindings.map(g => [g.guard, g.item, g.field, g.message])));
md.push('## Approuver', '', `L'approbation se déclare à l'agent, qui l'enregistre dans \`governance.backlog_approvals\` avec cette empreinte, le niveau d'autonomie, et la liste des opérations « à relire » explicitement acceptées. Toute modification du plan ou de l'état après approbation exige un nouveau plan d'opérations.`, '');
writeOut(join(root, 'exports', target, 'operations.md'), md.join('\n'));
console.log(`Plan d'opérations ${target} : ${ops.length} opération(s), dont ${payload.needs_review.length} à relire ; ${guardFindings.length} garde-fou(s) déclenché(s).`);
console.log(`Empreinte à approuver : ${opsSha}`);
