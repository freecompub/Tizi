// La discipline d'un message qui part vers une personne. Elle vit ici parce que deux scripts l'exercent
// — `reach-out.mjs` pour une question, `review-sources.mjs --message` pour un retour de synthèse — et
// qu'elle a coûté cinq défauts trouvés en composant un vrai brouillon dans une vraie boîte. Recopiée,
// elle dériverait au premier message ajouté, et le troisième script réapprendrait les cinq.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { arr, loadState, fail, shLabel } from './common.mjs';
import { refsDans, formeDuCanal } from './rules.mjs';

// Le nom d'une personne tel qu'on l'écrit DANS un message : son nom, sinon sa fonction, jamais son
// identifiant. `shLabel` rend « Karim (SH-02) » — c'est l'outil des rapports internes, et il était
// parti tel quel dans un message. La doctrine de S104 dit qu'un document qui part ne parle pas par
// adresses ; une partie prenante est plus loin de l'index que l'utilisateur, qui peut au moins le
// demander. Elle, jamais.
export const nomClair = (s, id) => {
  const x = arr(s.stakeholders).find(y => y.id === id);
  return String(x?.name || x?.role || '').trim();
};

// Le nom de l'initiative. `initiative` est un OBJET dans les deux gabarits — `{ name, slug, trigger }` —
// et interpolé tel quel il donnait « le travail de cadrage de « [object Object] » ». Un fixture écrit à
// la main avec une chaîne le cachait ; le troisième dossier réel l'a montré du premier coup.
// La langue dans laquelle une personne se lit et s'écrit. Tizi est en français par choix — ses skills,
// ses règles, ses documents, que l'équipe lit. Mais la personne au bout d'un canal n'est pas de
// l'équipe, et rien ne dit qu'elle lit le français : sur le terrain de cet utilisateur, les dossiers
// sont français et arabes. Le défaut est donc `settings.langue` et non « français » en dur, pour que
// le couplage soit DÉCLARÉ et surchargeable au lieu d'être invisible dans le code.
// La racine l'emporte sur `settings`, comme `seuilsDe` et `seuilsRelance` : les deux emplacements se
// lisent, et c'est le même ordre partout — sinon un dossier qui déclare les deux se comporte autrement
// selon le réglage, et personne ne saurait lequel gagne.
export const langueDuDossier = s => String(s?.langue ?? s?.settings?.langue ?? 'français').trim().toLowerCase();
export const langueDe = (s, id) => {
  const sh = arr(s?.stakeholders).find(x => x.id === id);
  return String(sh?.langue ?? '').trim().toLowerCase() || langueDuDossier(s);
};

export const nomInitiative = s => String(s.initiative?.name ?? (typeof s.initiative === 'string' ? s.initiative : '') ?? '').trim();

