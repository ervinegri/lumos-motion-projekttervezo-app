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
const EVENT_TYPES = ['Konferencia', 'Webinárium', 'Csoportos találkozó', 'Céges rendezvény', 'Gála, díjátadó', 'Kiállítás, expo', 'Termékbemutató', 'Sportesemény', 'Koncert', 'Short videó forgatás', 'Podcast', 'Egyéb'];
const CREW_ROLES = ['Projektvezető', 'Értékesítő', 'Operatőr', 'Vágó', 'Fotós', 'Drónpilóta', 'Hangtechnikus', 'Fénytechnikus', 'Vizuáltechnikus', 'Képkeverő / streaming', 'Sofőr / rakodó', 'Ajánlói jutalék'];
const CREW_TYPES = ['Belsős', 'Állandó külsős', 'Alkalmi freelancer'];
const CREW_SKILLS = ['Statív', 'Gimbal', 'Előadásvágás', 'Kreatív vágás', 'Werk', 'Saját kamera', 'Eszközbérlés'];
const INV_CATS = ['Kamera', 'Objektív', 'Hang', 'Fény', 'Drón', 'Képkeverés / stream', 'GoPro / akciókamera', 'Gimbal / állvány', 'Akku / powerbank / táp', 'Adathordozó', 'Laptop / tablet / telefon', 'Kocsi / szállítás', 'Kábel', 'Egyéb'];
const CONDITIONS = ['ok', 'javitas', 'szerviz', 'selejt'];
const COUNTS = { aftermovie: 3, interju: 8, short60: 15, short30: 15, short15: 15, er_clips: 20, er_subs: 10, er_summary: 10, er_total_n: 10, er_close_n: 10, er_creative_n: 10, er_post_n: 10, x_foto_n: 10 };
const FLAGS = ['x_vago', 'x_dron', 'x_timelapse', 'x_pov', 'x_foto', 'x_nyersVetel', 'x_nyersTarolas', 'x_rush', 't_eloadas', 't_kepkeveres', 't_hang', 't_feny', 't_vizual',
  'er_total', 'er_close', 'er_crowd', 'er_slides', 'er_drone', 'er_stream', 'er_post', 'er_zoom', 'er_creative'];
const REC_LABELS = { er_total: 'Teljes alakos kamera', er_close: 'Közeli kamera', er_creative: 'Kreatív kamera', er_zoom: 'Közeli (vágói belenagyítással)', er_crowd: 'Közönség kamera', er_slides: 'Diák rögzítése / kivetítése', er_stream: 'Élő kivetítés LED falra vagy projektorra', t_kepkeveres: 'Streaming', er_post: 'Termek előadásainak utómunkája' };

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
    ['short60', 'Short 40–60 mp (db)'], ['foto_db', 'Fotók (db)'], ['er_zoom', 'ER: közeli vágói belenagyítással'], ['dueAt', 'Átadási határidő (egyedi)'], ['fees', 'Termelői díjak (JSON)'], ['budgetMode', 'Termelői keret módja'], ['budgetVal', 'Termelői keret (% vagy Ft)'], ['crewNotes', 'Személyes jegyzetek (JSON)'], ['rentals', 'Bérelt eszközök (JSON)'], ['deliveryNotes', 'Átadási észrevételek'], ['siteOk', 'Helyszíni munka rendben'], ['siteReport', 'Helyszíni beszámoló'], ['clientTax', 'Ügyfél adószáma'], ['clientAddress', 'Ügyfél székhelye'], ['t_vizual', 'Vizuáltechnika'], ['penalties', 'Díjcsökkentések (JSON)'], ['er_summary', 'ER: összefoglaló videó (db)'], ['stepsDone', 'Kipipált lépések'], ['dueKept', 'Átadási határidő tartva'], ['crewDays', 'Munkanapok (JSON)'], ['endTime', 'Távozás (kb.)'], ['er_total_n', 'ER: teljes alakos kamerák (db)'], ['er_close_n', 'ER: közeli kamerák (db)'], ['er_creative', 'ER: kreatív kamera'], ['er_creative_n', 'ER: kreatív kamerák (db)'], ['budgetRequest', 'Termelői keret jóváhagyása (JSON)'], ['er_post_n', 'ER: utómunkás termek (db)'], ['x_foto_n', 'Fotósok a helyszínen (db)'], ['crewFinal', 'Csapat véglegesítve (JSON)'], ['leadvaAt', 'Videók leadva (dátum)'], ['payStatus', 'Fizetési állapot'], ['lastStartTime', 'Utolsó nap: érkezés'], ['lastEndTime', 'Utolsó nap: távozás (kb.)'], ['cancelReason', 'Lemondás oka'], ['leadRemote', 'Projektvezető távolról'], ['extras', 'Extra szolgáltatások (JSON, nettó)']] },
  crew: { tab: 'Stáb', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['name', 'Név'], ['roles', 'Szerepek'], ['type', 'Jogviszony'], ['phone', 'Telefon'],
    ['email', 'E-mail'], ['dayRate', 'Napidíj (nettó Ft)'], ['note', 'Megjegyzés'], ['createdAt', 'Létrehozva'], ['updatedAt', 'Módosítva'],
    ['priority', 'Prioritás (1–3)'], ['company', 'Vállalkozás'], ['skills', 'Részletek']] },
  inventory: { tab: 'Leltár', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['name', 'Megnevezés'], ['category', 'Kategória'], ['qty', 'Darab'], ['condition', 'Állapot'],
    ['serial', 'Azonosító / sorozatszám'], ['value', 'Beszerzési érték / db (Ft)'], ['note', 'Megjegyzés'], ['createdAt', 'Létrehozva'], ['updatedAt', 'Módosítva'],
    ['location', 'Tárolási hely']] },
  clients: { tab: 'Ügyfelek', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['name', 'Cégnév'], ['tax', 'Adószám'], ['address', 'Székhely'], ['contactName', 'Kapcsolattartó'],
    ['contactPhone', 'Telefon'], ['contactEmail', 'E-mail'], ['note', 'Megjegyzés'], ['createdAt', 'Létrehozva'], ['updatedAt', 'Módosítva'], ['rep', 'Cég képviselője (aláíró)'], ['repPhone', 'Képviselő telefonszáma'], ['repEmail', 'Képviselő e-mail-címe'], ['contactTitle', 'Kapcsolattartó titulusa'], ['repTitle', 'Képviselő titulusa']] },
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
    ['paidAt', 'Kifizetés dátuma'], ['payMethod', 'Fizetési mód'], ['createdAt', 'Rögzítve'], ['createdBy', 'Rögzítette'], ['checkedAt', 'Utoljára ellenőrizve'], ['note', 'Megjegyzés'], ['items', 'Tételek (JSON)'], ['ref', 'Kapcsolódó bizonylat'], ['projectIds', 'További projektek (közös számla)'], ['tigId', 'TIG azonosító'], ['manual', 'Kézi rögzítés (1)'], ['issuer', 'Kiállító (kft / ev)'], ['fileUrl', 'Bizonylat fájl (link)']] },
  finTig: { tab: 'Teljesítésigazolások', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['client', 'Ügyfél'], ['month', 'Hónap'], ['issuer', 'Szolgáltató'], ['projectIds', 'Projektek'], ['rows', 'Tételek (JSON)'], ['total', 'Összesen (nettó Ft)'],
    ['url', 'PDF (link)'], ['fileName', 'Fájlnév'], ['status', 'Állapot (kikuldve / jovahagyva / szamlazva)'], ['approvedAt', 'Jóváhagyva'], ['invoiceNo', 'Számlaszám'], ['createdAt', 'Rögzítve'], ['createdBy', 'Rögzítette'], ['clientAddress', 'Megrendelő címe'], ['clientTax', 'Megrendelő adószáma']] },
  finBilling: { tab: 'Szerződések', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['projectId', 'Projekt azonosító'], ['contractStatus', 'Szerződés állapota'], ['contractUrl', 'Szerződés (link)'], ['contractName', 'Szerződés fájlneve'],
    ['contractFileId', 'Drive-fájl azonosító'], ['contractAt', 'Feltöltve'], ['contractBy', 'Feltöltötte'], ['mode', 'Konstrukció (eloleg / egyben)'], ['advancePct', 'Foglaló (%)'],
    ['poNumber', 'Megrendelésszám / PO'], ['note', 'Megjegyzés'], ['updatedAt', 'Módosítva'], ['updatedBy', 'Módosította'], ['signedAt', 'Aláírás dátuma'],
    ['ceoPct', 'Értékesítés % (egyedi)'], ['rezsiPct', 'Eszköz, rezsi % (egyedi)'], ['noFinal', 'Végszámla nem kell (1)'], ['tigMode', 'TIG (kell / nemkell / üres = ügyfél szerint)']] },
  finFramework: { tab: 'Keretszerződések', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['client', 'Ügyfél'], ['url', 'Szerződés (link)'], ['fileName', 'Fájlnév'], ['fileId', 'Drive-fájl azonosító'],
    ['signedAt', 'Aláírás dátuma'], ['validTo', 'Érvényes eddig'], ['note', 'Megjegyzés'], ['createdAt', 'Rögzítve'], ['createdBy', 'Rögzítette'], ['mode', 'Típus (üres = keretszerződés, nemkell = nem igényel)']] },
  officeRent: { tab: 'Irodabérlet', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['crewId', 'Munkatárs azonosító'], ['crewName', 'Munkatárs'], ['month', 'Hónap'], ['amount', 'Irodabérleti díj (nettó Ft)'], ['updatedAt', 'Módosítva'], ['updatedBy', 'Módosította']] },
  crewAssign: { tab: 'Stábbeosztás', assign: true, cols: [
    ['projectId', 'Projekt azonosító'], ['crewId', 'Munkatárs azonosító'], ['role', 'Szerep'], ['projectName', 'Projekt'], ['crewName', 'Munkatárs']] },
  eqAssign: { tab: 'Eszközbeosztás', assign: true, cols: [
    ['projectId', 'Projekt azonosító'], ['itemId', 'Eszköz azonosító'], ['qty', 'Darab'], ['projectName', 'Projekt'], ['itemName', 'Eszköz'],
    ['crewId', 'Felelős azonosító'], ['crewName', 'Felelős (kinél van)']] }
};
const NUM_FIELDS = new Set(['budgetVal', 'er_rooms', 'er_clips', 'er_subs', 'er_summary', 'er_total_n', 'er_close_n', 'er_creative_n', 'er_post_n', 'x_foto_n', 'priority', 'hours', 'aftermovie', 'interju', 'short60', 'short30', 'short15', 'foto_db', 'quotePrice', 'dayRate', 'qty', 'value', 'amount', 'prod', 'profit', 'ceo', 'rezsi', 'marketing', 'invNet', 'invGross', 'invPaid', 'advancePct']);
const BOOL_FIELDS = new Set(FLAGS.concat(['legacy', 'leadRemote']));
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
function dbGetLog_() { const r = neonSql_([{ query: 'SELECT at, who, role, action, subject, details FROM lpm_log ORDER BY id DESC LIMIT 300' }])[0]; return (r.rows || []).map(x => ({ at: x[0], who: x[1], role: x[2], action: x[3], subject: x[4], details: x[5] })); }

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

