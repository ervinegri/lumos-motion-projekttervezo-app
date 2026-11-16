// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "a6ef2a225d",
"at": "2026-11-16T16:18:28+02:00",
"msg": "Pénzügyek táblák: a ráhúzott sor teljes szélességben enyhén kiemelve"
},
{
"id": "b6977a0b51",
"at": "2026-11-16T16:16:23+02:00",
"msg": "Pénzügyek táblák: a ráhúzott sor kiemelve"
},
{
"id": "7e9adb8edc",
"at": "2026-11-16T16:15:53+02:00",
"msg": "Cmd+S: „✓ Minden mentve” a félrevezető „Nincs mentetlen módosítás” helyett"
},
{
"id": "4234bcf589",
"at": "2026-11-16T16:14:24+02:00",
"msg": "Pénzügyek panel: csak a nyíl nyit/zár"
},
{
"id": "e20360c730",
"at": "2026-11-16T16:14:01+02:00",
"msg": "Ki értékesítette? kártya: előbb a jutalék (%), utána az összeg"
},
{
"id": "bd3e561d05",
"at": "2026-11-16T16:05:44+02:00",
"msg": "Értékesítés: nem fizetős projekt lehetősége nem jelenik meg (pl. Business Bash)"
},
{
"id": "d6d7aa8ddc",
"at": "2026-11-16T16:03:30+02:00",
"msg": "HubSpot: a már javított 415-ös társítási hiba régi bejegyzése törlődik, nem jelenik meg"
},
{
"id": "fe2fb2118c",
"at": "2026-11-16T15:17:19+02:00",
"msg": "Ha a forgatás még előttünk van, a projekt visszaállítható Tervezésre (pl. tévesen utómunkába került)"
},
{
"id": "328e5b512d",
"at": "2026-11-16T15:14:29+02:00",
"msg": "Stáb: a „Pozíciónként…” magyarázó szöveg törölve"
},
{
"id": "6f5397fc21",
"at": "2026-11-16T15:12:34+02:00",
"msg": "Jóváhagyásra vár sáv: kiválasztott vágónál csak az ő videói"
},
{
"id": "9cd811b5c3",
"at": "2026-11-16T15:11:54+02:00",
"msg": "Fotózás kiválasztásakor automatikusan a fotók utómunkája is (200 kép)"
},
{
"id": "7e28cf8c33",
"at": "2026-11-16T15:10:27+02:00",
"msg": "Kifizetések: a számla sorszáma egy sorban"
},
{
"id": "ec81473701",
"at": "2026-11-16T15:06:29+02:00",
"msg": "Pozíció-kártyák: a címkék (pl. ★ Projektvezető) újra a kártya felső szegélyén"
},
{
"id": "524e5b0b22",
"at": "2026-11-16T15:03:38+02:00",
"msg": "Jóváhagyásra vár sáv: a váró videók neve is látszik (és ráhúzva a teljes lista)"
},
{
"id": "d8c1583957",
"at": "2026-11-16T15:02:14+02:00",
"msg": "Idővonal: a vágónkénti csoportok le- és felnyithatók (megjegyzi)"
},
{
"id": "2c9afba80c",
"at": "2026-11-16T14:49:20+02:00",
"msg": "Idővonal: a „Jóváhagyásra vár” sáv visszakerült – minden projekt, amelynek akár csak egy videója vár jóváhagyásra"
},
{
"id": "12c9ba9d27",
"at": "2026-11-16T14:48:05+02:00",
"msg": "Idővonal: a projekthez nem kötött, már lezajlott vágói bejegyzés is zöld"
},
{
"id": "3050726b41",
"at": "2026-11-16T14:46:31+02:00",
"msg": "Naptár: a vágólista a projektszám szerint csökkenő sorrendben"
},
{
"id": "18815a0571",
"at": "2026-11-16T14:22:12+02:00",
"msg": "Idővonal: vágónkénti csoportok, a zöld/sárga részek saját súgóval, vágólista projektszámmal, egynapos lezárt sávok zöldek, keskeny sávokban a név az óra alatt"
},
{
"id": "526376d3fa",
"at": "2026-11-16T14:08:14+02:00",
"msg": "Javítás: a naptár nem nyílt meg (nem definiált változó a Google-bejegyzéseknél)"
},
{
"id": "2f36fbfd7b",
"at": "2026-11-16T14:07:01+02:00",
"msg": "Idővonal: a lezárt projekt videói is megnyílnak a naptárból; összevont sorban a csak-vágás sávok neve látszik; lezajlott naptárbejegyzések zöldek"
},
{
"id": "edc76a1d1e",
"at": "2026-11-16T14:05:13+02:00",
"msg": "Idővonal: videó nélküli projekt vágási sávjára kattintva a projekt nyílik meg (nem üres videótábla)"
},
{
"id": "d5a103d5c5",
"at": "2026-11-16T14:02:51+02:00",
"msg": "Idővonal: a jóváhagyásra váró videók is színesek (sárga), arányosan a jóváhagyottak (zöld) után"
},
{
"id": "f3fc86b679",
"at": "2026-11-16T14:02:32+02:00",
"msg": "Idővonal: a Kész projektek forgatási napja is zöld (erősebb szabály a régi szürke ellen)"
},
{
"id": "a352670d81",
"at": "2026-11-16T14:01:50+02:00",
"msg": "Idővonal: a még le nem forgatott nap szürke, a leforgatott zöld"
},
{
"id": "8468fd80ba",
"at": "2026-11-16T14:01:03+02:00",
"msg": "Idővonal: a projekt neve teljesen kiíródik (átér a vágási sávra)"
},
{
"id": "f4c9cdfbd8",
"at": "2026-11-16T13:59:05+02:00",
"msg": "Idővonal: a lezajlott forgatások sávja zöld (szürke helyett)"
},
{
"id": "becfc39494",
"at": "2026-11-16T13:57:51+02:00",
"msg": "Idővonal: a közös nap nélküli projektek egy sorba kerülnek (kompaktabb naptár)"
},
{
"id": "fab60b1803",
"at": "2026-11-16T13:57:09+02:00",
"msg": "Idővonal: a lezajlott helyszíni munka sávja szürke, az átmenet szürkéből megy a vágás színébe"
},
{
"id": "d2d771160e",
"at": "2026-11-16T13:53:31+02:00",
"msg": "Idővonal: a jóváhagyott arány kitöltését egy régi szabály elrejtette – most látszik"
},
{
"id": "86379e3aa8",
"at": "2026-11-16T11:51:29Z",
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
