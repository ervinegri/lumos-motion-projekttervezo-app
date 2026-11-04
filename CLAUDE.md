# Lumos Motion Projekttervező – fejlesztési szabályok

- **Legördülő lista:** minden új `<select>` a saját, kereshető legördülőt használja: `data-cmb="Helyőrző szöveg…"` attribútum
  (opcionálisan `data-cmb-sub="crew"` a szakember-alcímhez, `data-cmb-cls` az input osztályához). A `cmbAuto()` alakítja át
  (core.js `comboSelect`), és kiválasztáskor `change` eseményt küld, így a meglévő change-kezelők működnek. Natív select-et ne vezess be.
- Minden díj nettó – a felületen ezt jelezni kell („nettó”).
- Push előtt mindig `git pull --rebase` (a felhasználó párhuzamosan is fejleszt; a GitHub Action változásnaplót commitol).
- Teszt: `node tests/finance.test.cjs`.
