// Catalogue unique des règles de vérification, commun aux skills brd-builder et prd-builder.
//
// Phase 1 (construction) : ces règles sont exécutées par lint.mjs et les scripts de rendu
// en mode AVERTISSEMENT. Elles ne bloquent rien : elles informent l'auteur au moment où il écrit.
// Phase 2 (contrôle formel, à construire) : le même catalogue sera exécuté en mode bloquant,
// complété de règles qui demandent du jugement. Une règle n'est définie qu'ici, jamais ailleurs.
//
// Sources : Constantinidis (check-list de bonne formulation, ch. 13) ; BABOK v3 (7.2 Verify Requirements).
import { arr, PHASE_NOM, portesFranchies, JOUR, passagesPosee, foisPosee, seuilRepetitions, ecrit, effectifDe, entendusDe } from './common.mjs';
import { porteDe, seuilsDe, derogationDe, derogationsDe, cleDerogation, verdictSeuil, INDICATIF } from './gates.mjs';

// ── Règles de rédaction (portent sur un énoncé) ─────────────────────────────

const words = list => new RegExp(`(^|[^\\p{L}])(${list.join('|')})(?=$|[^\\p{L}])`, 'iu');

// ── Le vocabulaire d'une solution prescrite ─────────────────────────────────
// « Le gâchis d'innovation survient souvent quand **une solution prescrite est fournie avec un élément
// de backlog** » (Rubin, *Essential Scrum*, glossaire). C'est le `N` d'INVEST — négociable —, noté
// « non mesurable sur un état » dans ce dépôt. Il ne l'est pas sur un état ; il l'est sur le TEXTE, et
// `L07` le faisait déjà pour les stories : « décrit l'implémentation : reformuler en comportement
// observable ». La grille était donc aux trois quarts écrite.
//
// Le trou était une DIVERGENCE. `L06` (exigence métier, objectif) et `L07` (exigence fonctionnelle,
// critère, story) disent la même chose à deux niveaux — remonter au besoin d'un côté, reformuler en
// comportement de l'autre — et portaient deux listes de mots séparées, qui avaient divergé de douze
// motifs. Les sept qui comptent manquaient du côté des stories, et ce sont précisément ceux par
// lesquels une solution prescrite arrive : `Excel`, `dashboard`, `tableau de bord`, `logiciel`,
// `progiciel`, `appli mobile`, `formulaire web`. « Un tableau de bord Excel pour le superviseur » dans
// une story passait sans un mot, quand les mêmes mots dans une exigence métier étaient relevés.
//
// UNE liste, donc, et deux messages — chaque niveau garde le sien. Un test compare les deux vocabulaires
// et refuse qu'ils se séparent de nouveau. Mesuré avant de les réunir : sur les quatre documents du
// dépôt, le vocabulaire unifié rend EXACTEMENT les deux mêmes constats qu'avant, `écran` dans BR-001 et
// `base de données` dans FR-001. Aucun document ne bouge.
const SOLUTIONS_PRESCRITES = [
  // Interface : ni le besoin métier ni le comportement observable ne se décrivent par des écrans.
  'écrans?', 'boutons?', 'pages?', 'menus?', 'fenêtres?', 'pop-?ups?', 'onglets?', 'listes? déroulantes?',
  'cases? à cocher', 'champs? de saisie', 'formulaires? web', 'cliqu\\p{L}*', 'clics?',
  // Outils et progiciels : la manière dont une solution prescrite arrive le plus souvent.
  'appli(?:cation)?s? (?:mobile|web)', 'appli', 'logiciel', 'progiciel', 'tableau de bord', 'dashboard', 'Excel',
  // Technique : le choix relève de la conception.
  'base de données', 'tables?', 'API', 'endpoints?', 'serveurs?', 'microservices?', 'composants?',
  'requêtes? SQL', 'JSON', 'REST', 'cache', 'file de messages', 'framework',
  // Produits et langages : un choix de conception, jamais un besoin.
  'PostgreSQL', 'MySQL', 'MongoDB', 'Oracle', 'Redis', 'Kafka', 'RabbitMQ', 'Elasticsearch',
  'React', 'Swift', 'Node(?:\\.js)?', 'Kotlin', 'Java', 'Python', 'Next(?:\\.js)?', 'GraphQL',
];

