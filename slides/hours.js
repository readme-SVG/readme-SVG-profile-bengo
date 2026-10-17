const { W } = require('../lib/constants');
const { T, rect, svg } = require('../lib/svg');
const { emptyState, tzLabel, localDate } = require('./common');

function persona(h) {
  if (h >= 5 && h < 11) return 'early bird';
  if (h >= 11 && h < 17) return 'daytime coder';
  if (h >= 17 && h < 23) return 'evening coder';
  return 'night owl';
}

const pad = h => String(h).padStart(2, '0');

module.exports = {
  id: 'hours',
  label: 'active hours',
  needs: ['events'],
  render: ({ events, c, tz }) => {
    const counts = new Array(24).fill(0);
    events.forEach(e => {
      const d = localDate(e.created_at, tz);
      if (d) counts[d.getUTCHours()] += 1;
    });
    const total = counts.reduce((s, v) => s + v, 0);
    if (!total) return emptyState(c, 'no public activity yet', 'active hours are computed from recent public events');
    const max = Math.max(...counts);
    const peak = counts.indexOf(max);

    let o = '';
    o += T(16, 26, 'activity by hour', 13, c.text, 600);
    o += T(W - 16, 26, tzLabel(tz), 11, c.sec, 400, 'end');
    const x0 = 16; const x1 = W - 16; const top = 42; const base = 142;
    const slot = (x1 - x0) / 24;
    counts.forEach((v, i) => {
      const h = v ? Math.max((v / max) * (base - top), 3) : 2;
      const color = i === peak ? c.yellow : (v ? c.blue : c.border);
      const extra = v && i !== peak ? `opacity="${(0.4 + 0.6 * (v / max)).toFixed(2)}"` : '';
      o += rect(x0 + i * slot + 2.5, base - h, slot - 5, h, 2, color, extra);
    });
    o += rect(x0, base + 2, x1 - x0, 1, 0, c.border);
    [0, 6, 12, 18, 23].forEach(hr => { o += T(x0 + (hr + 0.5) * slot, 158, pad(hr), 10, c.mut, 400, 'middle'); });
    o += T(16, 182, `most active around ${pad(peak)}:00`, 11, c.sec);
    o += T(W - 16, 182, persona(peak), 12, c.purple, 600, 'end');
    return svg(o, c, 'activity by hour of day');
  },
};
