import { applyOpsToText } from '../core/ops.js';

export function createMemoryPersist(initial = []) {
  let saved = [...initial];
  return {
    load: () => [...saved],
    save: (entries) => {
      saved = [...entries];
    },
  };
}

export function createLocalStoragePersist(storage, key = 'own-feed-queue') {
  return {
    load() {
      try {
        return JSON.parse(storage.getItem(key) ?? '[]');
      } catch {
        return [];
      }
    },
    save(entries) {
      storage.setItem(key, JSON.stringify(entries));
    },
  };
}

export function createSync({
  store, cache, persist, describe, debounceMs = 3000, maxAttempts = 3,
  onState = () => {}, onConflict = () => {}, onSaved = () => {},
}) {
  let queue = persist.load();
  let timer = null;
  let running = null;

  const setQueue = (next) => {
    queue = next;
    persist.save(queue);
  };

  async function flushPath(path, ops) {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const base = cache.get(path) ?? { text: null, sha: null };
      const { text, conflicts, deleted } = applyOpsToText(path, base.text, ops);
      const message = describe(path, ops, text);
      try {
        if (deleted) {
          if (base.sha) await store.deleteFile(path, base.sha, message);
          cache.delete(path);
        } else {
          const { sha } = await store.writeFile(path, text, base.sha, message);
          cache.set(path, { text, sha });
        }
        return { text: deleted ? null : text, conflicts };
      } catch (e) {
        if (e.status !== 409 && e.status !== 422) throw e;
        const fresh = await store.readFile(path);
        if (fresh) cache.set(path, fresh);
        else cache.delete(path);
      }
    }
    throw Object.assign(new Error('Не вдалося зберегти після кількох спроб'), { status: 'conflict-loop' });
  }

  async function run() {
    while (queue.length) {
      const { path } = queue[0];
      const entries = queue.filter((e) => e.path === path);
      onState('saving');
      let saved;
      try {
        saved = await flushPath(path, entries.map((e) => e.op));
      } catch (e) {
        if (e.status === 401 || e.status === 403) onState('auth');
        else if (e.status === undefined) onState('offline');
        else onState('error');
        return;
      }
      // Спершу зняти збережене з черги: onSaved накладає на файл лише ще не збережені операції.
      setQueue(queue.filter((e) => !entries.includes(e)));
      if (saved.conflicts.length) onConflict(path, saved.conflicts);
      onSaved(path, saved.text);
    }
    onState('saved');
  }

  function flush() {
    clearTimeout(timer);
    if (!running) running = run().finally(() => { running = null; });
    return running;
  }

  function enqueue(path, op) {
    setQueue([...queue, { path, op }]);
    onState('dirty');
    clearTimeout(timer);
    timer = setTimeout(flush, debounceMs);
    timer?.unref?.();
  }

  return {
    enqueue,
    flush,
    retry: flush,
    pending: () => queue.map((e) => e.op),
    pendingFor: (path) => queue.filter((e) => e.path === path).map((e) => e.op),
    pendingPaths: () => [...new Set(queue.map((e) => e.path))],
  };
}
