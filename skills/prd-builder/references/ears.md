# EARS et Gherkin

## EARS — énoncé des exigences fonctionnelles

EARS (Easy Approach to Requirements Syntax, Mavin et al.) fixe l'ordre des clauses pour qu'une exigence soit lue sans ambiguïté. « Le système » désigne le produit spécifié.

| Motif (`pattern`) | Forme | Usage |
|---|---|---|
| `ubiquitous` | Le système doit `<réponse>`. | Invariant toujours vrai |
| `event` | Quand `<événement>`, le système doit `<réponse>`. | Réaction à un déclencheur |
| `state` | Tant que `<état>`, le système doit `<réponse>`. | Comportement lié à un mode ou un état |
| `unwanted` | Si `<condition indésirable>`, alors le système doit `<réponse>`. | Erreurs, saisies invalides, violations de règle |
| `optional` | Là où `<option activée>`, le système doit `<réponse>`. | Comportement dépendant d'une option ou d'une configuration |

Les motifs se combinent : « Tant que le dossier est en brouillon, quand l'agent ajoute une pièce, le système doit… ».

**Règles**
- Une seule réponse par exigence.
- La réponse est observable par un utilisateur ou un système externe.
- Pas de terme vague : « rapidement », « facilement », « de manière intuitive », « si possible », « etc. ».
- Pas d'implémentation : ni technologie, ni composant, ni structure de données.

**Exemples**
- À éviter : « Le système doit gérer les dossiers incomplets. » (vague)
- Mieux : « Si un dossier est transmis sans l'une des pièces obligatoires, alors le système doit refuser la transmission et indiquer les pièces manquantes. »

## Gherkin — critères d'acceptation

Chaque critère (`AC-xxx`) est un scénario :

```gherkin
Scénario: Transmission refusée faute de justificatif
  Étant donné un dossier auquel il manque le justificatif de domicile
  Quand l'agent demande la transmission du dossier
  Alors la transmission est refusée
  Et l'agent voit que le justificatif de domicile est manquant
```

**Règles**
- Un comportement par scénario ; plusieurs scénarios par FR si nécessaire.
- Données concrètes, pas génériques.
- « Alors » décrit un résultat observable, jamais un état interne.
- Les FR Must ont au moins un scénario nominal et un scénario d'erreur.
