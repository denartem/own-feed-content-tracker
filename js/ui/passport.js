import { h } from './dom.js';
import { PASSPORT_TEMPLATE } from '../core/constants.js';

const drafts = new Map();

export function renderMarkdown(text) {
  const box = h('div', { class: 'markdown' });
  const source = text ?? '';
  if (window.marked && window.DOMPurify) box.innerHTML = window.DOMPurify.sanitize(window.marked.parse(source));
  else box.append(h('pre', {}, source));
  return box;
}

export function renderPassportBlock(ctx, ctId) {
  const { app, actions } = ctx;
  if (!(ctId in app.state.passports)) {
    ctx.ensurePassport(ctId);
    return h('p', { class: 'muted' }, 'Завантаження паспорта…');
  }
  const text = app.state.passports[ctId] ?? '';
  if (!drafts.has(ctId)) {
    return h('div', {},
      h('div', { class: 'toolbar' }, h('button', {
        onClick: () => {
          drafts.set(ctId, text || PASSPORT_TEMPLATE);
          app.notify();
        },
      }, 'Редагувати паспорт')),
      text.trim() ? renderMarkdown(text) : h('p', { class: 'muted' }, 'Паспорт порожній.'));
  }
  const users = app.state.structure.tournaments.filter((t) => t.contentTypeId === ctId);
  const draft = drafts.get(ctId);
  return h('div', {},
    users.length > 1 ? h('p', { class: 'warn-line' }, `Паспорт спільний для турнірів: ${users.map((t) => t.name).join(', ')}. Зміни стосуються всіх.`) : null,
    h('div', { class: 'editor' },
      h('textarea', {
        id: `passport-${ctId}`, 'aria-label': 'Текст паспорта',
        onInput: (e) => {
          drafts.set(ctId, e.target.value);
          app.notify();
        },
      }, draft),
      renderMarkdown(draft)),
    h('div', { class: 'toolbar', style: 'margin-top:8px' },
      h('button', {
        class: 'primary',
        onClick: () => {
          const value = drafts.get(ctId);
          drafts.delete(ctId);
          actions.savePassport(ctId, value);
          app.notify();
        },
      }, 'Зберегти'),
      h('button', {
        onClick: () => {
          drafts.delete(ctId);
          app.notify();
        },
      }, 'Скасувати')));
}

export function renderPassportTab(ctx, t, doc) {
  return h('section', {},
    h('h3', {}, 'Паспорт типу контенту'),
    renderPassportBlock(ctx, t.contentTypeId),
    h('h3', {}, 'Нотатки турніру'),
    h('textarea', {
      id: `notes-${t.id}`, rows: 5, style: 'width:100%', 'aria-label': 'Нотатки турніру',
      onChange: (e) => ctx.actions.setNotes(t.id, e.target.value),
    }, doc.notes));
}
