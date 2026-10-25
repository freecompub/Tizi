# Phase Design

**But** : décider et structurer — les choix d'architecture justifiés en ADR, les conteneurs et composants, l'allocation de chaque FR, une réponse vérifiable à chaque NFR, les données classifiées, les contrats d'interface et le modèle de menaces.

Ordre conseillé : décisions structurantes d'abord (les moteurs haute importance / haute difficulté), puis conteneurs, allocation, réponses aux NFR, données et contrats, menaces en dernier, sur le modèle stabilisé. Les étapes se répondent : une menace peut appeler une décision, une décision peut ajouter un conteneur.

---

## 1. Décisions d'architecture (`ADR-xxx`)

Suis `references/adr.md`.

1. Une question appelle un ADR si elle est **coûteuse à défaire** ou si elle sert un moteur architectural : style d'architecture, découpage en déployables, persistance, communication synchrone ou asynchrone, identité, hébergement, intégration d'un système externe, réutilisation ou remplacement d'un existant.
2. Pour chaque ADR, propose : le contexte, les moteurs concernés (`drivers`, jamais vide), **au moins deux options** avec avantages et inconvénients rattachés aux moteurs, la conséquence de chaque option sur les moteurs mal servis. Réutiliser l'existant, acheter ou ne rien changer sont des options à envisager.
3. Si une option repose sur une affirmation non prouvée (performance d'un composant, limite d'un service externe), enregistre une hypothèse `validation: spike` et une zone `hypothese_technique`. Ne fais pas trancher un ADR qui repose sur une hypothèse bloquante non vérifiée.
4. Tu présentes les options, tu ne recommandes que si l'utilisateur te le demande, et alors en disant ce que ta recommandation sacrifie. La décision est rendue par le décideur `architecture` ; enregistre `outcome`, `justification`, `consequences`, `confirmation`, `decided_by` et la date quand l'utilisateur la déclare, puis passe l'ADR à `accepté`.
5. Un ADR accepté n'est jamais réécrit : on le remplace par un nouvel ADR (`supersedes`) et l'ancien passe à `remplacé`.

---

## 2. Conteneurs et composants (C4 niveaux 2 et 3)

Suis `references/c4-modelling.md`.

