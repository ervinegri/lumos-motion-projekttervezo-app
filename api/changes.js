// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "ee97fc08da",
"at": "2026-11-20T15:52:06+01:00",
"msg": "Stábkártya: hosszú pozícióneveknél (pl. Key Account Manager) rövid címke, hogy a × látszódjon"
},
{
"id": "a951f205f6",
"at": "2026-11-20T15:50:50+01:00",
"msg": "Lezajlott projektnél is levehető egy-egy pozíció (×, megerősítéssel)"
},
{
"id": "13812b28de",
"at": "2026-11-20T15:48:55+01:00",
"msg": "Új pozíció ablak: a pozíciólista azonnal lenyílik"
},
{
"id": "7a5416bb40",
"at": "2026-11-20T15:44:36+01:00",
"msg": "Új szerep / pozíció: Key Account Manager"
},
{
"id": "5818802ee6",
"at": "2026-11-20T15:44:00+01:00",
"msg": "Új pozíció: projektvezető csak akkor választható, ha még nincs"
},
{
"id": "397dae9ae0",
"at": "2026-11-20T15:43:46+01:00",
"msg": "Stábkártya ⚙️: Új pozíció hozzáadása ugyanannak a munkatársnak"
},
{
"id": "0d7eab401a",
"at": "2026-11-20T15:42:14+01:00",
"msg": "Munkatárs űrlap: a vállalkozás neve és az adószám a termelési vezetőnél is szerkeszthető"
},
{
"id": "28ec95aa3c",
"at": "2026-11-20T15:40:00+01:00",
"msg": "Számla-levél: tegező szöveg (Kedves keresztnév / Sziasztok), a nettó összeg is benne van"
},
{
"id": "3b3fcfc041",
"at": "2026-11-20T15:36:25+01:00",
"msg": "Statiszta keretszerződés: a Projekttervező említése kivéve (e-mail / üzenet)"
},
{
"id": "b111465384",
"at": "2026-11-20T15:35:34+01:00",
"msg": "Javítás: Szerződés és számlázás oldal betöltési hiba (különbözet-doboz hozzáfűzése)"
},
{
"id": "deba3cc7ab",
"at": "2026-11-20T15:28:56+01:00",
"msg": "Számlázás: ha a kiszámlázott nettó összeg eltér a projekt értékétől (pl. utólag megemelt érték), nem 'Lezárva' – Kiszámlázatlan / Túlszámlázva jelzés, számla a különbözetre gomb, figyelmeztetés"
},
{
"id": "ca439f2689",
"at": "2026-11-20T15:26:41+01:00",
"msg": "Elfogadott beosztás: pozíció levétele megerősítéssel + automatikus e-mail a szakembernek; az utolsó pozíciónál lemondás-figyelmeztetés (2.7., 7 napon belül 50% lemondási díj egyéb költségként)"
},
{
"id": "1f877fcbf6",
"at": "2026-11-20T15:21:53+01:00",
"msg": "Saját beosztás: a pozíciók levehetők (nem zárolja az elfogadott meghívás)"
},
{
"id": "46b36bfb8d",
"at": "2026-11-20T14:19:41Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
