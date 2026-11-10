// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "315a9125c1",
"at": "2026-11-10T12:50:57+02:00",
"msg": "Szerepek legördülő: teljes szélességű kereső, megnyitáskor a lista tetejéről indul"
},
{
"id": "3c50616412",
"at": "2026-11-10T12:49:05+02:00",
"msg": "Mai projektek kerete rárajzolt rétegként, a táblázat elrendezése változatlan"
},
{
"id": "3ee9f9b430",
"at": "2026-11-10T12:46:43+02:00",
"msg": "Idővonal: a mai nap előtt 5 nap is látszik megnyitáskor"
},
{
"id": "77c5cf2c8e",
"at": "2026-11-10T12:45:29+02:00",
"msg": "Mai keret: az oszlopválasztó nem töri meg a piros vonalat"
},
{
"id": "5731fe1ab3",
"at": "2026-11-10T12:26:42+02:00",
"msg": "MA jelölő a felső kártyához simul"
},
{
"id": "6806e89f4e",
"at": "2026-11-10T11:40:38+02:00",
"msg": "Kompaktabb MA jelölő a mai projektek keretén"
},
{
"id": "bf227cfc2f",
"at": "2026-11-10T11:38:03+02:00",
"msg": "Mai projektek kerete lekerekített sarkokkal"
},
{
"id": "612a0a015a",
"at": "2026-11-10T11:35:02+02:00",
"msg": "Mai projektek piros keretben, a keret tetején a MA jelölővel"
},
{
"id": "abc20f3190",
"at": "2026-11-10T11:08:41+02:00",
"msg": "Számla: a teljesítés dátuma alapból a rendezvény (utolsó) napja"
},
{
"id": "d6a7aa383f",
"at": "2026-11-10T11:06:34+02:00",
"msg": "Díjbekérő megnyitása: ha a számlázz.hu már nem adja vissza, a kiállításkori e-mail-mellékletből; csak az app előtti díjbekérő nem kattintható"
},
{
"id": "93d10ad203",
"at": "2026-11-10T11:03:57+02:00",
"msg": "Számla ablak: ha a foglaló sima számlán ment ki, végszámla helyett magától Számla a fennmaradó részről"
},
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
"id": "818b041a56",
"at": "2026-11-10T08:03:49Z",
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
