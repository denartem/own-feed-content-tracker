import { h, statusClass, formatDate } from './dom.js';
import { STATUSES } from '../core/constants.js';
import { tournamentStats } from '../core/stats.js';
import { boardColumns, sortUnits } from '../core/board.js';
import { unitFlags } from '../core/validate.js';
import { unitLabel } from '../core/pairs.js';
import { foldName, findInPool, compareNames } from '../core/names.js';
import { tournamentHref, contentTypeHref } from './router.js';
import { openUnitCard } from './unit-card.js';
import { openPasteDialog, openAddUnitDialog } from './paste-dialog.js';
import { pluralUk } from '../core/commit-message.js';

const views = new Map();
let openedFor = null;

function generate(ctx, t) {
  const n = ctx.actions.previewGenerate(t.id);
  if (!n) {
    alert('Усі можливі одиниці з пулу вже є.');
    return;
  }
  if (confirm(`Буде додано ${n} ${pluralUk(n, ['одиницю', 'одиниці', 'одиниць'])} зі статусом to do. Додати?`)) {
    ctx.actions.generate(t.id);
  }
}

function viewState(id) {
  if (!views.has(id)) views.set(id, { view: 'board', q: '', status: '', flag: '', sort: 'status', selected: new Set() });
  return views.get(id);
}

const byLabel = (x, y) => compareNames(unitLabel(x), unitLabel(y));
const SORTS = {
  label: byLabel,
  status: (x, y) => STATUSES.indexOf(x.status) - STATUSES.indexOf(y.status) || byLabel(x, y),
  videos: (x, y) => (x.videos ?? -1) - (y.videos ?? -1) || byLabel(x, y),
  updatedAt: (x, y) => String(y.updatedAt).localeCompare(String(x.updatedAt)) || byLabel(x, y),
};

function filterUnits(doc, vs, target) {
  const q = foldName(vs.q);
  return doc.units.filter((u) => (!q || foldName(unitLabel(u)).includes(q))
    && (!vs.status || u.status === vs.status)
    && (!vs.flag || unitFlags(u, target)[vs.flag]));
}

function badges(u, target) {
  const flags = unitFlags(u, target);
  return [
    u.priority ? h('span', { class: `badge${u.priority === 'high' ? ' high' : ''}` }, u.priority) : null,
    u.videos != null ? h('span', { class: `badge${flags.belowTarget ? ' warn' : ''}` }, target != null ? `відео ${u.videos}/${target}` : `відео ${u.videos}`) : null,
    flags.notAlphabetical ? h('span', { class: 'badge warn', title: 'Назва не за алфавітом' }, 'А→Я') : null,
  ];
}

function renderBoard(ctx, t, units, target) {
  return h('div', { class: 'board' }, boardColumns(units).map((col) => h('div', { class: 'column' },
    h('div', { class: 'column-head' }, h('span', { class: `status ${statusClass(col.status)}` }, col.status), ` ${col.units.length}`),
    col.units.map((u) => h('div', { class: 'card', onClick: () => openUnitCard(ctx, t.id, u.id) },
      h('div', { class: 'card-title' }, unitLabel(u)),
      h('div', { class: 'card-meta' }, badges(u, target)),
      u.status === 'invalid data' && u.note ? h('div', { class: 'muted' }, u.note) : null)))));
}

function renderTable(ctx, t, doc, units, target, strengthOn, vs) {
  const { actions } = ctx;
  const rerender = () => ctx.app.notify();
  const sorted = vs.sort === 'priority' ? sortUnits(units) : [...units].sort(SORTS[vs.sort] ?? SORTS.status);
  const allSelected = sorted.length > 0 && sorted.every((u) => vs.selected.has(u.id));
  const head = (key, label) => h('th', { class: 'sortable', onClick: () => { vs.sort = key; rerender(); } }, vs.sort === key ? `${label} ↓` : label);
  const strength = (name) => findInPool(doc.pool, name)?.strength ?? '—';
  return h('div', {},
    vs.selected.size ? h('div', { class: 'bulk' },
      `Вибрано: ${vs.selected.size}`,
      h('select', { id: `bulk-status-${t.id}` }, STATUSES.map((s) => h('option', { value: s }, s))),
      h('button', {
        class: 'primary',
        onClick: () => {
          const to = document.getElementById(`bulk-status-${t.id}`).value;
          const ids = [...vs.selected];
          vs.selected.clear();
          actions.setStatuses(t.id, ids, to);
        },
      }, 'Застосувати'),
      h('button', { onClick: () => { vs.selected.clear(); rerender(); } }, 'Скасувати')) : null,
    h('div', { class: 'table-wrap' }, h('table', { class: 'grid' },
      h('thead', {}, h('tr', {},
        h('th', {}, h('input', {
          type: 'checkbox', 'aria-label': 'Вибрати всі', checked: allSelected,
          onChange: (e) => {
            sorted.forEach((u) => (e.target.checked ? vs.selected.add(u.id) : vs.selected.delete(u.id)));
            rerender();
          },
        })),
        head('label', 'Учасники'),
        strengthOn ? h('th', {}, 'Сила') : null,
        head('status', 'Статус'), head('priority', 'Пріоритет'), head('videos', 'Відео'),
        h('th', {}, 'Нотатка'), head('updatedAt', 'Дата'))),
      h('tbody', {}, sorted.map((u) => {
        const flags = unitFlags(u, target);
        return h('tr', {},
          h('td', {}, h('input', {
            type: 'checkbox', 'aria-label': unitLabel(u), checked: vs.selected.has(u.id),
            onChange: (e) => {
              if (e.target.checked) vs.selected.add(u.id);
              else vs.selected.delete(u.id);
              rerender();
            },
          })),
          h('td', {},
            h('a', { href: '#', onClick: (e) => { e.preventDefault(); openUnitCard(ctx, t.id, u.id); } }, unitLabel(u)),
            flags.notAlphabetical ? h('span', { class: 'badge warn', title: 'Назва не за алфавітом' }, 'А→Я') : null),
          strengthOn ? h('td', {}, u.b == null ? strength(u.a) : `${strength(u.a)} / ${strength(u.b)}`) : null,
          h('td', {}, h('select', { 'aria-label': 'Статус', onChange: (e) => actions.setStatus(t.id, u.id, e.target.value) },
            STATUSES.map((s) => h('option', { value: s, selected: s === u.status }, s)))),
          h('td', {}, u.priority ?? ''),
          h('td', { class: flags.belowTarget ? 'warn-text' : null }, u.videos ?? ''),
          h('td', { class: 'muted' }, u.note),
          h('td', { class: 'muted' }, formatDate(u.updatedAt)));
      })))));
}

