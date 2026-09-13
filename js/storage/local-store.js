import { createMemoryStore } from './memory-store.js';

export async function createLocalStore({ baseUrl = './fixtures/', fetchImpl = (...args) => fetch(...args) } = {}) {
  const get = async (path) => {
    const res = await fetchImpl(`${baseUrl}${path}`);
    return res.ok ? res.text() : null;
  };
  const structureText = await get('structure.json');
  if (structureText == null) throw new Error('Немає fixtures/structure.json');
  const structure = JSON.parse(structureText);
  const files = { 'structure.json': structureText };
  for (const t of structure.tournaments) {
    const text = await get(`tournaments/${t.id}.json`);
    if (text != null) files[`tournaments/${t.id}.json`] = text;
  }
  for (const c of structure.contentTypes) {
    const text = await get(`content-types/${c.id}.md`);
    if (text != null) files[`content-types/${c.id}.md`] = text;
  }
  return createMemoryStore(files);
}
