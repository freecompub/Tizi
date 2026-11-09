# Déclenchement des skills — Claude Code, 9 novembre 2026

Première mesure **versionnée** de ce banc. Les sorties brutes vont dans `evals/results/`, qui n'est pas
suivi par Git : une mesure qui n'existe que sur la machine de son auteur ne mesure rien pour les autres.
`AMELIORATIONS.md` portait depuis le 24 octobre l'entrée « commiter un résultat d'eval, même mauvais » ;
celle-ci la solde.

**Conditions** : `node evals/run-triggers.mjs --agent claude --runs 5`, 25 requêtes, 5 passes chacune,
seuil de retenue à 50 % des passes, séparation entraînement/test 60/40 fixée par empreinte de la
requête. Claude Code 2.1.319.

## Ce que la mesure précédente ne mesurait pas

La passe du 24 octobre donnait **0,00 de rappel pour `impl-builder`** et c'est ce chiffre qui a motivé
cette reprise. Il ne mesurait pas une description : `evals/agents.yaml` lançait l'agent avec
`--allowedTools "Read Write Edit Glob Grep Bash(node:*)"`, qui **n'autorise pas l'outil `Skill`**.
L'agent voyait les descriptions et ne pouvait charger aucun corps de `SKILL.md`, donc le marqueur ne
pouvait jamais être imprimé. Vérifié sur une même requête avant de corriger — « Implémente la tâche
TK-002 du plan en TDD » : sans l'outil, aucun marqueur ; avec, l'appel `Skill{impl-builder}` puis
`TIZI-SKILL-ACTIF impl-builder` en première ligne. Une passe jouée dans ces conditions le 8 novembre
donnait **3 activations sur 22 requêtes**, pour sept skills sur huit à 0,00.

**À retenir pour la prochaine fois : un rapport où _tous_ les skills sont à 0,00 est d'abord un soupçon
sur le banc.** Trois semaines de chiffre faux ont tenu parce que personne ne l'a lu comme ça.

## Résultats

| | Entraînement | Test |
|---|---|---|
| Requêtes | 19, dont **16 correctes** | 6, dont **5 correctes** |
| Précision | **1,00 pour les huit skills** | 1,00 |
| Requêtes qui ne devaient rien déclencher | 3/3 restées sans skill | 2/2 |

Rappel par skill, sur l'entraînement : **1,00** pour `brd-builder`, `prd-builder`, `plan-builder`,
`test-builder` et `audit-builder` ; **0,50** pour `sad-builder`, `backlog-executor` et `impl-builder`.
Sur le test, `impl-builder` est à 0,00 sur sa seule requête — les échecs du test ne sont pas détaillés
ici, à dessein : les lire pour corriger une description fausserait la mesure suivante.

Deux choses valent d'être dites avant les échecs :

- **Aucun faux positif, nulle part.** Les cinq requêtes proches qui ne devaient rien déclencher — «
  Résume-moi ce qu'est un BRD en trois phrases », « Corrige les fautes d'orthographe dans prd.md », «
  Explique-moi la différence entre un conteneur et un composant dans C4 », « Combien de jours dure un
  sprint en Scrum ? », « Pourquoi mon test unitaire échoue avec une erreur d'import ? » — sont restées
  sans skill, cinq fois sur cinq. C'est le risque principal d'un jeu de huit descriptions qui partagent
  un vocabulaire, et il ne s'est pas réalisé.
- **`audit-builder` est à 1,00 en précision et en rappel**, sur ses trois premières requêtes. Le
  huitième skill n'en avait **aucune** jusqu'au 8 novembre : son déclenchement n'était pas mesuré, et
  c'est aussi le constat M7 de l'audit indépendant du même jour, trouvé séparément.

## Les trois échecs de l'entraînement, avec leur taux d'activation

Ce sont les seuls qu'on peut lire pour corriger une description.

| Requête | Attendu | Ce qui s'est activé, sur 5 passes |
|---|---|---|
| « Analyse l'existant de ce dépôt pour préparer la conception de la nouvelle fonctionnalité » | `sad-builder` | `sad-builder` 1 fois, `prd-builder` 1, `brd-builder` 1 |
| « Crée directement les issues dans GitHub sans passer par un plan » | `backlog-executor` | `backlog-executor` 2 fois (0,40 — juste sous le seuil) |
| « Écris un test unitaire pour la fonction manquants() » | `impl-builder` | **rien, aucune passe** |

Les trois ne disent pas la même chose, et c'est ce qui rend la mesure utile :

1. **Hésitation**, pas absence. « Analyse l'existant » fait choisir entre trois skills de document, un
   par passe. Le mot « existant » vit dans les trois descriptions — brownfield pour la conception,
   produit existant pour le PRD, cadrage pour le BRD. C'est une frontière à écrire, pas un oubli.
2. **Sous le seuil de peu.** `backlog-executor` s'active 2 fois sur 5 sur une requête qui est une
   tentation — écrire dans GitHub *sans* plan approuvé —, et c'est précisément le cas où on veut qu'il
   s'active pour refuser. Un skill qui ne s'active qu'une fois sur deux laisse l'autre moitié du temps
   l'agent écrire dans GitHub sans garde-fou.
3. **Rien du tout.** « Écris un test unitaire pour la fonction `manquants()` » n'active **aucun** skill
   sur cinq passes. C'est la seule vraie absence, et elle se comprend : la requête ressemble à du
   travail de code ordinaire, et rien dans sa formulation ne dit « tâche du plan ». La question qu'elle
   pose est une question de modèle, pas de vocabulaire : est-ce qu'écrire un test unitaire hors d'une
   tâche doit charger l'étape 5 — qui exigera une tâche en cours, une compréhension validée et un test
   rouge avant le code — ou est-ce que c'est légitimement du travail hors Tizi ? Le garde-fou TDD, lui,
   a déjà sa réponse : il refuse l'écriture et renvoie à la dérogation.

## Ce qui reste à faire avec ça

- Les trois échecs ci-dessus se corrigent **sur l'entraînement**, puis se jugent **sur le test**. On ne
  garde une description nouvelle que si le test s'améliore.
- Le troisième échec n'est pas un problème de description : il demande de trancher si « écris un test »
  sans tâche appelle l'étape 5. À poser à l'utilisateur.
- **Une erreur d'intégrité** sur 125 passes (« Fais la revue de code de ma branche avant la PR », 4
  passes sur 5 ont tourné). Elle ne compte ni pour ni contre la requête, et c'est ce que le banc doit
  faire ; mais une requête jugée sur 4 passes avec un seuil à 50 % se décide à 2 contre 2.
- Coût : environ une heure de mur pour les 125 passes, dominée par les requêtes qui font travailler
  l'agent avant qu'il ne réponde malgré la consigne d'arrêt.
