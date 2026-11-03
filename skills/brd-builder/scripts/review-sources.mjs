#!/usr/bin/env node
// Relevé à relire, par personne interrogée : ce que le dossier a enregistré de ses propos, mot pour mot,
// et ce qui en a été tiré. Le document part chez quelqu'un qui n'a JAMAIS vu le dossier — chaque
// identifiant y est donc glosé sur place, par `label()`, qui lit l'énoncé dans l'état.
//
// L'instrument manquait. Sur le deuxième dossier réel, la méthode avait le contrôle — `feedback` sur la
// source, `S84` sur l'exigence — et aucun moyen de le satisfaire : ni script, ni gabarit, ni doctrine.
// L'agent a inventé la forme, et elle était bonne ; son texte est repris ici presque mot pour mot. Mais
// il tapait les identifiants de mémoire, et les trois relevés envoyés à trois personnes portaient
// 30 adresses que leur propre fichier ne glosait nulle part (`S104`) — dont les deux besoins qu'on
// demandait à Samir de confirmer sans les lui dire. Un document qui part se génère : la discipline ne
// tient pas sur trois cents lignes, la génération, oui.
//
// Usage : node review-sources.mjs <état.yaml> [--sh SH-01[,SH-02]] [--etat]
//   sans --sh : une personne par voix entendue       --etat : la charge et l'état des retours
//   --message : le MÊME relevé en message à envoyer sur un canal, pour une personne nommée. Le fichier
//               et le message sortent de la même sélection : ce qu'elle doit relire ne peut pas dépendre
//               de l'instrument par lequel on le lui demande.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { arr, loadState, writeOut, fail, table, today, txt, shLabel, label } from './lib/common.mjs';
import { feedbackEtat, sollicitationEtat, seuilsRelance, refsDans, RECUEIL_DE_PAROLE } from './lib/rules.mjs';
import { nomClair, nomInitiative, joindre, paragraphes, refuseLesIdentifiants, AVERTISSEMENT_COMPTE, N_ENVOIE_RIEN } from './lib/outgoing.mjs';

const args = process.argv.slice(2);
const statePath = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--sh');
if (!statePath) fail('Usage : node review-sources.mjs <état.yaml> [--sh SH-01[,SH-02]] [--etat]', 2);
const s = loadState(statePath);
const dir = join(dirname(statePath), 'interviews');

// Les sources où la personne a parlé, dans l'ordre où elles ont été recueillies.
const sourcesDe = id => arr(s.sources).filter(x => arr(x.stakeholders).includes(id));
// Qui a parlé au moins une fois : on ne fait pas relire un relevé vide à quelqu'un qu'on n'a pas entendu.
const locuteurs = [...new Set(arr(s.sources).flatMap(x => arr(x.stakeholders)))];
const fichier = id => join(dir, `relecture-${id}.md`);
const dit = x => String(x.quote ?? x.note ?? '').trim();

