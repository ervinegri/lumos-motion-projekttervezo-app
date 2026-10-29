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
const FRONTEND_URL = 'https://projekttervezo.lumosmotion.hu';   // a Vercelen futó felület címe (ez kerül a PIN-es e-mailekbe)
/* Google-fiókos belépés: a Google Cloud OAuth „Web application” ügyfél azonosítója (nem titkos adat).
   Felülírható a GOOGLE_CLIENT_ID Script Propertyvel. Üresen a Google-belépés ki van kapcsolva. */
const GOOGLE_CLIENT_ID = '236393101415-be2dql04j8msn834o5afad87vib0n54v.apps.googleusercontent.com';
const COMPANY_DOMAIN = 'lumosmotion.com';
/* A PIN-es belépés megszűnt, csak Google-fiókkal lehet belépni. Vészhelyzetre (pl. ha a Google-belépés nem működik)
   a Script Propertiesben a PIN_LOGIN_ENABLED = true visszakapcsolja, és az app a projekttervezo.lumosmotion.hu/#pin címen
   mutatja a PIN-es űrlapot. Utána állítsd vissza false-ra vagy töröld. */
function pinLoginEnabled_() { return String(PropertiesService.getScriptProperties().getProperty('PIN_LOGIN_ENABLED') || '').toLowerCase() === 'true'; }
const PIN_OFF_MSG = 'A PIN-kódos belépés megszűnt. Lépj be a „Bejelentkezés Google-fiókkal” gombbal.';   // ilyen végű címnél csak a céges (Workspace) Google-fiók fogadható el
const CALENDAR_ID = 'c_2c50501c805387f783e86998c7afa0a53dcc443aaa73d96e1be5373ecb71d2fd@group.calendar.google.com';   // „Terepi Munkák Lumos Motion” naptár
const MAIL_FROM = 'admin@lumosmotion.com';        // az app leveleinek feladója: Gmail „Küldés másként” alias a szkriptet futtató fiókban
const MAIL_REPLY_TO = 'admin@lumosmotion.com';      // alapértelmezett válaszcím (az eszközlistánál a küldő kolléga címe lesz)
const MAIL_SIGNATURE_HTML = 'Üdvözlettel,<br>Lumos Motion';
const MAIL_SIGNATURE_TEXT = 'Üdvözlettel,\nLumos Motion';
const SHEET_TZ = 'Europe/Budapest';

/** EGYSZERI beállítás a setup() futtatásához: [megjelenő név, szerepkör (admin | editor | crew), e-mail-cím]
 *  A PIN-t a program generálja: e-mailben kiküldi, és a végrehajtási naplóba is kiírja. */
const SETUP_USERS = [
  ['Ervin', 'admin', 'ervin.egri@lumosmotion.com']
];

/* ===================== ADATMODELL ===================== */
const STATUSES = ['egyeztetes', 'tervezes', 'helyszin', 'utomunka', 'atadva', 'lemondva'];
const EVENT_TYPES = ['Konferencia', 'Webinárium', 'Csoportos találkozó', 'Céges rendezvény', 'Gála, díjátadó', 'Kiállítás, expo', 'Termékbemutató', 'Sportesemény', 'Koncert', 'Short videó forgatás', 'Egyéb'];
const CREW_ROLES = ['Projektvezető', 'Értékesítő', 'Operatőr', 'Vágó', 'Fotós', 'Drónpilóta', 'Hangtechnikus', 'Fénytechnikus', 'Vizuáltechnikus', 'Képkeverő / streaming', 'Sofőr / rakodó'];
const CREW_TYPES = ['Belsős', 'Állandó külsős', 'Alkalmi freelancer'];
const CREW_SKILLS = ['Statív', 'Gimbal', 'Előadásvágás', 'Kreatív vágás', 'Werk', 'Saját kamera', 'Eszközbérlés'];
const INV_CATS = ['Kamera', 'Objektív', 'Hang', 'Fény', 'Drón', 'Képkeverés / stream', 'GoPro / akciókamera', 'Gimbal / állvány', 'Akku / powerbank / táp', 'Adathordozó', 'Laptop / tablet / telefon', 'Kocsi / szállítás', 'Kábel', 'Egyéb'];
const CONDITIONS = ['ok', 'javitas', 'szerviz', 'selejt'];
const COUNTS = { aftermovie: 3, interju: 8, short60: 15, short30: 15, short15: 15, er_clips: 20, er_subs: 10, er_summary: 10 };
const FLAGS = ['x_vago', 'x_dron', 'x_timelapse', 'x_pov', 'x_foto', 'x_nyersVetel', 'x_nyersTarolas', 'x_rush', 't_eloadas', 't_kepkeveres', 't_hang', 't_feny', 't_vizual',
  'er_total', 'er_close', 'er_crowd', 'er_slides', 'er_drone', 'er_stream', 'er_post', 'er_zoom'];
const REC_LABELS = { er_total: 'Teljes alakos kamera', er_close: 'Közeli kamera (kamerával)', er_zoom: 'Közeli (vágói belenagyítással)', er_crowd: 'Közönség kamera', er_slides: 'Diák rögzítése / kivetítése', er_stream: 'Élő kivetítés LED falra vagy projektorra', t_kepkeveres: 'Streaming', er_post: 'Előadások utómunkája' };

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
    ['short60', 'Short 40–60 mp (db)'], ['foto_db', 'Fotók (db)'], ['er_zoom', 'ER: közeli vágói belenagyítással'], ['dueAt', 'Átadási határidő (egyedi)'], ['fees', 'Termelői díjak (JSON)'], ['budgetMode', 'Termelői keret módja'], ['budgetVal', 'Termelői keret (% vagy Ft)'], ['crewNotes', 'Személyes jegyzetek (JSON)'], ['rentals', 'Bérelt eszközök (JSON)'], ['deliveryNotes', 'Átadási észrevételek'], ['siteOk', 'Helyszíni munka rendben'], ['siteReport', 'Helyszíni beszámoló'], ['clientTax', 'Ügyfél adószáma'], ['clientAddress', 'Ügyfél székhelye'], ['t_vizual', 'Vizuáltechnika'], ['penalties', 'Díjcsökkentések (JSON)'], ['er_summary', 'ER: összefoglaló videó (db)'], ['stepsDone', 'Kipipált lépések']] },
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
    ['contactPhone', 'Telefon'], ['contactEmail', 'E-mail'], ['note', 'Megjegyzés'], ['createdAt', 'Létrehozva'], ['updatedAt', 'Módosítva']] },
  crewAssign: { tab: 'Stábbeosztás', assign: true, cols: [
    ['projectId', 'Projekt azonosító'], ['crewId', 'Munkatárs azonosító'], ['role', 'Szerep'], ['projectName', 'Projekt'], ['crewName', 'Munkatárs']] },
  eqAssign: { tab: 'Eszközbeosztás', assign: true, cols: [
    ['projectId', 'Projekt azonosító'], ['itemId', 'Eszköz azonosító'], ['qty', 'Darab'], ['projectName', 'Projekt'], ['itemName', 'Eszköz'],
    ['crewId', 'Felelős azonosító'], ['crewName', 'Felelős (kinél van)']] }
};
const NUM_FIELDS = new Set(['budgetVal', 'er_rooms', 'er_clips', 'er_subs', 'er_summary', 'priority', 'hours', 'aftermovie', 'interju', 'short60', 'short30', 'short15', 'foto_db', 'quotePrice', 'dayRate', 'qty', 'value']);
const BOOL_FIELDS = new Set(FLAGS);
const DATE_FIELDS = new Set(['date', 'endDate', 'deliveredAt', 'dueAt']);
const CONDITION_LABELS = { ok: 'Üzemképes', javitas: 'Javításra vár', szerviz: 'Szervizben', selejt: 'Selejtezett' };
const STATUS_LABELS = { egyeztetes: 'Egyeztetés', tervezes: 'Tervezés', helyszin: 'Helyszíni munka', utomunka: 'Utómunka', atadva: 'Átadva', lemondva: 'Lemondva' };
const ID_RE = /^[A-Za-z0-9-]{8,64}$/;

