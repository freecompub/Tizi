# Audit mécanique — 22 octobre 2026

Audit fait par scripts, sans regard neuf : il confronte les artefacts entre eux et met les hooks à l'épreuve. Il ne remplace pas l'audit indépendant (`tizi-auditor`), qui doit être lancé en contexte vierge.

## Constats

| # | Gravité | Constat | Preuve |
|---|---|---|---|
| 1 | **Bloquant** | Dès que `impl/config.yaml` existe, le garde-fou TDD refuse toute écriture de code de production hors d'une tâche Tizi : une coquille sur le chemin « hors Tizi », ou un correctif d'urgence, sont bloqués. Le choix du chemin autorise ce que le garde-fou interdit. | `tdd-guard.mjs` l. 48 ; essai sans `.impl/current.json` : code 2, « aucune tâche en cours » |
| 2 | À corriger | Une tâche fusionnée reste la tâche en cours et bloque toute écriture jusqu'à la suivante ; le message ne dit pas quoi faire. | `record-pr.mjs --fusionnee` ne libère pas `.impl/current.json` ; essai : code 2, « TK-002 est fusionnee » |
| 3 | À corriger | Dans une équipe, la capture de session réécrit à chaque tour `.tizi/sessions/index.yaml` et les extraits, qui sont versionnés : conflits Git assurés entre développeurs. | `session-capture.mjs` (saveIndex) ; `.gitignore` n'exclut que `*.jsonl` et `*.tmp` |
| 4 | À corriger | La voie rapide demande `defect.mjs --corrige-par`, script absent de `plan-builder` : échec si les tests ne sont pas installés. | `plan-builder/references/fast-lane.md` ; `defect.mjs` seulement dans `test-builder` |
| 5 | À corriger | La porte de PR exécute en shell les commandes de la constitution : une constitution modifiée par malveillance ferait exécuter n'importe quoi, localement et en CI. | `pr-gate.mjs` (C10), `constitution.mjs --controler` |
| 6 | Mineur | Si l'état d'implémentation a disparu, le garde-fou parle d'une compréhension non validée au lieu de signaler l'état manquant. | essai après suppression de `impl/demo/state.yaml` |
| 7 | Mineur | La sprint review modifie l'état du plan ; un export approuvé mais pas encore appliqué devient invalide (refus de l'exécuteur, sûr mais inexpliqué). | `close-sprint.mjs` écrit l'état ; `plan-operations.mjs` lie l'approbation à `planStateDigest` |
| 8 | Mineur | `tizi-bug` n'est jamais proposé par le point d'étape, qui ne signale pas les signalements à trier (seul le hook de début de session le fait). | `next-step.mjs` |

## Ce qui tient

- Aucune option citée par la documentation n'est inconnue de son script ; aucun code de règle cité n'est inconnu (S01–S80, C1–C10, R1–R10).
- Toute étape proposée par le point d'étape a son point d'entrée.
- Les hooks de capture et de début de session ne bloquent jamais (entrée vide, JSON invalide, dossier ou transcription absents : code 0), en moins d'une demi-seconde ; la capture d'une session de 25 Mo prend environ 300 ms par tour.
- Pendant une tâche, le garde-fou laisse passer ce qui n'est pas du code (PRD, plan, README, registre des défauts, `AGENTS.md`, état de vérification, fichiers hors du dépôt).
