// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "9432a62282",
"at": "2026-11-13T17:08:05+01:00",
"msg": "Árajánlat PDF: a kelt és érvényes dátum egymás alatt"
},
{
"id": "db7d10b0ad",
"at": "2026-11-13T17:03:14+01:00",
"msg": "Árajánlat PDF: 20%-kal kisebb logó"
},
{
"id": "a04f317d41",
"at": "2026-11-13T17:02:18+01:00",
"msg": "Árajánlat küldése: a lehetőség-lista kereshető (gépelhető)"
},
{
"id": "accc45500a",
"at": "2026-11-13T17:02:01+01:00",
"msg": "Árajánlat PDF: összeg-tördelés, adószám a cím előtt, weboldal ki, szignó a bal alsó sarokban, nagyobb érvényességi sor; az ablakok váratlan hibája kiíródik"
},
{
"id": "6e1321e2e3",
"at": "2026-11-13T16:47:27+01:00",
"msg": "Lehetőség: Következő lépés és Mikor? külön felirattal"
},
{
"id": "5ed6330057",
"at": "2026-11-13T16:43:09+01:00",
"msg": "Nyersanyag-levél: a/az névelő"
},
{
"id": "c97d27923b",
"at": "2026-11-13T16:33:21+01:00",
"msg": "Árajánlat: Újabb másolat a mező címsorában"
},
{
"id": "96a5009842",
"at": "2026-11-13T16:32:31+01:00",
"msg": "Árajánlat: a PDF-en mindig a címzett e-mail-címe szerepel (külön mező kivéve)"
},
{
"id": "8c1642d548",
"at": "2026-11-13T16:31:12+01:00",
"msg": "Árajánlat: a kedvezményes ár kicsit nagyobb"
},
{
"id": "db864ef925",
"at": "2026-11-13T16:30:40+01:00",
"msg": "Árajánlat: a másolat-címzettek egyenként törölhetők"
},
{
"id": "2f5b1ccbd7",
"at": "2026-11-13T16:29:58+01:00",
"msg": "Árajánlat: lapozó nyilak az opciók között; fotó nélkül „Kreatív videózás”"
},
{
"id": "cf24de9769",
"at": "2026-11-13T16:28:23+01:00",
"msg": "Árajánlat: gombsor visszaállítva (felesleges záró elem)"
},
{
"id": "9075961710",
"at": "2026-11-13T16:27:46+01:00",
"msg": "Árajánlat: Tárgy és Érvényesség egy sorban"
},
{
"id": "6d7ac93e5a",
"at": "2026-11-13T16:27:01+01:00",
"msg": "Árajánlat: (27% ÁFA) egy sorban, a kedvezmény-százalék rendes számjegyekkel"
},
{
"id": "d2347edbd1",
"at": "2026-11-13T16:26:00+01:00",
"msg": "Árajánlat: a tételek a PDF táblázatával azonos kinézetűek; előnézet: Mégse · Vissza · Küldés"
},
{
"id": "f40871a303",
"at": "2026-11-13T16:22:51+01:00",
"msg": "Árajánlat: bruttó oszlop a szerkesztőben, Vissza gomb az előnézetben, teljes ár kiemelve"
},
{
"id": "8978033764",
"at": "2026-11-13T16:20:02+01:00",
"msg": "Árajánlat PDF: bruttó oszlop tételenként; teljes ár, kedvezmény, kedvezményes ár"
},
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
"id": "6f5a1869a0",
"at": "2026-11-13T14:28:07Z",
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
