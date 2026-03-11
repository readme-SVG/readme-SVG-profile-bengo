// ─────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
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
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur+' '+w).trim().length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur+' '+w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

async function fetchGH(url, token) {
  const headers = { 'Accept':'application/vnd.github+json','User-Agent':'gh-card/2.0' };
  if (token) headers['Authorization'] = 'Bearer '+token;
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error('GitHub '+r.status+' '+url.split('/').slice(-2).join('/'));
  return r.json();
}

// ─────────────────────────────────────────────
//  SVG FRAME  (shared chrome for every slide)
// ─────────────────────────────────────────────
function frame(slideContent, label, username, theme) {
  const dark = theme !== 'light';
  const bg   = dark ? '#0d0d14' : '#f6f8fa';
  const bg2  = dark ? '#13131d' : '#ffffff';
  const brd  = dark ? 'rgba(255,255,255,.09)' : '#d0d7de';
  const mut  = dark ? '#5a5a70' : '#8b949e';
  const ac1  = '#7c6af7';

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
    width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${ac1}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="transparent"/>
    </linearGradient>
    <clipPath id="av"><circle cx="16" cy="16" r="13"/></clipPath>
  </defs>

  <!-- background -->
  <rect width="${W}" height="${H}" rx="12" fill="${bg}" stroke="${brd}" stroke-width="1"/>
  <rect width="${W}" height="${H}" rx="12" fill="url(#g)"/>

  <!-- top bar -->
  <rect x="1" y="1" width="${W-2}" height="28" rx="11" fill="${bg2}" opacity="0.5"/>
  <line x1="1" y1="29" x2="${W-1}" y2="29" stroke="${brd}" stroke-width="0.5"/>

  <!-- github icon -->
  <text x="14" y="20" font-family="ui-monospace,Menlo,monospace" font-size="11" fill="${mut}">◆</text>

  <!-- username -->
  <text x="28" y="19" font-family="ui-monospace,Menlo,monospace" font-size="9"
    fill="${mut}" font-weight="500">${esc(username)}</text>

  <!-- slide label (right side) -->
  <text x="${W-12}" y="19" font-family="ui-monospace,Menlo,monospace" font-size="7.5"
    fill="${ac1}" font-weight="600" letter-spacing="0.8" text-anchor="end">${esc(label)}</text>

  <!-- content area: y=38 to y=178, x=18 to x=477 -->
  ${slideContent}

  <!-- bottom border line -->
  <line x1="1" y1="${H-22}" x2="${W-1}" y2="${H-22}" stroke="${brd}" stroke-width="0.5"/>
  <text x="14" y="${H-9}" font-family="ui-monospace,Menlo,monospace" font-size="7"
    fill="${mut}">github.com/${esc(username)}</text>
  <text x="${W-12}" y="${H-9}" font-family="ui-monospace,Menlo,monospace" font-size="7"
    fill="${mut}" text-anchor="end">gh-card · refreshes every 10m</text>

</svg>`;
}

// ─────────────────────────────────────────────
//  SLIDES
// ─────────────────────────────────────────────

// shared text helper (used inside slide functions)
function T(x,y,s,sz,fill,fw,anchor) {
  return `<text x="${x}" y="${y}" font-family="ui-monospace,Menlo,monospace" font-size="${sz||10}"
    fill="${fill||'#e8e8f0'}" font-weight="${fw||400}" text-anchor="${anchor||'start'}">${esc(s)}</text>`;
}

// SLIDE: bio + location
function slideBio(user, theme) {
  const dark = theme !== 'light';
  const col  = dark ? '#e8e8f0' : '#1a1a2e';
  const mut  = dark ? '#6b6b80' : '#57606a';
  const ac2  = '#2dd4bf';
  const ac1  = '#7c6af7';

  let o = '';
  // big avatar
  o += `<image href="${esc(user.avatar_url)}&amp;s=128" x="18" y="40" width="52" height="52" clip-path="url(#av2)"/>`;
  o += `<defs><clipPath id="av2"><circle cx="44" cy="66" r="26"/></clipPath></defs>`;
  o += `<circle cx="44" cy="66" r="26" fill="none" stroke="rgba(124,106,247,.35)" stroke-width="1.5"/>`;

  o += T(84, 57, (user.name||user.login).slice(0,24), 15, col, 700);
  o += T(84, 72, '@'+user.login, 9, ac1, 400);

  const bio = (user.bio||'').slice(0, 120);
  if (bio) {
    const lines = wrap(bio, 42);
    lines.slice(0,3).forEach((l, i) => {
      o += T(84, 88+i*14, l, 9, mut);
    });
  }
  if (user.location) o += T(84, bio ? 88+Math.min(wrap(bio,42).length,3)*14+4 : 88, '◎ '+user.location.slice(0,36), 8.5, ac2);
  if (user.blog)     o += T(84, bio ? 104+Math.min(wrap(bio,42).length,3)*14 : 100, '↗ '+user.blog.replace(/https?:\/\//,'').slice(0,34), 8, ac1);
  if (user.company)  o += T(84, 130, user.company.slice(0,34), 8, mut);

  return { content: o, label: 'PROFILE' };
}

// SLIDE: single big stat
function slideStat(label, value, sublabel, accent, username, theme) {
  const dark = theme !== 'light';
  const col  = dark ? '#e8e8f0' : '#1a1a2e';
  const mut  = dark ? '#6b6b80' : '#57606a';

  const cx = W/2, cy = 105;
  let o = '';
  // big glow circle
  o += `<circle cx="${cx}" cy="${cy}" r="55" fill="${accent}" opacity="0.06"/>`;
  o += `<circle cx="${cx}" cy="${cy}" r="38" fill="${accent}" opacity="0.05"/>`;
  // value
  o += `<text x="${cx}" y="${cy+10}" font-family="ui-monospace,Menlo,monospace" font-size="46"
    fill="${col}" font-weight="800" text-anchor="middle">${esc(String(value))}</text>`;
  // label below
  o += `<text x="${cx}" y="${cy+34}" font-family="ui-monospace,Menlo,monospace" font-size="10"
    fill="${accent}" font-weight="600" letter-spacing="1.5" text-anchor="middle">${esc(sublabel.toUpperCase())}</text>`;

  return { content: o, label };
}

// SLIDE: top repos
function slideTopRepos(repos, theme) {
  const dark = theme !== 'light';
  const col  = dark ? '#e8e8f0' : '#1a1a2e';
  const mut  = dark ? '#6b6b80' : '#57606a';
  const ac1  = '#7c6af7';
  const gold = '#fbbf24';
  const brd  = dark ? 'rgba(255,255,255,.06)' : '#e1e4e8';

  const top = [...repos].sort((a,b) => b.stargazers_count-a.stargazers_count).slice(0,3);
  let o = '';

  top.forEach((r, i) => {
    const ry = 42 + i*46;
    o += `<rect x="18" y="${ry}" width="${W-36}" height="38" rx="7" fill="${dark?'#13131d':'#ffffff'}" stroke="${brd}" stroke-width="1"/>`;
    // rank badge
    o += `<rect x="22" y="${ry+4}" width="16" height="14" rx="3" fill="${ac1}" opacity="0.15"/>`;
    o += T(25, ry+14, '#'+(i+1), 8, ac1, 700);
    // name
    o += T(44, ry+14, r.name.slice(0,28), 10, ac1, 600);
    // stars
    o += T(W-22, ry+14, '★ '+r.stargazers_count, 9, gold, 500, 'end');
    // desc
    const desc = (r.description||'no description').slice(0,52);
    o += T(44, ry+28, desc, 8, mut);
    // lang dot
    if (r.language) {
      o += `<circle cx="${W-60}" cy="${ry+24}" r="3.5" fill="${lc(r.language)}"/>`;
      o += T(W-54, ry+28, r.language, 7.5, mut);
    }
  });

  return { content: o, label: 'TOP REPOS' };
}

// SLIDE: language bar
function slideLangs(repos, theme) {
  const dark = theme !== 'light';
  const col  = dark ? '#e8e8f0' : '#1a1a2e';
  const mut  = dark ? '#6b6b80' : '#57606a';
  const bg3  = dark ? '#1a1a27' : '#eaeef2';

  const langMap = {};
  repos.forEach(r => { if(r.language) langMap[r.language]=(langMap[r.language]||0)+1; });
  const langs  = Object.entries(langMap).sort((a,b)=>b[1]-a[1]).slice(0,7);
  const totalL = langs.reduce((s,[,v])=>s+v,0)||1;

  const barX=18, barY=50, barW=W-36, barH=14;
  let o = '';

  // segmented bar
  o += `<rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="7" fill="${bg3}"/>`;
  let bxOff = barX;
  langs.forEach(([l,n], i) => {
    const w = (n/totalL)*barW;
    const rxL = i===0?7:0, rxR = i===langs.length-1?7:0;
    o += `<path d="M${(bxOff+rxL).toFixed(1)} ${barY} H${(bxOff+w-rxR).toFixed(1)} Q${(bxOff+w).toFixed(1)} ${barY} ${(bxOff+w).toFixed(1)} ${barY+7} V${barY+barH-7} Q${(bxOff+w).toFixed(1)} ${barY+barH} ${(bxOff+w-rxR).toFixed(1)} ${barY+barH} H${(bxOff+rxL).toFixed(1)} Q${bxOff.toFixed(1)} ${barY+barH} ${bxOff.toFixed(1)} ${barY+barH-7} V${barY+7} Q${bxOff.toFixed(1)} ${barY} ${(bxOff+rxL).toFixed(1)} ${barY}" fill="${lc(l)}"/>`;
    bxOff += w;
  });

  // legend grid  3 cols
  langs.forEach(([l,n], i) => {
    const col2 = i%3, row = Math.floor(i/3);
    const lx = 18 + col2*155;
    const ly = 82  + row*22;
    const pct = ((n/totalL)*100).toFixed(1);
    o += `<circle cx="${lx+6}" cy="${ly-5}" r="5" fill="${lc(l)}"/>`;
    o += T(lx+16, ly, l, 10, col, 600);
    o += T(lx+16, ly+12, pct+'%  ('+n+' repos)', 8, mut);
  });

  return { content: o, label: 'LANGUAGES' };
}

// SLIDE: heatmap
function slideHeatmap(events, theme) {
  const dark = theme !== 'light';
  const col  = dark ? '#e8e8f0' : '#1a1a2e';
  const mut  = dark ? '#6b6b80' : '#57606a';
  const bg3  = dark ? '#1a1a27' : '#eaeef2';

  const counts = {};
  events.forEach(e => {
    const d = e.created_at ? e.created_at.slice(0,10) : null;
    if (d) counts[d] = (counts[d]||0)+1;
  });
  const heatColor = n => {
    if (!n) return bg3;
    if (n<=1) return '#312a8a';
    if (n<=3) return '#5048c8';
    if (n<=6) return '#7c6af7';
    return '#a99cf9';
  };

  const WEEKS = 26, DAYS = 7;
  const cellW = 14, cellH = 10, gapW = 3, gapY = 3;
  const totalW = WEEKS*(cellW+gapW)-gapW;
  const startX = Math.floor((W-totalW)/2);
  const startY = 44;

  let o = '';
  const now = new Date();

  for (let w=0; w<WEEKS; w++) {
    for (let d=0; d<DAYS; d++) {
      const dt = new Date(now);
      dt.setDate(dt.getDate()-((WEEKS-1-w)*7+(DAYS-1-d)));
      const key = dt.toISOString().slice(0,10);
      const n = counts[key]||0;
      const x = startX + w*(cellW+gapW);
      const y = startY + d*(cellH+gapY);
      o += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="2.5" fill="${heatColor(n)}"/>`;
    }
  }

  // legend
  const legendY = startY + DAYS*(cellH+gapY) + 6;
  o += T(startX, legendY+9, 'less', 8, mut);
  [0,1,3,5,8].forEach((n,i) => {
    o += `<rect x="${startX+32+i*18}" y="${legendY}" width="${cellW}" height="${cellH}" rx="2.5" fill="${heatColor(n)}"/>`;
  });
  o += T(startX+32+5*18+2, legendY+9, 'more', 8, mut);

  const total = events.length;
  const days  = Object.keys(counts).length;
  o += T(W-18, legendY+9, total+' events · '+days+' active days', 8, mut, 400, 'end');

  return { content: o, label: 'ACTIVITY' };
}

