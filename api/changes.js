// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "9a3c5eaf97",
"at": "2026-11-14T09:14:49+01:00",
"msg": "Számla kiállítása: szerkeszthető levél-előnézet (tárgy + szöveg) a Lumos címéről küldött levélhez"
},
{
"id": "74370861e8",
"at": "2026-11-14T09:13:28+01:00",
"msg": "Termelési vezető: a termelői keret, a díjak összege és a maradék a Díjak panel tetején"
},
{
"id": "a70163bc55",
"at": "2026-11-14T09:12:38+01:00",
"msg": "Névjegy: kis gomb a kapcsolattartó alatt; a QR-névjegyben nincs projektnév"
},
{
"id": "8f51f47244",
"at": "2026-11-14T09:10:08+01:00",
"msg": "Számlák: a vevőnek a Lumos címéről megy ki a levél PDF melléklettel (a számlázz.hu nem küldi)"
},
{
"id": "f999443997",
"at": "2026-11-14T08:57:28+01:00",
"msg": "Naptár-súgó: ha lent nem fér el, a sáv fölé kerül (vagy görgethető), nem lóg ki a képernyőből"
},
{
"id": "a247acfdba",
"at": "2026-11-14T08:55:38+01:00",
"msg": "Súgók: rámutatás után kb. fél másodperccel jelennek meg (nem villannak fel azonnal)"
},
{
"id": "f31e969e68",
"at": "2026-11-14T08:53:05+01:00",
"msg": "Idővonal: „Jóváhagyásra vár” címkéken „X napja leadva”"
},
{
"id": "565f722b9d",
"at": "2026-11-14T08:35:39+01:00",
"msg": "Levélből érkező videólink: a videó azonnal megnyílik, a friss adat beérkezésekor frissül"
},
{
"id": "c389381eb7",
"at": "2026-11-14T08:32:56+01:00",
"msg": "Levélből érkező videólink: csak a videó nyílik meg, a projektoldal nem"
},
{
"id": "59f7cdc946",
"at": "2026-11-14T08:30:47+01:00",
"msg": "Idővonal: „✅ Jóváhagyva” helyett zöld pipa a sáv jobb szélén"
},
{
"id": "327045539b",
"at": "2026-11-14T08:28:32+01:00",
"msg": "Idővonal: a projekt sávjára kattintva is a videótábla (kanban) nyílik, ha vannak videók"
},
{
"id": "fd7abb03da",
"at": "2026-11-14T08:26:22+01:00",
"msg": "Idővonal: a vágási sávon csak egy jel a végén (zöld ✓ / ⏳), zöld pipák; Havi nézet: a vágói munkák csak a határidő napján"
},
{
"id": "12faca8c40",
"at": "2026-11-14T08:24:30+01:00",
"msg": "Idővonal: egérrel fel-le is húzható (nem csak oldalra)"
},
{
"id": "4faeabde86",
"at": "2026-11-14T08:22:48+01:00",
"msg": "Idővonal: „Jóváhagyásra vár” egy sorban, „Idővonal” sor törölve; fejléc: külön Kilépés gomb elrejtve (a név menüjében van)"
},
{
"id": "e6d1ae11fa",
"at": "2026-11-14T08:20:28+01:00",
"msg": "Idővonal: forgatási nap + vágás sávnál is a látható rész elején marad a név"
},
{
"id": "5e1e709d29",
"at": "2026-11-14T08:18:29+01:00",
"msg": "Idővonal: balra görgetéskor a sáv felirata a látható rész elején marad"
},
{
"id": "e9db2c834d",
"at": "2026-11-14T08:17:00+01:00",
"msg": "Idővonal: a fejléc egy sorban (a hónap neve 1-jén); a vágási sáv felirata az óra sorában, nem csúszik a névre"
},
{
"id": "b5a9345139",
"at": "2026-11-14T08:14:16+01:00",
"msg": "Idővonal: a vágási sáv pipája jobbra kerül, nem takarja a nevet"
},
{
"id": "c04c5b94d0",
"at": "2026-11-14T08:12:16+01:00",
"msg": "Idővonal: a forgatási nap sávjában a név valóban látszik"
},
{
"id": "bc68da55a8",
"at": "2026-11-14T08:10:13+01:00",
"msg": "Idővonal: rövid határidős projekteknél a név a forgatási napban, az óra alatt kezdődik és átér a vágási sávra"
},
{
"id": "bcf39e760a",
"at": "2026-11-14T08:06:55+01:00",
"msg": "Idővonal: a szekciócímek nem vágódnak le; a „ma” jelző szélesebb, áttetsző, lágy sáv"
},
{
"id": "3d83214a4d",
"at": "2026-11-14T08:01:20+01:00",
"msg": "Idővonal minden nézetben: nincs bal oldali névoszlop, vastagabb sávok a projekt nevével"
},
{
"id": "d28a2086d4",
"at": "2026-11-14T08:00:02+01:00",
"msg": "Rövid / rámutatásra nyíló legördülők: nincs villogó kurzor, a mezőről a listára húzva nem csukódik be"
},
{
"id": "888786ee2b",
"at": "2026-11-14T07:56:38+01:00",
"msg": "Frissítéskor nem villan fel a módosítás előtti állapot: a sikeres módosítások a helyi indító-gyorsítótárba is bekerülnek"
},
{
"id": "a179baa639",
"at": "2026-11-14T07:46:57+01:00",
"msg": "Projekt: a Vissza gomb oda visz, ahonnan megnyitottad (pl. Naptár/idővonal), a görgetési helyzettel együtt"
},
{
"id": "ab899c3300",
"at": "2026-11-14T07:45:57+01:00",
"msg": "Legördülők: megnyitáskor nincs kijelölve (kék) a szöveg – az első leütés így is lecseréli; egyszeri javítás eltávolítva"
},
{
"id": "d874e28ad6",
"at": "2026-11-13T23:04:05+01:00",
"msg": "Egyszeri javítás: Synlab – Short videó 3 → Jóváhagyásra vár (e-mail nélkül, már kiment)"
},
{
"id": "b09674a5ba",
"at": "2026-11-13T23:01:38+01:00",
"msg": "Videó áthelyezése közben a lehúzásos frissítés vár, az oldal bezárása figyelmeztet"
},
{
"id": "a7e4483f37",
"at": "2026-11-13T22:55:35+01:00",
"msg": "Videótábla: az áthelyezett videó nem ugrik vissza a régi oszlopba egy közben beérkező régebbi adatfrissítés miatt; érintéses húzás-utánzat eltávolítva (az iPhone natívan támogatja)"
},
{
"id": "646b83c3fe",
"at": "2026-11-13T22:52:43+01:00",
"msg": "Érintőképernyő: a vágási tábla kártyái hosszan nyomva áthúzhatók másik oszlopba"
},
{
"id": "f4b869fb09",
"at": "2026-11-13T21:48:19Z",
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
