const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const SLIDES = require('../slides');
const { THEMES } = require('../lib/constants');
const { trimUser, trimRepos, trimEvents, trimSearch } = require('../lib/data');
const fx = require('./fixtures');
const { assertWellFormedSvg } = require('./xml');

const RESOURCES = new Set(['repos', 'events', 'commits', 'openIssues', 'closedIssues', 'prs', 'avatar']);

function dataset(raw) {
  return {
    user: trimUser(raw.user),
    repos: trimRepos(raw.repos),
    events: trimEvents(raw.events),
    commits: raw.commits || [],
    issues: { open: trimSearch(raw.open), closed: trimSearch(raw.closed) },
    prs: trimSearch(raw.prs),
    avatar: raw.avatar || null,
    failed: new Map(),
  };
}

const now = Date.now();
const DATASETS = {
  full: dataset({
    user: fx.user,
    repos: fx.repos,
    events: fx.events,
    commits: [{ sha: 'abc1234', msg: 'feat: something', repo: 'project-0', time: new Date().toISOString() }],
    open: fx.search.open,
    closed: fx.search.closed,
    prs: fx.search.prs,
    avatar: `data:image/png;base64,${fx.PNG.toString('base64')}`,
  }),
  empty: dataset({ user: { login: 'nobody' } }),
  single: dataset({
    user: { login: 'solo', name: 'Solo', public_repos: 1, created_at: new Date(now - 40 * 86400000).toISOString() },
    repos: [{ name: 'only', language: 'Rust', stargazers_count: 1, description: 'x', topics: ['one'], pushed_at: new Date(now).toISOString() }],
    events: [{ type: 'PushEvent', repo: { name: 'other/repo' }, created_at: new Date(now).toISOString(), payload: { ref: 'refs/heads/dev' } }],
    prs: { items: [{ title: 'pr', number: 1, state: 'open', repository_url: 'https://api.github.com/repos/a/b' }] },
  }),
  hostile: dataset({
    user: {
      login: 'x-x',
      name: '<script>alert(1)</script> & "quotes" \u0000\u0008',
      bio: `${'\u0007'.repeat(5)}${'emoji 🚀 '.repeat(40)}\uD800 lone`,
      company: '&amp; co',
      location: '￿',
      public_repos: 'NaN',
      followers: null,
      following: -5,
      public_gists: Infinity,
      created_at: 'garbage',
      type: 'Organization',
      avatar_url: 'javascript:alert(1)',
    },
    repos: [
      null, 42, 'str', {},
      {
        name: 'a'.repeat(300),
        description: '&<>"\'\u0001'.repeat(30),
        language: 'Brainf<ck',
        stargazers_count: Infinity,
        forks_count: '7',
        open_issues_count: -1,
        topics: [null, 'x'.repeat(100), 5, '<t>', '&'],
        pushed_at: 'nope',
        created_at: null,
      },
      { name: '🚀'.repeat(50), fork: 'yes', topics: 'not-array', language: 'JavaScript', description: '🚀'.repeat(80) },
    ],
    events: [
      null, {}, 'x',
      { type: 'PushEvent', payload: null },
      { type: 'PushEvent', repo: { name: 'noslash' }, payload: { commits: [null, { sha: 5, message: null }] }, created_at: 'bad' },
      { type: 'X'.repeat(200), created_at: new Date(now + 86400000).toISOString() },
      { type: 'IssuesEvent', repo: { name: '<a>/<b>' }, payload: { action: '<b>&' }, created_at: new Date(now).toISOString() },
      { type: 'PullRequestEvent', repo: { name: 'a/b' }, payload: { action: 'closed', pull_request: { merged: true } }, created_at: new Date(now).toISOString() },
    ],
    commits: [{ sha: null, msg: null, repo: null, time: null }, { sha: 'x', msg: '\u0000'.repeat(500), repo: '<r>', time: 'bad' }],
    open: { items: [null, { title: null, number: 'x', repository_url: 5 }, { title: '￿<>&', state: 'open' }] },
    closed: { items: 'nope' },
    prs: { items: [{ title: 'a'.repeat(500), state: 'closed', pull_request: { merged_at: 'yes' }, draft: 1 }] },
    avatar: 'data:image/png;base64,AAAA"><script>',
  }),
};

