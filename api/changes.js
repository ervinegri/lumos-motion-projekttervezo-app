// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
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
"id": "58ceaf9a44",
"at": "2026-11-16T22:26:21+02:00",
"msg": "Stábkártya törlése előtt megerősítés"
},
{
"id": "3ba879f4c0",
"at": "2026-11-16T22:22:05+02:00",
"msg": "Lépések: tiltott lépésre húzáskor 🚫 jelzés, elengedéskor a magyarázat a képernyő közepén"
},
{
"id": "1810504657",
"at": "2026-11-16T22:19:38+02:00",
"msg": "Meghívó: a határidőig meg nem válaszolt meghívás elutasításnak számít (piros keret, ⌛ Nem válaszolt)"
},
{
"id": "7984d87a59",
"at": "2026-11-16T22:18:55+02:00",
"msg": "Stábkártya: elutasított meghívásnál enyhén piros keret"
},
{
"id": "ea651265a2",
"at": "2026-11-16T22:18:35+02:00",
"msg": "Stábkártya: még meg nem hívott munkatársnál szürke keret"
},
{
"id": "caf1ecc1bf",
"at": "2026-11-16T22:16:40+02:00",
"msg": "Stábkártya: függő meghívásnál enyhén sárga keret"
},
{
"id": "19c95f31e3",
"at": "2026-11-16T22:14:32+02:00",
"msg": "Stábkártya: elfogadott meghívásnál enyhén zöld keret"
},
{
"id": "cd62e6ba9f",
"at": "2026-11-16T21:56:03+02:00",
"msg": "Kifizetések: a szakember / értékesítő megnyithatja a saját, párosított számláját (csak a sajátját)"
},
{
"id": "819aff626f",
"at": "2026-11-16T21:53:33+02:00",
"msg": "Előfoglalás a szakembereknek: előzetes meghívó (megbeszélés alatt), ⏳ jelölés a listában és a meghívásoknál, a díj függőben; véglegesítéskor / elmaradáskor értesítés"
},
{
"id": "bbdf2d94f8",
"at": "2026-11-16T21:48:34+02:00",
"msg": "Projekt Részletek (előzmények): csak az ügyvezetőnek"
},
{
"id": "c38f88a2bb",
"at": "2026-11-16T21:46:52+02:00",
"msg": "Előfoglalás sáv: a magyarázó szöveg csak az ügyvezetőnek"
},
{
"id": "cc3ea48a68",
"at": "2026-11-16T21:46:30+02:00",
"msg": "Előfoglalás sáv: termelési vezetőnél az értékesítési állapot nélkül"
},
{
"id": "c5134d6807",
"at": "2026-11-16T21:44:55+02:00",
"msg": "Kanban: a nyersanyagra váró (szürke) kártyák nem jelölhetők ki, a Mind kijelölése gomb sem jelenik meg hozzájuk"
},
{
"id": "b528d94770",
"at": "2026-11-16T21:44:28+02:00",
"msg": "Szakember kifizetései: a még el nem fogadott meghívás díja ⏳-val látszik, az összegbe nem számít; a meghívás-válasz gombok rendezett, egysoros sávban"
},
{
"id": "8d4bfda108",
"at": "2026-11-16T21:41:49+02:00",
"msg": "Előfoglalás: projekt összekötése nyitott lehetőséggel (tárgyalás alatt) – csendes figyelmeztetések, számlázás a szerződés után, csíkozott megjelenés, szerződéskor ez válik élessé, elveszett lehetőségnél lemondás felajánlása; felszerelési figyelmeztetések 30 nappal előtte"
},
{
"id": "ef1c235fd0",
"at": "2026-11-16T21:31:29+02:00",
"msg": "Stábkártya: kompakt, egységes meghívó-állapotcímkék"
},
{
"id": "d9dc1d78b3",
"at": "2026-11-16T21:29:59+02:00",
"msg": "Névjegy: a Megosztás gomb csak ott jelenik meg, ahol a böngésző fájlt tud megosztani; hiba esetén letöltés"
},
{
"id": "69632aeb86",
"at": "2026-11-16T19:29:25Z",
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
