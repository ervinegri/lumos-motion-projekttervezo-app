// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
},
{
"id": "8eab205f11",
"at": "2026-11-28T09:46:06+01:00",
"msg": "Videónevek rendbetétele a háttérben: egyetlen azonos fajtánál sorszám nélkül, többnél az azonosító szerinti sorszám (egyszeri javítás a futó projekteken)"
},
{
"id": "462b752734",
"at": "2026-11-28T09:44:48+01:00",
"msg": "Táblán: egyetlen azonos fajta videónál sorszám nélküli név"
},
{
"id": "4f12556db0",
"at": "2026-11-28T09:41:41+01:00",
"msg": "Projektlista: lezárt projekt állapot-sávja is szürke"
},
{
"id": "0b38c36812",
"at": "2026-11-28T09:39:29+01:00",
"msg": "Google-értékelés párosítása az értékelést kérő levél címzettje / megszólítása alapján is; mentetlen projektnél nem nyúlik meg a Szolgáltatások panel alja"
},
{
"id": "56b8f18a14",
"at": "2026-11-28T09:33:52+01:00",
"msg": "Utómunka tábla a projektoldalon: a videók számának módosítása mentés előtt is azonnal látszik (új kártyák szaggatottan)"
},
{
"id": "71be14431b",
"at": "2026-11-28T09:31:46+01:00",
"msg": "Helyszínen kért feladat rögzítése: megerősítő ablak nélkül"
},
{
"id": "0cff8d0bbe",
"at": "2026-11-28T09:30:25+01:00",
"msg": "Lezajlott rendezvény feloldva: nem szürke, az operatőr kiválasztható; Szolgáltatások zöld; a táblán a videó neve terjedelem nélkül"
},
{
"id": "478795cb16",
"at": "2026-11-28T08:26:40Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
module.exports.items = ITEMS;   // a gyors út (api/_gasrt.js) innen olvassa
