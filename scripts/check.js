// Syntax-checks every JavaScript file in the project without executing it.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', '.vercel']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

let failed = 0;
const files = walk(root);
for (const file of files) {
  try {
    // wrap like CommonJS so top-level `return`/`require` parse the same way
    new vm.Script(`(function (exports, require, module, __filename, __dirname) {${fs.readFileSync(file, 'utf8')}\n})`, { filename: file });
  } catch (err) {
    failed += 1;
    console.error(`✗ ${path.relative(root, file)}: ${err.message}`);
  }
}
console.log(`${files.length - failed}/${files.length} files OK`);
process.exit(failed ? 1 : 0);
