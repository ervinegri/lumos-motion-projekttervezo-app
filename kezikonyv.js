/* ===== Kézikönyv (Beállítások → 📖 Kézikönyv): szerepenként külön dokumentum =====
   Mindenki a saját szerepe kézikönyvét látja; az ügyvezető mind a négyet (választóval).
   A szöveg egyszerű markdown (##, ###, -, 1., | táblázat |, **félkövér**) – az md() alakítja HTML-lé. Pénzügyi részlet csak az ügyvezetői kézikönyvbe kerülhet. */
const KK_ROLES=[['crew','Szakember'],['sales','Értékesítő'],['editor','Termelési vezető'],['admin','Ügyvezető']];
const KK_ALAP=`## Belépés és alapok

Belépni a Google-fiókoddal lehet, jelszó nincs. Csak az léphet be, akit az ügyvezető felvett a hozzáférések közé – ha nem sikerül, szólj neki, melyik e-mail címmel próbálkoztál.

- **Felső menü:** a fülek a szerepedtől függnek. Telefonon lefelé görgetve eltűnik, hogy több férjen ki.
- **Csengő:** az appon belüli értesítések – új meghívás, új hozzászólás, állapotváltozás.
- **Névjelvény (jobb fent):** sötét mód (ki / be / a telefon beállítása szerint), 🎨 Kinézet, kilépés.
- **✨ Újdonságok az appban:** belépés után egy doboz jelzi, ha az app új funkciót kapott.

**Jó tudni**

- A szövegdobozokba írt szöveg nem vész el: ha bezárod az ablakot vagy megszakad a kapcsolat, legközelebb visszatöltődik. Elküldés után törlődik.
- A legördülő listák kereshetők: kezdd el gépelni, amit keresel.
- Ha ketten egyszerre szerkesztitek ugyanazt, az app figyelmeztet, és nem írja felül a másik mentését.
- Minden díj és összeg nettó (ÁFA nélkül).`;
const KK_ERTESIT=`## Értesítések

A **Beállítások** fülön (⚙️ Beállítások) választhatod ki, miről kérsz e-mailt és miről csak appon belüli értesítést. A havi díjösszesítő és a belépési meghívó mindig megérkezik, ezek nem kapcsolhatók ki.`;
const KK_UTOMUNKA_VAGO=`### Vágóknak: utómunka

A videókat egy táblán követed: **Utómunkára vár → Utómunka alatt → Belső ellenőrzés**. A kártyát te húzod át, amikor elkezded, illetve amikor ellenőrzésre adod. Az ügyfélnek a termelési vezető vagy az ügyvezető küldi tovább.

- A videó ablakában hozzászólhatsz, időkóddal is, és a **Küldés** gombbal elküldöd.
- Ha az ügyfél javítást kér, a kártyán látszik, hányadik körnél tart (pl. „🔁 2. javítás”), a jelvény fölé húzva pedig az ügyfél kérései.
- Azt is jelzi, ha a videó a belső ellenőrzésből jött vissza.
- **Fájlnevek a pCloudon:** csak kisbetű, szám és alulvonás (_), pl. **short_3_16x9.mp4** vagy **short_3_v2.mp4**. Ha egy mappában több videó van, a név száma mondja meg, melyik videóhoz tartozik; ugyanannak a videónak több változata (v1, v2, 16x9, 1x1) is lehet. Hibás névnél a link nem menthető.`;
const KK={
crew:`# Kézikönyv – Szakembereknek

A Projekttervezőben kapod a meghívásokat, itt látod a beosztásaidat, a projektek részleteit és a saját díjadat. A munkád íve: meghívás → elfogadás → helyszíni munka vagy utómunka → havi díjösszesítő → számla. Csak a saját díjadat látod, másokét soha.

Füleid: **Beosztásaim, Naptár, Kifizetések, Beállítások**.

${KK_ALAP}

## Meghívás elfogadása

1. Új meghívásról e-mailt kapsz, és belépéskor felugró ablak is jelzi. A projekt oldalán a „✉️ Meghívást kaptál erre a projektre” sávban látod a szerepedet és a nettó díjadat.
2. Az **Elfogadom** gombbal visszaigazolod a részvételt és a díjat. Ha nem tudod vállalni, utasítsd el – így hamar találunk helyetted mást.
3. A meghívásnak határideje van. Ami addig válasz nélkül marad, elutasításnak számít.

A meghívás a Google Naptárban is megjelenik. Ott az „Igen” csak jelzés: az elfogadás a Projekttervezőben történik, erről az app emlékeztet is.

## Visszamondás elfogadás után

Egy már elfogadott, jövőbeli projektnél a projekt fejlécében a **Mégsem tudom vállalni** gombbal mondhatod vissza. Az ablak megmutatja a feltételeket, és meg kell adnod az okát. A feltételek a keretszerződés szerint:

| Mikor mondod vissza | Következmény |
| --- | --- |
| több mint 30 nappal előtte | díjmentes, évente legfeljebb 2 alkalommal |
| 15–30 nappal előtte | a díj 50%-a |
| 15 napon belül | a díj 100%-a |

## Beosztásaim és Naptár

A **Beosztásaim** fülön a projektjeid listája, a **Naptár** fülön ugyanez idővonalon. Egy projektet megnyitva látod:

- az időpontot (többnapos rendezvénynél naponként), a helyszínt és a szerepedet;
- a stábot, akikkel dolgozol;
- a **stáb-instrukciókat**: közös jegyzet a helyszíni csapatnak, hozzászólhatsz;
- az **eszközlistát**: mi lesz nálad a forgatáson (e-mailben is megkapod).

A forgatás után az app megkérdezi, hogyan ment a helyszíni munka. Pár szó is elég, ez segít a következő projekt tervezésében.

${KK_UTOMUNKA_VAGO}

## Kifizetések, díjösszesítő és számla

A **Kifizetések** fülön hónaponként látod a saját díjaidat. A még meg nem válaszolt meghívás díja ⏳ jellel látszik, de nem számít bele az összegbe.

1. Minden hónap 1-jén e-mailben megkapod az előző havi **díjösszesítőt**.
2. Ha eltérést találsz, 5-éig jelezd – utána elfogadottnak számít.
3. A számlát 8-áig küldd a penzugy@lumosmotion.com címre. Teljesítés dátuma: a hónap utolsó napja; megjegyzés például: „2026. szeptember – Videofelvétel-készítés”.
4. A kifizetés a számla beérkezésétől számított 8 napon belül történik.

${KK_ERTESIT}

## Gyakori kérdések

**A Google Naptárban rányomtam az „Igen”-re. Ez elég?** Nem. A naptár csak jelzés, a meghívást a Projekttervezőben kell elfogadnod.

**Nem látom a díjamat egy projektnél.** A díj a meghívásnál és a Kifizetések fülön látszik. Ha ott sincs, a díj még nincs rögzítve – szólj a termelési vezetőnek.

**Eltérést találtam a díjösszesítőben.** A hónap 5-éig jelezd válaszlevélben. Utána az összesítő elfogadottnak számít.`,

sales:`# Kézikönyv – Értékesítőknek

Az **Értékesítés** fülön a saját lehetőségeidet kezeled az első érdeklődéstől a fizetésig. Csak a saját ügyleteidet és a saját jutalékodat látod.

Füleid: **Értékesítés, Kifizetések, Beállítások**.

${KK_ALAP}

## A lehetőségek táblája

A lehetőségek oszlopokban sorakoznak: **💡 Új érdeklődő → 📨 Ajánlat kiküldve → ✅ Szerződve → 💰 Díjbekérő fizetve**, mellette **✕ Sikertelen**. A „Díjbekérő fizetve” és a „Sikertelen” oszlop összecsukható.

1. **＋ Új érdeklődő felvétele:** ügyfél, tárgy, esély (%), jegyzetek.
2. **Ajánlat:** az árajánlat kiküldésével a lehetőség magától az „Ajánlat kiküldve” oszlopba kerül.
3. **Szerződés:** ha az ügyfél igent mond, a lehetőségből projekt lesz, és a termelés átveszi.
4. **Fizetés:** amikor a díjbekérőt kifizetik, a lehetőség magától a „Díjbekérő fizetve” oszlopba kerül, és erről értesítést kapsz.
5. **Sikertelen:** ha nem jött össze, add meg röviden, miért nem.

## Árajánlat készítése

1. A lehetőségnél az **📄 Árajánlat készítése** gombbal indul. Az árkalkulátorban összeállítod a tételeket, majd az **Átvétel az árajánlatba →** gombbal viszed át.
2. Több **opciót** is adhatsz (pl. alap és bővített csomag), opciónként saját csomagkedvezménnyel.
3. Az előnézetben látod a kész PDF-et a saját aláírásoddal. A levél a saját címedről megy ki.
4. A félbehagyott ajánlat elmenthető (**📄 Mentett ajánlat folytatása**), egy kiküldöttből pedig az **✏️ Új verzió ebből** gombbal készíthetsz módosítottat.

Minden ár nettó.

## Jutalék és Kifizetések

A **Kifizetések** fülön hónaponként látod a saját jutalékodat projektenként. Ha szakemberként is dolgozol, ugyanitt látod a saját díjaidat is.

## Értesítések

A **Beállítások** fülön (⚙️ Beállítások) beállíthatod, kérsz-e e-mailt és felugró értesítést, amikor az ügyfeled fizet.`,

editor:`# Kézikönyv – Termelési vezetőnek

A termelési vezető viszi a projekteket a szerződéstől az átadásig: összeállítja a stábot és az eszközöket, követi az utómunkát, és kiküldi a videókat jóváhagyásra.

Füleid: **Projektek, Naptár, Stáb, Leltár, Ügyfelek, Kifizetések, Beállítások**.

${KK_ALAP}

## Projektek

A **Projektek** fül tetején a **⚠️ Figyelmeztetések** mutatják, mihez kell még nyúlni (pl. hiányzó stábtag). Alattuk a projektek listája, keresővel.

Egy projekt állapotai sorban: **Tervezés → Helyszíni munka → Utómunka → Videók leadva → Jóváhagyásra vár → Kész**. A projekt oldalán:

- **📋 Alapadatok:** ügyfél, helyszín, időpont. Többnapos rendezvénynél a napok egyenként, saját kezdéssel és végzéssel adhatók meg.
- **👥 Stáb és eszközök:** ki milyen szerepben dolgozik, és milyen eszköz van nála.
- **Stáb-instrukciók:** közös jegyzet a helyszíni csapatnak, e-mail-értesítéssel és hozzászólással.
- **🎞️ Videók:** a megrendelt videók, videónként vágóval és állapottal.

## Stáb összeállítása és meghívások

1. Add hozzá a szakembereket a projekthez, mindenkinek a szerepével (operatőr, vágó, fotós stb.).
2. Az app meghívást küld nekik. A stábkártya kerete mutatja az állapotot: **zöld** elfogadva, **sárga** függőben, **piros** elutasítva.
3. A határidőig meg nem válaszolt meghívás elutasításnak számít. Új szerepkörre külön meghívó megy.
4. Ha valaki elfogadás után visszamondja, e-mailben értesítést kapsz az okával együtt.
5. A stáb véglegesítésekor mindenki megkapja a beosztását (időpont, helyszín, szerep, stáb), az eszközlistát pedig külön küldöd ki.

## Naptár és idővonal

A **Naptár** fülön az összes projekt idővonalon látszik, soronként egy szakemberrel. Minden sávon olvasható a projekt neve oldalra görgetve is; a jóváhagyásra váró videókat homokóra jelzi.

## Stáb, Leltár, Ügyfelek

- **Stáb:** a szakemberek adatlapja – szerepek, elérhetőség, prioritás (1–3), részletek (statív, gimbal, saját kamera stb.). Kártya- és listanézet.
- **Leltár:** az eszközök kategóriánként (kamera, objektív, hang, fény, drón…), állapottal: Üzemképes, Javításra vár, Szervizben, Selejtezett.
- **Ügyfelek:** az ügyfelek és kapcsolattartóik adatai.

## Utómunka és ügyfél-jóváhagyás

1. A videókat kiosztás után a vágó húzza át az **Utómunka alatt**, majd a **Belső ellenőrzés** oszlopba.
2. A belső ellenőrzés után te küldöd tovább az ügyfélnek. Az ügyfél egy linken nézi meg a videót, és ott hagyja jóvá, vagy kér módosítást.
3. **Két díjmentes javítási kör** van. A másodiknál az ügyfél látja, hogy ez az utolsó díjmentes kör; az ezutániakra árajánlat megy, és annak elfogadása után készül a javítás.
4. A videókártyán látszik, hányadik javításnál tart a videó.

## Gyakori kérdések

**Valaki a Google Naptárban „Igen”-t nyomott, de az appban függőben van.** A naptár csak jelzés; az app emlékezteti, hogy a Projekttervezőben fogadja el.

**Valaki nem válaszolt a meghívásra.** A határidő után a meghívás elutasításnak számít – hívj meg mást a helyére.`,

admin:`# Kézikönyv – Ügyvezetőnek

Az ügyvezető mindent lát, amit a termelési vezető, és ezen felül a pénzügyeket, az értékesítést, a szerződéseket és a beállításokat. A projekt értékét (büdzsét) csak ő látja és állítja. A projektek, a stáb, a leltár és az utómunka kezelése a Termelési vezető kézikönyvében van.

${KK_ALAP}

## Értékesítés és Értékesítők

- **Értékesítés:** az összes lehetőség egy táblán, értékesítőnként szűrhetően; az árajánlat ugyanúgy készül, mint az értékesítőknél.
- **Értékesítők:** az értékesítők adatlapja (a Források menüben, a Stáb mellett).

## Pénzügyek

| Fül | Mire való |
| --- | --- |
| Fizetések | hónaponként minden szakember és értékesítő díja és jutaléka; a havi díjösszesítők kiküldése; a kifizetések rögzítése |
| Szerződés és számlázás | ügyfélszerződések sablonból, díjbekérők és számlák, banki tételek párosítása, beérkezett szállítói számlák |
| Bevétel és kiadás | bevételek, kiadások, alapok egyenlege (nyereség, ügyvezető, marketing, eszköz-rezsi), tagi kölcsön |

A Projektek fülön jelennek meg a **jóváhagyásra váró díjcsökkentések** és **keretmódosítások** is: ezekről te döntesz.

## Szerződések a stábbal

A Stáb fülön, a szakember adatlapján a **📄 Szerződések és dokumentumok** rész csak neked látszik.

- **Feltöltés:** húzd rá az aláírt szerződést (PDF, Word vagy kép).
- **📥 Szerződések a Gmailből:** megkeresi a leveleid között az aláírt szerződéseket, és feltölti őket.
- **📝 Új szerződés** (a Stáb fül tetején) vagy **Keretszerződés készítése / küldése** (az adatlapon): az alvállalkozói keretszerződés a szakember adataival töltődik ki. Letöltheted Wordben, vagy a küldőablakban – a szerződés előnézetével – a saját címedről elküldheted. Az elküldött példány a szakember dokumentumai közé kerül.

## Beállítások

- **👤 Hozzáférések:** ki léphet be, milyen szereppel.
- **📧 E-mail értesítések:** milyen leveleket küld az app a szakembereknek, az ügyfeleknek és belülre.
- **📨 Küldés a kollégák saját címéről:** az ajánlatok és szerződések a küldő saját címéről és aláírásával mennek ki.
- **🧾 Napló:** ki mit módosított és mikor.

## Nézetváltás

A névjelvény menüjében megnézheted az appot úgy, ahogy egy szakember látja. Ilyenkor a meghívásoknál nem jelenik meg a díj, a beállításait pedig csak ő változtathatja meg.

A többi szerep kézikönyvét a fenti választóval nézheted meg – azt látod, amit ők.`};

