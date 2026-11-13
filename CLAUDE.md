# Lumos Motion Projekttervező – fejlesztési szabályok

- **Legördülő lista:** minden új `<select>` a saját, kereshető legördülőt használja: `data-cmb="Helyőrző szöveg…"` attribútum
  (opcionálisan `data-cmb-sub="crew"` a szakember-alcímhez, `data-cmb-cls` az input osztályához). A `cmbAuto()` alakítja át
  (core.js `comboSelect`), és kiválasztáskor `change` eseményt küld, így a meglévő change-kezelők működnek. Natív select-et ne vezess be.
- Minden díj nettó – a felületen ezt jelezni kell („nettó”).
- Push előtt mindig `git pull --rebase` (a felhasználó párhuzamosan is fejleszt; a GitHub Action változásnaplót commitol).
- Teszt: `node tests/finance.test.cjs`.
- **`TABLES` oszlopfejlécei** (`apps-script/src/00_alap.gs`) (pl. `['x_nyersVetel', 'Nyersanyag megvásárlása']`) a munkalap/Neon fejlécével egyeznek, és a háttér ellenőrzi őket: **soha ne nevezd át** (a felületi feliratot a frontendben változtasd), új oszlop csak a lista végére kerülhet.

## Fájlszerkezet (modulok)
- **Háttér:** `apps-script/src/NN_nev.gs` – a fájlnév eleji szám a betöltési sorrend (az Action `filePushOrder`-rel ebben a sorrendben tölti fel).
  Egy közös globális tér: a fájlok egymás függvényeit szabadon hívhatják, de **betöltéskor futó** (függvényen kívüli) kód csak a korábbi fájlok függvényeit használhatja.
  Új rész a témájához illő fájlba kerüljön; a szerződéssablonok: `apps-script/Templates.gs` (és a Drive „Szerződéssablonok” mappája, ha ott van példány).
- **Felület:** az `index.html` sorrendjében töltődik (`core.js` → `views-*.js` → `actions-*.js` → `finance.js` … → `boot.js`). Az indítás a `boot.js`-ben, minden szkript után.
  Új szkriptfájlt az `index.html`-be és a `tests/finance.test.cjs` fájllistájába is fel kell venni.
- **Értékesítés munkalap:** a 33. oszlop jelenleg egy duplikált „Másodlagos e-mail” fejléc – amíg a lapon nincs rendezve, a `deals` táblához ne adj új oszlopot.
