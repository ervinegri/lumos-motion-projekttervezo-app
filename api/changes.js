// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "01187ea839",
"at": "2026-11-12T09:43:22+01:00",
"msg": "Jóváhagyott sáv: forgatás sötétebb zöld, fehér elválasztó a vágás előtt"
},
{
"id": "cd9450cbb5",
"at": "2026-11-12T09:42:25+01:00",
"msg": "Jóváhagyott projekt forgatási sávja is zöld"
},
{
"id": "c995c326ce",
"at": "2026-11-12T09:38:28+01:00",
"msg": "Jóváhagyott vágási sáv: zöld felülírja a sárga jóváhagyásra vár színt"
},
{
"id": "aba7f7805d",
"at": "2026-11-12T09:35:08+01:00",
"msg": "Jóváhagyott vágási sáv zöld háttér (specifikusabb szabály)"
},
{
"id": "5712b24eaf",
"at": "2026-11-12T09:32:50+01:00",
"msg": "Vágói jóváhagyó e-mail: emoji törölve, munka csak egyszer"
},
{
"id": "b6c538c7c6",
"at": "2026-11-12T09:30:33+01:00",
"msg": "Idővonal: minden videó jóváhagyva → zöld „Jóváhagyva” sáv, kikerül a Jóváhagyásra vár részből; jóváhagyás e-mail zöld kiemelés"
},
{
"id": "4aa4ea35bd",
"at": "2026-11-12T09:28:37+01:00",
"msg": "Fizetés: a projekt értéke a quotePrice mezőből"
},
{
"id": "6c485ad67e",
"at": "2026-11-12T09:28:18+01:00",
"msg": "Időkódos és leadott videók hozzászólásai nem törölhetők; a teljes összeget fedező foglaló után kifizetett (vízjel le)"
},
{
"id": "6f4d9c310d",
"at": "2026-11-12T09:22:49+01:00",
"msg": "Ügyfél levél gomb: szöveg és lejátszás ikon táblázattal egy vonalban (minden levelezőben)"
},
{
"id": "a8ea0f2f63",
"at": "2026-11-12T09:22:08+01:00",
"msg": "Belső ellenőrzés e-mail: videólink és magyarázó mondat ki, dőlt lábléc"
},
{
"id": "819c9773ee",
"at": "2026-11-12T09:19:57+01:00",
"msg": "Ügyfél levél: a Videó megtekintése gombon rajzolt lejátszás ikon (emoji helyett)"
},
{
"id": "c4c3ac34c8",
"at": "2026-11-12T09:07:39+01:00",
"msg": "Videóablak: az időkód / jelölés gombok a videó alatt középen"
},
{
"id": "aed39d3f58",
"at": "2026-11-12T08:54:45+01:00",
"msg": "Videóablak: a szövegmezőben az Enter nem indítja el a videót"
},
{
"id": "2f61f81196",
"at": "2026-11-12T08:45:11+01:00",
"msg": "Számlázás: a lekérdezés gomb nem szélesedik ki (nem csúszik szét a fejléc)"
},
{
"id": "95ad6d55fa",
"at": "2026-11-11T23:54:50+01:00",
"msg": "Helyszíni munka beszámoló a lépéskártyán (külön sáv helyett)"
},
{
"id": "92e22887df",
"at": "2026-11-11T23:53:27+01:00",
"msg": "Lépéskártya: csak a jóváhagyott videókat számolja"
},
{
"id": "0050b9cd14",
"at": "2026-11-11T23:53:14+01:00",
"msg": "Szakember nézet: a projekt fejlécében a Naptárban gomb a cím mellett, nem külön sorban"
},
{
"id": "65bbae8fd1",
"at": "2026-11-11T23:51:53+01:00",
"msg": "Lépéskártya: feltűnőbb Részletek gomb (videótábla)"
},
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
"id": "71afade149",
"at": "2026-11-11T22:12:34Z",
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
