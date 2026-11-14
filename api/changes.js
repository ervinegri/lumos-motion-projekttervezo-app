// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "e2269ab124",
"at": "2026-11-14T17:01:40+02:00",
"msg": "ui: use compact icon-only resend button"
},
{
"id": "26b1e9010d",
"at": "2026-11-14T16:58:58+02:00",
"msg": "Make pending invitation resend button prominent"
},
{
"id": "8822e1b17c",
"at": "2026-11-14T16:53:38+02:00",
"msg": "Improve project invitations, deadlines, and calendar descriptions"
},
{
"id": "b3387a644a",
"at": "2026-11-14T15:15:32+01:00",
"msg": "Meghívó: válaszadási határidő (3 nap), a projekt neve új sorban; a levél linkje előnézetből is működik (visszavált a saját nézetre)"
},
{
"id": "81088688e0",
"at": "2026-11-14T14:38:14+01:00",
"msg": "Meghívás: Válaszolok gomb a levélben, a link a projektet nyitja Igen/Nem válasszal (fent és a saját kártyán); visszajelzés e-mailben a meghívónak, elfogadáskor naptárba; vágónál nincs üres Terepi felvételek"
},
{
"id": "c4752e49e4",
"at": "2026-11-14T13:51:48+01:00",
"msg": "Meghívó: forgatási idő és vágási határidő a levélben; meghívásos projektnél a szakember csak az elfogadott munkatársakat látja (és csak elfogadás után a projektet)"
},
{
"id": "4f4de7117f",
"at": "2026-11-14T13:29:45+01:00",
"msg": "Meghívás: „Meghívást kaptál erre a projektre, mint vágó”, csak vágónál nincs helyszín/időpont; a levél gombja felugró elfogadó ablakot nyit"
},
{
"id": "f2a524aa40",
"at": "2026-11-14T13:16:08+01:00",
"msg": "Javítás: a táblázat oszlopfejlécei maradnak (Távozás) – a felirat csak a felületen Végzés"
},
{
"id": "7831e161e6",
"at": "2026-11-14T13:13:40+01:00",
"msg": "Meghívások: Meghívás gomb a stábkártyán (naptár + e-mail), elfogadási állapot; a szakember csak elfogadás után látja a projektet és csak az elfogadott munkatársakat"
},
{
"id": "83f2371034",
"at": "2026-11-14T13:06:29+01:00",
"msg": "Szakember nézet: a menüben kör nyíl a név előtt – rákattintva másik szakember választható"
},
{
"id": "b480395154",
"at": "2026-11-14T13:04:32+01:00",
"msg": "Pénzügyek: értékesítő a büdzsé sorában új projektnél is; Több napos jelölő csak vezetőknek; szakembernél nincs külön Videók panel"
},
{
"id": "516f785c75",
"at": "2026-11-14T13:03:09+01:00",
"msg": "Projekt: rendezett Videók panel (állapot, Videótábla és Idővonal gomb); Vágás helyett Utómunka"
},
{
"id": "bb38f1da1a",
"at": "2026-11-14T13:02:07+01:00",
"msg": "Távozás helyett Végzés mindenhol; stábba felvett szakember automatikusan a megfelelő szolgáltatásra kerül (pl. kreatív operatőr)"
},
{
"id": "fc01a92fd1",
"at": "2026-11-14T12:57:51+01:00",
"msg": "Projekt: a Névjegy gomb a telefonszám mellett, egy sorban"
},
{
"id": "ed0e19bd65",
"at": "2026-11-14T12:55:25+01:00",
"msg": "Sablon választásakor a Rendezvény típusa is kitöltődik (látható mezőben is)"
},
{
"id": "7911124b81",
"at": "2026-11-14T12:53:00+01:00",
"msg": "Rendezvény típusa: Egyéb kivéve a választhatók közül (a régi Egyéb projektek megtartják)"
},
{
"id": "c6a2e125c2",
"at": "2026-11-14T12:52:38+01:00",
"msg": "Rendezvény típusa: Reklám"
},
{
"id": "f05040949f",
"at": "2026-11-14T12:52:20+01:00",
"msg": "Új projekt: az ügyfél és a kapcsolattartó adatai nem kötelezők létrehozáskor"
},
{
"id": "b46c9bcc87",
"at": "2026-11-14T11:52:02Z",
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
