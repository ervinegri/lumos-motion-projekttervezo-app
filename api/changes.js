// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "00de8d7723",
"at": "2026-11-21T22:12:30+01:00",
"msg": "Alapadatok zárolása meghívó után (időpont, helyszín…): Módosítás gombbal oldható, változáskor e-mail a meghívott stábnak"
},
{
"id": "453a5f92bc",
"at": "2026-11-21T22:07:32+01:00",
"msg": "Senkihez nem rendelt eszköz emberhez rendelhető a választóból (nem foglaltként számít, áthelyeződik)"
},
{
"id": "ce000403bc",
"at": "2026-11-21T22:04:01+01:00",
"msg": "Interjúsarok operatőr → Interjú operatőr (átnevezés + egyszeri adatjavítás); régi sima Operatőr a feladatából adódó típusra (kártyán és mentéskor)"
},
{
"id": "ef0286cb44",
"at": "2026-11-21T22:00:48+01:00",
"msg": "Nincs sima „Operatőr” szerepkör a projekten: mindig konkrét típus (kreatív / statív / interjúsarok); a csere nem kér újra elfogadást"
},
{
"id": "27541e3ffd",
"at": "2026-11-21T21:53:45+01:00",
"msg": "Meghívó-zár: műveletnév-ütközés javítása (svc-unlock → svc-lock-open)"
},
{
"id": "8d7eb09d12",
"at": "2026-11-21T21:51:09+01:00",
"msg": "Meghívó után zárolt feladatok: Utómunka / Terepi feladatok csak „Módosítás” után szerkeszthető, változáskor e-mail a szakembernek"
},
{
"id": "2395a38e95",
"at": "2026-11-21T21:46:34+01:00",
"msg": "Stábkártya: figyelmeztetés, ha terepi szerepkörű munkatársnak nincs terepi feladata (+ ugrás a Terepi feladatokhoz)"
},
{
"id": "0e44f80c74",
"at": "2026-11-21T21:33:11+01:00",
"msg": "Google-értékelések: napi önellenőrzés és önjavítás az azonnali értesítésnél, elakadás jelzése; új szabály a CLAUDE.md-ben (profi megoldás > gyors)"
},
{
"id": "7ef66d5107",
"at": "2026-11-21T21:28:50+01:00",
"msg": "Google-értékelések: a csengő percenként néz rá (az azonnali Google-értesítés után)"
},
{
"id": "ff3751bb01",
"at": "2026-11-21T21:12:46+01:00",
"msg": "Google-értékelések: azonnali értesítés (Pub/Sub → /api/gbp-push → Apps Script)"
},
{
"id": "66e0dffd00",
"at": "2026-11-21T21:07:36+01:00",
"msg": "Google-értékelések: óránkénti automatikus behúzás, megnyitáskor frissítés, új értékelés a csengőben + felugró értesítés"
},
{
"id": "32af1d1261",
"at": "2026-11-21T21:01:08+01:00",
"msg": "Google-értékelések: Frissítés gomb a fejlécben, visszajelzéssel"
},
{
"id": "6414687c93",
"at": "2026-11-21T18:16:46+01:00",
"msg": "Munkatárs dokumentumai: Drive-on meglévő fájl felvétele"
},
{
"id": "1f22027a36",
"at": "2026-11-21T18:14:31+01:00",
"msg": "Szerződés-feltöltés: zárolt adatlapon is működik, nagy fájlnál jelzi, hogy tovább tart"
},
{
"id": "3ce7d74017",
"at": "2026-11-21T18:11:02+01:00",
"msg": "Zárolt adatlap: a nem szerkeszthető választók nem kattinthatók és nem úgy is néznek ki"
},
{
"id": "97e6cee460",
"at": "2026-11-21T18:08:07+01:00",
"msg": "Feltöltés: a fájlok mérethatára 10 helyett 30 MB"
},
{
"id": "ec442d4877",
"at": "2026-11-21T17:00:17+01:00",
"msg": "Videó: korábbi verzió törölhető (ügyvezető, termelési vezető) – pl. próbából bent maradt fájl"
},
{
"id": "c286725ba3",
"at": "2026-11-21T11:03:49+01:00",
"msg": "Ellenőrzés: bejövő számlák beérkezési késése"
},
{
"id": "9bb38dd268",
"at": "2026-11-21T11:01:05+01:00",
"msg": "Ellenőrzés: bejövő számlák PDF-elérhetősége"
},
{
"id": "4edc2a0bce",
"at": "2026-11-21T10:26:51+01:00",
"msg": "Ellenőrzés (csak olvasás): NAV-ból párosított szakemberszámlák vs. számlázz.hu bejövő bizonylatok"
},
{
"id": "05e4f5fd79",
"at": "2026-11-21T10:24:42+01:00",
"msg": "Felület: „pozíció” helyett „szerepkör” mindenhol"
},
{
"id": "3ae91de496",
"at": "2026-11-21T10:23:54+01:00",
"msg": "Stáb: eszközök visszazárása újraküldés nélkül; ⚙️ menüben „Pozíció eltávolítása”"
},
{
"id": "33a560324d",
"at": "2026-11-21T10:22:10+01:00",
"msg": "Jóváhagyó oldal: elküldött kérésnél az oldal nem görgethető, a kérés doboza 30%-kal szélesebb és magában görgethető"
},
{
"id": "902919abd3",
"at": "2026-11-21T10:21:23+01:00",
"msg": "Stáb: véglegesített (lakatolt) eszközöknél a pozíció és a szakember csak feloldás után vehető le"
},
{
"id": "6a20192ae1",
"at": "2026-11-21T10:18:46+01:00",
"msg": "Jóváhagyó oldal: a köszönő üzenet alatt az ügyfél módosítási kérése"
},
{
"id": "fbbcc44c70",
"at": "2026-11-21T10:15:47+01:00",
"msg": "Fizetős javítás: ha az ügyfél nem kéri, az utolsó változat automatikusan jóváhagyva"
},
{
"id": "9f93309faf",
"at": "2026-11-21T10:13:02+01:00",
"msg": "Fizetős (3.+) javítás: árajánlatig zárolva; az ügyvezető küldi az ajánlatot, az ügyfél online fogadja el vagy utasítja el, elfogadáskor automatikusan feloldódik és extraként a projekthez kerül; köszönő üzenet semleges színnel"
},
{
"id": "971c6a0087",
"at": "2026-11-21T10:05:26+01:00",
"msg": "Jóváhagyó oldal: képkocka-léptetéskor eltűnik a vezérlő és a sötét réteg (egérmozgásra visszajön)"
},
{
"id": "8d03ce7afc",
"at": "2026-11-21T10:04:48+01:00",
"msg": "Jóváhagyó oldal: a köszönő üzenet pontosan a képernyő közepén"
},
{
"id": "a19633561a",
"at": "2026-11-21T10:03:44+01:00",
"msg": "Jóváhagyó oldal: az utolsó díjmentes kör szövegének átfogalmazása"
},
{
"id": "c05b1d71ce",
"at": "2026-11-21T09:03:10Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
