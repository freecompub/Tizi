# Council de lentilles

**But** : faire apparaître des zones d'ombre que l'utilisateur et toi ne voyez pas depuis votre point de vue, en examinant l'initiative à travers plusieurs lentilles indépendantes.

## Règles non négociables

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
1. **Fusionne** les doublons (même question vue par plusieurs lentilles : garde-la une fois, note toutes les lentilles d'origine — c'est un signal de priorité).
2. **Écarte** ce qui est déjà couvert par une source ou une zone d'ombre existante, ce qui est une solution ou un besoin déguisé en question, et ce qui sort du périmètre confirmé.
3. **Classe** chaque question restante dans un type de la typologie (`phase-discover.md`, section 0).
4. **Priorise** : bloquantes d'abord, puis par nombre de lentilles d'origine.
5. **Limite** la présentation à 10 questions au maximum ; indique combien ont été écartées et pourquoi, en une ligne.

### 4. Faire choisir l'utilisateur

Présente les questions regroupées par type, avec pour chacune : la lentille d'origine, qui peut y répondre, l'action proposée. L'utilisateur retient, reformule ou rejette.

Enregistre les questions retenues comme zones d'ombre avec `origin: council:<lentille>`. En mode `preparation`, propose de les intégrer aux guides d'entretien concernés.

### 5. Tracer le passage du council

Ajoute une entrée dans `council_runs` de `state.yaml` : date, mode, lentilles utilisées, nombre de questions proposées, écartées à l'arbitrage, retenues par l'utilisateur. Ces chiffres servent à mesurer l'utilité réelle du council.
