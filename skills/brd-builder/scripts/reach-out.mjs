#!/usr/bin/env node
// Les questions à écrire à une partie prenante absente, et rien de plus. Compose le message d'une
// sollicitation par canal : la déclaration obligatoire, la ou les questions, et les deux lignes à
// réécrire dans l'état quand le message est parti.
//
// Pourquoi un script et pas une consigne. Un entretien par canal n'est PAS un guide d'entretien : le
// guide part dans les mains d'un humain qui mènera la conversation sans l'agent, huit à douze questions
// en quarante-cinq minutes, avec de quoi relancer. Ici c'est l'agent qui écrit, à quelqu'un qui n'a rien
// choisi, et personne n'est là entre deux messages. Le choix des questions ne se laisse donc pas au
// jugement du moment : il sort du classement d'impact de `ask-five.mjs`, le même qui ordonne les
// questions posées à l'utilisateur.
//
// Combien de questions à la fois : ce n'est pas le canal qui le dit. La règle d'une seule question par
// tour avait un motif unique — la question suivante s'écrit à partir de la réponse à la précédente —, et
// ce motif ne vaut que pour l'ÉLICITATION. Une question qui précise ce que la personne a DÉJÀ dit ne
// dépend d'aucune autre réponse ; plusieurs comme elle coûtent moins en un message qu'en dix. Ce qui
// gouverne le nombre est donc la DÉPENDANCE entre les questions, et le dossier la porte déjà : voir le
// bloc « Une question, ou plusieurs » plus bas. Le canal, lui, gouverne la FORME — objet ou pas, place
// disponible, longueur de la déclaration, délai au bout duquel un silence se signale.
//
// Le script REFUSE de composer plutôt que de composer à moitié : personne à qui écrire, aucun canal, un
// canal qui ne porte pas d'écrit, aucune coordonnée, aucun commanditaire nommé, rien à demander, une
// sollicitation déjà en vol. Chacun de ces refus est une condition qu'on aurait sinon découverte dans la
// boîte de réception de quelqu'un.
//
// Usage : node reach-out.mjs <état.yaml> --sh SH-xx [--relance] [--json]
import { arr, loadState, fail, today, shLabel, seuilRepetitions, foisPosee } from './lib/common.mjs';
import { sollicitationEtat, zonesSollicitees, familleDe } from './lib/rules.mjs';
import { nomClair, nomInitiative, demandeur, langueDe, langueDuDossier, joindre, formeEcrite, refuseLesIdentifiants, refuseLaTroisiemePersonne, AVERTISSEMENT_COMPTE, N_ENVOIE_RIEN } from './lib/outgoing.mjs';

const JOUR_RE = /^\d{4}-\d{2}-\d{2}$/;
const jours = d => Math.floor((Date.parse(today()) - Date.parse(d)) / 86400000);
import { rank } from './ask-five.mjs';

const args = process.argv.slice(2);
const statePath = args.find(a => !a.startsWith('--') && !/^SH-/.test(a));
const id = args.includes('--sh') ? args[args.indexOf('--sh') + 1] : '';
if (!statePath || !id) fail('Usage : node reach-out.mjs <état.yaml> --sh SH-xx [--relance] [--json]', 2);

const s = loadState(statePath);
const sh = arr(s.stakeholders).find(x => x.id === id);
if (!sh) fail(`${id} n'est pas une partie prenante de ${statePath}.`);

// Les coordonnées vivent à côté de l'état et ne se commitent pas (S114). Absentes, il n'y a rien à
// composer : un message sans destinataire ne s'écrit pas « en attendant ».
const { canal, adresse } = joindre(s, statePath, id);
// Et un canal qui ne porte pas d'écrit n'est pas un canal de message. Le téléphone et la vive voix sont
// des conversations : elles se mènent avec un guide d'entretien, pas avec un texte composé d'avance.
const forme = formeEcrite(canal, `${shLabel(s, id)} est déclarée joignable`);
// L'outil et la forme ne sont pas le même mot, et le fragment doit dire les deux. « par slack » dit
// avec quoi on écrit — et c'est ce qui dira quel connecteur il faut ; « forme : messagerie » dit
// pourquoi il n'y a pas d'objet et pourquoi le silence se tranche à deux jours. Les confondre faisait
// rendre un message à objet pour un fil de discussion, puisque quatre outils tombaient dans un mot.
const famille = familleDe(canal);
const parQuoi = famille === canal.trim().toLowerCase() ? canal : `${canal} (forme : ${famille})`;
const etat = sollicitationEtat(sh, s.sources);
const siennes = arr(s.sources).filter(x => arr(x.stakeholders).includes(id));

