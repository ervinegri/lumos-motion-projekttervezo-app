// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "1073dcdf6d",
"at": "2026-11-10T14:02:52+02:00",
"msg": "Szakember hozzáadása: alapból a hiányzó szerep a beosztás, kereshető legördülővel"
},
{
"id": "fd49de5c05",
"at": "2026-11-10T13:55:27+02:00",
"msg": "Szövegmezők: a kézzel nagyobbra húzott méret gépeléskor / törléskor megmarad"
},
{
"id": "eda7a12ee1",
"at": "2026-11-10T13:51:37+02:00",
"msg": "Előadásrögzítés: Helyszín elnevezés, a + egyszerűen új közeli kamera sort ad, helyszínenként egy operatőr"
},
{
"id": "1b2391f0e2",
"at": "2026-11-10T13:45:49+02:00",
"msg": "Kameraszög pipája kivehető: az automatikus kitöltés csak operatőr- vagy kameraváltozáskor jelöl be új szöget"
},
{
"id": "9a91a8900b",
"at": "2026-11-10T13:44:32+02:00",
"msg": "Közeli kamera: szerény + gomb a sorban, külön sor nélkül"
},
{
"id": "b0fb7c2feb",
"at": "2026-11-10T13:40:15+02:00",
"msg": "Előadásrögzítés: több közeli kamera termenként, mindegyik saját sorban, saját operatőrrel és eszközzel"
},
{
"id": "696acc0a4e",
"at": "2026-11-10T13:24:53+02:00",
"msg": "Beosztó levél: helyszíni feladat (terem, kameraszög, eszköz), a vágnivaló tételei külön sorban"
},
{
"id": "8ba3537492",
"at": "2026-11-10T13:16:22+02:00",
"msg": "Előadásrögzítés: a terem operatőrének kiosztott kamerái és objektívei automatikusan a kameraszögekhez kerülnek"
},
{
"id": "6d9328abf1",
"at": "2026-11-10T13:13:03+02:00",
"msg": "Figyelmeztetés: előadások utómunkája rögzítés nélkül"
},
{
"id": "b3d51e06cd",
"at": "2026-11-10T13:10:23+02:00",
"msg": "Kifizetés-értesítés: a projektek külön sorban"
},
{
"id": "63303f9c1e",
"at": "2026-11-10T13:09:24+02:00",
"msg": "Kifizetés-értesítés: közös számlánál minden projekt neve látszik"
},
{
"id": "70fd6e26df",
"at": "2026-11-10T13:04:54+02:00",
"msg": "Munkatársi dokumentumok: átnevezés, értelmes megnevezés a fájlnévből (EV-igazolás, kamarai igazolás), Gmail-begyűjtés nem keres a saját postafiók címével"
},
{
"id": "1de05be3d3",
"at": "2026-11-10T12:59:16+02:00",
"msg": "Mai keret: a sarkok kitöltve"
},
{
"id": "f1824900ad",
"at": "2026-11-10T12:54:47+02:00",
"msg": "Mai keret a táblázat faláig ér"
},
{
"id": "4088de7b21",
"at": "2026-11-10T12:53:22+02:00",
"msg": "Mai keret: pontosan a cellák köré igazítva, kerek cellasarkok"
},
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
"id": "751d3a7bd4",
"at": "2026-11-10T08:56:36Z",
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
