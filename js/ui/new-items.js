import { h } from './dom.js';
import { UNIT_TYPES } from '../core/constants.js';
import { sameName } from '../core/names.js';
import { tournamentHref, contentTypeHref } from './router.js';

const UNIT_LABELS = { pair: 'пари', player: 'гравці', team: 'команди' };
const NEW_TYPE = '__new__';
const EMPTY = { sportName: '', categoryName: '', name: '', contentTypeId: '', newTypeName: '', unitType: 'pair', poolText: '', error: '' };
const draft = { ...EMPTY };
const typeDraft = { name: '', error: '' };

export function renderNewItems(ctx, route) {
  return route.params.kind === 'type' ? renderNewType(ctx) : renderNewTournament(ctx);
}

function renderNewType({ app, actions }) {
  return h('section', {},
    h('h2', {}, 'Новий тип контенту'),
    h('form', {
      class: 'form-grid',
      onSubmit: (e) => {
        e.preventDefault();
        const result = actions.createContentType(typeDraft.name);
        if (result.error) {
          typeDraft.error = result.error;
          app.notify();
          return;
        }
        Object.assign(typeDraft, { name: '', error: '' });
        location.hash = contentTypeHref(result.id);
      },
    },
    h('label', { for: 'new-type-name' }, 'Назва'),
    h('input', { id: 'new-type-name', value: typeDraft.name, placeholder: 'Match Moments', onInput: (e) => { typeDraft.name = e.target.value; } }),
    typeDraft.error ? h('div', { class: 'warn-line', style: 'grid-column: 1 / -1' }, typeDraft.error) : null,
    h('span'),
    h('div', {}, h('button', { type: 'submit', class: 'primary' }, 'Створити'))),
    h('p', { class: 'muted' }, 'Паспорт створиться за шаблоном; розділи заповнюються на сторінці типу.'));
}

function renderNewTournament({ app, actions }) {
  const { structure } = app.state;
  const sport = structure.sports.find((s) => sameName(s.name, draft.sportName));
  const categories = sport ? structure.categories.filter((c) => c.sportId === sport.id) : [];
  const category = categories.find((c) => sameName(c.name, draft.categoryName));
  const sibling = category ? structure.tournaments.find((t) => t.categoryId === category.id) : null;
  if (!draft.contentTypeId && sibling) draft.contentTypeId = sibling.contentTypeId;
  const set = (key) => (e) => {
    draft[key] = e.target.value;
    draft.error = '';
    app.notify();
  };
  return h('section', {},
    h('h2', {}, 'Новий турнір'),
    h('form', {
      class: 'form-grid',
      onSubmit: (e) => {
        e.preventDefault();
        let { contentTypeId } = draft;
        if (contentTypeId === NEW_TYPE) {
          const created = actions.createContentType(draft.newTypeName);
          if (created.error) {
            draft.error = created.error;
            app.notify();
            return;
          }
          contentTypeId = created.id;
        }
        const result = actions.createTournament({ ...draft, contentTypeId });
        if (result.error) {
          draft.error = result.error;
          app.notify();
          return;
        }
        Object.assign(draft, EMPTY);
        location.hash = tournamentHref(result.id);
      },
    },
    h('label', { for: 'new-sport' }, 'Спорт'),
    h('input', { id: 'new-sport', list: 'sports-list', value: draft.sportName, onInput: set('sportName') }),
    h('datalist', { id: 'sports-list' }, structure.sports.map((s) => h('option', { value: s.name }))),
    h('label', { for: 'new-category' }, 'Категорія'),
    h('input', { id: 'new-category', list: 'categories-list', value: draft.categoryName, onInput: set('categoryName') }),
    h('datalist', { id: 'categories-list' }, categories.map((c) => h('option', { value: c.name }))),
    h('label', { for: 'new-name' }, 'Назва турніру'),
    h('input', { id: 'new-name', value: draft.name, onInput: set('name') }),
    h('label', { for: 'new-type' }, 'Тип контенту'),
    h('select', { id: 'new-type', onChange: set('contentTypeId') },
      h('option', { value: '' }, '—'),
      structure.contentTypes.map((c) => h('option', { value: c.id, selected: draft.contentTypeId === c.id }, c.name)),
      h('option', { value: NEW_TYPE, selected: draft.contentTypeId === NEW_TYPE }, '+ новий тип…')),
    draft.contentTypeId === NEW_TYPE ? [
      h('label', { for: 'new-type-inline' }, 'Назва нового типу'),
      h('input', { id: 'new-type-inline', value: draft.newTypeName, onInput: set('newTypeName') }),
    ] : null,
    h('label', { for: 'new-unit' }, 'Одиниці'),
    h('select', { id: 'new-unit', onChange: set('unitType') },
      UNIT_TYPES.map((u) => h('option', { value: u, selected: draft.unitType === u }, UNIT_LABELS[u]))),
    h('label', { for: 'new-pool' }, 'Учасники, по одному в рядку'),
    h('textarea', { id: 'new-pool', rows: 8, onInput: set('poolText') }, draft.poolText),
    draft.error ? h('div', { class: 'warn-line', style: 'grid-column: 1 / -1' }, draft.error) : null,
    h('span'),
    h('div', {}, h('button', { type: 'submit', class: 'primary' }, 'Створити турнір'))),
    h('p', { class: 'muted' }, 'Після створення пари можна згенерувати з пулу або вставити списком.'));
}
