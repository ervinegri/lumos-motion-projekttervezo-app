// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "78b093cd85",
"at": "2026-11-11T18:19:11+01:00",
"msg": "Videó ablak: Utómunka alatt beilleszthető a link"
},
{
"id": "be148310c4",
"at": "2026-11-11T18:18:40+01:00",
"msg": "Videó ablak: a lapozó nyilak mindig ugyanott (jobb felső sarok)"
},
{
"id": "d5d267b933",
"at": "2026-11-11T18:17:33+01:00",
"msg": "Videó ablak: link nélkül a mező a vágónak szóló kérésekre hív"
},
{
"id": "e1585e57b7",
"at": "2026-11-11T18:15:18+01:00",
"msg": "Videó ablak: Link beillesztése csak belső ellenőrzésre küldéskor; csoportos húzásnál látszik a darabszám"
},
{
"id": "195b52c2cf",
"at": "2026-11-11T18:10:49+01:00",
"msg": "Jóváhagyva: link nélkül rákérdez a linkre; hiányzó link pótolható; az ügyvezető visszavonhatja a jóváhagyást"
},
{
"id": "a6af8e2782",
"at": "2026-11-11T18:05:48+01:00",
"msg": "Jóváhagyó oldal: a panel közvetlenül az álló videó mellett"
},
{
"id": "b70b68fa34",
"at": "2026-11-11T18:04:39+01:00",
"msg": "Jóváhagyó oldal: Elküldöm a módosítást gombfelirat"
},
{
"id": "be1c7b8be2",
"at": "2026-11-11T18:03:26+01:00",
"msg": "Jóváhagyó oldal: álló videó az oldal közepén"
},
{
"id": "cf47f8fce0",
"at": "2026-11-11T18:01:56+01:00",
"msg": "Jóváhagyó oldal: teljes képernyős elrendezés (nem lebegő kártya)"
},
{
"id": "d51c0ad9c2",
"at": "2026-11-11T17:57:51+01:00",
"msg": "Jóváhagyó oldal: a panel a videó aljához igazodik, a két gomb egymás mellett"
},
{
"id": "aae8a1c6b5",
"at": "2026-11-11T17:56:03+01:00",
"msg": "Jóváhagyó oldal: cím és projektsor egy sorban álló videónál is"
},
{
"id": "5c5aa2d33d",
"at": "2026-11-11T17:53:58+01:00",
"msg": "Jóváhagyó oldal: zöld idősáv"
},
{
"id": "c46a7a28fc",
"at": "2026-11-11T17:52:04+01:00",
"msg": "Ügyfél jóváhagyó link: rövid URL (/v/<kód>)"
},
{
"id": "8b8bdd7d6c",
"at": "2026-11-11T17:47:02+01:00",
"msg": "Jóváhagyó oldal: álló videónál szélesebb panel; módosítás közben ismét rejtve a Jóváhagyom"
},
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
"id": "13e1706cbd",
"at": "2026-11-11T14:36:25Z",
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
