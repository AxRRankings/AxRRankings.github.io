// Draws a small blocky night landscape to a low-res canvas; CSS scales it up with pixelated rendering.
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function drawScape(canvas, { w = 192, h = 108, seed = 11 } = {}) {
  canvas.width = w; canvas.height = h;
  const c = canvas.getContext('2d'); const r = rng(seed);
  const px = (x, y, col, ww = 1, hh = 1) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), ww, hh); };
  // sky in hard bands
  const bands = ['#0a0e27', '#0e1433', '#131b42', '#1a2352', '#243062', '#33407a', '#4a4f90', '#6e5d94', '#a56a8e', '#d98a79'];
  const skyH = Math.floor(h * 0.78);
  bands.forEach((col, i) => px(0, Math.floor(i * skyH / bands.length), col, w, Math.ceil(skyH / bands.length) + 1));
  // stars
  for (let i = 0; i < 70; i++) { const y = Math.floor(r() * h * 0.5); px(Math.floor(r() * w), y, r() > 0.8 ? '#ffffff' : '#9aa6d8'); }
  // moon
  const mx = Math.floor(w * 0.78), my = 12;
  px(mx, my, '#f4f1de', 9, 9); px(mx + 1, my + 1, '#fffdf2', 4, 4); px(mx + 5, my + 5, '#d9d4bb', 3, 3);
  // clouds
  for (let i = 0; i < 6; i++) { const cx = Math.floor(r() * w), cy = 18 + Math.floor(r() * 26), cw = 14 + Math.floor(r() * 22); px(cx, cy, 'rgba(255,255,255,.12)', cw, 3); px(cx + 3, cy - 2, 'rgba(255,255,255,.12)', cw - 8, 2); }
  // terrain heights from smoothed noise
  const base = h * 0.66; const hts = []; let hgt = base;
  for (let x = 0; x < w; x++) { hgt += (r() - 0.5) * 2.2; hgt += (base - hgt) * 0.04; hts.push(Math.round(hgt)); }
  // far hills
  for (let x = 0; x < w; x++) { const t = Math.round(base - 9 + Math.sin(x / 11) * 5 + Math.sin(x / 5) * 1.5); px(x, t, '#1b2447', 1, h - t); }
  for (let x = 0; x < w; x++) { const t = Math.round(base - 3 + Math.sin(x / 8 + 2) * 4); px(x, t, '#172a3a', 1, h - t); }
  // near terrain: grass, dirt, stone, ores
  for (let x = 0; x < w; x++) {
    const t = hts[x];
    px(x, t, '#5fbf3a'); px(x, t + 1, '#4a9a2d');
    for (let y = t + 2; y < t + 6; y++) px(x, y, (x + y) % 5 === 0 ? '#5d3f23' : '#7a5230');
    for (let y = t + 6; y < h; y++) {
      const n = r(); let col = n < 0.1 ? '#6b6b73' : n < 0.2 ? '#4f4f56' : '#5d5d65';
      if (n > 0.985) col = '#4eeedb'; else if (n > 0.972) col = '#e0c9a6'; else if (n > 0.962) col = '#ee4b4b'; else if (n > 0.95) col = '#2b2b2f';
      px(x, y, col);
    }
  }
  // trees
  for (let i = 0; i < 9; i++) {
    const x = 6 + Math.floor(r() * (w - 14)); const t = hts[x];
    px(x, t - 6, '#5b3d1f', 2, 6); px(x - 2, t - 11, '#2f7d2a', 6, 5); px(x - 1, t - 13, '#3b9a35', 4, 2); px(x - 2, t - 11, '#256322', 6, 1);
  }
  // torch glow
  const tx = 20, ty = hts[tx] - 4; px(tx, ty, '#7a5230', 1, 4); px(tx, ty - 1, '#ffd452'); px(tx - 1, ty - 1, 'rgba(255,170,60,.4)', 3, 1);
}
