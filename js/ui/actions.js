import { newUnit, generateUnits, unitKey } from '../core/pairs.js';
import { nextUnitId, unitIdFrom, slugify, uniqueId, categoryId, tournamentId } from '../core/ids.js';
import { cleanName, foldName, sameName, findInPool } from '../core/names.js';
import { serializeJson } from '../core/ops.js';
import { PASSPORT_TEMPLATE, UNIT_TYPES } from '../core/constants.js';
import { toCsv } from '../core/csv.js';
import { tournamentPath, passportPath } from './state.js';

export function localToday(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function uniqueNames(text) {
  const seen = new Set();
  const names = [];
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const name = cleanName(line);
    if (name && !seen.has(foldName(name))) {
      seen.add(foldName(name));
      names.push(name);
    }
  }
  return names;
}

export function createActions(app, { today = localToday } = {}) {
  const doc = (tId) => app.state.docs[tId];
  const unitOf = (tId, unitId) => doc(tId)?.units.find((u) => u.id === unitId);
  const addUnits = (tId, units) => {
    if (units.length) app.dispatchTournament(tId, { type: 'addUnits', units });
  };
  const fromOf = (target, changes) => Object.fromEntries(Object.keys(changes).map((k) => [k, target[k]]));
  const unchanged = (target, changes) => Object.entries(changes).every(([k, v]) => target[k] === v);

  const actions = {
    setStatus(tId, unitId, to) {
      const u = unitOf(tId, unitId);
      if (!u || u.status === to) return;
      app.dispatchTournament(tId, { type: 'setStatus', unitId, from: u.status, to, at: today() });
    },
    setStatuses(tId, unitIds, to) {
      unitIds.forEach((id) => actions.setStatus(tId, id, to));
    },
    setField(tId, unitId, field, to) {
      const u = unitOf(tId, unitId);
      if (!u || u[field] === to) return;
      app.dispatchTournament(tId, { type: 'setField', unitId, field, from: u[field], to, at: today() });
    },
    swap(tId, unitId) {
      app.dispatchTournament(tId, { type: 'swap', unitId, at: today() });
    },
    deleteUnit(tId, unitId) {
      app.dispatchTournament(tId, { type: 'deleteUnit', unitId });
    },
    addUnit(tId, a, b = null) {
      const d = doc(tId);
      if (b != null && sameName(a, b)) return 'Оберіть двох різних учасників';
      if (d.units.some((u) => unitKey(u.a, u.b) === unitKey(a, b))) return 'Така пара вже є';
      addUnits(tId, [newUnit(nextUnitId(d.units), a, b, 'to do', today(), 'додано вручну')]);
      return null;
    },
    previewGenerate(tId) {
      return generateUnits(doc(tId), app.tournament(tId).unitType, today()).length;
    },
    generate(tId) {
      const units = generateUnits(doc(tId), app.tournament(tId).unitType, today());
      addUnits(tId, units);
      return units.length;
    },
    applyPaste(tId, plan, status) {
      if (plan.newPoolMembers.length) {
        app.dispatchTournament(tId, { type: 'addPool', members: plan.newPoolMembers.map((name) => ({ name, strength: null })) });
      }
      for (const u of plan.updates) {
        app.dispatchTournament(tId, { type: 'setStatus', unitId: u.unitId, from: u.from, to: u.to, at: today() });
      }
      let n = Number(nextUnitId(doc(tId).units).slice(1));
      addUnits(tId, plan.additions.map(({ a, b }) => {
        const unit = newUnit(unitIdFrom(n), a, b, status, today(), 'додано зі списку');
        n += 1;
        return unit;
      }));
    },
    addPoolMember(tId, raw) {
      const name = cleanName(raw);
      if (!name) return 'Вкажіть назву';
      if (findInPool(doc(tId).pool, name)) return 'Такий учасник уже є';
      app.dispatchTournament(tId, { type: 'addPool', members: [{ name, strength: null }] });
      return null;
    },
    setStrength(tId, name, to) {
      const member = findInPool(doc(tId).pool, name);
      if (!member || member.strength === to) return;
      app.dispatchTournament(tId, { type: 'setStrength', name: member.name, from: member.strength, to });
    },
    renamePool(tId, from, raw) {
      const to = cleanName(raw);
      if (!to) return 'Вкажіть назву';
      const existing = findInPool(doc(tId).pool, to);
      if (existing && !sameName(existing.name, from)) return 'Такий учасник уже є';
      app.dispatchTournament(tId, { type: 'renamePool', from, to });
      return null;
    },
    removePool(tId, name) {
      const used = doc(tId).units.some((u) => sameName(u.a, name) || (u.b != null && sameName(u.b, name)));
      if (used) return 'Учасник є в парах — спершу видаліть їх';
      app.dispatchTournament(tId, { type: 'removePool', name });
      return null;
    },
    setNotes(tId, text) {
      const d = doc(tId);
      if (d.notes === text) return;
      app.dispatchTournament(tId, { type: 'setNotes', from: d.notes, to: text });
    },
    savePassport(ctId, text) {
      app.dispatchFile(passportPath(ctId), { type: 'setText', from: app.state.passports[ctId] ?? null, to: text });
    },
    updateContentType(ctId, changes) {
      const target = app.contentType(ctId);
      if (!target || unchanged(target, changes)) return;
      app.dispatchStructure({ type: 'updateContentType', id: ctId, from: fromOf(target, changes), changes });
    },
    updateTournament(tId, changes) {
      const target = app.tournament(tId);
      if (!target || unchanged(target, changes)) return;
      app.dispatchStructure({ type: 'updateTournament', id: tId, from: fromOf(target, changes), changes });
    },
    deleteTournament(tId) {
      app.dispatchStructure({ type: 'deleteTournament', id: tId });
      app.dispatchFile(tournamentPath(tId), { type: 'deleteFile' });
    },
    createContentType(rawName) {
      const name = cleanName(rawName);
      if (!name) return { error: 'Вкажіть назву типу' };
      const types = app.state.structure.contentTypes;
      if (types.some((c) => sameName(c.name, name))) return { error: 'Такий тип уже є' };
      const id = uniqueId(slugify(name), types.map((c) => c.id));
      app.dispatchStructure({ type: 'addContentType', contentType: { id, name, videosTarget: null, strength: false } });
      app.dispatchFile(passportPath(id), { type: 'setText', from: null, to: PASSPORT_TEMPLATE });
      return { id };
    },
    createTournament({ sportName, categoryName, name, contentTypeId, unitType, poolText }) {
      if (!cleanName(sportName) || !cleanName(categoryName) || !cleanName(name)) return { error: 'Заповніть спорт, категорію і назву' };
      if (!app.contentType(contentTypeId)) return { error: 'Оберіть тип контенту' };
      if (!UNIT_TYPES.includes(unitType)) return { error: 'Оберіть вид одиниці' };
      const s = () => app.state.structure;
      let sport = s().sports.find((x) => sameName(x.name, sportName));
      let category = sport && s().categories.find((c) => c.sportId === sport.id && sameName(c.name, categoryName));
      if (category && s().tournaments.some((t) => t.categoryId === category.id && sameName(t.name, name))) {
        return { error: 'Такий турнір уже є' };
      }
      if (!sport) {
        sport = { id: uniqueId(slugify(sportName), s().sports.map((x) => x.id)), name: cleanName(sportName) };
        app.dispatchStructure({ type: 'addSport', sport });
      }
      if (!category) {
        category = {
          id: uniqueId(categoryId(sport.id, categoryName), s().categories.map((c) => c.id)),
          sportId: sport.id, name: cleanName(categoryName),
        };
        app.dispatchStructure({ type: 'addCategory', category });
      }
      const id = uniqueId(tournamentId(category.id, name), s().tournaments.map((t) => t.id));
      app.dispatchStructure({ type: 'addTournament', tournament: { id, categoryId: category.id, name: cleanName(name), contentTypeId, unitType } });
      const pool = uniqueNames(poolText).map((n) => ({ name: n, strength: null }));
      app.dispatchFile(tournamentPath(id), { type: 'setText', from: null, to: serializeJson({ id, notes: '', pool, units: [] }) });
      return { id };
    },
    exportCsv() {
      return toCsv(app.state.structure, app.state.docs);
    },
  };
  return actions;
}
