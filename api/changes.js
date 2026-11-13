// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
},
{
"id": "90a24bb8f2",
"at": "2026-11-13T18:32:59+01:00",
"msg": "Fekvő telefon: széles táblázatok a saját keretükben görgethetők"
},
{
"id": "d4dc4a1709",
"at": "2026-11-13T18:32:20+01:00",
"msg": "Érintőképernyőn az ablak megnyitásakor nem ugrik fel a billentyűzet"
},
{
"id": "921e51168e",
"at": "2026-11-13T18:31:33+01:00",
"msg": "Beállítások a névjelvény menüjében (mobilon a nézetváltóban), fülként nem kell"
},
{
"id": "c0ec032775",
"at": "2026-11-13T18:24:51+01:00",
"msg": "Mobil: Kilépés a nézetváltó listájában; rövid legördülők érintésre billentyűzet és kijelölés nélkül"
},
{
"id": "df01e04659",
"at": "2026-11-13T18:23:53+01:00",
"msg": "Fekvő mobil: egysoros felső sáv, Kilépés a névjelvény mögött; mobil havi naptár görgethető"
},
{
"id": "63cdff7e44",
"at": "2026-11-13T18:19:31+01:00",
"msg": "Fekvő mobilnézet: görgetéskor eltűnik a felső sáv"
},
{
"id": "ff02439b74",
"at": "2026-11-13T18:10:40+01:00",
"msg": "Mobil: Google Naptár-szerű havi rács a kiválasztott nap eseményeivel; Értékesítés gombjai egy sorban"
},
{
"id": "a906b49d48",
"at": "2026-11-13T18:08:16+01:00",
"msg": "Értesítések mobilon: a panel a képernyőn belül marad"
},
{
"id": "01bd8bc4b6",
"at": "2026-11-13T18:07:42+01:00",
"msg": "Projektlista mobilon keret nélkül"
},
{
"id": "cdc6c7601d",
"at": "2026-11-13T18:06:17+01:00",
"msg": "Mobil: lehúzással frissítés"
},
{
"id": "1d93615cc5",
"at": "2026-11-13T17:55:25+01:00",
"msg": "Videótábla mobilon: az oszlopfejlécek nem csúsznak egymásba"
},
{
"id": "8a05032b14",
"at": "2026-11-13T17:50:25+01:00",
"msg": "Naptár: napváltás után (mobilon háttérből visszatérve) a mai napra ugrik"
},
{
"id": "0df3790d3f",
"at": "2026-11-13T16:31:24Z",
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
