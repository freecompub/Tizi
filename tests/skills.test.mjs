// Conformité des skills à la spécification Agent Skills et identité des fichiers communs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { SKILLS, ROOT, run, node, script, tempDir } from './helpers.mjs';
import yaml from '../skills/brd-builder/scripts/lib/vendor/js-yaml.mjs';

const skills = readdirSync(SKILLS).filter(d => existsSync(join(SKILLS, d, 'SKILL.md')));
test('sept skills présents', () => assert.equal(skills.length, 7));
for (const s of skills) test(`${s} : en-tête conforme à la spécification Agent Skills`, () => {
  const text = readFileSync(join(SKILLS, s, 'SKILL.md'), 'utf8');
  const fm = yaml.load(text.split(/^---$/m)[1]);
  assert.equal(fm.name, s, 'name doit égaler le nom du dossier');
  assert.match(fm.name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  assert.ok(fm.description.length > 0 && fm.description.length <= 1024, `description : ${fm.description.length} caractères`);
  if (fm.compatibility) assert.ok(fm.compatibility.length <= 500);
  if (fm['allowed-tools']) assert.doesNotMatch(fm['allowed-tools'], /,/, 'allowed-tools : séparé par des espaces');
  assert.ok(text.split('\n').length < 500, 'SKILL.md doit rester sous 500 lignes');
});
for (const s of skills) for (const f of existsSync(join(SKILLS, s, 'agents')) ? readdirSync(join(SKILLS, s, 'agents')) : []) test(`${s}/agents/${f} : en-tête lisible`, () => {
  const fm = yaml.load(readFileSync(join(SKILLS, s, 'agents', f), 'utf8').split(/^---$/m)[1]);
  assert.equal(fm.name, f.replace(/\.md$/, '')); assert.ok(fm.description);
});
const COMMON = ['lib/common.mjs', 'lib/agent-io.mjs', 'lib/sessions.mjs', 'lib/vendor/js-yaml.mjs', 'session-capture.mjs', 'session-search.mjs', 'status.mjs', 'next-step.mjs', 'choose-path.mjs', 'sync-agent-instructions.mjs', 'adopt.mjs', 'block.mjs', 'due-reviews.mjs', 'session-start.mjs', 'constitution.mjs', 'ask-five.mjs', 'review-checklist.mjs', 'lib/checklists.mjs', 'cross-context.mjs', 'cross-merge.mjs', 'lib/rules.mjs', 'lint.mjs', 'freeze-version.mjs', 'verify-handoff.mjs', 'lib/testing.mjs', 'defect.mjs'];
for (const f of COMMON) test(`fichier commun identique partout : ${f}`, () => {
  const hashes = skills.filter(s => existsSync(join(SKILLS, s, 'scripts', f))).map(s => createHash('md5').update(readFileSync(join(SKILLS, s, 'scripts', f))).digest('hex'));
  assert.ok(hashes.length >= 2); assert.equal(new Set(hashes).size, 1, `${f} diverge entre skills`);
});

// Les références homonymes ne sont pas toutes communes : council.md, lenses.md, phase-govern.md et
// shadow-zones.md sont propres à chaque skill par construction, et l'invariant par défaut ci-dessous
// ne porte que sur les scripts. Deux références sont vraiment communes et doivent rester identiques :
// la continuité entre sessions, et la forme d'une question.
const COMMON_REFS = ['sessions.md', 'questions.md'];
for (const f of COMMON_REFS) test(`référence commune identique partout : ${f}`, () => {
  const copies = skills.filter(s => existsSync(join(SKILLS, s, 'references', f)));
  assert.deepEqual(copies, skills, `${f} manque dans un skill`);
  const hashes = copies.map(s => createHash('md5').update(readFileSync(join(SKILLS, s, 'references', f))).digest('hex'));
  assert.equal(new Set(hashes).size, 1, `${f} diverge entre skills`);
});

// Sortie du BRD au deuxième test : « Deux choses à valider » suivi de cinq validations, d'une
// recommandation, d'une information et d'une offre — sans qu'aucune ne dise ce qu'elle attendait. Le
// point 2 n'avait même pas de verbe. Devant un message comme ça, la réponse est « ok », et cinq
// validations s'enregistrent sans avoir été lues.
test('questions : une attente par tour, et le dialogue comme seul signal de demande', () => {
  const text = readFileSync(join(SKILLS, 'brd-builder', 'references', 'questions.md'), 'utf8');
  for (const [quoi, motif] of [
    ['le dialogue n\'est pas désigné comme seul signal d\'une demande', /dialogue est le seul signal/],
    ['rien n\'interdit d\'informer par une boîte de dialogue', /jamais de dialogue pour informer/],
    ['le nombre d\'attentes par tour n\'est pas dit', /[Uu]ne attente par tour/],
    ['une validation peut encore porter sur plusieurs affirmations', /une affirmation à la fois/],
    ['une question sans réponse peut être rajoutée à la pile suivante', /se repose seule/],
  ]) assert.match(text, motif, quoi);
});

// Le council a été proposé au lieu d'être lancé, puis annoncé au lieu d'être tenu, et le principe
// candidat « proposé une fois, non demandé ». Trois fois le même réflexe : demander la permission de
// faire une étape qui n'engage à rien. La règle nomme le motif, pas les cas.
test('ce qui ne se demande pas : les étapes prescrites et non engageantes sont nommées', () => {
  const text = readFileSync(join(SKILLS, 'brd-builder', 'references', 'questions.md'), 'utf8');
  assert.match(text, /## Ce qui ne se demande pas/, 'la règle n\'existe pas');
  assert.match(text, /council/i, 'le council n\'est pas nommé parmi les étapes qui ne se demandent pas');
  assert.match(text, /constitution\.mjs --proposer/, 'le principe candidat n\'est pas nommé');
  assert.match(text, /autorisation de proposer/, 'rien n\'interdit de demander l\'autorisation de proposer');
  // Ce qui écrit hors du dossier de l'initiative, lui, se demande : la règle doit le dire aussi.
  assert.match(text, /sync-agent-instructions\.mjs/, 'la limite de la règle n\'est pas dite');
  // Et la consigne qui a produit le défaut doit être à l'impératif.
  assert.match(readFileSync(join(SKILLS, 'brd-builder', 'references', 'phase-discover.md'), 'utf8'),
    /propose-la comme \*\*principe candidat\*\*/, 'le principe candidat n\'est plus prescrit à l\'impératif');
});

// Le council en mode préparation existe pour remplir les guides d'entretien. Au deuxième test, l'agent
// annonçait le guide d'abord et le council « ensuite » : fait dans cet ordre, il arrive après
// l'entretien qu'il devait préparer, et une partie prenante ne se reçoit pas trois fois.
test('council de préparation : avant les guides d\'entretien, et jamais nommé à l\'utilisateur', () => {
  const disc = readFileSync(join(SKILLS, 'brd-builder', 'references', 'phase-discover.md'), 'utf8');
  const guide = disc.split('## 3. Préparation d\'un entretien')[1].split(/\n## /)[0];
  assert.match(guide, /council en mode préparation passe avant/, 'un guide peut encore se préparer avant le council');
  for (const s of skills) {
    const c = join(SKILLS, s, 'references', 'council.md');
    if (!existsSync(c)) continue;
    const text = readFileSync(c, 'utf8');
    assert.ok(!/se \*\*trient\*\* avant de se poser/.test(text), `${s}/council.md : les questions du council se trient encore avec l'utilisateur`);
    assert.match(text, /ne s'annonce pas/, `${s}/council.md : le council peut encore s'annoncer`);
    assert.match(text, /jamais le council dans ce que tu écris|ne nommes jamais le council/, `${s}/council.md : rien n'interdit de nommer le council à l'utilisateur`);
    assert.match(text, /déjà validé/, `${s}/council.md : l'exception (contradiction avec une validation) manque`);
    assert.match(text, /blocking_guess/, `${s}/council.md : blocking_guess reste un champ sans emploi`);
  }
  // Et les conditions de sortie de phase ne demandent plus un tri.
  for (const s of skills) {
    const refs = join(SKILLS, s, 'references');
    if (!existsSync(refs)) continue;
    for (const r of readdirSync(refs).filter(x => x.startsWith('phase-'))) {
      assert.ok(!/questions trié/.test(readFileSync(join(refs, r), 'utf8')), `${s}/${r} : une condition de sortie demande encore un tri des questions du council`);
    }
  }
});

// La suite comptait 29 créations de dossier temporaire pour 8 suppressions : une centaine de mégaoctets
// par passe, jamais reprise. En CI le conteneur est jeté et ça ne se voit pas ; en local ça s'accumule
// jusqu'au quota disque — 2 665 dossiers abandonnés, et la suite ne pouvait plus tourner. Même défaut
// que `.tizi/ci-audit.md` : vérifier ne doit salir ni le dépôt, ni la machine de qui vérifie.
test('ni la suite ni les bancs ne laissent de dossier temporaire derrière eux', () => {
  for (const f of readdirSync(join(ROOT, 'tests')).filter(x => x.endsWith('.test.mjs'))) {
    // L'appel, pas le mot : ce fichier-ci le nomme dans son propre message d'erreur.
    assert.ok(!/mkdtempSync\s*\(/.test(readFileSync(join(ROOT, 'tests', f), 'utf8')),
      `tests/${f} : crée un dossier temporaire à la main — passer par tempDir() de helpers.mjs, qui le reprend à la sortie`);
  }
  assert.match(readFileSync(join(ROOT, 'tests', 'helpers.mjs'), 'utf8'), /process\.on\('exit'/, 'helpers.mjs ne reprend plus ses dossiers');
  for (const f of readdirSync(join(ROOT, 'evals')).filter(x => x.endsWith('.mjs'))) {
    const text = readFileSync(join(ROOT, 'evals', f), 'utf8');
    if (!/mkdtempSync\s*\(/.test(text)) continue;
    assert.match(text, /rmSync/, `evals/${f} : crée un dossier temporaire sans le reprendre`);
  }
});

// Un script livré dans un skill sans que rien ne dise de l'appeler est du poids mort — et pire quand une
// règle sanctionne son absence : `review-checklist.mjs` était livré dans les sept skills, prescrit dans
// deux, et `S80` fermait la porte de gouvernance du BRD sur des listes qu'aucune de ses phases ne disait
// de produire. `block.mjs` et les deux scripts d'analyse croisée étaient dans le même cas, cinq copies
// chacun. Même famille que le council du plan, qui avait un moment prescrit et aucun appelant.
test('aucun script livré sans appelant', () => {
  const communs = [join(ROOT, 'entrypoints', 'entrypoints.yaml'), join(ROOT, 'install.mjs'),
    join(ROOT, 'hooks', 'hooks.json'), join(ROOT, 'com.github.copilot', 'hooks', 'hooks.json')]
    .filter(existsSync).map(p => readFileSync(p, 'utf8'));
  const flux = join(ROOT, '.github', 'workflows');
  if (existsSync(flux)) for (const w of readdirSync(flux)) communs.push(readFileSync(join(flux, w), 'utf8'));
  for (const s of skills) {
    const refs = join(SKILLS, s, 'references');
    const dits = [readFileSync(join(SKILLS, s, 'SKILL.md'), 'utf8'),
      ...(existsSync(refs) ? readdirSync(refs).map(r => readFileSync(join(refs, r), 'utf8')) : []), ...communs];
    for (const n of readdirSync(join(SKILLS, s, 'scripts')).filter(x => x.endsWith('.mjs'))) {
      assert.ok(dits.some(x => x.includes(n)),
        `${s}/scripts/${n} : aucun appelant — ni phase, ni SKILL.md, ni point d'entrée, ni hook, ni CI`);
    }
  }
});

// Un council cherche ce que l'agent a manqué : le faire dépendre de son accord, ou de la patience de
// l'utilisateur, revient à rendre optionnelle la seule vérification adversariale de l'étape. Et un
// council défini sans phase pour le lancer n'existe pas : plan-builder en avait un dans ce cas.
test('un council se lance, et chaque council défini a une phase qui le lance', () => {
  for (const s of skills) {
    if (!existsSync(join(SKILLS, s, 'references', 'council.md'))) continue;
    const phases = readdirSync(join(SKILLS, s, 'references')).filter(f => f.startsWith('phase-'));
    const textes = phases.map(f => readFileSync(join(SKILLS, s, 'references', f), 'utf8'));
    for (const [i, t] of textes.entries()) {
      // Ligne par ligne : « proposé après le cadrage […] Ne le lance qu'avec l'accord de l'utilisateur »
      // ne contient pas « propose un council », et avait survécu au correctif du 24 octobre.
      assert.ok(!/propose[rz]?\s+(ensuite\s+)?un council/i.test(t), `${s}/${phases[i]} : le council y est proposé au lieu d'être lancé`);
      // Et dans la SECTION consacrée au council : c'est là que vivait la phrase qui a survécu au
      // correctif du 24 octobre — « Déclencheur : proposé après le cadrage […] Ne le lance qu'avec
      // l'accord de l'utilisateur ». Le mot « council » n'y était que dans le titre, donc aucune
      // recherche par ligne ou par phrase ne pouvait l'attraper.
      for (const section of t.split(/^#+ /m).filter(x => /^[^\n]*council/i.test(x))) {
        // Une phrase qui dit que le council NE se propose PAS est le contraire d'un manquement.
        const affirmatif = section.replace(/ne\s+(?:se\s+|l[ae]\s+|l'|le\s+)?propos\w+\s+(?:pas|jamais)/gi, '');
        const titre = section.split('\n')[0].trim();
        assert.doesNotMatch(affirmatif, /propos(e|er|ez|é|ée)\b/i, `${s}/${phases[i]} § ${titre} : le council y est proposé au lieu d'être lancé`);
        assert.doesNotMatch(section, /accord de l'utilisateur|si l'utilisateur (le |l')?(veut|demande|accepte)/i, `${s}/${phases[i]} § ${titre} : le council y dépend de l'accord de l'utilisateur`);
      }
    }
    assert.ok(textes.some(t => /\*\*lance\*\*\s+un council|lance\s+(ensuite\s+)?un council/i.test(t)),
      `${s} : council.md existe, mais aucune phase ne le lance`);
  }
});

// Le premier dossier réel a enregistré « 40 proposées, 39 écartées, 1 retenue » : trois entiers, et les
// 39 questions dans un scratchpad de session, hors dépôt. On ne peut plus savoir si le council a fait du
// bruit ou si l'arbitrage a jeté de bonnes questions. Un council qui ne garde que des compteurs ne se relit pas.
test('un council garde ses questions, pas seulement leur nombre', () => {
  for (const s of skills) {
    if (!existsSync(join(SKILLS, s, 'references', 'council.md'))) continue;
    const tpl = readFileSync(join(SKILLS, s, 'templates', 'state.yaml'), 'utf8');
    assert.match(tpl, /council_runs/, `${s} : council.md existe, mais le gabarit n'a pas de council_runs`);
    assert.match(tpl, /^#\s+questions:/m, `${s} : council_runs ne garde pas les questions`);
    assert.match(tpl, /outcome: retenue\s+# retenue \| écartée \| réservée/, `${s} : le sort de chaque question du council n'est pas dit`);
    assert.ok(!/^#\s+(discarded|retained):/m.test(tpl), `${s} : council_runs garde encore des compteurs à la place des questions`);
    const ref = readFileSync(join(SKILLS, s, 'references', 'council.md'), 'utf8');
    // Le motif, pas la formulation : « les questions elles-mêmes » et « les questions qui visent cette
    // initiative » disent la même exigence, et la seconde est arrivée avec les passages partagés.
    assert.match(ref, /les questions (elles-mêmes|qui visent)/, `${s}/council.md : la trace ne demande pas les questions`);
  }
});

// Un council unique sur deux initiatives a inscrit « 40 proposées, 39 écartées » dans chacune : le dépôt
// en déclarait 80 pour 40 produites, et le second dossier affichait « 0 retenue sur 40 » — ce qui se lit
// « le council n'a rien trouvé pour moi » alors qu'il n'a jamais tourné pour lui seul. La vérité était en
// commentaire YAML, que rien ne lit — comme le `decision: jeter` de l'initiative découpée.
test('un passage de council partagé nomme sa portée', () => {
  for (const s of skills) {
    const c = join(SKILLS, s, 'references', 'council.md');
    if (!existsSync(c)) continue;
    const ref = readFileSync(c, 'utf8');
    assert.match(ref, /passage peut couvrir plusieurs initiatives/, `${s}/council.md : un council partagé n'est pas prévu`);
    assert.match(ref, /portée soit nommée|\*\*portée\*\*/, `${s}/council.md : la portée d'un passage partagé n'est pas exigée`);
    const tpl = readFileSync(join(SKILLS, s, 'templates', 'state.yaml'), 'utf8');
    assert.match(tpl, /^#\s+initiatives: \[\]/m, `${s} : council_runs ne peut pas dire quelles initiatives un passage couvre`);
    // Les compteurs portent sur le passage, les questions sur l'initiative : sans ça, l'un des deux ment.
    assert.match(tpl, /pour TOUT le passage/, `${s} : rien ne dit que proposed est le compte du passage, pas celui du dossier`);
    assert.match(tpl, /porte sur cette initiative/, `${s} : rien ne dit que chaque fichier ne garde que les questions qui le visent`);
  }
});

// Au premier council réel, cinq lentilles ont rendu exactement 40 questions — 5 × 8, le plafond saturé
// par toutes — dont une seule a survécu au triage. Le plafond s'était lu comme un quota, le même mot
// qu'on avait corrigé côté orchestrateur. Et la lentille du BRD ne demandait pas l'élément visé, donc
// l'arbitrage ne pouvait fusionner un doublon qu'en relisant tout le dossier.
test('agents de lentille : plafond qui n\'est pas une cible, et élément visé exigé', () => {
  const fichiers = skills.flatMap(s => (existsSync(join(SKILLS, s, 'agents')) ? readdirSync(join(SKILLS, s, 'agents')) : [])
    .filter(f => f.endsWith('-lens-critic.md')).map(f => [s, join(SKILLS, s, 'agents', f)]));
  assert.equal(fichiers.length, 4, 'quatre skills ont un council, donc quatre lentilles');
  for (const [s, p] of fichiers) {
    const text = readFileSync(p, 'utf8');
    assert.ok(text.includes("n'est pas une cible"), `${s} : le plafond de questions se lit comme un quota`);
    assert.ok(/zéro est une réponse valide/i.test(text), `${s} : zéro question n'est pas dit valide`);
    assert.ok(text.includes("Réduire à cinq est le travail de l'orchestrateur"), `${s} : la lentille pourrait hiérarchiser à la place de l'orchestrateur`);
    assert.match(text, /^\s+target: "/m, `${s} : la lentille ne rend pas l'élément visé`);
  }
  // Et l'arbitrage s'en sert : sinon le champ est rempli pour rien.
  for (const s of skills) {
    const c = join(SKILLS, s, 'references', 'council.md');
    if (!existsSync(c)) continue;
    assert.match(readFileSync(c, 'utf8'), /`target`/, `${s}/council.md : l'arbitrage ne se sert pas de l'élément visé`);
  }
});

// Cinq, c'est ce que ask-five.mjs retient ; deux ou trois, ce qu'on pose par tour. Un skill qui ne dit
// que le premier nombre fait poser les cinq d'un coup, et c'est arrivé.
test('les skills qui classent les questions disent aussi combien on en pose à la fois', () => {
  for (const s of skills) {
    const text = readFileSync(join(SKILLS, s, 'SKILL.md'), 'utf8');
    if (!text.includes('ask-five.mjs')) continue;
    assert.ok(text.includes(', pas un lot à poser'), `${s} : cinq questions retenues se lisent comme un lot à poser`);
    assert.ok(text.includes('deux ou trois'), `${s} : le nombre de questions par tour n'est pas dit`);
    // Deux nombres différents dans la même posture, et l'agent suit celui qu'il veut.
    assert.doesNotMatch(text, /2 à 3 questions à la fois/, `${s} : deuxième nombre de questions par tour, contradictoire`);
  }
});

// Une référence que le SKILL.md ne cite pas n'est jamais lue : la posture ne vaut que si chaque skill
// y renvoie depuis sa section Posture.
test('chaque skill porte la posture des questions', () => {
  for (const s of skills) {
    const text = readFileSync(join(SKILLS, s, 'SKILL.md'), 'utf8');
    assert.match(text, /^## Posture/m, `${s} : aucune section Posture`);
    assert.match(text, /references\/questions\.md/, `${s} : la posture ne cite pas references/questions.md`);
  }
});

// La liste ci-dessus est tenue à la main : un fichier dupliqué qu'on oublie d'y mettre n'est plus
// comparé, et peut diverger sans que rien ne le dise. On vérifie donc l'invariant par défaut : tout
// fichier portant le même nom dans deux skills est identique, sauf ceux qui sont propres au document
// du skill par construction. Même règle pour les sous-agents homonymes (cross-analyzer).
const PAR_DOCUMENT = new Set(['build-handoff.mjs', 'review-pack.mjs']);
test('tout fichier homonyme entre skills est identique, sauf ceux propres au document', () => {
  const vus = new Map();
  for (const s of skills) {
    const dir = join(SKILLS, s, 'scripts');
    const walk = (d, prefix = '') => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory()) walk(join(d, e.name), `${prefix}${e.name}/`);
        else if (e.name.endsWith('.mjs')) {
          const k = `${prefix}${e.name}`;
          if (PAR_DOCUMENT.has(e.name)) continue;
          vus.set(k, [...(vus.get(k) ?? []), { s, h: createHash('md5').update(readFileSync(join(d, e.name))).digest('hex') }]);
        }
      }
    };
    walk(dir);
  }
  for (const [f, copies] of vus) {
    if (copies.length < 2) continue;
    const distinctes = new Set(copies.map(c => c.h));
    assert.equal(distinctes.size, 1, `scripts/${f} diverge entre ${copies.map(c => c.s).join(', ')}`);
  }
});

test('tout sous-agent homonyme entre skills est identique', () => {
  const vus = new Map();
  for (const s of skills) {
    const dir = join(SKILLS, s, 'agents');
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter(f => f.endsWith('.md'))) {
      vus.set(f, [...(vus.get(f) ?? []), { s, h: createHash('md5').update(readFileSync(join(dir, f))).digest('hex') }]);
    }
  }
  for (const [f, copies] of vus) {
    if (copies.length < 2) continue;
    // install.mjs les écrit tous dans un même dossier : le dernier gagnerait, en silence.
    assert.equal(new Set(copies.map(c => c.h)).size, 1, `agents/${f} diverge entre ${copies.map(c => c.s).join(', ')} : l'installation en écraserait un`);
  }
});

// Les données de test du dépôt doivent être versionnées. Ignorées, elles n'existent que dans l'arbre
// de travail de celui qui les a produites : 12 tests sur 124 échouaient sur tout clone neuf, donc en
// CI, parce que exemple/repo/.gitignore masquait reports/ et .impl/. Et un dossier vide ne traverse
// pas un clone : la fixture d'adoption attendait web/app/api/, que git ne peut pas versionner.
test('données de test versionnées : rien d\'ignoré, aucun dossier vide attendu', () => {
  const attendus = [
    'exemple/repo/.impl/runs.jsonl',
    'exemple/repo/.impl/current.json',
    'exemple/repo/reports/unit.xml',
    'exemple/repo/reports/acceptance.xml',
    'exemple/repo/reports/mutation/mutation.json',
    'tests/fixtures/depot-existant/web/app/api/notifications/route.ts',
  ];
  for (const f of attendus) assert.ok(existsSync(join(ROOT, f)), `${f} : absent du dépôt`);

  // Les contrôles git n'ont de sens que dans un vrai checkout : hors de là (archive, paquet),
  // la présence des fichiers suffit, et on ne fabrique pas un échec qui ne dit rien.
  const estCheckout = run('git', ['rev-parse', '--is-inside-work-tree'], { cwd: ROOT }).out.trim() === 'true'
    && run('git', ['ls-files', 'package.json'], { cwd: ROOT }).out.trim() === 'package.json';
  if (!estCheckout) return;

  for (const f of attendus) {
    const ignore = run('git', ['check-ignore', '-v', f], { cwd: ROOT });
    assert.equal(ignore.code, 1, `${f} est ignoré par git : ${ignore.out.trim()} — il n'existera pas sur un clone neuf`);
    assert.equal(run('git', ['ls-files', '--error-unmatch', f], { cwd: ROOT }).code, 0, `${f} n'est pas suivi par git`);
  }
});

// Après un entretien, l'agent a listé ses chiffres, annoncé quatre étapes « sans vous », puis demandé
// « dites-moi si vous voulez que j'enchaîne maintenant, ou qu'on s'arrête là — dans ce cas je consigne
// et je commite ». Trois défauts en une phrase : la permission de travailler sur des étapes prescrites
// qui n'engagent rien, la trace mise sur une branche du choix, et la vraie question — les cibles des
// objectifs, qu'aucune mesure ne donne — jamais posée. Deux consignes l'y invitaient : « une prochaine
// action **recommandée** » et « il confirme avant que tu reprennes », écrite pour la reprise mais sans
// borne.
test('on ne demande ni la permission de travailler, ni la trace en gage', () => {
  const quest = readFileSync(join(SKILLS, 'brd-builder', 'references', 'questions.md'), 'utf8');
  assert.match(quest, /autorisation de travailler/, 'rien n\'interdit de demander la permission de travailler');
  assert.match(quest, /branche d'aucune question/, 'la consignation peut encore dépendre d\'une réponse');
  assert.match(quest, /suite de la phase/, 'la suite de la phase n\'est pas nommée parmi ce qui ne se demande pas');

  // Le point d'étape : il se lit, et ce qu'il nomme se fait.
  const disc = readFileSync(join(SKILLS, 'brd-builder', 'references', 'phase-discover.md'), 'utf8');
  const etape = disc.split('## 6. Point d\'étape')[1].split(/\n## /)[0];
  // Le mot seul ne dit rien : la consigne s'interdit elle-même « je recommande ». C'est l'action
  // qualifiée de recommandée qui ouvrait la porte au feu vert.
  assert.doesNotMatch(etape, /action recommand/i, 'la prochaine action du point d\'étape est de nouveau « recommandée »');
  assert.match(etape, /n'attend rien|se lit, il ne se valide pas/, 'le point d\'étape peut encore attendre une réponse');
  assert.match(etape, /tu la \*\*fais\*\*|se fait/, 'rien ne dit que la prochaine action s\'exécute');

  // La confirmation de reprise ne doit pas se lire comme une habitude de milieu de session.
  const sess = readFileSync(join(SKILLS, 'brd-builder', 'references', 'sessions.md'), 'utf8');
  assert.match(sess, /propre à la reprise/, 'la confirmation avant de reprendre n\'est bornée à aucun moment');
  const pause = sess.split('## Avant une pause')[1].split(/\n## /)[0];
  assert.match(pause, /jamais d'une proposition de l'agent/, 'l\'agent peut encore proposer la pause lui-même');

  // Et la question qui engageait vraiment quelque chose dans ce tour-là.
  assert.match(readFileSync(join(SKILLS, 'prd-builder', 'references', 'phase-frame.md'), 'utf8'),
    /cible se décide/, 'une cible d\'objectif produit peut encore se déduire de la valeur mesurée');
});

// La phrase « L'utilisateur n'est sollicité qu'au triage des questions » avait été retirée de
// phase-discover.md et survivait dans six autres fichiers de phase, où elle contredit council.md depuis
// — qui dit l'inverse : les questions s'enregistrent et se posent comme les autres. Le test d'alors
// cherchait « questions trié », que « triage des questions » ne contient pas. Le motif est la
// sollicitation de l'utilisateur sur la méthode, pas une tournure.
test('aucune phase ne fait trier les questions du council par l\'utilisateur', () => {
  for (const s of skills) {
    const refs = join(SKILLS, s, 'references');
    if (!existsSync(refs)) continue;
    for (const f of readdirSync(refs).filter(x => x.startsWith('phase-'))) {
      const t = readFileSync(join(refs, f), 'utf8');
      assert.doesNotMatch(t, /sollicit\w+[^.]{0,60}tri(age|er)/i, `${s}/${f} : l'utilisateur y est sollicité pour trier`);
      assert.doesNotMatch(t, /triage des questions/i, `${s}/${f} : le triage des questions y revient`);
    }
  }
});

// Trois choses que le deuxième dossier réel a dû inventer, faute de case : une réserve de périmètre
// garée dans un champ libre de la release que rien ne lit, une cible décidée doublée d'un
// `target_candidate` concurrent, et un chemin pour les guides d'entretien que le PRD ne prescrivait pas.
test('réserve de périmètre, cible décidée, guides d\'entretien : chacun a sa case', () => {
  const prd = (...f) => readFileSync(join(SKILLS, 'prd-builder', ...f), 'utf8');
  assert.match(prd('references', 'mvp.md'), /perimetre_non_tranche/, 'une réserve de périmètre n\'est pas une zone d\'ombre');
  assert.match(prd('references', 'shadow-zones.md'), /^\| `perimetre_non_tranche`/m, 'le type n\'est pas déclaré au catalogue');
  assert.match(prd('agents', 'prd-lens-critic.md'), /perimetre_non_tranche/, 'une lentille ne peut pas rendre ce type');

  const tpl = prd('templates', 'state.yaml');
  assert.match(tpl, /decided_by: ""\s+# qui a arrêté la cible/, 'un objectif ne dit pas qui a arrêté sa cible');
  assert.match(prd('references', 'phase-frame.md'), /aucun autre champ ne garde une valeur concurrente/, 'rien n\'interdit un second champ de cible');

  for (const s of ['brd-builder', 'prd-builder']) {
    assert.match(readFileSync(join(SKILLS, s, 'references', 'elicitation-patterns.md'), 'utf8'),
      /interviews\/guide-<qui>\.md/, `${s} : les guides d'entretien n'ont pas de chemin`);
  }

  assert.match(tpl, /ouverte \| partielle \| répondue \| écartée/, 'la checklist n\'a pas d\'état partiel');
  assert.match(prd('SKILL.md'), /◐ `partielle`/, 'la posture ne dit pas l\'état partiel');
});

// Le recueil se fait souvent en réunion avec le métier, et la personne qui relaie rend des réponses
// déjà agrégées : « environ 100 par semaine » quand le chef a dit 100 et un agent 150. Le défaut est
// donc le pluriel — une réponse par répondant, sauf accord — et la fusion un acte conditionnel. Le test
// vise le MOTIF, pas une formulation : la règle, sa borne (répondant, pas présent), la sortie du
// formulaire fermé, et l'accord par silence qui n'en est pas un.
test('plusieurs répondants : une réponse chacun, et le silence n\'est pas un accord', () => {
  const copies = ['brd-builder', 'prd-builder'].map(s => readFileSync(join(SKILLS, s, 'references', 'elicitation-patterns.md'), 'utf8'));
  assert.equal(new Set(copies.map(t => createHash('md5').update(t).digest('hex'))).size, 1,
    'elicitation-patterns.md diverge entre le BRD et le PRD');

  const [elic] = copies;
  assert.match(elic, /une réponse par répondant[^.]{0,40}sauf s'ils sont d'accord/i, 'la règle du pluriel par défaut n\'est pas écrite');
  assert.match(elic, /par personne qui a répondu/i, 'rien ne borne « par répondant » aux répondants de la question');
  assert.match(elic, /ne sont pas d'accord/, 'le choix multiple n\'a pas sa sortie de formulaire');
  assert.match(elic, /sortie du formulaire/, 'cocher le désaccord est présenté comme un résultat, pas comme un déclencheur');
  assert.match(elic, /silence n'est pas un accord/i, 'un accord obtenu par non-contradiction passe pour un accord');
  assert.match(elic, /une (seule )?personne répond/i, 'la question de la qualité n\'est pas due en tête-à-tête');
  // Demander un décompte vaut mieux que guetter « on pense que » : « je suis avec l'équipe » répond à
  // « qui est là ? » et pas à « qui, et quelle fonction ? ». Et la fonction est un fait qu'on demande,
  // la qualité une inférence qu'on propose — l'utilisateur ne classe pas ses collègues.
  assert.match(elic, /nom et (sa )?fonction/i, 'le tour de table ne demande pas nom et fonction');
  assert.match(elic, /déduis la qualité/i, 'la qualité est demandée au lieu d\'être déduite et soumise');
  assert.match(elic, /n'en fais pas un formulaire/i, 'rien n\'interdit de bloquer sur un tour de table complet');
  assert.match(elic, /contient déjà sa divergence/i, 'une réponse qui porte son propre désaccord passe inaperçue');
  assert.match(elic, /la cadence ne change pas/i, 'rien ne dit que le lotissement des questions ne bouge pas en réunion');
  // Le tour de table accolé à la première question de fond, trouvé sur un BRD réel le 27 octobre 2026 :
  // « à côté du sujet, pas devant lui » se lisait « à côté d'une QUESTION sur le sujet », et en Assess
  // cette question est toujours un récit — une demande figée, le document ordonne de la remonter au
  // problème. La collision était donc systématique et pas accidentelle : tout premier échange la
  // produisait. « À côté du sujet » veut dire à côté de la matière, pas à côté d'une autre question.
  assert.match(elic, /seule question de cet échange/i, 'rien n\'interdit d\'accoler le tour de table à une autre question');
  assert.match(elic, /tour suivant/i, 'le récit n\'est pas renvoyé au tour d\'après');
  // Le même défaut s'est reproduit EN MILIEU de session sur un dossier réel : une question
  // d'attribution posée à côté d'une question ouverte s'est perdue, et deux sources sont restées
  // attribuées par défaut à la mauvaise personne. Courte et factuelle, elle paraît accolable comme le
  // tour de table — d'où la règle générale, qui ne vaut pas que pour le premier échange.
  assert.match(elic, /question d'attribution se pose seule/i, 'une question d\'attribution reste accolable à une question de fond');
  // La convention de préfixe reste écrite, mais au rang de repli : elle ne vaut que là où plusieurs
  // répondent à la MÊME question, et elle met la charge sur la salle. Le remède est d'adresser.
  assert.match(elic, /précéder chaque réponse du prénom/i, 'la convention de préfixe a disparu au lieu d\'être reléguée');
  // Et la licence « déduis la qualité » avait été étendue à l'identité du locuteur, par le vocabulaire
  // (« une vraie base de données » lu comme un parler de développeur — c'était l'enseignant).
  assert.match(elic, /qualité se déduit, l'identité se demande/i, 'rien ne borne la déduction à la qualité');

  // Une prescription que rien n'invoque est du poids mort, et elle doit s'invoquer au PREMIER contact :
  // le tour de table était dans le cadrage de Discover, une phase trop tard. Le premier tour du BRD est
  // Assess, qui attribue déjà `SRC-001` « au nom de la personne avec qui tu parles » sans jamais
  // demander qui elle est. Le PRD n'a pas d'Assess : son premier contact est le cadrage autonome.
  // Deux assertions séparées plutôt qu'une regex positionnelle — la première a cassé au premier
  // durcissement de la consigne, alors que l'acte et l'appel étaient tous deux bien là.
  const assess = readFileSync(join(SKILLS, 'brd-builder', 'references', 'phase-assess.md'), 'utf8');
  const discover = readFileSync(join(SKILLS, 'brd-builder', 'references', 'phase-discover.md'), 'utf8');
  const frame = readFileSync(join(SKILLS, 'prd-builder', 'references', 'phase-frame.md'), 'utf8');
  for (const [nom, texte] of [['Assess du BRD', assess], ['cadrage autonome du PRD', frame]]) {
    assert.match(texte, /nom et (sa )?fonction/i, `le ${nom} ne demande pas nom et fonction`);
    assert.match(texte, /1 bis/, `le ${nom} n'appelle pas la section du pluriel par défaut`);
  }
  assert.match(assess, /une source par\s+voix entendue/, 'Assess enregistre une seule source pour une réunion à plusieurs');
  assert.match(assess, /seule question de ce premier échange/i, 'Assess laisse son premier échange porter le tour de table ET un récit');
  // Le cadrage autonome du PRD n'avait pas le défaut : le tour de table y précède les thèmes numérotés.
  assert.match(frame, /Commence par demander qui te répond/, 'le cadrage autonome du PRD ne place plus le tour de table avant ses thèmes');
  assert.match(discover, /phase-assess\.md/, 'le cadrage de Discover ne dit pas où le tour de table a eu lieu');
  assert.match(discover, /une par voix entendue/, 'une réunion à plusieurs répondants reste une seule source');
  assert.match(discover, /^Les noms et fonctions recueillis au cadrage/m, 'le tour de table ne nourrit pas la cartographie');
});

// La cause commune de quatre défauts trouvés sur les dossiers réels : une référence ORDONNE de remplir
// un champ, et aucun script ne le lit jamais. `metrics` était rendu sans qu'aucune règle le vérifie,
// `stakeholders` sortait du handoff sans lecteur, `parties` et `arbiter` étaient prescrits sans contrôle.
// Le garde-fou cherche le motif le plus net — « Renseigne `x` » — parce qu'il est rare et délibéré :
// 22 champs ordonnés dans les sept skills, de quoi tenir sans bruit. Un champ qu'on ordonne de remplir
// et que personne ne relit est une case où l'agent écrira n'importe quoi sans jamais être contredit.
// Chaque dérogation porte sa raison : c'est une dette nommée, pas un silence.
// Vide, et c'est le but : les deux dérogations ouvertes le 26 octobre 2026 ont été levées le jour même —
// `pattern` par `S85`, `environments` par `record-nfr.mjs`, qui refuse une mesure qui ne dit pas où elle
// a été prise. Toute entrée ici doit porter sa raison et une ligne dans `## À trancher`.
const ORDRES_SANS_LECTEUR = {};
test('un champ qu\'une référence ordonne de remplir est lu par un script', () => {
  const mjs = dir => {
    const out = [];
    for (const e of existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : []) {
      if (e.isDirectory()) out.push(...mjs(join(dir, e.name)));
      else if (e.name.endsWith('.mjs')) out.push(join(dir, e.name));
    }
    return out;
  };
  // `lib/rules.mjs` est copié à l'identique dans quatre skills : lire tout son contenu faisait passer
  // pour lu, dans le PRD, un champ que seul `checkBrd` touche. Le `feedback` du PRD a été vert à tort
  // le temps d'un commit. Les fonctions de contrôle des AUTRES documents sont donc retirées du texte
  // cherché — un faux vert est pire que pas de garde-fou.
  const CONTROLE = { 'brd-builder': 'checkBrd', 'prd-builder': 'checkPrd', 'sad-builder': 'checkSad', 'plan-builder': 'checkPlan' };
  const sansLesVoisins = (src, skill) => {
    let garde = src;
    for (const fn of Object.values(CONTROLE).filter(x => x !== CONTROLE[skill])) {
      const i = garde.indexOf(`export function ${fn}(s`);
      if (i < 0) continue;
      const j = garde.indexOf('\nexport function ', i + 10);
      garde = garde.slice(0, i) + (j < 0 ? '' : garde.slice(j));
    }
    return garde;
  };
  const muets = [];
  let ordonnes = 0;
  for (const s of skills) {
    const scripts = mjs(join(SKILLS, s, 'scripts'))
      .map(f => (f.endsWith(join('lib', 'rules.mjs')) ? sansLesVoisins(readFileSync(f, 'utf8'), s) : readFileSync(f, 'utf8')))
      .join('\n');
    const refs = join(SKILLS, s, 'references');
    const vus = new Map();
    for (const f of existsSync(refs) ? readdirSync(refs) : []) {
      for (const phrase of readFileSync(join(refs, f), 'utf8').matchAll(/\b[Rr]enseigne(?:r|z)?\b([^.;!?\n]*)/g)) {
        for (const champ of (phrase[1].match(/`([a-z_][a-z0-9_]*)`/g) ?? []).map(x => x.slice(1, -1))) {
          if (!vus.has(champ)) vus.set(champ, f);
        }
      }
    }
    ordonnes += vus.size;
    for (const [champ, f] of vus) {
      if (new RegExp(`\\b${champ}\\b`).test(scripts)) continue;
      if (ORDRES_SANS_LECTEUR[`${s}/${champ}`]) continue;
      muets.push(`${s} : \`${champ}\` ordonné dans ${f}, lu par aucun script`);
    }
  }
  assert.ok(ordonnes >= 20, `le motif « Renseigne \`x\` » ne trouve plus que ${ordonnes} champs : la formulation a changé, le garde-fou ne garde plus rien`);
  assert.deepEqual(muets, [], `\n${muets.join('\n')}`);
});

// Le tour de table du PRD recueillait des noms et des fonctions qui n'avaient nulle part où aller : pas
// de registre dans le template, `build-handoff.mjs` qui exportait des parties prenantes que rien
// n'ingérait, et S81 enfermé dans `checkBrd`. Sur le deuxième dossier réel, treize sources portaient leur
// attribution dans un champ `who` libre que ni règle ni rendu ne lisait.
test('le PRD a un registre de parties prenantes, et la chaîne le remplit', () => {
  const tpl = readFileSync(join(SKILLS, 'prd-builder', 'templates', 'state.yaml'), 'utf8');
  assert.match(tpl, /^stakeholders: \[\]/m, 'le PRD n\'a pas de registre de parties prenantes');
  assert.match(tpl, /status: à interroger\s+# à interroger \| interrogée/, 'le registre ne dit pas qui a été entendu');
  assert.match(tpl, /represents: ""/, 'le registre ne porte pas la qualité de celui qui parle pour un autre');
  assert.match(tpl, /stakeholders: \[SH-01\]/, 'une source du PRD ne nomme pas qui a parlé');
  assert.doesNotMatch(tpl, /SRC-001[^}]*who:/, 'une source garde un champ libre concurrent de `stakeholders`');

  // Le handoff portait id, name et role : le PRD recevait des noms sans savoir qui avait été entendu,
  // donc S81 n'avait rien à lire en aval.
  assert.match(readFileSync(join(SKILLS, 'brd-builder', 'scripts', 'build-handoff.mjs'), 'utf8'),
    /stakeholders: arr\(s\.stakeholders\)[^\n]*status/, 'le handoff ne transmet pas le statut des parties prenantes');

  const frame = readFileSync(join(SKILLS, 'prd-builder', 'references', 'phase-frame.md'), 'utf8');
  assert.match(frame, /et \*\*`stakeholders`\*\* depuis le handoff/, 'le mode chaîné n\'ingère pas le registre');
  assert.match(frame, /Chaque personne entre dans `stakeholders`/, 'le tour de table ne remplit pas le registre');
  assert.match(frame, /S81/, 'rien ne dit au cadrage autonome ce que la règle refuse');
});

// Observé sur un dossier réel : l'agent a posé en un message le nom de l'initiative, « raconte-moi ce
// qui se passe quand une famille s'inscrit » et « qu'est-ce qui coince avec WhatsApp ». Deux récits dans
// le même tour, exactement ce que `questions.md` interdit en annonçant la suite — « la personne répond à
// celle qu'elle a comprise, souvent la dernière ». La contrainte était partout SAUF dans le fichier de
// phase que l'agent avait sous les yeux, et qui autorisait des lots sans rien qualifier. Le test cherche
// donc les endroits qui lotissent des QUESTIONS (pas des éléments ni des tâches) et exige la clause.
// Les lots de 2 à 3 questions ont été retirés : une question à la fois, partout. Deux étapes avant,
// la règle ne valait que pour les questions OUVERTES, un lot de factuelles restant permis — et le
// dossier réel a montré ce que ça donne : un tour annoncé « trois questions courtes » en portait cinq,
// parce que « 2 à 3 questions » ne disait pas ce qu'est une question. Le décompte porte donc sur ce
// qu'on demande, pas sur la mise en page : trois nombres dans une puce sont trois questions.
test('une question à la fois, et plus aucun lot de questions', () => {
  const refs = [];
  for (const s of skills) {
    const dir = join(SKILLS, s, 'references');
    for (const f of existsSync(dir) ? readdirSync(dir) : []) {
      refs.push([`${s}/references/${f}`, readFileSync(join(dir, f), 'utf8')]);
    }
  }
  for (const [f, texte] of refs) {
    assert.doesNotMatch(texte, /par lots de \d|lot ne transporte/i, `${f} lotit encore des questions`);
    assert.doesNotMatch(texte, /deux ou trois (questions )?à la fois/i, `${f} pose encore deux ou trois questions par tour`);
  }

  const q = refs.find(([f]) => f === 'brd-builder/references/questions.md')[1];
  assert.match(q, /\*\*Une question à la fois\.\*\*/, 'la règle du tour unique n\'est pas écrite');
  assert.match(q, /une question, c'est un point d'interrogation/i, 'rien ne dit ce qu\'est UNE question');
  assert.match(q, /ce qu'on demande, jamais sur la mise en page/i, 'le décompte peut encore se faire sur les puces');
  assert.match(q, /c'est la \*\*relance\*\*/, 'rien ne dit ce qu\'un lot fait perdre : la relance');

  // Les trois endroits qui lotissaient appellent la règle commune.
  for (const f of ['brd-builder/references/phase-assess.md', 'brd-builder/references/phase-discover.md',
                   'prd-builder/references/phase-frame.md']) {
    const texte = refs.find(([x]) => x === f)[1];
    assert.match(texte, /une question à la fois/i, `${f} ne dit plus comment poser ses questions`);
  }
});

// Le mot `blocking` fermait une condition de sortie dans quatre documents, et un seul le définissait :
// le BRD, en une ligne vraie par construction en début de phase (18 bloquantes sur 25). Le PRD du
// deuxième dossier réel n'en a déclaré aucune sur 21 zones ouvertes — rien ne lui disait quand le
// mettre. Un critère qu'un document ne porte pas est un critère qu'il n'applique pas.
test('tout document qui ferme une phase sur une bloquante dit ce qui rend une zone bloquante', () => {
  const CRITERE = /bloquante\*\* si elle empêche l'étape suivante de \*\*commencer\*\*/;
  let verifies = 0;
  for (const s of skills) {
    const refs = join(SKILLS, s, 'references');
    if (!existsSync(refs)) continue;
    const fichiers = readdirSync(refs);
    const lu = f => readFileSync(join(refs, f), 'utf8');
    if (!fichiers.filter(f => f.startsWith('phase-')).some(f => /aucune (zone d'ombre|hypothèse) bloquante/.test(lu(f)))) continue;
    assert.ok(fichiers.some(f => CRITERE.test(lu(f))),
      `${s} : une phase se ferme sur l'absence de bloquante, mais aucune référence ne dit quand une zone l'est`);
    verifies += 1;
  }
  assert.ok(verifies >= 3, `seulement ${verifies} document(s) vérifié(s) : le motif de la condition de sortie a dû changer`);
});

// La filiation des initiatives se disait dans un seul sens : `split_into`, sur la mère, et seulement
// quand elle est `decoupee`. Une sortie de périmètre arrive pendant que la mère VIT et continue — sur
// le premier dossier réel, la fille portait son origine dans `trigger`, en prose, et le portefeuille
// la montrait comme une idée neuve, indiscernable d'une demande qu'on vient de taper.
test('une initiative née d\'une autre le déclare, et le portefeuille recoupe les deux sens', () => {
  const tpl = readFileSync(join(SKILLS, 'brd-builder', 'templates', 'state.yaml'), 'utf8');
  assert.match(tpl, /^  derived_from: \{\}/m, 'le gabarit n\'a pas de champ de provenance');
  assert.match(tpl, /decoupage \| sortie_perimetre \| autre:<libellé>/, 'l\'énumération de la provenance n\'est pas écrite, ou n\'est pas ouverte');
  assert.match(tpl, /^#    moved_to: ""/m, 'un besoin poussé dans une autre initiative n\'a pas où le dire');

  const assess = readFileSync(join(SKILLS, 'brd-builder', 'references', 'phase-assess.md'), 'utf8');
  const define = readFileSync(join(SKILLS, 'brd-builder', 'references', 'phase-define.md'), 'utf8');
  assert.match(assess, /renseigne `derived_from`/, 'le découpage ne fait pas déclarer la provenance aux filles');
  assert.match(define, /renseigne `moved_to`/, 'la sortie de périmètre ne dit pas où le besoin est repris');
  assert.match(define, /`S09`/, 'rien ne rappelle d\'emporter les parties prenantes que les sources citent');

  // Le recoupement des deux sens ne peut se faire que là où toutes les initiatives sont lues.
  const dir = tempDir('tizi-filiation');
  const ecrire = (slug, s) => {
    mkdirSync(join(dir, 'brd', slug), { recursive: true });
    writeFileSync(join(dir, 'brd', slug, 'state.yaml'), yaml.dump({ document: 'brd', phase: 'assess', ...s }));
  };
  ecrire('mere', { initiative: { name: 'Mère', slug: 'mere' }, opportunity: { decision: 'decoupee', split_into: ['fille', 'fantome'] },
    candidate_needs: [{ id: 'BC-7', text: 'x', status: 'hors_périmètre', reason: 'part ailleurs', moved_to: 'fille' }] });
  ecrire('fille', { initiative: { name: 'Fille', slug: 'fille' }, opportunity: { decision: 'en_attente' } });
  const out = node(script('brd-builder', 'list-opportunities.mjs'), [dir]).out;
  assert.match(out, /Venue de/, 'le portefeuille ne montre pas la provenance');
  assert.match(out, /« fantome », qui n'est pas dans brd\//, 'une fille nommée mais absente passe inaperçue');
  assert.match(out, /nomme « fille » comme fille, qui ne la déclare pas/, 'la fille qui ne déclare pas sa mère passe inaperçue');
  assert.match(out, /BC-7 déclaré repris par « fille », qui ne le porte pas/, '« rien ne disparaît en silence » reste une phrase');
});

// Le premier point d'étape de fin de session écrit à la main annonçait quatre chiffres faux sur six,
// tous inflatés : 15 besoins candidats pour 11, 11 sources pour 10, 6 hypothèses pour 5 — chaque fois
// le DERNIER IDENTIFIANT lu comme un décompte. C'est faux dès qu'un identifiant peut manquer, et c'est
// notre propre doctrine qui les troue : un besoin repris par une autre initiative garde le sien.
// `status.mjs` comptait juste, mais il ne comptait ni les sources ni les hypothèses du BRD, et rien ne
// le lançait à la pause — il n'était prescrit qu'à la reprise.
test('un décompte vient d\'un script, et la pause présente le point d\'étape', () => {
  const q = readFileSync(join(SKILLS, 'brd-builder', 'references', 'questions.md'), 'utf8');
  assert.match(q, /chiffre présenté à l'utilisateur sort d'un script/i, 'rien n\'interdit de compter de mémoire');
  const sess = readFileSync(join(SKILLS, 'brd-builder', 'references', 'sessions.md'), 'utf8');
  const pause = sess.slice(sess.indexOf('## Avant une pause'), sess.indexOf('## À la reprise'));
  assert.ok(pause.length > 200, 'la section « Avant une pause » n\'a pas été trouvée');
  assert.match(pause, /status\.mjs/, 'la pause ne lance pas le point d\'étape déterministe');
  assert.match(pause, /next_action` en dernière ligne/, 'la prochaine action notée n\'est pas celle que l\'utilisateur emporte');
  for (const s of skills) {
    assert.match(readFileSync(join(SKILLS, s, 'SKILL.md'), 'utf8'), /rédige le condensé de la session et présente le point d'étape/,
      `${s} : la pause de SKILL.md ne présente pas le point d'étape`);
  }
  // Un script qui ne compte pas tout fait recompter le reste à la main : ce qui manquait est ce qui a
  // été faux. L'entrée de Define ordonnait d'ailleurs ces mêmes décomptes sans nommer de script.
  const st = readFileSync(join(SKILLS, 'brd-builder', 'scripts', 'status.mjs'), 'utf8');
  for (const c of ['stakeholders', 'sources', 'hypotheses']) {
    assert.match(st, new RegExp(`brd: \\[[^\\]]*'${c}'`), `le point d'étape du BRD ne compte pas ${c}`);
  }
  assert.match(readFileSync(join(SKILLS, 'brd-builder', 'references', 'phase-define.md'), 'utf8'),
    /point d'entrée court \*\*depuis `scripts\/status\.mjs`\*\*/, 'l\'entrée de Define ordonne des décomptes sans nommer de script');
});

// « interrogée » écrasait deux états : entendue une fois, et interrogée sur son travail. Au premier
// dossier réel le directeur était `interrogée` pour avoir répondu dans le fil du cadrage, et sept zones
// ouvertes le nommaient encore — le guide d'entretien existait pour compenser un statut faux.
test('« interrogée » dit entendue une fois, pas interrogée sur tout', () => {
  const tpl = readFileSync(join(SKILLS, 'brd-builder', 'templates', 'state.yaml'), 'utf8');
  assert.match(tpl, /ENTENDUE AU MOINS UNE FOIS/, 'le gabarit laisse « interrogée » vouloir dire « plus rien à lui demander »');
  const disc = readFileSync(join(SKILLS, 'brd-builder', 'references', 'phase-discover.md'), 'utf8');
  assert.match(disc, /aucune zone ouverte ne nomme plus cette personne en `ask_to`/, 'la zone se ferme encore sur le statut');
  // Dix sources toutes de type `cadrage` disent que le dossier n'est jamais sorti de la pièce : le
  // point d'étape les groupait par statut, que les sources n'ont pas, et affichait « 10 » tout court.
  const st = readFileSync(join(SKILLS, 'brd-builder', 'scripts', 'status.mjs'), 'utf8');
  assert.match(st, /c === 'sources' \? 'type'/, 'le point d\'étape ne dit pas de quelle nature sont les sources');
});

// La proposition du 26 octobre avait deux moitiés — « déclarer la pièce, et faire l'entretien en
// direct » — et seule la première a été écrite. §3 produisait donc un fichier de guide pour toute
// partie prenante aux zones ouvertes, sans jamais regarder si elle était dans l'échange : au premier
// dossier réel, deux des quatre guides visaient des gens présents, qui pouvaient répondre tout de suite.
test('on n\'écrit pas de guide d\'entretien pour quelqu\'un qui est dans l\'échange', () => {
  const elic = readFileSync(join(SKILLS, 'brd-builder', 'references', 'elicitation-patterns.md'), 'utf8');
  assert.equal(createHash('md5').update(elic).digest('hex'),
    createHash('md5').update(readFileSync(join(SKILLS, 'prd-builder', 'references', 'elicitation-patterns.md'), 'utf8')).digest('hex'),
    'elicitation-patterns.md diverge entre le BRD et le PRD');
  assert.match(elic, /Qui est là se fait interroger maintenant/i, 'le tour de table n\'a aucune conséquence sur la façon d\'interroger');
  assert.match(elic, /Le guide est pour l'\*\*absent\*\*/, 'rien ne borne le guide d\'entretien à l\'absent');
  assert.match(elic, /`present`, ceux qui étaient là/, 'la présence n\'est pas distinguée de la parole');

  const disc = readFileSync(join(SKILLS, 'brd-builder', 'references', 'phase-discover.md'), 'utf8');
  assert.match(disc, /Pas de guide pour quelqu'un qui est là/i, 'la préparation d\'entretien ne regarde pas qui est présent');
  assert.match(disc, /qui n'est pas dans l'échange/, 'le déclencheur du guide ignore la présence');

  for (const [doc, skill] of [['BRD', 'brd-builder'], ['PRD', 'prd-builder']]) {
    assert.match(readFileSync(join(SKILLS, skill, 'templates', 'state.yaml'), 'utf8'), /present:/,
      `le modèle du ${doc} n'a pas où dire qui était présent`);
  }
});

// La doc de méthode n'était relue par rien, et elle a dérivé : elle annonçait quatre issues possibles
// à l'évaluation d'une opportunité quand le modèle en porte six, et `decoupee` manquait — un lecteur
// ne pouvait pas savoir qu'un découpage existe, alors que les deux dossiers réels l'ont utilisé.
// Le garde lit l'énumération dans le GABARIT, pas dans la prose : ajouter une valeur force à toucher
// la table ci-dessous, donc à écrire la phrase qui va avec. Il ne vérifie rien d'autre de la doc —
// une cohérence générale entre la prose et les skills ne se teste pas par des chaînes de caractères.
const DECISION_EN_FRANCAIS = {
  en_attente: 'en attente', aller_plus_loin: 'aller plus loin', jeter: 'jeter',
  decoupee: 'découper', a_apprendre: 'apprendre d’abord', reportee: 'reporter',
};
test('la doc nomme toutes les issues de l\'évaluation d\'une opportunité', () => {
  const tpl = readFileSync(join(SKILLS, 'brd-builder', 'templates', 'state.yaml'), 'utf8');
  const ligne = tpl.match(/^ {2}decision: en_attente *# *(.+)$/m);
  assert.ok(ligne, 'l\'énumération des décisions d\'opportunité n\'est plus lisible dans le gabarit');
  const valeurs = ligne[1].split('|').map(x => x.trim()).filter(Boolean);
  assert.ok(valeurs.length >= 5, `énumération trop courte : ${valeurs.join(', ')}`);

  const doc = readFileSync(join(ROOT, 'documentation', 'Tizi - un SDLC agentique.md'), 'utf8');
  const assess = doc.slice(doc.indexOf('### Phase Assess'), doc.indexOf('### Emprunts au design thinking'));
  assert.ok(assess.length > 400, 'la section Assess de la doc n\'a pas été trouvée');
  for (const v of valeurs) {
    const mot = DECISION_EN_FRANCAIS[v];
    assert.ok(mot, `la décision « ${v} » n'a pas sa formulation dans DECISION_EN_FRANCAIS : ajoute-la, et écris-la dans la doc`);
    if (v === 'en_attente') continue;        // l'état initial ne se raconte pas comme une issue
    assert.ok(assess.includes(mot), `la doc ne nomme pas l'issue « ${mot} » (${v}) dans sa section Assess`);
  }
});

// Deuxième dossier réel : 52 questions en texte libre, UNE qui nomme quelqu'un — et à la troisième
// personne, à propos de quelqu'un qui était dans la pièce. Quatre tours de l'utilisateur sont partis à
// réattribuer ce qui avait déjà été dit, jusqu'à une table de correspondance, et il a fallu qu'il
// rappelle que les autres étaient là. La cause est qu'`ask_to` — le destinataire, renseigné sur les 71
// zones d'ombre du dossier — ne servait qu'à GROUPER les zones dans un guide d'entretien : il
// alimentait un fichier, jamais une phrase.
test('une question dit à qui elle est posée, et son destinataire est déjà écrit', () => {
  const q = readFileSync(join(SKILLS, 'brd-builder', 'references', 'questions.md'), 'utf8');
  assert.match(q, /\*\*Une question dit à qui elle est posée\.\*\*/, 'rien n\'exige de nommer le destinataire');
  assert.match(q, /deuxième personne/, 'rien ne dit que le destinataire est nommé, pas évoqué');
  assert.match(q, /`ask_to`/, 'le destinataire est présenté comme un choix, alors qu\'il est déjà écrit');

  const e = readFileSync(join(SKILLS, 'brd-builder', 'references', 'elicitation-patterns.md'), 'utf8');
  assert.match(e, /\*\*Une question porte le nom de qui doit y répondre\.\*\*/, 'la salle n\'impose pas de nommer');
  assert.match(e, /qui parle de lui devant lui/, 'la troisième personne reste permise devant l\'intéressé');
  assert.match(e, /ne remplace pas l'adresse/, 'la convention de préfixe reste présentée comme le remède');

  // La mesure, elle, est dans l'extrait de session : commune aux sept skills.
  const s = readFileSync(join(SKILLS, 'brd-builder', 'scripts', 'lib', 'sessions.mjs'), 'utf8');
  assert.match(s, /ne nomment personne/, 'l\'extrait ne compte pas les questions adressées à personne');
});
