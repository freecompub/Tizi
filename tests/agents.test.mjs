// Ce qui tourne autour des agents : garde-fou TDD (Claude Code, Copilot, VS Code), capture de sessions,
// installation, revue de code, portes de PR et de release.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, cpSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { FIX, ROOT, node, run, sandbox, script, tempDir } from './helpers.mjs';

const guard = (repo, payload) => node(script('impl-builder', 'tdd-guard.mjs'), [], { cwd: repo, input: JSON.stringify({ cwd: repo, ...payload }) });
test('garde-fou TDD : mêmes verdicts quel que soit l\'outil', () => {
  const repo = join(sandbox(), 'repo');
  const cases = [
    ['Claude Code, code de production sur du vert', { hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: { file_path: join(repo, 'src/completude/index.js') } }, 2],
    ['Copilot camelCase', { toolName: 'edit', toolArgs: { path: 'src/completude/index.js' } }, 2],
    ['Copilot, arguments en texte JSON', { toolName: 'create', toolArgs: JSON.stringify({ path: 'src/completude/x.js' }) }, 2],
    ['VS Code', { tool_name: 'replace_string_in_file', tool_input: { filePath: 'src/completude/index.js' } }, 2],
    ['écriture d\'un test', { tool_name: 'create_file', tool_input: { filePath: 'test/unit/b.test.js' } }, 0],
    ['correctif touchant un fichier hors périmètre', { toolName: 'apply_patch', toolArgs: { input: '*** Begin Patch\n*** Update File: test/unit/b.test.js\n*** Update File: src/facturation/t.js\n*** End Patch' } }, 2],
    ['lecture', { toolName: 'view', toolArgs: { path: 'src/completude/index.js' } }, 0],
  ];
  for (const [label, payload, expected] of cases) {
    const r = guard(repo, payload);
    assert.equal(r.code, expected, `${label} : code ${r.code}, attendu ${expected}`);
    if (expected === 2) {
      const o = JSON.parse(r.out);
      assert.equal(o.permissionDecision, 'deny'); assert.equal(o.hookSpecificOutput.permissionDecision, 'deny'); assert.match(r.err, /tdd-guard/);
    }
  }
});

// `adopt.mjs` laisse `paths.production` vide quand il ne reconnaît pas la pile — c'est arrivé sur le
// dépôt de Tizi lui-même. Le garde-fou classait alors chaque fichier comme « ni test, ni contrat, ni
// production » et laissait tout passer, en silence. Un garde-fou qui ne peut rien classer doit le dire.
test('garde-fou TDD : sans périmètre de production, il refuse au lieu de laisser passer', () => {
  const repo = join(sandbox(), 'repo');
  const cfgPath = join(repo, 'impl/config.yaml');
  const avant = readFileSync(cfgPath, 'utf8');
  writeFileSync(cfgPath, avant.replace('production: ["src/**"]', 'production: []'));
  const r = guard(repo, { tool_name: 'create_file', tool_input: { filePath: 'test/unit/b.test.js' } });
  assert.equal(r.code, 2, 'un périmètre de production vide laisse encore passer');
  assert.match(r.err, /aucun chemin de code de production/);
  assert.match(r.err, /derogation\.mjs/, 'le message ne dit pas comment écrire malgré tout');
  // Ce qui est toujours autorisé le reste : le garde-fou ne bloque pas l'état de la tâche.
  assert.equal(guard(repo, { tool_name: 'create_file', tool_input: { filePath: 'impl/demo/state.yaml' } }).code, 0);
  writeFileSync(cfgPath, avant);
});

