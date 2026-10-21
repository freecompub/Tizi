# Brownfield léger

Un système existe déjà. La conception doit composer avec lui. Cette version traite trois choses : l'**inventaire** fondé sur des preuves, les **deux états** du modèle, les **contraintes héritées** et la dette. Elle ne produit pas de plan de migration détaillé (ordre de remplacement, coexistence, migration des données) : ces sujets sont signalés comme zones d'ombre ou risques pour la planification.

## Inventaire

1. **Périmètre** : on n'inventorie que ce qui borde le changement (`existing.scope`) : les éléments que les FR touchent, ceux avec qui ils échangent, les données concernées.
2. **Preuves** : chaque élément et chaque relation de l'existant cite au moins une source `SRC-xxx` (dépôt, commit, chemin). Sont des preuves : code, configuration, manifeste de déploiement, infrastructure as code, schéma de base, contrat publié, documentation à jour. Le nom d'un dossier ou la parole d'une personne ne suffisent pas : ce sont des hypothèses.
3. **Pas d'inférence** : on ne déduit ni topologie de déploiement, ni nombre d'instances, ni protocole que les sources n'établissent pas. Une zone `existant_non_prouve` vaut mieux qu'un diagramme faux.
4. **Lecture du code** : depuis l'agent (Claude Code ou GitHub Copilot), qui a accès au dépôt, lis les points d'entrée (routes, gestionnaires, consommateurs de messages), les clients sortants (appels HTTP, SDK), la configuration (URL, chaînes de connexion, variables d'environnement) et les manifestes. Note pour chaque fait le chemin du fichier.

## Deux états

| `lifecycle` | Vue actuelle | Vue cible |
|---|---|---|
| `existant_conservé` | oui | oui |
| `existant_modifié` | oui | oui, signalé |
| `existant_remplacé` | oui | non ; `replaced_by` désigne le remplaçant |
| `existant_retiré` | oui | non |
| `nouveau` | non | oui, signalé |

Toute transition autre que `existant_conservé` est justifiée par un ADR (conserver, envelopper, remplacer ou retirer).

## Contraintes héritées et dette

- **Contrainte héritée** (`constraints`, `origin: existant`) : un contrat consommé par d'autres, un schéma en production, une plateforme ou une version imposée, une intégration qu'on ne peut pas couper. Elle a une preuve.
- **Dette technique** (`DT-xx`) : seulement celle qui pèse sur le changement (elle rend une FR plus coûteuse, une NFR plus difficile, une menace plus probable). On ne fait pas l'audit complet du système.

## Ce qui part vers la planification

Le handoff liste les éléments modifiés, remplacés et retirés, les contrats existants touchés et la dette concernée. Les questions de transition non traitées (coexistence, bascule, reprise des données) y figurent comme zones d'ombre assumées ou risques.
