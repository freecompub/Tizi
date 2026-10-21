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
