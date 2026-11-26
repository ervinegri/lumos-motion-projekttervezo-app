// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "108982d67e",
"at": "2026-11-26T09:50:49+01:00",
"msg": "Közeli forgatás: lakat a Stáb panelen (utolsó 3 nap / helyszíni munkától), sürgős meghívó a forgatás előtti estéig tartó határidővel; visszamondás szöveg pontosítva"
},
{
"id": "7ac615cf1d",
"at": "2026-11-26T09:44:10+01:00",
"msg": "Szakember nézet: a (látható, tehát elfogadott) csapattársak kártyája zöld"
},
{
"id": "6d6e7d170d",
"at": "2026-11-26T09:41:36+01:00",
"msg": "Szakember nézet: a csapattársak stábkártyája semleges fehér (nem „meghívatlan” szürke)"
},
{
"id": "b986996f2c",
"at": "2026-11-26T10:40:37+02:00",
"msg": "Projekt lépései: az aktuális (sötét) kártya teljesült pipája – pl. lezárt projekt „Kész” lépése – zöld körben jól látható fehér pipa (eddig üres fehér kör)"
},
{
"id": "34df921929",
"at": "2026-11-26T09:38:48+01:00",
"msg": "Becenév a Stáb listában (pl. Nándi) – a kanbanon és a hozzászólásoknál ez látszik; Koós Nándor = Nándi"
},
{
"id": "fd47a2f98f",
"at": "2026-11-26T10:38:28+02:00",
"msg": "Naptár (havi nézet): a görgetéses hónapváltást nem akasztja meg a nyitva maradt esemény-súgó – görgetéskor a súgó eltűnik, és a súgó fölött görgetve is vált (görgethető hosszú súgóban a súgó görget)"
},
{
"id": "50b96ccd94",
"at": "2026-11-26T10:33:56+02:00",
"msg": "Naptár (havi nézet): finom trackpad-húzásra is hónapot vált (kisebb küszöb)"
},
{
"id": "3cc8985901",
"at": "2026-11-26T10:32:47+02:00",
"msg": "Naptár (szakember, havi nézet): az utómunka csak a leadási határidő napján jelenik meg, nem a teljes vágási időszakban (az idővonalon marad az időszak)"
},
{
"id": "1e596a695f",
"at": "2026-11-26T10:32:09+02:00",
"msg": "Naptár (havi nézet): a hónap már görgetés közben vált (nem csak a trackpad elengedésekor) – kisebb küszöb, a lassú húzás is számít; egérgörgővel az első kattanásra"
},
{
"id": "385f26cd4b",
"at": "2026-11-26T09:31:29+01:00",
"msg": "Kanban és hozzászólások: rövid nevek (Dávid, Kata, Ervin – azonos keresztnévnél teljes név); jogosultsági hibánál a pontos indok is látszik"
},
{
"id": "f2f5b5a693",
"at": "2026-11-26T10:25:06+02:00",
"msg": "Naptár (havi nézet): MacBook trackpaddel sem ugrik kettőt – váltás után 0,45 mp-ig nem vált újra (a még tartó, közben gyorsuló mozdulat sem), utána csak szünet vagy erősen gyorsuló új mozdulat vált"
},
{
"id": "5bd4311979",
"at": "2026-11-26T10:23:51+02:00",
"msg": "Naptár: asztali gépen keskeny ablakban (700 px alatt) is a teljes képernyős havi nézet – a rács alatti napi lista csak érintőképernyős telefonon jelenik meg"
},
{
"id": "42d10bf6aa",
"at": "2026-11-26T10:21:59+02:00",
"msg": "Naptár: nem villognak az események – a napcellákba férő események száma már a kirajzolás előtt beáll (eddig egy pillanatra több esemény / más +N látszott), és a hónapváltáskor nem fut két animáció egymásra"
},
{
"id": "0dc5c3e08e",
"at": "2026-11-26T09:21:41+01:00",
"msg": "Új projekt: a jegyzet nem marad meg félbehagyott szövegként (a beragadt példányok törlése)"
},
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
"id": "07209f781e",
"at": "2026-11-26T07:48:37Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
