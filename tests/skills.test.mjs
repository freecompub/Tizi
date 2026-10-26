// Conformité des skills à la spécification Agent Skills et identité des fichiers communs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { SKILLS, ROOT, run } from './helpers.mjs';
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
  assert.match(discover, /phase-assess\.md/, 'le cadrage de Discover ne dit pas où le tour de table a eu lieu');
  assert.match(discover, /une par voix entendue/, 'une réunion à plusieurs répondants reste une seule source');
  assert.match(discover, /^Les noms et fonctions recueillis au cadrage/m, 'le tour de table ne nourrit pas la cartographie');
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
test('un lot de questions ne transporte pas de question ouverte', () => {
  const sites = [];
  for (const s of skills) {
    const dir = join(SKILLS, s, 'references');
    for (const f of existsSync(dir) ? readdirSync(dir) : []) {
      const texte = readFileSync(join(dir, f), 'utf8');
      if (/par lots de [^.\n]{0,24}questions/.test(texte)) sites.push([`${s}/references/${f}`, texte]);
    }
  }
  assert.ok(sites.length >= 3, `trop peu de sites trouvés : ${sites.map(([f]) => f).join(', ')}`);
  for (const [f, texte] of sites) {
    assert.match(texte, /un lot ne transporte pas de question ouverte/i,
      `${f} lotit des questions sans dire qu'une question ouverte part seule`);
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
