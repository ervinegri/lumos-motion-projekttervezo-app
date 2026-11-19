// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "12b01b6952",
"at": "2026-11-19T11:33:46+01:00",
"msg": "Verziók: ugyanannak a fájlnak más paraméterű linkje nem új verzió (Drive/YouTube/Vimeo azonosító szerint), meglévő duplikátumok összevonva"
},
{
"id": "eb98faeac4",
"at": "2026-11-19T11:31:55+01:00",
"msg": "Utómunka-instrukciók: Kész gomb törölve"
},
{
"id": "49929b31ab",
"at": "2026-11-19T11:31:35+01:00",
"msg": "Videótábla: cím nem fut a fogantyú alá"
},
{
"id": "db98bb6a15",
"at": "2026-11-19T11:31:27+01:00",
"msg": "Videótábla: kéz-kurzor csak mozdítható kártyán, ott hoverre emelkedés + fogantyú"
},
{
"id": "beaf81a8f8",
"at": "2026-11-19T11:28:36+01:00",
"msg": "Jóváhagyó oldal: 'Írd le röviden…' hiba eltűnik gépeléskor és a megerősítő ablaknál"
},
{
"id": "96078ef3e8",
"at": "2026-11-19T11:26:40+01:00",
"msg": "Jóváhagyó oldal: módosítás/üzenet minimális hossza feloldva (1 karakter is elég)"
},
{
"id": "96c9072614",
"at": "2026-11-19T11:24:28+01:00",
"msg": "Board kártya: '↩ javítandó' címke törölve (a javítás-jelvény már mutatja)"
},
{
"id": "2484d995c0",
"at": "2026-11-19T11:21:17+01:00",
"msg": "Megerősítő ablak: 'Utána még egy díjmentes kör marad' mondat törölve"
},
{
"id": "ef094a5d17",
"at": "2026-11-19T11:19:33+01:00",
"msg": "Észrevételek 6000 karakterig (eddig 1000/1500-nál levágódott); videóablak címében a javítás száma; jóváhagyó oldalon: két díjmentes javítási kör"
},
{
"id": "1c235d1794",
"at": "2026-11-19T11:16:42+01:00",
"msg": "Videótábla: minden kártya egyforma magas (a nagyobb méret), a vágó neve alul"
},
{
"id": "6886114f4a",
"at": "2026-11-19T11:14:48+01:00",
"msg": "Videótábla kártya: nincs „▶ videó” és hozzászólás-szám"
},
{
"id": "26d5b23110",
"at": "2026-11-19T11:12:44+01:00",
"msg": "Videótábla: az 1. javítás jelvénye sárga, a 2.-tól piros"
},
{
"id": "07ffbe9310",
"at": "2026-11-19T11:09:31+01:00",
"msg": "Jóváhagyó oldal: a „projektet lezártuk” csak akkor, ha a projekt minden videója jóvá van hagyva (külön linken küldött videókat is figyeli)"
},
{
"id": "6873074405",
"at": "2026-11-19T11:08:33+01:00",
"msg": "Jóváhagyó oldal: a második javítástól sorszám a címben (– 2. javítás, – 3. javítás…)"
},
{
"id": "81724d98f0",
"at": "2026-11-19T11:06:41+01:00",
"msg": "Jóváhagyó oldal: javított változat címe „… – javítás”"
},
{
"id": "04b8c0abaa",
"at": "2026-11-19T11:06:21+01:00",
"msg": "Jóváhagyó oldal: „Még vannak észrevételeim” gomb"
},
{
"id": "e97b2d1e6f",
"at": "2026-11-19T11:05:39+01:00",
"msg": "Jóváhagyó oldal: javított változatnál a cím mellett „N. javítás” címke"
},
{
"id": "8c6cadfb70",
"at": "2026-11-19T11:03:48+01:00",
"msg": "Jóváhagyó oldal: jóváhagyás után „Ezzel a projektet lezártuk. Köszönjük a közös munkát!” (több videónál: a többire még vár)"
},
{
"id": "133c32ff7c",
"at": "2026-11-19T11:02:29+01:00",
"msg": "Jóváhagyó oldal: útmutató szöveg finomítása"
},
{
"id": "7372a336f0",
"at": "2026-11-19T11:01:38+01:00",
"msg": "Jóváhagyó oldal: a díjmentes körök elfogytak figyelmeztetés piros"
},
{
"id": "5a44440d30",
"at": "2026-11-19T11:01:21+01:00",
"msg": "Jóváhagyó oldal: módosítás küldése előtt megerősítés („Mindent leírtál?”) a javítási kör szerinti szöveggel"
},
{
"id": "61b6382f74",
"at": "2026-11-19T10:58:34+01:00",
"msg": "Jóváhagyó oldal: új útmutató szöveg a módosításkérésnél (több változtatás, végén az Elküldöm a módosítást gomb)"
},
{
"id": "46ffee2472",
"at": "2026-11-19T10:55:06+01:00",
"msg": "Jóváhagyó oldal: bemutató mód (?demo=1) – az ügyfél felülete valódi működéssel, de semmi nem megy a háttérbe; több javításkérés és a figyelmeztetések kipróbálhatók"
},
{
"id": "9ef9a71004",
"at": "2026-11-19T10:49:50+01:00",
"msg": "Meghívó e-mail: a helyszín kattintható (Google Térkép)"
},
{
"id": "158a5dabef",
"at": "2026-11-19T10:47:54+01:00",
"msg": "Meghívó előnézet: Mégse és Küldés gomb"
},
{
"id": "f24ca40fc9",
"at": "2026-11-19T10:44:27+01:00",
"msg": "Meghívó e-mail: a díj nem szerepel benne (az appban a meghívás sávjában továbbra is látszik)"
},
{
"id": "bb3860141f",
"at": "2026-11-19T10:10:00+01:00",
"msg": "Beillesztés: a számozott / felsorolt lista beljebb kezdődik, mint a sima bekezdés (mint a levélben), az alpontok még beljebb"
},
{
"id": "1a950d8c10",
"at": "2026-11-19T10:07:59+01:00",
"msg": "Értékesítés: a jutalék a fizetéstől számít – a havi csempe a befolyt összeg utáni jutalékot és a kifizetett alapot mutatja, a szerződött jutalék csak tájékoztató"
},
{
"id": "e052bfdf39",
"at": "2026-11-19T10:06:59+01:00",
"msg": "Beillesztés levélből (Gmail): az alpontok behúzása megmarad (a lista elemein lévő margó nem írja felül a beágyazást; a lista mellé tett allista is behúzva)"
},
{
"id": "51ad29eeee",
"at": "2026-11-19T10:49:24+02:00",
"msg": "Beillesztés: a behúzott alpontok szintje is megmarad (Google Docs aria-level, Word mso-list / margin-left, számozás folytatása); a hozzászólásban és az értesítő levélben is látszik a behúzás"
},
{
"id": "873aa5b92e",
"at": "2026-11-19T08:46:04Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
