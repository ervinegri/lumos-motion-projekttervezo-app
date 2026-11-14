// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "88eb6b66de",
"at": "2026-11-14T19:48:09+02:00",
"msg": "fix: show managers accepted and declined invitations, resolve own staff record by name"
},
{
"id": "dc0ae96c66",
"at": "2026-11-14T19:46:30+02:00",
"msg": "style: present invitation email preview as readable modal card"
},
{
"id": "dd621eac7c",
"at": "2026-11-14T19:46:17+02:00",
"msg": "fix: validate invitation preview recipient email correctly"
},
{
"id": "4b155b4bde",
"at": "2026-11-14T19:46:02+02:00",
"msg": "ui: show month and day on current-year invitation timestamps"
},
{
"id": "d233204b31",
"at": "2026-11-14T19:45:11+02:00",
"msg": "feat: preview invitation email in popup before sending and resending"
},
{
"id": "123a1f3dfc",
"at": "2026-11-14T19:43:45+02:00",
"msg": "api: add read-only crew invitation preview and manager self-response"
},
{
"id": "aa915a800d",
"at": "2026-11-14T19:43:33+02:00",
"msg": "feat: shared invitation email formatter and read-only preview"
},
{
"id": "db7c47a69c",
"at": "2026-11-14T19:43:26+02:00",
"msg": "feat: show raw material handoff and edit deadline for combined onsite-editor invitations"
},
{
"id": "b49ed2054a",
"at": "2026-11-14T19:42:40+02:00",
"msg": "backend: reject removal of accepted project member on save"
},
{
"id": "146b8a5176",
"at": "2026-11-14T19:42:29+02:00",
"msg": "feat: warn and block removal of accepted crew members"
},
{
"id": "f8fa37791c",
"at": "2026-11-14T19:41:37+02:00",
"msg": "ui: match declined invitation badge dimensions with accepted status"
},
{
"id": "caf7d4e99c",
"at": "2026-11-14T19:38:32+02:00",
"msg": "ui: match accepted invitation badge size to invite button"
},
{
"id": "843edbfc58",
"at": "2026-11-14T19:37:48+02:00",
"msg": "ui: use present tense for declined crew invite status"
},
{
"id": "7379301bda",
"at": "2026-11-14T19:36:46+02:00",
"msg": "fix: retain manager project view after declining own crew invitation"
},
{
"id": "21f0b75c5d",
"at": "2026-11-14T19:36:26+02:00",
"msg": "fix: keep manager projects visible while own invitations are pending"
},
{
"id": "e1b39fb1e7",
"at": "2026-11-14T19:36:19+02:00",
"msg": "feat: show own invitation confirmation in executive project details"
},
{
"id": "840413b13c",
"at": "2026-11-14T19:36:09+02:00",
"msg": "feat: display pending invitations in executive project dashboard"
},
{
"id": "2bd49a272b",
"at": "2026-11-14T19:35:29+02:00",
"msg": "ui: remove crew visibility note from invitation panel"
},
{
"id": "a9ce733626",
"at": "2026-11-14T19:35:14+02:00",
"msg": "feat: allow managers to respond to own crew invitations"
},
{
"id": "2a83ed28c5",
"at": "2026-11-14T19:35:06+02:00",
"msg": "feat: include manager's own pending crew invitations in bootstrap"
},
{
"id": "5e00b3fd88",
"at": "2026-11-14T19:28:57+02:00",
"msg": "fix: lead invite shows filming time and venue, editor invite shows upload and edit deadlines"
},
{
"id": "0811c8d158",
"at": "2026-11-14T19:26:33+02:00",
"msg": "fix: omit venue from project invitation emails"
},
{
"id": "bd21588aad",
"at": "2026-11-14T19:20:01+02:00",
"msg": "ui: show sent timestamp and one-line response deadline in invitation tooltips"
},
{
"id": "7682cb4487",
"at": "2026-11-14T19:17:10+02:00",
"msg": "fix: include edit due date in project lead invitation request"
},
{
"id": "ab471b2d66",
"at": "2026-11-14T19:17:02+02:00",
"msg": "fix: show edit deadlines in project lead invitation emails"
},
{
"id": "cac02ba81f",
"at": "2026-11-14T19:12:23+02:00",
"msg": "test: include live budget remainder regression in finance suite"
},
{
"id": "a7204f12f4",
"at": "2026-11-14T19:11:57+02:00",
"msg": "test: live negative budget remainder while editing fees and multi-day budget tables"
},
{
"id": "8c5c232a9c",
"at": "2026-11-14T19:10:12+02:00",
"msg": "project finance: use one shared live refresh for fees and budget fields"
},
{
"id": "1647ee20b1",
"at": "2026-11-14T19:09:52+02:00",
"msg": "project finance: live refresh budget remainder and totals for all workday tables"
},
{
"id": "5bb09af59c",
"at": "2026-11-14T19:08:07+02:00",
"msg": "ui: show signed negative budget remaining consistently in finance totals"
},
{
"id": "1c99cce822",
"at": "2026-11-14T17:07:52Z",
"msg": "Változásnapló frissítése"
}
];
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
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) { res.statusCode = 401; return res.end(JSON.stringify({ message: 'Hiányzó hitelesítés.' })); }
  const email = await emailOf(token).catch(() => '');
  const allowed = String(process.env.APPS_SCRIPT_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!email || !allowed.includes(email)) { res.statusCode = 403; return res.end(JSON.stringify({ message: 'Nem engedélyezett.' })); }
  res.end(JSON.stringify({ items: ITEMS }));
};
