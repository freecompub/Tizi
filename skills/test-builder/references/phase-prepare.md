# Phase Prepare

**But** : décider, avant d'exécuter, ce qu'il faut prouver pour cette release et comment.

1. **Exigences à prouver.** Lance `release-matrix.mjs` une première fois : il liste depuis le plan figé les exemples (`EX`) et critères (`AC`) des stories de la release, les vérifications de NFR prévues en tests (`NR`), les mesures de sécurité planifiées (`TH`) et les parcours critiques (`PJ`). Ce sont les lignes de la matrice.
2. **Parcours critiques.** Fais choisir les parcours du PRD à couvrir de bout en bout (`settings.critical_journeys`) : ceux dont l'échec coûterait le plus, et le walking skeleton. Peu, pas tous.
3. **Chartes exploratoires.** Propose des chartes à partir des risques (`references/exploratory-testing.md`) ; l'équipe choisit et les attribue.
4. **Non fonctionnel.** Pour chaque vérification de NFR, fixe l'outil, l'environnement, les données et le seuil (repris de la conception). Pour le multi-navigateurs et multi-langues, branche les campagnes existantes (par exemple `qa-domain-runner`) et leurs rapports.
5. **Environnements.** Renseigne `environments` — un identifiant, un nom, l'URL et le **jeu de données** par environnement. C'est le catalogue que chaque mesure de NFR désigne : `record-nfr.mjs` refuse une mesure qui ne dit pas où elle a été prise, parce qu'un seuil ne se compare qu'à environnement et données nommés.
6. **Rapports.** Renseigne `settings.reports` : où chaque suite dépose son rapport pour la version candidate (`ci-fetch.mjs` les collecte, `freeze-evidence.mjs` les fige).
