#!/usr/bin/env node
// La question à écrire à une partie prenante absente, et rien de plus. Compose le premier message d'une
// sollicitation par canal : la déclaration obligatoire, UNE question, et les deux lignes à réécrire dans
// l'état quand le message est parti.
//
// Pourquoi un script et pas une consigne. Un entretien par canal n'est PAS un guide d'entretien : le
// guide part dans les mains d'un humain qui mènera la conversation sans l'agent, huit à douze questions
// en quarante-cinq minutes. Ici c'est l'agent qui écrit, à quelqu'un qui n'a rien choisi, et la règle
// d'une question par tour durcit au lieu de s'assouplir — vingt questions tirées d'un coup, c'est quatre
// réponses, seize `null` au dossier, et une personne qui ne répond plus. Une source brûlée ne se rouvre
// pas, là où un avertissement se corrige. Le choix de LA question ne se laisse donc pas au jugement du
// moment : il sort du classement d'impact de `ask-five.mjs`, le même qui ordonne les questions posées à
// l'utilisateur.
//
// Le script REFUSE de composer plutôt que de composer à moitié : personne à qui écrire, aucun canal,
// aucune coordonnée, rien à demander, une sollicitation déjà en vol. Chacun de ces refus est une
// condition qu'on aurait sinon découverte dans la boîte de réception de quelqu'un.
//
// Usage : node reach-out.mjs <état.yaml> --sh SH-xx [--json]
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { arr, loadState, fail, today, shLabel } from './lib/common.mjs';
import { sollicitationEtat } from './lib/rules.mjs';

const JOUR_RE = /^\d{4}-\d{2}-\d{2}$/;
const jours = d => Math.floor((Date.parse(today()) - Date.parse(d)) / 86400000);
import { rank } from './ask-five.mjs';

const args = process.argv.slice(2);
const statePath = args.find(a => !a.startsWith('--') && !/^SH-/.test(a));
const id = args.includes('--sh') ? args[args.indexOf('--sh') + 1] : '';
if (!statePath || !id) fail('Usage : node reach-out.mjs <état.yaml> --sh SH-xx [--json]', 2);

const s = loadState(statePath);
const sh = arr(s.stakeholders).find(x => x.id === id);
if (!sh) fail(`${id} n'est pas une partie prenante de ${statePath}.`);

// Les coordonnées vivent à côté de l'état et ne se commitent pas (S114). Absentes, il n'y a rien à
// composer : un message sans destinataire ne s'écrit pas « en attendant ».
const contactsPath = join(dirname(statePath), 'contacts.yaml');
const contacts = existsSync(contactsPath) ? loadState(contactsPath) : {};

const canal = String(sh.joignable_par ?? '').trim();
const adresse = String(contacts[id] ?? '').trim();
const etat = sollicitationEtat(sh, s.sources);
const siennes = arr(s.sources).filter(x => arr(x.stakeholders).includes(id));

// Le MODE se déduit de l'état, il ne se choisit pas par un drapeau : le dossier sait déjà où on en est,
// et laisser choisir ouvrirait la porte à une première prise de contact envoyée à quelqu'un qu'on a
// déjà interrogé — qui le ferait recommencer à zéro et lui donnerait l'air d'avoir parlé dans le vide.
//   attente → une question vit : rien de neuf ne part, on relance la même ou on renonce ;
//   a parlé → la suite du fil, courte, sans redire qui on est ;
//   sinon   → la première prise de contact, avec la déclaration en entier.
const mode = etat === 'attente' ? 'relance' : siennes.length ? 'suite' : 'premiere';

