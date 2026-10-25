# Continuité entre sessions

Un fichier d'état dit où l'on en est, pas comment on y est arrivé. Pour reprendre après une pause sans perdre les nuances, les options écartées ni les questions en suspens, le SDLC conserve trois couches :

| Couche | Fichier | Rôle | Qui l'écrit |
|---|---|---|---|
| État | `<document>/<slug>/state.yaml` | Ce qui est vrai maintenant : la référence | L'agent, après chaque échange validé |
| Condensé | `.tizi/sessions/<date>-<session>.condense.md` | Le fil de la discussion | L'agent, à la pause ou à la reprise |
| Extrait | `.tizi/sessions/<date>-<session>.extrait.md` | Vos messages mot pour mot, les questions posées — celles de l'outil de questions avec leurs réponses proposées et la réponse de chacune, celles écrites en texte libre avec le numéro du tour —, les fichiers et les identifiants touchés | Le hook, automatiquement |
| Transcription | `.tizi/sessions/<date>-<session>.jsonl` | L'échange complet, consultable par recherche | Le hook, automatiquement |
| Entrée d'index | `.tizi/sessions/<date>-<session>.index.yaml` | Dates, initiatives touchées, tâche, tokens, chemins des trois fichiers ci-dessus | Le hook, automatiquement |

La transcription seule ne suffirait pas : elle contient des affirmations que la suite a corrigées. L'état reste la référence ; les sessions servent à retrouver le pourquoi.

## Installer la capture

Le plus simple : `node install.mjs --project <dépôt> --target claude|copilot|both` à la racine de l'archive du SDLC. À la main :

**Claude Code** — dans `.claude/settings.json` :

```json
{
  "hooks": {
    "Stop":       [{ "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/skills/brd-builder/scripts/session-capture.mjs\"" }] }],
    "PreCompact": [{ "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/skills/brd-builder/scripts/session-capture.mjs\"" }] }],
    "SessionEnd": [{ "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/skills/brd-builder/scripts/session-capture.mjs\"" }] }]
  }
}
```

**GitHub Copilot** — dans `.github/hooks/tizi.json` :

```json
{
  "version": 1,
  "hooks": {
    "Stop":       [{ "type": "command", "command": "node .github/skills/brd-builder/scripts/session-capture.mjs" }],
    "PreCompact": [{ "type": "command", "command": "node .github/skills/brd-builder/scripts/session-capture.mjs" }],
    "SessionEnd": [{ "type": "command", "command": "node .github/skills/brd-builder/scripts/session-capture.mjs" }]
  }
}
```

Le script est identique dans tous les skills ; un seul suffit. La capture se fait à **chaque fin de tour** (`Stop`), avant chaque compactage et en fin de session : la copie est donc toujours à jour, même si la session s'interrompt brutalement. Les secrets probables (jetons, clés) sont masqués dans les copies.

Le script lit les deux formats de transcription : celui de Claude Code et celui de Copilot (`events.jsonl`). Copilot ne transmet pas le chemin de la transcription en fin de session : le script le retrouve alors dans `~/.copilot/session-state/<session>/`. Dans l'agent cloud de Copilot, le bac à sable est effacé à la fin du travail : rien n'y est conservé, ce qui est sans conséquence (une session de l'agent cloud aboutit à une PR, pas à une reprise).

**Un fichier d'index par session.** L'index était un fichier unique, `index.yaml`, réécrit à chaque
tour. Versionné, il produisait un conflit Git dès que deux personnes travaillaient le même jour — sur
un fichier que personne ne modifie à la main. Chaque session écrit donc désormais sa seule entrée,
dans son propre fichier ; les scripts lisent l'ensemble du dossier. Un `index.yaml` historique reste
lu s'il existe, et n'est plus jamais réécrit : rien à migrer.

**Ce que l'extrait ne peut pas savoir.** Il est produit depuis la transcription, sans interprétation,
et deux choses y échappent. Les **écritures faites au shell** : seules la redirection et `tee` y
désignent un fichier ; un `sed -i`, un script ou un éditeur lancé en ligne de commande n'est pas
traçable, et l'extrait dit alors combien de commandes ont été lancées plutôt que de conclure qu'il n'y
a rien eu. Et les **questions dont l'hôte ne nomme pas la réponse** : Claude Code renvoie chaque
question avec sa réponse, donc chacune est rattachée à la sienne ; là où l'hôte ne le fait pas, la
réponse est gardée au niveau de l'appel, telle qu'elle est arrivée.

Les questions en texte libre portent le **numéro du tour** qui les a posées. Deux questions sur le même
tour se voient donc d'un coup d'œil, et l'extrait les compte en bas de section : une question ouverte
se pose seule (`references/questions.md`), et trois dans un message reviennent à n'en poser qu'une.

**Données sensibles.** Les transcriptions contiennent ce qui a été dit en séance, y compris des notes d'entretien. Décidez en équipe de ce qui est versionné. Par défaut, ajoutez `.tizi/sessions/*.jsonl` au `.gitignore` et versionnez les extraits et les condensés ; versionnez aussi les transcriptions si la reprise doit pouvoir se faire depuis une autre machine ou par une autre personne.

## Avant une pause

Quand l'utilisateur annonce une pause (« on s'arrête », « on reprend demain ») :

