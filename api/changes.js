// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
},
{
"id": "f48ae0b323",
"at": "2026-11-24T22:26:32+01:00",
"msg": "Jóváhagyó oldal: a Google-értékelés kérése kikerült"
},
{
"id": "2490969f51",
"at": "2026-11-24T22:24:59+01:00",
"msg": "Jóváhagyó oldal: a „Mindent leírtál?” alól kikerült az „Elküldés után ennek alapján javítjuk a videót.” mondat"
},
{
"id": "adcb413dd0",
"at": "2026-11-24T22:23:54+01:00",
"msg": "Jóváhagyó oldal: szöveg után az időkód új sorba kerül; azonos időkódnál a kurzor az új időkód mögé áll"
},
{
"id": "7612b78ded",
"at": "2026-11-24T22:21:32+01:00",
"msg": "Jóváhagyó oldal: a „Mindent leírtál?” kérdés a küldés gomb fölé úszik (nem változik a magasság, nem ugrik a szöveg); az „Igen, elküldöm” olyan, mint az „Elküldöm a módosítást”"
},
{
"id": "0aa940e9c3",
"at": "2026-11-24T22:19:28+01:00",
"msg": "Jóváhagyó oldal: a „Mindent leírtál?” kérdés a küldés gomb helyén jelenik meg, a megírt üzenet és a csatolt fájlok látszanak"
},
{
"id": "c99a47abc4",
"at": "2026-11-24T22:12:26+01:00",
"msg": "Jóváhagyó oldal: telefonon a videó címe a videó fölött"
},
{
"id": "09b737435e",
"at": "2026-11-24T22:10:45+01:00",
"msg": "Jóváhagyó oldal: belső előnézetben a fájlfeltöltés folyamatjelzője bemutató (szürke), egyértelmű felirattal"
},
{
"id": "c44e509d8a",
"at": "2026-11-24T22:08:06+01:00",
"msg": "Jóváhagyó oldal: a feltöltött fájl sora nem lesz zöld gomb (osztálynév-ütközés a Jóváhagyom gombbal)"
},
{
"id": "a32a2b1d47",
"at": "2026-11-24T22:03:48+01:00",
"msg": "Jóváhagyó oldal: az Enter újra időkódot szúr be (a videón / az oldalon; a szövegszerkesztőben új sor)"
},
{
"id": "7c615e5bc1",
"at": "2026-11-24T22:01:33+01:00",
"msg": "Jóváhagyó oldal: az Időkód beszúrása gomb visszafogottabb (halványkék)"
},
{
"id": "afa07fc729",
"at": "2026-11-24T21:59:53+01:00",
"msg": "Jóváhagyó oldal: Google Dokumentumok-szerű eszköztár (ikonok), az Időkód beszúrása feltűnő kék gomb külön sorban; az útmutató szöveg visszaállítva"
},
{
"id": "8426c7f914",
"at": "2026-11-24T21:55:07+01:00",
"msg": "Jóváhagyó oldal: új javítási útmutató szöveg; az „Időkód beszúrása” gomb neve visszakerült, az eszköztár így is egy sorban"
},
{
"id": "89394779a0",
"at": "2026-11-24T21:52:22+01:00",
"msg": "Jóváhagyó oldal: Gmail-szerű formázó eszköztár egy sorban az időkód gombbal (betűtípus, méret, félkövér, dőlt, aláhúzott, szín, igazítás, listák, behúzás, áthúzás, formázás törlése); az appban és az e-mailben is így jelenik meg"
},
{
"id": "bed085d6c3",
"at": "2026-11-24T22:39:22+02:00",
"msg": "Jóváhagyó oldal: a formázás szerkesztés közben azonnal látszik (mint egy Word-dokumentumban), időkód kék címkeként; a fájlcsatolás a módosításkérés része"
},
{
"id": "4809b9af3d",
"at": "2026-11-24T21:34:54+01:00",
"msg": "Banki utalásból kiadás: külföldi szolgáltatónál ÁFA nélkül (nettó = utalt összeg); figyelmeztet, ha a hónapban már van hasonló kiadás"
},
{
"id": "9a630fe01b",
"at": "2026-11-24T21:30:40+01:00",
"msg": "Kifizetve, de nincs számla: a Rezsi/Marketing/Elvetés után a tétel nem jön vissza (friss adatból válaszol a szerver, párhuzamos kattintások sem hozzák vissza)"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
