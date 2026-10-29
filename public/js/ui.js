// shared chrome: navigation, footer, pixel sprites, sound toggle
import { sfx } from '/js/sfx.js';

export const ICONS = {
  sword: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/>',
  palette: '<path d="M4 20l1-6L15 4l5 5L10 19l-6 1zM13 6l5 5"/>',
  layout: '<rect x="3" y="3" width="18" height="18"/><path d="M3 9h18M9 21V9"/>',
  image: '<rect x="3" y="3" width="18" height="18"/><path d="m3 17 5-5 4 4 3-3 6 6M8 9h.01"/>',
  type: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
  user: '<rect x="8" y="3" width="8" height="8"/><path d="M4 21v-4h16v4"/>',
  frame: '<rect x="3" y="3" width="18" height="18"/><rect x="8" y="8" width="8" height="8"/>',
  trophy: '<path d="M7 4h10v6a5 5 0 0 1-10 0V4zM7 6H3v2a3 3 0 0 0 4 2M17 6h4v2a3 3 0 0 1-4 2M12 15v4M8 21h8"/>',
  chart: '<path d="M3 3v18h18M7 15v3M12 10v8M17 6v12"/>',
  link: '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',
  download: '<path d="M12 3v12m0 0-5-5m5 5 5-5M4 21h16"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  copy: '<rect x="9" y="9" width="12" height="12"/><path d="M5 15H3V3h12v2"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
  edit: '<path d="M4 20h4L20 8l-4-4L4 16v4z"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m21 21-6-6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  sound: '<path d="M4 9v6h4l5 4V5L8 9H4zM17 8a5 5 0 0 1 0 8"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9H4zM17 9l5 6M22 9l-5 6"/>',
  lock: '<rect x="4" y="11" width="16" height="10"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
};
export const icon = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// gem sprites (10x10 pixel art, drawn as crisp SVG rects)
const GEM = ['...kkkk...', '..kcwccck.', '.kcwcccCck', 'kcwccccCCk', 'kccccccCCk', '.kccccCCk.', '..kccCCk..', '...kcCk...', '....kk....'];
const GEMS = {
  diamond: { c: '#4eeedb', C: '#1fa99a', w: '#d8fff9' }, emerald: { c: '#3fe07a', C: '#12873f', w: '#c9ffd9' },
  gold: { c: '#ffd452', C: '#c28f0a', w: '#fff3b8' }, redstone: { c: '#ee4b4b', C: '#8f1d22', w: '#ffb3b3' },
  lapis: { c: '#4a78ff', C: '#1f3da8', w: '#bcd0ff' }, amethyst: { c: '#c077ff', C: '#6d2fb5', w: '#e9ccff' },
};
export function gem(name = 'diamond', size = 40) {
  const p = { ...GEMS[name], k: '#0b0b0d' }; let r = '';
  GEM.forEach((row, y) => [...row].forEach((ch, x) => { if (p[ch]) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${p[ch]}"/>`; }));
  return `<svg class="gem" width="${size}" height="${size}" viewBox="0 0 10 10" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}

const LINKS = [['/rankings', 'Rankings'], ['/gallery', 'Gallery'], ['/how-it-works', 'How it works'], ['/faq', 'FAQ'], ['/commands', 'Commands']];
function navHTML() {
  const here = location.pathname.replace(/\/$/, '').replace(/\.html$/, '');
  return `<header class="nav"><div class="wrap">
    <a class="logo" href="/"><img src="/favicon.svg" alt="">AxR<b>CARDS</b></a>
    <nav class="nav-links">${LINKS.map(([h, l]) => `<a href="${h}" class="${here === h ? 'on' : ''}">${l}</a>`).join('')}</nav>
    <div class="nav-right" id="navright"></div>
    <button class="iconsq" id="sfxbtn" aria-label="Toggle sound" title="Sound"></button>
    <button class="iconsq burger" id="burger" aria-label="Menu" aria-expanded="false">${icon('menu')}</button>
  </div></header>`;
}
function footHTML() {
  return `<div class="wrap"><div class="foot-grid">
    <div class="brandcol"><a class="logo" href="/"><img src="/favicon.svg" alt="">AxR<b>CARDS</b></a><p style="margin-top:14px;max-width:320px">Custom Battle Cards for the AxR Rankings Minecraft PvP community.</p></div>
    <div><h4>Explore</h4><a href="/rankings">Rankings</a><a href="/gallery">Gallery</a><a href="/editor">Card editor</a></div>
    <div><h4>Learn</h4><a href="/how-it-works">How it works</a><a href="/faq">FAQ</a><a href="/commands">Bot commands</a></div>
    <div><h4>Legal</h4><a href="/privacy">Privacy &amp; terms</a></div>
  </div><div class="small"><span>&copy; AxR Rankings</span><span>Not affiliated with Mojang Studios, Microsoft or Discord.</span></div></div>`;
}

function syncSfxBtn() { const b = document.getElementById('sfxbtn'); if (b) { b.innerHTML = icon(sfx.muted ? 'mute' : 'sound'); b.title = sfx.muted ? 'Sound off' : 'Sound on'; } }

export function mountChrome() {
  const n = document.getElementById('nav'); if (n) n.innerHTML = navHTML();
  const f = document.getElementById('footer'); if (f) f.innerHTML = footHTML();
  syncSfxBtn();
}
document.addEventListener('click', (e) => {
  const nav = document.querySelector('.nav');
  if (e.target.closest('#sfxbtn')) { sfx.setMuted(!sfx.muted); syncSfxBtn(); if (!sfx.muted) sfx.pop(); return; }
  if (!nav) return;
  const b = e.target.closest('#burger');
  if (b) { const open = nav.classList.toggle('open'); b.setAttribute('aria-expanded', String(open)); return; }
  if (e.target.closest('.nav-links a') || !e.target.closest('.nav')) nav.classList.remove('open');
});

// Login button or the signed-in chip; resolves to { user } or null
export async function fillNavUser() {
  const el = document.getElementById('navright'); if (!el) return null;
  try {
    const r = await fetch('/api/me?lite=1'); if (!r.ok) throw 0;
    const m = await r.json();
    el.innerHTML = `<a class="btn sm primary" href="/editor">Editor</a><span class="who">${m.avatarUrl ? `<img src="${esc(m.avatarUrl)}" alt="">` : ''}<span>${esc(m.user.username)}</span></span>`;
    return m;
  } catch {
    el.innerHTML = `<a class="btn sm discord" href="/api/auth/login">Login</a>`;
    return null;
  }
}
