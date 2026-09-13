import { h, formatDate } from './dom.js';
import { STATUSES, PRIORITIES } from '../core/constants.js';
import { unitFlags } from '../core/validate.js';
import { unitLabel } from '../core/pairs.js';
import { findInPool } from '../core/names.js';
import { openDialog } from './dialog.js';

export function openUnitCard(ctx, tId, unitId) {
  const { app, actions } = ctx;
  const t = app.tournament(tId);
  let lastKey = null;
  const dialog = openDialog(app, (dlg) => {
    const doc = app.state.docs[tId];
    const u = doc?.units.find((x) => x.id === unitId);
    if (!u) {
      if (dlg.open) dlg.close();
      return;
    }
    const key = JSON.stringify(u);
    if (key === lastKey) return;
    lastKey = key;
    const ct = app.contentType(t.contentTypeId);
    const target = ct?.videosTarget ?? null;
    const flags = unitFlags(u, target);
    const strength = (name) => findInPool(doc.pool, name)?.strength ?? '—';
    dlg.replaceChildren(h('form', { class: 'card-form', onSubmit: (e) => e.preventDefault() },
      h('div', { class: 'card-head' },
        h('strong', {}, unitLabel(u)), h('span', { class: 'muted' }, t.name),
        h('button', { type: 'button', class: 'icon', 'aria-label': 'Закрити', onClick: () => dialog.close() }, '✕')),
      ct?.strength ? h('div', { class: 'muted' }, [u.a, u.b].filter((n) => n != null).map((n) => `${n}: сила ${strength(n)}`).join(' · ')) : null,
      flags.notAlphabetical ? h('div', { class: 'warn-line' }, 'Назва пари не за алфавітом. Коли виправите її у виробництві, ',
        h('button', { type: 'button', onClick: () => actions.swap(tId, unitId) }, 'поміняйте місцями')) : null,
      h('label', {}, 'Статус'),
      h('div', { class: 'seg' }, STATUSES.map((s) => h('button', {
        type: 'button', class: s === u.status ? 'active' : null, onClick: () => actions.setStatus(tId, unitId, s),
      }, s))),
      h('label', { for: 'card-priority' }, 'Пріоритет'),
      h('select', { id: 'card-priority', onChange: (e) => actions.setField(tId, unitId, 'priority', e.target.value || null) },
        h('option', { value: '' }, '—'),
        PRIORITIES.map((p) => h('option', { value: p, selected: u.priority === p }, p))),
      h('label', { for: 'card-videos' }, target != null ? `Відео (норма ${target})` : 'Відео'),
      h('input', {
        id: 'card-videos', type: 'number', min: 0, step: 1, value: u.videos ?? '', class: flags.belowTarget ? 'warn' : null,
        onChange: (e) => actions.setField(tId, unitId, 'videos', e.target.value === '' ? null : Math.max(0, Math.round(Number(e.target.value)))),
      }),
      h('label', { for: 'card-note' }, u.status === 'invalid data' ? 'Причина' : 'Нотатка'),
      h('textarea', { id: 'card-note', rows: 3, onChange: (e) => actions.setField(tId, unitId, 'note', e.target.value) }, u.note),
      h('label', {}, 'Історія'),
      h('ul', { class: 'history' }, [...(u.history ?? [])].reverse().map((e) =>
        h('li', {}, `${formatDate(e.at)} · ${e.event ?? `${e.from} → ${e.to}`}`))),
      h('div', { class: 'card-actions' }, h('button', {
        type: 'button', class: 'danger',
        onClick: () => {
          if (confirm(`Видалити ${unitLabel(u)}?`)) {
            actions.deleteUnit(tId, unitId);
            dialog.close();
          }
        },
      }, 'Видалити'))));
  });
}
