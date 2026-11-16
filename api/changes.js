// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "17a8a7d368",
"at": "2026-11-16T13:21:13+02:00",
"msg": "Az utolsó videó / fotó jóváhagyásakor a projekt automatikusan Kész (az értékesítő értesül)"
},
{
"id": "d0f1bb1863",
"at": "2026-11-16T13:07:56+02:00",
"msg": "Lezárás: a videók saját linkjei mellett nem kell külön átadási link"
},
{
"id": "e604308af5",
"at": "2026-11-16T13:07:39+02:00",
"msg": "Lemondott projekt: a teljes tartalom szürke és zárolt; lezajlott rendezvényre nincs Meghívás gomb"
},
{
"id": "b535c85b24",
"at": "2026-11-16T13:05:10+02:00",
"msg": "Fotók: galéria-kártya videólejátszó helyett, „Jóváhagyta a fotókat”, fotós szövegek; a vezető a galéria linkjét bármikor megadhatja / cserélheti; nem lejátszható linknél megnyitás új lapon"
},
{
"id": "6cca495512",
"at": "2026-11-16T13:02:56+02:00",
"msg": "Stáb: személyenként egy kártya, a pozíciók címkeként (× a levételhez); vágó + helyszíni pozíciónál dupla széles kártya"
},
{
"id": "589e98eaf2",
"at": "2026-11-16T12:53:09+02:00",
"msg": "Videók: mentéskor a projektről levett vágó kikerül a videóiból; ügyfél-jóváhagyás és jegyzetek értesítése csak az aktuális vágónak"
},
{
"id": "ed2e7374d5",
"at": "2026-11-16T12:49:11+02:00",
"msg": "Videók: a projektről levett vágó (régi bejegyzés) nem jelenik meg és nem kap értesítést – a feladat az aktuális vágóé"
},
{
"id": "154a14f760",
"at": "2026-11-16T12:20:30+02:00",
"msg": "Helyszíni munkára csak elfogadott meghívásokkal; elfogadás ideje a tooltipben (határidő helyett); nem fizetős kártyáról a „Nettó szerződött érték” felirat törölve"
},
{
"id": "07447fed27",
"at": "2026-11-16T12:17:38+02:00",
"msg": "Javítás: szinkron-feltétel megjegyzése; teszt a jövőbeli forgatás esetére"
},
{
"id": "577768c06e",
"at": "2026-11-16T12:16:33+02:00",
"msg": "Sales App szinkron: jövőbeli forgatású projekt nem léphet utómunkára a „leforgatva” jelzéstől"
},
{
"id": "a87696d4f8",
"at": "2026-11-16T12:14:27+02:00",
"msg": "Lemondás-levél: a rögzítő neve nem zárójelben, hanem külön, szürke sorban"
},
{
"id": "fa520de32d",
"at": "2026-11-16T12:13:36+02:00",
"msg": "Naptár: a projektről levett vágó régi kiosztásai nem számítanak (pl. Fodor Kata a Business Bash-nél)"
},
{
"id": "b947671d18",
"at": "2026-11-16T12:10:35+02:00",
"msg": "Lemondás-értesítés: az ügyvezető is kap e-mailt (a rögzítő kivételével)"
},
{
"id": "72775bec02",
"at": "2026-11-16T12:09:07+02:00",
"msg": "Lemondás-levél: semleges megfogalmazás"
},
{
"id": "b3a4e07a01",
"at": "2026-11-16T12:08:47+02:00",
"msg": "Lemondás: semleges „Mi a lemondás oka?” (lehet az ügyfél is); a levélben „rögzítette”"
},
{
"id": "080557b51f",
"at": "2026-11-16T12:05:16+02:00",
"msg": "Lemondás ablak: a címzetteket a háttér adja, így a termelési vezető is látja"
},
{
"id": "d381e2615d",
"at": "2026-11-16T12:03:43+02:00",
"msg": "Lemondás ablak: termelési vezetőnél nincs „pénzügyek” említés"
},
{
"id": "868f9e500f",
"at": "2026-11-16T12:03:09+02:00",
"msg": "Lemondás ablak: látszik, ki kap értesítést"
},
{
"id": "dd4ac46f82",
"at": "2026-11-16T10:00:16Z",
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
