// Les portes de sortie, calculées — et le parcours des phases, lu dans ce que l'état porte.
//
// Les conditions étaient écrites dans les fichiers de phase (« Propose le passage quand… ») et
// calculées dans `status.mjs` POUR LE BRD SEUL : les trois autres documents avaient la même doctrine et
// aucun compte, et l'agent jugeait leurs portes de mémoire. Au deuxième dossier réel, la porte de
// Define affichait « ✓ aucune décision restée proposé » avec neuf règles métier à `proposé` qu'aucune
// condition ne regardait, et soixante-trois zones d'ombre ouvertes franchissaient la porte sans
// destination, pour zéro risque au BRD.
//
// Une condition est un triplet [libellé, satisfaite, ce qui manque]. Le libellé reprend les mots de la
// doctrine, et le détail porte un compte : un « ✗ » sans son nombre se recompte à la main.
//
// `satisfaite` a TROIS valeurs. `true`, `false`, et `null` quand la condition ne se mesure pas ici —
// la couverture des exigences de la release se lit dans `refs.yaml`, que l'appelant n'a pas toujours.
// L'absence de mesure ne vaut pas une réussite : c'est la leçon des trois métriques de couverture à
// « 0/0 = 100 % ATTEINT », et elle vaut pour une porte comme pour une couverture.
//
// Ce qui ne se calcule pas du tout n'est pas ici. « Le MVP satisfait les critères de mvp.md », « les
// participants se reconnaîtraient dans la synthèse » : ces conditions se jugent avec l'utilisateur, et
// une porte qui prétendrait les cocher mentirait. Elles restent dans les fichiers de phase, et le
// compte affiché dit « n conditions calculées sur m » — jamais « la porte est franchie ».
import { arr, PHASES, PHASE_NOM } from './common.mjs';

// ── Le parcours des phases ───────────────────────────────────────────────────
// `phase` dit où on est, `phase_log` dit comment on y est arrivé. Le point d'étape ne lisait que le
// RANG de la phase courante dans la table : sur le plan de l'exemple, dont les phases se répètent à
// chaque cycle, il annonçait « Govern à venir · Review à venir » pour une version 1.0 figée et une
// revue d'itération déjà enregistrée. Un retour en arrière est un passage comme un autre : il s'écrit
// dans le même journal, avec `kind: retour`, et la ligne le montre au lieu de l'effacer.
export const porteDe = e => (e.kind ?? 'porte') === 'porte';

export function phaseTrail(s) {
  const doc = s.document ?? 'brd';
  const phases = PHASES[doc] ?? [];
  const log = arr(s.phase_log);
  const portes = log.filter(porteDe);
  const rang = phases.indexOf(s.phase);
  const trail = phases.map((p, i) => {
    // Le journal dit la vérité ; le rang sert encore de repli, sinon un dossier antérieur au champ
    // perdrait ses phases passées — « passage sans trace » est un constat, pas une raison d'oublier.
    const closes = portes.filter(e => e.from === p);
    return { phase: p, nom: PHASE_NOM[p] ?? p, closes, courante: s.phase === p,
      passee: closes.length > 0 || (rang >= 0 && i < rang) };
  });
  return { doc, phases, trail, rang,
    // Une phase hors de la table ne fait pas disparaître la ligne : `close` est un terme, pas une
    // étape de plus, et une valeur inconnue se dit au lieu de se taire.
    horsTable: phases.length && s.phase && !phases.includes(s.phase) ? String(s.phase) : '',
    retours: log.filter(e => !porteDe(e)) };
}

