# Lumos Motion Projekttervező – projektleírás

Ez a fájl egy új munkamenet (vagy egy Claude Project) háttéranyaga: mi az app, hol van, hogyan épül fel, és milyen szabályok szerint fejlesztjük.

## Mi ez
A Lumos Motion (lumosmotion.hu, rendezvényvideózás) belső projektkezelő appja: projektek, stáb, leltár, beosztások, eszközlista kiküldése.
Tulajdonos és ügyvezető: Egri Ervin (ervin.egri@lumosmotion.com). Nyelv: magyar.

## Címek
- Élő app: https://projekttervezo.lumosmotion.hu (tartalék: https://lumos-motion-projekttervezo.vercel.app)
- GitHub: ervinegri/lumos-motion-projekttervezo-app (privát), `main` ág
- Vercel: csapat „lumos-motion”, projekt `lumos-motion-projekttervezo` (Git-összekötés: minden `main` commit automatikusan élesedik)
- Apps Script háttér (exec URL a `config.js`-ben): https://script.google.com/macros/s/AKfycbwM_dJllYQIIS9xyRWX68PFDChk6MMNv7BqcU-w2U3O_9LXlHi94VYZRrihClgmXfE/exec
- Adatbázis (Google Sheet): 1Jf9nELuauhFEaAxAnfg_dSDG1MudeqfmftqYPqCdif8 – lapok: Projektek, Stáb, Leltár, Stábbeosztás, Eszközbeosztás, Napló
- Drive „Projektek” mappa: 1qxSBbudO4atHkdOsfH6ur6oXc_tc9OnB (projektenként `<év>/<projekt>` almappa)
- Levelek feladója: admin@lumosmotion.com (Gmail „Küldés másként” alias Ervin fiókjában), válaszcím a küldő

A lumosmotion.hu DNS-e a Vercelen van. A főoldal (lumos-motion projekt), a sales.lumosmotion.hu (lumos-sales-app) és a projekttervezo.lumosmotion.hu külön Vercel-projekt. A régi lumosmotion.hu/projekttervezo útvonal ki van kapcsolva.

## Felépítés
- `index.html` – HTML + CSS (a Sales App színei, belépő a Sales App mintájára)
- `config.js` – `window.LUMOS_API_URL`
- `core.js` – konstansok, állapot, segédfüggvények, létszámigény, `gs()` hívás (GET `?p=` 6000 karakterig, utána POST)
- `views.js` – belépés, nézetek (Áttekintés, Projektek, Stáb, Leltár, Beállítások)
- `actions.js` – ablakok, események, mentés
- `apps-script/Code.gs`, `apps-script/appsscript.json` – a háttér másolata (a Vercel nem tölti fel, `.vercelignore`)

Háttér: Apps Script webalkalmazás, a tulajdonos nevében fut, bárki hívhatja (a jogosultságot a token és a szerepkör adja). Felhasználók és munkamenetek a Script Propertiesben, PIN SHA-256 + só, lépcsőzetes zárolás, ütközésvédelem (`baseUpdatedAt`), ismétlésvédelem (`mutationId`), képletbeszúrás ellen `'` előtag. Időzóna: Europe/Budapest.

## Szerepkörök
- Ügyvezető (`admin`): mindent lát és kezel, Beállítások, napló, felhasználók, beszerzési értékek.
- Termelési vezető (`editor`): projektek, stáb, leltár szerkesztése és törlése, eszközlista küldése. Beszerzési értéket megadhat, de nem lát.
- Régi „Stáb” (`crew`) felhasználó csak olvashat; újat nem lehet felvenni.
- Projekten belüli szerep (Stáb fül): Projektvezető, Operatőr, Vágó, Fotós, Drónpilóta, Hangtechnikus, Fénytechnikus, Képkeverő / streaming, Sofőr / rakodó.

## Fontos szabályok
- Az app NEM kezel árakat (a Projekttervező nem férhet hozzá a Lumos árakhoz). A megrendelt tartalmakból csak az operatőrszám számolódik.
- Belépés csak Google-fiókkal (Google Identity Services, OAuth Client ID a config.js-ben és a Code.gs-ben; Google Cloud projekt: lumos-motion-projekttervezo, External, In production). Céges címnél csak a lumosmotion.com Workspace-fiók (hd) fogadható el. Csak a Beállítások → Hozzáférések listában szereplő aktív címek léphetnek be. A PIN-es belépés megszűnt; vészhelyzetben a PIN_LOGIN_ENABLED=true Script Property és a /#pin cím kapcsolja vissza.
- Biztonsági fejlécek (CSP stb.) a vercel.json-ban.
- Új oszlop csak a munkalap végére kerülhet; fejlécet átnevezni nem szabad (a háttér ellenőrzi).
- Kategóriák (Leltár): Kamera, Objektív, Hang, Fény, Drón, Képkeverés / stream, GoPro / akciókamera, Gimbal / állvány, Akku / powerbank / táp, Adathordozó, Laptop / tablet / telefon, Kocsi / szállítás, Kábel, Egyéb. Állapot: Üzemképes, Javításra vár, Szervizben, Selejtezett.
- Pénzmezők: csak szám, mindig ezres tagolás, „Ft”; napidíjnál ± 1000 Ft gomb, beszerzési értéknél nincs.
- Stáb: prioritás (1–3), vállalkozás, részletek (Statív, Gimbal, Előadásvágás, Kreatív vágás, Werk, Saját kamera, Eszközbérlés); kártya és lista nézet.

## Munkamenet
1. Felület módosítása: commit a `main` ágra → a Vercel ~10 mp alatt élesít. Ellenőrzés: `list_deployments` a projektre.
2. Háttér módosítása: `apps-script/Code.gs` frissítése a repóban, majd Ervin bemásolja az Apps Script szerkesztőbe → Deploy → Manage deployments → ceruza → New version → Deploy. Az URL nem változik.
3. Visszafelé kompatibilitás: amíg az új Code.gs nincs fent, a felületnek a régi háttérrel is működnie kell (régi elnevezéseket a háttér `fromRow_` átfordítja).
4. Tesztelés helyben: mockolt Apps Script szolgáltatások (SpreadsheetApp, PropertiesService, GmailApp stb.) + Playwright.

## Kapcsolódó
- Sales App: ervinegri/lumos-motion-sales-app, sales.lumosmotion.hu, külön adatbázis és felhasználók; a két app között nincs átjárás.
