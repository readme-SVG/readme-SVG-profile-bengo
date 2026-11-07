const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/catalog');
const { buildCatalog } = require('../lib/catalog');
const SLIDES = require('../slides');
const { THEMES } = require('../lib/constants');
const fx = require('./fixtures');

async function call({ method = 'GET', headers = {} } = {}) {
  const res = fx.mockRes();
  await handler({ method, headers, query: {} }, res);
  return res;
}

test('GET /api/catalog returns the complete, well-formed catalog', async () => {
  const res = await call();
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'], /^application\/json/);
  assert.equal(res.headers['access-control-allow-origin'], '*');
  assert.match(res.headers['cache-control'], /s-maxage=3600/);
  assert.match(res.headers['x-content-type-options'], /nosniff/);

  const catalog = JSON.parse(res.body);
  assert.deepEqual(catalog, buildCatalog());
  assert.equal(catalog.slides.length, SLIDES.length);
  assert.equal(catalog.themes.length, Object.keys(THEMES).length);
  assert.equal(catalog.categories.length, 6);
  assert.equal(catalog.dimensions.width, 495);
  assert.equal(catalog.dimensions.height, 195);
  assert.equal(catalog.rotation.defaultMinutes, 10);
  assert.equal(catalog.badges.max, 8);
});

test('catalog slides are ordered, categorised and free of obsolete flags', async () => {
  const { slides, categories } = JSON.parse((await call()).body);
  const ids = new Set(categories.map(c => c.id));
  assert.equal(new Set(slides.map(s => s.id)).size, slides.length);
  slides.forEach((slide, index) => {
    assert.equal(slide.index, index);
    assert.ok(ids.has(slide.category), `${slide.id} belongs to a declared category`);
    assert.equal(typeof slide.label, 'string');
    assert.ok(slide.label.length > 0);
    assert.ok(!('isNew' in slide));
    assert.ok(Array.isArray(slide.needs));
  });
});

test('themes are grouped by scheme and all have display labels', async () => {
  const { themes } = JSON.parse((await call()).body);
  for (const theme of themes) {
    assert.ok(theme.scheme === 'dark' || theme.scheme === 'light');
    assert.ok(theme.label && theme.label !== theme.id);
  }
  assert.ok(themes.some(t => t.scheme === 'dark'));
  assert.ok(themes.some(t => t.scheme === 'light'));
});

test('HEAD and conditional requests avoid sending the body again', async () => {
  const head = await call({ method: 'HEAD' });
  assert.equal(head.statusCode, 200);
  assert.equal(head.body, '');

  const conditional = await call({ headers: { 'if-none-match': handler.ETAG } });
  assert.equal(conditional.statusCode, 304);
  assert.equal(conditional.body, '');
});
