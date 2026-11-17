// Állapot (titok nélkül): melyik adatbázis aktív, és óránként mi kérdezte a Neont – a fejlesztéshez / hibakereséshez.
const API_URL = process.env.LUMOS_API_URL || 'https://script.google.com/macros/s/AKfycbwM_dJllYQIIS9xyRWX68PFDChk6MMNv7BqcU-w2U3O_9LXlHi94VYZRrihClgmXfE/exec';
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
  try { const r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn: 'dbStatus', args: [] }), redirect: 'follow' });
    const j = await r.json(); res.statusCode = j && j.ok ? 200 : 500; res.end(JSON.stringify(j && j.ok ? j.data : { error: j && j.error }, null, 1)); }
  catch (e) { res.statusCode = 502; res.end(JSON.stringify({ error: String(e && e.message) })); }
};
