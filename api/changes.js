// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "a2df884eed",
"at": "2026-11-17T16:20:59+02:00",
"msg": "Naptár idővonala telefonon: háttérfrissítéskor a görgetés és az eltüntetett menü megmarad (mint a Fizetéseknél)"
},
{
"id": "bb6f52499c",
"at": "2026-11-17T16:19:26+02:00",
"msg": "Naptár idővonala telefonon: a Fizetésekhez hasonlóan görgetéskor eltűnik a menü (egyetlen natív görgetés)"
},
{
"id": "34a007d22f",
"at": "2026-11-17T16:11:20+02:00",
"msg": "Projekt Pénzügyek: a Levonások kártya nem nyújtja 600 px magasra a sort"
},
{
"id": "cce7f93b18",
"at": "2026-11-17T16:01:55+02:00",
"msg": "Gépen újra görgethető az oldal a táblák fölött (a rugózás-tiltás csak telefonon)"
},
{
"id": "aaffeb20f4",
"at": "2026-11-17T16:01:07+02:00",
"msg": "számlázz.hu adatkapcsolat: a generált kulcs legfeljebb 40 karakter (35 + LUMPT)"
},
{
"id": "68208a50a1",
"at": "2026-11-17T16:00:25+02:00",
"msg": "számlázz.hu adatkapcsolat válasz: az alap/id csak egész számként (XSD szerint)"
},
{
"id": "558b9d92c6",
"at": "2026-11-17T15:59:06+02:00",
"msg": "Fizetések tábla: az oszlopszélesség a szöveg tényleges szélességéből (nem nő újrarajzolásonként)"
},
{
"id": "21ec03dfee",
"at": "2026-11-17T15:57:43+02:00",
"msg": "Fizetések fejléce: egyforma hézagok, a NAV és a Díjösszesítő gomb a hónapváltóval egyező méretű"
},
{
"id": "2924d95800",
"at": "2026-11-17T15:56:45+02:00",
"msg": "Fizetések tábla telefonon: betöltéskor a menüsáv a tábla görgetési helyzetéhez igazodik (nem marad félig felcsúszva)"
},
{
"id": "485557ff2f",
"at": "2026-11-17T15:55:50+02:00",
"msg": "Fizetések tábla telefonon: kisebb hézagok az altabok körül"
},
{
"id": "b2be6e0187",
"at": "2026-11-17T15:53:55+02:00",
"msg": "Meghívás-figyelmeztetés: a hiányzó nevek külön sorban"
},
{
"id": "ad2f30803c",
"at": "2026-11-17T15:53:34+02:00",
"msg": "Fizetések tábla telefonon: egyetlen natív görgetés (a fejléc a tábla fölött görget ki, a menüsáv eltolással) – nincs akadás lendületnél"
},
{
"id": "a9f09a974a",
"at": "2026-11-17T15:49:23+02:00",
"msg": "Fizetések tábla: háttérfrissítéskor nem ugrik vissza a tetejére (görgetés és a felső rész állapota megmarad)"
},
{
"id": "8ed380df58",
"at": "2026-11-17T15:47:24+02:00",
"msg": "Fizetések tábla: az oszlopszélesség az összesítő sor (nagyobb, vastagabb) összegeivel is számol"
},
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
"id": "81d3d1f17f",
"at": "2026-11-17T13:23:39Z",
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
