import { foldName } from './names.js';
import { unitKey } from './pairs.js';
import { nextUnitId } from './ids.js';

export function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

const copy = (value) => structuredClone(value);
const same = (x, y) => foldName(x) === foldName(y);
const result = (doc, conflict) => ({ doc, conflict });

export function applyTournamentOp(input, op) {
  const doc = copy(input);
  const unit = op.unitId ? doc.units.find((u) => u.id === op.unitId) : undefined;
  switch (op.type) {
    case 'setStatus': {
      if (!unit) return result(doc, true);
      const conflict = unit.status !== op.from;
      if (unit.status !== op.to) {
        unit.history = [...(unit.history ?? []), { at: op.at, from: unit.status, to: op.to }];
        unit.status = op.to;
      }
      unit.updatedAt = op.at;
      return result(doc, conflict);
    }
    case 'setField': {
      if (!unit) return result(doc, true);
      const conflict = unit[op.field] !== op.from;
      unit[op.field] = op.to;
      unit.updatedAt = op.at;
      return result(doc, conflict);
    }
    case 'swap': {
      if (!unit || unit.b == null) return result(doc, true);
      [unit.a, unit.b] = [unit.b, unit.a];
      unit.updatedAt = op.at;
      unit.history = [...(unit.history ?? []), { at: op.at, event: 'поміняно місцями' }];
      return result(doc, false);
    }
    case 'addUnits': {
      const keys = new Set(doc.units.map((u) => unitKey(u.a, u.b)));
      let conflict = false;
      for (const u of op.units) {
        const key = unitKey(u.a, u.b);
        if (keys.has(key)) {
          conflict = true;
          continue;
        }
        keys.add(key);
        const id = doc.units.some((x) => x.id === u.id) ? nextUnitId(doc.units) : u.id;
        doc.units.push({ ...copy(u), id });
      }
      return result(doc, conflict);
    }
    case 'deleteUnit':
      doc.units = doc.units.filter((u) => u.id !== op.unitId);
      return result(doc, !unit);
    case 'addPool':
      for (const m of op.members) {
        if (!doc.pool.some((x) => same(x.name, m.name))) doc.pool.push({ name: m.name, strength: m.strength ?? null });
      }
      return result(doc, false);
    case 'setStrength': {
      const member = doc.pool.find((x) => same(x.name, op.name));
      if (!member) return result(doc, true);
      const conflict = member.strength !== op.from;
      member.strength = op.to;
      return result(doc, conflict);
    }
    case 'renamePool': {
      const member = doc.pool.find((x) => same(x.name, op.from));
      if (!member) return result(doc, true);
      member.name = op.to;
      for (const u of doc.units) {
        if (same(u.a, op.from)) u.a = op.to;
        if (u.b != null && same(u.b, op.from)) u.b = op.to;
      }
      return result(doc, false);
    }
    case 'removePool': {
      const used = doc.units.some((u) => same(u.a, op.name) || (u.b != null && same(u.b, op.name)));
      if (used) return result(doc, true);
      doc.pool = doc.pool.filter((x) => !same(x.name, op.name));
      return result(doc, false);
    }
    case 'setNotes': {
      const conflict = doc.notes !== op.from;
      doc.notes = op.to;
      return result(doc, conflict);
    }
    default:
      throw new Error(`Невідома операція турніру: ${op.type}`);
  }
}

const ADD = {
  addSport: ['sports', 'sport'],
  addCategory: ['categories', 'category'],
  addTournament: ['tournaments', 'tournament'],
  addContentType: ['contentTypes', 'contentType'],
};

export function applyStructureOp(input, op) {
  const s = copy(input);
  if (ADD[op.type]) {
    const [listKey, itemKey] = ADD[op.type];
    const item = op[itemKey];
    if (s[listKey].some((x) => x.id === item.id)) return result(s, true);
    s[listKey].push(copy(item));
    return result(s, false);
  }
  const update = (list) => {
    const target = list.find((x) => x.id === op.id);
    if (!target) return result(s, true);
    const conflict = Object.entries(op.from ?? {}).some(([k, v]) => target[k] !== v);
    Object.assign(target, op.changes);
    return result(s, conflict);
  };
  switch (op.type) {
    case 'updateTournament':
      return update(s.tournaments);
    case 'updateContentType':
      return update(s.contentTypes);
    case 'deleteTournament': {
      const existed = s.tournaments.some((t) => t.id === op.id);
      s.tournaments = s.tournaments.filter((t) => t.id !== op.id);
      return result(s, !existed);
    }
    default:
      throw new Error(`Невідома операція структури: ${op.type}`);
  }
}

export function applyOpsToText(path, text, ops) {
  const reducer = path === 'structure.json' ? applyStructureOp : applyTournamentOp;
  let current = text;
  let doc = null;
  let deleted = false;
  const conflicts = [];
  const settle = () => {
    if (doc) {
      current = serializeJson(doc);
      doc = null;
    }
  };
  for (const op of ops) {
    if (op.type === 'setText') {
      settle();
      if (current !== op.from) conflicts.push(op);
      current = op.to;
      deleted = false;
      continue;
    }
    if (op.type === 'deleteFile') {
      settle();
      current = null;
      deleted = true;
      continue;
    }
    if (doc == null) {
      if (current == null) {
        conflicts.push(op);
        continue;
      }
      doc = JSON.parse(current);
    }
    const r = reducer(doc, op);
    doc = r.doc;
    if (r.conflict) conflicts.push(op);
  }
  settle();
  return { text: current, conflicts, deleted };
}
