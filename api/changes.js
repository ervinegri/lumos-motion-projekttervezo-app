// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "856348dcb5",
"at": "2026-11-11T00:50:24+01:00",
"msg": "Filmszalag emoji ki az átnevezésnél is"
},
{
"id": "77e5ddb343",
"at": "2026-11-11T00:49:56+01:00",
"msg": "Videó: ügyfél jóváhagyására várónál nincs hozzászólás; dupla visszadobás-komment javítás; filmszalag emoji ki a címekből"
},
{
"id": "7f84630176",
"at": "2026-11-11T00:43:44+01:00",
"msg": "Hozzászólás-duplikáció (visszadobás) javítás; szebb pipa-négyzet"
},
{
"id": "7cb31b1dd6",
"at": "2026-11-11T00:41:11+01:00",
"msg": "Videó hozzászólások: biztos időrendi (legfrissebb felül) sorrend bármilyen dátumformátumnál"
},
{
"id": "c2358dec02",
"at": "2026-11-11T00:40:21+01:00",
"msg": "Videó hozzászólások: azonos komment nem jelenik meg kétszer"
},
{
"id": "610e133e9a",
"at": "2026-11-11T00:37:28+01:00",
"msg": "Videótábla ablak: film emoji ki, cím és határidő egy vonalban"
},
{
"id": "c6fc9d02ee",
"at": "2026-11-11T00:36:59+01:00",
"msg": "Videótábla: tovább-nyíl le a kártyákról"
},
{
"id": "916e46fcf2",
"at": "2026-11-11T00:36:27+01:00",
"msg": "Videótábla: ügyféloldali oszlopok vizuálisan különválasztva"
},
{
"id": "c877793ec6",
"at": "2026-11-11T00:34:47+01:00",
"msg": "Videótábla: tiltott oszlop nem világosodik ki húzáskor, és nem lehet beledobni"
},
{
"id": "af665392a6",
"at": "2026-11-11T00:32:18+01:00",
"msg": "Ügyfélnek küldés: csak vezető nyithatja; megszólítás zárójeles megjegyzés nélkül; új gomb az előnézetben"
},
{
"id": "7a140a7668",
"at": "2026-11-11T00:29:55+01:00",
"msg": "Videólink csak Utómunka alatt állapotban (vagy belső ellenőrzésre küldéskor) adható meg"
},
{
"id": "35a474b4d7",
"at": "2026-11-11T00:27:05+01:00",
"msg": "Videótábla: vágó csak Utómunka alatt / Belső ellenőrzés oszlopba húzhat"
},
{
"id": "f2d84f5dbc",
"at": "2026-11-11T00:24:57+01:00",
"msg": "Ügyfélnek küldés saját projektnél: csak projektvezető vagy ügyvezető címzett"
},
{
"id": "ea90b45c17",
"at": "2026-11-11T00:23:23+01:00",
"msg": "Videókártya: megnyitás-jelzés külön sorban"
},
{
"id": "30dabdd5b4",
"at": "2026-11-11T00:23:14+01:00",
"msg": "Videótábla: egyforma magas kártyák"
},
{
"id": "bc2831fbd4",
"at": "2026-11-11T00:21:10+01:00",
"msg": "Ügyfélnek küldés: ügyfél nélküli projektnél nem gyűjti be más projektek kapcsolattartóit"
},
{
"id": "c1437abd5f",
"at": "2026-11-11T00:19:04+01:00",
"msg": "Vágó nézet: az ügyfél e-mail címe nem látszik a hozzászólásokban"
},
{
"id": "2c6dc7374a",
"at": "2026-11-11T00:12:18+01:00",
"msg": "Ügyfél-link megnyitásának jelzése a videókártyán; új Lumos gomb a jóváhagyó levélben"
},
{
"id": "f873ca1f3e",
"at": "2026-11-11T00:07:03+01:00",
"msg": "Ügyfél jóváhagyó oldal: a videó a nyitókép után magától indul (szükség esetén némítva, hang gombbal)"
},
{
"id": "188c31de56",
"at": "2026-11-11T00:04:43+01:00",
"msg": "pCloud lejátszó: 9 mp-es időkorlát hibaüzenettel, a felső ablak videóját tölti be"
},
{
"id": "cc3cc7dfaa",
"at": "2026-11-11T00:03:56+01:00",
"msg": "Havi naptár: Vágói határidők pipa (leadási határidők ki-be)"
},
{
"id": "ac87587699",
"at": "2026-11-10T23:51:59+01:00",
"msg": "Videótábla ablak kisebb nagy monitoron"
},
{
"id": "9fc915a9b0",
"at": "2026-11-10T15:58:20+02:00",
"msg": "Árkalkulátor végösszeg: nem ugrál (animáció nélkül, fix szélességű szám)"
},
{
"id": "faa1b6cb8b",
"at": "2026-11-10T15:37:37+02:00",
"msg": "Árkalkulátor ablak: pontos magasság a képernyőhöz"
},
{
"id": "3e58923f9d",
"at": "2026-11-10T15:37:00+02:00",
"msg": "Árkalkulátor ablak: nagyításnál sem vágódik le a gombsor"
},
{
"id": "25df7e875e",
"at": "2026-11-10T15:33:57+02:00",
"msg": "Árkalkulátor végösszeg felirat"
},
{
"id": "b6d490e769",
"at": "2026-11-10T15:33:32+02:00",
"msg": "Árkalkulátor végösszeg: látványosabb címke"
},
{
"id": "63146f7830",
"at": "2026-11-10T15:33:03+02:00",
"msg": "Árkalkulátor gomb: sötét tintaszín"
},
{
"id": "c1b6604b2d",
"at": "2026-11-10T15:31:52+02:00",
"msg": "Árkalkulátor: a végösszeg a gombsorban, az Eredmény beküldése mellett"
},
{
"id": "7526544bfc",
"at": "2026-11-10T15:29:32+02:00",
"msg": "Árkalkulátor: a gombok jobbra, a Bezárás mellé"
},
{
"id": "2be941c067",
"at": "2026-11-10T13:27:45Z",
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
