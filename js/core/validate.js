import { STATUSES, PRIORITIES, UNIT_TYPES } from './constants.js';
import { foldName, isAlphabetical } from './names.js';
import { unitKey } from './pairs.js';

const isCount = (v) => v === null || (Number.isInteger(v) && v >= 0);
const isStrength = (v) => v === null || (typeof v === 'number' && Number.isFinite(v));

function uniqueIds(list, label, errors) {
  const seen = new Set();
  for (const item of list) {
    if (seen.has(item.id)) errors.push(`${label}: повторюється id ${item.id}`);
    seen.add(item.id);
  }
}

export function validateStructure(structure) {
  const errors = [];
  for (const key of ['contentTypes', 'sports', 'categories', 'tournaments']) {
    if (!Array.isArray(structure[key])) errors.push(`structure.json: немає масиву ${key}`);
  }
  if (errors.length) return errors;
  uniqueIds(structure.contentTypes, 'Типи контенту', errors);
  uniqueIds(structure.sports, 'Спорти', errors);
  uniqueIds(structure.categories, 'Категорії', errors);
  uniqueIds(structure.tournaments, 'Турніри', errors);
  const sports = new Set(structure.sports.map((s) => s.id));
  const categories = new Set(structure.categories.map((c) => c.id));
  const types = new Set(structure.contentTypes.map((c) => c.id));
  for (const c of structure.contentTypes) {
    if (!isCount(c.videosTarget)) errors.push(`Тип ${c.id}: videosTarget має бути цілим від 0 або null`);
    if (typeof c.strength !== 'boolean') errors.push(`Тип ${c.id}: strength має бути true або false`);
  }
  for (const c of structure.categories) {
    if (!sports.has(c.sportId)) errors.push(`Категорія ${c.id}: невідомий спорт ${c.sportId}`);
  }
  for (const t of structure.tournaments) {
    if (!categories.has(t.categoryId)) errors.push(`Турнір ${t.id}: невідома категорія ${t.categoryId}`);
    if (!types.has(t.contentTypeId)) errors.push(`Турнір ${t.id}: невідомий тип контенту ${t.contentTypeId}`);
    if (!UNIT_TYPES.includes(t.unitType)) errors.push(`Турнір ${t.id}: невідомий вид одиниці ${t.unitType}`);
  }
  return errors;
}

export function validateTournament(doc, unitType) {
  const errors = [];
  const pool = new Set();
  for (const m of doc.pool ?? []) {
    const key = foldName(m.name);
    if (!key) errors.push('Пул: порожня назва');
    if (pool.has(key)) errors.push(`Пул: повторюється ${m.name}`);
    if (!isStrength(m.strength ?? null)) errors.push(`Пул: сила ${m.name} має бути числом або null`);
    pool.add(key);
  }
  const ids = new Set();
  const keys = new Set();
  for (const u of doc.units ?? []) {
    if (ids.has(u.id)) errors.push(`повторюється id одиниці ${u.id}`);
    ids.add(u.id);
    if (!STATUSES.includes(u.status)) errors.push(`${u.id}: статус ${u.status} не дозволений`);
    if (u.priority !== null && !PRIORITIES.includes(u.priority)) errors.push(`${u.id}: пріоритет ${u.priority} не дозволений`);
    if (!isCount(u.videos)) errors.push(`${u.id}: videos має бути цілим від 0 або null`);
    for (const n of [u.a, u.b]) {
      if (n != null && !pool.has(foldName(n))) errors.push(`${u.id}: учасника ${n} немає в пулі`);
    }
    if (unitType === 'pair') {
      if (u.b == null) errors.push(`${u.id}: пара без другого учасника`);
      else if (foldName(u.a) === foldName(u.b)) errors.push(`${u.id}: учасник у парі сам із собою`);
    } else if (u.b != null) {
      errors.push(`${u.id}: у турнірі гравців чи команд b має бути null`);
    }
    const key = unitKey(u.a, u.b);
    if (keys.has(key)) errors.push(`${u.id}: дубль пари ${u.a} – ${u.b ?? ''}`.trim());
    keys.add(key);
  }
  return errors;
}

export function validateAll(structure, docsById) {
  const errors = validateStructure(structure);
  for (const t of structure.tournaments ?? []) {
    const doc = docsById[t.id];
    if (!doc) {
      errors.push(`${t.id}: немає файлу турніру`);
      continue;
    }
    if (doc.id !== t.id) errors.push(`${t.id}: у файлі id ${doc.id}`);
    errors.push(...validateTournament(doc, t.unitType).map((e) => `${t.id}: ${e}`));
  }
  return errors;
}

export function unitFlags(unit, videosTarget) {
  return {
    notAlphabetical: unit.b != null && !isAlphabetical(unit.a, unit.b),
    belowTarget: videosTarget != null && unit.videos != null && unit.videos < videosTarget,
  };
}
