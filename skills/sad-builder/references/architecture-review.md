# Grille de revue d'architecture

La revue d'architecture de la phase Govern suit une grille par **piliers**, à la manière du Microsoft Azure Well-Architected Framework (cinq piliers : fiabilité, sécurité, optimisation des coûts, excellence opérationnelle, efficacité des performances), cité ici et non reproduit. AWS ajoute un sixième pilier, la durabilité, utilisable si le projet le demande.

La grille ne remplace pas le jugement des relecteurs : elle garantit que chaque pilier est examiné, et que la conclusion repose sur des éléments de l'état.

## Preuves rassemblées automatiquement

`review-pack.mjs` prépare, pour chaque pilier, ce que l'état contient déjà : les moteurs du pilier, les ADR qui les servent, les réponses aux NFR et leurs vérifications, les menaces, les zones d'ombre ouvertes.

| Pilier | Types de moteurs rattachés | Autres preuves |
|---|---|---|
| Fiabilité | `disponibilite` | Réponses aux NFR de disponibilité, vérifications `test_restauration`, `test_endurance` ; menaces D |
| Sécurité | `securite`, `conformite` | Menaces et traitements, frontières de confiance, données `personnelle` et `sante` |
| Optimisation des coûts | `cout` | ADR dont une option est « acheter » ou « réutiliser » ; services facturés à l'usage cités en conséquence négative |
| Excellence opérationnelle | `observabilite`, `maintenabilite`, `evolutivite` | Vérifications à l'étape `exploitation`, moyens de confirmation des ADR, dette technique |
| Efficacité des performances | `performance`, `scalabilite` | Vérifications `test_charge`, tactiques retenues |

Les moteurs `interoperabilite` et `utilisabilite` sont présentés à part.

## Questions par pilier

**Fiabilité** — Que se passe-t-il quand chaque dépendance externe tombe ? Le mode dégradé est-il un scénario de qualité ? Les données se restaurent-elles, et cela a-t-il été prévu en vérification ?

**Sécurité** — Chaque flux qui franchit une frontière de confiance a-t-il été examiné ? Les menaces acceptées ont-elles un décideur ? Les données sensibles ont-elles un propriétaire unique, une conservation et une menace de divulgation examinée ?

**Optimisation des coûts** — Le coût d'exploitation de chaque option a-t-il pesé dans les ADR ? Un service facturé à l'usage a-t-il un plafond ? L'option « ne rien changer » a-t-elle été chiffrée ?

**Excellence opérationnelle** — Comment déploie-t-on et revient-on en arrière ? Les journaux, métriques et traces nécessaires au support sont-ils prévus ? Chaque ADR a-t-il un moyen de confirmation applicable ?

**Efficacité des performances** — Chaque cible de performance a-t-elle une tactique et une vérification ? Le comportement en pic est-il un scénario ?

## Enregistrer la revue

Le résultat par pilier est enregistré dans `architecture_review` (appréciation `satisfaisant`, `a_ameliorer` ou `risque`, constats, relecteur, date), **uniquement sur déclaration de l'utilisateur**. Un pilier `risque` devient un risque (`R-xx`) ou une zone d'ombre suivie, comme une réserve d'approbation.
