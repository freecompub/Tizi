// Catalogue unique des règles de vérification, commun aux skills brd-builder et prd-builder.
//
// Phase 1 (construction) : ces règles sont exécutées par lint.mjs et les scripts de rendu
// en mode AVERTISSEMENT. Elles ne bloquent rien : elles informent l'auteur au moment où il écrit.
// Phase 2 (contrôle formel, à construire) : le même catalogue sera exécuté en mode bloquant,
// complété de règles qui demandent du jugement. Une règle n'est définie qu'ici, jamais ailleurs.
//
// Sources : Constantinidis (check-list de bonne formulation, ch. 13) ; BABOK v3 (7.2 Verify Requirements).
import { arr } from './common.mjs';

// ── Règles de rédaction (portent sur un énoncé) ─────────────────────────────

const words = list => new RegExp(`(^|[^\\p{L}])(${list.join('|')})(?=$|[^\\p{L}])`, 'iu');

export const TEXT_RULES = [
  {
    id: 'L01', name: 'terme_vague',
    message: t => `terme non mesurable « ${t} » : remplacer par un comportement observable ou une valeur cible`,
    re: words(['rapide(?:s|ment)?', 'lente?s?', 'facile(?:s|ment)?', 'simple(?:s|ment)?', 'intuiti(?:f|ve|fs|ves|vement)', 'convivial(?:e|es|s)?',
      'ergonomique(?:s|ment)?', 'performant(?:e|es|s)?', 'efficace(?:s|ment)?', 'optimal(?:e|es|ement)?', 'optimaux', 'robuste(?:s)?', 'flexible(?:s)?',
      'moderne(?:s)?', 'adapté(?:e|es|s)?', 'approprié(?:e|es|s)?', 'suffisant(?:e|es|s)?', 'raisonnable(?:s|ment)?', 'user[- ]friendly',
      'si possible', 'si nécessaire', 'le cas échéant', 'notamment', 'etc\\.?', 'et/ou', 'au mieux', 'dans la mesure du possible']),
    applies: ['BR', 'AC', 'FR', 'NFR', 'RG', 'OBJ', 'GOAL', 'AD'],
  },
  {
    id: 'L02', name: 'points_de_suspension',
    message: () => 'points de suspension : l\'énumération est incomplète, la rendre exhaustive ou la décrire en intention',
    re: /(\.\.\.|…)/u,
    applies: ['BR', 'AC', 'FR', 'NFR', 'RG'],
  },
  {
    id: 'L03', name: 'enonce_multiple',
    message: t => `« ${t.trim()} » : l'énoncé contient peut-être plusieurs exigences, vérifier s'il faut le scinder`,
    re: words(['et', 'ou', 'ainsi que', 'de même que']),
    applies: ['BR', 'FR', 'RG'],
  },
  {
    id: 'L04', name: 'pronom_sans_antecedent',
    message: t => `l'énoncé commence par « ${t.trim()} » : il ne se lit pas seul, remplacer par le sujet explicite`,
    re: /^\s*(il|elle|ils|elles|celui-ci|celle-ci|ceux-ci|celles-ci|ce dernier|cette dernière|cela|ceci)(?=\s)/iu,
    applies: ['BR', 'FR', 'NFR', 'RG', 'AC'],
  },
  {
    id: 'L05', name: 'quantificateur_absolu',
    message: t => `« ${t.trim()} » : une généralisation cache souvent des exceptions, vérifier les cas où ce n'est pas vrai`,
    re: words(['tous', 'toutes', 'toujours', 'jamais', 'aucun(?:e)?', 'chaque fois', 'systématiquement', 'quel(?:le)?s? que soi(?:t|ent)', 'n\'importe']),
    applies: ['BC', 'BR', 'FR', 'RG'],
  },
  {
    id: 'L06', name: 'solution_dans_le_brd',
    message: t => `« ${t.trim()} » décrit un moyen, pas un besoin métier : remonter au besoin`,
    re: words(['écrans?', 'boutons?', 'menus?', 'clics?', 'cliquer', 'onglets?', 'pop-?ups?', 'liste déroulante', 'champs? de saisie', 'formulaires? web',
      'appli(?:cation)?s? (?:mobile|web)', 'appli', 'logiciel', 'progiciel', 'base de données', 'API', 'serveurs?', 'tableau de bord', 'dashboard', 'Excel']),
    applies: ['BR', 'OBJ'],
  },
  {
    id: 'L07', name: 'implementation_dans_le_prd',
    message: t => `« ${t.trim()} » décrit l'implémentation : reformuler en comportement observable (le choix relève de la conception)`,
    re: words(['base de données', 'tables?', 'API', 'endpoints?', 'serveurs?', 'microservices?', 'composants?', 'requêtes? SQL', 'JSON', 'REST', 'cache',
      'file de messages', 'framework', 'React', 'Swift', 'Node(?:\\.js)?',
      // Interface : le PRD décrit des comportements, pas des écrans.
      'écrans?', 'boutons?', 'pages?', 'menus?', 'fenêtres?', 'pop-?ups?', 'onglets?', 'listes? déroulantes?', 'cases? à cocher', 'champs? de saisie', 'cliqu\\p{L}*',
      // Produits et langages : un choix de conception.
      'PostgreSQL', 'MySQL', 'MongoDB', 'Oracle', 'Redis', 'Kafka', 'RabbitMQ', 'Elasticsearch', 'Kotlin', 'Java', 'Python', 'Next(?:\\.js)?', 'GraphQL']),
    applies: ['FR', 'AC'],
  },
  {
    id: 'L08', name: 'formulation_non_normative',
    message: () => 'aucun « doit / doivent / devra » : l\'énoncé ne dit pas clairement ce qui est exigé',
    test: t => !/\b(doi(?:t|vent)|devr(?:a|ont)|ne (?:doit|doivent) pas)\b/iu.test(t),
    applies: ['BR', 'FR', 'RG'],
  },
];

// Exécute les règles de rédaction sur un texte, pour un type d'élément donné.
export function checkText(kind, text, { waived = [] } = {}) {
  if (!text) return [];
  const out = [];
  for (const r of TEXT_RULES) {
    if (!r.applies.includes(kind) || waived.includes(r.id)) continue;
    if (r.test) {
      if (r.test(text)) out.push({ rule: r.id, name: r.name, message: r.message() });
    } else {
      const m = text.match(r.re);
      if (m) out.push({ rule: r.id, name: r.name, message: r.message(m[2] ?? m[1] ?? m[0]) });
    }
  }
  return out;
}

// ── Classe de preuve (empruntée au modèle de preuves de hve-core, design thinking) ──
// observé    : au moins une source de type observation, mesure ou test
// rapporté   : sources déclaratives seulement (entretien, atelier, document, ticket, revue, synthèse de design thinking)
// supposé    : aucune source
// non résolu : une zone d'ombre ouverte porte sur l'élément ; ce n'est jamais une preuve
export const OBSERVED_SOURCE_TYPES = ['observation', 'mesure', 'test'];
// Types de source où personne n'est présent : un document, un ticket ou un handoff se lisent sans
// entretien. Partout ailleurs, quelqu'un a parlé, et le dossier doit pouvoir dire qui (S81).
export const SOURCES_SANS_PRESENCE = ['document', 'ticket', 'dt-handoff', 'code', 'configuration'];
const NON_ENTENDU = ['à interroger', 'non disponible'];
// Un retour à la source fait : la personne a relu la synthèse, et l'a confirmée ou corrigée.
const FEEDBACK_FAIT = ['confirmé', 'corrigé', 'sans objet'];
// Les cinq motifs EARS (`references/ears.md`) et le marqueur que chacun impose à l'énoncé. La règle
// cherche la trace de la forme déclarée, pas le style : `unwanted` ne réclame que la condition, pas le
// « alors » que la référence met dans son tableau. Exigé, il signalait « Si un agent transmet un dossier
// sans justificatif, le système doit refuser… » — une phrase sans ambiguïté — et un constat qui tombe
// sur du correct abîme le catalogue entier. `ubiquitous` est l'invariant : il ne porte aucun marqueur,
// et en porter un signale un motif mal déclaré.
const EARS = {
  ubiquitous: [],
  event: [{ mot: 'Quand', re: /\bquand\b/i }],
  state: [{ mot: 'Tant que', re: /\btant que\b/i }],
  unwanted: [{ mot: 'Si', re: /\bsi\b/i }],
  // Pas de `\b` final : il est défini sur l'ASCII, et après le « ù » de « où » il n'y a pas de frontière
  // de mot — le marqueur ne se reconnaissait jamais.
  optional: [{ mot: 'Là où', re: /\bl[àa]\s+o[ùu]/i }],
};
// Un nom de décideur désigne une partie prenante : par son identifiant, ou par son nom s'il est renseigné.
const knownPerson = (s, shs, v) => shs.has(v) || arr(s.stakeholders).some(sh => sh.name && sh.name === v);
export function evidenceOf(s, srcIds, ownerIds = []) {
  const srcs = new Map(arr(s.sources).map(x => [x.id, x]));
  const ids = [...new Set(arr(srcIds))];
  const open = arr(s.shadow_zones).some(z => z.status === 'ouverte' && (ownerIds.includes(z.origin) || arr(z.related).some(r => ownerIds.includes(r))));
  const cls = !ids.length ? 'supposé' : ids.some(id => OBSERVED_SOURCE_TYPES.includes(srcs.get(id)?.type)) ? 'observé' : 'rapporté';
  return { class: cls, sources: ids.length, unresolved: open };
}
// Sources d'une exigence métier, en passant par ses besoins candidats.
export function brSources(s, br) {
  const bcs = new Map(arr(s.candidate_needs).map(x => [x.id, x]));
  return arr(br.from_needs).flatMap(n => arr(bcs.get(n)?.sources).map(x => x.ref ?? x));
}

// ── Règles de structure (portent sur l'état complet) ────────────────────────

const live = x => x && x.status !== 'abandonné';
const isValid = x => x?.status === 'validé';
const waivedOf = x => arr(x?.lint_waivers).map(w => w.rule);

// Chaque entrée : [id, élément, message]. `ids` donne l'ensemble des identifiants connus.
function refs(out, rule, owner, list, known, label) {
  for (const r of arr(list)) {
    if (!known.has(r)) out.push({ rule, id: owner.id, message: `${label} ${r} n'existe pas dans l'état` });
  }
}

