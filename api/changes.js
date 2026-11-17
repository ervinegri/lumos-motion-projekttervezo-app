// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "5916fb79cf",
"at": "2026-11-17T14:37:44+02:00",
"msg": "Ajánlat-néző: eredeti gombméret, keskeny gombsor"
},
{
"id": "64bc458679",
"at": "2026-11-17T14:35:47+02:00",
"msg": "Ajánlat-néző: alacsonyabb gombsor"
},
{
"id": "54af75e1d0",
"at": "2026-11-17T14:32:13+02:00",
"msg": "Ajánlat-néző telefonon: a teljes oldal látszik, a gombok alatta"
},
{
"id": "a256af11c9",
"at": "2026-11-17T14:29:49+02:00",
"msg": "Ajánlat-néző telefonon: a szürke keret a képernyő széléig"
},
{
"id": "598e19aa5f",
"at": "2026-11-17T14:28:41+02:00",
"msg": "Ajánlat-néző: szürke keret vissza"
},
{
"id": "0c1caf1171",
"at": "2026-11-17T14:27:55+02:00",
"msg": "Ajánlat-néző: a lap saját margóival, külső keret nélkül tölti ki a nézőt"
},
{
"id": "2cbea27ba7",
"at": "2026-11-17T14:27:14+02:00",
"msg": "Lehetőség ablaka: 📇 névjegy QR-kóddal a telefonszám mellett"
},
{
"id": "3f0df0d571",
"at": "2026-11-17T14:24:09+02:00",
"msg": "Ajánlat-néző: keskenyebb fehér szegély"
},
{
"id": "d19459a481",
"at": "2026-11-17T14:24:00+02:00",
"msg": "Ajánlat-néző: a lap fehér margói levágva, a tartalom tölti ki a nézőt"
},
{
"id": "a11aa5200c",
"at": "2026-11-17T14:23:01+02:00",
"msg": "Kiküldött ajánlat: a belső címek nem látszanak; ha csak belső címre ment, ezt jelzi"
},
{
"id": "8af1d9ad22",
"at": "2026-11-17T14:21:49+02:00",
"msg": "Ajánlat-néző: zoomgombok nélkül, nagyobb lap kis szegéllyel (csippentéssel továbbra is zoomolható)"
},
{
"id": "81627cd8be",
"at": "2026-11-17T14:20:22+02:00",
"msg": "Kiküldött ajánlat: küldő és címzett egyértelműen, belső címre küldött ajánlat jelölése"
},
{
"id": "d829f27640",
"at": "2026-11-17T14:19:41+02:00",
"msg": "Ajánlat-néző: nem lehet túlzottan kicsinyíteni, csippentéskor nem ugrál"
},
{
"id": "8edd292167",
"at": "2026-11-17T14:18:06+02:00",
"msg": "Ajánlat-néző telefonon: a lap a szélekig ér"
},
{
"id": "4b514f912f",
"at": "2026-11-17T14:17:33+02:00",
"msg": "Ajánlat-néző: zoomolás csippentéssel / Ctrl+görgővel, dupla koppintás"
},
{
"id": "61a7f4e987",
"at": "2026-11-17T14:16:25+02:00",
"msg": "Ajánlat-néző: nagyobb terület, alapból a teljes oldal látszik"
},
{
"id": "5377312396",
"at": "2026-11-17T14:14:31+02:00",
"msg": "Értékesítés: oszloprács javítása"
},
{
"id": "e68b382021",
"at": "2026-11-17T14:14:24+02:00",
"msg": "Értékesítés: a „Tárgyalás” szakasz megszűnt (a lehetőségek az „Ajánlat kiküldve” oszlopba kerülnek)"
},
{
"id": "c3fcc6cf73",
"at": "2026-11-17T13:57:06+02:00",
"msg": "Értékesítés álló telefonon: fix 210 px-es oszlopok (nem nyomódnak össze)"
},
{
"id": "f268939412",
"at": "2026-11-17T13:56:10+02:00",
"msg": "Értékesítés álló telefonon: kompaktabb oszlopok és kártyák"
},
{
"id": "6bbe438940",
"at": "2026-11-17T13:55:54+02:00",
"msg": "Értékesítés telefonon: keskeny oszlopok álló nézetben is"
},
{
"id": "d9d7ec2bfd",
"at": "2026-11-17T13:55:33+02:00",
"msg": "Kiküldött ajánlat: a PDF-et az app rajzolja ki (telefonon is), működő nagyítás"
},
{
"id": "a9a98188ad",
"at": "2026-11-17T13:23:53+02:00",
"msg": "Ajánlat-néző: a nagyítás újratölti a PDF-et"
},
{
"id": "c58a05c124",
"at": "2026-11-17T12:55:01+02:00",
"msg": "Kiküldött ajánlat nézője: nagyítás, kicsinyítés, teljes oldal, letöltés"
},
{
"id": "7a2d727f0f",
"at": "2026-11-17T12:54:45+02:00",
"msg": "Kiküldött ajánlat: ha a PDF nincs meg a levelek között, feltölthető"
},
{
"id": "8ba772c972",
"at": "2026-11-17T12:54:11+02:00",
"msg": "Kiküldött ajánlat: előtöltés már a kártyára mutatva"
},
{
"id": "e141086aa9",
"at": "2026-11-17T12:52:18+02:00",
"msg": "Kiküldött ajánlat: új lapon nyitáskor az ablak bezárul"
},
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
"id": "df1382c76f",
"at": "2026-11-17T10:50:43Z",
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
