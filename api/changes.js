// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "35c4a3c0c1",
"at": "2026-11-26T13:31:51+01:00",
"msg": "Hibakeresés: az utolsó Neon-hibák szövege (titok nélkül) a /api/dbstatus-ban"
},
{
"id": "fa9f3e5a96",
"at": "2026-11-26T13:26:47+01:00",
"msg": "Felvétel: a hozzájárulás jelölőnégyzete alapból bepipálva"
},
{
"id": "e95e344be7",
"at": "2026-11-26T13:23:31+01:00",
"msg": "Gemini: túlterhelésnél automatikus újrapróbálás és tartalék modell, érthető hibaüzenet; a felvétel alá ragadt régi jegyzet az ablak megnyitásakor szétválik"
},
{
"id": "30ac79b8c1",
"at": "2026-11-26T13:13:42+01:00",
"msg": "Gemini: automatikus modellválasztás (kivezetett modell esetén újraválaszt); jegyzet: a régi, fejléc nélküli szöveg nem ragad az új bejegyzés alá + egyszeri javítás"
},
{
"id": "7b0e5475a9",
"at": "2026-11-26T13:08:24+01:00",
"msg": "Beszélgetésrögzítés: a feltöltés / átirat mindig az Apps Scripten fut (a gyors út nem érte el a feltöltési munkamenetet → „lejárt”)"
},
{
"id": "b17e8ebbf3",
"at": "2026-11-26T13:07:24+01:00",
"msg": "Rögzítő sáv: élő hullámforma, jól látható Szünet gomb, a sáv fent (nem takarja az ablak gombjait)"
},
{
"id": "0045f67f79",
"at": "2026-11-26T13:02:30+01:00",
"msg": "Gemini-kulcs: az új „AQ.…” formátum is elfogadott; a kulcs fejlécben megy (x-goog-api-key)"
},
{
"id": "7d73aefaa9",
"at": "2026-11-26T12:10:45+01:00",
"msg": "Google-értékelések: a gombok a címsorban (gépen egy sor)"
},
{
"id": "fcece2e370",
"at": "2026-11-26T12:07:47+01:00",
"msg": "Google-értékelések: értékelés kérése e-mailben projekt nélkül (✉️ Küldés); rövidebb gombok (Küldés · Link · QR)"
},
{
"id": "c0b663dc77",
"at": "2026-11-26T12:06:16+01:00",
"msg": "Idővonal: szélesebb betöltött időszak (2 hónap vissza, +2 előre) – görgetéskor ritkán kell újrarajzolni, nem ugrál"
},
{
"id": "2cc8360dcd",
"at": "2026-11-26T12:04:20+01:00",
"msg": "Értékelés-párosítás: a „Nem párosítható (egyéb)” kategória kivéve"
},
{
"id": "dbb4b351f0",
"at": "2026-11-26T12:02:48+01:00",
"msg": "Idővonal: görgetés közben nem vált hónapot / nem szűr sorokat / nem rajzol újra – csak a görgetés megállása után (nem akad)"
},
{
"id": "c5b43f6cdd",
"at": "2026-11-26T11:59:01+01:00",
"msg": "Google-értékelések a termelési vezetőnek is (megtekintés, link, QR, értékeléskérés; válasz és párosítás csak az ügyvezetőnek); párosítás: nem ügyfél kategóriák (szereplő/modell/statiszta, munkatárs, vendég, egyéb) és bővebb ügyfélkör"
},
{
"id": "47c7def607",
"at": "2026-11-26T11:52:31+01:00",
"msg": "Beszélgetésrögzítés: a mikrofon és a képernyőmegosztás engedélyezése (Permissions-Policy tiltotta); pontosabb hibaüzenet"
},
{
"id": "1f9c8253d3",
"at": "2026-11-26T11:50:35+01:00",
"msg": "Google-értékelések: az alsó „Értékelési link ↗” gomb törölve (fent ott a másolás és a QR)"
},
{
"id": "ccb1dd49ae",
"at": "2026-11-26T11:48:18+01:00",
"msg": "Google-értékelések: megnyitáskor nem frissít újra, ha az elmúlt 10 percben (induláskor) már frissült"
},
{
"id": "e4db7bc39d",
"at": "2026-11-26T11:47:43+01:00",
"msg": "Google-értékelések: alapból 12 értékelés látszik (6 helyett)"
},
{
"id": "b8955e7a82",
"at": "2026-11-26T11:45:07+01:00",
"msg": "Google-értékelések: link másolása és QR-kód betöltés közben is"
},
{
"id": "135a455c3c",
"at": "2026-11-26T11:43:30+01:00",
"msg": "Google-értékelések, telefon: cím és értékelés egy sorban"
},
{
"id": "cf11442efa",
"at": "2026-11-26T11:43:17+01:00",
"msg": "Google-értékelések ablak: az átlag és a darabszám a címsorban (kompaktabb)"
},
{
"id": "781e4e168b",
"at": "2026-11-26T11:41:55+01:00",
"msg": "Ügyfelek, telefon: a kereső mögötti cím elrejtve"
},
{
"id": "d6c1841b1c",
"at": "2026-11-26T11:40:57+01:00",
"msg": "Ügyfelek fejléce: a gombok jobbra igazítva"
},
{
"id": "e31d3a754c",
"at": "2026-11-26T11:40:04+01:00",
"msg": "Ügyfelek: keresés a fejléc sorában; értékelési link / QR a Frissítés mellett; induláskor a Google-értékelések automatikus behúzása"
},
{
"id": "e90f4fb51d",
"at": "2026-11-26T11:35:48+01:00",
"msg": "Sötét mód: olvasható szerepkör-választó; érintésre nincs sárga szövegkijelölés a sorokon; egyforma panelhézag a Szerződés és számlázás előtt; zárolt Alapadatok nem kattintható (tiltó kurzor); Ügyfelek fejléce egy sorban; Google-értékelési link másolása és QR-kód"
},
{
"id": "3e30254769",
"at": "2026-11-26T11:29:19+01:00",
"msg": "Értékesítés: beszélgetésrögzítés (személyes / kihangosított hívás / online megbeszélés), hozzájárulással; Drive-ra mentés, Gemini-átirat (szó szerinti + összefoglaló + következő lépés), félbemaradt felvétel mentése a böngészőben"
},
{
"id": "b9b5f6bceb",
"at": "2026-11-26T11:26:00+01:00",
"msg": "Indítóképernyő (fehér háttér, középen a logó) a fekete helyett; projektlap: minden szakasz csukva nyílik, új sorrend (Stáb → Utómunka → Pénzügyek → Szerződés és számlázás), egyforma lenyitó nyíl"
},
{
"id": "a6af016938",
"at": "2026-11-26T11:16:36+01:00",
"msg": "Kifizetések: „Értékesítés (fix fizetés)”; értékesítési kártyán minden nézetben az értékesítő neve"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
module.exports.items = ITEMS;   // a gyors út (api/_gasrt.js) innen olvassa
