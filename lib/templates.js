// Player-made layout templates. Served through /api/templates (routed into api/rankings.js to stay under
// the 12-function limit of the free Vercel plan). A template holds ONLY block positions (see sanitizeCustom).
import crypto from 'node:crypto';
import { json, readJson } from './http.js';
import { getSession } from './session.js';
import { requireUser, requirePost, limited } from './guard.js';
import * as store from './store.js';
import { getCardData } from './discord.js';
import { sanitizeCustom } from '../public/js/card-core.js';

const ALL = 'bc:tpl:all';
const MAX_PER_USER = 5, MAX_TOTAL = 300, HIDE_AT = 3;
const goodKey = (a, b) => { const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || '')); return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y); };
const load = async () => { const v = await store.get(ALL); return Array.isArray(v) ? v : []; };
const pub = (t) => ({ id: t.id, name: t.name, by: t.by, at: t.at, uses: t.uses || 0, custom: t.custom });

export default async function templates(req, res) {
  const q = new URL(req.url, 'http://x').searchParams;
  if (req.method === 'GET') {
    const id = q.get('id');
    let list = (await load()).filter((t) => !t.hidden);
    if (id) list = list.filter((t) => t.id === id);
    else list.sort((a, b) => (b.uses || 0) - (a.uses || 0) || b.at - a.at);
    return json(res, 200, { templates: list.map(pub) }, { 'cache-control': 'public, s-maxage=10, stale-while-revalidate=30' });
  }
  if (!requirePost(req, res)) return;
  const b = await readJson(req, 20_000);
  if (!b || typeof b !== 'object') return json(res, 400, { error: 'bad_request' });

  // staff (the Discord bot): { key, a:'staff', op:'list'|'delete'|'hide'|'unhide', id }
  if (b.a === 'staff') {
    if (!process.env.TOURNAMENT_KEY || !goodKey(b.key, process.env.TOURNAMENT_KEY)) return json(res, 401, { ok: false, msg: 'Not allowed.' });
    const list = await load();
    if (b.op === 'list') return json(res, 200, { ok: true, templates: list.map((t) => ({ id: t.id, name: t.name, by: t.by, uses: t.uses || 0, hidden: !!t.hidden, reports: (t.reports || []).length })) });
    const i = list.findIndex((t) => t.id === String(b.id || ''));
    if (i < 0) return json(res, 200, { ok: false, msg: 'No template with that id.' });
    if (b.op === 'delete') { const [t] = list.splice(i, 1); await store.set(ALL, list); return json(res, 200, { ok: true, msg: `Deleted template "${t.name}" by ${t.by.name}.` }); }
    if (b.op === 'hide' || b.op === 'unhide') { list[i].hidden = b.op === 'hide'; if (b.op === 'unhide') list[i].reports = []; await store.set(ALL, list); return json(res, 200, { ok: true, msg: `Template "${list[i].name}" is now ${list[i].hidden ? 'hidden' : 'visible'}.` }); }
    return json(res, 200, { ok: false, msg: 'Unknown staff action.' });
  }

  if (b.a === 'use') {
    const s = getSession(req); const id = String(b.id || '');
    if (!s || !s.id) return json(res, 200, { ok: true });
    if ((await store.hit(`bc:tpluse:${s.id}:${id}`, 86400)) > 1) return json(res, 200, { ok: true });
    const list = await load(); const t = list.find((x) => x.id === id);
    if (t) { t.uses = (t.uses || 0) + 1; await store.set(ALL, list); }
    return json(res, 200, { ok: true });
  }

  const s = requireUser(req, res); if (!s) return;

  if (b.a === 'publish') {
    if (await limited(res, s.id, 'tplpub', 4)) return;
    const name = String(b.name || '').replace(/[^\w \-.!']/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
    if (name.length < 2) return json(res, 400, { error: 'bad_name' });
    let data;
    try { data = await getCardData(s.id, { fresh: false }); }
    catch (e) { return json(res, 403, { error: e.code === 'not_in_server' || e.code === 'no_rank' ? e.code : 'stats_unavailable' }); }
    void data;
    const list = await load();
    if (list.filter((t) => t.by.id === s.id).length >= MAX_PER_USER) return json(res, 403, { error: 'limit' });
    const t = { id: crypto.randomBytes(5).toString('hex'), name, by: { id: s.id, name: String(s.username || 'player').slice(0, 32) }, at: Date.now(), uses: 0, custom: sanitizeCustom(b.custom), hidden: false, reports: [] };
    list.unshift(t);
    await store.set(ALL, list.slice(0, MAX_TOTAL));
    return json(res, 200, { ok: true, id: t.id });
  }

  if (b.a === 'report') {
    if (await limited(res, s.id, 'tplrep', 10)) return;
    const list = await load(); const t = list.find((x) => x.id === String(b.id || ''));
    if (!t) return json(res, 404, { error: 'not_found' });
    t.reports = Array.isArray(t.reports) ? t.reports : [];
    if (!t.reports.includes(s.id)) t.reports.push(s.id);
    if (t.reports.length >= HIDE_AT) t.hidden = true;
    await store.set(ALL, list);
    return json(res, 200, { ok: true });
  }

  if (b.a === 'delete') {
    const list = await load(); const i = list.findIndex((x) => x.id === String(b.id || '') && x.by.id === s.id);
    if (i < 0) return json(res, 404, { error: 'not_found' });
    list.splice(i, 1); await store.set(ALL, list);
    return json(res, 200, { ok: true });
  }
  return json(res, 400, { error: 'bad_request' });
}
