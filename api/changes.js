// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "4c5fbd35ea",
"at": "2026-11-25T13:50:16+01:00",
"msg": "Videó-hozzászólások: az ügyfél minden bejegyzése (megnyitás, sima hozzászólás) sárga; feltöltésnél százalék és MB"
},
{
"id": "64519f078f",
"at": "2026-11-25T12:24:58+01:00",
"msg": "Videó-hozzászólás: fájl csatolása (Drive „Anyagok a vágáshoz”, link a hozzászólásba, húzással is); hosszú linkek rövidítve, a felsorolás tördelése nem esik szét"
},
{
"id": "7d9edc75d6",
"at": "2026-11-25T12:11:53+01:00",
"msg": "Díjösszesítő-ablak: rendezett tördelés az előző hónapok sorával; korrekció / kiküldés után minden nyitott nézet frissül, a nyitott előnézet a friss adatból"
},
{
"id": "7ef6d5697d",
"at": "2026-11-25T12:05:16+01:00",
"msg": "Díjösszesítő: az előző hónapok még ki nem számlázott összege is belefoglalható (egy számla), a belefoglalt hónap az egyenlegben nem számít kétszer"
},
{
"id": "7bcc08bc66",
"at": "2026-11-25T11:34:25+01:00",
"msg": "Jóváhagyó oldal: a „Mindent leírtál?” kérdés alatt végzett javítás is elmegy (eddig a gombnyomáskori szöveg ment el); időkód dupla kattintással átírható"
},
{
"id": "ac9845e918",
"at": "2026-11-25T09:51:13Z",
"msg": "Háttérkód telepítési állapota: rendben"
},
{
"id": "d322eb7568",
"at": "2026-11-25T09:53:14+01:00",
"msg": "Háttér-telepítés: sikertelen telepítésnél (pl. 200 verziós korlát) piros figyelmeztetés az ügyvezetőnek az appban"
},
{
"id": "dfc75b4dcc",
"at": "2026-11-25T09:45:29+01:00",
"msg": "Kiküldött ajánlatok: az ügyfélnek küldött összes ajánlat tartósan elmentve (levelekből automatikus import), a lista a mentett adatokból"
},
{
"id": "8dd96017c5",
"at": "2026-11-25T09:39:27+01:00",
"msg": "Lehetőség ablak: az új ajánlat gombja lent (ha már ment ki ajánlat, az „Árajánlat készítése” helyén)"
},
{
"id": "3016ee5b4f",
"at": "2026-11-25T09:37:24+01:00",
"msg": "Kiküldött ajánlatok: szélesebb Gmail-keresés, és ha nincs találat, kiírja mit keresett"
},
{
"id": "19fff20157",
"at": "2026-11-25T09:34:01+01:00",
"msg": "Lehetőség ablak: a kiküldött ajánlatok listája betöltés / hiba / üres állapotot is mutat"
},
{
"id": "40d48eed10",
"at": "2026-11-25T09:12:55+01:00",
"msg": "Lehetőség ablak: az ügyfélnek kiküldött összes ajánlat-levél listája a Gmailből (kattintásra a PDF)"
},
{
"id": "759d70ecb6",
"at": "2026-11-25T09:05:32+01:00",
"msg": "Árajánlat: + Tétel nem ugrik a lap tetejére; tételek sorrendje húzással; a lehetőségnél korábban kiküldött (felülírt) ajánlatok is megmaradnak és megnyithatók"
},
{
"id": "91b1e0cbec",
"at": "2026-11-25T08:06:09+01:00",
"msg": "Lehetőség kártya: az „Új ajánlat ennek az ügyfélnek” gomb csak a megnyitott lehetőség ablakában"
},
{
"id": "b31750a8da",
"at": "2026-11-25T08:05:13+01:00",
"msg": "Lehetőség ablak: az ügyfél ajánlatainak listája (kiküldött / mentett, kattintásra megnyílik) és „＋ Új ajánlat ennek az ügyfélnek” gomb"
},
{
"id": "7a6097396f",
"at": "2026-11-25T07:58:06+01:00",
"msg": "Értékesítés: „＋ Új ajánlat ennek az ügyfélnek” a lehetőség kártyán – új lehetőség az ügyfél és a kapcsolattartó adataival, utána rögtön az árajánlat"
},
{
"id": "26699782ca",
"at": "2026-11-25T07:51:25+01:00",
"msg": "Jóváhagyó oldal: „A projektet lezártuk.”"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
