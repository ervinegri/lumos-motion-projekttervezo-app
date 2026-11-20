// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "f4adc91b0c",
"at": "2026-11-20T14:14:25+01:00",
"msg": "Előfoglalás: véglegesítési határidő 20 nap (app + keretszerződés 2.8.1)"
},
{
"id": "fe58c85b29",
"at": "2026-11-20T14:04:32+01:00",
"msg": "Újdonságok: előfoglalás, napi időpontok"
},
{
"id": "6f507ba837",
"at": "2026-11-20T14:04:13+01:00",
"msg": "Új projekt: több napnál minden napnak külön kezdés és hozzávetőleges végzés"
},
{
"id": "384b7282d5",
"at": "2026-11-20T14:02:14+01:00",
"msg": "Keretszerződés-sablon: 8.9 – az alvállalkozóról készült fotók/videók felhasználása, a megszűnés után is"
},
{
"id": "37514bb0d7",
"at": "2026-11-20T14:01:34+01:00",
"msg": "Lecserélt / levett szakember díjsora eltűnik a Pénzügyekből (a régi árva sorok megnyitáskor törlődnek)"
},
{
"id": "c9cf619dc0",
"at": "2026-11-20T14:00:24+01:00",
"msg": "Hang- és vizuáltechnikusnál nem kötelező az eszköz; tervezés → helyszíni munka automatikusan, ha minden feltétel teljesül; előfoglalás nem számít elfogadott meghívásnak"
},
{
"id": "4597d93b29",
"at": "2026-11-20T13:58:40+01:00",
"msg": "Előfoglalás (keretszerződés 2.8.): stábkártyán Előfoglalás gomb, rövid levél, visszaigazolás, 'Más ajánlatot kaptam' 48 órás döntés, 30 napos lejárat + emlékeztető, Véglegesítés rendes meghívóval, Elengedés"
},
{
"id": "e2264fa1bc",
"at": "2026-11-20T13:52:52+01:00",
"msg": "Keretszerződés-sablon: 2.8 Előfoglalás pont (30 napos véglegesítés, 48 órás elsőbbség, díjmentes visszavonás)"
},
{
"id": "5d65cacfe7",
"at": "2026-11-20T10:27:18+02:00",
"msg": "Google-értékelés: a jóváhagyó oldalon, ha a projekt minden videója jóváhagyva, értékelés-kérő doboz; átadás után 4 nappal egyetlen kérő levél a kapcsolattartónak (ha nem nyitotta meg, és fél éven belül nem kértünk az ügyféltől); rögzül a kérés és a megnyitás"
},
{
"id": "68c93693a5",
"at": "2026-11-20T10:14:38+02:00",
"msg": "pCloud fájlnév-hiba: a felugró üzenet nem takarja el a hibás nevek listáját"
},
{
"id": "f4bbc14fcc",
"at": "2026-11-20T10:13:02+02:00",
"msg": "Kézikönyv: szintaxisjavítás"
},
{
"id": "f0ef1b179e",
"at": "2026-11-20T10:12:40+02:00",
"msg": "pCloud fájlnév-ellenőrzés: csak kisbetű, szám, alulvonás – hibás névnél a link nem menthető (lista a hibás nevekről), a videóablakban is jelzi; kézikönyv + újdonság"
},
{
"id": "7aa6fb852e",
"at": "2026-11-20T10:09:00+02:00",
"msg": "pCloud-változatok: a képarány (1x1, 16:9, 16-9, 9_16, 4_5…) sem keveredik a sorszámmal; azonos dátumnál a legnagyobb verzió az alap"
},
{
"id": "65e48418dc",
"at": "2026-11-20T10:07:29+02:00",
"msg": "pCloud-mappa: egy videó több változata (v1, v2, képarány) – a legfrissebb az alap, a lejátszó alatt „Változatok” választóval a többi is megnézhető; a verziószám / képarány / felbontás nem keveredik a videó sorszámával"
},
{
"id": "9539be8bb9",
"at": "2026-11-20T10:04:49+02:00",
"msg": "pCloud-mappa több videóval: minden videó a nevében lévő szám szerinti fájlt játssza (Short videó 3 → short_3…), az ügyfél-jóváhagyó oldalon és a belső videóablakban is"
},
{
"id": "6341116160",
"at": "2026-11-20T09:47:31+02:00",
"msg": "Utómunka-tábla: a saját utómunkáját az ügyvezető / termelési vezető belső ellenőrzés nélkül, egyenesen a Jóváhagyásra vár oszlopba húzhatja"
},
{
"id": "31bf901ac4",
"at": "2026-11-20T08:43:20+02:00",
"msg": "Frissítés visszatéréskor: telefon felébresztése / visszaváltás után (ha 1 percnél régebbi az adat) az app újratölt – eddig az alvás alatt álló időzítő miatt elmaradt"
},
{
"id": "02c603e5b0",
"at": "2026-11-19T20:57:37+02:00",
"msg": "Keretszerződés-levél: utolsó mondat ki"
},
{
"id": "0e71874f3a",
"at": "2026-11-19T20:55:45+02:00",
"msg": "Keretszerződés-levél: rövidebb alapszöveg"
},
{
"id": "5f246b806f",
"at": "2026-11-19T20:53:54+02:00",
"msg": "Keretszerződés: a felsorolások sorközei (a pont rendes betűtípussal, tételek között kis térköz)"
},
{
"id": "d79cf76a18",
"at": "2026-11-19T20:49:37+02:00",
"msg": "Keretszerződés: a felek adatai táblázatban (nem lebegő szövegdobozban), az oldalszám rendes láblécben – a Google-PDF így nem csúszik szét; a küldőablakban a levél előnézete fejléccel és aláírással"
},
{
"id": "200046625b",
"at": "2026-11-19T18:35:23+02:00",
"msg": "Fotók utómunkája: magától a kiválasztott fotósé, amíg kézzel senkihez nincs rendelve (felület + mentéskor a háttér is rögzíti)"
},
{
"id": "ccc33cdac1",
"at": "2026-11-19T18:25:28+02:00",
"msg": "Utómunka-figyelmeztetés: a fotók utómunkája nem „videó” (külön szöveg fotóra, videóra és a kettőre)"
},
{
"id": "4b69385e81",
"at": "2026-11-19T17:36:09+02:00",
"msg": "Kézikönyv szerepenként a Beállítások fülön (📖 Kézikönyv); szakembereknél és értékesítőknél a Beállítások fül mindig látszik"
},
{
"id": "0b617851ff",
"at": "2026-11-19T16:47:44+02:00",
"msg": "Keretszerződés küldése: a szerződés is látszik a küldőablakban (Google PDF, tartalékként Word-megjelenítés)"
},
{
"id": "e6ae0179b6",
"at": "2026-11-19T16:10:51+02:00",
"msg": "Stáb: „Új szerződés” gomb (munkatárs kiválasztása → keretszerződés kitöltése/küldése)"
},
{
"id": "b23eba7569",
"at": "2026-11-19T16:09:45+02:00",
"msg": "Meghívás: a díj nem látszik „szakemberként nézve” (ügyvezetői nézetváltásnál)"
},
{
"id": "b5de2cdcf4",
"at": "2026-11-19T16:06:19+02:00",
"msg": "Alvállalkozói keretszerződés a Stáb adatlapról: kitöltés, letöltés, küldés e-mailben, mentés a dokumentumok közé"
},
{
"id": "45d3eee809",
"at": "2026-11-19T14:41:21+02:00",
"msg": "Meghívás: a díj „szakemberként nézve” (ügyvezetői nézetváltásnál) is látszik a meghívásnál"
},
{
"id": "c98c2830d1",
"at": "2026-11-19T14:22:29+02:00",
"msg": "Árajánlat PDF: a tételtáblázat oldalhatáron sorok mentén kettéválik (a folytatásban újra a fejléc), nem marad üresen az első oldal"
},
{
"id": "6ec8158634",
"at": "2026-11-19T11:00:59Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
