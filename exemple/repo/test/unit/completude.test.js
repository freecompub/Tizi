import { test } from 'node:test'; import assert from 'node:assert/strict';
import { manquants } from '../../src/completude/index.js';
test('détecte le justificatif de domicile manquant', () => { assert.deepEqual(manquants({ pieces: [] }), ['justificatif_domicile']); });
