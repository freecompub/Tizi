// La discipline d'un message qui part vers une personne. Elle vit ici parce que deux scripts l'exercent
// — `reach-out.mjs` pour une question, `review-sources.mjs --message` pour un retour de synthèse — et
// qu'elle a coûté cinq défauts trouvés en composant un vrai brouillon dans une vraie boîte. Recopiée,
// elle dériverait au premier message ajouté, et le troisième script réapprendrait les cinq.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { arr, loadState, fail, shLabel } from './common.mjs';
import { refsDans } from './rules.mjs';

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
