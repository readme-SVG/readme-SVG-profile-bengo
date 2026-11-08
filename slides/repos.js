const { slideStat } = require('./stat');

module.exports = {
  id: 'repos',
  label: 'public repos',
  category: 'statistics',
  needs: [],
  render: ({ user, c }) => slideStat(c, user.public_repos, 'public repositories', c.blue),
};
