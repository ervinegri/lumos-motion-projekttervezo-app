// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "92398a3d4e",
"at": "2026-11-13T22:08:01+01:00",
"msg": "Mobil: Bevétel és kiadás táblázatai keret nélkül a képernyő széléig, Kilépés ikon igazítva, Ügyfelek sorai egyszínűek"
},
{
"id": "e107be2924",
"at": "2026-11-13T22:06:37+01:00",
"msg": "Mobil számlázás: minden projekt külön színezett kártyán"
},
{
"id": "d67cbd8a00",
"at": "2026-11-13T22:04:48+01:00",
"msg": "Mobil Fizetések: a táblázat alja is elérhető (alacsonyabb keret, a görgetés továbbmegy az oldalra)"
},
{
"id": "6afa9c8c8d",
"at": "2026-11-13T22:00:49+01:00",
"msg": "Mobil számlázás: több számla kártyái nem csúsznak egymásra"
},
{
"id": "1ca9544490",
"at": "2026-11-13T21:59:57+01:00",
"msg": "Idővonal álló telefonon: vastagabb sávok, a név vékonyabb betűvel a sávon belül, szélesebb napok"
},
{
"id": "ff26cff377",
"at": "2026-11-13T21:57:15+01:00",
"msg": "Mobil Fizetések: szélesebb hónapléptető nyilak"
},
{
"id": "9d09f4ebba",
"at": "2026-11-13T21:56:28+01:00",
"msg": "Mobil Fizetések: görgetéskor a nevek fejléce fent marad"
},
{
"id": "1fb07faabc",
"at": "2026-11-13T21:55:49+01:00",
"msg": "Álló mobil: idővonal névoszlop nélkül (név a sávban vagy mellette), Ügyfelek egy oszlopban, Fizetések: Díjösszesítő felirat"
},
{
"id": "e2b84cc064",
"at": "2026-11-13T21:50:27+01:00",
"msg": "Álló mobil: Projektek táblázat egy oszlopban, a státusz-jelzések a projekt neve alatt"
},
{
"id": "63949177c3",
"at": "2026-11-13T21:49:37+01:00",
"msg": "Mobil árkalkulátor ablak: tömör fejléc (rövid fülnevek, × egy sorban), Bezárás gomb nélkül, gombsor két sorban"
},
{
"id": "1399a129ae",
"at": "2026-11-13T21:48:21+01:00",
"msg": "Fekvő mobil: névjelvény (pozíció) helyett a nézetváltó Fiók menüje, fülsor kifér, aktív fül mindig látszik"
},
{
"id": "34beb19c85",
"at": "2026-11-13T21:46:48+01:00",
"msg": "Mobil: frissítés-sáv széles + lehúzással eltüntethető, NAV/Kiküldés rövid felirat egy sorban, díjösszesítő-lista sorai nem fednek"
},
{
"id": "1ea946bb10",
"at": "2026-11-13T21:41:27+01:00",
"msg": "Bevétel és kiadás: alcím törölve"
},
{
"id": "3e2bc1b52b",
"at": "2026-11-13T21:40:53+01:00",
"msg": "Fizetések mobilon: a hónaplapozó és a gombok újra látszanak (az alfülek saját sorban)"
},
{
"id": "6f2ec4acfa",
"at": "2026-11-13T21:38:31+01:00",
"msg": "Kifizetési tábla mobilon: a fejléc első cellája is rögzített"
},
{
"id": "1697c03de4",
"at": "2026-11-13T21:35:38+01:00",
"msg": "Mobil: Fizetések fejléce egy sorban, a táblázatok a képernyő széléig érnek, kevesebb üres hely alul"
},
{
"id": "a9c3b6e71e",
"at": "2026-11-13T21:31:51+01:00",
"msg": "Mobil: egységes tömör megjelenés az egész appban (keret nélküli táblázatok, kisebb fejlécek, csempék, gombok)"
},
{
"id": "6822384b63",
"at": "2026-11-13T21:30:47+01:00",
"msg": "Mobil: tömör naptárfejléc, Leltár, Ügyfelek és Fizetések; táblázatok keret nélkül"
},
{
"id": "86f05e699d",
"at": "2026-11-13T21:25:45+01:00",
"msg": "Nézetváltó: Másik szakember/értékesítő a sárga sávban; nem ugrik vissza Ügyvezetőre; szélesebb címke mobilon"
},
{
"id": "99868b2b9f",
"at": "2026-11-13T21:15:29+01:00",
"msg": "Mobil havi naptár: többnapos elemek folytatása vékony csík; az oldal nem lóg ki oldalra"
},
{
"id": "0bc0b7ac97",
"at": "2026-11-13T20:42:43+01:00",
"msg": "E-mailek: az emojik nem esnek szét (HTML számkóddal mennek)"
},
{
"id": "c89c59eb00",
"at": "2026-11-13T18:49:37+01:00",
"msg": "Nézetváltó: nincs külön Másik szakember / értékesítő sor, a ↻ jelű sorral lehet másikat választani"
},
{
"id": "7d32129056",
"at": "2026-11-13T18:44:59+01:00",
"msg": "Mobil: nézetváltóban külön Szerepkör és Fiók csoport; projektcím egy sorban"
},
{
"id": "8cc9fc5568",
"at": "2026-11-13T18:40:17+01:00",
"msg": "Mobil: az ablakok teljes oldalként, bennük is lehúzással frissítés; projektcím alatti részletek elrejtve"
},
{
"id": "0759770b98",
"at": "2026-11-13T18:38:05+01:00",
"msg": "Projekt mentése nem írja vissza a videók állapotát (régi projektlap felülírta a vágó beküldését)"
},
{
"id": "f39e4d1465",
"at": "2026-11-13T18:36:20+01:00",
"msg": "Levélből nyitott videó a friss adatokkal; nyitott videóablak frissül; mobilon a lépések 2 oszlopban"
},
{
"id": "ef1666f22c",
"at": "2026-11-13T18:34:20+01:00",
"msg": "Szerződés és számlázás: fekvő telefonon görgetés nélkül, álló telefonon projektenkénti kártyák"
},
{
"id": "b21a68f059",
"at": "2026-11-13T18:33:09+01:00",
"msg": "Fekvő telefon: a kifizetési táblában az első oszlop rögzítve"
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
