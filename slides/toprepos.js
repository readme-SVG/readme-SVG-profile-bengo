const { svg } = require('../lib/svg');
const { fmt } = require('../lib/helpers');
const { emptyState, repoRows } = require('./common');

module.exports = {
  id: 'toprepos',
  label: 'top repos',
  needs: ['repos'],
  render: ({ repos, c }) => {
    const top = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 3);
    if (!top.length) return emptyState(c, 'no public repositories yet');
    return svg(repoRows(c, top, c.blue, r => [`★ ${fmt(r.stargazers_count)}`, c.yellow]), c, 'top repositories');
  },
};
