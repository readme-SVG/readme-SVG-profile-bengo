const { slideStat } = require('./stat');

module.exports = {
  id: 'followers',
  label: 'followers',
  category: 'statistics',
  needs: [],
  render: ({ user, c }) => slideStat(c, user.followers, 'followers', c.green),
};
