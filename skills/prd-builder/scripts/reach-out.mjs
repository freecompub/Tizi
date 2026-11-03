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
import { sollicitationEtat, refsDans } from './lib/rules.mjs';

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
// Quatre modes, pas trois. `sollicitee_zone` dit QUELLE question est partie la fois d'avant, donc on
// sait enfin si celle qu'on s'apprête à poser est la même. C'était l'ambiguïté que le message rendait
// à la personne — « si c'est la même que la dernière fois, c'est que j'ai mal lu votre réponse » —, et
// la rendre à la personne était un aveu d'impuissance déguisé en politesse.
//   reprise : elle a répondu, et sa réponse n'a pas fermé la question. C'est le cas réel du premier
//             aller-retour : « j'attends tes questions » est un message, pas une réponse. Ce qui se
//             reformule alors, c'est la QUESTION — et peut-être qu'elle n'était pas pour elle.
// Trois situations se décident AVANT de connaître la question — ce sont elles qui commandent les refus
// ci-dessous. La quatrième a besoin de la zone, donc elle se décide plus bas : séparer les deux est ce
// qui évite de lire `zone` avant qu'elle existe, ce que le court-circuit d'un ternaire cachait.
const dejaPosee = String(sh.sollicitee_zone ?? '').trim();
const situation = etat === 'attente' ? 'relance' : siennes.length ? 'repondu' : 'premiere';

if (sh.status === 'non disponible') fail(`${shLabel(s, id)} est déclarée « non disponible » : dis d'abord pourquoi elle redevient joignable, sinon le statut ne veut rien dire.`);
// Une relance est une DÉCISION, pas l'enchaînement naturel du silence : on écrit une deuxième fois à
// quelqu'un qui n'a pas répondu à la première, et ça se fait les yeux ouverts. D'où le drapeau.
if (situation === 'relance' && !args.includes('--relance')) {
  fail(`Une question est partie à ${shLabel(s, id)} le ${sh.sollicitee_le} — ${jours(sh.sollicitee_le)} jour(s) — et ${siennes.length ? 'rien n\'est venu d\'elle depuis' : 'elle n\'a pas répondu'}. Une deuxième question avant la réponse à la première, c'est deux questions d'un coup. Trois issues : attendre ; relancer la même question, et c'est \`--relance\` ; renoncer, et c'est \`status: non disponible\` en disant pourquoi.`);
}
// `sollicitée` sans date : on ne sait pas si une question vit. Composer là-dessus, c'est écrire à
// l'aveugle à quelqu'un qui a peut-être déjà notre question sous les yeux.
if (sh.status === 'sollicitée' && etat !== 'attente') fail(`${shLabel(s, id)} est déclarée « sollicitée » sans date de départ (\`sollicitee_le\`, S115) : on ne sait pas si une question est en vol. Écris la date, ou repasse-la « à interroger » si rien n'est parti.`);
// Et le cas où le dossier a la réponse sans pouvoir le prouver : la comparaison des dates est le seul
// moyen de savoir si elle a répondu depuis, et une source sans date la rend impossible.
if (situation === 'repondu' && JOUR_RE.test(String(sh.sollicitee_le ?? '').trim()) && !siennes.some(x => JOUR_RE.test(String(x.date ?? '').trim()))) {
  fail(`Aucune des ${siennes.length} source(s) de ${shLabel(s, id)} ne porte de date, et on lui a écrit le ${sh.sollicitee_le} : impossible de savoir si elle a répondu depuis (S115). Date la source qui vient d'elle.`);
}
if (!canal) fail(`${shLabel(s, id)} n'a pas de \`joignable_par\` : on ne sait pas par quoi lui écrire. Demande-le à l'utilisateur.`);
if (!adresse) fail(`Aucune coordonnée pour ${id} dans ${contactsPath}. Le canal est annoncé (« ${canal} »), la coordonnée n'y est pas (S114) — demande-la à l'utilisateur, et ne la recopie pas dans l'état.`);

// LA question, et une seule : la zone ouverte qui lui est ADRESSÉE et qui coûte le plus cher ouverte.
// `ask_to`, pas `related` : une question sur quelqu'un n'est pas une question à quelqu'un (S94).
const zones = rank(arr(s.shadow_zones)).filter(z => z.ask_to === id);
if (!zones.length) fail(`Aucune zone d'ombre ouverte ne lui est adressée (\`ask_to: ${id}\`). Écrire à quelqu'un sans question précise dépense la seule prise de contact qu'on a.`);
// En relance, c'est la MÊME question qui repart, et `sollicitee_zone` dit laquelle : on ne la devine
// plus par le classement, comme il fallait le faire avant que le champ existe. Si elle n'est plus
// ouverte, il n'y a rien à relancer — l'état se contredit, et le dire vaut mieux que d'envoyer une
// autre question sous couvert de relance, ce qui ferait croire à la personne qu'on l'a déjà interrogée.
let zone = zones[0];
if (situation === 'relance' && dejaPosee) {
  zone = zones.find(z => z.id === dejaPosee);
  if (!zone) fail(`La question partie le ${sh.sollicitee_le} était ${dejaPosee}, qui n'est plus une zone ouverte adressée à ${shLabel(s, id)} : il n'y a rien à relancer. Soit elle a été levée — retire alors \`sollicitee_le\` et \`sollicitee_zone\` —, soit elle a changé de destinataire (\`ask_to\`).`);
}
// La quatrième situation, celle qui a besoin de la question : sa réponse a-t-elle fermé celle qu'on
// lui avait posée ? `sollicitee_zone` le dit. Avant lui, le message rendait la question à la personne.
const mode = situation !== 'repondu' ? situation : dejaPosee === zone.id ? 'reprise' : 'suite';