function deadRefs(out, owner, list, coll) {
  for (const r of arr(list)) {
    const x = coll.get(r);
    if (x && (x.status === 'abandonné' || x.status === 'infirmée')) out.push({ rule: 'S10', id: owner.id, message: `renvoie vers ${r}, qui est ${x.status}` });
  }
}

const mapOf = coll => new Map(arr(coll).map(x => [x.id, x]));

// Une source déclarative tient par la personne qui a parlé. Sur le premier dossier réel, la source
// unique de tout le cadrage était typée « autre » et attribuée au directeur — dont le même fichier
// disait `status: à interroger`. Le dossier reposait donc sur quelqu'un qu'il déclarait ne pas avoir
// entendu, et la personne qui avait réellement parlé n'apparaissait dans aucune ligne. Un dossier peut
// tenir sur du rapporté ; il ne peut pas le présenter comme recueilli.
// Le contrôle vivait dans `checkBrd` seul, parce que le PRD n'avait pas de registre de parties
// prenantes : sur le deuxième dossier réel, ses neuf sources portaient « le directeur de l'association
// (propos relayés en direct par un membre du bureau) » dans un champ libre que rien ne lisait, et le
// document présentait tout cela comme recueilli. Le PRD a maintenant son registre, et la règle suit.
const checkSources = (s, out, shs) => {
  for (const src of arr(s.sources)) {
    if (SOURCES_SANS_PRESENCE.includes(src.type)) continue;
    const parties = arr(src.stakeholders);
    refs(out, 'S09', src, parties, shs, 'partie prenante');
    if (!parties.length) { out.push({ rule: 'S81', id: src.id, message: `source de type « ${src.type ?? 'non typée'} » sans partie prenante : qui a parlé ?` }); continue; }
    const connues = parties.filter(p => shs.has(p));
    const muettes = connues.filter(p => NON_ENTENDU.includes(shs.get(p).status));
    if (connues.length && muettes.length === connues.length) {
      out.push({ rule: 'S81', id: src.id, message: `source attribuée à ${muettes.join(', ')}, que l'état déclare « ${shs.get(muettes[0]).status} » : ce qui en vient est rapporté par un tiers, pas recueilli` });
    }
  }
};

export function checkBrd(s) {
  const out = [];
  const objs = mapOf(s.objectives), brs = mapOf(s.business_requirements), bcs = mapOf(s.candidate_needs);
  const rgs = mapOf(s.business_rules), shs = mapOf(s.stakeholders), srcs = mapOf(s.sources);
  const push = (x, kind, text) => checkText(kind, text, { waived: waivedOf(x) }).forEach(f => out.push({ ...f, id: x.id }));

  if (s.phase && !['assess', 'close'].includes(s.phase) && s.opportunity && s.opportunity.decision !== 'aller_plus_loin') {
    out.push({ rule: 'S56', id: 'opportunity', message: `phase ${s.phase} sans décision « aller plus loin » sur l'opportunité (décision : ${s.opportunity.decision ?? 'aucune'})` });
  }
  if (s.opportunity?.decision && !['en_attente'].includes(s.opportunity.decision) && !s.opportunity.decided_by) {
    out.push({ rule: 'S56', id: 'opportunity', message: 'décision d\'opportunité sans décideur déclaré' });
  } else if (s.opportunity?.decided_by && arr(s.stakeholders).length && !knownPerson(s, shs, s.opportunity.decided_by)) {
    // Un décideur déclaré doit être quelqu'un que le dossier nomme. Sur le premier dossier réel, la
    // décision d'opportunité a été enregistrée au nom pris dans la configuration Git, faute de l'avoir
    // demandé : un nom présent, et personne derrière. `decision_rights` est déjà tenu à cette exigence
    // (S09) ; la décision qui ouvre l'initiative, non. Rien à vérifier tant qu'aucune partie prenante
    // n'est connue : en Assess, la carte n'existe pas encore.
    out.push({ rule: 'S56', id: 'opportunity', message: `décideur « ${s.opportunity.decided_by} » absent des parties prenantes : la décision d'opportunité revient au sponsor, qui se nomme (SH-xx)` });
  }
  if (s.opportunity?.decision === 'decoupee' && !arr(s.opportunity.split_into).length) {
    out.push({ rule: 'S56', id: 'opportunity', message: 'opportunité découpée sans nommer les initiatives filles (split_into) : close se relit alors comme un abandon' });
  }
  for (const o of arr(s.objectives).filter(live)) {
    push(o, 'OBJ', o.statement);
    if (!o.indicator || !o.target) out.push({ rule: 'S01', id: o.id, message: 'objectif sans indicateur ou sans cible' });
  }
  for (const n of arr(s.candidate_needs).filter(live)) push(n, 'BC', n.text);
  for (const b of arr(s.business_requirements).filter(live)) {
    push(b, 'BR', b.statement);
    arr(b.acceptance).forEach(a => checkText('AC', a, { waived: waivedOf(b) }).forEach(f => out.push({ ...f, id: b.id, message: `critère : ${f.message}` })));
    if (!arr(b.objectives).length) out.push({ rule: 'S02', id: b.id, message: 'exigence rattachée à aucun objectif' });
    if (!arr(b.from_needs).length) out.push({ rule: 'S03', id: b.id, message: 'exigence sans besoin candidat sourcé' });
    if (isValid(b) && !arr(b.acceptance).length) out.push({ rule: 'S04', id: b.id, message: 'exigence validée sans critère d\'acceptation' });
    if (isValid(b) && !b.priority) out.push({ rule: 'S05', id: b.id, message: 'exigence validée sans priorité' });
    refs(out, 'S09', b, b.objectives, objs, 'objectif');
    refs(out, 'S09', b, b.from_needs, bcs, 'besoin candidat');
    refs(out, 'S09', b, b.business_rules, rgs, 'règle métier');
    deadRefs(out, b, b.objectives, objs);
    deadRefs(out, b, b.from_needs, bcs);
  }
  for (const b of arr(s.business_requirements).filter(x => live(x) && x.status === 'validé')) {
    const ev = evidenceOf(s, brSources(s, b), [b.id, ...arr(b.from_needs)]);
    if (ev.sources === 1) out.push({ rule: 'S63', id: b.id, message: 'exigence fondée sur une seule source : un motif isolé n\'est pas encore un besoin établi' });
    if (ev.class === 'supposé') out.push({ rule: 'S64', id: b.id, message: 'exigence validée sans aucune source : c\'est une hypothèse' });
    // `elicitation-patterns.md` section 6 ordonne de renseigner `feedback` sur la source et dit la suite :
    // « un besoin candidat issu d'une source non confirmée peut être utilisé, mais signale-le au moment
    // de le transformer en exigence ». Rien ne le signalait — le champ existait, personne ne le lisait,
    // et le retour à la source pouvait n'avoir jamais eu lieu sans que le dossier s'en aperçoive.
    const ids = brSources(s, b);
    if (ids.length && !ids.some(id => FEEDBACK_FAIT.includes(srcs.get(id)?.feedback))) {
      out.push({ rule: 'S84', id: b.id, message: 'exigence validée sur des sources dont aucune n\'a été relue par la personne interrogée (`feedback`) : ce qui a été compris n\'a jamais été vérifié auprès d\'elle' });
    }
  }
  // `phase-discover.md` ordonne « Renseigne `end_user` et `represents` » et explique pourquoi : les
  // besoins opérationnels se recueillent au plus près du terrain. `represents` était rendu, `end_user`
  // n'était lu par rien. Un dossier peut donc collecter des besoins sans qu'aucun utilisateur réel ait
  // parlé — le cas du référent qui répond pour ses agents, vu sur les deux dossiers réels.
  if (arr(s.stakeholders).length && arr(s.candidate_needs).filter(live).length) {
    const entendus = arr(s.stakeholders).filter(sh => sh.status === 'interrogée');
    if (entendus.length && !entendus.some(sh => sh.end_user)) {
      out.push({ rule: 'S83', id: 'stakeholders', message: 'des besoins recueillis, et aucun utilisateur direct entendu (`end_user`) : tout passe par des représentants' });
    }
  }
  if (['define', 'govern'].includes(s.phase)) {
    const sc = s.synthesis_check;
    if (!sc?.date) out.push({ rule: 'S65', id: 'synthesis_check', message: 'passage en Define sans porte de synthèse (cinq dimensions)' });
    else for (const d of ['fidelite', 'couverture', 'robustesse', 'actionnabilite', 'alignement']) {
      if (sc[d]?.status === 'faible' && !sc[d]?.assumed) out.push({ rule: 'S65', id: 'synthesis_check', message: `dimension « ${d} » jugée faible sans décision de l'assumer` });
    }
  }
  for (const t of arr(s.transition_requirements).filter(live)) {
    if (!t.kind) out.push({ rule: 'S66', id: t.id, message: 'exigence de transition sans type (formation, conduite du changement, reprise de données…)' });
    if (!arr(t.stakeholders).length) out.push({ rule: 'S66', id: t.id, message: 'exigence de transition sans partie prenante concernée' });
    if (!t.done_when) out.push({ rule: 'S66', id: t.id, message: 'exigence de transition sans critère d\'achèvement' });
  }
  for (const r of arr(s.business_rules).filter(live)) {
    // Une règle de définition énonce un fait ou un calcul : elle n'a pas à être normative (L08).
    checkText('RG', r.statement, { waived: [...waivedOf(r), ...(r.kind === 'definition' ? ['L08'] : [])] }).forEach(f => out.push({ ...f, id: r.id }));
    if (!arr(r.sources).length) out.push({ rule: 'S11', id: r.id, message: 'règle métier sans source (texte, procédure ou personne qui la détient)' });
    if (r.kind === 'comportement' && !r.enforcement) out.push({ rule: 'S12', id: r.id, message: 'règle de comportement sans niveau d\'application (stricte, dérogation autorisée, dérogation justifiée, indicative)' });
    if (!r.owner) out.push({ rule: 'S13', id: r.id, message: 'règle métier sans responsable métier (qui peut la modifier ?)' });
    refs(out, 'S09', r, arr(r.sources).map(x => x.ref ?? x), srcs, 'source');
  }
  for (const z of arr(s.shadow_zones).filter(z => z.status === 'ouverte')) {
    if (z.type === 'contradiction' && !z.subtype) out.push({ rule: 'S14', id: z.id, message: 'contradiction non qualifiée (factuelle, vocabulaire, réglementaire ou intérêts)' });
    if (z.type === 'contradiction' && z.subtype === 'interets') {
      if (!z.arbiter) out.push({ rule: 'S15', id: z.id, message: 'conflit d\'intérêts sans arbitre : consulter decision_rights ou créer une zone arbitre_inconnu' });
      else if (arr(z.parties).includes(z.arbiter)) out.push({ rule: 'S16', id: z.id, message: `l'arbitre ${z.arbiter} est partie au conflit` });
      else refs(out, 'S09', z, [z.arbiter], shs, 'arbitre');
    }
  }
  for (const d of arr(s.decision_rights)) {
    refs(out, 'S09', { id: `decision_rights:${d.domain}` }, [d.decider, d.escalation].filter(Boolean), shs, 'partie prenante');
  }
  for (const d of arr(s.decisions).filter(live)) {
    if (d.status === 'validé' && !d.decided_by) out.push({ rule: 'S17', id: d.id, message: 'décision validée sans décideur déclaré' });
    if (arr(d.options).length < 2) out.push({ rule: 'S18', id: d.id, message: 'décision présentée avec moins de deux options : le décideur n\'a pas eu de choix réel' });
  }
  checkSources(s, out, shs);
  for (const sh of arr(s.stakeholders)) {
    if (sh.influence === 'négative' && sh.power === 'fort' && !arr(s.risks).some(r => arr(r.related).includes(sh.id) || r.origin === sh.id)) {
      out.push({ rule: 'S19', id: sh.id, message: 'partie prenante à fort pouvoir et influence négative sans risque associé' });
    }
  }
  return out;
}

