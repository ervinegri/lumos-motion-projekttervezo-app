// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "fe4559530e",
"at": "2026-11-14T18:19:32+02:00",
"msg": "style: make linked project names visibly interactive and keyboard accessible"
},
{
"id": "166dbea9ec",
"at": "2026-11-14T18:19:13+02:00",
"msg": "sales: open linked project by clicking its name on deal cards"
},
{
"id": "0d9037c935",
"at": "2026-11-14T18:09:59+02:00",
"msg": "test: include monthly sales navigation regression in finance test suite"
},
{
"id": "715c8e58e6",
"at": "2026-11-14T18:09:31+02:00",
"msg": "test: verify monthly sales navigation and period filters"
},
{
"id": "901fdd89a1",
"at": "2026-11-14T18:08:20+02:00",
"msg": "sales: make all-month view include historical closed deals"
},
{
"id": "1e7a878976",
"at": "2026-11-14T18:07:24+02:00",
"msg": "style: responsive sales monthly navigator aligned with calendar"
},
{
"id": "a6d58294c7",
"at": "2026-11-14T18:07:00+02:00",
"msg": "sales: add monthly navigation controls and month-sensitive KPI labels"
},
{
"id": "55c78aae1e",
"at": "2026-11-14T18:06:22+02:00",
"msg": "sales: implement month grouping for all pipeline stages"
},
{
"id": "5a080558c3",
"at": "2026-11-14T17:55:09+02:00",
"msg": "test: include sales owner and revenue regression in finance suite"
},
{
"id": "72dc5ec211",
"at": "2026-11-14T17:54:45+02:00",
"msg": "test: prevent duplicate CEO sales owner and missing linked project values"
},
{
"id": "4bd5af2bbc",
"at": "2026-11-14T17:53:10+02:00",
"msg": "sales API: use linked project net total for signed deal value, including sales-only users"
},
{
"id": "0e5f0ac1dd",
"at": "2026-11-14T17:52:55+02:00",
"msg": "sales: clarify paid-month commission and CEO's own sales accounting"
},
{
"id": "f3d6494b06",
"at": "2026-11-14T17:51:56+02:00",
"msg": "sales: merge owner aliases and show linked project revenue on won deal cards"
},
{
"id": "d8ae82e193",
"at": "2026-11-14T17:45:46+02:00",
"msg": "test: return shared final modal function from source extract"
},
{
"id": "714d1a3d7f",
"at": "2026-11-14T17:45:27+02:00",
"msg": "test: verify shared final invoice, ordinary advance balance, and external-issuer safeguard"
},
{
"id": "7b85a0b0ee",
"at": "2026-11-14T17:44:07+02:00",
"msg": "test: scope shared invoice regression to the same client"
},
{
"id": "27e8e6dd07",
"at": "2026-11-14T17:43:06+02:00",
"msg": "billing: flag external-issuer shared deposits before final invoicing"
},
{
"id": "edeb798aff",
"at": "2026-11-14T17:42:30+02:00",
"msg": "test: ensure one shared final invoice and independent project contracts"
},
{
"id": "d58c8d0498",
"at": "2026-11-14T17:40:06+02:00",
"msg": "billing: create one shared final invoice with paid advance accounting safeguards"
},
{
"id": "6f1bdb5f3a",
"at": "2026-11-14T17:39:07+02:00",
"msg": "billing: consolidate shared final invoice and prorate deposits without duplicate charging"
},
{
"id": "287cf766ee",
"at": "2026-11-14T17:32:46+02:00",
"msg": "Handle shared client deposits across projects without duplicate requests"
},
{
"id": "d3c14c7d2d",
"at": "2026-11-14T17:15:08+02:00",
"msg": "fix: show full Hungarian weekdays and 23:00/20:00 editor email deadlines"
},
{
"id": "fe0e71ffa0",
"at": "2026-11-14T17:14:24+02:00",
"msg": "style: compact invitation copy into two flowing lines with responsive actions"
},
{
"id": "b52e0b5ccb",
"at": "2026-11-14T17:14:10+02:00",
"msg": "ui: keep entire project invitation question as continuous inline text"
},
{
"id": "dbc88ef74a",
"at": "2026-11-14T17:10:08+02:00",
"msg": "ui: display invitation reply deadline in two-line hover hint"
},
{
"id": "2b63bd968d",
"at": "2026-11-14T17:07:50+02:00",
"msg": "Align crew cards and show compact invited status"
},
{
"id": "4d9f4d4399",
"at": "2026-11-14T17:04:31+02:00",
"msg": "ui: use single app hover hint for invitation deadline"
},
{
"id": "59d05bde61",
"at": "2026-11-14T17:03:59+02:00",
"msg": "chore: silence Vercel GitHub bot comments and notification emails"
},
{
"id": "e5f0470ece",
"at": "2026-11-14T17:02:34+02:00",
"msg": "style: compact icon-only resend action and remove inline deadline"
},
{
"id": "3df7f38bca",
"at": "2026-11-14T17:02:22+02:00",
"msg": "ui: move invitation response deadline to pending status tooltip"
},
{
"id": "1938fa7d0b",
"at": "2026-11-14T15:01:48Z",
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
