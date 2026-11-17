// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "15feb04218",
"at": "2026-11-17T11:09:10+02:00",
"msg": "Adatbázis-állapot (/api/dbstatus): aktív adatbázis, óránkénti Neon-lekérdezések forrás szerint, időzítők"
},
{
"id": "f6e9ba232e",
"at": "2026-11-17T11:03:06+02:00",
"msg": "Termelési v. nézet előtöltése: a nézetváltás első alkalommal is azonnali"
},
{
"id": "ff70113e98",
"at": "2026-11-17T11:02:23+02:00",
"msg": "Idővonal: fehér címke a vágási sávra átlógó projektnév mögött"
},
{
"id": "ff7a25c271",
"at": "2026-11-17T10:59:01+02:00",
"msg": "Idővonal: annyi homokóra, ahány videó vár jóváhagyásra"
},
{
"id": "79c0df5953",
"at": "2026-11-17T10:57:51+02:00",
"msg": "Idővonal: a homokóra pontosan a sárga rész közepén"
},
{
"id": "fe38e36678",
"at": "2026-11-17T10:57:34+02:00",
"msg": "Nézetmenü: a nem aktuális nézetek beljebb"
},
{
"id": "1073dd1f40",
"at": "2026-11-17T10:57:14+02:00",
"msg": "Instrukciók: a kész jelölés nem vonható vissza (nincs Visszavonás gomb)"
},
{
"id": "75e9e4acbe",
"at": "2026-11-17T10:56:56+02:00",
"msg": "Idővonal: homokóra a jóváhagyásra váró (sárga) részek közepén"
},
{
"id": "6cbb82aba3",
"at": "2026-11-17T10:01:03+02:00",
"msg": "Online pénzügyi adatkapcsolat: kimenő és bejövő számlák fogadása (PDF a Drive-ra), szakember-számlák és kimenő utalások párosítása a Kifizetésekhez, szállítói számlák kiadásként, havi banki forgalom, ügyfelek fizetési fegyelme"
},
{
"id": "df12caed6d",
"at": "2026-11-17T09:54:30+02:00",
"msg": "Beállítások előtöltése csak ügyvezető / termelési v. nézetben (szakember nézetben jogosultsági hibát adott)"
},
{
"id": "c48700aa07",
"at": "2026-11-17T09:54:06+02:00",
"msg": "Nézetváltás visszajelzése a szakember / értékesítő nevével"
},
{
"id": "9e952455bc",
"at": "2026-11-17T09:46:37+02:00",
"msg": "Banki tranzakciók fogadása (számlázz.hu Online pénzügyi adatkapcsolat): /api/szbank végpont, kulcs generálás, párosítási javaslat és megerősítés a Pénzügyekben"
},
{
"id": "46d8742e60",
"at": "2026-11-17T09:39:58+02:00",
"msg": "IPN: díjbekérőnél is a számlázz.hu kifizetési dátuma"
},
{
"id": "142ef8758c",
"at": "2026-11-17T09:33:56+02:00",
"msg": "Nézetváltás: termelési v. nézetből is lehet értékesítőre váltani (a valódi szerepkör számít)"
},
{
"id": "7348ac195e",
"at": "2026-11-17T09:28:08+02:00",
"msg": "Nézetváltás gyorsítása (könnyített betöltés, megjegyzett nézetek), visszajelzések középen"
},
{
"id": "a3d8869e8c",
"at": "2026-11-17T09:26:05+02:00",
"msg": "Beállítások: korábbi előtöltés, nézetváltáskor nem ürül"
},
{
"id": "a37b99d00c",
"at": "2026-11-17T09:20:41+02:00",
"msg": "Meghívások doboz kompakt"
},
{
"id": "b2c08bcc25",
"at": "2026-11-17T09:18:38+02:00",
"msg": "Neon: átváltó gomb a Beállításokban, automatikus visszaesés a táblázatra (e-mail értesítéssel), mentés időpontja"
},
{
"id": "01ead6a7c4",
"at": "2026-11-17T09:15:05+02:00",
"msg": "Nézetváltás: egyetlen töltésjelzés"
},
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
"id": "bf79027f15",
"at": "2026-11-17T06:50:04Z",
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