export function checkPrd(s) {
  const out = [];
  const chained = s.mode === 'chaîné';
  const goals = mapOf(s.goals), pers = mapOf(s.personas), pjs = mapOf(s.journeys), rels = mapOf(s.releases);
  const mets = arr(s.metrics).filter(live);
  const frs = mapOf(s.functional_requirements), dds = mapOf(s.design_decisions), srcs = mapOf(s.sources);
  const brs = mapOf(arr(s.brd_ref?.requirements)), rgs = mapOf(arr(s.business_rules));
  const shs = mapOf(s.stakeholders);
  const acs = arr(s.acceptance_criteria).filter(live);
  checkSources(s, out, shs);
  const push = (x, kind, text) => checkText(kind, text, { waived: waivedOf(x) }).forEach(f => out.push({ ...f, id: x.id }));

  if (['specify', 'govern'].includes(s.phase)) {
    for (const h of arr(s.hypotheses).filter(h => ['valeur', 'usage'].includes(h.kind) && h.risk === 'fort')) {
      if (h.status === 'assumée' && !h.reason) out.push({ rule: 'S57', id: h.id, message: 'hypothèse risquée assumée sans raison' });
      else if (!['confirmée', 'infirmée', 'assumée'].includes(h.status) && !h.test?.result) out.push({ rule: 'S57', id: h.id, message: `hypothèse ${h.kind === 'usage' ? 'd\'usage' : `de ${h.kind}`} à risque fort ni testée ni assumée avant la spécification` });
    }
  }
  for (const h of arr(s.hypotheses).filter(h => h.test?.method && !h.test?.success_criterion)) {
    out.push({ rule: 'S57', id: h.id, message: 'test sans critère de réussite écrit à l\'avance' });
  }
  if (s.existing_product && ['specify', 'govern'].includes(s.phase) && !arr(s.preserved_behaviors).filter(b => b.status !== 'abandonné').length) out.push({ rule: 'S73', id: 'preserved_behaviors', message: 'produit existant sans comportement à préserver : qu\'est-ce que ce changement ne doit pas casser ?' });
  for (const b of arr(s.preserved_behaviors).filter(x => x.status !== 'abandonné')) if (!arr(b.evidence).length) out.push({ rule: 'S73', id: b.id, message: 'comportement à préserver sans preuve qu\'il existe : c\'est une hypothèse' });
  const concepts = arr(s.concepts).filter(c => c.status !== 'abandonné');
  if (concepts.length) {
    const kept = concepts.filter(c => c.decision === 'retenu');
    if (concepts.length === 1) out.push({ rule: 'S67', id: concepts[0].id, message: 'un seul concept envisagé : ce n\'est pas une exploration' });
    if (kept.length > 1) out.push({ rule: 'S67', id: kept.map(c => c.id).join(','), message: 'plusieurs concepts retenus : la story map n\'en suit qu\'un' });
    for (const c of concepts) {
      if (c.decision && c.decision !== 'à_tester' && !c.reason) out.push({ rule: 'S67', id: c.id, message: 'concept retenu ou écarté sans raison' });
      if (c.decision === 'retenu' && !arr(c.tested_by).length) out.push({ rule: 'S67', id: c.id, message: 'concept retenu sans test de valeur ou d\'usage (tested_by)' });
      for (const l of ['desirability', 'feasibility', 'viability']) if (!c.lenses?.[l]) out.push({ rule: 'S67', id: c.id, message: `concept non évalué sur l'axe ${({ desirability: 'désirable', feasibility: 'faisable', viability: 'viable' })[l]}` });
    }
  }
  for (const g of arr(s.goals).filter(live)) {
    push(g, 'GOAL', g.statement);
    if (!g.kpi || !g.target) out.push({ rule: 'S01', id: g.id, message: 'objectif produit sans KPI ou sans cible' });
    for (const id of String(g.kpi ?? '').match(/MET-\d+/g) ?? []) {
      if (!mets.some(m => m.id === id)) out.push({ rule: 'S09', id: g.id, message: `métrique ${id} inexistante` });
    }
  }
  // ── Métriques et objectifs accordés (S82) ──
  // Deuxième dossier réel : les cinq objectifs portaient leur cible, décidée par le bureau le jour même
  // (ZO-031 levée), et les quatre métriques gardaient `target: ""` avec le commentaire « à fixer par le
  // directeur » et `goal: ""` avec « rattaché dès que les objectifs produit seront écrits ». Ils
  // l'étaient. Le PRD livré annonçait donc « 4 sur 150 → 0 demande perdue » au § 2 et « → — » au § 8
  // pour la même MET-01, et la vérification concluait « aucun avertissement » : rien ne lisait
  // `metrics`. Un commentaire YAML ne se relit pas, et deux chiffres pour la même mesure en font un faux.
  for (const m of mets) {
    if (!m.goal) {
      if (arr(s.goals).filter(live).length) out.push({ rule: 'S82', id: m.id, message: 'métrique rattachée à aucun objectif produit (`goal`) : rien ne dit ce qu\'elle sert à mesurer' });
      continue;
    }
    refs(out, 'S09', m, [m.goal], goals, 'objectif');
    const g = goals.get(m.goal);
    if (!g) continue;
    if (g.target && !m.target) out.push({ rule: 'S82', id: m.id, message: `cible vide alors que ${g.id} a fixé la sienne : la même mesure porte deux valeurs, et le document n'en affiche qu'une` });
    if (!g.target && m.target) out.push({ rule: 'S82', id: m.id, message: `cible fixée alors que ${g.id} n'a pas la sienne : c'est l'objectif qui porte l'engagement, la métrique le mesure` });
  }
  for (const f of arr(s.functional_requirements).filter(live)) {
    push(f, 'FR', f.statement);
    // `phase-specify.md` dit « choisis le motif et renseigne `pattern` », et rien ne le vérifiait : ni
    // que la valeur est l'un des cinq, ni qu'elle s'accorde avec l'énoncé. Un `pattern: event` sur une
    // phrase sans « Quand » passait sans bruit, et EARS n'a d'intérêt que si la forme est tenue.
    const motif = String(f.pattern ?? '').trim();
    const enonce = String(f.statement ?? '');
    if (!motif) out.push({ rule: 'S85', id: f.id, message: `exigence sans motif EARS (\`pattern\`) : ${Object.keys(EARS).join(', ')} (\`references/ears.md\`)` });
    else if (!(motif in EARS)) out.push({ rule: 'S85', id: f.id, message: `motif « ${motif} » inconnu : ${Object.keys(EARS).join(', ')}` });
    else if (enonce) {
      const absents = EARS[motif].filter(m => !m.re.test(enonce)).map(m => `« ${m.mot} »`);
      if (absents.length) out.push({ rule: 'S85', id: f.id, message: `motif « ${motif} » déclaré, mais l'énoncé ne porte pas ${absents.join(' ni ')} : l'un des deux est faux` });
      if (motif === 'ubiquitous') {
        const intrus = Object.entries(EARS).filter(([k, ms]) => k !== 'ubiquitous' && ms[0].re.test(enonce)).map(([k]) => k);
        if (intrus.length) out.push({ rule: 'S85', id: f.id, message: `déclarée invariante, mais l'énoncé porte la forme ${intrus.map(k => `« ${k} »`).join(' et ')} : un invariant n'a pas de condition` });
      }
    }
    const hasOrigin = arr(f.brd_requirements).length || f.origin;
    if (!hasOrigin) out.push({ rule: 'S06', id: f.id, message: 'exigence sans origine (BR, source ou décision produit)' });
    const own = acs.filter(a => a.fr === f.id);
    if (isValid(f) && !own.length) out.push({ rule: 'S04', id: f.id, message: 'exigence validée sans critère d\'acceptation' });
    if (isValid(f) && f.priority === 'must' && !own.some(a => a.kind === 'erreur')) out.push({ rule: 'S07', id: f.id, message: 'exigence Must sans scénario d\'erreur' });
    if (isValid(f) && (!f.release || !f.priority)) out.push({ rule: 'S05', id: f.id, message: 'exigence validée sans release ou sans priorité' });
    refs(out, 'S09', f, f.goals, goals, 'objectif');
    refs(out, 'S09', f, f.journeys, pjs, 'parcours');
    if (f.release) refs(out, 'S09', f, [f.release], rels, 'release');
    if (f.actor && /^PER-/.test(f.actor)) refs(out, 'S09', f, [f.actor], pers, 'persona');
    if (chained) refs(out, 'S09', f, f.brd_requirements, brs, 'exigence du BRD');
    refs(out, 'S09', f, f.business_rules, rgs, 'règle métier');
    if (f.origin && /^DD-/.test(f.origin)) refs(out, 'S09', f, [f.origin], dds, 'décision');
    if (f.origin && /^SRC-/.test(f.origin)) {
      refs(out, 'S09', f, [f.origin], srcs, 'source');
      // Même consigne que pour le BRD (`elicitation-patterns.md` section 6, commune aux deux skills) :
      // `feedback` dit si la personne interrogée a relu la synthèse. Le champ existe dans le modèle du
      // PRD depuis toujours, et `S84` ne vivait que dans `checkBrd` — invisible au garde-fou, qui lisait
      // `rules.mjs` en entier alors qu'il est copié dans quatre skills.
      const src = srcs.get(f.origin);
      if (src && !FEEDBACK_FAIT.includes(src.feedback)) {
        out.push({ rule: 'S84', id: f.id, message: `exigence tirée de ${f.origin}, que la personne interrogée n'a jamais relue (\`feedback\`) : ce qui a été compris n'a pas été vérifié auprès d'elle` });
      }
    }
    deadRefs(out, f, f.goals, goals);
  }
  for (const a of acs) {
    push(a, 'AC', [a.given, a.when, a.then].filter(Boolean).join(' ') || a.scenario);
    if (!frs.has(a.fr)) out.push({ rule: 'S09', id: a.id, message: `exigence ${a.fr} inexistante` });
  }
  for (const n of arr(s.nfrs).filter(live)) {
    push(n, 'NFR', n.statement);
    const missing = ['metric', 'target', 'measurement'].filter(k => !n[k]);
    if (missing.length) out.push({ rule: 'S08', id: n.id, message: `NFR incomplète : ${missing.join(', ')} manquant(s)` });
    refs(out, 'S09', n, n.applies_to, frs, 'exigence');
  }
  for (const r of arr(s.business_rules).filter(x => live(x) && x.automation === 'automatisée')) {
    const covered = arr(s.functional_requirements).some(f => live(f) && arr(f.business_rules).includes(r.id));
    if (!covered) out.push({ rule: 'S20', id: r.id, message: 'règle à automatiser couverte par aucune exigence fonctionnelle' });
  }
  for (const d of arr(s.design_decisions).filter(live)) {
    if (d.status === 'validé' && !d.decided_by) out.push({ rule: 'S17', id: d.id, message: 'décision validée sans décideur déclaré' });
  }
  // `prd-builder/references/shadow-zones.md` prescrit « Renseigne `parties` et `arbiter` (le décideur du
  // domaine dans `decision_rights`, jamais partie au conflit) » — et rien ne le vérifiait : `S15` et
  // `S16` n'existaient que dans `checkBrd`, où le conflit est une `contradiction` de sous-type
  // `interets` et non un type à lui seul. Sans `parties`, `S16` est d'ailleurs inatteignable : l'arbitre
  // ne peut pas être trouvé partie à un conflit dont les parties ne sont pas dites.
  for (const z of arr(s.shadow_zones).filter(z => z.status === 'ouverte' && z.type === 'conflit_interets')) {
    if (!arr(z.parties).length) out.push({ rule: 'S15', id: z.id, message: 'conflit d\'intérêts sans parties nommées : on ne sait pas qui veut l\'inverse de qui' });
    if (!z.arbiter) out.push({ rule: 'S15', id: z.id, message: 'conflit d\'intérêts sans arbitre : consulter decision_rights ou créer une zone arbitre_inconnu' });
    else if (arr(z.parties).includes(z.arbiter)) out.push({ rule: 'S16', id: z.id, message: `l'arbitre ${z.arbiter} est partie au conflit` });
    else if (arr(s.stakeholders).length && !knownPerson(s, shs, z.arbiter)) out.push({ rule: 'S09', id: z.id, message: `arbitre « ${z.arbiter} » absent du registre des parties prenantes` });
  }
  // `S17` ne vérifiait que le champ non vide. Sur le deuxième dossier réel, cela donnait
  // `decided_by: "le directeur (relayé par un membre du bureau)"` — une phrase, pas une personne — et
  // `decision_rights` tenait « directeur + bureau (priorisation conjointe) » comme décideur. Le PRD a
  // maintenant un registre : un décideur s'y nomme, par son identifiant ou par son nom. Le contrôle ne
  // s'arme qu'une fois le registre renseigné, faute de quoi il redirait l'absence que `S81` dit déjà.
  if (arr(s.stakeholders).length) {
    for (const d of arr(s.decision_rights)) {
      for (const qui of [d.decider, d.escalation].filter(Boolean)) {
        if (!knownPerson(s, shs, qui)) out.push({ rule: 'S09', id: `decision_rights:${d.domain}`, message: `partie prenante « ${qui} » absente du registre : le décideur d'un domaine se nomme (SH-xx ou son nom)` });
      }
    }
    const nomme = (x, champ, qui) => {
      if (qui && !knownPerson(s, shs, qui)) out.push({ rule: 'S17', id: x.id, message: `${champ} « ${qui} » absent du registre des parties prenantes : il se nomme, et se prend dans decision_rights` });
    };
    for (const g of arr(s.goals).filter(live)) nomme(g, 'décideur de la cible', g.decided_by);
    for (const d of arr(s.design_decisions).filter(live)) nomme(d, 'décideur', d.decided_by);
  }
  return out;
}

