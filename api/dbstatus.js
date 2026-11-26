// Állapot (titok nélkül): melyik adatbázis aktív, és óránként mi kérdezte a Neont – a fejlesztéshez / hibakereséshez.
const API_URL = process.env.LUMOS_API_URL || 'https://script.google.com/macros/s/AKfycbwM_dJllYQIIS9xyRWX68PFDChk6MMNv7BqcU-w2U3O_9LXlHi94VYZRrihClgmXfE/exec';
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
  const t0 = Date.now();
  try { const r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn: 'dbStatus', args: [] }), redirect: 'follow' });
    const j = await r.json(); const gsMs = Date.now() - t0;
    /* sebesség (titok nélkül): az Apps Script teljes köre innen, a Neon egy lekérdezése innen, a Neon és a függvény régiója */
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || '', m = /^postgres(?:ql)?:\/\/[^@]+@([^/:?]+)/.exec(url), speed = { appsScriptMs: gsMs, fnRegion: process.env.VERCEL_REGION || '', neonRegion: m ? ((/\.([a-z]{2}-[a-z]+-\d)\./.exec(m[1]) || [])[1] || '') : '' };
    if (m) { const q = async () => { const t = Date.now(); await fetch('https://' + m[1] + '/sql', { method: 'POST', body: JSON.stringify({ query: 'SELECT 1', params: [] }), headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': url } }); return Date.now() - t; };
      try { speed.neonFirstMs = await q(); speed.neonNextMs = await q(); } catch (e) { speed.neonErr = String(e && e.message).slice(0, 100); } }
    res.statusCode = j && j.ok ? 200 : 500; res.end(JSON.stringify(j && j.ok ? Object.assign({ speed }, j.data) : { error: j && j.error, speed }, null, 1)); }
  catch (e) { res.statusCode = 502; res.end(JSON.stringify({ error: String(e && e.message) })); }
};
