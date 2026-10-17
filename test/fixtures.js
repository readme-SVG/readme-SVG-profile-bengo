// Realistic (trimmed) GitHub API payloads plus a tiny fetch mock.

const DAY = 86400 * 1000;
const iso = msAgo => new Date(Date.now() - msAgo).toISOString();

const user = {
  login: 'octocat',
  name: 'The Octocat',
  bio: 'Building things for the web. Loves open source, coffee & long walks through the codebase.',
  company: '@github',
  location: 'San Francisco',
  blog: 'https://github.blog',
  type: 'User',
  avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
  public_repos: 8,
  public_gists: 8,
  followers: 21543,
  following: 9,
  created_at: '2011-01-25T18:44:36Z',
};

const LANGS = ['JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'Shell', 'C++', 'Jupyter Notebook'];

const repos = LANGS.map((language, i) => ({
  name: `project-${i}-${language.toLowerCase().replace(/\W+/g, '-')}`,
  full_name: `octocat/project-${i}`,
  fork: i === 6,
  archived: false,
  description: i === 3 ? null : `A ${language} project number ${i} with a reasonably long description to test wrapping`,
  language,
  stargazers_count: 1000 * (8 - i) + i,
  forks_count: 120 * (8 - i),
  open_issues_count: i * 3,
  topics: ['cli', 'tooling', i % 2 ? 'web' : 'automation', `topic-${i}`],
  created_at: iso((i + 1) * 300 * DAY),
  updated_at: iso(i * DAY),
  pushed_at: iso(i * DAY + 3600 * 1000),
}));

const TYPES = ['PushEvent', 'PullRequestEvent', 'IssuesEvent', 'IssueCommentEvent', 'WatchEvent', 'CreateEvent', 'PullRequestReviewEvent', 'ReleaseEvent'];
const events = Array.from({ length: 60 }, (_, i) => {
  const type = TYPES[i % TYPES.length];
  const external = i % 3 === 0;
  return {
    type,
    repo: { name: external ? `someorg/lib-${i % 4}` : `octocat/project-${i % 5}` },
    created_at: iso(i * 0.45 * DAY + (i % 7) * 3600 * 1000),
    payload: {
      action: type === 'PullRequestEvent' ? 'closed' : 'opened',
      ref: 'refs/heads/main',
      ref_type: 'branch',
      pull_request: { merged: i % 2 === 0 },
      ...(type === 'PushEvent' && i % 2 ? { commits: [{ sha: 'abcdef1234567890', message: 'fix: handle edge case\n\nlong body' }] } : {}),
    },
  };
});

const issueItem = (n, state, extra = {}) => ({
  title: `Issue number ${n} with a title that is quite long so it has to be truncated somewhere`,
  number: n,
  state,
  repository_url: `https://api.github.com/repos/someorg/lib-${n % 3}`,
  created_at: iso(n * DAY),
  updated_at: iso(n * DAY / 2),
  closed_at: state === 'closed' ? iso(n * DAY / 3) : null,
  ...extra,
});

const search = {
  open: { total_count: 2, items: [issueItem(11, 'open'), issueItem(12, 'open')] },
  closed: { total_count: 3, items: [issueItem(21, 'closed'), issueItem(22, 'closed'), issueItem(23, 'closed')] },
  prs: {
    total_count: 3,
    items: [
      issueItem(31, 'open', { pull_request: { merged_at: null }, draft: true }),
      issueItem(32, 'closed', { pull_request: { merged_at: iso(DAY) } }),
      issueItem(33, 'closed', { pull_request: { merged_at: null } }),
    ],
  },
};

const commits = Array.from({ length: 5 }, (_, i) => ({
  sha: `${i}234567890abcdef`,
  commit: { message: `feat: commit ${i}\n\ndetails`, author: { date: iso(i * DAY) } },
}));

// 1x1 transparent PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
}

// Routes a request URL to fixture data. `overrides` maps a substring of the
// URL to a function returning a Response (or a promise / thrown error).
// With `anyUser`, every login is answered with the octocat fixtures (dev server).
function makeFetch(overrides = {}, { anyUser = false } = {}) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url: String(url), headers: init.headers || {} });
    for (const [needle, handler] of Object.entries(overrides)) {
      if (String(url).includes(needle)) return handler(url, init);
    }
    const u = new URL(url);
    let p = u.pathname;
    if (anyUser) p = p.replace(/^\/(users|repos)\/[^/]+/, '/$1/octocat');
    if (u.hostname === 'avatars.githubusercontent.com') return new Response(PNG, { headers: { 'content-type': 'image/png' } });
    if (p === '/users/octocat') return json(user, 200, { etag: '"user-v1"' });
    if (p === '/users/octocat/repos') return json(u.searchParams.get('page') === '1' ? repos : []);
    if (p === '/users/octocat/events/public') return json(events);
    if (p === '/search/issues') {
      const q = u.searchParams.get('q');
      if (q.includes('is:pr')) return json(search.prs);
      return json(q.includes('state:open') ? search.open : search.closed);
    }
    if (/^\/repos\/octocat\/[^/]+\/commits$/.test(p)) return json(commits);
    if (p.startsWith('/users/')) return json({ message: 'Not Found' }, 404);
    return json({ message: 'unexpected' }, 500);
  };
  fn.calls = calls;
  return fn;
}

function mockRes() {
  const res = { headers: {}, statusCode: 0, body: null };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.status = code => { res.statusCode = code; return res; };
  res.send = body => { res.body = body; return res; };
  return res;
}

module.exports = { user, repos, events, search, commits, PNG, json, makeFetch, mockRes, iso, DAY };
