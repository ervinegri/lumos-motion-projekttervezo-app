// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "f76c82e811",
"at": "2026-11-11T23:50:35+01:00",
"msg": "Projekt lépései: pipa csak a teljesült lépésen, üres karika nélkül"
},
{
"id": "c41b4e8f50",
"at": "2026-11-11T23:49:20+01:00",
"msg": "Projekt lépései: Jóváhagyásra vár lépés ki; videós utómunka itt nem húzható (a videótáblán halad)"
},
{
"id": "f790bece25",
"at": "2026-11-11T23:46:34+01:00",
"msg": "Időkódos pipák: az ügyvezető nem pipálhat, csak a videó vágója"
},
{
"id": "796570f155",
"at": "2026-11-11T23:44:12+01:00",
"msg": "Videóablak: „A videó jóváhagyásra vár.” felirat"
},
{
"id": "250876cf42",
"at": "2026-11-11T23:23:40+01:00",
"msg": "Naptár: a vágószűrő a csak vágásos projektekre is vonatkozik"
},
{
"id": "2425de4180",
"at": "2026-11-11T23:20:02+01:00",
"msg": "Idővonal, Jóváhagyásra vár sáv: kattintásra a videótábla nyílik"
},
{
"id": "a6d74e71e1",
"at": "2026-11-11T23:19:01+01:00",
"msg": "Videótábla: a vágó az Utómunka alatt videót visszahúzhatja az Utómunkára vár oszlopba"
},
{
"id": "4025c4e975",
"at": "2026-11-11T23:18:32+01:00",
"msg": "Videótábla: a kártyán nincs „Kattints…” buborék"
},
{
"id": "7f5c600c1c",
"at": "2026-11-11T23:16:45+01:00",
"msg": "Videóablak: jóváhagyás időpontja; időkód-magyarázat ki"
},
{
"id": "19d7ecffa6",
"at": "2026-11-11T23:14:24+01:00",
"msg": "Videóablak (vágó): rövid állapotszöveg leadott / jóváhagyott videónál"
},
{
"id": "e392cfeb31",
"at": "2026-11-11T23:13:56+01:00",
"msg": "Videótábla: utómunkára váró / vágás alatti videóknál nincs Átnézés egymás után"
},
{
"id": "df092f67d8",
"at": "2026-11-11T23:13:33+01:00",
"msg": "Videóablak: egy kártyára kattintva nincs lapozó (1/6), csak kijelölt videóknál"
},
{
"id": "d121590792",
"at": "2026-11-11T23:12:25+01:00",
"msg": "Videóablak (vágó): Elkezdem a vágást gomb ki, csak a tájékoztató szöveg"
},
{
"id": "d2c26afec9",
"at": "2026-11-11T23:11:13+01:00",
"msg": "Videóablak (vágó): Utómunkára vár állapotban „Elkezdem a vágást” gomb a hozzászólás-zárolás helyett"
},
{
"id": "b2a3ef3b20",
"at": "2026-11-11T23:08:31+01:00",
"msg": "Videóablak: helyes zárolási szöveg a még el nem kezdett videóknál"
},
{
"id": "cfd5a76773",
"at": "2026-11-11T23:07:43+01:00",
"msg": "Vágási buborék: előbb a darabszám, utána a videó neve"
},
{
"id": "6149a52057",
"at": "2026-11-11T23:03:35+01:00",
"msg": "Idővonal: minden lezárt munka sávján pipa, egynapos sávon is"
},
{
"id": "588510efde",
"at": "2026-11-11T23:01:45+01:00",
"msg": "Állapot felirat: „Jóváhagyásra vár”"
},
{
"id": "85cfe7870d",
"at": "2026-11-11T23:00:17+01:00",
"msg": "Vágási sáv buboréka: projekt névvel kezd, a videók állapota soronként"
},
{
"id": "7a284c038d",
"at": "2026-11-11T22:58:49+01:00",
"msg": "Videóablak: rövidebb zárolási felirat"
},
{
"id": "97785c0223",
"at": "2026-11-11T22:56:40+01:00",
"msg": "Jóváhagyó link: bejelentkezett csapattag megnyitása nem számít az ügyfél megnyitásának"
},
{
"id": "8d69fd1829",
"at": "2026-11-11T22:18:24+01:00",
"msg": "Ügyfélnek küldés: tárgy „Elkészültek: N db videó – …”"
},
{
"id": "dcdadee9c3",
"at": "2026-11-11T22:07:38+01:00",
"msg": "Jóváhagyó oldal: rövidebb letöltési tipp"
},
{
"id": "67d9fa6da4",
"at": "2026-11-11T22:05:15+01:00",
"msg": "Jóváhagyó oldal: a panel újra közvetlenül a videó mellett, alul; a jobb nyíl a panel fölött"
},
{
"id": "af501435a3",
"at": "2026-11-11T22:03:58+01:00",
"msg": "Naptár: a vágói határidőknél csak ✂️ + a projekt neve (a „Leadás:” szó nélkül)"
},
{
"id": "d608bd67ac",
"at": "2026-11-11T22:03:21+01:00",
"msg": "Jóváhagyó oldal: gépen a panel a videó melletti nyíl alatt kezdődik (felülre igazítva, üres sáv nélkül)"
},
{
"id": "1b0e2818c5",
"at": "2026-11-11T21:58:00+01:00",
"msg": "Jóváhagyó oldal: a letöltés lista nem pipál (a böngésző nem jelzi a mentést), csak jelzi, hogy elindult"
},
{
"id": "7b945309bd",
"at": "2026-11-11T21:56:11+01:00",
"msg": "Jóváhagyó oldal: letöltött videók pipája a listában"
},
{
"id": "b9e2c9c3d4",
"at": "2026-11-11T21:53:56+01:00",
"msg": "Jóváhagyó oldal: a jóváhagyott videók letöltése gépen ténylegesen elindul (rejtett keret helyett közvetlen letöltés)"
},
{
"id": "2e68b5c5a9",
"at": "2026-11-11T21:50:10+01:00",
"msg": "Jóváhagyó oldal: visszajelzés a jóváhagyott videók letöltésénél"
},
{
"id": "cda081c0ed",
"at": "2026-11-11T21:48:05+01:00",
"msg": "Jóváhagyó oldal: a listából letöltés nem nyit új (fekete) lapot"
},
{
"id": "e7c9a7abd1",
"at": "2026-11-11T21:47:55+01:00",
"msg": "Jóváhagyó oldal telefonon: jóváhagyott videók letöltése listából, egyenként"
},
{
"id": "7c2639de36",
"at": "2026-11-11T21:45:18+01:00",
"msg": "Jóváhagyó oldal telefonon: videó pontosan középen"
},
{
"id": "443def6dff",
"at": "2026-11-11T21:44:03+01:00",
"msg": "Jóváhagyó oldal: előnézeti sáv ki; telefonon a logó és a teljes videó egy képernyőn, váltáskor a lap tetejére"
},
{
"id": "c0b380336d",
"at": "2026-11-11T21:42:54+01:00",
"msg": "Jóváhagyó oldal telefonon: videó középre igazítva, nyitókép legkésőbb 12 mp után eltűnik"
},
{
"id": "0b5eeb77d4",
"at": "2026-11-11T21:40:19+01:00",
"msg": "Jóváhagyó oldal telefonon: videóváltáskor a videó teljes egészében látszik (nem vág le alul)"
},
{
"id": "23d627b8d5",
"at": "2026-11-11T21:38:33+01:00",
"msg": "Jóváhagyó oldal: több videónál letöltés csak a végén (jóváhagyott videók egyben), telefonon teljes szélességű videó, számok egy sorban"
},
{
"id": "7b13292b24",
"at": "2026-11-11T21:36:12+01:00",
"msg": "Jóváhagyó oldal: nyilak a videó két oldalán (gépen), telefonon első képkocka és keret nélküli oldal"
},
{
"id": "62c244c1cb",
"at": "2026-11-11T21:34:13+01:00",
"msg": "Jóváhagyó oldal: telefonon nem vár a videó betöltésére a nyitókép (max. 1,5 s), gépen max. 4 s"
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
