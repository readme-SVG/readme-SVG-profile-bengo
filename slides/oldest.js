const { svg } = require('../lib/svg');
const { ago } = require('../lib/helpers');
const { emptyState, repoRows } = require('./common');

const createdAt = r => new Date(r.created_at).getTime();

// Longest-running original repositories. Invalid timestamps are filtered out
// instead of being sorted as epoch zero, which would surface broken records.
module.exports = {
  id: 'oldest',
  label: 'oldest repos',
  category: 'repositories',
  needs: ['repos'],
  render: ({ repos, c }) => {
    const list = repos
      .filter(r => !r.fork && Number.isFinite(createdAt(r)))
      .sort((a, b) => createdAt(a) - createdAt(b))
      .slice(0, 3);
    if (!list.length) return emptyState(c, 'no dated repositories', 'repositories with a creation date will show up here');
    return svg(repoRows(c, list, c.green, r => [ago(r.created_at), c.mut]), c, 'longest-running repositories');
  },
};