// Depuis quand la demande est partie. La colonne existe parce que « envoyé » tout court ne disait pas
// s'il fallait relancer : une demande de la veille et une demande de six semaines se lisaient pareil.
const jours = d => Math.floor((Date.parse(today()) - Date.parse(d)) / 86400000);
if (args.includes('--etat')) {
  const FAIT = ['confirmé', 'corrigé'];
  const rows = locuteurs.map(id => {
    const src = sourcesDe(id);
    const attente = src.filter(x => feedbackEtat(x, s) === 'attente');
    // La plus vieille des demandes en vol : c'est elle qui dit s'il est temps de relancer.
    const age = attente.length ? Math.max(...attente.map(x => jours(x.feedback_le))) : null;
    return [shLabel(s, id), src.length, src.filter(x => dit(x)).length,
      src.filter(x => FAIT.includes(x.feedback)).length,
      attente.length ? `${attente.length} (depuis ${age} j)` : '—', existsSync(fichier(id)) ? 'écrit' : '—'];
  });
  console.log(table(['Personne', 'Sources', 'Dont relevées', 'Retours reçus', 'En attente', 'Relevé'], rows));
  // La charge n'est pas la même pour tous, et c'est au demandeur de le savoir : sur le dossier réel, le
  // président relisait 70 sources quand les deux autres en relisaient 13 et 9.
  const max = rows.length ? rows.reduce((a, b) => (b[1] > a[1] ? b : a)) : null;
  if (max && rows.length > 1) console.log(`\nCharge la plus lourde : ${max[0]}, ${max[1]} source(s) sur ${arr(s.sources).length}.`);
  // Les questions parties vers quelqu'un qui n'a pas encore répondu. Le tableau ci-dessus ne parle que
  // des LOCUTEURS : par construction, une personne sollicitée et muette n'y figure pas — c'est
  // exactement celle dont on perd la trace, et la seule que le dossier ne rappelait à personne.
  const sollicitees = arr(s.stakeholders).filter(sh => sollicitationEtat(sh, s.sources) === 'attente');
  if (sollicitees.length) {
    // Deux seuils, deux gestes. En dessous du premier, il n'y a rien à dire : la question vient de
    // partir. Entre les deux, on le SIGNALE — ça ne coûte rien et ça ne sort pas du dossier. Au-delà du
    // second, il faut TRANCHER, et c'est l'utilisateur qui tranche : relancer sort vers quelqu'un qui
    // n'a rien demandé. Le relevé qualifie donc chaque attente au lieu de se contenter de son âge.
    const { signaler, agir } = seuilsRelance(s);
    const etiquette = n => (n > agir ? 'À TRANCHER' : n >= signaler ? 'à signaler' : 'vient de partir');
    console.log(`\n${sollicitees.length} personne(s) sollicitée(s) et sans réponse (seuils : signaler à ${signaler} j, trancher à ${agir} j) :`);
    for (const sh of [...sollicitees].sort((a, b) => jours(b.sollicitee_le) - jours(a.sollicitee_le))) {
      const n = jours(sh.sollicitee_le);
      console.log(`  ${etiquette(n).padEnd(16)} ${shLabel(s, sh.id)} — ${n} j, par ${sh.joignable_par || 'canal non dit'}${sh.sollicitee_zone ? `, sur ${sh.sollicitee_zone}` : ', sans dire sur quoi'}`);
    }
    const aTrancher = sollicitees.filter(sh => jours(sh.sollicitee_le) > agir).length;
    if (aTrancher) console.log(`  ${aTrancher} au-delà du seuil (S117) : attendre encore en le disant, relancer une fois (\`reach-out.mjs --relance\`), ou renoncer — \`non disponible\` avec son motif. Aucune horloge ne tourne : ce constat date de maintenant, pas du jour du seuil.`);
  }
  // Déclarées sollicitées sans date : elles ne comptent pour rien (S115), et personne ne les relancera
  // puisque rien ne dit depuis quand elles attendent.
  const sansJour = arr(s.stakeholders).filter(sh => sh.status === 'sollicitée' && sollicitationEtat(sh, s.sources) !== 'attente');
  if (sansJour.length) console.log(`${sansJour.length} personne(s) dite(s) sollicitée(s) sans date de départ (\`sollicitee_le\`, S115) : ${sansJour.map(sh => sh.id).join(', ')} — elles comptent comme si personne ne leur avait écrit.`);
  const muettes = arr(s.sources).filter(x => arr(x.stakeholders).length && !dit(x)).length;
  if (muettes) console.log(`${muettes} source(s) de parole ne portent pas ce qui a été dit : un relevé ne peut pas les rendre (S102).`);
  // « Retours reçus » ne compte que `confirmé` et `corrigé` — et c'est juste. Mais `sans objet` éteint
  // S84 comme un retour reçu, sans qu'aucun relevé soit parti : la colonne et le contrôle ne disaient
  // donc pas la même chose, et rien ne le montrait ici. Au troisième dossier réel, quatre cadrages la
  // portaient, dont le tour de table qui contenait une phrase mal attribuée. La liste des types
  // vient de `rules.mjs` : elle y est déjà, et une seconde copie ici dériverait au premier type ajouté.
  const sansObjet = arr(s.sources).filter(x => x.feedback === 'sans objet' && RECUEIL_DE_PAROLE.includes(x.type));
  const sansRaison = sansObjet.filter(x => !String(x.feedback_motif ?? '').trim());
  if (sansObjet.length) console.log(`${sansObjet.length} source(s) de parole recueillie déclarée(s) « sans objet » : elles éteignent le contrôle de relecture sans qu'un relevé soit parti${sansRaison.length ? `, et ${sansRaison.length} sans dire pourquoi (\`feedback_motif\`, S111) : ${sansRaison.map(x => x.id).join(', ')}` : ''}.`);
  // « Envoyé » sans date ne se vérifie pas et ne se relance pas : c'est une case cochée, pas un fait.
  // Le test porte sur la DATE, pas sur l'état : depuis que l'attente se périme, `feedbackEtat` rend
  // « absent » aussi bien pour une demande sans date que pour une demande datée mais oubliée. Les
  // confondre ferait dire « sans date de départ » à une source qui en porte une, et un relevé qui se
  // trompe sur ce qu'il reproche est pire qu'un relevé muet.
  const sansDate = arr(s.sources).filter(x => x.feedback === 'envoyé' && !/^\d{4}-\d{2}-\d{2}$/.test(String(x.feedback_le ?? '').trim()));
  if (sansDate.length) console.log(`${sansDate.length} source(s) dites envoyées sans date de départ (\`feedback_le\`) : ${sansDate.slice(0, 8).map(x => x.id).join(', ')}${sansDate.length > 8 ? '…' : ''} — on ne sait pas s'il faut relancer (S84).`);
  // Et les demandes datées que personne ne suit plus : même seuil que pour une question posée à
  // quelqu'un, parce que c'est la même chose — une question partie et laissée sans décision.
  const { agir } = seuilsRelance(s);
  const oubliees = arr(s.sources).filter(x => x.feedback === 'envoyé' && /^\d{4}-\d{2}-\d{2}$/.test(String(x.feedback_le ?? '').trim()) && jours(x.feedback_le) > agir);
  if (oubliees.length) console.log(`${oubliees.length} relecture(s) parties depuis plus de ${agir} j et jamais revenues : ${oubliees.slice(0, 8).map(x => `${x.id} (${jours(x.feedback_le)} j)`).join(', ')}${oubliees.length > 8 ? '…' : ''}. Au-delà du seuil elles cessent de compter comme des questions qui vivent : relance, ou dis que la relecture n'aura pas lieu (\`sans objet\` avec son motif).`);
  process.exit(0);
}

const voulus = (args.includes('--sh') ? args[args.indexOf('--sh') + 1] : '').split(',').filter(Boolean);
const inconnus = voulus.filter(id => !locuteurs.includes(id));
if (inconnus.length) fail(`Aucune source ne porte la parole de ${inconnus.join(', ')} : voix entendues — ${locuteurs.join(', ') || 'aucune'}.`, 2);
const cibles = voulus.length ? voulus : locuteurs;
if (!cibles.length) fail('Aucune voix entendue : aucune source ne nomme de locuteur.', 2);

// Ce qui a été construit depuis les propos de la personne : tout élément dont une source est l'une des
// siennes. Chaque ligne porte son énoncé — c'est le document qui doit se lire seul, pas l'index.
const COLLECTIONS = [['candidate_needs', 'Besoins'], ['business_requirements', 'Exigences métier'],
  ['business_rules', 'Règles métier'], ['objectives', 'Objectifs'], ['transition_requirements', 'Exigences de transition']];
const refsDe = x => arr(x.sources).map(r => r?.ref ?? r);
const construitDepuis = (coll, ids) => arr(s[coll]).filter(x => x.status !== 'abandonné' && (
  refsDe(x).some(r => ids.has(r)) || arr(x.from_needs).some(n => arr(s.candidate_needs).some(b => b.id === n && refsDe(b).some(r => ids.has(r))))));

// ── Le retour de synthèse par canal ────────────────────────────────────────
// La promesse est déjà faite. Le premier message d'une sollicitation dit : « je vous enverrai ce que
// j'en ai compris avant que ça serve à quoi que ce soit, et vous pourrez le corriger. » Rien ne savait
// la tenir : le relevé se générait en FICHIER, qu'il fallait remettre en main propre.
//
// Et un message n'est pas un fichier réduit. Trois différences, et chacune a sa raison :
//   · pas d'identifiant, même glosé. Le fichier porte « énoncé (BC-003) » et S104 s'en satisfait,
//     parce que la personne y revient et peut dire « sur BC-003, vous vous trompez ». Dans un message,
//     un numéro de liste fait le même travail sans rien apprendre à personne de notre index.
//   · borné. Le relevé du président du troisième dossier réel portait 70 sources, les deux autres 13
//     et 9. Un fichier de 70 verbatims se lit ; un courriel de 70 verbatims ne se lit pas, et le
//     prétendre serait obtenir un « c'est bon » qui ne vaut rien. Au-delà du seuil, le script refuse
//     et renvoie au fichier : c'est l'instrument qui ne convient pas, pas la personne.
//   · il ne demande qu'une chose. Le fichier demande de chercher le faux, le déformé et le manquant,
//     dans cet ordre. Le message garde les trois mais sans la numérotation d'un formulaire : on ne
//     fait pas remplir un questionnaire à quelqu'un qui lit sur son téléphone.
const MESSAGE_MAX_SOURCES = 10;
if (args.includes('--message')) {
  if (cibles.length !== 1) fail('`--message` écrit à UNE personne : nomme-la avec `--sh SH-xx`. Un retour de synthèse est personnel — il ne porte que ce qu\'elle a dit —, et un envoi groupé ferait lire à chacun les propos des autres.', 2);
  const id = cibles[0];
  const { canal, adresse } = joindre(s, statePath, id);
  const initiative = nomInitiative(s);
  if (!initiative) fail('L\'initiative n\'a pas de nom (`initiative.name`) : on n\'écrit pas à quelqu\'un à propos de rien.');
  const src = sourcesDe(id);
  const avecVerbatim = src.filter(x => dit(x));
  if (!avecVerbatim.length) fail(`Aucune des ${src.length} source(s) de ${shLabel(s, id)} ne porte ce qui a été dit (\`quote\`) : il n'y a rien à lui faire relire, et S102 le dit déjà. Écris le verbatim avant de promettre une relecture.`);
  // Ce qui RESTE à faire relire : ni déjà relu, ni déjà en vol. Une relecture en attente ne se
  // redemande pas — ce serait deux demandes d'un coup, et la deuxième brouille la première.
  const FAIT_DEJA = ['confirmé', 'corrigé', 'sans objet'];
  const enVol = avecVerbatim.filter(x => feedbackEtat(x, s) === 'attente');
  const reste = avecVerbatim.filter(x => !FAIT_DEJA.includes(x.feedback) && feedbackEtat(x, s) !== 'attente')
    .sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')));
  if (!reste.length) {
    fail(enVol.length
      ? `Les ${enVol.length} source(s) qui restaient à faire relire par ${shLabel(s, id)} sont déjà parties et attendent sa réponse. Relancer avant qu'elle réponde, c'est deux demandes d'un coup.`
      : `Tout ce que ${shLabel(s, id)} a dit a déjà été relu : rien à lui renvoyer.`);
  }
  // Le seuil était un refus, et il refusait TOUT : sur le troisième dossier réel, les trois personnes
  // entendues portaient 11, 47 et 15 sources — personne en dessous de dix. Un garde-fou qui écarte
  // cent pour cent des cas réels n'est pas un garde-fou, c'est une fonctionnalité morte, et le nombre
  // n'était pas trop bas : c'est le REFUS qui était la mauvaise réponse. Le relevé part donc par lots,
  // du plus ancien au plus récent, et le message dit où on en est. Une personne qui relit onze
  // verbatims d'un coup ne relit rien ; la même, en deux fois, relit vraiment.
  const aRelire = reste.slice(0, MESSAGE_MAX_SOURCES);
  const apres = reste.length - aRelire.length;

  // Les paragraphes du corps. Chaque verbatim porte un NUMÉRO, pas un identifiant : c'est ce qui lui
  // permet de dire « le 2 est faux » sans qu'on lui apprenne comment le dossier s'appelle à l'intérieur.
  const blocs = [`Bonjour ${nomClair(s, id) === String(arr(s.stakeholders).find(x => x.id === id)?.role ?? '').trim() ? '' : nomClair(s, id)},`.replace(' ,', ','),
    `Je vous avais dit que je vous enverrais ce que j'avais compris de vos propos avant que ça serve. Le voici, pour « ${initiative} ».`,
    'Ce que vous lisez ci-dessous a été écrit par moi, pas par vous : je vous rends vos mots tels que je les ai notés, et ce que j\'en ai tiré. Rien n\'est reformulé pour faire plus présentable.',
    'Dites-moi ce qui est faux, ce qui est déformé — le propos est à vous, la conclusion ne l\'est pas — et ce qui manque. Une correction n\'a pas à être justifiée, et elle peut rouvrir des décisions déjà prises : c\'est le but.'];
  aRelire.forEach((x, i) => {
    blocs.push(`${i + 1}. Vous avez dit${x.date ? `, le ${x.date}` : ''} :`, `« ${dit(x).replace(/\s+/g, ' ').trim()} »`);
    const tire = String(x.understood ?? '').trim();
    if (tire) blocs.push(`Ce que j'en ai tiré : ${tire.replace(/\s+/g, ' ').trim()}`);
  });
  const muettes = src.length - avecVerbatim.length;
  if (muettes) blocs.push(`Il y a ${muettes} autre(s) échange(s) dont je n'ai gardé aucune note : je ne peux pas vous les faire relire, et c'est un manque de mon côté.`);
  if (apres) blocs.push(`Il en reste ${apres} après celui-ci. Je vous les enverrai quand vous aurez répondu à ceux-là : tout d'un coup, ça ne se relit pas.`);
  blocs.push('Répondez comme vous voulez, même en une ligne. Si tout est juste, dites-le aussi : c\'est ce qui me permet de m\'en servir.');
  // Le contrôle porte SOURCE PAR SOURCE, pour que le refus soit réparable : « réécris en clair » sur un
  // message de dix verbatims ne dit pas où chercher. Mesuré sur le troisième dossier réel : 51 des
  // 75 sources portent un identifiant dans `understood`, et quatre dans `quote`. Ce n'est pas un
  // accident d'écriture, c'est que le champ a deux lecteurs — l'agent, qui y met des renvois, et la
  // personne, à qui il est RENDU en relecture. Le gabarit est pourtant clair : `understood` est « ce
  // qui se corrige en relecture quand la citation est juste et la conclusion fausse ». Il s'écrit donc
  // pour elle, et un renvoi interne y est un mot qu'elle ne peut pas lire.
  const sales = aRelire.map(x => ({ id: x.id, refs: refsDans(`${dit(x)}\n${x.understood ?? ''}`) })).filter(x => x.refs.length);
  if (sales.length) {
    fail(`${sales.length} source(s) de ce lot portent un identifiant interne dans ce qu'elles disent ou dans ce qu'on en a tiré :\n${sales.map(x => `  · ${x.id} → ${x.refs.join(', ')}`).join('\n')}\nLa personne au bout n'a pas l'index sous les yeux, et ne l'aura jamais — c'est la doctrine de S104, un cran plus loin. \`understood\` est ce qu'on lui REND en relecture : il s'écrit pour elle, pas comme une note à soi-même. Réécris ces ${sales.length} champ(s) en clair avant d'envoyer.`);
  }
  const message = paragraphes(blocs);
  refuseLesIdentifiants(message, 'Le retour de synthèse');

  const objet = `Ce que j'ai compris de vos propos — ${initiative}`;
  if (args.includes('--json')) {
    console.log(JSON.stringify({ stakeholder: id, canal, adresse, objet, message, sources: aRelire.map(x => x.id) }, null, 2));
    process.exit(0);
  }
  console.log([
    `Retour de synthèse — à ${shLabel(s, id)}, par ${canal} — ${adresse}`,
    `Objet : ${objet}`,
    `${aRelire.length} source(s) dans ce lot${apres ? ` · ${apres} après` : ''}${enVol.length ? ` · ${enVol.length} déjà en vol, écartée(s)` : ''}${muettes ? ` · ${muettes} sans note, que le message signale` : ''}`,
    '', '── Message ──', message, '── Fin ──', '',
    N_ENVOIE_RIEN, '', AVERTISSEMENT_COMPTE, '',
    'Quand il est parti, et PAS avant, sur CHACUNE de ces sources :',
    `    feedback: envoyé`, `    feedback_le: "${today()}"`, `    feedback_par: ${canal}`,
    `  (${aRelire.map(x => x.id).join(', ')})`,
    'Sans la date, « envoyé » compte comme si rien n\'avait été demandé (S84). Avec elle, la relecture',
    'devient une question qui vit, et la porte ne la compte pas contre le dossier.',
    '',
    'À sa réponse : `confirmé` si tout est juste, `corrigé` si elle corrige — et alors la correction se',
    'porte dans l\'état, pas seulement dans le fil. Une source qu\'elle a corrigée est la première à',
    'faire relire ensuite, et `corrects` dit laquelle corrige laquelle (S112).',
  ].join('\n'));
  process.exit(0);
}

for (const id of cibles) {
  const p = fichier(id);
  if (existsSync(p)) { console.log(`${p} existe déjà : non remplacé (les corrections de la personne y sont peut-être).`); continue; }
  const src = sourcesDe(id);
  const ids = new Set(src.map(x => x.id));
  const md = [`# Relevé à relire — ${shLabel(s, id)}`, '',
    `Initiative : ${txt(s.initiative?.name)} · établi le ${today()} · ${src.length} source(s)`, '',
    '## Pourquoi ce document', '',
    'Tout ce que le dossier retient de vos propos a été écrit par l\'agent qui vous a interrogé. Ce relevé',
    'vous rend ce qui a été enregistré, mot pour mot : ce que vous avez dit, et ce qui en a été tiré. Rien',
    'n\'y est reformulé pour le rendre plus présentable.', '',
    'Ce qu\'on vous demande de chercher, dans cet ordre :', '',
    '1. **Ce qui est faux** : une phrase qu\'on vous attribue et que vous n\'avez pas dite, ou qui dit le',
    '   contraire de ce que vous pensiez.',
    '2. **Ce qui est déformé** : le propos est à vous, la conclusion qu\'on en tire ne l\'est pas.',
    '3. **Ce qui manque** : quelque chose d\'important que vous avez dit et qui n\'apparaît pas.', '',
    'Une correction n\'a pas à être justifiée. Elle peut rouvrir des décisions déjà prises : c\'est le but',
    'de la relecture, pas un effet indésirable.', '',
    'Les corrections reviennent par l\'agent, qui les porte dans l\'état du dossier. Ce document est une',
    'copie de lecture : écrire dessus ne change rien au dossier.', '',
    '## Ce qui a été enregistré, dans l\'ordre', ''];

  for (const x of src) {
    md.push(`### ${txt(x.type).replace(/^./, c => c.toUpperCase())}${x.date ? ` du ${x.date}` : ''} (${x.id})`, '');
    // Une source sans contenu ne se relit pas, et le relevé le dit au lieu de faire semblant : c'est le
    // seul endroit où la personne peut s'apercevoir qu'on a perdu ce qu'elle a dit.
    if (!dit(x)) { md.push('*Rien n\'a été écrit pour cette source : ce qui a été dit n\'est consigné nulle part, et vous ne pouvez donc pas le relire.*', ''); continue; }
    md.push(...dit(x).split('\n').map(l => `> ${l}`), '');
    if (String(x.understood ?? '').trim()) md.push(`Ce qui en a été tiré : ${String(x.understood).replace(/\s+/g, ' ').trim()}`, '');
  }
  if (!src.length) md.push('_Aucune source._', '');

  md.push('## Ce qui a été construit à partir de ces propos', '',
    'Si une ligne ci-dessous vous paraît fausse, c\'est peut-être le relevé au-dessus qui l\'est.', '');
  let rien = true;
  for (const [coll, titre] of COLLECTIONS) {
    const items = construitDepuis(coll, ids);
    if (!items.length) continue;
    rien = false;
    md.push(`### ${titre}`, '', ...items.map(x => `- ${label(s, x.id)}${x.status ? ` — ${x.status}` : ''}`), '');
  }
  if (rien) md.push('_Rien n\'a encore été construit depuis ces propos._', '');

  // Ce qu'on lui a déjà lu et qu'elle a confirmé. Sans cette section, le relevé contredit son propre
  // corps : sur le dossier réel, il disait que Samir avait répondu sur cinq besoins et son
  // récapitulatif en montrait trois — les deux manquants ne reposaient pas sur ses sources, il les
  // avait seulement confirmés. Les voir ici lui permet de retirer une confirmation, ce qui est le but.
  const dejaConfirmes = [...new Set(src.flatMap(x => arr(x.confirms)))];
  if (dejaConfirmes.length) {
    md.push('## Ce que vous avez déjà confirmé de vive voix', '',
      'Vous avez dit que ces formulations étaient justes. Une confirmation se retire : si l\'une vous',
      'paraît fausse en la relisant, dites-le, elle repasse en question.', '',
      ...dejaConfirmes.map(id => `- ${label(s, id)}`), '');
  }

  writeOut(p, md.join('\n'));
  const muettes = src.filter(x => !dit(x)).length;
  console.log(`Relevé généré : ${p} (${src.length} source(s)${muettes ? `, dont ${muettes} sans contenu à relire` : ''}).`);
}
// Publier n'est pas transmettre : c'est l'utilisateur qui sait quand la personne a le document, et
// l'agent ne décide pas d'un envoi à sa place.
console.log('Les sources passent à `feedback: envoyé` quand la personne a reçu le relevé — pas à sa génération.');
console.log('Avec `feedback_le` (la date de départ) et `feedback_par` (par quoi il est parti) : sans la date, « envoyé » ne se vérifie pas.');
