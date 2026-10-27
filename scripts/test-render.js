import fs from 'node:fs';
import { renderCardPng } from '../lib/render.js';
import { buildCardData, DEFAULT_CONFIG, THEMES } from '../public/js/card-core.js';

const out = process.argv[2] || './out';
fs.mkdirSync(out, { recursive: true });
const data = buildCardData({
  name: 'Jexu', handle: 'jexu5501',
  tiers: { SWORD: 'HT2', AXE: 'LT3', UHC: 'HT4', DPOT: 'LT5', NPOT: 'HT1', SMP: null, SMACE: 'LT2', EMACE: null, CART: 'HT3', CRYSTAL: 'LT4' },
});
const variants = {
  classic: { layout: 'classic' },
  split: { layout: 'split', tiers: { style: 'blocks' }, border: { style: 'double' } },
  compact: { layout: 'compact', tiers: { style: 'list' }, border: { style: 'corners' }, font: 'rajdhani' },
  showcase: { layout: 'showcase', tiers: { style: 'blocks' }, font: 'audiowide', ...{ colors: THEMES['Redstone'].colors }, bg: { ...THEMES['Redstone'].bg, pattern: 'blocks' } },
};
for (const [name, patch] of Object.entries(variants)) {
  const cfg = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  for (const [k, v] of Object.entries(patch)) cfg[k] = typeof v === 'object' && !Array.isArray(v) ? { ...cfg[k], ...v } : v;
  const t = Date.now();
  const png = await renderCardPng(cfg, data);
  fs.writeFileSync(`${out}/${name}.png`, png);
  console.log(name, png.length, 'bytes', Date.now() - t, 'ms');
}