function bootstrap_(u) {
  const base = loadBase_();
  const projects = base.projects, crew = base.crew, inventory = base.inventory;
  const out = {
    me: publicUser_(u), projects: projects.map(p => projectView_(p, u)), crew: crew, inventory: inventory, clients: u.role === 'crew' ? [] : (base.clients || []),
    officeRent: u.role === 'crew' ? [] : readAll_('officeRent'),
    links: { folder: 'https://drive.google.com/drive/folders/' + PROJECTS_FOLDER_ID, sheet: 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/edit' },
    crewOrder: crewOrder_(),
    mailOn: mailOn_(), mailCats: u.role === 'admin' ? mailCats_() : undefined, mailCc: u.role === 'admin' ? mailCc_() : undefined,
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
    // a szakember csak a saját projektjein szereplő munkatársakat és eszközöket kapja meg (Stáb és Leltár fület nem lát)
    const onIds = {}, itemIds = {};
    out.projects.forEach(p => { if (p.lead) onIds[p.lead] = 1; p.crew.forEach(a => { onIds[a.crewId] = 1; }); p.equipment.forEach(e => { itemIds[e.itemId] = 1; }); });
    out.crew = crew.filter(c => onIds[c.id]).map(c => ({ id: c.id, name: c.name, phone: c.phone, roles: c.roles }));
    out.inventory = inventory.filter(i => itemIds[i.id]).map(i => ({ id: i.id, name: i.name, category: i.category, serial: i.serial, location: i.location, qty: i.qty, condition: i.condition }));
    delete out.links.sheet;
  }
  return out;
}

/* ===================== PÉNZÜGYEK (szerepkör szerint szűrve) =====================
   Projekt értéke (nettó, ÁFA nélkül): csak az ügyvezető látja és állítja (a táblában az „Ajánlati ár (nettó Ft)” oszlop).
   Termelői díjak (alvállalkozói díjak, eszközbérlés, egyéb): az ügyvezető és a termelési vezető látja és szerkeszti.
   A szakemberek egyiket sem kapják meg semmilyen válaszban. */
const FEE_MAX = 99999999, VALUE_MAX = 9999999999;
/** Van-e átadandó anyag (a felület needsDelivery függvényének megfelelője). */
function needsDelivery_(p) {
  if (p.dueAt) return true;
  if (['aftermovie', 'interju', 'short60', 'short30', 'short15', 'er_clips', 'er_subs', 'er_summary', 'foto_db'].some(k => Number(p[k]) > 0)) return true;
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
    amount: int_(x && x.amount, 0, FEE_MAX, 0), rent: int_(x && x.rent, 0, FEE_MAX, 0),
    dayAmounts: x && x.dayAmounts && typeof x.dayAmounts === 'object' ? Object.keys(x.dayAmounts).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).slice(0, 31).reduce((o, k) => { o[k] = int_(x.dayAmounts[k], 0, FEE_MAX, 0); return o; }, {}) : undefined
  })).filter(x => x.crewId || x.name || x.task || x.gear || x.amount || x.rent);
}
function parseCrewDays_(raw) {   // több napos projekt: ki melyik napokon dolgozik ({ crewId: [nap, …] })
  let o = raw; if (typeof raw === 'string') { try { o = raw ? JSON.parse(raw) : {}; } catch (e) { o = {}; } }
  const out = {}; if (!o || typeof o !== 'object') return out;
  Object.keys(o).slice(0, 60).forEach(k => { if (Array.isArray(o[k])) out[str_(k, 64)] = o[k].map(d => str_(d, 10)).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(0, 31); });
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
  q.rentals = parseRentals_(q.rentals).map(r => role === 'crew' ? { id: r.id, crewId: r.crewId, name: r.name, company: r.company, own: r.own } : r);
  if (role === 'admin') { const v = Number(q.quotePrice); q.projectValue = q.quotePrice === '' || q.quotePrice == null || !isFinite(v) ? null : v; q.extras = parseExtras_(q.extras); } else delete q.extras;
  delete q.quotePrice;
  if (role === 'admin' || role === 'editor') q.fees = parseFees_(q.fees);
  else { const mine = role === 'crew' && u.crewId ? parseFees_(q.fees).find(f => f.crewId === u.crewId) : null; if (mine && mine.amount) q.myFee = { amount: mine.amount, dayAmounts: mine.dayAmounts }; delete q.fees; }   // a szakember csak a saját díját látja
  // díjcsökkentések: vezetők mindet, a szakember csak a saját, jóváhagyott tételeit látja
  const pens = parsePen_(q.penalties);
  q.penalties = role === 'crew' ? pens.filter(x => x.crewId === u.crewId && x.status === 'approved') : (role === 'admin' || role === 'editor' ? pens : []);
  // termelői keret: az ügyvezető a beállítást (% vagy Ft) látja, a termelési vezető csak a kiszámolt forintösszeget
  const mode = q.budgetMode === 'pct' ? 'pct' : q.budgetMode === 'ft' ? 'ft' : '', bv = Number(q.budgetVal);
  const val = Number(p.quotePrice);
  const budgetFt = !mode || q.budgetVal === '' || q.budgetVal == null || !isFinite(bv) ? null
    : mode === 'pct' ? (isFinite(val) && val > 0 ? Math.round(val * bv / 100) : null) : Math.round(bv);
  if (role === 'admin') { q.budgetMode = mode; q.budgetVal = mode && isFinite(bv) && q.budgetVal !== '' ? bv : null; q.budgetFt = budgetFt; }
  else { delete q.budgetMode; delete q.budgetVal; if (role === 'editor') q.budgetFt = budgetFt; }
  if (role === 'admin' || role === 'editor') q.crewFinal = parseCrewFinal_(q.crewFinal); else delete q.crewFinal;
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
  return { at: str_(x.at, 30), by: str_(x.by, 120), ids: x.ids.map(i => str_(i, 64)).filter(Boolean), notified: Array.isArray(x.notified) ? x.notified.map(n => str_(n, 120)) : [], sigs: sigs };
}
/* Egy tag „lenyomata”: szerepek, eszközök, bérelt/saját eszközök, napok. Ha változik, újra értesítjük.
   Ugyanez a számítás fut a felületen is (core.js: crewSig), hogy a „módosult” jelzés egyezzen. */
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
  (p.crew || []).forEach(c => { if (crewMap[c.crewId]) (roles[c.crewId] = roles[c.crewId] || []).push(c.role); });
  const days = parseCrewDays_(p.crewDays);
  return Object.keys(roles).map(id => ({ id: id, name: crewMap[id].name, phone: crewMap[id].phone || '', email: String(crewMap[id].email || '').trim().toLowerCase(), roles: roles[id], days: days[id] || [] }));
}
/* ===== E-mail kapcsoló: amíg nincs bekapcsolva (Beállítások → E-mail értesítések), az app SEMMILYEN e-mailt nem küld:
   sem a szakembereknek, sem az ügyfeleknek (számlázz.hu), sem naptár-meghívót. Alapértelmezés: kikapcsolva. */
