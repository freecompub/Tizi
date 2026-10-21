// Estimation quand les agents réalisent les tâches : taille de risque, attention humaine, blocages, mesures, prévision.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sandbox, node, script } from './helpers.mjs';
import { riskSize, plannedAttention, checkState } from '../skills/brd-builder/scripts/lib/rules.mjs';
import { usageOf } from '../skills/brd-builder/scripts/lib/sessions.mjs';
import yaml from '../skills/brd-builder/scripts/lib/vendor/js-yaml.mjs';

test('taille de risque calculée depuis les données de la tâche', () => {
  assert.equal(riskSize({ elements: ['CP-01'] }).size, 'S');
  const r = riskSize({ elements: ['CP-01', 'CT-02'], operations: ['OP-1'], threats: ['TH-1'], preserves: ['PB-1'] }, {}, { sad: { work_items: [{ id: 'CP-01', lifecycle: 'existant_modifié' }] } });
  assert.equal(r.size, 'XL'); assert.ok(r.factors.some(([n]) => n === 'code existant modifié'));
});
test('S74 : écart d\'au moins deux tailles entre l\'équipe et le risque calculé', () => {
  const codes = size => checkState({ document: 'plan', settings: { cadence: 'sprint' }, tasks: [{ id: 'TK-1', kind: 'dev', size, elements: ['CP-01'], status: 'validé' }] }).map(f => f.rule);
  assert.ok(codes('L').includes('S74')); assert.ok(!codes('M').includes('S74'));
});
test('S75 : attention humaine prévue au-delà de la capacité de l\'itération', () => {
  const plan = cap => checkState({ document: 'plan', settings: { cadence: 'sprint', attention_capacity: cap }, iterations: [{ id: 'IT-1', status: 'validé' }], tasks: [1, 2, 3].map(i => ({ id: `TK-${i}`, kind: 'dev', size: 'M', elements: [`CP-0${i}`], iteration: 'IT-1', status: 'validé' })) }).map(f => f.rule);
  assert.ok(plan(120).includes('S75')); assert.ok(!plan(600).includes('S75'));
  assert.equal(plannedAttention({ size: 'M' }, { attention_by_size: { M: 55 } }), 55, 'la calibration mesurée l\'emporte');
});

test('blocages : ouverture, refus d\'un doublon, levée avec durée', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tizi-bl-'));
  const bl = (...a) => node(script('plan-builder', 'block.mjs'), ['demo', ...a], { cwd: dir });
  assert.equal(bl('--sur', 'US-001', '--cause', 'environnement', '--note', 'simulateur indisponible', '--par', 'Samir').code, 0);
  assert.notEqual(bl('--sur', 'US-001', '--cause', 'environnement', '--note', 'idem').code, 0, 'doublon refusé');
  assert.notEqual(bl('--sur', 'US-001', '--cause', 'inconnue', '--note', 'x').code, 0, 'cause inconnue refusée');
  assert.match(bl('--lever', 'BL-001').out, /BL-001 levé sur US-001 après \d+\.\d h \(environnement\)/);
});

test('PR : la fusion sans approbation humaine enregistrée est refusée', () => {
  const repo = join(sandbox(), 'repo');
  const rp = (...a) => node(script('impl-builder', 'record-pr.mjs'), ['impl/demo/state.yaml', '--task', 'TK-002', ...a], { cwd: repo });
  assert.notEqual(rp('--fusionnee').code, 0);
  assert.equal(rp('--approuvee', '--par', 'Samir').code, 0);
  assert.equal(rp('--fusionnee').code, 0);
  const tl = yaml.load(readFileSync(join(repo, 'impl/demo/state.yaml'), 'utf8')).tasks.find(t => t.id === 'TK-002').timeline;
  assert.deepEqual(tl.map(e => e.event).slice(-2), ['pr_approuvée', 'fusionnée']);
});

