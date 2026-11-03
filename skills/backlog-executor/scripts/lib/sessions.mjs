// Continuité entre sessions : lecture des transcriptions Claude Code, extraits déterministes, index des sessions.
// Commun à tous les skills du SDLC. Les transcriptions sont des fichiers JSONL (une ligne par événement).
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import yaml from './vendor/js-yaml.mjs';
import { isShellTool, isWriteTool, shellWrittenPaths, writtenPaths } from './agent-io.mjs';

export const SESSIONS_DIR = '.tizi/sessions';

// La racine du projet : le dépôt Git, à défaut le plus proche ancêtre qui porte `.tizi/`.
//
// Les quatre scripts de session la déduisaient chacun à leur façon — le `cwd` du hook pour
// `session-capture.mjs` et `session-start.mjs`, `'.'` pour `session-search.mjs`, le chemin de l'état
// pour `status.mjs`, le seul correct. Un `cd` dans un sous-répertoire pendant la session déplaçait donc
// le magasin : sur le deuxième dossier réel, la même session existait en DEUX exemplaires, à la racine
// et dans `brd/demat-inscriptions/`, et chaque capture n'en mettait à jour qu'un. Les deux copies
// alternaient — 15:14 / 107 messages d'un côté, 15:35 / 108 de l'autre —, donc aucune n'était fiable,
// et `loadIndex(cwd)` ne trouvait pas l'entrée de l'autre répertoire : ce n'était pas une course entre
// deux écritures, c'étaient deux magasins indépendants.
//
// Le dépôt Git passe avant `.tizi/` exprès : sur un dépôt déjà abîmé, un `.tizi/` parasite existe dans
// le dossier d'initiative, et chercher le plus proche y retournerait. Remonter jusqu'au dépôt répare
// le cas d'avant au lieu de le perpétuer.
export function projectRoot(from = '.') {
  const depart = resolve(from);
  let tizi = '';
  for (let d = depart; ; d = dirname(d)) {
    if (existsSync(join(d, '.git'))) return d;
    if (!tizi && existsSync(join(d, '.tizi'))) tizi = d;
    if (dirname(d) === d) return tizi || depart;
  }
}
// Index historique, en un seul fichier : encore lu, plus jamais écrit. Il était réécrit à chaque tour
// par chaque développeur, et versionné : deux personnes travaillant le même jour obtenaient un conflit
// Git sur un fichier que personne ne modifie à la main. L'index est désormais éclaté en un fichier par
// session (<date>-<id>.index.yaml) : chacun n'écrit que le sien, et il n'y a plus rien à fusionner.
export const INDEX = `${SESSIONS_DIR}/index.yaml`;
export const sessionIndexPath = (date, session) => `${SESSIONS_DIR}/${date}-${session}.index.yaml`;

// Dossiers d'initiative reconnus : <document>/<slug>/
const INITIATIVE_RE = /\b(brd|prd|sad|plan|impl|qa)\/([a-z0-9][a-z0-9-]*)\//g;
const QUESTION_RE = /[^.!?\n]*\?(?=\s|$)/g;
// Enveloppes que l'hôte fait passer par le canal « utilisateur » : sortie de commande, rappel système,
// notification de tâche. Ce ne sont pas des paroles. Sur le premier dossier réel, trois notifications
// de sous-agent étaient comptées parmi les messages de l'utilisateur — 13 au lieu de 10 — et recopiées
// mot pour mot sous « Messages de l'utilisateur », chemins de travail et compteurs de jetons compris.
const ENVELOPPES = ['<command-', '<local-command', '<task-notification', '<system-reminder'];

// ── Les questions posées par l'outil de l'hôte ───────────────────────────────
// Une question posée avec l'outil de questions (AskUserQuestion dans Claude Code, askQuestions dans
// VS Code) n'est PAS dans le texte de l'assistant : elle est dans l'appel d'outil, et la réponse revient
// dans son résultat. L'extrait ne balayait que le texte : il gardait les réponses et perdait les
// questions. Depuis que la règle des questions impose cet outil pour les choix fermés, la perte était
// systématique — et un extrait qui montre des réponses sans leurs questions est pire qu'un extrait vide.
const isQuestionTool = name => /^(askuserquestion|ask_user_question|askquestions|vscode\/askquestions)$/i.test(String(name ?? ''));

