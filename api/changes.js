// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
},
{
"id": "6e6d7b9fd6",
"at": "2026-11-26T22:38:27+02:00",
"msg": "Projektlista: vastagabb videó-állapotsáv"
},
{
"id": "9cc65355fb",
"at": "2026-11-26T21:34:10+01:00",
"msg": "Kifizetés felismerése a bankból: a kimenő utalás akkor is párosul, ha a szakember számlája csak az utalás után került be (újraellenőrzés), fordított névsorrend és nettó/bruttó összeg is; a Fizetések cellájában „🏦 utalva … ✓” gomb egy kattintásos jóváhagyással"
},
{
"id": "53e214beeb",
"at": "2026-11-26T22:02:51+02:00",
"msg": "Stáb / Szereplők: csak lista (a kártyanézet és a váltó megszűnt); kereső és szerep-szűrő egy sorban"
},
{
"id": "25ada52641",
"at": "2026-11-26T22:00:26+02:00",
"msg": "iOS: az állapotsor saját sávot kap (default) – a felső menü nem homályosodik el (újratelepítés után); újdonság a többieknek"
},
{
"id": "4d8325432b",
"at": "2026-11-26T21:53:44+02:00",
"msg": "Indítóképernyő: felfedés után kikerül az oldalból (iOS fejléc-homály gyanús rétege)"
},
{
"id": "43edfbcb28",
"at": "2026-11-26T21:52:09+02:00",
"msg": "Visszaállítva: iOS-en is működik a „vissza” mozdulat (a menü homályát nem ez okozta)"
},
{
"id": "9c86f5a685",
"at": "2026-11-26T21:51:07+02:00",
"msg": "Táblák: a rögzített első oszlop fejléce is a helyén marad, a többsoros fejlécnél is jó oszlop rögzül (Értékesítők teljesítménytáblája nem csúszik szét); keskenyebb név-oszlop"
},
{
"id": "75c90da55a",
"at": "2026-11-26T21:46:11+02:00",
"msg": "iOS: menet közben a cím sem változik (elhomályosodó menü elleni második próba); telefonon fele olyan széles utómunka-oszlopok"
},
{
"id": "5c05dc9b0b",
"at": "2026-11-26T21:39:17+02:00",
"msg": "Telefon, projekt oldal: a szakaszok széltől szélig (oldalsó margó és keret nélkül)"
},
{
"id": "4b092297b5",
"at": "2026-11-26T21:38:24+02:00",
"msg": "iPhone / iPad: az appon belüli navigáció nem ír előzmény-bejegyzést (iOS 26.2 hiba: elhomályosodó felső menü)"
},
{
"id": "35278c7ccb",
"at": "2026-11-26T21:36:35+02:00",
"msg": "Visszavonva: a rugózás tiltása nem oldotta meg a felső menü homályát"
},
{
"id": "461c0bddbf",
"at": "2026-11-26T21:32:26+02:00",
"msg": "Telefon, projektlista: hosszabb videó-állapotsáv (kitölti a sort)"
},
{
"id": "671d8fe2a7",
"at": "2026-11-26T21:31:12+02:00",
"msg": "iPhone: az oldal teteje nem rugózik le, így a felső menü nem homályosodik el (iOS 26)"
},
{
"id": "eda0679087",
"at": "2026-11-26T21:28:25+02:00",
"msg": "Telefon: a lépés-kártyák egy sorban, tömören"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
module.exports.items = ITEMS;   // a gyors út (api/_gasrt.js) innen olvassa
