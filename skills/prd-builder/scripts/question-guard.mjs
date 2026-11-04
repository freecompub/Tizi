#!/usr/bin/env node
// Hook de fin de tour : dit quand la MÊME question vient de partir pour la troisième fois.
// Fonctionne avec Claude Code, GitHub Copilot (CLI et agent cloud) et l'agent Copilot de VS Code (lib/agent-io.mjs).
// Entrée : JSON sur stdin. Sortie : code 0 TOUJOURS — ce garde-fou prévient, il ne bloque pas.
//
// Pourquoi un hook et pas une règle. `posee` dit ce qui est arrivé à une question, et `reach-out.mjs`
// refuse d'en faire repartir une au-delà du seuil — mais il ne tourne que pour un canal ÉCRIT. De vive
// voix l'agent pose la question en écrivant une phrase, aucun script n'est dans ce chemin, et c'est là
// que le défaut est né : sur le dossier réel, « les 150 dossiers, ça fait combien de familles ? » est
// repartie à 22:49:45, 22:50:58 et 22:51:20 — trois fois en 95 secondes — puis une quatrième à 22:51:53.
// La fin de tour est le seul moment où quelque chose peut lire ce que l'agent vient de dire.
//
// Mesure qui a fixé les réglages (19 transcriptions de dossiers réels, 415 phrases interrogatives) :
//   - recouvrement du plus court ≥ 0,75 et ≥ 4 mots porteurs communs, 3 tours distincts : 4 groupes
//     signalés, tous dans une seule session, tous vrais à la lecture, zéro fausse alerte sur les 18 autres ;
//   - une première version comparait par Jaccard ≥ 0,6 sans tailler la phrase : elle RATAIT le défaut
//     connu — « ma question tenait debout sans cette erreur : » diluait assez les mots pour casser le
//     groupe — et produisait la seule fausse alerte du lot ;
//   - au seuil de 2 tours : 16 groupes dans 7 sessions, dont la moitié sont des questions différentes au
//     vocabulaire commun, ou l'agent qui CITE une question posée plus tôt. Le seuil 3 est celui de Tizi ;
//   - n'exiger qu'une zone d'ombre ressemble à la question perdrait le défaut connu : la phrase courte de
//     l'agent ne partage que trois mots porteurs avec ZO-017. L'appariement NOMME la zone, il ne filtre pas.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { arr, passagesPosee, foisPosee, seuilRepetitions, dossierDe, PHASES } from './lib/common.mjs';
import { normalizeHookInput, copilotTranscript } from './lib/agent-io.mjs';
import { readTranscript, projectRoot } from './lib/sessions.mjs';
import yaml from './lib/vendor/js-yaml.mjs';

const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : ''; };

