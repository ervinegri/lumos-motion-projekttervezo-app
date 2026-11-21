# Lumos Motion Projekttervező – fejlesztési szabályok

- **Legördülő lista:** minden új `<select>` a saját, kereshető legördülőt használja: `data-cmb="Helyőrző szöveg…"` attribútum
  (opcionálisan `data-cmb-sub="crew"` a szakember-alcímhez, `data-cmb-cls` az input osztályához). A `cmbAuto()` alakítja át
  (core.js `comboSelect`), és kiválasztáskor `change` eseményt küld, így a meglévő change-kezelők működnek. Natív select-et ne vezess be.
- **Nincs redundancia a felületen:** ugyanaz az információ (pl. állapot, „jóváhagyva”) egy helyen csak egyszer jelenjen meg; ha egy összesítő jelzés már kimondja, a tételes címkék maradjanak el.
- **A beírt szöveg nem veszhet el:** minden `<textarea>` tartalmát az `actions-ablakok.js` szövegmegőrzője (`txtKey`/`txtRestore`) automatikusan menti és visszatölti; küldés után törlődik. Új szövegdoboznál ne kerüld meg (csak indokolt esetben `data-no-keep`); a küldőgomb felirata/akciója tartalmazza a küldés/hozzáadás/mentés szót.
- Minden díj nettó – a felületen ezt jelezni kell („nettó”).
- **Újdonságok a többi felhasználónak:** nagyobb (nem pénzügyi, nem értékesítési) fejlesztésnél egy rövid, közérthető sort is a `hirek.json` lista elejére (egyedi `id`, `at` dátum). Ezt a szakemberek, a termelési vezető és az értékesítők a következő belépéskor „✨ Újdonságok az appban” dobozban látják; az ügyvezető a teljes változásnaplót kapja. Pénzhez (díjak, számlák, fizetések, jutalék) és értékesítéshez kötődő tétel nem kerülhet bele.
- Push előtt mindig `git pull --rebase` (a felhasználó párhuzamosan is fejleszt; a GitHub Action változásnaplót commitol).
- Teszt: `node tests/run-all.cjs` (minden pushkor GitHub Action is futtatja; az ártitok-teszt nélkül a háttér nem települ).
- **`TABLES` oszlopfejlécei** (`apps-script/src/00_alap.gs`) (pl. `['x_nyersVetel', 'Nyersanyag megvásárlása']`) a munkalap/Neon fejlécével egyeznek, és a háttér ellenőrzi őket: **soha ne nevezd át** (a felületi feliratot a frontendben változtasd), új oszlop csak a lista végére kerülhet.

## Fájlszerkezet (modulok)
- **Háttér:** `apps-script/src/NN_nev.gs` – a fájlnév eleji szám a betöltési sorrend (az Action `filePushOrder`-rel ebben a sorrendben tölti fel).
  Egy közös globális tér: a fájlok egymás függvényeit szabadon hívhatják, de **betöltéskor futó** (függvényen kívüli) kód csak a korábbi fájlok függvényeit használhatja.
  Új rész a témájához illő fájlba kerüljön; a szerződéssablonok: `apps-script/Templates.gs` (és a Drive „Szerződéssablonok” mappája, ha ott van példány).
- **Felület:** az `index.html` sorrendjében töltődik (`core.js` → `views-*.js` → `actions-*.js` → `finance.js` … → `boot.js`). Az indítás a `boot.js`-ben, minden szkript után.
  Új szkriptfájlt az `index.html`-be és a `tests/finance.test.cjs` fájllistájába is fel kell venni.
- **Értékesítés munkalap:** a 33. oszlop jelenleg egy duplikált „Másodlagos e-mail” fejléc – amíg a lapon nincs rendezve, a `deals` táblához ne adj új oszlopot.

## Szöveg hossza – általános szabály (2026-11-21)
A felhasználó által beírt szöveget SOHA nem vágjuk le csendben. A backend `str_` hibát dob, ha a kérésben érkezett szöveg (≥300 karakteres határú mezőnél) hosszabb a határnál; a frontend a maxlength-nél megállítja az írást és a túl hosszú beillesztést, és szól. Új szövegmezőnél a frontend maxlength = a backend határa. Előnézethez / naplóhoz `.slice()`-t használj, ne `str_`-t.
