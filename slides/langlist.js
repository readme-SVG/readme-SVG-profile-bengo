const { W } = require('../lib/constants');
const { lc } = require('../lib/helpers');
const { svg } = require('../lib/svg');
const { emptyState, langCounts, barRows } = require('./common');

module.exports = {
  id: 'langlist',
  label: 'language list',
  category: 'languages',
  needs: ['repos'],
  render: ({ repos, c }) => {
    const langs = langCounts(repos).slice(0, 5);
    if (!langs.length) return emptyState(c, 'no languages detected', 'public repos with code will show up here');
    const total = langs.reduce((s, [, v]) => s + v, 0) || 1;
    const rows = langs.map(([language, n]) => {
      const pct = (n / total) * 100;
      return {
        label: language,
        value: pct,
        color: lc(language),
        right: `${pct.toFixed(1)}%`,
      };
    });
    const chart = barRows(c, rows, {
      y0: 26, step: 34, height: 14,
      labelX: 16, barX: 138, barW: W - 200, valueX: W - 14,
      max: 100,
    });
    return svg(chart, c, 'languages');
  },
};
