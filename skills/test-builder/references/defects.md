# Signaler et trier un problème

Ce qu'un testeur remonte n'est pas toujours un défaut. Le tri est obligatoire, et repose sur une seule question de départ : **qu'est-ce qui était convenu pour cette situation ?**

## 1. Recueillir le signalement

Une fiche courte, sans laquelle le problème n'est pas reproductible : version candidate, environnement, données, étapes, **observé**. `defect.mjs <initiative> --signaler …` l'enregistre avec un identifiant `DEF-xxx`, au statut « à trier ». Un bug déjà saisi dans GitHub ou Jira se reprend par `import-defects.mjs`, en lecture seule, plutôt que d'être ressaisi.

## 2. Retrouver ce qui était convenu

`find-expectations.mjs <initiative> "<observation>"` cherche, dans toute la spécification, les attentes écrites les plus proches — critères, exigences, exemples, règles métier, comportements à préserver, étapes de parcours — avec leur **texte exact**, leur épopée et l'état de leur preuve. On peut restreindre par activité (`--activite`), parcours (`--parcours`) ou story (`--story`). C'est une aide : elle propose, le testeur choisit. Une attente formulée autrement peut lui échapper ; parcourir alors par activité ou par story.

## 3. Trier

| Question | Si oui | Si non |
|---|---|---|
| Existe-t-il une attente écrite pour cette situation ? | question suivante | **question** : rien ne le spécifie ; à trancher par le PRD (zone d'ombre) |
| Le comportement observé la contredit-il ? | **défaut**, rattaché à cette attente, avec une sévérité | question suivante |
| Le comportement est conforme, mais l'attente paraît fausse ? | **changement** : demande adressée au décideur désigné (droits de décision) | ce n'est pas un problème |

Avant de créer un défaut, vérifier les **doublons** (un défaut ouvert sur la même attente : `defect.mjs <initiative> --ouverts`), et la **reproduction** sur la version indiquée (sinon : non reproductible). Le testeur tranche ; une demande de changement est décidée par le responsable désigné, jamais par l'agent.

`defect.mjs <initiative> --trier DEF-xxx --classement defaut --exigence AC-xxx --attendu "…" --severite majeur` refuse un défaut qui ne nomme pas son attente : sans attente écrite, c'est une question.

## 4. Ce qui suit

- **Défaut** : une story en voie rapide le corrige (`plan-builder`, `references/fast-lane.md`), rattachée à l'épopée de l'exigence ; l'implémentation commence par un test de régression étiqueté `@DEF-xxx`. Le défaut est **résolu quand ce test passe** sur la version candidate.
- Dans la matrice de release, une exigence contredite par un défaut ouvert n'est plus « prouvée » mais **contredite**. Si elle était prouvée, le test était insuffisant : la matrice le signale.
- La porte de release (R10) reste fermée tant qu'un défaut bloquant ou majeur est ouvert, ou qu'un signalement n'est pas trié.
