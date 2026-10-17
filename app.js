// Must match the order of slides/index.js (indices drive the rotation).
const ALL_SLIDES = [
  { id:'repos',        label:'public repos' },
  { id:'stars',        label:'total stars' },
  { id:'followers',    label:'followers' },
  { id:'following',    label:'following' },
  { id:'langbar',      label:'language bar' },
  { id:'toprepos',     label:'top repos' },
  { id:'commits',      label:'random commits' },
  { id:'events',       label:'recent events' },
  { id:'spotlight',    label:'spotlight repo' },
  { id:'langlist',     label:'language list' },
  { id:'forked',       label:'most forked' },
  { id:'avgstars',     label:'avg stars' },
  { id:'age',          label:'account age' },
  { id:'forks',        label:'total forks' },
  { id:'issues',       label:'open issues' },
  { id:'latestissues', label:'latest issues' },
  { id:'closedissues', label:'closed issues' },
  { id:'profile',      label:'profile card',    isNew:true },
  { id:'overview',     label:'stats overview',  isNew:true },
  { id:'activity',     label:'activity chart',  isNew:true },
  { id:'hours',        label:'active hours',    isNew:true },
  { id:'weekdays',     label:'active weekdays', isNew:true },
  { id:'langdonut',    label:'language donut',  isNew:true },
  { id:'topics',       label:'top topics',      isNew:true },
  { id:'recent',       label:'recently pushed', isNew:true },
  { id:'pullrequests', label:'pull requests',   isNew:true },
  { id:'contrib',      label:'contributions',   isNew:true },
  { id:'gists',        label:'public gists',    isNew:true },
];

// Must match lib/constants.js THEMES.
const THEMES = [
  { id:'dark',            label:'dark (transparent)',  scheme:'dark' },
  { id:'light',           label:'light (transparent)', scheme:'light' },
  { id:'github_dark',     label:'GitHub dark',         scheme:'dark' },
  { id:'github_light',    label:'GitHub light',        scheme:'light' },
  { id:'dracula',         label:'Dracula',             scheme:'dark' },
  { id:'nord',            label:'Nord',                scheme:'dark' },
  { id:'tokyonight',      label:'Tokyo Night',         scheme:'dark' },
  { id:'gruvbox',         label:'Gruvbox',             scheme:'dark' },
  { id:'onedark',         label:'One Dark',            scheme:'dark' },
  { id:'catppuccin',      label:'Catppuccin',          scheme:'dark' },
  { id:'solarized_light', label:'Solarized light',     scheme:'light' },
];

const BADGES = [1, 2];
const BUCKET_MS = 10 * 60 * 1000;
const enabled = { 1: new Set(ALL_SLIDES.map(s => s.id)), 2: new Set(ALL_SLIDES.map(s => s.id)) };
let previewId = null;

const $ = id => document.getElementById(id);

// ── controls ──
const themeSel = $('theme');
THEMES.forEach(t => {
  const opt = document.createElement('option');
  opt.value = t.id;
  opt.textContent = t.label;
  themeSel.appendChild(opt);
});

function getUser() { return $('uname').value.trim().replace(/^@/, ''); }
function getTheme() { return THEMES.find(t => t.id === themeSel.value) || THEMES[0]; }
function getTz() {
  const v = parseFloat($('tz').value);
  if (!Number.isFinite(v)) return 0;
  return Math.round(Math.min(Math.max(v, -12), 14) * 4) / 4;
}

// ── sidebar slide list ──
const listEl = $('slide-list');
ALL_SLIDES.forEach((s, i) => {
  const row = document.createElement('div');
  row.className = 'slide-row';
  row.id = 'row-' + s.id;
  row.innerHTML =
    `<span class="slide-idx">${i}</span>`
    + `<span class="slide-label" id="lbl-${s.id}">${s.label}${s.isNew ? ' <span class="new-tag">new</span>' : ''}</span>`
    + BADGES.map(b =>
      `<label class="toggle slide-toggle" onclick="event.stopPropagation();" title="include in embed ${b}">`
      +   `<input type="checkbox" id="chk${b}-${s.id}" checked onchange="onToggle(${b},'${s.id}')">`
      +   `<span class="toggle-track"></span>`
      +   `<span class="toggle-thumb"></span>`
      + `</label>`).join('');
  row.addEventListener('click', e => {
    if (e.target.tagName === 'INPUT') return;
    previewSlide(s.id);
  });
  listEl.appendChild(row);
});

function updateCount() {
  $('enabled-count').textContent = '(1: ' + enabled[1].size + ' / 2: ' + enabled[2].size + ')';
}

function onToggle(badge, id) {
  const chk = $('chk' + badge + '-' + id);
  if (chk.checked) enabled[badge].add(id); else enabled[badge].delete(id);
  updateCount();
  updateSnippets();
}

