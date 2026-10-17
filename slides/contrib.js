const { W } = require('../lib/constants');
const { T, rect, box, svg } = require('../lib/svg');
const { ago, trunc } = require('../lib/helpers');
const { emptyState } = require('./common');

// Which public events count as contributing to someone else's repository.
const KINDS = {
  PushEvent: ['push', 'pushes'],
  PullRequestEvent: ['pull request', 'pull requests'],
  PullRequestReviewEvent: ['review', 'reviews'],
  PullRequestReviewCommentEvent: ['review comment', 'review comments'],
  IssuesEvent: ['issue', 'issues'],
  IssueCommentEvent: ['comment', 'comments'],
  CommitCommentEvent: ['comment', 'comments'],
  ReleaseEvent: ['release', 'releases'],
  GollumEvent: ['wiki edit', 'wiki edits'],
};

module.exports = {
  id: 'contrib',
  label: 'contributions',
  needs: ['events'],
  render: ({ user, events, c }) => {
    const me = String(user.login || '').toLowerCase();
    const map = new Map();
    events.forEach(e => {
      const kind = KINDS[e.type];
      const full = e.repo.name;
      if (!kind || !full.includes('/') || full.split('/')[0].toLowerCase() === me) return;
      const x = map.get(full) || { name: full, count: 0, last: '', kinds: new Map() };
      x.count += 1;
      if (e.created_at > x.last) x.last = e.created_at;
      x.kinds.set(kind, (x.kinds.get(kind) || 0) + 1);
      map.set(full, x);
    });
    const list = [...map.values()].sort((a, b) => b.count - a.count || (a.last < b.last ? 1 : -1)).slice(0, 3);
    if (!list.length) return emptyState(c, 'no recent contributions to other repos', 'pushes, PRs and reviews on other projects will show up here');

    let o = '';
    list.forEach((x, i) => {
      const ry = 8 + i * 60;
      const summary = [...x.kinds.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([[one, many], n]) => `${n} ${n === 1 ? one : many}`)
        .join(' · ');
      o += box(8, ry, W - 16, 52, c);
      o += rect(8, ry, 3, 52, 2, c.orange, `opacity="${(1 - i * 0.3).toFixed(1)}"`);
      o += T(20, ry + 20, trunc(x.name, 44), 13, c.blue, 600);
      o += T(W - 16, ry + 20, `${x.count} event${x.count === 1 ? '' : 's'}`, 12, c.orange, 600, 'end');
      o += T(20, ry + 37, trunc(summary, 58), 11, c.sec);
      o += T(W - 16, ry + 37, ago(x.last), 10, c.mut, 400, 'end');
    });
    return svg(o, c, 'recent contributions to other repositories');
  },
};
