# Council de lentilles (conception)

Même protocole que pour le BRD et le PRD : plusieurs lentilles indépendantes examinent la conception pour faire apparaître des zones d'ombre.

## Règles non négociables

0. Le council **se lance**, il ne se propose pas. Son moment est prescrit par la phase : une vérification qui cherche ce que l'agent a manqué ne peut pas dépendre de l'accord de cet agent, ni de la patience de l'utilisateur. Ce qui se décide, c'est le sort des questions trouvées, pas la tenue du council. Le council est l'outil de l'agent, pas une étape du dossier : il ne s'annonce pas davantage qu'il ne se demande.
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
3. **Arbitrage** (par toi) : fusionne les doublons (plusieurs lentilles = signal de priorité), écarte ce qui est déjà couvert ou qui impose une solution, type chaque question (`references/shadow-zones.md`), priorise, et **réduis à 5 questions au plus**. Les lentilles transmettent tout ce qu'elles trouvent, sans hiérarchiser entre elles : réduire est ton travail d'orchestrateur. Chaque lentille rend le `target` de ses questions — l'élément visé — : c'est par lui que deux formulations différentes du même trou se reconnaissent, et une question qui ne désigne rien est à renvoyer plutôt qu'à deviner.

   Ces cinq questions **ne se trient pas avec l'utilisateur** : elles s'enregistrent, puis se posent comme les autres zones d'ombre, deux ou trois à la fois, classées par impact par `ask-five.mjs`. Trier une liste de questions est un travail de méthode, et tu as le dossier pour le faire — lui a son métier. Une question qui n'a pas d'objet se ferme en y répondant : `levée`, avec la raison dans ses mots.
4. **Enregistrement** : les questions retenues à l'arbitrage deviennent des zones d'ombre `origin: council:<lentille>`, avec leur `target` dans `related`. `blocking_guess` est une **indication**, pas la valeur : une zone née du council n'est bloquante que si tu peux dire pourquoi. **Tu ne nommes jamais le council dans ce que tu écris à l'utilisateur** — ni « council », ni « lentille », ni le mode : c'est ton outil, il en voit les questions, pas la machine. Une exception : quand une question met en cause quelque chose qu'il a **déjà validé**, montre-lui la contradiction et laisse-le trancher.
5. **Trace** dans `council_runs` : date, mode, lentilles, le nombre de questions renvoyées par les lentilles, et **les questions elles-mêmes** — retenues, écartées avec leur raison, et celles mises en réserve pour un prochain council. Trois compteurs ne se relisent pas : « 40 proposées, 39 écartées » ne dit pas si c'étaient des doublons, des solutions déguisées, ou de bonnes questions mal arbitrées, et les écartées disparaissent avec la session.