// À LA DEMANDE DE QUI. C'est l'élément le plus important d'une première prise de contact, et c'était le
// plus facile à perdre : il se lisait à `request.requested_by` — un chemin qui n'existe dans aucun des
// deux gabarits —, avec un rattrapage par expression régulière sur les rôles, `/sponsor/i`. Sur le
// dossier réel, le chemin était vide et aucun des quatre rôles ne contenait le mot : la clause
// « à la demande de … » DISPARAISSAIT, sans trace, et le message partait sans dire au nom de qui on
// écrit. Un champ absent du gabarit ne se remplit jamais, et un rattrapage par mot-clé sur un rôle
// écrit en français libre est un tirage au sort.
//
// Il est devenu OBLIGATOIRE le jour où le consentement est passé du côté de l'utilisateur : si la
// personne est censée attendre notre message, c'est que quelqu'un lui en a parlé, et ce quelqu'un est
// la seule chose qui rattache ce qu'elle reçoit à ce qu'on lui a annoncé. Sans lui, un agent inconnu
// écrit à quelqu'un qui n'a rien demandé — exactement ce que le reste du dispositif prétend éviter.
// Et le deviner serait pire que l'omettre : nommer la mauvaise personne comme commanditaire, c'est
// faire dire à quelqu'un qu'il a demandé une démarche dont il n'a pas entendu parler.
export function demandeur(s) {
  const ref = String(s?.initiative?.requested_by ?? '').trim();
  if (!ref) {
    fail('`initiative.requested_by` n\'est pas renseigné : on ne sait pas au nom de qui on écrit. C\'est la '
      + 'ligne qui rattache le message à ce que la personne attend — « je vous écris suite à votre entretien avec… » —, '
      + 'et c\'est ce qui rend le contact légitime maintenant que le consentement est du côté de l\'utilisateur. '
      + 'Demande-lui qui a demandé cette initiative, et écris son identifiant (`SH-xx`) dans `initiative.requested_by`. '
      + 'Ne le devine pas : nommer la mauvaise personne lui fait dire qu\'elle a demandé une démarche dont elle n\'a pas entendu parler.');
  }
  const nom = nomClair(s, ref);
  if (!nom) {
    fail(`\`initiative.requested_by: ${ref}\` ne désigne personne qui ait un nom ou une fonction dans l'état : `
      + 'soit l\'identifiant est faux, soit la partie prenante n\'a ni `name` ni `role`. On n\'écrit pas '
      + '« à la demande de  » à quelqu\'un.');
  }
  return nom;
}

// Le canal gouverne la FORME du message, jamais le nombre de questions qu'il porte. La table vit dans
// `rules.mjs`, à côté de l'énumération qu'elle doit suivre ; elle est reprise ici parce que c'est ici
// qu'on compose. Un canal qui ne porte pas d'écrit — téléphone, vive voix — n'est pas un canal de
// message : c'est une conversation, et une conversation se mène avec un guide d'entretien.
export function formeEcrite(canal, ou) {
  const forme = formeDuCanal(canal);
  if (!forme.ecrit) {
    fail(`${ou} par « ${canal} », qui n'est pas un canal d'écriture : on ne compose pas un message pour une `
      + 'conversation. Un échange de vive voix ou au téléphone se mène avec un guide d\'entretien — huit à douze '
      + 'questions dans les mains d\'un humain qui conduit l\'échange et relance (`references/questions.md`) —, '
      + 'et ce n\'est pas le même objet qu\'un message. Si c\'est bien par écrit qu\'on veut lui écrire, corrige '
      + '`joignable_par`.');
  }
  return forme;
}

// Par quoi et avec quoi joindre la personne. La coordonnée vit dans `contacts.yaml`, à côté de l'état
// et hors du dépôt (S114) : absente, il n'y a rien à composer, et un message sans destinataire ne
// s'écrit pas « en attendant ».
export function joindre(s, statePath, id) {
  const contactsPath = join(dirname(statePath), 'contacts.yaml');
  const contacts = existsSync(contactsPath) ? loadState(contactsPath) : {};
  const canal = String(arr(s.stakeholders).find(x => x.id === id)?.joignable_par ?? '').trim();
  const adresse = String(contacts[id] ?? '').trim();
  if (!canal) fail(`${shLabel(s, id)} n'a pas de \`joignable_par\` : on ne sait pas par quoi lui écrire. Demande-le à l'utilisateur.`);
  if (!adresse) fail(`Aucune coordonnée pour ${id} dans ${contactsPath}. Le canal est annoncé (« ${canal} »), la coordonnée n'y est pas (S114) — demande-la à l'utilisateur, et ne la recopie pas dans l'état.`);
  return { canal, adresse, contactsPath };
}

// Les paragraphes se séparent par des LIGNES VIDES, jamais par un simple retour. Un courriel part en
// `text/plain; format=flowed`, où les retours simples sont des coupures DOUCES que certains clients
// recollent : vu sur un brouillon réel, trois phrases séparées d'un seul retour pouvaient fondre en un
// bloc où celle qui compte le plus se noie.
export const paragraphes = blocs => blocs.filter(b => b !== null && b !== undefined).join('\n\n');

