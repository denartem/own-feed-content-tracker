// Сила учасника: одне число або, якщо тип контенту задає strengthParams, об'єкт { параметр: число|null }.

export function strengthParams(ct) {
  return Array.isArray(ct?.strengthParams) ? ct.strengthParams : [];
}

export function formatStrength(value, params) {
  if (value == null) return '—';
  if (typeof value !== 'object') return String(value);
  const keys = params.length ? params : Object.keys(value);
  return keys.map((k) => `${k} ${value[k] ?? '—'}`).join(' · ');
}

export function sameStrength(x, y) {
  return JSON.stringify(x ?? null) === JSON.stringify(y ?? null);
}

export function withParam(value, params, key, to) {
  const base = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(params.map((p) => [p, p === key ? to : base[p] ?? null]));
}
