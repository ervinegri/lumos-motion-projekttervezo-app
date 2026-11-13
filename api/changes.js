// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "772bdda1d5",
"at": "2026-11-13T07:29:41+01:00",
"msg": "setupTriggers: hiányzó jogosultság újrakérése"
},
{
"id": "a958711f48",
"at": "2026-11-13T07:22:31+01:00",
"msg": "Kód modulokra bontva: háttér apps-script/src/NN_*.gs, felület views-*/actions-* + boot.js"
},
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
"id": "b0340f37b9",
"at": "2026-11-12T21:38:33Z",
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
