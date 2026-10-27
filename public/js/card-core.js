// ============================================================================
//  card-core.js  -  shared by the browser (live preview) and the server (PNG).
//  It only uses the standard Canvas 2D API, so the editor preview and the
//  image Discord receives are drawn by exactly the same code.
// ============================================================================

export const MODES = [
  { key: 'SWORD',   label: 'SWORD'   },
  { key: 'AXE',     label: 'AXE'     },
  { key: 'UHC',     label: 'UHC'     },
  { key: 'DPOT',    label: 'DPOT'    },
  { key: 'NPOT',    label: 'NPOT'    },
  { key: 'SMP',     label: 'SMP'     },
  { key: 'SMACE',   label: 'SMACE'   },
  { key: 'EMACE',   label: 'EMACE'   },
  { key: 'CART',    label: 'CART'    },
  { key: 'CRYSTAL', label: 'CRYSTAL' },
];
export const MODE_KEYS = MODES.map((m) => m.key);

export const TIERS = ['HT1', 'LT1', 'HT2', 'LT2', 'HT3', 'LT3', 'HT4', 'LT4', 'HT5', 'LT5'];
export const TIER_POINTS = { HT1: 100, LT1: 75, HT2: 50, LT2: 30, HT3: 20, LT3: 10, HT4: 5, LT4: 3, HT5: 2, LT5: 1 };
export const TIER_COLORS = {
  HT1: '#FFD700', LT1: '#E6C200', HT2: '#FF8C00', LT2: '#E67E22', HT3: '#B26BE0',
  LT3: '#9B59B6', HT4: '#3FA2F2', LT4: '#2E86C1', HT5: '#2ECC71', LT5: '#27AE60',
};

export const COMBAT_RANKS = [
  { name: 'Newbie',      min: 0,   max: 4,    color: '#9AA5B1' },
  { name: 'Amateur',     min: 5,   max: 9,    color: '#7BD389' },
  { name: 'Veteran',     min: 10,  max: 19,   color: '#4FD1C5' },
  { name: 'Pro',         min: 20,  max: 49,   color: '#4DA3FF' },
  { name: 'Elite',       min: 50,  max: 99,   color: '#9B7BFF' },
  { name: 'Ace',         min: 100, max: 199,  color: '#E066FF' },
  { name: 'Apex',        min: 200, max: 299,  color: '#FF6B9A' },
  { name: 'Champion',    min: 300, max: 499,  color: '#FF9A3D' },
  { name: 'Master',      min: 500, max: 799,  color: '#FFC83D' },
  { name: 'Grandmaster', min: 800, max: 1000, color: '#FFE45E' },
];

export function rankForPoints(points) {
  const p = Math.max(0, Math.floor(points || 0));
  let idx = 0;
  for (let i = 0; i < COMBAT_RANKS.length; i++) if (p >= COMBAT_RANKS[i].min) idx = i;
  const r = COMBAT_RANKS[idx];
  const next = COMBAT_RANKS[idx + 1] || null;
  return { ...r, index: idx, next: next ? next.name : null, nextMin: next ? next.min : null };
}

// Builds the "data" object the card is drawn from, out of a { MODE: 'HT3' } map.
export function buildCardData({ name, handle, tiers, avatarInitial }) {
  const clean = {};
  let points = 0;
  let ranked = 0;
  let best = null;
  for (const m of MODE_KEYS) {
    const t = tiers && TIERS.includes(tiers[m]) ? tiers[m] : null;
    clean[m] = t;
    if (t) {
      points += TIER_POINTS[t];
      ranked++;
      if (!best || TIER_POINTS[t] > TIER_POINTS[best]) best = t;
    }
  }
  return {
    name: name || 'Player',
    handle: handle || '',
    avatarInitial: (avatarInitial || name || 'P').trim().charAt(0).toUpperCase() || 'P',
    tiers: clean,
    points,
    ranked,
    best,
    rank: rankForPoints(points),
  };
}

// ----------------------------------------------------------------------------
//  Fonts (file names live in /public/fonts; family names are used by both sides)
// ----------------------------------------------------------------------------
export const FONTS = {
  orbitron:  { label: 'Orbitron',       family: 'BC Orbitron',      file: 'Orbitron.ttf',        scale: 0.88 },
  rajdhani:  { label: 'Rajdhani',       family: 'BC Rajdhani',      file: 'RajdhaniBold.ttf',    scale: 1.08 },
  press:     { label: 'Press Start 2P', family: 'BC Press Start',   file: 'PressStart2P.ttf',    scale: 0.6  },
  russo:     { label: 'Russo One',      family: 'BC Russo One',     file: 'RussoOne.ttf',        scale: 0.95 },
  audiowide: { label: 'Audiowide',      family: 'BC Audiowide',     file: 'Audiowide.ttf',       scale: 0.9  },
  chakra:    { label: 'Chakra Petch',   family: 'BC Chakra Petch',  file: 'ChakraPetchBold.ttf', scale: 1.0  },
  mono:      { label: 'Share Tech Mono',family: 'BC Share Tech',    file: 'ShareTechMono.ttf',   scale: 1.05 },
};

export const LAYOUTS = {
  classic:  { label: 'Classic',  w: 1000, h: 620 },
  split:    { label: 'Split',    w: 1000, h: 560 },
  compact:  { label: 'Compact',  w: 1000, h: 310 },
  showcase: { label: 'Showcase', w: 1000, h: 640 },
};

