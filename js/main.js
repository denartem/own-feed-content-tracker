import { createGithubStore } from './storage/github-store.js';
import { createLocalStore } from './storage/local-store.js';
import { createSync, createLocalStoragePersist, createMemoryPersist } from './storage/sync.js';
import { commitMessage } from './core/commit-message.js';
import { createAppState, tournamentPath, passportPath } from './ui/state.js';
import { createActions } from './ui/actions.js';
import { parseRoute } from './ui/router.js';
import { h, preserveFocus } from './ui/dom.js';
import { renderLayout } from './ui/layout.js';
import { renderOverview } from './ui/overview.js';
import { renderSearch } from './ui/search.js';
import { renderSettings, renderTokenForm, TOKEN_KEY, REPO_KEY, DEFAULT_REPO } from './ui/settings.js';

const PAGES = {
  overview: renderOverview,
  search: renderSearch,
  settings: renderSettings,
};

const root = document.getElementById('app');
const loadingPassports = new Set();

function titleFor(app, path) {
  if (path === 'structure.json') return 'Структура';
  const t = path.match(/^tournaments\/(.+)\.json$/);
  if (t) return app.tournament(t[1])?.name ?? t[1];
  const p = path.match(/^content-types\/(.+)\.md$/);
  if (p) return `Паспорт ${app.contentType(p[1])?.name ?? p[1]}`;
  return path;
}

function describe(app, path, ops, text) {
  const title = titleFor(app, path);
  if (ops.some((o) => o.type === 'deleteFile')) return `${title}: видалено`;
  if (path.startsWith('content-types/')) return `${title}: оновлено`;
  if (path.startsWith('tournaments/') && text) return commitMessage(title, ops, JSON.parse(text));
  return commitMessage(title, ops, { units: [] });
}

async function ensurePassport(app, store, cache, id) {
  if (id in app.state.passports || loadingPassports.has(id)) return;
  loadingPassports.add(id);
  try {
    const file = await store.readFile(passportPath(id));
    if (file) cache.set(passportPath(id), file);
    app.state.passports[id] = file ? file.text : null;
  } catch {
    app.setNotice('Не вдалося завантажити паспорт.');
  } finally {
    loadingPassports.delete(id);
    app.notify();
  }
}

function renderStart(reason) {
  root.replaceChildren(h('main', { class: 'main' },
    h('h2', {}, 'Підключення до даних'),
    h('p', {}, 'Вставте токен GitHub із доступом до приватного репозиторію даних. Покрокова інструкція є в README репозиторію own-feed-data.'),
    renderTokenForm({ reason }),
    h('p', { class: 'muted' }, h('a', { href: '?local=1' }, 'Відкрити з тестовими даними'))));
}

function reasonFor(error) {
  if (error.status === 401 || error.status === 403) return 'Токен не має доступу до репозиторію даних. Створіть новий токен і збережіть його тут.';
  if (error.status === 404) return 'У репозиторії немає structure.json або назву репозиторію вказано неправильно.';
  if (error instanceof TypeError) return 'Немає зв’язку з GitHub. Перевірте інтернет і оновіть сторінку.';
  return `Не вдалося завантажити дані: ${error.message}`;
}

async function boot() {
  const local = new URLSearchParams(location.search).has('local');
  const token = localStorage.getItem(TOKEN_KEY);
  if (!local && !token) {
    renderStart(null);
    return;
  }
  const [owner, repo] = (localStorage.getItem(REPO_KEY) || DEFAULT_REPO).split('/');
  const app = createAppState();
  app.state.mode = local ? 'local' : 'github';
  const cache = new Map();
  let store;
  try {
    store = local ? await createLocalStore() : createGithubStore({ owner, repo, token });
    const structureFile = await store.readFile('structure.json');
    if (!structureFile) throw Object.assign(new Error('немає structure.json'), { status: 404 });
    cache.set('structure.json', structureFile);
    const structure = JSON.parse(structureFile.text);
    const docs = {};
    await Promise.all(structure.tournaments.map(async (t) => {
      const file = await store.readFile(tournamentPath(t.id));
      if (file) {
        cache.set(tournamentPath(t.id), file);
        docs[t.id] = JSON.parse(file.text);
      }
    }));
    app.load({ structure, docs, passports: {} });
  } catch (error) {
    renderStart(reasonFor(error));
    return;
  }

  const persist = local ? createMemoryPersist() : createLocalStoragePersist(localStorage);
  const sync = createSync({
    store, cache, persist,
    describe: (path, ops, text) => describe(app, path, ops, text),
    onState: (s) => {
      app.setSyncState(s);
      if (s === 'auth') app.setNotice('Токен більше не має доступу до репозиторію даних. Оновіть його в «Налаштуваннях».');
    },
    onConflict: (path) => app.setNotice(`Під час збереження «${titleFor(app, path)}» ваші зміни перезаписали свіжіші дані з GitHub. Перевірте цей турнір.`),
    onSaved: (path, text) => app.applySaved(path, text, sync.pendingFor(path)),
  });
  app.attachSync(sync);
  for (const path of sync.pendingPaths()) app.applySaved(path, cache.get(path)?.text ?? null, sync.pendingFor(path));
  if (sync.pending().length) {
    app.setSyncState('dirty');
    sync.flush();
  }

  const ctx = {
    app, store, sync, actions: createActions(app),
    ensurePassport: (id) => ensurePassport(app, store, cache, id),
    loadCommits: (path) => store.listCommits(path),
  };
  const render = () => preserveFocus(() => {
    const route = parseRoute(location.hash);
    const page = PAGES[route.name] ?? PAGES.overview;
    renderLayout(root, { app, route, main: page(ctx, route) });
  });
  app.subscribe(render);
  window.addEventListener('hashchange', () => {
    document.body.classList.remove('nav-open');
    render();
  });
  window.addEventListener('online', () => sync.retry());
  window.addEventListener('beforeunload', (e) => {
    if (sync.pending().length) e.preventDefault();
  });
  render();
}

boot();
