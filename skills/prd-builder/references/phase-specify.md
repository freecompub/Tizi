# Phase Specify

**But** : spécifier ce que le produit doit faire et à quel niveau de qualité — exigences fonctionnelles en EARS, critères d'acceptation en Gherkin, exigences non fonctionnelles mesurables, contraintes, décisions produit, métriques.

Ordre conseillé : release par release, en commençant par le MVP ; dans une release, parcours par parcours.

---

## 1. Exigences fonctionnelles (`FR-xxx`)

1. Pour chaque tâche de la story map, propose les exigences nécessaires, rédigées selon `references/ears.md` (choisis le motif et renseigne `pattern`).
2. Chaque exigence renseigne : l'acteur (`PER-xx` ou système externe), les objectifs produit, les parcours, la release, la priorité.
3. **Traçabilité amont** :
   - mode chaîné : au moins une `BR` dans `brd_requirements` ;
   - sinon (ou en mode autonome) : une origine (`origin`) — source `SRC` ou décision produit `DD`.
   Une exigence sans aucune origine est probablement de l'inflation de périmètre : enregistre une zone d'ombre `exigence_sans_origine` et demande à l'utilisateur de la justifier ou de l'écarter. En mode chaîné, si elle est justifiée par un besoin métier absent du BRD, propose une demande de changement vers le BRD.
4. Une exigence = un comportement. Si l'énoncé contient « et », vérifie s'il faut la scinder.
5. Bannis les termes vagues (« rapide », « intuitif », « facile », « etc. », « si possible ») : remplace-les par un comportement ou une NFR mesurable.
6. Avant de présenter un lot, lance `node <chemin-du-skill>/scripts/lint.mjs prd/<slug>/state.yaml --id <FR du lot>`. Corrige ce qui relève de la forme ; montre le reste avec l'exigence.
7. Format de présentation :

   ```
   FR-012 (proposé) — Must — REL-1
   Quand un agent transmet un dossier incomplet, le système doit
   lui indiquer la liste des pièces manquantes avant la transmission.
   • Acteur : PER-01 · Parcours : PJ-02 · Objectif : GOAL-01
   • Origine : BR-001 · Règles : RG-003
   ⚠ [L03] « et » : l'énoncé contient peut-être plusieurs exigences
   → Valider, modifier ou rejeter ?
   ```

---

## 2. Critères d'acceptation (`AC-xxx`)

1. Pour chaque exigence validée, propose 1 à 4 scénarios Gherkin (Given / When / Then), chacun avec son propre `AC-xxx`.
2. Couvre au moins : le cas nominal, et pour les exigences Must, un cas d'erreur ou de refus (motif EARS `unwanted`). Renseigne `kind: nominal` ou `kind: erreur`.
3. Les scénarios décrivent ce qu'on observe, pas comment le système est construit : pas de nom de bouton technique, d'API, de table.
4. Valeurs concrètes dans les exemples (« un dossier sans justificatif de domicile ») plutôt que génériques.

Ces scénarios alimenteront directement les tests de l'étape 6 du SDLC.

---

## 3. Exigences non fonctionnelles (`NFR-xxx`)