// Formes acceptées : { questions: [{ question, options: [{ label }] }] } et une question seule. Ce qui
// n'est pas reconnu est ignoré plutôt que deviné : l'extrait ne doit rien inventer.
export function questionsOf(input) {
  const list = Array.isArray(input?.questions) ? input.questions : (input?.question || input?.prompt ? [input] : []);
  return list.map(q => ({
    question: String(q?.question ?? q?.prompt ?? q?.text ?? '').trim(),
    options: (Array.isArray(q?.options) ? q.options : []).map(o => String(o?.label ?? o ?? '').trim()).filter(Boolean),
  })).filter(q => q.question);
}

// Masquage des secrets probables avant toute copie (les transcriptions peuvent contenir des jetons collés par erreur).
const SECRET_RE = /(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[abpr]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----)/g;
// Les coordonnées, pour une raison différente et un chemin que tout le reste du dispositif avait fermé.
// L'état ne porte que le CANAL (`joignable_par`), la coordonnée vit dans `contacts.yaml` que `.gitignore`
// exclut, `freeze-version.mjs` ne la copie pas et le handoff ne retient que cinq champs — et pourtant :
// `reach-out.mjs` dit « demande-la à l'utilisateur », l'utilisateur la tape dans la conversation,
// l'extrait reprend ses messages MOT POUR MOT, et l'extrait se commite. Le chemin le plus probable de
// tous était le seul ouvert. Ce n'est pas un secret au sens du motif ci-dessus — rien n'est compromis —
// mais c'est une donnée personnelle qui ne doit pas quitter la machine où elle a été donnée, et la
// marque le dit en propres termes pour que celui qui relit sache qu'il manque quelque chose et où le
// chercher. Vérifié sur tout le dépôt avant d'être posé : les seules correspondances sont les exemples
// du gabarit `contacts.yaml` et ceux des tests. Le `.jsonl` passe par la même fonction, donc il est
// couvert aussi — il est ignoré par git, mais il reste sur le disque et se lit.
const COORDONNEE_RE = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|\+\d{1,3}(?:[ .\-]?\d){9,10}|\b0\d(?:[ .\-]?\d{2}){4}\b)/g;
export const maskSecrets = text => String(text)
  .replace(SECRET_RE, '[secret masqué]')
  .replace(COORDONNEE_RE, '[coordonnée masquée — voir contacts.yaml]');

const textOf = content => {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.filter(c => c?.type === 'text').map(c => c.text).join('\n');
};

