import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, uniqueId, categoryId, tournamentId, unitIdFrom, nextUnitId } from '../js/core/ids.js';

test('slugify', () => {
  assert.equal(slugify('Demo Pairs'), 'demo-pairs');
  assert.equal(slugify('Multi-Word'), 'multi-word');
  assert.equal(slugify('2 Legs'), '2-legs');
  assert.equal(slugify('Olímpico'), 'olimpico');
});

test('uniqueId додає лічильник', () => {
  assert.equal(uniqueId('cup', ['cup', 'cup-2']), 'cup-3');
  assert.equal(uniqueId('x', []), 'x');
});

test('ідентифікатори категорій і турнірів', () => {
  assert.equal(categoryId('demo-sport', 'Knockout Round'), 'demo-sport-knockout-round');
  assert.equal(tournamentId('demo-sport-knockout-round', 'Grand Cup'), 'demo-sport-knockout-round-grand-cup');
});

test('ідентифікатори одиниць', () => {
  assert.equal(unitIdFrom(7), 'u007');
  assert.equal(unitIdFrom(1234), 'u1234');
  assert.equal(nextUnitId([]), 'u001');
  assert.equal(nextUnitId([{ id: 'u009' }, { id: 'u120' }]), 'u121');
});
