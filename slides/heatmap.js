const { W } = require('../lib/constants');
const { T, rect, svg } = require('../lib/svg');
const { fmt } = require('../lib/helpers');
const { emptyState, localDate, tzLabel } = require('./common');

const DAY = 86400000;
const WEEKS = 20;
const STEP = 20;
const CELL = 17;
const X0 = 48;
const Y0 = 36;

// A compact contribution-style calendar: columns are ISO weeks (Monday first),
// rows are weekdays. Intensity is relative to the busiest day in the window.
module.exports = {
  id: 'heatmap',
  label: 'activity calendar',
  category: 'activity',
  needs: ['events'],
  render: ({ events, c, tz }) => {
    const today = Math.floor((Date.now() + (tz || 0) * 3600000) / DAY);
    const todayDow = (new Date(today * DAY).getUTCDay() + 6) % 7;
    const start = today - ((WEEKS - 1) * 7 + todayDow);
    const counts = new Array(WEEKS * 7).fill(0);
    let total = 0;
    events.forEach(e => {
      const d = localDate(e.created_at, tz);
      if (!d) return;
      const slot = Math.floor(d.getTime() / DAY) - start;
      if (slot < 0 || slot >= counts.length) return;
      counts[slot] += 1;
      total += 1;
    });
    if (!total) return emptyState(c, 'no activity in the last 20 weeks', 'public events will fill this calendar');
    const max = Math.max(1, ...counts);

    let o = T(16, 24, 'activity calendar', 13, c.text, 600);
    o += T(W - 16, 24, `last ${WEEKS} weeks · ${tzLabel(tz)}`, 11, c.sec, 400, 'end');
    for (let col = 0; col < WEEKS; col += 1) {
      for (let row = 0; row < 7; row += 1) {
        const value = counts[col * 7 + row];
        const level = value ? Math.min(4, Math.max(1, Math.ceil((value / max) * 4))) : 0;
        const fill = level ? c.green : c.border;
        const opacity = level ? (0.25 + level * 0.1875).toFixed(2) : '1';
        o += rect(X0 + col * STEP, Y0 + row * STEP, CELL, CELL, 3, fill, `opacity="${opacity}"`);
      }
    }
    [['Mon', 0], ['Wed', 2], ['Fri', 4]].forEach(([label, row]) => {
      o += T(16, Y0 + row * STEP + 12, label, 9, c.mut);
    });
    const footer = Y0 + 7 * STEP + 8;
    o += T(16, footer, `${fmt(total)} events`, 10, c.sec);
    o += T(W - 16, footer, `${counts.filter(Boolean).length} active days`, 10, c.mut, 400, 'end');
    return svg(o, c, `public activity calendar, last ${WEEKS} weeks`);
  },
};
