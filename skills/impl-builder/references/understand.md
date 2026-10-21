# 1. Comprendre avant d'écrire

Remettre une liste de détails à quelqu'un pour qu'il construise ne suffit pas : chacun s'en fait sa propre image. Entre humains, celui qui sait reraconte l'histoire à celui qui va construire, qui pose ses questions. Pour un agent, l'équivalent est de **reformuler** la tâche et de **poser ses questions** avant d'écrire la moindre ligne, puis de faire valider par un humain. (D'après Jeff Patton, *User Story Mapping*, ch. 9, reformulé.)

## Ce que tu produis

Dans `tasks[].understanding` de l'état :

1. **Reformulation** (`restatement`) : avec tes mots, en 5 à 10 lignes : qui en profite, ce qui change pour lui, ce que la tâche touche (éléments, contrats), ce qu'elle ne touche pas.
2. **Questions** (`questions`) : tout ce que la fiche ne tranche pas et qui changerait ton code. Une question qui touche une règle, un critère, un contrat ou un ADR ne se tranche pas ici : enregistre une zone d'ombre (`shadow_zones`, `target` : plan, prd ou sad) et passe la tâche en `bloquee`. Si le chemin décidé pour l'initiative (`.tizi/chemins/<initiative>.yaml`) ne comprend pas l'étape qui doit trancher (une voie rapide qui découvre une règle métier, par exemple), propose de l'**élargir** (`choose-path.mjs --elargir`) au lieu de contourner l'étape manquante.
3. **Hypothèses** (`assumptions`) : ce que tu supposes sans que la fiche le dise. Chacune est validée par l'humain ou devient une question.
4. **Plan de tests** (`test_plan`) : les scénarios d'acceptation (un par `EX` et `AC` de la tâche, avec leurs identifiants), les tests de contrat (par `OP`), les grandes familles de tests unitaires, et les vérifications (`NR`, `TH`) que la tâche met en place.

## Validation

Présente ces quatre éléments à l'utilisateur. Il valide, corrige, ou répond aux questions. Quand il déclare la compréhension validée, lance `node <chemin-du-skill>/scripts/approve-understanding.mjs impl/<slug>/state.yaml --task TK-xxx --by "<son nom>"` : la validation est enregistrée avec l'**empreinte** de la compréhension, qui est désormais **gelée**, et la tâche passe en `rouge`. Le hook n'autorise aucune écriture avant.

Si la compréhension doit changer ensuite (une réponse de l'utilisateur, une découverte en cours de route), modifie-la, puis fais-la **valider à nouveau** : tant que ce n'est pas fait, le hook bloque les écritures et la porte de PR reste fermée. Ce que l'humain a validé ne doit jamais changer en silence (idée reprise du bloc gelé après approbation de BMAD-METHOD).

Une validation n'est jamais déduite : un silence, un « ok » sur autre chose, ou une réponse partielle ne valent pas validation.
