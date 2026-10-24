# Council de lentilles (PRD)

Même protocole que pour le BRD : plusieurs lentilles indépendantes examinent le PRD pour faire apparaître des zones d'ombre.

## Règles non négociables

1. Une lentille est un **point de vue d'analyse**, pas une personne.
2. Le council ne produit que des **zones d'ombre candidates** sous forme de questions : jamais d'exigence, de critère ou de solution.
3. Un résultat du council ne lève aucune zone d'ombre ; seule une source réelle ou une décision de l'utilisateur le peut.
4. Chaque question désigne qui peut y répondre (rôle ou personne).

## Modes

| Mode | Moment | Ce qu'on cherche |
|---|---|---|
| `cadrage` | En Frame, après les parcours ou le MVP | Personas oubliés, parcours non couverts, cas limites, MVP mal découpé |
| `specification` | En Specify, après le MVP | États d'erreur, NFR oubliées, critères non testables, inflation de périmètre |

## Déroulé

1. **Dossier unique** pour toutes les lentilles, construit depuis `state.yaml` : vision, objectifs, personas, parcours, releases ; en mode `specification`, les FR (énoncé, priorité, release), les AC et les NFR ; titres des zones d'ombre existantes.
2. **Lancement** : invoque l'agent `prd-lens-critic` comme sous-agent (Claude Code ou GitHub Copilot) une fois par lentille, en parallèle, avec sa définition (`references/lenses.md`), le mode et le dossier. Sans subagents, traite les lentilles une par une en repartant du dossier seul, et préviens que l'indépendance est moindre.
3. **Arbitrage** (par toi) : fusionne les doublons (plusieurs lentilles = signal de priorité), écarte ce qui est déjà couvert ou qui est une solution déguisée, type chaque question (`references/shadow-zones.md`), priorise, présente 10 questions au plus.

   Cette liste se **trie**, elle ne se pose pas : l'utilisateur retient, reformule ou rejette, et les questions retenues deviennent des zones d'ombre. C'est ensuite `ask-five.mjs` qui dit lesquelles poser, deux ou trois à la fois. Dix questions posées d'un coup, c'est un formulaire : on obtient des réponses courtes aux faciles et rien aux autres.
4. **Choix de l'utilisateur** : les questions retenues deviennent des zones d'ombre `origin: council:<lentille>`.
5. **Trace** dans `council_runs` : date, mode, lentilles, questions proposées, écartées, retenues.
