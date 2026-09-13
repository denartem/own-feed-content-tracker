export function createMemoryStore(initialFiles = {}) {
  const files = new Map();
  const log = [];
  let seq = 0;
  const nextSha = () => {
    seq += 1;
    return `sha-${seq}`;
  };
  const fail = (status) => Object.assign(new Error(`Store ${status}`), { status });
  for (const [path, text] of Object.entries(initialFiles)) files.set(path, { text, sha: nextSha() });

  return {
    async readFile(path) {
      const f = files.get(path);
      return f ? { text: f.text, sha: f.sha } : null;
    },
    async writeFile(path, text, sha, message) {
      const current = files.get(path);
      if ((current?.sha ?? null) !== (sha ?? null)) throw fail(current ? 409 : 422);
      const next = { text, sha: nextSha() };
      files.set(path, next);
      log.unshift({ path, sha: next.sha, message, date: new Date().toISOString() });
      return { sha: next.sha };
    },
    async deleteFile(path, sha, message) {
      const current = files.get(path);
      if (!current || current.sha !== sha) throw fail(409);
      files.delete(path);
      log.unshift({ path, sha: nextSha(), message, date: new Date().toISOString() });
    },
    async listCommits(path) {
      return log.filter((c) => c.path === path).map(({ sha, message, date }) => ({ sha, message, date }));
    },
    async checkAccess() {
      return true;
    },
    paths() {
      return [...files.keys()];
    },
  };
}
