// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "f3215e65b5",
"at": "2026-11-14T11:49:04+01:00",
"msg": "Fekvő telefon: Projektek lista egyoszlopos, a státuszcímkék a név alatt egy sorban"
},
{
"id": "ed362f3b42",
"at": "2026-11-14T11:47:17+01:00",
"msg": "Telefon: keresőmezőre koppintva nem nagyít rá az oldal (iOS)"
},
{
"id": "1a622b0b62",
"at": "2026-11-14T11:46:51+01:00",
"msg": "Nézetváltás jól látható jelzéssel; álló telefonon a logó a bal szélen, kisebb; Projektek alcím törölve"
},
{
"id": "47ef6869cf",
"at": "2026-11-14T11:43:35+01:00",
"msg": "Álló telefon naptár: nincs Új projekt gomb, Google a szűrők sorában; munkaszűrő középen"
},
{
"id": "0aa910aa3b",
"at": "2026-11-14T11:42:26+01:00",
"msg": "Álló telefon: egysoros fejléc – menüpontok, szerepkör és csengő együtt húzható, a logó helyben marad"
},
{
"id": "ec38d66cff",
"at": "2026-11-14T11:40:05+01:00",
"msg": "Bevételek: a teljes táblázat látszik, nincs belső függőleges görgetés"
},
{
"id": "0ab44f4dca",
"at": "2026-11-14T11:39:38+01:00",
"msg": "Telefon: a Fizetések táblázat kitölti a képernyő alját; álló nézetben a pénzügyi fülek rövid felirattal, fixen egy sorban"
},
{
"id": "213b90b91f",
"at": "2026-11-14T10:37:09Z",
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
