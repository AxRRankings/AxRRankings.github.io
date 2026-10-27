// shared helpers for the pages
import { FONTS } from '/js/card-core.js';

export async function loadFonts() {
  const jobs = Object.values(FONTS).map(async (f) => {
    try {
      const face = new FontFace(f.family, `url(/fonts/${f.file})`, { weight: '100 900' });
      await face.load(); document.fonts.add(face);
    } catch (e) { console.warn('font failed', f.file); }
  });
  await Promise.all(jobs);
}

const cache = new Map();
export function loadImage(src, proxy = true) {
  if (!src) return Promise.resolve(null);
  const url = proxy && /^https?:/i.test(src) ? `/api/imgproxy?u=${encodeURIComponent(src)}` : src;
  if (cache.has(url)) return cache.get(url);
  const p = new Promise((res) => {
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => res(im); im.onerror = () => res(null); im.src = url;
  });
  cache.set(url, p); return p;
}

export function toast(msg, err = false) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.className = 'toast show' + (err ? ' err' : '');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2800);
}
