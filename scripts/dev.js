// Local preview server without the Vercel CLI.
//   node scripts/dev.js          → real GitHub API (set GITHUB_TOKEN to avoid rate limits)
//   node scripts/dev.js --mock   → offline, every username gets the test fixtures
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const port = Number(process.env.PORT) || 3000;
if (process.argv.includes('--mock')) global.fetch = require('../test/fixtures').makeFetch({}, { anyUser: true });
const handler = require('../api/card');

const STATIC = { '/': 'index.html', '/index.html': 'index.html', '/app.js': 'app.js', '/styles.css': 'styles.css' };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (url.pathname === '/api/card') {
    const query = {};
    for (const [k, v] of url.searchParams) if (!(k in query)) query[k] = v;
    res.status = code => { res.statusCode = code; return res; };
    res.send = body => res.end(body);
    await handler({ query, method: req.method, headers: req.headers }, res);
    return;
  }
  const file = STATIC[url.pathname];
  if (!file) {
    res.statusCode = 404;
    res.end('not found');
    return;
  }
  res.setHeader('Content-Type', TYPES[path.extname(file)]);
  fs.createReadStream(path.join(root, file)).pipe(res);
}).listen(port, () => {
  console.log(`gh-card dev server on http://localhost:${port}${process.argv.includes('--mock') ? ' (mock data)' : ''}`);
});
