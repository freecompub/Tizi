# Council de lentilles

**But** : faire apparaître des zones d'ombre que l'utilisateur et toi ne voyez pas depuis votre point de vue, en examinant l'initiative à travers plusieurs lentilles indépendantes.

## Règles non négociables

0. Le council **se lance**, il ne se propose pas. Son moment est prescrit par la phase : une vérification qui cherche ce que l'agent a manqué ne peut pas dépendre de l'accord de cet agent, ni de la patience de l'utilisateur. Ce qui se décide, c'est le sort des questions trouvées, pas la tenue du council. Le council est l'outil de l'agent, pas une étape du dossier : il ne s'annonce pas davantage qu'il ne se demande.
1. Une lentille est un **point de vue d'analyse**, pas une personne. Elle ne parle jamais au nom d'une partie prenante réelle.
2. Le council produit uniquement des **zones d'ombre candidates**, sous forme de questions. Jamais de besoin candidat (`BC`), jamais de réponse à sa propre question.
3. Un résultat du council ne lève aucune zone d'ombre et ne change jamais le statut d'une partie prenante. Seule une source réelle le peut.
4. Chaque question doit désigner **qui, dans le monde réel**, peut y répondre (`SH-xx` existant ou rôle à identifier).

## Modes

| Mode | Moment | Ce qu'on cherche |
|---|---|---|
| `preparation` | Après le cadrage | Profils manquants, questions à mettre dans les guides d'entretien |
| `couverture` | Avant de proposer la fin de Discover | Angles morts restants malgré les entretiens |
| `completude` | En Define, après la rédaction des exigences | Objectifs ou exigences manquants, critères non observables |

## Déroulé

### 1. Préparer le dossier

Constitue un **dossier unique**, identique pour toutes les lentilles, à partir de `state.yaml` :
- initiative, problème, signaux de succès, périmètre, contraintes ;
- parties prenantes (rôle, quadrant, statut) ;
- besoins candidats (texte seulement) ;
- titres des zones d'ombre déjà connues, pour éviter les doublons ;
- en mode `completude` : objectifs et exigences (énoncés, priorités, critères d'acceptation).

N'y mets ni verbatims complets ni données personnelles des interviewés.

### 2. Lancer les lentilles

Lentilles par défaut : celles de `references/lenses.md`. L'utilisateur peut en retirer ou en ajouter.

- **Avec sous-agents** (Claude Code : agent `brd-lens-critic` ; GitHub Copilot : agent personnalisé `brd-lens-critic`, lancé comme sous-agent) : invoque-le une fois par lentille, **en parallèle**. Chaque invocation reçoit uniquement : la définition de sa lentille, le mode et le dossier. Aucune lentille ne voit le résultat des autres.
- **Sans sous-agents** : traite les lentilles une par une, en t'obligeant à repartir du dossier seul pour chacune. Préviens l'utilisateur que l'indépendance des points de vue est alors moindre.

### 3. Arbitrer

Tu es l'arbitre. Sur l'ensemble des résultats :
1. **Fusionne** les doublons (même question vue par plusieurs lentilles : garde-la une fois, note toutes les lentilles d'origine — c'est un signal de priorité). Chaque lentille rend le `target` de ses questions — l'élément visé — : c'est par lui que deux formulations différentes du même trou se reconnaissent, et une question qui ne désigne rien est à renvoyer plutôt qu'à deviner.
2. **Écarte** ce qui est déjà couvert par une source ou une zone d'ombre existante, ce qui est une solution ou un besoin déguisé en question, et ce qui sort du périmètre confirmé.
3. **Classe** chaque question restante dans un type de la typologie (`phase-discover.md`, section 0).
4. **Priorise** : bloquantes d'abord, puis par nombre de lentilles d'origine.
5. **Réduis à cinq questions au maximum.** Les lentilles te transmettent tout ce qu'elles ont trouvé, sans hiérarchiser entre elles : réduire est ton travail d'orchestrateur, pas le leur. Indique combien ont été écartées et pourquoi, en une ligne ; ce qui est écarté sans être traité reste disponible pour un prochain council.

### 4. Enregistrer, puis poser comme les autres

Les questions retenues à l'arbitrage **deviennent des zones d'ombre**, sans passer par un tri avec l'utilisateur : `origin: council:<lentille>`, `target` reporté dans `related`. Elles se posent ensuite **comme les autres**, mêlées à elles et classées par impact par `ask-five.mjs`.

`blocking_guess` renvoyé par la lentille est une **indication**, pas la valeur : une zone née du council n'est `blocking: true` que si tu peux dire pourquoi. Sinon elle est ouverte et non bloquante — un council qui fermerait la porte de sortie de phase à chaque passage la rendrait inatteignable.

Une question qui n'a pas d'objet se ferme **en répondant** : `levée`, avec la raison dans les mots de l'utilisateur. Un geste au lieu de deux, et le rejet est tracé.

**Tu ne nommes jamais le council dans ce que tu écris à l'utilisateur** : ni « council », ni « lentille », ni le mode. C'est ton outil. Il en voit les questions, pas la machine. Une seule exception : quand une question met en cause quelque chose qu'il a **déjà validé**, montre-lui la contradiction — tu ne retires pas sa validation sur la foi d'une lentille, et tu ne la laisses pas debout en silence.

En mode `preparation`, intègre-les aux guides d'entretien concernés : c'est ce pour quoi le council a tourné à ce moment-là.

### 5. Tracer le passage du council

Ajoute une entrée dans `council_runs` de `state.yaml` : date, mode, lentilles utilisées, le nombre de questions renvoyées par les lentilles, et **les questions elles-mêmes** — retenues, écartées avec leur raison, et celles mises en réserve pour un prochain council. Le compte mesure l'utilité du council ; les questions permettent de la vérifier. Trois compteurs ne se relisent pas : « 40 proposées, 39 écartées » ne dit pas si c'étaient des doublons, des solutions déguisées, ou de bonnes questions mal arbitrées, et les écartées disparaissent avec la session.
