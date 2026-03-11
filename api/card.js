const W = 495, H = 195;

const LANG_COLORS = {
  JavaScript:'#f7df1e',TypeScript:'#3178c6',Python:'#3572A5',Go:'#00add8',
  Rust:'#dea584',C:'#555555','C++':'#f34b7d',Ruby:'#701516',Java:'#b07219',
  PHP:'#4F5D95',Swift:'#f05138',Kotlin:'#A97BFF',Shell:'#89e051',
  HTML:'#e34c26',CSS:'#563d7c',Vue:'#41b883',Svelte:'#ff3e00',Dart:'#00b4ab',
  Scala:'#c22d40',Elixir:'#6e4a7e',Haskell:'#5e5086',Lua:'#000080',R:'#198CE7',
  Nix:'#7e7eff',Dockerfile:'#384d54',
};
function lc(l) { return LANG_COLORS[l] || '#888'; }

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length-1; i > 0; i--) {
    const j = (Math.random()*(i+1))|0;
    const t = a[i]; a[i]=a[j]; a[j]=t;
  }
  return a;
}
function timeAgo(iso) {
  const s = Math.floor((Date.now()-new Date(iso))/1000);
  if (s < 3600)  return Math.floor(s/60)+'m ago';
  if (s < 86400) return Math.floor(s/3600)+'h ago';
  return Math.floor(s/86400)+'d ago';
}
function wrap(text, maxChars) {
  const words = String(text).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur+' '+w : w;
    if (test.length > maxChars) { if (cur) lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

async function fetchGH(url, token) {
  const headers = { 'Accept':'application/vnd.github+json','User-Agent':'gh-card/2.0' };
  if (token) headers['Authorization'] = 'Bearer '+token;
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error('GitHub '+r.status+' — '+url.split('/').slice(-2).join('/'));
  return r.json();
}

// ── shared SVG text helper ──
function T(x,y,s,sz,fill,fw,anchor) {
  return `<text x="${x}" y="${y}" font-family="ui-monospace,Menlo,monospace" `
    +`font-size="${sz||10}" fill="${esc(fill||'#e8e8f0')}" `
    +`font-weight="${fw||400}" text-anchor="${anchor||'start'}">${esc(s)}</text>`;
}

// ── root SVG wrapper — just background, no chrome ──
function svg(inner, theme) {
  const dark = theme !== 'light';
  const bg   = dark ? '#0d0d14' : '#f6f8fa';
  const brd  = dark ? 'rgba(255,255,255,.09)' : '#d0d7de';
  return `<svg xmlns="http://www.w3.org/2000/svg" `
    +`width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    +`<rect width="${W}" height="${H}" rx="12" fill="${bg}" stroke="${brd}" stroke-width="1"/>`
    +inner
    +`</svg>`;
}

// ════════════════════════════════════════════
//  SLIDES  — each returns full SVG string
// ════════════════════════════════════════════

// ── 1. Bio ──
function slideBio(user, theme) {
  const dark = theme !== 'light';
  const col  = dark ? '#e8e8f0' : '#1a1a2e';
  const mut  = dark ? '#6b6b80' : '#57606a';
  const ac1  = '#7c6af7';
  const ac2  = '#2dd4bf';

  let o = '';
  o += `<defs><clipPath id="av"><circle cx="56" cy="97" r="42"/></clipPath></defs>`;
  o += `<image href="${esc(user.avatar_url)}&amp;s=168" x="14" y="55" width="84" height="84" clip-path="url(#av)"/>`;
  o += `<circle cx="56" cy="97" r="42" fill="none" stroke="${ac1}" stroke-width="1.5" opacity="0.3"/>`;

  const tx = 112;
  o += T(tx, 68, (user.name||user.login).slice(0,22), 17, col, 800);
  if (user.bio) {
    const lines = wrap(user.bio, 38);
    lines.slice(0,3).forEach((l,i) => o += T(tx, 88+i*16, l, 9.5, mut));
  }
  const detailY = user.bio ? 88 + Math.min(wrap(user.bio,38).length,3)*16 + 6 : 90;
  if (user.location) o += T(tx, detailY,    '◎ '+user.location.slice(0,30), 9, ac2);
  if (user.company)  o += T(tx, detailY+15, user.company.slice(0,30),        8, mut);

  return svg(o, theme);
}

// ── 2. Single stat — repos ──
function slideStatRepos(user, theme) {
  const dark = theme !== 'light';
  const col  = dark ? '#e8e8f0' : '#1a1a2e';
  const mut  = dark ? '#6b6b80' : '#57606a';
  const cx = W/2;

  let o = '';
  o += `<circle cx="${cx}" cy="97" r="68" fill="#7c6af7" opacity="0.06"/>`;
  o += `<circle cx="${cx}" cy="97" r="44" fill="#7c6af7" opacity="0.05"/>`;
  o += T(cx, 88, String(user.public_repos), 56, col, 800, 'middle');
  o += T(cx, 118, 'public repositories', 11, '#7c6af7', 600, 'middle');

  return svg(o, theme);
}

// ── 3. Single stat — stars ──
function slideStatStars(repos, theme) {
  const dark = theme !== 'light';
  const col  = dark ? '#e8e8f0' : '#1a1a2e';
  const total = repos.reduce((s,r)=>s+r.stargazers_count,0);
  const cx = W/2;

  let o = '';
  o += `<circle cx="${cx}" cy="97" r="68" fill="#fbbf24" opacity="0.06"/>`;
  o += `<circle cx="${cx}" cy="97" r="44" fill="#fbbf24" opacity="0.05"/>`;
  o += T(cx, 88, String(total), 56, col, 800, 'middle');
  o += T(cx, 118, 'total stars earned', 11, '#fbbf24', 600, 'middle');

  return svg(o, theme);
}

// ── 4. Single stat — followers ──
function slideStatFollowers(user, theme) {
  const dark = theme !== 'light';
  const col  = dark ? '#e8e8f0' : '#1a1a2e';
  const cx = W/2;

  let o = '';
  o += `<circle cx="${cx}" cy="97" r="68" fill="#2dd4bf" opacity="0.06"/>`;
  o += `<circle cx="${cx}" cy="97" r="44" fill="#2dd4bf" opacity="0.05"/>`;
  o += T(cx, 88, String(user.followers), 56, col, 800, 'middle');
  o += T(cx, 118, 'followers', 11, '#2dd4bf', 600, 'middle');

  return svg(o, theme);
}

// ── 5. Single stat — following ──
function slideStatFollowing(user, theme) {
  const dark = theme !== 'light';
  const col  = dark ? '#e8e8f0' : '#1a1a2e';
  const cx = W/2;

  let o = '';
  o += `<circle cx="${cx}" cy="97" r="68" fill="#f472b6" opacity="0.06"/>`;
  o += `<circle cx="${cx}" cy="97" r="44" fill="#f472b6" opacity="0.05"/>`;
  o += T(cx, 88, String(user.following), 56, col, 800, 'middle');
  o += T(cx, 118, 'following', 11, '#f472b6', 600, 'middle');

  return svg(o, theme);
}

// ── 6. Language bar ──
function slideLangBar(repos, theme) {
  const dark = theme !== 'light';
  const col  = dark ? '#e8e8f0' : '#1a1a2e';
  const mut  = dark ? '#6b6b80' : '#57606a';
  const bg3  = dark ? '#1e1e2e' : '#eaeef2';

  const langMap = {};
  repos.forEach(r => { if(r.language) langMap[r.language]=(langMap[r.language]||0)+1; });
  const langs  = Object.entries(langMap).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const totalL = langs.reduce((s,[,v])=>s+v,0)||1;

  let o = '';
  const bx=20, by=28, bw=W-40, bh=18;
  o += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="9" fill="${bg3}"/>`;
  let off = bx;
  langs.forEach(([l,n],i) => {
    const w = (n/totalL)*bw;
    const r0 = i===0?9:0, r1 = i===langs.length-1?9:0;
    o += `<rect x="${off.toFixed(1)}" y="${by}" width="${w.toFixed(1)}" height="${bh}" `
      +`rx="${r0}" fill="${lc(l)}"/>`;
    off += w;
  });

  // legend: 2 columns
  langs.forEach(([l,n],i) => {
    const col2 = i<3 ? 0 : 1;
    const row  = i<3 ? i : i-3;
    const lx = 20  + col2*240;
    const ly = 64  + row*38;
    o += `<circle cx="${lx+8}" cy="${ly+8}" r="7" fill="${lc(l)}"/>`;
    o += T(lx+22, ly+12, l, 12, col, 600);
    o += T(lx+22, ly+26, ((n/totalL)*100).toFixed(1)+'%  ·  '+n+' repos', 9, mut);
  });

  return svg(o, theme);
}

// ── 7. Top-3 repos ──
function slideTopRepos(repos, theme) {
  const dark = theme !== 'light';
  const col  = dark ? '#e8e8f0' : '#1a1a2e';
  const mut  = dark ? '#6b6b80' : '#57606a';
  const bg3  = dark ? '#13131d' : '#ffffff';
  const brd  = dark ? 'rgba(255,255,255,.07)' : '#e1e4e8';
  const ac1  = '#7c6af7';
  const gold = '#fbbf24';

  const top = [...repos].sort((a,b)=>b.stargazers_count-a.stargazers_count).slice(0,3);
  let o = '';

  top.forEach((r,i) => {
    const ry = 10 + i*58;
    o += `<rect x="10" y="${ry}" width="${W-20}" height="50" rx="8" fill="${bg3}" stroke="${brd}" stroke-width="1"/>`;
    o += `<rect x="10" y="${ry}" width="4" height="50" rx="2" fill="${ac1}" opacity="${0.9-i*0.25}"/>`;
    o += T(24, ry+18, r.name.slice(0,30), 12, ac1, 600);
    o += T(W-14, ry+18, '★ '+r.stargazers_count, 11, gold, 600, 'end');
    o += T(24, ry+34, (r.description||'').slice(0,52), 8.5, mut);
    if (r.language) {
      o += `<circle cx="${W-60}" cy="${ry+30}" r="4" fill="${lc(r.language)}"/>`;
      o += T(W-52, ry+34, r.language, 8, mut, 400, 'start');
    }
  });

  return svg(o, theme);
}

// ── 8. Activity heatmap ──
function slideHeatmap(events, theme) {
  const dark = theme !== 'light';
  const mut  = dark ? '#5a5a70' : '#8b949e';
  const bg3  = dark ? '#1e1e2e' : '#eaeef2';

  const counts = {};
  events.forEach(e => {
    const d = e.created_at ? e.created_at.slice(0,10) : null;
    if (d) counts[d]=(counts[d]||0)+1;
  });
  function hc(n) {
    if (!n) return bg3;
    if (n<=1) return '#312a8a';
    if (n<=3) return '#5048c8';
    if (n<=6) return '#7c6af7';
    return '#a99cf9';
  }

  const WEEKS=26, DAYS=7;
  const cw=14, ch=10, gx=3, gy=3;
  const totalW = WEEKS*(cw+gx)-gx;
  const sx = Math.floor((W-totalW)/2);
  const sy = 18;

  let o = '';
  const now = new Date();
  for (let w=0; w<WEEKS; w++) {
    for (let d=0; d<DAYS; d++) {
      const dt = new Date(now);
      dt.setDate(dt.getDate()-((WEEKS-1-w)*7+(DAYS-1-d)));
      const n = counts[dt.toISOString().slice(0,10)]||0;
      o += `<rect x="${sx+w*(cw+gx)}" y="${sy+d*(ch+gy)}" width="${cw}" height="${ch}" rx="2.5" fill="${hc(n)}"/>`;
    }
  }

  const ly = sy + DAYS*(ch+gy) + 10;
  o += T(sx, ly+9, 'less', 8, mut);
  [0,1,3,5,8].forEach((n,i) => {
    o += `<rect x="${sx+32+i*18}" y="${ly}" width="${cw}" height="${ch}" rx="2.5" fill="${hc(n)}"/>`;
  });
  o += T(sx+32+5*18+4, ly+9, 'more', 8, mut);

  const total = events.length;
  const days  = Object.keys(counts).length;
  o += T(W-sx, ly+9, total+' events · '+days+' active days', 8, mut, 400, 'end');

  return svg(o, theme);
}

// ── 9. Two random commits ──
function slideCommits(events, theme) {
  const dark = theme !== 'light';
  const col  = dark ? '#e8e8f0' : '#1a1a2e';
  const mut  = dark ? '#6b6b80' : '#57606a';
  const bg3  = dark ? '#13131d' : '#ffffff';
  const brd  = dark ? 'rgba(255,255,255,.07)' : '#e1e4e8';
  const ac3  = '#f472b6';

  const all = [];
  events.forEach(e => {
    if (e.type==='PushEvent' && e.payload && e.payload.commits) {
      e.payload.commits.forEach(c => all.push({
        sha:  (c.sha||'???????').slice(0,7),
        msg:  (c.message||'').split('\n')[0],
        repo: e.repo && e.repo.name ? e.repo.name.split('/').pop() : '?',
        time: e.created_at,
      }));
    }
  });

  const picks = shuffle(all).slice(0,2);
  let o = '';

  if (!picks.length) {
    o += T(W/2, H/2, 'no recent push events', 11, mut, 400, 'middle');
    return svg(o, theme);
  }

  picks.forEach((c,i) => {
    const cy = 12 + i*88;
    o += `<rect x="10" y="${cy}" width="${W-20}" height="80" rx="8" fill="${bg3}" stroke="${brd}" stroke-width="1"/>`;
    // sha badge
    o += `<rect x="18" y="${cy+10}" width="56" height="16" rx="5" fill="${ac3}" opacity="0.15"/>`;
    o += T(21, cy+22, c.sha, 9, ac3, 600);
    o += T(82, cy+22, c.repo.slice(0,28), 9, mut);
    o += T(W-16, cy+22, timeAgo(c.time), 8, mut, 400, 'end');
    // message
    const lines = wrap(c.msg, 58);
    lines.slice(0,2).forEach((l,li) => o += T(18, cy+42+li*16, l, 10.5, col));
  });

  return svg(o, theme);
}

// ── 10. Two recent events ──
function slideEvents(events, theme) {
  const dark = theme !== 'light';
  const col  = dark ? '#e8e8f0' : '#1a1a2e';
  const mut  = dark ? '#6b6b80' : '#57606a';
  const bg3  = dark ? '#13131d' : '#ffffff';
  const brd  = dark ? 'rgba(255,255,255,.07)' : '#e1e4e8';
  const ac1  = '#7c6af7';

  const icons = {
    PushEvent:'◈',CreateEvent:'✦',WatchEvent:'★',ForkEvent:'⑂',
    IssuesEvent:'◎',PullRequestEvent:'⇄',IssueCommentEvent:'◉',
    ReleaseEvent:'◆',DeleteEvent:'✕',
  };
  function desc(e) {
    const r = e.repo && e.repo.name ? e.repo.name.split('/').pop() : '';
    const p = e.payload||{};
    switch(e.type) {
      case 'PushEvent':         return ['pushed '+(p.commits?p.commits.length:0)+' commit(s)', r];
      case 'CreateEvent':       return ['created '+(p.ref_type||'ref'), p.ref||r];
      case 'WatchEvent':        return ['starred', r];
      case 'ForkEvent':         return ['forked', r];
      case 'IssuesEvent':       return [(p.action||'opened')+' issue', r];
      case 'PullRequestEvent':  return [(p.action||'opened')+' pull request', r];
      case 'IssueCommentEvent': return ['commented', r];
      case 'ReleaseEvent':      return ['released '+(p.release&&p.release.tag_name||''), r];
      default:                  return [e.type.replace('Event',''), r];
    }
  }

  const picks = events.slice(0,2);
  let o = '';

  picks.forEach((e,i) => {
    const ey = 12 + i*88;
    o += `<rect x="10" y="${ey}" width="${W-20}" height="80" rx="8" fill="${bg3}" stroke="${brd}" stroke-width="1"/>`;
    o += `<circle cx="46" cy="${ey+40}" r="20" fill="${ac1}" opacity="0.08"/>`;
    o += `<text x="46" y="${ey+47}" font-family="ui-monospace,Menlo,monospace" font-size="18" fill="${ac1}" text-anchor="middle">${icons[e.type]||'◇'}</text>`;
    const [line1, line2] = desc(e);
    o += T(76, ey+30, line1.slice(0,42), 13, col, 600);
    o += T(76, ey+50, line2.slice(0,42), 11, ac1);
    o += T(76, ey+66, timeAgo(e.created_at), 9, mut);
  });

  return svg(o, theme);
}

// ── 11. Spotlight repo ──
function slideSpotlight(repos, theme) {
  const dark = theme !== 'light';
  const col  = dark ? '#e8e8f0' : '#1a1a2e';
  const mut  = dark ? '#6b6b80' : '#57606a';
  const bg3  = dark ? '#1e1e2e' : '#eaeef2';
  const ac1  = '#7c6af7';
  const ac2  = '#2dd4bf';
  const gold = '#fbbf24';

  const r = shuffle(repos.filter(x => !x.fork && x.description))[0];
  if (!r) {
    return svg(T(W/2,H/2,'no repos with descriptions',11,mut,400,'middle'), theme);
  }

  let o = '';
  o += T(20, 38, r.name.slice(0,32), 18, ac1, 800);

  const lines = wrap(r.description, 55);
  lines.slice(0,3).forEach((l,i) => o += T(20, 62+i*16, l, 10, mut));

  const sy = 62 + Math.min(lines.length,3)*16 + 12;
  o += T(20,    sy, '★ '+r.stargazers_count, 12, gold, 700);
  o += T(90,    sy, '⑂ '+r.forks_count,      12, ac2,  700);
  if (r.open_issues_count !== undefined)
    o += T(155, sy, '◎ '+r.open_issues_count, 12, mut,  700);

  if (r.language) {
    o += `<circle cx="21" cy="${sy+16}" r="6" fill="${lc(r.language)}"/>`;
    o += T(32, sy+20, r.language, 10, mut);
  }

  if (r.topics && r.topics.length) {
    let tx = r.language ? 32+r.language.length*6+18 : 20;
    r.topics.slice(0,4).forEach(t => {
      const tw = t.length*5.8+16;
      if (tx+tw > W-14) return;
      o += `<rect x="${tx.toFixed(0)}" y="${sy+8}" width="${tw.toFixed(0)}" height="16" rx="5" fill="${bg3}"/>`;
      o += T(tx+8, sy+20, t.slice(0,12), 8, mut);
      tx += tw+5;
    });
  }

  return svg(o, theme);
}

// ── 12. Language list with bars ──
function slideLangList(repos, theme) {
  const dark = theme !== 'light';
  const col  = dark ? '#e8e8f0' : '#1a1a2e';
  const mut  = dark ? '#6b6b80' : '#57606a';
  const bg3  = dark ? '#1e1e2e' : '#eaeef2';

  const langMap = {};
  repos.forEach(r => { if(r.language) langMap[r.language]=(langMap[r.language]||0)+1; });
  const langs  = Object.entries(langMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const totalL = langs.reduce((s,[,v])=>s+v,0)||1;
  const maxV   = langs[0]?langs[0][1]:1;

  let o = '';
  langs.forEach(([l,n],i) => {
    const ly  = 16 + i*34;
    const pct = (n/totalL)*100;
    const bw  = ((n/maxV)*(W-160)).toFixed(1);
    o += `<circle cx="22" cy="${ly+12}" r="7" fill="${lc(l)}"/>`;
    o += T(36, ly+16, l, 11, col, 600);
    o += `<rect x="140" y="${ly+4}" width="${W-158}" height="14" rx="7" fill="${bg3}"/>`;
    o += `<rect x="140" y="${ly+4}" width="${bw}" height="14" rx="7" fill="${lc(l)}" opacity="0.85"/>`;
    o += T(W-12, ly+16, pct.toFixed(1)+'%', 9, mut, 500, 'end');
  });

  return svg(o, theme);
}

// ════════════════════════════════════════════
//  SLIDE PICKER  —  10-min bucket rotation
// ════════════════════════════════════════════
function pickSlide(user, repos, events, theme, overrideIdx) {
  const bucket = Math.floor(Date.now() / (10*60*1000));

  const SLIDES = [
    () => slideBio(user, theme),
    () => slideStatRepos(user, theme),
    () => slideStatStars(repos, theme),
    () => slideStatFollowers(user, theme),
    () => slideStatFollowing(user, theme),
    () => slideLangBar(repos, theme),
    () => slideTopRepos(repos, theme),
    () => slideHeatmap(events, theme),
    () => slideCommits(events, theme),
    () => slideEvents(events, theme),
    () => slideSpotlight(repos, theme),
    () => slideLangList(repos, theme),
  ];

  const idx = (overrideIdx !== undefined && overrideIdx >= 0 && overrideIdx < SLIDES.length)
    ? overrideIdx
    : bucket % SLIDES.length;
  return SLIDES[idx]();
}

// ════════════════════════════════════════════
//  VERCEL HANDLER
// ════════════════════════════════════════════
module.exports = async function handler(req, res) {
  const q        = req.query||{};
  const username = q.user  || null;
  const theme    = q.theme || 'dark';

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Access-Control-Allow-Origin', '*');

  function errSVG(msg) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="80" viewBox="0 0 ${W} 80">`
      +`<rect width="${W}" height="80" rx="10" fill="#0d0d14" stroke="rgba(255,255,255,.08)" stroke-width="1"/>`
      +`<text x="16" y="28" font-family="monospace" font-size="11" fill="#f472b6" font-weight="600">gh-card error</text>`
      +`<text x="16" y="46" font-family="monospace" font-size="9" fill="#6b6b80">${esc(String(msg).slice(0,68))}</text>`
      +`<text x="16" y="62" font-family="monospace" font-size="8" fill="#3d2fa0">set GITHUB_TOKEN env var to raise rate limit</text>`
      +`</svg>`;
  }

  if (!username) return res.status(200).send(errSVG('Missing ?user= query param'));

  const token = process.env.GITHUB_TOKEN || '';
  try {
    const base = 'https://api.github.com';
    const [user, repos, events] = await Promise.all([
      fetchGH(`${base}/users/${username}`, token),
      fetchGH(`${base}/users/${username}/repos?sort=updated&per_page=100`, token),
      fetchGH(`${base}/users/${username}/events/public?per_page=100`, token),
    ]);
    const slideParam = q._slide !== undefined ? parseInt(q._slide, 10) : undefined;
    const svgOut = pickSlide(user, repos, events, theme, slideParam);
    // only cache for 10min when no override (real embed); no-cache for preview
    const cacheHeader = slideParam !== undefined
      ? 'no-cache'
      : 's-maxage=600, stale-while-revalidate=60';
    res.setHeader('Cache-Control', cacheHeader);
    return res.status(200).send(svgOut);
  } catch(err) {
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(errSVG(err.message));
  }
};