// ── Un seuil, une dérogation : une seule logique ─────────────────────────────
// Deux systèmes faisaient la même chose. `coverage_thresholds` / `coverage_waivers`, au niveau de
// l'état, pour les quatre documents ; `settings.thresholds` / `waivers` pour la vérification de
// release. Noms différents, emplacements différents, clés différentes (`metric` contre `id`), défauts
// écrits à deux endroits — et **aucun des deux** ne vérifiait qu'une dérogation porte sa raison et son
// approbateur, là où `lint_waivers` le fait depuis le 28 octobre. Une dérogation muette éteignait donc
// un seuil sans que rien ne le dise.
//
// Un SEUIL éteint une mesure aussi. `stories_ready` a 0 pour seuil par défaut, et la table de
// couverture du plan de l'exemple affichait « Stories prêtes | 2/5 | 40 % | 0 % | atteint » : trois
// stories sur cinq non prêtes, lues comme une ligne verte. Un seuil à 0 n'est pas une mesure réussie,
// c'est une mesure qu'on renonce à juger — elle passe donc par la dérogation, comme le reste.
//
// Un seul nom s'écrit désormais : `thresholds` et `waivers`, au niveau de l'état, pour les cinq
// documents. Les anciens noms se lisent encore — un dossier en cours ne se casse pas — et `S107` dit
// de les renommer.

// Les anciens noms d'abord, le nouveau en dernier : s'ils coexistent, c'est `thresholds` qui tranche.
export const seuilsDe = s => ({ ...(s?.coverage_thresholds ?? {}), ...(s?.settings?.thresholds ?? {}), ...(s?.thresholds ?? {}) });
// La clé d'une dérogation : `metric` chez les quatre documents, `id` à la vérification de release.
// Les deux se lisent, et une dérogation porte l'une ou l'autre, jamais les deux.
export const cleDerogation = w => String(w?.metric ?? w?.id ?? '').trim();
export const derogationsDe = s => [...arr(s?.waivers), ...arr(s?.coverage_waivers)];

// « Une dérogation nommée porte sa raison, sinon c'est un silence. » La règle valait pour les
// avertissements de forme, et pas pour les seuils — où ce qui est en jeu est une approbation de
// release. Une dérogation de seuil dit pourquoi ET qui l'a approuvée : sans l'un des deux, elle ne
// compte pas, et le constat le dit au lieu de la laisser éteindre la mesure.
export function derogationDe(s, cle) {
  const w = derogationsDe(s).find(x => cleDerogation(x) === String(cle));
  if (!w) return null;
  const manque = [!String(w.reason ?? '').trim() && 'pourquoi',
    !String(w.approved_by ?? '').trim() && 'qui l\'a approuvée'].filter(Boolean);
  return { ...w, cle: String(cle), valable: manque.length === 0, manque };
}

// Le verdict d'une mesure face à son seuil, en TROIS états — `true`, `false`, `null`. Le troisième
// n'est ni une réussite ni un échec : la mesure n'a pas été faite, ou on a renoncé à la juger sans le
// dire. Il ne s'affiche jamais ✓.
export const INDICATIF = 'indicatif';
export function verdictSeuil({ mesure, pct, seuil, derogation }) {
  // Une mesure INDICATIVE se lit, elle ne se juge pas : « stories prêtes » n'a pas de cible — on n'a
  // jamais besoin que toutes les stories soient prêtes, seulement assez pour le prochain cycle. Le
  // catalogue avait écrit ce « pas de cible » avec un seuil de 0, et 0 compare : la table rendait
  // « Stories prêtes | 2/5 | 40 % | 0 % | atteint ». Une mesure sans cible le dit ; un seuil à 0 est
  // autre chose — un renoncement — et il passe par une dérogation. Seul le catalogue déclare
  // `indicatif` : un projet qui écrit 0 dans `thresholds` assume, et l'assomption se nomme.
  if (seuil === INDICATIF) return { ok: null, note: mesure ? 'indicatif : cette mesure se lit, elle ne se juge pas' : 'indicatif, et rien à mesurer' };
  // Le seuil se regarde AVANT la mesure. Un seuil à 0 ne compare rien : `pct >= 0` est toujours vrai.
  // C'est une mise hors périmètre, et une mise hors périmètre s'écrit. L'ordre compte : un projet qui
  // a déclaré la mutation hors périmètre n'a pas de rapport de mutation, par construction — lui
  // réclamer `settings.reports.mutation` serait lui demander ce qu'il a justement écarté.
  if (Number(seuil) === 0) {
    if (derogation?.valable) return { ok: true, note: `seuil à 0, hors périmètre assumé : ${derogation.reason} (approuvé par ${derogation.approved_by})` };
    if (derogation) return { ok: null, note: `seuil à 0 et dérogation qui ne dit pas ${derogation.manque.join(', ni ')}` };
    return { ok: null, note: 'seuil à 0 : la mesure n\'est pas jugée, et aucune dérogation nommée ne dit pourquoi' };
  }
  if (!mesure) return { ok: null, note: 'non mesuré' };
  if (Number(pct) >= Number(seuil)) return { ok: true, note: '' };
  if (derogation?.valable) return { ok: true, note: `sous le seuil, assumé : ${derogation.reason} (approuvé par ${derogation.approved_by})` };
  if (derogation) return { ok: false, note: `dérogation déclarée qui ne dit pas ${derogation.manque.join(', ni ')}` };
  return { ok: false, note: '' };
}