// Le MODE se déduit de l'état, il ne se choisit pas par un drapeau : le dossier sait déjà où on en est,
// et laisser choisir ouvrirait la porte à une première prise de contact envoyée à quelqu'un qu'on a
// déjà interrogé — qui le ferait recommencer à zéro et lui donnerait l'air d'avoir parlé dans le vide.
//   attente → une question vit : rien de neuf ne part, on relance la même ou on renonce ;
//   a parlé → la suite du fil, courte, sans redire qui on est ;
//   sinon   → la première prise de contact, avec la déclaration en entier.
// Quatre modes, pas trois. `sollicitee_zone` dit QUELLES questions sont parties la fois d'avant, donc on
// sait enfin si celle qu'on s'apprête à poser est la même. C'était l'ambiguïté que le message rendait
// à la personne — « si c'est la même que la dernière fois, c'est que j'ai mal lu votre réponse » —, et
// la rendre à la personne était un aveu d'impuissance déguisé en politesse.
//   reprise : elle a répondu, et sa réponse n'a pas fermé la question. C'est le cas réel du premier
//             aller-retour : « j'attends tes questions » est un message, pas une réponse. Ce qui se
//             reformule alors, c'est la QUESTION — et peut-être qu'elle n'était pas pour elle.
// Trois situations se décident AVANT de connaître les questions — ce sont elles qui commandent les refus
// ci-dessous. La quatrième a besoin de la zone de tête, donc elle se décide plus bas : séparer les deux
// est ce qui évite de lire `zone` avant qu'elle existe, ce que le court-circuit d'un ternaire cachait.
const dejaPosees = zonesSollicitees(sh);
const situation = etat === 'attente' ? 'relance' : siennes.length ? 'repondu' : 'premiere';

// Le refus sait enfin de quoi il parle : `non disponible` couvrait quatre situations, et la plus
// grave — elle a refusé — demandait de ne PAS la recontacter sur notre seule initiative.
if (sh.status === 'non disponible') {
  const motif = String(sh.indisponible_motif ?? '').trim();
  const RAISON = {
    refus: 'elle a refusé de répondre, et le message qu\'on lui a envoyé l\'y invitait expressément. On ne revient pas vers quelqu\'un qui a dit non parce qu\'on a une nouvelle question : c\'est à l\'utilisateur de dire si elle a changé d\'avis, et à lui de le lui demander.',
    silence: 'on a renoncé après son silence. Dis ce qui a changé depuis — un canal qui marche, quelqu\'un qui la prévient —, sinon la même question partira au même endroit.',
    absence: 'elle était absente ou injoignable. Dis ce qui a changé : son retour, un autre canal.',
    renoncement: 'c\'est NOUS qui avons renoncé, pour nos raisons. Celles-là se reprennent : dis pourquoi elles ne valent plus, et repasse-la « à interroger ».',
  };
  fail(`${shLabel(s, id)} est déclarée « non disponible »${motif ? ` — ${RAISON[motif.split(':')[0]] ?? `motif « ${motif} »`}` : ' sans dire pourquoi (`indisponible_motif`, S116), donc on ne sait même pas ce qu\'il faudrait avoir changé'}`);
}
// Une relance est une DÉCISION, pas l'enchaînement naturel du silence : on écrit une deuxième fois à
// quelqu'un qui n'a pas répondu à la première, et ça se fait les yeux ouverts. D'où le drapeau.
if (situation === 'relance' && !args.includes('--relance')) {
  fail(`${dejaPosees.length > 1 ? `${dejaPosees.length} questions sont parties` : 'Une question est partie'} à ${shLabel(s, id)} le ${sh.sollicitee_le} — ${jours(sh.sollicitee_le)} jour(s) — et ${siennes.length ? 'rien n\'est venu d\'elle depuis' : 'elle n\'a pas répondu'}. De nouvelles questions avant la réponse aux premières, c'est tout envoyer d'un coup. Trois issues : attendre ; relancer les mêmes, et c'est \`--relance\` ; renoncer, et c'est \`status: non disponible\` en disant pourquoi.`);
}
// `sollicitée` sans date : on ne sait pas si une question vit. Composer là-dessus, c'est écrire à
// l'aveugle à quelqu'un qui a peut-être déjà notre question sous les yeux.
if (sh.status === 'sollicitée' && etat !== 'attente') fail(`${shLabel(s, id)} est déclarée « sollicitée » sans date de départ (\`sollicitee_le\`, S115) : on ne sait pas si une question est en vol. Écris la date, ou repasse-la « à interroger » si rien n'est parti.`);
// Et le cas où le dossier a la réponse sans pouvoir le prouver : la comparaison des dates est le seul
// moyen de savoir si elle a répondu depuis, et une source sans date la rend impossible.
if (situation === 'repondu' && JOUR_RE.test(String(sh.sollicitee_le ?? '').trim()) && !siennes.some(x => JOUR_RE.test(String(x.date ?? '').trim()))) {
  fail(`Aucune des ${siennes.length} source(s) de ${shLabel(s, id)} ne porte de date, et on lui a écrit le ${sh.sollicitee_le} : impossible de savoir si elle a répondu depuis (S115). Date la source qui vient d'elle.`);
}

