const ALL_SLIDES = [
  { id:'repos',     label:'public repos' },
  { id:'stars',     label:'total stars' },
  { id:'followers', label:'followers' },
  { id:'following', label:'following' },
  { id:'langbar',   label:'language bar' },
  { id:'toprepos',  label:'top repos' },
  { id:'commits',   label:'random commits' },
  { id:'events',    label:'recent events' },
  { id:'spotlight', label:'spotlight repo' },
  { id:'langlist',  label:'language list' },
  { id:'forked',    label:'most forked' },
  { id:'avgstars',  label:'avg stars' },
  { id:'age',       label:'account age' },
  { id:'forks',     label:'total forks' },
  { id:'issues',    label:'open issues' },
  { id:'latestissues', label:'latest issues' },
  { id:'closedissues', label:'closed issues' },
];

// two independent enabled sets
const enabled1 = new Set(ALL_SLIDES.map(s => s.id));
const enabled2 = new Set(ALL_SLIDES.map(s => s.id));
let previewSlideIdx = 0;

// ── build sidebar slide list ──
const listEl = document.getElementById('slide-list');
ALL_SLIDES.forEach((s, i) => {
  const row = document.createElement('div');
  row.className = 'slide-row';
  row.id = 'row-' + s.id;
  row.innerHTML =
    `<span class="slide-idx">${i}</span>`
    + `<span class="slide-label" id="lbl-${s.id}">${s.label}</span>`
    + `<label class="toggle slide-toggle" onclick="event.stopPropagation();">`
    +   `<input type="checkbox" id="chk1-${s.id}" checked onchange="onToggle(1,'${s.id}')">`
    +   `<span class="toggle-track"></span>`
    +   `<span class="toggle-thumb"></span>`
    + `</label>`
    + `<label class="toggle slide-toggle" onclick="event.stopPropagation();">`
    +   `<input type="checkbox" id="chk2-${s.id}" checked onchange="onToggle(2,'${s.id}')">`
    +   `<span class="toggle-track"></span>`
    +   `<span class="toggle-thumb"></span>`
    + `</label>`;
  row.addEventListener('click', e => {
    if (e.target.tagName === 'INPUT') return;
    previewSlide(s.id);
  });
  listEl.appendChild(row);
});

function getSet(n) { return n === 1 ? enabled1 : enabled2; }

function updateCount() {
  document.getElementById('enabled-count').textContent = '(1: ' + enabled1.size + ' / 2: ' + enabled2.size + ')';
}
updateCount();

function onToggle(badge, id) {
  const chk = document.getElementById('chk' + badge + '-' + id);
  const set = getSet(badge);
  if (chk.checked) set.add(id); else set.delete(id);
  updateCount();
  updateSnippets();
}

let allOn = true;
function toggleAll() {
  allOn = !allOn;
  ALL_SLIDES.forEach(s => {
    [1, 2].forEach(b => {
      const chk = document.getElementById('chk' + b + '-' + s.id);
      chk.checked = allOn;
      if (allOn) getSet(b).add(s.id); else getSet(b).delete(s.id);
    });
  });
  updateCount();
  updateSnippets();
}

// ── highlight active preview row ──
function setActiveRow(id) {
  document.querySelectorAll('.slide-row').forEach(r => r.classList.remove('active-preview'));
  const row = document.getElementById('row-' + id);
  if (row) { row.classList.add('active-preview'); row.scrollIntoView({ block:'nearest' }); }
  const s = ALL_SLIDES.find(x => x.id === id);
  document.getElementById('current-slide-name').textContent = s ? s.label : '—';
}

// ── URL builders ──
function getEnabledIds(badge) {
  const set = badge ? getSet(badge) : enabled1;
  return ALL_SLIDES.filter(s => set.has(s.id)).map(s => s.id);
}

function cardUrl({ slideIdx, preview, badge } = {}) {
  const u = document.getElementById('uname').value.trim();
  if (!u) return null;
  let url = `/api/card?user=${encodeURIComponent(u)}`;
  const ids = getEnabledIds(badge || 1);
  if (ids.length && ids.length < ALL_SLIDES.length) url += '&slides=' + ids.join(',');
  if (preview && slideIdx !== undefined) url += `&_slide=${slideIdx}&_t=${Date.now()}`;
  return url;
}

function buildEmbedUrl(badge) {
  const u = document.getElementById('uname').value.trim() || 'username';
  const base = location.origin;
  let url = `${base}/api/card?user=${u}`;
  const ids = getEnabledIds(badge);
  if (ids.length && ids.length < ALL_SLIDES.length) url += '&slides=' + ids.join(',');
  return url;
}

function updateSnippets() {
  [1, 2].forEach(b => {
    const url = buildEmbedUrl(b);
    document.getElementById('snip-md-' + b).textContent   = `![GitHub Stats](${url})`;
    document.getElementById('snip-html-' + b).textContent = `<img src="${url}" width="495" alt="GitHub Stats"/>`;
  });
}

function doLoad(url, slideId) {
  if (!url) return;
  const wrap = document.getElementById('preview-wrap');
  const img  = document.getElementById('img');
  wrap.classList.add('loading');
  img.onload  = () => wrap.classList.remove('loading');
  img.onerror = () => wrap.classList.remove('loading');
  img.src = url;
  if (slideId) setActiveRow(slideId);
  updateSnippets();
}

// load card without preview override (server picks current bucket)
function load() {
  const enabledList = getEnabledIds(1);
  if (!enabledList.length) return;
  const bucket = Math.floor(Date.now() / (10*60*1000));
  const idx = bucket % enabledList.length;
  previewSlideIdx = idx;
  const url = cardUrl({ slideIdx: idx, preview: true, badge: 1 });
  doLoad(url, enabledList[idx]);
}

// cycle to next slide
function refresh() {
  const enabledList = getEnabledIds(1);
  if (!enabledList.length) return;
  previewSlideIdx = (previewSlideIdx + 1) % enabledList.length;
  const url = cardUrl({ slideIdx: previewSlideIdx, preview: true, badge: 1 });
  doLoad(url, enabledList[previewSlideIdx]);
}

// preview a specific slide by id
function previewSlide(id) {
  if (!enabled1.has(id) && !enabled2.has(id)) return;
  const enabledList = getEnabledIds(1);
  const idx = enabledList.indexOf(id);
  if (idx < 0) return;
  previewSlideIdx = idx;
  const url = cardUrl({ slideIdx: idx, preview: true, badge: 1 });
  doLoad(url, id);
}

function doCopy(which) {
  const text = document.getElementById('snip-' + which).textContent;
  const btn  = document.getElementById('copy-' + which);
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = 'copied!'; btn.classList.add('ok');
    setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('ok'); }, 1800);
  });
}

document.getElementById('uname').addEventListener('keydown', e => { if(e.key==='Enter') load(); });

load();
