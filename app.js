// Preview and embed builder for gh-card.
//
// The UI owns no configuration: slide ids, categories, themes, badge columns
// and rotation timing all come from GET /api/catalog, which is derived from the
// server's slide registry and theme palette. Adding a slide or a theme on the
// server therefore shows up here without a single frontend change.
//
// All state lives inside this IIFE; behaviour is attached with event listeners
// and delegation rather than inline handlers, and user-supplied strings are
// always written with textContent (never interpolated into innerHTML).

(() => {
  'use strict';

  const CATALOG_ENDPOINT = '/api/catalog';
  const STORAGE_KEY = 'gh-card:config:v2';
  const URL_KEYS = ['u', 'theme', 'tz', 'interval', 'pin', 's1', 's2', 'c'];
  const $ = id => document.getElementById(id);

  const state = {
    catalog: null,
    initialized: false,
    slides: [],
    byId: new Map(),
    categories: [],
    themes: [],
    themeById: new Map(),
    badges: [1, 2],
    maxBadges: 8,
    defaultTheme: 'dark',
    defaultInterval: 10,
    minInterval: 1,
    maxInterval: 60,
    rotationMs: 600000,
    enabled: {},
    collapsed: new Set(),
    filter: '',
    previewId: null,
    pinnedId: '',
    previewToken: 0,
  };

  // Embed snippet definitions. `build` receives a URL factory so the
  // auto light/dark variant can request two different themes.
  const SNIPPETS = [
    {
      key: 'md',
      label: 'Markdown',
      note: 'Paste into your README.md',
      build: urlFor => `![GitHub Stats](${urlFor(getThemeId())})`,
    },
    {
      key: 'html',
      label: 'HTML',
      note: 'Explicit display width',
      build: urlFor => `<img src="${urlFor(getThemeId())}" width="495" alt="GitHub Stats"/>`,
    },
    {
      key: 'auto',
      label: 'HTML (auto light / dark)',
      note: "Follows the viewer's GitHub color mode",
      build: urlFor => '<picture>'
        + `<source media="(prefers-color-scheme: dark)" srcset="${urlFor('dark')}"/>`
        + `<img src="${urlFor('light')}" width="495" alt="GitHub Stats"/>`
        + '</picture>',
    },
  ];

  let statusTimer = null;
  let previewTimer = null;
  let eventsWired = false;

  // ── small helpers ─────────────────────────────────────────────────────────

  const clampTz = v => (Number.isFinite(v) ? Math.round(Math.min(Math.max(v, -12), 14) * 4) / 4 : 0);
  const clampInterval = v => (Number.isFinite(v)
    ? Math.round(Math.min(Math.max(v, state.minInterval), state.maxInterval))
    : state.defaultInterval);
  const safeId = v => (/^[a-z0-9_]+$/.test(String(v)) ? String(v) : '');

  function getUser() { return $('uname').value.trim().replace(/^@/, ''); }
  function getTz() { return clampTz(Number.parseFloat($('tz').value)); }
  function getInterval() { return clampInterval(Number.parseFloat($('interval').value)); }
  function getThemeId() {
    const value = $('theme').value;
    return state.themeById.has(value) ? value : state.defaultTheme;
  }
  function getTheme() { return state.themeById.get(getThemeId()) || { id: state.defaultTheme, scheme: 'dark' }; }
  function getEnabledIds(badge) {
    return state.slides.filter(s => state.enabled[badge].has(s.id)).map(s => s.id);
  }
  // The server shows every slide when the list is empty, so mirror that here.
  function rotationIds(badge) {
    const ids = getEnabledIds(badge);
    return ids.length ? ids : state.slides.map(s => s.id);
  }

  function setStatus(message, ok = false) {
    const el = $('status');
    el.textContent = message || '';
    el.classList.toggle('ok', !!ok && !!message);
    clearTimeout(statusTimer);
    if (message) statusTimer = setTimeout(() => {
      el.textContent = '';
      el.classList.remove('ok');
    }, 2600);
  }

  function showPreviewError(message) {
    const box = $('preview-error');
    box.textContent = message || '';
    box.hidden = !message;
  }

  // ── configuration persistence ─────────────────────────────────────────────

  function defaults() {
    return {
      user: 'OstinUA', theme: state.defaultTheme, tz: 0,
      interval: state.defaultInterval, pin: '',
      enabled: Object.fromEntries(state.badges.map(b => [b, state.slides.map(s => s.id)])),
      collapsed: [],
    };
  }

  function readStored() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  // A shareable URL always wins over localStorage, but only the keys it
  // actually contains are overridden, so partial links remain usable.
  function readUrl() {
    let params;
    try { params = new URLSearchParams(location.search); } catch (_) { return null; }
    if (!URL_KEYS.some(k => params.has(k))) return null;
    const out = { enabled: {} };
    if (params.has('u')) out.user = params.get('u');
    if (params.has('theme')) out.theme = params.get('theme');
    if (params.has('tz')) out.tz = params.get('tz');
    if (params.has('interval')) out.interval = params.get('interval');
    if (params.has('pin')) out.pin = params.get('pin');
    state.badges.forEach(b => {
      if (params.has(`s${b}`)) out.enabled[b] = (params.get(`s${b}`) || '').split(',').filter(Boolean);
    });
    if (params.has('c')) out.collapsed = (params.get('c') || '').split(',').filter(Boolean);
    return out;
  }

  function normalize(raw) {
    const d = defaults();
    const s = raw && typeof raw === 'object' ? raw : {};
    const out = { ...d, enabled: {}, collapsed: [] };
    if (typeof s.user === 'string') out.user = s.user.replace(/^@/, '').trim().slice(0, 60) || d.user;
    if (typeof s.theme === 'string' && state.themeById.has(s.theme)) out.theme = s.theme;
    out.tz = clampTz(Number(s.tz));
    out.interval = clampInterval(Number(s.interval));
    if (typeof s.pin === 'string' && state.byId.has(s.pin)) out.pin = s.pin;
    state.badges.forEach(b => {
      const list = s.enabled && s.enabled[b];
      out.enabled[b] = Array.isArray(list) ? list.filter(id => state.byId.has(id)) : d.enabled[b];
    });
    if (Array.isArray(s.collapsed)) {
      out.collapsed = s.collapsed.filter(id => state.categories.some(c => c.id === id));
    }
    return out;
  }

  function applySnapshot(snap) {
    $('uname').value = snap.user;
    $('theme').value = snap.theme;
    $('tz').value = String(snap.tz);
    $('interval').value = String(snap.interval);
    state.badges.forEach(b => { state.enabled[b] = new Set(snap.enabled[b]); });
    state.collapsed = new Set(snap.collapsed);
    state.pinnedId = snap.pin;
    $('pin').checked = !!snap.pin;
    updatePinNote();
  }

  function snapshot() {
    return {
      user: getUser(),
      theme: getThemeId(),
      tz: getTz(),
      interval: getInterval(),
      pin: $('pin').checked ? state.pinnedId : '',
      enabled: Object.fromEntries(state.badges.map(b => [b, getEnabledIds(b)])),
      collapsed: [...state.collapsed],
    };
  }

  function syncUrl() {
    const snap = snapshot();
    const d = defaults();
    const params = new URLSearchParams();
    if (snap.user !== d.user) params.set('u', snap.user);
    if (snap.theme !== d.theme) params.set('theme', snap.theme);
    if (snap.tz !== d.tz) params.set('tz', String(snap.tz));
    if (snap.interval !== d.interval) params.set('interval', String(snap.interval));
    if (snap.pin) params.set('pin', snap.pin);
    state.badges.forEach(b => {
      if (snap.enabled[b].length !== state.slides.length) params.set(`s${b}`, snap.enabled[b].join(','));
    });
    if (snap.collapsed.length) params.set('c', snap.collapsed.join(','));
    const query = params.toString();
    try { history.replaceState(null, '', query ? `${location.pathname}?${query}` : location.pathname); } catch (_) {
      // replaceState is unavailable in a few embedded contexts; persistence
      // via localStorage still works, so this is non-fatal.
    }
  }

  function saveConfig() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot())); } catch (_) {
      // Storage may be disabled by the browser; the tool remains usable.
    }
    syncUrl();
  }

  function commit() {
    updateSnippets();
    saveConfig();
  }

  // ── URL builders ──────────────────────────────────────────────────────────

  function styleParams(themeId) {
    let out = '';
    if (themeId && themeId !== state.defaultTheme) out += `&theme=${encodeURIComponent(themeId)}`;
    const tz = getTz();
    if (tz) out += `&tz=${tz}`;
    const interval = getInterval();
    if (interval !== state.defaultInterval) out += `&interval=${interval}`;
    return out;
  }

  function embedUrl(badge, themeId) {
    const user = getUser() || 'username';
    let url = `${location.origin}/api/card?user=${encodeURIComponent(user)}&badge=${badge}`;
    if ($('pin').checked && state.pinnedId) {
      url += `&slide=${encodeURIComponent(state.pinnedId)}`;
    } else {
      const ids = getEnabledIds(badge);
      if (ids.length && ids.length < state.slides.length) url += `&slides=${ids.join(',')}`;
    }
    return url + styleParams(themeId);
  }

  function previewUrl(id) {
    const user = getUser();
    if (!user || !id) return null;
    return `/api/card?user=${encodeURIComponent(user)}&slides=${encodeURIComponent(id)}`
      + `&_slide=0${styleParams(getThemeId())}&_t=${Date.now()}`;
  }

  // ── UI construction ───────────────────────────────────────────────────────

  function buildThemeSelect() {
    const select = $('theme');
    select.replaceChildren();
    ['dark', 'light'].forEach(scheme => {
      const group = document.createElement('optgroup');
      group.label = scheme === 'dark' ? 'Dark themes' : 'Light themes';
      state.themes.filter(t => t.scheme === scheme).forEach(theme => {
        const option = document.createElement('option');
        option.value = theme.id;
        option.textContent = theme.label;
        group.appendChild(option);
      });
      if (group.childElementCount) select.appendChild(group);
    });
  }

  function buildEmbedBoxes() {
    const host = $('embed-boxes');
    host.replaceChildren();
    state.badges.forEach(badge => {
      const box = document.createElement('div');
      box.className = 'box';

      const header = document.createElement('div');
      header.className = 'box-header';
      const title = document.createElement('span');
      title.textContent = `Embed in README ${badge}`;
      const sub = document.createElement('span');
      sub.className = 'box-sub';
      sub.textContent = `badge=${badge}`;
      header.append(title, sub);

      const body = document.createElement('div');
      body.className = 'box-body';
      SNIPPETS.forEach((snippet, i) => {
        if (i) {
          const spacer = document.createElement('div');
          spacer.style.marginTop = '12px';
          body.appendChild(spacer);
        }
        const label = document.createElement('div');
        label.className = 'field-label';
        label.textContent = snippet.label;
        const note = document.createElement('div');
        note.className = 'field-note';
        note.textContent = snippet.note;

        const wrap = document.createElement('div');
        wrap.className = 'snippet-wrap';
        const code = document.createElement('div');
        code.className = 'code-block';
        code.id = `snip-${snippet.key}-${badge}`;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'copy-btn';
        button.id = `copy-${snippet.key}-${badge}`;
        button.dataset.copy = `${snippet.key}-${badge}`;
        button.textContent = 'copy';
        button.setAttribute('aria-label', `Copy ${snippet.label} snippet for embed ${badge}`);
        wrap.append(code, button);
        body.append(label, note, wrap);
      });

      box.append(header, body);
      host.appendChild(box);
    });
  }

  function buildParamsTable() {
    const themeList = state.themes
      .map(t => `<code class="inline">${safeId(t.id)}</code>`)
      .join(', ');
    const rows = [
      ['?user=', 'GitHub username — <strong>required</strong>. A leading <code class="inline">@</code> is ignored.'],
      ['&slides=', `Comma-separated slide ids, e.g. <code class="inline">repos,stars,commits</code>. ${state.slides.length} slides in ${state.categories.length} categories.`],
      ['&slide=', 'Pin a single slide by id (no rotation), e.g. <code class="inline">langdonut</code>.'],
      ['&theme=', `${themeList}. Default: <code class="inline">${safeId(state.defaultTheme)}</code>. Unknown names fall back to the default.`],
      ['&badge=', `1–${state.maxBadges}. Each badge starts at a different point of the rotation, so several cards on one page never repeat.`],
      ['&interval=', `Rotation period in minutes (${state.minInterval}–${state.maxInterval}), default ${state.defaultInterval}. Also sets the CDN cache lifetime.`],
      ['&tz=', 'UTC offset in hours for the activity time charts, e.g. <code class="inline">3</code> or <code class="inline">-5</code>.'],
      ['&_slide=', 'Preview index override (debug / UI preview). Disables caching and shows exact errors.'],
      ['/api/catalog', 'GET a JSON catalog of slides, categories, themes and defaults — <a href="/api/catalog">open ↗</a>.'],
    ];
    const body = $('param-body');
    body.replaceChildren();
    rows.forEach(([key, description]) => {
      const tr = document.createElement('tr');
      const keyCell = document.createElement('td');
      keyCell.textContent = key;
      const valueCell = document.createElement('td');
      // Static, server-derived strings only — no user input reaches innerHTML.
      valueCell.innerHTML = description;
      tr.append(keyCell, valueCell);
      body.appendChild(tr);
    });
    $('param-summary').textContent = `${state.slides.length} slides · ${state.themes.length} themes · ${state.categories.length} categories`;
  }

  function makeToggle(badge, id, label) {
    const wrapper = document.createElement('label');
    wrapper.className = 'toggle slide-toggle';
    wrapper.title = `Include ${label} in embed ${badge}`;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `chk${badge}-${id}`;
    input.dataset.slideToggle = id;
    input.dataset.badge = String(badge);
    input.checked = state.enabled[badge].has(id);
    input.setAttribute('aria-label', wrapper.title);
    const track = document.createElement('span');
    track.className = 'toggle-track';
    const thumb = document.createElement('span');
    thumb.className = 'toggle-thumb';
    wrapper.append(input, track, thumb);
    return wrapper;
  }

  function makeSlideRow(slide) {
    const row = document.createElement('div');
    row.className = 'slide-row';
    row.id = `row-${slide.id}`;
    row.dataset.slide = slide.id;
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-label', `Preview ${slide.label}`);

    const index = document.createElement('span');
    index.className = 'slide-idx';
    index.textContent = String(slide.index).padStart(2, '0');
    const label = document.createElement('span');
    label.className = 'slide-label';
    label.textContent = slide.label;
    label.title = `id: ${slide.id}`;

    row.append(index, label);
    state.badges.forEach(b => row.appendChild(makeToggle(b, slide.id, slide.label)));
    return row;
  }

  function matchesFilter(slide, category, query) {
    if (!query) return true;
    return `${slide.label} ${slide.id} ${category.label}`.toLowerCase().includes(query);
  }

  function renderSlideList() {
    const host = $('slide-groups');
    host.replaceChildren();
    const query = state.filter.trim().toLowerCase();
    let shown = 0;

    state.categories.forEach(category => {
      const slides = state.slides.filter(s => s.category === category.id && matchesFilter(s, category, query));
      if (!slides.length) return;
      shown += slides.length;
      const collapsed = state.collapsed.has(category.id);

      const section = document.createElement('section');
      section.className = `cat${collapsed ? ' collapsed' : ''}`;
      section.dataset.category = category.id;

      const header = document.createElement('div');
      header.className = 'cat-header';
      const chevron = document.createElement('button');
      chevron.type = 'button';
      chevron.className = 'cat-chevron';
      chevron.textContent = '▾';
      chevron.dataset.collapse = category.id;
      chevron.setAttribute('aria-expanded', String(!collapsed));
      chevron.setAttribute('aria-label', `${collapsed ? 'Expand' : 'Collapse'} ${category.label}`);

      const title = document.createElement('button');
      title.type = 'button';
      title.className = 'cat-name';
      title.dataset.collapse = category.id;
      title.title = category.hint;
      const name = document.createElement('span');
      name.textContent = category.label;
      const count = document.createElement('span');
      count.className = 'cat-count';
      count.textContent = String(slides.length);
      title.append(name, count);

      header.append(chevron, title);
      state.badges.forEach(b => {
        const label = document.createElement('label');
        label.className = 'cat-toggle';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.dataset.categoryToggle = category.id;
        input.dataset.badge = String(b);
        const caption = `Toggle all ${category.label} slides for embed ${b}`;
        input.title = caption;
        input.setAttribute('aria-label', caption);
        label.appendChild(input);
        header.appendChild(label);
      });

      const body = document.createElement('div');
      body.className = 'cat-body';
      body.hidden = collapsed;
      slides.forEach(slide => body.appendChild(makeSlideRow(slide)));

      section.append(header, body);
      host.appendChild(section);
    });

    $('no-matches').hidden = shown > 0;
    $('filter-count').textContent = query ? `${shown} shown` : '';
    refreshCategoryCheckboxes();
    updateCount();
    if (state.previewId) setActiveRow(state.previewId);
  }

  function syncSlideCheckboxes() {
    document.querySelectorAll('[data-slide-toggle]').forEach(input => {
      input.checked = state.enabled[input.dataset.badge].has(input.dataset.slideToggle);
    });
  }

  function refreshCategoryCheckboxes() {
    document.querySelectorAll('[data-category-toggle]').forEach(input => {
      const ids = state.slides.filter(s => s.category === input.dataset.categoryToggle).map(s => s.id);
      const set = state.enabled[input.dataset.badge];
      const selected = ids.filter(id => set.has(id)).length;
      input.checked = ids.length > 0 && selected === ids.length;
      input.indeterminate = selected > 0 && selected < ids.length;
    });
  }

  function updateCount() {
    const summary = state.badges.map(b => `${b}: ${state.enabled[b].size}`).join(' / ');
    const empty = state.badges.filter(b => state.enabled[b].size === 0);
    $('enabled-count').textContent = `(${summary})${empty.length ? ' · all slides used' : ''}`;
  }

  function updatePinNote() {
    const slide = state.byId.get(state.pinnedId);
    $('pin-note').textContent = $('pin').checked && slide ? `pinned: ${slide.label}` : '';
  }

  function setActiveRow(id) {
    document.querySelectorAll('.slide-row').forEach(row => {
      const active = row.dataset.slide === id;
      row.classList.toggle('active-preview', active);
      if (active) row.setAttribute('aria-current', 'true');
      else row.removeAttribute('aria-current');
    });
    const row = $(`row-${id}`);
    if (row && typeof row.scrollIntoView === 'function') row.scrollIntoView({ block: 'nearest' });
    const slide = state.byId.get(id);
    $('current-slide-name').textContent = slide ? slide.label : '—';
  }

  // ── preview ───────────────────────────────────────────────────────────────

  function updateSnippets() {
    state.badges.forEach(badge => {
      const urlFor = themeId => embedUrl(badge, themeId);
      SNIPPETS.forEach(snippet => {
        const target = $(`snip-${snippet.key}-${badge}`);
        if (target) target.textContent = snippet.build(urlFor);
      });
    });
  }

  function previewSlide(id) {
    if (!state.byId.has(id)) return;
    const url = previewUrl(id);
    if (!url) { showPreviewError('Enter a GitHub username first.'); return; }

    const token = ++state.previewToken;
    state.previewId = id;
    const wrap = $('preview-wrap');
    const img = $('img');
    wrap.classList.add('loading');
    wrap.classList.toggle('light', getTheme().scheme === 'light');
    showPreviewError('');
    img.alt = `GitHub stats card: ${state.byId.get(id).label} for ${getUser() || 'username'}`;
    img.onload = () => { if (token === state.previewToken) wrap.classList.remove('loading'); };
    img.onerror = () => {
      if (token !== state.previewToken) return;
      wrap.classList.remove('loading');
      showPreviewError('Could not load the card. The API may be unavailable — try again in a moment.');
    };
    img.src = url;
    $('open-svg').href = url;

    const ids = rotationIds(1);
    const position = ids.indexOf(id) + 1;
    $('slide-counter').textContent = position ? `(${position} / ${ids.length})` : '(pinned)';
    setActiveRow(id);
  }

  // Show the slide embed 1 is rotating to right now, or the pinned slide.
  function load() {
    const ids = rotationIds(1);
    if (!ids.length) return;
    if ($('pin').checked && state.pinnedId) { previewSlide(state.pinnedId); return; }
    const period = getInterval() * 60000;
    const index = Math.floor(Date.now() / period) % ids.length;
    previewSlide(ids[index]);
  }

  function step(delta) {
    const ids = rotationIds(1);
    if (!ids.length) return;
    const index = ids.indexOf(state.previewId);
    previewSlide(ids[(index + delta + ids.length) % ids.length]);
  }

  function repreview() {
    if (state.previewId) previewSlide(state.previewId);
    else load();
  }

  // ── clipboard ─────────────────────────────────────────────────────────────

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise((resolve, reject) => {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try {
        if (document.execCommand('copy')) resolve();
        else reject(new Error('copy failed'));
      } catch (err) {
        reject(err);
      } finally {
        area.remove();
      }
    });
  }

  function doCopy(which) {
    const source = $(`snip-${which}`);
    const button = document.querySelector(`[data-copy="${which}"]`);
    if (!source || !button) return;
    copyText(source.textContent).then(
      () => { button.textContent = 'copied!'; button.classList.add('ok'); setStatus('Snippet copied to clipboard.', true); },
      () => { button.textContent = 'select & copy'; setStatus('Clipboard unavailable — select the text and copy manually.'); },
    ).finally(() => {
      setTimeout(() => { button.textContent = 'copy'; button.classList.remove('ok'); }, 1800);
    });
  }

  // ── actions ───────────────────────────────────────────────────────────────

  function setAll(on) {
    state.badges.forEach(b => {
      state.enabled[b] = new Set(on ? state.slides.map(s => s.id) : []);
    });
    syncSlideCheckboxes();
    refreshCategoryCheckboxes();
    updateCount();
    commit();
  }

  function toggleCategory(id) {
    if (state.collapsed.has(id)) state.collapsed.delete(id);
    else state.collapsed.add(id);
    renderSlideList();
    saveConfig();
  }

  function resetAll() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* storage disabled */ }
    state.filter = '';
    $('slide-filter').value = '';
    applySnapshot(normalize(null));
    renderSlideList();
    commit();
    load();
    setStatus('Configuration reset to defaults.', true);
  }

  function copySetupLink() {
    syncUrl();
    copyText(location.href).then(
      () => setStatus('Shareable setup link copied.', true),
      () => setStatus('Clipboard unavailable — copy the address bar instead.'),
    );
  }

  function isTyping(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!target.isContentEditable;
  }

  function wireEvents() {
    // A catalog retry must never attach a second set of listeners.
    if (eventsWired) return;
    eventsWired = true;
    $('load').addEventListener('click', load);
    $('prev-slide').addEventListener('click', () => step(-1));
    $('next-slide').addEventListener('click', () => step(1));

    $('uname').addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); load(); }
    });
    $('uname').addEventListener('input', () => {
      updateSnippets();
      saveConfig();
      clearTimeout(previewTimer);
      previewTimer = setTimeout(() => {
        // Avoid requesting an error card for a half-typed or invalid login.
        if (/^[A-Za-z0-9][A-Za-z0-9_-]{0,38}$/.test(getUser())) load();
      }, 700);
    });
    $('theme').addEventListener('change', () => { repreview(); commit(); });
    $('tz').addEventListener('change', () => { repreview(); commit(); });
    $('interval').addEventListener('change', () => { updateSnippets(); saveConfig(); });

    $('pin').addEventListener('change', () => {
      if ($('pin').checked && !state.pinnedId) {
        state.pinnedId = state.previewId || rotationIds(1)[0] || state.slides[0].id;
      }
      updatePinNote();
      commit();
      if ($('pin').checked && state.pinnedId) previewSlide(state.pinnedId);
    });
    $('reset').addEventListener('click', resetAll);
    $('copy-link').addEventListener('click', copySetupLink);
    $('select-all').addEventListener('click', () => setAll(true));
    $('select-none').addEventListener('click', () => setAll(false));
    $('retry-catalog').addEventListener('click', boot);

    $('slide-filter').addEventListener('input', event => {
      state.filter = event.target.value;
      renderSlideList();
    });

    const groups = $('slide-groups');
    groups.addEventListener('change', event => {
      const target = event.target;
      const set = state.enabled[target.dataset.badge];
      if (!set) return;
      if (target.dataset.slideToggle) {
        if (target.checked) set.add(target.dataset.slideToggle);
        else set.delete(target.dataset.slideToggle);
        refreshCategoryCheckboxes();
        updateCount();
        commit();
      } else if (target.dataset.categoryToggle) {
        const ids = state.slides.filter(s => s.category === target.dataset.categoryToggle).map(s => s.id);
        ids.forEach(id => { if (target.checked) set.add(id); else set.delete(id); });
        syncSlideCheckboxes();
        refreshCategoryCheckboxes();
        updateCount();
        commit();
      }
    });
    groups.addEventListener('click', event => {
      const collapse = event.target.closest('[data-collapse]');
      if (collapse) { toggleCategory(collapse.dataset.collapse); return; }
      const row = event.target.closest('.slide-row');
      if (row && !event.target.closest('.slide-toggle')) previewSlide(row.dataset.slide);
    });
    groups.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.slide-row')) {
        event.preventDefault();
        previewSlide(event.target.dataset.slide);
      }
    });

    $('embed-boxes').addEventListener('click', event => {
      const button = event.target.closest('[data-copy]');
      if (button) doCopy(button.dataset.copy);
    });

    document.addEventListener('keydown', event => {
      if (isTyping(event.target)) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
    });
  }

  // ── bootstrap ─────────────────────────────────────────────────────────────

  function showCatalogError(err) {
    $('catalog-error').hidden = false;
    const reason = err && err.message ? err.message : 'unknown error';
    $('catalog-error-message').textContent =
      `${reason}. The preview needs GET ${CATALOG_ENDPOINT}; the SVG API itself is unaffected.`;
    $('boot-note').textContent = 'Catalog unavailable — press retry.';
  }

  function init(catalog) {
    if (!catalog || !Array.isArray(catalog.slides) || !catalog.slides.length
      || !Array.isArray(catalog.themes) || !catalog.themes.length
      || !Array.isArray(catalog.categories) || !catalog.categories.length) {
      throw new Error('Unexpected catalog format');
    }

    if (state.initialized) return;
    state.catalog = catalog;
    state.slides = catalog.slides.map((slide, i) => ({
      ...slide,
      index: Number.isInteger(slide.index) ? slide.index : i,
    }));
    state.byId = new Map(state.slides.map(s => [s.id, s]));
    state.categories = catalog.categories;
    state.themes = catalog.themes;
    state.themeById = new Map(state.themes.map(t => [t.id, t]));
    state.badges = catalog.badges && Array.isArray(catalog.badges.ui) && catalog.badges.ui.length
      ? catalog.badges.ui.filter(b => Number.isInteger(b) && b >= 1)
      : [1, 2];
    state.maxBadges = Number(catalog.badges && catalog.badges.max) || 8;
    state.defaultTheme = (catalog.defaults && catalog.defaults.theme) || 'dark';
    state.rotationMs = Number(catalog.rotation && catalog.rotation.defaultMs) || 600000;
    state.minInterval = Number(catalog.rotation && catalog.rotation.minMinutes) || 1;
    state.maxInterval = Number(catalog.rotation && catalog.rotation.maxMinutes) || 60;
    state.defaultInterval = Number(catalog.rotation && catalog.rotation.defaultMinutes) || 10;
    $('interval').min = String(state.minInterval);
    $('interval').max = String(state.maxInterval);

    buildThemeSelect();
    buildEmbedBoxes();
    buildParamsTable();

    const stored = readStored();
    const fromUrl = readUrl();
    const merged = { ...(stored || {}), ...(fromUrl || {}) };
    merged.enabled = { ...(stored && stored.enabled), ...(fromUrl && fromUrl.enabled) };
    merged.collapsed = fromUrl && Array.isArray(fromUrl.collapsed)
      ? fromUrl.collapsed
      : (stored && stored.collapsed);
    applySnapshot(normalize(merged));

    renderSlideList();
    wireEvents();
    commit();
    load();
    $('catalog-error').hidden = true;
    state.initialized = true;
  }

  async function boot() {
    $('catalog-error').hidden = true;
    $('boot-note').textContent = 'Loading catalog…';
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = setTimeout(() => { if (controller) controller.abort(); }, 10000);
    try {
      const response = await fetch(CATALOG_ENDPOINT, {
        headers: { Accept: 'application/json' },
        ...(controller ? { signal: controller.signal } : {}),
      });
      if (!response.ok) throw new Error(`Catalog request failed (HTTP ${response.status})`);
      init(await response.json());
    } catch (err) {
      showCatalogError(err);
    } finally {
      clearTimeout(timer);
    }
  }

  boot();
})();
