// Discord OAuth + reading a member's tier roles from your server with the bot token.
import * as store from './store.js';
import { MODE_KEYS, TIERS, TIER_POINTS, buildCardData } from '../public/js/card-core.js';

const API = 'https://discord.com/api/v10';
export const demoMode = process.env.DEMO_MODE === '1';

export function oauthUrl(redirectUri, state) {
  const p = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID, redirect_uri: redirectUri, response_type: 'code',
    scope: 'identify', state, prompt: 'none',
  });
  return `https://discord.com/oauth2/authorize?${p}`;
}

export async function exchangeCode(code, redirectUri) {
  const res = await fetch(`${API}/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID, client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code', code, redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error('token exchange failed');
  return res.json();
}

export async function fetchOAuthUser(accessToken) {
  const res = await fetch(`${API}/users/@me`, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error('could not read discord user');
  return res.json();
}

const bot = (path) => fetch(`${API}${path}`, { headers: { authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } });

// role id -> { mode, tier }, cached for 10 minutes per server instance
let roleCache = { at: 0, map: null };
const MODE_RE = '(SWORD|AXE|UHC|DPOT|NPOT|SMP|SMACE|EMACE|CARTS?|CRYSTAL)';
const ROLE_A = new RegExp(`\\b(HT|LT)\\s?([1-5])\\s+${MODE_RE}\\b`, 'i');   // HT1 CART
const ROLE_B = new RegExp(`\\b${MODE_RE}\\s+(HT|LT)\\s?([1-5])\\b`, 'i');   // CART HT1
function parseRole(name) {
  const t = String(name).normalize('NFKD').replace(/[^A-Za-z0-9]+/g, ' ').trim();   // drops emoji, |, [], -, etc.
  let m = ROLE_A.exec(t);
  if (m) return { ht: m[1], n: m[2], mode: m[3] };
  m = ROLE_B.exec(t);
  if (m) return { ht: m[2], n: m[3], mode: m[1] };
  return null;
}

async function tierRoleMap() {
  if (roleCache.map && Date.now() - roleCache.at < 600_000) return roleCache.map;
  const res = await bot(`/guilds/${process.env.DISCORD_GUILD_ID}/roles`);
  if (!res.ok) throw new Error('could not read server roles (check bot token and server id)');
  const roles = await res.json();
  const map = new Map();
  for (const r of roles) {
    const m = parseRole(r.name);
    if (!m) continue;
    const mode = m.mode.toUpperCase().replace(/^CARTS$/, 'CART');
    map.set(r.id, { mode, tier: `${m.ht.toUpperCase()}${m.n}` });
  }
  roleCache = { at: Date.now(), map };
  return map;
}

// keep only characters the card fonts can draw
function cleanName(s) {
  const out = [...(s || '')].filter((ch) => { const c = ch.codePointAt(0); return c >= 32 && c <= 0x24f; }).join('').trim();
  return out.slice(0, 32);
}

function avatarUrlFor(userId, user, member, size = 256) {
  const gid = process.env.DISCORD_GUILD_ID;
  if (member?.avatar) return `https://cdn.discordapp.com/guilds/${gid}/users/${userId}/avatars/${member.avatar}.png?size=${size}`;
  if (user?.avatar) return `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.png?size=256`;
  const idx = Number((BigInt(userId) >> 22n) % 6n);
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

const DEMO_TIERS = { SWORD: 'HT2', AXE: 'LT3', UHC: 'HT4', DPOT: 'LT5', NPOT: 'HT1', SMP: null, SMACE: 'LT2', EMACE: null, CART: 'HT3', CRYSTAL: 'LT4' };

// Returns the object the card is drawn from. Cached for 2 minutes.
export async function getCardData(userId, { fresh = false } = {}) {
  if (demoMode) return buildCardData({ name: userId === 'demo' ? 'Demo Player' : `Player ${userId.slice(-4)}`, handle: 'demo', tiers: DEMO_TIERS });
  const key = `bc:stats:${userId}`;
  if (!fresh) { const hit = await store.get(key); if (hit) return hit; }
  const res = await bot(`/guilds/${process.env.DISCORD_GUILD_ID}/members/${userId}`);
  if (res.status === 404) { const e = new Error('not_in_server'); e.code = 'not_in_server'; throw e; }
  if (!res.ok) throw new Error('discord member lookup failed (' + res.status + ')');
  const member = await res.json();
  const map = await tierRoleMap();
  const best = {};
  for (const rid of member.roles || []) {
    const hit = map.get(rid);
    if (!hit) continue;
    if (!best[hit.mode] || TIER_POINTS[hit.tier] > TIER_POINTS[best[hit.mode]]) best[hit.mode] = hit.tier;
  }
  if (!Object.keys(best).length) { const e = new Error('no_rank'); e.code = 'no_rank'; e.diag = { tierRolesInServer: map.size, yourRoles: (member.roles || []).length }; throw e; }   // no tier roles = no card
  const user = member.user || {};
  const name = cleanName(member.nick || user.global_name || user.username) || cleanName(user.username) || 'Player';
  const data = buildCardData({ name, handle: cleanName(user.username), tiers: best });
  data.avatarUrl = avatarUrlFor(userId, user, member);
  await store.set(key, data, { ex: 120 });
  return data;
}
void MODE_KEYS; void TIERS;


// ---------------------------------------------------------------------------
//  Rankings board: every server member who holds at least one tier role.
//  Cached 5 minutes. Needs the bot's Server Members Intent (already required).
// ---------------------------------------------------------------------------
const DEMO_NAMES = ['Marlowww', 'ItzRealMe', 'coldified', 'Swight', 'janekv', 'Kyrox', 'Zenith', 'NovaPvP', 'Vortex', 'Ashen', 'Blitz', 'Cobalt'];
function demoBoard() {
  const modes = MODE_KEYS; const out = [];
  DEMO_NAMES.forEach((name, i) => {
    const tiers = {};
    modes.forEach((m, j) => { const k = (i * 3 + j * 7) % 13; if (k < 10) tiers[m] = TIERS[Math.min(9, Math.floor((k + i) / 1.4) % 10)]; });
    const d = buildCardData({ name, handle: name.toLowerCase(), tiers });
    out.push({ id: i === 0 ? 'demo' : String(100000000000000000 + i), name, avatarUrl: '', tiers: d.tiers, points: d.points, ranked: d.ranked, best: d.best, rank: d.rank });
  });
  return out;
}

export async function listRankedMembers() {
  if (demoMode) return demoBoard();
  const key = 'bc:board';
  const hit = await store.get(key); if (hit) return hit;
  const map = await tierRoleMap();
  const gid = process.env.DISCORD_GUILD_ID;
  const list = []; let after = '0';
  for (let page = 0; page < 12; page++) {
    const res = await bot(`/guilds/${gid}/members?limit=1000&after=${after}`);
    if (!res.ok) throw new Error('member list failed (' + res.status + ')');
    const members = await res.json();
    for (const m of members) {
      const best = {};
      for (const rid of m.roles || []) {
        const h = map.get(rid); if (!h) continue;
        if (!best[h.mode] || TIER_POINTS[h.tier] > TIER_POINTS[best[h.mode]]) best[h.mode] = h.tier;
      }
      if (!Object.keys(best).length) continue;
      const u = m.user || {};
      const name = cleanName(m.nick || u.global_name || u.username) || 'Player';
      const d = buildCardData({ name, handle: cleanName(u.username), tiers: best });
      list.push({ id: u.id, name, avatarUrl: avatarUrlFor(u.id, u, m, 64), tiers: d.tiers, points: d.points, ranked: d.ranked, best: d.best, rank: d.rank });
    }
    if (members.length < 1000) break;
    after = members[members.length - 1].user.id;
  }
  list.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  await store.set(key, list, { ex: 300 });
  return list;
}

// Anyone in the server (ranked or not): name, avatar and total points. Used by tournaments.
export async function getMemberLite(userId) {
  if (demoMode) {
    const n = Number(String(userId).slice(-3)) || 1;
    return { id: String(userId), name: `Player ${String(userId).slice(-4)}`, avatarUrl: '', points: (n * 37) % 400 };
  }
  const res = await bot(`/guilds/${process.env.DISCORD_GUILD_ID}/members/${userId}`);
  if (res.status === 404) { const e = new Error('not_in_server'); e.code = 'not_in_server'; throw e; }
  if (!res.ok) throw new Error('discord member lookup failed (' + res.status + ')');
  const member = await res.json();
  if (member.user?.bot) { const e = new Error('is_bot'); e.code = 'is_bot'; throw e; }
  const map = await tierRoleMap();
  const best = {};
  for (const rid of member.roles || []) {
    const hit = map.get(rid); if (!hit) continue;
    if (!best[hit.mode] || TIER_POINTS[hit.tier] > TIER_POINTS[best[hit.mode]]) best[hit.mode] = hit.tier;
  }
  const u = member.user || {};
  const name = cleanName(member.nick || u.global_name || u.username) || cleanName(u.username) || 'Player';
  return { id: String(userId), name, avatarUrl: avatarUrlFor(userId, u, member, 64), points: buildCardData({ name, tiers: best }).points };
}