// Ce qui part vers quelqu'un ne parle QUE en clair. Trois pièges, les trois trouvés en composant un
// vrai message plutôt qu'en relisant le code.
//
// 1. `initiative` est un OBJET dans les deux gabarits — `{ name, slug, trigger }`. Interpolé tel quel,
//    il donnait « le travail de cadrage de « [object Object] » », et un fixture écrit à la main avec une
//    chaîne le cachait. Mesuré sur le troisième dossier réel : c'est exactement ce qui sortait.
// 2. `shLabel` rend « Karim (SH-02) ». C'est l'outil des rapports INTERNES. La doctrine de S104 dit
//    qu'un document qui part ne parle pas par adresses, et une partie prenante est encore plus loin de
//    l'index que l'utilisateur : lui, au moins, peut le demander. `SH-02` ne veut rien dire pour elle.
// 3. La question elle-même est écrite par l'agent, et peut porter « BC-001 » sans que rien ne l'arrête.
//    S104 ne peut pas le voir : elle contrôle des fichiers, et ce message n'en est pas un.
const nomClair = id => { const x = arr(s.stakeholders).find(y => y.id === id); return String(x?.name || x?.role || '').trim(); };
const initiative = String(s.initiative?.name ?? (typeof s.initiative === 'string' ? s.initiative : '') ?? '').trim();
if (!initiative) fail(`L'initiative n'a pas de nom (\`initiative.name\`) : on n'écrit pas à quelqu'un « le travail de cadrage de «  » ». Nomme-la d'abord.`);

const sponsor = arr(s.stakeholders).find(x => x.role && /sponsor/i.test(x.role));
const demandeur = nomClair(s.request?.requested_by ?? sponsor?.id ?? '');

const refs = refsDans(zone.question);
if (refs.length) fail(`La question de ${zone.id} porte ${refs.length > 1 ? 'des identifiants internes' : 'un identifiant interne'} (${refs.join(', ')}) : la personne au bout n'a pas l'index sous les yeux, et ne l'aura jamais — c'est la doctrine de S104, un cran plus loin. Réécris la question en clair avant de l'envoyer.`);

const bonjour = `Bonjour ${sh.name || ''},`.replace(' ,', ',');
// Trois messages, et ce qui les sépare n'est pas le ton : c'est ce que la personne sait déjà. À la
// première, elle ne sait rien, donc la déclaration est entière. À la suite, elle sait, et la redire la
// traiterait en inconnue. À la relance, elle a déjà la question : ce qui change, c'est qu'on dit qu'on
// n'insistera pas — sinon « relance » veut dire « on recommencera », et une source se brûle comme ça.
// Les paragraphes sont séparés par des LIGNES VIDES, jamais par un simple retour. Un courriel part en
// `text/plain; format=flowed` : les retours simples y sont des coupures DOUCES, que certains clients
// recollent en un bloc. Vu sur le brouillon réel — les trois phrases de la déclaration, séparées par un
// seul retour, pouvaient se retrouver en un paragraphe où la phrase qui compte le plus se noie.
const MESSAGES = {
  premiere: [
    bonjour, '',
    `Je suis un agent logiciel, et j'écris pour le travail de cadrage de « ${initiative} »${demandeur ? `, à la demande de ${demandeur}` : ''}.`, '',
    'Ce que vous répondrez sera consigné dans un dossier que vous pourrez relire : je vous enverrai ce que j\'en ai compris avant que ça serve à quoi que ce soit, et vous pourrez le corriger.', '',
    'Vous n\'avez rien demandé, et vous pouvez ne pas répondre ou demander à parler à quelqu\'un plutôt qu\'à moi.',
    '', 'Une seule question :', '', zone.question, '', 'Merci.',
  ],
  // « Une question de plus » était faux la moitié du temps, et la première vraie réponse l'a montré :
  // elle disait « j'attends tes questions » — un message, pas une réponse — donc la zone restait ouverte
  // et le mode suite reposait LA MÊME question en remerciant d'y avoir répondu. Le script ne sait pas
  // laquelle est partie la fois d'avant (rien ne l'enregistre), donc il dit ce qui est vrai dans les
  // deux cas, et il rend l'ambiguïté à la personne au lieu de la trancher à sa place.
  suite: [
    bonjour, '',
    'Merci pour votre réponse, elle est consignée dans le dossier.', '',
    `Une question de plus sur « ${initiative} », et une seule :`,
    '', zone.question, '',
    'Comme la première fois, vous relirez ce que j\'en aurai compris avant que ça serve. Et vous pouvez arrêter là : dites-le moi, je le noterai.',
  ],
  reprise: [
    bonjour, '',
    'Merci pour votre réponse. Je reviens sur la même question, parce que je l\'ai mal posée — la faute est de mon côté.', '',
    zone.question, '',
    'Reformulez comme vous voulez, même en quelques mots. Et si ce n\'est pas à vous qu\'il faut la poser, dites-le moi : je la porterai à qui de droit plutôt que de vous la reposer.', '',
    'Vous pouvez aussi arrêter là : dites-le moi, je le noterai.',
  ],
  relance: [
    bonjour, '',
    `Je vous ai écrit le ${sh.sollicitee_le} et je n'ai pas eu de retour. Sans reproche — je relance une fois, au cas où le message serait passé inaperçu.`,
    '', zone.question, '',
    'Si vous préférez ne pas répondre, dites-le moi simplement : je le noterai et je n\'insisterai plus.',
  ],
};
const message = MESSAGES[mode].join('\n');
// L'objet. Un courriel en exige un, une messagerie n'en a pas : c'est donc un champ que le script
// PROPOSE, et que l'agent ignore si le canal n'en veut pas. En relance il est identique à celui de la
// première fois, parce qu'une relance reste dans le MÊME fil : un objet neuf ouvre une conversation
// neuve, et la personne reçoit deux fois la même question sans voir qu'il s'agit de la même.
const OBJETS = {
  premiere: `Une question — ${initiative}`,
  suite: `Suite de notre échange — ${initiative}`,
  // La reprise et la relance portent l'objet de la première fois : c'est la même question, et un objet
  // neuf ferait croire à un sujet neuf.
  reprise: `Une question — ${initiative}`,
  relance: `Une question — ${initiative}`,
};
const objet = OBJETS[mode];

