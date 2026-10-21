# Matrice de couverture — Dossiers complets, REL-1, version candidate 1.0.0-rc1

Calculée le 2026-10-21 depuis le plan v1.0 et les rapports collectés. Une exigence n'est prouvée que par un test qui la référence et qui passe.

## Porte de release

|  | Condition | Détail |
|---|---|---|
| ✓ R1 | Toutes les suites collectées passent | unit : 1 test(s), 0 en échec ; acceptance : 3 test(s), 0 en échec ; e2e : 1 test(s), 0 en échec ; mutation : mutation 75 % ; security : 1 test(s), 0 en échec |
| ✓ R2 | Exigences prouvées (seuil 100 %) | 7/7 prouvées, 1 dérogation(s) |
| ✓ R3 | Mesures des NFR conformes | 1/1 |
| ✓ R4 | Parcours critiques couverts de bout en bout | 1/1 |
| ✓ R5 | Sessions exploratoires faites, sans constat bloquant ouvert | 1/1 faite(s), 0 bloquant(s) ouvert(s) |
| ✓ R6 | Score de mutation ≥ 60 % | 75 % |
| ✓ R7 | Analyses de sécurité sans constat | 0 constat(s) |

**Porte ouverte.** L'approbation de la release reste une déclaration humaine.

## Exigences

| Exigence | Type | Libellé | Statut | Preuves |
|---|---|---|---|---|
| EX-001 | exemple | Sans justificatif | prouvé | acceptance : test [EX-001][AC-001] sans justificatif, la transmission est refusée avec le motif (ok) |
| EX-002 | exemple | Avec justificatif | prouvé | acceptance : test [EX-002] dossier complet, le dossier est transmis (ok) |
| AC-001 | critère | Refus | prouvé | acceptance : test [EX-001][AC-001] sans justificatif, la transmission est refusée avec le motif (ok) |
| EX-003 | exemple | Notification | **dérogation** | — |
| EX-004 | exemple | Message clair | prouvé | acceptance : test [EX-004] le message nomme la pièce manquante (ok) |
| NR-01 | NFR | NFR-001 — test_charge : p95 transmission | prouvé | p95 = 1,4 s / cible p95 < 2 s |
| TH-001 | sécurité | sessions courtes ; MFA | prouvé | security : zap [TH-001] sessions expirées après inactivité (ok) |
| PJ-01 | parcours | Transmettre un dossier | prouvé | e2e : e2e [PJ-01] transmettre un dossier de bout en bout (ok) |

## Sessions exploratoires

| Session | Charte | Statut | Constats |
|---|---|---|---|
| XS-01 | Explorer la transmission avec des coupures réseau pour découvrir pertes ou doublons | faite | mineur : pas de message pendant la reprise (US-006) |

## Dérogations

| Exigence | Raison | Approuvée par |
|---|---|---|
| EX-003 | US-002 retenue (question ouverte), reportée à la release suivante | Alice |
