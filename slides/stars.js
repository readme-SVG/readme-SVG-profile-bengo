const { slideStat } = require('./stat');
const { sumBy } = require('./common');

module.exports = {
  id: 'stars',
  label: 'total stars',
  needs: ['repos'],
  render: ({ repos, c }) => slideStat(c, sumBy(repos, 'stargazers_count'), 'total stars earned', c.yellow),
};
