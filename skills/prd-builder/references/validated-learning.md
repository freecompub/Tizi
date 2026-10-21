# Tester avant de spécifier (apprentissage validé)

La plupart des idées ne produisent pas l'effet espéré. Plutôt que de le découvrir après des semaines de développement, on teste les **hypothèses risquées** par la plus petite expérience possible, en heures ou en jours, avant de rédiger les exigences fonctionnelles.

Sources : Jeff Patton, *User Story Mapping*, ch. 3 et 15 ; Eric Ries, *The Lean Startup* (boucle construire–mesurer–apprendre) ; démarche de design thinking (IDEO, d.school), reformulés.

## Quand tester

Seulement quand c'est utile. Pour chaque hypothèse du PRD (`H-xxx`), fais préciser :

- le **type** (`kind`) :
  - `valeur` : les utilisateurs ont-ils vraiment ce problème, et la solution les intéresse-t-elle ?
  - `usage` : sauront-ils s'en servir pour accomplir leur tâche ?
  - `viabilite` : l'organisation y gagnera-t-elle (adoption, coût, revenu) ?
  - `faisabilite` : peut-on le construire ? Ce type relève des spikes de la conception, pas de ce fichier ;
- le **risque** (`risk`) : `fort` si, l'hypothèse étant fausse, il faudrait repenser le produit ou le MVP ; sinon `moyen` ou `faible`.

Une hypothèse de `valeur` ou d'`usage` à risque `fort` doit être **testée ou assumée** avant de passer en Specify. Les autres peuvent l'être, sans obligation. `lint.mjs` le signale (règle S57).

## Concevoir le plus petit test

| Méthode (`method`) | Teste surtout | Coût |
|---|---|---|
| `entretien` | Le problème existe-t-il, comment font-ils aujourd'hui ? | Heures |
| `bd_conception` | La solution répond-elle au problème ? (scénario en quelques vignettes, commenté avec l'utilisateur) | Heures |
| `prototype_papier` | Le parcours a-t-il du sens ? | Heures |
| `prototype_cliquable` | Peuvent-ils accomplir la tâche ? | Jours |
| `test_usage` | Sur un prototype ou un logiciel existant, avec une vraie tâche à accomplir | Jours |
| `concierge` | La valeur existe-t-elle, en rendant le service à la main avant de l'automatiser | Jours à semaines |
| `faux_bouton` | Y a-t-il une demande, en mesurant l'intérêt pour une fonction pas encore construite | Jours |
| `analytique` | Que font-ils vraiment dans le produit actuel ? | Heures à jours |

Pour chaque test, écris **avant** de le lancer : le public (qui, combien), et le **critère de réussite** — ce qu'on doit observer pour considérer l'hypothèse confirmée. Sans critère écrit à l'avance, on lit toujours le résultat qu'on espérait.

## Règles

- **Le support le plus brut qui teste l'hypothèse.** Une ligne, un croquis au trait, une BD de quelques vignettes. Un support soigné attire des remarques sur l'apparence, et l'équipe qui l'a soigné a du mal à le jeter.

- **Un test n'est ni une démonstration ni une vente.** L'utilisateur accomplit une vraie tâche ou réagit à un vrai problème ; on observe ce qu'il fait plus que ce qu'il dit. Les gens sont polis : ils disent aimer et n'utilisent pas.
- **Le prototype est un instrument de test, pas une exigence.** Il est conservé comme source (`SRC-xxx`, type `test`), avec ses résultats. Le PRD continue de décrire des comportements, sans écrans.
- **Celui qui teste n'est pas le seul à interpréter.** Les résultats sont présentés avec les observations brutes, pas seulement la conclusion.
- **Avoir tort tôt est une bonne nouvelle.** Une hypothèse infirmée en deux jours épargne des semaines de développement. Ne pas apprendre est le vrai échec.

## Après le test

Renseigne `test.result` (`confirmee`, `infirmee`, `ambigue`), les observations, la source. Puis :

- `confirmee` → l'hypothèse passe à `confirmée` ;
- `infirmee` → l'hypothèse passe à `infirmée` ; revois les personas, les parcours, la story map ou le MVP qu'elle fondait ;
- `ambigue` → conçois un test plus net, ou assume l'hypothèse avec une raison et un risque associé.

Une hypothèse assumée sans test (`status: assumée`) porte toujours une raison et devient un risque suivi.
