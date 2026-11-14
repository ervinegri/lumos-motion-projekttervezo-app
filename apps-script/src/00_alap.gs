/**
 * LUMOS MOTION · Projekttervező
 * Google Apps Script – különálló projekt (a Sales App mintájára).
 *
 * A felület a Vercelen fut (FRONTEND_URL), ez a szkript csak a háttér:
 * a felület a webalkalmazás linkjére küldi a kéréseit (doPost).
 *
 * Első indítás: futtasd a setup() függvényt a szerkesztőből, majd
 * Telepítés → Új telepítés → Webalkalmazás (Végrehajtás: én, Hozzáférés: bárki).
 */

/* ===================== BEÁLLÍTÁSOK ===================== */
const SPREADSHEET_ID = '1Jf9nELuauhFEaAxAnfg_dSDG1MudeqfmftqYPqCdif8';   // Projektek / „Lumos Projektkezelő – adatbázis”
const PROJECTS_FOLDER_ID = '1qxSBbudO4atHkdOsfH6ur6oXc_tc9OnB';          // Projektek mappa (alatta évszámos almappák)
const APP_TITLE = 'Lumos Motion Projekttervező';
const FRONTEND_URL = 'https://projekttervezo.lumosmotion.hu';   // a Vercelen futó felület címe (ez kerül a meghívó e-mailekbe)
/* Google-fiókos belépés: a Google Cloud OAuth „Web application” ügyfél azonosítója (nem titkos adat).
   Felülírható a GOOGLE_CLIENT_ID Script Propertyvel. Üresen a Google-belépés ki van kapcsolva. */
const GOOGLE_CLIENT_ID = '236393101415-be2dql04j8msn834o5afad87vib0n54v.apps.googleusercontent.com';
const COMPANY_DOMAIN = 'lumosmotion.com';
/* Belépés csak Google-fiókkal (a PIN-es belépés minden része megszűnt). */
const CALENDAR_ID = 'c_2c50501c805387f783e86998c7afa0a53dcc443aaa73d96e1be5373ecb71d2fd@group.calendar.google.com';   // „Terepi Munkák Lumos Motion” naptár
const MAIL_FROM = 'admin@lumosmotion.com';        // az app leveleinek feladója: Gmail „Küldés másként” alias a szkriptet futtató fiókban
const MAIL_REPLY_TO = 'admin@lumosmotion.com';      // alapértelmezett válaszcím (az eszközlistánál a küldő kolléga címe lesz)
const MAIL_SIGNATURE_HTML = 'Üdvözlettel,<br>Lumos Motion';
const MAIL_SIGNATURE_TEXT = 'Üdvözlettel,\nLumos Motion';
const SHEET_TZ = 'Europe/Budapest';

/** EGYSZERI beállítás a setup() futtatásához: [megjelenő név, szerepkör (admin | editor | crew), e-mail-cím]
 *  Az új felhasználó Google-fiókkal lép be; a program meghívót küld neki. */
const SETUP_USERS = [
  ['Ervin', 'admin', 'ervin.egri@lumosmotion.com']
];

/* ===================== ADATMODELL ===================== */
const STATUSES = ['egyeztetes', 'tervezes', 'helyszin', 'utomunka', 'leadva', 'jovahagyas', 'atadva', 'lemondva'];
const EVENT_TYPES = ['Konferencia', 'Webinárium', 'Csoportos találkozó', 'Céges rendezvény', 'Gála, díjátadó', 'Kiállítás, expo', 'Termékbemutató', 'Sportesemény', 'Koncert', 'Short videó forgatás', 'Reklám', 'Videóvágás', 'Podcast', 'Interjú', 'Egyéb'];
const CREW_ROLES = ['Projektvezető', 'Értékesítő', 'Operatőr', 'Kreatív operatőr', 'Statív operatőr', 'Interjúsarok operatőr', 'Vágó', 'Fotós', 'Drónpilóta', 'Hangtechnikus', 'Fénytechnikus', 'Vizuáltechnikus', 'Képkeverő / streaming', 'Sofőr / rakodó', 'Ajánlói jutalék'];
const CREW_TYPES = ['Belsős', 'Állandó külsős', 'Alkalmi freelancer', 'Bérszámfejtett (munkaviszony / megbízás)'];
const isEmployee_ = c => /^(Alkalmazott|Bérszámfejtett)/.test(String(c && c.type || ''));   // bejelentett munkaviszony: munkabér, nincs számla / díjösszesítő
const CREW_SKILLS = ['Statív', 'Gimbal', 'Előadásvágás', 'Kreatív vágás', 'Werk', 'Saját kamera', 'Eszközbérlés'];
const INV_CATS = ['Kamera', 'Objektív', 'Hang', 'Fény', 'Drón', 'Képkeverés / stream', 'GoPro / akciókamera', 'Gimbal / állvány', 'Akku / powerbank / táp', 'Adathordozó', 'Laptop / tablet / telefon', 'Monitor / nyomtató', 'Kocsi / szállítás', 'Kábel', 'Egyéb'];
const CONDITIONS = ['ok', 'javitas', 'szerviz', 'selejt'];
const COUNTS = { aftermovie: 3, interju: 8, int_sarok: 15, int_resztvevo: 15, short60: 15, short30: 15, short15: 15, er_clips: 20, er_subs: 10, er_summary: 10, er_total_n: 10, er_close_n: 10, er_creative_n: 10, er_post_n: 10, x_foto_n: 10 };
const FLAGS = ['x_vago', 'x_dron', 'x_timelapse', 'x_pov', 'x_foto', 'x_nyersVetel', 'x_nyersTarolas', 'x_rush', 't_eloadas', 't_kepkeveres', 't_hang', 't_feny', 't_vizual',
  'er_total', 'er_close', 'er_crowd', 'er_slides', 'er_drone', 'er_stream', 'er_post', 'er_zoom', 'er_creative', 'i_sarok', 'i_stand'];
const REC_LABELS = { er_total: 'Teljes alakos kamera', er_close: 'Közeli kamera', er_creative: 'Kreatív kamera', er_zoom: 'Közeli (vágói belenagyítással)', er_crowd: 'Közönség kamera', er_slides: 'Diák rögzítése / kivetítése', er_stream: 'Élő kivetítés LED falra vagy projektorra', t_kepkeveres: 'Streaming', er_post: 'Helyszínek előadásainak utómunkája' };

/** Munkalapok és oszlopok. Az oszlopok sorrendjét és nevét ne módosítsd a táblázatban;
 *  új oszlop csak a sor végére kerülhet (a program maga írja be a fejlécet). */
