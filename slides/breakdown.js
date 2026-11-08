const { W } = require('../lib/constants');
const { T, svg } = require('../lib/svg');
const { fmt } = require('../lib/helpers');
const { emptyState, barRows } = require('./common');

function bucket(type) {
  const t = String(type || '');
  if (t === 'PushEvent') return 'pushes';
  if (t.startsWith('PullRequest')) return 'pull requests';
  if (/^(Issues|IssueComment|CommitComment)/.test(t)) return 'issues & comments';
  if (t === 'WatchEvent' || t === 'ForkEvent') return 'stars & forks';
  if (['CreateEvent', 'DeleteEvent', 'ReleaseEvent', 'GollumEvent', 'PublicEvent'].includes(t)) return 'repo changes';
  return 'other';
}

const GROUPS = ['pushes', 'pull requests', 'issues & comments', 'stars & forks', 'repo changes', 'other'];

module.exports = {
  id: 'breakdown',
  label: 'event breakdown',
  category: 'activity',
  needs: ['events'],
  render: ({ events, c }) => {
    const counts = new Map(GROUPS.map(g => [g, 0]));
    events.forEach(e => {
      const key = bucket(e.type);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const total = events.length;
    if (!total) return emptyState(c, 'no public events', 'recent public activity will appear here');
    const palette = [c.blue, c.purple, c.green, c.yellow, c.orange, c.mut];
    const rows = GROUPS.map((group, i) => {
      const value = counts.get(group) || 0;
      const pct = (value / total) * 100;
      return {
        label: group,
        value: pct,
        color: palette[i],
        right: `${fmt(value)} · ${pct.toFixed(0)}%`,
      };
    });

    let o = T(16, 26, 'event breakdown', 13, c.text, 600);
    o += T(W - 16, 26, `${fmt(total)} recent events`, 11, c.sec, 400, 'end');
    o += barRows(c, rows, { y0: 60, step: 24, height: 10, barW: W - 250, max: 100 });
    return svg(o, c, 'public event types');
  },
};
