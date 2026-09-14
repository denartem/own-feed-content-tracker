import { h } from './dom.js';
import { overviewStats } from '../core/stats.js';
import { unitLabel } from '../core/pairs.js';
import { tournamentHref } from './router.js';

function bar(st) {
  const plan = st.plan || 1;
  const part = (cls, n) => h('span', { class: cls, style: `width:${(n / plan) * 100}%` });
  return h('div', { class: 'bar', title: `done ${st.byStatus.done} · in progress ${st.byStatus['in progress']} · to do ${st.byStatus['to do']}` },
    part('s-done', st.byStatus.done), part('s-progress', st.byStatus['in progress']), part('s-todo', st.byStatus['to do']));
}

export function renderOverview({ app }) {
  const { structure, docs } = app.state;
  const ov = overviewStats(structure, docs);
  const rowById = new Map(ov.rows.map((r) => [r.id, r]));
  return h('section', { class: 'overview' },
    h('div', { class: 'metrics' }, ['done', 'in progress', 'to do'].map((s) => h('div', { class: 'metric' },
      h('div', { class: 'metric-label' }, s), h('div', { class: 'metric-value' }, String(ov.totals[s]))))),
    h('h2', {}, 'Зараз у роботі'),
    ov.inProgress.length
      ? ov.inProgress.map((g) => h('details', { class: 'active-group' },
        h('summary', {}, h('a', { href: tournamentHref(g.id) }, g.path), ` — ${g.units.length}`),
        h('ul', {}, g.units.map((u) => h('li', {}, h('a', { href: tournamentHref(g.id, { open: u.id }) }, unitLabel(u)))))))
      : h('p', { class: 'muted' }, 'Зараз нічого не в роботі.'),
    h('h2', {}, 'Турніри'),
    structure.sports.map((sport) => {
      const rows = structure.categories.filter((c) => c.sportId === sport.id)
        .flatMap((c) => structure.tournaments.filter((t) => t.categoryId === c.id))
        .map((t) => rowById.get(t.id)).filter(Boolean);
      if (!rows.length) return null;
      return h('div', { class: 'sport-block' }, h('h3', {}, sport.name),
        rows.map((r) => h('a', { class: 'progress-row', href: tournamentHref(r.id) },
          h('span', {}, `${r.categoryName} · ${r.name}`),
          r.stats.total ? bar(r.stats) : h('span', { class: 'muted' }, 'пар ще немає'),
          h('span', { class: 'row-count' }, r.stats.total ? `${r.stats.done} з ${r.stats.plan}` : ''))));
    }),
    h('div', { class: 'legend' },
      h('span', {}, h('span', { class: 'dot s-done' }), 'done'),
      h('span', {}, h('span', { class: 'dot s-progress' }), 'in progress'),
      h('span', {}, h('span', { class: 'dot s-todo' }), 'to do')));
}
