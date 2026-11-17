// Közös hitelesítés az /api/sql és az /api/changes végponthoz: csak az Apps Script saját Google-tokenjével (APPS_SCRIPT_EMAILS fiókjai).
// Az aláhúzásos fájlból a Vercel nem készít végpontot.
const TOKENS = new Map();   // token → { email, exp } (melegen tartott függvénynél nem kérdezzük újra a Google-t)
async function emailOf(token) {
  const hit = TOKENS.get(token); if (hit && hit.exp > Date.now()) return hit.email;
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(token));
  if (!r.ok) return '';
  const j = await r.json(); const email = String(j.email || '').toLowerCase();
  if (email && String(j.email_verified) !== 'false') { if (TOKENS.size > 200) TOKENS.clear(); TOKENS.set(token, { email, exp: Date.now() + Math.min(Number(j.expires_in || 300) * 1000, 300000) }); }
  return email;
}
/** Igaz, ha a kérés engedélyezett; különben megírja a 401/403 választ és hamisat ad. */
module.exports = async function allowed(req, res) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) { res.statusCode = 401; res.end(JSON.stringify({ message: 'Hiányzó hitelesítés.' })); return false; }
  const email = await emailOf(token).catch(() => '');
  const ok = String(process.env.APPS_SCRIPT_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!email || !ok.includes(email)) { res.statusCode = 403; res.end(JSON.stringify({ message: 'Nem engedélyezett fiók (APPS_SCRIPT_EMAILS).' })); return false; }
  return true;
};
