import { json } from '../lib/http.js';
import { requireUser } from '../lib/guard.js';
import { getCardData } from '../lib/discord.js';
import * as store from '../lib/store.js';
import { sanitizeConfig, DEFAULT_CONFIG } from '../public/js/card-core.js';

export default async function handler(req, res) {
  const s = requireUser(req, res); if (!s) return;
  const [draft, pub] = await Promise.all([store.get(`bc:draft:${s.id}`), store.get(`bc:pub:${s.id}`)]);
  let data = null, problem = null;
  try { data = await getCardData(s.id, { fresh: true }); }
  catch (e) { problem = e.code === 'not_in_server' || e.code === 'no_rank' ? e.code : 'stats_unavailable'; }
  json(res, 200, {
    user: { id: s.id, username: s.username },
    data, problem,
    config: sanitizeConfig(draft?.config || DEFAULT_CONFIG),
    published: pub ? { at: pub.at } : null,
    savedAt: draft?.at || null,
  });
}
