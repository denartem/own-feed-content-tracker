import { h } from './dom.js';
import { tournamentStats } from '../core/stats.js';
import { tournamentHref } from './router.js';
import { renderPassportBlock } from './passport.js';

export function renderContentTypePage(ctx, route) {
  const { app, actions } = ctx;
  const ct = app.contentType(route.id);
  if (!ct) return h('p', { class: 'muted' }, 'Тип контенту не знайдено.');
  const { structure, docs } = app.state;
  const pathOf = (t) => {
    const category = structure.categories.find((c) => c.id === t.categoryId);
    const sport = structure.sports.find((s) => s.id === category?.sportId);
    return `${sport?.name ?? ''} › ${category?.name ?? ''} › ${t.name}`;
  };
  const tournaments = structure.tournaments.filter((t) => t.contentTypeId === ct.id);
  return h('section', {},
    h('h2', {}, ct.name),
    h('div', { class: 'form-grid' },
      h('label', { for: `ct-name-${ct.id}` }, 'Назва'),
      h('input', {
        id: `ct-name-${ct.id}`, value: ct.name,
        onChange: (e) => {
          const name = e.target.value.trim();
          if (name) actions.updateContentType(ct.id, { name });
        },
      }),
      h('label', { for: `ct-videos-${ct.id}` }, 'Відео на одиницю'),
      h('input', {
        id: `ct-videos-${ct.id}`, class: 'narrow', type: 'number', min: 0, step: 1, value: ct.videosTarget ?? '', placeholder: 'не задано',
        onChange: (e) => actions.updateContentType(ct.id, {
          videosTarget: e.target.value === '' ? null : Math.max(0, Math.round(Number(e.target.value))),
        }),
      }),
      h('label', { for: `ct-strength-${ct.id}` }, 'Сила учасників'),
      h('label', { class: 'check' },
        h('input', { id: `ct-strength-${ct.id}`, type: 'checkbox', checked: ct.strength, onChange: (e) => actions.updateContentType(ct.id, { strength: e.target.checked }) }),
        ' вести силу в турнірах цього типу')),
    h('h3', {}, 'Турніри цього типу'),
    tournaments.length
      ? h('ul', {}, tournaments.map((t) => {
        const st = docs[t.id] ? tournamentStats(docs[t.id], ct.videosTarget) : null;
        return h('li', {}, h('a', { href: tournamentHref(t.id) }, pathOf(t)), st ? ` — done ${st.done} з ${st.plan}` : '');
      }))
      : h('p', { class: 'muted' }, 'Жоден турнір ще не використовує цей тип.'),
    h('h3', {}, 'Паспорт'),
    renderPassportBlock(ctx, ct.id));
}
