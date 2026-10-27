// Storage: Upstash Redis (REST) in production, a JSON file for local testing.
import fs from 'node:fs';
import path from 'node:path';

const URL_ = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const FILE = path.join(process.cwd(), 'data', 'store.json');

async function redis(cmd) {
  const res = await fetch(URL_, { method: 'POST', headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify(cmd) });
  const out = await res.json();
  if (!res.ok || out.error) throw new Error('store error: ' + (out.error || res.status));
  return out.result;
}

function readFile() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; } }
function writeFile(o) { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(o)); }

export const usingRedis = Boolean(URL_ && TOKEN);

export async function get(key) {
  if (usingRedis) { const v = await redis(['GET', key]); return v ? JSON.parse(v) : null; }
  const all = readFile(); const e = all[key];
  if (!e) return null;
  if (e.exp && e.exp < Date.now()) return null;
  return e.v;
}
export async function set(key, value, { ex } = {}) {
  if (usingRedis) { await redis(ex ? ['SET', key, JSON.stringify(value), 'EX', ex] : ['SET', key, JSON.stringify(value)]); return; }
  const all = readFile(); all[key] = { v: value, exp: ex ? Date.now() + ex * 1000 : 0 }; writeFile(all);
}
// returns the new counter value; the counter expires after `ex` seconds
export async function hit(key, ex = 60) {
  if (usingRedis) {
    const n = await redis(['INCR', key]);
    if (n === 1) await redis(['EXPIRE', key, String(ex)]);
    return n;
  }
  const all = readFile(); const now = Date.now();
  const e = all[key] && all[key].exp > now ? all[key] : { v: 0, exp: now + ex * 1000 };
  e.v += 1; all[key] = e; writeFile(all); return e.v;
}
