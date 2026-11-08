# Fichiers livrés, skill par skill

Document **généré** par `node doc-fichiers.mjs` — ne pas le modifier à la main. Il dit quel fichier est livré dans quel skill, et rien d'autre : l'**identité** des copies homonymes est garantie ailleurs, par `tests/skills.test.mjs`, qui compare les empreintes de tout fichier ou sous-agent portant le même nom dans deux skills.

8 skills : `audit-builder`, `backlog-executor`, `brd-builder`, `impl-builder`, `plan-builder`, `prd-builder`, `sad-builder`, `test-builder`. Dans les tableaux, « ✓ » veut dire livré, « · » absent, et la dernière colonne compte les skills qui le portent.

## scripts/

76 fichiers distincts, dont **18 présents dans les 8 skills**. Un script commun oublié dans un seul skill casse une installation partielle en silence : c'est arrivé avec `adopt.mjs`, que le point d'étape appelle et qui manquait au huitième skill.

| Fichier | audit | backlog | brd | impl | plan | prd | sad | test | Dans |
|---|---|---|---|---|---|---|---|---|---|
| `adopt.mjs` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 8 |
| `ask-five.mjs` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 8 |
| `choose-path.mjs` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 8 |
| `constitution.mjs` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 8 |
| `due-reviews.mjs` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 8 |
| `lib/agent-io.mjs` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 8 |
| `lib/common.mjs` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 8 |
| `lib/gates.mjs` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 8 |
| `lib/sessions.mjs` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 8 |
| `lib/vendor/js-yaml.LICENSE` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 8 |
| `lib/vendor/js-yaml.mjs` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 8 |
| `next-step.mjs` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 8 |
| `package.json` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 8 |
| `session-capture.mjs` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 8 |
| `session-search.mjs` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 8 |
| `session-start.mjs` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 8 |
| `status.mjs` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 8 |
| `sync-agent-instructions.mjs` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 8 |
| `verify-handoff.mjs` | · | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 6 |
| `lib/rules.mjs` | ✓ | · | ✓ | · | ✓ | ✓ | ✓ | · | 5 |
| `lint.mjs` | ✓ | · | ✓ | · | ✓ | ✓ | ✓ | · | 5 |
| `build-handoff.mjs` | · | · | ✓ | · | ✓ | ✓ | ✓ | · | 4 |
| `council-report.mjs` | · | · | ✓ | · | ✓ | ✓ | ✓ | · | 4 |
| `freeze-version.mjs` | · | · | ✓ | · | ✓ | ✓ | ✓ | · | 4 |
| `lib/checklists.mjs` | · | · | ✓ | · | · | ✓ | ✓ | · | 3 |
| `review-checklist.mjs` | · | · | ✓ | · | · | ✓ | ✓ | · | 3 |
| `review-pack.mjs` | · | · | ✓ | · | · | ✓ | ✓ | · | 3 |
| `block.mjs` | · | · | · | ✓ | ✓ | · | · | · | 2 |
| `ci-audit.mjs` | · | · | · | ✓ | · | · | · | ✓ | 2 |
| `cross-context.mjs` | · | · | · | · | · | ✓ | ✓ | · | 2 |
| `cross-merge.mjs` | · | · | · | · | · | ✓ | ✓ | · | 2 |
| `defect.mjs` | · | · | · | · | ✓ | · | · | ✓ | 2 |
| `lib/outgoing.mjs` | · | · | ✓ | · | · | ✓ | · | · | 2 |
| `lib/testing.mjs` | · | · | · | ✓ | · | · | · | ✓ | 2 |
| `question-guard.mjs` | · | · | ✓ | · | · | ✓ | · | · | 2 |
| `reach-out.mjs` | · | · | ✓ | · | · | ✓ | · | · | 2 |
| `read-reply.mjs` | · | · | ✓ | · | · | ✓ | · | · | 2 |
| `review-sources.mjs` | · | · | ✓ | · | · | ✓ | · | · | 2 |
| `apply-operations.mjs` | · | ✓ | · | · | · | · | · | · | 1 |
| `approve-understanding.mjs` | · | · | · | ✓ | · | · | · | · | 1 |
| `audit.mjs` | ✓ | · | · | · | · | · | · | · | 1 |
| `ci-fetch.mjs` | · | · | · | · | · | · | · | ✓ | 1 |
| `ci-run-suites.mjs` | · | · | · | · | · | · | · | ✓ | 1 |
| `ci-sprint-review.mjs` | · | · | · | · | ✓ | · | · | · | 1 |
| `close-sprint.mjs` | · | · | · | · | ✓ | · | · | · | 1 |
| `derogation.mjs` | · | · | · | ✓ | · | · | · | · | 1 |
| `discover-tracker.mjs` | · | · | · | · | ✓ | · | · | · | 1 |
| `find-expectations.mjs` | · | · | · | · | · | · | · | ✓ | 1 |
| `forecast.mjs` | · | · | · | · | ✓ | · | · | · | 1 |
| `freeze-evidence.mjs` | · | · | · | · | · | · | · | ✓ | 1 |
| `import-defects.mjs` | · | · | · | · | · | · | · | ✓ | 1 |
| `ingest-dt-handoff.mjs` | · | · | ✓ | · | · | · | · | · | 1 |
| `ingest-handoffs.mjs` | · | · | · | · | ✓ | · | · | · | 1 |
| `lib/ci.mjs` | · | · | · | · | · | · | · | ✓ | 1 |
| `lib/impl.mjs` | · | · | · | ✓ | · | · | · | · | 1 |
| `lib/review.mjs` | · | · | · | ✓ | · | · | · | · | 1 |
| `list-opportunities.mjs` | · | · | ✓ | · | · | · | · | · | 1 |
| `measure.mjs` | · | · | · | · | ✓ | · | · | · | 1 |
| `plan-operations.mjs` | · | · | · | · | ✓ | · | · | · | 1 |
| `pr-gate.mjs` | · | · | · | ✓ | · | · | · | · | 1 |
| `record-nfr.mjs` | · | · | · | · | · | · | · | ✓ | 1 |
| `record-pr.mjs` | · | · | · | ✓ | · | · | · | · | 1 |
| `release-matrix.mjs` | · | · | · | · | · | · | · | ✓ | 1 |
| `render-brd.mjs` | · | · | ✓ | · | · | · | · | · | 1 |
| `render-plan.mjs` | · | · | · | · | ✓ | · | · | · | 1 |
| `render-prd.mjs` | · | · | · | · | · | ✓ | · | · | 1 |
| `render-sad.mjs` | · | · | · | · | · | · | ✓ | · | 1 |
| `retro-evidence.mjs` | · | · | · | · | ✓ | · | · | · | 1 |
| `review-context.mjs` | · | · | · | ✓ | · | · | · | · | 1 |
| `review-merge.mjs` | · | · | · | ✓ | · | · | · | · | 1 |
| `run-tests.mjs` | · | · | · | ✓ | · | · | · | · | 1 |
| `sprint-review.mjs` | · | · | · | · | ✓ | · | · | · | 1 |
| `start-task.mjs` | · | · | · | ✓ | · | · | · | · | 1 |
| `tdd-guard.mjs` | · | · | · | ✓ | · | · | · | · | 1 |
| `tdd-phase.mjs` | · | · | · | ✓ | · | · | · | · | 1 |
| `trace-check.mjs` | · | · | · | ✓ | · | · | · | · | 1 |

