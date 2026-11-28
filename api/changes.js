// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "b49a0ab91f",
"at": "2026-11-27T22:28:03+02:00",
"msg": "Lezárt Alapadatok: a Térkép link és a másoló gombok kattinthatók maradnak"
},
{
"id": "e7a86d6b50",
"at": "2026-11-27T20:56:20+01:00",
"msg": "Fotógaléria az appon belül (belső ellenőrzés + ügyfél jóváhagyó oldal): bélyegképek, nagyítás, lapozás, képre szóló megjegyzés"
},
{
"id": "0a82aac294",
"at": "2026-11-27T15:10:10+02:00",
"msg": "Projektlista: a lezajlott / lezárt sorok olvashatóbbak"
},
{
"id": "4cf575e81b",
"at": "2026-11-27T15:08:47+02:00",
"msg": "Projektlista: a mai projekt kerete miatt nem görgethető vízszintesen a lista"
},
{
"id": "1817f52194",
"at": "2026-11-27T15:07:40+02:00",
"msg": "Szakember: a gomb a múlt hónap nevét viseli (pl. Októberi projektek)"
},
{
"id": "a1c80702e8",
"at": "2026-11-27T15:06:48+02:00",
"msg": "Szakember: az e havi projektek lezárva is a listában; „Előző havi projektek” lenyitható gomb"
},
{
"id": "abacdd52c8",
"at": "2026-11-27T15:05:39+02:00",
"msg": "Szakember, Lezárt projektek: csak az előző hónap elejétől"
},
{
"id": "446f3c20d0",
"at": "2026-11-27T15:02:45+02:00",
"msg": "Szakember: „Lezárt projektek” gomb a Beosztásaim alján – a korábbi beosztások is visszanézhetők"
},
{
"id": "2df2c2ed8c",
"at": "2026-11-27T15:01:46+02:00",
"msg": "Szakember: a lezajlott projekt nem szürkül el, amíg van rajta saját, nem jóváhagyott utómunkája"
},
{
"id": "6fd8d5ad95",
"at": "2026-11-27T14:59:31+02:00",
"msg": "Szakember: a lezajlott, de még Helyszíni munka lépésben lévő projekt is látszik, ha övé az utómunka (pl. fotók)"
},
{
"id": "b4cd97ddcf",
"at": "2026-11-27T14:57:57+02:00",
"msg": "Termelési vezető: a nézetváltóban csak a saját és a szakember nézet (az ügyvezetői és értékesítői sor ki sem kerül a listába)"
},
{
"id": "e894131efc",
"at": "2026-11-27T14:55:55+02:00",
"msg": "Utómunka tábla: a fotók utómunkája nem vár a nyersanyag-feltöltésre (a fotós a saját képeit dolgozza fel) – a szakember azonnal mozgathatja"
},
{
"id": "636c5f0995",
"at": "2026-11-26T21:44:15+01:00",
"msg": "Belső jóváhagyás + ügyfélnek küldés: a vágó egyetlen levelet kap (Ügyfélnek továbbküldve: …), benne a megjegyzéssel"
},
{
"id": "56caf36ba1",
"at": "2026-11-26T22:39:45+02:00",
"msg": "Telefon, Stáb lista: egyforma magas sorok (név+cég, szerepek+részletek egy-egy sorban, a többi …)"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
module.exports.items = ITEMS;   // a gyors út (api/_gasrt.js) innen olvassa
