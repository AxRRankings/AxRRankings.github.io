import { LAYOUTS, FONTS, PATTERNS, AVATAR_SHAPES, BORDER_STYLES, TIER_STYLES, BG_TYPES, BANNER_TYPES,
  THEMES, MODES, DEFAULT_CONFIG, MAX_DATA_URI, sanitizeConfig, cardSize, drawCard, imageSources } from '/js/card-core.js';
import { loadFonts, loadImage, toast } from '/js/boot.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const get = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
function set(o, p, v) { const ks = p.split('.'); const l = ks.pop(); ks.reduce((a, k) => a[k], o)[l] = v; }

let cfg, data, me, dirty = false, publishedAt = null;

// ---------- boot ----------
const r = await fetch('/api/me');
if (r.status === 401) { location.href = '/api/auth/login'; throw 0; }
me = await r.json();
cfg = sanitizeConfig(me.config); data = me.data;
publishedAt = me.published?.at || null;
$('#chip').innerHTML = `<span>${esc(me.user.username)}</span><a href="/api/auth/logout">Logout</a>`;
if (me.problem === 'not_in_server') $('#banner').innerHTML = '<div class="banner-msg">You are not in the AxR server yet, so there are no tiers to show and you cannot publish. Join the server and refresh.</div>';
else if (me.problem) $('#banner').innerHTML = '<div class="banner-msg">Could not read your server roles right now. The preview uses sample tiers. Try again in a minute.</div>';
if (!data) data = (await import('/js/card-core.js')).buildCardData({ name: me.user.username, handle: me.user.username, avatarInitial: me.user.username[0]?.toUpperCase() || '?',
  tiers: { SWORD: 'HT3', AXE: 'LT4', CART: 'HT2' } });
await loadFonts();
$('#loading').hidden = true; $('#editor').hidden = false;
if (publishedAt) { const v = $('#view'); v.href = `/u/${me.user.id}`; v.hidden = false; }

// ---------- rendering ----------
const cv = $('#cv'); const ctx = cv.getContext('2d');
let renderToken = 0;
async function render() {
  const tok = ++renderToken;
  const clean = sanitizeConfig(cfg);
  const src = imageSources(clean, data);
  const [bg, banner, avatar] = await Promise.all([loadImage(src.bg), loadImage(src.banner), loadImage(src.avatar)]);
  if (tok !== renderToken) return;
  const { width, height } = cardSize(clean);
  if (cv.width !== width || cv.height !== height) { cv.width = width; cv.height = height; }
  drawCard(ctx, clean, data, { bg, banner, avatar });
  $('#sizeinfo').textContent = `${width}x${height}`;
}