test('capture de session : transcriptions Claude Code et Copilot', () => {
  const dir = tempDir('tizi-sess');
  const cap = (payload, env) => node(script('brd-builder', 'session-capture.mjs'), [], { cwd: dir, input: JSON.stringify({ cwd: dir, ...payload }), env });
  // Le faux jeton est fabriqué à l'exécution : un fichier versionné qui en contiendrait un serait bloqué par la protection contre les secrets de GitHub.
  const fakeToken = ['gh', 'p_', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('');
  const transcript = join(dir, 'claude-transcript.jsonl');
  writeFileSync(transcript, readFileSync(join(FIX, 'claude-transcript.jsonl'), 'utf8').replace('__JETON_FACTICE__', fakeToken));
  assert.equal(cap({ session_id: 'aaaaaaaa-1', transcript_path: transcript, hook_event_name: 'Stop' }).code, 0);
  const home = tempDir('copilot');
  mkdirSync(join(home, 'session-state', 'bbbbbbbb-2'), { recursive: true });
  cpSync(join(FIX, 'copilot-events.jsonl'), join(home, 'session-state', 'bbbbbbbb-2', 'events.jsonl'));
  assert.equal(cap({ hook_event_name: 'SessionEnd', session_id: 'bbbbbbbb-2' }, { COPILOT_HOME: home }).code, 0, 'fin de session Copilot sans chemin');
  const files = readdirSync(join(dir, '.tizi/sessions'));
  const extracts = files.filter(f => f.endsWith('.extrait.md')).map(f => readFileSync(join(dir, '.tizi/sessions', f), 'utf8'));
  assert.equal(extracts.length, 2);
  const all = extracts.join('\n') + files.filter(f => f.endsWith('.jsonl')).map(f => readFileSync(join(dir, '.tizi/sessions', f), 'utf8')).join('\n');
  assert.doesNotMatch(all, /ghp_[A-Za-z0-9]{20,}/, 'jeton non masqué');
  assert.match(all, /agents du soir/); assert.match(all, /Chloé n'a pas répondu/);

  // Une question posée par l'outil de questions de l'hôte n'est pas dans le texte de l'assistant :
  // elle est dans l'appel. Sans la lire là, l'extrait gardait les réponses et perdait les questions.
  const claude = extracts.find(e => e.includes('agents du soir'));
  assert.match(claude, /règle écrite, ou une habitude/, 'question posée par l\'outil perdue');
  assert.match(claude, /propositions : Règle écrite · Habitude/, 'réponses proposées perdues');
  // Un appel porte jusqu'à quatre questions et ne renvoie qu'un résultat — mais ce résultat nomme
  // chaque question avec sa réponse. Recopier le résultat brut donnait une « réponse » qui était une
  // phrase de service en anglais contenant la question déjà écrite au-dessus, et la réponse de la
  // deuxième question n'était lisible nulle part.
  assert.match(claude, /habitude de l'équipe du soir \?.*\n\s+\*\*Réponse\*\* : Habitude$/m, 'réponse non rattachée à sa question');
  assert.match(claude, /ne sont pas d'accord \?.*\n\s+\*\*Réponse\*\* : Le responsable qualité$/m, 'la deuxième réponse de l\'appel est perdue');
  assert.doesNotMatch(claude, /Your questions have been answered/, 'phrase de service de l\'hôte recopiée telle quelle');

  // Les écritures faites au shell ne passent par aucun outil d'écriture : sur le premier dossier réel,
  // huit fichiers avaient été créés et l'extrait affichait « Fichiers modifiés : _Aucun._ ».
  const fichiers = claude.split('## Fichiers modifiés')[1].split('##')[0];
  assert.match(fichiers, /guide-SH-03\.md/, 'écriture par redirection perdue');
  assert.match(fichiers, /commande\(s\) de shell lancée\(s\)/, 'écritures non traçables du shell passées sous silence');
  assert.doesNotMatch(fichiers, /_Aucun\._/);

  // Une notification de tâche arrive par le canal « utilisateur » : ce n'est pas une parole.
  assert.doesNotMatch(claude, /task-notification/, 'enveloppe de l\'hôte comptée comme parole');

  // Les questions en texte libre portent leur tour, sans leur markdown, et un tour qui en porte
  // plusieurs est signalé : une question ouverte se pose seule.
  const libres = claude.split('### En texte libre')[1].split('##')[0];
  assert.match(libres, /- \(tour \d+\) Et pour finir : qu'est-ce qui change/, 'markdown non retiré, ou tour non attribué');
  assert.match(libres, /- \(tour \d+\) Et qui s'en aperçoit le premier \?/, 'citation non nettoyée');
  assert.match(claude, /tour\(s\) portent plus d'une question en texte libre/, 'questions ouvertes groupées non signalées');
  // Côté Copilot, aucun événement ne relie un résultat à son appel : la question est conservée, sa
  // réponse ne l'est pas. Mieux vaut une question sans réponse qu'une réponse sans question.
  const copilot = extracts.find(e => e.includes('US-002'));
  assert.match(copilot, /passe-t-elle en « bon »/, 'question posée par l\'outil Copilot perdue');
  assert.match(copilot, /propositions : Oui, version bon · Non, on la reporte/);

  // Et une question à laquelle il a été répondu n'est plus en suspens.
  const suspens = claude.split('## Questions en suspens')[1] ?? '';
  assert.doesNotMatch(suspens, /règle écrite, ou une habitude/, 'question répondue laissée en suspens');
  assert.doesNotMatch(extracts.join('\n'), /\(sous-agent|à ignorer\)/, 'message de sous-agent repris dans un extrait');
});

// Trois détails de l'extrait, vus sur le premier dossier réel : une dernière réponse coupée en plein
// mot (« **cette se ») sans rien dire de ce qui manquait, un rappel système compté comme parole, et un
// résultat de l'outil de questions que l'hôte ne nomme pas — où mieux vaut garder la phrase brute que
// perdre la réponse.
test('extrait de session : troncature annoncée, enveloppes écartées, réponse non nommée conservée', async () => {
  const { readTranscript, buildExtract } = await import('../skills/brd-builder/scripts/lib/sessions.mjs');
  const dir = tempDir('tizi-extrait');
  const t = join(dir, 's.jsonl');
  const longue = `Fin de la phase Discover sur brd/demo.\n\n${'Un paragraphe de contexte qui tient dans la ligne. '.repeat(90)}\nDernier mot coupable`;
  writeFileSync(t, [
    { type: 'user', timestamp: '2026-11-02T08:00:00Z', message: { role: 'user', content: 'On reprend brd/demo.' } },
    { type: 'user', timestamp: '2026-11-02T08:00:01Z', message: { role: 'user', content: '<system-reminder>\nCeci est un rappel, pas une parole.\n</system-reminder>' } },
    { type: 'assistant', timestamp: '2026-11-02T08:01:00Z', message: { role: 'assistant', content: [{ type: 'tool_use', id: 'z1', name: 'AskUserQuestion', input: { questions: [{ question: 'On fige la version ?', options: [{ label: 'Oui' }, { label: 'Pas encore' }] }] } }] } },
    { type: 'user', timestamp: '2026-11-02T08:02:00Z', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'z1', content: 'Pas encore' }] } },
    { type: 'assistant', timestamp: '2026-11-02T08:03:00Z', message: { role: 'assistant', content: [{ type: 'text', text: longue }] } },
  ].map(e => JSON.stringify(e)).join('\n'));

  const md = buildExtract(readTranscript(t), { date: '2026-11-02', session: 'zzzz', initiatives: ['brd/demo'], event: 'Stop' });
  assert.match(md, /1 message\(s\) de l'utilisateur/, 'le rappel système est compté comme parole');
  assert.doesNotMatch(md, /pas une parole/, 'le rappel système est recopié mot pour mot');
  const derniere = md.split("## Dernière réponse de l'assistant")[1].split('## Questions en suspens')[0];
  assert.match(derniere, /caractère\(s\) de plus dans la transcription/, 'troncature silencieuse');
  assert.doesNotMatch(derniere, /Un paragraphe de contexte qui tient dans la lig$/m, 'coupe en plein mot');
  // L'hôte n'a pas nommé la question dans son résultat : la réponse est gardée au niveau de l'appel.
  assert.match(md, /\*\*Réponse\*\* : Pas encore/, 'réponse non nommée par l\'hôte perdue');
});

// Le champ `condensed` de l'index est écrit par `session-capture.mjs`, qui tourne sur `Stop`, donc
// après tout ce que l'agent a fait dans le tour — y compris le commit. Sur le premier dossier réel, le
// condensé était écrit et commité, et l'index commité disait encore `condensed: ''` : trois outils
// demandaient à la session suivante de rédiger un condensé qui existait déjà.
test('condensé : cherché sur le disque, le champ d\'index n\'est qu\'un cache', async () => {
  const { condenseOf } = await import('../skills/brd-builder/scripts/lib/sessions.mjs');
  const dir = tempDir('tizi-cond');
  mkdirSync(join(dir, '.tizi/sessions'), { recursive: true });
  const entree = { session: 'abcd1234', started: '2026-11-03T08:00:00.000Z', condensed: '' };
  assert.equal(condenseOf(entree, dir), '', 'rien sur le disque, rien à annoncer');
  writeFileSync(join(dir, '.tizi/sessions/2026-11-03-abcd1234.condense.md'), '# Condensé\n');
  assert.equal(condenseOf(entree, dir), '.tizi/sessions/2026-11-03-abcd1234.condense.md', 'condensé sur le disque ignoré parce que l\'index est périmé');
  // Un champ renseigné reste prioritaire, et un champ qui pointe vers un fichier absent ne vaut rien.
  assert.equal(condenseOf({ ...entree, condensed: '.tizi/sessions/ailleurs.md' }, dir), '.tizi/sessions/2026-11-03-abcd1234.condense.md');
});

for (const target of ['claude', 'copilot', 'both']) test(`installation : cible ${target}, idempotente`, () => {
  const proj = tempDir(`tizi-inst-${target}`);
  assert.equal(node(join(ROOT, 'install.mjs'), ['--project', proj, '--target', target]).code, 0);
  const skillsDir = target === 'copilot' ? '.github/skills' : '.claude/skills';
  assert.ok(existsSync(join(proj, skillsDir, 'brd-builder', 'SKILL.md')));
  if (target !== 'copilot') assert.ok(existsSync(join(proj, '.claude/settings.json')) && existsSync(join(proj, '.claude/agents/review-functional.md')));
  if (target !== 'claude') assert.ok(existsSync(join(proj, '.github/hooks/tizi.json')) && existsSync(join(proj, '.github/agents/finding-verifier.agent.md')));
  node(join(ROOT, 'install.mjs'), ['--project', proj, '--target', target]);
  if (target !== 'copilot') for (const l of Object.values(JSON.parse(readFileSync(join(proj, '.claude/settings.json'), 'utf8')).hooks)) assert.equal(l.length, 1, 'entrée de hook dupliquée');
  const ignore = readFileSync(join(proj, '.gitignore'), 'utf8').split('\n');
  assert.equal(ignore.filter(l => l === '.impl/').length, 1);
  // Les rapports de test sont une sortie locale régénérée : lancer les suites ne doit pas salir l'arbre.
  assert.ok(ignore.includes('reports/'), 'reports/ n\'est pas ignoré : lancer les tests laisse un fichier non suivi');
});

test('portes de PR et de release ouvertes sur l\'exemple', () => {
  const repo = join(sandbox(), 'repo');
  assert.equal(node(script('impl-builder', 'pr-gate.mjs'), ['impl/demo/state.yaml', '--task', 'TK-002'], { cwd: repo }).code, 0);
  assert.equal(node(script('test-builder', 'release-matrix.mjs'), ['qa/demo/state.yaml'], { cwd: repo }).code, 0);
});

const hasGit = run('git', ['--version']).code === 0;
test('revue de code : vérification adversariale, confiance retirée, revue périmée', { skip: !hasGit && 'git absent' }, () => {
  const repo = join(sandbox(), 'repo');
  const g = (...a) => run('git', a, { cwd: repo });
  g('init', '-q'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't'); writeFileSync(join(repo, '.gitignore'), '.impl/\nreports/\n'); g('add', '-A'); g('commit', '-qm', 'base'); g('branch', '-M', 'main');
  writeFileSync(join(repo, 'src/completude/index.js'), readFileSync(join(repo, 'src/completude/index.js'), 'utf8') + 'export const jeton = r => r.headers.authorization?.split(" ")[1];\n');
  const ctx = node(script('impl-builder', 'review-context.mjs'), ['impl/demo/state.yaml', '--task', 'TK-002', '--base', 'main'], { cwd: repo });
  assert.equal(ctx.code, 0, ctx.err); assert.match(ctx.out, /authentification/); assert.match(ctx.out, /review-claims/);
  assert.ok(existsSync(join(repo, 'impl/demo/review/TK-002/claims.md')), 'fichier d\'affirmations préparé');
  const D = join(repo, 'impl/demo/review/TK-002');
  mkdirSync(join(D, 'findings'), { recursive: true });
  cpSync(join(FIX, 'review-functional.yaml'), join(D, 'findings/functional.yaml')); cpSync(join(FIX, 'review-security.yaml'), join(D, 'findings/security.yaml'));
  const merge = () => node(script('impl-builder', 'review-merge.mjs'), ['impl/demo/state.yaml', '--task', 'TK-002'], { cwd: repo });
  assert.match(merge().out, /vérification incomplète/);
  cpSync(join(FIX, 'review-verifications.yaml'), join(D, 'verifications.yaml'));
  const m = merge();
  assert.match(m.out, /corrections requises — 2 constat\(s\) retenu\(s\) dont 1 bloquant\(s\), 1 réfuté\(s\), 0 non vérifié\(s\), 1 rejeté\(s\) pour forme, 2 mention\(s\) de confiance retirée\(s\)/);
  const report = readFileSync(join(D, 'review.md'), 'utf8');
  assert.doesNotMatch(report, /0\.9|confiance élevée/, 'valeur de confiance restée dans le rapport');
  assert.match(report, /Mentions de confiance retirées/);
  assert.match(merge().out, /corrections requises/, 'relancer la fusion ne doit pas rendre la revue périmée');
  writeFileSync(join(repo, 'src/completude/index.js'), readFileSync(join(repo, 'src/completude/index.js'), 'utf8') + '// modif\n');
  assert.match(merge().err, /périmée/);
});

// L'index des sessions était un fichier unique, versionné, réécrit à chaque tour par chaque
// développeur : deux personnes travaillant le même jour obtenaient un conflit Git sur un fichier que
// personne ne modifie à la main. Un fichier par session : il n'y a plus rien à fusionner.
test('index des sessions : un fichier par session, aucun écrivain partagé', () => {
  const dir = tempDir('tizi-idx');
  const cap = (id, at) => {
    const t = join(dir, `${id}.jsonl`);
    writeFileSync(t, `${JSON.stringify({ type: 'user', message: { content: 'On reprend plan/demo.' }, timestamp: at })}\n`);
    return node(script('brd-builder', 'session-capture.mjs'), [], { cwd: dir, input: JSON.stringify({ cwd: dir, session_id: id, transcript_path: t, hook_event_name: 'Stop' }) });
  };

  // Un index historique en un seul fichier reste lu, mais plus jamais réécrit.
  mkdirSync(join(dir, '.tizi/sessions'), { recursive: true });
  const legacy = join(dir, '.tizi/sessions/index.yaml');
  writeFileSync(legacy, 'sessions:\n  - session: ancienne\n    ended: "2026-01-01T00:00:00Z"\n    initiatives: [plan/demo]\n');
  const avant = readFileSync(legacy, 'utf8');

  assert.equal(cap('aaaa1111', '2026-10-30T09:00:00.000Z').code, 0);
  assert.equal(cap('bbbb2222', '2026-10-30T10:00:00.000Z').code, 0);

  const propres = readdirSync(join(dir, '.tizi/sessions')).filter(f => f.endsWith('.index.yaml'));
  assert.equal(propres.length, 2, 'une entrée d\'index par session');
  assert.equal(readFileSync(legacy, 'utf8'), avant, 'l\'index historique ne doit plus être réécrit');

  // Les lecteurs voient l'ensemble : l'historique et les deux nouvelles.
  const r = node(script('brd-builder', 'status.mjs'), ['plan/demo/state.yaml'], { cwd: dir });
  assert.ok(r.code !== null);
  const vues = propres.map(f => readFileSync(join(dir, '.tizi/sessions', f), 'utf8'));
  assert.ok(vues.every(v => /^session: /m.test(v)), 'chaque fichier porte une seule session');
  assert.equal(new Set(vues.map(v => v.match(/^session: (.*)$/m)[1])).size, 2, 'deux sessions distinctes');
});

// Au deuxième dossier réel, 51 des 52 questions en texte libre ne nommaient personne, et la
// cinquante-deuxième parlait de Dédé à la troisième personne alors qu'il était dans la pièce. Quatre
// tours de l'utilisateur sont partis à dire qui avait dit quoi. L'extrait comptait déjà les lots de
// questions ; il ne voyait pas celles qui n'étaient adressées à personne.
test('extrait de session : les questions adressées à personne sont comptées', async () => {
  const { readTranscript, buildExtract, namesIn } = await import('../skills/brd-builder/scripts/lib/sessions.mjs');
  const dir = tempDir('tizi-adresse');
  mkdirSync(join(dir, 'brd', 'demo'), { recursive: true });
  writeFileSync(join(dir, 'brd', 'demo', 'state.yaml'), 'stakeholders:\n  - { id: SH-01, name: "Samir" }\n  - { id: SH-02, name: "Dédé" }\n  - { id: SH-03, name: "Tom" }\n');
  const personnes = namesIn(['brd/demo'], dir);
  assert.deepEqual(personnes, ['Samir', 'Dédé', 'Tom']);
  const t = join(dir, 's.jsonl');
  writeFileSync(t, [
    { type: 'user', timestamp: '2026-11-02T08:00:00Z', message: { role: 'user', content: 'On reprend brd/demo.' } },
    { type: 'assistant', timestamp: '2026-11-02T08:01:00Z', message: { role: 'assistant', content: [{ type: 'text', text: 'Qu\'est-ce que tu as fait pour retrouver son dossier, et où l\'as-tu retrouvé ?' }] } },
    { type: 'assistant', timestamp: '2026-11-02T08:02:00Z', message: { role: 'assistant', content: [{ type: 'text', text: 'Dédé, à quoi verras-tu que le problème est résolu ?' }] } },
  ].map(e => JSON.stringify(e)).join('\n'));
  const md = buildExtract(readTranscript(t), { date: '2026-11-02', session: 'yyyy', initiatives: ['brd/demo'], event: 'Stop', personnes });
  assert.match(md, /1 question\(s\) sur 2 ne nomment personne/, 'les questions adressées à personne ne sont pas comptées');
  assert.match(md, /Samir, Dédé, Tom/, 'les personnes connues ne sont pas nommées dans le constat');
  // Seul à répondre, on n'a pas besoin d'être nommé : la mesure n'a de sens qu'à partir de deux voix.
  const seul = buildExtract(readTranscript(t), { date: '2026-11-02', session: 'yyyy', initiatives: ['brd/demo'], event: 'Stop', personnes: ['Samir'] });
  assert.doesNotMatch(seul, /ne nomment personne/, 'la mesure se déclenche sur une seule personne connue');

  // Et une question ne porte pas d'identifiant : on doit pouvoir le retirer sans rien perdre, donc il
  // n'avait rien à y faire. Vu sur un dossier réel : « ZO-003 — « directeur » de quoi : une école, une
  // association, les deux ? » — l'identifiant ne cite rien, ne glose rien, et annonce un champ à
  // remplir. Le renvoi en fin d'AFFIRMATION reste utile, et n'est pas compté ici : on ne regarde que
  // les questions posées.
  const avec = join(dir, 'q.jsonl');
  writeFileSync(avec, [
    { type: 'user', timestamp: '2026-11-02T08:00:00Z', message: { role: 'user', content: 'On reprend brd/demo.' } },
    { type: 'assistant', timestamp: '2026-11-02T08:01:00Z', message: { role: 'assistant', content: [{ type: 'text', text: 'ZO-003 — « directeur » de quoi : une école, une association, les deux ?' }] } },
    { type: 'assistant', timestamp: '2026-11-02T08:02:00Z', message: { role: 'assistant', content: [{ type: 'text', text: 'Dédé, à quoi verras-tu que le problème est résolu ?' }] } },
  ].map(e => JSON.stringify(e)).join('\n'));
  const md2 = buildExtract(readTranscript(avec), { date: '2026-11-02', session: 'xxxx', initiatives: ['brd/demo'], event: 'Stop', personnes });
  assert.match(md2, /1 question\(s\) sur 2 portent un identifiant/, 'les questions qui portent un identifiant ne sont pas comptées');
  assert.match(md2, /ZO-003/, 'le constat ne montre pas la question en cause');
});
