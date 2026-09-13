const API = 'https://api.github.com';

export function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function fromBase64(b64) {
  const binary = atob(String(b64).replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

export function createGithubStore({ owner, repo, token, fetchImpl = (...args) => fetch(...args) }) {
  const base = `${API}/repos/${owner}/${repo}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const encodePath = (path) => path.split('/').map(encodeURIComponent).join('/');

  async function call(method, url, body) {
    const res = await fetchImpl(url, {
      method,
      cache: 'no-store',
      headers: body ? { ...headers, 'Content-Type': 'application/json' } : headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 404 && method === 'GET') return null;
    if (!res.ok) throw Object.assign(new Error(`GitHub ${res.status}`), { status: res.status });
    return res.status === 204 ? null : res.json();
  }

  return {
    async readFile(path) {
      const json = await call('GET', `${base}/contents/${encodePath(path)}`);
      return json ? { text: fromBase64(json.content), sha: json.sha } : null;
    },
    async writeFile(path, text, sha, message) {
      const body = { message, content: toBase64(text), ...(sha ? { sha } : {}) };
      const json = await call('PUT', `${base}/contents/${encodePath(path)}`, body);
      return { sha: json.content.sha };
    },
    async deleteFile(path, sha, message) {
      await call('DELETE', `${base}/contents/${encodePath(path)}`, { message, sha });
    },
    async listCommits(path) {
      const json = await call('GET', `${base}/commits?path=${encodeURIComponent(path)}&per_page=50`);
      return (json ?? []).map((c) => ({ sha: c.sha, message: c.commit.message, date: c.commit.author.date }));
    },
    async checkAccess() {
      try {
        return Boolean(await call('GET', base));
      } catch {
        return false;
      }
    },
  };
}
