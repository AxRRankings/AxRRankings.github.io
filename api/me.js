import { json } from '../lib/http.js';
import { requireUser } from '../lib/guard.js';
import { getCardData } from '../lib/discord.js';
import * as store from '../lib/store.js';
import { sanitizeConfig, DEFAULT_CONFIG } from '../public/js/card-core.js';
import { SLOTS, slotKey, metaKey, emptyMeta } from '../lib/slots.js';

export default async function handler(req, res) {
  const s = requireUser(req, res); if (!s) return;
  const lite = new URL(req.url, 'http://x').searchParams.get('lite');
  if (lite) {   // used by the navigation bar on every page: no Discord call, no slot data
    const cached = await store.get(`bc:stats:${s.id}`);
    return json(res, 200, { user: { id: s.id, username: s.username }, avatarUrl: cached?.avatarUrl || null });
  }
  const [pub, metaRaw, ...raw] = await Promise.all([
    store.get(`bc:pub:${s.id}`), store.get(metaKey(s.id)),
    ...Array.from({ length: SLOTS }, (_, n) => store.get(slotKey(s.id, n))),
  ]);
  const meta = { ...emptyMeta(), ...(metaRaw || {}) };
  let data = null, problem = null, diag = null;
  try { data = await getCardData(s.id, { fresh: true }); }
  catch (e) { diag = e.diag || { error: String(e.message || e).slice(0, 160) }; problem = e.code === 'not_in_server' || e.code === 'no_rank' ? e.code : 'stats_unavailable'; }
  const slots = raw.map((d) => (d?.config ? { config: sanitizeConfig(d.config), at: d.at || 0 } : null));
  json(res, 200, {
    user: { id: s.id, username: s.username },
    data, problem, diag,
    slots, last: meta.last, active: meta.active, names: meta.names || {},
    config: sanitizeConfig(slots[meta.last]?.config || DEFAULT_CONFIG),
    published: pub ? { at: pub.at } : null,
  });
}
