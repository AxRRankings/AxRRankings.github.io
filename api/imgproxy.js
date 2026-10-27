// Lets the editor preview show external image URLs (browsers can't read them
// directly because of CORS). Login required so it is not an open proxy.
import { send, json } from '../lib/http.js';
import { requireUser, limited } from '../lib/guard.js';
import { fetchImageBuffer } from '../lib/images.js';

export default async function handler(req, res) {
  const s = requireUser(req, res); if (!s) return;
  if (await limited(res, s.id, 'img', 60)) return;
  const u = new URL(req.url, 'http://x').searchParams.get('u') || '';
  try {
    const { buffer, type } = await fetchImageBuffer(u);
    send(res, 200, buffer, { 'content-type': type, 'cache-control': 'private, max-age=300' });
  } catch { json(res, 400, { error: 'cannot_load_image' }); }
}
