// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "1d5c4af646",
"at": "2026-11-14T18:30:46+02:00",
"msg": "test: keep Kanban cards constant when browsing monthly sales KPIs"
},
{
"id": "6e8ad3d88c",
"at": "2026-11-14T18:30:09+02:00",
"msg": "sales: keep all pipeline cards visible and apply month navigation to metrics only"
},
{
"id": "93698dffcb",
"at": "2026-11-14T18:27:56+02:00",
"msg": "test: supply commission helper when checking isolated sales project cards"
},
{
"id": "386df76be2",
"at": "2026-11-14T18:27:27+02:00",
"msg": "test: align monthly commission header assertion with contracted commission label"
},
{
"id": "771422e341",
"at": "2026-11-14T18:27:03+02:00",
"msg": "test: contracted November commission appears even when invoice was paid in October"
},
{
"id": "8e28c962ee",
"at": "2026-11-14T18:26:15+02:00",
"msg": "style: display contracted sales commission clearly in card and monthly KPI"
},
{
"id": "2128fa86bf",
"at": "2026-11-14T18:25:57+02:00",
"msg": "sales: show each won deal's contracted commission and percentage on its card"
},
{
"id": "7d3482679a",
"at": "2026-11-14T18:25:42+02:00",
"msg": "sales: show contracted commission in monthly summary instead of misleading zero"
},
{
"id": "7dca896bf1",
"at": "2026-11-14T18:25:22+02:00",
"msg": "sales: calculate contracted commissions from the same project financial estimate"
},
{
"id": "89d8159e41",
"at": "2026-11-14T18:20:47+02:00",
"msg": "test: provide sales-role guard when rendering project links"
},
{
"id": "1665516c0b",
"at": "2026-11-14T18:20:12+02:00",
"msg": "test: clicking linked sales project name opens project while preserving card editing"
},
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
"id": "500d4cb27a",
"at": "2026-11-14T15:39:14Z",
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
