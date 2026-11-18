// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "798ad926bf",
"at": "2026-11-18T07:53:28+02:00",
"msg": "Tagi kölcsön: a 2026-06-06-i duplikált kézi visszafizetés törölve (= 07-06 banki utalás); banki rögzítéskor az elírt dátumú kézi sor javul (nem lesz dupla); az egyeztetés az eltérő dátumú párt is felismeri"
},
{
"id": "c9c0d9f1bd",
"at": "2026-11-18T00:23:47+02:00",
"msg": "Tagi kölcsön: banki utalások egyeztetése a kezdetektől (melyik van a táblában, melyik hiányzik – egy kattintással rögzíthető; mely sorokhoz nincs banki pár)"
},
{
"id": "9b0c67b672",
"at": "2026-11-18T00:16:28+02:00",
"msg": "Tagi kölcsön: a sorra kattintva a hozzá tartozó banki utalás részletei (kézi sornál a sor adatai és módosítás)"
},
{
"id": "f2159c708f",
"at": "2026-11-18T00:10:28+02:00",
"msg": "Tagi kölcsön: a banki tételből rögzített sor nem duplikál (ha kézzel már fel volt véve, csak a közlemény kerül rá); a két meglévő duplikátum egyszeri összevonása; banki tétel részletei kattintásra"
},
{
"id": "b3e56bf2d6",
"at": "2026-11-18T00:04:59+02:00",
"msg": "Banki tételek: tagi kölcsön rögzítése egy kattintással (a „tagi kölcsön” közleményű tételeknél javaslat); az elvetett tételek lenyithatók, visszaállíthatók vagy tagi kölcsönként rögzíthetők"
},
{
"id": "48ac0938be",
"at": "2026-11-17T23:58:51+02:00",
"msg": "Értékesítés: az aktív „Összes időszak” gomb olvasható (sötét alapon fehér)"
},
{
"id": "17331d1a99",
"at": "2026-11-17T23:55:52+02:00",
"msg": "Banki tételek: a csak a számlázz.hu-ban kiállított nyitott számlákra is javaslat, egy kattintással kifizetett (a számlázz.hu-ban is jóváírva); a pénzügyi gyorsítótár az új kóddal frissül"
},
{
"id": "ad2f8024ff",
"at": "2026-11-17T23:53:26+02:00",
"msg": "Beállítások: a Neon-leírás az új működést mutatja (nincs automatikus átváltás)"
},
{
"id": "6eb67d47b5",
"at": "2026-11-17T23:47:24+02:00",
"msg": "Banki tételek: a közleményben hivatkozott, már kifizetett számlák tételei nem várnak párosításra; nyitott app-számlára javaslat; a lista első 6 tétele, a többi lenyitható"
},
{
"id": "66e0f586c8",
"at": "2026-11-17T23:42:20+02:00",
"msg": "Állapot: táblaméretek lekérhetők (a Neon-forgalom elemzéséhez, adat nélkül)"
},
{
"id": "230d24c6e6",
"at": "2026-11-17T23:40:24+02:00",
"msg": "Sötét mód: az aktív alfül (pl. Stáb) sötét; a sárga gombok halványabbak"
},
{
"id": "086dc2634e",
"at": "2026-11-17T23:39:16+02:00",
"msg": "Neon-kiesésnél nincs automatikus átváltás a (nem friss) táblázatra, csak e-mail; sötét módban sötétebb ablak-háttér"
},
{
"id": "3557708990",
"at": "2026-11-17T23:37:22+02:00",
"msg": "Hónapváltó: fix szélességű hónapgombok – lapozáskor semmi nem csúszik el"
},
{
"id": "e174bd61e6",
"at": "2026-11-17T23:36:12+02:00",
"msg": "Sötét mód: az oldalcímek a logó feliratához hasonlóan halványabbak"
},
{
"id": "e838aef76a",
"at": "2026-11-17T23:35:00+02:00",
"msg": "Sötét mód: a sötétzöld kiemelőszín (aktív hónap, gombok) sötét marad, szövegként világoszöld"
},
{
"id": "402d26dccd",
"at": "2026-11-17T23:19:53+02:00",
"msg": "Átnézés: 5 sehol nem hívott háttérfüggvény törölve"
},
{
"id": "9b3d6cbe5e",
"at": "2026-11-17T23:19:38+02:00",
"msg": "Átnézés: 23 sehol nem használt felületi függvény és a kikapcsolt automatikus mentés maradéka törölve"
},
{
"id": "2f48ae08a5",
"at": "2026-11-17T23:17:13+02:00",
"msg": "Átnézés: az Elvetés gomb a teljes visszaállítást használja (dupla kulcs); szerződés mentése után a pénzügyi adatok frissülnek; pipálás-felirat escape; halott kódrészek törölve"
},
{
"id": "b52e40e6a9",
"at": "2026-11-17T23:13:15+02:00",
"msg": "Átvilágítás javításai: Neon-akadásnál újrapróbálás (nincs azonnali visszaváltás a táblázatra, nincs dupla futás); kifizetett állapot a bizonylat ÁFÁ-jával; közös API-hitelesítés; minden írás frissíti a nyitott lapokat; banki párosítás pontosítva; teszt a számlázz.hu fogadóra; felesleges képek törölve"
},
{
"id": "382068ac41",
"at": "2026-11-17T23:02:02+02:00",
"msg": "Idővonal: világos módban sincs átmenet a sávokon"
},
{
"id": "7a2b1bfc21",
"at": "2026-11-17T23:00:31+02:00",
"msg": "Sötét mód: a sötétkék háttér a lap aljáig ér"
},
{
"id": "9b1a14031f",
"at": "2026-11-17T23:00:04+02:00",
"msg": "Kifizetések: az Összesen (még fizetendő) sor is csak akkor látszik, ha van fizetendő"
},
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
"id": "969a0e66aa",
"at": "2026-11-17T20:51:18Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
