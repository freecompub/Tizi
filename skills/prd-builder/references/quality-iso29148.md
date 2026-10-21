# Grille de qualité des exigences (ISO/IEC/IEEE 29148)

Cette grille prépare le **contrôle formel** prévu en phase 2 du SDLC. Pendant la construction, elle sert d'auto-relecture : tu peux t'en servir pour expliquer pourquoi une formulation pose problème, jamais pour bloquer.

Les caractéristiques viennent de la norme ISO/IEC/IEEE 29148 (citée, non reproduite) ; leurs définitions et l'échelle ci-dessous sont reformulées ici. L'idée d'une note de 0 à 3 avec quatre caractéristiques bloquantes est reprise de hve-core (relecteur qualité de son BRD Builder).

## Deux natures de contrôle

Une partie de la qualité se **vérifie mécaniquement** : c'est le catalogue déterministe de `lib/rules.mjs`, exécuté par `lint.mjs`. L'autre partie demande du **jugement** : c'est l'objet de cette grille. Le contrôle formel exécutera d'abord le catalogue, puis la grille sur ce que le catalogue ne peut pas trancher.

Le jugement par un modèle de langage a un biais connu : il tend à valider ce qu'il a lui-même produit. Le contrôle formel confiera donc la grille à un **autre** modèle que celui qui a rédigé, ou à une relecture humaine, et gardera la trace du correcteur.

## Les neuf caractéristiques d'une exigence

| Caractéristique | Question | Ce que le catalogue déterministe vérifie déjà | Ce qui reste au jugement |
|---|---|---|---|
| **Nécessaire** | Retirer l'exigence créerait-il un manque pour une partie prenante ? | Rattachement à un objectif et à un besoin sourcé (S02, S03, S06) | Le besoin est-il réel, ou l'exigence est-elle de confort ? |
| **Appropriée** | Est-elle au bon niveau d'abstraction pour ce document ? | Mots de solution dans le BRD (L06), d'implémentation dans le PRD (L07) | Fuites de conception plus subtiles |
| **Non ambiguë** | N'a-t-elle qu'une seule lecture ? | Termes vagues (L01), énumérations ouvertes (L02), pronoms (L04) | Termes métier non définis au glossaire, double lecture |
| **Complète** | Dit-elle tout ce qu'il faut pour être comprise seule ? | Champs obligatoires (S04, S05, S08) | Conditions, exceptions, acteurs manquants |
| **Unitaire** | Énonce-t-elle une seule chose ? | Conjonctions (L03) | Plusieurs comportements sans conjonction visible |
| **Faisable** | Est-elle réalisable dans les contraintes connues ? | — | Coût, technique, délai, au regard des contraintes |
| **Vérifiable** | Peut-on prouver qu'elle est satisfaite ? | Critère d'acceptation présent (S04), NFR mesurable (S08) | Le critère prouve-t-il vraiment l'exigence ? |
| **Correcte** | Traduit-elle fidèlement la source ? | Source citée avec son emplacement | Fidélité au verbatim, absence de déformation |
| **Conforme** | Respecte-t-elle les conventions du document ? | Forme normative (L08), EARS dans le PRD | Respect du modèle de rédaction retenu |

## Échelle

| Note | Signification |
|---|---|
| 0 | Absente : la caractéristique n'est pas traitée ou ne peut pas être évaluée |
| 1 | Implicite : il faut deviner ou interpréter |
| 2 | Explicite : suffisant pour l'étape suivante (conception, test) |
| 3 | Tracée : explicite, et étayée par une source, un critère ou un lien dans l'état |

## Seuils prévus pour le contrôle formel

- **Bloquant** : une note inférieure à 2 sur l'une des quatre caractéristiques **nécessaire, non ambiguë, unitaire, vérifiable**.
- **Signalé** : une note inférieure à 2 sur les cinq autres.
- Une note est toujours accompagnée d'une justification d'une phrase qui cite le passage en cause.

## Caractéristiques de l'ensemble

Au-delà de chaque exigence, l'ensemble est examiné : **complet** (rien ne manque au regard des objectifs et des sources), **cohérent** (pas de contradiction entre exigences), **faisable** dans son ensemble, **compréhensible** par ses lecteurs, **validable** (on pourra montrer qu'il répond au besoin). Les métriques de couverture (`coverage`) en mesurent la part mécanique.

## Vérification adversariale des constats bloquants

Avant qu'un constat bloque, le contrôle formel le soumettra à une tentative de réfutation, comme le fait la revue de code d'`impl-builder` (`finding-verifier`) : chercher les preuves qui le contredisent autant que celles qui le confirment, puis conclure confirmé, réfuté ou rétrogradé. Un constat réfuté est écarté avec sa preuve contraire ; un doute non levé laisse le constat en place. Aucun score de confiance n'accompagne une note ni un constat : seules comptent les citations et les manques de preuve nommés.
