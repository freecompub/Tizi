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
  const brd = shs => ({ document: 'brd', phase: 'discover', stakeholders: shs, candidate_needs: [{ id: 'BC-001', statement: 'pouvoir suivre un dossier' }] });

  const relais = checkState(brd([sh('SH-01', { represents: 'les agents' })]));
  assert.ok(relais.some(f => f.rule === 'S83' && /représentants/.test(f.message)), 'tout passe par un représentant');

  const terrain = codes(brd([sh('SH-01', { represents: 'les agents' }), sh('SH-02', { end_user: true })]));
  assert.ok(!terrain.includes('S83'), 'un utilisateur direct a été entendu');

  // Un utilisateur direct encore à interroger ne compte pas : c'est justement la dette.
  assert.ok(codes(brd([sh('SH-01'), sh('SH-02', { end_user: true, status: 'à interroger' })])).includes('S83'));
  // Et avant tout recueil, la règle ne dit rien.
  assert.ok(!codes({ document: 'brd', phase: 'discover', stakeholders: [sh('SH-01')] }).includes('S83'));
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
