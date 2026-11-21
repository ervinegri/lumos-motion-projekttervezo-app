// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "ff5d390507",
"at": "2026-11-21T22:40:00+01:00",
"msg": "Elfogadott stábkártya: még zöldebb (teljes zöld háttér, sötétebb keret)"
},
{
"id": "12fc94826c",
"at": "2026-11-21T22:37:32+01:00",
"msg": "Elfogadott meghívós stábkártya feltűnőbb: erős zöld keret és halvány zöld háttér"
},
{
"id": "8cb68ece5c",
"at": "2026-11-21T22:36:54+01:00",
"msg": "Eszköz-zár lakat: lekerekített négyzet jelvény"
},
{
"id": "a3fc777b12",
"at": "2026-11-21T22:33:50+01:00",
"msg": "Eszköz-zár lakat: kerek, halvány sárga keret (feloldva kék)"
},
{
"id": "1595c64868",
"at": "2026-11-21T22:31:52+01:00",
"msg": "Eszköz-zár: csak egy kis lakat a fogaskerék alatt, rámutatva az üzenet"
},
{
"id": "daf34320ad",
"at": "2026-11-21T22:25:07+01:00",
"msg": "Elfogadott meghívó után a szakember eszközei zárolva a kártyán (Módosítás / Visszazárás), változáskor e-mail"
},
{
"id": "94dd16391c",
"at": "2026-11-21T22:23:23+01:00",
"msg": "Díjtábla fejléc: az oszlopszélesség-fogantyú nem látszik kurzorként (csak rámutatva, halványan)"
},
{
"id": "a741356b7e",
"at": "2026-11-21T22:19:43+01:00",
"msg": "Közelgő projekt figyelmeztetés: 30 napon belül, 7 napon belül piros"
},
{
"id": "49b647ed8d",
"at": "2026-11-21T22:15:58+01:00",
"msg": "Közelgő (14 napon belüli) projekt figyelmeztetés: mi hiányzik még (projektvezető, szerepkörök, meghívók) – listában, figyelmeztetésekben, projektben"
},
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
"id": "bebaca9f48",
"at": "2026-11-21T09:24:02Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
