const test = require('node:test');
const assert = require('node:assert/strict');
const { gh, clearCache, GitHubError } = require('../lib/github');
const { json } = require('./fixtures');

const URL_A = 'https://api.github.com/users/a';
const realFetch = global.fetch;

function useFetch(impl) {
  const calls = [];
  global.fetch = async (url, init = {}) => { calls.push({ url, init }); return impl(url, init, calls.length); };
  return calls;
}

test.beforeEach(() => clearCache());
test.after(() => { global.fetch = realFetch; });

test('serves repeated requests from the in-memory cache', async () => {
  const calls = useFetch(() => json({ login: 'a' }));
  assert.deepEqual(await gh(URL_A, ''), { login: 'a' });
  assert.deepEqual(await gh(URL_A, ''), { login: 'a' });
  assert.equal(calls.length, 1);
});

test('shares one request between concurrent callers', async () => {
  const calls = useFetch(async () => { await new Promise(r => setTimeout(r, 20)); return json({ ok: 1 }); });
  const [x, y] = await Promise.all([gh(URL_A, ''), gh(URL_A, '')]);
  assert.deepEqual(x, y);
  assert.equal(calls.length, 1);
});

test('revalidates with ETag and reuses data on 304', async () => {
  const calls = useFetch((url, init, n) => (n === 1 ? json({ v: 1 }, 200, { etag: '"e1"' }) : new Response(null, { status: 304 })));
  await gh(URL_A, '', { ttl: 0 });
  assert.deepEqual(await gh(URL_A, '', { ttl: 0 }), { v: 1 });
  assert.equal(calls[1].init.headers['If-None-Match'], '"e1"');
});

test('falls back to stale data when GitHub errors', async () => {
  useFetch((url, init, n) => (n === 1 ? json({ v: 1 }) : json({ message: 'API rate limit exceeded' }, 403, { 'x-ratelimit-remaining': '0' })));
  await gh(URL_A, '', { ttl: 0 });
  assert.deepEqual(await gh(URL_A, '', { ttl: 0 }), { v: 1 });
});

test('classifies errors', async () => {
  const cases = [
    [() => json({}, 404), 'not_found'],
    [() => json({ message: 'API rate limit exceeded for 1.2.3.4' }, 403), 'rate_limit'],
    [() => json({}, 429), 'rate_limit'],
    [() => json({}, 403), 'forbidden'],
    [() => json({}, 401), 'auth'],
    [() => json({}, 502), 'server'],
    [() => new Response('<html>not json', { status: 200 }), 'bad_response'],
    [() => { throw new TypeError('fetch failed'); }, 'network'],
  ];
  for (const [impl, kind] of cases) {
    clearCache();
    useFetch(impl);
    await assert.rejects(gh(URL_A, '', { retries: 0 }), err => err instanceof GitHubError && err.kind === kind, kind);
  }
});

test('retries transient failures once', async () => {
  const calls = useFetch((url, init, n) => (n === 1 ? json({}, 503) : json({ ok: true })));
  assert.deepEqual(await gh(URL_A, ''), { ok: true });
  assert.equal(calls.length, 2);
});

test('does not retry client errors', async () => {
  const calls = useFetch(() => json({}, 404));
  await assert.rejects(gh(URL_A, ''));
  assert.equal(calls.length, 1);
});

test('aborts slow requests', async () => {
  useFetch((url, init) => new Promise((_, reject) => {
    init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  }));
  const t = Date.now();
  await assert.rejects(gh(URL_A, '', { timeout: 400, retries: 0 }), err => err.kind === 'timeout');
  assert.ok(Date.now() - t < 2000);
});

test('respects the overall deadline across retries', async () => {
  useFetch((url, init) => new Promise((_, reject) => {
    init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  }));
  const t = Date.now();
  await assert.rejects(gh(URL_A, '', { deadline: Date.now() + 700, retries: 3 }), err => err.kind === 'timeout');
  assert.ok(Date.now() - t < 1500, `took ${Date.now() - t}ms`);
});

test('sends the token to api.github.com only', async () => {
  const calls = useFetch(url => (String(url).includes('avatars')
    ? new Response(Buffer.from('x'), { headers: { 'content-type': 'image/png' } })
    : json({})));
  await gh(URL_A, 'secret');
  await gh('https://avatars.githubusercontent.com/u/1?s=120', 'secret', { binary: true });
  assert.equal(calls[0].init.headers.Authorization, 'Bearer secret');
  assert.equal(calls[1].init.headers.Authorization, undefined);
});

test('rejects oversized responses', async () => {
  useFetch(() => new Response(Buffer.alloc(2048), { headers: { 'content-type': 'image/png' } }));
  await assert.rejects(gh('https://avatars.githubusercontent.com/u/1', '', { binary: true, maxBytes: 1024 }), err => err.kind === 'too_large');
});
