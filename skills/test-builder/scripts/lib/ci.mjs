// Provenance des preuves : commit de la version candidate, et contrôle d'un relevé de provenance (ci-fetch.mjs).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from './vendor/js-yaml.mjs';
import { arr, fileSha256 } from './common.mjs';

const git = (...a) => { const r = spawnSync('git', a, { encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : ''; };
export const candidateCommit = st => st.candidate_commit || git('rev-parse', '--verify', '--quiet', `${st.candidate}^{commit}`) || '';

// Condition R9 de la porte de release : les rapports utilisés viennent d'un passage de CI réussi sur le commit candidat.
export function provenanceCheck(state, root) {
  const ci = state.settings?.ci ?? {};
  if (ci.required === false) return ci.reason ? { ok: true, detail: `provenance non exigée : ${ci.reason}` } : { ok: false, detail: 'provenance désactivée sans raison écrite (settings.ci.reason)' };
  const p = join(root, 'ci', 'provenance.yaml');
  if (!existsSync(p)) return { ok: false, detail: 'provenance non vérifiée : lancer ci-fetch.mjs' };
  const prov = yaml.load(readFileSync(p, 'utf8'));
  const sha = candidateCommit(state);
  const problems = [];
  if (!prov.verified) problems.push(...arr(prov.problems));
  if (sha && prov.commit !== sha) problems.push(`provenance relevée pour ${String(prov.commit).slice(0, 10)}, la version candidate est ${sha.slice(0, 10)}`);
  const known = new Set(arr(prov.reports).filter(r => r.verified).map(r => r.sha256));
  for (const [name, path] of Object.entries(state.settings?.reports ?? {})) {
    if (!path || !existsSync(path)) continue;
    if (!known.has(fileSha256(path))) problems.push(`rapport « ${name} » (${path}) absent du passage de CI vérifié : preuve locale ou d'une autre version`);
  }
  // Mesures de NFR : rapport issu du passage de CI vérifié, ou mesure hors CI rattachée au commit candidat et inchangée.
  for (const n of arr(state.nfr_results)) {
    const ev = n.evidence && existsSync(n.evidence) ? fileSha256(n.evidence) : null;
    if (ev && known.has(ev)) continue;
    if (!n.evidence || !ev) { problems.push(`mesure ${n.id} : rapport absent`); continue; }
    if (!n.measured_commit) { problems.push(`mesure ${n.id} : ni produite par la CI, ni rattachée à un commit (record-nfr.mjs)`); continue; }
    if (sha && !sha.startsWith(n.measured_commit) && !n.measured_commit.startsWith(sha)) problems.push(`mesure ${n.id} prise sur ${String(n.measured_commit).slice(0, 10)}, pas sur la version candidate`);
    if (n.evidence_sha256 && n.evidence_sha256 !== ev) problems.push(`mesure ${n.id} : rapport modifié depuis son enregistrement`);
  }
  return problems.length ? { ok: false, detail: problems.join(' ; ') } : { ok: true, detail: `passage ${prov.run?.id} (${prov.run?.event}) réussi sur ${String(prov.commit).slice(0, 10)}, ${arr(prov.reports).length} rapport(s) vérifié(s)` };
}
