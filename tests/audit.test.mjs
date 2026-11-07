// L'audit d'un document écrit ailleurs. Aucun dossier d'exemple n'est versionné pour ça : l'entrée de
// l'audit est un document ÉTRANGER, et le dépôt n'en a pas. On en fabrique un à partir du dossier
// d'exemple du BRD, privé de tout ce que Tizi tient de sa propre fabrication — qui a parlé, qui a été
// entendu, qui tranche quoi, quelle porte a été franchie. Ce qui reste est la substance, et c'est
// exactement ce qu'un cahier des charges rendu en Word porte.
//
// Mesuré avant d'écrire le skill, et le chiffre a décidé de sa forme : privé de sa trace, le dossier
// rend **32 constats et 26 règles non mesurables**, là où le même dossier complet en avait 2. Un
// document écrit ailleurs ne récolte donc pas des accusations, il récolte des abstentions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from '../skills/brd-builder/scripts/lib/vendor/js-yaml.mjs';
import { ROOT, script, node, tempDir } from './helpers.mjs';
import { verdicts, STRUCT_RULES, LECTURES, checkState, abstentions } from '../skills/audit-builder/scripts/lib/rules.mjs';

// Ce que Tizi tient de sa propre fabrication, et qu'un document étranger ne porte jamais.
const TRACE = ['sources', 'stakeholders', 'decision_rights', 'phase_log', 'council_runs', 'session',
  'synthesis_check', 'governance', 'relance', 'connecteurs'];
const CHAMPS_DE_TRACE = ['sources', 'source', 'feedback', 'feedback_le', 'feedback_motif', 'confirms',
  'corrects', 'present', 'decided_by', 'ask_to', 'requested_by', 'sollicitee_le', 'sollicitee_zone',
  'contact_autorise', 'joignable_par', 'represents_source', 'understood'];

const lire = p => yaml.load(readFileSync(join(ROOT, p), 'utf8'));
function etranger(extra = {}) {
  const s = { ...lire('exemple/brd/demo/state.yaml') };
  for (const k of TRACE) delete s[k];
  const net = x => {
    if (Array.isArray(x)) return x.map(net);
    if (!x || typeof x !== 'object') return x;
    return Object.fromEntries(Object.entries(x).filter(([k]) => !CHAMPS_DE_TRACE.includes(k)).map(([k, v]) => [k, net(v)]));
  };
  for (const k of Object.keys(s)) if (!['document', 'phase'].includes(k)) s[k] = net(s[k]);
  return { ...s, ...extra };
}

// Un dossier d'audit sur le disque, pour les scripts.
function dossier(etat) {
  const dir = join(tempDir('audit'), 'audit', 'demo');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'state.yaml'), yaml.dump(etat));
  return dir;
}

test('verdicts : les quatre listes partitionnent le registre, toujours et sur les quatre documents', () => {
  const total = Object.keys(STRUCT_RULES).length;
  const cas = [
    ['brd/demo', lire('exemple/brd/demo/state.yaml'), {}],
    ['prd/demo', lire('exemple/prd/demo/state.yaml'), {}],
    ['sad/demo', lire('exemple/sad/demo/state.yaml'), {}],
    ['plan/demo', lire('exemple/plan/demo/state.yaml'), { refs: lire('exemple/plan/demo/refs.yaml') }],
    ['brd vide', { document: 'brd', phase: 'define' }, {}],
    ['document étranger', etranger(), {}],
  ];
  for (const [nom, etat, ctx] of cas) {
    const v = verdicts(etat, ctx);
    // Les règles de rédaction (`Lxx`) ne sont pas au registre de structure : elles ne comptent pas ici.
    const fausses = [...new Set(v.constats.map(f => f.rule))].filter(r => LECTURES[r]);
    const vues = [...fausses, ...v.muettes.map(f => f.rule), ...v.vrais, ...v.horsJeu];
    assert.equal(vues.length, total, `${nom} : ${vues.length} règles rendues pour un registre de ${total}`);
    assert.equal(new Set(vues).size, total, `${nom} : une règle est dans deux listes à la fois`);
  }
});