// Rien de ce qui part ne porte un identifiant interne. Le contrôle est ici, et pas dans le catalogue,
// parce que S104 vérifie des FICHIERS : un message n'en est pas un, et aucune règle de l'état ne peut
// le voir. Même doctrine, autre point d'arrêt.
export function refuseLesIdentifiants(texte, ou) {
  const refs = refsDans(texte);
  if (refs.length) fail(`${ou} porte ${refs.length > 1 ? 'des identifiants internes' : 'un identifiant interne'} (${refs.join(', ')}) : la personne au bout n'a pas l'index sous les yeux, et ne l'aura jamais — c'est la doctrine de S104, un cran plus loin. Réécris en clair avant d'envoyer.`);
}

// Une question ÉCRITE SUR quelqu'un, envoyée À cette personne. Trouvé sur le dossier réel, dans la
// question de tête du premier message groupé : « Le formulaire porte-t-il une case pour le niveau
// scolaire ? Dédé l'affirme, le relevé fait du document ne la mentionne pas. » C'est juste, c'est utile,
// et c'est écrit pour le dossier — à Dédé, ça dit « Dédé prétend », à la troisième personne, en face.
// Les zones d'ombre sont rédigées pour l'index, pas pour la boîte de réception de qui elles nomment, et
// rien ne faisait la différence : `refuseLesIdentifiants` attrape `SH-03`, pas « Dédé ».
// Le signal est son NOM dans le texte, et il est fiable : une question à quelqu'un dit « vous ». Si elle
// a besoin de le citer, c'est « vous avez dit ». Son nom en clair veut dire que la phrase parle de lui à
// quelqu'un d'autre. Sous trois lettres, on ne cherche pas : un nom court attrape des mots ordinaires.
export function refuseLaTroisiemePersonne(s, id, texte, ou) {
  const nom = String(arr(s?.stakeholders).find(x => x.id === id)?.name ?? '').trim();
  if (nom.length < 3) return;
  const motif = new RegExp(`(^|[^\\p{L}])${nom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}]|$)`, 'iu');
  if (!motif.test(String(texte ?? ''))) return;
  fail(`${ou} nomme « ${nom} » — c'est-à-dire la personne à qui le message part — à la troisième personne : `
    + 'elle a été écrite pour le dossier, pas pour elle. Lue dans sa boîte, elle dit « untel prétend » en '
    + 'face de lui. Réécris-la à la deuxième personne (« vous avez dit… ») avant d\'envoyer : ce n\'est pas '
    + 'la zone d\'ombre qu\'on change, c\'est la formulation du message.');
}

// Ce qu'aucun script ne peut vérifier, et qui annule tout le reste quand on l'oublie. Le corps d'un
// message dit « je suis un agent logiciel » ; si l'enveloppe porte le nom d'une personne, le
// destinataire croit l'enveloppe, et la déclaration devient un démenti que personne ne lit. Mesuré sur
// un brouillon réel : le compte était nominatif, et rien dans le code ne pouvait le savoir.
export const AVERTISSEMENT_COMPTE = [
  'AVANT D\'ENVOYER, REGARDE DE QUEL COMPTE ÇA PART. Si l\'enveloppe porte le nom d\'une personne —',
  '« De : Prénom Nom » —, le destinataire croira l\'enveloppe avant le corps. Deux issues, et le choix',
  'n\'est pas à toi : un compte qui ne prête pas à confusion, ou une première ligne qui dit de quelle',
  'boîte ça part et pourquoi. Demande à l\'utilisateur — c\'est son compte, et c\'est son nom.',
].join('\n');

// Le script n'envoie jamais. Il ne sait pas à quoi l'agent est branché, un message parti est
// irréversible, et ce qui part doit être un texte qu'un humain a pu lire avant.
export const N_ENVOIE_RIEN = [
  'Envoie-le toi-même par le canal de l\'hôte, s\'il en offre un ; sinon remets-le à l\'utilisateur. Ce',
  'script n\'envoie rien : il ne sait pas à quoi tu es branché, et un message parti est irréversible.',
].join('\n');
