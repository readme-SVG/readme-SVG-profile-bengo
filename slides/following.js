const { slideStat } = require('./stat');

module.exports = {
  id: 'following',
  label: 'following',
  needs: [],
  render: ({ user, c }) => slideStat(c, user.following, 'following', c.pink),
};
