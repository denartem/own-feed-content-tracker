import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validateAll } from '../js/core/validate.js';
import { tournamentStats } from '../js/core/stats.js';
import { pluralUk } from '../js/core/commit-message.js';

const args = process.argv.slice(2);
const dir = args[0];
const expectAt = args.indexOf('--expect');
if (!dir) {
  console.error('Використання: node scripts/validate-data.mjs <папка-даних> [--expect очікування.json]');
  process.exit(2);
}

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const structure = await readJson(join(dir, 'structure.json'));
const docs = {};
const errors = [];

for (const t of structure.tournaments) {
  try {
    docs[t.id] = await readJson(join(dir, 'tournaments', `${t.id}.json`));
  } catch (e) {
    if (e.code !== 'ENOENT') errors.push(`${t.id}: ${e.message}`);
  }
}
errors.push(...validateAll(structure, docs));

for (const c of structure.contentTypes) {
  try {
    await readFile(join(dir, 'content-types', `${c.id}.md`), 'utf8');
  } catch {
    errors.push(`Тип ${c.id}: немає паспорта content-types/${c.id}.md`);
  }
}

if (expectAt >= 0) {
  const expected = await readJson(args[expectAt + 1]);
  for (const [id, exp] of Object.entries(expected)) {
    const doc = docs[id];
    if (!doc) {
      errors.push(`${id}: немає файлу для звірки`);
      continue;
    }
    const st = tournamentStats(doc);
    const actual = { total: st.total, ...st.byStatus };
    for (const [key, value] of Object.entries(exp)) {
      if (actual[key] !== value) errors.push(`${id}: ${key} = ${actual[key]}, очікувалось ${value}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`Помилок: ${errors.length}`);
  process.exit(1);
}
const count = structure.tournaments.length;
const units = Object.values(docs).reduce((n, d) => n + d.units.length, 0);
console.log(`OK: ${count} ${pluralUk(count, ['турнір', 'турніри', 'турнірів'])}, ${units} ${pluralUk(units, ['одиниця', 'одиниці', 'одиниць'])}`);
