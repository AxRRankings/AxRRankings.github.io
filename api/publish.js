import { json, readJson, baseUrl } from '../lib/http.js';
import { requireUser, requirePost, limited } from '../lib/guard.js';
import * as store from '../lib/store.js';
import { getCardData } from '../lib/discord.js';
import { sanitizeConfig } from '../public/js/card-core.js';
import { slotKey, metaKey, emptyMeta, parseSlot } from '../lib/slots.js';

// Post the published card to the server's cards channel through a Discord webhook (CARDS_WEBHOOK_URL) or the bot (CARDS_CHANNEL_ID).
async function postToDiscord(req, user, at) {
  const hook = process.env.CARDS_WEBHOOK_URL, chan = process.env.CARDS_CHANNEL_ID;
  if (!hook && !chan) return 'not_configured';
  if ((await store.hit(`bc:post:${user.id}`, 300)) > 1) return 'slow_down';   // one post per 5 minutes per player
  const base = baseUrl(req);
  const name = String(user.username || 'Player').slice(0, 32);
  try {
    // either a webhook URL, or the site's bot posting into the channel with CARDS_CHANNEL_ID
    const url = hook || `https://discord.com/api/v10/channels/${encodeURIComponent(chan)}/messages`;
    const headers = hook ? { 'content-type': 'application/json' } : { 'content-type': 'application/json', authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` };
    const r = await fetch(url, {
      method: 'POST', headers, signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        ...(hook ? { username: 'AxR Battle Cards' } : {}), allowed_mentions: { parse: [] },
        content: `<@${user.id}> posted their Battle Card`,
        embeds: [{ title: `${name}'s Battle Card`, url: `${base}/u/${user.id}`, color: 0x7cff4f, image: { url: `${base}/api/card/${user.id}.png?v=${at}` } }],
      }),
    });
    return r.ok ? 'ok' : 'failed';
  } catch { return 'failed'; }
}

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  const s = requireUser(req, res); if (!s) return;
  if (await limited(res, s.id, 'publish', 10)) return;
  const body = await readJson(req, 900_000);
  if (!body || typeof body.config !== 'object') return json(res, 400, { error: 'bad_request' });
  // only ranked members of the server can publish (the card shows server ranks)
  try { await getCardData(s.id, { fresh: true }); }
  catch (e) { return json(res, 403, { error: e.code === 'not_in_server' || e.code === 'no_rank' ? e.code : 'stats_unavailable' }); }
  const slot = parseSlot(body.slot);
  const config = sanitizeConfig(body.config);
  const at = Date.now();
  const meta = { ...emptyMeta(), ...((await store.get(metaKey(s.id))) || {}) };
  meta.last = slot; meta.active = slot;
  await store.set(slotKey(s.id, slot), { config, at });
  await store.set(`bc:pub:${s.id}`, { config, at });     // what /card and the rankings pop-up show
  await store.set(metaKey(s.id), meta);
  const posted = body.post ? await postToDiscord(req, s, at) : undefined;
  json(res, 200, { ok: true, publishedAt: at, active: slot, imageUrl: `/api/card/${s.id}.png`, profileUrl: `/u/${s.id}`, posted }); 
}
