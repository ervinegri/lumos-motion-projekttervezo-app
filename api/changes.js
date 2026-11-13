// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "e896f53b0c",
"at": "2026-11-13T16:16:32+01:00",
"msg": "Árajánlat PDF: nettó és bruttó két oszlopban, a forint nem törik"
},
{
"id": "bbedce8c2e",
"at": "2026-11-13T16:15:12+01:00",
"msg": "Árajánlat: Opció másolása és Új kategória gomb"
},
{
"id": "68cf5777f4",
"at": "2026-11-13T16:12:22+01:00",
"msg": "Árkalkulátor: nagyobb csúszkagomb, az Összesen akkora, mint a gombok"
},
{
"id": "a120b69c85",
"at": "2026-11-13T16:07:50+01:00",
"msg": "Árkalkulátor: megjegyzi az állapotot és a fület, komolyabb megjelenés"
},
{
"id": "27cee7d0a3",
"at": "2026-11-13T16:05:04+01:00",
"msg": "Árajánlat: több opciónál kötelező az opció neve"
},
{
"id": "13d9ec5eaa",
"at": "2026-11-13T16:00:50+01:00",
"msg": "Előadás rögzítés: drón kivéve; szekciókeretek eltávolítva"
},
{
"id": "f12d5d5115",
"at": "2026-11-13T15:51:20+01:00",
"msg": "Árajánlat: kalkulátoronként külön opció, több másolat-címzett, PDF-név: rendezvény/cég + Lumos Motion"
},
{
"id": "fbdc10ecd5",
"at": "2026-11-13T15:48:03+01:00",
"msg": "Árajánlat: több kalkulátorból gyűjthető tételek, vissza a kalkulátorhoz; a/az névelő; nettó kiemelve, egyszerűbb összesítő; levélszöveg csak az előnézetben; frissítésjelző javítva"
},
{
"id": "0f6c1ba6fc",
"at": "2026-11-13T15:43:49+01:00",
"msg": "Árajánlat küldése: új érdeklődő felvétele gomb a lista alatt"
},
{
"id": "d719f71db6",
"at": "2026-11-13T15:41:49+01:00",
"msg": "Operatőri munkadíj alapdíja a rendezvény és előadás kalkulátorban is; fények kivéve"
},
{
"id": "8691ca426d",
"at": "2026-11-13T15:36:34+01:00",
"msg": "Árajánlat: frissítés után a nyitott ajánlat (szerkesztő vagy előnézet) a beírt adatokkal visszajön"
},
{
"id": "45dd9598c3",
"at": "2026-11-13T15:31:36+01:00",
"msg": "Értékesítés: a Hozzáadás gomb az oszlopok tetején"
},
{
"id": "946385520d",
"at": "2026-11-13T15:29:48+01:00",
"msg": "Árajánlat küldése: csak választható (nem írható) lista, Új érdeklődő felvétele opció – mentés után rögtön az árajánlat"
},
{
"id": "2c6ed37169",
"at": "2026-11-13T15:27:57+01:00",
"msg": "Árajánlat küldése: a lista sorai nem törnek, hosszú névnél három pont"
},
{
"id": "58832c2b7f",
"at": "2026-11-13T15:27:34+01:00",
"msg": "Árajánlat küldése: alapból nincs kiválasztott lehetőség"
},
{
"id": "84c5a4ccfe",
"at": "2026-11-13T15:26:13+01:00",
"msg": "Árajánlat küldése: kereshető legördülő a nyitott lehetőségekből"
},
{
"id": "13faad2027",
"at": "2026-11-13T15:24:26+01:00",
"msg": "Árbeállítás: short videó hosszak 40–60 és 20–40 mp"
},
{
"id": "8fe3c7e783",
"at": "2026-11-13T15:21:17+01:00",
"msg": "Értékesítés: a következő lépés dátuma kötelező (háttér és áthúzás is ellenőrzi)"
},
{
"id": "3a410d495a",
"at": "2026-11-13T15:17:46+01:00",
"msg": "Értékesítés: Árkalkulátor helyett Árajánlat küldése – előbb a lehetőség kiválasztása kártyákból"
},
{
"id": "ba332acf9d",
"at": "2026-11-13T14:56:27+01:00",
"msg": "Levélből érkező videólink: a friss betöltés után is megnyílik a videó"
},
{
"id": "bd9e75dbe0",
"at": "2026-11-13T14:54:17+01:00",
"msg": "Belső ellenőrzés e-mail: rövid tárgy és szöveg, egy gomb (telefonon is áttekinthető)"
},
{
"id": "9c9f005b92",
"at": "2026-11-13T14:27:02+01:00",
"msg": "Utómunka-dátumkorlát: a Sales App forgatás-megtörtént jelzése kivétel (teszt javítva)"
},
{
"id": "47bd10324a",
"at": "2026-11-13T14:23:56+01:00",
"msg": "Vágói értesítés: átment a belső ellenőrzésen / kézi jóváhagyás"
},
{
"id": "b6a36bad05",
"at": "2026-11-13T14:19:44+01:00",
"msg": "Vágóválasztó: rámutatásra lenyílik a vágók listája"
},
{
"id": "8184a0d71a",
"at": "2026-11-13T13:46:12+01:00",
"msg": "Utómunka-kártya: a számláló fekete háttér nélkül"
},
{
"id": "d80b79adb0",
"at": "2026-11-13T13:44:17+01:00",
"msg": "Utómunka-kártya: nincs emelkedés rámutatáskor"
},
{
"id": "244fc29e73",
"at": "2026-11-13T13:35:51+01:00",
"msg": "Utómunka-kártya: kéz kurzor, nagyobb videószámláló"
},
{
"id": "19722e0838",
"at": "2026-11-13T13:34:20+01:00",
"msg": "Projekt: az Utómunka lépés kártyája kattintható – a videótábla nyílik"
},
{
"id": "f378aa28ef",
"at": "2026-11-13T13:32:21+01:00",
"msg": "Verzióváltó: a visszadobás indoka a régi verziónál"
},
{
"id": "36d6cbd076",
"at": "2026-11-13T13:31:28+01:00",
"msg": "Verzióváltó: a régebbi (link-előzmény nélküli) videóknál is, a hozzászólásokkal"
},
{
"id": "e9ac7fb984",
"at": "2026-11-13T12:30:37Z",
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
