import { getSession } from './session.js';
import { json, sameOrigin } from './http.js';
import * as store from './store.js';

export function requireUser(req, res) {
  const s = getSession(req);
  if (!s || !s.id) { json(res, 401, { error: 'login_required' }); return null; }
  return s;
}
export function requirePost(req, res) {
  if (req.method !== 'POST') { json(res, 405, { error: 'method_not_allowed' }, { allow: 'POST' }); return false; }
  if (!sameOrigin(req)) { json(res, 403, { error: 'bad_origin' }); return false; }
  const ct = (req.headers['content-type'] || '').toLowerCase();
  if (!ct.includes('application/json')) { json(res, 415, { error: 'json_required' }); return false; }
  return true;
}
export async function limited(res, userId, bucket, max, windowSec = 60) {
  const n = await store.hit(`bc:rl:${bucket}:${userId}`, windowSec);
  if (n > max) { json(res, 429, { error: 'slow_down' }); return true; }
  return false;
}
