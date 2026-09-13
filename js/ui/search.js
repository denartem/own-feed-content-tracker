import { h, statusClass } from './dom.js';
import { foldName } from '../core/names.js';
import { unitLabel } from '../core/pairs.js';
import { tournamentHref } from './router.js';

export function renderSearch({ app }, route) {
  const query = route.params.q ?? '';
  const q = foldName(query);
  const results = [];
  if (q) {
    for (const t of app.state.structure.tournaments) {
      for (const u of app.state.docs[t.id]?.units ?? []) {
        if (foldName(unitLabel(u)).includes(q)) results.push({ t, u });
      }
    }
  }
  return h('section', {},
    h('h2', {}, query ? `Пошук: ${query}` : 'Пошук'),
    results.length
      ? h('div', { class: 'table-wrap' }, h('table', { class: 'grid' }, h('tbody', {}, results.slice(0, 300).map(({ t, u }) => h('tr', {},
        h('td', {}, h('a', { href: tournamentHref(t.id, { open: u.id }) }, unitLabel(u))),
        h('td', { class: 'muted' }, t.name),
        h('td', {}, h('span', { class: `status ${statusClass(u.status)}` }, u.status)))))))
      : h('p', { class: 'muted' }, q ? 'Нічого не знайдено.' : 'Введіть назву команди, гравця або пари у полі пошуку вгорі.'));
}
