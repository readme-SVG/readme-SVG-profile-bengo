const { W, getTheme } = require('../lib/constants');
const { esc, trunc } = require('../lib/helpers');
const { loadData } = require('../lib/data');
const ALL_SLIDES = require('../slides');

// GitHub logins: letters, digits, hyphens (and "_" for managed users), max 39
// chars, plus "[bot]" apps. Anything else could point the API path elsewhere.
const USER_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,38}(?:\[bot\])?$/;
const BUCKET_MS = 10 * 60 * 1000;
// Vercel kills the function at maxDuration (10s); answer well before that.
const BUDGET_MS = 8000;
const MAX_BADGES = 8;
const FALLBACK_ID = 'profile';
const ERROR_CACHE = 'public, s-maxage=60, stale-while-revalidate=30';

const BY_ID = new Map(ALL_SLIDES.map(s => [s.id, s]));

function param(q, key) {
  const v = Array.isArray(q[key]) ? q[key][0] : q[key];
  return typeof v === 'string' ? v : (v == null ? '' : String(v));
}

function enabledSlides(slidesParam) {
  const ids = new Set(slidesParam.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
  if (!ids.size) return ALL_SLIDES;
  const list = ALL_SLIDES.filter(s => ids.has(s.id));
  return list.length ? list : ALL_SLIDES;
}

// Each badge starts at a different point of the rotation so several embeds on
// one page don't show the same slide: 1 → 0, 2 → 1/2, 3 → 1/4, 4 → 3/4, ...
function badgeOffset(badge, len) {
  let i = badge - 1;
  let f = 0;
  let d = 0.5;
  while (i > 0) {
    if (i & 1) f += d;
    d /= 2;
    i >>= 1;
  }
  return Math.floor(f * len);
}

function pickSlide(enabled, overrideIdx, badge, now) {
  if (Number.isInteger(overrideIdx) && overrideIdx >= 0 && overrideIdx < enabled.length) return enabled[overrideIdx];
  const bucket = Math.floor(now / BUCKET_MS);
  return enabled[(bucket + badgeOffset(badge, enabled.length)) % enabled.length];
}

function parseTz(raw) {
  const v = Number.parseFloat(String(raw).replace(/^utc/i, ''));
  if (!Number.isFinite(v)) return 0;
  return Math.round(Math.min(Math.max(v, -12), 14) * 4) / 4;
}

function describeError(err) {
  switch (err && err.kind) {
    case 'not_found': return ['GitHub user not found', 'check the ?user= value'];
    case 'rate_limit': return ['GitHub API rate limit exceeded', 'set GITHUB_TOKEN env var to raise rate limit'];
    case 'auth': return ['GitHub rejected the token (401)', 'check the GITHUB_TOKEN env var'];
    case 'timeout': return ['GitHub API timed out', 'try again in a minute'];
    case 'network': return ['could not reach the GitHub API', 'try again in a minute'];
    case 'server': return [`GitHub API error ${err.status}`, 'GitHub is having trouble, try again later'];
    default: return [String((err && err.message) || err || 'unknown error'), 'set GITHUB_TOKEN env var to raise rate limit'];
  }
}

function errSVG(c, msg, hint) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="80" viewBox="0 0 ${W} 80" role="img">`
    + `<title>gh-card error: ${esc(msg)}</title>`
    + `<rect width="${W}" height="80" rx="6" fill="${esc(c.bg || c.card)}" stroke="${esc(c.border)}" stroke-width="1"/>`
    + `<text x="14" y="30" font-family="monospace" font-size="11" fill="${esc(c.red)}" font-weight="600">gh-card error</text>`
    + `<text x="14" y="48" font-family="monospace" font-size="9" fill="${esc(c.sec)}">${esc(trunc(msg, 70))}</text>`
    + `<text x="14" y="63" font-family="monospace" font-size="8" fill="${esc(c.mut)}">${esc(trunc(hint || '', 80))}</text>`
    + '</svg>';
}

// Cache until the current 10-minute rotation bucket ends, so the CDN flips to
// the next slide on time instead of serving the old one for up to 10 more minutes.
function successCache(now) {
  const left = Math.max(Math.ceil((BUCKET_MS - (now % BUCKET_MS)) / 1000), 1);
  return `public, s-maxage=${left}, stale-while-revalidate=60`;
}

async function render(req, res) {
  const now = Date.now();
  const q = (req && req.query) || {};
  const c = getTheme(param(q, 'theme'));
  const overrideRaw = param(q, '_slide').trim();
  const isPreview = overrideRaw !== '';

  const send = (body, cacheControl) => {
    res.setHeader('Cache-Control', isPreview ? 'no-store' : cacheControl);
    return res.status(200).send(body);
  };
  const fail = (msg, hint) => send(errSVG(c, msg, hint), ERROR_CACHE);

  const username = param(q, 'user').trim().replace(/^@/, '');
  if (!username) return fail('Missing ?user= query param', 'example: /api/card?user=octocat');
  if (!USER_RE.test(username)) return fail('Invalid GitHub username', 'letters, digits and hyphens only, max 39 characters');

  const enabled = enabledSlides(param(q, 'slides'));
  const overrideIdx = isPreview ? Number(overrideRaw) : undefined;
  const badgeRaw = Number(param(q, 'badge'));
  const badge = Number.isInteger(badgeRaw) && badgeRaw >= 1 && badgeRaw <= MAX_BADGES ? badgeRaw : 1;
  const slide = pickSlide(enabled, overrideIdx, badge, now);

  let data;
  try {
    data = await loadData(username, slide.needs, {
      token: process.env.GITHUB_TOKEN || '',
      deadline: now + BUDGET_MS,
    });
  } catch (err) {
    const [msg, hint] = describeError(err);
    return fail(msg, hint);
  }

  const ctx = { ...data, c, tz: parseTz(param(q, 'tz')) };
  const missing = slide.needs.filter(n => data.failed.has(n));
  if (!missing.length) {
    try {
      return send(slide.render(ctx), successCache(now));
    } catch (err) {
      console.error(`[gh-card] slide "${slide.id}" failed to render`, err);
    }
  }

  // Degraded path: the slide's data could not be loaded, or it threw.
  if (isPreview) {
    if (missing.length) {
      const [msg, hint] = describeError(data.failed.get(missing[0]));
      return fail(`${slide.id}: ${msg}`, hint);
    }
    return fail(`slide "${slide.id}" failed to render`, 'please open an issue with the username');
  }
  // README viewers get a valid card instead of an error; short cache so it recovers quickly.
  return send(BY_ID.get(FALLBACK_ID).render(ctx), ERROR_CACHE);
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    return await render(req, res);
  } catch (err) {
    // last line of defence: always answer with an SVG
    console.error('[gh-card] unexpected error', err);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(errSVG(getTheme(''), 'internal error while rendering the card', 'try again in a minute'));
  }
};

module.exports.pickSlide = pickSlide;
module.exports.badgeOffset = badgeOffset;
module.exports.enabledSlides = enabledSlides;
module.exports.parseTz = parseTz;
module.exports.USER_RE = USER_RE;
