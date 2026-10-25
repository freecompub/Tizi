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