// ── Les portes ───────────────────────────────────────────────────────────────
const vides = o => Object.entries(o ?? {}).filter(([, v]) => v !== 'validé').map(([k]) => k);
const vivants = coll => arr(coll).filter(x => !['abandonné', 'hors_périmètre', 'rejeté', 'déprécié', 'remplacé'].includes(x.status));
const dit = v => String(v ?? '').trim();
const ids = (liste, max = 4) => `${liste.slice(0, max).map(x => x.id ?? x).join(', ')}${liste.length > max ? '…' : ''}`;
const council = (s, mode) => arr(s.council_runs).some(r => r.mode === mode);
const modesPasses = s => [...new Set(arr(s.council_runs).map(r => r.mode))].join(', ') || 'aucun';
const decideur = (s, domaine) => arr(s.decision_rights).some(d => (d.domain ?? d.domaine) === domaine && dit(d.decider ?? d.who));
// Une condition sur un manque : satisfaite quand la liste est vide, et le détail la nomme.
const sans = (libelle, manquants, quoi) => [libelle, manquants.length === 0, `${manquants.length} ${quoi} : ${ids(manquants)}`];

// Les éléments restés `proposé` : ce que personne n'a tranché. La porte du BRD n'en regardait qu'une
// collection — les décisions — et neuf règles métier à `proposé` passaient donc sans un mot.
const EN_ATTENTE = {
  brd: ['objectives', 'business_requirements', 'business_rules', 'transition_requirements', 'decisions', 'risks'],
  prd: ['goals', 'personas', 'journeys', 'releases', 'functional_requirements', 'acceptance_criteria', 'nfrs', 'constraints', 'design_decisions', 'risks'],
  sad: ['drivers', 'contexts', 'elements', 'relations', 'nfr_responses', 'data_entities', 'interfaces', 'threats', 'risks'],
  plan: ['stories', 'examples', 'tasks', 'risks'],
};
// Le nom de la collection se lit dans l'état ; le détail de la porte est lu par une personne.
const NOM_COLLECTION = {
  objectives: 'objectif(s)', business_requirements: 'exigence(s) métier', business_rules: 'règle(s) métier',
  transition_requirements: 'exigence(s) de transition', decisions: 'décision(s)', risks: 'risque(s)',
  goals: 'objectif(s) produit', personas: 'persona(s)', journeys: 'parcours', releases: 'release(s)',
  functional_requirements: 'exigence(s) fonctionnelle(s)', acceptance_criteria: 'critère(s) d\'acceptation',
  nfrs: 'NFR', constraints: 'contrainte(s)', design_decisions: 'décision(s) produit',
  drivers: 'moteur(s)', contexts: 'contexte(s)', elements: 'élément(s)', relations: 'relation(s)',
  nfr_responses: 'réponse(s) à NFR', data_entities: 'donnée(s)', interfaces: 'interface(s)', threats: 'menace(s)',
  stories: 'story(s)', examples: 'exemple(s)', tasks: 'tâche(s)',
};
function proposesCondition(s) {
  const colls = EN_ATTENTE[s.document ?? 'brd'] ?? [];
  const par = colls.map(c => [c, arr(s[c]).filter(x => ['proposé', 'à_décider'].includes(x.status))]).filter(([, l]) => l.length);
  return ['aucun élément resté « proposé » : tout a été tranché', par.length === 0,
    par.map(([c, l]) => `${l.length} ${NOM_COLLECTION[c] ?? c} (${ids(l, 3)})`).join(', ')];
}