// SLIDE: 2 random commits
function slideCommits(events, theme) {
  const dark = theme !== 'light';
  const col  = dark ? '#e8e8f0' : '#1a1a2e';
  const mut  = dark ? '#6b6b80' : '#57606a';
  const ac3  = '#f472b6';
  const brd  = dark ? 'rgba(255,255,255,.06)' : '#e1e4e8';

  const allCommits = [];
  events.forEach(e => {
    if (e.type==='PushEvent' && e.payload && e.payload.commits) {
      e.payload.commits.forEach(c => allCommits.push({
        sha:  (c.sha||'???????').slice(0,7),
        msg:  (c.message||'').split('\n')[0],
        repo: e.repo && e.repo.name ? e.repo.name.split('/').pop() : '?',
        time: e.created_at,
      }));
    }
  });

  const picks = shuffle(allCommits).slice(0,2);
  let o = '';

  if (!picks.length) {
    o += T(W/2, H/2, 'no recent commits found', 10, mut, 400, 'middle');
    return { content: o, label: 'COMMITS' };
  }

  picks.forEach((c, i) => {
    const cy = 44 + i*64;
    o += `<rect x="18" y="${cy}" width="${W-36}" height="56" rx="8" fill="${dark?'#13131d':'#fff'}" stroke="${brd}" stroke-width="1"/>`;
    // SHA badge
    o += `<rect x="26" y="${cy+8}" width="52" height="14" rx="4" fill="${ac3}" opacity="0.15"/>`;
    o += T(29, cy+19, c.sha, 8.5, ac3, 600);
    o += T(86, cy+19, timeAgo(c.time), 8, mut);
    // repo
    o += T(W-22, cy+19, c.repo, 8, mut, 400, 'end');
    // message
    const lines = wrap(c.msg, 58);
    lines.slice(0,2).forEach((l, li) => {
      o += T(26, cy+35+li*14, l, 9.5, col);
    });
  });

  return { content: o, label: 'COMMITS' };
}

