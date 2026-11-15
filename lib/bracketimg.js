// PNG of the live tournament bracket (same look as the /tournament page). Used by the Discord bot.
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { ensureFonts } from './render.js';
import { loadSource } from './images.js';
import { roundName } from './tournament.js';

const C = { bg: '#141518', ink: '#0b0b0d', panel: '#34353b', hi: '#62636c', lo: '#1f2024', slot: '#26272c', xp: '#80ff20', gold: '#ffd452', text: '#f2f2f4', dim: '#8a8b93', win: '#274814', lose: '#222327' };
const FONT = 'BC Rajdhani, sans-serif', PIX = 'BC Press Start, monospace';
const COLW = 270, BOXW = 240, ROW = 34, BOXH = ROW * 2, SLOT = 92, PADX = 30, HEAD = 124, PADB = 30;

function fit(ctx, text, w) {
  if (ctx.measureText(text).width <= w) return text;
  let s = String(text);
  while (s.length > 1 && ctx.measureText(s + '…').width > w) s = s.slice(0, -1);
  return s + '…';
}

export async function renderBracketPng(t) {
  ensureFonts();
  const total = t.rounds.length;
  let first = 0;
  while (first < total - 1 && t.rounds[first].length > 16) first++;
  const rounds = t.rounds.slice(first);
  const P = Object.fromEntries(t.entrants.map((e) => [e.id, e]));

  // avatars (best effort, small brackets only)
  const imgs = {};
  if (t.entrants.length <= 40) {
    await Promise.allSettled(t.entrants.map(async (e) => {
      if (!e.avatarUrl) return;
      const got = await loadSource(e.avatarUrl); if (got) imgs[e.id] = await loadImage(got.buffer);
    }));
  }

  const rows = rounds[0].length;
  const W = PADX * 2 + rounds.length * COLW - (COLW - BOXW);
  const H = HEAD + rows * SLOT + PADB;
  const canvas = createCanvas(W, H), ctx = canvas.getContext('2d');
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.025)'; for (let y = 0; y < H; y += 8) ctx.fillRect(0, y, W, 1);

  // header
  ctx.textBaseline = 'alphabetic'; ctx.fillStyle = C.xp; ctx.font = `10px ${PIX}`; ctx.fillText('AXR RANKINGS', PADX, 34);
  ctx.fillStyle = C.text; ctx.font = `bold 34px ${FONT}`; ctx.fillText(fit(ctx, t.name, W - PADX * 2 - 200), PADX, 70);
  const sub = `${t.mode === 'ANY' ? 'Any mode' : t.mode} · ${t.teamSize === 2 ? '2v2' : '1v1'} knockout · ${t.entrants.length} ${t.teamSize === 2 ? 'teams' : 'players'}`;
  ctx.fillStyle = C.dim; ctx.font = `600 16px ${FONT}`; ctx.textAlign = 'right'; ctx.fillText(sub, W - PADX, 34);
  if (t.status === 'done' && P[t.champion]) { ctx.fillStyle = C.gold; ctx.font = `bold 20px ${FONT}`; ctx.fillText('CHAMPION: ' + fit(ctx, P[t.champion].name, 300), W - PADX, 68); }
  else if (t.status === 'live') { ctx.fillStyle = C.xp; ctx.font = `bold 18px ${FONT}`; ctx.fillText('LIVE', W - PADX, 68); ctx.fillStyle = C.xp; ctx.fillRect(W - PADX - ctx.measureText('LIVE').width - 18, 54, 10, 10); }
  ctx.textAlign = 'left';

  const pos = (r, j) => { const span = 2 ** r; return { x: PADX + r * COLW, y: HEAD + (j * span + span / 2) * SLOT - BOXH / 2 }; };
  let curSet = false;

  rounds.forEach((round, ri) => {
    const rAbs = ri + first;
    ctx.fillStyle = C.xp; ctx.font = `10px ${PIX}`;
    ctx.fillText(roundName(rAbs, total).toUpperCase(), PADX + ri * COLW, HEAD - 12);
    // connectors to next round
    if (ri < rounds.length - 1) {
      ctx.strokeStyle = C.hi; ctx.lineWidth = 3;
      round.forEach((_, j) => {
        const a = pos(ri, j), b = pos(ri + 1, j >> 1), x1 = a.x + BOXW, y1 = a.y + BOXH / 2, x2 = b.x, y2 = b.y + BOXH / 2, mx = x1 + (COLW - BOXW) / 2;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(mx, y1); ctx.lineTo(mx, y2); ctx.lineTo(x2, y2); ctx.stroke();
      });
    }
    round.forEach((m, j) => {
      const { x, y } = pos(ri, j);
      const open = m.a && m.b && !m.w, cur = open && !curSet && t.status === 'live'; if (cur) curSet = true;
      ctx.fillStyle = C.ink; ctx.fillRect(x - 3, y - 3, BOXW + 6, BOXH + 6);
      if (cur) { ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.strokeRect(x - 2.5, y - 2.5, BOXW + 5, BOXH + 5); }
      [[m.a, m.b], [m.b, m.a]].forEach(([id, other], k) => {
        const ry = y + k * ROW;
        const p = id ? P[id] : null, won = id && m.w === id, lost = id && m.w && m.w !== id;
        ctx.fillStyle = won ? C.win : lost ? C.lose : C.slot; ctx.fillRect(x, ry, BOXW, ROW);
        if (k === 1) { ctx.fillStyle = C.ink; ctx.fillRect(x, ry - 1, BOXW, 2); }
        if (won) { ctx.fillStyle = C.xp; ctx.fillRect(x, ry, 4, ROW); }
        ctx.fillStyle = C.dim; ctx.font = `10px ${PIX}`; ctx.fillText(p && p.seed ? String(p.seed) : '', x + 10, ry + 22);
        if (p) {
          const ax = x + 32, ay = ry + 6;
          if (imgs[id]) { ctx.drawImage(imgs[id], ax, ay, 22, 22); } else { ctx.fillStyle = '#222'; ctx.fillRect(ax, ay, 22, 22); ctx.fillStyle = C.xp; ctx.font = `10px ${PIX}`; ctx.fillText((p.name || '?')[0].toUpperCase(), ax + 6, ay + 16); }
          ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(ax, ay, 22, 22);
          ctx.fillStyle = lost ? C.dim : C.text; ctx.font = `bold 18px ${FONT}`;
          ctx.fillText(fit(ctx, p.name, BOXW - 70), x + 62, ry + 23);
        } else {
          ctx.fillStyle = C.dim; ctx.font = `italic 600 16px ${FONT}`;
          ctx.fillText(m.bye && other ? 'Bye' : 'TBD', x + 62, ry + 22);
        }
      });
    });
  });
  if (first > 0) { ctx.fillStyle = C.dim; ctx.font = `600 14px ${FONT}`; ctx.fillText(`Earlier rounds hidden · full bracket on the website`, PADX, H - 10); }
  return canvas.toBuffer('image/png');
}
