// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "1cce8d294b",
"at": "2026-11-16T12:00:05+02:00",
"msg": "Lemondáskor e-mail a termelési vezetőnek; a háttér már nem kér csapat-véglegesítést a helyszíni munkához"
},
{
"id": "4482100e84",
"at": "2026-11-16T11:55:04+02:00",
"msg": "Stáb és eszközök: a pozíciószámláló címkék törölve (a kártyák mutatják)"
},
{
"id": "8054a01534",
"at": "2026-11-16T11:53:40+02:00",
"msg": "Pozíció-kártyák: egy meghívó személyenként, nincs duplikált szerepmező, csillag csak projektvezető nélkül, egységes kuka (pozícióról levétel), „Távolról vezeti”"
},
{
"id": "3a65af9fb5",
"at": "2026-11-16T11:51:25+02:00",
"msg": "A közös „Csapat véglegesítése” funkció kikapcsolva (pozíciónként, külön véglegesítünk)"
},
{
"id": "65b9712e6c",
"at": "2026-11-16T11:43:13+02:00",
"msg": "Vercel: a szintaxis-ellenőrzés beágyazva fut (a tests/ mappa nincs a buildben, emiatt maradtak ki a telepítések)"
},
{
"id": "c7b3049a62",
"at": "2026-11-16T11:28:26+02:00",
"msg": "Kifizetések: a számla sorszáma tördelve, teljes egészében olvasható"
},
{
"id": "47ef0c614f",
"at": "2026-11-16T11:24:09+02:00",
"msg": "Projektek: a keresőmező a táblázat „Projekt” fejlécébe került"
},
{
"id": "eef61b35f9",
"at": "2026-11-16T11:23:35+02:00",
"msg": "Figyelmeztetések: „A stáb nincs véglegesítve” / „módosult” is megjelenik"
},
{
"id": "380db208ca",
"at": "2026-11-16T11:21:53+02:00",
"msg": "Projektlista: „N napja jóváhagyásra vár” egy sárga címkében, a külön állapotcímke nélkül"
},
{
"id": "d8351a3968",
"at": "2026-11-16T11:21:00+02:00",
"msg": "Projektlista: a videók teljes neve látszik"
},
{
"id": "56f100373a",
"at": "2026-11-16T11:20:15+02:00",
"msg": "Projektlista: forgatás előtt nincs „Utómunkára vár” a videóknál"
},
{
"id": "8cdd835ac8",
"at": "2026-11-16T11:19:34+02:00",
"msg": "Kifizetések: a számla teljes sorszáma látszik a kártyán"
},
{
"id": "db54326949",
"at": "2026-11-16T11:17:18+02:00",
"msg": "Felületi szintaxis-teszt; szintaxishibás felület nem települ a Vercelre"
},
{
"id": "bf0343d530",
"at": "2026-11-16T11:16:45+02:00",
"msg": "Javítás: fölösleges zárójel a projektlistában (az app nem töltött be)"
},
{
"id": "601f6e0947",
"at": "2026-11-16T11:14:51+02:00",
"msg": "Projektlista: állapotcímkék egy sorban; tételes videólista mellett nincs közös „Leadott videó” gomb"
},
{
"id": "15bec6a176",
"at": "2026-11-16T09:13:35Z",
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
