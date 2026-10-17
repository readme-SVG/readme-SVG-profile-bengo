const { LC } = require('./constants');

const lc = l => (typeof l === 'string' && LC[l]) || '#8b949e';

// Characters that are illegal in XML 1.0 (control chars, lone surrogates,
// non-characters). A single one of these makes the whole SVG unrenderable,
// and they do show up in repo descriptions and commit messages.
const XML_INVALID = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(XML_INVALID, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const arr = v => (Array.isArray(v) ? v : []);

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function shuffle(a) {
  const b = [...arr(a)];
  for (let i = b.length - 1; i > 0; i -= 1) {
    const j = (Math.random() * (i + 1)) | 0;
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function ago(iso) {
  if (!iso) return '?';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '?';
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  if (s < 86400 * 365) return `${Math.floor(s / 86400 / 30)}mo ago`;
  return `${Math.floor(s / 86400 / 365)}y ago`;
}

function fmt(n) {
  const v = num(n);
  const a = Math.abs(v);
  if (a >= 999950) return `${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
  return String(Math.round(v));
}

// Display width in "Latin character" units: CJK and emoji take two cells,
// combining marks / variation selectors / zero-width chars take none.
function cpWidth(cp) {
  if ((cp >= 0x0300 && cp <= 0x036F) || (cp >= 0x200B && cp <= 0x200F) || (cp >= 0xFE00 && cp <= 0xFE0F)) return 0;
  if ((cp >= 0x1100 && cp <= 0x115F) || (cp >= 0x2E80 && cp <= 0xA4CF && cp !== 0x303F)
    || (cp >= 0xAC00 && cp <= 0xD7A3) || (cp >= 0xF900 && cp <= 0xFAFF) || (cp >= 0xFE30 && cp <= 0xFE4F)
    || (cp >= 0xFF00 && cp <= 0xFF60) || (cp >= 0xFFE0 && cp <= 0xFFE6)
    || (cp >= 0x1F000 && cp <= 0x1FAFF) || (cp >= 0x20000 && cp <= 0x3FFFD)) return 2;
  return 1;
}

const chWidth = ch => cpWidth(ch.codePointAt(0));
const strWidth = s => Array.from(String(s == null ? '' : s)).reduce((w, ch) => w + chWidth(ch), 0);

// Longest prefix of `chars` that fits in `max` width units.
function fit(chars, max) {
  let w = 0;
  let i = 0;
  while (i < chars.length && w + chWidth(chars[i]) <= max) { w += chWidth(chars[i]); i += 1; }
  return i;
}

// Truncate to `max` width units (never splits an emoji) and mark the cut with an ellipsis.
function trunc(s, max) {
  const text = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  if (strWidth(text) <= max) return text;
  const chars = Array.from(text);
  return `${chars.slice(0, fit(chars, Math.max(max - 1, 0))).join('').trimEnd()}…`;
}

// Word-wrap to lines of at most `max` width units. Words longer than a line
// (or CJK text without spaces) are hard-broken. With `maxLines`, the last kept
// line is ellipsised when text remains.
function wrap(text, max, maxLines) {
  const words = String(text == null ? '' : text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (let w of words) {
    while (strWidth(w) > max) {
      if (cur) { lines.push(cur); cur = ''; }
      const cps = Array.from(w);
      const n = Math.max(fit(cps, max), 1);
      lines.push(cps.slice(0, n).join(''));
      w = cps.slice(n).join('');
    }
    if (!w) continue;
    const t = cur ? `${cur} ${w}` : w;
    if (strWidth(t) > max) {
      if (cur) lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  if (maxLines && lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    const last = Array.from(kept[maxLines - 1]);
    kept[maxLines - 1] = `${last.slice(0, fit(last, max - 1)).join('').trimEnd()}…`;
    return kept;
  }
  return lines;
}

// Rough rendered width of a string; good enough for laying out pills and labels.
function textWidth(s, size, mono) {
  return strWidth(s) * size * (mono ? 0.64 : 0.62);
}

module.exports = { lc, esc, arr, num, shuffle, ago, fmt, trunc, wrap, textWidth, strWidth };
