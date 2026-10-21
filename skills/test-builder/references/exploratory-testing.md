# Tests exploratoires

Les tests automatisés vérifient ce qu'on a pensé à vérifier. Les sessions exploratoires cherchent ce à quoi personne n'a pensé : un testeur apprend le produit, conçoit et exécute ses tests en même temps, guidé par une **charte** et borné dans le temps. (Approche de session de James et Jon Bach ; forme de charte d'Elisabeth Hendrickson, *Explore It!* — reformulées.)

## La charte

> Explorer **X** avec **Y** pour découvrir **Z**.

- **X** : la cible (une fonctionnalité, un parcours, une frontière entre composants) ;
- **Y** : les ressources (données particulières, rôles, appareils, conditions réseau, outils) ;
- **Z** : l'information recherchée (un type de risque).

Exemple : explorer la transmission des dossiers avec des connexions coupées en cours d'envoi pour découvrir les pertes ou doublons de dossiers.

## D'où viennent les chartes

Tu proposes des chartes à partir des risques déjà connus en amont, ce qui évite d'explorer au hasard :
- les **menaces** de la conception, surtout celles acceptées ou atténuées par des mesures complexes ;
- les **zones d'ombre assumées** et les **hypothèses** du BRD, du PRD et de la conception ;
- les éléments **nouveaux** ou **modifiés** en brownfield ;
- les parties du produit que la release touche et qu'aucun test de bout en bout ne couvre ;
- les constats des revues de sprint.

## Déroulé d'une session

1. Durée fixée (45 à 90 minutes), une charte, un testeur (ou une paire).
2. Prises de notes pendant la session : ce qui a été essayé, ce qui a surpris, les questions.
3. Débriefing court : constats classés `bloquant`, `majeur`, `mineur` ; ce qui n'a pas pu être exploré devient une nouvelle charte.
4. Chaque constat devient une story (souvent en voie rapide) dans `plan-builder`, ou une question pour le PRD.

Enregistre la session dans `exploratory` uniquement d'après ce que le testeur rapporte. Un constat `bloquant` ouvert ferme la porte de release.
