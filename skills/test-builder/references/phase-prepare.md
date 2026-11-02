# Phase Prepare

**But** : décider, avant d'exécuter, ce qu'il faut prouver pour cette release et comment.

1. **Exigences à prouver.** Lance `release-matrix.mjs` une première fois : il liste depuis le plan figé les exemples (`EX`) et critères (`AC`) des stories de la release, les vérifications de NFR prévues en tests (`NR`), les mesures de sécurité planifiées (`TH`) et les parcours critiques (`PJ`). Ce sont les lignes de la matrice.
2. **Parcours critiques.** Fais choisir les parcours du PRD à couvrir de bout en bout (`settings.critical_journeys`) : ceux dont l'échec coûterait le plus, et le walking skeleton. Peu, pas tous.
3. **Chartes exploratoires.** Propose des chartes à partir des risques (`references/exploratory-testing.md`) ; l'équipe choisit et les attribue.
4. **Non fonctionnel.** Pour chaque vérification de NFR, fixe l'outil, l'environnement, les données et le seuil (repris de la conception). Pour le multi-navigateurs et multi-langues, branche les campagnes existantes (par exemple `qa-domain-runner`) et leurs rapports.
5. **Environnements.** Renseigne `environments` — un identifiant, un nom, l'URL et le **jeu de données** par environnement. C'est le catalogue que chaque mesure de NFR désigne : `record-nfr.mjs` refuse une mesure qui ne dit pas où elle a été prise, parce qu'un seuil ne se compare qu'à environnement et données nommés.
6. **Rapports.** Renseigne `settings.reports` : où chaque suite dépose son rapport pour la version candidate (`ci-fetch.mjs` les collecte, `freeze-evidence.mjs` les fige).

---

## Fin de la phase

`phase` dit où en est la vérification : `prepare`, `execute`, `prove`. Le champ a longtemps manqué, et ces trois fichiers décrivaient un parcours que rien ne situait.

**Propose** le passage à Execute, sans le décider, quand :

- les parcours critiques sont choisis (`settings.critical_journeys`) : ceux dont l'échec coûterait le plus, et le walking skeleton ;
- chaque session exploratoire prévue a une charte ;
- les environnements de mesure sont déclarés (`environments`) : un seuil ne se compare qu'à environnement et données nommés ;
- `settings.reports` dit où chaque suite dépose son rapport.

Lance `status.mjs` : il compte les conditions de cette porte qui **se calculent**, et nomme ce qui manque — identifiants compris. Celles qui se jugent n'y sont pas, et le compte dit « n tenues sur m mesurées » : ce n'est pas « la porte est franchie ». Présente-le, liste ce qui manque — puis **pose la question dans tous les cas**, avec l'outil : passer la phase, ou s'arrêter là. S'il manque des conditions, les deux options sont « s'arrêter là » et « continuer sur ce qui manque », jamais « passer la porte » (`references/questions.md`). Si l'utilisateur accepte, passe `phase: execute`.

**Et le passage lui-même s'écrit.** Dès que l'utilisateur a tranché, ajoute l'entrée à `phase_log` : la phase qui se clôt, celle qui s'ouvre, la date, qui a décidé, l'état de la porte tel que `status.mjs` l'a dit, et chaque condition franchie par dérogation avec sa raison. Sans cette entrée, `status.mjs` affiche « passage sans trace », et le parcours de la vérification ne se relit nulle part.
