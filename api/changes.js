// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "3531a477c0",
"at": "2026-11-14T11:34:38+01:00",
"msg": "Naptár súgó: ha alatta/fölötte nem fér el, a sáv mellé kerül a képernyőn belül (nem vágódik le)"
},
{
"id": "62fbd42e29",
"at": "2026-11-14T11:32:45+01:00",
"msg": "Álló telefon naptár: vágószűrő 30%-kal szélesebb"
},
{
"id": "cf3e9f29f7",
"at": "2026-11-14T11:32:19+01:00",
"msg": "Idővonal: az oldal sem húzható le a tetején túl"
},
{
"id": "b139a46e68",
"at": "2026-11-14T11:32:08+01:00",
"msg": "Idővonal: a naptár nem húzható túl a szélein"
},
{
"id": "db5a9e3795",
"at": "2026-11-14T11:31:35+01:00",
"msg": "Álló telefon naptár: rövidebb vágószűrő, hosszabb „+ Új projekt” gomb"
},
{
"id": "c1bf37331f",
"at": "2026-11-14T11:18:57+01:00",
"msg": "Videótábla: instrukciók a címsorban, magasabb tábla fekvőben; videó ablak: fekvőben széltől szélig, álló nézetben nem csúszik szét"
},
{
"id": "eb6d43eb37",
"at": "2026-11-14T11:13:37+01:00",
"msg": "Nézetváltó: termelési v. előnézetből is választható az Ügyvezető és az Értékesítő"
},
{
"id": "87ba9a84e5",
"at": "2026-11-14T11:09:14+01:00",
"msg": "Fekvő telefon: az ablakok teljes oldalként nyílnak (nem lebegő popup)"
},
{
"id": "1adeb06ee7",
"at": "2026-11-14T10:48:03+01:00",
"msg": "Ügyfél döntéséről szóló értesítés tömörebb: tárgy „Módosítást kér: <projekt>”, a levél a videó nevével és az ügyfél szövegével kezdődik"
},
{
"id": "6c65f38993",
"at": "2026-11-14T09:59:26+01:00",
"msg": "Ügyfelek: a Szerződés oszlop nem csúszik el (osztálynév-ütközés javítva)"
},
{
"id": "c3bbdaa277",
"at": "2026-11-14T09:25:15+01:00",
"msg": "Számla megerősítése: látszik, melyik csatornán (Lumos cím / számlázz.hu) és kinek megy ki a levél"
},
{
"id": "4cef7922c5",
"at": "2026-11-14T09:22:54+01:00",
"msg": "Számla: „A számlázz.hu küldje” felirat"
},
{
"id": "a92ff42aeb",
"at": "2026-11-14T09:21:55+01:00",
"msg": "Számla-levél: nincs dupla „Üdvözlettel” (az aláírásban van)"
},
{
"id": "ea50ddd055",
"at": "2026-11-14T09:19:16+01:00",
"msg": "Számla: a levél előnézete mint az árajánlatnál (feladó, címzett, tárgy, melléklet, aláírás); saját cím és számlázz.hu együtt is választható"
},
{
"id": "79613d3fbe",
"at": "2026-11-14T09:18:05+01:00",
"msg": "Számla kiállítása: választható, ki küldje ki – saját (Lumos) cím vagy a számlázz.hu (a választás megmarad)"
},
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
"id": "9c88e5d23c",
"at": "2026-11-14T07:18:37Z",
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
