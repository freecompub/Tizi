# Council de lentilles (conception)

Même protocole que pour le BRD et le PRD : plusieurs lentilles indépendantes examinent la conception pour faire apparaître des zones d'ombre.

## Règles non négociables

1. Une lentille est un **point de vue d'analyse**, pas une personne.
2. Le council ne produit que des **zones d'ombre candidates** sous forme de questions : jamais de décision, d'option retenue ni de technologie.
3. Un résultat du council ne lève aucune zone d'ombre et ne fait accepter aucun ADR ; seule une source, une mesure ou une décision déclarée le peut.
4. Chaque question désigne qui peut y répondre (rôle ou personne).

## Modes

| Mode | Moment | Ce qu'on cherche |
|---|---|---|
| `exploration` | En Explore, après les moteurs et le domaine | Moteurs oubliés, scénarios non mesurables, dépendances externes fragiles, frontières douteuses, existant mal prouvé |
| `conception` | En Design, après les menaces | Options non envisagées, conséquences négatives tues, FR mal allouées, NFR sans vérification, menaces manquées, coût d'exploitation |

## Déroulé

1. **Dossier unique** construit depuis `state.yaml` : moteurs (scénarios, cotes), contextes et carte, éléments et relations (noms, types, cycle de vie), et en mode `conception` les ADR (options, résultat, conséquences), les réponses aux NFR, les données classifiées, les menaces ; titres des zones d'ombre existantes.
2. **Lancement** : invoque l'agent `sad-lens-critic` comme sous-agent (Claude Code ou GitHub Copilot) une fois par lentille, en parallèle, avec sa définition (`references/lenses.md`), le mode et le dossier. Sans subagents, traite les lentilles une par une en repartant du dossier seul, et préviens que l'indépendance est moindre.
3. **Arbitrage** (par toi) : fusionne les doublons (plusieurs lentilles = signal de priorité), écarte ce qui est déjà couvert ou qui impose une solution, type chaque question (`references/shadow-zones.md`), priorise, présente 10 questions au plus.
4. **Choix de l'utilisateur** : les questions retenues deviennent des zones d'ombre `origin: council:<lentille>`.
5. **Trace** dans `council_runs` : date, mode, lentilles, questions proposées, écartées, retenues.
