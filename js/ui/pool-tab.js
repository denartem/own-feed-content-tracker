import { h } from './dom.js';
import { compareNames, sameName } from '../core/names.js';

export function renderPoolTab(ctx, t, doc, ct) {
  const { actions } = ctx;
  const strengthOn = ct?.strength === true;
  const used = (name) => doc.units.some((u) => sameName(u.a, name) || (u.b != null && sameName(u.b, name)));
  const report = (error) => {
    if (error) alert(error);
  };
  return h('section', {},
    h('p', { class: 'muted' }, `Учасників: ${doc.pool.length}`),
    h('div', { class: 'table-wrap' }, h('table', { class: 'grid' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Учасник'), strengthOn ? h('th', {}, 'Сила') : null, h('th', {}, ''))),
      h('tbody', {}, [...doc.pool].sort((x, y) => compareNames(x.name, y.name)).map((m) => h('tr', {},
        h('td', {}, m.name),
        strengthOn ? h('td', {}, h('input', {
          class: 'narrow', type: 'number', step: '0.01', value: m.strength ?? '', 'aria-label': `Сила ${m.name}`,
          onChange: (e) => actions.setStrength(t.id, m.name, e.target.value === '' ? null : Number(e.target.value)),
        })) : null,
        h('td', {},
          h('button', {
            onClick: () => {
              const to = prompt('Нова назва', m.name);
              if (to != null && to.trim() && to.trim() !== m.name) report(actions.renamePool(t.id, m.name, to));
            },
          }, 'Перейменувати'),
          ' ',
          h('button', {
            disabled: used(m.name), title: used(m.name) ? 'Учасник є в парах' : null,
            onClick: () => report(actions.removePool(t.id, m.name)),
          }, 'Видалити'))))))),
    h('form', {
      class: 'inline-form',
      onSubmit: (e) => {
        e.preventDefault();
        const input = e.target.elements.member;
        const value = input.value;
        input.value = '';
        report(actions.addPoolMember(t.id, value));
      },
    },
    h('input', { id: `pool-new-${t.id}`, name: 'member', placeholder: 'Новий учасник', required: true }),
    h('button', { type: 'submit' }, 'Додати')));
}