// Les questions candidates : les zones ouvertes qui lui sont ADRESSÉES, par ordre d'impact.
// `ask_to`, pas `related` : une question sur quelqu'un n'est pas une question à quelqu'un (S94).
const adressees = rank(arr(s.shadow_zones)).filter(z => z.ask_to === id);
// Une question déjà partie trois fois sans réponse ne repart pas une quatrième. C'est le défaut que
// `posee` sert à voir, et le voir sans l'empêcher ne servirait à rien : la reposer use la personne et ne
// produit pas la réponse que les trois premières n'ont pas produite. Elle s'assume ou se tranche, et ni
// l'un ni l'autre n'est une décision d'outil (S120).
const seuil = seuilRepetitions(s);
const rabachees = adressees.filter(z => foisPosee(z).length >= seuil);
const zones = adressees.filter(z => foisPosee(z).length < seuil);
if (!adressees.length) fail(`Aucune zone d'ombre ouverte ne lui est adressée (\`ask_to: ${id}\`). Écrire à quelqu'un sans question précise dépense la seule prise de contact qu'on a.`);
if (!zones.length) {
  fail(`${rabachees.length > 1 ? 'Toutes les questions qui lui sont adressées sont parties' : 'La seule question qui lui est adressée est partie'} ${seuil} fois ou plus sans réponse (${rabachees.map(z => `${z.id} : ${foisPosee(z).length} fois`).join(' · ')}) : ${rabachees.length > 1 ? 'ce ne sont plus des questions' : 'ce n\'est plus une question'}, et une fois de plus ne produira pas ce que les précédentes n'ont pas produit. Deux issues, et c'est l'utilisateur qui tranche : ${rabachees.length > 1 ? 'les assumer' : 'l\'assumer'} — \`status: assumée\` avec la raison, portée par un risque ou une hypothèse —, ou décider autrement.`);
}

// En relance, ce sont les MÊMES questions qui repartent, et `sollicitee_zone` dit lesquelles : on ne les
// devine plus par le classement, comme il fallait le faire avant que le champ existe. Si aucune n'est
// plus ouverte, il n'y a rien à relancer — l'état se contredit, et le dire vaut mieux que d'envoyer une
// autre question sous couvert de relance, ce qui ferait croire à la personne qu'on l'a déjà interrogée.
const encoreOuvertes = dejaPosees.map(ref => zones.find(z => z.id === ref)).filter(Boolean);
if (situation === 'relance' && dejaPosees.length && !encoreOuvertes.length) {
  fail(`${dejaPosees.length > 1 ? `Les questions parties` : `La question partie`} le ${sh.sollicitee_le} ${dejaPosees.length > 1 ? 'étaient' : 'était'} ${dejaPosees.join(', ')}, ${dejaPosees.length > 1 ? 'et aucune n\'est plus une zone ouverte adressée' : 'qui n\'est plus une zone ouverte adressée'} à ${shLabel(s, id)} : il n'y a rien à relancer. Soit ${dejaPosees.length > 1 ? 'elles ont été levées' : 'elle a été levée'} — retire alors \`sollicitee_le\` et \`sollicitee_zone\` —, soit le destinataire a changé (\`ask_to\`).`);
}
const tete = situation === 'relance' && encoreOuvertes.length ? encoreOuvertes[0] : zones[0];
// La quatrième situation, celle qui a besoin de la question : sa réponse a-t-elle fermé celle qu'on
// lui avait posée ? `sollicitee_zone` le dit. Avant lui, le message rendait la question à la personne.
const mode = situation !== 'repondu' ? situation : dejaPosees.includes(tete.id) ? 'reprise' : 'suite';

// ── Une question, ou plusieurs ──────────────────────────────────────────────
// Le dossier porte déjà la distinction qui commande le nombre, et personne ne la lisait : `origin` dit
// d'où la zone est née. Née d'une source où ELLE parle, c'est une PRÉCISION de ses propres mots, et une
// précision ne dépend d'aucune autre réponse — « vous avez dit dix minutes par dossier : pour une
// famille nouvelle, ou qui revient ? » se répond seule. Née d'un council, d'un atelier, du cadrage, ou
// d'une source où quelqu'un d'AUTRE parle, c'est de l'exploration : on ne sait pas ce qu'elle va
// répondre, et sa réponse commandera la suivante.
//
// Mesuré sur le dossier réel avant d'écrire une ligne : 22 zones ouvertes adressées à quelqu'un, 15
// précisions et 7 explorations ; pour la personne la plus sollicitée, 10 précisions sur 18. Et quatre
// des sept explorations venaient bien d'un `SRC-xxx` — celui de quelqu'un d'autre. Leur demander de
// commenter la parole d'un tiers n'est pas préciser la leur, et le critère les sépare.
//
// Ce que le critère établit est l'INDÉPENDANCE, pas la brièveté. Une question née de ses mots peut
// rester ouverte et longue — « qu'est-ce que le papier empêche, au-delà des pertes ? » vient de sa
// source : elle ne dépend toujours d'aucune autre réponse, et c'est tout ce qu'il faut pour la grouper.
// La brièveté, elle, relève du canal : c'est la place disponible, et c'est `forme.groupe`.
//
// Conséquence qu'on n'avait pas vue et qui tombe toute seule : une PREMIÈRE prise de contact ne peut
// jamais grouper. Le mode `premiere` veut dire qu'aucune source ne la porte comme locutrice, donc
// qu'aucune zone ne peut être née de ses mots — chez quelqu'un qui n'a jamais parlé, tout est
// exploration. La liste n'existe donc qu'au deuxième tour, et la règle d'une seule question tient
// entière là où elle était justifiée. La reprise reste seule aussi : on s'excuse d'avoir mal posé UNE
// question, et y glisser des nouvelles brouillerait l'excuse.
const miennes = new Set(siennes.map(x => x.id));
const precision = z => miennes.has(String(z.origin ?? '').trim());
const groupables = zones.filter(z => z.id !== tete.id && precision(z));
const posees = mode === 'relance' ? encoreOuvertes
  : mode === 'suite' && precision(tete) ? [tete, ...groupables].slice(0, forme.groupe)
    : [tete];
