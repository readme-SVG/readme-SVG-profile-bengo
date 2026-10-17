const { W, H } = require('../lib/constants');
const { T, rect, box, svg } = require('../lib/svg');
const { fmt } = require('../lib/helpers');
const { sumBy } = require('./common');

module.exports = {
  id: 'overview',
  label: 'stats overview',
  needs: ['repos'],
  render: ({ user, repos, c }) => {
    const own = repos.filter(r => !r.fork);
    const tiles = [
      ['stars', sumBy(repos, 'stargazers_count'), c.yellow],
      ['forks', sumBy(own, 'forks_count'), c.purple],
      ['followers', user.followers, c.green],
      ['repositories', user.public_repos, c.blue],
      ['open issues', sumBy(own, 'open_issues_count'), c.red],
      ['gists', user.public_gists, c.orange],
    ];
    const gap = 8;
    const tw = (W - 16 - gap * 2) / 3;
    const th = (H - 16 - gap) / 2;
    let o = '';
    tiles.forEach(([label, value, color], i) => {
      const tx = 8 + (i % 3) * (tw + gap);
      const ty = 8 + Math.floor(i / 3) * (th + gap);
      o += box(tx, ty, tw, th, c);
      o += rect(tx, ty, 3, th, 2, color);
      o += T(tx + 16, ty + 26, label, 11, color, 600);
      o += T(tx + 16, ty + 64, fmt(value), 28, c.text, 700);
    });
    return svg(o, c, 'GitHub stats overview');
  },
};