// Une zone d'ombre encore ouverte à la porte est une question que plus personne ne posera : le
// document part sans elle, et rien ne la rattrape. Le dossier réel en avait soixante-trois pour zéro
// risque. Une zone se lève (avec sa réponse), s'assume (avec sa raison) — et, assumée, elle est
// EMPORTÉE par un risque ou une hypothèse qui la nomme, sinon elle s'arrête là.
function zonesConditions(s) {
  const zones = arr(s.shadow_zones);
  const ouvertes = zones.filter(z => z.status === 'ouverte');
  const bloquantes = ouvertes.filter(z => z.blocking);
  const assumees = zones.filter(z => z.status === 'assumée');
  const porteuses = new Set([...arr(s.risks), ...arr(s.hypotheses)].flatMap(x => [x.origin, ...arr(x.related)]).filter(Boolean));
  return [
    sans('aucune zone d\'ombre bloquante ouverte', bloquantes, 'bloquante(s)'),
    ['chaque zone d\'ombre est levée ou assumée', ouvertes.length === 0,
      `${ouvertes.length} encore ouverte(s) (${ids(ouvertes)}) — une question qui reste ouverte à la porte ne sera plus posée`],
    sans('chaque zone d\'ombre assumée est emportée par un risque ou une hypothèse', assumees.filter(z => !porteuses.has(z.id)), 'assumée(s) que rien ne reprend'),
    sans('chaque zone d\'ombre assumée dit pourquoi', assumees.filter(z => !dit(z.resolution)), 'assumée(s) sans raison'),
  ];
}

