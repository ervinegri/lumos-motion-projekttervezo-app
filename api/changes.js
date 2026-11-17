// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "de7e5e6817",
"at": "2026-11-17T22:59:29+02:00",
"msg": "Szakember nézet: a vágó kártyáján látszik a saját videói állapota és a jóváhagyás"
},
{
"id": "830a70b5bd",
"at": "2026-11-17T22:58:12+02:00",
"msg": "Idővonal: a sávok alatti videóállapot-csík kivéve"
},
{
"id": "fb19a96c10",
"at": "2026-11-17T22:57:54+02:00",
"msg": "Sötét mód: az idővonal sávjai egyszínűek (nincs átmenet, nincs névcímke-háttér)"
},
{
"id": "3b64fd5a63",
"at": "2026-11-17T22:56:59+02:00",
"msg": "Idővonalra váltáskor a mai nap jön be; Egyenleg sor csak elmaradásnál; rövidebb keresőmező"
},
{
"id": "822436fb58",
"at": "2026-11-17T22:55:38+02:00",
"msg": "Sötét mód: aktív kapcsolók sötétek; a hozzászólás Küldés gombja nem nyúlik meg"
},
{
"id": "d30985be8f",
"at": "2026-11-17T22:54:16+02:00",
"msg": "Stáb: a számlázó cég, adószám és ÁFA csak az ügyvezetőnek látszik; sötét mód: aktív hónap és frissítés-sáv sötét"
},
{
"id": "686afd4275",
"at": "2026-11-17T22:52:42+02:00",
"msg": "Sötét mód: a halvány színes kijelölések (pl. aktív hónap) is sötétek; a sárga gombon sötét szöveg"
},
{
"id": "80ae094e7a",
"at": "2026-11-17T22:51:31+02:00",
"msg": "Sötét mód: a sötét hátterek (táblafejléc, kiemelt gombok) és a rajtuk lévő világos szöveg megmarad"
},
{
"id": "d707842354",
"at": "2026-11-17T22:51:04+02:00",
"msg": "Sötét mód: halványabb logó; gépen a Fizetések tábla kerete a tábla szélességéig ér"
},
{
"id": "c7d6af0fed",
"at": "2026-11-17T22:49:56+02:00",
"msg": "Sötét mód: nincs világos villanás frissítéskor (a sötét stílus az előző betöltésből azonnal érvényes, és már a DOM betöltésekor elkészül)"
},
{
"id": "c870e2335e",
"at": "2026-11-17T22:48:57+02:00",
"msg": "Sötét mód: a naptár sávjaiban nincs világos átmenet; nézetváltáskor a frissítés-értesítő az adott szerepkör szerinti (nem a teljes változásnapló)"
},
{
"id": "d7867539ce",
"at": "2026-11-17T22:47:17+02:00",
"msg": "Sötét mód: a felugró ablak háttere sötét fátyol marad, a névjelvény menüje is sötét; Stáb lista: az egész sor kattintható"
},
{
"id": "199f1894a7",
"at": "2026-11-17T22:45:42+02:00",
"msg": "Sötét mód: visszafogottabb színes hátterek (figyelmeztetések, címkék)"
},
{
"id": "4e79c5a9e1",
"at": "2026-11-17T22:44:29+02:00",
"msg": "Sötét mód: a var(…, szín) tartalékos háttereket is átalakítja (naptár világos csíkjai)"
},
{
"id": "b884f686e6",
"at": "2026-11-17T22:41:50+02:00",
"msg": "Újdonságok a többi felhasználónak (szakemberek, termelési vezető, értékesítők): válogatott, nem pénzügyi és nem értékesítési fejlesztések a belépéskor"
},
{
"id": "a59fb85e62",
"at": "2026-11-17T22:40:15+02:00",
"msg": "Sötét mód: sötét háttér és menüsáv javítása"
},
{
"id": "74fbada4fe",
"at": "2026-11-17T22:38:43+02:00",
"msg": "Sötét mód: egy szín csak egyszer alakul át"
},
{
"id": "d4e37aa6df",
"at": "2026-11-17T22:36:49+02:00",
"msg": "Sötét mód (első változat): a névjelvény menüjében ki / be / a rendszer szerint; a sötét színek a meglévő stílusokból készülnek"
},
{
"id": "2cef8f5327",
"at": "2026-11-17T22:34:44+02:00",
"msg": "Idővonal: balra görgetve a kicsúszó sávok neve a látható rész elejére kerül"
},
{
"id": "e29c0ca3f2",
"at": "2026-11-17T22:27:00+02:00",
"msg": "Ponytail-átnézés javításai: ajánlat-adatok Drive-fájlban (a beállítás-tár nem telik be), szigorúbb videónév-csere a levélmintában, teszt a fizetési állapotra, tableten nincs DOM-figyelő, felülírt CSS-szabályok törölve; projekt pénzügyek: Termelés a Levonások után mellett"
},
{
"id": "4ac6506ff8",
"at": "2026-11-17T22:16:53+02:00",
"msg": "Küldés az ügyfélnek: a mentett mintában ragadt korábbi videónév (tárgyban is) az aktuális videóra cserélődik"
},
{
"id": "d693942fc9",
"at": "2026-11-17T22:11:49+02:00",
"msg": "Projekt Pénzügyek: a Levonások után kártya új sorban"
},
{
"id": "19a359f91d",
"at": "2026-11-17T17:06:51+02:00",
"msg": "Tablet: Szerződés és számlázás, Bevétel és kiadás fejléce is egy sorban"
},
{
"id": "366d182d8e",
"at": "2026-11-17T17:05:08+02:00",
"msg": "Tablet: minden táblázat a képernyő széléig ér, a projekt neve oszlop oldalra görgetéskor a helyén marad"
},
{
"id": "846966a99f",
"at": "2026-11-17T17:04:21+02:00",
"msg": "Fizetési állapot: a díjbekérő és a belőle készült előlegszámla egy befizetésnek számít (nem lesz tévesen „Teljes fizetve”)"
},
{
"id": "cb3b1d7607",
"at": "2026-11-17T17:02:14+02:00",
"msg": "Tablet, Fizetések: újra görgethető fel-le (a rugózás-elnyelés csak függőlegesen görgető táblán)"
},
{
"id": "3f8355ae58",
"at": "2026-11-17T17:01:14+02:00",
"msg": "Projekt Pénzügyek kártyák tableten: a mezők nem lógnak ki, a kártyák tördelődnek"
},
{
"id": "e7ea05fd7a",
"at": "2026-11-17T16:59:39+02:00",
"msg": "Tablet, Fizetések: a fejléc egy sora kifér 768 px-en is"
},
{
"id": "6cbdd6755d",
"at": "2026-11-17T16:58:08+02:00",
"msg": "Tablet, Fizetések: altabok és hónapváltó egy sorban, a tábla a képernyő széléig"
},
{
"id": "26664af9dc",
"at": "2026-11-17T16:54:54+02:00",
"msg": "Projekt pénzügyek: új tételtípus – ⛽ Saját költség (pl. tankolás): a teljes összegből vonódik le, nem kerül a számlára; a Bevétel és kiadás lebontásában külön sor"
},
{
"id": "1a76398225",
"at": "2026-11-17T14:46:36Z",
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
