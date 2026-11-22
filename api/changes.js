// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "cfab296d13",
"at": "2026-11-22T10:38:42+01:00",
"msg": "Jóváhagyás és üzenet egy hozzászólásban; jóváhagyott sáv ki; álló videó magassága"
},
{
"id": "5b4c144891",
"at": "2026-11-22T10:37:42+01:00",
"msg": "Álló videó nagyobb, a hozzászólások mellett; szélesebb szöveges rész"
},
{
"id": "adf2f38f44",
"at": "2026-11-22T10:36:38+01:00",
"msg": "Videó: a Verzió törlése gomb kikerült"
},
{
"id": "42afb3863d",
"at": "2026-11-22T10:34:26+01:00",
"msg": "CLAUDE.md: kézikönyv szabály"
},
{
"id": "b28569abd2",
"at": "2026-11-22T10:34:14+01:00",
"msg": "Kézikönyv: mások díjáról szóló mondat ki"
},
{
"id": "23de4a9e0a",
"at": "2026-11-22T10:32:45+01:00",
"msg": "Értékelés részletei: állapot akkor is, ha nem minden videó jóváhagyott"
},
{
"id": "e4267717fb",
"at": "2026-11-22T10:31:46+01:00",
"msg": "Jóváhagyott videóhoz nincs hozzászólás; értékelés kártya részletei; Kézikönyv a névjelvény menüjében; visszamondási rész ki a kézikönyvből"
},
{
"id": "ed7c1b0aa9",
"at": "2026-11-22T10:27:20+01:00",
"msg": "Hiányzó videóverzió-határ pótlása (ügyvezető)"
},
{
"id": "a30c6eacb4",
"at": "2026-11-22T10:26:38+01:00",
"msg": "Álló videó széles képernyőn nagyban, középen"
},
{
"id": "5794bfae86",
"at": "2026-11-22T10:25:38+01:00",
"msg": "Hozzászólások időrendben a korábbi verzióknál is"
},
{
"id": "0e68310a20",
"at": "2026-11-22T10:19:47+01:00",
"msg": "Videóverzió csak érdemi visszajelzés után; hozzászólás küldése a láblécben"
},
{
"id": "ac34724f76",
"at": "2026-11-22T10:14:23+01:00",
"msg": "Hozzászólások időrendben (alul a legújabb és a szövegmező); a korábbi leadások kísérőszövege megmarad a saját verziójánál; visszaállító (ügyvezető)"
},
{
"id": "3a18cbd144",
"at": "2026-11-22T10:08:00+01:00",
"msg": "Videó-ablak: a korábbi verziók hozzászólásai nem látszanak az új verziónál (a verzióváltóval érhetők el)"
},
{
"id": "83f2a7eb8b",
"at": "2026-11-22T10:05:42+01:00",
"msg": "Verzióváltó a Naptár szegmens-gombjainak stílusában (látszik a kiválasztott); verzió-időpont javító (ügyvezető)"
},
{
"id": "5dc50a0712",
"at": "2026-11-22T10:02:48+01:00",
"msg": "Videó-ablak: az időkód / jelölés sáv közvetlenül a videó alatt; Cmd/Ctrl+Enter elküldi a hozzászólást"
},
{
"id": "8135be0b88",
"at": "2026-11-22T09:56:53+01:00",
"msg": "Videó-ablak: a projekt linkje magát a projektet nyitja meg (nem a videótáblát)"
},
{
"id": "1a3be05b0e",
"at": "2026-11-22T09:55:39+01:00",
"msg": "Videó-ablak: széles képernyőn teljes képernyős"
},
{
"id": "1e3c5089eb",
"at": "2026-11-22T09:54:05+01:00",
"msg": "Videó-ablak: a videó függőlegesen középen"
},
{
"id": "bef360512a",
"at": "2026-11-22T09:45:07+01:00",
"msg": "Videó-ablak: a hozzászólások száma nem látszik a fejlécben"
},
{
"id": "4d1ea63290",
"at": "2026-11-22T09:44:19+01:00",
"msg": "Videó-ablak: a hozzászólás-lista nincs levágva az oldalsó oszlopban"
},
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
"id": "774df085a0",
"at": "2026-11-22T07:55:49Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
