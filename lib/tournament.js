// Single-elimination tournament engine. Pure functions + a locked read/modify/write wrapper.
import * as store from './store.js';
import { MODE_KEYS } from '../public/js/card-core.js';

export const MAX_PLAYERS = 128;
const KEY = 'bc:t:cur', HIST = 'bc:t:hist', LOCK = 'bc:t:lock';
export const load = () => store.get(KEY);
const save = (t) => store.set(KEY, t);

// run fn(current) with a short lock so simultaneous 1tjoin commands do not overwrite each other
export async function locked(fn) {
  for (let i = 0; i < 8; i++) {
    if ((await store.hit(LOCK, 5)) === 1) {
      try { return await fn(); } finally { await store.del(LOCK); }
    }
    await new Promise((r) => setTimeout(r, 200 + i * 60));
  }
  throw Object.assign(new Error('busy'), { code: 'busy' });
}

function seedOrder(n) { let o = [1]; while (o.length < n) { const m = o.length * 2; o = o.flatMap((s) => [s, m + 1 - s]); } return o; }
const pow2 = (n) => { let s = 2; while (s < n) s *= 2; return s; };

export function roundName(r, total) {
  const left = total - r;               // 1 = final
  return left === 1 ? 'Final' : left === 2 ? 'Semifinals' : left === 3 ? 'Quarterfinals' : `Round of ${2 ** left}`;
}

// entrants must already be sorted best-first and carry .seed (1-based)
export function buildRounds(entrants) {
  const size = pow2(entrants.length), order = seedOrder(size);
  const bySeed = new Map(entrants.map((e) => [e.seed, e.id]));
  const r0 = [];
  for (let i = 0; i < size; i += 2) {
    const a = bySeed.get(order[i]) || null, b = bySeed.get(order[i + 1]) || null;
    r0.push({ a, b, w: a && !b ? a : !a && b ? b : null, bye: !(a && b) });
  }
  const rounds = [r0];
  for (let n = size / 4; n >= 1; n /= 2) rounds.push(Array.from({ length: n }, () => ({ a: null, b: null, w: null, bye: false })));
  settle(rounds);
  return rounds;
}

// push every decided winner into its slot in the next round
export function settle(rounds) {
  for (let r = 0; r < rounds.length - 1; r++) rounds[r].forEach((m, j) => {
    const next = rounds[r + 1][j >> 1]; const slot = j % 2 === 0 ? 'a' : 'b';
    if (m.w) next[slot] = m.w;
  });
}

export function findOpen(t, userId) {
  for (let r = 0; r < t.rounds.length; r++) for (let j = 0; j < t.rounds[r].length; j++) {
    const m = t.rounds[r][j];
    if (m.a && m.b && !m.w && (m.a === userId || m.b === userId)) return { r, j, m };
  }
  return null;
}

export function reportWin(t, userId) {
  const f = findOpen(t, userId); if (!f) return null;
  f.m.w = userId; t.log = [...(t.log || []), [f.r, f.j]];
  settle(t.rounds);
  const last = t.rounds[t.rounds.length - 1][0];
  if (last.w) { t.status = 'done'; t.champion = last.w; t.finishedAt = Date.now(); }
  return { ...f, opponent: f.m.a === userId ? f.m.b : f.m.a };
}

export function undoLast(t) {
  const last = (t.log || []).pop(); if (!last) return null;
  const [r, j] = last; const m = t.rounds[r][j]; const who = m.w; m.w = null;
  if (r + 1 < t.rounds.length) t.rounds[r + 1][j >> 1][j % 2 === 0 ? 'a' : 'b'] = null;
  if (t.status === 'done') { t.status = 'live'; t.champion = null; t.finishedAt = null; }
  return { r, j, who };
}

// 2v2: each entrant is a team { id: captain id, members: [{id,name,avatarUrl}], name: "A & B" }
export const teamOf = (t, userId) => t.entrants.find((e) => e.id === userId || (e.members || []).some((m) => m.id === userId));

// Text bracket for Discord (inside a code block). Starts at the earliest round that still has a match to play.
export function bracketText(t, cap = 1300) {
  const total = t.rounds.length, short = (id) => nameOf(t, id).slice(0, 18);
  let first = t.rounds.findIndex((rd) => rd.some((m) => !m.bye && !m.w));
  if (first < 0) first = Math.max(0, total - 3);
  const blocks = [];
  for (let r = first; r < total; r++) {
    const lines = [], ms = t.rounds[r].filter((m) => !(m.bye && !(m.a && m.b)));
    for (const m of ms.slice(0, 12)) {
      const a = m.a ? short(m.a) : 'TBD', b = m.b ? short(m.b) : 'TBD';
      if (m.w) { const w = m.w === m.a ? a : b, l = m.w === m.a ? b : a; lines.push(`✅ ${w}  beat  ${l}`); }
      else lines.push(`${m.a && m.b ? '⚔️' : '⏳'} ${a}  vs  ${b}`);
    }
    if (ms.length > 12) lines.push(`... +${ms.length - 12} more`);
    blocks.push(`${roundName(r, total).toUpperCase()}\n${lines.join('\n')}`);
  }
  let out = blocks.join('\n\n');
  while (out.length > cap && blocks.length > 1) { blocks.shift(); out = blocks.join('\n\n'); }
  return '```\n' + out.slice(0, cap) + '\n```';
}

export const nameOf = (t, id) => t.entrants.find((e) => e.id === id)?.name || 'TBD';

export function parseCreate(text) {
  const parts = String(text || '').trim().split(/\s+/).filter(Boolean);
  let mode = 'ANY', teamSize = 1, max = 0, ok = true;
  while (parts.length && ok) {
    const w = parts[0], up = w.toUpperCase();
    if (/^(2V2|DUO|DUOS|TEAMS?)$/.test(up)) { teamSize = 2; parts.shift(); }
    else if (/^MAX=?\d{1,3}$/i.test(w)) { max = Math.min(MAX_PLAYERS, Number(w.replace(/\D/g, ''))); parts.shift(); }
    else if (up === 'ANY' || MODE_KEYS.includes(up)) { mode = up; parts.shift(); }
    else ok = false;
  }
  const base = mode === 'ANY' ? 'AxR Tournament' : `${mode} Tournament`;
  const name = parts.join(' ').replace(/[^\w \-.!'&]/g, '').trim().slice(0, 40) || (teamSize === 2 ? base.replace('Tournament', '2v2 Tournament') : base);
  return { mode, name, teamSize, max };
}

export async function archive(t) {
  const list = (await store.get(HIST)) || [];
  list.unshift({ id: t.id, name: t.name, mode: t.mode, status: t.status, players: t.entrants.length, champion: t.champion ? nameOf(t, t.champion) : null, at: t.finishedAt || Date.now() });
  await store.set(HIST, list.slice(0, 10));
}
export const history = async () => (await store.get(HIST)) || [];
export { save };
