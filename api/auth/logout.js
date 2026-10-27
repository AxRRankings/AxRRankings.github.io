import { redirect } from '../../lib/http.js';
import { clearSessionCookie } from '../../lib/session.js';
export default function handler(req, res) { redirect(res, '/', { 'set-cookie': clearSessionCookie(req) }); }
