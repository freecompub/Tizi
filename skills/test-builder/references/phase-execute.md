# Phase Execute

**But** : exécuter, collecter, mesurer, sur une version candidate identifiée (`candidate`).

1. Les suites automatisées tournent **en CI, sur le commit de la version candidate** : le workflow `tizi-preuves.yml` (généré par `install.mjs --ci`) lance `ci-run-suites.mjs`, qui exécute les suites de `impl/config.yaml`, regroupe leurs rapports et écrit un **manifeste de provenance** (commit, passage, déclenchement, empreinte de chaque rapport), publiés dans l'artefact `tizi-preuves`.
   Puis lance `node <chemin-du-skill>/scripts/ci-fetch.mjs qa/<slug>/state.yaml --appliquer` : il cherche, en lecture seule, le passage sur le commit exact de la version candidate, vérifie qu'il a réussi en entier, télécharge l'artefact, contrôle le manifeste et les empreintes, et reporte les chemins des rapports dans `settings.reports`. Un passage de **pull request** n'est pas retenu : il teste un commit de fusion temporaire, pas le commit candidat.
2. Les mesures non fonctionnelles qui ne produisent pas de rapport de tests (charge, endurance) sont saisies dans `nfr_results`, avec la mesure, la cible, le verdict et le chemin de la preuve, d'après ce que l'utilisateur rapporte.
3. Les sessions exploratoires sont menées par des humains ; enregistre leurs constats d'après leur débriefing.
4. Chaque défaut trouvé est porté dans `plan-builder` (story, souvent en voie rapide) ; un défaut corrigé produit une nouvelle version candidate, et la collecte recommence pour les suites concernées.
