// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "46e632ddff",
"at": "2026-11-11T11:17:28+01:00",
"msg": "Bizonylat hozzárendelése: Mégse után vissza a számla kiállításához"
},
{
"id": "7b093e93bc",
"at": "2026-11-11T11:11:56+01:00",
"msg": "Díjbekérő sztornó: törlés a számlázz.hu-ban és az appból"
},
{
"id": "130f537c07",
"at": "2026-11-11T10:59:05+01:00",
"msg": "Videótábla: kijelölt videók csoportos húzása"
},
{
"id": "9fd6d0dcd5",
"at": "2026-11-11T10:49:50+01:00",
"msg": "Ügyfelek: Nem kell (szerződés) jelölő eltávolítva"
},
{
"id": "af8d94edb8",
"at": "2026-11-11T10:44:14+01:00",
"msg": "Jóváhagyó oldal: böngészős felugró ablakok helyett megerősítés a panelen"
},
{
"id": "47c32cb390",
"at": "2026-11-11T10:41:01+01:00",
"msg": "Jóváhagyó oldal: Megnyitás új lapon link eltávolítva"
},
{
"id": "66373b7bf2",
"at": "2026-11-11T10:39:12+01:00",
"msg": "Jóváhagyó oldal: enyhe hover a Módosítást kérek gombon"
},
{
"id": "78cc6dd455",
"at": "2026-11-11T10:38:22+01:00",
"msg": "Jóváhagyó oldal: a töltés-csík a bal szélről indul"
},
{
"id": "2eb7a85591",
"at": "2026-11-11T10:34:27+01:00",
"msg": "Jóváhagyó oldal: töltés-csík a nyitó logó alatt"
},
{
"id": "a2674d95a2",
"at": "2026-11-11T10:33:54+01:00",
"msg": "Jóváhagyó oldal: jóváhagyás után az ügyfél még üzenhet (nem kötelező)"
},
{
"id": "8f317d9593",
"at": "2026-11-11T10:30:41+01:00",
"msg": "Jóváhagyó oldal: visszafogottabb fókusz-keret a szövegmezőn"
},
{
"id": "6838676f95",
"at": "2026-11-11T10:28:23+01:00",
"msg": "Jóváhagyó oldal: szóköz hosszan nyomva 2× sebesség"
},
{
"id": "51fbfb2d3e",
"at": "2026-11-11T10:27:45+01:00",
"msg": "Jóváhagyó oldal: előbb a logó tűnik el, utána jön elő az oldal"
},
{
"id": "2c0df5faf8",
"at": "2026-11-11T10:27:00+01:00",
"msg": "Jóváhagyó oldal: nyitó logó legfeljebb 7 mp"
},
{
"id": "2b383d06ee",
"at": "2026-11-11T10:26:32+01:00",
"msg": "Jóváhagyó oldal: szóközzel indítható / megállítható a videó"
},
{
"id": "7d20e30183",
"at": "2026-11-11T10:26:09+01:00",
"msg": "Jóváhagyó oldal: a nyitó logó a videó betöltéséhez igazodik (gyorsan eltűnik, ha gyors; kivárja, ha lassú)"
},
{
"id": "188e610ce1",
"at": "2026-11-11T10:25:36+01:00",
"msg": "Jóváhagyó oldal: Tetszik a videó?"
},
{
"id": "05059c7f5a",
"at": "2026-11-11T10:24:51+01:00",
"msg": "Jóváhagyó oldal: fekvő videónál cím és alsor egy sorban"
},
{
"id": "1ee843436c",
"at": "2026-11-11T10:24:14+01:00",
"msg": "Jóváhagyó oldal: zöld Jóváhagyom gomb"
},
{
"id": "366140c92e",
"at": "2026-11-11T10:23:42+01:00",
"msg": "Jóváhagyó oldal: a kártya függőlegesen a képernyő közepén"
},
{
"id": "a0bb7af977",
"at": "2026-11-11T10:21:50+01:00",
"msg": "Jóváhagyó oldal: magyar idézőjel a súgóban"
},
{
"id": "1154e0da3e",
"at": "2026-11-11T10:19:16+01:00",
"msg": "Jóváhagyó oldal: fejléc sor egy vonalban; súgószöveg pontosítva, mintaszöveg ki"
},
{
"id": "5f5cc294e8",
"at": "2026-11-11T10:15:41+01:00",
"msg": "Jóváhagyó oldal: időkód nem kötelező, szabad szöveges módosítás-kérés"
},
{
"id": "d175d5927d",
"at": "2026-11-11T10:03:44+01:00",
"msg": "E-mail mezők: másolás gomb"
},
{
"id": "e17e787652",
"at": "2026-11-11T10:03:27+01:00",
"msg": "Telefonszám mező keskenyebb"
},
{
"id": "57b34bccfb",
"at": "2026-11-11T10:02:22+01:00",
"msg": "Jóváhagyó oldal: módosítás-kérés módban nincs Jóváhagyom gomb"
},
{
"id": "2fc31f1a16",
"at": "2026-11-11T10:01:11+01:00",
"msg": "Telefonszám másolása gomb a mezőben; jóváhagyó oldal: kisebb nyitó logó, fejléc logó vissza"
},
{
"id": "09766b0de7",
"at": "2026-11-11T09:58:55+01:00",
"msg": "Jóváhagyó oldal: a módosítás-mező csak a Módosítást kérek gombra nyílik le; kisebb logó; csúszka teljes képernyőn is"
},
{
"id": "51bccde7c3",
"at": "2026-11-11T09:54:22+01:00",
"msg": "Jóváhagyó oldal: javítás – a pCloud / YouTube link nem került a közvetlen videó ágba"
},
{
"id": "7c16a43bac",
"at": "2026-11-11T09:49:28+01:00",
"msg": "Jóváhagyó oldal: Enter sehol nem szúr be időkódot"
},
{
"id": "b5c4e79558",
"at": "2026-11-11T08:49:03Z",
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
