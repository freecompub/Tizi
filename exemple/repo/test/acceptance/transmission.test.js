import { test } from 'node:test'; import assert from 'node:assert/strict';
import { transmettre } from '../../src/completude/index.js';
test('[EX-001][AC-001] sans justificatif, la transmission est refusée avec le motif', () => { assert.deepEqual(transmettre({ pieces: [] }), { ok: false, motif: 'justificatif_domicile' }); });
test('[EX-002] dossier complet, le dossier est transmis', () => { assert.deepEqual(transmettre({ pieces: ['justificatif_domicile'] }), { ok: true }); });
test('[EX-004] le message nomme la pièce manquante', () => { assert.equal(transmettre({ pieces: [] }).motif, 'justificatif_domicile'); });
