// Gyors út (2026-11-26): ugyanaz a háttérkód (apps-script/src/*.gs), de a Vercelen fut, közvetlenül a Neonhoz kapcsolódva.
// Miért: egy Apps Script-kérés 3–4,5 mp-ig tart, ebből a saját kódunk ~0,4 mp – a többi a Google indítása/átirányítása.
// Hogyan biztonságos:
//  • Minden adatbázis-írás egy pufferbe kerül, és a kérés végén EGY tranzakcióban megy ki, feltételesen (csak ha a lap a betöltés óta
//    nem változott). Ütközésnél a kérés friss adattal újra lefut (legfeljebb 3×).
//  • Ha a kód bármi olyat érint, ami csak a Google-nál érhető el (levél, naptár, Drive, beállítás írása, titok olvasása, külső hívás),
//    a kérés eldobódik (nem írt semmit), és a böngésző az Apps Scripthez fordul – ugyanúgy, mint eddig.
//  • A felhasználók / munkamenetek / beállítások az Apps Script tükréből (lpm_kv) jönnek, titkok nélkül.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const { Worker, MessageChannel, receiveMessageOnPort } = require('worker_threads');
process.env.TZ = 'Europe/Budapest';
const TZ = 'Europe/Budapest';

/* ---- a háttérkód: api/_gas_bundle.js (scripts/gas-bundle.cjs generálja telepítéskor; build = a forrás ellenőrzőösszege) ---- */
const BUNDLE = require('./_gas_bundle.js');
const GS_FILES = BUNDLE.files.map(([n, src]) => [n, () => src]);
let SCRIPTS = null;   // lefordítva egyszer példányonként, minden kérés saját, tiszta környezetben futtatja
function scripts() {
  if (SCRIPTS) return SCRIPTS;
  SCRIPTS = GS_FILES.map(([n, rd]) => new vm.Script(rd(), { filename: n }));
  SCRIPTS.push(new vm.Script(`
    var __load = dbLoad_; dbLoad_ = function (f) { if (DB_ && DB_.loaded) return; return __load(f); };   // egy kérésen belül egyszer töltünk (az írás a végén feltételes)
    kvMirror_ = function () { };
    /* levél és HubSpot-szinkron: sorba (az adatokkal egy tranzakcióban), az Apps Script küldi el ugyanezzel a függvénnyel */
    sendAs_ = function (to, subject, text, opts) { opts = opts || {}; if (opts.attachments || opts.inlineImages) __need('levél melléklettel'); __job('sendAs_', JSON.stringify([to, subject, text, opts])); return true; };
    hsOn_ = function () { return __has('HUBSPOT_TOKEN') && PropertiesService.getScriptProperties().getProperty('HS_WRITE') !== '0'; };
    hsDealQueue_ = function (d) { if (!d || typeof hsOn_ === 'function' && !hsOn_()) return; __job('hsDealQueue_', JSON.stringify([d])); };`, { filename: '__fast_patch.js' }));
  return SCRIPTS;
}

/* ---- szinkron HTTP (a háttérkód szinkron UrlFetchApp-ot vár): külön szálon fut a fetch, a fő szál vár rá ---- */
let W = null;
function worker() {
  if (W) return W;
  W = new Worker(`const { parentPort } = require('worker_threads');
    parentPort.on('message', async ({ sab, port, url, opt }) => { const ia = new Int32Array(sab); let out;
      try { const r = await fetch(url, opt); const h = {}; r.headers.forEach((v, k) => { h[k] = v; }); out = { code: r.status, headers: h, body: await r.text() }; }
      catch (e) { out = { err: String(e && e.message || e) }; }
      port.postMessage(out); port.close(); Atomics.store(ia, 0, 1); Atomics.notify(ia, 0); });`, { eval: true });
  W.unref();
  return W;
}
function syncFetch(url, opt) {
  const sab = new SharedArrayBuffer(4), ia = new Int32Array(sab), { port1, port2 } = new MessageChannel();
  worker().postMessage({ sab, port: port2, url, opt }, [port2]);
  const st = Atomics.wait(ia, 0, 0, 25000);
  const m = receiveMessageOnPort(port1); port1.close();
  if (st === 'timed-out' || !m) throw new Error('Időtúllépés az adatbázisnál');
  if (m.message.err) throw new Error(m.message.err);
  return m.message;
}

