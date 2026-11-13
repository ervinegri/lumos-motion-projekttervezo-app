// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "7f0f21430d",
"at": "2026-11-13T17:31:15+01:00",
"msg": "Short videó: operatőri alapdíj 40 000 Ft"
},
{
"id": "f34743513b",
"at": "2026-11-13T17:29:49+01:00",
"msg": "Értékesítés: Árkalkulátor gomb a fejlécben"
},
{
"id": "9003d2868a",
"at": "2026-11-13T17:16:53+01:00",
"msg": "Árajánlat: rövid leírás a tételek alatt (terjedelem, fotószám, óraszám, létszám)"
},
{
"id": "b0a54ad098",
"at": "2026-11-13T17:15:09+01:00",
"msg": "Árajánlat: Csomagkedvezmény a Mennyiségi kedvezmény helyett"
},
{
"id": "9432a62282",
"at": "2026-11-13T17:08:05+01:00",
"msg": "Árajánlat PDF: a kelt és érvényes dátum egymás alatt"
},
{
"id": "db7d10b0ad",
"at": "2026-11-13T17:03:14+01:00",
"msg": "Árajánlat PDF: 20%-kal kisebb logó"
},
{
"id": "a04f317d41",
"at": "2026-11-13T17:02:18+01:00",
"msg": "Árajánlat küldése: a lehetőség-lista kereshető (gépelhető)"
},
{
"id": "accc45500a",
"at": "2026-11-13T17:02:01+01:00",
"msg": "Árajánlat PDF: összeg-tördelés, adószám a cím előtt, weboldal ki, szignó a bal alsó sarokban, nagyobb érvényességi sor; az ablakok váratlan hibája kiíródik"
},
{
"id": "6e1321e2e3",
"at": "2026-11-13T16:47:27+01:00",
"msg": "Lehetőség: Következő lépés és Mikor? külön felirattal"
},
{
"id": "5ed6330057",
"at": "2026-11-13T16:43:09+01:00",
"msg": "Nyersanyag-levél: a/az névelő"
},
{
"id": "c97d27923b",
"at": "2026-11-13T16:33:21+01:00",
"msg": "Árajánlat: Újabb másolat a mező címsorában"
},
{
"id": "9f3e7a39c2",
"at": "2026-11-13T15:32:40Z",
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
