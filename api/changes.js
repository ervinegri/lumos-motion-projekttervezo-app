// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "e4db7bc39d",
"at": "2026-11-26T11:47:43+01:00",
"msg": "Google-értékelések: alapból 12 értékelés látszik (6 helyett)"
},
{
"id": "b8955e7a82",
"at": "2026-11-26T11:45:07+01:00",
"msg": "Google-értékelések: link másolása és QR-kód betöltés közben is"
},
{
"id": "135a455c3c",
"at": "2026-11-26T11:43:30+01:00",
"msg": "Google-értékelések, telefon: cím és értékelés egy sorban"
},
{
"id": "cf11442efa",
"at": "2026-11-26T11:43:17+01:00",
"msg": "Google-értékelések ablak: az átlag és a darabszám a címsorban (kompaktabb)"
},
{
"id": "781e4e168b",
"at": "2026-11-26T11:41:55+01:00",
"msg": "Ügyfelek, telefon: a kereső mögötti cím elrejtve"
},
{
"id": "d6c1841b1c",
"at": "2026-11-26T11:40:57+01:00",
"msg": "Ügyfelek fejléce: a gombok jobbra igazítva"
},
{
"id": "e31d3a754c",
"at": "2026-11-26T11:40:04+01:00",
"msg": "Ügyfelek: keresés a fejléc sorában; értékelési link / QR a Frissítés mellett; induláskor a Google-értékelések automatikus behúzása"
},
{
"id": "e90f4fb51d",
"at": "2026-11-26T11:35:48+01:00",
"msg": "Sötét mód: olvasható szerepkör-választó; érintésre nincs sárga szövegkijelölés a sorokon; egyforma panelhézag a Szerződés és számlázás előtt; zárolt Alapadatok nem kattintható (tiltó kurzor); Ügyfelek fejléce egy sorban; Google-értékelési link másolása és QR-kód"
},
{
"id": "3e30254769",
"at": "2026-11-26T11:29:19+01:00",
"msg": "Értékesítés: beszélgetésrögzítés (személyes / kihangosított hívás / online megbeszélés), hozzájárulással; Drive-ra mentés, Gemini-átirat (szó szerinti + összefoglaló + következő lépés), félbemaradt felvétel mentése a böngészőben"
},
{
"id": "b9b5f6bceb",
"at": "2026-11-26T11:26:00+01:00",
"msg": "Indítóképernyő (fehér háttér, középen a logó) a fekete helyett; projektlap: minden szakasz csukva nyílik, új sorrend (Stáb → Utómunka → Pénzügyek → Szerződés és számlázás), egyforma lenyitó nyíl"
},
{
"id": "a6af016938",
"at": "2026-11-26T11:16:36+01:00",
"msg": "Kifizetések: „Értékesítés (fix fizetés)”; értékesítési kártyán minden nézetben az értékesítő neve"
},
{
"id": "b1caea9986",
"at": "2026-11-26T11:14:07+01:00",
"msg": "Napló: változás nélküli mentés nem kerül az Előzményekbe (nincs több üres „Beosztás módosítva”)"
},
{
"id": "42dd7cb1a8",
"at": "2026-11-26T11:02:07+01:00",
"msg": "Stáb-lakat: lezajlott rendezvénynél nincs (a helyszíni stáb már nem módosítható); a feloldó szöveg pontosítva"
},
{
"id": "0a52880f67",
"at": "2026-11-26T10:59:36+01:00",
"msg": "Projekt Részletek (előzmények) a termelési vezetőnek is – árak, számlázás, jutalék nélkül"
},
{
"id": "3f15be1bac",
"at": "2026-11-26T11:58:05+02:00",
"msg": "Stáb: zárt lakatnál a „Szerepkör hozzáadása” szürke és nem használható (jelzi, hogy a lakattal nyitható)"
},
{
"id": "dfe7a656da",
"at": "2026-11-26T11:55:24+02:00",
"msg": "Gyors út: nézetváltás és kilépés után a munkamenet tükre azonnal frissül; jogosultsági tiltásnál mindig az Apps Script dönt (nem jön téves „nincs jogosultságod” profilváltáskor)"
},
{
"id": "4006b5c786",
"at": "2026-11-26T11:49:31+02:00",
"msg": "Gyors út: a változásnapló és a feladó-álnevek is a gyors úton (a változásnaplót a saját szerver adja, az álnevek a tükörből); a csomag-frissítések nem kerülnek a változásnaplóba"
},
{
"id": "0966b574ca",
"at": "2026-11-26T11:48:49+02:00",
"msg": "Újdonság: gyorsabb mentés és betöltés"
},
{
"id": "44ec20257e",
"at": "2026-11-26T11:47:17+02:00",
"msg": "Gyors út: írás-próba valódi adatbázison (külön üres próbalap; feltételes írás, ütközés, visszaürítés) – ritkítva"
},
{
"id": "67f786c017",
"at": "2026-11-26T11:44:22+02:00",
"msg": "Gyors út: telepítés után az Action azonnal frissíti a tükröt; csak a valódi Google-igény miatti visszalépés kapcsolja ki a gyors utat egy olvasásra"
},
{
"id": "76bf66367b",
"at": "2026-11-26T11:37:11+02:00",
"msg": "Gyors út: új telepítés után bármelyik kérés frissíti a tükör kódazonosítóját (ne maradjon a gyors út kikapcsolva olvasásoknál)"
},
{
"id": "0e7ef88477",
"at": "2026-11-26T11:35:31+02:00",
"msg": "Gyors út: a mindig Google-t igénylő lekérések (naptár, beállítások) egyből az Apps Scripthez mennek; ami kétszer a Google-ra szorult, a munkamenetben kihagyja a gyors utat"
},
{
"id": "396031ed44",
"at": "2026-11-26T11:35:10+02:00",
"msg": "Gyors út: a betöltés (bootstrap) is gyors – a karbantartó lépései (naptár-visszajelzések, időzítők) háttérfeladatként az Apps Scriptben futnak, legfeljebb 5 percenként; a beállítások listázása a tükörből"
},
{
"id": "e6db746a5a",
"at": "2026-11-26T10:34:14+01:00",
"msg": "Stáb: a kártyákon nincs külön lakat (a panel lakatja kezeli az elfogadottak eszközeit is); zárolt résznél tiltó kurzor"
},
{
"id": "a1f81d715b",
"at": "2026-11-26T11:32:53+02:00",
"msg": "Gyors út: önpróba – valódi lapok betöltése (csak darabszám)"
},
{
"id": "b1f9881e99",
"at": "2026-11-26T11:31:09+02:00",
"msg": "Gyors út: önpróba valódi adatokkal (írás nélkül)"
},
{
"id": "e99c7d97d8",
"at": "2026-11-26T11:29:30+02:00",
"msg": "Gyors út: állapotlekérdezés külön lekérdezésekkel"
},
{
"id": "930ede482d",
"at": "2026-11-26T11:25:52+02:00",
"msg": "Gyors út: állapotlekérdezés (GET /api/fast – kódváltozat, tükör, várakozó háttérfeladatok; titok nélkül)"
},
{
"id": "d99b63bf7a",
"at": "2026-11-26T11:23:40+02:00",
"msg": "Gyors út: a mentések és lekérések a Vercelen futnak, közvetlenül a Neon mellett (ugyanaz a háttérkód) – Google-szolgáltatást igénylő művelet az Apps Scripten marad; az írás feltételes (verziós), ütközésnél friss adattal újrafut; levél / HubSpot-szinkron háttérfeladatként; beállítás- és munkamenet-tükör a Neonban (titkok nélkül)"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
module.exports.items = ITEMS;   // a gyors út (api/_gasrt.js) innen olvassa
