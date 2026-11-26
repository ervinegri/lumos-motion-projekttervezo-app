// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "dec1ec1e67",
"at": "2026-11-26T18:13:54+02:00",
"msg": "Projekt oldal: frissítés után a szakaszok nem nyílnak ki – a nyitott / csukott állapot megmarad"
},
{
"id": "8cc0709858",
"at": "2026-11-26T18:12:46+02:00",
"msg": "Projekt fejléc (gép): dátumkártya 54 px"
},
{
"id": "ac9cfb416c",
"at": "2026-11-26T18:11:43+02:00",
"msg": "Projekt fejléc (gép): szélesebb dátumkártya"
},
{
"id": "1389d41c19",
"at": "2026-11-26T18:10:33+02:00",
"msg": "Projekt fejléc: a ragadós címsáv nem takarja ki a gombokat (az új elrendezésben is jól érzékeli, mikor csúszik ki a cím)"
},
{
"id": "1f0186256b",
"at": "2026-11-26T18:09:28+02:00",
"msg": "Projekt fejléc (gép): gombok a név sorában, a leírás alul a teljes szélességben"
},
{
"id": "5ed744b90b",
"at": "2026-11-26T18:06:16+02:00",
"msg": "Szolgáltatások: 10 px a magyarázó sor alatt"
},
{
"id": "0313e6e896",
"at": "2026-11-26T18:06:03+02:00",
"msg": "Szolgáltatások: a magyarázó sor nem csúszik rá az alatta lévő dobozra"
},
{
"id": "7c69778d58",
"at": "2026-11-26T18:03:56+02:00",
"msg": "Szolgáltatások: kisebb hézag a fejléc és a magyarázó sor között"
},
{
"id": "2fb2851b01",
"at": "2026-11-26T18:02:25+02:00",
"msg": "Projekt fejléc (gép): név és gombok egy sorban; lemondás / törlés ikonként"
},
{
"id": "ca3ae7d680",
"at": "2026-11-26T18:01:14+02:00",
"msg": "Projekt oldal: egyforma (8 px) távolság a szakaszok között"
},
{
"id": "178af77cb3",
"at": "2026-11-26T17:58:59+02:00",
"msg": "Projektlista (gép): vékonyabb fejléc"
},
{
"id": "171f75f99c",
"at": "2026-11-26T17:57:47+02:00",
"msg": "Projektlista (gép): kb. 20%-kal vékonyabb sorok"
},
{
"id": "55bb269f53",
"at": "2026-11-26T17:55:57+02:00",
"msg": "Projektlista: a mai projekt piros kerete körben egyforma vastag"
},
{
"id": "f4f06cb451",
"at": "2026-11-26T17:54:46+02:00",
"msg": "Projektlista: a hónap-elválasztó sorok kikerültek"
},
{
"id": "6ca144b358",
"at": "2026-11-26T17:40:00+02:00",
"msg": "Fekvő telefon, projektlista: az állapot-oszlop minden sorban egy vonalban"
},
{
"id": "b2cb96fc01",
"at": "2026-11-26T17:37:38+02:00",
"msg": "Telefon, projekt Pénzügyek: Szerződés és Termelés egy sorban, alatta tömör értékesítő-kártya (nem lóg ki)"
},
{
"id": "dc43ade555",
"at": "2026-11-26T17:36:54+02:00",
"msg": "Telefon: fele olyan széles Értékesítés-oszlopok, tömörebb kártyák"
},
{
"id": "5b9aad7d4b",
"at": "2026-11-26T17:35:58+02:00",
"msg": "Lezárt Alapadatok: a mezők csak olvashatónak látszanak (nincs keret, lenyíló nyíl, Nap hozzáadása)"
},
{
"id": "4a0b4a9327",
"at": "2026-11-26T17:35:34+02:00",
"msg": "Telefon: tömör projektfejléc (vissza, dátum, név egy alacsony sorban; kisebb gombsor)"
},
{
"id": "c6bb590204",
"at": "2026-11-26T17:32:00+02:00",
"msg": "Kijelölés-védelem: beviteli mezőben a kijelölés érintetlen marad"
},
{
"id": "17acd41743",
"at": "2026-11-26T17:31:52+02:00",
"msg": "Érintőképernyő: hosszú nyomásra nem jelölődik ki szöveg a listákban (JS-védelem is, nem csak CSS)"
},
{
"id": "6d052941a1",
"at": "2026-11-26T17:31:14+02:00",
"msg": "Értékelés-kérő levél a szokásos levélnézetben (fejléc, szerkeszthető szöveg, aláírás); a visszajelző üzenet eltűnik kattintásra / új ablaknál"
},
{
"id": "0b244219f2",
"at": "2026-11-26T17:29:31+02:00",
"msg": "Fizetések (gép): az oldal nem húzható le, csak a tábla görget; vékonyabb fejléc"
},
{
"id": "64a054b33b",
"at": "2026-11-26T17:23:35+02:00",
"msg": "Egységes fejsor minden menüpontban (a Naptár eszköztára a minta): 30 px magas gombok, keresők, fülek, 13,5 px betű"
},
{
"id": "cc59ac2949",
"at": "2026-11-26T17:17:34+02:00",
"msg": "Munkatársi dokumentumok: azonnal nyílnak (a Drive előnézetében, nem kell megvárni, amíg a szerver letölti és átküldi); ahol mégis a szerver hozza, a lapon „betöltés…” látszik"
},
{
"id": "42fb3de629",
"at": "2026-11-26T17:17:01+02:00",
"msg": "Kifizetések: a banki utalás magától kifizetettnek jelöli a szakember számláját (egyező összeg + számlaszám a közleményben vagy bankszámla / név; utólag érkező NAV-számlánál is); a kimenő utalás összege negatív – ezért nem párosított eddig. Felület: kellemesebb zöld az egész appban, vékonyabb állapotsorok, Fizetések fejléce görgetéskor fent marad, egységes kis hézag a menüsáv alatt, Projektek fejléce egy sorban"
},
{
"id": "01fbeec04c",
"at": "2026-11-26T16:08:31+01:00",
"msg": "Fizetések: a kész lépés cellája (kiküldve, számla kiállítva, kifizetve) teljesen zöld"
},
{
"id": "63204338d8",
"at": "2026-11-26T16:05:51+01:00",
"msg": "Érintőképernyő: érintésre / hosszú nyomásra nem jelölődik ki a szöveg a listákban, kártyákon, menüben (a mezők és jegyzetek szövege kijelölhető marad)"
},
{
"id": "35ffdefc33",
"at": "2026-11-26T16:04:35+01:00",
"msg": "Fekvő telefon: a felső sáv csak saját görgetésre tűnik el (menüváltáskor nem), a Bevétel-táblázat fejléce fent marad, a projektlista sorai feleakkorák"
},
{
"id": "8cf87cb9c3",
"at": "2026-11-26T16:03:07+01:00",
"msg": "Jegyzet-törlés azonnal (a háttérben ment, hibánál visszajön); telefonon a Szerződés / Bevétel fejléce egy sorban, mint a Fizetéseknél"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
module.exports.items = ITEMS;   // a gyors út (api/_gasrt.js) innen olvassa
