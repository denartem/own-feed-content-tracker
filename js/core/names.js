export function cleanName(raw) {
  return String(raw ?? '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

export function foldName(raw) {
  return cleanName(raw).normalize('NFKD').replace(/\p{M}/gu, '').toUpperCase();
}

export function sameName(a, b) {
  return foldName(a) === foldName(b);
}

export function compareNames(a, b) {
  const x = foldName(a);
  const y = foldName(b);
  if (x < y) return -1;
  return x > y ? 1 : 0;
}

export function isAlphabetical(a, b) {
  return b == null || compareNames(a, b) <= 0;
}

export function findInPool(pool, raw) {
  const key = foldName(raw);
  return pool.find((m) => foldName(m.name) === key) ?? null;
}
