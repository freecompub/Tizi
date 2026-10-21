// Revue de code : rattachement au commit et au diff exacts, chemins de travail.
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { sha256 } from './common.mjs';

export const git = (...args) => { const r = spawnSync('git', args, { encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; };
export function resolveBase(explicit, cfg) {
  for (const b of [explicit, cfg?.review?.base, 'origin/main', 'main', 'master'].filter(Boolean)) if (git('rev-parse', '--verify', '--quiet', `${b}^{commit}`)) return b;
  return null;
}
// Le diff de revue : de la base à l'arbre de travail (inclut le non commité). Son empreinte rattache la revue.
export function currentDiff(base) {
  const head = git('rev-parse', 'HEAD');
  // Les fichiers de travail du SDLC (état d'implémentation, revue, journaux, rapports) ne font pas partie du code revu :
  // sinon, enregistrer le résultat de la revue changerait l'empreinte et la rendrait périmée d'elle-même.
  const EXCLUDE = [':(exclude)impl', ':(exclude).impl', ':(exclude).tizi', ':(exclude)reports'];
  const patch = spawnSync('git', ['diff', '--no-color', '--no-ext-diff', base, '--', '.', ...EXCLUDE], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).stdout ?? '';
  const files = (git('diff', '--name-only', base, '--', '.', ...EXCLUDE) ?? '').split('\n').filter(Boolean);
  const untracked = (git('ls-files', '--others', '--exclude-standard') ?? '').split('\n').filter(Boolean).filter(f => !/^(impl|\.impl|\.tizi|reports)\//.test(f));
  return { head, patch, files: [...new Set([...files, ...untracked])], untracked, digest: sha256(`${head}\n${patch}\n${untracked.join('\n')}`) };
}
export const reviewDir = (statePath, task) => join(dirname(statePath), 'review', task);
