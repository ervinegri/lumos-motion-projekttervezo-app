// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "97e6cee460",
"at": "2026-11-21T18:08:07+01:00",
"msg": "Feltöltés: a fájlok mérethatára 10 helyett 30 MB"
},
{
"id": "ec442d4877",
"at": "2026-11-21T17:00:17+01:00",
"msg": "Videó: korábbi verzió törölhető (ügyvezető, termelési vezető) – pl. próbából bent maradt fájl"
},
{
"id": "c286725ba3",
"at": "2026-11-21T11:03:49+01:00",
"msg": "Ellenőrzés: bejövő számlák beérkezési késése"
},
{
"id": "9bb38dd268",
"at": "2026-11-21T11:01:05+01:00",
"msg": "Ellenőrzés: bejövő számlák PDF-elérhetősége"
},
{
"id": "4edc2a0bce",
"at": "2026-11-21T10:26:51+01:00",
"msg": "Ellenőrzés (csak olvasás): NAV-ból párosított szakemberszámlák vs. számlázz.hu bejövő bizonylatok"
},
{
"id": "05e4f5fd79",
"at": "2026-11-21T10:24:42+01:00",
"msg": "Felület: „pozíció” helyett „szerepkör” mindenhol"
},
{
"id": "3ae91de496",
"at": "2026-11-21T10:23:54+01:00",
"msg": "Stáb: eszközök visszazárása újraküldés nélkül; ⚙️ menüben „Pozíció eltávolítása”"
},
{
"id": "33a560324d",
"at": "2026-11-21T10:22:10+01:00",
"msg": "Jóváhagyó oldal: elküldött kérésnél az oldal nem görgethető, a kérés doboza 30%-kal szélesebb és magában görgethető"
},
{
"id": "902919abd3",
"at": "2026-11-21T10:21:23+01:00",
"msg": "Stáb: véglegesített (lakatolt) eszközöknél a pozíció és a szakember csak feloldás után vehető le"
},
{
"id": "6a20192ae1",
"at": "2026-11-21T10:18:46+01:00",
"msg": "Jóváhagyó oldal: a köszönő üzenet alatt az ügyfél módosítási kérése"
},
{
"id": "fbbcc44c70",
"at": "2026-11-21T10:15:47+01:00",
"msg": "Fizetős javítás: ha az ügyfél nem kéri, az utolsó változat automatikusan jóváhagyva"
},
{
"id": "9f93309faf",
"at": "2026-11-21T10:13:02+01:00",
"msg": "Fizetős (3.+) javítás: árajánlatig zárolva; az ügyvezető küldi az ajánlatot, az ügyfél online fogadja el vagy utasítja el, elfogadáskor automatikusan feloldódik és extraként a projekthez kerül; köszönő üzenet semleges színnel"
},
{
"id": "971c6a0087",
"at": "2026-11-21T10:05:26+01:00",
"msg": "Jóváhagyó oldal: képkocka-léptetéskor eltűnik a vezérlő és a sötét réteg (egérmozgásra visszajön)"
},
{
"id": "8d03ce7afc",
"at": "2026-11-21T10:04:48+01:00",
"msg": "Jóváhagyó oldal: a köszönő üzenet pontosan a képernyő közepén"
},
{
"id": "a19633561a",
"at": "2026-11-21T10:03:44+01:00",
"msg": "Jóváhagyó oldal: az utolsó díjmentes kör szövegének átfogalmazása"
},
{
"id": "385c019cf7",
"at": "2026-11-21T10:03:00+01:00",
"msg": "Jóváhagyó oldal: módosítás elküldése után csak a köszönő üzenet látszik, középen"
},
{
"id": "85eae8cc1e",
"at": "2026-11-21T10:01:34+01:00",
"msg": "Jóváhagyó oldal: ← / → egy képkockát lép (megállítva), Shift-tel 1 mp"
},
{
"id": "8fd3e18eef",
"at": "2026-11-21T10:00:59+01:00",
"msg": "Jóváhagyó oldal: 30%-kal szélesebb oldalsáv / szövegmező"
},
{
"id": "68b9e347e5",
"at": "2026-11-21T09:59:57+01:00",
"msg": "Jóváhagyó oldal: ← / → nyilakkal 5 mp vissza / előre (Shift-tel 1 mp)"
},
{
"id": "e123f7f9c0",
"at": "2026-11-21T09:58:20+01:00",
"msg": "Jóváhagyó oldal: „2. javítási kör” felirat rövidítése"
},
{
"id": "206ed5c42d",
"at": "2026-11-21T09:57:31+01:00",
"msg": "Jóváhagyó oldal: „1. javítási kör” felirat rövidítése"
},
{
"id": "29615a1b62",
"at": "2026-11-21T09:56:52+01:00",
"msg": "Jóváhagyó oldal: kék „1. / 2. javítási kör” jelzés a javításkérésnél; a csúszkára kattintva megáll a videó"
},
{
"id": "2af5422894",
"at": "2026-11-21T09:54:21+01:00",
"msg": "Jóváhagyó oldal: az „egyetlen üzenetben” mondat törölve"
},
{
"id": "dd6c5c0960",
"at": "2026-11-21T09:53:59+01:00",
"msg": "Jóváhagyó oldal: az „egyetlen üzenetben” mondat nem félkövér"
},
{
"id": "e7d5093153",
"at": "2026-11-21T09:53:19+01:00",
"msg": "Jóváhagyó oldal: a díjmentes körök elfogyása után nem jelenik meg az általános javítási útmutató"
},
{
"id": "19aff0c071",
"at": "2026-11-21T09:52:34+01:00",
"msg": "Jóváhagyó oldal: a javítási útmutató nagyobb betűvel, kiemelve, hogy egyetlen üzenetben kell leírni minden módosítást"
},
{
"id": "e9afa0e737",
"at": "2026-11-21T09:51:06+01:00",
"msg": "Videóverziók: pCloud-linkeknél is rögzül és váltható a verzió; ‹ › lapozás a verziók között"
},
{
"id": "40e36d94b0",
"at": "2026-11-21T09:49:27+01:00",
"msg": "Jóváhagyó oldal: a „Mindent leírtál?” megerősítés eredeti szövege marad, a felső figyelmeztető doboz törölve"
},
{
"id": "0ea0122e1b",
"at": "2026-11-21T09:48:57+01:00",
"msg": "Videócím: „– javítás 1”, „– javítás 2” (az ügyfél oldalán és a belső ablakban is)"
},
{
"id": "e7fec0c869",
"at": "2026-11-21T09:48:03+01:00",
"msg": "Jóváhagyó oldal: az utolsó díjmentes kör figyelmeztetése a „Mindent leírtál?” megerősítésbe került"
},
{
"id": "fef3b8374d",
"at": "2026-11-21T08:33:57Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
