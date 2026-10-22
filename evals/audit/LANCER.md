# Lancer l'audit indépendant

L'intérêt est un **contexte vierge** : une session qui n'a jamais vu la construction de Tizi.

**Claude Code** — depuis la racine du dépôt Tizi :

    cp evals/audit/tizi-auditor.md .claude/agents/ 2>/dev/null || (mkdir -p .claude/agents && cp evals/audit/tizi-auditor.md .claude/agents/)
    claude -p "Utilise le sous-agent tizi-auditor pour auditer ce dépôt et écrire son rapport." --permission-mode acceptEdits

ou, dans une session interactive neuve : « lance le sous-agent tizi-auditor ».

**GitHub Copilot** — copier le fichier en `.github/agents/tizi-auditor.agent.md`, puis choisir l'agent `tizi-auditor` dans une conversation neuve.

Le rapport est écrit dans `evals/audit/`. Comparer ses constats avec le dernier rapport d'audit mécanique, pour voir ce que chacun a trouvé que l'autre a manqué.
