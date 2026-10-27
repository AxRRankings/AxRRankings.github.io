// Signed cookie sessions (HMAC-SHA256). No dependencies.
import crypto from 'node:crypto';

const COOKIE = 'bc_session';
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 24) throw new Error('SESSION_SECRET must be set (24+ random characters)');
  return s;
}
const b64 = (b) => Buffer.from(b).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', secret()).update(data).digest('base64url');

export function encode(payload) {
  const body = b64(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + MAX_AGE }));
  return `${body}.${sign(body)}`;
}
export function decode(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const good = sign(body);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.exp > Date.now() / 1000 ? p : null;
  } catch { return null; }
}
export function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
export function getSession(req) { return decode(parseCookies(req)[COOKIE]); }

const secure = (req) => !(req.headers.host || '').startsWith('localhost');
export function sessionCookie(req, payload) {
  return `${COOKIE}=${encode(payload)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure(req) ? '; Secure' : ''}`;
}
export function clearSessionCookie(req) {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure(req) ? '; Secure' : ''}`;
}
export function stateCookie(req, value) {
  return `bc_state=${value}; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=600${secure(req) ? '; Secure' : ''}`;
}
