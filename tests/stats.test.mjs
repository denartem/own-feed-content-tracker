import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tournamentStats, overviewStats } from '../js/core/stats.js';

const units = [
  { id: 'u1', a: 'A', b: 'B', status: 'done', videos: 10 },
  { id: 'u2', a: 'C', b: 'A', status: 'in progress', videos: 5 },
  { id: 'u3', a: 'B', b: 'C', status: 'to do', videos: null },
  { id: 'u4', a: 'A', b: 'D', status: 'invalid data', videos: null },
];

test('tournamentStats: план без invalid data', () => {
  const st = tournamentStats({ units }, 10);
  assert.deepEqual(st.byStatus, { 'to do': 1, 'in progress': 1, done: 1, 'invalid data': 1 });
  assert.equal(st.total, 4);
  assert.equal(st.plan, 3);
  assert.equal(st.done, 1);
  assert.equal(Math.round(st.progress * 100), 33);
  assert.equal(st.videosTotal, 15);
  assert.equal(st.notAlphabetical, 1);
  assert.equal(st.belowTarget, 1);
});

test('tournamentStats порожнього турніру', () => {
  assert.equal(tournamentStats({ units: [] }).progress, 0);
});

test('overviewStats', () => {
  const structure = {
    contentTypes: [{ id: 'ct', name: 'CT', videosTarget: null, strength: false }],
    sports: [{ id: 's', name: 'Sport' }],
    categories: [{ id: 's-c', sportId: 's', name: 'Cat' }],
    tournaments: [
      { id: 't1', categoryId: 's-c', name: 'T1', contentTypeId: 'ct', unitType: 'pair' },
      { id: 't2', categoryId: 's-c', name: 'T2', contentTypeId: 'ct', unitType: 'pair' },
    ],
  };
  const ov = overviewStats(structure, { t1: { units }, t2: { units: [] } });
  assert.deepEqual(ov.totals, { done: 1, 'in progress': 1, 'to do': 1 });
  assert.deepEqual(ov.rows.map((r) => [r.id, r.sportName, r.categoryName, r.stats.plan]), [['t1', 'Sport', 'Cat', 3], ['t2', 'Sport', 'Cat', 0]]);
  assert.deepEqual(ov.inProgress.map((g) => [g.id, g.units.map((u) => u.id)]), [['t1', ['u2']]]);
  assert.deepEqual(ov.inProgress.map((g) => g.path), ['Sport - Cat - T1']);
});