const TABLES = {
  projects: { tab: 'Projektek', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['name', 'Projekt neve'], ['client', 'Ügyfél'], ['eventType', 'Rendezvény típusa'],
    ['venue', 'Helyszín'], ['date', 'Első nap'], ['endDate', 'Utolsó nap'], ['startTime', 'Érkezés'], ['hours', 'Munkaidő (óra)'],
    ['status', 'Állapot'], ['prevStatus', 'Előző állapot'], ['lead', 'Projektfelelős (azonosító)'],
    ['aftermovie', 'Aftermovie (db)'], ['interju', 'Interjú / imázsfilm (db)'], ['short30', 'Short 30–40 mp (db)'], ['short15', 'Short 15–20 mp (db)'],
    ['x_vago', 'Vágó a helyszínen'], ['x_dron', 'Drón + pilóta'], ['x_timelapse', 'Timelapse'], ['x_pov', 'POV'], ['x_foto', 'Profi fotók'],
    ['x_nyersVetel', 'Nyersanyag megvásárlása'], ['x_nyersTarolas', 'Nyersanyag tárolása'], ['x_rush', 'Villámgyors kézbesítés'],
    ['t_eloadas', 'Előadásrögzítés'], ['t_kepkeveres', 'Képkeverés / streaming'], ['t_hang', 'Hangtechnika'], ['t_feny', 'Fénytechnika'],
    ['quotePrice', 'Ajánlati ár (nettó Ft)'], ['contactName', 'Kapcsolattartó'], ['contactPhone', 'Telefon'], ['contactEmail', 'E-mail'],
    ['techPlan', 'Forgatási és technikai terv'], ['notes', 'Jegyzetek'], ['deliveryLink', 'Átadási link'], ['deliveredAt', 'Átadva'],
    ['folderId', 'Drive mappa azonosító'], ['createdAt', 'Létrehozva'], ['updatedAt', 'Módosítva'], ['updatedBy', 'Módosította'],
    ['mutationId', 'Utolsó műveletazonosító'], ['listSentAt', 'Eszközlista kiküldve'], ['listSentTo', 'Eszközlista címzettjei'],
    ['calEventId', 'Naptár esemény azonosító'],
    ['er_total', 'ER: teljes alakos kamera'], ['er_close', 'ER: közeli kamera'], ['er_crowd', 'ER: közönség kamera'], ['er_slides', 'ER: diák rögzítése'],
    ['er_drone', 'ER: drón'], ['er_stream', 'ER: élő közvetítés / élő vágás'], ['er_post', 'ER: előadások utómunkája'], ['er_res', 'ER: felbontás'],
    ['er_clips', 'ER: kivágások (db)'], ['er_subs', 'ER: feliratozás (db)'], ['er_rooms', 'ER: termek száma'],
    ['short60', 'Short 40–60 mp (db)'], ['foto_db', 'Fotók (db)'], ['er_zoom', 'ER: közeli vágói belenagyítással'], ['dueAt', 'Átadási határidő (egyedi)'], ['fees', 'Termelői díjak (JSON)'], ['budgetMode', 'Termelői keret módja'], ['budgetVal', 'Termelői keret (% vagy Ft)'], ['crewNotes', 'Személyes jegyzetek (JSON)'], ['rentals', 'Bérelt eszközök (JSON)'], ['deliveryNotes', 'Átadási észrevételek'], ['siteOk', 'Helyszíni munka rendben'], ['siteReport', 'Helyszíni beszámoló'], ['clientTax', 'Ügyfél adószáma'], ['clientAddress', 'Ügyfél székhelye'], ['t_vizual', 'Vizuáltechnika'], ['penalties', 'Díjcsökkentések (JSON)'], ['er_summary', 'ER: összefoglaló videó (db)'], ['stepsDone', 'Kipipált lépések'], ['dueKept', 'Átadási határidő tartva'], ['crewDays', 'Munkanapok (JSON)'], ['endTime', 'Végzés (kb.)'], ['er_total_n', 'ER: teljes alakos kamerák (db)'], ['er_close_n', 'ER: közeli kamerák (db)'], ['er_creative', 'ER: kreatív kamera'], ['er_creative_n', 'ER: kreatív kamerák (db)'], ['budgetRequest', 'Termelői keret jóváhagyása (JSON)'], ['er_post_n', 'ER: utómunkás termek (db)'], ['x_foto_n', 'Fotósok a helyszínen (db)'], ['crewFinal', 'Csapat véglegesítve (JSON)'], ['leadvaAt', 'Videók leadva (dátum)'], ['payStatus', 'Fizetési állapot'], ['lastStartTime', 'Utolsó nap: érkezés'], ['lastEndTime', 'Utolsó nap: végzés (kb.)'], ['cancelReason', 'Lemondás oka'], ['leadRemote', 'Projektvezető távolról'], ['extras', 'Extra szolgáltatások (JSON, nettó)'], ['editOnsite', 'Helyszíni vágó'], ['rawSentAt', 'Nyersanyag e-mail elküldve'], ['deliveryPass', 'Videó jelszava'], ['int_sarok', 'Interjúsarok videók (db)'], ['int_resztvevo', 'Résztvevői interjúk (db)'], ['i_sarok', 'Interjúsarok (forgatás)'], ['i_stand', 'Interjúztatás a standnál'], ['editTasks', 'Vágói feladatok (JSON)'], ['deliveryLinks', 'További átadási linkek (JSON)'], ['eqFinal', 'Eszközök véglegesítve (JSON)'], ['recRooms', 'Előadásrögzítés termei (JSON)'], ['videos', 'Videók követése (JSON)']] },
  crew: { tab: 'Stáb', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['name', 'Név'], ['roles', 'Szerepek'], ['type', 'Jogviszony'], ['phone', 'Telefon'],
    ['email', 'E-mail'], ['dayRate', 'Napidíj (nettó Ft)'], ['note', 'Megjegyzés'], ['createdAt', 'Létrehozva'], ['updatedAt', 'Módosítva'],
    ['priority', 'Prioritás (1–3)'], ['company', 'Vállalkozás'], ['skills', 'Részletek'], ['vat', 'ÁFA (aam = alanyi adómentes, afa = áfakörös)'], ['tax', 'Adószám'], ['notify', 'Értesítési beállítások (JSON)']] },
  inventory: { tab: 'Leltár', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['name', 'Megnevezés'], ['category', 'Kategória'], ['qty', 'Darab'], ['condition', 'Állapot'],
    ['serial', 'Azonosító / sorozatszám'], ['value', 'Beszerzési érték / db (Ft)'], ['note', 'Megjegyzés'], ['createdAt', 'Létrehozva'], ['updatedAt', 'Módosítva'],
    ['location', 'Tárolási hely'], ['format', 'Szenzorméret (FF / Crop)']] },
  clients: { tab: 'Ügyfelek', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['name', 'Cégnév'], ['tax', 'Adószám'], ['address', 'Székhely'], ['contactName', 'Kapcsolattartó'],
    ['contactPhone', 'Telefon'], ['contactEmail', 'E-mail'], ['note', 'Megjegyzés'], ['createdAt', 'Létrehozva'], ['updatedAt', 'Módosítva'], ['rep', 'Cég képviselője (aláíró)'], ['repPhone', 'Képviselő telefonszáma'], ['repEmail', 'Képviselő e-mail-címe'], ['contactTitle', 'Kapcsolattartó titulusa'], ['repTitle', 'Képviselő titulusa'], ['tigMail', 'TIG e-mail sablon (JSON)'], ['billEmail', 'Pénzügyi e-mail (számla másolat)'], ['vidMail', 'Videó jóváhagyás e-mail sablon']] },
  finIncome: { tab: 'Bevételek', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['month', 'Hónap'], ['day', 'Nap'], ['name', 'Megnevezés'], ['payStatus', 'Fizetési állapot'], ['amount', 'Díjazás (nettó Ft)'],
    ['prod', 'Termelési költség (Ft)'], ['profit', 'Nyereség (Ft)'], ['ceo', 'Ügyvezető (Ft)'], ['rezsi', 'Eszköz, rezsi (Ft)'], ['marketing', 'Marketing (Ft)'],
    ['legacy', 'Régi táblázatból'], ['note', 'Megjegyzés'], ['people', 'Szakemberek (régi)']] },
  finExpense: { tab: 'Kiadások', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['name', 'Megnevezés'], ['fund', 'Alap (rezsi / marketing)'], ['kind', 'Típus (fix / egyszeri)'], ['month', 'Hónap (egyszeri)'],
    ['from', 'Ettől (fix)'], ['to', 'Eddig (fix)'], ['amount', 'Összeg (Ft)'], ['legacy', 'Régi táblázatból'], ['note', 'Megjegyzés']] },
  finLoan: { tab: 'Tagi kölcsön', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['date', 'Dátum'], ['kind', 'Befizetés / visszafizetés'], ['amount', 'Összeg (Ft)'], ['note', 'Megjegyzés'], ['bank', 'Bank'], ['bank2', 'Másik számla (honnan / hova)']] },
  finInvoice: { tab: 'Számlák', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['no', 'Számlaszám'], ['kind', 'Típus (szamla / dijbekero)'], ['projectId', 'Projekt azonosító'], ['incomeId', 'Bevételi sor azonosító'],
    ['buyer', 'Vevő'], ['date', 'Kelt'], ['due', 'Fizetési határidő'], ['invNet', 'Nettó (Ft)'], ['invGross', 'Bruttó (Ft)'], ['invPaid', 'Kifizetve (Ft)'],
    ['paidAt', 'Kifizetés dátuma'], ['payMethod', 'Fizetési mód'], ['createdAt', 'Rögzítve'], ['createdBy', 'Rögzítette'], ['checkedAt', 'Utoljára ellenőrizve'], ['note', 'Megjegyzés'], ['items', 'Tételek (JSON)'], ['ref', 'Kapcsolódó bizonylat'], ['projectIds', 'További projektek (közös számla)'], ['tigId', 'TIG azonosító'], ['manual', 'Kézi rögzítés (1)'], ['issuer', 'Kiállító (kft / ev)'], ['fileUrl', 'Bizonylat fájl (link)'], ['advType', 'Előleg típusa (elolegszamla = levonható előlegszámla / szamla = díjbekérő alapján sima számla)']] },
  finTig: { tab: 'Teljesítésigazolások', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['client', 'Ügyfél'], ['month', 'Hónap'], ['issuer', 'Szolgáltató'], ['projectIds', 'Projektek'], ['rows', 'Tételek (JSON)'], ['total', 'Összesen (nettó Ft)'],
    ['url', 'PDF (link)'], ['fileName', 'Fájlnév'], ['status', 'Állapot (kikuldve / jovahagyva / szamlazva)'], ['approvedAt', 'Jóváhagyva'], ['invoiceNo', 'Számlaszám'], ['createdAt', 'Rögzítve'], ['createdBy', 'Rögzítette'], ['clientAddress', 'Megrendelő címe'], ['clientTax', 'Megrendelő adószáma'], ['fileId', 'Drive-fájl azonosító'], ['sentAt', 'E-mailben elküldve'], ['sentTo', 'Címzett']] },
  finBilling: { tab: 'Szerződések', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['projectId', 'Projekt azonosító'], ['contractStatus', 'Szerződés állapota'], ['contractUrl', 'Szerződés (link)'], ['contractName', 'Szerződés fájlneve'],
    ['contractFileId', 'Drive-fájl azonosító'], ['contractAt', 'Feltöltve'], ['contractBy', 'Feltöltötte'], ['mode', 'Konstrukció (eloleg / egyben)'], ['advancePct', 'Foglaló (%)'],
    ['poNumber', 'Megrendelésszám / PO'], ['note', 'Megjegyzés'], ['updatedAt', 'Módosítva'], ['updatedBy', 'Módosította'], ['signedAt', 'Aláírás dátuma'],
    ['ceoPct', 'Értékesítés % (egyedi)'], ['rezsiPct', 'Eszköz, rezsi % (egyedi)'], ['noFinal', 'Végszámla nem kell (1)'], ['tigMode', 'TIG (kell / nemkell / üres = ügyfél szerint)'], ['mktProject', 'Saját marketing projekt (1)'], ['watermark', 'Vízjel a videókon (1 / 0 / üres = Sales App szerint)']] },
  finFramework: { tab: 'Keretszerződések', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['client', 'Ügyfél'], ['url', 'Szerződés (link)'], ['fileName', 'Fájlnév'], ['fileId', 'Drive-fájl azonosító'],
    ['signedAt', 'Aláírás dátuma'], ['validTo', 'Érvényes eddig'], ['note', 'Megjegyzés'], ['createdAt', 'Rögzítve'], ['createdBy', 'Rögzítette'], ['mode', 'Típus (üres = keretszerződés, nemkell = nem igényel)']] },
  payStatus: { tab: 'Számlák és kifizetések', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['month', 'Hónap'], ['crewId', 'Munkatárs azonosító'], ['crewName', 'Munkatárs'], ['invoicedAt', 'Számlát kiállította'], ['invoicedBy', 'Rögzítette (számla)'], ['paidAt', 'Számla fizetve'], ['paidBy', 'Rögzítette (fizetés)'], ['invoiceNo', 'Számlaszám (NAV)'], ['invoiceNet', 'Számla nettó (NAV)'], ['invoiceTax', 'Szállító adószáma (NAV)'], ['invoiceMatch', 'Összeg egyezik (ok / diff)']] },
  paySent: { tab: 'Díjösszesítők', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['month', 'Hónap'], ['crewId', 'Munkatárs azonosító'], ['crewName', 'Munkatárs'], ['email', 'E-mail'], ['amount', 'Kifizetendő (nettó Ft)'], ['sentAt', 'Kiküldve'], ['sentBy', 'Küldte'], ['subject', 'Tárgy'], ['html', 'A kiküldött levél (HTML)']] },
  payAdjust: { tab: 'Fizetési korrekciók', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['month', 'Hónap'], ['crewId', 'Munkatárs azonosító'], ['crewName', 'Munkatárs'], ['amount', 'Korrekció (nettó Ft, + / −)'], ['note', 'Megjegyzés'], ['updatedAt', 'Módosítva'], ['updatedBy', 'Módosította']] },
  deals: { tab: 'Értékesítés', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['title', 'Megnevezés'], ['client', 'Ügyfél'], ['contactName', 'Kapcsolattartó'], ['contactEmail', 'E-mail'], ['contactPhone', 'Telefon'],
    ['eventType', 'Rendezvény típusa'], ['venue', 'Helyszín'], ['eventDate', 'Rendezvény dátuma'], ['value', 'Várható érték (nettó Ft)'], ['stage', 'Szakasz'], ['chance', 'Esély (%)'],
    ['source', 'Forrás'], ['nextStep', 'Következő lépés'], ['nextDate', 'Következő lépés dátuma'], ['ownerId', 'Értékesítő azonosító'], ['ownerName', 'Értékesítő'],
    ['note', 'Megjegyzés'], ['lostReason', 'Elvesztés oka'], ['projectId', 'Projekt azonosító'], ['wonAt', 'Szerződve'], ['closedAt', 'Lezárva'],
    ['createdAt', 'Létrehozva'], ['createdBy', 'Létrehozta'], ['updatedAt', 'Módosítva'], ['updatedBy', 'Módosította'], ['commPct', 'Jutalék (%)'], ['commAmt', 'Jutalék (Ft)'], ['services', 'Szóba jövő szolgáltatások'], ['commManual', 'Jutalék kézzel (%)'], ['commAuto', 'Jutalék automatikusan (Sales App)'], ['contactEmail2', 'Másodlagos e-mail']] },   // új oszlop mindig a végére
  officeRent: { tab: 'Irodabérlet', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['crewId', 'Munkatárs azonosító'], ['crewName', 'Munkatárs'], ['month', 'Hónap'], ['amount', 'Irodabérleti díj (nettó Ft)'], ['updatedAt', 'Módosítva'], ['updatedBy', 'Módosította']] },
  crewDocs: { tab: 'Munkatársi szerződések', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['crewId', 'Munkatárs azonosító'], ['crewName', 'Munkatárs'], ['title', 'Megnevezés'], ['fileName', 'Fájlnév'], ['fileId', 'Drive-fájl azonosító'],
    ['mime', 'Fájltípus'], ['signedAt', 'Aláírás dátuma'], ['note', 'Megjegyzés'], ['createdAt', 'Feltöltve'], ['createdBy', 'Feltöltötte']] },
  crewAssign: { tab: 'Stábbeosztás', assign: true, cols: [
    ['projectId', 'Projekt azonosító'], ['crewId', 'Munkatárs azonosító'], ['role', 'Szerep'], ['projectName', 'Projekt'], ['crewName', 'Munkatárs']] },
  eqAssign: { tab: 'Eszközbeosztás', assign: true, cols: [
    ['projectId', 'Projekt azonosító'], ['itemId', 'Eszköz azonosító'], ['qty', 'Darab'], ['projectName', 'Projekt'], ['itemName', 'Eszköz'],
    ['crewId', 'Felelős azonosító'], ['crewName', 'Felelős (kinél van)']] }
};
const NUM_FIELDS = new Set(['budgetVal', 'er_rooms', 'er_clips', 'er_subs', 'er_summary', 'er_total_n', 'er_close_n', 'er_creative_n', 'er_post_n', 'x_foto_n', 'priority', 'hours', 'aftermovie', 'interju', 'int_sarok', 'int_resztvevo', 'short60', 'short30', 'short15', 'foto_db', 'quotePrice', 'dayRate', 'qty', 'value', 'amount', 'prod', 'profit', 'ceo', 'rezsi', 'marketing', 'invNet', 'invGross', 'invPaid', 'advancePct']);
const BOOL_FIELDS = new Set(FLAGS.concat(['legacy', 'leadRemote', 'editOnsite']));
const DATE_FIELDS = new Set(['date', 'endDate', 'deliveredAt', 'dueAt']);
const CONDITION_LABELS = { ok: 'Üzemképes', javitas: 'Javításra vár', szerviz: 'Szervizben', selejt: 'Selejtezett' };
const STATUS_LABELS = { egyeztetes: 'Egyeztetés', tervezes: 'Tervezés', helyszin: 'Helyszíni munka', utomunka: 'Utómunka', leadva: 'Videók leadva', jovahagyas: 'Jóváhagyásra vár', atadva: 'Kész', lemondva: 'Lemondva' };
const ID_RE = /^[A-Za-z0-9-]{8,64}$/;
/** Megszólítás: a (magyar sorrendű) név első keresztneve – „Gál Norbert Sándor” → Norbert, „Dr. Kiss Anna” → Anna. */
function huFirst_(n) { const w = String(n || '').replace(/\([^)]*\)/g, ' ').split(',')[0].trim().split(/\s+/).filter(x => x && !/^(dr|prof|ifj|id|özv|med|habil)\.?$/i.test(x)); return w.length > 1 ? w[1] : w[0] || ''; }

