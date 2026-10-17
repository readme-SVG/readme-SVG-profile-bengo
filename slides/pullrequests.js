const { svg } = require('../lib/svg');
const { ago } = require('../lib/helpers');
const { emptyState, issueRows } = require('./common');

function state(pr, c) {
  if (pr.merged) return ['merged', c.purple];
  if (pr.state === 'open') return pr.draft ? ['draft', c.mut] : ['open', c.green];
  return ['closed', c.red];
}

module.exports = {
  id: 'pullrequests',
  label: 'pull requests',
  needs: ['prs'],
  render: ({ prs, c }) => {
    const list = prs.slice(0, 3);
    if (!list.length) return emptyState(c, 'no public pull requests found', 'pull requests you open will appear here');
    return svg(issueRows(
      c,
      list,
      pr => state(pr, c)[1],
      pr => {
        const [label, color] = state(pr, c);
        return [`${label} · ${ago(pr.updated_at || pr.created_at)}`, color];
      },
    ), c, 'latest pull requests');
  },
};
