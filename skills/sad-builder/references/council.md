# Council de lentilles (conception)

Même protocole que pour le BRD et le PRD : plusieurs lentilles indépendantes examinent la conception pour faire apparaître des zones d'ombre.

## Règles non négociables

0. Le council **se lance**, il ne se propose pas. Son moment est prescrit par la phase : une vérification qui cherche ce que l'agent a manqué ne peut pas dépendre de l'accord de cet agent, ni de la patience de l'utilisateur. Ce qui se décide, c'est le sort des questions trouvées, pas la tenue du council.
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
3. **Arbitrage** (par toi) : fusionne les doublons (plusieurs lentilles = signal de priorité), écarte ce qui est déjà couvert ou qui impose une solution, type chaque question (`references/shadow-zones.md`), priorise, et **réduis à 5 questions au plus**. Les lentilles transmettent tout ce qu'elles trouvent, sans hiérarchiser entre elles : réduire est ton travail d'orchestrateur.

   Ces cinq questions se **trient** avant de se poser : l'utilisateur retient, reformule ou rejette, et ce qu'il retient devient une zone d'ombre. Les réponses viennent ensuite, deux ou trois à la fois. **Rien n'oblige à poser les cinq d'un coup**, ni même à les présenter en un bloc : cinq est un plafond de sélection, pas un lot à envoyer. Si l'une mérite une conversation à elle seule, prends-la seule et garde les autres pour la suite — elles sont enregistrées, elles ne se perdent pas. Cinq questions posées d'un coup, c'est un formulaire : on obtient des réponses courtes aux faciles, et rien aux autres.
4. **Choix de l'utilisateur** : les questions retenues deviennent des zones d'ombre `origin: council:<lentille>`.
5. **Trace** dans `council_runs` : date, mode, lentilles, le nombre de questions renvoyées par les lentilles, et **les questions elles-mêmes** — retenues, écartées avec leur raison, et celles mises en réserve pour un prochain council. Trois compteurs ne se relisent pas : « 40 proposées, 39 écartées » ne dit pas si c'étaient des doublons, des solutions déguisées, ou de bonnes questions mal arbitrées, et les écartées disparaissent avec la session.
