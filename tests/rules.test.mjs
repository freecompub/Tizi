// Règles du catalogue commun, sur des états minimaux construits pour chaque cas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DOCUMENTS, STRUCT_RULES, TEXT_RULES, checkState, coverage, coverageFindings, coverageRows, evidenceOf, contextFindings } from '../skills/brd-builder/scripts/lib/rules.mjs';
import { gateConditions } from '../skills/brd-builder/scripts/lib/gates.mjs';
import { shellWrittenPaths } from '../skills/brd-builder/scripts/lib/agent-io.mjs';
import { buildExtract } from '../skills/brd-builder/scripts/lib/sessions.mjs';
const codes = s => checkState(s).map(f => f.rule);
const brd = extra => ({ document: 'brd', phase: 'discover', stakeholders: [{ id: 'SH-1', status: 'interrogée' }],
  sources: [{ id: 'SRC-1', type: 'entretien', stakeholders: ['SH-1'] }, { id: 'SRC-2', type: 'observation', stakeholders: ['SH-1'] }],
  candidate_needs: [{ id: 'BC-1', sources: [{ ref: 'SRC-1' }] }], ...extra });

test('classe de preuve : observé, rapporté, supposé', () => {
  const s = brd({});
  assert.equal(evidenceOf(s, ['SRC-2']).class, 'observé');
  assert.equal(evidenceOf(s, ['SRC-1']).class, 'rapporté');
  assert.equal(evidenceOf(s, []).class, 'supposé');
});
test('S63 : exigence validée à source unique', () => {
  assert.ok(codes(brd({ business_requirements: [{ id: 'BR-1', statement: 'x', status: 'validé', from_needs: ['BC-1'], objectives: ['OBJ-1'] }] })).includes('S63'));
});
test('S68 : espace réservé resté dans un élément', () => {
  assert.ok(codes(brd({ business_rules: [{ id: 'RG-1', statement: 'Délai TODO', sources: ['SRC-1'] }] })).includes('S68'));
  assert.ok(!codes(brd({ business_rules: [{ id: 'RG-1', statement: 'Délai de cinq jours', sources: ['SRC-1'] }] })).includes('S68'));
});
test('S69 : chiffre sans source, mais pas avec une source', () => {
  assert.ok(codes(brd({ business_rules: [{ id: 'RG-1', statement: 'Relance après 5 jours' }] })).includes('S69'));
  assert.ok(!codes(brd({ business_rules: [{ id: 'RG-1', statement: 'Relance après 5 jours', sources: ['SRC-1'] }] })).includes('S69'));
});
// Le type `cadrage` nommait enfin la source la plus fréquente : l'échange qui ouvre l'initiative. Elle
// est déclarative, donc `rapporté`, et quelqu'un y a parlé — donc S81 s'y applique.
test('source de cadrage : déclarative, et quelqu\'un y a parlé', () => {
  const base = { document: 'brd', phase: 'discover', stakeholders: [{ id: 'SH-1', status: 'interrogée' }] };
  const s = { ...base, sources: [{ id: 'SRC-1', type: 'cadrage', stakeholders: ['SH-1'] }] };
  assert.equal(evidenceOf(s, ['SRC-1']).class, 'rapporté', 'un échange de cadrage n\'est pas une observation');
  assert.ok(!checkState(s).some(f => f.rule === 'S81'), 'la personne qui a parlé est nommée et entendue');
  const muet = { ...s, stakeholders: [{ id: 'SH-1', status: 'à interroger' }] };
  assert.ok(checkState(muet).some(f => f.rule === 'S81'), 'cadrage attribué à qui n\'a pas été entendu');
});

// Premier dossier réel : la source unique de tout le cadrage était attribuée au directeur, que le même
// fichier déclarait « à interroger ». Du rapporté présenté comme recueilli, et lint ne disait rien.
test('S81 : source attribuée à une partie prenante jamais entendue, ou à personne', () => {
  const avec = sources => codes(brd({ sources }));
  assert.ok(avec([{ id: 'SRC-1', type: 'autre', stakeholders: ['SH-1'] }]).includes('S81') === false, 'une partie prenante interrogée ne déclenche rien');
  assert.ok(avec([{ id: 'SRC-1', type: 'autre' }]).includes('S81'), 'source sans partie prenante : qui a parlé ?');
  const muette = { document: 'brd', phase: 'discover', stakeholders: [{ id: 'SH-1', status: 'à interroger' }], sources: [{ id: 'SRC-1', type: 'autre', stakeholders: ['SH-1'] }] };
  assert.ok(checkState(muette).some(f => f.rule === 'S81' && /à interroger/.test(f.message)), 'source attribuée à qui n\'a pas été entendu');
  // Un document se lit sans entretien : personne n'a besoin d'avoir parlé.
  assert.ok(!checkState({ ...muette, sources: [{ id: 'SRC-1', type: 'document', stakeholders: ['SH-1'] }] }).some(f => f.rule === 'S81'));
  // Une seule partie prenante entendue parmi plusieurs suffit : la source a une bouche.
  assert.ok(!checkState({ ...muette, stakeholders: [{ id: 'SH-1', status: 'à interroger' }, { id: 'SH-2', status: 'interrogée' }], sources: [{ id: 'SRC-1', type: 'atelier', stakeholders: ['SH-1', 'SH-2'] }] }).some(f => f.rule === 'S81'));
});
// Même dossier : la décision d'opportunité était enregistrée au nom pris dans la configuration Git.
test('S56 : décideur d\'opportunité absent des parties prenantes', () => {
  const opp = (decided_by, stakeholders) => checkState({ document: 'brd', phase: 'discover', stakeholders, opportunity: { decision: 'aller_plus_loin', decided_by } }).filter(f => f.rule === 'S56').map(f => f.message);
  const shs = [{ id: 'SH-1', name: 'Alice', status: 'interrogée' }];
  assert.ok(opp('ClaudeVPS', shs).some(m => /absent des parties prenantes/.test(m)));
  assert.deepEqual(opp('SH-1', shs).filter(m => /absent/.test(m)), [], 'par identifiant');
  assert.deepEqual(opp('Alice', shs).filter(m => /absent/.test(m)), [], 'par nom');
  assert.deepEqual(opp('ClaudeVPS', []).filter(m => /absent/.test(m)), [], 'rien à vérifier sans carte des parties prenantes');
});
test('S65 : passage en Define sans porte de synthèse', () => {
  assert.ok(codes(brd({ phase: 'define' })).includes('S65'));
});
test('S67 : un seul concept n\'est pas une exploration', () => {
  assert.ok(codes({ document: 'prd', phase: 'frame', concepts: [{ id: 'CPT-1', decision: 'retenu' }] }).includes('S67'));
});
test('L07 : écran, bouton ou produit dans une exigence fonctionnelle', () => {
  const prd = statement => checkState({ document: 'prd', functional_requirements: [{ id: 'FR-1', statement, status: 'proposé' }] }).map(f => f.rule);
  assert.ok(prd("L'écran affiche un bouton Bloquer.").includes('L07'));
  assert.ok(prd('Le système doit enregistrer dans PostgreSQL.').includes('L07'));
  assert.ok(!prd('Quand un dossier est incomplet, le système doit refuser sa transmission.').includes('L07'));
});

// Deuxième dossier réel : les cinq objectifs portaient leur cible, décidée par le bureau le jour même,
// et les quatre métriques gardaient `target: ""` avec « à fixer par le directeur » et `goal: ""` avec
// « rattaché dès que les objectifs seront écrits ». Le PRD livré annonçait « → 0 demande perdue » au § 2
// et « → — » au § 8 pour la même MET-01, et la vérification disait « aucun avertissement » : aucune
// règle ne lisait `metrics`.
// Le deuxième dossier réel : neuf sources du PRD portant « le directeur de l'association (propos
// relayés en direct par un membre du bureau) » dans un champ `who` libre que rien ne lisait, et le
// document les présentait comme recueillies. S81 existait, mais dans `checkBrd` seul, parce que le PRD
// n'avait pas de registre de parties prenantes. Il en a un, et la règle vaut pour les deux documents.
test('S81 vaut aussi pour le PRD : une source dit qui a parlé', () => {
  const prd = extra => ({ document: 'prd', phase: 'frame', ...extra });
  const src = x => ({ id: 'SRC-001', type: 'entretien', date: '2026-10-26', ...x });

  const muette = checkState(prd({ sources: [src({ stakeholders: [] })] }));
  assert.ok(muette.some(f => f.rule === 'S81' && /qui a parlé/.test(f.message)), 'source sans personne entendue');

  // Le cas exact du dossier : la source est attribuée à celui dont on rapporte les propos.
  const rapportee = checkState(prd({
    stakeholders: [{ id: 'SH-01', name: 'le directeur', role: 'directeur', status: 'à interroger' }],
    sources: [src({ stakeholders: ['SH-01'] })],
  }));
  assert.ok(rapportee.some(f => f.rule === 'S81' && /rapporté par un tiers/.test(f.message)),
    'source au nom de quelqu\'un que l\'état déclare « à interroger »');

  const recueillie = codes(prd({
    stakeholders: [{ id: 'SH-02', name: 'un membre du bureau', role: 'membre du bureau', represents: 'le directeur', status: 'interrogée' }],
    sources: [src({ stakeholders: ['SH-02'] })],
  }));
  assert.ok(!recueillie.includes('S81'), 'source au nom de celui qui a parlé');

  // Un document, un ticket : personne n'a parlé, et la règle ne s'applique pas.
  assert.ok(!codes(prd({ sources: [src({ type: 'document', stakeholders: [] })] })).includes('S81'));
  // Et une partie prenante citée mais absente du registre reste une référence morte.
  assert.ok(codes(prd({ sources: [src({ stakeholders: ['SH-09'] })] })).includes('S09'), 'référence morte vers SH-09');
});

