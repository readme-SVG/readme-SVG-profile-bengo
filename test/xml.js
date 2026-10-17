// Minimal XML well-formedness checker for the generated SVG (no dependencies).
// Throws with a useful message on the first problem it finds.

const TAG = /<(\/?)([A-Za-z][\w:.-]*)((?:\s+[A-Za-z_:][\w:.-]*="[^"<]*")*)\s*(\/?)>/y;
const ATTR = /([A-Za-z_:][\w:.-]*)="([^"<]*)"/g;
const BAD_ENTITY = /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/;
// eslint-disable-next-line no-control-regex
const BAD_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

function assertWellFormedSvg(src) {
  if (typeof src !== 'string' || !src.startsWith('<svg ')) throw new Error(`not an <svg> document: ${String(src).slice(0, 60)}`);
  if (BAD_CHARS.test(src)) throw new Error('contains characters that are illegal in XML');
  for (const bad of ['NaN', 'undefined', '[object', 'Infinity']) {
    if (src.includes(bad)) throw new Error(`contains "${bad}": …${src.slice(Math.max(src.indexOf(bad) - 60, 0), src.indexOf(bad) + 20)}…`);
  }
  const stack = [];
  let pos = 0;
  let roots = 0;
  while (pos < src.length) {
    const lt = src.indexOf('<', pos);
    const text = src.slice(pos, lt === -1 ? src.length : lt);
    if (BAD_ENTITY.test(text)) throw new Error(`unescaped & in text near "${text.slice(0, 60)}"`);
    if (text.trim() && !stack.length) throw new Error(`text outside root: "${text.slice(0, 40)}"`);
    if (lt === -1) break;
    TAG.lastIndex = lt;
    const m = TAG.exec(src);
    if (!m) throw new Error(`malformed tag at ${lt}: ${src.slice(lt, lt + 80)}`);
    const [, close, name, attrs, self] = m;
    const seen = new Set();
    for (const [, k, v] of attrs.matchAll(ATTR)) {
      if (seen.has(k)) throw new Error(`duplicate attribute ${k} on <${name}>`);
      seen.add(k);
      if (BAD_ENTITY.test(v)) throw new Error(`unescaped & in attribute ${k} of <${name}>`);
    }
    if (close) {
      const open = stack.pop();
      if (open !== name) throw new Error(`</${name}> closes <${open}>`);
    } else {
      if (!stack.length) roots += 1;
      if (!self) stack.push(name);
    }
    pos = TAG.lastIndex;
  }
  if (stack.length) throw new Error(`unclosed <${stack.join('>, <')}>`);
  if (roots !== 1) throw new Error(`expected one root element, got ${roots}`);
  return true;
}

module.exports = { assertWellFormedSvg };
