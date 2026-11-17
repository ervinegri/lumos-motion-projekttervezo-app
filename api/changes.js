// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "e817d8a458",
"at": "2026-11-17T09:11:32+02:00",
"msg": "Utómunka-tábla: az első oszlopok között csak a kirendelt vágó, a jóváhagyási oszlopokba csak vezető mozgat; nézetmenü jelöli az aktuális (szakember) nézetet; Neon kapcsolat-teszt a beállításokban"
},
{
"id": "f8705a91c5",
"at": "2026-11-17T09:07:10+02:00",
"msg": "Pénzügyek: rendezett kártyák (Levonások, Levonások után); naptár: fel-le görgetéssel lapozás, eszköztár egy sorban; ügyvezető nem lesz vendég a naptáreseményekben"
},
{
"id": "5c16f53b98",
"at": "2026-11-17T09:02:26+02:00",
"msg": "Instrukciók: tömörebb szerkesztő (2 sor, fókuszban nő), kisebb gomb, redundáns „Még nincs instrukció” sor nélkül"
},
{
"id": "9f7b76d65a",
"at": "2026-11-17T09:01:27+02:00",
"msg": "Figyelmeztető üzenet: egér elvitelére sem tűnik el"
},
{
"id": "c60ff13d0d",
"at": "2026-11-17T09:01:07+02:00",
"msg": "Figyelmeztető üzenet: csak kattintásra tűnik el"
},
{
"id": "ebabab78ed",
"at": "2026-11-17T09:00:47+02:00",
"msg": "Minden figyelmeztető üzenet: ⚠️, középen, elsötétített háttér előtt fehér dobozban"
},
{
"id": "3b48024e65",
"at": "2026-11-17T08:57:17+02:00",
"msg": "Nézetváltó menü: az inaktív nézetek beljebb és szürkébben"
},
{
"id": "bc7b85fa4f",
"at": "2026-11-17T08:56:57+02:00",
"msg": "Középre kitett üzenetnél elsötétül a háttér (kattintásra bezárul); a Kifizetések számla-felugrója nem vágódik le"
},
{
"id": "db433ccaa5",
"at": "2026-11-17T08:54:27+02:00",
"msg": "Helyszíni munka tiltó üzenet: ⚠️ jellel"
},
{
"id": "4de6430190",
"at": "2026-11-17T08:53:21+02:00",
"msg": "Lépések: csak a következő lépésre lehet húzni, a későbbiek szürkék, animáció nélkül"
},
{
"id": "691390b246",
"at": "2026-11-17T08:51:51+02:00",
"msg": "Megerősítő ablakok: törlés / levétel / lemondás gombja piros"
},
{
"id": "c8da3835a4",
"at": "2026-11-17T08:49:54+02:00",
"msg": "Stábkártya: a projektvezető címke rövidítve (★ P.V.)"
},
{
"id": "ac18001d36",
"at": "2026-11-17T08:45:11+02:00",
"msg": "Stábkártya ⚙️ menü: pozíció cseréje, beosztás átadása, eszközlista neki, névjegy, díj megadása, díjcsökkentés; a jelölőnégyzetek helyett „✓ be” jelzés"
},
{
"id": "2d4fd242b1",
"at": "2026-11-17T08:39:21+02:00",
"msg": "Fejléc: a nézetváltó és a névjelvény egy gombban (a nézetek a névjelvény menüjében)"
},
{
"id": "44fa2da9c5",
"at": "2026-11-17T08:38:35+02:00",
"msg": "Stábkártya: ⚙️ menü a kuka helyett (távolról vezeti, helyszíni vágó, meghívó újraküldése, projektvezető, levétel); elfogadott meghívás után a távoli / helyszíni jelleg nem módosítható"
},
{
"id": "7839a8e6d7",
"at": "2026-11-17T08:34:14+02:00",
"msg": "Utómunka lépéskártya: a videószámláló (🎬 x/y ✅) levéve – a kártyára kattintva nyílik a videótábla"
},
{
"id": "7bb55812b3",
"at": "2026-11-17T08:33:08+02:00",
"msg": "Alapadatok mobilon: dátum teljes szélességben, kezdés+végzés egy sorban, a többi mező egymás alatt"
},
{
"id": "5104557330",
"at": "2026-11-17T08:32:54+02:00",
"msg": "Díjtáblák: a szakember- és díjoszlop a tartalomhoz igazodik; előfoglalás összekötése a lehetőség ablakából (a projektben a felhívó sor törölve)"
},
{
"id": "2632ee1db8",
"at": "2026-11-17T08:29:14+02:00",
"msg": "Több napos rendezvény: a napok egyenként hozzáadhatók (＋ Nap hozzáadása), mindegyik saját kezdéssel és végzéssel"
},
{
"id": "23802b527a",
"at": "2026-11-17T08:26:50+02:00",
"msg": "Alapadatok: a típus/helyszín sor a dátum/kezdés/végzés oszlophatáraihoz igazítva"
},
{
"id": "c9069ade19",
"at": "2026-11-17T08:26:23+02:00",
"msg": "Értékesítői jutalék: értékesítő nélkül az Extrák menüből adható hozzá, a lehetőségből jött projektnél magától megjelenik; Több napos jelölő a Dátum felirat mellett"
},
{
"id": "0934b81723",
"at": "2026-11-17T08:24:10+02:00",
"msg": "Alapadatok: két összefogott oszlop – rendezvény (név, típus, helyszín, időpont) | ügyfél és kapcsolattartó"
},
{
"id": "218d714dff",
"at": "2026-11-17T08:21:23+02:00",
"msg": "Alapadatok: tömör 12 oszlopos elrendezés; a Több napos jelölő a dátum sorában, az utolsó nap mezői csak bepipálva jelennek meg"
},
{
"id": "ecb32c24ff",
"at": "2026-11-17T08:16:47+02:00",
"msg": "Új pozíció meghívó: egyértelmű szöveg (a korábbi megmarad); ha az újat nem vállalja, a korábbi elfogadott marad, a kártyán jelezve"
},
{
"id": "879d44fe9b",
"at": "2026-11-16T23:14:57+02:00",
"msg": "Elfogadott meghívás + új pozíció: az új pozíciót külön el kell fogadni (meghívó az eddigi és az új pozícióval); sok pozíciónál rövid címkék"
},
{
"id": "198662d402",
"at": "2026-11-16T23:07:24+02:00",
"msg": "Saját beosztás a névvel kötött fióknál is (és meghívott állapotból is); eszközt igénylő szerepnél eszközhiány jelzése (kártyán és figyelmeztetésben)"
},
{
"id": "07485b8803",
"at": "2026-11-16T23:04:57+02:00",
"msg": "Helyszínek előadásainak utómunkája: több helyszínnél helyszínenként külön feladat (külön vágóhoz rendelhető)"
},
{
"id": "c580f73d13",
"at": "2026-11-16T23:00:11+02:00",
"msg": "Stáb: a betöltetlen pozíciók a kártyák végére kerülnek"
},
{
"id": "2dfe8a12b9",
"at": "2026-11-16T22:52:23+02:00",
"msg": "Stáb és eszközök: Stáb-instrukciók (közös jegyzet a helyszíni stábnak – mint az utómunka-instrukciók, e-maillel, hozzászólással, kész-jelöléssel)"
},
{
"id": "cd60f8faac",
"at": "2026-11-16T22:33:33+02:00",
"msg": "Saját beosztás csak a gombbal (mentéskor nem lesz magától elfogadott)"
},
{
"id": "4906bf0ebe",
"at": "2026-11-16T20:26:32Z",
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
