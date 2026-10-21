# Explorer plusieurs solutions avant d'en choisir une

Une story map décrit **une** solution. Si elle est la première venue, tout le reste du SDLC la perfectionne sans jamais se demander s'il en existait une meilleure. Cette étape, reprise des méthodes 4 et 5 du design thinking de hve-core (et du Design Studio de Jeff Patton), fait envisager plusieurs concepts avant de bâtir la story map.

## Quand l'utiliser

- la demande initiale était **figée** (elle imposait une solution) ;
- le PRD est en mode autonome, sans BRD qui ait déjà cadré ;
- la solution ne va pas de soi, ou les parties prenantes en défendent plusieurs.

Sinon, l'étape se réduit à noter pourquoi une seule solution a été envisagée.

## Ce qu'est un concept ici

Un concept est une **idée de solution du point de vue de l'utilisateur** : un titre de deux à quatre mots et une ou deux phrases sur ce que la personne fait autrement. Ce n'est **ni une exigence, ni une maquette d'écran, ni un choix technique**. Le PRD reste sans écran, et la conception reste maître du comment.

## Déroulé

1. **Diverger.** Avec l'équipe, produire au moins une dizaine d'idées brutes (une ligne chacune), sans juger, en changeant de point de vue (chaque persona, chaque contrainte d'environnement, « et si on ne construisait rien ? »). L'agent peut relancer, pas trier.
2. **Converger.** Regrouper les idées par approche (pas par ressemblance de surface) en deux à quatre concepts (`CPT-xx`), avec ce qui les relie.
3. **Évaluer sur trois axes**, sans écarter trop tôt :
   - **désirable** : répond-il au problème et aux besoins des personas, d'après les sources ?
   - **faisable** : paraît-il réalisable dans les contraintes connues ? Ce n'est **qu'une hypothèse** à ce stade : si le doute porte sur un point technique, il deviendra un spike en conception ; l'ingénierie n'est pas engagée ici ;
   - **viable** : sert-il les objectifs de l'organisation (coût, adoption, stratégie) ?
4. **Tester** les concepts qui restent en lice par les méthodes de `references/validated-learning.md` (une BD de conception par concept suffit souvent), avec un critère de réussite écrit d'avance. Un concept se comprend en trente secondes ou il est trop compliqué.
5. **Choisir.** Le décideur désigné retient **un** concept ; les autres sont écartés **avec leur raison**. Les options écartées font partie de la décision : on saura pourquoi on ne les a pas prises.

La story map, les releases et le MVP se construisent ensuite à partir du concept retenu.

## Finition

Tout reste brut : une ligne par idée, une phrase par concept, des croquis au trait si besoin. Un support soigné attire des remarques sur l'apparence et décourage la critique de fond.