// Ce qu'on garde pour plus tard, et qu'on peut lui dire : ce sont les mêmes, indépendantes, et seule la
// place du canal les retient. Ne pas le dire donnerait l'impression d'un robinet sans fond.
const gardees = mode === 'suite' && precision(tete) ? Math.max(0, groupables.length - (posees.length - 1)) : 0;

// Ce qui part vers quelqu'un ne parle QUE en clair. Trois pièges, les trois trouvés en composant un
// vrai message plutôt qu'en relisant le code.
//
// 1. `initiative` est un OBJET dans les deux gabarits — `{ name, slug, trigger }`. Interpolé tel quel,
//    il donnait « le travail de cadrage de « [object Object] » », et un fixture écrit à la main avec une
//    chaîne le cachait. Mesuré sur le troisième dossier réel : c'est exactement ce qui sortait.
// 2. `shLabel` rend « Karim (SH-02) ». C'est l'outil des rapports INTERNES. La doctrine de S104 dit
//    qu'un document qui part ne parle pas par adresses, et une partie prenante est encore plus loin de
//    l'index que l'utilisateur : lui, au moins, peut le demander. `SH-02` ne veut rien dire pour elle.
// 3. Les questions elles-mêmes sont écrites par l'agent, et peuvent porter « BC-001 » sans que rien ne
//    l'arrête. S104 ne peut pas le voir : elle contrôle des fichiers, et ce message n'en est pas un.
const initiative = nomInitiative(s);
if (!initiative) fail(`L'initiative n'a pas de nom (\`initiative.name\`) : on n'écrit pas à quelqu'un « le travail de cadrage de «  » ». Nomme-la d'abord.`);
// Et le commanditaire, qui n'est plus facultatif : c'est la ligne qui rattache le message à ce que la
// personne attend, et elle disparaissait en silence.
const demande = demandeur(s);

for (const z of posees) {
  refuseLesIdentifiants(z.question, `La question de ${z.id}`);
  refuseLaTroisiemePersonne(s, id, z.question, `La question de ${z.id}`);
}

const bonjour = `Bonjour ${sh.name || ''},`.replace(' ,', ',');
// Les questions, numérotées dès qu'il y en a plus d'une, et séparées par des LIGNES VIDES comme tout le
// reste : un courriel part en `text/plain; format=flowed`, où un simple retour est une coupure DOUCE que
// certains clients recollent. Une liste dont les éléments fusionnent est illisible, et c'est le défaut
// qui a coûté le plus cher à trouver — il ne se voit que dans une vraie boîte.
const QUESTIONS = posees.length === 1 ? [posees[0].question]
  : posees.map((z, i) => `${i + 1}. ${z.question}`).flatMap((l, i) => (i ? ['', l] : [l]));
const entete = posees.length === 1 ? 'Une seule question :'
  : `${posees.length} questions, indépendantes les unes des autres : répondez dans l'ordre que vous voulez, et laissez celles auxquelles vous ne pouvez pas répondre.`;
const reste = gardees ? [`J'en ai ${gardees} autre(s) de la même sorte. Je ne vous les envoie pas toutes d'un coup : elles attendront.`, ''] : [];
// L'ambiguïté qu'on rendait à la personne — « si c'est la même que la dernière fois, c'est que j'ai mal
// lu votre réponse » — ne se justifie plus que dans UN cas : quand rien n'enregistre ce qui est parti la
// fois d'avant. Si `sollicitee_zone` le dit, le script sait, et la reprise est un mode à part. Lui
// laisser la phrase ailleurs, c'est lui demander un calcul qu'on peut faire soi-même.
const doute = dejaPosees.length ? []
  : [posees.length === 1
    ? 'Si c\'est la même que la dernière fois, c\'est que j\'ai mal lu votre réponse — dites-le moi, et reformulez comme vous voulez.'
    : 'Si l\'une d\'elles est la même que la dernière fois, c\'est que j\'ai mal lu votre réponse — dites-le moi, et reformulez comme vous voulez.', ''];

