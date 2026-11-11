// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "63c240957c",
"at": "2026-11-11T15:35:35+01:00",
"msg": "Belső ellenőrzésre küldés: Mégse után vissza a videóhoz"
},
{
"id": "d1d2d434ee",
"at": "2026-11-11T15:34:44+01:00",
"msg": "Elkészítettem a javítást: figyelmeztet, ha maradt kipipálatlan észrevétel"
},
{
"id": "d3b6e0cfa6",
"at": "2026-11-11T15:34:25+01:00",
"msg": "Videó ablak: a vágónak „Elkészítettem a javítást” gomb → javított link → belső ellenőrzés"
},
{
"id": "190baf196d",
"at": "2026-11-11T15:31:15+01:00",
"msg": "Videó ablak: visszadobott videónál „Javítás alatt”; Link cseréje eltávolítva"
},
{
"id": "d56316152a",
"at": "2026-11-11T15:29:59+01:00",
"msg": "Időkód pipák: ki és mikor pipálta (a pipa fölé víve látszik)"
},
{
"id": "ef02c9e3d4",
"at": "2026-11-11T15:28:32+01:00",
"msg": "Jelölt időkód: kék háttér marad, csak a narancs pötty jelzi"
},
{
"id": "6c0d299772",
"at": "2026-11-11T15:27:21+01:00",
"msg": "Időkódok egységes szélességben; a jelölt időkód narancs árnyalattal, emoji nélkül"
},
{
"id": "2804ca93ac",
"at": "2026-11-11T15:06:05+01:00",
"msg": "Szerződés törlése: azonnal eltűnik, a Drive-törlés a háttérben fut; gyorsabb ellenőrzés"
},
{
"id": "d23fe4f719",
"at": "2026-11-11T15:05:01+01:00",
"msg": "Ügyfél adatlap: szerződést csak a feltöltő mezőre lehet húzni"
},
{
"id": "b0dff3b279",
"at": "2026-11-11T15:02:10+01:00",
"msg": "Szerződések ablak: TIG kiállítása gomb eltávolítva"
},
{
"id": "8ad8f3bd7a",
"at": "2026-11-11T15:01:50+01:00",
"msg": "Ügyfél adatlap: látható szerződés-feltöltő mező (behúzás vagy tallózás)"
},
{
"id": "ff4ec99025",
"at": "2026-11-11T14:58:50+01:00",
"msg": "Ügyfél adatlap: szerződés behúzása kérdés nélkül, új szerződésként"
},
{
"id": "ef7b26efce",
"at": "2026-11-11T14:56:25+01:00",
"msg": "Ügyfél adatlap: szerződés behúzással feltölthető; szerződéstörlés/feltöltés gyors (csak az adott ügyfél mappáját olvassa újra)"
},
{
"id": "bb778f8122",
"at": "2026-11-11T14:54:11+01:00",
"msg": "Ügyfél adatlap: szerződés törölhető (🗑️) a Szerződések listában"
},
{
"id": "892bf278fe",
"at": "2026-11-11T14:51:10+01:00",
"msg": "Ügyfélszerződés: felülírás vagy új szerződés választható; időkód pipát csak a javító vágó jelölhet"
},
{
"id": "42d6531703",
"at": "2026-11-11T11:59:37+01:00",
"msg": "Videó: a ▶ magyarázata frissítve"
},
{
"id": "3bbd4cb7c3",
"at": "2026-11-11T11:59:20+01:00",
"msg": "Videó: a ▶ legfeljebb 2 mp-et játszik le, vagy a következő időkódig"
},
{
"id": "ac412a2951",
"at": "2026-11-11T11:55:47+01:00",
"msg": "Videó ablak: megnyitáskor nem indul el a videó; ▶ összeolvad az időkóddal"
},
{
"id": "5caab6d942",
"at": "2026-11-11T11:54:13+01:00",
"msg": "Videó hozzászólás: stabil hover az időkódon és a ▶ gombon"
},
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
"id": "03972b0c00",
"at": "2026-11-11T10:12:07Z",
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
