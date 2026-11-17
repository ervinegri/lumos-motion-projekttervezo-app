// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "4ac6506ff8",
"at": "2026-11-17T22:16:53+02:00",
"msg": "Küldés az ügyfélnek: a mentett mintában ragadt korábbi videónév (tárgyban is) az aktuális videóra cserélődik"
},
{
"id": "d693942fc9",
"at": "2026-11-17T22:11:49+02:00",
"msg": "Projekt Pénzügyek: a Levonások után kártya új sorban"
},
{
"id": "19a359f91d",
"at": "2026-11-17T17:06:51+02:00",
"msg": "Tablet: Szerződés és számlázás, Bevétel és kiadás fejléce is egy sorban"
},
{
"id": "366d182d8e",
"at": "2026-11-17T17:05:08+02:00",
"msg": "Tablet: minden táblázat a képernyő széléig ér, a projekt neve oszlop oldalra görgetéskor a helyén marad"
},
{
"id": "846966a99f",
"at": "2026-11-17T17:04:21+02:00",
"msg": "Fizetési állapot: a díjbekérő és a belőle készült előlegszámla egy befizetésnek számít (nem lesz tévesen „Teljes fizetve”)"
},
{
"id": "cb3b1d7607",
"at": "2026-11-17T17:02:14+02:00",
"msg": "Tablet, Fizetések: újra görgethető fel-le (a rugózás-elnyelés csak függőlegesen görgető táblán)"
},
{
"id": "3f8355ae58",
"at": "2026-11-17T17:01:14+02:00",
"msg": "Projekt Pénzügyek kártyák tableten: a mezők nem lógnak ki, a kártyák tördelődnek"
},
{
"id": "e7ea05fd7a",
"at": "2026-11-17T16:59:39+02:00",
"msg": "Tablet, Fizetések: a fejléc egy sora kifér 768 px-en is"
},
{
"id": "6cbdd6755d",
"at": "2026-11-17T16:58:08+02:00",
"msg": "Tablet, Fizetések: altabok és hónapváltó egy sorban, a tábla a képernyő széléig"
},
{
"id": "26664af9dc",
"at": "2026-11-17T16:54:54+02:00",
"msg": "Projekt pénzügyek: új tételtípus – ⛽ Saját költség (pl. tankolás): a teljes összegből vonódik le, nem kerül a számlára; a Bevétel és kiadás lebontásában külön sor"
},
{
"id": "e15793c785",
"at": "2026-11-17T16:46:27+02:00",
"msg": "Fizetések tábla: a fejléc a tábla keretének tetejéhez tapad (nincs üres sáv fölötte tableten/gépen)"
},
{
"id": "bde87972ce",
"at": "2026-11-17T16:44:57+02:00",
"msg": "Értékesítés fejléce: tableten is egy sor, egységes gombméret"
},
{
"id": "6da336c75c",
"at": "2026-11-17T16:42:49+02:00",
"msg": "Fizetések tábla: a Projekt neve fejléc ugyanabban a sorban, mint a nevek (tablet/gép)"
},
{
"id": "c507ae2409",
"at": "2026-11-17T16:41:21+02:00",
"msg": "Fizetések tábla: oszlopszélesség-számítás hibájának javítása (névütközés miatt leállt)"
},
{
"id": "b60ade295d",
"at": "2026-11-17T16:40:33+02:00",
"msg": "Értékesítés: a hónapváltó és a fő gombok egy sorban"
},
{
"id": "129e90e399",
"at": "2026-11-17T16:39:51+02:00",
"msg": "Tablet/telefon: az oldal nem kicsinyedhet le (minimum-scale=1)"
},
{
"id": "9c961e0bb3",
"at": "2026-11-17T16:39:05+02:00",
"msg": "Tablet: a széles Fizetések tábla nem tolja ki oldalra az egész oldalt"
},
{
"id": "e9bb216891",
"at": "2026-11-17T16:38:35+02:00",
"msg": "Érintőképernyőn az oldal nem húzható oldalra"
},
{
"id": "3d375cfe6f",
"at": "2026-11-17T16:37:58+02:00",
"msg": "Tablet: a menü a logó sorában (egyetlen fejlécsáv)"
},
{
"id": "64e3e09cb1",
"at": "2026-11-17T16:31:14+02:00",
"msg": "Ügyfél-visszaigazoló levél: nincs „válaszolj erre a levélre” sor, „döntéseidet” szó törölve"
},
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
"id": "793f45bca3",
"at": "2026-11-17T13:54:04Z",
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