// Ce qu'il faudra écrire quand le message sera parti. En suite et en relance, le statut ne bouge pas :
// elle a parlé, elle reste `interrogée`, et c'est la DATE qui porte l'attente. La repasser `sollicitée`
// éteindrait faussement ce que sa voix avait fermé.
const sortie = {
  stakeholder: id, mode, canal, adresse, zone: zone.id, question: zone.question, objet, message,
  etat: mode === 'premiere'
    ? { status: 'sollicitée', sollicitee_le: today(), sollicitee_zone: zone.id, joignable_par: canal }
    : { sollicitee_le: today(), sollicitee_zone: zone.id },
};
if (args.includes('--json')) { console.log(JSON.stringify(sortie, null, 2)); process.exit(0); }

const TITRE = { premiere: 'Première prise de contact', suite: 'Suite du fil',
  reprise: `Reprise de ${zone.id} — elle a répondu, la question est restée ouverte`,
  relance: `Relance — sans réponse depuis ${JOUR_RE.test(String(sh.sollicitee_le ?? '')) ? `${jours(sh.sollicitee_le)} j` : 'une date inconnue'}` };
console.log([
  `${TITRE[mode]} — à ${shLabel(s, id)}, par ${canal} — ${adresse}`,
  `Zone visée : ${zone.id}${zone.reasons.length ? ` (${zone.reasons.join(', ')})` : ''}`,
  `Objet : ${objet}`,
  ...(nomClair(id) === String(sh.role ?? '').trim() && !String(sh.name ?? '').trim()
    ? ['On n\'a pas son nom, seulement sa fonction : le message commence donc par « Bonjour, ». Demande-le'
       + ' à l\'utilisateur si tu l\'as — écrire à quelqu\'un dont on ignore le nom se voit, et se paie.'] : []),
  ...(zones.length > 1 ? [`${zones.length - 1} autre(s) zone(s) lui sont adressées : elles attendent sa réponse à celle-ci. Une question à la fois.`] : []),
  '',
  '── Message ──',
  message,
  '── Fin ──',
  '',
  'Envoie-le toi-même par le canal de l\'hôte, s\'il en offre un ; sinon remets-le à l\'utilisateur. Ce script',
  'n\'envoie rien : il ne sait pas à quoi tu es branché, et un message parti est irréversible.',
  '',
  'AVANT D\'ENVOYER, REGARDE DE QUEL COMPTE ÇA PART. Le corps dit « je suis un agent logiciel » ; si',
  'l\'enveloppe porte le nom d\'une personne — « De : Prénom Nom » —, le destinataire croira l\'enveloppe,',
  'et la déclaration devient un démenti qu\'on ne lit pas. Mesuré sur un brouillon réel : le compte était',
  'nominatif, et rien dans ce script ne pouvait le savoir. Deux issues, et le choix n\'est pas à toi :',
  'un compte qui ne prête pas à confusion, ou une première ligne qui dit de quelle boîte ça part et',
  'pourquoi. Demande à l\'utilisateur — c\'est son compte, et c\'est son nom qui apparaît.',
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