function toggleAll() {
  const allOn = BADGES.every(b => enabled[b].size === ALL_SLIDES.length);
  BADGES.forEach(b => {
    ALL_SLIDES.forEach(s => {
      $('chk' + b + '-' + s.id).checked = !allOn;
      if (allOn) enabled[b].delete(s.id); else enabled[b].add(s.id);
    });
  });
  updateCount();
  updateSnippets();
}

function setActiveRow(id) {
  document.querySelectorAll('.slide-row').forEach(r => r.classList.remove('active-preview'));
  const row = $('row-' + id);
  if (row) { row.classList.add('active-preview'); row.scrollIntoView({ block:'nearest' }); }
  const s = ALL_SLIDES.find(x => x.id === id);
  $('current-slide-name').textContent = s ? s.label : '—';
}

// ── URL builders ──
function getEnabledIds(badge) {
  return ALL_SLIDES.filter(s => enabled[badge].has(s.id)).map(s => s.id);
}

// The server shows every slide when the list is empty, so mirror that here.
function rotationIds(badge) {
  const ids = getEnabledIds(badge);
  return ids.length ? ids : ALL_SLIDES.map(s => s.id);
}

function styleParams(themeId) {
  let s = '';
  if (themeId && themeId !== 'dark') s += '&theme=' + themeId;
  const tz = getTz();
  if (tz) s += '&tz=' + tz;
  return s;
}

function embedUrl(badge, themeId) {
  const u = getUser() || 'username';
  let url = `${location.origin}/api/card?user=${encodeURIComponent(u)}&badge=${badge}`;
  const ids = getEnabledIds(badge);
  if (ids.length && ids.length < ALL_SLIDES.length) url += '&slides=' + ids.join(',');
  return url + styleParams(themeId);
}

function previewUrl(id) {
  const u = getUser();
  if (!u) return null;
  return `/api/card?user=${encodeURIComponent(u)}&slides=${id}&_slide=0${styleParams(getTheme().id)}&_t=${Date.now()}`;
}

function updateSnippets() {
  BADGES.forEach(b => {
    const url = embedUrl(b, getTheme().id);
    $('snip-md-' + b).textContent = `![GitHub Stats](${url})`;
    $('snip-html-' + b).textContent = `<img src="${url}" width="495" alt="GitHub Stats"/>`;
    $('snip-auto-' + b).textContent =
      `<picture><source media="(prefers-color-scheme: dark)" srcset="${embedUrl(b, 'dark')}"/>`
      + `<img src="${embedUrl(b, 'light')}" width="495" alt="GitHub Stats"/></picture>`;
  });
}

// ── preview ──
function showPreviewError(msg) {
  const box = $('preview-error');
  box.textContent = msg || '';
  box.hidden = !msg;
}

function previewSlide(id) {
  const url = previewUrl(id);
  if (!url) { showPreviewError('Enter a GitHub username first.'); return; }
  previewId = id;
  const wrap = $('preview-wrap');
  const img = $('img');
  wrap.classList.add('loading');
  wrap.classList.toggle('light', getTheme().scheme === 'light');
  showPreviewError('');
  img.onload = () => wrap.classList.remove('loading');
  img.onerror = () => {
    wrap.classList.remove('loading');
    showPreviewError('Could not load the card. The API may be unavailable, try again in a moment.');
  };
  img.src = url;
  setActiveRow(id);
  updateSnippets();
}

// show the slide embed 1 is rotating to right now
function load() {
  const ids = rotationIds(1);
  const idx = Math.floor(Date.now() / BUCKET_MS) % ids.length;
  previewSlide(ids[idx]);
}

// cycle to the next slide of embed 1
function refresh() {
  const ids = rotationIds(1);
  const idx = ids.indexOf(previewId);
  previewSlide(ids[(idx + 1) % ids.length]);
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      if (document.execCommand('copy')) resolve(); else reject(new Error('copy failed'));
    } catch (err) {
      reject(err);
    } finally {
      ta.remove();
    }
  });
}

function doCopy(which) {
  const text = $('snip-' + which).textContent;
  const btn = $('copy-' + which);
  copyText(text).then(
    () => { btn.textContent = 'copied!'; btn.classList.add('ok'); },
    () => { btn.textContent = 'select & copy'; },
  ).finally(() => {
    setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('ok'); }, 1800);
  });
}

$('uname').addEventListener('keydown', e => { if (e.key === 'Enter') load(); });
$('uname').addEventListener('input', updateSnippets);
themeSel.addEventListener('change', () => (previewId ? previewSlide(previewId) : load()));
$('tz').addEventListener('change', () => (previewId ? previewSlide(previewId) : load()));

updateCount();
updateSnippets();
load();
