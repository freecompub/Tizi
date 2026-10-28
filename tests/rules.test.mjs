// Règles du catalogue commun, sur des états minimaux construits pour chaque cas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkState, evidenceOf } from '../skills/brd-builder/scripts/lib/rules.mjs';

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

// Un guide d'entretien est un fichier dont l'état ne sait rien. Au deuxième dossier réel, celui du
// directeur a été écrit le 27 alors qu'il était absent — c'était juste — et le 28 il a répondu en
// direct dans six sources : les deux décisions que le guide annonçait ont été rendues, et
// `session.next_action` envoyait toujours conduire l'entretien, deux sessions plus tard.
test('S96 : un guide se périme quand son absent arrive', async () => {
  const { interviewFindings } = await import('../skills/brd-builder/scripts/lib/rules.mjs');
  const s = {
    document: 'brd', phase: 'discover',
    stakeholders: [{ id: 'SH-01' }, { id: 'SH-02' }, { id: 'SH-04' }],
    sources: [
      { id: 'SRC-1', type: 'cadrage', date: '2026-10-27', stakeholders: ['SH-01'], present: ['SH-01'] },
      { id: 'SRC-2', type: 'entretien', date: '2026-10-28', stakeholders: ['SH-02'], present: ['SH-01', 'SH-02'] },
    ],
  };
  const f = interviewFindings(s, ['guide-SH-02.md', 'guide-SH-04.md']);
  assert.equal(f.length, 1, JSON.stringify(f));
  assert.equal(f[0].id, 'guide-SH-02.md');
  assert.match(f[0].message, /dans la salle du dernier échange \(2026-10-28\)/);
  // La salle est celle du DERNIER échange : présent la veille et absent depuis, le guide est légitime.
  assert.equal(interviewFindings({ ...s, sources: [s.sources[0]] }, ['guide-SH-02.md']).length, 0, 'la salle de la veille vaut celle d\'aujourd\'hui');
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
