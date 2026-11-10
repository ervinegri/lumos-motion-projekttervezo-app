// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "31fdab550a",
"at": "2026-11-10T10:07:11+02:00",
"msg": "Kifizetések: a Sales App díjbekérőit a rendelésszám (Sales-rendelés azonosító) alapján is megtalálja kifizetés után"
},
{
"id": "27e1a07c77",
"at": "2026-11-10T10:05:43+02:00",
"msg": "Kifizetések: a számlázz.hu lekérdezése betöltéskor és 10 percenként magától (ügyvezető)"
},
{
"id": "f87e2aa2c1",
"at": "2026-11-10T10:03:36+02:00",
"msg": "Források: a P1–P3 prioritás megszűnt (szűrő, jelvény, adatlap mező, sorrend)"
},
{
"id": "ed7d862a33",
"at": "2026-11-10T10:03:09+02:00",
"msg": "Értesítések: beérkezett kifizetések a csengőben (ügyvezető); Szerződés és számlázás: kereső bal oldalt"
},
{
"id": "f2a24a3f84",
"at": "2026-11-09T22:26:05+02:00",
"msg": "Vízjel a jóváhagyó lejátszón: projektenként pipálható, Sales App projektnél alapból be, teljes kifizetés után lekerül"
},
{
"id": "6b856a258b",
"at": "2026-11-09T21:43:09+02:00",
"msg": "Beosztás: a kreatív kamerához kijelölt operatőr kártyájára „Kreatív operatőr” kerül (statív / interjúsarok hasonlóan)"
},
{
"id": "4eca959bdb",
"at": "2026-11-09T21:35:30+02:00",
"msg": "Legördülő: beágyazott operatőr-altípusok (az Operatőrre kattintva nyílnak); számolásnál is ezres tagolás"
},
{
"id": "d4cea0eadd",
"at": "2026-11-09T21:32:46+02:00",
"msg": "Stáb: szerepválasztó a saját legördülővel; új operatőr-altípusok (Kreatív, Statív, Interjúsarok)"
},
{
"id": "22582cc41e",
"at": "2026-11-09T21:30:44+02:00",
"msg": "Összeg-mezők: számolás is beírható (+ − × ÷), Enterre / kilépéskor kiszámolódik"
},
{
"id": "b6f1c808e5",
"at": "2026-11-09T21:22:01+02:00",
"msg": "Bevételek: a szervezői jutalék az Értékesítés oszlopba kerül, nem a Termelésbe"
},
{
"id": "9582343ad3",
"at": "2026-11-09T21:19:12+02:00",
"msg": "Díjösszesítő értékesítőnek: fix fizetés és jutalék külön, „Tételek”, számlamegjegyzés: Értékesítési tevékenység"
},
{
"id": "d820a98ad3",
"at": "2026-11-09T21:18:24+02:00",
"msg": "Ügyfélnek küldés: a díjösszesítőhöz hasonló, szerkeszthető levélelőnézet (fejléc, gomb, aláírás)"
},
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
"id": "a7bf556853",
"at": "2026-11-09T16:31:44Z",
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
