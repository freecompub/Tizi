# Council de lentilles (PRD)

Même protocole que pour le BRD : plusieurs lentilles indépendantes examinent le PRD pour faire apparaître des zones d'ombre.

## Règles non négociables

0. Le council **se lance**, il ne se propose pas. Son moment est prescrit par la phase : une vérification qui cherche ce que l'agent a manqué ne peut pas dépendre de l'accord de cet agent, ni de la patience de l'utilisateur. Ce qui se décide, c'est le sort des questions trouvées, pas la tenue du council. Le council est l'outil de l'agent, pas une étape du dossier : il ne s'annonce pas davantage qu'il ne se demande.
1. Une lentille est un **point de vue d'analyse**, pas une personne.
2. Le council ne produit que des **zones d'ombre candidates** sous forme de questions : jamais d'exigence, de critère ou de solution.
3. Un résultat du council ne lève aucune zone d'ombre ; seule une source réelle ou une décision de l'utilisateur le peut.
4. Chaque question désigne qui peut y répondre (rôle ou personne).

## Modes

| Mode | Moment | Ce qu'on cherche |
|---|---|---|
| `cadrage` | En Frame, après les parcours ou le MVP | Personas oubliés, parcours non couverts, cas limites, MVP mal découpé |
| `specification` | En Specify, après le MVP | États d'erreur, NFR oubliées, critères non testables, inflation de périmètre |

## Un passage peut couvrir plusieurs initiatives

À deux conditions : qu'elles partagent une **dépendance** ou un périmètre commun — c'est là que se
logent les angles morts qu'aucun dossier ne voit seul — et que la **portée soit nommée**.

Un passage partagé s'écrit à l'identique dans chaque initiative couverte, avec `initiatives` qui les
nomme toutes. Sans ce champ, le même passage se relit comme un passage par dossier : sur le premier
dossier réel, un council unique sur deux initiatives a inscrit « 40 proposées, 39 écartées » dans
**chacune** — le dépôt en déclarait 80 pour 40 produites, et le second dossier affichait « 0 retenue sur
40 », ce qui se lit « le council n'a rien trouvé pour moi » alors qu'il n'a jamais tourné pour lui seul.
La vérité était en commentaire YAML, que rien ne lit.

Deux règles qui vont avec :

- **`proposed` est le compte du passage**, pas celui de l'initiative : il est identique dans chaque
  fichier, et `initiatives` dit sur combien de dossiers il porte. Une somme sur le portefeuille
  dédoublonne sur (date, mode, portée).
- **Les questions, elles, s'attribuent** : chaque fichier ne garde que celles dont le `target` porte sur
  cette initiative. C'est à ça que sert `target`, et c'est ce qui fait que les questions s'additionnent
  correctement là où les compteurs ne le peuvent pas.

## Déroulé

1. **Dossier unique** pour toutes les lentilles, construit depuis `state.yaml` : vision, objectifs, personas, parcours, releases ; en mode `specification`, les FR (énoncé, priorité, release), les AC et les NFR ; titres des zones d'ombre existantes.
2. **Lancement** : invoque l'agent `prd-lens-critic` comme sous-agent (Claude Code ou GitHub Copilot) une fois par lentille, en parallèle, avec sa définition (`references/lenses.md`), le mode et le dossier. Sans subagents, traite les lentilles une par une en repartant du dossier seul, et préviens que l'indépendance est moindre.
3. **Arbitrage** (par toi) : fusionne les doublons (plusieurs lentilles = signal de priorité), écarte ce qui est déjà couvert ou qui est une solution déguisée, type chaque question (`references/shadow-zones.md`), priorise, et **réduis à 5 questions au plus**. Les lentilles transmettent tout ce qu'elles trouvent, sans hiérarchiser entre elles : réduire est ton travail d'orchestrateur. Chaque lentille rend le `target` de ses questions — l'élément visé — : c'est par lui que deux formulations différentes du même trou se reconnaissent, et une question qui ne désigne rien est à renvoyer plutôt qu'à deviner.

   Ces cinq questions **ne se trient pas avec l'utilisateur** : elles s'enregistrent, puis se posent comme les autres zones d'ombre, deux ou trois à la fois, classées par impact par `ask-five.mjs`. Trier une liste de questions est un travail de méthode, et tu as le dossier pour le faire — lui a son métier. Une question qui n'a pas d'objet se ferme en y répondant : `levée`, avec la raison dans ses mots.
4. **Enregistrement** : les questions retenues à l'arbitrage deviennent des zones d'ombre `origin: council:<lentille>`, avec leur `target` dans `related`. `blocking_guess` est une **indication**, pas la valeur : une zone née du council n'est bloquante que si tu peux dire pourquoi. **Tu ne nommes jamais le council dans ce que tu écris à l'utilisateur** — ni « council », ni « lentille », ni le mode : c'est ton outil, il en voit les questions, pas la machine. Une exception : quand une question met en cause quelque chose qu'il a **déjà validé**, montre-lui la contradiction et laisse-le trancher.
5. **Trace** dans `council_runs` : date, mode, lentilles, la **portée** (`initiatives`, si le passage en couvre plusieurs), le nombre de questions renvoyées par les lentilles, et **les questions elles-mêmes** — celles qui visent cette initiative — retenues, écartées avec leur raison, et celles mises en réserve pour un prochain council. Trois compteurs ne se relisent pas : « 40 proposées, 39 écartées » ne dit pas si c'étaient des doublons, des solutions déguisées, ou de bonnes questions mal arbitrées, et les écartées disparaissent avec la session.
