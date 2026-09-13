import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unitKey, unitLabel, newUnit, generateUnits } from '../js/core/pairs.js';

test('unitKey не залежить від порядку, регістру й _', () => {
  assert.equal(unitKey('Lima', 'ALPHA'), unitKey('alpha', 'LIMA'));
  assert.equal(unitKey('NORTH_CITY', 'Bravo'), unitKey('bravo', 'North City'));
  assert.equal(unitKey('Player One', null), 'PLAYER ONE');
});

test('unitLabel', () => {
  assert.equal(unitLabel({ a: 'LIMA', b: 'ALPHA' }), 'LIMA – ALPHA');
  assert.equal(unitLabel({ a: 'Player One', b: null }), 'Player One');
});

test('newUnit', () => {
  assert.deepEqual(newUnit('u005', 'A', 'B', 'done', '2026-09-12', 'перенесено'), {
    id: 'u005', a: 'A', b: 'B', status: 'done', priority: null, videos: null, note: '',
    updatedAt: '2026-09-12', history: [{ at: '2026-09-12', event: 'перенесено' }],
  });
});

test('generateUnits додає лише відсутні пари, за алфавітом', () => {
  const doc = {
    pool: [{ name: 'LIMA' }, { name: 'ALPHA' }, { name: 'CHARLIE' }],
    units: [{ id: 'u001', a: 'LIMA', b: 'ALPHA', status: 'done' }],
  };
  const added = generateUnits(doc, 'pair', '2026-09-12');
  assert.deepEqual(added.map((u) => [u.id, u.a, u.b, u.status]), [
    ['u002', 'ALPHA', 'CHARLIE', 'to do'],
    ['u003', 'CHARLIE', 'LIMA', 'to do'],
  ]);
  assert.equal(added[0].history[0].event, 'згенеровано');
});

test('generateUnits для гравців додає відсутніх учасників', () => {
  const doc = { pool: [{ name: 'B' }, { name: 'A' }], units: [{ id: 'u001', a: 'A', b: null, status: 'done' }] };
  assert.deepEqual(generateUnits(doc, 'player', '2026-09-12').map((u) => [u.a, u.b]), [['B', null]]);
});
