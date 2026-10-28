// Used by the Discord bot to check whether a member has a published card.
import { json } from '../../lib/http.js';
import * as store from '../../lib/store.js';
import { getCardData } from '../../lib/discord.js';

export default async function handler(req, res) {
  const id = String(req.query?.id || new URL(req.url, 'http://x').pathname.split('/').pop());
  if (!/^(\d{15,22}|demo)$/.test(id)) return json(res, 400, { error: 'bad_id' });
  const pub = await store.get(`bc:pub:${id}`);
  let ok = Boolean(pub);
  if (ok) { try { await getCardData(id); } catch { ok = false; } }   // unranked or left the server = no card
  json(res, 200, { published: ok, at: pub?.at || 0 }, { 'cache-control': 'public, s-maxage=15' });
}
