const { svg } = require('../lib/svg');
const { ago } = require('../lib/helpers');
const { emptyState, repoRows } = require('./common');

module.exports = {
  id: 'recent',
  label: 'recently pushed',
  needs: ['repos'],
  render: ({ repos, c }) => {
    const time = r => new Date(r.pushed_at).getTime() || 0;
    const list = repos.filter(r => !r.fork && time(r)).sort((a, b) => time(b) - time(a)).slice(0, 3);
    if (!list.length) return emptyState(c, 'no recently pushed repositories');
    return svg(repoRows(c, list, c.green, r => [ago(r.pushed_at), c.mut]), c, 'recently pushed repositories');
  },
};
