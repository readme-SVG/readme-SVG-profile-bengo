const { W, H } = require('../lib/constants');
const { T, TM, rect, box, svg } = require('../lib/svg');
const { shuffle, ago, wrap, trunc } = require('../lib/helpers');
const { emptyState } = require('./common');

module.exports = {
  id: 'commits',
  label: 'random commits',
  needs: ['commits'],
  render: ({ commits, c }) => {
    const picks = shuffle(commits).slice(0, 2);
    if (!picks.length) return emptyState(c, 'no public commits found', 'activity may be in private repos');
    let o = '';
    picks.forEach((cm, i) => {
      const ry = 8 + i * 90;
      o += box(8, ry, W - 16, 82, c);
      o += rect(14, ry + 10, 62, 18, 5, c.purple, `fill-opacity="0.12" stroke="${c.purple}" stroke-width="0.5"`);
      o += TM(18, ry + 23, String(cm.sha || '???????').slice(0, 7), 10, c.purple, 600);
      o += T(84, ry + 23, trunc(cm.repo || '?', 34), 11, c.sec);
      o += T(W - 14, ry + 23, ago(cm.time), 10, c.mut, 400, 'end');
      wrap(cm.msg || 'update', 60, 2).forEach((l, li) => { o += T(14, ry + 44 + li * 18, l, 12, c.text); });
    });
    return svg(o, c, 'recent commits');
  },
};
