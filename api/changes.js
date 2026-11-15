// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "080105c17a",
"at": "2026-11-15T13:45:17+02:00",
"msg": "Fizetések: számla-jelölés egy sorban, alacsonyabb sor"
},
{
"id": "89ec243e8b",
"at": "2026-11-15T13:44:26+02:00",
"msg": "Teljesítmény: súgó a cellákon – kik és mennyi van a számok mögött (lehetőségek, ajánlatok, szerződések, befolyt számlák)"
},
{
"id": "45150f8851",
"at": "2026-11-15T13:41:36+02:00",
"msg": "Teljesítmény: HubSpot-felhasználó párosítása név alapján is (pl. „Ervin Egri” = „Egri Ervin”)"
},
{
"id": "69423af953",
"at": "2026-11-15T13:29:41+02:00",
"msg": "Árajánlat a bejelentkezett felhasználó nevében és aláírásával; HubSpot: tulajdonos-lista hiánya nem állítja meg a szinkront, friss hibajelzés"
},
{
"id": "58f63f02d7",
"at": "2026-11-15T13:27:20+02:00",
"msg": "HubSpot: meglévő deal párosítása (név, kapcsolattartó / cég dealjei) – nincs duplikálás; meglévő dealnél csak összeg, dátum és lezárás frissül"
},
{
"id": "37a34f2161",
"at": "2026-11-15T13:20:07+02:00",
"msg": "Egri Ervin duplikált munkatárs-sorának egyszeri összevonása (minden hivatkozás átírva)"
},
{
"id": "cef16d4994",
"at": "2026-11-15T13:15:25+02:00",
"msg": "Teljesítmény panel: a HubSpot-visszaírás utolsó hibája (ügyvezetőnek)"
},
{
"id": "2392693404",
"at": "2026-11-15T13:13:30+02:00",
"msg": "HubSpot visszaírás: lehetőség → deal (érték, dátum, szakasz, tulajdonos, kapcsolattartó és cég társítva); új / módosított ügyfél → HubSpot cég és kapcsolattartó"
},
{
"id": "f53beaad57",
"at": "2026-11-15T13:11:36+02:00",
"msg": "Teljesítmény panel: tesztkörnyezetben nincs háttérhívás"
},
{
"id": "04a95ea8c7",
"at": "2026-11-15T13:11:18+02:00",
"msg": "Értékesítés: Teljesítmény panel – HubSpot-aktivitás (hívás, megbeszélés, e-mail, új kontakt), megkeresés, ajánlat, szerződés, befolyt díj, jutalék értékesítőnként"
},
{
"id": "4279be7439",
"at": "2026-11-15T13:09:52+02:00",
"msg": "Projekt értékesítő-választó: Ervin csak egyszer (az ügyvezető felhasználó = saját munkatárs-sora), névismétlődés kiszűrve"
},
{
"id": "4c526d0869",
"at": "2026-11-15T11:03:39Z",
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
