import { LAYOUTS, FONTS, PATTERNS, AVATAR_SHAPES, BORDER_STYLES, TIER_STYLES, BG_TYPES, BANNER_TYPES,
  THEMES, MODES, DEFAULT_CONFIG, MAX_DATA_URI, sanitizeConfig, cardSize, drawCard, imageSources, buildCardData } from '/js/card-core.js';
import { loadFonts, loadImage, toast } from '/js/boot.js';
import { mountChrome, fillNavUser, icon, esc } from '/js/ui.js';
import { sfx } from '/js/sfx.js';

const $ = (s) => document.querySelector(s);
const get = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
function set(o, p, v) { const ks = p.split('.'); const l = ks.pop(); ks.reduce((a, k) => a[k], o)[l] = v; }
const clone = (o) => JSON.parse(JSON.stringify(o));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SLOTS = 9;

mountChrome(); fillNavUser();

let me, data, cfg;
let slots = Array(SLOTS).fill(null);   // { config, at } | null
let names = {}, active = null, cur = 0, publishedAt = null, dirty = false;

// ---------- boot ----------
async function boot() {
  const r = await fetch('/api/me');
  if (r.status === 401) { location.href = '/api/auth/login'; return false; }
  me = await r.json();
  await loadFonts();
  $('#loading').hidden = true;
  if (me.problem === 'not_in_server' || me.problem === 'no_rank') { showLocked(me.problem); return false; }
  data = me.data; publishedAt = me.published?.at || null;
  slots = (me.slots || []).map((s) => (s ? { config: sanitizeConfig(s.config), at: s.at } : null));
  while (slots.length < SLOTS) slots.push(null);
  names = me.names || {}; active = me.active;
  cur = Number.isInteger(me.last) && me.last >= 0 && me.last < SLOTS ? me.last : 0;
  if (!slots[cur]) { const f = slots.findIndex(Boolean); if (f >= 0) cur = f; }
  cfg = slots[cur] ? clone(slots[cur].config) : sanitizeConfig(clone(DEFAULT_CONFIG));
  if (me.problem) {
    $('#banner').innerHTML = '<div class="banner-msg">Could not read your server roles right now, so the preview uses sample tiers. Publishing is disabled until it works. Try again in a minute.' + (me.diag?.error ? '<br><small>Reason: ' + esc(me.diag.error) + '</small>' : '') + '</div>';
    data = buildCardData({ name: me.user.username, handle: me.user.username, avatarInitial: (me.user.username[0] || '?').toUpperCase(), tiers: { SWORD: 'HT3', AXE: 'LT4', CART: 'HT2' } });
  }
  return true;
}

function showLocked(kind) {
  if (kind === 'not_in_server') {
    $('#lockt').textContent = 'Join the AxR server first';
    $('#lockp').textContent = 'Battle Cards are for members of the AxR Rankings Discord server. Join the server, get tier tested, then come back to build your card.';
  } else {
    $('#lockt').textContent = 'You need a rank to make a card';
    $('#lockp').textContent = 'Battle Cards show real tiers, and you do not have a tier role on the server yet. Get tier tested in the server and the editor will unlock here automatically.';
    if (me.diag && me.diag.tierRolesInServer === 0) $('#lockp').textContent += ' (Admin note: the bot found no tier roles named like "HT1 SWORD" in the server.)';
  }
  const cv = $('#lockcv');
  const demo = buildCardData({ name: me.user.username, handle: me.user.username, avatarInitial: (me.user.username[0] || '?').toUpperCase(), tiers: { SWORD: 'HT2', AXE: 'LT3', UHC: 'HT3', CART: 'HT1', CRYSTAL: 'LT2' } });
  const c = sanitizeConfig(DEFAULT_CONFIG); const s = cardSize(c); cv.width = s.width; cv.height = s.height;
  drawCard(cv.getContext('2d'), c, demo, {});
  $('#locked').hidden = false;
  $('#recheck').onclick = () => location.reload();
}

if (await boot()) init();

