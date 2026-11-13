// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "84acb504fb",
"at": "2026-11-13T07:13:28+01:00",
"msg": "Kiállítói szerződés: short helyett videó"
},
{
"id": "9a59753ec8",
"at": "2026-11-13T07:11:11+01:00",
"msg": "Szerződés-állapot lehetőségeknél oszlop nélkül; 4.2 pont egyszerűsítve; mező-magyarázat"
},
{
"id": "2bbbe1a318",
"at": "2026-11-13T07:08:53+01:00",
"msg": "Javítás: Értékesítés lap oszlopai visszaállítva; sablonok a Drive-ban; short szerződés aláírás egy oldalon"
},
{
"id": "b9e0dea3aa",
"at": "2026-11-13T07:04:20+01:00",
"msg": "Szerződés-állapot (kiküldve/visszaküldve/aláírva) projekten és sales-ben; cégválasztó elrejtése; időzítők telepítése"
},
{
"id": "4c41cb75f7",
"at": "2026-11-13T06:58:53+01:00",
"msg": "Szerződés: harmadik típus (kiállítói short megbízás) opciókkal; keskenyebb 1. lépés"
},
{
"id": "0ef7fa08b8",
"at": "2026-11-13T06:51:49+01:00",
"msg": "Új szerződés: alacsonyabb választógombok, a Keretszerződés elöl"
},
{
"id": "914fde2f3b",
"at": "2026-11-13T06:51:32+01:00",
"msg": "Videók: újbóli leadáskor / új verziónál a korábbi „Megnyitották” jelzés nem számít"
},
{
"id": "e0f74f97b0",
"at": "2026-11-13T06:47:53+01:00",
"msg": "Szerződés mentésekor a szerkeszthető .docx is az ügyfél mappájába kerül (a PDF mellé)"
},
{
"id": "fea7d2fef6",
"at": "2026-11-12T22:59:27+01:00",
"msg": "Naptár újraszinkron: időzítő-jogosultság nélkül is hibátlanul lefut"
},
{
"id": "afb11c9122",
"at": "2026-11-12T22:56:27+01:00",
"msg": "Naptár: azonnali újraszinkron (ügyvezető), és a Naptár megnyitásakor egyszer újra lefut – a jegyzetek kikerülnek a leírásból"
},
{
"id": "8ddc054762",
"at": "2026-11-12T22:46:24+01:00",
"msg": "Szerződéssablonok: a felek adatai soronként egy vonalban (közös táblázat); a dátum a Kelt sorban, az aláírásos blokk egyben marad"
},
{
"id": "5b6e541646",
"at": "2026-11-12T22:44:48+01:00",
"msg": "Szerződés fájlneve: típus_ügyfél_szolgáltató (pl. Keretszerzodes_Empatia_..._Lumos_Motion_Kft.pdf)"
},
{
"id": "87a780be45",
"at": "2026-11-12T22:42:59+01:00",
"msg": "Szerződéssablonok: több hely az aláírásnak (kb. 2,3 cm a vonalak fölött)"
},
{
"id": "7b3e96639b",
"at": "2026-11-12T22:41:03+01:00",
"msg": "Szerződéssablonok: a felek táblázatai egyforma sorközzel és oszlopszélességgel"
},
{
"id": "6f49fcf7dc",
"at": "2026-11-12T22:38:21+01:00",
"msg": "Szerződéssablonok: a felek adatai egységes rácsban (feliratok, két egyforma táblázat, szerepek egy vonalban)"
},
{
"id": "fe126cba40",
"at": "2026-11-12T22:31:49+01:00",
"msg": "Szerződéssablonok: a specifikáció táblázat a margón belül; kisebb logó"
},
{
"id": "d5c01a1b7b",
"at": "2026-11-12T22:25:14+01:00",
"msg": "Szerződéssablonok: az aláírásos rész (Kelt, aláírási vonalak, nevek) nem törik szét két oldalra"
},
{
"id": "432f2db463",
"at": "2026-11-12T22:22:50+01:00",
"msg": "Keretszerződés: a díjmódosítási értesítés mondata törölve; átadás választható – kifizetés után, vagy vízjellel (a vízjel a kifizetés után kerül le)"
},
{
"id": "eb12e0d843",
"at": "2026-11-12T22:16:38+01:00",
"msg": "Szerződéssablonok: szélesebb technikai specifikáció táblázat"
},
{
"id": "81105c7a1a",
"at": "2026-11-12T22:13:36+01:00",
"msg": "Szerződéssablonok: a technikai specifikáció első oszlopa szélesebb (nem törik a kettőspont)"
},
{
"id": "01937ec8cf",
"at": "2026-11-12T22:09:49+01:00",
"msg": "Szerződés űrlap: a szakaszcímek teljes szélességben"
},
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
"id": "cb0bdb046e",
"at": "2026-11-12T20:08:22Z",
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
