// Layout designer: a full page for moving and resizing the parts of a card, then saving it to a slot
// or publishing it as a template. Opened from the editor (/designer?slot=N) or from a template (/designer?template=ID).
import { BLOCK_KEYS, BLOCK_LABELS, TEXT_BLOCKS, presetCustom, sanitizeCustom, CUSTOM_W, LAYOUTS, DEFAULT_CONFIG, sanitizeConfig, cardSize, drawCard, imageSources } from '/js/card-core.js';
import { loadFonts, loadImage, toast } from '/js/boot.js';
import { mountChrome, fillNavUser, icon, esc } from '/js/ui.js';
import { sfx } from '/js/sfx.js';

const $ = (s) => document.querySelector(s);
const clone = (o) => JSON.parse(JSON.stringify(o));
const SLOTS = 9;
const TEXTUAL = new Set(TEXT_BLOCKS);
mountChrome(); fillNavUser();

async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || 'failed'), { code: j.error }); return j;
}

const q = new URLSearchParams(location.search);
const r = await fetch('/api/me');
if (r.status === 401) { location.href = '/api/auth/login'; throw new Error('login'); }
const me = await r.json();
if (me.problem === 'not_in_server' || me.problem === 'no_rank') { location.href = '/editor'; throw new Error('locked'); }
await loadFonts();
$('#loading').hidden = true; $('#app').hidden = false;
$('#undo').innerHTML = icon('undo'); $('#redo').innerHTML = icon('redo');

const data = me.data;
const slots = (me.slots || []).map((s) => (s ? { config: sanitizeConfig(s.config) } : null));
while (slots.length < SLOTS) slots.push(null);

// which slot are we editing, and with which layout?
let slot = Number.isInteger(me.last) && me.last >= 0 && me.last < SLOTS ? me.last : Math.max(0, slots.findIndex(Boolean));
if (q.has('slot') && Number(q.get('slot')) >= 0 && Number(q.get('slot')) < SLOTS) slot = Number(q.get('slot'));
let remixName = '';
let tplCustom = null;
if (q.get('template')) {
  try { const j = await (await fetch('/api/templates?id=' + encodeURIComponent(q.get('template')))).json(); const t = (j.templates || [])[0]; if (t) { tplCustom = sanitizeCustom(t.custom); remixName = t.name; } } catch {}
  if (!tplCustom) toast('That template was not found.', true);
  else { const free = slots.findIndex((s) => !s); if (free >= 0) slot = free; }
}
let cfg = slots[slot] ? clone(slots[slot].config) : sanitizeConfig(clone(DEFAULT_CONFIG));
if (tplCustom) { cfg.layout = 'custom'; cfg.custom = tplCustom; }
else if (cfg.layout !== 'custom') { cfg.custom = presetCustom(['classic', 'split', 'compact', 'showcase'].includes(cfg.layout) ? cfg.layout : 'classic'); cfg.layout = 'custom'; }
$('#target').innerHTML = (slots[slot] ? `Saving will update <b>${esc((me.names || {})[slot] || 'Card ' + (slot + 1))}</b> (slot ${slot + 1}).` : `Saving will create a new card in slot ${slot + 1}.`) + (tplCustom ? ` Based on the template <b>${esc(remixName)}</b>.` : '');
let sel = 'avatar', dirty = !!tplCustom;

// ---------- history ----------
const hist = [JSON.stringify(cfg.custom)]; let hi = 0;
const syncHist = () => { $('#undo').disabled = hi <= 0; $('#redo').disabled = hi >= hist.length - 1; };
let histTimer;
function pushHist() { const s = JSON.stringify(cfg.custom); if (s === hist[hi]) return; hist.splice(hi + 1); hist.push(s); if (hist.length > 80) hist.shift(); hi = hist.length - 1; syncHist(); }
function goHist(d) { clearTimeout(histTimer); pushHist(); const n = hi + d; if (n < 0 || n >= hist.length) return; hi = n; cfg.custom = JSON.parse(hist[hi]); dirty = true; syncHist(); panel(); changed(true); }
$('#undo').onclick = () => goHist(-1); $('#redo').onclick = () => goHist(1);

// ---------- rendering ----------
const cv = $('#cv');
const ov = document.createElement('div'); ov.className = 'ov'; cv.parentElement.appendChild(ov);
let token = 0;
async function render() {
  const t = ++token, clean = sanitizeConfig(cfg), src = imageSources(clean, data);
  const [bg, banner, avatar] = await Promise.all([loadImage(src.bg), loadImage(src.banner), loadImage(src.avatar)]);
  if (t !== token) return;
  const { width, height } = cardSize(clean);
  if (cv.width !== width || cv.height !== height) { cv.width = width; cv.height = height; }
  drawCard(cv.getContext('2d'), clean, data, { bg, banner, avatar });
}
function changed(skipHist) {
  dirty = true; if (!skipHist) { clearTimeout(histTimer); histTimer = setTimeout(pushHist, 400); }
  render(); syncOverlay();
}

