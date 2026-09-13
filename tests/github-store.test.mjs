import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGithubStore, toBase64, fromBase64 } from '../js/storage/github-store.js';

function fakeFetch(responses) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    const r = responses.shift();
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.body };
  };
  return { impl, calls };
}
const make = (impl) => createGithubStore({ owner: 'o', repo: 'r', token: 't', fetchImpl: impl });

test('base64 туди й назад із кирилицею', () => {
  const text = 'Паспорт – ALPHA ✓';
  assert.equal(fromBase64(toBase64(text)), text);
  assert.equal(fromBase64(`${toBase64(text).slice(0, 8)}\n${toBase64(text).slice(8)}`), text);
});

test('readFile декодує вміст і передає заголовки', async () => {
  const { impl, calls } = fakeFetch([{ status: 200, body: { content: toBase64('{"a":1}'), sha: 'abc' } }]);
  assert.deepEqual(await make(impl).readFile('tournaments/x y.json'), { text: '{"a":1}', sha: 'abc' });
  assert.equal(calls[0].url, 'https://api.github.com/repos/o/r/contents/tournaments/x%20y.json');
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(calls[0].init.cache, 'no-store');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer t');
});

test('readFile повертає null для 404', async () => {
  const { impl } = fakeFetch([{ status: 404, body: {} }]);
  assert.equal(await make(impl).readFile('nope.json'), null);
});

test('writeFile надсилає message, content і sha', async () => {
  const { impl, calls } = fakeFetch([{ status: 200, body: { content: { sha: 'new' } } }]);
  assert.deepEqual(await make(impl).writeFile('a.json', 'текст', 'old', 'msg'), { sha: 'new' });
  assert.equal(calls[0].init.method, 'PUT');
  const body = JSON.parse(calls[0].init.body);
  assert.deepEqual({ ...body, content: fromBase64(body.content) }, { message: 'msg', content: 'текст', sha: 'old' });
});

test('помилки мають status', async () => {
  const { impl } = fakeFetch([{ status: 409, body: {} }, { status: 401, body: {} }]);
  const store = make(impl);
  await assert.rejects(store.writeFile('a.json', 'x', 'old', 'm'), (e) => e.status === 409);
  await assert.rejects(store.readFile('a.json'), (e) => e.status === 401);
});

test('listCommits, deleteFile і checkAccess', async () => {
  const { impl, calls } = fakeFetch([
    { status: 200, body: [{ sha: 's1', commit: { message: 'm1', author: { date: '2026-09-12T10:00:00Z' } } }] },
    { status: 200, body: {} },
    { status: 200, body: { full_name: 'o/r' } },
    { status: 404, body: {} },
  ]);
  const store = make(impl);
  assert.deepEqual(await store.listCommits('a b.json'), [{ sha: 's1', message: 'm1', date: '2026-09-12T10:00:00Z' }]);
  assert.equal(calls[0].url, 'https://api.github.com/repos/o/r/commits?path=a%20b.json&per_page=50');
  await store.deleteFile('a.json', 's1', 'del');
  assert.equal(calls[1].init.method, 'DELETE');
  assert.deepEqual(JSON.parse(calls[1].init.body), { message: 'del', sha: 's1' });
  assert.equal(await store.checkAccess(), true);
  assert.equal(await store.checkAccess(), false);
});
