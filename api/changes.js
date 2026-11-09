// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "3a1f1792c7",
"at": "2026-11-09T14:13:14+02:00",
"msg": "Változásnapló csak belépett ügyvezetőnek (védett Vercel-függvény + admin végpont); fejlesztői fájlok nem kerülnek ki a weboldalra"
},
{
"id": "7309560bc9",
"at": "2026-11-09T14:09:45+02:00",
"msg": "Új verzió sáv: az újdonságok listája csak az ügyvezetőnek"
},
{
"id": "44c718d669",
"at": "2026-11-09T14:07:06+02:00",
"msg": "Lezárt projekt (átadva, ill. szakembernél a lezajlott munka): minden szürke"
},
{
"id": "677e2bd076",
"at": "2026-11-09T14:01:49+02:00",
"msg": "Naptár: szakember nézetben csak a saját vágói bejegyzései látszanak"
},
{
"id": "66a0fc741e",
"at": "2026-11-09T14:00:50+02:00",
"msg": "Fizetések: fejlécben minden név E. Ervin formában"
},
{
"id": "0d7385e670",
"at": "2026-11-09T13:59:54+02:00",
"msg": "Fizetések: projektnév végén …"
},
{
"id": "e968ee0ef6",
"at": "2026-11-09T13:57:58+02:00",
"msg": "Fizetések: hosszú projektnév egy sorban, …-tal"
},
{
"id": "7522a749d7",
"at": "2026-11-09T13:55:14+02:00",
"msg": "Pénzügyek: altabok, hónapváltó és gombok egy sorban"
},
{
"id": "a8242e916f",
"at": "2026-11-09T13:52:25+02:00",
"msg": "Értékesítői jutalék a Fizetésekben akkor is, ha az értékesítőnek szakember-fiókja van"
},
{
"id": "2a2ff8bfe2",
"at": "2026-11-09T13:47:54+02:00",
"msg": "Sales App jutalék: videónként 10 000 Ft, kedvezményesnél 10%-kal kevesebb – a Fizetésekben az értékesítő oszlopában"
},
{
"id": "dbcee3ce7f",
"at": "2026-11-09T13:42:43+02:00",
"msg": "Pénzügy táblázat: az értékesítő nem kerül a termelői díjak közé"
},
{
"id": "7241883e2e",
"at": "2026-11-09T13:41:06+02:00",
"msg": "Pénzügy táblázat: az értékesítő sorában a jutalék összege"
},
{
"id": "d27d8cbc7a",
"at": "2026-11-09T13:30:27+02:00",
"msg": "Belépéskor háttérben Sales App szinkron (értékesítő a csapatba)"
},
{
"id": "98069c5ee3",
"at": "2026-11-09T13:24:14+02:00",
"msg": "Naptár: azonos napi forgatás + vágás egy ferdén kettéosztott sávban"
},
{
"id": "6cf2d09380",
"at": "2026-11-09T13:22:45+02:00",
"msg": "Fizetések: a vágás ugyanabban a hónapban a projekt forgatási napjánál marad"
},
{
"id": "8ddf89f757",
"at": "2026-11-09T13:20:30+02:00",
"msg": "Sales App projektek: az értékesítő (Flóra) Értékesítő szerepben a csapatba kerül; nem kap beosztásos levelet/meghívót"
},
{
"id": "de93265d97",
"at": "2026-11-09T13:17:56+02:00",
"msg": "Sales App projektek értékesítője alapból Flóra; a projektvezető ne látsszon Értékesítőként"
},
{
"id": "9d2b1b085f",
"at": "2026-11-09T13:13:28+02:00",
"msg": "Szerződés-begyűjtés: naponta egyszer a háttérben az app indulásakor"
},
{
"id": "eebcc1f00e",
"at": "2026-11-09T12:45:07+02:00",
"msg": "Szerződés-begyűjtés: bejelentkezés után háttérfeladat, eredmény üzenetben"
},
{
"id": "c92273fee3",
"at": "2026-11-09T12:36:43+02:00",
"msg": "Aláírt munkatársi szerződések napi automatikus begyűjtése a Gmailből"
},
{
"id": "54524d8ffa",
"at": "2026-11-09T12:04:44+02:00",
"msg": "Források: altabok és fejléc egy sorban; leltár szűrők kereshetők"
},
{
"id": "13cc088dbc",
"at": "2026-11-09T12:03:12+02:00",
"msg": "Munkatársi szerződés: behúzás vagy kiválasztás után azonnal feltöltődik, a kártya frissül"
},
{
"id": "877aef0d09",
"at": "2026-11-09T11:59:02+02:00",
"msg": "Stáb: Szerződések a Gmailből gomb (előnézet, kijelölés, feltöltés)"
},
{
"id": "dccd67d958",
"at": "2026-11-09T11:56:25+02:00",
"msg": "Munkatársi szerződések begyűjtése a Gmailből (admin)"
},
{
"id": "9928256fe1",
"at": "2026-11-09T11:55:48+02:00",
"msg": "Munkatárs: értékesítői jutalék a szerkesztőben; az űrlap legördülői kereshetők"
},
{
"id": "f7b65c21c0",
"at": "2026-11-09T11:52:17+02:00",
"msg": "Másolás: normál mutató kurzor"
},
{
"id": "ef8c1140a3",
"at": "2026-11-09T11:36:26+02:00",
"msg": "Videótábla: ellenőrzés/ügyfél ablak alatt is látszik, címsor egy vonalban; telefon/e-mail másolás hover"
},
{
"id": "bce770dce5",
"at": "2026-11-09T05:39:28+02:00",
"msg": "Ügyfél-levél tárgya: „Elkészült: {videó} – {projekt}”, ügyfelenként megjegyezve"
},
{
"id": "38d7633846",
"at": "2026-11-09T03:38:42Z",
"msg": "Változásnapló frissítése"
}
];
const TOKENS = new Map();   // token → { email, exp } (melegen tartott függvénynél nem kérdezzük újra a Google-t)
async function emailOf(token) {
  const hit = TOKENS.get(token); if (hit && hit.exp > Date.now()) return hit.email;
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(token));
  if (!r.ok) return '';
  const j = await r.json(); const email = String(j.email || '').toLowerCase();
  if (email && String(j.email_verified) !== 'false') TOKENS.set(token, { email, exp: Date.now() + Math.min(Number(j.expires_in || 300) * 1000, 300000) });
  if (TOKENS.size > 200) TOKENS.clear();
  return email;
}
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) { res.statusCode = 401; return res.end(JSON.stringify({ message: 'Hiányzó hitelesítés.' })); }
  const email = await emailOf(token).catch(() => '');
  const allowed = String(process.env.APPS_SCRIPT_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!email || !allowed.includes(email)) { res.statusCode = 403; return res.end(JSON.stringify({ message: 'Nem engedélyezett.' })); }
  res.end(JSON.stringify({ items: ITEMS }));
};