1. Propose de **valider ou d'abandonner le lot en cours** : un lot proposé mais non validé n'existe que dans la conversation.
2. Note la **prochaine action** dans `session.next_action` de l'état.
3. Rédige le **condensé** de la session (format ci-dessous) dans `.tizi/sessions/<date>-<session>.condense.md`, à partir de ce que vous venez de faire. Le nom de fichier suit celui de l'extrait que le hook produira : date du premier message et 8 premiers caractères de l'identifiant de session.
4. Rappelle de faire un commit.

## À la reprise

1. **Pause courte, même machine** : la reprise native de l'outil restaure la conversation entière — `claude --continue` ou `claude --resume` (Claude Code), `copilot --continue` ou `copilot --resume` (Copilot CLI), l'historique des sessions de chat (VS Code). C'est la reprise la plus fidèle ; les étapes suivantes restent utiles si la session avait été compactée.
2. Sinon, lance `node <chemin-du-skill>/scripts/status.mjs <document>/<slug>/state.yaml` : point d'étape déterministe (phase, compteurs par statut, zones d'ombre, questions ouvertes, prochaine action, dernières sessions).
3. Lis le **condensé** de la dernière session. Son absence est aussi rappelée par le hook de début de session, qui le signale pour chaque initiative concernée. Les outils cherchent le fichier sur le disque, pas le champ `condensed` de l'index : ce champ est écrit par le hook de capture, qui tourne après tout ce que l'agent a fait dans le tour — y compris le commit — et peut donc être vide alors que le condensé existe. S'il n'existe pas (session interrompue sans pause annoncée), rédige-le d'abord à partir de l'extrait, et fais-le valider à l'utilisateur.
4. Pour un détail qui manque, **cherche** plutôt que de tout relire : `node <chemin-du-skill>/scripts/session-search.mjs "agents du soir" --initiative brd/<slug> --who user`.
5. Présente le point d'étape à l'utilisateur : où l'on en est, ce qui restait en suspens, la prochaine action proposée. Il confirme avant que tu reprennes.

En cas de contradiction entre une session et l'état, **l'état l'emporte**. Signale l'écart à l'utilisateur plutôt que de le corriger toi-même.

## Format du condensé

```markdown
# Condensé de session — <date> — <initiative(s)>

## Ce qui a été fait
- <éléments proposés, validés, rejetés : identifiants et une ligne chacun>

## Ce qui a été décidé, et pourquoi
- <décision> — <raison, avec les mots de l'utilisateur quand ils comptent>

## Ce qui a été écarté, et pourquoi
- <option ou piste> — <raison>

## Paroles à garder mot pour mot
> <citation> — <qui, à propos de quoi>

## En suspens
- <question posée sans réponse, lot non validé, point à vérifier>

## Prochaine action
<une phrase>
```

Le condensé ne contient que ce qui s'est dit dans la session. Il ne remplace ni l'état ni l'extrait, et n'invente aucune raison qui n'a pas été donnée.