function init() {
  $('#app').hidden = false;
  if (publishedAt) { $('#view').href = `/u/${me.user.id}`; $('#viewrow').hidden = false; }
  $('#undo').innerHTML = icon('undo'); $('#redo').innerHTML = icon('redo'); $('#reset').innerHTML = icon('reset');
  $('#rename').innerHTML = icon('edit'); $('#dup').innerHTML = icon('copy'); $('#clear').innerHTML = icon('trash');
  $('#copy').innerHTML = icon('link') + 'Copy link'; $('#dl').innerHTML = icon('download') + 'PNG';

  // ---------- rendering ----------
  const cv = $('#cv'); const ctx = cv.getContext('2d');
  let renderToken = 0;
  async function paint(config, canvas, token) {
    const clean = sanitizeConfig(config);
    const src = imageSources(clean, data);
    const [bg, banner, avatar] = await Promise.all([loadImage(src.bg), loadImage(src.banner), loadImage(src.avatar)]);
    if (token !== undefined && token !== renderToken) return false;
    const { width, height } = cardSize(clean);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    drawCard(canvas.getContext('2d'), clean, data, { bg, banner, avatar });
    return true;
  }
  const render = () => paint(cfg, cv, ++renderToken);

  // ---------- hotbar ----------
  const bar = $('#hotbar');
  const thumbSrc = document.createElement('canvas');
  async function thumb(n) {
    const slotEl = bar.querySelector(`.hb-slot[data-n="${n}"]`); if (!slotEl) return;
    let t = slotEl.querySelector('canvas');
    const conf = n === cur ? cfg : slots[n]?.config;
    if (!conf) { if (t) t.remove(); return; }
    if (!t) { t = document.createElement('canvas'); slotEl.prepend(t); t.width = 160; t.height = 110; }
    if (!(await paint(conf, thumbSrc))) return;
    const g = t.getContext('2d'); const sc = Math.max(160 / thumbSrc.width, 110 / thumbSrc.height);
    g.clearRect(0, 0, 160, 110); g.imageSmoothingQuality = 'high';
    g.drawImage(thumbSrc, (160 - thumbSrc.width * sc) / 2, (110 - thumbSrc.height * sc) / 2, thumbSrc.width * sc, thumbSrc.height * sc);
  }
  function buildBar() {
    bar.innerHTML = '<div class="hb-sel" id="hbsel"></div>' + Array.from({ length: SLOTS }, (_, n) =>
      `<button class="hb-slot" data-n="${n}" aria-label="Card slot ${n + 1}"><span class="hb-num">${n + 1}</span><span class="plus">+</span><span class="hb-star" ${active === n ? '' : 'hidden'}>&#9733;</span></button>`).join('');
    placeSel(false);
  }
  function placeSel(animate = true) {
    const el = bar.querySelector(`.hb-slot[data-n="${cur}"]`), sel = $('#hbsel'); if (!el || !sel) return;
    sel.style.transition = animate ? '' : 'none';
    sel.style.width = el.offsetWidth + 6 + 'px'; sel.style.height = el.offsetHeight + 6 + 'px';
    sel.style.transform = `translateX(${el.offsetLeft - 3}px)`;
    el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: animate ? 'smooth' : 'auto' });
  }
  function refreshInfo() {
    bar.querySelectorAll('.hb-star').forEach((s) => { s.hidden = Number(s.parentElement.dataset.n) !== active; });
    const nm = names[cur] || `Card ${cur + 1}`;
    $('#hbname').innerHTML = `${esc(nm)}${active === cur ? ' <small>&#9733; shown in Discord</small>' : ''}${slots[cur] ? '' : ' <small>(empty)</small>'}`;
    $('#dup').disabled = !slots[cur]; $('#clear').disabled = !slots[cur]; $('#rename').disabled = !slots[cur];
    setStat(statFor());
  }
  const statFor = () => (active === cur ? 'This card is published' : slots[cur] ? 'Saved' : 'Empty slot');
  buildBar();
  addEventListener('resize', () => placeSel(false));
  slots.forEach((s, n) => { if (s) thumb(n); });

  // ---------- per-slot history (undo / redo) ----------
  const hists = {};
  const H = () => (hists[cur] ||= { h: [JSON.stringify(cfg)], i: 0 });
  let histTimer;
  const syncHist = () => { const h = H(); $('#undo').disabled = h.i <= 0; $('#redo').disabled = h.i >= h.h.length - 1; };
  function pushHist() {
    const h = H(); const s = JSON.stringify(cfg); if (s === h.h[h.i]) return;
    h.h = h.h.slice(0, h.i + 1); h.h.push(s); if (h.h.length > 60) h.h.shift(); h.i = h.h.length - 1; syncHist();
  }
  function goHist(d) {
    clearTimeout(histTimer); pushHist();
    const h = H(); const n = h.i + d; if (n < 0 || n >= h.h.length) return;
    h.i = n; cfg = JSON.parse(h.h[h.i]); syncHist(); build(); changed(true);
  }
  $('#undo').onclick = () => goHist(-1); $('#redo').onclick = () => goHist(1);
  $('#reset').onclick = () => { if (!confirm('Reset this card to the default design?')) return; pushHist(); cfg = sanitizeConfig(clone(DEFAULT_CONFIG)); pushHist(); build(); changed(true); };
  syncHist();

  // ---------- saving ----------
  let saveTimer;
  function setStat(txt, kind = '') { $('#stat').textContent = txt; $('#dot').className = 'dot ' + kind; }
  async function post(url, body) {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || 'failed'), { code: j.error }); return j;
  }
  let thumbTimer;
  function changed(skipHist) {
    dirty = true; render(); setStat('Saving...', 'busy');
    slots[cur] = { config: sanitizeConfig(cfg), at: Date.now() };
    if (!skipHist) { clearTimeout(histTimer); histTimer = setTimeout(pushHist, 500); }
    clearTimeout(thumbTimer); thumbTimer = setTimeout(() => thumb(cur), 350);
    clearTimeout(saveTimer); saveTimer = setTimeout(() => saveSlot(cur, slots[cur].config), 900);
    refreshInfoQuiet();
  }
  const refreshInfoQuiet = () => { const nm = names[cur] || `Card ${cur + 1}`; $('#hbname').innerHTML = `${esc(nm)}${active === cur ? ' <small>&#9733; shown in Discord</small>' : ''}`; $('#dup').disabled = false; $('#clear').disabled = false; $('#rename').disabled = false; };
  async function saveSlot(n, config) {
    try { await post('/api/draft', { config, slot: n }); if (n === cur) { dirty = false; setStat(statFor()); } }
    catch (e) { setStat('Save failed: ' + e.message, 'err'); }
  }
  async function flushSave() {
    if (!saveTimer) return; clearTimeout(saveTimer); saveTimer = 0;
    if (dirty && slots[cur]) await saveSlot(cur, slots[cur].config);
  }

  // ---------- switching cards with animation ----------
  let switching = false;
  async function switchTo(n, { fresh = false } = {}) {
    if (n === cur || switching || n < 0 || n >= SLOTS) return;
    switching = true;
    clearTimeout(histTimer); pushHist(); await flushSave();
    const dir = n > cur ? 'l' : 'r';
    sfx.slot();
    cv.className = 'out-' + dir; await wait(160);
    cur = n;
    cfg = slots[cur] ? clone(slots[cur].config) : sanitizeConfig(clone(DEFAULT_CONFIG));
    placeSel(true); build(); syncHist(); refreshInfo();
    await render();
    cv.className = (fresh ? 'pop-in' : 'in-' + dir);
    if (fresh) sfx.pop();
    await wait(320); cv.className = '';
    switching = false;
  }
  bar.addEventListener('click', async (e) => {
    const b = e.target.closest('.hb-slot'); if (!b) return;
    const n = Number(b.dataset.n);
    if (n === cur) return;
    if (!slots[n]) {   // empty slot: start a fresh card there
      await switchTo(n, { fresh: true });
      slots[cur] = { config: sanitizeConfig(cfg), at: Date.now() }; thumb(cur); saveSlot(cur, slots[cur].config); refreshInfo();
    } else switchTo(n);
  });
  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (/^[1-9]$/.test(e.key)) { const n = Number(e.key) - 1; const b = bar.querySelector(`.hb-slot[data-n="${n}"]`); if (b) b.click(); }
  });

  $('#rename').onclick = async () => {
    const v = prompt('Name this card (max 20 characters)', names[cur] || `Card ${cur + 1}`); if (v === null) return;
    const clean = v.replace(/[^\w \-.!']/g, '').trim().slice(0, 20);
    if (clean) names[cur] = clean; else delete names[cur];
    refreshInfo(); try { await post('/api/draft', { slot: cur, name: clean }); } catch {}
  };
  $('#dup').onclick = async () => {
    const free = slots.findIndex((s) => !s);
    if (free < 0) { sfx.error(); return toast('All nine slots are full. Empty one first.', true); }
    await flushSave();
    slots[free] = { config: clone(sanitizeConfig(cfg)), at: Date.now() };
    if (names[cur]) names[free] = names[cur] + ' copy'.slice(0, 20 - names[cur].length);
    await saveSlot(free, slots[free].config);
    if (names[free]) try { await post('/api/draft', { slot: free, name: names[free] }); } catch {}
    thumb(free); await switchTo(free, { fresh: true }); toast('Copied to slot ' + (free + 1));
  };
  $('#clear').onclick = async () => {
    if (!confirm('Empty this slot? The design in it will be deleted.')) return;
    clearTimeout(saveTimer); saveTimer = 0;
    try { await post('/api/draft', { slot: cur, clear: true }); } catch (e) { sfx.error(); return toast('Could not clear: ' + e.message, true); }
    slots[cur] = null; delete names[cur]; if (active === cur) active = null;
    cfg = sanitizeConfig(clone(DEFAULT_CONFIG)); hists[cur] = null; delete hists[cur];
    thumb(cur); build(); syncHist(); refreshInfo(); render(); sfx.pop();
    cv.className = 'pop-in'; await wait(340); cv.className = '';
  };

  // ---------- publish / copy / download ----------
  $('#publish').onclick = async () => {
    clearTimeout(saveTimer); saveTimer = 0; setStat('Publishing...', 'busy');
    try {
      slots[cur] = slots[cur] || { config: sanitizeConfig(cfg), at: Date.now() };
      const j = await post('/api/publish', { config: sanitizeConfig(cfg), slot: cur });
      publishedAt = j.publishedAt; active = cur; dirty = false;
      $('#view').href = j.profileUrl; $('#viewrow').hidden = false;
      refreshInfo(); sfx.levelup(); toast('Published! Type 1card in Discord.');
    } catch (e) {
      setStat('Publish failed', 'err'); sfx.error();
      const m = { not_in_server: 'Join the server first to publish.', no_rank: 'You need a tier role to publish.', stats_unavailable: 'Could not read your roles. Try again soon.' };
      toast(m[e.code] || 'Publish failed: ' + e.message, true);
    }
  };
  $('#copy').onclick = async () => {
    const url = `${location.origin}/api/card/${me.user.id}.png`;
    try { await navigator.clipboard.writeText(url); toast(publishedAt ? 'Image link copied' : 'Link copied. Publish first for it to work.'); }
    catch { prompt('Copy this link', url); }
  };
  $('#dl').onclick = () => cv.toBlob((b) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'battlecard.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  addEventListener('beforeunload', (e) => { if (dirty && slots[cur]) { navigator.sendBeacon?.('/api/draft', new Blob([JSON.stringify({ config: slots[cur].config, slot: cur })], { type: 'application/json' })); e.preventDefault(); } });

  // ---------- control builders ----------
  const seg = (path, label, opts) => ({ html: () => `<div class="ctl"><div class="lab">${label}</div><div class="seg" data-seg="${path}">${opts.map(([v, l]) => `<button data-v="${esc(v)}" class="${get(cfg, path) === v ? 'on' : ''}">${esc(l)}</button>`).join('')}</div></div>` });
  const range = (path, label, min, max, step = 1) => ({ html: () => `<div class="ctl"><label>${label}<span class="val" data-val="${path}">${get(cfg, path)}</span></label><input type="range" data-range="${path}" min="${min}" max="${max}" step="${step}" value="${get(cfg, path)}"></div>` });
  const color = (path, label) => ({ html: () => `<div class="ctl"><label>${label}</label><input type="color" data-color="${path}" value="${(get(cfg, path) || '#46a02c').toLowerCase()}"></div>` });
  const colors2 = (a) => ({ html: () => `<div class="colorgrid">${a.map(([p, l]) => color(p, l).html()).join('')}</div>` });
  const toggle = (path, label) => ({ html: () => `<label class="toggle"><span>${label}</span><input type="checkbox" data-tog="${path}" ${get(cfg, path) ? 'checked' : ''}><i class="sw"></i></label>` });
  const text = (path, label, ph = '', max = 600) => ({ html: () => `<div class="ctl"><label>${label}</label><input type="text" data-text="${path}" maxlength="${max}" placeholder="${ph}" value="${esc(get(cfg, path) || '')}"></div>` });
  const upload = (kind, label) => ({ html: () => `<div class="ctl"><div class="lab">${label}</div><div class="filebtn"><label class="btn sm">${icon('image')}Upload<input type="file" accept="image/*" data-up="${kind}"></label><button class="btn sm ghost" data-clear="${kind}">Remove</button></div></div>` });
  const hint = (t) => ({ html: () => `<p class="hint">${t}</p>` });
  const raw = (fn) => ({ html: fn });
  const themesBlock = raw(() => `<div class="themes">${Object.entries(THEMES).map(([n, t]) =>
    `<button class="theme" data-theme="${esc(n)}"><span class="sw" style="background:linear-gradient(135deg,${t.colors.accent} 50%,${t.colors.accent2} 50%)"></span>${esc(n)}</button>`).join('')}</div>`);
  const modesBlock = raw(() => `<div class="modes">${MODES.map((m) =>
    `<label class="toggle"><span>${m.label}</span><input type="checkbox" data-mode="${m.key}" ${cfg.tiers.modes.includes(m.key) ? 'checked' : ''}><i class="sw"></i></label>`).join('')}</div>`);

  const TABS = [
    ['Style', 'layout', [['Quick themes', [themesBlock]], ['Layout', [seg('layout', 'Card layout', Object.entries(LAYOUTS).map(([k, v]) => [k, v.label]))]]]],
    ['Background', 'image', [
      ['Base', [seg('bg.type', 'Type', BG_TYPES.map((t) => [t, t])), colors2([['bg.color1', 'Color 1'], ['bg.color2', 'Color 2']]), range('bg.angle', 'Gradient angle', 0, 360)]],
      ['Pattern', [seg('bg.pattern', 'Pattern', PATTERNS.map((t) => [t, t])), color('bg.patternColor', 'Pattern color'), range('bg.patternOpacity', 'Strength', 0, 0.4, 0.01)]],
      ['Image', [text('bg.image', 'Image link (https)', 'https://...'), upload('bg', 'Or upload one'), range('bg.imageDim', 'Darkening', 0, 0.9, 0.01)]]]],
    ['Colors', 'palette', [['Accent', [colors2([['colors.accent', 'Accent'], ['colors.accent2', 'Accent 2']])]], ['Text', [colors2([['colors.text', 'Text'], ['colors.subtext', 'Subtext']])]], ['Panels', [color('colors.panel', 'Panel color'), range('colors.panelOpacity', 'Panel opacity', 0, 1, 0.01)]]]],
    ['Font', 'type', [['Typeface', [seg('font', 'Card font', Object.entries(FONTS).map(([k, v]) => [k, v.label]))]], ['Tagline', [text('stats.tagline', 'Short line under your name', 'Ready to fight.', 40)]]]],
    ['Avatar', 'user', [
      ['Picture', [seg('avatar.source', 'Source', [['discord', 'Discord'], ['url', 'Link'], ['upload', 'Upload']]), text('avatar.url', 'Image link (https)', 'https://...'), upload('avatar', 'Or upload one')]],
      ['Look', [seg('avatar.shape', 'Shape', AVATAR_SHAPES.map((t) => [t, t])), range('avatar.size', 'Size', 70, 130), toggle('avatar.ring', 'Ring'), range('avatar.glow', 'Glow', 0, 50)]]]],
    ['Banner', 'layout', [['Banner', [seg('banner.type', 'Type', BANNER_TYPES.map((t) => [t, t])), text('banner.image', 'Image link (https)', 'https://...'), upload('banner', 'Or upload one'), range('banner.dim', 'Darkening', 0, 0.9, 0.01)]]]],
    ['Border', 'frame', [['Border', [seg('border.style', 'Style', BORDER_STYLES.map((t) => [t, t])), range('border.width', 'Width', 0, 14), range('border.radius', 'Corner radius', 0, 60), range('border.glow', 'Glow', 0, 50), color('border.color', 'Color (default: accent)')]]]],
    ['Tiers', 'trophy', [['Display', [seg('tiers.style', 'Style', TIER_STYLES.map((t) => [t, t])), toggle('tiers.showEmpty', 'Show modes with no tier'), toggle('tiers.highlightTop', 'Highlight best tier')]], ['Modes shown', [modesBlock]]]],
    ['Stats', 'chart', [['Show on card', [toggle('stats.showRank', 'Combat rank'), toggle('stats.showPoints', 'Total points'), toggle('stats.showRanked', 'Ranked modes count'), toggle('stats.showBest', 'Best tier'), toggle('stats.showProgress', 'Progress bar'), hint('Tiers and rank come from your server roles automatically.')]]]],
  ];

  function build() {
    const active_ = Math.min(Number(sessionStorage.getItem('bc_tab') || 0), TABS.length - 1);
    $('#tabs').innerHTML = TABS.map(([n, ic], i) => `<button class="tab ${i === active_ ? 'on' : ''}" data-i="${i}">${icon(ic)}${n}</button>`).join('');
    $('#panes').innerHTML = TABS.map(([, , groups], i) => `<div class="pane ${i === active_ ? 'on' : ''}" data-i="${i}">${groups.map(([t, items]) => `<div class="group"><h4>${t}</h4>${items.map((c) => c.html()).join('')}</div>`).join('')}</div>`).join('');
  }
  build();

  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('.tab'); if (!b) return;
    try { sessionStorage.setItem('bc_tab', b.dataset.i); } catch {}
    document.querySelectorAll('.tab,.pane').forEach((el) => el.classList.toggle('on', el.dataset.i === b.dataset.i));
    b.scrollIntoView({ block: 'nearest', inline: 'center' });
  });

  const panes = $('#panes');
  panes.addEventListener('click', (e) => {
    const sb = e.target.closest('[data-seg] button');
    if (sb) {
      const p = sb.parentElement.dataset.seg; set(cfg, p, sb.dataset.v);
      sb.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === sb));
      if (p === 'bg.type' && sb.dataset.v === 'image' && !cfg.bg.image) toast('Add an image link or upload one below.');
      return changed();
    }
    const th = e.target.closest('[data-theme]');
    if (th) { const t = THEMES[th.dataset.theme]; Object.assign(cfg.colors, t.colors); Object.assign(cfg.bg, t.bg); cfg.border.color = ''; build(); return changed(); }
    const cl = e.target.closest('[data-clear]');
    if (cl) {
      const k = cl.dataset.clear;
      if (k === 'bg') { cfg.bg.image = ''; if (cfg.bg.type === 'image') cfg.bg.type = 'gradient'; }
      if (k === 'banner') { cfg.banner.image = ''; if (cfg.banner.type === 'image') cfg.banner.type = 'gradient'; }
      if (k === 'avatar') { cfg.avatar.url = ''; cfg.avatar.source = 'discord'; }
      build(); changed();
    }
  });
  panes.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.range) { const v = Number(t.value); set(cfg, t.dataset.range, v); const l = panes.querySelector(`[data-val="${t.dataset.range}"]`); if (l) l.textContent = v; return changed(); }
    if (t.dataset.color) { set(cfg, t.dataset.color, t.value.toUpperCase()); return changed(); }
    if (t.dataset.text) {
      const p = t.dataset.text; set(cfg, p, t.value.trim());
      if (p === 'bg.image' && t.value.trim()) cfg.bg.type = 'image';
      if (p === 'banner.image' && t.value.trim()) cfg.banner.type = 'image';
      if (p === 'avatar.url' && t.value.trim()) cfg.avatar.source = 'url';
      return changed();
    }
  });
  panes.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.tog) { set(cfg, t.dataset.tog, t.checked); return changed(); }
    if (t.dataset.mode) { const s = new Set(cfg.tiers.modes); t.checked ? s.add(t.dataset.mode) : s.delete(t.dataset.mode); cfg.tiers.modes = MODES.map((m) => m.key).filter((k) => s.has(k)); return changed(); }
    if (t.dataset.up && t.files[0]) handleUpload(t.dataset.up, t.files[0]).finally(() => { t.value = ''; });
  });

  // shrink uploads until they fit the server limit
  async function shrink(file, maxSide) {
    const bmp = await createImageBitmap(file);
    let side = maxSide, q = 0.85;
    for (let i = 0; i < 12; i++) {
      const sc = Math.min(1, side / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * sc)); c.height = Math.max(1, Math.round(bmp.height * sc));
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      const url = c.toDataURL('image/jpeg', q);
      if (url.length <= MAX_DATA_URI) return url;
      q = Math.max(0.45, q - 0.1); side = Math.round(side * 0.82);
    }
    throw new Error('Image is too complex to shrink enough. Try another one.');
  }
  async function handleUpload(kind, file) {
    try {
      const url = await shrink(file, kind === 'avatar' ? 400 : 1000);
      if (kind === 'bg') { cfg.bg.image = url; cfg.bg.type = 'image'; }
      if (kind === 'banner') { cfg.banner.image = url; cfg.banner.type = 'image'; }
      if (kind === 'avatar') { cfg.avatar.url = url; cfg.avatar.source = 'upload'; }
      build(); changed(); toast('Image added');
    } catch (e) { sfx.error(); toast(e.message || 'Could not read that image', true); }
  }

  // ---------- start from a gallery style (?theme=...&layout=...) ----------
  async function applyGallery() {
    const q = new URLSearchParams(location.search); if (!q.has('theme') && !q.has('layout')) return;
    let target = cur;
    if (slots[cur]) { const free = slots.findIndex((s) => !s); if (free >= 0) target = free; else if (!confirm(`All slots are used. Replace card ${cur + 1} with this style?`)) { history.replaceState(null, '', '/editor'); return; } }
    if (target !== cur) await switchTo(target, { fresh: true });
    const t = THEMES[q.get('theme')]; if (t) { Object.assign(cfg.colors, t.colors); Object.assign(cfg.bg, t.bg); }
    if (LAYOUTS[q.get('layout')]) cfg.layout = q.get('layout');
    if (FONTS[q.get('font')]) cfg.font = q.get('font');
    if (TIER_STYLES.includes(q.get('tiers'))) cfg.tiers.style = q.get('tiers');
    if (BORDER_STYLES.includes(q.get('border'))) cfg.border.style = q.get('border');
    history.replaceState(null, '', '/editor'); build(); changed(); toast('Style applied to slot ' + (cur + 1));
  }

  refreshInfo(); render(); placeSel(false);
  applyGallery();
}
