const { W } = require('../lib/constants');
const { T, rect, circle, svg } = require('../lib/svg');
const { lc, trunc } = require('../lib/helpers');
const { emptyState, langCounts } = require('./common');

module.exports = {
  id: 'langlist',
  label: 'language list',
  needs: ['repos'],
  render: ({ repos, c }) => {
    const langs = langCounts(repos).slice(0, 5);
    if (!langs.length) return emptyState(c, 'no languages detected', 'public repos with code will show up here');
    const tot = langs.reduce((s, [, v]) => s + v, 0) || 1;
    const maxV = langs[0][1] || 1;
    let o = '';
    langs.forEach(([l, n], i) => {
      const ly = 14 + i * 34;
      const pct = (n / tot) * 100;
      const bw = Math.max((n / maxV) * (W - 200), 4);
      o += circle(22, ly + 12, 7, lc(l));
      o += T(36, ly + 16, trunc(l, 14), 12, c.text, 600);
      o += rect(138, ly + 5, W - 200, 14, 7, c.border);
      o += rect(138, ly + 5, bw, 14, 7, lc(l), 'opacity="0.85"');
      o += T(W - 14, ly + 16, `${pct.toFixed(1)}%`, 11, c.sec, 500, 'end');
    });
    return svg(o, c, 'languages');
  },
};
