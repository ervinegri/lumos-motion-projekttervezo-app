// Gyors út a böngészőnek (2026-11-26): ugyanaz a kérés, mint az Apps Scriptnek ({ fn: 'rpc', args: [token, név, adat] }),
// de itt, a Neon mellett fut le (~0,1–0,5 mp a 3–4,5 mp helyett). Ha a kérés Google-szolgáltatást igényelne (levél, naptár, Drive…),
// { fallback: true } a válasz – semmit nem írt –, és a böngésző az Apps Scripthez fordul.
'use strict';
const crypto = require('crypto');
const { runFast, neonAsync, selfTest } = require('./_gasrt.js');
/* ezeket mindig az Apps Script végzi (belépés, nézetváltás, feltöltés, levél-előnézet, külső szinkronok) */
const DENY = /^(calendarEvents|settingsData|logout|setViewAs|viewBoot|\w*Upload\w*|vidUp\w+|clientUp\w+|\w*Preview|syncCalendar|szSync|salesSyncNow|navSync|crewDocsImport|hubspot\w*|gbp\w*|sendEquipmentList|crewInvite|finalizeCrew|szPdf|contractPdf)$/;
async function sessionOk(token) {
  if (!/^[0-9a-f]{64}$/.test(String(token || ''))) return false;
  const h = crypto.createHash('sha256').update(String(token), 'utf8').digest('hex');
  const r = await neonAsync({ query: 'SELECT v FROM lpm_kv WHERE k = $1', params: ['p:LUMOS_PM_SESS_' + h] });
  const v = r.rows && r.rows[0] && r.rows[0][0]; if (!v) return false;
  try { const s = JSON.parse(v); return !!s && s.exp > Date.now(); } catch (e) { return false; }
}
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
  const t0 = Date.now(), send = (code, o) => { res.statusCode = code; res.end(typeof o === 'string' ? o : JSON.stringify(o)); };
  if (req.method === 'GET') {   // állapot (titok nélkül): egyezik-e a kód, megvan-e a tükör, hány háttérfeladat vár
    if (/selftest/.test(String(req.url || ''))) {   // próba valódi adatokkal, írás nélkül: a nyilvános árlista-lekérés a gyors úton (csak időt és méretet ad vissza)
      const out = await runFast(JSON.stringify({ fn: 'arkPrices', args: [] })).catch(e => ({ fallback: 'hiba: ' + String(e && e.message).slice(0, 150) }));
      let ok = null; try { ok = JSON.parse(out.text || 'null'); } catch (e) { }
      const st = await selfTest().catch(e => ({ error: String(e && e.message).slice(0, 200) })), st2 = await selfTest().catch(e => ({ error: String(e && e.message).slice(0, 200) }));
      return send(200, { ms: Date.now() - t0, fallback: out.fallback || '', ok: ok ? ok.ok : null, error: ok && !ok.ok ? ok.error : '', bytes: out.text ? out.text.length : 0, pf: ok && ok.pf, read: st, readWarm: st2 }); }
    try { const { BUILD } = require('./_gasrt.js');
      const q = sql => neonAsync({ query: sql, params: [] }).then(r => (r.rows || [])[0] || null, e => String(e && e.message).slice(0, 120));
      const a = await q("SELECT count(*)::text, coalesce(max(CASE WHEN k = 'm:build' THEN v END), ''), coalesce(max(CASE WHEN k = 'p:DB_MODE' THEN v END), ''), coalesce(max(at)::text, '') FROM lpm_kv");
      const b = await q("SELECT count(*) FILTER (WHERE done_at IS NULL)::text, count(*) FILTER (WHERE err IS NOT NULL AND done_at IS NULL)::text, count(*)::text FROM lpm_jobs");
      return send(200, { build: BUILD, mirror: Array.isArray(a) ? { keys: +a[0], build: a[1], match: a[1] === BUILD, mode: a[2], updated: a[3] } : a, jobs: Array.isArray(b) ? { waiting: +b[0], failing: +b[1], total: +b[2] } : b, ms: Date.now() - t0 });
    } catch (e) { return send(200, { error: String(e && e.message).slice(0, 200) }); } }
  if (req.method !== 'POST') return send(405, { ok: false, error: 'Csak POST.' });
  let raw = req.body; if (raw && typeof raw !== 'string') raw = Buffer.isBuffer(raw) ? raw.toString('utf8') : JSON.stringify(raw);
  raw = String(raw || ''); if (raw.length > 2e6) return send(200, { fallback: true, why: 'nagy kérés' });
  let body; try { body = JSON.parse(raw); } catch (e) { return send(400, { ok: false, error: 'Hibás kérés.' }); }
  const args = Array.isArray(body.args) ? body.args : [], name = String(args[1] || '');
  if (body.fn !== 'rpc' || !name || DENY.test(name)) return send(200, { fallback: true, why: 'nem gyors művelet' });
  try {
    if (name === 'dataVer') {   // változásfigyelés: az összes lap változata + a háttér változásjelzője (az Apps Script minden módosításnál lépteti)
      if (!(await sessionOk(args[0]))) return send(200, { fallback: true, why: 'munkamenet' });
      const r = await neonAsync({ query: "SELECT coalesce(sum(ver), 0)::text, coalesce((SELECT v FROM lpm_kv WHERE k = 'dv'), '') FROM lpm_sheet", params: [] });
      const x = (r.rows && r.rows[0]) || ['0', ''];
      return send(200, { ok: true, data: { v: 'n' + x[0] + '.' + x[1] }, pf: { ms: Date.now() - t0, fast: 1 } });
    }
    const out = await runFast(raw);
    console.log(JSON.stringify({ op: name, ms: Date.now() - t0, fallback: out.fallback || '' }));
    if (out.fallback) return send(200, { fallback: true, why: out.fallback });
    return send(200, out.text);
  } catch (e) {
    console.log(JSON.stringify({ op: name, ms: Date.now() - t0, error: String(e && e.message).slice(0, 200) }));
    return send(200, { fallback: true, why: 'hiba' });
  }
};
