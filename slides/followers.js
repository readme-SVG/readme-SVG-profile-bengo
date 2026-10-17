const { slideStat } = require('./stat');

module.exports = {
  id: 'followers',
  label: 'followers',
  needs: [],
  render: ({ user, c }) => slideStat(c, user.followers, 'followers', c.green),
};
