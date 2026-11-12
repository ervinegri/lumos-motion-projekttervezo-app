// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "683817990f",
"at": "2026-11-12T12:04:27+01:00",
"msg": "Szakember Beállítások: középre igazítva"
},
{
"id": "478bc4e124",
"at": "2026-11-12T12:02:31+01:00",
"msg": "Szakember Beállítások: díjcsökkentés kivéve, eszközlista leírás"
},
{
"id": "4d5f885331",
"at": "2026-11-12T12:00:37+01:00",
"msg": "Szakember Beállítások: előnézetként szakember nézetben is látszik"
},
{
"id": "844e0a489b",
"at": "2026-11-12T11:57:58+01:00",
"msg": "Kifizetések: a számla kiállítása szürke, amíg a díjösszesítő nincs kiküldve"
},
{
"id": "03bab8e6cc",
"at": "2026-11-12T11:56:24+01:00",
"msg": "Vágó: az idővonalon megmarad a jóváhagyott vágás, csak a havi nézetből tűnik el"
},
{
"id": "6b2b998682",
"at": "2026-11-12T11:55:53+01:00",
"msg": "Határidő szöveg: minden videó jóváhagyva / részleges jóváhagyás"
},
{
"id": "31c207648f",
"at": "2026-11-12T11:53:44+01:00",
"msg": "Szakember Beállítások (e-mail és app értesítések); a vágó naptárából eltűnik a már jóváhagyott vágás"
},
{
"id": "1a4c36f74d",
"at": "2026-11-12T11:50:56+01:00",
"msg": "Háttér-szinkronok ne tartsák vissza a betöltést"
},
{
"id": "7aa2f33ea5",
"at": "2026-11-12T11:49:44+01:00",
"msg": "Mentés után ne villanjon vissza a régi adat: a mentés közben indult betöltést eldobjuk"
},
{
"id": "6255e796f3",
"at": "2026-11-12T11:45:28+01:00",
"msg": "Tagi kölcsön: honnan / hova számla (bank2)"
},
{
"id": "28b3b5fe77",
"at": "2026-11-12T11:41:25+01:00",
"msg": "Videó hozzászólások: látszik az ügyfél jóváhagyása; tagi kölcsön bank felirat egyértelműbb"
},
{
"id": "3a648f4f23",
"at": "2026-11-12T11:39:11+01:00",
"msg": "Ügyfél módosításkérés: a vágó is megkapja az új stílusú levelet (ügyfél említése nélkül)"
},
{
"id": "78858164f2",
"at": "2026-11-12T11:36:43+01:00",
"msg": "Új projektnél nincs automatikus másnapi vágási határidő"
},
{
"id": "a322d19b1e",
"at": "2026-11-12T11:13:15+01:00",
"msg": "Résztvevői interjúk → Interjú (felirat)"
},
{
"id": "d8f01ad175",
"at": "2026-11-12T11:06:50+01:00",
"msg": "Rendezvény típusa: Interjú"
},
{
"id": "0e8f7f549d",
"at": "2026-11-12T10:14:24+01:00",
"msg": "Jóváhagyó oldal: figyelmeztetés kilépéskor félbehagyott átnézésnél / el nem küldött szövegnél"
},
{
"id": "4347b1bcbf",
"at": "2026-11-12T10:07:45+01:00",
"msg": "Ügyfél visszaigazoló összefoglaló e-mail, ha minden videóról döntött"
},
{
"id": "6cf2f38ede",
"at": "2026-11-12T10:04:20+01:00",
"msg": "Naptár szűrő: Terepi → Helyszíni"
},
{
"id": "3c43236e4c",
"at": "2026-11-12T09:53:00+01:00",
"msg": "Terepi szűrő a havi nézetben is"
},
{
"id": "e6e2c29eec",
"at": "2026-11-12T09:52:31+01:00",
"msg": "Terepi szűrő: csak a saját helyszíni munkák"
},
{
"id": "07240269f6",
"at": "2026-11-12T09:49:21+01:00",
"msg": "Ügyfél-döntés e-mail: jóváhagyta a munkádat"
},
{
"id": "813854c1ac",
"at": "2026-11-12T09:48:44+01:00",
"msg": "Szakember naptár: Minden / Terepi / Vágói munkák szűrő; ügyfél-döntés e-mailből a gomb törölve"
},
{
"id": "f86619cd42",
"at": "2026-11-12T09:46:36+01:00",
"msg": "Idővonal: jóváhagyott sáv gradienssel; részleges jóváhagyás ✅ x/y"
},
{
"id": "71239a4e1b",
"at": "2026-11-12T09:44:15+01:00",
"msg": "Ügyfél-döntés értesítés: a vágói jóváhagyó e-mail stílusában"
},
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
"id": "9194b351aa",
"at": "2026-11-12T08:28:47Z",
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