/* ===================== WEBALKALMAZÁS ===================== */
function doGet(e) {
  if (e && e.parameter && e.parameter.p) return api_(e.parameter.p);
  return ContentService.createTextOutput(JSON.stringify({ ok: true, app: APP_TITLE, frontend: FRONTEND_URL }))
    .setMimeType(ContentService.MimeType.JSON);
}

/** A felület kérései: GET ?p=... (rövid kérések) vagy POST törzs (hosszú kérések). Tartalom: { fn, args }. */
function doPost(e) {
  if (e && e.parameter && e.parameter.ipn) return szIpn_(e);   // számlázz.hu fizetési értesítés (IPN)
  return api_((e && e.postData && e.postData.contents) || '{}');
}

function api_(raw) {
  let out;
  try {
    const body = JSON.parse(raw || '{}');
    const fn = String(body.fn || ''), args = Array.isArray(body.args) ? body.args : [];
    let data;
    if (fn === 'rpc') data = rpc(args[0], args[1], args[2]);
    else if (fn === 'googleLogin') data = googleLogin(args[0]);
    else if (fn === 'clientInfo') data = clientInfo_(args[0], args[1] !== 'preview' && !staffTok_(args[3]), args[2]);   // bejelentkezett csapattag megnyitása nem számít az ügyfél megnyitásának   // nyilvános: az ügyfél jóváhagyó oldala (aláírt kulccsal)
    else if (fn === 'clientDecide') data = clientDecide_(args[0], args[1], args[2], args[3]);
    else if (fn === 'arkPrices') data = arkPrices_();   // nyilvános: az árkalkulátorok (kalkulator.lumosmotion.hu) árai
    else throw new Error('Ismeretlen művelet.');
    out = { ok: true, data: data === undefined ? null : data };
    if (DB_) dbFlush_();
  } catch (err) {
    try { if (DB_) { Object.keys(DB_.sheets).forEach(k => { DB_.sheets[k].dirty = false; }); dbFlush_(); } } catch (e2) { }   // hibánál a félkész módosításokat eldobjuk, csak a napló megy
    out = { ok: false, error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/* ===================== ADATBÁZIS (Neon Postgres) =====================
   Ha a DB_MODE szkripttulajdonság „neon” és a NEON_URL be van állítva, a munkalapok helyett a Neon adatbázist használjuk.
   A program többi része ugyanúgy „munkalapokkal” dolgozik: ezek itt memóriabeli másolatok (NSheet_), amelyeket egyetlen
   lekérdezés tölt be, és a dbFlush_() egyetlen tranzakcióval ír vissza. Zárolás alatt mindig friss adatból dolgozunk. */
const DB_MODE_PROPERTY = 'DB_MODE', NEON_URL_PROPERTY = 'NEON_URL';
let DB_ = null;   // { url, sheets: {tab: NSheet_}, loaded: bool }
function dbOn_() {
  if (DB_) return true;
  try {
    const P = PropertiesService.getScriptProperties();
    if (P.getProperty(DB_MODE_PROPERTY) !== 'neon') return false;
    DB_ = { url: P.getProperty(NEON_URL_PROPERTY) || '', sheets: {}, loaded: false };   // NEON_URL nélkül a Vercel-közvetítőn át
    return true;
  } catch (e) { return false; }
}
function neonUrl_() { return PropertiesService.getScriptProperties().getProperty(NEON_URL_PROPERTY) || ''; }
/** Neon SQL HTTP-n keresztül (a hivatalos „serverless driver” végpontja). list: [{query, params}] → eredmények. */
const DB_PROXY_URL = FRONTEND_URL.replace(/\/$/, '') + '/api/sql';   // a jelszó a Vercelen van (DATABASE_URL); az Apps Script a saját Google-tokenjével hitelesít
function neonSql_(list, url) {
  url = url || (DB_ && DB_.url) || neonUrl_();
  const single = list.length === 1;
  const payload = JSON.stringify(single ? { query: list[0].query, params: list[0].params || [] } : { queries: list.map(q => ({ query: q.query, params: q.params || [] })) });
  let res;
  if (url) {   // közvetlen kapcsolat (ha a NEON_URL szkripttulajdonság be van állítva)
    const m = /^postgres(?:ql)?:\/\/[^@]+@([^/:?]+)/.exec(String(url));
    if (!m) throw new Error('A NEON_URL nem érvényes Postgres-cím.');
    res = UrlFetchApp.fetch('https://' + m[1] + '/sql', { method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: payload,
      headers: { 'Neon-Connection-String': url, 'Neon-Raw-Text-Output': 'true', 'Neon-Array-Mode': 'true' } });
  } else {
    res = UrlFetchApp.fetch(DB_PROXY_URL, { method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: payload, headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } });
  }
  const code = res.getResponseCode(), txt = res.getContentText();
  if (code !== 200) { let msg = txt; try { msg = JSON.parse(txt).message || txt; } catch (e) { } throw new Error('Adatbázis-hiba (' + code + '): ' + String(msg).slice(0, 300)); }
  const j = JSON.parse(txt);
  return single ? [j] : (j.results || []);
}
function dbSchema_(url) {
  neonSql_([
    { query: 'CREATE TABLE IF NOT EXISTS lpm_sheet (tab text PRIMARY KEY, rows jsonb NOT NULL, ver bigint NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now())' },
    { query: 'CREATE TABLE IF NOT EXISTS lpm_log (id bigserial PRIMARY KEY, at text, who text, role text, action text, subject text, details text)' }
  ], url);
}
/* Memóriabeli munkalap: a Google Sheets API általunk használt részét valósítja meg */
function NSheet_(tab, rows) { this.tab = tab; this.v = rows || []; this.cols = this.v.reduce((m, r) => Math.max(m, r.length), 0); this.dirty = false; this.isNew = false; }
NSheet_.prototype.getName = function () { return this.tab; };
NSheet_.prototype.getLastRow = function () { for (let i = this.v.length - 1; i >= 0; i--) { const r = this.v[i] || []; if (r.some(x => x !== '' && x !== null && x !== undefined)) return i + 1; } return 0; };
NSheet_.prototype.getMaxRows = function () { return Math.max(this.v.length, 1); };
NSheet_.prototype.getMaxColumns = function () { return Math.max(this.cols, 1); };
NSheet_.prototype.insertColumnsAfter = function (c, n) { this.cols = Math.max(this.cols, c + n); this.dirty = true; return this; };
NSheet_.prototype.deleteColumns = function (c, n) { this.cols = Math.min(this.cols, c - 1); this.v.forEach(r => { if (r.length > c - 1) r.length = c - 1; }); this.dirty = true; return this; };
NSheet_.prototype.setFrozenRows = function () { return this; };
NSheet_.prototype.protect = function () { const o = { setDescription: () => o, setWarningOnly: () => o }; return o; };
NSheet_.prototype.deleteRow = function (r) { this.v.splice(r - 1, 1); this.dirty = true; return this; };
NSheet_.prototype.getRange = function (r, c, nr, nc) { return new NRange_(this, r, c, nr || 1, nc || 1); };
NSheet_.prototype.getDataRange = function () { return new NRange_(this, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.cols)); };
function NRange_(sh, r, c, nr, nc) { this.sh = sh; this.r = r; this.c = c; this.nr = nr; this.nc = nc; }
NRange_.prototype.getValues = function () { const out = []; for (let i = 0; i < this.nr; i++) { const row = this.sh.v[this.r - 1 + i] || [], o = []; for (let j = 0; j < this.nc; j++) { const x = row[this.c - 1 + j]; o.push(x === null || x === undefined ? '' : x); } out.push(o); } return out; };
NRange_.prototype.getDisplayValues = function () { return this.getValues().map(r => r.map(x => x === true ? 'TRUE' : x === false ? 'FALSE' : String(x))); };
NRange_.prototype.getValue = function () { return this.getValues()[0][0]; };
NRange_.prototype.setValues = function (vals) {
  const sh = this.sh;
  for (let i = 0; i < vals.length; i++) { const ri = this.r - 1 + i; while (sh.v.length <= ri) sh.v.push([]); const row = sh.v[ri];
    for (let j = 0; j < vals[i].length; j++) { const ci = this.c - 1 + j; while (row.length < ci) row.push(''); row[ci] = vals[i][j] instanceof Date ? Utilities.formatDate(vals[i][j], SHEET_TZ, 'yyyy-MM-dd HH:mm:ss') : vals[i][j]; } }
  sh.cols = Math.max(sh.cols, this.c - 1 + (vals[0] ? vals[0].length : 0)); sh.dirty = true; return this; };
NRange_.prototype.setValue = function (x) { return this.setValues([[x]]); };
NRange_.prototype.clearContent = function () { const blank = []; for (let i = 0; i < this.nr; i++) { const r = []; for (let j = 0; j < this.nc; j++) r.push(''); blank.push(r); } return this.setValues(blank); };
['setNumberFormat', 'setFontWeight', 'setBackground'].forEach(k => { NRange_.prototype[k] = function () { return this; }; });
/* Memóriabeli „táblázat” */
const NSS_ = {
  getSheetByName: function (name) { dbLoad_(); return DB_.sheets[name] || null; },
  insertSheet: function (name) { dbLoad_(); const s = new NSheet_(name, []); s.isNew = true; s.dirty = true; DB_.sheets[name] = s; return s; },
  getSheets: function () { dbLoad_(); return Object.keys(DB_.sheets).map(k => DB_.sheets[k]); },
  deleteSheet: function () { },
  getId: function () { return SPREADSHEET_ID; },
  getUrl: function () { return 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/edit'; }
};
/** Betöltés (vagy frissítés zárolás után): a meglévő munkalap-objektumokat helyben frissítjük, hogy a korábban átadott hivatkozások is friss adatot lássanak. */
/* Adatforgalom-takarékos betöltés: a Neonból csak a táblák verziószámát kérjük le (pár bájt), a tartalmat a Google
   gyorsítótárából vesszük, ha ugyanaz a verzió már ott van; csak a megváltozott táblák jönnek le az adatbázisból. */
const TABC_ = 'nt2_', TABC_CH_ = 30000;
function tabCacheGet_(tab, ver) { try { const C = CacheService.getScriptCache(), k = TABC_ + tab + '_' + ver, n = Number(C.get(k + '_n') || 0); if (!n) return null;
  const keys = []; for (let i = 0; i < n; i++) keys.push(k + '_' + i); const m = C.getAll(keys); let str = ''; for (let i = 0; i < n; i++) { const x = m[k + '_' + i]; if (x == null) return null; str += x; } return str; } catch (e) { return null; } }
function tabCachePut_(tab, ver, str) { try { const C = CacheService.getScriptCache(), k = TABC_ + tab + '_' + ver, n = Math.ceil(str.length / TABC_CH_) || 1, o = {};
  for (let i = 0; i < n; i++) o[k + '_' + i] = str.slice(i * TABC_CH_, (i + 1) * TABC_CH_); o[k + '_n'] = String(n); C.putAll(o, 21600); } catch (e) { } }
function dbLoad_(force) {
  if (DB_.loaded && !force) return;
  const vers = (neonSql_([{ query: 'SELECT tab, ver::text FROM lpm_sheet' }])[0].rows || []), have = {}, need = [];
  vers.forEach(x => { const str = tabCacheGet_(x[0], x[1]); if (str != null) have[x[0]] = str; else need.push(x[0]); });
  const rows0 = vers.filter(x => have[x[0]] != null).map(x => [x[0], have[x[0]]]);
  if (need.length) (neonSql_([{ query: 'SELECT tab, ver::text, rows::text FROM lpm_sheet WHERE tab = ANY(string_to_array($1, chr(31)))', params: [need.join(String.fromCharCode(31))] }])[0].rows || []).forEach(x => { tabCachePut_(x[0], x[1], x[2] || '[]'); rows0.push([x[0], x[2]]); });
  const r = { rows: rows0 };
  const seen = {};
  (r.rows || []).forEach(row => { const tab = row[0], rows = JSON.parse(row[1] || '[]'); seen[tab] = 1;
    if (DB_.sheets[tab]) { const s = DB_.sheets[tab]; s.v = rows; s.cols = rows.reduce((m, x) => Math.max(m, x.length), 0); s.dirty = false; s.isNew = false; }
    else DB_.sheets[tab] = new NSheet_(tab, rows); });
  Object.keys(DB_.sheets).forEach(tab => { if (!seen[tab] && !DB_.sheets[tab].dirty) { DB_.sheets[tab].v = []; DB_.sheets[tab].cols = 0; } });
  DB_.loaded = true;
}
/** A módosított munkalapok visszaírása egy tranzakcióban. Munkalap-módban a Google-táblázat flush-a. */
function dbFlush_() {
  if (!dbOn_()) { SpreadsheetApp.flush(); scBump_(); return; }
  const dirty = Object.keys(DB_.sheets).map(k => DB_.sheets[k]).filter(s => s.dirty), logs = DB_.pendingLog || [];
  if (!dirty.length && !logs.length) return;
  DB_.pendingLog = [];
  neonSql_(logs.map(r => ({ query: 'INSERT INTO lpm_log (at, who, role, action, subject, details) VALUES ($1,$2,$3,$4,$5,$6)', params: r })).concat(dirty.map(s => { const n = s.getLastRow(), rows = s.v.slice(0, n).map(r => (r || []).slice(0, Math.max(s.cols, 1)).map(x => x === undefined || x === null ? '' : x));
    s._json = JSON.stringify(rows); return { query: 'INSERT INTO lpm_sheet (tab, rows, ver, updated_at) VALUES ($1, $2::jsonb, 1, now()) ON CONFLICT (tab) DO UPDATE SET rows = EXCLUDED.rows, ver = lpm_sheet.ver + 1, updated_at = now() RETURNING tab, ver::text', params: [s.tab, s._json] }; }))).forEach(res => { try { const x = res && res.rows && res.rows[0]; if (!x) return; const s = DB_.sheets[x[0]]; if (s && s._json) tabCachePut_(x[0], x[1], s._json); } catch (e) { } });   // a most írt tábla rögtön a gyorsítótárba (a következő olvasás nem tölti le)
  dirty.forEach(s => { s.dirty = false; s.isNew = false; });
}
/* Napló az adatbázisban (csak hozzáfűzés; a lista az utolsó 300 bejegyzés) */
function dbLog_(row) { (DB_.pendingLog = DB_.pendingLog || []).push(row.map(x => String(x == null ? '' : x))); }   // a napló a következő mentéssel együtt megy (a kérés végén mindenképp kiírjuk)
function dbGetLog_() { const r = neonSql_([{ query: 'SELECT at, who, role, action, subject, details FROM lpm_log ORDER BY id DESC LIMIT 600' }])[0]; return (r.rows || []).map(x => ({ at: x[0], who: x[1], role: x[2], action: x[3], subject: x[4], details: x[5] })); }

/** Kapcsolat-teszt (ügyvezető): elérhető-e az adatbázis, és mennyi idő egy lekérdezés. */
function dbPing_() {
  const url = neonUrl_();
  const t0 = Date.now(); dbSchema_(url); const t1 = Date.now();
  const r = neonSql_([{ query: 'SELECT count(*)::text, coalesce(max(updated_at)::text, \'\') FROM lpm_sheet' }], url)[0];
  return { ok: true, via: url ? 'közvetlen' : 'Vercel', account: Session.getEffectiveUser().getEmail(), schemaMs: t1 - t0, queryMs: Date.now() - t1, tables: Number((r.rows[0] || [])[0] || 0), lastWrite: (r.rows[0] || [])[1] || '', mode: PropertiesService.getScriptProperties().getProperty(DB_MODE_PROPERTY) || 'sheet' };
}
/** Átköltöztetés: a Google-táblázat összes munkalapja (és a napló) az adatbázisba. Újra futtatható (felülír). */
function dbMigrate_(u) {
  const url = neonUrl_();
  dbSchema_(url);
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID), out = {};
  const conv = v => v instanceof Date ? Utilities.formatDate(v, SHEET_TZ, (v.getHours() || v.getMinutes() || v.getSeconds()) ? 'yyyy-MM-dd HH:mm:ss' : 'yyyy-MM-dd') : v;
  return withLock_(() => {
    const qs = [];
    Object.keys(TABLES).forEach(k => {
      const sh = ss.getSheetByName(TABLES[k].tab); if (!sh) return;
      const n = sh.getLastRow(), nc = Math.max(sh.getLastColumn(), TABLES[k].cols.length);
      const rows = n ? sh.getRange(1, 1, n, nc).getValues().map(r => r.map(conv)) : [];
      out[TABLES[k].tab] = Math.max(0, rows.length - 1);
      qs.push({ query: 'INSERT INTO lpm_sheet (tab, rows, ver, updated_at) VALUES ($1, $2::jsonb, 1, now()) ON CONFLICT (tab) DO UPDATE SET rows = EXCLUDED.rows, ver = lpm_sheet.ver + 1, updated_at = now()', params: [TABLES[k].tab, JSON.stringify(rows)] });
    });
    for (let i = 0; i < qs.length; i += 4) neonSql_(qs.slice(i, i + 4), url);
    const lg = ss.getSheetByName(LOG_TAB);
    if (lg && lg.getLastRow() > 1) {
      const L = lg.getRange(2, 1, lg.getLastRow() - 1, LOG_HEADERS.length).getDisplayValues();
      neonSql_([{ query: 'TRUNCATE lpm_log' }], url);
      for (let i = 0; i < L.length; i += 2000) neonSql_([{ query: 'INSERT INTO lpm_log (at, who, role, action, subject, details) SELECT x->>0, x->>1, x->>2, x->>3, x->>4, x->>5 FROM jsonb_array_elements($1::jsonb) AS x', params: [JSON.stringify(L.slice(i, i + 2000))] }], url);
      out[LOG_TAB] = L.length;
    }
    if (u) logEvent_(u, 'Adatbázis', 'Átköltöztetés', JSON.stringify(out));
    return { ok: true, copied: out };
  });
}
/** Átkapcsolás: 'neon' vagy 'sheet'. Neonra kapcsoláskor előtte friss átköltöztetés (ha a felület kéri). */
function dbSetMode_(u, a) {
  const mode = a && a.mode === 'neon' ? 'neon' : 'sheet';
  let mig = null;
  if (mode === 'neon' && a.migrate) mig = dbMigrate_(u);
  if (mode === 'sheet' && dbOn_() && a.backup !== false) dbBackup_();   // visszakapcsoláskor a friss adatok a táblázatba
  PropertiesService.getScriptProperties().setProperty(DB_MODE_PROPERTY, mode);
  try { if (mode === 'neon') installBackupTrigger(); } catch (e) { Logger.log('Mentési időzítő: ' + e); }
  dataBump_();
  return { mode: mode, migrated: mig };
}
/** Biztonsági mentés: az adatbázis tartalma vissza a Google-táblázatba (éjszakánként és visszakapcsoláskor). */
function dbBackup_() {
  const url = neonUrl_();
  const r = neonSql_([{ query: 'SELECT tab, rows::text FROM lpm_sheet' }], url)[0], ss = SpreadsheetApp.openById(SPREADSHEET_ID), out = {};
  (r.rows || []).forEach(row => {
    const tab = row[0], rows = JSON.parse(row[1] || '[]'); if (!rows.length) return;
    let sh = ss.getSheetByName(tab); if (!sh) sh = ss.insertSheet(tab);
    const nc = rows.reduce((m, x) => Math.max(m, x.length), 1), data = rows.map(x => { const o = x.slice(0, nc); while (o.length < nc) o.push(''); return o; });
    if (sh.getMaxColumns() < nc) sh.insertColumnsAfter(sh.getMaxColumns(), nc - sh.getMaxColumns());
    const last = sh.getLastRow(); if (last > data.length) sh.getRange(data.length + 1, 1, last - data.length, sh.getMaxColumns()).clearContent();
    const rg = sh.getRange(1, 1, data.length, nc); rg.setNumberFormat('@'); rg.setValues(data); out[tab] = data.length - 1;
  });
  SpreadsheetApp.flush();
  return { ok: true, tables: out, at: now_() };
}
/* Éjszakai mentés (időzített futás, 2–3 óra között) */
function dbNightlyBackup() { if (PropertiesService.getScriptProperties().getProperty(DB_MODE_PROPERTY) === 'neon') dbBackup_(); }
function installBackupTrigger() {
  if (ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'dbNightlyBackup')) return;
  ScriptApp.newTrigger('dbNightlyBackup').timeBased().atHour(2).everyDays(1).inTimezone(SHEET_TZ).create();
}

