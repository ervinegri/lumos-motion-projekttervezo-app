// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "917b8a684e",
"at": "2026-11-09T21:12:24+02:00",
"msg": "Bevételek: az értékesítői jutalék díjsorként sem kerül a Termelésbe"
},
{
"id": "ee50745dca",
"at": "2026-11-09T21:10:25+02:00",
"msg": "Sales jutalék: kedvezményes rendelésnél ismét 10%-kal kevesebb (5 000 / 4 500 Ft short)"
},
{
"id": "4f668b70f4",
"at": "2026-11-09T21:09:20+02:00",
"msg": "Bevételek: a továbbszámlázott / szervezői jutalék jelzése a Díjazás cellán"
},
{
"id": "885da44dd5",
"at": "2026-11-09T21:06:13+02:00",
"msg": "Sales jutalék: a régi automatikus (10 000 / kedvezményes) értékek is átíródnak 5 000 Ft/shortra; szinkron után frissül a nézet"
},
{
"id": "acd6bfb082",
"at": "2026-11-09T21:05:07+02:00",
"msg": "Bevételek: a százalékok a továbbszámlázott költség és a szervezői jutalék levonása után számolódnak"
},
{
"id": "61879b92ae",
"at": "2026-11-09T21:01:56+02:00",
"msg": "Bevételek: értékesítő hozta projektnél az Értékesítés a jutaléka, a % nem írható át"
},
{
"id": "57e8363431",
"at": "2026-11-09T20:58:23+02:00",
"msg": "Szerződés és számlázás: „kifizetve” csempe le, a kereső a csempék sorába; megrendelőlap-párosítás pontosítása"
},
{
"id": "f4cf397bf9",
"at": "2026-11-09T20:52:39+02:00",
"msg": "Szerződés és számlázás: eltérő szerződésű (pl. két megrendelőlapos) projektek külön szerződés-cellában"
},
{
"id": "b867017856",
"at": "2026-11-09T20:50:26+02:00",
"msg": "HubSpot kapcsolattartó: ha a Cég mező üres, a hozzá kapcsolt HubSpot-cég neve is betöltődik"
},
{
"id": "6d8bcd523e",
"at": "2026-11-09T20:48:15+02:00",
"msg": "Érték nélküli projektek (pl. Bussiness Bash) magától a Marketing költségbe; kiadás-táblázatok rácsos kinézete"
},
{
"id": "11fc0f7593",
"at": "2026-11-09T20:46:28+02:00",
"msg": "Bevételek: százalékmezők visszavonása (⌘/Ctrl + Z, Esc)"
},
{
"id": "3c0ed6eec4",
"at": "2026-11-09T20:44:56+02:00",
"msg": "Bevételek: a „nincs érték” jelölés lekerült, elég a Marketing projekt gomb"
},
{
"id": "8a1a18b4ea",
"at": "2026-11-09T20:44:40+02:00",
"msg": "Bevételek: továbbszámlázott költség a Termelésbe, a százalékok nélküle; érték nélküli projekt költsége a marketingből"
},
{
"id": "0743008ec6",
"at": "2026-11-09T20:42:23+02:00",
"msg": "Sales értékesítői jutalék: 5 000 Ft / short, kedvezménytől függetlenül"
},
{
"id": "95797a355a",
"at": "2026-11-09T20:40:42+02:00",
"msg": "Bevételek: az Értékesítés oszlop az értékesítő jutaléka, ha a projektet értékesítő hozta"
},
{
"id": "f5593900b2",
"at": "2026-11-09T20:37:30+02:00",
"msg": "Lehetőség ablak: telefonszám a megszokott formázott mezőben (+36 20 329 8550)"
},
{
"id": "25146a33e1",
"at": "2026-11-09T20:33:24+02:00",
"msg": "Ügyfél jóváhagyására: e-mail nélküli áthelyezésnél is kötelező a videó linkje"
},
{
"id": "254b4acdd8",
"at": "2026-11-09T20:28:20+02:00",
"msg": "Kifizetések: a vágó díja is a projekt hónapjára számít; Sales megrendelőlapok rendelésenként (egy ügyfél több rendelése)"
},
{
"id": "19490c371b",
"at": "2026-11-09T18:31:34+02:00",
"msg": "Értékesítés: szerződött lehetőség meglévő projekthez kapcsolható (nem jön létre másodpéldány)"
},
{
"id": "c85655d004",
"at": "2026-11-09T18:14:07+02:00",
"msg": "Jóváhagyó oldal: nyitó animáció a logóval; logó két sora egyforma betűvastagságú"
},
{
"id": "588ed5872a",
"at": "2026-11-09T17:56:45+02:00",
"msg": "Jóváhagyás logó: zöld pipa"
},
{
"id": "95444cdb15",
"at": "2026-11-09T17:55:33+02:00",
"msg": "Lumos Motion Jóváhagyás logó a jóváhagyó oldalon"
},
{
"id": "0080d147ed",
"at": "2026-11-09T17:38:39+02:00",
"msg": "Ügyfél neve a hozzászólásoknál: csak keresztnév, e-mail cím nélkül"
},
{
"id": "d60a5212ab",
"at": "2026-11-09T17:29:45+02:00",
"msg": "Ügyfél-jóváhagyó oldal: beágyazott lejátszó és észrevételek időkóddal (a belső nézet mintájára)"
},
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
"id": "49512e5d59",
"at": "2026-11-09T15:08:08Z",
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
