// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "e9baa5267c",
"at": "2026-11-17T15:47:01+02:00",
"msg": "Fizetések tábla: az Összesen sor épp az iPhone vonala fölött"
},
{
"id": "cb0111f8c5",
"at": "2026-11-17T15:46:35+02:00",
"msg": "Fizetések tábla telefonon: a tábla szélén nincs oldal-rugózás (üres sáv)"
},
{
"id": "3280b80e45",
"at": "2026-11-17T15:45:14+02:00",
"msg": "Fizetések tábla telefonon: hely az iPhone alsó vonalának"
},
{
"id": "4a449fdd4b",
"at": "2026-11-17T15:44:49+02:00",
"msg": "Fizetések tábla telefonon: előbb a menü gördül ki, csak utána a tábla"
},
{
"id": "15fe73b57f",
"at": "2026-11-17T15:42:03+02:00",
"msg": "Fizetések tábla telefonon (álló és fekvő): a felső rész fokozatosan, a görgetéssel együtt tűnik el / jön vissza"
},
{
"id": "dc91fbc72b",
"at": "2026-11-17T15:40:22+02:00",
"msg": "Fekvő telefon, Fizetések: a felső rész ténylegesen eltűnik lefelé görgetéskor"
},
{
"id": "1b23e40f6b",
"at": "2026-11-17T15:38:29+02:00",
"msg": "Fekvő telefon, Fizetések: lefelé görgetve a felső rész eltűnik, csak a tábla fejléce marad"
},
{
"id": "293c917298",
"at": "2026-11-17T15:37:27+02:00",
"msg": "Tagi kölcsön tételek nem törölhetők"
},
{
"id": "dfd2d9cfa7",
"at": "2026-11-17T15:34:24+02:00",
"msg": "Fekvő telefon, Fizetések: nincs üres sáv a tábla alatt"
},
{
"id": "ec209a9ac9",
"at": "2026-11-17T15:32:56+02:00",
"msg": "Táblázatok: nincs lefelé húzás / rugózás"
},
{
"id": "d35312a1ed",
"at": "2026-11-17T15:27:55+02:00",
"msg": "Fekvő telefon: a felugró ablak háttere a teljes tartalom mögött ott van"
},
{
"id": "a9756ff8d8",
"at": "2026-11-17T15:26:38+02:00",
"msg": "Fizetések tábla: forgatáskor újraszámolt oszlopok"
},
{
"id": "44bb94eb26",
"at": "2026-11-17T15:26:20+02:00",
"msg": "Fizetések tábla: helyes táblaszélesség (a projektnév oszlop nem nyúlik ki)"
},
{
"id": "5691a14e5a",
"at": "2026-11-17T15:26:01+02:00",
"msg": "Fizetések tábla: az oszlopszélességek ténylegesen érvényesülnek (rögzített táblaszélesség)"
},
{
"id": "473d2048e5",
"at": "2026-11-17T15:25:42+02:00",
"msg": "Táblázatból nincs lehúzásos frissítés"
},
{
"id": "0563de59c8",
"at": "2026-11-17T15:24:09+02:00",
"msg": "Fizetések: húzással nem vált hónapot, csak a gombokkal"
},
{
"id": "bd6929578b",
"at": "2026-11-17T15:23:27+02:00",
"msg": "Fizetések tábla: keskenyebb projektnév-oszlop, a munkatárs-oszlop a legszélesebb összeghez igazodik, a Projekt neve fejléc rögzítve; iPhone: a felugró ablak a látható területhez igazodik"
},
{
"id": "c9360512d5",
"at": "2026-11-17T15:19:25+02:00",
"msg": "Fekvő telefon: szélesebb menüsáv"
},
{
"id": "d41911fe1c",
"at": "2026-11-17T15:15:19+02:00",
"msg": "Ajánlat-néző: görgetés után nem ugrik vissza; forgatáskor újra a szélességhez igazodik"
},
{
"id": "a68b70ef32",
"at": "2026-11-17T15:13:48+02:00",
"msg": "Lebegő Kilépés gomb: átlátszóbb háttér"
},
{
"id": "c2c5d2eab9",
"at": "2026-11-17T15:11:54+02:00",
"msg": "Teljes képernyő: lebegő Kilépés gomb, gombsáv nélkül"
},
{
"id": "c699288551",
"at": "2026-11-17T15:09:56+02:00",
"msg": "Betöltés-jelző szélesebb, a projektnév nem törik"
},
{
"id": "54227435dd",
"at": "2026-11-17T15:09:14+02:00",
"msg": "Ajánlat-néző: teljes képernyő gomb"
},
{
"id": "16e89b513f",
"at": "2026-11-17T15:07:21+02:00",
"msg": "Ajánlat-néző fekvő telefonon: oldalsó szélek nélkül"
},
{
"id": "ac3c1729b9",
"at": "2026-11-17T15:05:23+02:00",
"msg": "Ajánlat-néző telefonon: fejléc és gombsor fix, csak az ajánlat görget / nagyítódik"
},
{
"id": "284d8e39f2",
"at": "2026-11-17T15:04:43+02:00",
"msg": "Ajánlat-néző telefonon: gombsor a képernyő alján, nincs üres sáv alatta"
},
{
"id": "8c003a2100",
"at": "2026-11-17T15:04:10+02:00",
"msg": "Folyamatjelzés: két sorban (művelet, alatta a címe)"
},
{
"id": "f431af76a4",
"at": "2026-11-17T15:01:45+02:00",
"msg": "Ajánlat-néző: kompakt fejléc"
},
{
"id": "672b209b7f",
"at": "2026-11-17T15:00:43+02:00",
"msg": "Értékesítés: cím nélkül, kisebb távolság a gombsor körül"
},
{
"id": "f25dc5ea4d",
"at": "2026-11-17T14:59:34+02:00",
"msg": "Ajánlat-néző fekvő telefonon: mint állóban"
},
{
"id": "610217c717",
"at": "2026-11-17T12:59:07Z",
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
