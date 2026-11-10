// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "c1437abd5f",
"at": "2026-11-11T00:19:04+01:00",
"msg": "Vágó nézet: az ügyfél e-mail címe nem látszik a hozzászólásokban"
},
{
"id": "2c6dc7374a",
"at": "2026-11-11T00:12:18+01:00",
"msg": "Ügyfél-link megnyitásának jelzése a videókártyán; új Lumos gomb a jóváhagyó levélben"
},
{
"id": "f873ca1f3e",
"at": "2026-11-11T00:07:03+01:00",
"msg": "Ügyfél jóváhagyó oldal: a videó a nyitókép után magától indul (szükség esetén némítva, hang gombbal)"
},
{
"id": "188c31de56",
"at": "2026-11-11T00:04:43+01:00",
"msg": "pCloud lejátszó: 9 mp-es időkorlát hibaüzenettel, a felső ablak videóját tölti be"
},
{
"id": "cc3cc7dfaa",
"at": "2026-11-11T00:03:56+01:00",
"msg": "Havi naptár: Vágói határidők pipa (leadási határidők ki-be)"
},
{
"id": "ac87587699",
"at": "2026-11-10T23:51:59+01:00",
"msg": "Videótábla ablak kisebb nagy monitoron"
},
{
"id": "9fc915a9b0",
"at": "2026-11-10T15:58:20+02:00",
"msg": "Árkalkulátor végösszeg: nem ugrál (animáció nélkül, fix szélességű szám)"
},
{
"id": "faa1b6cb8b",
"at": "2026-11-10T15:37:37+02:00",
"msg": "Árkalkulátor ablak: pontos magasság a képernyőhöz"
},
{
"id": "3e58923f9d",
"at": "2026-11-10T15:37:00+02:00",
"msg": "Árkalkulátor ablak: nagyításnál sem vágódik le a gombsor"
},
{
"id": "25df7e875e",
"at": "2026-11-10T15:33:57+02:00",
"msg": "Árkalkulátor végösszeg felirat"
},
{
"id": "b6d490e769",
"at": "2026-11-10T15:33:32+02:00",
"msg": "Árkalkulátor végösszeg: látványosabb címke"
},
{
"id": "63146f7830",
"at": "2026-11-10T15:33:03+02:00",
"msg": "Árkalkulátor gomb: sötét tintaszín"
},
{
"id": "c1b6604b2d",
"at": "2026-11-10T15:31:52+02:00",
"msg": "Árkalkulátor: a végösszeg a gombsorban, az Eredmény beküldése mellett"
},
{
"id": "7526544bfc",
"at": "2026-11-10T15:29:32+02:00",
"msg": "Árkalkulátor: a gombok jobbra, a Bezárás mellé"
},
{
"id": "a5c2aade44",
"at": "2026-11-10T15:27:34+02:00",
"msg": "Árkalkulátor: Visszaállítás és Eredmény beküldése a Bezárás mellett, egy sorban"
},
{
"id": "4c6328ac34",
"at": "2026-11-10T15:27:00+02:00",
"msg": "Árkalkulátor: a két opció a címsorban, fehér háttér"
},
{
"id": "a47bfd29ab",
"at": "2026-11-10T15:20:37+02:00",
"msg": "Árkalkulátor ablak: Megnyitás új lapon gomb nélkül"
},
{
"id": "8f12a7cb31",
"at": "2026-11-10T15:16:37+02:00",
"msg": "Értékesítés: Árkalkulátor gomb (kalkulator.lumosmotion.hu nagy ablakban), az Új lehetőség mellett balra"
},
{
"id": "516a427723",
"at": "2026-11-10T15:14:50+02:00",
"msg": "Nyitott videótábla is frissül, ha közben változás jön (pl. ügyfél-jóváhagyás)"
},
{
"id": "e2ee986314",
"at": "2026-11-10T14:56:42+02:00",
"msg": "Jóváhagyó oldal: a nyitókép a videó betöltéséig marad, lágy áttűnéssel; rákérdez, ha a videó nincs végignézve"
},
{
"id": "df7c5bfa2e",
"at": "2026-11-10T14:55:23+02:00",
"msg": "Jóváhagyó oldal: döntéskor a videó megáll"
},
{
"id": "161d458e1f",
"at": "2026-11-10T14:54:09+02:00",
"msg": "Jóváhagyó oldal telefonon: nagyobb álló videó, a gombok szövege nem jelölhető ki"
},
{
"id": "8bb0c0df62",
"at": "2026-11-10T14:51:14+02:00",
"msg": "Jóváhagyó oldal: Enter a videón is időkódot szúr be (nem folytatja a lejátszást)"
},
{
"id": "5bce6a6448",
"at": "2026-11-10T14:43:57+02:00",
"msg": "Ügyfél-levél: a „Köszönöm!” nem kerül a szignó elé"
},
{
"id": "0917875430",
"at": "2026-11-10T14:42:39+02:00",
"msg": "Ügyfélnek küldés: egy fölösleges lezáró div miatt a gombsor kiesett az ablakból – javítva"
},
{
"id": "5aeb7a784a",
"at": "2026-11-10T14:35:54+02:00",
"msg": "Levél-előnézetek: linkre kattintva a keret nem navigál (CSP-tiltás helyett); a saját e-mail-cím a felhasználói adatokban (feladó, csengő)"
},
{
"id": "db8a016b42",
"at": "2026-11-10T14:31:58+02:00",
"msg": "Videónéző: időkódra kattintva indul a lejátszás, válasz időkódos észrevételre, bezáráskor a videótábla megmarad"
},
{
"id": "801e9bbc2d",
"at": "2026-11-10T14:26:49+02:00",
"msg": "Videó-hozzászólás: pipa az időkódok előtt – a vágó kipipálja, amit már javított"
},
{
"id": "b4235c86a4",
"at": "2026-11-10T14:23:47+02:00",
"msg": "Videónéző: link cseréje (vezető vagy a videó vágója), forgalmi limites pCloud-linknél közvetlen gomb"
},
{
"id": "b4bd2d3883",
"at": "2026-11-10T14:13:49+02:00",
"msg": "Videó-hozzászólás: az időkód oda kerül, ahol a kurzor utoljára állt, nem a szöveg végére"
},
{
"id": "aba9c3b91a",
"at": "2026-11-10T12:06:22Z",
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
