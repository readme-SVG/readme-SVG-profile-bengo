// GET /api/catalog — machine-readable list of slides, categories, themes and
// defaults. The preview UI and third-party integrations use this instead of
// hard-coding the registry, so additions to `slides/` propagate automatically.

const { buildCatalog, validateCatalog } = require('../lib/catalog');

// Built once per warm instance: the catalog is static for the lifetime of the
// function, so re-serializing it on every request would only waste CPU.
const problems = validateCatalog();
if (problems.length) console.error('[gh-card] invalid catalog', problems);
const BODY = JSON.stringify(buildCatalog());
const ETAG = `"catalog-${Buffer.byteLength(BODY)}-${require('../lib/constants').ROTATION_MS}"`;

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('ETag', ETAG);

  const conditional = req && req.headers && req.headers['if-none-match'] === ETAG;
  const head = req && req.method === 'HEAD';
  if (conditional || head) {
    res.statusCode = conditional ? 304 : 200;
    if (typeof res.end === 'function') return res.end();
    return res.status(res.statusCode).send('');
  }
  return res.status(200).send(BODY);
};

module.exports.ETAG = ETAG;
