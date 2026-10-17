const { W } = require('../lib/constants');
const { lc, trunc } = require('../lib/helpers');
const { T, rect, circle, svg } = require('../lib/svg');
const { emptyState, langCounts } = require('./common');

module.exports = {
  id: 'langbar',
  label: 'language bar',
  needs: ['repos'],
  render: ({ repos, c }) => {
    const langs = langCounts(repos).slice(0, 6);
    if (!langs.length) return emptyState(c, 'no languages detected', 'public repos with code will show up here');
    const tot = langs.reduce((s, [, v]) => s + v, 0) || 1;
    const bx = 16; const by = 14; const bw = W - 32; const bh = 10;
    let o = `<defs><clipPath id="langbar-clip">${rect(bx, by, bw, bh, 5, '#000')}</clipPath></defs>`;
    o += rect(bx, by, bw, bh, 5, c.border);
    o += '<g clip-path="url(#langbar-clip)">';
    let off = bx;
    langs.forEach(([l, n]) => {
      const w = (n / tot) * bw;
      o += rect(off, by, w + 0.5, bh, 0, lc(l));
      off += w;
    });
    o += '</g>';
    langs.forEach(([l, n], i) => {
      const col = i < 3 ? 0 : 1;
      const row = i < 3 ? i : i - 3;
      const lx = 16 + col * 246;
      const ly = 42 + row * 46;
      o += circle(lx + 7, ly + 9, 7, lc(l));
      o += T(lx + 20, ly + 13, trunc(l, 26), 13, c.text, 600);
      o += T(lx + 20, ly + 29, `${((n / tot) * 100).toFixed(1)}%  ·  ${n} repo${n === 1 ? '' : 's'}`, 11, c.sec);
    });
    return svg(o, c, 'languages');
  },
};
