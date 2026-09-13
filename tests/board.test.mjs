import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortUnits, boardColumns } from '../js/core/board.js';

const u = (id, a, b, status, priority = null) => ({ id, a, b, status, priority });

test('sortUnits: спершу пріоритет, потім назва', () => {
  const sorted = sortUnits([u('1', 'C', 'D', 'to do'), u('2', 'B', 'C', 'to do', 'low'), u('3', 'A', 'B', 'to do'), u('4', 'D', 'E', 'to do', 'high')]);
  assert.deepEqual(sorted.map((x) => x.id), ['4', '2', '3', '1']);
});

test('boardColumns повертає 4 колонки в порядку статусів', () => {
  const cols = boardColumns([u('1', 'A', 'B', 'done'), u('2', 'A', 'C', 'invalid data'), u('3', 'B', 'C', 'done')]);
  assert.deepEqual(cols.map((c) => [c.status, c.units.length]), [['to do', 0], ['in progress', 0], ['done', 2], ['invalid data', 1]]);
});
