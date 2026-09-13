export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'value') el.value = value;
    else if (key === 'checked' || key === 'selected' || key === 'disabled') el[key] = true;
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

const isTextInput = (el) => el.tagName === 'TEXTAREA'
  || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit'].includes(el.type));

// Після перемальовування повертає фокус, курсор і ще не збережений текст у поле з тим самим id,
// щоб автозбереження не стирало набране.
export function preserveFocus(fn) {
  const active = document.activeElement;
  const id = active?.id;
  const editable = Boolean(id) && isTextInput(active);
  const value = editable ? active.value : null;
  let selection = null;
  try {
    if (editable && typeof active.selectionStart === 'number') selection = [active.selectionStart, active.selectionEnd];
  } catch {
    selection = null;
  }
  fn();
  if (!id) return;
  const next = document.getElementById(id);
  if (!next || next === active) return;
  if (editable && next.value !== value) next.value = value;
  next.focus();
  if (selection) {
    try {
      next.setSelectionRange(...selection);
    } catch {
      // поля без курсора (number)
    }
  }
}

export function statusClass(status) {
  return `st-${String(status).replace(/\s+/g, '-')}`;
}

export function formatDate(iso) {
  const [y, m, d] = String(iso ?? '').slice(0, 10).split('-');
  return y && m && d ? `${d}.${m}.${y}` : '';
}

export function downloadText(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
