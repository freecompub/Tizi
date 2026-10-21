# Tests de caractérisation : figer l'existant avant de le modifier

Sur du code existant que rien ne spécifie, on ne sait pas toujours ce qu'il fait exactement, ni qui en dépend. Avant de le modifier, on écrit des **tests de caractérisation** : ils décrivent ce que le code fait **aujourd'hui**, et doivent passer tels quels. Ensuite seulement, on reprend le cycle habituel : un test rouge pour le nouveau comportement, puis le code. Technique de Michael Feathers (*Working Effectively with Legacy Code*).

## Quand

La porte de PR l'exige (C9) quand la tâche :
- touche un élément que la conception marque `existant_modifié` ;
- ou cite des comportements à préserver du PRD (`preserves: [PB-xx]`).

## Comment

1. Pour chaque comportement à préserver de la fiche de contexte, et pour le comportement actuel du code que tu vas modifier, écris un test qui l'observe **tel qu'il est**, même s'il te paraît étrange. Étiquette-le `@PB-xx` quand il correspond à un comportement du PRD.
2. Lance `run-tests.mjs --suite unit --caracterisation` (ou `acceptance`). Le test doit **passer**. S'il échoue, c'est le test qui décrit mal l'existant : corrige le test, jamais le code.
3. Reprends ensuite le cycle rouge–vert pour le changement (`references/tdd-bdd.md`).

Un comportement actuel qui te semble faux n'est pas à corriger en passant : c'est une question pour le PRD (zone d'ombre), car quelqu'un en dépend peut-être.

## Ce que le garde-fou en fait

Les tests de caractérisation sont des tests : le garde-fou en permet toujours l'écriture. Une exécution de caractérisation verte ne débloque pas l'écriture du code de production : il faut toujours un test rouge pour le nouveau comportement. Dans le cycle rouge–vert, ces exécutions ne comptent pas (C4).