## references/

Deux références sont communes aux huit skills et vérifiées identiques — la continuité entre sessions et la forme d'une question. Les autres références homonymes sont propres à chaque skill par construction : un council de BRD et un council de plan ne posent pas les mêmes questions.

| Fichier | audit | backlog | brd | impl | plan | prd | sad | test | Dans |
|---|---|---|---|---|---|---|---|---|---|
| `questions.md` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 8 |
| `sessions.md` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 8 |
| `council.md` | · | · | ✓ | · | ✓ | ✓ | ✓ | · | 4 |
| `lenses.md` | · | · | ✓ | · | ✓ | ✓ | ✓ | · | 4 |
| `phase-govern.md` | · | · | ✓ | · | ✓ | ✓ | ✓ | · | 4 |
| `shadow-zones.md` | · | · | · | · | ✓ | ✓ | ✓ | · | 3 |
| `elicitation-patterns.md` | · | · | ✓ | · | · | ✓ | · | · | 2 |
| `quality-iso29148.md` | · | · | ✓ | · | · | ✓ | · | · | 2 |
| `adr.md` | · | · | · | · | · | · | ✓ | · | 1 |
| `architecture-review.md` | · | · | · | · | · | · | ✓ | · | 1 |
| `audit-protocol.md` | ✓ | · | · | · | · | · | · | · | 1 |
| `brownfield.md` | · | · | · | · | · | · | ✓ | · | 1 |
| `c4-modelling.md` | · | · | · | · | · | · | ✓ | · | 1 |
| `cadence.md` | · | · | · | · | ✓ | · | · | · | 1 |
| `characterization.md` | · | · | · | ✓ | · | · | · | · | 1 |
| `code-review.md` | · | · | · | ✓ | · | · | · | · | 1 |
| `concept-exploration.md` | · | · | · | · | · | ✓ | · | · | 1 |
| `defects.md` | · | · | · | · | · | · | · | ✓ | 1 |
| `development-strategy.md` | · | · | · | · | ✓ | · | · | · | 1 |
| `domain-modelling.md` | · | · | · | · | · | · | ✓ | · | 1 |
| `ears.md` | · | · | · | · | · | ✓ | · | · | 1 |
| `example-mapping.md` | · | · | · | · | ✓ | · | · | · | 1 |
| `execution-protocol.md` | · | ✓ | · | · | · | · | · | · | 1 |
| `existing-behaviors.md` | · | · | · | · | · | ✓ | · | · | 1 |
| `exploratory-testing.md` | · | · | · | · | · | · | · | ✓ | 1 |
| `export.md` | · | · | · | · | ✓ | · | · | · | 1 |
| `fast-lane.md` | · | · | · | · | ✓ | · | · | · | 1 |
| `hooks-and-ci.md` | · | · | · | ✓ | · | · | · | · | 1 |
| `hve-dt-bridge.md` | · | · | ✓ | · | · | · | · | · | 1 |
| `mvp.md` | · | · | · | · | · | ✓ | · | · | 1 |
| `nfr-taxonomy.md` | · | · | · | · | · | ✓ | · | · | 1 |
| `phase-assess.md` | · | · | ✓ | · | · | · | · | · | 1 |
| `phase-define.md` | · | · | ✓ | · | · | · | · | · | 1 |
| `phase-design.md` | · | · | · | · | · | · | ✓ | · | 1 |
| `phase-discover.md` | · | · | ✓ | · | · | · | · | · | 1 |
| `phase-execute.md` | · | · | · | · | · | · | · | ✓ | 1 |
| `phase-explore.md` | · | · | · | · | · | · | ✓ | · | 1 |
| `phase-frame.md` | · | · | · | · | · | ✓ | · | · | 1 |
| `phase-prepare.md` | · | · | · | · | · | · | · | ✓ | 1 |
| `phase-prove.md` | · | · | · | · | · | · | · | ✓ | 1 |
| `phase-refine.md` | · | · | · | · | ✓ | · | · | · | 1 |
| `phase-review.md` | · | · | · | · | ✓ | · | · | · | 1 |
| `phase-schedule.md` | · | · | · | · | ✓ | · | · | · | 1 |
| `phase-slice.md` | · | · | · | · | ✓ | · | · | · | 1 |
| `phase-specify.md` | · | · | · | · | · | ✓ | · | · | 1 |
| `pr-gate.md` | · | · | · | ✓ | · | · | · | · | 1 |
| `quality-scenarios.md` | · | · | · | · | · | · | ✓ | · | 1 |
| `security-controls.md` | · | · | · | · | · | · | ✓ | · | 1 |
| `sizing-and-assignment.md` | · | · | · | · | ✓ | · | · | · | 1 |
| `stride.md` | · | · | · | · | · | · | ✓ | · | 1 |
| `tdd-bdd.md` | · | · | · | ✓ | · | · | · | · | 1 |
| `test-strategy.md` | · | · | · | · | · | · | · | ✓ | 1 |
| `understand.md` | · | · | · | ✓ | · | · | · | · | 1 |
| `validated-learning.md` | · | · | · | · | · | ✓ | · | · | 1 |

