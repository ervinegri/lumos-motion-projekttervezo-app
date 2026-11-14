// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "9ffce31b0a",
"at": "2026-11-14T18:45:39+02:00",
"msg": "test: include fee breakdown dependency and locked salesperson commission"
},
{
"id": "4f1cf27681",
"at": "2026-11-14T18:45:10+02:00",
"msg": "test: verify separate wages/pass-through fees and zero salesperson commission"
},
{
"id": "f7ceaef6ab",
"at": "2026-11-14T18:43:40+02:00",
"msg": "finance UI: split wages, pass-through and organizer fee columns and show zero for unassigned sales"
},
{
"id": "d27024b130",
"at": "2026-11-14T18:43:01+02:00",
"msg": "finance: separate wages, pass-through and organizer fees and lock unassigned sales percent"
},
{
"id": "5a98e3d62c",
"at": "2026-11-14T18:42:27+02:00",
"msg": "finance: allocate organizer fee to costs and zero sales fee without assigned salesperson"
},
{
"id": "c974215e49",
"at": "2026-11-14T18:30:58+02:00",
"msg": "style: distinguish always-visible sales pipeline from monthly metrics"
},
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
"id": "b48067d908",
"at": "2026-11-14T16:19:20Z",
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