// ── La déclaration, longue ou courte selon la place ─────────────────────────
// Ce qu'elle DIT ne change pas d'un canal à l'autre : qui écrit — un agent, et le compte d'envoi porte
// peut-être un nom de personne —, au nom de qui, où va la réponse, et qu'elle est libre. Seule sa
// longueur change. Quatre paragraphes dans un courriel, deux sur une messagerie : une déclaration qui
// remplit l'écran d'un téléphone avant la première question ne se lit pas, et une déclaration qu'on ne
// lit pas ne vaut pas mieux qu'une déclaration absente.
//
// Le consentement, lui, n'est plus dans le message : mettre la coordonnée dans `contacts.yaml` EST son
// enregistrement, et c'est l'utilisateur qui l'a obtenu. Ce qui reste n'en est pas — c'est ce que la
// personne a besoin de savoir pour lire ce qu'elle reçoit, et pour pouvoir s'arrêter.
const DECLARATION = {
  longue: [
    `Je suis un agent logiciel, et j'écris pour le travail de cadrage de « ${initiative} », à la demande de ${demande}.`, '',
    'Ce que vous répondrez sera consigné dans un dossier que vous pourrez relire : je vous enverrai ce que j\'en ai compris avant que ça serve à quoi que ce soit, et vous pourrez le corriger.', '',
    'Vous n\'avez rien demandé, et vous pouvez ne pas répondre ou demander à parler à quelqu\'un plutôt qu\'à moi.', '',
  ],
  courte: [
    `Je suis un agent logiciel et j'écris à la demande de ${demande}, pour le cadrage de « ${initiative} ».`, '',
    'Ce que vous répondrez ira dans un dossier que vous relirez avant que ça serve. Vous pouvez ne pas répondre, ou demander à parler à quelqu\'un plutôt qu\'à moi.', '',
  ],
};
// Trois messages de plus, et ce qui les sépare n'est pas le ton : c'est ce que la personne sait déjà. À
// la première, elle ne sait rien, donc la déclaration est entière. À la suite, elle sait, et la redire la
// traiterait en inconnue. À la relance, elle a déjà les questions : ce qui change, c'est qu'on dit qu'on
// n'insistera pas — sinon « relance » veut dire « on recommencera », et une source se brûle comme ça.
const MESSAGES = {
  premiere: [
    bonjour, '',
    ...DECLARATION[forme.declaration],
    entete, '', ...QUESTIONS, '', 'Merci.',
  ],
  suite: [
    bonjour, '',
    'Merci pour votre réponse, elle est consignée dans le dossier.', '',
    `Je reviens vers vous sur « ${initiative} ». ${entete}`,
    '', ...QUESTIONS, '',
    ...reste,
    ...doute,
    'Comme la première fois, vous relirez ce que j\'en aurai compris avant que ça serve. Et vous pouvez arrêter là : dites-le moi, je le noterai.',
  ],
  reprise: [
    bonjour, '',
    'Merci pour votre réponse. Je reviens sur la même question, parce que je l\'ai mal posée — la faute est de mon côté.', '',
    ...QUESTIONS, '',
    'Reformulez comme vous voulez, même en quelques mots. Et si ce n\'est pas à vous qu\'il faut la poser, dites-le moi : je la porterai à qui de droit plutôt que de vous la reposer.', '',
    'Vous pouvez aussi arrêter là : dites-le moi, je le noterai.',
  ],
  relance: [
    bonjour, '',
    `Je vous ai écrit le ${sh.sollicitee_le} et je n'ai pas eu de retour. Sans reproche — je relance une fois, au cas où le message serait passé inaperçu.`,
    '', ...QUESTIONS, '',
    'Si vous préférez ne pas répondre, dites-le moi simplement : je le noterai et je n\'insisterai plus.',
  ],
};
const message = MESSAGES[mode].join('\n');
// L'objet. Un courriel en exige un, une messagerie n'en a pas : le champ ne sort donc que si le canal en
// porte un. Le proposer toujours, c'était laisser l'agent coller un titre au milieu d'un fil de
// discussion. En relance il est identique à celui de la première fois, parce qu'une relance reste dans
// le MÊME fil : un objet neuf ouvre une conversation neuve, et la personne reçoit deux fois les mêmes
// questions sans voir qu'il s'agit des mêmes.
const OBJETS = {
  premiere: `Une question — ${initiative}`,
  suite: `Suite de notre échange — ${initiative}`,
  // La reprise et la relance portent l'objet de la première fois : c'est la même question, et un objet
  // neuf ferait croire à un sujet neuf.
  reprise: `Une question — ${initiative}`,
  relance: `Une question — ${initiative}`,
};
// Pas de variante « N questions » à la première prise de contact : elle ne peut jamais grouper — aucune
// source ne porte la personne comme locutrice, donc rien à préciser. La branche existait, et elle était
// morte ; écrire le test l'a montrée, la relire ne l'avait pas montrée.
const objet = forme.objet ? OBJETS[mode] : null;

