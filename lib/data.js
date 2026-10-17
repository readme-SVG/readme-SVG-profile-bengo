// Loads only the GitHub data a slide actually needs. The user profile is the
// only hard requirement; every other resource is fetched in parallel and its
// failure is reported in `failed` instead of throwing.

const { gh, API } = require('./github');
const { arr, num } = require('./helpers');

const MAX_REPO_PAGES = 3;
const COMMIT_REPOS = 3;
const SEARCH_TTL = 10 * 60 * 1000;
const AVATAR_TTL = 60 * 60 * 1000;
const AVATAR_MAX_BYTES = 200 * 1024;

const str = v => (typeof v === 'string' ? v : '');
// counters from the API are non-negative integers; anything else becomes 0
const count = v => Math.max(Math.floor(num(v)), 0);

function trimUser(u) {
  const x = u && typeof u === 'object' ? u : {};
  return {
    login: str(x.login),
    name: str(x.name),
    bio: str(x.bio),
    company: str(x.company),
    location: str(x.location),
    blog: str(x.blog),
    type: str(x.type),
    avatar_url: str(x.avatar_url),
    public_repos: count(x.public_repos),
    public_gists: count(x.public_gists),
    followers: count(x.followers),
    following: count(x.following),
    created_at: str(x.created_at),
  };
}

function trimRepo(r) {
  return {
    name: str(r.name) || '?',
    full_name: str(r.full_name),
    fork: !!r.fork,
    archived: !!r.archived,
    description: str(r.description),
    language: str(r.language) || null,
    stargazers_count: count(r.stargazers_count),
    forks_count: count(r.forks_count),
    open_issues_count: count(r.open_issues_count),
    topics: arr(r.topics).filter(t => typeof t === 'string'),
    created_at: str(r.created_at),
    updated_at: str(r.updated_at),
    pushed_at: str(r.pushed_at),
  };
}

const trimRepos = list => arr(list).filter(r => r && typeof r === 'object').map(trimRepo);

function trimEvent(e) {
  const p = e.payload && typeof e.payload === 'object' ? e.payload : {};
  return {
    type: str(e.type) || 'Event',
    repo: { name: str(e.repo && e.repo.name) },
    created_at: str(e.created_at),
    payload: {
      action: str(p.action),
      ref: str(p.ref),
      ref_type: str(p.ref_type),
      size: count(p.size),
      merged: !!(p.pull_request && (p.pull_request.merged || p.pull_request.merged_at)),
      commits: arr(p.commits).slice(0, 20).map(c => ({ sha: str(c && c.sha), message: str(c && c.message) })),
    },
  };
}

const trimEvents = list => arr(list).filter(e => e && typeof e === 'object').map(trimEvent);

function trimSearch(res) {
  return arr(res && res.items).filter(i => i && typeof i === 'object').map(i => ({
    title: str(i.title),
    number: count(i.number),
    state: str(i.state),
    draft: !!i.draft,
    merged: !!(i.pull_request && i.pull_request.merged_at),
    repository_url: str(i.repository_url),
    created_at: str(i.created_at),
    updated_at: str(i.updated_at),
    closed_at: str(i.closed_at),
  }));
}

function toDataUri({ contentType, buffer }) {
  const type = String(contentType).split(';')[0].trim().toLowerCase();
  if (!/^image\/(png|jpeg|gif|webp)$/.test(type) || !buffer || !buffer.length) return null;
  return `data:${type};base64,${buffer.toString('base64')}`;
}

function avatarUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || u.hostname !== 'avatars.githubusercontent.com') return null;
    u.searchParams.set('s', '120');
    return u.toString();
  } catch (_) {
    return null;
  }
}

// Never-rejecting wrapper so a failed optional request can't become an unhandled rejection.
const settle = p => p.then(value => ({ ok: true, value }), error => ({ ok: false, error }));

function searchUrl(q, perPage) {
  return `${API}/search/issues?q=${encodeURIComponent(q)}&sort=updated&order=desc&per_page=${perPage}`;
}

function pushCommits(events) {
  const out = [];
  events.forEach(e => {
    if (e.type !== 'PushEvent') return;
    e.payload.commits.forEach(c => {
      out.push({
        sha: c.sha ? c.sha.slice(0, 7) : '???????',
        msg: (c.message || '').split('\n')[0].trim() || 'update',
        repo: e.repo.name ? e.repo.name.split('/').pop() : '?',
        time: e.created_at,
      });
    });
  });
  return out;
}

