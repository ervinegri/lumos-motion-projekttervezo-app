// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "d36f0b3a85",
"at": "2026-11-19T10:45:54+02:00",
"msg": "Naptárválasz-emlékeztető: rövidebb szöveg"
},
{
"id": "7973e10db9",
"at": "2026-11-19T10:45:30+02:00",
"msg": "Beillesztés szövegdobozba (jóváhagyó oldal és az app): a Wordből / Docsból / levélből másolt felsorolás, számozás, bekezdés és üres sor megmarad"
},
{
"id": "8859b1cbba",
"at": "2026-11-19T10:43:49+02:00",
"msg": "Videóablak: „💬 Hozzászólás küldése” gomb a mező alatt; az alsó sor (Időkód · Jelölés · Bezárás) mindig a dobozon belül marad"
},
{
"id": "60a3082436",
"at": "2026-11-19T10:40:04+02:00",
"msg": "Meghívás: a Google Naptárban adott „Igen” / „Nem” már nem elfogadás / elutasítás (a díj csak a Projekttervezőben látszik) – helyette egyszeri jelzés a meghívónak és emlékeztető a szakembernek; a levélből és a felületről kikerült a naptáras elfogadás"
},
{
"id": "e014b5c502",
"at": "2026-11-19T10:28:31+02:00",
"msg": "Meghívás: a szakember a saját díját látja a meghívás sávjában, a felugró meghívásban és a meghívó e-mailben („az elfogadással ezt a díjat fogadod el”); az elfogadott díjat az app rögzíti"
},
{
"id": "1b2061afb3",
"at": "2026-11-19T10:00:46+02:00",
"msg": "Elfogadott projekt visszamondása az appban („Mégsem tudom vállalni”): a keretszerződés feltételei (30 napnál korábban évente 2× díjmentes, 30–15 nap 50%, 15 napon belül 100% kötbér), kötelező indoklás, e-mail a meghívónak és az ügyvezetőnek; a vezetői kártyán látszik"
},
{
"id": "405717d15e",
"at": "2026-11-19T09:36:21+02:00",
"msg": "Jóváhagyó oldal: díjas javítás szövege (Ervin megfogalmazása)"
},
{
"id": "1371a7c833",
"at": "2026-11-19T09:34:09+02:00",
"msg": "Jóváhagyó oldal: „az elfogadott árajánlat után készítjük el”"
},
{
"id": "c06c75771a",
"at": "2026-11-19T09:33:02+02:00",
"msg": "Jóváhagyó oldal: egyértelműbb szöveg a díjas javításnál (az árajánlatot kell elfogadni)"
},
{
"id": "5cc3028dc8",
"at": "2026-11-19T09:24:15+02:00",
"msg": "Jóváhagyó oldal: a harmadik javításkéréstől – a díjmentes körök elfogytak, árajánlat alapján készül"
},
{
"id": "7bee2b3f26",
"at": "2026-11-19T09:22:17+02:00",
"msg": "Jóváhagyó oldal: az ügyfél második javításkérésénél figyelmeztetés – ez az utolsó díjmentes javítási kör, mindent írjon bele"
},
{
"id": "c01210826e",
"at": "2026-11-19T09:16:48+02:00",
"msg": "Videótábla: jelvény a kártyán – „🔁 N. javítás” (az ügyfél kért javítást, a kérések a jelvény fölött), illetve „↩ Belső visszadobás”"
},
{
"id": "9d77e4fcf0",
"at": "2026-11-19T09:12:49+02:00",
"msg": "Bejövő számlák: a listázáskor is megpróbálja szakemberhez kötni a még párosítatlanokat (nem csak beérkezéskor / egyszeri futással)"
},
{
"id": "c2a439c821",
"at": "2026-11-19T09:09:17+02:00",
"msg": "Bejövő számla → szakember: névtag-egyezés (pl. második keresztnév a számlán) és a már nem aktív (törölt) szakemberek is; egyszeri újrapárosítás"
},
{
"id": "cd790286a6",
"at": "2026-11-19T09:03:19+02:00",
"msg": "Árajánlat: nagyobb PDF az előnézetben; a mentett ajánlatból nyitva is megjelenik a szignó (a mentett, elavult aláírás-adat helyett mindig frissen kérjük le)"
},
{
"id": "62d931dbf8",
"at": "2026-11-19T09:03:19+02:00",
"msg": "Értékesítés: a „Díjbekérő fizetve” oszlop is becsukható (‹ gomb, függőleges felirat), eszközönként megjegyzi"
},
{
"id": "a7d11b6e90",
"at": "2026-11-19T09:01:15+02:00",
"msg": "Ügyfélnek küldés: javított változatnál (az ügyfél módosítást kért) „javított változat” szöveg és tárgy; a másik videótípusra (pl. aftermovie) mentett minta nem kerül egy imázsfilm levelébe"
},
{
"id": "fa9ab65eec",
"at": "2026-11-19T08:34:34+02:00",
"msg": "Értékesítés (asztali): elöl a keresés, utána az Értékesítő-választó"
},
{
"id": "5c0b11b297",
"at": "2026-11-19T08:33:00+02:00",
"msg": "Árajánlat: a kedvezmény opciónként külön állítható (régi ajánlatnál minden opció megkapja a korábbi beállítást); az opció-gombon a kedvezményes ár"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