export function checkSad(s) {
  const out = [];
  const isLive = x => x && !['abandonné', 'rejeté', 'remplacé', 'déprécié'].includes(x.status);
  const accepted = x => x?.status === 'accepté';
  const ref = s.prd_ref ?? {};
  const frs = mapOf(ref.functional_requirements), nfrs = mapOf(ref.nfrs), cons = mapOf([...arr(ref.constraints), ...arr(s.constraints)]);
  const rgs = mapOf(ref.business_rules), drivers = mapOf(s.drivers), els = mapOf(s.elements), lnks = mapOf(s.relations);
  const adrs = mapOf(s.decisions), dats = mapOf(s.data_entities), srcs = mapOf(s.sources), ctxs = mapOf(s.contexts);
  const driverRefs = new Map([...drivers, ...cons, ...rgs, ...nfrs, ...frs]);
  const push = (x, kind, text) => checkText(kind, text, { waived: waivedOf(x) }).forEach(f => out.push({ ...f, id: x.id }));

  for (const d of arr(s.drivers).filter(isLive)) {
    push(d, 'AD', [d.scenario?.response, d.scenario?.measure].filter(Boolean).join(' ; '));
    if (!arr(d.origin).length) out.push({ rule: 'S21', id: d.id, message: 'moteur sans origine (NFR, contrainte, FR ou règle)' });
    else refs(out, 'S09', d, d.origin, driverRefs, 'origine');
    if (!d.scenario?.measure) out.push({ rule: 'S22', id: d.id, message: 'scénario de qualité sans mesure chiffrée' });
  }
  for (const a of arr(s.decisions).filter(isLive)) {
    if (arr(a.options).length < 2) out.push({ rule: 'S23', id: a.id, message: 'ADR avec moins de deux options : ce n\'est pas une décision' });
    if (!arr(a.drivers).length) out.push({ rule: 'S24', id: a.id, message: 'ADR sans moteur : on ne saura pas quand le remettre en cause' });
    else refs(out, 'S09', a, a.drivers, driverRefs, 'moteur');
    if (accepted(a)) {
      if (!a.decided_by) out.push({ rule: 'S17', id: a.id, message: 'ADR accepté sans décideur déclaré' });
      if (!arr(a.consequences?.bad).length) out.push({ rule: 'S25', id: a.id, message: 'ADR accepté sans conséquence négative : toute décision sacrifie quelque chose' });
      if (!a.confirmation) out.push({ rule: 'S25', id: a.id, message: 'ADR accepté sans moyen de confirmation' });
      if (!a.prevents) out.push({ rule: 'S71', id: a.id, message: 'ADR accepté sans divergence empêchée : que feraient différemment deux parties construites sans lui ?' });
      if (!a.rule) out.push({ rule: 'S71', id: a.id, message: 'ADR accepté sans règle vérifiable : la décision ne guidera ni un développeur ni un agent' });
      if (a.outcome && !arr(a.options).some(o => o.name === a.outcome)) out.push({ rule: 'S09', id: a.id, message: `option retenue « ${a.outcome} » absente des options` });
    }
    if (a.supersedes) refs(out, 'S09', a, [a.supersedes], adrs, 'ADR remplacé');
    refs(out, 'S09', a, a.elements, els, 'élément');
  }

  // Modèle C4
  const names = new Map();
  for (const e of arr(s.elements).filter(isLive)) {
    const key = String(e.name ?? '').trim().toLowerCase();
    if (key) names.set(key, [...(names.get(key) ?? []), e.id]);
    if (e.kind !== 'person' && String(e.lifecycle ?? '').startsWith('existant') && !arr(e.evidence).length) out.push({ rule: 'S28', id: e.id, message: 'élément existant sans preuve (code, configuration, manifeste, document)' });
    if (e.lifecycle === 'existant_remplacé' && !e.replaced_by) out.push({ rule: 'S36', id: e.id, message: 'élément remplacé sans remplaçant désigné' });
    const parent = els.get(e.parent);
    if (e.kind === 'container' && !(parent?.kind === 'system' && !parent.external)) out.push({ rule: 'S34', id: e.id, message: 'conteneur sans système interne parent' });
    if (e.kind === 'component' && parent?.kind !== 'container') out.push({ rule: 'S34', id: e.id, message: 'composant sans conteneur parent' });
    refs(out, 'S09', e, e.frs, frs, 'FR');
    refs(out, 'S09', e, e.evidence, srcs, 'source');
    refs(out, 'S09', e, e.contexts, ctxs, 'contexte');
    if (e.replaced_by) refs(out, 'S09', e, [e.replaced_by], els, 'remplaçant');
  }
  for (const [n, ids] of names) if (ids.length > 1) out.push({ rule: 'S33', id: ids[0], message: `nom « ${n} » porté par plusieurs éléments (${ids.join(', ')})` });
  for (const l of arr(s.relations).filter(isLive)) {
    refs(out, 'S09', l, [l.from, l.to], els, 'élément');
    if (String(l.lifecycle ?? '').startsWith('existant') && !arr(l.evidence).length) out.push({ rule: 'S28', id: l.id, message: 'relation existante sans preuve' });
  }

  // Allocation des FR
  const allocated = new Set(arr(s.elements).filter(isLive).flatMap(e => arr(e.frs)));
  for (const f of arr(ref.functional_requirements)) {
    if (f.priority !== 'wont' && !allocated.has(f.id)) out.push({ rule: 'S26', id: f.id, message: 'FR allouée à aucun conteneur ni composant' });
  }
  // Réponses aux NFR
  const responses = arr(s.nfr_responses).filter(isLive);
  for (const n of arr(ref.nfrs)) {
    const r = responses.filter(x => x.nfr === n.id);
    if (!r.length) out.push({ rule: 'S27', id: n.id, message: 'NFR sans réponse de conception' });
  }
  for (const r of responses) {
    if (!r.verification?.method) out.push({ rule: 'S27', id: r.id, message: 'réponse à une NFR sans méthode de vérification' });
    refs(out, 'S09', r, [r.nfr], nfrs, 'NFR');
    refs(out, 'S09', r, r.elements, els, 'élément');
    refs(out, 'S09', r, r.decisions, adrs, 'ADR');
  }
  // Règles métier automatisées
  const guarded = new Set(arr(s.contexts).flatMap(c => arr(c.aggregates).flatMap(a => arr(a.invariants))));
  for (const r of arr(ref.business_rules).filter(r => r.automation === 'automatisée')) {
    if (!guarded.has(r.id)) out.push({ rule: 'S35', id: r.id, message: 'règle automatisée garantie par aucun agrégat' });
  }
  // Données
  const threats = arr(s.threats).filter(isLive);
  for (const d of arr(s.data_entities).filter(isLive)) {
    const missing = [['store', 'propriétaire'], ['classification', 'classification'], ['retention', 'conservation']].filter(([k]) => !d[k]).map(([, l]) => l);
    if (missing.length) out.push({ rule: 'S30', id: d.id, message: `donnée sans ${missing.join(', ')}` });
    if (d.store) refs(out, 'S09', d, [d.store], els, 'conteneur');
    if (['personnelle', 'sante'].includes(d.classification) && d.store && !threats.some(t => t.stride === 'I' && t.target === d.store)) {
      out.push({ rule: 'S31', id: d.id, message: `donnée ${d.classification} sans menace de divulgation (I) examinée sur ${d.store}` });
    }
  }
  // Interfaces
  for (const api of arr(s.interfaces).filter(isLive)) {
    refs(out, 'S09', api, [api.provider, ...arr(api.consumers)], els, 'élément');
    for (const op of arr(api.operations)) {
      if (!arr(op.frs).length) out.push({ rule: 'S29', id: op.id ?? api.id, message: 'opération qui ne sert aucune FR' });
      refs(out, 'S09', { id: op.id ?? api.id }, op.frs, frs, 'FR');
      refs(out, 'S09', { id: op.id ?? api.id }, op.data, dats, 'donnée');
    }
  }
  // Menaces
  for (const t of threats) {
    if (!t.treatment) out.push({ rule: 'S32', id: t.id, message: 'menace sans traitement décidé' });
    if (t.treatment === 'accepter' && !t.accepted_by) out.push({ rule: 'S32', id: t.id, message: 'menace acceptée sans décideur déclaré' });
    if (t.treatment === 'attenuer' && !arr(t.mitigations).length) out.push({ rule: 'S32', id: t.id, message: 'menace à atténuer sans mesure' });
    if (!els.has(t.target) && !lnks.has(t.target)) out.push({ rule: 'S09', id: t.id, message: `cible ${t.target} inexistante` });
    if (arr(s.security_catalogs).length && t.treatment === 'attenuer' && !arr(t.controls).length) out.push({ rule: 'S55', id: t.id, message: `mesure sans contrôle de référence (${arr(s.security_catalogs).join(', ')})` });
  }
  for (const tb of arr(s.trust_boundaries)) refs(out, 'S09', tb, tb.elements, els, 'élément');
  return out;
}

