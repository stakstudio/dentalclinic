/* ============================================================
   Local dev server (zero dependencies).
   Serves the static site AND the /api/smile function together,
   so you can test the AI smile feature locally without the
   Vercel CLI. Production still uses the Vercel serverless
   function in /api/smile.js unchanged.

   Run:  npm start        (then open http://localhost:3000)
   ============================================================ */
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { readFileSync, existsSync } from 'fs';
import { extname, join, normalize } from 'path';
import handler from './api/smile.js';

// ---- load .env into process.env (so GEMINI_API_KEY is available) ----
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
    }
  }
}

const PORT = process.env.PORT || 3000;
const ROOT = process.cwd();
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
};

const server = createServer((req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);

  // ---- API route → reuse the Vercel handler ----
  if (path === '/api/smile') {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', async () => {
      try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
      // shim the few Express/Vercel helpers the handler uses
      res.status = (code) => { res.statusCode = code; return res; };
      res.json = (obj) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(obj));
        return res;
      };
      try {
        await handler(req, res);
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Server error' }));
      }
    });
    return;
  }

  // ---- static files ----
  let rel = path === '/' ? '/index.html' : path;
  const filePath = normalize(join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) { res.statusCode = 403; return res.end('Forbidden'); }

  readFile(filePath)
    .then((data) => {
      res.setHeader('Content-Type', MIME[extname(filePath).toLowerCase()] || 'application/octet-stream');
      res.end(data);
    })
    .catch(() => { res.statusCode = 404; res.end('Not found'); });
});

server.listen(PORT, () => {
  console.log(`\n  ▶  Dr. Sumaya site running at  http://localhost:${PORT}`);
  console.log(`     API endpoint:               http://localhost:${PORT}/api/smile`);
  console.log(`     GEMINI_API_KEY loaded:      ${process.env.GEMINI_API_KEY ? 'yes ✓' : 'NO — check .env'}\n`);
});
