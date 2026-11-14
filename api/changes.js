// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "fd7abb03da",
"at": "2026-11-14T08:26:22+01:00",
"msg": "Idővonal: a vágási sávon csak egy jel a végén (zöld ✓ / ⏳), zöld pipák; Havi nézet: a vágói munkák csak a határidő napján"
},
{
"id": "12faca8c40",
"at": "2026-11-14T08:24:30+01:00",
"msg": "Idővonal: egérrel fel-le is húzható (nem csak oldalra)"
},
{
"id": "4faeabde86",
"at": "2026-11-14T08:22:48+01:00",
"msg": "Idővonal: „Jóváhagyásra vár” egy sorban, „Idővonal” sor törölve; fejléc: külön Kilépés gomb elrejtve (a név menüjében van)"
},
{
"id": "e6d1ae11fa",
"at": "2026-11-14T08:20:28+01:00",
"msg": "Idővonal: forgatási nap + vágás sávnál is a látható rész elején marad a név"
},
{
"id": "5e1e709d29",
"at": "2026-11-14T08:18:29+01:00",
"msg": "Idővonal: balra görgetéskor a sáv felirata a látható rész elején marad"
},
{
"id": "e9db2c834d",
"at": "2026-11-14T08:17:00+01:00",
"msg": "Idővonal: a fejléc egy sorban (a hónap neve 1-jén); a vágási sáv felirata az óra sorában, nem csúszik a névre"
},
{
"id": "b5a9345139",
"at": "2026-11-14T08:14:16+01:00",
"msg": "Idővonal: a vágási sáv pipája jobbra kerül, nem takarja a nevet"
},
{
"id": "c04c5b94d0",
"at": "2026-11-14T08:12:16+01:00",
"msg": "Idővonal: a forgatási nap sávjában a név valóban látszik"
},
{
"id": "bc68da55a8",
"at": "2026-11-14T08:10:13+01:00",
"msg": "Idővonal: rövid határidős projekteknél a név a forgatási napban, az óra alatt kezdődik és átér a vágási sávra"
},
{
"id": "bcf39e760a",
"at": "2026-11-14T08:06:55+01:00",
"msg": "Idővonal: a szekciócímek nem vágódnak le; a „ma” jelző szélesebb, áttetsző, lágy sáv"
},
{
"id": "3d83214a4d",
"at": "2026-11-14T08:01:20+01:00",
"msg": "Idővonal minden nézetben: nincs bal oldali névoszlop, vastagabb sávok a projekt nevével"
},
{
"id": "d28a2086d4",
"at": "2026-11-14T08:00:02+01:00",
"msg": "Rövid / rámutatásra nyíló legördülők: nincs villogó kurzor, a mezőről a listára húzva nem csukódik be"
},
{
"id": "888786ee2b",
"at": "2026-11-14T07:56:38+01:00",
"msg": "Frissítéskor nem villan fel a módosítás előtti állapot: a sikeres módosítások a helyi indító-gyorsítótárba is bekerülnek"
},
{
"id": "a179baa639",
"at": "2026-11-14T07:46:57+01:00",
"msg": "Projekt: a Vissza gomb oda visz, ahonnan megnyitottad (pl. Naptár/idővonal), a görgetési helyzettel együtt"
},
{
"id": "ab899c3300",
"at": "2026-11-14T07:45:57+01:00",
"msg": "Legördülők: megnyitáskor nincs kijelölve (kék) a szöveg – az első leütés így is lecseréli; egyszeri javítás eltávolítva"
},
{
"id": "d874e28ad6",
"at": "2026-11-13T23:04:05+01:00",
"msg": "Egyszeri javítás: Synlab – Short videó 3 → Jóváhagyásra vár (e-mail nélkül, már kiment)"
},
{
"id": "b09674a5ba",
"at": "2026-11-13T23:01:38+01:00",
"msg": "Videó áthelyezése közben a lehúzásos frissítés vár, az oldal bezárása figyelmeztet"
},
{
"id": "a7e4483f37",
"at": "2026-11-13T22:55:35+01:00",
"msg": "Videótábla: az áthelyezett videó nem ugrik vissza a régi oszlopba egy közben beérkező régebbi adatfrissítés miatt; érintéses húzás-utánzat eltávolítva (az iPhone natívan támogatja)"
},
{
"id": "646b83c3fe",
"at": "2026-11-13T22:52:43+01:00",
"msg": "Érintőképernyő: a vágási tábla kártyái hosszan nyomva áthúzhatók másik oszlopba"
},
{
"id": "f43069a02e",
"at": "2026-11-13T22:48:07+01:00",
"msg": "Álló telefon: nagyobb videó a jóváhagyó ablakban (íráskor kicsi)"
},
{
"id": "8aac03955c",
"at": "2026-11-13T22:47:45+01:00",
"msg": "Telefon: vélemény írásakor a videó kicsi lesz és a szövegmező a billentyűzet fölé gördül"
},
{
"id": "3ff7da3dc2",
"at": "2026-11-13T22:42:42+01:00",
"msg": "Álló telefon: havi naptár keret nélkül, faltól falig"
},
{
"id": "5dde09ffb5",
"at": "2026-11-13T22:41:51+01:00",
"msg": "Mobil: az oldal sehol nem húzható oldalra (a kilógó tartalmat az oldal levágja), számlázási kártyák nem szélesebbek a képernyőnél"
},
{
"id": "846cc0d0bc",
"at": "2026-11-13T22:40:21+01:00",
"msg": "Mobil: elforgatás után a táblázatkeret magassága újraszámolódik (álló nézetben nem marad alacsony)"
},
{
"id": "656c12f621",
"at": "2026-11-13T22:40:04+01:00",
"msg": "Mobil Fizetések: az alsó összesítő sorok számai nem csúsznak át a név-oszlopon"
},
{
"id": "9b84b7adb1",
"at": "2026-11-13T22:37:58+01:00",
"msg": "Mobil: a Fizetések/Bevételek táblázatkerete pontosan a képernyő aljáig ér, így az alja is elérhető"
},
{
"id": "0720829ffd",
"at": "2026-11-13T22:36:55+01:00",
"msg": "Fekvő telefon: Fizetések táblázat bal oldali hézaga kisebb"
},
{
"id": "b9e425c84c",
"at": "2026-11-13T22:36:16+01:00",
"msg": "Számlázás táblázat: erős vonal a projektek között, a dobozokból nem lóg ki semmi"
},
{
"id": "1c5144a36d",
"at": "2026-11-13T22:35:25+01:00",
"msg": "Fekvő telefon: sokkal kisebb hézag a menüsáv, a fejléc és a táblázat között"
},
{
"id": "fe4d34d763",
"at": "2026-11-13T22:33:51+01:00",
"msg": "Fekvő telefon: Bevétel és kiadás fejléce egy sorban, tömörebb dobozok és táblázatok"
},
{
"id": "4d3042b4fe",
"at": "2026-11-13T21:33:23Z",
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
