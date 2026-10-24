// Constitution du produit, cinq questions, listes de contrôle de relecture, analyse croisée du sens.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { createPublicKey } from 'node:crypto';
import { join } from 'node:path';
import { sandbox, node, script } from './helpers.mjs';
import { checkState } from '../skills/brd-builder/scripts/lib/rules.mjs';
import yaml from '../skills/brd-builder/scripts/lib/vendor/js-yaml.mjs';

const C = (dir, ...a) => node(script('brd-builder', 'constitution.mjs'), ['.', ...a], { cwd: dir });
function withConstitution(dir) {
  assert.equal(C(dir, '--proposer', '--texte', 'Aucune donnée de santé ne doit apparaître dans un journal.', '--type', 'ne_doit_pas', '--raison', 'Secret médical', '--controle', 'automatique', '--commande', '! grep -rn "console.log(dossier" src', '--par', 'Samir').code, 0);
  assert.equal(C(dir, '--decider', 'PC-01', '--accepter', '--par', 'Samir').code, 0);
}

test('constitution : principe vérifiable, accepté par son responsable, amendé par lui seul, dérogation nommée', () => {
  const dir = sandbox();
  assert.match(C(dir, '--proposer', '--texte', 'x doit y', '--type', 'doit', '--raison', 'r', '--controle', 'automatique', '--par', 'S').err, /commande/);
  withConstitution(dir);
  const c = yaml.load(readFileSync(join(dir, '.tizi/constitution.yaml'), 'utf8'));
  assert.equal(c.principles[0].status, 'actif'); assert.equal(c.principles[0].owner, 'Samir');
  assert.match(C(dir, '--amender', 'PC-01', '--texte', 'nouveau texte doit', '--raison', 'r', '--par', 'Autre').err, /Seul le responsable/);
  assert.equal(C(dir, '--amender', 'PC-01', '--texte', 'Aucune donnée de santé ne doit apparaître dans un journal ni une alerte.', '--raison', 'alertes', '--par', 'Samir').code, 0);
  assert.notEqual(C(dir, '--deroger', 'PC-01', '--initiative', 'demo', '--element', 'ADR-001').code, 0, 'dérogation sans raison ni approbateur refusée');
  assert.equal(C(dir, '--deroger', 'PC-01', '--initiative', 'demo', '--element', 'ADR-001', '--raison', 'journal chiffré', '--par', 'DPO').code, 0);
  assert.equal(C(dir).code, 0);
});

