import { h, downloadText } from './dom.js';
import { localToday } from './actions.js';

export const TOKEN_KEY = 'own-feed-token';
export const REPO_KEY = 'own-feed-repo';
export const DEFAULT_REPO = 'denartem/own-feed-data';

let accessMessage = '';

export function renderTokenForm({ reason = null } = {}) {
  const hasToken = Boolean(localStorage.getItem(TOKEN_KEY));
  return h('form', {
    class: 'form-grid',
    onSubmit: (e) => {
      e.preventDefault();
      const f = e.target.elements;
      if (f.token.value.trim()) localStorage.setItem(TOKEN_KEY, f.token.value.trim());
      localStorage.setItem(REPO_KEY, f.repo.value.trim() || DEFAULT_REPO);
      location.reload();
    },
  },
  reason ? h('div', { class: 'warn-line', style: 'grid-column: 1 / -1' }, reason) : null,
  h('label', { for: 'set-token' }, 'Токен GitHub'),
  h('input', { id: 'set-token', name: 'token', type: 'password', autocomplete: 'off', placeholder: hasToken ? 'збережено; введіть новий, щоб замінити' : 'github_pat_…' }),
  h('label', { for: 'set-repo' }, 'Репозиторій даних'),
  h('input', { id: 'set-repo', name: 'repo', value: localStorage.getItem(REPO_KEY) || DEFAULT_REPO }),
  h('span'),
  h('div', {}, h('button', { type: 'submit', class: 'primary' }, 'Зберегти й перезавантажити')));
}

export function renderSettings({ app, actions, store, sync }) {
  const pending = sync.pending().length;
  return h('section', {},
    h('h2', {}, 'Налаштування'),
    app.state.mode === 'local' ? h('p', { class: 'warn-line' }, 'Тестовий режим: синтетичні дані, зміни зникнуть після перезавантаження.') : null,
    renderTokenForm(),
    h('div', { class: 'toolbar', style: 'margin-top:12px' },
      h('button', {
        onClick: async () => {
          accessMessage = 'Перевіряю…';
          app.notify();
          accessMessage = (await store.checkAccess()) ? 'Доступ є.' : 'Немає доступу: перевірте токен і назву репозиторію.';
          app.notify();
        },
      }, 'Перевірити доступ'),
      h('button', {
        class: 'danger',
        onClick: () => {
          if (confirm('Забути токен у цьому браузері?')) {
            localStorage.removeItem(TOKEN_KEY);
            location.reload();
          }
        },
      }, 'Забути токен'),
      h('span', { class: 'muted' }, accessMessage)),
    h('h2', {}, 'Дані'),
    h('p', {}, `Незбережених змін у черзі: ${pending}`),
    h('div', { class: 'toolbar' },
      pending ? h('button', { onClick: () => sync.retry() }, 'Зберегти зараз') : null,
      h('button', { onClick: () => downloadText(`own-feed-${localToday()}.csv`, actions.exportCsv()) }, 'Експорт CSV')));
}
