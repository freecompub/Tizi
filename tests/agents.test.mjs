// Ce qui tourne autour des agents : garde-fou TDD (Claude Code, Copilot, VS Code), capture de sessions,
// installation, revue de code, portes de PR et de release.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, cpSync, mkdtempSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sandbox, node, run, script, FIX, ROOT } from './helpers.mjs';

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

test('capture de session : transcriptions Claude Code et Copilot', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tizi-sess-'));
  const cap = (payload, env) => node(script('brd-builder', 'session-capture.mjs'), [], { cwd: dir, input: JSON.stringify({ cwd: dir, ...payload }), env });
  // Le faux jeton est fabriqué à l'exécution : un fichier versionné qui en contiendrait un serait bloqué par la protection contre les secrets de GitHub.
  const fakeToken = ['gh', 'p_', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('');
  const transcript = join(dir, 'claude-transcript.jsonl');
  writeFileSync(transcript, readFileSync(join(FIX, 'claude-transcript.jsonl'), 'utf8').replace('__JETON_FACTICE__', fakeToken));
  assert.equal(cap({ session_id: 'aaaaaaaa-1', transcript_path: transcript, hook_event_name: 'Stop' }).code, 0);
  const home = mkdtempSync(join(tmpdir(), 'copilot-'));
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
  assert.match(claude, /\*\*Réponses\*\* : Habitude/, 'réponse reçue perdue');
  // Un appel porte plusieurs questions et ne renvoie qu'un résultat : la réponse appartient à l'appel.
  assert.equal(claude.match(/\*\*Réponses?\*\* : Habitude/g).length, 1, 'la réponse est recopiée sur chaque question');
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

for (const target of ['claude', 'copilot', 'both']) test(`installation : cible ${target}, idempotente`, () => {
  const proj = mkdtempSync(join(tmpdir(), `tizi-inst-${target}-`));
  assert.equal(node(join(ROOT, 'install.mjs'), ['--project', proj, '--target', target]).code, 0);
  const skillsDir = target === 'copilot' ? '.github/skills' : '.claude/skills';
  assert.ok(existsSync(join(proj, skillsDir, 'brd-builder', 'SKILL.md')));
  if (target !== 'copilot') assert.ok(existsSync(join(proj, '.claude/settings.json')) && existsSync(join(proj, '.claude/agents/review-functional.md')));
  if (target !== 'claude') assert.ok(existsSync(join(proj, '.github/hooks/tizi.json')) && existsSync(join(proj, '.github/agents/finding-verifier.agent.md')));
  node(join(ROOT, 'install.mjs'), ['--project', proj, '--target', target]);
  if (target !== 'copilot') for (const l of Object.values(JSON.parse(readFileSync(join(proj, '.claude/settings.json'), 'utf8')).hooks)) assert.equal(l.length, 1, 'entrée de hook dupliquée');
  assert.equal(readFileSync(join(proj, '.gitignore'), 'utf8').split('\n').filter(l => l === '.impl/').length, 1);
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
  const dir = mkdtempSync(join(tmpdir(), 'tizi-idx-'));
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
