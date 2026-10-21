# Modélisation du domaine

Le découpage technique suit le découpage du domaine. Cette référence reformule les notions de Domain-Driven Design (Eric Evans, 2003) et de l'Event Storming (Alberto Brandolini), sans en reproduire le texte.

## Event Storming de niveau conception

L'atelier du BRD était en vue d'ensemble (« Big Picture ») : il racontait le processus. Celui-ci le prolonge pour décider où vivent les règles.

| Élément | Question |
|---|---|
| Événement métier (au passé) | Qu'est-ce qui s'est produit et intéresse le métier ? |
| Commande | Quelle intention a déclenché l'événement ? |
| Acteur | Qui émet la commande ? |
| Politique | « Quand tel événement, alors telle commande » : quelle réaction automatique ? |
| Modèle de lecture | Quelle information l'acteur consulte-t-il pour décider ? |
| Agrégat | Quel ensemble de données doit rester cohérent pour accepter ou refuser la commande ? |

Brief avant l'atelier : objectif, périmètre (les parcours du MVP d'abord), participants (développeurs et experts métier dans la même pièce), durée (3 h par défaut). Après l'atelier, le compte rendu est une source.

## Contextes délimités

Un contexte délimité est la zone où un modèle et son vocabulaire ont un sens unique. Indices de frontière :
- un même mot change de sens (« dossier » pour l'accueil, « dossier » pour la facturation) ;
- des équipes ou des responsables métier différents ;
- des rythmes de changement différents ;
- des règles métier qui ne se croisent pas.

Pour chaque contexte : une responsabilité en une phrase, ses termes, ses agrégats.

## Agrégats et règles métier

Une règle métier automatisée (venue du BRD, décidée dans le PRD) est garantie par **un** agrégat : c'est lui qui refuse la commande qui la violerait. Reporte la règle dans `invariants`. Une règle qui demande la cohérence de deux agrégats à la fois signale soit un agrégat mal découpé, soit une règle à garantir de façon différée (par une politique) : c'est une décision à documenter.

## Carte des contextes

| `pattern` | Relation |
|---|---|
| `partnership` | Deux contextes évoluent ensemble, de concert |
| `shared_kernel` | Une petite partie du modèle est partagée et co-maintenue |
| `customer_supplier` | L'amont tient compte des besoins de l'aval |
| `conformist` | L'aval adopte le modèle de l'amont tel quel |
| `anticorruption_layer` | L'aval traduit le modèle de l'amont pour s'en protéger |
| `open_host_service` | L'amont expose un service pensé pour plusieurs consommateurs |
| `published_language` | Un format d'échange documenté et partagé |
| `separate_ways` | Pas d'intégration |

En brownfield, un système existant mal structuré appelle presque toujours une `anticorruption_layer` du côté du nouveau contexte.