/* ===================== WEBALKALMAZÁS ===================== */
function doGet(e) {
  if (e && e.parameter && e.parameter.p) return api_(e.parameter.p);
  return ContentService.createTextOutput(JSON.stringify({ ok: true, app: APP_TITLE, frontend: FRONTEND_URL }))
    .setMimeType(ContentService.MimeType.JSON);
}

/** A felület kérései: GET ?p=... (rövid kérések) vagy POST törzs (hosszú kérések). Tartalom: { fn, args }. */
function doPost(e) {
  return api_((e && e.postData && e.postData.contents) || '{}');
}

function api_(raw) {
  let out;
  try {
    const body = JSON.parse(raw || '{}');
    const fn = String(body.fn || ''), args = Array.isArray(body.args) ? body.args : [];
    let data;
    if (fn === 'rpc') data = rpc(args[0], args[1], args[2]);
    else if (fn === 'login') data = login(args[0], args[1], args[2]);
    else if (fn === 'googleLogin') data = googleLogin(args[0]);
    else if (fn === 'getLoginNames') data = getLoginNames();
    else if (fn === 'requestPinReset') data = requestPinReset(args[0]);
    else throw new Error('Ismeretlen művelet.');
    out = { ok: true, data: data === undefined ? null : data };
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/* ===================== TÁBLÁZAT-RÉTEG ===================== */
let SS_CACHE_ = null;
function ss_() { return SS_CACHE_ || (SS_CACHE_ = SpreadsheetApp.openById(SPREADSHEET_ID)); }

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
function ensureHeader_(sh, labels, tabName) {
  if (sh.getMaxColumns() < labels.length) sh.insertColumnsAfter(sh.getMaxColumns(), labels.length - sh.getMaxColumns());
  trimEmptyCols_(sh, labels.length);
  const range = sh.getRange(1, 1, 1, labels.length);
  const first = range.getDisplayValues()[0];
  let changed = false;
  labels.forEach((h, i) => {
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
  try { return fn(); } finally { lock.releaseLock(); }
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
    links: { folder: 'https://drive.google.com/drive/folders/' + PROJECTS_FOLDER_ID, sheet: 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/edit' },
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
    kind: x && (x.kind === 'other' || x.kind === 'fixed') ? x.kind : '', key: str_(x && x.key, 20), autoTask: !!(x && x.autoTask),
    amount: int_(x && x.amount, 0, FEE_MAX, 0), rent: int_(x && x.rent, 0, FEE_MAX, 0)
  })).filter(x => x.crewId || x.name || x.task || x.gear || x.amount || x.rent);
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
function projectView_(p, u) {
  const q = Object.assign({}, p);
  const role = u && u.role;
  // személyes jegyzetek: a szakember csak a sajátját kapja meg
  const notes = parseNotes_(q.crewNotes);
  q.crewNotes = role === 'crew' ? (u.crewId && notes[u.crewId] ? { [u.crewId]: notes[u.crewId] } : {}) : notes;
  q.rentals = parseRentals_(q.rentals).map(r => role === 'crew' ? { id: r.id, crewId: r.crewId, name: r.name, company: r.company, own: r.own } : r);
  if (role === 'admin') { const v = Number(q.quotePrice); q.projectValue = q.quotePrice === '' || q.quotePrice == null || !isFinite(v) ? null : v; }
  delete q.quotePrice;
  if (role === 'admin' || role === 'editor') q.fees = parseFees_(q.fees);
  else { const mine = role === 'crew' && u.crewId ? parseFees_(q.fees).find(f => f.crewId === u.crewId) : null; if (mine && mine.amount) q.myFee = { amount: mine.amount }; delete q.fees; }   // a szakember csak a saját díját látja
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
  return q;
}

function fullProject_(p) {
  const q = Object.assign({}, p);
  q.crew = readAll_('crewAssign').filter(r => r.projectId === p.id).map(r => ({ crewId: r.crewId, role: r.role }));
  q.equipment = readAll_('eqAssign').filter(r => r.projectId === p.id).map(r => ({ itemId: r.itemId, qty: r.qty || 1, crewId: r.crewId || '' }));
  delete q.mutationId;
  return q;
}

/* ===================== PROJEKTEK ===================== */
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
    hours: int_(a.hours, 1, 16, 8),
    status: STATUSES.indexOf(a.status) >= 0 ? a.status : 'egyeztetes',
    prevStatus: STATUSES.indexOf(a.prevStatus) >= 0 ? a.prevStatus : '',
    lead: str_(a.lead, 64),
    quotePrice: null,   // a projekt értékét csak az ügyvezető állíthatja (lent), máskor a régi marad
    contactName: str_(a.contactName, 120), contactPhone: str_(a.contactPhone, 40), contactEmail: str_(a.contactEmail, 160).toLowerCase(), clientTax: str_(a.clientTax, 20).replace(/[^\d-]/g, ''), clientAddress: str_(a.clientAddress, 300),
    techPlan: str_(a.techPlan, 5000), notes: str_(a.notes, 5000), deliveryLink: str_(a.deliveryLink, 500), deliveryNotes: str_(a.deliveryNotes, 3000), stepsDone: (Array.isArray(a.stepsDone) ? a.stepsDone : String(a.stepsDone || '').split(',')).filter(x => ['egyeztetes', 'tervezes', 'helyszin', 'utomunka'].indexOf(x) >= 0).join(','), siteOk: a.siteOk === 'igen' || a.siteOk === 'nem' ? a.siteOk : '', siteReport: str_(a.siteReport, 3000), deliveredAt: iso_(a.deliveredAt), dueAt: iso_(a.dueAt)
  };
  if (p.name.length < 2) throw new Error('Add meg a projekt nevét (legalább 2 karakter).');
  if (p.endDate && (!p.date || p.endDate < p.date)) p.endDate = '';
  if (p.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.contactEmail)) throw new Error('A kapcsolattartó e-mail-címe érvénytelen.');
  if (p.deliveryLink && !/^https:\/\//i.test(p.deliveryLink)) throw new Error('Az átadási link https:// előtaggal kezdődjön.');
  Object.keys(COUNTS).forEach(k => { p[k] = int_(a[k], 0, COUNTS[k], 0); });
  FLAGS.forEach(k => { p[k] = a[k] === true; });
  if (p.er_drone) { p.x_dron = true; p.er_drone = false; }   // a drón a Kreatív tartalmakhoz tartozik
  p.foto_db = (a.foto_db === undefined || a.foto_db === null || a.foto_db === '') ? (p.x_foto ? 150 : 0) : int_(a.foto_db, 0, 1000, 0);
  p.x_foto = p.foto_db > 0;
  p.er_res = a.er_res === '4k' ? '4k' : 'hd';
  p.er_rooms = int_(a.er_rooms, 0, 10, 0);
  if (['er_total', 'er_close', 'er_zoom', 'er_crowd', 'er_slides', 'er_drone', 'er_stream'].some(k => p[k])) p.t_eloadas = true;   // a régi jelölő automatikusan
  if (p.status === 'atadva' && !p.deliveredAt) p.deliveredAt = today_();
  if (p.status !== 'atadva') p.deliveredAt = '';
  const crewIn = Array.isArray(a.crew) ? a.crew.slice(0, 60) : [];
  const eqIn = Array.isArray(a.equipment) ? a.equipment.slice(0, 150) : [];

  const saved = withLock_(() => {
    const crewMap = byId_(readAll_('crew')), invMap = byId_(readAll_('inventory'));
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

    const sh = sheetFor_('projects');
    const row = findRow_(sh, id);
    let old = null;
    if (row) {
      old = readRow_('projects', sh, row);
      if (old.mutationId === mutationId) return fullProject_(old);   // megismételt kérés
      if (old.updatedAt !== str_(a.baseUpdatedAt, 30)) throw new Error('CONFLICT: Közben valaki más is módosította ezt a projektet.');
      p.createdAt = old.createdAt; p.folderId = old.folderId; p.listSentAt = old.listSentAt; p.listSentTo = old.listSentTo; p.calEventId = old.calEventId;
      p.quotePrice = old.quotePrice; p.fees = old.fees; p.budgetMode = old.budgetMode; p.budgetVal = old.budgetVal; p.crewNotes = old.crewNotes; p.rentals = old.rentals; p.penalties = old.penalties;
    } else {
      if (a.baseUpdatedAt) throw new Error('Ezt a projektet közben törölték.');
      const calId = str_(a.calEventId, 200);
      if (calId) { const dup = readAll_('projects').find(x => x.calEventId === calId); if (dup) return Object.assign(fullProject_(dup), { duplicateOf: true }); }   // ugyanabból a naptáreseményből már van projekt
      p.createdAt = now_(); p.folderId = ''; p.listSentAt = ''; p.listSentTo = ''; p.calEventId = str_(a.calEventId, 200);   // naptárból importált projekt
    }
    if (u.role === 'admin' && a.projectValue !== undefined) p.quotePrice = (a.projectValue === null || a.projectValue === '') ? '' : int_(a.projectValue, 0, VALUE_MAX, 0);
    if ((u.role === 'admin' || u.role === 'editor') && Array.isArray(a.fees)) p.fees = JSON.stringify(parseFees_(a.fees));
    if (u.role === 'admin' && a.budgetMode !== undefined) {
      p.budgetMode = a.budgetMode === 'pct' || a.budgetMode === 'ft' ? a.budgetMode : '';
      const b = Number(String(a.budgetVal == null ? '' : a.budgetVal).replace(',', '.'));
      p.budgetVal = !p.budgetMode || a.budgetVal === '' || a.budgetVal == null || !isFinite(b) || b < 0 ? ''
        : p.budgetMode === 'pct' ? Math.min(100, Math.round(b * 10) / 10) : Math.min(VALUE_MAX, Math.round(b));
    }
    if (a.crewNotes !== undefined) p.crewNotes = JSON.stringify(parseNotes_(a.crewNotes));
    if (p.crewNotes == null) p.crewNotes = '';
    if (Array.isArray(a.rentals)) p.rentals = JSON.stringify(parseRentals_(a.rentals));
    if (p.rentals == null) p.rentals = '';
    if (p.budgetMode == null) p.budgetMode = '';
    if (p.budgetVal == null) p.budgetVal = '';
    if (p.quotePrice == null) p.quotePrice = '';
    if (p.fees == null) p.fees = '';
    if (p.penalties == null) p.penalties = '';   // díjcsökkentést csak a külön műveletek módosítanak
    if (p.status === 'atadva' && (!old || old.status !== 'atadva') && needsDelivery_(p) && !p.deliveryLink)
      throw new Error('Átadás előtt add meg az átadási linket (mappa vagy videók).');
    if (['helyszin', 'utomunka', 'atadva'].indexOf(p.status) >= 0 && (!old || old.status !== p.status) && !p.siteOk)
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
    SpreadsheetApp.flush();
    logEvent_(u, old ? 'Projekt módosítva' : 'Projekt létrehozva', p.name, old ? diffProject_(old, p) : (p.date ? 'Dátum: ' + p.date : ''));
    const out = Object.assign({}, p, { crew: crew, equipment: equipment });
    delete out.mutationId;
    return out;
  });
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
    SpreadsheetApp.flush();
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
  const rec = Object.keys(REC_LABELS).filter(k => p[k] === true).map(k => REC_LABELS[k]);
  if (Number(p.er_clips) > 0) rec.push(p.er_clips + ' kivágás');
  if (Number(p.er_subs) > 0) rec.push(p.er_subs + ' feliratozás');
  if (Number(p.er_summary) > 0) rec.push(p.er_summary + ' rövid összefoglaló videó');
  if (Number(p.foto_db) > 0) lines.push('Fotózás: ' + p.foto_db + ' db fotó');
  if (rec.length) lines.push('Előadásrögzítés és kivetítés: ' + rec.join(', ') + (Number(p.er_rooms) > 1 ? ' · ' + p.er_rooms + ' terem' : '') + (p.er_post ? ' · ' + (p.er_res === '4k' ? '4K' : 'Full HD') : ''));
  if (p.client) lines.push('Ügyfél: ' + p.client);
  if (p.startTime) lines.push('Érkezés: ' + p.startTime + (p.hours ? ' · ' + p.hours + ' óra' : ''));
  if (p.contactName || p.contactPhone) lines.push('Kapcsolattartó: ' + [p.contactName, p.contactPhone].filter(Boolean).join(', '));
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
    // vendégek: a beosztott stábtagok; a nem stábhoz tartozó vendégekhez (pl. ügyfél) nem nyúlunk
    const want = {}; plan.guests.forEach(m => { want[m] = 1; });
    const isCrew = {}; plan.crewEmails.forEach(m => { isCrew[m] = 1; });
    const have = {}; ev.getGuestList().forEach(g => { have[String(g.getEmail()).toLowerCase()] = 1; });
    Object.keys(want).forEach(m => { if (!have[m]) ev.addGuest(m); });
    Object.keys(have).forEach(m => { if (isCrew[m] && !want[m]) ev.removeGuest(m); });
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
    if (guests.length) { opts.guests = guests.join(','); opts.sendInvites = a.sendInvites === true; }
    ev = allDay ? cal_().createAllDayEvent(title, start, end, opts) : cal_().createEvent(title, start, end, opts);
  } else {
    ev.setTitle(title); ev.setDescription(desc); ev.setLocation(loc);
    if (allDay) ev.setAllDayDates(start, end); else ev.setTime(start, end);
    const want = {}; guests.forEach(m => { want[m] = 1; });
    const have = {}; ev.getGuestList().forEach(g => { have[String(g.getEmail()).toLowerCase()] = 1; });
    Object.keys(want).forEach(m => { if (!have[m]) ev.addGuest(m); });
    Object.keys(have).forEach(m => { if (!want[m]) ev.removeGuest(m); });
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
    SpreadsheetApp.flush();
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
    SpreadsheetApp.flush();
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
    SpreadsheetApp.flush();
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
  return arr.filter(x => x && PEN_KINDS_[x.kind]).slice(0, 100).map(x => ({ id: str_(x.id, 40), crewId: str_(x.crewId, 64), kind: x.kind, pct: int_(x.pct, 0, 100, 0),
    amount: int_(x.amount, 0, FEE_MAX, 0), caseText: str_(x.caseText, 300), reason: str_(x.reason, 3000), link: str_(x.link, 500),
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
    SpreadsheetApp.flush();
    return { list: list, p: p, res: res };
  });
}
function penAmount_(p, x) {   // a levont összeg forintban
  if (x.kind === 'damage') return x.amount;
  const f = parseFees_(p.fees).find(r => r.crewId === x.crewId);
  return Math.round((f ? Number(f.amount) || 0 : 0) * x.pct / 100);
}
function penMailCrew_(u, p, x) {
  try {
    const c = readAll_('crew').find(r => r.id === x.crewId); if (!c || !c.email) return false;
    const k = PEN_KINDS_[x.kind], amt = penAmount_(p, x), url = FRONTEND_URL + '/#p=' + p.id;
    const lines = ['Kedves ' + c.name + '!', '', 'A(z) „' + p.name + '” projekten (' + (fmtHuDate_(p.date) || p.date || '') + ') a megbízási szerződés minőségi mellékletének ' + k.ref + ' pontja alapján díjcsökkentés történt.', '',
      'Kategória: ' + k.label + (x.kind === 'damage' ? '' : ' (' + x.pct + '%)'), x.kind === 'damage' ? 'Kártérítés összege: ' + amt.toLocaleString('hu-HU') + ' Ft' : 'Levont összeg: ' + amt.toLocaleString('hu-HU') + ' Ft',
      x.caseText ? 'Eset: ' + x.caseText : '', '', 'Indoklás:', x.reason, x.link ? '\nBizonyíték: ' + x.link : '', '',
      'Ha nem értesz egyet, a projekt oldalán a „Kifogásolom” gombbal írásban jelezheted: ' + url, '', 'Üdvözlettel:', 'Lumos Motion'].filter((l, i, a) => l !== '' || a[i - 1] !== '');
    const html = lines.map(l => escapeHtml_(l)).join('<br>');
    GmailApp.sendEmail(c.email, 'Díjcsökkentés – ' + p.name, lines.join('\n'), mailOptsFor_(u, html));
    return true;
  } catch (e) { Logger.log('Díjcsökkentés e-mail hiba: ' + e); return false; }
}
function penMailAdmins_(u, subject, text) {
  try {
    const to = loadUsers_().filter(x => x.role === 'admin' && !x.disabled && x.email).map(x => x.email);
    if (to.length) GmailApp.sendEmail(to.join(','), subject, text, mailOptsFor_(u, escapeHtml_(text).replace(/\n/g, '<br>')));
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
  const x = { id: Utilities.getUuid().slice(0, 12), crewId: str_(a.crewId, 64), kind: kind, pct: pct, amount: amount, caseText: str_(a.caseText, 300), reason: reason, link: link,
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
function saveClient_(u, a) {
  if (!a || typeof a !== 'object') throw new Error('Hiányos adatok.');
  const id = str_(a.id, 64);
  if (!ID_RE.test(id)) throw new Error('Hibás azonosító.');
  const c = { id: id, name: str_(a.name, 160).replace(/\s+/g, ' '), tax: str_(a.tax, 20).replace(/[^\d-]/g, ''), address: str_(a.address, 300),
    contactName: str_(a.contactName, 120), contactPhone: str_(a.contactPhone, 40), contactEmail: str_(a.contactEmail, 160).toLowerCase(), note: str_(a.note, 1000) };
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
    SpreadsheetApp.flush();
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
    sh.deleteRow(row); SpreadsheetApp.flush();
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
    SpreadsheetApp.flush();
    logEvent_(u, 'Eszköz törölve', old.name, '');
    return { deleted: true, id: id };
  });
}

/* ===================== ESZKÖZLISTA KIKÜLDÉSE ===================== */
/** A levél feladója admin@ (ha be van állítva aliasként), a megjelenő név a küldő kolléga, a válasz hozzá megy. */
function mailOptsFor_(u, html) {
  const opts = { htmlBody: html, name: (u && u.name ? u.name + ' · ' : '') + 'Lumos Motion', replyTo: (u && u.email) || MAIL_REPLY_TO };
  try { if (GmailApp.getAliases().indexOf(MAIL_FROM) >= 0) opts.from = MAIL_FROM; } catch (e) {}
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
      eqTxt += '☐ ' + x.qty + '× ' + x.it.name + (x.it.serial ? ' (' + x.it.serial + ')' : '') + (x.who ? ' – ' + x.who : '') + (x.it.location ? ' – hol van: ' + x.it.location : '') + '\n';
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
  const info = [['Időpont', dateTxt], ['Érkezés', p.startTime], ['Helyszín', p.venue], ['Kapcsolattartó', [p.contactName, p.contactPhone].filter(Boolean).join(', ')]].filter(x => x[1]);
  const infoHtml = info.map(x => '<tr><td style="padding:3px 14px 3px 0;color:#5f7381;white-space:nowrap">' + x[0] + '</td><td style="padding:3px 0"><b>' + e(x[1]) + '</b></td></tr>').join('');
  const planHtml = includePlan && (p.techPlan || p.notes) ? '<h3 style="font-size:15px;margin:24px 0 6px">Forgatási és technikai terv</h3><div style="white-space:pre-wrap">' + e(p.techPlan || '—') + '</div>' + (p.notes ? '<h3 style="font-size:15px;margin:18px 0 6px">Jegyzetek</h3><div style="white-space:pre-wrap">' + e(p.notes) + '</div>' : '') : '';
  const planTxt = includePlan && (p.techPlan || p.notes) ? '\nFORGATÁSI ÉS TECHNIKAI TERV\n' + (p.techPlan || '—') + (p.notes ? '\n\nJEGYZETEK\n' + p.notes : '') + '\n' : '';
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
      + '<table style="border-collapse:collapse;font-size:14px">' + infoHtml + '</table>'
      + '<p style="margin:10px 0 0">A te szereped: <b>' + e(onProject[cid].join(', ')) + '</b></p>'
      + (mine(cid).length ? '<p style="margin:10px 0 0;padding:10px 12px;background:#e8f2ec;border-radius:10px"><b>Nálad lesz:</b> ' + e(mine(cid).join(', ')) + '</p>' : '')
      + (pNotes[cid] ? '<p style="margin:10px 0 0;padding:10px 12px;background:#fff6e0;border-radius:10px"><b>Neked szóló megjegyzés:</b><br>' + e(pNotes[cid]).replace(/\n/g, '<br>') + '</p>' : '')
      + '<h3 style="font-size:15px;margin:24px 0 2px">Eszközlista</h3><table style="border-collapse:collapse;width:100%;font-size:14px">' + eqHtml + '</table>'
      + '<h3 style="font-size:15px;margin:24px 0 6px">Stáb</h3><table style="border-collapse:collapse;font-size:14px">' + crewHtml + '</table>'
      + planHtml
      + (sig ? '<div style="margin-top:26px">' + sig.html + '</div></div>' : '<p style="margin-top:26px">Üdvözlettel,<br>' + e(u.name) + '<br>Lumos Motion</p></div>');
    const text = 'Szia ' + first + '!\n\n' + (message || ((resend ? 'Frissült' : 'Itt az') + ' eszközlista a következő forgatáshoz:')) + '\n\n' + p.name + '\n'
      + info.map(x => x[0] + ': ' + x[1]).join('\n') + '\nA te szereped: ' + onProject[cid].join(', ') + (mine(cid).length ? '\nNálad lesz: ' + mine(cid).join(', ') : '') + (pNotes[cid] ? '\nNeked szóló megjegyzés: ' + pNotes[cid] : '') + '\n\nESZKÖZLISTA' + eqTxt + '\nSTÁB\n' + crewTxt + '\n' + planTxt
      + '\n' + (sig ? sig.text : 'Üdvözlettel,\n' + u.name + '\nLumos Motion');
    const opts = mailOptsFor_(u, html);
    if (u.email && String(u.email).toLowerCase() !== String(c.email).toLowerCase()) opts.cc = u.email;
    GmailApp.sendEmail(c.email, subject, text, opts);
    sentTo.push(c.name);
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
  try {
    const sh = logSheet_();
    const rg = sh.getRange(sh.getLastRow() + 1, 1, 1, LOG_HEADERS.length);
    rg.setNumberFormat('@');
    rg.setValues([[now_(), u ? u.name : '', u ? (ROLE_NAMES_[u.role] || u.role) + (u.realRole ? ' (ügyvezetői előnézet)' : '') : '', action, cell_(subject || ''), cell_(String(details || '').slice(0, 2000))]]);
  } catch (e) { Logger.log('Napló hiba: ' + e); }
}
function getLog_() {
  const sh = logSheet_(), n = sh.getLastRow();
  if (n < 2) return [];
  const from = Math.max(2, n - 299);
  return sh.getRange(from, 1, n - from + 1, LOG_HEADERS.length).getDisplayValues().reverse()
    .map(r => ({ at: r[0], who: r[1], role: r[2], action: r[3], subject: String(r[4]).replace(/^'/, ''), details: String(r[5]).replace(/^'/, '') }));
}

/* ===================== FELHASZNÁLÓK ÉS BELÉPÉS (a Sales App mintájára) ===================== */
const USERS_PROPERTY = 'LUMOS_PM_USERS_V1';
const SESSION_PREFIX = 'LUMOS_PM_SESS_';
const LOCK_PREFIX = 'LUMOS_PM_LOCK_';
const ROLES = ['admin', 'editor', 'crew'];   // Ügyvezető, Termelési vezető, Szakember (csak a saját beosztásait látja, nem szerkeszt)
const ROLE_NAMES_ = { admin: 'Ügyvezető', editor: 'Termelési vezető', crew: 'Szakember' };
const SESSION_DAYS_BY_ROLE = { admin: 7, editor: 30, crew: 30 };
const LOCK_STEPS_MIN = [15, 60, 360, 1440];

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
function pinHash_(salt, pin) { return sha256hex_(salt + ':' + pin); }
function sameName_(a, b) { return String(a || '').trim().toLocaleLowerCase('hu-HU') === String(b || '').trim().toLocaleLowerCase('hu-HU'); }
function loadUsers_() {
  try { const a = JSON.parse(PropertiesService.getScriptProperties().getProperty(USERS_PROPERTY) || '[]'); return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
}
function saveUsers_(users) {
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
function newUserRecord_(name, role, crewId, pin, email) {
  const salt = Utilities.getUuid();
  return { id: Utilities.getUuid(), name: name, role: role, crewId: crewId || '', email: String(email || ''), salt: salt, hash: pinHash_(salt, pin), disabled: false, createdAt: new Date().toISOString() };
}
function genPin_() {
  let digits = '';
  while (digits.length < 6) digits += (Utilities.getUuid() + Utilities.getUuid()).replace(/\D/g, '');
  return digits.slice(0, 6);
}
function escapeHtml_(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function appUrl_() { return FRONTEND_URL; }
/* Személyes e-mail-aláírások (a küldő e-mail-címe szerint). A képek a projekttervezo.lumosmotion.hu/sig/ alól töltődnek. */
const SIGNATURES = {
  'ervin.egri@lumosmotion.com': {
    html: "<table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"border-collapse:collapse;width:375px;font-family:Arial,Helvetica,sans-serif;color:#111111;\" width=\"375\"><tr><td colspan=\"2\" style=\"padding:0 0 5pt 0;font-family:Arial,Helvetica,sans-serif;font-size:10pt;line-height:12pt;color:#111111;\">Üdvözlettel,</td></tr><tr><td style=\"width:116px;padding:8px 0 8px 8px;vertical-align:middle;background:#f2f2f2;border-left:4px solid #111111;\" valign=\"middle\" width=\"116\"><img alt=\"ervin.jpg\" height=\"108\" src=\"https://projekttervezo.lumosmotion.hu/sig/ervin.jpg\" style=\"display:block;width:108px;height:108px;border:0;border-radius:54px;outline:none;text-decoration:none;\" width=\"108\"/></td><td style=\"padding:8px 8px 8px 0;vertical-align:middle;white-space:nowrap;background:#f2f2f2;font-family:Arial,Helvetica,sans-serif;color:#111111;\" valign=\"middle\"><div style=\"font-size:14pt;line-height:16.8pt;font-weight:700;margin:0 0 4pt 0;\">Egri Ervin</div><div style=\"font-size:10pt;line-height:12pt;margin:0 0 4pt 0;\">Ügyvezető igazgató</div><div style=\"font-size:10pt;line-height:12pt;font-weight:700;margin:0 0 4pt 0;\">Lumos Motion Kft.</div><div style=\"font-size:10pt;line-height:12pt;margin:0 0 4pt 0;\">Tel.: <a href=\"tel:+36706178235\" style=\"color:#1155cc;text-decoration:underline;\">+36 70 617 8235</a></div><div style=\"font-size:10pt;line-height:12pt;margin:0;\">Email: <a href=\"mailto:ervin.egri@lumosmotion.com\" style=\"color:#1155cc;text-decoration:underline;font-size:10pt;\">ervin.egri@lumosmotion.com</a></div></td></tr><tr><td colspan=\"2\" style=\"padding:6pt 0 0 0;\"><a href=\"https://lumosmotion.com/\" style=\"text-decoration:none;border:0;\"><img alt=\"lumosmotion.png\" height=\"23\" src=\"https://projekttervezo.lumosmotion.hu/sig/lumos-motion.png\" style=\"display:block;width:224px;height:23px;border:0;outline:none;text-decoration:none;background:#ffffff;\" width=\"224\"/></a></td></tr></table>",
    text: 'Üdvözlettel,\n\nEgri Ervin\nÜgyvezető igazgató\nLumos Motion Kft.\nTel.: +36 70 617 8235\nEmail: ervin.egri@lumosmotion.com\nhttps://lumosmotion.com/'
  }
};
const signatureFor_ = u => SIGNATURES[String((u && u.email) || '').toLowerCase()] || null;
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
  GmailApp.sendEmail(user.email, APP_TITLE + ' – meghívó', lines.join('\n'), opts);
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

function sendPinMail_(user, pin, isReset) {
  const url = appUrl_();
  const intro = isReset ? 'A kérésedre új PIN-kódot állítottunk be a ' + APP_TITLE + ' alkalmazáshoz. A régi PIN-kód ezzel érvénytelen.' : 'Beállítottuk a hozzáférésedet a ' + APP_TITLE + ' alkalmazáshoz.';
  const lines = ['Kedves ' + user.name + ',', '', intro, '',
    'E-mail-cím a belépésnél: ' + user.email, 'PIN-kód: ' + pin, ''];
  if (url) lines.push('Az alkalmazás: ' + FRONTEND_LABEL, '');
  lines.push('A PIN-kódot ne add tovább.' + (isReset ? ' Ha nem te kérted az új PIN-kódot, szólj az ügyvezetőnek.' : ''), '', MAIL_SIGNATURE_TEXT);
  const html = '<p>Kedves ' + escapeHtml_(user.name) + ',</p><p>' + escapeHtml_(intro) + '</p>'
    + '<p><b>E-mail-cím a belépésnél:</b> ' + escapeHtml_(user.email) + '<br><b>PIN-kód:</b> <span style="font-size:18px;letter-spacing:2px">' + escapeHtml_(pin) + '</span></p>'
    + (url ? '<p>Az alkalmazás: <a href="' + escapeHtml_(url) + '">' + escapeHtml_(FRONTEND_LABEL) + '</a></p>' : '')
    + '<p>A PIN-kódot ne add tovább.' + (isReset ? ' Ha nem te kérted az új PIN-kódot, szólj az ügyvezetőnek.' : '') + '</p><p>' + MAIL_SIGNATURE_HTML + '</p>';
  const opts = { htmlBody: html, name: 'Lumos Motion', replyTo: MAIL_REPLY_TO };
  try { if (GmailApp.getAliases().indexOf(MAIL_FROM) >= 0) opts.from = MAIL_FROM; } catch (e) {}
  GmailApp.sendEmail(user.email, APP_TITLE + (isReset ? ' – új PIN-kódod' : ' – belépési adataid'), lines.join('\n'), opts);
}

/** „Elfelejtettem a PIN-kódom”: új PIN-t állít be, és kiküldi a felhasználó e-mail-címére. Belépés nélkül hívható,
 *  ezért szűkített (felhasználónként 10 percenként 1, összesen óránként 30). A válasz nem árulja el, létezik-e az e-mail-cím. */
function requestPinReset(email) {
  if (!pinLoginEnabled_()) throw new Error(PIN_OFF_MSG);
  email = String(email || '').trim().toLowerCase();
  const GENERIC = { ok: true };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Írd be az e-mail-címed, utána kérj új PIN-kódot.');
  const cache = CacheService.getScriptCache();
  const hour = Number(cache.get('pm_pinreset_hour') || 0);
  if (hour >= 30) throw new Error('Túl sok kérés. Próbáld újra később, vagy szólj az ügyvezetőnek.');
  cache.put('pm_pinreset_hour', String(hour + 1), 3600);
  let user = null, pin = '', oldSalt = '', oldHash = '';
  withLock_(() => {
    const users = loadUsers_();
    const u = users.find(x => String(x.email || '').toLowerCase() === email && !x.disabled);
    if (!u) return;
    if (cache.get('pm_pinreset_' + u.id)) return;   // 10 percen belül már kiküldtük
    pin = genPin_(); oldSalt = u.salt; oldHash = u.hash;
    u.salt = Utilities.getUuid(); u.hash = pinHash_(u.salt, pin);
    saveUsers_(users);
    PropertiesService.getScriptProperties().deleteProperty(LOCK_PREFIX + u.id);   // a zárolás is feloldódik
    cache.put('pm_pinreset_' + u.id, '1', 600);
    user = u;
  });
  if (!user) { Utilities.sleep(700); return GENERIC; }
  try { sendPinMail_(user, pin, true); }
  catch (e) {
    // ha a levél nem ment ki, a régi PIN marad érvényben
    withLock_(() => { const users = loadUsers_(); const x = users.find(v => v.id === user.id); if (x) { x.salt = oldSalt; x.hash = oldHash; saveUsers_(users); } });
    cache.remove('pm_pinreset_' + user.id);
    throw new Error('Nem sikerült elküldeni az új PIN-kódot. Próbáld újra később, vagy szólj az ügyvezetőnek.');
  }
  logEvent_(user, 'PIN-visszaállítás', user.name, 'Új PIN kiküldve e-mailben: ' + user.email);
  return GENERIC;
}

/** EGYSZER FUTTATANDÓ a szerkesztőből: létrehozza a munkalapokat és a SETUP_USERS felhasználókat (új PIN-nel). */
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
      if (u) { Logger.log('Már létezik, kihagyva: ' + name + ' (' + r[1] + '). Új PIN-t az app Beállítások lapján adhatsz.'); return; }
      const pin = genPin_();
      u = newUserRecord_(name, r[1], '', pin, email);
      users.push(u);
      saveUsers_(users);
      Logger.log('Felhasználó létrehozva: ' + name + ' (' + r[1] + ') · vész-PIN: ' + pin);
      if (email) { try { sendInviteMail_(u); Logger.log('Meghívó elküldve: ' + email); } catch (e) { Logger.log('A meghívó nem ment ki: ' + e); } }
    });
  });
  Logger.log('Kész. A munkalapok: ' + Object.keys(TABLES).map(k => TABLES[k].tab).join(', ') + ', ' + LOG_TAB);
}

/** Régi felületek kompatibilitása miatt marad meg: a belépés már e-mail-címmel történik, ezért nem ad ki neveket. */
function getLoginNames() { return []; }

function cleanupSessions_(props) {
  const now = Date.now(), all = props.getProperties();
  Object.keys(all).forEach(k => {
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
function lockWait_(ms) { const m = Math.ceil(ms / 60000); return (m >= 60 && m % 60 === 0) ? (m / 60) + ' óra' : m + ' perc'; }
function lockState_(uid) {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(LOCK_PREFIX + uid) || 'null') || { fails: 0, level: 0, until: 0, last: 0 }; }
  catch (e) { return { fails: 0, level: 0, until: 0, last: 0 }; }
}
function lockSave_(uid, st) { PropertiesService.getScriptProperties().setProperty(LOCK_PREFIX + uid, JSON.stringify(st)); }

/** Belépés e-mail-címmel és PIN-nel. Hibás próbálkozásoknál lépcsőzetes zárolás (5 hiba után 15 perc, 1 óra, 6 óra, 24 óra). */
function login(email, pin) {
  if (!pinLoginEnabled_()) throw new Error(PIN_OFF_MSG);
  email = String(email || '').trim().toLowerCase(); pin = String(pin || '').trim();
  const u = email ? loadUsers_().find(x => String(x.email || '').toLowerCase() === email && !x.disabled) : null;
  const cache = CacheService.getScriptCache();
  const now = Date.now();
  if (!u) {
    if (cache.get('pm_llock_unknown')) throw new Error('Túl sok hibás próbálkozás. Próbáld újra 10 perc múlva.');
    Utilities.sleep(700);
    const n = Number(cache.get('pm_lfail_unknown') || 0) + 1;
    cache.put('pm_lfail_unknown', String(n), 600);
    if (n >= 10) cache.put('pm_llock_unknown', '1', 600);
    throw new Error('Hibás e-mail-cím vagy PIN.');
  }
  withLock_(() => {
    let st = lockState_(u.id);
    if (st.until > now) throw new Error('Túl sok hibás próbálkozás. Próbáld újra ' + lockWait_(st.until - now) + ' múlva.');
    if (st.last && now - st.last > 86400000) st = { fails: 0, level: 0, until: 0, last: 0 };
    if (!/^\d{6}$/.test(pin) || pinHash_(u.salt, pin) !== u.hash) {
      Utilities.sleep(700);
      st.fails = (st.fails || 0) + 1; st.last = now;
      let msg = 'Hibás e-mail-cím vagy PIN.';
      if (st.fails >= 5) {
        const mins = LOCK_STEPS_MIN[Math.min(st.level || 0, LOCK_STEPS_MIN.length - 1)];
        st.until = now + mins * 60000; st.level = (st.level || 0) + 1; st.fails = 0;
        msg = 'Túl sok hibás próbálkozás. Próbáld újra ' + lockWait_(mins * 60000) + ' múlva.';
      }
      lockSave_(u.id, st);
      throw new Error(msg);
    }
    if (st.fails || st.level || st.until) PropertiesService.getScriptProperties().deleteProperty(LOCK_PREFIX + u.id);
  });
  return createSession_(u, 'Belépés');
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
  let pin = String(a.pin || '').trim();
  const email = String(a.email || '').trim().toLowerCase();
  let sendPin = a.sendPin === true;
  const googleOnly = a.loginMode === 'google' || !pinLoginEnabled_();   // új kolléga Google-fiókkal lép be: PIN-t nem küldünk, csak meghívót
  if (googleOnly) { sendPin = false; pin = ''; }
  if (name.length < 2 || name.length > 60) throw new Error('A név 2–60 karakter lehet.');
  if (ROLES.indexOf(role) < 0) throw new Error('Válassz szerepkört: Ügyvezető, Termelési vezető vagy Szakember.');
  if (role === 'crew' && !crewId) throw new Error('Szakembernél válaszd ki, melyik munkatárs a stáblistában – csak az ő beosztásait fogja látni.');
  if (pin && !/^\d{6}$/.test(pin)) throw new Error('A PIN pontosan 6 számjegy legyen.');
  if (!email || email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Érvényes e-mail-cím szükséges: ezzel lép be a felhasználó.');
  let target = null, mailPin = '', list = null, isNew = false;
  withLock_(() => {
    const users = loadUsers_();
    if (users.some(u => u.id !== a.id && String(u.email || '').toLowerCase() === email)) throw new Error('Ezzel az e-mail-címmel már van felhasználó.');
    if (role === 'admin' && users.some(u => u.id !== a.id && u.role === 'admin')) throw new Error('Csak egy ügyvezető lehet. Válassz Termelési vezető vagy Szakember szerepkört.');
    let u = a.id ? users.find(x => x.id === a.id) : null;
    if (a.id && !u) throw new Error('A felhasználó nem található.');
    if (!u && !pin && !email) throw new Error('Új felhasználónál adj meg e-mail-címet (ide megy a PIN), vagy írj be egy PIN-t.');
    if (sendPin && !email) throw new Error('A PIN e-mailes kiküldéséhez e-mail-cím szükséges.');
    if (!u) { if (!pin) { pin = genPin_(); if (!googleOnly) sendPin = true; } }
    else if (sendPin && !pin) pin = genPin_();
    if (!u) {
      u = newUserRecord_(name, role, crewId, pin, email);
      users.push(u);
    } else {
      const willDisable = a.disabled === true;
      if (u.role === 'admin' && !u.disabled && (role !== 'admin' || willDisable) && users.filter(x => x.role === 'admin' && !x.disabled).length < 2)
        throw new Error('Legalább egy aktív ügyvezetőnek maradnia kell.');
      const roleChanged = u.role !== role;
      u.name = name; u.role = role; u.crewId = crewId; u.disabled = willDisable; u.email = email;
      if (pin) { u.salt = Utilities.getUuid(); u.hash = pinHash_(u.salt, pin); }
      if (pin || willDisable || roleChanged) revokeSessionsOf_(u.id);
    }
    saveUsers_(users);
    target = u; mailPin = googleOnly ? '' : pin;
    isNew = !a.id;
    list = users.map(adminListUser_);
  });
  let mail = null;
  if (sendPin && target && target.email) {
    try { sendPinMail_(target, mailPin); mail = { sent: true, to: target.email }; }
    catch (e) { mail = { sent: false, to: target.email, error: String((e && e.message) || e), pin: mailPin }; }
  } else if (sendPin && mailPin) mail = { sent: false, to: '', error: 'Nincs e-mail-cím.', pin: mailPin };
  else if (googleOnly && isNew && a.sendInvite !== false && target && target.email) {
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

/** Saját PIN módosítása belépve: a régi PIN-t ellenőrizzük (hibás próbálkozásnál ugyanaz a zárolás, mint belépéskor),
 *  a többi eszközön a munkamenetek megszűnnek, az aktuális megmarad. */
function changePin_(u, a, token) {
  const oldPin = String(a && a.oldPin || '').trim(), newPin = String(a && a.newPin || '').trim();
  if (!/^\d{6}$/.test(newPin)) throw new Error('Az új PIN pontosan 6 számjegy legyen.');
  if (/^(\d)\1{5}$/.test(newPin) || '0123456789'.indexOf(newPin) >= 0 || '9876543210'.indexOf(newPin) >= 0) throw new Error('Túl egyszerű PIN (pl. 111111 vagy 123456). Válassz másikat.');
  if (oldPin === newPin) throw new Error('Az új PIN nem lehet ugyanaz, mint a régi.');
  const now = Date.now();
  withLock_(() => {
    const users = loadUsers_(), x = users.find(v => v.id === u.id);
    if (!x) throw new Error('AUTH_REQUIRED');
    let st = lockState_(x.id);
    if (st.until > now) throw new Error('Túl sok hibás próbálkozás. Próbáld újra ' + lockWait_(st.until - now) + ' múlva.');
    if (!/^\d{6}$/.test(oldPin) || pinHash_(x.salt, oldPin) !== x.hash) {
      Utilities.sleep(700);
      st.fails = (st.fails || 0) + 1; st.last = now;
      let msg = 'A jelenlegi PIN nem jó.';
      if (st.fails >= 5) {
        const mins = LOCK_STEPS_MIN[Math.min(st.level || 0, LOCK_STEPS_MIN.length - 1)];
        st.until = now + mins * 60000; st.level = (st.level || 0) + 1; st.fails = 0;
        msg = 'Túl sok hibás próbálkozás. Próbáld újra ' + lockWait_(mins * 60000) + ' múlva.';
      }
      lockSave_(x.id, st);
      throw new Error(msg);
    }
    x.salt = Utilities.getUuid(); x.hash = pinHash_(x.salt, newPin);
    saveUsers_(users);
    PropertiesService.getScriptProperties().deleteProperty(LOCK_PREFIX + x.id);
  });
  const keep = SESSION_PREFIX + sha256hex_(String(token)), props = PropertiesService.getScriptProperties(), all = props.getProperties();
  Object.keys(all).forEach(k => { if (k.indexOf(SESSION_PREFIX) === 0 && k !== keep) { try { if (JSON.parse(all[k]).uid === u.id) props.deleteProperty(k); } catch (e) {} } });
  logEvent_(u, 'PIN módosítva', u.name, 'saját PIN, a többi eszközön kiléptetve');
  return { ok: true };
}

/* ===================== AZ EGYETLEN BELÉPÉSI PONT A KLIENSBŐL ===================== */
const READ_ONLY_RPC_ = { whoAmI: 1, bootstrap: 1, calendarEvents: 1, getLog: 1, listUsers: 1, setViewAs: 1, logout: 1, lookupTaxpayer: 1, hubspotContacts: 1 };   // ezek nem módosítják a projektadatokat
function rpc(token, name, arg) {
  const res = rpcInner_(token, name, arg);
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
    case 'changePin': if (!pinLoginEnabled_()) throw new Error(PIN_OFF_MSG); return changePin_(u, arg, token);
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
    case 'objectPenalty': if (role !== 'crew' || !u.crewId) deny(); return objectPenalty_(u, arg);
    case 'deleteClient': canEdit(); return deleteClient_(u, arg);
    case 'getLog': adminOnly(); return getLog_();
    case 'listUsers': adminOnly(); return loadUsers_().map(adminListUser_);
    case 'saveUser': {
      adminOnly();
      const res = saveUser_(arg);
      const a = arg || {};
      logEvent_(u, 'Felhasználó mentve', String(a.name || ''), (a.id ? 'módosítva' : 'új') + ' · ' + (ROLE_NAMES_[a.role] || a.role) + (a.disabled === true ? ' · letiltva' : '') + (res.mail && res.mail.sent ? (res.mail.invite ? ' · Google-meghívó kiküldve' : ' · PIN e-mailben kiküldve') : ''));
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
