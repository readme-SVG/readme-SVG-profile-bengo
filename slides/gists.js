const { slideStat } = require('./stat');

module.exports = {
  id: 'gists',
  label: 'public gists',
  needs: [],
  render: ({ user, c }) => slideStat(c, user.public_gists, 'public gists', c.orange),
};
