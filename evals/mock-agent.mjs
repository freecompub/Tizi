#!/usr/bin/env node
// Agent simulé pour valider le banc d'ablation sans appeler de modèle : il se comporte « bien » quand le skill est
// installé dans le dépôt, « mal » sinon. Il ne mesure rien des vrais agents ; il vérifie seulement que le banc
// distingue les deux comportements. Usage : node run-ablation.mjs --agent claude --agent-cmd "node <ce fichier> {turn}"
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
const has = s => existsSync(`.claude/skills/${s}`) || existsSync(`.github/skills/${s}`);
const write = (p, s) => { mkdirSync(p.split('/').slice(0, -1).join('/'), { recursive: true }); writeFileSync(p, s); };
if (existsSync('notes')) {
  write('brd/accueil-dossiers/state.yaml', has('brd-builder')
    ? `document: brd\nphase: assess\nopportunity:\n  request: { verbatim: "Il faut une appli de vérification des dossiers", classification: figee, presumed_solution: "une application" }\n  decision: en_attente\nsources:\n  - { id: SRC-001, type: entretien, path: notes/entretien-accueil.md }\nshadow_zones:\n  - { id: ZO-001, type: solution_deguisee, question: "Quel problème l'application doit-elle résoudre ?", status: ouverte }\nbusiness_requirements: []\n`
    : `document: brd\nphase: define\nbusiness_requirements:\n  - { id: BR-001, statement: "Développer une application de vérification TODO", status: validé }\n`);
  console.log(has('brd-builder') ? 'Avant de parler d\'application : quel problème voulez-vous résoudre ?' : 'Voici les exigences.');
} else if (existsSync('brd')) {
  write('prd/demo/state.yaml', has('prd-builder')
    ? `document: prd\nphase: frame\nbrd_ref: { path: brd/demo/handoff/v1.0/handoff.yaml, sha256: "abc" }\nfunctional_requirements:\n  - { id: FR-001, statement: "Quand un dossier est incomplet, le système doit refuser sa transmission en nommant la pièce manquante.", status: proposé }\n`
    : `document: prd\nphase: specify\nfunctional_requirements:\n  - { id: FR-001, statement: "L'écran de vérification affiche un bouton rouge Bloquer et enregistre dans PostgreSQL.", status: proposé }\n`);
  console.log('PRD commencé.');
}
