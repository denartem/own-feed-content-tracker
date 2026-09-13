import { STATUSES } from './constants.js';
import { unitFlags } from './validate.js';

export function tournamentStats(doc, videosTarget = null) {
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  let videosTotal = 0;
  let notAlphabetical = 0;
  let belowTarget = 0;
  for (const u of doc.units) {
    byStatus[u.status] += 1;
    if (u.videos != null) videosTotal += u.videos;
    const flags = unitFlags(u, videosTarget);
    if (flags.notAlphabetical) notAlphabetical += 1;
    if (flags.belowTarget) belowTarget += 1;
  }
  const plan = doc.units.length - byStatus['invalid data'];
  return {
    total: doc.units.length, byStatus, plan, done: byStatus.done,
    progress: plan ? byStatus.done / plan : 0, videosTotal, notAlphabetical, belowTarget,
  };
}

export function overviewStats(structure, docsById) {
  const types = new Map(structure.contentTypes.map((c) => [c.id, c]));
  const categories = new Map(structure.categories.map((c) => [c.id, c]));
  const sports = new Map(structure.sports.map((s) => [s.id, s]));
  const totals = { done: 0, 'in progress': 0, 'to do': 0 };
  const rows = [];
  const inProgress = [];
  for (const t of structure.tournaments) {
    const doc = docsById[t.id];
    if (!doc) continue;
    const stats = tournamentStats(doc, types.get(t.contentTypeId)?.videosTarget ?? null);
    for (const key of Object.keys(totals)) totals[key] += stats.byStatus[key];
    const category = categories.get(t.categoryId);
    rows.push({
      id: t.id, name: t.name, categoryName: category?.name ?? '',
      sportName: sports.get(category?.sportId)?.name ?? '', stats,
    });
    const active = doc.units.filter((u) => u.status === 'in progress');
    if (active.length) inProgress.push({ id: t.id, name: t.name, units: active });
  }
  return { totals, rows, inProgress };
}
