import { h } from './dom.js';
import { STATUSES } from '../core/constants.js';
import { parseList, planPaste } from '../core/parse-list.js';
import { compareNames } from '../core/names.js';
import { openDialog } from './dialog.js';

export function openPasteDialog(ctx, tId) {
  const { app, actions } = ctx;
  const t = app.tournament(tId);
  const draft = { text: '', status: 'done', addMissing: false };
  let dialog = null;
  const rerender = () => dialog.rerender();
  dialog = openDialog(null, (dlg) => {
    const doc = app.state.docs[tId];
    const parsed = parseList(draft.text, doc.pool.map((m) => m.name), t.unitType);
    const plan = planPaste(doc, parsed, { status: draft.status, addMissing: draft.addMissing });
    const changes = plan.updates.length + plan.additions.length;
    dlg.replaceChildren(h('form', { class: 'card-form', onSubmit: (e) => e.preventDefault() },
      h('div', { class: 'card-head' },
        h('strong', {}, `Вставити список · ${t.name}`),
        h('button', { type: 'button', class: 'icon', 'aria-label': 'Закрити', onClick: () => dialog.close() }, '✕')),
      h('p', { class: 'muted' }, 'По одній парі в рядку, у будь-якому написанні: NORTH_SOUTH, North City - South Town, 1. A – B.'),
      h('textarea', { id: 'paste-text', rows: 10, onInput: (e) => { draft.text = e.target.value; rerender(); } }, draft.text),
      h('label', { for: 'paste-status' }, 'Статус'),
      h('select', { id: 'paste-status', onChange: (e) => { draft.status = e.target.value; rerender(); } },
        STATUSES.map((s) => h('option', { value: s, selected: s === draft.status }, s))),
      h('label', { class: 'check' },
        h('input', { id: 'paste-add', type: 'checkbox', checked: draft.addMissing, onChange: (e) => { draft.addMissing = e.target.checked; rerender(); } }),
        ' Додати відсутні пари з цим статусом'),
      h('div', { class: 'preview' },
        h('div', {}, `Змінять статус: ${plan.updates.length}`),
        h('div', {}, `Уже мають цей статус: ${plan.unchanged}`),
        draft.addMissing ? h('div', {}, `Буде додано: ${plan.additions.length}`) : h('div', {}, `Не знайдено в турнірі: ${plan.skipped.length}`),
        plan.newPoolMembers.length ? h('div', { class: 'warn-line' }, `Нові учасники пулу: ${[...plan.newPoolMembers].sort(compareNames).join(', ')}`) : null,
        plan.unrecognized.length ? h('div', { class: 'warn-line' }, `Не розпізнано: ${plan.unrecognized.join(' · ')}`) : null,
        !draft.addMissing && plan.skipped.length
          ? h('details', {}, h('summary', {}, 'Які саме не знайдено'), h('ul', {}, plan.skipped.map((r) => h('li', {}, r))))
          : null),
      h('div', { class: 'card-actions' }, h('button', {
        type: 'button', class: 'primary', disabled: changes === 0,
        onClick: () => {
          actions.applyPaste(tId, plan, draft.status);
          dialog.close();
        },
      }, changes ? `Застосувати (${changes})` : 'Застосувати'))));
  });
}

export function openAddUnitDialog(ctx, tId) {
  const { app, actions } = ctx;
  const t = app.tournament(tId);
  const isPair = t.unitType === 'pair';
  const draft = { a: '', b: '', error: '' };
  let dialog = null;
  const rerender = () => dialog.rerender();
  dialog = openDialog(null, (dlg) => {
    const names = app.state.docs[tId].pool.map((m) => m.name).sort(compareNames);
    const select = (id, key, label) => [
      h('label', { for: id }, label),
      h('select', { id, onChange: (e) => { draft[key] = e.target.value; draft.error = ''; rerender(); } },
        h('option', { value: '' }, '—'),
        names.map((n) => h('option', { value: n, selected: draft[key] === n }, n))),
    ];
    dlg.replaceChildren(h('form', {
      class: 'card-form',
      onSubmit: (e) => {
        e.preventDefault();
        if (!draft.a || (isPair && !draft.b)) {
          draft.error = 'Оберіть учасників';
          rerender();
          return;
        }
        const error = actions.addUnit(tId, draft.a, isPair ? draft.b : null);
        if (error) {
          draft.error = error;
          rerender();
          return;
        }
        dialog.close();
      },
    },
    h('div', { class: 'card-head' },
      h('strong', {}, `${isPair ? 'Нова пара' : 'Нова одиниця'} · ${t.name}`),
      h('button', { type: 'button', class: 'icon', 'aria-label': 'Закрити', onClick: () => dialog.close() }, '✕')),
    names.length ? null : h('p', { class: 'warn-line' }, 'Пул порожній. Спершу додайте учасників у вкладці «Пул учасників».'),
    select('add-a', 'a', isPair ? 'Учасник A' : 'Учасник'),
    isPair ? select('add-b', 'b', 'Учасник B') : null,
    draft.error ? h('p', { class: 'warn-line' }, draft.error) : null,
    h('div', { class: 'card-actions' }, h('button', { type: 'submit', class: 'primary' }, 'Додати'))));
  });
}
