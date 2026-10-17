const { W } = require('../lib/constants');
const { T, rect, svg } = require('../lib/svg');
const { emptyState, tzLabel, localDate } = require('./common');

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

module.exports = {
  id: 'weekdays',
  label: 'active weekdays',
  needs: ['events'],
  render: ({ events, c, tz }) => {
    const counts = new Array(7).fill(0);
    events.forEach(e => {
      const d = localDate(e.created_at, tz);
      if (d) counts[(d.getUTCDay() + 6) % 7] += 1;
    });
    const total = counts.reduce((s, v) => s + v, 0);
    if (!total) return emptyState(c, 'no public activity yet', 'weekday stats are computed from recent public events');
    const max = Math.max(...counts);
    const peak = counts.indexOf(max);

    let o = '';
    o += T(16, 24, 'activity by weekday', 13, c.text, 600);
    o += T(W - 16, 24, `busiest: ${FULL[peak]} · ${tzLabel(tz)}`, 11, c.sec, 400, 'end');
    const bx = 56; const bw = W - bx - 60;
    counts.forEach((v, i) => {
      const y = 50 + i * 20;
      o += T(16, y, DAYS[i], 11, i === peak ? c.text : c.sec, 600);
      o += rect(bx, y - 9, bw, 10, 5, c.border);
      if (v) o += rect(bx, y - 9, Math.max((v / max) * bw, 10), 10, 5, i === peak ? c.green : c.blue, i === peak ? '' : 'opacity="0.75"');
      o += T(W - 16, y, `${Math.round((v / total) * 100)}%`, 11, c.sec, 500, 'end');
    });
    return svg(o, c, 'activity by weekday');
  },
};
