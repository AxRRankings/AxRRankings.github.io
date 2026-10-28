// The image Discord shows:  /api/card/<discordUserId>.png
import { json, send } from '../../lib/http.js';
import * as store from '../../lib/store.js';
import { getCardData } from '../../lib/discord.js';
import { renderCardPng } from '../../lib/render.js';
import { DEFAULT_CONFIG } from '../../public/js/card-core.js';

export default async function handler(req, res) {
  const id = String(req.query?.id || new URL(req.url, 'http://x').pathname.split('/').pop()).replace(/\.png$/i, '');
  if (!/^(\d{15,22}|demo)$/.test(id)) return json(res, 400, { error: 'bad_id' });
  const pub = await store.get(`bc:pub:${id}`);
  let data;
  try { data = await getCardData(id); }
  catch { return json(res, 404, { error: 'member_not_found' }); }
  const png = await renderCardPng(pub?.config || DEFAULT_CONFIG, data)   // no published design yet: show the default card (used by the rankings page);
  send(res, 200, png, {
    'content-type': 'image/png',
    'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
    'content-disposition': `inline; filename="battlecard-${id}.png"`,
  });
}
