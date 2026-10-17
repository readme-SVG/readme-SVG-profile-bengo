const { W } = require('../lib/constants');
const { T, rect, svg } = require('../lib/svg');
const { trunc, textWidth } = require('../lib/helpers');
const { emptyState } = require('./common');

module.exports = {
  id: 'topics',
  label: 'top topics',
  needs: ['repos'],
  render: ({ repos, c }) => {
    const own = repos.filter(r => !r.fork);
    const map = new Map();
    own.forEach(r => r.topics.forEach(t => map.set(t, (map.get(t) || 0) + 1)));
    const topics = [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (!topics.length) return emptyState(c, 'no repository topics yet', 'add topics to your repos to fill this card');

    let o = '';
    o += T(16, 26, 'top topics', 13, c.text, 600);
    o += T(W - 16, 26, `${topics.length} topic${topics.length === 1 ? '' : 's'} across ${own.length} repos`, 11, c.sec, 400, 'end');
    let x = 16;
    let y = 42;
    for (const [topic, count] of topics) {
      const label = trunc(topic, 24);
      const cnt = String(count);
      const lw = textWidth(label, 11);
      const w = lw + textWidth(cnt, 10) + 30;
      if (x + w > W - 16) {
        x = 16;
        y += 29;
        if (y + 22 > 186) break;
      }
      o += rect(x, y, w, 22, 11, c.blue, `fill-opacity="0.12" stroke="${c.blue}" stroke-opacity="0.45" stroke-width="1"`);
      o += T(x + 11, y + 15, label, 11, c.blue, 500);
      o += T(x + w - 10, y + 15, cnt, 10, c.sec, 600, 'end');
      x += w + 6;
    }
    return svg(o, c, 'top repository topics');
  },
};