const MAIL_ON_PROPERTY = 'LUMOS_PM_MAIL_ON';
/* E-mail értesítések: főkapcsoló + típusonként külön kapcsoló (alapból mind be, ha a főkapcsoló be van kapcsolva) */
const MAIL_CATS_PROPERTY = 'LUMOS_PM_MAIL_CATS';
const MAIL_CATS_ = ['assign', 'calendar', 'eqlist', 'penalty', 'penAdmin', 'invoice', 'invite'];
function mailCats_() { let o = {}; try { o = JSON.parse(PropertiesService.getScriptProperties().getProperty(MAIL_CATS_PROPERTY) || '{}') || {}; } catch (e) { o = {}; } const out = {}; MAIL_CATS_.forEach(k => { out[k] = o[k] !== false; }); return out; }
const MAIL_CC_PROPERTY = 'LUMOS_PM_MAIL_CC';
const MAIL_CC_DEFAULT_ = { assign: [], eqlist: ['actor'], penalty: [], penAdmin: [] };   // másolat (CC): admin = ügyvezetők, editor = termelési vezetők, actor = aki a műveletet végzi
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
  GmailApp.sendEmail(to, subject, text, opts); return true;
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
    const cur = Calendar.Events.get(CALENDAR_ID, eid);
    const keep = (cur.attendees || []).filter(x => !allCrewEmails[String(x.email || '').toLowerCase()] || want[String(x.email || '').toLowerCase()]);
    const have = {}; keep.forEach(x => { have[String(x.email || '').toLowerCase()] = 1; });
    emails.forEach(m => { if (!have[m]) keep.push({ email: m }); });
    Calendar.Events.patch({ attendees: keep }, CALENDAR_ID, eid, { sendUpdates: mailOn_('calendar') ? 'all' : 'none' });   // kikapcsolt e-mailnél a Google sem értesít
    return mailOn_('calendar');
  }
  if (!mailOn_('calendar')) return false;   // speciális szolgáltatás nélkül a vendégek felvétele értesítést küldhet – kikapcsolt e-mailnél kihagyjuk
  const have = {}; ev.getGuestList().forEach(g => { have[String(g.getEmail()).toLowerCase()] = 1; });
  Object.keys(want).forEach(m => { if (!have[m]) ev.addGuest(m); });
  Object.keys(have).forEach(m => { if (allCrewEmails[m] && !want[m]) ev.removeGuest(m); });
  return false;
}
function calEventLink_(ev) {   // a naptárbejegyzés megnyitása a Google Naptárban
  const eid = String(ev.getId()).replace(/@google\.com$/, '');
  try { if (typeof Calendar !== 'undefined' && Calendar.Events) { const x = Calendar.Events.get(CALENDAR_ID, eid); if (x && x.htmlLink) return x.htmlLink; } } catch (e) {}
  return 'https://calendar.google.com/calendar/event?eid=' + Utilities.base64EncodeWebSafe(eid + ' ' + CALENDAR_ID).replace(/=+$/, '');
}
function crewFinalMail_(u, p, m, lead, link, changed) {
  const range = fmtHuDate_(p.date) + (p.endDate && p.endDate > p.date ? ' – ' + fmtHuDate_(p.endDate) : '');
  const rows = [['Projekt', p.name], ['Időpont', range + (m.days.length ? ' (a te napjaid: ' + m.days.map(fmtHuDate_).join(', ') + ')' : '')],
    ['Érkezés', p.startTime || ''], ['Távozás (kb.)', p.endTime || ''], ['Helyszín', p.venue || ''], ['Szereped', m.roles.join(', ')],
    ['Projektvezető', lead ? lead.name + (lead.phone ? ' · ' + lead.phone : '') : '']].filter(r => r[1]);
  const intro = changed ? 'Módosult a beosztásod ezen a projekten:' : 'Véglegesítettük a csapatot, és beosztottunk erre a projektre:';
  const text = ['Szia ' + String(m.name).split(/\s+/).pop() + '!', '', intro, '']
    .concat(rows.map(r => r[0] + ': ' + r[1])).concat(['', 'Részletek a naptárbejegyzésben: ' + link, '', MAIL_SIGNATURE_TEXT]).join('\n');
  const html = '<p>Szia ' + escapeHtml_(String(m.name).split(/\s+/).pop()) + '!</p><p>' + escapeHtml_(intro) + '</p><table cellpadding="4" style="border-collapse:collapse">'
    + rows.map(r => '<tr><td style="color:#555">' + escapeHtml_(r[0]) + '</td><td><b>' + escapeHtml_(r[1]) + '</b></td></tr>').join('') + '</table>'
    + '<p><a href="' + link + '">Részletek a naptárbejegyzésben</a></p><p>' + MAIL_SIGNATURE_HTML + '</p>';
  return gmailSend_(m.email, (changed ? 'Módosult beosztás: ' : 'Beosztás: ') + p.name + ' – ' + range, text, mailOptsFor_(u, html), 'assign');
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
  const ev = calEvent_(p.calEventId); if (!ev) throw new Error('A naptárbejegyzést nem sikerült létrehozni. Próbáld újra.');
  const allCrewEmails = {}; readAll_('crew').forEach(c => { const e = String(c.email || '').trim().toLowerCase(); if (e) allCrewEmails[e] = 1; });
  const valid = members.filter(m => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email));
  const calNotified = calGuestsSet_(ev, valid.map(m => m.email), allCrewEmails);
  const lead = members.find(m => m.id === p.lead) || null;
  // újraélesítés: csak az új tagok kapnak értesítést, és azok a régiek, akiknek a szerepe, eszközei vagy napjai változtak
  const prev = parseCrewFinal_(p.crewFinal), sigs = {}; members.forEach(m => { sigs[m.id] = crewSig_(p, m.id); });
  const isNewM = m => !prev || prev.ids.indexOf(m.id) < 0, isChanged = m => !isNewM(m) && prev.sigs && prev.sigs[m.id] !== undefined && prev.sigs[m.id] !== sigs[m.id];
  const toNotify = valid.filter(m => isNewM(m) || isChanged(m));
  const link = calEventLink_(ev);
  const sent = [], failed = [], changedNames = [];
  toNotify.forEach(m => { const ch = isChanged(m); try { if (crewFinalMail_(u, p, m, lead, link, ch)) { sent.push(m.name); if (ch) changedNames.push(m.name); } } catch (e) { failed.push(m.name); } });
  const saved = withLock_(() => {
    const r2 = findRow_(sh, pid), q = readRow_('projects', sh, r2);
    q.crewFinal = JSON.stringify({ at: now_(), by: u.name, ids: members.map(m => m.id).sort(), notified: sent, sigs: sigs });
    if (p.calEventId && !q.calEventId) q.calEventId = p.calEventId;
    putRow_('projects', sh, q, r2); dbFlush_();
    return q;
  });
  logEvent_(u, 'Csapat véglegesítve', p.name, members.length + ' fő · e-mail: ' + sent.length + (failed.length ? ' · sikertelen: ' + failed.length : ''));
  return { project: projectView_(fullProject_(saved), u), sent: sent, changed: changedNames, failed: failed, noEmail: members.filter(m => valid.indexOf(m) < 0).map(m => m.name), calendarNotified: calNotified, link: link, mailPaused: !mailOn_() };
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
    carries: s.carries && typeof s.carries === 'object' ? s.carries : {} };   // a régi táblázat havi áthozatai (hónap → [rezsi, marketing]) – a régi hónapokban ezek a hitelesek
}
function finSaveSettings_(u, a) {
  const cur = finSettings_(), next = Object.assign({}, cur);
  ['profitPct', 'ceoPct', 'marketingPct'].forEach(k => { if (a && a[k] !== undefined) { const n = Number(a[k]); if (!isFinite(n) || n < 0 || n > 100) throw new Error('A százalék 0 és 100 között legyen.'); next[k] = n; } });
  if (next.profitPct + next.ceoPct + next.marketingPct > 100) throw new Error('A százalékok összege nem lehet több 100-nál.');
  ['openMonth', 'appFromMonth'].forEach(k => { if (a && a[k] !== undefined) { if (a[k] && !/^\d{4}-\d{2}$/.test(String(a[k]))) throw new Error('Hibás hónap.'); next[k] = String(a[k] || ''); } });
  ['openRezsi', 'openMarketing'].forEach(k => { if (a && a[k] !== undefined) { const n = Math.round(Number(a[k])); if (!isFinite(n)) throw new Error('Hibás összeg.'); next[k] = n; } });
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
  if (p.budgetMode === 'pct' && Number(p.quotePrice) > 0) return Math.round(Number(p.quotePrice) * Number(p.budgetVal) / 100);
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
  return (Array.isArray(l) ? l : []).slice(0, 30).map(x => ({ id: str_(x && x.id, 40) || Utilities.getUuid().slice(0, 8), name: str_(x && x.name, 200), amount: int_(x && x.amount, 0, VALUE_MAX, 0) })).filter(x => x.name || x.amount); }
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
    cancelReason: str_(a.cancelReason, 1000), leadRemote: !!a.leadRemote,
    hours: (function () { const s = /^(\d{2}):(\d{2})$/.exec(str_(a.startTime, 5)), e = /^(\d{2}):(\d{2})$/.exec(str_(a.endTime, 5));   // távozási óra → munkaórák
      if (s && e) { let m = (+e[1] * 60 + +e[2]) - (+s[1] * 60 + +s[2]); if (m <= 0) m += 1440; return Math.min(16, Math.max(1, Math.round(m / 60))); } return int_(a.hours, 1, 16, 8); })(),
    status: STATUSES.indexOf(a.status) >= 0 ? a.status : 'egyeztetes',
    prevStatus: STATUSES.indexOf(a.prevStatus) >= 0 ? a.prevStatus : '',
    lead: str_(a.lead, 64),
    quotePrice: null,   // a projekt értékét csak az ügyvezető állíthatja (lent), máskor a régi marad
    leadvaAt: /^\d{4}-\d{2}-\d{2}$/.test(String(a.leadvaAt || '')) ? String(a.leadvaAt) : '',
    contactName: str_(a.contactName, 120), contactPhone: str_(a.contactPhone, 40), contactEmail: str_(a.contactEmail, 160).toLowerCase(), clientTax: str_(a.clientTax, 20).replace(/[^\d-]/g, ''), clientAddress: str_(a.clientAddress, 300),
    techPlan: str_(a.techPlan, 5000), notes: str_(a.notes, 5000), deliveryLink: str_(a.deliveryLink, 500), deliveryNotes: str_(a.deliveryNotes, 3000), dueKept: a.dueKept === 'igen' || a.dueKept === 'nem' ? a.dueKept : '', stepsDone: (Array.isArray(a.stepsDone) ? a.stepsDone : String(a.stepsDone || '').split(',')).filter(x => ['egyeztetes', 'tervezes', 'helyszin', 'utomunka'].indexOf(x) >= 0).join(','), siteOk: a.siteOk === 'igen' || a.siteOk === 'nem' ? a.siteOk : '', siteReport: str_(a.siteReport, 3000), deliveredAt: iso_(a.deliveredAt), dueAt: iso_(a.dueAt)
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
      p.quotePrice = old.quotePrice; p.extras = old.extras; p.fees = old.fees; p.budgetMode = old.budgetMode; p.budgetVal = old.budgetVal; p.crewNotes = old.crewNotes; p.rentals = old.rentals; p.penalties = old.penalties; p.budgetRequest = old.budgetRequest; p.crewFinal = old.crewFinal; p.payStatus = old.payStatus;
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
    if (a.crewNotes !== undefined) p.crewNotes = JSON.stringify(parseNotes_(a.crewNotes));
    if (a.crewDays !== undefined) p.crewDays = JSON.stringify(parseCrewDays_(a.crewDays));
    if (p.crewDays == null) p.crewDays = old ? old.crewDays : '';
    if (p.crewNotes == null) p.crewNotes = '';
    if (Array.isArray(a.rentals)) p.rentals = JSON.stringify(parseRentals_(a.rentals));
    if (p.rentals == null) p.rentals = '';
    if (p.budgetMode == null) p.budgetMode = '';
    if (p.budgetVal == null) p.budgetVal = '';
    if (p.quotePrice == null) p.quotePrice = '';
    if (p.fees == null) p.fees = '';
    if (p.budgetRequest == null) p.budgetRequest = '';
    if (p.crewFinal == null) p.crewFinal = '';
    if (p.payStatus == null) p.payStatus = '';
    if (['helyszin', 'utomunka', 'leadva', 'jovahagyas', 'atadva'].indexOf(p.status) >= 0 && (!old || ['', 'egyeztetes', 'tervezes'].indexOf(old.status || '') >= 0) && !parseCrewFinal_(p.crewFinal))
      throw new Error('A helyszíni munkára lépés előtt véglegesítsd a csapatot (Stáb → „Csapat véglegesítése”).');
    if (p.penalties == null) p.penalties = '';   // díjcsökkentést csak a külön műveletek módosítanak
    if (p.status === 'atadva' && (!old || old.status !== 'atadva') && needsDelivery_(p) && !p.deliveryLink)
      throw new Error('Átadás előtt add meg az átadási linket (mappa vagy videók).');
    if (['helyszin', 'utomunka', 'leadva', 'jovahagyas', 'atadva'].indexOf(p.status) >= 0 && (!old || old.status !== p.status) && !p.siteOk)
      throw new Error('Előbb jelöld be, hogy rendben ment-e a helyszíni munka.');
    if (p.status === 'atadva' && (!old || old.status !== 'atadva') && needsDelivery_(p) && !String(p.deliveryNotes || '').trim())
      throw new Error('Átadás előtt írd be az észrevételeket.');
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
    logArgs = [old ? 'Projekt módosítva' : 'Projekt létrehozva', p.name, old ? diffProject_(old, p) : (p.date ? 'Dátum: ' + p.date : '')];   // naplózás a zár után (adatbázis-módban a mentéssel együtt megy)
    if (dbOn_()) { logEvent_(u, logArgs[0], logArgs[1], logArgs[2]); logArgs = null; }
    const out = Object.assign({}, p, { crew: crew, equipment: equipment });
    delete out.mutationId;
    return out;
  });
  if (logArgs) logEvent_(u, logArgs[0], logArgs[1], logArgs[2]);
  if (a.deferCal === true || saved.duplicateOf) return saved;   // az új felület külön kérésben frissíti a naptárat, így a mentés gyors
  return syncCalendar_(saved);   // a naptár frissítése a zár után (lassú lehet); hiba esetén a mentés akkor is megmarad
}

