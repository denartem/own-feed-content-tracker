import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLine, parseList, planPaste } from '../js/core/parse-list.js';

const pick = (r) => [r.kind, r.a, r.b, r.known];

test('формати зі списків користувача', () => {
  assert.deepEqual(pick(parseLine('LIMA_TANGO', ['LIMA', 'TANGO'])), ['pair', 'LIMA', 'TANGO', true]);
  assert.deepEqual(pick(parseLine('NORTH_CITY-OLIMPICO_NORTE', ['NORTH CITY', 'OLIMPICO NORTE'])), ['pair', 'NORTH CITY', 'OLIMPICO NORTE', true]);
  assert.deepEqual(pick(parseLine('RIVER CITY THUNDER_LAKE TOWN BULLS', ['LAKE TOWN BULLS', 'RIVER CITY THUNDER'])), ['pair', 'RIVER CITY THUNDER', 'LAKE TOWN BULLS', true]);
  assert.deepEqual(pick(parseLine('Alpha - Saint-Lima United', ['Alpha', 'Saint-Lima United'])), ['pair', 'Alpha', 'Saint-Lima United', true]);
  assert.deepEqual(pick(parseLine('1. North Bears - South Owls', ['North Bears', 'South Owls'])), ['pair', 'North Bears', 'South Owls', true]);
  assert.deepEqual(pick(parseLine('**Team Alpha - Team Beta**', ['Team Alpha', 'Team Beta'])), ['pair', 'Team Alpha', 'Team Beta', true]);
});

test('назви з пулу повертаються в написанні пулу', () => {
  assert.deepEqual(pick(parseLine('OLIMPICO_NORTE - bravo', ['Olímpico Norte', 'Bravo'])), ['pair', 'Olímpico Norte', 'Bravo', true]);
});

test('невідомі назви: перший роздільник з пробілами', () => {
  assert.deepEqual(pick(parseLine('Saint-Lima United - North City', [])), ['pair', 'Saint-Lima United', 'North City', false]);
  assert.deepEqual(pick(parseLine('NEW-OTHER', [])), ['pair', 'NEW', 'OTHER', false]);
});

test('нерозпізнані й порожні рядки', () => {
  assert.equal(parseLine('ALPHA', ['ALPHA']).kind, 'unrecognized');
  assert.equal(parseLine('ONE_TWO', []).kind, 'unrecognized');
  assert.equal(parseLine('   ', []), null);
});

test('одиночні одиниці', () => {
  assert.deepEqual(pick(parseLine('player one', ['Player One'], 'player')), ['single', 'Player One', undefined, true]);
  assert.deepEqual(pick(parseLine('New Player', ['Player One'], 'player')), ['single', 'New Player', undefined, false]);
});

test('parseList пропускає порожні рядки', () => {
  assert.equal(parseList('A - B\n\n  \nC - D\r\n', ['A', 'B', 'C', 'D']).length, 2);
});

test('planPaste', () => {
  const doc = {
    pool: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
    units: [
      { id: 'u001', a: 'A', b: 'B', status: 'to do' },
      { id: 'u002', a: 'A', b: 'C', status: 'done' },
    ],
  };
  const parsed = parseList('B-A\nC - A\nA - B\nB - D\nnonsense', doc.pool.map((m) => m.name));
  const plan = planPaste(doc, parsed, { status: 'done', addMissing: true });
  assert.deepEqual(plan.updates, [{ unitId: 'u001', from: 'to do', to: 'done' }]);
  assert.equal(plan.unchanged, 1);
  assert.deepEqual(plan.additions, [{ a: 'B', b: 'D' }]);
  assert.deepEqual(plan.newPoolMembers, ['D']);
  assert.deepEqual(plan.unrecognized, ['nonsense']);
  const strict = planPaste(doc, parsed, { status: 'done', addMissing: false });
  assert.deepEqual(strict.additions, []);
  assert.deepEqual(strict.skipped, ['B - D']);
});