1. Propose les conteneurs (unités déployables ou exécutables) qui découlent des ADR acceptés, avec leur technologie et le contexte délimité qu'ils réalisent. Un contexte délimité n'est jamais réparti dans un découpage qui l'oblige à partager une base avec un autre contexte sans décision explicite.
2. Ne descends au niveau composant que pour les conteneurs où la structure interne porte un moteur ou une règle métier ; ailleurs, le niveau conteneur suffit.
3. Crée les relations dans le sens de la dépendance (l'initiateur appelle la dépendance), avec la technologie seulement si elle est décidée.

---

## 3. Allocation des FR

1. Alloue chaque FR du PRD (hors `wont`) à au moins un conteneur ou composant (`frs`). Une FR qui traverse plusieurs éléments est allouée à chacun ; la relation qui les relie doit exister.
2. Une FR sans élément est une zone `fr_non_allouee`. Un élément sans FR ni moteur ni rôle technique explicite (passerelle, observabilité) est un candidat à la suppression : demande-le.
3. Chaque règle métier automatisée doit être garantie dans le conteneur qui réalise le contexte de son agrégat.

---

## 4. Réponses aux NFR (`NR-xx`)

1. Pour chaque NFR du PRD, propose une réponse : les **tactiques** retenues, les éléments qui les portent, les ADR qui les fondent.
2. Chaque réponse précise sa **vérification** : la méthode (test de charge, fitness function, test de sécurité, analyse statique, revue, monitoring, test de restauration), ce qui est mesuré, et l'étape du SDLC où elle sera faite. Ces vérifications alimentent directement les étapes 6 à 10.
3. Une NFR sans réponse est une zone `nfr_sans_reponse`. Une NFR dont la cible paraît inatteignable au regard des choix est une zone `conflit_amont` : la cible appartient au PRD, la conception ne la baisse pas d'elle-même.

---

## 5. Données (`DAT-xx`)

1. Liste les données métier par contexte, avec le conteneur qui en est la source de vérité. Une donnée détenue par deux conteneurs sans décision de réplication explicite est une zone `frontiere_floue`.
2. Classe chaque donnée : `publique`, `interne`, `confidentielle`, `personnelle`, `sante`. Fixe la durée de conservation et son déclencheur ; si elle n'est pas connue, adresse la question au responsable désigné (DPO, juridique).
3. Le modèle de données détaillé (schéma, index) n'est pas l'objet de cette étape : seules les entités, leur propriétaire, leur classification et leur conservation le sont.

---

## 6. Interfaces et contrats (`API-xx`, `OP-xxx`)

1. Pour chaque relation qui franchit la frontière d'un conteneur, décide s'il y a un contrat : appel synchrone (`openapi`) ou événement (`asyncapi`).
2. Liste les opérations : nom (`POST /dossiers`, `DossierTransmis`), but, FR servies, données échangées, authentification. Une opération sans FR est un signal d'inflation, comme une FR sans origine dans le PRD.
3. En brownfield, un contrat existant consommé par d'autres est une contrainte héritée : le modifier exige un ADR et une stratégie de compatibilité.
4. `render-sad.mjs` génère un squelette de contrat par interface dans `contracts/`. Le contrat complet (schémas, codes d'erreur) s'écrit à l'implémentation, à partir de ce squelette.

---

## 7. Menaces (STRIDE)

Suis `references/stride.md`.

1. Définis les frontières de confiance (`TB-xx`) sur le modèle C4.
2. Pour chaque relation qui franchit une frontière, et pour chaque conteneur qui stocke une donnée `personnelle` ou `sante`, passe les six catégories STRIDE. Enregistre chaque menace plausible (`TH-xxx`) avec sa cible, sa vraisemblance et son impact.
3. Pour chaque menace, propose un traitement : atténuer (avec les mesures), éviter (en changeant la conception, donc un ADR), transférer, ou accepter. Une acceptation n'est enregistrée qu'avec le décideur `acceptation_risque_securite` déclaré par l'utilisateur.
4. Si le projet a retenu des référentiels de contrôles (`security_catalogs`, `references/security-controls.md`), rattache chaque menace atténuée aux contrôles que ses mesures réalisent (`controls`). Passe aussi le référentiel en revue pour repérer les contrôles attendus qu'aucune mesure ne couvre : ce sont des menaces oubliées ou des exigences à remonter au PRD.
5. Une mesure qui change le comportement observable du produit (double authentification, verrouillage de compte, journal consultable) n'est pas une décision de conception seule : elle appelle une demande de changement au PRD.

---

## 8. Council

Après les menaces, **lance** un council en mode `conception` (`references/council.md`). Le council ne se demande pas : son moment est prescrit, et la vérification qui cherche ce que tu as manqué ne peut pas dépendre de ton accord. L'utilisateur n'est sollicité qu'au triage des questions.

---

## Générer le SAD

Après chaque lot validé et à la demande :

```
node <chemin-du-skill>/scripts/render-sad.mjs sad/<slug>/state.yaml [--include-proposed]
```

Le script produit `sad.md` (vues C4 en Mermaid, actuelles et cibles en brownfield), un fichier MADR par ADR dans `adr/`, et un squelette de contrat par interface dans `contracts/`. Mets à jour `sad_sections` au fil des validations.

---

## Fin de la phase

**Propose** le passage à Govern quand :

- chaque moteur validé est servi par au moins un ADR accepté ou une réponse à une NFR ;
- chaque ADR accepté a au moins deux options, des moteurs, un décideur et un moyen de confirmation ;
- chaque FR non `wont` est allouée ; chaque NFR a une réponse avec sa vérification ;
- chaque donnée a un propriétaire, une classification et une conservation ;
- chaque opération d'interface sert au moins une FR ;
- chaque menace a un traitement, et chaque acceptation un décideur ;
- le council en mode conception a été passé, et ses questions enregistrées comme zones d'ombre ;
- aucune hypothèse bloquante n'attend de spike sans zone d'ombre assumée ;
- toutes les sections de `sad_sections` sont validées ; le SAD a été régénéré ;
- `lint.mjs` a été lancé ; chaque avertissement restant est corrigé ou couvert par une dérogation.

Si l'utilisateur accepte, passe `phase: govern`.
