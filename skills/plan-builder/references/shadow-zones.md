# Zones d'ombre de la planification

Trois fins possibles, et la troisième est née le 7 novembre 2026 : `levée` (avec sa source), `assumée`
(avec sa raison ; elle devient une hypothèse ou un risque), ou **`sans_objet`** (avec la raison pour
laquelle la question ne se posait pas).

Les deux dernières se confondaient : une question hors sujet se fermait en `levée`, ce qui est un abus de
langage — « on a trouvé la réponse » et « la question ne se posait pas » ne sont pas la même chose. Les
confondre rendait la mesure du council illisible : on ne pouvait plus compter combien de ses questions
étaient hors sujet, et c'est précisément ce qui dit s'il vaut le coup. `sans_objet` n'est pas un échec du
council — une question écartée après examen a fait son travail, celui d'être posée — mais c'est une
**affirmation sur le monde**, et `S136` en réclame la raison : sans elle, le statut deviendrait la sortie
commode de toute question gênante.

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

## Bloquante, ou pas

Une zone d'ombre est **bloquante** si elle empêche l'étape suivante de **commencer** — pas si elle la rend moins sûre. Le test est concret : nomme l'étape, et dis ce qui s'y ferait de faux si on la menait sans l'avoir levée. Si tu ne peux pas le dire, elle n'est pas bloquante : elle est importante, et son type suffit à la faire remonter, puisque `ask-five.mjs` classe par ce que la zone coûte.

Le critère a été resserré après deux dossiers réels. « On ne peut pas formuler correctement les objectifs sans la lever » est vrai par construction au début d'une phase : **18 bloquantes sur 25**. Sur le dossier suivant, où aucune consigne ne définissait le mot, **0 sur 21**. Un drapeau qui vaut tout ou rien ne classe rien — il est donc sorti du score, et ne sert plus qu'à une chose, sérieuse : **une bloquante ouverte interdit la sortie de phase**.
