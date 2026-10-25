# Zones d'ombre de la conception

Même principe que pour le BRD et le PRD : ce qu'on ne sait pas encore et qui pourrait fausser la conception. Chaque zone indique qui peut la lever et se termine `levée` (avec une source ou une décision) ou `assumée` (avec une raison ; elle devient une hypothèse ou un risque).

| `type` | Signal typique | Action pour la lever |
|---|---|---|
| `driver_non_mesurable` | Moteur sans mesure chiffrée | Cible demandée au product owner (elle appartient au PRD) |
| `hypothese_technique` | Une option repose sur une affirmation non prouvée | Spike, mesure, documentation du fournisseur |
| `existant_non_prouve` | Élément ou relation de l'existant supposé sans preuve | Lecture du code, de la configuration, question à l'équipe propriétaire |
| `frontiere_floue` | Contexte, agrégat ou propriétaire d'une donnée incertain | Atelier Event Storming, décision |
| `fr_non_allouee` | FR sans conteneur ni composant | Allocation, ou question sur la FR |
| `nfr_sans_reponse` | NFR sans tactique ni vérification | Proposition de réponse, ADR |
| `contrat_ambigu` | Opération dont le comportement ou les données ne sont pas clairs | Exemple concret, question au consommateur |
| `menace_non_traitee` | Menace identifiée sans traitement décidé | Proposition de mesures, décision d'acceptation |
| `dependance_inconnue` | Système externe dont le contrat, la disponibilité ou les quotas ne sont pas confirmés | Contact du responsable, documentation |
| `conflit_amont` | La conception contredit le PRD ou le BRD, ou ils sont muets | Demande de changement au PRD ou au BRD |
| `conflit_interets` | Deux parties prenantes veulent des choix incompatibles | Décision de l'arbitre désigné dans `decision_rights` |
| `arbitre_inconnu` | Personne n'est désigné pour trancher | Question au sponsor |

## Conflits : qui tranche

Comme dans le BRD et le PRD : l'arbitre est le décideur du domaine dans `decision_rights`, jamais partie au conflit. Tu prépares un ADR avec au moins deux options et leurs conséquences ; tu ne tranches pas.

## Bloquante, ou pas

Une zone d'ombre est **bloquante** si elle empêche l'étape suivante de **commencer** — pas si elle la rend moins sûre. Le test est concret : nomme l'étape, et dis ce qui s'y ferait de faux si on la menait sans l'avoir levée. Si tu ne peux pas le dire, elle n'est pas bloquante : elle est importante, et son type suffit à la faire remonter, puisque `ask-five.mjs` classe par ce que la zone coûte.

Le critère a été resserré après deux dossiers réels. « On ne peut pas formuler correctement les objectifs sans la lever » est vrai par construction au début d'une phase : **18 bloquantes sur 25**. Sur le dossier suivant, où aucune consigne ne définissait le mot, **0 sur 21**. Un drapeau qui vaut tout ou rien ne classe rien — il est donc sorti du score, et ne sert plus qu'à une chose, sérieuse : **une bloquante ouverte interdit la sortie de phase**.
