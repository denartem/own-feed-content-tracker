import { findInPool } from './names.js';

const HEADER = ['sport', 'category', 'tournament', 'a', 'strength_a', 'b', 'strength_b', 'status', 'priority', 'videos', 'note', 'updated_at'];
const BOM = String.fromCharCode(0xfeff);

function cell(value) {
  const s = value == null ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(structure, docsById) {
  const types = new Map(structure.contentTypes.map((c) => [c.id, c]));
  const categories = new Map(structure.categories.map((c) => [c.id, c]));
  const sports = new Map(structure.sports.map((s) => [s.id, s]));
  const lines = [HEADER.join(',')];
  for (const t of structure.tournaments) {
    const doc = docsById[t.id];
    if (!doc) continue;
    const category = categories.get(t.categoryId);
    const withStrength = types.get(t.contentTypeId)?.strength === true;
    const strengthOf = (name) => (withStrength && name != null ? findInPool(doc.pool, name)?.strength ?? null : null);
    for (const u of doc.units) {
      lines.push([
        sports.get(category?.sportId)?.name, category?.name, t.name, u.a, strengthOf(u.a), u.b, strengthOf(u.b),
        u.status, u.priority, u.videos, u.note, u.updatedAt,
      ].map(cell).join(','));
    }
  }
  return `${BOM}${lines.join('\r\n')}\r\n`;
}
