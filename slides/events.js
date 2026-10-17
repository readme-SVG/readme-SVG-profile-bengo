const { W } = require('../lib/constants');
const { T, box, svg } = require('../lib/svg');
const { ago, trunc } = require('../lib/helpers');
const { emptyState } = require('./common');

const ICONS = {
  PushEvent: '↑', CreateEvent: '+', DeleteEvent: '−', WatchEvent: '★', ForkEvent: '⑂',
  IssuesEvent: '●', IssueCommentEvent: '●', PullRequestEvent: '↵', PullRequestReviewEvent: '↵',
  PullRequestReviewCommentEvent: '↵', ReleaseEvent: '◆', PublicEvent: '◆',
};

const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

function describe(e) {
  const p = e.payload || {};
  const repo = (e.repo && e.repo.name) || '?';
  const branch = String(p.ref || '').replace(/^refs\/heads\//, '');
  switch (e.type) {
    case 'PushEvent': {
      const n = (p.commits && p.commits.length) || p.size || 0;
      if (n) return [`pushed ${plural(n, 'commit')}`, repo];
      return [branch ? `pushed to ${branch}` : 'pushed', repo];
    }
    case 'CreateEvent':
      return [p.ref_type && p.ref_type !== 'repository' && branch ? `created ${p.ref_type} ${branch}` : `created ${p.ref_type || 'repository'}`, repo];
    case 'DeleteEvent': return [`deleted ${p.ref_type || 'ref'} ${branch}`.trim(), repo];
    case 'WatchEvent': return ['starred', repo];
    case 'ForkEvent': return ['forked', repo];
    case 'IssuesEvent': return [`${p.action || 'updated'} an issue`, repo];
    case 'IssueCommentEvent': return ['commented on an issue', repo];
    case 'PullRequestEvent': {
      const action = p.action === 'closed' && p.merged ? 'merged' : (p.action || 'updated');
      return [`${action} a pull request`, repo];
    }
    case 'PullRequestReviewEvent': return ['reviewed a pull request', repo];
    case 'PullRequestReviewCommentEvent': return ['commented on a pull request', repo];
    case 'ReleaseEvent': return [`${p.action || 'published'} a release`, repo];
    case 'PublicEvent': return ['made a repository public', repo];
    case 'MemberEvent': return ['added a collaborator', repo];
    case 'GollumEvent': return ['updated the wiki', repo];
    case 'CommitCommentEvent': return ['commented on a commit', repo];
    default: return [String(e.type || 'activity').replace(/Event$/, '') || 'activity', repo];
  }
}

module.exports = {
  id: 'events',
  label: 'recent events',
  needs: ['events'],
  describe,
  render: ({ events, c }) => {
    const list = events.slice(0, 4);
    if (!list.length) return emptyState(c, 'no public events', 'recent public activity will appear here');
    let o = '';
    list.forEach((e, i) => {
      const ry = 10 + i * 44;
      const [line1, line2] = describe(e);
      o += box(8, ry, W - 16, 36, c);
      o += T(20, ry + 23, ICONS[e.type] || '•', 14, c.blue, 600);
      o += T(38, ry + 20, trunc(line1, 42), 12, c.text, 600);
      o += T(38, ry + 33, trunc(line2, 52), 10, c.blue);
      o += T(W - 14, ry + 23, ago(e.created_at), 10, c.mut, 400, 'end');
    });
    return svg(o, c, 'recent activity');
  },
};