const PORTES = {
  brd: {
    assess: s => {
      const CANVAS = ['problems', 'users', 'solutions_today', 'user_metrics', 'business_metrics'];
      return [
        sans('le canevas d\'opportunité est rempli', CANVAS.filter(k => !arr(s.opportunity?.canvas?.[k]).length), 'rubrique(s) à remplir'),
        ['une décision d\'opportunité est rendue, par une personne nommée', Boolean(s.opportunity?.decision && s.opportunity.decision !== 'en_attente' && dit(s.opportunity?.decided_by)),
          `décision : ${s.opportunity?.decision ?? '—'}, par ${dit(s.opportunity?.decided_by) || 'personne'}`],
      ];
    },
    discover: s => {
      const bcs = vivants(s.candidate_needs);
      const DROITS = ['perimetre', 'objectifs', 'priorites'];
      return [
        ['le problème est formulé et confirmé par l\'utilisateur', Boolean(dit(s.problem?.statement) && s.problem?.confirmed), dit(s.problem?.statement) ? 'formulé, pas confirmé' : 'pas encore formulé'],
        ['au moins un signal de succès', arr(s.success_signals).length > 0, `${arr(s.success_signals).length} signal(aux)`],
        ['un council en mode couverture est passé', council(s, 'couverture'), `modes passés : ${modesPasses(s)}`],
        sans('chaque besoin candidat est sourcé', bcs.filter(n => !arr(n.sources).length), 'besoin(s) sans source'),
        sans('chaque besoin candidat dit de qui il est le besoin', bcs.filter(n => !arr(n.concerns).length), 'besoin(s) sans destinataire'),
        sans('un décideur pour le périmètre, les objectifs et les priorités', DROITS.filter(d => !decideur(s, d)), 'domaine(s) sans décideur'),
        sans('aucune contradiction d\'intérêts ouverte sans arbitre', arr(s.shadow_zones).filter(z => z.status === 'ouverte' && z.subtype === 'interets' && !dit(z.arbiter)), 'contradiction(s) sans arbitre'),
        ['la porte de synthèse est déclarée', Boolean(dit(s.synthesis_check?.date)), 'cinq dimensions à juger avec l\'utilisateur'],
      ];
    },
    define: s => {
      const brs = vivants(s.business_requirements);
      const valides = brs.filter(b => b.status === 'validé');
      const couverts = new Set(brs.flatMap(b => arr(b.objectives)));
      return [
        sans('toutes les sections du document sont validées', vides(s.brd_sections), 'section(s) à valider'),
        sans('chaque objectif porte une exigence', arr(s.objectives).filter(o => !couverts.has(o.id)), 'objectif(s) sans exigence'),
        sans('chaque exigence porte un objectif', brs.filter(b => !arr(b.objectives).length), 'exigence(s) sans objectif'),
        sans('chaque exigence validée a un critère d\'acceptation', valides.filter(b => !arr(b.acceptance).length), 'exigence(s) sans critère'),
        sans('chaque exigence validée a une priorité', valides.filter(b => !dit(b.priority)), 'exigence(s) sans priorité'),
        sans('chaque exigence de transition a un type, ses parties prenantes et un critère', vivants(s.transition_requirements).filter(t => !(dit(t.kind) && arr(t.stakeholders).length && dit(t.done_when))), 'incomplète(s)'),
        sans('aucun besoin candidat resté « confirmé »', arr(s.candidate_needs).filter(n => n.status === 'confirmé'), 'besoin(s) à solder'),
        proposesCondition(s),
      ];
    },
    govern: s => gouvernance(s),
  },
  prd: {
    frame: s => {
      const buts = vivants(s.goals);
      const DROITS = ['perimetre', 'priorites'];
      return [
        ['la vision est écrite', Boolean(dit(s.vision)), 'deux à quatre phrases'],
        sans('chaque objectif produit est mesurable', buts.filter(g => !dit(g.kpi) || !dit(g.target)), 'objectif(s) sans métrique ou sans cible'),
        sans('chaque cible est arrêtée par une personne nommée', buts.filter(g => dit(g.target) && !dit(g.decided_by)), 'cible(s) sans décideur'),
        sans('chaque persona validé repose sur une preuve', arr(s.personas).filter(p => p.status === 'validé' && !arr(p.evidence).length), 'élément(s) sans preuve'),
        ['au moins un parcours validé', arr(s.journeys).some(j => j.status === 'validé'), `${arr(s.journeys).length} parcours`],
        sans('chaque tâche de la story map est affectée à une release', arr(s.story_map).flatMap(a => arr(a.tasks)).filter(t => !dit(t.release)), 'tâche(s) sans release'),
        sans('un décideur pour le périmètre et les priorités', DROITS.filter(d => !decideur(s, d)), 'domaine(s) sans décideur'),
        ['un council en mode cadrage est passé', council(s, 'cadrage'), `modes passés : ${modesPasses(s)}`],
      ];
    },
    specify: s => {
      const frs = arr(s.functional_requirements).filter(f => f.status === 'validé');
      const acs = new Set(arr(s.acceptance_criteria).map(a => a.fr));
      const nfrs = arr(s.nfrs).filter(n => n.status === 'validé');
      return [
        ['un council en mode spécification est passé', council(s, 'specification'), `modes passés : ${modesPasses(s)}`],
        sans('toutes les sections du document sont validées', vides(s.prd_sections), 'section(s) à valider'),
        sans('chaque exigence validée a une origine', frs.filter(f => !arr(f.brd_requirements).length && !dit(f.origin)), 'exigence(s) sans origine'),
        sans('chaque exigence validée a un critère d\'acceptation', frs.filter(f => !acs.has(f.id)), 'exigence(s) sans critère'),
        sans('chaque exigence validée a une release et une priorité', frs.filter(f => !dit(f.release) || !dit(f.priority)), 'exigence(s) sans release ou sans priorité'),
        sans('chaque NFR validée a une métrique, une cible et un moyen de mesure', nfrs.filter(n => !(dit(n.metric) && dit(n.target) && dit(n.measurement))), 'incomplète(s)'),
        sans('chaque règle métier est tranchée', arr(s.business_rules).filter(r => r.status === 'à_décider'), 'règle(s) à décider'),
        proposesCondition(s),
      ];
    },
    govern: s => gouvernance(s),
  },
  sad: {
    explore: s => {
      const DROITS = ['architecture', 'acceptation_risque_securite'];
      const garanties = new Set(arr(s.contexts).flatMap(c => arr(c.aggregates)).flatMap(a => arr(a.invariants)));
      const automatisees = arr(s.prd_ref?.business_rules ?? s.business_rules).filter(r => r.automation && r.automation !== 'aucune');
      return [
        sans('un décideur pour l\'architecture et l\'acceptation du risque de sécurité', DROITS.filter(d => !decideur(s, d)), 'domaine(s) sans décideur'),
        s.context_mode === 'brownfield'
          ? sans('en brownfield, chaque élément existant a une preuve', arr(s.existing?.elements).filter(e => !arr(e.evidence).length && !dit(e.source)), 'élément(s) sans preuve')
          : ['en brownfield, chaque élément existant a une preuve', null, 'sans objet : conception greenfield'],
        sans('chaque moteur validé a un scénario dont la mesure est chiffrée', arr(s.drivers).filter(d => d.status === 'validé' && !dit(d.scenario?.measure)), 'moteur(s) sans mesure chiffrée'),
        sans('chaque règle métier automatisée est rattachée à un agrégat', automatisees.filter(r => !garanties.has(r.id)), 'règle(s) automatisée(s) sans agrégat'),
        ['la vue de contexte est validée', arr(s.contexts).some(c => c.status === 'validé') || arr(s.elements).some(e => e.level === 'contexte' && e.status === 'validé'), 'aucun contexte validé'],
        ['un council en mode exploration est passé', council(s, 'exploration'), `modes passés : ${modesPasses(s)}`],
      ];
    },
    design: s => {
      const servis = new Set([...arr(s.decisions).filter(d => d.status === 'accepté'), ...arr(s.nfr_responses)].flatMap(x => arr(x.drivers)));
      const adrs = arr(s.decisions).filter(d => d.status === 'accepté');
      return [
        sans('chaque moteur validé est servi par un ADR accepté ou une réponse à une NFR', arr(s.drivers).filter(d => d.status === 'validé' && !servis.has(d.id)), 'moteur(s) sans réponse'),
        sans('chaque ADR accepté a deux options, des moteurs, un décideur et un moyen de confirmation', adrs.filter(d => !(arr(d.options).length >= 2 && arr(d.drivers).length && dit(d.decided_by) && dit(d.confirmation))), 'incomplet(s)'),
        sans('chaque NFR a une réponse avec sa vérification', arr(s.nfr_responses).filter(r => !dit(r.verification) && !arr(r.verifications).length), 'réponse(s) sans vérification'),
        sans('chaque donnée a un propriétaire, une classification et une conservation', arr(s.data_entities).filter(e => !(dit(e.owner) && dit(e.classification) && dit(e.retention))), 'incomplète(s)'),
        sans('chaque menace a un traitement', arr(s.threats).filter(t => !dit(t.treatment)), 'menace(s) sans traitement'),
        sans('chaque menace acceptée a un décideur', arr(s.threats).filter(t => t.treatment === 'accepter' && !dit(t.accepted_by)), 'acceptation(s) sans décideur'),
        sans('toutes les sections du document sont validées', vides(s.sad_sections), 'section(s) à valider'),
        ['un council en mode conception est passé', council(s, 'conception'), `modes passés : ${modesPasses(s)}`],
        proposesCondition(s),
      ];
    },
    govern: s => gouvernance(s),
  },
  plan: {
    slice: (s, refs) => {
      const couvertes = new Set(arr(s.stories).filter(x => x.status === 'validé').flatMap(x => arr(x.frs)));
      const attendues = arr(refs?.prd?.releases).filter(r => !s.settings?.release || r.id === s.settings.release)
        .flatMap(r => arr(r.functional_requirements)).map(f => f.id ?? f);
      return [
        // Les exigences de la release sont dans `refs.yaml`, pas dans l'état : sans lui, la condition
        // ne se mesure pas, et elle le dit au lieu de se cocher.
        refs ? sans('chaque exigence de la release est couverte par une story validée', attendues.filter(f => !couvertes.has(f)), 'exigence(s) sans story validée')
          : ['chaque exigence de la release est couverte par une story validée', null, 'non mesuré : refs.yaml absent (ingest-handoffs.mjs)'],
        ['le walking skeleton est désigné', arr(s.stories).some(x => x.skeleton), 'aucune story marquée `skeleton`'],
        sans('chaque spike dit quelle hypothèse il tranche', arr(s.tasks).filter(t => t.kind === 'spike' && !dit(t.spike_of)), 'spike(s) sans hypothèse'),
      ];
    },
    refine: s => {
      const affinees = arr(s.stories).filter(x => x.status === 'validé' && arr(x.example_map?.rules).length);
      const regles = arr(s.stories).flatMap(x => arr(x.example_map?.rules));
      const posees = new Set(arr(s.stories).flatMap(x => arr(x.example_map?.questions)));
      return [
        ['assez de stories sont prêtes pour remplir le prochain cycle', affinees.length > 0, `${`${affinees.length} story(s) affinée(s) et validée(s)`} — ce qui suffit se juge avec l'utilisateur`],
        sans('chaque règle d\'une story affinée a au moins un exemple', regles.filter(r => !arr(r.examples).length), 'règle(s) sans exemple'),
        sans('aucune question d\'example mapping restée ouverte', arr(s.shadow_zones).filter(z => z.status === 'ouverte' && posees.has(z.id)), 'carte(s) rouge(s) ouverte(s)'),
      ];
    },
    schedule: s => {
      const cycle = arr(s.iterations).find(i => i.status === 'en_cours') ?? arr(s.iterations).find(i => i.status === 'validé');
      const taches = arr(s.tasks).filter(t => !cycle || t.iteration === cycle.id);
      const dep = new Map(arr(s.tasks).map(t => [t.id, arr(t.depends_on)]));
      const vus = new Set(); const pile = new Set();
      const boucle = id => {
        if (pile.has(id)) return true;
        if (vus.has(id)) return false;
        vus.add(id); pile.add(id);
        const r = (dep.get(id) ?? []).some(boucle);
        pile.delete(id); return r;
      };
      const cycliques = [...dep.keys()].filter(boucle);
      return [
        ['le cycle porte des tâches', taches.length > 0, 'aucune tâche affectée au cycle'],
        sans('chaque tâche du cycle est validée, estimée et affectée', taches.filter(t => !['validé', 'en_cours', 'terminé'].includes(t.status) || !dit(t.size) || !dit(t.assignee_type)), 'incomplète(s)'),
        sans('aucun cycle de dépendances entre tâches', cycliques, 'tâche(s) dans une boucle'),
        ['un engagement déclaré par une personne nommée', arr(s.iterations).concat(arr(s.replenishments)).some(i => dit(i.commitment?.declared_by)), 'aucun engagement déclaré'],
        ['un council en mode planification est passé', council(s, 'planification'), `modes passés : ${modesPasses(s)}`],
        proposesCondition(s),
      ];
    },
    govern: s => gouvernance(s),
    review: s => {
      const clos = arr(s.iterations).filter(i => dit(i.review?.team?.date));
      const decidees = new Set(clos.flatMap(i => arr(i.review?.carryover)).map(c => c.task));
      const emportees = clos.flatMap(i => arr(s.tasks).filter(t => t.iteration === i.id && !['terminé', 'abandonné'].includes(t.status)));
      return [
        ['une revue d\'équipe est enregistrée pour le cycle clos', clos.length > 0, 'aucune revue d\'équipe déclarée'],
        sans('chaque tâche non finie du cycle a une décision de report', emportees.filter(t => !decidees.has(t.id)), 'tâche(s) emportée(s) sans décision'),
        sans('chaque constat de revue donne une story ou une action', clos.flatMap(i => arr(i.review?.team?.findings)).filter(f => typeof f === 'object' && !dit(f.story) && !dit(f.action)), 'constat(s) sans suite'),
      ];
    },
  },
  // L'étape « tests » livrait trois fichiers de phase — Prepare, Execute, Prove — et son état n'avait
  // pas de champ `phase` : la doctrine décrivait un parcours que rien ne situait, et aucune porte ne
  // comptait. Les conditions sont celles de ses trois fichiers ; la porte de release, elle, reste dans
  // `release-matrix.mjs`, qui lit les rapports.
  test: {
    prepare: s => [
      ['les parcours critiques sont choisis', arr(s.settings?.critical_journeys).length > 0, 'aucun parcours critique retenu'],
      sans('chaque session exploratoire a une charte', arr(s.exploratory).filter(x => !dit(x.charter)), 'session(s) sans charte'),
      ['les environnements de mesure sont déclarés', arr(s.environments).length > 0, 'aucun environnement au catalogue'],
    ],
    execute: s => [
      ['la version candidate est identifiée', Boolean(dit(s.candidate)), 'ni tag ni commit'],
      ['les rapports des suites sont rattachés', arr(s.settings?.reports).length > 0, 'aucun rapport (ci-fetch.mjs --appliquer)'],
      sans('chaque mesure de NFR dit sur quel environnement elle a été prise', arr(s.nfr_results).filter(r => !dit(r.environment)), 'mesure(s) sans environnement'),
      sans('chaque session exploratoire menée est close', arr(s.exploratory).filter(x => dit(x.date) && !dit(x.notes) && !arr(x.findings).length), 'session(s) sans relevé'),
    ],
    prove: s => [
      sans('chaque exigence non prouvée est couverte par une dérogation nommée', arr(s.waivers).filter(w => !dit(w.reason) || !dit(w.approved_by)), 'dérogation(s) sans raison ni approbateur'),
      ['une décision de release est déclarée', arr(s.approvals).some(a => dit(a.decision)), `${arr(s.approvals).length} approbation(s)`],
    ],
  },
};

