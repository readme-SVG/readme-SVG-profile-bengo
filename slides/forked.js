const { svg } = require('../lib/svg');
const { fmt } = require('../lib/helpers');
const { emptyState, repoRows } = require('./common');

module.exports = {
  id: 'forked',
  label: 'most forked',
  needs: ['repos'],
  render: ({ repos, c }) => {
    const top = repos.filter(r => !r.fork).sort((a, b) => b.forks_count - a.forks_count).slice(0, 3);
    if (!top.length) return emptyState(c, 'no original repositories yet');
    return svg(repoRows(c, top, c.purple, r => [`⑂ ${fmt(r.forks_count)}`, c.purple]), c, 'most forked repositories');
  },
};
