// Utilitaires partagés par les scripts du BRD Builder.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, basename } from 'node:path';
import yaml from './vendor/js-yaml.mjs';

export const arr = v => (Array.isArray(v) ? v : []);
export const txt = v => (v === undefined || v === null || v === '' ? '—' : String(v));
export const cell = v => txt(v).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
export const byId = coll => new Map(arr(coll).map(x => [x.id, x]));
export const today = () => new Date().toISOString().slice(0, 10);

export function table(headers, rows) {
  if (rows.length === 0) return '_Aucun élément._\n';
  return [`| ${headers.join(' | ')} |`, `|${headers.map(() => '---').join('|')}|`, ...rows.map(r => `| ${r.map(cell).join(' | ')} |`)].join('\n') + '\n';
}
export const list = items => (items.length ? items.map(i => `- ${i}`).join('\n') + '\n' : '_Aucun élément._\n');

export function loadState(path) {
  try {
    return yaml.load(readFileSync(path, 'utf8')) ?? {};
  } catch (e) {
    fail(`Lecture de ${path} impossible : ${e.message}`);
  }
}

export function writeOut(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content.replace(/\n{3,}/g, '\n\n'));
}

export function fail(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

// Compare deux versions « majeur.mineur ».
export function cmpVersion(a, b) {
  const [a1, a2] = String(a).split('.').map(Number);
  const [b1, b2] = String(b).split('.').map(Number);
  return a1 - b1 || (a2 || 0) - (b2 || 0);
}

export const shLabel = (state, id) => {
  const s = arr(state.stakeholders).find(x => x.id === id);
  return s ? `${s.name || s.role} (${id})` : txt(id);
};

export const prLabel = p => ({ must: 'Must', should: 'Should', could: 'Could', wont: "Won't" }[p] ?? 'Non priorisée');
export const PRIORITY_ORDER = ['must', 'should', 'could', 'wont'];
export const validated = coll => arr(coll).filter(x => x.status === 'validé');

// ── Intégrité des handoffs ───────────────────────────────────────────────────
// Chaque handoff est écrit avec une empreinte SHA-256 (fichier voisin <nom>.sha256) et les empreintes
// de la version figée dont il est issu : son état (source_state) ET son document (source_doc).
// Sceller les deux est nécessaire : l'état est ce que lisent les scripts, le document est ce que
// relisent et approuvent les personnes. Un document altéré après le gel ne doit pas franchir le col.
// L'étape suivante vérifie le tout avant d'ingérer.

export const sha256 = data => createHash('sha256').update(data).digest('hex');
export const fileSha256 = path => sha256(readFileSync(path));

// Le document figé voisin d'un état figé : versions/v<x.y>/<doc>.md, seul .md du dossier hors CHANGELOG.
// Renvoie '' si le dossier n'est pas lisible ou ne contient pas exactement un document.
export function frozenDocOf(frozenStatePath) {
  try {
    const dir = dirname(frozenStatePath);
    const docs = readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'CHANGELOG.md');
    return docs.length === 1 ? join(dir, docs[0]) : '';
  } catch { return ''; }
}

// Écrit handoff.yaml et handoff.yaml.sha256. `sourceState` = chemin de la version figée (state.yaml).
export function writeHandoff(path, header, payload, sourceState) {
  const sourceDoc = sourceState ? frozenDocOf(sourceState) : '';
  const withIntegrity = { ...payload, integrity: {
    algorithm: 'sha256',
    source_state: sourceState ? fileSha256(sourceState) : '',
    source_doc: sourceDoc ? fileSha256(sourceDoc) : '',
  } };
  const content = `${header}\n${yaml.dump(withIntegrity, { lineWidth: 120 })}`;
  // Écriture brute : un fichier signé ne doit pas être retouché (writeOut normalise les lignes vides).
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  // L'empreinte porte sur le fichier tel qu'il est écrit (writeOut normalise les lignes vides).
  const digest = fileSha256(path);
  writeOut(`${path}.sha256`, `${digest}  ${path.split('/').pop()}\n`);
  return digest;
}

// Vérifie un handoff : empreinte du fichier, et empreinte de la version figée d'origine si elle est encore lisible.
export function verifyHandoff(path, frozenStatePath) {
  const problems = [];
  if (!existsSync(path)) return { ok: false, sha256: '', problems: [`fichier introuvable : ${path}`] };
  const actual = fileSha256(path);
  const side = `${path}.sha256`;
  if (!existsSync(side)) problems.push('empreinte absente (fichier .sha256 manquant) : handoff produit par une version antérieure des scripts, ou altéré');
  else if (readFileSync(side, 'utf8').trim().split(/\s+/)[0] !== actual) problems.push('le handoff a été modifié après sa génération (empreinte différente)');
  // Le caller qui fournit la version figée affirme que le handoff en est issu : l'absence d'empreinte
  // est un problème, pas une raison de sauter le contrôle. Sinon il suffisait de vider source_state.
  if (frozenStatePath && existsSync(frozenStatePath)) {
    const text = readFileSync(path, 'utf8');
    const empreinte = cle => (text.match(new RegExp(`${cle}:\\s*['"]?([0-9a-f]{64})`)) ?? [])[1] ?? '';
    const attenduEtat = empreinte('source_state');
    if (!attenduEtat) problems.push('le handoff ne porte pas l\'empreinte de sa version figée (source_state absent ou vide) : handoff produit par une version antérieure des scripts, ou vidé pour désarmer le contrôle — régénère-le avec build-handoff.mjs');
    else if (fileSha256(frozenStatePath) !== attenduEtat) problems.push('la version figée d\'origine a été modifiée depuis le handoff');
    const docPath = frozenDocOf(frozenStatePath);
    if (docPath) {
      const attenduDoc = empreinte('source_doc');
      if (!attenduDoc) problems.push(`le handoff ne scelle pas le document figé (${basename(docPath)}) : handoff produit par une version antérieure des scripts — régénère-le avec build-handoff.mjs`);
      else if (fileSha256(docPath) !== attenduDoc) problems.push(`le document figé d'origine (${basename(docPath)}) a été modifié depuis le handoff`);
    }
  }
  return { ok: problems.length === 0, sha256: actual, problems };
}

// Empreinte d'un état de plan hors approbations de backlog : enregistrer une approbation ne change pas cette empreinte,
// toute autre modification de l'état, si. Utilisée par plan-operations.mjs et vérifiée par backlog-executor.
export function planStateDigest(state) {
  const { governance = {}, ...rest } = state ?? {};
  const { backlog_approvals, ...gov } = governance;
  void backlog_approvals;
  return sha256(JSON.stringify({ ...rest, governance: gov }));
}

// Mention ajoutée en fin de chaque document généré (emprunt à hve-core : seul un humain atteste la relecture).
export function humanReviewFooter(kind = 'document') {
  return `\n---\n\n## Relecture humaine\n\n> Ce ${kind} a été produit avec l'assistance d'une IA, à partir de l'état de session et des sources citées. Il ne remplace ni les entretiens, ni l'observation, ni le jugement des personnes concernées. Il doit être relu par les personnes désignées ; seules les approbations déclarées et enregistrées dans l'état font foi, et aucune n'est déduite de la présence de ce document.\n`;
}

// Estimation grossière du nombre de tokens d'un texte (environ quatre caractères par token en moyenne).
// Sert à surveiller la taille d'un document confié à un agent, pas à facturer : c'est un ordre de grandeur.
export const approxTokens = text => Math.ceil(String(text ?? '').length / 4);
