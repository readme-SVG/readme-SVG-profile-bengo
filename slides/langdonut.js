const { W, H } = require('../lib/constants');
const { T, circle, svg } = require('../lib/svg');
const { lc, trunc, esc } = require('../lib/helpers');
const { emptyState, langCounts } = require('./common');

module.exports = {
  id: 'langdonut',
  label: 'language donut',
  category: 'languages',
  needs: ['repos'],
  render: ({ repos, c }) => {
    const langs = langCounts(repos);
    if (!langs.length) return emptyState(c, 'no languages detected', 'public repos with code will show up here');
    const total = langs.reduce((s, [, v]) => s + v, 0);
    const parts = langs.slice(0, 5).map(([l, n]) => [l, n, lc(l)]);
    const rest = langs.slice(5).reduce((s, [, v]) => s + v, 0);
    if (rest) parts.push(['other', rest, c.mut]);

    const cx = 100; const cy = H / 2; const r = 60; const sw = 22;
    // Draw actual arcs rather than dashed circles: dash seams can produce
    // notches/overlaps in SVG renderers, especially at the twelve-o'clock join.
    const point = fraction => {
      const angle = fraction * 2 * Math.PI - Math.PI / 2;
      return `${(cx + r * Math.cos(angle)).toFixed(6)} ${(cy + r * Math.sin(angle)).toFixed(6)}`;
    };
    let o = '';
    let count = 0;
    parts.forEach(([, n, color], i) => {
      if (n === total) {
        o += circle(cx, cy, r, 'none', `stroke="${esc(color)}" stroke-width="${sw}"`);
      } else {
        const start = point(count / total);
        // Close the last arc at exactly the same point as the first one.
        const end = point(i === parts.length - 1 ? 0 : (count + n) / total);
        const large = n > total / 2 ? 1 : 0;
        o += `<path d="M ${start} A ${r} ${r} 0 ${large} 1 ${end}" fill="none" stroke="${esc(color)}" stroke-width="${sw}" stroke-linecap="butt"/>`;
      }
      count += n;
    });
    o += T(cx, cy + 6, String(langs.length), 26, c.text, 700, 'middle');
    o += T(cx, cy + 22, langs.length === 1 ? 'language' : 'languages', 10, c.sec, 400, 'middle');

    const lx = 196;
    const step = 25;
    const y0 = cy - ((parts.length - 1) * step) / 2 + 4;
    parts.forEach(([l, n, color], i) => {
      const y = y0 + i * step;
      o += circle(lx + 6, y - 4, 6, color);
      o += T(lx + 20, y, trunc(l, 22), 12, c.text, 600);
      o += T(W - 16, y, `${((n / total) * 100).toFixed(1)}%`, 11, c.sec, 500, 'end');
    });
    return svg(o, c, 'language breakdown');
  },
};
