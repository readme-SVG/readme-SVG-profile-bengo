const { svg } = require('../lib/svg');
const { ago } = require('../lib/helpers');
const { emptyState, issueRows } = require('./common');

module.exports = {
  id: 'latestissues',
  label: 'latest issues',
  needs: ['openIssues'],
  render: ({ issues, c }) => {
    const list = issues.open.slice(0, 3);
    if (!list.length) return emptyState(c, 'no open issues found', 'create or comment on public issues to populate this slide');
    return svg(issueRows(c, list, () => c.green, it => [ago(it.updated_at || it.created_at)]), c, 'latest open issues');
  },
};
