# Installer le hook et la porte en CI

## Le plus simple : l'installateur

À la racine de l'archive du SDLC : `node install.mjs --project <dépôt> --target claude|copilot|both`. Il pose le hook pour l'outil choisi, avec le bon format, et l'ajoute au `.gitignore` de `.impl/`.

## À la main

**Claude Code** — dans `.claude/settings.json` du dépôt :

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Edit|Write|MultiEdit|NotebookEdit",
        "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/skills/impl-builder/scripts/tdd-guard.mjs\"" }] }
    ]
  }
}
```

**GitHub Copilot** (CLI, agent cloud, VS Code) — dans `.github/hooks/tizi.json` :

```json
{
  "version": 1,
  "hooks": {
    "PreToolUse": [{ "type": "command", "command": "node .github/skills/impl-builder/scripts/tdd-guard.mjs", "timeoutSec": 30 }]
  }
}
```

Le nom d'événement en PascalCase (`PreToolUse`) demande à Copilot une charge utile compatible avec Claude Code (champs `tool_name`, `tool_input`, noms d'outils traduits). Le script reconnaît de toute façon les variantes : noms d'outils de Claude, de Copilot (`edit`, `create`, `apply_patch`…) et de VS Code (`create_file`, `replace_string_in_file`…), chemins dans `file_path`, `filePath`, `path` ou dans un correctif. VS Code ignore les filtres `matcher` : le hook est appelé pour chaque outil et filtre lui-même.

Le hook refuse avec le code de sortie 2, la raison sur la sortie d'erreur (Claude Code, VS Code) et en JSON sur la sortie standard (`permissionDecision: "deny"`, Copilot). Sans `impl/config.yaml` dans le dépôt, il laisse tout passer.

Ajoute `.impl/` au `.gitignore` : c'est l'état local de la tâche en cours.

**Selon l'outil :**
- Copilot CLI et agent cloud : hooks pris en charge. Dans l'agent cloud, le bac à sable est éphémère : le journal `.impl/` disparaît à la fin du travail, seule compte la porte rejouée en CI.
- VS Code : hooks en préversion ; ils peuvent devoir être activés, ou être désactivés par l'organisation.
- Si les deux outils sont installés, Copilot lit aussi `.claude/settings.json` : le hook peut s'exécuter deux fois, avec le même verdict.

## Porte en CI

Le hook ne protège que les écritures faites par l'agent, et seulement les outils d'édition (une écriture par une commande shell lui échappe). La même porte est rejouée en CI, qui relance elle-même toutes les suites :

```yaml
# .github/workflows/pr-gate.yml (extrait)
- run: node <chemin-du-skill>/scripts/pr-gate.mjs impl/<slug>/state.yaml --task "$TASK_ID" --run
```

L'identifiant de tâche se lit dans le titre ou la branche de la PR (`TK-xxx`). En mode `--run`, la vérification C4 (trace du TDD) n'est pas faite : elle dépend du journal local, qui ne remonte pas en CI. Rends cette vérification obligatoire dans la protection de la branche principale.

## Instructions du dépôt

Quand `impl/config.yaml` change (commandes de test, dossiers des composants), relance `node <chemin-du-skill>/scripts/sync-agent-instructions.mjs .`. En CI, `sync-agent-instructions.mjs . --check` échoue si le bloc est absent ou périmé, ou si un dossier cité n'existe plus.
