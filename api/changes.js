// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "0c28878df3",
"at": "2026-11-10T11:01:16+02:00",
"msg": "A „díjbekérő: …” sorra kattintva nem nyílik meg a számla"
},
{
"id": "d63b5a92df",
"at": "2026-11-10T10:58:35+02:00",
"msg": "Díjbekérő hivatkozás a foglaló-kártyán: csak szöveg (ugyanazt a számlát nyitotta)"
},
{
"id": "4e56deccf9",
"at": "2026-11-10T10:58:19+02:00",
"msg": "Frissítés-értesítő kétszer tovább látszik; kifizetés-értesítő csak ✕-re tűnik el"
},
{
"id": "8e1dc252c5",
"at": "2026-11-10T10:57:37+02:00",
"msg": "Vercel: a változásnapló-commit nem indít külön buildet (költségcsökkentés)"
},
{
"id": "f896de4bda",
"at": "2026-11-10T10:56:25+02:00",
"msg": "Kifizetett (behozott) díjbekérőre kattintva a belőle készült számla nyílik meg; kiállító: Lumos Motion Kft."
},
{
"id": "2574b4c336",
"at": "2026-11-10T10:52:28+02:00",
"msg": "Számlázás: díjbekérő alapján készült sima (előleg-)számla felismerése; a maradékról sima számla, nem végszámla; a díjbekérő is bekerül"
},
{
"id": "f90a6b991c",
"at": "2026-11-10T10:45:15+02:00",
"msg": "Végszámla előnézet: a foglalószámla levonása és a valódi fizetendő összeg; figyelmeztetés, ha nincs foglalószámla"
},
{
"id": "e06bda0b6d",
"at": "2026-11-10T10:41:51+02:00",
"msg": "Csengő: egy befizetés csak egyszer (díjbekérő + foglalószámla összevonva), rövid ügyfélnév"
},
{
"id": "9b23b32579",
"at": "2026-11-10T10:37:20+02:00",
"msg": "Szerződés és számlázás: lezárt projekt kártyái szürkén; a megtörtént elküldve/aláírva lépés nem vehető vissza"
},
{
"id": "374cb9fdb5",
"at": "2026-11-10T10:35:47+02:00",
"msg": "Szerződés és számlázás: kifizetés után a foglalószámla kerül előre, a díjbekérő halvány hivatkozás; díjbekérő nélküli foglalószámlánál „Foglalószámla” cím"
},
{
"id": "c254dab57b",
"at": "2026-11-10T10:32:32+02:00",
"msg": "Bizonylatok: egységes fájlnév (Lumos Motion – Típus Számlaszám – Ügyfél.pdf), megnyitás névvel és Letöltés gombbal"
},
{
"id": "c2c3ab5b4d",
"at": "2026-11-10T10:28:40+02:00",
"msg": "Számla ablak: fizetési határidő gyorsgombjai egy sorban, szegmentált vezérlőként"
},
{
"id": "48aeae1566",
"at": "2026-11-10T10:26:25+02:00",
"msg": "Foglalószámla párosítás: csak ugyanannak a vevőnek a számlája (összeg + vevő egyezés)"
},
{
"id": "549fd337ea",
"at": "2026-11-10T10:25:27+02:00",
"msg": "Számla ablak: a napok gombjai a látható fizetési határidőt is frissítik"
},
{
"id": "9bb36064dc",
"at": "2026-11-10T10:22:12+02:00",
"msg": "Foglalószámla keresése: a Sales App rendelésszámával (LM-<év>-<azonosító>); kifizetés után csak 3 napig"
},
{
"id": "460834a4b3",
"at": "2026-11-10T10:11:57+02:00",
"msg": "Kifizetések: látható lekérdezés (pörgő jelző), a kifizetett díjbekérőből készült foglalószámla is bekerül"
},
{
"id": "ceec810fb0",
"at": "2026-11-10T10:10:52+02:00",
"msg": "Szerződés és számlázás: a bizonylat-kártya üres részére kattintva is megnyílik a bizonylat"
},
{
"id": "31fdab550a",
"at": "2026-11-10T10:07:11+02:00",
"msg": "Kifizetések: a Sales App díjbekérőit a rendelésszám (Sales-rendelés azonosító) alapján is megtalálja kifizetés után"
},
{
"id": "27e1a07c77",
"at": "2026-11-10T10:05:43+02:00",
"msg": "Kifizetések: a számlázz.hu lekérdezése betöltéskor és 10 percenként magától (ügyvezető)"
},
{
"id": "f87e2aa2c1",
"at": "2026-11-10T10:03:36+02:00",
"msg": "Források: a P1–P3 prioritás megszűnt (szűrő, jelvény, adatlap mező, sorrend)"
},
{
"id": "ed7d862a33",
"at": "2026-11-10T10:03:09+02:00",
"msg": "Értesítések: beérkezett kifizetések a csengőben (ügyvezető); Szerződés és számlázás: kereső bal oldalt"
},
{
"id": "f2a24a3f84",
"at": "2026-11-09T22:26:05+02:00",
"msg": "Vízjel a jóváhagyó lejátszón: projektenként pipálható, Sales App projektnél alapból be, teljes kifizetés után lekerül"
},
{
"id": "6b856a258b",
"at": "2026-11-09T21:43:09+02:00",
"msg": "Beosztás: a kreatív kamerához kijelölt operatőr kártyájára „Kreatív operatőr” kerül (statív / interjúsarok hasonlóan)"
},
{
"id": "4eca959bdb",
"at": "2026-11-09T21:35:30+02:00",
"msg": "Legördülő: beágyazott operatőr-altípusok (az Operatőrre kattintva nyílnak); számolásnál is ezres tagolás"
},
{
"id": "d4cea0eadd",
"at": "2026-11-09T21:32:46+02:00",
"msg": "Stáb: szerepválasztó a saját legördülővel; új operatőr-altípusok (Kreatív, Statív, Interjúsarok)"
},
{
"id": "22582cc41e",
"at": "2026-11-09T21:30:44+02:00",
"msg": "Összeg-mezők: számolás is beírható (+ − × ÷), Enterre / kilépéskor kiszámolódik"
},
{
"id": "b6f1c808e5",
"at": "2026-11-09T21:22:01+02:00",
"msg": "Bevételek: a szervezői jutalék az Értékesítés oszlopba kerül, nem a Termelésbe"
},
{
"id": "9582343ad3",
"at": "2026-11-09T21:19:12+02:00",
"msg": "Díjösszesítő értékesítőnek: fix fizetés és jutalék külön, „Tételek”, számlamegjegyzés: Értékesítési tevékenység"
},
{
"id": "d820a98ad3",
"at": "2026-11-09T21:18:24+02:00",
"msg": "Ügyfélnek küldés: a díjösszesítőhöz hasonló, szerkeszthető levélelőnézet (fejléc, gomb, aláírás)"
},
{
"id": "917b8a684e",
"at": "2026-11-09T21:12:24+02:00",
"msg": "Bevételek: az értékesítői jutalék díjsorként sem kerül a Termelésbe"
},
{
"id": "6b651daf7f",
"at": "2026-11-09T19:10:35Z",
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
