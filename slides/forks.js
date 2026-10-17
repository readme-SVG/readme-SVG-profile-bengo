const { slideStat } = require('./stat');
const { sumBy } = require('./common');

module.exports = {
  id: 'forks',
  label: 'total forks',
  needs: ['repos'],
  render: ({ repos, c }) => slideStat(c, sumBy(repos.filter(r => !r.fork), 'forks_count'), 'total forks received', c.purple),
};
