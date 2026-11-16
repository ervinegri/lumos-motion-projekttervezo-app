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
exit 1