// ── La langue de la personne ────────────────────────────────────────────────
// Tizi est en français par choix, pour l'équipe. La personne au bout d'un canal n'est pas de l'équipe,
// et rien ne dit qu'elle lit le français. Le texte ci-dessus est donc la version française DE RÉFÉRENCE
// — celle qui a été écrite, relue et mesurée — et non « le » message.
//
// Si sa langue n'est pas celle du dossier, le script ne traduit pas. Deux raisons, et la seconde est la
// vraie. D'abord parce qu'une déclaration mal traduite peut se tromper sur CE À QUOI la personne
// répond, et que c'est le seul endroit de ce chantier où l'échec n'est pas un dossier moins bon mais
// quelqu'un qui parle sans savoir où ça va. Ensuite parce qu'un script qui rendrait une traduction
// donnerait l'impression que la question est réglée, alors que personne n'aurait relu le résultat.
//
// Ce qu'il fait à la place : il énumère ce que le message DOIT dire, et pourquoi chaque élément existe.
// C'est là toute sa valeur — empêcher qu'un élément obligatoire soit oublié —, et cette valeur ne
// dépend d'aucune langue. L'agent écrit, l'utilisateur relit avant l'envoi.
const toutes = posees.length === 1 ? posees[0].question : posees.map((z, i) => `${i + 1}. ${z.question}`).join(' ');
const combien = posees.length === 1 ? 'UNE question' : `${posees.length} questions, et dire qu'elles sont indépendantes`;
const OBLIGATOIRE = {
  premiere: [
    ['qui écrit', 'qu\'un agent logiciel écrit, pas un humain — et le compte d\'envoi porte peut-être un nom de personne, qui dira le contraire'],
    ['au nom de qui', `à la demande de ${demande} : c'est ce qui rattache le message à ce dont on lui a parlé`],
    ['pour quoi', `le travail de cadrage de « ${initiative} »`],
    ['où va sa réponse', 'dans un dossier qu\'elle pourra relire, et on lui enverra ce qu\'on en a compris avant que ça serve'],
    ['qu\'elle est libre', 'elle n\'a rien demandé ; elle peut ne pas répondre, ou demander à parler à quelqu\'un plutôt qu\'à un agent'],
    [combien, toutes],
  ],
  suite: [
    ['un remerciement', 'sa réponse précédente est consignée'],
    [combien, toutes],
    ...(gardees ? [['ce qu\'on garde pour plus tard', `${gardees} autre(s) question(s) de la même sorte, qu'on n'envoie pas d'un coup`]] : []),
    ['le rappel de la relecture', 'elle relira ce qu\'on en aura compris avant que ça serve'],
    ['la sortie', 'elle peut arrêter là, et il suffit de le dire'],
  ],
  reprise: [
    ['que la faute est de notre côté', 'la question a été mal posée — pas mal répondue'],
    ['LA MÊME question', toutes],
    ['l\'invitation à reformuler', 'dans ses mots, même en quelques mots'],
    ['la redirection possible', 'si ce n\'est pas à elle qu\'il faut la poser, elle peut le dire — on la portera à qui de droit'],
    ['la sortie', 'elle peut arrêter là'],
  ],
  relance: [
    ['quand on a écrit', `le ${sh.sollicitee_le}, et qu\'on n\'a pas eu de retour — sans reproche`],
    ['qu\'on ne relance qu\'une fois', 'au cas où le message serait passé inaperçu'],
    [posees.length === 1 ? 'LA MÊME question' : `LES MÊMES ${posees.length} questions`, toutes],
    ['qu\'on n\'insistera plus', 'si elle préfère ne pas répondre, il suffit de le dire'],
  ],
};
const langue = langueDe(s, id);
const memeLangue = langue === langueDuDossier(s);

// Ce qu'il faudra écrire quand le message sera parti. En suite et en relance, le statut ne bouge pas :
// elle a parlé, elle reste `interrogée`, et c'est la DATE qui porte l'attente. La repasser `sollicitée`
// éteindrait faussement ce que sa voix avait fermé.
// `sollicitee_zone` porte une zone ou la liste de celles qui sont parties ensemble : relancer doit
// pouvoir reposer exactement ce qui a été posé, et une seule des cinq ne le permettrait pas.
const zoneEcrite = posees.length === 1 ? posees[0].id : posees.map(z => z.id);
const sortie = {
  stakeholder: id, mode, canal, adresse, zones: posees.map(z => z.id),
  questions: posees.map(z => z.question), gardees, objet, message,
  etat: mode === 'premiere'
    ? { status: 'sollicitée', sollicitee_le: today(), sollicitee_zone: zoneEcrite, joignable_par: canal }
    : { sollicitee_le: today(), sollicitee_zone: zoneEcrite },
};
if (args.includes('--json')) {
  console.log(JSON.stringify({ ...sortie, langue, meme_langue: memeLangue, forme: { ...forme }, obligatoire: OBLIGATOIRE[mode] }, null, 2));
  process.exit(0);
}

