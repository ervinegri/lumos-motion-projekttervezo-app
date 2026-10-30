// Adatbázis-közvetítő: az Apps Script ezen keresztül éri el a Neon Postgres adatbázist.
// A kapcsolati cím (DATABASE_URL) csak itt, a Vercel szerverén van – az Apps Scriptbe nem kell jelszót tenni.
// Hitelesítés: az Apps Script saját Google-hozzáférési tokenje; csak az APPS_SCRIPT_EMAILS-ben felsorolt fiók(ok) használhatják.
const TOKENS = new Map();   // token → { email, exp } (melegen tartott függvénynél nem kérdezzük újra a Google-t)
async function emailOf(token) {
  const hit = TOKENS.get(token); if (hit && hit.exp > Date.now()) return hit.email;
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(token));
  if (!r.ok) return '';
  const j = await r.json(); const email = String(j.email || '').toLowerCase();
  if (email && String(j.email_verified) !== 'false') TOKENS.set(token, { email, exp: Date.now() + Math.min(Number(j.expires_in || 300) * 1000, 300000) });
  if (TOKENS.size > 200) TOKENS.clear();
  return email;
}
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({ message: 'Csak POST.' })); }
  const auth = String(req.headers.authorization || ''), token = auth.replace(/^Bearer\s+/i, '');
  if (!token) { res.statusCode = 401; return res.end(JSON.stringify({ message: 'Hiányzó hitelesítés.' })); }
  const email = await emailOf(token).catch(() => '');
  const allowed = String(process.env.APPS_SCRIPT_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!email || !allowed.includes(email)) { res.statusCode = 403; return res.end(JSON.stringify({ message: 'Nem engedélyezett fiók: ' + (email || 'ismeretlen') + ' (APPS_SCRIPT_EMAILS)' })); }
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
  const m = /^postgres(?:ql)?:\/\/[^@]+@([^/:?]+)/.exec(url);
  if (!m) { res.statusCode = 500; return res.end(JSON.stringify({ message: 'Nincs beállítva a DATABASE_URL.' })); }
  let body = req.body; if (typeof body !== 'string') body = JSON.stringify(body || {});
  const r = await fetch('https://' + m[1] + '/sql', { method: 'POST', body, headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': url, 'Neon-Raw-Text-Output': 'true', 'Neon-Array-Mode': 'true' } });
  res.statusCode = r.status; res.setHeader('Content-Type', 'application/json');
  res.end(await r.text());
};
