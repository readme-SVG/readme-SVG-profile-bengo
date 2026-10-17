const { W, H } = require('../lib/constants');
const { T, circle, svg } = require('../lib/svg');
const { lc, trunc, esc } = require('../lib/helpers');
const { emptyState, langCounts } = require('./common');

module.exports = {
  id: 'langdonut',
  label: 'language donut',
  needs: ['repos'],
  render: ({ repos, c }) => {
    const langs = langCounts(repos);
    if (!langs.length) return emptyState(c, 'no languages detected', 'public repos with code will show up here');
    const total = langs.reduce((s, [, v]) => s + v, 0);
    const parts = langs.slice(0, 5).map(([l, n]) => [l, n, lc(l)]);
    const rest = langs.slice(5).reduce((s, [, v]) => s + v, 0);
    if (rest) parts.push(['other', rest, c.mut]);

    const cx = 100; const cy = H / 2; const r = 60; const sw = 22;
    const C = 2 * Math.PI * r;
    let o = circle(cx, cy, r, 'none', `stroke="${esc(c.border)}" stroke-width="${sw}"`);
    let off = 0;
    parts.forEach(([, n, color]) => {
      const len = (n / total) * C;
      o += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${esc(color)}" stroke-width="${sw}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
      off += len;
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
