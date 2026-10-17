const { svg } = require('../lib/svg');
const { ago } = require('../lib/helpers');
const { emptyState, issueRows } = require('./common');

module.exports = {
  id: 'closedissues',
  label: 'closed issues',
  needs: ['closedIssues'],
  render: ({ issues, c }) => {
    const list = issues.closed.slice(0, 3);
    if (!list.length) return emptyState(c, 'no closed issues found', 'closed public issues will appear here');
    return svg(issueRows(c, list, () => c.purple, it => [ago(it.closed_at || it.updated_at)]), c, 'recently closed issues');
  },
};
