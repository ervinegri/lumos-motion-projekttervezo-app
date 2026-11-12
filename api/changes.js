// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "3c3148b321",
"at": "2026-11-12T15:05:59+01:00",
"msg": "Ügyfél e-mail: a lejátszás gomb CSS-sel rajzolva (nem sárga emoji)"
},
{
"id": "57bfa63eb2",
"at": "2026-11-12T15:03:52+01:00",
"msg": "Jóváhagyó oldal: vízjel szöveg"
},
{
"id": "3536a140ec",
"at": "2026-11-12T15:01:30+01:00",
"msg": "Ügyfélnek küldés: a linkmezőbe gépelés nem írja szét a levél szövegét"
},
{
"id": "f6e751bd1f",
"at": "2026-11-12T14:56:00+01:00",
"msg": "Jegyzetek: formázott szöveg (beillesztéskor megmarad a félkövér, dőlt, felsorolás, link)"
},
{
"id": "a1224c7bfc",
"at": "2026-11-12T14:44:07+01:00",
"msg": "Új szerződés: díj a projekt értékéből"
},
{
"id": "b42622d7f2",
"at": "2026-11-12T14:41:43+01:00",
"msg": "Új szerződés varázsló: 4 sablon, ügyfél/projekt adatok, minta előnézet, letöltés / mentés az ügyfél mappájába"
},
{
"id": "781421bcd8",
"at": "2026-11-12T14:34:57+01:00",
"msg": "Videós projekt: a Jóváhagyásra vár lépés nem látszik, az Utómunka marad kiemelve (húzható a Készre)"
},
{
"id": "ffd5d5d9d9",
"at": "2026-11-12T14:32:09+01:00",
"msg": "Napló: a jóváhagyó oldalon döntő ügyfél „Ügyfél” szerepként látszik"
},
{
"id": "9be7dcdd99",
"at": "2026-11-12T14:31:30+01:00",
"msg": "Napló: felhasználók a legutóbbi belépés szerint csökkenő sorrendben"
},
{
"id": "f5f3fd83c7",
"at": "2026-11-12T14:28:05+01:00",
"msg": "Videó ablak: a lejátszósáv újra húzható egérrel"
},
{
"id": "b7d11d7b04",
"at": "2026-11-12T14:25:52+01:00",
"msg": "Megnyitották: hónap névvel (Nov. 12.)"
},
{
"id": "ed63d84ead",
"at": "2026-11-12T14:21:51+01:00",
"msg": "Értékesítői jutalék: egy név egyszer, azonnali kiválasztás, a beírt % nem ugrik vissza"
},
{
"id": "65d7f9f8e2",
"at": "2026-11-12T14:00:06+01:00",
"msg": "Névjegy: magyar névsorrend"
},
{
"id": "a81599a549",
"at": "2026-11-12T13:59:23+01:00",
"msg": "Kapcsolattartó névjegy a telefonra: QR-kód, .vcf letöltés / megosztás"
},
{
"id": "3e2b85188c",
"at": "2026-11-12T13:55:27+01:00",
"msg": "Videó ablak: a projekt neve megnyitja a projektet"
},
{
"id": "045f6bfb8e",
"at": "2026-11-12T13:00:02+01:00",
"msg": "Videótábla: minden videó leadva → a határidő-sáv végigér és zöld"
},
{
"id": "1e2cc4401e",
"at": "2026-11-12T12:37:51+01:00",
"msg": "Szakaszkártya: kompakt videó gomb (🎬 x/y ✅ ›), eredeti kártyamagasság"
},
{
"id": "99848b9506",
"at": "2026-11-12T12:37:03+01:00",
"msg": "Szakaszkártya: a videók gomb keskeny kártyán sem lóg ki"
},
{
"id": "ee5474ab84",
"at": "2026-11-12T12:36:18+01:00",
"msg": "Szakaszkártya: a videók gomb a cím alá törik, nem lóg ki"
},
{
"id": "16ec0d978b",
"at": "2026-11-12T12:22:06+01:00",
"msg": "E-mail panel: csoportok teljes szélességben, két oszlopos sorok"
},
{
"id": "353ee1c167",
"at": "2026-11-12T12:21:30+01:00",
"msg": "Beállítások: e-mail értesítések panel újratervezve (csoportok, kapcsolók)"
},
{
"id": "0b4ec6e324",
"at": "2026-11-12T12:08:05+01:00",
"msg": "Értékesítő Beállítások: kifizetés / átadás e-mail, kifizetés a csengőben"
},
{
"id": "ff738c91d4",
"at": "2026-11-12T12:04:59+01:00",
"msg": "Beállítások: Új hozzászólás a videódhoz"
},
{
"id": "80cbb12782",
"at": "2026-11-12T12:04:44+01:00",
"msg": "Beállítások: Módosítást kértek a videódra"
},
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
"id": "a3ece22ac2",
"at": "2026-11-12T10:53:53Z",
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