const yamlZone = posees.length === 1 ? `"${posees[0].id}"` : `[${posees.map(z => z.id).join(', ')}]`;

// `sollicitee_zone` vit sur la PERSONNE et ne dit que le dernier envoi : il s'écrase au suivant. Ce qui
// manquait, c'est ce qui est arrivé à la QUESTION — combien de fois elle est partie, et quand. Sans
// elle, une zone encore ouverte a l'air neuve, et c'est ainsi qu'on repose trois fois la même question :
// sur le premier dossier réel, « les 150 dossiers, ça fait combien de familles ? » est partie aux tours
// 175, 178 et 179, et la zone est restée « ouverte » avec sa résolution vide.
const POSEE = [
  '',
  `Et sur ${posees.length > 1 ? 'chacune des zones parties' : 'la zone partie'}, un passage de plus dans \`posee\` :`,
  ...posees.map(z => `    ${z.id} :  - { date: "${today()}", canal: "${canal}" }`),
  'La liste s\'ajoute, elle ne se remplace pas : c\'est elle qui dit si la question est neuve ou rabâchée.',
  `Au-delà de ${seuilRepetitions(s)} passages sans réponse, ce n'est plus une question, c'est un constat : à assumer`,
  'avec sa raison, ou à trancher avec l\'utilisateur — jamais à reposer une fois de plus (S120).',
];

// Sa langue n'est pas celle du dossier : on rend le contrat, pas une traduction.
if (!memeLangue) {
  console.log([
    `${mode === 'premiere' ? 'Première prise de contact' : mode} — à ${shLabel(s, id)}, par ${parQuoi} — ${adresse}`,
    `Zone(s) visée(s) : ${posees.map(z => z.id).join(', ')} · sa langue : ${langue} (celle du dossier : ${langueDuDossier(s)})`,
    '',
    `CE MESSAGE EST À ÉCRIRE EN ${langue.toUpperCase()}, et ce script ne le fait pas.`,
    'Il ne traduit pas, pour deux raisons. Une déclaration mal traduite peut se tromper sur CE À QUOI la',
    'personne répond — c\'est le seul endroit de ce travail où l\'échec n\'est pas un dossier moins bon,',
    'mais quelqu\'un qui parle sans savoir où ça va. Et un script qui rendrait une traduction donnerait',
    'l\'impression que la question est réglée, alors que personne ne l\'aurait relue.',
    '',
    `── Ce que le message doit dire, et pourquoi (${OBLIGATOIRE[mode].length} éléments) ──`,
    ...OBLIGATOIRE[mode].flatMap(([quoi, pourquoi]) => [`  ${quoi}`, `      ${pourquoi}`]),
    '── Fin ──',
    '',
    posees.length === 1
      ? 'Une seule question, comme dans la version de référence : le nombre ne change pas avec la langue.'
      : `${posees.length} questions, comme dans la version de référence, et numérotées : elles sont indépendantes, et le nombre ne change pas avec la langue.`,
    'Et aucun identifiant interne — ni `SH-`, ni `ZO-`, ni `BC-` : elle n\'a pas l\'index sous les yeux.',
    '',
    // Les gabarits de ce script sont écrits en français, et le dire est plus honnête que d'annoncer
    // « version <langue du dossier> » en montrant du français — ce que faisait la première version, et
    // qui ne s'est vu qu'en essayant un dossier en arabe dont une personne lit le français.
    '── Version française de référence (la langue de ce script), pour ce qu\'elle dit et l\'ordre où elle le dit ──',
    message,
    '── Fin ──',
    '',
    `FAIS RELIRE TA VERSION ${langue.toUpperCase()} PAR L'UTILISATEUR AVANT L'ENVOI. Tu ne peux pas vérifier`,
    'toi-même qu\'une déclaration écrite dans une langue dit bien ce qu\'elle doit dire : c\'est le seul',
    'contrôle disponible, et il appartient à un humain. Si tu n\'écris pas cette langue avec assez de',
    'sûreté pour une déclaration, dis-le à l\'utilisateur plutôt que d\'essayer.',
    '',
    N_ENVOIE_RIEN, '', AVERTISSEMENT_COMPTE,
    '',
    ...(objet ? [`Objet proposé, à traduire aussi : ${objet}`] : [`Le canal « ${canal} » ne porte pas d'objet : n'en mets pas.`]),
    '',
    'Quand il est parti, écris sur la partie prenante :',
    ...(mode === 'premiere' ? ['    status: sollicitée'] : []),
    `    sollicitee_le: "${today()}"`,
    `    sollicitee_zone: ${yamlZone}`,
    ...POSEE,
  ].join('\n'));
  process.exit(0);
}

