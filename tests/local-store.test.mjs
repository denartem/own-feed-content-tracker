import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createLocalStore } from '../js/storage/local-store.js';

const root = join(import.meta.dirname, '..', 'fixtures');
const fetchImpl = async (url) => {
  try {
    const text = await readFile(join(root, url.replace('./fixtures/', '')), 'utf8');
    return { ok: true, text: async () => text };
  } catch {
    return { ok: false, text: async () => '' };
  }
};

test('локальне сховище завантажує фікстури', async () => {
  const store = await createLocalStore({ fetchImpl });
  assert.deepEqual(store.paths().sort(), [
    'content-types/demo-pairs.md',
    'content-types/demo-players.md',
    'structure.json',
    'tournaments/demo-sport-demo-pairs-cup.json',
    'tournaments/demo-sport-demo-players-cup.json',
  ]);
  const doc = JSON.parse((await store.readFile('tournaments/demo-sport-demo-pairs-cup.json')).text);
  assert.equal(doc.units.length, 4);
});
