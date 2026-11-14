// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "ed0e19bd65",
"at": "2026-11-14T12:55:25+01:00",
"msg": "Sablon választásakor a Rendezvény típusa is kitöltődik (látható mezőben is)"
},
{
"id": "7911124b81",
"at": "2026-11-14T12:53:00+01:00",
"msg": "Rendezvény típusa: Egyéb kivéve a választhatók közül (a régi Egyéb projektek megtartják)"
},
{
"id": "c6a2e125c2",
"at": "2026-11-14T12:52:38+01:00",
"msg": "Rendezvény típusa: Reklám"
},
{
"id": "f05040949f",
"at": "2026-11-14T12:52:20+01:00",
"msg": "Új projekt: az ügyfél és a kapcsolattartó adatai nem kötelezők létrehozáskor"
},
{
"id": "b58a6a9d93",
"at": "2026-11-14T12:51:49+01:00",
"msg": "Felirat: Hozzávetőleges végzés"
},
{
"id": "bfc98cd568",
"at": "2026-11-14T12:51:00+01:00",
"msg": "Új projekt: alapból a mai dátummal indul"
},
{
"id": "b172947189",
"at": "2026-11-14T12:42:18+01:00",
"msg": "Szakembereknek csak a nevük látszik a menüben (Szakember felirat és kalapács nélkül); Kifizetések: az oszlopelválasztó az összegekig jobbra"
},
{
"id": "d7bc8b21e4",
"at": "2026-11-14T12:12:14+01:00",
"msg": "Kifizetések szakember nézet: keskenyebb oldalsó szél"
},
{
"id": "e4ca9409b4",
"at": "2026-11-14T12:10:13+01:00",
"msg": "Telefon: a Beállítások menüpont elrejtve (a szerepkör/fiók menüben elérhető)"
},
{
"id": "de5abbbada",
"at": "2026-11-14T12:09:13+01:00",
"msg": "Szakember Beállítások: alcím törölve"
},
{
"id": "b1ca1317ec",
"at": "2026-11-14T12:08:32+01:00",
"msg": "Kifizetések: vékonyabb projektnevek"
},
{
"id": "3ee32d9c85",
"at": "2026-11-14T12:07:05+01:00",
"msg": "Kifizetések: kisebb Összesen felirat, érintéssel nem jelölődik ki a szöveg"
},
{
"id": "6c83ffb4b8",
"at": "2026-11-14T12:05:55+01:00",
"msg": "Idővonal: a sávok neve simán tapad görgetéskor (nem ugrál); fekvő nézetben a gombok mérete visszaállítva, csak a hézagok kisebbek"
},
{
"id": "068ce61987",
"at": "2026-11-14T12:03:46+01:00",
"msg": "Fekvő telefon: kisebb naptár-gombsor"
},
{
"id": "501fe032d8",
"at": "2026-11-14T12:01:40+01:00",
"msg": "Kifizetések szakember nézetben: keretes táblázat széllel"
},
{
"id": "9965e9f06d",
"at": "2026-11-14T12:01:27+01:00",
"msg": "Kifizetések: a sorok nem nyúlnak meg, egysoros feliratok, jobbra-balra húzva hónapváltás"
},
{
"id": "869470e61b",
"at": "2026-11-14T12:00:15+01:00",
"msg": "Menüpontok és belső linkek nem húzhatók el hosszú érintéssel"
},
{
"id": "c89cec71a0",
"at": "2026-11-14T12:00:01+01:00",
"msg": "iPhone kezdőképernyős app: a menüsor a Dynamic Island szintjéig felér"
},
{
"id": "d9d8831ee3",
"at": "2026-11-14T11:58:46+01:00",
"msg": "Beosztásaim: cím és kereső egy sorban, alcím törölve"
},
{
"id": "202c11f992",
"at": "2026-11-14T11:57:52+01:00",
"msg": "iPhone: hosszú érintésre nem jön elő a link-előnézet a menüpontokon és belső linkeken"
},
{
"id": "269707ac1b",
"at": "2026-11-14T11:57:09+01:00",
"msg": "Idővonal: a jóváhagyás pipája nem lóg rá a projekt nevére"
},
{
"id": "5dc50b8bd3",
"at": "2026-11-14T11:56:42+01:00",
"msg": "Naptár súgó: hosszú tartalomnál görgethető, rá lehet vinni az egeret"
},
{
"id": "54b0106a3d",
"at": "2026-11-14T11:55:27+01:00",
"msg": "Nézet-sáv: mindenhol kisebb szöveg és gombok"
},
{
"id": "0b6f7e3f92",
"at": "2026-11-14T11:54:55+01:00",
"msg": "Jóváhagyó oldal: nincs automatikus szövegnagyítás fekvő iPhone-on"
},
{
"id": "fb2e0b2608",
"at": "2026-11-14T11:54:24+01:00",
"msg": "iPhone fekvő nézet: a Safari nem nagyítja fel magától a szövegeket"
},
{
"id": "f29b1afcaa",
"at": "2026-11-14T11:53:46+01:00",
"msg": "A csengő azonnal megjelenik betöltéskor"
},
{
"id": "ae18fa2dff",
"at": "2026-11-14T11:52:48+01:00",
"msg": "Beállítások: kisebb szövegméret a „Küldés a kollégák saját címéről” panelen"
},
{
"id": "0966aadd62",
"at": "2026-11-14T11:52:02+01:00",
"msg": "Napló: a felhasználók csökkenő sorrendben (bejegyzések száma szerint)"
},
{
"id": "5844fb4081",
"at": "2026-11-14T11:51:11+01:00",
"msg": "Beállítások: letisztultabb e-mail értesítések (kártyák, kisebb szövegek, másolat-címkék egy sorban), alcím törölve"
},
{
"id": "743725a465",
"at": "2026-11-14T11:49:25+01:00",
"msg": "Projektek lista: az ügyfél által jóváhagyott videó neve után zöld pipa"
},
{
"id": "c1b0b372c2",
"at": "2026-11-14T10:49:13Z",
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
