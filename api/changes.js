// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
},
{
"id": "285887361f",
"at": "2026-11-26T14:12:20+01:00",
"msg": "Neon-forgalom: tartalmilag változatlan lapot nem írunk vissza (nem lép a változat → a gyorsítótárak és a gyors út példányai nem töltik le újra a teljes lapot)"
},
{
"id": "7c6f9de7e0",
"at": "2026-11-26T13:10:46Z",
"msg": "Háttérkód telepítési állapota: rendben"
},
{
"id": "55b0e2ef7c",
"at": "2026-11-26T13:08:50Z",
"msg": "Háttérkód telepítési állapota: HIBA"
},
{
"id": "2eaefc7473",
"at": "2026-11-26T14:08:35+01:00",
"msg": "Neon-forgalom csökkentése a gyorsaság romlása nélkül"
},
{
"id": "928be73a41",
"at": "2026-11-26T15:06:43+02:00",
"msg": "Beszélgetés-átirat: átmeneti Gemini-hibánál (túlterhelés, keret) nem hibát mutat, hanem automatikusan újrapróbálja a háttérben (2, 5, 10, 20, 40, 60 perc múlva – akkor is, ha az app be van zárva); látszik, mikor próbálja újra; kész átiratnál nem készül dupla összefoglaló"
},
{
"id": "ae30081fb8",
"at": "2026-11-26T14:05:50+01:00",
"msg": "Forgalom-elemzés: táblánkénti és kulcs-tár méret a /api/dbstatus?sizes=1-ben (titok nélkül)"
},
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
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
module.exports.items = ITEMS;   // a gyors út (api/_gasrt.js) innen olvassa
