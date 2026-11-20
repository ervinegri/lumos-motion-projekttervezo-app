// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "e2264fa1bc",
"at": "2026-11-20T13:52:52+01:00",
"msg": "Keretszerződés-sablon: 2.8 Előfoglalás pont (30 napos véglegesítés, 48 órás elsőbbség, díjmentes visszavonás)"
},
{
"id": "5d65cacfe7",
"at": "2026-11-20T10:27:18+02:00",
"msg": "Google-értékelés: a jóváhagyó oldalon, ha a projekt minden videója jóváhagyva, értékelés-kérő doboz; átadás után 4 nappal egyetlen kérő levél a kapcsolattartónak (ha nem nyitotta meg, és fél éven belül nem kértünk az ügyféltől); rögzül a kérés és a megnyitás"
},
{
"id": "68c93693a5",
"at": "2026-11-20T10:14:38+02:00",
"msg": "pCloud fájlnév-hiba: a felugró üzenet nem takarja el a hibás nevek listáját"
},
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
"id": "88b4f13de8",
"at": "2026-11-20T08:05:00Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
