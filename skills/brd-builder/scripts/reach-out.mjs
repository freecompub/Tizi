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
const etat = sollicitationEtat(sh);

// `interrogée` d'abord : c'est le seul refus qui ne signale pas un trou du dossier. Elle a parlé ; si
// une question reste, elle se pose dans le fil de l'échange déjà ouvert, pas par une première prise
// de contact qui lui redemanderait qui elle est.
if (etat === 'fait') fail(`${shLabel(s, id)} a déjà parlé : reprends le fil de l'échange ouvert, une première prise de contact la ferait recommencer à zéro.`);
if (etat === 'attente') fail(`${shLabel(s, id)} est sollicitée depuis le ${sh.sollicitee_le} et n'a pas répondu. Relance sur le même fil, ou renonce — une deuxième question avant la réponse à la première, c'est deux questions d'un coup.`);
if (sh.status === 'non disponible') fail(`${shLabel(s, id)} est déclarée « non disponible » : dis d'abord pourquoi elle redevient joignable, sinon le statut ne veut rien dire.`);
if (!canal) fail(`${shLabel(s, id)} n'a pas de \`joignable_par\` : on ne sait pas par quoi lui écrire. Demande-le à l'utilisateur.`);
if (!adresse) fail(`Aucune coordonnée pour ${id} dans ${contactsPath}. Le canal est annoncé (« ${canal} »), la coordonnée n'y est pas (S114) — demande-la à l'utilisateur, et ne la recopie pas dans l'état.`);

// LA question, et une seule : la zone ouverte qui lui est ADRESSÉE et qui coûte le plus cher ouverte.
// `ask_to`, pas `related` : une question sur quelqu'un n'est pas une question à quelqu'un (S94).
const zones = rank(arr(s.shadow_zones)).filter(z => z.ask_to === id);
if (!zones.length) fail(`Aucune zone d'ombre ouverte ne lui est adressée (\`ask_to: ${id}\`). Écrire à quelqu'un sans question précise dépense la seule prise de contact qu'on a.`);
const zone = zones[0];

const sponsor = arr(s.stakeholders).find(x => x.role && /sponsor/i.test(x.role));
const demandeur = s.request?.requested_by ?? sponsor?.id ?? '';
const initiative = s.initiative ?? s.title ?? '(initiative sans nom)';

const message = [
  `Bonjour ${sh.name || ''},`.replace(' ,', ','),
  '',
  `Je suis un agent logiciel, et j'écris pour le travail de cadrage de « ${initiative} »${demandeur ? `, à la demande de ${shLabel(s, demandeur)}` : ''}.`,
  'Ce que vous répondrez sera consigné dans un dossier que vous pourrez relire : je vous enverrai ce que j\'en ai compris avant que ça serve à quoi que ce soit, et vous pourrez le corriger.',
  'Vous n\'avez rien demandé, et vous pouvez ne pas répondre ou demander à parler à quelqu\'un plutôt qu\'à moi.',
  '',
  'Une seule question :',
  '',
  zone.question,
  '',
  'Merci.',
].join('\n');

const sortie = {
  stakeholder: id, canal, adresse, zone: zone.id, question: zone.question, message,
  etat: { status: 'sollicitée', sollicitee_le: today(), joignable_par: canal },
};
if (args.includes('--json')) { console.log(JSON.stringify(sortie, null, 2)); process.exit(0); }

console.log([
  `À ${shLabel(s, id)}, par ${canal} — ${adresse}`,
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
  `    status: sollicitée`,
  `    sollicitee_le: "${today()}"`,
  'Sans la date, « sollicitée » compte comme si personne n\'avait jamais écrit (S115). Avec elle, le silence',
  'de la personne devient une question qui vit, et les constats sur sa voix changent de liste.',
  '',
  `À la réponse : une source \`type: échange écrit\`, \`stakeholders: [${id}]\`, le verbatim dans \`quote\` —`,
  `les mots existent déjà, il n'y a qu'à les recopier — puis \`status: interrogée\` et la zone ${zone.id} levée.`,
].join('\n'));
