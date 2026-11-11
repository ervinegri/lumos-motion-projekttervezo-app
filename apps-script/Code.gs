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
const EVENT_TYPES = ['Konferencia', 'Webinárium', 'Csoportos találkozó', 'Céges rendezvény', 'Gála, díjátadó', 'Kiállítás, expo', 'Termékbemutató', 'Sportesemény', 'Koncert', 'Short videó forgatás', 'Videóvágás', 'Podcast', 'Egyéb'];
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
    ['short60', 'Short 40–60 mp (db)'], ['foto_db', 'Fotók (db)'], ['er_zoom', 'ER: közeli vágói belenagyítással'], ['dueAt', 'Átadási határidő (egyedi)'], ['fees', 'Termelői díjak (JSON)'], ['budgetMode', 'Termelői keret módja'], ['budgetVal', 'Termelői keret (% vagy Ft)'], ['crewNotes', 'Személyes jegyzetek (JSON)'], ['rentals', 'Bérelt eszközök (JSON)'], ['deliveryNotes', 'Átadási észrevételek'], ['siteOk', 'Helyszíni munka rendben'], ['siteReport', 'Helyszíni beszámoló'], ['clientTax', 'Ügyfél adószáma'], ['clientAddress', 'Ügyfél székhelye'], ['t_vizual', 'Vizuáltechnika'], ['penalties', 'Díjcsökkentések (JSON)'], ['er_summary', 'ER: összefoglaló videó (db)'], ['stepsDone', 'Kipipált lépések'], ['dueKept', 'Átadási határidő tartva'], ['crewDays', 'Munkanapok (JSON)'], ['endTime', 'Távozás (kb.)'], ['er_total_n', 'ER: teljes alakos kamerák (db)'], ['er_close_n', 'ER: közeli kamerák (db)'], ['er_creative', 'ER: kreatív kamera'], ['er_creative_n', 'ER: kreatív kamerák (db)'], ['budgetRequest', 'Termelői keret jóváhagyása (JSON)'], ['er_post_n', 'ER: utómunkás termek (db)'], ['x_foto_n', 'Fotósok a helyszínen (db)'], ['crewFinal', 'Csapat véglegesítve (JSON)'], ['leadvaAt', 'Videók leadva (dátum)'], ['payStatus', 'Fizetési állapot'], ['lastStartTime', 'Utolsó nap: érkezés'], ['lastEndTime', 'Utolsó nap: távozás (kb.)'], ['cancelReason', 'Lemondás oka'], ['leadRemote', 'Projektvezető távolról'], ['extras', 'Extra szolgáltatások (JSON, nettó)'], ['editOnsite', 'Helyszíni vágó'], ['rawSentAt', 'Nyersanyag e-mail elküldve'], ['deliveryPass', 'Videó jelszava'], ['int_sarok', 'Interjúsarok videók (db)'], ['int_resztvevo', 'Résztvevői interjúk (db)'], ['i_sarok', 'Interjúsarok (forgatás)'], ['i_stand', 'Interjúztatás a standnál'], ['editTasks', 'Vágói feladatok (JSON)'], ['deliveryLinks', 'További átadási linkek (JSON)'], ['eqFinal', 'Eszközök véglegesítve (JSON)'], ['recRooms', 'Előadásrögzítés termei (JSON)'], ['videos', 'Videók követése (JSON)']] },
  crew: { tab: 'Stáb', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['name', 'Név'], ['roles', 'Szerepek'], ['type', 'Jogviszony'], ['phone', 'Telefon'],
    ['email', 'E-mail'], ['dayRate', 'Napidíj (nettó Ft)'], ['note', 'Megjegyzés'], ['createdAt', 'Létrehozva'], ['updatedAt', 'Módosítva'],
    ['priority', 'Prioritás (1–3)'], ['company', 'Vállalkozás'], ['skills', 'Részletek'], ['vat', 'ÁFA (aam = alanyi adómentes, afa = áfakörös)'], ['tax', 'Adószám']] },
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
    ['id', 'Azonosító (ne módosítsd)'], ['date', 'Dátum'], ['kind', 'Befizetés / visszafizetés'], ['amount', 'Összeg (Ft)'], ['note', 'Megjegyzés'], ['bank', 'Bank']] },
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
    ['createdAt', 'Létrehozva'], ['createdBy', 'Létrehozta'], ['updatedAt', 'Módosítva'], ['updatedBy', 'Módosította'], ['commPct', 'Jutalék (%)'], ['commAmt', 'Jutalék (Ft)'], ['services', 'Szóba jövő szolgáltatások'], ['commManual', 'Jutalék kézzel (%)'], ['commAuto', 'Jutalék automatikusan (Sales App)']] },   // új oszlop mindig a végére
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
const STATUS_LABELS = { egyeztetes: 'Egyeztetés', tervezes: 'Tervezés', helyszin: 'Helyszíni munka', utomunka: 'Utómunka', leadva: 'Videók leadva', jovahagyas: 'Videók jóváhagyásra várnak', atadva: 'Kész', lemondva: 'Lemondva' };
const ID_RE = /^[A-Za-z0-9-]{8,64}$/;

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
    else if (fn === 'clientInfo') data = clientInfo_(args[0], args[1] !== 'preview', args[2]);   // nyilvános: az ügyfél jóváhagyó oldala (aláírt kulccsal)
    else if (fn === 'clientDecide') data = clientDecide_(args[0], args[1], args[2], args[3]);
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
function dbLoad_(force) {
  if (DB_.loaded && !force) return;
  const r = neonSql_([{ query: 'SELECT tab, rows::text FROM lpm_sheet' }])[0];
  const seen = {};
  (r.rows || []).forEach(row => { const tab = row[0], rows = JSON.parse(row[1] || '[]'); seen[tab] = 1;
    if (DB_.sheets[tab]) { const s = DB_.sheets[tab]; s.v = rows; s.cols = rows.reduce((m, x) => Math.max(m, x.length), 0); s.dirty = false; s.isNew = false; }
    else DB_.sheets[tab] = new NSheet_(tab, rows); });
  Object.keys(DB_.sheets).forEach(tab => { if (!seen[tab] && !DB_.sheets[tab].dirty) { DB_.sheets[tab].v = []; DB_.sheets[tab].cols = 0; } });
  DB_.loaded = true;
}
/** A módosított munkalapok visszaírása egy tranzakcióban. Munkalap-módban a Google-táblázat flush-a. */
function dbFlush_() {
  if (!dbOn_()) { SpreadsheetApp.flush(); return; }
  const dirty = Object.keys(DB_.sheets).map(k => DB_.sheets[k]).filter(s => s.dirty), logs = DB_.pendingLog || [];
  if (!dirty.length && !logs.length) return;
  DB_.pendingLog = [];
  neonSql_(logs.map(r => ({ query: 'INSERT INTO lpm_log (at, who, role, action, subject, details) VALUES ($1,$2,$3,$4,$5,$6)', params: r })).concat(dirty.map(s => { const n = s.getLastRow(), rows = s.v.slice(0, n).map(r => (r || []).slice(0, Math.max(s.cols, 1)).map(x => x === undefined || x === null ? '' : x));
    return { query: 'INSERT INTO lpm_sheet (tab, rows, ver, updated_at) VALUES ($1, $2::jsonb, 1, now()) ON CONFLICT (tab) DO UPDATE SET rows = EXCLUDED.rows, ver = lpm_sheet.ver + 1, updated_at = now()', params: [s.tab, JSON.stringify(rows)] }; })));
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

function readAll_(key) {
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
  try {
    if (dbOn_() && DB_.loaded && !DB_.inLock) { dbFlush_(); dbLoad_(true); }   // zárolás alatt mindig friss adatból dolgozunk
    const outer = dbOn_() && !DB_.inLock; if (outer) DB_.inLock = true;
    try { const r = fn(); dbFlush_(); return r; } catch (e) { if (dbOn_()) Object.keys(DB_.sheets).forEach(k => { DB_.sheets[k].dirty = false; DB_.loaded = false; }); throw e; } finally { if (outer) DB_.inLock = false; }
  } finally { lock.releaseLock(); }
}

/* ===================== ADATOK BETÖLTÉSE ===================== */
/* Gyorsítótár a betöltéshez: a táblázat teljes tartalmát (szerepkör-szűrés előtt) 10 percig a Script Cache-ben tartjuk.
   Minden módosító művelet után új verziószámot kap, így a változás azonnal látszik. (Ha valaki közvetlenül a táblázatban
   szerkeszt, az legkésőbb 10 perc múlva vagy a következő app-beli mentés után jelenik meg.) */
const DATA_CACHE_TTL = 600;
function dataVer_() { const c = CacheService.getScriptCache(); let v = c.get('pm_data_ver'); if (!v) { v = String(Date.now()); c.put('pm_data_ver', v, 21600); } return v; }
function dataBump_() { try { CacheService.getScriptCache().put('pm_data_ver', Date.now() + '_' + Math.floor(Math.random() * 1e6), 21600); } catch (e) {} }
function cacheGetJSON_(key) {
  try {
    const c = CacheService.getScriptCache(), n = Number(c.get(key + ':n') || 0);
    if (!n) return null;
    const keys = []; for (let i = 0; i < n; i++) keys.push(key + ':' + i);
    const parts = c.getAll(keys); let out = '';
    for (let i = 0; i < n; i++) { const p = parts[key + ':' + i]; if (p == null) return null; out += p; }
    return JSON.parse(out);
  } catch (e) { return null; }
}
function cachePutJSON_(key, obj, ttl) {
  try {
    const str = JSON.stringify(obj), size = 90000, map = {};
    const n = Math.ceil(str.length / size);
    if (n > 50) return;   // túl nagy, nem tároljuk
    for (let i = 0; i < n; i++) map[key + ':' + i] = str.slice(i * size, (i + 1) * size);
    map[key + ':n'] = String(n);
    CacheService.getScriptCache().putAll(map, ttl);
  } catch (e) {}
}
function loadBase_() {
  const key = 'pm_base_' + dataVer_();
  const hit = cacheGetJSON_(key);
  if (hit) return hit;
  const projects = readAll_('projects');
  const crew = readAll_('crew');
  const inventory = readAll_('inventory');
  const clients = readAll_('clients');
  const byP = {};
  projects.forEach(p => { p.crew = []; p.equipment = []; delete p.mutationId; byP[p.id] = p; });
  readAll_('crewAssign').forEach(r => { if (byP[r.projectId]) byP[r.projectId].crew.push({ crewId: r.crewId, role: r.role }); });
  readAll_('eqAssign').forEach(r => { if (byP[r.projectId]) byP[r.projectId].equipment.push({ itemId: r.itemId, qty: r.qty || 1, crewId: r.crewId || '' }); });
  const base = { projects: projects, crew: crew, inventory: inventory, clients: clients };
  cachePutJSON_(key, base, DATA_CACHE_TTL);
  return base;
}

/* Egyszeri: Egri Ervin és László Csanád bérszámfejtett (nem állítanak ki számlát) – Ervin kérése, 2026-11-02 */
/** Egyszeri: a közelgő projektek naptárbejegyzéseinek leírása frissül (2026-11-03: az ügyfél neve kikerült). Háttérben, egy perccel a bejelentkezés után fut. */
function calNoClientOnce_() {
  const P = PropertiesService.getScriptProperties();
  if (P.getProperty('MIG_CALPHONE_2026_11')) return;   // 2026-11-03: a stáb telefonszáma kikerül (csak a projektvezetőé marad); a lemondott (STORNO) projektek eseményei is kikerülnek a Google Naptárból
  P.setProperty('MIG_CALPHONE_2026_11', now_());
  try { ScriptApp.newTrigger('calResyncUpcoming').timeBased().after(60 * 1000).create(); } catch (e) {}
}
/* Automatikus lépés: a Helyszíni munka szakaszban lévő projekt a forgatás vége után magától Utómunkába kerül
   (utolsó nap + távozási idő; ha nincs megadva, a nap végén). A helyszíni beszámolót utána kell bejelölni – az app figyelmeztet rá.
   Bejelentkezéskor fut (legfeljebb 5 percenként), így időzítő nélkül is naprakész. */
function autoAdvance_() {
  const cache = CacheService.getScriptCache(); if (cache.get('pm_autoadv')) return; cache.put('pm_autoadv', '1', 300);
  const nowS = Utilities.formatDate(new Date(), SHEET_TZ, 'yyyy-MM-dd HH:mm');
  const endOf = p => { const multi = p.endDate && p.endDate > p.date, d = multi ? p.endDate : p.date; if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d || ''))) return '';
    const t = String((multi && p.lastEndTime) || p.endTime || '').trim(); return d + ' ' + (/^\d{2}:\d{2}$/.test(t) ? t : '23:59'); };
  const due = readAll_('projects').filter(p => p.status === 'helyszin' && endOf(p) && endOf(p) < nowS);
  if (!due.length) return;
  const moved = withLock_(() => {
    const sh = sheetFor_('projects'), out = [];
    due.forEach(x => { const r = findRow_(sh, x.id); if (!r) return; const q = readRow_('projects', sh, r); if (q.status !== 'helyszin') return;
      q.prevStatus = 'helyszin'; q.status = 'utomunka';
      const sd = String(q.stepsDone || '').split(',').filter(String); if (sd.indexOf('helyszin') < 0) sd.push('helyszin'); q.stepsDone = sd.join(',');
      q.updatedAt = now_(); q.updatedBy = 'Automatikus (a forgatás véget ért)'; putRow_('projects', sh, q, r); out.push(q.name); });
    if (out.length) { dbFlush_(); dataBump_(); }
    return out;
  });
  moved.forEach(n => logEvent_(null, 'Automatikus lépés', n, 'Helyszíni munka → Utómunka (a forgatás véget ért)'));
}
function calResyncUpcoming() {
  const today = today_();
  readAll_('projects').filter(p => p.calEventId && (p.status === 'lemondva' || String(p.endDate || p.date || '') >= today)).forEach(p => { try { syncCalendar_(fullProject_(p)); } catch (e) {} });
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'calResyncUpcoming').forEach(t => { try { ScriptApp.deleteTrigger(t); } catch (e) {} });
}
/** Egyszeri: a már véglegesített csapatú, még Tervezés szakaszban lévő projektek átkerülnek a Helyszíni munkára (a szabály 2026-11-02 óta él). */
/* Egyszeri (2026-11-05): a Helyszíni munkában ragadt videóvágás projektek Utómunkába kerülnek */
function migrateEditOnlyOnce_() {
  const P = PropertiesService.getScriptProperties(); if (P.getProperty('MIG_EDITONLY_2026_11')) return;
  withLock_(() => {
    const sh = sheetFor_('projects');
    readAll_('projects').forEach(p => {
      if (p.eventType !== 'Videóvágás' || p.status !== 'helyszin') return;
      p.prevStatus = 'tervezes'; p.status = 'utomunka'; p.updatedAt = now_(); p.updatedBy = 'App (videóvágás)';
      putRow_('projects', sh, p, findRow_(sh, p.id));
      logEvent_({ name: 'App', role: 'admin' }, 'Projekt módosítva', p.name, 'Állapot: Helyszíni munka → Utómunka (videóvágásnál nincs helyszíni munka)');
    });
    dbFlush_(); dataBump_();
  });
  P.setProperty('MIG_EDITONLY_2026_11', now_());
}
function migrateFinalizedOnce_() {
  const P = PropertiesService.getScriptProperties();
  if (P.getProperty('MIG_FINAL_2026_11')) return;
  withLock_(() => {
    const sh = sheetFor_('projects');
    readAll_('projects').forEach(p => {
      if (!String(p.crewFinal || '').trim() || !(p.status === 'tervezes' || p.status === 'egyeztetes' || !p.status)) return;
      p.prevStatus = p.status || 'tervezes'; p.status = 'helyszin'; p.updatedAt = now_(); p.updatedBy = 'App (csapat véglegesítve)';
      putRow_('projects', sh, p, findRow_(sh, p.id));
      logEvent_({ name: 'App', role: 'admin' }, 'Projekt módosítva', p.name, 'Állapot: Tervezés → Helyszíni munka (a csapat már véglegesítve volt)');
    });
    dbFlush_(); dataBump_();
  });
  P.setProperty('MIG_FINAL_2026_11', now_());
}
function migrateEmployeesOnce_() {
  const P = PropertiesService.getScriptProperties();
  if (P.getProperty('MIG_EMP_2026_11')) return;
  withLock_(() => {
    const sh = sheetFor_('crew');
    readAll_('crew').forEach(c => {
      if (!/^(egri ervin|lászló csanád|laszlo csanad)$/i.test(String(c.name || '').trim()) || isEmployee_(c)) return;
      c.type = CREW_TYPES[3]; c.updatedAt = now_();
      putRow_('crew', sh, c, findRow_(sh, c.id));
    });
    dbFlush_(); dataBump_();
  });
  P.setProperty('MIG_EMP_2026_11', now_());
}
function bootstrap_(u) {
  if (u.role === 'sales') return viewAsPick_(salesBootstrap_(u), u);   // az értékesítő csak a saját lehetőségeit és az ügyfeleket kapja meg – projektet, díjat, stábot nem
  try { migrateEmployeesOnce_(); } catch (e) {}
  try { migrateFinalizedOnce_(); } catch (e) {}
  try { migrateEditOnlyOnce_(); } catch (e) {}
  try { calNoClientOnce_(); } catch (e) {}
  try { if (u && (u.role === 'admin' || u.role === 'editor')) videosBackfill_(); } catch (e) { Logger.log('Videó-pótlás hiba: ' + e); }
  try { if (u && u.role === 'admin') salesSyncEnsure_(); } catch (e) {}   // a Sales App szinkron időzítése (egyszer)
  /* 2026-11-04: nincs automatikus lépés – a Helyszíni munkából az Utómunkába is kézzel (áthúzással) lép a projekt */
  const base = loadBase_();
  const projects = base.projects, crew = base.crew, inventory = base.inventory;
  const out = {
    me: publicUser_(u), projects: projects.map(p => projectView_(p, u)), crew: crew, inventory: inventory, clients: u.role === 'crew' ? [] : (base.clients || []),
    officeRent: u.role === 'crew' ? [] : readAll_('officeRent'),
    paySent: paySentList_(u),
    payStatus: u.role === 'admin' ? readAll_('payStatus') : u.role === 'crew' ? readAll_('payStatus').filter(x => u.crewId && x.crewId === u.crewId) : readAll_('payStatus').filter(x => u.crewId && x.crewId === u.crewId).map(x => ({ id: x.id, month: x.month, crewId: x.crewId, invoicedAt: x.invoicedAt ? '1' : '', paidAt: x.paidAt ? '1' : '', invoiceNo: x.invoiceNo ? '1' : '', invoiceNet: x.invoiceNo ? x.invoiceNet : '' })),   // a termelési vezető csak a bennhagyott egyenleghez szükséges adatot kapja
    payAdjust: readAll_('payAdjust').filter(x => u.role !== 'crew' || (u.crewId && x.crewId === u.crewId)),   // a szakember csak a saját korrekcióit látja
    links: { folder: 'https://drive.google.com/drive/folders/' + PROJECTS_FOLDER_ID, sheet: 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/edit' },
    crewOrder: crewOrder_(),
    mailOn: mailOn_(), clientMailLive: clientMailLive_(), mailCats: u.role === 'admin' ? mailCats_() : undefined, mailCc: u.role === 'admin' ? mailCc_() : undefined,
    capabilities: { budgetApproval: true, financeAutosave: true, videoStages: true, crewOrder: true, penaltyDay: true, contentCounts: true, crewFinalize: true, finance: true },
    serverTime: now_()
  };
  if (u.role !== 'admin') {
    // a beszerzési értéket csak az ügyvezető látja (a termelési vezető megadhatja, de visszaolvasni nem tudja)
    out.inventory = inventory.map(i => Object.assign({}, i, { value: null, hasValue: i.value != null && i.value !== '' }));
  }
  if (u.role === 'crew') {
    const cid = String(u.crewId || '');
    out.projects = out.projects.filter(p => cid && (p.lead === cid || p.crew.some(c => c.crewId === cid)));
    out.mySales = mySalesComm_(cid);   // a saját értékesítői jutalékai (csak az összeg – ár, % nem)
    // a szakember csak a saját projektjein szereplő munkatársakat és eszközöket kapja meg (Stáb és Leltár fület nem lát)
    const onIds = {}, itemIds = {};
    out.projects.forEach(p => { if (p.lead) onIds[p.lead] = 1; p.crew.forEach(a => { onIds[a.crewId] = 1; }); p.equipment.forEach(e => { itemIds[e.itemId] = 1; }); });
    out.crew = crew.filter(c => onIds[c.id]).map(c => ({ id: c.id, name: c.name, phone: c.phone, roles: c.roles }));
    out.inventory = inventory.filter(i => itemIds[i.id]).map(i => ({ id: i.id, name: i.name, category: i.category, serial: i.serial, location: i.location, qty: i.qty, condition: i.condition }));
    delete out.links.sheet;
  }
  if (u.role === 'admin' || u.role === 'editor') { const live = {}; crew.forEach(c => { live[c.id] = 1; }); const ar = crewArchive_(); out.crewNames = {}; Object.keys(ar).forEach(k => { if (!live[k]) out.crewNames[k] = ar[k]; }); }
  if (u.role === 'admin') { try { dealOrphansClean_(); } catch (e) {} out.deals = dealsFor_(u); out.salesPeople = salesPeople_(u); try { out.crewDocs = crewDocsList_(); const P2 = PropertiesService.getScriptProperties(), cr = P2.getProperty('CREWDOCS_AUTO2_RES'); if (cr) { out.crewDocsAuto = JSON.parse(cr); P2.deleteProperty('CREWDOCS_AUTO2_RES'); } } catch (e) { out.crewDocs = []; } }   // az Értékesítés fül (a termelési vezető és a szakember nem kapja meg)
  return viewAsPick_(out, u);
}
/** Ügyvezetői előnézetben a nézetválasztóhoz kell a teljes szakemberlista (csak név és szerep), hogy másik szakemberre válthasson. */
function viewAsPick_(out, u) {
  if (u.realRole === 'admin') out.viewAsCrew = readAll_('crew').map(c => ({ id: c.id, name: c.name, roles: c.roles }));
  if (u.realRole === 'admin' || u.role === 'admin') out.viewAsSales = loadUsers_().filter(x => x.role === 'sales' && !x.disabled).map(x => ({ id: x.id, name: x.name }));
  return out;
}

/* ===================== ÉRTÉKESÍTÉS =====================
   Lehetőségek (deals) a szerződésig: Új érdeklődő → Ajánlat kiküldve → Tárgyalás → Szerződve / Elveszett.
   Az ügyvezető mindet látja, az értékesítő csak a sajátjait. Szerződéskor az app projektet hoz létre (Tervezés),
   az értékesítő ezután csak azt látja, hogy szerződve lett – a projekt részleteit, díjait nem. */
const DEAL_STAGES = ['uj', 'ajanlat', 'targyalas', 'nyert', 'elveszett'];
const DEAL_SOURCES = ['Ajánlás', 'Visszatérő ügyfél', 'Weboldal', 'E-mail / telefon', 'Közösségi média', 'Rendezvényen', 'Hideg megkeresés', 'Egyéb'];
/** A szerződött lehetőség a projektjével együtt törlődik (ha a projektet kitörölték, a lehetőség is eltűnik). */
function dealOrphansClean_() {
  const ids = {}; readAll_('projects').forEach(p => { ids[p.id] = 1; });
  const sh = sheetFor_('deals'), gone = readAll_('deals').filter(d => d.projectId && !ids[d.projectId]);
  if (!gone.length) return;
  gone.forEach(d => { const r = findRow_(sh, d.id); if (r) sh.deleteRow(r); });
  dbFlush_();
}
function dealsFor_(u) {
  const pids = {}; readAll_('projects').forEach(p => { pids[p.id] = 1; });
  const all = readAll_('deals').filter(d => !d.projectId || pids[d.projectId]);
  const uc = {}; if (u.role === 'admin') loadUsers_().forEach(x => { uc[x.id] = { crewId: x.crewId || '', sales: x.role === 'sales' }; });
  const adv = {}; try { readAll_('finInvoice').forEach(x => { const g = Number(x.invGross) || 0; if (!g || (Number(x.invPaid) || 0) < g - 1) return;   // kifizetett bizonylat (díjbekérő / foglaló / számla) → a lehetőség a „Díjbekérő kifizetve” oszlopba kerül
    [x.projectId].concat(String(x.projectIds || '').split(',')).map(v => String(v).trim()).filter(Boolean).forEach(pid => { const d = String(x.paidAt || x.date || '').slice(0, 10) || 'x'; if (!adv[pid] || d < adv[pid]) adv[pid] = d; }); }); } catch (e) { }
  const ck = v => String(v || '').trim().toLowerCase(), tigC = {};   // visszatérő, TIG-gel (teljesítésigazolással) számlázott ügyfél vagy keretszerződés: nem kap díjbekérőt
  try { readAll_('finTig').forEach(x => { if (ck(x.client)) tigC[ck(x.client)] = 'tig'; }); readAll_('finFramework').forEach(x => { if (ck(x.client) && String(x.mode || '') !== 'nemkell') tigC[ck(x.client)] = 'keret'; }); } catch (e) { }
  return (u.role === 'admin' ? all : all.filter(d => d.ownerId === u.id)).map(d => Object.assign({}, d, { advPaidAt: d.stage === 'nyert' && d.projectId && adv[d.projectId] ? adv[d.projectId] : '', noAdv: d.stage === 'nyert' && tigC[ck(d.client)] ? tigC[ck(d.client)] : '', ownerCrewId: String(d.ownerId || '').indexOf('crew:') === 0 ? String(d.ownerId).slice(5) : (uc[d.ownerId] && !uc[d.ownerId].sales ? uc[d.ownerId].crewId : ''), value: d.value === '' || d.value == null ? null : Number(d.value), chance: d.chance === '' || d.chance == null ? null : Number(d.chance), commPct: d.commPct === '' || d.commPct == null ? null : Number(d.commPct), commAmt: Number(d.commAmt) || 0 }));
}
function salesBootstrap_(u) {
  const base = loadBase_();
  // Kifizetések: a saját díjai (ugyanúgy, mint egy szakembernek) – csak azok a projektek, amelyeken díja van, a szakemberi nézet szűrésével
  const cu = Object.assign({}, u, { role: 'crew' }), cid = String(u.crewId || '');
  const projects = cid ? base.projects.filter(p => parseFees_(p.fees).some(f => f.crewId === cid && Number(f.amount) > 0)).map(p => projectView_(p, cu)) : [];
  const own = k => cid ? readAll_(k).filter(x => x.crewId === cid) : [];
  return { me: publicUser_(u), projects: projects, crew: [], inventory: [], payStatus: own('payStatus'), payAdjust: own('payAdjust'), paySent: paySentList_(u), clients: (base.clients || []).map(c => ({ id: c.id, name: c.name, contactName: c.contactName, contactEmail: c.contactEmail, contactPhone: c.contactPhone, tax: c.tax, address: c.address })),
    deals: dealsFor_(u), salesPeople: salesPeople_(u), officeRent: [], links: {}, crewOrder: [], mailOn: mailOn_(),
    capabilities: { deals: true }, serverTime: now_() };
}
function dealCan_(u, d) { if (u.role === 'admin') return; if (u.role !== 'sales' || (d && d.ownerId !== u.id)) throw new Error('FORBIDDEN: ehhez nincs jogosultságod.'); }
function saveDeal_(u, a) {
  a = a || {};
  const id = str_(a.id, 64) || Utilities.getUuid();
  return withLock_(() => {
    const sh = sheetFor_('deals'), row = findRow_(sh, id), old = row ? readRow_('deals', sh, row) : null;
    dealCan_(u, old);
    if (old && old.stage === 'nyert' && a.stage && a.stage !== 'nyert') throw new Error('Szerződött lehetőséget nem lehet visszaállítani – a projekt már elkészült.');
    const stage = DEAL_STAGES.indexOf(a.stage) >= 0 && a.stage !== 'nyert' ? a.stage : (old ? old.stage : 'uj');
    const users = loadUsers_(), owner = u.role === 'admin' && a.ownerId ? users.find(x => x.id === String(a.ownerId) && (x.role === 'sales' || x.role === 'admin')) : null;
    const num = (v, max) => { if (v === '' || v == null) return ''; const n = Math.round(Number(String(v).replace(/[^\d.-]/g, ''))); return isFinite(n) ? Math.max(0, Math.min(max, n)) : ''; };
    const d = {
      id: id, title: str_(a.title, 160), client: str_(a.client, 160), contactName: str_(a.contactName, 120), contactEmail: str_(a.contactEmail, 160), contactPhone: str_(a.contactPhone, 40),
      eventType: EVENT_TYPES.indexOf(a.eventType) >= 0 ? a.eventType : '', venue: str_(a.venue, 200), eventDate: iso_(a.eventDate), value: num(a.value, VALUE_MAX), stage: stage,
      chance: num(a.chance, 100), source: str_(a.source, 80).trim(), nextStep: str_(a.nextStep, 200), nextDate: iso_(a.nextDate),
      ownerId: owner ? owner.id : old ? old.ownerId : u.id, ownerName: owner ? owner.name : old ? old.ownerName : u.name, note: str_(a.note, 20000), services: (Array.isArray(a.services) ? a.services : String(a.services || '').split(',')).map(x => str_(x, 60).trim()).filter(Boolean).slice(0, 20).join(', '),
      lostReason: stage === 'elveszett' ? str_(a.lostReason, 300) : '', projectId: old ? old.projectId : '', wonAt: old ? old.wonAt : '', commPct: old ? old.commPct : '', commAmt: old ? old.commAmt : '',
      closedAt: stage === 'elveszett' ? (old && old.stage === 'elveszett' ? old.closedAt : today_()) : (old && old.stage === 'nyert' ? old.closedAt : ''),
      createdAt: old ? old.createdAt : now_(), createdBy: old ? old.createdBy : u.name, updatedAt: now_(), updatedBy: u.name };
    if (old && old.stage === 'nyert') d.stage = 'nyert';
    if (d.title.length < 2) throw new Error('Add meg a lehetőség nevét.');
    if (d.stage === 'elveszett' && d.lostReason.length < 3) throw new Error('Írd be röviden, miért veszett el.');
    putRow_('deals', sh, d, row || null); dbFlush_();
    logEvent_(u, old ? (old.stage !== d.stage ? 'Értékesítés: ' + dealStageLbl_(d.stage) : 'Értékesítés módosítva') : 'Értékesítés: új lehetőség', d.title, d.client);
    return { deals: dealsFor_(u) };
  });
}
/** A projekt értékesítője: szerződött („nyert”) lehetőség a projekthez az értékesítővel (jutalék, az értékesítő saját lehetőségei).
    Ha már van a projekthez lehetőség, csak az értékesítőt írja át; owner = null → a csak így létrehozott lehetőséget törli. */
/** Értékesítő a projekthez: értékesítő felhasználó, vagy (ha nincs fiókja) az „Értékesítő” szerepű munkatárs („crew:<id>”). */
function salesOwnerOf_(oid) {
  oid = String(oid || ''); if (!oid) return null;
  const users = loadUsers_().filter(x => x.disabled !== true);
  if (oid.indexOf('crew:') === 0) {
    const cid = oid.slice(5), c = readAll_('crew').find(x => x.id === cid); if (!c) return null;
    return users.find(x => x.role === 'sales' && x.crewId === cid) || { id: 'crew:' + cid, name: sval_(c.name), role: 'crew', crewId: cid };
  }
  return users.find(x => x.id === oid) || null;
}
function projSalesSet_(by, pid, owner, srcLabel) {
  const dsh = sheetFor_('deals'), ex = readAll_('deals').find(d => d.projectId === pid) || null;
  if (!owner) {
    if (!ex) return null;
    if (ex.source !== 'Projekttervező' && ex.source !== 'Sales App') throw new Error('Ez a lehetőség az Értékesítés fülön jött létre – ott módosítsd.');
    withLock_(() => { const r = findRow_(dsh, ex.id); if (r) dsh.deleteRow(r); }); dbFlush_();
    logEvent_(by, 'Értékesítés: értékesítő levéve', ex.title, ex.ownerName || ''); return null;
  }
  if (ex && ex.ownerId === owner.id) return ex;
  const p = readAll_('projects').find(x => x.id === pid); if (!p) throw new Error('A projekt nem található.');
  const value = Math.round(Number(p.projectValue) || 0);
  const d = ex ? Object.assign({}, ex) : { id: Utilities.getUuid(), title: sval_(p.name), client: sval_(p.client), contactName: sval_(p.contactName), contactEmail: sval_(p.contactEmail), contactPhone: sval_(p.contactPhone),
    eventType: sval_(p.eventType), venue: sval_(p.venue), eventDate: sval_(p.date), value: value, stage: 'nyert', chance: 100, source: srcLabel || 'Projekttervező', nextStep: '', nextDate: '', note: '', lostReason: '',
    projectId: pid, wonAt: today_(), closedAt: today_(), createdAt: now_(), createdBy: by.name, services: '' };
  d.ownerId = owner.id; d.ownerName = owner.name;
  if (owner.role === 'sales') { const c = salesCompOf_(owner), v = Number(d.value) || value, pct = v >= c.commLimit ? c.commHigh : c.commLow; d.commPct = pct; d.commAmt = Math.round(v * pct / 100); } else { d.commPct = ''; d.commAmt = ''; }
  d.updatedAt = now_(); d.updatedBy = by.name;
  withLock_(() => { const row = ex ? findRow_(dsh, ex.id) : null; putRow_('deals', dsh, d, row || null); }); dbFlush_();
  logEvent_(by, 'Értékesítés: értékesítő a projekten', d.title, owner.name);
  return d;
}
function dealStageLbl_(s) { return { uj: 'Új érdeklődő', ajanlat: 'Ajánlat kiküldve', targyalas: 'Tárgyalás', nyert: 'Szerződve', elveszett: 'Elveszett' }[s] || s; }
function deleteDeal_(u, a) {
  const id = str_(a && a.id, 64);
  return withLock_(() => {
    const sh = sheetFor_('deals'), row = findRow_(sh, id); if (!row) return { deals: dealsFor_(u) };
    const d = readRow_('deals', sh, row); dealCan_(u, d);
    if (d.stage === 'nyert') throw new Error('Szerződött lehetőséget nem lehet törölni.');
    sh.deleteRow(row); dbFlush_(); logEvent_(u, 'Értékesítés: törölve', d.title, d.client);
    return { deals: dealsFor_(u) };
  });
}
/** Szerződés: projekt jön létre a lehetőség adataiból (Tervezés szakasz), a projekt értéke a megállapodott összeg. */
function winDeal_(u, a) {
  a = a || {};
  const id = str_(a.id, 64), sh = sheetFor_('deals'), row = findRow_(sh, id);
  if (!row) throw new Error('A lehetőség nem található.');
  const d = readRow_('deals', sh, row); dealCan_(u, d);
  if (d.stage === 'nyert' && d.projectId) return { deals: dealsFor_(u), projectId: d.projectId };
  const value = Math.round(Number(String(a.value == null ? d.value : a.value).replace(/[^\d]/g, '')) || 0), date = iso_(a.eventDate) || iso_(d.eventDate);
  if (!value) throw new Error('Add meg a megállapodott (szerződött) nettó összeget.');
  const linkId = str_(a.projectId, 64);
  if (linkId) {   // meglévő projekthez kapcsolás (a projektet már létrehozták a projekttervezőben)
    if (u.role !== 'admin') throw new Error('FORBIDDEN: Meglévő projekthez csak az ügyvezető kapcsolhat.');
    if (readAll_('deals').some(x => x.id !== id && x.projectId === linkId)) throw new Error('Ehhez a projekthez már tartozik egy szerződött lehetőség.');
    withLock_(() => { const psh = sheetFor_('projects'), pr = findRow_(psh, linkId); if (!pr) throw new Error('A projekt nem található.');
      const p = readRow_('projects', psh, pr); if (p.quotePrice === '' || p.quotePrice == null) { p.quotePrice = value; putRow_('projects', psh, p, pr); } });
  }
  const linkP = linkId ? readAll_('projects').find(x => x.id === linkId) : null;
  const pdate = date || (linkP && iso_(linkP.date));
  if (!pdate) throw new Error('Add meg a rendezvény dátumát – ezzel kerül a naptárba.');
  const pid = linkId || Utilities.getUuid();
  if (!linkId) saveProject_({ id: u.id, name: u.name, email: u.email, role: 'admin' }, { id: pid, mutationId: Utilities.getUuid(), name: str_(a.title, 160) || d.title, client: d.client, venue: d.venue, eventType: d.eventType,
    date: date, contactName: d.contactName, contactEmail: d.contactEmail, contactPhone: d.contactPhone, notes: d.note ? 'Értékesítés (' + d.ownerName + '): ' + d.note : '',
    status: 'tervezes', crew: [], equipment: [], baseUpdatedAt: '', projectValue: value, deferCal: true });
  withLock_(() => { const r2 = findRow_(sh, id), q = readRow_('deals', sh, r2);
    const ow = loadUsers_().find(x => x.id === q.ownerId);
    if (ow && ow.role === 'sales') { const c = salesCompOf_(ow), pct = value >= c.commLimit ? c.commHigh : c.commLow; q.commPct = pct; q.commAmt = Math.round(value * pct / 100); } else { q.commPct = ''; q.commAmt = ''; }   // jutalék a szerződéskori beállítás szerint
    q.stage = 'nyert'; q.projectId = pid; q.value = value; q.eventDate = date || pdate; q.wonAt = today_(); q.closedAt = today_(); q.chance = 100; q.updatedAt = now_(); q.updatedBy = u.name; if (!q.eventDate) q.eventDate = pdate;
    putRow_('deals', sh, q, r2); dbFlush_(); });
  logEvent_(u, 'Értékesítés: szerződve', d.title, d.client + (linkId ? ' · meglévő projekthez kapcsolva' : ' · projekt létrehozva'));
  if (!linkId) try { const p = readAll_('projects').find(x => x.id === pid); if (p) syncCalendar_(fullProject_(p)); } catch (e) {}
  return { deals: dealsFor_(u), projectId: pid };
}

/* ===================== PÉNZÜGYEK (szerepkör szerint szűrve) =====================
   Projekt értéke (nettó, ÁFA nélkül): csak az ügyvezető látja és állítja (a táblában az „Ajánlati ár (nettó Ft)” oszlop).
   Termelői díjak (alvállalkozói díjak, eszközbérlés, egyéb): az ügyvezető és a termelési vezető látja és szerkeszti.
   A szakemberek egyiket sem kapják meg semmilyen válaszban. */
const FEE_MAX = 99999999, VALUE_MAX = 9999999999;
/** Van-e átadandó anyag (a felület needsDelivery függvényének megfelelője). */
function needsDelivery_(p) {
  if (p.dueAt) return true;
  if (['aftermovie', 'interju', 'int_sarok', 'int_resztvevo', 'short60', 'short30', 'short15', 'er_clips', 'er_subs', 'er_summary', 'foto_db'].some(k => Number(p[k]) > 0)) return true;
  return ['x_foto', 'x_dron', 'x_timelapse', 'x_pov', 'x_nyersVetel', 'er_post'].some(k => p[k] === true);
}
function parseFees_(raw) {
  let arr = raw;
  if (typeof raw === 'string') { try { arr = raw ? JSON.parse(raw) : []; } catch (e) { arr = []; } }
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 40).map(x => ({
    name: str_(x && x.name, 80), crewId: str_(x && x.crewId, 64), task: str_(x && x.task, 120), gear: str_(x && x.gear, 200),
    roles: Array.isArray(x && x.roles) ? x.roles.map(r => str_(r, 40)).filter(r => CREW_ROLES.indexOf(r) >= 0 || r === 'Nem helyszíni').slice(0, 8) : [],
    kind: x && (x.kind === 'other' || x.kind === 'fixed') ? x.kind : '', key: str_(x && x.key, 20), refCrewId: str_(x && x.refCrewId, 64), autoTask: !!(x && x.autoTask),
    amount: int_(x && x.amount, 0, FEE_MAX, 0), post: int_(x && x.post, 0, FEE_MAX, 0), rent: int_(x && x.rent, 0, FEE_MAX, 0),
    dayAmounts: x && x.dayAmounts && typeof x.dayAmounts === 'object' ? Object.keys(x.dayAmounts).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).slice(0, 31).reduce((o, k) => { o[k] = int_(x.dayAmounts[k], 0, FEE_MAX, 0); return o; }, {}) : undefined
  })).filter(x => x.crewId || x.name || x.task || x.gear || x.amount || x.rent);
}
function parseLinks_(raw) {   // további átadási linkek (a fő link mellett legfeljebb 4)
  let arr = raw; if (typeof raw === 'string') { try { arr = raw ? JSON.parse(raw) : []; } catch (e) { arr = []; } }
  return Array.isArray(arr) ? arr.map(x => str_(x, 500).trim()).filter(x => /^https:\/\/\S+$/i.test(x)).slice(0, 4) : [];
}
function parseCrewDays_(raw) {   // több napos projekt: ki melyik napokon dolgozik ({ crewId: [nap, …] })
  let o = raw; if (typeof raw === 'string') { try { o = raw ? JSON.parse(raw) : {}; } catch (e) { o = {}; } }
  const out = {}; if (!o || typeof o !== 'object') return out;
  Object.keys(o).slice(0, 60).forEach(k => { if (Array.isArray(o[k])) out[str_(k, 64)] = o[k].map(d => str_(d, 10)).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(0, 31); });
  return out;
}
/** Előadásrögzítés termenként: [{ id, name, er_total, er_close (db), er_crowd, er_slides (0/1) }] – üres = régi (összesített) adatok. */
const ROOM_CAMS_ = { er_total: 10, er_close: 10, er_crowd: 1, er_slides: 1 };
function parseRooms_(raw) {
  let o = raw; if (typeof raw === 'string') { try { o = raw ? JSON.parse(raw) : null; } catch (e) { o = null; } }
  if (!Array.isArray(o)) return null;
  const seen = {};
  return o.slice(0, 10).map(r => { const x = { id: str_(r && r.id, 12), name: str_(r && r.name, 60) }; Object.keys(ROOM_CAMS_).forEach(k => { x[k] = int_(r && r[k], 0, ROOM_CAMS_[k], 0); { const eq = r && r[k + '_eq']; x[k + '_eq'] = Array.isArray(eq) ? eq.slice(0, x[k]).map(v => str_(v, 64)) : []; const ln = r && r[k + '_lens']; x[k + '_lens'] = Array.isArray(ln) ? ln.slice(0, x[k]).map(v => str_(v, 64)) : []; } }); return x; })   // a terem kamerái (leltári eszközök)
    .filter(x => /^r[a-z0-9]{1,10}$/.test(x.id) && !seen[x.id] && (seen[x.id] = 1));
}
function roomsLegacy_(p, rooms) {   // a termekből számolt összesített mezők (naptár, régi nézetek)
  p.er_rooms = rooms.filter(r => Object.keys(ROOM_CAMS_).some(k => r[k] > 0)).length;   // csak a kamerás termek számítanak
  Object.keys(ROOM_CAMS_).forEach(k => { const mx = Math.max.apply(null, [0].concat(rooms.map(r => r[k]))); p[k] = mx > 0; if (ROOM_CAMS_[k] > 1) p[k + '_n'] = mx > 0 ? mx : 0; });
}
function parseEditTasks_(raw) {   // vágói feladatok: { crewId: [munka kulcsa, …] }
  let o = raw; if (typeof raw === 'string') { try { o = raw ? JSON.parse(raw) : {}; } catch (e) { o = {}; } }
  const out = {}; if (!o || typeof o !== 'object' || Array.isArray(o)) return out;
  Object.keys(o).slice(0, 30).forEach(k => { if (ID_RE.test(k) && Array.isArray(o[k])) out[k] = o[k].map(x => str_(x, 40)).filter(x => /^[a-z_0-9]+$/i.test(x)).slice(0, 30); });
  return out;
}
function parseNotes_(raw) {
  let o = raw; if (typeof raw === 'string') { try { o = raw ? JSON.parse(raw) : {}; } catch (e) { o = {}; } }
  const out = {}; if (!o || typeof o !== 'object' || Array.isArray(o)) return out;
  Object.keys(o).slice(0, 60).forEach(k => { const v = str_(o[k], 1000); if (ID_RE.test(k) && v) out[k] = v; });
  return out;
}
/* Bérelt eszközök (nem a leltárból): név, bérbeadó cég, ár. Az árat a szakember nem kapja meg. */
function parseRentals_(raw) {
  let arr = raw; if (typeof raw === 'string') { try { arr = raw ? JSON.parse(raw) : []; } catch (e) { arr = []; } }
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 60).map(x => ({ id: str_(x && x.id, 40), crewId: str_(x && x.crewId, 64), name: str_(x && x.name, 120), company: x && x.own ? '' : str_(x && x.company, 120), price: x && x.own ? 0 : int_(x && x.price, 0, FEE_MAX, 0), own: !!(x && x.own) }))
    .filter(x => x.name);
}
let CREW_MAP_CACHE_ = null;
/* ===================== Videónkénti vágói követés ===================== */
const VIDEO_KINDS_ = [['int_sarok', 'Interjúsarok videó'], ['interju', 'Kiállítói videó (imázsfilm)'], ['int_resztvevo', 'Résztvevői interjú'], ['aftermovie', 'Aftermovie'],
  ['short60', 'Short videó (40–60 mp)'], ['short30', 'Short videó (30–40 mp)'], ['short15', 'Short videó (15–20 mp)']];
const VIDEO_STATES_ = ['vagasra', 'vagas', 'ellen', 'leadva', 'jovahagyva', 'modositas'];
function parseVideos_(v) { let l = v; if (typeof v === 'string') { try { l = JSON.parse(v || '[]'); } catch (e) { l = []; } }
  return (Array.isArray(l) ? l : []).slice(0, 120).map(x => ({ id: str_(x && x.id, 40), k: str_(x && x.k, 30), name: str_(x && x.name, 120), editor: str_(x && x.editor, 64),
    st: x && x.st === 'modositas' ? 'vagas' : VIDEO_STATES_.indexOf(x && x.st) >= 0 ? x.st : 'vagasra', at: str_(x && x.at, 30),
    link: str_(x && x.link, 500), note: str_(x && x.note, 1000), rvTo: str_(x && x.rvTo, 120), rvBy: str_(x && x.rvBy, 120), rvAt: str_(x && x.rvAt, 30),
    fb: str_(x && x.fb, 1000), fbBy: str_(x && x.fbBy, 120), fbAt: str_(x && x.fbAt, 30), cn: x && x.cn ? 1 : 0, seenAt: str_(x && x.seenAt, 30), seenLast: str_(x && x.seenLast, 30), seenN: Math.max(0, Math.round(Number(x && x.seenN) || 0)),
    dn: (Array.isArray(x && x.dn) ? x.dn : []).slice(-300).map(k => str_(k, 60)).filter(Boolean),
    dnBy: (() => { const o = {}, src = x && x.dnBy && typeof x.dnBy === 'object' ? x.dnBy : {}; Object.keys(src).slice(-300).forEach(k => { const r = src[k]; if (r && typeof r === 'object') o[str_(k, 60)] = { by: str_(r.by, 120), at: str_(r.at, 30) }; }); return o; })(),   // ki és mikor pipálta ki   // kipipált (elvégzett) időkódos észrevételek: „<hozzászólás ideje>#<sorszám>”
    cm: (Array.isArray(x && x.cm) ? x.cm : []).slice(-100).map(c => ({ by: str_(c && c.by, 120), at: str_(c && c.at, 30), t: str_(c && c.t, 1000), ts: c && c.ts !== '' && c.ts != null && isFinite(Number(c.ts)) ? Math.max(0, Math.round(Number(c.ts))) : '' })).filter(c => c.t) })).filter(x => x.id); }   // fb: visszadobás indoka   // rv*: belső ellenőrzésre küldés
/** A megrendelt darabszámokból videósorok: a meglévők megmaradnak, a hiányzók létrejönnek, a még érintetlen (vágásra váró, vágó nélküli) fölösek törlődnek.
    Ha a projektnek pontosan egy vágója van, a vágó nélküli sorok az övéi. */
function videosEnsure_(p, cutters) {
  const cur = parseVideos_(p.videos), byId = {}; cur.forEach(x => { byId[x.id] = x; });
  const want = [];
  VIDEO_KINDS_.forEach(kn => { const n = Math.max(0, Math.min(40, Math.floor(Number(p[kn[0]]) || 0)));
    for (let i = 1; i <= n; i++) { const id = kn[0] + '-' + i, x = byId[id] || { id: id, k: kn[0], editor: '', st: 'vagasra', at: '' }; if (!x.cn) x.name = kn[1] + (n > 1 ? ' ' + i : ''); /* átnevezett videó neve megmarad */ want.push(x); } });
  const ids = {}; want.forEach(x => { ids[x.id] = 1; });
  cur.forEach(x => { if (!ids[x.id] && (x.st !== 'vagasra' || x.editor)) want.push(x); });   // már dolgozott rajta valaki: nem tűnik el
  const one = cutters && cutters.length === 1 ? cutters[0] : '';
  if (one) want.forEach(x => { if (!x.editor) x.editor = one; });
  return want;
}
/** Egy videó állapotának / vágójának módosítása. Vezetők mindent; a vágó csak a saját (vagy gazdátlan) sorainak vágási állapotát. a: {projectId, id, st?, editor?} */
/** Videósorok a régebbi (a videókövetés előtt mentett) aktív projekteknek is: a megrendelt darabszámokból; a vágó a vágói feladatkiosztásból (vagy az egyetlen vágó). */
/** Fiók nélküli értékesítő (munkatárs) jutalékai projektenként: kézi összeg, vagy kézi % × termelői alap. A szakember csak az összeget kapja meg. */
function mySalesComm_(cid) {
  if (!cid) return [];
  const pm = byId_(readAll_('projects'));
  return readAll_('deals').filter(d => d.stage === 'nyert' && d.ownerId === 'crew:' + cid).map(d => { const p = pm[d.projectId]; if (!p || p.status === 'lemondva') return null;
    const mp = String(d.commManual == null ? '' : d.commManual).trim(), amt = /^ft:/.test(mp) ? Number(mp.slice(3)) || 0 : mp !== '' && !isNaN(Number(mp)) ? Math.round(prodBase_(p) * Number(mp) / 100) : 0;
    return amt > 0 ? { projectId: p.id, name: sval_(p.name), date: sval_(p.date), endDate: sval_(p.endDate), amount: amt } : null; }).filter(Boolean);
}
function videosBackfill_() {
  const sh = sheetFor_('projects'), ca = readAll_('crewAssign');
  readAll_('projects').forEach(p => {
    if (p.status === 'atadva' || p.status === 'lemondva' || parseVideos_(p.videos).length) return;
    if (!VIDEO_KINDS_.some(kn => Number(p[kn[0]]) > 0)) return;
    const cutters = [...new Set(ca.filter(r => r.projectId === p.id && r.role === 'Vágó').map(r => String(r.crewId || '')))].filter(String);
    const vids = videosEnsure_(p, cutters), et = parseEditTasks_(p.editTasks);
    vids.forEach(x => { if (!x.editor) { const o = Object.keys(et).find(id => (et[id] || []).indexOf(x.k) >= 0); if (o) x.editor = o; } });
    if (!vids.length) return;
    withLock_(() => { const r = findRow_(sh, p.id); if (!r) return; const q = readRow_('projects', sh, r); if (parseVideos_(q.videos).length) return; q.videos = JSON.stringify(vids); putRow_('projects', sh, q, r); });
  });
  dbFlush_();
}
/** Belső ellenőrzésre küldés: a videó „Belső ellenőrzés” állapotba kerül, a link és a megjegyzés mentődik, a kiválasztott vezető e-mailt kap. */
const REVIEWERS_ = { ervin: 'ervin.egri@lumosmotion.com', david: 'david.zajacz@lumosmotion.com' };
function videoReview_(u, a) {
  a = a || {};
  const to = REVIEWERS_[String(a.to || '')]; if (!to) throw new Error('Válaszd ki, ki kapja az értesítést.');
  const link = str_(a.link, 500).trim(); if (!/^https?:\/\/\S+$/i.test(link)) throw new Error('Illeszd be a videó linkjét (https://…).');
  const note = str_(a.note, 1000).trim();
  const res = videoSet_(u, { projectId: a.projectId, id: a.id, st: 'ellen' });
  const pid = str_(a.projectId, 64), vid = str_(a.id, 40); let p, v;
  withLock_(() => { const sh = sheetFor_('projects'), row = findRow_(sh, pid); p = readRow_('projects', sh, row); const vids = parseVideos_(p.videos); v = vids.find(x => x.id === vid);
    if (v) { v.link = link; v.note = note; v.rvTo = to; v.rvBy = u.name; v.rvAt = now_(); }
    p.videos = JSON.stringify(vids); p.updatedAt = now_(); p.updatedBy = u.name; putRow_('projects', sh, p, row); dataBump_(); dbFlush_(); });
  const rv = SIG_DEFAULTS_[to] || { name: '' }, first = String(rv.name || '').split(' ').pop();
  const url = appUrl_() + '#p=' + pid + '&v=' + encodeURIComponent(vid);
  const text = 'Kedves ' + first + '!\n\n' + u.name + ' belső ellenőrzésre küldte: ' + (v ? v.name : 'videó') + ' – ' + p.name + '\n\nVideó: ' + link + (note ? '\n\nMegjegyzés:\n' + note : '') + '\n\nA projekt: ' + url + '\n\nA projekt videótáblájában megnézheted, jóváhagyhatod vagy visszadobhatod.';
  const html = '<p>Kedves ' + escapeHtml_(first) + '!</p><p><b>' + escapeHtml_(u.name) + '</b> belső ellenőrzésre küldte: <b>' + escapeHtml_(v ? v.name : 'videó') + '</b> – ' + escapeHtml_(p.name) + '</p><p>Videó: <a href="' + escapeHtml_(link) + '">' + escapeHtml_(link) + '</a></p>' + (note ? '<p><b>Megjegyzés:</b><br>' + escapeHtml_(note).replace(/\n/g, '<br>') + '</p>' : '') + '<p><a href="' + escapeHtml_(url) + '">A videó megnyitása</a> – a Vágás fülön jóváhagyhatod, vagy módosítást kérhetsz.</p>';
  if (a.noMail) return { project: projectView_(fullProject_(p), u), mail: false, name: v ? v.name : 'videó', pname: p.name, pid: pid, vid: vid, link: link };   // csoportos küldés: egy közös levél megy
  let mail = false; try { mail = gmailSend_(to, 'Belső ellenőrzésre vár: ' + (v ? v.name : 'videó') + ' – ' + p.name, text, { htmlBody: html, name: 'Lumos Motion Projekttervező' }); } catch (e) { Logger.log('Ellenőrzés e-mail hiba: ' + e); }
  logEvent_(u, 'Videó belső ellenőrzésre', p.name, (v ? v.name : '') + ' → ' + (rv.name || to));
  return { project: projectView_(fullProject_(p), u), mail: mail };
}
/** Több videó egyszerre belső ellenőrzésre – egyetlen e-mail az ellenőrzőnek. a: {to, note, items:[{projectId, id, link}]} */
function videoReviewBatch_(u, a) {
  a = a || {}; const to = REVIEWERS_[String(a.to || '')]; if (!to) throw new Error('Válaszd ki, ki kapja az értesítést.');
  const items = (Array.isArray(a.items) ? a.items : []).slice(0, 40); if (!items.length) throw new Error('Nincs kiválasztott videó.');
  items.forEach(x => { if (!/^https?:\/\/\S+$/i.test(String(x && x.link || '').trim())) throw new Error('Minden videóhoz illeszd be a linket (https://…).'); });
  const note = str_(a.note, 1000).trim(), done = [], projects = {};
  items.forEach(x => { const r = videoReview_(u, { to: a.to, note: note, projectId: x.projectId, id: x.id, link: x.link, noMail: true }); done.push(r); projects[r.pid] = r.project; });
  const rv = SIG_DEFAULTS_[to] || { name: '' }, first = String(rv.name || '').split(' ').pop(), pn = done.map(r => r.pname).filter((x, i, arr) => arr.indexOf(x) === i).join(', ');
  const text = 'Kedves ' + first + '!\n\n' + u.name + ' belső ellenőrzésre küldött ' + done.length + ' videót – ' + pn + ':\n\n' + done.map(r => '• ' + r.name + ': ' + r.link).join('\n') + (note ? '\n\nMegjegyzés:\n' + note : '') + '\n\nA projekt: ' + appUrl_() + '#p=' + done[0].pid + '\n\nA projekt videótáblájában megnézheted, jóváhagyhatod vagy visszadobhatod őket.';
  const html = '<p>Kedves ' + escapeHtml_(first) + '!</p><p><b>' + escapeHtml_(u.name) + '</b> belső ellenőrzésre küldött <b>' + done.length + ' videót</b> – ' + escapeHtml_(pn) + ':</p><ul>' + done.map(r => '<li><a href="' + escapeHtml_(appUrl_() + '#p=' + r.pid + '&v=' + encodeURIComponent(r.vid)) + '">' + escapeHtml_(r.name) + '</a></li>').join('') + '</ul>' + (note ? '<p><b>Megjegyzés:</b><br>' + escapeHtml_(note).replace(/\n/g, '<br>') + '</p>' : '') + '<p><a href="' + escapeHtml_(appUrl_() + '#p=' + done[0].pid) + '">A projekt megnyitása</a></p>';
  let mail = false; try { mail = gmailSend_(to, 'Belső ellenőrzésre vár: ' + done.length + ' videó – ' + pn, text, { htmlBody: html, name: 'Lumos Motion Projekttervező' }); } catch (e) { Logger.log('Ellenőrzés e-mail hiba: ' + e); }
  return { projects: Object.keys(projects).map(k => projects[k]), mail: mail, n: done.length };
}
/** Hozzászólás egy videóhoz (vezető vagy a projekt vágója); ts: másodperc a videóban, ha a lejátszóból időponthoz kötötték. A vágó e-mailt kap, ha más írt; ha ő írt, az ellenőrző. */
const pinStrip_ = t => String(t || '').replace(/\s*@\d{1,3}(?:\.\d)?,\d{1,3}(?:\.\d)?\]/g, ' – jelölés]');   // az e-mailben nincs emoji (a levelezők elrontják)   // a tű koordinátái az e-mailben nem kellenek
function videoComment_(u, a) {
  a = a || {};
  const pid = str_(a.projectId, 64), vid = str_(a.id, 40), mgr = u.role === 'admin' || u.role === 'editor', t = str_(a.text, 1000).trim();
  if (t.length < 1) throw new Error('Írj valamit a hozzászólásba.');
  if (!mgr && !readAll_('crewAssign').some(r => r.projectId === pid && r.crewId === u.crewId && r.role === 'Vágó')) throw new Error('FORBIDDEN: Csak a vezetők és a projekt vágója szólhat hozzá.');
  const ts = a.ts !== '' && a.ts != null && isFinite(Number(a.ts)) ? Math.max(0, Math.round(Number(a.ts))) : '';
  let p, v;
  withLock_(() => { const sh = sheetFor_('projects'), row = findRow_(sh, pid); if (!row) throw new Error('A projekt nem található.');
    p = readRow_('projects', sh, row); const vids = parseVideos_(p.videos); v = vids.find(x => x.id === vid); if (!v) throw new Error('A videó nem található.');
    if (v.st === 'leadva') throw new Error('Az ügyfél jóváhagyására váró videóhoz nem lehet hozzászólni.');
    if (!mgr && v.st !== 'vagas') throw new Error('A videó már le van adva – most nem lehet hozzászólni.');
    v.cm = (v.cm || []).concat([{ by: u.name, at: now_(), t: t, ts: ts }]).slice(-100);
    p.videos = JSON.stringify(vids); p.updatedAt = now_(); p.updatedBy = u.name; p.mutationId = Utilities.getUuid(); putRow_('projects', sh, p, row); dataBump_(); dbFlush_(); });
  try { const c = v.editor ? readAll_('crew').find(x => x.id === v.editor) : null, own = c && u.crewId && c.id === u.crewId;
    const to = own ? String(v.rvTo || '').trim() : c ? String(c.email || '').trim() : '';
    if (to && to.toLowerCase() !== String(u.email || '').toLowerCase()) { const url = appUrl_() + '#p=' + pid + '&v=' + encodeURIComponent(vid), tl = ts !== '' ? ' [' + Math.floor(ts / 60) + ':' + ('0' + ts % 60).slice(-2) + ']' : '';
      gmailSend_(to, 'Hozzászólás: ' + v.name + ' – ' + p.name, u.name + ' hozzászólt: ' + v.name + ' – ' + p.name + '\n\n' + tl.trim() + (tl ? ' ' : '') + pinStrip_(t) + '\n\n' + url,
        { htmlBody: '<p><b>' + escapeHtml_(u.name) + '</b> hozzászólt: <b>' + escapeHtml_(v.name) + '</b> – ' + escapeHtml_(p.name) + '</p><p style="padding:10px 12px;background:#f3f6fb;border-left:4px solid #2f6fdf">' + (tl ? '<b>' + escapeHtml_(tl.trim()) + '</b> ' : '') + escapeHtml_(pinStrip_(t)).replace(/\n/g, '<br>') + '</p><p><a href="' + escapeHtml_(url) + '">A videó megnyitása</a></p>', name: 'Lumos Motion Projekttervező' }); } } catch (e) { Logger.log('Hozzászólás e-mail hiba: ' + e); }
  logEvent_(u, 'Videó hozzászólás', p.name, v.name);
  return { project: projectView_(fullProject_(p), u) };
}
/** Hozzászólás törlése: mindenki csak a sajátját. a: {projectId, id, idx, at} – az at a véletlen rossz törlés ellen. */
function videoCommentDel_(u, a) {
  a = a || {};
  const pid = str_(a.projectId, 64), vid = str_(a.id, 40), idx = Math.floor(Number(a.idx)), at = str_(a.at, 30);
  let p;
  withLock_(() => { const sh = sheetFor_('projects'), row = findRow_(sh, pid); if (!row) throw new Error('A projekt nem található.');
    p = readRow_('projects', sh, row); const vids = parseVideos_(p.videos), v = vids.find(x => x.id === vid); if (!v) throw new Error('A videó nem található.');
    const kind = str_(a.kind, 10);
    if (kind === 'note') throw new Error('Az ellenőrzésre küldés megjegyzése nem törölhető.');
    if (kind === 'fb' || kind === 'note') {   // a régi visszadobási indok / az ellenőrzésre küldés megjegyzése
      const by = kind === 'fb' ? v.fbBy : v.rvBy, w = kind === 'fb' ? v.fbAt : v.rvAt;
      if (by !== u.name) throw new Error('FORBIDDEN: Csak a saját hozzászólásodat törölheted.'); if (String(w || '') !== at) throw new Error('A hozzászólás közben megváltozott – frissíts, és próbáld újra.');
      if (kind === 'fb') v.fb = ''; else v.note = '';
    } else {
    let k = (v.cm || [])[idx] && v.cm[idx].at === at && v.cm[idx].by === u.name ? idx : (v.cm || []).findIndex(c => c.at === at && c.by === u.name);   // az időbélyeg + szerző azonosít (a sorszám közben elcsúszhat)
    if (k < 0) { if ((v.cm || []).some(c => c.at === at)) throw new Error('FORBIDDEN: Csak a saját hozzászólásodat törölheted.'); k = -1; }
    if (k >= 0) v.cm.splice(k, 1);   // ha már nincs meg (pl. kétszer küldött törlés), nincs teendő
    } p.videos = JSON.stringify(vids); p.updatedAt = now_(); p.updatedBy = u.name; p.mutationId = Utilities.getUuid(); putRow_('projects', sh, p, row); dataBump_(); dbFlush_(); });
  logEvent_(u, 'Videó hozzászólás törölve', p.name, vid);
  return { project: projectView_(fullProject_(p), u) };
}
/** Időkódos észrevétel kipipálása (elvégezve): a vezető vagy a videó vágója. a: {projectId, id, key, on} */
function videoCmDone_(u, a) {
  a = a || {};
  const pid = str_(a.projectId, 64), vid = str_(a.id, 40), key = str_(a.key, 60), on = a.on === true || a.on === 'true';
  if (!key) throw new Error('Hiányzik az észrevétel azonosítója.');
  let p;
  withLock_(() => { const sh = sheetFor_('projects'), row = findRow_(sh, pid); if (!row) throw new Error('A projekt nem található.');
    p = readRow_('projects', sh, row); const vids = parseVideos_(p.videos), v = vids.find(x => x.id === vid); if (!v) throw new Error('A videó nem található.');
    const mgr = u.role === 'admin' || u.role === 'editor';
    if (!mgr && !(v.editor && v.editor === u.crewId)) throw new Error('FORBIDDEN: Az észrevételeket a vezető vagy a videó vágója pipálhatja ki.');
    if (!mgr && v.st !== 'vagas') throw new Error('A videó már le van adva – a pipákat most nem lehet módosítani.');
    const d = (v.dn || []).filter(k => k !== key); if (on) d.push(key); v.dn = d.slice(-300);
    v.dnBy = v.dnBy || {}; if (on) v.dnBy[key] = { by: u.name, at: now_() }; else delete v.dnBy[key];
    p.videos = JSON.stringify(vids); p.updatedAt = now_(); p.updatedBy = u.name; p.mutationId = Utilities.getUuid(); putRow_('projects', sh, p, row); dataBump_(); dbFlush_(); });
  return { project: projectView_(fullProject_(p), u) };
}
/** Küldés az ügyfélnek jóváhagyásra: a videó „Ügyfél jóváhagyására vár” állapotba kerül, a kapcsolattartó e-mailt kap a linkkel (és a megjegyzéssel). a: {projectId, id, to, link, note, text} */
function videoClient_(u, a) {
  a = a || {};
  if (u.role !== 'admin' && u.role !== 'editor') throw new Error('FORBIDDEN: Az ügyfélnek a projektvezető küldheti el.');
  const tos = str_(a.to, 600).split(/\s*,\s*/).map(x => x.trim()).filter(Boolean).slice(0, 8), to = tos.join(', '); if (!tos.length || !tos.every(x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))) throw new Error('Adj meg érvényes e-mail címet.');   // több címzett is lehet
  const link = str_(a.link, 500).trim(); if (!/^https?:\/\/\S+$/i.test(link)) throw new Error('Illeszd be a videó linkjét (https://…).');
  const pid = str_(a.projectId, 64), vid = str_(a.id, 40), note = str_(a.note, 1500).trim(); let text = str_(a.text, 4000).trim();
  const ids = (Array.isArray(a.ids) && a.ids.length > 1 ? a.ids : [vid]).map(x => str_(x, 40)).filter(Boolean).slice(0, 30);   // több videó egy levélben (közös jóváhagyó oldal)
  ids.forEach(id => videoSet_(u, { projectId: pid, id: id, st: 'leadva' }));
  let p, v, names = [];
  withLock_(() => { const sh = sheetFor_('projects'), row = findRow_(sh, pid); p = readRow_('projects', sh, row); const vids = parseVideos_(p.videos); v = vids.find(x => x.id === vid);
    ids.forEach(id => { const w = vids.find(x => x.id === id); if (!w) return; names.push(w.name); if (id === vid || ids.length === 1) w.link = link; w.seenAt = ''; w.seenLast = ''; w.seenN = 0; w.cm = (w.cm || []).concat([{ by: u.name, at: now_(), t: (clientMailLive_() ? 'Ügyfélnek elküldve (' + to + ')' : 'TESZT: az ügyfélnek szóló levél (' + to + ') csak neked ment ki') + (ids.length > 1 ? ' – ' + ids.length + ' videó egy levélben' : '') + (note ? ': ' + note : ''), ts: '' }]).slice(-100); });
    p.videos = JSON.stringify(vids); p.updatedAt = now_(); p.updatedBy = u.name; putRow_('projects', sh, p, row); dataBump_(); dbFlush_(); });
  const live = clientMailLive_(), sendTo = live ? to : String(u.email || '');   // TESZT: amíg nincs élesítve, a levél a küldőhöz megy, nem az ügyfélhez
  if (!sendTo) throw new Error('Tesztüzemben a levél neked menne, de nincs e-mail címed.');
  const pageUrl = FRONTEND_URL + '/' + clientShort_(clientToken_(Object.assign({ p: pid, v: vid, s: String(u.email || ''), c: to }, ids.length > 1 ? { vs: ids } : {})));   // rövid link: /v/<kód> → jóváhagyó oldal   // egyetlen link: a jóváhagyó oldal (ott nézi meg a videót, és ott dönt)
  text = text.split(link).join(pageUrl); if (text.indexOf(pageUrl) < 0) text = text + '\n\n' + pageUrl;
  const btn = '<a class="lmbtn" href="' + escapeHtml_(pageUrl) + '" style="display:inline-block;background:#f6efe1;border:1px solid #e3d3b0;border-radius:10px;padding:6px 22px 6px 10px;text-decoration:none;color:#1d2a38;font-family:Montserrat,Arial,sans-serif;line-height:1.2">'
    + '<img class="lmstamp" src="' + FRONTEND_URL + '/mail/stamp.png" width="48" height="48" alt="Lumos Motion" style="vertical-align:middle;border:0;display:inline-block">'
    + '<span style="display:inline-block;vertical-align:middle;border-left:1px solid #e3d3b0;padding-left:14px;margin-left:12px">'
    + '<span style="display:block;font-size:15px;font-weight:600;color:#1d2a38">' + (ids.length > 1 ? 'Videók' : 'Videó') + ' megtekintése &#9654;</span></span></a>';   // Lumos postabélyegzős „levél” gomb (a pecsét kép: /mail/stamp.png)
  const btnCss = '<style>.lmbtn:hover{background:#efe3c6!important;border-color:#d4b97c!important;box-shadow:0 4px 12px rgba(29,42,56,.16)}.lmbtn:active{background:#e6d4ab!important;box-shadow:inset 0 2px 5px rgba(29,42,56,.18)}.lmbtn .lmstamp{transition:transform .2s}.lmbtn:hover .lmstamp{transform:rotate(-8deg) scale(1.06)}.lmbtn:active .lmstamp{transform:rotate(-8deg) scale(.96)}</style>';
  const sig = signatureFor_(u), html = text.split(/\n/).map(l => l.trim() === pageUrl ? btn : escapeHtml_(l).replace(/(https?:\/\/\S+)/g, '<a href="$1">$1</a>')).join('<br>');
  const subj = (live ? '' : '[TESZT – valójában neki: ' + to + '] ') + (str_(a.subject, 200).trim() || (ids.length > 1 ? 'Elkészültek: ' + ids.length + ' videó – ' + p.name : 'Elkészült: ' + (v ? v.name : 'videó') + ' – ' + p.name));
  let mail = false; try { mail = gmailSend_(sendTo, subj, text + (sig ? '\n\n' + sig.text : ''), { htmlBody: btnCss + '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55">' + html + '</div>' + (sig ? '<br>' + sig.html : ''), name: u.name || 'Lumos Motion' }); } catch (e) { Logger.log('Ügyfél e-mail hiba: ' + e); }
  const tpl = ids.length > 1 ? '' : str_(a.tpl, 4000).trim();   // a kiküldött levél sablonként megmarad az ügyfélnél ({video}, {projekt}, {link} helyőrzőkkel)
  if (tpl) { try { const cn = String(p.client || '').trim().toLowerCase(), csh = sheetFor_('clients'); withLock_(() => { const c = readAll_('clients').find(x => String(x.name || '').trim().toLowerCase() === cn); if (!c) return; const r = findRow_(csh, c.id); if (!r) return; const q = readRow_('clients', csh, r); q.vidMail = tpl; q.updatedAt = now_(); putRow_('clients', csh, q, r); dbFlush_(); }); } catch (e) { Logger.log('Sablon mentése: ' + e); } }
  logEvent_(u, 'Videó ügyfélnek elküldve', p.name, (ids.length > 1 ? names.join(', ') : (v ? v.name : '')) + ' → ' + to);
  return { project: projectView_(fullProject_(p), u), mail: mail, test: !live };
}
/* Az ügyfél jóváhagyó oldala (jovahagyas.html): aláírt, 60 napig érvényes kulcs – bejelentkezés nélkül csak ezt az egy videót látja és döntheti el. */
/** Ügyfél-levelek élesen mennek (Ervin, 2026-11-09). Tesztüzem visszakapcsolása: Script Property LUMOS_CLIENT_MAIL_LIVE = '0' */
function clientMailLive_() { return PropertiesService.getScriptProperties().getProperty('LUMOS_CLIENT_MAIL_LIVE') !== '0'; }
function clientSecret_() { const P = PropertiesService.getScriptProperties(); let k = P.getProperty('LUMOS_CLIENT_SECRET'); if (!k) { k = Utilities.getUuid() + Utilities.getUuid(); P.setProperty('LUMOS_CLIENT_SECRET', k); } return k; }
function clientToken_(o) { o.x = Date.now() + 60 * 864e5; const b = Utilities.base64EncodeWebSafe(JSON.stringify(o)).replace(/=+$/, ''), sg = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(b, clientSecret_())).replace(/=+$/, ''); return b + '.' + sg; }
/** Rövid kód a hosszú, aláírt kulcshoz (Script Properties: CS_<kód>); a 60 napnál régebbieket kitakarítja. */
function clientShort_(tok) {
  const pr = PropertiesService.getScriptProperties(), abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let code = ''; for (let k = 0; k < 20; k++) { code = ''; const r = Utilities.getUuid().replace(/-/g, ''); for (let i = 0; i < 10; i++) code += abc[parseInt(r.substr(i * 3, 3), 16) % abc.length]; if (!pr.getProperty('CS_' + code)) break; }
  pr.setProperty('CS_' + code, tok);
  try { const all = pr.getProperties(), now = Date.now(); Object.keys(all).forEach(k => { if (k.indexOf('CS_') !== 0) return; try { const o = clientTokenRead_(all[k]); if (!o) pr.deleteProperty(k); } catch (e) { if (/lejárt/.test(String(e.message))) pr.deleteProperty(k); } }); } catch (e) { }
  return code;
}
function clientTokenRead_(t) { if (/^[A-Za-z0-9]{6,16}$/.test(String(t || ''))) { t = PropertiesService.getScriptProperties().getProperty('CS_' + t); if (!t) throw new Error('Érvénytelen link.'); }   // rövid link kódja
  const m = /^([\w-]+)\.([\w-]+)$/.exec(String(t || '')); if (!m) throw new Error('Érvénytelen link.');
  const sg = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(m[1], clientSecret_())).replace(/=+$/, ''); if (sg !== m[2]) throw new Error('Érvénytelen link.');
  const o = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(m[1] + '==='.slice((m[1].length + 3) % 4))).getDataAsString()); if (!o || !o.p || !o.v) throw new Error('Érvénytelen link.'); if (o.x && Date.now() > o.x) throw new Error('A link lejárt – kérj újat.'); return o; }
function clientVideo_(o) { const p = readAll_('projects').find(x => x.id === o.p); if (!p) throw new Error('A videó nem található.'); const v = parseVideos_(p.videos).find(x => x.id === o.v); if (!v) throw new Error('A videó nem található.'); return { p: p, v: v }; }
/* Vízjel a jóváhagyó lejátszón: pipával kérhető; a Sales Appból jött projekteknél alapból be van kapcsolva; kifizetés (teljes) után lekerül */
function wmActive_(p) { const b = readAll_('finBilling').find(x => x.projectId === p.id), w = String((b && b.watermark) || '');
  const sales = String(p.id || '').indexOf('sales-') === 0 || /Forrás: Sales App/.test(String(p.notes || ''));
  return (w === '1' || (w !== '0' && sales)) && p.payStatus !== 'teljes'; }
/* Megnyitotta-e az ügyfél: a jóváhagyó oldal betöltésekor (amíg jóváhagyásra vár) feljegyezzük – első és utolsó megnyitás, darabszám */
function clientSeen_(o) {
  try { withLock_(() => { const sh = sheetFor_('projects'), row = findRow_(sh, o.p); if (!row) return; const p = readRow_('projects', sh, row), vids = parseVideos_(p.videos); let ch = false;
    (o.vs && o.vs.length ? o.vs : [o.v]).forEach(id => { const v = vids.find(x => x.id === id);
      if (!v || v.st !== 'leadva') return; ch = true; const t = now_(), first = !v.seenAt; v.seenAt = v.seenAt || t; v.seenLast = t; v.seenN = (Number(v.seenN) || 0) + 1;
      if (first) v.cm = (v.cm || []).concat([{ by: clientFirst_(p, String(o.c || '').split(',')[0]), at: t, t: '👁️ Megnyitotta a jóváhagyó oldalt', ts: '' }]).slice(-100); });
    if (!ch) return; p.videos = JSON.stringify(vids); putRow_('projects', sh, p, row); dataBump_(); dbFlush_(); }); } catch (e) { Logger.log('clientSeen_: ' + e); }
}
function clientInfo_(t, seen, vid) { const o = clientTokenRead_(t); if (seen && !o.pv) clientSeen_(o);
  const stOf = st => st === 'jovahagyva' ? 'ok' : st === 'leadva' ? 'wait' : 'mod';
  if (o.vs && o.vs.length > 1) {   // több videó egy linken: a kiválasztott (vagy az első még döntésre váró) videó + a lista
    const p0 = readAll_('projects').find(x => x.id === o.p); if (!p0) throw new Error('A videó nem található.'); const all = parseVideos_(p0.videos);
    const items = o.vs.map(id => all.find(x => x.id === id)).filter(Boolean).map(x => ({ id: x.id, name: x.name, state: stOf(x.st) }));
    if (!items.length) throw new Error('A videó nem található.');
    const cur = (vid && items.find(x => x.id === vid)) || items.find(x => x.state === 'wait') || items[0]; o.v = cur.id;
    const r2 = clientVideo_(o); let wm2 = false; try { wm2 = wmActive_(r2.p); } catch (e) { }
    return { preview: !!o.pv, items: items.map(x => o.pv ? Object.assign({}, x, { state: 'wait' }) : x), cur: cur.id, wm: wm2, wmName: wm2 ? sval_(r2.p.client) : '', project: sval_(r2.p.name), video: r2.v.name, link: r2.v.link, state: o.pv ? 'wait' : stOf(r2.v.st) };
  }
  const r = clientVideo_(o); let wm = false; try { wm = wmActive_(r.p); } catch (e) { }
  if (o.pv) return { preview: true, wm: wm, wmName: wm ? sval_(r.p.client) : '', project: sval_(r.p.name), video: r.v.name, link: o.l || r.v.link, state: 'wait' };   // belső előnézet: nem számít megnyitásnak, döntés nincs
  return { wm: wm, wmName: wm ? sval_(r.p.client) : '', project: sval_(r.p.name), video: r.v.name, link: r.v.link, state: r.v.st === 'jovahagyva' ? 'ok' : r.v.st === 'leadva' ? 'wait' : 'mod' }; }
/** Belső előnézet a küldő ablakból: ugyanaz az oldal, amit az ügyfél kap – megnyitásnak nem számít, dönteni nem lehet. */
function clientPreview_(u, a) {
  if (u.role !== 'admin' && u.role !== 'editor') throw new Error('FORBIDDEN');
  const pid = str_(a && a.projectId, 64), vid = str_(a && a.id, 40), l = str_(a && a.link, 500).trim();
  clientVideo_({ p: pid, v: vid });
  return { url: FRONTEND_URL + '/' + clientShort_(clientToken_(Object.assign({ p: pid, v: vid, s: String(u.email || ''), c: '', pv: 1, l: /^https?:\/\/\S+$/i.test(l) ? l : '' }, Array.isArray(a.ids) && a.ids.length > 1 ? { vs: a.ids.map(x => str_(x, 40)).slice(0, 30) } : {}))) };
}
/* Az ügyfél megjelenő neve: csak a keresztneve (a kapcsolattartó nevéből, ha az e-mail egyezik; különben az e-mail cím elejéből) – e-mail cím nem látszik */
function clientFirst_(p, em) { em = String(em || '').trim().toLowerCase(); const cn = String(p && p.contactName || '').trim();
  if (cn && (!em || String(p.contactEmail || '').trim().toLowerCase() === em)) return cn.split(/\s+/).pop();
  const lp = em.split('@')[0].split(/[._-]/)[0]; return lp ? lp.charAt(0).toUpperCase() + lp.slice(1) : 'Ügyfél'; }
function clientDecide_(t, d, fb, vid) {
  if (clientTokenRead_(t).pv) throw new Error('Ez csak előnézet – itt a gombok nem küldenek semmit.');
  const o = clientTokenRead_(t); if (o.vs && o.vs.length > 1) { vid = str_(vid, 40); if (o.vs.indexOf(vid) < 0) throw new Error('Válaszd ki a videót.'); o.v = vid; }   // közös link: a kiválasztott videóról dönt
  const r = clientVideo_(o); fb = str_(fb, 1500).trim();
  if (d === 'note') {   // jóváhagyás után az ügyfél még üzenhet (nem kötelező)
    throw new Error('Üzenetet a jóváhagyással együtt tudsz küldeni.'); if (fb.length < 2) throw new Error('Írd be az üzenetedet.');
    const nm = clientFirst_(r.p, String(o.c || '').split(',')[0]);
    withLock_(() => { const sh = sheetFor_('projects'), row = findRow_(sh, o.p); if (!row) return; const p = readRow_('projects', sh, row), vids = parseVideos_(p.videos), v = vids.find(x => x.id === o.v); if (!v) return;
      v.cm = (v.cm || []).concat([{ by: nm, at: now_(), t: '💬 ' + fb, ts: '' }]).slice(-100); p.videos = JSON.stringify(vids); putRow_('projects', sh, p, row); dataBump_(); dbFlush_(); });
    try { if (o.s) { const subj = 'Üzenet az ügyféltől (jóváhagyás után): ' + r.v.name + ' – ' + r.p.name, url = appUrl_() + '#p=' + o.p + '&v=' + encodeURIComponent(o.v);
        gmailSend_(o.s, subj, subj + '\n\n' + fb + '\n\n' + url, { htmlBody: '<p><b>' + escapeHtml_(subj) + '</b></p><p style="padding:10px 12px;background:#eaf7ef;border-left:4px solid #2e9e62">' + escapeHtml_(fb).replace(/\n/g, '<br>') + '</p><p><a href="' + escapeHtml_(url) + '">A videó megnyitása</a></p>', name: 'Lumos Motion Projekttervező' }); } } catch (e) { Logger.log('Ügyfél-üzenet értesítés: ' + e); }
    return Object.assign(clientInfo_(t, false, o.v), { noted: true });
  }
  if (r.v.st !== 'leadva') return clientInfo_(t, false, o.v);   // már döntöttek (vagy visszakerült az utómunkába)
  const who = { id: 'client', name: clientFirst_(r.p, String(o.c || '').split(',')[0]), email: '', role: 'editor', crewId: '' };
  if (d === 'ok') { videoSet_(who, { projectId: o.p, id: o.v, st: 'jovahagyva' });
    if (fb) withLock_(() => { const sh = sheetFor_('projects'), row = findRow_(sh, o.p); if (!row) return; const p = readRow_('projects', sh, row), vids = parseVideos_(p.videos), v = vids.find(x => x.id === o.v); if (!v) return;
      v.cm = (v.cm || []).concat([{ by: who.name, at: now_(), t: '💬 ' + fb, ts: '' }]).slice(-100); p.videos = JSON.stringify(vids); putRow_('projects', sh, p, row); dataBump_(); dbFlush_(); }); }   // jóváhagyáshoz írt üzenet
  else if (d === 'mod') { if (fb.length < 3) throw new Error('Írd le röviden, mit módosítsunk.'); videoSet_(who, { projectId: o.p, id: o.v, st: 'vagas', fb: fb }); }
  else throw new Error('Ismeretlen döntés.');
  try { if (o.s) { const subj = (d === 'ok' ? 'Az ügyfél jóváhagyta: ' : 'Az ügyfél módosítást kér: ') + r.v.name + ' – ' + r.p.name, url = appUrl_() + '#p=' + o.p + '&v=' + encodeURIComponent(o.v);
      gmailSend_(o.s, subj, subj + (fb ? '\n\n' + fb : '') + '\n\n' + url, { htmlBody: '<p><b>' + escapeHtml_(subj) + '</b></p>' + (fb ? '<p style="padding:10px 12px;background:#fff4f2;border-left:4px solid #d93025">' + escapeHtml_(fb).replace(/\n/g, '<br>') + '</p>' : '') + '<p><a href="' + escapeHtml_(url) + '">A videó megnyitása</a></p>', name: 'Lumos Motion Projekttervező' }); } } catch (e) { Logger.log('Ügyfél-döntés értesítés: ' + e); }
  return clientInfo_(t, false, o.v);
}
let FB_MAIL_ = null;
function videoSet_(u, a) {
  a = a || {};
  const pid = str_(a.projectId, 64), vid = str_(a.id, 40), mgr = u.role === 'admin' || u.role === 'editor';
  const isCutter = readAll_('crewAssign').some(r => r.projectId === pid && r.crewId === u.crewId && r.role === 'Vágó');
  if (!mgr && !isCutter) throw new Error('FORBIDDEN: Csak a projekt vágója módosíthatja a videók állapotát.');
  let p, changed = '';
  withLock_(() => {
    const sh = sheetFor_('projects'), row = findRow_(sh, pid); if (!row) throw new Error('A projekt nem található.');
    p = readRow_('projects', sh, row);
    if (p.status === 'atadva' || p.status === 'lemondva') throw new Error('A projekt már le van zárva.');
    const vids = parseVideos_(p.videos), v = vids.find(x => x.id === vid); if (!v) throw new Error('A videó nem található.');
    if (a.editor !== undefined) {
      if (!mgr) throw new Error('FORBIDDEN: A vágót a projektvezető jelöli ki.');
      const ed = str_(a.editor, 64); if (ed && !readAll_('crew').some(c => c.id === ed)) throw new Error('Ismeretlen szakember.');
      v.editor = ed; changed += 'vágó: ' + ed;
    }
    if (a.name !== undefined) { if (!mgr) throw new Error('FORBIDDEN: A videó nevét a projektvezető módosíthatja.'); const nm = str_(a.name, 120).trim(); if (!nm) throw new Error('Adj nevet a videónak.'); v.name = nm; v.cn = 1; changed += (changed ? ', ' : '') + 'név: ' + nm; }
    if (a.link !== undefined && a.st === undefined) {   // új link (pl. lejárt / forgalmi limites pCloud-link helyett): a vezető vagy a videó vágója
      if (!mgr && !(v.editor && v.editor === u.crewId)) throw new Error('FORBIDDEN: A linket a vezető vagy a videó vágója cserélheti.');
      if (v.st !== 'vagas' && !(mgr && !v.link)) throw new Error('Linket csak „Utómunka alatt” állapotban lehet beilleszteni (vagy belső ellenőrzésre küldéskor).');   // a vezető a hiányzó linket bármikor pótolhatja
      const ln = String(a.link || '').trim(); if (!/^https?:\/\/\S+$/i.test(ln)) throw new Error('Illeszd be a videó linkjét (https://…).');
      v.link = str_(ln, 500); changed += (changed ? ', ' : '') + 'új link';
    }
    if (a.st !== undefined) {
      if (VIDEO_STATES_.indexOf(a.st) < 0) throw new Error('Ismeretlen állapot.');
      if (v.st === 'jovahagyva' && a.st !== 'jovahagyva' && u.role !== 'admin') throw new Error('A jóváhagyott videót csak az ügyvezető veheti vissza.');
      if (a.st === 'jovahagyva' && !v.link && !(a.link && /^https?:\/\/\S+$/i.test(String(a.link).trim()))) throw new Error('Jóváhagyottnak csak linkkel jelölhető a videó.');
      if (!mgr && (['vagas', 'ellen'].indexOf(a.st) < 0 || v.st === 'jovahagyva' || v.st === 'leadva' || (v.editor && v.editor !== u.crewId))) throw new Error('FORBIDDEN: ezt az állapotot nem állíthatod be.');
      if (mgr && (a.st === 'modositas' || a.st === 'vagas') && a.fb) { v.fb = str_(a.fb, 1000); v.fbBy = u.name; v.fbAt = now_(); v.cm = (v.cm || []).concat([{ by: u.name, at: v.fbAt, t: '↩ ' + v.fb, ts: '' }]).slice(-100); FB_MAIL_ = { v: v, by: u.name }; }   // visszadobás indokkal → a vágó e-mailt kap
      if (mgr && a.link !== undefined && /^https?:\/\/\S+$/i.test(String(a.link).trim())) v.link = str_(String(a.link).trim(), 500);   // e-mail nélküli áthelyezésnél is a videó linkje
      v.st = a.st; if (a.st === 'leadva') v.at = today_(); if (!v.editor && !mgr) v.editor = u.crewId; changed += (changed ? ', ' : '') + v.name + ': ' + a.st;
    }
    p.videos = JSON.stringify(vids);
    const allDel = vids.length > 0 && vids.every(x => x.st === 'leadva' || x.st === 'jovahagyva');   // minden videó leadva → a projekt jóváhagyásra vár; ha újra nyitnak egyet, vissza az utómunkába
    if (p.status === 'utomunka' && allDel) { p.status = 'jovahagyas'; p.leadvaAt = p.leadvaAt || today_();
      const sd = String(p.stepsDone || '').split(',').filter(String); ['tervezes', 'helyszin', 'utomunka'].forEach(x => { if (sd.indexOf(x) < 0) sd.push(x); }); p.stepsDone = sd.join(','); }
    else if ((p.status === 'jovahagyas' || p.status === 'leadva') && vids.length && !allDel) { p.status = 'utomunka'; p.leadvaAt = ''; }
    p.updatedAt = now_(); p.updatedBy = u.name; p.mutationId = Utilities.getUuid();
    putRow_('projects', sh, p, row); dataBump_(); dbFlush_();
  });
  logEvent_(u, 'Videó állapota', p.name, changed);
  if (FB_MAIL_) { const fm = FB_MAIL_; FB_MAIL_ = null; try { const c = readAll_('crew').find(x => x.id === fm.v.editor), em = c && String(c.email || '').trim();
    if (em) { const url = appUrl_() + '#p=' + pid + '&v=' + encodeURIComponent(fm.v.id), first = String(c.name || '').split(' ').pop();
      gmailSend_(em, 'Módosítást kér: ' + fm.v.name + ' – ' + p.name, 'Kedves ' + first + '!\n\n' + fm.by + ' átnézte, és módosítást kér: ' + fm.v.name + ' – ' + p.name + (fm.v.fb ? '\n\n' + pinStrip_(fm.v.fb) : '') + '\n\n' + url,
        { htmlBody: '<p>Kedves ' + escapeHtml_(first) + '!</p><p><b>' + escapeHtml_(fm.by) + '</b> átnézte, és módosítást kér: <b>' + escapeHtml_(fm.v.name) + '</b> – ' + escapeHtml_(p.name) + '</p>' + (fm.v.fb ? '<p style="padding:10px 12px;background:#fff4f2;border-left:4px solid #d93025">' + escapeHtml_(pinStrip_(fm.v.fb)).replace(/\n/g, '<br>') + '</p>' : '') + '<p><a href="' + escapeHtml_(url) + '">A videó megnyitása</a></p>', name: 'Lumos Motion Projekttervező' }); } } catch (e) { Logger.log('Visszadobás e-mail hiba: ' + e); } }
  return { project: projectView_(fullProject_(p), u) };
}
function projectView_(p, u) {
  const q = Object.assign({}, p);
  const role = u && u.role;
  if (role === 'crew' && q.lead !== u.crewId) {   // szakember: kapcsolattartóként a projektvezetőt látja (a projektvezető az ügyfélét)
    const m = CREW_MAP_CACHE_ || (CREW_MAP_CACHE_ = byId_(readAll_('crew'))), l = m[q.lead];
    q.contactName = l ? l.name + ' (projektvezető)' : ''; q.contactPhone = l ? String(l.phone || '') : ''; q.contactEmail = l ? String(l.email || '') : '';
  }
  // személyes jegyzetek: a szakember csak a sajátját kapja meg
  const notes = parseNotes_(q.crewNotes);
  q.crewNotes = role === 'crew' ? (u.crewId && notes[u.crewId] ? { [u.crewId]: notes[u.crewId] } : {}) : notes;
  q.crewDays = parseCrewDays_(q.crewDays);
  q.deliveryLinks = parseLinks_(q.deliveryLinks);
  q.videos = parseVideos_(q.videos); if (role === 'crew') q.videos = q.videos.filter(x => u.crewId && x.editor === u.crewId).map(x => Object.assign({}, x, { seenAt: '', seenLast: '', seenN: 0, cm: (x.cm || []).filter(c => !/^👁️ Megnyitotta a jóváhagyó oldalt/.test(String(c.t || ''))).map(c => Object.assign({}, c, { t: String(c.t || '').replace(/\s*\([^()]*@[^()]*\)/g, '').replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '…') })) }));   // a vágó nem látja az ügyfél e-mail címét   // a vágó csak a saját videóit látja
  q.editTasks = parseEditTasks_(q.editTasks);
  q.recRooms = parseRooms_(q.recRooms);
  q.rentals = parseRentals_(q.rentals).map(r => role === 'crew' ? { id: r.id, crewId: r.crewId, name: r.name, company: r.company, own: r.own } : r);
  if (!q.status || q.status === 'egyeztetes') q.status = 'tervezes';   // az „Egyeztetés” lépés megszűnt: a tervezés az első
  if (role === 'admin') { const v = Number(q.quotePrice); q.projectValue = q.quotePrice === '' || q.quotePrice == null || !isFinite(v) ? null : v; q.extras = parseExtras_(q.extras); } else delete q.extras;
  delete q.quotePrice;
  if (role === 'admin' || role === 'editor') q.fees = parseFees_(q.fees);
  else { const mine = role === 'crew' && u.crewId ? parseFees_(q.fees).find(f => f.crewId === u.crewId) : null; if (mine && mine.amount) q.myFee = { amount: mine.amount, dayAmounts: mine.dayAmounts }; delete q.fees; }   // a szakember csak a saját díját látja
  // díjcsökkentések: vezetők mindet, a szakember csak a saját, jóváhagyott tételeit látja
  const pens = parsePen_(q.penalties);
  q.penalties = role === 'crew' ? pens.filter(x => x.crewId === u.crewId && x.status === 'approved').map(x => Object.assign({}, x, { copyEmail: '' })) : (role === 'admin' || role === 'editor' ? pens : []);
  // termelői keret: az ügyvezető a beállítást (% vagy Ft) látja, a termelési vezető csak a kiszámolt forintösszeget
  const mode = q.budgetMode === 'pct' ? 'pct' : q.budgetMode === 'ft' ? 'ft' : '', bv = Number(q.budgetVal);
  const val = Number(p.quotePrice);
  const budgetFt = !mode || q.budgetVal === '' || q.budgetVal == null || !isFinite(bv) ? null
    : mode === 'pct' ? (isFinite(val) && val > 0 ? Math.round(prodBase_(p) * bv / 100) : null) : Math.round(bv);
  if (role === 'admin') { q.budgetMode = mode; q.budgetVal = mode && isFinite(bv) && q.budgetVal !== '' ? bv : null; q.budgetFt = budgetFt; }
  else { delete q.budgetMode; delete q.budgetVal; if (role === 'editor') q.budgetFt = budgetFt; }
  if (role === 'admin' || role === 'editor') q.crewFinal = parseCrewFinal_(q.crewFinal); else delete q.crewFinal;
  { let ef = null; try { ef = q.eqFinal ? JSON.parse(q.eqFinal) : null; } catch (e) {} q.eqFinal = role === 'admin' || role === 'editor' ? ef : null; }
  if (role === 'crew') { delete q.client; delete q.clientTax; delete q.clientAddress; }   // a szakember nem látja az ügyfelet
  if (role !== 'admin') delete q.payStatus;   // a fizetési állapotot csak az ügyvezető látja
  const request = parseBudgetRequest_(q.budgetRequest);
  if (role === 'admin' || role === 'editor') q.budgetRequest = request;
  else delete q.budgetRequest;
  return q;
}

function fullProject_(p) {
  const q = Object.assign({}, p);
  q.crew = readAll_('crewAssign').filter(r => r.projectId === p.id).map(r => ({ crewId: r.crewId, role: r.role }));
  q.equipment = readAll_('eqAssign').filter(r => r.projectId === p.id).map(r => ({ itemId: r.itemId, qty: r.qty || 1, crewId: r.crewId || '' }));
  delete q.mutationId;
  return q;
}

/* ===================== CSAPAT VÉGLEGESÍTÉSE ===================== */
/* A beosztott stáb csak a „Csapat véglegesítése” gombra kerül be a projekt naptár-eseményébe vendégként.
   Ekkor minden tag e-mailt kap az appból, és a Google Naptár is értesíti (ha a Calendar speciális szolgáltatás be van kapcsolva). */
function parseCrewFinal_(raw) {
  let x = raw; if (typeof raw === 'string') { try { x = JSON.parse(raw || 'null'); } catch (e) { return null; } }
  if (!x || !x.at || !Array.isArray(x.ids)) return null;
  const sigs = {}; if (x.sigs && typeof x.sigs === 'object') Object.keys(x.sigs).forEach(k => { sigs[str_(k, 64)] = str_(x.sigs[k], 2000); });
  return { at: str_(x.at, 30), by: str_(x.by, 120), ids: x.ids.map(i => str_(i, 64)).filter(Boolean), notified: Array.isArray(x.notified) ? x.notified.map(n => str_(n, 120)) : [], sentTo: Array.isArray(x.sentTo) ? x.sentTo.slice(0, 60).map(o => ({ name: str_(o && o.name, 120), email: str_(o && o.email, 160) })) : [], sigs: sigs };
}
/* Egy tag „lenyomata”: szerepek, eszközök, bérelt/saját eszközök, napok. Ha változik, újra értesítjük.
   Ugyanez a számítás fut a felületen is (core.js: crewSig), hogy a „módosult” jelzés egyezzen. */
function sigCore_(s) { const a = String(s || '').split('|'); return (a[0] || '') + '|' + (a[3] || ''); }
function crewSig_(p, cid) {
  const roles = (p.lead === cid ? ['Projektvezető'] : []).concat((p.crew || []).filter(a => a.crewId === cid).map(a => a.role)).sort();
  const eq = (p.equipment || []).filter(e => (e.crewId || '') === cid).map(e => e.itemId + 'x' + (Number(e.qty) || 1)).sort();
  const rent = parseRentals_(p.rentals).filter(r => (r.crewId || '') === cid).map(r => r.name).sort();
  const days = (parseCrewDays_(p.crewDays)[cid] || []).slice().sort();
  return roles.join('+') + '|' + eq.join(',') + '|' + rent.join(',') + '|' + days.join(',');
}
function crewMembers_(p) {
  const crewMap = byId_(readAll_('crew')), roles = {};
  if (p.lead && crewMap[p.lead]) roles[p.lead] = ['Projektvezető'];
  (p.crew || []).forEach(c => { if (crewMap[c.crewId] && c.role !== 'Értékesítő') (roles[c.crewId] = roles[c.crewId] || []).push(c.role); });   /* az értékesítő nem kap beosztásos levelet / naptármeghívót */
  const days = parseCrewDays_(p.crewDays);
  return Object.keys(roles).map(id => ({ id: id, name: crewMap[id].name, phone: crewMap[id].phone || '', email: String(crewMap[id].email || '').trim().toLowerCase(), roles: roles[id], days: days[id] || [] }));
}
/* ===== E-mail kapcsoló: amíg nincs bekapcsolva (Beállítások → E-mail értesítések), az app SEMMILYEN e-mailt nem küld:
   sem a szakembereknek, sem az ügyfeleknek (számlázz.hu), sem naptár-meghívót. Alapértelmezés: kikapcsolva. */
const MAIL_ON_PROPERTY = 'LUMOS_PM_MAIL_ON';
/* E-mail értesítések: főkapcsoló + típusonként külön kapcsoló (alapból mind be, ha a főkapcsoló be van kapcsolva) */
const MAIL_CATS_PROPERTY = 'LUMOS_PM_MAIL_CATS';
const MAIL_CATS_ = ['assign', 'calendar', 'eqlist', 'penalty', 'penAdmin', 'invoice', 'invite', 'payStatement'];
function mailCats_() { let o = {}; try { o = JSON.parse(PropertiesService.getScriptProperties().getProperty(MAIL_CATS_PROPERTY) || '{}') || {}; } catch (e) { o = {}; } const out = {}; MAIL_CATS_.forEach(k => { out[k] = o[k] !== false; }); return out; }
const MAIL_CC_PROPERTY = 'LUMOS_PM_MAIL_CC';
const MAIL_CC_DEFAULT_ = { assign: [], eqlist: ['actor'], penalty: [], penAdmin: [], payStatement: [] };   // másolat (CC): admin = ügyvezetők, editor = termelési vezetők, actor = aki a műveletet végzi
function mailCc_() { let o = {}; try { o = JSON.parse(PropertiesService.getScriptProperties().getProperty(MAIL_CC_PROPERTY) || '{}') || {}; } catch (e) { o = {}; }
  const out = {}; Object.keys(MAIL_CC_DEFAULT_).forEach(k => { out[k] = Array.isArray(o[k]) ? o[k].filter(x => ['admin', 'editor', 'actor'].indexOf(x) >= 0) : MAIL_CC_DEFAULT_[k].slice(); }); return out; }
function mailCcList_(cat, actor) {
  const want = mailCc_()[cat] || []; if (!want.length) return [];
  const out = []; if (want.indexOf('actor') >= 0 && actor) out.push(String(actor).toLowerCase());
  try { loadUsers_().forEach(x => { if (!x.disabled && x.email && want.indexOf(x.role) >= 0) out.push(String(x.email).toLowerCase()); }); } catch (e) { }
  return out.filter((m, i) => out.indexOf(m) === i);
}
function mailOn_(cat) { try { if (PropertiesService.getScriptProperties().getProperty(MAIL_ON_PROPERTY) !== '1') return false; return !cat || mailCats_()[cat] !== false; } catch (e) { return false; } }
function gmailSend_(to, subject, text, opts, cat) {
  opts = opts || {}; const actor = opts.__actor; delete opts.__actor;
  if (!mailOn_(cat)) { Logger.log('E-mail szünetel, nem ment ki: ' + to + ' – ' + subject); return false; }
  if (cat) { const toL = String(to).toLowerCase().split(','), cc = mailCcList_(cat, actor).concat(opts.cc ? String(opts.cc).split(',') : []).map(x => x.trim().toLowerCase()).filter(x => x && toL.indexOf(x) < 0);
    const uniq = cc.filter((m, k) => cc.indexOf(m) === k); if (uniq.length) opts.cc = uniq.join(','); else delete opts.cc; }
  GmailApp.sendEmail(to, subj_(subject), text, opts); return true;
}
function setMail_(u, a) {
  a = a || {};
  if (a.cat && Array.isArray(a.cc)) {
    if (!MAIL_CC_DEFAULT_[a.cat]) throw new Error('Ehhez a típushoz nem állítható másolat.');
    const c = mailCc_(); c[a.cat] = a.cc.filter(x => ['admin', 'editor', 'actor'].indexOf(x) >= 0); PropertiesService.getScriptProperties().setProperty(MAIL_CC_PROPERTY, JSON.stringify(c));
    logEvent_(u, 'E-mail másolat', a.cat, c[a.cat].join(', ') || 'nincs');
  } else if (a.cat) {
    if (MAIL_CATS_.indexOf(a.cat) < 0) throw new Error('Ismeretlen értesítéstípus.');
    const c = mailCats_(); c[a.cat] = !!a.on; PropertiesService.getScriptProperties().setProperty(MAIL_CATS_PROPERTY, JSON.stringify(c));
    logEvent_(u, 'E-mail értesítések', a.cat, a.on ? 'bekapcsolva' : 'kikapcsolva');
  } else {
    PropertiesService.getScriptProperties().setProperty(MAIL_ON_PROPERTY, a.on ? '1' : '0');
    logEvent_(u, 'E-mail értesítések', '', a.on ? 'bekapcsolva' : 'kikapcsolva');
  }
  return { mailOn: mailOn_(), mailCats: mailCats_(), mailCc: mailCc_() };
}
function calGuestsSet_(ev, emails, allCrewEmails) {   // vendéglista beállítása; a nem stábhoz tartozó vendégekhez (pl. ügyfél) nem nyúlunk
  const want = {}; emails.forEach(m => { want[m] = 1; });
  if (typeof Calendar !== 'undefined' && Calendar.Events) {   // speciális szolgáltatás: a Google értesítést is küld (sendUpdates: all)
    const eid = String(ev.getId()).replace(/@google\.com$/, '');
    const CID = evCalId_(ev), cur = Calendar.Events.get(CID, eid);
    const keep = (cur.attendees || []).filter(x => !allCrewEmails[String(x.email || '').toLowerCase()] || want[String(x.email || '').toLowerCase()]);
    const have = {}; keep.forEach(x => { have[String(x.email || '').toLowerCase()] = 1; });
    const added = emails.filter(m => !have[m]), removed = (cur.attendees || []).length - keep.length + added.length;
    if (!added.length && !removed) return false;   // nincs változás a vendéglistában: nem frissítünk, így senki nem kap újabb értesítőt
    added.forEach(m => keep.push({ email: m }));
    Calendar.Events.patch({ attendees: keep }, CID, eid, { sendUpdates: 'none' });   // a Google nem küld külön meghívólevelet – az értesítés a saját beosztásos levelünk (benne a naptárlinkkel)
    return false;
  }
  if (!mailOn_('calendar')) return false;   // speciális szolgáltatás nélkül (tartalék): a vendégek felvétele értesítést küldhet – kikapcsolt naptárlevélnél kihagyjuk
  const have = {}; ev.getGuestList().forEach(g => { have[String(g.getEmail()).toLowerCase()] = 1; });
  Object.keys(want).forEach(m => { if (!have[m]) ev.addGuest(m); });
  Object.keys(have).forEach(m => { if (allCrewEmails[m] && !want[m]) ev.removeGuest(m); });
  return false;
}
function calEventLink_(ev) {   // a naptárbejegyzés megnyitása a Google Naptárban
  const eid = String(ev.getId()).replace(/@google\.com$/, '');
  const CID = evCalId_(ev);
  try { if (typeof Calendar !== 'undefined' && Calendar.Events) { const x = Calendar.Events.get(CID, eid); if (x && x.htmlLink) return x.htmlLink; } } catch (e) {}
  return 'https://calendar.google.com/calendar/event?eid=' + Utilities.base64EncodeWebSafe(eid + ' ' + CID).replace(/=+$/, '');
}
/** A szakember helyszíni feladatai a beosztó levélbe: előadásrögzítés termenként (kameraszög + kamera / objektív), kreatív kamera, fotózás. */
function siteTasks_(p, cid) {
  const et = parseEditTasks_(p.editTasks), mine = et[cid] || [], out = [];
  if (!mine.length) return out;
  let inv = {}; try { readAll_('inventory').forEach(x => { inv[x.id] = x.name; }); } catch (e) { }
  const RL = { er_total: 'Teljes alakos kamera', er_close: 'Közeli kamera', er_crowd: 'Közönség kamera', er_slides: 'Diák rögzítése / kivetítése' };
  const rooms = parseRooms_(p.recRooms) || [], recs = [];
  rooms.forEach((r, i) => {
    const legacy = i === 0 && Object.keys(RL).some(k => mine.indexOf('f_' + k) >= 0);
    const isOp = mine.indexOf('f_' + r.id + '_op') >= 0 || legacy || Object.keys(RL).some(k => mine.indexOf('f_' + r.id + '_' + k) >= 0);
    const cs = [];
    Object.keys(RL).forEach(k => {
      const n = Number(r[k]) || 0, eq = Array.isArray(r[k + '_eq']) ? r[k + '_eq'] : [], ln = Array.isArray(r[k + '_lens']) ? r[k + '_lens'] : [];
      for (let j = 0; j < n; j++) {
        if (!isOp) continue;   // a helyszín összes kamerája a helyszín operatőréé
        const dev = [inv[eq[j]], inv[ln[j]]].filter(Boolean).join(' + ');
        cs.push(RL[k] + (dev ? ' (' + dev + ')' : ''));
      }
    });
    if (cs.length) { if (rooms.length > 1 || r.name) recs.push((i + 1) + '. helyszín' + (r.name ? ' – ' + r.name : '') + ':'); cs.forEach(x => recs.push(x)); }
  });
  if (recs.length) out.push(['Előadásrögzítés', recs.join('\n')]);   // minden kamera / eszköz külön sorban
  if (mine.indexOf('f_er_creative') >= 0 && p.er_creative === true) out.push(['Kreatív videózás', 'kreatív kamera']);
  if (mine.indexOf('f_x_foto') >= 0 && p.x_foto === true) out.push(['Fotózás', Number(p.foto_db) > 0 ? p.foto_db + ' db fotó' : 'rendezvényfotózás']);
  return out;
}
function crewFinalBuild_(p, m, lead, link, changed, cm, u) {
  const sig = signatureFor_(u), sigText = sig ? sig.text : 'Üdvözlettel,\n' + ((u && u.name) || '') + '\nLumos Motion', sigHtml = sig ? sig.html : '<p>Üdvözlettel,<br>' + escapeHtml_((u && u.name) || '') + '<br>Lumos Motion</p>';   // a szignó azé, aki élesít
  cm = cm || {};   // a felugró ablakban szerkesztett tárgy / bevezető / megjegyzés (üres = alapértelmezett)
  const range = fmtHuDate_(p.date) + (p.endDate && p.endDate > p.date ? ' – ' + fmtHuDate_(p.endDate) : '');
  const rows = [['Projekt', p.name], ['Időpont', range + (m.days.length ? ' (a te napjaid: ' + m.days.map(fmtHuDate_).join(', ') + ')' : '')],
    ['Kezdés', p.startTime || ''], ['Távozás (kb.)', p.endTime || ''], ['Helyszín', p.venue || ''], ['Szereped', m.roles.join(', ')],
    ['Projektvezető', lead && lead.id !== m.id ? lead.name + (lead.phone ? ' · ' + lead.phone : '') : '']].filter(r => r[1]);   // a projektvezető a saját levelében nem kapja meg a saját nevét / számát
  siteTasks_(p, m.id).forEach(t => rows.push(t));   // helyszíni feladat: melyik teremben, milyen kameraszöggel, milyen eszközzel
  const ct = cm.cutTasks && cm.cutTasks[m.id];   // vágó: mit kell megvágnia + leadási határidő (a felület számolja)
  if (ct && ct.items && ct.items.length) { rows.push(['Vágnivaló', ct.items.join('\n')]); if (ct.due) rows.push(['Leadási határidő', ct.due]); }
  if (postOnly_(p, m.id)) { const pn = parseNotes_(p.crewNotes)[m.id]; if (pn) rows.push(['Neked szóló megjegyzés', String(pn)]); }   // nem kap eszközlistát: a személyes jegyzet ide kerül
  const intro = cm.intro || (changed ? 'Módosult a beosztásod ezen a projekten:' : 'Véglegesítettük a csapatot, és beosztottunk erre a projektre:');
  const note = String(cm.note || '').trim(), first = String(m.name).split(/\s+/).pop();
  const text = ['Kedves ' + first + ',', '', intro].concat(note ? ['', note] : []).concat([''])   // megszólítás → bevezető → megjegyzés → beosztás   // a megjegyzés rögtön a megszólítás után
    .concat(rows.map(r => /\n/.test(String(r[1])) ? r[0] + ':\n  • ' + String(r[1]).replace(/\n/g, '\n  • ') : r[0] + ': ' + r[1])).concat(link ? ['', 'Részletek a naptárbejegyzésben: ' + link] : []).concat(['', sigText]).join('\n');
  const html = '<p>Kedves ' + escapeHtml_(first) + ',</p><p>' + escapeHtml_(intro).replace(/\n/g, '<br>') + '</p>' + (note ? '<p>' + escapeHtml_(note).replace(/\n/g, '<br>') + '</p>' : '') + '<table cellpadding="4" style="border-collapse:collapse">'
    + rows.map(r => '<tr><td style="color:#555;vertical-align:top">' + escapeHtml_(r[0]) + '</td><td><b>' + escapeHtml_(r[1]).replace(/\n/g, '<br>') + '</b></td></tr>').join('') + '</table>'   // több tétel: soronként
    + (link ? '<p><a href="' + link + '">Részletek a naptárbejegyzésben</a></p>' : '') + sigHtml;
  const subj = cm.subject || ((changed ? 'Módosult beosztás: ' : 'Beosztás: ') + p.name + ' – ' + range);
  return { subject: subj, text: text, html: html };
}
function crewFinalMail_(u, p, m, lead, link, changed, cm) {
  const b = crewFinalBuild_(p, m, lead, link, changed, cm, u);
  const ch = cm && cm.custom && cm.custom[m.id];
  if (ch) { b.html = ch; b.text = plainText_(ch.replace(/<\/td>\s*<td[^>]*>/gi, ': ').replace(/<\/(div|tr|p|table)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n')).replace(/\n{3,}/g, '\n\n').trim(); }
  return gmailSend_(m.email, b.subject, b.text, mailOptsFor_(u, b.html), 'assign');
}
/** Az élesítéskor kiküldendő levelek előnézete tagonként (a bevezető és a megjegyzés helyén jelölővel – a felület élőben cseréli). */
/** A tag maga a műveletet végző felhasználó-e (stábazonosító vagy e-mail-cím szerint, az álnevekkel együtt). */
function isSelf_(u, m) {
  if (!u || !m) return false;
  if (u.crewId && String(u.crewId) === String(m.id)) return true;
  const n = e => { const x = String(e || '').trim().toLowerCase(); return SIG_ALIAS_[x] || x; };
  return !!u.email && n(u.email) === n(m.email);
}
function crewFinalPreview_(u, a) {
  const pid = str_(a && a.projectId, 64), sh = sheetFor_('projects'), row = findRow_(sh, pid);
  if (!row) throw new Error('A projekt nem található.');
  const p = fullProject_(readRow_('projects', sh, row)), members = crewMembers_(p), lead = members.find(m => m.id === p.lead) || null;
  const prev = parseCrewFinal_(p.crewFinal), link = p.calEventId ? (() => { try { const ev = calEvent_(p.calEventId); return ev ? calEventLink_(ev) : ''; } catch (e) { return ''; } })() : '';
  return members.filter(m => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email) && !isSelf_(u, m)).map(m => {
    const isNew = !prev || prev.ids.indexOf(m.id) < 0, changed = !isNew && prev.sigs && prev.sigs[m.id] !== undefined && sigCore_(prev.sigs[m.id]) !== sigCore_(crewSig_(p, m.id));   // eszközváltozás nem csapatmódosítás (külön eszközlista)
    const b = crewFinalBuild_(p, m, lead, link || 'https://calendar.google.com/', changed, { intro: '@@INTRO@@', note: '@@NOTE@@', cutTasks: cutTasksArg_(a) }, u);
    return { id: m.id, name: m.name, email: m.email, changed: changed, isNew: isNew, subject: b.subject, html: b.html };
  });
}
/** Eszközök véglegesítése (a csapat után): rögzíti, ki mikor véglegesítette, és a beosztás lenyomatát (módosítás felismeréséhez). */
/** Csak utómunkás (vágó, nem helyszíni) vagy értékesítő: nem visz eszközt, nem kap eszközlistát. */
function postOnly_(p, cid) { if (!cid || p.lead === cid) return false; const et = parseEditTasks_(p.editTasks), own = Object.keys(et).filter(id => et[id].indexOf('f_x_vago') >= 0); if (own.length ? own.indexOf(cid) >= 0 : p.editOnsite === true) return false; /* helyszíni vágó személyenként */ const r = (p.crew || []).filter(a => a.crewId === cid).map(a => a.role); return r.length > 0 && r.every(x => x === 'Vágó' || x === 'Értékesítő'); }
function cutTasksArg_(a) { const o = {}; const x = a && a.cutTasks; if (x && typeof x === 'object') Object.keys(x).slice(0, 20).forEach(k => { const v = x[k] || {}; o[str_(k, 64)] = { items: (Array.isArray(v.items) ? v.items : []).slice(0, 30).map(i => str_(i, 160)).filter(Boolean), due: str_(v.due, 60) }; }); return o; }
/** Kik kapnak eszközlistát: akiknél eszköz van (nem csak utómunkás, és nem te magad). */
function eqRecipients_(u, fp) {
  const holders = {}; (fp.equipment || []).forEach(e => { if (e.crewId) holders[e.crewId] = 1; }); parseRentals_(fp.rentals).forEach(r => { if (r.crewId) holders[r.crewId] = 1; });
  const cm = byId_(readAll_('crew'));
  return Object.keys(holders).filter(cid => !postOnly_(fp, cid)).filter(cid => !isSelf_(u, { id: cid, email: (cm[cid] || {}).email }));
}
/** Az eszközök véglegesítésekor kimenő eszközlisták előnézete (semmit nem küld el). */
function eqListPreview_(u, a) {
  const pid = str_(a && a.projectId, 64), sh = sheetFor_('projects'), r = findRow_(sh, pid); if (!r) throw new Error('A projekt nem található.');
  const rcp = eqRecipients_(u, fullProject_(readRow_('projects', sh, r)));
  if (!rcp.length || !mailOn_()) return [];
  try { return sendEquipmentList_(u, { projectId: pid, recipients: rcp, message: '', includePlan: true, preview: true }).previews || []; } catch (e) { return []; }
}
function finalizeEquipment_(u, a) {
  const pid = str_(a && a.projectId, 64);
  const saved = withLock_(() => {
    const sh = sheetFor_('projects'), r = findRow_(sh, pid); if (!r) throw new Error('A projekt nem található.');
    const q = readRow_('projects', sh, r);
    if (!parseCrewFinal_(q.crewFinal)) throw new Error('Előbb a csapatot véglegesítsd, utána az eszközöket.');
    const eq = fullProject_(q).equipment || [];
    q.eqFinal = JSON.stringify({ at: now_(), by: u.name, sig: eq.map(e => e.itemId + '|' + (e.crewId || '') + '|' + (Number(e.qty) || 1)).sort().join(',') });
    q.updatedAt = now_(); q.updatedBy = u.name; putRow_('projects', sh, q, r); dbFlush_(); return q;
  });
  let mail = null;
  if (a && a.sendList) {   // eszközlista e-mailben azoknak, akiknél eszköz van (magadnak nem)
    const rcp = eqRecipients_(u, fullProject_(saved));
    if (rcp.length) { try { mail = sendEquipmentList_(u, { projectId: pid, recipients: rcp, message: '', includePlan: true }); } catch (e) { mail = { error: String(e && e.message || e) }; } }
  }
  logEvent_(u, 'Eszközök véglegesítve', saved.name, '');
  return { project: projectView_(fullProject_(saved), u), mail: mail };
}
function finalizeCrew_(u, a) {
  const pid = str_(a && a.projectId, 64);
  const sh = sheetFor_('projects'), row = findRow_(sh, pid);
  if (!row) throw new Error('A projekt nem található.');
  let p = fullProject_(readRow_('projects', sh, row));
  if (p.status === 'lemondva') throw new Error('Lemondott projekt csapatát nem lehet véglegesíteni.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.date || ''))) throw new Error('Előbb add meg a projekt első napját.');
  const members = crewMembers_(p);
  if (!members.length) throw new Error('Még nincs beosztva senki a projektre.');
  p = syncCalendar_(p);   // az esemény biztosan létezzen
  const ev = calEvent_(p.calEventId); if (!ev) throw new Error('A naptárbejegyzést nem sikerült létrehozni. Próbáld újra.' + (p.calError ? ' (' + p.calError + ')' : ''));   // videóvágásnál a Vágói naptár eseménye
  const allCrewEmails = {}; readAll_('crew').forEach(c => { const e = String(c.email || '').trim().toLowerCase(); if (e) allCrewEmails[e] = 1; });
  const valid = members.filter(m => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email));
  const calNotified = ev ? calGuestsSet_(ev, valid.map(m => m.email), allCrewEmails) : false;
  const lead = members.find(m => m.id === p.lead) || null;
  // újraélesítés: csak az új tagok kapnak értesítést, és azok a régiek, akiknek a szerepe, eszközei vagy napjai változtak
  const prev = parseCrewFinal_(p.crewFinal), sigs = {}; members.forEach(m => { sigs[m.id] = crewSig_(p, m.id); });
  const moved = !!(a && a.dateMoved);   // a naptárban áthúzott projekt: minden korábbi tag értesítést kap az új időpontról
  const isNewM = m => !prev || prev.ids.indexOf(m.id) < 0, isChanged = m => !isNewM(m) && (moved || (prev.sigs && prev.sigs[m.id] !== undefined && prev.sigs[m.id] !== sigs[m.id]));
  const toNotify = valid.filter(m => (isNewM(m) || isChanged(m)) && !isSelf_(u, m));   // aki élesít, magának nem küld levelet (a naptárba bekerül)
  const link = ev ? calEventLink_(ev) : '';
  const cutTasks = cutTasksArg_(a);
  const cm = { subject: str_(a && a.subject, 200).trim() || (a && a.dateMoved ? 'Új időpont: ' + p.name + ' – ' + fmtHuDate_(p.date) + (p.endDate && p.endDate > p.date ? ' – ' + fmtHuDate_(p.endDate) : '') : ''), intro: str_(a && a.intro, 1000).trim() || (a && a.dateMoved ? 'Módosult a projekt időpontja – az új beosztásod:' : ''), note: str_(a && a.note, 3000).trim(), custom: {}, cutTasks: cutTasks };
  if (a && a.custom && typeof a.custom === 'object') Object.keys(a.custom).slice(0, 60).forEach(k => { const h = sigSanitize_(String(a.custom[k] || ''), 30000); if (h) cm.custom[k] = h; });   // kézzel átírt levelek
  const sent = [], failed = [], changedNames = []; let stepped = false;
  const sentTo = [];
  toNotify.forEach(m => { const ch = isChanged(m); try { if (crewFinalMail_(u, p, m, lead, link, ch, cm)) { sent.push(m.name); sentTo.push({ name: m.name, email: m.email }); if (ch) changedNames.push(m.name); } } catch (e) { failed.push(m.name); } });
  const saved = withLock_(() => {
    const r2 = findRow_(sh, pid), q = readRow_('projects', sh, r2);
    q.crewFinal = JSON.stringify({ at: now_(), by: u.name, ids: members.map(m => m.id).sort(), notified: sent, sentTo: sentTo, sigs: sigs });
    if (p.calEventId && !q.calEventId) q.calEventId = p.calEventId;
    if (!q.status || q.status === 'tervezes' || q.status === 'egyeztetes') { q.prevStatus = q.status || 'tervezes'; q.status = q.eventType === 'Videóvágás' ? 'utomunka' : 'helyszin'; stepped = true;   // videóvágás: rögtön Utómunka
      const sd = String(q.stepsDone || '').split(',').filter(String); if (sd.indexOf('tervezes') < 0) sd.push('tervezes'); q.stepsDone = sd.join(','); }   // véglegesített csapat → Helyszíni munka
    q.updatedAt = now_(); q.updatedBy = u.name;
    putRow_('projects', sh, q, r2); dbFlush_();
    return q;
  });
  logEvent_(u, 'Csapat véglegesítve', p.name, members.length + ' fő · e-mail: ' + sent.length + (failed.length ? ' · sikertelen: ' + failed.length : '') + (stepped ? ' · Állapot: Tervezés → ' + (p.eventType === 'Videóvágás' ? 'Utómunka' : 'Helyszíni munka') : ''));
  return { project: projectView_(fullProject_(saved), u), sent: sent, sentTo: sentTo, changed: changedNames, failed: failed, noEmail: members.filter(m => valid.indexOf(m) < 0).map(m => m.name), calendarNotified: calNotified, link: link, mailPaused: !mailOn_(), stepped: stepped };
}

/* ===================== BEVÉTEL ÉS KIADÁS (ügyvezetői pénzügyek) ===================== */
/* A régi „Lumos Motion Árbevétel” táblázat kiváltása. Felosztás projektenként: nyereség %, ügyvezető %, marketing %,
   a termelési költség (szakemberek, fuvar, étel, bérlés) után a maradék az Eszköz/Rezsi alapba kerül.
   A rezsi- és marketingkiadások ezekből az alapokból mennek; hónapról hónapra áthozott egyenleggel.
   Az app a beállított hónaptól a projektekből számol; előtte a régi táblázatból importált sorokból. */
const FIN_SETTINGS_PROPERTY = 'LUMOS_PM_FIN_SETTINGS';
const PAY_STATUSES = ['', 'var', 'eloleg', 'teljes'];
const FIN_FUNDS = ['rezsi', 'marketing'];
function finSettings_() {
  let s = {}; try { s = JSON.parse(PropertiesService.getScriptProperties().getProperty(FIN_SETTINGS_PROPERTY) || '{}') || {}; } catch (e) { s = {}; }
  const pct = (v, d) => { const n = Number(v); return isFinite(n) && n >= 0 && n <= 100 ? n : d; };
  const ym = v => /^\d{4}-\d{2}$/.test(String(v || '')) ? String(v) : '';
  const money = v => { const n = Math.round(Number(v)); return isFinite(n) ? n : 0; };
  return { profitPct: pct(s.profitPct, 30), ceoPct: pct(s.ceoPct, 5), marketingPct: pct(s.marketingPct, 5),
    openMonth: ym(s.openMonth), openRezsi: money(s.openRezsi), openMarketing: money(s.openMarketing),
    appFromMonth: ym(s.appFromMonth), importedAt: str_(s.importedAt, 30), importedFrom: str_(s.importedFrom, 300),
    carries: s.carries && typeof s.carries === 'object' ? s.carries : {}, tigMail: s.tigMail && typeof s.tigMail === 'object' ? s.tigMail : null };   // a régi táblázat havi áthozatai (hónap → [rezsi, marketing]) – a régi hónapokban ezek a hitelesek
}
function finSaveSettings_(u, a) {
  const cur = finSettings_(), next = Object.assign({}, cur);
  ['profitPct', 'ceoPct', 'marketingPct'].forEach(k => { if (a && a[k] !== undefined) { const n = Number(a[k]); if (!isFinite(n) || n < 0 || n > 100) throw new Error('A százalék 0 és 100 között legyen.'); next[k] = n; } });
  if (next.profitPct + next.ceoPct + next.marketingPct > 100) throw new Error('A százalékok összege nem lehet több 100-nál.');
  ['openMonth', 'appFromMonth'].forEach(k => { if (a && a[k] !== undefined) { if (a[k] && !/^\d{4}-\d{2}$/.test(String(a[k]))) throw new Error('Hibás hónap.'); next[k] = String(a[k] || ''); } });
  ['openRezsi', 'openMarketing'].forEach(k => { if (a && a[k] !== undefined) { const n = Math.round(Number(a[k])); if (!isFinite(n)) throw new Error('Hibás összeg.'); next[k] = n; } });
  if (a && a.tigMail !== undefined) next.tigMail = a.tigMail ? { subject: str_(a.tigMail.subject, 200), text: str_(a.tigMail.text, 5000) } : null;   // TIG e-mail alapsablon
  PropertiesService.getScriptProperties().setProperty(FIN_SETTINGS_PROPERTY, JSON.stringify(next));
  logEvent_(u, 'Pénzügyi beállítások', '', 'módosítva');
  return finPart_(['settings']);
}
/* Betöltéskor gyorsítótárból (minden módosítás új verziószámot ad, így mindig friss); a módosító műveletek a friss finData_()-t adják vissza */
function finDataCached_() {
  const key = 'pm_fin_' + dataVer_(), hit = cacheGetJSON_(key);
  if (hit) { hit.sz = szSettingsView_(); return hit; }
  const out = finData_();
  cachePutJSON_(key, out, DATA_CACHE_TTL);
  return out;
}
function finData_() {
  return { income: readAll_('finIncome'), expense: readAll_('finExpense'), loan: readAll_('finLoan'), settings: finSettings_(), invoices: readAll_('finInvoice'), billing: readAll_('finBilling'), frameworks: readAll_('finFramework'), tigs: readAll_('finTig'), sz: szSettingsView_() };
}
/* Gyors válasz: a módosító műveletek csak az érintett táblát adják vissza (a többi nem változott) */
const FIN_PART_TABLES_ = { income: 'finIncome', expense: 'finExpense', loan: 'finLoan', invoices: 'finInvoice', billing: 'finBilling', frameworks: 'finFramework', tigs: 'finTig' };
function finPart_(keys) { const o = {}; keys.forEach(k => { if (k === 'settings') o.settings = finSettings_(); else if (k === 'sz') o.sz = szSettingsView_(); else o[k] = readAll_(FIN_PART_TABLES_[k]); }); return o; }
function finClean_(table, a) {
  const id = str_(a && a.id, 64) || Utilities.getUuid();
  const ym = v => /^\d{4}-\d{2}$/.test(String(v || '')) ? String(v) : '';
  const money = (v, neg) => { const n = Math.round(Number(String(v == null ? '' : v).replace(/\s/g, ''))); if (!isFinite(n)) return 0; return neg ? n : Math.max(0, n); };
  if (table === 'finIncome') {
    const r = { id: id, month: ym(a.month), day: str_(a.day, 10), name: str_(a.name, 200), payStatus: PAY_STATUSES.indexOf(a.payStatus) >= 0 ? a.payStatus : '',
      amount: money(a.amount), prod: money(a.prod), profit: money(a.profit), ceo: money(a.ceo), rezsi: money(a.rezsi, true), marketing: money(a.marketing),
      legacy: a.legacy === true, note: str_(a.note, 1000), people: str_(a.people, 1500) };
    if (!r.month) throw new Error('Hiányzik a hónap.'); if (r.name.length < 2) throw new Error('Add meg a megnevezést.');
    return r;
  }
  if (table === 'finExpense') {
    const r = { id: id, name: str_(a.name, 200), fund: FIN_FUNDS.indexOf(a.fund) >= 0 ? a.fund : 'rezsi', kind: a.kind === 'fix' ? 'fix' : 'egyszeri',
      month: ym(a.month), from: ym(a.from), to: ym(a.to), amount: money(a.amount), legacy: a.legacy === true, note: str_(a.note, 1000) };
    if (r.name.length < 2) throw new Error('Add meg a kiadás megnevezését.');
    if (r.kind === 'egyszeri' && !r.month) throw new Error('Hiányzik a hónap.');
    if (r.kind === 'fix' && !r.from) throw new Error('Add meg, melyik hónaptól érvényes.');
    if (r.kind === 'fix' && r.to && r.to < r.from) throw new Error('A záró hónap nem lehet korábbi a kezdőnél.');
    return r;
  }
  if (table === 'finLoan') {
    const r = { id: id, date: /^\d{4}-\d{2}-\d{2}$/.test(String(a.date || '')) ? String(a.date) : '', kind: a.kind === 'vissza' ? 'vissza' : 'be', amount: money(a.amount), note: str_(a.note, 300) };
    const banks = r.kind === 'vissza' ? ['Binx', 'OTP', 'Revolut'] : ['OTP', 'Revolut'];   // kölcsön: OTP, Revolut; visszafizetés: Binx, OTP, Revolut
    const nb = /\b(binx|otp|revolut)\b/i.exec(r.note) || [];
    r.bank = banks.find(b => b.toLowerCase() === String(a.bank || nb[1] || '').toLowerCase()) || '';
    if (!r.date) throw new Error('Add meg a dátumot.'); if (!r.amount) throw new Error('Add meg az összeget.');
    return r;
  }
  throw new Error('Ismeretlen táblázat.');
}
function finUpsert_(u, a) {
  const table = { income: 'finIncome', expense: 'finExpense', loan: 'finLoan' }[a && a.table];
  if (!table) throw new Error('Ismeretlen táblázat.');
  const rows = (Array.isArray(a.rows) ? a.rows : [a.row]).filter(Boolean).slice(0, 20).map(r => finClean_(table, r));
  withLock_(() => {
    const sh = sheetFor_(table);
    rows.forEach(r => putRow_(table, sh, r, findRow_(sh, r.id)));
    dbFlush_();
  });
  logEvent_(u, 'Bevétel és kiadás', rows.map(r => r.name || r.date).join(', '), a.table + ' mentve');   // összeg nem kerül a naplóba
  return finPart_([a.table]);
}
function finDelete_(u, a) {
  const table = { income: 'finIncome', expense: 'finExpense', loan: 'finLoan' }[a && a.table];
  if (!table) throw new Error('Ismeretlen táblázat.');
  withLock_(() => { const sh = sheetFor_(table), row = findRow_(sh, str_(a.id, 64)); if (row) sh.deleteRow(row); dbFlush_(); });
  logEvent_(u, 'Bevétel és kiadás', '', a.table + ' tétel törölve');
  return finPart_([a.table]);
}
/* Projekt fizetési állapota (csak ügyvezető): közvetlenül a cellába írjuk, a projekt módosítási idejét nem érinti */
function finSetPay_(u, a) {
  const st = PAY_STATUSES.indexOf(a && a.payStatus) >= 0 ? a.payStatus : '';
  return withLock_(() => { writeProjectPay_(str_(a && a.projectId, 64), st); dbFlush_(); dataBump_(); return { projectId: a.projectId, payStatus: st }; });
}
function writeProjectPay_(projectId, st) {
  const sh = sheetFor_('projects'), row = findRow_(sh, projectId);
  if (!row) throw new Error('A projekt nem található.');
  const col = TABLES.projects.cols.findIndex(c => c[0] === 'payStatus') + 1;
  sh.getRange(row, col).setNumberFormat('@').setValue(st);
}

/* ===== Régi táblázat importálása (egyszer, a Bevétel és kiadás fül beállításaiból) =====
   Hónap-fülek: „Október 26”, „Április 25” … Fejléc: a „Marketing” feliratot tartalmazó sor; a nevek oszlopa a %,
   mellette a Ft. A projektsorok: B = nap, C = megnevezés, (állapot), díjazás, nyereség, majd a %/Ft párok. */
const HU_MONTHS_ = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
function legacyNum_(v) { if (typeof v === 'number') return v; const s = String(v == null ? '' : v).replace(/\s/g, '').replace(/Ft\.?$/i, '').replace(',', '.'); return s === '' || isNaN(Number(s)) ? null : Number(s); }
function legacyPay_(s) { s = String(s || '').toLowerCase(); return /teljes/.test(s) ? 'teljes' : /foglaló|eloleg/.test(s) ? 'eloleg' : /vár|var/.test(s) ? 'var' : ''; }
function legacyDate_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, SHEET_TZ, 'yyyy-MM-dd');
  const m = /(\d{4})[.\-\/]\s*(\d{1,2})[.\-\/]\s*(\d{1,2})/.exec(String(v || ''));
  return m ? m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2) : '';
}
function parseLegacyMonth_(sh) {
  const mm = /^\s*([^\s]+)\s+(\d{2})\s*$/.exec(sh.getName()); if (!mm) return null;
  const mi = HU_MONTHS_.indexOf(mm[1].toLowerCase()); if (mi < 0) return null;
  const month = '20' + mm[2] + '-' + ('0' + (mi + 1)).slice(-2);
  const V = sh.getDataRange().getValues();
  const hRow = V.findIndex(r => r.some(c => String(c).trim() === 'Marketing'));
  if (hRow < 0) return { month: month, income: [], expense: [], carry: null, V: V };
  // a „Nyereség” oszlop a két fejlécsor valamelyikében; utána jönnek a nevek (% és Ft oszloppárok)
  let nyCol = -1; for (let ri = Math.max(0, hRow - 1); ri <= Math.min(V.length - 1, hRow + 1) && nyCol < 0; ri++) nyCol = V[ri].findIndex(c => /^nyereség/i.test(String(c).trim()));
  const labs = []; V[hRow].forEach((c, i) => { const t = String(c).trim(); if (t && i > Math.max(2, nyCol) && !/^(%|ft\.?|teszt|ok)$/i.test(t)) labs.push([i, t]); });
  if (!labs.length) return { month: month, income: [], expense: [], carry: null, V: V };
  const L = nyCol > 0 ? nyCol + 1 : labs[0][0];
  const isCeo = t => /^ervin$/i.test(t), isRezsi = t => /eszköz|rezsi/i.test(t), isMkt = t => /^marketing$/i.test(t);
  const income = [];
  let expStart = -1, expEnd = -1, carryRow = -1;
  V.forEach((r, ri) => {
    const line = r.map(c => String(c)).join('|');
    if (expStart < 0 && /Kiadások:/.test(line)) expStart = ri;
    if (expEnd < 0 && /Total Kiad/.test(line)) expEnd = ri;
    if (carryRow < 0 && /Megtakarítás\/Tartozás/.test(line)) carryRow = ri;
    if (ri <= hRow || (expStart >= 0 && ri >= expStart)) return;
    const day = String(r[1] == null ? '' : (r[1] instanceof Date ? Utilities.formatDate(r[1], SHEET_TZ, 'd') : r[1])).trim(), name = String(r[2] || '').trim(), amt = legacyNum_(r[L - 2]);
    if (!day || !name || !amt || /^total/i.test(day)) return;
    const o = { month: month, day: day, name: name, payStatus: L - 3 > 2 ? legacyPay_(r[L - 3]) : 'teljes', amount: amt, profit: legacyNum_(r[L - 1]) || 0, prod: 0, ceo: 0, rezsi: 0, marketing: 0, legacy: true };
    const people = [];
    labs.forEach(([i, t]) => { const v = legacyNum_(r[i + 1]) || 0; if (isCeo(t)) o.ceo += v; else if (isRezsi(t)) o.rezsi += v; else if (isMkt(t)) o.marketing += v; else { o.prod += v; if (v) people.push(t + ': ' + Math.round(v)); } });
    o.people = people.join(', ');
    ['amount', 'profit', 'prod', 'ceo', 'rezsi', 'marketing'].forEach(k => { o[k] = Math.round(o[k]); });
    income.push(o);
  });
  const expense = [];
  if (expStart >= 0 && expEnd > expStart) {
    const numCols = V[expEnd].map((c, i) => legacyNum_(c) != null && String(c).trim() !== '' ? i : -1).filter(i => i >= 0);
    const rezCol = numCols[0], mktCol = numCols[1];
    // a rezsi és a marketing kiadások egymás mellett, saját név- és összegoszloppal: a nevet az összeg bal oldalán keressük
    const nameLeftOf = (r, col, from) => { for (let i = col - 1; i >= from; i--) { const c = r[i]; if (typeof c === 'string' && c.trim() && legacyNum_(c) == null) return c.trim(); } return ''; };
    for (let ri = expStart + 1; ri < expEnd; ri++) {
      const r = V[ri];
      [[rezCol, 0, 'rezsi'], [mktCol, rezCol != null ? rezCol + 1 : 0, 'marketing']].forEach(([col, from, fund]) => {
        if (col == null) return;
        const amt = legacyNum_(r[col]) || 0, name = nameLeftOf(r, col, from);
        if (!amt || !name || /^(rezsi|marketing)$/i.test(name)) return;
        expense.push({ name: name, fund: fund, kind: 'egyszeri', month: month, amount: Math.round(amt), legacy: true });
      });
    }
  }
  let carry = null;
  if (carryRow >= 0) { const nums = V[carryRow].map(legacyNum_).filter(x => x != null); if (nums.length) carry = { rezsi: Math.round(nums[0]), marketing: Math.round(nums[1] || 0) }; }
  return { month: month, income: income, expense: expense, carry: carry, V: V };
}
function parseLegacyLoans_(V) {
  const out = []; let mode = '';
  for (const r of V) {
    const line = r.map(c => String(c)).join('|');
    if (/Tagi Kölcsön/i.test(line)) { mode = 'be'; continue; }
    if (/Visszafizetve/i.test(line)) { mode = 'vissza'; continue; }
    if (/Maradt/i.test(line)) { if (mode === 'vissza') break; continue; }
    if (!mode) continue;
    const dateCell = r.find(c => legacyDate_(c)), amt = [...r].reverse().map(legacyNum_).find(x => x != null && x > 0);
    if (!dateCell || !amt) continue;
    const note = r.filter(c => typeof c === 'string' && c.trim() && !legacyDate_(c) && legacyNum_(c) == null && !/összesen/i.test(c)).join(' ').trim();
    out.push({ date: legacyDate_(dateCell), kind: mode, amount: Math.round(amt), note: note });
  }
  return out;
}
function finImport_(u, a) {
  const url = str_(a && a.url, 500), fromMonth = /^\d{4}-\d{2}$/.test(String(a && a.appFromMonth || '')) ? String(a.appFromMonth) : '';
  if (!fromMonth) throw new Error('Add meg, melyik hónaptól számoljon az app a projektekből.');
  let src; try { src = SpreadsheetApp.openByUrl(url); } catch (e) { throw new Error('A táblázat nem nyitható meg. Ellenőrizd a linket, és hogy a szkriptet futtató fiók hozzáfér-e.'); }
  const months = src.getSheets().map(parseLegacyMonth_).filter(Boolean).filter(m => m.month < fromMonth).sort((x, y) => x.month.localeCompare(y.month));
  if (!months.length) throw new Error('Nem találtam importálható hónap-fület (pl. „Október 26”) a megadott hónap előtt.');
  let loans = [];   // a tagi kölcsön a legfrissebb olyan fülről, amelyen szerepel
  for (const m of src.getSheets().map(parseLegacyMonth_).filter(Boolean).sort((x, y) => y.month.localeCompare(x.month))) { loans = parseLegacyLoans_(m.V || []); if (loans.length) break; }
  const income = [], expense = [];
  // ismétlődő kiadások (bér, könyvelő, irodabérlet, előfizetések): ami az utolsó két importált hónapban is szerepel, az app hónaptól havi fix tétel lesz
  const lastM = months[months.length - 1], prevM = months[months.length - 2];
  const fixes = lastM && prevM ? lastM.expense.filter(e => prevM.expense.some(x => x.fund === e.fund && x.name.toLowerCase() === e.name.toLowerCase()))
    .map(e => ({ id: Utilities.getUuid(), name: e.name, fund: e.fund, kind: 'fix', from: fromMonth, to: '', amount: e.amount, legacy: false, note: 'A régi táblázatból átvett havi tétel' })) : [];
  months.forEach(m => { m.income.forEach(o => income.push(Object.assign({ id: Utilities.getUuid() }, o))); m.expense.forEach(o => expense.push(Object.assign({ id: Utilities.getUuid() }, o))); });
  withLock_(() => {
    const keepNonLegacy = (key) => readAll_(key).filter(r => !r.legacy);
    const write = (key, rows) => { const sh = sheetFor_(key), n = sh.getLastRow(); if (n > 1) sh.getRange(2, 1, n - 1, TABLES[key].cols.length).clearContent();
      if (rows.length) { const rg = sh.getRange(2, 1, rows.length, TABLES[key].cols.length); rg.setNumberFormat('@'); rg.setValues(rows.map(o => toRow_(TABLES[key], o))); } };
    write('finIncome', keepNonLegacy('finIncome').concat(income.map(r => finClean_('finIncome', r))));
    const kept = keepNonLegacy('finExpense'), has = e => kept.some(x => x.kind === 'fix' && x.fund === e.fund && String(x.name).toLowerCase() === e.name.toLowerCase());
    write('finExpense', kept.concat(fixes.filter(e => !has(e)).map(r => finClean_('finExpense', r)), expense.map(r => finClean_('finExpense', r))));
    if (loans.length) write('finLoan', loans.map(r => finClean_('finLoan', Object.assign({ id: Utilities.getUuid() }, r))));
    const s = finSettings_();
    s.openMonth = months[0].month; s.openRezsi = months[0].carry ? months[0].carry.rezsi : 0; s.openMarketing = months[0].carry ? months[0].carry.marketing : 0;
    s.appFromMonth = fromMonth; s.importedAt = now_(); s.importedFrom = url;
    s.carries = {}; months.forEach(m => { if (m.carry) s.carries[m.month] = [m.carry.rezsi, m.carry.marketing]; });
    PropertiesService.getScriptProperties().setProperty(FIN_SETTINGS_PROPERTY, JSON.stringify(s));
    dbFlush_();
  });
  // ellenőrzés: a régi táblázat havi áthozatai a mi számításunkkal
  const check = months.filter(m => m.carry).map(m => ({ month: m.month, rezsi: m.carry.rezsi, marketing: m.carry.marketing }));
  logEvent_(u, 'Bevétel és kiadás', 'Régi táblázat importálva', months.length + ' hónap, ' + income.length + ' bevételi sor, ' + expense.length + ' kiadás, ' + loans.length + ' kölcsöntétel');
  return Object.assign(finData_(), { imported: { months: months.length, income: income.length, expense: expense.length, fixes: fixes.length, loans: loans.length, check: check } });
}

/* ===================== STÁB SORRENDJE ===================== */
/* A Stáb fül kártyáinak közös sorrendje (húzással állítható), munkatárs-azonosítók listája a Script Propertiesben. */
const CREW_ORDER_PROPERTY = 'CREW_ORDER';
function crewOrder_() {
  try { const a = JSON.parse(PropertiesService.getScriptProperties().getProperty(CREW_ORDER_PROPERTY) || '[]'); return Array.isArray(a) ? a.map(x => str_(x, 64)).filter(Boolean) : []; }
  catch (e) { return []; }
}
function saveCrewOrder_(u, a) {
  const ids = new Set(readAll_('crew').map(c => c.id));
  const seen = {}, order = (Array.isArray(a && a.order) ? a.order : []).map(x => str_(x, 64)).filter(x => ids.has(x) && !seen[x] && (seen[x] = true));
  PropertiesService.getScriptProperties().setProperty(CREW_ORDER_PROPERTY, JSON.stringify(order));
  logEvent_(u, 'Stáb sorrendje', '', 'Kártyák átrendezve');
  return { crewOrder: order };
}

/* ===================== TERMELŐI KERET JÓVÁHAGYÁSA ===================== */
function parseBudgetRequest_(raw) {
  let x = raw; if (typeof raw === 'string') { try { x = JSON.parse(raw || 'null'); } catch (e) { return null; } }
  if (!x || !x.id || !['pending', 'approved', 'rejected', 'superseded'].includes(x.status)) return null;
  return { id: str_(x.id, 64), amount: int_(x.amount, 0, VALUE_MAX, 0), previousFt: x.previousFt == null ? null : int_(x.previousFt, 0, VALUE_MAX, 0),
    reason: str_(x.reason, 1500), by: str_(x.by, 120), at: str_(x.at, 30), status: x.status,
    decidedBy: str_(x.decidedBy, 120), decidedAt: str_(x.decidedAt, 30) };
}
function effectiveBudget_(p) {
  if (p.budgetVal === '' || p.budgetVal == null) return null;
  if (p.budgetMode === 'ft') return Number(p.budgetVal);
  if (p.budgetMode === 'pct' && Number(p.quotePrice) > 0) return Math.round(prodBase_(p) * Number(p.budgetVal) / 100);
  return null;
}
function budgetMutate_(u, a, fn) {
  return withLock_(() => {
    const sh = sheetFor_('projects'), row = findRow_(sh, str_(a && a.projectId, 64));
    if (!row) throw new Error('A projekt azonosítója érvénytelen.');
    const p = readRow_('projects', sh, row);
    fn(p); p.updatedAt = now_(); p.updatedBy = u.name; p.mutationId = Utilities.getUuid();
    putRow_('projects', sh, p, row); dbFlush_();
    return projectView_(fullProject_(p), u);
  });
}
function requestBudgetChange_(u, a) {
  if (u.role !== 'editor') throw new Error('FORBIDDEN: keretkérelmet a termelési vezető küldhet.');
  const amount = Number(a && a.amount), reason = str_(a && a.reason, 1500).trim();
  if (a.amount === '' || a.amount == null || !Number.isInteger(amount) || amount < 0 || amount > VALUE_MAX) throw new Error('Adj meg érvényes forintösszeget.');
  if (reason.length < 5) throw new Error('Írd le röviden a módosítás indokát.');
  const saved = budgetMutate_(u, a, p => {
    if (p.updatedAt !== str_(a.baseUpdatedAt, 30)) throw new Error('CONFLICT: A projekt módosult. Frissítsd az adatokat.');
    if (effectiveBudget_(p) === amount) throw new Error('A kért összeg megegyezik az aktuális kerettel.');
    const existing = parseBudgetRequest_(p.budgetRequest);
    if (existing && existing.status === 'pending') throw new Error('Egy keretkérelem már jóváhagyásra vár.');
    p.budgetRequest = JSON.stringify({ id: Utilities.getUuid(), amount: amount, previousFt: effectiveBudget_(p), reason: reason, by: u.name, at: now_(), status: 'pending' });
    logEvent_(u, 'Termelői keret módosítása kérve', p.name, 'Ügyvezetői jóváhagyásra vár');
  });
  return saved;
}
function decideBudgetChange_(u, a) {
  if (u.role !== 'admin') throw new Error('FORBIDDEN: ügyvezetői jóváhagyás szükséges.');
  if (typeof a.approve !== 'boolean') throw new Error('Válassz döntést.');
  return budgetMutate_(u, a, p => {
    const request = parseBudgetRequest_(p.budgetRequest);
    if (!request || request.status !== 'pending' || request.id !== str_(a.id, 64)) throw new Error('A kérelem már módosult vagy lezárult. Frissítsd az adatokat.');
    if (a.approve && effectiveBudget_(p) !== request.previousFt) throw new Error('CONFLICT: A keret időközben módosult. Kérj friss javaslatot.');
    request.status = a.approve ? 'approved' : 'rejected'; request.decidedBy = u.name; request.decidedAt = now_();
    if (a.approve) { p.budgetMode = 'ft'; p.budgetVal = request.amount; }
    p.budgetRequest = JSON.stringify(request);
    logEvent_(u, a.approve ? 'Termelői keret jóváhagyva' : 'Termelői keret elutasítva', p.name, 'Ügyvezetői döntés rögzítve');
  });
}

/* ===================== PROJEKTEK ===================== */
/** Extra szolgáltatások (a szerződött összegen felül, nettó): [{id, name, amount}] */
function parseExtras_(v) { let l = v; if (typeof v === 'string') { try { l = JSON.parse(v || '[]'); } catch (e) { l = []; } }
  return (Array.isArray(l) ? l : []).slice(0, 30).map(x => ({ id: str_(x && x.id, 40) || Utilities.getUuid().slice(0, 8), name: str_(x && x.name, 200), amount: int_(x && x.amount, 0, VALUE_MAX, 0), kind: x && (x.kind === 'le' || x.kind === 'tov' || x.kind === 'org') ? x.kind : '', clientId: x && x.kind === 'org' ? str_(x.clientId, 64) : '', fileUrl: x && /^https:\/\//.test(String(x.fileUrl || '')) ? str_(x.fileUrl, 300) : '', fileName: str_(x && x.fileName, 150) })).filter(x => x.name || x.amount || x.kind === 'org'); }
/** Szervezői jutalék összege (nem a számla része: a termelői alapot csökkenti). */
/** Termelői alap (hatékonyság / termelői keret): végső érték (szerződött + extrák − kedvezmények) − szervezői jutalék − továbbszámlázott költség */
const prodBase_ = p => { const ex = parseExtras_(p.extras), n = v => Number(v) || 0; return Math.max(0, n(p.quotePrice) + ex.reduce((a, e) => a + (e.kind === 'org' || e.kind === 'le' || e.kind === 'tov' ? -1 : 1) * n(e.amount), 0)); };   // a továbbszámlázott költség a szerződött érték része: levonjuk
const orgFee_ = p => parseExtras_(p.extras).filter(e => e.kind === 'org').reduce((a, e) => a + Number(e.amount || 0), 0);
function saveProject_(u, a) {
  if (!a || typeof a !== 'object') throw new Error('Hiányos adatok.');
  const id = str_(a.id, 64), mutationId = str_(a.mutationId, 64);
  if (!ID_RE.test(id)) throw new Error('Hibás projektazonosító.');
  if (!ID_RE.test(mutationId)) throw new Error('Hiányzó műveletazonosító.');
  const p = {
    id: id, name: str_(a.name, 160), client: str_(a.client, 160),
    eventType: EVENT_TYPES.indexOf(a.eventType) >= 0 ? a.eventType : '',
    venue: str_(a.venue, 200), date: iso_(a.date), endDate: iso_(a.endDate),
    startTime: /^\d{2}:\d{2}$/.test(str_(a.startTime, 5)) ? str_(a.startTime, 5) : '',
    endTime: /^\d{2}:\d{2}$/.test(str_(a.endTime, 5)) ? str_(a.endTime, 5) : '',
    lastStartTime: /^\d{2}:\d{2}$/.test(str_(a.lastStartTime, 5)) ? str_(a.lastStartTime, 5) : '',
    lastEndTime: /^\d{2}:\d{2}$/.test(str_(a.lastEndTime, 5)) ? str_(a.lastEndTime, 5) : '',
    cancelReason: str_(a.cancelReason, 1000), leadRemote: !!a.leadRemote, editOnsite: !!a.editOnsite, rawSentAt: /^\d{4}-\d{2}-\d{2}$/.test(String(a.rawSentAt || '')) ? String(a.rawSentAt) : '',
    hours: (function () { const s = /^(\d{2}):(\d{2})$/.exec(str_(a.startTime, 5)), e = /^(\d{2}):(\d{2})$/.exec(str_(a.endTime, 5));   // távozási óra → munkaórák
      if (s && e) { let m = (+e[1] * 60 + +e[2]) - (+s[1] * 60 + +s[2]); if (m <= 0) m += 1440; return Math.min(16, Math.max(1, Math.round(m / 60))); } return int_(a.hours, 1, 16, 8); })(),
    status: STATUSES.indexOf(a.status) >= 0 && a.status !== 'egyeztetes' ? a.status : 'tervezes',
    prevStatus: STATUSES.indexOf(a.prevStatus) >= 0 ? a.prevStatus : '',
    lead: str_(a.lead, 64),
    quotePrice: null,   // a projekt értékét csak az ügyvezető állíthatja (lent), máskor a régi marad
    leadvaAt: /^\d{4}-\d{2}-\d{2}$/.test(String(a.leadvaAt || '')) ? String(a.leadvaAt) : '',
    contactName: str_(a.contactName, 120), contactPhone: str_(a.contactPhone, 40), contactEmail: str_(a.contactEmail, 160).toLowerCase(), clientTax: str_(a.clientTax, 20).replace(/[^\d-]/g, ''), clientAddress: str_(a.clientAddress, 300),
    techPlan: str_(a.techPlan, 5000), notes: str_(a.notes, 5000), deliveryLink: str_(a.deliveryLink, 500), deliveryPass: str_(a.deliveryPass, 120), deliveryNotes: str_(a.deliveryNotes, 3000), dueKept: a.dueKept === 'igen' || a.dueKept === 'nem' ? a.dueKept : '', stepsDone: (Array.isArray(a.stepsDone) ? a.stepsDone : String(a.stepsDone || '').split(',')).filter(x => ['egyeztetes', 'tervezes', 'helyszin', 'utomunka', 'jovahagyas'].indexOf(x) >= 0).join(','), siteOk: a.siteOk === 'igen' || a.siteOk === 'nem' ? a.siteOk : '', siteReport: str_(a.siteReport, 3000), deliveredAt: iso_(a.deliveredAt), dueAt: iso_(a.dueAt)
  };
  if (p.name.length < 2) throw new Error('Add meg a projekt nevét (legalább 2 karakter).');
  if (p.endDate && (!p.date || p.endDate < p.date)) p.endDate = '';
  if (!p.endDate || p.endDate === p.date) { p.lastStartTime = ''; p.lastEndTime = ''; }
  if (p.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.contactEmail)) throw new Error('A kapcsolattartó e-mail-címe érvénytelen.');
  if (p.deliveryLink && !/^https:\/\//i.test(p.deliveryLink)) throw new Error('Az átadási link https:// előtaggal kezdődjön.');
  Object.keys(COUNTS).forEach(k => { p[k] = int_(a[k], 0, COUNTS[k], 0); });
  FLAGS.forEach(k => { p[k] = a[k] === true; });
  if (p.er_drone) { p.x_dron = true; p.er_drone = false; }   // a drón a Kreatív tartalmakhoz tartozik
  p.foto_db = (a.foto_db === undefined || a.foto_db === null || a.foto_db === '') ? 0 : int_(a.foto_db, 0, 1000, 0);
  // darabszámos mezők (új felület): a pipa a darabszámból adódik; régi felületnél a pipából 1 db
  if (a.x_foto_n !== undefined && a.x_foto_n !== null && a.x_foto_n !== '') p.x_foto = p.x_foto_n > 0; else { p.x_foto = p.x_foto || p.foto_db > 0; p.x_foto_n = p.x_foto ? 1 : 0; }
  if (a.er_post_n !== undefined && a.er_post_n !== null && a.er_post_n !== '') p.er_post = p.er_post_n > 0; else p.er_post_n = p.er_post ? 1 : 0;
  p.er_res = a.er_res === '4k' ? '4k' : 'hd';
  p.er_rooms = int_(a.er_rooms, 0, 10, 0);
  if (['er_total', 'er_close', 'er_zoom', 'er_crowd', 'er_slides', 'er_drone', 'er_stream'].some(k => p[k])) p.t_eloadas = true;   // a régi jelölő automatikusan
  if (p.status === 'atadva' && !p.deliveredAt) p.deliveredAt = today_();
  if ((p.status === 'leadva' || p.status === 'jovahagyas') && !p.leadvaAt) p.leadvaAt = today_();   // mióta várnak jóváhagyásra a videók
  if (['leadva', 'jovahagyas', 'atadva'].indexOf(p.status) < 0) p.leadvaAt = '';
  if (p.status !== 'atadva') p.deliveredAt = '';
  const crewIn = Array.isArray(a.crew) ? a.crew.slice(0, 60) : [];
  const eqIn = Array.isArray(a.equipment) ? a.equipment.slice(0, 150) : [];

  let crewMap = dbOn_() ? null : byId_(readAll_('crew')), invMap = dbOn_() ? null : byId_(readAll_('inventory'));   // munkalap-módban a zár előtt olvasunk (rövidebb zár); adatbázis-módban a zárban (egy betöltés)
  let logArgs = null;
  const saved = withLock_(() => {
    if (!crewMap) { crewMap = byId_(readAll_('crew')); invMap = byId_(readAll_('inventory')); }
    if (p.lead && !crewMap[p.lead]) p.lead = '';
    const seen = {}, crew = [];
    crewIn.forEach(x => {
      const cid = str_(x && x.crewId, 64);
      const r0 = x && x.role === 'Termelési vezető' ? 'Projektvezető' : x && x.role;
      const role = CREW_ROLES.indexOf(r0) >= 0 ? r0 : 'Operatőr';
      if (crewMap[cid] && !seen[cid + '|' + role]) { seen[cid + '|' + role] = 1; crew.push({ crewId: cid, role: role }); }
    });
    const eqm = {};
    // eszköz + felelős munkatárs (kinél van); felelős nélkül = közös
    eqIn.forEach(x => { const iid = str_(x && x.itemId, 64); if (!invMap[iid]) return; let cid = str_(x && x.crewId, 64); if (!crewMap[cid]) cid = '';
      const k = iid + '|' + cid; eqm[k] = Math.min(999, (eqm[k] || 0) + int_(x.qty, 1, 999, 1)); });
    const equipment = Object.keys(eqm).map(k => ({ itemId: k.split('|')[0], crewId: k.split('|')[1], qty: eqm[k] }));
    if (!p.lead) { const one = crew.map(c => c.crewId).filter((v, i, a) => a.indexOf(v) === i); if (one.length === 1) p.lead = one[0]; }   // egyszemélyes stábnál ő a projektvezető

    const sh = sheetFor_('projects');
    const row = findRow_(sh, id);
    let old = null;
    if (row) {
      old = readRow_('projects', sh, row);
      if (old.mutationId === mutationId) return fullProject_(old);   // megismételt kérés
      if (old.updatedAt !== str_(a.baseUpdatedAt, 30)) throw new Error('CONFLICT: Közben valaki más is módosította ezt a projektet.');
      p.createdAt = old.createdAt; p.folderId = old.folderId; p.listSentAt = old.listSentAt; p.listSentTo = old.listSentTo; p.calEventId = old.calEventId;
      p.quotePrice = old.quotePrice; p.extras = old.extras; p.fees = old.fees; p.budgetMode = old.budgetMode; p.budgetVal = old.budgetVal; p.crewNotes = old.crewNotes; p.rentals = old.rentals; p.penalties = old.penalties; p.budgetRequest = old.budgetRequest; p.crewFinal = old.crewFinal; p.eqFinal = old.eqFinal; p.payStatus = old.payStatus;
    } else {
      if (a.baseUpdatedAt) throw new Error('Ezt a projektet közben törölték.');
      const calId = str_(a.calEventId, 200);
      if (calId) { const dup = readAll_('projects').find(x => x.calEventId === calId); if (dup) return Object.assign(fullProject_(dup), { duplicateOf: true }); }   // ugyanabból a naptáreseményből már van projekt
      p.createdAt = now_(); p.folderId = ''; p.listSentAt = ''; p.listSentTo = ''; p.calEventId = str_(a.calEventId, 200);   // naptárból importált projekt
    }
    if (u.role === 'admin' && Array.isArray(a.extras)) p.extras = JSON.stringify(parseExtras_(a.extras));
    if (u.role === 'admin' && a.projectValue !== undefined) p.quotePrice = (a.projectValue === null || a.projectValue === '') ? '' : int_(a.projectValue, 0, VALUE_MAX, 0);
    if ((u.role === 'admin' || u.role === 'editor') && Array.isArray(a.fees)) p.fees = JSON.stringify(parseFees_(a.fees));
    if (u.role === 'admin' && a.budgetMode !== undefined) {
      if (old && (a.budgetMode !== old.budgetMode || Number(a.budgetVal) !== Number(old.budgetVal))) {
        const request = parseBudgetRequest_(p.budgetRequest);
        if (request && request.status === 'pending') { request.status = 'superseded'; request.decidedBy = u.name; request.decidedAt = now_(); p.budgetRequest = JSON.stringify(request); }
      }
      p.budgetMode = a.budgetMode === 'pct' || a.budgetMode === 'ft' ? a.budgetMode : '';
      const b = Number(String(a.budgetVal == null ? '' : a.budgetVal).replace(',', '.'));
      p.budgetVal = !p.budgetMode || a.budgetVal === '' || a.budgetVal == null || !isFinite(b) || b < 0 ? ''
        : p.budgetMode === 'pct' ? Math.min(100, Math.round(b * 10) / 10) : Math.min(VALUE_MAX, Math.round(b));
    }
    /* Sablonból létrehozott új projekt: a termelői keret és a projekt értéke (teljes büdzsé) a sablonból jön – a termelési vezetőnél is, aki az értéket nem látja */
    if (!old && a.tplFrom && ID_RE.test(String(a.tplFrom)) && (u.role === 'admin' || u.role === 'editor')) {
      const tsh = sheetFor_('projects'), tr = findRow_(tsh, String(a.tplFrom)), tp = tr ? readRow_('projects', tsh, tr) : null;
      if (tp) {
        if (!(u.role === 'admin' && a.projectValue !== undefined && a.projectValue !== null && a.projectValue !== '')) p.quotePrice = tp.quotePrice;
        if (!(u.role === 'admin' && a.budgetMode)) { p.budgetMode = tp.budgetMode; p.budgetVal = tp.budgetVal; }
        if (!(u.role === 'admin' && Array.isArray(a.extras))) p.extras = tp.extras;
      }
    }
    if (a.crewNotes !== undefined) p.crewNotes = JSON.stringify(parseNotes_(a.crewNotes));
    if (a.crewDays !== undefined) p.crewDays = JSON.stringify(parseCrewDays_(a.crewDays));
    if (p.crewDays == null) p.crewDays = old ? old.crewDays : '';
    if (Array.isArray(a.deliveryLinks)) p.deliveryLinks = JSON.stringify(parseLinks_(a.deliveryLinks));
    if (p.deliveryLinks == null) p.deliveryLinks = old ? old.deliveryLinks : '';
    if (a.editTasks !== undefined) p.editTasks = JSON.stringify(parseEditTasks_(a.editTasks));
    if (p.editTasks == null) p.editTasks = old ? old.editTasks || '' : '';
    if (u.role === 'admin' || u.role === 'editor') {   // videósorok a megrendelt darabszámokból; a vágót/állapotot a projektvezető is átállíthatja
      let vids = parseVideos_(old ? old.videos : '');
      if (Array.isArray(a.videos)) { const inc = parseVideos_(a.videos), im = {}; inc.forEach(x => { im[x.id] = x; }); vids = vids.map(x => im[x.id] ? Object.assign({}, x, { editor: im[x.id].editor, st: im[x.id].st }) : x); }
      p.videos = JSON.stringify(videosEnsure_(Object.assign({}, p, { videos: JSON.stringify(vids) }), [...new Set(crewIn.filter(c => c && c.role === 'Vágó').map(c => String(c.crewId || '')))].filter(String)));
    } else p.videos = old ? old.videos || '' : '';
    if (Array.isArray(a.recRooms)) { const rr = parseRooms_(a.recRooms); p.recRooms = JSON.stringify(rr); roomsLegacy_(p, rr); }
    if (p.recRooms == null) p.recRooms = old ? old.recRooms || '' : '';
    if (p.crewNotes == null) p.crewNotes = '';
    if (Array.isArray(a.rentals)) p.rentals = JSON.stringify(parseRentals_(a.rentals));
    if (p.rentals == null) p.rentals = '';
    if (p.budgetMode == null) p.budgetMode = '';
    if (p.budgetVal == null) p.budgetVal = '';
    if (p.quotePrice == null) p.quotePrice = '';
    if (p.fees == null) p.fees = '';
    if (p.budgetRequest == null) p.budgetRequest = '';
    if (p.crewFinal == null) p.crewFinal = '';
    if (p.eqFinal == null) p.eqFinal = '';
    if (p.payStatus == null) p.payStatus = '';
    if (['helyszin', 'utomunka', 'leadva', 'jovahagyas', 'atadva'].indexOf(p.status) >= 0 && (!old || ['', 'egyeztetes', 'tervezes'].indexOf(old.status || '') >= 0) && !parseCrewFinal_(p.crewFinal) && a.crewFinalSkip !== true)
      throw new Error('A helyszíni munkára lépés előtt véglegesítsd a csapatot (Stáb → „Csapat véglegesítése”).');
    if (p.penalties == null) p.penalties = '';   // díjcsökkentést csak a külön műveletek módosítanak
    if (p.status === 'atadva' && (!old || old.status !== 'atadva') && (needsDelivery_(p) || p.t_kepkeveres === true) && !p.deliveryLink)
      throw new Error('Átadás előtt add meg az átadási linket (mappa vagy videók).');
    if (p.eventType === 'Videóvágás' && p.status === 'helyszin') p.status = 'utomunka';   // videóvágásnál nincs helyszíni munka
    if (['utomunka', 'leadva', 'jovahagyas', 'atadva'].indexOf(p.status) >= 0 && (!old || old.status !== p.status) && !p.siteOk && p.eventType !== 'Videóvágás')   // a beszámoló a helyszíni munka kipipálásakor (a helyszíni munkára lépéskor még nem kell)
      throw new Error('Előbb jelöld be, hogy rendben ment-e a helyszíni munka.');
    p.updatedAt = now_(); p.updatedBy = u.name; p.mutationId = mutationId;
    putRow_('projects', sh, p, row);
    const sig = (list, f) => list.map(f).sort().join('|');
    const renamed = !old || old.name !== p.name;
    const oldCrew = old ? readAll_('crewAssign').filter(r => r.projectId === id) : [];
    if (renamed || sig(oldCrew, r => r.crewId + ':' + r.role) !== sig(crew, c => c.crewId + ':' + c.role))
      rewriteAssign_('crewAssign', r => r.projectId !== id,
        crew.map(c => ({ projectId: id, crewId: c.crewId, role: c.role, projectName: p.name, crewName: crewMap[c.crewId].name })));
    const oldEq = old ? readAll_('eqAssign').filter(r => r.projectId === id) : [];
    if (renamed || sig(oldEq, r => r.itemId + ':' + (r.crewId || '') + ':' + r.qty) !== sig(equipment, e => e.itemId + ':' + e.crewId + ':' + e.qty))
      rewriteAssign_('eqAssign', r => r.projectId !== id,
        equipment.map(e => ({ projectId: id, itemId: e.itemId, qty: e.qty, projectName: p.name, itemName: invMap[e.itemId].name, crewId: e.crewId, crewName: e.crewId ? crewMap[e.crewId].name : '' })));
    dbFlush_();
    logArgs = [old ? 'Projekt módosítva' : 'Projekt létrehozva', p.name, old ? diffProject_(old, p, assignDiff_(oldCrew, crew, oldEq, equipment, crewMap, invMap), crewMap) : (p.date ? 'Dátum: ' + p.date : '')];   // naplózás a zár után (adatbázis-módban a mentéssel együtt megy)
    if (dbOn_()) { logEvent_(u, logArgs[0], logArgs[1], logArgs[2]); logArgs = null; }
    const out = Object.assign({}, p, { crew: crew, equipment: equipment });
    delete out.mutationId;
    return out;
  });
  if (logArgs) logEvent_(u, logArgs[0], logArgs[1], logArgs[2]);
  if (a.deferCal === true || saved.duplicateOf) return saved;   // az új felület külön kérésben frissíti a naptárat, így a mentés gyors
  return syncCalendar_(saved);   // a naptár frissítése a zár után (lassú lehet); hiba esetén a mentés akkor is megmarad
}

/* Stáb- és eszközbeosztás változásai olvasható formában (a Részletek ablak előzményeihez) */
function assignDiff_(oldCrew, crew, oldEq, eq, crewMap, invMap) {
  const nm = (id, fb) => (crewMap[id] && crewMap[id].name) || fb || 'ismeretlen';
  const it = (id, fb) => (invMap[id] && invMap[id].name) || fb || 'ismeretlen eszköz';
  const out = [];
  const oc = {}, nc = {};
  oldCrew.forEach(r => { oc[r.crewId + '|' + r.role] = r; });
  crew.forEach(c => { nc[c.crewId + '|' + c.role] = c; });
  const add = [], del = [];
  Object.keys(nc).forEach(k => { if (!oc[k]) add.push(nm(nc[k].crewId) + ' (' + nc[k].role + ')'); });
  Object.keys(oc).forEach(k => { if (!nc[k]) del.push(nm(oc[k].crewId, oc[k].crewName) + ' (' + oc[k].role + ')'); });
  if (add.length) out.push('Stáb hozzáadva: ' + add.join(', '));
  if (del.length) out.push('Stábból kivéve: ' + del.join(', '));
  const oe = {}, ne = {};
  oldEq.forEach(r => { const k = r.itemId + '|' + (r.crewId || ''); oe[k] = { q: Number(r.qty) || 0, n: r.itemName, c: r.crewName }; });
  eq.forEach(e => { ne[e.itemId + '|' + (e.crewId || '')] = { q: Number(e.qty) || 0 }; });
  const lbl = (k, o) => { const [iid, cid] = k.split('|'); return it(iid, o && o.n) + (cid ? ' – ' + nm(cid, o && o.c) : ' – közös'); };
  const ea = [], ed = [], eqc = [];
  Object.keys(ne).forEach(k => { if (!oe[k]) ea.push(lbl(k) + (ne[k].q > 1 ? ' ×' + ne[k].q : '')); else if (oe[k].q !== ne[k].q) eqc.push(lbl(k, oe[k]) + ': ' + oe[k].q + ' → ' + ne[k].q + ' db'); });
  Object.keys(oe).forEach(k => { if (!ne[k]) ed.push(lbl(k, oe[k]) + (oe[k].q > 1 ? ' ×' + oe[k].q : '')); });
  const cap = l => l.length > 12 ? l.slice(0, 12).join(', ') + ' és még ' + (l.length - 12) : l.join(', ');
  if (ea.length) out.push('Eszköz hozzáadva: ' + cap(ea));
  if (ed.length) out.push('Eszköz kivéve: ' + cap(ed));
  if (eqc.length) out.push('Eszköz darabszám: ' + cap(eqc));
  return out;
}

function diffProject_(a, b, extra, crewMap) {
  const labels = {};
  TABLES.projects.cols.forEach(c => { labels[c[0]] = c[1]; });
  const skip = { createdAt: 1, updatedAt: 1, updatedBy: 1, mutationId: 1, folderId: 1, prevStatus: 1 };
  const changed = [];
  Object.keys(labels).forEach(k => {
    if (skip[k]) return;
    const x = a[k] == null ? '' : String(a[k]), y = b[k] == null ? '' : String(b[k]);
    const short = v => v.length <= 80 && !/^[\[{]/.test(v.trim());   // rövid értéknél a régi → új érték is (a projekt Részletek ablakához)
    if (x !== y && k === 'lead') { const n = v => v ? ((crewMap && crewMap[v] && crewMap[v].name) || v) : '–'; changed.push('Projektvezető: ' + n(x) + ' → ' + n(y)); return; }
    if (x !== y) changed.push(k === 'status' ? 'Állapot: ' + (STATUS_LABELS[a.status] || a.status) + ' → ' + (STATUS_LABELS[b.status] || b.status) : short(x) && short(y) ? labels[k] + ': ' + (x || '–') + ' → ' + (y || '–') : labels[k]);
  });
  (extra || []).forEach(x => changed.push(x));
  return changed.length ? changed.join('; ') : 'Beosztás módosítva';
}

function deleteProject_(u, a) {
  const id = str_(a && a.id, 64);
  if (!ID_RE.test(id)) throw new Error('Hibás projektazonosító.');
  return withLock_(() => {
    const sh = sheetFor_('projects'), row = findRow_(sh, id);
    if (!row) return { deleted: false, id: id };
    const old = readRow_('projects', sh, row);
    if (old.calEventId && !readAll_('projects').some(x => x.id !== id && x.calEventId === old.calEventId)) calDelete_(old.calEventId);
    sh.deleteRow(row);
    rewriteAssign_('crewAssign', r => r.projectId !== id, []);
    rewriteAssign_('eqAssign', r => r.projectId !== id, []);
    dbFlush_();
    logEvent_(u, 'Projekt törölve', old.name, old.date ? 'Dátum: ' + old.date : '');
    try { dealOrphansClean_(); } catch (e) {}   // a hozzá tartozó (szerződött) értékesítési lehetőség is eltűnik
    return { deleted: true, id: id };
  });
}

/* ===================== GOOGLE NAPTÁR ===================== */
// A projektek a „Terepi Munkák Lumos Motion” naptárba kerülnek (app → naptár). A naptár többi eseménye az app Naptár fülén látszik,
// és egy kattintással projekt hozható létre belőle. A beosztott stáb vendégként kerül az eseményre (meghívó e-mail nélkül).
/** EGYSZER FUTTATANDÓ a szerkesztőből a Code.gs frissítése után: engedélyt kér a Google Naptárhoz, és kiírja a naptár nevét. */
/** Egyszer futtasd a szerkesztőből (▶ Run): engedélyt kér a külső hívásra, ami a Google-belépés ellenőrzéséhez kell. */
function authorizeGoogleLogin() {
  const r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=x', { muteHttpExceptions: true });
  Logger.log('Google-belépés ellenőrzése elérhető (' + r.getResponseCode() + '). Client ID: ' + (googleClientId_() || 'MÉG NINCS BEÁLLÍTVA'));
}

function authorizeCalendar() { Logger.log('Naptár rendben: ' + cal_().getName()); }
const CAL_VAGOI_ID = 'c_049dca3cc6b78ea7bd304a4cafaab3ca26b504fc3d4e141a3b2d308b14705250@group.calendar.google.com';   // „Vágói Naptár Lumos Motion” (csak olvasás)
function cal_() { const c = CalendarApp.getCalendarById(CALENDAR_ID); if (!c) throw new Error('A Google Naptár nem érhető el.'); return c; }
/* Videóvágás projekt: a Vágói naptárba kerül (a terepi naptár a helyszíni munkáké) */
function calIdFor_(p) { return p && p.eventType === 'Videóvágás' ? CAL_VAGOI_ID : CALENDAR_ID; }
function calFor_(p) { const c = CalendarApp.getCalendarById(calIdFor_(p)); if (!c) throw new Error('A Google Naptár nem érhető el.'); return c; }
function evCalId_(ev) { try { return ev.getOriginalCalendarId() || CALENDAR_ID; } catch (e) { return CALENDAR_ID; } }
function calEvent_(id) { if (!id) return null; try { const ev = cal_().getEventById(id); if (ev) return ev; } catch (e) {} try { const v = CalendarApp.getCalendarById(CAL_VAGOI_ID); return v ? v.getEventById(id) : null; } catch (e) { return null; } }   // terepi, majd vágói naptár
function calDelete_(id) { try { const ev = calEvent_(id); if (ev) ev.deleteEvent(); } catch (e) { Logger.log('Naptár törlés hiba: ' + e); } }
function calDate_(iso, hhmm) { const d = Utilities.parseDate(iso + ' ' + (hhmm || '00:00'), SHEET_TZ, 'yyyy-MM-dd HH:mm'); return d; }
function calPlan_(p) {
  const crewMap = byId_(readAll_('crew')), invMap = byId_(readAll_('inventory'));
  const roles = {};
  if (p.lead && crewMap[p.lead]) roles[p.lead] = ['Projektvezető'];
  const etv = parseEditTasks_(p.editTasks), ownV = Object.keys(etv).filter(id => etv[id].indexOf('f_x_vago') >= 0), onsite = cid => ownV.length ? ownV.indexOf(cid) >= 0 : p.editOnsite === true;   // helyszíni vágó személyenként
  (p.crew || []).forEach(c => { if (crewMap[c.crewId] && c.role !== 'Értékesítő') (roles[c.crewId] = roles[c.crewId] || []).push(c.role === 'Vágó' && onsite(c.crewId) ? 'Helyszíni vágó' : c.role); });
  const crewLines = Object.keys(roles).map(cid => '• ' + crewMap[cid].name + ' – ' + roles[cid].join(', ') + (cid === p.lead && crewMap[cid].phone ? ' – ' + crewMap[cid].phone : ''));   // telefonszám csak a projektvezetőnél
  // eszközök munkatársanként: előbb a név, alatta az eszközei, a csoportok között üres sor
  const eqBy = {}, eqOrder = [];
  (p.equipment || []).filter(e => invMap[e.itemId]).forEach(e => { const k = e.crewId && crewMap[e.crewId] ? e.crewId : ''; if (!eqBy[k]) { eqBy[k] = []; eqOrder.push(k); } eqBy[k].push('☐ ' + e.qty + '× ' + invMap[e.itemId].name); });
  const eqTxt = eqOrder.sort((a, b) => (a === '') - (b === '')).map(k => (k ? crewMap[k].name : 'Közös / még nincs kiosztva') + '\n' + eqBy[k].join('\n')).join('\n\n');
  const eqLines = eqTxt ? [eqTxt] : [];
  const lines = [];
  const rec = Object.keys(REC_LABELS).filter(k => p[k] === true && k !== 'er_creative').map(k => REC_LABELS[k] + (Number(p[k + '_n']) > 1 ? ' ×' + p[k + '_n'] : ''));
  if (Number(p.er_clips) > 0) rec.push(p.er_clips + ' kivágás');
  if (Number(p.er_subs) > 0) rec.push(p.er_subs + ' feliratozás');
  if (Number(p.er_summary) > 0) rec.push(p.er_summary + ' rövid összefoglaló videó');
  if (Number(p.foto_db) > 0) lines.push('Fotózás: ' + p.foto_db + ' db fotó');
  const rooms = parseRooms_(p.recRooms), RL = { er_total: 'Teljes alakos kamera', er_close: 'Közeli kamera', er_crowd: 'Közönség kamera', er_slides: 'Diák rögzítése' };
  if (rooms && rooms.some(r => Object.keys(RL).some(k => r[k] > 0))) {   // termenként: név + kamerák
    lines.push('Előadásrögzítés helyszínenként:');
    rooms.forEach((r, i) => { const cs = Object.keys(RL).filter(k => r[k] > 0).map(k => RL[k] + (r[k] > 1 ? ' ×' + r[k] : '')); if (cs.length) lines.push('• ' + (i + 1) + '. helyszín' + (r.name ? ' – ' + r.name : '') + ': ' + cs.join(', ')); });
    Object.keys(RL).forEach(k => { const j = rec.findIndex(x => x.indexOf(REC_LABELS[k] || '@@') === 0); if (j >= 0) rec.splice(j, 1); });
  }
  if (p.er_creative === true) lines.push('Kreatív videózás: ' + (Number(p.er_creative_n) > 1 ? p.er_creative_n + ' kreatív kamera' : 'kreatív kamera'));   // nem előadásrögzítés
  if (rec.length) lines.push('Előadásrögzítés és kivetítés: ' + rec.join(', ') + (Number(p.er_rooms) > 1 ? ' · ' + p.er_rooms + ' helyszín' : ''));   // a felbontás nem kerül a naptárba
  // az ügyfél neve nem kerül a naptárba: a vendégek a szakemberek, ők az appban sem látják az ügyfelet
  // az érkezés és a távozás az esemény időpontjában szerepel, a leírásba nem kerül külön
  if (p.endDate && p.endDate > p.date && p.lastStartTime) lines.push('Utolsó nap (' + p.endDate + '): érkezés ' + p.lastStartTime + (p.lastEndTime ? ' · távozás kb. ' + p.lastEndTime : ''));
  if (p.lead && crewMap[p.lead]) lines.push('Projektvezető: ' + [crewMap[p.lead].name, crewMap[p.lead].phone].filter(Boolean).join(', '));   // a naptár vendégei a stábtagok: az ügyfél kapcsolattartója nem kerül ide
  if (crewLines.length) lines.push('', 'STÁB', crewLines.join('\n'));
  if (eqLines.length) lines.push('', 'ESZKÖZÖK', eqLines.join('\n'));
  if (p.techPlan) lines.push('', 'TERV', String(p.techPlan).slice(0, 1500));
  if (p.notes) lines.push('', 'JEGYZETEK', String(p.notes).slice(0, 1000));
  // az app linkje nem kerül a leírásba: nem minden meghívottnak van hozzáférése
  const guests = Object.keys(roles).map(cid => String(crewMap[cid].email || '').toLowerCase()).filter(m => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m));
  const crewEmails = Object.keys(crewMap).map(k => String(crewMap[k].email || '').toLowerCase()).filter(Boolean);
  return { description: lines.join('\n'), guests: guests, crewEmails: crewEmails };
}
/** Projekt → naptáresemény (létrehozás, frissítés, törlés). Visszaadja a projektet a friss calEventId-vel. */
function syncCalendar_(p) {
  try {
    const hasDate = /^\d{4}-\d{2}-\d{2}$/.test(String(p.date || ''));
    let ev = calEvent_(p.calEventId);
    // dátum nélküli vagy lemondott (STORNO) projekt: kikerül a Google Naptárból – az app naptárában szürkén, áthúzva marad
    // videóvágás: nem terepi munka – nem kerül a „Terepi Munkák” naptárba
    if (!hasDate || p.status === 'lemondva') { if (ev) { ev.deleteEvent(); setCalId_(p.id, ''); p.calEventId = ''; calBump_(); } return p; }
    const edit = p.eventType === 'Videóvágás';   // videóvágás: a Vágói naptárba, a projekt napjától a leadási határidőig (egész napos)
    if (ev && evCalId_(ev) !== calIdFor_(p)) { try { ev.deleteEvent(); } catch (e) {} ev = null; setCalId_(p.id, ''); p.calEventId = ''; }   // típusváltás: átkerül a másik naptárba
    const title = p.name;
    const editDue = edit && /^\d{4}-\d{2}-\d{2}$/.test(String(p.dueAt || '')) ? p.dueAt : p.date, c0 = String(p.createdAt || '').slice(0, 10);
    const editStart = edit && /^\d{4}-\d{2}-\d{2}$/.test(c0) && c0 < editDue ? c0 : (edit ? editDue : p.date);   // videóvágás: a felvételtől a leadásig (mint az app idővonalán)
    const editEnd = edit && editDue > editStart ? editDue : '';
    const multi = edit ? !!editEnd : p.endDate && p.endDate > p.date;
    const plan = calPlan_(p);
    const lastDay = Utilities.parseDate((multi ? (edit ? editEnd : p.endDate) : p.date) + ' 12:00', SHEET_TZ, 'yyyy-MM-dd HH:mm');
    const dayAfter = new Date(lastDay.getTime() + 86400000);
    const timed = !edit && p.startTime && !multi;
    const start = timed ? calDate_(p.date, p.startTime) : calDate_(edit ? editStart : p.date);
    const end = timed ? new Date(start.getTime() + (Number(p.hours) || 8) * 3600000) : calDate_(Utilities.formatDate(dayAfter, SHEET_TZ, 'yyyy-MM-dd'));
    const allDay = !timed;
    if (!ev) {
      const C = calFor_(p), loc = edit ? '' : p.venue || '';
      ev = allDay ? C.createAllDayEvent(title, start, end, { description: plan.description, location: loc })
                  : C.createEvent(title, start, end, { description: plan.description, location: loc });
      ev.setTag('lumosProjectId', p.id);
      setCalId_(p.id, ev.getId()); p.calEventId = ev.getId();
      if (String(p.crewFinal || '').trim() && plan.guests.length) {   // visszaállított (pl. korábban lemondott) projekt: a véglegesített csapat újra vendég lesz
        const all = {}; plan.crewEmails.forEach(m => { all[m] = 1; }); try { calGuestsSet_(ev, plan.guests, all); } catch (e) { Logger.log('Vendéglista hiba: ' + e); }
      }
    } else {
      if (ev.getTitle() !== title) ev.setTitle(title);
      if (ev.getDescription() !== plan.description) calQuietPatch_(ev, { description: plan.description }, () => ev.setDescription(plan.description));   // a vendégek nem kapnak levelet a leírás frissítéséről
      if ((ev.getLocation() || '') !== (p.venue || '')) ev.setLocation(p.venue || '');
      if (allDay) { if (!ev.isAllDayEvent() || +ev.getAllDayStartDate() !== +start || +ev.getAllDayEndDate() !== +end) ev.setAllDayDates(start, end); }
      else if (ev.isAllDayEvent() || +ev.getStartTime() !== +start || +ev.getEndTime() !== +end) ev.setTime(start, end);
      if (ev.getTag('lumosProjectId') !== p.id) ev.setTag('lumosProjectId', p.id);
    }
    // a stábtagok csak a „Csapat véglegesítése” gombra kerülnek vendégként az eseménybe (finalizeCrew_)
    calBump_();
  } catch (e) {
    Logger.log('Naptár szinkron hiba: ' + e);
    p.calError = 'A naptár frissítése nem sikerült: ' + ((e && e.message) || e);
  }
  return p;
}
/** Esemény csendes frissítése: a Google semmilyen értesítőt nem küld a vendégeknek (sendUpdates: none). Speciális szolgáltatás nélkül a tartalék fut. */
function calQuietPatch_(ev, body, fallback) {
  if (typeof Calendar !== 'undefined' && Calendar.Events) { try { Calendar.Events.patch(body, evCalId_(ev), String(ev.getId()).replace(/@google\.com$/, ''), { sendUpdates: 'none' }); return; } catch (e) { Logger.log('Csendes frissítés hiba: ' + e); } }
  fallback();
}
/** Egyszeri, csendes újraszinkron (2026-11-04): a közelgő események leírásából kikerülnek a stábtagok telefonszámai (csak a projektvezetőé marad).
    A Naptár első megnyitásakor fut – időzítő nélkül, így biztosan lefut. A vendégek nem kapnak értesítést. */
function calPhoneFixOnce_() {
  const P = PropertiesService.getScriptProperties(); if (P.getProperty('MIG_CALDESC6_2026_11')) return;   // 2026-11-04: helyszíni vágó jelölése, felbontás és érkezés/távozás nélkül
  P.setProperty('MIG_CALDESC6_2026_11', now_());   // 2026-11-04 este: eszközök munkatársanként, app-link nélkül
  try { calResyncUpcoming(); } catch (e) { Logger.log('Újraszinkron hiba: ' + e); }
}
function setCalId_(id, evId) {
  withLock_(() => {
    const sh = sheetFor_('projects'), r = findRow_(sh, id);
    if (!r) return;
    const col = TABLES.projects.cols.map(c => c[0]).indexOf('calEventId') + 1;
    sh.getRange(r, col).setNumberFormat('@').setValue(evId);   // a módosítás idejét szándékosan nem írjuk át
  });
}
function plainText_(html) {
  return String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>\s*<p[^>]*>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}
/** A naptár eseményei egy időszakra (az app Naptár fülének). */
function calendarEvents_(a) {
  const from = iso_(a && a.from), to = iso_(a && a.to);
  if (!from || !to || to < from) throw new Error('Hibás időszak.');
  const start = calDate_(from), end = new Date(calDate_(to).getTime() + 86400000);
  if (end - start > 100 * 86400000) throw new Error('Legfeljebb 100 napot lehet egyszerre lekérni.');
  const which = a && a.cal === 'vagoi' ? 'vagoi' : 'terepi';
  if (which === 'terepi') calPhoneFixOnce_();
  const cache = CacheService.getScriptCache(), key = 'pm_cal_' + (cache.get('pm_cal_ver') || '0') + '_' + which + '_' + from + '_' + to, hit = cache.get(key);
  if (hit && !(a && a.fresh)) return JSON.parse(hit);   // fresh: Frissítés / visszatérés az app fülére – a Google Naptárban közben törölt esemény se maradjon itt
  const fmt = (d, f) => Utilities.formatDate(d, SHEET_TZ, f);
  const src = which === 'vagoi' ? CalendarApp.getCalendarById(CAL_VAGOI_ID) : cal_();
  if (!src) throw new Error('A Vágói naptár nem érhető el – ellenőrizd, hogy a szkript fiókja hozzáfér-e.');
  const out = src.getEvents(start, end).map(ev => {
    const allDay = ev.isAllDayEvent();
    const s = allDay ? ev.getAllDayStartDate() : ev.getStartTime();
    let e2 = allDay ? ev.getAllDayEndDate() : ev.getEndTime();
    if (allDay) e2 = new Date(e2.getTime() - 86400000);   // a naptár a záró napot kizárólagosan adja
    return {
      id: ev.getId(), title: ev.getTitle(), allDay: allDay,
      date: fmt(s, 'yyyy-MM-dd'), endDate: fmt(e2 < s ? s : e2, 'yyyy-MM-dd'),
      start: allDay ? '' : fmt(s, 'HH:mm'), end: allDay ? '' : fmt(ev.getEndTime(), 'HH:mm'),
      location: ev.getLocation() || '', description: plainText_(ev.getDescription()).slice(0, 1500),
      guests: ev.getGuestList().map(g => String(g.getEmail()).toLowerCase()),
      projectId: ev.getTag('lumosProjectId') || ''
    };
  });
  try { cache.put(key, JSON.stringify(out), 300); } catch (e) {}   // 5 perc; appbeli módosításnál azonnal érvénytelen (calBump_)
  return out;
}

function calBump_() { const c = CacheService.getScriptCache(); c.put('pm_cal_ver', String(Date.now()), 21600); }
/** Önálló naptárbejegyzés (nem projekt) létrehozása / módosítása az appból. A projektek eseményét az app a projektből frissíti. */
/** Naptárbejegyzés áthelyezése húzással (csak a dátum tolódik, a leírás, vendégek változatlanok). a: {id, days} */
function moveCalEvent_(u, a) {
  const vagoi = a && a.cal === 'vagoi', id = str_(a && a.id, 200);
  const ev = vagoi ? (() => { try { return CalendarApp.getCalendarById(CAL_VAGOI_ID).getEventById(id); } catch (e) { return null; } })() : calEvent_(id), days = Math.round(Number(a && a.days) || 0);   // a Vágói naptár eseményei is húzhatók
  if (!ev) throw new Error('Ez a bejegyzés közben törlődött a naptárból.');
  if (ev.getTag('lumosProjectId')) throw new Error('Ez egy projekt eseménye – a projektet húzd át.');
  if (!days || Math.abs(days) > 400) return { ok: true };
  const sh = d => new Date(d.getTime() + days * 86400000);
  if (ev.isAllDayEvent()) ev.setAllDayDates(sh(ev.getAllDayStartDate()), sh(ev.getAllDayEndDate())); else ev.setTime(sh(ev.getStartTime()), sh(ev.getEndTime()));
  calBump_(); logEvent_(u, vagoi ? 'Vágói naptár' : 'Naptár', ev.getTitle(), 'Áthelyezve ' + days + ' nappal');
  return { ok: true };
}
function saveCalEvent_(u, a) {
  a = a || {};
  const title = str_(a.title, 200), date = iso_(a.date);
  let endDate = iso_(a.endDate) || date;
  if (title.length < 2) throw new Error('Add meg a bejegyzés címét.');
  if (!date) throw new Error('Add meg a dátumot.');
  if (endDate < date) endDate = date;
  const allDay = a.allDay === true || !/^\d{2}:\d{2}$/.test(String(a.start || ''));
  const loc = str_(a.location, 300), desc = str_(a.description, 5000);
  const guests = (Array.isArray(a.guests) ? a.guests : []).map(m => str_(m, 160).toLowerCase()).filter(m => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)).slice(0, 50);
  let start, end;
  if (allDay) { start = calDate_(date); end = new Date(calDate_(endDate).getTime() + 86400000 + 3600000); end = calDate_(Utilities.formatDate(end, SHEET_TZ, 'yyyy-MM-dd')); }
  else {
    start = calDate_(date, a.start);
    end = calDate_(endDate, /^\d{2}:\d{2}$/.test(String(a.end || '')) ? a.end : a.start);
    if (end <= start) end = new Date(start.getTime() + 3600000);
  }
  let ev = a.id ? calEvent_(str_(a.id, 200)) : null;
  if (a.id && !ev) throw new Error('Ez a bejegyzés közben törlődött a naptárból.');
  if (ev && ev.getTag('lumosProjectId')) throw new Error('Ez egy projekt eseménye – a projektben módosítsd, az app frissíti a naptárat.');
  const opts = { description: desc, location: loc };
  if (!ev) {
    if (guests.length) { opts.guests = guests.join(','); opts.sendInvites = a.sendInvites === true && mailOn_('calendar'); }
    ev = allDay ? cal_().createAllDayEvent(title, start, end, opts) : cal_().createEvent(title, start, end, opts);
  } else {
    ev.setTitle(title); ev.setDescription(desc); ev.setLocation(loc);
    if (allDay) ev.setAllDayDates(start, end); else ev.setTime(start, end);
    if (!mailOn_('calendar') && typeof Calendar !== 'undefined' && Calendar.Events) {   // kikapcsolt e-mail: értesítés nélkül állítjuk a vendéglistát
      Calendar.Events.patch({ attendees: guests.map(m => ({ email: m })) }, CALENDAR_ID, String(ev.getId()).replace(/@google\.com$/, ''), { sendUpdates: 'none' });
    } else if (mailOn_('calendar')) {
      const want = {}; guests.forEach(m => { want[m] = 1; });
      const have = {}; ev.getGuestList().forEach(g => { have[String(g.getEmail()).toLowerCase()] = 1; });
      Object.keys(want).forEach(m => { if (!have[m]) ev.addGuest(m); });
      Object.keys(have).forEach(m => { if (!want[m]) ev.removeGuest(m); });
    }
  }
  calBump_();
  logEvent_(u, a.id ? 'Naptárbejegyzés módosítva' : 'Naptárbejegyzés létrehozva', title, date + (endDate !== date ? ' – ' + endDate : '') + (allDay ? '' : ' ' + a.start));
  return { id: ev.getId() };
}
function deleteCalEvent_(u, a) {
  const id = str_(a && a.id, 200), vagoi = a && a.cal === 'vagoi';
  const ev = vagoi ? (() => { try { return CalendarApp.getCalendarById(CAL_VAGOI_ID).getEventById(id); } catch (e) { return null; } })() : calEvent_(id);   // a Vágói naptár eseményei is törölhetők
  if (!ev) throw new Error('A bejegyzés nem található a naptárban – lehet, hogy már törölték. Frissítsd a naptárat.');
  if (ev.getTag('lumosProjectId')) throw new Error('Ez egy projekt eseménye – a projekt törlésével tűnik el a naptárból.');
  const t = ev.getTitle();
  ev.deleteEvent(); calBump_();
  logEvent_(u, 'Naptárbejegyzés törölve', t, '');
  return { deleted: true };
}

/** Drive-mappa a Projektek / <év> / <projekt neve> helyen (ha már van ilyen nevű, azt használja). */
function createProjectFolder_(u, a) {
  const id = str_(a && a.id, 64);
  if (!ID_RE.test(id)) throw new Error('Hibás projektazonosító.');
  // a Drive-műveletek lassúak lehetnek, ezért NEM a zárolás alatt futnak (különben a mentések kifuthatnak az időből)
  const sh = sheetFor_('projects'), row0 = findRow_(sh, id);
  if (!row0) throw new Error('A projekt nem található. Előbb mentsd el.');
  const p = readRow_('projects', sh, row0);
  if (p.folderId) {
    try { const f = DriveApp.getFolderById(p.folderId); if (!f.isTrashed()) return { folderId: p.folderId, url: f.getUrl(), existed: true }; } catch (e) {}
  }
  const root = DriveApp.getFolderById(PROJECTS_FOLDER_ID);
  const year = (p.date || today_()).slice(0, 4);
  const yearFolder = childFolder_(root, year);
  const name = p.name.replace(/[\\/]/g, '-').trim() || 'Projekt';
  const folder = childFolder_(yearFolder, name);
  withLock_(() => {
    const row = findRow_(sh, id); if (!row) return;
    const col = TABLES.projects.cols.findIndex(c => c[0] === 'folderId') + 1;
    sh.getRange(row, col).setNumberFormat('@').setValue(folder.getId());   // a módosítás idejét szándékosan nem írjuk át
  });
  logEvent_(u, 'Projektmappa', p.name, year + ' / ' + name);
  return { folderId: folder.getId(), url: folder.getUrl(), existed: false };
}

function childFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

/* ===================== CÉGADATOK ADÓSZÁMBÓL (számlázz.hu → NAV) ===================== */
/* Ugyanaz, mint a Sales Appban. Az Agent-kulcs a Szkript-tulajdonságok között: SZAMLAZZ_AGENT_KEY (nem a kódban!). */
const SZAMLAZZ_URL = 'https://www.szamlazz.hu/szamla/';
const SZAMLAZZ_KEY_PROPERTY = 'SZAMLAZZ_AGENT_KEY';   // Szkript-tulajdonságok: ide kerül az Agent-kulcs (nem a kódba!)

function xmlEsc_(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }
function szamlazzKey_() { return String(PropertiesService.getScriptProperties().getProperty(SZAMLAZZ_KEY_PROPERTY) || '').trim(); }

function xmlFindAll_(el, name, out) {
  out = out || [];
  el.getChildren().forEach(c => { if (c.getName() === name) out.push(c); xmlFindAll_(c, name, out); });
  return out;
}
function xmlText_(el, name) { const f = xmlFindAll_(el, name); return f.length ? String(f[0].getText() || '').trim() : ''; }

/** Adózó lekérdezése a számlázz.hu-n keresztül (NAV): az adószám első 8 számjegye alapján visszaadja a hivatalos nevet és a székhelyet. */
function szamlazzTaxpayer_(taxNumber) {
  const key = szamlazzKey_();
  if (!key) throw new Error('Nincs beállítva a számlázz.hu Agent-kulcs.');
  const m = String(taxNumber || '').replace(/\s/g, '').match(/^(\d{8})/);
  if (!m) throw new Error('Az adószám nem magyar formátumú (az első 8 számjegy hiányzik).');
  const xml = '<?xml version="1.0" encoding="UTF-8"?><xmltaxpayer xmlns="http://www.szamlazz.hu/xmltaxpayer" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmltaxpayer http://www.szamlazz.hu/docs/xsds/agent/xmltaxpayer.xsd"><beallitasok><szamlaagentkulcs>'
    + xmlEsc_(key) + '</szamlaagentkulcs></beallitasok><torzsszam>' + m[1] + '</torzsszam></xmltaxpayer>';
  const res = UrlFetchApp.fetch(SZAMLAZZ_URL, { method: 'post', muteHttpExceptions: true,
    payload: { 'action-szamla_agent_taxpayer': Utilities.newBlob(xml, 'text/xml', 'taxpayer.xml') } });
  const body = res.getContentText('UTF-8');
  if (res.getResponseCode() !== 200) throw new Error('A számlázz.hu adózó-lekérdezése nem sikerült (HTTP ' + res.getResponseCode() + ').');
  let doc; try { doc = XmlService.parse(body).getRootElement(); } catch (e) { throw new Error('A számlázz.hu adózó-válasza nem értelmezhető: ' + body.slice(0, 200)); }
  if (xmlText_(doc, 'funcCode') === 'ERROR') throw new Error('Adózó-lekérdezés hiba: ' + (xmlText_(doc, 'message') || xmlText_(doc, 'errorCode')));
  if (xmlText_(doc, 'taxpayerValidity') !== 'true') throw new Error('Az adószám nem érvényes vagy nem található a NAV adatbázisában.');
  const name = xmlText_(doc, 'taxpayerName');
  const items = xmlFindAll_(doc, 'taxpayerAddressItem');
  const hq = items.find(i => xmlText_(i, 'taxpayerAddressType') === 'HQ') || items[0];
  if (!name || !hq) throw new Error('A NAV nem adott vissza számlázási címet ehhez az adószámhoz.');
  const street = [xmlText_(hq, 'streetName'), xmlText_(hq, 'publicPlaceCategory'), xmlText_(hq, 'number')].filter(Boolean).join(' ');
  const extra = [xmlText_(hq, 'building') ? xmlText_(hq, 'building') + '. ép.' : '', xmlText_(hq, 'staircase') ? xmlText_(hq, 'staircase') + '. lh.' : '', xmlText_(hq, 'floor') ? xmlText_(hq, 'floor') + '. em.' : '', xmlText_(hq, 'door') ? xmlText_(hq, 'door') + '. ajtó' : ''].filter(Boolean).join(' ');
  return { name: name, shortName: xmlText_(doc, 'taxpayerShortName'), zip: xmlText_(hq, 'postalCode'), city: xmlText_(hq, 'city'), street: xmlText_(hq, 'streetName'),
    place: xmlText_(hq, 'publicPlaceCategory'), number: xmlText_(hq, 'number'), extra: extra, address: (street + (extra ? ' ' + extra : '')).trim() };
}
/* A NAV csupa nagybetűs adatait olvashatóvá tesszük: „SHOPRENTER KFT.” → „Shoprenter Kft.”, „DEBRECEN” → „Debrecen”. */
const LEGAL_FORMS_ = { kft: 'Kft.', zrt: 'Zrt.', nyrt: 'Nyrt.', bt: 'Bt.', kkt: 'Kkt.', ev: 'e.v.', rt: 'Rt.', kht: 'Kht.', nkft: 'Nkft.', nonprofit: 'Nonprofit', egyesület: 'Egyesület', alapítvány: 'Alapítvány' };
const SMALL_WORDS_ = { 'és': 1, 'a': 1, 'az': 1, 'of': 1, 'and': 1 };
function prettyName_(s) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  if (!s || s !== s.toUpperCase()) return s;   // ha nem csupa nagybetű, úgy hagyjuk
  return s.split(' ').map((w, i) => {
    const bare = w.toLowerCase().replace(/\.$/, '');
    if (LEGAL_FORMS_[bare]) return LEGAL_FORMS_[bare];
    if (i > 0 && SMALL_WORDS_[bare]) return bare;
    return w.toLowerCase().split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('-');
  }).join(' ');
}
function prettyAddress_(t) {
  const lower = v => String(v || '').toLowerCase();
  const street = [prettyName_(t.street), lower(t.place), String(t.number || '').toLowerCase()].filter(Boolean).join(' ');
  return ((t.zip ? t.zip + ' ' : '') + prettyName_(t.city) + ', ' + street + (t.extra ? ' ' + lower(t.extra) : '')).trim().replace(/^,\s*/, '');
}

/** Cégadatok betöltése az adószám alapján (új ügyfél felvételekor): hivatalos név és székhely a NAV-ból. Az eredményt 6 órára gyorsítótárazza. */
/* ===================== HUBSPOT KAPCSOLATTARTÓK (csak olvasás) ===================== */
/* Kulcs a Szkript-tulajdonságok között: HUBSPOT_TOKEN (Service Key vagy Private App token; hatókör: crm.objects.contacts.read, crm.objects.companies.read). */
function hubspot_(method, path, body) {
  const tok = String(PropertiesService.getScriptProperties().getProperty('HUBSPOT_TOKEN') || '').trim();
  if (!tok) throw new Error('A HubSpot-kapcsolat még nincs beállítva (HUBSPOT_TOKEN).');
  const opt = { method: method, muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + tok } };
  if (body) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(body); }
  const res = UrlFetchApp.fetch('https://api.hubapi.com' + path, opt);
  const code = res.getResponseCode();
  if (code === 401 || code === 403) throw new Error('A HubSpot elutasította a kérést – ellenőrizd a kulcsot és a hatóköröket.');
  if (code >= 300) throw new Error('HubSpot-hiba (HTTP ' + code + ').');
  return JSON.parse(res.getContentText() || '{}');
}
const HS_PROPS_ = ['firstname', 'lastname', 'email', 'phone', 'mobilephone', 'company', 'jobtitle', 'hs_analytics_source'];
function hsSrcName_(obj) { try { const sp = hsSourceProp_(); return sp && sp.obj === obj ? [sp.name] : []; } catch (e) { return []; } }
/* A „Honnan jött?” lista a HubSpotból: a lehetőség / kapcsolattartó / cég „forrás” jellegű legördülő tulajdonsága (a saját, egyedi mező előnyben),
   ennek híján a HubSpot „Eredeti forrás” (hs_analytics_source) tulajdonsága. 6 órán át gyorsítótárazva. */
function hsSourceProp_() {
  const cache = CacheService.getScriptCache(), hit = cache.get('hs_srcprop2'); if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  const cands = [];
  ['deals', 'contacts', 'companies'].forEach((obj, oi) => {
    let list = []; try { list = (hubspot_('get', '/crm/v3/properties/' + obj).results) || []; } catch (e) { list = []; }
    list.forEach(p => {
      if (p.type !== 'enumeration' || p.hidden || !(p.options || []).length) return;
      const lbl = String(p.label || '') + ' ' + String(p.name || '');
      if (!/forr[aá]s|source|honnan|lead/i.test(lbl) || /latest|legut[oó]bbi|drill|data_|status|st[aá]tusz|lifecycle/i.test(p.name + ' ' + p.label)) return;
      const score = (p.hubspotDefined ? 0 : 100) + (obj === 'deals' ? 30 : obj === 'contacts' ? 20 : 10) + (p.name === 'hs_analytics_source' ? 5 : 0);
      cands.push({ score: score, obj: obj, name: p.name, label: p.label, options: p.options.filter(o => !o.hidden).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)).map(o => ({ value: String(o.value), label: String(o.label || o.value) })) });
    });
  });
  cands.sort((a, b) => b.score - a.score);
  const out = cands[0] ? { obj: cands[0].obj, name: cands[0].name, label: cands[0].label, options: cands[0].options } : null;
  try { cache.put('hs_srcprop2', JSON.stringify(out), 21600); } catch (e) {}
  return out;
}
function hsSourceLabel_(p) { const sp = (() => { try { return hsSourceProp_(); } catch (e) { return null; } })(); if (!sp) return ''; const v = String((p || {})[sp.name] || '').split(';')[0]; const o = sp.options.find(x => x.value === v); return o ? o.label : ''; }
/* A HubSpot „Eredeti forrás” (hs_analytics_source) értéke a lehetőség „Honnan jött?” listájára fordítva */
function hsSource_(v) { return ({ ORGANIC_SEARCH: 'Weboldal', PAID_SEARCH: 'Weboldal', DIRECT_TRAFFIC: 'Weboldal', AI_REFERRALS: 'Weboldal', REFERRALS: 'Ajánlás', EMAIL_MARKETING: 'E-mail / telefon', SOCIAL_MEDIA: 'Közösségi média', PAID_SOCIAL: 'Közösségi média', OTHER_CAMPAIGNS: 'Egyéb' })[String(v || '').toUpperCase()] || ''; }
function hsContact_(c) {
  const p = c.properties || {};
  return { id: c.id, name: [p.lastname, p.firstname].filter(Boolean).join(' ').trim() || p.email || '', email: p.email || '',
    phone: p.mobilephone || p.phone || '', company: p.company || '', title: p.jobtitle || '', source: hsSrcName_('contacts').length ? hsSourceLabel_(p) : hsSource_(p.hs_analytics_source) };
}
function hubspotContactsApi_(arg) {
  const q = str_(arg && arg.q, 100).trim(), client = str_(arg && arg.client, 160).trim();
  const out = [], seen = {};
  const add = list => list.forEach(c => { const x = hsContact_(c); if (!seen[x.id] && (x.name || x.email)) { seen[x.id] = 1; out.push(x); } });
  if (q.length >= 2) {
    add((hubspot_('post', '/crm/v3/objects/contacts/search', { query: q, properties: HS_PROPS_.concat(hsSrcName_('contacts')), limit: 15 }).results) || []);
  } else if (client.length >= 2) {   // nincs keresőszó: az ügyfél cégéhez kapcsolt kapcsolattartók
    const co = (hubspot_('post', '/crm/v3/objects/companies/search', { query: client, properties: ['name'], limit: 3 }).results) || [];
    co.forEach(c => {
      const as = (hubspot_('get', '/crm/v4/objects/companies/' + c.id + '/associations/contacts?limit=50').results) || [];
      const ids = as.map(a => String(a.toObjectId)).slice(0, 50);
      if (ids.length) add((hubspot_('post', '/crm/v3/objects/contacts/batch/read', { properties: HS_PROPS_.concat(hsSrcName_('contacts')), inputs: ids.map(id => ({ id: id })) }).results) || []);
    });
  }
  /* ha a kapcsolattartónál nincs kitöltve a „Cég” mező, a hozzá kapcsolt HubSpot-cég neve */
  try {
    const miss = out.slice(0, 30).filter(x => !x.company);
    if (miss.length) {
      const as = (hubspot_('post', '/crm/v4/associations/contacts/companies/batch/read', { inputs: miss.map(x => ({ id: String(x.id) })) }).results) || [], co = {};
      as.forEach(r => { const t = (r.to || [])[0]; if (t) co[String(r.from && r.from.id)] = String(t.toObjectId); });
      const cids = Object.keys(co).map(k => co[k]).filter((v, i, a) => a.indexOf(v) === i);
      if (cids.length) { const nm = {}; ((hubspot_('post', '/crm/v3/objects/companies/batch/read', { properties: ['name'], inputs: cids.map(id => ({ id: id })) }).results) || []).forEach(c => { nm[String(c.id)] = (c.properties || {}).name || ''; });
        miss.forEach(x => { const n = nm[co[String(x.id)]]; if (n) x.company = n; }); }
    }
  } catch (e) { Logger.log('HubSpot cég: ' + e); }
  return out.slice(0, 30);
}

/* HubSpot-adatlap linkje egy kapcsolattartóhoz (e-mail, ennek híján név alapján) */
function hubspotContactLinkApi_(arg) {
  const email = str_(arg && arg.email, 160).trim(), name = str_(arg && arg.name, 120).trim(), company = str_(arg && arg.company, 160).trim();
  const cache = CacheService.getScriptCache();
  let portal = cache.get('hs_portal');
  if (!portal) portal = String(PropertiesService.getScriptProperties().getProperty('HUBSPOT_PORTAL_ID') || '').trim();
  if (!portal) { try { portal = String((hubspot_('get', '/account-info/v3/details') || {}).portalId || ''); } catch (e) { portal = ''; } if (portal) cache.put('hs_portal', portal, 21600); }
  if (!portal) throw new Error('A HubSpot-fiók azonosítója nem érhető el – add meg a HUBSPOT_PORTAL_ID szkripttulajdonságot.');
  let hit = null;
  if (email) hit = ((hubspot_('post', '/crm/v3/objects/contacts/search', { filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }], properties: ['email'], limit: 1 }).results) || [])[0] || null;
  if (!hit && name.length >= 2) hit = ((hubspot_('post', '/crm/v3/objects/contacts/search', { query: name, properties: ['email', 'company'], limit: 5 }).results) || []).sort((a, b) => (String((b.properties || {}).company || '').toLowerCase() === company.toLowerCase()) - (String((a.properties || {}).company || '').toLowerCase() === company.toLowerCase()))[0] || null;
  if (!hit) return { url: 'https://app.hubspot.com/contacts/' + portal + '/objects/0-1/views/all/list?query=' + encodeURIComponent(email || name), found: false };
  return { url: 'https://app.hubspot.com/contacts/' + portal + '/record/0-1/' + hit.id, found: true };
}

/* HubSpot-jegyzetek a lehetőséghez: a kapcsolattartó (e-mail / név) és a cég jegyzetei, időrendben */
function hsFindContact_(email, name, company) {
  let hit = null;
  if (email) hit = ((hubspot_('post', '/crm/v3/objects/contacts/search', { filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }], properties: ['email'], limit: 1 }).results) || [])[0] || null;
  if (!hit && name.length >= 2) hit = ((hubspot_('post', '/crm/v3/objects/contacts/search', { query: name, properties: ['email', 'company'], limit: 5 }).results) || []).sort((a, b) => (String((b.properties || {}).company || '').toLowerCase() === company.toLowerCase()) - (String((a.properties || {}).company || '').toLowerCase() === company.toLowerCase()))[0] || null;
  return hit;
}
function hubspotNotesApi_(arg) {   // jegyzetek + feladatok + e-mailek + hívások + megbeszélések (a HubSpot tevékenységei)
  const email = str_(arg && arg.email, 160).trim(), name = str_(arg && arg.name, 120).trim(), company = str_(arg && arg.company, 160).trim();
  const from = [];
  const c = (email || name) ? hsFindContact_(email, name, company) : null;
  if (c) from.push(['contacts', c.id]);
  if (company.length >= 2) { const co = ((hubspot_('post', '/crm/v3/objects/companies/search', { query: company, properties: ['name'], limit: 1 }).results) || [])[0]; if (co) from.push(['companies', co.id]); }
  const TYPES = {
    notes: { kind: 'Jegyzet', props: ['hs_note_body', 'hs_timestamp', 'hubspot_owner_id', 'hs_created_by_user_id'], text: p => plainText_(p.hs_note_body || '') },
    tasks: { kind: 'Feladat', props: ['hs_task_subject', 'hs_task_body', 'hs_task_status', 'hs_timestamp', 'hubspot_owner_id', 'hs_created_by_user_id'], text: p => [(p.hs_task_status === 'COMPLETED' ? '✓ ' : '☐ ') + (p.hs_task_subject || ''), plainText_(p.hs_task_body || '')].filter(x => x.trim()).join('\n') },
    emails: { kind: 'E-mail', props: ['hs_email_subject', 'hs_email_text', 'hs_email_direction', 'hs_timestamp', 'hubspot_owner_id', 'hs_created_by_user_id'], text: p => [(p.hs_email_direction === 'INCOMING_EMAIL' ? '← ' : '→ ') + (p.hs_email_subject || ''), String(p.hs_email_text || '').split(/\n\s*(On .+wrote:|.+ írta:|-----Original|________________)/)[0].trim().slice(0, 1500)].filter(x => x.trim()).join('\n') },
    calls: { kind: 'Hívás', props: ['hs_call_title', 'hs_call_body', 'hs_timestamp', 'hubspot_owner_id', 'hs_created_by_user_id'], text: p => [p.hs_call_title || '', plainText_(p.hs_call_body || '')].filter(x => x.trim()).join('\n') },
    meetings: { kind: 'Megbeszélés', props: ['hs_meeting_title', 'hs_meeting_body', 'hs_meeting_start_time', 'hs_timestamp', 'hubspot_owner_id', 'hs_created_by_user_id'], text: p => [p.hs_meeting_title || '', plainText_(p.hs_meeting_body || '')].filter(x => x.trim()).join('\n') }
  };
  let owners = {}, ownErr = '';   // a szerző: tulajdonos (owner) vagy a létrehozó felhasználó; mindkét azonosítóval keresünk
  try { ((hubspot_('get', '/crm/v3/owners?limit=100').results) || []).forEach(o => { const n = [o.lastName, o.firstName].filter(Boolean).join(' ') || o.email || ''; owners['o' + o.id] = n; if (o.userId) owners['u' + o.userId] = n; }); } catch (e) { ownErr = String(e.message || e); }
  const fmt = v => { const d = new Date(isNaN(Number(v)) ? v : Number(v)); return isNaN(d) ? '' : Utilities.formatDate(d, SHEET_TZ, 'yyyy-MM-dd HH:mm'); };
  const notes = [];
  Object.keys(TYPES).forEach(t => {
    const T = TYPES[t], ids = {};
    from.forEach(([o, id]) => { try { ((hubspot_('get', '/crm/v4/objects/' + o + '/' + id + '/associations/' + t + '?limit=100').results) || []).forEach(a => { ids[String(a.toObjectId)] = 1; }); } catch (e) {} });
    const list = Object.keys(ids).slice(0, 100); if (!list.length) return;
    let res = []; try { res = (hubspot_('post', '/crm/v3/objects/' + t + '/batch/read', { properties: T.props, inputs: list.map(id => ({ id: id })) }).results) || []; } catch (e) { res = []; }
    res.forEach(n => { const p = n.properties || {}, txt = T.text(p).trim().slice(0, 4000); if (txt) notes.push({ id: t + ':' + n.id, kind: T.kind, at: fmt(p.hs_meeting_start_time || p.hs_timestamp || n.createdAt), by: owners['u' + (p.hs_created_by_user_id || '')] || owners['o' + (p.hubspot_owner_id || '')] || '', text: txt }); });
  });
  notes.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return { notes: notes, found: !!c, ownErr: ownErr };
}

/* HubSpot cégek keresése (új lehetőség ügyfele): név, domain, város */
function hubspotCompaniesApi_(arg) {
  const q = str_(arg && arg.q, 100).trim();
  if (q.length < 2) return [];
  const res = (hubspot_('post', '/crm/v3/objects/companies/search', { query: q, properties: ['name', 'domain', 'city', 'address', 'zip', 'phone', 'hs_analytics_source', 'num_associated_deals'].concat(hsSrcName_('companies')), limit: 10 }).results) || [];
  return res.map(c => { const p = c.properties || {}; return { id: c.id, name: String(p.name || '').trim(), domain: p.domain || '', city: p.city || '', address: [p.zip, p.city, p.address].filter(Boolean).join(' '), phone: p.phone || '', source: hsSrcName_('companies').length ? hsSourceLabel_(p) : hsSource_(p.hs_analytics_source), deals: Number(p.num_associated_deals) || 0 }; }).filter(x => x.name);
}

function lookupTaxpayerApi_(arg) {
  const digits = String(arg && arg.tax || '').replace(/\D/g, '');
  if (digits.length < 8) throw new Error('Az adószám első 8 számjegye szükséges.');
  const key8 = digits.slice(0, 8), cache = CacheService.getScriptCache();
  const hit = cache.get('tp2_' + key8);
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  if (!szamlazzKey_()) throw new Error('A cégadatok automatikus betöltése még nincs beállítva.');
  const t = szamlazzTaxpayer_(key8);
  const out = { name: prettyName_(t.shortName || t.name), fullName: t.name, address: prettyAddress_(t) };
  try { cache.put('tp2_' + key8, JSON.stringify(out), 21600); } catch (e) {}
  return out;
}

/* ===================== SZÁMLÁZÁS (számlázz.hu Számla Agent) =====================
   Számla / díjbekérő kiállítása a projektből vagy a bevételi sorból, meglévő számla hozzárendelése,
   és a kifizetések követése: a számlázz.hu IPN-értesítése (doPost ?ipn=…) és lekérdezés (szSync).
   A kifizetés alapján a projekt / bevételi sor fizetési állapota magától frissül. Az Agent-kulcs: SZAMLAZZ_AGENT_KEY. */
const SZ_SETTINGS_PROPERTY = 'LUMOS_PM_SZ';
const SZ_KIND_LABEL_ = { szamla: 'Számla', dijbekero: 'Díjbekérő', eloleg: 'Foglalószámla', vegszamla: 'Végszámla' };
const SZ_VATS = ['27', '18', '5', '0', 'AAM', 'TAM', 'EU', 'EUK', 'MAA', 'F.AFA', 'K.AFA', 'ÁKK', 'TEHK', 'HO', 'KBAET'];
const SZ_PAYMETHODS = ['Átutalás', 'Készpénz', 'Bankkártya'];
function szSettings_() {
  let s = {}; try { s = JSON.parse(PropertiesService.getScriptProperties().getProperty(SZ_SETTINGS_PROPERTY) || '{}') || {}; } catch (e) { s = {}; }
  const due = Math.round(Number(s.dueDays));
  return { ipnToken: str_(s.ipnToken, 64), dueDays: isFinite(due) && due >= 0 && due <= 120 ? due : 8, vat: SZ_VATS.indexOf(String(s.vat)) >= 0 ? String(s.vat) : '27',
    unit: str_(s.unit, 20) || 'db', payMethod: SZ_PAYMETHODS.indexOf(s.payMethod) >= 0 ? s.payMethod : 'Átutalás',
    eInvoice: true,   /* mindig e-számla (2026-11-02: Ervin kérése) */ sendEmail: s.sendEmail !== false, comment: str_(s.comment, 500), lastSync: str_(s.lastSync, 30) };
}
function szSettingsView_() { const s = szSettings_(); s.hasKey = !!szamlazzKey_(); return s; }
function szStore_(s) { delete s.hasKey; PropertiesService.getScriptProperties().setProperty(SZ_SETTINGS_PROPERTY, JSON.stringify(s)); }
function szSaveSettings_(u, a) {
  a = a || {};
  const s = szSettings_();
  if (a.agentKey !== undefined && String(a.agentKey).trim()) {
    const k = String(a.agentKey).trim();
    if (!/^[A-Za-z0-9]{20,120}$/.test(k)) throw new Error('Az Agent-kulcs formátuma nem megfelelő (csak betűk és számok).');
    PropertiesService.getScriptProperties().setProperty(SZAMLAZZ_KEY_PROPERTY, k);
    logEvent_(u, 'Számlázás', '', 'Agent-kulcs beállítva');
  }
  if (a.dueDays !== undefined) { const n = Math.round(Number(a.dueDays)); if (!isFinite(n) || n < 0 || n > 120) throw new Error('A fizetési határidő 0–120 nap lehet.'); s.dueDays = n; }
  if (a.vat !== undefined) { if (SZ_VATS.indexOf(String(a.vat)) < 0) throw new Error('Ismeretlen ÁFA-kulcs.'); s.vat = String(a.vat); }
  if (a.unit !== undefined) s.unit = str_(a.unit, 20) || 'db';
  if (a.payMethod !== undefined) { if (SZ_PAYMETHODS.indexOf(a.payMethod) < 0) throw new Error('Ismeretlen fizetési mód.'); s.payMethod = a.payMethod; }
  if (a.eInvoice !== undefined) s.eInv2 = !!a.eInvoice;
  if (a.sendEmail !== undefined) s.sendEmail = !!a.sendEmail;
  if (a.comment !== undefined) s.comment = str_(a.comment, 500);
  if (!s.ipnToken || a.newIpnToken) s.ipnToken = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  szStore_(s);
  return finData_();
}

/* --- kérés a számlázz.hu felé --- */
function szPost_(field, xml) {
  const payload = {}; payload[field] = Utilities.newBlob(xml, 'text/xml', 'request.xml');
  const res = UrlFetchApp.fetch(SZAMLAZZ_URL, { method: 'post', muteHttpExceptions: true, payload: payload });
  const h = {}; const raw = res.getAllHeaders ? res.getAllHeaders() : res.getHeaders();
  Object.keys(raw || {}).forEach(k => { h[k.toLowerCase()] = Array.isArray(raw[k]) ? raw[k][0] : raw[k]; });
  const dec = v => { try { return decodeURIComponent(String(v || '').replace(/\+/g, ' ')); } catch (e) { return String(v || ''); } };
  if (h.szlahu_error_code) throw new Error('számlázz.hu hiba (' + h.szlahu_error_code + '): ' + dec(h.szlahu_error));
  if (res.getResponseCode() !== 200) throw new Error('A számlázz.hu nem érhető el (HTTP ' + res.getResponseCode() + ').');
  return { headers: h, body: res.getContentText('UTF-8'), dec: dec };
}
const szXmlHead_ = (tag, dir) => '<?xml version="1.0" encoding="UTF-8"?><' + tag + ' xmlns="http://www.szamlazz.hu/' + tag + '" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/' + tag + ' https://www.szamlazz.hu/szamla/docs/xsds/' + dir + '/' + tag + '.xsd">';
const szEl_ = (name, v) => v === undefined || v === null ? '' : '<' + name + '>' + xmlEsc_(v) + '</' + name + '>';
function szNeedKey_() { const k = szamlazzKey_(); if (!k) throw new Error('Nincs beállítva a számlázz.hu Agent-kulcs (Bevétel és kiadás → Beállítások → Számlázás).'); return k; }

/** Egy számla aktuális adatai a számlázz.hu-ból (összeg, határidő, kifizetések; kérésre a PDF base64-ben). */
function szQuery_(no, withPdf, order) {
  const key = szNeedKey_();
  const xml = szXmlHead_('xmlszamlaxml', 'agentxml') + szEl_('szamlaagentkulcs', key) + (no ? szEl_('szamlaszam', no) : '') + (!no && order ? szEl_('rendelesSzam', order) : '') + szEl_('pdf', withPdf ? 'true' : 'false') + '</xmlszamlaxml>';
  const r = szPost_('action-szamla_agent_xml', xml);
  return szParseQuery_(r.body, no, withPdf);
}
function szParseQuery_(body, no, withPdf) {
  const r = { body: body };
  let doc; try { doc = XmlService.parse(r.body).getRootElement(); } catch (e) { throw new Error('A számlázz.hu válasza nem értelmezhető: ' + r.body.slice(0, 200)); }
  if (xmlText_(doc, 'sikeres') === 'false' || xmlText_(doc, 'hibakod')) throw new Error('számlázz.hu: ' + (xmlText_(doc, 'hibauzenet') || xmlText_(doc, 'hibakod')));
  const alap = xmlFindAll_(doc, 'alap')[0] || doc, vevo = xmlFindAll_(doc, 'vevo')[0], tot = xmlFindAll_(doc, 'totalossz')[0];
  const nr = v => { const n = Number(String(v || '').replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? Math.round(n) : 0; };
  let paid = 0, paidAt = '';
  xmlFindAll_(doc, 'kifizetes').forEach(k => { paid += nr(xmlText_(k, 'osszeg')); const d = xmlText_(k, 'datum'); if (d > paidAt) paidAt = d; });
  const out = { no: xmlText_(alap, 'szamlaszam') || no, tipus: xmlText_(alap, 'tipus'), date: xmlText_(alap, 'kelt').slice(0, 10), due: xmlText_(alap, 'fizh').slice(0, 10),
    payMethod: xmlText_(alap, 'fizmod'), buyer: vevo ? xmlText_(vevo, 'nev') : '', invNet: tot ? nr(xmlText_(tot, 'netto')) : 0, invGross: tot ? nr(xmlText_(tot, 'brutto')) : 0,
    invPaid: paid, paidAt: paidAt, fromDijbekero: xmlText_(alap, 'hivdijbekszam') };
  out.advReal = /^(true|1|igen)$/i.test(xmlText_(alap, 'elolegszamla'));   // valódi (végszámlán levonható) előlegszámla – a „SZÁMLA A … DÍJBEKÉRŐ ALAPJÁN” sima számla
  // típus felismerése: a számlázz.hu jelzői, a sorszám, végül a tételek szövege (foglaló / előleg / végszámla)
  const flag = t => /^(true|1|igen)$/i.test(xmlText_(alap, t)), names = xmlFindAll_(doc, 'tetel').map(t => xmlText_(t, 'megnevezes')).join(' ') + ' ' + xmlText_(alap, 'megjegyzes');
  out.kind = flag('dijbekero') || /^D-/i.test(out.no) || /^D/i.test(out.tipus) ? 'dijbekero' : flag('elolegszamla') || /^E/i.test(out.tipus) ? 'eloleg' : flag('vegszamla') ? 'vegszamla'
    : /végszámla/i.test(names) ? 'vegszamla' : /foglal[oó]|előleg/i.test(names) ? 'eloleg' : 'szamla';
  if (withPdf) { const p = doc.getChildren().find(c => c.getName() === 'pdf'); out.pdf = p ? String(p.getText() || '').replace(/\s/g, '') : ''; }
  return out;
}

/* --- fizetési állapot a számlák alapján --- */
const SZ_KINDS = ['szamla', 'dijbekero', 'eloleg', 'vegszamla'];
function szPayStatusFor_(list) {
  if (!list.length) return null;
  const fin = list.filter(x => x.kind === 'szamla' || x.kind === 'vegszamla' || !x.kind), adv = list.filter(x => x.kind === 'dijbekero' || x.kind === 'eloleg');
  const mPaid = x => x.kind === 'eloleg' && !!x.manual;   // kézi foglalószámla: a befizetés után készül
  const paidAll = l => l.length && l.every(x => mPaid(x) || (Number(x.invPaid) || 0) >= (Number(x.invGross) || 0) - 1 && (Number(x.invGross) || 0) > 0);
  const anyPaid = l => l.some(x => mPaid(x) || (Number(x.invPaid) || 0) > 0);
  if (fin.length) return paidAll(fin) ? 'teljes' : anyPaid(fin) || anyPaid(adv) ? 'eloleg' : 'var';
  return anyPaid(adv) ? 'eloleg' : 'var';
}
/** A megadott projektek / bevételi sorok fizetési állapotát a hozzájuk tartozó számlákból írja vissza (zárolás alatt hívandó). */
function szApplyPay_(targets) {
  const inv = readAll_('finInvoice');
  const seen = {};
  targets.forEach(t => {
    const key = (t.projectId ? 'p:' + t.projectId : 'i:' + t.incomeId); if (!t.projectId && !t.incomeId || seen[key]) return; seen[key] = 1;
    const st = szPayStatusFor_(inv.filter(x => t.projectId ? invHasProj_(x, t.projectId) : x.incomeId === t.incomeId));
    if (!st) return;
    if (t.projectId) { try { writeProjectPay_(t.projectId, st); } catch (e) {} }
    else { const sh = sheetFor_('finIncome'), row = findRow_(sh, t.incomeId); if (row) { const r = readRow_('finIncome', sh, row); if (r.payStatus !== st) { r.payStatus = st; putRow_('finIncome', sh, r, row); } } }
  });
  dataBump_();
}
/** Közös számla: a fő projekt mellett a további projektek (vesszővel elválasztva a projectIds oszlopban). */
function invHasProj_(x, pid) { return x.projectId === pid || String(x.projectIds || '').split(',').indexOf(pid) >= 0; }
function invTargets_(x) { const o = [{ projectId: x.projectId, incomeId: x.incomeId }]; String(x.projectIds || '').split(',').filter(String).forEach(id => o.push({ projectId: id, incomeId: '' })); return o; }
function szExtraProjects_(a, main) {
  const ids = (Array.isArray(a && a.projectIds) ? a.projectIds : String((a && a.projectIds) || '').split(',')).map(x => str_(x, 64)).filter(x => x && x !== main);
  const sh = sheetFor_('projects'), out = [];
  ids.forEach(id => { if (out.indexOf(id) < 0) { if (!findRow_(sh, id)) throw new Error('A közös számla egyik projektje nem található.'); out.push(id); } });
  return out.slice(0, 40).join(',');
}
/** Rendelésszám: a projekt azonosítója; ha a projekthez már van számla, sorszámmal (a számlázz.hu nem enged ismétlődő rendelésszámot). A díjbekérő a projekt azonosítóját kapja (a foglalószámla ez alapján található meg). */
function szOrderNo_(tg, kind) {
  const base = tg.projectId || tg.incomeId;
  if (kind === 'dijbekero') return base;
  const n = readAll_('finInvoice').filter(x => (tg.projectId ? x.projectId === tg.projectId : x.incomeId === tg.incomeId) && x.kind !== 'dijbekero').length;
  return n ? base + '-' + (n + 1) : base;
}
function szTarget_(a) {
  const projectId = str_(a && a.projectId, 64), incomeId = str_(a && a.incomeId, 64);
  if (!projectId && !incomeId) throw new Error('Hiányzik, melyik projekthez vagy bevételhez tartozik a számla.');
  if (projectId && !findRow_(sheetFor_('projects'), projectId)) throw new Error('A projekt nem található.');
  if (!projectId && !findRow_(sheetFor_('finIncome'), incomeId)) throw new Error('A bevételi sor nem található.');
  return { projectId: projectId, incomeId: projectId ? '' : incomeId };
}

/** Számla vagy díjbekérő kiállítása. a: {projectId|incomeId, kind, buyer:{name,tax,zip,city,address,email}, items:[{name,qty,unit,price,vat}], fulfill, due, payMethod, comment, eInvoice, sendEmail} */
function szInvoice_(u, a) {
  a = a || {};
  const key = szNeedKey_(), tg = szTarget_(a), set = szSettings_();
  const b = a.buyer || {}, kind = SZ_KINDS.indexOf(a.kind) >= 0 ? a.kind : 'szamla';
  const dijbekeroNo = kind === 'eloleg' ? str_(a.dijbekeroNo, 60) : '', elolegNo = kind === 'vegszamla' ? str_(a.elolegNo, 60) : '';
  const buyer = { name: str_(b.name, 200), tax: str_(b.tax, 20), zip: str_(b.zip, 10), city: str_(b.city, 80), address: str_(b.address, 200), email: str_(b.email, 300) };
  if (buyer.name.length < 2) throw new Error('Add meg a vevő nevét.');
  if (!buyer.zip || !buyer.city || !buyer.address) throw new Error('Add meg a vevő teljes címét (irányítószám, település, cím).');
  if (buyer.email && !buyer.email.split(/[,;]\s*/).every(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))) throw new Error('Hibás e-mail-cím a vevőnél.');
  const items = (Array.isArray(a.items) ? a.items : []).slice(0, 30).map(it => {
    const qty = Number(String(it.qty).replace(',', '.')), price = Math.round(Number(String(it.price).replace(/\s/g, '').replace(',', '.'))), vat = String(it.vat || set.vat);
    if (str_(it.name, 300).length < 2) throw new Error('Minden tételnek adj megnevezést.');
    if (!isFinite(qty) || qty <= 0) throw new Error('Hibás mennyiség: ' + it.name);
    if (!isFinite(price)) throw new Error('Hibás egységár: ' + it.name);
    if (SZ_VATS.indexOf(vat) < 0) throw new Error('Ismeretlen ÁFA-kulcs: ' + vat);
    const net = Math.round(price * qty), rate = /^\d+$/.test(vat) ? Number(vat) : 0, vatAmt = Math.round(net * rate / 100);
    return { name: str_(it.name, 300), qty: qty, unit: str_(it.unit, 20) || set.unit, price: price, vat: vat, net: net, vatAmt: vatAmt, gross: net + vatAmt, note: str_(it.note, 300) };
  });
  if (!items.length) throw new Error('Adj meg legalább egy tételt.');
  const today = today_(), fulfill = iso_(a.fulfill) || today, due = iso_(a.due) || today;
  const payMethod = SZ_PAYMETHODS.indexOf(a.payMethod) >= 0 ? a.payMethod : set.payMethod;
  const eInvoice = true,   // mindig e-számla
    sendEmail = mailOn_('invoice') && !!buyer.email && (a.sendEmail === undefined ? set.sendEmail : !!a.sendEmail);   // kikapcsolt e-mailnél a számlázz.hu sem küldi ki
  const taxDigits = buyer.tax.replace(/\D/g, '');
  const xml = szXmlHead_('xmlszamla', 'agent')
    + '<beallitasok>' + szEl_('szamlaagentkulcs', key) + szEl_('eszamla', eInvoice ? 'true' : 'false') + szEl_('szamlaLetoltes', 'false') + szEl_('valaszVerzio', '2') + '</beallitasok>'
    + '<fejlec>' + szEl_('keltDatum', today) + szEl_('teljesitesDatum', fulfill) + szEl_('fizetesiHataridoDatum', due) + szEl_('fizmod', payMethod) + szEl_('penznem', 'Ft')
    + szEl_('szamlaNyelve', 'hu') + szEl_('megjegyzes', str_(a.comment, 1000)) + szEl_('arfolyamBank', '') + szEl_('arfolyam', '0') + szEl_('rendelesSzam', szOrderNo_(tg, kind))
    + (dijbekeroNo ? szEl_('dijbekeroSzamlaszam', dijbekeroNo) : '') + szEl_('elolegszamla', kind === 'eloleg' ? 'true' : 'false') + szEl_('vegszamla', kind === 'vegszamla' ? 'true' : 'false')
    + (elolegNo ? szEl_('elolegSzamlaszam', elolegNo) : '') + szEl_('dijbekero', kind === 'dijbekero' ? 'true' : 'false') + (a.paid ? szEl_('fizetve', 'true') : '') + '</fejlec>'
    + '<elado>' + szEl_('emailReplyto', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(u && u.email || '')) ? u.email : 'ervin.egri@lumosmotion.com') + '</elado>'   // a számlázz.hu kötelezően kéri az <elado> elemet; a vevő válasza hozzánk jön
    + '<vevo>' + szEl_('nev', buyer.name) + szEl_('irsz', buyer.zip) + szEl_('telepules', buyer.city) + szEl_('cim', buyer.address)
    + (buyer.email ? szEl_('email', buyer.email) : '') + szEl_('sendEmail', sendEmail ? 'true' : 'false')
    + szEl_('adoalany', taxDigits.length >= 11 ? '1' : '-1') + (taxDigits.length >= 11 ? szEl_('adoszam', taxDigits.slice(0, 8) + '-' + taxDigits[8] + '-' + taxDigits.slice(9, 11)) : '') + '</vevo>'
    + '<tetelek>' + items.map(it => '<tetel>' + szEl_('megnevezes', it.name) + szEl_('mennyiseg', String(it.qty)) + szEl_('mennyisegiEgyseg', it.unit) + szEl_('nettoEgysegar', String(it.price))
      + szEl_('afakulcs', it.vat) + szEl_('nettoErtek', String(it.net)) + szEl_('afaErtek', String(it.vatAmt)) + szEl_('bruttoErtek', String(it.gross)) + (it.note ? szEl_('megjegyzes', it.note) : '') + '</tetel>').join('') + '</tetelek>'
    + '</xmlszamla>';
  const r = szPost_('action-xmlagentxmlfile', xml);
  let no = r.dec(r.headers.szlahu_szamlaszam), gross = Number(r.headers.szlahu_bruttovegosszeg) || 0, net = Number(r.headers.szlahu_nettovegosszeg) || 0, open = null, url = r.dec(r.headers.szlahu_vevoifiokurl);
  try {
    const doc = XmlService.parse(r.body).getRootElement();
    if (xmlText_(doc, 'sikeres') === 'false') throw new Error('számlázz.hu hiba (' + xmlText_(doc, 'hibakod') + '): ' + xmlText_(doc, 'hibauzenet'));
    no = xmlText_(doc, 'szamlaszam') || no; gross = Number(xmlText_(doc, 'szamlabrutto')) || gross; net = Number(xmlText_(doc, 'szamlanetto')) || net;
    const k = xmlText_(doc, 'kintlevoseg'); if (k !== '') open = Number(k); url = r.dec(xmlText_(doc, 'vevoifiokurl')) || url;
  } catch (e) { if (/számlázz\.hu hiba/.test(String(e.message))) throw e; }
  if (!no) throw new Error('A számlázz.hu nem adott vissza számlaszámot: ' + r.body.slice(0, 200));
  const row = { id: Utilities.getUuid(), no: no, kind: kind, advType: kind === 'eloleg' ? 'elolegszamla' : '', projectId: tg.projectId, incomeId: tg.incomeId, buyer: buyer.name, date: today, due: due,
    invNet: Math.round(net) || items.reduce((s, x) => s + x.net, 0), invGross: Math.round(gross) || items.reduce((s, x) => s + x.gross, 0), invPaid: 0, paidAt: '', payMethod: payMethod,
    createdAt: now_(), createdBy: u.name, checkedAt: now_(), note: url ? 'Vevői fiók: ' + url : '',
    items: JSON.stringify(items.map(x => ({ name: x.name, qty: x.qty, unit: x.unit, price: x.price, vat: x.vat }))), ref: dijbekeroNo || elolegNo,
    projectIds: tg.projectId ? szExtraProjects_(a, tg.projectId) : '', tigId: str_(a.tigId, 64) };
  if (open !== null && isFinite(open)) row.invPaid = Math.max(0, row.invGross - Math.round(open));
  if (a.paid && !row.invPaid) { row.invPaid = row.invGross; row.paidAt = today; }
  withLock_(() => { putRow_('finInvoice', sheetFor_('finInvoice'), row, 0); szApplyPay_(invTargets_(row)); if (row.tigId) tigMark_(row.tigId, { status: 'szamlazva', invoiceNo: no }); dbFlush_(); });
  logEvent_(u, 'Számlázás', buyer.name, SZ_KIND_LABEL_[kind] + ' kiállítva: ' + no);
  return Object.assign(finData_(), { invoice: row });
}

/** Meglévő (a számlázz.hu-ban kiállított) számla hozzárendelése egy projekthez / bevételi sorhoz. */
function szLink_(u, a) {
  const tg = szTarget_(a), no = str_(a && a.no, 60);
  if (!no) throw new Error('Add meg a számlaszámot.');
  const ex = readAll_('finInvoice').find(x => x.no === no);
  if (ex) {   // már hozzá van rendelve: ha projekthez, közös számlává bővítjük ezzel a projekttel (és a bejelöltekkel)
    if (!tg.projectId || !ex.projectId) throw new Error('Ez a számla már hozzá van rendelve egy bevételi sorhoz.');
    let added = [];
    withLock_(() => { const sh = sheetFor_('finInvoice'), row = findRow_(sh, ex.id), r = readRow_('finInvoice', sh, row);
      const ids = String(r.projectIds || '').split(',').filter(String);
      [tg.projectId].concat(szExtraProjects_(a, r.projectId).split(',').filter(String)).forEach(id => { if (id && id !== r.projectId && ids.indexOf(id) < 0) { ids.push(id); added.push(id); } });
      r.projectIds = ids.join(',');
      // ugyanehhez a projekthez újra hozzárendelve, másik helyről (Díjbekérő / Végszámla kártya): a helyét is igazítjuk
      if (a.slot === 'dijbekero' || a.slot === 'eloleg') { if (r.kind === 'szamla' || r.kind === 'vegszamla') r.kind = 'eloleg'; }
      else if (a.slot === 'vegszamla' || a.slot === 'szamla') { if (r.kind === 'eloleg') r.kind = 'vegszamla'; }
      putRow_('finInvoice', sh, r, row); szApplyPay_(invTargets_(r)); dbFlush_(); Object.assign(ex, r); });
    logEvent_(u, 'Számlázás', ex.buyer, 'Közös számla bővítve: ' + no + (added.length ? ' (+' + added.length + ' projekt)' : ''));
    return Object.assign(finData_(), { invoice: ex, extended: added.length });
  }
  const q = szQuery_(no, false);
  let kind = SZ_KINDS.indexOf(a.kind) >= 0 ? a.kind : q.kind || 'szamla';
  const advSlot = a.slot === 'dijbekero' || a.slot === 'eloleg';
  if (kind === 'szamla' && advSlot) kind = 'eloleg';   // a Díjbekérő helyére tett rendes számla = előre kiállított (foglaló)számla
  if (kind === 'szamla' && !advSlot && tg.projectId && readAll_('finInvoice').some(x => invHasProj_(x, tg.projectId) && (x.kind === 'eloleg' || x.kind === 'dijbekero'))) kind = 'vegszamla';   // foglaló után a sima számla a végszámla
  const row = { id: Utilities.getUuid(), no: q.no, kind: kind, advType: kind === 'eloleg' ? (q.advReal ? 'elolegszamla' : 'szamla') : '', ref: kind === 'eloleg' && q.fromDijbekero ? q.fromDijbekero : '', projectId: tg.projectId, incomeId: tg.incomeId, buyer: q.buyer, date: q.date, due: q.due,
    invNet: q.invNet, invGross: q.invGross, invPaid: q.invPaid, paidAt: q.paidAt, payMethod: q.payMethod, createdAt: now_(), createdBy: u.name, checkedAt: now_(), note: '',
    projectIds: tg.projectId ? szExtraProjects_(a, tg.projectId) : '', tigId: str_(a && a.tigId, 64) };
  withLock_(() => { putRow_('finInvoice', sheetFor_('finInvoice'), row, 0); szApplyPay_(invTargets_(row)); if (row.tigId) tigMark_(row.tigId, { status: 'szamlazva', invoiceNo: row.no }); dbFlush_(); });
  logEvent_(u, 'Számlázás', q.buyer, 'Számla hozzárendelve: ' + q.no);
  return Object.assign(finData_(), { invoice: row });
}
/** Kézi bizonylat (pl. az Egri Ervin E.V. által, nem az összekötött számlázz.hu-fiókból kiállított): rögzítés vagy (id-vel) a kifizetés módosítása.
    a: {projectId|incomeId, projectIds, no, kind, issuer, date, due, invNet, invGross, paid, paidAt, b64, name, mime} */
function szManual_(u, a) {
  a = a || {};
  if (a.id) {
    withLock_(() => { const sh = sheetFor_('finInvoice'), row = findRow_(sh, str_(a.id, 64)); if (!row) throw new Error('A bizonylat nem található.'); const r = readRow_('finInvoice', sh, row);
      if (!r.manual && !a.paid) r.checkedAt = '';   // számlázz.hu-s számla: visszavonásnál a következő frissítés újra lekérdezi
      r.invPaid = a.paid ? r.invGross : 0; r.paidAt = a.paid ? (iso_(a.paidAt) || today_()) : ''; r.checkedAt = now_(); putRow_('finInvoice', sh, r, row); szApplyPay_(invTargets_(r)); dbFlush_();
      logEvent_(u, 'Számlázás', r.buyer, 'Kézi bizonylat ' + r.no + (a.paid ? ' kifizetve' : ' – kifizetés visszavonva')); });
    return finData_();
  }
  const tg = szTarget_(a), no = str_(a.no, 60);
  if (!no) throw new Error('Add meg a bizonylatszámot.');
  if (readAll_('finInvoice').some(x => x.no === no)) throw new Error('Ez a bizonylatszám már szerepel.');
  const money = v => Math.round(Number(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.'))) || 0;
  const net = money(a.invNet), gross = money(a.invGross) || net;
  if (!net) throw new Error('Add meg a nettó összeget.');
  let fileUrl = '';
  if (a.b64) {
    const b64 = String(a.b64); if (b64.length > 14 * 1024 * 1024) throw new Error('A fájl legfeljebb 10 MB lehet.');
    const mime = /^[\w.+-]+\/[\w.+-]+$/.test(String(a.mime || '')) ? String(a.mime) : 'application/pdf';
    const p0 = tg.projectId ? readRow_('projects', sheetFor_('projects'), findRow_(sheetFor_('projects'), tg.projectId)) : null;
    const cf = p0 && p0.client ? clientFolder_(p0.client) : null, year = String(iso_(a.date) || today_()).slice(0, 4), ext = (/\.[a-z0-9]{2,5}$/i.exec(String(a.name || '')) || ['.pdf'])[0];
    const folder = cf ? folderPath_(cf, 'Számlák/' + year, {}) : DriveApp.getFolderById(createProjectFolder_(u, { id: tg.projectId }).folderId);
    const f = folder.createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime, uniqueName_(folder, no.replace(/[\\/:*?"<>|]+/g, '-') + ext)));
    fileUrl = f.getUrl();
  }
  const kind0 = SZ_KINDS.indexOf(a.kind) >= 0 ? a.kind : 'szamla', paid = kind0 === 'eloleg' || !!a.paid, today = today_();
  const row = { id: Utilities.getUuid(), no: no, kind: SZ_KINDS.indexOf(a.kind) >= 0 ? a.kind : 'szamla', projectId: tg.projectId, incomeId: tg.incomeId, buyer: str_(a.buyer, 200), date: iso_(a.date) || today, due: iso_(a.due) || '',
    invNet: net, invGross: gross, invPaid: paid ? gross : 0, paidAt: paid ? (iso_(a.paidAt) || iso_(a.date) || today) : '', payMethod: str_(a.payMethod, 40), createdAt: now_(), createdBy: u.name, checkedAt: now_(), note: str_(a.note, 500), items: '', ref: '',
    projectIds: tg.projectId ? szExtraProjects_(a, tg.projectId) : '', tigId: '', manual: '1', issuer: a.issuer === 'kft' ? 'kft' : 'ev', fileUrl: fileUrl };
  withLock_(() => { putRow_('finInvoice', sheetFor_('finInvoice'), row, 0); szApplyPay_(invTargets_(row)); dbFlush_(); });
  logEvent_(u, 'Számlázás', row.buyer, 'Kézi bizonylat rögzítve: ' + no + (row.issuer === 'ev' ? ' (Egri Ervin E.V.)' : ''));
  return Object.assign(finData_(), { invoice: row });
}
/** Több meglévő számla hozzárendelése egyszerre (import): a: {items:[{projectId|incomeId, projectIds, no, kind}]} – kb. 20 mp-ig dolgozik, a többit a felület újra elküldi. */
function szLinkBatch_(u, a) {
  const items = (Array.isArray(a && a.items) ? a.items : []).slice(0, 60), started = Date.now(), have = {}, rows = [], done = [], errors = [];
  readAll_('finInvoice').forEach(x => { have[x.no] = 1; });
  items.forEach(it => {
    const no = str_(it && it.no, 60); if (!no) return;
    if (Date.now() - started > 20000) return;
    if (have[no]) { done.push(no); return; }
    try { const tg = szTarget_(it), q = szQuery_(no, false);
      rows.push({ id: Utilities.getUuid(), no: q.no || no, kind: SZ_KINDS.indexOf(it.kind) >= 0 ? it.kind : q.kind || 'szamla', projectId: tg.projectId, incomeId: tg.incomeId, buyer: q.buyer, date: q.date, due: q.due,
        invNet: q.invNet, invGross: q.invGross, invPaid: q.invPaid, paidAt: q.paidAt, payMethod: q.payMethod, createdAt: now_(), createdBy: u.name + ' (import)', checkedAt: now_(), note: 'Importálva', items: '', ref: '',
        projectIds: tg.projectId ? szExtraProjects_(it, tg.projectId) : '', tigId: '' });
      have[no] = 1; done.push(no);
    } catch (e) { errors.push(no + ': ' + e.message); done.push(no); }
  });
  if (rows.length) withLock_(() => { const sh = sheetFor_('finInvoice'); rows.forEach(r => putRow_('finInvoice', sh, r, 0)); szApplyPay_([].concat.apply([], rows.map(invTargets_))); dbFlush_(); });
  if (rows.length) logEvent_(u, 'Számlázás', '', 'Számlák importálva: ' + rows.map(r => r.no).join(', '));
  return Object.assign(finData_(), { batch: { done: done, linked: rows.map(r => r.no), errors: errors } });
}
/** Számla előnézete a hozzárendelés előtt: vevő, kelt, összeg (a számlázz.hu-tól). Rövidített számot is megpróbál (pl. LUMOS-26-75 → LUMOS-2026-75). */
/** Számla keresése vevő (cégnév) szerint. A számlázz.hu Agent nem listáz, ezért a számlaszámokat sorban lekérdezzük
    (idei és tavalyi év), és a vevőket egy tárolt jegyzékbe gyűjtjük – csak az első keresés lassú, utána csak az új számlák jönnek.
    a: {q, prefix} → {items:[{no,buyer,date,invNet,invGross,paid,linked}], partial, indexed} */
function szSearch_(u, a) {
  szNeedKey_();
  const q = String(a && a.q || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const prefix = (str_(a && a.prefix, 20) || 'LUMOS').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let idx = {}; try { idx = JSON.parse(bigGet_('SZ_INDEX') || '{}'); } catch (e) { idx = {}; }
  if (idx.p !== prefix) idx = { p: prefix, it: {}, max: {} };
  const started = Date.now(), y0 = Number(today_().slice(0, 4));
  let partial = false, changed = false;
  if (a && a.cached) return { index: idx.it, partial: !idx.full, at: idx.at || 0 };   // csak a tárolt jegyzék (azonnal)
  const key = szNeedKey_(), B = 20;
  const req = no => { const payload = {}; payload['action-szamla_agent_xml'] = Utilities.newBlob(szXmlHead_('xmlszamlaxml', 'agentxml') + szEl_('szamlaagentkulcs', key) + szEl_('szamlaszam', no) + szEl_('pdf', 'false') + '</xmlszamlaxml>', 'text/xml', 'request.xml');
    return { url: SZAMLAZZ_URL, method: 'post', muteHttpExceptions: true, payload: payload }; };
  [y0, y0 - 1].forEach(y => {   // párhuzamos lekérdezés (20 számla egyszerre)
    let n = (idx.max[y] || 0) + 1, miss = 0;
    while (miss < 3) {
      if (Date.now() - started > 20000) { partial = true; break; }
      const nos = []; for (let i = 0; i < B; i++) nos.push(prefix + '-' + y + '-' + (n + i));
      let res; try { res = UrlFetchApp.fetchAll(nos.map(req)); } catch (e) { partial = true; break; }
      for (let i = 0; i < nos.length; i++) {
        const h = res[i].getAllHeaders ? res[i].getAllHeaders() : res[i].getHeaders(), err = Object.keys(h || {}).some(k => k.toLowerCase() === 'szlahu_error_code');
        let r = null; if (!err && res[i].getResponseCode() === 200) { try { r = szParseQuery_(res[i].getContentText('UTF-8'), nos[i], false); } catch (e) { r = null; } }
        if (r) { idx.it[r.no || nos[i]] = [r.buyer, r.date, r.invNet, r.invGross, r.invPaid]; idx.max[y] = n + i; miss = 0; changed = true; }
        else if (++miss >= 3) break;
      }
      n += B;
    }
  });
  idx.full = !partial; idx.at = Date.now();
  try { bigPut_('SZ_INDEX', JSON.stringify(idx)); } catch (e) { }
  if (a && a.all) return { index: idx.it, partial: partial, at: idx.at };   // a teljes jegyzék: a kereső a böngészőben szűr (azonnali)
  const norm = v => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const linked = readAll_('finInvoice'), words = q.split(/\s+/).filter(Boolean);
  const items = Object.keys(idx.it).map(no => { const v = idx.it[no]; return { no: no, buyer: v[0], date: v[1], invNet: v[2], invGross: v[3], invPaid: v[4] }; })
    .filter(x => words.length && words.every(w => norm(x.buyer).indexOf(w) >= 0 || norm(x.no).indexOf(w) >= 0))
    .sort((x, y) => String(y.date).localeCompare(String(x.date))).slice(0, 15)
    .map(x => { const l = linked.find(z => z.no === x.no); return Object.assign(x, { linked: l ? invTargets_(l).map(t => t.projectId || t.incomeId) : [] }); });
  return { items: items, partial: partial, indexed: Object.keys(idx.it).length };
}
function szPeek_(u, a) {
  const raw = str_(a && a.no, 60).toUpperCase().replace(/\s+/g, ''), y = today_().slice(0, 4), tries = [raw];
  let m = /^([A-Z]+)-(\d{2})-(\d+)$/.exec(raw); if (m) tries.push(m[1] + '-20' + m[2] + '-' + m[3]);
  m = /^([A-Z]+)-(\d{1,4})$/.exec(raw); if (m && m[2].length < 4) tries.push(m[1] + '-' + y + '-' + m[2]);
  if (/^\d{1,4}$/.test(raw)) tries.push(str_(a.prefix, 20).toUpperCase() + '-' + y + '-' + raw);
  let last = null;
  const linked = readAll_('finInvoice');
  for (let i = 0; i < tries.length; i++) { try { const q = szQuery_(tries[i], false), l = linked.find(x => x.no === (q.no || tries[i])); return { linked: l ? invTargets_(l).map(t => t.projectId || t.incomeId) : [], no: q.no || tries[i], buyer: q.buyer, date: q.date, due: q.due, invNet: q.invNet, invGross: q.invGross, invPaid: q.invPaid, tipus: q.tipus, kind: q.kind }; } catch (e) { last = e; } }
  throw new Error('Nem található ilyen számla a számlázz.hu-ban (' + tries.join(', ') + ').');
}
/** Hozzárendelt bizonylat helyének módosítása (díjbekérő / foglaló ↔ végszámla). */
function szSetKind_(u, a) {
  const kind = SZ_KINDS.indexOf(a && a.kind) >= 0 ? a.kind : '';
  if (!kind) throw new Error('Ismeretlen típus.');
  withLock_(() => { const sh = sheetFor_('finInvoice'), row = findRow_(sh, str_(a.id, 64)); if (!row) throw new Error('A bizonylat nem található.'); const r = readRow_('finInvoice', sh, row);
    r.kind = kind; putRow_('finInvoice', sh, r, row); szApplyPay_(invTargets_(r)); dbFlush_(); logEvent_(u, 'Számlázás', r.buyer, r.no + ' típusa: ' + kind); });
  return finData_();
}
/** Számla sztornózása a számlázz.hu-ban (Agent, xmlszamlast); az eredeti kikerül az appból (a projekt újra számlázható). */
function szStorno_(u, a) {
  const key = szNeedKey_(), id = str_(a && a.id, 64), all = readAll_('finInvoice'), x = all.find(r => r.id === id);
  if (!x) throw new Error('A számla nem található.');
  if (x.manual) throw new Error('Kézzel rögzített bizonylatot a kiállító programjában lehet sztornózni.');
  if (x.kind === 'dijbekero') throw new Error('A díjbekérő nem számla – nem kell sztornózni, elég törölni a hozzárendelést.');
  if (Number(x.invPaid) > 0) throw new Error('Kifizetett számlát nem lehet sztornózni.');
  const set = szSettings_(), today = today_();
  const mails = mailOn_('invoice') ? String(a && a.email || '').split(/[,;]\s*/).map(x => x.trim().toLowerCase()).filter(x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)).join(',') : '';   // a sztornót a vevő e-mailben kapja (ha kéred)
  const xml = szXmlHead_('xmlszamlast', 'agentst')
    + '<beallitasok>' + szEl_('szamlaagentkulcs', key) + szEl_('eszamla', set.eInvoice ? 'true' : 'false') + szEl_('szamlaLetoltes', 'false') + szEl_('valaszVerzio', '2') + '</beallitasok>'
    + '<fejlec>' + szEl_('szamlaszam', x.no) + szEl_('keltDatum', today) + szEl_('tipus', 'SS') + '</fejlec>'
    + '<elado>' + szEl_('emailReplyto', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(u && u.email || '')) ? u.email : 'ervin.egri@lumosmotion.com') + '</elado>'
    + '<vevo>' + (mails ? szEl_('email', mails) + szEl_('sendEmail', 'true') : szEl_('sendEmail', 'false')) + '</vevo></xmlszamlast>';
  const r = szPost_('action-szamla_agent_st', xml);
  let no = r.dec(r.headers.szlahu_szamlaszam);
  try { const doc = XmlService.parse(r.body).getRootElement(); if (xmlText_(doc, 'sikeres') === 'false') throw new Error('számlázz.hu hiba (' + xmlText_(doc, 'hibakod') + '): ' + xmlText_(doc, 'hibauzenet')); no = xmlText_(doc, 'szamlaszam') || no; }
  catch (e) { if (/számlázz\.hu hiba/.test(String(e.message))) throw e; }
  if (!no) throw new Error('A számlázz.hu nem adott vissza sztornó számlaszámot: ' + String(r.body || '').slice(0, 200));
  withLock_(() => { const sh = sheetFor_('finInvoice'), row = findRow_(sh, id); if (row) sh.deleteRow(row); if (x.tigId) tigMark_(x.tigId, { status: 'jovahagyva', invoiceNo: '' }); dbFlush_(); });
  logEvent_(u, 'Számlázás', x.buyer, 'Sztornózva: ' + x.no + ' → ' + no);
  return Object.assign(finData_(), { stornoNo: no, original: x });
}
/** Díjbekérő „sztornó”: a számlázz.hu-ban törli a díjbekérőt (Agent, xmlszamladbkdel), és kikerül az appból (a projekthez újra kiállítható). */
function szDbkDelete_(u, a) {
  const id = str_(a && a.id, 64), all = readAll_('finInvoice'), x = all.find(r => r.id === id);
  if (!x) throw new Error('A díjbekérő nem található.');
  if (x.kind !== 'dijbekero') throw new Error('Ez nem díjbekérő.');
  if (Number(x.invPaid) > 0) throw new Error('Kifizetett díjbekérőt nem lehet sztornózni.');
  if (all.some(y => y.ref && y.ref === x.no)) throw new Error('Ehhez a díjbekérőhöz már foglalószámla készült.');
  if (!x.manual) {
    const key = szNeedKey_(), xml = szXmlHead_('xmlszamladbkdel', 'dijbekerodel') + '<beallitasok>' + szEl_('szamlaagentkulcs', key) + '</beallitasok><fejlec>' + szEl_('szamlaszam', x.no) + '</fejlec></xmlszamladbkdel>';
    let r; try { r = szPost_('action-szamla_agent_dijbekero_torlese', xml); } catch (e) { if (!/\(335\)/.test(String(e.message))) throw e; }   // 335: már nincs ilyen díjbekérő → az appból is törölhető
    if (r) { try { const doc = XmlService.parse(r.body).getRootElement(); if (xmlText_(doc, 'sikeres') === 'false' && xmlText_(doc, 'hibakod') !== '335') throw new Error('számlázz.hu hiba (' + xmlText_(doc, 'hibakod') + '): ' + xmlText_(doc, 'hibauzenet')); }
      catch (e) { if (/számlázz\.hu hiba/.test(String(e.message))) throw e; } }
  }
  withLock_(() => { const sh = sheetFor_('finInvoice'), row = findRow_(sh, id); if (row) sh.deleteRow(row); dbFlush_(); });
  logEvent_(u, 'Számlázás', x.buyer, 'Díjbekérő sztornózva (törölve): ' + x.no);
  return Object.assign(finData_(), { deletedNo: x.no });
}
/** Bizonylat áthelyezése másik projekthez (pl. két projekt számlái fel voltak cserélve). a: {id, projectId} */
function szMove_(u, a) {
  const id = str_(a && a.id, 64), pid = str_(a && a.projectId, 64);
  if (!pid || !findRow_(sheetFor_('projects'), pid)) throw new Error('A cél projekt nem található.');
  withLock_(() => { const sh = sheetFor_('finInvoice'), row = findRow_(sh, id); if (!row) throw new Error('A számla nem található.'); const r = readRow_('finInvoice', sh, row), old = invTargets_(r);
    r.projectId = pid; r.incomeId = ''; r.projectIds = String(r.projectIds || '').split(',').filter(x => x && x !== pid).join(',');
    putRow_('finInvoice', sh, r, row); szApplyPay_(old.concat(invTargets_(r))); dbFlush_();
    const p = readAll_('projects').find(x => x.id === pid);
    logEvent_(u, 'Számlázás', r.buyer, r.no + ' áthelyezve: ' + (p ? p.name : pid)); });
  return finData_();
}
function szUnlink_(u, a) {
  const id = str_(a && a.id, 64);
  withLock_(() => { const sh = sheetFor_('finInvoice'), row = findRow_(sh, id); if (!row) throw new Error('A számla nem található.'); const r = readRow_('finInvoice', sh, row); sh.deleteRow(row); if (r.tigId) tigMark_(r.tigId, { status: 'jovahagyva', invoiceNo: '' }); dbFlush_(); logEvent_(u, 'Számlázás', r.buyer, 'Hozzárendelés törölve: ' + r.no + ' (a számlázz.hu-ban a számla megmarad)'); });
  return finData_();
}

/** Kifizetések frissítése a számlázz.hu-ból: a még nem teljesen kifizetett számlák (legfeljebb 25 egy körben). */
function szSync_(u, a) {
  szNeedKey_();
  const started = Date.now(), all = readAll_('finInvoice');
  const ids = a && a.id ? [str_(a.id, 64)] : null;
  const noAdv = x => x.kind === 'dijbekero' && (Number(x.invPaid) || 0) >= (Number(x.invGross) || 0) - 1 && !all.some(y => y.ref === x.no) && String(x.checkedAt || '') < new Date(Date.now() - 3 * 3600e3).toISOString() && (!x.paidAt || String(x.paidAt).slice(0, 10) >= new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10));   // csak a kifizetés utáni 3 napban   // kifizetett díjbekérő, amelyhez még nincs foglalószámla (3 óránként újra megnézzük)
  const advUnk = x => x.kind === 'eloleg' && !x.advType;   // régi foglalószámla: egyszer lekérdezzük, valódi előlegszámla-e, és ha díjbekérő alapján készült, a díjbekérő is bekerül
  const todo = all.filter(x => !x.manual && (ids ? ids.indexOf(x.id) >= 0 : (Number(x.invPaid) || 0) < (Number(x.invGross) || 0) - 1 || noAdv(x) || advUnk(x)))
    .sort((x, y) => String(x.checkedAt).localeCompare(String(y.checkedAt))).slice(0, 25);
  const changed = [], errors = [], created = [];
  todo.forEach(x => {
    if (Date.now() - started > 22000) return;
    try { let q;
      try { q = szQuery_(x.no, false); }
      catch (e0) {   // a kifizetett díjbekérőt a számlázz.hu automatikus számlázáskor törli – ilyenkor a rendelésszám alapján a foglalószámlát kapjuk
        if (x.kind !== 'dijbekero') throw e0;
        const o = szAdvFor_(x);
        if (!o) throw new Error('a díjbekérő a számlázz.hu-ban már nem található (valószínűleg kifizették, és a foglalószámla még nem párosítható) – jelöld kézzel fizetettnek');
        szAddAdvance_(all, x, o, created);
        q = { invPaid: Number(x.invGross) || o.invGross, paidAt: o.paidAt || o.date, invGross: x.invGross, invNet: x.invNet, due: x.due };
      }
      if (x.kind === 'dijbekero' && (Number(q.invPaid) || 0) >= (Number(q.invGross || x.invGross) || 0) - 1 && !all.some(y => y.ref === x.no)) { try { const o2 = szAdvFor_(x); if (o2 && o2.kind !== 'dijbekero') szAddAdvance_(all, x, o2, created); } catch (eA) { } }   // a kifizetett díjbekérőből készült foglalószámla is bekerül
      if (x.kind === 'eloleg' && q.no) { x.advType = q.advReal ? 'elolegszamla' : 'szamla';
        if (q.fromDijbekero && !x.ref) x.ref = q.fromDijbekero;
        if (q.fromDijbekero && !all.some(y => y.no === q.fromDijbekero) && !created.some(y => y.no === q.fromDijbekero)) { const r0 = { id: Utilities.getUuid(), no: q.fromDijbekero, kind: 'dijbekero', projectId: x.projectId, incomeId: x.incomeId, buyer: x.buyer || q.buyer, date: '', due: '', invNet: q.invNet || x.invNet, invGross: q.invGross || x.invGross,
            invPaid: q.invGross || x.invGross, paidAt: q.paidAt || x.paidAt, payMethod: q.payMethod || '', createdAt: now_(), createdBy: 'számlázz.hu', checkedAt: now_(), note: 'A ' + x.no + ' számlából (a díjbekérő alapján készült)', items: '', ref: x.no, projectIds: x.projectIds || '', manual: '1', advType: '', issuer: x.issuer || 'kft' };
          created.push(r0); all.push(r0); } }   // a díjbekérő is bekerül (kifizetettként, a számlázz.hu már nem adja vissza)
      const was = Number(x.invPaid) || 0;
      Object.assign(x, { invPaid: q.invPaid, paidAt: q.paidAt || x.paidAt, invGross: q.invGross || x.invGross, invNet: q.invNet || x.invNet, due: q.due || x.due, checkedAt: now_() });
      x._dirty = true; if (q.invPaid !== was) changed.push(x);
    } catch (e) { errors.push(x.no + ': ' + e.message); }
  });
  withLock_(() => {
    const sh = sheetFor_('finInvoice');
    todo.filter(x => x._dirty).forEach(x => { const row = findRow_(sh, x.id); if (row) { delete x._dirty; putRow_('finInvoice', sh, x, row); } });
    created.forEach(x => putRow_('finInvoice', sh, x, 0));
    szApplyPay_([].concat.apply([], todo.map(invTargets_)));
    const s = szSettings_(); s.lastSync = now_(); szStore_(s);
    dbFlush_();
  });
  if (changed.length || created.length) logEvent_(u, 'Számlázás', '', [changed.length ? 'Kifizetés frissítve: ' + changed.map(x => x.no).join(', ') : '', created.length ? 'Foglalószámla behozva: ' + created.map(x => x.no).join(', ') : ''].filter(String).join(' · '));
  return Object.assign(finData_(), { synced: { checked: todo.length, changed: changed.map(x => ({ no: x.no, buyer: x.buyer, paid: x.invPaid, gross: x.invGross })), created: created.map(x => ({ no: x.no, ref: x.ref })), errors: errors } });
}
/** A díjbekérőből készült foglalószámla a számlázz.hu-ban, rendelésszám alapján: a projekt azonosítója, a Sales App díjbekérőinél a Sales-rendelés azonosítója (sales-<id>, vagy az lx_link párosítás). */
function szAdvFor_(x) {
  const pid0 = x.projectId || x.incomeId, cands = [pid0];
  if (/^sales-/.test(String(pid0))) cands.push(String(pid0).slice(6));
  try { (neonSql_([{ query: 'SELECT order_id FROM lx_link WHERE project_id = $1', params: [String(pid0)] }])[0].rows || []).forEach(r => cands.push(r[0])); } catch (eL) { }
  { const yrs = [String(x.date || '').slice(0, 4), String(new Date().getFullYear())].filter(y => /^\d{4}$/.test(y)); cands.slice().forEach(c => { if (c && !/^LM-/.test(c) && !/^sales-/.test(c)) yrs.forEach(y => cands.push('LM-' + y + '-' + c)); }); }   // a Sales App rendelésszáma: LM-<év>-<rendelés-azonosító>
  for (const c of cands.filter((v, i, a) => v && a.indexOf(v) === i)) { try { const t = szQuery_('', false, c); if (t && (t.fromDijbekero === x.no || (t.kind !== 'dijbekero' && Math.abs((Number(t.invGross) || 0) - (Number(x.invGross) || 0)) <= 1 && szSameBuyer_(t.buyer, x.buyer)))) return t; } catch (eQ) { } }
  return null;
}
/** Ugyanaz a vevő-e (ékezet, kis-nagybetű, cégforma nélkül): a foglalószámla csak ugyanannak a vevőnek a díjbekérőjéhez párosítható */
function szSameBuyer_(a, b) { const n = v => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\b(kft|zrt|bt|nyrt|kkt|korlatolt felelossegu tarsasag|zartkoruen mukodo reszvenytarsasag)\b\.?/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const x = n(a), y = n(b); return !!x && !!y && (x === y || x.indexOf(y) >= 0 || y.indexOf(x) >= 0); }
/** Díjbekérőből (automatikusan) készült foglalószámla felvétele, ha még nincs nálunk. */
function szAddAdvance_(all, db, q, out) {
  if (!q || !q.no || all.some(x => x.no === q.no) || out.some(x => x.no === q.no)) return;
  const r = { id: Utilities.getUuid(), no: q.no, kind: 'eloleg', projectId: db.projectId, incomeId: db.incomeId, buyer: q.buyer || db.buyer, date: q.date, due: q.due, invNet: q.invNet, invGross: q.invGross,
    invPaid: q.invPaid || q.invGross, paidAt: q.paidAt || q.date, payMethod: q.payMethod, createdAt: now_(), createdBy: 'számlázz.hu', checkedAt: now_(), note: 'A díjbekérő kifizetése után automatikusan', items: '', ref: db.no, projectIds: db.projectIds || '', advType: q.advReal ? 'elolegszamla' : 'szamla' };
  out.push(r); all.push(r);
}
function szPdf_(u, a) {
  const r = readAll_('finInvoice').find(x => x.id === str_(a && a.id, 64));
  if (!r) throw new Error('A számla nem található.');
  let q = null, err = null;
  try { q = szQuery_(r.no, true); } catch (e) { err = e; }
  if (q && q.pdf) return { name: r.no.replace(/[^\w.-]+/g, '_') + '.pdf', b64: q.pdf };
  /* a kifizetett díjbekérőt a számlázz.hu már nem adja vissza: a kiállításkor kapott másolatot keressük a levelek között (Sales App / számlázz.hu e-mail melléklete) */
  if (r.kind === 'dijbekero') { try {
    const th = GmailApp.search('"' + r.no + '" has:attachment filename:pdf', 0, 10);
    for (const t of th) for (const m of t.getMessages()) for (const at of m.getAttachments()) {
      const n = String(at.getName() || ''); if (/\.pdf$/i.test(n) && n.replace(/[^A-Za-z0-9]/g, '').toUpperCase().indexOf(r.no.replace(/[^A-Za-z0-9]/g, '').toUpperCase()) >= 0) return { name: r.no.replace(/[^\w.-]+/g, '_') + '.pdf', b64: Utilities.base64Encode(at.getBytes()) }; }
  } catch (eG) { Logger.log('Díjbekérő PDF a levelekből: ' + eG); } }
  if (err) throw err;
  throw new Error('A számlázz.hu nem adta vissza a PDF-et.');
}

/** A számlázz.hu IPN-értesítése (a beállításokban megadott URL: …/exec?ipn=<titkos kulcs>).
    Az értesítésben kapott összeget a számlázz.hu-tól lekérdezve ellenőrizzük; mindig 200-zal válaszolunk. */
function szIpn_(e) {
  const ok = () => ContentService.createTextOutput('OK');
  try {
    const s = szSettings_(), p = e.parameter || {};
    if (!s.ipnToken || String(p.ipn) !== s.ipnToken) return ok();
    const no = str_(p.szlahu_szamlaszam, 60), order = str_(p.szlahu_rendelesszam, 64);
    if (!no) return ok();
    const sys = { name: 'számlázz.hu (IPN)', role: 'admin' };
    withLock_(() => {
      const sh = sheetFor_('finInvoice'), all = readAll_('finInvoice');
      const dbNo = str_(p.szlahu_dijbekero_szama, 60), db = dbNo ? all.find(x => x.no === dbNo) : null;
      let r = all.find(x => x.no === no);
      if (!r && db) {   // kifizetett díjbekérőből automatikusan készült foglalószámla
        const extra = [];
        let q = null; try { q = szQuery_(no, false); } catch (err) { q = { no: no, date: today_(), due: '', invNet: 0, invGross: Math.round(Number(p.szlahu_bruttovegosszeg) || 0), invPaid: Math.round(Number(p.szlahu_kifizetettbrutto) || 0), paidAt: iso_(p.szlahu_kifizdat) || today_(), payMethod: str_(p.szlahu_fizetesmod, 40), buyer: db.buyer }; }
        szAddAdvance_(all, db, q, extra);
        extra.forEach(x => putRow_('finInvoice', sh, x, 0));
        db.invPaid = Number(db.invGross) || q.invPaid; db.paidAt = q.paidAt || today_(); db.checkedAt = now_(); db.ref = no;
        putRow_('finInvoice', sh, db, findRow_(sh, db.id));
        szApplyPay_(invTargets_(db));
        dbFlush_();
        logEvent_(sys, 'Számlázás', db.buyer, 'Díjbekérő kifizetve: ' + dbNo + ' → foglalószámla ' + no);
        return;
      }
      if (!r && order) {   // az appból kiállított számla rendelésszáma a projekt / bevételi sor azonosítója
        const isProj = !!findRow_(sheetFor_('projects'), order), isInc = !isProj && !!findRow_(sheetFor_('finIncome'), order);
        if (isProj || isInc) r = { id: Utilities.getUuid(), no: no, kind: 'szamla', projectId: isProj ? order : '', incomeId: isInc ? order : '',
          buyer: '', date: today_(), due: '', invNet: 0, invGross: 0, invPaid: 0, paidAt: '', payMethod: str_(p.szlahu_fizetesmod, 40), createdAt: now_(), createdBy: sys.name, checkedAt: '', note: '' };
      }
      if (!r) return;
      try { const q = szQuery_(no, false); Object.assign(r, { invPaid: q.invPaid, paidAt: q.paidAt || r.paidAt, invGross: q.invGross || r.invGross, invNet: q.invNet || r.invNet, due: q.due || r.due, buyer: r.buyer || q.buyer, date: r.date || q.date }); }
      catch (err) {   // ha a lekérdezés nem megy, az értesítés adatait használjuk
        const n = v => Math.round(Number(String(v || '').replace(',', '.'))) || 0;
        r.invPaid = n(p.szlahu_kifizetettbrutto); r.invGross = n(p.szlahu_bruttovegosszeg) || r.invGross; if (p.szlahu_kifizdat) r.paidAt = iso_(p.szlahu_kifizdat);
        if (!r.paidAt && r.invPaid) r.paidAt = today_();
      }
      r.checkedAt = now_();
      putRow_('finInvoice', sh, r, findRow_(sh, r.id));
      szApplyPay_(invTargets_(r));
      dbFlush_();
      logEvent_(sys, 'Számlázás', r.buyer, 'Kifizetési értesítés: ' + no + ' – kifizetve ' + r.invPaid + ' / ' + r.invGross + ' Ft');
    });
  } catch (err) { Logger.log('IPN hiba: ' + err); }
  return ok();
}

/* ===================== SZERZŐDÉS ÉS SZÁMLÁZÁS (projektenkénti adatok) ===================== */
const BILL_CONTRACT = ['', 'kikuldve', 'alairva', 'nemkell'];
function billRow_(projectId) {
  const sh = sheetFor_('finBilling'), all = readAll_('finBilling'), r = all.find(x => x.projectId === projectId);
  return { sh: sh, r: r || { id: Utilities.getUuid(), projectId: projectId, contractStatus: '', contractUrl: '', contractName: '', contractFileId: '', contractAt: '', contractBy: '',
    mode: 'eloleg', advancePct: 50, poNumber: '', note: '', updatedAt: '', updatedBy: '', signedAt: '', ceoPct: '', rezsiPct: '' } };
}
function billSave_(u, a) {
  const pid = str_(a && a.projectId, 64);
  if (!ID_RE.test(pid) || !findRow_(sheetFor_('projects'), pid)) throw new Error('A projekt nem található.');
  withLock_(() => {
    const b = billRow_(pid), r = b.r;
    if (a.contractStatus !== undefined) { if (BILL_CONTRACT.indexOf(a.contractStatus) < 0) throw new Error('Ismeretlen szerződés-állapot.'); r.contractStatus = a.contractStatus; }
    if (a.contractUrl !== undefined) { const v = str_(a.contractUrl, 500); if (v && !/^https:\/\//.test(v)) throw new Error('A szerződés linkje https:// kezdetű legyen.'); if (v !== r.contractUrl) { r.contractUrl = v; r.contractFileId = ''; r.contractName = v ? (r.contractName && !r.contractFileId ? r.contractName : 'Link') : ''; } }
    if (a.clearFile) { r.contractUrl = ''; r.contractFileId = ''; r.contractName = ''; r.contractAt = ''; r.contractBy = ''; }
    if (a.mode !== undefined) r.mode = a.mode === 'egyben' ? 'egyben' : 'eloleg';
    if (a.noFinal !== undefined) r.noFinal = a.noFinal ? '1' : '';
    if (a.watermark !== undefined) r.watermark = a.watermark === '1' || a.watermark === true ? '1' : a.watermark === '0' || a.watermark === false ? '0' : '';   // vízjel az ügyfél jóváhagyó lejátszóján
    if (a.mktProject !== undefined) r.mktProject = a.mktProject === '0' ? '0' : a.mktProject && a.mktProject !== '' ? '1' : '';   // '0': kifejezetten nem marketing (az érték nélküli projekt is a bevételek közt marad)   // saját marketing projekt: a termelési költség a marketing alapból megy
    if (a.tigMode !== undefined) r.tigMode = a.tigMode === 'kell' || a.tigMode === 'nemkell' ? a.tigMode : '';
    if (a.advancePct !== undefined) { const n = Math.round(Number(a.advancePct)); if (!isFinite(n) || n < 0 || n > 100) throw new Error('A foglaló 0–100% lehet.'); r.advancePct = n; }
    if (a.poNumber !== undefined) r.poNumber = str_(a.poNumber, 80);
    if (a.note !== undefined) r.note = str_(a.note, 1000);
    if (a.signedAt !== undefined) r.signedAt = iso_(a.signedAt);
    ['ceoPct', 'rezsiPct'].forEach(k => { if (a[k] === undefined) return; if (a[k] === '' || a[k] === null) { r[k] = ''; return; }
      const n = Math.round(Number(a[k]) * 10) / 10; if (!isFinite(n) || n < 0 || n > 100) throw new Error('A százalék 0 és 100 között legyen.'); r[k] = String(n); });
    if (r.contractStatus === 'alairva' && !r.signedAt) r.signedAt = today_();
    r.updatedAt = now_(); r.updatedBy = u.name;
    putRow_('finBilling', b.sh, r, findRow_(b.sh, r.id));
    dbFlush_();
  });
  logEvent_(u, 'Szerződés és számlázás', (readRow_('projects', sheetFor_('projects'), findRow_(sheetFor_('projects'), pid)) || {}).name || pid, 'módosítva');
  return finPart_(['billing']);
}
/** Szerződés feltöltése a projekt Drive-mappájába (a mappát szükség esetén létrehozza). a: {projectId, name, mime, b64, contractStatus} */
/** Extra tétel (pl. továbbszámlázott költség) csatolmánya: a projekt Drive-mappájának „Továbbszámlázott” almappájába */
function extraFileUpload_(u, a) {
  const pid = str_(a && a.projectId, 64), name = (str_(a && a.name, 150).replace(/[\\/]/g, '-') || 'csatolmany.pdf'), b64 = String(a && a.b64 || '');
  if (!b64) throw new Error('Nincs feltöltendő fájl.');
  if (b64.length > 14 * 1024 * 1024) throw new Error('A fájl legfeljebb 10 MB lehet.');
  const mime = /^[\w.+-]+\/[\w.+-]+$/.test(String(a.mime || '')) ? String(a.mime) : 'application/octet-stream';
  const root = DriveApp.getFolderById(createProjectFolder_(u, { id: pid }).folderId), folder = folderPath_(root, a.folder === 'Csatolmányok' ? 'Csatolmányok' : 'Továbbszámlázott', {});
  const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime, uniqueName_(folder, name)));
  logEvent_(u, a.folder === 'Csatolmányok' ? 'Csatolmány feltöltve (új projekt)' : 'Csatolmány feltöltve (extra tétel)', name, pid);
  return { url: file.getUrl(), name: name };
}
function billUpload_(u, a) {
  const pid = str_(a && a.projectId, 64);
  const name = str_(a && a.name, 150).replace(/[\\/]/g, '-') || 'szerzodes.pdf', b64 = String(a && a.b64 || '');
  if (!b64) throw new Error('Nincs feltöltendő fájl.');
  if (b64.length > 14 * 1024 * 1024) throw new Error('A fájl legfeljebb 10 MB lehet.');
  const mime = /^[\w.+-]+\/[\w.+-]+$/.test(String(a.mime || '')) ? String(a.mime) : 'application/octet-stream';
  const pr0 = readRow_('projects', sheetFor_('projects'), findRow_(sheetFor_('projects'), pid));
  const cf = pr0 && pr0.client ? clientFolder_(pr0.client) : null;   // a főmappában: 02 Ügyfelek / <ügyfél> / Szerződések / <év>
  const year = String(pr0 && pr0.date || today_()).slice(0, 4), ext = (/\.[a-z0-9]{2,5}$/i.exec(name) || ['.pdf'])[0];
  const folder = cf ? folderPath_(cf, 'Szerződések/' + year, {}) : DriveApp.getFolderById(createProjectFolder_(u, { id: pid }).folderId);
  const fname = cf ? uniqueName_(folder, today_() + '_' + shortName_(pr0.client) + '_szerzodes_KFT' + (a.contractStatus === 'kikuldve' ? '' : '_alairt') + ext) : name;
  const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime, fname));
  withLock_(() => {
    const b = billRow_(pid), r = b.r;
    Object.assign(r, { contractUrl: file.getUrl(), contractName: name, contractFileId: file.getId(), contractAt: now_(), contractBy: u.name, updatedAt: now_(), updatedBy: u.name });
    if (BILL_CONTRACT.indexOf(a.contractStatus) > 0) r.contractStatus = a.contractStatus; else if (!r.contractStatus) r.contractStatus = 'alairva';
    if (r.contractStatus === 'alairva' && !r.signedAt) r.signedAt = today_();
    putRow_('finBilling', b.sh, r, findRow_(b.sh, r.id));
    dbFlush_();
  });
  logEvent_(u, 'Szerződés feltöltve', name, '');
  return finPart_(['billing']);
}

/* ===================== MUNKATÁRSI SZERZŐDÉSEK (csak az ügyvezető) =====================
   A fájlok a script tulajdonosának saját Drive-jában, egy nem megosztott mappában vannak (nem a közös Lumos mappában),
   és csak az alkalmazáson keresztül, ügyvezetői jogosultsággal nyithatók meg. */
const CREW_DOCS_FOLDER_PROPERTY = 'LUMOS_PM_CREW_DOCS_FOLDER';
function crewDocsFolder_() {
  const P = PropertiesService.getScriptProperties(), id = P.getProperty(CREW_DOCS_FOLDER_PROPERTY);
  if (id) { try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) { } }
  const f = DriveApp.getRootFolder().createFolder('Lumos Projekttervező – Munkatársi szerződések (bizalmas)');
  try { f.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (e) { }
  P.setProperty(CREW_DOCS_FOLDER_PROPERTY, f.getId()); return f;
}
function crewDocsList_() { return readAll_('crewDocs').map(d => ({ id: d.id, crewId: String(d.crewId || ''), title: d.title || '', fileName: d.fileName || '', mime: d.mime || '', signedAt: iso_(d.signedAt) || '', note: d.note || '', createdAt: d.createdAt || '', createdBy: d.createdBy || '' })); }
function crewDocSave_(u, a) {
  a = a || {};
  const cid = str_(a.crewId, 64), c = readAll_('crew').find(x => x.id === cid);
  if (!c) throw new Error('A munkatárs nem található.');
  if (!a.b64) throw new Error('Válaszd ki a szerződés fájlját.');
  if (String(a.b64).length > 14 * 1024 * 1024) throw new Error('A fájl legfeljebb 10 MB lehet.');
  const mime = /^[\w.+-]+\/[\w.+-]+$/.test(String(a.mime || '')) ? String(a.mime) : 'application/octet-stream';
  const name = str_(a.name, 150).replace(/[\\/]/g, '-') || 'szerzodes.pdf';
  const ext = (/\.[a-z0-9]{2,5}$/i.exec(name) || ['.pdf'])[0];
  const folder = childFolder_(crewDocsFolder_(), String(c.name || cid).replace(/[\\/]/g, '-'));
  const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(String(a.b64)), mime, (iso_(a.signedAt) || today_()) + '_' + shortName_(c.name) + '_' + (String(a.title || 'szerzodes').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'dokumentum') + ext));
  return withLock_(() => {
    const sh = sheetFor_('crewDocs');
    const r = { id: Utilities.getUuid(), crewId: cid, crewName: c.name || '', title: str_(a.title, 120) || 'Szerződés', fileName: name, fileId: file.getId(), mime: mime,
      signedAt: iso_(a.signedAt) || '', note: str_(a.note, 500), createdAt: now_(), createdBy: u.name };
    putRow_('crewDocs', sh, r, 0); dbFlush_();
    logEvent_(u, 'Munkatársi szerződés feltöltve', c.name || cid, r.title);
    return { crewDocs: crewDocsList_() };
  });
}
/** Naponta egyszer: a külsősök egyértelműen aláírt szerződései (a fájlnévben „aláírt” + szerződés) automatikusan bekerülnek.
    A bejelentkezés után egy háttérfeladat futtatja; az eredmény a következő betöltéskor az ügyvezetőnek üzenetként jelenik meg. */
function crewDocsAuto_() {
  const P = PropertiesService.getScriptProperties(), d = today_();
  if (P.getProperty('CREWDOCS_AUTO2_AT') === d) return;
  P.setProperty('CREWDOCS_AUTO2_AT', d);
  try {
    const r = crewDocsImport_({ id: 'gmail-auto', name: 'Gmail-begyűjtés', role: 'admin', email: '' }, { strict: true });
    P.setProperty('CREWDOCS_AUTO2_RES', JSON.stringify({ at: now_(), n: r.plan.length, list: r.plan.map(x => x.crew + ' – ' + x.title).slice(0, 20) }));
  } catch (e) { P.setProperty('CREWDOCS_AUTO2_RES', JSON.stringify({ at: now_(), err: String((e && e.message) || e).slice(0, 300) })); P.deleteProperty('CREWDOCS_AUTO2_AT'); }
}
function crewDocsAutoRun() { ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'crewDocsAutoRun').forEach(t => { try { ScriptApp.deleteTrigger(t); } catch (e) {} }); crewDocsAuto_(); }
function crewDocsAutoSchedule_() {
  const P = PropertiesService.getScriptProperties();
  if (P.getProperty('CREWDOCS_AUTO2_AT') === today_()) return;
  if (ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'crewDocsAutoRun')) return;
  ScriptApp.newTrigger('crewDocsAutoRun').timeBased().after(20 * 1000).create();
}
/** Aláírt munkatársi szerződések begyűjtése a Gmailből (külsősök, akiknek még nincs feltöltött szerződésük). a: {dry, crewIds?} */
function crewDocsImport_(u, a) {
  a = a || {};
  const have = {}; readAll_('crewDocs').forEach(d => { have[d.crewId] = 1; });
  /* a postafiók gazdájának saját címével nem keresünk: arra a teljes levelezése illeszkedne (így került pl. a MŰSZOL keretszerződése Egri Ervinhez) */
  let me = ''; try { me = String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (e) { }
  const own = em => { em = String(em || '').trim().toLowerCase(); return !!em && em === me; };
  const crew = readAll_('crew').filter(c => c.email && !own(c.email) && c.type !== 'Belsős' && !have[c.id] && (!a.crewIds || a.crewIds.indexOf(c.id) >= 0));
  const KW = /szerz|megb[ií]z|keret|contract|v[aá]llalk/i, SIGNED = /al[aá][ií]rt|signed|alairva|aláírva/i, DRAFT = /tervezet|draft|minta/i;
  const titleOf = n => /m[oó]dos[ií]t/i.test(n) ? 'Szerződésmódosítás' : /mell[eé]klet/i.test(n) ? 'Szerződés melléklet' : /keret/i.test(n) ? 'Keretszerződés' : /megb[ií]z/i.test(n) ? 'Megbízási szerződés' : /v[aá]llalk/i.test(n) ? 'Vállalkozási szerződés' : 'Szerződés';
  const plan = [];
  crew.forEach(c => {
    const em = String(c.email).trim().toLowerCase();
    let threads = []; try { threads = GmailApp.search('{from:' + em + ' to:' + em + '} has:attachment filename:pdf', 0, 15); } catch (e) { return; }
    const cands = [];
    threads.forEach(t => {
      const subjOk = KW.test(t.getFirstMessageSubject() || '');
      t.getMessages().forEach(m => {
        const from = String(m.getFrom() || '').toLowerCase(), byCrew = from.indexOf(em) >= 0, body = subjOk;
        m.getAttachments({ includeInlineImages: false }).forEach(at => {
          const n = at.getName() || '', isPdf = /\.pdf$/i.test(n) || at.getContentType() === 'application/pdf';
          if (!isPdf) return;
          const signedName = SIGNED.test(n), kwName = KW.test(n);
          if (/sz[aá]mla|invoice|igazol|teljes[ií]t/i.test(n)) return;
          if (!(signedName && (kwName || body)) && !(byCrew && (kwName || body) && !DRAFT.test(n))) return;
          if (DRAFT.test(n) && !signedName) return;
          if (a.strict && !(signedName && kwName)) return;
          cands.push({ at: at, name: n, size: at.getSize(), date: Utilities.formatDate(m.getDate(), SHEET_TZ, 'yyyy-MM-dd'), ts: m.getDate().getTime(), byCrew: byCrew, signedName: signedName });
        });
      });
    });
    /* fajtánként (megnevezés) a legfrissebb aláírt példány */
    const best = {};
    cands.sort((x, y) => y.ts - x.ts).forEach(x => { const k = titleOf(x.name); if (!best[k]) best[k] = x; });
    Object.keys(best).forEach(k => { const x = best[k]; if (a.only && a.only.indexOf(c.id + '|' + k) < 0) return; plan.push({ crewId: c.id, crew: c.name, title: k, name: x.name, date: x.date, kb: Math.round(x.size / 1024), byCrew: x.byCrew, _x: x }); });
  });
  if (!a.dry) plan.forEach(p => {
    const b = p._x.at.copyBlob();
    crewDocSave_(u, { crewId: p.crewId, title: p.title, signedAt: p.date, name: p.name, mime: 'application/pdf', b64: Utilities.base64Encode(b.getBytes()), note: 'Gmailből begyűjtve' });
  });
  return { plan: plan.map(p => { const o = Object.assign({}, p); delete o._x; return o; }), skipped: readAll_('crew').filter(c => c.type !== 'Belsős' && c.email && !have[c.id] && !plan.some(p => p.crewId === c.id)).map(c => c.name), crewDocs: a.dry ? undefined : crewDocsList_() };
}
function crewDocGet_(u, a) {
  const d = readAll_('crewDocs').find(x => x.id === str_(a && a.id, 64)); if (!d) throw new Error('A szerződés nem található.');
  const b = DriveApp.getFileById(String(d.fileId)).getBlob();
  if (b.getBytes().length > 10 * 1024 * 1024) throw new Error('A fájl túl nagy a megnyitáshoz.');
  return { name: d.fileName || b.getName(), mime: b.getContentType() || d.mime || 'application/pdf', b64: Utilities.base64Encode(b.getBytes()) };
}
function crewDocRename_(u, a) {
  const title = str_(a && a.title, 120).replace(/\s+/g, ' ').trim();
  if (!title) throw new Error('Add meg a dokumentum nevét.');
  return withLock_(() => {
    const sh = sheetFor_('crewDocs'), d = readAll_('crewDocs').find(x => x.id === str_(a && a.id, 64));
    if (!d) throw new Error('A dokumentum nem található.');
    const old = d.title || '';
    d.title = title; putRow_('crewDocs', sh, d, findRow_(sh, d.id)); dbFlush_();
    logEvent_(u, 'Munkatársi dokumentum átnevezve', d.crewName || d.crewId, old + ' → ' + title);
    return { crewDocs: crewDocsList_() };
  });
}
function crewDocDelete_(u, a) {
  return withLock_(() => {
    const sh = sheetFor_('crewDocs'), d = readAll_('crewDocs').find(x => x.id === str_(a && a.id, 64));
    if (!d) return { crewDocs: crewDocsList_() };
    try { DriveApp.getFileById(String(d.fileId)).setTrashed(true); } catch (e) { }   // a kukába kerül (30 napig visszaállítható)
    sh.deleteRow(findRow_(sh, d.id)); dbFlush_();
    logEvent_(u, 'Munkatársi szerződés törölve', d.crewName || d.crewId, d.title || '');
    return { crewDocs: crewDocsList_() };
  });
}

/* ===================== KERETSZERZŐDÉSEK (ügyfelenként) =====================
   Ha egy ügyféllel keretszerződés van, a projektjeinél nem kell külön szerződés (a lejárati dátumig, ha van). */
function fwSave_(u, a) {
  a = a || {};
  const client = str_(a.client, 160).replace(/\s+/g, ' ');
  if (client.length < 2) throw new Error('Hiányzik az ügyfél neve.');
  const url = str_(a.url, 500); if (url && !/^https:\/\//.test(url)) throw new Error('A link https:// kezdetű legyen.');
  let file = null;
  if (a.b64) {   // feltöltés a Projektek / Keretszerződések mappába
    if (String(a.b64).length > 14 * 1024 * 1024) throw new Error('A fájl legfeljebb 10 MB lehet.');
    const mime = /^[\w.+-]+\/[\w.+-]+$/.test(String(a.mime || '')) ? String(a.mime) : 'application/octet-stream';
    const name = str_(a.name, 150).replace(/[\\/]/g, '-') || 'keretszerzodes.pdf';
    const cf = clientFolder_(client);   // a főmappában: 02 Ügyfelek / <ügyfél> / Keretszerződés
    const folder = cf ? childFolder_(cf, 'Keretszerződés') : childFolder_(DriveApp.getFolderById(PROJECTS_FOLDER_ID), 'Keretszerződések');
    const ext = (/\.[a-z0-9]{2,5}$/i.exec(name) || ['.pdf'])[0];
    file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(String(a.b64)), mime, cf ? (iso_(a.signedAt) || today_()) + '_' + shortName_(client) + '_keretszerzodes_KFT_alairt' + ext : client.replace(/[\\/]/g, '-') + ' – ' + name));
  }
  return withLock_(() => {
    const sh = sheetFor_('finFramework'), all = readAll_('finFramework');
    const old = (a.id && all.find(x => x.id === str_(a.id, 64))) || all.find(x => String(x.client).trim().toLowerCase() === client.toLowerCase());
    const r = Object.assign({ id: Utilities.getUuid(), client: client, url: '', fileName: '', fileId: '', signedAt: '', validTo: '', note: '', createdAt: now_(), createdBy: u.name, mode: '' }, old || {});
    r.client = client;
    if (a.mode !== undefined) r.mode = a.mode === 'nemkell' ? 'nemkell' : '';
    if (file) { r.url = file.getUrl(); r.fileName = str_(a.name, 150); r.fileId = file.getId(); }
    else if (a.url !== undefined && url !== r.url) { r.url = url; r.fileId = ''; r.fileName = url ? 'Link' : ''; }
    if (a.signedAt !== undefined) r.signedAt = iso_(a.signedAt);
    if (a.validTo !== undefined) r.validTo = iso_(a.validTo);
    if (a.note !== undefined) r.note = str_(a.note, 500);
    if (r.mode !== 'nemkell' && !r.url && !r.fileId) { if (old) sh.deleteRow(findRow_(sh, old.id)); dbFlush_(); return finPart_(['frameworks']); }   // se szerződés, se „nem kell”: nincs mit tárolni
    putRow_('finFramework', sh, r, old ? findRow_(sh, old.id) : 0);
    dbFlush_();
    logEvent_(u, 'Keretszerződés', client, old ? 'módosítva' : 'felvéve');
    return finPart_(['frameworks']);
  });
}
/** Az ügyfél mappája (02 Ügyfelek / <ügyfél>) – ha több szerződés van, ezt nyitja meg az app. */
function clientFolderUrl_(a) {
  const f = clientFolder_(str_(a && a.client, 160)); if (!f) throw new Error('Még nincs beállítva a LUMOS MOTION AUTOMATIZÁLT főmappa.');
  return { url: f.getUrl() };
}
/** Ügyfélmappák áttekintése: mappánként a link és a valódi szerződések listája (csak a Szerződések és Keretszerződés almappákból;
   a _munka piszkozatai, teljesítésigazolások, számlák, ajánlatok, szereplői nyilatkozatok nem számítanak). Egy évszám nélküli almappa (pl. több oldalas fotózott szerződés) egy szerződésnek számít. 10 percig gyorsítótárban. */
/* Nagy JSON tartós tárolása a Script-tulajdonságokban, darabolva (egy érték max. 9 KB) */
function bigPut_(key, str) { const P = PropertiesService.getScriptProperties(), n = Math.ceil(str.length / 8000), o = {}; for (let i = 0; i < n; i++) o[key + '_' + i] = str.slice(i * 8000, (i + 1) * 8000); o[key + '_n'] = String(n); P.setProperties(o); }
function bigGet_(key) { const P = PropertiesService.getScriptProperties(), n = Number(P.getProperty(key + '_n') || 0); if (!n) return ''; let s = ''; for (let i = 0; i < n; i++) s += P.getProperty(key + '_' + i) || ''; return s; }
/** Egy ügyfélmappa szerződései (Szerződések és Keretszerződés almappák). */
function clientDocsOf_(f) {
  const fmt = d => d ? Utilities.formatDate(d, SHEET_TZ, 'yyyy-MM-dd') : '';
  const walk = (f, kind, out, depth) => {
    const fi = f.getFiles(); while (fi.hasNext()) { const x = fi.next(); if (x.isTrashed && x.isTrashed()) continue; out.push({ name: x.getName(), url: x.getUrl(), kind: kind, date: (/^(\d{4}-\d{2}-\d{2})/.exec(x.getName()) || [])[1] || fmt(x.getDateCreated()) }); }
    const di = f.getFolders(); while (di.hasNext()) { const d = di.next(), n = d.getName();
      if (/^_munka/i.test(n)) continue;
      if (/^\d{4}$/.test(n) && depth < 3) walk(d, kind, out, depth + 1);
      else out.push({ name: n, url: d.getUrl(), kind: kind, folder: true, date: (/^(\d{4}-\d{2}-\d{2})/.exec(n) || [])[1] || fmt(d.getDateCreated()) }); }
  };
  const docs = [], sub = f.getFolders();
  while (sub.hasNext()) { const d = sub.next(), n = d.getName(); if (/^Szerződések$/i.test(n)) walk(d, 'sz', docs, 0); else if (/^Keretszerződés/i.test(n)) walk(d, 'keret', docs, 0); }
  docs.sort((x, y) => String(y.date).localeCompare(String(x.date)));
  return docs;
}
/** Gyors frissítés: csak az adott ügyfél mappáját olvassa újra, a többi a gyorsítótárból jön (a teljes bejárás lassú). */
function clientDocsRefresh_(client) {
  const res = clientDocs_({}), cf = client ? clientFolder_(client) : null;
  if (!cf) return res;
  const ent = { name: cf.getName(), url: cf.getUrl(), docs: clientDocsOf_(cf) }, i = (res.folders || []).findIndex(x => x.url === ent.url || x.name === ent.name);
  res.folders = res.folders || []; if (i >= 0) res.folders[i] = ent; else res.folders.push(ent); res.at = Date.now();
  const js = JSON.stringify(res); try { CacheService.getScriptCache().put('clientDocs_v2', js, 21600); } catch (e) { } try { bigPut_('CLIENT_DOCS', js); } catch (e) { }
  return res;
}
function clientDocs_(a) {
  const cache = CacheService.getScriptCache(), key = 'clientDocs_v2';
  if (!(a && a.force)) { const c = cache.get(key) || bigGet_('CLIENT_DOCS'); if (c) { try { return JSON.parse(c); } catch (e) { } } }
  const root = lumosRoot_(); if (!root) return { folders: [] };
  const base = findFolder_(root, '02 Ügyfelek'); if (!base) return { folders: [] };
  const out = [], it = base.getFolders();
  while (it.hasNext()) { const f = it.next(); out.push({ name: f.getName(), url: f.getUrl(), docs: clientDocsOf_(f) }); }
  const res = { folders: out, at: Date.now() }, js = JSON.stringify(res);
  try { cache.put(key, js, 21600); } catch (e) { }
  try { bigPut_('CLIENT_DOCS', js); } catch (e) { }
  return res;
}
/* Helyszínkereső: Google geokódoló (a cégek, intézmények angol vagy magyar nevét is ismeri); 6 órás gyorsítótár */
function geoSearch_(a) {
  const q = str_(a && a.q, 160); if (q.length < 3) return { items: [] };
  const c = CacheService.getScriptCache(), key = 'geo_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, q.toLowerCase()));
  const hit = c.get(key); if (hit) return JSON.parse(hit);
  let items = [];
  try {
    const r = Maps.newGeocoder().setRegion('hu').setLanguage('hu').setBounds(45.7, 16.1, 48.6, 22.9).geocode(q);
    items = (r && r.results || []).slice(0, 5).map(x => {
      const poi = (x.address_components || []).find(k => (k.types || []).some(t => t === 'point_of_interest' || t === 'establishment' || t === 'premise'));
      const addr = String(x.formatted_address || '').replace(/,\s*Magyarország$/, '');
      return poi && addr.indexOf(poi.long_name) < 0 ? poi.long_name + ', ' + addr : addr;
    }).filter(Boolean);
  } catch (e) { items = []; }
  const out = { items: items };
  try { c.put(key, JSON.stringify(out), 21600); } catch (e) { }
  return out;
}
/* ===== Teljesítésigazolás (TIG) =====
   Az ügyfél adott havi munkáit összegző PDF a megszokott formában; az ügyfél mappájába kerül: 02 Ügyfelek / <ügyfél> / Teljesítésigazolások / <év>. */
const TIG_ISSUERS_ = {
  kft: { name: 'Lumos Motion Kft.', seat: '1136 Budapest, Tátra utca 20/B 3/5', tax: '32701573-2-41', rep: 'Egri Ervin, ügyvezető', code: 'KFT' },
  ev: { name: 'Egri Ervin E.V.', seat: '1136 Budapest, Tátra utca 20/B 3/5', tax: '92286571-1-41', rep: 'Egri Ervin', code: 'EV' }
};
function tigCreate_(u, a) {
  a = a || {};
  const h = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const ft = n => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' Ft + ÁFA';
  const client = str_(a.client, 160); if (client.length < 2) throw new Error('Válaszd ki az ügyfelet.');
  const month = /^\d{4}-\d{2}$/.test(String(a.month || '')) ? String(a.month) : ''; if (!month) throw new Error('Hiányzik a hónap.');
  const iss = TIG_ISSUERS_[a.issuer === 'ev' ? 'ev' : 'kft'];
  const rows = (Array.isArray(a.rows) ? a.rows : []).slice(0, 80).map(r => ({ period: str_(r.period, 60), task: str_(r.task, 300), link: /^https:\/\//i.test(String(r.link || '')) ? str_(r.link, 500) : '', amount: Math.round(Number(r.amount) || 0), pid: str_(r.pid, 64) })).filter(r => r.task);
  if (!rows.length) throw new Error('Legalább egy tétel kell.');
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const MN = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'];
  const mLabel = month.slice(0, 4) + ' ' + MN[Number(month.slice(5, 7)) - 1];
  const kelt = iso_(a.date) || today_();
  const cSeat = str_(a.clientAddress, 300).replace(/[.;,\s]+$/, ''), cTax = str_(a.clientTax, 20), cRep = str_(a.clientRep, 120);
  const html = '<html><head><meta charset="utf-8"><style>body{font-family:Georgia,"Times New Roman",serif;font-size:11pt;color:#222;margin:36px 48px}'
    + '.top{font-size:8pt;color:#777;border-bottom:2px solid #8a1c1c;padding-bottom:4px;margin-bottom:28px}h1{text-align:center;font-size:20pt;margin:0 0 4px}.sub{text-align:center;font-size:10pt;margin-bottom:22px}'
    + 'p{text-align:justify;line-height:1.55}table{border-collapse:collapse;width:100%;margin:8px 0 18px;font-size:10pt}th,td{border:1px solid #444;padding:5px 7px;vertical-align:middle}th{background:#f2f2f2}td.c{text-align:center}td.r{text-align:right;white-space:nowrap}'
    + 'a{color:#1a4fa0}.sig{margin-top:56px;width:100%;border:0}.sig td{border:0;width:50%;text-align:center;padding-top:6px;font-size:10pt}.sig .ln{border-top:1px solid #444;width:70%;margin:0 auto 4px}.small{font-size:8pt;color:#555}</style></head><body>'
    + '<div class="top">' + h(client) + ' – ' + h(iss.name) + ' – Teljesítés igazolás</div>'
    + '<h1>Teljesítés Igazolás</h1><div class="sub">' + h(client) + ' – ' + h(iss.name) + ' – TIG – ' + h(mLabel) + '</div>'
    + '<p>E jegyzőkönyv rögzíti, hogy a <b>' + h(client) + '</b> Megrendelő' + ((cSeat || cTax) ? ' (' + [cSeat ? 'székhely: ' + h(cSeat) : '', cTax ? 'adószám: ' + h(cTax) : ''].filter(String).join('; ') + ')' : '') + ' által, <b>' + h(iss.name) + '</b> (székhely: ' + h(iss.seat) + '; adószám: ' + h(iss.tax) + ') szolgáltatási feladatok maradéktalanul teljesültek. A megrendelő a hiánytalan és pontos teljesítést elismeri.</p>'
    + '<p><b>Elvégzett feladatok:</b></p><table><tr><th>Időszak</th><th>Feladat</th><th>Díjazás</th></tr>'
    + rows.map(r => '<tr><td class="c">' + h(r.period) + '</td><td class="c">' + h(r.task) + (r.link ? '<br><a href="' + h(r.link) + '">' + h(r.link) + '</a>' : '') + '</td><td class="r">' + ft(r.amount) + '</td></tr>').join('')
    + '<tr><td></td><td class="r"><b>Díjazás összesen:</b></td><td class="r"><b>' + ft(total) + '</b></td></tr></table>'
    + '<p>Teljesítéskor: fizetendő, a számla átvételétől számított 8 naptári napon belül.</p><p>Kelt: Budapest, ' + h(kelt.replace(/-/g, '.')) + '</p>'
    + '<table class="sig"><tr><td><div class="ln"></div>' + h(iss.name) + '<div class="small">Képviseli: ' + h(iss.rep) + '<br><b>Szolgáltató</b></div></td><td><div class="ln"></div>' + h(client) + '<div class="small">' + (cRep ? 'Képviseli: ' + h(cRep) + '<br>' : '') + '<b>Megrendelő</b></div></td></tr></table>'
    + '</body></html>';
  if (a.preview) return { html: html, total: total };   // előnézet: fájl nélkül
  const pdf = Utilities.newBlob(html, 'text/html', 'tig.html').getAs('application/pdf');
  const cf = clientFolder_(client); if (!cf) throw new Error('Még nincs beállítva a főmappa.');
  const folder = folderPath_(cf, 'Teljesítésigazolások/' + month.slice(0, 4), {});
  const name = uniqueName_(folder, shortName_(iss.name).replace(/-E-V$/, '-EV') + '-' + shortName_(client) + '_TIG_' + month + '.pdf');   // pl. Lumos-Motion-Kulcsár-Akadémia_TIG_2026-10.pdf
  const f = folder.createFile(pdf.setName(name));
  try { CacheService.getScriptCache().remove('clientDocs_v2'); } catch (e) { }
  const rec = { id: Utilities.getUuid(), client: client, month: month, issuer: a.issuer === 'ev' ? 'ev' : 'kft', projectIds: rows.map(r => r.pid).filter(String).filter((x, i, l) => l.indexOf(x) === i).join(','),
    rows: JSON.stringify(rows), total: total, url: f.getUrl(), fileId: f.getId(), fileName: name, status: 'kiallitva', approvedAt: '', invoiceNo: '', createdAt: now_(), createdBy: u.name, clientAddress: cSeat, clientTax: cTax };
  withLock_(() => { putRow_('finTig', sheetFor_('finTig'), rec, 0); dataBump_(); dbFlush_(); });
  logEvent_(u, 'Teljesítésigazolás', client, mLabel + ' · ' + rows.length + ' tétel · ' + total + ' Ft');
  return Object.assign(finPart_(['tigs']), { url: f.getUrl(), name: name, total: total, tig: rec });
}
/** TIG elküldése e-mailben a PDF-fel (a küldő a bejelentkezett felhasználó, ha a címe álnévként be van állítva). a: {id, to, cc, subject, text} */
/** A kiküldött (jóváhagyásra váró) TIG-ekre érkezett válaszok a Gmailből: ki, mikor, mit írt, és jóváhagyásnak tűnik-e. */
function tigReplies_(u) {
  const out = {}, me = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  readAll_('finTig').filter(t => t.status === 'kikuldve' && t.sentAt && t.sentTo).slice(0, 15).forEach(t => {
    const addrs = String(t.sentTo).split(/[,;]\s*/).map(x => x.trim().toLowerCase()).filter(x => /@/.test(x)); if (!addrs.length) return;
    const d = String(t.sentAt).slice(0, 10).replace(/-/g, '/');
    let threads = []; try { threads = GmailApp.search('from:(' + addrs.join(' OR ') + ') after:' + d + ' (teljesítésigazolás OR TIG OR jóváhagy)', 0, 8); } catch (e) { return; }
    let best = null;
    threads.forEach(th => th.getMessages().forEach(m => {
      const from = String(m.getFrom() || ''), fe = (/<([^>]+)>/.exec(from) || [, from])[1].trim().toLowerCase();
      if (fe === me || addrs.indexOf(fe) < 0) return;
      const dt = m.getDate(); if (Utilities.formatDate(dt, SHEET_TZ, 'yyyy-MM-dd HH:mm:ss') < String(t.sentAt)) return;
      if (best && best.dt > dt) return;
      const body = String(m.getPlainBody() || '').split(/\n\s*(?:>|On .+wrote:|.+ ezt írta|-----Original|Feladó:|From:)/)[0].replace(/\s+/g, ' ').trim().slice(0, 300);
      best = { dt: dt, from: from.replace(/<[^>]+>/, '').replace(/"/g, '').trim() || fe, at: Utilities.formatDate(dt, SHEET_TZ, 'yyyy-MM-dd HH:mm'), text: body,
        approve: /jóváhagy|rendben|elfogad|egyetért|mehet|oké|\bok\b|aláír|köszön/i.test(body) && !/nem (fogad|hagy)|javít|hibá|módosít/i.test(body) };
    }));
    if (best) { delete best.dt; out[t.id] = best; }
  });
  return out;
}
function tigSend_(u, a) {
  a = a || {};
  const t = readAll_('finTig').find(x => x.id === str_(a.id, 64)); if (!t) throw new Error('A teljesítésigazolás nem található.');
  const okMail = s => String(s || '').split(/[,;]\s*/).map(x => x.trim()).filter(Boolean);
  const to = okMail(a.to), cc = okMail(a.cc);
  if (!to.length) throw new Error('Add meg a címzettet.');
  if (!to.concat(cc).every(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))) throw new Error('Hibás e-mail-cím.');
  const fid = t.fileId || ((/\/d\/([\w-]{20,})/.exec(String(t.url || '')) || [])[1]);
  if (!fid) throw new Error('Nem található a TIG PDF-je a Drive-ban.');
  const pdf = DriveApp.getFileById(fid).getBlob().setName(t.fileName || 'TIG.pdf');
  const text = str_(a.text, 5000), sig = signatureFor_(u), esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.5">' + esc(text).replace(/\n/g, '<br>') + '</div>' + (sig ? '<br>' + sig.html : '');
  const opts = mailOptsFor_(u, html); delete opts.__actor; opts.attachments = [pdf]; if (cc.length) opts.cc = cc.join(',');
  GmailApp.sendEmail(to.join(','), subj_(str_(a.subject, 200) || 'Teljesítésigazolás'), text + (sig ? '\n\n' + sig.text : ''), opts);
  withLock_(() => { tigMark_(t.id, Object.assign({ sentAt: now_(), sentTo: to.concat(cc).join(', ') }, t.status === 'kiallitva' ? { status: 'kikuldve' } : {})); dbFlush_(); });
  logEvent_(u, 'Teljesítésigazolás', t.client, 'E-mailben elküldve: ' + to.join(', '));
  return finPart_(['tigs']);
}
/** TIG állapotának módosítása (zárolás alatt hívandó). */
function tigMark_(id, patch) { const sh = sheetFor_('finTig'), row = findRow_(sh, id); if (!row) return; const r = readRow_('finTig', sh, row); Object.assign(r, patch); putRow_('finTig', sh, r, row); dataBump_(); }
/** a: {id, action: 'approve' | 'unapprove' | 'delete'} */
function tigSave_(u, a) {
  const id = str_(a && a.id, 64), act = String(a && a.action || '');
  withLock_(() => {
    const sh = sheetFor_('finTig'), row = findRow_(sh, id); if (!row) throw new Error('A teljesítésigazolás nem található.');
    const r = readRow_('finTig', sh, row);
    if (act === 'delete') { if (r.status === 'szamlazva') throw new Error('Már kiállítottál számlát erre a TIG-re.'); sh.deleteRow(row); }
    else if (act === 'approve') { if (r.status !== 'szamlazva') { r.status = 'jovahagyva'; r.approvedAt = today_(); putRow_('finTig', sh, r, row); } }
    else if (act === 'unapprove') { if (r.status === 'jovahagyva') { r.status = 'kikuldve'; r.approvedAt = ''; putRow_('finTig', sh, r, row); } }
    else if (act === 'send') { if (r.status === 'kiallitva' || !r.status) { r.status = 'kikuldve'; putRow_('finTig', sh, r, row); } }
    else if (act === 'unsend') { if (r.status === 'kikuldve') { r.status = 'kiallitva'; putRow_('finTig', sh, r, row); } }
    else throw new Error('Ismeretlen művelet.');
    dataBump_(); dbFlush_();
    logEvent_(u, 'Teljesítésigazolás', r.client, (act === 'delete' ? 'Törölve (a PDF megmarad): ' : act === 'approve' ? 'Jóváhagyva: ' : act === 'send' ? 'Elküldve: ' : act === 'unsend' ? 'Elküldés visszavonva: ' : 'Jóváhagyás visszavonva: ') + r.month);
  });
  return finPart_(['tigs']);
}
/** Ügyfél szerződésének törlése: a Drive-fájl a kukába kerül (30 napig visszaállítható), a hivatkozások lekerülnek a projektekről / keretszerződésből.
    Csak olyan fájl törölhető, amely az ügyfélmappák szerződései között szerepel, vagy az app rögzítette. a: {url} */
/** Ügyfélszerződés feltöltése a választott módon: keretszerződésként (fwSave_) vagy egyéb szerződésként (02 Ügyfelek / <ügyfél> / Szerződések / <év>).
 *  replace: egy meglévő szerződés (Drive-fájl) helyett – a rá mutató hivatkozások az újra állnak át, a régi fájl a Drive kukába kerül. */
function clientDocUpload_(u, a) {
  a = a || {};
  const client = str_(a.client, 160).replace(/\s+/g, ' '); if (client.length < 2) throw new Error('Hiányzik az ügyfél neve.');
  const b64 = String(a.b64 || ''); if (!b64) throw new Error('Nincs feltöltendő fájl.'); if (b64.length > 14 * 1024 * 1024) throw new Error('A fájl legfeljebb 10 MB lehet.');
  const did = x => (/[-\w]{25,}/.exec(String(x || '')) || [])[0] || '', rep = did(a.replace);
  if (rep) { const fw = readAll_('finFramework').some(r => r.fileId === rep || did(r.url) === rep), bl = readAll_('finBilling').some(r => r.contractFileId === rep || did(r.contractUrl) === rep);
    if (!fw && !bl && !(clientDocs_({}).folders || []).some(f => (f.docs || []).some(d => !d.folder && did(d.url) === rep))) throw new Error('A lecserélendő fájl nem szerepel az ügyfél szerződései között.'); }
  let newId = '', newUrl = '';
  const name = str_(a.name, 150).replace(/[\\/]/g, '-') || 'szerzodes.pdf';
  if (a.kind === 'keret') {
    fwSave_(u, { client: client, b64: b64, name: name, mime: a.mime });
    const r = readAll_('finFramework').find(x => String(x.client).trim().toLowerCase() === client.toLowerCase()); newId = r ? r.fileId : ''; newUrl = r ? r.url : '';
  } else {
    const mime = /^[\w.+-]+\/[\w.+-]+$/.test(String(a.mime || '')) ? String(a.mime) : 'application/octet-stream', ext = (/\.[a-z0-9]{2,5}$/i.exec(name) || ['.pdf'])[0];
    const cf = clientFolder_(client); if (!cf) throw new Error('Az ügyfél mappája nem található.');
    const folder = folderPath_(cf, 'Szerződések/' + today_().slice(0, 4), {});
    const f = folder.createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime, uniqueName_(folder, today_() + '_' + shortName_(client) + '_szerzodes_KFT' + ext)));
    newId = f.getId(); newUrl = f.getUrl();
  }
  let trashed = false;
  if (rep && newId && rep !== newId) {
    withLock_(() => {
      const fsh = sheetFor_('finFramework');
      readAll_('finFramework').filter(r => r.fileId === rep || did(r.url) === rep).forEach(r => { const row = findRow_(fsh, r.id); if (!row) return; const x = readRow_('finFramework', fsh, row); Object.assign(x, { url: newUrl, fileId: newId, fileName: name }); putRow_('finFramework', fsh, x, row); });
      const bsh = sheetFor_('finBilling');
      readAll_('finBilling').filter(r => r.contractFileId === rep || did(r.contractUrl) === rep).forEach(r => { const row = findRow_(bsh, r.id); if (!row) return; const x = readRow_('finBilling', bsh, row); Object.assign(x, { contractUrl: newUrl, contractFileId: newId, contractName: name, contractAt: now_(), contractBy: u.name, updatedAt: now_(), updatedBy: u.name }); putRow_('finBilling', bsh, x, row); });
      dbFlush_();
    });
    try { DriveApp.getFileById(rep).setTrashed(true); trashed = true; } catch (e) { }
  }
  const docs = clientDocsRefresh_(client);
  logEvent_(u, 'Szerződés feltöltve', client, (a.kind === 'keret' ? 'keretszerződés' : 'szerződés') + (rep ? ' – a korábbi helyett' + (trashed ? ' (a régi a Drive kukába került)' : '') : ''));
  return Object.assign(finPart_(['frameworks', 'billing']), { folders: docs.folders, at: docs.at, replaced: !!rep, trashed: trashed });
}
function clientDocDelete_(u, a) {
  const raw = str_(a && a.url, 500), id = (/[-\w]{25,}/.exec(raw) || [])[0];
  if (!id) throw new Error('Ismeretlen fájl.');
  const did = x => (/[-\w]{25,}/.exec(String(x || '')) || [])[0] || '';
  let known = false, name = '';
  withLock_(() => {
    const fsh = sheetFor_('finFramework');
    readAll_('finFramework').filter(r => r.fileId === id || did(r.url) === id).forEach(r => { known = true; name = name || r.client; const row = findRow_(fsh, r.id); if (row) fsh.deleteRow(row); });
    const bsh = sheetFor_('finBilling');
    readAll_('finBilling').filter(r => r.contractFileId === id || did(r.contractUrl) === id).forEach(r => { known = true; const row = findRow_(bsh, r.id); if (!row) return;
      const x = readRow_('finBilling', bsh, row); Object.assign(x, { contractUrl: '', contractFileId: '', contractName: '', contractAt: '', contractBy: '', updatedAt: now_(), updatedBy: u.name }); putRow_('finBilling', bsh, x, row); });
    dbFlush_();
  });
  if (!known && a && a.client) { const cf = clientFolder_(str_(a.client, 160)); known = !!cf && clientDocsOf_(cf).some(d => !d.folder && did(d.url) === id); }   // gyors: csak az ügyfél saját mappája
  if (!known) { const docs = clientDocs_({}); known = (docs.folders || []).some(f => (f.docs || []).some(d => !d.folder && did(d.url) === id)); }
  if (!known) throw new Error('Ez a fájl nem szerepel az ügyfelek szerződései között.');
  let trashed = false;
  try { const f = DriveApp.getFileById(id); name = f.getName(); f.setTrashed(true); trashed = true; } catch (e) { }
  const docs = a && a.client ? clientDocsRefresh_(str_(a.client, 160)) : clientDocs_({});
  logEvent_(u, 'Szerződés törölve', name, trashed ? 'A Drive-fájl a kukába került' : 'Csak a hivatkozás került le');
  return Object.assign(finPart_(['frameworks', 'billing']), { folders: docs.folders, at: docs.at, trashed: trashed });
}
function fwDelete_(u, a) {
  withLock_(() => { const sh = sheetFor_('finFramework'), row = findRow_(sh, str_(a && a.id, 64)); if (!row) throw new Error('A keretszerződés nem található.'); const r = readRow_('finFramework', sh, row); sh.deleteRow(row); dbFlush_(); logEvent_(u, 'Keretszerződés törölve', r.client, 'a Drive-fájl megmarad'); });
  return finPart_(['frameworks']);
}

/* ===================== DRIVE-ÁTTEKINTÉS (csak olvasás) =====================
   Mappafa listázása (név, típus, méret, dátum, link) – a szerződések projektekhez párosításához és a mapparendszer áttervezéséhez. */
function driveScan_(a) {
  const ids = (Array.isArray(a && a.folderIds) ? a.folderIds : []).map(x => str_(x, 80)).filter(x => /^[\w-]{10,80}$/.test(x)).slice(0, 10);
  if (!ids.length) throw new Error('Adj meg legalább egy mappát.');
  const max = Math.min(Math.max(Number(a.maxItems) || 3000, 1), 6000), maxDepth = Math.min(Math.max(Number(a.maxDepth) || 8, 1), 12);
  const out = [], started = Date.now(); let truncated = false;
  const fmt = d => d ? Utilities.formatDate(d, SHEET_TZ, 'yyyy-MM-dd') : '';
  const walk = (folder, path, depth) => {
    if (out.length >= max || Date.now() - started > 300000) { truncated = true; return; }
    const subs = []; const fit = folder.getFolders();
    while (fit.hasNext()) { const f = fit.next(); subs.push(f); out.push({ path: path, name: f.getName(), type: 'folder', id: f.getId(), mod: fmt(f.getLastUpdated()), url: f.getUrl() }); }
    const it = folder.getFiles();
    while (it.hasNext()) { if (out.length >= max) { truncated = true; break; } const f = it.next(); out.push({ path: path, name: f.getName(), type: f.getMimeType(), id: f.getId(), size: f.getSize(), mod: fmt(f.getLastUpdated()), created: fmt(f.getDateCreated()), url: f.getUrl() }); }
    if (depth < maxDepth) subs.forEach(f => walk(f, path + '/' + f.getName(), depth + 1));
  };
  ids.forEach(id => { const f = DriveApp.getFolderById(id); walk(f, f.getName(), 0); });
  return { items: out, truncated: truncated };
}

/* ===================== DRIVE-RENDSZER (LUMOS főmappa) =====================
   A cég dokumentumai egy főmappában: 01 Projektek, 02 Ügyfelek, 03 Szakemberek, 04 Beszállítók, 10 Lumos Motion Kft, 20 Egri Ervin EV, 90 Sablonok.
   driveOps: áthelyezés útvonal alapján (a forrás a megadott gyökérmappákon belül), átnevezéssel; minden lépésről visszaadja, honnan hová került (visszavonható). */
const LUMOS_ROOT_PROPERTY = 'LUMOS_DRIVE_ROOT_ID';
function lumosRoot_() { const id = PropertiesService.getScriptProperties().getProperty(LUMOS_ROOT_PROPERTY); if (!id) return null; try { return DriveApp.getFolderById(id); } catch (e) { return null; } }
function folderPath_(root, path, cache) {
  let f = root, acc = '';
  String(path || '').split('/').map(s => s.trim()).filter(Boolean).forEach(part => {
    acc += '/' + part;
    if (cache && cache[acc]) { f = cache[acc]; return; }
    f = childFolder_(f, part);
    if (cache) cache[acc] = f;
  });
  return f;
}
function findFolder_(root, path) {   // meglévő mappa útvonal szerint (nem hoz létre)
  let f = root;
  for (const part of String(path || '').split('/').map(s => s.trim()).filter(Boolean)) { const it = f.getFoldersByName(part); if (!it.hasNext()) return null; f = it.next(); }
  return f;
}
function uniqueName_(folder, name) {
  if (!folder.getFilesByName(name).hasNext()) return name;
  const m = /^(.*?)(\.[^.]+)?$/.exec(name);
  for (let i = 2; i < 50; i++) { const n = m[1] + ' (' + i + ')' + (m[2] || ''); if (!folder.getFilesByName(n).hasNext()) return n; }
  return name;
}
/** a: {sources:{prefix:folderId}, rootId?, rootParentOf?, ops:[{src, name?, dst, newName?}]} – name nélkül a mappa tartalma kerül át (összefésülés). */
function driveOps_(u, a) {
  a = a || {};
  let root = a.rootId ? DriveApp.getFolderById(str_(a.rootId, 80)) : lumosRoot_();
  if (!root) {
    if (!a.rootParentOf) throw new Error('Hiányzik a főmappa helye.');
    const parent = DriveApp.getFolderById(str_(a.rootParentOf, 80)).getParents().next();
    root = childFolder_(parent, str_(a.rootName, 80) || 'LUMOS');
  }
  PropertiesService.getScriptProperties().setProperty(LUMOS_ROOT_PROPERTY, root.getId());
  const sources = {}; Object.keys(a.sources || {}).forEach(k => { sources[k] = DriveApp.getFolderById(str_(a.sources[k], 80)); });
  const cache = {}, out = [], started = Date.now();
  (Array.isArray(a.ops) ? a.ops : []).slice(0, 80).forEach(op => {
    if (Date.now() - started > 300000) { out.push({ op: op, ok: false, err: 'időtúllépés – küldd újra' }); return; }
    try {
      const pre = Object.keys(sources).find(k => op.src === k || String(op.src).indexOf(k + '/') === 0);
      if (!pre) throw new Error('ismeretlen forrás');
      const srcFolder = findFolder_(sources[pre], String(op.src).slice(pre.length));
      if (!srcFolder) throw new Error('nincs meg a forrásmappa');
      const it = op.name ? srcFolder.getFilesByName(op.name) : null;
      if (it && !it.hasNext()) throw new Error('nincs meg a fájl');
      const dst = op.dst === '.' ? root : folderPath_(root, op.dst, cache);   // a célmappa csak akkor jön létre, ha van mit áthelyezni
      if (op.name) {
        const f = it.next();
        const nn = uniqueName_(dst, str_(op.newName, 200) || op.name);
        f.moveTo(dst); if (nn !== f.getName()) f.setName(nn);
        out.push({ ok: true, id: f.getId(), from: op.src + '/' + op.name, to: op.dst + '/' + nn });
      } else {   // mappa tartalmának áthelyezése
        let n = 0; const fi = srcFolder.getFiles(); while (fi.hasNext()) { const f = fi.next(); const nn = uniqueName_(dst, f.getName()); f.moveTo(dst); if (nn !== f.getName()) f.setName(nn); n++; }
        const di = srcFolder.getFolders(); while (di.hasNext()) { di.next().moveTo(dst); n++; }
        out.push({ ok: true, id: srcFolder.getId(), from: op.src + '/', to: op.dst + '/', items: n });
      }
    } catch (e) { out.push({ ok: false, from: op.src + '/' + (op.name || ''), to: op.dst, err: String(e.message || e) }); }
  });
  logEvent_(u, 'Drive-átrendezés', root.getName(), out.filter(x => x.ok).length + ' tétel áthelyezve, ' + out.filter(x => !x.ok).length + ' hiba');
  return { rootId: root.getId(), rootUrl: root.getUrl(), results: out };
}
/** Projektmappa (a meglévő azonosítójú mappa) áthelyezése a főmappába, átnevezéssel. */
function driveMoveFolder_(u, a) {
  const root = lumosRoot_(); if (!root) throw new Error('Még nincs főmappa.');
  const f = DriveApp.getFolderById(a && a.folderId === 'PROJECTS' ? PROJECTS_FOLDER_ID : str_(a && a.folderId, 80));
  const dst = a.dst ? folderPath_(root, a.dst, {}) : root;
  f.moveTo(dst); if (a.newName) f.setName(str_(a.newName, 120));
  logEvent_(u, 'Drive-átrendezés', f.getName(), 'mappa áthelyezve');
  return { id: f.getId(), url: f.getUrl() };
}
/* Ügyfél mappája a főmappában (02 Ügyfelek / <ügyfél>): meglévőt keres (név vagy zárójeles név alapján), különben létrehozza. */
function clNorm_(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\b(kft|bt|zrt|nyrt|kkt|llc|ltd|s l|sl|egyesulet|nonprofit)\b/g, ' ').replace(/\s+/g, ' ').trim(); }
function clMatch_(company, folder) {   // egyezés vagy szóhatáros előtag (pl. „Bagen” ↔ „Bagen Invest Kft.”); a zárójeles név is számít
  const w = clNorm_(company); if (!w) return false;
  return [folder.replace(/\s*\(.*\)\s*$/, ''), (/\(([^)]*)\)/.exec(folder) || [])[1] || ''].map(clNorm_).some(f => f && (f === w || (Math.min(f.length, w.length) >= 4 && ((w + ' ').indexOf(f + ' ') === 0 || (f + ' ').indexOf(w + ' ') === 0))));
}
function clientFolder_(client) {
  const root = lumosRoot_(); if (!root) return null;
  const base = folderPath_(root, '02 Ügyfelek', {});
  const it = base.getFolders(); let best = null;
  while (it.hasNext()) { const f = it.next(), n = f.getName(); if (clNorm_(n.replace(/\s*\(.*\)\s*$/, '')) === clNorm_(client)) return f; if (!best && clMatch_(client, n)) best = f; }
  return best || base.createFolder(String(client || 'Ügyfél').replace(/[\\/]/g, '-'));
}
function shortName_(s) { return String(s || '').replace(/\s*\(.*\)/, '').replace(/ (Kft|Zrt|Bt|Nyrt|Kkt)\.?$/i, '').replace(/[^\wÀ-ž]+/g, '-').replace(/^-+|-+$/g, ''); }

/* ===================== STÁB ÉS LELTÁR ===================== */
function saveCrew_(u, a) {
  if (!a || typeof a !== 'object') throw new Error('Hiányos adatok.');
  const id = str_(a.id, 64);
  if (!ID_RE.test(id)) throw new Error('Hibás azonosító.');
  const c = {
    id: id, name: str_(a.name, 100).replace(/\s+/g, ' '),
    roles: (Array.isArray(a.roles) ? a.roles : []).filter(r => CREW_ROLES.indexOf(r) >= 0),
    type: /^Alkalmazott/.test(String(a.type || '')) ? CREW_TYPES[3] : CREW_TYPES.indexOf(a.type) >= 0 ? a.type : 'Belsős',
    phone: str_(a.phone, 40), email: str_(a.email, 160).toLowerCase(),
    dayRate: (a.dayRate === '' || a.dayRate == null) ? null : int_(a.dayRate, 0, 1e8, null), note: str_(a.note, 500),
    priority: (a.priority === '' || a.priority == null) ? null : int_(a.priority, 1, 3, null), company: str_(a.company, 120),
    skills: (Array.isArray(a.skills) ? a.skills : []).filter(s => CREW_SKILLS.indexOf(s) >= 0),
    vat: a.vat === 'afa' ? 'afa' : 'aam',   // alapból alanyi adómentes
    tax: str_(a.tax, 20).replace(/[^\d-]/g, '')   // a NAV-os számlapárosításhoz
  };
  if (c.name.length < 2) throw new Error('Add meg a nevet.');
  if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) throw new Error('Érvénytelen e-mail-cím.');
  return withLock_(() => {
    const sh = sheetFor_('crew'), row = findRow_(sh, id);
    let old = null;
    if (row) {
      old = readRow_('crew', sh, row);
      if (old.updatedAt !== str_(a.baseUpdatedAt, 30)) throw new Error('CONFLICT: Közben valaki más is módosította ezt a munkatársat.');
      c.createdAt = old.createdAt;
    } else c.createdAt = now_();
    c.updatedAt = now_();
    putRow_('crew', sh, c, row);
    if (old && old.name !== c.name) rewriteAssign_('crewAssign', () => true, [], r => { if (r.crewId === id) r.crewName = c.name; });
    dbFlush_();
    logEvent_(u, old ? 'Munkatárs módosítva' : 'Munkatárs felvéve', c.name, c.roles.join(', '));
    return c;
  });
}

/* Törölt munkatársak neve (azonosító → név): a régi projektek díjainál és a Kifizetésekben továbbra is a valódi név látszik */
const CREW_ARCHIVE_PROPERTY = 'LUMOS_PM_CREW_ARCHIVE';
const CREW_ARCHIVE_SEED_ = { '0d56f79d-1be2-4fdd-82a1-9b20afd66ad6': 'Major Bence' };   // 2026-11-03 előtt törölve (a táblázat mentéséből)
function crewArchive_() { let o = {}; try { o = JSON.parse(PropertiesService.getScriptProperties().getProperty(CREW_ARCHIVE_PROPERTY) || '{}') || {}; } catch (e) {} return Object.assign({}, CREW_ARCHIVE_SEED_, o); }
function crewArchiveAdd_(id, name) { if (!id || !name) return; try { const P = PropertiesService.getScriptProperties(), o = JSON.parse(P.getProperty(CREW_ARCHIVE_PROPERTY) || '{}') || {}; o[id] = String(name).slice(0, 80); P.setProperty(CREW_ARCHIVE_PROPERTY, JSON.stringify(o)); } catch (e) {} }
function deleteCrew_(u, a) {
  const id = str_(a && a.id, 64);
  return withLock_(() => {
    const sh = sheetFor_('crew'), row = findRow_(sh, id);
    if (!row) return { deleted: false, id: id };
    const old = readRow_('crew', sh, row);
    crewArchiveAdd_(old.id, old.name);   // a név megmarad a korábbi díjaknál, kifizetéseknél
    sh.deleteRow(row);
    rewriteAssign_('crewAssign', r => r.crewId !== id, []);
    dbFlush_();
    logEvent_(u, 'Munkatárs törölve', old.name, '');
    return { deleted: true, id: id };
  });
}

function saveItem_(u, a) {
  if (!a || typeof a !== 'object') throw new Error('Hiányos adatok.');
  const id = str_(a.id, 64);
  if (!ID_RE.test(id)) throw new Error('Hibás azonosító.');
  const it = {
    id: id, name: str_(a.name, 160), category: INV_CATS.indexOf(a.category) >= 0 ? a.category : 'Egyéb',
    qty: int_(a.qty, 0, 9999, 1), condition: CONDITIONS.indexOf(a.condition) >= 0 ? a.condition : 'ok',
    serial: str_(a.serial, 200), location: str_(a.location, 120), format: a.format === 'ff' || a.format === 'crop' ? a.format : '', value: (a.value === '' || a.value == null) ? null : int_(a.value, 0, 1e9, null), note: str_(a.note, 500)
  };
  if (it.name.length < 2) throw new Error('Add meg az eszköz nevét.');
  return withLock_(() => {
    const sh = sheetFor_('inventory'), row = findRow_(sh, id);
    let old = null;
    if (row) {
      old = readRow_('inventory', sh, row);
      if (old.updatedAt !== str_(a.baseUpdatedAt, 30)) throw new Error('CONFLICT: Közben valaki más is módosította ezt az eszközt.');
      it.createdAt = old.createdAt;
      if (u.role !== 'admin' && it.value == null) it.value = old.value;   // üresen hagyva a meglévő érték marad
    } else it.createdAt = now_();
    it.updatedAt = now_();
    putRow_('inventory', sh, it, row);
    if (old && old.name !== it.name) rewriteAssign_('eqAssign', () => true, [], r => { if (r.itemId === id) r.itemName = it.name; });
    dbFlush_();
    logEvent_(u, old ? 'Eszköz módosítva' : 'Eszköz felvéve', it.name, it.qty + ' db · ' + CONDITION_LABELS[it.condition]);
    if (u.role !== 'admin') return Object.assign({}, it, { value: null, hasValue: it.value != null && it.value !== '' });
    return it;
  });
}

/* ===================== DÍJCSÖKKENTÉS (a megbízási szerződés minőségi melléklete szerint) ===================== */
const PEN_KINDS_ = {
  light: { label: 'Enyhe szakmai hiba', pct: 10, ref: '3.1.' }, severe: { label: 'Súlyos szakmai hiba', pct: 50, ref: '3.2.' },
  critical: { label: 'Kritikus hiba vagy meghiúsulás', pct: 100, ref: '3.3.' }, prestige: { label: 'Presztízsveszteség, jó hírnév sérelme', min: 10, max: 50, ref: '3.4.' },
  unfit: { label: 'Munkavégzésre alkalmatlan állapot', pct: 100, ref: '3.5.' }, damage: { label: 'Kártérítés / eszközkár', ref: '4–5.' } };
function parsePen_(raw) {
  let arr = raw; if (typeof raw === 'string') { try { arr = raw ? JSON.parse(raw) : []; } catch (e) { arr = []; } }
  if (!Array.isArray(arr)) return [];
  return arr.filter(x => x && PEN_KINDS_[x.kind]).slice(0, 100).map(x => ({ id: str_(x.id, 40), crewId: str_(x.crewId, 64), kind: x.kind, pct: int_(x.pct, 0, 100, 0), day: /^\d{4}-\d{2}-\d{2}$/.test(String(x.day || '')) ? String(x.day) : '',
    amount: int_(x.amount, 0, FEE_MAX, 0), caseText: str_(x.caseText, 1500), reason: str_(x.reason, 3000), link: str_(x.link, 500),
    status: ['pending', 'approved', 'rejected'].indexOf(x.status) >= 0 ? x.status : 'pending', by: str_(x.by, 120), copyEmail: str_(x.copyEmail, 160), at: str_(x.at, 30),
    decidedBy: str_(x.decidedBy, 120), decidedAt: str_(x.decidedAt, 30), decisionNote: str_(x.decisionNote, 1000),
    objection: x.objection && x.objection.text ? { text: str_(x.objection.text, 3000), at: str_(x.objection.at, 30) } : null }));
}
function penMutate_(projectId, fn) {
  return withLock_(() => {
    const sh = sheetFor_('projects'), row = findRow_(sh, str_(projectId, 64));
    if (!row) throw new Error('A projekt nem található.');
    const p = readRow_('projects', sh, row), list = parsePen_(p.penalties), res = fn(list, p);
    const col = TABLES.projects.cols.findIndex(c => c[0] === 'penalties') + 1;
    sh.getRange(row, col).setNumberFormat('@').setValue(list.length ? JSON.stringify(list) : '');   // a módosítás idejét szándékosan nem írjuk át
    dbFlush_();
    return { list: list, p: p, res: res };
  });
}
function penAmount_(p, x) {
  if (x.kind === 'damage') return x.amount;
  const f = parseFees_(p.fees).find(r => r.crewId === x.crewId && r.kind !== 'fixed');
  if (!f) return 0;
  let base = f.amount;
  if (x.day) {
    const days = [];
    for (let day = p.date; day && day <= (p.endDate || p.date) && days.length < 31; day = new Date(new Date(day + 'T12:00:00Z').getTime() + 86400000).toISOString().slice(0, 10)) days.push(day);
    const assigned = parseCrewDays_(p.crewDays)[x.crewId];
    const worked = assigned && assigned.length ? days.filter(d => assigned.includes(d)) : days;
    if (!worked.includes(x.day)) return 0;
    if (f.dayAmounts && Object.keys(f.dayAmounts).length) base = Number(f.dayAmounts[x.day]) || 0;
    else { const per = Math.floor(f.amount / worked.length); base = x.day === worked[worked.length - 1] ? f.amount - per * (worked.length - 1) : per; }
  }
  return Math.round(base * x.pct / 100);
}
function penMailCrew_(u, p, x) {
  try {
    const c = readAll_('crew').find(r => r.id === x.crewId); if (!c || !c.email) return false;
    const k = PEN_KINDS_[x.kind], amt = penAmount_(p, x), url = projLink_(p);
    const lines = ['Kedves ' + c.name + '!', '', 'A(z) „' + p.name + '” projekten (' + (fmtHuDate_(p.date) || p.date || '') + ') a megbízási szerződés minőségi mellékletének ' + k.ref + ' pontja alapján díjcsökkentés történt.', '',
      'Kategória: ' + k.label + (x.kind === 'damage' ? '' : ' (' + x.pct + '%' + (x.day ? ', a ' + (fmtHuDate_(x.day) || x.day) + ' napi díjból' : '') + ')'), x.kind === 'damage' ? 'Kártérítés összege: ' + amt.toLocaleString('hu-HU') + ' Ft' : 'Levont összeg: ' + amt.toLocaleString('hu-HU') + ' Ft',
      x.caseText ? 'Eset: ' + x.caseText : '', '', 'Indoklás:', x.reason, '',
      'Ha nem értesz egyet, a projekt oldalán a „Kifogásolom” gombbal írásban jelezheted: ' + url, '', 'Üdvözlettel:', 'Lumos Motion'].filter((l, i, a) => l !== '' || a[i - 1] !== '');
    const html = lines.map(l => escapeHtml_(l).replace(/\n/g, '<br>')).join('<br>');   // az indoklás tördelése is megmarad
    const opts = mailOptsFor_(u, html), cc = penCopyList_(u, x, c.email); if (cc.length) opts.cc = cc.join(',');
    return gmailSend_(c.email, 'Díjcsökkentés – ' + p.name, lines.join('\n'), opts, 'penalty');
  } catch (e) { Logger.log('Díjcsökkentés e-mail hiba: ' + e); return false; }
}
/* Díjcsökkentés másolata: ha az ügyvezető küldi, a termelési vezető kapja, és fordítva; kérésre a kiróvó is */
function penCopyList_(u, x, crewEmail) {
  const other = u && u.role === 'admin' ? 'editor' : 'admin', out = [];
  try { loadUsers_().forEach(v => { if (!v.disabled && v.email && v.role === other) out.push(String(v.email).toLowerCase()); }); } catch (e) { }
  if (x && x.copyEmail) out.push(String(x.copyEmail).toLowerCase());
  const me = String(crewEmail || '').toLowerCase();
  return out.filter((m, i) => m && m !== me && out.indexOf(m) === i);
}
function penMailAdmins_(u, subject, text) {
  try {
    const to = loadUsers_().filter(x => x.role === 'admin' && !x.disabled && x.email).map(x => x.email);
    if (to.length) gmailSend_(to.join(','), subject, text, mailOptsFor_(u, escapeHtml_(text).replace(/\n/g, '<br>')), 'penAdmin');
  } catch (e) { Logger.log('Értesítés hiba: ' + e); }
}
function addPenalty_(u, a) {
  const kind = String(a && a.kind || ''), k = PEN_KINDS_[kind];
  if (!k) throw new Error('Válassz kategóriát.');
  const reason = str_(a.reason, 3000).trim();
  if (reason.length < 5) throw new Error('Írd le röviden az indoklást (a szerződés 3.6. pontja szerint kötelező).');
  const link = str_(a.link, 500).trim();
  if (link && !/^https:\/\//i.test(link)) throw new Error('A bizonyíték linkje https:// előtaggal kezdődjön.');
  const pct = kind === 'damage' ? 0 : k.pct != null ? k.pct : int_(a.pct, k.min, k.max, k.min);
  const amount = kind === 'damage' ? int_(a.amount, 0, FEE_MAX, 0) : 0;
  if (kind === 'damage' && !amount) throw new Error('Add meg a kártérítés összegét.');
  const x = { id: Utilities.getUuid().slice(0, 12), crewId: str_(a.crewId, 64), kind: kind, pct: pct, day: kind !== 'damage' && /^\d{4}-\d{2}-\d{2}$/.test(String(a.day || '')) ? String(a.day) : '', amount: amount, caseText: str_(a.caseText, 1500), reason: reason, link: link,
    status: u.role === 'admin' ? 'approved' : 'pending', by: u.name, copyEmail: a.copyMe === true && u.email ? String(u.email) : '', at: now_(), decidedBy: u.role === 'admin' ? u.name : '', decidedAt: u.role === 'admin' ? now_() : '', decisionNote: '', objection: null };
  const r = penMutate_(a.projectId, (list, p) => {
    const on = p.lead === x.crewId || readAll_('crewAssign').some(c => c.projectId === p.id && c.crewId === x.crewId);
    if (!on) throw new Error('Ez a munkatárs nincs beosztva erre a projektre.');
    list.push(x);
  });
  const crewName = (readAll_('crew').find(c => c.id === x.crewId) || {}).name || '';
  logEvent_(u, 'Díjcsökkentés ' + (x.status === 'approved' ? 'kiróva' : 'javasolva'), r.p.name, crewName + ' · ' + k.label + (pct ? ' ' + pct + '%' : ' ' + amount + ' Ft'));
  let mailed = false;
  if (x.status === 'approved') mailed = penMailCrew_(u, r.p, x);
  else penMailAdmins_(u, 'Jóváhagyásra vár: díjcsökkentés – ' + r.p.name, u.name + ' díjcsökkentést javasolt.\n\nProjekt: ' + r.p.name + '\nSzakember: ' + crewName + '\nKategória: ' + k.label + (pct ? ' (' + pct + '%)' : ' (' + amount + ' Ft)') + '\nIndoklás: ' + reason + '\n\nJóváhagyás az appban: ' + projLink_(r.p));
  return { penalties: r.list, mailed: mailed };
}
function decidePenalty_(u, a) {
  const approve = !!(a && a.approve);
  let x = null;
  const r = penMutate_(a.projectId, list => {
    x = list.find(i => i.id === str_(a.id, 40)); if (!x) throw new Error('A tétel nem található.');
    if (x.status !== 'pending') throw new Error('Erről a tételről már döntöttek.');
    x.status = approve ? 'approved' : 'rejected'; x.decidedBy = u.name; x.decidedAt = now_(); x.decisionNote = str_(a.note, 1000);
  });
  logEvent_(u, approve ? 'Díjcsökkentés jóváhagyva' : 'Díjcsökkentés elutasítva', r.p.name, PEN_KINDS_[x.kind].label);
  const mailed = approve ? penMailCrew_(u, r.p, x) : false;
  return { penalties: r.list, mailed: mailed };
}
function deletePenalty_(u, a) {
  let x = null;
  const r = penMutate_(a.projectId, list => { const i = list.findIndex(v => v.id === str_(a.id, 40)); if (i < 0) throw new Error('A tétel nem található.'); x = list.splice(i, 1)[0]; });
  logEvent_(u, 'Díjcsökkentés törölve', r.p.name, PEN_KINDS_[x.kind].label);
  return { penalties: r.list };
}
/* Díjcsökkentés áthelyezése másik napra (ügyvezető): csak a nap változik, e-mail nem megy ki. Üres nap = teljes díjból. */
function movePenaltyDay_(u, a) {
  const day = str_(a && a.day, 10);
  if (day && !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Hibás nap.');
  let x = null;
  const r = penMutate_(a.projectId, (list, p) => {
    x = list.find(i => i.id === str_(a.id, 40)); if (!x) throw new Error('A tétel nem található.');
    if (x.kind === 'damage') throw new Error('Kártérítés nem köthető naphoz.');
    if (day && (day < p.date || day > (p.endDate || p.date))) throw new Error('A nap a projekt időtartamán kívül esik.');
    x.day = day;
  });
  logEvent_(u, 'Díjcsökkentés áthelyezve', r.p.name, PEN_KINDS_[x.kind].label + ' → ' + (day || 'teljes díj'));
  return { penalties: r.list };
}
function objectPenalty_(u, a) {
  const text = str_(a && a.text, 3000).trim();
  if (text.length < 5) throw new Error('Írd le röviden, miért nem értesz egyet.');
  let x = null;
  const r = penMutate_(a.projectId, list => {
    x = list.find(i => i.id === str_(a.id, 40) && i.crewId === u.crewId && i.status === 'approved'); if (!x) throw new Error('A tétel nem található.');
    x.objection = { text: text, at: now_() };
  });
  logEvent_(u, 'Díjcsökkentés kifogásolva', r.p.name, text.slice(0, 120));
  penMailAdmins_(u, 'Kifogás: díjcsökkentés – ' + r.p.name, u.name + ' kifogást nyújtott be.\n\nProjekt: ' + r.p.name + '\nKategória: ' + PEN_KINDS_[x.kind].label + '\n\nKifogás:\n' + text + '\n\nMegnyitás: ' + projLink_(r.p));
  return { penalties: r.list.filter(i => i.crewId === u.crewId && i.status === 'approved') };
}

/* ===================== ÜGYFELEK ===================== */
/** Ügyfél felvétele/módosítása. Ha a cégnév megváltozik, a projektek „Ügyfél” mezője is átíródik. */
/* Irodabérlet: szakembertől bérelt iroda havi díja – a Kifizetéseknél a díjához adódik.
   Egy sor = egy szakember egy hónapja; a következő hónapokra a legutóbbi érték érvényes, amíg nem írják át (0 = megszűnt). */
/* ===== Havi díjösszesítő a szakembereknek =====
   A felület összeállítja a tételeket (ugyanazzal a számítással, mint a Termelői fizetések táblázat), a háttér formázza és küldi el
   a szakember nyilvántartott e-mail-címére, az ügyvezető saját aláírásával. */
const PAY_COMPANY_ = { name: 'Lumos Motion Kft.', tax: '32701573-2-41', seat: '1136 Budapest, Tátra utca 20/B 3. em. 5. ajtó', finance: 'penzugy@lumosmotion.com', payDays: 8, replyDay: 5, invoiceDay: 8, note: 'Videofelvétel-készítés' };
function payMoney_(v, sign) { const n = Math.round(Number(v) || 0), s = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + '\u00a0Ft'; return (n < 0 ? '−' : sign && n > 0 ? '+' : '') + s; }
function payStatementBuild_(u, a) {
  a = a || {};
  const month = str_(a.month, 7); if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Hibás hónap.');
  const crewId = str_(a.crewId, 64), c = readAll_('crew').find(x => x.id === crewId); if (!c) throw new Error('A munkatárs nem található.');
  const y = Number(month.slice(0, 4)), m = Number(month.slice(5, 7)), ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
  const mLbl = y + '. ' + HU_MONTHS_[m - 1], nextLbl = d => ny + '. ' + HU_MONTHS_[nm - 1] + ' ' + d + '.', nextIg = d => ny + '. ' + HU_MONTHS_[nm - 1] + ' ' + d + '-ig';
  const num = v => Math.round(Number(v) || 0);
  const rows = (Array.isArray(a.rows) ? a.rows : []).slice(0, 80).map(r => ({ date: str_(r.date, 40), name: str_(r.name, 160), roles: str_(r.roles, 200), fee: num(r.fee), ded: Math.abs(num(r.ded)), kind: r.kind === 'sales' || r.kind === 'salary' ? r.kind : '' }));
  const pens = (Array.isArray(a.pens) ? a.pens : []).slice(0, 60).map(x => ({ project: str_(x.project, 160), amount: Math.abs(num(x.amount)), kind: str_(x.kind, 120), ref: str_(x.ref, 20), pct: num(x.pct), day: str_(x.day, 120), caseText: str_(x.caseText, 1500), reason: str_(x.reason, 3000), by: str_(x.by, 200) }));
  const rent = Math.max(0, num(a.rent)), adjs = (Array.isArray(a.adjs) ? a.adjs : num(a.adj) ? [{ amount: a.adj, note: a.adjNote, by: a.adjBy }] : []).slice(0, 30).map(x => ({ amount: num(x.amount), note: str_(x.note, 300), by: str_(x.by, 200) })).filter(x => x.amount), adj = adjs.reduce((s, x) => s + x.amount, 0), retained = Math.max(0, Math.round(num(a.retained)));   // korábbi hónapokból bennhagyott (még ki nem számlázott) összeg
  const feeSum = rows.reduce((s, r) => s + r.fee, 0), dedSum = rows.reduce((s, r) => s + r.ded, 0), gross = feeSum + rent, total = gross - dedSum + adj;
  const vat = c.vat === 'afa', first = String(c.name || '').trim().split(/\s+/).slice(-1)[0] || c.name, e = escapeHtml_;
  const pm = (v, sg) => payMoney_(v, sg) + (vat ? '\u00a0+\u00a0ÁFA' : '');
  const vatAmt = vat ? Math.round(total * 0.27) : 0;   // áfakörös szakembernél az ÁFA és a bruttó végösszeg is szerepel   // áfakörösnél minden összeg után „+ ÁFA”
  const subject = 'Díjösszesítő – ' + mLbl + ' · ' + c.name;   // összeg nélkül: értesítésben, továbbításkor ne látszódjon
  const RED = '#b4442f', GRN = '#2e7d4f', TD = 'padding:7px 8px;border-bottom:1px solid #e3e8e5;vertical-align:top;font-size:13px', NUM = TD + ';text-align:right;white-space:nowrap';
  const TH = 'padding:8px;background:#1d3a2e;color:#ffffff;font-size:12px;text-align:left', THR = TH + ';text-align:right';
  const H = t => '<h3 style="font-size:13px;letter-spacing:.06em;color:#1d3a2e;margin:22px 0 8px">' + t + '</h3>';
  const sr = (l, v, col, bold) => '<tr><td style="padding:3px 16px 3px 0">' + (bold ? '<b>' + l + '</b>' : l) + '</td><td style="text-align:right;white-space:nowrap' + (col ? ';color:' + col : '') + '">' + (bold ? '<b>' + v + '</b>' : v) + '</td></tr>';
  const gap = '<tr><td colspan="2" style="height:12px"></td></tr>';
  /* értékesítő: fix fizetés és jutalék külön sorban, nem „projektdíjként” */
  const pRows = rows.filter(r => !r.kind), salRows = rows.filter(r => r.kind === 'salary'), comRows = rows.filter(r => r.kind === 'sales'), onlySales = rows.length > 0 && !pRows.length && !rent;
  const sSum = l => l.reduce((s2, r) => s2 + r.fee, 0);
  const sumLines = (pRows.length || !rows.length ? [['Projektdíjak (' + pRows.length + ' projekt)', sSum(pRows)]] : []).concat(salRows.length ? [['Fix fizetés (értékesítő)', sSum(salRows)]] : [], comRows.length ? [['Értékesítői jutalék' + (comRows.length > 1 ? ' (' + comRows.length + ' tétel)' : ''), sSum(comRows)]] : []);
  const noteTxt = onlySales ? 'Értékesítési tevékenység' : (salRows.length || comRows.length) ? PAY_COMPANY_.note + ' és értékesítés' : PAY_COMPANY_.note;
  let summ = '<table cellpadding="0" cellspacing="0" style="font-size:14px">' + sumLines.map(x => sr(x[0], pm(x[1]))).join('')
    + (rent ? sr('Irodabérleti és termelési vezetői díj', pm(rent, true)) : '')
    + (rent ? '<tr><td style="padding:5px 16px 3px 0;border-top:1px solid #dddddd"><b>Díjak összesen</b></td><td style="padding-top:5px;border-top:1px solid #dddddd;text-align:right;white-space:nowrap"><b>' + pm(gross) + '</b></td></tr>' : '');   // a Díjak összesen csak akkor kell, ha több bevételi sor van (pl. irodabérlet)
  if (dedSum || adj) summ += gap + (dedSum ? sr('Díjcsökkentések (' + pens.length + ' tétel)', pm(-dedSum), RED) : '') + (adj ? sr('± Korrekció (levonás / hozzáadás)', pm(adj, true), adj < 0 ? RED : GRN) : '');
  summ += gap + '<tr><td style="padding:6px 16px 3px 0;border-top:2px solid #1d3a2e"><b>Kifizetendő összesen (nettó)</b></td><td style="padding-top:6px;border-top:2px solid #1d3a2e;text-align:right;white-space:nowrap;font-size:16px"><b>' + pm(total) + '</b></td></tr>' + (vat ? '<tr><td style="padding:3px 16px 3px 0">ÁFA (27%)</td><td style="text-align:right;white-space:nowrap">' + payMoney_(vatAmt) + '</td></tr><tr><td style="padding:3px 16px 3px 0"><b>Számla végösszege (bruttó)</b></td><td style="text-align:right;white-space:nowrap;font-size:16px"><b>' + payMoney_(total + vatAmt) + '</b></td></tr>' : '') + '</table>';
  const FD = dedSum > 0 || adjs.some(x => x.amount < 0);   // levonás nélkül csak a Kifizetendő oszlop látszik
  let tr = rows.map(r => '<tr><td style="' + TD + ';white-space:nowrap">' + e(r.date) + '</td><td style="' + TD + '"><b>' + e(r.name) + '</b>' + (r.roles ? '<br><span style="color:#667788;font-size:12px">' + e(r.roles) + '</span>' : '') + '</td>' + (FD ? '<td style="' + NUM + '">' + pm(r.fee) + '</td><td style="' + NUM + ';color:' + (r.ded ? RED : '#999999') + '">' + (r.ded ? pm(-r.ded) : '–') + '</td>' : '') + '<td style="' + NUM + '"><b>' + pm(r.fee - r.ded) + '</b></td></tr>').join('');
  if (rent) tr += '<tr><td style="' + TD + '">' + HU_MONTHS_[m - 1] + '</td><td style="' + TD + '"><b>🏢 Irodabérleti és termelési vezetői díj</b></td>' + (FD ? '<td style="' + NUM + '">' + pm(rent) + '</td><td style="' + NUM + ';color:#999999">–</td>' : '') + '<td style="' + NUM + '"><b>' + pm(rent) + '</b></td></tr>';
  adjs.forEach(x => { const v = x.amount; tr += '<tr style="background:#f4f6ff"><td style="' + TD + '">' + HU_MONTHS_[m - 1] + '</td><td style="' + TD + '"><b>± Korrekció</b> (' + (v < 0 ? 'levonás' : 'hozzáadás') + ')' + (x.note ? '<br><span style="color:#667788;font-size:12px">' + e(x.note) + '</span>' : '') + '</td>'
    + (!FD ? '' : v > 0 ? '<td style="' + NUM + '">' + pm(v) + '</td><td style="' + NUM + ';color:#999999">–</td>' : '<td style="' + NUM + ';color:#999999">–</td><td style="' + NUM + ';color:' + RED + '">' + pm(v) + '</td>')
    + '<td style="' + NUM + '"><b>' + pm(v, true) + '</b></td></tr>'; });   // levonás a Levonás oszlopba, hozzáadás a Díj oszlopba
  const tFee = gross + adjs.reduce((s, x) => s + Math.max(0, x.amount), 0), tDed = dedSum + adjs.reduce((s, x) => s + Math.max(0, -x.amount), 0);
  tr += '<tr style="background:#e8f2ec"><td style="' + TD + '"></td><td style="' + TD + '"><b>Összesen</b></td>' + (FD ? '<td style="' + NUM + '"><b>' + pm(tFee) + '</b></td><td style="' + NUM + ';color:' + RED + '"><b>' + (tDed ? pm(-tDed) : '–') + '</b></td>' : '') + '<td style="' + NUM + '"><b>' + pm(total) + '</b></td></tr>';
  const table = '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:auto;min-width:420px;max-width:600px;font-family:Arial,Helvetica,sans-serif"><tr><th style="' + TH + '">Dátum</th><th style="' + TH + '">' + (onlySales ? 'Tétel' : 'Projekt') + '</th>' + (FD ? '<th style="' + THR + '">Díj</th><th style="' + THR + '">Levonás</th>' : '') + '<th style="' + THR + '">Kifizetendő</th></tr>' + tr + '</table>';
  const li = (l, v) => '<tr><td style="padding:3px 10px 3px 0;color:#667788;font-size:13px;white-space:nowrap;vertical-align:top">' + l + '</td><td style="padding:3px 0;font-size:13px">' + v + '</td></tr>';
  const penHtml = pens.map((x, i) => '<div style="border:1px solid #f0d0c8;background:#fff8f6;border-radius:8px;padding:10px 12px;margin:0 0 10px"><div style="font-size:14px;margin-bottom:4px"><b>' + (i + 1) + '. ' + e(x.project) + '</b> <span style="color:' + RED + ';white-space:nowrap"><b>' + pm(-x.amount) + '</b></span></div><table cellpadding="0" cellspacing="0">'
    + li('Kategória', e(x.kind + (x.pct ? ', ' + x.pct + '%' : '') + (x.ref ? ' (szerződés ' + x.ref + ' pont)' : ''))) + (x.day ? li('Érintett', e(x.day)) : '') + (x.caseText ? li('Eset', e(x.caseText)) : '')
    + li('Indoklás', e(x.reason).replace(/\n/g, '<br>')) + (x.by ? li('', '<span style="color:#667788">' + e(x.by) + '</span>') : '') + '</table></div>').join('');
  const adjHtml = adjs.map(x => '<div style="border:1px solid #d6dcf5;background:#f6f8ff;border-radius:8px;padding:10px 12px;margin:0 0 10px;font-size:13px"><div style="font-size:14px;margin-bottom:4px"><b>' + (x.amount < 0 ? 'Levonás' : 'Hozzáadás') + '</b> <span style="white-space:nowrap;color:' + (x.amount < 0 ? RED : GRN) + '"><b>' + pm(x.amount, true) + '</b></span></div>' + (x.note ? 'Megjegyzés: ' + e(x.note) + '<br>' : '') + (x.by ? '<span style="color:#667788">Rögzítette: ' + e(x.by) + '</span>' : '') + '</div>').join('');
  const inv = [['Vevő', '<b>' + PAY_COMPANY_.name + '</b>'], ['Adószám', PAY_COMPANY_.tax], ['Székhely', e(PAY_COMPANY_.seat)], ['Összeg', '<b>' + pm(total) + '</b>' + (vat ? ' · ÁFA (27%): ' + payMoney_(vatAmt) + ' · <b>bruttó: ' + payMoney_(total + vatAmt) + '</b>' : '')],
    ['Számla megjegyzése', '„' + mLbl + ' – ' + noteTxt + '”'], ['Teljesítés dátuma', '<b>' + y + '. ' + HU_MONTHS_[m - 1] + ' ' + new Date(Date.UTC(y, m, 0)).getUTCDate() + '.</b>'], ['Fizetési határidő', PAY_COMPANY_.payDays + ' nap'], ['Számla kiállításának határideje', '<b>' + nextLbl(PAY_COMPANY_.invoiceDay) + '</b>'], ['Hová küldd', '<a href="mailto:' + PAY_COMPANY_.finance + '">' + PAY_COMPANY_.finance + '</a>']]
    .map(r => '<tr><td style="padding:3px 14px 3px 0;color:#667788;white-space:nowrap;vertical-align:top">' + r[0] + '</td><td style="padding:3px 0">' + r[1] + '</td></tr>').join('');
  const sig = signatureFor_(u), url = appUrl_() || FRONTEND_URL;
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;color:#111111;line-height:1.5;max-width:680px;font-size:14px">'
    + '<p>Kedves ' + e(first) + ',</p><p>Összeállítottuk a ' + mLbl + 'i díjösszesítődet. Kérlek, ennek alapján állítsd ki a számlát.</p>'
    + H('ÖSSZESÍTÉS') + summ + H(onlySales ? 'TÉTELEK' : 'PROJEKTEK') + table + (pens.length ? H('DÍJCSÖKKENTÉSEK RÉSZLETESEN') + penHtml : '') + (adjs.length ? H('± KORREKCIÓ') + adjHtml : '')
    + H('SZÁMLÁZÁS') + '<table cellpadding="0" cellspacing="0" style="font-size:14px">' + inv + '</table>'
    + (retained ? '<p style="margin:12px 0 0;padding:10px 12px;background:#f3f8fc;border:1px solid #d3e3f0;border-radius:8px;font-size:13px">💼 <b>Bennhagyott egyenleged a korábbi hónapokból: ' + pm(retained) + '.</b> Ha szeretnéd, ezt is kiszámlázhatod – akár ezzel a számlával együtt, akár később.</p>' : '')
    + '<p style="margin-top:20px">' + (onlySales ? 'Az értékesítéseidet és a jutalékodat' : 'A projektjeidet') + ' a projekttervező applikációban is megnézheted: <a href="' + url + '">' + e(String(url).replace(/^https:\/\//, '').replace(/\/$/, '')) + '</a></p>'
    + '<p>Ha bármi eltérést találsz, kérlek, <b>' + nextIg(PAY_COMPANY_.replyDay) + '</b> válaszolj erre a levélre, hogy a számla kiállítása előtt javíthassuk.</p>'
    + '<div style="margin-top:18px">' + (sig ? sig.html : MAIL_SIGNATURE_HTML) + '</div></div>';
  const L = ['Kedves ' + first + ',', '', 'Összeállítottuk a ' + mLbl + 'i díjösszesítődet. Kérlek, ennek alapján állítsd ki a számlát.', '', 'ÖSSZESÍTÉS',
    ].concat(sumLines.map(x => x[0] + ': ' + pm(x[1])), rent ? ['Irodabérleti és termelési vezetői díj: ' + pm(rent, true)] : [], rent ? ['Díjak összesen: ' + pm(gross)] : [],
    dedSum ? ['Díjcsökkentések (' + pens.length + ' tétel): ' + pm(-dedSum)] : [], adjs.map(x => '± Korrekció: ' + pm(x.amount, true) + (x.note ? ' – ' + x.note : '')), ['Kifizetendő összesen: ' + pm(total)].concat(vat ? ['ÁFA (27%): ' + payMoney_(vatAmt), 'Számla végösszege (bruttó): ' + payMoney_(total + vatAmt)] : [], ['', onlySales ? 'TÉTELEK' : 'PROJEKTEK']),
    rows.map(r => r.date + ' · ' + r.name + (r.roles ? ' (' + r.roles + ')' : '') + ': ' + pm(r.fee) + (r.ded ? ' − ' + pm(r.ded) + ' = ' + pm(r.fee - r.ded) : '')),
    pens.length ? ['', 'DÍJCSÖKKENTÉSEK'] : [], pens.map((x, i) => (i + 1) + '. ' + x.project + ' – ' + pm(-x.amount) + '\n   ' + x.kind + (x.pct ? ', ' + x.pct + '%' : '') + (x.day ? '\n   Érintett: ' + x.day : '') + (x.caseText ? '\n   Eset: ' + x.caseText : '') + '\n   Indoklás: ' + x.reason + (x.by ? '\n   ' + x.by : '')),
    ['', 'SZÁMLÁZÁS', 'Vevő: ' + PAY_COMPANY_.name, 'Adószám: ' + PAY_COMPANY_.tax, 'Székhely: ' + PAY_COMPANY_.seat, 'Összeg: ' + pm(total) + (vat ? ' · ÁFA (27%): ' + payMoney_(vatAmt) + ' · bruttó: ' + payMoney_(total + vatAmt) : ''), 'Számla megjegyzése: „' + mLbl + ' – ' + noteTxt + '”', 'Teljesítés dátuma: ' + y + '. ' + HU_MONTHS_[m - 1] + ' ' + new Date(Date.UTC(y, m, 0)).getUTCDate() + '.',
      'Fizetési határidő: ' + PAY_COMPANY_.payDays + ' nap', 'Számla kiállításának határideje: ' + nextLbl(PAY_COMPANY_.invoiceDay), 'Hová küldd: ' + PAY_COMPANY_.finance, ''].concat(retained ? ['Bennhagyott egyenleged a korábbi hónapokból: ' + pm(retained) + '. Ha szeretnéd, ezt is kiszámlázhatod – akár ezzel a számlával együtt, akár később.', ''] : [], [
      (onlySales ? 'Az értékesítéseidet és a jutalékodat' : 'A projektjeidet') + ' a projekttervező applikációban is megnézheted: ' + url, '', 'Ha bármi eltérést találsz, kérlek, ' + nextIg(PAY_COMPANY_.replyDay) + ' válaszolj erre a levélre, hogy a számla kiállítása előtt javíthassuk.', '', sig ? sig.text : MAIL_SIGNATURE_TEXT]));
  if (a.html) {   // az ügyvezető az előnézetben átírta a levelet: a módosított változat megy ki (szkriptek, eseménykezelők nélkül)
    const h = payCleanHtml_(a.html);
    if (h.replace(/<[^>]*>/g, '').trim().length < 20) throw new Error('A szerkesztett levél üres.');
    return { c: c, month: month, subject: subject, html: h, text: payHtmlText_(h), total: total, edited: true };
  }
  return { c: c, month: month, subject: subject, html: html, text: L.join('\n'), total: total };
}
function payCleanHtml_(raw) {
  return String(raw || '').slice(0, 300000)
    .replace(/<\s*(script|style|iframe|object|embed|form|input|button|textarea|select|link|meta|base)\b[\s\S]*?(<\/\s*\1\s*>|\/?>)/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/\scontenteditable\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("|')\s*(javascript|data|vbscript):[^"']*\2/gi, '$1="#"');
}
function payHtmlText_(h) {
  return String(h).replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|h[1-6]|li)>/gi, '\n').replace(/<\/t[dh]>/gi, '\t').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|\u00a0/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
/* Havi állapot szakemberenként: számlát kiállította / számla fizetve (dátummal, ki rögzítette) */
function setPayStatus_(u, a) {
  if (a && Array.isArray(a.crewIds)) {   // tömeges pipálás: több szakember egyszerre
    const ids = a.crewIds.map(x => str_(x, 64)).filter(Boolean).slice(0, 80); let out = null;
    ids.forEach(id => { out = setPayStatus_(u, { month: a.month, crewId: id, field: a.field, on: a.on }); });
    return out || readAll_('payStatus');
  }
  const month = str_(a && a.month, 7), crewId = str_(a && a.crewId, 64), field = String(a && a.field || ''), on = !!(a && a.on);
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Hibás hónap.');
  if (field !== 'invoiced' && field !== 'paid') throw new Error('Ismeretlen állapot.');
  const c = readAll_('crew').find(x => x.id === crewId); if (!c) throw new Error('A munkatárs nem található.');
  return withLock_(() => {
    const sh = sheetFor_('payStatus'), id = month + '|' + crewId, row = findRow_(sh, id);
    const cur = row ? readRow_('payStatus', sh, row) : { id: id, month: month, crewId: crewId, crewName: c.name, invoicedAt: '', invoicedBy: '', paidAt: '', paidBy: '' };
    const dt = /^\d{4}-\d{2}-\d{2}$/.test(String(a && a.date || '')) ? String(a.date) : today_();
    cur.crewName = c.name; cur[field + 'At'] = on ? dt : ''; cur[field + 'By'] = on ? u.name : '';
    if (field === 'invoiced' && !on) { cur.invoiceNo = ''; cur.invoiceNet = ''; cur.invoiceTax = ''; cur.invoiceMatch = ''; }   // visszavonáskor a NAV-párosítás is törlődik
    putRow_('payStatus', sh, cur, row);
    logEvent_(u, field === 'paid' ? (on ? 'Számla fizetve' : 'Számla fizetve – visszavonva') : (on ? 'Számlát kiállította' : 'Számla kiállítása – visszavonva'), c.name, month);
    return readAll_('payStatus');
  });
}
/* Kiküldött díjösszesítők listája (a levél szövege nélkül – azt külön kérjük le, ha megnyitják) */
function paySentList_(u) {
  if (u.role === 'editor') return readAll_('paySent').filter(x => u.crewId && x.crewId === u.crewId).map(x => ({ id: x.id, month: x.month, crewId: x.crewId, amount: x.amount }));   // bennhagyott egyenleghez
  return readAll_('paySent').filter(x => u.role === 'admin' || ((u.role === 'crew' || u.role === 'sales') && u.crewId && x.crewId === u.crewId)).map(x => Object.assign({}, x, { html: '', hasHtml: !!x.html }));
}
function paySentHtml_(u, a) {
  const id = str_(a && a.month, 7) + '|' + str_(a && a.crewId, 64), x = readAll_('paySent').find(r => r.id === id);
  if (!x) throw new Error('Ehhez a hónaphoz még nem ment ki díjösszesítő.');
  if (((u.role === 'crew' || u.role === 'sales') && x.crewId !== u.crewId) || (u.role !== 'crew' && u.role !== 'sales' && u.role !== 'admin')) throw new Error('FORBIDDEN: ehhez nincs jogosultságod.');
  return { html: x.html || '', subject: x.subject || '', sentAt: x.sentAt, sentBy: x.sentBy, email: x.email, amount: x.amount };
}
function sendPayStatements_(u, a) {
  const list = (Array.isArray(a && a.items) ? a.items : []).slice(0, 60), sent = [], failed = [];
  if (!mailOn_('payStatement')) throw new Error('Az e-mail-küldés szünetel (Beállítások → E-mail értesítések).');
  list.forEach(it => {
    try {
      const b = payStatementBuild_(u, it), to = String(b.c.email || '').trim();
      if (isEmployee_(b.c)) { failed.push({ crewId: b.c.id, name: b.c.name, error: 'bérszámfejtett – nem kap díjösszesítőt' }); return; }
      if (!to) { failed.push({ crewId: b.c.id, name: b.c.name, error: 'nincs e-mail-cím' }); return; }
      const opts = mailOptsFor_(u, b.html);
      if (!gmailSend_(to, b.subject, b.text, opts, 'payStatement')) { failed.push({ crewId: b.c.id, name: b.c.name, error: 'nem ment ki' }); return; }
      withLock_(() => { const sh = sheetFor_('paySent'), id = b.month + '|' + b.c.id, row = findRow_(sh, id);
        putRow_('paySent', sh, { id: id, month: b.month, crewId: b.c.id, crewName: b.c.name, email: to, amount: b.total, sentAt: now_(), sentBy: u.name, subject: b.subject, html: b.html.length < 45000 ? b.html : '' }, row); });   // a táblázatcella legfeljebb 50 000 karakter
      sent.push({ crewId: b.c.id, name: b.c.name, email: to });
    } catch (e) { failed.push({ crewId: str_(it && it.crewId, 64), name: '', error: String(e && e.message || e) }); }
  });
  logEvent_(u, 'Díjösszesítő kiküldve', str_(list[0] && list[0].month, 7), sent.map(x => x.name).join(', ') + (failed.length ? ' · hiba: ' + failed.map(x => x.name || x.crewId).join(', ') : ''));
  return { sent: sent, failed: failed, paySent: paySentList_(u) };
}
/* ===================== NAV ONLINE SZÁMLA: bejövő számlák =====================
   A szakemberek a Lumos Motion adószámára állítják ki a számlát, ez a NAV-hoz is beérkezik. Naponta (és kérésre) lekérdezzük
   a cég bejövő számláit, és a kiküldött díjösszesítőkhöz párosítjuk: szállító adószáma = a munkatárs adószáma.
   Beállítás (Script Properties, a NAV Online Számla felületén létrehozott technikai felhasználó adatai):
     NAV_LOGIN, NAV_PASSWORD, NAV_SIGN_KEY   (a jelszót és a kulcsot soha ne küldd el senkinek). */
const NAV_URL_ = 'https://api.onlineszamla.nav.gov.hu/invoiceService/v3';
const NAV_SOFTWARE_ID_ = 'HU32701573LPM-0001';
function navConfig_() {
  const P = PropertiesService.getScriptProperties(), login = P.getProperty('NAV_LOGIN') || '', pass = P.getProperty('NAV_PASSWORD') || '', sign = P.getProperty('NAV_SIGN_KEY') || '';
  return { ok: !!(login && pass && sign), login: login, pass: pass, sign: sign, tax: String(PAY_COMPANY_.tax).slice(0, 8) };
}
/* SHA3-512 (Keccak, FIPS 202) – a NAV kérés-aláírásához; az Apps Script ezt nem ismeri beépítve */
function sha3_512Hex_(str) {
  /* 64 bites sávok 32 bites hi/lo párokban (BigInt nélkül – az Apps Script nem engedi a BigInt literálokat) */
  const RC = [1,0, 32898,0, 32906,2147483648, 2147516416,2147483648, 32907,0, 2147483649,0, 2147516545,2147483648, 32777,2147483648, 138,0, 136,0, 2147516425,0, 2147483658,0, 2147516555,0, 139,2147483648, 32905,2147483648, 32771,2147483648, 32770,2147483648, 128,2147483648, 32778,0, 2147483658,2147483648, 2147516545,2147483648, 32896,2147483648, 2147483649,0, 2147516424,2147483648];
  const R = [0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14];
  const bytes = []; const u = unescape(encodeURIComponent(String(str))); for (let i = 0; i < u.length; i++) bytes.push(u.charCodeAt(i));
  const rate = 72; bytes.push(0x06); while (bytes.length % rate) bytes.push(0); bytes[bytes.length - 1] |= 0x80;
  const lo = new Array(25).fill(0), hi = new Array(25).fill(0), Bl = new Array(25), Bh = new Array(25), Cl = new Array(5), Ch = new Array(5);
  const rot = (l, h, n) => { if (n === 0) return [l, h]; if (n >= 32) { const t = l; l = h; h = t; n -= 32; } if (n === 0) return [l, h];
    return [((l << n) | (h >>> (32 - n))) >>> 0, ((h << n) | (l >>> (32 - n))) >>> 0]; };
  const f = () => { for (let r = 0; r < 24; r++) {
    for (let x = 0; x < 5; x++) { Cl[x] = lo[x] ^ lo[x + 5] ^ lo[x + 10] ^ lo[x + 15] ^ lo[x + 20]; Ch[x] = hi[x] ^ hi[x + 5] ^ hi[x + 10] ^ hi[x + 15] ^ hi[x + 20]; }
    for (let x = 0; x < 5; x++) { const t = rot(Cl[(x + 1) % 5], Ch[(x + 1) % 5], 1), Dl = Cl[(x + 4) % 5] ^ t[0], Dh = Ch[(x + 4) % 5] ^ t[1];
      for (let y = 0; y < 25; y += 5) { lo[x + y] ^= Dl; hi[x + y] ^= Dh; } }
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) { const t = rot(lo[x + 5 * y], hi[x + 5 * y], R[x + 5 * y]), k = y + 5 * ((2 * x + 3 * y) % 5); Bl[k] = t[0]; Bh[k] = t[1]; }
    for (let y = 0; y < 25; y += 5) for (let x = 0; x < 5; x++) { lo[x + y] = Bl[x + y] ^ (~Bl[(x + 1) % 5 + y] & Bl[(x + 2) % 5 + y]); hi[x + y] = Bh[x + y] ^ (~Bh[(x + 1) % 5 + y] & Bh[(x + 2) % 5 + y]); }
    lo[0] ^= RC[2 * r]; hi[0] ^= RC[2 * r + 1]; } };
  for (let o = 0; o < bytes.length; o += rate) { for (let i = 0; i < rate / 8; i++) { const q = o + i * 8;
    lo[i] ^= (bytes[q] | (bytes[q + 1] << 8) | (bytes[q + 2] << 16) | (bytes[q + 3] << 24));
    hi[i] ^= (bytes[q + 4] | (bytes[q + 5] << 8) | (bytes[q + 6] << 16) | (bytes[q + 7] << 24)); } f(); }
  let hex = ''; for (let i = 0; i < 8; i++) for (const w of [lo[i], hi[i]]) for (let b = 0; b < 4; b++) hex += ((w >>> (8 * b)) & 255).toString(16).padStart(2, '0');
  return hex.toUpperCase();
}
function navHex_(bytes) { return bytes.map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('').toUpperCase(); }
function navXmlEsc_(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function navRequest_(cfg, body, page, dir) {
  const txt = navCall_(cfg, 'QueryInvoiceDigest', '<page>' + page + '</page><invoiceDirection>' + dir + '</invoiceDirection>' + body);
  const tag = (src, n) => { const m = new RegExp('<(?:\\w+:)?' + n + '\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?' + n + '>').exec(src); return m ? m[1].trim() : ''; };
  const items = []; const re = /<(?:\w+:)?invoiceDigest>([\s\S]*?)<\/(?:\w+:)?invoiceDigest>/g; let m;
  while ((m = re.exec(txt))) { const d = m[1];
    items.push({ number: tag(d, 'invoiceNumber'), operation: tag(d, 'invoiceOperation'), issueDate: tag(d, 'invoiceIssueDate'), deliveryDate: tag(d, 'invoiceDeliveryDate'), supplierTax: tag(d, 'supplierTaxNumber'), supplierName: tag(d, 'supplierName'),
      net: Math.round(Number(tag(d, 'invoiceNetAmountHUF') || tag(d, 'invoiceNetAmount')) || 0), vat: Math.round(Number(tag(d, 'invoiceVatAmountHUF') || tag(d, 'invoiceVatAmount')) || 0) }); }
  return { items: items, pages: Number(tag(txt, 'availablePage')) || 1 };
}
/** Általános NAV Online Számla v3 hívás (op: pl. QueryInvoiceDigest, QueryInvoiceData); a válasz XML szövege */
function navCall_(cfg, op, inner) {
  const now = new Date(), ts = now.toISOString().replace(/\.\d+Z$/, '.000Z'), sigTs = ts.replace(/[-:T]/g, '').slice(0, 14);
  const rid = ('LPM' + now.getTime().toString(36) + Math.random().toString(36).slice(2, 10)).toUpperCase().slice(0, 30);
  const pw = navHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_512, cfg.pass, Utilities.Charset.UTF_8));
  const sig = sha3_512Hex_(rid + sigTs + cfg.sign);
  const xml = '<?xml version="1.0" encoding="UTF-8"?><' + op + 'Request xmlns="http://schemas.nav.gov.hu/OSA/3.0/api" xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common">'
    + '<common:header><common:requestId>' + rid + '</common:requestId><common:timestamp>' + ts + '</common:timestamp><common:requestVersion>3.0</common:requestVersion><common:headerVersion>1.0</common:headerVersion></common:header>'
    + '<common:user><common:login>' + navXmlEsc_(cfg.login) + '</common:login><common:passwordHash cryptoType="SHA-512">' + pw + '</common:passwordHash><common:taxNumber>' + cfg.tax + '</common:taxNumber><common:requestSignature cryptoType="SHA3-512">' + sig + '</common:requestSignature></common:user>'
    + '<software><softwareId>' + NAV_SOFTWARE_ID_ + '</softwareId><softwareName>Lumos Motion Projekttervezo</softwareName><softwareOperation>LOCAL_SOFTWARE</softwareOperation><softwareMainVersion>1.0</softwareMainVersion><softwareDevName>Lumos Motion Kft.</softwareDevName><softwareDevContact>' + navXmlEsc_(MAIL_REPLY_TO) + '</softwareDevContact><softwareDevCountryCode>HU</softwareDevCountryCode><softwareDevTaxNumber>' + cfg.tax + '</softwareDevTaxNumber></software>'
    + inner + '</' + op + 'Request>';
  const res = UrlFetchApp.fetch(NAV_URL_ + '/' + op.charAt(0).toLowerCase() + op.slice(1), { method: 'post', contentType: 'application/xml', payload: xml, muteHttpExceptions: true, headers: { Accept: 'application/xml' } });
  const txt = res.getContentText();
  const tag = (src, n) => { const m = new RegExp('<(?:\\w+:)?' + n + '\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?' + n + '>').exec(src); return m ? m[1].trim() : ''; };
  if (res.getResponseCode() !== 200 || tag(txt, 'funcCode') === 'ERROR') throw new Error('NAV: ' + (tag(txt, 'message') || tag(txt, 'errorCode') || ('HTTP ' + res.getResponseCode())));
  return txt;
}
/** Bejövő számla(ák) tartalma a NAV-ból (a megtekintéshez): eladó, vevő, dátumok, tételek, összesítő */
function navInvoices_(u, a) {
  const cfg = navConfig_(); if (!cfg.ok) throw new Error('A NAV-kapcsolat nincs beállítva.');
  const tax = String(a && a.tax || '').replace(/\D/g, '').slice(0, 8), nos = String(a && a.nos || '').split(/\s*,\s*/).filter(Boolean).slice(0, 6);
  if (tax.length !== 8 || !nos.length) throw new Error('Hiányzik a számlaszám vagy az adószám.');
  const tag = (src, n) => { const m = new RegExp('<(?:\\w+:)?' + n + '\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?' + n + '>').exec(src); return m ? m[1].trim() : ''; };
  const all = (src, n) => { const out = [], re = new RegExp('<(?:\\w+:)?' + n + '\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?' + n + '>', 'g'); let m; while ((m = re.exec(src))) out.push(m[1]); return out; };
  const un = s => String(s || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const addr = s => { if (!s) return ''; const p = ['postalCode', 'city'].map(k => tag(s, k)).filter(Boolean).join(' '), rest = tag(s, 'additionalAddressDetail') || [tag(s, 'streetName'), tag(s, 'publicPlaceCategory'), tag(s, 'number'), tag(s, 'building'), tag(s, 'floor'), tag(s, 'door')].filter(Boolean).join(' '); return un([p, rest].filter(Boolean).join(', ')); };
  const taxStr = s => [tag(s, 'taxpayerId'), tag(s, 'vatCode'), tag(s, 'countyCode')].filter(Boolean).join('-');
  return nos.map(no => {
    const txt = navCall_(cfg, 'QueryInvoiceData', '<invoiceNumberQuery><invoiceNumber>' + navXmlEsc_(no) + '</invoiceNumber><invoiceDirection>INBOUND</invoiceDirection><supplierTaxNumber>' + tax + '</supplierTaxNumber></invoiceNumberQuery>');
    const b64 = tag(txt, 'invoiceData'); if (!b64) return { number: no, error: 'A NAV nem adta vissza a számla adatait.' };
    let bytes = Utilities.base64Decode(b64);
    if (tag(txt, 'compressedContentIndicator') === 'true') bytes = Utilities.ungzip(Utilities.newBlob(bytes, 'application/x-gzip')).getBytes();
    const x = Utilities.newBlob(bytes).getDataAsString('UTF-8');
    const sup = tag(x, 'supplierInfo'), cus = tag(x, 'customerInfo'), det = tag(x, 'invoiceDetail'), sum = tag(x, 'invoiceSummary');
    const lines = all(x, 'line').map(l => ({ name: un(tag(l, 'lineDescription')), qty: Number(tag(l, 'quantity')) || 0, unit: un(tag(l, 'unitOfMeasureOwn') || tag(l, 'unitOfMeasure')), price: Number(tag(l, 'unitPrice')) || 0,
      net: Number(tag(l, 'lineNetAmount')) || 0, vat: tag(l, 'vatPercentage') ? Math.round(Number(tag(l, 'vatPercentage')) * 100) + '%' : (tag(tag(l, 'vatExemption'), 'case') || (tag(l, 'vatOutOfScope') ? 'ÁKK' : '')), gross: Number(tag(l, 'lineGrossAmountNormal') || tag(l, 'lineGrossAmountSimplified')) || 0 }));
    return { number: tag(x, 'invoiceNumber') || no, issueDate: tag(x, 'invoiceIssueDate'), deliveryDate: tag(det, 'invoiceDeliveryDate'), dueDate: tag(det, 'paymentDate'), payMethod: tag(det, 'paymentMethod'),
      supplier: { name: un(tag(sup, 'supplierName')), tax: taxStr(tag(sup, 'supplierTaxNumber')), address: addr(tag(sup, 'supplierAddress')), bank: tag(sup, 'supplierBankAccountNumber') },
      customer: { name: un(tag(cus, 'customerName')), address: addr(tag(cus, 'customerAddress')) },
      lines: lines, net: Number(tag(sum, 'invoiceNetAmount')) || lines.reduce((s, l) => s + l.net, 0), vat: Number(tag(sum, 'invoiceVatAmount')) || 0, gross: Number(tag(sum, 'invoiceGrossAmount')) || lines.reduce((s, l) => s + (l.gross || l.net), 0) };
  });
}
/** A cég bejövő számlái kiállítási dátum szerint (a NAV egy lekérdezésben legfeljebb 35 napot enged, ezért szakaszokban). */
function navInbound_(cfg, from, to) {
  const out = [], day = 86400000, d0 = new Date(from + 'T00:00:00Z').getTime(), d1 = new Date(to + 'T00:00:00Z').getTime(), iso = t => new Date(t).toISOString().slice(0, 10);
  for (let a = d0; a <= d1; a += 35 * day) {
    const b = Math.min(d1, a + 34 * day), body = '<invoiceQueryParams><mandatoryQueryParams><invoiceIssueDate><dateFrom>' + iso(a) + '</dateFrom><dateTo>' + iso(b) + '</dateTo></invoiceIssueDate></mandatoryQueryParams></invoiceQueryParams>';
    let page = 1, pages = 1;
    do { const r = navRequest_(cfg, body, page, 'INBOUND'); r.items.forEach(x => out.push(x)); pages = r.pages; page++; } while (page <= pages && page <= 20);
  }
  return out;
}
/** Párosítás: a kiküldött díjösszesítőkhöz (hónap + munkatárs) a szállító adószáma alapján; az összeg egyezése a megbízhatóságot jelzi. */
function navSync_(u, a) {
  const cfg = navConfig_();
  if (!cfg.ok) throw new Error('A NAV-kapcsolat nincs beállítva: add meg a NAV_LOGIN, NAV_PASSWORD és NAV_SIGN_KEY szkripttulajdonságot (Projektbeállítások → Szkripttulajdonságok).');
  const today = today_(), sent = readAll_('paySent'), crew = byId_(readAll_('crew')), status = readAll_('payStatus');
  const want = str_(a && a.month, 7), one = str_(a && a.crewId, 64), months = {};   // one: egy munkatárs külön lekérdezése (újrapárosítás)
  sent.forEach(x => { const m = String(x.month); if (!/^\d{4}-\d{2}$/.test(m) || (one && x.crewId !== one)) return; if (want ? m === want : m >= addMonths_(today.slice(0, 7), -3)) (months[m] = months[m] || []).push(x); });
  if (one && want && !months[want]) throw new Error('Ehhez a munkatárshoz ebben a hónapban még nem ment ki díjösszesítő – előbb küldd ki, utána párosítható a számla.');
  const used = {}; status.forEach(s => { if (one && s.id === want + '|' + one) return; if (s.invoiceNo) String(s.invoiceNo).split(/\s*,\s*/).forEach(no => { used[no + '|' + String(s.invoiceTax || '')] = 1; }); });
  const found = [], missingTax = [];
  Object.keys(months).sort().forEach(m => {
    const from = m + '-01', endTry = addMonths_(m, 3) + '-01', to = endTry < today ? endTry : today;
    const inv = navInbound_(cfg, from, to).filter(x => x.operation !== 'STORNO' && x.operation !== 'MODIFY');
    months[m].forEach(x => {
      const c = crew[x.crewId]; if (!c || isEmployee_(c)) return;   // alkalmazott: nem számláz
      const st = status.find(s => s.id === m + '|' + x.crewId) || {}; if (st.invoiceNo && !one) return;   // már párosítva (egyéni lekérdezésnél újrapárosít)
      const tax8 = String(c.tax || '').replace(/\D/g, '').slice(0, 8); if (tax8.length !== 8) { missingTax.push(c.name); return; }
      // nem nézünk visszamenőleg: csak a hónap utolsó napján vagy a díjösszesítő kiküldése után kiállított számlák számítanak (a hónap eleji számla az előző hónapé)
      const lastDay = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).toISOString().slice(0, 10);
      const sentD = String(x.sentAt || '').slice(0, 10), thr = sentD && sentD < lastDay ? sentD : lastDay;
      const cand = inv.filter(i => String(i.supplierTax).slice(0, 8) === tax8 && !used[i.number + '|' + tax8] && i.issueDate >= thr)
        .sort((p, q) => p.issueDate.localeCompare(q.issueDate));
      if (!cand.length) { if (one && st.invoiceNo) payStatusClear_(m, c); return; }   // egyéni újrapárosítás: a rossz párosítás törlődik
      const exp = Math.round(Number(x.amount) || 0), exact = cand.find(i => i.net === exp), pick = exact ? [exact] : cand;   // több számla (pl. projektenként): együtt
      const net = pick.reduce((s, i) => s + i.net, 0), nos = pick.map(i => i.number).join(', ').slice(0, 300), ok = net === exp;
      pick.forEach(i => { used[i.number + '|' + tax8] = 1; });
      payStatusApply_(u, m, c, { invoicedAt: pick[pick.length - 1].issueDate, invoicedBy: 'NAV', invoiceNo: nos, invoiceNet: net, invoiceTax: tax8, invoiceMatch: ok ? 'ok' : 'diff' });
      found.push({ name: c.name, month: m, number: nos, net: net, expected: exp, match: ok });
    });
  });
  PropertiesService.getScriptProperties().setProperty('NAV_LAST_SYNC', now_());
  if (found.length) logEvent_(u, 'NAV-számlák párosítva', found.map(f => f.name).join(', '), found.map(f => f.month + ': ' + f.number).join(' · '));
  return { found: found, missingTax: missingTax.filter((v, i, arr) => arr.indexOf(v) === i), payStatus: readAll_('payStatus'), at: now_() };
}
function addMonths_(ym, n) { const y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) - 1 + n; return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7); }
function payStatusClear_(month, c) {   // téves NAV-párosítás törlése
  withLock_(() => { const sh = sheetFor_('payStatus'), row = findRow_(sh, month + '|' + c.id); if (!row) return; const cur = readRow_('payStatus', sh, row);
    Object.assign(cur, { invoicedAt: '', invoicedBy: '', invoiceNo: '', invoiceNet: '', invoiceTax: '', invoiceMatch: '' }); putRow_('payStatus', sh, cur, row); });
}
function payStatusApply_(u, month, c, patch) {
  withLock_(() => {
    const sh = sheetFor_('payStatus'), id = month + '|' + c.id, row = findRow_(sh, id);
    const cur = row ? readRow_('payStatus', sh, row) : { id: id, month: month, crewId: c.id, crewName: c.name, invoicedAt: '', invoicedBy: '', paidAt: '', paidBy: '' };
    if (cur.invoicedAt && !patch.invoiceNo) return;
    Object.assign(cur, cur.invoicedAt ? { invoicedAt: patch.invoicedAt || cur.invoicedAt, invoiceNo: patch.invoiceNo, invoiceNet: patch.invoiceNet, invoiceTax: patch.invoiceTax, invoiceMatch: patch.invoiceMatch } : patch);   // kézi pipánál is a számla kiállítási dátuma kerül be
    putRow_('payStatus', sh, cur, row);
  });
}
/* Napi automatikus futás (időzítő): reggel 7 és 8 között */
function navDailySync() { if (!navConfig_().ok) return; try { navSync_({ name: 'NAV (automatikus)', role: 'admin', email: '' }, {}); } catch (e) { Logger.log('NAV szinkron hiba: ' + e); } if (DB_) dbFlush_(); }
function installNavTrigger_() {
  if (ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'navDailySync')) return;
  ScriptApp.newTrigger('navDailySync').timeBased().atHour(7).everyDays(1).inTimezone(SHEET_TZ).create();
}

/* Fizetési korrekció: havi extra levonás vagy hozzáadás szakemberenként (pl. valaki a saját keretéből kipótolja egy kolléga díját). 0 = törlés. */
function savePayAdjust_(u, a) {   // havonta szakemberenként több korrekciós sor is lehet (id: crewId|hónap[|xxxx])
  const crewId = str_(a && a.crewId, 64), month = str_(a && a.month, 7), reqId = str_(a && a.id, 100);
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Hibás hónap.');
  const c = readAll_('crew').find(x => x.id === crewId); if (!c) throw new Error('A munkatárs nem található.');
  const amount = Math.round(Number(String(a.amount == null ? '' : a.amount).replace(/[^\d-]/g, '')) || 0), note = str_(a.note, 300).trim();
  const old = reqId ? readAll_('payAdjust').find(x => x.id === reqId && x.crewId === crewId && String(x.month) === month) : null;
  if (reqId && !old) throw new Error('A korrekció nem található – frissítsd az oldalt.');
  if (readAll_('paySent').some(x => x.id === month + '|' + crewId)) {
    if (!old) throw new Error('A díjösszesítő már kiment – új korrekció erre a hónapra nem vehető fel.');
    if (Math.round(Number(old.amount) || 0) !== amount) throw new Error('A díjösszesítő már kiment – az összeg nem módosítható, csak a megjegyzés.');
  }
  if (Math.abs(amount) > FEE_MAX) throw new Error('Túl nagy összeg.');
  if (amount && note.length < 3) throw new Error('Írd be röviden, miért jár a korrekció.');
  if (!old && !amount) return readAll_('payAdjust');
  return withLock_(() => {
    const sh = sheetFor_('payAdjust'), id = old ? old.id : crewId + '|' + month + '|' + Utilities.getUuid().slice(0, 8), row = old ? findRow_(sh, id) : 0;
    if (!amount) { if (row) sh.deleteRow(row); }
    else putRow_('payAdjust', sh, { id: id, month: month, crewId: crewId, crewName: c.name, amount: amount, note: note, updatedAt: now_(), updatedBy: u.name }, row || null);
    dbFlush_();
    logEvent_(u, 'Fizetési korrekció', c.name, month + ': ' + (amount ? (amount > 0 ? '+' : '') + amount + ' Ft · ' + note : 'törölve'));
    return readAll_('payAdjust');
  });
}
function saveOfficeRent_(u, a) {
  const crewId = str_(a && a.crewId, 64), month = str_(a && a.month, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Hibás hónap.');
  const c = readAll_('crew').find(x => x.id === crewId); if (!c) throw new Error('A munkatárs nem található.');
  const clear = a.amount === '' || a.amount == null, amount = clear ? 0 : int_(a.amount, 0, FEE_MAX, 0);
  return withLock_(() => {
    const sh = sheetFor_('officeRent'), id = crewId + '|' + month, row = findRow_(sh, id);
    if (clear) { if (row) sh.deleteRow(row); }
    else putRow_('officeRent', sh, { id: id, crewId: crewId, crewName: c.name, month: month, amount: amount, updatedAt: now_(), updatedBy: u.name }, row);
    dbFlush_();
    logEvent_(u, 'Irodabérlet', c.name, month + ': ' + (clear ? 'törölve' : amount + ' Ft'));
    return readAll_('officeRent');
  });
}
function saveClient_(u, a) {
  if (!a || typeof a !== 'object') throw new Error('Hiányos adatok.');
  const id = str_(a.id, 64);
  if (!ID_RE.test(id)) throw new Error('Hibás azonosító.');
  const c = { id: id, name: str_(a.name, 160).replace(/\s+/g, ' '), tax: str_(a.tax, 20).replace(/[^\d-]/g, ''), address: str_(a.address, 300),
    contactName: str_(a.contactName, 120), contactPhone: str_(a.contactPhone, 40), contactEmail: str_(a.contactEmail, 160).toLowerCase(), note: str_(a.note, 1000), rep: str_(a.rep, 120), repPhone: str_(a.repPhone, 40), repEmail: str_(a.repEmail, 160).toLowerCase(), contactTitle: str_(a.contactTitle, 120), repTitle: str_(a.repTitle, 120), billEmail: str_(a.billEmail, 500).toLowerCase(), tigMail: a.tigMail && typeof a.tigMail === 'object' ? JSON.stringify({ to: str_(a.tigMail.to, 300), cc: str_(a.tigMail.cc, 300), subject: str_(a.tigMail.subject, 200), text: str_(a.tigMail.text, 5000) }) : str_(typeof a.tigMail === 'string' ? a.tigMail : '', 6000) };
  if (c.name.length < 2) throw new Error('Add meg az ügyfél nevét.');
  if (c.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.contactEmail)) throw new Error('Az e-mail-cím érvénytelen.');
  const oldName = str_(a.oldName, 160).trim();
  return withLock_(() => {
    const sh = sheetFor_('clients');
    let row = findRow_(sh, id), old = null;
    if (!row) {   // ugyanilyen nevű ügyfél már van → azt frissítjük (nem duplikálunk)
      const ex = readAll_('clients').find(x => String(x.name || '').trim().toLowerCase() === c.name.toLowerCase());
      if (ex) { c.id = ex.id; row = findRow_(sh, ex.id); }
    }
    if (row) { old = readRow_('clients', sh, row); c.createdAt = old.createdAt; if (a.tigMail === undefined) c.tigMail = old.tigMail || ''; if (a.billEmail === undefined) c.billEmail = old.billEmail || ''; } else c.createdAt = now_();
    c.updatedAt = now_();
    putRow_('clients', sh, c, row);
    let renamed = 0;
    const from = (oldName || (old && old.name) || '').toLowerCase();
    if (from && from !== c.name.toLowerCase()) {   // átnevezés: a projektek ügyfélmezője is
      const ps = sheetFor_('projects'), col = TABLES.projects.cols.findIndex(x => x[0] === 'client') + 1, n = ps.getLastRow() - 1;
      if (n > 0) { const rg = ps.getRange(2, col, n, 1), vals = rg.getValues();
        vals.forEach(v => { if (String(v[0] || '').trim().toLowerCase() === from) { v[0] = c.name; renamed++; } });
        if (renamed) rg.setValues(vals); }
    }
    dbFlush_();
    logEvent_(u, old ? 'Ügyfél módosítva' : 'Ügyfél felvéve', c.name, renamed ? renamed + ' projekt átnevezve' : '');
    return Object.assign({}, c, { renamed: renamed });
  });
}
function deleteClient_(u, a) {
  const id = str_(a && a.id, 64);
  return withLock_(() => {
    const sh = sheetFor_('clients'), row = findRow_(sh, id);
    if (!row) return { deleted: false, id: id };
    const old = readRow_('clients', sh, row);
    sh.deleteRow(row); dbFlush_();
    logEvent_(u, 'Ügyfél törölve', old.name, '');
    return { deleted: true, id: id };
  });
}

function deleteItem_(u, a) {
  const id = str_(a && a.id, 64);
  return withLock_(() => {
    const sh = sheetFor_('inventory'), row = findRow_(sh, id);
    if (!row) return { deleted: false, id: id };
    const old = readRow_('inventory', sh, row);
    sh.deleteRow(row);
    rewriteAssign_('eqAssign', r => r.itemId !== id, []);
    dbFlush_();
    logEvent_(u, 'Eszköz törölve', old.name, '');
    return { deleted: true, id: id };
  });
}

/* ===================== ESZKÖZLISTA KIKÜLDÉSE ===================== */
/** A levél feladója admin@ (ha be van állítva aliasként), a megjelenő név a küldő kolléga, a válasz hozzá megy. */
function mailOptsFor_(u, html) {
  const opts = { htmlBody: html, name: (u && u.name ? u.name + ' · ' : '') + 'Lumos Motion', replyTo: (u && u.email) || MAIL_REPLY_TO, __actor: (u && u.email) || '' };
  try {   // a küldő a művelet végzője (pl. a termelési vezető), ha a címe „Küldés másként” álnévként be van állítva a telepítő Gmail-fiókjában
    const al = GmailApp.getAliases().map(x => String(x).toLowerCase()), me = String(u && u.email || '').toLowerCase();
    if (me && al.indexOf(me) >= 0) opts.from = me; else if (al.indexOf(String(MAIL_FROM).toLowerCase()) >= 0) opts.from = MAIL_FROM;
  } catch (e) {}
  return opts;
}
function fmtHuDate_(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return '';
  const d = Utilities.parseDate(iso, SHEET_TZ, 'yyyy-MM-dd');
  const days = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'];
  const months = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
  return d.getFullYear() + '. ' + months[d.getMonth()] + ' ' + d.getDate() + '., ' + days[d.getDay()];
}
function sendEquipmentList_(u, a) {
  const id = str_(a && a.projectId, 64);
  if (!ID_RE.test(id)) throw new Error('Hibás projektazonosító.');
  const wanted = (Array.isArray(a.recipients) ? a.recipients : []).map(x => str_(x, 64)).slice(0, 40);
  const message = str_(a.message, 2000), includePlan = a.includePlan !== false;
  const sh = sheetFor_('projects'), row = findRow_(sh, id);
  if (!row) throw new Error('A projekt nem található.');
  const p = fullProject_(readRow_('projects', sh, row));
  const crewMap = byId_(readAll_('crew')), invMap = byId_(readAll_('inventory'));
  const onProject = {};
  if (p.lead) onProject[p.lead] = ['Projektvezető'];
  p.crew.forEach(c => { (onProject[c.crewId] = onProject[c.crewId] || []).push(c.role); });
  const recipients = wanted.filter(cid => onProject[cid] && crewMap[cid] && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(crewMap[cid].email || '')));
  if (!recipients.length) throw new Error('Nincs olyan kiválasztott stábtag, akinek van e-mail-címe.');
  const resend = !!p.listSentAt;
  const dateTxt = fmtHuDate_(p.date) + (p.endDate && p.endDate !== p.date ? ' – ' + fmtHuDate_(p.endDate) : '');
  const subject = (resend ? 'Frissített eszközlista' : 'Eszközlista') + ' – ' + p.name + (p.date ? ' (' + p.date.replace(/-/g, '.') + '.)' : '');
  const e = escapeHtml_;
  const rentals = parseRentals_(p.rentals);
  // eszközök kategóriánként – a projektvezető a teljes listát kapja, a többiek csak a sajátjukat
  const buildEq = only => {
  const byCat = {};
  p.equipment.forEach(x => { const it = invMap[x.itemId]; if (!it) return; if (only && x.crewId !== only) return; (byCat[it.category] = byCat[it.category] || []).push({ it: it, qty: x.qty, who: x.crewId && crewMap[x.crewId] ? crewMap[x.crewId].name : '' }); });
  let eqHtml = '', eqTxt = '';
  INV_CATS.concat(Object.keys(byCat).filter(c => INV_CATS.indexOf(c) < 0)).forEach(cat => {
    const items = byCat[cat]; if (!items) return;
    eqHtml += '<tr><td colspan="2" style="padding:12px 0 4px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5f7381">' + e(cat) + '</td></tr>';
    eqTxt += '\n' + cat.toUpperCase() + '\n';
    items.forEach(x => {
      eqHtml += '<tr><td style="padding:5px 0;border-top:1px solid #e3e9ee;width:28px;font-size:16px">☐</td><td style="padding:5px 0;border-top:1px solid #e3e9ee"><b>' + x.qty + '×</b> ' + e(x.it.name) + (x.it.serial ? ' <span style="color:#5f7381">(' + e(x.it.serial) + ')</span>' : '') + (x.who ? ' <span style="color:#1f5a3d;font-weight:600">– ' + e(x.who) + '</span>' : '') + '</td></tr>';
      eqTxt += '☐ ' + x.qty + '× ' + x.it.name + (x.it.serial ? ' (' + x.it.serial + ')' : '') + (x.who ? ' – ' + x.who : '') + '\n';
    });
  });
  [['Saját eszközök', rentals.filter(r => r.own && (!only || r.crewId === only))], ['Bérelt eszközök', rentals.filter(r => !r.own && (!only || r.crewId === only))]].forEach(([title, list]) => { if (!list.length) return;
    eqHtml += '<tr><td colspan="2" style="padding:12px 0 4px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5f7381">' + title + '</td></tr>';
    eqTxt += '\n' + title.toUpperCase() + '\n';
    list.forEach(r => { const who = r.crewId && crewMap[r.crewId] ? crewMap[r.crewId].name : '';
      eqHtml += '<tr><td style="padding:5px 0;border-top:1px solid #e3e9ee;width:28px;font-size:16px">☐</td><td style="padding:5px 0;border-top:1px solid #e3e9ee">' + e(r.name) + (r.company ? ' <span style="color:#5f7381">(' + e(r.company) + ')</span>' : '') + (who ? ' – ' + e(who) : '') + '</td></tr>';
      eqTxt += '☐ ' + r.name + (r.company ? ' (' + r.company + ')' : '') + (who ? ' – ' + who : '') + '\n'; });
  });
  if (!eqHtml) { eqHtml = '<tr><td style="color:#5f7381">' + (only ? 'Ehhez a projekthez nálad nincs eszköz.' : 'Ehhez a projekthez még nincs eszköz rendelve.') + '</td></tr>'; eqTxt = '\n(' + (only ? 'nálad nincs eszköz' : 'nincs eszköz rendelve') + ')\n'; }
  return { html: eqHtml, txt: eqTxt }; };
  const crewRows = Object.keys(onProject).filter(cid => crewMap[cid]).map(cid => ({ c: crewMap[cid], roles: onProject[cid] }));
  const crewHtml = crewRows.map(r => '<tr><td style="padding:4px 12px 4px 0"><b>' + e(r.c.name) + '</b></td><td style="padding:4px 12px 4px 0;color:#5f7381">' + e(r.roles.join(', ')) + '</td><td style="padding:4px 0">' + e(r.c.phone || '') + '</td></tr>').join('');
  const crewTxt = crewRows.map(r => '• ' + r.c.name + ' – ' + r.roles.join(', ') + (r.c.phone ? ' – ' + r.c.phone : '')).join('\n');
  // kapcsolattartó: a projektvezető az ügyfél valódi kapcsolattartóját kapja, a többi szakember a projektvezető elérhetőségét
  const leadC = p.lead && crewMap[p.lead] ? crewMap[p.lead] : null;
  const contactFor = cid => cid === p.lead ? [p.contactName, p.contactPhone, p.contactEmail].filter(Boolean).join(', ')
    : (leadC ? [leadC.name + ' (projektvezető)', leadC.phone, leadC.email].filter(Boolean).join(', ') : '');
  const infoOf = cid => [['Időpont', dateTxt], ['Kezdés', p.startTime], ['Helyszín', p.venue], ['Kapcsolattartó', contactFor(cid)]].filter(x => x[1]);
  const infoHtmlOf = cid => infoOf(cid).map(x => '<tr><td style="padding:3px 14px 3px 0;color:#5f7381;white-space:nowrap">' + x[0] + '</td><td style="padding:3px 0"><b>' + e(x[1]) + '</b></td></tr>').join('');
  const planHtml = includePlan && String(p.techPlan || '').trim() ? '<h3 style="font-size:15px;margin:24px 0 6px">Forgatási és technikai terv</h3><div style="white-space:pre-wrap">' + e(p.techPlan) + '</div>' : '';   // csak ha van terv; a jegyzetek nem kerülnek a levélbe
  const planTxt = includePlan && String(p.techPlan || '').trim() ? '\nFORGATÁSI ÉS TECHNIKAI TERV\n' + p.techPlan + '\n' : '';
  const sentTo = [];
  const mine = cid => p.equipment.filter(x => x.crewId === cid && invMap[x.itemId]).map(x => x.qty + '× ' + invMap[x.itemId].name)
    .concat(rentals.filter(r => r.crewId === cid).map(r => r.name + (r.own ? ' (saját)' : ' (bérelt' + (r.company ? ', ' + r.company : '') + ')')));
  const sig = signatureFor_(u), pNotes = parseNotes_(p.crewNotes), previews = [];
  recipients.forEach(cid => {
    const c = crewMap[cid];
    const first = String(c.name).trim().split(/\s+/).slice(-1)[0];
    const isLead = cid === p.lead, EQ = buildEq(isLead ? null : cid);
    const html = '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#173042;font-size:14px;line-height:1.5;max-width:640px">'
      + '<p>Szia ' + e(first) + '!</p>'
      + (message ? '<p style="white-space:pre-wrap">' + e(message) + '</p>' : '<p>' + (resend ? 'Frissült' : 'Itt az') + ' eszközlista a következő forgatáshoz:</p>')
      + '<h2 style="font-size:20px;margin:18px 0 8px">' + e(p.name) + '</h2>'
      + '<table style="border-collapse:collapse;font-size:14px">' + infoHtmlOf(cid) + '</table>'
      + '<p style="margin:10px 0 0">A te szereped: <b>' + e(onProject[cid].join(', ')) + '</b></p>'
      + (pNotes[cid] ? '<p style="margin:10px 0 0;padding:10px 12px;background:#fff6e0;border-radius:10px"><b>Neked szóló megjegyzés:</b><br>' + e(pNotes[cid]).replace(/\n/g, '<br>') + '</p>' : '')
      + '<h3 style="font-size:15px;margin:24px 0 2px">' + (isLead ? 'Eszközlista (teljes)' : 'A te eszközeid') + '</h3><table style="border-collapse:collapse;width:100%;font-size:14px">' + EQ.html + '</table>'
      + '<h3 style="font-size:15px;margin:24px 0 6px">Stáb</h3><table style="border-collapse:collapse;font-size:14px">' + crewHtml + '</table>'
      + planHtml
      + (sig ? '<div style="margin-top:26px">' + sig.html + '</div></div>' : '<p style="margin-top:26px">Üdvözlettel,<br>' + e(u.name) + '<br>Lumos Motion</p></div>');
    const text = 'Szia ' + first + '!\n\n' + (message || ((resend ? 'Frissült' : 'Itt az') + ' eszközlista a következő forgatáshoz:')) + '\n\n' + p.name + '\n'
      + infoOf(cid).map(x => x[0] + ': ' + x[1]).join('\n') + '\nA te szereped: ' + onProject[cid].join(', ') + (pNotes[cid] ? '\nNeked szóló megjegyzés: ' + pNotes[cid] : '') + '\n\n' + (isLead ? 'ESZKÖZLISTA (TELJES)' : 'A TE ESZKÖZEID') + EQ.txt + '\nSTÁB\n' + crewTxt + '\n' + planTxt
      + '\n' + (sig ? sig.text : 'Üdvözlettel,\n' + u.name + '\nLumos Motion');
    if (a.preview) { previews.push({ id: cid, name: c.name, email: c.email, subject: subject, html: html }); return; }   // előnézet: nem küldjük el
    const opts = mailOptsFor_(u, html);
    if (gmailSend_(c.email, subject, text, opts, 'eqlist')) sentTo.push(c.name);
  });
  if (a.preview) return { previews: previews };
  const when = now_(), info2 = sentTo.length + ' fő: ' + sentTo.join(', ');
  withLock_(() => {
    const r2 = findRow_(sh, id);
    if (!r2) return;
    const cols = TABLES.projects.cols.map(c => c[0]);
    sh.getRange(r2, cols.indexOf('listSentAt') + 1, 1, 2).setNumberFormat('@').setValues([[when, cell_(info2)]]);   // a módosítás idejét szándékosan nem írjuk át
  });
  logEvent_(u, resend ? 'Eszközlista újraküldve' : 'Eszközlista kiküldve', p.name, info2);
  return { sent: sentTo.length, names: sentTo, listSentAt: when, listSentTo: info2, from: mailOptsFor_(u, '').from || '' };
}

/* ===================== NAPLÓ ===================== */
const LOG_TAB = 'Napló';
const LOG_HEADERS = ['Mikor', 'Ki', 'Szerepkör', 'Művelet', 'Tárgy', 'Részletek'];
function logSheet_() {
  if (SHEET_MEMO_.__log) return SHEET_MEMO_.__log;
  const ss = ss_();
  let sh = ss.getSheetByName(LOG_TAB);
  if (!sh) {
    sh = ss.insertSheet(LOG_TAB);
    try { sh.protect().setDescription('A naplót csak a program írja').setWarningOnly(true); } catch (e) {}
  }
  ensureHeader_(sh, LOG_HEADERS, LOG_TAB);
  return (SHEET_MEMO_.__log = sh);
}
function logEvent_(u, action, subject, details) {
  if (dbOn_()) { try { dbLog_([now_(), u ? u.name : '', u ? (ROLE_NAMES_[u.role] || u.role) + (u.realRole ? ' (ügyvezetői előnézet)' : '') : '', action, cell_(subject || ''), cell_(String(details || '').slice(0, 3000))]); } catch (e) { Logger.log('Napló hiba: ' + e); } return; }
  try {
    const sh = logSheet_();
    const rg = sh.getRange(sh.getLastRow() + 1, 1, 1, LOG_HEADERS.length);
    rg.setNumberFormat('@');
    rg.setValues([[now_(), u ? u.name : '', u ? (ROLE_NAMES_[u.role] || u.role) + (u.realRole ? ' (ügyvezetői előnézet)' : '') : '', action, cell_(subject || ''), cell_(String(details || '').slice(0, 2000))]]);
  } catch (e) { Logger.log('Napló hiba: ' + e); }
}
/** Projekt részletei és története: létrehozás, utolsó módosítás, a naplóbejegyzések (átnevezés előtti néven is). */
function projectHistory_(u, a) {
  const id = str_(a && a.id, 64), p = readAll_('projects').find(x => x.id === id); if (!p) throw new Error('A projekt nem található.');
  const names = {}; names[String(p.name || '').trim()] = 1;
  const fetch = () => {
    const ns = Object.keys(names).filter(Boolean);
    if (dbOn_()) { const r = neonSql_([{ query: "SELECT at, who, role, action, subject, details FROM lpm_log WHERE btrim(ltrim(subject, '''')) IN (SELECT jsonb_array_elements_text($1::jsonb)) ORDER BY id DESC LIMIT 400", params: [JSON.stringify(ns)] }])[0];
      return (r.rows || []).map(x => ({ at: x[0], who: x[1], role: x[2], action: x[3], subject: String(x[4]).replace(/^'/, ''), details: String(x[5]).replace(/^'/, '') })); }
    const sh = logSheet_(), n = sh.getLastRow(); if (n < 2) return [];
    return sh.getRange(2, 1, n - 1, LOG_HEADERS.length).getDisplayValues().reverse().map(r => ({ at: r[0], who: r[1], role: r[2], action: r[3], subject: String(r[4]).replace(/^'/, ''), details: String(r[5]).replace(/^'/, '') })).filter(x => names[x.subject.trim()]);
  };
  let L = fetch();
  let more = false; L.forEach(x => { const m = /(?:Projekt neve|Név): (.+?) → /.exec(x.details); if (m && !names[m[1].trim()]) { names[m[1].trim()] = 1; more = true; } });   // korábbi név
  if (more) L = fetch();
  if (u.role !== 'admin') {   // a termelési vezető nem látja az árakat és a számlázást
    const hideAct = /számláz|bevétel|keretszerződés|díjbekér/i, hideSeg = /^(Ajánlati ár|Extra szolgáltatások|Projekt értéke|Termelői keret módja|Termelői keret \(% vagy Ft\)|Fizetési állapot)/;   // a % alapú keretből az ár visszaszámolható lenne
    L = L.filter(x => !hideAct.test(x.action)).map(x => {
      const sep = / → /.test(x.details) ? '; ' : ', ', parts = String(x.details || '').split(sep), keep = parts.filter(s => !hideSeg.test(s.trim()));
      return keep.length === parts.length ? x : Object.assign({}, x, { details: keep.join(sep), _cut: !keep.length });
    }).filter(x => !x._cut);
  }
  const created = L.slice().reverse().find(x => /létrehozva|felvéve/i.test(x.action));
  return { id: p.id, name: p.name, createdAt: p.createdAt || (created ? created.at : ''), createdBy: created ? created.who : '', updatedAt: p.updatedAt || '', updatedBy: p.updatedBy || '', status: p.status, log: L.slice(0, 300) };
}
function getLog_() {
  if (dbOn_()) return dbGetLog_().map(x => Object.assign(x, { subject: String(x.subject).replace(/^'/, ''), details: String(x.details).replace(/^'/, '') }));
  const sh = logSheet_(), n = sh.getLastRow();
  if (n < 2) return [];
  const from = Math.max(2, n - 599);
  return sh.getRange(from, 1, n - from + 1, LOG_HEADERS.length).getDisplayValues().reverse()
    .map(r => ({ at: r[0], who: r[1], role: r[2], action: r[3], subject: String(r[4]).replace(/^'/, ''), details: String(r[5]).replace(/^'/, '') }));
}

/* ===================== FELHASZNÁLÓK ÉS BELÉPÉS (a Sales App mintájára) ===================== */
const USERS_PROPERTY = 'LUMOS_PM_USERS_V1';
const SESSION_PREFIX = 'LUMOS_PM_SESS_';
const ROLES = ['admin', 'editor', 'crew', 'sales'];   // + Értékesítő: csak az Értékesítés fület látja, a saját lehetőségeivel   // Ügyvezető, Termelési vezető, Szakember (csak a saját beosztásait látja, nem szerkeszt)
const ROLE_NAMES_ = { admin: 'Ügyvezető', editor: 'Termelési vezető', crew: 'Szakember', sales: 'Értékesítő' };
const SESSION_DAYS_BY_ROLE = { admin: 7, editor: 30, crew: 30, sales: 30 };

function ownerOnly_() {
  let active = '', effective = '';
  try { active = Session.getActiveUser().getEmail() || ''; } catch (e) {}
  try { effective = Session.getEffectiveUser().getEmail() || ''; } catch (e) {}
  if (!active || !effective || active.toLowerCase() !== effective.toLowerCase())
    throw new Error('Ezt a függvényt csak a szkript tulajdonosa futtathatja az Apps Script szerkesztőből.');
}
function sha256hex_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
    .map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}
function sameName_(a, b) { return String(a || '').trim().toLocaleLowerCase('hu-HU') === String(b || '').trim().toLocaleLowerCase('hu-HU'); }
function loadUsers_() {
  try { const a = JSON.parse(PropertiesService.getScriptProperties().getProperty(USERS_PROPERTY) || '[]'); return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
}
function saveUsers_(users) {
  users.forEach(u => { delete u.salt; delete u.hash; });   // a régi PIN-kódok nyoma is törlődik
  const json = JSON.stringify(users);
  if (json.length > 8500) throw new Error('Elérted a felhasználók maximális számát (kb. 30).');
  PropertiesService.getScriptProperties().setProperty(USERS_PROPERTY, json);
}
function publicUser_(u) {
  const o = { id: u.id, name: u.name, role: u.role, crewId: String(u.crewId || ''), email: String(u.email || '') };   // a saját címe (levél-előnézet feladója, csengő)
  if (u.realRole) { o.realRole = u.realRole; o.viewAs = u.viewAs; }
  return o;
}
function adminListUser_(u) { return Object.assign({ id: u.id, name: u.name, role: u.role, crewId: String(u.crewId || ''), email: String(u.email || ''), disabled: !!u.disabled, createdAt: u.createdAt || '' }, u.role === 'sales' ? salesCompOf_(u) : {}); }
/** Értékesítő díjazása: fix havi fizetés (nettó) + jutalék szerződésenként: a határ alatti értéknél commLow %, felette commHigh %. */
function salesComp_(a) {
  const pct = v => { const n = Number(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 100) / 100 : NaN; };
  const lo = pct(a.commLow), hi = pct(a.commHigh), sal = Math.round(Number(String(a.salary == null ? '' : a.salary).replace(/\D/g, '')) || 0), lim = Math.round(Number(String(a.commLimit == null ? '' : a.commLimit).replace(/\D/g, '')) || 1000000);
  if (String(a.commLow == null ? '' : a.commLow).trim() === '' || isNaN(lo)) throw new Error('Értékesítőnél add meg a jutalék %-át (a határ alatt).');
  if (String(a.commHigh == null ? '' : a.commHigh).trim() === '' || isNaN(hi)) throw new Error('Értékesítőnél add meg a jutalék %-át (a határ felett).');
  if (String(a.salary == null ? '' : a.salary).trim() === '') throw new Error('Értékesítőnél add meg a fix havi fizetést (ha nincs, írj 0-t).');
  return { salary: Math.min(sal, FEE_MAX), commLow: lo, commHigh: hi, commLimit: Math.max(1, Math.min(lim, VALUE_MAX)) };
}
function salesCompOf_(u) { return { salary: Number(u.salary) || 0, commLow: Number(u.commLow) || 0, commHigh: u.commHigh == null ? Number(u.commLow) || 0 : Number(u.commHigh) || 0, commLimit: Number(u.commLimit) || 1000000 }; }
/** Az értékesítők díjazása a Kifizetésekhez: ügyvezetőnek mindenkié, értékesítőnek a sajátja (más szerepkör nem kapja meg). */
function salesPeople_(u) {
  const list = loadUsers_().filter(x => x.role === 'sales' && x.crewId && !x.disabled && (u.role === 'admin' || x.id === u.id));
  if (u.role === 'admin') {   // fiók nélküli értékesítő (munkatárs): csak a projektenként kézzel megadott jutalék % számít
    const cm = byId_(readAll_('crew')), seen = {};
    readAll_('deals').forEach(d => { const o = String(d.ownerId || ''); if (d.stage !== 'nyert' || o.indexOf('crew:') !== 0 || seen[o]) return; seen[o] = 1;
      const cid = o.slice(5), c = cm[cid]; if (c && !list.some(x => x.crewId === cid)) list.push({ id: o, name: sval_(c.name), role: 'crew', crewId: cid, salary: 0, commLow: 0, commHigh: 0, commLimit: VALUE_MAX }); });
  }
  if (!list.length) return [];
  const ctx = salesCommCtx_();
  return list.map(x => Object.assign({ userId: x.id, crewId: String(x.crewId), name: x.name, since: String(x.createdAt || '').slice(0, 7) }, salesCompOf_(x), { comm: salesCommOf_(x, ctx) }));
}
/* Értékesítői jutalék (keretszerződés 3. pont): havonta, a ténylegesen kifizetett nettó ügyfélbevétel után, sávosan
   (a havi alap határig terjedő része commLow %, a felette lévő része commHigh %). A jutalékalapba nem számít bele
   a továbbszámlázott költség (a projekt „továbbszámlázott” extrái, arányosan), és a ki nem fizetett számla sem. */
function salesCommCtx_() {
  return { deals: readAll_('deals').filter(d => d.stage === 'nyert' && d.projectId), inv: readAll_('finInvoice'), proj: byId_(readAll_('projects')) };
}
function salesCommOf_(user, ctx) {
  const c = salesCompOf_(user), pids = {};
  ctx.deals.filter(d => d.ownerId === user.id).forEach(d => { pids[d.projectId] = d; });
  const months = {}, n = v => Number(v) || 0;
  const share = (x, pid) => {   // közös számlánál a projekt része a szerződött értékek arányában
    const ids = [String(x.projectId || '')].concat(String(x.projectIds || '').split(',')).filter(String);
    if (ids.length < 2) return 1;
    const w = id => { const p = ctx.proj[id]; return p ? Math.max(0, n(p.quotePrice)) : 0; }, tot = ids.reduce((a, id) => a + w(id), 0);
    return tot > 0 ? w(pid) / tot : 1 / ids.length;
  };
  const passRatio = pid => {   // a továbbszámlázott költség aránya a projekt teljes (nettó) értékében
    const p = ctx.proj[pid]; if (!p) return 0;
    const ex = parseExtras_(p.extras), tov = ex.filter(e => e.kind === 'tov').reduce((a, e) => a + n(e.amount), 0);
    const total = n(p.quotePrice) + ex.reduce((a, e) => a + (e.kind === 'org' || e.kind === 'tov' ? 0 : e.kind === 'le' ? -1 : 1) * n(e.amount), 0);
    const org = ex.filter(e => e.kind === 'org').reduce((a, e) => a + n(e.amount), 0);   // a szervezői jutalék sem része a jutalékalapnak
    return total > 0 ? Math.min(1, (tov + org) / total) : 0;
  };
  const projBase = pid => { const p = ctx.proj[pid]; if (!p) return 0; const ex = parseExtras_(p.extras); const total = n(p.quotePrice) + ex.reduce((a, e) => a + (e.kind === 'org' || e.kind === 'tov' ? 0 : e.kind === 'le' ? -1 : 1) * n(e.amount), 0); return Math.max(0, total * (1 - passRatio(pid))); };
  Object.keys(pids).forEach(pid => {
    const p = ctx.proj[pid]; if (!p || p.status === 'lemondva') return;   // lemondott ügylet után nem jár jutalék
    const L = ctx.inv.filter(x => x.projectId === pid || String(x.projectIds || '').split(',').indexOf(pid) >= 0);
    const hasAdvInv = L.some(x => x.kind === 'eloleg');
    L.forEach(x => {
      if (x.kind === 'dijbekero' && hasAdvInv) return;   // a fizetett díjbekérőből előlegszámla lesz – egyszer számít
      const manual = x.kind === 'eloleg' && !!x.manual, gross = n(x.invGross), net = n(x.invNet);
      const paid = manual ? gross : Math.min(gross, n(x.invPaid));
      if (!(net > 0) || !(paid > 0) || !(gross > 0)) return;
      const when = String(x.paidAt || (manual ? x.date : '') || '').slice(0, 7); if (!/^\d{4}-\d{2}$/.test(when)) return;
      const paidNet = Math.round(net * paid / gross * share(x, pid)), base = Math.round(paidNet * (1 - passRatio(pid)));
      const m = months[when] || (months[when] = { base: 0, amount: 0, items: [], manBase: 0, manAmt: 0 });
      const mp = String(pids[pid].commManual == null ? '' : pids[pid].commManual).trim();   // a projektnél kézzel megadott jutalék % (nem sávos)
      if (/^ft:/.test(mp)) { const pb = projBase(pid); m.manBase += base; m.manAmt += pb > 0 ? Number(mp.slice(3)) * Math.min(1, base / pb) : 0; }   // kézi összeg: a befolyt rész arányában
      else if (mp !== '' && !isNaN(Number(mp))) { m.manBase += base; m.manAmt += base * Number(mp) / 100; }
      m.base += base; m.items.push({ projectId: pid, name: String(p.name || ''), invNo: String(x.no || ''), paidAt: String(x.paidAt || x.date || '').slice(0, 10), paidNet: paidNet, base: base });
    });
  });
  Object.keys(months).forEach(k => { const m = months[k], lim = c.commLimit;
    const ab = m.base - (m.manBase || 0);   // a sávos rész csak a kézi % nélküli projektekből
    m.amount = Math.round(Math.min(ab, lim) * c.commLow / 100 + Math.max(0, ab - lim) * c.commHigh / 100 + (m.manAmt || 0)); delete m.manBase; delete m.manAmt;
    m.items.sort((a, b) => a.paidAt < b.paidAt ? -1 : 1); });
  return months;
}
function newUserRecord_(name, role, crewId, email) {
  return { id: Utilities.getUuid(), name: name, role: role, crewId: crewId || '', email: String(email || ''), disabled: false, createdAt: new Date().toISOString() };
}
function escapeHtml_(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
/* E-mail tárgy: a GmailApp a tárgyban az emojikat hibásan kódolja (����) – ezeket kivesszük */
function subj_(t) { return String(t || '').replace(/[\uD800-\uDFFF]/g, '').replace(/[\u2600-\u27BF\uFE0F\u200D]/g, '').replace(/\s{2,}/g, ' ').trim(); }
function appUrl_() { return FRONTEND_URL; }
/* Rövid, olvasható projektlink: …/#p=ecommerce-expo-promo-shortok-d3f68107 (a név + az azonosító első 8 karaktere) */
function projSlug_(p) { return String((p && p.id) || '').slice(0, 8); }   // rövid projektlink: #p=d3f68107
function projLink_(p) { return FRONTEND_URL.replace(/\/$/, '') + '/#p=' + projSlug_(p); }
/* Személyes e-mail-aláírások (a küldő e-mail-címe szerint): az ügyvezető és a termelési vezetők a Beállítások → Hozzáférések
   alatt szerkesztik (beosztás, telefon, fotó). A képek a projekttervezo.lumosmotion.hu/sig/ alól töltődnek. */
const SIG_PROPERTY = 'LUMOS_PM_SIGS';
const SIG_DEFAULTS_ = {
  'david.zajacz@lumosmotion.com': { name: 'Zajácz Dávid', title: 'Produkciós koordinátor', phone: '+36 20 599 5583', photo: 'https://projekttervezo.lumosmotion.hu/sig/david.jpg' },
  'ervin.egri@lumosmotion.com': { name: 'Egri Ervin', title: 'Ügyvezető igazgató', phone: '+36 70 617 8235', photo: 'https://projekttervezo.lumosmotion.hu/sig/ervin.jpg' }
};
const SIG_ALIAS_ = { 'zajacz.david@lumosmotion.com': 'david.zajacz@lumosmotion.com' };   // ugyanaz a postafiók más címmel
const sigKey_ = e => { const m = String(e || '').trim().toLowerCase(); return SIG_ALIAS_[m] || m; };
function sigStore_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(SIG_PROPERTY) || '{}') || {}; } catch (e) { return {}; } }
/** Az aláírás adatai egy felhasználóhoz (mentett → alapértelmezett), vagy null, ha nincs beállítva. */
function sigFields_(user) {
  if (!user || !user.email) return null;
  const k = sigKey_(user.email), st = sigStore_()[k], d = SIG_DEFAULTS_[k];
  if (!st && !d) return null;
  const f = Object.assign({ title: '', phone: '', photo: '' }, d || {}, st || {});
  return { name: String(f.name || user.name || ''), email: k, title: String(f.title || ''), phone: String(f.phone || ''), photo: String(f.photo || '') };
}
function sigBuild_(f) {
  const e = escapeHtml_, tel = String(f.phone || '').replace(/[^\d+]/g, ''), F = 'font-family:Arial,Helvetica,sans-serif;';
  const photo = /^https:\/\//i.test(f.photo) ? '<td style="width:116px;padding:8px 0 8px 8px;vertical-align:middle;background:#f2f2f2;border-left:4px solid #111111;" valign="middle" width="116"><img alt="" height="108" src="' + e(f.photo) + '" style="display:block;width:108px;height:108px;border:0;border-radius:54px;outline:none;text-decoration:none;object-fit:cover;" width="108"/></td>' : '';
  const html = '<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;width:375px;' + F + 'color:#111111;" width="375"><tr><td colspan="2" style="padding:0 0 5pt 0;' + F + 'font-size:10pt;line-height:12pt;color:#111111;">Üdvözlettel,</td></tr><tr>' + photo
    + '<td style="padding:8px 8px 8px ' + (photo ? '0' : '12px') + ';vertical-align:middle;white-space:nowrap;background:#f2f2f2;' + (photo ? '' : 'border-left:4px solid #111111;') + F + 'color:#111111;" valign="middle">'
    + '<div style="font-size:14pt;line-height:16.8pt;font-weight:700;margin:0 0 4pt 0;">' + e(f.name) + '</div>'
    + (f.title ? '<div style="font-size:10pt;line-height:12pt;margin:0 0 4pt 0;">' + e(f.title) + '</div>' : '')
    + '<div style="font-size:10pt;line-height:12pt;font-weight:700;margin:0 0 4pt 0;">Lumos Motion Kft.</div>'
    + (f.phone ? '<div style="font-size:10pt;line-height:12pt;margin:0 0 4pt 0;">Tel.: <a href="tel:' + e(tel) + '" style="color:#1155cc;text-decoration:underline;">' + e(f.phone) + '</a></div>' : '')
    + '<div style="font-size:10pt;line-height:12pt;margin:0;">Email: <a href="mailto:' + e(f.email) + '" style="color:#1155cc;text-decoration:underline;font-size:10pt;">' + e(f.email) + '</a></div></td></tr>'
    + '<tr><td colspan="2" style="padding:6pt 0 0 0;"><a href="https://lumosmotion.com/" style="text-decoration:none;border:0;"><img alt="Lumos Motion" height="23" src="https://projekttervezo.lumosmotion.hu/sig/lumos-motion.png" style="display:block;width:224px;height:23px;border:0;outline:none;text-decoration:none;background:#ffffff;" width="224"/></a></td></tr></table>';
  const text = ['Üdvözlettel,', '', f.name, f.title, 'Lumos Motion Kft.', f.phone ? 'Tel.: ' + f.phone : '', 'Email: ' + f.email, 'https://lumosmotion.com/'].filter((x, i) => i < 2 || x).join('\n');
  return { html: html, text: text };
}
/* Beillesztett (pl. a szignó-dokumentumból másolt) aláírás: tisztított HTML, felhasználónként külön tulajdonságban */
const SIG_HTML_PREFIX = 'LUMOS_PM_SIGHTML_';
function sigCustom_(email) { try { return PropertiesService.getScriptProperties().getProperty(SIG_HTML_PREFIX + sigKey_(email)) || ''; } catch (e) { return ''; } }
function sigSanitize_(h, max) {
  let x = String(h || '');
  x = x.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|iframe|object|embed|form|input|button|textarea|select|meta|link|base)[\s\S]*?(<\/\1>|\/?>)/gi, '');
  x = x.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/(href|src)\s*=\s*("|')\s*(javascript|data|vbscript):[^"']*\2/gi, '');
  return x.trim().slice(0, max || 8500);
}
const signatureFor_ = u => {
  const c = u && u.email ? sigCustom_(u.email) : '';
  if (c) return { html: c, text: plainText_(c.replace(/<\/(div|tr|p|table)>/gi, '\n')).replace(/\n{3,}/g, '\n\n').trim() };
  const f = sigFields_(u); return f ? sigBuild_(f) : null; };
/** Aláírás mentése: az ügyvezető bármelyik vezetőét, a termelési vezető a sajátját. a: {userId, title, phone, photo} */
function saveSignature_(u, a) {
  const users = loadUsers_(), t = users.find(x => x.id === String(a && a.userId || ''));
  if (!t || (t.role !== 'admin' && t.role !== 'editor')) throw new Error('Aláírás csak az ügyvezetőnek és a termelési vezetőknek állítható be.');
  if (u.role !== 'admin' && t.id !== u.id) throw new Error('FORBIDDEN: csak a saját aláírásodat módosíthatod.');
  if (a && a.html !== undefined) {   // beillesztett aláírás (üres: vissza az alap, mezőkből épített aláírásra)
    const h = sigSanitize_(a.html), P = PropertiesService.getScriptProperties(), k = SIG_HTML_PREFIX + sigKey_(t.email);
    if (h.length >= 8500) throw new Error('Az aláírás túl hosszú – a képeket linkként (https://…) illeszd be, ne beágyazva.');
    if (h) P.setProperty(k, h); else P.deleteProperty(k);
    logEvent_(u, 'E-mail aláírás', t.name, h ? 'beillesztett aláírás mentve' : 'visszaállítva az alapra');
    return sigList_();
  }
  const photo = str_(a.photo, 400);
  if (photo && !/^https:\/\/\S+$/i.test(photo)) throw new Error('A fotó linkje https:// kezdetű legyen (vagy hagyd üresen).');
  const st = sigStore_(); st[sigKey_(t.email)] = { name: str_(a.name, 80), title: str_(a.title, 80), phone: str_(a.phone, 40), photo: photo };
  PropertiesService.getScriptProperties().setProperty(SIG_PROPERTY, JSON.stringify(st));
  logEvent_(u, 'E-mail aláírás', t.name, 'módosítva');
  return sigList_();
}
function sigList_() { const o = {}; loadUsers_().filter(x => (x.role === 'admin' || x.role === 'editor') && !x.disabled).forEach(x => { const f = sigFields_(x) || { name: x.name, email: sigKey_(x.email), title: '', phone: '', photo: '' }; const c = sigCustom_(x.email); o[x.id] = Object.assign({}, f, { html: c || sigBuild_(f).html, base: sigBuild_(f).html, custom: !!c, set: !!c || !!sigFields_(x) }); }); return o; }
const FRONTEND_LABEL = FRONTEND_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');   // a levelekben így látszik: projekttervezo.lumosmotion.hu

/** Nyersanyag feltöltve – e-mail a vágó(k)nak. a: {projectId, crewIds:[], link, text} */
function rawNotify_(u, a) {
  a = a || {};
  const sh = sheetFor_('projects'), row = findRow_(sh, str_(a.projectId, 64)); if (!row) throw new Error('A projekt nem található.');
  const p = readRow_('projects', sh, row), crew = byId_(readAll_('crew'));
  const ids = (Array.isArray(a.crewIds) ? a.crewIds : []).map(x => str_(x, 64)), to = ids.map(id => crew[id] && crew[id].email).filter(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || '')));
  if (!to.length) throw new Error('A kiválasztott vágónak nincs e-mail-címe a Stáb listában.');
  const link = /^https:\/\//i.test(String(a.link || '')) ? str_(a.link, 500) : '', text = str_(a.text, 5000), sig = signatureFor_(u);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.5">' + esc(text).replace(/\n/g, '<br>').replace(/(https:\/\/[^\s<]+)/g, '<a href="$1">$1</a>') + '</div>' + (sig ? '<br>' + sig.html : '');
  const opts = mailOptsFor_(u, html); delete opts.__actor;
  GmailApp.sendEmail(to.join(','), subj_('Nyersanyag feltöltve – ' + p.name), text + (sig ? '\n\n' + sig.text : ''), opts);
  logEvent_(u, 'Nyersanyag feltöltve', p.name, 'E-mail a vágónak: ' + to.join(', ') + (link ? ' · ' + link : ''));
  return { sentTo: to };
}
/** A kész videók linkjeinek módosítása (lezárt projektnél is): ügyvezető / termelési vezető. a: {projectId, link, links, pass} */
function setDeliveryLinks_(u, a) {
  a = a || {};
  if (u.role !== 'admin' && u.role !== 'editor') throw new Error('FORBIDDEN: ehhez nincs jogosultságod.');
  const pid = str_(a.projectId, 64), link = str_(a.link, 500);
  if (!/^https:\/\/\S+$/i.test(link)) throw new Error('A videók linkje https:// kezdetű legyen.');
  let p;
  withLock_(() => {
    const sh = sheetFor_('projects'), row = findRow_(sh, pid); if (!row) throw new Error('A projekt nem található.');
    p = readRow_('projects', sh, row);
    if (p.status === 'atadva') throw new Error('A projekt már át van adva – a videók linkje nem módosítható (ügyvezetőként a projekt felnyitásával lehet).');
    p.deliveryLink = link; if (Array.isArray(a.links)) p.deliveryLinks = JSON.stringify(parseLinks_(a.links)); if (a.pass !== undefined) p.deliveryPass = str_(a.pass, 120);
    p.updatedAt = now_(); p.updatedBy = u.name; p.mutationId = Utilities.getUuid();
    putRow_('projects', sh, p, row); dataBump_(); dbFlush_();
  });
  logEvent_(u, 'Kész videók linkje módosítva', p.name, link);
  return { project: projectView_(fullProject_(p), u) };
}
/** A vágó leadja a videókat: link + értesítés az ügyvezetőnek és/vagy a termelési vezetőnek; a projekt „Videók jóváhagyásra várnak” lesz. a: {projectId, link, note, notify:['admin','editor']} */
/** A leadási értesítő lehetséges címzettjei (ügyvezető, termelési vezető) – a vágó a leadás ablakában látja, kik kapják. */
function deliverRecipients_(u) {
  return loadUsers_().filter(x => !x.disabled && x.email && (x.role === 'admin' || x.role === 'editor')).map(x => ({ role: x.role, name: x.name || '', email: x.email }));
}
function crewDeliver_(u, a) {
  a = a || {};
  const pid = str_(a.projectId, 64), link = str_(a.link, 500);
  if (!/^https:\/\/\S+$/i.test(link)) throw new Error('A videók linkje https:// kezdetű legyen.');
  const isCutter = readAll_('crewAssign').some(r => r.projectId === pid && r.crewId === u.crewId && r.role === 'Vágó');
  if (u.role !== 'admin' && u.role !== 'editor' && !isCutter) throw new Error('Csak a projekt vágója adhatja le a videókat.');
  const notify = (Array.isArray(a.notify) ? a.notify : []).filter(x => x === 'admin' || x === 'editor');
  const pick = Array.isArray(a.emails) ? a.emails.map(x => String(x || '').trim().toLowerCase()).filter(Boolean) : null;   // a leadás ablakában kipipált címzettek
  if (pick ? !pick.length : !notify.length) throw new Error('Válaszd ki, kinek menjen értesítés.');
  let p;
  withLock_(() => {
    const sh = sheetFor_('projects'), row = findRow_(sh, pid); if (!row) throw new Error('A projekt nem található.');
    p = readRow_('projects', sh, row);
    if (p.status === 'atadva' || p.status === 'lemondva') throw new Error('A projekt már le van zárva.');
    p.deliveryLink = link; if (Array.isArray(a.links)) p.deliveryLinks = JSON.stringify(parseLinks_(a.links)); p.deliveryPass = str_(a.pass, 120); if (a.note !== undefined) p.deliveryNotes = str_(a.note, 3000);
    p.status = 'jovahagyas'; p.leadvaAt = p.leadvaAt || today_();
    const sd = String(p.stepsDone || '').split(',').filter(String); ['tervezes', 'helyszin', 'utomunka'].forEach(x => { if (sd.indexOf(x) < 0) sd.push(x); }); p.stepsDone = sd.join(',');
    p.updatedAt = now_(); p.updatedBy = u.name; p.mutationId = Utilities.getUuid();
    putRow_('projects', sh, p, row); dataBump_(); dbFlush_();
  });
  const to = []; try { loadUsers_().forEach(x => { if (x.disabled || !x.email || (x.role !== 'admin' && x.role !== 'editor')) return; const ok = pick ? pick.indexOf(String(x.email).toLowerCase()) >= 0 : notify.indexOf(x.role) >= 0; if (ok && to.indexOf(x.email) < 0) to.push(x.email); }); } catch (e) { }
  if (to.length) {
    const url = projLink_(p), note = str_(a.note, 3000);
    const first = (w => w.length > 1 ? w[w.length - 1] : String(u.name || ''))(String(u.name || '').trim().split(/\s+/));   // csak a keresztnév: Fodor Kata → Kata
    const one = a.single === true;   // egyetlen videó: egyes szám
    let text = first + ' elkészítette a(z) „' + p.name + (one ? '” videóját - jóváhagyásra vár.' : '” videóit - jóváhagyásra várnak.') + (note ? '\n\nMegjegyzés: ' + note : '') + '\n\n' + (one ? 'Videó: ' : 'Videók: ') + [link].concat(parseLinks_(p.deliveryLinks)).join('\n') + (p.deliveryPass ? '\nJelszó: ' + p.deliveryPass : '') + '\n\nProjekt: ' + url;
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const custom = sigSanitize_(String(a.html || ''), 30000);   // a vágó a leadás ablakában átírhatta a levelet
    const html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.5">' + (custom || esc(text).replace(/\n/g, '<br>').replace(/(https:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')) + '</div>';
    if (custom) text = plainText_(custom);
    const opts = mailOptsFor_(u, html); delete opts.__actor;
    try { GmailApp.sendEmail(to.join(','), subj_((a.single === true ? 'Videó' : 'Videók') + ' leadva – ' + p.name), text, opts); } catch (e) { Logger.log('Leadás e-mail hiba: ' + e); }
  }
  logEvent_(u, 'Videók leadva', p.name, link + (to.length ? ' · értesítve: ' + to.join(', ') : ''));
  return { project: projectView_(fullProject_(p), u), notified: to };
}
/** Meghívó Google-fiókos belépéshez (PIN nélkül). */
function sendInviteMail_(user, actor, editedHtml) {
  const m = inviteMailBuild_(user, actor);
  let html = m.html, text = m.text;
  if (editedHtml) { const h = payCleanHtml_(editedHtml); if (h.replace(/<[^>]*>/g, '').trim().length >= 20) { html = h; text = payHtmlText_(h); } }   // az előnézetben átírt változat
  let opts;
  if (actor && actor.email) opts = mailOptsFor_(actor, html);   // a meghívót küldő ügyvezető nevében, a saját aláírásával
  else { opts = { htmlBody: html, name: 'Lumos Motion', replyTo: MAIL_REPLY_TO }; try { if (GmailApp.getAliases().indexOf(MAIL_FROM) >= 0) opts.from = MAIL_FROM; } catch (e) {} }
  gmailSend_(user.email, m.subject, text, opts, 'invite');
}
/** A meghívó levél tartalma (a küldés és a Beállítások előnézete is ezt használja). */
function inviteMailBuild_(user, actor) {
  const url = appUrl_() || FRONTEND_URL, sig = signatureFor_(actor), first = String(user.name || '').trim().split(/\s+/).slice(-1)[0] || user.name;
  const intro = 'Hozzáférést kaptál a ' + APP_TITLE + ' alkalmazáshoz.';
  const lines = ['Kedves ' + first + ',', '', intro, '',
    'Belépés: nyisd meg a ' + FRONTEND_LABEL + ' oldalt, és kattints a „Bejelentkezés Google-fiókkal” gombra.',
    'Ezzel a Google-fiókkal lépj be: ' + user.email, '', sig ? sig.text : MAIL_SIGNATURE_TEXT];
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;color:#111111;line-height:1.5;font-size:14px"><p>Kedves ' + escapeHtml_(first) + ',</p><p>' + escapeHtml_(intro) + '</p>'
    + '<p>Belépés: nyisd meg a <a href="' + escapeHtml_(url) + '">' + escapeHtml_(FRONTEND_LABEL) + '</a> oldalt, és kattints a <b>„Bejelentkezés Google-fiókkal”</b> gombra.</p>'
    + '<p>Ezzel a Google-fiókkal lépj be: <b>' + escapeHtml_(user.email) + '</b></p><div style="margin-top:18px">' + (sig ? sig.html : '<p>' + MAIL_SIGNATURE_HTML + '</p>') + '</div></div>';
  return { subject: APP_TITLE + ' App – meghívó', text: lines.join('\n'), html: html, from: actor && actor.email ? (actor.name || '') + ' · Lumos Motion <' + actor.email + '>' : 'Lumos Motion <' + MAIL_FROM + '>' };
}

/** Gyors letiltás / engedélyezés a felhasználólistából. Letiltáskor minden eszközön azonnal kilépteti. */
function setUserDisabled_(arg, self) {
  const id = String(arg && arg.id || ''), dis = !!(arg && arg.disabled);
  return withLock_(() => {
    const users = loadUsers_();
    const u = users.find(x => x.id === id);
    if (!u) throw new Error('A felhasználó nem található.');
    if (dis && self && u.id === self.id) throw new Error('Saját magadat nem tilthatod le.');
    if (dis && u.role === 'admin' && !u.disabled && users.filter(x => x.role === 'admin' && !x.disabled).length < 2) throw new Error('Legalább egy aktív ügyvezetőnek maradnia kell.');
    u.disabled = dis;
    if (dis) revokeSessionsOf_(u.id);
    saveUsers_(users);
    return { users: users.map(adminListUser_), name: u.name };
  });
}

/** EGYSZER FUTTATANDÓ a szerkesztőből: létrehozza a munkalapokat és a SETUP_USERS felhasználókat (meghívóval). */
function setup() {
  ownerOnly_();
  Object.keys(TABLES).forEach(k => {
    const sh = sheetFor_(k);
    sh.getRange(1, 1, Math.max(2, sh.getMaxRows()), TABLES[k].cols.length).setNumberFormat('@');
  });
  logSheet_();
  ['Sheet1', 'Munkalap1', 'Munkalap 1'].forEach(n => {
    const sh = ss_().getSheetByName(n);
    if (sh && sh.getLastRow() === 0 && ss_().getSheets().length > 1) ss_().deleteSheet(sh);
  });
  SETUP_USERS.forEach(r => {
    if (String(r[0]).trim().length < 2) throw new Error('Hibás név: ' + r[0]);
    if (ROLES.indexOf(r[1]) < 0) throw new Error('Hibás szerepkör: ' + r[1] + ' (admin | editor)');
  });
  if (!SETUP_USERS.some(r => r[1] === 'admin')) throw new Error('Legalább egy ügyvezető kell.');
  withLock_(() => {
    const users = loadUsers_();
    SETUP_USERS.forEach(r => {
      const name = String(r[0]).trim(), email = String(r[2] || '').trim().toLowerCase();
      if (!email) throw new Error('A SETUP_USERS listában mindenkinek kell e-mail-cím (ezzel lép be): ' + name);
      let u = users.find(x => String(x.email || '').toLowerCase() === email);
      if (u) { Logger.log('Már létezik, kihagyva: ' + name + ' (' + r[1] + ').'); return; }
      u = newUserRecord_(name, r[1], '', email);
      users.push(u);
      saveUsers_(users);
      Logger.log('Felhasználó létrehozva: ' + name + ' (' + r[1] + ')');
      if (email) { try { sendInviteMail_(u); Logger.log('Meghívó elküldve: ' + email); } catch (e) { Logger.log('A meghívó nem ment ki: ' + e); } }
    });
  });
  Logger.log('Kész. A munkalapok: ' + Object.keys(TABLES).map(k => TABLES[k].tab).join(', ') + ', ' + LOG_TAB);
}

function cleanupSessions_(props) {
  const now = Date.now(), all = props.getProperties();
  Object.keys(all).forEach(k => {
    if (k.indexOf('LUMOS_PM_LOCK_') === 0 || k === 'PIN_LOGIN_ENABLED') { props.deleteProperty(k); return; }   // a megszűnt PIN-es belépés maradványai
    if (k.indexOf(SESSION_PREFIX) !== 0) return;
    try { const s = JSON.parse(all[k]); if (!s || s.exp < now) props.deleteProperty(k); } catch (e) { props.deleteProperty(k); }
  });
}
function revokeSessionsOf_(uid) {
  const props = PropertiesService.getScriptProperties(), all = props.getProperties();
  Object.keys(all).forEach(k => {
    if (k.indexOf(SESSION_PREFIX) !== 0) return;
    try { if (JSON.parse(all[k]).uid === uid) props.deleteProperty(k); } catch (e) {}
  });
}
/* Napló: az app megnyitása mentett belépéssel is (felhasználónként legfeljebb félóránként egy bejegyzés). */
function appOpenMark_(u) { try { CacheService.getScriptCache().put('lpm_open_' + u.id, '1', 1800); } catch (e) { } }
function logAppOpen_(u) {
  try { const c = CacheService.getScriptCache(), k = 'lpm_open_' + u.id; if (c.get(k)) return; c.put(k, '1', 1800); } catch (e) { }
  logEvent_(u, 'Belépés (app megnyitva)', '', '');
}
function createSession_(u, logAction) {
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  const exp = Date.now() + (SESSION_DAYS_BY_ROLE[u.role] || 2) * 86400000;
  const props = PropertiesService.getScriptProperties();
  cleanupSessions_(props);
  props.setProperty(SESSION_PREFIX + sha256hex_(token), JSON.stringify({ uid: u.id, exp: exp }));
  logEvent_(u, logAction, '', '');
  appOpenMark_(u);
  return { token: token, exp: exp, user: publicUser_(u) };
}

function googleClientId_() {
  return String(PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID') || GOOGLE_CLIENT_ID || '').trim();
}

/** Belépés Google-fiókkal: a Google által aláírt azonosító tokent a Google ellenőrző végpontjával hitelesítjük,
    majd az e-mail-cím alapján megkeressük a felhasználót. Céges címnél csak a Workspace-fiók (hd) fogadható el. */
function googleLogin(credential) {
  const clientId = googleClientId_();
  if (!clientId) throw new Error('A Google-belépés még nincs beállítva.');
  credential = String(credential || '');
  if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(credential) || credential.length > 4096) throw new Error('Érvénytelen Google-belépés.');
  const cache = CacheService.getScriptCache();
  if (cache.get('pm_glock')) throw new Error('Túl sok sikertelen próbálkozás. Próbáld újra 10 perc múlva.');
  const fail = msg => { const n = Number(cache.get('pm_gfail') || 0) + 1; cache.put('pm_gfail', String(n), 600); if (n >= 20) cache.put('pm_glock', '1', 600); Utilities.sleep(500); throw new Error(msg); };
  let info;
  try {
    const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential), { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) fail('A Google-belépés nem sikerült. Próbáld újra.');
    info = JSON.parse(res.getContentText());
  } catch (e) { if (String(e.message || e).indexOf('Google-belépés') >= 0) throw e; throw new Error('A Google-belépés most nem érhető el. Próbáld újra.'); }
  const iss = String(info.iss || '');
  if (info.aud !== clientId || (iss !== 'accounts.google.com' && iss !== 'https://accounts.google.com')) fail('Érvénytelen Google-belépés.');
  if (Number(info.exp || 0) * 1000 < Date.now()) fail('A Google-belépés lejárt. Próbáld újra.');
  if (String(info.email_verified) !== 'true') fail('Ez a Google-fiók nincs megerősítve.');
  const email = String(info.email || '').toLowerCase();
  if (email.slice(-(COMPANY_DOMAIN.length + 1)) === '@' + COMPANY_DOMAIN && String(info.hd || '').toLowerCase() !== COMPANY_DOMAIN)
    fail('A céges címmel csak a Lumos Motion Google Workspace-fiókkal lehet belépni.');
  const u = loadUsers_().find(x => String(x.email || '').toLowerCase() === email && !x.disabled);
  if (!u) fail('Ehhez a Google-fiókhoz (' + email + ') nincs hozzáférés az apphoz. Kérd az ügyvezetőt, hogy vegyen fel.');
  return createSession_(u, 'Belépés Google-lel');
}

function authUser_(token) {
  token = String(token || '');
  if (!/^[0-9a-f]{64}$/.test(token)) throw new Error('AUTH_REQUIRED');
  const raw = PropertiesService.getScriptProperties().getProperty(SESSION_PREFIX + sha256hex_(token));
  let s = null; try { s = raw ? JSON.parse(raw) : null; } catch (e) {}
  if (!s || s.exp < Date.now()) throw new Error('AUTH_REQUIRED');
  const u = loadUsers_().find(x => x.id === s.uid);
  if (!u || u.disabled) throw new Error('AUTH_REQUIRED');
  // Ügyvezetői előnézet: a munkamenet szerepköre átmenetileg termelési vezető vagy szakember, így a háttér pontosan
  // úgy szűr és engedélyez, mint annál a szerepkörnél. Csak ügyvezető kapcsolhatja be, és bármikor visszaállíthatja.
  if (s.viewAs && u.role === 'admin' && s.viewAs.role === 'sales' && s.viewAs.userId) {   // egy adott értékesítő szemével: az ő lehetőségei, jutaléka, kifizetései (a naplóban az ügyvezető neve marad)
    const su = loadUsers_().find(x => x.id === s.viewAs.userId && x.role === 'sales');
    if (su) return Object.assign({}, u, { id: su.id, role: 'sales', crewId: String(su.crewId || ''), realRole: 'admin', viewAs: s.viewAs });
  }
  if (s.viewAs && u.role === 'admin' && s.viewAs.role === 'sales') return Object.assign({}, u, { role: 'sales', crewId: u.crewId || ((readAll_('crew').find(c => String(c.email || '').toLowerCase() === String(u.email || '').toLowerCase() || c.name === u.name) || {}).id) || '', realRole: 'admin', viewAs: s.viewAs });
  if (s.viewAs && u.role === 'admin' && (s.viewAs.role === 'editor' || s.viewAs.role === 'crew'))
    return Object.assign({}, u, { role: s.viewAs.role, crewId: s.viewAs.role === 'crew' ? String(s.viewAs.crewId || '') : (u.crewId || ((readAll_('crew').find(c => String(c.email || '').toLowerCase() === String(u.email || '').toLowerCase() || c.name === u.name) || {}).id) || ''), realRole: 'admin', viewAs: s.viewAs });
  return u;
}

function setViewAs_(token, u, arg) {
  if (u.role !== 'admin' && u.realRole !== 'admin') throw new Error('FORBIDDEN: ehhez nincs jogosultságod.');
  const role = String(arg && arg.role || '');
  let view = null;
  if (role === 'editor') view = { role: 'editor' };
  else if (role === 'sales') {
    const uid = str_(arg && arg.userId, 64), su = uid ? loadUsers_().find(x => x.id === uid && x.role === 'sales') : null;
    if (uid && !su) throw new Error('Az értékesítő nem található.');
    view = su ? { role: 'sales', userId: su.id, crewName: su.name } : { role: 'sales' };
  }
  else if (role === 'crew') {
    const cid = str_(arg && arg.crewId, 64), c = readAll_('crew').find(x => x.id === cid);
    if (!c) throw new Error('Válaszd ki, melyik szakember szemével nézed az appot.');
    view = { role: 'crew', crewId: cid, crewName: c.name };
  } else if (role && role !== 'admin') throw new Error('Ismeretlen nézet.');
  const props = PropertiesService.getScriptProperties(), key = SESSION_PREFIX + sha256hex_(String(token));
  const sess = JSON.parse(props.getProperty(key) || 'null');
  if (!sess) throw new Error('AUTH_REQUIRED');
  if (view) sess.viewAs = view; else delete sess.viewAs;
  props.setProperty(key, JSON.stringify(sess));
  return { ok: true };
}

function saveUser_(arg, actor) {
  const a = arg && typeof arg === 'object' ? arg : {};
  const name = String(a.name || '').trim().replace(/\s+/g, ' ');
  const role = String(a.role || '');
  const crewId = String(a.crewId || '').trim().slice(0, 64);
  const email = String(a.email || '').trim().toLowerCase();
  if (name.length < 2 || name.length > 60) throw new Error('A név 2–60 karakter lehet.');
  if (ROLES.indexOf(role) < 0) throw new Error('Válassz szerepkört: Ügyvezető, Termelési vezető, Szakember vagy Értékesítő.');
  if (role === 'crew' && !crewId) throw new Error('Szakembernél válaszd ki, melyik munkatárs a stáblistában – csak az ő beosztásait fogja látni.');
  if (!email || email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Érvényes e-mail-cím szükséges: ezzel a Google-fiókkal lép be a felhasználó.');
  const comp = role === 'sales' ? salesComp_(a) : null;   // értékesítő: fix fizetés és jutalék
  let target = null, list = null, isNew = false;
  withLock_(() => {
    const users = loadUsers_();
    if (users.some(u => u.id !== a.id && String(u.email || '').toLowerCase() === email)) throw new Error('Ezzel az e-mail-címmel már van felhasználó.');
    if (role === 'admin' && users.some(u => u.id !== a.id && u.role === 'admin')) throw new Error('Csak egy ügyvezető lehet. Válassz Termelési vezető vagy Szakember szerepkört.');
    const otherEd = users.find(u => u.id !== a.id && u.role === 'editor');
    if (role === 'editor' && otherEd) throw new Error('Csak egy termelési vezető lehet (jelenleg: ' + otherEd.name + '). Előbb töröld őt, vagy állítsd Szakemberre.');
    let u = a.id ? users.find(x => x.id === a.id) : null;
    if (a.id && !u) throw new Error('A felhasználó nem található.');
    if (!u) {
      u = newUserRecord_(name, role, crewId, email);
      if (comp) Object.assign(u, comp);
      users.push(u);
    } else {
      const willDisable = a.disabled === true;
      if (u.role === 'admin' && !u.disabled && (role !== 'admin' || willDisable) && users.filter(x => x.role === 'admin' && !x.disabled).length < 2)
        throw new Error('Legalább egy aktív ügyvezetőnek maradnia kell.');
      const roleChanged = u.role !== role, emailChanged = String(u.email || '').toLowerCase() !== email;
      u.name = name; u.role = role; u.crewId = crewId; u.disabled = willDisable; u.email = email;
      if (comp) Object.assign(u, comp); else { delete u.salary; delete u.commLow; delete u.commHigh; delete u.commLimit; }
      if (willDisable || roleChanged || emailChanged) revokeSessionsOf_(u.id);
    }
    saveUsers_(users);
    target = u; isNew = !a.id;
    list = users.map(adminListUser_);
  });
  let mail = null;
  if (((isNew && a.sendInvite !== false) || (!isNew && a.resendInvite === true)) && target && target.email) {   // új kolléga, vagy újraküldés (pl. javított e-mail-cím)   // új kolléga: meghívó a Google-fiókos belépéshez
    try { sendInviteMail_(target, actor, a.inviteHtml); mail = { sent: true, to: target.email, invite: true }; }
    catch (e) { mail = { sent: false, to: target.email, error: String((e && e.message) || e), invite: true }; }
  }
  return { users: list, mail: mail };
}

/* A termelési vezető is kezelheti a hozzáféréseket, de csak a szakemberekét (ügyvezetőt, termelési vezetőt nem hozhat létre és nem módosíthat). */
function editorUserGuard_(u, newRole, targetId) {
  if (!u || u.role !== 'editor') return;
  if (newRole !== undefined && newRole !== 'crew') throw new Error('Termelési vezetőként csak szakember hozzáférését kezelheted.');
  if (targetId) { const t = loadUsers_().find(x => x.id === String(targetId)); if (t && t.role !== 'crew') throw new Error('Termelési vezetőként csak szakember hozzáférését kezelheted.'); }
}
function deleteUser_(arg, self) {
  const id = String(arg && arg.id || '');
  return withLock_(() => {
    const users = loadUsers_();
    const u = users.find(x => x.id === id);
    if (!u) return users.map(adminListUser_);
    if (u.id === self.id) throw new Error('A saját felhasználódat nem törölheted.');
    if (u.role === 'admin' && !u.disabled && users.filter(x => x.role === 'admin' && !x.disabled).length < 2)
      throw new Error('Legalább egy aktív ügyvezetőnek maradnia kell.');
    const rest = users.filter(x => x.id !== id);
    saveUsers_(rest);
    revokeSessionsOf_(id);
    return rest.map(adminListUser_);
  });
}

/* ===================== AZ EGYETLEN BELÉPÉSI PONT A KLIENSBŐL ===================== */
const READ_ONLY_RPC_ = { hubspotSources: 1, deliverRecipients: 1, dataVer: 1, dbPing: 1, geoSearch: 1, driveScan: 1, whoAmI: 1, bootstrap: 1, calendarEvents: 1, crewFinalPreview: 1, eqListPreview: 1, getLog: 1, listUsers: 1, setViewAs: 1, logout: 1, lookupTaxpayer: 1, hubspotContacts: 1, settingsData: 1, finData: 1, szPdf: 1 };   // ezek nem módosítják a projektadatokat
function rpc(token, name, arg) {
  const res = rpcInner_(token, name, arg);
  if (dbOn_()) dbFlush_();   // biztonság kedvéért: a zároláson kívüli módosítások is mentődjenek
  if (!READ_ONLY_RPC_[String(name)]) dataBump_();   // módosítás után a betöltési gyorsítótár érvénytelen
  return res;
}
function rpcInner_(token, name, arg) {
  const u = authUser_(token);
  const role = u.role;
  const deny = () => { throw new Error('FORBIDDEN: ehhez nincs jogosultságod.'); };
  const canEdit = () => { if (role !== 'admin' && role !== 'editor') deny(); };
  const adminOnly = () => { if (role !== 'admin') deny(); };
  switch (String(name)) {
    case 'whoAmI': return publicUser_(u);
    case 'dataVer': return { v: dataVer_() };   // olcsó változásfigyelés: a kliens ebből tudja, hogy frissítsen-e
    case 'setViewAs': { setViewAs_(token, u, arg); return { ok: true, boot: bootstrap_(authUser_(token)) }; }   // egy körben: nézetváltás + az új nézet adatai
    case 'logout': PropertiesService.getScriptProperties().deleteProperty(SESSION_PREFIX + sha256hex_(String(token))); return { ok: true };
    case 'bootstrap': if (arg && arg.open) logAppOpen_(u); return bootstrap_(u);
    case 'saveDeal': if (role !== 'admin' && role !== 'sales') deny(); return saveDeal_(u, arg);
    case 'deleteDeal': if (role !== 'admin' && role !== 'sales') deny(); return deleteDeal_(u, arg);
    case 'winDeal': if (role !== 'admin' && role !== 'sales') deny(); return winDeal_(u, arg);
    case 'projSalesComm': {   // a projekt értékesítői jutaléka kézzel (%); üres = az értékesítő sávos szabálya
      adminOnly(); const pid = str_(arg && arg.projectId, 64), raw = String(arg && arg.pct == null ? '' : arg.pct).replace(',', '.').trim();
      const ft = /^ft:/.test(raw) ? Math.max(0, Math.min(VALUE_MAX, Math.round(Number(raw.slice(3)) || 0))) : null;   // kézzel megadott forintösszeg (pontosan)
      if (ft == null && raw !== '' && isNaN(Number(raw))) throw new Error('Érvénytelen százalék.');
      const pct = ft != null ? 'ft:' + ft : raw === '' ? '' : Math.max(0, Math.min(100, Math.round(Number(raw) * 100) / 100));
      withLock_(() => { const sh = sheetFor_('deals'), d = readAll_('deals').find(x => x.projectId === pid && x.stage === 'nyert'); if (!d) throw new Error('A projekthez nincs értékesítő.');
        const r = findRow_(sh, d.id), q = readRow_('deals', sh, r); q.commManual = pct === '' ? '' : String(pct); if (pct !== '' && ft == null) q.commPct = pct; if (ft != null) q.commAmt = ft; q.updatedAt = now_(); q.updatedBy = u.name; putRow_('deals', sh, q, r); }); dbFlush_();
      return { deals: dealsFor_(u), salesPeople: salesPeople_(u) };
    }
    case 'projSales': {   // a projekt értékesítője (Extrák → Értékesítői jutalék)
      adminOnly(); const pid = str_(arg && arg.projectId, 64), oid = str_(arg && arg.ownerId, 64);
      const owner = oid ? salesOwnerOf_(oid) : null; if (oid && !owner) throw new Error('Az értékesítő nem található.');
      projSalesSet_(u, pid, owner, 'Projekttervező'); return { deals: dealsFor_(u), salesPeople: salesPeople_(u) };
    }
    case 'calendarEvents': canEdit(); return calendarEvents_(arg);
    case 'syncCalendar': { canEdit(); const pid = str_(arg && arg.id, 64), sh = sheetFor_('projects'), r = findRow_(sh, pid); if (!r) return { calEventId: '' }; const q = syncCalendar_(fullProject_(readRow_('projects', sh, r))); return { calEventId: q.calEventId || '', calError: q.calError || '' }; }
    case 'saveCalEvent': canEdit(); return saveCalEvent_(u, arg);
    case 'moveCalEvent': canEdit(); return moveCalEvent_(u, arg);
    case 'deleteCalEvent': canEdit(); return deleteCalEvent_(u, arg);
    case 'saveCrewOrder': canEdit(); return saveCrewOrder_(u, arg);
    case 'finalizeCrew': canEdit(); return finalizeCrew_(u, arg);
    case 'finalizeEquipment': canEdit(); return finalizeEquipment_(u, arg);
    case 'eqListPreview': canEdit(); return eqListPreview_(u, arg);
    case 'logNote': canEdit(); logEvent_(u, 'Véglegesített csapat módosítása', str_(arg && arg.subject, 200), str_(arg && arg.details, 300)); return { ok: true };
    case 'crewFinalPreview': canEdit(); return crewFinalPreview_(u, arg);
    case 'saveSignature': canEdit(); return saveSignature_(u, arg);
    case 'finData': adminOnly(); return finDataCached_();
    case 'finUpsert': adminOnly(); return finUpsert_(u, arg);
    case 'finDelete': adminOnly(); return finDelete_(u, arg);
    case 'finSettings': adminOnly(); return finSaveSettings_(u, arg);
    case 'finSetPay': adminOnly(); return finSetPay_(u, arg);
    case 'finImport': adminOnly(); return finImport_(u, arg);
    case 'szSettings': adminOnly(); return szSaveSettings_(u, arg);
    case 'szInvoice': adminOnly(); return szInvoice_(u, arg);
    case 'szLink': adminOnly(); return szLink_(u, arg);
    case 'szUnlink': adminOnly(); return szUnlink_(u, arg);
    case 'szMove': adminOnly(); return szMove_(u, arg);
    case 'szStorno': adminOnly(); return szStorno_(u, arg);
    case 'szDbkDelete': adminOnly(); return szDbkDelete_(u, arg);
    case 'szManual': adminOnly(); return szManual_(u, arg);
    case 'szLinkBatch': adminOnly(); return szLinkBatch_(u, arg);
    case 'szPeek': adminOnly(); return szPeek_(u, arg);
    case 'szSearch': adminOnly(); return szSearch_(u, arg);
    case 'szSetKind': adminOnly(); return szSetKind_(u, arg);
    case 'szSync': adminOnly(); return szSync_(u, arg);
    case 'szPdf': adminOnly(); return szPdf_(u, arg);
    case 'billSave': adminOnly(); return billSave_(u, arg);
    case 'billUpload': adminOnly(); return billUpload_(u, arg);
    case 'extraFileUpload': adminOnly(); return extraFileUpload_(u, arg);
    case 'mySignature': { const sg = signatureFor_(u); return { html: sg ? sg.html : '' }; }   // a saját e-mail aláírás előnézete (pl. az ügyfélnek küldött levél alatt)
    case 'fwSave': adminOnly(); return fwSave_(u, arg);
    case 'crewDocSave': adminOnly(); return crewDocSave_(u, arg);
    case 'crewDocGet': adminOnly(); return crewDocGet_(u, arg);
    case 'changesList': {   // az app változásnaplója – nem nyilvános, csak az ügyvezető kapja meg
      if (role !== 'admin' && u.realRole !== 'admin') deny(); const c = CacheService.getScriptCache(), hit = c.get('pm_changes');   // előnézetben (szakember/értékesítő nézet) is az ügyvezetőé if (hit) return JSON.parse(hit);
      const r = UrlFetchApp.fetch(FRONTEND_URL.replace(/\/$/, '') + '/api/changes', { muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } });
      if (r.getResponseCode() !== 200) return { items: [] };
      const out = { items: ((JSON.parse(r.getContentText()) || {}).items || []).slice(0, 40) }; try { c.put('pm_changes', JSON.stringify(out), 120); } catch (e) {} return out;
    }
    case 'crewDocsImport': adminOnly(); return crewDocsImport_(u, arg);
    case 'crewDocDelete': adminOnly(); return crewDocDelete_(u, arg);
    case 'crewDocRename': adminOnly(); return crewDocRename_(u, arg);
    case 'setMail': adminOnly(); return setMail_(u, arg);
    case 'driveScan': adminOnly(); return driveScan_(arg);
    case 'driveOps': adminOnly(); return driveOps_(u, arg);
    case 'driveMoveFolder': adminOnly(); return driveMoveFolder_(u, arg);
    case 'fwDelete': adminOnly(); return fwDelete_(u, arg);
    case 'clientDocDelete': adminOnly(); return clientDocDelete_(u, arg);
    case 'clientPreview': return clientPreview_(u, arg);
    case 'clientDocUpload': adminOnly(); return clientDocUpload_(u, arg);
    case 'clientFolder': adminOnly(); return clientFolderUrl_(arg);
    case 'geoSearch': return geoSearch_(arg);
    case 'dbPing': adminOnly(); return dbPing_();
    case 'salesSyncNow': adminOnly(); return salesSync();
    case 'dbMigrate': adminOnly(); return dbMigrate_(u);
    case 'dbSetMode': adminOnly(); return dbSetMode_(u, arg);
    case 'dbBackup': adminOnly(); return dbBackup_();
    case 'clientDocs': adminOnly(); return clientDocs_(arg);
    case 'tigCreate': adminOnly(); return tigCreate_(u, arg);
    case 'tigSave': adminOnly(); return tigSave_(u, arg);
    case 'tigSend': adminOnly(); return tigSend_(u, arg);
    case 'tigReplies': adminOnly(); return tigReplies_(u);
    case 'requestBudgetChange': canEdit(); return requestBudgetChange_(u, arg);
    case 'decideBudgetChange': adminOnly(); return decideBudgetChange_(u, arg);
    case 'saveProject': canEdit(); return projectView_(saveProject_(u, arg), u);
    case 'rawNotify': canEdit(); return rawNotify_(u, arg);
    case 'crewDeliver': return crewDeliver_(u, arg);
    case 'videoSet': return videoSet_(u, arg);
    case 'videoReview': return videoReview_(u, arg);
    case 'videoReviewBatch': return videoReviewBatch_(u, arg);
    case 'videoClient': return videoClient_(u, arg);
    case 'videoComment': return videoComment_(u, arg);
    case 'videoCommentDel': return videoCommentDel_(u, arg);
    case 'videoCmDone': return videoCmDone_(u, arg);
    case 'deliverRecipients': return deliverRecipients_(u);
    case 'setDeliveryLinks': return setDeliveryLinks_(u, arg);
    case 'deleteProject': canEdit(); return deleteProject_(u, arg);
    case 'createProjectFolder': canEdit(); return createProjectFolder_(u, arg);
    case 'lookupTaxpayer': canEdit(); return lookupTaxpayerApi_(arg);
    case 'hubspotContactLink': if (role !== 'admin' && role !== 'editor' && role !== 'sales') deny(); return hubspotContactLinkApi_(arg);
    case 'hubspotNotes': if (role !== 'admin' && role !== 'editor' && role !== 'sales') deny(); return hubspotNotesApi_(arg);
    case 'hubspotCompanies': if (role !== 'admin' && role !== 'editor' && role !== 'sales') deny(); return hubspotCompaniesApi_(arg);
    case 'hubspotSources': if (role !== 'admin' && role !== 'editor' && role !== 'sales') deny(); return hsSourceProp_();
    case 'hubspotContacts': if (role !== 'admin' && role !== 'editor' && role !== 'sales') deny(); return hubspotContactsApi_(arg);   // az értékesítő a lehetőségekhez keres kapcsolattartót
    case 'sendEquipmentList': canEdit(); return sendEquipmentList_(u, arg);
    case 'saveCrew': canEdit(); return saveCrew_(u, arg);
    case 'deleteCrew': canEdit(); return deleteCrew_(u, arg);
    case 'saveItem': canEdit(); return saveItem_(u, arg);
    case 'deleteItem': canEdit(); return deleteItem_(u, arg);
    case 'saveClient': canEdit(); return saveClient_(u, arg);
    case 'addPenalty': canEdit(); return addPenalty_(u, arg);
    case 'decidePenalty': adminOnly(); return decidePenalty_(u, arg);
    case 'deletePenalty': adminOnly(); return deletePenalty_(u, arg);
    case 'movePenaltyDay': adminOnly(); return movePenaltyDay_(u, arg);
    case 'objectPenalty': if (role !== 'crew' || !u.crewId) deny(); return objectPenalty_(u, arg);
    case 'saveOfficeRent': canEdit(); return saveOfficeRent_(u, arg);
    case 'savePayAdjust': canEdit(); return savePayAdjust_(u, arg);   // a termelési vezető is
    case 'invitePreview': canEdit(); return inviteMailBuild_({ name: str_(arg && arg.name, 60) || 'Kolléga', email: str_(arg && arg.email, 160) || '…' }, u);
    case 'payStatementPreview': adminOnly(); { const b = payStatementBuild_(u, arg); return { html: b.html, subject: b.subject, to: String(b.c.email || ''), from: (u.name || '') + ' · Lumos Motion <' + (u.email || MAIL_FROM) + '>' }; }
    case 'paySentHtml': return paySentHtml_(u, arg);
    case 'navSync': adminOnly(); { try { installNavTrigger_(); } catch (e) { } return navSync_(u, arg); }
    case 'navInvoices': adminOnly(); return navInvoices_(u, arg);
    case 'navStatus': adminOnly(); { const c = navConfig_(); return { ok: c.ok, last: PropertiesService.getScriptProperties().getProperty('NAV_LAST_SYNC') || '' }; }
    case 'setPayStatus': adminOnly(); return setPayStatus_(u, arg);
    case 'sendPayStatements': adminOnly(); return sendPayStatements_(u, arg);
    case 'deleteClient': canEdit(); return deleteClient_(u, arg);
    case 'getLog': adminOnly(); return getLog_();
    case 'projectHistory': canEdit(); return projectHistory_(u, arg);
    case 'settingsData': canEdit(); return { users: loadUsers_().filter(x => role === 'admin' || x.role === 'crew' || x.id === u.id).map(adminListUser_), sigs: role === 'admin' ? sigList_() : (o => { const r = {}; if (o[u.id]) r[u.id] = o[u.id]; return r; })(sigList_()), log: role === 'admin' ? getLog_().slice(0, 600) : [] };   // a termelési vezető a hozzáféréseket látja, a naplót nem   // egy kérésben a Beállítások fülhöz
    case 'listUsers': adminOnly(); return loadUsers_().map(adminListUser_);
    case 'saveUser': {
      canEdit(); editorUserGuard_(u, String(arg && arg.role || ''), arg && arg.id);
      const res = saveUser_(arg, u);
      const a = arg || {};
      logEvent_(u, 'Felhasználó mentve', String(a.name || ''), (a.id ? 'módosítva' : 'új') + ' · ' + (ROLE_NAMES_[a.role] || a.role) + (a.disabled === true ? ' · letiltva' : '') + (res.mail && res.mail.sent ? ' · Google-meghívó kiküldve' : ''));
      return res;
    }
    case 'setUserDisabled': {
      canEdit(); editorUserGuard_(u, undefined, arg && arg.id);
      const res = setUserDisabled_(arg, u);
      logEvent_(u, arg && arg.disabled ? 'Felhasználó letiltva' : 'Felhasználó engedélyezve', res.name, '');
      return res.users;
    }
    case 'deleteUser': {
      canEdit(); editorUserGuard_(u, undefined, arg && arg.id);
      let who = ''; try { const x = loadUsers_().find(z => z.id === String(arg && arg.id || '')); who = x ? x.name : ''; } catch (e) {}
      const res = deleteUser_(arg, u);
      logEvent_(u, 'Felhasználó törölve', who, '');
      return res;
    }
    default: throw new Error('Ismeretlen művelet.');
  }
}
/* ===================== SALES APP SZINKRON =====================
   A Sales App (sales.lumosmotion.hu) ugyanabban a Neon adatbázisban tárolja a rendeléseit (ls_sheet / „Rendelések”).
   Ötpercenként (salesSync) a végleges rendelésekből Projekttervező-ügyfél és -projekt lesz (rendelésenként egy projekt, „sales-<rendelés>” azonosítóval),
   az itt módosított közös adatok pedig visszamennek a Sales Appba. Mezőnként a később módosított érték nyer; az utolsó közös állapotot
   az lx_link tábla tárolja (enélkül nem tudnánk, melyik oldal változott). Ár, videószám, név, jegyzet, operatőr: csak a Salesből jön.
   A Sales App tábláját verzióellenőrzéssel írjuk (ha közben ott mentettek, nem írjuk felül, a következő futás pótolja). */
const SALES_TAB = 'Rendelések';
const SALES_ORDERS_PARENT = '1fOHaFkVjOJTfROWWJYfUSrkK_ojDzFH1';   // a Sales App „Vegan Summit” mappája (benne a „Rendelések” a megrendelőlap PDF-ekkel)
const SALES_SYS_USER = { id: 'sales-app', name: 'Sales App', role: 'admin', email: '' };
const SALES_MAX_NEW_PER_RUN = 12;   // egy futás 6 perces korlátja miatt (új projektnél naptárbejegyzés is készül)
// A Sales App munkalapjának fejlécei (a Sales App Code.gs FIELDS listájával egyezik – ott sem nevezhetők át)
const SALES_HEAD = { id: 'Azonosító', brand: 'Márka / stand', contact: 'Kapcsolattartó', email: 'Email', phone: 'Telefonszám', company: 'Cégnév', tax: 'Adószám',
  salesperson: 'Értékesítő', spokenCount: 'Beszédes short db', musicCount: 'Zenés short db', shootAt: 'Forgatás időpontja', note: 'Megjegyzés', status: 'Értékesítési státusz',
  event: 'Rendezvény', updatedAt: 'Módosítva', shootBy: 'Operatőr', mutationId: 'Utolsó műveletazonosító', filmingDone: 'Forgatás megtörtént', shootAt2: 'Második forgatás időpontja',
  shootContent: 'Instrukció az operatőrnek', shootContent2: 'Instrukció az operatőrnek – második forgatás', address: 'Számlázási cím',
  recordedAt: 'Rögzítve', netTotal: 'Nettó végösszeg (Ft)', vatType: 'ÁFA-besorolás', paymentMode: 'Fizetés módja', deliveryDate: 'Vállalt átadás', venue: 'Helyszín' };
// kétirányú mezők (a később módosított nyer) és csak a Salesből jövők
/* Új sales-projekt alapbeállításai (Szkript-tulajdonságokkal felülírhatók: SALES_LEAD, SALES_EDITOR, SALES_DUE_DAYS, SALES_SHOOT_HOURS) */
const SALES_DEFAULT_VENUE = 'Europa Event Center, Budapest, Hárshegyi út 5-7, 1021 Hungary';
const SALES_LEAD_NAME = 'Egri Ervin', SALES_EDITOR_NAME = 'Marosvölgyi Nóra', SALES_DUE_DAYS = 7, SALES_SHOOT_HOURS = 1;
const salesCfg_ = (k, d) => { try { const v = PropertiesService.getScriptProperties().getProperty(k); return v == null || v === '' ? d : v; } catch (e) { return d; } };
const isoAdd_ = (iso, n) => /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? new Date(Date.parse(iso + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10) : '';
const timeAdd_ = (t, h) => { const m = /^(\d{2}):(\d{2})$/.exec(t || ''); return m ? String((Number(m[1]) + h) % 24).padStart(2, '0') + ':' + m[2] : ''; };
const SYNC_TWO = ['company', 'tax', 'address', 'contact', 'phone', 'email', 'shootDate', 'shootTime', 'shootContent', 'cancelled'];
const SYNC_ONE = ['pname', 'short60', 'quote', 'notes', 'operator', 'filmingDone', 'venue'];
const SYNC_LABEL = { company: 'Cégnév', tax: 'Adószám', address: 'Cím', contact: 'Kapcsolattartó', phone: 'Telefon', email: 'E-mail', shootDate: 'Forgatás napja',
  shootTime: 'Forgatás időpontja', shootContent: 'Instrukció', cancelled: 'Lemondva', pname: 'Projekt neve', short60: 'Shortok', quote: 'Ajánlati ár', notes: 'Jegyzet', operator: 'Operatőr', filmingDone: 'Forgatás kész', venue: 'Helyszín' };

const taxDigits_ = v => String(v == null ? '' : v).replace(/\D/g, '').slice(0, 11);
const taxFmt_ = d => { d = taxDigits_(d); return d.length === 11 ? d.slice(0, 8) + '-' + d.slice(8, 9) + '-' + d.slice(9) : d; };
const sval_ = v => String(v == null ? '' : v).replace(/^'/, '').trim();
function salesSchema_() {
  neonSql_([{ query: 'CREATE TABLE IF NOT EXISTS ls_proforma (order_id text PRIMARY KEY, number text NOT NULL, at timestamptz NOT NULL DEFAULT now())' }]);
  neonSql_([{ query: 'CREATE TABLE IF NOT EXISTS lx_link (order_id text PRIMARY KEY, project_id text NOT NULL, client_id text, snap jsonb NOT NULL DEFAULT \'{}\'::jsonb, synced_at timestamptz NOT NULL DEFAULT now())' }]);
}
/** A Sales App rendelései (fejléc szerint feldolgozva) + a tábla verziója. */
function salesRead_() {
  const r = neonSql_([{ query: 'SELECT rows::text, ver::text FROM ls_sheet WHERE tab = $1', params: [SALES_TAB] }])[0];
  const row = (r.rows || [])[0];
  if (!row) return { rows: [], ver: -1, head: [], list: [] };
  const rows = JSON.parse(row[0] || '[]'), head = (rows[0] || []).map(x => String(x || '').trim()), ix = {};
  Object.keys(SALES_HEAD).forEach(k => { ix[k] = head.indexOf(SALES_HEAD[k]); });
  if (ix.id < 0) throw new Error('A Sales App táblájában nincs „Azonosító” oszlop.');
  const list = rows.slice(1).map((r, i) => { const o = { _row: i + 1 }; Object.keys(ix).forEach(k => { o[k] = ix[k] >= 0 ? (r[ix[k]] == null ? '' : r[ix[k]]) : ''; }); return o; }).filter(o => sval_(o.id));
  return { rows: rows, ver: Number(row[1] || 0), head: head, ix: ix, list: list };
}
/** Sales-rendelés → a közös mezők értéke (a Projekttervező formátumában). */
function salesValues_(o) {
  const at = sval_(o.shootAt), m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/.exec(at);
  const n = (Number(o.spokenCount) || 0) + (Number(o.musicCount) || 0);
  // A Jegyzet a vágók és operatőrök számára is látszik: csak a munkához szükséges adat kerülhet bele (nincs ár, ÁFA, fizetési mód, értékesítő, szabad szöveges kereskedelmi megjegyzés).
  const notes = ['Forrás: Sales App',
    'Shortok: ' + (Number(o.spokenCount) || 0) + ' beszédes + ' + (Number(o.musicCount) || 0) + ' zenés, 40–60 mp, 9:16' + (n > 15 ? ' (összesen ' + n + ' db)' : ''),
    sval_(o.deliveryDate) ? 'Vállalt átadás: ' + sval_(o.deliveryDate) : '',
    sval_(o.shootAt2) ? '2. forgatás: ' + sval_(o.shootAt2).replace('T', ' ') + (sval_(o.shootContent2) ? ' – ' + sval_(o.shootContent2) : '') : ''].filter(Boolean).join('\n');
  const done = o.filmingDone === true || String(o.filmingDone).toLowerCase() === 'true' || String(o.filmingDone) === '1';
  return { company: sval_(o.company) || sval_(o.brand), tax: taxDigits_(o.tax), address: sval_(o.address), contact: sval_(o.contact), phone: sval_(o.phone), email: sval_(o.email).toLowerCase(),
    shootDate: m ? m[1] : '', shootTime: m ? m[2] : '', shootContent: sval_(o.shootContent), cancelled: sval_(o.status) === 'lemondva' ? '1' : '',
    pname: (sval_(o.brand) + (sval_(o.event) ? ' – ' + sval_(o.event) : '')).slice(0, 160), short60: String(Math.min(15, n)), quote: sval_(o.netTotal) ? String(Math.round(Number(sval_(o.netTotal)) || 0)) : '',
    venue: sval_(o.venue) || SALES_DEFAULT_VENUE, notes: notes, operator: sval_(o.shootBy), filmingDone: done ? '1' : '' };
}
/** Projekttervező oldali értékek (a kétirányú mezőkhöz). */
function ptValues_(p, c) {
  return { company: sval_(c ? c.name : p.client), tax: taxDigits_(c ? c.tax : p.clientTax), address: sval_(c ? c.address : p.clientAddress), contact: sval_(p.contactName), phone: sval_(p.contactPhone),
    email: sval_(p.contactEmail).toLowerCase(), shootDate: sval_(p.date), shootTime: sval_(p.startTime), shootContent: sval_(p.techPlan), cancelled: p.status === 'lemondva' ? '1' : '' };
}
function salesLog_(rec, action, details) {
  try { neonSql_([{ query: 'INSERT INTO ls_log (at, who, role, action, brand, rec_id, details) VALUES ($1,$2,$3,$4,$5,$6,$7)', params: [now_(), 'Projekttervező', 'Szinkron', action, sval_(rec.brand), sval_(rec.id), String(details || '').slice(0, 1500)] }]); } catch (e) { Logger.log('Sales napló: ' + e); }
}

/** IDŐZÍTETT (5 percenként) és kézzel is futtatható: Sales App ↔ Projekttervező szinkron. */
function salesSync() {
  const P = PropertiesService.getScriptProperties();
  if (P.getProperty('SALES_SYNC_OFF') === '1') return { off: true };
  let S;
  try { salesSchema_(); S = salesRead_(); }
  catch (e) { if (/does not exist|nem létezik|42P01/i.test(String((e && e.message) || e))) return { waiting: 'A Sales App még nem az adatbázisban tárol (dbMoveToNeon).' }; throw e; }
  if (!S.list.length) return { orders: 0 };
  const links = {}; (neonSql_([{ query: 'SELECT order_id, project_id, coalesce(client_id, \'\'), snap::text FROM lx_link' }])[0].rows || []).forEach(r => { links[r[0]] = { projectId: r[1], clientId: r[2], snap: JSON.parse(r[3] || '{}') }; });
  dataBump_();   // friss adatból dolgozunk
  const base = loadBase_(), projById = byId_(base.projects), clients = base.clients || [], crew = base.crew || [];
  const out = { orders: S.list.length, created: 0, updated: 0, pulled: 0, cancelled: 0, errors: [] }, pulls = [];
  let newCount = 0;
  const findClient = (v, id) => (id && clients.find(c => c.id === id)) || (v.tax.length >= 8 && clients.find(c => taxDigits_(c.tax).slice(0, 8) === v.tax.slice(0, 8))) || clients.find(c => sval_(c.name).toLowerCase() === v.company.toLowerCase()) || null;
  const crewByName = nm => { const n = sval_(nm).toLowerCase(); return n ? crew.find(c => sval_(c.name).toLowerCase() === n) : null; };

  S.list.forEach(o => {
    try {
      const oid = sval_(o.id), link = links[oid], pid = (link && link.projectId) || ('sales-' + oid).slice(0, 64);
      const proj = projById[pid] || null, st = sval_(o.status);
      if (!proj && st !== 'megrendelt') return;                       // piszkozat / ajánlat: még nem projekt
      if (!proj && newCount >= SALES_MAX_NEW_PER_RUN) return;         // a többi a következő futásban
      const sv = salesValues_(o), snap = link ? link.snap : null, client = findClient(sv, link && link.clientId);
      const pv = proj ? ptValues_(proj, client) : null;
      const sUpd = sval_(o.updatedAt), pUpd = proj ? sval_([proj.updatedAt, client && client.updatedAt].sort().pop()) : '';
      const push = {}, pull = {}, notesLog = [];
      SYNC_TWO.forEach(k => {
        const s = sv[k], p = pv ? pv[k] : undefined, b = snap ? snap[k] : undefined;
        if (!proj || b === undefined) { push[k] = s; return; }
        if (s === p) return;
        if (s !== b && p === b) push[k] = s;
        else if (p !== b && s === b) pull[k] = p;
        else { if (pUpd > sUpd) { pull[k] = p; notesLog.push(SYNC_LABEL[k] + ': a Projekttervező újabb értéke maradt („' + p + '” – a Salesben „' + s + '” volt)'); }
               else { push[k] = s; notesLog.push(SYNC_LABEL[k] + ': a Sales App újabb értéke maradt („' + s + '” – itt „' + p + '” volt)'); } }
      });
      SYNC_ONE.forEach(k => { const b = snap ? snap[k] : undefined; if (!proj || b === undefined || sv[k] !== b) push[k] = sv[k]; });
      if (proj && link && !Object.keys(push).length && !Object.keys(pull).length) return;

      /* 1) Projekttervező: ügyfél + projekt */
      let clientId = client ? client.id : '';
      const cKeys = ['company', 'tax', 'address', 'contact', 'phone', 'email'].filter(k => k in push);
      if (sv.company && (!client || cKeys.some(k => k === 'company' || k === 'tax' || k === 'address'))) {
        const c0 = client ? Object.assign({}, client) : { id: Utilities.getUuid(), note: 'Forrás: Sales App' };
        if ('company' in push || !client) c0.name = push.company != null ? push.company : sv.company;
        if ('tax' in push || !client) c0.tax = taxFmt_(push.tax != null ? push.tax : sv.tax);
        if ('address' in push || !client) c0.address = push.address != null ? push.address : sv.address;
        if (!client || !c0.contactName) { c0.contactName = sv.contact; c0.contactPhone = sv.phone; c0.contactEmail = sv.email; }
        const savedC = saveClient_(SALES_SYS_USER, c0); clientId = (savedC && savedC.id) || c0.id;
        const ix = clients.findIndex(c => c.id === clientId); const merged = Object.assign({}, c0, savedC || {}, { id: clientId }); if (ix >= 0) clients[ix] = merged; else clients.push(merged);
      }
      const want = proj ? Object.assign({}, proj) : { id: pid, eventType: 'Short videó forgatás', status: 'tervezes', crew: [], equipment: [] };
      ['crewNotes', 'crewDays', 'editTasks'].forEach(k => delete want[k]);   // ezeket a mentés a régiből tartja meg
      const has = k => !proj || (k in push), v = k => k in push ? push[k] : sv[k];   // csak a változott mezőket írjuk át, a többi marad a projektben
      if (has('pname')) want.name = v('pname');
      if (has('company')) want.client = v('company');
      if (has('tax')) want.clientTax = taxFmt_(v('tax'));
      if (has('address')) want.clientAddress = v('address');
      if (has('contact')) want.contactName = v('contact');
      if (has('phone')) want.contactPhone = v('phone');
      if (has('email')) want.contactEmail = v('email');
      if (has('shootDate')) { want.date = v('shootDate'); if (want.endDate && want.endDate < want.date) want.endDate = ''; }
      if (has('shootTime')) want.startTime = v('shootTime');
      if (has('shootContent')) want.techPlan = v('shootContent');
      if (has('venue') && v('venue')) want.venue = v('venue');
      { const days = Number(salesCfg_('SALES_DUE_DAYS', SALES_DUE_DAYS)), hrs = Number(salesCfg_('SALES_SHOOT_HOURS', SALES_SHOOT_HOURS));
        if (!proj) {   // szervezői jutalék: a rendezvény szervezője a hozzá tartozó (nem sales) projekt ügyfele; rendelésenként SALES_ORG_FEE (alap 10 000 Ft)
          const evn = sval_(o.event).toLowerCase(), host = evn && (base.projects || []).find(x => !/^sales-/.test(x.id) && x.client && String(x.name || '').toLowerCase().indexOf(evn) >= 0);
          const fee = Number(salesCfg_('SALES_ORG_FEE', 10000));
          if (host && fee > 0) { const oc = clients.find(c => sval_(c.name) === sval_(host.client)); want.extras = (want.extras || []).concat([{ id: Utilities.getUuid().slice(0, 8), name: sval_(host.client), amount: fee, kind: 'org', clientId: oc ? oc.id : '' }]); }
        }
        if (!proj) { want.dueAt = isoAdd_(sv.shootDate, days); want.endTime = timeAdd_(sv.shootTime, hrs); want.hours = hrs; }   // leadási határidő: a forgatástól N nap; a várható távozás a kezdés + N óra (kézzel átírható)
        else {   // dátum/idő változásakor csak az automatikusan számolt értéket igazítjuk (a kézzel átírtat nem)
          if ('shootDate' in push && proj.dueAt && proj.dueAt === isoAdd_(snap && snap.shootDate, days)) want.dueAt = isoAdd_(sv.shootDate, days);
          if ('shootTime' in push && proj.endTime && proj.endTime === timeAdd_(snap && snap.shootTime, hrs)) want.endTime = timeAdd_(sv.shootTime, hrs); } }
      if (has('short60')) want.short60 = Number(v('short60')) || 0;
      if ('notes' in push) { const keep = proj ? String(proj.notes || '').split('\n— Projekttervező —\n')[1] : ''; want.notes = push.notes + (keep ? '\n— Projekttervező —\n' + keep : ''); }
      if ('quote' in push && push.quote !== '') want.projectValue = Number(push.quote);
      if ('operator' in push) {
        const cm = crewByName(push.operator), prevOp = snap ? crewByName(snap.operator) : null;
        let cr = (want.crew || []).filter(x => !(prevOp && x.crewId === prevOp.id && x.role === 'Operatőr'));
        if (cm && !cr.some(x => x.crewId === cm.id && x.role === 'Operatőr')) cr.push({ crewId: cm.id, role: 'Operatőr' });
        if (!proj) {   // alapbeosztás új projektnél: projektvezető + vágó (a csapat véglegesítéséig senkinek nem megy értesítés)
          const ld = crewByName(salesCfg_('SALES_LEAD', SALES_LEAD_NAME)), ed = crewByName(salesCfg_('SALES_EDITOR', SALES_EDITOR_NAME));
          if (ld) { want.lead = ld.id; if (!cr.some(x => x.crewId === ld.id && x.role === 'Projektvezető')) cr.push({ crewId: ld.id, role: 'Projektvezető' }); }
          if (ed && !cr.some(x => x.crewId === ed.id && x.role === 'Vágó')) cr.push({ crewId: ed.id, role: 'Vágó' });
        }
        want.crew = cr;
        if (push.operator && !cm) notesLog.push('Operatőr („' + push.operator + '”) nem található a Stáb listában, kézzel kell beosztani');
      }
      if ('cancelled' in push) { if (push.cancelled === '1' && want.status !== 'lemondva') { want.prevStatus = want.status; want.status = 'lemondva'; want.cancelReason = want.cancelReason || 'A Sales Appban lemondták.'; out.cancelled++; }
        else if (push.cancelled !== '1' && proj && proj.status === 'lemondva') { want.status = proj.prevStatus && proj.prevStatus !== 'lemondva' ? proj.prevStatus : 'tervezes'; } }
      if ('filmingDone' in push && push.filmingDone === '1' && ['egyeztetes', 'tervezes', 'helyszin'].indexOf(want.status) >= 0) { want.status = 'utomunka'; want.siteOk = 'igen'; want.crewFinalSkip = true; }
      const changedPT = !proj || Object.keys(push).length;
      let savedP = proj;
      if (changedPT) {
        want.mutationId = Utilities.getUuid(); want.baseUpdatedAt = proj ? proj.updatedAt : '';
        if (!proj) want.crewFinalSkip = true;
        savedP = saveProject_(SALES_SYS_USER, want);
        if (savedP && savedP.id) projById[savedP.id] = savedP;
        if (proj) out.updated++; else { out.created++; newCount++; }
      }
      /* 2) Az új közös állapot. A visszaírandó (pull) mezők a régi értéken maradnak, amíg a Sales App táblájába ténylegesen be nem kerülnek. */
      const after = Object.assign({}, sv, pull), snapNow = Object.assign({}, sv);
      Object.keys(pull).forEach(k => { snapNow[k] = snap && snap[k] !== undefined ? snap[k] : sv[k]; });
      neonSql_([{ query: 'INSERT INTO lx_link (order_id, project_id, client_id, snap, synced_at) VALUES ($1,$2,$3,$4::jsonb, now()) ON CONFLICT (order_id) DO UPDATE SET project_id = EXCLUDED.project_id, client_id = EXCLUDED.client_id, snap = EXCLUDED.snap, synced_at = now()',
        params: [oid, (savedP && savedP.id) || pid, clientId || '', JSON.stringify(snapNow)] }]);
      /* 3) Vissza a Sales Appba (a ciklus után, egy lépésben) */
      if (Object.keys(pull).length) pulls.push({ o: o, pull: pull, after: after, notes: notesLog.slice() });
      else if (notesLog.length) salesLog_(o, 'Szinkron', notesLog.join(' · '));
      if (notesLog.length) logEvent_(SALES_SYS_USER, 'Sales szinkron', want.name, notesLog.join(' · '));
    } catch (e) { out.errors.push(sval_(o.brand) + ': ' + String((e && e.message) || e)); }
  });

  /* A Salesben törölt rendelések projektje „Lemondva” lesz (nem töröljük, hogy a rögzített munka megmaradjon) */
  const ids = {}; S.list.forEach(o => { ids[sval_(o.id)] = 1; });
  Object.keys(links).forEach(oid => {
    if (ids[oid] || links[oid].snap.deleted) return;
    try { const p = projById[links[oid].projectId];
      if (p && p.status !== 'lemondva') { const w = Object.assign({}, p); ['crewNotes', 'crewDays', 'editTasks'].forEach(k => delete w[k]);
        w.prevStatus = p.status; w.status = 'lemondva'; w.cancelReason = 'A rendelést a Sales Appban törölték.'; w.mutationId = Utilities.getUuid(); w.baseUpdatedAt = p.updatedAt;
        saveProject_(SALES_SYS_USER, w); out.cancelled++; }
      neonSql_([{ query: 'UPDATE lx_link SET snap = snap || \'{"deleted":"1"}\'::jsonb, synced_at = now() WHERE order_id = $1', params: [oid] }]);
    } catch (e) { out.errors.push('törölt rendelés: ' + String((e && e.message) || e)); }
  });

  /* Visszaírás a Sales App táblájába – verzióellenőrzéssel, egy lépésben */
  if (pulls.length) {
    const fresh = salesRead_(), rows = fresh.rows, ix = fresh.ix, byId = {};
    fresh.list.forEach(x => { byId[sval_(x.id)] = x; });
    const put = (r, k, v) => { if (ix[k] >= 0) { while (rows[r].length <= ix[k]) rows[r].push(''); rows[r][ix[k]] = v; } };
    const done = [];
    pulls.forEach(x => { const cur = byId[sval_(x.o.id)]; if (!cur) return; const r = cur._row;
      if (sval_(cur.updatedAt) !== sval_(x.o.updatedAt)) return;   // közben a Salesben mentettek: a következő futás dönt
      const pl = x.pull;
      ['company', 'address', 'contact', 'phone', 'email', 'shootContent'].forEach(k => { if (k in pl) put(r, k, pl[k]); });
      if ('tax' in pl) put(r, 'tax', pl.tax);
      if ('shootDate' in pl || 'shootTime' in pl) { const sv = salesValues_(cur); put(r, 'shootAt', (('shootDate' in pl) ? pl.shootDate : sv.shootDate) + ' ' + (('shootTime' in pl) ? pl.shootTime : sv.shootTime || '00:00')); }
      if ('cancelled' in pl) put(r, 'status', pl.cancelled === '1' ? 'lemondva' : 'megrendelt');
      put(r, 'updatedAt', now_()); put(r, 'mutationId', 'pt-sync-' + Utilities.getUuid());
      done.push(x); });
    if (done.length) {
      const res = neonSql_([{ query: 'UPDATE ls_sheet SET rows = $2::jsonb, ver = ver + 1, updated_at = now() WHERE tab = $1 AND ver = $3::bigint RETURNING ver::text', params: [SALES_TAB, JSON.stringify(rows), String(fresh.ver)] }])[0];
      if ((res.rows || []).length) { out.pulled = done.length;
        neonSql_(done.map(x => ({ query: 'UPDATE lx_link SET snap = $2::jsonb, synced_at = now() WHERE order_id = $1', params: [sval_(x.o.id), JSON.stringify(x.after)] })));
        done.forEach(x => salesLog_(x.o, 'Módosítás a Projekttervezőből', Object.keys(x.pull).map(k => SYNC_LABEL[k] + ': ' + (x.pull[k] || '—')).concat(x.notes).join(' · '))); }
      else out.errors.push('A Sales App táblája közben módosult – a visszaírás a következő futásban történik.');
    }
  }
  /* A Salesben kiállított díjbekérők hozzárendelése a projekthez (Szerződés és számlázás → Díjbekérő) */
  try {
    const have = {}; readAll_('finInvoice').forEach(x => { have[x.no] = 1; });
    (neonSql_([{ query: 'SELECT order_id, number FROM ls_proforma' }])[0].rows || []).forEach(r => {
      const oid = r[0], no = r[1]; if (!no || have[no]) return;
      try { szLink_(SALES_SYS_USER, { projectId: (links[oid] && links[oid].projectId) || ('sales-' + oid).slice(0, 64), no: no, kind: 'dijbekero', slot: 'dijbekero' }); out.proformas = (out.proformas || 0) + 1; }
      catch (e) { out.errors.push('díjbekérő ' + no + ': ' + String((e && e.message) || e)); }
    });
  } catch (e) { out.errors.push('díjbekérők: ' + String((e && e.message) || e)); }
  /* Megrendelőlap: a Sales App a rendelés PDF-jét a Drive „Vegan Summit / Rendelések” mappájába menti („Lumos Motion - <Cégnév> - <dátum>.pdf”) –
     a projekt Szerződés részébe kerül (ha ott még nincs dokumentum). */
  try {
    /* Egy ügyfélnek több rendelése is lehet: a cég rendeléseit a rögzítés ideje szerint sorba állítjuk, és mindegyikhez a saját PDF-je tartozik
       (a rögzítése után, de a cég következő rendelése előtt készült legutóbbi). A Sales App által korábban rosszul hozzárendelt fájl kicserélődik. */
    const bills = readAll_('finBilling'), billOf = {}; bills.forEach(b => { billOf[b.projectId] = b; });
    const pidOf = o => (links[sval_(o.id)] && links[sval_(o.id)].projectId) || ('sales-' + sval_(o.id)).slice(0, 64);
    const ok = S.list.filter(o => projById[pidOf(o)] && sval_(o.status) !== 'piszkozat');
    const need = ok.filter(o => { const b = billOf[pidOf(o)]; return !b || !(b.contractUrl || b.contractFileId) || b.contractBy === SALES_SYS_USER.name; });
    if (need.length) {
      const it = DriveApp.getFolderById(SALES_ORDERS_PARENT).getFoldersByName('Rendelések'), files = [];
      if (it.hasNext()) { const fi = it.next().getFiles(); while (fi.hasNext()) { const f = fi.next(); if (/\.pdf$/i.test(f.getName()) && !f.isTrashed()) files.push({ f, n: f.getName(), t: f.getDateCreated().getTime() }); } }
      const nk = s => sval_(s).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
      const tOf = o => { const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(sval_(o.recordedAt)); if (!m) return 0;
        const d = new Date(m[1] + 'T' + m[2] + ':' + m[3] + ':' + (m[4] || '00') + 'Z').getTime(); const off = Number(Utilities.formatDate(new Date(d), SHEET_TZ, 'Z').replace(/^([+-])(\d\d)(\d\d)$/, (x, sg, h, mm) => (sg === '-' ? -1 : 1) * (Number(h) * 60 + Number(mm)))); return d - off * 60000; };
      const groups = {}; ok.forEach(o => { const k = nk(sval_(o.company) || sval_(o.brand)); if (k) (groups[k] = groups[k] || []).push(o); });
      const want = {};
      Object.keys(groups).forEach(k => { const os = groups[k].slice().sort((a, b) => tOf(a) - tOf(b) || String(a.id).localeCompare(String(b.id)));
        const fs = files.filter(y => y.n.toLowerCase().indexOf('lumos motion - ' + k + ' - ') === 0).sort((a, b) => a.t - b.t); if (!fs.length) return;
        os.forEach((o, i) => { const from = tOf(o) - 15 * 60000, to = i + 1 < os.length && tOf(os[i + 1]) ? tOf(os[i + 1]) - 3 * 60000 : Infinity;   /* a következő rendelés PDF-je a rögzítésével szinte egy időben készül */
          let c = fs.filter(y => (!tOf(o) || y.t >= from) && y.t < to);
          if (!c.length && os.length === 1) c = fs;
          if (c.length) want[pidOf(o)] = c[c.length - 1]; }); });
      need.forEach(o => { const pid = pidOf(o), hit = want[pid]; if (!hit) return;
        withLock_(() => { const b = billRow_(pid), r = b.r;
          if ((r.contractUrl || r.contractFileId) && r.contractBy !== SALES_SYS_USER.name) return;
          if (r.contractFileId === hit.f.getId()) return;
          Object.assign(r, { contractUrl: hit.f.getUrl(), contractName: 'Megrendelőlap – ' + hit.n, contractFileId: hit.f.getId(), contractAt: now_(), contractBy: SALES_SYS_USER.name, contractStatus: r.contractStatus && r.contractStatus !== 'nemkell' ? r.contractStatus : 'alairva', updatedAt: now_(), updatedBy: SALES_SYS_USER.name });
          putRow_('finBilling', b.sh, r, findRow_(b.sh, r.id) || null); out.orderForms = (out.orderForms || 0) + 1; }); });
      if (out.orderForms) dbFlush_();
    }
  } catch (e) { out.errors.push('megrendelőlap: ' + String((e && e.message) || e)); }
  /* Értékesítő: a Sales App rendelés „Értékesítő” mezője alapján a projekthez szerződött lehetőség tartozik (értékesítői jutalék, az értékesítő saját lehetőségei).
     Név (ékezet nélkül is), e-mail vagy felhasználó-azonosító alapján keressük; ha a Salesben az értékesítő változik, itt is átíródik. */
  try {
    const users = loadUsers_().filter(x => x.disabled !== true), nk = s => sval_(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
    const findU = nm => { const n = nk(nm); if (!n) return null;
      let c = users.filter(x => nk(x.name) === n || nk(x.email) === n || nk(x.id) === n);
      const tm = (a, b) => a === b || (a.length >= 5 && b.length >= 5 && (a.indexOf(b) === 0 || b.indexOf(a) === 0));   // „Guzsloványi” = „Guzslovány”
      if (!c.length) c = users.filter(x => { const t = nk(x.name).split(' '); return n.split(' ').every(w => t.some(z => tm(w, z))); });   // pl. csak „Flóra”, vagy eltérő írásmód
      const s = c.filter(x => x.role === 'sales'); if (s.length === 1) return s[0]; if (c.length === 1) return c[0].crewId && c[0].role !== 'sales' ? (salesOwnerOf_('crew:' + c[0].crewId) || c[0]) : c[0];   /* fiókkal rendelkező, de nem értékesítő munkatárs: projektenkénti jutalék (crew:) */
      const cr = (readAll_('crew') || []).filter(x => String(x.roles || '').indexOf('Értékesítő') >= 0 && (() => { const t = nk(x.name).split(' '); return n.split(' ').every(w => t.some(z => tm(w, z))); })());   // fiók nélküli értékesítő munkatárs
      return cr.length === 1 ? salesOwnerOf_('crew:' + cr[0].id) : null; };
    const dsh = sheetFor_('deals'), byPid = {}, projs = byId_(readAll_('projects')), miss = {}, sellerOf = {};
    readAll_('deals').forEach(d => { if (d.projectId) byPid[d.projectId] = d; });
    S.list.forEach(o => {
      const oid = sval_(o.id), pid = (links[oid] && links[oid].projectId) || ('sales-' + oid).slice(0, 64), p = projs[pid]; const spName = sval_(o.salesperson) || salesCfg_('SALES_SELLER', 'Guzsloványi Flóra'); if (!p || !spName) return;   /* a Sales App megrendeléseit alapból Flóra értékesíti (Ervin, 2026-11-09) */
      const ow = findU(spName); if (!ow) { miss[spName] = 1; return; }
      if (ow.crewId) sellerOf[pid] = { crewId: ow.crewId, name: sval_(p.name) };   /* az értékesítő a csapatban is szerepel (Értékesítő szerep) */
      /* jutalék: videónként SALES_SCOMM Ft (alapból 5 000), kedvezményes rendelésnél (3 videótól vagy egyedi kedvezmény) 10%-kal kevesebb (SALES_SCOMM_DISC=0: nincs csökkentés) */
      const units = (Number(sval_(o.spokenCount)) || 0) + (Number(sval_(o.musicCount)) || 0), rate = Number(salesCfg_('SALES_SCOMM', '5000')) || 0, unitNet = Number(salesCfg_('SALES_UNIT', '59000')) || 59000;
      const net = Number(sval_(o.netTotal)) || 0, disc = units >= (Number(salesCfg_('SALES_DISC_MIN', '3')) || 3) || (net > 0 && units > 0 && net < units * unitNet - 1);
      const autoComm = units > 0 && rate > 0 ? 'ft:' + units * Math.round(rate * (disc && salesCfg_('SALES_SCOMM_DISC', '1') !== '0' ? 90 : 100) / 100) : '';
      const ex = byPid[pid];
      const oldAuto = [10000, 9000, Math.round(rate * 0.9), rate].map(x => 'ft:' + units * x);   /* korábbi automatikus értékek (10 000 / kedvezményes) – ezeket is átírjuk */
      const isAuto = q => { const m = sval_(q.commManual); return !m || (q.commAuto && m === sval_(q.commAuto)) || oldAuto.indexOf(m) >= 0; };
      if (ex && ex.ownerId === ow.id) {
        if (autoComm && isAuto(ex) && sval_(ex.commManual) !== autoComm) {
          const q = Object.assign({}, ex, { commManual: autoComm, commAuto: autoComm, updatedAt: now_(), updatedBy: SALES_SYS_USER.name });
          withLock_(() => putRow_('deals', dsh, q, findRow_(dsh, ex.id))); byPid[pid] = q; out.deals = (out.deals || 0) + 1;
        }
        return;
      }
      const value = Math.round(Number(p.projectValue) || Number(sval_(o.netTotal)) || 0);
      const d = ex ? Object.assign({}, ex) : { id: Utilities.getUuid(), title: sval_(p.name), client: sval_(p.client), contactName: sval_(p.contactName), contactEmail: sval_(p.contactEmail), contactPhone: sval_(p.contactPhone),
        eventType: sval_(p.eventType), venue: sval_(p.venue), eventDate: sval_(p.date), value: value, stage: 'nyert', chance: 100, source: 'Sales App', nextStep: '', nextDate: '', note: '', lostReason: '',
        projectId: pid, wonAt: today_(), closedAt: today_(), createdAt: now_(), createdBy: SALES_SYS_USER.name, services: '' };
      d.ownerId = ow.id; d.ownerName = ow.name;
      if (autoComm && isAuto(d)) { d.commManual = autoComm; d.commAuto = autoComm; }
      if (ow.role === 'sales') { const c = salesCompOf_(ow), pct = value >= c.commLimit ? c.commHigh : c.commLow; d.commPct = pct; d.commAmt = Math.round(value * pct / 100); } else { d.commPct = ''; d.commAmt = ''; }
      d.updatedAt = now_(); d.updatedBy = SALES_SYS_USER.name;
      withLock_(() => { const row = ex ? findRow_(dsh, ex.id) : null; putRow_('deals', dsh, d, row || null); });
      byPid[pid] = d; out.deals = (out.deals || 0) + 1;
      logEvent_(SALES_SYS_USER, 'Értékesítés: szerződve (Sales App)', d.title, ow.name);
    });
    const ca = readAll_('crewAssign'), cmap = byId_(readAll_('crew'));
    const bad = r => sellerOf[r.projectId] && r.role === 'Értékesítő' && r.crewId !== sellerOf[r.projectId].crewId;
    const add = Object.keys(sellerOf).filter(pid => cmap[sellerOf[pid].crewId] && !ca.some(r => r.projectId === pid && r.role === 'Értékesítő' && r.crewId === sellerOf[pid].crewId))
      .map(pid => ({ projectId: pid, crewId: sellerOf[pid].crewId, role: 'Értékesítő', projectName: sellerOf[pid].name, crewName: cmap[sellerOf[pid].crewId].name }));
    if (add.length || ca.some(bad)) { withLock_(() => rewriteAssign_('crewAssign', r => !bad(r), add)); out.sellers = add.length; dataBump_(); }
    if (Object.keys(miss).length) Logger.log('Sales szinkron – nincs ilyen értékesítő felhasználó: ' + Object.keys(miss).join(', '));
  } catch (e) { out.errors.push('értékesítő: ' + String((e && e.message) || e)); }
  if (out.created || out.updated || out.cancelled || out.deals) dataBump_();
  try { if (dbOn_()) dbFlush_(); } catch (e) {}   // a függő naplóbejegyzések
  if (out.errors.length) Logger.log('Sales szinkron hibák: ' + out.errors.join(' | '));
  Logger.log('Sales szinkron: ' + JSON.stringify(out));
  return out;
}
/** EGYSZER (szerkesztőből, vagy automatikusan az első ügyvezetői belépéskor): az ötperces szinkron időzítése. */
function installSalesSync() {
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'salesSync')) ScriptApp.newTrigger('salesSync').timeBased().everyMinutes(5).create();
  return 'A Sales App szinkron 5 percenként fut.';
}
function salesSyncEnsure_() {
  const P = PropertiesService.getScriptProperties();
  if (P.getProperty('SALES_SYNC_INSTALLED')) return;
  try { installSalesSync(); P.setProperty('SALES_SYNC_INSTALLED', now_()); } catch (e) { Logger.log('Sales szinkron időzítő: ' + e); }
}