export const TEXT_RULES = [
  {
    id: 'L01', name: 'terme_vague',
    message: t => `terme non mesurable « ${t} » : remplacer par un comportement observable ou une valeur cible`,
    re: words(['rapide(?:s|ment)?', 'lente?s?', 'facile(?:s|ment)?', 'simple(?:s|ment)?', 'intuiti(?:f|ve|fs|ves|vement)', 'convivial(?:e|es|s)?',
      'ergonomique(?:s|ment)?', 'performant(?:e|es|s)?', 'efficace(?:s|ment)?', 'optimal(?:e|es|ement)?', 'optimaux', 'robuste(?:s)?', 'flexible(?:s)?',
      'moderne(?:s)?', 'adapté(?:e|es|s)?', 'approprié(?:e|es|s)?', 'suffisant(?:e|es|s)?', 'raisonnable(?:s|ment)?', 'user[- ]friendly',
      'si possible', 'si nécessaire', 'le cas échéant', 'notamment', 'etc\\.?', 'et/ou', 'au mieux', 'dans la mesure du possible']),
    applies: ['BR', 'AC', 'FR', 'NFR', 'RG', 'OBJ', 'GOAL', 'AD', 'US'],
  },
  {
    id: 'L02', name: 'points_de_suspension',
    message: () => 'points de suspension : l\'énumération est incomplète, la rendre exhaustive ou la décrire en intention',
    re: /(\.\.\.|…)/u,
    applies: ['BR', 'AC', 'FR', 'NFR', 'RG', 'US'],
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
    re: words(SOLUTIONS_PRESCRITES),
    applies: ['BR', 'OBJ'],
  },
  {
    id: 'L07', name: 'implementation_dans_le_prd',
    message: t => `« ${t.trim()} » décrit l'implémentation : reformuler en comportement observable (le choix relève de la conception)`,
    re: words(SOLUTIONS_PRESCRITES),
    applies: ['FR', 'AC', 'US'],
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
// `sollicitée` en fait partie, et ce n'est pas un détail : elle dit qu'on a écrit, pas qu'on a reçu.
// Tant qu'elle n'a pas répondu, une décision rendue en son nom reste rapportée par un tiers (S90) et
// une source à son nom reste du second degré (S81). Ce qui change avec la sollicitation, c'est le
// REPROCHE de son silence, pas le fait qu'elle se taise.
const NON_ENTENDU = ['à interroger', 'sollicitée', 'non disponible'];
// Les types de source où quelqu'un a été INTERROGÉ ou REGARDÉ, et eux seuls. La liste était d'abord
// écrite en négatif — tout sauf `cadrage` — et comptait donc comme « entendu » un document, un ticket,
// un handoff, et `autre`, que `phase-define.md` prescrivait justement pour une décision de
// l'utilisateur : une exigence introduite par l'utilisateur suffisait à éteindre `S83`. En positif, un
// type nouveau ou inattendu ne vaut plus une voix recueillie par défaut.
// Rappel du défaut d'origine : `cadrage` est l'échange qui OUVRE l'initiative, déclaratif. Sur le
// premier dossier réel les DIX sources étaient de ce type, et `S83` restait verte parce qu'un parent
// avait parlé au premier échange — le parent demandeur, et développeur.
const RECUEIL_AUPRES_DE = ['entretien', 'observation', 'atelier', 'test', 'échange écrit'];
// Les échanges où des gens sont dans la même pièce — les seuls où `present` veut dire quelque chose.
// Une mesure, une étude ou une décision de l'utilisateur n'ont pas de salle. Un `échange écrit` non
// plus : on y est interrogé sans y être présent, et un tour de table n'y aurait pas de sens. La liste
// dérivait de RECUEIL_AUPRES_DE ; elle s'écrit en clair parce que les deux ne coïncident plus.
const EN_PRESENCE = ['cadrage', 'entretien', 'observation', 'atelier', 'test'];
// Les deux naissances d'initiative observées. `autre:<libellé>` reste ouvert : voir S86.
const PROVENANCE = ['decoupage', 'sortie_perimetre'];
// Un retour à la source fait : la personne a relu la synthèse, et l'a confirmée ou corrigée.
const FEEDBACK_FAIT = ['confirmé', 'corrigé', 'sans objet'];
// `envoyé` et `à envoyer` tombaient dans le même sac : S84 ne testait que l'appartenance à la liste
// ci-dessus, donc « demandé le 21, pas encore de réponse » et « jamais rien demandé à personne »
// rendaient le même constat, avec le même message — jamais vérifié. L'état `envoyé` vivait dans le
// gabarit depuis le début et aucune règle ne le lisait : il ne servait à rien. Une demande partie est
// une question qui vit, pas un trou. Mais une demande qu'on DIT partie sans dire quand ne se vérifie
// pas, et c'est l'agent qui écrit le champ : d'où trois états, et le troisième tient à la date.
// `s` est optionnel et c'est volontaire : sans lui, l'attente ne se périme pas, et tous les appelants du
// dépôt le passent. La raison de la périmer est celle du jumeau `sollicitationEtat` — une demande de
// relecture partie il y a six semaines ne vit plus, elle est oubliée, et la faire passer pour vivante
// est le mensonge que les trois états existaient pour éviter. Les deux seuils sont les mêmes :
// `relance: { signaler, agir }`.
//
// Ce que la mesure prouve, et ce qu'elle ne prouve pas. Le seul dossier réel disponible porte
// 84 sources dont ZÉRO en `envoyé` — 74 `à envoyer`, 10 `sans objet` — donc la péremption n'y produit
// aucun constat. Le « 93 sources passées à envoyé+date » du commit qui a créé ces trois états venait du
// DEUXIÈME dossier réel, qui n'est plus là : je n'ai pas pu mesurer sur lui. L'absence d'impact est donc
// établie sur un dossier où le champ n'est pas utilisé, pas sur un dossier qui s'en sert.
export const feedbackEtat = (src, s) => {
  if (FEEDBACK_FAIT.includes(src?.feedback)) return 'fait';
  if (src?.feedback !== 'envoyé') return 'absent';
  const le = String(src?.feedback_le ?? '').trim();
  if (!JOUR.test(le)) return 'absent';
  return !s || joursDepuis(le) <= seuilsRelance(s).agir ? 'attente' : 'absent';
};
// Exactement symétrique de `feedbackEtat`, et pour la même raison. Tant qu'il n'y avait que
// `à interroger | interrogée | non disponible`, « je lui ai écrit le 21, elle n'a pas encore
// répondu » n'avait aucun endroit où se dire : il fallait la laisser `à interroger`, c'est-à-dire
// rendre le même constat que si personne ne l'avait jamais contactée. Écrire à quelqu'un coûtait
// donc autant que ne pas lui écrire, et l'autonomie n'avait pas de sens. Trois états, et le
// troisième tient à la date — c'est l'agent qui écrit le champ, et une sollicitation qu'on DIT
// partie sans dire quand ne se vérifie pas : « sollicitée » invérifiable est une case cochée.
// `sollicitee_le` suffisait tant que l'échange tenait en un tour : sur quelqu'un de jamais entendu, une
// date écrite veut dire qu'une question vit. Mais un entretien par canal ne tient PAS en un tour — une
// question, la réponse, la suivante — et au deuxième tour la personne est `interrogée`. Le statut ne peut
// plus porter l'attente : la repasser `sollicitée` dirait qu'elle n'a jamais parlé, et éteindrait
// faussement ce que sa voix avait fermé (S83, S95). L'état se CALCULE donc au lieu de se déclarer : une
// question est en vol si la dernière chose qu'on lui a écrite est POSTÉRIEURE à la dernière chose qu'elle
// a dite. Rien de neuf dans le modèle — et c'est le premier lecteur du `date` d'une source, écrit dans le
// gabarit depuis le début et que rien ne lisait.
export const sollicitationEtat = (sh, sources = []) => {
  const ecrit = String(sh?.sollicitee_le ?? '').trim();
  if (sh?.status === 'sollicitée') return JOUR.test(ecrit) ? 'attente' : 'absent';
  if (sh?.status !== 'interrogée') return 'absent';
  // Entendue, et rien d'écrit depuis : c'est tenu. Le cas d'une personne rencontrée en réunion, qui
  // n'est jamais passée par un canal — la majorité des dossiers, et il ne doit rien lui arriver.
  if (!JOUR.test(ecrit)) return 'fait';
  const dites = arr(sources).filter(x => arr(x.stakeholders).includes(sh.id))
    .map(x => String(x.date ?? '').trim()).filter(d => JOUR.test(d)).sort();
  // Aucune de ses sources ne porte de date : on ne peut pas comparer, donc on ne conclut pas qu'une
  // question vit. C'est S115 qui le dit, parce qu'un silence qu'on ne sait pas lire se signale.
  if (!dites.length) return 'fait';
  return ecrit > dites[dites.length - 1] ? 'attente' : 'fait';
};
// Deux horloges, et pas une. DIRE à l'utilisateur qu'il n'y a pas de réponse ne coûte rien et ne sort
// pas du dossier : vingt-quatre heures suffisent. RELANCER ou RENONCER sort vers quelqu'un qui n'a rien
// demandé, et c'est irréversible — relancer au bout d'un jour, c'est harceler, et une source brûlée ne
// se rouvre pas là où un avertissement se corrige. Les confondre fait l'un au rythme de l'autre.
//
// Et rien ne tient d'horloge : aucun démon ne tourne, l'agent ne travaille que quand on le lance. Le
// seuil ne DÉCLENCHE donc rien — il qualifie ce qu'on voit en arrivant sur le dossier. Si personne n'y
// revient pendant trois semaines, l'alerte arrive à trois semaines. C'est moins joli, et c'est vrai.
//
// Réglables, parce qu'une association de parents et un service hospitalier n'ont pas le même tempo.
//
// Et dépendants du CANAL, parce que cinq jours ne veulent pas dire la même chose partout : un courriel
// sans réponse au bout de cinq jours est un courriel qu'on n'a pas lu, un message instantané sans
// réponse au bout de cinq jours est un message qu'on a décidé de ne pas lire. Le même nombre y qualifie
// deux situations différentes, et c'était le même nombre.
// La table est indexée par FAMILLE, pas par outil : `familleDe` ramène l'outil à sa famille une fois,
// juste en dessous.
const FORMES = {
  courriel: { objet: true, ecrit: true, groupe: 5, declaration: 'longue', relance: { signaler: 1, agir: 5 } },
  messagerie: { objet: false, ecrit: true, groupe: 3, declaration: 'courte', relance: { signaler: 1, agir: 2 } },
  // Ni le téléphone ni la vive voix ne portent de message : ce sont des conversations, et une
  // conversation a son guide d'entretien — huit à douze questions dans les mains d'un humain qui mène
  // l'échange (`references/questions.md`). `reach-out.mjs` compose un TEXTE : il refuse ces deux-là
  // plutôt que d'en rendre un qu'il faudrait lire à voix haute.
  'téléphone': { objet: false, ecrit: false, groupe: 3, declaration: 'courte', relance: { signaler: 1, agir: 2 } },
  'vive voix': { objet: false, ecrit: false, groupe: 3, declaration: 'courte', relance: { signaler: 1, agir: 5 } },
};
// Ce que le canal gouverne, et il ne gouverne que ça : la FORME. Le nombre de questions qu'un message
// porte ne dépend pas du tuyau mais de ce que les questions ont entre elles — c'est `reach-out.mjs` qui
// le décide, et sur un autre critère. La table vit ici parce que l'énumération `canal de contact` est
// ici : séparées, elles dériveraient au premier canal ajouté, et un canal sans forme composerait un
// message par défaut sans que rien ne le dise.
//   objet        un courriel en exige un, une messagerie n'en a pas — l'y mettre pose un titre au
//                milieu d'un fil de discussion ;
//   ecrit        si le canal porte un texte du tout ;
//   groupe       la place, en nombre de questions : un écran de téléphone n'est pas une page ;
//   declaration  l'ouverture, longue ou courte. Ce qu'elle DIT ne change jamais — qui écrit, où va la
//                réponse, qu'elle est libre —, seule sa longueur change ;
//   relance      au bout de combien de jours le silence se signale, puis se tranche.
// Le défaut d'un canal inconnu — un `autre:<libellé>`, un outil maison — est la MESSAGERIE et non le
// courriel : la forme la plus étroite passe partout, alors qu'un objet collé dans un fil de discussion
// se voit tout de suite. Se tromper vers le court ne coûte rien ; se tromper vers le long, oui.
// Un OUTIL n'est pas une FORME, et « messagerie » mettait Slack, Teams, WhatsApp et Messenger dans le
// même sac — alors que leurs délais de silence et leur place ne sont pas les mêmes. Surtout : une
// coordonnée ne dit pas l'outil. Une même adresse se lit dans Gmail ou dans Teams, un même numéro dans
// WhatsApp, Messenger ou par SMS. L'outil se DEMANDE, il ne se devine pas de la forme de l'adresse —
// c'est la règle de `initiative.requested_by`, « ne le devine pas » —, et c'est lui qui dira quel
// connecteur il faut le jour où un message doit vraiment partir. La forme, elle, suit la FAMILLE.
export const OUTILS = {
  courriel: 'courriel', gmail: 'courriel', outlook: 'courriel',
  messagerie: 'messagerie', slack: 'messagerie', teams: 'messagerie', whatsapp: 'messagerie',
  messenger: 'messagerie', signal: 'messagerie', telegram: 'messagerie', sms: 'messagerie',
  'téléphone': 'téléphone', 'vive voix': 'vive voix',
};
// Tolérante à la casse là où l'énumération ne l'est pas : « Slack » prend la bonne forme, et S88
// demande quand même l'orthographe du catalogue. Mieux vaut un message juste avec un avertissement
// qu'un message mal formé en silence. Un outil inconnu — un `autre:<nom>`, un outil maison — prend la
// famille la plus étroite, pour la raison dite juste au-dessus.
export const familleDe = canal => OUTILS[String(canal ?? '').trim().toLowerCase()] ?? 'messagerie';
export const formeDuCanal = canal => FORMES[familleDe(canal)];
const RELANCE = FORMES.courriel.relance;
// Les deux emplacements, comme `seuilsDe` : le plan range ses réglages sous `settings`, le BRD et le
// PRD à la racine. Lire les deux évite d'imposer une forme à un gabarit qui en a déjà une autre.
// Le canal se glisse SOUS les deux : ce que le dossier déclare l'emporte sur ce que le canal suggère,
// parce qu'un réglage écrit est un choix et qu'une table est un défaut.
export const seuilsRelance = (s, canal) => ({ ...RELANCE, ...(canal ? formeDuCanal(canal).relance : {}),
  ...(s?.settings?.relance ?? {}), ...(s?.relance ?? {}) });
// Les zones sur lesquelles une sollicitation est partie. Une seule au départ, d'où le champ au
// singulier ; plusieurs depuis qu'un message peut porter une liste de précisions indépendantes. Le
// champ accepte donc les deux formes — `ZO-001` ou `[ZO-001, ZO-034]` —, et c'est ici que la tolérance
// vit, une fois, plutôt que chez chaque lecteur.
export const zonesSollicitees = sh => (Array.isArray(sh?.sollicitee_zone) ? sh.sollicitee_zone : [sh?.sollicitee_zone])
  .map(x => String(x ?? '').trim()).filter(Boolean);
// L'autorisation de l'UTILISATEUR d'écrire à quelqu'un, par outil. Le champ accepte une entrée seule ou
// une liste, comme `sollicitee_zone` : la tolérance vit ici, une fois, plutôt que chez chaque lecteur.
// L'outil se lit en minuscules parce que la table l'est, et S88 demande de son côté l'orthographe.
export const autorisationsDe = sh => (Array.isArray(sh?.contact_autorise) ? sh.contact_autorise : [sh?.contact_autorise])
  .filter(a => a && typeof a === 'object')
  .map(a => ({ outil: String(a.outil ?? '').trim().toLowerCase(), le: String(a.le ?? '').trim(), par: String(a.par ?? '').trim() }));
// Les outils branchés sur la session, tels que l'AGENT les déclare : aucun script ne les voit. Trois
// états, comme partout : une liste, une liste vide — « j'ai regardé, il n'y en a pas » —, ou `null`,
// rien de déclaré, qui n'est pas la même chose et ne se lit pas comme une absence de connecteur.
export const connecteursDe = s => {
  const brut = s?.settings?.connecteurs ?? s?.connecteurs;
  if (brut === undefined || brut === null) return null;
  return arr(brut).map(x => String(x ?? '').trim().toLowerCase()).filter(Boolean);
};
const JOURS = 86400000;
const joursDepuis = d => Math.floor((Date.parse(new Date().toISOString().slice(0, 10)) - Date.parse(d)) / JOURS);

// L'attente n'est pas éternelle, et c'est le vrai apport du seuil. `sollicitée` + date vaut
// « non mesuré » — une question qui vit, que la porte ne compte pas contre le dossier. Mais une
// question en vol depuis quarante jours ne vit plus : elle est abandonnée sans que personne l'ait dit,
// et la faire passer pour vivante est précisément le mensonge que les trois états existaient pour
// éviter. Au-delà de `agir`, le constat redevient un constat.
const enAttenteDeReponse = (sh, s) => sollicitationEtat(sh, s?.sources) === 'attente'
  && joursDepuis(sh.sollicitee_le) <= seuilsRelance(s).agir;

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
// Cinq énumérations du gabarit finissaient par `autre` et aucune n'était lue — `ingest-dt-handoff.mjs`
// en écrivait même une en repli. Un `autre` nu dit « c'est d'un genre que je ne nommerai pas » et passe
// pour renseigné ; nommé, il devient une candidate à devenir une valeur, comme pour S86. La forme
// `autre:<libellé>` est l'idiome du gabarit (`processus:<nom>`, `regles:<domaine>`, `council:<lentille>`),
// qui n'était analysé nulle part avant S86 : un préfixe se coupe sur le `:`, et le libellé est dû.
const ENUMS = {
  'type de contrainte': { valeurs: ['legale', 'contractuelle', 'organisationnelle', 'budgetaire', 'environnement'] },
  'type de source': { valeurs: ['cadrage', 'entretien', 'échange écrit', 'observation', 'mesure', 'test', 'document', 'atelier', 'ticket', 'revue', 'dt-handoff', 'décision', 'analytics', 'étude'] },
  'domaine de décision': { valeurs: ['perimetre', 'objectifs', 'priorites', 'donnees_securite'], prefixes: ['processus', 'regles'] },
  'type d\'exigence de transition': { valeurs: ['formation', 'conduite_du_changement', 'reprise_de_donnees', 'coexistence', 'communication', 'support'] },
  'type d\'interface': { valeurs: ['openapi', 'asyncapi'] },
  // Les quatre appréciations de la cartographie. `impact` et `pouvoir` n'offraient que `fort | faible` :
  // en Discover on ne sait pas toujours, et le deuxième dossier réel a écrit `impact: inconnu` — une
  // valeur dont le gabarit ne disposait pas, qu'aucune règle ne voyait, et qui a quand même servi à
  // « déduire » un quadrant. `inconnu` est donc une valeur, et S92 en tire la conséquence.
  impact: { valeurs: ['fort', 'faible', 'inconnu'] },
  pouvoir: { valeurs: ['fort', 'faible', 'inconnu'] },
  influence: { valeurs: ['positive', 'négative', 'neutre', 'inconnue'] },
  quadrant: { valeurs: ['impliquer', 'satisfaire', 'consulter', 'informer'] },
  // Les deux échelles d'appréciation d'un risque. Elles portent des noms distincts de l'`impact` de la
  // cartographie, qui n'a pas la même échelle (`fort | faible | inconnu`) et ne mesure pas la même chose :
  // là, à quel point le changement touche quelqu'un ; ici, ce que coûterait le risque s'il se produisait.
  vraisemblance: { valeurs: ['faible', 'moyenne', 'forte'] },
  'ampleur du risque': { valeurs: ['faible', 'moyen', 'fort'] },
  // PAR QUOI on peut joindre quelqu'un, jamais AVEC QUOI : le canal, pas la coordonnée (S114).
  // Les valeurs sont celles de `OUTILS`, et pas une liste parallèle : séparées, un outil ajouté à la
  // table aurait été refusé par l'énumération, ou l'inverse — accepté sans forme connue.
  // `autre:<libellé>` couvre un outil nommé qui n'y est pas encore — un fil d'équipe, un outil maison.
  'canal de contact': { valeurs: Object.keys(OUTILS) },
  // POURQUOI quelqu'un n'est pas joignable. `non disponible` couvrait quatre situations d'un seul mot :
  // elle n'a jamais répondu ; elle a REFUSÉ, ce que notre propre message l'invite à faire ; elle est
  // absente, en congé, partie ; ou NOUS avons renoncé pour nos raisons. La dernière est la seule où la
  // faute est entièrement de notre côté, et c'est celle qu'un mot unique cachait le mieux.
  'motif d\'indisponibilité': { valeurs: ['silence', 'refus', 'absence', 'renoncement'] },
};
// `phase-discover.md` : le quadrant d'implication SE DÉDUIT du pouvoir et de l'impact. Il ne s'affirme
// pas — et `phase-govern.md` en fait un rôle de revue (« impliquer » → approbateur), donc une déduction
// fausse devient un approbateur faux.
const QUADRANT = { 'fort|fort': 'impliquer', 'fort|faible': 'satisfaire', 'faible|fort': 'consulter', 'faible|faible': 'informer' };
const checkEnum = (out, id, champ, v) => {
  if (!v) return;                       // l'absence est traitée par la règle propre à chaque collection
  const { valeurs, prefixes = [] } = ENUMS[champ];
  if (valeurs.includes(v)) return;
  const [tete, ...reste] = String(v).split(':');
  const libelle = reste.join(':').trim();
  const permis = [...valeurs, ...prefixes.map(p => `${p}:<…>`), 'autre:<libellé>'].join(' | ');
  if (![...prefixes, 'autre'].includes(tete)) out.push({ rule: 'S88', id, message: `${champ} « ${v} » hors énumération : ${permis}` });
  else if (!libelle) out.push({ rule: 'S88', id, message: `${champ} « ${tete} » sans libellé : un genre qu'on ne nomme pas passe pour renseigné` });
  else if (tete === 'autre') out.push({ rule: 'S88', id, message: `${champ} « ${libelle} » hors énumération, et nommé : candidat à devenir une valeur` });
};
// La fin de Discover exige un décideur « au moins pour le périmètre, les objectifs et les priorités »,
// confirmé par le sponsor — et rien ne le vérifiait. Sur le premier dossier réel : `priorites` sans
// décideur, et les deux autres confirmées par leur propre titulaire, le directeur s'attribuant le droit
// de trancher. La réserve était écrite en commentaire YAML (« reste à confirmer par le bureau »).
const DOMAINES_DUS = ['perimetre', 'objectifs', 'priorites'];
// Un nom de décideur désigne une partie prenante : par son identifiant, ou par son nom s'il est renseigné.
const knownPerson = (s, shs, v) => shs.has(v) || arr(s.stakeholders).some(sh => sh.name && sh.name === v);
// `S81` refuse depuis longtemps une SOURCE attribuée à quelqu'un que l'état déclare « à interroger » :
// ce qui en vient est rapporté par un tiers, pas recueilli. Personne n'avait transposé aux DÉCISIONS.
// Le deuxième dossier réel le montre : le directeur était présent au cadrage et n'a pas parlé, son
// autorité est décrite par un parent — et trois décisions d'opportunité ont été rendues en son nom.
// Rien à ajouter au modèle pour le voir : les trois faits sont dans leurs champs, chacun juste. Il
// manquait le croisement de deux d'entre eux.
const personne = (s, shs, v) => shs.get(v) ?? arr(s.stakeholders).find(x => x.name && x.name === v);
const rendueParAbsent = (out, s, shs, id, qui, quoi) => {
  const sh = qui && personne(s, shs, qui);
  if (sh && NON_ENTENDU.includes(sh.status)) {
    out.push({ rule: 'S90', id, message: `${quoi} au nom de ${sh.name || sh.id}, que l'état déclare « ${sh.status} » : elle est rapportée par un tiers, pas rendue` });
  }
};
// « J'ai bien précisé que chaque fonction a un représentant. » La phrase était vraie, dite deux fois, et
// le dossier affirmait le contraire — `status: à interroger  # jamais entendue, jamais présente, et non
// représentée`. Il n'y avait pas d'endroit pour l'écrire : `represents` est posé sur le REPRÉSENTANT et
// nomme un groupe en texte libre (« les parents d'élèves »), qu'aucun script ne peut rapprocher d'un
// SH-xx. `represented_by` est le champ inverse, sur la personne représentée. Et il ne ferme rien : une
// représentation enregistre qui répond pour quelqu'un, elle ne remplace pas un utilisateur direct
// (`phase-discover.md` point 4, et S83).
// Une zone qui la NOMME suffisait à fermer S94. Au troisième dossier réel, l'utilisatrice directe du
// futur système — celle qui fait la saisie des dossiers, `end_user: true`, jamais entendue, déclarée
// représentée par le directeur — était nommée dans une seule zone ouverte : « combien de personnes
// font la saisie ? », posée AU DIRECTEUR, elle en `related`. Une question sur quelqu'un n'est pas une
// question à quelqu'un : sa voix restait non entendue, aucune question ne lui était adressée, et la
// règle se taisait. C'est `ask_to` qui dit à qui on demande.
const interrogeeDansUneZone = (s, id) => arr(s.shadow_zones).some(z => z.status === 'ouverte' && z.ask_to === id);
const citeeDansUneZone = (s, id) => arr(s.shadow_zones).some(z => z.status === 'ouverte' && arr(z.related).includes(id));
const checkRepresentation = (s, out, shs, { endUsersSeuls }) => {
  const porte = arr(s.stakeholders).some(sh => String(sh.represents ?? '').trim());
  for (const sh of arr(s.stakeholders)) {
    const par = sh.represented_by;
    if (par && !shs.has(par)) out.push({ rule: 'S09', id: sh.id, message: `représentée par « ${par} », qui n'est pas une partie prenante connue` });
    else if (par === sh.id) out.push({ rule: 'S94', id: sh.id, message: 'déclarée représentée par elle-même : la représentation désigne quelqu\'un d\'autre' });
    // `represents` n'avait qu'un lecteur, S94, et seulement comme test de présence : rien n'exigeait
    // qu'une représentation repose sur quelque chose. Au troisième dossier réel, un représentant des
    // parents d'élèves s'est trouvé enregistré représentant « des membres du bureau » — déduit de la
    // dernière proposition d'un tour de table où trois personnes se présentent à la file et où le « je »
    // final revient grammaticalement à lui. Rien ne pouvait le voir : la valeur était renseignée, donc
    // conforme, et c'est passé devant l'utilisateur par hasard, dans une question posée à l'outil. Une
    // représentation fausse coûte plus cher qu'une absente : elle fait répondre quelqu'un au nom d'un
    // groupe qui ne l'a pas mandaté. D'où la source — et d'où la condition qu'il y ait parlé : une
    // représentation déduite des mots d'un tiers n'est pas déclarée, elle est supposée.
    const groupe = String(sh.represents ?? '').trim();
    if (groupe) {
      const ref = String(sh.represents_source ?? '').trim();
      const src = ref && arr(s.sources).find(x => x.id === ref);
      if (!ref) out.push({ rule: 'S110', id: sh.id, message: `déclaré représentant de « ${groupe} » sans dire où il le dit (\`represents_source\`) : une représentation se lit dans une source, sinon elle se déduit — et une déduction fausse fait parler quelqu'un au nom d'un groupe qui ne l'a pas mandaté` });
      else if (!src) out.push({ rule: 'S09', id: sh.id, message: `représentation appuyée sur ${ref}, qui n'existe pas dans les sources` });
      else if (!arr(src.stakeholders).includes(sh.id)) out.push({ rule: 'S110', id: sh.id, message: `représentation de « ${groupe} » appuyée sur ${ref}, où il n'est pas locuteur : ce qu'un tiers dit de lui ne le mandate pas — cite la source où il le dit lui-même` });
    }
    const concerne = endUsersSeuls ? sh.end_user : true;
    if (!concerne || !NON_ENTENDU.includes(sh.status)) continue;
    if (par && shs.has(par) && par !== sh.id && !interrogeeDansUneZone(s, sh.id)) {
      out.push({ rule: 'S94', id: sh.id, ...(enAttenteDeReponse(sh, s) ? { pending: true } : {}), message: citeeDansUneZone(s, sh.id)
        ? `représentée par ${par} et jamais entendue : une zone ouverte la nomme, mais aucune ne lui est adressée (\`ask_to\`) — une question sur quelqu'un n'est pas une question à quelqu'un`
        : `représentée par ${par} et jamais entendue, sans qu'aucune zone ouverte ne lui soit adressée : une représentation dit qui répond pour elle, elle ne remplace pas sa voix` });
    }
    if (!par && porte) {
      out.push({ rule: 'S94', id: sh.id, message: 'jamais entendue et aucune représentation déclarée, alors qu\'une autre partie prenante se dit représentante d\'un groupe : si c\'est d\'elle qu\'il s\'agit, dis-le en `represented_by`' });
    }
  }
};
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
// Une exigence complète est due à la porte de Define, pas avant : les étapes 3 et 4 remplissent les
// critères et les priorités. Un état sans phase est traité comme dû — on ne suppose pas qu'un travail
// est en cours, et une version figée (`phase: govern`) l'est toujours.
const duALaPorte = s => !['assess', 'discover', 'define'].includes(s?.phase ?? '');

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
  // `present` dit qui était là, `stakeholders` qui a parlé. La différence est le sujet : un présent qui
  // n'est locuteur d'aucune source n'a pas été entendu, et son silence n'est pas un accord — surtout
  // dans une pièce où son chef vient de répondre. Au premier dossier réel, le fait était consigné en
  // commentaire YAML (« Dédé et Tom étaient présents et n'ont pas parlé »), donc illisible.
  const presents = new Set(), locuteurs = new Set();
  for (const src of arr(s.sources)) {
    for (const p of arr(src.present)) presents.add(p);
    for (const p of arr(src.stakeholders)) locuteurs.add(p);
  }
  for (const src of arr(s.sources)) {
    checkEnum(out, src.id, 'type de source', src.type);
    if (SOURCES_SANS_PRESENCE.includes(src.type)) continue;
    const parties = arr(src.stakeholders);
    refs(out, 'S09', src, [...parties, ...arr(src.present)], shs, 'partie prenante');
    if (!parties.length) { out.push({ rule: 'S81', id: src.id, message: `source de type « ${src.type ?? 'non typée'} » sans partie prenante : qui a parlé ?` }); continue; }
    const connues = parties.filter(p => shs.has(p));
    const muettes = connues.filter(p => NON_ENTENDU.includes(shs.get(p).status));
    if (connues.length && muettes.length === connues.length) {
      out.push({ rule: 'S81', id: src.id, message: `source attribuée à ${muettes.join(', ')}, que l'état déclare « ${shs.get(muettes[0]).status} » : ce qui en vient est rapporté par un tiers, pas recueilli` });
    }
    // Le contrôle inverse de S87. `present` dit « ceux qui étaient là, Y COMPRIS les silencieux » : la
    // salle entière, locuteurs compris. Sur le deuxième dossier réel, vingt-et-une sources le lisaient
    // comme ça et une seule à l'envers — `stakeholders: [SH-03, SH-02]` avec `present: [SH-01]`, donc
    // deux personnes qui parlent depuis l'extérieur de la pièce. Les deux lectures ne peuvent pas
    // coexister dans un même fichier, et c'est celle de S87 qui compte. Rien ne se vérifie quand
    // `present` est vide : le tour de table n'a pas eu lieu, ou n'a nommé qu'une personne.
    if (arr(src.present).length && EN_PRESENCE.includes(src.type)) {
      for (const p of parties.filter(x => !arr(src.present).includes(x))) {
        out.push({ rule: 'S91', id: src.id, message: `${p} est locuteur de cette source mais absent de « present » : on ne parle pas depuis l'extérieur de la pièce — « present » est la salle entière, silencieux ET locuteurs` });
      }
    }
  }
  // L'échappatoire « déjà dit par le statut, et S81 s'en charge » était fausse dans un cas, et c'est
  // celui qui s'est produit. S81 parle d'une SOURCE attribuée à quelqu'un de non entendu ; quelqu'un
  // qui n'est locuteur de rien n'est attribué à aucune source, donc S81 n'a rien à dire sur lui, et
  // S87 s'effaçait devant une règle muette. Sur le deuxième dossier réel, Tom portait `à interroger`
  // et figurait dans `present` des SIX sources du cadrage : locuteur d'aucune, et aucune des deux
  // règles ne l'a signalé. Douze sources plus tard le dossier a franchi sa porte sur une seule voix,
  // et c'est l'utilisateur qui a dû écrire « t'as posé aucune question, Samir représente les parents,
  // Tom et Toto les profs ». Le statut `à interroger` explique un silence HORS de la salle ; dedans,
  // il dit le contraire — la personne était là et personne ne lui a rien demandé.
  //
  // Le seuil est à deux présences, et pas à une : un premier échange où une personne ne parle pas est
  // un échange, le tour de table nomme qui est là et quelqu'un répond. À partir du second, le dossier
  // se construit devant quelqu'un qu'on n'interroge jamais. Les deux autres statuts de `NON_ENTENDU`
  // gardent l'échappatoire entière, faute d'avoir été mesurés : `sollicitée` a sa question en vol, que
  // S115 et S117 suivent, et `non disponible` son renoncement, que S116 et S83 portent.
  const PRESENCES_MUETTES = 2;
  for (const p of presents) {
    if (locuteurs.has(p)) continue;
    const qui = shs.get(p);
    const combien = arr(s.sources).filter(x => arr(x.present).includes(p)).length;
    const aInterroger = qui?.status === 'à interroger' && combien >= PRESENCES_MUETTES;
    if (qui && NON_ENTENDU.includes(qui.status) && !aInterroger) continue;
    const nom = qui?.name ? ` (${qui.name})` : '';
    if (aInterroger) {
      out.push({ rule: 'S87', id: p, message: `présent${nom} sur ${combien} sources et locuteur d'aucune, avec le statut « à interroger » : ce statut explique un silence hors de la salle, pas dedans — la personne était là chaque fois et personne ne lui a rien demandé. Interroge-la, ou dis pourquoi sa voix ne compte pas ici` });
    } else {
      out.push({ rule: 'S87', id: p, message: `présent${nom} mais locuteur d'aucune source : être dans la pièce n'est pas avoir parlé, et le silence n'est pas un accord` });
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
  rendueParAbsent(out, s, shs, 'opportunity', s.opportunity?.decided_by, 'décision d\'opportunité rendue');
  if (s.opportunity?.decision === 'decoupee' && !arr(s.opportunity.split_into).length) {
    out.push({ rule: 'S56', id: 'opportunity', message: 'opportunité découpée sans nommer les initiatives filles (split_into) : close se relit alors comme un abandon' });
  }
  // Une initiative peut naître d'une autre, et `split_into` ne le dit que vers le bas, depuis une mère
  // `decoupee`. Une sortie de périmètre arrive pendant que la mère VIT et continue : sur le premier
  // dossier réel, la fille portait son origine dans `trigger` — « Sorti du périmètre d'X par DD-02 » —
  // vraie, datée, et illisible par tout script. Le portefeuille la montrait alors comme une idée neuve.
  const df = s.initiative?.derived_from ?? {};
  if (df.initiative || df.reason || df.decision) {
    if (!df.initiative) out.push({ rule: 'S86', id: 'initiative', message: 'provenance sans initiative d\'origine (derived_from.initiative) : elle ne désigne personne' });
    if (!df.decision) out.push({ rule: 'S86', id: 'initiative', message: 'provenance sans la décision qui l\'a produite (derived_from.decision) : DD-xx chez la mère, ou sa décision d\'opportunité' });
    if (!df.reason) out.push({ rule: 'S86', id: 'initiative', message: `provenance sans raison (derived_from.reason) : ${PROVENANCE.join(' | ')} | autre:<libellé>` });
    else if (!PROVENANCE.includes(df.reason)) {
      // L'énumération fermée ne produit pas un trou, elle produit une valeur fausse : le premier dossier
      // réel portait `decision: jeter` avec la vérité en commentaire YAML, faute d'un mot pour dire
      // « découpée ». `autre:<libellé>` est donc ouvert — mais nommé, signalé, et compté comme une dette :
      // chaque occurrence est une candidate à devenir une valeur. Les cinq autres énumérations du gabarit
      // qui finissent par `autre` ne sont lues par personne, et personne n'y a jamais rien promu.
      const libelle = String(df.reason).startsWith('autre:') ? String(df.reason).slice(6).trim() : null;
      if (libelle === null) out.push({ rule: 'S86', id: 'initiative', message: `raison de provenance « ${df.reason} » hors énumération : ${PROVENANCE.join(' | ')} | autre:<libellé>` });
      else if (!libelle) out.push({ rule: 'S86', id: 'initiative', message: '« autre » sans libellé : dire qu\'il y a une provenance sans dire laquelle passe pour rempli' });
      else out.push({ rule: 'S86', id: 'initiative', message: `provenance « ${libelle} » hors énumération, et nommée : candidate à devenir une valeur de derived_from.reason` });
    }
  }
  for (const o of arr(s.objectives).filter(live)) {
    push(o, 'OBJ', o.statement);
    if (!o.indicator || !o.target) out.push({ rule: 'S01', id: o.id, message: 'objectif sans indicateur ou sans cible' });
  }
  for (const n of arr(s.candidate_needs).filter(live)) push(n, 'BC', n.text);
  // L'autre moitié de la filiation : la mère VIVANTE qui pousse un besoin dans une nouvelle initiative.
  // `split_into` ne couvre que la mère close ; ici le besoin sort par une décision de périmètre et la
  // mère continue. Sur le dossier réel, la reprise était écrite dans `reason` — en prose.
  for (const n of arr(s.candidate_needs).filter(n => n.moved_to)) {
    if (n.status !== 'hors_périmètre') out.push({ rule: 'S86', id: n.id, message: `repris par « ${n.moved_to} » mais de statut ${n.status ?? 'absent'} : un besoin qui part est hors_périmètre ici` });
  }
  for (const b of arr(s.business_requirements).filter(live)) {
    push(b, 'BR', b.statement);
    arr(b.acceptance).forEach(a => checkText('AC', a, { waived: waivedOf(b) }).forEach(f => out.push({ ...f, id: b.id, message: `critère : ${f.message}` })));
    if (!arr(b.objectives).length) out.push({ rule: 'S02', id: b.id, message: 'exigence rattachée à aucun objectif' });
    if (!arr(b.from_needs).length) out.push({ rule: 'S03', id: b.id, message: 'exigence sans besoin candidat sourcé' });
    // Dus À LA PORTE de Define, pas pendant. Les critères d'acceptation s'écrivent à l'étape 3 et les
    // priorités s'arbitrent à l'étape 4 : entre l'étape 2 et là, une exigence validée n'a ni l'un ni
    // l'autre, et c'est le chemin que la doctrine prescrit. Sur le deuxième dossier réel, cinq
    // avertissements sur seize — près d'un tiers — étaient ce passage normal, cinq fois « exigence
    // validée sans priorité » sur cinq exigences. Un contrôle qui crie pendant le travail prescrit
    // s'apprend à s'ignorer, et il s'ignore encore après l'étape 4. La porte de Define les compte
    // (`lib/gates.mjs`), et c'est là que l'absence est une absence.
    if (duALaPorte(s)) {
      if (isValid(b) && !arr(b.acceptance).length) out.push({ rule: 'S04', id: b.id, message: 'exigence validée sans critère d\'acceptation' });
      if (isValid(b) && !b.priority) out.push({ rule: 'S05', id: b.id, message: 'exigence validée sans priorité' });
    }
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
    // Une source qui déclare `confirms: [BR-001]` EST la vérification : elle répond à la question que
    // pose `feedback`, et mieux — c'est l'exigence elle-même qui a été relue, pas son matériau.
    const vu = confirmes(s);
    if (ids.length && !vu.has(b.id) && !arr(b.from_needs).some(n => vu.has(n))) {
      const lot = ids.map(id => srcs.get(id)).filter(Boolean);
      const etats = lot.map(x => feedbackEtat(x, s));
      // Une seule relecture faite suffit — c'est la règle d'origine. Sinon, le lot est soit en attente
      // (au moins une demande partie et datée), soit muet. Les deux ne se disent pas pareil : la
      // première est une question qu'on a posée, la seconde une question qu'on n'a pas posée.
      if (!etats.includes('fait')) {
        const attente = etats.includes('attente');
        const sansDate = lot.filter(x => x.feedback === 'envoyé' && !JOUR.test(String(x.feedback_le ?? '').trim())).map(x => x.id);
        out.push({ rule: 'S84', id: b.id, ...(attente ? { pending: true } : {}),
          message: attente
            ? 'exigence validée sur des sources dont la relecture est partie et pas encore revenue (`feedback: envoyé`) : la question vit, elle n\'est pas encore tranchée'
            : sansDate.length
              ? `exigence validée sur des sources dites parties en relecture sans dire quand (\`feedback_le\` manque sur ${sansDate.join(', ')}) : « envoyé » sans date ne se vérifie pas, et c'est l'agent qui écrit le champ`
              : 'exigence validée sur des sources dont aucune n\'a été relue par la personne interrogée (`feedback`) : ce qui a été compris n\'a jamais été vérifié auprès d\'elle' });
      }
    }
  }
  // S83 ne voit que l'absence TOTALE : un utilisateur direct entendu sur quatre, et la règle est verte
  // pour toujours. Au deuxième dossier réel, c'est exactement la situation — Samir entendu, le
  // professeur, le comptable et la famille primo-inscrite jamais — et les besoins ne portent pas sur
  // les mêmes gens : deux d'entre eux sont ceux de la famille qui s'inscrit pour la première fois,
  // écrit en prose dans leurs `notes` (« Concerne SH-06 »), là où aucun script ne regarde. Le grain
  // juste est donc le besoin, pas le dossier.
  const entendusDeVive = new Set();
  for (const src of arr(s.sources)) {
    if (!RECUEIL_AUPRES_DE.includes(src.type)) continue;
    for (const id of arr(src.stakeholders)) entendusDeVive.add(id);
  }
  const concernsDu = ['define', 'govern'].includes(s.phase) ? live : n => live(n) && ['confirmé', 'intégré'].includes(n.status);
  for (const n of arr(s.candidate_needs).filter(live)) {
    refs(out, 'S09', n, n.concerns, shs, 'partie prenante');
    if (!arr(n.concerns).length) {
      if (concernsDu(n)) out.push({ rule: 'S95', id: n.id, message: 'ne dit pas de qui il est le besoin (`concerns`) : un besoin sans porteur se défend tout seul en revue' });
      continue;
    }
    const muets = arr(n.concerns).filter(id => shs.get(id)?.end_user && !entendusDeVive.has(id));
    if (muets.length) {
      out.push({ rule: 'S95', id: n.id, message: `besoin de ${muets.join(', ')}, dont aucune source recueillie ne porte la voix : il est formulé pour quelqu'un qu'on n'a pas entendu` });
    }
  }
  // `phase-discover.md` ordonne « Renseigne `end_user` et `represents` » et explique pourquoi : les
  // besoins opérationnels se recueillent au plus près du terrain. `represents` était rendu, `end_user`
  // n'était lu par rien. Un dossier peut donc collecter des besoins sans qu'aucun utilisateur réel ait
  // parlé — le cas du référent qui répond pour ses agents, vu sur les deux dossiers réels.
  if (arr(s.stakeholders).length && arr(s.candidate_needs).filter(live).length) {
    const entendus = arr(s.stakeholders).filter(sh => sh.status === 'interrogée');
    const util = entendus.filter(sh => sh.end_user);
    // `interrogée` veut dire entendue au moins une fois, pas interrogée sur son travail : le statut
    // écrase deux états, et c'est le second qui compte ici.
    const interroges = new Set();
    for (const src of arr(s.sources)) {
      if (!RECUEIL_AUPRES_DE.includes(src.type)) continue;
      for (const id of arr(src.stakeholders)) interroges.add(id);
    }
    // Un utilisateur direct à qui la question est PARTIE est une question qui vit : le constat change
    // de liste au lieu de compter contre le dossier, comme un retour à la source envoyé. Sinon écrire
    // à la bonne personne ne vaut rien jusqu'à ce qu'elle réponde, et ce qui ne vaut rien ne se fait pas.
    const utilEnAttente = arr(s.stakeholders).filter(sh => sh.end_user && enAttenteDeReponse(sh, s));
    if (entendus.length && !util.length) {
      out.push({ rule: 'S83', id: 'stakeholders', ...(utilEnAttente.length ? { pending: true } : {}), message: `des besoins recueillis, et aucun utilisateur direct entendu (\`end_user\`) : tout passe par des représentants${utilEnAttente.length ? ` — ${utilEnAttente.map(sh => sh.id).join(', ')} sollicité(s) et sans réponse, la question vit` : ''}` });
    } else if (util.length && !util.some(sh => interroges.has(sh.id))) {
      out.push({ rule: 'S83', id: 'stakeholders', message: `utilisateur direct présent au cadrage mais jamais interrogé (${util.map(sh => sh.id).join(', ')}) : être dans la pièce au premier échange n'est pas avoir été entendu sur son travail` });
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
    checkEnum(out, t.id, 'type d\'exigence de transition', t.kind);
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
    const id = `decision_rights:${d.domain}`;
    checkEnum(out, id, 'domaine de décision', d.domain);
    refs(out, 'S09', { id }, [d.decider, d.escalation].filter(Boolean), shs, 'partie prenante');
    if (!d.decider) out.push({ rule: 'S89', id, message: `domaine « ${d.domain} » déclaré sans décideur` });
    else if (d.confirmed_by === d.decider) out.push({ rule: 'S89', id, message: `« ${d.domain} » confirmé par son propre décideur : s'attribuer le droit de trancher n'est pas une confirmation, elle revient au sponsor` });
    else if (!d.confirmed_by) out.push({ rule: 'S89', id, message: `« ${d.domain} » attribué sans confirmation (confirmed_by) : l'attribution se valide par le sponsor, pas par celui qui en bénéficie` });
    if (d.escalation && d.escalation === d.decider) out.push({ rule: 'S89', id, message: `recours identique au décideur sur « ${d.domain} » : un recours vers soi-même n'en est pas un` });
    rendueParAbsent(out, s, shs, id, d.decider, `attribution du droit de trancher « ${d.domain} »`);
  }
  if (['discover', 'define', 'govern'].includes(s.phase)) {
    const doms = new Set(arr(s.decision_rights).map(d => d.domain));
    for (const dom of DOMAINES_DUS.filter(x => !doms.has(x))) {
      out.push({ rule: 'S89', id: `decision_rights:${dom}`, message: `personne ne tranche « ${dom} » : la fin de Discover en demande un décideur au moins pour le périmètre, les objectifs et les priorités` });
    }
  }
  // Les contraintes n'étaient bouclées par aucune règle du BRD : leur type n'était lu nulle part.
  for (const c of arr(s.constraints)) checkEnum(out, c.id ?? 'constraints', 'type de contrainte', c.type);
  for (const d of arr(s.decisions).filter(live)) {
    if (d.status === 'validé' && !d.decided_by) out.push({ rule: 'S17', id: d.id, message: 'décision validée sans décideur déclaré' });
    if (arr(d.options).length < 2) out.push({ rule: 'S18', id: d.id, message: 'décision présentée avec moins de deux options : le décideur n\'a pas eu de choix réel' });
    rendueParAbsent(out, s, shs, d.id, d.decided_by, 'décision rendue');
  }
  checkSources(s, out, shs);
  // La cartographie était la seule collection qu'aucune règle ne relisait : `represents` et `end_user`
  // ont leur lecteur depuis S83, les quatre appréciations n'en avaient aucun. Trois phrases de
  // `phase-discover.md` restaient donc sans effet, et le deuxième dossier réel les a toutes les trois
  // prises en défaut. Rien à vérifier en Assess : la carte n'existe pas encore, le tour de table ne
  // donne que des noms et des fonctions.
  const carte = ['discover', 'define', 'govern'].includes(s.phase);
  for (const sh of arr(s.stakeholders)) {
    if (sh.influence === 'négative' && sh.power === 'fort' && !arr(s.risks).some(r => arr(r.related).includes(sh.id) || r.origin === sh.id)) {
      out.push({ rule: 'S19', id: sh.id, message: 'partie prenante à fort pouvoir et influence négative sans risque associé' });
    }
    if (!carte) continue;
    checkEnum(out, sh.id, 'impact', sh.impact);
    checkEnum(out, sh.id, 'pouvoir', sh.power);
    checkEnum(out, sh.id, 'influence', sh.influence);
    checkEnum(out, sh.id, 'quadrant', sh.quadrant);
    const deduit = QUADRANT[`${sh.power}|${sh.impact}`];
    if (sh.quadrant && !deduit) {
      out.push({ rule: 'S92', id: sh.id, message: `quadrant « ${sh.quadrant} » affirmé alors que pouvoir (${sh.power ?? 'absent'}) × impact (${sh.impact ?? 'absent'}) ne le donne pas : il se déduit, il ne s'affirme pas — laisse-le vide et pose la question` });
    } else if (sh.quadrant && deduit !== sh.quadrant) {
      out.push({ rule: 'S92', id: sh.id, message: `quadrant « ${sh.quadrant} » alors que pouvoir ${sh.power} × impact ${sh.impact} donne « ${deduit} »` });
    } else if (!sh.quadrant && deduit) {
      out.push({ rule: 'S92', id: sh.id, message: `quadrant absent alors que pouvoir ${sh.power} × impact ${sh.impact} le donne (« ${deduit} ») : la gouvernance en tire un rôle de revue` });
    }
    // `phase-discover.md` point 2 : « une influence inconnue sur une partie prenante à fort pouvoir est
    // une zone d'ombre ». S19 existait pour l'influence NÉGATIVE, la phrase jumelle n'avait pas de
    // lecteur. Au deuxième dossier réel, les six influences valaient `inconnue`, deux à fort pouvoir, et
    // cinq attitudes sur six étaient vides : le champ n'a jamais été établi et rien ne l'a remarqué.
    if (sh.power === 'fort' && (!sh.influence || sh.influence === 'inconnue') && !String(sh.attitude ?? '').trim()) {
      out.push({ rule: 'S93', id: sh.id, message: 'fort pouvoir, influence inconnue et aucune attitude notée : le sens dans lequel elle pèsera est la seule appréciation qui ne se déduit pas — elle se demande, et son absence est une zone d\'ombre' });
    }
  }
  checkRepresentation(s, out, shs, { endUsersSeuls: true });
  // S95 part du besoin et demande de qui il est. L'inverse n'avait pas de lecteur : un utilisateur
  // direct qu'AUCUN besoin ne concerne. Au troisième dossier réel, celle qui fait la saisie — le geste
  // même que le changement remplace — n'était nommée dans les `concerns` d'aucun des huit besoins,
  // alors que deux d'entre eux portent sur des professeurs qui ne recopieront plus ce qu'elle recopie.
  // Rien à vérifier avant Define : les besoins s'y forment encore. À Define, un utilisateur direct sans
  // besoin est soit un besoin qui manque, soit un usage direct qui n'en est pas un — et les deux se
  // tranchent, aucun ne se laisse vide.
  if (['define', 'govern'].includes(s.phase)) {
    const portes = new Set(arr(s.candidate_needs).filter(live).flatMap(b => arr(b.concerns)));
    for (const sh of arr(s.stakeholders).filter(x => x.end_user && !portes.has(x.id))) {
      out.push({ rule: 'S113', id: sh.id, message: 'utilisateur direct qu\'aucun besoin candidat ne concerne (`concerns`) : soit un besoin manque, soit l\'usage direct n\'en est pas un' });
    }
  }
  // Une hypothèse BRD n'avait aucun champ pour dire COMMENT la trancher : `text`, `basis`, `status`. Au
  // deuxième dossier réel, les huit hypothèses ouvertes portaient le moyen dans leur `basis`, en prose
  // — « l'historique des remboursements, que le comptable détient, permettrait de le vérifier sans
  // interroger personne ». C'est juste, c'est même le meilleur rapport coût/preuve du dossier, et
  // rien ne pouvait ni l'ordonner ni le compter. Le PRD a son objet `test` depuis toujours ; le BRD
  // n'avait que de la prose.
  for (const h of arr(s.hypotheses).filter(h => h.status === 'à vérifier')) {
    if (!String(h.verification ?? '').trim()) {
      out.push({ rule: 'S97', id: h.id, message: 'à vérifier, sans dire comment (`verification`) : une hypothèse dont le moyen n\'est pas écrit ne se priorise pas, et attend la session où quelqu\'un y repense' });
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
      const etat = src ? feedbackEtat(src, s) : 'fait';
      if (etat !== 'fait' && !confirmes(s).has(f.id)) {
        out.push({ rule: 'S84', id: f.id, ...(etat === 'attente' ? { pending: true } : {}),
          message: etat === 'attente'
            ? `exigence tirée de ${f.origin}, dont la relecture est partie le ${src.feedback_le} et pas encore revenue : la question vit, elle n'est pas encore tranchée`
            : src.feedback === 'envoyé'
              ? `exigence tirée de ${f.origin}, dite partie en relecture sans dire quand (\`feedback_le\`) : « envoyé » sans date ne se vérifie pas, et c'est l'agent qui écrit le champ`
              : `exigence tirée de ${f.origin}, que la personne interrogée n'a jamais relue (\`feedback\`) : ce qui a été compris n'a pas été vérifié auprès d'elle` });
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
  // ── Deux contraintes figées, et la qualité devient la variable (S133) ──
  // Le tableau 18.1 de Rubin (*Essential Scrum*, ch. 18) marque **non recommandées** deux des quatre
  // combinaisons de contraintes : tout figé, et périmètre + date figés. La raison est la même dans les
  // deux cas — « si on sur-contraint les trois, c'est la qualité qui devient la variable », et c'est la
  // seule des trois qui ne se négocie pas, parce que personne ne la déclare : elle cède en silence.
  //
  // Mesuré avant d'écrire, et la mesure a trouvé mieux que ce que je cherchais : le modèle porte DÉJÀ
  // les deux dimensions. `window` est dans le gabarit depuis le début — « la fenêtre où elle se joue,
  // quand elle en a une (campagne, rentrée, échéance) » — et n'est lue par personne, comme
  // `learning_goal` et `containment`. La part de Must se calcule depuis `priority`, qui est sur chaque
  // exigence. Rien ne croisait les deux. Aucun champ nouveau n'est donc nécessaire.
  //
  // Le seuil est 100 %, pas la règle du pouce des 60-70 % : une règle du pouce ne se contrôle pas, elle
  // se lit. Ici le constat ne porte que sur le cas où **rien ne peut céder** — une fenêtre à tenir et
  // pas une exigence qui soit autre chose que Must. Entre les deux, c'est au PRD de savoir ce qu'il
  // fait, et un contrôle y rendrait des faux constats qu'on apprendrait à déroger.
  for (const r of arr(s.releases).filter(live)) {
    if (!ecrit(r.window)) continue;                       // pas de date à tenir : rien n'est sur-contraint
    const sienne = arr(s.functional_requirements).filter(f => live(f) && f.release === r.id);
    if (!sienne.length || sienne.some(f => f.priority !== 'must')) continue;   // quelque chose peut céder
    out.push({ rule: 'S133', id: r.id, message: `fenêtre « ${r.window} » à tenir et ${sienne.length} exigence${sienne.length > 1 ? 's' : ''} sur ${sienne.length} en Must : le périmètre et la date sont figés tous les deux, et la seule variable qui reste est la qualité — celle que personne ne déclare et qui cède en silence. Dire ce qui peut céder (\`should\`, \`could\`) ou ce qui est hors périmètre (\`wont\`), ou dire que la fenêtre est indicative` });
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
    for (const d of arr(s.decision_rights)) rendueParAbsent(out, s, shs, `decision_rights:${d.domain}`, d.decider, `attribution du droit de trancher « ${d.domain} »`);
    for (const g of arr(s.goals).filter(live)) rendueParAbsent(out, s, shs, g.id, g.decided_by, 'cible arrêtée');
    for (const d of arr(s.design_decisions).filter(live)) rendueParAbsent(out, s, shs, d.id, d.decided_by, 'décision de conception rendue');
    checkRepresentation(s, out, shs, { endUsersSeuls: false });
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
    checkEnum(out, api.id, 'type d\'interface', api.kind);
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
  // Une règle d'itération dans un projet qui n'en a pas n'a pas de sens, et le code ne le disait que
  // pour `S48`. Les cinq autres parcouraient `s.iterations` — vide en cadence `flux` — et se taisaient
  // par accident plutôt que par décision : sur un plan au fil de l'eau, elles s'annonçaient « non
  // mesurées » à chaque vérification, pour la vie du projet, sans jamais pouvoir devenir un constat.
  // Mesuré avant de changer : aucun état du dépôt n'a `cadence: flux` AVEC des itérations, donc cette
  // liaison ne retire aucun constat existant — elle dit ce que les règles voulaient dire.
  const iterations = settings.cadence === 'flux' ? [] : arr(s.iterations);
  const storyIds = new Map(stories.map(x => [x.id, x])), taskIds = new Map(tasks.map(x => [x.id, x]));
  const sizeIdx = v => SIZE_ORDER.indexOf(v);
  const push = (x, kind, text) => checkText(kind, text, { waived: waivedOf(x) }).forEach(f => out.push({ ...f, id: x.id }));

  const tasksOf = id => tasks.filter(t => t.story === id);
  for (const st of stories) {
    if (!st.title) out.push({ rule: 'S62', id: st.id, message: 'story sans titre court' });
    // Le titre d'une story était le seul texte de toute la chaîne à ne passer par aucune règle de
    // rédaction : neuf types l'étaient, pas celui-là. L01 (terme non mesurable), L02 (points de
    // suspension) et L07 (implementation) s'y appliquent désormais, avec le quoi et le pourquoi —
    // « afin d'être plus efficace » est un pourquoi qui ne se mesure pas. L08 en est exclue
    // volontairement : vérifié sur les 36 stories du dépôt, elle frappait 36 fois sur 36, parce
    // qu'une story n'est pas un énoncé normatif et ne porte pas de « doit ».
    push(st, 'US', [st.title, st.what, st.why].filter(Boolean).join(' '));
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
    // `references/phase-slice.md` : une story « a un titre court, qu'on peut prononcer dans une
    // conversation, et en dessous qui, quoi, pourquoi » — et la forme « En tant que…, je veux… afin
    // de… » y est « un bon démarreur de conversation, pas une obligation ». Les trois champs existent,
    // `render-plan.mjs` les imprime sur la carte de la story, et rien ne les exigeait : sur les
    // 36 stories du dépôt, 6 seulement les renseignaient, et les deux stories écrites au format manuel
    // rendaient « Quoi : — · Pourquoi : — ». Une règle sur la forme du titre aurait épinglé la seule
    // story correcte et laissé passer les deux incomplètes ; c'est la place du pourquoi qui manquait
    // d'être tenue, pas le moule de la phrase.
    // Le « qui » accepte `persona`, parce que le rendu le prend déjà en repli : la règle demande ce que
    // le document a besoin de lire, pas un champ de plus. La voie rapide n'est pas concernée — elle
    // sort plus haut, et sa complétude est un autre contrat (`references/fast-lane.md`).
    const sansDire = [];
    if (!String(st.who ?? '').trim() && !String(st.persona ?? '').trim()) sansDire.push('pour qui (`who` ou `persona`)');
    if (!String(st.what ?? '').trim()) sansDire.push('quoi (`what`)');
    if (!String(st.why ?? '').trim()) sansDire.push('pourquoi (`why`)');
    if (sansDire.length) out.push({ rule: 'S129', id: st.id, message: `ne dit nulle part ${sansDire.join(', ni ')} : la carte de la story l'imprime en « — », et une valeur écrite nulle part ne se priorise pas. Le titre reste court ; ces champs sont la place du reste` });
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
  if (settings.attention_capacity) for (const it of iterations.filter(i => !['terminé'].includes(i.status))) {
    const load = tasks.filter(t => t.iteration === it.id && t.status !== 'abandonné').reduce((n, t) => n + plannedAttention(t, settings, riskSize(t, s, refs)), 0);
    if (load > settings.attention_capacity) out.push({ rule: 'S75', id: it.id, message: `attention humaine prévue ${load} min pour ${settings.attention_capacity} min disponibles : la relecture limitera le débit, pas les agents` });
  }
  // ── Le goulot ne se voit pas dans un total (S135) ──
  // Rubin montre un engagement de 150 h qui tient dans une capacité de 140-197 h et qui est pourtant
  // mauvais : une seule personne sait faire l'IHM, et elle n'a que 14-21 h. **Un total qui tient ne dit
  // rien de la ressource rare.** Mesuré avant d'écrire, et la mesure a trouvé que Tizi faisait déjà ce
  // contrôle, sous un autre nom et pour la ressource qui est rare dans SON modèle : quand les agents
  // codent, le goulot est l'attention humaine, et `S75` compare l'attention prévue d'une itération à
  // `settings.attention_capacity` — « la relecture limitera le débit, pas les agents ».
  //
  // Le trou est ailleurs : `S75` est en forme d'itération, donc **au fil de l'eau personne ne regarde**.
  // Un projet en flux a sa limite d'encours (`S49`), comptée en TÂCHES — et c'est exactement le total
  // qui tient de Rubin : une seule tâche XL confiée à un agent peut saturer la relecture d'une semaine.
  // L'unité du flux est le réapprovisionnement, qui porte son engagement comme une itération porte le
  // sien : c'est le même couple que `S48` et `S49`, l'une par itération et l'autre au fil de l'eau.
  if (settings.cadence === 'flux' && settings.attention_capacity) {
    const parId = new Map(tasks.map(t => [t.id, t]));
    for (const rp of arr(s.replenishments).filter(r => !['terminé', 'abandonné'].includes(r.status))) {
      const siennes = arr(rp.tasks).map(id => parId.get(id)).filter(Boolean);
      if (!siennes.length) continue;
      const load = siennes.reduce((n, t) => n + plannedAttention(t, settings, riskSize(t, s, refs)), 0);
      if (load <= settings.attention_capacity) continue;
      const lourde = siennes.map(t => [t, plannedAttention(t, settings, riskSize(t, s, refs))]).sort((a, b) => b[1] - a[1])[0];
      out.push({ rule: 'S135', id: rp.id, message: `attention humaine prévue ${load} min pour ${settings.attention_capacity} min disponibles sur ${siennes.length} tâche${siennes.length > 1 ? 's' : ''} tirée${siennes.length > 1 ? 's' : ''} (la plus lourde : ${lourde[0].id}, ${lourde[1]} min) : la limite d'encours compte des tâches, pas des minutes de relecture — et c'est la relecture qui limitera le débit, pas les agents` });
    }
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
  // ── Un engagement porte sur un but (S130) ──
  // « The sprint goal is the foundation of a mutual commitment made by the team and the product
  // owner » (Rubin, Essential Scrum, ch. 4) : l'équipe s'engage à l'atteindre, le commanditaire
  // s'engage à ne pas le changer en cours de route. Tizi lisait déjà l'engagement — `gates.mjs` en
  // fait la porte de Govern — et jamais le but sur lequel il porte : on pouvait s'engager, et sur
  // rien. Mesuré avant d'écrire : les douze itérations du dépôt portent toutes le leur, et celui de
  // IT-2 vidé, le lint ne disait rien et la carte se rendait « IT-2 *(proposé)* — — ». Le but n'est
  // dû qu'une fois l'itération investie — des tâches posées, un engagement déclaré, ou l'itération
  // commencée. Une coquille future encore vide ne l'a pas : c'est le dernier moment responsable.
  for (const it of iterations) {
    if (ecrit(it.goal)) continue;
    const n = tasks.filter(t => t.iteration === it.id).length;
    const preuves = [
      n ? `${n} tâche${n > 1 ? 's' : ''} y ${n > 1 ? 'sont posées' : 'est posée'}` : '',
      ecrit(it.commitment?.declared_by) ? `engagement déclaré par ${it.commitment.declared_by}` : '',
      ['en_cours', 'terminé'].includes(it.status) ? `itération ${it.status === 'terminé' ? 'terminée' : 'en cours'}` : '',
    ].filter(Boolean);
    if (preuves.length) out.push({ rule: 'S130', id: it.id, message: `itération sans but (${preuves.join(', ')}) : un engagement porte sur quelque chose — l'équipe s'engage à atteindre le but, le commanditaire s'engage à ne pas le changer en cours de route — et les deux documents de revue s'ouvrent sur « Objectif de l'itération : — »` });
  }
  // Revues et releases (S58, S59)
  const todayStr = new Date().toISOString().slice(0, 10);
  iterations.forEach((it, i, all) => {
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
    for (const it of iterations) {
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

  // ── Le détail n'a pas à être uniforme (S134) ──
  // DEEP, la grille de Rubin au niveau du BACKLOG, là où INVEST est au niveau de la story. Deux de ses
  // quatre lettres inversent l'intuition : `D` dit que le détail ne doit **pas** être uniforme — les
  // éléments proches sont fins, les lointains grossiers — et `P` qu'il est improbable que tout le
  // backlog soit priorisé. Un backlog entièrement détaillé et entièrement priorisé est un **défaut**,
  // pas une qualité : c'est de l'effort dépensé sur ce qui va changer.
  //
  // Mesuré avant d'écrire, et la mesure a **réduit la grille à une seule règle**. Des quatre lettres :
  //   `D` détail au-delà de l'horizon → rien ne le voyait, et c'est cette règle.
  //   `E` émergent → `replenishments` et `iterations` portent le renouvellement ; un backlog qui ne
  //       bouge pas n'est pas un défaut qu'un état puisse constater.
  //   `E` estimé → les tailles de Tizi sont S, M, L, XL, toutes aussi grossières. Il n'y a donc pas de
  //       précision à sur-investir : une taille posée tôt est exactement ce que Rubin demande.
  //   `P` priorisé → `game` (ouverture, milieu, fin) porte l'ordre, et `S61` en vérifie déjà le respect.
  // Écrire quatre règles pour quatre lettres aurait été recopier une grille au lieu de la mesurer.
  //
  // Le signe retenu est l'**example mapping** : une session avec le métier, le développement et le
  // test, et des règles écrites. C'est des heures de trois personnes. Dépensées sur une story qui n'est
  // pas dans la release en cours, c'est le défaut que `D` nomme — et il n'y a rien à reprocher à une
  // taille ou à un rang posés d'avance, qui coûtent une minute et que la grille réclame.
  if (ecrit(settings.release)) {
    for (const st of stories) {
      if (!ecrit(st.release) || st.release === settings.release) continue;
      const session = st.example_map?.session?.date;
      const regles = arr(st.example_map?.rules).length;
      if (!ecrit(session) && !regles) continue;
      const preuves = [
        ecrit(session) ? `session d'example mapping tenue le ${session}` : '',
        regles ? `${regles} règle${regles > 1 ? 's' : ''} écrite${regles > 1 ? 's' : ''}` : '',
      ].filter(Boolean);
      out.push({ rule: 'S134', id: st.id, message: `affinée pour ${st.release} alors que le plan porte sur ${settings.release} (${preuves.join(', ')}) : le détail d'un backlog n'a pas à être uniforme — ce qui est loin se décrit gros, parce qu'il changera avant d'être pris. Un example mapping est une heure du métier, du développement et du test ; la dépenser ici, c'est la dépenser deux fois` });
    }
  }

  // ── La Definition of Done, et ce qu'elle devrait rattraper (S131, S132) ──
  // « Opérer sans Definition of Done forte, c'est délivrer une licence d'accumuler de la dette »
  // (Rubin, *Essential Scrum*, ch. 4). Mesuré sur le dépôt avant d'écrire : `definition_of_done` est
  // écrite dans les quatre plans, apparaît dans les rendus et les handoffs, et **aucune des 131 règles
  // ne la lisait** — aucune porte ne l'exigeait non plus. Un plan pouvait donc être figé, livré et
  // revu sans jamais dire ce que « fini » veut dire.
  //
  // Rien avant `schedule` : une Definition of Done qui manque pendant le découpage n'est pas un trou,
  // c'est une étape pas encore faite. Elle est due dès qu'une itération ou un encours est posé, parce
  // que c'est là qu'on commence à déclarer des choses finies.
  const dod = arr(s.definition_of_done).map(x => String(x ?? '')).filter(x => x.trim());
  if (['schedule', 'govern', 'review'].includes(s.phase) && !dod.length) {
    out.push({ rule: 'S131', id: 'definition_of_done', message: 'plan sans Definition of Done : rien ne dit ce que « fini » veut dire, et chaque tâche le décidera pour elle-même. C\'est ce qui s\'accumule sans se voir — une dette qu\'aucune règle ne peut rattraper après coup, parce qu\'il n\'existe aucune trace de ce qui n\'a pas été fait' });
  }
  // La confrontation que Rubin donne, et que Tizi avait tous les éléments pour faire : **chaque NFR est
  // une cible de premier choix pour la Definition of Done**. Mesuré d'abord, parce que le rapprochement
  // n'était pas évident : `stage` vaut `tests | integration | recette | exploitation`, et AUCUNE de ces
  // valeurs ne désigne l'incrément. On ne peut donc pas demander « cette NFR est-elle dans la DoD ? »
  // par un champ. Mais on peut demander l'inverse, qui est le seul cas qui compte : une NFR que
  // personne ne vérifiera jamais. Si aucune vérification de la conception ne la cible et que la DoD ne
  // la cite pas, elle n'a aucun point de contrôle sur tout le chemin.
  // La citation se lit par le SECOND FIL — un identifiant écrit DANS la phrase, comme `S128` le relit
  // déjà : une ligne de DoD qui dit « p95 sous 2 s (NFR-001) » cite NFR-001, sans qu'il faille changer
  // la forme de la Definition of Done ni apparier deux textes libres, ce qui aurait produit des faux
  // constats qu'on aurait appris à déroger.
  const citeesParLaDoD = new Set(dod.flatMap(refsDans));
  const verifiees = new Set(arr(refs.sad?.verifications).map(v => v.nfr).filter(Boolean));
  for (const n of arr(refs.prd?.non_functional)) {
    if (n.priority === 'wont' || verifiees.has(n.id) || citeesParLaDoD.has(n.id)) continue;
    out.push({ rule: 'S132', id: n.id, message: `NFR que rien ne vérifiera : la conception ne lui donne aucune vérification, et la Definition of Done ne la cite pas${dod.length ? '' : ' (et il n\'y a pas de Definition of Done)'}. Soit la conception la vérifie, soit la DoD la porte à chaque incrément — en la citant dans sa ligne, « … (${n.id}) » — soit elle est déclarée \`priority: wont\` et personne ne l'attend` });
  }
  return out;
}

// ── Couverture ───────────────────────────────────────────────────────────────
// Chaque métrique : identifiant stable, libellé, éléments couverts / total, seuil (en %).
// Seuils par défaut ci-dessous ; un projet les règle dans `coverage_thresholds` de l'état.
// Un seuil non atteint se justifie par une dérogation dans `coverage_waivers` : { metric, reason, approved_by }.
// Les quatre documents que ce catalogue vérifie. L'implémentation et les tests ont leurs propres
// contrôles — `pr-gate.mjs`, `tdd-guard.mjs`, `trace-check.mjs`, `release-matrix.mjs` — et ne passent
// pas par ici : ils vérifient du code et des rapports de CI, pas la cohérence interne d'un document.
export const DOCUMENTS = ['brd', 'prd', 'sad', 'plan'];

export const COVERAGE_DEFAULTS = {
  brd: { br_objective: 100, br_acceptance: 100, objective_br: 100 },
  prd: { fr_ac: 100, fr_goal: 100, br_covered: 100, must_error: 100 },
  sad: { fr_allocated: 100, nfr_response: 100, driver_served: 100 },
  plan: { release_fr_story: 100, security_planned: 100, verification_planned: 100, stories_ready: INDICATIF },
};
const metric = (id, label, items, ok) => ({ id, label, total: items.length, covered: items.filter(ok).length, missing: items.filter(x => !ok(x)).map(x => x.id) });

export function coverage(s, refs = {}) {
  // Un document inconnu n'a pas de métriques : il n'en reçoit pas celles du BRD. L'ancien repli
  // mesurait un état de tests avec `br_objective`, `br_acceptance` et `objective_br` — trois métriques
  // qui n'existent pas pour lui, toutes à « 100 % atteint » faute de collections à compter.
  const doc = s.document ?? 'brd';
  if (!DOCUMENTS.includes(doc)) return [];
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
  // Les seuils et les dérogations passent par `lib/gates.mjs` : une seule logique pour les quatre
  // documents et pour la vérification de release, qui en avait une autre sous d'autres noms.
  const projet = Object.fromEntries(Object.entries(seuilsDe(s)).map(([k, v]) => [k, v === INDICATIF ? 0 : v]));
  const thresholds = { ...COVERAGE_DEFAULTS[doc], ...projet };
  // `0 / 0` ne vaut pas 100 %. L'ancien calcul rendait `pct: 100, met: true` sur une collection vide :
  // un BRD à l'ouverture affichait ses trois métriques « atteint », et la table de couverture du
  // document comme celle du handoff l'écrivaient noir sur blanc. Une porte doit distinguer trois états,
  // pas deux : mesuré et conforme, mesuré et insuffisant, PAS MESURÉ. Le troisième ne s'affiche jamais ✓.
  // Un seuil à 0 tombe dans le troisième : `stories_ready` en a 0 par défaut, et la table affichait
  // « Stories prêtes | 2/5 | 40 % | 0 % | atteint ».
  return list.map(m => {
    const mesure = m.total > 0;
    const pct = mesure ? Math.round((m.covered / m.total) * 1000) / 10 : null;
    const threshold = thresholds[m.id] ?? 100;
    const waiver = derogationDe(s, m.id);
    const { ok, note } = verdictSeuil({ mesure, pct, seuil: threshold, derogation: waiver });
    return { ...m, mesure, pct, threshold, met: ok, note, waiver };
  });
}

// Lignes de la table de couverture — une seule écriture pour les quatre documents, côté document rendu
// comme côté handoff : l'expression était recopiée huit fois, et huit fois elle disait « atteint » sur
// une métrique vide.
// `handoff` : le dossier de passation nomme qui a approuvé la dérogation et laisse tomber la liste des
// manquants, que le document rendu détaille — c'est la seule différence entre les deux tables.
// Trois états dans la colonne de verdict, pas deux : `met` vaut `true`, `false` ou `null`, et `null`
// ne s'écrit jamais « atteint ». La note vient de `verdictSeuil` et dit lequel des trois et pourquoi.
export function coverageRows(cov, { handoff = false } = {}) {
  return cov.map(c => [c.label, `${c.covered}/${c.total}`, c.mesure ? `${c.pct} %` : '—', c.threshold === INDICATIF ? '—' : `${c.threshold} %`,
    c.threshold === INDICATIF ? `_indicatif_${c.mesure ? '' : ' — rien à mesurer'}`
      : c.met === null ? `_non mesuré_${c.note && c.note !== 'non mesuré' ? ` — ${c.note}` : ''}`
        : c.met ? (c.note ? `atteint par dérogation — ${c.note}` : 'atteint')
          : c.note ? `**non atteint** — ${c.note}`
            : `**non atteint**${!handoff && c.missing.length ? ` (manquent : ${c.missing.join(', ')})` : ''}`]);
}

// S54 ne parle que d'une métrique MESURÉE : une collection vide ne se reproche pas ici. Ce qui la rend
// due relève de la phase — « des objectifs sans exigence » se dit à Define, pas à l'ouverture — et
// chaque document a au moins une métrique qui regarde depuis l'amont (`objective_br`, `br_covered`,
// `fr_allocated`, `release_fr_story`) : un dossier vide n'est donc pas silencieux pour autant.
// S54 : un seuil mesuré et non atteint, que rien n'assume. S105 : un seuil qui ÉTEINT la mesure — 0 ne
// compare rien — sans dérogation nommée pour le dire. S106 : une dérogation de seuil qui ne dit pas
// pourquoi, ou qui ne nomme pas son approbateur : elle éteignait le seuil en silence, là où une
// dérogation d'avertissement de forme est signalée depuis le 28 octobre quand elle est muette.
export function coverageFindings(s, refs = {}) {
  const cov = coverage(s, refs);
  const out = cov.filter(m => m.met === false && !m.waiver?.valable)
    .map(m => ({ rule: 'S54', id: `couverture:${m.id}`, message: `${m.label} : ${m.pct} % pour un seuil de ${m.threshold} % (manquent : ${m.missing.slice(0, 8).join(', ')}${m.missing.length > 8 ? '…' : ''}) ; corriger, ou déclarer une dérogation dans \`waivers\` avec sa raison et son approbateur` }));
  for (const m of cov.filter(x => x.mesure && x.met === null && x.threshold !== INDICATIF)) {
    out.push({ rule: 'S105', id: `couverture:${m.id}`, message: `${m.label} : seuil à ${m.threshold} %, qui ne compare rien — la mesure (${m.pct} %) n'est pas jugée, et aucune dérogation nommée ne dit pourquoi. Un seuil à 0 est une mise hors périmètre : elle s'écrit dans \`waivers\` avec sa raison et son approbateur, ou le seuil remonte` });
  }
  // Une dérogation qui ne porte sur aucune métrique connue : elle dort dans l'état et n'assume rien.
  const connues = new Set(cov.map(m => m.id));
  for (const w of derogationsDe(s)) {
    const cle = cleDerogation(w);
    if (!cle || !connues.has(cle)) continue;
    const d = derogationDe(s, cle);
    if (!d.valable) out.push({ rule: 'S106', id: `derogation:${cle}`, message: `dérogation de seuil sur « ${cle} » qui ne dit pas ${d.manque.join(', ni ')} : une dérogation nommée porte sa raison ET son approbateur, sinon c'est un silence qui éteint une mesure` });
  }
  // Les anciens noms de champ. Deux systèmes faisaient la même chose sous deux noms ; un seul s'écrit
  // désormais, les deux se lisent, et le constat dit lequel renommer.
  for (const [vieux, neuf] of [['coverage_thresholds', 'thresholds'], ['coverage_waivers', 'waivers'], ['settings.thresholds', 'thresholds']]) {
    const v = vieux === 'settings.thresholds' ? s?.settings?.thresholds : s?.[vieux];
    if (v && (Array.isArray(v) ? v.length : Object.keys(v).length)) {
      out.push({ rule: 'S107', id: `champ:${vieux}`, message: `\`${vieux}\` est l'ancien nom : les seuils et les dérogations s'écrivent dans \`${neuf}\`, au niveau de l'état, pour les cinq documents. L'ancien nom reste lu — rien ne casse — mais deux noms pour la même chose finissent par porter deux valeurs différentes` });
    }
  }
  return out;
}

// ── Espaces réservés et chiffres non sourcés (emprunt aux règles de cohérence des ADR de hve-core) ──
// S68 : un texte d'élément vivant contient un espace réservé (TODO, TBD, XXX, ???, {{…}}, « à compléter »).
const PLACEHOLDER_RE = /\bTODO\b|\bTBD\b|\bFIXME\b|\bXXX\b|\?\?\?|\{\{[^}]*\}\}|à compléter|à définir plus tard|lorem ipsum/i;
const SKIP_KEYS = new Set(['status', 'lint_waivers', 'decision', 'automation', 'kind', 'type', 'subtype', 'severity', 'lifecycle', 'cadence', 'phase']);
// Les blocs de métadonnées : ce qui n'est pas du contenu du document. `placeholderFindings` les
// écarte depuis toujours, et `LECTURES` s'appuie sur la MÊME liste pour dire quand une règle qui
// parcourt tout le document n'a rien eu à lire — deux listes auraient fini par diverger.
export const HORS_CONTENU = ['governance', 'session', 'questions', 'council_runs', 'refs', 'settings'];
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
  for (const [k, v] of Object.entries(s)) if (!HORS_CONTENU.includes(k)) visit(v, k, k);
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

// Un guide d'entretien est un fichier sur le disque dont l'état ne sait rien : ni qui il visait, ni que
// la personne a été entendue depuis. Au deuxième dossier réel, `guide-SH-02.md` a été écrit le 27 pour
// le directeur, absent — c'était juste ; le 28 il a répondu en direct dans six sources, les deux
// décisions de périmètre que le guide annonçait ont été rendues, et `session.next_action` disait
// toujours « mener les entretiens préparés : guide-SH-02.md ». Deux sessions plus tard, le dossier
// envoyait encore l'utilisateur conduire un entretien qui avait eu lieu.
// La salle courante est celle du dernier échange daté : ses présents, et ses locuteurs, qui sont dans
// la pièce par construction (S91).
export function interviewFindings(s, files = []) {
  const out = [];
  if (!files.length) return out;
  // Les appelants d'avant passaient des noms de fichiers, ceux d'aujourd'hui passent le texte avec :
  // S104 a besoin du contenu. Les deux formes sont acceptées pour ne rien casser au passage.
  const noms = files.map(f => (typeof f === 'string' ? f : f.file));
  // Premier critère, trop étroit : « la personne était dans la salle du dernier échange ». Le bon, donné
  // par l'utilisateur : **un guide devient une source, ou il s'en va.** S'il a reçu les réponses, une
  // source pointe vers lui et il reste pour toujours ; si l'entretien s'est fait dans la conversation,
  // il n'a servi à rien et ne porte rien que l'état n'ait — ses questions viennent des zones d'ombre et
  // de leur `ask_to`, qui restent. Un guide est un OUTIL, pas une trace : ce qui ne disparaît jamais,
  // ce sont les sources, les besoins, les zones et les décisions. Et git garde le fichier.
  // Au deuxième dossier réel : aucune source ne pointait vers `interviews/`, le directeur était
  // locuteur de six sources, et son guide était toujours là — avec la prochaine action qui envoyait
  // conduire son entretien.
  const locuteurs = new Set(arr(s.sources).flatMap(src => arr(src.stakeholders)));
  const recu = f => arr(s.sources).some(src => String(src.path ?? '').endsWith(f));
  const shs = mapOf(s.stakeholders);
  for (const f of noms) {
    const id = f.match(/guide-(SH-\d+)/)?.[1];
    if (!id) continue;
    if (!shs.has(id)) { out.push({ rule: 'S09', id: f, message: `guide d'entretien pour ${id}, qui n'est pas dans la cartographie` }); continue; }
    if (locuteurs.has(id) && !recu(f)) {
      out.push({ rule: 'S96', id: f, message: `guide d'entretien pour ${id}, qui a depuis parlé dans ${arr(s.sources).filter(src => arr(src.stakeholders).includes(id)).length} source(s), et aucune ne vient de ce fichier : l'entretien s'est fait ailleurs, le guide n'a rien reçu et ne porte rien que les zones d'ombre n'aient. Retire-le, et réécris la prochaine action` });
    }
  }
  return out;
}

// ── S104. Un document qui part ne parle pas par adresses ────────────────────
// `questions.md` disait « l'utilisateur est le seul de la chaîne qui n'a pas l'index sous les yeux ».
// C'était faux, et c'est moi qui l'avais écrit : une partie prenante, un relecteur, un approbateur ne
// l'ont JAMAIS vu. Mesuré sur trois relevés de relecture réels, envoyés à trois personnes : 46
// identifiants que le fichier où ils apparaissent ne glose nulle part. Le pire portait la validation
// des cinq seules exigences du dossier — « BR-001 à BR-005 […] Dédé : "Ça me convient." » : on lui dit
// qu'il a validé cinq choses sans lui dire lesquelles. Un autre lui demandait de vérifier ce que
// « BC-002 et BC-007 » disent, et ces deux-là n'apparaissaient nulle part ailleurs dans le fichier.
//
// Le contrôle ne juge pas la FORME de la glose — étiquette, parenthèse, prose : toutes sont bonnes —,
// il demande seulement que l'énoncé de l'élément, tel que l'état le porte, se trouve dans le fichier.
// Un contrôle de forme produirait des faux constats qu'on apprendrait à déroger, ce qui est pire que rien.
// Les deux côtés se réduisent de la MÊME façon : accents, casse, ponctuation et mots courts retirés.
// Première version fautive — les mots courts n'étaient filtrés que dans les mots-clefs, jamais dans le
// fichier, donc la suite « famille deja connue reecrire » ne pouvait jamais se trouver dans
// « une famille deja connue n ait pas a reecrire ». Quatre gloses correctes étaient dénoncées.
const reduit = x => String(x ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(m => m.length > 3);
const motsClefs = texte => reduit(texte).slice(0, 4);
const REF_RE = /\b[A-Z]{2,4}-\d{1,3}\b/g;
// Les identifiants internes d'un texte. S104 s'en sert sur les FICHIERS qui partent ; un message
// composé pour un canal ne passe par aucun fichier, et ne peut donc pas être contrôlé par une règle
// de l'état. `reach-out.mjs` s'en sert pour refuser de composer : même doctrine, autre point d'arrêt.
export const refsDans = texte => [...new Set(String(texte ?? '').match(REF_RE) ?? [])];
export function outgoingFindings(s, fichiers = []) {
  const out = [];
  const index = new Map();
  for (const v of Object.values(s ?? {})) {
    if (!Array.isArray(v)) continue;
    for (const x of v) if (x && typeof x === 'object' && x.id) index.set(x.id, x.name ?? x.statement ?? x.text ?? x.question ?? x.title ?? '');
  }
  for (const { file, text } of fichiers) {
    // Le guide d'entretien est l'exception que `questions.md` nomme : son lecteur est l'intervieweur,
    // qui a le dossier sous les yeux, et il porte la zone visée par chaque question « pour
    // l'intervieweur seulement, ne pas la lire à voix haute ». Ce qui sort vers quelqu'un qui n'a
    // jamais vu le dossier, c'est le relevé de relecture et la liste de contrôle.
    if (/(?:^|\/)guide-/.test(file)) continue;
    const plat = reduit(text).join(' ');
    const nus = [...new Set([...String(text).matchAll(REF_RE)].map(m => m[0]))]
      .filter(id => index.has(id))
      .filter(id => { const mots = motsClefs(index.get(id)); return mots.length >= 2 && !plat.includes(mots.join(' ')); });
    if (!nus.length) continue;
    out.push({ rule: 'S104', id: file, message: `${nus.length} identifiant(s) que ce fichier ne glose nulle part : ${nus.slice(0, 8).join(', ')}${nus.length > 8 ? '…' : ''} — il part chez quelqu'un qui n'a jamais vu le dossier, et une adresse sans son énoncé lui demande de valider ce qu'il ne peut pas lire` });
  }
  return out;
}

// ── 4 et 6. La gouvernance : qui relit, et jusqu'à quand ─────────────────────
// Deux collections que rien ne lisait. `governance.reviewers` est déduite du quadrant — pouvoir ×
// impact — et la question « cette personne a-t-elle déjà été entendue ? » n'entre jamais dans le
// calcul : au deuxième dossier réel, deux relecteurs sur cinq n'avaient jamais parlé. Or une revue
// demande « est-ce fidèle à ce que vous avez dit ? » : qui n'a rien dit n'a rien à vérifier, et le rôle
// ── Les champs qui manquaient (S100 à S103) ─────────────────────────────────
// Trois fois la même faute : la doctrine exigeait une trace, le modèle d'état n'avait pas de champ, et
// l'agent a improvisé en prose là où aucun script ne regarde. `questions.md` dit du changement de
// phase : « ce n'est pas la suite du travail, c'est une porte : IL S'ÉCRIT DANS L'ÉTAT AVEC SA DATE ».
// `phase` était un scalaire nu. Sur le deuxième dossier réel, l'agent a donc écrit quatre lignes de
// COMMENTAIRE YAML — « Discover close le 2026-11-02, porte de sortie à 7 conditions sur 7, passage
// décidé par Dédé (SRC-080) » —, que rien ne lit, que le document rendu ne peut pas reprendre, et qui
// disparaissent à la première réécriture du champ par un outil.

// `gate` était la seule trace que rien ne relisait : l'agent y écrit une phrase, et aucun script au
// monde ne pouvait la contredire. Sur le troisième dossier réel : « 5 conditions sur 7 mesurées
// (status.mjs) », avec deux dérogations nommées. 7 − 5 = 2, donc juste — et c'était un hasard que
// rien ne vérifiait. Or les quatre références de phase disent la même phrase mot pour mot : l'entrée
// porte « l'état de la porte tel que `status.mjs` l'a dit, et CHAQUE condition franchie par dérogation
// avec sa raison ». Le nombre de conditions non tenues et le nombre de dérogations sont donc le même
// nombre, et deux nombres qui doivent coïncider se vérifient. C'est aussi ce qui rend la trace
// relisible plus tard : « 5 sur 7 » seul ne dit pas si la porte en avait sept ou si le catalogue a
// bougé depuis ; « 5 sur 7 » adossé à deux dérogations nommées se tient tout seul.
const COMPTE_PORTE = /(\d+)\s*condition[^.;:]*?\bsur\s*(\d+)/i;
export const comptePorte = e => {
  const m = COMPTE_PORTE.exec(String(e?.gate ?? ''));
  return m ? { tenues: Number(m[1]), mesurees: Number(m[2]) } : null;
};

// Une porte franchie sans trace, et une trace sans son décideur ni sa date.
export function phaseFindings(s) {
  const out = [];
  const log = arr(s.phase_log);
  // Le journal porte deux sortes d'entrées, et un retour ne tient PAS lieu de porte : sans ce filtre,
  // un retour ponctuel écrit depuis Define aurait suffi à faire croire que la porte de Define avait
  // laissé sa trace. Deux mécanismes dans un même champ se distinguent, ou ils se couvrent.
  const portes = log.filter(porteDe);
  for (const { from, to } of portesFranchies(s.document, s.phase)) {
    if (!portes.some(e => e.from === from)) {
      out.push({ rule: 'S100', id: `phase:${from}`, message: `la phase ${PHASE_NOM[from] ?? from} est passée et rien ne dit comment : une porte s'écrit dans \`phase_log\` avec sa date, qui l'a décidée et la source qui le porte — sans quoi on découvre trois sessions plus tard qu'on a changé d'étape sans le savoir (passage vers ${PHASE_NOM[to] ?? to})` });
    }
  }
  for (const e of log) {
    // Un retour ne porte pas de source : il porte la zone d'ombre qui l'a provoqué et sa raison.
    const manque = porteDe(e)
      ? [!String(e.date ?? '').trim() && 'sa date', !String(e.decided_by ?? '').trim() && 'qui l\'a décidée', !String(e.source ?? '').trim() && 'la source qui porte la décision'].filter(Boolean)
      : [!String(e.date ?? '').trim() && 'sa date', !String(e.decided_by ?? '').trim() && 'qui l\'a décidé', !String(e.reason ?? '').trim() && 'pourquoi on revient en arrière'].filter(Boolean);
    if (manque.length) out.push({ rule: 'S101', id: `phase:${e.from ?? '?'}`,
      message: porteDe(e)
        ? `porte franchie sans ${manque.join(', ni ')} : un passage de phase se décide avec l'utilisateur, jamais seul, et la décision se nomme`
        : `retour en arrière écrit sans ${manque.join(', ni ')} : un retour se décide comme une porte, et un journal qui ne dit pas pourquoi on a reculé ne se relit pas` });
    if (!porteDe(e)) continue;   // un retour ne mesure pas de porte : il en vient
    const c = comptePorte(e), derogees = arr(e.waived).length;
    const id = `phase:${e.from ?? '?'}`;
    if (!c) {
      out.push({ rule: 'S124', id, message: String(e.gate ?? '').trim()
        ? `\`gate\` ne dit pas combien de conditions étaient tenues sur combien de mesurées (« ${String(e.gate).trim().slice(0, 60)}${String(e.gate).trim().length > 60 ? '…' : ''} ») : recopie la ligne de \`status.mjs\`, « X condition(s) tenue(s) sur Y mesurée(s) », sinon la trace ne se relit pas — on ne sait plus si la porte en avait Y ou si le catalogue a bougé depuis`
        : 'porte franchie sans dire ce que la porte disait au passage (`gate`) : la ligne de `status.mjs`, « X condition(s) tenue(s) sur Y mesurée(s) ». Sans elle, le journal dit qu\'on est passé et rien ne dit à quel prix' });
    } else if (c.tenues > c.mesurees) {
      out.push({ rule: 'S124', id, message: `\`gate\` annonce ${c.tenues} condition(s) tenue(s) sur ${c.mesurees} mesurée(s) : on ne tient pas plus de conditions que la porte n'en mesure` });
    } else if (c.mesurees - c.tenues !== derogees) {
      const nonTenues = c.mesurees - c.tenues;
      out.push({ rule: 'S124', id, message: `\`gate\` annonce ${c.tenues} condition(s) tenue(s) sur ${c.mesurees}, donc ${nonTenues} non tenue(s), et \`waived\` en nomme ${derogees} : ${nonTenues > derogees ? `${nonTenues - derogees} condition(s) ont été franchies sans que rien ne dise laquelle ni pourquoi` : `${derogees - nonTenues} dérogation(s) de plus que de conditions non tenues`}. Une condition non tenue se dérogue nommément, avec sa raison, ou elle n'est pas franchie` });
    }
  }
  return out;
}

// Une source de parole dont le contenu n'est écrit nulle part. Le modèle ne prévoyait AUCUN champ pour
// ce qui avait été dit : sur le deuxième dossier réel, 92 sources sur 93 — dont 65 entretiens —
// portaient `path: ""` et rien d'autre. `feedback` et `S84` demandent si la personne a relu ce qu'on a
// compris d'elle : on ne fait pas relire ce qui n'existe pas. Le relevé de relecture n'a pu être écrit
// que parce que l'agent avait encore la conversation en mémoire vive, et une reconstitution sur 93 a
// échoué — « SRC-004 : aucun relevé écrit pour cette source ». Après un effacement de contexte, 93.
// Le constat porte sur la collection : nommer 92 sources une par une ne se lit pas.
// `échange écrit` en fait partie, et c'est là qu'il coûte le moins : les mots existent déjà, il n'y a
// qu'à les recopier. Une source dont le contenu tenait dans un fil de messages est précisément celle
// dont personne ne pense à écrire le verbatim, parce qu'on croit que le fil le gardera.
const PAROLE = ['cadrage', 'entretien', 'échange écrit', 'atelier', 'revue', 'décision'];
// Les sources où quelqu'un a PARLÉ et où ce qu'on en a tiré est une interprétation. `décision` en est
// retirée : une décision de l'utilisateur est son propre dernier mot, on ne la lui fait pas relire.
export const RECUEIL_DE_PAROLE = PAROLE.filter(t => t !== 'décision');
export function sourceContentFindings(s) {
  const toutes = arr(s.sources);
  // `note` est le nom que porte déjà le contenu dans le modèle de la conception : on n'impose pas un
  // second nom pour la même chose. `understood` ne compte pas — ce qui se relit, c'est ce qui a été dit.
  const muettes = toutes.filter(x => PAROLE.includes(x.type) && !['quote', 'note', 'path'].some(k => String(x[k] ?? '').trim()));
  if (!muettes.length) return [];
  const noms = muettes.slice(0, 8).map(x => x.id).join(', ');
  return [{ rule: 'S102', id: 'sources', message: `${muettes.length} source(s) de parole sur ${toutes.length} ne portent pas ce qui a été dit, ni dans \`quote\` ni dans un fichier (\`path\`) : ${noms}${muettes.length > 8 ? '…' : ''} — une source dont le contenu n'est écrit nulle part ne se relit pas, et ce qu'elle disait ne survit qu'à la conversation` }];
}

// Une confirmation enregistrée comme source et jamais rattachée à ce qu'elle confirme. Mesuré sur le
// deuxième dossier réel : Samir confirme BC-003 (SRC-086), BC-002 et BC-007 (SRC-087), et aucun des
// trois besoins ne cite ces sources. BC-007 paraît donc reposer sur une voix unique alors que deux
// parties prenantes le portent — et le relevé de relecture, construit depuis `sources`, montrait trois
// besoins dans son récapitulatif quand son corps disait que Samir avait répondu sur cinq.
function elementsIndex(s) {
  const idx = new Map();
  for (const v of Object.values(s ?? {})) {
    if (!Array.isArray(v)) continue;
    for (const x of v) if (x && typeof x === 'object' && x.id) idx.set(x.id, Array.isArray(x.sources) ? x.sources.map(r => r?.ref ?? r) : null);
  }
  return idx;
}
// Un risque porte trois champs d'appréciation depuis l'origine — `likelihood`, `impact`, `response` —
// et AUCUNE règle, dans aucun des quatre documents, ne les lisait. `risks` n'avait qu'un seul lecteur,
// S19, qui vérifie qu'un opposant puissant en a un, pas ce qu'il dit. Au troisième dossier réel, les
// quatre risques étaient écrits avec soin — un texte long et juste, une origine, les éléments liés — et
// les trois champs vides sur les quatre. Un risque sans vraisemblance ni ampleur ne se priorise pas, et
// vide ne veut pas dire faible : ça veut dire non apprécié. Sans piste de traitement, un risque validé
// est une inquiétude consignée. Et ces risques sont les porteurs désignés des zones d'ombre assumées :
// un porteur creux rend la zone au silence qu'elle devait quitter.
export function riskFindings(s) {
  const out = [];
  for (const r of arr(s?.risks).filter(live)) {
    const id = r.id ?? 'risks';
    const manque = [];
    if (!String(r.likelihood ?? '').trim()) manque.push('`likelihood`');
    if (!String(r.impact ?? '').trim()) manque.push('`impact`');
    if (manque.length) {
      out.push({ rule: 'S109', id, message: `risque consigné sans être apprécié (${manque.join(' et ')} vide${manque.length > 1 ? 's' : ''}) : un risque sans vraisemblance ni ampleur ne se priorise pas — et vide ne veut pas dire faible, ça veut dire non apprécié` });
    }
    checkEnum(out, id, 'vraisemblance', r.likelihood);
    checkEnum(out, id, 'ampleur du risque', r.impact);
    if (isValid(r) && !String(r.response ?? '').trim()) {
      out.push({ rule: 'S109', id, message: 'risque validé sans piste de traitement (`response`) : accepter un risque sans dire ce qu\'on en fait le laisse à l\'état d\'inquiétude consignée' });
    }
  }
  return out;
}

// `sans objet` sur le retour à la source veut dire « il n'y a rien à faire relire ici ». Sur un document
// ou une mesure, c'est vrai sans qu'on l'écrive. Sur une décision de l'utilisateur aussi : il ne se fait
// pas relire son propre choix. Sur un échange où quelqu'un a parlé, c'est une affirmation — et elle dit
// que la synthèse qu'on en a tirée ne sera jamais vérifiée auprès de la personne. Au troisième dossier
// réel, dix sources portaient `sans objet` : six décisions, légitimes, et quatre cadrages, dont le tour
// de table qui contenait la phrase mal attribuée ET la source qui l'a corrigée. C'est la seule valeur
// qui éteint S84 sans que personne n'ait rien relu : elle reste permise, et elle porte sa raison.
//
// `corrects` est l'autre moitié. `confirms` pointe vers des ÉLÉMENTS — BC, BR, RG — jamais vers une
// source : rien ne menait du tour de table à l'échange qui en a corrigé la lecture, et qui lira le
// premier dans six mois n'a aucun chemin vers le second. Une source corrigée est par définition la
// première à faire relire : la déclarer « sans objet » se contredit.
// `understood` est ce qu'on REND à la personne en relecture — le gabarit le dit depuis le début : c'est
// « ce qui se corrige quand la citation est juste et la conclusion fausse ». En pratique il a dérivé vers
// le carnet d'analyse de l'agent. Mesuré sur le troisième dossier réel : 52 sources de parole recueillie
// sur 91 portent un renvoi interne, et l'une d'elles explique à quoi sert `present: []` dans des sources
// passées. Montré à la personne, c'est incompréhensible et un peu gênant ; et c'est `review-sources.mjs`
// qui s'en aperçoit, au moment d'envoyer, quand il y a cinquante-deux champs à réécrire.
//
// Le constat porte sur la COLLECTION, et une seule fois. Cinquante-deux constats noieraient les vingt
// autres du dossier, et le défaut n'est pas cinquante-deux fautes indépendantes : c'est une manière
// d'écrire le champ. Une ligne qui dit le compte et nomme les premières, le script nomme le reste.
//
// Il ne porte que sur les types dont la parole REPART vers la personne. Une décision de l'utilisateur ne
// se fait pas relire à son auteur — c'est déjà la doctrine de `S111` —, donc un renvoi interne n'y gêne
// personne : sur le dossier réel, les dix sources de type `décision` sortent du compte, et les quatre
// seuls renvois trouvés dans un `quote` sont toutes des décisions.
//
// Et le seuil est le même que celui du script, volontairement : si la règle était plus clémente que le
// refus, le lint dirait que tout va bien et l'envoi refuserait. C'est le pire des deux mondes.
export function understoodFindings(s) {
  const sales = arr(s?.sources)
    .filter(x => RECUEIL_DE_PAROLE.includes(x.type))
    .map(x => ({ id: x.id, refs: refsDans(`${x.quote ?? ''}\n${x.understood ?? ''}`) }))
    .filter(x => x.refs.length);
  if (!sales.length) return [];
  const total = arr(s?.sources).filter(x => RECUEIL_DE_PAROLE.includes(x.type)).length;
  const montrees = sales.slice(0, 5);
  return [{ rule: 'S118', id: 'sources', message: `${sales.length} source(s) de parole recueillie sur ${total} portent un renvoi interne dans \`quote\` ou \`understood\` (${montrees.map(x => `${x.id} → ${x.refs.slice(0, 3).join(', ')}`).join(' · ')}${sales.length > montrees.length ? ` · et ${sales.length - montrees.length} autre(s)` : ''}) : \`understood\` est ce qu'on REND à la personne en relecture, pas une note à soi-même — elle n'a pas l'index sous les yeux et ne l'aura jamais. \`review-sources.mjs --sh <id> --message\` les nomme toutes, et refuse d'envoyer tant qu'elles sont là` }];
}

export function relectureFindings(s) {
  const out = [];
  const srcs = new Map(arr(s?.sources).map(x => [x.id, x]));
  for (const src of arr(s?.sources)) {
    if (src.feedback === 'sans objet' && RECUEIL_DE_PAROLE.includes(src.type) && !String(src.feedback_motif ?? '').trim()) {
      out.push({ rule: 'S111', id: src.id, message: `relecture déclarée « sans objet » sur une source de type « ${src.type} » sans dire pourquoi (\`feedback_motif\`) : c'est la seule valeur qui éteint S84 sans que personne n'ait rien relu` });
    }
    for (const ref of arr(src.corrects)) {
      if (ref === src.id) { out.push({ rule: 'S112', id: src.id, message: 'déclarée comme correction d\'elle-même : une correction vient d\'un autre échange' }); continue; }
      const cible = srcs.get(ref);
      if (!cible) { out.push({ rule: 'S09', id: src.id, message: `déclarée comme correction de ${ref}, qui n'existe pas dans les sources` }); continue; }
      if (cible.feedback === 'sans objet') {
        out.push({ rule: 'S112', id: ref, message: `corrigée par ${src.id}, et pourtant déclarée « sans objet » en relecture : une source dont on sait que ce qu'on en avait compris était faux est la première à faire relire` });
      }
    }
  }
  return out;
}

// LES RENVOIS, LES DEUX FILS. Un état pointe vers ses propres éléments de deux manières. La première
// est un CHAMP de renvoi — `source`, `sources`, `related`, `origin` —, lisible par une machine. La
// seconde est écrite DANS la phrase : « Ressaisie annuelle : … (SRC-003, Dédé) ». Mesuré sur le
// deuxième dossier réel : 136 renvois par champ, 58 en prose répartis dans treize champs différents,
// et 37 de ces derniers nomment aussi le locuteur — une information que le champ de renvoi ne porte
// pas à cet endroit.
//
// Ce qui a été trouvé en cherchant qui relit ces renvois : presque personne. Sur les ONZE manières
// dont un BRD pointe vers une source, une seule était vérifiée — `business_rules[].sources[].ref`. Les
// dix autres, éprouvées une par une en y mettant un `SRC-997` qui n'existe pas, ne disaient rien. Sur
// ce dossier, 2 renvois sur 194 pointaient vers quelque chose dont l'existence avait été contrôlée.
//
// Le registre ne se code pas en dur : il se DÉDUIT des identifiants que l'état porte, groupés par
// préfixe. C'est ce qui permet à la même règle de servir les quatre documents sans liste à tenir à
// jour, et c'est ce qui tient les trois états — un préfixe dont l'état n'a aucun élément n'a pas de
// registre, donc on ne conclut rien sur `BR-001` dans un BRD. Ne pas savoir n'est pas constater.
export function registresDe(s) {
  const par = new Map();
  const voir = n => {
    if (Array.isArray(n)) return n.forEach(voir);
    if (!n || typeof n !== 'object') return;
    const m = /^([A-Z]{1,4})-\d+$/.exec(String(n.id ?? '').trim());
    if (m) { if (!par.has(m[1])) par.set(m[1], new Set()); par.get(m[1]).add(m[0]); }
    for (const v of Object.values(n)) voir(v);
  };
  voir(s);
  return par;
}

const ID_SEUL = /^([A-Z]{1,4})-\d+$/;
// Les champs qui portent un renvoi, et rien d'autre. Un champ absent de cette liste est de la prose,
// et c'est l'autre fil qui s'en occupe.
const CHAMPS_DE_RENVOI = new Set(['source', 'sources', 'ref', 'origin', 'related', 'concerns',
  'from_needs', 'objectives', 'business_rules', 'evidence', 'goals', 'journeys', 'decider',
  'escalation', 'arbiter', 'ask_to', 'requested_by', 'decided_by', 'owner', 'represented_by',
  'stakeholders', 'present', 'sollicitee_zone', 'zone', 'moved_to', 'related_to']);
// Ce que les appels plus anciens relisent déjà, par `<collection>.<champ>`. Les y relire une seconde
// fois donnerait deux constats pour un seul renvoi mort, et un lint qui se répète se lit moins.
const DEJA_RELUS = new Set(['sources.stakeholders', 'sources.present', 'business_rules.sources',
  'stakeholders.sollicitee_zone',
  'candidate_needs.concerns', 'business_requirements.objectives', 'business_requirements.from_needs',
  'business_requirements.business_rules', 'shadow_zones.arbiter', 'decision_rights.decider',
  'decision_rights.escalation', 'metrics.goal', 'features.goals', 'features.journeys',
  'functional_requirements.origin', 'data_entities.evidence']);

// Un renvoi mort dans un champ de renvoi (S09). La valeur se lit sous trois formes, parce que les
// gabarits en emploient trois : la chaîne nue (`source: SRC-003`), la liste de chaînes
// (`related: [BC-002]`), et l'objet qui porte sa localisation (`sources: [{ ref: SRC-003, location:
// "point 1" }]`). Un champ hétérogène — `related` porte des SRC, des ZO, des BC, des SH, des RG et des
// DD sur le dossier réel — se résout par le préfixe de chaque identifiant, pas par une collection
// décidée d'avance.
export function renvoiFindings(s) {
  const out = [];
  const reg = registresDe(s);
  const valeurs = v => (Array.isArray(v) ? v : [v]).flatMap(x => {
    if (typeof x === 'string') return [x.trim()];
    if (x && typeof x === 'object' && typeof x.ref === 'string') return [x.ref.trim()];
    return [];
  });
  for (const [coll, liste] of Object.entries(s ?? {})) {
    if (!Array.isArray(liste)) continue;
    for (const el of liste) {
      if (!el || typeof el !== 'object') continue;
      for (const [champ, v] of Object.entries(el)) {
        if (!CHAMPS_DE_RENVOI.has(champ) || DEJA_RELUS.has(`${coll}.${champ}`)) continue;
        for (const ref of valeurs(v)) {
          const m = ID_SEUL.exec(ref);
          if (!m || !reg.has(m[1])) continue;        // ni un identifiant, ni un préfixe que l'état connaît
          if (reg.get(m[1]).has(ref)) continue;
          out.push({ rule: 'S09', id: el.id ?? coll, message: `\`${champ}\` renvoie vers ${ref}, qui n'existe pas dans l'état` });
        }
      }
    }
  }
  return out;
}

// LE SECOND FIL : un identifiant écrit DANS la phrase (S128). Rien ne le relisait — un seul endroit
// de tout le code lit un identifiant à l'intérieur d'un texte, `REPONDUE` sur `shadow_zones.resolution`,
// et seulement comme un oui/non : « quelqu'un a répondu, donc quelqu'un a demandé ». Il ne résout
// jamais QUELLE source. Un `(SRC-099, Dédé)` glissé dans le canevas du dossier réel ne changeait pas
// une ligne du lint.
//
// Pourquoi ne pas interdire ce fil plutôt que le vérifier : il sert à quelqu'un qui lit le canevas
// d'une traite, et il porte le NOM de qui a parlé, que le champ de renvoi n'a pas à cet endroit. Le
// supprimer rendrait le document moins lisible pour gagner une cohérence que la règle tient autrement.
//
// La seconde moitié de la règle est la seule qui pouvait dériver en silence : « (SRC-003, Dédé) » est
// une attribution recopiée à la main à côté du registre, et deux écritures de la même chose finissent
// par se contredire. Mesuré avant d'écrire la règle : 37 attributions en prose sur le dossier réel,
// 37 qui concordent. La règle verrouille donc une propriété VRAIE au moment où elle l'est, elle ne
// répare pas un dégât — et c'est le bon moment pour la poser.
//
// La limite, écrite plutôt que cachée : un identifiant d'une AUTRE initiative cité en prose — la
// décision d'une initiative mère, par exemple — se lit ici comme mort, puisque le registre est celui
// de cet état. C'est à cela que sert la dérogation nommée, et c'est préférable au silence : une
// citation qu'on ne peut pas résoudre est une citation que le lecteur ne peut pas suivre.
const EN_PROSE = /\b([A-Z]{1,4})-\d+\b/g;
const ATTRIBUTION = /\(([A-Z]{1,4}-\d+)\s*,\s*([^),]{2,40})\)/g;
export function proseFindings(s) {
  const out = [];
  const reg = registresDe(s);
  const noms = new Map(arr(s?.stakeholders).map(sh => [sh.id, String(sh.name ?? '').trim()]));
  const srcs = new Map(arr(s?.sources).map(x => [x.id, x]));
  const dit = (chemin, texte) => {
    for (const m of texte.matchAll(EN_PROSE)) {
      const [ref, prefixe] = [m[0], m[1]];
      if (!reg.has(prefixe) || reg.get(prefixe).has(ref)) continue;
      out.push({ rule: 'S128', id: chemin, message: `cite ${ref} dans son texte, et ${ref} n'existe pas dans l'état : un renvoi écrit dans la phrase se suit comme les autres, et celui-là ne mène nulle part` });
    }
    for (const m of texte.matchAll(ATTRIBUTION)) {
      const [, ref, qui] = m;
      const src = srcs.get(ref);
      if (!src) continue;                       // déjà dit juste au-dessus, et une seule fois suffit
      const parlants = arr(src.stakeholders);
      if (!parlants.length) {
        out.push({ rule: 'S128', id: chemin, message: `attribue ${ref} à « ${qui.trim()} » dans son texte, et ${ref} ne porte aucun locuteur (\`stakeholders\`) : le nom écrit à la main est la seule trace de qui a parlé, et rien ne le confirme` });
        continue;
      }
      const attendus = parlants.map(p => noms.get(p) ?? p);
      if (attendus.some(n => n && qui.trim().toLowerCase().includes(String(n).toLowerCase()))) continue;
      out.push({ rule: 'S128', id: chemin, message: `attribue ${ref} à « ${qui.trim()} » dans son texte, quand le registre donne ${attendus.join(', ')} : la même parole est écrite deux fois, et les deux écritures se contredisent` });
    }
  };
  const voir = (n, chemin) => {
    if (typeof n === 'string') return dit(chemin, n);
    if (Array.isArray(n)) return n.forEach(x => voir(x, chemin));
    if (!n || typeof n !== 'object') return;
    for (const [k, v] of Object.entries(n)) {
      if (CHAMPS_DE_RENVOI.has(k)) continue;          // l'autre fil, et S09 s'en charge
      voir(v, chemin ? `${chemin}.${k}` : k);
    }
  };
  voir(s, '');
  return out;
}

// Une coordonnée n'a rien à faire dans `state.yaml`. Ce fichier se commite, `freeze-version.mjs` en
// fige une copie en lecture seule sous `versions/`, et d'une version figée rien ne se reprend : une
// adresse écrite là y reste. Le champ dit donc par quoi la personne se joint ; l'adresse, le numéro ou
// l'identifiant vivent dans `contacts.yaml`, à côté de l'état, que `.gitignore` exclut. Le handoff est
// déjà hors de danger — `build-handoff.mjs` ne retient que `id`, `name`, `role`, `represents`, `status`.
const COORDONNEE = [[/@/, 'une adresse'], [/(?:\+|\b0)[\d .\-()]{8,}/, 'un numéro'], [/https?:\/\//, 'un lien']];
// `contacts` porte les trois états, comme partout ailleurs : `undefined`, personne n'a regardé le
// disque — on ne conclut rien ; `null`, regardé et aucun fichier ; un objet, regardé et le voici.
// « On n'a pas regardé » n'est pas « il n'y a rien », et c'est le second qui se reproche.
export function contactFindings(s, contacts) {
  const out = [];
  for (const sh of arr(s?.stakeholders)) {
    const canal = String(sh.joignable_par ?? '').trim();
    if (!canal) continue;              // ne pas savoir joindre quelqu'un est un fait, pas une faute
    const porte = COORDONNEE.find(([re]) => re.test(canal));
    if (porte) {
      out.push({ rule: 'S114', id: sh.id, message: `\`joignable_par\` porte ${porte[1]} : ce champ dit par quoi on la joint, pas avec quoi — l'état se commite et \`freeze-version.mjs\` en fige une copie sous \`versions/\`, d'où rien ne se reprend. La coordonnée va dans \`contacts.yaml\`, à côté de l'état, que \`.gitignore\` exclut` });
      continue;                        // le canal est illisible : le confronter à `contacts.yaml` n'apprendrait rien
    }
    checkEnum(out, sh.id, 'canal de contact', canal);
    if (contacts === undefined) continue;
    if (contacts === null) {
      out.push({ rule: 'S114', id: sh.id, message: `déclarée joignable par « ${canal} » et aucun \`contacts.yaml\` à côté de l'état : le canal est annoncé, la coordonnée n'existe nulle part — personne ne peut la joindre` });
    } else if (!String(contacts[sh.id] ?? '').trim()) {
      out.push({ rule: 'S114', id: sh.id, message: `déclarée joignable par « ${canal} », et \`contacts.yaml\` ne porte rien à son identifiant : le canal est annoncé, la coordonnée n'y est pas` });
    }
  }
  // Le dossier peut écrire à quelqu'un, il a quelque chose à lui demander, et rien n'est jamais parti.
  // Sur le deuxième dossier réel, l'utilisateur a donné l'adresse de Toto au deuxième message. L'agent a
  // fait la moitié du travail, proprement : gabarit copié, adresse écrite dans `contacts.yaml`, ligne
  // ajoutée au `.gitignore`, exclusion vérifiée, `joignable_par: courriel` posé sur la fiche. Puis plus
  // rien — `reach-out.mjs` n'a pas été lancé une seule fois sur les trois sessions, et le statut est
  // resté `à interroger`. Ce qui l'attendait s'il avait essayé, deux refus dans l'ordre : S126, rien
  // n'autorise d'écrire, puis `initiative.requested_by` vide. Les deux sont justes et les deux se
  // lèvent avec UNE question à l'utilisateur ; aucune n'a été posée. Le refus d'un script dit ce qui
  // manque, il ne dit pas de renoncer.
  //
  // Les quatre conditions valent ensemble, et chacune retire une raison légitime de n'avoir rien
  // envoyé : la forme du canal porte de l'écrit, donc l'agent peut composer lui-même ; la coordonnée
  // est là, donc il sait où ; une zone d'ombre ouverte lui est adressée, donc il a quelque chose à
  // demander ; et le statut n'est ni `sollicitée` ni `interrogée` ni `non disponible`, donc ce n'est ni
  // une question en vol, ni une réponse reçue, ni un renoncement écrit. Ne rien savoir du canal d'une
  // personne est un fait, pas une faute — c'est tout savoir et ne rien faire qui se reproche.
  for (const sh of arr(s?.stakeholders)) {
    if (sh.status !== 'à interroger') continue;
    const canal = String(sh.joignable_par ?? '').trim();
    if (!canal || !formeDuCanal(canal)?.ecrit) continue;
    if (!contacts || !String(contacts[sh.id] ?? '').trim()) continue;
    if (String(sh.sollicitee_le ?? '').trim() || zonesSollicitees(sh).length) continue;
    const pour = arr(s?.shadow_zones).filter(z => z.status === 'ouverte' && z.ask_to === sh.id).map(z => z.id);
    if (!pour.length) continue;
    out.push({ rule: 'S127', id: sh.id, message: `joignable par « ${canal} », sa coordonnée est dans \`contacts.yaml\`, ${pour.length > 1 ? `${pour.length} questions ouvertes lui sont adressées` : 'une question ouverte lui est adressée'} (${pour.join(', ')}) — et aucune sollicitation n'est jamais partie. Tout ce qu'il faut pour écrire est là : \`reach-out.mjs --sh ${sh.id}\`. Si le script refuse, son refus nomme ce qui manque, et ce qui manque est une question à poser à l'utilisateur, pas une raison de renoncer` });
  }
  for (const id of Object.keys(contacts ?? {})) {
    if (!arr(s?.stakeholders).some(sh => sh.id === id)) {
      out.push({ rule: 'S09', id, message: 'coordonnée dans `contacts.yaml` à un identifiant qui n\'est pas une partie prenante de l\'état : une coordonnée qui ne désigne personne ne sert à rien, et elle a pu être recopiée de travers' });
    }
  }
  return out;
}

// Le champ `sollicitee_le` n'a qu'un lecteur, et c'est ici. `sollicitationEtat` plus haut en tire
// l'état ; cette règle refuse les deux manières de l'écrire pour rien : le statut sans la date, qui
// ne se vérifie pas, et la sollicitation sans canal, qui ne dit pas par où elle serait partie.
export function sollicitationFindings(s) {
  const out = [];
  for (const sh of arr(s?.stakeholders)) {
    if (sh.status !== 'sollicitée') {
      // Une date sans le statut qui va avec : soit la personne a répondu et le champ est un reste,
      // soit le statut a été écrasé. Dans les deux cas la date ne se lit plus, et elle a l'air de dire
      // quelque chose. Sur `interrogée`, c'est normal : elle garde la trace de quand on a écrit.
      if (String(sh.sollicitee_le ?? '').trim() && !['interrogée', 'non disponible'].includes(sh.status)) {
        out.push({ rule: 'S115', id: sh.id, message: `porte une date de sollicitation et le statut « ${sh.status ?? 'absent'} » : la date ne se lit que sur « sollicitée », ailleurs elle donne l'air d'une question en vol qui n'en est pas une` });
      }
      continue;
    }
    if (!JOUR.test(String(sh.sollicitee_le ?? '').trim())) {
      out.push({ rule: 'S115', id: sh.id, message: 'déclarée « sollicitée » sans dire quand (`sollicitee_le`, AAAA-MM-JJ) : c\'est toi qui écris le champ, et une sollicitation qu\'on ne peut pas vérifier est une case cochée — sans la date elle compte comme si personne ne lui avait jamais écrit' });
    }
    if (!String(sh.joignable_par ?? '').trim()) {
      out.push({ rule: 'S115', id: sh.id, message: 'déclarée « sollicitée » sans dire par quoi (`joignable_par`) : une question partie sans canal ne se relance pas, et personne ne sait où aller chercher la réponse' });
    }
  }
  // Une question qu'on a laissée en vol au-delà du seuil. Ce n'est pas un reproche sur le délai — c'est
  // qu'au-delà, « non mesuré » cesse d'être une réponse acceptable : il faut relancer, ou renoncer en
  // le disant. Trois issues et pas deux, et c'est l'utilisateur qui tranche, pas l'agent : écrire à
  // quelqu'un qui ne répond pas, ou renoncer sur lui, n'est pas une décision d'outil.
  for (const sh of arr(s?.stakeholders)) {
    if (sollicitationEtat(sh, s?.sources) !== 'attente') continue;
    // Les seuils du canal par lequel la question est PARTIE : une question laissée deux jours sur une
    // messagerie est déjà en souffrance là où un courriel vient d'arriver.
    const { signaler, agir } = seuilsRelance(s, sh.joignable_par);
    const jours = joursDepuis(sh.sollicitee_le);
    if (jours <= agir) continue;
    out.push({ rule: 'S117', id: sh.id, message: `question en vol depuis ${jours} jour(s), au-delà du seuil de ${agir} (\`settings.relance.agir\`) : ce n'est plus une question qui vit, c'est une question que personne ne suit, et la porte cessait de la compter. Trois issues, et c'est l'utilisateur qui tranche : attendre encore en le disant, relancer une fois (\`reach-out.mjs --relance\`), ou renoncer — \`non disponible\` avec son motif. Le premier seuil, celui qui dit seulement de le signaler, est à ${signaler} jour(s)` });
  }
  // Renoncer sur quelqu'un se dit, et dit lequel des quatre. Même famille que `envoyé` sans date : c'est
  // l'agent qui écrit le champ, et `non disponible` sans raison est une case cochée. Deux conséquences
  // que le catalogue tient ailleurs et qu'il faut rappeler ici : le statut reste dans `NON_ENTENDU`,
  // donc renoncer N'ÉTEINT RIEN — S94 et S83 continuent de dire que sa voix manque, parce qu'un choix
  // de notre part n'est pas une réussite du dossier. Et un REFUS est lui-même une parole : si elle
  // écrit « je préfère ne pas répondre », ce sont ses mots, et ils se consignent comme tels.
  for (const sh of arr(s?.stakeholders)) {
    const motif = String(sh.indisponible_motif ?? '').trim();
    if (sh.status === 'non disponible' && !motif) {
      out.push({ rule: 'S116', id: sh.id, message: 'déclarée « non disponible » sans dire pourquoi (`indisponible_motif`) : le mot couvre quatre situations — elle n\'a jamais répondu, elle a refusé, elle est absente, ou nous avons renoncé —, et seule la dernière est de notre faute. Les confondre efface celle qui nous concerne' });
    }
    if (!motif) continue;
    if (sh.status !== 'non disponible') {
      out.push({ rule: 'S116', id: sh.id, message: `porte un motif d'indisponibilité et le statut « ${sh.status ?? 'absent'} » : le motif ne se lit que sur « non disponible », ailleurs il donne l'air d'un renoncement qui n'a pas eu lieu` });
      continue;
    }
    checkEnum(out, sh.id, 'motif d\'indisponibilité', motif);
    // Un refus est SA parole, et une parole se cite. Sans aucune source où elle parle, « elle a refusé »
    // est une affirmation d'un tiers sur elle — exactement ce que S110 refuse pour une représentation,
    // et S90 pour une décision rendue en son nom.
    if (motif === 'refus' && !arr(s?.sources).some(x => arr(x.stakeholders).includes(sh.id))) {
      out.push({ rule: 'S116', id: sh.id, message: 'déclarée avoir refusé, et aucune source ne porte sa parole : un refus est ce qu\'elle a dit, et ça se cite. Rapporté par un tiers, c\'est une affirmation sur elle — consigne ses mots, ou dis que le refus est rapporté' });
    }
  }
  // `sollicitee_le` dit QUAND, `sollicitee_zone` dit QUOI. Les deux ou aucun : une sollicitation qui ne
  // dit pas ce qu'elle demandait est inexploitable au tour suivant — c'est ce qui forçait le message de
  // suite à dire « si c'est la même question que la dernière fois, c'est que j'ai mal lu votre réponse »,
  // faute de pouvoir le savoir. L'ambiguïté était rendue à la personne, qui n'a rien à voir là-dedans.
  // Le champ porte une zone ou plusieurs : un message peut emporter une liste de précisions
  // indépendantes, et chacune se vérifie comme si elle était partie seule — exister, et être adressée
  // à elle. Grouper ne relâche aucun des deux contrôles.
  for (const sh of arr(s?.stakeholders)) {
    const quand = String(sh.sollicitee_le ?? '').trim();
    const quoi = zonesSollicitees(sh);
    if (quand && !quoi.length) {
      out.push({ rule: 'S115', id: sh.id, message: `sollicitée le ${quand} sans dire sur quoi (\`sollicitee_zone\`) : au tour suivant, rien ne permet de savoir si sa réponse portait sur la question posée — et c'est à elle qu'on finit par demander de le deviner` });
    } else if (quoi.length && !quand) {
      out.push({ rule: 'S115', id: sh.id, message: `porte \`sollicitee_zone: ${quoi.join(', ')}\` sans date de départ (\`sollicitee_le\`) : une question qu'on dit partie sans dire quand ne se relance pas et ne compte pour rien` });
    }
    for (const ref of quoi) {
      const zone = arr(s?.shadow_zones).find(z => z.id === ref);
      if (!zone) { out.push({ rule: 'S09', id: sh.id, message: `sollicitée sur ${ref}, qui n'est pas une zone d'ombre de l'état` }); continue; }
      // Une question posée à quelqu'un d'autre, envoyée à elle : la zone dit à qui elle s'adresse, et
      // c'est tout l'objet de S94 — une question SUR quelqu'un n'est pas une question À quelqu'un.
      if (zone.ask_to && zone.ask_to !== sh.id) {
        out.push({ rule: 'S115', id: sh.id, message: `sollicitée sur ${ref}, qui est adressée à ${zone.ask_to} (\`ask_to\`) : on lui a posé la question de quelqu'un d'autre, et sa réponse sera consignée comme si elle valait pour l'autre` });
      }
    }
  }
  // Le deuxième tour d'un entretien par canal. La personne est `interrogée` et porte une date d'écrit :
  // l'état se lit en comparant cette date à celle de sa dernière source. Si aucune de ses sources ne
  // porte de date, la comparaison est impossible — et c'est le seul cas où le dossier contient la
  // réponse sans pouvoir le prouver. On ne devine pas : on dit que la mesure manque et laquelle.
  for (const sh of arr(s?.stakeholders)) {
    if (sh.status !== 'interrogée' || !JOUR.test(String(sh.sollicitee_le ?? '').trim())) continue;
    const siennes = arr(s?.sources).filter(x => arr(x.stakeholders).includes(sh.id));
    if (!siennes.length) {
      out.push({ rule: 'S115', id: sh.id, message: `déclarée « interrogée » et écrite le ${sh.sollicitee_le}, et aucune source ne la porte comme locutrice : le statut dit qu'elle a parlé, le dossier ne garde rien de ce qu'elle a dit` });
    } else if (!siennes.some(x => JOUR.test(String(x.date ?? '').trim()))) {
      out.push({ rule: 'S115', id: sh.id, message: `écrite le ${sh.sollicitee_le}, et aucune de ses ${siennes.length} source(s) ne porte de date : on ne peut pas savoir si elle a répondu depuis — donc ni relancer, ni enchaîner. Date la source qui vient d'elle` });
    }
  }
  return out;
}

// Une zone d'ombre portait sa question et son destinataire, jamais ce qui lui était arrivé. `status`
// disait « ouverte », et « ouverte » couvrait deux situations que rien ne séparait : jamais demandée,
// et demandée trois fois sans réponse. Sur le premier dossier réel, l'agent a reposé la même question
// cinq fois en deux jours — « les 150 dossiers, ça fait combien de familles ? » aux tours 175, 178 et
// 179 — et la zone est restée « ouverte », sa `resolution` vide : il reconstruisait sa question depuis
// l'état à chaque tour, et une zone ouverte avait l'air neuve. `sollicitee_zone` dit ce qui est parti
// PAR ÉCRIT, et se porte sur la personne ; de vive voix aucun script n'exécute rien, et c'est
// justement le canal par lequel ces cinq questions sont passées. La trace va donc sur la QUESTION,
// quel que soit le canal : c'est elle qu'on pose, et c'est elle qui se répète.
// Une résolution qui nomme une source dit que quelqu'un a répondu — donc que quelqu'un a demandé.
const REPONDUE = /\bSRC-\d+/;

// Ce que `reach-out.mjs` et `review-sources.mjs --message` refusent désormais de composer sans elle. La
// consigne existait dans `SKILL.md` — « demande à l'utilisateur avant la première prise de contact :
// l'option est la sienne, pas celle de la personne au bout, qui n'a rien choisi » — et rien ne la
// tenait : le script composait, et personne ne savait si la question avait été posée. Un script ne peut
// pas calculer un DROIT, et ce n'est pas son rôle : le consentement des personnes interrogées est la
// responsabilité de l'utilisateur. Il peut vérifier que sa décision est ÉCRITE, comme pour `waived` et
// `lint_waivers` — et une autorisation sans date ne se vérifie pas.
export function autorisationFindings(s) {
  const out = [];
  for (const sh of arr(s?.stakeholders)) {
    for (const [i, a] of autorisationsDe(sh).entries()) {
      if (!a.outil) {
        out.push({ rule: 'S126', id: sh.id, message: `autorisation n° ${i + 1} de \`contact_autorise\` sans dire par quel outil (\`outil\`) : autoriser « un contact » n'autorise rien de précis — un courriel n'est pas un WhatsApp sur un numéro personnel` });
        continue;
      }
      checkEnum(out, sh.id, 'canal de contact', a.outil);
      if (!JOUR.test(a.le)) {
        out.push({ rule: 'S126', id: sh.id, message: `autorisation d'écrire par « ${a.outil} » sans date lisible (\`le\`, AAAA-MM-JJ${a.le ? `, et non « ${a.le} »` : ''}) : une autorisation qu'on ne peut pas situer dans le temps ne se vérifie pas, et une décision invérifiable est une case cochée` });
      }
    }
    // Quelque chose est parti, et l'état ne dit pas que ça avait été autorisé. `joignable_par` vide est
    // l'affaire de S115, et un canal sans écrit n'a pas d'autorisation à demander : de vive voix, c'est
    // l'utilisateur qui parle, et il était dans la pièce.
    const canal = String(sh?.joignable_par ?? '').trim();
    const parti = sh?.status === 'sollicitée' || ecrit(sh?.sollicitee_le) || zonesSollicitees(sh).length;
    if (!parti || !canal || !formeDuCanal(canal).ecrit) continue;
    if (autorisationsDe(sh).some(a => a.outil === canal.toLowerCase())) continue;
    out.push({ rule: 'S126', id: sh.id, message: `sollicitée par « ${canal} » sans que rien n'autorise de lui écrire par cet outil (\`contact_autorise\`) : l'option est celle de l'utilisateur, pas celle de la personne au bout, qui n'a rien choisi. Sa décision s'écrit — \`- { outil: ${canal.toLowerCase()}, le: "AAAA-MM-JJ" }\` — et par OUTIL, parce qu'autoriser un courriel n'autorise pas un message sur un numéro personnel` });
  }
  // Les connecteurs déclarés suivent la même énumération que les outils : un connecteur nommé hors
  // table ne correspond à rien qu'un `joignable_par` puisse désigner.
  for (const c of connecteursDe(s) ?? []) checkEnum(out, 'settings', 'canal de contact', c);
  return out;
}

export function questionPoseeFindings(s) {
  const out = [];
  const zones = arr(s?.shadow_zones);
  const seuil = seuilRepetitions(s);
  for (const z of zones) {
    const passages = passagesPosee(z);
    const fois = foisPosee(z);
    // Le champ s'écrit à la main dès que la question sort de la bouche de l'agent : une entrée sans
    // date ni canal ne se compte pas et ne se relit pas, et une trace invérifiable est une case cochée.
    for (const [i, f] of passages.entries()) {
      const quand = String(f.date ?? '').trim();
      const canal = String(f.canal ?? '').trim();
      if (!JOUR.test(quand)) {
        out.push({ rule: 'S119', id: z.id, message: `passage n° ${i + 1} de \`posee\` sans date lisible (\`date\`, AAAA-MM-JJ${quand ? `, et non « ${quand} »` : ''}) : une question dont on dit qu'elle est partie sans dire quand ne compte ni pour la répétition ni pour l'attente` });
      }
      if (!canal) {
        out.push({ rule: 'S119', id: z.id, message: `passage n° ${i + 1} de \`posee\` sans dire par quoi (\`canal\`) : de vive voix ou par écrit n'engage ni la même attente ni la même trace — et sans le canal, rien ne distingue une question dite d'une question envoyée` });
      }
      checkEnum(out, z.id, 'canal de contact', canal);
    }
    // Trois fois sans réponse, ce n'est plus une question : c'est un constat. Reposer une quatrième
    // fois use la personne et ne produit rien — la zone s'assume avec sa raison, ou l'utilisateur
    // tranche. L'agent ne choisit ni l'un ni l'autre : renoncer à savoir n'est pas une décision d'outil.
    if (z.status === 'ouverte' && fois.length >= seuil) {
      const dates = fois.map(f => String(f.date ?? '').trim()).filter(Boolean).sort();
      out.push({ rule: 'S120', id: z.id, message: `posée ${fois.length} fois${dates.length ? `, la dernière le ${dates[dates.length - 1]}` : ''}, et toujours sans réponse : au-delà de ${seuil} fois ce n'est plus une question qui vit, c'est un constat — la reposer use la personne sans rien produire. Deux issues, et c'est l'utilisateur qui tranche : l'assumer (\`status: assumée\` avec sa raison, portée par un risque ou une hypothèse), ou décider autrement` });
    }
  }
  // Un constat de collection, comme S118 : sur un dossier qui n'a jamais tenu le champ, la trace manque
  // sur soixante-dix zones, et soixante-dix lignes de lint noieraient tout le reste. Une ligne, avec le
  // compte et quelques exemples, dit la même chose et se déroge d'un seul geste à la racine.
  const repondues = zones.filter(z => REPONDUE.test(String(z.resolution ?? '')));
  const muettes = repondues.filter(z => !foisPosee(z).length);
  if (muettes.length) {
    out.push({ rule: 'S121', id: 'shadow_zones', message: `${muettes.length} zone(s) sur ${repondues.length} dont la résolution nomme une source ne disent pas quand la question est partie (\`posee\`) : ${muettes.slice(0, 5).map(z => z.id).join(', ')}${muettes.length > 5 ? ` et ${muettes.length - 5} autre(s)` : ''}. Quelqu'un a répondu, donc quelqu'un a demandé — et rien ne dit quand, ni par quoi, ni combien de fois. C'est la seule chronologie que le dossier pourrait avoir : sans elle, on ne sait pas ce qui a été appris quand, ni depuis combien de temps une question attend` });
  }
  // Une sollicitation écrite s'inscrit à DEUX endroits : sur la personne — `sollicitee_zone` dit sur
  // quoi on lui a écrit — et sur la question — `posee` dit qu'elle est partie, avec sa date et son
  // canal. `reach-out.mjs` imprime les deux lignes à ajouter, mais c'est l'agent qui les écrit, et il
  // peut n'en écrire qu'une. L'état se contredit alors en silence : quelqu'un a été sollicité sur une
  // question dont la liste des départs est vide. Aucune devinette ici, deux champs du même état — et
  // c'est la moitié du défaut que `question-guard.mjs` ne peut pas voir, puisqu'elle est par écrit.
  // ── « La question ne se posait pas » est une affirmation (S136) ──
  // Quatre statuts depuis le 7 novembre 2026, et c'est une décision de l'utilisateur. Avant, une
  // question hors sujet se fermait en `levée` avec sa raison : un abus de langage, parce que « on a
  // trouvé la réponse » et « la question ne se posait pas » ne sont pas la même chose. Les confondre
  // rendait la mesure du council illisible — on ne pouvait plus compter combien de ses questions
  // étaient hors sujet, alors que c'est précisément ce qui dit s'il vaut le coup.
  //
  // `sans_objet` n'est pas un échec du council : une question écartée après examen a fait son travail,
  // celui d'être posée. Mais c'est une affirmation sur le monde — « ça ne se posait pas » —, et une
  // affirmation porte sa raison, comme une dérogation nommée et comme une zone assumée. Sans elle, le
  // statut devient la sortie commode de toute question gênante, et le compte qu'il permet ne vaut plus
  // rien : on aurait remplacé un abus de langage par un autre.
  for (const z of zones) {
    if (z.status !== 'sans_objet' || ecrit(z.resolution)) continue;
    out.push({ rule: 'S136', id: z.id, message: 'déclarée « sans objet » sans dire pourquoi la question ne se posait pas (`resolution`) : c\'est une affirmation sur le monde, pas une fermeture — et sans sa raison, le statut devient la sortie commode de toute question gênante. Une question écartée après examen n\'est pas un échec : elle a fait son travail, celui d\'être posée' });
  }
  const parZone = new Map(zones.map(z => [z.id, z]));
  for (const sh of arr(s?.stakeholders)) {
    for (const zid of zonesSollicitees(sh)) {
      const z = parZone.get(zid);
      if (!z || passagesPosee(z).length) continue;
      out.push({ rule: 'S125', id: z.id, message: `${sh.id ?? 'une partie prenante'} porte \`sollicitee_zone: ${zid}\`${ecrit(sh.sollicitee_le) ? ` et \`sollicitee_le: ${sh.sollicitee_le}\`` : ''}, et \`posee\` est vide : on a inscrit sur la personne ce qu'on n'a pas inscrit sur la question. Un passage par départ — \`- { date: "AAAA-MM-JJ", canal: "…" }\` —, sinon rien ne dit combien de fois celle-ci est partie, et une zone ouverte a l'air neuve` });
    }
  }
  return out;
}

// Une entrée de la cartographie peut valoir plusieurs personnes, et rien ne le disait. Sur le troisième
// dossier réel, SH-04 n'a pas de nom — « membre(s) du bureau assurant la saisie, non présent(s) au
// cadrage » — et le point d'étape l'a comptée pour une : « 3 partie(s) prenante(s) entendue(s) sur 4 ».
// Un compte d'entrées donné pour un compte de personnes, lu tel quel par la dimension `couverture` de
// la porte de synthèse. Deux manques, et chacun rend le total faux d'une façon différente : l'entrée
// ne dit pas combien elle vaut (S122), ou elle le dit et son statut parle pour tout le monde (S123).
// Une entrée nommée n'a rien à écrire : un nom désigne une personne. Rien à vérifier avant Discover,
// la carte n'existe pas encore — le tour de table ne donne que des noms et des fonctions.
export function effectifFindings(s) {
  const out = [];
  if (!['discover', 'define', 'govern'].includes(s?.phase)) return out;
  for (const sh of arr(s?.stakeholders)) {
    const eff = effectifDe(sh), vus = entendusDe(sh);
    if (eff === null) {
      if (ecrit(sh?.personnes)) {
        out.push({ rule: 'S122', id: sh.id, message: `\`personnes: ${String(sh.personnes).trim()}\` n'est pas un nombre de personnes : un entier d'au moins 1, ou rien du tout` });
      } else {
        out.push({ rule: 'S122', id: sh.id, message: 'sans nom, et sans dire combien de personnes elle vaut (`personnes`) : une entrée qui ne désigne personne peut en valoir une ou cinq, et la couverture la compte pour une. Un nom, ou un effectif' });
      }
      continue;
    }
    if (vus === null) {
      if (ecrit(sh?.entendues)) {
        out.push({ rule: 'S123', id: sh.id, message: `\`entendues: ${String(sh.entendues).trim()}\` n'est pas un nombre de personnes entendues : un entier d'au moins 0, ou rien du tout` });
      } else {
        out.push({ rule: 'S123', id: sh.id, message: `vaut ${eff} personnes et se déclare « interrogée » sans dire combien d'entre elles ont parlé (\`entendues\`) : un statut ne se divise pas, et en avoir entendu une sur ${eff} n'est pas avoir entendu le groupe` });
      }
      continue;
    }
    if (vus > eff) {
      out.push({ rule: 'S123', id: sh.id, message: `${vus} personne(s) entendue(s) pour un effectif de ${eff} : l'un des deux nombres est faux` });
    } else if (vus > 0 && sh.status !== 'interrogée') {
      out.push({ rule: 'S123', id: sh.id, message: `${vus} personne(s) entendue(s) et un statut qui dit le contraire (\`${sh.status ?? 'absent'}\`) : dès qu'une seule a parlé, l'entrée est « interrogée » et \`entendues\` dit combien` });
    }
  }
  return out;
}

export function confirmationFindings(s) {
  const out = [];
  const idx = elementsIndex(s);
  for (const src of arr(s.sources)) {
    for (const ref of arr(src.confirms)) {
      if (!idx.has(ref)) { out.push({ rule: 'S09', id: src.id, message: `source déclarée comme confirmation de ${ref}, qui n'existe pas` }); continue; }
      const sources = idx.get(ref);
      if (sources && !sources.includes(src.id)) {
        out.push({ rule: 'S103', id: ref, message: `confirmé par ${src.id}, qui ne figure pas dans ses sources : une confirmation qui ne rejoint pas ce qu'elle confirme le laisse à source unique et jamais relu` });
      }
    }
  }
  return out;
}
// Ce que les sources confirment, pour S84 : une confirmation de l'élément vaut mieux qu'une relecture
// de la source dont il est tiré, et elle répond à la même question — a-t-on vérifié ce qu'on a compris ?
const confirmes = s => new Set(arr(s.sources).flatMap(x => arr(x.confirms)));

// met son silence sur le chemin de l'approbation — ce que S87 refuse partout ailleurs.
// Et `review_rounds` n'était lue par personne, alors que `phase-govern.md` étape 7 prescrit d'y noter
// l'échéance. L'agent l'a demandée, ne l'a pas obtenue, et a écrit le diagnostic dans son message de
// commit : « sans date, un cycle de revue ne se clôt pas, il s'interrompt quand quelqu'un s'impatiente ».
export function governanceFindings(s) {
  const out = [];
  const g = s.governance ?? {};
  const shs = mapOf(s.stakeholders);
  for (const r of arr(g.reviewers)) {
    if (!['relecteur', 'approbateur'].includes(r.role)) continue;
    const sh = r.stakeholder && shs.get(r.stakeholder);
    if (sh && NON_ENTENDU.includes(sh.status)) {
      out.push({ rule: 'S98', id: `reviewers:${r.stakeholder}`, ...(enAttenteDeReponse(sh, s) ? { pending: true } : {}), message: `${r.role} que l'état déclare « ${sh.status} » : une revue demande si le document est fidèle à ce qu'on a dit, et cette personne n'a rien dit. Interroge-la d'abord, ou passe-la en « informé » — sinon son silence devient une approbation` });
    }
  }
  for (const r of arr(g.review_rounds)) {
    if (r.sent && !String(r.deadline ?? '').trim()) {
      out.push({ rule: 'S99', id: r.id ?? 'review_rounds', message: 'cycle de revue envoyé sans échéance : sans date, un cycle ne se clôt pas — il s\'interrompt quand quelqu\'un s\'impatiente' });
    }
  }
  const attente = arr(g.comments).filter(c => !c.decision || c.decision === 'en_attente');
  if (attente.length && (arr(g.approvals).length || arr(g.baselines).length)) {
    out.push({ rule: 'S99', id: 'governance', message: `${attente.length} commentaire(s) de revue sans décision (${attente.map(c => c.id).join(', ')}) alors que le document est approuvé ou figé : un retour qu'on n'a pas tranché n'est pas un retour qu'on a traité` });
  }
  return out;
}

// Les dérogations nommées ne portaient que sur les règles de FORME : `waivedOf` ne nourrit que
// `checkText`. Les règles de structure n'étaient donc pas dérogeables — alors que `lint.mjs` proposait
// `lint_waivers` sous chaque avertissement, y compris les leurs, et que `phase-define.md` fait de
// « corrigé ou couvert par une dérogation » le critère de sortie. Au deuxième dossier réel, trois S89
// disaient une vérité irréductible : le président de l'association tranche, se confirme et est son
// propre recours, parce qu'il n'y a personne au-dessus de lui. Il ne restait que deux issues — écrire
// un confirmateur qu'on n'a pas entendu, ou traîner trois avertissements jusqu'à la gouvernance. Une
// règle qu'on ne peut respecter qu'en mentant est pire que pas de règle.
// Une dérogation sans raison écrite n'en est pas une : le constat reste, et dit pourquoi.
const waiverIndex = s => {
  const idx = new Map();
  const add = (id, x) => { for (const w of arr(x?.lint_waivers)) if (w?.rule) idx.set(`${id}|${w.rule}`, String(w.reason ?? '').trim()); };
  for (const [k, v] of Object.entries(s ?? {})) {
    if (Array.isArray(v)) {
      for (const x of v) {
        if (!x || typeof x !== 'object') continue;
        if (x.id) add(x.id, x);
        if (k === 'decision_rights' && x.domain) add(`decision_rights:${x.domain}`, x);
      }
    } else if (v && typeof v === 'object' && k !== 'lint_waivers') add(k, v);
  }
  // Un constat qui ne porte pas sur un élément — une collection entière, un fichier de guide ou de
  // liste de contrôle — n'a pas d'endroit où poser sa dérogation : elle va à la racine, avec son `id`.
  for (const w of arr(s?.lint_waivers)) if (w?.rule && w?.id) idx.set(`${w.id}|${w.rule}`, String(w.reason ?? '').trim());
  return idx;
};

// Les fichiers qui quittent le dossier, sous la forme { file, text }, quelle que soit celle reçue.
const fichiersDe = liste => arr(liste).map(f => (typeof f === 'string' ? { file: f, text: '' } : f)).filter(f => f.text);
// S70 : une fiche de contexte au-delà du budget. La règle vivait dans `render-plan.mjs`, en
// `console.warn` — hors du catalogue, alors que l'en-tête de ce fichier dit « une règle n'est définie
// qu'ici, jamais ailleurs ». Conséquence : invisible à `lint.mjs`, invisible au point d'étape, absente
// de la condition « aucun avertissement » de la porte, et **non dérogeable** : `lint_waivers` ne
// pouvait pas l'atteindre. Même défaut que S53, qui était le seul autre contrôle hors catalogue.
// La taille ne se calcule qu'au rendu — c'est la fiche rendue qu'on mesure, pas l'état — donc
// l'appelant passe le résultat, comme pour les handoffs ingérés.
export function contextFindings(cards, budget = {}) {
  const max = budget.max ?? 3000;
  return arr(cards).filter(c => c.tokens > max).map(c => ({ rule: 'S70', id: c.id,
    message: `fiche de contexte à ≈ ${c.tokens} tokens pour un budget de ${max} : au-delà, l'agent qui implémente perd en précision. Découper la tâche, ou alléger la story` }));
}

// S108 : le document est construit sur un handoff amont qui n'était pas une baseline. Chaque
// `build-handoff.mjs` écrit `source.status` depuis le début, et un seul script le lisait — en
// `console.warn`, que rien ne persiste et que personne ne relit. « Intègre » veut dire « non altéré »,
// pas « approuvé » : un brouillon intact est intact, et le document aval s'en va vers sa gouvernance
// sans que rien ne dise sur quoi il repose. Le constat ne bloque pas, il se dérogue — un travail
// d'anticipation sur un brouillon est légitime, à condition qu'il soit écrit.
const AMONT = { prd: ['source_brd', 'BRD'], sad: ['source_prd', 'PRD'], impl: ['source_plan', 'plan'], test: ['source_plan', 'plan'] };
export function upstreamFindings(s, refs = {}) {
  const out = [];
  const dire = (champ, quoi, status) => out.push({ rule: 'S108', id: champ,
    message: `construit sur un handoff du ${quoi} qui n'était pas une baseline (${status ? `état : ${status}` : 'état non relevé'}) : « intègre » veut dire « non altéré », pas « approuvé ». Faire figer le document amont et régénérer son handoff, ou nommer la dérogation` });
  const [champ, quoi] = AMONT[s?.document ?? ''] ?? [];
  if (champ && String(s[champ]?.path ?? '').trim() && s[champ].status !== 'baseline') dire(champ, quoi, s[champ].status);
  // Le plan ne recopie pas l'état amont : `refs.yaml` porte les handoffs entiers.
  if (s?.document === 'plan') {
    for (const k of ['prd', 'sad']) {
      if (!refs?.[k]) continue;
      const st = refs[k].source?.status;
      if (st !== 'baseline') dire(`refs:${k}`, k.toUpperCase(), st);
    }
  }
  return out;
}

// S53 : le handoff ingéré doit toujours exister, avec l'empreinte relevée à l'ingestion. Le contrôle
// était dans `lint.mjs`, hors catalogue, et lui seul le faisait. La lecture des fichiers reste chez
// l'appelant (`ingestedHandoffs` de common.mjs) : ce catalogue ne lit aucun fichier.
export function handoffFindings(handoffs) {
  return arr(handoffs).flatMap(h => {
    if (!h.recorded) return [{ rule: 'S53', id: h.path, message: 'empreinte du handoff non relevée à l\'ingestion (lancer verify-handoff.mjs et reporter sha256 dans l\'état)' }];
    if (!h.present) return [{ rule: 'S53', id: h.path, message: 'handoff ingéré introuvable' }];
    if (h.sha256 !== h.recorded) return [{ rule: 'S53', id: h.path, message: 'le handoff a changé depuis l\'ingestion : relancer l\'ingestion et faire le point sur les écarts' }];
    if (!h.ok) return [{ rule: 'S53', id: h.path, message: arr(h.problems).join(' ; ') }];
    return [];
  });
}

export function checkState(s, ctx = {}) {
  const refs = ctx.refs ?? {};
  // Le dernier terme de la chaîne de ternaires était `checkBrd` : TOUT document hors brd, prd, sad et
  // plan recevait les règles du BRD. Un état d'implémentation ou de tests s'y serait fait reprocher ses
  // objectifs non mesurables et ses exigences sans source, et la couverture lui aurait rendu trois
  // métriques vides à « 100 % atteint ». Un document qu'on ne sait pas vérifier se refuse, il ne se
  // devine pas : un rapport faux coûte plus cher qu'un refus.
  const doc = s.document ?? 'brd';
  if (!DOCUMENTS.includes(doc)) {
    return [{ rule: 'S00', id: 'document', message: `document « ${doc} » : ce catalogue vérifie ${DOCUMENTS.join(', ')}, et rien d'autre — un état d'implémentation se vérifie avec pr-gate.mjs et trace-check.mjs, un état de tests avec release-matrix.mjs` }];
  }
  const base = doc === 'plan' ? checkPlan(s, refs) : doc === 'sad' ? checkSad(s) : doc === 'prd' ? checkPrd(s) : checkBrd(s);
  const all = [...base, ...placeholderFindings(s), ...unsourcedNumberFindings(s), ...constitutionFindings(s, ctx.constitution), ...checklistFindings(s, ctx.checklists), ...interviewFindings(s, ctx.interviews), ...outgoingFindings(s, [...fichiersDe(ctx.interviews), ...fichiersDe(ctx.checklists)]), ...governanceFindings(s), ...coverageFindings(s, refs), ...phaseFindings(s), ...sourceContentFindings(s), ...confirmationFindings(s), ...renvoiFindings(s), ...proseFindings(s), ...contactFindings(s, ctx.contacts), ...sollicitationFindings(s), ...autorisationFindings(s), ...questionPoseeFindings(s), ...effectifFindings(s), ...riskFindings(s), ...understoodFindings(s), ...relectureFindings(s), ...handoffFindings(ctx.handoffs), ...upstreamFindings(s, refs), ...contextFindings(ctx.cards, s.settings?.context_budget)];
  const idx = waiverIndex(s);
  return all.map(f => {
    const raison = idx.get(`${f.id}|${f.rule}`);
    if (raison === undefined) return f;
    if (!raison) return { ...f, message: `${f.message} — et la dérogation déclarée ne dit pas pourquoi : une dérogation nommée porte sa raison, sinon c'est un silence` };
    return { ...f, waived: raison };
  });
}

// Libellés des règles de structure, pour les rapports.
export const STRUCT_RULES = {
  S00: 'document hors du catalogue',
  S100: 'porte de phase franchie sans trace', S101: 'passage de phase sans décideur, date ou source',
  S102: 'source de parole sans ce qui a été dit', S103: 'confirmation non rattachée à ce qu\'elle confirme',
  S104: 'document sortant parlant par adresses',
  S105: 'seuil qui éteint une mesure sans dérogation nommée', S106: 'dérogation de seuil sans raison ou sans approbateur',
  S107: 'ancien nom de champ pour les seuils ou les dérogations',
  S108: 'construit sur un handoff amont qui n\'était pas une baseline',
  S109: 'risque consigné sans être apprécié', S110: 'représentation sans la source où elle se dit',
  S111: 'relecture « sans objet » sur une parole, sans raison', S112: 'correction d\'une source non reliée ou laissée sans relecture',
  S113: 'utilisateur direct qu\'aucun besoin ne concerne',
  S114: 'coordonnée dans l\'état versionné, ou canal annoncé sans coordonnée',
  S115: 'sollicitation déclarée sans sa date ou sans son canal',
  S116: 'indisponibilité déclarée sans dire laquelle',
  S117: 'question laissée en vol au-delà du seuil, sans décision',
  S118: 'renvoi interne dans ce qu\'on rend à la personne en relecture',
  S119: 'passage de `posee` sans sa date ou sans son canal',
  S120: 'question reposée au-delà du seuil, et toujours sans réponse',
  S121: 'zone résolue par une réponse sans dire quand la question est partie',
  S122: 'entrée de la cartographie qui ne dit pas combien de personnes elle vaut',
  S123: 'entrée collective dont le statut parle pour tout le monde',
  S124: 'trace de porte dont le compte ne concorde pas avec ses dérogations',
  S125: 'sollicitation écrite inscrite sur la personne et pas sur la question',
  S126: 'contact parti sans que l\'autorisation de l\'utilisateur soit écrite',
  S127: 'contact disponible, question en attente, et rien n\'est jamais parti',
  S128: 'identifiant cité dans une phrase qui ne mène nulle part, ou attribution qui contredit le registre',
  S129: 'story sans qui, quoi ou pourquoi',
  S130: 'itération investie sans but',
  S131: 'plan sans Definition of Done', S132: 'NFR que rien ne vérifiera',
  S133: 'périmètre et date figés tous les deux',
  S134: 'détail dépensé au-delà de l\'horizon',
  S135: 'encours qui sature la relecture',
  S136: 'zone sans objet sans dire pourquoi',
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
  S68: 'espace réservé resté', S69: 'chiffre sans source', S70: 'fiche de contexte trop longue', S71: 'ADR sans règle', S72: 'collision entre tâches', S73: 'comportement existant à préserver', S74: 'taille et risque calculé', S75: 'attention humaine dépassée', S76: 'tâche non finie sans décision', S77: 'action de rétrospective sans suivi', S78: 'voie rapide sans épopée', S79: 'constitution', S80: 'liste de contrôle de relecture', S81: 'source sans personne entendue', S82: 'métrique et objectif désaccordés', S83: 'aucun utilisateur direct entendu', S84: 'exigence jamais relue par la source', S85: 'motif EARS absent ou désaccordé', S86: 'provenance d\'initiative incomplète ou hors énumération', S87: 'présent sans avoir parlé', S88: 'valeur hors énumération ou « autre » sans libellé', S89: 'droit de décision sans décideur ou confirmé par lui-même', S90: 'décision rendue au nom de quelqu\'un qu\'on n\'a pas entendu', S91: 'locuteur absent de la salle qu\'il a fait parler', S92: 'quadrant d\'implication affirmé au lieu d\'être déduit', S93: 'influence inconnue à fort pouvoir, sans attitude notée', S94: 'représentation non déclarée, ou tenue pour une voix', S95: 'besoin sans porteur, ou porté par une voix jamais entendue', S96: 'guide d\'entretien pour quelqu\'un qui est dans la salle', S97: 'hypothèse à vérifier sans moyen de vérification', S98: 'relecteur ou approbateur jamais entendu', S99: 'cycle de revue sans échéance, ou retour non tranché',
};

// ── Ce qu'une règle a besoin de lire pour pouvoir parler ────────────────────
//
// Mesuré avant d'écrire, et le chiffre a décidé de la forme : sur un état entièrement vide,
// **3 règles sur 131 parlent** (`S65`, `S89`, `S100` au BRD ; `S100` seule ailleurs). Les 128 autres
// se taisent, et ce silence est indiscernable d'un « tout va bien » — un document où il n'y a rien
// passe pour un document presque propre. C'est le trou qu'un audit de documents écrits ailleurs ne
// peut pas combler sans cette table.
//
// Une déclaration de lecture porte quatre choses, dont une seule est obligatoire :
//   doc       pour quels documents la règle peut parler : `'brd'`, `'prd'`, `'sad'`, `'plan'`, une
//             liste de ceux-là, ou `'*'` pour les quatre. Une règle du BRD n'est pas « non mesurée »
//             sur un plan : elle ne s'y applique pas.
//   lit       les chemins que la règle PARCOURT. Qu'UN seul porte quelque chose suffit : elle a eu de
//             la matière. `'*'` vaut pour les règles qui ne nomment pas leurs champs et parcourent le
//             document entier.
//   absence   la règle CONSTATE l'absence : elle parle précisément quand la lecture est vide, et reste
//             donc mesurable. `S89` est mixte — elle parcourt `decision_rights` et reproche en plus
//             les domaines dus qui manquent.
//   facultatif ce que la règle surveille est FACULTATIF : vide, il n'y a rien à surveiller, et son
//             silence est un vrai constat de conformité, pas une case vide.
//
// Le critère qui sépare `facultatif` d'une abstention, et c'est lui qui a fait le tri des 74 : une
// abstention ne vaut que si le document est CENSÉ porter ce que la règle lit. Un dossier sans objectif
// ne peut pas dire si ses objectifs sont mesurables, et il est censé en avoir : c'est une case vide.
// Un dossier sans dérogation de seuil n'a aucune dérogation muette, et il n'est pas censé en avoir :
// le silence est un constat, « rien à reprocher ». Mesuré avant de trancher : sans cette distinction,
// le PRD d'exemple s'entendait dire 33 fois « non mesurée », dont la moitié sur des choses qu'il n'a
// aucune raison d'avoir — et un rapport qui crie 33 fois ne se lit pas plus qu'un rapport muet.
// La limite, écrite plutôt que cachée : ce jugement est le mien, règle par règle. Ce qu'un document
// doit porter À UNE PHASE DONNÉE est une connaissance qui existe déjà ailleurs, dans les portes et
// leurs seuils, et personne ne l'a encore reliée à cette table. C'est la question laissée ouverte.
//   quand     la ou les conditions d'applicabilité, toutes requises : `vaut` est une liste blanche,
//             `sauf` une liste noire, `rempli` exige que le chemin porte quelque chose.
// Une règle peut porter PLUSIEURS déclarations, dans un tableau : la même règle ne lit pas la même
// chose dans un PRD et dans un plan — `S108` regarde `source_brd` chez l'un, `refs` chez l'autre.
//
// Deux doctrines ont tranché tous les cas douteux, et sans elles la table aurait eu besoin de trois
// notions de plus :
//   1. On déclare ce que la règle PARCOURT, pas ce contre quoi elle résout. `S98` parcourt
//      `governance.reviewers` et résout contre `stakeholders` ; un renvoi qui ne résout pas est
//      l'affaire de `S09`, qui lit le document entier. Déclarer les deux aurait demandé une lecture
//      conjonctive — « elle a besoin de TOUTES » —, et la conjonction aurait été fausse partout
//      ailleurs, où un seul des chemins suffit.
//   2. Un GARDE n'est pas une lecture : c'est une applicabilité. `if (arr(s.security_catalogs).length
//      && …)` sur `S55`, `if (!contacts) continue` sur `S127` : ces deux-là ne disent pas ce que la
//      règle lit, ils disent quand elle existe. Ils vont dans `quand`, avec `rempli`.
//
// Les chemins préfixés `ctx.` désignent ce qui vit À CÔTÉ de l'état et non dedans : les guides
// d'entretien, les listes de contrôle, `contacts.yaml`, la constitution du produit, les fiches de
// contexte rendues. Quatorze règles sur les 131 ne lisent pas l'état, et la table le dit — sans quoi
// elle aurait affirmé qu'elles lisent un champ qui n'existe nulle part.
const CADENCE_ITERATIVE = { chemin: 'settings.cadence', sauf: ['flux'] };
// Six règles d'itération ne valent que si le projet travaille en itérations. La condition est dans le
// code (`const iterations`), et la voici en clair : sans elle, un plan au fil de l'eau s'entendait dire
// « non mesurée » six fois à chaque vérification, pour la vie du projet, sans que ça puisse jamais
// devenir un constat. Une règle hors de son réglage n'est pas non mesurée : elle ne s'applique pas.
// La carte des parties prenantes n'existe pas avant Discover : le tour de table ne donne que des noms.
const PHASES_DE_CARTE = { chemin: 'phase', vaut: ['discover', 'define', 'govern'] };
// Les règles qui parcourent le document entier plutôt qu'un champ nommé.
const TOUT = ['*'];

export const LECTURES = {
  // ── Le BRD ──
  // Quinze règles portent le même numéro dans deux documents — mesuré, pas supposé : `S01`, `S04`,
  // `S05`, `S10`, `S15` à `S17`, `S81`, `S84`, `S87`, `S90`, `S91`, `S94`, `S110`. Ce sont des
  // homonymes, pas des règles partagées : `S04` attend un critère d'acceptation sur une exigence
  // métier au BRD et sur une exigence fonctionnelle au PRD, et seul le premier attend une phase.
  // Une seule déclaration pour les deux aurait menti sur l'un des deux à chaque fois.
  S01: [{ doc: 'brd', lit: ['objectives'] }, { doc: 'prd', lit: ['goals'] }],
  S02: { doc: 'brd', lit: ['business_requirements'] },
  S03: { doc: 'brd', lit: ['business_requirements'] },
  S04: [{ doc: 'brd', lit: ['business_requirements'], quand: { chemin: 'phase', sauf: ['assess', 'discover', 'define'] } },
    { doc: 'prd', lit: ['functional_requirements'] }],
  S05: [{ doc: 'brd', lit: ['business_requirements'], quand: { chemin: 'phase', sauf: ['assess', 'discover', 'define'] } },
    { doc: 'prd', lit: ['functional_requirements'] }],
  S11: { doc: 'brd', lit: ['business_rules'] },
  S12: { doc: 'brd', lit: ['business_rules'] },
  S13: { doc: 'brd', lit: ['business_rules'] },
  S14: { doc: 'brd', lit: ['shadow_zones'] },
  S15: { doc: ['brd', 'prd'], facultatif: true, lit: ['shadow_zones'] },
  S16: { doc: ['brd', 'prd'], facultatif: true, lit: ['shadow_zones'] },
  S17: [{ doc: ['brd', 'sad'], lit: ['decisions'] }, { doc: 'prd', lit: ['design_decisions', 'goals'] }],
  S18: { doc: 'brd', lit: ['decisions'] },
  S19: { doc: 'brd', lit: ['stakeholders'] },
  S56: { doc: 'brd', lit: ['opportunity'] },
  S63: { doc: 'brd', lit: ['business_requirements'] },
  S64: { doc: 'brd', lit: ['business_requirements'] },
  S65: { doc: 'brd', lit: ['synthesis_check'], absence: true, quand: { chemin: 'phase', vaut: ['define', 'govern'] } },
  S66: { doc: 'brd', lit: ['transition_requirements'] },
  // `S83` paraissait constater une absence — « aucun utilisateur direct entendu » — mais la
  // vérification l'a démentie : elle a besoin de parties prenantes entendues pour parler, et
  // `stakeholders` vidée, elle se tait. La mesure de l'état vide le disait déjà, S83 n'y figurait pas.
  S83: { doc: 'brd', lit: ['stakeholders'] },
  S84: [{ doc: 'brd', lit: ['business_requirements'] }, { doc: 'prd', lit: ['functional_requirements'] }],
  S86: { doc: 'brd', lit: ['initiative.derived_from'] },
  S89: { doc: 'brd', lit: ['decision_rights'], absence: true },
  S92: { doc: 'brd', lit: ['stakeholders'] },
  S93: { doc: 'brd', lit: ['stakeholders'] },
  S95: { doc: 'brd', lit: ['candidate_needs'] },
  S97: { doc: 'brd', lit: ['hypotheses'] },
  S113: { doc: 'brd', lit: ['stakeholders'], quand: { chemin: 'phase', vaut: ['define', 'govern'] } },

  // ── Le PRD ──
  S06: { doc: 'prd', lit: ['functional_requirements'] },
  S07: { doc: 'prd', lit: ['functional_requirements'] },
  S08: { doc: 'prd', lit: ['nfrs'] },
  S20: { doc: 'prd', lit: ['business_rules'] },
  S57: { doc: 'prd', lit: ['hypotheses'] },
  S67: { doc: 'prd', lit: ['concepts'] },
  // Mixte, comme `S89` : sur un produit existant en spécification, l'absence de comportement à
  // préserver EST le constat ; partout ailleurs la règle parcourt la collection et demande la preuve
  // que chacun existe. Les deux gardes sont ceux du code, et `vaut: [true]` plutôt que `rempli` parce
  // qu'`existing_product` est un booléen — `rempli` dirait « renseigné » d'un `false`.
  // La limite, écrite plutôt que cachée : un produit existant qui ne se déclare pas comme tel sort du
  // réglage, et la table ne réclamera pas sa mesure. Le code, lui, continue d'exiger la preuve de
  // chaque comportement déclaré : c'est une abstention qu'on ne signale pas, jamais un faux constat.
  S73: { doc: 'prd', lit: ['preserved_behaviors'], absence: true, quand: [{ chemin: 'existing_product', vaut: [true] }, { chemin: 'phase', vaut: ['specify', 'govern'] }] },
  S82: { doc: 'prd', lit: ['metrics'] },
  S85: { doc: 'prd', lit: ['functional_requirements'] },

  // ── La conception ──
  S21: { doc: 'sad', lit: ['drivers'] },
  S22: { doc: 'sad', lit: ['drivers'] },
  S23: { doc: 'sad', lit: ['decisions'] },
  S24: { doc: 'sad', lit: ['decisions'] },
  S25: { doc: 'sad', lit: ['decisions'] },
  S71: { doc: 'sad', lit: ['decisions'] },
  // Deux boucles, deux collections : un élément existant sans preuve, une relation existante sans preuve.
  S28: { doc: 'sad', lit: ['elements', 'relations'] },
  S33: { doc: 'sad', lit: ['elements'] },
  S34: { doc: 'sad', lit: ['elements'] },
  S36: { doc: 'sad', lit: ['elements'] },
  // Ce que la conception alloue vient du PRD, et le handoff est recopié dans l'état sous `prd_ref`.
  S26: { doc: 'sad', lit: ['prd_ref.functional_requirements'] },
  S27: { doc: 'sad', lit: ['prd_ref.nfrs', 'nfr_responses'] },
  S35: { doc: 'sad', lit: ['prd_ref.business_rules'] },
  S30: { doc: 'sad', lit: ['data_entities'] },
  S31: { doc: 'sad', lit: ['data_entities'] },
  S29: { doc: 'sad', lit: ['interfaces'] },
  S32: { doc: 'sad', lit: ['threats'] },
  // Un garde, pas une lecture : sans catalogue de référence déclaré, il n'y a pas de contrôle à exiger.
  S55: { doc: 'sad', lit: ['threats'], quand: { chemin: 'security_catalogs', rempli: true } },

  // ── Le plan ──
  S37: { doc: 'plan', lit: ['stories'] },
  S38: { doc: 'plan', lit: ['stories'] },
  S39: { doc: 'plan', lit: ['refs.prd.releases'] },
  S40: { doc: 'plan', lit: ['tasks'] },
  S41: { doc: 'plan', lit: ['stories'] },
  S42: { doc: 'plan', lit: ['stories'] },
  S43: { doc: 'plan', lit: ['stories', 'tasks'] },
  S44: { doc: 'plan', lit: ['tasks'] },
  S45: { doc: 'plan', lit: ['tasks'] },
  S46: { doc: 'plan', lit: ['tasks'] },
  S47: { doc: 'plan', lit: ['tasks'] },
  S48: { doc: 'plan', lit: ['iterations'], quand: CADENCE_ITERATIVE },
  // En cadence `flux`, c'est `S49` qui prend le relais : la limite d'encours remplace la capacité
  // d'itération, et son absence est elle-même le constat.
  S49: { doc: 'plan', lit: ['settings.flow.wip_limit'], absence: true, quand: { chemin: 'settings.cadence', vaut: ['flux'] } },
  S50: { doc: 'plan', lit: ['examples'] },
  // Les mesures, vérifications et spikes viennent de la conception et du PRD, pas du plan : ce que
  // `S51` lit est en amont, d'où les chemins sous `refs`.
  S51: { doc: 'plan', lit: ['refs.sad.security_measures', 'refs.sad.verifications', 'refs.sad.spikes', 'refs.prd.preserved_behaviors', 'refs.prd.transition_requirements'] },
  S52: { doc: 'plan', lit: ['stories'] },
  S58: { doc: 'plan', lit: ['iterations'], quand: CADENCE_ITERATIVE },
  S59: { doc: 'plan', lit: ['release_tracking'] },
  S60: { doc: 'plan', lit: ['stories'] },
  S61: { doc: 'plan', lit: ['stories'] },
  S62: { doc: 'plan', lit: ['stories'] },
  S72: { doc: 'plan', lit: ['tasks'] },
  S74: { doc: 'plan', lit: ['tasks'] },
  // Le garde `settings.attention_capacity` manquait à cette déclaration : le code teste la véracité
  // du nombre (« 0 = non suivi »), et la table se taisait là-dessus. Un projet qui a dit ne pas suivre
  // son attention ne doit pas s'entendre réclamer la mesure.
  S75: { doc: 'plan', lit: ['iterations'], quand: [CADENCE_ITERATIVE, { chemin: 'settings.attention_capacity', positif: true }] },
  S76: { doc: 'plan', lit: ['iterations'], quand: CADENCE_ITERATIVE },
  S77: { doc: 'plan', lit: ['iterations'], quand: CADENCE_ITERATIVE },
  S78: { doc: 'plan', lit: ['stories'] },
  S129: { doc: 'plan', lit: ['stories'] },
  S130: { doc: 'plan', lit: ['iterations'], quand: CADENCE_ITERATIVE },
  // Due dès qu'on commence à déclarer des choses finies, et son absence EST le constat.
  S131: { doc: 'plan', lit: ['definition_of_done'], absence: true, quand: { chemin: 'phase', vaut: ['schedule', 'govern', 'review'] } },
  // Ce qu'elle lit est en amont : les NFR viennent du PRD, leurs vérifications de la conception.
  S132: { doc: 'plan', lit: ['refs.prd.non_functional'] },
  // Elle croise la fenêtre d'une release et la priorité de ses exigences : les deux sont dans l'état.
  S133: { doc: 'prd', lit: ['releases'] },
  // Un garde, pas une lecture : sans release en cours, il n'y a pas d'horizon à dépasser.
  S134: { doc: 'plan', lit: ['stories'], quand: { chemin: 'settings.release', rempli: true } },
  // Le pendant de `S75` au fil de l'eau : même garde, autre unité.
  S135: { doc: 'plan', lit: ['replenishments'], quand: [{ chemin: 'settings.cadence', vaut: ['flux'] }, { chemin: 'settings.attention_capacity', positif: true }] },
  // Pas de zone déclarée sans objet, pas de raison manquante : rien à surveiller.
  S136: { doc: '*', facultatif: true, lit: ['shadow_zones'] },

  // ── Les règles transverses : elles tournent sur les quatre documents ──
  // `S00` refuse un document que ce catalogue ne sait pas vérifier. Elle n'a donc de déclaration pour
  // aucun des quatre : elle est la porte AVANT le catalogue, et sur un document vérifiable elle ne
  // peut ni constater ni s'abstenir. Zéro déclaration, et un test exige qu'elle soit la seule.
  S00: [],
  // `S09` est émise depuis dix endroits, et c'est ce qui l'avait fait mettre de côté — « elle demande
  // une décision, pas une copie ». La décision, la voici : ce n'est pas dix règles, c'en est une,
  // « un renvoi qui ne mène nulle part », et `renvoiFindings` la fait déjà sur le document ENTIER,
  // champ de renvoi par champ de renvoi, registre déduit des identifiants présents. Sa lecture est
  // donc le document. Les neuf autres sites sont des cas particuliers du même constat, posés plus tôt.
  S09: { doc: '*', lit: TOUT },
  S10: [{ doc: 'brd', lit: ['business_requirements'] }, { doc: 'prd', lit: ['functional_requirements'] }],
  // Le handoff amont n'existe que là où un document en ingère un : le BRD n'a personne en amont.
  S53: [{ doc: 'prd', facultatif: true, lit: ['source_brd.path'] }, { doc: 'sad', facultatif: true, lit: ['source_prd.path'] }, { doc: 'plan', facultatif: true, lit: ['refs.paths'] }],
  // `S54` et `S105` jugent des seuils de couverture, et une couverture se calcule sur des populations :
  // celles de `coverage()`, document par document. Collections vides, rien n'est mesuré — c'est
  // précisément le défaut que `coverage()` a corrigé en rendant `met: null` au lieu de « 100 % atteint ».
  S54: [
    { doc: 'brd', lit: ['business_requirements', 'objectives'] },
    { doc: 'prd', lit: ['functional_requirements', 'brd_ref.requirements'] },
    { doc: 'sad', lit: ['prd_ref.functional_requirements', 'prd_ref.nfrs', 'drivers'] },
    { doc: 'plan', lit: ['stories', 'refs.prd.releases', 'refs.sad.security_measures', 'refs.sad.verifications'] },
  ],
  S105: [
    { doc: 'brd', lit: ['business_requirements', 'objectives'] },
    { doc: 'prd', lit: ['functional_requirements', 'brd_ref.requirements'] },
    { doc: 'sad', lit: ['prd_ref.functional_requirements', 'prd_ref.nfrs', 'drivers'] },
    { doc: 'plan', lit: ['stories', 'refs.prd.releases', 'refs.sad.security_measures', 'refs.sad.verifications'] },
  ],
  S106: { doc: '*', facultatif: true, lit: ['waivers', 'coverage_waivers'] },
  S107: { doc: '*', facultatif: true, lit: ['coverage_thresholds', 'coverage_waivers', 'settings.thresholds'] },
  S68: { doc: '*', lit: TOUT },
  S69: [{ doc: 'brd', lit: ['business_requirements', 'business_rules', 'objectives'] }, { doc: 'prd', lit: ['functional_requirements'] }],
  // La fiche de contexte ne se mesure qu'au RENDU : `lint.mjs` ne rend rien, donc il ne passe pas de
  // fiches et `S70` ne sera jamais mesurée par lui. La table le dit plutôt que de le taire — c'est une
  // limite du lint, et c'est le genre de silence que cette table existe pour rendre visible.
  S70: { doc: 'plan', facultatif: true, lit: ['ctx.cards'] },
  S79: [
    { doc: ['brd', 'prd'], lit: ['principles_applicable'], absence: true, quand: [{ chemin: 'ctx.constitution.principles', rempli: true }, { chemin: 'phase', vaut: ['define', 'specify', 'govern'] }] },
    { doc: 'sad', lit: ['constitution_check'], absence: true, quand: [{ chemin: 'ctx.constitution.principles', rempli: true }, { chemin: 'phase', vaut: ['govern'] }] },
  ],
  S80: { doc: '*', facultatif: true, lit: ['ctx.checklists'] },
  S81: { doc: ['brd', 'prd'], lit: ['sources'] },
  S87: { doc: ['brd', 'prd'], lit: ['sources'] },
  S91: { doc: ['brd', 'prd'], lit: ['sources'] },
  // `checkEnum` ne juge que des champs énumérés, et ils sont dans cinq collections : le type d'une
  // source, la vraisemblance et l'ampleur d'un risque, le canal par lequel on joint quelqu'un ou par
  // lequel une question est partie, le genre d'une interface.
  S88: { doc: '*', facultatif: true, lit: ['sources', 'risks', 'stakeholders', 'shadow_zones', 'interfaces'] },
  S90: { doc: ['brd', 'prd'], lit: ['stakeholders'] },
  S94: { doc: ['brd', 'prd'], lit: ['stakeholders'] },
  S110: { doc: ['brd', 'prd'], lit: ['stakeholders'] },
  S96: { doc: '*', facultatif: true, lit: ['ctx.interviews'] },
  S98: { doc: '*', facultatif: true, lit: ['governance.reviewers'] },
  S99: { doc: '*', facultatif: true, lit: ['governance.review_rounds', 'governance.comments'] },
  // La seule des 131 qui parle sur un état entièrement vide dans les quatre documents : une porte
  // franchie sans trace se constate par l'absence de la trace.
  S100: { doc: '*', lit: ['phase_log'], absence: true },
  S101: { doc: '*', facultatif: true, lit: ['phase_log'] },
  S124: { doc: '*', facultatif: true, lit: ['phase_log'] },
  S102: { doc: ['brd', 'prd', 'sad'], lit: ['sources'] },
  S103: { doc: ['brd', 'prd', 'sad'], lit: ['sources'] },
  S111: { doc: ['brd', 'prd', 'sad'], lit: ['sources'] },
  S112: { doc: ['brd', 'prd', 'sad'], lit: ['sources'] },
  S118: { doc: ['brd', 'prd', 'sad'], lit: ['sources'] },
  S104: { doc: '*', facultatif: true, lit: ['ctx.interviews', 'ctx.checklists'] },
  S108: [{ doc: 'prd', facultatif: true, lit: ['source_brd.path'] }, { doc: 'sad', facultatif: true, lit: ['source_prd.path'] }, { doc: 'plan', facultatif: true, lit: ['refs.prd', 'refs.sad'] }],
  S109: { doc: '*', facultatif: true, lit: ['risks'] },
  S114: { doc: ['brd', 'prd', 'sad'], lit: ['stakeholders'] },
  S115: { doc: ['brd', 'prd', 'sad'], lit: ['stakeholders'] },
  S116: { doc: ['brd', 'prd', 'sad'], lit: ['stakeholders'] },
  S117: { doc: ['brd', 'prd', 'sad'], lit: ['stakeholders'] },
  S119: { doc: '*', facultatif: true, lit: ['shadow_zones'] },
  S120: { doc: '*', facultatif: true, lit: ['shadow_zones'] },
  S121: { doc: '*', facultatif: true, lit: ['shadow_zones'] },
  S122: { doc: ['brd', 'prd', 'sad'], lit: ['stakeholders'], quand: PHASES_DE_CARTE },
  S123: { doc: ['brd', 'prd', 'sad'], lit: ['stakeholders'], quand: PHASES_DE_CARTE },
  S125: { doc: ['brd', 'prd', 'sad'], lit: ['stakeholders'] },
  S126: { doc: ['brd', 'prd', 'sad'], lit: ['stakeholders', 'connecteurs', 'settings.connecteurs'] },
  // Un garde, pas une lecture : sans `contacts.yaml`, la règle n'a pas de coordonnée à confronter, et
  // « on n'a pas regardé le disque » n'est pas « la coordonnée manque ».
  S127: { doc: ['brd', 'prd', 'sad'], lit: ['stakeholders'], quand: { chemin: 'ctx.contacts', rempli: true } },
  S128: { doc: '*', lit: TOUT },
};

// Les règles qui n'ont pas encore dit ce qu'elles lisent. Elle est VIDE depuis le 7 novembre 2026, et
// un test l'exige : les 131 règles du registre sont déclarées, et une règle nouvelle ne peut plus être
// ajoutée sans dire ce qu'elle lit. Le constant reste pour que l'étape soit relisible — il a porté 103
// règles, puis 74, puis aucune.
export const NON_DECLAREES = [];

// Une lecture est remplie si le chemin désigne quelque chose qui porte de l'information : un tableau
// non vide, un objet qui a au moins une clé, ou une valeur écrite. Un tableau vide et un objet vide
// ne disent rien — c'est tout l'objet de cette table.
const lecture = (s, chemin) => chemin.split('.').reduce((o, k) => (o == null ? undefined : o[k]), s);
const porteQuelqueChose = v => {
  if (Array.isArray(v)) return v.length > 0;
  if (v && typeof v === 'object') return Object.keys(v).length > 0;
  return ecrit(v);
};
const rempli = (s, chemin) => {
  // `*` : le document entier. Une règle qui ne nomme pas ses champs — `S09`, `S68`, `S128` — n'a rien
  // lu quand le document ne porte aucune collection d'éléments. C'est la même liste d'exclusion que
  // `placeholderFindings`, et c'est elle qui fait foi : les blocs de métadonnées ne sont pas du contenu.
  if (chemin === '*') return Object.entries(s ?? {}).some(([k, v]) => !HORS_CONTENU.includes(k) && Array.isArray(v) && v.length > 0);
  return porteQuelqueChose(lecture(s, chemin));
};

// Les règles qui, sur cet état, n'ont rien eu à lire. Ne pas savoir n'est pas constater : ce que cette
// fonction rend est la troisième colonne d'un rapport — ni vrai, ni faux, mais **non mesuré, et
// pourquoi**.
// Une règle hors de son réglage ou de sa phase n'est ni un constat ni une abstention : elle est hors
// jeu, exactement comme une règle du BRD sur un plan. `vaut` est une liste blanche, `sauf` une liste
// noire, `rempli` exige que le chemin porte quelque chose — chacune recopie la forme que le code
// emploie déjà, pour que le test puisse les confronter. Plusieurs conditions valent toutes ensemble.
export const applicable = (s, d) => {
  for (const c of [].concat(d?.quand ?? [])) {
    const v = lecture(s, c.chemin);
    if (c.vaut && !c.vaut.includes(v)) return false;
    if (c.sauf && c.sauf.includes(v)) return false;
    if (c.rempli && !porteQuelqueChose(v)) return false;
    // `positif` : un réglage numérique dont **0 veut dire « non suivi »**. `rempli` ne suffit pas —
    // `ecrit(0)` rend vrai, parce que « 0 » est une valeur écrite. Le motif existe dans le modèle
    // (`settings.attention_capacity`, `sprint.capacity`, « 0 = non suivi »), et le code teste la
    // véracité du nombre : la déclaration doit dire la même chose, sinon elle réclame une mesure à un
    // projet qui a explicitement dit ne pas la suivre.
    if (c.positif && !(Number(v) > 0)) return false;
  }
  return true;
};

// Les déclarations d'une règle, toujours sous forme de liste : une règle peut ne pas lire la même
// chose selon le document.
export const declarations = rule => [].concat(LECTURES[rule] ?? []);
const porteSurLeDoc = (d, doc) => d.doc === '*' || d.doc === doc || (Array.isArray(d.doc) && d.doc.includes(doc));

export function abstentions(s, ctx = {}) {
  const doc = s?.document ?? 'brd';
  // Plusieurs règles ne lisent pas l'état mais les handoffs amont — `S39` les releases du PRD, `S51`
  // les mesures et les spikes de la conception —, et quatorze autres lisent ce qui vit à côté du
  // fichier : les guides d'entretien, les listes de contrôle, `contacts.yaml`, la constitution, les
  // fiches de contexte rendues. `refs` reste à la racine, où les chemins l'attendent depuis le début.
  const base = { ...s, refs: ctx.refs ?? {}, ctx };
  const out = [];
  for (const [rule, decl] of Object.entries(LECTURES)) {
    for (const d of [].concat(decl)) {
      if (!porteSurLeDoc(d, doc) || d.absence || d.facultatif || !applicable(base, d)) continue;
      if (!d.lit.every(p => !rempli(base, p))) continue;
      out.push({ rule, lit: [...d.lit],
        message: `non mesurée : ${d.lit.map(p => (p === '*' ? 'le document ne porte aucune collection' : `\`${p}\``)).join(' et ')}${d.lit.includes('*') ? '' : ` ${d.lit.length > 1 ? 'sont vides' : 'est vide'}`}` });
      break;   // une règle ne s'abstient qu'une fois, même si deux déclarations la visent
    }
  }
  return out;
}

// Les trois verdicts d'un document, et le quatrième terme qui n'en est pas un. C'est ce que demande un
// rapport d'audit, et c'est ici que ça se calcule : « une règle n'est définie qu'ici, jamais ailleurs »
// vaut aussi pour le tri de leurs résultats — un script de rendu qui recomposerait ces listes à sa
// façon finirait par en donner une version différente de celle du lint.
//   constats   ce qui est CONSTATÉ FAUX : la règle avait de quoi lire, et elle a trouvé à reprocher.
//   muettes    ce qui n'est PAS MESURABLE : elle n'a rien eu à lire, et elle dit quoi.
//   vrais      ce qui est CONSTATÉ VRAI : elle avait de quoi lire et n'a rien trouvé — ou ce qu'elle
//              surveille est facultatif et n'existe pas, auquel cas « rien à reprocher » est exact.
//   horsJeu    ni l'un ni l'autre : la règle ne s'applique pas à ce document, ou pas dans ce réglage.
//              Ce n'est pas un verdict, et un rapport ne la compte pas — c'est pour ça qu'elle est
//              rendue à part plutôt que fondue dans « constaté vrai », où elle aurait gonflé le
//              dénominateur d'un audit avec des règles qui n'avaient rien à y faire.
// Les quatre listes partitionnent le registre : un test l'exige, et c'est ce qui empêche un rapport
// d'audit de perdre une règle en silence.
export function verdicts(s, ctx = {}) {
  const doc = s?.document ?? 'brd';
  const constats = checkState(s, ctx);
  const muettes = abstentions(s, ctx);
  const parle = new Set(constats.map(f => f.rule));
  const sansLecture = new Set(muettes.map(f => f.rule));
  const base = { ...s, refs: ctx.refs ?? {}, ctx };
  const vrais = [], horsJeu = [];
  for (const rule of Object.keys(LECTURES)) {
    if (parle.has(rule) || sansLecture.has(rule)) continue;
    const visent = declarations(rule).filter(d => porteSurLeDoc(d, doc));
    (visent.some(d => applicable(base, d)) ? vrais : horsJeu).push(rule);
  }
  return { constats, muettes, vrais, horsJeu };
}
