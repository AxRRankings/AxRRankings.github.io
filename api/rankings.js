// Public leaderboard: GET /api/rankings?mode=ALL|SWORD|AXE|...
import { json } from '../lib/http.js';
import { listRankedMembers } from '../lib/discord.js';
import { MODE_KEYS, TIER_POINTS } from '../public/js/card-core.js';

export default async function handler(req, res) {
  const q = new URL(req.url, 'http://x').searchParams;
  const mode = String(q.get('mode') || 'ALL').toUpperCase();
  let all;
  try { all = await listRankedMembers(); }
  catch (e) { return json(res, 502, { error: 'unavailable', detail: String(e.message).slice(0, 120) }); }
  let rows = all;
  if (MODE_KEYS.includes(mode)) {
    rows = all.filter((p) => p.tiers[mode]).sort((a, b) => TIER_POINTS[b.tiers[mode]] - TIER_POINTS[a.tiers[mode]] || b.points - a.points);
  }
  const out = rows.slice(0, 150).map((p, i) => ({ pos: i + 1, id: p.id, name: p.name, avatarUrl: p.avatarUrl, points: p.points, rank: p.rank?.name || '', best: p.best, tiers: p.tiers }));
  json(res, 200, { mode: MODE_KEYS.includes(mode) ? mode : 'ALL', total: rows.length, players: out }, { 'cache-control': 'public, s-maxage=60, stale-while-revalidate=300' });
}
