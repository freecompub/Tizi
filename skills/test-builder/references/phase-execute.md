# Phase Execute

**But** : exécuter, collecter, mesurer, sur une version candidate identifiée (`candidate`).

1. Les suites automatisées tournent **en CI, sur le commit de la version candidate** : le workflow `tizi-preuves.yml` (généré par `install.mjs --ci`) lance `ci-run-suites.mjs --lancer`, qui exécute les suites de `impl/config.yaml`, regroupe leurs rapports et écrit un **manifeste de provenance** (commit, passage, déclenchement, empreinte de chaque rapport), publiés dans l'artefact `tizi-preuves`. L'intention est déclarée : `--lancer` exécute les commandes des suites, `--sans-lancer` se contente de regrouper les rapports déjà présents. Sans l'un des deux, le script refuse : exécuter des commandes de shell venues d'un fichier du dépôt ne peut pas être un comportement par défaut.
   Puis lance `node <chemin-du-skill>/scripts/ci-fetch.mjs qa/<slug>/state.yaml --appliquer` : il cherche, en lecture seule, le passage sur le commit exact de la version candidate, vérifie qu'il a réussi en entier, télécharge l'artefact, contrôle le manifeste et les empreintes, et reporte les chemins des rapports dans `settings.reports`. Un passage de **pull request** n'est pas retenu : il teste un commit de fusion temporaire, pas le commit candidat.
2. Une mesure non fonctionnelle que la CI peut produire passe par elle, comme les autres rapports. Celle qui ne le peut pas (charge sur un environnement dédié, endurance) s'enregistre avec `record-nfr.mjs` : mesure, cible, verdict, rapport, **commit mesuré** et auteur, d'après ce que l'utilisateur rapporte. L'empreinte du rapport est relevée ; la porte vérifie que le commit est celui de la version candidate et que le rapport n'a pas changé.
3. Les sessions exploratoires sont menées par des humains ; enregistre leurs constats d'après leur débriefing.
4. Chaque défaut trouvé est porté dans `plan-builder` (story, souvent en voie rapide) ; un défaut corrigé produit une nouvelle version candidate, et la collecte recommence pour les suites concernées.

---

## Fin de la phase

**Propose** le passage à Prove, sans le décider, quand :

- la version candidate est identifiée (`candidate`, et son commit) ;
- les rapports des suites sont rattachés (`ci-fetch.mjs --appliquer`) ;
- chaque mesure de NFR dit sur quel environnement elle a été prise ;
- chaque session exploratoire menée a laissé son relevé.

Lance `status.mjs` : il compte les conditions de cette porte qui **se calculent**, et nomme ce qui manque — identifiants compris. Celles qui se jugent n'y sont pas, et le compte dit « n tenues sur m mesurées » : ce n'est pas « la porte est franchie ». Présente-le, liste ce qui manque — puis **pose la question dans tous les cas**, avec l'outil : passer la phase, ou s'arrêter là. S'il manque des conditions, les deux options sont « s'arrêter là » et « continuer sur ce qui manque », jamais « passer la porte » (`references/questions.md`). Si l'utilisateur accepte, passe `phase: prove`.

Une version candidate corrigée ramène en Execute : c'est un passage en arrière, et il s'écrit dans `phase_log` comme les autres, avec `kind: porte` — sinon la collecte reprend sans que rien ne dise pourquoi.

**Et le passage lui-même s'écrit.** Dès que l'utilisateur a tranché, ajoute l'entrée à `phase_log` : la phase qui se clôt, celle qui s'ouvre, la date, qui a décidé, l'état de la porte tel que `status.mjs` l'a dit, et chaque condition franchie par dérogation avec sa raison. Sans cette entrée, `status.mjs` affiche « passage sans trace », et le parcours de la vérification ne se relit nulle part.
