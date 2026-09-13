import { foldName, compareNames } from './names.js';
import { nextUnitId, unitIdFrom } from './ids.js';

export function unitKey(a, b) {
  if (b == null) return foldName(a);
  return [foldName(a), foldName(b)].sort().join('||');
}

export function unitLabel(unit) {
  return unit.b == null ? unit.a : `${unit.a} – ${unit.b}`;
}

export function newUnit(id, a, b, status, today, event) {
  return {
    id, a, b: b ?? null, status, priority: null, videos: null, note: '',
    updatedAt: today, history: [{ at: today, event }],
  };
}

export function generateUnits(doc, unitType, today) {
  const existing = new Set(doc.units.map((u) => unitKey(u.a, u.b)));
  const names = doc.pool.map((m) => m.name).sort(compareNames);
  let counter = Number(nextUnitId(doc.units).slice(1));
  const added = [];
  const push = (a, b) => {
    const key = unitKey(a, b);
    if (existing.has(key)) return;
    existing.add(key);
    added.push(newUnit(unitIdFrom(counter), a, b, 'to do', today, 'згенеровано'));
    counter += 1;
  };
  if (unitType === 'pair') {
    for (let i = 0; i < names.length; i += 1) {
      for (let j = i + 1; j < names.length; j += 1) push(names[i], names[j]);
    }
  } else {
    names.forEach((n) => push(n, null));
  }
  return added;
}