function kkMd(src){const X=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');const L=String(src).split('\n'),out=[];let i=0;
  while(i<L.length){const l=L[i];
    if(!l.trim()){i++;continue;}
    let m;if((m=/^(#{1,3}) (.*)$/.exec(l))){const h=m[1].length+1;out.push(`<h${h}>${X(m[2])}</h${h}>`);i++;continue;}
    if(/^\|/.test(l)){const rows=[];while(i<L.length&&/^\|/.test(L[i]))rows.push(L[i++]);const cells=r=>r.replace(/^\||\|$/g,'').split('|').map(c=>c.trim());
      out.push('<div class="kk-tbl"><table><thead><tr>'+cells(rows[0]).map(c=>`<th>${X(c)}</th>`).join('')+'</tr></thead><tbody>'+rows.slice(2).map(r=>'<tr>'+cells(r).map(c=>`<td>${X(c)}</td>`).join('')+'</tr>').join('')+'</tbody></table></div>');continue;}
    if(/^- /.test(l)){const it=[];while(i<L.length&&/^- /.test(L[i]))it.push(L[i++].slice(2));out.push('<ul>'+it.map(t=>`<li>${X(t)}</li>`).join('')+'</ul>');continue;}
    if(/^\d+\. /.test(l)){const it=[];while(i<L.length&&/^\d+\. /.test(L[i]))it.push(L[i++].replace(/^\d+\. /,''));out.push('<ol>'+it.map(t=>`<li>${X(t)}</li>`).join('')+'</ol>');continue;}
    const p=[];while(i<L.length&&L[i].trim()&&!/^(#|\||- |\d+\. )/.test(L[i]))p.push(L[i++]);out.push(`<p>${X(p.join(' '))}</p>`);}
  return out.join('');}
const kkRole=()=>{const vr=S.me&&S.me.viewAs?(isSales()?'sales':'crew'):'';return vr||(isAdmin()?'admin':isSales()?'sales':ro()?'crew':'editor');};
function kkView(){const own=kkRole(),r=isAdmin()&&!(S.me&&S.me.viewAs)&&KK[S.kkRole]?S.kkRole:own;
  const pick=isAdmin()&&!(S.me&&S.me.viewAs)?`<div class="seg kk-pick" role="group" aria-label="Melyik szerep kézikönyve">${KK_ROLES.map(([k,l])=>`<button type="button" data-action="kk-role" data-r="${k}" aria-pressed="${k===r}">${l}</button>`).join('')}</div>`:'';
  return `${pick}<article class="panel kk-doc">${kkMd(KK[r])}</article>`;}
/* a Beállítások fül két része: ⚙️ Beállítások és 📖 Kézikönyv (ha nincs mit beállítani, csak a kézikönyv) */
function kkWrap(fn,canSet){const on=!canSet||S.kkOn;
  const seg=canSet?`<div class="seg kk-sw" role="group" aria-label="Beállítások vagy kézikönyv"><button type="button" data-action="kk-on" data-v="0" aria-pressed="${!on}">⚙️ Beállítások</button><button type="button" data-action="kk-on" data-v="1" aria-pressed="${on}">📖 Kézikönyv</button></div>`:'';
  if(!on)return seg+fn();
  return `<div class="kk-page">${seg}${kkView()}</div>`;}
ACT['kk-on']=b=>{S.kkOn=b.dataset.v==='1';render(true);};
ACT['kk-role']=b=>{S.kkRole=b.dataset.r;render(true);};
