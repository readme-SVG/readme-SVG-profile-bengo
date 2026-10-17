const test = require('node:test');
const assert = require('node:assert/strict');
const { esc, fmt, ago, wrap, trunc, num, arr, lc } = require('../lib/helpers');
const { getTheme, THEMES, DEFAULT_THEME } = require('../lib/constants');

test('esc escapes markup and strips characters that break XML', () => {
  assert.equal(esc('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  assert.equal(esc('ok\u0000\u0007\u001Fdone'), 'okdone');
  assert.equal(esc('tab\tnew\nline'), 'tab\tnew\nline');
  assert.equal(esc('lone \uD83D surrogate'), 'lone  surrogate');
  assert.equal(esc('emoji 🚀'), 'emoji 🚀');
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
  assert.equal(esc(42), '42');
});

test('fmt formats numbers and never leaks NaN', () => {
  assert.equal(fmt(0), '0');
  assert.equal(fmt(999), '999');
  assert.equal(fmt(1000), '1.0k');
  assert.equal(fmt(21543), '21.5k');
  assert.equal(fmt(999949), '999.9k');
  assert.equal(fmt(999999), '1.0M');
  assert.equal(fmt(2500000), '2.5M');
  assert.equal(fmt(undefined), '0');
  assert.equal(fmt('abc'), '0');
  assert.equal(fmt(null), '0');
});

test('ago handles missing, invalid and future dates', () => {
  assert.equal(ago(null), '?');
  assert.equal(ago('not a date'), '?');
  assert.equal(ago(new Date(Date.now() + 60000).toISOString()), 'just now');
  assert.equal(ago(new Date(Date.now() - 5 * 60000).toISOString()), '5m ago');
  assert.equal(ago(new Date(Date.now() - 3 * 3600000).toISOString()), '3h ago');
  assert.equal(ago(new Date(Date.now() - 2 * 86400000).toISOString()), '2d ago');
  assert.equal(ago(new Date(Date.now() - 400 * 86400000).toISOString()), '1y ago');
});

test('trunc never splits a code point and adds an ellipsis', () => {
  assert.equal(trunc('short', 10), 'short');
  assert.equal(trunc('abcdefghij', 5), 'abcd…');
  assert.equal(trunc('🚀🚀🚀🚀', 5), '🚀🚀…');
  assert.equal(trunc('🚀🚀🚀🚀', 3), '🚀…');
  assert.equal(trunc('  spaced\n\nout  ', 20), 'spaced out');
  assert.equal(trunc(null, 5), '');
});

test('wrap breaks long words and respects maxLines', () => {
  assert.deepEqual(wrap('one two three', 7), ['one two', 'three']);
  assert.deepEqual(wrap('aaaaaaaaaa', 4), ['aaaa', 'aaaa', 'aa']);
  const lines = wrap('word '.repeat(40), 20, 2);
  assert.equal(lines.length, 2);
  assert.ok(lines[1].endsWith('…'));
  assert.ok(lines.every(l => Array.from(l).length <= 20));
  assert.deepEqual(wrap('', 10), []);
  assert.deepEqual(wrap(null, 10), []);
});

test('num / arr / lc are defensive', () => {
  assert.equal(num('12'), 12);
  assert.equal(num(NaN), 0);
  assert.deepEqual(arr(null), []);
  assert.deepEqual(arr({ length: 1 }), []);
  assert.equal(lc('JavaScript'), '#f7df1e');
  assert.equal(lc('NoSuchLang'), '#8b949e');
  assert.equal(lc(null), '#8b949e');
});

test('getTheme falls back to the default theme', () => {
  assert.equal(getTheme('dracula'), THEMES.dracula);
  assert.equal(getTheme('GitHub-Light'), THEMES.github_light);
  assert.equal(getTheme(''), THEMES[DEFAULT_THEME]);
  assert.equal(getTheme('constructor'), THEMES[DEFAULT_THEME]);
  assert.equal(getTheme('__proto__'), THEMES[DEFAULT_THEME]);
});

test('every theme defines the full palette', () => {
  const keys = Object.keys(THEMES[DEFAULT_THEME]);
  for (const [name, t] of Object.entries(THEMES)) {
    assert.deepEqual(Object.keys(t).sort(), keys.sort(), name);
    for (const k of keys) {
      if (k === 'bg' && t.bg === null) continue;
      assert.equal(typeof t[k], 'string', `${name}.${k}`);
    }
  }
});

test('trunc and wrap measure CJK and emoji as double width', () => {
  const { strWidth } = require('../lib/helpers');
  assert.equal(strWidth('abc'), 3);
  assert.equal(strWidth('漢字'), 4);
  assert.equal(strWidth('🚀'), 2);
  assert.equal(strWidth('é'), 1);
  const cut = trunc('这是一个很长的中文描述用于测试截断功能', 10);
  assert.ok(strWidth(cut) <= 10, cut);
  assert.ok(cut.endsWith('…'));
  const lines = wrap('这是一个很长的中文描述没有空格需要强制换行才能显示完整', 12, 2);
  assert.equal(lines.length, 2);
  assert.ok(lines.every(l => strWidth(l) <= 12), lines.join('|'));
  assert.ok(lines[1].endsWith('…'));
});
