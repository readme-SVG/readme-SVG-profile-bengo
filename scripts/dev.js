// Local preview server without the Vercel CLI.
//   node scripts/dev.js          → real GitHub API (set GITHUB_TOKEN to avoid rate limits)
//   node scripts/dev.js --mock   → offline, every username gets the test fixtures
//
// Binds to 0.0.0.0 so the workspace preview proxy can reach it.

const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const port = Number(process.env.PORT) || 3000;
const isMock = process.argv.includes('--mock');
if (isMock) global.fetch = require('../test/fixtures').makeFetch({}, { anyUser: true });

const card = require('../api/card');
const catalog = require('../api/catalog');

const STATIC = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/app.js': 'app.js',
  '/styles.css': 'styles.css',
};
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};
const API_ROUTES = { '/api/card': card, '/api/catalog': catalog };

// Minimal Vercel-compatible response surface shared by both handlers.
function decorate(res) {
  res.status = code => { res.statusCode = code; return res; };
  res.send = body => res.end(body);
  return res;
}

http.createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url, `http://localhost:${port}`);
  } catch (_) {
    res.writeHead(400).end('bad request');
    return;
  }

  const handler = API_ROUTES[url.pathname];
  if (handler) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      res.writeHead(405).end('method not allowed');
      return;
    }
    const query = {};
    for (const [k, v] of url.searchParams) if (!(k in query)) query[k] = v;
    res.setHeader('Cache-Control', 'no-store');
    decorate(res);
    try {
      await handler({ query, method: req.method, headers: req.headers }, res);
    } catch (err) {
      console.error(`[dev] ${url.pathname} failed`, err);
      if (!res.headersSent) res.writeHead(500);
      if (!res.writableEnded) res.end('internal error');
    }
    return;
  }

  const file = STATIC[url.pathname];
  if (!file) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.writeHead(404).end('not found');
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.writeHead(405).end('method not allowed');
    return;
  }
  res.setHeader('Content-Type', TYPES[path.extname(file)]);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'HEAD') { res.writeHead(200).end(); return; }
  fs.createReadStream(path.join(root, file)).pipe(res);
}).listen(port, '0.0.0.0', () => {
  console.log(`gh-card dev server on http://0.0.0.0:${port}${isMock ? ' (mock data)' : ''}`);
});
