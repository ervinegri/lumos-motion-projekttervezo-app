// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
},
{
"id": "9d89bcf602",
"at": "2026-11-19T08:31:38+02:00",
"msg": "Árajánlat: az „Árkalkulátorból” és a „Kedvezmény az ajánlatban” csak a szövegén kattintható (a felirat és az ikon nem)"
},
{
"id": "bac60a887c",
"at": "2026-11-19T08:08:23+02:00",
"msg": "Kinézet: választható Stone (Astryx, alap) vagy a saját Lumos arculat (névjelvény menü → 🎨 Kinézet, eszközönként); butter törölve"
},
{
"id": "07fc5e5276",
"at": "2026-11-19T08:00:32+02:00",
"msg": "Arculat: Astryx butter téma kipróbálható (névjelvény menü → 🎨 Arculat: Stone / Butter, csak ügyvezetőnek, eszközönként); alap marad a stone"
},
{
"id": "f5f92a52b1",
"at": "2026-11-19T07:56:32+02:00",
"msg": "Arculat: Astryx stone téma – hűvös, enyhén lilás szürkék, grafit elsődleges szín, 8px lekerekítés; sötét mód hozzáigazítva"
},
{
"id": "81aeb68de7",
"at": "2026-11-19T07:39:19+02:00",
"msg": "Arculat: Astryx (Meta) neutral téma – semleges szürkék, Figtree betű, fekete elsődleges gomb, világos fejléc, 10/12px lekerekítés, finom árnyék; sötét mód hozzáigazítva"
},
{
"id": "784fe0dfcd",
"at": "2026-11-19T07:32:30+02:00",
"msg": "Idővonal: a betöltött időszak szélén azonnal továbbtölt (nem akad meg a hónaphatáron)"
},
{
"id": "2e38e59cd5",
"at": "2026-11-19T07:29:51+02:00",
"msg": "Idővonal: görgetés közben nem rajzol újra (csak a betöltött időszak szélén, érintés/lendület után), a fejléc-frissítés képkockánként egyszer"
},
{
"id": "a4fa1c4ace",
"at": "2026-11-19T07:26:30+02:00",
"msg": "Idővonal: a nevek helyét egyszer méri le, görgetéskor csak a transform változik (nem akad a görgetés)"
},
{
"id": "4cd648768a",
"at": "2026-11-19T07:24:48+02:00",
"msg": "Idővonal: a név sosem lóg túl a sáv végén"
},
{
"id": "b4cf6c6b7d",
"at": "2026-11-19T07:24:25+02:00",
"msg": "Bank: csak sorszámokat tartalmazó közlemény („64 66”) – a partner számláit összegezve párosít"
},
{
"id": "943394f076",
"at": "2026-11-19T07:23:43+02:00",
"msg": "Idővonal: a forgatás+vágás sávon az eredeti név csúszik végig (nem jelenik meg második név)"
},
{
"id": "8748ddd315",
"at": "2026-11-19T07:19:54+02:00",
"msg": "Bank: a díjbekérőre hivatkozó befizetés eltűnik a listából, ha a partner+összeg szerinti számla aznap már kifizetett"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
