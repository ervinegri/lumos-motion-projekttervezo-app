// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "b111465384",
"at": "2026-11-20T15:35:34+01:00",
"msg": "Javítás: Szerződés és számlázás oldal betöltési hiba (különbözet-doboz hozzáfűzése)"
},
{
"id": "deba3cc7ab",
"at": "2026-11-20T15:28:56+01:00",
"msg": "Számlázás: ha a kiszámlázott nettó összeg eltér a projekt értékétől (pl. utólag megemelt érték), nem 'Lezárva' – Kiszámlázatlan / Túlszámlázva jelzés, számla a különbözetre gomb, figyelmeztetés"
},
{
"id": "ca439f2689",
"at": "2026-11-20T15:26:41+01:00",
"msg": "Elfogadott beosztás: pozíció levétele megerősítéssel + automatikus e-mail a szakembernek; az utolsó pozíciónál lemondás-figyelmeztetés (2.7., 7 napon belül 50% lemondási díj egyéb költségként)"
},
{
"id": "1f877fcbf6",
"at": "2026-11-20T15:21:53+01:00",
"msg": "Saját beosztás: a pozíciók levehetők (nem zárolja az elfogadott meghívás)"
},
{
"id": "627b24e967",
"at": "2026-11-20T15:19:33+01:00",
"msg": "Keretszerződés e-mail: a szerződés PDF-ben megy ki (és PDF-ként kerül a munkatárs dokumentumai közé)"
},
{
"id": "0ce40c3a2b",
"at": "2026-11-20T15:18:52+01:00",
"msg": "Statiszta keretszerződés (cím és feliratok), 7.2 kivétel-mondat törölve; Értékesítők fülön csak a kizárólag értékesítők"
},
{
"id": "35ed6d0a89",
"at": "2026-11-20T15:15:40+01:00",
"msg": "Munkatárs törlése: ha a szerveren már nincs meg, jelzi és frissít"
},
{
"id": "f137323e2d",
"at": "2026-11-20T15:11:51+01:00",
"msg": "Munkatárs űrlap: a Vállalkozás mező nem ajánl fel ügyfél- és más cégeket"
},
{
"id": "be0292ce41",
"at": "2026-11-20T15:10:31+01:00",
"msg": "Statiszta: nincs eszköz (munkatárs űrlapon a Részletek rejtve, projekten nincs eszközblokk)"
},
{
"id": "1b9e2278af",
"at": "2026-11-20T15:07:28+01:00",
"msg": "Új szerződés: az ablak tetején választható a típus (alvállalkozói / modell), a munkatárs-lista ehhez igazodik"
},
{
"id": "514821ded3",
"at": "2026-11-20T15:03:38+01:00",
"msg": "Statiszták alfül (Statiszta szerep) + modell keretszerződés sablon, kitöltés és küldés az appból"
},
{
"id": "7668967e0b",
"at": "2026-11-20T14:57:05+01:00",
"msg": "Székhely-gyorsítótár új kulccsal (a számlából vett cím ne maradjon meg)"
},
{
"id": "14e5a8d1a2",
"at": "2026-11-20T14:56:33+01:00",
"msg": "Keretszerződés: a székhely csak az adószámból (a számlás kiegészítés kivéve)"
},
{
"id": "5b7ee441d6",
"at": "2026-11-20T14:56:08+01:00",
"msg": "Keretszerződés küldése: bal alsó sarokban Letöltés és Megnyitás új lapon gomb"
},
{
"id": "372d887cc3",
"at": "2026-11-20T14:53:29+01:00",
"msg": "Keretszerződés fájlnév: E.V. → EV (egyben)"
},
{
"id": "337e835fe9",
"at": "2026-11-20T14:51:38+01:00",
"msg": "Keretszerződés: a székhely a NAV adózói adataiból, ha ott nincs (egyéni vállalkozó), a munkatárs NAV-ban párosított számlájáról"
},
{
"id": "1afe7928af",
"at": "2026-11-20T14:50:09+01:00",
"msg": "Cmd/Ctrl+S projekten kívül sem nyitja meg a böngésző mentés ablakát"
},
{
"id": "94455ab4d5",
"at": "2026-11-20T14:47:22+01:00",
"msg": "Keretszerződés küldése: szélesebb ablak; aláírásnál mindig a mai dátum (Budapest, ÉÉÉÉ. hónap N.)"
},
{
"id": "5c83e37658",
"at": "2026-11-20T14:46:07+01:00",
"msg": "Új szerződés: a munkatárs választó a kitöltő ablakban (nincs külön lépés); a székhely az adószámból automatikusan betöltődik"
},
{
"id": "c563c124ad",
"at": "2026-11-20T14:32:34+01:00",
"msg": "Projekt oldal: videótábla (kanban) az Alapadatok fölött, utómunka-instrukciókkal"
},
{
"id": "30d2eb731b",
"at": "2026-11-20T14:28:53+01:00",
"msg": "Keretszerződés: 12.6 (eseti felelősségbiztosítás előírása) törölve"
},
{
"id": "0d954781a7",
"at": "2026-11-20T14:27:07+01:00",
"msg": "Keretszerződés 7.5: a közvetlen kapcsolat pontosítása (kiállító, független megbízás, egyeztetés kétség esetén)"
},
{
"id": "c064890045",
"at": "2026-11-20T14:24:57+01:00",
"msg": "Keretszerződés 2.5.5: a kötbér rendezési módját (ledolgozás / kifizetés) a Vállalkozó választja; app-szövegek igazítva"
},
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
"id": "19381becb0",
"at": "2026-11-20T12:53:10Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