// Lit une transcription et retourne les tours utiles : messages de l'utilisateur, réponses de l'assistant, outils utilisés.
// Deux formats reconnus, ligne par ligne :
//   Claude Code : { type: "user" | "assistant", message: { content } } ;
//   GitHub Copilot (CLI, et sessions Copilot de VS Code) : { type: "user.message" | "assistant.message" | "tool.execution_start", data: {...} }.
// Les messages de sous-agents (isSidechain, agentId, parentToolCallId) et les résultats d'outils sont ignorés.
export function readTranscript(path) {
  const turns = [];
  // Appels de l'outil de questions, pour rattacher chaque réponse à sa question.
  const askIds = new Set();
  const lastAssistant = () => { for (let k = turns.length - 1; k >= 0; k--) if (turns[k].role === 'assistant') return turns[k]; return null; };
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let e; try { e = JSON.parse(line); } catch { continue; }
    if (e.isSidechain || e.isMeta || e.agentId || e.data?.agentId || e.data?.parentToolCallId) continue;
    const at = e.timestamp ?? '';
    // ── Copilot ──
    if (e.type === 'user.message') {
      const text = String(e.data?.content ?? '').trim();
      if (text) turns.push({ role: 'user', at, text });
      continue;
    }
    if (e.type === 'assistant.message') {
      const text = String(e.data?.content ?? '').trim();
      const tools = (e.data?.toolRequests ?? []).map(t => ({ name: t.name ?? t.toolName, input: parseArgs(t.arguments ?? t.args) }));
      if (text || tools.length) turns.push({ role: 'assistant', at, text, tools });
      continue;
    }
    if (e.type === 'tool.execution_start') {
      // Copilot ne relie pas un résultat à son appel : on garde la question, sans sa réponse.
      const tool = { name: e.data?.toolName ?? e.data?.name ?? '', input: parseArgs(e.data?.arguments ?? e.data?.args) };
      const a = lastAssistant();
      if (a) a.tools = [...(a.tools ?? []), tool]; else turns.push({ role: 'assistant', at, text: '', tools: [tool] });
      continue;
    }
    // ── Claude Code ──
    const msg = e.message ?? {};
    if (e.type === 'user') {
      const content = msg.content;
      if (Array.isArray(content) && content.every(c => c?.type === 'tool_result')) {
        // Résultat d'outil, donc pas une parole — sauf celui d'une question : c'est la réponse de
        // l'utilisateur, et elle n'apparaît nulle part ailleurs. On la rattache à son appel.
        for (const r of content) {
          if (!askIds.has(r?.tool_use_id)) continue;
          const rep = (typeof r.content === 'string' ? r.content : textOf(r.content)).trim();
          if (rep) turns.push({ role: 'answer', at, ref: r.tool_use_id, text: rep });
        }
        continue;
      }
      const text = textOf(content).trim();
      if (text && !ENVELOPPES.some(e => text.startsWith(e))) turns.push({ role: 'user', at, text });
    } else if (e.type === 'assistant') {
      const content = Array.isArray(msg.content) ? msg.content : [];
      const text = textOf(content).trim();
      const tools = content.filter(c => c?.type === 'tool_use').map(c => ({ name: c.name, id: c.id, input: c.input ?? {} }));
      for (const t of tools) if (isQuestionTool(t.name)) askIds.add(t.id);
      if (text || tools.length) turns.push({ role: 'assistant', at, text, tools });
    }
  }
  return turns;
}
const parseArgs = v => { if (typeof v !== 'string') return v ?? {}; try { return JSON.parse(v); } catch { return { raw: v }; } };

// Le motif `<document>/<slug>/` se trouve aussi dans un nom de branche Git et dans un slug simplement
// évoqué. Sur le deuxième dossier réel, l'index annonçait quatre initiatives touchées et le dépôt en
// contenait UNE : `brd/demat-inscriptions-relecture` était le nom de la branche d'un `git push`, et deux
// autres étaient les dossiers d'essais précédents, mentionnés en conversation. Conséquence au
// redémarrage : `session-start.mjs` réclamait un condensé pour trois dossiers qui n'existent pas ici.
// Une initiative touchée est une initiative qui a un état sur le disque.
export function initiativesIn(turns) {
  const found = new Set();
  for (const t of turns) {
    const hay = [t.text, ...(t.tools ?? []).map(x => JSON.stringify(x.input))].join(' ');
    for (const m of hay.matchAll(INITIATIVE_RE)) found.add(`${m[1]}/${m[2]}`);
  }
  return [...found].sort();
}
// Celles qui ont vraiment un état sur le disque. Les deux listes répondent à deux questions
// différentes, et les confondre casse l'une ou l'autre : « cette session a-t-elle affaire au SDLC ? »
// se lit sur les mentions — sinon un dépôt quelconque n'aurait jamais de capture —, « quelles
// initiatives a-t-elle touchées ? » se lit sur le disque.
export const surLeDisque = (initiatives, root) =>
  (Array.isArray(initiatives) ? initiatives : []).filter(ini => existsSync(join(root, ini, 'state.yaml')));

// Réponses de l'outil de questions. Claude Code renvoie une phrase de service en anglais qui renomme
// chaque question avec sa réponse : `Your questions have been answered: "…"="…", "…"="…". You can now…`.
// La recopier telle quelle donnait une « réponse » qui était une phrase anglaise contenant la question
// déjà écrite au-dessus — et comme un appel porte jusqu'à quatre questions pour un seul résultat,
// c'était le seul endroit où la réponse de chacune aurait pu être lue. On lit les paires.
export function answersOf(raw) {
  return new Map([...String(raw ?? '').matchAll(/"([^"]*)"\s*=\s*"([^"]*)"/g)].map(([, q, a]) => [q.trim(), a.trim()]));
}

