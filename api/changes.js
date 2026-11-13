// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "a3d9f9091f",
"at": "2026-11-13T22:33:14+01:00",
"msg": "Mobil Fizetések: a táblázat alja elérhető fekvőben, tömörebb állapotsorok"
},
{
"id": "328361f662",
"at": "2026-11-13T22:32:13+01:00",
"msg": "Fekvő telefon: Szerződés és számlázás fejléce egy sorban, tömörebb csempék és táblázat"
},
{
"id": "b14448a2b7",
"at": "2026-11-13T22:30:06+01:00",
"msg": "Fekvő telefon: Fizetések táblázat nem vágódik le alul, tömörebb sorok"
},
{
"id": "b08d825039",
"at": "2026-11-13T22:28:30+01:00",
"msg": "Fekvő telefon: Pénzügyek fejléce egy sorban (rövid alfülnevek, NAV, Díjösszesítő)"
},
{
"id": "f4d9bd8bd2",
"at": "2026-11-13T22:26:33+01:00",
"msg": "Fekvő telefon: a naptárban kiírva „+ Új projekt”"
},
{
"id": "5bc95018e1",
"at": "2026-11-13T22:24:59+01:00",
"msg": "Fekvő telefon: Fizetések táblázat faltól falig"
},
{
"id": "1334f7b72b",
"at": "2026-11-13T22:23:59+01:00",
"msg": "Fekvő telefon: naptár eszköztára egy sorban, oldalsó hónapok nélkül"
},
{
"id": "ca72f02ed5",
"at": "2026-11-13T22:22:25+01:00",
"msg": "Fekvő telefon: Projektek táblázat Státusz oszlopa keskenyebb"
},
{
"id": "d40b96ebfa",
"at": "2026-11-13T22:21:42+01:00",
"msg": "Mobil árajánlat-előnézet: tördelés javítva, semmi nem lóg ki, a PDF-oldal kicsinyítve fér el"
},
{
"id": "45abfa4e7e",
"at": "2026-11-13T22:20:03+01:00",
"msg": "Mobil: az oldal ismét görgethető lefelé (overflow-x: clip a hidden helyett, nem lesz külön görgetőkeret a body)"
},
{
"id": "eb3766696d",
"at": "2026-11-13T22:18:33+01:00",
"msg": "Ügyfelek: Ajánlat gomb eltávolítva"
},
{
"id": "0631d23171",
"at": "2026-11-13T22:17:51+01:00",
"msg": "Mobil: a táblázatok nem húzhatók el oldalra a szélükön túl"
},
{
"id": "e622160bd1",
"at": "2026-11-13T22:17:37+01:00",
"msg": "Mobil Bevételek táblázat a Fizetésekhez hasonlóan: sötét rögzített fejléc, rögzített nap+név oszlop, egysoros sorok"
},
{
"id": "73dfa1e70e",
"at": "2026-11-13T22:16:22+01:00",
"msg": "Ügyfelek: Árajánlat küldése gomb a fejlécben (mobilon: Ajánlat), a gombok egy sorban"
},
{
"id": "884e39e37f",
"at": "2026-11-13T22:14:39+01:00",
"msg": "Mobil vágási tábla: szélesebb oszlopok"
},
{
"id": "ac8bd370b4",
"at": "2026-11-13T22:13:07+01:00",
"msg": "Menüfülsor: a halványodó szél betöltéskor is látszik, a fülsor a szerepkör-választóig ér"
},
{
"id": "d7d0662605",
"at": "2026-11-13T22:12:13+01:00",
"msg": "Értékesítés fejléc: alcím törölve, cím és gombok egy sorban, egyforma gombok"
},
{
"id": "80c42872a8",
"at": "2026-11-13T22:10:11+01:00",
"msg": "Érintőképernyő: súgó csak hosszú érintésre; menüfülsor lágy átmenettel a szélén, az aktív fül teljesen látszik"
},
{
"id": "00321cc07f",
"at": "2026-11-13T21:08:10Z",
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
