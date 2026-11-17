// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "6e86268506",
"at": "2026-11-17T12:51:38+02:00",
"msg": "Értékesítés: kompakt fejléc (kereső, szűrő, hónapválasztó, mutatók)"
},
{
"id": "99eb303864",
"at": "2026-11-17T12:50:59+02:00",
"msg": "Teljesítmény-súgó: sikertelen"
},
{
"id": "0568a74b96",
"at": "2026-11-17T12:50:52+02:00",
"msg": "Értékesítés: „Elveszett” helyett „Sikertelen”"
},
{
"id": "4bee393e7e",
"at": "2026-11-17T12:50:34+02:00",
"msg": "Kiküldött ajánlat: előtöltés rámutatáskor, megjegyzett PDF"
},
{
"id": "4d2b149b7a",
"at": "2026-11-17T12:49:30+02:00",
"msg": "Kiküldött ajánlat: teljes oldalnézet oldalsáv nélkül"
},
{
"id": "a3f3642fac",
"at": "2026-11-17T12:48:55+02:00",
"msg": "Mentés gomb szürke, amíg nincs mit menteni (minden ablakban); „Ajánlat kiküldve” felirat a kártyán"
},
{
"id": "1e49baacac",
"at": "2026-11-17T12:47:17+02:00",
"msg": "Kártya: kompakt ajánlat-jelzések"
},
{
"id": "e19fea1bb0",
"at": "2026-11-17T12:47:08+02:00",
"msg": "Kiküldött ajánlat: kattintásra ablakban maga a PDF; reggeli e-mail a lehetőségek mai / lejárt teendőiről"
},
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
"id": "79ef0ed09f",
"at": "2026-11-17T08:59:10Z",
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
