// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "2ed8665875",
"at": "2026-11-26T10:20:50+02:00",
"msg": "Naptár (havi nézet): görgetéskor nem ugrik több hónapot – a trackpad lendületét az események átlagából ismeri fel (a remegés nem számít új mozdulatnak), egy mozdulat = egy hónap"
},
{
"id": "e6d329e89d",
"at": "2026-11-26T09:19:01+01:00",
"msg": "Űrlap-piszkozat visszatöltésekor látható jelzés „Elvetés” gombbal (pl. új projektnél egy korábbi, félbehagyott jegyzet)"
},
{
"id": "c0f5a48f95",
"at": "2026-11-26T10:17:51+02:00",
"msg": "Naptár (havi nézet): a görgetéses hónapváltás nem akad be – váltás után csak a trackpad lendülete van kiszűrve, új mozdulatra (szünet vagy újra gyorsuló görgetés) azonnal vált; egérgörgővel kattanásonként"
},
{
"id": "e61918a208",
"at": "2026-11-26T09:15:42+01:00",
"msg": "Saját beosztás: a súgóban nincs „Meghívó kiküldve” sor"
},
{
"id": "4419dedff9",
"at": "2026-11-26T10:14:41+02:00",
"msg": "Naptár (teljes képernyős havi nézet): görgetéssel újra hónapot vált, de az oldal és a rács fix – nincs követés, visszarugózás, utómozgás; egy görgetés = egy hónap (a trackpad tehetetlenségi görgetése nem vált tovább), a régi hónap kicsúszik, az új becsúszik; fejléc / eszköztár nem nyomódik össze"
},
{
"id": "4fc1fce782",
"at": "2026-11-26T09:13:41+01:00",
"msg": "Panel csukásakor a fejléc a helyén marad (nem ugrik el a lap); Stáb és Pénzügyek között egyforma hézag"
},
{
"id": "8990d6316b",
"at": "2026-11-26T09:12:08+01:00",
"msg": "Naptár: kompaktabb eszköztár és napfejléc (a betűméret változatlan)"
},
{
"id": "bb11d4b1e8",
"at": "2026-11-26T10:10:43+02:00",
"msg": "Naptár (teljes képernyős havi nézet): teljesen fix – fel-le görgetésre semmi nem mozdul (nincs rugalmas túlgörgetés, nincs rács-követés / hónapváltás), a lap alsó térköze sem görgethető; hónapváltás oldalra görgetéssel vagy a nyilakkal"
},
{
"id": "7e50027d33",
"at": "2026-11-26T09:08:54+01:00",
"msg": "Projekt: kisebb felső hézag a fejléc felett"
},
{
"id": "61bde06e85",
"at": "2026-11-26T10:08:28+02:00",
"msg": "Naptár (havi nézet): keskeny asztali ablakban (701–760 px) is a teljes képernyős nézet – széltől szélig, görgetés nélkül; az események nem nyomódnak össze (+N további), keskeny ablakban a hónapváltó egy sorban"
},
{
"id": "260a86b1b0",
"at": "2026-11-26T09:06:35+01:00",
"msg": "Projekt fejléce: a betűméret marad, csak a hézagok kisebbek (a nagyítás visszavonva)"
},
{
"id": "b9bab9b78e",
"at": "2026-11-26T09:04:46+01:00",
"msg": "Projekt fejléce 20%-kal kompaktabb (asztali nézet)"
},
{
"id": "afc99a9802",
"at": "2026-11-26T09:03:46+01:00",
"msg": "Naptár (asztali havi nézet): teljes képernyő – széltől szélig, a hetek kitöltik a képernyőt, nincs görgetés; napcellában annyi esemény, amennyi kifér (+N további)"
},
{
"id": "924ece1392",
"at": "2026-11-26T09:02:16+01:00",
"msg": "Panel-lakat: nem takarja a „kiválasztva” feliratot, és egy vonalban van a címmel"
},
{
"id": "d08b93d43e",
"at": "2026-11-26T09:00:52+01:00",
"msg": "Naptár (asztali havi nézet): a lap nem görgethető, csak maga a naptár; a szélén tovább görgetve hónapot vált"
},
{
"id": "1959a9f047",
"at": "2026-11-26T08:55:41+01:00",
"msg": "Fizetések: a vezető saját beosztása nem teszi a régi projektet meghívásossá (Vegan Summit, Veganuár díjai újra számítanak); Szolgáltatások: egyetlen lakat"
},
{
"id": "cda0535a68",
"at": "2026-11-26T08:48:28+01:00",
"msg": "Meghívó: „🎬 Projektvezető” + „👥 Meghívót kap” – a tervezett helyszíni csapat (egyszerre kiküldött meghívóknál is látják egymást)"
},
{
"id": "bd1de43c54",
"at": "2026-11-26T08:23:59+01:00",
"msg": "Vágás: „Visszadobás” helyett barátságosabb „✏️ Módosítás kérése” (gomb, súgó, jelzés, hibaüzenet)"
},
{
"id": "130152a89e",
"at": "2026-11-26T08:21:36+01:00",
"msg": "Helyszíni csapat: a meghívóban „👥 Veled lesz” sor, a szakember projektsorában a csapattársak (projektvezető + elfogadott helyszíni kollégák, utómunkások nélkül)"
},
{
"id": "175a2dabd4",
"at": "2026-11-26T08:03:38+01:00",
"msg": "Mai teendők levél: köszönés nélkül"
},
{
"id": "0856859617",
"at": "2026-11-25T18:11:44+01:00",
"msg": "Saját beosztás (termelési vezető / ügyvezető): mentéskor azonnal elfogadott meghívás, e-mail nélkül; egyszeri átállítás a futó projekteken"
},
{
"id": "ab13e8c6ca",
"at": "2026-11-25T17:21:58+01:00",
"msg": "Belső ellenőrzés jóváhagyása: a beírt szöveg tájékoztató megjegyzésként megy a vágónak (✅ Jóváhagyva – megjegyzés)"
},
{
"id": "19884ddd74",
"at": "2026-11-25T17:16:28+01:00",
"msg": "Belső ellenőrzés: nincs külön hozzászólás – csak Visszadobás (a beírt észrevételekkel) vagy Jóváhagyás"
},
{
"id": "50206f77ae",
"at": "2026-11-25T17:10:35+01:00",
"msg": "Időkódra ugrás telefonon (iOS): metaadatra várás, első koppintásnál a videó feloldása, ellenőrzött ugrás, videó a képbe gördül"
},
{
"id": "58be31a17a",
"at": "2026-11-25T17:07:38+01:00",
"msg": "Telefonos indítás: nem fekete a képernyő – világos háttér az első kirajzolástól, iOS indítóképek, manifest"
},
{
"id": "cb3fac4ba0",
"at": "2026-11-25T17:06:16+01:00",
"msg": "Felnyitott projekt: 🔒 Visszazárás gomb (ugyanarra a lezárási dátumra)"
},
{
"id": "23296312af",
"at": "2026-11-25T17:04:15+01:00",
"msg": "Helyszíni munka → Kész: a beszámoló ablak nem jön fel kétszer egymás után"
},
{
"id": "1d2097f031",
"at": "2026-11-25T17:01:48+01:00",
"msg": "Szolgáltatások: a lakat az oszlop jobb felső sarkában"
},
{
"id": "501c95711c",
"at": "2026-11-25T16:59:36+01:00",
"msg": "Projekt lépései: utómunka nélküli projektnél a Helyszíni munka áthúzható a Készre (a következő látható lépés a cél)"
},
{
"id": "0d7d55de68",
"at": "2026-11-25T16:57:20+01:00",
"msg": "Projektlista: megnyitáskor a mai nap (piros jelölő) a képernyő közepére gördül"
},
{
"id": "cb6e5b8e95",
"at": "2026-11-25T15:56:25Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