// ── Planification ───────────────────────────────────────────────────────────
// `refs` = contenu de refs.yaml (handoffs du PRD et de la conception), généré par ingest-handoffs.mjs.

export const SIZE_ORDER = ['S', 'M', 'L', 'XL'];

// Préparation d'une story (Definition of Ready calculée). Utilisée par lint.mjs et render-plan.mjs.
export function storyReadiness(s, story, refs = {}) {
  const reasons = [];
  const map = story.example_map ?? {};
  const rules = arr(map.rules);
  const tasks = mapOf(s.tasks);
  if (story.lane === 'rapide') {
    // Voie rapide (references/fast-lane.md) : origine observée et au moins un exemple, sans FR ni story map.
    if (!story.origin?.type || !story.origin?.ref) reasons.push('voie rapide sans origine observée');
    const hasExample = arr(s.examples).some(e => e.story === story.id && e.status !== 'abandonné');
    if (!hasExample) reasons.push('aucun exemple (pour un défaut : la reproduction)');
  } else {
    if (!arr(story.frs).length) reasons.push('aucune FR');
    if (!story.map_task) reasons.push('aucune tâche de story map');
    if (!map.session?.date) reasons.push('example mapping non fait');
    if (!rules.length) reasons.push('aucune règle');
  }
  const noEx = rules.filter(r => !arr(r.examples).length);
  if (noEx.length) reasons.push(`${noEx.length} règle(s) sans exemple`);
  const openQ = arr(s.shadow_zones).filter(z => z.status === 'ouverte' && (z.story === story.id || arr(map.questions).includes(z.id)));
  if (openQ.length) reasons.push(`${openQ.length} question(s) ouverte(s)`);
  const pendingCr = arr(s.governance?.change_requests).filter(c => (!c.decision || c.decision === 'en_attente') && arr(c.concerns).includes(story.id));
  if (pendingCr.length) reasons.push(`demande de changement en attente (${pendingCr.map(c => c.id).join(', ')})`);
  const spikes = arr(story.depends_on).map(id => tasks.get(id)).filter(t => t?.kind === 'spike' && t.status !== 'terminé');
  if (spikes.length) reasons.push(`spike non terminé (${spikes.map(t => t.id).join(', ')})`);
  if (story.size === 'XL') reasons.push('taille XL');
  void refs;
  return { ready: reasons.length === 0, reasons };
}

// Cycles du graphe de dépendances des tâches (liste de chemins).
export function taskCycles(tasks) {
  const deps = new Map(tasks.map(t => [t.id, arr(t.depends_on).filter(d => tasks.some(x => x.id === d))]));
  const cycles = [], state = new Map();
  const visit = (id, path) => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) { cycles.push([...path.slice(path.indexOf(id)), id]); return; }
    state.set(id, 1);
    for (const d of deps.get(id) ?? []) visit(d, [...path, id]);
    state.set(id, 2);
  };
  for (const t of tasks) visit(t.id, []);
  return cycles;
}

// ── Taille de risque, calculée (quand l'IA réalise les tâches, la taille mesure le risque, pas l'effort de codage) ──
// Facteurs tirés des données de la tâche : chacun augmente la probabilité d'allers-retours, donc l'attention humaine.
export function riskSize(task, plan = {}, refs = {}) {
  const story = arr(plan.stories).find(x => x.id === task.story);
  const existing = arr(refs.sad?.work_items).filter(w => arr(task.elements).includes(w.id) && w.lifecycle === 'existant_modifié').length;
  const factors = [
    ['éléments touchés', Math.max(0, arr(task.elements).length - 1)],
    ['opérations de contrat', 2 * arr(task.operations).length],
    ['règles métier de la story', Math.floor(arr(story?.example_map?.rules).length / 2)],
    ['nombreux exemples', arr(plan.examples).filter(e => e.story === story?.id).length > 6 ? 1 : 0],
    ['code existant modifié', existing ? 2 : 0],
    ['mesures de sécurité', arr(task.threats).length ? 1 : 0],
    ['comportements à préserver', Math.min(2, arr(task.preserves).length)],
    ['incertitude (spike)', task.kind === 'spike' ? 2 : 0],
  ].filter(([, v]) => v > 0);
  const score = factors.reduce((n, [, v]) => n + v, 0);
  return { size: score <= 1 ? 'S' : score <= 3 ? 'M' : score <= 5 ? 'L' : 'XL', score, factors };
}
// Attention humaine prévue pour une tâche réalisée par un agent, en minutes : validation de la compréhension,
// réponses aux questions, revue de la PR et ses retours. Calibrée par settings.attention_by_size (mesures réelles).
export const ATTENTION_DEFAULTS = { validation: 15, question: 10, revue: 30, by_size: { S: { questions: 0, corrections: 0 }, M: { questions: 1, corrections: 0.5 }, L: { questions: 2, corrections: 1 }, XL: { questions: 3, corrections: 2 } } };
export function plannedAttention(task, settings = {}, risk) {
  const size = task.size || risk?.size || 'M';
  if (settings.attention_by_size?.[size]) return settings.attention_by_size[size];
  const a = { ...ATTENTION_DEFAULTS, ...(settings.attention ?? {}) };
  const k = ATTENTION_DEFAULTS.by_size[size] ?? ATTENTION_DEFAULTS.by_size.M;
  return Math.round(a.validation + k.questions * a.question + a.revue * (1 + k.corrections));
}

// Chiffres d'une itération : vélocité, reste, part des agents, charge de relecture humaine.
export function iterationStats(s, itId) {
  const weights = s.settings?.sizes ?? { S: 1, M: 2, L: 3, XL: 5 };
  const w = t => weights[t] ?? 0;
  const tasks = arr(s.tasks).filter(t => t.status !== 'abandonné' && t.iteration === itId);
  const done = tasks.filter(t => t.status === 'terminé');
  const agentDone = done.filter(t => t.assignee_type === 'agent');
  return {
    planned: tasks.reduce((n, t) => n + w(t.size), 0),
    velocity: done.reduce((n, t) => n + w(t.size), 0),
    overhang: tasks.filter(t => t.status !== 'terminé').reduce((n, t) => n + w(t.size), 0),
    agentVelocity: agentDone.reduce((n, t) => n + w(t.size), 0),
    reviewLoad: agentDone.reduce((n, t) => n + w(t.review_size ?? 'S'), 0),
    humanLoad: done.filter(t => t.assignee_type !== 'agent').reduce((n, t) => n + w(t.size), 0) + agentDone.reduce((n, t) => n + w(t.review_size ?? 'S'), 0),
    doneCount: done.length, taskCount: tasks.length,
  };
}

// Capacité suggérée : moyenne des trois dernières itérations revues.
export function capacitySuggestion(s) {
  const reviewed = arr(s.iterations).filter(i => i.status === 'terminé' && i.review?.team?.date).slice(-3);
  if (!reviewed.length) return null;
  const stats = reviewed.map(i => iterationStats(s, i.id));
  const avg = k => Math.round(stats.reduce((n, x) => n + x[k], 0) / stats.length * 10) / 10;
  return { basedOn: reviewed.map(i => i.id), velocity: avg('velocity'), humanLoad: avg('humanLoad'), agentVelocity: avg('agentVelocity'), reviewLoad: avg('reviewLoad') };
}

