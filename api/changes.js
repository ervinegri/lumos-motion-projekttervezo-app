// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "f147ceb094",
"at": "2026-11-14T19:07:44+02:00",
"msg": "test: update salesperson inline field widths to compact design"
},
{
"id": "99db115aca",
"at": "2026-11-14T19:06:22+02:00",
"msg": "style: shorten salesperson name and amount fields in inline finance card"
},
{
"id": "7349fdb747",
"at": "2026-11-14T19:02:49+02:00",
"msg": "test: enforce one-row salesperson percentage and amount layout"
},
{
"id": "51a398ef1a",
"at": "2026-11-14T19:02:36+02:00",
"msg": "style: align seller, commission percentage and amount on one horizontal row"
},
{
"id": "ba2766da02",
"at": "2026-11-14T18:57:14+02:00",
"msg": "test: include consolidated project salesperson panel in regression suite"
},
{
"id": "e309d8d7e7",
"at": "2026-11-14T18:56:54+02:00",
"msg": "test: project seller section follows production and replaces duplicate lower card"
},
{
"id": "8d4a420171",
"at": "2026-11-14T18:55:46+02:00",
"msg": "style: compact single salesperson selector and commission within blue finance panel"
},
{
"id": "8502f4065f",
"at": "2026-11-14T18:55:04+02:00",
"msg": "project finances: move 'Ki értékesítette?' panel after production and consolidate salesperson controls"
},
{
"id": "bcf9c3a33f",
"at": "2026-11-14T18:46:37+02:00",
"msg": "style: space separated production cost columns for readable finance table"
},
{
"id": "b71e03ee31",
"at": "2026-11-14T18:45:59+02:00",
"msg": "test: run financial cost breakout and zero seller fee regression with suite"
},
{
"id": "335b03c3b1",
"at": "2026-11-14T16:45:46Z",
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
