import { foldName } from './names.js';

export function slugify(text) {
  return foldName(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function uniqueId(base, existingIds) {
  const taken = new Set(existingIds);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function categoryId(sportId, name) {
  return `${sportId}-${slugify(name)}`;
}

export function tournamentId(catId, name) {
  return `${catId}-${slugify(name)}`;
}

export function unitIdFrom(n) {
  return `u${String(n).padStart(3, '0')}`;
}

export function nextUnitId(units) {
  const max = units.reduce((m, u) => Math.max(m, Number(String(u.id).replace(/^u/, '')) || 0), 0);
  return unitIdFrom(max + 1);
}