export const PATTERNS = ['none', 'grid', 'dots', 'diagonal', 'scanlines', 'blocks'];
export const AVATAR_SHAPES = ['circle', 'rounded', 'square', 'diamond'];
export const BORDER_STYLES = ['none', 'solid', 'neon', 'double', 'dashed', 'corners'];
export const TIER_STYLES = ['chips', 'blocks', 'list'];
export const BG_TYPES = ['gradient', 'solid', 'image'];
export const BANNER_TYPES = ['gradient', 'image', 'none'];

// ----------------------------------------------------------------------------
//  Default config + theme presets
// ----------------------------------------------------------------------------
export const DEFAULT_CONFIG = {
  v: 1,
  layout: 'classic',
  font: 'orbitron',
  bg: {
    type: 'gradient', color1: '#0A0F1E', color2: '#150A2E', angle: 135,
    pattern: 'grid', patternColor: '#00E5FF', patternOpacity: 0.07,
    image: '', imageDim: 0.45,
  },
  colors: {
    accent: '#00E5FF', accent2: '#B026FF', text: '#FFFFFF', subtext: '#9FB3C8',
    panel: '#0B1224', panelOpacity: 0.72,
  },
  avatar: { source: 'discord', url: '', shape: 'rounded', size: 100, ring: true, glow: 22 },
  banner: { type: 'gradient', image: '', dim: 0.35 },
  border: { style: 'neon', width: 4, radius: 28, glow: 26, color: '' },
  tiers: { style: 'chips', showEmpty: true, highlightTop: true, modes: MODE_KEYS.slice() },
  stats: { showPoints: true, showRank: true, showRanked: true, showBest: true, showProgress: true, tagline: 'Ready to fight.' },
};

export const THEMES = {
  'Neon Cyan': {
    colors: { accent: '#00E5FF', accent2: '#B026FF' },
    bg: { color1: '#0A0F1E', color2: '#150A2E', patternColor: '#00E5FF' },
  },
  'Redstone': {
    colors: { accent: '#FF3B3B', accent2: '#FF9A3D' },
    bg: { color1: '#16080A', color2: '#2A0D0D', patternColor: '#FF3B3B' },
  },
  'Emerald': {
    colors: { accent: '#2EFF9A', accent2: '#00B8D4' },
    bg: { color1: '#061410', color2: '#082A22', patternColor: '#2EFF9A' },
  },
  'Ender': {
    colors: { accent: '#C77DFF', accent2: '#7B2CFF' },
    bg: { color1: '#0D0618', color2: '#1B0B35', patternColor: '#C77DFF' },
  },
  'Gold Rush': {
    colors: { accent: '#FFD60A', accent2: '#FF8C00' },
    bg: { color1: '#14100A', color2: '#2A1D08', patternColor: '#FFD60A' },
  },
  'Frostbite': {
    colors: { accent: '#7DF9FF', accent2: '#4D8BFF' },
    bg: { color1: '#07121E', color2: '#0B2540', patternColor: '#7DF9FF' },
  },
};

// ----------------------------------------------------------------------------
//  Sanitizer: the ONLY way a config reaches the renderer. Everything is
//  clamped / whitelisted so no user input can break the image or the server.
// ----------------------------------------------------------------------------
const HEX = /^#[0-9a-fA-F]{6}$/;
const DATA_IMG = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
export const MAX_DATA_URI = 200000;

