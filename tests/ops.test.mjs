import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyTournamentOp, applyStructureOp, applyOpsToText, serializeJson } from '../js/core/ops.js';

const at = '2026-09-12';
const doc = () => ({
  id: 't', notes: '',
  pool: [{ name: 'A', strength: null }, { name: 'B', strength: null }, { name: 'C', strength: 0.2 }],
  units: [{ id: 'u001', a: 'B', b: 'A', status: 'to do', priority: null, videos: null, note: '', updatedAt: '2026-09-01', history: [] }],
});
const unit = (id, a, b) => ({ id, a, b, status: 'to do', priority: null, videos: null, note: '', updatedAt: at, history: [] });

test('setStatus змінює статус, дату й історію, не чіпаючи вхід', () => {
  const src = doc();
  const { doc: d, conflict } = applyTournamentOp(src, { type: 'setStatus', unitId: 'u001', from: 'to do', to: 'done', at });
  assert.equal(conflict, false);
  assert.equal(d.units[0].status, 'done');
  assert.equal(d.units[0].updatedAt, at);
  assert.deepEqual(d.units[0].history, [{ at, from: 'to do', to: 'done' }]);
  assert.equal(src.units[0].status, 'to do');
});

test('setStatus: конфлікт фіксується, локальна зміна застосовується', () => {
  const r = applyTournamentOp(doc(), { type: 'setStatus', unitId: 'u001', from: 'in progress', to: 'done', at });
  assert.equal(r.conflict, true);
  assert.equal(r.doc.units[0].status, 'done');
  assert.equal(applyTournamentOp(doc(), { type: 'setStatus', unitId: 'nope', from: 'to do', to: 'done', at }).conflict, true);
});

test('setField і swap', () => {
  let d = applyTournamentOp(doc(), { type: 'setField', unitId: 'u001', field: 'videos', from: null, to: 16, at }).doc;
  assert.equal(d.units[0].videos, 16);
  d = applyTournamentOp(d, { type: 'swap', unitId: 'u001', at }).doc;
  assert.deepEqual([d.units[0].a, d.units[0].b], ['A', 'B']);
  assert.equal(d.units[0].history.at(-1).event, 'поміняно місцями');
});

test('addUnits пропускає дублі й перепризначає зайняті id', () => {
  const r = applyTournamentOp(doc(), { type: 'addUnits', units: [unit('u001', 'A', 'C'), unit('u002', 'a', 'b')] });
  assert.equal(r.conflict, true);
  assert.deepEqual(r.doc.units.map((u) => [u.id, u.a, u.b]), [['u001', 'B', 'A'], ['u002', 'A', 'C']]);
});

test('пул: додати, сила, перейменувати, видалити', () => {
  let d = applyTournamentOp(doc(), { type: 'addPool', members: [{ name: 'D', strength: 0.1 }, { name: 'a', strength: null }] }).doc;
  assert.deepEqual(d.pool.map((m) => m.name), ['A', 'B', 'C', 'D']);
  let r = applyTournamentOp(d, { type: 'setStrength', name: 'C', from: 0.2, to: 0.25 });
  assert.equal(r.conflict, false);
  assert.equal(r.doc.pool[2].strength, 0.25);
  r = applyTournamentOp(r.doc, { type: 'renamePool', from: 'A', to: 'Alpha' });
  assert.deepEqual([r.doc.units[0].a, r.doc.units[0].b], ['B', 'Alpha']);
  assert.equal(applyTournamentOp(r.doc, { type: 'removePool', name: 'Alpha' }).conflict, true);
  assert.deepEqual(applyTournamentOp(r.doc, { type: 'removePool', name: 'D' }).doc.pool.map((m) => m.name), ['Alpha', 'B', 'C']);
});

test('структура: додати, оновити, видалити', () => {
  const s = { version: 1, contentTypes: [{ id: 'ct', name: 'CT', videosTarget: null, strength: false }], sports: [], categories: [], tournaments: [] };
  let r = applyStructureOp(s, { type: 'addTournament', tournament: { id: 't', categoryId: 'c', name: 'T', contentTypeId: 'ct', unitType: 'pair' } });
  assert.equal(r.doc.tournaments.length, 1);
  assert.equal(applyStructureOp(r.doc, { type: 'addTournament', tournament: { id: 't' } }).conflict, true);
  r = applyStructureOp(r.doc, { type: 'updateContentType', id: 'ct', from: { videosTarget: null }, changes: { videosTarget: 16 } });
  assert.equal(r.conflict, false);
  assert.equal(r.doc.contentTypes[0].videosTarget, 16);
  assert.equal(applyStructureOp(r.doc, { type: 'deleteTournament', id: 't' }).doc.tournaments.length, 0);
});

test('applyOpsToText: послідовні зміни, новий файл, текст, видалення', () => {
  const text = serializeJson(doc());
  const out = applyOpsToText('tournaments/t.json', text, [
    { type: 'setStatus', unitId: 'u001', from: 'to do', to: 'in progress', at },
    { type: 'setStatus', unitId: 'u001', from: 'in progress', to: 'done', at },
  ]);
  assert.equal(out.conflicts.length, 0);
  assert.equal(JSON.parse(out.text).units[0].status, 'done');
  assert.ok(out.text.endsWith('}\n'));
  const created = applyOpsToText('tournaments/n.json', null, [
    { type: 'setText', from: null, to: serializeJson({ id: 'n', notes: '', pool: [{ name: 'X', strength: null }], units: [] }) },
    { type: 'addPool', members: [{ name: 'Y', strength: null }] },
  ]);
  assert.deepEqual(JSON.parse(created.text).pool.map((m) => m.name), ['X', 'Y']);
  const md = applyOpsToText('content-types/ct.md', 'old', [{ type: 'setText', from: 'older', to: 'new' }]);
  assert.equal(md.text, 'new');
  assert.equal(md.conflicts.length, 1);
  const gone = applyOpsToText('tournaments/t.json', text, [{ type: 'deleteFile' }]);
  assert.equal(gone.deleted, true);
  assert.equal(gone.text, null);
});