test('constitution dans la chaîne : S79 au BRD et à la conception, fiche de contexte, instructions du dépôt, porte de PR (C10)', () => {
  const dir = sandbox(); withConstitution(dir);
  const consti = yaml.load(readFileSync(join(dir, '.tizi/constitution.yaml'), 'utf8'));
  assert.ok(checkState({ document: 'brd', phase: 'define' }, { constitution: consti }).some(f => f.rule === 'S79'));
  assert.ok(!checkState({ document: 'brd', phase: 'define', principles_applicable: ['PC-01'] }, { constitution: consti }).some(f => f.rule === 'S79'));
  const sad = extra => checkState({ document: 'sad', phase: 'govern', constitution_check: { after: { date: '2026-10-22', by: 'S' }, ...extra } }, { constitution: consti }).filter(f => f.rule === 'S79');
  assert.equal(sad({}).length, 0);
  assert.equal(sad({ conflicts: [{ principle: 'PC-01', element: 'ADR-009', resolution: '' }] }).length, 1);
  node(script('plan-builder', 'render-plan.mjs'), ['plan/demo/state.yaml'], { cwd: dir });
  assert.match(readFileSync(join(dir, 'plan/demo/tasks/TK-002.md'), 'utf8'), /## Principes du produit[\s\S]*PC-01/);
  node(script('brd-builder', 'sync-agent-instructions.mjs'), ['.'], { cwd: dir });
  assert.match(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), /### Principes du produit[\s\S]*PC-01/);
  const repo = join(dir, 'repo'); mkdirSync(join(repo, '.tizi'), { recursive: true });
  writeFileSync(join(repo, '.tizi/constitution.yaml'), readFileSync(join(dir, '.tizi/constitution.yaml')));
  const gate = env => node(script('impl-builder', 'pr-gate.mjs'), ['impl/demo/state.yaml', '--task', 'TK-002'], { cwd: repo, env });

  // La clé de confiance vit HORS du dépôt : ici, à côté de lui, et déclarée par l'environnement.
  const cle = join(dir, 'cle-constitution.pem');
  assert.equal(node(script('impl-builder', 'constitution.mjs'), ['.', '--generer-cle', '--sortie', cle], { cwd: repo }).code, 0);
  const pub = createPublicKey(readFileSync(cle, 'utf8')).export({ type: 'spki', format: 'pem' }).toString();
  const signe = (...a) => node(script('impl-builder', 'constitution.mjs'), ['.', '--signer', '--cle', cle, '--par', 'Samir', ...a], { cwd: repo });

  assert.equal(signe().code, 0);
  assert.match(gate({ TIZI_CONSTITUTION_PUBKEY: pub }).out, /✓ Principes de la constitution à contrôle automatique respectés/);
  writeFileSync(join(repo, 'src/completude/fuite.js'), 'console.log(dossier.glycemie)\n');
  assert.match(gate({ TIZI_CONSTITUTION_PUBKEY: pub }).out, /✗ Principes de la constitution à contrôle automatique respectés — en échec : PC-01/);
});

// Les contrôles automatiques sont des commandes de shell lues dans un fichier du dépôt, exécutées par
// la porte de PR localement ET en CI sur chaque pull request. Une empreinte approuvée n'y suffirait
// pas : qui modifie le fichier la recalcule. Il faut une signature, et une clé de confiance hors du
// dépôt — sinon la même contribution remplacerait la clé et se signerait elle-même.
test('constitution : aucune commande exécutée sans signature valide d\'une clé de confiance hors du dépôt', () => {
  const dir = sandbox(); withConstitution(dir);
  const repo = join(dir, 'repo'); mkdirSync(join(repo, '.tizi'), { recursive: true });
  const cfile = join(repo, '.tizi/constitution.yaml');
  writeFileSync(cfile, readFileSync(join(dir, '.tizi/constitution.yaml')));
  const K = (...a) => node(script('impl-builder', 'constitution.mjs'), ['.', ...a], { cwd: repo });
  const gate = env => node(script('impl-builder', 'pr-gate.mjs'), ['impl/demo/state.yaml', '--task', 'TK-002'], { cwd: repo, env });

  const cle = join(dir, 'cle.pem');
  assert.equal(K('--generer-cle', '--sortie', cle).code, 0);
  const pub = createPublicKey(readFileSync(cle, 'utf8')).export({ type: 'spki', format: 'pem' }).toString();
  const autre = join(dir, 'autre.pem');
  assert.equal(K('--generer-cle', '--sortie', autre).code, 0);

  // La clé publique est ÉCRITE à côté de la privée, pas seulement affichée : la recopier à la main
  // depuis le terminal produit un fichier mal découpé, et la vérification répond alors « clé publique
  // illisible » — ce qui ressemble à une signature invalide sans en être une.
  assert.ok(existsSync(`${cle}.pub`), 'la clé publique est écrite à côté de la privée');
  assert.equal(readFileSync(`${cle}.pub`, 'utf8'), pub, 'le fichier .pub porte la clé publique de la paire');

  // Le garde du remplacement porte sur les deux fichiers : une clé publique restée seule ne se laisse
  // pas écraser en silence, sinon l'ancienne signature deviendrait invérifiable sans un mot.
  const troisieme = join(dir, 'troisieme.pem');
  assert.equal(K('--generer-cle', '--sortie', troisieme).code, 0);
  rmSync(troisieme);
  const orpheline = K('--generer-cle', '--sortie', troisieme);
  assert.notEqual(orpheline.code, 0, 'une clé publique orpheline bloque la génération');
  assert.match(orpheline.err, /\.pub existe déjà/);

  // Une clé privée dans le dépôt finirait commitée et ne protégerait plus rien : le chemin est refusé.
  const dedans = K('--generer-cle', '--sortie', '.tizi/cle.pem');
  assert.equal(dedans.code, 2);
  assert.match(dedans.err, /est dans le dépôt/);
  assert.ok(!existsSync(join(repo, '.tizi/cle.pem')), 'aucune clé ne doit être écrite dans le dépôt');

  // 1a. Aucune clé de confiance déclarée : on ne peut rien vérifier, donc on n'exécute rien et on ne
  // conclut pas. C'est l'état par défaut d'un dépôt qui n'a pas encore choisi son ancre de confiance.
  assert.notEqual(K('--controler').code, 0, 'sans clé déclarée, --controler refuse');
  assert.match(K('--controler').err, /non exécutés — constitution non signée \(sans-cle\)/);
  assert.match(K('--controler').err, /TIZI_CONSTITUTION_PUBKEY/);

  // 1b. Clé déclarée, mais surface non signée : refus, et la porte ne prétend pas que C10 passe.
  const sansSig = node(script('impl-builder', 'constitution.mjs'), ['.', '--controler'], { cwd: repo, env: { TIZI_CONSTITUTION_PUBKEY: pub } });
  assert.notEqual(sansSig.code, 0);
  assert.match(sansSig.err, /non exécutés — constitution non signée \(absente\)/);
  assert.match(gate({ TIZI_CONSTITUTION_PUBKEY: pub }).out, /✗ Principes de la constitution.*non exécutés/);

  // 2. Signée : les contrôles tournent.
  assert.equal(K('--signer', '--cle', cle, '--par', 'Samir').code, 0);
  assert.equal(K('--verifier-signature', ...[]).code, 1, 'sans clé déclarée, on ne conclut pas');
  const avecCle = { TIZI_CONSTITUTION_PUBKEY: pub };
  assert.equal(node(script('impl-builder', 'constitution.mjs'), ['.', '--controler'], { cwd: repo, env: avecCle }).code, 0);
  assert.equal(node(script('impl-builder', 'constitution.mjs'), ['.', '--controler'], { cwd: repo, env: { TIZI_CONSTITUTION_PUBKEY_FILE: `${cle}.pub` } }).code, 0,
    'le fichier .pub écrit par --generer-cle est utilisable tel quel comme ancre de confiance');

  // 3. Une commande modifiée après la signature : refusé. C'est l'attaque qu'on empêche.
  const c = yaml.load(readFileSync(cfile, 'utf8'));
  c.principles.find(x => x.id === 'PC-01').check.command = 'echo compromis';
  writeFileSync(cfile, yaml.dump(c));
  const apres = node(script('impl-builder', 'constitution.mjs'), ['.', '--controler'], { cwd: repo, env: avecCle });
  assert.notEqual(apres.code, 0);
  assert.match(apres.err, /\(invalide\)/);
  assert.match(gate(avecCle).out, /✗ Principes de la constitution.*non exécutés/);

  // 4. Resigner avec une AUTRE clé ne suffit pas : la confiance vient de l'environnement, pas du dépôt.
  assert.equal(K('--signer', '--cle', autre, '--par', 'Intrus').code, 0);
  const usurpe = node(script('impl-builder', 'constitution.mjs'), ['.', '--controler'], { cwd: repo, env: avecCle });
  assert.notEqual(usurpe.code, 0, 'une signature d\'une clé non déclarée ne vaut rien');
  assert.match(usurpe.err, /\(invalide\)/);

  // 5. L'échappatoire existe, mais elle est hors du dépôt : une pull request ne peut pas se l'accorder.
  const force = node(script('impl-builder', 'constitution.mjs'), ['.', '--controler'], { cwd: repo, env: { ...avecCle, TIZI_CONSTITUTION_EXEC_SANS_SIGNATURE: '1' } });
  assert.equal(force.code, 0, 'exécution forcée explicitement');
  assert.match(force.err, /Avertissement/);

  // 6. Récrire l'énoncé d'un principe ne casse pas la signature : seules les commandes sont signées.
  writeFileSync(cfile, readFileSync(join(dir, '.tizi/constitution.yaml')));
  assert.equal(K('--signer', '--cle', cle, '--par', 'Samir').code, 0);
  const c2 = yaml.load(readFileSync(cfile, 'utf8'));
  c2.principles.find(x => x.id === 'PC-01').statement += ' Et cela ne doit pas changer.';
  writeFileSync(cfile, yaml.dump(c2));
  assert.equal(node(script('impl-builder', 'constitution.mjs'), ['.', '--controler'], { cwd: repo, env: avecCle }).code, 0, 'un énoncé récrit ne doit pas exiger une nouvelle signature');
});

test('cinq questions : bloquantes et contradictions d\'abord, cinq au plus', () => {
  const dir = sandbox(); const p = join(dir, 'z.yaml');
  writeFileSync(p, yaml.dump({ document: 'prd', shadow_zones: [
    ...Array.from({ length: 6 }, (_, i) => ({ id: `ZO-H${i}`, type: 'hypothese_non_verifiee', question: 'h ?', status: 'ouverte' })),
    { id: 'ZO-C', type: 'contradiction', question: 'c ?', status: 'ouverte' }, { id: 'ZO-B', type: 'hypothese_non_verifiee', question: 'b ?', status: 'ouverte', blocking: true },
    { id: 'ZO-F', type: 'contradiction', question: 'f ?', status: 'résolue' }] }));
  const top = JSON.parse(node(script('prd-builder', 'ask-five.mjs'), [p, '--json'], { cwd: dir }).out);
  assert.equal(top.length, 5); assert.deepEqual(top.slice(0, 2).map(z => z.id), ['ZO-B', 'ZO-C']); assert.ok(!top.some(z => z.id === 'ZO-F'));

  // La sortie lisible dit que cinq est une sélection, et combien on en pose à la fois. « Pose-les »
  // faisait vider les cinq questions dans un seul tour.
  const out = node(script('prd-builder', 'ask-five.mjs'), [p], { cwd: dir }).out;
  assert.match(out, /sélection, pas un lot à poser/);
  assert.match(out, /deux ou trois à la fois/);
  assert.match(out, /une question ouverte se pose seule/);
  assert.doesNotMatch(out, /Pose-les/, 'la sélection ne doit pas se lire comme un lot à envoyer');
});

test('listes de contrôle : jamais cochées sans relecteur nommé, complètes avant la gouvernance (S80)', () => {
  const dir = sandbox();
  node(script('prd-builder', 'review-checklist.mjs'), ['prd/demo/state.yaml', '--domaines', 'securite'], { cwd: dir });
  const f = join(dir, 'prd/demo/checklists/securite.md');
  const lists = () => [{ file: 'securite.md', text: readFileSync(f, 'utf8') }];
  const s80 = phase => checkState({ document: 'prd', phase }, { checklists: lists() }).filter(x => x.rule === 'S80');
  assert.ok(s80('govern').some(x => /non traité/.test(x.message)));
  writeFileSync(f, readFileSync(f, 'utf8').replace('- [ ] CL-SEC-01', '- [x] CL-SEC-01'));
  assert.ok(s80('specify').some(x => /sans relecteur nommé/.test(x.message)), 'coché sans nom');
  writeFileSync(f, readFileSync(f, 'utf8').replace(/^- \[ \] (CL-SEC-\d+.*)$/gm, '- [x] $1 — Chloé').replace(/^(- \[x\] CL-SEC-01.*\?)$/m, '$1 — Chloé'));
  assert.equal(s80('govern').length, 0);
});

test('analyse croisée : constats vérifiés, transformés en questions proposées', () => {
  const dir = sandbox();
  node(script('prd-builder', 'cross-context.mjs'), ['prd/demo/state.yaml'], { cwd: dir });
  writeFileSync(join(dir, 'prd/demo/analyse/findings.yaml'), yaml.dump({ findings: [
    { id: 'X-01', kind: 'contradiction', items: ['FR-001', 'RG-001'], explanation: 'e', question: 'q ?', confidence: 0.9 },
    { id: 'X-02', kind: 'doublon', items: ['FR-001'], explanation: 'e', question: 'q ?' }] }));
  assert.match(node(script('prd-builder', 'cross-merge.mjs'), ['prd/demo/state.yaml'], { cwd: dir }).out, /1 constat\(s\) retenu\(s\).*1 rejeté/);
  const prop = yaml.load(readFileSync(join(dir, 'prd/demo/analyse/proposals.yaml'), 'utf8')).shadow_zones;
  assert.equal(prop[0].type, 'contradiction'); assert.equal(prop[0].status, 'proposée'); assert.equal(prop[0].blocking, true);
});
