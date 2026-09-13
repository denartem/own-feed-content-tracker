import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateStructure, validateTournament, validateAll, unitFlags } from '../js/core/validate.js';

const structure = () => ({
  version: 1,
  contentTypes: [{ id: 'ct', name: 'CT', videosTarget: 10, strength: true }],
  sports: [{ id: 's', name: 'S' }],
  categories: [{ id: 's-c', sportId: 's', name: 'C' }],
  tournaments: [{ id: 's-c-t', categoryId: 's-c', name: 'T', contentTypeId: 'ct', unitType: 'pair' }],
});
const doc = () => ({
  id: 's-c-t', notes: '',
  pool: [{ name: 'A', strength: 0.3 }, { name: 'B', strength: null }, { name: 'C', strength: null }],
  units: [
    { id: 'u001', a: 'A', b: 'B', status: 'done', priority: null, videos: 12, note: '', updatedAt: '2026-09-12', history: [] },
    { id: 'u002', a: 'C', b: 'A', status: 'to do', priority: 'high', videos: null, note: '', updatedAt: '2026-09-12', history: [] },
  ],
});

test('коректні дані без помилок', () => {
  assert.deepEqual(validateStructure(structure()), []);
  assert.deepEqual(validateTournament(doc(), 'pair'), []);
  assert.deepEqual(validateAll(structure(), { 's-c-t': doc() }), []);
});

test('помилки структури', () => {
  const s = structure();
  s.tournaments.push({ ...s.tournaments[0] });
  s.tournaments[0].contentTypeId = 'nope';
  s.categories[0].sportId = 'nope';
  s.contentTypes[0].videosTarget = -1;
  const errors = validateStructure(s).join('\n');
  assert.match(errors, /повторюється id s-c-t/);
  assert.match(errors, /невідомий тип контенту nope/);
  assert.match(errors, /невідомий спорт nope/);
  assert.match(errors, /videosTarget/);
});

test('помилки турніру', () => {
  const d = doc();
  d.units.push({ ...d.units[0], id: 'u003', a: 'B', b: 'A' });
  d.units.push({ ...d.units[0], id: 'u003', a: 'A', b: 'Z', status: 'maybe', priority: 'urgent', videos: 1.5 });
  const errors = validateTournament(d, 'pair').join('\n');
  assert.match(errors, /u003: дубль пари/);
  assert.match(errors, /повторюється id одиниці u003/);
  assert.match(errors, /учасника Z немає в пулі/);
  assert.match(errors, /статус maybe/);
  assert.match(errors, /пріоритет urgent/);
  assert.match(errors, /videos/);
});

test('гравцям не можна мати b, парам — не мати', () => {
  const d = doc();
  assert.match(validateTournament(d, 'player').join('\n'), /u001: у турнірі гравців/);
  d.units[0].b = null;
  assert.match(validateTournament(d, 'pair').join('\n'), /u001: пара без другого учасника/);
});

test('validateAll: немає файлу турніру', () => {
  assert.match(validateAll(structure(), {}).join('\n'), /s-c-t: немає файлу турніру/);
});

test('unitFlags', () => {
  assert.deepEqual(unitFlags({ a: 'C', b: 'A', videos: 8 }, 10), { notAlphabetical: true, belowTarget: true });
  assert.deepEqual(unitFlags({ a: 'A', b: 'C', videos: null }, 10), { notAlphabetical: false, belowTarget: false });
  assert.deepEqual(unitFlags({ a: 'A', b: null, videos: 3 }, null), { notAlphabetical: false, belowTarget: false });
});
