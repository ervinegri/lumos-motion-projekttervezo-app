// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "462b752734",
"at": "2026-11-28T09:44:48+01:00",
"msg": "Táblán: egyetlen azonos fajta videónál sorszám nélküli név"
},
{
"id": "4f12556db0",
"at": "2026-11-28T09:41:41+01:00",
"msg": "Projektlista: lezárt projekt állapot-sávja is szürke"
},
{
"id": "0b38c36812",
"at": "2026-11-28T09:39:29+01:00",
"msg": "Google-értékelés párosítása az értékelést kérő levél címzettje / megszólítása alapján is; mentetlen projektnél nem nyúlik meg a Szolgáltatások panel alja"
},
{
"id": "56b8f18a14",
"at": "2026-11-28T09:33:52+01:00",
"msg": "Utómunka tábla a projektoldalon: a videók számának módosítása mentés előtt is azonnal látszik (új kártyák szaggatottan)"
},
{
"id": "71be14431b",
"at": "2026-11-28T09:31:46+01:00",
"msg": "Helyszínen kért feladat rögzítése: megerősítő ablak nélkül"
},
{
"id": "0cff8d0bbe",
"at": "2026-11-28T09:30:25+01:00",
"msg": "Lezajlott rendezvény feloldva: nem szürke, az operatőr kiválasztható; Szolgáltatások zöld; a táblán a videó neve terjedelem nélkül"
},
{
"id": "a6a5c62489",
"at": "2026-11-28T09:26:31+01:00",
"msg": "Lezajlott rendezvény feloldásakor nincs felugró üzenet"
},
{
"id": "10c3f72522",
"at": "2026-11-28T09:26:11+01:00",
"msg": "Projekt szakaszok: Utómunka lilás, Stáb és eszközök kék"
},
{
"id": "15475e6a9c",
"at": "2026-11-28T09:25:30+01:00",
"msg": "Lezajlott rendezvény: feloldáskor nincs értesítő-figyelmeztetés, utólag nem megy ki értesítő e-mail"
},
{
"id": "18a71188f0",
"at": "2026-11-28T09:24:49+01:00",
"msg": "Stáb és eszközök: lezajlott rendezvénynél saját lakat (utólagos javítás), a szolgáltatásoktól függetlenül"
},
{
"id": "45fd6f3dcf",
"at": "2026-11-28T09:22:46+01:00",
"msg": "Lezajlott rendezvény: a Szolgáltatások lakatjának feloldása a terepi feladatokat is szerkeszthetővé teszi (nem szürke)"
},
{
"id": "dc3ac54d21",
"at": "2026-11-28T09:18:50+01:00",
"msg": "Lezajlott rendezvény: a helyszínen kért, teljesített terepi feladat utólag rögzíthető (csak a helyszíni stábhoz)"
},
{
"id": "da64b28331",
"at": "2026-11-28T09:15:50+01:00",
"msg": "Videótábla telefonon: keskenyebb oszlopok, a kártyán is lehet görgetni"
},
{
"id": "66864d4b5e",
"at": "2026-11-28T09:14:19+01:00",
"msg": "Fotógaléria: gépen 4 oszlop (telefonon 3), a fotók száma és a pCloud link a fejlécsorban"
},
{
"id": "49dbc49a23",
"at": "2026-11-28T09:13:34+01:00",
"msg": "svcCanPost egyszerűsítése"
},
{
"id": "7506d88d52",
"at": "2026-11-28T09:13:17+01:00",
"msg": "Lezajlott rendezvény: az utómunka (extra videók, vágó) feloldás után szerkeszthető, csak a terepi feladatok zártak"
},
{
"id": "68aa337707",
"at": "2026-11-28T09:07:49+01:00",
"msg": "Instrukciók: „E-mailt kap:” – címzettenként pipálható lista (projektvezetőnek), a kipipáltak nem kapják meg"
},
{
"id": "32a1cc067e",
"at": "2026-11-28T09:06:49+01:00",
"msg": "Stáb-instrukciók a lakaton kívül: zárolt stábnál is bármikor írható és küldhető"
},
{
"id": "56af77a674",
"at": "2026-11-28T08:53:02+01:00",
"msg": "Értékelés kérése: címzett választható az ügyfelek kapcsolattartói/képviselői és a szereplők közül, a megszólítás kitöltődik"
},
{
"id": "8e26fdba5c",
"at": "2026-11-28T08:50:54+01:00",
"msg": "Utómunka előtti projekt megnyitásakor a Stáb és eszközök szakasz nyitva"
},
{
"id": "01abb31716",
"at": "2026-11-28T08:49:45+01:00",
"msg": "Utómunkában lévő projekt megnyitásakor az Utómunka szakasz nyitva"
},
{
"id": "4eee905b55",
"at": "2026-11-28T08:49:22+01:00",
"msg": "Projekt megnyitása új lapon: jobb klikk menü a projektsoron és a naptárban, Ctrl/⌘+kattintás és középső gomb"
},
{
"id": "931ef8e799",
"at": "2026-11-28T08:48:29+01:00",
"msg": "Projektlista: a videók és a fotók külön számolva (🎞️ 1 videó · 📷 fotók)"
},
{
"id": "987aa08e2f",
"at": "2026-11-28T08:47:37+01:00",
"msg": "Fotógaléria: hasábos elrendezés eredeti arányokkal; jóváhagyó oldal: projekt · Fotók linkjének másolása · N fotó egy sorban"
},
{
"id": "66604ec685",
"at": "2026-11-28T08:30:58+01:00",
"msg": "Kiküldött levél: a küldés bejegyzését rugalmasan keresi (korábbi változatok, időformátum), a címzett tartalékként a bejegyzésből"
},
{
"id": "f4216f24de",
"at": "2026-11-28T08:26:54+01:00",
"msg": "Kiküldött ügyfél-levél megtekintése a hozzászólásokból; fotógaléria: lejjebb ér, lekerekített alj, nincs súgószöveg"
},
{
"id": "11b9cd3f33",
"at": "2026-11-28T08:24:18+01:00",
"msg": "Fotógaléria gépen: a bal oszlop teljes magasságát kitölti"
},
{
"id": "eecaaf4c6c",
"at": "2026-11-27T21:58:13+01:00",
"msg": "Fekvő telefon: a projekt videótábla ablaka kitölti a képernyő magasságát"
},
{
"id": "b12afede8f",
"at": "2026-11-27T20:56:59Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
module.exports.items = ITEMS;   // a gyors út (api/_gasrt.js) innen olvassa
