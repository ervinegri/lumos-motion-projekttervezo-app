// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "f2f5284c49",
"at": "2026-11-23T08:10:49+01:00",
"msg": "Közös kamera ugyanannál az operatőrnél egy idejű projektekben (+usecase teszt); meghívó újraküldése a fogaskerék menüben; Google-értékelés csillag kattintásra válasz"
},
{
"id": "b0d89894ff",
"at": "2026-11-22T17:05:56+02:00",
"msg": "Projekt: Videótábla → Utómunka, az Alapadatok alá; telefonon swipe-olható; Alapadatok alapból csukva"
},
{
"id": "c6397a5db7",
"at": "2026-11-22T17:04:05+02:00",
"msg": "Projekt Pénzügyek telefonon: Szerződés és Termelés kártya egy sorban"
},
{
"id": "12f48a64c1",
"at": "2026-11-22T17:02:31+02:00",
"msg": "Alapadatok mindig zárva nyílik (lakat), lenyitható szakaszok nyila egységesen jobbra"
},
{
"id": "7b7753e962",
"at": "2026-11-22T16:58:02+02:00",
"msg": "Telefon: a logó háttere minden kinézetben a fejléc színe (Stone: fehér)"
},
{
"id": "93f0de0c00",
"at": "2026-11-22T16:54:17+02:00",
"msg": "Ügyfelek fekvő telefonon: kártyás lista, nincs oldalra görgetés"
},
{
"id": "7ef5b93c2b",
"at": "2026-11-22T16:52:38+02:00",
"msg": "Telefon: a logó mögött nincs sötét doboz világos fejlécen, nem lóg ki a bal szélen"
},
{
"id": "717dcf76cf",
"at": "2026-11-22T10:56:09+01:00",
"msg": "Videósor nélküli projekt: az átadott link lejátszóval az utómunka-ablakban"
},
{
"id": "d14f042e45",
"at": "2026-11-22T10:53:10+01:00",
"msg": "Értékelés: ugyanattól az ügyféltől már kértünk – nem kérünk újra"
},
{
"id": "ddf9ef7af7",
"at": "2026-11-22T10:51:07+01:00",
"msg": "Hozzászólások: szerep ikon a név előtt (💼 ügyvezető, ⚙️ termelési vezető, ✂️ vágó, ⭐ ügyfél)"
},
{
"id": "343d7eaa1f",
"at": "2026-11-22T10:44:02+01:00",
"msg": "Értékelés részletei: a kiküldött levél tartalma (mentés + utólagos pótlás)"
},
{
"id": "b3403b6ed9",
"at": "2026-11-22T10:43:14+01:00",
"msg": "pCloud hibaüzenetek egyszerűsítve"
},
{
"id": "ae40da1ef8",
"at": "2026-11-22T10:41:53+01:00",
"msg": "pCloud: törölt link üzenete"
},
{
"id": "8e4251abf2",
"at": "2026-11-22T10:39:31+01:00",
"msg": "Álló videó a képernyő aljáig"
},
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
"id": "1738c5efc4",
"at": "2026-11-22T08:55:50Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