// Six tâches sur quatre semaines, des allers-retours, deux blocages, une session : mesures et prévision.
function synthetic(repo) {
  const now = Date.now(), H = 36e5, D = 24 * H, iso = t => new Date(t).toISOString();
  const mk = (id, start, { red = 1, ko = 0, corr = 0, wait = 4, merge = true }) => {
    let t = start; const tl = [{ at: iso(t), event: 'prise' }]; t += 3 * H; tl.push({ at: iso(t), event: 'compréhension_validée' });
    for (let i = 0; i < red; i++) { t += H; tl.push({ at: iso(t), event: 'tests', suite: 'unit', failed: 1 }); }
    for (let i = 0; i < ko; i++) { t += H; tl.push({ at: iso(t), event: 'porte', ok: false }); }
    t += H; tl.push({ at: iso(t), event: 'porte', ok: true });
    for (let i = 0; i < corr; i++) { t += wait * H; tl.push({ at: iso(t), event: 'corrections_demandées' }); }
    t += wait * H; tl.push({ at: iso(t), event: 'pr_approuvée' }); if (merge) { t += H; tl.push({ at: iso(t), event: 'fusionnée' }); }
    return { id, status: merge ? 'fusionnee' : 'en_revue', understanding: { questions: [] }, timeline: tl };
  };
  const sp = join(repo, 'impl/demo/state.yaml'); const s = yaml.load(readFileSync(sp, 'utf8'));
  s.tasks = [mk('TK-005', now - 24 * D, {}), mk('TK-008', now - 20 * D, {}), mk('TK-002', now - 15 * D, { red: 2, ko: 1, corr: 1, wait: 20 }), mk('TK-003', now - 9 * D, { red: 3, ko: 2, corr: 2, wait: 30 }), mk('TK-007', now - 5 * D, {}), mk('TK-004', now - 2 * D, { merge: false })];
  writeFileSync(sp, yaml.dump(s));
  mkdirSync(join(repo, '.tizi/blocages'), { recursive: true });
  writeFileSync(join(repo, '.tizi/blocages/demo.yaml'), yaml.dump({ blocages: [{ id: 'BL-001', on: 'US-001', cause: 'environnement', note: 'CI', started: iso(now - 16 * D), ended: iso(now - 14 * D) }] }));
}

test('mesures : durées, attente de relecture, allers-retours, blocages comptés sur la vie de la tâche', () => {
  const repo = join(sandbox(), 'repo'); synthetic(repo);
  assert.equal(node(script('plan-builder', 'measure.mjs'), ['plan/demo/state.yaml'], { cwd: repo }).code, 0);
  const m = yaml.load(readFileSync(join(repo, 'plan/demo/mesures/mesures.yaml'), 'utf8'));
  const t2 = m.tasks.find(t => t.id === 'TK-002'), t3 = m.tasks.find(t => t.id === 'TK-003');
  assert.equal(t2.waitReview, 40); assert.equal(t2.gateKo, 1); assert.equal(t2.corrections, 1);
  assert.equal(Math.round(t2.blockedHours), 24, 'seule la part chevauchant la vie de la tâche');
  assert.equal(t3.blockedHours, 0, 'un blocage de story levé avant la prise ne compte pas pour la tâche');
  assert.ok(m.by_type.some(g => g.label === 'code existant modifié'));
});

test('prévision : reproductible, et refusée sans historique suffisant', () => {
  const repo = join(sandbox(), 'repo'); synthetic(repo);
  const f = () => node(script('plan-builder', 'forecast.mjs'), ['plan/demo/state.yaml'], { cwd: repo });
  const a = f(), b = f();
  assert.equal(a.code, 0, a.err); assert.equal(a.out, b.out, 'même entrée, même prévision');
  assert.match(a.out, /85 % de chances d'avoir fini en \d+ semaine/);
  const empty = join(sandbox(), 'repo');
  assert.match(node(script('plan-builder', 'forecast.mjs'), ['plan/demo/state.yaml'], { cwd: empty }).err, /Historique insuffisant/);
});

test('coût de calcul : tokens lus dans une transcription Claude, « inconnu » sinon', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tizi-tok-'));
  const p = join(dir, 't.jsonl');
  writeFileSync(p, `${JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 3000 } } })}\n${JSON.stringify({ type: 'assistant', isSidechain: true, message: { usage: { input_tokens: 100, output_tokens: 50 } } })}\n`);
  assert.equal(usageOf(p).total, 4350, 'les sous-agents comptent');
  writeFileSync(p, `${JSON.stringify({ type: 'user.message', data: { content: 'x' } })}\n`);
  assert.equal(usageOf(p), null);
});
