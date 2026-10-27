import { exchangeCode, fetchOAuthUser } from '../../lib/discord.js';
import { baseUrl, redirect, send } from '../../lib/http.js';
import { parseCookies, sessionCookie } from '../../lib/session.js';

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x');
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const saved = parseCookies(req).bc_state;
    if (!code || !state || !saved || state !== saved) return redirect(res, '/?error=login_failed');
    const token = await exchangeCode(code, `${baseUrl(req)}/api/auth/callback`);
    const user = await fetchOAuthUser(token.access_token);
    res.setHeader('set-cookie', [sessionCookie(req, { id: user.id, username: user.username }), 'bc_state=; Path=/api/auth; Max-Age=0']);
    redirect(res, '/editor');
  } catch (e) {
    console.error('callback error', e.message);
    send(res, 500, 'Login failed. Please go back and try again.');
  }
}
