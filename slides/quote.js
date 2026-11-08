const { W } = require('../lib/constants');
const { T, circle, svg } = require('../lib/svg');
const { wrap, trunc } = require('../lib/helpers');
const { emptyState } = require('./common');

// A typographic card for the profile bio. Text is word-wrapped by display
// width and hard-clamped to four lines so long bios never overflow the card.
module.exports = {
  id: 'quote',
  label: 'profile bio',
  category: 'profile',
  needs: [],
  render: ({ user, c }) => {
    const bio = String(user.bio == null ? '' : user.bio).trim();
    if (!bio) return emptyState(c, 'no bio yet', 'add a bio on GitHub to show it here');
    const login = String(user.login || '?');
    const lines = wrap(bio, 46, 4);

    let o = circle(36, 42, 17, c.blue, 'fill-opacity="0.10"');
    o += T(36, 52, '“', 34, c.blue, 700, 'middle');
    lines.forEach((line, i) => { o += T(32, 86 + i * 22, line, 14, c.text, 500); });
    o += T(W - 32, 166, `— ${trunc(user.name || login, 30)}`, 12, c.sec, 600, 'end');
    o += T(W - 32, 183, `@${trunc(login, 36)}`, 11, c.mut, 400, 'end');
    return svg(o, c, `bio of ${login}`);
  },
};
