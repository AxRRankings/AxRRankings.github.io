import { redirect } from '../../lib/http.js';
import { clearSessionCookie } from '../../lib/session.js';
export default function handler(req, res) {
  const again = new URL(req.url, 'http://x').searchParams.get('then') === 'login';   // "switch account": log out, then go straight to Discord login with the account screen
  redirect(res, again ? '/api/auth/login?switch=1' : '/', { 'set-cookie': clearSessionCookie(req) });
}
