#!/usr/bin/env node
// Adoption de Tizi sur une application existante. Observe le dépôt, sans rien exécuter, et propose :
//   impl/config.yaml       commandes de test, dossiers de production, de tests et de contrats (jamais écrasé sans --force)
//   .tizi/adoption.yaml    carte grossière des conteneurs existants, chacun prouvé par le fichier qui l'établit,
//                          à reprendre par la conception (sad-builder, références brownfield) comme existant à vérifier
//   .tizi/adoption.md      ce qui a été trouvé, ce qui reste incertain, et les prochaines étapes
// Rien n'est déduit sans preuve : ce que le script ne peut établir est listé comme incertain.
// Usage : node adopt.mjs [racine] [--force]
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, basename, dirname } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { writeOut, today } from './lib/common.mjs';

const args = process.argv.slice(2);
const root = args.find(a => !a.startsWith('--')) ?? '.';
const force = args.includes('--force');
const IGNORE = new Set(['node_modules', '.git', '.build', 'build', 'dist', '.next', 'DerivedData', 'Pods', 'vendor', '.tizi', '.impl', 'reports', 'coverage']);
const rel = p => relative(root, p).split('\\').join('/');
const files = [];
const walk = (d, depth = 0) => { if (depth > 5) return; for (const n of readdirSync(d)) { if (IGNORE.has(n)) continue; const p = join(d, n); let st; try { st = statSync(p); } catch { continue; } if (st.isDirectory()) { if (n.endsWith('.xcodeproj') || n.endsWith('.xcworkspace')) files.push(p); walk(p, depth + 1); } else files.push(p); } };
walk(root);
const find = re => files.filter(p => re.test(rel(p)));
const exists = p => existsSync(join(root, p));
const json = p => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };

const containers = [], suites = {}, production = new Set(), tests = new Set(), contracts = new Set(), uncertain = [];
let n = 0, m = 0;
const add = (name, subtype, technology, dirs, evidence) => {
  // Une même base vue par deux fichiers (Prisma et docker-compose) est un seul conteneur : on fusionne les preuves.
  const words = t => t.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 3);
  const same = ['datastore', 'queue'].includes(subtype) && containers.find(c => c.subtype === subtype && c.kind === 'container' && words(c.technology).some(w => words(technology).some(x => x.startsWith(w) || w.startsWith(x))));
  if (same) { same.evidence.push(...evidence); return same; }
  n += 1; const c = { id: `CT-${String(n).padStart(2, '0')}`, name, kind: 'container', subtype, technology, lifecycle: 'existant_conservé', status: 'proposé', dirs, evidence };
  containers.push(c); dirs.forEach(d => production.add(d)); return c;
};
const addComponent = (parent, name, technology, dirs, evidence) => { m += 1; containers.push({ id: `CP-${String(m).padStart(2, '0')}`, name, kind: 'component', parent: parent.id, technology, lifecycle: 'existant_conservé', status: 'proposé', dirs, evidence }); };

