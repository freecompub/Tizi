# Phase Execute

**But** : exécuter, collecter, mesurer, sur une version candidate identifiée (`candidate`).

1. Les suites automatisées tournent en CI sur la version candidate ; récupère leurs rapports aux chemins de `settings.reports`. Ne mélange jamais des rapports de versions différentes.
2. Les mesures non fonctionnelles qui ne produisent pas de rapport de tests (charge, endurance) sont saisies dans `nfr_results`, avec la mesure, la cible, le verdict et le chemin de la preuve, d'après ce que l'utilisateur rapporte.
3. Les sessions exploratoires sont menées par des humains ; enregistre leurs constats d'après leur débriefing.
4. Chaque défaut trouvé est porté dans `plan-builder` (story, souvent en voie rapide) ; un défaut corrigé produit une nouvelle version candidate, et la collecte recommence pour les suites concernées.
