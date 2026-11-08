const test = require('node:test');
const assert = require('node:assert/strict');
const slide = require('../slides/langdonut');
const { THEMES } = require('../lib/constants');
const { assertWellFormedSvg } = require('./xml');

function render(counts) {
  const repos = counts.flatMap(([language, count]) => Array.from({ length: count }, () => ({ language })));
  const out = slide.render({ repos, c: THEMES.dark });
  assertWellFormedSvg(out);
  return out;
}

for (const counts of [
  [['Python', 7], ['HTML', 2], ['JavaScript', 1]],
  [['Python', 1], ['HTML', 1]],
  [['Python', 997], ['HTML', 2], ['JavaScript', 1]],
  [['Python', 7], ['HTML', 6], ['JavaScript', 5], ['CSS', 4], ['Go', 3], ['Rust', 2], ['C', 1]],
]) {
  test(`donut arcs share endpoints and close the ring (${counts.length} languages)`, () => {
    const out = render(counts);
    assert.doesNotMatch(out, /stroke-dash/);
    const arcs = [...out.matchAll(/<path d="M ([\d. -]+) A 60 60 0 ([01]) 1 ([\d. -]+)"[^>]*stroke-linecap="butt"/g)];
    assert.equal(arcs.length, Math.min(counts.length, 6));
    assert.equal(arcs[0][1], '100.000000 37.500000');
    arcs.forEach((arc, i) => assert.equal(arc[3], arcs[(i + 1) % arcs.length][1]));
    assert.equal(arcs[0][2], counts[0][1] > counts.reduce((s, [, n]) => s + n, 0) / 2 ? '1' : '0');
    if (counts.length > 5) assert.match(out, />other<\/text>/);
  });
}

test('one language renders a full circle, not a degenerate arc', () => {
  const out = render([['Python', 3]]);
  assert.doesNotMatch(out, /<path|stroke-dash/);
  assert.match(out, /<circle cx="100" cy="97.5" r="60" fill="none" stroke="#[\da-fA-F]+" stroke-width="22"/);
  assert.match(out, />100.0%<\/text>/);
});

test('no languages renders the empty state', () => {
  assert.match(render([]), /no languages detected/);
});
