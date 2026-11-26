// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "afc99a9802",
"at": "2026-11-26T09:03:46+01:00",
"msg": "Naptár (asztali havi nézet): teljes képernyő – széltől szélig, a hetek kitöltik a képernyőt, nincs görgetés; napcellában annyi esemény, amennyi kifér (+N további)"
},
{
"id": "924ece1392",
"at": "2026-11-26T09:02:16+01:00",
"msg": "Panel-lakat: nem takarja a „kiválasztva” feliratot, és egy vonalban van a címmel"
},
{
"id": "d08b93d43e",
"at": "2026-11-26T09:00:52+01:00",
"msg": "Naptár (asztali havi nézet): a lap nem görgethető, csak maga a naptár; a szélén tovább görgetve hónapot vált"
},
{
"id": "1959a9f047",
"at": "2026-11-26T08:55:41+01:00",
"msg": "Fizetések: a vezető saját beosztása nem teszi a régi projektet meghívásossá (Vegan Summit, Veganuár díjai újra számítanak); Szolgáltatások: egyetlen lakat"
},
{
"id": "cda0535a68",
"at": "2026-11-26T08:48:28+01:00",
"msg": "Meghívó: „🎬 Projektvezető” + „👥 Meghívót kap” – a tervezett helyszíni csapat (egyszerre kiküldött meghívóknál is látják egymást)"
},
{
"id": "bd1de43c54",
"at": "2026-11-26T08:23:59+01:00",
"msg": "Vágás: „Visszadobás” helyett barátságosabb „✏️ Módosítás kérése” (gomb, súgó, jelzés, hibaüzenet)"
},
{
"id": "130152a89e",
"at": "2026-11-26T08:21:36+01:00",
"msg": "Helyszíni csapat: a meghívóban „👥 Veled lesz” sor, a szakember projektsorában a csapattársak (projektvezető + elfogadott helyszíni kollégák, utómunkások nélkül)"
},
{
"id": "175a2dabd4",
"at": "2026-11-26T08:03:38+01:00",
"msg": "Mai teendők levél: köszönés nélkül"
},
{
"id": "0856859617",
"at": "2026-11-25T18:11:44+01:00",
"msg": "Saját beosztás (termelési vezető / ügyvezető): mentéskor azonnal elfogadott meghívás, e-mail nélkül; egyszeri átállítás a futó projekteken"
},
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
"id": "e8b3c9168c",
"at": "2026-11-25T14:46:12Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