// `phase-specify.md` dit « choisis le motif et renseigne `pattern` », et rien ne le vérifiait : ni que
// la valeur est l'un des cinq, ni qu'elle s'accorde avec l'énoncé. Trouvé par le garde-fou des ordres
// sans lecteur. La règle cherche la trace de la forme déclarée, pas le style — exiger le « alors » du
// tableau EARS signalait une phrase correcte de l'exemple, et un constat qui tombe sur du juste abîme
// le catalogue.
test('S85 : le motif EARS déclaré se retrouve dans l\'énoncé', () => {
  const fr = x => checkState({ document: 'prd', phase: 'specify', functional_requirements: [{ id: 'FR-001', ...x }] });
  const c = x => fr(x).filter(f => f.rule === 'S85').map(f => f.message);

  assert.match(c({ statement: 'Le système doit lister les dossiers' })[0] ?? '', /sans motif EARS/, 'motif absent');
  assert.match(c({ pattern: 'reaction', statement: 'Le système doit lister' })[0] ?? '', /inconnu/, 'motif hors des cinq');
  assert.match(c({ pattern: 'event', statement: 'Le système doit lister les dossiers' })[0] ?? '', /ne porte pas « Quand »/, 'event sans son marqueur');
  assert.match(c({ pattern: 'state', statement: 'Quand l\'agent ouvre un dossier, le système doit…' })[0] ?? '', /ne porte pas « Tant que »/, 'motif et énoncé désaccordés');
  assert.match(c({ pattern: 'ubiquitous', statement: 'Si le dossier est incomplet, le système doit refuser' })[0] ?? '', /un invariant n'a pas de condition/, 'invariant conditionnel');

  for (const x of [
    { pattern: 'event', statement: 'Quand un agent dépose une pièce, le système doit l\'horodater' },
    { pattern: 'state', statement: 'Tant que le dossier est en brouillon, le système doit permettre sa modification' },
    { pattern: 'unwanted', statement: 'Si un agent transmet un dossier sans justificatif, le système doit refuser la transmission' },
    { pattern: 'optional', statement: 'Là où la signature électronique est activée, le système doit proposer la signature' },
    { pattern: 'ubiquitous', statement: 'Le système doit conserver chaque dossier dix ans' },
  ]) assert.deepEqual(c(x), [], `${x.pattern} conforme : ${x.statement}`);

  // Les motifs se combinent (`ears.md`) : un énoncé qui porte deux formes satisfait celle qu'il déclare.
  assert.deepEqual(c({ pattern: 'state', statement: 'Tant que le dossier est en brouillon, quand l\'agent ajoute une pièce, le système doit la lier' }), []);
  // Une exigence abandonnée ne se contrôle plus.
  assert.deepEqual(fr({ status: 'abandonné', statement: 'Le système doit…' }).filter(f => f.rule === 'S85'), []);
});

// Deux champs que `phase-discover.md` et `elicitation-patterns.md` ordonnent de remplir, et que rien ne
// lisait — trouvés par le garde-fou des ordres sans lecteur, dans `skills.test.mjs`.
test('S83 : des besoins recueillis sans qu\'aucun utilisateur direct ait parlé', () => {
  const sh = (id, x) => ({ id, name: id, role: 'r', status: 'interrogée', ...x });
  const brd = (shs, srcs) => ({ document: 'brd', phase: 'discover', stakeholders: shs, sources: srcs,
    candidate_needs: [{ id: 'BC-001', statement: 'pouvoir suivre un dossier' }] });
  const vu = (id, type) => ({ id: 'SRC-001', type, stakeholders: [id] });

  const relais = checkState(brd([sh('SH-01', { represents: 'les agents' })], [vu('SH-01', 'entretien')]));
  assert.ok(relais.some(f => f.rule === 'S83' && /représentants/.test(f.message)), 'tout passe par un représentant');

  const terrain = codes(brd([sh('SH-01', { represents: 'les agents' }), sh('SH-02', { end_user: true })], [vu('SH-02', 'entretien')]));
  assert.ok(!terrain.includes('S83'), 'un utilisateur direct a été interrogé');

  // Un utilisateur direct encore à interroger ne compte pas : c'est justement la dette.
  assert.ok(codes(brd([sh('SH-01'), sh('SH-02', { end_user: true, status: 'à interroger' })], [vu('SH-01', 'entretien')])).includes('S83'));
  // Et avant tout recueil, la règle ne dit rien.
  assert.ok(!codes({ document: 'brd', phase: 'discover', stakeholders: [sh('SH-01')] }).includes('S83'));

  // `interrogée` écrasait deux états : entendue une fois, et interrogée sur son travail. Sur le premier
  // dossier réel, les DIX sources étaient de type `cadrage` — l'échange qui ouvre l'initiative — et la
  // règle se taisait parce qu'un parent y avait parlé : le parent demandeur, et développeur. Le dossier
  // ouvrait au même moment une zone demandant ce que disent les parents qui ne sont ni l'un ni l'autre.
  const cadrage = checkState(brd([sh('SH-02', { end_user: true })], [vu('SH-02', 'cadrage')]));
  const trouve = cadrage.find(f => f.rule === 'S83');
  assert.ok(trouve, 'présent au cadrage passe pour interrogé');
  assert.match(trouve.message, /présent au cadrage mais jamais interrogé \(SH-02\)/);
  // Une seule source d'entretien suffit à lever : la règle veut une voix recueillie, pas un quota.
  assert.ok(!codes(brd([sh('SH-02', { end_user: true })],
    [vu('SH-02', 'cadrage'), { id: 'SRC-002', type: 'observation', stakeholders: ['SH-02'] }])).includes('S83'));

  // La liste était d'abord écrite en négatif — tout sauf `cadrage` — et comptait donc pour une voix
  // entendue un document, un ticket, et `autre`, que `phase-define.md` prescrivait justement pour une
  // décision de l'utilisateur : une exigence introduite par l'utilisateur éteignait la règle.
  for (const type of ['document', 'ticket', 'revue', 'dt-handoff', 'décision', 'autre']) {
    assert.ok(codes(brd([sh('SH-02', { end_user: true })], [vu('SH-02', type)])).includes('S83'),
      `une source de type ${type} vaut une voix recueillie`);
  }
  for (const type of ['entretien', 'observation', 'atelier', 'test']) {
    assert.ok(!codes(brd([sh('SH-02', { end_user: true })], [vu('SH-02', type)])).includes('S83'),
      `une source de type ${type} ne vaut pas une voix recueillie`);
  }
});

// Cinq énumérations du gabarit finissaient par `autre` et aucune n'était lue — `ingest-dt-handoff.mjs`
// en écrivait même une en repli, et `phase-define.md` prescrivait `type: autre` pour une décision de
// l'utilisateur. Aucune n'était utilisée dans les dossiers réels : c'est un garde, pas un correctif —
// sauf pour les sources, où `autre` servait déjà et éteignait S83.
test('S88 : une valeur hors énumération, et « autre » sans libellé', () => {
  const brd = x => ({ document: 'brd', phase: 'discover', ...x });
  const dom = d => checkState(brd({ decision_rights: [{ domain: d, decider: 'SH-01' }] })).filter(f => f.rule === 'S88');

  const seul = (d, quoi) => { const f = dom(d); assert.equal(f.length, 1, `attendu un S88 — ${quoi} : « ${d} »`); return f[0].message; };
  assert.equal(dom('perimetre').length, 0, 'une valeur de l\'énumération passe');
  assert.equal(dom('processus:inscription').length, 0, 'un préfixe avec son libellé passe');
  assert.match(seul('fusion', 'valeur inconnue'), /hors énumération :/);
  assert.match(seul('processus:', 'préfixe sans libellé'), /sans libellé/);
  assert.match(seul('autre:', 'autre sans libellé'), /sans libellé/);
  const nomme = seul('autre: arbitrage budgétaire', 'autre nommé, compté comme dette');
  assert.match(nomme, /arbitrage budgétaire/);
  assert.match(nomme, /candidat à devenir une valeur/);

  // Les quatre autres énumérations, chacune à son emplacement.
  assert.ok(checkState(brd({ constraints: [{ id: 'CT-1', type: 'autre', text: 'x' }] })).some(f => f.rule === 'S88'), 'type de contrainte');
  assert.ok(checkState(brd({ sources: [{ id: 'SRC-1', type: 'autre', stakeholders: ['SH-01'] }] })).some(f => f.rule === 'S88'), 'type de source');
  assert.ok(checkState(brd({ transition_requirements: [{ id: 'TR-1', kind: 'autre', stakeholders: ['SH-01'], done_when: 'x' }] })).some(f => f.rule === 'S88'), 'type de transition');
  assert.ok(checkState({ document: 'sad', phase: 'design', interfaces: [{ id: 'API-1', kind: 'autre' }] }).some(f => f.rule === 'S88'), 'type d\'interface');
});

test('S84 : une exigence validée sur des sources que personne n\'a relues', () => {
  const brd = fb => ({
    document: 'brd', phase: 'define',
    sources: [{ id: 'SRC-001', type: 'entretien', stakeholders: ['SH-01'], feedback: fb }],
    stakeholders: [{ id: 'SH-01', name: 'x', role: 'r', status: 'interrogée', end_user: true }],
    candidate_needs: [{ id: 'BC-001', statement: 'pouvoir suivre un dossier', sources: ['SRC-001'] }],
    business_requirements: [{ id: 'BR-001', statement: 'Le service doit pouvoir suivre un dossier', status: 'validé', priority: 'must', from_needs: ['BC-001'] }],
  });

  const jamais = checkState(brd('à envoyer'));
  assert.ok(jamais.some(f => f.rule === 'S84' && /jamais été vérifié/.test(f.message)), 'retour à la source jamais fait');
  const envoye = codes(brd('envoyé'));
  assert.ok(envoye.includes('S84'), 'envoyé n\'est pas relu : la personne n\'a pas encore répondu');
  for (const fb of ['confirmé', 'corrigé', 'sans objet']) {
    assert.ok(!codes(brd(fb)).includes('S84'), `${fb} clôt le retour à la source`);
  }
  // Sans source du tout, c'est S64 qui parle, pas S84 : une seule voix par défaut.
  const nue = { ...brd('à envoyer'), candidate_needs: [{ id: 'BC-001', statement: 'x', sources: [] }] };
  assert.ok(!codes(nue).includes('S84'));
  assert.ok(codes(nue).includes('S64'));

  // La même consigne vaut pour le PRD, dont `elicitation-patterns.md` est le même fichier. S84 n'y
  // existait pas, et le garde-fou l'a laissé passer parce qu'il lisait `rules.mjs` en entier.
  const prd = fb => ({
    document: 'prd', phase: 'specify',
    sources: [{ id: 'SRC-001', type: 'entretien', stakeholders: ['SH-01'], feedback: fb }],
    stakeholders: [{ id: 'SH-01', name: 'x', role: 'r', status: 'interrogée' }],
    functional_requirements: [{ id: 'FR-001', statement: 'Le système doit lister les dossiers', origin: 'SRC-001' }],
  });
  assert.ok(checkState(prd('à envoyer')).some(f => f.rule === 'S84' && /jamais relue/.test(f.message)), 'FR tirée d\'une source non relue');
  assert.ok(!codes(prd('confirmé')).includes('S84'), 'source relue et confirmée');
});

// `prd-builder/references/shadow-zones.md` prescrit « Renseigne `parties` et `arbiter` (…, jamais partie
// au conflit) » et rien ne le vérifiait : S15 et S16 n'existaient que dans `checkBrd`, où le conflit est
// une `contradiction` de sous-type `interets` et non un type à lui seul.
test('un conflit d\'intérêts du PRD nomme ses parties et son arbitre', () => {
  const reg = [{ id: 'SH-01', name: 'le directeur', role: 'directeur', status: 'interrogée' }];
  const zone = x => ({ document: 'prd', phase: 'frame', stakeholders: reg, shadow_zones: [{ id: 'ZO-01', type: 'conflit_interets', status: 'ouverte', ...x }] });

  const muette = checkState(zone({ arbiter: 'SH-01' }));
  assert.ok(muette.some(f => f.rule === 'S15' && /sans parties nommées/.test(f.message)), 'conflit sans parties');

  const sansArbitre = checkState(zone({ parties: ['SH-01', 'SH-02'] }));
  assert.ok(sansArbitre.some(f => f.rule === 'S15' && /sans arbitre/.test(f.message)), 'conflit sans arbitre');

  const juge = checkState(zone({ parties: ['SH-01', 'SH-02'], arbiter: 'SH-01' }));
  assert.ok(juge.some(f => f.rule === 'S16'), 'arbitre partie au conflit');

  const inconnu = checkState(zone({ parties: ['SH-02', 'SH-03'], arbiter: 'le bureau' }));
  assert.ok(inconnu.some(f => f.rule === 'S09' && /arbitre/.test(f.message)), 'arbitre absent du registre');

  const propre = codes(zone({ parties: ['SH-02', 'SH-03'], arbiter: 'le directeur' }));
  for (const r of ['S15', 'S16']) assert.ok(!propre.includes(r), `${r} ne devrait pas se déclencher`);

  // Une zone levée ne se contrôle plus, et un autre type n'est pas concerné.
  assert.ok(!codes(zone({ status: 'levée' })).includes('S15'));
  assert.ok(!codes(zone({ type: 'cas_limite' })).includes('S15'));
});

// `S17` ne vérifiait que le champ non vide, et le PRD n'avait pas de registre où chercher la personne :
// sur le deuxième dossier réel, `decided_by: "le directeur (relayé par un membre du bureau)"` passait —
// une phrase, pas une personne — et `decision_rights` tenait « directeur + bureau (priorisation
// conjointe) » comme décideur d'un domaine, ce qui n'est pas un droit de décision mais un arbitrage
// non rendu.
test('un décideur du PRD se nomme, par identifiant ou par son nom', () => {
  const reg = [{ id: 'SH-01', name: 'un membre du bureau', role: 'membre du bureau', status: 'interrogée' }];
  const prd = extra => ({ document: 'prd', phase: 'frame', stakeholders: reg, ...extra });

  const phrase = checkState(prd({ design_decisions: [{ id: 'DD-01', status: 'validé', decided_by: 'le directeur (relayé par un membre du bureau)' }] }));
  assert.ok(phrase.some(f => f.rule === 'S17' && /absent du registre/.test(f.message)), 'décideur qui est une phrase');

  const cible = checkState(prd({ goals: [{ id: 'GOAL-1', statement: 'x', kpi: 'taux', target: '0', decided_by: 'le bureau' }] }));
  assert.ok(cible.some(f => f.rule === 'S17' && /décideur de la cible/.test(f.message)), 'cible arrêtée par un inconnu');

  const domaine = checkState(prd({ decision_rights: [{ domain: 'priorites', decider: 'directeur + bureau (priorisation conjointe)' }] }));
  assert.ok(domaine.some(f => f.rule === 'S09' && /absente du registre/.test(f.message)), 'domaine confié à un décideur inconnu');

  // Le nom suffit : l'identifiant n'est pas exigé, et le registre reconnaît les deux.
  for (const qui of ['SH-01', 'un membre du bureau']) {
    const ok = codes(prd({ design_decisions: [{ id: 'DD-01', status: 'validé', decided_by: qui }] }));
    assert.ok(!ok.includes('S17'), `${qui} est dans le registre`);
  }
  // Et sans registre, le contrôle ne s'arme pas : c'est `S81` qui dit l'absence, une fois.
  assert.ok(!codes({ document: 'prd', phase: 'frame', design_decisions: [{ id: 'DD-01', status: 'validé', decided_by: 'le directeur' }] }).includes('S17'));
});

test('S82 : une métrique et son objectif portent la même cible, ou rien', () => {
  const prd = extra => ({ document: 'prd', phase: 'frame', ...extra });
  const but = x => ({ id: 'GOAL-1', statement: 'x', kpi: 'MET-01 — perdus', target: '0', ...x });

  const orpheline = codes(prd({ goals: [but()], metrics: [{ id: 'MET-01', name: 'perdus', goal: '', target: '0' }] }));
  assert.ok(orpheline.includes('S82'), 'métrique rattachée à aucun objectif');

  const vide = checkState(prd({ goals: [but()], metrics: [{ id: 'MET-01', name: 'perdus', goal: 'GOAL-1', target: '' }] }));
  assert.ok(vide.some(f => f.rule === 'S82' && /cible vide/.test(f.message)), 'cible de la métrique vide quand l\'objectif a la sienne');

  const inverse = checkState(prd({ goals: [but({ target: '' })], metrics: [{ id: 'MET-01', name: 'perdus', goal: 'GOAL-1', target: '0' }] }));
  assert.ok(inverse.some(f => f.rule === 'S82' && /porte l'engagement/.test(f.message)), 'cible fixée côté métrique seulement');

  const accordees = codes(prd({ goals: [but()], metrics: [{ id: 'MET-01', name: 'perdus', goal: 'GOAL-1', target: '0' }] }));
  assert.ok(!accordees.includes('S82'), 'deux cibles identiques ne déclenchent rien');

  // Et un KPI qui nomme une métrique inexistante est une référence morte, pas une faute de frappe.
  const morte = checkState(prd({ goals: [but({ kpi: 'MET-09 — inconnue' })], metrics: [] }));
  assert.ok(morte.some(f => f.rule === 'S09' && /MET-09 inexistante/.test(f.message)), 'KPI citant une métrique absente');
  // Sans aucune métrique déclarée, un objectif qui n'en cite pas ne déclenche rien.
  assert.ok(!codes(prd({ goals: [but({ kpi: 'part des dépôts à distance' })] })).includes('S82'));
});

// `split_into` ne dit la filiation que vers le bas, depuis une mère close : une sortie de périmètre
// arrive pendant que la mère vit et continue. Sur le premier dossier réel, la fille portait son
// origine dans `trigger` — « Sorti du périmètre d'X par DD-02 » : vrai, daté, illisible par un script.
// `autre:<libellé>` reste ouvert parce qu'une énumération fermée ne produit pas un trou mais une valeur
// fausse (le `decision: jeter` du premier dossier, avec la vérité en commentaire YAML) — mais il est
// signalé, et son message dit qu'il est candidat à devenir une valeur.
const msg = (s, r) => checkState(s).filter(f => f.rule === r).map(f => f.message).join(' | ');
test('S86 : la provenance d\'une initiative est complète, ou hors énumération et nommée', () => {
  const de = x => brd({ initiative: { name: 'f', slug: 'f', derived_from: x } });
  assert.ok(!codes(de(undefined)).includes('S86'), 'une initiative née d\'une demande n\'a rien à déclarer');
  assert.ok(!codes(de({ initiative: 'mere', reason: 'decoupage', decision: 'DD-02' })).includes('S86'));
  assert.ok(!codes(de({ initiative: 'mere', reason: 'sortie_perimetre', decision: 'DD-02' })).includes('S86'));
  assert.match(msg(de({ reason: 'decoupage', decision: 'DD-02' }), 'S86'), /ne désigne personne/);
  assert.match(msg(de({ initiative: 'mere', decision: 'DD-02' }), 'S86'), /sans raison/);
  assert.match(msg(de({ initiative: 'mere', reason: 'decoupage' }), 'S86'), /sans la décision/);
  assert.match(msg(de({ initiative: 'mere', reason: 'fusion', decision: 'DD-02' }), 'S86'), /hors énumération :/);
  assert.match(msg(de({ initiative: 'mere', reason: 'autre:', decision: 'DD-02' }), 'S86'), /sans libellé/);
  // Nommé : accepté, signalé, et compté comme une dette — sinon `autre` s'accumule et rien n'est promu.
  const nomme = msg(de({ initiative: 'mere', reason: 'autre: fusion de deux dossiers', decision: 'DD-02' }), 'S86');
  assert.match(nomme, /fusion de deux dossiers/);
  assert.match(nomme, /candidate à devenir une valeur/);
});
test('S86 : un besoin repris par une autre initiative est hors_périmètre chez elle', () => {
  const bc = x => brd({ candidate_needs: [{ id: 'BC-9', text: 'x', moved_to: 'ailleurs', ...x }] });
  assert.ok(!codes(bc({ status: 'hors_périmètre', reason: 'repris ailleurs' })).includes('S86'));
  assert.match(msg(bc({ status: 'proposé' }), 'S86'), /de statut proposé/);
});

// Le tour de table apprend qui est là ; rien n'en tirait de conséquence. Au premier dossier réel le
// fait vivait en commentaire YAML — « Dédé et Tom étaient présents et n'ont pas parlé » — donc
// illisible, et deux guides d'entretien ont été produits pour des gens qui étaient dans l'échange.
// `present` dit qui était là, `stakeholders` qui a parlé : c'est leur différence qui est le sujet.
test('S87 : présent dans une source, locuteur d\'aucune', () => {
  const sh = (id, x) => ({ id, name: id, role: 'r', status: 'interrogée', ...x });
  const brd = (shs, srcs) => ({ document: 'brd', phase: 'discover', stakeholders: shs, sources: srcs });
  const vus = [sh('SH-01'), sh('SH-02'), sh('SH-03', { status: 'à interroger' })];

  // Présent ET locuteur ailleurs : rien. C'est le cas de Dédé et Tom, qui ont fini par parler.
  assert.ok(!codes(brd(vus, [
    { id: 'SRC-001', type: 'cadrage', stakeholders: ['SH-01'], present: ['SH-01', 'SH-02'] },
    { id: 'SRC-002', type: 'entretien', stakeholders: ['SH-02'] },
  ])).includes('S87'), 'un présent qui a parlé ailleurs est entendu');

  const muet = checkState(brd(vus, [{ id: 'SRC-001', type: 'cadrage', stakeholders: ['SH-01'], present: ['SH-01', 'SH-02'] }]));
  const f = muet.find(x => x.rule === 'S87');
  assert.ok(f, 'un présent qui n\'a jamais parlé passe pour entendu');
  assert.equal(f.id, 'SH-02');
  assert.match(f.message, /silence n'est pas un accord/);

  // Déjà dit par le statut : `à interroger` porte l'information, et S81 traite l'attribution.
  assert.ok(!checkState(brd(vus, [{ id: 'SRC-001', type: 'cadrage', stakeholders: ['SH-01'], present: ['SH-03'] }]))
    .some(x => x.rule === 'S87' && x.id === 'SH-03'), 'le statut le disait déjà');

  // Un présent inconnu du registre est une référence morte, comme un locuteur inconnu.
  assert.ok(codes(brd(vus, [{ id: 'SRC-001', type: 'cadrage', stakeholders: ['SH-01'], present: ['SH-99'] }])).includes('S09'));
});

// La fin de Discover exige un décideur « au moins pour le périmètre, les objectifs et les priorités »,
// confirmé par le sponsor, et rien ne le vérifiait. Le premier dossier réel portait les trois défauts,
// tous connus de l'agent : `priorites` sans décideur, et périmètre et objectifs confirmés par leur
// propre titulaire — avec la réserve en commentaire YAML et une zone d'ombre, mais aucune règle.
test('S89 : un droit de décision a un décideur, et ce n\'est pas lui qui le confirme', () => {
  const dr = (rights, phase = 'discover') => checkState({ document: 'brd', phase, decision_rights: rights })
    .filter(f => f.rule === 'S89').map(f => f.message);
  const complet = ['perimetre', 'objectifs', 'priorites'].map(domain => ({ domain, decider: 'SH-01', confirmed_by: 'SH-09' }));

  assert.deepEqual(dr(complet), [], 'trois domaines attribués et confirmés par un tiers');
  assert.match(dr(complet.filter(d => d.domain !== 'priorites')).join(' | '), /personne ne tranche « priorites »/);
  assert.match(dr([{ domain: 'perimetre', decider: 'SH-01', confirmed_by: 'SH-01' }]).join(' | '),
    /confirmé par son propre décideur/);
  assert.match(dr([{ domain: 'perimetre', decider: 'SH-01' }]).join(' | '), /sans confirmation/);
  assert.match(dr([{ domain: 'perimetre', decider: 'SH-01', confirmed_by: 'SH-09', escalation: 'SH-01' }]).join(' | '),
    /recours vers soi-même/);
  assert.match(dr([{ domain: 'perimetre', confirmed_by: 'SH-09' }]).join(' | '), /déclaré sans décideur/);

  // En Assess la carte n'existe pas encore : les domaines dus ne sont pas réclamés.
  assert.deepEqual(dr([], 'assess'), [], 'Assess réclame déjà les droits de décision');
  assert.equal(dr([], 'discover').length, 3, 'les trois domaines dus ne sont pas tous réclamés');
});

// `S81` refuse depuis longtemps une SOURCE attribuée à quelqu'un que l'état déclare « à interroger » :
// ce qui en vient est rapporté, pas recueilli. Personne n'avait transposé aux DÉCISIONS. Le deuxième
// dossier réel le montre : le directeur était présent au cadrage et n'a pas parlé, son autorité est
// décrite par un parent, et trois décisions d'opportunité ont été rendues en son nom — neuf constats
// sur les trois dossiers. Rien n'a été ajouté au modèle pour le voir : les faits étaient dans leurs
// champs, chacun juste, et il manquait le croisement de deux d'entre eux.
test('S90 : une décision rendue au nom de quelqu\'un qu\'on n\'a pas entendu', () => {
  const sh = (id, name, status) => ({ id, name, role: 'r', status });
  const brd = (status, extra) => ({ document: 'brd', phase: 'discover',
    stakeholders: [sh('SH-01', 'Samir', 'interrogée'), sh('SH-02', 'Dédé', status)], ...extra });
  const s90 = s => checkState(s).filter(f => f.rule === 'S90').map(f => f.message);

  const absent = brd('à interroger', { opportunity: { decision: 'decoupee', split_into: ['x'], decided_by: 'SH-02' } });
  assert.match(s90(absent).join(' | '), /décision d'opportunité rendue au nom de Dédé/);
  assert.match(s90(absent).join(' | '), /rapportée par un tiers, pas rendue/);
  assert.equal(s90(brd('interrogée', { opportunity: { decision: 'decoupee', split_into: ['x'], decided_by: 'SH-02' } })).length, 0,
    'une décision rendue par quelqu\'un qu\'on a entendu');
  // `non disponible` dit la même chose que `à interroger` : la personne n'a pas parlé.
  assert.equal(s90(brd('non disponible', { opportunity: { decision: 'jeter', decided_by: 'SH-02' } })).length, 1);

  // Par son nom autant que par son identifiant : `decided_by` accepte les deux (knownPerson).
  assert.equal(s90(brd('à interroger', { opportunity: { decision: 'jeter', decided_by: 'Dédé' } })).length, 1, 'nommée en clair');

  // Les trois autres porteurs de décision du BRD.
  assert.match(s90(brd('à interroger', { decision_rights: [{ domain: 'perimetre', decider: 'SH-02', confirmed_by: 'SH-01' }] })).join(' | '),
    /droit de trancher « perimetre » au nom de Dédé/);
  assert.match(s90(brd('à interroger', { decisions: [{ id: 'DD-01', status: 'validé', decided_by: 'SH-02', options: [1, 2] }] })).join(' | '),
    /décision rendue au nom de Dédé/);

  // Et le PRD, aux trois endroits où il porte des décisions.
  const prd = extra => ({ document: 'prd', phase: 'specify', mode: 'autonome',
    stakeholders: [sh('SH-02', 'Dédé', 'à interroger')], ...extra });
  assert.match(s90(prd({ goals: [{ id: 'OBJ-1', decided_by: 'SH-02' }] })).join(' | '), /cible arrêtée au nom de Dédé/);
  assert.match(s90(prd({ design_decisions: [{ id: 'DD-1', decided_by: 'SH-02' }] })).join(' | '), /décision de conception rendue au nom de Dédé/);
  assert.match(s90(prd({ decision_rights: [{ domain: 'objectifs', decider: 'SH-02' }] })).join(' | '), /droit de trancher « objectifs »/);
});

// Contrôle inverse de S87. Sur le deuxième dossier réel, vingt-et-une sources listaient dans `present`
// toute la salle, locuteurs compris, et une seule l'avait lu à l'envers — « ceux qui étaient là et
// n'ont rien dit » : `stakeholders: [SH-03, SH-02]` avec `present: [SH-01]`, donc deux personnes qui
// parlent depuis l'extérieur de la pièce. Les deux lectures ne peuvent pas coexister dans un fichier.
test('S91 : un locuteur est dans la salle qu\'il a fait parler', () => {
  const base = {
    document: 'brd', phase: 'discover',
    stakeholders: [{ id: 'SH-01', name: 'Samir', status: 'interrogée' }, { id: 'SH-02', name: 'Dédé', status: 'interrogée' }],
  };
  const seul = (d, quoi) => { const f = d.filter(x => x.rule === 'S91'); assert.equal(f.length, 1, `${quoi} : ${JSON.stringify(d.filter(x => ['S91', 'S87'].includes(x.rule)))}`); return f[0]; };

  const dehors = checkState({ ...base, sources: [{ id: 'SRC-001', type: 'entretien', stakeholders: ['SH-02'], present: ['SH-01'] }] });
  assert.match(seul(dehors, 'locuteur hors de la pièce non signalé').message, /absent de « present »/);

  // La salle entière : le locuteur y figure, le silencieux aussi — et c'est S87 qui parle du second.
  const dedans = checkState({ ...base, sources: [{ id: 'SRC-001', type: 'entretien', stakeholders: ['SH-02'], present: ['SH-01', 'SH-02'] }] });
  assert.equal(dedans.filter(f => f.rule === 'S91').length, 0, 'une source correcte est signalée');

  // `present` vide : le tour de table n'a pas eu lieu, il n'y a rien à vérifier.
  const vide = checkState({ ...base, sources: [{ id: 'SRC-001', type: 'entretien', stakeholders: ['SH-02'], present: [] }] });
  assert.equal(vide.filter(f => f.rule === 'S91').length, 0, 'une source sans tour de table est signalée');

  // Un document n'a pas de salle ; une mesure non plus.
  const sansSalle = checkState({ ...base, sources: [{ id: 'SRC-001', type: 'mesure', stakeholders: ['SH-02'], present: ['SH-01'] }] });
  assert.equal(sansSalle.filter(f => f.rule === 'S91').length, 0, 'une mesure est traitée comme une pièce');
});

// La cartographie était la seule collection qu'aucune règle ne relisait. Trois phrases de
// `phase-discover.md` restaient sans effet, et le deuxième dossier réel les a prises en défaut :
// `impact: inconnu` — une valeur que le gabarit n'offrait pas — et, par-dessus, un quadrant
// « impliquer » présenté comme déduit, que `phase-govern.md` transforme en approbateur.
test('S92 et S93 : le quadrant se déduit, l\'influence se demande', () => {
  const carte = sh => checkState({ document: 'brd', phase: 'discover', stakeholders: [{ id: 'SH-01', ...sh }] });
  const seul = (d, regle, quoi) => { const f = d.filter(x => x.rule === regle); assert.equal(f.length, 1, `${quoi} : ${JSON.stringify(d.map(x => x.rule))}`); return f[0]; };

  const suppose = carte({ power: 'fort', impact: 'inconnu', influence: 'positive', quadrant: 'impliquer', attitude: 'x' });
  assert.match(seul(suppose, 'S92', 'quadrant déduit d\'un inconnu').message, /ne le donne pas/);

  const faux = carte({ power: 'fort', impact: 'faible', influence: 'positive', quadrant: 'impliquer', attitude: 'x' });
  assert.match(seul(faux, 'S92', 'quadrant contraire à la déduction').message, /donne « satisfaire »/);

  const manquant = carte({ power: 'faible', impact: 'fort', influence: 'positive', attitude: 'x' });
  assert.match(seul(manquant, 'S92', 'quadrant déductible non renseigné').message, /« consulter »/);

  const juste = carte({ power: 'faible', impact: 'fort', influence: 'positive', quadrant: 'consulter', attitude: 'x' });
  assert.equal(juste.filter(f => ['S92', 'S93'].includes(f.rule)).length, 0, 'une carte correcte est signalée');

  // L'influence inconnue sur un fort pouvoir : S19 couvrait l'influence négative, pas celle-là.
  const muette = carte({ power: 'fort', impact: 'fort', influence: 'inconnue', quadrant: 'impliquer' });
  assert.match(seul(muette, 'S93', 'influence inconnue à fort pouvoir').message, /ne se déduit pas/);
  const dite = carte({ power: 'fort', impact: 'fort', influence: 'inconnue', quadrant: 'impliquer', attitude: '« on verra bien »' });
  assert.equal(dite.filter(f => f.rule === 'S93').length, 0, 'une attitude notée ne suffit pas à lever S93');
  const faible = carte({ power: 'faible', impact: 'fort', influence: 'inconnue', quadrant: 'consulter' });
  assert.equal(faible.filter(f => f.rule === 'S93').length, 0, 'un pouvoir faible déclenche S93');

  // Une valeur hors énumération reste du ressort de S88, et `inconnu` en est une.
  assert.ok(carte({ power: 'moyen', impact: 'fort', influence: 'positive', quadrant: 'consulter', attitude: 'x' }).some(f => f.rule === 'S88'), 'un pouvoir hors énumération passe');
  // En Assess, la carte n'existe pas encore : le tour de table ne donne que des noms.
  const assess = checkState({ document: 'brd', phase: 'assess', stakeholders: [{ id: 'SH-01', name: 'Dédé' }] });
  assert.equal(assess.filter(f => ['S92', 'S93'].includes(f.rule)).length, 0, 'la carte est exigée dès Assess');
});

// « J'ai bien précisé que chaque fonction a un représentant. » Dit deux fois, et le dossier affirmait le
// contraire : `jamais entendue, jamais présente, et non représentée`. La phrase n'avait pas d'endroit
// où se poser — `represents` est posé sur le REPRÉSENTANT et nomme un groupe en prose, qu'aucun script
// ne rapproche d'un identifiant.
test('S94 : la représentation s\'écrit, et elle ne vaut pas une voix', () => {
  const carte = shs => checkState({ document: 'brd', phase: 'discover', stakeholders: shs, candidate_needs: [{ id: 'BC-1' }] });
  const s94 = d => d.filter(f => f.rule === 'S94');
  const rep = { id: 'SH-01', name: 'Samir', status: 'interrogée', represents: 'les parents d\'élèves', power: 'faible', impact: 'fort', influence: 'positive', quadrant: 'consulter', end_user: true };

  // Quelqu'un se dit représentant d'un groupe, et l'utilisateur jamais entendu ne déclare rien.
  const muet = s94(carte([rep, { id: 'SH-06', status: 'à interroger', end_user: true }]));
  assert.equal(muet.length, 1, JSON.stringify(muet));
  assert.match(muet[0].message, /aucune représentation déclarée/);

  // Déclarée, mais plus aucune zone ne la nomme : la représentation a fermé la question.
  const ferme = s94(carte([rep, { id: 'SH-06', status: 'à interroger', end_user: true, represented_by: 'SH-01' }]));
  assert.equal(ferme.length, 1, JSON.stringify(ferme));
  assert.match(ferme[0].message, /elle ne remplace pas sa voix/);

  // Déclarée, et la zone sur sa voix reste ouverte : c'est la bonne tenue.
  const tenu = checkState({
    document: 'brd', phase: 'discover', candidate_needs: [{ id: 'BC-1' }],
    stakeholders: [rep, { id: 'SH-06', status: 'à interroger', end_user: true, represented_by: 'SH-01' }],
    shadow_zones: [{ id: 'ZO-01', type: 'partie_prenante_non_entendue', status: 'ouverte', ask_to: 'SH-01', related: ['SH-06'] }],
  });
  assert.equal(s94(tenu).length, 0, JSON.stringify(s94(tenu)));

  // Un représentant de lui-même, et un représentant qui n'existe pas.
  assert.match(s94(carte([rep, { id: 'SH-06', status: 'à interroger', end_user: true, represented_by: 'SH-06' }]))[0].message, /par elle-même/);
  assert.ok(carte([rep, { id: 'SH-06', status: 'à interroger', end_user: true, represented_by: 'SH-99' }]).some(f => f.rule === 'S09'), 'un représentant inconnu passe');

  // Personne ne se dit représentant : rien à déclarer, rien à signaler.
  const seuls = s94(carte([{ id: 'SH-01', status: 'interrogée', end_user: true, power: 'faible', impact: 'fort', influence: 'positive', quadrant: 'consulter' },
    { id: 'SH-06', status: 'à interroger', end_user: true }]));
  assert.equal(seuls.length, 0, JSON.stringify(seuls));
});

// S83 ne voit que l'absence TOTALE : un utilisateur direct entendu sur quatre, et elle est verte pour
// toujours. C'est la situation du deuxième dossier réel, où les besoins ne portent pas sur les mêmes
// gens — deux d'entre eux sont ceux de la famille qui s'inscrit pour la première fois, jamais entendue,
// et ça n'était écrit que dans leurs `notes`, en prose.
test('S95 : un besoin dit de qui il est, et sa voix a parlé', () => {
  const etat = (extra, phase = 'discover') => checkState({
    document: 'brd', phase,
    stakeholders: [{ id: 'SH-01', status: 'interrogée', end_user: true, power: 'faible', impact: 'fort', influence: 'positive', quadrant: 'consulter' },
      { id: 'SH-06', status: 'à interroger', end_user: true }],
    sources: [{ id: 'SRC-1', type: 'entretien', stakeholders: ['SH-01'] }],
    ...extra,
  });
  const s95 = d => d.filter(f => f.rule === 'S95');

  // Proposé, le porteur n'est pas encore dû : on formule avant de savoir.
  assert.equal(s95(etat({ candidate_needs: [{ id: 'BC-1', status: 'proposé' }] })).length, 0, 'un besoin proposé réclame déjà son porteur');
  // Confirmé, il l'est.
  assert.match(s95(etat({ candidate_needs: [{ id: 'BC-1', status: 'confirmé' }] }))[0].message, /ne dit pas de qui il est le besoin/);
  // En Define, tous le sont.
  assert.equal(s95(etat({ candidate_needs: [{ id: 'BC-1', status: 'proposé' }], synthesis_check: { date: '2026-10-28' } }, 'define')).length, 1, 'un besoin sans porteur passe la porte de synthèse');
  // Le porteur est un utilisateur direct dont aucune source recueillie ne porte la voix.
  assert.match(s95(etat({ candidate_needs: [{ id: 'BC-1', status: 'confirmé', concerns: ['SH-06'] }] }))[0].message, /on n'a pas entendu/);
  // Et celui dont on a la voix ne dit rien.
  assert.equal(s95(etat({ candidate_needs: [{ id: 'BC-1', status: 'confirmé', concerns: ['SH-01'] }] })).length, 0, 'un besoin porté par une voix entendue est signalé');
  assert.ok(etat({ candidate_needs: [{ id: 'BC-1', status: 'confirmé', concerns: ['SH-99'] }] }).some(f => f.rule === 'S09'), 'un porteur inconnu passe');
});

// Un guide d'entretien est un fichier dont l'état ne sait rien. Premier critère, trop étroit : « la
// personne était dans la salle du dernier échange ». Le bon, donné par l'utilisateur : **un guide
// devient une source, ou il s'en va.** S'il a reçu les réponses, une source pointe vers lui et il
// reste ; si l'entretien s'est fait dans la conversation, il n'a rien reçu et ne porte rien que les
// zones d'ombre n'aient. Au deuxième dossier réel, aucune source ne pointait vers `interviews/`, le
// directeur était locuteur de six sources, et son guide était toujours là.
test('S96 : un guide devient une source, ou il s\'en va', async () => {
  const { interviewFindings } = await import('../skills/brd-builder/scripts/lib/rules.mjs');
  const s = {
    document: 'brd', phase: 'discover',
    stakeholders: [{ id: 'SH-01' }, { id: 'SH-02' }, { id: 'SH-04' }],
    sources: [
      { id: 'SRC-1', type: 'cadrage', date: '2026-10-27', stakeholders: ['SH-01'] },
      { id: 'SRC-2', type: 'entretien', date: '2026-10-28', stakeholders: ['SH-02'] },
    ],
  };
  // Le directeur a parlé, et rien ne vient de son guide : l'entretien s'est fait ailleurs.
  const f = interviewFindings(s, ['guide-SH-02.md', 'guide-SH-04.md']);
  assert.equal(f.length, 1, JSON.stringify(f));
  assert.equal(f[0].id, 'guide-SH-02.md');
  assert.match(f[0].message, /aucune ne vient de ce fichier/);

  // Le professeur n'a jamais parlé : son guide sert encore.
  assert.equal(interviewFindings(s, ['guide-SH-04.md']).length, 0, 'un guide encore utile est signalé');

  // Le guide a reçu les réponses : une source pointe vers lui, il reste pour toujours.
  const recu = { ...s, sources: [...s.sources, { id: 'SRC-3', type: 'entretien', stakeholders: ['SH-02'], path: 'brd/demo/interviews/guide-SH-02.md' }] };
  assert.equal(interviewFindings(recu, ['guide-SH-02.md']).length, 0, 'un guide devenu source est retiré');

  // Un guide pour quelqu'un qui n'est pas dans la cartographie.
  assert.ok(interviewFindings(s, ['guide-SH-99.md']).some(x => x.rule === 'S09'), 'un guide hors cartographie passe');
  assert.equal(interviewFindings(s, []).length, 0);
});

// Une hypothèse du BRD n'avait aucun champ pour dire COMMENT la trancher : `text`, `basis`, `status`.
// Au deuxième dossier réel, les huit hypothèses ouvertes portaient le moyen dans leur `basis`, en prose
// — « l'historique des remboursements, que le comptable détient, permettrait de le vérifier sans
// interroger personne ». Le meilleur rapport coût/preuve du dossier, et rien ne pouvait le compter.
test('S97 : une hypothèse à vérifier dit comment', () => {
  const h = hyp => checkState({ document: 'brd', phase: 'discover', hypotheses: [hyp] }).filter(f => f.rule === 'S97');
  assert.match(h({ id: 'H-001', text: 'x', status: 'à vérifier' })[0].message, /sans dire comment/);
  assert.equal(h({ id: 'H-001', text: 'x', status: 'à vérifier', verification: 'Historique des remboursements, détenu par le comptable (SH-07)' }).length, 0, 'un moyen écrit ne suffit pas');
  assert.equal(h({ id: 'H-001', text: 'x', status: 'confirmée' }).length, 0, 'une hypothèse tranchée réclame encore son moyen');
  assert.equal(h({ id: 'H-001', text: 'x', status: 'à vérifier', verification: '   ' }).length, 1, 'un moyen vide passe pour écrit');
});

// Les dérogations nommées ne portaient que sur les règles de FORME : `waivedOf` ne nourrit que
// `checkText`. `lint.mjs` proposait pourtant `lint_waivers` sous chaque avertissement, y compris les
// structurels, et `phase-define.md` fait de « corrigé ou couvert par une dérogation » le critère de
// sortie. Au deuxième dossier réel, le dossier portait déjà une dérogation à S81, avec sa raison
// écrite, et S81 criait toujours ; et trois S89 disaient une vérité irréductible — le président
// tranche, se confirme et est son propre recours, parce qu'il n'y a personne au-dessus de lui.
test('une dérogation nommée couvre aussi une règle de structure', () => {
  const etat = extra => ({
    document: 'brd', phase: 'discover',
    stakeholders: [{ id: 'SH-01', status: 'interrogée', end_user: true, power: 'faible', impact: 'fort', influence: 'positive', quadrant: 'consulter' }],
    sources: [{ id: 'SRC-1', type: 'cadrage', stakeholders: [] }],
    ...extra,
  });
  const s81 = s => checkState(s).filter(f => f.rule === 'S81' && f.id === 'SRC-1');

  const nu = s81(etat({}));
  assert.equal(nu.length, 1);
  assert.equal(nu[0].waived, undefined);

  // Avec sa raison : l'avertissement ne disparaît pas, il porte sa dérogation.
  const couvert = s81(etat({ sources: [{ id: 'SRC-1', type: 'cadrage', stakeholders: [], lint_waivers: [{ rule: 'S81', reason: 'Coquille conservée : tout a été réattribué à SRC-006.' }] }] }));
  assert.equal(couvert.length, 1);
  assert.match(couvert[0].waived, /Coquille conservée/);

  // Sans raison, elle ne compte pas — et le constat le dit.
  const muet = s81(etat({ sources: [{ id: 'SRC-1', type: 'cadrage', stakeholders: [], lint_waivers: [{ rule: 'S81' }] }] }));
  assert.equal(muet[0].waived, undefined);
  assert.match(muet[0].message, /ne dit pas pourquoi/);

  // Un domaine de decision_rights porte un identifiant de constat composé : la dérogation le suit.
  const dr = extra => checkState(etat({ decision_rights: [{ domain: 'perimetre', decider: 'SH-01', confirmed_by: 'SH-01', ...extra }] })).filter(f => f.rule === 'S89' && f.id === 'decision_rights:perimetre');
  assert.equal(dr({})[0].waived, undefined);
  assert.match(dr({ lint_waivers: [{ rule: 'S89', reason: 'Seul décideur de l\'association.' }] })[0].waived, /Seul décideur/);

  // Un constat qui ne porte sur aucun élément — ici une collection — se dérogé à la racine, avec son id.
  const s83 = s => checkState(s).filter(f => f.rule === 'S83');
  const sansUtilisateur = { document: 'brd', phase: 'discover', stakeholders: [{ id: 'SH-01', status: 'interrogée', power: 'faible', impact: 'fort', influence: 'positive', quadrant: 'consulter' }], candidate_needs: [{ id: 'BC-1' }] };
  assert.equal(s83(sansUtilisateur)[0].waived, undefined);
  assert.match(s83({ ...sansUtilisateur, lint_waivers: [{ rule: 'S83', id: 'stakeholders', reason: 'Aucun utilisateur direct n\'existe encore : le produit n\'est pas né.' }] })[0].waived, /pas né/);
});

// Deux collections de `governance` que rien ne lisait. Les relecteurs sont déduits du quadrant —
// pouvoir × impact — et « cette personne a-t-elle été entendue ? » n'entre jamais dans le calcul : au
// deuxième dossier réel, deux relecteurs sur cinq n'avaient jamais parlé. Une revue demande « est-ce
// fidèle à ce que vous avez dit ? » : qui n'a rien dit n'a rien à vérifier, et le rôle met son silence
// sur le chemin de l'approbation. Et `review_rounds` n'était lue par personne, alors que
// `phase-govern.md` étape 7 prescrit d'y noter l'échéance — l'agent l'a demandée, ne l'a pas obtenue,
// et a écrit le diagnostic dans son message de commit.
test('S98 et S99 : un relecteur a été entendu, et un cycle a une échéance', () => {
  const etat = gov => checkState({
    document: 'brd', phase: 'govern',
    stakeholders: [{ id: 'SH-01', name: 'Awa', status: 'interrogée' }, { id: 'SH-06', name: 'Bintou', status: 'à interroger' }],
    governance: gov,
  });
  const seul = (d, regle, quoi) => { const f = d.filter(x => x.rule === regle); assert.equal(f.length, 1, `${quoi} : ${JSON.stringify(d.map(x => x.rule))}`); return f[0]; };

  // Un relecteur jamais entendu.
  assert.match(seul(etat({ reviewers: [{ stakeholder: 'SH-06', role: 'relecteur' }] }), 'S98', 'relecteur jamais entendu').message, /n'a rien dit/);
  // Un approbateur jamais entendu, c'est pire encore.
  assert.match(seul(etat({ reviewers: [{ stakeholder: 'SH-06', role: 'approbateur' }] }), 'S98', 'approbateur jamais entendu').message, /approbateur/);
  // « Informé » est la sortie honnête : on ne lui demande pas de vérifier.
  assert.equal(etat({ reviewers: [{ stakeholder: 'SH-06', role: 'informé' }] }).filter(f => f.rule === 'S98').length, 0, 'un informé est traité comme un relecteur');
  assert.equal(etat({ reviewers: [{ stakeholder: 'SH-01', role: 'relecteur' }] }).filter(f => f.rule === 'S98').length, 0, 'un relecteur entendu est signalé');

  // Un cycle envoyé sans échéance.
  assert.match(seul(etat({ review_rounds: [{ id: 'RV-1', sent: '2026-10-28', channel: 'pr', deadline: '' }] }), 'S99', 'cycle sans échéance').message, /il s'interrompt/);
  assert.equal(etat({ review_rounds: [{ id: 'RV-1', sent: '2026-10-28', deadline: '2026-11-10' }] }).filter(f => f.rule === 'S99').length, 0, 'un cycle daté est signalé');
  // Un cycle pas encore envoyé n'a pas encore d'échéance à donner.
  assert.equal(etat({ review_rounds: [{ id: 'RV-2', deadline: '' }] }).filter(f => f.rule === 'S99').length, 0, 'un cycle non envoyé réclame déjà son échéance');

  // Et une approbation posée sur un retour qu'on n'a pas tranché.
  const sur = etat({ comments: [{ id: 'CM-001', decision: 'en_attente' }], approvals: [{ stakeholder: 'SH-01', decision: 'approuvé' }] });
  assert.match(seul(sur, 'S99', 'approbation sur commentaire en attente').message, /n'est pas un retour qu'on a traité/);
  const tranche = etat({ comments: [{ id: 'CM-001', decision: 'accepté' }], approvals: [{ stakeholder: 'SH-01', decision: 'approuvé' }] });
  assert.equal(tranche.filter(f => f.rule === 'S99').length, 0, 'un retour tranché bloque encore l\'approbation');
});

// Le vide ne vaut pas une réussite. `0 / 0` rendait 100 % et « atteint » : un BRD à l'ouverture
// affichait ses trois métriques de couverture comme satisfaites, dans le document rendu et dans le
// handoff. Une métrique sans élément à compter n'est ni atteinte ni manquée : elle n'est pas mesurée.
// Deux systèmes de seuils et de dérogations faisaient la même chose sous deux noms, et aucun des deux
// ne vérifiait qu'une dérogation porte sa raison et son approbateur — là où `lint_waivers` le fait
// depuis le 28 octobre. Pire : un SEUIL éteignait une mesure. `stories_ready` avait 0 pour défaut, et
// la table du plan de l'exemple rendait « Stories prêtes | 2/5 | 40 % | 0 % | atteint ».
test('un seuil, une dérogation : S105, S106, S107 et la mesure indicative', () => {
  const brd = extra => ({ document: 'brd',
    objectives: [{ id: 'OBJ-1', status: 'validé' }, { id: 'OBJ-2', status: 'validé' }],
    business_requirements: [{ id: 'BR-1', status: 'validé', objectives: ['OBJ-1'], acceptance: ['x'] }], ...extra });
  const r = (extra, regle) => coverageFindings(brd(extra)).filter(f => f.rule === regle);

  // Sans rien : la métrique « objectifs servis » est à 50 % pour un seuil de 100 % → S54.
  assert.equal(r({}, 'S54').length, 1);
  // Un seuil à 0 ne compare rien : ce n'est pas une réussite, c'est un renoncement, et il se nomme.
  const seuilZero = coverage(brd({ thresholds: { objective_br: 0 } })).find(m => m.id === 'objective_br');
  assert.equal(seuilZero.met, null, 'un seuil à 0 rend la mesure atteinte');
  assert.match(seuilZero.note, /seuil à 0 : la mesure n'est pas jugée/);
  assert.equal(r({ thresholds: { objective_br: 0 } }, 'S54').length, 0, 'S54 parle encore d\'un seuil à 0');
  assert.equal(r({ thresholds: { objective_br: 0 } }, 'S105').length, 1, 'un seuil à 0 passe sans un mot');
  // La table ne l'écrit jamais « atteint ».
  assert.match(coverageRows([seuilZero])[0][4], /_non mesuré_/);

  // Une dérogation ne compte que si elle dit POURQUOI et QUI l'a approuvée.
  const muette = { thresholds: { objective_br: 0 }, waivers: [{ metric: 'objective_br', reason: 'cadence flux' }] };
  assert.equal(coverage(brd(muette)).find(m => m.id === 'objective_br').met, null);
  assert.equal(r(muette, 'S106').length, 1, 'une dérogation sans approbateur éteint le seuil');
  assert.match(r(muette, 'S106')[0].message, /ne dit pas qui l'a approuvée/);
  const nommee = { thresholds: { objective_br: 0 }, waivers: [{ metric: 'objective_br', reason: 'cadence flux', approved_by: 'SH-01' }] };
  const assumee = coverage(brd(nommee)).find(m => m.id === 'objective_br');
  assert.equal(assumee.met, true, 'une dérogation nommée n\'assume pas le seuil');
  assert.match(assumee.note, /hors périmètre assumé : cadence flux \(approuvé par SH-01\)/);
  assert.deepEqual(coverageFindings(brd(nommee)).filter(f => ['S54', 'S105', 'S106'].includes(f.rule)), []);
  // Et une dérogation muette sur un seuil simplement non atteint ne l'éteint pas non plus.
  assert.equal(r({ waivers: [{ metric: 'objective_br', approved_by: 'SH-01' }] }, 'S54').length, 1);
  assert.match(r({ waivers: [{ metric: 'objective_br', approved_by: 'SH-01' }] }, 'S106')[0].message, /ne dit pas pourquoi/);

  // Les anciens noms se lisent encore — un dossier en cours ne casse pas — et S107 dit de renommer.
  const ancien = coverage(brd({ coverage_thresholds: { objective_br: 50 } })).find(m => m.id === 'objective_br');
  assert.equal(ancien.threshold, 50, 'l\'ancien nom de champ n\'est plus lu');
  assert.equal(ancien.met, true);
  assert.deepEqual(r({ coverage_thresholds: { objective_br: 50 } }, 'S107').map(f => f.id), ['champ:coverage_thresholds']);
  assert.deepEqual(r({ coverage_waivers: [{ metric: 'objective_br', reason: 'x', approved_by: 'y' }] }, 'S107').map(f => f.id), ['champ:coverage_waivers']);
  // Si les deux noms coexistent, c'est le nouveau qui tranche : sinon deux valeurs pour une même chose.
  assert.equal(coverage(brd({ coverage_thresholds: { objective_br: 50 }, thresholds: { objective_br: 100 } })).find(m => m.id === 'objective_br').threshold, 100);

  // Une mesure INDICATIVE se lit et ne se juge pas : « stories prêtes » n'a pas de cible. C'est le
  // CATALOGUE qui le déclare, avec sa raison ; un projet qui écrit 0 assume, et son 0 reste un 0.
  const plan = coverage({ document: 'plan', settings: { release: 'REL-1' },
    stories: [{ id: 'US-1', status: 'validé' }, { id: 'US-2', status: 'proposé' }] }, {});
  const prets = plan.find(m => m.id === 'stories_ready');
  assert.equal(prets.threshold, 'indicatif');
  assert.equal(prets.met, null, 'une mesure indicative se dit atteinte');
  assert.match(coverageRows([prets])[0][4], /_indicatif_/);
  assert.equal(coverageRows([prets])[0][3], '—', 'un seuil indicatif s\'écrit « indicatif % »');
  assert.deepEqual(coverageFindings({ document: 'plan', stories: [{ id: 'US-1', status: 'validé' }] }, {}).filter(f => f.rule === 'S105'), [],
    'une mesure indicative du catalogue produit un constat');
  // Un projet ne déclare pas « indicatif » : écrit dans `thresholds`, il vaut 0 et se dérogue.
  assert.equal(coverage({ document: 'plan', thresholds: { stories_ready: 'indicatif' },
    stories: [{ id: 'US-1', status: 'validé' }, { id: 'US-2', status: 'proposé' }] }, {}).find(m => m.id === 'stories_ready').threshold, 0);
});

test('couverture : une collection vide n\'est pas une couverture atteinte', () => {
  const vide = coverage({ document: 'brd' });
  assert.equal(vide.length, 3, 'les trois métriques du BRD sont présentes');
  for (const m of vide) {
    assert.equal(m.mesure, false, `${m.id} se dit mesurée`);
    assert.equal(m.pct, null, `${m.id} porte un taux`);
    assert.equal(m.met, null, `${m.id} se dit atteinte ou manquée`);
  }
  // La table le dit, au lieu d'écrire « atteint » sur du vide.
  const [, couverts, taux, , statut] = coverageRows(vide)[0];
  assert.equal(couverts, '0/0');
  assert.equal(taux, '—');
  assert.equal(statut, '_non mesuré_');
  // Et S54 ne reproche rien : ce qui rend la métrique due relève de la phase, pas du compte.
  assert.equal(coverageFindings({ document: 'brd' }).length, 0, 'S54 parle d\'une métrique non mesurée');

  // Mesurée et insuffisante : inchangé.
  const servis = coverage({ document: 'brd', objectives: [{ id: 'OBJ-1', status: 'validé' }, { id: 'OBJ-2', status: 'validé' }],
    business_requirements: [{ id: 'BR-1', status: 'validé', objectives: ['OBJ-1'], acceptance: ['x'] }] });
  const obj = servis.find(m => m.id === 'objective_br');
  assert.deepEqual([obj.mesure, obj.pct, obj.met], [true, 50, false]);
  assert.equal(coverageFindings({ document: 'brd', objectives: [{ id: 'OBJ-1', status: 'validé' }] }).filter(f => f.rule === 'S54').length, 1);
});

// Un document hors du catalogue recevait les règles du BRD, et trois métriques vides à « 100 %
// atteint ». Un rapport faux coûte plus cher qu'un refus.
test('S00 : un document que le catalogue ne vérifie pas se refuse, il ne se devine pas', () => {
  const f = checkState({ document: 'test', release: 'REL-1' });
  assert.equal(f.length, 1, 'un état de tests reçoit plusieurs constats');
  assert.equal(f[0].rule, 'S00');
  assert.match(f[0].message, /release-matrix\.mjs/, 'le refus ne dit pas quoi utiliser à la place');
  assert.deepEqual(coverage({ document: 'test' }), [], 'un document inconnu reçoit des métriques');
  // Les quatre documents connus passent par leur propre jeu de règles.
  for (const d of DOCUMENTS) assert.equal(checkState({ document: d }).some(x => x.rule === 'S00'), false, d);
  // Un état sans champ `document` reste lu comme un BRD, comme partout ailleurs.
  assert.equal(checkState({ phase: 'discover' }).some(x => x.rule === 'S00'), false);
});

// Trois fois la même faute : la doctrine exigeait une trace, le modèle d'état n'avait pas de champ, et
// l'agent a improvisé en prose. `questions.md` dit du changement de phase qu'« il s'écrit dans l'état
// avec sa date » ; `phase` était un scalaire nu, et au deuxième dossier réel le passage de Discover à
// Define — sa date, son décideur, sa source, ses 7 conditions sur 7 — tenait dans un COMMENTAIRE YAML.
test('S100 et S101 : une porte franchie laisse sa trace, avec son décideur et sa date', () => {
  const porte = extra => checkState({ document: 'brd', phase: 'define', ...extra }).filter(f => ['S100', 'S101'].includes(f.rule));
  // Deux portes franchies, aucune trace : deux constats, chacun nommant la phase close.
  assert.deepEqual(porte({}).map(f => `${f.rule} ${f.id}`), ['S100 phase:assess', 'S100 phase:discover']);
  assert.match(porte({})[0].message, /phase_log/);
  const complet = [{ from: 'assess', to: 'discover', date: '2026-10-29', decided_by: 'SH-02', source: 'SRC-026' },
    { from: 'discover', to: 'define', date: '2026-11-02', decided_by: 'SH-02', source: 'SRC-080' }];
  assert.deepEqual(porte({ phase_log: complet }), [], 'un journal complet est encore signalé');
  // Une entrée sans décideur ni source : la trace existe, la décision n'est pas nommée.
  const boiteux = porte({ phase_log: [complet[0], { from: 'discover', to: 'define', date: '2026-11-02' }] });
  assert.deepEqual(boiteux.map(f => f.rule), ['S101']);
  assert.match(boiteux[0].message, /qui l'a décidée, ni la source/);
  // Une initiative close ne se fait pas reprocher des passages qu'elle n'a pas faits.
  assert.deepEqual(porte({ phase: 'close' }), []);
  // Et les autres documents ont leur propre chaîne de phases.
  assert.deepEqual(checkState({ document: 'sad', phase: 'govern' }).filter(f => f.rule === 'S100').map(f => f.id),
    ['phase:explore', 'phase:design']);

  // Un retour en arrière s'écrit dans le MÊME journal, avec `kind: retour`. Il ne tient donc PAS lieu
  // de porte : sans ce filtre, un retour écrit depuis Discover aurait suffi à faire croire que la
  // porte de Discover avait laissé sa trace. Deux mécanismes dans un champ se distinguent, ou ils se
  // couvrent l'un l'autre.
  const avecRetour = porte({ phase_log: [complet[0],
    { from: 'discover', to: 'discover', date: '2026-11-01', decided_by: 'SH-02', reason: 'contradiction', kind: 'retour' }] });
  assert.deepEqual(avecRetour.map(f => `${f.rule} ${f.id}`), ['S100 phase:discover'], 'un retour tient lieu de porte');
  // Et un retour se décide comme une porte : il dit sa date, qui l'a décidé et pourquoi on recule.
  // Il ne porte pas de source, lui : c'est une zone d'ombre qui l'a provoqué.
  const retourMuet = porte({ phase_log: [...complet, { from: 'define', to: 'discover', date: '2026-11-03', kind: 'retour' }] });
  assert.deepEqual(retourMuet.map(f => f.rule), ['S101']);
  assert.match(retourMuet[0].message, /retour en arrière écrit sans qui l'a décidé, ni pourquoi on revient en arrière/);
  assert.deepEqual(porte({ phase_log: [...complet,
    { from: 'define', to: 'discover', date: '2026-11-03', decided_by: 'SH-02', reason: 'valeur actuelle inconnue', zone: 'ZO-012', kind: 'retour' }] }), [],
  'un retour complet est encore signalé');
});

// Le modèle d'état n'avait AUCUN champ pour ce qui avait été dit. Mesuré : 92 sources sur 93 — dont 65
// entretiens — ne portaient que leurs métadonnées, et `feedback` comme S84 portaient donc sur du vide.
test('S102 : une source de parole porte ce qui a été dit, ou elle ne se relit pas', () => {
  const avec = sources => checkState({ document: 'brd', phase: 'discover', sources }).filter(f => f.rule === 'S102');
  const muet = avec([{ id: 'SRC-1', type: 'entretien' }, { id: 'SRC-2', type: 'atelier' }, { id: 'SRC-3', type: 'observation' }]);
  assert.equal(muet.length, 1, 'le constat porte sur la collection, pas sur chaque source');
  assert.equal(muet[0].id, 'sources');
  assert.match(muet[0].message, /^2 source\(s\) de parole sur 3 /);
  assert.match(muet[0].message, /SRC-1, SRC-2/);
  // Le verbatim, un fichier, ou la `note` du modèle de la conception : trois façons de porter le contenu.
  assert.deepEqual(avec([{ id: 'SRC-1', type: 'entretien', quote: 'Elle revient pour compléter le dossier.' }]), []);
  assert.deepEqual(avec([{ id: 'SRC-1', type: 'entretien', path: 'sources/SRC-1.md' }]), []);
  assert.deepEqual(avec([{ id: 'SRC-1', type: 'entretien', note: 'ce qui a été dit' }]), []);
  // `understood` seul ne compte pas : ce qui se relit, c'est ce qui a été dit.
  assert.equal(avec([{ id: 'SRC-1', type: 'entretien', understood: 'une conclusion' }]).length, 1);
  // Une source qui n'est pas de la parole se porte par son fichier, et ne réclame pas de verbatim.
  assert.deepEqual(avec([{ id: 'SRC-1', type: 'document' }, { id: 'SRC-2', type: 'mesure' }]), []);
});

// Samir confirme BC-003 (SRC-086), BC-002 et BC-007 (SRC-087), et aucun des trois besoins ne cite ces
// sources : BC-007 paraît reposer sur une voix unique alors que deux parties prenantes le portent.
test('S103 : une confirmation rejoint ce qu\'elle confirme, sinon elle ne compte pour rien', () => {
  const etat = (confirms, sourcesDuBesoin) => checkState({ document: 'brd', phase: 'define',
    sources: [{ id: 'SRC-1', type: 'entretien', quote: 'a' }, { id: 'SRC-2', type: 'décision', quote: 'Oui', confirms }],
    candidate_needs: [{ id: 'BC-1', text: 'Pouvoir déposer sans se déplacer', sources: sourcesDuBesoin }] });
  const seul = etat(['BC-1'], [{ ref: 'SRC-1' }]).filter(f => f.rule === 'S103');
  assert.equal(seul.length, 1);
  assert.equal(seul[0].id, 'BC-1', 'le constat porte sur l\'élément resté sans sa confirmation');
  assert.match(seul[0].message, /confirmé par SRC-2, qui ne figure pas dans ses sources/);
  // Rattachée, elle se taît.
  assert.deepEqual(etat(['BC-1'], [{ ref: 'SRC-1' }, { ref: 'SRC-2' }]).filter(f => f.rule === 'S103'), []);
  // Et une confirmation d'un élément qui n'existe pas est une référence morte.
  assert.ok(etat(['BC-9'], [{ ref: 'SRC-1' }]).some(f => f.rule === 'S09' && /confirmation de BC-9/.test(f.message)));
});

// S84 demande si ce qu'on a compris a été vérifié auprès de la personne. Une confirmation de l'exigence
// elle-même y répond mieux qu'une relecture de son matériau : c'est l'énoncé qui a été relu.
test('S84 : une confirmation de l\'élément vaut la relecture de la source dont il est tiré', () => {
  const etat = confirms => ({ document: 'brd', phase: 'define',
    sources: [{ id: 'SRC-1', type: 'entretien', quote: 'a', feedback: 'à envoyer' },
      { id: 'SRC-2', type: 'entretien', quote: 'b', feedback: 'à envoyer' },
      { id: 'SRC-3', type: 'décision', quote: 'Oui', confirms }],
    candidate_needs: [{ id: 'BC-1', text: 'x', sources: [{ ref: 'SRC-1' }, { ref: 'SRC-2' }] }],
    objectives: [{ id: 'OBJ-1', statement: 'o', indicator: 'i', target: 't', status: 'validé' }],
    business_requirements: [{ id: 'BR-1', statement: 'Le système doit refuser un dossier incomplet', status: 'validé', from_needs: ['BC-1'], objectives: ['OBJ-1'], acceptance: ['y'] }] });
  const s84 = c => checkState(etat(c)).filter(f => f.rule === 'S84').length;
  assert.equal(s84([]), 1, 'une exigence jamais relue passe');
  assert.equal(s84(['BR-1']), 0, 'l\'exigence confirmée est encore signalée');
  assert.equal(s84(['BC-1']), 0, 'le besoin d\'origine confirmé est encore signalé');
});

// « L'utilisateur est le seul de la chaîne qui n'a pas l'index sous les yeux » : c'était faux, et
// c'est moi qui l'avais écrit. Une partie prenante, un relecteur, un approbateur ne l'ont JAMAIS vu.
// Mesuré sur trois relevés de relecture réels envoyés à trois personnes : 46 identifiants que leur
// propre fichier ne glose nulle part — dont deux besoins qu'on demandait à Samir de confirmer.
test('S104 : un document qui part ne parle pas par adresses', () => {
  const s = { document: 'brd', phase: 'define',
    candidate_needs: [
      { id: 'BC-002', text: 'Savoir, côté famille, que le dossier déposé a bien été reçu' },
      { id: 'BC-003', text: "Qu'une famille déjà connue n'ait pas à réécrire ce que l'association détient déjà" }],
    objectives: [{ id: 'OBJ-02', statement: 'Une famille accomplit l\'inscription sans déplacement imposé' }] };
  const sur = texte => checkState(s, { interviews: [{ file: 'relecture-SH-01.md', text: texte }] }).filter(f => f.rule === 'S104');

  // Le corps dit « BC-002 et BC-007 relus à Samir. Samir : "Oui." », et BC-002 n'est glosé nulle part.
  const nu = sur('BC-002 et OBJ-02 relus à Samir. Samir : « Oui. »');
  assert.equal(nu.length, 1);
  assert.equal(nu[0].id, 'relecture-SH-01.md');
  assert.match(nu[0].message, /^2 identifiant\(s\) que ce fichier ne glose nulle part : BC-002, OBJ-02/);
  assert.match(nu[0].message, /valider ce qu'il ne peut pas lire/);

  // Glosé, sous n'importe quelle forme : le contrôle ne juge pas la forme, il cherche l'énoncé.
  assert.deepEqual(sur('- **BC-002** (confirmé) — Savoir, côté famille, que le dossier déposé a bien été reçu'), [], 'étiquette');
  assert.deepEqual(sur('Le besoin de savoir, côté famille, que le dossier déposé a bien été reçu (BC-002).'), [], 'prose');
  // Un identifiant que l'état ne connaît pas n'est pas du ressort de cette règle.
  assert.deepEqual(sur('On a parlé de BR-999.'), []);
  // Les mots courts se retirent des DEUX côtés : « une famille déjà connue n'ait pas à réécrire »
  // contient bien l'énoncé de BC-003, et la première version du contrôle le dénonçait quand même.
  assert.deepEqual(sur("Qu'une famille déjà connue n'ait pas à réécrire ce que l'association détient déjà (BC-003)"), []);
  // Le guide d'entretien est l'exception : son lecteur est l'intervieweur, qui a le dossier.
  assert.deepEqual(checkState(s, { interviews: [{ file: 'guide-SH-04.md', text: 'Et le dossier ? *(BC-002)*' }] }).filter(f => f.rule === 'S104'), []);
});

// Vingt règles du catalogue n'étaient citées par AUCUN test ni aucun golden : rien ne prouvait
// qu'elles se déclenchent, ni qu'elles se taisent quand il faut. Une règle que personne n'exerce est
// soit du code mort, soit un contrôle qui tire à côté — et dans les deux cas on ne l'apprend qu'en
// production, sur le dossier de quelqu'un. Chacune est prise deux fois : l'état qui la viole, et le
// même état corrigé.
const seules = (etat, regle, ctx = {}) => checkState(etat, ctx).filter(f => f.rule === regle).map(f => f.id);

test('les règles du BRD que rien n\'exerçait : S01, S02, S03, S10', () => {
  const brd = extra => ({ document: 'brd', phase: 'define', ...extra });
  // S01 : un objectif sans indicateur ou sans cible ne se mesure pas, donc ne se vérifie jamais.
  assert.deepEqual(seules(brd({ objectives: [{ id: 'OBJ-1', statement: 'Réduire les rejets' }] }), 'S01'), ['OBJ-1']);
  assert.deepEqual(seules(brd({ objectives: [{ id: 'OBJ-1', statement: 'x', indicator: 'taux' }] }), 'S01'), ['OBJ-1'], 'un objectif sans cible passe');
  assert.deepEqual(seules(brd({ objectives: [{ id: 'OBJ-1', statement: 'x', indicator: 'taux', target: '5 %' }] }), 'S01'), []);
  // S02 et S03 : une exigence qui ne sert aucun objectif, ou qui ne vient d'aucun besoin sourcé.
  const nue = brd({ objectives: [{ id: 'OBJ-1', statement: 'x', indicator: 'i', target: 't' }],
    candidate_needs: [{ id: 'BC-1', text: 'y', sources: [{ ref: 'SRC-1' }] }],
    sources: [{ id: 'SRC-1', type: 'entretien', stakeholders: ['SH-1'] }],
    stakeholders: [{ id: 'SH-1', name: 'A', status: 'interrogée' }],
    business_requirements: [{ id: 'BR-1', statement: 'Le service doit accuser réception' }] });
  assert.deepEqual(seules(nue, 'S02'), ['BR-1']);
  assert.deepEqual(seules(nue, 'S03'), ['BR-1']);
  const reliee = structuredClone(nue);
  reliee.business_requirements[0].objectives = ['OBJ-1'];
  reliee.business_requirements[0].from_needs = ['BC-1'];
  assert.deepEqual(seules(reliee, 'S02'), []);
  assert.deepEqual(seules(reliee, 'S03'), []);
  // S10 : un renvoi vers un élément abandonné. La référence EXISTE — ce n'est pas S09 —, et c'est
  // pire : elle a l'air juste, et ce qu'elle désigne a été écarté.
  const mort = structuredClone(reliee);
  mort.candidate_needs[0].status = 'abandonné';
  assert.deepEqual(seules(mort, 'S10'), ['BR-1']);
  assert.match(checkState(mort).find(f => f.rule === 'S10').message, /abandonné/);
  assert.deepEqual(seules(reliee, 'S10'), []);
});

test('les règles du PRD que rien n\'exerçait : S06', () => {
  const prd = extra => ({ document: 'prd', phase: 'specify', mode: 'autonome', ...extra });
  const fr = o => ({ id: 'FR-1', statement: 'Quand une famille dépose, le système doit accuser réception',
    pattern: 'event', status: 'validé', release: 'REL-1', priority: 'should', goals: ['GOAL-1'], ...o });
  const base = extra => prd({ goals: [{ id: 'GOAL-1', statement: 'x', kpi: 'k', target: 't', status: 'validé' }],
    acceptance_criteria: [{ id: 'AC-1', fr: 'FR-1', scenario: 's', given: 'g', when: 'w', then: 't' }], ...extra });
  // S06 : une exigence qui ne dit pas d'où elle vient. Ni BR amont, ni source, ni décision produit :
  // personne ne peut plus répondre « pourquoi celle-là ? ».
  assert.deepEqual(seules(base({ functional_requirements: [fr()] }), 'S06'), ['FR-1']);
  assert.deepEqual(seules(base({ functional_requirements: [fr({ origin: 'SRC-012' })] }), 'S06'), []);
  assert.deepEqual(seules(base({ mode: 'chaîné', functional_requirements: [fr({ brd_requirements: ['BR-001'] })],
    brd_ref: { requirements: [{ id: 'BR-001', statement: 'x', priority: 'must' }] } }), 'S06'), []);
});

test('les règles de la conception que rien n\'exerçait : S21, S25, S26, S33, S34, S35', () => {
  const sad = extra => ({ document: 'sad', phase: 'design', context_mode: 'greenfield', ...extra });
  // S21 : un moteur architectural sans origine. Un moteur qu'aucune NFR, contrainte, FR ni règle ne
  // fonde est une préférence de l'architecte présentée comme une exigence.
  assert.deepEqual(seules(sad({ drivers: [{ id: 'AD-1', kind: 'performance', status: 'validé' }] }), 'S21'), ['AD-1']);
  assert.deepEqual(seules(sad({ drivers: [{ id: 'AD-1', kind: 'performance', origin: ['NFR-003'], status: 'validé' }] }), 'S21'), []);
  // S25 : un ADR accepté sans conséquence négative — toute décision sacrifie quelque chose — ou sans
  // moyen de confirmation : une règle qu'on ne saura jamais vérifier.
  const adr = o => ({ id: 'ADR-1', title: 'x', status: 'accepté', context: 'c', drivers: ['AD-1'],
    options: [{ name: 'a' }, { name: 'b' }], outcome: 'a', decided_by: 'SH-1', ...o });
  assert.deepEqual(seules(sad({ decisions: [adr()] }), 'S25'), ['ADR-1', 'ADR-1'], 'les deux moitiés de S25 ne tirent pas');
  assert.deepEqual(seules(sad({ decisions: [adr({ consequences: { bad: ['couplage'] } })] }), 'S25'), ['ADR-1']);
  assert.deepEqual(seules(sad({ decisions: [adr({ consequences: { bad: ['couplage'] }, confirmation: 'test d\'architecture' })] }), 'S25'), []);
  // S26 : une FR que le modèle n'alloue à rien. Elle est spécifiée et personne ne la construira.
  const avecFr = extra => sad({ prd_ref: { functional_requirements: [{ id: 'FR-1', statement: 'x', priority: 'must' }] }, ...extra });
  assert.deepEqual(seules(avecFr(), 'S26'), ['FR-1']);
  assert.deepEqual(seules(avecFr({ elements: [{ id: 'CP-1', name: 'A', kind: 'container', parent: 'SYS-1', frs: ['FR-1'] },
    { id: 'SYS-1', name: 'S', kind: 'system' }] }), 'S26'), []);
  // Une FR `wont` ne s'alloue pas : elle est écartée, et le contrôle ne doit pas la réclamer.
  assert.deepEqual(seules(sad({ prd_ref: { functional_requirements: [{ id: 'FR-9', statement: 'x', priority: 'wont' }] } }), 'S26'), []);
  // S33 : deux éléments du modèle qui portent le même nom. Deux dessins, un seul nom : la conversation
  // devient impossible et le code suit.
  assert.deepEqual(seules(sad({ elements: [{ id: 'SYS-1', name: 'Portail', kind: 'system' }, { id: 'SYS-2', name: 'Portail', kind: 'system' }] }), 'S33'), ['SYS-1']);
  assert.deepEqual(seules(sad({ elements: [{ id: 'SYS-1', name: 'Portail', kind: 'system' }, { id: 'SYS-2', name: 'Facturation', kind: 'system' }] }), 'S33'), []);
  // S34 : la hiérarchie C4. Un conteneur pend d'un système interne, un composant d'un conteneur.
  assert.deepEqual(seules(sad({ elements: [{ id: 'CP-1', name: 'A', kind: 'container' }] }), 'S34'), ['CP-1']);
  assert.deepEqual(seules(sad({ elements: [{ id: 'SYS-1', name: 'S', kind: 'system', external: true },
    { id: 'CP-1', name: 'A', kind: 'container', parent: 'SYS-1' }] }), 'S34'), ['CP-1'], 'un conteneur dans un système EXTERNE passe');
  assert.deepEqual(seules(sad({ elements: [{ id: 'SYS-1', name: 'S', kind: 'system' },
    { id: 'CP-1', name: 'A', kind: 'container', parent: 'SYS-1' },
    { id: 'CM-1', name: 'B', kind: 'component', parent: 'CP-1' }] }), 'S34'), []);
  assert.deepEqual(seules(sad({ elements: [{ id: 'SYS-1', name: 'S', kind: 'system' },
    { id: 'CM-1', name: 'B', kind: 'component', parent: 'SYS-1' }] }), 'S34'), ['CM-1'], 'un composant pendu à un système passe');
  // S35 : une règle métier automatisée que nul agrégat ne garantit. Elle est censée être tenue par le
  // code, et le modèle du domaine ne dit pas où.
  // Les règles arrivent du PRD, en lecture seule : la conception les lit dans `prd_ref`. Et
  // `automation` vaut `à_décider | automatisée | manuelle` — seule `automatisée` demande un agrégat.
  const rg = { id: 'RG-1', statement: 'x', automation: 'automatisée' };
  assert.deepEqual(seules(sad({ prd_ref: { business_rules: [rg] } }), 'S35'), ['RG-1']);
  assert.deepEqual(seules(sad({ prd_ref: { business_rules: [rg] }, contexts: [{ id: 'CTX-1', name: 'C',
    aggregates: [{ name: 'Dossier', invariants: ['RG-1'] }] }] }), 'S35'), []);
  for (const a of ['à_décider', 'manuelle']) {
    assert.deepEqual(seules(sad({ prd_ref: { business_rules: [{ id: 'RG-2', statement: 'x', automation: a }] } }), 'S35'), [],
      `une règle « ${a} » réclame un agrégat`);
  }
});

test('les règles du plan que rien n\'exerçait : S37, S38, S42, S46, S47, S49, S59, S62', () => {
  const plan = extra => ({ document: 'plan', phase: 'schedule', settings: { cadence: 'sprint', release: 'REL-1' }, ...extra });
  const story = o => ({ id: 'US-1', title: 'Accuser réception', status: 'validé', release: 'REL-1',
    lane: 'standard', map_task: 'T-03', frs: ['FR-001'], size: 'M', ...o });
  // S62 : une story sans titre court. Un identifiant ne se dit pas dans une conversation d'équipe.
  assert.deepEqual(seules(plan({ stories: [story({ title: '' })] }), 'S62'), ['US-1']);
  assert.deepEqual(seules(plan({ stories: [story()] }), 'S62'), []);
  // S37 et S38 : une story qui ne sert aucune exigence, ou qui n'est rattachée à aucune tâche de la
  // story map. En voie rapide, les deux sont normaux — la correction n'a pas d'exigence amont.
  assert.deepEqual(seules(plan({ stories: [story({ frs: [] })] }), 'S37'), ['US-1']);
  assert.deepEqual(seules(plan({ stories: [story({ map_task: '' })] }), 'S38'), ['US-1']);
  const rapide = story({ frs: [], map_task: '', lane: 'rapide', attach_to: 'ACT-01', origin: { type: 'defaut', ref: 'DEF-001' } });
  assert.deepEqual(seules(plan({ stories: [rapide] }), 'S37'), [], 'une story en voie rapide réclame une FR');
  assert.deepEqual(seules(plan({ stories: [rapide] }), 'S38'), [], 'une story en voie rapide réclame une tâche de la map');
  // S42 : au-delà du seuil de règles, la story est probablement à scinder. Le seuil se règle.
  const regles = n => ({ example_map: { session: { date: '2026-11-02', participants: ['métier', 'dev', 'test'] },
    rules: Array.from({ length: n }, (_, i) => ({ ref: `RG-00${i + 1}`, text: 'x', examples: [`EX-00${i + 1}`] })) } });
  assert.deepEqual(seules(plan({ stories: [story(regles(5))] }), 'S42'), ['US-1']);
  assert.deepEqual(seules(plan({ stories: [story(regles(4))] }), 'S42'), []);
  assert.deepEqual(seules(plan({ settings: { cadence: 'sprint', max_rules_per_story: 6 }, stories: [story(regles(5))] }), 'S42'), [],
    'le seuil du projet n\'est pas lu');
  // S46 : des dépendances circulaires entre tâches. Aucune ne peut commencer, et le plan a l'air prêt.
  const tk = (id, o) => ({ id, kind: 'dev', title: 't', story: 'US-1', size: 'S', assignee_type: 'humain', status: 'validé', ...o });
  const boucle = plan({ stories: [story()], tasks: [tk('TK-1', { depends_on: ['TK-2'] }), tk('TK-2', { depends_on: ['TK-1'] })] });
  assert.equal(seules(boucle, 'S46').length, 1);
  assert.match(checkState(boucle).find(f => f.rule === 'S46').message, /TK-1 → TK-2/);
  assert.deepEqual(seules(plan({ stories: [story()], tasks: [tk('TK-1', { depends_on: ['TK-2'] }), tk('TK-2')] }), 'S46'), []);
  // S47 : une tâche planifiée avant celle dont elle dépend. En sprint, la dépendance n'est dans
  // aucune itération ; en flux, elle est plus loin dans la file.
  assert.deepEqual(seules(plan({ stories: [story()],
    tasks: [tk('TK-1', { iteration: 'IT-1', depends_on: ['TK-2'] }), tk('TK-2')] }), 'S47'), ['TK-1']);
  assert.deepEqual(seules(plan({ stories: [story()],
    tasks: [tk('TK-1', { iteration: 'IT-1', depends_on: ['TK-2'] }), tk('TK-2', { iteration: 'IT-1' })] }), 'S47'), []);
  assert.deepEqual(seules(plan({ settings: { cadence: 'flux', flow: { wip_limit: 3 } }, stories: [story()],
    tasks: [tk('TK-1', { order: 1, depends_on: ['TK-2'] }), tk('TK-2', { order: 5 })] }), 'S47'), ['TK-1']);
  // S49 : la limite d'encours, en cadence flux seulement. Non définie, ou dépassée.
  const flux = extra => plan({ settings: { cadence: 'flux', release: 'REL-1', ...extra }, stories: [story()] });
  assert.deepEqual(seules(flux(), 'S49'), ['settings.flow']);
  assert.match(checkState(flux()).find(f => f.rule === 'S49').message, /non définie/);
  const deuxEnCours = { tasks: [tk('TK-1', { status: 'en_cours' }), tk('TK-2', { status: 'en_cours' })] };
  assert.deepEqual(seules({ ...flux({ flow: { wip_limit: 1 } }), ...deuxEnCours }, 'S49'), ['settings.flow']);
  assert.match(checkState({ ...flux({ flow: { wip_limit: 1 } }), ...deuxEnCours }).find(f => f.rule === 'S49').message, /2 tâches en cours pour une limite de 1/);
  assert.deepEqual(seules({ ...flux({ flow: { wip_limit: 3 } }), ...deuxEnCours }, 'S49'), []);
  // En sprint, S49 ne dit rien : la limite d'encours n'est pas le mécanisme de cette cadence.
  assert.deepEqual(seules(plan({ stories: [story()] }), 'S49'), [], 'S49 parle en cadence sprint');
  // S59 : une release livrée sans plan de mesure, ou sans observation ni conclusion. Les améliorations
  // d'après une release sont souvent les plus précieuses, et personne ne les voit sans la mesure.
  const livree = o => plan({ release_tracking: [{ release: 'REL-1', status: 'livrée', ...o }] });
  assert.deepEqual(seules(livree({ outcome: 'atteint' }), 'S59'), ['REL-1']);
  assert.match(checkState(livree({ outcome: 'atteint' })).find(f => f.rule === 'S59').message, /plan de mesure/);
  assert.deepEqual(seules(livree({ measurement: [{ metric: 'MET-01', how: 'h', window: 'w', owner: 'o' }], outcome: 'a_mesurer' }), 'S59'), ['REL-1']);
  assert.match(checkState(livree({ measurement: [{ metric: 'MET-01' }], outcome: 'a_mesurer' })).find(f => f.rule === 'S59').message, /observation/);
  assert.deepEqual(seules(livree({ measurement: [{ metric: 'MET-01' }], outcome: 'partiel' }), 'S59'), []);
  assert.deepEqual(seules(plan({ release_tracking: [{ release: 'REL-1', status: 'en_cours' }] }), 'S59'), [],
    'une release non livrée réclame déjà ses observations');
});

// S70 vivait dans `render-plan.mjs`, en `console.warn` — hors du catalogue, alors que l'en-tête de
// `lib/rules.mjs` dit « une règle n'est définie qu'ici, jamais ailleurs ». Elle était donc invisible au
// lint, au point d'étape et à la porte, et surtout NON DÉROGEABLE : `lint_waivers` ne l'atteignait pas.
test('S70 : la fiche de contexte trop longue est une règle du catalogue, dérogeable', () => {
  const cards = [{ id: 'TK-001', tokens: 3400 }, { id: 'TK-002', tokens: 1200 }];
  assert.deepEqual(contextFindings(cards).map(f => f.id), ['TK-001']);
  assert.match(contextFindings(cards)[0].message, /≈ 3400 tokens pour un budget de 3000/);
  assert.deepEqual(contextFindings(cards, { max: 4000 }), [], 'le budget du projet n\'est pas lu');
  // Et par `checkState`, elle se dérogue comme les autres : une dérogation nommée, avec sa raison.
  const etat = b => ({ document: 'plan', phase: 'schedule', settings: { cadence: 'sprint', context_budget: { max: 3000 } }, ...b });
  assert.deepEqual(checkState(etat({}), { cards }).filter(f => f.rule === 'S70').map(f => f.id), ['TK-001']);
  const derogee = checkState(etat({ lint_waivers: [{ rule: 'S70', id: 'TK-001', reason: 'migration en un bloc, non scindable' }] }), { cards })
    .find(f => f.rule === 'S70');
  assert.match(derogee.waived, /non scindable/, 'S70 ne se dérogue toujours pas');
});

// Chaque `build-handoff.mjs` écrivait `source.status` depuis le début, et un SEUL script le lisait —
// en `console.warn`, que rien ne persiste. « Intègre » veut dire « non altéré », pas « approuvé ».
test('S108 : le document aval dit sur quel état amont il a été construit', () => {
  const prd = st => ({ document: 'prd', phase: 'specify', source_brd: { path: 'brd/demo/handoff/v1.0/handoff.yaml', version: '1.0', status: st } });
  assert.deepEqual(seules(prd('baseline'), 'S108'), []);
  assert.deepEqual(seules(prd('brouillon'), 'S108'), ['source_brd']);
  assert.match(checkState(prd('brouillon')).find(f => f.rule === 'S108').message, /du BRD qui n'était pas une baseline \(état : brouillon\)/);
  // Un état non relevé est le cas le plus courant : le champ n'existait pas, et l'absence ne se lit pas
  // comme une approbation. C'est « on ne sait pas », et ça se dit.
  assert.match(checkState(prd('')).find(f => f.rule === 'S108').message, /état non relevé/);
  // Sans handoff amont déclaré — un PRD autonome —, il n'y a rien à reprocher.
  assert.deepEqual(seules({ document: 'prd', phase: 'specify', mode: 'autonome', source_brd: { path: '' } }, 'S108'), []);
  // Le plan ne recopie pas l'état amont : ses `refs.yaml` portent les handoffs entiers.
  const refs = (p, d) => ({ refs: { prd: { source: { status: p } }, sad: { source: { status: d } } } });
  assert.deepEqual(seules({ document: 'plan', phase: 'slice' }, 'S108', refs('baseline', 'baseline')), []);
  assert.deepEqual(seules({ document: 'plan', phase: 'slice' }, 'S108', refs('en_revue', 'baseline')), ['refs:prd']);
  assert.deepEqual(seules({ document: 'plan', phase: 'slice' }, 'S108', refs('en_revue', 'brouillon')), ['refs:prd', 'refs:sad']);
});

// Cinq avertissements sur seize, au deuxième dossier réel, étaient le chemin que la doctrine prescrit :
// les critères d'acceptation s'écrivent à l'étape 3 de Define et les priorités s'arbitrent à l'étape 4,
// si bien qu'entre l'étape 2 et là, chaque exigence validée criait « sans critère » et « sans
// priorité ». Un contrôle qui crie pendant le travail qu'il prescrit s'apprend à s'ignorer — et il
// s'ignore encore quand il a raison. S04 et S05 sont dus à LA PORTE de Define, pas pendant.
test('S04 et S05 sont dus à la porte de Define, pas pendant le travail qu\'elle prescrit', () => {
  const brd = phase => ({ document: 'brd', phase,
    objectives: [{ id: 'OBJ-1', statement: 'x', indicator: 'i', target: 't', status: 'validé' }],
    candidate_needs: [{ id: 'BC-1', text: 'y', sources: [{ ref: 'SRC-1' }], status: 'intégré' }],
    business_requirements: [{ id: 'BR-1', statement: 'Le service doit accuser réception',
      objectives: ['OBJ-1'], from_needs: ['BC-1'], status: 'validé' }] });
  for (const p of ['assess', 'discover', 'define']) {
    assert.deepEqual(seules(brd(p), 'S04'), [], `S04 crie pendant ${p}`);
    assert.deepEqual(seules(brd(p), 'S05'), [], `S05 crie pendant ${p}`);
  }
  // Une fois la porte franchie, l'absence est une absence. Une version figée porte `govern`.
  assert.deepEqual(seules(brd('govern'), 'S04'), ['BR-1']);
  assert.deepEqual(seules(brd('govern'), 'S05'), ['BR-1']);
  // Un état sans phase est traité comme dû : on ne suppose pas qu'un travail est en cours.
  assert.deepEqual(seules(brd(undefined), 'S05'), ['BR-1']);
  // Et la porte de Define les compte pendant Define, elle : l'information ne disparaît pas, elle
  // change de place — du bruit continu vers le moment où elle se décide.
  const porte = gateConditions(brd('define'));
  const sansPriorite = porte.conditions.find(c => /priorité/.test(c[0]));
  assert.equal(sansPriorite[1], false, 'la porte ne voit pas l\'exigence sans priorité');
  assert.match(sansPriorite[2], /BR-1/);
});

// Vingt règles de structure n'étaient citées par aucun test ni aucun golden. Une règle que personne
// n'exerce est soit du code mort, soit un contrôle qui tire à côté, et on ne l'apprend qu'en
// production, sur le dossier de quelqu'un : S35 réclamait un agrégat à des règles `à_décider` et
// `manuelle`, parce que le filtre inventait une valeur d'énumération. Ce test tient la propriété.
test('aucune règle du catalogue n\'est laissée sans témoin', () => {
  const dir = new URL('.', import.meta.url).pathname;
  const sources = [...readdirSync(dir).filter(f => f.endsWith('.test.mjs')).map(f => readFileSync(join(dir, f), 'utf8')),
    ...readdirSync(join(dir, 'golden')).map(f => readFileSync(join(dir, 'golden', f), 'utf8'))].join('\n');
  const muettes = [...Object.keys(STRUCT_RULES), ...TEXT_RULES.map(r => r.id)]
    .filter(r => !new RegExp(`\\b${r}\\b`).test(sources));
  assert.deepEqual(muettes, [], `règle(s) sans témoin : ${muettes.join(' ')} — un test par règle, l'état qui la viole et le même corrigé`);
});

// L04 : un énoncé qui commence par un pronom. « Il doit accuser réception » — qui, « il » ? L'énoncé
// voyage seul : dans un handoff, dans une fiche de contexte, dans un relevé de relecture, et son
// antécédent reste dans le paragraphe d'où on l'a tiré.
test('L04 : un énoncé ne commence pas par un pronom', () => {
  const brd = statement => ({ document: 'brd', phase: 'define',
    business_requirements: [{ id: 'BR-1', statement, objectives: ['OBJ-1'], from_needs: ['BC-1'] }] });
  for (const p of ['Il doit accuser réception du dossier', 'Elle doit être notifiée', 'Cela doit être tracé', 'Ce dernier doit répondre']) {
    assert.deepEqual(checkState(brd(p)).filter(f => f.rule === 'L04').map(f => f.id), ['BR-1'], `« ${p} » passe`);
  }
  assert.deepEqual(checkState(brd('Le service doit accuser réception du dossier')).filter(f => f.rule === 'L04'), []);
  // « Il » dans la phrase, et non à son ouverture, ne déclenche rien : la règle porte sur l'énoncé qui
  // s'ouvre sur un pronom, pas sur l'usage du pronom.
  assert.deepEqual(checkState(brd('Le service doit accuser réception dès qu\'il reçoit le dossier')).filter(f => f.rule === 'L04'), []);
});

// Trois petits défauts de l'extrait de session et du point d'étape, chacun vu sur un dossier réel.
test('un heredoc est une donnée : pas de fichier nommé « 40 »', () => {
  // L'extrait annonçait un fichier modifié nommé `40` : un « > 40 » écrit dans le TEXTE d'un rapport
  // passé en heredoc, lu comme une redirection de shell. Le corps d'un heredoc est une donnée.
  assert.deepEqual(shellWrittenPaths("cat > rapport.md <<'EOF'\nIl reste plus de > 40 sources à relire.\nEOF"), ['rapport.md']);
  assert.deepEqual(shellWrittenPaths("python3 - <<'PY'\nopen('a.md','w').write('x > 12')\nPY"), []);
  // La ligne d'en-tête porte souvent la vraie cible : on la garde, et on jette jusqu'au délimiteur.
  assert.deepEqual(shellWrittenPaths("cat <<-FIN > sortie.txt\n  texte > ailleurs.md\n\tFIN\nls"), ['sortie.txt']);
  assert.deepEqual(shellWrittenPaths("cat > un.md <<'A'\nx\nA\ncat > deux.md <<'B'\ny > z.md\nB"), ['un.md', 'deux.md']);
  // Un heredoc jamais fermé ne doit pas faire perdre la cible de sa propre ligne.
  assert.deepEqual(shellWrittenPaths("cat > ouvert.md <<'EOF'\nx > jamais.md"), ['ouvert.md']);
  // Une cible faite de chiffres seuls est un descripteur ou une comparaison, jamais un fichier.
  assert.deepEqual(shellWrittenPaths('if [ $n > 40 ]; then echo x; fi'), []);
  assert.deepEqual(shellWrittenPaths('node x.mjs 2>&1 | head'), []);
  // Et les vraies écritures passent toujours.
  assert.deepEqual(shellWrittenPaths('echo ok > fichier.txt'), ['fichier.txt']);
  assert.deepEqual(shellWrittenPaths('ls | tee -a journal.log'), ['journal.log']);
  assert.deepEqual(shellWrittenPaths('node x.mjs > /dev/null'), []);
});

// L'extrait gardait les réponses de l'outil de questions avec leurs questions, et laissait celles en
// texte libre sans aucune réponse — alors que la réponse est le message suivant de l'utilisateur, et
// que c'est le seul endroit où elle se lit. Le numéro affiché ne permettait pas de la retrouver : il
// comptait les RÉPONSES DE L'AGENT (177 au troisième dossier réel) quand la section des messages les
// numérote de 1 à 29. « (tour 13) » désignait une chose absente du document.
test('une question en texte libre sort avec la réponse qui l\'a suivie, sur l\'échelle du document', () => {
  const tour = (role, text, at) => ({ role, text, at, tools: [] });
  const extrait = turns => buildExtract(turns, { date: '2026-11-03', session: 'abc', initiatives: [], event: 'Stop', personnes: [] });
  const libresDe = md => md.split('### En texte libre')[1].split('## Dernière')[0];

  const md = extrait([
    tour('user', 'On reprend le cadrage', '2026-11-03T10:00:00Z'),
    tour('assistant', 'Qui, dans l\'association, décide du périmètre ?', '2026-11-03T10:01:00Z'),
    tour('user', 'C\'est Dédé', '2026-11-03T10:02:00Z'),
    tour('assistant', 'Et sur quoi verra-t-on que c\'est réussi ?', '2026-11-03T10:03:00Z'),
    tour('user', 'Plus aucun écart entre les virements et les dossiers', '2026-11-03T10:04:00Z'),
  ]);
  const libres = libresDe(md);
  // La réponse est joignable : son rang est celui de la section « Messages de l'utilisateur ».
  assert.match(libres, /- Qui, dans l'association, décide du périmètre \?\n  \*\*Réponse\*\* \(message n° 2\) : C'est Dédé$/m);
  assert.match(libres, /\*\*Réponse\*\* \(message n° 3\) : Plus aucun écart/);
  assert.doesNotMatch(libres, /\(tour \d+\)/, 'le numéro de tour de l\'agent est sorti de l\'extrait');
  // Et le rang désigne bien un titre que le document porte.
  assert.match(md, /^### 2\. /m);

  // L'agent poursuit sans attendre : la question d'avant n'a pas été répondue, celle d'après l'a été.
  const recouverte = libresDe(extrait([
    tour('user', 'vas-y', '2026-11-03T10:00:00Z'),
    tour('assistant', 'Qui tranche le périmètre, dans l\'association ?', '2026-11-03T10:01:00Z'),
    tour('assistant', 'Et qui tranche les priorités, alors ?', '2026-11-03T10:02:00Z'),
    tour('user', 'Dédé pour les deux', '2026-11-03T10:03:00Z'),
  ]));
  assert.match(recouverte, /Qui tranche le périmètre.*\n  _Sans réponse : l'agent a poursuivi/);
  assert.match(recouverte, /Et qui tranche les priorités.*\n  \*\*Réponse\*\* \(message n° 2\) : Dédé pour les deux/);

  // Un message qui porte trois questions ouvertes à la fois se dit par le rang de ce qui a répondu.
  const groupe = extrait([
    tour('user', 'ok', '2026-11-03T10:00:00Z'),
    tour('assistant', 'Qui décide du périmètre ? Et des priorités ? Et qui est le recours si personne ne tranche ?', '2026-11-03T10:01:00Z'),
    tour('user', 'Dédé, et pas de recours', '2026-11-03T10:02:00Z'),
  ]);
  assert.match(groupe, /1 message\(s\) de l'agent portent plus d'une question en texte libre : avant le message n° 2 \(3 questions\)/);

  // La dernière réponse de l'agent a reçu un message : ses questions ne sont plus « en suspens ».
  const repondue = extrait([
    tour('user', 'ok', '2026-11-03T10:00:00Z'),
    tour('assistant', 'Combien de familles sont concernées, cette année ?', '2026-11-03T10:01:00Z'),
    tour('user', 'cent quarante-cinq', '2026-11-03T10:02:00Z'),
  ]);
  assert.match(repondue.split('## Questions en suspens')[1], /_Aucune question dans la dernière réponse\._/);
  // Alors que sans réponse, elle y reste.
  const suspens = extrait([
    tour('user', 'ok', '2026-11-03T10:00:00Z'),
    tour('assistant', 'Combien de familles sont concernées, cette année ?', '2026-11-03T10:01:00Z'),
  ]);
  assert.match(suspens.split('## Questions en suspens')[1], /- Combien de familles sont concernées/);
});

test('un fragment cité dans une phrase ne casse pas son bloc de citation', () => {
  // `borne` ajoute sa marque de troncature après DEUX retours à la ligne — juste pour un bloc, et
  // destructeur dans « … » : le bloc de citation du markdown se fermait et le guillemet fermant
  // restait seul sur une ligne de corps de texte.
  const q = `Qui, dans l'association, a le droit de décider qu'une donnée de santé d'un enfant devienne accessible à quelqu'un qui n'y a pas accès aujourd'hui, et pour combien de temps la conserve-t-on (ZO-013) ?`;
  const md = buildExtract([{ role: 'user', text: 'ok', at: '2026-11-02T10:00:00Z' },
    { role: 'assistant', text: q, at: '2026-11-02T10:01:00Z', tools: [] }],
  { date: '2026-11-02', session: 'abc', initiatives: [], event: 'Stop', personnes: [] });
  const ligne = md.split('\n').find(l => /question\(s\) sur/.test(l));
  assert.ok(ligne, 'la ligne des questions à identifiant a disparu');
  assert.match(ligne, /« [^»\n]+… »$/, 'la citation ne se referme pas sur sa propre ligne');
  assert.doesNotMatch(md, /caractère\(s\) de plus dans la transcription\._ »/, 'la marque de bloc est insérée dans une citation');
  // Et elle dit toujours qu'elle a coupé, sans couper en plein mot.
  assert.match(ligne, /d'un enfant… »/);
});
