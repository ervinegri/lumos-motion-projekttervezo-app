// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "35ffdefc33",
"at": "2026-11-26T16:04:35+01:00",
"msg": "Fekvő telefon: a felső sáv csak saját görgetésre tűnik el (menüváltáskor nem), a Bevétel-táblázat fejléce fent marad, a projektlista sorai feleakkorák"
},
{
"id": "8cf87cb9c3",
"at": "2026-11-26T16:03:07+01:00",
"msg": "Jegyzet-törlés azonnal (a háttérben ment, hibánál visszajön); telefonon a Szerződés / Bevétel fejléce egy sorban, mint a Fizetéseknél"
},
{
"id": "1a408afeca",
"at": "2026-11-26T15:56:46+01:00",
"msg": "Lehetőség jegyzetei: a bejegyzések (pl. beszélgetés-összefoglaló) egyenként törölhetők – 🗑, megerősítés után azonnal (ügyvezető / a lehetőség értékesítője)"
},
{
"id": "373fb49ea9",
"at": "2026-11-26T15:55:34+01:00",
"msg": "Rejtett ajánlat-doboz / mikrofon-választó biztosan nem látszik"
},
{
"id": "7c88f03295",
"at": "2026-11-26T15:55:15+01:00",
"msg": "Lehetőség ablaka: ha az ügyfélnek nincs ajánlata (sem mentett, sem kiküldött levél), az „Ajánlatok ennek az ügyfélnek” doboz nem jelenik meg / nem foglal helyet"
},
{
"id": "6e9e124ca7",
"at": "2026-11-26T15:54:33+01:00",
"msg": "Telefon: a lehetőség ablaka egészében görög (a cím és a Rögzítés / Árajánlat gomb is), a gombsor lent marad; Mégse helyett Vissza"
},
{
"id": "dbd4373627",
"at": "2026-11-26T15:53:52+01:00",
"msg": "Telefon: a projektlista dátumkártyája és a mellette lévő hézag keskenyebb"
},
{
"id": "785c77cf63",
"at": "2026-11-26T15:52:17+01:00",
"msg": "Telefon: a görgethető ablak (lehetőség) a képernyő magasságában – fejléc fent, gombsor lent rögzítve, csak a tartalom görög (nincs üres rész a gombsor alatt); Pénzügyek panel nyila a jobb szélen"
},
{
"id": "e0baca908d",
"at": "2026-11-26T15:49:02+01:00",
"msg": "Rögzítés: frissítés ellen védve (lehúzás / automatikus újratöltés nem indul rögzítés közben); ha mégis megszakadt, az új lap rögtön felajánlja: Feltöltés, vagy Feltöltés és folytatás (új felvétel indul, az előző rész a háttérben töltődik fel). Lehetőség ablaka telefonon: a két gomb és a bezárás egy sorban, rövid felirattal"
},
{
"id": "a47a783901",
"at": "2026-11-26T15:43:30+01:00",
"msg": "Lehetőség ablaka: az ajánlat- és a rögzítés-gomb a fejlécben (jobb felső sarok); a bevezetés napi próba-rögzítések sorai is törlődnek a jegyzetből (15:46 előttiek)"
},
{
"id": "4c33205c3a",
"at": "2026-11-26T15:41:04+01:00",
"msg": "Rögzítés iPhone-on: a mikrofon-választó telefonon nem kér előre engedélyt (kattintás nélküli kérésre az iOS az egész munkamenetre tiltott) – telefonon nincs is választó; iPhone-ra szabott útmutató, ha mégis tiltott"
},
{
"id": "6be8ba7b5d",
"at": "2026-11-26T15:39:19+01:00",
"msg": "Mobil: lehúzással frissítés nyitott ablakban akkor is, ha a mögötte lévő lap le volt görgetve (frissítés után az ablak visszajön)"
},
{
"id": "1a302b4fa3",
"at": "2026-11-26T15:31:25+01:00",
"msg": "Felvétel: valódi feltöltési százalék (XHR), a befejező darab ismétlése nem vesz fel kétszer; a jegyzetben rövidebb sor: „🎙️ Személyes megbeszélés rögzítve (3:15)” (a meglévők is)"
},
{
"id": "c9d152fcb8",
"at": "2026-11-26T15:29:01+01:00",
"msg": "Rögzítés több fülön: a felvételt / feltöltést végző fül jelzi, hogy él – a másik fül nem ajánlja fel félbemaradtként (és nem tölti fel kétszer)"
},
{
"id": "71ddf23d12",
"at": "2026-11-26T15:28:05+01:00",
"msg": "Rögzítő sáv: a lehetőség mellett a kapcsolattartó neve is"
},
{
"id": "6aa337e348",
"at": "2026-11-26T15:25:57+01:00",
"msg": "Egyszeri takarítás az ügyvezető kérésére: a bevezetés napi próba-beszélgetésösszefoglalók törlése a lehetőségek jegyzeteiből (a nyitott ablak is frissül)"
},
{
"id": "05661c923a",
"at": "2026-11-26T15:25:05+01:00",
"msg": "Rögzítés telefonon: amíg fut, a képernyő ébren marad (Wake Lock); ha mégis megszakadt (lezárás, appváltás, hívás, a mikrofon elengedése), visszatéréskor szól – folytatás vagy befejezés és feltöltés, nem rögzít csendet"
},
{
"id": "eeea03cd0d",
"at": "2026-11-26T15:19:52+01:00",
"msg": "Rögzítés iPhone-on: a hullámforma-elemző néma kimenethez kötve (Safari csak így adja az élő hangszintet)"
},
{
"id": "c4a7f2f987",
"at": "2026-11-26T15:19:38+01:00",
"msg": "Rögzítés iPhone-on: a hangkörnyezet a kattintáskor indul (különben a Safari felfüggeszti, és a hullámforma áll), érintésre újraindul"
},
{
"id": "348c37cba9",
"at": "2026-11-26T15:15:52+01:00",
"msg": "Rögzítés: feltöltés után a sáv helyén feldolgozás-jelző (átirat / összefoglaló készül), egyetlen darabnál nincs félrevezető 0%; az összefoglaló ablaka mellett nincs külön értesítés; OpenAI: a felesleges beszélő-szerinti próbálkozás kimarad"
},
{
"id": "e616dba93c",
"at": "2026-11-26T15:13:45+01:00",
"msg": "Mikrofon-választó: a lista nem csukódik be magától (a többi rövid legördülővel azonos viselkedés), az alapértelmezettnél is minden mikrofon látszik"
},
{
"id": "badddf3827",
"at": "2026-11-26T15:11:46+01:00",
"msg": "Rögzítés: mikrofon-választó (alapból a gép beépített mikrofonja, nem a közeli iPhone; a választás megmarad), a sáv a képernyő alján – amíg fut, az ablakok gombsora feljebb kerül"
},
{
"id": "d1cb165537",
"at": "2026-11-26T14:54:36+01:00",
"msg": "Beszélgetés-átirat OpenAI-jal (elsődleges, ha meg van adva a kulcs): gpt-transcribe beszélők szerint (ha a modell tudja, különben egyszerűsít), összefoglaló a legújabb gpt-mini modellel kötött JSON-szerkezettel; Beállítások → OpenAI-kulcs; a Gemini tartalék"
},
{
"id": "4a691d2b88",
"at": "2026-11-26T14:45:07+01:00",
"msg": "Gemini: modell-sorrend kimerült keretű / túlterhelt modellek félretételével (nem kezd újra és újra a 429-es modellel), időkereten belül több modell, érthető kerethiány-üzenet"
},
{
"id": "9e49a9245d",
"at": "2026-11-26T14:40:28+01:00",
"msg": "Hibakeresés: utolsó Gemini-hibák és a választott modell a /api/dbstatus-ban (kulcs nélkül)"
},
{
"id": "957ba86834",
"at": "2026-11-26T14:34:02+01:00",
"msg": "Gemini túlterhelés: sorban a többi elérhető Flash modell is (stabil → latest → előzetes → lite), a válaszoló modell 3 óráig elsőként; a hibában a kipróbált modellek"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
module.exports.items = ITEMS;   // a gyors út (api/_gasrt.js) innen olvassa
