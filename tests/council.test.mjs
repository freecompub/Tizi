// Ce que le council rapporte, et pourquoi personne ne le savait. Les compteurs de `council_runs` ont
// été écrits « pour mesurer si le council valait le coup », et aucun outil ne les agrégeait : vérifié
// avant d'écrire le script, la seule mention de ce bloc dans tous les scripts était une liste
// d'exclusion. Des chiffres qu'aucun outil ne relit ne mesurent rien — ils trompent un lecteur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from '../skills/brd-builder/scripts/lib/vendor/js-yaml.mjs';
import { ROOT, script, node, tempDir } from './helpers.mjs';

// Un portefeuille sur le disque : un dossier par initiative, un état par document.
function portefeuille(initiatives) {
  const racine = tempDir('council');
  for (const [chemin, etat] of Object.entries(initiatives)) {
    const dir = join(racine, chemin);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'state.yaml'), yaml.dump(etat));
  }
  return racine;
}
const lance = (racine, args = []) => node(script('brd-builder', 'council-report.mjs'), [racine, ...args]);

const question = (text, o = {}) => ({ text, lenses: ['sceptique'], outcome: 'retenue', ...o });
const zone = (id, status, o = {}) => ({ id, type: 'question', question: 'q', status, resolution: 'r', ...o });

test('zéro passage ne se présente pas comme un résultat', () => {
  // Ne pas savoir n'est pas constater, et c'est vrai d'un script de mesure comme d'une règle. Un
  // tableau de zéros se lirait « le council ne rapporte rien », ce qui est faux : il n'a pas tourné.
  const r = lance(portefeuille({ 'brd/accueil': { document: 'brd', phase: 'define' } }));
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /Aucun passage de council enregistré dans 1 document\(s\)/);
  assert.match(r.out, /Ce n'est pas une mesure : c'est l'absence de mesure/);
  assert.doesNotMatch(r.out, /0 %/, 'un zéro calculé sur rien ne doit pas s\'afficher');
  // Et c'est ce que dit le dépôt lui-même : `council_runs` y est vide partout.
  const surLeDepot = lance(ROOT);
  assert.match(surLeDepot.out, /Aucun passage de council enregistré/,
    'si un dossier du dépôt se met à tracer ses councils, ce test doit être relu');
});

test('un passage partagé se compte une fois, pas une fois par initiative', () => {
  // Le piège que `references/council.md` nomme lui-même, et qui s'est déjà produit : un passage
  // partagé s'écrit à l'identique dans chaque dossier, et une somme naïve le compte autant de fois
  // qu'il y a d'initiatives — « 40 proposées » devient 120.
  const passage = { date: '2026-10-20', mode: 'preparation', lenses: ['sceptique', 'utilisateur-final'],
    initiatives: ['accueil', 'archivage'], proposed: 12,
    questions: [question('faut-il archiver ?', { zone: 'ZO-001' }), question('et les doublons ?', { outcome: 'écartée', reason: 'doublon' })] };
  const r = lance(portefeuille({
    'brd/accueil': { document: 'brd', phase: 'define', council_runs: [passage], shadow_zones: [zone('ZO-001', 'levée')] },
    'brd/archivage': { document: 'brd', phase: 'define', council_runs: [passage], shadow_zones: [] },
  }));
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /1 passage\(s\) sur 2 document\(s\)/, 'le passage partagé doit être un seul passage');
  assert.match(r.out, /1 écriture\(s\) fusionnée\(s\)/);
  assert.match(r.out, /12 question\(s\) proposée\(s\)/, '`proposed` est le compte du PASSAGE, pas de l\'initiative');
  assert.doesNotMatch(r.out, /24 question\(s\) proposée\(s\)/);
  // Et les questions aussi : l'essai a montré qu'elles doublaient, parce que rien n'impose au gabarit
  // de ne garder dans chaque fichier que celles qui visent son initiative.
  assert.match(r.out, /2 question\(s\) recopiée\(s\) d'un dossier à l'autre et comptée\(s\) une fois/);
  assert.match(r.out, /2 arbitrée\(s\) — 1 retenue\(s\), 1 écartée\(s\)/);
});

test('deux passages distincts restent deux, et la moyenne est celle du passage', () => {
  const p = (date, proposed, qs) => ({ date, mode: 'couverture', lenses: ['sceptique'], proposed, questions: qs });
  const r = lance(portefeuille({
    'brd/accueil': { document: 'brd', phase: 'define',
      council_runs: [p('2026-10-20', 10, [question('q1', { zone: 'ZO-001' })]), p('2026-10-27', 6, [question('q2', { zone: 'ZO-002' }), question('q3', { zone: 'ZO-003' })])],
      shadow_zones: [zone('ZO-001', 'levée'), zone('ZO-002', 'assumée'), zone('ZO-003', 'sans_objet')] },
  }));
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /2 passage\(s\) sur 1 document\(s\)\./, 'deux dates, deux passages, et rien de fusionné');
  assert.doesNotMatch(r.out, /fusionnée/);
  assert.match(r.out, /16 question\(s\) proposée\(s\).*3 arbitrée\(s\) — 3 retenue\(s\)/s);
  assert.match(r.out, /1\.5 question\(s\) retenue\(s\) pour 8 proposée\(s\)/, 'la moyenne est par passage');
});

