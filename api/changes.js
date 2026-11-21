// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "9936c093ab",
"at": "2026-11-21T09:28:42+01:00",
"msg": "Azonnali módosítások visszaugrás nélkül (függő műveletek helyi listája, minden beérkező adatra ráírva, frissítés után újraküldve); havi keret: maradék az e havi tételek után"
},
{
"id": "108326685f",
"at": "2026-11-21T09:23:58+01:00",
"msg": "Videótábla: ⭐ Értékelés oszlop a Jóváhagyva után – kézi értékeléskérés átnézhető levéllel"
},
{
"id": "c5a23bd984",
"at": "2026-11-21T09:22:23+01:00",
"msg": "Bejövő számlák: Rezsi / Marketing / Elvetés azonnal eltűnik, a mentés a háttérben fut"
},
{
"id": "b3a80aa486",
"at": "2026-11-21T09:20:24+01:00",
"msg": "Bejövő számla elvetése: azonnal eltűnik, a mentés a háttérben fut (hibánál visszakerül)"
},
{
"id": "c330219a6d",
"at": "2026-11-21T09:17:28+01:00",
"msg": "Jóváhagyó oldal: az értékelés-doboz nem jelenik meg, ha az ügyfél már értékelt vagy már rákattintott"
},
{
"id": "eae57281f4",
"at": "2026-11-21T09:17:09+01:00",
"msg": "Jóváhagyó oldal: a „Még nem nézted végig” kérdés az üzenetmező előtt jön"
},
{
"id": "2b3fbc9172",
"at": "2026-11-21T09:10:33+01:00",
"msg": "Szöveghossz: minden szövegmező a háttér határánál azonnal megáll és szól (hiányzó és eltérő maxlength-ek pótolva)"
},
{
"id": "0d04800d1d",
"at": "2026-11-21T08:35:45+01:00",
"msg": "Általános szabály: a beírt szöveget soha nem vágjuk le csendben – a háttér hibát ad, a felület megállítja az írást és a túl hosszú beillesztést"
},
{
"id": "0686e708d0",
"at": "2026-11-21T08:32:19+01:00",
"msg": "Google-értékeléskérő e-mailek végleges kikapcsolása (Ervin kérése)"
},
{
"id": "168f77f73e",
"at": "2026-11-21T08:25:26+01:00",
"msg": "Videó: a leadási / ellenőrzési megjegyzés 1000 helyett 6000 karakterig (eddig levágta)"
},
{
"id": "b20a58c75a",
"at": "2026-11-21T08:21:53+01:00",
"msg": "Értékeléskérés: csak a mai naptól átadott projekteknél (régi projekteknek utólag nem megy), legfeljebb 14 napig"
},
{
"id": "3688d82374",
"at": "2026-11-20T23:03:42+01:00",
"msg": "Google-értékelések: az értékelés eredeti szövege a fordítás helyett (eddig kimaradt)"
},
{
"id": "feb0c88ae4",
"at": "2026-11-20T23:02:33+01:00",
"msg": "Google-értékelések: panel helyett gomb az Új szerződés mellett, ablakban nyílik"
},
{
"id": "8222f6b5ac",
"at": "2026-11-20T22:55:29+01:00",
"msg": "Google-értékelések: a titkos kulcs az appból is beállítható"
},
{
"id": "21854c9597",
"at": "2026-11-20T22:50:25+01:00",
"msg": "Helyszíni munkára lépés: a bejelentkezett vezető saját beosztása elfogadottnak számít (és a háttérben rögzül)"
},
{
"id": "7e21a28620",
"at": "2026-11-20T22:46:04+01:00",
"msg": "Google-értékelések: Cégprofil összekötése, napi behúzás, ügyfélhez párosítás, válasz az appból; értékelt ügyfélnek nem megy emlékeztető"
},
{
"id": "a3d141b4d1",
"at": "2026-11-20T19:44:06+01:00",
"msg": "Értékesítés: áthúzáskor „Lehetőség → Oszlop” üzenet"
},
{
"id": "86745ea3d2",
"at": "2026-11-20T19:43:23+01:00",
"msg": "Értékesítés: kilógó megjegyzés törlése a jutalékcsempe alól"
},
{
"id": "a616b46f80",
"at": "2026-11-20T19:38:09+01:00",
"msg": "Árajánlat: kikapcsolható Összesen sor (pl. napidíjas ajánlatnál)"
},
{
"id": "b075749aec",
"at": "2026-11-20T19:10:42+01:00",
"msg": "HubSpot kétirányú ügyfélszinkron: mentéskor frissíti a céget és kapcsolattartót, óránként visszahúzza a változásokat, HubSpot ↗ gomb és frissítésjelzés"
},
{
"id": "c415864f46",
"at": "2026-11-20T16:39:11+01:00",
"msg": "Leltár: a sorok kattinthatók (megnyitják az eszköz adatlapját)"
},
{
"id": "710ddb2900",
"at": "2026-11-20T16:38:32+01:00",
"msg": "Stáb lista: a megszűnt (átnevezett) szerepre beragadt szűrő törlődik – pl. Statiszta → Szereplő"
},
{
"id": "f1c753af94",
"at": "2026-11-20T16:38:05+01:00",
"msg": "Munkatárs / eszköz adatlap: meglévő elemnél zárolva nyílik, a 🔒 Szerkesztés gombbal oldható fel (a dokumentumok zárolva is kezelhetők)"
},
{
"id": "cfae39d4b0",
"at": "2026-11-20T16:33:42+01:00",
"msg": "Szereplő (statiszta, modell, beszélő szereplő): Szereplői keretszerződés, Szereplők fül és szerep; a régi Statiszta szerep automatikusan Szereplő lesz"
},
{
"id": "d725e9beeb",
"at": "2026-11-20T16:20:29+01:00",
"msg": "Keretszerződés: a Word-letöltés csak a küldő ablakban; a székhely betöltése látható (animált mező), sikertelen keresésnél jelzi"
},
{
"id": "02a4bf83de",
"at": "2026-11-20T16:17:44+01:00",
"msg": "Munkatárs űrlap: a 🔍 (cégnév betöltése) az adószám mezőnél"
},
{
"id": "e632b9e50d",
"at": "2026-11-20T16:00:03+01:00",
"msg": "Naptár: a projekthez egyértelműen illeszkedő, kézzel felvett vágói naptárbejegyzés nem jelenik meg külön (duplikátum)"
},
{
"id": "e848620937",
"at": "2026-11-20T15:59:15+01:00",
"msg": "Pozíció levételekor a Szolgáltatásoknál a hozzá tartozó feladat (pl. terem-operatőr) is lekerül a szakemberről"
},
{
"id": "00312d44d1",
"at": "2026-11-20T15:55:51+01:00",
"msg": "Projekt videótábla: alapból csukva; az oszlopok nem görgetnek külön, az egész oldal görget"
},
{
"id": "fd7a35dc33",
"at": "2026-11-20T15:53:09+01:00",
"msg": "Projekt: a Szolgáltatások panel is összecsukható"
},
{
"id": "09ae432bfe",
"at": "2026-11-20T14:52:18Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
