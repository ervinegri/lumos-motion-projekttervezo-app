// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "118052ee10",
"at": "2026-11-12T17:40:03+01:00",
"msg": "Árajánlat előnézet: a levél szövege és tárgya közvetlenül szerkeszthető"
},
{
"id": "bd267bc2ae",
"at": "2026-11-12T17:28:39+01:00",
"msg": "Árajánlat: több opció egy PDF-ben (pl. 1 / 3 / 5 short), opciónként tételek és összesítő, kalkulátorból az aktív opcióba"
},
{
"id": "76a22b8122",
"at": "2026-11-12T17:16:06+01:00",
"msg": "Küldés a kollégák saját címéről: Google Workspace domainszintű megbízás (szolgáltatásfiók, Gmail API), automatikus visszaesés a központi fiókra; ügyvezetői beállító panel teszttel"
},
{
"id": "32df3c5f90",
"at": "2026-11-12T17:13:12+01:00",
"msg": "Árajánlat logó: gyorsítótár frissítése"
},
{
"id": "1946ea0321",
"at": "2026-11-12T17:13:05+01:00",
"msg": "Árajánlat: a hivatalos kétsoros logó"
},
{
"id": "486fe7e65c",
"at": "2026-11-12T17:11:15+01:00",
"msg": "Péter aláírása: fotó, beosztás, telefon"
},
{
"id": "89be61045e",
"at": "2026-11-12T17:08:16+01:00",
"msg": "Árajánlat: kedvezmény pipálható (alapból ki), a kalkulátoros tételek neve részletek nélkül"
},
{
"id": "d61bf50e69",
"at": "2026-11-12T17:06:21+01:00",
"msg": "Árajánlat: új lapon nem üres a PDF, kedvezmény max. 20%, általánosnál a fájlnévben sincs rendezvény, a kalkulátoros tételek számok nélkül (darab a mennyiségbe), valódi feladó az előnézetben"
},
{
"id": "f820d5ca33",
"at": "2026-11-12T17:03:29+01:00",
"msg": "Árajánlat PDF: kéttagú (LUMOS / MOTION) logó"
},
{
"id": "5ff349fb85",
"at": "2026-11-12T17:00:12+01:00",
"msg": "Árkalkulátor ablak: Bezárás balra, a többi jobbra"
},
{
"id": "eff2c2dd9d",
"at": "2026-11-12T16:59:58+01:00",
"msg": "Árkalkulátor árai: nyersanyag alapdíj + százalék"
},
{
"id": "a560274579",
"at": "2026-11-12T16:57:00+01:00",
"msg": "Árajánlat: az általános/rendezvényes váltás a tárgyat és a levelet is átírja"
},
{
"id": "44b2eb1989",
"at": "2026-11-12T16:54:38+01:00",
"msg": "Árajánlat: rendezvényre szóló vagy általános, mennyiségi kedvezmény, egyoldalas PDF, megnyitás új lapon, 15 nap érvényesség; árkalkulátor: Short videó fül, km-alapú kiszállás árai"
},
{
"id": "56edd41eca",
"at": "2026-11-12T16:43:42+01:00",
"msg": "Értékesítés: árajánlat az árkalkulátorral indul (tételek átvétele), feltűnőbb gomb; értékesítő szűrésnél csak az ő jutaléka"
},
{
"id": "ccc71e789b",
"at": "2026-11-12T16:39:49+01:00",
"msg": "Hosszú ablak: a cím és a gombsor rögzített, csak a tartalom görget"
},
{
"id": "d964b84e4d",
"at": "2026-11-12T16:38:51+01:00",
"msg": "Videó ablak: javítás alatt a vezető is írhat a vágónak (mit kell javítani)"
},
{
"id": "a53d2471ba",
"at": "2026-11-12T16:36:03+01:00",
"msg": "Kifizetés-szinkron: ugyanaz a bizonylat ne kerüljön be kétszer, a meglévő másodpéldány törlődik"
},
{
"id": "820667b2a4",
"at": "2026-11-12T16:34:36+01:00",
"msg": "Beállítások: értékesítők e-mail aláírása is szerkeszthető"
},
{
"id": "7ca49a6129",
"at": "2026-11-12T16:33:50+01:00",
"msg": "Árajánlat PDF: tábla szélesség"
},
{
"id": "85e76d347c",
"at": "2026-11-12T16:32:53+01:00",
"msg": "Árajánlat PDF: a tételtábla nem lóg ki"
},
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
