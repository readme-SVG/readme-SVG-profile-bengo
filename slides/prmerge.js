const { statCard } = require('./stat');
const { arr, fmt } = require('../lib/helpers');
const { emptyState } = require('./common');

module.exports = {
  id: 'prmerge',
  label: 'PR merge rate',
  category: 'community',
  needs: ['prs'],
  render: ({ prs, c }) => {
    const list = arr(prs);
    if (!list.length) return emptyState(c, 'no public pull requests found', 'pull requests you open will appear here');
    const merged = list.filter(pr => pr.merged).length;
    const pct = Math.round((merged / list.length) * 100);
    return statCard(c, `${pct}%`, 'pull request merge rate', c.purple, `${fmt(merged)} merged of ${fmt(list.length)} recent`);
  },
};