const TITRE = { premiere: 'Première prise de contact', suite: 'Suite du fil',
  reprise: `Reprise de ${tete.id} — elle a répondu, la question est restée ouverte`,
  relance: `Relance — sans réponse depuis ${JOUR_RE.test(String(sh.sollicitee_le ?? '')) ? `${jours(sh.sollicitee_le)} j` : 'une date inconnue'}` };
const autres = zones.length - posees.length;
console.log([
  `${TITRE[mode]} — à ${shLabel(s, id)}, par ${parQuoi} — ${adresse}`,
  `Zone(s) visée(s) : ${posees.map(z => `${z.id}${z.reasons.length ? ` (${z.reasons.join(', ')})` : ''}`).join(' · ')}`,
  ...(objet ? [`Objet : ${objet}`] : [`Pas d'objet : le canal « ${canal} » n'en porte pas.`]),
  ...(nomClair(s, id) === String(sh.role ?? '').trim() && !String(sh.name ?? '').trim()
    ? ['On n\'a pas son nom, seulement sa fonction : le message commence donc par « Bonjour, ». Demande-le'
       + ' à l\'utilisateur si tu l\'as — écrire à quelqu\'un dont on ignore le nom se voit, et se paie.'] : []),
  // Pourquoi une seule, ou pourquoi plusieurs : la raison se lit ici, sinon le nombre a l'air arbitraire.
  ...(posees.length > 1
    ? [`${posees.length} questions dans le même message : elles naissent toutes de ce qu'elle a déjà dit`
       + ` (\`origin\` sur une de ses sources), donc elles ne dépendent pas les unes des autres. Le canal`
       + ` « ${canal} » en porte ${forme.groupe} au plus.`]
    : mode === 'premiere'
      ? ['Une seule question : aucune source ne la porte comme locutrice, donc rien à préciser — tout est'
         + ' exploration, et une réponse commande la suivante.']
      : mode === 'reprise' ? ['Une seule question : on s\'excuse de l\'avoir mal posée, et y glisser des nouvelles brouillerait l\'excuse.']
        : mode === 'relance' ? [] : ['Une seule question : la zone de tête naît d\'une analyse, pas de ses mots — sa réponse'
          + ' commandera la suivante, donc elle part seule.']),
  ...(autres > 0 ? [`${autres} autre(s) zone(s) lui sont adressées, dont ${gardees} de la même sorte`
    + ` et ${autres - gardees} née(s) d'une analyse : elles attendent sa réponse à celle(s)-ci.`] : []),
  '',
  '── Message ──',
  message,
  '── Fin ──',
  '',
  N_ENVOIE_RIEN,
  '',
  AVERTISSEMENT_COMPTE,
  '',
  'Quand il est parti, et PAS avant, écris sur la partie prenante :',
  ...(mode === 'premiere'
    ? ['    status: sollicitée', `    sollicitee_le: "${today()}"`, `    sollicitee_zone: ${yamlZone}`,
      'Sans la date, « sollicitée » compte comme si personne n\'avait jamais écrit (S115). Avec elle, le',
      'silence de la personne devient une question qui vit, et les constats sur sa voix changent de liste.']
    : [`    sollicitee_le: "${today()}"`, `    sollicitee_zone: ${yamlZone}`,
      'Le statut ne bouge PAS : elle a parlé, elle reste « interrogée ». C\'est la date qui porte l\'attente —',
      'une question vit tant qu\'elle est postérieure à la dernière source qui vient d\'elle. La repasser',
      '« sollicitée » dirait qu\'elle n\'a jamais parlé, et éteindrait ce que sa voix avait fermé (S83, S95).']),
  ...(posees.length > 1 ? ['La liste entière, pas seulement la première : relancer doit pouvoir reposer exactement ce'
    + ' qui a été posé, et une zone sur cinq ne le permettrait pas.'] : []),
  ...POSEE,
  '',
  `À la réponse : une source \`type: échange écrit\`, \`stakeholders: [${id}]\`, SA DATE — c'est elle qui dit`,
  `que ${posees.length > 1 ? 'les questions sont retombées' : 'la question est retombée'} —, le verbatim dans \`quote\`${mode === 'premiere' ? ', puis `status: interrogée`' : ''}`,
  `et ${posees.length > 1 ? `les zones ${posees.map(z => z.id).join(', ')} levées — celles qu'elle a traitées, pas les autres` : `la zone ${posees[0].id} levée`}.`,
  `Seuils de ce canal : signaler à ${forme.relance.signaler} j, trancher à ${forme.relance.agir} j (S117).`,
  ...(mode === 'relance' ? ['', 'Si elle ne répond pas davantage, renonce et dis-le : `status: non disponible`. Un silence qu\'on',
    'laisse ouvert indéfiniment donne au dossier l\'air d\'attendre quelque chose qui ne viendra pas.'] : []),
].join('\n'));
