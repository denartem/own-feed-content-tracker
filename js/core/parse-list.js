import { cleanName, foldName } from './names.js';
import { unitKey } from './pairs.js';

const SEPARATORS = new Set(['-', '–', '—', '_']);

function stripDecorations(line) {
  return String(line).replace(/\*\*/g, '').replace(/^\s*(?:\d+[.)]|[-*•])\s+/, '').trim();
}

export function parseLine(rawLine, poolNames, unitType = 'pair') {
  const line = stripDecorations(rawLine);
  if (!line) return null;
  const byKey = new Map(poolNames.map((n) => [foldName(n), n]));
  if (unitType !== 'pair') {
    const known = byKey.get(foldName(line));
    return { kind: 'single', raw: rawLine, a: known ?? cleanName(line), known: Boolean(known) };
  }
  for (let i = 1; i < line.length - 1; i += 1) {
    if (!SEPARATORS.has(line[i])) continue;
    const a = byKey.get(foldName(line.slice(0, i)));
    const b = byKey.get(foldName(line.slice(i + 1)));
    if (a && b && a !== b) return { kind: 'pair', raw: rawLine, a, b, known: true };
  }
  const spaced = line.search(/\s[-–—]\s/);
  const cut = spaced >= 0 ? spaced + 1 : line.search(/[-–—]/);
  if (cut > 0) {
    const a = cleanName(line.slice(0, cut));
    const b = cleanName(line.slice(cut + 1));
    if (a && b) {
      return { kind: 'pair', raw: rawLine, a: byKey.get(foldName(a)) ?? a, b: byKey.get(foldName(b)) ?? b, known: false };
    }
  }
  return { kind: 'unrecognized', raw: rawLine };
}

export function parseList(text, poolNames, unitType = 'pair') {
  return String(text).split(/\r?\n/).map((l) => parseLine(l, poolNames, unitType)).filter(Boolean);
}

export function planPaste(doc, parsed, { status, addMissing }) {
  const byKey = new Map(doc.units.map((u) => [unitKey(u.a, u.b), u]));
  const poolKeys = new Set(doc.pool.map((m) => foldName(m.name)));
  const plan = { updates: [], unchanged: 0, additions: [], newPoolMembers: [], unrecognized: [], skipped: [] };
  const seen = new Set();
  for (const p of parsed) {
    if (p.kind === 'unrecognized') {
      plan.unrecognized.push(p.raw);
      continue;
    }
    const b = p.kind === 'pair' ? p.b : null;
    const key = unitKey(p.a, b);
    if (seen.has(key)) continue;
    seen.add(key);
    const unit = byKey.get(key);
    if (unit) {
      if (unit.status === status) plan.unchanged += 1;
      else plan.updates.push({ unitId: unit.id, from: unit.status, to: status });
      continue;
    }
    if (!addMissing) {
      plan.skipped.push(p.raw);
      continue;
    }
    plan.additions.push({ a: p.a, b });
    for (const n of [p.a, b]) {
      if (n != null && !poolKeys.has(foldName(n))) {
        poolKeys.add(foldName(n));
        plan.newPoolMembers.push(n);
      }
    }
  }
  return plan;
}
