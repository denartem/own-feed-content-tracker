import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strengthParams, formatStrength, sameStrength, withParam } from '../js/core/strength.js';

test('strengthParams: масив назв або порожній', () => {
  assert.deepEqual(strengthParams({ strength: true, strengthParams: ['2PT', '3PT'] }), ['2PT', '3PT']);
  assert.deepEqual(strengthParams({ strength: true }), []);
  assert.deepEqual(strengthParams(null), []);
});

test('formatStrength: число, параметри, порожнє', () => {
  assert.equal(formatStrength(0.3, []), '0.3');
  assert.equal(formatStrength(null, []), '—');
  assert.equal(formatStrength({ '2PT': 66.6, '3PT': 33.4 }, ['2PT', '3PT']), '2PT 66.6 · 3PT 33.4');
  assert.equal(formatStrength({ '2PT': 66.6 }, ['2PT', '3PT']), '2PT 66.6 · 3PT —');
  assert.equal(formatStrength(null, ['2PT', '3PT']), '—');
});

test('sameStrength і withParam', () => {
  assert.equal(sameStrength({ x: 1 }, { x: 1 }), true);
  assert.equal(sameStrength({ x: 1 }, { x: 2 }), false);
  assert.equal(sameStrength(null, null), true);
  assert.deepEqual(withParam(null, ['2PT', '3PT'], '3PT', 33.4), { '2PT': null, '3PT': 33.4 });
  assert.deepEqual(withParam({ '2PT': 66.6, '3PT': 1 }, ['2PT', '3PT'], '3PT', null), { '2PT': 66.6, '3PT': null });
});
