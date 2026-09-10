'use strict';
/*
 * Account store in Supabase (Postgres), through Supabase's REST API
 * (PostgREST) with plain fetch — no SDK, no dependencies. Same async
 * interface as store-file.js. Tables: supabase-schema.sql.
 *
 * It uses the project's SECRET key (sb_secret_… or the legacy service_role
 * key). That key bypasses row-level security, so it must only ever live in the
 * server's environment — never in the browser, the repo or a chat. The tables
 * have RLS switched on with no policies, so the public anon key reads nothing.
 *
 * Any network or database error surfaces as a 503 ("temporarily unavailable"):
 * accounts fail closed rather than guessing.
 */
module.exports = function supabaseStore({ url, key, timeout = 8000 }) {
  const base = String(url).replace(/\/+$/, '') + '/rest/v1/';
  const H = { apikey: key, 'Content-Type': 'application/json', Accept: 'application/json' };
  /* legacy service_role keys are JWTs and also go in Authorization; the newer sb_secret_ keys go in apikey only */
  if (/^eyJ/.test(key)) H.Authorization = 'Bearer ' + key;
  const q = encodeURIComponent;
  const down = (detail) => Object.assign(new Error('Accounts are temporarily unavailable. Please try again shortly.'), { status: 503, code: 'store', detail });

  async function call(method, pathQuery, body, prefer) {
    let r;
    try {
      r = await fetch(base + pathQuery, {
        method, headers: prefer ? { ...H, Prefer: prefer } : H,
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(timeout),
      });
    } catch (e) {
      console.error('[supabase]', method, pathQuery.split('?')[0], e.message);
      throw down(e.message);
    }
    const text = await r.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch (e) { data = text; } }
    if (!r.ok) {
      if (data && data.code === '23505') throw Object.assign(new Error('exists'), { code: 'exists' }); /* unique violation */
      const why = `${r.status} ${(data && (data.message || data.hint)) || text}`.slice(0, 300);
      console.error('[supabase]', method, pathQuery.split('?')[0], why);
      throw down(why);
    }
    return { data, res: r };
  }
  const first = (rows) => (Array.isArray(rows) && rows.length ? rows[0] : null);
  const toUser = (row) => row && {
    id: row.id, email: row.email, name: row.name || '', pwd: row.pwd, created: row.created_at,
    prefs: row.prefs || {}, seenAt: Number(row.seen_at) || 0,
  };
  const MIN = 'return=minimal';

  return {
    kind: 'supabase',
    /* startup check: the tables exist and the key can reach them */
    async ping() { await call('GET', 'nl_users?select=id&limit=1'); },

    async findUserByEmail(email) { return toUser(first((await call('GET', `nl_users?email=eq.${q(email)}&select=*&limit=1`)).data)); },
    async getUser(id) { return toUser(first((await call('GET', `nl_users?id=eq.${q(id)}&select=*&limit=1`)).data)); },
    async countUsers() {
      const { res } = await call('GET', 'nl_users?select=id&limit=1', undefined, 'count=exact');
      const n = parseInt(String(res.headers.get('content-range') || '').split('/')[1], 10);
      return Number.isFinite(n) ? n : 0;
    },
    async createUser(u) {
      await call('POST', 'nl_users', { id: u.id, email: u.email, name: u.name, pwd: u.pwd, prefs: u.prefs, seen_at: u.seenAt, created_at: u.created }, MIN);
    },
    async updateUser(id, patch) {
      const row = {};
      if ('name' in patch) row.name = patch.name;
      if ('pwd' in patch) row.pwd = patch.pwd;
      if ('prefs' in patch) row.prefs = patch.prefs;
      if ('seenAt' in patch) row.seen_at = patch.seenAt;
      await call('PATCH', `nl_users?id=eq.${q(id)}`, row, MIN);
    },
    /* sessions and saved items are removed by ON DELETE CASCADE */
    async deleteUser(id) { await call('DELETE', `nl_users?id=eq.${q(id)}`, undefined, MIN); },

    async createSession(s) { await call('POST', 'nl_sessions', { key: s.key, user_id: s.uid, created: s.created, seen: s.seen, exp: s.exp }, MIN); },
    /* one round trip: the session row with its user embedded through the foreign key */
    async getSession(key) {
      const row = first((await call('GET', `nl_sessions?key=eq.${q(key)}&select=key,user_id,exp,seen,nl_users(*)&limit=1`)).data);
      return row ? { key: row.key, uid: row.user_id, exp: Number(row.exp), seen: Number(row.seen), user: toUser(row.nl_users) } : null;
    },
    async touchSession(key, seen, exp) { await call('PATCH', `nl_sessions?key=eq.${q(key)}`, { seen, exp }, MIN); },
    async deleteSession(key) { await call('DELETE', `nl_sessions?key=eq.${q(key)}`, undefined, MIN); },
    async deleteUserSessions(uid, keep) {
      await call('DELETE', `nl_sessions?user_id=eq.${q(uid)}` + (keep ? `&key=neq.${q(keep)}` : ''), undefined, MIN);
    },
    async pruneSessions(uid, max) {
      const { data } = await call('GET', `nl_sessions?user_id=eq.${q(uid)}&select=key&order=seen.desc&offset=${max}`);
      const keys = (data || []).map((x) => x.key).filter((k) => /^[a-f0-9]{64}$/.test(k));
      if (keys.length) await call('DELETE', `nl_sessions?key=in.(${keys.join(',')})`, undefined, MIN);
    },
    async sweep() { await call('DELETE', `nl_sessions?exp=lt.${Date.now()}`, undefined, MIN); },

    async listSaved(uid) {
      const { data } = await call('GET', `nl_saved?user_id=eq.${q(uid)}&select=key,type,title,url,sub,img,saved_at&order=saved_at.asc`);
      return (data || []).map((r) => ({ key: r.key, type: r.type, title: r.title, url: r.url, sub: r.sub || '', img: r.img || '', savedAt: r.saved_at }));
    },
    async savedKeys(uid) {
      const { data } = await call('GET', `nl_saved?user_id=eq.${q(uid)}&select=key&order=saved_at.asc`);
      return (data || []).map((r) => r.key);
    },
    /* re-saving an item updates it and moves it to the end (newest) */
    async addSaved(uid, it) {
      await call('POST', 'nl_saved?on_conflict=user_id,key',
        { user_id: uid, key: it.key, type: it.type, title: it.title, url: it.url, sub: it.sub, img: it.img, saved_at: it.savedAt },
        'resolution=merge-duplicates,' + MIN);
    },
    async removeSaved(uid, key) { await call('DELETE', `nl_saved?user_id=eq.${q(uid)}&key=eq.${q(key)}`, undefined, MIN); },
    flush() {},
  };
};