if (sh.status === 'non disponible') fail(`${shLabel(s, id)} est déclarée « non disponible » : dis d'abord pourquoi elle redevient joignable, sinon le statut ne veut rien dire.`);
// Une relance est une DÉCISION, pas l'enchaînement naturel du silence : on écrit une deuxième fois à
// quelqu'un qui n'a pas répondu à la première, et ça se fait les yeux ouverts. D'où le drapeau.
if (mode === 'relance' && !args.includes('--relance')) {
  fail(`Une question est partie à ${shLabel(s, id)} le ${sh.sollicitee_le} — ${jours(sh.sollicitee_le)} jour(s) — et ${siennes.length ? 'rien n\'est venu d\'elle depuis' : 'elle n\'a pas répondu'}. Une deuxième question avant la réponse à la première, c'est deux questions d'un coup. Trois issues : attendre ; relancer la même question, et c'est \`--relance\` ; renoncer, et c'est \`status: non disponible\` en disant pourquoi.`);
}
// `sollicitée` sans date : on ne sait pas si une question vit. Composer là-dessus, c'est écrire à
// l'aveugle à quelqu'un qui a peut-être déjà notre question sous les yeux.
if (sh.status === 'sollicitée' && etat !== 'attente') fail(`${shLabel(s, id)} est déclarée « sollicitée » sans date de départ (\`sollicitee_le\`, S115) : on ne sait pas si une question est en vol. Écris la date, ou repasse-la « à interroger » si rien n'est parti.`);
// Et le cas où le dossier a la réponse sans pouvoir le prouver : la comparaison des dates est le seul
// moyen de savoir si elle a répondu depuis, et une source sans date la rend impossible.
if (mode === 'suite' && JOUR_RE.test(String(sh.sollicitee_le ?? '').trim()) && !siennes.some(x => JOUR_RE.test(String(x.date ?? '').trim()))) {
  fail(`Aucune des ${siennes.length} source(s) de ${shLabel(s, id)} ne porte de date, et on lui a écrit le ${sh.sollicitee_le} : impossible de savoir si elle a répondu depuis (S115). Date la source qui vient d'elle.`);
}
if (!canal) fail(`${shLabel(s, id)} n'a pas de \`joignable_par\` : on ne sait pas par quoi lui écrire. Demande-le à l'utilisateur.`);
if (!adresse) fail(`Aucune coordonnée pour ${id} dans ${contactsPath}. Le canal est annoncé (« ${canal} »), la coordonnée n'y est pas (S114) — demande-la à l'utilisateur, et ne la recopie pas dans l'état.`);

// LA question, et une seule : la zone ouverte qui lui est ADRESSÉE et qui coûte le plus cher ouverte.
// `ask_to`, pas `related` : une question sur quelqu'un n'est pas une question à quelqu'un (S94).
const zones = rank(arr(s.shadow_zones)).filter(z => z.ask_to === id);
if (!zones.length) fail(`Aucune zone d'ombre ouverte ne lui est adressée (\`ask_to: ${id}\`). Écrire à quelqu'un sans question précise dépense la seule prise de contact qu'on a.`);
// En relance, c'est la MÊME question qui repart. On ne sait pas laquelle est partie — rien ne
// l'enregistre —, mais on sait laquelle on a envoyée : la mieux classée, et elle est encore ouverte,
// sinon la réponse serait arrivée. Le raisonnement vaut tant que le classement est déterministe,
// ce qu'il est : `ask-five.mjs` trie par impact puis par ancienneté, jamais au hasard.
const zone = zones[0];

const sponsor = arr(s.stakeholders).find(x => x.role && /sponsor/i.test(x.role));
const demandeur = s.request?.requested_by ?? sponsor?.id ?? '';
const initiative = s.initiative ?? s.title ?? '(initiative sans nom)';

const bonjour = `Bonjour ${sh.name || ''},`.replace(' ,', ',');
// Trois messages, et ce qui les sépare n'est pas le ton : c'est ce que la personne sait déjà. À la
// première, elle ne sait rien, donc la déclaration est entière. À la suite, elle sait, et la redire la
// traiterait en inconnue. À la relance, elle a déjà la question : ce qui change, c'est qu'on dit qu'on
// n'insistera pas — sinon « relance » veut dire « on recommencera », et une source se brûle comme ça.
const MESSAGES = {
  premiere: [
    bonjour, '',
    `Je suis un agent logiciel, et j'écris pour le travail de cadrage de « ${initiative} »${demandeur ? `, à la demande de ${shLabel(s, demandeur)}` : ''}.`,
    'Ce que vous répondrez sera consigné dans un dossier que vous pourrez relire : je vous enverrai ce que j\'en ai compris avant que ça serve à quoi que ce soit, et vous pourrez le corriger.',
    'Vous n\'avez rien demandé, et vous pouvez ne pas répondre ou demander à parler à quelqu\'un plutôt qu\'à moi.',
    '', 'Une seule question :', '', zone.question, '', 'Merci.',
  ],
  suite: [
    bonjour, '',
    'Merci pour votre réponse, elle est consignée dans le dossier.',
    `Une question de plus sur « ${initiative} », et une seule :`,
    '', zone.question, '',
    'Comme la première fois, vous relirez ce que j\'en aurai compris avant que ça serve. Et vous pouvez arrêter là : dites-le moi, je le noterai.',
  ],
  relance: [
    bonjour, '',
    `Je vous ai écrit le ${sh.sollicitee_le} et je n'ai pas eu de retour. Sans reproche — je relance une fois, au cas où le message serait passé inaperçu.`,
    '', zone.question, '',
    'Si vous préférez ne pas répondre, dites-le moi simplement : je le noterai et je n\'insisterai plus.',
  ],
};
const message = MESSAGES[mode].join('\n');

