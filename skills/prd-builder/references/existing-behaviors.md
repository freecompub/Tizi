# Comportements existants à préserver

Sur un produit déjà en service, le plus grand risque d'un changement n'est souvent pas ce qu'il ajoute, mais ce qu'il casse sans que personne ne l'ait écrit nulle part : un comportement sur lequel des utilisateurs, une intégration ou une obligation reposent. Le PRD d'un changement sur un produit existant (`existing_product: true`) les rend explicites.

## Ce qu'on retient

Seulement les comportements **que le changement pourrait affecter** : ceux du parcours modifié, des données touchées, des contrats consommés par d'autres. On ne documente pas tout le produit.

Pour chaque comportement (`PB-xx`) :

- **le comportement**, observable, de préférence en EARS (« quand un dossier est transmis, le système doit envoyer l'accusé au partenaire dans les cinq minutes ») ;
- **pourquoi il compte** : qui en dépend ;
- **la preuve** qu'il existe vraiment : code, test existant, documentation, observation (`SRC-xxx`). Un comportement supposé sans preuve est une hypothèse, à vérifier avant d'en faire une exigence ;
- **le test** qui le vérifie aujourd'hui, ou « à écrire ».

## Où ils vont ensuite

- Un comportement dont le test est « à écrire » devient, à l'implémentation, un **test de caractérisation** écrit avant toute modification du code concerné (`impl-builder`).
- À la vérification de la release, chaque `PB-xx` doit être prouvé par un test qui porte son identifiant et qui passe, comme une exigence (`test-builder`).

## Comment les trouver

Avec l'utilisateur et le code : parcourir le parcours modifié tel qu'il marche aujourd'hui ; lire les tests existants de la zone ; chercher les consommateurs des contrats touchés ; demander « qui se plaindrait si ceci changeait ? ». La vérification de forme signale un produit existant sans comportement à préserver, et un comportement sans preuve (S73).
