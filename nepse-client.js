/*
 * NEPSE API client — replicates the official website's token flow:
 *   1. GET /api/authenticate/prove  -> accessToken + salt1..salt5
 *   2. Run the site's css.wasm (cdx/rdx/bdx/ndx/mdx) to prune the token
 *   3. Use header  Authorization: Salter <pruned token>
 * Tokens are cached and refreshed on expiry.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE = 'https://www.nepalstock.com';

/* css.wasm may live next to this file, in a nepse/ subfolder, or at the
   project root (flattened uploads). Find whichever exists. */
const WASM_CANDIDATES = [
  path.join(__dirname, 'css.wasm'),
  path.join(__dirname, 'nepse', 'css.wasm'),
  path.join(__dirname, '..', 'css.wasm'),
  path.join(__dirname, '..', 'nepse', 'css.wasm'),
];
function findWasm() {
  for (const p of WASM_CANDIDATES) {
    try { if (fs.existsSync(p)) return p; } catch (e) { /* ignore */ }
  }
  throw new Error('css.wasm not found');
}

let wasmInstance = null;
let tokenCache = { token: null, obtainedAt: 0 };

function httpsJSON(method, url, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      method,
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Origin': BASE,
        'Referer': BASE + '/',
        ...headers,
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(text)); } catch (e) { reject(new Error('bad JSON: ' + text.slice(0, 120))); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 120)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('timeout')));
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function getWasm() {
  if (wasmInstance) return wasmInstance;
  const buf = fs.readFileSync(findWasm());
  const { instance } = await WebAssembly.instantiate(buf, {});
  wasmInstance = instance;
  return instance;
}

function prune(token, inst, s) {
  // exact same splice chain the official site applies (accessToken order)
  const a = inst.exports.cdx(s[0], s[1], s[2], s[3], s[4]);
  const b = inst.exports.rdx(s[0], s[1], s[3], s[2], s[4]);
  const c = inst.exports.bdx(s[0], s[1], s[3], s[2], s[4]);
  const d = inst.exports.ndx(s[0], s[1], s[3], s[2], s[4]);
  const e = inst.exports.mdx(s[0], s[1], s[3], s[2], s[4]);
  return token.slice(0, a)
    + token.slice(a + 1, b)
    + token.slice(b + 1, c)
    + token.slice(c + 1, d)
    + token.slice(d + 1, e)
    + token.slice(e + 1);
}

async function getToken(force = false) {
  // token rotates every ~5 minutes on the site; refresh every 4 min or on demand
  if (!force && tokenCache.token && Date.now() - tokenCache.obtainedAt < 4 * 60e3) {
    return tokenCache.token;
  }
  const prove = await httpsJSON('GET', `${BASE}/api/authenticate/prove`);
  if (!prove.accessToken) throw new Error('prove response missing accessToken');
  const inst = await getWasm();
  const salts = [prove.salt1, prove.salt2, prove.salt3, prove.salt4, prove.salt5];
  const token = prune(prove.accessToken, inst, salts);
  tokenCache = { token, obtainedAt: Date.now() };
  return token;
}

async function nepseGet(apiPath) {
  let token = await getToken();
  try {
    return await httpsJSON('GET', `${BASE}/api/${apiPath}`, { Authorization: `Salter ${token}` });
  } catch (e) {
    // token may have rotated — retry once with a fresh token
    token = await getToken(true);
    return await httpsJSON('GET', `${BASE}/api/${apiPath}`, { Authorization: `Salter ${token}` });
  }
}

module.exports = { nepseGet, getToken };
