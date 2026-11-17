// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "9cc4f220f3",
"at": "2026-11-17T12:42:08+02:00",
"msg": "Kiküldött ajánlat a kártyán a régebben küldötteknél is (a PDF visszakeresése a levelek közül)"
},
{
"id": "bbb54bf45d",
"at": "2026-11-17T12:40:49+02:00",
"msg": "Árajánlat PDF: rendezvény dátuma évvel és napnévvel, az érvényesség csak alul (dátummal), nagykötőjel a tételnevekben"
},
{
"id": "0674edc2f7",
"at": "2026-11-17T12:25:34+02:00",
"msg": "Kiküldött ajánlat a lehetőségnél (PDF megnyitása, új verzió belőle); „Dolgozom…” jelzés középen"
},
{
"id": "bd95f61635",
"at": "2026-11-17T12:23:51+02:00",
"msg": "Mentett ajánlat jelzés: kattintásra egyből a mentett ajánlat nyílik"
},
{
"id": "9444d4219d",
"at": "2026-11-17T12:20:53+02:00",
"msg": "Új projekt: létrehozáskor csak a név (és a dátum) kötelező"
},
{
"id": "324503f351",
"at": "2026-11-17T12:19:29+02:00",
"msg": "Lehetőség ablaka: mentett ajánlat folytatása / új árajánlat gombok"
},
{
"id": "0887fb1375",
"at": "2026-11-17T12:18:51+02:00",
"msg": "Videólista: az „Utómunka alatt” lila"
},
{
"id": "70819e2dfa",
"at": "2026-11-17T12:15:59+02:00",
"msg": "Mentett ajánlat: a jelzés minden eszközön frissül"
},
{
"id": "92feb53f24",
"at": "2026-11-17T12:15:48+02:00",
"msg": "Értékesítés: „📄 Mentett ajánlat” jelzés a lehetőség kártyáján (kattintva folytatható)"
},
{
"id": "7e548ee558",
"at": "2026-11-17T12:13:00+02:00",
"msg": "Árajánlat: mentés piszkozatként (lehetőségenként, bármelyik eszközről folytatható, küldéskor törlődik); fotózás leírása: válogatott fotó átadása"
},
{
"id": "8fa79f5c0b",
"at": "2026-11-17T12:09:27+02:00",
"msg": "Naptár eszköztár: a hónapváltó nem tördel"
},
{
"id": "f298cff376",
"at": "2026-11-17T12:05:11+02:00",
"msg": "Idővonal: a projektnév a sáv végéig ér"
},
{
"id": "90799cbae5",
"at": "2026-11-17T11:25:49+02:00",
"msg": "Csengő és névjelvény: sima kurzor"
},
{
"id": "362d303324",
"at": "2026-11-17T11:25:19+02:00",
"msg": "Felső menü: sima kurzor"
},
{
"id": "dd725d5da5",
"at": "2026-11-17T11:24:32+02:00",
"msg": "Projektlista videósáv: a jóváhagyásra váró rész sárga"
},
{
"id": "9550367a9c",
"at": "2026-11-17T11:15:27+02:00",
"msg": "Nyitva hagyott app: 10 perc tétlenség után nincs háttérfrissítés (az adatbázis elalhat), mozdulatra azonnal frissít"
},
{
"id": "57842b45a3",
"at": "2026-11-17T11:12:40+02:00",
"msg": "Idővonal: markolás kurzor a sáv minden részén (a jóváhagyási kitöltésen is)"
},
{
"id": "6ef07c96d8",
"at": "2026-11-17T11:10:50+02:00",
"msg": "Idővonal: a projekt neve az óra alatt"
},
{
"id": "9fc5b3a71c",
"at": "2026-11-17T11:10:30+02:00",
"msg": "Idővonal: minden projektnév címkén; a sávon és a szövegen markolás kurzor"
},
{
"id": "15feb04218",
"at": "2026-11-17T11:09:10+02:00",
"msg": "Adatbázis-állapot (/api/dbstatus): aktív adatbázis, óránkénti Neon-lekérdezések forrás szerint, időzítők"
},
{
"id": "f6e9ba232e",
"at": "2026-11-17T11:03:06+02:00",
"msg": "Termelési v. nézet előtöltése: a nézetváltás első alkalommal is azonnali"
},
{
"id": "ff70113e98",
"at": "2026-11-17T11:02:23+02:00",
"msg": "Idővonal: fehér címke a vágási sávra átlógó projektnév mögött"
},
{
"id": "ff7a25c271",
"at": "2026-11-17T10:59:01+02:00",
"msg": "Idővonal: annyi homokóra, ahány videó vár jóváhagyásra"
},
{
"id": "79c0df5953",
"at": "2026-11-17T10:57:51+02:00",
"msg": "Idővonal: a homokóra pontosan a sárga rész közepén"
},
{
"id": "fe38e36678",
"at": "2026-11-17T10:57:34+02:00",
"msg": "Nézetmenü: a nem aktuális nézetek beljebb"
},
{
"id": "1073dd1f40",
"at": "2026-11-17T10:57:14+02:00",
"msg": "Instrukciók: a kész jelölés nem vonható vissza (nincs Visszavonás gomb)"
},
{
"id": "75e9e4acbe",
"at": "2026-11-17T10:56:56+02:00",
"msg": "Idővonal: homokóra a jóváhagyásra váró (sárga) részek közepén"
},
{
"id": "6cbb82aba3",
"at": "2026-11-17T10:01:03+02:00",
"msg": "Online pénzügyi adatkapcsolat: kimenő és bejövő számlák fogadása (PDF a Drive-ra), szakember-számlák és kimenő utalások párosítása a Kifizetésekhez, szállítói számlák kiadásként, havi banki forgalom, ügyfelek fizetési fegyelme"
},
{
"id": "df12caed6d",
"at": "2026-11-17T09:54:30+02:00",
"msg": "Beállítások előtöltése csak ügyvezető / termelési v. nézetben (szakember nézetben jogosultsági hibát adott)"
},
{
"id": "c48700aa07",
"at": "2026-11-17T09:54:06+02:00",
"msg": "Nézetváltás visszajelzése a szakember / értékesítő nevével"
},
{
"id": "4c1a6194b1",
"at": "2026-11-17T07:46:46Z",
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
