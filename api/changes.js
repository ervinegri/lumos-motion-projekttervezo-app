// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "30c333d6a1",
"at": "2026-11-16T17:58:57+02:00",
"msg": "Helyszíni értékesítő pozíció (az eladó értékesítő nem stábtag); egységes sárga sorkiemelés a Források, Ügyfelek, Kifizetések táblázatain"
},
{
"id": "402aab8830",
"at": "2026-11-16T17:55:42+02:00",
"msg": "Stáb kártyák: az értékesítő nem jelenik meg pozícióként (az Értékesítés részben szerepel)"
},
{
"id": "65b53f4dae",
"at": "2026-11-16T17:53:30+02:00",
"msg": "Kifizetések: meghívott (sárga ⏳), meg nem hívott (szürke ○) és elfogadott (zöld ✓) díjak megkülönböztetése, dőlt betű nélkül"
},
{
"id": "31e6c3b031",
"at": "2026-11-16T17:51:05+02:00",
"msg": "Vágási tábla: az előadásrögzítés utómunkái (előadások, összefoglaló, kivágások) is kártyát kapnak; egyszeri pótlás a nyitott projekteknél"
},
{
"id": "f27fe1bdfe",
"at": "2026-11-16T17:48:24+02:00",
"msg": "Meghívó: a nyersanyag napja teljes hónapnévvel („december 2., szerda”)"
},
{
"id": "fc304299d4",
"at": "2026-11-16T17:46:18+02:00",
"msg": "Meghívás: vasárnapra eső válaszadási határidő hétfő 18:00-ra tolódik"
},
{
"id": "36136621d0",
"at": "2026-11-16T17:40:18+02:00",
"msg": "Meghívás: saját magát (ügyvezető / termelési vezető) e-mail nélkül, elfogadottként rögzíti; határidő: a meghívás napja + 2 nap, 18:00"
},
{
"id": "44e4b58db4",
"at": "2026-11-16T17:35:26+02:00",
"msg": "Meghívás: a válaszadási határidő mindig 18:00 (2 nap után); „A nyersanyag ezen a napon kerül feltöltésre: …” (óra nélkül)"
},
{
"id": "88be5b28ae",
"at": "2026-11-16T17:32:29+02:00",
"msg": "Meghívás: válaszadási határidő 2 nap, a következő 12:00-ra vagy 18:00-ra kerekítve"
},
{
"id": "f30db84300",
"at": "2026-11-16T17:30:25+02:00",
"msg": "Meghívás: a válaszadási határidő 3 nap helyett 24 óra"
},
{
"id": "125112a9d3",
"at": "2026-11-16T17:28:37+02:00",
"msg": "Kifizetések (ügyvezető): az el nem fogadott / ki nem küldött meghívás díja halványan, ⏳ jellel látszik, és nem számít bele az összegekbe"
},
{
"id": "2a87c24146",
"at": "2026-11-16T17:21:14+02:00",
"msg": "Szakember nézet: jövőbeli projekt (és díja) csak meghívás után látszik, a Kifizetésekbe csak az elfogadott meghívás díja számít"
},
{
"id": "62fd80a6ab",
"at": "2026-11-16T16:42:09+02:00",
"msg": "Egyszeri rögzítés: szervezői jutalék a Longevity-rendezvény shortjainál (10 000 Ft/short), a Rippel short beszámítva a Longevity számlájába"
},
{
"id": "e77c3e3948",
"at": "2026-11-16T16:40:59+02:00",
"msg": "Lezárt projektek: lakat a nevük mellett (projektlista, projekt oldal, naptár)"
},
{
"id": "bbbdd3989e",
"at": "2026-11-16T16:33:55+02:00",
"msg": "Bevételek: az Értékesítés összegére húzva látszik, ki értékesítette"
},
{
"id": "73b372b88d",
"at": "2026-11-16T16:31:47+02:00",
"msg": "Fizetés: új „Beszámítva” állapot (másik projekt számlájából levonva) – számla nélküli projektnél a Fizetés címkére kattintva állítható; a fizetési állapot mentéskor nem íródik felül"
},
{
"id": "d231b6f707",
"at": "2026-11-16T16:28:21+02:00",
"msg": "Pénzügyek: ha a (közös) foglaló a projekt teljes összegét fedezi, „Teljes fizetve”"
},
{
"id": "6884b17bf5",
"at": "2026-11-16T16:24:50+02:00",
"msg": "Bevétel és kiadás: a Kintlévőségre húzva a kintlévő tételek listája"
},
{
"id": "0d4ad78e50",
"at": "2026-11-16T16:23:38+02:00",
"msg": "Pénzügyek: az app előtti (régi táblázatos) hónapokban nem jelenik meg a számlázási eltérés"
},
{
"id": "a6ef2a225d",
"at": "2026-11-16T16:18:28+02:00",
"msg": "Pénzügyek táblák: a ráhúzott sor teljes szélességben enyhén kiemelve"
},
{
"id": "b6977a0b51",
"at": "2026-11-16T16:16:23+02:00",
"msg": "Pénzügyek táblák: a ráhúzott sor kiemelve"
},
{
"id": "7e9adb8edc",
"at": "2026-11-16T16:15:53+02:00",
"msg": "Cmd+S: „✓ Minden mentve” a félrevezető „Nincs mentetlen módosítás” helyett"
},
{
"id": "4234bcf589",
"at": "2026-11-16T16:14:24+02:00",
"msg": "Pénzügyek panel: csak a nyíl nyit/zár"
},
{
"id": "e20360c730",
"at": "2026-11-16T16:14:01+02:00",
"msg": "Ki értékesítette? kártya: előbb a jutalék (%), utána az összeg"
},
{
"id": "bd3e561d05",
"at": "2026-11-16T16:05:44+02:00",
"msg": "Értékesítés: nem fizetős projekt lehetősége nem jelenik meg (pl. Business Bash)"
},
{
"id": "d6d7aa8ddc",
"at": "2026-11-16T16:03:30+02:00",
"msg": "HubSpot: a már javított 415-ös társítási hiba régi bejegyzése törlődik, nem jelenik meg"
},
{
"id": "fe2fb2118c",
"at": "2026-11-16T15:17:19+02:00",
"msg": "Ha a forgatás még előttünk van, a projekt visszaállítható Tervezésre (pl. tévesen utómunkába került)"
},
{
"id": "328e5b512d",
"at": "2026-11-16T15:14:29+02:00",
"msg": "Stáb: a „Pozíciónként…” magyarázó szöveg törölve"
},
{
"id": "6f5397fc21",
"at": "2026-11-16T15:12:34+02:00",
"msg": "Jóváhagyásra vár sáv: kiválasztott vágónál csak az ő videói"
},
{
"id": "9cd811b5c3",
"at": "2026-11-16T15:11:54+02:00",
"msg": "Fotózás kiválasztásakor automatikusan a fotók utómunkája is (200 kép)"
},
{
"id": "37c0185dbf",
"at": "2026-11-16T13:10:37Z",
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
