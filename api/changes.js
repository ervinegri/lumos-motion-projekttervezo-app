// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "8330f76bb4",
"at": "2026-11-15T15:25:35+02:00",
"msg": "Értékesítés: a szerződött projekt és jutalék a szerződéskötés hónapjához számít"
},
{
"id": "1f2f2c8105",
"at": "2026-11-15T15:19:28+02:00",
"msg": "Saját meghívásaim: csak a megválaszolatlan meghívások látszanak; állapot-címke igazítva"
},
{
"id": "7cb807804c",
"at": "2026-11-15T15:10:39+02:00",
"msg": "Értékesítés: a jutalék-csempe súgója felsorolja a projekteket, amelyekből a jutalék származik"
},
{
"id": "29ff1aa636",
"at": "2026-11-15T15:08:40+02:00",
"msg": "HubSpot-dealek egyszeri áthozatala lehetőségként (nyitott + elveszett; a megnyertek kimaradnak, a tulajdonos marad)"
},
{
"id": "68d55e549f",
"at": "2026-11-15T15:07:08+02:00",
"msg": "Meghívás-visszajelzés: tömör levél – ki, vállalta-e, szerep (projektvezető is), időpont"
},
{
"id": "ddb298721d",
"at": "2026-11-15T15:03:35+02:00",
"msg": "HubSpot: dealek nem jönnek létre / nem módosulnak (a lehetőség gazdája az app); csak kapcsolattartó és cég szinkron"
},
{
"id": "0767da89d9",
"at": "2026-11-15T13:55:44+02:00",
"msg": "Teljesítmény: csak értékesítők + az ügyvezető (külön sorban, alul); Guzsloványi Flóra: Értékesítő → Ajánlói jutalék (egyszeri)"
},
{
"id": "b403701501",
"at": "2026-11-15T13:53:14+02:00",
"msg": "Fizetések: számla kiállítása csak kiküldött díjösszesítő után (felület + háttér), kézi jelölés visszavonható; NAV-számla: rámutatáskor kis ablak a két művelettel, a számlaszám nem vágódik le"
},
{
"id": "9ef975f922",
"at": "2026-11-15T13:50:29+02:00",
"msg": "Fizetések: 🔄 és ✕ csak rámutatáskor, lebegve"
},
{
"id": "e3ac2cb648",
"at": "2026-11-15T13:47:14+02:00",
"msg": "HubSpot: a cég mindig friss kereséssel (nem a régi párosításból)"
},
{
"id": "50dc347a81",
"at": "2026-11-15T13:46:52+02:00",
"msg": "Fizetések: számla-jelölés két sorban (dátum + számlaszám), ikonok mellette; HubSpot: hasonló nevű / azonos domainű cég újrahasznosítása, deal társítása létrehozáskor, társítási hiba jelzése"
},
{
"id": "f5c767ecb8",
"at": "2026-11-15T11:45:26Z",
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
