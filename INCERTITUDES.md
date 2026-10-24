# Incertitudes — ce qu'on affirme sans l'avoir observé

Tizi se revendique de « zéro confiance aveugle » et refuse une exigence sans source. Ce fichier
applique la règle au dépôt lui-même : il tient la liste de ce que le code, les skills et la
documentation **affirment sans que personne l'ait vu fonctionner**.

Ce n'est ni `AMELIORATIONS.md` (ce qu'on veut faire) ni `evals/audit/` (ce qui a été observé et
reproduit). C'est la troisième catégorie, la plus dangereuse parce qu'elle ne se voit pas : une
affirmation plausible, écrite avec assurance, que rien n'étaye. Un test qui passe sur une fixture
inventée prouve que le code lit la fixture, pas qu'il lit la réalité.

## Les trois classes

Celles du catalogue de règles (`scripts/lib/rules.mjs`), appliquées ici aux affirmations du dépôt :

| Classe | Ce que ça veut dire |
|---|---|
| **observé** | Quelqu'un l'a exécuté, lu ou mesuré, et peut le refaire |
| **rapporté** | Une documentation, une spécification ou une personne le dit ; nous ne l'avons pas vu |
| **supposé** | Aucune source. C'est une hypothèse qui a l'air d'un fait |

Une entrée naît dès qu'on écrit quelque chose qu'on n'a pas observé. Elle sort quand quelqu'un
l'observe : elle passe dans « Levées », avec la date et la méthode. Elle ne sort pas parce qu'un test
passe, si ce test s'appuie sur la même supposition.

## Supposé

### 1. La forme d'un appel à `vscode/askQuestions`

`questionsOf` (`scripts/lib/sessions.mjs`) lit `{ questions: [{ question, options: [{ label }] }] }`,
et `tests/fixtures/copilot-events.jsonl` contient un appel de cette forme. **Cette forme est
inventée.** Personne n'a lu une transcription Copilot contenant une vraie question.

- **Où ça compte** : la capture des questions côté Copilot, et le test qui la couvre.
- **Si c'est faux** : `questionsOf` ignore ce qu'elle ne reconnaît pas — donc les questions
  disparaissent **en silence** de l'extrait de session, exactement le défaut qu'on vient de corriger
  côté Claude Code. Le test continuerait de passer.
- **Comment lever** : dans VS Code, une session Copilot qui pose une question, puis lire
  `~/.copilot/session-state/<session>/events.jsonl` et comparer. Remplacer la fixture par l'extrait
  réel, anonymisé.

### 2. Les limites de `vscode/askQuestions`

