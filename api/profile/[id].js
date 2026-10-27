// Public data for /u/<id>: only the published card and the member's server ranks.
import { json } from '../../lib/http.js';
import * as store from '../../lib/store.js';
import { getCardData } from '../../lib/discord.js';

export default async function handler(req, res) {
  const id = String(req.query?.id || new URL(req.url, 'http://x').pathname.split('/').pop());
  if (!/^(\d{15,22}|demo)$/.test(id)) return json(res, 400, { error: 'bad_id' });
  const pub = await store.get(`bc:pub:${id}`);
  if (!pub) return json(res, 404, { error: 'not_published' });
  let data;
  try { data = await getCardData(id); } catch { return json(res, 404, { error: 'member_not_found' }); }
  json(res, 200, { id, config: pub.config, data, publishedAt: pub.at }, { 'cache-control': 'public, s-maxage=30' });
}
