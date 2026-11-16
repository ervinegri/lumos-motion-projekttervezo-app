// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "ec81473701",
"at": "2026-11-16T15:06:29+02:00",
"msg": "Pozíció-kártyák: a címkék (pl. ★ Projektvezető) újra a kártya felső szegélyén"
},
{
"id": "524e5b0b22",
"at": "2026-11-16T15:03:38+02:00",
"msg": "Jóváhagyásra vár sáv: a váró videók neve is látszik (és ráhúzva a teljes lista)"
},
{
"id": "d8c1583957",
"at": "2026-11-16T15:02:14+02:00",
"msg": "Idővonal: a vágónkénti csoportok le- és felnyithatók (megjegyzi)"
},
{
"id": "2c9afba80c",
"at": "2026-11-16T14:49:20+02:00",
"msg": "Idővonal: a „Jóváhagyásra vár” sáv visszakerült – minden projekt, amelynek akár csak egy videója vár jóváhagyásra"
},
{
"id": "12c9ba9d27",
"at": "2026-11-16T14:48:05+02:00",
"msg": "Idővonal: a projekthez nem kötött, már lezajlott vágói bejegyzés is zöld"
},
{
"id": "3050726b41",
"at": "2026-11-16T14:46:31+02:00",
"msg": "Naptár: a vágólista a projektszám szerint csökkenő sorrendben"
},
{
"id": "18815a0571",
"at": "2026-11-16T14:22:12+02:00",
"msg": "Idővonal: vágónkénti csoportok, a zöld/sárga részek saját súgóval, vágólista projektszámmal, egynapos lezárt sávok zöldek, keskeny sávokban a név az óra alatt"
},
{
"id": "526376d3fa",
"at": "2026-11-16T14:08:14+02:00",
"msg": "Javítás: a naptár nem nyílt meg (nem definiált változó a Google-bejegyzéseknél)"
},
{
"id": "2f36fbfd7b",
"at": "2026-11-16T14:07:01+02:00",
"msg": "Idővonal: a lezárt projekt videói is megnyílnak a naptárból; összevont sorban a csak-vágás sávok neve látszik; lezajlott naptárbejegyzések zöldek"
},
{
"id": "edc76a1d1e",
"at": "2026-11-16T14:05:13+02:00",
"msg": "Idővonal: videó nélküli projekt vágási sávjára kattintva a projekt nyílik meg (nem üres videótábla)"
},
{
"id": "d5a103d5c5",
"at": "2026-11-16T14:02:51+02:00",
"msg": "Idővonal: a jóváhagyásra váró videók is színesek (sárga), arányosan a jóváhagyottak (zöld) után"
},
{
"id": "f3fc86b679",
"at": "2026-11-16T14:02:32+02:00",
"msg": "Idővonal: a Kész projektek forgatási napja is zöld (erősebb szabály a régi szürke ellen)"
},
{
"id": "a352670d81",
"at": "2026-11-16T14:01:50+02:00",
"msg": "Idővonal: a még le nem forgatott nap szürke, a leforgatott zöld"
},
{
"id": "8468fd80ba",
"at": "2026-11-16T14:01:03+02:00",
"msg": "Idővonal: a projekt neve teljesen kiíródik (átér a vágási sávra)"
},
{
"id": "f4c9cdfbd8",
"at": "2026-11-16T13:59:05+02:00",
"msg": "Idővonal: a lezajlott forgatások sávja zöld (szürke helyett)"
},
{
"id": "becfc39494",
"at": "2026-11-16T13:57:51+02:00",
"msg": "Idővonal: a közös nap nélküli projektek egy sorba kerülnek (kompaktabb naptár)"
},
{
"id": "fab60b1803",
"at": "2026-11-16T13:57:09+02:00",
"msg": "Idővonal: a lezajlott helyszíni munka sávja szürke, az átmenet szürkéből megy a vágás színébe"
},
{
"id": "d2d771160e",
"at": "2026-11-16T13:53:31+02:00",
"msg": "Idővonal: a jóváhagyott arány kitöltését egy régi szabály elrejtette – most látszik"
},
{
"id": "4ee214ac74",
"at": "2026-11-16T13:51:16+02:00",
"msg": "Idővonal: a kész projekthez tartozó vágói bejegyzések zöldek"
},
{
"id": "a7b4499d8b",
"at": "2026-11-16T13:50:29+02:00",
"msg": "Idővonal: a kész projektek vágási sávja és a hozzájuk tartozó vágói bejegyzések zöldek"
},
{
"id": "8e07cc9475",
"at": "2026-11-16T13:49:05+02:00",
"msg": "Idővonal: lágyabb átmenet a forgatási és a kész vágási sáv között"
},
{
"id": "14ca484878",
"at": "2026-11-16T13:48:35+02:00",
"msg": "Idővonal: a jóváhagyott arány csak a vágási (lila) részen, a forgatási sávon nem"
},
{
"id": "a8fc073713",
"at": "2026-11-16T13:46:02+02:00",
"msg": "Idővonal: a részleges jóváhagyás kitöltése ugyanaz a zöld, mint a kész sávoké"
},
{
"id": "7869694896",
"at": "2026-11-16T13:42:32+02:00",
"msg": "Naptár idővonal: részleges jóváhagyásnál a sáv arányosan zöld"
},
{
"id": "c2c8e0331a",
"at": "2026-11-16T13:38:39+02:00",
"msg": "Projektlista: egységes videó-összesítő (darabszám + jóváhagyott arány + állapotsáv) minden projektnél; javítva egy elnyelt definíció; teszt"
},
{
"id": "0e24430668",
"at": "2026-11-16T13:34:36+02:00",
"msg": "Projektlista: lemondott projektnél nem jelenik meg a videók állapota"
},
{
"id": "891f317e5a",
"at": "2026-11-16T13:32:23+02:00",
"msg": "Meghívás: aki termelési vezetőként / ügyvezetőként saját magát osztja be, annak nem kell meghívó (elfogadottnak számít)"
},
{
"id": "d18c1ee6ba",
"at": "2026-11-16T13:31:17+02:00",
"msg": "Projektlista: kompakt videó-összesítő (állapotsáv), piros figyelmeztetésű projektek sora piros; pozíció-kártyák: címkék nem takarnak, kompakt eszközlista"
},
{
"id": "18ff8b4a9e",
"at": "2026-11-16T13:28:27+02:00",
"msg": "Az értékesítő nem kap e-mailt az átadásról (beállítás is törölve); egyszeri csendes lezárás a teljesen jóváhagyott projekteknél"
},
{
"id": "1e8b230086",
"at": "2026-11-16T13:23:24+02:00",
"msg": "Lezárt projekt: a pénzügyek is zárolva (Felnyitással módosíthatók)"
},
{
"id": "d2a66565fb",
"at": "2026-11-16T11:21:23Z",
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
