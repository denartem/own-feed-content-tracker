import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanName, foldName, sameName, compareNames, isAlphabetical, findInPool, sortPool, poolText } from '../js/core/names.js';

test('cleanName замінює _ на пробіл і стискає пробіли', () => {
  assert.equal(cleanName('  NORTH_CITY  '), 'NORTH CITY');
  assert.equal(cleanName('FC__DELTA'), 'FC DELTA');
  assert.equal(cleanName(null), '');
});

test('foldName ігнорує регістр і діакритику', () => {
  assert.equal(foldName('Olímpico Norte'), 'OLIMPICO NORTE');
  assert.ok(sameName('olimpico_norte', 'Olímpico Norte'));
});

test('compareNames: пробіл іде раніше за літери', () => {
  assert.equal(compareNames('AL NORTE', 'ALTON TOWN'), -1);
  assert.equal(compareNames('RIVER UNITED', 'RIVER CITY'), 1);
  assert.equal(compareNames('Nova', 'NOVA'), 0);
});

test('isAlphabetical', () => {
  assert.equal(isAlphabetical('ALPHA', 'CHARLIE'), true);
  assert.equal(isAlphabetical('LIMA', 'ALPHA'), false);
  assert.equal(isAlphabetical('Player One', null), true);
});

test('findInPool знаходить учасника без урахування написання', () => {
  const pool = [{ name: 'Olímpico Norte', strength: 0.5 }];
  assert.deepEqual(findInPool(pool, 'OLIMPICO_NORTE'), pool[0]);
  assert.equal(findInPool(pool, 'Bravo'), null);
});

test('sortPool упорядковує учасників за назвою і не змінює пул', () => {
  const pool = [{ name: 'LIMA', strength: 0.2 }, { name: 'Olímpico Norte', strength: null }, { name: 'ALPHA', strength: 0.5 }];
  assert.deepEqual(sortPool(pool).map((m) => m.name), ['ALPHA', 'LIMA', 'Olímpico Norte']);
  assert.deepEqual(pool.map((m) => m.name), ['LIMA', 'Olímpico Norte', 'ALPHA']);
});

test('poolText: усі учасники за алфавітом, по одному в рядку', () => {
  const pool = [{ name: 'LIMA', strength: 0.2 }, { name: 'Olímpico Norte', strength: null }, { name: 'ALPHA', strength: 0.5 }];
  assert.equal(poolText(pool), 'ALPHA\nLIMA\nOlímpico Norte');
  assert.equal(poolText([]), '');
});