// ---------- saving ----------
let saveTimer;
function setStat(txt, kind = '') { $('#stat').textContent = txt; $('#dot').className = 'dot ' + kind; }
function changed() {
  dirty = true; render(); setStat('Saving...', 'busy');
  clearTimeout(saveTimer); saveTimer = setTimeout(saveDraft, 1000);
}
async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || 'failed'), { code: j.error }); return j;
}
async function saveDraft() {
  try { await post('/api/draft', { config: sanitizeConfig(cfg) }); dirty = false; setStat(publishedAt ? 'Draft saved' : 'Saved', ''); }
  catch (e) { setStat('Save failed: ' + e.message, 'err'); }
}
$('#publish').onclick = async () => {
  clearTimeout(saveTimer); setStat('Publishing...', 'busy');
  try {
    const j = await post('/api/publish', { config: sanitizeConfig(cfg) });
    publishedAt = j.publishedAt; dirty = false; setStat('Published', '');
    const v = $('#view'); v.href = j.profileUrl; v.hidden = false;
    toast('Published! Use /card in Discord.');
  } catch (e) {
    setStat('Publish failed', 'err');
    toast(e.code === 'not_in_server' ? 'Join the server first to publish.' : 'Publish failed: ' + e.message, true);
  }
};
$('#copy').onclick = async () => {
  const url = `${location.origin}/api/card/${me.user.id}.png`;
  try { await navigator.clipboard.writeText(url); toast(publishedAt ? 'Image link copied' : 'Link copied (publish first)'); }
  catch { prompt('Copy this link', url); }
};
$('#dl').onclick = () => cv.toBlob((b) => {
  const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'battlecard.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});
addEventListener('beforeunload', (e) => { if (dirty) { saveDraft(); e.preventDefault(); } });

// ---------- control builders ----------
const seg = (path, label, opts) => ({ html: () => `<div class="ctl"><div class="lab">${label}</div><div class="seg" data-seg="${path}">${opts.map(([v, l]) => `<button data-v="${esc(v)}" class="${get(cfg, path) === v ? 'on' : ''}">${esc(l)}</button>`).join('')}</div></div>` });
const range = (path, label, min, max, step = 1) => ({ html: () => `<div class="ctl"><label>${label}<span class="val" data-val="${path}">${get(cfg, path)}</span></label><input type="range" data-range="${path}" min="${min}" max="${max}" step="${step}" value="${get(cfg, path)}"></div>` });
const color = (path, label) => ({ html: () => `<div class="ctl"><label>${label}</label><input type="color" data-color="${path}" value="${get(cfg, path) || '#00e5ff'}"></div>` });
const toggle = (path, label) => ({ html: () => `<label class="toggle"><span>${label}</span><input type="checkbox" data-tog="${path}" ${get(cfg, path) ? 'checked' : ''}><i class="sw"></i></label>` });
const text = (path, label, ph = '', max = 600) => ({ html: () => `<div class="ctl"><label>${label}</label><input type="text" data-text="${path}" maxlength="${max}" placeholder="${ph}" value="${esc(get(cfg, path) || '')}"></div>` });
const upload = (kind, label) => ({ html: () => `<div class="ctl"><div class="lab">${label}</div><div class="filebtn"><label class="btn">Upload image<input type="file" accept="image/*" data-up="${kind}"></label><button class="btn ghost" data-clear="${kind}">Clear</button></div><p class="hint">Uploads are shrunk automatically. Or paste an https link above.</p></div>` });
const hint = (t) => ({ html: () => `<p class="hint">${t}</p>` });
const raw = (fn) => ({ html: fn });

const themesBlock = raw(() => `<div class="ctl"><div class="lab">Quick themes</div><div class="themes">${Object.entries(THEMES).map(([n, t]) =>
  `<button class="theme" data-theme="${esc(n)}"><span class="sw" style="background:linear-gradient(135deg,${t.colors.accent},${t.colors.accent2})"></span>${esc(n)}</button>`).join('')}</div></div>`);
const modesBlock = raw(() => `<div class="ctl"><div class="lab">Modes shown</div><div class="modes">${MODES.map((m) =>
  `<label class="toggle"><span>${m.label}</span><input type="checkbox" data-mode="${m.key}" ${cfg.tiers.modes.includes(m.key) ? 'checked' : ''}><i class="sw"></i></label>`).join('')}</div></div>`);

const TABS = [
  ['Theme', [themesBlock, seg('layout', 'Layout', Object.entries(LAYOUTS).map(([k, v]) => [k, v.label]))]],
  ['Background', [seg('bg.type', 'Type', BG_TYPES.map((t) => [t, t])), color('bg.color1', 'Color 1'), color('bg.color2', 'Color 2'), range('bg.angle', 'Gradient angle', 0, 360),
    seg('bg.pattern', 'Pattern', PATTERNS.map((t) => [t, t])), color('bg.patternColor', 'Pattern color'), range('bg.patternOpacity', 'Pattern strength', 0, 0.4, 0.01),
    text('bg.image', 'Background image link (https)', 'https://...'), upload('bg', 'Or upload a background'), range('bg.imageDim', 'Image darkening', 0, 0.9, 0.01)]],
  ['Colors', [color('colors.accent', 'Accent'), color('colors.accent2', 'Accent 2'), color('colors.text', 'Text'), color('colors.subtext', 'Subtext'), color('colors.panel', 'Panel'), range('colors.panelOpacity', 'Panel opacity', 0, 1, 0.01)]],
  ['Fonts', [seg('font', 'Card font', Object.entries(FONTS).map(([k, v]) => [k, v.label])), text('stats.tagline', 'Tagline', 'Ready to fight.', 40)]],
  ['Avatar', [seg('avatar.source', 'Source', [['discord', 'Discord avatar'], ['url', 'Image link'], ['upload', 'Upload']]), text('avatar.url', 'Avatar image link (https)', 'https://...'), upload('avatar', 'Upload an avatar'),
    seg('avatar.shape', 'Shape', AVATAR_SHAPES.map((t) => [t, t])), range('avatar.size', 'Size', 70, 130), toggle('avatar.ring', 'Ring'), range('avatar.glow', 'Glow', 0, 50)]],
  ['Banner', [seg('banner.type', 'Type', BANNER_TYPES.map((t) => [t, t])), text('banner.image', 'Banner image link (https)', 'https://...'), upload('banner', 'Or upload a banner'), range('banner.dim', 'Darkening', 0, 0.9, 0.01)]],
  ['Border', [seg('border.style', 'Style', BORDER_STYLES.map((t) => [t, t])), range('border.width', 'Width', 0, 14), range('border.radius', 'Corner radius', 0, 60), range('border.glow', 'Glow', 0, 50), color('border.color', 'Color (default is accent)')]],
  ['Tiers', [seg('tiers.style', 'Display style', TIER_STYLES.map((t) => [t, t])), toggle('tiers.showEmpty', 'Show modes with no tier'), toggle('tiers.highlightTop', 'Highlight best tier'), modesBlock]],
  ['Stats', [toggle('stats.showRank', 'Combat rank'), toggle('stats.showPoints', 'Total points'), toggle('stats.showRanked', 'Ranked modes count'), toggle('stats.showBest', 'Best tier'), toggle('stats.showProgress', 'Progress bar'),
    hint('Tiers and rank come from your server roles automatically.')]],
];

function build() {
  const active = Number(sessionStorage.getItem('bc_tab') || 0);
  $('#tabs').innerHTML = TABS.map(([n], i) => `<button class="tab ${i === active ? 'on' : ''}" data-i="${i}">${n}</button>`).join('');
  $('#panes').innerHTML = TABS.map(([, items], i) => `<div class="pane ${i === active ? 'on' : ''}" data-i="${i}">${items.map((c) => c.html()).join('')}</div>`).join('');
}
build();

$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('.tab'); if (!b) return;
  try { sessionStorage.setItem('bc_tab', b.dataset.i); } catch {}
  document.querySelectorAll('.tab,.pane').forEach((el) => el.classList.toggle('on', el.dataset.i === b.dataset.i));
});