## templates/ et agents/

Le modèle d'état d'un skill, et ses sous-agents.

**templates/**

| Fichier | audit | backlog | brd | impl | plan | prd | sad | test | Dans |
|---|---|---|---|---|---|---|---|---|---|
| `state.yaml` | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7 |
| `contacts.yaml` | · | · | ✓ | · | · | ✓ | · | · | 2 |
| `config.yaml` | · | · | · | ✓ | · | · | · | · | 1 |

**agents/**

| Fichier | audit | backlog | brd | impl | plan | prd | sad | test | Dans |
|---|---|---|---|---|---|---|---|---|---|
| `cross-analyzer.md` | · | · | · | · | · | ✓ | ✓ | · | 2 |
| `brd-lens-critic.md` | · | · | ✓ | · | · | · | · | · | 1 |
| `finding-verifier.md` | · | · | · | ✓ | · | · | · | · | 1 |
| `plan-lens-critic.md` | · | · | · | · | ✓ | · | · | · | 1 |
| `prd-lens-critic.md` | · | · | · | · | · | ✓ | · | · | 1 |
| `review-architecture.md` | · | · | · | ✓ | · | · | · | · | 1 |
| `review-claims.md` | · | · | · | ✓ | · | · | · | · | 1 |
| `review-constitution.md` | · | · | · | ✓ | · | · | · | · | 1 |
| `review-functional.md` | · | · | · | ✓ | · | · | · | · | 1 |
| `review-security.md` | · | · | · | ✓ | · | · | · | · | 1 |
| `review-tests.md` | · | · | · | ✓ | · | · | · | · | 1 |
| `sad-lens-critic.md` | · | · | · | · | · | · | ✓ | · | 1 |

Sans `templates/` : `backlog-executor` — il ne tient aucun état de document, il applique un plan déjà écrit.
