import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'server', 'data');
const dataFile = path.join(dataDir, 'site-data.json');
const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '0.0.0.0';
const adminPassword = process.env.ADMIN_PASSWORD;
const sessions = new Map();

fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify({
  notices: [], inquiries: [], siteInfo: {}, activities: []
}, null, 2));

const read = () => JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const write = (d) => {
  const tmp = `${dataFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, dataFile);
};
const sendJson = (res, code, payload, extraHeaders = {}) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders });
  res.end(JSON.stringify(payload));
};
const parseBody = (req) => new Promise((resolve, reject) => {
  let raw = '';
  req.on('data', chunk => { raw += chunk; if (raw.length > 2_000_000) req.destroy(); });
  req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } });
  req.on('error', reject);
});
const cookies = (req) => Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(x => {
  const i = x.indexOf('='); return [x.slice(0, i).trim(), decodeURIComponent(x.slice(i + 1).trim())];
}));
const isAdmin = (req) => {
  const token = cookies(req).admin_session;
  return !!token && sessions.has(token);
};
const requireAdmin = (req, res) => {
  if (!isAdmin(req)) { sendJson(res, 401, { error: 'Admin authentication required' }); return false; }
  return true;
};
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.woff2':'font/woff2' };

async function api(req, res, url) {
  const pathname = url.pathname;
  if (pathname === '/api/health' && req.method === 'GET') return sendJson(res, 200, { ok: true });

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    if (!adminPassword) return sendJson(res, 503, { error: 'Admin authentication is not configured. Set ADMIN_PASSWORD on the server.' });
    const body = await parseBody(req);
    if (typeof body.password !== 'string' || body.password.length !== adminPassword.length || !crypto.timingSafeEqual(Buffer.from(body.password), Buffer.from(adminPassword))) {
      return sendJson(res, 401, { error: 'Incorrect password' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, Date.now() + 8 * 60 * 60 * 1000);
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': `admin_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800` });
  }
  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    const token = cookies(req).admin_session; if (token) sessions.delete(token);
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': 'admin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
  }
  if (pathname === '/api/auth/me' && req.method === 'GET') return sendJson(res, 200, { authenticated: isAdmin(req) });

  if (pathname === '/api/inquiries' && req.method === 'POST') {
    const item = await parseBody(req);
    item.id = item.id ?? crypto.randomUUID(); item.createdAt = item.createdAt ?? new Date().toISOString();
    const db = read(); db.inquiries.unshift(item); write(db); return sendJson(res, 201, item);
  }
  if (pathname === '/api/inquiries' && req.method === 'GET') {
    if (!requireAdmin(req, res)) return;
    return sendJson(res, 200, read().inquiries || []);
  }

  if (pathname === '/api/siteInfo') {
    if (req.method === 'GET') return sendJson(res, 200, read().siteInfo || {});
    if (req.method === 'PUT') { if (!requireAdmin(req, res)) return; const db = read(); db.siteInfo = await parseBody(req); write(db); return sendJson(res, 200, db.siteInfo); }
  }

  const match = pathname.match(/^\/api\/(notices|activities)(?:\/([^/]+))?$/);
  if (match) {
    const resource = match[1], id = match[2];
    if (req.method === 'GET') {
      const rows = read()[resource] || [];
      return sendJson(res, 200, id ? (rows.find(x => String(x.id) === id) || null) : rows);
    }
    if (!requireAdmin(req, res)) return;
    const db = read(); db[resource] ||= [];
    if (req.method === 'POST') { const item = await parseBody(req); item.id ??= crypto.randomUUID(); item.createdAt ??= new Date().toISOString(); db[resource].unshift(item); write(db); return sendJson(res, 201, item); }
    if (req.method === 'DELETE' && id) { db[resource] = db[resource].filter(x => String(x.id) !== id); write(db); return sendJson(res, 200, { ok: true }); }
  }

  return sendJson(res, 404, { error: 'Not found' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'Method not allowed' });

    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    let filePath = path.join(distDir, pathname);
    if (!filePath.startsWith(distDir)) return sendJson(res, 400, { error: 'Invalid path' });
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) filePath = path.join(distDir, 'index.html');
    if (!fs.existsSync(filePath)) return sendJson(res, 503, { error: 'Frontend build not found. Run npm run build first.' });
    res.writeHead(200, { 'Content-Type': mime[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  } catch (err) { sendJson(res, 500, { error: 'Server error' }); }
});

setInterval(() => { const now = Date.now(); for (const [token, expiry] of sessions) if (expiry < now) sessions.delete(token); }, 60_000).unref();
server.listen(port, host, () => console.log(`The Vision English School: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`));
