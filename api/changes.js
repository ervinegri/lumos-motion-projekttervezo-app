// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "e5ba6ed4fa",
"at": "2026-11-18T14:32:28+02:00",
"msg": "Idővonal: a sáv neve pontosan a látható rész elején (a régi ragadós eltolás nem adódik hozzá)"
},
{
"id": "13f1aa589d",
"at": "2026-11-18T14:30:40+02:00",
"msg": "Idővonal: oldalra görgetéskor a sávok neve a látható rész elejétől fokozatosan jelenik meg (rövid látható résznél is)"
},
{
"id": "055168f3bc",
"at": "2026-11-18T14:29:32+02:00",
"msg": "Értékesítés: a folyamat címsora kivéve; előbb az értékesítő-választó, utána a keresés"
},
{
"id": "48fd701d0e",
"at": "2026-11-18T14:27:09+02:00",
"msg": "Értékesítési folyamat fejléce: cím, értékesítő-választó és keresés egy sorban (tablet, gép)"
},
{
"id": "ebf6e44ee6",
"at": "2026-11-18T14:26:50+02:00",
"msg": "Projekt címsávja a felső sáv része: a rugózás megmarad, de a kettő nem válik szét"
},
{
"id": "8f13fe1282",
"at": "2026-11-18T14:25:49+02:00",
"msg": "Értékesítés telefonon: az alsó gyors célpont-sáv kivéve (görgetéssel / szélre húzással lehet oszlopot váltani)"
},
{
"id": "baa0eee46e",
"at": "2026-11-18T14:23:25+02:00",
"msg": "Gépen nincs túlgörgetési rugózás: a felső sáv és a projekt címsávja nem válik szét az oldal alján"
},
{
"id": "609d96eace",
"at": "2026-11-18T14:22:44+02:00",
"msg": "Értékesítés telefonon: húzás közben a képernyő széléhez víve az oszlopok valóban oldalra görögnek (a mobilos oszlop-illesztés eddig visszaugratta)"
},
{
"id": "9fc29c92c8",
"at": "2026-11-18T14:22:28+02:00",
"msg": "Értékesítés telefonon: húzás közben a másik ujjal görgetés a ténylegesen görgő tartón (oldalra és fel-le), két ujjnál nincs nagyítás"
},
{
"id": "d6696f14d1",
"at": "2026-11-18T14:21:01+02:00",
"msg": "Értékesítés telefonon: húzás közben alul gyors célpontok a szakaszokhoz (pl. Sikertelen) – nem kell az oszlopig görgetni"
},
{
"id": "a076d90189",
"at": "2026-11-18T14:07:27+02:00",
"msg": "Értékesítés telefonon: vissza az ujjas húzás (hosszan nyomva), megbízhatóbban – a kártyán is figyeli a felengedést, húzás közben nincs újrarajzolás, beragadás esetén magától lezárul, lerakás után nem nyílik meg a kártya"
},
{
"id": "dc08eed2ee",
"at": "2026-11-18T13:50:38+02:00",
"msg": "Bérelt eszköz: a bérleti díj mezőt csak az ügyvezető látja (a termelési vezetőnek nem kell megadnia)"
},
{
"id": "692de5a643",
"at": "2026-11-18T13:22:49+02:00",
"msg": "Saját meghívásaim: egy meghívásnál az egész doboz kattintható (a gombok kivételével)"
},
{
"id": "7c0e3b2194",
"at": "2026-11-18T13:21:33+02:00",
"msg": "Meghívás: az Elfogadom gomb jobb oldalt"
},
{
"id": "043345f4da",
"at": "2026-11-18T13:21:22+02:00",
"msg": "Saját meghívásaim: az egész sor kattintható (megnyitja a projektet)"
},
{
"id": "b4cb7aacd3",
"at": "2026-11-18T13:17:58+02:00",
"msg": "Saját meghívásaim: szembetűnőbb doboz (meleg háttér, bal sáv, számláló, harang, „Válaszod vár” felirat)"
},
{
"id": "aa53bed42e",
"at": "2026-11-18T12:39:54+02:00",
"msg": "Eszközök: a kiküldött (véglegesített) eszközlista zárolását 🔓 Feloldás gomb oldja fel közelgő projektnél (ügyvezető, termelési vezető), utána újra véglegesíthető; lezajlott rendezvénynél nincs feloldás"
},
{
"id": "fa57a1e6aa",
"at": "2026-11-18T12:36:39+02:00",
"msg": "Lezajlott rendezvény: a csapat és az eszközök 🔓 Feloldás gombbal újra módosíthatók (ügyvezető, termelési vezető)"
},
{
"id": "4414c1430c",
"at": "2026-11-18T08:48:59+02:00",
"msg": "Értékesítés telefonon: hosszan nyomva a kártyán áthelyezés-menü (szakasz gombok) a megbízhatatlan ujjas húzás helyett"
},
{
"id": "bce8f0a329",
"at": "2026-11-18T08:42:17+02:00",
"msg": "Értékesítés telefonon: a húzott kártya nem ragad be (húzás közben nincs újrarajzolás, elveszett felengedésnél a következő érintés lezárja)"
},
{
"id": "134524fdd6",
"at": "2026-11-18T08:20:00+02:00",
"msg": "Értékesítés telefonon: a kártyát tartva a másik ujjal görgethető az oldal és az oszlopok"
},
{
"id": "902cf84fe2",
"at": "2026-11-18T08:18:43+02:00",
"msg": "Értékesítés telefonon: előbb az értékesítő-választó, utána a keresés; egyik sem lóg ki a képernyő szélére"
},
{
"id": "b6097b64ca",
"at": "2026-11-18T08:17:37+02:00",
"msg": "Értékesítés telefonon: húzás közben a képernyő széléhez víve az oszlopok oldalra, az oldal fel-le görög"
},
{
"id": "c9a5f84b89",
"at": "2026-11-18T08:16:48+02:00",
"msg": "Gombok: megnyomáskor azonnal szürkék, amíg a művelet fut nem nyomhatók újra (fél másodpercen belüli második nyomás sem fut le); mentés gomb ugyanígy"
},
{
"id": "ef3cc027d0",
"at": "2026-11-18T08:15:05+02:00",
"msg": "Értékesítés telefonon: a keresés és az értékesítő-választó egy sorban"
},
{
"id": "0b99f1dc74",
"at": "2026-11-18T08:11:48+02:00",
"msg": "Értékesítés telefonon: hosszan nyomva a kártya áthúzható (nincs szövegkijelölés); Sikertelenbe húzva csak az okát kérdezi; banki tételek: „2026-84” típusú rövid számlaszám és közlemény nélküli partner+összeg alapú párosítás"
},
{
"id": "f8e77711b9",
"at": "2026-11-18T08:07:09+02:00",
"msg": "Mai teendők levél: az „Értékesítés megnyitása” gomb az Értékesítés fület nyitja"
},
{
"id": "a219f95382",
"at": "2026-11-18T08:06:40+02:00",
"msg": "Bejövő számla: többszöri kattintásra sem rögzül többször (háttér + felület); a meglévő duplikátumok egyszeri törlése; a kiadás szerkesztőjében a számla és a banki tranzakció részletei"
},
{
"id": "735405f34d",
"at": "2026-11-18T08:03:12+02:00",
"msg": "Bejövő számlák: a szakember számlája név / számlázó cég alapján is párosul (ha az adószám hiányzik a Stábnál); a már beérkezett számlák egyszeri újrapróbálása"
},
{
"id": "3c7a74bfe9",
"at": "2026-11-18T06:00:59Z",
"msg": "Változásnapló frissítése"
}
];
const allowed = require('./_auth.js');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  if (!(await allowed(req, res))) return;
  res.end(JSON.stringify({ items: ITEMS }));
};
