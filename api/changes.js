// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "bc41955949",
"at": "2026-11-23T11:02:29+01:00",
"msg": "Dokumentumsor: az × nem törik új sorba"
},
{
"id": "0e30230e51",
"at": "2026-11-23T11:00:32+01:00",
"msg": "Citan megállapodás: átvételkor csak sérülésnél kell jelezni, az átadás-átvételi lap nem kötelező"
},
{
"id": "0fdffda167",
"at": "2026-11-23T09:38:15+01:00",
"msg": "Videó megtekintése: az előnézeti oldal adatai is előre betöltve – a megnyíló lap azonnal kirajzol"
},
{
"id": "ba94457203",
"at": "2026-11-23T09:34:46+01:00",
"msg": "Videó megtekintése gyorsítás: rövid link takarítása óránként (nem minden kattintásnál), előnézeti link újrahasználva, a jóváhagyó oldal egyszer olvassa a projekteket"
},
{
"id": "3c9371950c",
"at": "2026-11-23T09:33:00+01:00",
"msg": "Ügyfél-levél: első változatnál a szövegben sincs „javítás”; a Videó megtekintése előnézet előre betöltve (azonnal nyílik)"
},
{
"id": "de52d37d87",
"at": "2026-11-23T09:31:17+01:00",
"msg": "Ügyfélnek küldés: belső visszadobás után nem „javítás” – az ügyfélnek ez az első változat"
},
{
"id": "cd4f8633eb",
"at": "2026-11-23T08:32:29+01:00",
"msg": "Citan megállapodás modellnek (szereplőnek) is kitölthető"
},
{
"id": "8af630202f",
"at": "2026-11-23T08:30:22+01:00",
"msg": "Citan megállapodás: rendszám (AO PS-758) a sablonban"
},
{
"id": "5718d98b14",
"at": "2026-11-23T08:22:35+01:00",
"msg": "Mercedes Citan gépjármű-használati megállapodás sablon a szerződések között"
},
{
"id": "26881fcdea",
"at": "2026-11-23T08:13:07+01:00",
"msg": "Lakatolt Alapadatok: kijelölhető, másolható, kattintható – de nem módosítható"
},
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
"id": "ad80f95d0d",
"at": "2026-11-22T09:31:54Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
