const { W, H } = require('../lib/constants');
const { fmt } = require('../lib/helpers');
const { T, circle, svg } = require('../lib/svg');

// Big centered number with a coloured label (and optional sub-line).
function statCard(c, big, label, color, sub, title) {
  const cx = W / 2;
  const cy = sub ? H / 2 - 12 : H / 2;
  let o = '';
  o += circle(cx, cy, 78, color, 'opacity="0.04"');
  o += circle(cx, cy, 50, color, 'opacity="0.05"');
  o += T(cx, cy + 14, big, 60, c.text, 700, 'middle');
  o += T(cx, cy + 36, label, 13, color, 600, 'middle');
  if (sub) o += T(cx, cy + 54, sub, 11, c.mut, 400, 'middle');
  return svg(o, c, title || label);
}

function slideStat(c, value, label, color, sub) {
  return statCard(c, fmt(value), label, color, sub);
}

module.exports = { slideStat, statCard };