/* ===================== TÁBLÁZAT-RÉTEG ===================== */
let SS_CACHE_ = null;
function ss_() { if (dbOn_()) return NSS_; return SS_CACHE_ || (SS_CACHE_ = SpreadsheetApp.openById(SPREADSHEET_ID)); }

const SHEET_MEMO_ = {};   // egy futáson belül a munkalapot és a fejléc-ellenőrzést nem ismételjük (gyorsabb mentés)
function sheetFor_(key) {
  if (SHEET_MEMO_[key]) return SHEET_MEMO_[key];
  const t = TABLES[key];
  const ss = ss_();
  let sh = ss.getSheetByName(t.tab);
  if (!sh) sh = ss.insertSheet(t.tab);
  ensureHeader_(sh, t.cols.map(c => c[1]), t.tab);
  return (SHEET_MEMO_[key] = sh);
}

/** A táblázat 10 millió cellás korlátjába az üres oszlopok is beleszámítanak, ezért a használt oszlopok utáni
    üres oszlopokat töröljük (csak ha teljesen üresek; új oszlop szükség esetén magától visszakerül). */
function trimEmptyCols_(sh, used) {
  const max = sh.getMaxColumns(), extra = max - used;
  if (extra <= 0) return;
  try {
    const rows = Math.max(1, sh.getLastRow());
    const vals = sh.getRange(1, used + 1, rows, extra).getValues();
    let keep = 0;   // a jobb szélről csak az üres oszlopokat vesszük el
    vals.forEach(r => r.forEach((v, j) => { if (v !== '' && v !== null && j + 1 > keep) keep = j + 1; }));
    if (keep < extra) sh.deleteColumns(used + keep + 1, extra - keep);
  } catch (e) { Logger.log('Oszlop-takarítás kihagyva: ' + e); }
}
/* Átnevezett oszlopcímek: a régi címet elfogadjuk, és az újra cseréljük (az oszlop tartalma ugyanaz). */
const HEADER_ALIASES_ = { 'Foglaló (%)': ['Előleg (%)'] };
function ensureHeader_(sh, labels, tabName) {
  if (sh.getMaxColumns() < labels.length) sh.insertColumnsAfter(sh.getMaxColumns(), labels.length - sh.getMaxColumns());
  trimEmptyCols_(sh, labels.length);
  const range = sh.getRange(1, 1, 1, labels.length);
  const first = range.getDisplayValues()[0];
  let changed = false;
  labels.forEach((h, i) => {
    if (first[i] && first[i] !== h && (HEADER_ALIASES_[h] || []).indexOf(first[i]) >= 0) { changed = true; return; }
    if (first[i] && first[i] !== h) throw new Error('A(z) „' + tabName + '” munkalap ' + (i + 1) + '. oszlopa „' + first[i] + '”, de „' + h + '” kellene. Ne nevezd át és ne rendezd át az oszlopokat.');
    if (!first[i]) changed = true;
  });
  if (changed) {
    range.setValues([labels]).setFontWeight('bold').setBackground('#e8f2ec');
    sh.setFrozenRows(1);
  }
}

