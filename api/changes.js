// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "139ca53b93",
"at": "2026-11-24T11:09:23+02:00",
"msg": "Frissülés: a betöltés eredményét legfeljebb 3-szor dobjuk el közbejött írás miatt (utána mindenképp frissül); az olvasó kérések (gbpList, companyIndex…) nem számítanak írásnak"
},
{
"id": "075b1bfe2c",
"at": "2026-11-24T10:51:29+02:00",
"msg": "Lábléc: a stábnak és a felhasználóknak (külső címen is) szóló levelekben sincs – csak az ügyfeleknek"
},
{
"id": "c28f90cf2d",
"at": "2026-11-24T10:48:44+02:00",
"msg": "Belső (céges címre menő) értesítő levelekben nincs „Ezt az értesítést … küldte” lábléc"
},
{
"id": "ba4c0646b0",
"at": "2026-11-24T09:53:02+02:00",
"msg": "Telefonon a hozzászólások és jegyzetek teljes hosszukban látszanak (nem kis görgethető dobozban) – videó, lehetőség-jegyzetek, napló"
},
{
"id": "7e3962f786",
"at": "2026-11-24T09:52:06+02:00",
"msg": "Telefonos frissülés: a válasz nélkül beragadt kérés (alvás / háttér) nem akasztja meg többé a frissítést – 90 mp időkorlát, a beragadt betöltés és mentés-számláló feloldása"
},
{
"id": "098c3c878a",
"at": "2026-11-24T08:38:41+02:00",
"msg": "Videó hozzászólások: a régi, sérült kódolású ikonok (��) helyreállítva a megjelenítésben"
},
{
"id": "e00ff4590a",
"at": "2026-11-24T08:36:58+02:00",
"msg": "Videó hozzászólások: azonos percben írt üzenet és küldés is összevonódik"
},
{
"id": "29627ee043",
"at": "2026-11-24T08:35:24+02:00",
"msg": "Videó hozzászólások: az ügyfélnek küldés is összevonva az előtte (10 percen belül) írt saját üzenettel"
},
{
"id": "3fe4b24921",
"at": "2026-11-24T08:34:45+02:00",
"msg": "Videó hozzászólások: a vízjel levétele és a fizetős javítás lépései (árajánlat, elfogadás) is kiemelve"
},
{
"id": "9129374797",
"at": "2026-11-24T08:33:42+02:00",
"msg": "Szakember nézet: a „Továbbküldve jóváhagyásra” is ügyfélnek küldésként számít (verziók összevonása, ügyfél-jelölés, címke)"
},
{
"id": "c02b1c2116",
"at": "2026-11-24T08:32:19+02:00",
"msg": "Videó hozzászólások: a csak időkódos visszadobás összevonva az előtte írt hozzászólással (egy bejegyzés, „Visszaküldve a vágónak” címkével)"
},
{
"id": "c14574e446",
"at": "2026-11-24T08:31:00+02:00",
"msg": "Videó hozzászólások: „Ügyfélnek elküldve” és „Ügyfél jóváhagyta” címke is (a szöveg nem ismétli: Címzett: …)"
},
{
"id": "8e360fc529",
"at": "2026-11-24T08:27:03+02:00",
"msg": "Videó hozzászólások: a vágó leadási szövege csak az új verziónál látszik (nem kétszer)"
},
{
"id": "e9a4a7a3c7",
"at": "2026-11-24T08:25:52+02:00",
"msg": "Stáb kártya: 30 napon belüli projektnél a meg nem hívott tagnál piros „Még nincs meghívva · N nap múlva” jelzés"
},
{
"id": "5dbafb56f5",
"at": "2026-11-24T08:23:33+02:00",
"msg": "Videó: verziók v1 / Revision 1 / Revision 2…, a hozzászólásoknál a folyamat lépései színnel és címkével elkülönítve"
},
{
"id": "c0371a0d6e",
"at": "2026-11-24T08:18:35+02:00",
"msg": "Videó verziók: az ügyfélnek küldéskor cserélt link nem új verzió (a háttér sem hoz létre újat; a korábbi ilyen bejegyzéseket a felület összevonja)"
},
{
"id": "ac338b212b",
"at": "2026-11-24T08:06:51+02:00",
"msg": "Rendezvény típusa: Esküvő és Ingatlan"
},
{
"id": "48b9b1792a",
"at": "2026-11-24T08:03:56+02:00",
"msg": "HubSpot visszaírás bővítve: meglévő kapcsolattartó neve/telefonja/cége frissül, az appban írt új jegyzetek HubSpot-jegyzetként a kapcsolattartóhoz és a céghez kerülnek (az appban nem duplán), a „Honnan jött?” a HubSpot forrás-mezőjébe is (ha írható)"
},
{
"id": "e9ddb089cd",
"at": "2026-11-24T07:58:51+02:00",
"msg": "Lehetőség: Szakasz, Esély, Következő lépés és Mikor egy sorban (telefonon 2×2)"
},
{
"id": "1c393296c6",
"at": "2026-11-23T19:16:06+02:00",
"msg": "Árajánlat: általános ajánlatnál nincs Cím mező (és a PDF-en sem szerepel)"
},
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
"id": "230e5f3570",
"at": "2026-11-23T16:53:08Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