// SLIDE: 2 recent events
function slideEvents(events, theme) {
  const dark = theme !== 'light';
  const col  = dark ? '#e8e8f0' : '#1a1a2e';
  const mut  = dark ? '#6b6b80' : '#57606a';
  const ac1  = '#7c6af7';
  const brd  = dark ? 'rgba(255,255,255,.06)' : '#e1e4e8';

  const icons = {
    PushEvent:'◈',CreateEvent:'✦',WatchEvent:'★',ForkEvent:'⑂',
    IssuesEvent:'◎',PullRequestEvent:'⇄',IssueCommentEvent:'◉',
    ReleaseEvent:'◆',DeleteEvent:'✕',
  };
  function desc(e) {
    const r = e.repo && e.repo.name ? e.repo.name.split('/').pop() : '';
    const p = e.payload||{};
    switch(e.type) {
      case 'PushEvent':         return ['pushed '+(p.commits?p.commits.length:0)+' commit(s)', 'to '+r];
      case 'CreateEvent':       return ['created '+(p.ref_type||'ref'), (p.ref||r)||''];
      case 'WatchEvent':        return ['starred', r];
      case 'ForkEvent':         return ['forked', r];
      case 'IssuesEvent':       return [(p.action||'opened')+' issue', 'in '+r];
      case 'PullRequestEvent':  return [(p.action||'opened')+' pull request', 'in '+r];
      case 'IssueCommentEvent': return ['left a comment', 'in '+r];
      case 'ReleaseEvent':      return ['released '+(p.release&&p.release.tag_name||''), 'in '+r];
      default:                  return [e.type.replace('Event',''), r];
    }
  }

  const picks = events.slice(0,2);
  let o = '';

  picks.forEach((e, i) => {
    const ey = 44 + i*64;
    o += `<rect x="18" y="${ey}" width="${W-36}" height="56" rx="8" fill="${dark?'#13131d':'#fff'}" stroke="${brd}" stroke-width="1"/>`;

    // icon circle
    o += `<circle cx="46" cy="${ey+28}" r="16" fill="${ac1}" opacity="0.1"/>`;
    o += `<text x="46" y="${ey+33}" font-family="ui-monospace,Menlo,monospace" font-size="14"
      fill="${ac1}" text-anchor="middle">${icons[e.type]||'◇'}</text>`;

    const [line1, line2] = desc(e);
    o += T(70, ey+22, line1.slice(0,45), 10.5, col, 600);
    o += T(70, ey+37, line2.slice(0,45), 9, mut);
    o += T(70, ey+50, timeAgo(e.created_at), 8, mut);
    o += T(W-22, ey+22, e.type.replace('Event',''), 8, ac1, 400, 'end');
  });

  return { content: o, label: 'EVENTS' };
}

