const { slideStat } = require('./stat');
const { sumBy } = require('./common');

module.exports = {
  id: 'issues',
  label: 'open issues',
  needs: ['repos'],
  render: ({ repos, c }) => slideStat(c, sumBy(repos.filter(r => !r.fork), 'open_issues_count'), 'open issues across repos', c.red),
};
