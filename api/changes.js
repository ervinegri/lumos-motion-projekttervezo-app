// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "5c05dc9b0b",
"at": "2026-11-26T21:39:17+02:00",
"msg": "Telefon, projekt oldal: a szakaszok széltől szélig (oldalsó margó és keret nélkül)"
},
{
"id": "4b092297b5",
"at": "2026-11-26T21:38:24+02:00",
"msg": "iPhone / iPad: az appon belüli navigáció nem ír előzmény-bejegyzést (iOS 26.2 hiba: elhomályosodó felső menü)"
},
{
"id": "35278c7ccb",
"at": "2026-11-26T21:36:35+02:00",
"msg": "Visszavonva: a rugózás tiltása nem oldotta meg a felső menü homályát"
},
{
"id": "461c0bddbf",
"at": "2026-11-26T21:32:26+02:00",
"msg": "Telefon, projektlista: hosszabb videó-állapotsáv (kitölti a sort)"
},
{
"id": "671d8fe2a7",
"at": "2026-11-26T21:31:12+02:00",
"msg": "iPhone: az oldal teteje nem rugózik le, így a felső menü nem homályosodik el (iOS 26)"
},
{
"id": "eda0679087",
"at": "2026-11-26T21:28:25+02:00",
"msg": "Telefon: a lépés-kártyák egy sorban, tömören"
},
{
"id": "3a06416fd2",
"at": "2026-11-26T21:22:01+02:00",
"msg": "E-mailek: a tárgyban szereplő projekt- / videónév nem ismétlődik a levélben; az instrukciók nem törölhetők"
},
{
"id": "9e0292ebd1",
"at": "2026-11-26T21:12:45+02:00",
"msg": "Instrukciók: ugyanaz a bejegyzés / hozzászólás nem kerül be kétszer (dupla koppintás, hálózati újrapróbálás), a levél sem megy ki újra"
},
{
"id": "fdd52899d5",
"at": "2026-11-26T21:11:22+02:00",
"msg": "Stáb- / utómunka-instrukció: a beírt, el nem küldött szöveg nem vész el (újrarajzolás és frissítés után visszatöltődik, küldés után törlődik)"
},
{
"id": "10c960b02c",
"at": "2026-11-26T18:17:08+02:00",
"msg": "Projekt fejléc: a gombok csak akkor kerülnek külön sorba, ha mellettük nem férne ki a teljes név"
},
{
"id": "3c55aa2884",
"at": "2026-11-26T18:15:43+02:00",
"msg": "Projekt fejléc: keskenyebb ablakban a gombok külön sorba kerülnek, a név mindig látszik"
},
{
"id": "47fc5ac4e8",
"at": "2026-11-26T18:14:08+02:00",
"msg": "Szakaszok állapota csak ugyanannál a projektnél töltődik vissza"
},
{
"id": "dec1ec1e67",
"at": "2026-11-26T18:13:54+02:00",
"msg": "Projekt oldal: frissítés után a szakaszok nem nyílnak ki – a nyitott / csukott állapot megmarad"
},
{
"id": "8cc0709858",
"at": "2026-11-26T18:12:46+02:00",
"msg": "Projekt fejléc (gép): dátumkártya 54 px"
},
{
"id": "ac9cfb416c",
"at": "2026-11-26T18:11:43+02:00",
"msg": "Projekt fejléc (gép): szélesebb dátumkártya"
},
{
"id": "1389d41c19",
"at": "2026-11-26T18:10:33+02:00",
"msg": "Projekt fejléc: a ragadós címsáv nem takarja ki a gombokat (az új elrendezésben is jól érzékeli, mikor csúszik ki a cím)"
},
{
"id": "1f0186256b",
"at": "2026-11-26T18:09:28+02:00",
"msg": "Projekt fejléc (gép): gombok a név sorában, a leírás alul a teljes szélességben"
},
{
"id": "5ed744b90b",
"at": "2026-11-26T18:06:16+02:00",
"msg": "Szolgáltatások: 10 px a magyarázó sor alatt"
},
{
"id": "0313e6e896",
"at": "2026-11-26T18:06:03+02:00",
"msg": "Szolgáltatások: a magyarázó sor nem csúszik rá az alatta lévő dobozra"
},
{
"id": "7c69778d58",
"at": "2026-11-26T18:03:56+02:00",
"msg": "Szolgáltatások: kisebb hézag a fejléc és a magyarázó sor között"
},
{
"id": "2fb2851b01",
"at": "2026-11-26T18:02:25+02:00",
"msg": "Projekt fejléc (gép): név és gombok egy sorban; lemondás / törlés ikonként"
},
{
"id": "ca3ae7d680",
"at": "2026-11-26T18:01:14+02:00",
"msg": "Projekt oldal: egyforma (8 px) távolság a szakaszok között"
},
{
"id": "178af77cb3",
"at": "2026-11-26T17:58:59+02:00",
"msg": "Projektlista (gép): vékonyabb fejléc"
},
{
"id": "171f75f99c",
"at": "2026-11-26T17:57:47+02:00",
"msg": "Projektlista (gép): kb. 20%-kal vékonyabb sorok"
},
{
"id": "55bb269f53",
"at": "2026-11-26T17:55:57+02:00",
"msg": "Projektlista: a mai projekt piros kerete körben egyforma vastag"
},
{
"id": "f4f06cb451",
"at": "2026-11-26T17:54:46+02:00",
"msg": "Projektlista: a hónap-elválasztó sorok kikerültek"
},
{
"id": "6ca144b358",
"at": "2026-11-26T17:40:00+02:00",
"msg": "Fekvő telefon, projektlista: az állapot-oszlop minden sorban egy vonalban"
},
{
"id": "b2cb96fc01",
"at": "2026-11-26T17:37:38+02:00",
"msg": "Telefon, projekt Pénzügyek: Szerződés és Termelés egy sorban, alatta tömör értékesítő-kártya (nem lóg ki)"
},
{
"id": "dc43ade555",
"at": "2026-11-26T17:36:54+02:00",
"msg": "Telefon: fele olyan széles Értékesítés-oszlopok, tömörebb kártyák"
},
{
"id": "4da72dcbac",
"at": "2026-11-26T15:36:08Z",
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
