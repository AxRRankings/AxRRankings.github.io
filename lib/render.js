// Server-side PNG rendering. Uses the exact same drawing code as the browser.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { drawCard, cardSize, sanitizeConfig, imageSources, FONTS } from '../public/js/card-core.js';
import { loadSource } from './images.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.join(here, '..', 'public', 'fonts');
let fontsReady = false;

export function ensureFonts() {
  if (fontsReady) return;
  for (const f of Object.values(FONTS)) GlobalFonts.registerFromPath(path.join(FONT_DIR, f.file), f.family);
  fontsReady = true;
}

async function toImage(src) {
  try {
    const got = await loadSource(src);
    return got ? await loadImage(got.buffer) : null;
  } catch { return null; }
}

export async function renderCardPng(rawCfg, data, { scale = 1 } = {}) {
  ensureFonts();
  const cfg = Object.assign(sanitizeConfig(rawCfg), { _clean: true });
  const { width, height } = cardSize(cfg);
  const srcs = imageSources(cfg, data);
  const [bg, banner, avatar] = await Promise.all([toImage(srcs.bg), toImage(srcs.banner), toImage(srcs.avatar)]);
  const canvas = createCanvas(Math.round(width * scale), Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  drawCard(ctx, cfg, data, { bg, banner, avatar });
  return canvas.toBuffer('image/png');
}
