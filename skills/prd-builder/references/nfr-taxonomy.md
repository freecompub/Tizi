# Taxonomie des exigences non fonctionnelles

Catégories inspirées de l'ISO/IEC 25010 (qualité produit), complétées par l'exploitabilité et l'observabilité. Le BRD utilise la même base, ce qui garde la traçabilité cohérente.

| `category` | Question à poser | Exemple de métrique |
|---|---|---|
| `performance` | Combien de temps, combien de volume, quels pics ? | Temps de réponse au 95e centile, débit, volumétrie |
| `fiabilite` | Que tolère-t-on comme indisponibilité ou perte ? | Disponibilité mensuelle, RPO, RTO |
| `securite` | Qui peut faire quoi, que faut-il tracer ? | Authentification requise, journal d'accès conservé N jours |
| `confidentialite` | Quelles données personnelles, quelle durée de conservation ? | Durée de rétention, données minimisées, droit à l'effacement sous N jours |
| `utilisabilite` | Qui doit réussir quoi, en combien de temps ? | Taux de réussite d'une tâche, temps de prise en main |
| `accessibilite` | Quel niveau d'accessibilité ? | Conformité RGAA / WCAG 2.2 niveau AA |
| `compatibilite` | Avec quels systèmes, navigateurs, appareils ? | Liste des plateformes supportées, formats d'échange |
| `maintenabilite` | Quelles évolutions doivent rester simples ? | Délai de modification d'un référentiel métier |
| `portabilite` | Où le produit doit-il pouvoir fonctionner ? | Environnements cibles |
| `exploitabilite` | Comment l'exploite-t-on au quotidien ? | Opérations sans interruption de service, procédures de reprise |
| `observabilite` | Que doit-on pouvoir mesurer et diagnostiquer ? | Événements métier collectés, alertes |
| `internationalisation` | Quelles langues, formats, sens d'écriture ? | Langues supportées, prise en charge du RTL |

Une NFR complète renseigne toujours : `metric`, `target`, `measurement`. Sans cible chiffrée, crée une zone d'ombre `nfr_non_mesurable`.

Les exigences sectorielles (dispositif médical, finance, etc.) s'ajoutent via les profils de conformité du projet ; elles prennent la forme de contraintes (`CON`) quand elles sont imposées, de NFR quand elles fixent un niveau de qualité.

## Contexte d'usage

Issue des contraintes d'environnement du BRD (`type: environnement`) ou de l'observation : conditions réelles dans lesquelles le produit doit fonctionner. Exemples : utilisable d'une main ou avec des gants, lisible en plein soleil, utilisable sans réseau puis synchronisé, tâche réalisable en moins de 30 secondes entre deux interruptions, lisible avec un niveau de lecture donné. Comme toute NFR, elle a une métrique, une cible et un moyen de mesure ; la mesure se fait de préférence **dans l'environnement réel**, pas en laboratoire.
