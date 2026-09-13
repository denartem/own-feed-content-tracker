import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStore } from '../js/storage/memory-store.js';
import { createSync, createMemoryPersist } from '../js/storage/sync.js';
import { serializeJson } from '../js/core/ops.js';

const at = '2026-09-12';
const PATH = 'tournaments/t.json';
const unit = (id, a, b, status = 'to do') => ({ id, a, b, status, priority: null, videos: null, note: '', updatedAt: at, history: [] });
const tdoc = () => ({ id: 't', notes: '', pool: [{ name: 'A', strength: null }, { name: 'B', strength: null }, { name: 'C', strength: null }], units: [unit('u001', 'A', 'B'), unit('u002', 'A', 'C')] });
const setStatus = (unitId, from, to) => ({ type: 'setStatus', unitId, from, to, at });

async function setup(extra = {}) {
  const store = createMemoryStore({ [PATH]: serializeJson(tdoc()) });
  const cache = new Map([[PATH, await store.readFile(PATH)]]);
  const log = { states: [], conflicts: [], saved: [] };
  const persist = extra.persist ?? createMemoryPersist();
  const sync = createSync({
    store: extra.store ?? store, cache, persist,
    describe: (path, ops) => `${path}: ${ops.length}`,
    onState: (s) => log.states.push(s),
    onConflict: (path, ops) => log.conflicts.push(...ops),
    onSaved: (path, text) => log.saved.push(path),
  });
  const remote = async () => JSON.parse((await store.readFile(PATH)).text);
  return { store, cache, persist, sync, log, remote };
}

test('зміни одного файлу йдуть одним commit', async () => {
  const { store, persist, sync, log, remote } = await setup();
  sync.enqueue(PATH, setStatus('u001', 'to do', 'done'));
  sync.enqueue(PATH, setStatus('u002', 'to do', 'in progress'));
  assert.equal(persist.load().length, 2);
  await sync.flush();
  assert.deepEqual((await remote()).units.map((u) => u.status), ['done', 'in progress']);
  assert.deepEqual((await store.listCommits(PATH)).map((c) => c.message), [`${PATH}: 2`]);
  assert.equal(sync.pending().length, 0);
  assert.equal(persist.load().length, 0);
  assert.deepEqual(log.saved, [PATH]);
  assert.equal(log.states.at(-1), 'saved');
});

test('зміна іншої одиниці на GitHub зливається без попередження', async () => {
  const { store, sync, log, remote } = await setup();
  const current = await store.readFile(PATH);
  const other = JSON.parse(current.text);
  other.units[1].status = 'done';
  await store.writeFile(PATH, serializeJson(other), current.sha, 'зміна від Claude');
  sync.enqueue(PATH, setStatus('u001', 'to do', 'done'));
  await sync.flush();
  assert.deepEqual((await remote()).units.map((u) => u.status), ['done', 'done']);
  assert.equal(log.conflicts.length, 0);
});

test('та сама одиниця: лишається локальна зміна й приходить попередження', async () => {
  const { store, sync, log, remote } = await setup();
  const current = await store.readFile(PATH);
  const other = JSON.parse(current.text);
  other.units[0].status = 'invalid data';
  await store.writeFile(PATH, serializeJson(other), current.sha, 'зміна від Claude');
  sync.enqueue(PATH, setStatus('u001', 'to do', 'done'));
  await sync.flush();
  assert.equal((await remote()).units[0].status, 'done');
  assert.equal(log.conflicts.length, 1);
});

test('офлайн: черга лишається, повтор зберігає', async () => {
  const inner = createMemoryStore({ [PATH]: serializeJson(tdoc()) });
  let online = false;
  const flaky = { ...inner, writeFile: (...args) => (online ? inner.writeFile(...args) : Promise.reject(new TypeError('Failed to fetch'))) };
  const { sync, log } = await setup({ store: flaky });
  sync.enqueue(PATH, setStatus('u001', 'to do', 'done'));
  await sync.flush();
  assert.equal(log.states.at(-1), 'offline');
  assert.equal(sync.pending().length, 1);
  online = true;
  await sync.retry();
  assert.equal(log.states.at(-1), 'saved');
  assert.equal(JSON.parse((await inner.readFile(PATH)).text).units[0].status, 'done');
});

test('черга відновлюється з persist після перезавантаження', async () => {
  const persist = createMemoryPersist([{ path: PATH, op: setStatus('u002', 'to do', 'done') }]);
  const { sync, remote } = await setup({ persist });
  assert.equal(sync.pending().length, 1);
  assert.deepEqual(sync.pendingPaths(), [PATH]);
  assert.equal(sync.pendingFor(PATH).length, 1);
  assert.deepEqual(sync.pendingFor('other.json'), []);
  await sync.flush();
  assert.equal((await remote()).units[1].status, 'done');
});

test('створення й видалення файлу', async () => {
  const { store, sync } = await setup();
  const path = 'tournaments/n.json';
  sync.enqueue(path, { type: 'setText', from: null, to: serializeJson({ id: 'n', notes: '', pool: [], units: [] }) });
  await sync.flush();
  assert.equal(JSON.parse((await store.readFile(path)).text).id, 'n');
  sync.enqueue(path, { type: 'deleteFile' });
  await sync.flush();
  assert.equal(await store.readFile(path), null);
});

test('onSaved бачить у черзі лише ще не збережені операції', async () => {
  const store = createMemoryStore({ [PATH]: serializeJson(tdoc()) });
  const cache = new Map([[PATH, await store.readFile(PATH)]]);
  const pendingAtSave = [];
  const sync = createSync({
    store, cache, persist: createMemoryPersist(), describe: () => 'm',
    onSaved: (path) => pendingAtSave.push(sync.pendingFor(path).length),
  });
  sync.enqueue(PATH, { type: 'addUnits', units: [unit('u003', 'B', 'C')] });
  sync.enqueue(PATH, { type: 'renamePool', from: 'C', to: 'C FC' });
  await sync.flush();
  assert.deepEqual(pendingAtSave, [0]);
  const saved = JSON.parse((await store.readFile(PATH)).text);
  assert.deepEqual(saved.units.map((u) => [u.a, u.b]), [['A', 'B'], ['A', 'C FC'], ['B', 'C FC']]);
});

test('помилка токена переводить у стан auth', async () => {
  const inner = createMemoryStore({ [PATH]: serializeJson(tdoc()) });
  const denied = { ...inner, writeFile: () => Promise.reject(Object.assign(new Error('401'), { status: 401 })) };
  const { sync, log } = await setup({ store: denied });
  sync.enqueue(PATH, setStatus('u001', 'to do', 'done'));
  await sync.flush();
  assert.equal(log.states.at(-1), 'auth');
  assert.equal(sync.pending().length, 1);
});