`references/questions.md` dit « respecte ce que l'outil déclare ; en cas de doute, un appel par
question ». Cette prudence est là **parce qu'on ne connaît ni le nombre de questions par appel, ni le
nombre de réponses proposées, ni si un champ libre est fourni**. Les limites d'`AskUserQuestion`, elles,
sont observées (1 à 4 questions, 2 à 4 propositions, réponse libre ajoutée par l'outil).

- **Si c'est faux** : un appel refusé ou tronqué, donc des questions perdues au moment de les poser.
- **Comment lever** : lire la définition de l'outil dans une session VS Code, ou la documentation de
  l'extension.

### 3. Le format des événements de transcription Copilot

Tout le lecteur Copilot de `readTranscript` repose sur `tests/fixtures/copilot-events.jsonl` :
`tool.execution_start` avec `data.toolName` et `data.arguments`, `user.message` et
`assistant.message` avec `data.content`, `parentToolCallId` pour les sous-agents, et l'absence de tout
événement reliant un résultat à son appel. **La provenance de cette fixture n'est pas enregistrée** :
on ne sait pas si elle a été copiée d'une session réelle ou écrite de mémoire.

- **Si c'est faux** : la capture de session ne produit rien d'utilisable sous Copilot, sans erreur.
- **Comment lever** : une session Copilot CLI réelle, et la fixture remplacée par son extrait. À
  défaut, demander à l'auteur de la fixture d'où elle vient et l'écrire ici.

### 4. `user-invocable: false` exclut les sous-agents de la liste Copilot

Le `README` l'affirme — « Copilot les exclut de la liste de l'utilisateur ; Claude Code les affiche
encore » — et `install.mjs` pose la marque des deux côtés. Le test vérifie que **la marque est
écrite**, pas que Copilot en tient compte.

- **Si c'est faux** : les douze sous-agents internes sont proposés à l'utilisateur, qui en invoquera
  un hors de son contexte. La seule protection restante est la mention « ne pas utiliser directement »
  dans la description.
- **Comment lever** : installer le plugin dans VS Code et regarder la liste des agents.

### 5. Les hooks Copilot dans VS Code

`install.mjs` annonce : « dans VS Code ils sont en préversion et peuvent devoir être activés ». La
phrase est honnête sur son incertitude mais ne dit pas ce qu'il faut activer, ni comment vérifier que
le garde-fou TDD tourne vraiment sous VS Code.

- **Si c'est faux** : le garde-fou TDD ne s'exécute pas, et personne ne le remarque — un hook absent
  ressemble à un hook qui autorise.
- **Comment lever** : une écriture de code hors tâche dans VS Code sous Copilot. Le refus doit arriver.

### 6. Les commandes de marketplace Copilot

Le `README` documente `copilot plugin marketplace add freecompub/Tizi` et
`copilot plugin install tizi@tizi`. La CLI Copilot n'est pas installée sur la machine de
développement : ces deux commandes n'ont jamais été exécutées.

- **Si c'est faux** : l'installation documentée échoue au premier essai d'un utilisateur.
- **Comment lever** : les exécuter. La commande équivalente de Claude Code est vérifiée.

### 7. Le `handoffs` du frontmatter d'un agent Copilot

`install.mjs` génère `handoffs: [{ label, agent, prompt, send }]` dans chaque `.agent.md`. Aucune
spécification n'est citée dans le dépôt pour cette forme.

- **Si c'est faux** : les boutons de passage n'apparaissent pas, ou le frontmatter est rejeté.
- **Comment lever** : ouvrir un agent généré dans VS Code, ou retrouver la spécification Agent Plugins
  qui décrit le champ et la citer ici.

### 8. Le reporter JUnit de `node --test` et le plancher `engines: >=18`

`adopt.mjs` génère `node --test --test-reporter=junit --test-reporter-destination=…` pour les projets
Node, alors que `package.json` annonce `engines: >=18`. Ce reporter paraît postérieur à Node 18.
C'est le constat nº 16 de l'audit du 23 octobre, toujours ouvert.

- **Si c'est faux** : la configuration de tests proposée à l'adoption est inexécutable sur la version
  minimale annoncée — sur le premier dépôt qu'on adopte, et sans rapport de couverture.
- **Comment lever** : `docker run --rm node:18 node --test --test-reporter=junit` sur un test factice.
  Puis trancher : remonter le plancher, ou générer une commande compatible.

## Levées

| Affirmation | Levée le | Comment |
|---|---|---|
| `claude plugin marketplace add --sparse <chemins>` existe et prend une liste de dossiers | 24 octobre 2026 | `claude plugin marketplace add --help` : « `--sparse <paths...>` Limit checkout to specific directories via git sparse-checkout » |
| Les limites d'`AskUserQuestion` : 1 à 4 questions par appel, 2 à 4 réponses proposées, réponse libre ajoutée par l'outil | 24 octobre 2026 | Définition de l'outil lue dans la session qui a écrit `references/questions.md` |

## Ce que ce fichier n'autorise pas

Écrire une incertitude ici ne la rend pas acceptable. Une affirmation **supposée** ne doit pas être
formulée comme un fait dans le `README`, un skill ou la documentation : elle s'y écrit avec sa réserve,
et renvoie ici. Ce fichier est la trace de ce qu'on sait ne pas savoir, pas un endroit où ranger ce
qu'on préfère ne pas vérifier.

Trois de ces huit entrées se lèveraient dans la même demi-heure, avec une seule session Copilot dans
VS Code : les nº 1, 3 et 4.
