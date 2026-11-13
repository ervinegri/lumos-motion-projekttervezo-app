// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "ff1b291441",
"at": "2026-11-13T09:24:16+01:00",
"msg": "Jóváhagyó oldal: Link másolása gomb"
},
{
"id": "f006d762e6",
"at": "2026-11-13T09:23:41+01:00",
"msg": "Idővonal: a mai nap vonala középen"
},
{
"id": "8c188ef23e",
"at": "2026-11-13T09:23:22+01:00",
"msg": "Utómunka-instrukciók: alapból becsukva, fejlécben darabszám és nyitottak"
},
{
"id": "aaff18f26d",
"at": "2026-11-13T09:21:08+01:00",
"msg": "Utómunka-instrukció: formázott szöveg (beillesztéskor a formázás megmarad, Ctrl+B/I/U)"
},
{
"id": "d5bc12b37d",
"at": "2026-11-13T09:20:07+01:00",
"msg": "Utómunka-instrukciók: betöltésjelző szövegként"
},
{
"id": "e7f3fcf93f",
"at": "2026-11-13T09:19:38+01:00",
"msg": "Ügyfél-visszaigazolás: érthető, nyelvtanilag helyes mondat"
},
{
"id": "6604394b4d",
"at": "2026-11-13T09:18:03+01:00",
"msg": "E-mail lábléc: új szöveg"
},
{
"id": "89fabf150c",
"at": "2026-11-13T09:12:35+01:00",
"msg": "Utómunka-instrukciók: alcím törölve"
},
{
"id": "6111cc6073",
"at": "2026-11-13T09:11:15+01:00",
"msg": "Megszólítás: első keresztnév (magyar névsorrend) mindenhol; újraküldéskor nem ugrál a megnyitás-jelzés"
},
{
"id": "e1bc46dc7f",
"at": "2026-11-13T09:08:28+01:00",
"msg": "Videó-hozzászólás válasz: többsoros mező, Enter új sor, Ctrl/Cmd+Enter vagy Küldés gomb"
},
{
"id": "699b44384b",
"at": "2026-11-13T09:04:02+01:00",
"msg": "Utómunka-instrukciók a projekten: vezető írja, az utómunkás hozzászól és kipipálja (videótábla + projektoldal)"
},
{
"id": "27e969676c",
"at": "2026-11-13T08:58:46+01:00",
"msg": "E-mailek: egységes dőlt lábléc az automatikus értesítéseken"
},
{
"id": "840a053f0e",
"at": "2026-11-13T08:55:18+01:00",
"msg": "Utómunkára lépés csak a helyszíni munka napjától (felület és háttér)"
},
{
"id": "c5a3d88cfa",
"at": "2026-11-13T08:52:49+01:00",
"msg": "Naptárszűrő: Vágói helyett Utómunka"
},
{
"id": "6c45708b70",
"at": "2026-11-13T08:45:43+01:00",
"msg": "Projektoldal: kódmegjegyzés kilógott a felületre – törölve"
},
{
"id": "ff97f40056",
"at": "2026-11-13T08:42:40+01:00",
"msg": "Termelési vezető: szakember nézet; szakember nézetben nincs Státusz oszlop"
},
{
"id": "f179031433",
"at": "2026-11-13T08:39:48+01:00",
"msg": "Szakember nézet: kezdés-távozás egy sorban, nincs ragadós címsáv; naptárnál működik a böngésző vissza/előre húzással"
},
{
"id": "a95fa863a4",
"at": "2026-11-13T08:38:24+01:00",
"msg": "Fotógaléria jóváhagyandó elemként; csak helyszíni technikánál a rendezvény után rögtön Kész"
},
{
"id": "d4ea5d2248",
"at": "2026-11-13T08:30:45+01:00",
"msg": "Projektlista: videónkénti leadott linkek, Videó(k) jóváhagyva"
},
{
"id": "53b0d08134",
"at": "2026-11-13T08:25:41+01:00",
"msg": "Lemondott projekt sávja: magyarázó mondat törölve, dupla pont javítva"
},
{
"id": "3f271b0de6",
"at": "2026-11-13T08:22:50+01:00",
"msg": "Projektlista: időpont (tól–ig), helyszíni létszám vágó nélkül, jóváhagyott videóknál nincs Jóváhagyásra vár"
},
{
"id": "22c04a257f",
"at": "2026-11-13T08:15:13+01:00",
"msg": "Számlatörténet: app-számlák tételnevei"
},
{
"id": "40065638f2",
"at": "2026-11-13T08:11:33+01:00",
"msg": "Számlatörténet: tételnevek, év a dátumban"
},
{
"id": "cb2ee897a0",
"at": "2026-11-13T08:07:55+01:00",
"msg": "Szerződés: visszalépés után a PDF megmarad, csak módosításkor készül újra"
},
{
"id": "6e386da301",
"at": "2026-11-13T08:02:54+01:00",
"msg": "Ügyfelek: számlatörténet a számlázz.hu-ból (lekérdezés sorszám szerint), az adatlapon Számlázva blokk"
},
{
"id": "647cdf7189",
"at": "2026-11-13T07:59:05+01:00",
"msg": "Ügyfél adatlapja: Új szerződés létrehozása gomb"
},
{
"id": "b3b8ab85e4",
"at": "2026-11-13T07:57:58+01:00",
"msg": "Szerződés: táblázatokban balra igazítás (nincs széthúzott név)"
},
{
"id": "9d65601e15",
"at": "2026-11-13T07:48:26+01:00",
"msg": "Számla díjbekérő nélkül: teljes összeg a gombon"
},
{
"id": "dbf4c17dc3",
"at": "2026-11-13T07:47:02+01:00",
"msg": "Számlázás: a rendezvény napjától díjbekérő helyett számla is; halványabb keretszerződés-gomb"
},
{
"id": "36fbef5bbc",
"at": "2026-11-13T07:42:39+01:00",
"msg": "Sales szinkron: ötperces időzítő megszűnik (belépéskor fut)"
},
{
"id": "1d1bdd04c3",
"at": "2026-11-13T06:29:51Z",
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
