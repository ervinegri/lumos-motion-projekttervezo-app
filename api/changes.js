// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "3f4bf7fa88",
"at": "2026-11-28T14:57:26+01:00",
"msg": "Jóváhagyó oldal telefonon: kompakt fejléc (kis logó, mellette cím és adatok, rövidebb linkmásolás)"
},
{
"id": "91552540a4",
"at": "2026-11-28T14:38:06+01:00",
"msg": "Módosításkérés: elküldés után a hozzászólás-mező nem töltődik vissza (nem látszik kétszer)"
},
{
"id": "96255e5429",
"at": "2026-11-28T14:31:41+01:00",
"msg": "Kiküldött ajánlatok: csak ajánlat-levelek (számla, díjbekérő, szerződés nem); a tévesen elmentettek kiszűrve"
},
{
"id": "27e7bdf27e",
"at": "2026-11-28T14:27:05+01:00",
"msg": "MNB: a font (és a többi deviza) a lap további tábláiból is beolvasva; diagnosztika eltávolítva"
},
{
"id": "7a4bcb2bee",
"at": "2026-11-28T14:24:24+01:00",
"msg": "MNB: ideiglenes diagnosztika a font-árfolyamhoz"
},
{
"id": "8855de2e08",
"at": "2026-11-28T14:22:43+01:00",
"msg": "Ajánlat PDF: a készítőnél cím helyett e-mail-cím; az alsó aláírás-blokk törölve"
},
{
"id": "7bf15aa010",
"at": "2026-11-28T14:22:19+01:00",
"msg": "MNB-árfolyam: előtöltés mindhárom devizára, automatikus újrapróbálás, SOAP-tartalék, hosszabb CDN-gyorsítótár; devizánként megmaradó kézi árak; adószám feketével; kiküldött ajánlat naplósora és e-mailje egy bejegyzésben, csatolt PDF-fel"
},
{
"id": "8edf205286",
"at": "2026-11-28T14:19:45+01:00",
"msg": "Árajánlat devizaválasztó: pénznemjelek (Ft, €, $, £)"
},
{
"id": "75c7010ca1",
"at": "2026-11-28T14:19:31+01:00",
"msg": "Visszatérő ablak villanás nélkül; letiltott Mentés nem reagál rámutatásra; HubSpot: mentéskor Legitimate interest – Lead jogalap a kapcsolattartónál"
},
{
"id": "5a44072b43",
"at": "2026-11-28T14:18:08+01:00",
"msg": "Projektek fül: piros szám, ha videó vár belső ellenőrzésre (ügyvezető, termelési vezető)"
},
{
"id": "e7d35b50e7",
"at": "2026-11-28T14:16:24+01:00",
"msg": "Értékelési QR: ügyfélnek mutatható kártya (logó, 5 csillag, kérés), nyomtatható PNG; a Link másolása gomb eltávolítva"
},
{
"id": "52c56c3fe5",
"at": "2026-11-28T14:15:06+01:00",
"msg": "Árajánlat: külön nyelv (magyar / angol / német) és deviza (forint / euró / dollár / font) választó; német PDF, levél és aláírás; USD/GBP MNB-árfolyam"
},
{
"id": "580a2fd334",
"at": "2026-11-28T14:10:19+01:00",
"msg": "Kompakt fejléc a lehetőség ablakában és a jegyzetek teljes képernyős nézetében; az ajánlatsorban nincs külön „Ajánlat kiküldve” szakasz"
},
{
"id": "50014a3d9e",
"at": "2026-11-28T14:07:39+01:00",
"msg": "Lehetőség jegyzetei: a kiküldött árajánlat naplósora nem törölhető (felület + háttér)"
},
{
"id": "072998a1b8",
"at": "2026-11-28T14:05:59+01:00",
"msg": "Új ajánlat ugyanennél a lehetőségnél (a legutóbbi kiküldött alapján); kompakt ajánlatnéző fejléc; ajánlaton a készítő neve, adószám a cégnév mellett; jegyzetek teljes képernyőn; felesleges napválasztó-tipp törölve"
},
{
"id": "e8e04766dd",
"at": "2026-11-28T14:01:25+01:00",
"msg": "Árajánlat: nyelv és pénznem egy választóban (Magyar · Ft / English · HUF / English · EUR)"
},
{
"id": "ff4d647a9c",
"at": "2026-11-28T13:59:56+01:00",
"msg": "Lehetőség: a kiküldött ajánlat PDF-je és a PDF-megjelenítő már az ablak megnyitásakor töltődik"
},
{
"id": "e4775a70b7",
"at": "2026-11-28T13:57:14+01:00",
"msg": "Lehetőség: ajánlatok egy listában (a lehetőség sora a legutóbbi kiküldés, korábbiak alatta); a redundáns Kiküldött ajánlat gomb törölve"
},
{
"id": "06fbb265c8",
"at": "2026-11-28T13:56:08+01:00",
"msg": "Lehetőség: Kiküldött ajánlatok lista azonnal (megjegyzett eredmény, háttérfrissítés, előtöltés a kártyára mutatva)"
},
{
"id": "a19b2b5537",
"at": "2026-11-28T13:55:09+01:00",
"msg": "Kiküldött ajánlat: bezáráskor visszatér a lehetőség ablakára"
},
{
"id": "33163fcd4e",
"at": "2026-11-28T13:53:26+01:00",
"msg": "Lehetőség: mentés után nyitva marad; kiküldött ajánlatok előtöltése; új projekt előfoglalásként a lehetőségből"
},
{
"id": "4aced791e0",
"at": "2026-11-28T13:32:20+01:00",
"msg": "Teljes képernyős videó-/fotóablak: 861–1099px (keskenyebben a telefonos elrendezés marad)"
},
{
"id": "c815f23d56",
"at": "2026-11-28T13:32:10+01:00",
"msg": "Videó-/fotóablak közepes szélességen (701–1099px) is teljes képernyős"
},
{
"id": "ff13088044",
"at": "2026-11-28T13:41:48+02:00",
"msg": "Fizetendő forintösszeg és fizetési feltételek az eurós ajánlat PDF-jén"
},
{
"id": "cfb2cf48f3",
"at": "2026-11-28T13:28:51+02:00",
"msg": "Közvetlen EUR-ár, automatikus MNB-árfolyam és nettó nézet a külföldi ajánlatokhoz"
},
{
"id": "9ed2936abf",
"at": "2026-11-28T13:21:41+02:00",
"msg": "Eurós ajánlat kiküldése közvetlen árral, külföldi nettó tételek"
},
{
"id": "2ec70c969a",
"at": "2026-11-28T13:12:07+02:00",
"msg": "Árajánlat euróban, ajánlatonként rögzített árfolyammal"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
module.exports.items = ITEMS;   // a gyors út (api/_gasrt.js) innen olvassa