export function checkPlan(s, refs = {}) {
  const out = [];
  const live = x => x && x.status !== 'abandonné';
  const settings = s.settings ?? {};
  const release = settings.release;
  const prd = refs.prd ?? {}, sad = refs.sad ?? {};
  const frsAll = new Map(arr(prd.releases).flatMap(r => arr(r.functional_requirements).map(f => [f.id, { ...f, release: r.id }])));
  const mapTasks = new Set(arr(prd.story_map).flatMap(a => arr(a.tasks).map(t => t.id)));
  const known = id => frsAll.size === 0 || frsAll.has(id);
  const stories = arr(s.stories).filter(live), tasks = arr(s.tasks).filter(live), examples = arr(s.examples).filter(live);
  const storyIds = new Map(stories.map(x => [x.id, x])), taskIds = new Map(tasks.map(x => [x.id, x]));
  const sizeIdx = v => SIZE_ORDER.indexOf(v);
  const push = (x, kind, text) => checkText(kind, text, { waived: waivedOf(x) }).forEach(f => out.push({ ...f, id: x.id }));

  const tasksOf = id => tasks.filter(t => t.story === id);
  for (const st of stories) {
    if (!st.title) out.push({ rule: 'S62', id: st.id, message: 'story sans titre court' });
    if (st.lane === 'rapide') {
      if (!st.attach_to) out.push({ rule: 'S78', id: st.id, message: `story en voie rapide sans épopée (attach_to)${st.origin?.type === 'defaut' ? ' : la rattacher à l\'activité de l\'exigence que le défaut contredit' : ''}` });
      const why = [];
      if (['L', 'XL'].includes(st.size)) why.push(`taille ${st.size}`);
      if (arr(st.example_map?.rules).some(r => /^RG-/.test(r.ref ?? '') || (!r.ref && r.text))) why.push('touche une règle métier');
      if (tasksOf(st.id).some(t => arr(t.operations).length)) why.push('modifie un contrat d\'interface');
      if (tasksOf(st.id).some(t => arr(t.threats).length || t.kind === 'securite')) why.push('touche une mesure de sécurité');
      if (why.length) out.push({ rule: 'S60', id: st.id, message: `voie rapide non conforme : ${why.join(' ; ')} ; suivre le chemin normal` });
      continue;
    }
    if (!arr(st.frs).length) out.push({ rule: 'S37', id: st.id, message: 'story sans FR (une petite correction peut passer en voie rapide)' });
    for (const f of arr(st.frs)) if (!known(f)) out.push({ rule: 'S09', id: st.id, message: `FR ${f} absente du handoff du PRD` });
    if (!st.map_task) out.push({ rule: 'S38', id: st.id, message: 'story rattachée à aucune tâche de la story map' });
    else if (mapTasks.size && !mapTasks.has(st.map_task)) out.push({ rule: 'S09', id: st.id, message: `tâche de story map ${st.map_task} inexistante` });
    const rules = arr(st.example_map?.rules);
    if (st.example_map?.session?.date) {
      for (const r of rules) {
        if (!arr(r.examples).length) out.push({ rule: 'S41', id: st.id, message: `règle ${r.ref || r.text} sans exemple : on ne saura pas la tester` });
        if (!r.ref) out.push({ rule: 'S52', id: st.id, message: `règle « ${r.text} » sans référence amont : demande de changement au BRD ou au PRD` });
      }
    }
    if (rules.length > (settings.max_rules_per_story ?? 4)) out.push({ rule: 'S42', id: st.id, message: `${rules.length} règles : la story est probablement à scinder` });
    if (st.size === 'XL') out.push({ rule: 'S43', id: st.id, message: 'story XL : à découper' });
    for (const d of arr(st.depends_on)) if (!storyIds.has(d) && !taskIds.has(d)) out.push({ rule: 'S09', id: st.id, message: `dépendance ${d} inexistante` });
  }
  // Couverture des FR de la release
  if (release && frsAll.size) {
    const covered = new Set(stories.flatMap(x => arr(x.frs)));
    for (const [id, f] of frsAll) if (f.release === release && f.priority !== 'wont' && !covered.has(id)) out.push({ rule: 'S39', id, message: `FR de ${release} couverte par aucune story` });
  }
  for (const ex of examples) {
    const missing = ['given', 'when', 'then'].filter(k => !ex[k]);
    if (missing.length) out.push({ rule: 'S50', id: ex.id, message: `exemple incomplet : ${missing.join(', ')} manquant(s)` });
    push(ex, 'AC', [ex.given, ex.when, ex.then].filter(Boolean).join(' '));
  }
  // Tâches
  const agentMax = sizeIdx(settings.agent_max_size ?? 'M');
  const openAdrs = new Set(arr(sad.decisions).filter(a => a.status === 'proposé').map(a => a.id));
  for (const t of tasks) {
    if (t.kind === 'spike') { if (!t.spike_of) out.push({ rule: 'S44', id: t.id, message: 'spike sans hypothèse de la conception (spike_of)' }); }
    else if (!t.story) out.push({ rule: 'S44', id: t.id, message: 'tâche sans story' });
    else if (!storyIds.has(t.story)) out.push({ rule: 'S09', id: t.id, message: `story ${t.story} inexistante` });
    if (t.size === 'XL') out.push({ rule: 'S43', id: t.id, message: 'tâche XL : trop grosse pour une PR, à découper' });
    for (const d of arr(t.depends_on)) if (!taskIds.has(d)) out.push({ rule: 'S09', id: t.id, message: `dépendance ${d} inexistante` });
    if (t.assignee_type === 'agent') {
      const why = [];
      if (sizeIdx(t.size) > agentMax) why.push(`taille ${t.size} au-delà de ${settings.agent_max_size ?? 'M'}`);
      if (t.kind === 'spike') why.push('un spike demande du jugement');
      const st = storyIds.get(t.story);
      if (st && !storyReadiness(s, st, refs).ready) why.push('story non prête');
      if (t.kind !== 'spike' && !arr(t.elements).length) why.push('aucun élément cité');
      if (arr(t.adrs).some(a => openAdrs.has(a))) why.push('ADR encore proposé');
      if (why.length) out.push({ rule: 'S45', id: t.id, message: `affectée à un agent alors que : ${why.join(' ; ')}` });
    }
  }
  for (const c of taskCycles(tasks)) out.push({ rule: 'S46', id: c[0], message: `dépendances circulaires : ${c.join(' → ')}` });
  // Ordre et capacité
  const itIndex = new Map(arr(s.iterations).map((it, i) => [it.id, i]));
  for (const t of tasks) {
    for (const d of arr(t.depends_on)) {
      const dep = taskIds.get(d);
      if (!dep) continue;
      if (settings.cadence === 'flux') {
        if (Number.isFinite(t.order) && Number.isFinite(dep.order) && t.order > 0 && dep.order > t.order && dep.status !== 'terminé') out.push({ rule: 'S47', id: t.id, message: `passe avant ${d} dont elle dépend dans la file` });
      } else if (t.iteration && dep.status !== 'terminé') {
        if (!dep.iteration) out.push({ rule: 'S47', id: t.id, message: `planifiée alors que ${d}, dont elle dépend, n'est dans aucune itération` });
        else if (itIndex.get(dep.iteration) > itIndex.get(t.iteration)) out.push({ rule: 'S47', id: t.id, message: `planifiée avant ${d}, dont elle dépend` });
      }
    }
    const st = storyIds.get(t.story);
    if ((t.iteration || (settings.cadence === 'flux' && t.order > 0)) && st && !storyReadiness(s, st, refs).ready) out.push({ rule: 'S40', id: t.id, message: `planifiée alors que sa story ${st.id} n'est pas prête` });
  }
  // Collisions (S72, reprise du contrôle de BMAD-METHOD) : deux tâches ouvertes sans chemin de dépendance entre elles
  // qui touchent le même élément C4 ou la même opération de contrat risquent de se marcher dessus.
  const open = tasks.filter(t => !['terminé', 'abandonné'].includes(t.status) && t.kind !== 'spike');
  const reach = new Map();
  const reachable = id => {
    if (reach.has(id)) return reach.get(id);
    const seen = new Set(); const stack = [...arr(tasks.find(t => t.id === id)?.depends_on)];
    while (stack.length) { const x = stack.pop(); if (seen.has(x)) continue; seen.add(x); stack.push(...arr(tasks.find(t => t.id === x)?.depends_on)); }
    reach.set(id, seen); return seen;
  };
  const sameWindow = (a, b) => settings.cadence === 'flux' || !a.iteration || !b.iteration || a.iteration === b.iteration;
  for (let i = 0; i < open.length; i++) for (let j = i + 1; j < open.length; j++) {
    const a = open[i], b = open[j];
    if (!sameWindow(a, b) || reachable(a.id).has(b.id) || reachable(b.id).has(a.id)) continue;
    const shared = [...arr(a.elements).filter(e => arr(b.elements).includes(e)), ...arr(a.operations).filter(o => arr(b.operations).includes(o))];
    if (shared.length) out.push({ rule: 'S72', id: `${a.id},${b.id}`, message: `collision possible : ${a.id} et ${b.id} touchent ${shared.join(', ')} sans dépendance entre elles ; les ordonner (depends_on) ou les fusionner` });
  }
  // Taille de l'équipe et taille de risque calculée (S74) ; attention humaine prévue et capacité (S75).
  for (const t of tasks.filter(x => !['terminé', 'abandonné'].includes(x.status) && x.size)) {
    const r = riskSize(t, s, refs);
    if (Math.abs(SIZE_ORDER.indexOf(t.size) - SIZE_ORDER.indexOf(r.size)) >= 2) out.push({ rule: 'S74', id: t.id, message: `taille ${t.size} retenue, taille de risque calculée ${r.size} (${r.factors.map(([n, v]) => `${n} ${v}`).join(', ') || 'aucun facteur'}) : écart à justifier` });
  }
  if (settings.attention_capacity) for (const it of arr(s.iterations).filter(i => !['terminé'].includes(i.status))) {
    const load = tasks.filter(t => t.iteration === it.id && t.status !== 'abandonné').reduce((n, t) => n + plannedAttention(t, settings, riskSize(t, s, refs)), 0);
    if (load > settings.attention_capacity) out.push({ rule: 'S75', id: it.id, message: `attention humaine prévue ${load} min pour ${settings.attention_capacity} min disponibles : la relecture limitera le débit, pas les agents` });
  }
  // Stratégie ouverture / milieu / fin (S61)
  const storyById = new Map(stories.map(x => [x.id, x]));
  const itIdx = id => (id && itIndex.has(id) ? itIndex.get(id) : Infinity);
  for (const st of stories.filter(x => ['milieu', 'fin'].includes(x.game))) {
    const first = Math.min(...tasksOf(st.id).map(t => itIdx(t.iteration)));
    if (!Number.isFinite(first)) continue;
    const pending = stories.filter(o => o.game === 'ouverture' && o.release === st.release && o.status !== 'terminé'
      && tasksOf(o.id).some(t => t.status !== 'terminé' && itIdx(t.iteration) > first));
    if (pending.length) out.push({ rule: 'S61', id: st.id, message: `story de ${st.game} de partie planifiée avant des stories d'ouverture encore ouvertes (${pending.map(o => o.id).join(', ')})` });
  }
  void storyById;
  const weights = settings.sizes ?? { S: 1, M: 2, L: 3, XL: 5 };
  // Revues et releases (S58, S59)
  const todayStr = new Date().toISOString().slice(0, 10);
  arr(s.iterations).forEach((it, i, all) => {
    const ended = it.status === 'terminé' || (it.end && String(it.end).slice(0, 10) < todayStr);
    if (ended && !it.review?.team?.date) out.push({ rule: 'S58', id: it.id, message: `itération ${it.status === 'terminé' ? 'terminée' : 'dont la date de fin est passée'} sans sprint review (/tizi-sprint-review)` });
    if (!it.review?.team?.date) return;
    const decided = new Set(arr(it.review.carryover).map(c => c.task));
    const open = tasks.filter(t => t.iteration === it.id && !['terminé', 'abandonné'].includes(t.status) && !decided.has(t.id));
    if (open.length) out.push({ rule: 'S76', id: it.id, message: `sprint review faite, mais aucune décision (continuer, découper, reporter) pour : ${open.map(t => t.id).join(', ')}` });
    const prevTry = arr(all[i - 1]?.review?.team?.process?.try);
    if (prevTry.length && !arr(it.review.actions_followup).length) out.push({ rule: 'S77', id: it.id, message: `actions essayées au sprint précédent sans suivi : ${prevTry.join(' ; ')}` });
  });
  for (const r of arr(s.release_tracking)) {
    if (r.status === 'livrée' && !arr(r.measurement).length) out.push({ rule: 'S59', id: r.release, message: 'release livrée sans plan de mesure des outcomes' });
    if (r.status === 'livrée' && r.outcome === 'a_mesurer' && !arr(r.observations).length) out.push({ rule: 'S59', id: r.release, message: 'release livrée sans observation des utilisateurs ni conclusion sur l\'outcome' });
  }
  if (settings.cadence !== 'flux') {
    for (const it of arr(s.iterations)) {
      const cap = it.capacity || settings.sprint?.capacity || 0;
      const load = tasks.filter(t => t.iteration === it.id).reduce((n, t) => n + (weights[t.size] ?? 0), 0);
      if (!cap) out.push({ rule: 'S48', id: it.id, message: 'itération sans capacité définie' });
      else if (load > cap) out.push({ rule: 'S48', id: it.id, message: `charge ${load} au-delà de la capacité ${cap}` });
    }
  } else {
    const wip = settings.flow?.wip_limit || 0;
    const inProgress = tasks.filter(t => t.status === 'en_cours').length;
    if (!wip) out.push({ rule: 'S49', id: 'settings.flow', message: 'limite d\'encours non définie' });
    else if (inProgress > wip) out.push({ rule: 'S49', id: 'settings.flow', message: `${inProgress} tâches en cours pour une limite de ${wip}` });
  }
  // Mesures de sécurité et vérifications de la conception
  const planned = new Set(tasks.flatMap(t => [...arr(t.threats), ...arr(t.verifications)]));
  for (const m of arr(sad.security_measures)) if (!planned.has(m.threat)) out.push({ rule: 'S51', id: m.threat, message: 'mesure de sécurité de la conception planifiée dans aucune tâche' });
  for (const v of arr(sad.verifications).filter(v => v.stage === 'tests')) if (!planned.has(v.id)) out.push({ rule: 'S51', id: v.id, message: 'vérification de NFR prévue en tests, planifiée dans aucune tâche' });
  for (const sp of arr(sad.spikes)) if (!tasks.some(t => t.spike_of === sp.id)) out.push({ rule: 'S51', id: sp.id, message: 'spike de la conception sans tâche' });
  for (const b of arr(prd.preserved_behaviors).filter(b => !b.test || b.test === 'à écrire')) {
    if (!tasks.some(t => arr(t.preserves).includes(b.id))) out.push({ rule: 'S51', id: b.id, message: 'comportement existant à préserver sans test et sans tâche qui le protège (preserves)' });
  }
  for (const tr of arr(prd.transition_requirements).filter(t => !release || !t.release || t.release === release)) {
    if (!tasks.some(t => arr(t.transition).includes(tr.id))) out.push({ rule: 'S51', id: tr.id, message: `exigence de transition (${tr.kind ?? '?'}) planifiée dans aucune tâche` });
  }
  return out;
}

