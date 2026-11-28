// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "484593b617",
"at": "2026-11-27T21:56:50+01:00",
"msg": "Kártya húzása: tiszta fehér húzási kép (telefonon nem szürke, fekete sarkú), a halványítás utána jön"
},
{
"id": "c954060cfd",
"at": "2026-11-27T21:54:31+01:00",
"msg": "Ablak alja mobilon (bal oldali gombbal): két egyforma mellékgomb, alatta a fő gomb teljes szélességben"
},
{
"id": "9975f9f022",
"at": "2026-11-27T21:53:35+01:00",
"msg": "Fotógaléria: belső ellenőrzésben nincs megjegyzés gomb; elforgatáskor újraillesztés; fekvő telefonon nagyobb terület"
},
{
"id": "4f22449588",
"at": "2026-11-27T21:51:03+01:00",
"msg": "Fotók küldése az ügyfélnek: „Fotók megtekintése” gomb és fotós alapszöveg (a videós minta nem íródik felül)"
},
{
"id": "2947083651",
"at": "2026-11-27T21:50:05+01:00",
"msg": "Videó/fotó ablak alja mobilon: Bezárás kis ✕ gomb, a fő gombok felirata nem vágódik le"
},
{
"id": "491f5dd4e2",
"at": "2026-11-27T21:48:27+01:00",
"msg": "Fotónagyítás: a léptető nyilak gyors dupla nyomása két lapozás, nem nagyítás"
},
{
"id": "db2d6c61fc",
"at": "2026-11-27T21:47:05+01:00",
"msg": "Lehúzásos frissítés: csak a nagyított fotón tiltva; a nagyítás bezárul az ablakkal; actions-dijcsokkentes betöltési hiba javítva"
},
{
"id": "c0c383c663",
"at": "2026-11-27T21:44:37+01:00",
"msg": "Nagyított fotón a lehúzás nem frissíti az oldalt"
},
{
"id": "fbe61e98c5",
"at": "2026-11-27T21:36:47+01:00",
"msg": "Fotógaléria: nagyítás (csippentés, görgő, dupla koppintás, +/−, húzás; eredeti felbontás), megnyitáskor nem ugrik a végére"
},
{
"id": "b251586750",
"at": "2026-11-27T21:34:05+01:00",
"msg": "Fotógaléria: 3 oszlop, nagyításnál a kép a képernyő széléig ér, nagy léptető gombok"
},
{
"id": "d3f9429998",
"at": "2026-11-27T21:32:20+01:00",
"msg": "Fotógaléria mobilon: tömörebb fejléc (nem ragad), érintésnél nem marad kint a fájlnév"
},
{
"id": "cfc9196659",
"at": "2026-11-27T20:28:14Z",
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
