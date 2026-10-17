const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/card');
const SLIDES = require('../slides');
const { THEMES } = require('../lib/constants');
const { clearCache } = require('../lib/github');
const fx = require('./fixtures');
const { assertWellFormedSvg } = require('./xml');

const realFetch = global.fetch;
let fetchMock;

async function call(query, overrides) {
  clearCache();
  fetchMock = fx.makeFetch(overrides);
  global.fetch = fetchMock;
  const res = fx.mockRes();
  await handler({ query }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'], /^image\/svg\+xml/);
  assertWellFormedSvg(res.body);
  return res;
}

const paths = () => fetchMock.calls.map(c => new URL(c.url).pathname);
const rateLimited = () => fx.json({ message: 'API rate limit exceeded' }, 403, { 'x-ratelimit-remaining': '0' });

test.after(() => { global.fetch = realFetch; delete process.env.GITHUB_TOKEN; });

test('missing user returns an error card without calling GitHub', async () => {
  const res = await call({});
  assert.match(res.body, /Missing \?user= query param/);
  assert.equal(fetchMock.calls.length, 0);
});

test('rejects usernames that are not GitHub logins', async () => {
  for (const user of ['../../orgs/x', 'a/b', 'a?b', '-lead', 'x'.repeat(40), 'a b', 'ünïcode']) {
    const res = await call({ user });
    assert.match(res.body, /Invalid GitHub username/, user);
    assert.equal(fetchMock.calls.length, 0, user);
  }
});

test('accepts @-prefixed names, array params and bot accounts', async () => {
  let res = await call({ user: '@octocat', slides: 'repos' });
  assert.ok(handler.USER_RE.test('octo_cat-1'));
  assert.match(res.body, />8</);
  res = await call({ user: ['octocat', 'other'], slides: ['followers'] });
  assert.match(res.body, /21.5k/);
  res = await call({ user: 'dependabot[bot]', slides: 'repos' });
  assert.match(res.body, /GitHub user not found/);
});

test('unknown user shows a clear message', async () => {
  const res = await call({ user: 'ghost-user-404' });
  assert.match(res.body, /GitHub user not found/);
  assert.match(res.headers['cache-control'], /s-maxage=60/);
});

test('rate limit on the profile shows a helpful message', async () => {
  const res = await call({ user: 'octocat' }, { '/users/octocat': rateLimited });
  assert.match(res.body, /rate limit exceeded/);
  assert.match(res.body, /GITHUB_TOKEN/);
});

test('only the data needed by the chosen slide is fetched', async () => {
  await call({ user: 'octocat', slides: 'repos' });
  assert.deepEqual(paths(), ['/users/octocat']);
  await call({ user: 'octocat', slides: 'stars' });
  assert.deepEqual(paths().sort(), ['/users/octocat', '/users/octocat/repos']);
  await call({ user: 'octocat', slides: 'events' });
  assert.deepEqual(paths().sort(), ['/users/octocat', '/users/octocat/events/public']);
  await call({ user: 'octocat', slides: 'latestissues' });
  assert.deepEqual(paths().sort(), ['/search/issues', '/users/octocat']);
  await call({ user: 'octocat', slides: 'commits' });
  assert.ok(paths().some(p => p.endsWith('/commits')));
});

test('every slide renders through the handler in every theme', async () => {
  for (let i = 0; i < SLIDES.length; i += 1) {
    for (const theme of Object.keys(THEMES)) {
      const res = await call({ user: 'octocat', _slide: String(i), theme, tz: '3' });
      assert.doesNotMatch(res.body, /gh-card error/, `${SLIDES[i].id} / ${theme}`);
      assert.equal(res.headers['cache-control'], 'no-store');
    }
  }
});

test('production responses are cached until the rotation bucket ends', async () => {
  const res = await call({ user: 'octocat', slides: 'repos' });
  const m = res.headers['cache-control'].match(/s-maxage=(\d+)/);
  assert.ok(m, res.headers['cache-control']);
  assert.ok(Number(m[1]) >= 1 && Number(m[1]) <= 600);
});

test('a failing optional resource never breaks other slides', async () => {
  const res = await call({ user: 'octocat', slides: 'stars' }, { '/events/public': () => fx.json({}, 500), '/search/issues': rateLimited });
  assert.match(res.body, /36.0k/);
});

test('missing slide data falls back to the profile card for README viewers', async () => {
  const res = await call({ user: 'octocat', slides: 'latestissues' }, { '/search/issues': rateLimited });
  assert.match(res.body, /The Octocat/);
  assert.match(res.headers['cache-control'], /s-maxage=60/);
});

test('missing slide data is reported explicitly in preview mode', async () => {
  const res = await call({ user: 'octocat', slides: 'latestissues', _slide: '0' }, { '/search/issues': rateLimited });
  assert.match(res.body, /latestissues: GitHub API rate limit exceeded/);
});

test('a slide that throws is replaced by the fallback card', async () => {
  const slide = SLIDES.find(s => s.id === 'stars');
  const original = slide.render;
  slide.render = () => { throw new Error('boom'); };
  const log = console.error;
  console.error = () => {};
  try {
    let res = await call({ user: 'octocat', slides: 'stars' });
    assert.match(res.body, /The Octocat/);
    res = await call({ user: 'octocat', slides: 'stars', _slide: '0' });
    assert.match(res.body, /failed to render/);
  } finally {
    slide.render = original;
    console.error = log;
  }
});

test('unknown slide ids fall back to the full rotation', async () => {
  const res = await call({ user: 'octocat', slides: 'nope,<script>', _slide: '0' });
  assert.doesNotMatch(res.body, /gh-card error/);
  assert.match(res.body, /public repositories/);
});

test('repos are paginated for users with more than 100 repositories', async () => {
  const many = Array.from({ length: 100 }, (_, i) => ({ ...fx.repos[0], name: `r${i}`, full_name: `octocat/r${i}`, stargazers_count: 1 }));
  const page2 = Array.from({ length: 50 }, (_, i) => ({ ...fx.repos[0], name: `s${i}`, full_name: `octocat/s${i}`, stargazers_count: 1 }));
  const res = await call({ user: 'octocat', slides: 'stars' }, {
    '/users/octocat/repos': url => fx.json(new URL(url).searchParams.get('page') === '1' ? many : page2),
    '/users/octocat': () => fx.json({ ...fx.user, public_repos: 150 }),
  });
  assert.match(res.body, />150</);
  assert.equal(paths().filter(p => p.endsWith('/repos')).length, 2);
});

test('the GitHub token is never sent to the avatar host', async () => {
  process.env.GITHUB_TOKEN = 'secret-token';
  try {
    await call({ user: 'octocat', slides: 'profile' });
    const api = fetchMock.calls.find(c => c.url.startsWith('https://api.github.com/'));
    const avatar = fetchMock.calls.find(c => c.url.startsWith('https://avatars.githubusercontent.com/'));
    assert.equal(api.headers.Authorization, 'Bearer secret-token');
    assert.ok(avatar, 'avatar requested');
    assert.equal(avatar.headers.Authorization, undefined);
  } finally {
    delete process.env.GITHUB_TOKEN;
  }
});

test('a broken avatar still renders the profile card', async () => {
  const res = await call({ user: 'octocat', slides: 'profile' }, { 'avatars.githubusercontent.com': () => new Response('nope', { status: 500 }) });
  assert.match(res.body, /The Octocat/);
  assert.doesNotMatch(res.body, /<image/);
});

test('badges are spread across the rotation', () => {
  assert.equal(handler.badgeOffset(1, 28), 0);
  assert.equal(handler.badgeOffset(2, 28), 14);
  assert.equal(handler.badgeOffset(3, 28), 7);
  assert.equal(handler.badgeOffset(4, 28), 21);
  assert.equal(handler.badgeOffset(2, 17), 8);
  const list = handler.enabledSlides('repos,stars,followers,following');
  const t = 1234 * 10 * 60 * 1000;
  const shown = [1, 2, 3, 4].map(b => handler.pickSlide(list, undefined, b, t).id);
  assert.equal(new Set(shown).size, 4);
});

test('tz parsing is clamped and tolerant', () => {
  assert.equal(handler.parseTz('3'), 3);
  assert.equal(handler.parseTz('-5'), -5);
  assert.equal(handler.parseTz('UTC+5.5'), 5.5);
  assert.equal(handler.parseTz('99'), 14);
  assert.equal(handler.parseTz('abc'), 0);
  assert.equal(handler.parseTz(''), 0);
});