// Les personnes que les dossiers touchés par la session nomment. Elles servent à mesurer une chose que
// l'extrait seul ne pouvait pas voir : une question adressée à personne. Au deuxième dossier réel, 51
// des 52 questions en texte libre ne nommaient aucun des trois présents, et l'attribution a dû être
// reconstituée après coup, en quatre tours de l'utilisateur.
export function namesIn(initiatives, root = '.') {
  const noms = new Set();
  for (const init of initiatives ?? []) {
    try {
      const s = yaml.load(readFileSync(join(root, init, 'state.yaml'), 'utf8')) ?? {};
      for (const sh of s.stakeholders ?? []) if (sh?.name) noms.add(String(sh.name));
    } catch { /* dossier absent ou illisible : on ne mesure rien plutôt que de deviner */ }
  }
  return [...noms];
}
// Une question « nomme quelqu'un » si le nom y figure tel quel. On ne cherche pas le vocatif : la
// troisième personne — « à quoi Dédé verra-t-il… », posée devant lui — est déjà une amélioration sur
// « tu », et la différence entre les deux ne se décide pas par expression régulière.
const nomme = (question, noms) => noms.some(n => question.toLowerCase().includes(n.toLowerCase()));
// Un identifiant du SDLC : une à quatre majuscules, un tiret, un nombre — ZO-003, BC-12, SH-01, R-04.
const IDENTIFIANT_RE = /\b[A-Z]{1,4}-S?\d{1,3}\b/;

