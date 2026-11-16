// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "d381e2615d",
"at": "2026-11-16T12:03:43+02:00",
"msg": "Lemondás ablak: termelési vezetőnél nincs „pénzügyek” említés"
},
{
"id": "868f9e500f",
"at": "2026-11-16T12:03:09+02:00",
"msg": "Lemondás ablak: látszik, ki kap értesítést"
},
{
"id": "1cce8d294b",
"at": "2026-11-16T12:00:05+02:00",
"msg": "Lemondáskor e-mail a termelési vezetőnek; a háttér már nem kér csapat-véglegesítést a helyszíni munkához"
},
{
"id": "4482100e84",
"at": "2026-11-16T11:55:04+02:00",
"msg": "Stáb és eszközök: a pozíciószámláló címkék törölve (a kártyák mutatják)"
},
{
"id": "8054a01534",
"at": "2026-11-16T11:53:40+02:00",
"msg": "Pozíció-kártyák: egy meghívó személyenként, nincs duplikált szerepmező, csillag csak projektvezető nélkül, egységes kuka (pozícióról levétel), „Távolról vezeti”"
},
{
"id": "3a65af9fb5",
"at": "2026-11-16T11:51:25+02:00",
"msg": "A közös „Csapat véglegesítése” funkció kikapcsolva (pozíciónként, külön véglegesítünk)"
},
{
"id": "65b9712e6c",
"at": "2026-11-16T11:43:13+02:00",
"msg": "Vercel: a szintaxis-ellenőrzés beágyazva fut (a tests/ mappa nincs a buildben, emiatt maradtak ki a telepítések)"
},
{
"id": "c7b3049a62",
"at": "2026-11-16T11:28:26+02:00",
"msg": "Kifizetések: a számla sorszáma tördelve, teljes egészében olvasható"
},
{
"id": "47ef0c614f",
"at": "2026-11-16T11:24:09+02:00",
"msg": "Projektek: a keresőmező a táblázat „Projekt” fejlécébe került"
},
{
"id": "eef61b35f9",
"at": "2026-11-16T11:23:35+02:00",
"msg": "Figyelmeztetések: „A stáb nincs véglegesítve” / „módosult” is megjelenik"
},
{
"id": "380db208ca",
"at": "2026-11-16T11:21:53+02:00",
"msg": "Projektlista: „N napja jóváhagyásra vár” egy sárga címkében, a külön állapotcímke nélkül"
},
{
"id": "d8351a3968",
"at": "2026-11-16T11:21:00+02:00",
"msg": "Projektlista: a videók teljes neve látszik"
},
{
"id": "56f100373a",
"at": "2026-11-16T11:20:15+02:00",
"msg": "Projektlista: forgatás előtt nincs „Utómunkára vár” a videóknál"
},
{
"id": "8cdd835ac8",
"at": "2026-11-16T11:19:34+02:00",
"msg": "Kifizetések: a számla teljes sorszáma látszik a kártyán"
},
{
"id": "db54326949",
"at": "2026-11-16T11:17:18+02:00",
"msg": "Felületi szintaxis-teszt; szintaxishibás felület nem települ a Vercelre"
},
{
"id": "bf0343d530",
"at": "2026-11-16T11:16:45+02:00",
"msg": "Javítás: fölösleges zárójel a projektlistában (az app nem töltött be)"
},
{
"id": "601f6e0947",
"at": "2026-11-16T11:14:51+02:00",
"msg": "Projektlista: állapotcímkék egy sorban; tételes videólista mellett nincs közös „Leadott videó” gomb"
},
{
"id": "34fd54e6da",
"at": "2026-11-16T11:13:25+02:00",
"msg": "Videólista: azonos stádium egyszer, a projektjelzés által már kimondott stádium egyszer sem; redundancia-szabály a CLAUDE.md-ben"
},
{
"id": "dc4109eca9",
"at": "2026-11-16T11:12:41+02:00",
"msg": "Projektlista: 3-nál több videó összecsukva, stádium-összesítővel, lenyitható"
},
{
"id": "19a465a9b1",
"at": "2026-11-16T11:12:07+02:00",
"msg": "Nem fizetős projekt: teljes Extrák menü; fizetős tétel választásakor újra fizetős lesz"
},
{
"id": "5cabcd3164",
"at": "2026-11-16T11:10:34+02:00",
"msg": "Nem fizetős projekt: az ajánlói jutalék is az Extrák menüből, mint a fizetősnél"
},
{
"id": "8fa966ac98",
"at": "2026-11-16T11:06:46+02:00",
"msg": "Projektlista: videók tételesen a stádiumukkal; Szerződés és Termelés kártya azonos magasságú"
},
{
"id": "398232deed",
"at": "2026-11-16T11:04:04+02:00",
"msg": "Nyersanyag-, leadás- és TIG-levelek is a kolléga saját címéről (domainszintű küldés)"
},
{
"id": "bc0c6e2983",
"at": "2026-11-16T10:59:48+02:00",
"msg": "Projektek: „Lezárt projektek” lenyitható csoport; háttér: szintaxis-ellenőrzés a telepítés előtt, sikertelen telepítésről nincs GitHub-e-mail"
},
{
"id": "c9765a4086",
"at": "2026-11-16T10:57:14+02:00",
"msg": "HubSpot társítás javítás (szintaxis); díjmentes projekt: tiszta 🎁 jelölés a Szerződés kártyán"
},
{
"id": "7b8642afee",
"at": "2026-11-16T10:55:06+02:00",
"msg": "HubSpot: kapcsolattartó–cég társítás a batch/associate/default végponttal (HTTP 415 javítás)"
},
{
"id": "78127b15aa",
"at": "2026-11-16T09:26:04+02:00",
"msg": "Vercel: nincs build, ha csak háttér / teszt / Action / leírás változott (buildperc-spórolás)"
},
{
"id": "92cdde17b1",
"at": "2026-11-15T19:13:02+02:00",
"msg": "Pozíció-címkék finom pasztell színe szerepcsoportonként"
},
{
"id": "1c3d14c918",
"at": "2026-11-15T19:10:33+02:00",
"msg": "Pozíció-kártyák: a meghívó (állapota) minden kártyán látszik – egy meghívó szól az ember összes pozíciójára"
},
{
"id": "693f0b147b",
"at": "2026-11-15T19:09:08+02:00",
"msg": "Projekt: az ajánlói jutalék kikerül az Egyéb költségek táblából, az összege az Ajánlói jutalék dobozban adható meg"
},
{
"id": "1d4ae4b221",
"at": "2026-11-15T16:49:03Z",
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
