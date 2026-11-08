const { statCard } = require('./stat');
const { emptyState, localDate, tzLabel } = require('./common');

const DAY = 86400000;
const WINDOW = 30;

// Consecutive-day streaks derived from the public events feed. Day boundaries
// are computed in the requested time zone so they match the hours/weekday cards.
module.exports = {
  id: 'streak',
  label: 'activity streak',
  category: 'activity',
  needs: ['events'],
  render: ({ events, c, tz }) => {
    const today = Math.floor((Date.now() + (tz || 0) * 3600000) / DAY);
    const active = new Set();
    events.forEach(e => {
      const d = localDate(e.created_at, tz);
      if (!d) return;
      const day = Math.floor(d.getTime() / DAY);
      if (day <= today && day > today - WINDOW) active.add(day);
    });
    if (!active.size) return emptyState(c, 'no recent public activity', 'streaks are computed from the last 100 public events');

    let best = 0;
    let run = 0;
    let previous = -Infinity;
    for (let day = today - WINDOW + 1; day <= today; day += 1) {
      if (!active.has(day)) continue;
      run = day === previous + 1 ? run + 1 : 1;
      previous = day;
      if (run > best) best = run;
    }
    let current = 0;
    for (let day = today; day >= today - WINDOW && active.has(day); day -= 1) current += 1;

    const sub = `best ${best}d · ${active.size} active days · ${tzLabel(tz)}`;
    return statCard(c, String(current), 'day activity streak', c.green, sub);
  },
};
