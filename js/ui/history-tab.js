import { h, formatDate } from './dom.js';
import { tournamentPath } from './state.js';

const commitsCache = new Map();

export function renderHistoryTab(ctx, t) {
  const path = tournamentPath(t.id);
  let entry = commitsCache.get(path);
  if (!entry) {
    entry = { loading: true };
    commitsCache.set(path, entry);
    ctx.loadCommits(path)
      .then((commits) => commitsCache.set(path, { commits }))
      .catch(() => commitsCache.set(path, { error: true }))
      .finally(() => ctx.app.notify());
  }
  let body;
  if (entry.loading) body = h('p', { class: 'muted' }, 'Завантаження історії…');
  else if (entry.error) body = h('p', { class: 'warn-line' }, 'Не вдалося завантажити історію.');
  else if (!entry.commits.length) body = h('p', { class: 'muted' }, 'Змін ще не було.');
  else {
    body = h('ul', { class: 'history', style: 'max-height:none' },
      entry.commits.map((c) => h('li', {}, `${formatDate(c.date)} · ${c.message.split('\n')[0]}`)));
  }
  return h('section', {},
    h('div', { class: 'toolbar' }, h('button', {
      onClick: () => {
        commitsCache.delete(path);
        ctx.app.notify();
      },
    }, 'Оновити')),
    body);
}
