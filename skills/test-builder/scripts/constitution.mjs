#!/usr/bin/env node
// Constitution du produit (.tizi/constitution.yaml) : les quelques principes que toutes les initiatives respectent.
// Elle vit le temps du produit, au-dessus des initiatives : un BRD ou une conception peut PROPOSER un principe, seul
// son responsable l'accepte ; un écart ponctuel est une dérogation nommée ; changer un principe est un amendement tracé.
// Un principe sans moyen de vérification n'est pas un principe : il est refusé.
//
//   --verifier                       forme de la constitution (code 1 si un principe n'est pas vérifiable)
//   --rendre                         écrit .tizi/constitution.md, lisible
//   --proposer --texte "…" --type doit|ne_doit_pas --raison "…" --controle automatique|test|revue --par "<nom>"
//              [--commande "<cmd>"] [--initiative <slug>]           ajoute un principe candidat
//   --decider PC-xx --accepter|--refuser --par "<responsable>" [--responsable "<nom>"]
//   --amender PC-xx --texte "…" --raison "…" --par "<responsable>"  nouvelle version, ancienne conservée
//   --deroger PC-xx --initiative <slug> --element <ID> --raison "…" --par "<approbateur>"
//   --controler                      lance les contrôles automatiques (CI, porte de PR) ; code 1 si l'un échoue
//   --generer-cle --sortie <chemin>  crée une paire Ed25519 : clé privée hors du dépôt, clé publique à déclarer
//   --signer --cle <chemin> --par "<nom>"   signe la surface exécutable → .tizi/constitution.sig
//   --verifier-signature             dit si la surface exécutable est signée par une clé de confiance
// Usage : node constitution.mjs [racine] <action> …
//
// ── Pourquoi une signature ────────────────────────────────────────────────────
// Les contrôles automatiques sont des commandes de shell lues dans un fichier du dépôt, et exécutées
// par la porte de PR — localement ET en CI, sur chaque pull request. Une constitution modifiée faisait
// donc exécuter n'importe quoi, y compris depuis une contribution extérieure.
// Une empreinte approuvée n'y suffit pas : qui modifie le fichier recalcule l'empreinte dans le même
// commit. Il faut une signature asymétrique, et surtout une ancre de confiance QUI N'EST PAS DANS LE
// DÉPÔT — sinon la même contribution remplacerait la clé publique et se signerait elle-même.
// La clé publique de confiance se déclare donc par l'environnement : TIZI_CONSTITUTION_PUBKEY (la clé
// elle-même) ou TIZI_CONSTITUTION_PUBKEY_FILE (un chemin, hors du dépôt). En CI, c'est une variable du
// dépôt ; en local, le profil du développeur. Une pull request ne peut pas les changer.
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign as cryptoSign, verify as cryptoVerify } from 'node:crypto';
import { dirname, join, resolve, sep } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { arr, writeOut, fail, table, today, sha256 } from './lib/common.mjs';

export const constitutionFile = root => join(root, '.tizi', 'constitution.yaml');
export const loadConstitution = root => (existsSync(constitutionFile(root)) ? (yaml.load(readFileSync(constitutionFile(root), 'utf8')) ?? {}) : null);
export const activePrinciples = c => arr(c?.principles).filter(p => p.status === 'actif');
export const signatureFile = root => join(root, '.tizi', 'constitution.sig');

