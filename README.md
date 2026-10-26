# Lumos Motion – Projekttervező

Élő cím: https://projekttervezo.lumosmotion.hu/

## Felépítés
- **Gyökérmappa** – a felület, a Vercel szolgálja ki (statikus fájlok):
  `index.html`, `config.js` (az Apps Script exec URL-je), `core.js`, `views.js`, `actions.js`.
  Minden `main` ágra küldött commit után a Vercel automatikusan élesít.
- **apps-script/** – a háttér (Google Apps Script). Ezt a Vercel nem tölti fel (`.vercelignore`).
  Módosítás után a `Code.gs` tartalmát be kell másolni a szkriptszerkesztőbe, majd
  Deploy → Manage deployments → New version.

## Adatok
Google Sheets (Projektek mappa), lapok: Projektek, Stáb, Leltár, Stábbeosztás, Eszközbeosztás, Napló.

## Időzóna
Minden dátum Europe/Budapest szerint (appsscript.json és Code.gs `SHEET_TZ`).
