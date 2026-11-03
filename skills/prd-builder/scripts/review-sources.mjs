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
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { arr, loadState, writeOut, fail, table, today, txt, shLabel, label } from './lib/common.mjs';
import { feedbackEtat, sollicitationEtat, RECUEIL_DE_PAROLE } from './lib/rules.mjs';

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
    const attente = src.filter(x => feedbackEtat(x) === 'attente');
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
    const vieille = sollicitees.reduce((a, b) => (jours(a.sollicitee_le) > jours(b.sollicitee_le) ? a : b));
    console.log(`\n${sollicitees.length} personne(s) sollicitée(s) et sans réponse : ${sollicitees.map(sh => `${shLabel(s, sh.id)} par ${sh.joignable_par || 'canal non dit'}, depuis ${jours(sh.sollicitee_le)} j`).join(' · ')}. La plus ancienne attend depuis ${jours(vieille.sollicitee_le)} jour(s) — relance sur le même fil, ou renonce et dis-le.`);
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
  const sansDate = arr(s.sources).filter(x => x.feedback === 'envoyé' && feedbackEtat(x) !== 'attente');
  if (sansDate.length) console.log(`${sansDate.length} source(s) dites envoyées sans date de départ (\`feedback_le\`) : ${sansDate.slice(0, 8).map(x => x.id).join(', ')}${sansDate.length > 8 ? '…' : ''} — on ne sait pas s'il faut relancer (S84).`);
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
