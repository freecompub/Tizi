# Modèle C4

Les notions de niveaux (contexte, conteneurs, composants) viennent du [modèle C4](https://c4model.com/) de Simon Brown, sous licence CC BY 4.0 ; elles sont reformulées ici. Les règles de rendu sont celles de `render-sad.mjs`.

## Un modèle, des vues générées

Le modèle vit dans `state.yaml` (`elements`, `relations`). Les diagrammes ne sont jamais écrits à la main : `render-sad.mjs` les génère en Mermaid (`flowchart`, conventions C4), ce qui garantit qu'un élément porte le même nom à tous les niveaux.

| Niveau | Montre | Généré |
|---|---|---|
| 1. Contexte | Le système, ses utilisateurs, les systèmes externes | Toujours |
| 2. Conteneurs | Les unités déployables ou exécutables d'un système interne | Pour chaque système interne qui a des conteneurs |
| 3. Composants | Les blocs principaux d'un conteneur | Pour chaque conteneur qui a des composants |

En brownfield, chaque niveau est généré deux fois : **actuel** (éléments `existant_*`) et **cible** (tout sauf `existant_retiré`). Dans la vue cible, les éléments nouveaux sont en trait épais, les éléments modifiés ou remplaçants en pointillé coloré.

## Types d'éléments

| `kind` | Définition | `parent` |
|---|---|---|
| `person` | Un rôle humain, rattaché à un persona du PRD. En brownfield, sans cycle de vie explicite, il est considéré comme existant | — |
| `system` | Le produit (interne) ou un système avec lequel il échange (`external: true`) | — |
| `container` | Une unité qui s'exécute ou stocke des données séparément : application web, API, worker, base, file | un système interne |
| `component` | Un regroupement de responsabilités dans un conteneur | un conteneur |

**Interne ou externe.** Un service ou une base est interne (un conteneur) seulement si l'équipe en possède ou en déploie le code ou le schéma et l'exploite. Un service qu'on appelle sans le posséder est un système externe, même s'il stocke nos données.

## Relations

- Une relation part de l'**initiateur** et pointe vers la **dépendance** : qui appelle qui, qui consomme quoi.
- La technologie (`technology`) n'est renseignée que si elle est décidée (ADR) ou prouvée (existant).
- Une relation entre deux éléments de niveaux différents est remontée automatiquement dans les vues de plus haut niveau : on ne la duplique pas.
- En vue actuelle, une relation n'existe que si une preuve l'établit (code, configuration, document) : un nom ou une appartenance au même conteneur ne prouve aucune interaction.

## Nommer

- Le nom d'un élément est celui que l'existant ou le métier emploie déjà ; pas de synonyme ni d'abréviation.
- Deux éléments ne portent jamais le même nom (`lint.mjs`, règle S33).
- La description dit la responsabilité en une phrase, pas la technologie.
