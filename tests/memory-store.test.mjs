import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStore } from '../js/storage/memory-store.js';

test('читання й запис із перевіркою sha', async () => {
  const store = createMemoryStore({ 'a.json': '1' });
  const first = await store.readFile('a.json');
  assert.equal(first.text, '1');
  const { sha } = await store.writeFile('a.json', '2', first.sha, 'm1');
  assert.notEqual(sha, first.sha);
  assert.equal((await store.readFile('a.json')).text, '2');
  await assert.rejects(store.writeFile('a.json', '3', first.sha, 'm2'), (e) => e.status === 409);
  assert.equal(await store.readFile('missing.json'), null);
});

test('створення й видалення файлу', async () => {
  const store = createMemoryStore({});
  const { sha } = await store.writeFile('n.json', 'x', null, 'create');
  assert.deepEqual(store.paths(), ['n.json']);
  await store.deleteFile('n.json', sha, 'delete');
  assert.equal(await store.readFile('n.json'), null);
});

test('історія commit-ів по файлу, найновіші першими', async () => {
  const store = createMemoryStore({ 'a.json': '1', 'b.json': '1' });
  let { sha } = await store.readFile('a.json');
  ({ sha } = await store.writeFile('a.json', '2', sha, 'перший'));
  await store.writeFile('a.json', '3', sha, 'другий');
  const b = await store.readFile('b.json');
  await store.writeFile('b.json', '2', b.sha, 'інший файл');
  assert.deepEqual((await store.listCommits('a.json')).map((c) => c.message), ['другий', 'перший']);
  assert.equal(await store.checkAccess(), true);
});
