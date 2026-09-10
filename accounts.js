'use strict';
/*
 * Nepal Live accounts: sign-up, login, sessions, profile preferences, saved
 * items and personal alerts. Zero dependencies — Node's crypto and one JSON
 * file in DATA_DIR, written atomically (temp file + rename).
 *
 * Security
 *  - passwords: scrypt (N=16384, r=8, p=1) with a per-user 16-byte salt,
 *    compared in constant time; unknown emails are checked against a dummy
 *    hash so response time does not reveal which emails exist
 *  - sessions: 256-bit random tokens; only their SHA-256 is stored; a new
 *    token on every login; HttpOnly + SameSite=Lax cookie, Secure over HTTPS
 *  - CSRF: every state-changing request must be same-origin (Origin /
 *    Sec-Fetch-Site) and JSON — a cross-site form cannot send either
 *  - rate limits per IP (and per account for login); body size capped;
 *    every field validated; no CORS headers on these routes
 *
 * Storage: DATA_DIR must be a persistent disk in production. On an ephemeral
 * filesystem (e.g. Render's free tier) accounts are lost on every deploy —
 * GET /api/me reports this so the page can say so.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const COOKIE = 'nl_sid';
const SESSION_TTL = 30 * 864e5;
const MAX_BODY = 16 * 1024;
const MAX_USERS = 10000;
const MAX_SAVED = 300;
const LEVELS = ['info', 'advisory', 'warning', 'emergency'];
const ITEM_TYPES = ['news', 'job', 'event', 'gov', 'place', 'match', 'page'];
const TRUST_PROXY = process.env.TRUST_PROXY === '1' || !!process.env.RENDER;

module.exports = function init(opts) {
  const FILE = path.join(opts.dataDir, 'accounts.json');
  const durable = !!opts.durable;
  fs.mkdirSync(opts.dataDir, { recursive: true });
  let db;
  try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { db = {}; }
  db.users = db.users || {};
  db.emails = db.emails || {};
  db.sessions = db.sessions || {};

  /* ------------------------------------------------------------- storage */
  let writeT = null;
  const writeNow = () => {
    const tmp = FILE + '.' + process.pid + '.tmp';
    try { fs.writeFileSync(tmp, JSON.stringify(db), { mode: 0o600 }); fs.renameSync(tmp, FILE); }
    catch (e) { console.error('[accounts] save failed:', e.message); }
  };
  const persist = () => { if (!writeT) writeT = setTimeout(() => { writeT = null; writeNow(); }, 250); };
  const flush = () => { if (writeT) { clearTimeout(writeT); writeT = null; writeNow(); } };
  ['SIGTERM', 'SIGINT'].forEach((sig) => process.once(sig, () => { flush(); process.exit(0); }));

  const sweep = () => {
    const now = Date.now();
    for (const [k, s] of Object.entries(db.sessions)) if (s.exp < now || !db.users[s.uid]) delete db.sessions[k];
  };
  sweep();
  setInterval(() => { sweep(); persist(); }, 3600e3).unref();

  /* -------------------------------------------------------------- crypto */
  const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
  const scrypt = (pw, salt, o) => new Promise((resolve, reject) =>
    crypto.scrypt(String(pw).normalize('NFKC'), salt, 64, o, (e, k) => (e ? reject(e) : resolve(k))));
  async function hashPw(pw) {
    const salt = crypto.randomBytes(16);
    const k = await scrypt(pw, salt, SCRYPT);
    return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), k.toString('base64')].join('$');
  }
  async function checkPw(pw, stored) {
    const f = String(stored || '').split('$');
    if (f.length !== 6 || f[0] !== 'scrypt') return false;
    const k = await scrypt(pw, Buffer.from(f[4], 'base64'), { N: +f[1], r: +f[2], p: +f[3], maxmem: SCRYPT.maxmem });
    const want = Buffer.from(f[5], 'base64');
    return want.length === k.length && crypto.timingSafeEqual(want, k);
  }
  let DUMMY = '';
  hashPw(crypto.randomBytes(16).toString('hex')).then((h) => { DUMMY = h; });
  const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

  /* ---------------------------------------------------------- rate limits */
  const hits = new Map();
  function limited(key, max, windowMs) {
    const now = Date.now();
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    arr.push(now);
    hits.set(key, arr);
    return arr.length > max;
  }
  setInterval(() => {
    const now = Date.now();
    for (const [k, a] of hits) if (!a.length || now - a[a.length - 1] > 3600e3) hits.delete(k);
  }, 600e3).unref();
  /* behind Render's proxy the client address arrives in headers; otherwise
     headers are client-controlled, so use the socket */
  const ipOf = (req) => (TRUST_PROXY
    ? String(req.headers['true-client-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0]).trim()
    : '') || req.socket.remoteAddress || '?';
  const isHttps = (req) => (TRUST_PROXY ? /^https/i.test(String(req.headers['x-forwarded-proto'] || '')) : !!req.socket.encrypted);

  /* ------------------------------------------------------------ http bits */
  function json(res, status, body, headers) {
    const buf = Buffer.from(JSON.stringify(body), 'utf8');
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Content-Length': buf.length, ...headers,
    });
    res.end(buf);
  }
  const fail = (status, msg, code) => Object.assign(new Error(msg), { status, code });
  function readBody(req) {
    return new Promise((resolve, reject) => {
      if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return reject(fail(415, 'JSON body required.', 'bad_type'));
      let size = 0;
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size > MAX_BODY) { reject(fail(413, 'Request too large.', 'too_large')); req.destroy(); } else chunks.push(c);
      });
      req.on('end', () => {
        try {
          const v = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
          resolve(v && typeof v === 'object' && !Array.isArray(v) ? v : {});
        } catch (e) { reject(fail(400, 'Invalid JSON.', 'bad_json')); }
      });
      req.on('error', reject);
    });
  }
  function sameOrigin(req) {
    const origin = req.headers.origin;
    if (origin) { try { return new URL(origin).host === req.headers.host; } catch (e) { return false; } }
    return req.headers['sec-fetch-site'] === 'same-origin';
  }
  const tokenOf = (req) => { const m = /(?:^|;\s*)nl_sid=([A-Za-z0-9_-]{20,100})/.exec(req.headers.cookie || ''); return m ? m[1] : null; };
  const cookie = (req, token, maxAge) => `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isHttps(req) ? '; Secure' : ''}`;
  const clearCookie = (req) => cookie(req, '', 0);

  function session(req) {
    const tok = tokenOf(req);
    if (!tok) return null;
    const key = sha(tok), s = db.sessions[key];
    if (!s || s.exp < Date.now() || !db.users[s.uid]) return null;
    if (Date.now() - (s.seen || 0) > 3600e3) { s.seen = Date.now(); s.exp = Date.now() + SESSION_TTL; persist(); }
    return { key, user: db.users[s.uid] };
  }
  function newSession(uid) {
    const token = crypto.randomBytes(32).toString('base64url');
    db.sessions[sha(token)] = { uid, created: Date.now(), seen: Date.now(), exp: Date.now() + SESSION_TTL };
    Object.entries(db.sessions).filter(([, s]) => s.uid === uid).sort((a, b) => b[1].seen - a[1].seen)
      .slice(10).forEach(([k]) => delete db.sessions[k]);
    persist();
    return token;
  }
  const dropSessions = (uid, keep) => {
    for (const [k, s] of Object.entries(db.sessions)) if (s.uid === uid && k !== keep) delete db.sessions[k];
  };

  /* ----------------------------------------------------------- validation */
  const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : '');
  const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}$/;
  function vEmail(v) {
    const e = str(v, 254).toLowerCase();
    if (!EMAIL_RE.test(e)) throw fail(400, 'Enter a valid email address.', 'bad_email');
    return e;
  }
  function vPassword(v, email) {
    if (typeof v !== 'string' || v.length < 8) throw fail(400, 'Password must be at least 8 characters.', 'short_password');
    if (v.length > 200) throw fail(400, 'Password is too long (200 characters at most).', 'long_password');
    if (email && v.trim().toLowerCase() === email) throw fail(400, 'Password must not be your email address.', 'weak_password');
    return v;
  }
  /* links saved by users: same-site paths or http(s) URLs only — never javascript: or data: */
  function safeUrl(v) {
    const s = str(v, 800);
    if (!s) return '';
    if (/^\/(?!\/)/.test(s)) return s;
    try { const u = new URL(s); return /^https?:$/.test(u.protocol) ? u.toString() : ''; } catch (e) { return ''; }
  }
  const cityIds = new Set((opts.cities || []).map((c) => c.id));
  const DISTRICT_RE = /^[A-Za-z][A-Za-z .'-]{1,39}$/;
  const defaultPrefs = () => ({ lang: 'en', theme: 'system', city: '', alerts: { enabled: true, minLevel: 'warning', categories: [], districts: [] } });
  function vPrefs(p, cur) {
    const out = JSON.parse(JSON.stringify(cur || defaultPrefs()));
    if (!p || typeof p !== 'object') return out;
    if (p.lang !== undefined) { if (!['en', 'ne'].includes(p.lang)) throw fail(400, 'Invalid language.', 'bad_pref'); out.lang = p.lang; }
    if (p.theme !== undefined) { if (!['light', 'dark', 'system'].includes(p.theme)) throw fail(400, 'Invalid theme.', 'bad_pref'); out.theme = p.theme; }
    if (p.city !== undefined) {
      const c = str(p.city, 40);
      if (c && !cityIds.has(c)) throw fail(400, 'Unknown city.', 'bad_pref');
      out.city = c;
    }
    if (p.alerts !== undefined) {
      const a = p.alerts && typeof p.alerts === 'object' ? p.alerts : {};
      if (a.enabled !== undefined) out.alerts.enabled = !!a.enabled;
      if (a.minLevel !== undefined) {
        if (!LEVELS.includes(a.minLevel)) throw fail(400, 'Invalid alert level.', 'bad_pref');
        out.alerts.minLevel = a.minLevel;
      }
      if (a.categories !== undefined) {
        if (!Array.isArray(a.categories)) throw fail(400, 'Invalid alert categories.', 'bad_pref');
        out.alerts.categories = [...new Set(a.categories.map((x) => str(x, 20)).filter((x) => /^[a-z_]{2,20}$/.test(x)))].slice(0, 12);
      }
      if (a.districts !== undefined) {
        if (!Array.isArray(a.districts)) throw fail(400, 'Invalid districts.', 'bad_pref');
        out.alerts.districts = [...new Set(a.districts.map((x) => str(x, 40)).filter((x) => DISTRICT_RE.test(x)))].slice(0, 20);
      }
    }
    return out;
  }
  function vItem(b) {
    const type = str(b.type, 12);
    if (!ITEM_TYPES.includes(type)) throw fail(400, 'Invalid item type.', 'bad_item');
    const url = safeUrl(b.url), title = str(b.title, 300);
    if (!url || !title) throw fail(400, 'A saved item needs a title and a link.', 'bad_item');
    const img = safeUrl(b.img);
    return {
      key: (type + ':' + (str(b.id, 200) || url)).slice(0, 240), type, title, url,
      sub: str(b.sub, 200), img: /^https?:/.test(img) ? img : '', savedAt: new Date().toISOString(),
    };
  }
  const pub = (u) => ({
    id: u.id, email: u.email, name: u.name, created: u.created, prefs: u.prefs,
    saved: u.saved.map((s) => s.key), seenAt: u.seenAt || 0,
  });

  /* --------------------------------------------------------------- routes */
  async function signup(req, res, ip) {
    if (limited('signup:' + ip, 5, 3600e3)) throw fail(429, 'Too many sign-ups from this network. Try again in an hour.', 'rate');
    const b = await readBody(req);
    const email = vEmail(b.email);
    const pw = vPassword(b.password, email);
    const name = str(b.name, 60);
    if (db.emails[email]) throw fail(409, 'An account with this email already exists — log in instead.', 'exists');
    if (Object.keys(db.users).length >= MAX_USERS) throw fail(503, 'Sign-ups are paused right now.', 'full');
    const pwd = await hashPw(pw);
    if (db.emails[email]) throw fail(409, 'An account with this email already exists — log in instead.', 'exists');
    const id = crypto.randomBytes(9).toString('base64url');
    db.users[id] = { id, email, name, pwd, created: new Date().toISOString(), prefs: vPrefs(b.prefs, defaultPrefs()), saved: [], seenAt: Date.now() };
    db.emails[email] = id;
    const tok = newSession(id);
    json(res, 201, { user: pub(db.users[id]) }, { 'Set-Cookie': cookie(req, tok, SESSION_TTL / 1000) });
  }
  async function login(req, res, ip) {
    if (limited('login:' + ip, 20, 15 * 60e3)) throw fail(429, 'Too many attempts. Wait 15 minutes and try again.', 'rate');
    const b = await readBody(req);
    const email = str(b.email, 254).toLowerCase();
    const pw = typeof b.password === 'string' ? b.password.slice(0, 200) : '';
    if (limited('login-acct:' + sha(email), 10, 15 * 60e3)) throw fail(429, 'Too many attempts for this account. Wait 15 minutes and try again.', 'rate');
    const uid = db.emails[email], user = uid && db.users[uid];
    const ok = await checkPw(pw, user ? user.pwd : DUMMY);
    if (!user || !ok) throw fail(401, 'Email or password is incorrect.', 'bad_login');
    const tok = newSession(user.id);
    json(res, 200, { user: pub(user) }, { 'Set-Cookie': cookie(req, tok, SESSION_TTL / 1000) });
  }

  /* Personal alerts come only from the official alert feed (BIPAD, Department
     of Roads, USGS, GDACS, government air stations), filtered by the user's
     choices. Nothing is generated; each item keeps its source link. */
  const nd = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
  async function notifications(user) {
    const pref = user.prefs.alerts;
    if (!pref.enabled) return { enabled: false, items: [], unread: 0 };
    const data = await opts.alerts();
    const min = LEVELS.indexOf(pref.minLevel);
    const cats = new Set(pref.categories), ds = new Set(pref.districts.map(nd));
    const items = (data.items || []).filter((a) => a.active !== false && LEVELS.indexOf(a.level) >= min
      && (!cats.size || cats.has(a.category))
      /* earthquakes carry no district and are felt across many, so a district filter keeps them */
      && (!ds.size || (a.district ? ds.has(nd(a.district)) : a.category === 'earthquake')))
      .slice(0, 40)
      .map((a) => ({
        id: a.id, level: a.level, category: a.category, kind: a.kind, title: a.title, titleNe: a.titleNe || null,
        location: a.location, district: a.district, time: a.time, source: a.source, stale: !!a.stale,
        unread: Date.parse(a.time) > (user.seenAt || 0),
      }));
    return { enabled: true, items, unread: items.filter((i) => i.unread).length, fetchedAt: data.fetchedAt || new Date().toISOString() };
  }

  async function handle(req, res, p, u) {
    try {
      const m = req.method === 'HEAD' ? 'GET' : req.method;
      if (m !== 'GET' && !sameOrigin(req)) throw fail(403, 'Cross-site request blocked.', 'csrf');
      const ip = ipOf(req);
      if (limited('acct:' + ip, 300, 60e3)) throw fail(429, 'Too many requests — slow down.', 'rate');
      const route = m + ' ' + p;

      if (route === 'POST /api/auth/signup') return await signup(req, res, ip);
      if (route === 'POST /api/auth/login') return await login(req, res, ip);
      if (route === 'POST /api/auth/logout') {
        const s = session(req);
        if (s) { delete db.sessions[s.key]; persist(); }
        return json(res, 200, { ok: true }, { 'Set-Cookie': clearCookie(req) });
      }
      if (route === 'GET /api/me') {
        const s = session(req);
        return json(res, 200, { user: s ? pub(s.user) : null, storage: { durable } });
      }

      const s = session(req);
      if (!s) throw fail(401, 'Please log in.', 'auth');
      const user = s.user;

      switch (route) {
        case 'PATCH /api/me': {
          const b = await readBody(req);
          if (b.name !== undefined) user.name = str(b.name, 60);
          if (b.prefs !== undefined) user.prefs = vPrefs(b.prefs, user.prefs);
          persist();
          return json(res, 200, { user: pub(user) });
        }
        case 'POST /api/me/password': {
          const b = await readBody(req);
          if (limited('pw:' + user.id, 10, 15 * 60e3)) throw fail(429, 'Too many attempts. Try again later.', 'rate');
          if (!(await checkPw(typeof b.current === 'string' ? b.current.slice(0, 200) : '', user.pwd))) throw fail(401, 'Current password is incorrect.', 'bad_login');
          user.pwd = await hashPw(vPassword(b.next, user.email));
          dropSessions(user.id, s.key);
          persist();
          return json(res, 200, { ok: true });
        }
        case 'DELETE /api/me': {
          const b = await readBody(req);
          if (limited('pw:' + user.id, 10, 15 * 60e3)) throw fail(429, 'Too many attempts. Try again later.', 'rate');
          if (!(await checkPw(typeof b.password === 'string' ? b.password.slice(0, 200) : '', user.pwd))) throw fail(401, 'Password is incorrect.', 'bad_login');
          dropSessions(user.id);
          delete db.emails[user.email];
          delete db.users[user.id];
          persist();
          return json(res, 200, { ok: true }, { 'Set-Cookie': clearCookie(req) });
        }
        case 'GET /api/me/saved':
          return json(res, 200, { items: user.saved.slice().reverse() });
        case 'POST /api/me/saved': {
          const item = vItem(await readBody(req));
          user.saved = user.saved.filter((x) => x.key !== item.key);
          if (user.saved.length >= MAX_SAVED) throw fail(409, `You can keep up to ${MAX_SAVED} saved items. Remove some first.`, 'full');
          user.saved.push(item);
          persist();
          return json(res, 201, { item, saved: user.saved.map((x) => x.key) });
        }
        case 'DELETE /api/me/saved': {
          const key = str(u.searchParams.get('key'), 240);
          user.saved = user.saved.filter((x) => x.key !== key);
          persist();
          return json(res, 200, { ok: true, saved: user.saved.map((x) => x.key) });
        }
        case 'GET /api/me/notifications':
          return json(res, 200, await notifications(user));
        case 'POST /api/me/notifications/seen':
          user.seenAt = Date.now();
          persist();
          return json(res, 200, { ok: true, seenAt: user.seenAt });
        default:
          throw fail(404, 'Not found.', 'not_found');
      }
    } catch (e) {
      if (!e.status) console.error('[accounts]', e && e.message);
      if (!res.headersSent) json(res, e.status || 500, { error: e.status ? e.message : 'Something went wrong. Please try again.', code: e.code || 'error' });
    }
  }

  return { handle, flush, count: () => Object.keys(db.users).length };
};