test('verdicts : « constaté vrai » est un constat, pas un silence', () => {
  // Une règle qui n'a rien eu à lire n'est PAS constatée vraie : c'est tout l'objet de la troisième
  // colonne, et c'est ce qu'un rapport d'audit ne pouvait pas dire avant le 7 novembre 2026.
  const vide = { document: 'brd', phase: 'define' };
  const v = verdicts(vide);
  const muettes = new Set(v.muettes.map(f => f.rule));
  for (const r of v.vrais) assert.ok(!muettes.has(r), `${r} ne peut pas être constatée vraie et non mesurable`);
  assert.ok(v.vrais.length < v.muettes.length,
    'sur un document entièrement vide, il doit y avoir plus de cases vides que de règles tenues');
  // Et une règle facultative dont la cible n'existe pas EST constatée vraie : pas de dérogation de
  // seuil, donc pas de dérogation muette. « Rien à reprocher » est exact.
  assert.ok(v.vrais.includes('S107'), 'aucun ancien nom de champ employé : c\'est un constat');
  // Une règle d'un autre document est hors jeu, et ne gonfle aucun dénominateur.
  assert.ok(v.horsJeu.includes('S37') && v.horsJeu.includes('S21'), 'les règles du plan et de la conception sont hors jeu sur un BRD');
});

test('un document écrit ailleurs récolte des abstentions, pas des accusations', () => {
  const plein = lire('exemple/brd/demo/state.yaml');
  const sansTrace = etranger();
  const regles = s => [...new Set(checkState(s).map(f => f.rule))].filter(r => LECTURES[r]);
  // Le compte des constats ne s'envole pas : la trace manquante ne devient pas un défaut.
  assert.equal(abstentions(plein).length, 2, 'le dossier complet n\'a presque rien de non mesurable');
  assert.equal(abstentions(sansTrace).length, 26, 'le même, écrit ailleurs : vingt-six cases vides');
  assert.ok(regles(sansTrace).length <= regles(plein).length,
    'privé de sa trace, le document ne doit pas récolter PLUS de règles en défaut qu\'avec elle');

  // La seule règle qui parle en plus, et c'est voulu : une exigence validée sans aucune source est une
  // hypothèse. C'est mot pour mot l'`assumption` du glossaire de Rubin, et un auditeur doit le dire.
  const nouvelles = regles(sansTrace).filter(r => !regles(plein).includes(r));
  assert.deepEqual(nouvelles, ['S64']);

  // Les quinze règles sur qui a parlé ne reprochent rien : elles disent ce qu'elles auraient lu.
  const muettes = abstentions(sansTrace);
  const surLesPersonnes = muettes.filter(f => f.lit.includes('stakeholders'));
  // Seize, et non quinze : `S126` lit aussi `connecteurs`, et le rapport la montre donc à part de la
  // ligne groupée des quinze autres. Le compte de l'une n'est pas la mise en page de l'autre.
  assert.equal(surLesPersonnes.length, 16);
  for (const f of surLesPersonnes) assert.match(f.message, /^non mesurée : /);
});

