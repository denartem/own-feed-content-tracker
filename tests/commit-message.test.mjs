import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commitMessage, pluralUk } from '../js/core/commit-message.js';

test('pluralUk', () => {
  assert.deepEqual([1, 2, 5, 11, 21, 22, 25].map((n) => pluralUk(n, ['пара', 'пари', 'пар'])),
    ['пара', 'пари', 'пар', 'пар', 'пара', 'пари', 'пар']);
});

test('одна зміна статусу', () => {
  const doc = { units: [{ id: 'u1', a: 'Team Alpha', b: 'Team Beta' }] };
  assert.equal(commitMessage('Cup A', [{ type: 'setStatus', unitId: 'u1', from: 'in progress', to: 'done' }], doc),
    'Cup A: Team Alpha – Team Beta in progress → done');
});

test('масова однакова зміна', () => {
  const doc = { units: Array.from({ length: 12 }, (_, i) => ({ id: `u${i}`, a: `A${i}`, b: `B${i}` })) };
  const ops = doc.units.map((u) => ({ type: 'setStatus', unitId: u.id, from: 'to do', to: 'done' }));
  assert.equal(commitMessage('South League', ops, doc), 'South League: 12 пар to do → done');
});

test('додавання й змішані зміни', () => {
  assert.equal(commitMessage('T', [{ type: 'addUnits', units: [{}, {}] }], { units: [] }), 'T: додано 2 одиниці');
  assert.equal(commitMessage('T', [{ type: 'setNotes' }, { type: 'setStrength' }], { units: [] }), 'T: 2 зміни');
});