function cell_(v) {
  const t = String(v == null ? '' : v);
  return /^[=+\-@]/.test(t) ? "'" + t : t;   // képletbeszúrás ellen
}

function fromRow_(t, r) {
  const o = {};
  t.cols.forEach((c, i) => {
    const k = c[0];
    let v = r[i];
    if (v instanceof Date) v = Utilities.formatDate(v, SHEET_TZ, DATE_FIELDS.has(k) ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm:ss');
    if (v == null) v = '';
    if (NUM_FIELDS.has(k)) { const s = String(v).trim().replace(/\s/g, ''); v = s === '' || isNaN(Number(s)) ? null : Number(s); }
    else if (BOOL_FIELDS.has(k)) v = v === true || /^(igen|true|1|x)$/i.test(String(v).trim());
    else v = String(v).replace(/^'/, '');
    if (k === 'role' && v === 'Termelési vezető') v = 'Projektvezető';   // régi elnevezés
    if (k === 'category' && v === 'Kábel / egyéb') v = 'Egyéb';   // régi kategória
    if (k === 'category' && v === 'Akku / táp') v = 'Akku / powerbank / táp';
    if (k === 'category' && v === 'Állvány / grip') v = 'Gimbal / állvány';
    if (k === 'category' && v === 'Vágóállomás') v = 'Egyéb';
    if (k === 'category' && (v === 'Laptop' || v === 'Tablet' || v === 'Telefon')) v = 'Laptop / tablet / telefon';
    o[k] = v;
  });
  if (o.category === 'Laptop / tablet / telefon' && /asus/i.test(o.name || '') && !/(zenbook|vivobook|rog|tuf|expertbook|proart\s*p16|laptop|notebook|zenfone|tablet|pad)/i.test(o.name || '')) o.category = 'Monitor / nyomtató';   // ASUS monitorok átsorolása (2026-11)
  if (o.roles !== undefined) o.roles = String(o.roles || '').split(',').map(s => s.trim()).filter(Boolean).map(r => r === 'Termelési vezető' ? 'Projektvezető' : r);   // régi elnevezés
  if (o.skills !== undefined) o.skills = String(o.skills || '').split(',').map(s => s.trim()).filter(Boolean);
  return o;
}

function toRow_(t, o) {
  return t.cols.map(c => {
    const k = c[0];
    let v = o[k];
    if (BOOL_FIELDS.has(k)) return v ? 'igen' : '';
    if ((k === 'roles' || k === 'skills') && Array.isArray(v)) v = v.join(', ');
    if (v == null) return '';
    return NUM_FIELDS.has(k) ? String(v) : cell_(v);
  });
}

/* Táblázat-módban (Google Sheets) az olvasás lassú: a táblák tartalma a gyorsítótárba kerül, és egy közös verziószám
   jelzi, ha bárki írt (minden mentés / zárolt művelet után új verzió). Zárolás alatt mindig közvetlenül a táblázatból olvasunk. */
const SC_ = { lock: 0, ver: '', memo: {} };
function scVer_() { if (SC_.ver) return SC_.ver; try { const C = CacheService.getScriptCache(); let v = C.get('scver'); if (!v) { v = String(Date.now()); C.put('scver', v, 21600); } return SC_.ver = v; } catch (e) { return ''; } }
function scBump_() { SC_.memo = {}; SC_.ver = ''; try { CacheService.getScriptCache().put('scver', String(Date.now()) + Math.random().toString(36).slice(2, 6), 21600); } catch (e) { } }
function readAll_(key) {
  if (!dbOn_() && !SC_.lock) { if (SC_.memo[key]) return JSON.parse(SC_.memo[key]); const v = scVer_(); if (v) { const c = tabCacheGet_('S' + key, v); if (c != null) { SC_.memo[key] = c; return JSON.parse(c); } }
    const out = readAllRaw_(key), js = JSON.stringify(out); SC_.memo[key] = js; if (v) tabCachePut_('S' + key, v, js); return JSON.parse(js); }
  return readAllRaw_(key);
}
function readAllRaw_(key) {
  const t = TABLES[key], sh = sheetFor_(key), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, t.cols.length).getValues()
    .map(r => fromRow_(t, r))
    .filter(o => t.assign ? (o.projectId && (o.crewId || o.itemId)) : o.id);
}

function findRow_(sh, id) {
  const n = sh.getLastRow();
  if (n < 2) return 0;
  const ids = sh.getRange(2, 1, n - 1, 1).getValues();
  const i = ids.findIndex(r => String(r[0]) === id);
  return i < 0 ? 0 : i + 2;
}

function readRow_(key, sh, row) {
  const t = TABLES[key];
  return fromRow_(t, sh.getRange(row, 1, 1, t.cols.length).getValues()[0]);
}

function putRow_(key, sh, obj, row) {
  const t = TABLES[key];
  const target = row || sh.getLastRow() + 1;
  const rg = sh.getRange(target, 1, 1, t.cols.length);
  rg.setNumberFormat('@');
  rg.setValues([toRow_(t, obj)]);
}

/** Beosztás-munkalap újraírása: megtartja a keep() szerint megmaradó sorokat, és hozzáfűzi az újakat. */
function rewriteAssign_(key, keep, add, rename) {
  const t = TABLES[key], sh = sheetFor_(key), n = sh.getLastRow();
  let rows = n > 1 ? sh.getRange(2, 1, n - 1, t.cols.length).getValues().map(r => fromRow_(t, r)).filter(o => o.projectId) : [];
  rows = rows.filter(keep);
  if (rename) rows.forEach(rename);
  rows = rows.concat(add || []);
  if (n > 1) sh.getRange(2, 1, n - 1, t.cols.length).clearContent();
  if (rows.length) {
    const rg = sh.getRange(2, 1, rows.length, t.cols.length);
    rg.setNumberFormat('@');
    rg.setValues(rows.map(o => toRow_(t, o)));
  }
}

function byId_(list) { const m = {}; list.forEach(x => { m[x.id] = x; }); return m; }
function now_() { return Utilities.formatDate(new Date(), SHEET_TZ, 'yyyy-MM-dd HH:mm:ss'); }
function today_() { return Utilities.formatDate(new Date(), SHEET_TZ, 'yyyy-MM-dd'); }
function str_(v, max) { return String(v == null ? '' : v).trim().slice(0, max); }
function iso_(v) { const s = str_(v, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; }
function int_(v, min, max, def) {
  if (v === '' || v == null) return def;
  const n = Math.round(Number(v));
  if (!isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  SC_.lock++;
  try {
    if (dbOn_() && DB_.loaded && !DB_.inLock) { dbFlush_(); dbLoad_(true); }   // zárolás alatt mindig friss adatból dolgozunk
    const outer = dbOn_() && !DB_.inLock; if (outer) DB_.inLock = true;
    try { const r = fn(); dbFlush_(); return r; } catch (e) { if (dbOn_()) Object.keys(DB_.sheets).forEach(k => { DB_.sheets[k].dirty = false; DB_.loaded = false; }); throw e; } finally { if (outer) DB_.inLock = false; }
  } finally { SC_.lock = Math.max(0, SC_.lock - 1); if (!dbOn_()) scBump_(); if (!SC_.lock) lock.releaseLock();
    if (!SC_.lock && WM_PAID_.length) try { wmPaidMailFlush_(); } catch (e) { Logger.log('Vízjel-levél: ' + e); } }   // a zár után: vízjel-levél (ha kifizetés miatt lekerült)
}

