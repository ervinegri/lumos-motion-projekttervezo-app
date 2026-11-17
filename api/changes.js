// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "16e89b513f",
"at": "2026-11-17T15:07:21+02:00",
"msg": "Ajánlat-néző fekvő telefonon: oldalsó szélek nélkül"
},
{
"id": "ac3c1729b9",
"at": "2026-11-17T15:05:23+02:00",
"msg": "Ajánlat-néző telefonon: fejléc és gombsor fix, csak az ajánlat görget / nagyítódik"
},
{
"id": "284d8e39f2",
"at": "2026-11-17T15:04:43+02:00",
"msg": "Ajánlat-néző telefonon: gombsor a képernyő alján, nincs üres sáv alatta"
},
{
"id": "8c003a2100",
"at": "2026-11-17T15:04:10+02:00",
"msg": "Folyamatjelzés: két sorban (művelet, alatta a címe)"
},
{
"id": "f431af76a4",
"at": "2026-11-17T15:01:45+02:00",
"msg": "Ajánlat-néző: kompakt fejléc"
},
{
"id": "672b209b7f",
"at": "2026-11-17T15:00:43+02:00",
"msg": "Értékesítés: cím nélkül, kisebb távolság a gombsor körül"
},
{
"id": "f25dc5ea4d",
"at": "2026-11-17T14:59:34+02:00",
"msg": "Ajánlat-néző fekvő telefonon: mint állóban"
},
{
"id": "9008a5e720",
"at": "2026-11-17T14:58:58+02:00",
"msg": "Ajánlat-néző: nagyításkor a fejléc és a gombsor nem változik"
},
{
"id": "b434b1354c",
"at": "2026-11-17T14:57:23+02:00",
"msg": "Ajánlat-néző: új nagyítás – egyszeri, nagy felbontású rajzolás, a csippentés csak a méretet állítja (elengedéskor nem ugrik)"
},
{
"id": "a3cc6377de",
"at": "2026-11-17T14:56:02+02:00",
"msg": "Folyamatjelzés: „Dolgozom…” helyett kiírja, mit tölt be (pl. Ajánlat betöltése – …)"
},
{
"id": "e4dfa5f0fe",
"at": "2026-11-17T14:55:03+02:00",
"msg": "Kiküldött ajánlat: betöltés közben másikra kattintva mindig az utoljára kért nyílik meg"
},
{
"id": "c2d7ed12f6",
"at": "2026-11-17T14:50:07+02:00",
"msg": "Ajánlat-néző: zoom elengedésekor a valóban görgető elemet igazítjuk (nem ugrik)"
},
{
"id": "fcf490f2dc",
"at": "2026-11-17T14:48:28+02:00",
"msg": "Ajánlat-néző: csippentés után a nagyított rész a helyén marad (nem ugrik középre)"
},
{
"id": "3dfa264edd",
"at": "2026-11-17T14:46:34+02:00",
"msg": "Ajánlat-néző: görgetés elengedése után visszaáll a kiinduló helyzetbe (nagyítás nélkül)"
},
{
"id": "6fde77ef79",
"at": "2026-11-17T14:42:34+02:00",
"msg": "Ajánlat-néző telefonon: fele olyan magas gombsáv"
},
{
"id": "b1859baefc",
"at": "2026-11-17T14:40:27+02:00",
"msg": "Ajánlat-néző: alacsonyabb gombsáv"
},
{
"id": "a8478ad206",
"at": "2026-11-17T14:39:42+02:00",
"msg": "Ajánlat-néző: görgetéskor nem változik a nagyítás (dupla koppintás kivéve)"
},
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
"id": "8418d85fed",
"at": "2026-11-17T12:18:15Z",
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
