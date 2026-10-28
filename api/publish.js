import { json, readJson } from '../lib/http.js';
import { requireUser, requirePost, limited } from '../lib/guard.js';
import * as store from '../lib/store.js';
import { getCardData } from '../lib/discord.js';
import { sanitizeConfig } from '../public/js/card-core.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  const s = requireUser(req, res); if (!s) return;
  if (await limited(res, s.id, 'publish', 10)) return;
  const body = await readJson(req, 900_000);
  if (!body || typeof body.config !== 'object') return json(res, 400, { error: 'bad_request' });
  // only members of the server can publish (the card shows server ranks)
  try { await getCardData(s.id, { fresh: true }); }
  catch (e) { return json(res, 403, { error: e.code === 'not_in_server' || e.code === 'no_rank' ? e.code : 'stats_unavailable' }); }
  const config = sanitizeConfig(body.config);
  const at = Date.now();
  await store.set(`bc:draft:${s.id}`, { config, at });
  await store.set(`bc:pub:${s.id}`, { config, at });
  json(res, 200, { ok: true, publishedAt: at, imageUrl: `/api/card/${s.id}.png`, profileUrl: `/u/${s.id}` });
}