// Un extrait ne tronque pas en plein mot, et ne tronque pas en silence : la dernière réponse du premier
// dossier réel s'arrêtait sur « **cette se », sans rien dire de ce qui manquait.
// Un fragment cité DANS une phrase se coupe autrement qu'un bloc. `borne` ajoute sa marque après deux
// retours à la ligne — ce qui est juste pour un bloc, et ce qui, dans « … », fermait le bloc de
// citation du markdown et laissait le guillemet fermant seul sur une ligne de corps de texte :
//   > 1 question(s) … : « Qui, dans l'association, a le droit de décider qu'une donnée
//
//   _[…] 109 caractère(s) de plus dans la transcription._ »
// On ne coupe jamais en plein mot, et on dit qu'on a coupé — le même geste que `label()`.
const bribe = (texte, max) => {
  const t = maskSecrets(String(texte ?? '')).replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max).replace(/\s+\S*$/, '')}…`;
};
// Un BLOC de texte : la marque va à la ligne, parce qu'elle parle du reste du bloc.
const borne = (texte, max = 3000) => {
  const s = maskSecrets(texte);
  if (s.length <= max) return s;
  const coupe = s.slice(0, max);
  const bord = Math.max(coupe.lastIndexOf('\n\n'), coupe.lastIndexOf('\n'));
  const garde = bord > max / 2 ? coupe.slice(0, bord) : coupe.replace(/\s+\S*$/, '');
  return `${garde}\n\n_[…] ${s.length - garde.length} caractère(s) de plus dans la transcription._`;
};

// Une question écrite en texte libre arrive avec son markdown, et souvent avec ses voisines. On retire
// les marques et on dédoublonne ; on garde le numéro du tour, parce que c'est lui qui montre que
// plusieurs questions ouvertes ont été posées dans le même message — ce que `references/questions.md`
// interdit, et ce qui est arrivé sur le premier dossier réel, où le coût de l'inaction a été demandé
// trois fois sans jamais obtenir de réponse. Ce numéro ne SORT plus de l'extrait : voir `rangDe`.
const nettoieQuestion = q => q.replace(/\*\*/g, '').replace(/^[\s>*_#•–-]+/, '').replace(/\s+/g, ' ').trim();
const questionsEcrites = (texte, tour) => [...String(texte ?? '').matchAll(QUESTION_RE)]
  .map(m => ({ tour, question: nettoieQuestion(m[0]) })).filter(q => q.question.length > 10);

// Extrait déterministe d'une session : ce qui ne dépend d'aucune interprétation.
export function buildExtract(turns, meta) {
  const users = turns.filter(t => t.role === 'user');
  const assistants = turns.filter(t => t.role === 'assistant');
  const tourDe = new Map(assistants.map((a, i) => [a, i + 1]));
  // La réponse à une question posée EN TEXTE LIBRE, c'est le message suivant de l'utilisateur, et
  // c'est le seul endroit où elle se lit. L'extrait ne la joignait pas : les questions de l'outil
  // portaient leur `**Réponse**`, celles en texte libre n'en portaient aucune. Et le numéro affiché ne
  // permettait pas de la retrouver — `tourDe` compte les RÉPONSES DE L'AGENT (177 sur le troisième
  // dossier réel) quand la section « Messages de l'utilisateur » les numérote, elles, de 1 à 29 : deux
  // échelles, et « (tour 13) » désignait une chose absente du document. Concrètement, le message n° 3
  // était « C'est Dédé » — trois mots dont la question était perdue. L'extrait ne garde donc plus qu'une
  // échelle, celle qu'il porte : le rang du message de l'utilisateur.
  const rangDe = new Map(users.map((u, i) => [u, i + 1]));
  // Plusieurs réponses de l'agent peuvent précéder un même message : l'utilisateur répond à la
  // DERNIÈRE. Les précédentes n'ont pas reçu de réponse — une question posée puis recouverte par la
  // suite du travail n'a pas été répondue, et le dire est le seul constat juste.
  const reponduePar = new Map();
  const recouvertes = new Set();
  let enAttente = [];
  for (const t of turns) {
    if (t.role === 'assistant') enAttente.push(t);
    else if (t.role === 'user' && enAttente.length) {
      reponduePar.set(enAttente[enAttente.length - 1], t);
      for (const a of enAttente.slice(0, -1)) recouvertes.add(a);
      enAttente = [];
    }
  }

  // Fichiers touchés. Les outils d'écriture nomment leur cible ; au shell, seules la redirection et
  // `tee` la nomment. Le reste n'est pas devinable : on le compte au lieu de conclure qu'il n'y a rien.
  const written = new Map();
  let shellLances = 0;
  for (const a of assistants) for (const tl of a.tools ?? []) {
    if (isWriteTool(tl.name)) { for (const p of writtenPaths(tl.input)) written.set(p, (written.get(p) ?? 0) + 1); continue; }
    if (!isShellTool(tl.name)) continue;
    const cmd = String(tl.input?.command ?? tl.input?.raw ?? '');
    if (cmd.trim()) shellLances += 1;
    for (const p of shellWrittenPaths(cmd)) written.set(p, (written.get(p) ?? 0) + 1);
  }
  const scripts = [...new Set(assistants.flatMap(a => (a.tools ?? []).filter(t => isShellTool(t.name)).map(t => String(t.input?.command ?? t.input?.raw ?? '')))
    .filter(c => /scripts\/[a-z-]+\.mjs/.test(c)).map(c => c.match(/scripts\/([a-z-]+\.mjs)/)[1]))];
  const ids = [...new Set(turns.flatMap(t => [t.text, ...(t.tools ?? []).map(x => JSON.stringify(x.input))].join(' ').match(new RegExp(IDENTIFIANT_RE.source, 'g')) ?? []))].sort();
  const lastAssistant = [...assistants].reverse().find(a => a.text);

  // Questions posées par l'outil, dans l'ordre, chacune avec sa réponse quand l'hôte la nomme.
  const reponses = new Map(turns.filter(t => t.role === 'answer').map(t => [t.ref, t.text]));
  const appels = assistants.flatMap(a => (a.tools ?? []).filter(t => isQuestionTool(t.name)).map(t => {
    const brut = reponses.get(t.id) ?? '';
    const paires = answersOf(brut);
    const questions = questionsOf(t.input).map(q => ({ ...q, reponse: paires.get(q.question) ?? '' }));
    // Tout rattaché : la phrase de service n'apprend plus rien. Sinon on la garde telle quelle —
    // une réponse mal placée vaut mieux qu'une réponse perdue.
    const rattachees = questions.length > 0 && questions.every(q => q.reponse);
    return { tour: tourDe.get(a), questions, reponse: rattachees ? '' : brut };
  })).filter(c => c.questions.length);

  // Questions en texte libre, dédoublonnées, chacune avec la réponse qui a suivi.
  const ecrites = [];
  const vues = new Set();
  for (const a of assistants) {
    const u = reponduePar.get(a);
    for (const q of questionsEcrites(a.text, tourDe.get(a))) {
      const cle = q.question.toLowerCase();
      if (vues.has(cle)) continue;
      vues.add(cle);
      ecrites.push({ ...q, rang: u ? rangDe.get(u) : 0, reponse: u ? u.text : '', recouverte: recouvertes.has(a) });
    }
  }
  // Le groupement compte par RÉPONSE DE L'AGENT — c'est bien un message qui porte trois questions
  // ouvertes à la fois —, mais il se dit par le rang du message qui a répondu : le seul repère que le
  // lecteur de l'extrait puisse suivre.
  const parTour = new Map();
  for (const e of ecrites) {
    const g = parTour.get(e.tour) ?? { n: 0, rang: e.rang };
    parTour.set(e.tour, { n: g.n + 1, rang: g.rang });
  }
  const groupes = [...parTour.values()].filter(g => g.n > 1);

  // Questions adressées à personne. La mesure n'a de sens qu'à partir de deux personnes connues :
  // seul à répondre, on n'a pas besoin d'être nommé. Les deux formes comptent — une question à choix
  // fermé posée à la salle laisse la même réponse sans voix qu'une question ouverte.
  const personnes = meta.personnes ?? [];
  const posees = [...ecrites.map(e => e.question), ...appels.flatMap(c => c.questions.map(q => q.question))];
  const sansNom = personnes.length > 1 ? posees.filter(q => !nomme(q, personnes)).length : 0;
  // Une question ne porte pas d'identifiant : on doit pouvoir le retirer sans rien perdre, donc il
  // n'avait rien à y faire. Vu sur un dossier réel : `ZO-003 — « directeur » de quoi : une école, une
  // association, les deux ?` — l'identifiant ne cite rien, ne glose rien, et annonce « champ ZO-003, à
  // remplir ». Le renvoi en fin d'AFFIRMATION, lui, reste utile : il dit où la chose est rangée.
  const avecId = posees.filter(q => IDENTIFIANT_RE.test(q));

  const ligneQuestion = q => `- ${maskSecrets(q.question)}${q.options.length ? ` _(propositions : ${q.options.map(maskSecrets).join(' · ')})_` : ''}`;
  const blocAppel = c => [
    ...c.questions.map(q => `${ligneQuestion(q)}${q.reponse ? `\n  **Réponse** : ${maskSecrets(q.reponse)}` : ''}`),
    ...(c.reponse ? [`  **${c.questions.length > 1 ? 'Réponses' : 'Réponse'}** : ${maskSecrets(c.reponse)}`] : []),
  ];
  // Une question posée par l'outil et restée sans réponse est en suspens, comme celles de la dernière
  // réponse — à condition que cette dernière réponse n'ait justement rien reçu. Quand la transcription
  // se termine sur un message de l'utilisateur, la dernière réponse de l'agent a été répondue, et ses
  // questions figuraient quand même ici : l'appariement permet enfin de le savoir.
  const enSuspens = [...new Set([
    ...appels.flatMap(c => c.questions.filter(q => !q.reponse && !c.reponse).map(q => q.question)),
    ...(lastAssistant && !reponduePar.has(lastAssistant) ? questionsEcrites(lastAssistant.text, 0).map(q => q.question) : []),
  ])];

  const md = [
    `# Extrait de session — ${meta.date}`, '',
    `> Généré automatiquement depuis la transcription (${meta.session}), sans interprétation. Le condensé narratif, s'il existe, est dans le fichier \`.condense.md\` voisin.`, '',
    `**Initiatives touchées** : ${meta.initiatives.join(', ') || '—'} · **Événement** : ${meta.event} · **Tours** : ${users.length} message(s) de l'utilisateur, ${assistants.length} réponse(s)`, '',
    '## Messages de l\'utilisateur, mot pour mot', '',
    ...users.flatMap((u, i) => [`### ${i + 1}. ${u.at ? u.at.replace('T', ' ').slice(0, 16) : ''}`, '', maskSecrets(u.text).split('\n').map(l => `> ${l}`).join('\n'), '']),
    '## Questions posées par l\'assistant', '',
    '### Avec l\'outil de questions', '',
    ...(appels.length ? appels.flatMap(blocAppel) : ['_Aucune._']), '',
    '### En texte libre', '',
    // La réponse est citée en bribe, pas en entier : elle est déjà mot pour mot plus haut, et le rang
    // y mène. Un extrait qui la recopierait deux fois grossirait sans rien apprendre.
    ...(ecrites.length ? ecrites.flatMap(e => [`- ${maskSecrets(e.question)}`,
      e.rang ? `  **Réponse** (message n° ${e.rang}) : ${bribe(e.reponse, 400)}`
        : e.recouverte ? '  _Sans réponse : l\'agent a poursuivi avant qu\'un message de l\'utilisateur n\'arrive._'
          : '  _Sans réponse : fin de session (voir « Questions en suspens »)._']) : ['_Aucune._']), '',
    ...(groupes.length ? [`> ${groupes.length} message(s) de l'agent portent plus d'une question en texte libre : ${groupes.map(g => (g.rang ? `avant le message n° ${g.rang} (${g.n} questions)` : `en fin de session (${g.n} questions)`)).join(', ')}. Une question ouverte se pose seule.`, ''] : []),
    ...(avecId.length ? [`> ${avecId.length} question(s) sur ${posees.length} portent un identifiant : une question n'en porte pas — celui à qui on demande n'a pas besoin de l'adresse de la chose, il a besoin de la chose. ${avecId.map(q => `« ${bribe(q, 90)} »`).join(' ; ')}`, ''] : []),
    ...(sansNom ? [`> ${sansNom} question(s) sur ${posees.length} ne nomment personne, alors que le dossier connaît ${personnes.length} personnes (${personnes.join(', ')}) : une question dit à qui elle est posée, à la deuxième personne, et son destinataire est l'\`ask_to\` de la zone qu'elle sert à lever.`, ''] : []),
    '## Dernière réponse de l\'assistant', '',
    lastAssistant ? borne(lastAssistant.text) : '_Aucune._', '',
    '## Questions en suspens à la fin de la session', '',
    ...(enSuspens.length ? enSuspens.map(q => `- ${maskSecrets(q)}`) : ['_Aucune question dans la dernière réponse._']), '',
    '## Fichiers modifiés', '',
    ...(written.size || shellLances
      ? [...[...written].map(([p, n]) => `- \`${p}\` (${n} modification(s))`),
        ...(shellLances ? [`- _${shellLances} commande(s) de shell lancée(s)_ : seules la redirection et \`tee\` y désignent un fichier ; une écriture faite autrement — \`sed -i\`, un script, un éditeur — ne se lit pas dans la transcription.`] : [])]
      : ['_Aucun._']), '',
    '## Scripts lancés', '', scripts.length ? scripts.map(s => `- ${s}`).join('\n') : '_Aucun._', '',
    '## Identifiants mentionnés', '', ids.join(', ') || '—', '',
  ];
  return md.join('\n');
}

