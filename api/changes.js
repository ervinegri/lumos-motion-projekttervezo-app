// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "dc4109eca9",
"at": "2026-11-16T11:12:41+02:00",
"msg": "Projektlista: 3-nál több videó összecsukva, stádium-összesítővel, lenyitható"
},
{
"id": "19a465a9b1",
"at": "2026-11-16T11:12:07+02:00",
"msg": "Nem fizetős projekt: teljes Extrák menü; fizetős tétel választásakor újra fizetős lesz"
},
{
"id": "5cabcd3164",
"at": "2026-11-16T11:10:34+02:00",
"msg": "Nem fizetős projekt: az ajánlói jutalék is az Extrák menüből, mint a fizetősnél"
},
{
"id": "8fa966ac98",
"at": "2026-11-16T11:06:46+02:00",
"msg": "Projektlista: videók tételesen a stádiumukkal; Szerződés és Termelés kártya azonos magasságú"
},
{
"id": "398232deed",
"at": "2026-11-16T11:04:04+02:00",
"msg": "Nyersanyag-, leadás- és TIG-levelek is a kolléga saját címéről (domainszintű küldés)"
},
{
"id": "bc0c6e2983",
"at": "2026-11-16T10:59:48+02:00",
"msg": "Projektek: „Lezárt projektek” lenyitható csoport; háttér: szintaxis-ellenőrzés a telepítés előtt, sikertelen telepítésről nincs GitHub-e-mail"
},
{
"id": "c9765a4086",
"at": "2026-11-16T10:57:14+02:00",
"msg": "HubSpot társítás javítás (szintaxis); díjmentes projekt: tiszta 🎁 jelölés a Szerződés kártyán"
},
{
"id": "7b8642afee",
"at": "2026-11-16T10:55:06+02:00",
"msg": "HubSpot: kapcsolattartó–cég társítás a batch/associate/default végponttal (HTTP 415 javítás)"
},
{
"id": "78127b15aa",
"at": "2026-11-16T09:26:04+02:00",
"msg": "Vercel: nincs build, ha csak háttér / teszt / Action / leírás változott (buildperc-spórolás)"
},
{
"id": "92cdde17b1",
"at": "2026-11-15T19:13:02+02:00",
"msg": "Pozíció-címkék finom pasztell színe szerepcsoportonként"
},
{
"id": "1c3d14c918",
"at": "2026-11-15T19:10:33+02:00",
"msg": "Pozíció-kártyák: a meghívó (állapota) minden kártyán látszik – egy meghívó szól az ember összes pozíciójára"
},
{
"id": "693f0b147b",
"at": "2026-11-15T19:09:08+02:00",
"msg": "Projekt: az ajánlói jutalék kikerül az Egyéb költségek táblából, az összege az Ajánlói jutalék dobozban adható meg"
},
{
"id": "48c74eeeb3",
"at": "2026-11-15T18:48:54+02:00",
"msg": "Stáb és eszközök: pozíció-kártyák – a pipált szolgáltatások adják a pozíciókat, betöltetlen pozíción választó; több pozíciónál az eszköz, jegyzet, meghívó az első kártyán, a vágói munkák a Vágó kártyán; + Pozíció hozzáadása"
},
{
"id": "1680d44bea",
"at": "2026-11-15T18:39:53+02:00",
"msg": "Bevételek: Ajánlói jutalék külön oszlopban (csak ha a hónapban van ilyen); Queen's Night ajánlói jutalék visszaállítva 60 000 Ft-ra, ha a téves javítás lefutott"
},
{
"id": "fc43d66813",
"at": "2026-11-15T18:30:20+02:00",
"msg": "Queen's Night Hungary: Zajácz Dávid ajánlói jutaléka 30 000 Ft (egyszeri javítás)"
},
{
"id": "2fc8c08003",
"at": "2026-11-15T17:58:03+02:00",
"msg": "Bevételek: gyors egymás utáni cellabeírások nem vesznek el (nincs újrarajzolás gépelés közben, csak az utolsó szerverválasz érvényes); projekt nélküli soroknál a munkadíj % is írható"
},
{
"id": "d0fad701f1",
"at": "2026-11-15T17:40:25+02:00",
"msg": "Bevételek: projekt nélküli tételeknél a munkadíj (Ft) és az értékesítési % ideiglenesen írható; az eszköz-rezsi igazodik"
},
{
"id": "86e83c0e43",
"at": "2026-11-15T17:38:00+02:00",
"msg": "2026. szeptember bevételei: értékesítés 0, Lurdy ügyeletek termelése 30 / 60 ezer (egyszeri javítás)"
},
{
"id": "228244022d",
"at": "2026-11-15T17:34:54+02:00",
"msg": "Projekt Pénzügyek: a nettó szerződött érték kártyán, az Értékesítés a Termelés előtt; értékesítő választásakor az Összeg és a Jutalék mező azonnal megjelenik (fókusz a %-on)"
},
{
"id": "d26cc37ded",
"at": "2026-11-15T17:17:49+02:00",
"msg": "Bevételek: nincs ceruza a projektnevek után, az értékesítési % itt nem írható és mindig %-kal látszik, cím + Párosítások + kereső egy sorban"
},
{
"id": "200a86a94c",
"at": "2026-11-15T15:48:03+02:00",
"msg": "Bevételek tábla: az oszlopszélességet a számok adják (fejléc tördelődik), a nevek nem törnek, nincs fölösleges vízszintes görgetés"
},
{
"id": "3e524eeb8e",
"at": "2026-11-15T15:46:31+02:00",
"msg": "Számlázás: bizonylat nélküli kintlévőség elöl; a szűrő-törlés link helyett a kijelölt csempe újrakattintása törli (kiemelve)"
},
{
"id": "66527c1763",
"at": "2026-11-15T15:45:49+02:00",
"msg": "Bevételek tábla: Továbbszámlázott és Szervezői jutalék a Díjazás után, csak ha a hónapban van ilyen tétel"
},
{
"id": "e1f4ddd516",
"at": "2026-11-15T15:43:40+02:00",
"msg": "Bevétel és kiadás: tömör összesítő csempék; a számlázás csempe-elrendezése nem hat a Bevétel fülre"
},
{
"id": "386c8b4a2b",
"at": "2026-11-15T15:42:44+02:00",
"msg": "Szerződés és számlázás: kintlévőség két csempén (bizonylattal / bizonylat nélkül, külön szűrővel), alacsonyabb csempék egy sorban"
},
{
"id": "c0ff13595a",
"at": "2026-11-15T15:39:19+02:00",
"msg": "Pénzügyek: kisebb hézag a menü, a fejsor és a táblázat között"
},
{
"id": "a8f1a3b412",
"at": "2026-11-15T15:37:25+02:00",
"msg": "Értékesítés: a hónap sötét gombként (mint a Pénzügyeknél), rákattintva a mai hónapra ugrik"
},
{
"id": "d455944fec",
"at": "2026-11-15T15:35:40+02:00",
"msg": "Javítás: a számla-visszavonás kezelője az ACT létrehozása után töltődik (különben a díjcsökkentés-modul vége nem futott); Elveszett oszlop becsukható; lehetőség ablak: Cég ↔ Másodlagos e-mail csere, Rendezvény típusa + Honnan jött egy sorban"
},
{
"id": "301636af10",
"at": "2026-11-15T15:32:49+02:00",
"msg": "Értékesítés: kifizetett díjbekérőnél annak hónapja számít a szerződött kártyákon (különben a szerződéskötés hónapja)"
},
{
"id": "b3dea2e9f5",
"at": "2026-11-15T13:25:44Z",
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
