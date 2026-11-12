// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "1c5e7a721f",
"at": "2026-11-12T17:40:50+01:00",
"msg": "Árajánlat: az „Ajánlatot kapja” blokk (cég, kapcsolattartó, cím, e-mail) szerkeszthető"
},
{
"id": "118052ee10",
"at": "2026-11-12T17:40:03+01:00",
"msg": "Árajánlat előnézet: a levél szövege és tárgya közvetlenül szerkeszthető"
},
{
"id": "bd267bc2ae",
"at": "2026-11-12T17:28:39+01:00",
"msg": "Árajánlat: több opció egy PDF-ben (pl. 1 / 3 / 5 short), opciónként tételek és összesítő, kalkulátorból az aktív opcióba"
},
{
"id": "76a22b8122",
"at": "2026-11-12T17:16:06+01:00",
"msg": "Küldés a kollégák saját címéről: Google Workspace domainszintű megbízás (szolgáltatásfiók, Gmail API), automatikus visszaesés a központi fiókra; ügyvezetői beállító panel teszttel"
},
{
"id": "32df3c5f90",
"at": "2026-11-12T17:13:12+01:00",
"msg": "Árajánlat logó: gyorsítótár frissítése"
},
{
"id": "1946ea0321",
"at": "2026-11-12T17:13:05+01:00",
"msg": "Árajánlat: a hivatalos kétsoros logó"
},
{
"id": "486fe7e65c",
"at": "2026-11-12T17:11:15+01:00",
"msg": "Péter aláírása: fotó, beosztás, telefon"
},
{
"id": "89be61045e",
"at": "2026-11-12T17:08:16+01:00",
"msg": "Árajánlat: kedvezmény pipálható (alapból ki), a kalkulátoros tételek neve részletek nélkül"
},
{
"id": "d61bf50e69",
"at": "2026-11-12T17:06:21+01:00",
"msg": "Árajánlat: új lapon nem üres a PDF, kedvezmény max. 20%, általánosnál a fájlnévben sincs rendezvény, a kalkulátoros tételek számok nélkül (darab a mennyiségbe), valódi feladó az előnézetben"
},
{
"id": "f820d5ca33",
"at": "2026-11-12T17:03:29+01:00",
"msg": "Árajánlat PDF: kéttagú (LUMOS / MOTION) logó"
},
{
"id": "5ff349fb85",
"at": "2026-11-12T17:00:12+01:00",
"msg": "Árkalkulátor ablak: Bezárás balra, a többi jobbra"
},
{
"id": "eff2c2dd9d",
"at": "2026-11-12T16:59:58+01:00",
"msg": "Árkalkulátor árai: nyersanyag alapdíj + százalék"
},
{
"id": "e06232638d",
"at": "2026-11-12T15:57:10Z",
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