let input = {};
try { input = JSON.parse(args.includes('--transcription') ? '{}' : readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }
const h = normalizeHookInput(input);
const racine = projectRoot(opt('--racine') || h.cwd);

// ── Les mots qui portent le sens ────────────────────────────────────────────────────────────────────
// Les mots outils sont retirés avant toute comparaison : deux questions différentes partagent « le »,
// « de » et « combien » sans se ressembler. Les mots interrogatifs en font partie — « combien de
// dossiers déposés » et « combien de dossiers perdus » ne sont pas la même question, et c'est « déposés »
// contre « perdus » qui le dit.
const VIDES = new Set((`le la les un une des de du d a à au aux et ou est sont ce ces cet cette c qu que qui quoi quel quelle quels quelles
  il elle ils elles on je tu nous vous me te se mon ma mes ton ta tes son sa ses leur leurs notre nos votre vos
  y en ne pas plus moins dans sur sous pour par avec sans chez vers entre comme si alors donc mais or ni car
  etre être avoir ai as ont avez avons eu ete été fait faire fais font suis es sommes etes êtes ca cela
  peux peut peuvent pouvez dois doit dire dit veux veut voulez
  tout toute tous toutes meme même autre autres bien deja déjà encore aussi tres très trop peu beaucoup
  quand comment pourquoi ou où combien lequel laquelle est-ce`).split(/\s+/));
const porteurs = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[*_`>#[\]()«»"'’,;:.!?—–-]/g, ' ')
  .split(/\s+/).filter(w => w && w.length > 1 && !VIDES.has(w));

// Une reformulation AJOUTE des mots, elle n'en retire pas : on compare donc la part des mots du plus
// court qu'on retrouve dans l'autre, et non le recouvrement des deux ensembles. Le minimum de mots
// communs est ce qui empêche « combien de dossiers X » et « combien de dossiers Y » de se confondre.
const SEUIL_MOTS = 0.75;
const MOTS_COMMUNS = 4;
const recouvrement = (a, b) => {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return { part: 0, communs: 0 };
  let communs = 0;
  for (const x of A) if (B.has(x)) communs += 1;
  return { part: communs / Math.min(A.size, B.size), communs };
};
const memeQuestion = (a, b) => { const { part, communs } = recouvrement(a, b); return part >= SEUIL_MOTS && communs >= MOTS_COMMUNS; };

// La phrase utile : ce qui précède un « ? » depuis la fin de la phrase d'avant, sans l'étiquette
// d'interpellation (« **Dédé** — », « Dédé, ») ni le préambule qui précède un « : ». Sans cette taille,
// « **Dédé** — ma question tenait debout sans cette erreur : … » ne ressemblait plus à la même question.
function questionsDe(texte) {
  const out = [];
  for (const ligne of String(texte ?? '').split('\n')) {
    const l = ligne.trim();
    if (!l.includes('?')) continue;
    for (const bout of l.split('?').slice(0, -1)) {
      let q = bout.split(/(?<=[.!])\s+/).pop().trim();
      q = q.replace(/^\*{1,2}([^*]{1,40})\*{1,2}/, '$1').replace(/^\s*[A-ZÉÈÀÂÎÔÛ][\wéèàâîôûç'-]{1,20}\s*[,—–-]\s*/, '');
      const deuxPoints = q.lastIndexOf(':');
      if (deuxPoints >= 0 && q.slice(deuxPoints + 1).trim().length >= 10) q = q.slice(deuxPoints + 1).trim();
      if (q.length >= 10) out.push(`${q} ?`);
    }
  }
  return out;
}

// ── Le dossier avant la transcription ───────────────────────────────────────────────────────────────
// L'ordre compte, et il est mesuré : lire une transcription de 70 Mo coûte 1,1 s et 245 Mo, une de
// 4,6 Mo coûte 67 ms. Chercher d'abord s'il y a un dossier avec des questions ouvertes rend le hook
// gratuit dans un dépôt de code — où il n'aurait rien à dire, et où il a signalé, à l'essai, une phrase
// de doctrine citée trois fois qui n'était une question pour personne.
const etats = [];
for (const doc of Object.keys(PHASES)) {
  const dir = join(racine, dossierDe(doc));
  if (!existsSync(dir)) continue;
  let entrees = [];
  try { entrees = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
  for (const e of entrees) {
    if (!e.isDirectory()) continue;
    const p = join(dir, e.name, 'state.yaml');
    if (!existsSync(p)) continue;
    try { const s = yaml.load(readFileSync(p, 'utf8')) ?? {}; if (arr(s.shadow_zones).length) etats.push({ p, s }); } catch { /* un état illisible n'est pas l'affaire d'un hook */ }
  }
}
const ouvertes = etats.flatMap(({ s }) => arr(s.shadow_zones)
  .filter(z => z?.status === 'ouverte' && String(z.ask_to ?? '').trim())
  .map(z => ({ z, s })));
if (!ouvertes.length) process.exit(0);

const src = h.transcriptPath && existsSync(h.transcriptPath) ? h.transcriptPath
  : opt('--transcription') && existsSync(opt('--transcription')) ? opt('--transcription')
    : copilotTranscript(h.sessionId);
if (!src || !existsSync(src)) process.exit(0);

let tours = [];
try { tours = readTranscript(src); } catch { process.exit(0); }
const dits = tours.filter(t => t.role === 'assistant' && String(t.text ?? '').trim());
if (!dits.length) process.exit(0);

const phrases = [];
for (const [i, t] of dits.entries()) for (const q of questionsDe(t.text)) {
  const mots = porteurs(q);
  if (mots.length >= MOTS_COMMUNS) phrases.push({ tour: i + 1, at: t.at ?? '', q, mots });
}
// Groupage transitif : une phrase qui touche deux groupes les réunit, au lieu de rejoindre le premier
// venu. Sans ça, la reformulation du milieu restait seule et la répétition se comptait pour deux.
const groupes = [];
for (const ph of phrases) {
  const touches = groupes.filter(g => g.membres.some(m => memeQuestion(m.mots, ph.mots)));
  if (!touches.length) { groupes.push({ membres: [ph] }); continue; }
  const [tete, ...reste] = touches;
  tete.membres.push(ph);
  for (const g of reste) { tete.membres.push(...g.membres); groupes.splice(groupes.indexOf(g), 1); }
}

// On ne parle que de ce qui vient d'arriver. Un garde-fou qui redirait à chaque tour ce qu'il a dit au
// précédent devient un bruit de fond, et un bruit de fond se désactive : le groupe doit contenir le
// DERNIER message de l'agent. Il parle donc au tour où la répétition atteint le seuil, et à chaque
// départ reconnu ensuite — jamais entre les deux. Une reformulation très courte peut passer sous le
// plancher de quatre mots communs et lui échapper : sur le dossier réel, le quatrième départ était
// « 150 dossiers, combien de familles ? », trois mots porteurs, et il n'a pas été vu. Le garde-fou a
// parlé à la troisième, ce qui est son office ; il ne prétend pas voir toutes les suivantes.
const DERNIER = dits.length;
const signales = groupes
  .map(g => ({ ...g, tours: [...new Set(g.membres.map(m => m.tour))].sort((a, b) => a - b) }))
  .filter(g => g.tours.includes(DERNIER))
  .filter(g => g.tours.length >= Math.max(...etats.map(({ s }) => seuilRepetitions(s)), 3));
if (!signales.length) process.exit(0);

// La zone, quand elle se reconnaît. L'appariement ne filtre rien : il nomme, et il dit si l'état porte
// la trace de ce qui vient de partir. Une question courte peut ne ressembler à aucune zone et avoir
// quand même été posée trois fois — c'est le cas du défaut d'origine.
const apparie = g => {
  const mots = g.membres.reduce((best, m) => (m.mots.length > best.length ? m.mots : best), []);
  const candidats = ouvertes.map(({ z, s }) => ({ z, s, ...recouvrement(mots, porteurs(z.question)) }))
    .filter(c => c.part >= SEUIL_MOTS && c.communs >= MOTS_COMMUNS)
    .sort((a, b) => b.communs - a.communs || b.part - a.part);
  return candidats[0] ?? null;
};

const lignes = [];
for (const g of signales) {
  const a = apparie(g);
  const seuil = a ? seuilRepetitions(a.s) : 3;
  lignes.push(`[question-guard] ${a ? `${a.z.id} : la` : 'La'} même question vient de partir pour la ${g.tours.length}e fois.`);
  for (const m of g.membres.sort((x, y) => x.tour - y.tour)) {
    lignes.push(`    tour ${m.tour}${m.at ? ` · ${String(m.at).slice(11, 19)}` : ''} — ${m.q.slice(0, 120)}`);
  }
  if (a) {
    const n = passagesPosee(a.z).length, datés = foisPosee(a.z).length;
    lignes.push(n === 0
      ? `  Et \`posee\` de ${a.z.id} ne porte aucun passage : ce qui est parti ${g.tours.length} fois n'est écrit nulle part. Un passage par départ, avec sa date et son canal — y compris de vive voix.`
      : datés < g.tours.length
        ? `  \`posee\` de ${a.z.id} porte ${n} passage(s), dont ${datés} daté(s), pour ${g.tours.length} départs vus dans la conversation : la liste s'ajoute, elle ne se remplace pas.`
        : `  \`posee\` de ${a.z.id} porte ${n} passage(s) : la trace est à jour.`);
    if (g.tours.length >= seuil) {
      lignes.push(`  Au-delà de ${seuil} passages sans réponse, ce n'est plus une question, c'est un constat : à assumer`,
        `  (\`status: assumée\` avec sa raison, portée par un risque ou une hypothèse), ou à trancher avec l'utilisateur.`);
    }
  } else {
    lignes.push('  Aucune zone ouverte ne lui ressemble d\'assez près pour être nommée : si c\'en est une, elle manque',
      '  à la cartographie ; si la question est partie, elle manque à son `posee`.');
  }
  lignes.push('');
}
const texte = lignes.join('\n').trimEnd();

// Claude Code affiche `systemMessage` à l'utilisateur sans interrompre le tour ; les autres outils
// n'en font rien, et lisent la sortie d'erreur. Le code de sortie reste 0 : ce garde-fou prévient.
// Il dit ce qu'il a vu à la PERSONNE qu'on vient d'interroger trois fois, et c'est elle qui tranche.
if (args.includes('--texte')) console.log(texte);
else {
  process.stdout.write(`${JSON.stringify({ systemMessage: texte, suppressOutput: true })}\n`);
  process.stderr.write(`${texte}\n`);
}
process.exit(0);
