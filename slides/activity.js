const { W } = require('../lib/constants');
const { T, rect, svg } = require('../lib/svg');
const { emptyState } = require('./common');

const DAY = 86400 * 1000;
const DAYS = 30;

module.exports = {
  id: 'activity',
  label: 'activity chart',
  needs: ['events'],
  render: ({ events, c }) => {
    const today = Math.floor(Date.now() / DAY);
    const counts = new Array(DAYS).fill(0);
    events.forEach(e => {
      const t = new Date(e.created_at).getTime();
      if (!Number.isFinite(t)) return;
      const d = today - Math.floor(t / DAY);
      if (d >= 0 && d < DAYS) counts[DAYS - 1 - d] += 1;
    });
    const total = counts.reduce((s, v) => s + v, 0);
    if (!total) return emptyState(c, 'no public activity in the last 30 days', 'pushes, issues and pull requests will show up here');
    const max = Math.max(...counts);
    const active = counts.filter(Boolean).length;

    let o = '';
    o += T(16, 26, 'public activity', 13, c.text, 600);
    o += T(W - 16, 26, `${total} event${total === 1 ? '' : 's'} · last 30 days`, 11, c.sec, 400, 'end');
    const x0 = 16; const x1 = W - 16; const top = 44; const base = 150;
    const slot = (x1 - x0) / DAYS;
    counts.forEach((v, i) => {
      const h = v ? Math.max((v / max) * (base - top), 3) : 2;
      const extra = v ? `opacity="${(0.45 + 0.55 * (v / max)).toFixed(2)}"` : '';
      o += rect(x0 + i * slot + 2, base - h, slot - 4, h, 2, v ? c.green : c.border, extra);
    });
    o += rect(x0, base + 2, x1 - x0, 1, 0, c.border);
    o += T(x0, 172, '30 days ago', 10, c.mut);
    o += T(W / 2, 172, `${active} active day${active === 1 ? '' : 's'} · peak ${max}/day`, 10, c.sec, 400, 'middle');
    o += T(x1, 172, 'today', 10, c.mut, 400, 'end');
    return svg(o, c, 'public activity, last 30 days');
  },
};