// ---------- drag / resize overlay ----------
const visH = (k, b) => (k === 'name' ? 108 * b.k : k === 'rank' ? 132 * b.k : k === 'stats' ? 26 * b.k : k === 'progress' ? Math.min(b.h, 30) + 28 : b.h);
function syncOverlay() {
  const H = cardSize(sanitizeConfig(cfg)).height, bl = cfg.custom.blocks;
  BLOCK_KEYS.forEach((k) => {
    let el = ov.querySelector(`[data-k="${k}"]`);
    if (!bl[k].on) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.className = 'blk'; el.dataset.k = k; el.innerHTML = `<span class="lbl">${esc(BLOCK_LABELS[k])}</span><i class="hd"></i>`; ov.appendChild(el); }
    el.classList.toggle('sel', k === sel);
    el.style.left = (bl[k].x / CUSTOM_W * 100) + '%'; el.style.top = (bl[k].y / H * 100) + '%';
    el.style.width = (bl[k].w / CUSTOM_W * 100) + '%'; el.style.height = (visH(k, bl[k]) / H * 100) + '%';
    el.style.zIndex = k === sel ? 5 : 1;
  });
}
let drag = null, raf = 0;
ov.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('.blk'); if (!el) return; e.preventDefault();
  const k = el.dataset.k; if (k !== sel) { sel = k; panel(); }
  drag = { k, resize: e.target.classList.contains('hd'), sx: e.clientX, sy: e.clientY, scale: CUSTOM_W / cv.getBoundingClientRect().width, o: { ...cfg.custom.blocks[k] }, id: e.pointerId };
  el.setPointerCapture(e.pointerId); clearTimeout(histTimer); pushHist(); syncOverlay();
});
ov.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = (e.clientX - drag.sx) * drag.scale, dy = (e.clientY - drag.sy) * drag.scale, o = drag.o, b = cfg.custom.blocks[drag.k], H = cardSize(sanitizeConfig(cfg)).height;
  if (!drag.resize) { b.x = Math.round(Math.min(CUSTOM_W - 20, Math.max(-o.w + 20, o.x + dx))); b.y = Math.round(Math.min(H - 10, Math.max(-20, o.y + dy))); }
  else if (drag.k === 'avatar') { b.w = Math.round(Math.max(40, o.w + Math.max(dx, dy))); b.h = b.w; }
  else if (TEXTUAL.has(drag.k)) { const f = Math.min(2.2 / o.k, Math.max(0.4 / o.k, (o.w + dx) / o.w)); b.w = Math.round(o.w * f); b.k = Math.round(o.k * f * 100) / 100; }
  else if (drag.k === 'progress') { b.w = Math.round(Math.max(60, o.w + dx)); b.h = Math.round(Math.min(24, Math.max(6, o.h + dy))); }
  else { b.w = Math.round(Math.max(40, o.w + dx)); b.h = Math.round(Math.max(30, o.h + dy)); }
  if (!raf) raf = requestAnimationFrame(() => { raf = 0; changed(); });
});
const endDrag = (e) => { if (drag && e.pointerId === drag.id) { drag = null; if (raf) { cancelAnimationFrame(raf); raf = 0; changed(); } } };
ov.addEventListener('pointerup', endDrag); ov.addEventListener('pointercancel', endDrag);

