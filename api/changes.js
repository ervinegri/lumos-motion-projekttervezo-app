// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "0c800cfdc4",
"at": "2026-11-16T20:56:31+02:00",
"msg": "Számla/díjbekérő: átutalásnál a közleményben a teljes sorszámot kérjük (megjegyzés + e-mail)"
},
{
"id": "ecc1241973",
"at": "2026-11-16T20:48:59+02:00",
"msg": "Kifizetések: elfogadott meghívásnál nincs pipa"
},
{
"id": "8eed714292",
"at": "2026-11-16T20:40:02+02:00",
"msg": "Kifizetések: az ügyvezető saját eladásának jutaléka is megjelenik a munkatárs-oszlopában"
},
{
"id": "e5d8fcaea3",
"at": "2026-11-16T20:34:59+02:00",
"msg": "Jutalék: a többi módosítással együtt a mentés-sávval mentődik (Mentés / ⌘S, Elvetésre visszaáll)"
},
{
"id": "68eb71e3e5",
"at": "2026-11-16T20:32:47+02:00",
"msg": "Jutalék mentési jelzés: csak ikon (tooltippel), nem lóg rá az Összeg feliratra"
},
{
"id": "ef4be887a7",
"at": "2026-11-16T20:31:58+02:00",
"msg": "Jutalék mező: látható mentési állapot (mentetlen / mentés… / mentve)"
},
{
"id": "3416432d07",
"at": "2026-11-16T18:52:17+02:00",
"msg": "Árajánlat: alapértelmezett érvényesség 20 nap"
},
{
"id": "a118573dd4",
"at": "2026-11-16T18:49:06+02:00",
"msg": "Árajánlat küldésekor az ajánlat nettó összege a lehetőség értéke lesz; egyszeri pótlás a korábban elküldött ajánlatokra"
},
{
"id": "3e79c189bb",
"at": "2026-11-16T18:39:42+02:00",
"msg": "Árajánlat e-mail: az érvényesség (napok) a levél szövegében is szerepel"
},
{
"id": "c7424825e7",
"at": "2026-11-16T18:36:58+02:00",
"msg": "Árajánlat: a rendezvény neve átírható (az ajánlaton, a tárgyban és a fájlnévben)"
},
{
"id": "58513cc853",
"at": "2026-11-16T18:31:45+02:00",
"msg": "Árajánlat küldése: a korábbi ügyfelek listája csak az ügyvezetőnek"
},
{
"id": "b1d17e630e",
"at": "2026-11-16T18:29:07+02:00",
"msg": "Árajánlat küldése: korábbi ügyfél is választható – új lehetőség az ügyfél adataival, utána az árajánlat"
},
{
"id": "10f7e07e8b",
"at": "2026-11-16T18:28:36+02:00",
"msg": "Előadásrögzítés: operatőr nélküli kamerás helyszín, üres kamerasor és szolgáltatás nélküli pozíció jelzése; az operatőr-választóban elöl a projekten lévők"
},
{
"id": "7056d7682d",
"at": "2026-11-16T18:07:04+02:00",
"msg": "Közös eszközök megszüntetve (a gazdátlan eszközök figyelmeztetésként látszanak); előadás-utómunkánál kamera- és eszközhiány jelzése"
},
{
"id": "e92dd4984f",
"at": "2026-11-16T18:02:44+02:00",
"msg": "Helyszínváltás-figyelmeztetés csak annak, aki az adott projekten a helyszínen van (remote vezető, otthonról vágó nem)"
},
{
"id": "0033e05d95",
"at": "2026-11-16T18:00:59+02:00",
"msg": "Kifizetések: összegcellák nem törnek és nem érnek a cellahatárra"
},
{
"id": "ab0cd4be9b",
"at": "2026-11-16T17:59:49+02:00",
"msg": "Kifizetések: a lábléc sorai (díjösszesítő, számla, egyenleg) is kiemelődnek"
},
{
"id": "30c333d6a1",
"at": "2026-11-16T17:58:57+02:00",
"msg": "Helyszíni értékesítő pozíció (az eladó értékesítő nem stábtag); egységes sárga sorkiemelés a Források, Ügyfelek, Kifizetések táblázatain"
},
{
"id": "402aab8830",
"at": "2026-11-16T17:55:42+02:00",
"msg": "Stáb kártyák: az értékesítő nem jelenik meg pozícióként (az Értékesítés részben szerepel)"
},
{
"id": "65b53f4dae",
"at": "2026-11-16T17:53:30+02:00",
"msg": "Kifizetések: meghívott (sárga ⏳), meg nem hívott (szürke ○) és elfogadott (zöld ✓) díjak megkülönböztetése, dőlt betű nélkül"
},
{
"id": "31e6c3b031",
"at": "2026-11-16T17:51:05+02:00",
"msg": "Vágási tábla: az előadásrögzítés utómunkái (előadások, összefoglaló, kivágások) is kártyát kapnak; egyszeri pótlás a nyitott projekteknél"
},
{
"id": "f27fe1bdfe",
"at": "2026-11-16T17:48:24+02:00",
"msg": "Meghívó: a nyersanyag napja teljes hónapnévvel („december 2., szerda”)"
},
{
"id": "fc304299d4",
"at": "2026-11-16T17:46:18+02:00",
"msg": "Meghívás: vasárnapra eső válaszadási határidő hétfő 18:00-ra tolódik"
},
{
"id": "36136621d0",
"at": "2026-11-16T17:40:18+02:00",
"msg": "Meghívás: saját magát (ügyvezető / termelési vezető) e-mail nélkül, elfogadottként rögzíti; határidő: a meghívás napja + 2 nap, 18:00"
},
{
"id": "44e4b58db4",
"at": "2026-11-16T17:35:26+02:00",
"msg": "Meghívás: a válaszadási határidő mindig 18:00 (2 nap után); „A nyersanyag ezen a napon kerül feltöltésre: …” (óra nélkül)"
},
{
"id": "88be5b28ae",
"at": "2026-11-16T17:32:29+02:00",
"msg": "Meghívás: válaszadási határidő 2 nap, a következő 12:00-ra vagy 18:00-ra kerekítve"
},
{
"id": "f30db84300",
"at": "2026-11-16T17:30:25+02:00",
"msg": "Meghívás: a válaszadási határidő 3 nap helyett 24 óra"
},
{
"id": "125112a9d3",
"at": "2026-11-16T17:28:37+02:00",
"msg": "Kifizetések (ügyvezető): az el nem fogadott / ki nem küldött meghívás díja halványan, ⏳ jellel látszik, és nem számít bele az összegekbe"
},
{
"id": "2a87c24146",
"at": "2026-11-16T17:21:14+02:00",
"msg": "Szakember nézet: jövőbeli projekt (és díja) csak meghívás után látszik, a Kifizetésekbe csak az elfogadott meghívás díja számít"
},
{
"id": "62fd80a6ab",
"at": "2026-11-16T16:42:09+02:00",
"msg": "Egyszeri rögzítés: szervezői jutalék a Longevity-rendezvény shortjainál (10 000 Ft/short), a Rippel short beszámítva a Longevity számlájába"
},
{
"id": "fe2f2c6911",
"at": "2026-11-16T14:41:10Z",
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
