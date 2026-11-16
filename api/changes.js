// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "bbdf2d94f8",
"at": "2026-11-16T21:48:34+02:00",
"msg": "Projekt Részletek (előzmények): csak az ügyvezetőnek"
},
{
"id": "c38f88a2bb",
"at": "2026-11-16T21:46:52+02:00",
"msg": "Előfoglalás sáv: a magyarázó szöveg csak az ügyvezetőnek"
},
{
"id": "cc3ea48a68",
"at": "2026-11-16T21:46:30+02:00",
"msg": "Előfoglalás sáv: termelési vezetőnél az értékesítési állapot nélkül"
},
{
"id": "c5134d6807",
"at": "2026-11-16T21:44:55+02:00",
"msg": "Kanban: a nyersanyagra váró (szürke) kártyák nem jelölhetők ki, a Mind kijelölése gomb sem jelenik meg hozzájuk"
},
{
"id": "b528d94770",
"at": "2026-11-16T21:44:28+02:00",
"msg": "Szakember kifizetései: a még el nem fogadott meghívás díja ⏳-val látszik, az összegbe nem számít; a meghívás-válasz gombok rendezett, egysoros sávban"
},
{
"id": "8d4bfda108",
"at": "2026-11-16T21:41:49+02:00",
"msg": "Előfoglalás: projekt összekötése nyitott lehetőséggel (tárgyalás alatt) – csendes figyelmeztetések, számlázás a szerződés után, csíkozott megjelenés, szerződéskor ez válik élessé, elveszett lehetőségnél lemondás felajánlása; felszerelési figyelmeztetések 30 nappal előtte"
},
{
"id": "ef1c235fd0",
"at": "2026-11-16T21:31:29+02:00",
"msg": "Stábkártya: kompakt, egységes meghívó-állapotcímkék"
},
{
"id": "d9dc1d78b3",
"at": "2026-11-16T21:29:59+02:00",
"msg": "Névjegy: a Megosztás gomb csak ott jelenik meg, ahol a böngésző fájlt tud megosztani; hiba esetén letöltés"
},
{
"id": "031ef1a010",
"at": "2026-11-16T21:29:07+02:00",
"msg": "Vissza-lépés a Tervezésre megszüntetve; az Utómunkára vár kártyái a nyersanyag feltöltéséig szürkék és nem mozdíthatók"
},
{
"id": "ef6aa2e5ef",
"at": "2026-11-16T21:26:34+02:00",
"msg": "Lépések: ha a forgatás még előttünk van, a Tervezés kártyára kattintva vissza lehet lépni"
},
{
"id": "f580545f6b",
"at": "2026-11-16T21:22:24+02:00",
"msg": "Kifizetések: szélesebb személy-oszlop, a függő összeg nem lóg át a cellahatáron"
},
{
"id": "5b1c684c71",
"at": "2026-11-16T21:21:56+02:00",
"msg": "Idővonal húzás: a forrássor ugyanazzal a szelektorral"
},
{
"id": "4fd49d71c4",
"at": "2026-11-16T21:21:44+02:00",
"msg": "Idővonal: a sáv csak a saját sorában húzható (más szakember sorára nem dobható)"
},
{
"id": "af5facd4d6",
"at": "2026-11-16T21:19:36+02:00",
"msg": "Szervezői jutalék levonása: csak a ±1 napon belüli projektek"
},
{
"id": "860a841c3d",
"at": "2026-11-16T21:18:22+02:00",
"msg": "Végszámla-eltérés: a szervezői jutalék levonása (és a beszámított projektek) nem számít hibának, magyarázó jelzést kap"
},
{
"id": "20f7bebba3",
"at": "2026-11-16T21:15:40+02:00",
"msg": "⌘/Ctrl+Enter szövegdobozban a saját küldőgombot nyomja (Hozzáadás/Küldés), nem az ablak fő gombját"
},
{
"id": "536b2d7b88",
"at": "2026-11-16T21:15:13+02:00",
"msg": "CLAUDE.md: szövegmegőrzési szabály"
},
{
"id": "b0d2d40830",
"at": "2026-11-16T21:14:51+02:00",
"msg": "Általános szabály: a szövegdobozokba írt, el nem küldött szöveg megmarad (ablakváltás, újratöltés után is); küldés után törlődik"
},
{
"id": "e562a84150",
"at": "2026-11-16T21:04:23+02:00",
"msg": "Kézi kifizetett-jelölés: a számlázz.hu-ban is rögzíti a jóváírást (Számla Agent kifizetés)"
},
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
"id": "367a194965",
"at": "2026-11-16T16:29:20Z",
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
