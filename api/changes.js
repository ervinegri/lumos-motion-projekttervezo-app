// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
},
{
"id": "b87c83bfc0",
"at": "2026-11-26T11:10:36+02:00",
"msg": "Mentés a háttérben: ha egy ablak mentése a szerverre vár, az ablak eltűnik és lehet tovább dolgozni (⏳ Mentés folyamatban jelző); hibánál az ablak a beírt adatokkal visszajön; közben nyitott új ablak a mentés után nyílik"
},
{
"id": "822e215e0e",
"at": "2026-11-26T11:07:48+02:00",
"msg": "Sebesség: a műveletenkénti időtartamok a /api/dbstatus-ban is (titok nélkül), a hibakereséshez"
},
{
"id": "00d6458de2",
"at": "2026-11-26T11:05:13+02:00",
"msg": "Sebesség: a Neon saját ideje külön mérve (a közvetítő fejlécéből), a /api/dbstatus mutatja az Apps Script teljes körét, a Neon válaszidejét és a régiókat"
},
{
"id": "f67ed7c1a5",
"at": "2026-11-26T11:02:51+02:00",
"msg": "Sebesség: mérés kérésenként (adatbázis, betöltés, zárra várás, gyorsítótár; a böngészőben a teljes kör) – Beállítások → ⚡ Sebesség; gyorsítás: a lapok gyorsítótárból 2 hívással töltődnek (eddig lapként 2), az adatbázis-forgalom számlálója kérésenként egyszer ír"
},
{
"id": "f886a2f050",
"at": "2026-11-26T10:52:11+02:00",
"msg": "Projekt lépései: a „Kész” (aktuális) kártya pipája most tényleg zöld körben fehér pipa – a pipa a kártya mellett van, nem benne (javított kijelölés)"
},
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
"id": "5b4517042e",
"at": "2026-11-26T08:10:54Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
