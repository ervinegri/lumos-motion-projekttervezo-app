// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "9baed79508",
"at": "2026-11-11T17:46:13+01:00",
"msg": "Jóváhagyó oldal: magyarázó mondat törölve"
},
{
"id": "10b4c5d19a",
"at": "2026-11-11T17:05:07+01:00",
"msg": "Videótábla: a jóváhagyott videók nem húzhatók ki a Jóváhagyva oszlopból"
},
{
"id": "67c9a3f7f6",
"at": "2026-11-11T16:11:31+01:00",
"msg": "Az egész appban: frissítés után a nyitott ablak visszanyílik"
},
{
"id": "5e12ddf95c",
"at": "2026-11-11T16:07:42+01:00",
"msg": "Szerződéslista: típus-felirat helyett több látszik a fájlnévből"
},
{
"id": "dc881a8f1f",
"at": "2026-11-11T16:07:24+01:00",
"msg": "Szerződések ablak: bezáráskor vissza az ügyfél adatlapjára"
},
{
"id": "0894043a55",
"at": "2026-11-11T16:06:11+01:00",
"msg": "Ügyfél adatlap: Kezelés / feltöltés helyett Ügyfél mappája link"
},
{
"id": "9bb022c93a",
"at": "2026-11-11T16:01:54+01:00",
"msg": "Ügyfél-levél gomb: LEVÉL ÉRKEZETT felirat törölve"
},
{
"id": "e7f57b34ff",
"at": "2026-11-11T16:00:03+01:00",
"msg": "Megnyitás-jelzés (látta-e az ügyfél) csak a vezetőknek"
},
{
"id": "8277b5a0d3",
"at": "2026-11-11T15:59:08+01:00",
"msg": "Jóváhagyó oldal: vízjeles videónál nincs Letöltés gomb"
},
{
"id": "0f762383fd",
"at": "2026-11-11T15:55:49+01:00",
"msg": "Levél-előnézet magasság: margók pontosan"
},
{
"id": "1f19b08a25",
"at": "2026-11-11T15:55:38+01:00",
"msg": "Levél-előnézetek: gépeléskor nem nő a fehér rész az alján"
},
{
"id": "d5964b4c95",
"at": "2026-11-11T15:54:40+01:00",
"msg": "Nem módosítható pipák halványítva"
},
{
"id": "8c353cb805",
"at": "2026-11-11T15:52:57+01:00",
"msg": "Leadás után a vágó nem szólhat hozzá, nem válaszolhat és nem pipálhat"
},
{
"id": "b725fb66e3",
"at": "2026-11-11T15:39:19+01:00",
"msg": "Elvégzett időkód: a ▶ csak halványul"
},
{
"id": "c1d127400f",
"at": "2026-11-11T15:38:34+01:00",
"msg": "Elvégzett időkód: a ▶ is áthúzva, halványítva"
},
{
"id": "e93f328990",
"at": "2026-11-11T15:36:57+01:00",
"msg": "Javítás elküldése: tipp sor törölve"
},
{
"id": "1d57fcd16b",
"at": "2026-11-11T15:36:14+01:00",
"msg": "Javítás elküldése: figyelmeztetés szövege"
},
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
"id": "3720184034",
"at": "2026-11-11T13:54:21Z",
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
