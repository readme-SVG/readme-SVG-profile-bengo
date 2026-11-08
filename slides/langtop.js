const { W } = require('../lib/constants');
const { T, rect, circle, svg } = require('../lib/svg');
const { lc, fmt, trunc } = require('../lib/helpers');
const { emptyState, langCounts } = require('./common');

module.exports = {
  id: 'langtop',
  label: 'primary language',
  category: 'languages',
  needs: ['repos'],
  render: ({ repos, c }) => {
    const langs = langCounts(repos);
    if (!langs.length) return emptyState(c, 'no languages detected', 'public repos with code will show up here');
    const [name, n] = langs[0];
    const total = langs.reduce((s, [, v]) => s + v, 0) || 1;
    const pct = (n / total) * 100;
    const color = lc(name);

    let o = circle(W / 2, 54, 27, color, 'opacity="0.12"');
    o += circle(W / 2, 54, 14, color);
    o += T(W / 2, 104, trunc(name, 24), 26, color, 700, 'middle');
    o += T(W / 2, 124, 'most used language', 11, c.sec, 500, 'middle');
    const barW = W - 64;
    o += rect(32, 142, barW, 10, 5, c.border);
    o += rect(32, 142, Math.max((pct / 100) * barW, 6), 10, 5, color);
    o += T(32, 174, `${fmt(n)} of ${fmt(total)} repos`, 11, c.sec);
    o += T(W - 32, 174, `${pct.toFixed(1)}%`, 12, color, 600, 'end');
    return svg(o, c, `primary language: ${name}`);
  },
};
