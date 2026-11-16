#!/bin/bash
# Vercel „Ignored Build Step”: 0 = nincs build, 1 = build.
# Csak akkor épít, ha a felületet érintő fájl változott az utolsó sikeres telepítés óta
# (a háttér, a tesztek, a GitHub Actionök, a leírások és a változásnapló önmagában nem indít Vercel-buildet – ez a buildpercek nagy részét megspórolja).
msg=$(git log -1 --pretty=%s)
case "$msg" in "Változásnapló frissítése"*) exit 0;; esac
base="${VERCEL_GIT_PREVIOUS_SHA:-}"
[ -z "$base" ] && exit 1
git cat-file -e "$base^{commit}" 2>/dev/null || git fetch -q --depth=200 origin "$base" 2>/dev/null || exit 1
git diff --quiet "$base" HEAD -- . ':(exclude)apps-script/**' ':(exclude)tests/**' ':(exclude).github/**' ':(exclude)scripts/**' ':(exclude)*.md' ':(exclude)api/changes.js' ':(exclude)changes.json'
r=$?
[ $r -eq 0 ] && { echo "Csak háttér / teszt / leírás változott – nincs Vercel-build."; exit 0; }
# szintaxishibás felületi szkript nem települ: a legutóbbi működő változat marad élesben
# (a tests/ mappa a .vercelignore miatt itt nincs meg, ezért az ellenőrzés beágyazva fut; csak valódi szintaxishiba esetén marad ki a build)
if command -v node >/dev/null 2>&1 && ! node -e 'const fs=require("fs");let bad=0;for(const f of fs.readdirSync(".").filter(f=>f.endsWith(".js"))){try{new Function(fs.readFileSync(f,"utf8"))}catch(e){bad=1;console.error(f+": "+e.message)}}process.exit(bad)'; then echo "Szintaxishiba a felületben – a build kimarad, az előző változat marad élesben."; exit 0; fi
exit 1
