// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "56c6dd0fc3",
"at": "2026-11-12T16:32:11+01:00",
"msg": "Árajánlat előnézet: a PDF-oldal a szélességhez igazítva"
},
{
"id": "f9f7f9c2f1",
"at": "2026-11-12T16:31:08+01:00",
"msg": "Jóváhagyásra várból visszahúzás: az ügyfél kérése beírható; idővonal: egy pipa"
},
{
"id": "4efec512bb",
"at": "2026-11-12T16:28:43+01:00",
"msg": "Árajánlat készítő a lehetőségből (előnézet, PDF, értékesítő aláírásával); görgethető ablak látható gombsorral; vízjel-levél hibaok visszajelzés"
},
{
"id": "955cb0c1ee",
"at": "2026-11-12T16:22:54+01:00",
"msg": "Vízjel-levél: javítás (a zár utáni küldés nem futott le); kézi küldés RPC"
},
{
"id": "ede1f0c489",
"at": "2026-11-12T16:03:45+01:00",
"msg": "Ügyfél-jóváhagyás értesítő: a vágó munkáját hagyták jóvá"
},
{
"id": "d148488798",
"at": "2026-11-12T15:42:55+01:00",
"msg": "Kifizetés után lekerülő vízjel: értesítő e-mail az ügyfélnek (egyszer); napi tartalék kifizetés-ellenőrzés"
},
{
"id": "e3da8879fa",
"at": "2026-11-12T15:32:45+01:00",
"msg": "Jóváhagyó oldal (vízjeles): a letiltott natív teljes képernyő gomb helyett saját gomb jobb fent"
},
{
"id": "f682a0b488",
"at": "2026-11-12T15:18:48+01:00",
"msg": "Jóváhagyó oldal: a vízjel teljes képernyőn is csak a képet fedi, sűrűn kitöltve"
},
{
"id": "61cd8503f9",
"at": "2026-11-12T15:15:57+01:00",
"msg": "Lezajlott rendezvénynél is módosítható a leadási határidő"
},
{
"id": "97afca9d38",
"at": "2026-11-12T15:15:12+01:00",
"msg": "Lezárt projektnél is módosítható a leadási határidő"
},
{
"id": "6030d873fd",
"at": "2026-11-12T15:13:57+01:00",
"msg": "Videó verziók: a folytatódó beszélgetés a jelenlegi verziónál marad"
},
{
"id": "def6c6a3ed",
"at": "2026-11-12T15:13:10+01:00",
"msg": "Videó verziók: új link = új verzió, a korábbi verzió hozzászólásai külön, összecsukva"
},
{
"id": "e8ff4ff437",
"at": "2026-11-12T15:10:40+01:00",
"msg": "Videó hozzászólások: válaszolni minden állapotban lehet (vezetők és a vágó)"
},
{
"id": "d921488541",
"at": "2026-11-12T15:08:11+01:00",
"msg": "Beállítások: eszközlista leírás"
},
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
