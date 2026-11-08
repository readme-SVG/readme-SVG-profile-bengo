// Public catalog of everything a client can configure.
//
// The preview UI used to keep its own copies of the slide list, theme list and
// rotation interval. Those copies drifted every time a slide was added. This
// module derives the catalog from the authoritative sources instead: slide
// metadata lives with each renderer in `slides/`, palettes and timing live in
// `lib/constants.js`. `api/catalog.js` exposes the result as JSON and the UI
// builds itself from it, so there is exactly one place to edit.

const SLIDES = require('../slides');
const {
  W, H, THEMES, THEME_LABELS, DEFAULT_THEME,
  ROTATION_MS, MIN_INTERVAL_MIN, MAX_INTERVAL_MIN, DEFAULT_INTERVAL_MIN, MAX_BADGES,
} = require('./constants');

// Ordered groups used by the UI. `hint` is a short, purely presentational
// description; `id` is the value stored on each slide module as `category`.
const CATEGORIES = [
  { id: 'profile',      label: 'Profile & Account', hint: 'Identity, bio and milestones' },
  { id: 'statistics',   label: 'Statistics',        hint: 'Headline numbers and ratios' },
  { id: 'repositories', label: 'Repositories',      hint: 'Rankings and repository details' },
  { id: 'languages',    label: 'Languages & Topics', hint: 'Stacks, licenses and tags' },
  { id: 'activity',     label: 'Activity',          hint: 'Events, streaks and time patterns' },
  { id: 'community',    label: 'Community',         hint: 'Issues, pull requests and collaboration' },
];

const CATEGORY_IDS = new Set(CATEGORIES.map(c => c.id));

/**
 * Build the immutable, serializable catalog served by `GET /api/catalog`.
 * The array order is the render order of `slides/index.js`; `index` is exposed
 * so clients can address the `_slide=` preview override without guessing.
 */
function buildCatalog() {
  const slides = SLIDES.map((slide, index) => ({
    id: slide.id,
    label: slide.label,
    category: slide.category,
    needs: [...slide.needs],
    index,
  }));
  const themes = Object.keys(THEMES).map(id => ({
    id,
    label: THEME_LABELS[id] || id,
    scheme: THEMES[id].scheme,
  }));
  return {
    version: 2,
    dimensions: { width: W, height: H },
    rotation: {
      defaultMinutes: DEFAULT_INTERVAL_MIN,
      minMinutes: MIN_INTERVAL_MIN,
      maxMinutes: MAX_INTERVAL_MIN,
      defaultMs: ROTATION_MS,
    },
    badges: { max: MAX_BADGES, ui: [1, 2] },
    defaults: { theme: DEFAULT_THEME, timezone: 0 },
    categories: CATEGORIES.map(c => ({ ...c })),
    slides,
    themes,
  };
}

/**
 * Return an array of human-readable integrity problems (empty when valid).
 * Used by the test suite and by `api/catalog.js` so a malformed registry can
 * never be published as a seemingly valid catalog.
 */
function validateCatalog(catalog = buildCatalog()) {
  const problems = [];
  const ids = new Set();

  const categoryIds = new Set((catalog.categories || []).map(c => c.id));
  for (const category of catalog.categories || []) {
    if (!/^[a-z]+$/.test(category.id)) problems.push(`invalid category id: ${category.id}`);
    if (!category.label || !category.hint) problems.push(`incomplete category: ${category.id}`);
  }
  if (categoryIds.size !== (catalog.categories || []).length) problems.push('duplicate category ids');

  for (const slide of catalog.slides || []) {
    if (!/^[a-z]+$/.test(slide.id)) problems.push(`invalid slide id: ${slide.id}`);
    if (ids.has(slide.id)) problems.push(`duplicate slide id: ${slide.id}`);
    ids.add(slide.id);
    if (!slide.label) problems.push(`missing label: ${slide.id}`);
    if (!categoryIds.has(slide.category)) problems.push(`unknown category "${slide.category}" on ${slide.id}`);
    if ('isNew' in slide) problems.push(`obsolete isNew flag on ${slide.id}`);
  }

  const themeIds = new Set((catalog.themes || []).map(t => t.id));
  for (const theme of catalog.themes || []) {
    if (!Object.prototype.hasOwnProperty.call(THEMES, theme.id)) problems.push(`unknown theme: ${theme.id}`);
    if (theme.label === theme.id) problems.push(`missing display label: ${theme.id}`);
    if (theme.scheme !== 'dark' && theme.scheme !== 'light') problems.push(`invalid scheme: ${theme.id}`);
  }
  if (themeIds.size !== Object.keys(THEMES).length) problems.push('catalog themes do not match THEMES');
  if ((catalog.slides || []).length !== SLIDES.length) problems.push('catalog slides do not match the registry');
  if (!CATEGORIES.every(c => categoryIds.has(c.id))) problems.push('catalog categories differ from CATEGORIES');
  return problems;
}

module.exports = { CATEGORIES, CATEGORY_IDS, buildCatalog, validateCatalog };
