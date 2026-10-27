// Tiny helpers so the handlers work on Vercel AND in the local dev server.
export function send(res, status, body, headers = {}) {
  res.statusCode = status;
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  if (Buffer.isBuffer(body)) { res.end(body); return; }
  if (typeof body === 'object') { res.setHeader('content-type', 'application/json; charset=utf-8'); res.end(JSON.stringify(body)); return; }
  res.end(String(body ?? ''));
}
export const json = (res, status, obj, headers) => send(res, status, obj, { 'cache-control': 'no-store', ...headers });
export function redirect(res, location, extra = {}) { res.statusCode = 302; res.setHeader('location', location); for (const [k, v] of Object.entries(extra)) res.setHeader(k, v); res.end(); }

export async function readJson(req, limit = 1_000_000) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
    try { return JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString() : String(req.body)); } catch { return null; }
  }
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > limit) return null; chunks.push(c); }
  try { return JSON.parse(Buffer.concat(chunks).toString() || 'null'); } catch { return null; }
}

export function baseUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || (req.headers.host?.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${req.headers.host}`;
}

// Blocks cross-site POSTs (CSRF) on top of the SameSite=Lax cookie.
export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}