// Ce qu'il faudra écrire quand le message sera parti. En suite et en relance, le statut ne bouge pas :
// elle a parlé, elle reste `interrogée`, et c'est la DATE qui porte l'attente. La repasser `sollicitée`
// éteindrait faussement ce que sa voix avait fermé.
const sortie = {
  stakeholder: id, mode, canal, adresse, zone: zone.id, question: zone.question, message,
  etat: mode === 'premiere'
    ? { status: 'sollicitée', sollicitee_le: today(), joignable_par: canal }
    : { sollicitee_le: today() },
};
if (args.includes('--json')) { console.log(JSON.stringify(sortie, null, 2)); process.exit(0); }

const TITRE = { premiere: 'Première prise de contact', suite: 'Suite du fil', relance: `Relance — sans réponse depuis ${JOUR_RE.test(String(sh.sollicitee_le ?? '')) ? `${jours(sh.sollicitee_le)} j` : 'une date inconnue'}` };
console.log([
  `${TITRE[mode]} — à ${shLabel(s, id)}, par ${canal} — ${adresse}`,
  `Zone visée : ${zone.id}${zone.reasons.length ? ` (${zone.reasons.join(', ')})` : ''}`,
  ...(zones.length > 1 ? [`${zones.length - 1} autre(s) zone(s) lui sont adressées : elles attendent sa réponse à celle-ci. Une question à la fois.`] : []),
  '',
  '── Message ──',
  message,
  '── Fin ──',
  '',
  'Envoie-le toi-même par le canal de l\'hôte, s\'il en offre un ; sinon remets-le à l\'utilisateur. Ce script',
  'n\'envoie rien : il ne sait pas à quoi tu es branché, et un message parti est irréversible.',
  '',
  'Quand il est parti, et PAS avant, écris sur la partie prenante :',
  ...(mode === 'premiere'
    ? [`    status: sollicitée`, `    sollicitee_le: "${today()}"`,
      'Sans la date, « sollicitée » compte comme si personne n\'avait jamais écrit (S115). Avec elle, le',
      'silence de la personne devient une question qui vit, et les constats sur sa voix changent de liste.']
    : [`    sollicitee_le: "${today()}"`,
      'Le statut ne bouge PAS : elle a parlé, elle reste « interrogée ». C\'est la date qui porte l\'attente —',
      'une question vit tant qu\'elle est postérieure à la dernière source qui vient d\'elle. La repasser',
      '« sollicitée » dirait qu\'elle n\'a jamais parlé, et éteindrait ce que sa voix avait fermé (S83, S95).']),
  '',
  `À la réponse : une source \`type: échange écrit\`, \`stakeholders: [${id}]\`, SA DATE — c'est elle qui dit`,
  `que la question est retombée —, le verbatim dans \`quote\`${mode === 'premiere' ? `, puis \`status: interrogée\`` : ''} et la zone ${zone.id} levée.`,
  ...(mode === 'relance' ? ['', 'Si elle ne répond pas davantage, renonce et dis-le : `status: non disponible`. Un silence qu\'on',
    'laisse ouvert indéfiniment donne au dossier l\'air d\'attendre quelque chose qui ne viendra pas.'] : []),
].join('\n'));
