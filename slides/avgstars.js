const { statCard } = require('./stat');
const { sumBy } = require('./common');

module.exports = {
  id: 'avgstars',
  label: 'avg stars',
  needs: ['repos'],
  render: ({ repos, c }) => {
    const own = repos.filter(r => !r.fork);
    const avg = own.length ? sumBy(own, 'stargazers_count') / own.length : 0;
    const big = avg < 10 ? avg.toFixed(1) : String(Math.round(avg));
    return statCard(c, big, 'avg stars per repo', c.yellow, `(${own.length} original repos)`);
  },
};
