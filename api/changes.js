// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "8130ec4f84",
"at": "2026-11-11T11:51:26+01:00",
"msg": "Videó: keret a ▶ gombon"
},
{
"id": "aac1c67c8e",
"at": "2026-11-11T11:50:38+01:00",
"msg": "Videó hozzászólások: magyarázat a kattintható időkódokról, válaszok elkülönítve"
},
{
"id": "fd111deeca",
"at": "2026-11-11T11:48:55+01:00",
"msg": "Videó hozzászólások: javítás alatt nincs felső mező, a hozzászólás sarkában ↩ Válasz"
},
{
"id": "93268b8aad",
"at": "2026-11-11T11:47:34+01:00",
"msg": "Videó: ▶ gomb az időkód mögött (lejátszás / megállítás), az időkód csak odaugrik"
},
{
"id": "a7bd4def88",
"at": "2026-11-11T11:46:00+01:00",
"msg": "Videó: ugyanarra az időkódra újra kattintva a lejátszás megáll"
},
{
"id": "d922fca128",
"at": "2026-11-11T11:44:38+01:00",
"msg": "Videó ablak: javítás alatt általános válasz mező (automatikus időkód nélkül); Megnyitás új lapon eltávolítva"
},
{
"id": "ec0ddf9e9f",
"at": "2026-11-11T11:42:16+01:00",
"msg": "Videós e-mailek: a link egyenesen a videót nyitja meg a hozzászólásokkal"
},
{
"id": "a466e0bf78",
"at": "2026-11-11T11:32:18+01:00",
"msg": "Videó-hozzászólás: az időkód-kiemelés görgetősávnál is egyben marad a szöveggel"
},
{
"id": "b4a12d67af",
"at": "2026-11-11T11:31:12+01:00",
"msg": "Videó-hozzászólás: időkód beszúrásakor a mező nem ugrik a lista aljára"
},
{
"id": "95266a9d45",
"at": "2026-11-11T11:23:21+01:00",
"msg": "Számlakártyák: Opciók menü (jelölés fizetettnek, sztornó) a közvetlen gombok helyett"
},
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
"id": "b0bf57e3c7",
"at": "2026-11-11T09:21:59Z",
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