// Index complet : l'ancien fichier unique s'il existe encore, plus un fichier par session.
// En cas de doublon, le fichier par session fait foi (il est le seul encore écrit).
export function loadIndex(root = '.') {
  const sessions = new Map();
  const legacy = join(root, INDEX);
  if (existsSync(legacy)) {
    for (const e of (yaml.load(readFileSync(legacy, 'utf8')) ?? {}).sessions ?? []) {
      if (e?.session) sessions.set(e.session, e);
    }
  }
  const dir = join(root, SESSIONS_DIR);
  if (existsSync(dir)) {
    for (const f of readdirSync(dir).filter(f => f.endsWith('.index.yaml')).sort()) {
      try {
        const e = yaml.load(readFileSync(join(dir, f), 'utf8'));
        if (e?.session) sessions.set(e.session, e);
      } catch { /* un index de session illisible n'empêche pas de lire les autres */ }
    }
  }
  return { sessions: [...sessions.values()].sort((a, b) => String(a.ended).localeCompare(String(b.ended))) };
}

// Écrit la seule entrée de cette session, dans son propre fichier : aucun écrivain concurrent.
export function saveSessionEntry(entry, root = '.') {
  const p = join(root, sessionIndexPath(String(entry.started ?? '').slice(0, 10) || 'sans-date', entry.session));
  mkdirSync(dirname(p), { recursive: true });
  const tmp = `${p}.${process.pid}.tmp`;
  writeFileSync(tmp, `# Index d'une session — écrit par session-capture.mjs. Un fichier par session : rien à fusionner.\n${yaml.dump(entry, { lineWidth: 120 })}`);
  renameSync(tmp, p);
}
export const sessionsFor = (initiative, root = '.') => loadIndex(root).sessions.filter(s => (s.initiatives ?? []).includes(initiative));

