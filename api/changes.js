// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "9a9efe2c7e",
"at": "2026-11-19T12:00:49+01:00",
"msg": "Utómunka-instrukciók előtöltése (a tábla megnyitásakor már kész, nem utólag ugrik be)"
},
{
"id": "e748f9fd5b",
"at": "2026-11-19T11:46:42+01:00",
"msg": "Videóablak: link nélküli, visszajelzésekből kikövetkeztetett verziók (v1..vN) megszüntetve – csak valódi linkcsere ad új verziót"
},
{
"id": "12b01b6952",
"at": "2026-11-19T11:33:46+01:00",
"msg": "Verziók: ugyanannak a fájlnak más paraméterű linkje nem új verzió (Drive/YouTube/Vimeo azonosító szerint), meglévő duplikátumok összevonva"
},
{
"id": "eb98faeac4",
"at": "2026-11-19T11:31:55+01:00",
"msg": "Utómunka-instrukciók: Kész gomb törölve"
},
{
"id": "49929b31ab",
"at": "2026-11-19T11:31:35+01:00",
"msg": "Videótábla: cím nem fut a fogantyú alá"
},
{
"id": "db98bb6a15",
"at": "2026-11-19T11:31:27+01:00",
"msg": "Videótábla: kéz-kurzor csak mozdítható kártyán, ott hoverre emelkedés + fogantyú"
},
{
"id": "beaf81a8f8",
"at": "2026-11-19T11:28:36+01:00",
"msg": "Jóváhagyó oldal: 'Írd le röviden…' hiba eltűnik gépeléskor és a megerősítő ablaknál"
},
{
"id": "96078ef3e8",
"at": "2026-11-19T11:26:40+01:00",
"msg": "Jóváhagyó oldal: módosítás/üzenet minimális hossza feloldva (1 karakter is elég)"
},
{
"id": "96c9072614",
"at": "2026-11-19T11:24:28+01:00",
"msg": "Board kártya: '↩ javítandó' címke törölve (a javítás-jelvény már mutatja)"
},
{
"id": "2484d995c0",
"at": "2026-11-19T11:21:17+01:00",
"msg": "Megerősítő ablak: 'Utána még egy díjmentes kör marad' mondat törölve"
},
{
"id": "be1765a440",
"at": "2026-11-19T10:19:44Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