/* ---- Neon ---- */
let DBURL = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
let DBHOST = (/^postgres(?:ql)?:\/\/[^@]+@([^/:?]+)/.exec(DBURL) || [])[1] || '';
let MOCK = null;   // tesztekhez: { sync(body) → {code, body}, async(body) → json }
function neon(body) {
  if (MOCK) return MOCK.sync(body);
  const r = syncFetch('https://' + DBHOST + '/sql', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': DBURL, 'Neon-Raw-Text-Output': 'true', 'Neon-Array-Mode': 'true' } });
  return r;
}
async function neonAsync(body) {
  if (MOCK) return MOCK.async(body);
  const r = await fetch('https://' + DBHOST + '/sql', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': DBURL, 'Neon-Raw-Text-Output': 'true', 'Neon-Array-Mode': 'true' } });
  const t = await r.text(); if (r.status !== 200) { let m = t; try { m = JSON.parse(t).message || t; } catch (e) { } throw new Error(String(m).slice(0, 300)); }
  return JSON.parse(t);
}

/* ---- megosztott gyorsítótár (példányonként, memóriában): a lapok változatonként, mint az Apps Scriptben ---- */
const MEMC = new Map();
function memGet(k) { const e = MEMC.get(k); if (!e) return null; if (e.exp < Date.now()) { MEMC.delete(k); return null; } return e.v; }

class NeedsGas extends Error { constructor(why) { super('NEEDS_GAS: ' + why); this.needsGas = true; } }

/* ---- Java-szerű dátumformázás (Utilities.formatDate / parseDate) a használt mintákra ---- */
function parts(d, tz) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short' });
  const o = {}; f.formatToParts(d).forEach(p => { o[p.type] = p.value; });
  const wd = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[o.weekday] || 1;
  return { y: o.year, M: o.month, d: o.day, H: o.hour === '24' ? '00' : o.hour, m: o.minute, s: o.second, u: wd };
}
function tzOffsetMin(d, tz) { const p = parts(d, tz); const asUtc = Date.UTC(+p.y, +p.M - 1, +p.d, +p.H, +p.m, +p.s); return Math.round((asUtc - Math.floor(d.getTime() / 1000) * 1000) / 60000); }
function formatDate(date, tz, pat) {
  const d = date instanceof Date ? date : new Date(date), p = parts(d, tz || TZ);
  let out = '', i = 0; pat = String(pat);
  while (i < pat.length) {
    const c = pat[i];
    if (c === "'") { const j = pat.indexOf("'", i + 1); out += j < 0 ? pat.slice(i + 1) : pat.slice(i + 1, j); i = j < 0 ? pat.length : j + 1; continue; }
    if (/[yMdHmsuEZX]/.test(c)) { let n = 1; while (pat[i + n] === c) n++; i += n;
      if (c === 'y') out += n === 2 ? p.y.slice(-2) : p.y;
      else if (c === 'M') out += n === 1 ? String(+p.M) : p.M;
      else if (c === 'd') out += n === 1 ? String(+p.d) : p.d;
      else if (c === 'H') out += n === 1 ? String(+p.H) : p.H;
      else if (c === 'm') out += n === 1 ? String(+p.m) : p.m;
      else if (c === 's') out += n === 1 ? String(+p.s) : p.s;
      else if (c === 'u') out += String(p.u);
      else if (c === 'E') out += ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][p.u];
      else if (c === 'Z' || c === 'X') { const off = tzOffsetMin(d, tz || TZ), sg = off < 0 ? '-' : '+', a = Math.abs(off); out += sg + String(Math.floor(a / 60)).padStart(2, '0') + (c === 'X' && n >= 3 ? ':' : '') + String(a % 60).padStart(2, '0'); }
      continue; }
    out += c; i++;
  }
  return out;
}
function parseDate(str, tz, pat) {
  str = String(str); pat = String(pat); const v = { y: 1970, M: 1, d: 1, H: 0, m: 0, s: 0 }; let i = 0, j = 0;
  while (i < pat.length) { const c = pat[i];
    if (/[yMdHms]/.test(c)) { let n = 1; while (pat[i + n] === c) n++; i += n; let k = j; while (k < str.length && /\d/.test(str[k]) && (n < 2 || k - j < Math.max(n, c === 'y' ? 4 : 2))) k++; if (k === j) throw new Error('Unparseable date: ' + str); v[c] = Number(str.slice(j, k)); j = k; continue; }
    if (str[j] !== c) throw new Error('Unparseable date: ' + str); i++; j++; }
  const guess = Date.UTC(v.y, v.M - 1, v.d, v.H, v.m, v.s);
  let t = guess - tzOffsetMin(new Date(guess), tz || TZ) * 60000; t = guess - tzOffsetMin(new Date(t), tz || TZ) * 60000;
  return new Date(t);
}
const toSigned = buf => Array.from(buf, b => (b > 127 ? b - 256 : b));
const toBuf = x => Buffer.isBuffer(x) ? x : Array.isArray(x) ? Buffer.from(x.map(b => b & 255)) : Buffer.from(String(x == null ? '' : x), 'utf8');