// ---------- controls ----------
function panel() {
  const b = cfg.custom.blocks[sel];
  const seg = (kind, items, cur) => `<div class="seg" data-act="${kind}">${items.map(([v, l]) => `<button data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;
  $('#panes').innerHTML = `
  <div class="group"><h4>Start from</h4>${seg('preset', ['classic', 'split', 'compact', 'showcase'].map((k) => [k, LAYOUTS[k].label]), '')}<p class="hint">Pick one to replace the current layout. Your colors, font and pictures stay.</p></div>
  <div class="group"><h4>Parts</h4>
    <p class="hint">Tap a part on the card or here, then drag it. Drag the square corner to resize.</p>
    ${seg('select', BLOCK_KEYS.map((k) => [k, BLOCK_LABELS[k] + (cfg.custom.blocks[k].on ? '' : ' (off)')]), sel)}
    <label class="toggle"><span>Show ${esc(BLOCK_LABELS[sel])}</span><input type="checkbox" data-act="on" ${b.on ? 'checked' : ''}><i class="sw"></i></label>
    ${TEXTUAL.has(sel) ? `<div class="ctl"><div class="lab">Text alignment</div>${seg('align', ['left', 'center', 'right'].map((a) => [a, a]), b.align)}</div>` : ''}
    ${sel === 'tiers' ? `<div class="ctl"><div class="lab">Columns</div>${seg('cols', [1, 2, 3, 4, 5].map((n) => [n, n]), b.cols)}</div>` : ''}
    <div class="ctl"><label>Card height<span class="val" id="hval">${cfg.custom.h}</span></label><input type="range" data-act="height" min="260" max="900" step="10" value="${cfg.custom.h}"></div>
  </div>
  <div class="group"><h4>Share as a template</h4>
    <p class="hint">Publish this layout so other players can use it or remix it. Only the positions are shared, never your colors or pictures.</p>
    <div class="ctl"><label>Template name</label><input type="text" id="tplname" maxlength="24" placeholder="My layout" value="${esc(remixName ? remixName + ' remix' : '')}"></div>
    <div class="ctl"><button class="btn sm primary" data-act="publish">Publish template</button> <a class="btn sm" href="/templates">Browse templates</a></div>
  </div>`;
}
$('#panes').addEventListener('click', async (e) => {
  const a = e.target.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act, v = e.target.closest('button')?.dataset.v, b = cfg.custom.blocks[sel];
  if (act === 'preset' && v) { clearTimeout(histTimer); pushHist(); cfg.custom = presetCustom(v); pushHist(); panel(); return changed(true); }
  if (act === 'select' && v) { sel = v; panel(); return syncOverlay(); }
  if (act === 'align' && v) { b.align = v; panel(); return changed(); }
  if (act === 'cols' && v) { b.cols = Number(v); panel(); return changed(); }
  if (act === 'publish') {
    const name = ($('#tplname').value || '').trim();
    if (name.length < 2) { sfx.error(); return toast('Give your template a name first.', true); }
    a.disabled = true;
    try { await post('/api/templates', { a: 'publish', name, custom: sanitizeCustom(cfg.custom) }); sfx.levelup(); toast('Template published! Everyone can use it now.'); }
    catch (err) { sfx.error(); const m = { login_required: 'Log in first.', not_in_server: 'Join the server first.', no_rank: 'You need a tier role to publish templates.', limit: 'You already have 5 templates. Ask staff to remove one.', slow_down: 'Slow down a little.', bad_name: 'Pick a different name.' }; toast(m[err.code] || 'Could not publish: ' + err.message, true); }
    a.disabled = false;
  }
});
$('#panes').addEventListener('change', (e) => { const a = e.target.closest('[data-act="on"]'); if (!a) return; cfg.custom.blocks[sel].on = a.checked; panel(); changed(); });
$('#panes').addEventListener('input', (e) => { const a = e.target.closest('[data-act="height"]'); if (!a) return; cfg.custom.h = Number(a.value); $('#hval').textContent = a.value; changed(); });

// ---------- save ----------
$('#save').onclick = async () => {
  const btn = $('#save'); btn.disabled = true; btn.textContent = 'Saving...';
  try { await post('/api/draft', { config: sanitizeConfig(cfg), slot }); dirty = false; sfx.levelup(); location.href = '/editor'; }
  catch (err) { sfx.error(); toast('Could not save: ' + err.message, true); btn.disabled = false; btn.textContent = 'Save to my card'; }
};
// publish + post the card to the server's cards channel (same as the editor's Post to Discord button)
$('#postdc').onclick = async () => {
  if (!me.canPost) { sfx.error(); return toast('Posting to Discord is not set up yet. Download the PNG and upload it in the server for now.', true); }
  const btn = $('#postdc'); btn.disabled = true; btn.textContent = 'Posting...';
  try {
    const j = await post('/api/publish', { config: sanitizeConfig(cfg), slot, post: true }); dirty = false;
    if (j.posted === 'ok') { sfx.levelup(); toast('Posted to Discord!'); }
    else if (j.posted === 'slow_down') { sfx.error(); toast('Saved and published, but you can post once every 5 minutes.', true); }
    else { sfx.error(); toast('Published, but the Discord post failed. Try again.', true); }
  } catch (err) {
    sfx.error(); const m = { not_in_server: 'Join the server first.', no_rank: 'You need a tier role to post.', stats_unavailable: 'Could not read your roles. Try again soon.' };
    toast(m[err.code] || 'Could not post: ' + err.message, true);
  }
  btn.disabled = false; btn.textContent = 'Post to Discord';
};
$('#dl').innerHTML = icon('download') + 'PNG';
$('#dl').onclick = () => cv.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'battlecard.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); });
$('#back').onclick = (e) => { if (dirty && !confirm('Leave without saving your layout changes?')) e.preventDefault(); else dirty = false; };
addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

syncHist(); panel(); render(); syncOverlay();
