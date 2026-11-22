// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "86a8884153",
"at": "2026-11-22T09:40:24+01:00",
"msg": "Videó-ablak: széles képernyőn a videó balra, a hozzászólások jobbra"
},
{
"id": "49e6d3e8d6",
"at": "2026-11-22T09:38:05+01:00",
"msg": "Ügyfélnek küldés: a vágó kísérőszövege bekerül a levélbe (a link elé, átírható; a mentett mintába nem)"
},
{
"id": "2facb6613d",
"at": "2026-11-22T09:34:10+01:00",
"msg": "Értesítő előnézet: „Változtatások elvetése” – visszaállás a feloldás előtti állapotra, értesítő nélkül"
},
{
"id": "a09ae52a03",
"at": "2026-11-22T09:29:14+01:00",
"msg": "Zárak: egységes kis lakat-jelvény a szakaszok jobb felső sarkában; értesítő e-mail csak előnézet után, kézzel (visszazáráskor / a projekt elhagyásakor), magától nem megy ki"
},
{
"id": "a2a83c6a1d",
"at": "2026-11-22T09:24:08+01:00",
"msg": "Cégkereső: előtöltés az indulás után + helyi gyorsítótár (azonnali), adószám nélküli ismétlődések összevonva"
},
{
"id": "566e131306",
"at": "2026-11-22T09:21:27+01:00",
"msg": "Azonnali cégkereső a Cégnév mezőben: ügyfelek, projektek, számlázz.hu-s vevők – gépelés közben, adószámmal és címmel"
},
{
"id": "37eeec623a",
"at": "2026-11-22T09:09:57+01:00",
"msg": "Értékeléskérés: élő levél-előnézet az aláírással; 7 nap után egyetlen, jóváhagyandó emlékeztető (videótábla + figyelmeztetés)"
},
{
"id": "eb1006ab59",
"at": "2026-11-22T09:04:43+01:00",
"msg": "Ügyfél adatai: a kapcsolattartó mezőbe lépve rögtön HubSpot-keresés (a cég kapcsolatai, gépelve név szerint)"
},
{
"id": "8aabc56257",
"at": "2026-11-22T08:59:29+01:00",
"msg": "Ügyfél adatai: rövidebb „Betöltés” gomb, hogy az adószám kiférjen"
},
{
"id": "0d22bbcdc4",
"at": "2026-11-22T08:58:00+01:00",
"msg": "Ügyfél adatai: egyenletes, egymás alá igazított mezők (4 oszlop)"
},
{
"id": "ed41573682",
"at": "2026-11-22T08:55:41+01:00",
"msg": "Ügyfél adatai: előbb a cégnév, utána az adószám"
},
{
"id": "7369bb3e49",
"at": "2026-11-22T08:52:17+01:00",
"msg": "Ügyfél adatai: az adószám mező szélesebb (ne vágja le)"
},
{
"id": "04ea3fd2f8",
"at": "2026-11-22T08:51:27+01:00",
"msg": "Ügyfél adatai: kompakt elrendezés a széles ablakban (adószám·cégnév·székhely, kapcsolattartó és képviselő egy-egy sorban)"
},
{
"id": "2d7e00471c",
"at": "2026-11-22T08:49:08+01:00",
"msg": "Ügyfél adatai: a számlák kattinthatók (PDF, régi számlázz.hu-s számlák is); adószám és cégnév egy sorban"
},
{
"id": "f6aff4fd89",
"at": "2026-11-22T08:46:14+01:00",
"msg": "Ügyfél-lista: Google-értékelés oszlop (értékelt / megnyitotta / kértük)"
},
{
"id": "572fd17120",
"at": "2026-11-22T08:44:42+01:00",
"msg": "Ügyfél adatai ablak kétszer olyan széles (1200 px)"
},
{
"id": "8c9788861b",
"at": "2026-11-22T08:28:31+01:00",
"msg": "Keresőkből kivéve: X-Robots-Tag noindex minden oldalon, robots meta, robots.txt"
},
{
"id": "eb4155f687",
"at": "2026-11-22T08:19:30+01:00",
"msg": "gbpCatSearch: angol nyelvű keresés is"
},
{
"id": "2e3b9ae3a9",
"at": "2026-11-22T08:16:33+01:00",
"msg": "Google Cégprofil adatai: olvasás, kategóriakeresés, módosítás (leírás, kategóriák, szolgáltatások) – ügyvezetői API"
},
{
"id": "c66683a997",
"at": "2026-11-21T23:03:40+01:00",
"msg": "Számlázási eltérés: a szervezői jutalék levonása elfogadott (de nem kötelező) – mindkét összeg rendben"
},
{
"id": "018ec5f26b",
"at": "2026-11-21T23:02:53+01:00",
"msg": "Számlázási eltérés: a végszámlából levont szervezői jutalék (és a beszámított projektek) nem kiszámlázatlan"
},
{
"id": "1e75e3d4ea",
"at": "2026-11-21T23:00:23+01:00",
"msg": "Figyelmeztetések: 14 napon belül piros"
},
{
"id": "60671b1c45",
"at": "2026-11-21T22:58:40+01:00",
"msg": "Figyelmeztetések: a rendezvény előtti utolsó 7 napban minden projekt-figyelmeztetés piros"
},
{
"id": "a6f9b4831c",
"at": "2026-11-21T22:56:46+01:00",
"msg": "Figyelmeztetés doboz: egy projektnél az egész doboz kattintható"
},
{
"id": "c33e18108a",
"at": "2026-11-21T22:47:19+01:00",
"msg": "Stábkártya: visszautasított meghívó erős piros (a sárgához, zöldhöz igazítva)"
},
{
"id": "6b252afea3",
"at": "2026-11-21T22:45:41+01:00",
"msg": "Stábkártya: kiküldött, megválaszolatlan meghívó sárga; ki nem küldött szürke"
},
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
"id": "00208674df",
"at": "2026-11-21T21:32:04Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