// SLIDE: spotlight repo
function slideSpotlight(repos, theme) {
  const dark = theme !== 'light';
  const col  = dark ? '#e8e8f0' : '#1a1a2e';
  const mut  = dark ? '#6b6b80' : '#57606a';
  const ac1  = '#7c6af7';
  const ac2  = '#2dd4bf';
  const gold = '#fbbf24';
  const bg3  = dark ? '#1a1a27' : '#eaeef2';

  const candidates = shuffle(repos.filter(r => !r.fork && r.description));
  const r = candidates[0];
  if (!r) {
    let o = T(W/2, H/2, 'no repos with descriptions', 10, mut, 400, 'middle');
    return { content: o, label: 'SPOTLIGHT' };
  }

  let o = '';

  // repo name big
  o += T(18, 58, r.name.slice(0,32), 16, ac1, 700);

  // description wrapped
  const lines = wrap(r.description, 56);
  lines.slice(0,3).forEach((l, i) => {
    o += T(18, 78+i*15, l, 9.5, mut);
  });

  // stats row
  const statsY = 78 + Math.min(lines.length,3)*15 + 10;
  o += T(18,    statsY, '★ '+r.stargazers_count, 10, gold, 600);
  o += T(90,    statsY, '⑂ '+r.forks_count,      10, ac2,  600);
  if (r.open_issues_count !== undefined)
    o += T(160, statsY, '◎ '+r.open_issues_count+' issues', 9, mut);

  // language
  if (r.language) {
    o += `<circle cx="19" cy="${statsY+18}" r="5" fill="${lc(r.language)}"/>`;
    o += T(28, statsY+22, r.language, 9, mut);
  }

  // topics
  if (r.topics && r.topics.length) {
    let tx = r.language ? 28+r.language.length*6+12 : 18;
    r.topics.slice(0,4).forEach(t => {
      const tw = t.length*6+14;
      if (tx + tw > W-18) return;
      o += `<rect x="${tx}" y="${statsY+10}" width="${tw}" height="15" rx="5" fill="${bg3}"/>`;
      o += T(tx+7, statsY+21, t.slice(0,12), 7.5, mut);
      tx += tw+5;
    });
  }

  // updated
  if (r.pushed_at) {
    o += T(W-18, statsY, 'updated '+timeAgo(r.pushed_at), 8, mut, 400, 'end');
  }

  return { content: o, label: 'SPOTLIGHT' };
}