test('la part de hors-sujet est le chiffre qui dit si le council vaut le coup', () => {
  // Ce calcul n'était pas possible avant le 7 novembre 2026 : une question hors sujet se fermait en
  // `levée`, comme une question à laquelle on avait répondu. Le quatrième statut les sépare.
  const sorts = { 'ZO-001': 'levée', 'ZO-002': 'assumée', 'ZO-003': 'sans_objet', 'ZO-004': 'sans_objet', 'ZO-005': 'ouverte' };
  const r = lance(portefeuille({
    'brd/accueil': { document: 'brd', phase: 'define',
      council_runs: [{ date: '2026-10-20', mode: 'preparation', lenses: ['sceptique'], proposed: 9,
        questions: Object.keys(sorts).map((z, i) => question(`q${i}`, { zone: z })) }],
      shadow_zones: Object.entries(sorts).map(([id, st]) => zone(id, st)) },
  }));
  assert.equal(r.code, 0, r.err);
  // Quatre tranchées (une levée, une assumée, deux sans objet), une encore ouverte qui ne compte pas.
  assert.match(r.out, /Sur 4 question\(s\) tranchée\(s\), 50 % étaient hors sujet/);
  assert.match(r.out, /\| encore ouverte \| 1 \|/, 'une question non tranchée n\'est ni au crédit ni au débit');
  assert.match(r.out, /\| sans objet \| 2 \|/);

  // Et quand rien n'est tranché, la part n'est pas nulle : elle n'est pas mesurable.
  const rien = lance(portefeuille({
    'brd/accueil': { document: 'brd', phase: 'define',
      council_runs: [{ date: '2026-10-20', mode: 'preparation', lenses: ['sceptique'], proposed: 3, questions: [question('q', { zone: 'ZO-009' })] }],
      shadow_zones: [zone('ZO-009', 'ouverte')] },
  }));
  assert.match(rien.out, /la part de hors-sujet n'est pas mesurable, elle n'est pas nulle/);
  assert.doesNotMatch(rien.out, /0 % étaient hors sujet/);
});

test('une trace qui s\'arrête, et un renvoi mort, se disent au lieu de disparaître', () => {
  const r = lance(portefeuille({
    'brd/accueil': { document: 'brd', phase: 'define',
      council_runs: [{ date: '2026-10-20', mode: 'preparation', lenses: ['sceptique'], proposed: 5, questions: [
        question('retenue et jamais transformée'),
        question('vers une zone qui n\'existe pas', { zone: 'ZO-404' }),
        question('écartée sans dire pourquoi', { outcome: 'écartée' })] }],
      shadow_zones: [] },
  }));
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /\| sans zone \| 1 \|/, 'une question retenue sans zone laisse la trace s\'arrêter là');
  assert.match(r.out, /\| zone inconnue \| 1 \|/, 'une zone citée qui n\'existe nulle part est un renvoi mort');
  assert.match(r.out, /1 question\(s\) écartée\(s\) ou réservée\(s\) sans raison écrite/,
    'le gabarit rend la raison obligatoire, et un compteur ne se relit pas sans elle');
});

test('le script lit les quatre documents qui ont un council, et pas les autres', () => {
  const passage = slug => ({ date: '2026-10-20', mode: 'preparation', lenses: ['sceptique'], proposed: 1, questions: [question(`q-${slug}`)] });
  const r = lance(portefeuille({
    'brd/accueil': { document: 'brd', council_runs: [passage('brd')] },
    'prd/accueil': { document: 'prd', council_runs: [passage('prd')] },
    'sad/accueil': { document: 'sad', council_runs: [passage('sad')] },
    'plan/accueil': { document: 'plan', council_runs: [passage('plan')] },
    // L'implémentation et les tests n'ont pas de council : leurs états ne doivent pas être lus.
    'impl/accueil': { document: 'impl', council_runs: [passage('impl')] },
    'qa/accueil': { document: 'test', council_runs: [passage('qa')] },
  }));
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /4 passage\(s\) sur 4 document\(s\)/,
    'quatre documents ont un council ; l\'implémentation et les tests n\'en ont pas');
});

test('--json rend les passages dédoublonnés, pour un autre outil', () => {
  const passage = { date: '2026-10-20', mode: 'preparation', lenses: ['sceptique'], initiatives: ['a', 'b'], proposed: 7,
    questions: [question('q1', { zone: 'ZO-001' })] };
  const r = lance(portefeuille({
    'brd/a': { document: 'brd', council_runs: [passage], shadow_zones: [zone('ZO-001', 'sans_objet')] },
    'brd/b': { document: 'brd', council_runs: [passage], shadow_zones: [] },
  }), ['--json']);
  assert.equal(r.code, 0, r.err);
  const j = JSON.parse(r.out);
  assert.equal(j.passages.length, 1);
  assert.equal(j.passages[0].proposed, 7);
  assert.equal(j.fusionnes, 1);
  assert.equal(j.proposees, 7);
  assert.equal(j.parSort.sans_objet, 1);
});