// ── Couverture ───────────────────────────────────────────────────────────────
// Chaque métrique : identifiant stable, libellé, éléments couverts / total, seuil (en %).
// Seuils par défaut ci-dessous ; un projet les règle dans `coverage_thresholds` de l'état.
// Un seuil non atteint se justifie par une dérogation dans `coverage_waivers` : { metric, reason, approved_by }.
export const COVERAGE_DEFAULTS = {
  brd: { br_objective: 100, br_acceptance: 100, objective_br: 100 },
  prd: { fr_ac: 100, fr_goal: 100, br_covered: 100, must_error: 100 },
  sad: { fr_allocated: 100, nfr_response: 100, driver_served: 100 },
  plan: { release_fr_story: 100, security_planned: 100, verification_planned: 100, stories_ready: 0 },
};
const metric = (id, label, items, ok) => ({ id, label, total: items.length, covered: items.filter(ok).length, missing: items.filter(x => !ok(x)).map(x => x.id) });

export function coverage(s, refs = {}) {
  const doc = ['prd', 'sad', 'plan'].includes(s.document) ? s.document : 'brd';
  const valid = x => ['validé', 'accepté'].includes(x?.status);
  let list = [];
  if (doc === 'brd') {
    const brs = arr(s.business_requirements).filter(valid), objs = arr(s.objectives).filter(valid);
    list = [
      metric('br_objective', 'Exigences métier rattachées à un objectif', brs, b => arr(b.objectives).length > 0),
      metric('br_acceptance', 'Exigences métier avec critère d\'acceptation', brs, b => arr(b.acceptance).length > 0),
      metric('objective_br', 'Objectifs servis par au moins une exigence', objs, o => brs.some(b => arr(b.objectives).includes(o.id))),
    ];
  } else if (doc === 'prd') {
    const frs = arr(s.functional_requirements).filter(valid), acs = arr(s.acceptance_criteria).filter(x => x.status !== 'abandonné');
    const nfrs = arr(s.nfrs).filter(valid);
    list = [
      metric('fr_ac', 'FR avec au moins un critère d\'acceptation', frs, f => acs.some(a => a.fr === f.id)),
      metric('fr_goal', 'FR rattachées à un objectif produit', frs, f => arr(f.goals).length > 0),
      metric('must_error', 'FR Must avec un scénario d\'erreur', frs.filter(f => f.priority === 'must'), f => acs.some(a => a.fr === f.id && a.kind === 'erreur')),
    ];
    if (s.mode === 'chaîné') list.push(metric('br_covered', 'Exigences du BRD couvertes par une FR ou une NFR', arr(s.brd_ref?.requirements).filter(b => b.priority !== 'wont'),
      b => frs.some(f => arr(f.brd_requirements).includes(b.id)) || nfrs.some(n => arr(n.brd_requirements).includes(b.id))));
  } else if (doc === 'sad') {
    const live = x => x && !['abandonné', 'rejeté', 'remplacé', 'déprécié'].includes(x.status);
    const els = arr(s.elements).filter(live), nrs = arr(s.nfr_responses).filter(live), adrs = arr(s.decisions).filter(a => a.status === 'accepté');
    list = [
      metric('fr_allocated', 'FR allouées à un conteneur ou composant', arr(s.prd_ref?.functional_requirements).filter(f => f.priority !== 'wont'), f => els.some(e => arr(e.frs).includes(f.id))),
      metric('nfr_response', 'NFR avec une réponse de conception', arr(s.prd_ref?.nfrs), n => nrs.some(r => r.nfr === n.id)),
      metric('driver_served', 'Moteurs servis par un ADR accepté ou une réponse', arr(s.drivers).filter(valid), d => adrs.some(a => arr(a.drivers).includes(d.id)) || nrs.some(r => arr(r.drivers).includes(d.id))),
    ];
  } else {
    const live = x => x && x.status !== 'abandonné';
    const stories = arr(s.stories).filter(live), tasks = arr(s.tasks).filter(live);
    const prd = refs.prd ?? {}, sad = refs.sad ?? {};
    const rel = s.settings?.release;
    const frs = arr(prd.releases).filter(r => !rel || r.id === rel).flatMap(r => arr(r.functional_requirements)).filter(f => f.priority !== 'wont');
    const planned = new Set(tasks.flatMap(t => [...arr(t.threats), ...arr(t.verifications)]));
    list = [
      metric('release_fr_story', 'FR de la release couvertes par une story', frs, f => stories.some(x => arr(x.frs).includes(f.id))),
      metric('security_planned', 'Mesures de sécurité planifiées', arr(sad.security_measures).map(m => ({ ...m, id: m.threat })), m => planned.has(m.id)),
      metric('verification_planned', 'Vérifications de NFR (étape tests) planifiées', arr(sad.verifications).filter(v => v.stage === 'tests'), v => planned.has(v.id)),
      metric('stories_ready', 'Stories prêtes', stories, x => storyReadiness(s, x, refs).ready),
    ];
  }
  const thresholds = { ...COVERAGE_DEFAULTS[doc], ...(s.coverage_thresholds ?? {}) };
  const waivers = arr(s.coverage_waivers);
  return list.map(m => {
    const pct = m.total ? Math.round((m.covered / m.total) * 1000) / 10 : 100;
    const threshold = thresholds[m.id] ?? 100;
    const waiver = waivers.find(w => w.metric === m.id);
    return { ...m, pct, threshold, met: pct >= threshold, waiver: waiver ?? null };
  });
}

