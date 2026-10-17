// GitHub REST client tuned for a serverless card renderer:
//  - every request has a hard timeout (and respects an overall deadline), so a
//    slow API never turns into a function timeout / broken image;
//  - transient failures (network, timeouts, 5xx) are retried once;
//  - responses are cached in memory for warm instances, revalidated with ETags
//    (304s do not count against the rate limit) and served stale when GitHub
//    errors or rate-limits us;
//  - concurrent identical requests share a single fetch.

const API = 'https://api.github.com';

const DEFAULTS = {
  ttl: 5 * 60 * 1000,
  staleTtl: 6 * 60 * 60 * 1000,
  timeout: 4500,
  retries: 1,
  maxBytes: 10 * 1024 * 1024,
};
const MAX_ENTRIES = 250;

const cache = new Map();
const inflight = new Map();

class GitHubError extends Error {
  constructor(message, { status = 0, kind = 'unknown', url = '' } = {}) {
    super(message);
    this.name = 'GitHubError';
    this.status = status;
    this.kind = kind;
    this.url = url;
  }
}

function shortPath(url) {
  return String(url).replace(API, '').split('?')[0].replace(/^\//, '') || String(url);
}

function remember(key, entry) {
  cache.delete(key);
  cache.set(key, entry);
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value);
}

function classify(status, headers, body) {
  if (status === 404) return 'not_found';
  if (status === 401) return 'auth';
  if (status === 429) return 'rate_limit';
  if (status === 403) {
    if (headers.get('x-ratelimit-remaining') === '0' || headers.get('retry-after') || /rate limit/i.test(body || '')) return 'rate_limit';
    return 'forbidden';
  }
  if (status === 422) return 'invalid';
  if (status >= 500) return 'server';
  return 'http';
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function request(url, { headers, timeout, binary, maxBytes }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { headers, signal: ctrl.signal, redirect: 'follow' });
    const len = Number(r.headers.get('content-length'));
    if (r.ok && Number.isFinite(len) && len > maxBytes) {
      ctrl.abort();
      throw new GitHubError(`response too large (${shortPath(url)})`, { status: r.status, kind: 'too_large', url });
    }
    let body = null;
    if (r.status !== 304) body = binary ? Buffer.from(await r.arrayBuffer()) : await r.text();
    if (body && body.length > maxBytes) {
      ctrl.abort();
      throw new GitHubError(`response too large (${shortPath(url)})`, { status: r.status, kind: 'too_large', url });
    }
    return { status: r.status, ok: r.ok, headers: r.headers, body };
  } catch (err) {
    if (err instanceof GitHubError) throw err;
    if (ctrl.signal.aborted) throw new GitHubError(`GitHub timed out (${shortPath(url)})`, { kind: 'timeout', url });
    throw new GitHubError(`network error (${shortPath(url)})`, { kind: 'network', url });
  } finally {
    clearTimeout(timer);
  }
}

async function load(url, token, o, key, hit) {
  const headers = { 'User-Agent': 'gh-card/4', Accept: o.binary ? 'image/*' : 'application/vnd.github+json' };
  // the token is only ever sent to api.github.com
  if (token && url.startsWith(`${API}/`)) headers.Authorization = `Bearer ${token}`;
  if (hit && hit.etag) headers['If-None-Match'] = hit.etag;

  let lastErr = null;
  for (let attempt = 0; attempt <= o.retries; attempt += 1) {
    if (attempt > 0) await sleep(150 * attempt);
    const left = o.deadline ? o.deadline - Date.now() : Infinity;
    const timeout = Math.min(o.timeout, left);
    if (timeout < 300) {
      lastErr = lastErr || new GitHubError(`out of time (${shortPath(url)})`, { kind: 'timeout', url });
      break;
    }
    try {
      const r = await request(url, { headers, timeout, binary: o.binary, maxBytes: o.maxBytes });
      if (r.status === 304 && hit) {
        remember(key, { ...hit, freshUntil: Date.now() + o.ttl, staleUntil: Date.now() + o.staleTtl });
        return hit.data;
      }
      if (r.ok) {
        let data;
        if (o.binary) data = { contentType: r.headers.get('content-type') || '', buffer: r.body };
        else {
          try { data = JSON.parse(r.body); } catch (_) {
            throw new GitHubError(`invalid JSON from GitHub (${shortPath(url)})`, { status: r.status, kind: 'bad_response', url });
          }
        }
        if (o.transform) data = o.transform(data);
        remember(key, { data, etag: r.headers.get('etag'), freshUntil: Date.now() + o.ttl, staleUntil: Date.now() + o.staleTtl });
        return data;
      }
      const kind = classify(r.status, r.headers, r.body);
      lastErr = new GitHubError(`GitHub ${r.status} (${shortPath(url)})`, { status: r.status, kind, url });
      if (kind !== 'server') break;
    } catch (err) {
      lastErr = err instanceof GitHubError ? err : new GitHubError(String(err && err.message || err), { kind: 'unknown', url });
      if (lastErr.kind === 'too_large') break;
    }
  }

  // stale-if-error: an old answer beats an error card
  if (hit && hit.staleUntil > Date.now() && lastErr.kind !== 'not_found') return hit.data;
  throw lastErr;
}

/**
 * Fetch a GitHub API URL (or a binary resource with `binary: true`).
 * Options: ttl, staleTtl, timeout, retries, deadline (epoch ms), transform, binary, maxBytes.
 */
function gh(url, token, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const key = `${o.binary ? 'bin:' : ''}${url}`;
  const hit = cache.get(key);
  if (hit && hit.freshUntil > Date.now()) return Promise.resolve(hit.data);
  if (inflight.has(key)) return inflight.get(key);
  const p = load(url, token, o, key, hit).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

function clearCache() {
  cache.clear();
  inflight.clear();
}

module.exports = { gh, GitHubError, clearCache, API };
