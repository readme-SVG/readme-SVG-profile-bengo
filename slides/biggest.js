const { svg } = require('../lib/svg');
const { num, formatSize } = require('../lib/helpers');
const { emptyState, repoRows } = require('./common');

// GitHub exposes repository size in KB; `trimRepo` keeps it as a sanitised,
// non-negative integer so this renderer can stay purely presentational.
module.exports = {
  id: 'biggest',
  label: 'largest repos',
  category: 'repositories',
  needs: ['repos'],
  render: ({ repos, c }) => {
    const list = repos
      .filter(r => !r.fork && num(r.size) > 0)
      .sort((a, b) => num(b.size) - num(a.size))
      .slice(0, 3);
    if (!list.length) return emptyState(c, 'no repository sizes available', 'GitHub reports size for repositories with code');
    return svg(repoRows(c, list, c.orange, r => [formatSize(r.size), c.orange]), c, 'largest repositories');
  },
};
