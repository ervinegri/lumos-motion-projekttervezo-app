// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
},
{
"id": "ad97f962bb",
"at": "2026-11-24T22:29:03+02:00",
"msg": "Jóváhagyó oldal: az ügyfél fájlt csatolhat (logó, grafika, arculat, segédlet – max. 300 MB, darabolt feltöltés a projekt Drive-mappájába, link a hozzászólások között, értesítés); a formázott üzenet e-mailben is formázva"
},
{
"id": "10b6dfdf57",
"at": "2026-11-24T21:26:10+01:00",
"msg": "Kifizetve, de még nincs számla: a sorra kattintva megnyílnak az utalás részletei"
},
{
"id": "e00ad03436",
"at": "2026-11-24T22:25:57+02:00",
"msg": "Jóváhagyó oldal: az ügyfél üzenete formázható (félkövér, dőlt, felsorolás, számozott lista, Ctrl/⌘+B/I, élő előnézet); az appban formázva jelenik meg"
},
{
"id": "45f6722ebb",
"at": "2026-11-24T22:23:42+02:00",
"msg": "Kifizetve, de számla nélkül: a „＋ Rezsi / ＋ Marketing” gomb hibánál kiírja az okát, eltérő azonosítónál frissíti a listát"
},
{
"id": "852c30c5b9",
"at": "2026-11-24T20:47:46+02:00",
"msg": "Bejövő díjbekérő: „díjbekérő” és „✓ kifizetve” jelzés a beérkezett számlák között; a később érkező végszámla magától a díjbekérőből rögzített kiadáshoz kapcsolódik"
},
{
"id": "cdb720cee8",
"at": "2026-11-24T20:34:20+02:00",
"msg": "Kifizetve, de még számla nélkül: a díjbekérő alapján utalt összeg banki utalásból kiadásként rögzíthető, a később érkező végszámla ugyanahhoz kapcsolódik; elfogadott meghívásnál az elvállalt szerepkör nem vehető le"
},
{
"id": "cca778506a",
"at": "2026-11-24T20:27:29+02:00",
"msg": "Hiányzó meghívó / beosztás: a figyelmeztetés a Helyszíni munka szakaszban is megjelenik (nem csak Tervezésben)"
},
{
"id": "7358b1d220",
"at": "2026-11-24T18:02:48Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