// ── La surface exécutable ─────────────────────────────────────────────────────
// Exactement ce qui sera lancé : l'identifiant et la commande de chaque principe actif à contrôle
// automatique, triés. Signer cela et rien d'autre, c'est signer le risque : récrire l'énoncé d'un
// principe ne casse pas la signature, mais ajouter, changer ou activer une commande, si.
export function executableSurface(c) {
  return arr(c?.principles)
    .filter(p => p.status === 'actif' && p.check?.type === 'automatique' && p.check?.command)
    .map(p => ({ id: String(p.id), command: String(p.check.command) }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
export const surfaceBytes = c => Buffer.from(
  ['tizi-constitution-exec-v1', ...executableSurface(c).map(x => `${x.id}\t${x.command}`)].join('\n'),
  'utf8',
);

// Clé publique de confiance, déclarée hors du dépôt. Jamais lue depuis le dépôt : voir l'en-tête.
function trustedKey() {
  const inline = process.env.TIZI_CONSTITUTION_PUBKEY;
  const file = process.env.TIZI_CONSTITUTION_PUBKEY_FILE;
  let pem = '';
  if (inline) pem = inline.includes('BEGIN') ? inline : Buffer.from(inline, 'base64').toString('utf8');
  else if (file && existsSync(file)) pem = readFileSync(file, 'utf8');
  if (!pem.trim()) return null;
  try { return createPublicKey(pem); } catch { return 'illisible'; }
}

// États possibles, et ce qu'ils autorisent :
//   valide      → les commandes peuvent être exécutées ;
//   sans-cle    → aucune clé de confiance déclarée : on n'exécute pas, on ne conclut pas ;
//   absente     → surface exécutable non signée : on n'exécute pas ;
//   invalide    → signature qui ne correspond pas à la surface actuelle : on n'exécute pas ;
//   rien-a-faire→ aucun principe à contrôle automatique : il n'y a rien à signer.
export function verifySignature(root, c) {
  if (!executableSurface(c).length) return { state: 'rien-a-faire', detail: 'aucun principe à contrôle automatique' };
  const key = trustedKey();
  if (!key) return { state: 'sans-cle', detail: 'aucune clé publique de confiance : déclare TIZI_CONSTITUTION_PUBKEY (ou TIZI_CONSTITUTION_PUBKEY_FILE), hors du dépôt' };
  if (key === 'illisible') return { state: 'sans-cle', detail: 'la clé publique déclarée est illisible' };
  const sp = signatureFile(root);
  if (!existsSync(sp)) return { state: 'absente', detail: `signature absente (${sp}) : signe la constitution avec --signer` };
  let rec;
  try { rec = yaml.load(readFileSync(sp, 'utf8')) ?? {}; } catch { return { state: 'invalide', detail: 'signature illisible' }; }
  if (!rec.signature) return { state: 'invalide', detail: 'signature vide' };
  let ok = false;
  try { ok = cryptoVerify(null, surfaceBytes(c), key, Buffer.from(String(rec.signature), 'base64')); } catch { ok = false; }
  if (!ok) return { state: 'invalide', detail: `la signature ne correspond pas aux commandes actuelles — signée par ${rec.signed_by ?? '—'} le ${rec.date ?? '—'} ; relis le diff de .tizi/constitution.yaml avant de resigner` };
  return { state: 'valide', detail: `signée par ${rec.signed_by ?? '—'} le ${rec.date ?? '—'}` };
}

// Sortie unique pour les deux appelants : exécuter, ou dire pourquoi on n'exécute pas.
// L'échappatoire est elle aussi hors du dépôt : une pull request ne peut pas se l'accorder.
export const EXEC_SANS_SIGNATURE = 'TIZI_CONSTITUTION_EXEC_SANS_SIGNATURE';
export function mayExecute(root, c) {
  const v = verifySignature(root, c);
  if (v.state === 'valide' || v.state === 'rien-a-faire') return { allowed: true, ...v };
  if (process.env[EXEC_SANS_SIGNATURE] === '1') {
    return { allowed: true, ...v, forced: true, detail: `${v.detail} — exécuté quand même (${EXEC_SANS_SIGNATURE}=1)` };
  }
  return { allowed: false, ...v };
}

export function checkConstitution(c) {
  const out = [];
  const act = activePrinciples(c);
  if (act.length > 10) out.push(`plus de dix principes actifs (${act.length}) : au-delà, plus personne ne les lit et ils se contredisent`);
  for (const p of arr(c?.principles).filter(x => x.status !== 'refusé')) {
    if (!/\b(doit|doivent|ne doit pas|ne doivent pas)\b/i.test(p.statement ?? '')) out.push(`${p.id} : l'énoncé ne dit pas ce qui est exigé (« doit », « ne doit pas »)`);
    if (!p.check?.type) out.push(`${p.id} : aucun moyen de vérification — un principe invérifiable est un slogan`);
    else if (p.check.type === 'automatique' && !p.check.command) out.push(`${p.id} : contrôle automatique sans commande`);
    if (p.status === 'actif' && !p.owner) out.push(`${p.id} : actif sans responsable`);
    if (!p.rationale) out.push(`${p.id} : sans raison`);
  }
  for (const w of arr(c?.waivers)) if (!w.approved_by || !w.reason) out.push(`dérogation à ${w.principle} sans raison ou sans approbateur`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : '');
  const valued = ['--texte', '--type', '--raison', '--controle', '--par', '--commande', '--initiative', '--decider', '--responsable', '--amender', '--deroger', '--element', '--cle', '--sortie'];
  const root = args.find((a, i) => !a.startsWith('--') && !valued.includes(args[i - 1])) ;
if (!root) fail('Usage : node constitution.mjs <dépôt> [options]. Le dépôt est explicite : ce script écrit .tizi/constitution.yaml. Pour le dépôt courant : node constitution.mjs .', 2);
  const c = loadConstitution(root) ?? { version: 0, principles: [], amendments: [], waivers: [] };
  const save = () => writeOut(constitutionFile(root), `# Constitution du produit — tenue par constitution.mjs. Les principes actifs s'appliquent à toutes les initiatives.\n${yaml.dump(c, { lineWidth: 120 })}`);
  const find = id => { const p = arr(c.principles).find(x => x.id === id); if (!p) fail(`${id} introuvable.`); return p; };
  const now = today();
  if (args.includes('--proposer')) {
    const need = ['--texte', '--type', '--raison', '--controle', '--par'].filter(k => !opt(k));
    if (need.length) fail(`Principe incomplet (manque : ${need.join(', ')}).`, 2);
    if (!['automatique', 'test', 'revue'].includes(opt('--controle'))) fail('Contrôle : automatique (une commande), test (des tests étiquetés @PC-xx) ou revue.', 2);
    if (opt('--controle') === 'automatique' && !opt('--commande')) fail('Un contrôle automatique a une commande (--commande).', 2);
    const id = `PC-${String(arr(c.principles).length + 1).padStart(2, '0')}`;
    c.principles = [...arr(c.principles), { id, statement: opt('--texte'), kind: opt('--type'), rationale: opt('--raison'), check: { type: opt('--controle'), ...(opt('--commande') ? { command: opt('--commande') } : {}) }, status: 'candidat', proposed_by: opt('--par'), proposed_at: now, ...(opt('--initiative') ? { source_initiative: opt('--initiative') } : {}), version: 1 }];
    save(); console.log(`${id} proposé comme principe candidat : « ${opt('--texte')} ». Seul le responsable de la constitution peut l'accepter.`);
  } else if (opt('--decider')) {
    const p = find(opt('--decider'));
    if (!opt('--par')) fail('Qui décide ? --par "<responsable>".', 2);
    if (args.includes('--accepter')) { Object.assign(p, { status: 'actif', owner: opt('--responsable') || opt('--par'), decided_by: opt('--par'), since: now }); c.version = (c.version ?? 0) + 1; }
    else if (args.includes('--refuser')) Object.assign(p, { status: 'refusé', decided_by: opt('--par'), decided_at: now });
    else fail('--accepter ou --refuser.', 2);
    save(); console.log(`${p.id} ${p.status === 'actif' ? 'accepté : il s\'applique désormais à toutes les initiatives' : 'refusé : la contrainte reste locale à son initiative'} (constitution v${c.version}).`);
  } else if (opt('--amender')) {
    const p = find(opt('--amender'));
    if (!opt('--texte') || !opt('--raison') || !opt('--par')) fail('Un amendement a un nouveau texte, une raison et son auteur (le responsable).', 2);
    if (p.owner && opt('--par') !== p.owner) fail(`Seul le responsable de ${p.id} (${p.owner}) peut l'amender.`);
    c.amendments = [...arr(c.amendments), { principle: p.id, from_version: p.version ?? 1, previous: p.statement, reason: opt('--raison'), by: opt('--par'), date: now }];
    Object.assign(p, { statement: opt('--texte'), version: (p.version ?? 1) + 1 }); c.version = (c.version ?? 0) + 1;
    save(); console.log(`${p.id} amendé (version ${p.version}, constitution v${c.version}). Les conceptions qui s'y réfèrent sont à revoir.`);
  } else if (opt('--deroger')) {
    const p = find(opt('--deroger'));
    const need = ['--initiative', '--element', '--raison', '--par'].filter(k => !opt(k));
    if (need.length) fail(`Dérogation incomplète (manque : ${need.join(', ')}). Un écart à un principe est une décision nommée.`, 2);
    c.waivers = [...arr(c.waivers), { principle: p.id, initiative: opt('--initiative'), element: opt('--element'), reason: opt('--raison'), approved_by: opt('--par'), date: now }];
    save(); console.log(`Dérogation à ${p.id} enregistrée pour ${opt('--element')} (${opt('--initiative')}), approuvée par ${opt('--par')}.`);
  } else if (args.includes('--generer-cle')) {
    const out = opt('--sortie');
    if (!out) fail('Usage : node constitution.mjs <dépôt> --generer-cle --sortie <chemin-de-la-cle-privee>\n  Choisis un chemin HORS du dépôt : une clé privée versionnée ne protège plus rien.', 2);
    // Une clé privée dans le dépôt finit commitée, et ne protège alors plus rien : qui peut écrire
    // dans le dépôt peut signer. On refuse le chemin plutôt que de laisser l'erreur se produire.
    const dedans = resolve(out) === resolve(root) || resolve(out).startsWith(`${resolve(root)}${sep}`);
    if (dedans) fail(`${out} est dans le dépôt : une clé privée versionnée ne protège plus rien, puisque qui peut écrire dans le dépôt peut signer.\n  Choisis un chemin hors du dépôt, par exemple ~/.tizi/cle-constitution.pem`, 2);
    if (existsSync(out) && !args.includes('--force')) fail(`${out} existe déjà : --force pour le remplacer (l'ancienne signature deviendra invérifiable).`);
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    mkdirSync(dirname(out) || '.', { recursive: true });
    writeFileSync(out, privateKey.export({ type: 'pkcs8', format: 'pem' }));
    try { chmodSync(out, 0o600); } catch { /* droits non supportés : ignoré */ }
    const pub = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    console.log(`Clé privée écrite : ${out} (droits 600). Ne la commite pas, ne la partage pas.`);
    console.log('\nDéclare la clé publique hors du dépôt — c\'est elle qui fait la confiance :');
    console.log(`\n  export TIZI_CONSTITUTION_PUBKEY='${pub.trim()}'\n`);
    console.log('En CI : une variable du dépôt (GitHub → Settings → Variables), pas un secret du commit.');
    console.log('Puis signe : node constitution.mjs . --signer --cle ' + out + ' --par "<nom>"');
  } else if (args.includes('--signer')) {
    const cle = opt('--cle'), par = opt('--par');
    if (!cle || !par) fail('Usage : node constitution.mjs <dépôt> --signer --cle <chemin-cle-privee> --par "<nom>"', 2);
    if (!existsSync(cle)) fail(`Clé privée introuvable : ${cle}`);
    const surface = executableSurface(c);
    if (!surface.length) fail('Aucun principe à contrôle automatique : il n\'y a rien à signer.', 1);
    let key;
    try { key = createPrivateKey(readFileSync(cle, 'utf8')); } catch (e) { fail(`Clé privée illisible : ${e.message}`); }
    console.log('Commandes signées — relis-les, c\'est ce qui sera exécuté localement et en CI :');
    for (const x of surface) console.log(`  ${x.id} : ${x.command}`);
    const signature = cryptoSign(null, surfaceBytes(c), key).toString('base64');
    writeOut(signatureFile(root), `# Signature de la surface exécutable de la constitution — écrite par constitution.mjs --signer.\n# Elle ne couvre que les commandes des principes actifs à contrôle automatique : récrire un énoncé ne la casse pas.\n${yaml.dump({ algorithm: 'ed25519', signed_by: par, date: today(), surface_sha256: sha256(surfaceBytes(c)), commands: surface.length, signature }, { lineWidth: 100 })}`);
    console.log(`\nSignature écrite : ${signatureFile(root)} — à commiter. ${surface.length} commande(s).`);
  } else if (args.includes('--verifier-signature')) {
    const v = verifySignature(root, c);
    const mark = { valide: '✓', 'rien-a-faire': '✓', 'sans-cle': '?', absente: '✗', invalide: '✗' }[v.state];
    console.log(`${mark} ${v.state} — ${v.detail}`);
    process.exitCode = ['valide', 'rien-a-faire'].includes(v.state) ? 0 : 1;
  } else if (args.includes('--controler')) {
    const autos = activePrinciples(c).filter(x => x.check?.type === 'automatique');
    if (!autos.length) { console.log('Aucun principe à contrôle automatique.'); process.exitCode = 0; }
    else {
      // On n'exécute pas des commandes du dépôt sans une autorisation venue de l'extérieur du dépôt.
      const g = mayExecute(root, c);
      if (!g.allowed) {
        console.error(`✗ Contrôles non exécutés — constitution non signée (${g.state}) : ${g.detail}.`);
        console.error(`  Signe-la : node constitution.mjs ${root} --signer --cle <clé privée> --par "<nom>" (--generer-cle si tu n'en as pas).`);
        console.error(`  En connaissance de cause, et seulement hors du dépôt : ${EXEC_SANS_SIGNATURE}=1.`);
        process.exitCode = 1;
      } else {
        if (g.forced) console.warn(`Avertissement : ${g.detail}`);
        let ko = 0;
        for (const p of autos) {
          const r = spawnSync(p.check.command, { shell: true, cwd: root, encoding: 'utf8' });
          console.log(`${r.status === 0 ? '✓' : '✗'} ${p.id} — ${p.statement}${r.status === 0 ? '' : `\n    ${(r.stdout + r.stderr).trim().split('\n').slice(0, 5).join('\n    ')}`}`);
          if (r.status !== 0) ko += 1;
        }
        process.exitCode = ko ? 1 : 0;
      }
    }
  } else if (args.includes('--rendre')) {
    const md = [`# Constitution du produit — version ${c.version ?? 0}`, '', 'Les principes actifs s\'appliquent à toutes les initiatives. Un écart est une dérogation nommée ; un changement est un amendement décidé par le responsable du principe.', '',
      table(['Principe', 'Énoncé', 'Raison', 'Vérification', 'Responsable'], activePrinciples(c).map(p => [`${p.id} (v${p.version ?? 1})`, p.statement, p.rationale, `${p.check?.type}${p.check?.command ? ` : \`${p.check.command}\`` : ''}`, p.owner])), ''];
    const cand = arr(c.principles).filter(p => p.status === 'candidat');
    if (cand.length) md.push('## Principes candidats', '', table(['Principe', 'Énoncé', 'Proposé par', 'Initiative'], cand.map(p => [p.id, p.statement, p.proposed_by, p.source_initiative ?? '—'])), '');
    if (arr(c.waivers).length) md.push('## Dérogations', '', table(['Principe', 'Initiative', 'Élément', 'Raison', 'Approuvée par', 'Date'], c.waivers.map(w => [w.principle, w.initiative, w.element, w.reason, w.approved_by, w.date])), '');
    if (arr(c.amendments).length) md.push('## Amendements', '', table(['Principe', 'Version précédente', 'Ancien texte', 'Raison', 'Par', 'Date'], c.amendments.map(a => [a.principle, a.from_version, a.previous, a.reason, a.by, a.date])), '');
    writeOut(join(root, '.tizi', 'constitution.md'), md.join('\n'));
    console.log(`Constitution rendue : ${join(root, '.tizi', 'constitution.md')}`);
  } else {
    const issues = checkConstitution(c);
    console.log(issues.length ? issues.map(x => `⚠ ${x}`).join('\n') : `Constitution conforme : ${activePrinciples(c).length} principe(s) actif(s), version ${c.version ?? 0}.`);
    process.exitCode = issues.some(x => /vérification|commande|responsable/.test(x)) ? 1 : 0;
  }
}
