// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "8184a0d71a",
"at": "2026-11-13T13:46:12+01:00",
"msg": "Utómunka-kártya: a számláló fekete háttér nélkül"
},
{
"id": "d80b79adb0",
"at": "2026-11-13T13:44:17+01:00",
"msg": "Utómunka-kártya: nincs emelkedés rámutatáskor"
},
{
"id": "244fc29e73",
"at": "2026-11-13T13:35:51+01:00",
"msg": "Utómunka-kártya: kéz kurzor, nagyobb videószámláló"
},
{
"id": "19722e0838",
"at": "2026-11-13T13:34:20+01:00",
"msg": "Projekt: az Utómunka lépés kártyája kattintható – a videótábla nyílik"
},
{
"id": "f378aa28ef",
"at": "2026-11-13T13:32:21+01:00",
"msg": "Verzióváltó: a visszadobás indoka a régi verziónál"
},
{
"id": "36d6cbd076",
"at": "2026-11-13T13:31:28+01:00",
"msg": "Verzióváltó: a régebbi (link-előzmény nélküli) videóknál is, a hozzászólásokkal"
},
{
"id": "003b9127f6",
"at": "2026-11-13T13:30:27+01:00",
"msg": "Videónézet: verzióváltó (v1…vN) – a régi verzió videója és hozzászólásai"
},
{
"id": "594767c47f",
"at": "2026-11-13T13:28:22+01:00",
"msg": "Ügyfélküldés: kifizetett projektnél nincs vízjel-mező"
},
{
"id": "db66dc3c8b",
"at": "2026-11-13T13:27:07+01:00",
"msg": "Ügyfélküldés: a mentett mintában ragadt videónév javítva; kifizetett projektnél nincs bepipálva a vízjel"
},
{
"id": "67e3d2be9e",
"at": "2026-11-13T12:29:30+01:00",
"msg": "Belső ellenőrzés: több ellenőrző is kijelölhető (mindenki saját levelet kap)"
},
{
"id": "442165ee18",
"at": "2026-11-13T12:13:36+01:00",
"msg": "Számlázás: ügyfélcsoportban is megjelenik a díjbekérő nélküli számla gombja"
},
{
"id": "eb2a9eea1b",
"at": "2026-11-13T11:48:47+01:00",
"msg": "Videónézet telefonon: koppintásra elindul a lejátszás (a saját kattintáskezelő nem állítja meg)"
},
{
"id": "fdc7e4bfc6",
"at": "2026-11-13T11:47:45+01:00",
"msg": "Jóváhagyó: kérdés törölve; belépési hibaüzenet rövidebb; mobil videónézet: a gombsor nem takar"
},
{
"id": "b5c1ce3a1b",
"at": "2026-11-13T10:25:02+01:00",
"msg": "Fizetések: a munkatárs neve a fejlécben a profilt nyitja"
},
{
"id": "c813f38cb9",
"at": "2026-11-13T09:29:18+01:00",
"msg": "Jóváhagyó oldal: Videó linkjének másolása (a videó saját linkje; vízjeles videónál nincs)"
},
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
"id": "54149a7bcb",
"at": "2026-11-13T07:42:49Z",
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