// Le condensé d'une session, s'il existe : on regarde LE FICHIER, à l'emplacement que l'ancien champ
// `condensed` indique s'il traîne encore dans un index, ou à celui que la convention de nom impose.
//
// Correction d'un diagnostic faux. J'avais écrit ici que le champ était « un cache écrit par
// session-capture.mjs, qui tourne sur Stop, DONC APRÈS TOUT CE QUE L'AGENT A FAIT DANS LE TOUR ». Si
// c'était la cause, le champ serait rempli : une capture qui tourne après tout ce qu'a fait l'agent voit
// le condensé qu'il vient d'écrire. Les vraies raisons étaient deux, et aucune n'était celle-là — le
// condensé est souvent écrit dans un tour postérieur à la dernière capture, et surtout la capture
// cherchait le fichier dans `join(cwd, SESSIONS_DIR)` : lancée depuis un dossier d'initiative, elle le
// cherchait là où il n'est pas. Mesuré en deux captures sur le même condensé : `condensed:
// .tizi/sessions/…condense.md` depuis la racine, `condensed: ''` depuis `brd/demo`.
//
// J'avais affirmé une cause au lieu de la mesurer, puis écrit ce repli, qui a rendu la question sans
// objet — donc personne n'y est revenu. Un contournement qui masque un défaut masque aussi le fait que
// le diagnostic était faux. Le champ ne s'écrit plus : il ne pouvait que mentir, et les trois lecteurs
// (`status.mjs`, `next-step.mjs`, `session-start.mjs`) passent tous par ici.
export function condenseOf(entry, root = '.') {
  const date = String(entry?.started ?? entry?.ended ?? '').slice(0, 10);
  const candidats = [entry?.condensed, date && entry?.session ? `${SESSIONS_DIR}/${date}-${entry.session}.condense.md` : ''].filter(Boolean);
  return candidats.find(p => existsSync(join(root, p))) ?? '';
}

