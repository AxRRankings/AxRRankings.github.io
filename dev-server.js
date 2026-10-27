// Local test server that mimics Vercel routing:  DEMO_MODE=1 SESSION_SECRET=... node dev-server.js
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PORT = Number(process.env.PORT || 3000);
const ROOT = process.cwd();
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.txt': 'text/plain' };
const REWRITES = [[/^\/editor$/, '/editor.html'], [/^\/u\/[^/]+$/, '/profile.html'], [/^\/card\/(.+)$/, '/api/card/$1']];

function findHandler(p) {
  const parts = p.replace(/^\/api\//, '').split('/');
  let dir = path.join(ROOT, 'api'); const query = {};
  for (let i = 0; i < parts.length; i++) {
    const last = i === parts.length - 1;
    const direct = path.join(dir, last ? parts[i] + '.js' : parts[i]);
    if (last && fs.existsSync(direct)) return { file: direct, query };
    if (!last && fs.existsSync(direct) && fs.statSync(direct).isDirectory()) { dir = direct; continue; }
    const dyn = fs.existsSync(dir) ? fs.readdirSync(dir).find((f) => /^\[.+\](\.js)?$/.test(f)) : null;
    if (dyn) { query[dyn.replace(/^\[|\](\.js)?$/g, '')] = parts[i]; if (last) return { file: path.join(dir, dyn), query }; }
    return null;
  }
  return null;
}

http.createServer(async (req, res) => {
  try {
    let pathname = new URL(req.url, 'http://x').pathname;
    for (const [re, to] of REWRITES) if (re.test(pathname)) { pathname = pathname.replace(re, to); break; }
    if (pathname.startsWith('/api/')) {
      const h = findHandler(pathname);
      if (!h) { res.statusCode = 404; return res.end('no such api'); }
      req.query = h.query;
      const mod = await import(pathToFileURL(h.file).href);
      return await mod.default(req, res);
    }
    const file = path.join(ROOT, 'public', pathname === '/' ? 'index.html' : pathname);
    if (!file.startsWith(path.join(ROOT, 'public')) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('content-type', MIME[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  } catch (e) { console.error(e); res.statusCode = 500; res.end('server error: ' + e.message); }
}).listen(PORT, () => console.log('dev server on http://localhost:' + PORT));
