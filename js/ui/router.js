export function parseRoute(hash) {
  const [path, query = ''] = String(hash ?? '').replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const params = Object.fromEntries(new URLSearchParams(query));
  if (parts[0] === 't' && parts[1]) return { name: 'tournament', id: parts[1], params };
  if (parts[0] === 'ct' && parts[1]) return { name: 'contentType', id: parts[1], params };
  if (parts[0] === 'settings') return { name: 'settings', params };
  if (parts[0] === 'new') return { name: 'new', params };
  if (parts[0] === 'search') return { name: 'search', params };
  return { name: 'overview', params };
}

export function tournamentHref(id, params = {}) {
  const query = new URLSearchParams(params).toString();
  return `#/t/${encodeURIComponent(id)}${query ? `?${query}` : ''}`;
}

export function contentTypeHref(id) {
  return `#/ct/${encodeURIComponent(id)}`;
}
