// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
},
{
"id": "ee1264252c",
"at": "2026-11-28T11:00:41+01:00",
"msg": "Árajánlat angolul külföldi ügyfélnek: nyelvválasztó, angol PDF/levél/aláírás, HUF, nettó árak fordított adózási megjegyzéssel"
},
{
"id": "ef4d73e88e",
"at": "2026-11-28T10:56:38+01:00",
"msg": "Lehetőségből ügyfél felvétele (adatok átvétele, külföldi hívószámnál külföldi cég); Külföldi cég kapcsoló az adószám címkéje mellé"
},
{
"id": "e5c3953c92",
"at": "2026-11-28T10:51:12+01:00",
"msg": "Angol szerződés: külföldi ügyfélnél nettó díjak, fordított adózási / no Hungarian VAT megjegyzés"
},
{
"id": "1b7d0f38ec",
"at": "2026-11-28T10:48:51+01:00",
"msg": "Szerződés: angol nyelvű változat külföldi ügyfélnek (Lumos sablonok _en, nyelvválasztó, angol szövegek, dátum, áfa-megjegyzés, levél)"
},
{
"id": "e12ef9dd5c",
"at": "2026-11-28T10:43:05+01:00",
"msg": "Videótábla: húzás közben automatikus görgetés a szélek felé (telefonon a képen kívüli oszlopba is)"
},
{
"id": "d5cdf95ccc",
"at": "2026-11-28T10:40:58+01:00",
"msg": "Külföldi ügyfél: az ország a választóban is látszik"
},
{
"id": "724cec3e9c",
"at": "2026-11-28T10:37:49+01:00",
"msg": "Külföldi ügyfél: kapcsoló + ország, EU VIES-ellenőrzés, pénzügyi jelzés (fordított adózás / EU-n kívül), számla: EUFAD37/HO kulcs, közösségi adószám, angol nyelvű számla"
},
{
"id": "adebb2f06a",
"at": "2026-11-28T10:32:02+01:00",
"msg": "Csengő: az értesítések lenyílója közvetlenül a csengő alatt"
},
{
"id": "cd4194668a",
"at": "2026-11-28T10:29:24+01:00",
"msg": "Telefonszám: országhívószám választható (kereshető lista a zászlóra kattintva)"
},
{
"id": "6da23309dc",
"at": "2026-11-28T10:24:54+01:00",
"msg": "Csengő javítása (egy megjegyzés kikommentelte a lista betöltését)"
},
{
"id": "ae96f21bad",
"at": "2026-11-28T10:08:45+01:00",
"msg": "Tablet: a szél nélküli nézet csak a projektoldalon (a pénzügyi táblázatok nem csúsznak szét)"
},
{
"id": "d270677a1b",
"at": "2026-11-28T10:07:56+01:00",
"msg": "Csengő betöltés közben is látszik; Fizetések táblázat kerete pontosan a képernyő aljáig (iPad)"
},
{
"id": "523dd7104f",
"at": "2026-11-28T10:04:12+01:00",
"msg": "Csengő: a látott/olvasott értesítések eszközök között szinkronban (iPaden se jönnek elő a régiek)"
},
{
"id": "7e218cd192",
"at": "2026-11-28T10:01:55+01:00",
"msg": "Tablet: szélek nélkül (a panelek a képernyő széléig); videóablak fejléce az iPad állapotsora alatt olvasható"
},
{
"id": "e4c017d511",
"at": "2026-11-28T09:54:51+01:00",
"msg": "Tablet nézet: keskeny oldalsó margó"
},
{
"id": "701ab24267",
"at": "2026-11-28T09:48:41+01:00",
"msg": "Értékelés-emlékeztető: csak az értékelések betöltése után, ügyfélnév-egyezés Kft./ékezet nélkül; egyetlen tételnél nincs lenyitás a projektlistában"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
module.exports.items = ITEMS;   // a gyors út (api/_gasrt.js) innen olvassa