const panes = $('#panes');
panes.addEventListener('click', (e) => {
  const sb = e.target.closest('[data-seg] button');
  if (sb) { const p = sb.parentElement.dataset.seg; set(cfg, p, sb.dataset.v); sb.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === sb));
    if (p === 'bg.type' && sb.dataset.v === 'image' && !cfg.bg.image) toast('Add an image link or upload below.');
    return changed(); }
  const th = e.target.closest('[data-theme]');
  if (th) { const t = THEMES[th.dataset.theme]; Object.assign(cfg.colors, t.colors); Object.assign(cfg.bg, t.bg); cfg.border.color = ''; build(); return changed(); }
  const cl = e.target.closest('[data-clear]');
  if (cl) { const k = cl.dataset.clear; if (k === 'bg') { cfg.bg.image = ''; if (cfg.bg.type === 'image') cfg.bg.type = 'gradient'; } if (k === 'banner') { cfg.banner.image = ''; if (cfg.banner.type === 'image') cfg.banner.type = 'gradient'; } if (k === 'avatar') { cfg.avatar.url = ''; cfg.avatar.source = 'discord'; } build(); changed(); }
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
  } catch (e) { toast(e.message || 'Could not read that image', true); }
}

render();
setStat(publishedAt ? 'Published card live' : 'Not published yet');