test('slide registry is consistent', () => {
  const ids = SLIDES.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length, 'slide ids must be unique');
  for (const s of SLIDES) {
    assert.match(s.id, /^[a-z]+$/, `id ${s.id}`);
    assert.equal(typeof s.label, 'string', `${s.id}.label`);
    assert.equal(typeof s.render, 'function', `${s.id}.render`);
    assert.ok(Array.isArray(s.needs), `${s.id}.needs`);
    s.needs.forEach(n => assert.ok(RESOURCES.has(n), `${s.id} needs unknown resource ${n}`));
  }
});

for (const [name, data] of Object.entries(DATASETS)) {
  test(`every slide renders well-formed SVG in every theme (${name} data)`, () => {
    for (const slide of SLIDES) {
      for (const [themeName, c] of Object.entries(THEMES)) {
        for (const tz of [0, 5.5, -12]) {
          let out;
          assert.doesNotThrow(() => { out = slide.render({ ...data, c, tz }); }, `${slide.id} / ${themeName} / ${name}`);
          try {
            assertWellFormedSvg(out);
          } catch (err) {
            assert.fail(`${slide.id} / ${themeName} / ${name}: ${err.message}`);
          }
          assert.match(out, /width="495" height="195"/, `${slide.id} size`);
          assert.ok(!out.includes('<script'), `${slide.id} leaked markup`);
        }
      }
    }
  });
}

test('themes with a background draw it, transparent ones do not', () => {
  const slide = SLIDES.find(s => s.id === 'repos');
  const solid = slide.render({ ...DATASETS.full, c: THEMES.dracula });
  assert.ok(solid.includes(`fill="${THEMES.dracula.bg}"`));
  const clear = slide.render({ ...DATASETS.full, c: THEMES.dark });
  assert.ok(!/<svg[^>]*><title>[^<]*<\/title><rect x="0.5"/.test(clear));
});

test('profile falls back to an initial when there is no avatar', () => {
  const profile = SLIDES.find(s => s.id === 'profile');
  const out = profile.render({ ...DATASETS.full, avatar: null, c: THEMES.dark });
  assert.ok(!out.includes('<image'));
  assert.ok(out.includes('>O</text>'));
  const withAvatar = profile.render({ ...DATASETS.full, c: THEMES.dark });
  assert.ok(withAvatar.includes('<image href="data:image/png;base64,'));
});

test('events slide describes pushes without commit lists (2025 Events API format)', () => {
  const { describe } = SLIDES.find(s => s.id === 'events');
  const [line] = describe(trimEvents([{ type: 'PushEvent', repo: { name: 'a/b' }, payload: { ref: 'refs/heads/main', head: 'abc' } }])[0]);
  assert.equal(line, 'pushed to main');
  const [legacy] = describe(trimEvents([{ type: 'PushEvent', repo: { name: 'a/b' }, payload: { commits: [{}, {}] } }])[0]);
  assert.equal(legacy, 'pushed 2 commits');
});

test('the preview UI lists exactly the server slides and themes, in order', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const slidesBlock = src.slice(src.indexOf('const ALL_SLIDES'), src.indexOf('];', src.indexOf('const ALL_SLIDES')));
  const uiSlides = [...slidesBlock.matchAll(/id:'([a-z]+)'/g)].map(m => m[1]);
  assert.deepEqual(uiSlides, SLIDES.map(s => s.id));
  const themesBlock = src.slice(src.indexOf('const THEMES'), src.indexOf('];', src.indexOf('const THEMES')));
  const uiThemes = [...themesBlock.matchAll(/id:'([a-z_]+)'/g)].map(m => m[1]);
  assert.deepEqual(uiThemes, Object.keys(THEMES));
});
