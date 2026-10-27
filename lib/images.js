// Safe image loading for the server: data URIs and https URLs only,
// size/time limited, private network addresses refused (SSRF protection).
import dns from 'node:dns/promises';
import net from 'node:net';

const MAX_BYTES = 3 * 1024 * 1024;
const TIMEOUT_MS = 6000;
const OK_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80') || v.startsWith('::ffff:');
}

async function assertPublicHost(hostname) {
  if (net.isIP(hostname)) { if (isPrivateIp(hostname)) throw new Error('blocked address'); return; }
  const addrs = await dns.lookup(hostname, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error('blocked address');
}

export async function fetchImageBuffer(url, hops = 0) {
  const u = new URL(url);
  if (u.protocol !== 'https:' || u.username || u.password) throw new Error('only plain https urls');
  if (u.port && u.port !== '443') throw new Error('port not allowed');
  await assertPublicHost(u.hostname);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(u, { signal: ctrl.signal, redirect: 'manual', headers: { 'user-agent': 'AxR-BattleCards/1.0', accept: 'image/*' } });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      if (hops >= 3) throw new Error('too many redirects');
      return fetchImageBuffer(new URL(res.headers.get('location'), u).toString(), hops + 1);
    }
    if (!res.ok) throw new Error('http ' + res.status);
    const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!OK_TYPES.includes(type)) throw new Error('not an image');
    const len = Number(res.headers.get('content-length') || 0);
    if (len > MAX_BYTES) throw new Error('image too large');
    const chunks = []; let total = 0;
    for await (const c of res.body) {
      total += c.length;
      if (total > MAX_BYTES) throw new Error('image too large');
      chunks.push(c);
    }
    return { buffer: Buffer.concat(chunks), type };
  } finally { clearTimeout(timer); }
}

export function dataUriToBuffer(uri) {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(uri);
  if (!m) throw new Error('bad data uri');
  return { buffer: Buffer.from(m[2], 'base64'), type: m[1] };
}

export async function loadSource(src) {
  if (!src) return null;
  if (src.startsWith('data:')) return dataUriToBuffer(src);
  return fetchImageBuffer(src);
}
