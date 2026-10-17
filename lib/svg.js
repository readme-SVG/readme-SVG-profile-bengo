const { W, H, GH } = require('./constants');
const { esc } = require('./helpers');

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,'SFMono-Regular','SF Mono',Menlo,Consolas,monospace";

// Coordinates are often computed; never let NaN/Infinity leak into the markup.
function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? Math.round(x * 10) / 10 : 0;
}

function T(x, y, s, sz, fill, fw, an) {
  return `<text x="${n(x)}" y="${n(y)}" font-family="${SANS}" font-size="${sz || 13}" fill="${esc(fill || GH.text)}" font-weight="${fw || 400}" text-anchor="${an || 'start'}">${esc(s)}</text>`;
}

function TM(x, y, s, sz, fill, fw, an) {
  return `<text x="${n(x)}" y="${n(y)}" font-family="${MONO}" font-size="${sz || 11}" fill="${esc(fill || GH.text)}" font-weight="${fw || 400}" text-anchor="${an || 'start'}">${esc(s)}</text>`;
}

function rect(x, y, w, h, rx, fill, extra) {
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(Math.max(w, 0))}" height="${n(Math.max(h, 0))}" rx="${n(rx)}" fill="${esc(fill)}"${extra ? ` ${extra}` : ''}/>`;
}

function circle(cx, cy, r, fill, extra) {
  return `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(Math.max(r, 0))}" fill="${esc(fill)}"${extra ? ` ${extra}` : ''}/>`;
}

// Rounded panel used by list-style slides.
function box(x, y, w, h, c) {
  return rect(x, y, w, h, 6, c.card, `stroke="${esc(c.border)}" stroke-width="1"`);
}

function svg(inner, c, title) {
  const theme = c || GH;
  let bg = '';
  if (theme.bg) bg = rect(0.5, 0.5, W - 1, H - 1, 8, theme.bg, `stroke="${esc(theme.border)}" stroke-width="1"`);
  const t = title ? `<title>${esc(title)}</title>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">${t}${bg}${inner}</svg>`;
}

module.exports = { T, TM, rect, circle, box, svg, n, SANS, MONO };