/**
 * @param {string} username validated GitHub login
 * @param {string[]} needs  resources: repos, events, commits, openIssues, closedIssues, prs, avatar
 * @param {{token?: string, deadline?: number}} opts
 */
async function loadData(username, needs, opts = {}) {
  const want = new Set(arr(needs));
  if (want.has('commits')) { want.add('repos'); want.add('events'); }
  const token = opts.token || '';
  const o = { deadline: opts.deadline };
  const login = encodeURIComponent(username);
  const base = `${API}/users/${login}`;

  const userP = settle(gh(base, token, { ...o, transform: trimUser }));
  const repoPage = page => gh(`${base}/repos?sort=updated&per_page=100&page=${page}`, token, { ...o, transform: trimRepos });
  const repos1P = want.has('repos') ? settle(repoPage(1)) : null;
  const eventsP = want.has('events') ? settle(gh(`${base}/events/public?per_page=100`, token, { ...o, transform: trimEvents })) : null;
  const search = (q, n) => settle(gh(searchUrl(q, n), token, { ...o, ttl: SEARCH_TTL, transform: trimSearch }));
  const openP = want.has('openIssues') ? search(`author:${username} is:issue state:open`, 10) : null;
  const closedP = want.has('closedIssues') ? search(`author:${username} is:issue state:closed`, 10) : null;
  const prsP = want.has('prs') ? search(`author:${username} is:pr`, 10) : null;

  const userRes = await userP;
  // the other requests are settled promises, so leaving them behind is safe
  if (!userRes.ok) throw userRes.error;
  const user = userRes.value;
  const failed = new Map();
  const data = {
    user,
    repos: [],
    events: [],
    commits: [],
    issues: { open: [], closed: [] },
    prs: [],
    avatar: null,
    failed,
  };

  const avatarP = want.has('avatar') && avatarUrl(user.avatar_url)
    ? settle(gh(avatarUrl(user.avatar_url), '', { ...o, binary: true, ttl: AVATAR_TTL, maxBytes: AVATAR_MAX_BYTES, transform: toDataUri, timeout: 3000 }))
    : null;

  if (repos1P) {
    const first = await repos1P;
    if (first.ok) {
      let all = first.value;
      const pages = Math.min(Math.ceil(user.public_repos / 100), MAX_REPO_PAGES);
      if (first.value.length >= 100 && pages > 1) {
        const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => settle(repoPage(i + 2))));
        rest.forEach(r => { if (r.ok) all = all.concat(r.value); });
      }
      const seen = new Set();
      data.repos = all.filter(r => {
        const k = r.full_name || r.name;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    } else failed.set('repos', first.error);
  }

  if (eventsP) {
    const r = await eventsP;
    if (r.ok) data.events = r.value; else failed.set('events', r.error);
  }

  const searches = [[openP, 'openIssues', v => { data.issues.open = v; }], [closedP, 'closedIssues', v => { data.issues.closed = v; }], [prsP, 'prs', v => { data.prs = v; }]];
  for (const [p, name, set] of searches) {
    if (!p) continue;
    const r = await p;
    if (r.ok) set(r.value); else failed.set(name, r.error);
  }

  if (want.has('commits')) {
    const recent = data.repos
      .filter(r => !r.fork && r.pushed_at)
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
      .slice(0, COMMIT_REPOS);
    const results = await Promise.all(recent.map(repo => settle(gh(
      `${API}/repos/${login}/${encodeURIComponent(repo.name)}/commits?per_page=20&author=${login}`,
      token,
      {
        ...o,
        transform: list => arr(list).filter(c => c && typeof c === 'object').map(c => ({
          sha: str(c.sha) ? c.sha.slice(0, 7) : '???????',
          msg: str(c.commit && c.commit.message).split('\n')[0].trim() || 'update',
          repo: repo.name,
          time: str(c.commit && c.commit.author && c.commit.author.date) || repo.pushed_at,
        })),
      },
    ))));
    results.forEach(r => { if (r.ok) data.commits.push(...r.value); });
    data.commits.push(...pushCommits(data.events));
    const allFailed = results.length > 0 && results.every(r => !r.ok);
    if (!data.commits.length && (failed.has('repos') || allFailed)) {
      failed.set('commits', failed.get('repos') || results[0].error);
    }
  }

  if (avatarP) {
    const r = await avatarP;
    data.avatar = r.ok ? r.value : null;
  }

  return data;
}

module.exports = { loadData, trimUser, trimRepo, trimRepos, trimEvent, trimEvents, trimSearch, avatarUrl };
