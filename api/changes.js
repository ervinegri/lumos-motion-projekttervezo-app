// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "024d38ef48",
"at": "2026-11-23T19:15:37+02:00",
"msg": "Lehetőség: a Cég balra, a Kapcsolattartó jobbra"
},
{
"id": "5bbed1aab8",
"at": "2026-11-23T18:54:03+02:00",
"msg": "Új lehetőség: az Értékesítő balra, a Szóba jövő szolgáltatások jobbra"
},
{
"id": "f984ea37b9",
"at": "2026-11-23T18:52:54+02:00",
"msg": "Lehetőség: a Szerződés állapota csak szerződött lehetőségnél látszik (vagy ha már van állapota)"
},
{
"id": "69f4f86eb4",
"at": "2026-11-23T18:51:17+02:00",
"msg": "Új lehetőség: Szóba jövő szolgáltatások és Értékesítő egy sorban"
},
{
"id": "2e789d7923",
"at": "2026-11-23T18:49:33+02:00",
"msg": "Új lehetőség: az Értékesítő a szóba jövő szolgáltatások után (teljes szélességben), a Szakasz és az Esély egy sorban"
},
{
"id": "1503be350b",
"at": "2026-11-23T18:47:54+02:00",
"msg": "Általános ajánlat: nincs megnevezés, várható érték, előfoglalt projekt; telefon az e-mail mellett"
},
{
"id": "e7ff725ea9",
"at": "2026-11-23T18:25:54+02:00",
"msg": "Új lehetőség: „Általános ajánlat” (árlista rendezvény nélkül) – nincs típus/helyszín/dátum, a megnevezés és a következő lépés magától kitöltődik; az árajánlat ilyenkor rendezvény nélkül készül"
},
{
"id": "c735e5f2b3",
"at": "2026-11-23T17:26:03+02:00",
"msg": "Saját (lumosmotion.com) címnél a konkrét fiók létezését is ellenőrzi (naptár szabad/foglalt alapján, új jogosultság nélkül) – nem létező céges fiók nem menthető"
},
{
"id": "48b8f398a4",
"at": "2026-11-23T17:22:59+02:00",
"msg": "E-mail-ellenőrzés közben forgó jelző (mint máshol az appban)"
},
{
"id": "d3586a931f",
"at": "2026-11-23T17:18:08+02:00",
"msg": "Felhasználó ablak: hibás / nem Google-os e-mail-címnél a mentés gomb tiltva (el sem indul), ellenőrzés közben is; piros jelzés a mező alatt, a mező is piros; előnézet sem készül"
},
{
"id": "4235322ea8",
"at": "2026-11-23T17:12:15+02:00",
"msg": "E-mail-cím: nem létező / levelet nem fogadó domain sem menthető, elírásnál javaslat (pl. lumsmotion.com → lumosmotion.com)"
},
{
"id": "1d7da9204d",
"at": "2026-11-23T16:48:51+02:00",
"msg": "Nem Google-os e-mail-cím nem menthető (piros jelzés, háttér is ellenőrzi); távolabbi projekteknél is jelez, ha valaki nem válaszolt a meghívóra"
},
{
"id": "21258a5e32",
"at": "2026-11-23T16:20:12+02:00",
"msg": "Belépés: Google-fiók ellenőrzés (gmail / Google által kezelt domain MX alapján) – figyelmeztetés a felhasználó ablakában és a listában, megerősítés mentéskor; a meghívó leírja, hogyan lesz Google-fiók a meglévő címhez"
},
{
"id": "4693a6cd19",
"at": "2026-11-23T16:04:39+02:00",
"msg": "Visszadobás: a beírt szöveg nem veszhet el (háttérkoppintás nem zár, hibánál újraküldhető), csak időkód nem elég; Vissza gomb az ablakot zárja; ügyfélnek kiküldött verziók jelölve"
},
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
"id": "ebdfa8e4f5",
"at": "2026-11-22T14:52:49Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
