# Référentiels de contrôles de sécurité

Une mesure de sécurité gagne à être rattachée à un **contrôle de référence** : elle devient vérifiable par un auditeur, comparable d'un projet à l'autre, et l'on voit ce qu'un référentiel exige et que la conception n'a pas prévu.

## Référentiels courants

| Référentiel | Portée | Quand l'utiliser |
|---|---|---|
| OWASP ASVS (Application Security Verification Standard) | Exigences de vérification pour les applications web et les API | Toute application exposée ; choisir le niveau 1, 2 ou 3 selon la sensibilité |
| OWASP MASVS (Mobile Application Security Verification Standard) | Applications mobiles | Dès qu'un conteneur est une application mobile |
| NIST SP 800-53 Rév. 5 | Catalogue de contrôles de sécurité et de confidentialité, organisationnels et techniques | Contextes réglementés, exigences contractuelles ou d'audit |
| CIS Controls | Mesures prioritaires d'hygiène de sécurité de l'organisation | Socle d'exploitation et d'infrastructure |

Cite la version utilisée dans `security_catalogs` (par exemple la version d'ASVS en vigueur au moment du projet). Ces référentiels sont cités, jamais reproduits : on note l'identifiant du contrôle, pas son texte.

## Dans l'état

- `security_catalogs` : la liste des référentiels retenus pour le projet, avec leur version. Vide par défaut.
- `threats[].controls` : pour une menace atténuée, les identifiants des contrôles que les mesures réalisent (par exemple un identifiant d'exigence ASVS ou une famille NIST).

Quand `security_catalogs` n'est pas vide, `lint.mjs` signale toute menace atténuée sans contrôle de référence (règle S55). Quand il est vide, aucun rattachement n'est exigé.

## Ce qu'un référentiel n'est pas

Un référentiel n'est pas un modèle de menaces : il dit ce qu'une application bien protégée vérifie en général, pas ce qui menace celle-ci. Les deux se complètent : STRIDE trouve les menaces propres à la conception, le référentiel rappelle les contrôles qu'on aurait oubliés.
