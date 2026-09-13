import { h } from './dom.js';
import { tournamentStats } from '../core/stats.js';
import { tournamentHref, contentTypeHref } from './router.js';

const SYNC_LABEL = {
  dirty: 'є незбережені зміни', saving: 'зберігаю…', saved: 'збережено',
  offline: 'немає зв’язку', auth: 'перевірте токен', error: 'помилка збереження',
};

function renderSidebar(structure, docs, route) {
  const isActive = (name, id) => route.name === name && route.id === id;
  return h('nav', { class: 'sidebar' },
    h('a', { class: `tree-item${route.name === 'overview' ? ' active' : ''}`, href: '#/' }, 'Огляд'),
    structure.sports.map((sport) => h('div', { class: 'tree-sport' },
      h('div', { class: 'tree-label' }, sport.name),
      structure.categories.filter((c) => c.sportId === sport.id).map((cat) => h('div', { class: 'tree-cat' },
        h('div', { class: 'tree-label' }, cat.name),
        structure.tournaments.filter((t) => t.categoryId === cat.id).map((t) => {
          const st = docs[t.id] ? tournamentStats(docs[t.id]) : null;
          return h('a', { class: `tree-item${isActive('tournament', t.id) ? ' active' : ''}`, href: tournamentHref(t.id) },
            h('span', {}, t.name), h('span', { class: 'count' }, st && st.total ? `${st.done}/${st.plan}` : '—'));
        }))))),
    h('a', { class: 'tree-add', href: '#/new' }, '+ Турнір'),
    h('div', { class: 'tree-label' }, 'Типи контенту'),
    structure.contentTypes.map((c) => h('a', {
      class: `tree-item${isActive('contentType', c.id) ? ' active' : ''}`, href: contentTypeHref(c.id),
    }, c.name)),
    h('a', { class: 'tree-add', href: '#/new?kind=type' }, '+ Тип контенту'));
}

export function renderLayout(root, { app, route, main }) {
  const { structure, docs, syncState, notice, mode } = app.state;
  // replaceChildren перетворює null на текст «null», тому порожні частини відфільтровуються
  root.replaceChildren(...[
    h('header', { class: 'topbar' },
      h('button', { class: 'menu-toggle', 'aria-label': 'Меню', onClick: () => document.body.classList.toggle('nav-open') }, '☰'),
      h('a', { class: 'brand', href: '#/' }, 'Own feed · трекер'),
      mode === 'local' ? h('span', { class: 'chip warn' }, 'тестові дані') : null,
      h('input', {
        id: 'global-search', class: 'search', type: 'search', placeholder: 'Пошук команди чи пари',
        value: route.name === 'search' ? route.params.q ?? '' : '',
        onKeydown: (e) => {
          if (e.key === 'Enter') location.hash = `#/search?q=${encodeURIComponent(e.target.value.trim())}`;
        },
      }),
      h('span', { class: `sync sync-${syncState}` }, SYNC_LABEL[syncState] ?? syncState),
      h('a', { href: '#/settings' }, 'Налаштування')),
    notice ? h('div', { class: 'notice', title: 'Закрити', onClick: () => app.setNotice(null) }, `${notice} ✕`) : null,
    h('div', { class: 'shell' }, renderSidebar(structure, docs, route), h('main', { class: 'main' }, main)),
  ].filter(Boolean));
}
