# Revue de code par agents

Avant la revue humaine, une revue par agents examine le changement sous plusieurs perspectives, chacune dans un **contexte neuf**. Méthode reprise de la revue de code et du vérificateur de constats de hve-core, adaptée à notre fiche de contexte : le code est comparé à ce que le SDLC a décidé (FR, critères, exemples, règles, ADR, contrats, menaces), pas à des préférences.

## Les quatre principes

1. **Le sous-agent propose, le parent vérifie.** Chaque perspective rend des constats ; tu les vérifies avant d'en retenir un. La décision finale revient à l'humain.
2. **Indépendance.** Chaque perspective est lancée séparément, sans voir les constats des autres.
3. **Vérification adversariale.** Tout constat bloquant ou majeur est soumis à `finding-verifier`, qui cherche à le réfuter. Un constat réfuté est écarté avec sa preuve contraire.
4. **Aucun score de confiance.** Seuls comptent l'emplacement, la preuve et le manque de preuve nommé. `review-merge.mjs` retire et signale toute mention de confiance.

## Déroulé

1. `node <chemin-du-skill>/scripts/review-context.mjs impl/<slug>/state.yaml --task TK-xxx` : rattache la revue au commit et au diff exacts, repère les zones à risque, liste les mutants survivants, choisit les perspectives et écrit `impl/<slug>/review/TK-xxx/packet.md`.
2. Lance chaque perspective comme **sous-agent** (Claude Code ou GitHub Copilot), avec le dossier pour seule entrée : `review-functional`, `review-architecture`, `review-tests`, et `review-security` quand des zones à risque ou des menaces sont en jeu. Écris la réponse de chacun telle quelle dans `findings/<perspective>.yaml`. Sans sous-agents, traite les perspectives une par une en repartant du dossier seul, et préviens que l'indépendance est moindre.
3. Relève les constats bloquants et majeurs et transmets-les à `finding-verifier` (sous-agent, contexte neuf, sans le raisonnement des perspectives). Écris sa réponse dans `verifications.yaml`.
4. `node <chemin-du-skill>/scripts/review-merge.mjs impl/<slug>/state.yaml --task TK-xxx` : contrôle la forme des constats, retire les mentions de confiance, applique les vérifications, fusionne les doublons et rend le verdict :
   - **vérification incomplète** : un constat grave n'a pas été vérifié ;
   - **corrections requises** : au moins un constat bloquant confirmé ;
   - **prête pour la relecture humaine**.
5. Présente `review.md` à l'utilisateur, constat par constat pour les graves. Une correction repasse par le cycle rouge–vert. Si le code change, la revue est **périmée** : `review-merge.mjs` refuse de fusionner, et il faut la relancer.

La porte de PR exige cette revue quand `review.required: true` dans `impl/config.yaml` (condition C8). Elle ne remplace jamais la revue humaine : elle la prépare.
