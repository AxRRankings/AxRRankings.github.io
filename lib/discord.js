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
const ROLE_RE = /^(HT|LT)\s?([1-5])\s+(SWORD|AXE|UHC|DPOT|NPOT|SMP|SMACE|EMACE|CARTS?|CRYSTAL)$/i;

async function tierRoleMap() {
  if (roleCache.map && Date.now() - roleCache.at < 600_000) return roleCache.map;
  const res = await bot(`/guilds/${process.env.DISCORD_GUILD_ID}/roles`);
  if (!res.ok) throw new Error('could not read server roles (check bot token and server id)');
  const roles = await res.json();
  const map = new Map();
  for (const r of roles) {
    const m = ROLE_RE.exec(r.name.trim());
    if (!m) continue;
    const mode = m[3].toUpperCase().replace(/^CARTS$/, 'CART');
    map.set(r.id, { mode, tier: `${m[1].toUpperCase()}${m[2]}` });
  }
  roleCache = { at: Date.now(), map };
  return map;
}

// keep only characters the card fonts can draw
function cleanName(s) {
  const out = [...(s || '')].filter((ch) => { const c = ch.codePointAt(0); return c >= 32 && c <= 0x24f; }).join('').trim();
  return out.slice(0, 32);
}

function avatarUrlFor(userId, user, member) {
  const gid = process.env.DISCORD_GUILD_ID;
  if (member?.avatar) return `https://cdn.discordapp.com/guilds/${gid}/users/${userId}/avatars/${member.avatar}.png?size=256`;
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
  const user = member.user || {};
  const name = cleanName(member.nick || user.global_name || user.username) || cleanName(user.username) || 'Player';
  const data = buildCardData({ name, handle: cleanName(user.username), tiers: best });
  data.avatarUrl = avatarUrlFor(userId, user, member);
  await store.set(key, data, { ex: 120 });
  return data;
}
void MODE_KEYS; void TIERS;