const pickEnum = (v, list, d) => (list.includes(v) ? v : d);
const hex = (v, d) => (typeof v === 'string' && HEX.test(v) ? v.toUpperCase() : d);
const num = (v, min, max, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};
const bool = (v, d) => (typeof v === 'boolean' ? v : d);
const text = (v, max, d) => {
  if (typeof v !== 'string') return d;
  // strip control characters; the fonts only cover Latin anyway
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u001F\u007F]/g, '').slice(0, max);
};
function imageRef(v) {
  if (typeof v !== 'string' || !v) return '';
  if (v.length <= MAX_DATA_URI && DATA_IMG.test(v)) return v;
  if (v.length <= 600 && /^https:\/\/[^\s"'<>]+$/.test(v)) return v;
  return '';
}

export function sanitizeConfig(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const D = DEFAULT_CONFIG;
  const bg = r.bg || {}, co = r.colors || {}, av = r.avatar || {}, ba = r.banner || {};
  const bo = r.border || {}, ti = r.tiers || {}, st = r.stats || {};
  let modes = Array.isArray(ti.modes) ? ti.modes.filter((m) => MODE_KEYS.includes(m)) : D.tiers.modes;
  modes = MODE_KEYS.filter((m) => modes.includes(m));
  return {
    v: 1,
    layout: pickEnum(r.layout, Object.keys(LAYOUTS), D.layout),
    font: pickEnum(r.font, Object.keys(FONTS), D.font),
    bg: {
      type: pickEnum(bg.type, BG_TYPES, D.bg.type),
      color1: hex(bg.color1, D.bg.color1), color2: hex(bg.color2, D.bg.color2),
      angle: Math.round(num(bg.angle, 0, 360, D.bg.angle)),
      pattern: pickEnum(bg.pattern, PATTERNS, D.bg.pattern),
      patternColor: hex(bg.patternColor, D.bg.patternColor),
      patternOpacity: num(bg.patternOpacity, 0, 0.5, D.bg.patternOpacity),
      image: imageRef(bg.image), imageDim: num(bg.imageDim, 0, 0.9, D.bg.imageDim),
    },
    colors: {
      accent: hex(co.accent, D.colors.accent), accent2: hex(co.accent2, D.colors.accent2),
      text: hex(co.text, D.colors.text), subtext: hex(co.subtext, D.colors.subtext),
      panel: hex(co.panel, D.colors.panel), panelOpacity: num(co.panelOpacity, 0, 1, D.colors.panelOpacity),
    },
    avatar: {
      source: pickEnum(av.source, ['discord', 'url', 'upload'], D.avatar.source),
      url: imageRef(av.url),
      shape: pickEnum(av.shape, AVATAR_SHAPES, D.avatar.shape),
      size: Math.round(num(av.size, 70, 130, D.avatar.size)),
      ring: bool(av.ring, D.avatar.ring), glow: Math.round(num(av.glow, 0, 50, D.avatar.glow)),
    },
    banner: {
      type: pickEnum(ba.type, BANNER_TYPES, D.banner.type),
      image: imageRef(ba.image), dim: num(ba.dim, 0, 0.9, D.banner.dim),
    },
    border: {
      style: pickEnum(bo.style, BORDER_STYLES, D.border.style),
      width: Math.round(num(bo.width, 1, 14, D.border.width)),
      radius: Math.round(num(bo.radius, 0, 60, D.border.radius)),
      glow: Math.round(num(bo.glow, 0, 60, D.border.glow)),
      color: bo.color === '' ? '' : hex(bo.color, ''),
    },
    tiers: {
      style: pickEnum(ti.style, TIER_STYLES, D.tiers.style),
      showEmpty: bool(ti.showEmpty, D.tiers.showEmpty),
      highlightTop: bool(ti.highlightTop, D.tiers.highlightTop),
      modes: modes.length ? modes : D.tiers.modes,
    },
    stats: {
      showPoints: bool(st.showPoints, D.stats.showPoints), showRank: bool(st.showRank, D.stats.showRank),
      showRanked: bool(st.showRanked, D.stats.showRanked), showBest: bool(st.showBest, D.stats.showBest),
      showProgress: bool(st.showProgress, D.stats.showProgress),
      tagline: text(st.tagline, 44, D.stats.tagline),
    },
  };
}

export function cardSize(cfg) {
  const l = LAYOUTS[cfg.layout] || LAYOUTS.classic;
  return { width: l.w, height: l.h };
}

// ----------------------------------------------------------------------------
//  Drawing helpers
// ----------------------------------------------------------------------------
function rgba(h, a) {
  const n = parseInt(h.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function mix(h1, h2, t) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const c = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}
function rr(ctx, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.arcTo(x + w, y, x + w, y + rad, rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad);
  ctx.lineTo(x + rad, y + h);
  ctx.arcTo(x, y + h, x, y + h - rad, rad);
  ctx.lineTo(x, y + rad);
  ctx.arcTo(x, y, x + rad, y, rad);
  ctx.closePath();
}
function linearFromAngle(ctx, x, y, w, h, angle, c1, c2) {
  const a = ((angle - 90) * Math.PI) / 180;
  const cx = x + w / 2, cy = y + h / 2;
  const len = Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a));
  const dx = (Math.cos(a) * len) / 2, dy = (Math.sin(a) * len) / 2;
  const g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  return g;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function fontStr(cfg, px) {
  const f = FONTS[cfg.font] || FONTS.orbitron;
  return `${Math.max(6, Math.round(px * f.scale))}px "${f.family}"`;
}
function setFont(ctx, cfg, px) { ctx.font = fontStr(cfg, px); }
// shrink the text until it fits maxW
function fitText(ctx, cfg, str, maxW, px, minPx = 10) {
  let s = px;
  setFont(ctx, cfg, s);
  while (s > minPx && ctx.measureText(str).width > maxW) { s -= 1; setFont(ctx, cfg, s); }
  return s;
}
function ellipsize(ctx, str, maxW) {
  if (ctx.measureText(str).width <= maxW) return str;
  let s = str;
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
  return s + '…';
}
function drawCover(ctx, img, x, y, w, h) {
  const iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight;
  if (!iw || !ih) return;
  const s = Math.max(w / iw, h / ih);
  const sw = w / s, sh = h / s;
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
}

function drawPattern(ctx, cfg, x, y, w, h) {
  const { pattern, patternColor, patternOpacity } = cfg.bg;
  if (pattern === 'none' || patternOpacity <= 0) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = rgba(patternColor, patternOpacity);
  ctx.fillStyle = rgba(patternColor, patternOpacity);
  ctx.lineWidth = 1;
  if (pattern === 'grid') {
    for (let i = x; i <= x + w; i += 40) { ctx.beginPath(); ctx.moveTo(i, y); ctx.lineTo(i, y + h); ctx.stroke(); }
    for (let j = y; j <= y + h; j += 40) { ctx.beginPath(); ctx.moveTo(x, j); ctx.lineTo(x + w, j); ctx.stroke(); }
  } else if (pattern === 'dots') {
    for (let i = x + 20; i < x + w; i += 30) for (let j = y + 20; j < y + h; j += 30) { ctx.beginPath(); ctx.arc(i, j, 2, 0, Math.PI * 2); ctx.fill(); }
  } else if (pattern === 'diagonal') {
    for (let i = x - h; i < x + w; i += 28) { ctx.beginPath(); ctx.moveTo(i, y + h); ctx.lineTo(i + h, y); ctx.stroke(); }
  } else if (pattern === 'scanlines') {
    for (let j = y; j < y + h; j += 6) { ctx.beginPath(); ctx.moveTo(x, j); ctx.lineTo(x + w, j); ctx.stroke(); }
  } else if (pattern === 'blocks') {
    const rand = rng(1337);
    for (let i = x; i < x + w; i += 24) for (let j = y; j < y + h; j += 24) {
      if (rand() < 0.28) { ctx.fillStyle = rgba(patternColor, patternOpacity * (0.3 + rand() * 0.9)); ctx.fillRect(i + 1, j + 1, 22, 22); }
    }
  }
  ctx.restore();
}

function drawBackground(ctx, cfg, W, H, imgs) {
  const b = cfg.bg;
  if (b.type === 'solid') { ctx.fillStyle = b.color1; ctx.fillRect(0, 0, W, H); }
  else if (b.type === 'image' && imgs.bg) {
    ctx.fillStyle = b.color1; ctx.fillRect(0, 0, W, H);
    drawCover(ctx, imgs.bg, 0, 0, W, H);
    ctx.fillStyle = `rgba(4,6,14,${b.imageDim})`; ctx.fillRect(0, 0, W, H);
  } else { ctx.fillStyle = linearFromAngle(ctx, 0, 0, W, H, b.angle, b.color1, b.color2); ctx.fillRect(0, 0, W, H); }
  // soft accent glows in the corners
  const g1 = ctx.createRadialGradient(W * 0.12, H * 0.05, 0, W * 0.12, H * 0.05, W * 0.55);
  g1.addColorStop(0, rgba(cfg.colors.accent, 0.16)); g1.addColorStop(1, rgba(cfg.colors.accent, 0));
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
  const g2 = ctx.createRadialGradient(W * 0.95, H * 0.98, 0, W * 0.95, H * 0.98, W * 0.5);
  g2.addColorStop(0, rgba(cfg.colors.accent2, 0.16)); g2.addColorStop(1, rgba(cfg.colors.accent2, 0));
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  drawPattern(ctx, cfg, 0, 0, W, H);
}

function drawBanner(ctx, cfg, x, y, w, h, imgs) {
  const ba = cfg.banner;
  if (ba.type === 'none') return;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (ba.type === 'image' && imgs.banner) {
    drawCover(ctx, imgs.banner, x, y, w, h);
    ctx.fillStyle = `rgba(4,6,14,${ba.dim})`; ctx.fillRect(x, y, w, h);
  } else {
    ctx.fillStyle = linearFromAngle(ctx, x, y, w, h, 100, rgba(cfg.colors.accent, 0.85), rgba(cfg.colors.accent2, 0.85));
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2;
    for (let i = x - h; i < x + w; i += 34) { ctx.beginPath(); ctx.moveTo(i, y + h); ctx.lineTo(i + h, y); ctx.stroke(); }
    ctx.fillStyle = `rgba(4,6,14,${ba.dim * 0.6})`; ctx.fillRect(x, y, w, h);
  }
  // fade into the card
  const f = ctx.createLinearGradient(0, y + h - 70, 0, y + h);
  f.addColorStop(0, 'rgba(0,0,0,0)'); f.addColorStop(1, rgba(cfg.bg.color1, 0.9));
  ctx.fillStyle = f; ctx.fillRect(x, y + h - 70, w, 70);
  ctx.restore();
}

function avatarPath(ctx, shape, x, y, s) {
  if (shape === 'circle') { ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2); ctx.closePath(); }
  else if (shape === 'square') rr(ctx, x, y, s, s, 6);
  else if (shape === 'diamond') {
    const c = s * 0.16;
    ctx.beginPath(); ctx.moveTo(x + c, y); ctx.lineTo(x + s - c, y); ctx.lineTo(x + s, y + c);
    ctx.lineTo(x + s, y + s - c); ctx.lineTo(x + s - c, y + s); ctx.lineTo(x + c, y + s);
    ctx.lineTo(x, y + s - c); ctx.lineTo(x, y + c); ctx.closePath();
  } else rr(ctx, x, y, s, s, s * 0.22);
}

function drawAvatar(ctx, cfg, data, imgs, x, y, s) {
  const a = cfg.avatar;
  ctx.save();
  if (a.glow > 0) {
    ctx.shadowColor = cfg.colors.accent; ctx.shadowBlur = a.glow;
    avatarPath(ctx, a.shape, x, y, s); ctx.fillStyle = '#0B1224'; ctx.fill();
  }
  ctx.restore();
  ctx.save();
  avatarPath(ctx, a.shape, x, y, s); ctx.clip();
  if (imgs.avatar) drawCover(ctx, imgs.avatar, x, y, s, s);
  else {
    ctx.fillStyle = linearFromAngle(ctx, x, y, s, s, 135, cfg.colors.accent, cfg.colors.accent2); ctx.fillRect(x, y, s, s);
    ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    setFont(ctx, cfg, s * 0.5); ctx.fillText(data.avatarInitial, x + s / 2, y + s / 2 + 2);
  }
  ctx.restore();
  if (a.ring) {
    ctx.save();
    avatarPath(ctx, a.shape, x, y, s);
    ctx.lineWidth = 4; ctx.strokeStyle = cfg.colors.accent; ctx.stroke();
    ctx.restore();
  }
}

function panel(ctx, cfg, x, y, w, h, r = 16) {
  ctx.save();
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = rgba(cfg.colors.panel, cfg.colors.panelOpacity); ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(cfg.colors.accent, 0.28); ctx.stroke();
  ctx.restore();
}

function pill(ctx, cfg, str, x, y, color, px = 20, align = 'left') {
  ctx.save();
  setFont(ctx, cfg, px);
  const tw = ctx.measureText(str).width;
  const padX = 16, h = px * 1.9;
  const w = tw + padX * 2;
  const px0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  rr(ctx, px0, y, w, h, h / 2);
  ctx.fillStyle = rgba(color, 0.16); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.stroke();
  ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(str, px0 + padX, y + h / 2 + 1);
  ctx.restore();
  return { x: px0, w, h };
}

function progressBar(ctx, cfg, data, x, y, w, h) {
  const r = data.rank;
  ctx.save();
  rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill();
  let frac = 1;
  if (r.next) frac = Math.min(1, Math.max(0, (data.points - r.min) / (r.nextMin - r.min)));
  if (frac > 0) {
    ctx.save(); rr(ctx, x, y, w, h, h / 2); ctx.clip();
    ctx.fillStyle = linearFromAngle(ctx, x, y, w, h, 90, cfg.colors.accent, cfg.colors.accent2);
    ctx.fillRect(x, y, Math.max(h, w * frac), h); ctx.restore();
  }
  ctx.restore();
  ctx.save();
  setFont(ctx, cfg, 15); ctx.fillStyle = cfg.colors.subtext; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  const label = r.next ? `${data.points} / ${r.nextMin} to ${r.next}` : 'MAX RANK';
  ctx.fillText(label, x, y + h + 8);
  ctx.restore();
}

// ----------------------------------------------------------------------------
//  Tier cells
// ----------------------------------------------------------------------------
function tierColor(t) { return t ? TIER_COLORS[t] : '#6B7686'; }

function drawTierCell(ctx, cfg, style, x, y, w, h, mode, tier, top) {
  const c = tierColor(tier);
  ctx.save();
  if (top && cfg.tiers.highlightTop && tier) {
    ctx.save();
    ctx.shadowColor = c; ctx.shadowBlur = 20;
    rr(ctx, x, y, w, h, style === 'list' ? 10 : style === 'blocks' ? 12 : 14);
    ctx.fillStyle = '#0B1224'; ctx.fill();
    ctx.restore();
  }
  if (style === 'blocks') {
    rr(ctx, x, y, w, h, 12);
    ctx.fillStyle = tier ? rgba(c, 0.18) : rgba(cfg.colors.panel, 0.55); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = tier ? 2.5 : 1.5; ctx.strokeStyle = tier ? c : 'rgba(255,255,255,0.14)'; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = tier ? c : '#6B7686';
    const s = fitText(ctx, cfg, tier || '—', w - 16, Math.min(h * 0.46, 40), 12);
    ctx.fillText(tier || '—', x + w / 2, y + h * 0.4);
    fitText(ctx, cfg, mode, w - 14, Math.min(16, h * 0.2), 8); ctx.fillStyle = cfg.colors.subtext;
    ctx.fillText(mode, x + w / 2, y + h * 0.78);
    void s;
  } else if (style === 'list') {
    rr(ctx, x, y, w, h, 10);
    ctx.fillStyle = rgba(cfg.colors.panel, Math.min(1, cfg.colors.panelOpacity + 0.1)); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.5; ctx.strokeStyle = tier ? rgba(c, 0.55) : 'rgba(255,255,255,0.1)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 20, y + h / 2, 7, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    fitText(ctx, cfg, mode, w - 120, Math.min(20, h * 0.42), 8); ctx.fillStyle = cfg.colors.text;
    ctx.fillText(mode, x + 38, y + h / 2 + 1);
    ctx.textAlign = 'right'; ctx.fillStyle = c;
    setFont(ctx, cfg, Math.min(24, h * 0.5));
    ctx.fillText(tier || '—', x + w - 16, y + h / 2 + 1);
  } else { // chips
    rr(ctx, x, y, w, h, 14);
    ctx.fillStyle = rgba(cfg.colors.panel, Math.min(1, cfg.colors.panelOpacity + 0.08)); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.5; ctx.strokeStyle = tier ? rgba(c, 0.6) : 'rgba(255,255,255,0.1)'; ctx.stroke();
    ctx.save(); rr(ctx, x, y, w, h, 14); ctx.clip();
    ctx.fillStyle = c; ctx.fillRect(x, y, 7, h); ctx.restore();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    fitText(ctx, cfg, mode, w - 36, Math.min(17, h * 0.24), 8); ctx.fillStyle = cfg.colors.subtext;
    ctx.fillText(mode, x + 22, y + h * 0.3);
    ctx.fillStyle = c;
    fitText(ctx, cfg, tier || '—', w - 40, Math.min(h * 0.44, 38), 12);
    ctx.fillText(tier || '—', x + 22, y + h * 0.68);
  }
  ctx.restore();
}

function tierList(cfg, data) {
  let list = cfg.tiers.modes.map((m) => ({ mode: m, tier: data.tiers[m] }));
  if (!cfg.tiers.showEmpty) list = list.filter((e) => e.tier);
  return list;
}

function topSet(list) {
  let best = 0;
  list.forEach((e) => { if (e.tier) best = Math.max(best, TIER_POINTS[e.tier]); });
  return best;
}

function drawTierGrid(ctx, cfg, data, x, y, w, h, cols, gap) {
  const list = tierList(cfg, data);
  if (!list.length) {
    ctx.save(); setFont(ctx, cfg, 22); ctx.fillStyle = cfg.colors.subtext; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('No ranked modes yet', x + w / 2, y + h / 2); ctx.restore(); return;
  }
  const rows = Math.ceil(list.length / cols);
  const cw = (w - gap * (cols - 1)) / cols;
  const ch = Math.min((h - gap * (rows - 1)) / rows, 120);
  const totalH = ch * rows + gap * (rows - 1);
  const oy = y + (h - totalH) / 2;
  const best = topSet(list);
  list.forEach((e, i) => {
    const r = Math.floor(i / cols), c = i % cols;
    const inRow = r === rows - 1 ? list.length - r * cols : cols;
    const rowW = inRow * cw + gap * (inRow - 1);
    const ox = x + (w - rowW) / 2;
    drawTierCell(ctx, cfg, cfg.tiers.style, ox + c * (cw + gap), oy + r * (ch + gap), cw, ch,
      MODES.find((m) => m.key === e.mode).label, e.tier, e.tier && TIER_POINTS[e.tier] === best);
  });
}

// ----------------------------------------------------------------------------
//  Header blocks (name / rank / stats) shared by the layouts
// ----------------------------------------------------------------------------
function drawNameBlock(ctx, cfg, data, x, y, maxW, align = 'left') {
  ctx.save();
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = cfg.colors.text;
  const s = fitText(ctx, cfg, data.name, maxW, 44, 20);
  ctx.shadowColor = rgba(cfg.colors.accent, 0.55); ctx.shadowBlur = 14;
  ctx.fillText(ellipsize(ctx, data.name, maxW), x, y);
  ctx.shadowBlur = 0;
  let yy = y + 8;
  if (data.handle) {
    setFont(ctx, cfg, 18); ctx.fillStyle = cfg.colors.subtext; ctx.textBaseline = 'top';
    ctx.fillText(ellipsize(ctx, '@' + data.handle, maxW), x, yy); yy += 28;
  }
  if (cfg.stats.tagline) {
    setFont(ctx, cfg, 17); ctx.fillStyle = rgba(cfg.colors.accent, 0.95); ctx.textBaseline = 'top';
    ctx.fillText(ellipsize(ctx, cfg.stats.tagline, maxW), x, yy); yy += 26;
  }
  ctx.restore();
  void s;
  return yy;
}

function statLine(cfg, data) {
  const parts = [];
  if (cfg.stats.showRanked) parts.push(`${data.ranked}/${MODE_KEYS.length} MODES`);
  if (cfg.stats.showBest && data.best) parts.push(`BEST ${data.best}`);
  return parts.join('   •   ');
}

function drawRankBlock(ctx, cfg, data, rightX, y, align = 'right') {
  let yy = y;
  if (cfg.stats.showRank) {
    pill(ctx, cfg, `COMBAT ${data.rank.name.toUpperCase()}`, rightX, yy, data.rank.color, 20, align);
    yy += 50;
  }
  if (cfg.stats.showPoints) {
    ctx.save();
    ctx.textAlign = align === 'left' ? 'left' : align === 'center' ? 'center' : 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = cfg.colors.text;
    ctx.shadowColor = rgba(data.rank.color, 0.7); ctx.shadowBlur = 16;
    setFont(ctx, cfg, 54);
    ctx.fillText(String(data.points), rightX, yy + 44);
    ctx.shadowBlur = 0;
    setFont(ctx, cfg, 16); ctx.fillStyle = cfg.colors.subtext;
    ctx.fillText('COMBAT POINTS', rightX, yy + 70);
    ctx.restore();
    yy += 82;
  }
  return yy;
}

// ----------------------------------------------------------------------------
//  Layouts
// ----------------------------------------------------------------------------
function layoutClassic(ctx, cfg, data, imgs, W, H) {
  const bh = cfg.banner.type === 'none' ? 0 : 190;
  drawBanner(ctx, cfg, 0, 0, W, bh, imgs);
  const s = cfg.avatar.size + 50;                     // 120..180
  const ay = bh ? bh - s * 0.55 : 40;
  drawAvatar(ctx, cfg, data, imgs, 48, ay, s);
  const nameX = 48 + s + 28;
  const nameY = bh ? bh + 52 : ay + 56;
  drawNameBlock(ctx, cfg, data, nameX, nameY, W - nameX - 350);
  const ry = bh ? bh + 14 : 40;
  const after = drawRankBlock(ctx, cfg, data, W - 48, ry, 'right');
  if (cfg.stats.showProgress) progressBar(ctx, cfg, data, W - 48 - 300, after + 2, 300, 10);
  const sl = statLine(cfg, data);
  if (sl) { ctx.save(); setFont(ctx, cfg, 17); ctx.fillStyle = cfg.colors.subtext; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(sl, nameX, nameY + 92); ctx.restore(); }
  const top = Math.max(bh + 190, ay + s + 28);
  drawTierGrid(ctx, cfg, data, 40, top, W - 80, H - top - 36, 5, 14);
}

function layoutSplit(ctx, cfg, data, imgs, W, H) {
  const lw = 340;
  panel(ctx, cfg, 28, 28, lw, H - 56, 22);
  if (cfg.banner.type !== 'none') {
    ctx.save(); rr(ctx, 28, 28, lw, 150, 22); ctx.clip();
    drawBanner(ctx, cfg, 28, 28, lw, 150, imgs); ctx.restore();
  }
  const s = cfg.avatar.size + 30;
  drawAvatar(ctx, cfg, data, imgs, 28 + (lw - s) / 2, 78, s);
  ctx.save(); ctx.textAlign = 'center';
  ctx.fillStyle = cfg.colors.text; fitText(ctx, cfg, data.name, lw - 40, 32, 16);
  ctx.shadowColor = rgba(cfg.colors.accent, 0.5); ctx.shadowBlur = 12;
  ctx.fillText(ellipsize(ctx, data.name, lw - 40), 28 + lw / 2, 78 + s + 46);
  ctx.shadowBlur = 0;
  let yy = 78 + s + 62;
  if (cfg.stats.tagline) { setFont(ctx, cfg, 15); ctx.fillStyle = cfg.colors.accent; ctx.textBaseline = 'top'; ctx.fillText(ellipsize(ctx, cfg.stats.tagline, lw - 40), 28 + lw / 2, yy); yy += 28; }
  ctx.restore();
  yy = drawRankBlock(ctx, cfg, data, 28 + lw / 2, yy + 4, 'center');
  if (cfg.stats.showProgress) progressBar(ctx, cfg, data, 56, Math.min(yy + 4, H - 80), lw - 56, 12);
  const sl = statLine(cfg, data);
  if (sl) { ctx.save(); setFont(ctx, cfg, 14); ctx.fillStyle = cfg.colors.subtext; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(sl, 28 + lw / 2, H - 60); ctx.restore(); }
  drawTierGrid(ctx, cfg, data, 28 + lw + 24, 28, W - (28 + lw + 24) - 28, H - 56, 2, 14);
}

function layoutCompact(ctx, cfg, data, imgs, W, H) {
  const s = Math.min(cfg.avatar.size + 20, 150);
  drawAvatar(ctx, cfg, data, imgs, 36, (H - s) / 2 - 18, s);
  const nx = 36 + s + 24;
  const nw = 380 - s + 40;
  ctx.save(); ctx.textAlign = 'left';
  ctx.fillStyle = cfg.colors.text; fitText(ctx, cfg, data.name, nw + 60, 30, 16);
  ctx.shadowColor = rgba(cfg.colors.accent, 0.5); ctx.shadowBlur = 10;
  ctx.fillText(ellipsize(ctx, data.name, nw + 60), nx, 92);
  ctx.shadowBlur = 0; ctx.restore();
  let yy = 106;
  if (cfg.stats.tagline) { ctx.save(); setFont(ctx, cfg, 15); ctx.fillStyle = cfg.colors.accent; ctx.textBaseline = 'top'; ctx.fillText(ellipsize(ctx, cfg.stats.tagline, nw + 60), nx, yy); ctx.restore(); yy += 26; }
  let px = nx;
  if (cfg.stats.showRank) { const p = pill(ctx, cfg, `${data.rank.name.toUpperCase()}`, nx, yy + 4, data.rank.color, 16, 'left'); px = nx + p.w + 14; }
  if (cfg.stats.showPoints) { ctx.save(); setFont(ctx, cfg, 22); ctx.fillStyle = cfg.colors.text; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(`${data.points} PTS`, px, yy + 26); ctx.restore(); }
  if (cfg.stats.showProgress) progressBar(ctx, cfg, data, 36, H - 52, nx + nw + 20 - 36, 10);
  const gx = nx + nw + 50;
  drawTierGrid(ctx, cfg, data, gx, 26, W - gx - 26, H - 52, cfg.tiers.style === 'list' ? 2 : 3, 8);
}

function layoutShowcase(ctx, cfg, data, imgs, W, H) {
  const bh = cfg.banner.type === 'none' ? 0 : 210;
  drawBanner(ctx, cfg, 0, 0, W, bh, imgs);
  const s = cfg.avatar.size + 60;
  const ay = bh ? bh - s * 0.6 : 34;
  drawAvatar(ctx, cfg, data, imgs, (W - s) / 2, ay, s);
  const ny = ay + s + 54;
  ctx.save(); ctx.textAlign = 'center';
  ctx.fillStyle = cfg.colors.text; fitText(ctx, cfg, data.name, W - 160, 46, 22);
  ctx.shadowColor = rgba(cfg.colors.accent, 0.6); ctx.shadowBlur = 16;
  ctx.fillText(ellipsize(ctx, data.name, W - 160), W / 2, ny);
  ctx.shadowBlur = 0;
  let yy = ny + 12;
  if (cfg.stats.tagline) { setFont(ctx, cfg, 18); ctx.fillStyle = cfg.colors.accent; ctx.textBaseline = 'top'; ctx.fillText(ellipsize(ctx, cfg.stats.tagline, W - 160), W / 2, yy); yy += 32; }
  ctx.restore();
  // rank + points on one row, centred
  let rx = W / 2;
  if (cfg.stats.showRank) { pill(ctx, cfg, `COMBAT ${data.rank.name.toUpperCase()}`, rx - (cfg.stats.showPoints ? 20 : 0), yy, data.rank.color, 19, cfg.stats.showPoints ? 'right' : 'center'); }
  if (cfg.stats.showPoints) { ctx.save(); setFont(ctx, cfg, 30); ctx.fillStyle = cfg.colors.text; ctx.textBaseline = 'middle'; ctx.textAlign = cfg.stats.showRank ? 'left' : 'center'; ctx.shadowColor = rgba(data.rank.color, 0.7); ctx.shadowBlur = 12; ctx.fillText(`${data.points} PTS`, cfg.stats.showRank ? rx : W / 2, yy + 20); ctx.restore(); }
  yy += 56;
  if (cfg.stats.showProgress) { progressBar(ctx, cfg, data, W / 2 - 220, yy, 440, 10); yy += 40; }
  const sl = statLine(cfg, data);
  if (sl) { ctx.save(); setFont(ctx, cfg, 15); ctx.fillStyle = cfg.colors.subtext; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(sl, W / 2, yy); ctx.restore(); yy += 28; }
  drawTierGrid(ctx, cfg, data, 40, yy + 4, W - 80, H - yy - 32, 5, 14);
}

// ----------------------------------------------------------------------------
//  Border
// ----------------------------------------------------------------------------
function drawBorder(ctx, cfg, W, H) {
  const b = cfg.border;
  if (b.style === 'none') return;
  const col = b.color || cfg.colors.accent;
  const inset = b.width / 2;
  ctx.save();
  if (b.style === 'corners') {
    const len = Math.min(70, W * 0.08);
    ctx.lineWidth = b.width; ctx.strokeStyle = col; ctx.lineCap = 'square';
    if (b.glow) { ctx.shadowColor = col; ctx.shadowBlur = b.glow; }
    const o = inset + 6;
    const corners = [[o, o, 1, 1], [W - o, o, -1, 1], [o, H - o, 1, -1], [W - o, H - o, -1, -1]];
    corners.forEach(([x, y, sx, sy]) => {
      ctx.beginPath(); ctx.moveTo(x, y + sy * len); ctx.lineTo(x, y); ctx.lineTo(x + sx * len, y); ctx.stroke();
    });
    ctx.restore();
    return;
  }
  ctx.lineWidth = b.width; ctx.strokeStyle = col;
  if (b.style === 'dashed') ctx.setLineDash([b.width * 3, b.width * 2]);
  if ((b.style === 'neon' || b.style === 'solid' || b.style === 'dashed' || b.style === 'double') && b.glow) {
    ctx.shadowColor = col; ctx.shadowBlur = b.style === 'solid' ? b.glow * 0.4 : b.glow;
  }
  rr(ctx, inset, inset, W - b.width, H - b.width, Math.max(0, b.radius - inset));
  ctx.stroke();
  ctx.shadowBlur = 0; ctx.setLineDash([]);
  if (b.style === 'neon') {
    ctx.lineWidth = Math.max(1, b.width / 3); ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    const i2 = b.width + 1;
    rr(ctx, i2, i2, W - i2 * 2, H - i2 * 2, Math.max(0, b.radius - i2)); ctx.stroke();
  } else if (b.style === 'double') {
    ctx.lineWidth = Math.max(1, b.width / 2); ctx.strokeStyle = cfg.colors.accent2;
    const i2 = b.width * 2 + 3;
    rr(ctx, i2, i2, W - i2 * 2, H - i2 * 2, Math.max(0, b.radius - i2)); ctx.stroke();
  }
  ctx.restore();
}

// ----------------------------------------------------------------------------
//  The one entry point.  ctx must be sized to cardSize(cfg).
//  imgs = { bg, banner, avatar }  (already loaded images, or null)
// ----------------------------------------------------------------------------
export function drawCard(ctx, rawCfg, data, imgs = {}) {
  const cfg = rawCfg && rawCfg.v === 1 && rawCfg._clean ? rawCfg : Object.assign(sanitizeConfig(rawCfg), { _clean: true });
  const { width: W, height: H } = cardSize(cfg);
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  // clip everything to the rounded card shape
  rr(ctx, 0, 0, W, H, cfg.border.radius);
  ctx.clip();
  ctx.textBaseline = 'alphabetic';
  drawBackground(ctx, cfg, W, H, imgs);
  const fn = { classic: layoutClassic, split: layoutSplit, compact: layoutCompact, showcase: layoutShowcase }[cfg.layout];
  fn(ctx, cfg, data, imgs, W, H);
  ctx.restore();
  drawBorder(ctx, cfg, W, H);
  return { width: W, height: H };
}

// Which external images does this config need? (used by client + server loaders)
export function imageSources(cfg, data) {
  const out = { bg: null, banner: null, avatar: null };
  if (cfg.bg.type === 'image' && cfg.bg.image) out.bg = cfg.bg.image;
  if (cfg.banner.type === 'image' && cfg.banner.image) out.banner = cfg.banner.image;
  if ((cfg.avatar.source === 'url' || cfg.avatar.source === 'upload') && cfg.avatar.url) out.avatar = cfg.avatar.url;
  else if (data && data.avatarUrl) out.avatar = data.avatarUrl;
  return out;
}
