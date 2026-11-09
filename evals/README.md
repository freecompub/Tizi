# Évaluation par ablation des skills

Ce banc mesure ce qu'un skill apporte réellement : chaque cas est joué plusieurs fois par le même agent (Claude Code ou GitHub Copilot), **sans** puis **avec** le skill installé, dans un dépôt neuf à chaque passe. L'écart de score est l'apport du skill sur ce cas ; un écart nul ou négatif est un résultat à prendre au sérieux. Méthode inspirée de la suite d'équivalence avec la référence de hve-core.

## Lancer

```
node evals/run-ablation.mjs --agent claude --runs 3
node evals/run-ablation.mjs --agent copilot --runs 5 --case brd-cadrage
node evals/run-ablation.mjs --agent claude --runs 3 --judge      # ajoute le juge, si une grille est écrite
node evals/run-ablation.mjs --agent claude --dry-run             # prépare les dépôts sans appeler d'agent
```

Les commandes des agents sont dans `agents.yaml` ; leurs options dépendent de la version installée, à vérifier avec `claude --help` et `copilot --help`. Chaque passe consomme des appels de modèle.

## Principes

- **Correcteurs déterministes d'abord** : fichiers produits, valeurs de l'état, règles de vérification du SDLC (`lint-absent`), commandes (porte de PR), fichiers restés intacts. Ce sont nos propres règles qui jugent, partout où c'est possible.
- **Juge facultatif**, seulement pour la grille écrite du cas, avec un modèle **différent** de celui évalué, et une réponse oui ou non motivée.
- **Plusieurs passes** : un agent n'est pas déterministe ; une seule passe ne mesure rien.
- **Erreur d'intégrité** : une passe où l'agent n'a pas pu tourner n'est comptée ni comme réussite ni comme échec, et le rapport la signale.

## Écrire un cas

Un fichier dans `cases/` : le skill évalué, le jeu de départ (`fixtures/<nom>`), les messages de l'utilisateur tour par tour, les correcteurs, et une grille facultative pour le juge. Un bon cas met l'agent devant une **tentation** que le skill doit lui faire éviter : valider à la place de l'utilisateur, écrire des écrans dans un PRD, coder avant un test.

## Agent simulé

`mock-agent.mjs` se comporte bien quand le skill est installé, mal sinon. Il ne mesure rien des vrais agents : il sert à vérifier le banc lui-même (`--agent-cmd "node evals/mock-agent.mjs {turn}"`). C'est en le faisant tourner que la règle L07 s'est révélée aveugle au vocabulaire d'interface.

## Déclenchement des skills

Un skill ne sert que s'il s'active au bon moment : sa description est la seule chose que le routeur de l'agent lit. `run-triggers.mjs` installe tous les skills avec un **marqueur** que chacun recopie quand il s'active, joue chaque requête de `triggers.yaml` plusieurs fois, et calcule précision et rappel par skill.

La séparation **entraînement / test** (60/40, stratifiée par skill attendu) est fixée par une empreinte de la requête : la même requête tombe toujours du même côté. Pour améliorer une description, on ne regarde que les échecs de l'**entraînement**, puis on mesure sur le **test**, dont le rapport ne détaille volontairement pas les échecs. On garde la nouvelle description seulement si le test s'améliore. Méthode reprise de bmad-eval (BMAD-METHOD).

**L'outil qui charge un skill doit être autorisé, sinon la mesure ne mesure rien.** La commande de
l'agent est dans `agents.yaml`, et sa liste d'outils doit contenir `Skill` : sans lui, l'agent voit les
descriptions mais ne peut charger aucun corps de `SKILL.md`, donc aucun marqueur n'est jamais imprimé et
tous les skills sortent à 0,00. C'est ce qui s'était passé jusqu'au 8 novembre 2026 — vérifié sur une
même requête, zéro activation sans l'outil, le marqueur attendu avec. Un rapport où **tous** les skills
sont à 0,00 est d'abord un soupçon sur le banc, pas sur les descriptions.

Le marqueur demande aussi à l'agent de **s'arrêter** juste après l'avoir imprimé : ce banc ne juge que le
déclenchement. Sans ça, chaque passe exécute le skill en entier, dépasse le délai de cinq minutes et
compte comme une erreur d'intégrité. Le marqueur ne peut s'imprimer que si le corps du `SKILL.md` a été
chargé, ce qui est exactement la question posée.

Les sorties brutes vont dans `results/`, qui n'est **pas** versionné. Une mesure qu'on veut garder se
recopie dans `mesures/`, avec ce qu'elle a appris : sinon elle n'existe que sur la machine de son auteur.

Les requêtes les plus utiles sont les **requêtes proches** : même vocabulaire, autre intention (« explique-moi C4 » ne doit pas lancer la conception). `mock-trigger.mjs` est un routeur naïf qui sert à vérifier le banc.