1. Parcours les catégories de `references/nfr-taxonomy.md` avec l'utilisateur ; ne propose que celles qui s'appliquent, mais demande explicitement pour les catégories souvent oubliées (accessibilité, observabilité, exploitabilité, confidentialité).
2. Chaque NFR a une **métrique, une cible et un moyen de mesure**. « Le système doit être rapide » n'est pas une NFR ; « 95 % des recherches renvoient un résultat en moins de 2 s, mesuré côté serveur sur 7 jours glissants » en est une.
3. Une NFR sans cible chiffrée devient une zone d'ombre `nfr_non_mesurable`.
4. Rattache chaque NFR aux FR concernées (ou indique qu'elle est globale) et, en mode chaîné, aux `BR` d'origine.

---

## 4. Contraintes (`CON-xx`) et décisions produit (`DD-xx`)

- **Contrainte** : une limite imposée de l'extérieur, non négociable dans ce projet (loi, contrat, norme, plateforme imposée, date réglementaire). Indique qui l'impose. Une contrainte n'est pas une NFR : la NFR est un niveau de qualité choisi, la contrainte est subie.
- **Décision produit** : un arbitrage pris pendant la construction du PRD (ce qu'on fait ou pas, et pourquoi), avec les alternatives écartées. Enregistre-la dès qu'un choix de périmètre, de priorité ou de comportement est tranché. Les décisions d'architecture n'y vont pas : elles relèvent des ADR de la conception.

### Règles métier : automatiser ou non

Pour chaque règle métier (`business_rules`), fais décider `automation` :
- `automatisée` : le produit la fait respecter ; au moins une FR la référence dans `business_rules` (sinon zone `regle_non_couverte`). Pour une règle de comportement, le niveau d'application dicte le comportement attendu : `stricte` → l'action est refusée (motif EARS `unwanted`, scénario d'erreur) ; `derogation_autorisee` → seul un acteur habilité passe outre ; `derogation_justifiee` → le produit demande et conserve la justification ; `indicative` → le produit avertit sans bloquer ;
- `manuelle` : la règle reste appliquée par les personnes ; note pourquoi (`automation_rationale`).

Une règle de définition (calcul, inférence) automatisée se traduit en FR dont les critères donnent des valeurs d'exemple calculées. Ne réécris pas la règle dans la FR : référence-la, pour qu'un changement de règle se répercute par la traçabilité.

### Décisions et conflits

Toute décision produit indique ses options écartées et **qui l'a rendue** (`decided_by`), issu de `decision_rights`. Un conflit entre parties prenantes suit « Conflits : qui tranche » dans `references/shadow-zones.md`.

---

## 5. Métriques (`MET-xx`)

Pour chaque objectif produit : définition précise, valeur actuelle, cible, fenêtre de mesure, source de données et **événements à instrumenter**. Une métrique dont la source n'existe pas encore génère une exigence (FR ou NFR d'observabilité) pour la créer.

---

## 6. Couverture

Signale sous forme de questions, sans verdict :
- mode chaîné : chaque `BR` non `wont` est couverte par au moins une FR ou NFR ; sinon zone d'ombre `br_non_couverte` ;
- chaque FR a au moins un AC ; chaque FR Must a un scénario d'erreur ;
- chaque objectif produit a au moins une FR et une métrique ;
- chaque tâche de la story map est couverte par au moins une FR ;
- chaque règle métier a une décision d'automatisation, et chaque règle `automatisée` est couverte par une FR.

---

## 7. Priorités

1. Mode chaîné : la priorité d'une FR découle par défaut de celle de ses `BR` ; un écart (FR Must issue d'une BR Should, ou l'inverse) doit être justifié par une décision produit.
2. Toute FR de la release MVP est Must ou Should ; une FR Could dans le MVP est un signal de redécoupage.
3. L'utilisateur arbitre.

---

## 8. Risques, hypothèses, glossaire

- Risques produit : adoption, usage détourné, dépendance externe, données manquantes. Reprends en mode chaîné les risques du BRD qui pèsent sur le produit.
- Hypothèses : celles du MVP en premier.
- Glossaire : aligne-le sur celui du BRD en mode chaîné.

---

## 9. Council

Après la spécification du MVP, **lance** un council en mode `specification` (`references/council.md`) : cas limites, états d'erreur, NFR oubliées, testabilité, inflation de périmètre. Le council ne se demande pas : son moment est prescrit, et la vérification qui cherche ce que tu as manqué ne peut pas dépendre de ton accord. L'utilisateur n'est sollicité qu'au triage des questions.

---

## Générer le PRD

Après chaque section validée et à la demande :

```
node <chemin-du-skill>/scripts/render-prd.mjs prd/<slug>/state.yaml [--include-proposed]
```

Le document comprend la matrice de couverture (BR → FR/NFR → AC en mode chaîné, GOAL → FR → AC en mode autonome). Mets à jour `prd_sections` au fil des validations.

---

## Fin de la phase

**Propose** le passage à Govern quand :
- le council en mode specification a été passé, et ses questions enregistrées comme zones d'ombre ;
- toutes les sections de `prd_sections` sont validées ;
- chaque FR validée a une origine, au moins un AC, une release et une priorité ;
- chaque NFR validée a une métrique, une cible et un moyen de mesure ;
- en mode chaîné, chaque `BR` non `wont` est couverte, ou son absence est assumée et justifiée ;
- aucune règle métier n'est restée `à_décider` ;
- `lint.mjs` a été lancé sur l'état complet ; chaque avertissement restant est corrigé ou couvert par une dérogation ;
- aucune zone d'ombre bloquante n'est ouverte ;
- le PRD a été régénéré après la dernière validation.

Si l'utilisateur accepte, passe `phase: govern`.
