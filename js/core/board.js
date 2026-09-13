import { STATUSES } from './constants.js';
import { compareNames } from './names.js';
import { unitLabel } from './pairs.js';

const RANK = { high: 0, medium: 1, low: 2 };

export function sortUnits(units) {
  return [...units].sort((x, y) =>
    (RANK[x.priority] ?? 3) - (RANK[y.priority] ?? 3) || compareNames(unitLabel(x), unitLabel(y)));
}

export function boardColumns(units) {
  return STATUSES.map((status) => ({ status, units: sortUnits(units.filter((u) => u.status === status)) }));
}