test('audit.mjs : le rapport dit les trois verdicts, et ce qu\'il n\'a pas pu établir', () => {
  const dir = dossier(etranger({
    audit: {
      title: 'Transmission des dossiers d\'accueil',
      source: 'BRD-accueil-v3.docx, remis le 2026-11-05',
      uncertain: [{ what: 'qui tranche le périmètre', why: 'le document nomme « le bureau » sans dire qui y décide', resolve: 'une question au bureau' }],
      ecarts: [{ pratique: 'revue par les parties prenantes', approche: 'relecture en plénière, sans trace écrite', question: 'comment savez-vous qui a validé quoi ?' }],
    },
  }));
  const r = node(script('audit-builder', 'audit.mjs'), [join(dir, 'state.yaml')]);
  assert.equal(r.code, 0, r.err);
  const md = readFileSync(join(dir, 'audit.md'), 'utf8');

  // Les trois colonnes, et la quatrième qui n'est pas un verdict.
  for (const titre of ['## Constaté faux', '## Non mesurable', '## Constaté vrai', '## Ce que l\'import n\'a pas pu établir']) {
    assert.ok(md.includes(titre), `le rapport n'a pas de section « ${titre} »`);
  }
  // La partition s'écrit dans le rapport : un audit qui perdrait une règle en silence ne se vérifie pas.
  const v = verdicts(etranger());
  const fausses = [...new Set(v.constats.map(f => f.rule))].filter(x => LECTURES[x]).length;
  assert.ok(md.includes(`${fausses} + ${v.vrais.length} + ${v.muettes.length} + ${v.horsJeu.length} = ${Object.keys(STRUCT_RULES).length}`),
    'le rapport ne montre pas que les quatre listes couvrent le catalogue');

  // L'avertissement est en TÊTE, pas en annexe : c'est la phrase qui empêche de lire le reste de
  // travers. La présence s'affirme AVANT la position : `indexOf` rend -1 sur une clause absente, et
  // -1 est inférieur à tout — la première version de ce test passait donc sur un rapport qui ne la
  // portait plus du tout. Éprouvé en la retirant.
  const clause = md.indexOf('on n\'audite jamais une approche contre une autre approche');
  assert.notEqual(clause, -1, 'le rapport ne porte plus la clause d\'approche');
  assert.ok(clause < md.indexOf('## Constaté faux'), 'la clause d\'approche doit précéder les constats');
  // Un écart d'approche est une question, et il n'est pas parmi les constats.
  const ecarts = md.slice(md.indexOf('## Écarts d\'approche'));
  assert.match(ecarts, /questions à lui poser, pas des reproches/);
  assert.ok(!md.slice(md.indexOf('## Constaté faux'), md.indexOf('## Non mesurable')).includes('relecture en plénière'));
  // Ce que l'import n'a pas pu établir est rendu avec ce qui le lèverait.
  assert.match(md, /qui tranche le périmètre .* une question au bureau/);
  // Les vingt-six cases vides tiennent en peu de lignes : groupées par lecture, pas règle par règle.
  const colonne = md.slice(md.indexOf('## Non mesurable'), md.indexOf('## Constaté vrai'));
  assert.ok(colonne.split('\n').filter(l => l.startsWith('| `')).length <= 6,
    'vingt-six règles non mesurées doivent se dire en quelques lignes, groupées par lecture');
  assert.match(colonne, /`S19`, `S83`/, 'les règles qui partagent une lecture vide se citent ensemble');
});

test('audit.mjs : une liste d\'incertitudes vide est signalée, pas tue', () => {
  const dir = dossier(etranger({ audit: { title: 'Sans incertitude', source: 'un document' } }));
  const r = node(script('audit-builder', 'audit.mjs'), [join(dir, 'state.yaml')]);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /Aucune incertitude déclarée à l'import/);
  assert.match(readFileSync(join(dir, 'audit.md'), 'utf8'), /c'est rare : vérifier que la liste est vide pour de bon/);
});

test('audit.mjs : un document hors catalogue se refuse, il ne se devine pas', () => {
  // Le choix du catalogue commande les règles qui s'appliquent : un backlog audité contre les règles du
  // BRD ne rendrait que du bruit. Le script refuse plutôt que de prendre le BRD par défaut, comme
  // `checkState` refuse un document qu'il ne sait pas vérifier (S00).
  const dir = dossier({ ...etranger(), document: 'cahier-des-charges' });
  const r = node(script('audit-builder', 'audit.mjs'), [join(dir, 'state.yaml')]);
  assert.equal(r.code, 2);
  assert.match(r.err, /se décide avec l'utilisateur/);
});

test('le skill d\'audit ne recopie aucune grille : ce sont les règles', () => {
  const src = readFileSync(join(ROOT, 'skills/audit-builder/scripts/audit.mjs'), 'utf8');
  // Le défaut que `les-documents-et-leur-generateur` a trouvé ailleurs : un rendu qui redit une règle
  // au lieu de la lire. Un seuil, un compte ou un libellé de règle écrit en dur ici dériverait.
  assert.doesNotMatch(src, /rule: 'S\d+'/, 'audit.mjs émet un constat de son cru');
  assert.ok(src.includes('verdicts(s, { refs })'), 'audit.mjs doit lire le tri de rules.mjs, pas le refaire');
  // Le nombre de règles ne s'écrit pas à la main : il se compte.
  assert.doesNotMatch(src, /131 règles/, 'le compte des règles est écrit en dur');
  assert.ok(src.includes('Object.keys(STRUCT_RULES).length'), 'le compte des règles doit venir du registre');

  // Et la référence porte l'armature, pas des grilles recopiées en prose.
  const ref = readFileSync(join(ROOT, 'skills/audit-builder/references/audit-protocol.md'), 'utf8');
  assert.match(ref, /on n'audite jamais une approche contre une autre approche/i);
  assert.match(ref, /Rien n'est déduit sans preuve/i);
  assert.match(ref, /Ne pas savoir n'est pas constater/i);
});
