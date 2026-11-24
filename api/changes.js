// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "61e32b3902",
"at": "2026-11-24T06:18:45Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