// ── Node.js / Next.js ──
for (const pj of find(/(^|\/)package\.json$/)) {
  const pkg = json(pj); if (!pkg) continue;
  const base = rel(dirname(pj)) || '.';
  const prefix = base === '.' ? '' : `${base}/`;
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const isNext = !!deps.next;
  const src = ['app', 'pages', 'src', 'lib', 'components', 'server'].filter(d => exists(`${prefix}${d}`)).map(d => `${prefix}${d}/**`);
  if (isNext) {
    const web = add(pkg.name ? `${pkg.name} (web)` : 'Application web', 'web', `Next.js ${deps.next}`, src.length ? src : [`${prefix}**`], [`${rel(pj)} : dépendance next`]);
    // Les routes d'API d'une application Next.js sont déployées avec elle : un composant du même conteneur, pas un conteneur à part.
    const api = ['app/api', 'pages/api', 'src/app/api', 'src/pages/api'].filter(d => exists(`${prefix}${d}`));
    if (api.length) addComponent(web, 'Routes d\'API', 'Next.js (routes d\'API)', api.map(d => `${prefix}${d}/**`), api.map(d => `${prefix}${d}/ : routes d'API`));
  } else if (src.length && (pkg.main || deps.express || deps.fastify || deps['@nestjs/core'])) {
    add(pkg.name ?? 'Service Node.js', 'api', deps.express ? 'Node.js / Express' : deps.fastify ? 'Node.js / Fastify' : deps['@nestjs/core'] ? 'Node.js / NestJS' : 'Node.js', src, [`${rel(pj)}`]);
  }
  const t = pkg.scripts?.test;
  if (t && !/no test specified/.test(t)) {
    const runner = deps.vitest ? 'vitest' : deps.jest ? 'jest' : /node --test/.test(t) ? 'node' : deps.mocha ? 'mocha' : '';
    const junit = { vitest: `npx vitest run --reporter=junit --outputFile=reports/unit.xml`, jest: `npx jest --ci --reporters=default --reporters=jest-junit  # nécessite jest-junit ; rapport dans junit.xml (JEST_JUNIT_OUTPUT_FILE=reports/unit.xml)`, node: `node --test --test-reporter=junit --test-reporter-destination=reports/unit.xml`, mocha: `npx mocha --reporter mocha-junit-reporter --reporter-options mochaFile=reports/unit.xml` }[runner];
    suites[`unit${base === '.' ? '' : `-${basename(base)}`}`] = { command: base === '.' ? (junit ?? t) : `cd ${base} && ${junit ?? t}`, report: `${prefix}reports/unit.xml`, detected_from: `${rel(pj)} : scripts.test = « ${t} »` };
    if (!junit) uncertain.push(`${rel(pj)} : lanceur de tests non reconnu ; adapter la commande pour produire un rapport JUnit dans ${prefix}reports/unit.xml`);
    if (deps['@stryker-mutator/core']) suites.mutation = { command: `${base === '.' ? '' : `cd ${base} && `}npx stryker run --incremental`, report: `${prefix}reports/mutation/mutation.json`, threshold: 70 };
  }
  ['test', 'tests', '__tests__', 'e2e', 'features'].filter(d => exists(`${prefix}${d}`)).forEach(d => tests.add(`${prefix}${d}/**`));
  tests.add(`${prefix}**/*.test.*`); tests.add(`${prefix}**/*.spec.*`);
}
// ── iOS / Swift ──
const projects = files.filter(p => /\.xcodeproj$/.test(p));
for (const xp of projects) {
  const name = basename(xp, '.xcodeproj');
  const schemesDir = join(xp, 'xcshareddata', 'xcschemes');
  const schemes = existsSync(schemesDir) ? readdirSync(schemesDir).filter(f => f.endsWith('.xcscheme')).map(f => f.replace(/\.xcscheme$/, '')) : [];
  const dir = rel(dirname(xp)) || '.';
  const srcDir = [`${dir === '.' ? '' : `${dir}/`}${name}`].find(d => exists(d));
  add(`${name} (iOS)`, 'mobile', 'Swift / Xcode', srcDir ? [`${srcDir}/**`] : [`${dir === '.' ? '' : `${dir}/`}**/*.swift`], [`${rel(xp)}`, ...schemes.map(s => `schéma partagé : ${s}`)]);
  tests.add('**/*Tests/**');
  const scheme = schemes[0] ?? name;
  suites[`unit-ios${projects.length > 1 ? `-${name}` : ''}`] = {
    command: `xcodebuild test -project ${rel(xp)} -scheme ${scheme} -destination 'platform=iOS Simulator,name=iPhone 16' -resultBundlePath reports/${name}.xcresult && xcresultparser -o junit reports/${name}.xcresult > reports/unit-ios.xml`,
    report: 'reports/unit-ios.xml', detected_from: `${rel(xp)}${schemes.length ? ` (schémas : ${schemes.join(', ')})` : ' (aucun schéma partagé trouvé)'}`,
  };
  uncertain.push(`iOS : vérifier le schéma (${scheme}), le simulateur, et l'outil de conversion du résultat en JUnit (xcresultparser, ou trainer) sur la machine qui lance les tests`);
  if (!schemes.length) uncertain.push(`${rel(xp)} : aucun schéma partagé ; partager le schéma de test dans Xcode pour qu'il soit utilisable en ligne de commande`);
}
for (const sp of find(/(^|\/)Package\.swift$/)) {
  const dir = rel(dirname(sp)) || '.';
  if (projects.some(x => rel(dirname(x)) === dir)) continue;
  add(`Paquet Swift ${basename(dirname(sp))}`, 'library', 'Swift Package', [`${dir === '.' ? '' : `${dir}/`}Sources/**`], [rel(sp)]);
  suites[`unit-swift`] = { command: `${dir === '.' ? '' : `cd ${dir} && `}swift test --xunit-output reports/unit-swift.xml`, report: `${dir === '.' ? '' : `${dir}/`}reports/unit-swift.xml`, detected_from: rel(sp) };
  tests.add(`${dir === '.' ? '' : `${dir}/`}Tests/**`);
}
// ── Python ──
for (const pp of find(/(^|\/)pyproject\.toml$/)) {
  const text = readFileSync(pp, 'utf8'); const dir = rel(dirname(pp)) || '.';
  if (/pytest/.test(text)) { suites['unit-python'] = { command: `${dir === '.' ? '' : `cd ${dir} && `}pytest --junitxml=reports/unit-python.xml`, report: `${dir === '.' ? '' : `${dir}/`}reports/unit-python.xml`, detected_from: rel(pp) }; tests.add(`${dir === '.' ? '' : `${dir}/`}tests/**`); }
}
// ── Données et infrastructure ──
for (const p of find(/(^|\/)prisma\/schema\.prisma$/)) { const prov = (readFileSync(p, 'utf8').match(/provider\s*=\s*"(\w+)"/g) ?? []).map(x => x.match(/"(\w+)"/)[1]).filter(x => x !== 'prisma-client-js'); add('Base de données', 'datastore', prov.join(', ') || 'non établie', [], [`${rel(p)}${prov.length ? ` : provider ${prov.join(', ')}` : ''}`]); }
for (const p of find(/(^|\/)(docker-)?compose\.ya?ml$/)) {
  const doc = (() => { try { return yaml.load(readFileSync(p, 'utf8')); } catch { return null; } })();
  for (const [svc, def] of Object.entries(doc?.services ?? {})) if (/postgres|mysql|mariadb|mongo|redis|rabbit|kafka/i.test(def?.image ?? '')) add(svc, /redis|rabbit|kafka/i.test(def.image) ? 'queue' : 'datastore', def.image, [], [`${rel(p)} : service ${svc}`]);
}
for (const p of find(/(^|\/)(openapi|swagger|asyncapi)[^/]*\.(ya?ml|json)$/i)) contracts.add(rel(p));
if (exists('contracts')) contracts.add('contracts/**');
if (!containers.length) uncertain.push('aucun conteneur établi : pile non reconnue ; décrire l\'existant avec la conception (sad-builder, mode brownfield)');
if (!Object.keys(suites).length) uncertain.push('aucune commande de test trouvée : la renseigner à la main dans impl/config.yaml');
uncertain.push('les échanges entre conteneurs (qui appelle qui) ne sont pas déduits : la conception les établit à partir du code, en mode brownfield');

