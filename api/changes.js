// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "09102c05c5",
"at": "2026-11-12T22:09:21+01:00",
"msg": "Szerződés: nyersanyag díjválasztó elrendezése"
},
{
"id": "356bc69a39",
"at": "2026-11-12T22:07:07+01:00",
"msg": "Szerződés: új Lumos keretszerződés-sablon (Ervin javított változata); nyersanyag-átadás és NAS-archiválás díja választható (%+minimum / fix / e-mailben egyeztetett), minden sablonban"
},
{
"id": "2e1f971717",
"at": "2026-11-12T22:01:21+01:00",
"msg": "Új szerződés: rövidebb gombfeliratok, a mentés gomb nem csúszik új sorba"
},
{
"id": "ed42286a24",
"at": "2026-11-12T21:49:52+01:00",
"msg": "Szerződés: a PDF-et a Google készíti a Word-fájlból (a minta is ez); a sablonokban a felek táblázatai egymás mellett, nem lebegő táblázattal"
},
{
"id": "effe022b3e",
"at": "2026-11-12T21:45:23+01:00",
"msg": "Szerződés PDF a Google-lel (docx → PDF export, ideiglenes fájl törlődik)"
},
{
"id": "2b6890e8c0",
"at": "2026-11-12T21:39:27+01:00",
"msg": "Új szerződés: Küldés gomb – e-mail előnézet szerkeszthető szöveggel, aláírással, PDF melléklettel; kérésre mentés az ügyfél mappájába"
},
{
"id": "93e182be2c",
"at": "2026-11-12T21:37:18+01:00",
"msg": "Szerződés PDF: nincs levágott szóvég (elválasztás ki), a felek táblázatai egyforma oszlopokkal"
},
{
"id": "19b031358f",
"at": "2026-11-12T21:31:41+01:00",
"msg": "Új szerződés: a minta maga a PDF (oldalanként); a táblázatok nem lógnak ki a lapról"
},
{
"id": "38eefc3ec1",
"at": "2026-11-12T21:12:07+01:00",
"msg": "Szerződés PDF: helyes számozás, logó az első oldalon, saját oldaltördelés"
},
{
"id": "67c405988e",
"at": "2026-11-12T21:08:11+01:00",
"msg": "Szerződés PDF: nem üres (belső dobozból készül)"
},
{
"id": "3f397ff545",
"at": "2026-11-12T21:07:24+01:00",
"msg": "Új szerződés: az ügyfél mappájába PDF kerül; PDF-letöltés gomb, a .docx letöltés megmarad"
},
{
"id": "551d247e8b",
"at": "2026-11-12T21:04:23+01:00",
"msg": "Új szerződés: a cég- és típusválasztó gombok egymás alatt"
},
{
"id": "24c6e1c321",
"at": "2026-11-12T21:01:50+01:00",
"msg": "Új szerződés: visszalépés után is tovább visz a típusra kattintás"
},
{
"id": "2607db9f47",
"at": "2026-11-12T21:01:36+01:00",
"msg": "Új szerződés: a típusra kattintva azonnal tovább lép (nincs Tovább gomb)"
},
{
"id": "8afbf301dc",
"at": "2026-11-12T20:57:37+01:00",
"msg": "Új szerződés: a típusválasztás a cég kiválasztása után jelenik meg"
},
{
"id": "236a745d31",
"at": "2026-11-12T20:55:27+01:00",
"msg": "Naptár: a közelgő események leírása egyszer újraszinkronizálódik (jegyzetek nélkül)"
},
{
"id": "5500d57ac3",
"at": "2026-11-12T20:55:10+01:00",
"msg": "Naptár: a projekt jegyzetei nem kerülnek a naptárbejegyzésbe"
},
{
"id": "777747d680",
"at": "2026-11-12T20:54:48+01:00",
"msg": "Új szerződés: a cégválasztásnál nincs ÁFA-megjegyzés"
},
{
"id": "fe48f0fad7",
"at": "2026-11-12T20:52:39+01:00",
"msg": "Új szerződés: két egyszerű döntés – cég (Lumos Motion / Egri Ervin E.V.), majd típus (Megbízási / Keretszerződés)"
},
{
"id": "2ae9893d1f",
"at": "2026-11-12T18:20:51+01:00",
"msg": "Értékesítés: másodlagos e-mail-cím a lehetőségnél (új oszlop a végén); az árajánlatnál alapból másolatba kerül"
},
{
"id": "e098e3ea39",
"at": "2026-11-12T18:15:15+01:00",
"msg": "Napló: a felhasználók a legutóbbi belépés szerint csökkenő sorrendben"
},
{
"id": "4ff86da16f",
"at": "2026-11-12T18:14:31+01:00",
"msg": "Küldés a kollégák címéről: a panel gombjai működnek (kezelők az ACT létrejötte után)"
},
{
"id": "d4cba3940a",
"at": "2026-11-12T17:58:25+01:00",
"msg": "Árak: Short videó operatőri alapdíj szerkeszthető"
},
{
"id": "d87670cb2b",
"at": "2026-11-12T17:57:21+01:00",
"msg": "Árajánlat PDF: ami nem fér el, új oldalra kerül (az opciók egészben), oldalszámmal; előnézetben külön lapok"
},
{
"id": "d8706cc137",
"at": "2026-11-12T17:56:03+01:00",
"msg": "Árajánlat PDF: a lábléc nem lóg rá az aláírásra"
},
{
"id": "32c4a11725",
"at": "2026-11-12T17:52:25+01:00",
"msg": "Árajánlat PDF: széles képernyőn sem üres (a rögzített ablakszélesség kivéve)"
},
{
"id": "f4190b5e2f",
"at": "2026-11-12T17:51:03+01:00",
"msg": "Árajánlat: rövidebb alapszöveg"
},
{
"id": "413536ff7f",
"at": "2026-11-12T17:50:41+01:00",
"msg": "Árajánlat előnézet: a tárgy nem szerkeszthető (a szerkesztőben módosítható)"
},
{
"id": "e27128e013",
"at": "2026-11-12T17:49:01+01:00",
"msg": "Árajánlat előnézet: az aláírás nem nyúlik ki teljes szélességre"
},
{
"id": "1707cc3caa",
"at": "2026-11-12T17:41:08+01:00",
"msg": "Árajánlat: a fájlnév a megadott címzett cégből"
},
{
"id": "b9f22e587b",
"at": "2026-11-12T16:40:59Z",
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
