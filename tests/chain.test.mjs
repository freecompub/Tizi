// Chaîne BRD → PRD → conception → plan → exécution : vérification, rendu, intégrité des handoffs, verrous.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, appendFileSync, readdirSync, existsSync, cpSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { sandbox, node, script, golden, lintSignature, tempDir, FIX, SKILLS } from './helpers.mjs';

const DOCS = { brd: 'brd-builder', prd: 'prd-builder', sad: 'sad-builder', plan: 'plan-builder' };
const RENDER = { brd: ['render-brd.mjs', 'brd.md'], prd: ['render-prd.mjs', 'prd.md'], sad: ['render-sad.mjs', 'sad.md'], plan: ['render-plan.mjs', 'plan.md'] };

for (const [doc, skill] of Object.entries(DOCS)) {
  test(`${doc} : la vérification émet exactement les constats attendus`, () => {
    const dir = sandbox();
    const r = node(script(skill, 'lint.mjs'), [`${doc}/demo/state.yaml`], { cwd: dir });
    assert.equal(r.code, 0, r.err);
    golden(`lint-${doc}`, lintSignature(r.out));
  });
  test(`${doc} : le document se génère, avec la mention de relecture humaine`, () => {
    const dir = sandbox();
    const [scr, out] = RENDER[doc];
    const r = node(script(skill, scr), [`${doc}/demo/state.yaml`], { cwd: dir });
    assert.equal(r.code, 0, r.err);
    const md = readFileSync(join(dir, doc, 'demo', out), 'utf8');
    assert.match(md, /## Relecture humaine/);
    assert.doesNotMatch(md, /undefined|\[object Object\]/, 'valeur non rendue dans le document');
  });
}

test('handoffs : intègres, puis refusés une fois altérés', () => {
  const dir = sandbox();
  for (const doc of ['brd', 'prd', 'sad', 'plan']) {
    const hdir = join(dir, doc, 'demo', 'handoff');
    if (!existsSync(hdir)) continue;
    for (const v of readdirSync(hdir)) {
      const h = join(hdir, v, 'handoff.yaml');
      assert.equal(node(script('brd-builder', 'verify-handoff.mjs'), [h], { cwd: dir }).code, 0, `${doc} ${v} devrait être intègre`);
      appendFileSync(h, '\n# altération\n');
      assert.notEqual(node(script('brd-builder', 'verify-handoff.mjs'), [h], { cwd: dir }).code, 0, `${doc} ${v} altéré devrait être refusé`);
    }
  }
});

test('le col scelle le document, pas seulement l\'état (source_doc)', () => {
  const dir = sandbox();
  const h = join(dir, 'brd/demo/handoff/v1.0/handoff.yaml');
  const frozen = join(dir, 'brd/demo/versions/v1.0');
  const verify = () => node(script('prd-builder', 'verify-handoff.mjs'), [h], { cwd: dir });
  assert.equal(verify().code, 0, 'handoff intact');

  // Le document figé est ce que relisent et approuvent les personnes : l'altérer doit fermer le col.
  // Avant le scellement du document, seul l'état était couvert et cette modification passait.
  const doc = join(frozen, 'brd.md');
  writeFileSync(doc, `ALTÉRÉ\n${readFileSync(doc, 'utf8')}`);
  const alt = verify();
  assert.notEqual(alt.code, 0, 'document figé altéré : doit être refusé');
  assert.match(alt.err + alt.out, /document figé d'origine \(brd\.md\) a été modifié/);
  writeFileSync(doc, readFileSync(doc, 'utf8').replace('ALTÉRÉ\n', ''));
  assert.equal(verify().code, 0, 'document rétabli');

  // Vider l'empreinte et recalculer le .sha256 voisin désarmait le contrôle en silence.
  const etat = join(frozen, 'state.yaml');
  appendFileSync(etat, '\n# tampered\n');
  assert.notEqual(verify().code, 0, 'état figé altéré : doit être refusé');
  writeFileSync(h, readFileSync(h, 'utf8').replace(/source_state: [0-9a-f]{64}/, "source_state: ''"));
  writeFileSync(`${h}.sha256`, `${createHash('sha256').update(readFileSync(h)).digest('hex')}  handoff.yaml\n`);
  const vide = verify();
  assert.notEqual(vide.code, 0, 'empreinte vidée : le contrôle ne doit pas être sauté');
  assert.match(vide.err + vide.out, /ne porte pas l'empreinte de sa version figée/);
});

test('exécuteur : refuse un plan d\'opérations non approuvé, puis altéré', () => {
  const dir = sandbox();
  const prep = node(script('plan-builder', 'plan-operations.mjs'), ['plan/demo/state.yaml', '--target', 'github', '--offline'], { cwd: dir });
  assert.equal(prep.code, 0, prep.err);
  const ops = 'plan/demo/exports/github/operations.yaml';
  const r1 = node(script('backlog-executor', 'apply-operations.mjs'), [ops, '--state', 'plan/demo/state.yaml', '--dry-run'], { cwd: dir });
  assert.notEqual(r1.code, 0); assert.match(r1.out + r1.err, /aucune approbation/);
  appendFileSync(join(dir, ops), '\n# altération\n');
  const r2 = node(script('backlog-executor', 'apply-operations.mjs'), [ops, '--state', 'plan/demo/state.yaml', '--dry-run'], { cwd: dir });
  assert.notEqual(r2.code, 0); assert.match(r2.out + r2.err, /empreinte|intégrité|altér/i);
});

test('pont design thinking : propositions sans modifier l\'état', () => {
  const dir = sandbox();
  const before = readFileSync(join(dir, 'brd/demo/state.yaml'), 'utf8');
  const r = node(script('brd-builder', 'ingest-dt-handoff.mjs'), [join(FIX, 'dt-handoff-summary.md'), 'brd/demo/state.yaml'], { cwd: dir });
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /1 contrainte\(s\) · 1 hypothèse\(s\) · 3 zone\(s\) d'ombre · 1 document\(s\)/);
  assert.equal(readFileSync(join(dir, 'brd/demo/state.yaml'), 'utf8'), before, 'l\'état ne doit pas être modifié');
});

// Le garde-fou ci-dessus — `undefined` et `[object Object]` interdits dans un document généré — est
// juste, et il n'a rien vu pendant des mois : `exemple/brd/demo` ne renseigne ni `problem.symptoms`,
// ni `problem.impact`, ni `current_process`. Un contrôle ne vaut que l'état qu'on lui donne à lire.
// Sur le deuxième dossier réel, le BRD figé en 0.2 et envoyé à cinq relecteurs portait DIX
// `[object Object]` — sept symptômes et trois impacts, tous renseignés et sourcés dans l'état — et
// annonçait « Aucun élément » sous « Processus actuel » là où l'état tenait sept étapes sourcées,
// parce que `current_process` était une liste nue quand `target_process` est un objet portant
// `.events`. Cette fixture renseigne, dans la forme que le gabarit documente, les collections que le
// cas d'exemple laisse vides.
test('brd : chaque forme documentée du gabarit se rend dans le document', () => {
  const dir = tempDir('tizi-formes');
  mkdirSync(join(dir, 'brd', 'formes'), { recursive: true });
  cpSync(join(FIX, 'brd-formes-documentees.yaml'), join(dir, 'brd', 'formes', 'state.yaml'));
  const r = node(script('brd-builder', 'render-brd.mjs'), ['brd/formes/state.yaml'], { cwd: dir });
  assert.equal(r.code, 0, r.err);
  const md = readFileSync(join(dir, 'brd', 'formes', 'brd.md'), 'utf8');
  assert.doesNotMatch(md, /undefined|\[object Object\]|NaN/, 'valeur non rendue dans le document');

  // Chaque valeur renseignée paraît, avec ce qui la qualifie : sa source, son type, sa raison.
  for (const [quoi, motif] of [
    ['un symptôme', /- Un symptôme porte son texte et sa source \(SRC-01\)/],
    ['un impact, avec son type', /- \*\*risque\*\* — Un impact porte son type, son texte et sa source \(SRC-01\)/],
    ['une étape du processus actuel', /- Le dossier arrive au bureau — Awa \(SH-01\) \(SRC-01\)/],
    ['un impact organisationnel', /- Le bureau relance les familles attendues \(SRC-01\)/],
    ['une inclusion de périmètre, avec sa raison', /- Ce qui est dans le périmètre — parce qu'une inclusion se justifie/],
    ['une exclusion de périmètre, avec sa raison', /- Ce qui en sort — parce que rien ne sort en silence/],
  ]) assert.match(md, motif, `${quoi} ne se rend pas`);

  // Le passage de phase est une décision comme les autres : il a un décideur, une date, et l'état de
  // la porte au moment où elle a été franchie — dérogations comprises. Faute de champ, l'agent
  // l'écrivait en commentaire de `state.yaml`, et aucun relecteur ne lit le YAML.
  assert.match(md, /### Parcours des phases/, 'le parcours des phases ne se rend pas');
  assert.match(md, /\| Assess \| Discover \| 2026-10-29 \| Awa \(SH-01\) \| 2 conditions sur 2 \|/);
  assert.match(md, /\| Discover \| Define \| 2026-11-02 \| Awa \(SH-01\) \| 10 conditions sur 11 ; dérogation : toutes les parties prenantes entendues — une seule voix, assumée par écrit \|/);

  // Et la section « Processus actuel » ne dit pas « Aucun élément » quand l'état en porte.
  const actuel = md.split('### Processus actuel')[1].split('### Processus cible')[0];
  assert.doesNotMatch(actuel, /Aucun élément/, 'le processus actuel est rendu vide alors que l\'état en porte');
});

// Le document du dossier et la copie figée dans `versions/` étaient IDENTIQUES à l'octet près, en-tête
// comprise : « Document généré à partir de state.yaml le <date> ». Rien ne disait lequel était figé et
// lequel allait dériver à la prochaine modification de l'état — et qui ouvrait l'un croyait lire ce qui
// était parti en revue. Vu sur le deuxième dossier réel, où la question est venue de l'utilisateur.
test('le document du dossier se dit copie de travail, la version figée se dit figée', () => {
  const dir = sandbox();
  const sp = join(dir, 'brd', 'demo', 'state.yaml');
  writeFileSync(sp, readFileSync(sp, 'utf8').replace('version: "1.0"', 'version: "1.1"'));
  assert.equal(node(script('brd-builder', 'render-brd.mjs'), ['brd/demo/state.yaml'], { cwd: dir }).code, 0);
  const f = node(script('brd-builder', 'freeze-version.mjs'), ['brd/demo/state.yaml'], { cwd: dir });
  assert.equal(f.code, 0, f.err);
  const tete = p => readFileSync(join(dir, 'brd', 'demo', p), 'utf8').split('\n').find(l => l.startsWith('>'));
  assert.match(tete('brd.md'), /\*\*Copie de travail\*\*/, 'le document du dossier ne se dit pas copie de travail');
  assert.match(tete('brd.md'), /réécrite à chaque génération/, 'rien ne dit que la copie de travail va dériver');
  assert.match(tete('versions/v1.1/brd.md'), /\*\*Version figée 1\.1\*\*/, 'la copie figée ne se dit pas figée');
  assert.match(tete('versions/v1.1/brd.md'), /ne se régénère pas/, 'rien ne distingue la copie immuable');
  assert.notEqual(tete('brd.md'), tete('versions/v1.1/brd.md'), 'les deux en-têtes sont identiques');

  // Et les quatre générateurs disent la même chose, pour que le lecteur n'ait pas à apprendre quatre formes.
  for (const [skill, scr] of [['prd-builder', 'render-prd.mjs'], ['sad-builder', 'render-sad.mjs'], ['plan-builder', 'render-plan.mjs']]) {
    assert.match(readFileSync(join(SKILLS, skill, 'scripts', scr), 'utf8'), /\*\*Copie de travail\*\*/, `${scr} garde l'ancienne en-tête`);
  }
});

// Le relevé à relire se génère. La méthode avait le contrôle — `feedback` sur la source, `S84` sur
// l'exigence — et aucun instrument pour le satisfaire : ni script, ni gabarit, ni doctrine. L'agent a
// inventé la forme, bonne, mais il tapait les identifiants de mémoire : les trois relevés envoyés à
// trois personnes portaient 30 adresses que leur propre fichier ne glosait nulle part.
test('relevé à relire : généré, chaque identifiant glosé sur place, et une source muette le dit', () => {
  const dir = tempDir('tizi-relecture');
  mkdirSync(join(dir, 'brd', 'demo'), { recursive: true });
  const etat = join(dir, 'brd', 'demo', 'state.yaml');
  writeFileSync(etat, [
    'document: brd', 'phase: define',
    'initiative: { name: "Dématérialisation", slug: demo }',
    'stakeholders:',
    '  - { id: SH-01, name: "Samir", role: "parent d\'élève", status: interrogée }',
    '  - { id: SH-02, name: "Dédé", role: "président", status: interrogée }',
    'sources:',
    '  - { id: SRC-01, type: entretien, date: "2026-10-29", stakeholders: [SH-01], quote: "Elle revient pour compléter le dossier.", understood: "Pas un refus : un retour au bureau." }',
    '  - { id: SRC-02, type: entretien, date: "2026-10-30", stakeholders: [SH-01] }',
    '  - { id: SRC-03, type: décision, date: "2026-11-02", stakeholders: [SH-01], quote: "« Oui. »", confirms: [BC-02] }',
    '  - { id: SRC-04, type: entretien, date: "2026-10-28", stakeholders: [SH-02], quote: "Le dossier va dans la corbeille." }',
    'candidate_needs:',
    '  - { id: BC-01, text: "Ne pas refaire tout le dossier quand une pièce manque", sources: [{ ref: SRC-01 }], status: confirmé }',
    '  - { id: BC-02, text: "Savoir que le dossier déposé a bien été reçu", sources: [{ ref: SRC-04 }], status: confirmé }',
  ].join('\n'));
  const run = (...a) => node(script('brd-builder', 'review-sources.mjs'), [etat, ...a], { cwd: dir });

  // L'état de la relecture : la charge n'est pas la même pour tous, et c'est au demandeur de le savoir.
  const etatOut = run('--etat');
  assert.equal(etatOut.code, 0, etatOut.err);
  assert.match(etatOut.out, /Samir \(SH-01\)\s*\|\s*3\s*\|\s*2\s*\|/, 'la charge par personne n\'est pas comptée');
  assert.match(etatOut.out, /Charge la plus lourde : Samir \(SH-01\), 3 source\(s\) sur 4/);
  assert.match(etatOut.out, /1 source\(s\) de parole ne portent pas ce qui a été dit/);

  assert.equal(run('--sh', 'SH-01').code, 0);
  const md = readFileSync(join(dir, 'brd/demo/interviews/relecture-SH-01.md'), 'utf8');
  assert.match(md, /^# Relevé à relire — Samir \(SH-01\)/);
  // Le verbatim mot pour mot, et ce qui en a été tiré, séparés.
  assert.match(md, /> Elle revient pour compléter le dossier\./);
  assert.match(md, /Ce qui en a été tiré : Pas un refus : un retour au bureau\./);
  // Une source sans contenu le dit en creux : c'est le seul endroit où la personne peut s'apercevoir
  // qu'on a perdu ce qu'elle a dit.
  assert.match(md, /### Entretien du 2026-10-30 \(SRC-02\)\n\n\*Rien n'a été écrit pour cette source/);
  // Ce qui a été construit depuis ses propos, chaque ligne avec son énoncé.
  assert.match(md, /- Ne pas refaire tout le dossier quand une pièce manque \(BC-01\) — confirmé/);
  // Et ce qu'elle a confirmé de vive voix, même si ce besoin ne repose pas sur ses sources : sans cette
  // section, le relevé disait que Samir avait répondu sur cinq besoins et n'en montrait que trois.
  assert.match(md, /## Ce que vous avez déjà confirmé de vive voix/);
  assert.match(md, /- Savoir que le dossier déposé a bien été reçu \(BC-02\)/);

  // Zéro constat S104 : chaque identifiant est glosé sur place, par construction.
  const lint = node(script('brd-builder', 'lint.mjs'), [etat], { cwd: dir });
  assert.doesNotMatch(lint.out, /S104/, `le relevé généré parle par adresses :\n${lint.out}`);

  // Un fichier déjà écrit n'est pas remplacé : les corrections de la personne y sont peut-être.
  writeFileSync(join(dir, 'brd/demo/interviews/relecture-SH-01.md'), 'corrigé à la main');
  assert.match(run('--sh', 'SH-01').out, /existe déjà : non remplacé/);
  assert.equal(readFileSync(join(dir, 'brd/demo/interviews/relecture-SH-01.md'), 'utf8'), 'corrigé à la main');
  // Et on ne fait pas relire un relevé vide à quelqu'un qu'on n'a pas entendu.
  assert.notEqual(run('--sh', 'SH-09').code, 0);
});
