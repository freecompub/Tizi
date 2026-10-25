# Zones d'ombre du PRD

Même principe que pour le BRD : ce qu'on ne sait pas encore et qui pourrait fausser le produit. Chaque zone d'ombre indique qui peut la lever et se termine `levée` (avec une source) ou `assumée` (avec une raison ; elle devient une hypothèse ou un risque).

| `type` | Signal typique | Action pour la lever |
|---|---|---|
| `cas_limite` | Parcours décrit seulement dans le cas nominal | Question au métier, observation |
| `etat_erreur` | Ce qui se passe en cas d'échec n'est pas spécifié | Question au métier, revue avec la qualité |
| `comportement_ambigu` | Deux lectures possibles d'une exigence | Exemple concret validé par l'utilisateur |
| `nfr_non_mesurable` | Exigence de qualité sans cible chiffrée | Donnée existante, décision du product owner |
| `objectif_non_mesurable` | Objectif produit sans KPI ou valeur de référence | Analytics, décision du sponsor |
| `persona_non_fonde` | Persona sans preuve | Entretien, données d'usage |
| `exigence_sans_origine` | FR sans BR ni source ni décision | Justification ou abandon ; demande de changement au BRD |
| `br_non_couverte` | Exigence du BRD sans FR ni NFR | Spécifier, ou justifier l'absence |
| `conflit_amont` | Le produit contredit le BRD, ou le BRD est muet | Demande de changement au BRD |
| `dependance_inconnue` | Système, équipe ou donnée externe non confirmée | Contact du responsable |
| `hypothese_non_verifiee` | Affirmation sans source | Test utilisateur, donnée, entretien |
| `attendu_implicite` | Ce que l'existant fait « sans que personne n'y pense » n'est couvert par aucune exigence | Question directe, analyse de l'existant, observation (`references/elicitation-patterns.md`) |
| `regle_non_couverte` | Règle métier décidée `automatisée` sans exigence fonctionnelle | Spécifier, ou revenir sur la décision d'automatisation |
| `conflit_interets` | Deux parties prenantes demandent des comportements incompatibles | Décision de l'arbitre désigné dans `decision_rights` |
| `arbitre_inconnu` | Un conflit d'intérêts n'a pas de décideur identifié | Question au sponsor ou au product owner |
| `perimetre_non_tranche` | Une tâche est gardée dans une release malgré un critère du MVP, ou un objet entré sans irritant derrière | Décision du décideur du périmètre (`decision_rights`) |

## Conflits : qui tranche

Un conflit d'intérêts ne se tranche ni par toi, ni par l'utilisateur à la place du décideur. Renseigne `parties` et `arbiter` (le décideur du domaine dans `decision_rights`, jamais partie au conflit ; à défaut, zone `arbitre_inconnu`). Prépare une décision `DD-xx` avec au moins deux options et leurs impacts ; tu présentes, tu ne recommandes pas. La décision n'est enregistrée que lorsque l'utilisateur déclare qui l'a rendue (`decided_by`).

Ne confonds pas avec `comportement_ambigu` (deux lectures d'un même énoncé, qui se lève par un exemple) ni avec `conflit_amont` (le PRD contredit le BRD, qui se traite par une demande de changement).

## Bloquante, ou pas

Une zone d'ombre est **bloquante** si elle empêche l'étape suivante de **commencer** — pas si elle la rend moins sûre. Le test est concret : nomme l'étape, et dis ce qui s'y ferait de faux si on la menait sans l'avoir levée. Si tu ne peux pas le dire, elle n'est pas bloquante : elle est importante, et son type suffit à la faire remonter, puisque `ask-five.mjs` classe par ce que la zone coûte.

Le critère a été resserré après deux dossiers réels. « On ne peut pas formuler correctement les objectifs sans la lever » est vrai par construction au début d'une phase : **18 bloquantes sur 25**. Sur le dossier suivant, où aucune consigne ne définissait le mot, **0 sur 21**. Un drapeau qui vaut tout ou rien ne classe rien — il est donc sorti du score, et ne sert plus qu'à une chose, sérieuse : **une bloquante ouverte interdit la sortie de phase**.
