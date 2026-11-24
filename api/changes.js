// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "ac4a433a79",
"at": "2026-11-24T19:02:30+01:00",
"msg": "Tagi kölcsön: a kézi „+ Tétel” gomb kikerül"
},
{
"id": "f6cad78e06",
"at": "2026-11-24T18:48:48+01:00",
"msg": "Tagi kölcsön: egyszeri bankkivonat-egyeztetés (2026-11-24)"
},
{
"id": "74049ce505",
"at": "2026-11-24T17:41:35+02:00",
"msg": "Ajánlatkészítés a lehetőségből: a lehetőség ablaka nem tűnik el – halványan alatta marad, és bezáráskor (Esc, ×, Bezárás) azonnal, a beírt adatokkal együtt visszajön"
},
{
"id": "4ca54a9122",
"at": "2026-11-24T16:27:28+02:00",
"msg": "Teljesítménytábla: „Jutalékalap” oszlop, a súgóban tételesen a befolyt összeg és a levont szervezői jutalék / továbbszámlázott költség"
},
{
"id": "ecea68b7e8",
"at": "2026-11-24T16:24:30+02:00",
"msg": "Teljesítménytábla: az ajánlói jutalék is megjelenik (· ajánló sor), összesítő sor a befolyt díjra és a jutalékra, az Arány oszlop magyarázata"
},
{
"id": "4dd854af82",
"at": "2026-11-24T16:09:16+02:00",
"msg": "Lehetőség mentése: az ablak azonnal bezárul (a mentés a háttérben fut, hibánál újranyílik a beírt adatokkal); a HubSpot-frissítés háttérsorba került, a mentés nem vár rá"
},
{
"id": "f09f9f3d9d",
"at": "2026-11-24T15:51:33+02:00",
"msg": "Árajánlat: a lehetőség ablakából indítva bezáráskor visszatér a lehetőséghez (nem lép ki belőle)"
},
{
"id": "5a82953f42",
"at": "2026-11-24T15:48:41+02:00",
"msg": "Többnapos rendezvény: tetszőleges napok kijelölése (nem kell egymás utániaknak lenniük), az ajánlat és a projekt csak a kijelölt napokkal számol"
},
{
"id": "fa67754b08",
"at": "2026-11-24T15:39:35+02:00",
"msg": "E-mail védőháló: ugyanaz a levél 15 percen belül nem megy ki kétszer, hozzászólás-értesítő videónként 10 percenként legfeljebb egy, a napi teendőlevél naponta egyszer, megerősítő gomb dupla kattintás ellen"
},
{
"id": "945b1d0058",
"at": "2026-11-24T15:34:26+02:00",
"msg": "Videó hozzászólás: bezáráskor / továbblépéskor csak a most begépelt szöveg megy el – a visszatöltött régi szöveg magától soha"
},
{
"id": "eff1951f6b",
"at": "2026-11-24T15:31:09+02:00",
"msg": "Hozzászólás: elküldés után a szöveg nem töltődik vissza egy későbbi frissítéskor; ugyanaz a hozzászólás 15 percen belül nem kerül be kétszer; sikertelen küldésnél a szöveg visszakerül"
},
{
"id": "7d7411fbe9",
"at": "2026-11-24T13:28:54Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
