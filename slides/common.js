// Shared building blocks for list-style slides.
const { W } = require('../lib/constants');
const { T, rect, circle, box, svg } = require('../lib/svg');
const { lc, trunc, fmt, textWidth, arr, num } = require('../lib/helpers');

function emptyState(c, title, sub) {
  let o = T(W / 2, 88, title, 13, c.sec, 400, 'middle');
  if (sub) o += T(W / 2, 108, sub, 11, c.mut, 400, 'middle');
  return svg(o, c, title);
}

function repoName(issue) {
  const full = issue.repository_url ? issue.repository_url.split('/').slice(-2).join('/') : '';
  return full || '?';
}

// Language dot + name, right-aligned so long names never run off the card.
function langTag(lang, right, y, color) {
  if (!lang) return '';
  const name = trunc(lang, 14);
  const x = right - textWidth(name, 10);
  return circle(x - 9, y - 4, 5, lc(lang)) + T(right, y, name, 10, color, 400, 'end');
}

// Three stacked repository rows (top repos, most forked, recently pushed...).
function repoRows(c, repos, accent, right) {
  let o = '';
  repos.slice(0, 3).forEach((r, i) => {
    const ry = 8 + i * 60;
    const [label, color] = right(r);
    o += box(8, ry, W - 16, 52, c);
    o += rect(8, ry, 3, 52, 2, accent, `opacity="${(1 - i * 0.3).toFixed(1)}"`);
    o += T(20, ry + 20, trunc(r.name, 32), 13, c.blue, 600);
    o += T(W - 16, ry + 20, label, 12, color, 600, 'end');
    o += T(20, ry + 37, trunc(r.description, r.language ? 50 : 62), 11, c.sec);
    o += langTag(r.language, W - 16, ry + 37, c.mut);
  });
  return o;
}

// Three stacked issue / pull request rows.
function issueRows(c, items, dot, right) {
  let o = '';
  items.slice(0, 3).forEach((it, i) => {
    const ry = 8 + i * 60;
    const [label, color] = right(it);
    o += box(8, ry, W - 16, 52, c);
    o += circle(20, ry + 20, 5, dot(it));
    o += T(32, ry + 22, trunc(it.title || 'untitled', 50), 12, c.text, 600);
    o += T(32, ry + 38, trunc(`#${it.number || '?'} in ${repoName(it)}`, 62), 10, c.blue);
    o += T(W - 14, ry + 22, label, 10, color || c.mut, 400, 'end');
  });
  return o;
}

// Repository count per language, most used first.
function langCounts(repos) {
  const map = new Map();
  arr(repos).forEach(r => { if (r.language) map.set(r.language, (map.get(r.language) || 0) + 1); });
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

const sumBy = (list, key) => arr(list).reduce((s, x) => s + (Number(x[key]) || 0), 0);

// Shared horizontal bar chart. Every list-style chart in the project used to
// restate the same geometry (label, track, filled bar, right-aligned value);
// centralising it keeps new slides consistent and removes per-slide arithmetic.
// `rows` is [{ label, value, color, right?, dotColor? }]; all numbers are
// clamped so hostile API payloads can never produce NaN or negative widths.
function barRows(c, rows, opts = {}) {
  const o = {
    y0: 20,
    step: 32,
    height: 12,
    labelX: 16,
    barX: 152,
    barW: W - 216,
    valueX: W - 16,
    dot: true,
    ...opts,
  };
  const list = arr(rows);
  const values = list.map(r => Math.max(num(r.value), 0));
  // By default the largest row fills the track; `max` lets a caller use an
  // absolute scale (e.g. 100 for percentages) so bar length matches the label.
  const max = Number.isFinite(o.max) && o.max > 0 ? o.max : Math.max(1, ...values);
  let out = '';
  list.forEach((r, i) => {
    const y = o.y0 + i * o.step;
    const value = values[i];
    const color = r.color || c.blue;
    const barY = y - o.height / 2 + 2;
    if (o.dot) out += circle(o.labelX + 6, y, 6, r.dotColor || color);
    out += T(o.labelX + (o.dot ? 20 : 0), y + 4, trunc(r.label, 14), 12, c.text, 600);
    out += rect(o.barX, barY, o.barW, o.height, o.height / 2, c.border);
    if (value) {
      const filled = Math.min(Math.max((value / max) * o.barW, 6), o.barW);
      out += rect(o.barX, barY, filled, o.height, o.height / 2, color, 'opacity="0.85"');
    }
    out += T(o.valueX, y + 4, String(r.right == null ? fmt(value) : r.right), 11, c.sec, 500, 'end');
  });
  return out;
}

module.exports = { emptyState, repoName, langTag, repoRows, issueRows, langCounts, barRows, sumBy, fmt };

// Optional `tz` (hours from UTC) for the time-of-day / weekday charts.
function tzLabel(tz) {
  if (!tz) return 'UTC';
  const sign = tz > 0 ? '+' : '−';
  const a = Math.abs(tz);
  const h = Math.floor(a);
  const m = Math.round((a - h) * 60);
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

// Event timestamp shifted into the requested zone (read it with getUTC* methods).
function localDate(iso, tz) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return new Date(t + (tz || 0) * 3600 * 1000);
}

module.exports.tzLabel = tzLabel;
module.exports.localDate = localDate;
