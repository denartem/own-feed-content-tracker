import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAppState } from '../js/ui/state.js';
import { createActions, uniqueNames, localToday } from '../js/ui/actions.js';
import { parseList, planPaste } from '../js/core/parse-list.js';
import { PASSPORT_TEMPLATE } from '../js/core/constants.js';

const at = '2026-09-12';
const T = 'demo-sport-demo-t';
const PATH = `tournaments/${T}.json`;

function setup() {
  const app = createAppState();
  const entries = [];
  app.attachSync({ enqueue: (path, op) => entries.push({ path, op }) });
  app.load({
    structure: {
      version: 1,
      contentTypes: [{ id: 'ct', name: 'CT', videosTarget: 16, strength: false }],
      sports: [{ id: 'demo-sport', name: 'Demo Sport' }],
      categories: [{ id: 'demo-sport-demo', sportId: 'demo-sport', name: 'Demo' }],
      tournaments: [{ id: T, categoryId: 'demo-sport-demo', name: 'T', contentTypeId: 'ct', unitType: 'pair' }],
    },
    docs: {
      [T]: {
        id: T, notes: '',
        pool: [{ name: 'A', strength: null }, { name: 'B', strength: null }, { name: 'C', strength: null }],
        units: [{ id: 'u001', a: 'B', b: 'A', status: 'to do', priority: null, videos: null, note: '', updatedAt: at, history: [] }],
      },
    },
  });
  const actions = createActions(app, { today: () => at });
  return { app, entries, actions, doc: () => app.state.docs[T] };
}

test('localToday і uniqueNames', () => {
  assert.equal(localToday(new Date(2026, 8, 3)), '2026-09-03');
  assert.deepEqual(uniqueNames(' NORTH_CITY \n\nnorth city\nBravo\r\n'), ['NORTH CITY', 'Bravo']);
});

test('зміна статусу оновлює стан, сповіщає й ставить операцію в чергу', () => {
  const { app, entries, actions, doc } = setup();
  let notified = 0;
  app.subscribe(() => { notified += 1; });
  actions.setStatus(T, 'u001', 'done');
  actions.setStatus(T, 'u001', 'done');
  assert.equal(doc().units[0].status, 'done');
  assert.equal(notified, 1);
  assert.deepEqual(entries, [{ path: PATH, op: { type: 'setStatus', unitId: 'u001', from: 'to do', to: 'done', at } }]);
});

test('додавання одиниці: дубль і однакові учасники відхиляються', () => {
  const { entries, actions, doc } = setup();
  assert.equal(actions.addUnit(T, 'a', 'b'), 'Така пара вже є');
  assert.equal(actions.addUnit(T, 'A', 'a'), 'Оберіть двох різних учасників');
  assert.equal(actions.addUnit(T, 'C', 'A'), null);
  assert.deepEqual(doc().units.map((u) => [u.id, u.a, u.b]), [['u001', 'B', 'A'], ['u002', 'C', 'A']]);
  assert.equal(entries.length, 1);
});

test('генерація і вставка списку', () => {
  const { actions, doc, entries } = setup();
  assert.equal(actions.previewGenerate(T), 2);
  const plan = planPaste(doc(), parseList('A_B\nC - D', doc().pool.map((m) => m.name)), { status: 'done', addMissing: true });
  actions.applyPaste(T, plan, 'done');
  assert.deepEqual(entries.map((e) => e.op.type), ['addPool', 'setStatus', 'addUnits']);
  assert.deepEqual(doc().units.map((u) => [u.a, u.b, u.status]), [['B', 'A', 'done'], ['C', 'D', 'done']]);
  assert.equal(actions.generate(T), 4);
});

test('пул: додати, перейменувати, видалити', () => {
  const { actions, doc } = setup();
  assert.equal(actions.addPoolMember(T, 'a'), 'Такий учасник уже є');
  assert.equal(actions.addPoolMember(T, ' D_TEAM '), null);
  assert.equal(doc().pool.at(-1).name, 'D TEAM');
  assert.equal(actions.renamePool(T, 'A', 'b'), 'Такий учасник уже є');
  assert.equal(actions.renamePool(T, 'A', 'Alpha'), null);
  assert.deepEqual([doc().units[0].a, doc().units[0].b], ['B', 'Alpha']);
  assert.equal(actions.removePool(T, 'Alpha'), 'Учасник є в парах — спершу видаліть їх');
  assert.equal(actions.removePool(T, 'D TEAM'), null);
  assert.equal(doc().pool.length, 3);
});

test('новий тип контенту і новий турнір', () => {
  const { app, actions, entries } = setup();
  const { id: ctId } = actions.createContentType('Moments');
  assert.equal(ctId, 'moments');
  assert.equal(app.state.passports.moments, PASSPORT_TEMPLATE);
  const created = actions.createTournament({ sportName: 'demo sport', categoryName: 'Moments', name: 'Grand Cup', contentTypeId: ctId, unitType: 'pair', poolText: 'NORTH\nSOUTH\nnorth' });
  assert.equal(created.id, 'demo-sport-moments-grand-cup');
  assert.deepEqual(app.state.structure.categories.map((c) => c.id), ['demo-sport-demo', 'demo-sport-moments']);
  assert.deepEqual(app.state.docs[created.id].pool.map((m) => m.name), ['NORTH', 'SOUTH']);
  assert.deepEqual(entries.map((e) => e.path),
    ['structure.json', 'content-types/moments.md', 'structure.json', 'structure.json', `tournaments/${created.id}.json`]);
  assert.equal(actions.createTournament({ sportName: 'Demo Sport', categoryName: 'Moments', name: 'grand cup', contentTypeId: ctId, unitType: 'pair', poolText: '' }).error, 'Такий турнір уже є');
  assert.equal(actions.createTournament({ sportName: '', categoryName: 'X', name: 'Y', contentTypeId: ctId, unitType: 'pair', poolText: '' }).error, 'Заповніть спорт, категорію і назву');
  assert.equal(actions.createContentType('  ').error, 'Вкажіть назву типу');
});

test('оновлення типу, applySaved із чергою, видалення турніру', () => {
  const { app, actions, entries } = setup();
  actions.updateContentType('ct', { videosTarget: 100 });
  assert.deepEqual(entries.at(-1).op, { type: 'updateContentType', id: 'ct', from: { videosTarget: 16 }, changes: { videosTarget: 100 } });
  const remoteText = JSON.stringify({ ...app.state.docs[T], notes: 'з GitHub' });
  app.applySaved(PATH, remoteText, [{ type: 'setStatus', unitId: 'u001', from: 'to do', to: 'in progress', at }]);
  assert.equal(app.state.docs[T].notes, 'з GitHub');
  assert.equal(app.state.docs[T].units[0].status, 'in progress');
  actions.deleteTournament(T);
  assert.equal(app.tournament(T), null);
  assert.equal(app.state.docs[T], undefined);
  assert.deepEqual(entries.slice(-2).map((e) => [e.path, e.op.type]), [['structure.json', 'deleteTournament'], [PATH, 'deleteFile']]);
});
