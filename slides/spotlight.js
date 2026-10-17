const { W } = require('../lib/constants');
const { T, rect, circle, svg } = require('../lib/svg');
const { shuffle, fmt, ago, wrap, lc, trunc, textWidth } = require('../lib/helpers');
const { emptyState } = require('./common');

module.exports = {
  id: 'spotlight',
  label: 'spotlight repo',
  needs: ['repos'],
  render: ({ repos, c }) => {
    const r = shuffle(repos.filter(x => !x.fork && x.description))[0];
    if (!r) return emptyState(c, 'no repos with descriptions', 'add a description to a repo to spotlight it');
    let o = '';
    o += T(16, 36, trunc(r.name, 36), 18, c.blue, 700);
    const lines = wrap(r.description, 64, 3);
    lines.forEach((l, i) => { o += T(16, 58 + i * 17, l, 11, c.sec); });
    const sy = 58 + lines.length * 17 + 10;
    o += T(16, sy, `★ ${fmt(r.stargazers_count)}`, 13, c.yellow, 600);
    o += T(90, sy, `⑂ ${fmt(r.forks_count)}`, 13, c.purple, 600);
    o += T(160, sy, `● ${fmt(r.open_issues_count)}`, 13, c.sec, 600);
    let tx = 16;
    if (r.language) {
      const lang = trunc(r.language, 16);
      o += circle(22, sy + 16, 6, lc(r.language));
      o += T(33, sy + 20, lang, 11, c.sec);
      tx = 33 + textWidth(lang, 11) + 12;
    }
    const age = ago(r.created_at);
    const limit = W - 16 - textWidth(age, 10) - 10;
    r.topics.slice(0, 4).forEach(t => {
      const label = trunc(t, 14);
      const tw = textWidth(label, 8) + 16;
      if (tx + tw > limit) return;
      o += rect(tx, sy + 8, tw, 16, 8, c.blue, `fill-opacity="0.15" stroke="${c.blue}" stroke-width="0.5"`);
      o += T(tx + 8, sy + 20, label, 8, c.blue);
      tx += tw + 5;
    });
    o += T(W - 14, sy + 20, age, 10, c.mut, 400, 'end');
    return svg(o, c, `spotlight: ${r.name}`);
  },
};
