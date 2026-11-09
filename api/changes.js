// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "a9f61aef62",
"at": "2026-11-09T17:28:01+02:00",
"msg": "Továbbszámlázott mező rendezése; csatolmányok az Új projekt ablakban"
},
{
"id": "68e83a3c72",
"at": "2026-11-09T17:19:45+02:00",
"msg": "Továbbszámlázott költség a nettó szerződött érték része: levonva (…után mező), felirat: Nettó szerződött érték"
},
{
"id": "129470d207",
"at": "2026-11-09T17:16:52+02:00",
"msg": "Ügyfél-levél: egyetlen gomb a jóváhagyó oldalra (ott a videó és a döntés), a levélben nincs külön Jóváhagyom/Módosítás gomb"
},
{
"id": "3dfa77fa14",
"at": "2026-11-09T17:13:59+02:00",
"msg": "Továbbszámlázott költség a szervezői jutalékhoz hasonló mezőként, csatolmánnyal (feltöltés/behúzás a projekt Drive-mappájába)"
},
{
"id": "aebd2791c9",
"at": "2026-11-09T17:12:48+02:00",
"msg": "Videótábla: frissítéskor nem vész el az áthúzás (megőrzi és újraküldi a mentést, figyelmeztet mentés közben)"
},
{
"id": "d5fd0f779e",
"at": "2026-11-09T17:10:31+02:00",
"msg": "Ügyfél-levél ablak: a saját aláírás és a két gomb előnézete; app-újdonságok előnézeti nézetben is az ügyvezetőnek; extra tétel csatolmány feltöltés (háttér)"
},
{
"id": "a1d8a32930",
"at": "2026-11-09T17:08:00+02:00",
"msg": "HubSpot kapcsolattartó választáskor a telefonszám és az e-mail is cserélődik"
},
{
"id": "7536bf81a4",
"at": "2026-11-09T17:07:00+02:00",
"msg": "Naptár: vágó kiválasztásakor csak az ő vágói munkái látszanak"
},
{
"id": "3b67c045d9",
"at": "2026-11-09T17:07:00+02:00",
"msg": "Ügyfél adatlap: szerződések listája az ügyvezetőnek"
},
{
"id": "0cab09fb4a",
"at": "2026-11-09T17:05:15+02:00",
"msg": "Díjösszesítő: áfakörös szakembernél ÁFA (27%) és bruttó végösszeg"
},
{
"id": "18eb6ec303",
"at": "2026-11-09T17:02:35+02:00",
"msg": "Fizetések: értékesítők a táblázat végén; ügyfél-levelek tesztüzeme kikapcsolva"
},
{
"id": "f2a6c48fa9",
"at": "2026-11-09T17:02:01+02:00",
"msg": "Kifizetések (szakember): cím és hónapváltó egy sorban"
},
{
"id": "0649bb1ac4",
"at": "2026-11-09T14:28:52+02:00",
"msg": "Mobil: hónapváltó nem lóg ki, a Kifizetések táblázat kifér (összegek látszanak)"
},
{
"id": "6db0e565d9",
"at": "2026-11-09T14:27:27+02:00",
"msg": "Naptár buboréka: a telefonszám nem esik szét (iOS automatikus linkek kikapcsolva)"
},
{
"id": "af3c43b8b0",
"at": "2026-11-09T14:26:59+02:00",
"msg": "Projektek: az állapotszűrő sor kikerült, minden projekt látszik"
},
{
"id": "6c5f55f7e3",
"at": "2026-11-09T14:19:37+02:00",
"msg": "Mobil nézet újraépítve: kompakt fejléc, görgethető fülek/gombok/lépések, projektfejléc, teljes képernyős ablakok, görgethető táblázatok"
},
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
"id": "01721ee25d",
"at": "2026-11-09T11:24:23Z",
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
