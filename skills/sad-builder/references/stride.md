# Modèle de menaces (STRIDE)

STRIDE est la classification de menaces de Microsoft (Kohnfelder et Garg, 1999). On l'applique sur le modèle C4 : les relations sont les flux de données, les conteneurs sont les processus et les stockages.

## Les six catégories

| Lettre | Menace | Propriété violée | Question type |
|---|---|---|---|
| S | Usurpation d'identité | Authentification | Quelqu'un peut-il se faire passer pour un utilisateur ou un service ? |
| T | Altération | Intégrité | Une donnée peut-elle être modifiée en transit ou au repos ? |
| R | Répudiation | Non-répudiation | Une action peut-elle être niée faute de trace ? |
| I | Divulgation | Confidentialité | Une donnée peut-elle être lue par qui ne devrait pas ? |
| D | Déni de service | Disponibilité | Le service peut-il être rendu indisponible ? |
| E | Élévation de privilèges | Autorisation | Un acteur peut-il obtenir plus de droits qu'il n'en a ? |

## Démarche

1. **Frontières de confiance** (`TB-xx`) : regroupe les éléments qui se font confiance (même zone réseau, même identité). Internet, un réseau partenaire, un appareil mobile sont des zones distinctes.
2. **Où chercher** : toute relation qui franchit une frontière ; tout conteneur qui stocke une donnée `personnelle` ou `sante` ; tout point d'entrée exposé à une personne.
3. **Passer les six catégories** sur chaque cible ; n'enregistre que les menaces plausibles, avec une description concrète (qui, comment, quoi).
4. **Coter** : vraisemblance (faible, moyenne, forte) et impact (faible, moyen, fort). Le SAD trie les menaces par niveau.
5. **Traiter** :
   - `attenuer` : les mesures, rattachées aux éléments qui les portent ;
   - `eviter` : changer la conception, donc un ADR ;
   - `transferer` : à un tiers (assurance, fournisseur), avec le contrat qui le prévoit ;
   - `accepter` : uniquement avec le décideur `acceptation_risque_securite`, déclaré par l'utilisateur.
6. Une mesure qui se voit (verrouillage, double authentification, journal consultable) change le comportement du produit : demande de changement au PRD.

## Données sensibles

Pour une donnée `personnelle` ou `sante`, la catégorie **I** sur son stockage et sur chaque flux qui la transporte est toujours examinée (`lint.mjs`, règle S31). Les obligations propres au secteur (hébergement de données de santé, conservation, droit à l'effacement) sont des contraintes : si elles ne sont pas dans le PRD, c'est une zone `conflit_amont`.
