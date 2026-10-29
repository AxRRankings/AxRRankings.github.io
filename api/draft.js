import { json, readJson } from '../lib/http.js';
import { requireUser, requirePost, limited } from '../lib/guard.js';
import * as store from '../lib/store.js';
import { sanitizeConfig } from '../public/js/card-core.js';
import { slotKey, metaKey, emptyMeta, parseSlot, cleanSlotName } from '../lib/slots.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  const s = requireUser(req, res); if (!s) return;
  if (await limited(res, s.id, 'draft', 60)) return;
  const body = await readJson(req, 900_000);
  if (!body) return json(res, 400, { error: 'bad_request' });
  const slot = parseSlot(body.slot);
  const meta = { ...emptyMeta(), ...((await store.get(metaKey(s.id))) || {}) };
  meta.names = meta.names || {};
  const at = Date.now();

  if (body.clear) {                       // empty this slot
    await store.del(slotKey(s.id, slot));
    delete meta.names[slot];
    if (meta.active === slot) meta.active = null;   // the published card itself stays until replaced
    await store.set(metaKey(s.id), meta);
    return json(res, 200, { ok: true, cleared: true });
  }
  if (body.config && typeof body.config === 'object') {
    await store.set(slotKey(s.id, slot), { config: sanitizeConfig(body.config), at });
  } else if (body.name === undefined) return json(res, 400, { error: 'bad_request' });
  if (body.name !== undefined) { const n = cleanSlotName(body.name); if (n) meta.names[slot] = n; else delete meta.names[slot]; }
  meta.last = slot;
  await store.set(metaKey(s.id), meta);
  json(res, 200, { ok: true, savedAt: at });
}