// SLIDE: languages list (alternative to bar)
function slideLangList(repos, theme) {
  const dark = theme !== 'light';
  const col  = dark ? '#e8e8f0' : '#1a1a2e';
  const mut  = dark ? '#6b6b80' : '#57606a';

  const langMap = {};
  repos.forEach(r => { if(r.language) langMap[r.language]=(langMap[r.language]||0)+1; });
  const langs  = Object.entries(langMap).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const totalL = langs.reduce((s,[,v])=>s+v,0)||1;
  const maxV   = langs[0] ? langs[0][1] : 1;

  let o = '';
  langs.forEach(([l,n], i) => {
    const ly    = 46 + i*22;
    const pct   = (n/totalL)*100;
    const barW  = ((n/maxV)*(W-130)).toFixed(1);

    o += `<circle cx="26" cy="${ly+5}" r="6" fill="${lc(l)}"/>`;
    o += T(38, ly+9, l, 10, col, 600);
    // track
    o += `<rect x="130" y="${ly}" width="${W-148}" height="12" rx="6" fill="${dark?'#1a1a27':'#eaeef2'}"/>`;
    // fill
    o += `<rect x="130" y="${ly}" width="${barW}" height="12" rx="6" fill="${lc(l)}" opacity="0.85"/>`;
    // pct label
    o += T(W-14, ly+9, pct.toFixed(1)+'%', 8, mut, 400, 'end');
  });

  return { content: o, label: 'LANG BREAKDOWN' };
}

