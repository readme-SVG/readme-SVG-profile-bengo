const { statCard } = require('./stat');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

module.exports = {
  id: 'age',
  label: 'account age',
  needs: [],
  render: ({ user, c }) => {
    const created = new Date(user.created_at);
    if (!Number.isFinite(created.getTime())) return statCard(c, '?', 'on github', c.green);
    const now = new Date();
    let months = (now.getUTCFullYear() - created.getUTCFullYear()) * 12 + (now.getUTCMonth() - created.getUTCMonth());
    if (now.getUTCDate() < created.getUTCDate()) months -= 1;
    months = Math.max(months, 0);
    const big = months >= 12 ? `${Math.floor(months / 12)}y` : `${months}mo`;
    const since = `since ${MONTHS[created.getUTCMonth()]} ${created.getUTCFullYear()}`;
    return statCard(c, big, 'on github', c.green, since);
  },
};