function diffProject_(a, b) {
  const labels = {};
  TABLES.projects.cols.forEach(c => { labels[c[0]] = c[1]; });
  const skip = { createdAt: 1, updatedAt: 1, updatedBy: 1, mutationId: 1, folderId: 1, prevStatus: 1 };
  const changed = [];
  Object.keys(labels).forEach(k => {
    if (skip[k]) return;
    const x = a[k] == null ? '' : String(a[k]), y = b[k] == null ? '' : String(b[k]);
    if (x !== y) changed.push(k === 'status' ? 'Állapot: ' + (STATUS_LABELS[a.status] || a.status) + ' → ' + (STATUS_LABELS[b.status] || b.status) : labels[k]);
  });
  return changed.length ? changed.join(', ') : 'Beosztás módosítva';
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
function cal_() { const c = CalendarApp.getCalendarById(CALENDAR_ID); if (!c) throw new Error('A Google Naptár nem érhető el.'); return c; }
function calEvent_(id) { if (!id) return null; try { return cal_().getEventById(id); } catch (e) { return null; } }
function calDelete_(id) { try { const ev = calEvent_(id); if (ev) ev.deleteEvent(); } catch (e) { Logger.log('Naptár törlés hiba: ' + e); } }
function calDate_(iso, hhmm) { const d = Utilities.parseDate(iso + ' ' + (hhmm || '00:00'), SHEET_TZ, 'yyyy-MM-dd HH:mm'); return d; }
function calPlan_(p) {
  const crewMap = byId_(readAll_('crew')), invMap = byId_(readAll_('inventory'));
  const roles = {};
  if (p.lead && crewMap[p.lead]) roles[p.lead] = ['Projektvezető'];
  (p.crew || []).forEach(c => { if (crewMap[c.crewId]) (roles[c.crewId] = roles[c.crewId] || []).push(c.role); });
  const crewLines = Object.keys(roles).map(cid => '• ' + crewMap[cid].name + ' – ' + roles[cid].join(', ') + (crewMap[cid].phone ? ' – ' + crewMap[cid].phone : ''));
  const eqLines = (p.equipment || []).filter(e => invMap[e.itemId]).map(e => '☐ ' + e.qty + '× ' + invMap[e.itemId].name + (e.crewId && crewMap[e.crewId] ? ' – ' + crewMap[e.crewId].name : ''));
  const lines = [];
  if (p.status) lines.push('Állapot: ' + (STATUS_LABELS[p.status] || p.status));
  const rec = Object.keys(REC_LABELS).filter(k => p[k] === true).map(k => REC_LABELS[k] + (Number(p[k + '_n']) > 1 ? ' ×' + p[k + '_n'] : ''));
  if (Number(p.er_clips) > 0) rec.push(p.er_clips + ' kivágás');
  if (Number(p.er_subs) > 0) rec.push(p.er_subs + ' feliratozás');
  if (Number(p.er_summary) > 0) rec.push(p.er_summary + ' rövid összefoglaló videó');
  if (Number(p.foto_db) > 0) lines.push('Fotózás: ' + p.foto_db + ' db fotó');
  if (rec.length) lines.push('Előadásrögzítés és kivetítés: ' + rec.join(', ') + (Number(p.er_rooms) > 1 ? ' · ' + p.er_rooms + ' terem' : '') + (p.er_post ? ' · ' + (p.er_res === '4k' ? '4K' : 'Full HD') : ''));
  if (p.client) lines.push('Ügyfél: ' + p.client);
  if (p.startTime) lines.push('Érkezés: ' + p.startTime + (p.endTime ? ' · távozás kb. ' + p.endTime : p.hours ? ' · ' + p.hours + ' óra' : ''));
  if (p.endDate && p.endDate > p.date && p.lastStartTime) lines.push('Utolsó nap (' + p.endDate + '): érkezés ' + p.lastStartTime + (p.lastEndTime ? ' · távozás kb. ' + p.lastEndTime : ''));
  if (p.lead && crewMap[p.lead]) lines.push('Kapcsolattartó (projektvezető): ' + [crewMap[p.lead].name, crewMap[p.lead].phone].filter(Boolean).join(', '));   // a naptár vendégei a stábtagok: az ügyfél kapcsolattartója nem kerül ide
  if (crewLines.length) lines.push('', 'STÁB', crewLines.join('\n'));
  if (eqLines.length) lines.push('', 'ESZKÖZÖK', eqLines.join('\n'));
  if (p.techPlan) lines.push('', 'TERV', String(p.techPlan).slice(0, 1500));
  if (p.notes) lines.push('', 'JEGYZETEK', String(p.notes).slice(0, 1000));
  lines.push('', 'Az appban: ' + FRONTEND_URL + '/#p=' + p.id, '(Ezt az eseményt a Projekttervező frissíti – a módosításokat az appban végezd.)');
  const guests = Object.keys(roles).map(cid => String(crewMap[cid].email || '').toLowerCase()).filter(m => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m));
  const crewEmails = Object.keys(crewMap).map(k => String(crewMap[k].email || '').toLowerCase()).filter(Boolean);
  return { description: lines.join('\n'), guests: guests, crewEmails: crewEmails };
}
/** Projekt → naptáresemény (létrehozás, frissítés, törlés). Visszaadja a projektet a friss calEventId-vel. */
function syncCalendar_(p) {
  try {
    const hasDate = /^\d{4}-\d{2}-\d{2}$/.test(String(p.date || ''));
    let ev = calEvent_(p.calEventId);
    if (!hasDate) { if (ev) { ev.deleteEvent(); setCalId_(p.id, ''); p.calEventId = ''; } return p; }
    const title = (p.status === 'lemondva' ? 'STORNO – ' : '') + p.name;
    const multi = p.endDate && p.endDate > p.date;
    const plan = calPlan_(p);
    const lastDay = Utilities.parseDate((multi ? p.endDate : p.date) + ' 12:00', SHEET_TZ, 'yyyy-MM-dd HH:mm');
    const dayAfter = new Date(lastDay.getTime() + 86400000);
    const start = p.startTime && !multi ? calDate_(p.date, p.startTime) : calDate_(p.date);
    const end = p.startTime && !multi ? new Date(start.getTime() + (Number(p.hours) || 8) * 3600000) : calDate_(Utilities.formatDate(dayAfter, SHEET_TZ, 'yyyy-MM-dd'));
    const allDay = !(p.startTime && !multi);
    if (!ev) {
      ev = allDay ? cal_().createAllDayEvent(title, start, end, { description: plan.description, location: p.venue || '' })
                  : cal_().createEvent(title, start, end, { description: plan.description, location: p.venue || '' });
      ev.setTag('lumosProjectId', p.id);
      setCalId_(p.id, ev.getId()); p.calEventId = ev.getId();
    } else {
      if (ev.getTitle() !== title) ev.setTitle(title);
      if (ev.getDescription() !== plan.description) ev.setDescription(plan.description);
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
  const cache = CacheService.getScriptCache(), key = 'pm_cal_' + (cache.get('pm_cal_ver') || '0') + '_' + from + '_' + to, hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  const fmt = (d, f) => Utilities.formatDate(d, SHEET_TZ, f);
  const out = cal_().getEvents(start, end).map(ev => {
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
  const ev = calEvent_(str_(a && a.id, 200));
  if (!ev) return { deleted: false };
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
const HS_PROPS_ = ['firstname', 'lastname', 'email', 'phone', 'mobilephone', 'company', 'jobtitle'];
function hsContact_(c) {
  const p = c.properties || {};
  return { id: c.id, name: [p.lastname, p.firstname].filter(Boolean).join(' ').trim() || p.email || '', email: p.email || '',
    phone: p.mobilephone || p.phone || '', company: p.company || '', title: p.jobtitle || '' };
}
function hubspotContactsApi_(arg) {
  const q = str_(arg && arg.q, 100).trim(), client = str_(arg && arg.client, 160).trim();
  const out = [], seen = {};
  const add = list => list.forEach(c => { const x = hsContact_(c); if (!seen[x.id] && (x.name || x.email)) { seen[x.id] = 1; out.push(x); } });
  if (q.length >= 2) {
    add((hubspot_('post', '/crm/v3/objects/contacts/search', { query: q, properties: HS_PROPS_, limit: 15 }).results) || []);
  } else if (client.length >= 2) {   // nincs keresőszó: az ügyfél cégéhez kapcsolt kapcsolattartók
    const co = (hubspot_('post', '/crm/v3/objects/companies/search', { query: client, properties: ['name'], limit: 3 }).results) || [];
    co.forEach(c => {
      const as = (hubspot_('get', '/crm/v4/objects/companies/' + c.id + '/associations/contacts?limit=50').results) || [];
      const ids = as.map(a => String(a.toObjectId)).slice(0, 50);
      if (ids.length) add((hubspot_('post', '/crm/v3/objects/contacts/batch/read', { properties: HS_PROPS_, inputs: ids.map(id => ({ id: id })) }).results) || []);
    });
  }
  return out.slice(0, 30);
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
    eInvoice: s.eInvoice !== false, sendEmail: s.sendEmail !== false, comment: str_(s.comment, 500), lastSync: str_(s.lastSync, 30) };
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
  if (a.eInvoice !== undefined) s.eInvoice = !!a.eInvoice;
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
  let doc; try { doc = XmlService.parse(r.body).getRootElement(); } catch (e) { throw new Error('A számlázz.hu válasza nem értelmezhető: ' + r.body.slice(0, 200)); }
  if (xmlText_(doc, 'sikeres') === 'false' || xmlText_(doc, 'hibakod')) throw new Error('számlázz.hu: ' + (xmlText_(doc, 'hibauzenet') || xmlText_(doc, 'hibakod')));
  const alap = xmlFindAll_(doc, 'alap')[0] || doc, vevo = xmlFindAll_(doc, 'vevo')[0], tot = xmlFindAll_(doc, 'totalossz')[0];
  const nr = v => { const n = Number(String(v || '').replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? Math.round(n) : 0; };
  let paid = 0, paidAt = '';
  xmlFindAll_(doc, 'kifizetes').forEach(k => { paid += nr(xmlText_(k, 'osszeg')); const d = xmlText_(k, 'datum'); if (d > paidAt) paidAt = d; });
  const out = { no: xmlText_(alap, 'szamlaszam') || no, tipus: xmlText_(alap, 'tipus'), date: xmlText_(alap, 'kelt').slice(0, 10), due: xmlText_(alap, 'fizh').slice(0, 10),
    payMethod: xmlText_(alap, 'fizmod'), buyer: vevo ? xmlText_(vevo, 'nev') : '', invNet: tot ? nr(xmlText_(tot, 'netto')) : 0, invGross: tot ? nr(xmlText_(tot, 'brutto')) : 0,
    invPaid: paid, paidAt: paidAt, fromDijbekero: xmlText_(alap, 'hivdijbekszam') };
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
  const eInvoice = a.eInvoice === undefined ? set.eInvoice : !!a.eInvoice, sendEmail = mailOn_('invoice') && !!buyer.email && (a.sendEmail === undefined ? set.sendEmail : !!a.sendEmail);   // kikapcsolt e-mailnél a számlázz.hu sem küldi ki
  const taxDigits = buyer.tax.replace(/\D/g, '');
  const xml = szXmlHead_('xmlszamla', 'agent')
    + '<beallitasok>' + szEl_('szamlaagentkulcs', key) + szEl_('eszamla', eInvoice ? 'true' : 'false') + szEl_('szamlaLetoltes', 'false') + szEl_('valaszVerzio', '2') + '</beallitasok>'
    + '<fejlec>' + szEl_('keltDatum', today) + szEl_('teljesitesDatum', fulfill) + szEl_('fizetesiHataridoDatum', due) + szEl_('fizmod', payMethod) + szEl_('penznem', 'Ft')
    + szEl_('szamlaNyelve', 'hu') + szEl_('megjegyzes', str_(a.comment, 1000)) + szEl_('arfolyamBank', '') + szEl_('arfolyam', '0') + szEl_('rendelesSzam', tg.projectId || tg.incomeId)
    + (dijbekeroNo ? szEl_('dijbekeroSzamlaszam', dijbekeroNo) : '') + szEl_('elolegszamla', kind === 'eloleg' ? 'true' : 'false') + szEl_('vegszamla', kind === 'vegszamla' ? 'true' : 'false')
    + (elolegNo ? szEl_('elolegSzamlaszam', elolegNo) : '') + szEl_('dijbekero', kind === 'dijbekero' ? 'true' : 'false') + (a.paid ? szEl_('fizetve', 'true') : '') + '</fejlec>'
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
  const row = { id: Utilities.getUuid(), no: no, kind: kind, projectId: tg.projectId, incomeId: tg.incomeId, buyer: buyer.name, date: today, due: due,
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
  const row = { id: Utilities.getUuid(), no: q.no, kind: kind, projectId: tg.projectId, incomeId: tg.incomeId, buyer: q.buyer, date: q.date, due: q.due,
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
      if (!r.manual) throw new Error('Ez a számla a számlázz.hu-ból frissül.');
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
  const todo = all.filter(x => !x.manual && (ids ? ids.indexOf(x.id) >= 0 : (Number(x.invPaid) || 0) < (Number(x.invGross) || 0) - 1))
    .sort((x, y) => String(x.checkedAt).localeCompare(String(y.checkedAt))).slice(0, 25);
  const changed = [], errors = [], created = [];
  todo.forEach(x => {
    if (Date.now() - started > 22000) return;
    try { let q;
      try { q = szQuery_(x.no, false); }
      catch (e0) {   // a kifizetett díjbekérőt a számlázz.hu automatikus számlázáskor törli – ilyenkor a rendelésszám alapján a foglalószámlát kapjuk
        if (x.kind !== 'dijbekero') throw e0;
        const o = szQuery_('', false, x.projectId || x.incomeId);
        if (o.fromDijbekero !== x.no) throw e0;
        szAddAdvance_(all, x, o, created);
        q = { invPaid: Number(x.invGross) || o.invGross, paidAt: o.paidAt || o.date, invGross: x.invGross, invNet: x.invNet, due: x.due };
      }
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
  if (changed.length) logEvent_(u, 'Számlázás', '', 'Kifizetés frissítve: ' + changed.map(x => x.no).join(', '));
  return Object.assign(finData_(), { synced: { checked: todo.length, changed: changed.map(x => ({ no: x.no, buyer: x.buyer, paid: x.invPaid, gross: x.invGross })), errors: errors } });
}
/** Díjbekérőből (automatikusan) készült foglalószámla felvétele, ha még nincs nálunk. */
function szAddAdvance_(all, db, q, out) {
  if (!q || !q.no || all.some(x => x.no === q.no) || out.some(x => x.no === q.no)) return;
  const r = { id: Utilities.getUuid(), no: q.no, kind: 'eloleg', projectId: db.projectId, incomeId: db.incomeId, buyer: q.buyer || db.buyer, date: q.date, due: q.due, invNet: q.invNet, invGross: q.invGross,
    invPaid: q.invPaid || q.invGross, paidAt: q.paidAt || q.date, payMethod: q.payMethod, createdAt: now_(), createdBy: 'számlázz.hu', checkedAt: now_(), note: 'A díjbekérő kifizetése után automatikusan', items: '', ref: db.no, projectIds: db.projectIds || '' };
  out.push(r); all.push(r);
}
function szPdf_(u, a) {
  const r = readAll_('finInvoice').find(x => x.id === str_(a && a.id, 64));
  if (!r) throw new Error('A számla nem található.');
  const q = szQuery_(r.no, true);
  if (!q.pdf) throw new Error('A számlázz.hu nem adta vissza a PDF-et.');
  return { name: r.no.replace(/[^\w.-]+/g, '_') + '.pdf', b64: q.pdf };
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
function clientDocs_(a) {
  const cache = CacheService.getScriptCache(), key = 'clientDocs_v2';
  if (!(a && a.force)) { const c = cache.get(key) || bigGet_('CLIENT_DOCS'); if (c) { try { return JSON.parse(c); } catch (e) { } } }
  const root = lumosRoot_(); if (!root) return { folders: [] };
  const base = findFolder_(root, '02 Ügyfelek'); if (!base) return { folders: [] };
  const fmt = d => d ? Utilities.formatDate(d, SHEET_TZ, 'yyyy-MM-dd') : '';
  const walk = (f, kind, out, depth) => {
    const fi = f.getFiles(); while (fi.hasNext()) { const x = fi.next(); out.push({ name: x.getName(), url: x.getUrl(), kind: kind, date: (/^(\d{4}-\d{2}-\d{2})/.exec(x.getName()) || [])[1] || fmt(x.getDateCreated()) }); }
    const di = f.getFolders(); while (di.hasNext()) { const d = di.next(), n = d.getName();
      if (/^_munka/i.test(n)) continue;
      if (/^\d{4}$/.test(n) && depth < 3) walk(d, kind, out, depth + 1);
      else out.push({ name: n, url: d.getUrl(), kind: kind, folder: true, date: (/^(\d{4}-\d{2}-\d{2})/.exec(n) || [])[1] || fmt(d.getDateCreated()) }); }
  };
  const out = [], it = base.getFolders();
  while (it.hasNext()) { const f = it.next(), docs = [];
    const sub = f.getFolders(); while (sub.hasNext()) { const d = sub.next(), n = d.getName(); if (/^Szerződések$/i.test(n)) walk(d, 'sz', docs, 0); else if (/^Keretszerződés/i.test(n)) walk(d, 'keret', docs, 0); }
    docs.sort((x, y) => String(y.date).localeCompare(String(x.date)));
    out.push({ name: f.getName(), url: f.getUrl(), docs: docs }); }
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
  const name = uniqueName_(folder, shortName_(client) + '_TIG_' + month + '_' + iss.code + '.pdf');
  const f = folder.createFile(pdf.setName(name));
  try { CacheService.getScriptCache().remove('clientDocs_v2'); } catch (e) { }
  const rec = { id: Utilities.getUuid(), client: client, month: month, issuer: a.issuer === 'ev' ? 'ev' : 'kft', projectIds: rows.map(r => r.pid).filter(String).filter((x, i, l) => l.indexOf(x) === i).join(','),
    rows: JSON.stringify(rows), total: total, url: f.getUrl(), fileName: name, status: 'kiallitva', approvedAt: '', invoiceNo: '', createdAt: now_(), createdBy: u.name, clientAddress: cSeat, clientTax: cTax };
  withLock_(() => { putRow_('finTig', sheetFor_('finTig'), rec, 0); dataBump_(); dbFlush_(); });
  logEvent_(u, 'Teljesítésigazolás', client, mLabel + ' · ' + rows.length + ' tétel · ' + total + ' Ft');
  return Object.assign(finPart_(['tigs']), { url: f.getUrl(), name: name, total: total, tig: rec });
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
    type: CREW_TYPES.indexOf(a.type) >= 0 ? a.type : 'Belsős',
    phone: str_(a.phone, 40), email: str_(a.email, 160).toLowerCase(),
    dayRate: (a.dayRate === '' || a.dayRate == null) ? null : int_(a.dayRate, 0, 1e8, null), note: str_(a.note, 500),
    priority: (a.priority === '' || a.priority == null) ? null : int_(a.priority, 1, 3, null), company: str_(a.company, 120),
    skills: (Array.isArray(a.skills) ? a.skills : []).filter(s => CREW_SKILLS.indexOf(s) >= 0)
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

function deleteCrew_(u, a) {
  const id = str_(a && a.id, 64);
  return withLock_(() => {
    const sh = sheetFor_('crew'), row = findRow_(sh, id);
    if (!row) return { deleted: false, id: id };
    const old = readRow_('crew', sh, row);
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
    serial: str_(a.serial, 200), location: str_(a.location, 120), value: (a.value === '' || a.value == null) ? null : int_(a.value, 0, 1e9, null), note: str_(a.note, 500)
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
    status: ['pending', 'approved', 'rejected'].indexOf(x.status) >= 0 ? x.status : 'pending', by: str_(x.by, 120), at: str_(x.at, 30),
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
    const k = PEN_KINDS_[x.kind], amt = penAmount_(p, x), url = FRONTEND_URL + '/#p=' + p.id;
    const lines = ['Kedves ' + c.name + '!', '', 'A(z) „' + p.name + '” projekten (' + (fmtHuDate_(p.date) || p.date || '') + ') a megbízási szerződés minőségi mellékletének ' + k.ref + ' pontja alapján díjcsökkentés történt.', '',
      'Kategória: ' + k.label + (x.kind === 'damage' ? '' : ' (' + x.pct + '%' + (x.day ? ', a ' + (fmtHuDate_(x.day) || x.day) + ' napi díjból' : '') + ')'), x.kind === 'damage' ? 'Kártérítés összege: ' + amt.toLocaleString('hu-HU') + ' Ft' : 'Levont összeg: ' + amt.toLocaleString('hu-HU') + ' Ft',
      x.caseText ? 'Eset: ' + x.caseText : '', '', 'Indoklás:', x.reason, x.link ? '\nBizonyíték: ' + x.link : '', '',
      'Ha nem értesz egyet, a projekt oldalán a „Kifogásolom” gombbal írásban jelezheted: ' + url, '', 'Üdvözlettel:', 'Lumos Motion'].filter((l, i, a) => l !== '' || a[i - 1] !== '');
    const html = lines.map(l => escapeHtml_(l)).join('<br>');
    return gmailSend_(c.email, 'Díjcsökkentés – ' + p.name, lines.join('\n'), mailOptsFor_(u, html), 'penalty');
  } catch (e) { Logger.log('Díjcsökkentés e-mail hiba: ' + e); return false; }
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
    status: u.role === 'admin' ? 'approved' : 'pending', by: u.name, at: now_(), decidedBy: u.role === 'admin' ? u.name : '', decidedAt: u.role === 'admin' ? now_() : '', decisionNote: '', objection: null };
  const r = penMutate_(a.projectId, (list, p) => {
    const on = p.lead === x.crewId || readAll_('crewAssign').some(c => c.projectId === p.id && c.crewId === x.crewId);
    if (!on) throw new Error('Ez a munkatárs nincs beosztva erre a projektre.');
    list.push(x);
  });
  const crewName = (readAll_('crew').find(c => c.id === x.crewId) || {}).name || '';
  logEvent_(u, 'Díjcsökkentés ' + (x.status === 'approved' ? 'kiróva' : 'javasolva'), r.p.name, crewName + ' · ' + k.label + (pct ? ' ' + pct + '%' : ' ' + amount + ' Ft'));
  let mailed = false;
  if (x.status === 'approved') mailed = penMailCrew_(u, r.p, x);
  else penMailAdmins_(u, 'Jóváhagyásra vár: díjcsökkentés – ' + r.p.name, u.name + ' díjcsökkentést javasolt.\n\nProjekt: ' + r.p.name + '\nSzakember: ' + crewName + '\nKategória: ' + k.label + (pct ? ' (' + pct + '%)' : ' (' + amount + ' Ft)') + '\nIndoklás: ' + reason + '\n\nJóváhagyás az appban: ' + FRONTEND_URL + '/#p=' + r.p.id);
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
  penMailAdmins_(u, 'Kifogás: díjcsökkentés – ' + r.p.name, u.name + ' kifogást nyújtott be.\n\nProjekt: ' + r.p.name + '\nKategória: ' + PEN_KINDS_[x.kind].label + '\n\nKifogás:\n' + text + '\n\nMegnyitás: ' + FRONTEND_URL + '/#p=' + r.p.id);
  return { penalties: r.list.filter(i => i.crewId === u.crewId && i.status === 'approved') };
}

/* ===================== ÜGYFELEK ===================== */
/** Ügyfél felvétele/módosítása. Ha a cégnév megváltozik, a projektek „Ügyfél” mezője is átíródik. */
/* Irodabérlet: szakembertől bérelt iroda havi díja – a Kifizetéseknél a díjához adódik.
   Egy sor = egy szakember egy hónapja; a következő hónapokra a legutóbbi érték érvényes, amíg nem írják át (0 = megszűnt). */
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
    contactName: str_(a.contactName, 120), contactPhone: str_(a.contactPhone, 40), contactEmail: str_(a.contactEmail, 160).toLowerCase(), note: str_(a.note, 1000), rep: str_(a.rep, 120), repPhone: str_(a.repPhone, 40), repEmail: str_(a.repEmail, 160).toLowerCase(), contactTitle: str_(a.contactTitle, 120), repTitle: str_(a.repTitle, 120) };
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
    if (row) { old = readRow_('clients', sh, row); c.createdAt = old.createdAt; } else c.createdAt = now_();
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
  // eszközök kategóriánként
  const byCat = {};
  p.equipment.forEach(x => { const it = invMap[x.itemId]; if (!it) return; (byCat[it.category] = byCat[it.category] || []).push({ it: it, qty: x.qty, who: x.crewId && crewMap[x.crewId] ? crewMap[x.crewId].name : '' }); });
  let eqHtml = '', eqTxt = '';
  INV_CATS.concat(Object.keys(byCat).filter(c => INV_CATS.indexOf(c) < 0)).forEach(cat => {
    const items = byCat[cat]; if (!items) return;
    eqHtml += '<tr><td colspan="2" style="padding:12px 0 4px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5f7381">' + e(cat) + '</td></tr>';
    eqTxt += '\n' + cat.toUpperCase() + '\n';
    items.forEach(x => {
      eqHtml += '<tr><td style="padding:5px 0;border-top:1px solid #e3e9ee;width:28px;font-size:16px">☐</td><td style="padding:5px 0;border-top:1px solid #e3e9ee"><b>' + x.qty + '×</b> ' + e(x.it.name) + (x.it.serial ? ' <span style="color:#5f7381">(' + e(x.it.serial) + ')</span>' : '') + (x.who ? ' <span style="color:#1f5a3d;font-weight:600">– ' + e(x.who) + '</span>' : '') + (x.it.location ? '<br><span style="font-size:12px;color:#5f7381">Hol van: ' + e(x.it.location) + '</span>' : '') + '</td></tr>';
      eqTxt += '☐ ' + x.qty + '× ' + x.it.name + (x.it.serial ? ' (' + x.it.serial + ')' : '') + (x.who ? ' – ' + x.who : '') + '\n';
    });
  });
  const rentals = parseRentals_(p.rentals);
  [['Saját eszközök', rentals.filter(r => r.own)], ['Bérelt eszközök', rentals.filter(r => !r.own)]].forEach(([title, list]) => { if (!list.length) return;
    eqHtml += '<tr><td colspan="2" style="padding:12px 0 4px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5f7381">' + title + '</td></tr>';
    eqTxt += '\n' + title.toUpperCase() + '\n';
    list.forEach(r => { const who = r.crewId && crewMap[r.crewId] ? crewMap[r.crewId].name : '';
      eqHtml += '<tr><td style="padding:5px 0;border-top:1px solid #e3e9ee;width:28px;font-size:16px">☐</td><td style="padding:5px 0;border-top:1px solid #e3e9ee">' + e(r.name) + (r.company ? ' <span style="color:#5f7381">(' + e(r.company) + ')</span>' : '') + (who ? ' – ' + e(who) : '') + '</td></tr>';
      eqTxt += '☐ ' + r.name + (r.company ? ' (' + r.company + ')' : '') + (who ? ' – ' + who : '') + '\n'; });
  });
  if (!eqHtml) { eqHtml = '<tr><td style="color:#5f7381">Ehhez a projekthez még nincs eszköz rendelve.</td></tr>'; eqTxt = '\n(nincs eszköz rendelve)\n'; }
  const crewRows = Object.keys(onProject).filter(cid => crewMap[cid]).map(cid => ({ c: crewMap[cid], roles: onProject[cid] }));
  const crewHtml = crewRows.map(r => '<tr><td style="padding:4px 12px 4px 0"><b>' + e(r.c.name) + '</b></td><td style="padding:4px 12px 4px 0;color:#5f7381">' + e(r.roles.join(', ')) + '</td><td style="padding:4px 0">' + e(r.c.phone || '') + '</td></tr>').join('');
  const crewTxt = crewRows.map(r => '• ' + r.c.name + ' – ' + r.roles.join(', ') + (r.c.phone ? ' – ' + r.c.phone : '')).join('\n');
  // kapcsolattartó: a projektvezető az ügyfél valódi kapcsolattartóját kapja, a többi szakember a projektvezető elérhetőségét
  const leadC = p.lead && crewMap[p.lead] ? crewMap[p.lead] : null;
  const contactFor = cid => cid === p.lead ? [p.contactName, p.contactPhone, p.contactEmail].filter(Boolean).join(', ')
    : (leadC ? [leadC.name + ' (projektvezető)', leadC.phone, leadC.email].filter(Boolean).join(', ') : '');
  const infoOf = cid => [['Időpont', dateTxt], ['Érkezés', p.startTime], ['Helyszín', p.venue], ['Kapcsolattartó', contactFor(cid)]].filter(x => x[1]);
  const infoHtmlOf = cid => infoOf(cid).map(x => '<tr><td style="padding:3px 14px 3px 0;color:#5f7381;white-space:nowrap">' + x[0] + '</td><td style="padding:3px 0"><b>' + e(x[1]) + '</b></td></tr>').join('');
  const planHtml = includePlan && String(p.techPlan || '').trim() ? '<h3 style="font-size:15px;margin:24px 0 6px">Forgatási és technikai terv</h3><div style="white-space:pre-wrap">' + e(p.techPlan) + '</div>' : '';   // csak ha van terv; a jegyzetek nem kerülnek a levélbe
  const planTxt = includePlan && String(p.techPlan || '').trim() ? '\nFORGATÁSI ÉS TECHNIKAI TERV\n' + p.techPlan + '\n' : '';
  const sentTo = [];
  const mine = cid => p.equipment.filter(x => x.crewId === cid && invMap[x.itemId]).map(x => x.qty + '× ' + invMap[x.itemId].name)
    .concat(rentals.filter(r => r.crewId === cid).map(r => r.name + (r.own ? ' (saját)' : ' (bérelt' + (r.company ? ', ' + r.company : '') + ')')));
  const sig = signatureFor_(u), pNotes = parseNotes_(p.crewNotes);
  recipients.forEach(cid => {
    const c = crewMap[cid];
    const first = String(c.name).trim().split(/\s+/).slice(-1)[0];
    const html = '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#173042;font-size:14px;line-height:1.5;max-width:640px">'
      + '<p>Szia ' + e(first) + '!</p>'
      + (message ? '<p style="white-space:pre-wrap">' + e(message) + '</p>' : '<p>' + (resend ? 'Frissült' : 'Itt az') + ' eszközlista a következő forgatáshoz:</p>')
      + '<h2 style="font-size:20px;margin:18px 0 8px">' + e(p.name) + '</h2>'
      + '<table style="border-collapse:collapse;font-size:14px">' + infoHtmlOf(cid) + '</table>'
      + '<p style="margin:10px 0 0">A te szereped: <b>' + e(onProject[cid].join(', ')) + '</b></p>'
      + (mine(cid).length ? '<p style="margin:10px 0 0;padding:10px 12px;background:#e8f2ec;border-radius:10px"><b>Nálad lesz:</b> ' + e(mine(cid).join(', ')) + '</p>' : '')
      + (pNotes[cid] ? '<p style="margin:10px 0 0;padding:10px 12px;background:#fff6e0;border-radius:10px"><b>Neked szóló megjegyzés:</b><br>' + e(pNotes[cid]).replace(/\n/g, '<br>') + '</p>' : '')
      + '<h3 style="font-size:15px;margin:24px 0 2px">Eszközlista</h3><table style="border-collapse:collapse;width:100%;font-size:14px">' + eqHtml + '</table>'
      + '<h3 style="font-size:15px;margin:24px 0 6px">Stáb</h3><table style="border-collapse:collapse;font-size:14px">' + crewHtml + '</table>'
      + planHtml
      + (sig ? '<div style="margin-top:26px">' + sig.html + '</div></div>' : '<p style="margin-top:26px">Üdvözlettel,<br>' + e(u.name) + '<br>Lumos Motion</p></div>');
    const text = 'Szia ' + first + '!\n\n' + (message || ((resend ? 'Frissült' : 'Itt az') + ' eszközlista a következő forgatáshoz:')) + '\n\n' + p.name + '\n'
      + infoOf(cid).map(x => x[0] + ': ' + x[1]).join('\n') + '\nA te szereped: ' + onProject[cid].join(', ') + (mine(cid).length ? '\nNálad lesz: ' + mine(cid).join(', ') : '') + (pNotes[cid] ? '\nNeked szóló megjegyzés: ' + pNotes[cid] : '') + '\n\nESZKÖZLISTA' + eqTxt + '\nSTÁB\n' + crewTxt + '\n' + planTxt
      + '\n' + (sig ? sig.text : 'Üdvözlettel,\n' + u.name + '\nLumos Motion');
    const opts = mailOptsFor_(u, html);
    if (gmailSend_(c.email, subject, text, opts, 'eqlist')) sentTo.push(c.name);
  });
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
function getLog_() {
  if (dbOn_()) return dbGetLog_().map(x => Object.assign(x, { subject: String(x.subject).replace(/^'/, ''), details: String(x.details).replace(/^'/, '') }));
  const sh = logSheet_(), n = sh.getLastRow();
  if (n < 2) return [];
  const from = Math.max(2, n - 299);
  return sh.getRange(from, 1, n - from + 1, LOG_HEADERS.length).getDisplayValues().reverse()
    .map(r => ({ at: r[0], who: r[1], role: r[2], action: r[3], subject: String(r[4]).replace(/^'/, ''), details: String(r[5]).replace(/^'/, '') }));
}

/* ===================== FELHASZNÁLÓK ÉS BELÉPÉS (a Sales App mintájára) ===================== */
const USERS_PROPERTY = 'LUMOS_PM_USERS_V1';
const SESSION_PREFIX = 'LUMOS_PM_SESS_';
const ROLES = ['admin', 'editor', 'crew'];   // Ügyvezető, Termelési vezető, Szakember (csak a saját beosztásait látja, nem szerkeszt)
const ROLE_NAMES_ = { admin: 'Ügyvezető', editor: 'Termelési vezető', crew: 'Szakember' };
const SESSION_DAYS_BY_ROLE = { admin: 7, editor: 30, crew: 30 };

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
  const o = { id: u.id, name: u.name, role: u.role, crewId: String(u.crewId || '') };
  if (u.realRole) { o.realRole = u.realRole; o.viewAs = u.viewAs; }
  return o;
}
function adminListUser_(u) { return { id: u.id, name: u.name, role: u.role, crewId: String(u.crewId || ''), email: String(u.email || ''), disabled: !!u.disabled, createdAt: u.createdAt || '' }; }
function newUserRecord_(name, role, crewId, email) {
  return { id: Utilities.getUuid(), name: name, role: role, crewId: crewId || '', email: String(email || ''), disabled: false, createdAt: new Date().toISOString() };
}
function escapeHtml_(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function appUrl_() { return FRONTEND_URL; }
/* Személyes e-mail-aláírások (a küldő e-mail-címe szerint). A képek a projekttervezo.lumosmotion.hu/sig/ alól töltődnek. */
const SIGNATURES = {
  'david.zajacz@lumosmotion.com': {
    html: "<table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"border-collapse:collapse;width:375px;font-family:Arial,Helvetica,sans-serif;color:#111111;\" width=\"375\"><tr><td colspan=\"2\" style=\"padding:0 0 5pt 0;font-family:Arial,Helvetica,sans-serif;font-size:10pt;line-height:12pt;color:#111111;\">Üdvözlettel,</td></tr><tr><td style=\"width:116px;padding:8px 0 8px 8px;vertical-align:middle;background:#f2f2f2;border-left:4px solid #111111;\" valign=\"middle\" width=\"116\"><img alt=\"david.jpg\" height=\"108\" src=\"https://projekttervezo.lumosmotion.hu/sig/david.jpg\" style=\"display:block;width:108px;height:108px;border:0;border-radius:54px;outline:none;text-decoration:none;\" width=\"108\"/></td><td style=\"padding:8px 8px 8px 0;vertical-align:middle;white-space:nowrap;background:#f2f2f2;font-family:Arial,Helvetica,sans-serif;color:#111111;\" valign=\"middle\"><div style=\"font-size:14pt;line-height:16.8pt;font-weight:700;margin:0 0 4pt 0;\">Zajácz Dávid</div><div style=\"font-size:10pt;line-height:12pt;margin:0 0 4pt 0;\">Produkciós koordinátor</div><div style=\"font-size:10pt;line-height:12pt;font-weight:700;margin:0 0 4pt 0;\">Lumos Motion Kft.</div><div style=\"font-size:10pt;line-height:12pt;margin:0 0 4pt 0;\">Tel.: <a href=\"tel:+36205995583\" style=\"color:#1155cc;text-decoration:underline;\">+36 20 599 5583</a></div><div style=\"font-size:10pt;line-height:12pt;margin:0;\">Email: <a href=\"mailto:david.zajacz@lumosmotion.com\" style=\"color:#1155cc;text-decoration:underline;font-size:10pt;\">david.zajacz@lumosmotion.com</a></div></td></tr><tr><td colspan=\"2\" style=\"padding:6pt 0 0 0;\"><a href=\"https://lumosmotion.com/\" style=\"text-decoration:none;border:0;\"><img alt=\"lumosmotion.png\" height=\"23\" src=\"https://projekttervezo.lumosmotion.hu/sig/lumos-motion.png\" style=\"display:block;width:224px;height:23px;border:0;outline:none;text-decoration:none;background:#ffffff;\" width=\"224\"/></a></td></tr></table>",
    text: 'Üdvözlettel,\n\nZajácz Dávid\nProdukciós koordinátor\nLumos Motion Kft.\nTel.: +36 20 599 5583\nEmail: david.zajacz@lumosmotion.com\nhttps://lumosmotion.com/'
  },
  'ervin.egri@lumosmotion.com': {
    html: "<table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"border-collapse:collapse;width:375px;font-family:Arial,Helvetica,sans-serif;color:#111111;\" width=\"375\"><tr><td colspan=\"2\" style=\"padding:0 0 5pt 0;font-family:Arial,Helvetica,sans-serif;font-size:10pt;line-height:12pt;color:#111111;\">Üdvözlettel,</td></tr><tr><td style=\"width:116px;padding:8px 0 8px 8px;vertical-align:middle;background:#f2f2f2;border-left:4px solid #111111;\" valign=\"middle\" width=\"116\"><img alt=\"ervin.jpg\" height=\"108\" src=\"https://projekttervezo.lumosmotion.hu/sig/ervin.jpg\" style=\"display:block;width:108px;height:108px;border:0;border-radius:54px;outline:none;text-decoration:none;\" width=\"108\"/></td><td style=\"padding:8px 8px 8px 0;vertical-align:middle;white-space:nowrap;background:#f2f2f2;font-family:Arial,Helvetica,sans-serif;color:#111111;\" valign=\"middle\"><div style=\"font-size:14pt;line-height:16.8pt;font-weight:700;margin:0 0 4pt 0;\">Egri Ervin</div><div style=\"font-size:10pt;line-height:12pt;margin:0 0 4pt 0;\">Ügyvezető igazgató</div><div style=\"font-size:10pt;line-height:12pt;font-weight:700;margin:0 0 4pt 0;\">Lumos Motion Kft.</div><div style=\"font-size:10pt;line-height:12pt;margin:0 0 4pt 0;\">Tel.: <a href=\"tel:+36706178235\" style=\"color:#1155cc;text-decoration:underline;\">+36 70 617 8235</a></div><div style=\"font-size:10pt;line-height:12pt;margin:0;\">Email: <a href=\"mailto:ervin.egri@lumosmotion.com\" style=\"color:#1155cc;text-decoration:underline;font-size:10pt;\">ervin.egri@lumosmotion.com</a></div></td></tr><tr><td colspan=\"2\" style=\"padding:6pt 0 0 0;\"><a href=\"https://lumosmotion.com/\" style=\"text-decoration:none;border:0;\"><img alt=\"lumosmotion.png\" height=\"23\" src=\"https://projekttervezo.lumosmotion.hu/sig/lumos-motion.png\" style=\"display:block;width:224px;height:23px;border:0;outline:none;text-decoration:none;background:#ffffff;\" width=\"224\"/></a></td></tr></table>",
    text: 'Üdvözlettel,\n\nEgri Ervin\nÜgyvezető igazgató\nLumos Motion Kft.\nTel.: +36 70 617 8235\nEmail: ervin.egri@lumosmotion.com\nhttps://lumosmotion.com/'
  }
};
const SIG_ALIAS_ = { 'zajacz.david@lumosmotion.com': 'david.zajacz@lumosmotion.com' };   // ugyanaz a postafiók más címmel
const signatureFor_ = u => { const m = String((u && u.email) || '').toLowerCase(); return SIGNATURES[m] || SIGNATURES[SIG_ALIAS_[m]] || null; };
const FRONTEND_LABEL = FRONTEND_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');   // a levelekben így látszik: projekttervezo.lumosmotion.hu

/** Meghívó Google-fiókos belépéshez (PIN nélkül). */
function sendInviteMail_(user) {
  const url = appUrl_() || FRONTEND_URL;
  const intro = 'Hozzáférést kaptál a ' + APP_TITLE + ' alkalmazáshoz.';
  const lines = ['Kedves ' + user.name + ',', '', intro, '',
    'Belépés: nyisd meg a ' + FRONTEND_LABEL + ' oldalt, és kattints a „Bejelentkezés Google-fiókkal” gombra.',
    'Ezzel a Google-fiókkal lépj be: ' + user.email, '', MAIL_SIGNATURE_TEXT];
  const html = '<p>Kedves ' + escapeHtml_(user.name) + ',</p><p>' + escapeHtml_(intro) + '</p>'
    + '<p>Belépés: nyisd meg a <a href="' + escapeHtml_(url) + '">' + escapeHtml_(FRONTEND_LABEL) + '</a> oldalt, és kattints a <b>„Bejelentkezés Google-fiókkal”</b> gombra.</p>'
    + '<p>Ezzel a Google-fiókkal lépj be: <b>' + escapeHtml_(user.email) + '</b></p><p>' + MAIL_SIGNATURE_HTML + '</p>';
  const opts = { htmlBody: html, name: 'Lumos Motion', replyTo: MAIL_REPLY_TO };
  try { if (GmailApp.getAliases().indexOf(MAIL_FROM) >= 0) opts.from = MAIL_FROM; } catch (e) {}
  gmailSend_(user.email, APP_TITLE + ' – meghívó', lines.join('\n'), opts, 'invite');
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
function createSession_(u, logAction) {
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  const exp = Date.now() + (SESSION_DAYS_BY_ROLE[u.role] || 2) * 86400000;
  const props = PropertiesService.getScriptProperties();
  cleanupSessions_(props);
  props.setProperty(SESSION_PREFIX + sha256hex_(token), JSON.stringify({ uid: u.id, exp: exp }));
  logEvent_(u, logAction, '', '');
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
  if (s.viewAs && u.role === 'admin' && (s.viewAs.role === 'editor' || s.viewAs.role === 'crew'))
    return Object.assign({}, u, { role: s.viewAs.role, crewId: s.viewAs.role === 'crew' ? String(s.viewAs.crewId || '') : '', realRole: 'admin', viewAs: s.viewAs });
  return u;
}

function setViewAs_(token, u, arg) {
  if (u.role !== 'admin' && u.realRole !== 'admin') throw new Error('FORBIDDEN: ehhez nincs jogosultságod.');
  const role = String(arg && arg.role || '');
  let view = null;
  if (role === 'editor') view = { role: 'editor' };
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

function saveUser_(arg) {
  const a = arg && typeof arg === 'object' ? arg : {};
  const name = String(a.name || '').trim().replace(/\s+/g, ' ');
  const role = String(a.role || '');
  const crewId = String(a.crewId || '').trim().slice(0, 64);
  const email = String(a.email || '').trim().toLowerCase();
  if (name.length < 2 || name.length > 60) throw new Error('A név 2–60 karakter lehet.');
  if (ROLES.indexOf(role) < 0) throw new Error('Válassz szerepkört: Ügyvezető, Termelési vezető vagy Szakember.');
  if (role === 'crew' && !crewId) throw new Error('Szakembernél válaszd ki, melyik munkatárs a stáblistában – csak az ő beosztásait fogja látni.');
  if (!email || email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Érvényes e-mail-cím szükséges: ezzel a Google-fiókkal lép be a felhasználó.');
  let target = null, list = null, isNew = false;
  withLock_(() => {
    const users = loadUsers_();
    if (users.some(u => u.id !== a.id && String(u.email || '').toLowerCase() === email)) throw new Error('Ezzel az e-mail-címmel már van felhasználó.');
    if (role === 'admin' && users.some(u => u.id !== a.id && u.role === 'admin')) throw new Error('Csak egy ügyvezető lehet. Válassz Termelési vezető vagy Szakember szerepkört.');
    let u = a.id ? users.find(x => x.id === a.id) : null;
    if (a.id && !u) throw new Error('A felhasználó nem található.');
    if (!u) {
      u = newUserRecord_(name, role, crewId, email);
      users.push(u);
    } else {
      const willDisable = a.disabled === true;
      if (u.role === 'admin' && !u.disabled && (role !== 'admin' || willDisable) && users.filter(x => x.role === 'admin' && !x.disabled).length < 2)
        throw new Error('Legalább egy aktív ügyvezetőnek maradnia kell.');
      const roleChanged = u.role !== role, emailChanged = String(u.email || '').toLowerCase() !== email;
      u.name = name; u.role = role; u.crewId = crewId; u.disabled = willDisable; u.email = email;
      if (willDisable || roleChanged || emailChanged) revokeSessionsOf_(u.id);
    }
    saveUsers_(users);
    target = u; isNew = !a.id;
    list = users.map(adminListUser_);
  });
  let mail = null;
  if (isNew && a.sendInvite !== false && target && target.email) {   // új kolléga: meghívó a Google-fiókos belépéshez
    try { sendInviteMail_(target); mail = { sent: true, to: target.email, invite: true }; }
    catch (e) { mail = { sent: false, to: target.email, error: String((e && e.message) || e), invite: true }; }
  }
  return { users: list, mail: mail };
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
const READ_ONLY_RPC_ = { dbPing: 1, geoSearch: 1, driveScan: 1, whoAmI: 1, bootstrap: 1, calendarEvents: 1, getLog: 1, listUsers: 1, setViewAs: 1, logout: 1, lookupTaxpayer: 1, hubspotContacts: 1, settingsData: 1, finData: 1, szPdf: 1 };   // ezek nem módosítják a projektadatokat
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
    case 'setViewAs': { setViewAs_(token, u, arg); return { ok: true, boot: bootstrap_(authUser_(token)) }; }   // egy körben: nézetváltás + az új nézet adatai
    case 'logout': PropertiesService.getScriptProperties().deleteProperty(SESSION_PREFIX + sha256hex_(String(token))); return { ok: true };
    case 'bootstrap': return bootstrap_(u);
    case 'calendarEvents': canEdit(); return calendarEvents_(arg);
    case 'syncCalendar': { canEdit(); const pid = str_(arg && arg.id, 64), sh = sheetFor_('projects'), r = findRow_(sh, pid); if (!r) return { calEventId: '' }; const q = syncCalendar_(fullProject_(readRow_('projects', sh, r))); return { calEventId: q.calEventId || '', calError: q.calError || '' }; }
    case 'saveCalEvent': canEdit(); return saveCalEvent_(u, arg);
    case 'deleteCalEvent': canEdit(); return deleteCalEvent_(u, arg);
    case 'saveCrewOrder': canEdit(); return saveCrewOrder_(u, arg);
    case 'finalizeCrew': canEdit(); return finalizeCrew_(u, arg);
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
    case 'szManual': adminOnly(); return szManual_(u, arg);
    case 'szLinkBatch': adminOnly(); return szLinkBatch_(u, arg);
    case 'szPeek': adminOnly(); return szPeek_(u, arg);
    case 'szSetKind': adminOnly(); return szSetKind_(u, arg);
    case 'szSync': adminOnly(); return szSync_(u, arg);
    case 'szPdf': adminOnly(); return szPdf_(u, arg);
    case 'billSave': adminOnly(); return billSave_(u, arg);
    case 'billUpload': adminOnly(); return billUpload_(u, arg);
    case 'fwSave': adminOnly(); return fwSave_(u, arg);
    case 'setMail': adminOnly(); return setMail_(u, arg);
    case 'driveScan': adminOnly(); return driveScan_(arg);
    case 'driveOps': adminOnly(); return driveOps_(u, arg);
    case 'driveMoveFolder': adminOnly(); return driveMoveFolder_(u, arg);
    case 'fwDelete': adminOnly(); return fwDelete_(u, arg);
    case 'clientFolder': adminOnly(); return clientFolderUrl_(arg);
    case 'geoSearch': return geoSearch_(arg);
    case 'dbPing': adminOnly(); return dbPing_();
    case 'dbMigrate': adminOnly(); return dbMigrate_(u);
    case 'dbSetMode': adminOnly(); return dbSetMode_(u, arg);
    case 'dbBackup': adminOnly(); return dbBackup_();
    case 'clientDocs': adminOnly(); return clientDocs_(arg);
    case 'tigCreate': adminOnly(); return tigCreate_(u, arg);
    case 'tigSave': adminOnly(); return tigSave_(u, arg);
    case 'requestBudgetChange': canEdit(); return requestBudgetChange_(u, arg);
    case 'decideBudgetChange': adminOnly(); return decideBudgetChange_(u, arg);
    case 'saveProject': canEdit(); return projectView_(saveProject_(u, arg), u);
    case 'deleteProject': canEdit(); return deleteProject_(u, arg);
    case 'createProjectFolder': canEdit(); return createProjectFolder_(u, arg);
    case 'lookupTaxpayer': canEdit(); return lookupTaxpayerApi_(arg);
    case 'hubspotContacts': canEdit(); return hubspotContactsApi_(arg);
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
    case 'deleteClient': canEdit(); return deleteClient_(u, arg);
    case 'getLog': adminOnly(); return getLog_();
    case 'settingsData': adminOnly(); return { users: loadUsers_().map(adminListUser_), log: getLog_().slice(0, 150) };   // egy kérésben a Beállítások fülhöz
    case 'listUsers': adminOnly(); return loadUsers_().map(adminListUser_);
    case 'saveUser': {
      adminOnly();
      const res = saveUser_(arg);
      const a = arg || {};
      logEvent_(u, 'Felhasználó mentve', String(a.name || ''), (a.id ? 'módosítva' : 'új') + ' · ' + (ROLE_NAMES_[a.role] || a.role) + (a.disabled === true ? ' · letiltva' : '') + (res.mail && res.mail.sent ? ' · Google-meghívó kiküldve' : ''));
      return res;
    }
    case 'setUserDisabled': {
      adminOnly();
      const res = setUserDisabled_(arg, u);
      logEvent_(u, arg && arg.disabled ? 'Felhasználó letiltva' : 'Felhasználó engedélyezve', res.name, '');
      return res.users;
    }
    case 'deleteUser': {
      adminOnly();
      let who = ''; try { const x = loadUsers_().find(z => z.id === String(arg && arg.id || '')); who = x ? x.name : ''; } catch (e) {}
      const res = deleteUser_(arg, u);
      logEvent_(u, 'Felhasználó törölve', who, '');
      return res;
    }
    default: throw new Error('Ismeretlen művelet.');
  }
}