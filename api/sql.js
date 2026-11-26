// Adatbázis-közvetítő: az Apps Script ezen keresztül éri el a Neon Postgres adatbázist.
// A kapcsolati cím (DATABASE_URL) csak itt, a Vercel szerverén van – az Apps Scriptbe nem kell jelszót tenni.
// Hitelesítés: az Apps Script saját Google-hozzáférési tokenje; csak az APPS_SCRIPT_EMAILS-ben felsorolt fiók(ok) használhatják.
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({ message: 'Csak POST.' })); }
  if (!(await allowed(req, res))) return;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
  const m = /^postgres(?:ql)?:\/\/[^@]+@([^/:?]+)/.exec(url);
  if (!m) { res.statusCode = 500; return res.end(JSON.stringify({ message: 'Nincs beállítva a DATABASE_URL.' })); }
  let body = req.body; if (typeof body !== 'string') body = JSON.stringify(body || {});
  const t0 = Date.now();
  const r = await fetch('https://' + m[1] + '/sql', { method: 'POST', body, headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': url, 'Neon-Raw-Text-Output': 'true', 'Neon-Array-Mode': 'true' } });
  res.statusCode = r.status; res.setHeader('Content-Type', 'application/json'); res.setHeader('X-Neon-Ms', String(Date.now() - t0)); res.setHeader('X-Fn-Region', process.env.VERCEL_REGION || '');   // sebességmérés: a Neon ideje ebből a kérésből
  res.end(await r.text());
};