// ── Écritures ──
const cfgPath = join(root, 'impl', 'config.yaml');
const cfg = {
  review: { required: false, base: '' },
  suites: Object.fromEntries(Object.entries(suites).map(([k, v]) => [k, { command: v.command, report: v.report, ...(v.threshold ? { threshold: v.threshold } : {}) }])),
  paths: { production: [...production], tests: [...tests], contracts: [...contracts], always_allowed: ['impl/**', '.impl/**', '.tizi/**', 'docs/**', 'reports/**'] },
  elements: Object.fromEntries(containers.filter(c => c.dirs.length).map(c => [c.id, c.dirs])),
};
const wroteCfg = !existsSync(cfgPath) || force;
if (wroteCfg) writeOut(cfgPath, `# Proposé par adopt.mjs le ${today()} à partir des fichiers du dépôt — à relire : rien n'a été exécuté.\n# Les identifiants CT-xx renvoient à .tizi/adoption.yaml ; la conception les reprend et peut les renommer.\n${yaml.dump(cfg, { lineWidth: 140 })}`);
writeOut(join(root, '.tizi', 'adoption.yaml'), `# Carte grossière de l'existant, proposée par adopt.mjs le ${today()} : chaque conteneur cite le fichier qui l'établit.\n# À reprendre dans la conception (sad-builder, références brownfield) comme éléments existants, à vérifier.\n${yaml.dump({ elements: containers, uncertain }, { lineWidth: 140 })}`);
const md = [`# Adoption de Tizi — ${today()}`, '', 'Ce que le dépôt montre, sans rien exécuter. Tout est une proposition à relire.', '',
  '## Conteneurs trouvés', '', ...(containers.length ? containers.map(c => `- **${c.id} ${c.name}** (${c.kind === 'component' ? `composant de ${c.parent}` : c.subtype}, ${c.technology}) — dossiers : ${c.dirs.join(', ') || '—'} — preuve : ${c.evidence.join(' ; ')}`) : ['_Aucun._']), '',
  '## Commandes de test proposées', '', ...(Object.keys(suites).length ? Object.entries(suites).map(([k, v]) => `- **${k}** : \`${v.command}\` — d'après ${v.detected_from}`) : ['_Aucune._']), '',
  '## Contrats', '', [...contracts].length ? [...contracts].map(c => `- \`${c}\``).join('\n') : '_Aucun contrat trouvé._', '',
  '## Incertain', '', ...uncertain.map(u => `- ${u}`), '',
  '## Étapes suivantes', '',
  `1. Relire ${wroteCfg ? '`impl/config.yaml`, proposé par ce script' : '`impl/config.yaml` : il existait déjà, il n\'a pas été modifié (comparer avec `.tizi/adoption.yaml`, ou relancer avec --force)'}, et lancer une fois chaque commande de test à la main.`,
  '2. Pour le premier changement, choisir son chemin avec `/tizi` (Claude Code) ou l\'agent `tizi` (Copilot).',
  '3. Quand ce changement passe par la conception, reprendre `.tizi/adoption.yaml` comme existant à vérifier : on n\'inventorie que ce qui borde le changement.',
  '4. Après la première conception figée, synchroniser les instructions du dépôt (`sync-agent-instructions.mjs`).', ''];
writeOut(join(root, '.tizi', 'adoption.md'), md.join('\n'));
console.log(`Adoption : ${containers.filter(c => c.kind === 'container').length} conteneur(s), ${containers.filter(c => c.kind === 'component').length} composant(s), ${Object.keys(suites).length} suite(s) de tests, ${contracts.size} contrat(s), ${uncertain.length} point(s) incertain(s).`);
console.log(wroteCfg ? `impl/config.yaml proposé (${cfgPath}).` : 'impl/config.yaml existe déjà : non modifié (--force pour le remplacer).');
console.log(`Voir ${join(root, '.tizi', 'adoption.md')}.`);
