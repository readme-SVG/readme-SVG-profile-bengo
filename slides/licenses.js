const { W } = require('../lib/constants');
const { T, svg } = require('../lib/svg');
const { emptyState, barRows } = require('./common');

// SPDX identifiers are normalised in `trimRepo`; repositories without a
// detected license are grouped under a single explicit label.
module.exports = {
  id: 'licenses',
  label: 'license breakdown',
  category: 'languages',
  needs: ['repos'],
  render: ({ repos, c }) => {
    const own = repos.filter(r => !r.fork);
    if (!own.length) return emptyState(c, 'no original repositories', 'licenses are read from your public repositories');
    const counts = new Map();
    own.forEach(r => {
      const key = String(r.license || 'Unlicensed');
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const list = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5);
    const palette = [c.blue, c.green, c.yellow, c.purple, c.pink];
    const rows = list.map(([name, n], i) => {
      const pct = (n / own.length) * 100;
      return {
        label: name,
        value: pct,
        color: palette[i % palette.length],
        right: `${pct.toFixed(1)}%`,
      };
    });

    let o = T(16, 26, 'license breakdown', 13, c.text, 600);
    o += T(W - 16, 26, `${list.length} ${list.length === 1 ? 'license' : 'licenses'} · ${own.length} repos`, 11, c.sec, 400, 'end');
    o += barRows(c, rows, { y0: 58, step: 28, height: 12, max: 100 });
    return svg(o, c, 'repository licenses');
  },
};
