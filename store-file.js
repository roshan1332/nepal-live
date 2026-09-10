'use strict';
/*
 * Account store in one JSON file — for local development (or a server with a
 * persistent disk). Same async interface as store-supabase.js. Written
 * atomically (temp file + rename) a moment after each change, and flushed on
 * shutdown. The file holds emails and password hashes: it lives in DATA_DIR,
 * which is git-ignored — never commit it.
 */
const fs = require('fs');
const path = require('path');

module.exports = function fileStore(dir) {
  const FILE = path.join(dir, 'accounts.json');
  fs.mkdirSync(dir, { recursive: true });
  let db;
  try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { db = {}; }
  db.users = db.users || {};
  db.emails = db.emails || {};
  db.sessions = db.sessions || {};

  let writeT = null;
  const writeNow = () => {
    const tmp = FILE + '.' + process.pid + '.tmp';
    try { fs.writeFileSync(tmp, JSON.stringify(db), { mode: 0o600 }); fs.renameSync(tmp, FILE); }
    catch (e) { console.error('[accounts] save failed:', e.message); }
  };
  const persist = () => { if (!writeT) writeT = setTimeout(() => { writeT = null; writeNow(); }, 250); };
  const flush = () => { if (writeT) { clearTimeout(writeT); writeT = null; writeNow(); } };
  ['SIGTERM', 'SIGINT'].forEach((sig) => process.once(sig, () => { flush(); process.exit(0); }));

  /* callers get copies, so nothing changes until they call an update */
  const copy = (u) => u && {
    id: u.id, email: u.email, name: u.name, pwd: u.pwd, created: u.created,
    prefs: JSON.parse(JSON.stringify(u.prefs || {})), seenAt: u.seenAt || 0,
  };
  const exists = () => Object.assign(new Error('exists'), { code: 'exists' });

  return {
    kind: 'file',
    async findUserByEmail(email) { return copy(db.users[db.emails[email]]) || null; },
    async getUser(id) { return copy(db.users[id]) || null; },
    async countUsers() { return Object.keys(db.users).length; },
    async createUser(u) {
      if (db.emails[u.email]) throw exists();
      db.users[u.id] = { ...copy(u), saved: [] };
      db.emails[u.email] = u.id;
      persist();
    },
    async updateUser(id, patch) {
      const u = db.users[id];
      if (!u) return;
      ['name', 'pwd', 'prefs', 'seenAt'].forEach((k) => { if (k in patch) u[k] = patch[k]; });
      persist();
    },
    async deleteUser(id) {
      const u = db.users[id];
      if (!u) return;
      delete db.emails[u.email];
      delete db.users[id];
      for (const [k, s] of Object.entries(db.sessions)) if (s.uid === id) delete db.sessions[k];
      persist();
    },

    async createSession(s) { db.sessions[s.key] = { uid: s.uid, created: s.created, seen: s.seen, exp: s.exp }; persist(); },
    async getSession(key) {
      const s = db.sessions[key];
      return s ? { key, uid: s.uid, exp: s.exp, seen: s.seen, user: copy(db.users[s.uid]) || null } : null;
    },
    async touchSession(key, seen, exp) { const s = db.sessions[key]; if (s) { s.seen = seen; s.exp = exp; persist(); } },
    async deleteSession(key) { delete db.sessions[key]; persist(); },
    async deleteUserSessions(uid, keep) {
      for (const [k, s] of Object.entries(db.sessions)) if (s.uid === uid && k !== keep) delete db.sessions[k];
      persist();
    },
    async pruneSessions(uid, max) {
      Object.entries(db.sessions).filter(([, s]) => s.uid === uid).sort((a, b) => b[1].seen - a[1].seen)
        .slice(max).forEach(([k]) => delete db.sessions[k]);
      persist();
    },
    async sweep() {
      const now = Date.now();
      for (const [k, s] of Object.entries(db.sessions)) if (s.exp < now || !db.users[s.uid]) delete db.sessions[k];
      persist();
    },

    async listSaved(uid) { return ((db.users[uid] || {}).saved || []).map((x) => ({ ...x })); },
    async savedKeys(uid) { return ((db.users[uid] || {}).saved || []).map((x) => x.key); },
    async addSaved(uid, item) {
      const u = db.users[uid];
      if (!u) return;
      u.saved = u.saved.filter((x) => x.key !== item.key).concat([{ ...item }]);
      persist();
    },
    async removeSaved(uid, key) {
      const u = db.users[uid];
      if (!u) return;
      u.saved = u.saved.filter((x) => x.key !== key);
      persist();
    },
    flush,
  };
};
