// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "7545167f41",
"at": "2026-11-11T09:41:28+01:00",
"msg": "Jóváhagyó oldal: lejátszó menü (letöltés, sebesség, PiP) ki, külön Letöltés gomb, vastag lejátszósáv nagy fogantyúval"
},
{
"id": "1f5723d569",
"at": "2026-11-11T09:39:20+01:00",
"msg": "Jóváhagyó oldal: hang az első kattintásra bárhol, feltűnőbb hang-gomb a videó közepén"
},
{
"id": "9affa43685",
"at": "2026-11-11T09:38:05+01:00",
"msg": "Videókártya: buborékszöveg többes számban"
},
{
"id": "5b3780099f",
"at": "2026-11-11T09:37:53+01:00",
"msg": "Videókártya: Még nem nyitották meg / Megnyitották"
},
{
"id": "f70f962161",
"at": "2026-11-11T09:29:28+01:00",
"msg": "Jóváhagyó levél: Lumos postabélyegzős gomb (kopott pecsét), hover és kattintás effekttel"
},
{
"id": "8235d2b98a",
"at": "2026-11-11T09:14:58+01:00",
"msg": "Videótábla: oszlop neve Jóváhagyásra vár"
},
{
"id": "68f14347fe",
"at": "2026-11-11T08:46:26+01:00",
"msg": "Értékesítés kártya: szolgáltatások nem jelennek meg"
},
{
"id": "6804da7436",
"at": "2026-11-11T08:45:16+01:00",
"msg": "Értékesítés: oszlop neve Díjbekérő fizetve"
},
{
"id": "32b67c2772",
"at": "2026-11-11T01:02:00+01:00",
"msg": "Értékesítés: TIG-es / keretszerződéses ügyfél szerződéskor a Fizetve / rendezve oszlopba kerül"
},
{
"id": "e66912649c",
"at": "2026-11-11T00:55:41+01:00",
"msg": "Értékesítés: Díjbekérő kifizetve oszlop (kifizetett díjbekérő / számla alapján magától)"
},
{
"id": "6e80dfc72e",
"at": "2026-11-11T00:53:46+01:00",
"msg": "Ügyfél jóváhagyására vár: hozzászólás-mező mindenkinél eltűnik, a módosítási kérés külön ablakban"
},
{
"id": "ce8fcff8cd",
"at": "2026-11-11T00:52:34+01:00",
"msg": "Jelölés mód: kék keret, sötétítés és felirat a lejátszón, gomb felirata vált"
},
{
"id": "856348dcb5",
"at": "2026-11-11T00:50:24+01:00",
"msg": "Filmszalag emoji ki az átnevezésnél is"
},
{
"id": "77e5ddb343",
"at": "2026-11-11T00:49:56+01:00",
"msg": "Videó: ügyfél jóváhagyására várónál nincs hozzászólás; dupla visszadobás-komment javítás; filmszalag emoji ki a címekből"
},
{
"id": "7f84630176",
"at": "2026-11-11T00:43:44+01:00",
"msg": "Hozzászólás-duplikáció (visszadobás) javítás; szebb pipa-négyzet"
},
{
"id": "7cb31b1dd6",
"at": "2026-11-11T00:41:11+01:00",
"msg": "Videó hozzászólások: biztos időrendi (legfrissebb felül) sorrend bármilyen dátumformátumnál"
},
{
"id": "c2358dec02",
"at": "2026-11-11T00:40:21+01:00",
"msg": "Videó hozzászólások: azonos komment nem jelenik meg kétszer"
},
{
"id": "610e133e9a",
"at": "2026-11-11T00:37:28+01:00",
"msg": "Videótábla ablak: film emoji ki, cím és határidő egy vonalban"
},
{
"id": "c6fc9d02ee",
"at": "2026-11-11T00:36:59+01:00",
"msg": "Videótábla: tovább-nyíl le a kártyákról"
},
{
"id": "916e46fcf2",
"at": "2026-11-11T00:36:27+01:00",
"msg": "Videótábla: ügyféloldali oszlopok vizuálisan különválasztva"
},
{
"id": "c877793ec6",
"at": "2026-11-11T00:34:47+01:00",
"msg": "Videótábla: tiltott oszlop nem világosodik ki húzáskor, és nem lehet beledobni"
},
{
"id": "af665392a6",
"at": "2026-11-11T00:32:18+01:00",
"msg": "Ügyfélnek küldés: csak vezető nyithatja; megszólítás zárójeles megjegyzés nélkül; új gomb az előnézetben"
},
{
"id": "7a140a7668",
"at": "2026-11-11T00:29:55+01:00",
"msg": "Videólink csak Utómunka alatt állapotban (vagy belső ellenőrzésre küldéskor) adható meg"
},
{
"id": "35a474b4d7",
"at": "2026-11-11T00:27:05+01:00",
"msg": "Videótábla: vágó csak Utómunka alatt / Belső ellenőrzés oszlopba húzhat"
},
{
"id": "f2d84f5dbc",
"at": "2026-11-11T00:24:57+01:00",
"msg": "Ügyfélnek küldés saját projektnél: csak projektvezető vagy ügyvezető címzett"
},
{
"id": "ea90b45c17",
"at": "2026-11-11T00:23:23+01:00",
"msg": "Videókártya: megnyitás-jelzés külön sorban"
},
{
"id": "30dabdd5b4",
"at": "2026-11-11T00:23:14+01:00",
"msg": "Videótábla: egyforma magas kártyák"
},
{
"id": "bc2831fbd4",
"at": "2026-11-11T00:21:10+01:00",
"msg": "Ügyfélnek küldés: ügyfél nélküli projektnél nem gyűjti be más projektek kapcsolattartóit"
},
{
"id": "c1437abd5f",
"at": "2026-11-11T00:19:04+01:00",
"msg": "Vágó nézet: az ügyfél e-mail címe nem látszik a hozzászólásokban"
},
{
"id": "2c6dc7374a",
"at": "2026-11-11T00:12:18+01:00",
"msg": "Ügyfél-link megnyitásának jelzése a videókártyán; új Lumos gomb a jóváhagyó levélben"
},
{
"id": "8a92f39291",
"at": "2026-11-10T23:07:10Z",
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
