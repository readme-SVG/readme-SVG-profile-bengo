const { W } = require('../lib/constants');
const { T, rect, circle, svg } = require('../lib/svg');
const { fmt, trunc, wrap, esc } = require('../lib/helpers');

module.exports = {
  id: 'profile',
  label: 'profile card',
  // the avatar is optional: without it the card shows an initial instead
  needs: ['avatar'],
  render: ({ user, avatar, c }) => {
    const cx = 66; const cy = 72; const r = 44;
    const login = user.login || '?';
    let o = '';
    if (avatar) {
      o += `<defs><clipPath id="profile-avatar">${circle(cx, cy, r, '#000')}</clipPath></defs>`;
      o += `<image href="${esc(avatar)}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" clip-path="url(#profile-avatar)" preserveAspectRatio="xMidYMid slice"/>`;
    } else {
      o += circle(cx, cy, r, c.blue, 'fill-opacity="0.15"');
      o += T(cx, cy + 13, Array.from(login)[0].toUpperCase(), 36, c.blue, 700, 'middle');
    }
    o += circle(cx, cy, r, 'none', `stroke="${esc(c.border)}" stroke-width="2"`);

    const x = 128;
    let y = 44;
    o += T(x, y, trunc(user.name || login, 28), 20, c.text, 700);
    y += 20;
    o += T(x, y, trunc(`@${login}${user.type === 'Organization' ? ' · organization' : ''}`, 48), 12, c.sec);
    wrap(user.bio, 54, 2).forEach(l => { y += 17; o += T(x, y, l, 11, c.sec); });
    const meta = [user.location, user.company].filter(Boolean).join('  ·  ');
    if (meta) { y += 18; o += T(x, y, trunc(meta, 56), 11, c.mut); }

    o += rect(16, 134, W - 32, 1, 0, c.border);
    const stats = [
      [user.public_repos, 'repos'],
      [user.followers, 'followers'],
      [user.following, 'following'],
      [user.public_gists, 'gists'],
    ];
    const colW = (W - 32) / stats.length;
    stats.forEach(([v, label], i) => {
      const sx = 16 + colW * (i + 0.5);
      o += T(sx, 162, fmt(v), 17, c.text, 700, 'middle');
      o += T(sx, 178, label, 10, c.mut, 400, 'middle');
    });
    return svg(o, c, `${login} on GitHub`);
  },
};