// Consommation de tokens d'une transcription. Claude Code : message.usage (input_tokens, output_tokens, cache_*).
// Copilot : un objet de consommation sous data.usage ou usage, s'il existe ; sinon la consommation est « inconnue »,
// jamais estimée.
export function usageOf(path) {
  const u = { input: 0, output: 0, cache_read: 0, cache_write: 0, found: false };
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let e; try { e = JSON.parse(line); } catch { continue; }
    // Les sous-agents comptent aussi : leur consommation fait partie du coût de la tâche.
    const x = e.message?.usage ?? e.data?.usage ?? e.usage;
    if (!x || typeof x !== 'object') continue;
    u.found = true;
    for (const [k, v] of Object.entries(x)) {
      if (typeof v !== 'number') continue;
      const key = k.toLowerCase();
      if (/cache.*read|read.*cache|cached/.test(key)) u.cache_read += v;
      else if (/cache.*(creat|write)/.test(key)) u.cache_write += v;
      else if (/input|prompt/.test(key)) u.input += v;
      else if (/output|completion/.test(key)) u.output += v;
    }
  }
  return u.found ? { input: u.input, output: u.output, cache_read: u.cache_read, cache_write: u.cache_write, total: u.input + u.output + u.cache_read + u.cache_write } : null;
}
