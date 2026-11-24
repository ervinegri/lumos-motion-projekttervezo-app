// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "9d842c00c1",
"at": "2026-11-24T15:28:42+02:00",
"msg": "Videótábla: megnyitáskor és a lapra visszatéréskor azonnal ellenőrzi a változásokat (pl. friss ellenőrzésre küldés)"
},
{
"id": "722e21f78d",
"at": "2026-11-24T15:27:48+02:00",
"msg": "Árajánlat: többnapos rendezvénynél a Rendezvény dobozban kiemelt „N napos rendezvény” jelzés és a teljes időszak (a kalkulátor napjaiból is)"
},
{
"id": "b680481d53",
"at": "2026-11-24T14:47:46+02:00",
"msg": "Új verzió: a régóta nyitott lap magától frissül egy nyugodt pillanatban (nincs nyitott ablak, nem gépel, 1,5 perce nem használják vagy visszatér a lapra)"
},
{
"id": "df15233cc9",
"at": "2026-11-24T14:43:17+02:00",
"msg": "Árajánlat: a tételek leírása nagyobb és sötétebb (jobban olvasható)"
},
{
"id": "5eed472ec4",
"at": "2026-11-24T12:56:17+02:00",
"msg": "Árajánlat: a „Tovább” után a kalkulátor azonnal nyílik (mentett ajánlat nélkül nem vár a szerverre), töltés közben az ablak látszik"
},
{
"id": "242b9d7942",
"at": "2026-11-24T12:51:08+02:00",
"msg": "Többnapos rendezvény a lehetőségnél és az árajánlatban: napok kijelölése, a kalkulátor naponta számol, a projekt minden napja bekerül"
},
{
"id": "e77d62bf3c",
"at": "2026-11-24T12:23:38+02:00",
"msg": "Projektek telefonon: az állapotcímke és a videóösszesítő egy sorban, tömörebben"
},
{
"id": "b7945a377e",
"at": "2026-11-24T11:53:22+02:00",
"msg": "Projektek telefonon: a hónap-elválasztó sorok elmaradnak (a dátumblokk mutatja a hónapot)"
},
{
"id": "c5defea26d",
"at": "2026-11-24T11:51:43+02:00",
"msg": "Projektek telefonon: kereső és „+ Új” gomb egy sorban (a fölösleges cím és fejléc nélkül)"
},
{
"id": "d20c8a8feb",
"at": "2026-11-24T11:50:38+02:00",
"msg": "Lehúzás-frissítés: iOS-en a töredék görgetési érték (pl. 0,33) nem tiltja le"
},
{
"id": "221e97cd17",
"at": "2026-11-24T11:47:20+02:00",
"msg": "Csengő: megnyitás után olvasott marad frissítés után is (a később betöltődő kifizetések / értékelések is; az olvasottak listája nem íródik felül)"
},
{
"id": "5b715fa698",
"at": "2026-11-24T11:46:47+02:00",
"msg": "Lehúzás-frissítés telefonon: kisebb húzási küszöb (iOS rugalmas túlhúzás), a beragadt videó-áthelyezés számláló nem tiltja tovább"
},
{
"id": "623b1c07b6",
"at": "2026-11-24T11:17:18+02:00",
"msg": "Telefon: a csengő lenyílója akkor is megjelenik, ha a fejléc oldalra van görgetve (a lap tetejére kerül, nem vágja le a fejléc)"
},
{
"id": "bc3b801c65",
"at": "2026-11-24T11:13:19+02:00",
"msg": "Részletek-napló: pontos változások (termelői díj: kinek, mennyiről mennyire; JSON-mezők tételesen; a csak formai változás nem kerül be); az automatikus lépés külön jelölve"
},
{
"id": "19793f1eb0",
"at": "2026-11-24T09:09:34Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