// SLIDE: account overview
function slideOverview(user, repos, theme) {
  const dark = theme !== 'light';
  const col  = dark ? '#e8e8f0' : '#1a1a2e';
  const mut  = dark ? '#6b6b80' : '#57606a';
  const bg3  = dark ? '#1a1a27' : '#eaeef2';

  const totalStars = repos.reduce((s,r)=>s+r.stargazers_count,0);
  const totalForks = repos.reduce((s,r)=>s+r.forks_count,0);
  const langs = new Set(repos.map(r=>r.language).filter(Boolean)).size;

  const items = [
    { label:'Public repos',  value: user.public_repos,  color:'#7c6af7' },
    { label:'Total stars',   value: totalStars,          color:'#fbbf24' },
    { label:'Followers',     value: user.followers,      color:'#2dd4bf' },
    { label:'Following',     value: user.following,      color:'#f472b6' },
    { label:'Total forks',   value: totalForks,          color:'#fb923c' },
    { label:'Languages',     value: langs,               color:'#4ade80' },
  ];

  const cols = 3, rows = 2;
  const cw = (W-36)/cols, ch = 62;
  let o = '';

  items.forEach(({ label, value, color }, i) => {
    const col2 = i%cols, row = Math.floor(i/cols);
    const ix = 18 + col2*cw, iy = 42 + row*ch;
    o += `<rect x="${ix}" y="${iy}" width="${cw-6}" height="${ch-8}" rx="8" fill="${dark?'#13131d':'#fff'}" stroke="${dark?'rgba(255,255,255,.06)':'#e1e4e8'}" stroke-width="1"/>`;
    o += `<rect x="${ix}" y="${iy}" width="3" height="${ch-8}" rx="2" fill="${color}"/>`;
    o += T(ix+12, iy+22, String(value), 18, col, 800);
    o += T(ix+12, iy+38, label, 8, mut);
  });

  return { content: o, label: 'OVERVIEW' };
}

// ─────────────────────────────────────────────
//  SLIDE PICKER  — deterministic per 10-min window
// ─────────────────────────────────────────────
function pickSlide(user, repos, events, theme) {
  // 10-minute bucket  →  rotate through slide types
  const bucket = Math.floor(Date.now() / (10 * 60 * 1000));

  const SLIDES = [
    () => slideBio(user, theme),
    () => slideStat('REPOS',     user.public_repos,                                 'public repositories', '#7c6af7', user.login, theme),
    () => slideStat('STARS',     repos.reduce((s,r)=>s+r.stargazers_count,0),       'total stars earned',  '#fbbf24', user.login, theme),
    () => slideStat('FOLLOWERS', user.followers,                                    'followers',            '#2dd4bf', user.login, theme),
    () => slideStat('FOLLOWING', user.following,                                    'following',            '#f472b6', user.login, theme),
    () => slideLangs(repos, theme),
    () => slideTopRepos(repos, theme),
    () => slideHeatmap(events, theme),
    () => slideCommits(events, theme),
    () => slideEvents(events, theme),
    () => slideSpotlight(repos, theme),
    () => slideLangList(repos, theme),
    () => slideOverview(user, repos, theme),
  ];

  const idx = bucket % SLIDES.length;
  return SLIDES[idx]();
}

// ─────────────────────────────────────────────
//  VERCEL HANDLER
// ─────────────────────────────────────────────
module.exports = async function handler(req, res) {
  const q        = req.query || {};
  const username = q.user  || null;
  const theme    = q.theme || 'dark';

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Access-Control-Allow-Origin', '*');

  function errSVG(msg) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="80" viewBox="0 0 ${W} 80">
      <rect width="${W}" height="80" rx="10" fill="#0d0d14" stroke="rgba(255,255,255,.08)" stroke-width="1"/>
      <text x="16" y="28" font-family="monospace" font-size="11" fill="#f472b6" font-weight="600">gh-card error</text>
      <text x="16" y="46" font-family="monospace" font-size="9" fill="#6b6b80">${esc(String(msg).slice(0,70))}</text>
      <text x="16" y="62" font-family="monospace" font-size="8" fill="#3d2fa0">hint: add GITHUB_TOKEN env var to avoid rate limits</text>
    </svg>`;
  }

  if (!username) {
    return res.status(200).send(errSVG('Missing ?user= query param'));
  }

  const token = process.env.GITHUB_TOKEN || '';

  try {
    const base = 'https://api.github.com';
    const [user, repos, events] = await Promise.all([
      fetchGH(`${base}/users/${username}`, token),
      fetchGH(`${base}/users/${username}/repos?sort=updated&per_page=100`, token),
      fetchGH(`${base}/users/${username}/events/public?per_page=100`, token),
    ]);

    const { content, label } = pickSlide(user, repos, events, theme);
    const svg = frame(content, label, user.login, theme);

    // cache exactly 10 min  →  next request after expiry picks next slide
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=60');
    return res.status(200).send(svg);

  } catch (err) {
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(errSVG(err.message));
  }
};
