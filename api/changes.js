// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "3a599348f4",
"at": "2026-11-25T15:57:53+01:00",
"msg": "Lemondott projektnél a számlázás panel kezelhető marad"
},
{
"id": "4fbe88bf92",
"at": "2026-11-25T15:57:39+01:00",
"msg": "Projektoldal: a Szerződés és számlázás panel ugyanolyan távolságra, mint az Alapadatok és az Utómunka"
},
{
"id": "d117a6ceaf",
"at": "2026-11-25T15:52:02+01:00",
"msg": "Díjcsökkentés: a példaesetek az illető munkájához igazodnak (forgatás, fotó, hang, vizuáltechnika, streaming, utómunka) a szerződés 10. pontja szerint, forgatási esetekkel; a projekt Szerződés és számlázás része alapból csukva"
},
{
"id": "1c57c683fc",
"at": "2026-11-25T15:46:01+01:00",
"msg": "Helyszíni beszámoló: a díjcsökkentésnél csak a helyszínen dolgozók (a csak utómunkás vágó nem)"
},
{
"id": "66b1b112d1",
"at": "2026-11-25T15:43:37+01:00",
"msg": "Nyersanyag-levél: darabszám „db”-vel"
},
{
"id": "190a54dbdf",
"at": "2026-11-25T15:43:24+01:00",
"msg": "Nyersanyag-levél: formázott, szerkeszthető előnézet aláírással (mint az ügyfél-levél); a Helyszíni munka „Rendben” jelzése csak áthúzás után, áthúzáskor mindig rákérdez; a piros hiba szövege rövidebb"
},
{
"id": "54d6e4bf5b",
"at": "2026-11-25T15:40:27+01:00",
"msg": "Szabály: a Stáb listában kötelező az e-mail-cím (mentéskor ellenőrzés elöl-hátul; a futó projekteken cím nélküli stábtag piros hibaként)"
},
{
"id": "e900a472b4",
"at": "2026-11-25T15:38:37+01:00",
"msg": "Nyersanyag-levél: a vágó címzett nem vehető ki (mindenképp megkapja)"
},
{
"id": "46d99fb940",
"at": "2026-11-25T15:38:08+01:00",
"msg": "Piros hiba: lezajlott forgatás után a projekt még a Helyszíni munkánál (nyersanyag nincs feltöltve, a vágó nem tud kezdeni); szövegek: „húzd át” a „pipáld ki” helyett"
},
{
"id": "24a0f27dde",
"at": "2026-11-25T15:36:45+01:00",
"msg": "Ablakok: az előre kitöltött szövegdoboz megnyitáskor a tartalmához nő (nem vágódik le)"
},
{
"id": "5e3967f7ed",
"at": "2026-11-25T15:35:15+01:00",
"msg": "Jégvarázs egyszeri visszaállítás kikapcsolva (marad az Utómunkában)"
},
{
"id": "55fed244f3",
"at": "2026-11-25T15:25:05+01:00",
"msg": "Jégvarázs visszaállítás: robusztusabb (név egyezés, „Utómunka alatt” kártya is vissza), az eredmény az ügyvezetőnél megjelenik"
},
{
"id": "5b755bc02c",
"at": "2026-11-25T15:20:16+01:00",
"msg": "„Ellenőrizd” levél: rögtön az utómunkás üzenetével kezdődik"
},
{
"id": "aa2ef75256",
"at": "2026-11-25T15:17:58+01:00",
"msg": "„Ellenőrizd” értesítő a vezetőknek: megszólítás nélkül"
},
{
"id": "857242ec1b",
"at": "2026-11-25T15:16:49+01:00",
"msg": "Nyersanyag-levél: az elavult leadási mondat kikerült"
},
{
"id": "4642cb0f9e",
"at": "2026-11-25T15:03:02+01:00",
"msg": "Jégvarázs Klíma November: egyszeri visszaállítás a Helyszíni munka lépésre (az új nyersanyag-folyamathoz)"
},
{
"id": "a1560ca7ba",
"at": "2026-11-25T15:00:05+01:00",
"msg": "Utómunkába lépés: a vágó mindenképp e-mailt kap; a termelési vezető küldés előtt látja a levelet (feladó, tárgy, címzett, szöveg)"
},
{
"id": "6d35d81798",
"at": "2026-11-25T14:50:24+01:00",
"msg": "Helyszíni munka → Utómunka: beszámoló után „Feltöltötted a nyersanyagot?” (igen: a vágó e-mailt kap, indulhat; még nem: a projekt marad)"
},
{
"id": "42bee9e51b",
"at": "2026-11-25T14:49:09+01:00",
"msg": "Nyersanyag-zár: a projekt Utómunka lépésbe tétele oldja fel (a kártyán nincs külön pipa)"
},
{
"id": "623d40b0b2",
"at": "2026-11-25T14:46:41+01:00",
"msg": "Fájlmegosztás: a projekt keresése a videó objektuma alapján (a videóazonosító projektenként ismétlődhet); hozzászóláskor a háttér is megosztja"
},
{
"id": "13d65064f6",
"at": "2026-11-25T14:42:14+01:00",
"msg": "Nyersanyag: a termelési vezető a zárolt kártyán egy kattintással kipipálja („📦 Nyersanyag feltöltve”), a NAS-levél ablakban e-mail nélkül is; a vágó tudja, kire vár"
},
{
"id": "7e0c85f9cc",
"at": "2026-11-25T14:36:01+01:00",
"msg": "Csatolt fájlok megosztása csak az utómunkásokkal (vágók), értesítő levél nélkül"
},
{
"id": "7ea0ae254d",
"at": "2026-11-25T14:31:13+01:00",
"msg": "Csatolt fájlok csendes megosztása mindenkivel, aki a projekten dolgozik (bármely szerep, a videók vágói); feltöltéskor, küldéskor és a videó megnyitásakor (önjavító)"
},
{
"id": "30d4f08bfe",
"at": "2026-11-25T14:26:09+01:00",
"msg": "Jóváhagyó oldal: a feltöltött fájlok piszkozatként várnak, és a módosításkéréssel / jóváhagyással együtt mennek el (hozzászólás + értesítő); 24 óra után a nem küldöttek a kukába"
},
{
"id": "3e77520e5e",
"at": "2026-11-25T14:21:10+01:00",
"msg": "Jóváhagyó oldal: az időkód mindig kék csipp (dőlt szövegben, listában, kézzel beírva vagy beillesztve is)"
},
{
"id": "499ea8f6da",
"at": "2026-11-25T14:17:14+01:00",
"msg": "Feltöltés: kész fájl zöld pipával (bemutatóban is), belső feltöltés közben a lap bezárása előtt figyelmeztetés"
},
{
"id": "c039c5b0ec",
"at": "2026-11-25T14:09:56+01:00",
"msg": "Csatolmányok ✕: várakozó kimarad, feltöltés alatti megszakad, kész (még el nem küldött) a Drive kukájába kerül; jóváhagyó oldalon is megszakítható"
},
{
"id": "bf97a5ce1f",
"at": "2026-11-25T14:04:26+01:00",
"msg": "Jóváhagyó oldal feltöltései az új fájlkártya-stílusban (és a hozzászólásban kártyaként); vezetői bejegyzések kékek, az ügyfél jóváhagyása zöld"
},
{
"id": "9da0bb08e8",
"at": "2026-11-25T14:00:25+01:00",
"msg": "Fájl csatolásakor a feltöltés sora rögtön látszik (odagörget)"
},
{
"id": "e0ac088bb0",
"at": "2026-11-25T13:58:13+01:00",
"msg": "Csatolt fájl: nem a szövegbe kerül, hanem kártyaként a szövegdoboz alatt (levehető), a hozzászólásban és az e-mailben fájlkártya"
},
{
"id": "e78ca2f67f",
"at": "2026-11-25T12:50:26Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