/* ---- egy kérés futtatása ---- */
function runOnce(raw, kv) {
  const RT = { gas: '', writes: [], cacheStage: new Map(), dbHit: 0, dbMs: 0 };
  const need = why => { if (!RT.gas) RT.gas = why; throw new NeedsGas(why); };
  const deny = name => new Proxy(function () { }, { get: (t, p) => (p === Symbol.toPrimitive || p === 'toString') ? (() => '[' + name + ']') : need(name + '.' + String(p)), apply: () => need(name + '()') });
  const SECRET = /(SECRET|PASS|TOKEN|KEY|REFRESH|LOGIN|AGENT|CRED|PRIVATE)/i;
  const props = {
    getProperty(k) { k = String(k); if (k === 'NEON_URL') return DBURL; if (SECRET.test(k)) need('titok: ' + k); const v = kv['p:' + k]; return v === undefined ? null : v; },
    getProperties() { need('getProperties'); }, getKeys() { need('getKeys'); },
    setProperty(k) { need('beállítás írása: ' + k); }, setProperties() { need('beállítás írása'); }, deleteProperty(k) { need('beállítás törlése: ' + k); }, deleteAllProperties() { need('beállítás törlése'); }
  };
  const cache = {
    get(k) { k = String(k); if (RT.cacheStage.has(k)) { const e = RT.cacheStage.get(k); return e ? e.v : null; } return memGet(k); },
    getAll(keys) { const o = {}; (keys || []).forEach(k => { const v = cache.get(k); if (v != null) o[k] = v; }); return o; },
    put(k, v, ttl) { RT.cacheStage.set(String(k), { v: String(v), exp: Date.now() + Math.min(Number(ttl || 600), 21600) * 1000 }); },
    putAll(o, ttl) { Object.keys(o || {}).forEach(k => cache.put(k, o[k], ttl)); },
    remove(k) { RT.cacheStage.set(String(k), null); }, removeAll(keys) { (keys || []).forEach(k => cache.remove(k)); }
  };
  const resp = (code, body, headers) => ({ getResponseCode: () => code, getContentText: () => body, getHeaders: () => headers || {}, getAllHeaders: () => headers || {}, getBlob: () => need('getBlob') });
  const WRITE_OK = [/^\s*INSERT INTO lpm_log /i, /^\s*WITH u AS \(UPDATE lpm_sheet SET rows = \$2::jsonb/i, /^\s*INSERT INTO lpm_sheet \(tab, rows, ver, updated_at\)/i, /^\s*INSERT INTO lpm_kv \(k, v\) VALUES \('dv'/i, /^\s*CREATE TABLE IF NOT EXISTS lpm_kv /i];
  const isRead = q => /^\s*(SELECT|WITH\s+\w+\s+AS\s*\(\s*SELECT)\b/i.test(q);
  function fakeResult(q, params) {
    if (/^\s*WITH u AS \(UPDATE lpm_sheet/i.test(q)) return { rows: [[params[0], String(BigInt(params[2]) + 1n), '1']] };
    return { rows: [] };
  }
  const urlFetch = {
    fetch(url, opt) {
      url = String(url); opt = opt || {};
      if (!DBHOST || url !== 'https://' + DBHOST + '/sql') need('külső hívás: ' + url.replace(/\?.*/, '').slice(0, 60));
      const body = JSON.parse(String(opt.payload || '{}')), list = body.queries || [body];
      const reads = list.filter(x => isRead(x.query)), writes = list.filter(x => !isRead(x.query));
      if (writes.length) {
        if (reads.length) need('vegyes lekérdezés');
        writes.forEach(x => { if (!WRITE_OK.some(re => re.test(x.query))) need('ismeretlen írás: ' + String(x.query).slice(0, 40)); });
        RT.writes.push(...writes);
        const res = writes.map(x => fakeResult(x.query, x.params || []));
        return resp(200, JSON.stringify(body.queries ? { results: res } : res[0]), { 'x-neon-ms': '0' });
      }
      const t0 = Date.now(), r = neon(body); RT.dbMs += Date.now() - t0; RT.dbHit++;
      return resp(r.code, r.body, Object.assign({}, r.headers, { 'X-Neon-Ms': String(Date.now() - t0) }));
    },
    fetchAll() { need('fetchAll'); }
  };
  const blob = (bytes, type, name) => { const b = toBuf(bytes); return { getBytes: () => toSigned(b), getDataAsString: () => b.toString('utf8'), getContentType: () => type || 'application/octet-stream', setContentType(t) { type = t; return this; }, getName: () => name || '', setName(n) { name = n; return this; }, copyBlob() { return blob(b, type, name); } }; };
  const util = {
    getUuid: () => crypto.randomUUID(),
    formatDate, parseDate,
    sleep: ms => { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.min(Number(ms) || 0, 5000)); },
    DigestAlgorithm: { SHA_256: 'sha256', SHA_1: 'sha1', MD5: 'md5', SHA_512: 'sha512' }, Charset: { UTF_8: 'utf8', US_ASCII: 'ascii' },
    computeDigest: (alg, v) => toSigned(crypto.createHash(alg).update(toBuf(v)).digest()),
    computeHmacSha256Signature: (v, k) => toSigned(crypto.createHmac('sha256', toBuf(k)).update(toBuf(v)).digest()),
    base64Encode: v => toBuf(v).toString('base64'),
    base64EncodeWebSafe: v => toBuf(v).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
    base64Decode: s => toSigned(Buffer.from(String(s), 'base64')),
    base64DecodeWebSafe: s => toSigned(Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64')),
    newBlob: (d, t, n) => blob(d, t, n),
    ungzip: () => need('ungzip'), gzip: () => need('gzip'), zip: () => need('zip'), unzip: () => need('unzip'), computeRsaSha256Signature: () => need('rsa'), parseCsv: () => need('parseCsv')
  };
  const owner = kv['m:owner'] || '';
  const sandbox = {
    console: { log: () => { }, warn: () => { }, error: () => { } },
    Logger: { log: () => { } },
    PropertiesService: { getScriptProperties: () => props, getUserProperties: () => need('userProps'), getDocumentProperties: () => need('docProps') },
    CacheService: { getScriptCache: () => cache, getUserCache: () => need('userCache'), getDocumentCache: () => need('docCache') },
    LockService: { getScriptLock: () => ({ waitLock() { }, tryLock() { return true; }, releaseLock() { }, hasLock() { return true; } }), getUserLock: () => need('userLock'), getDocumentLock: () => need('docLock') },
    UrlFetchApp: urlFetch,
    Utilities: util,
    Session: { getEffectiveUser: () => ({ getEmail: () => owner }), getActiveUser: () => need('activeUser'), getScriptTimeZone: () => TZ, getTemporaryActiveUserKey: () => need('userKey') },
    ContentService: { createTextOutput: t => { const o = { t: String(t == null ? '' : t), setMimeType() { return o; }, getContent: () => o.t, setContent(x) { o.t = String(x); return o; } }; return o; }, MimeType: { JSON: 'JSON', TEXT: 'TEXT' } },
    CONTRACT_TPL_: undefined,
    __need: why => need(String(why)),
    __has: k => kv['m:has:' + String(k)] === '1',
    __job: (fn, argsJson) => { if (!RT.jobs) RT.writes.push({ query: 'CREATE TABLE IF NOT EXISTS lpm_jobs (id bigserial PRIMARY KEY, fn text NOT NULL, args jsonb NOT NULL, at timestamptz NOT NULL DEFAULT now(), claimed timestamptz, tries int NOT NULL DEFAULT 0, done_at timestamptz, err text)', params: [] });
      RT.jobs = (RT.jobs || 0) + 1; RT.writes.push({ query: 'INSERT INTO lpm_jobs (fn, args) VALUES ($1, $2::jsonb)', params: [String(fn), String(argsJson)] }); }
  };
  ['GmailApp', 'MailApp', 'CalendarApp', 'Calendar', 'DriveApp', 'Drive', 'SpreadsheetApp', 'ScriptApp', 'DocumentApp', 'SlidesApp', 'XmlService', 'HtmlService', 'Maps', 'People', 'AdminDirectory', 'Gmail', 'FormApp', 'Charts', 'Browser', 'Jdbc', 'BigQuery', 'Sheets'].forEach(n => { sandbox[n] = deny(n); });
  Object.defineProperty(sandbox, 'CONTRACT_TPL_', { get: () => need('szerződéssablon') });
  const ctx = vm.createContext(sandbox);
  for (const s of scripts()) s.runInContext(ctx);
  let text;
  try { text = MOCK && /^\/\/TEST\n/.test(raw) ? String(vm.runInContext(raw, ctx)) : vm.runInContext('api_(__raw).getContent()', Object.assign(ctx, { __raw: raw })); }   // //TEST: csak a tesztekben (memóriabeli adatbázissal)
  catch (e) { if (e && e.needsGas) return { gas: RT.gas }; throw e; }
  if (RT.gas) return { gas: RT.gas };   // a kód elkapta a jelzést, de a Google-szolgáltatás kellett volna: biztosan nem itt fejezzük be
  return { text, RT };
}

/** Egy kérés a gyors úton. Vissza: { text } (kész válasz) vagy { fallback: ok } (nem írt semmit – az Apps Script dolgozza fel). */
async function runFast(raw) {
  if (!DBHOST) return { fallback: 'nincs DATABASE_URL' };
  let kv;
  try { const r = await neonAsync({ query: "SELECT k, v FROM lpm_kv WHERE k LIKE 'p:%' OR k LIKE 'm:%'", params: [] }); kv = {}; (r.rows || []).forEach(x => { kv[x[0]] = x[1]; }); }
  catch (e) { return { fallback: 'nincs tükör' }; }
  if (kv['p:DB_MODE'] !== 'neon') return { fallback: 'nem Neon-mód' };
  if (kv['m:build'] !== BUNDLE.build) return { fallback: 'eltérő kódváltozat (' + (kv['m:build'] || '–') + ' ≠ ' + BUNDLE.build + ')' };   // csak ha pontosan ugyanaz a kód fut az Apps Scriptben is
  for (let att = 0; att < 3; att++) {
    const t0 = Date.now(); let r;
    try { r = runOnce(raw, kv); } catch (e) { return { fallback: 'hiba: ' + String(e && e.message).slice(0, 120) }; }
    if (r.gas) return { fallback: r.gas };
    let j = null; try { j = JSON.parse(r.text); } catch (e) { }
    if (j && j.ok === false && /AUTH_REQUIRED/.test(String(j.error))) return { fallback: 'munkamenet nincs a tükörben' };
    if (r.RT.writes.length) {
      try { await neonAsync({ queries: r.RT.writes.map(x => ({ query: x.query, params: x.params || [] })) }); }
      catch (e) { if (/division by zero/i.test(String(e && e.message))) { await new Promise(res => setTimeout(res, 40 + Math.random() * 120)); continue; }
        return { text: JSON.stringify({ ok: false, error: 'Nem sikerült menteni (adatbázis: ' + String(e && e.message).slice(0, 120) + ') – próbáld újra.' }) }; }   // itt már nem adjuk át az Apps Scriptnek (ha mégis átment, ne fusson le kétszer)
    }
    r.RT.cacheStage.forEach((v, k) => { if (v) MEMC.set(k, v); else MEMC.delete(k); });   // a gyorsítótár csak sikeres írás után frissül
    if (MEMC.size > 4000) MEMC.clear();
    if (j && j.pf) { j.pf.fast = 1; j.pf.ms = Date.now() - t0; if (r.RT.jobs) j.pf.jobs = r.RT.jobs; return { text: JSON.stringify(j), jobs: r.RT.jobs || 0 }; }
    return { text: r.text };
  }
  return { fallback: 'ütközés' };
}
module.exports = { BUILD: BUNDLE.build, runFast, neonAsync, formatDate, parseDate, GS_FILES, _runOnce: runOnce, _mock(m, url) { MOCK = m; DBURL = url; DBHOST = (/^postgres(?:ql)?:\/\/[^@]+@([^/:?]+)/.exec(DBURL) || [])[1] || ''; MEMC.clear(); } };
