import crypto from 'node:crypto';
import { oauthUrl, demoMode } from '../../lib/discord.js';
import { baseUrl, redirect } from '../../lib/http.js';
import { sessionCookie, stateCookie } from '../../lib/session.js';

export default function handler(req, res) {
  if (demoMode) {   // local testing only: skips Discord. Never set DEMO_MODE in production.
    return redirect(res, '/editor', { 'set-cookie': sessionCookie(req, { id: 'demo', username: 'demo' }) });
  }
  const state = crypto.randomBytes(16).toString('hex');
  redirect(res, oauthUrl(`${baseUrl(req)}/api/auth/callback`, state), { 'set-cookie': stateCookie(req, state) });
}