// Govern est la même porte pour les quatre documents : des relecteurs, une approbation, une baseline.
const gouvernance = s => [
  ['des relecteurs sont nommés', arr(s.governance?.reviewers).length > 0, 'aucun relecteur nommé'],
  ['au moins une approbation', arr(s.governance?.approvals).some(a => String(a.decision ?? '').startsWith('approuvé')), `${arr(s.governance?.approvals).length} approbation(s)`],
  ['une version de référence est figée', arr(s.governance?.baselines).length > 0, 'freeze-version.mjs --baseline'],
];

// Les conditions de la porte de sortie de la phase courante, ou null si ce document ou cette phase n'en
// a pas. `actifs` = le nombre d'avertissements de lint non dérogés, quand l'appelant l'a calculé ; la
// doctrine le demande à chaque porte des quatre documents, et lui seul n'est pas dans l'état.
// `refs` = les handoffs amont copiés (plan/<slug>/refs.yaml).
export function gateConditions(s, { actifs = null, refs = null } = {}) {
  const doc = s.document ?? 'brd';
  const table = PORTES[doc]?.[s.phase];
  if (!table) return null;
  const phases = PHASES[doc] ?? [];
  const rang = phases.indexOf(s.phase);
  const conditions = [
    ...table(s, refs),
    ...zonesConditions(s),
    ...(EN_ATTENTE[doc] ? [['aucun avertissement ni corrigé ni dérogé (lint.mjs)', actifs === null ? null : actifs === 0,
      actifs === null ? 'non mesuré : catalogue de règles absent' : `${actifs} avertissement(s) actif(s)`]] : []),
  ];
  return {
    phase: s.phase,
    nom: PHASE_NOM[s.phase] ?? s.phase,
    suivante: rang >= 0 && rang + 1 < phases.length ? (PHASE_NOM[phases[rang + 1]] ?? phases[rang + 1]) : 'la suite',
    conditions,
    tenues: conditions.filter(c => c[1] === true).length,
    mesurees: conditions.filter(c => c[1] !== null).length,
    nonMesurees: conditions.filter(c => c[1] === null).length,
  };
}
