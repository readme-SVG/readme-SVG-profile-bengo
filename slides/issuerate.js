const { statCard } = require('./stat');
const { arr, fmt } = require('../lib/helpers');
const { emptyState } = require('./common');

// The search API returns a bounded sample of recent issues, so the label
// explicitly says "recent" instead of implying a lifetime resolution rate.
module.exports = {
  id: 'issuerate',
  label: 'issue resolution rate',
  category: 'community',
  needs: ['openIssues', 'closedIssues'],
  render: ({ issues, c }) => {
    const open = arr(issues && issues.open).length;
    const closed = arr(issues && issues.closed).length;
    const total = open + closed;
    if (!total) return emptyState(c, 'no public issues found', 'issues you author will appear here');
    const pct = Math.round((closed / total) * 100);
    return statCard(c, `${pct}%`, 'issue resolution rate', c.green, `${fmt(closed)} closed · ${fmt(open)} open · recent`);
  },
};
