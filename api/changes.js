// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "115c5b4785",
"at": "2026-11-11T20:20:41+01:00",
"msg": "Vágónak szóló jóváhagyás-levél: a munkádat; dátum nélkül"
},
{
"id": "7b70509a8c",
"at": "2026-11-11T20:06:25+01:00",
"msg": "Vágónak szóló jóváhagyás-levél: dőlt lábléc"
},
{
"id": "b112ff5033",
"at": "2026-11-11T20:04:40+01:00",
"msg": "Vágónak szóló értesítések: az ügyfél említése nélkül"
},
{
"id": "4114cff1ac",
"at": "2026-11-11T19:59:51+01:00",
"msg": "Vágónak szóló jóváhagyás-levél: a jóváhagyó neve nélkül"
},
{
"id": "a6336051c5",
"at": "2026-11-11T19:56:27+01:00",
"msg": "Ügyfél-jóváhagyás: e-mail a videó vágójának (üzenet és link nélkül)"
},
{
"id": "f7b66927e9",
"at": "2026-11-11T19:54:04+01:00",
"msg": "Vágó: appon belüli értesítés (csengő), ha a videója továbbment az ügyfélnek vagy jóváhagyták"
},
{
"id": "e00ae51f7f",
"at": "2026-11-11T19:45:55+01:00",
"msg": "Jóváhagyó: üzenet csak a Jóváhagyom után, döntéskor eltűnik a Tetszik a videó? cím; minden videó előtöltése; belső: M = némítás"
},
{
"id": "2b802da48f",
"at": "2026-11-11T19:25:23+01:00",
"msg": "Hozzászólás: időrendi időkód-beszúrás, Enter után megy tovább a videó, húzás után megáll; jóváhagyó: üzenet a gombok alatt, semleges Következő videó gomb"
},
{
"id": "853dff78ca",
"at": "2026-11-11T19:10:00+01:00",
"msg": "Jóváhagyó oldal: a többi videó előtöltése, azonnali váltás"
},
{
"id": "eb2534b155",
"at": "2026-11-11T19:07:15+01:00",
"msg": "Jóváhagyó oldal: üzenet a jóváhagyással együtt (előtte), utána már nem"
},
{
"id": "2d7a0b8f87",
"at": "2026-11-11T19:04:41+01:00",
"msg": "Helyes rag: 8-ból / 3-ból / 10-ből; hónapnév -tól/-től"
},
{
"id": "7d8851f35b",
"at": "2026-11-11T19:03:59+01:00",
"msg": "Jóváhagyó oldal: a Letöltés gomb videóváltás után is azonnal megjelenik"
},
{
"id": "bd1c98717d",
"at": "2026-11-11T19:01:27+01:00",
"msg": "Jóváhagyó előnézet: a kipróbált döntések videóváltáskor is látszanak"
},
{
"id": "113803062f",
"at": "2026-11-11T19:00:47+01:00",
"msg": "Jóváhagyó oldal: kevesebb üres hely felül, nagyobb álló videó"
},
{
"id": "5fab3d04f5",
"at": "2026-11-11T19:00:04+01:00",
"msg": "Jóváhagyó oldal: a módosítás-mező legfeljebb a videó magasságáig nő, utána görget"
},
{
"id": "177270d8b3",
"at": "2026-11-11T18:59:17+01:00",
"msg": "Jóváhagyó oldal: a cím a videó fölött; Videó letöltése gomb a panelben"
},
{
"id": "30d8a2b4c3",
"at": "2026-11-11T18:58:01+01:00",
"msg": "Jóváhagyó oldal: videóváltáskor a szám, a cím és a panel azonnal vált"
},
{
"id": "0e25889e2d",
"at": "2026-11-11T18:56:48+01:00",
"msg": "Jóváhagyó oldal: Szeretnél üzenni valamit?"
},
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
