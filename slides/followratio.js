const { statCard } = require('./stat');
const { fmt, num } = require('../lib/helpers');

// Followers per account followed. A zero denominator is reported as the raw
// follower count rather than as a meaningless infinite ratio.
module.exports = {
  id: 'followratio',
  label: 'follower ratio',
  category: 'statistics',
  needs: [],
  render: ({ user, c }) => {
    const followers = Math.max(num(user.followers), 0);
    const following = Math.max(num(user.following), 0);
    const ratio = following ? followers / following : followers;
    const big = ratio >= 100 ? fmt(ratio) : ratio.toFixed(1);
    const sub = `${fmt(followers)} followers · ${fmt(following)} following`;
    return statCard(c, big, 'followers per following', c.green, sub);
  },
};
