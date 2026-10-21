# Zones d'ombre de la planification

| `type` | Signal typique | Action pour la lever |
|---|---|---|
| `question_story` | Carte rouge d'un example mapping | Réponse de la personne désignée ; la story reste non prête |
| `fr_sans_story` | FR de la release couverte par aucune story | Nouvelle story, ou question au product owner |
| `regle_absente_amont` | Une règle apparue en séance n'existe ni dans le BRD ni dans le PRD | Demande de changement au BRD ou au PRD |
| `mesure_non_planifiee` | Mesure de sécurité ou vérification de NFR sans tâche | Nouvelle tâche, ou report justifié |
| `dependance_externe` | Une tâche attend une autre équipe ou un tiers | Contact du responsable, date d'engagement |
| `capacite_inconnue` | L'équipe n'a pas fixé sa capacité ou sa limite d'encours | Question à l'équipe |
| `conflit_amont` | Le plan révèle une incohérence du PRD ou de la conception | Demande de changement |

Une zone d'ombre se termine `levée` (réponse sourcée) ou `assumée` (raison). Une zone `question_story` ne peut pas être assumée : la story reste non prête tant que la question n'a pas de réponse, ou elle est découpée pour isoler la partie incertaine.
