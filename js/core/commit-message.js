import { unitLabel } from './pairs.js';

export function pluralUk(n, [one, few, many]) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export function commitMessage(title, ops, docAfter) {
  const units = new Map((docAfter?.units ?? []).map((u) => [u.id, u]));
  const statusOps = ops.filter((o) => o.type === 'setStatus');
  if (statusOps.length && statusOps.length === ops.length) {
    const [first] = statusOps;
    if (statusOps.length === 1) {
      const u = units.get(first.unitId);
      return `${title}: ${u ? unitLabel(u) : first.unitId} ${first.from} → ${first.to}`;
    }
    if (statusOps.every((o) => o.from === first.from && o.to === first.to)) {
      const pairs = statusOps.some((o) => units.get(o.unitId)?.b != null);
      const forms = pairs ? ['пара', 'пари', 'пар'] : ['одиниця', 'одиниці', 'одиниць'];
      return `${title}: ${statusOps.length} ${pluralUk(statusOps.length, forms)} ${first.from} → ${first.to}`;
    }
  }
  if (ops.length === 1 && ops[0].type === 'addUnits') {
    const n = ops[0].units.length;
    return `${title}: додано ${n} ${pluralUk(n, ['одиницю', 'одиниці', 'одиниць'])}`;
  }
  return `${title}: ${ops.length} ${pluralUk(ops.length, ['зміна', 'зміни', 'змін'])}`;
}
