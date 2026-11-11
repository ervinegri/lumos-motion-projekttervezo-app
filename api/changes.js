// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "173b32672b",
"at": "2026-11-11T18:56:04+01:00",
"msg": "Jóváhagyó oldal: nagyobb, számozott videó-pöttyök"
},
{
"id": "57dbcde340",
"at": "2026-11-11T18:55:17+01:00",
"msg": "Jóváhagyó oldal: betöltéskor mindig a nyitó logó (nem a Betöltés… felirat)"
},
{
"id": "5f548e40e8",
"at": "2026-11-11T18:54:12+01:00",
"msg": "Jóváhagyó oldal: videóváltáskor nem ugrik el az elrendezés"
},
{
"id": "353773c825",
"at": "2026-11-11T18:52:57+01:00",
"msg": "Jóváhagyó oldal: videóváltás újratöltés nélkül (csak a lejátszó és a panel cserélődik)"
},
{
"id": "d902bf3983",
"at": "2026-11-11T18:51:46+01:00",
"msg": "Jóváhagyó előnézet: a gombok kipróbálhatók (látszik a jóváhagyás utáni üzenet lehetőség), de nem küldenek semmit"
},
{
"id": "77348a3cb2",
"at": "2026-11-11T18:49:48+01:00",
"msg": "Ügyfél-link: projekttervezo.lumosmotion.hu/<kód> (a /v/ nélkül)"
},
{
"id": "c0024b4221",
"at": "2026-11-11T18:49:18+01:00",
"msg": "Jóváhagyó oldal: videólapozó a panel tetején (pöttyökkel); előnézet rövid linkkel"
},
{
"id": "b0ce48d2e3",
"at": "2026-11-11T18:47:30+01:00",
"msg": "Több videós ügyfél-levél: videók listája külön sorokban, Videók megtekintése gomb"
},
{
"id": "a1fb57cbac",
"at": "2026-11-11T18:44:19+01:00",
"msg": "Több videó egy levélben az ügyfélnek: közös jóváhagyó oldal fülekkel, videónkénti döntés; a módosítás mezője a sorokkal nő"
},
{
"id": "8195547feb",
"at": "2026-11-11T18:39:01+01:00",
"msg": "Ügyfél-levél előnézet: a Videó megtekintése gomb kipróbálható (megnyitásnak nem számít, dönteni nem lehet)"
},
{
"id": "67a4c5b7d3",
"at": "2026-11-11T18:38:12+01:00",
"msg": "Videó ablak telefonon: teljes képernyős, rendezett elrendezés"
},
{
"id": "1219f35000",
"at": "2026-11-11T18:36:17+01:00",
"msg": "Videó ablak telefonon: teljes képernyős, rendezett elrendezés"
},
{
"id": "63c038d6cc",
"at": "2026-11-11T18:32:40+01:00",
"msg": "Levélből nyitott videó: bejelentkezés után is megnyílik (telefonon is)"
},
{
"id": "e581a6fa6a",
"at": "2026-11-11T18:30:18+01:00",
"msg": "Csoportos belső ellenőrzésre küldés: egy ablak, egy közös levél"
},
{
"id": "2c2287182b",
"at": "2026-11-11T18:29:00+01:00",
"msg": "Videótábla: átnézés csak a belső ellenőrzéstől"
},
{
"id": "2a2297fe97",
"at": "2026-11-11T18:28:26+01:00",
"msg": "Átnézés nézet: a videó rögtön elindul"
},
{
"id": "d6b11ca23f",
"at": "2026-11-11T18:27:09+01:00",
"msg": "Videótábla fejléc: kompakt ikongombok (▶, ☑)"
},
{
"id": "3d9e048d07",
"at": "2026-11-11T18:25:17+01:00",
"msg": "Videótábla: oszloponként Mind kijelölése gomb"
},
{
"id": "3e4ca1ee4e",
"at": "2026-11-11T18:24:53+01:00",
"msg": "Videó ablak: lapozáskor az előző tájolással indul (nincs fekvő fekete villanás)"
},
{
"id": "1a6b4b65cf",
"at": "2026-11-11T18:22:17+01:00",
"msg": "Videó ablak: vágás alatt (linkkel) nincs hozzászólás-mező"
},
{
"id": "302c16163c",
"at": "2026-11-11T18:20:55+01:00",
"msg": "Videó ablak: Utómunka alatt a link cserélhető"
},
{
"id": "78b093cd85",
"at": "2026-11-11T18:19:11+01:00",
"msg": "Videó ablak: Utómunka alatt beilleszthető a link"
},
{
"id": "be148310c4",
"at": "2026-11-11T18:18:40+01:00",
"msg": "Videó ablak: a lapozó nyilak mindig ugyanott (jobb felső sarok)"
},
{
"id": "d5d267b933",
"at": "2026-11-11T18:17:33+01:00",
"msg": "Videó ablak: link nélkül a mező a vágónak szóló kérésekre hív"
},
{
"id": "e1585e57b7",
"at": "2026-11-11T18:15:18+01:00",
"msg": "Videó ablak: Link beillesztése csak belső ellenőrzésre küldéskor; csoportos húzásnál látszik a darabszám"
},
{
"id": "195b52c2cf",
"at": "2026-11-11T18:10:49+01:00",
"msg": "Jóváhagyva: link nélkül rákérdez a linkre; hiányzó link pótolható; az ügyvezető visszavonhatja a jóváhagyást"
},
{
"id": "a6af8e2782",
"at": "2026-11-11T18:05:48+01:00",
"msg": "Jóváhagyó oldal: a panel közvetlenül az álló videó mellett"
},
{
"id": "b70b68fa34",
"at": "2026-11-11T18:04:39+01:00",
"msg": "Jóváhagyó oldal: Elküldöm a módosítást gombfelirat"
},
{
"id": "be1c7b8be2",
"at": "2026-11-11T18:03:26+01:00",
"msg": "Jóváhagyó oldal: álló videó az oldal közepén"
},
{
"id": "cf47f8fce0",
"at": "2026-11-11T18:01:56+01:00",
"msg": "Jóváhagyó oldal: teljes képernyős elrendezés (nem lebegő kártya)"
},
{
"id": "d51c0ad9c2",
"at": "2026-11-11T17:57:51+01:00",
"msg": "Jóváhagyó oldal: a panel a videó aljához igazodik, a két gomb egymás mellett"
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