function renderPairsTab(ctx, t, doc, ct) {
  const vs = viewState(t.id);
  const rerender = () => ctx.app.notify();
  const target = ct?.videosTarget ?? null;
  const units = filterUnits(doc, vs, target);
  return h('section', {},
    h('div', { class: 'toolbar' },
      h('div', { class: 'seg' }, [['board', 'Дошка'], ['table', 'Таблиця']].map(([key, label]) =>
        h('button', { class: vs.view === key ? 'active' : null, onClick: () => { vs.view = key; rerender(); } }, label))),
      h('input', { id: `q-${t.id}`, type: 'search', placeholder: 'Фільтр за назвою', value: vs.q, onInput: (e) => { vs.q = e.target.value; rerender(); } }),
      vs.view === 'table' ? h('select', { id: `status-${t.id}`, onChange: (e) => { vs.status = e.target.value; rerender(); } },
        h('option', { value: '' }, 'усі статуси'),
        STATUSES.map((s) => h('option', { value: s, selected: vs.status === s }, s))) : null,
      h('select', { id: `flag-${t.id}`, onChange: (e) => { vs.flag = e.target.value; rerender(); } },
        h('option', { value: '' }, 'усі'),
        h('option', { value: 'notAlphabetical', selected: vs.flag === 'notAlphabetical' }, 'не за алфавітом'),
        h('option', { value: 'belowTarget', selected: vs.flag === 'belowTarget' }, 'відео менше норми')),
      h('span', { class: 'spacer' }),
      h('button', { onClick: () => openAddUnitDialog(ctx, t.id) }, t.unitType === 'pair' ? '+ Пара' : '+ Одиниця'),
      h('button', { onClick: () => openPasteDialog(ctx, t.id) }, 'Вставити список'),
      h('button', { onClick: () => generate(ctx, t) }, 'Згенерувати з пулу')),
    doc.units.length ? null : h('p', { class: 'muted' }, 'Одиниць ще немає. Додайте їх вручну, вставте списком або згенеруйте з пулу.'),
    vs.view === 'board' ? renderBoard(ctx, t, units, target) : renderTable(ctx, t, doc, units, target, ct?.strength === true, vs));
}

const TABS = [
  ['pairs', 'Пари', renderPairsTab],
];

function renderHeader(ctx, t, doc, ct) {
  const { structure } = ctx.app.state;
  const category = structure.categories.find((c) => c.id === t.categoryId);
  const sport = structure.sports.find((s) => s.id === category?.sportId);
  const st = tournamentStats(doc, ct?.videosTarget ?? null);
  return h('div', {},
    h('div', { class: 'crumbs' }, `${sport?.name ?? ''} › ${category?.name ?? ''} › `, h('strong', {}, t.name)),
    h('div', { class: 'chips' },
      ct ? h('a', { class: 'chip accent', href: contentTypeHref(ct.id) }, `тип: ${ct.name}`) : null,
      ct?.videosTarget != null ? h('span', { class: 'chip' }, `норма відео: ${ct.videosTarget}`) : null,
      h('span', { class: 'chip' }, `пул: ${doc.pool.length}`),
      STATUSES.map((s) => h('span', { class: `chip ${statusClass(s)}` }, `${s}: ${st.byStatus[s]}`)),
      st.videosTotal ? h('span', { class: 'chip' }, `відео: ${st.videosTotal}`) : null,
      st.notAlphabetical ? h('span', { class: 'chip warn' }, `не за алфавітом: ${st.notAlphabetical}`) : null,
      st.belowTarget ? h('span', { class: 'chip warn' }, `відео менше норми: ${st.belowTarget}`) : null));
}

export function renderTournament(ctx, route) {
  const t = ctx.app.tournament(route.id);
  const doc = t ? ctx.app.state.docs[t.id] : null;
  if (!t || !doc) return h('p', { class: 'muted' }, 'Турнір не знайдено.');
  const ct = ctx.app.contentType(t.contentTypeId);
  const tab = TABS.find(([key]) => key === route.params.tab) ?? TABS[0];
  if (route.params.open && openedFor !== location.hash) {
    openedFor = location.hash;
    queueMicrotask(() => openUnitCard(ctx, t.id, route.params.open));
  }
  return h('section', {},
    renderHeader(ctx, t, doc, ct),
    h('nav', { class: 'tabs' }, TABS.map(([key, label]) => h('a', {
      class: key === tab[0] ? 'active' : null, href: tournamentHref(t.id, key === 'pairs' ? {} : { tab: key }),
    }, label))),
    tab[2](ctx, t, doc, ct));
}
