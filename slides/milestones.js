const { W } = require('../lib/constants');
const { T, rect, circle, box, svg } = require('../lib/svg');
const { fmt, num } = require('../lib/helpers');
const { sumBy } = require('./common');

// A deterministic "achievements" board: six fixed thresholds, each shown as
// unlocked or in progress. No randomness and no extra GitHub requests beyond
// the repository list, so the card is stable across rotations.
module.exports = {
  id: 'milestones',
  label: 'achievements',
  category: 'profile',
  needs: ['repos'],
  render: ({ user, repos, c }) => {
    const stars = sumBy(repos, 'stargazers_count');
    const forks = sumBy(repos.filter(r => !r.fork), 'forks_count');
    const tiles = [
      ['first repository', user.public_repos, 1, c.blue],
      ['10 repositories', user.public_repos, 10, c.blue],
      ['100 stars earned', stars, 100, c.yellow],
      ['1k stars earned', stars, 1000, c.yellow],
      ['100 forks received', forks, 100, c.purple],
      ['1k followers', user.followers, 1000, c.green],
    ];

    let o = T(16, 26, 'milestones', 13, c.text, 600);
    const unlocked = tiles.filter(([, value, goal]) => num(value) >= goal).length;
    o += T(W - 16, 26, `${unlocked} of ${tiles.length} unlocked`, 11, c.sec, 400, 'end');

    tiles.forEach(([label, raw, goal, accent], i) => {
      const value = Math.max(num(raw), 0);
      const done = value >= goal;
      const color = done ? accent : c.mut;
      const x = 16 + (i % 2) * 239;
      const y = 42 + Math.floor(i / 2) * 46;
      const w = 224;
      o += box(x, y, w, 40, c);
      o += rect(x, y, 3, 40, 2, color, done ? '' : 'opacity="0.4"');
      o += circle(x + 16, y + 20, 5, color);
      o += T(x + 28, y + 17, label, 11, done ? c.text : c.sec, 600);
      o += T(x + 28, y + 32, done ? `${fmt(value)} reached` : `${fmt(value)} / ${fmt(goal)}`, 10, color);
      o += T(x + w - 12, y + 25, done ? '✓' : '○', 13, color, 600, 'end');
    });
    return svg(o, c, 'profile milestones');
  },
};
