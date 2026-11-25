// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "ab13e8c6ca",
"at": "2026-11-25T17:21:58+01:00",
"msg": "Belső ellenőrzés jóváhagyása: a beírt szöveg tájékoztató megjegyzésként megy a vágónak (✅ Jóváhagyva – megjegyzés)"
},
{
"id": "19884ddd74",
"at": "2026-11-25T17:16:28+01:00",
"msg": "Belső ellenőrzés: nincs külön hozzászólás – csak Visszadobás (a beírt észrevételekkel) vagy Jóváhagyás"
},
{
"id": "50206f77ae",
"at": "2026-11-25T17:10:35+01:00",
"msg": "Időkódra ugrás telefonon (iOS): metaadatra várás, első koppintásnál a videó feloldása, ellenőrzött ugrás, videó a képbe gördül"
},
{
"id": "58be31a17a",
"at": "2026-11-25T17:07:38+01:00",
"msg": "Telefonos indítás: nem fekete a képernyő – világos háttér az első kirajzolástól, iOS indítóképek, manifest"
},
{
"id": "cb3fac4ba0",
"at": "2026-11-25T17:06:16+01:00",
"msg": "Felnyitott projekt: 🔒 Visszazárás gomb (ugyanarra a lezárási dátumra)"
},
{
"id": "23296312af",
"at": "2026-11-25T17:04:15+01:00",
"msg": "Helyszíni munka → Kész: a beszámoló ablak nem jön fel kétszer egymás után"
},
{
"id": "1d2097f031",
"at": "2026-11-25T17:01:48+01:00",
"msg": "Szolgáltatások: a lakat az oszlop jobb felső sarkában"
},
{
"id": "501c95711c",
"at": "2026-11-25T16:59:36+01:00",
"msg": "Projekt lépései: utómunka nélküli projektnél a Helyszíni munka áthúzható a Készre (a következő látható lépés a cél)"
},
{
"id": "0d7d55de68",
"at": "2026-11-25T16:57:20+01:00",
"msg": "Projektlista: megnyitáskor a mai nap (piros jelölő) a képernyő közepére gördül"
},
{
"id": "24ad4a74c9",
"at": "2026-11-25T16:56:12+01:00",
"msg": "Ügyfél számlái: a régi (csak számlázz.hu-s) számla is megnyílik a sorszám alapján; kattintás után nem esik szét a sor"
},
{
"id": "674d1be591",
"at": "2026-11-25T16:30:07+01:00",
"msg": "Jóváhagyó oldal: ha a jobb oldali panel magasabb, a videó függőlegesen középen"
},
{
"id": "77ddead227",
"at": "2026-11-25T16:27:43+01:00",
"msg": "Ügyfél-levél: a vágó belső üzenete és a legutóbbi javítási levél egyedi szövege nem kerül bele (alap szöveg)"
},
{
"id": "46231919b5",
"at": "2026-11-25T16:20:11+01:00",
"msg": "Adatvédelmi teszt és szabály: a szakember nézet nem mutathat másokra vonatkozó adatot (őrző teszt)"
},
{
"id": "b86c97382d",
"at": "2026-11-25T16:17:37+01:00",
"msg": "Szakember nézet: a projekt-figyelmeztetések (mások ügyei) soha nem látszanak; az e-mail-hiány figyelmeztetés csak betöltött címeknél"
},
{
"id": "41c8533f61",
"at": "2026-11-25T16:16:51+01:00",
"msg": "Zár ikon: kinyitva jól láthatóan nyitott lakat (saját rajzolt ikon az emoji helyett)"
},
{
"id": "6f5827cfb3",
"at": "2026-11-25T16:14:35+01:00",
"msg": "Változás-értesítő: a csak vágóként beosztott szakember nem kap levelet a helyszíni időpont / helyszín változásáról"
},
{
"id": "55fac4939a",
"at": "2026-11-25T16:08:12+01:00",
"msg": "Projektoldal: egyforma hézag minden panel között és egyforma magas csukott kártyák (a Szolgáltatások kártya plusz térköze megszűnt)"
},
{
"id": "c98b8cc9ff",
"at": "2026-11-25T16:00:32+01:00",
"msg": "Projektoldal: egyforma távolság minden panel között"
},
{
"id": "3a599348f4",
"at": "2026-11-25T15:57:53+01:00",
"msg": "Lemondott projektnél a számlázás panel kezelhető marad"
},
{
"id": "4fbe88bf92",
"at": "2026-11-25T15:57:39+01:00",
"msg": "Projektoldal: a Szerződés és számlázás panel ugyanolyan távolságra, mint az Alapadatok és az Utómunka"
},
{
"id": "d117a6ceaf",
"at": "2026-11-25T15:52:02+01:00",
"msg": "Díjcsökkentés: a példaesetek az illető munkájához igazodnak (forgatás, fotó, hang, vizuáltechnika, streaming, utómunka) a szerződés 10. pontja szerint, forgatási esetekkel; a projekt Szerződés és számlázás része alapból csukva"
},
{
"id": "1c57c683fc",
"at": "2026-11-25T15:46:01+01:00",
"msg": "Helyszíni beszámoló: a díjcsökkentésnél csak a helyszínen dolgozók (a csak utómunkás vágó nem)"
},
{
"id": "66b1b112d1",
"at": "2026-11-25T15:43:37+01:00",
"msg": "Nyersanyag-levél: darabszám „db”-vel"
},
{
"id": "190a54dbdf",
"at": "2026-11-25T15:43:24+01:00",
"msg": "Nyersanyag-levél: formázott, szerkeszthető előnézet aláírással (mint az ügyfél-levél); a Helyszíni munka „Rendben” jelzése csak áthúzás után, áthúzáskor mindig rákérdez; a piros hiba szövege rövidebb"
},
{
"id": "54d6e4bf5b",
"at": "2026-11-25T15:40:27+01:00",
"msg": "Szabály: a Stáb listában kötelező az e-mail-cím (mentéskor ellenőrzés elöl-hátul; a futó projekteken cím nélküli stábtag piros hibaként)"
},
{
"id": "e900a472b4",
"at": "2026-11-25T15:38:37+01:00",
"msg": "Nyersanyag-levél: a vágó címzett nem vehető ki (mindenképp megkapja)"
},
{
"id": "46d99fb940",
"at": "2026-11-25T15:38:08+01:00",
"msg": "Piros hiba: lezajlott forgatás után a projekt még a Helyszíni munkánál (nyersanyag nincs feltöltve, a vágó nem tud kezdeni); szövegek: „húzd át” a „pipáld ki” helyett"
},
{
"id": "24a0f27dde",
"at": "2026-11-25T15:36:45+01:00",
"msg": "Ablakok: az előre kitöltött szövegdoboz megnyitáskor a tartalmához nő (nem vágódik le)"
},
{
"id": "5e3967f7ed",
"at": "2026-11-25T15:35:15+01:00",
"msg": "Jégvarázs egyszeri visszaállítás kikapcsolva (marad az Utómunkában)"
},
{
"id": "55fed244f3",
"at": "2026-11-25T15:25:05+01:00",
"msg": "Jégvarázs visszaállítás: robusztusabb (név egyezés, „Utómunka alatt” kártya is vissza), az eredmény az ügyvezetőnél megjelenik"
},
{
"id": "d8417d79a1",
"at": "2026-11-25T14:20:27Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