export function coverageFindings(s, refs = {}) {
  return coverage(s, refs).filter(m => !m.met && !m.waiver)
    .map(m => ({ rule: 'S54', id: `couverture:${m.id}`, message: `${m.label} : ${m.pct} % pour un seuil de ${m.threshold} % (manquent : ${m.missing.slice(0, 8).join(', ')}${m.missing.length > 8 ? '…' : ''}) ; corriger ou déclarer une dérogation dans coverage_waivers` }));
}

// ── Espaces réservés et chiffres non sourcés (emprunt aux règles de cohérence des ADR de hve-core) ──
// S68 : un texte d'élément vivant contient un espace réservé (TODO, TBD, XXX, ???, {{…}}, « à compléter »).
const PLACEHOLDER_RE = /\bTODO\b|\bTBD\b|\bFIXME\b|\bXXX\b|\?\?\?|\{\{[^}]*\}\}|à compléter|à définir plus tard|lorem ipsum/i;
const SKIP_KEYS = new Set(['status', 'lint_waivers', 'decision', 'automation', 'kind', 'type', 'subtype', 'severity', 'lifecycle', 'cadence', 'phase']);
export function placeholderFindings(s) {
  const out = [];
  const visit = (v, owner, path) => {
    if (typeof v === 'string') { if (PLACEHOLDER_RE.test(v)) out.push({ rule: 'S68', id: owner, message: `espace réservé resté dans ${path} : « ${v.match(PLACEHOLDER_RE)[0]} »` }); return; }
    if (Array.isArray(v)) { v.forEach((x, i) => visit(x, x?.id ?? owner, `${path}[${i}]`)); return; }
    if (v && typeof v === 'object') {
      if (['abandonné', 'rejeté', 'remplacé'].includes(v.status)) return;
      for (const [k, x] of Object.entries(v)) if (!SKIP_KEYS.has(k)) visit(x, v.id ?? owner, path ? `${path}.${k}` : k);
    }
  };
  for (const [k, v] of Object.entries(s)) if (!['governance', 'session', 'questions', 'council_runs', 'refs', 'settings'].includes(k)) visit(v, k, k);
  return out;
}
// S69 : un chiffre précis dans un énoncé dont l'élément n'a aucune source. Généraliser, ou citer la source qui le fixe.
const NUMBER_RE = /(?<![A-Z]{1,4}-)\b\d+(?:[.,]\d+)?\s*(?:%|ms|s\b|min|h\b|heures?|jours?|semaines?|mois|ans?|€|k€|utilisateurs?|dossiers?)?/i;
export function unsourcedNumberFindings(s) {
  const out = [];
  const hit = (id, text, where) => { const m = String(text ?? '').match(NUMBER_RE); if (m && /\d/.test(m[0])) out.push({ rule: 'S69', id, message: `chiffre « ${m[0].trim()} » dans ${where} sans source qui le fixe : généraliser, ou citer la source` }); };
  if (s.document === 'brd' || !s.document) {
    for (const b of arr(s.business_requirements).filter(x => x.status !== 'abandonné')) if (!brSources(s, b).length) { hit(b.id, b.statement, 'l\'énoncé'); arr(b.acceptance).forEach(a => hit(b.id, a, 'un critère')); }
    for (const r of arr(s.business_rules).filter(x => x.status !== 'abandonné')) if (!arr(r.sources).length) hit(r.id, r.statement, 'la règle');
    for (const o of arr(s.objectives).filter(x => x.status !== 'abandonné')) if (o.baseline && !o.baseline_source && !arr(o.sources).length) hit(o.id, o.baseline, 'la valeur actuelle');
  }
  if (s.document === 'prd') {
    for (const f of arr(s.functional_requirements).filter(x => x.status !== 'abandonné')) if (!arr(f.brd_requirements).length && !f.origin) hit(f.id, f.statement, 'l\'énoncé');
  }
  return out;
}

// ── Constitution du produit (S79) : chaque initiative dit quels principes la concernent ; la conception est
// confrontée aux principes avant la gouvernance ; un conflit se résout par dérogation ou amendement.
export function constitutionFindings(s, c) {
  const out = [];
  const active = arr(c?.principles).filter(p => p.status === 'actif');
  if (!active.length) return out;
  const known = new Set(arr(c.principles).map(p => p.id));
  for (const id of arr(s.principles_applicable)) if (!known.has(id)) out.push({ rule: 'S79', id, message: 'principe inconnu de la constitution' });
  if (['brd', 'prd'].includes(s.document) && ['define', 'govern', 'specify'].includes(s.phase) && s.principles_applicable === undefined) out.push({ rule: 'S79', id: 'principles_applicable', message: `la constitution compte ${active.length} principe(s) actif(s) : dire lesquels s'appliquent à cette initiative (liste vide si aucun)` });
  if (s.document === 'sad') {
    const chk = s.constitution_check ?? {};
    if (['govern'].includes(s.phase) && !chk.after?.date) out.push({ rule: 'S79', id: 'constitution_check', message: 'conception en gouvernance sans vérification de la constitution après conception' });
    const waived = new Set(arr(c.waivers).map(w => `${w.principle}|${w.element}`));
    for (const k of arr(chk.conflicts)) {
      if (!known.has(k.principle)) out.push({ rule: 'S79', id: k.principle, message: 'conflit avec un principe inconnu' });
      else if (!['amendement', 'dérogation', 'derogation', 'corrigé'].includes(k.resolution) || (/rogation/.test(k.resolution ?? '') && !waived.has(`${k.principle}|${k.element}`))) out.push({ rule: 'S79', id: k.element ?? k.principle, message: `conflit avec ${k.principle} sans résolution : corriger la conception, ou dérogation enregistrée (constitution.mjs --deroger), ou amendement` });
    }
  }
  return out;
}
// ── Listes de contrôle de relecture (S80) : cochées par un relecteur nommé, jamais par l'agent ; complètes avant la
// gouvernance du document.
export function checklistFindings(s, lists = []) {
  const out = [];
  for (const { file, text } of lists) {
    const items = [...text.matchAll(/^- \[( |x|X|~)\] (CL-[A-Z]+-\d+)(.*)$/gm)];
    for (const [, mark, id, rest] of items) {
      if (/x/i.test(mark) && !/—\s*\S/.test(rest.split('?').pop() ?? '')) out.push({ rule: 'S80', id, message: `${file} : coché sans relecteur nommé (« — <nom> » en fin de ligne) ; l'agent ne coche jamais` });
      if (mark === '~' && !/—\s*\S+.*:\s*\S/.test(rest)) out.push({ rule: 'S80', id, message: `${file} : écarté sans relecteur ni raison (« — <nom> : raison »)` });
    }
    const open = items.filter(([, m]) => m === ' ').length;
    if (open && s.phase === 'govern') out.push({ rule: 'S80', id: file, message: `${open} point(s) de relecture non traité(s) avant la gouvernance` });
  }
  return out;
}

export function checkState(s, ctx = {}) {
  const refs = ctx.refs ?? {};
  const base = s.document === 'plan' ? checkPlan(s, refs) : s.document === 'sad' ? checkSad(s) : s.document === 'prd' ? checkPrd(s) : checkBrd(s);
  return [...base, ...placeholderFindings(s), ...unsourcedNumberFindings(s), ...constitutionFindings(s, ctx.constitution), ...checklistFindings(s, ctx.checklists), ...coverageFindings(s, refs)];
}

// Libellés des règles de structure, pour les rapports.
export const STRUCT_RULES = {
  S01: 'objectif non mesurable', S02: 'exigence sans objectif', S03: 'exigence sans besoin sourcé', S04: 'exigence sans critère d\'acceptation',
  S05: 'priorité ou release manquante', S06: 'exigence sans origine', S07: 'Must sans scénario d\'erreur', S08: 'NFR incomplète',
  S09: 'référence inexistante', S10: 'référence vers un élément abandonné', S11: 'règle métier sans source', S12: 'règle sans niveau d\'application',
  S13: 'règle sans responsable', S14: 'contradiction non qualifiée', S15: 'conflit d\'intérêts sans arbitre', S16: 'arbitre partie au conflit',
  S17: 'décision sans décideur', S18: 'décision sans alternative', S19: 'opposant puissant sans risque', S20: 'règle automatisée non couverte',
  S21: 'moteur sans origine', S22: 'scénario sans mesure', S23: 'ADR à option unique', S24: 'ADR sans moteur', S25: 'ADR sans conséquence négative ou confirmation',
  S26: 'FR non allouée', S27: 'NFR sans réponse ou vérification', S28: 'existant sans preuve', S29: 'opération sans FR', S30: 'donnée incomplète',
  S31: 'donnée sensible sans menace I', S32: 'menace non traitée', S33: 'nom d\'élément dupliqué', S34: 'parent C4 incohérent', S35: 'règle sans agrégat',
  S36: 'remplacé sans remplaçant',
  S37: 'story sans FR', S38: 'story hors story map', S39: 'FR de la release sans story', S40: 'tâche planifiée, story non prête',
  S41: 'règle sans exemple', S42: 'story à scinder', S43: 'taille XL', S44: 'tâche sans story ou spike sans hypothèse',
  S45: 'affectation agent non conforme', S46: 'dépendances circulaires', S47: 'tâche avant sa dépendance', S48: 'capacité d\'itération',
  S49: 'limite d\'encours', S50: 'exemple incomplet', S51: 'mesure, vérification ou spike non planifié', S52: 'règle sans référence amont',
  S53: 'handoff amont altéré', S54: 'seuil de couverture non atteint', S55: 'mesure de sécurité sans contrôle de référence',
  S56: 'opportunité non décidée', S57: 'hypothèse risquée non testée', S58: 'itération sans revue', S59: 'release sans mesure des outcomes',
  S60: 'voie rapide non conforme', S61: 'ordre ouverture, milieu, fin', S62: 'story sans titre court',
  S63: 'exigence à source unique', S64: 'exigence sans source', S65: 'porte de synthèse', S66: 'exigence de transition incomplète', S67: 'exploration de concepts',
  S68: 'espace réservé resté', S69: 'chiffre sans source', S70: 'fiche de contexte trop longue', S71: 'ADR sans règle', S72: 'collision entre tâches', S73: 'comportement existant à préserver', S74: 'taille et risque calculé', S75: 'attention humaine dépassée', S76: 'tâche non finie sans décision', S77: 'action de rétrospective sans suivi', S78: 'voie rapide sans épopée', S79: 'constitution', S80: 'liste de contrôle de relecture', S81: 'source sans personne entendue', S82: 'métrique et objectif désaccordés', S83: 'aucun utilisateur direct entendu', S84: 'exigence jamais relue par la source', S85: 'motif EARS absent ou désaccordé',
};
