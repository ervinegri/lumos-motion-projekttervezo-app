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
const EVENT_TYPES = ['Konferencia', 'Céges rendezvény', 'Gála, díjátadó', 'Kiállítás, expo', 'Termékbemutató', 'Sportesemény', 'Koncert', 'Egyéb'];
const CREW_ROLES = ['Projektvezető', 'Operatőr', 'Vágó', 'Fotós', 'Drónpilóta', 'Hangtechnikus', 'Fénytechnikus', 'Képkeverő / streaming', 'Sofőr / rakodó'];
const CREW_TYPES = ['Belsős', 'Állandó külsős', 'Alkalmi freelancer'];
const CREW_SKILLS = ['Statív', 'Gimbal', 'Előadásvágás', 'Kreatív vágás', 'Werk', 'Saját kamera', 'Eszközbérlés'];
const INV_CATS = ['Kamera', 'Objektív', 'Hang', 'Fény', 'Drón', 'Képkeverés / stream', 'GoPro / akciókamera', 'Gimbal / állvány', 'Akku / powerbank / táp', 'Adathordozó', 'Laptop / tablet / telefon', 'Kocsi / szállítás', 'Kábel', 'Egyéb'];
const CONDITIONS = ['ok', 'javitas', 'szerviz', 'selejt'];
const COUNTS = { aftermovie: 3, interju: 8, short30: 15, short15: 15 };
const FLAGS = ['x_vago', 'x_dron', 'x_timelapse', 'x_pov', 'x_foto', 'x_nyersVetel', 'x_nyersTarolas', 'x_rush', 't_eloadas', 't_kepkeveres', 't_hang', 't_feny'];

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
    ['calEventId', 'Naptár esemény azonosító']] },
  crew: { tab: 'Stáb', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['name', 'Név'], ['roles', 'Szerepek'], ['type', 'Jogviszony'], ['phone', 'Telefon'],
    ['email', 'E-mail'], ['dayRate', 'Napidíj (nettó Ft)'], ['note', 'Megjegyzés'], ['createdAt', 'Létrehozva'], ['updatedAt', 'Módosítva'],
    ['priority', 'Prioritás (1–3)'], ['company', 'Vállalkozás'], ['skills', 'Részletek']] },
  inventory: { tab: 'Leltár', cols: [
    ['id', 'Azonosító (ne módosítsd)'], ['name', 'Megnevezés'], ['category', 'Kategória'], ['qty', 'Darab'], ['condition', 'Állapot'],
    ['serial', 'Azonosító / sorozatszám'], ['value', 'Beszerzési érték / db (Ft)'], ['note', 'Megjegyzés'], ['createdAt', 'Létrehozva'], ['updatedAt', 'Módosítva'],
    ['location', 'Tárolási hely']] },
  crewAssign: { tab: 'Stábbeosztás', assign: true, cols: [
    ['projectId', 'Projekt azonosító'], ['crewId', 'Munkatárs azonosító'], ['role', 'Szerep'], ['projectName', 'Projekt'], ['crewName', 'Munkatárs']] },
  eqAssign: { tab: 'Eszközbeosztás', assign: true, cols: [
    ['projectId', 'Projekt azonosító'], ['itemId', 'Eszköz azonosító'], ['qty', 'Darab'], ['projectName', 'Projekt'], ['itemName', 'Eszköz']] }
};
const NUM_FIELDS = new Set(['priority', 'hours', 'aftermovie', 'interju', 'short30', 'short15', 'quotePrice', 'dayRate', 'qty', 'value']);
const BOOL_FIELDS = new Set(FLAGS);
const DATE_FIELDS = new Set(['date', 'endDate', 'deliveredAt']);
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

function sheetFor_(key) {
  const t = TABLES[key];
  const ss = ss_();
  let sh = ss.getSheetByName(t.tab);
  if (!sh) sh = ss.insertSheet(t.tab);
  ensureHeader_(sh, t.cols.map(c => c[1]), t.tab);
  return sh;
}

function ensureHeader_(sh, labels, tabName) {
  if (sh.getMaxColumns() < labels.length) sh.insertColumnsAfter(sh.getMaxColumns(), labels.length - sh.getMaxColumns());
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
function bootstrap_(u) {
  const projects = readAll_('projects');
  const crew = readAll_('crew');
  const inventory = readAll_('inventory');
  const byP = {};
  projects.forEach(p => { p.crew = []; p.equipment = []; delete p.mutationId; delete p.quotePrice; byP[p.id] = p; });   // árakat az app senkinek nem küld
  readAll_('crewAssign').forEach(r => { if (byP[r.projectId]) byP[r.projectId].crew.push({ crewId: r.crewId, role: r.role }); });
  readAll_('eqAssign').forEach(r => { if (byP[r.projectId]) byP[r.projectId].equipment.push({ itemId: r.itemId, qty: r.qty || 1 }); });
  const out = {
    me: publicUser_(u), projects: projects, crew: crew, inventory: inventory,
    links: { folder: 'https://drive.google.com/drive/folders/' + PROJECTS_FOLDER_ID, sheet: 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/edit' },
    serverTime: now_()
  };
  if (u.role !== 'admin') {
    // a beszerzési értéket csak az ügyvezető látja (a termelési vezető megadhatja, de visszaolvasni nem tudja)
    out.inventory = inventory.map(i => Object.assign({}, i, { value: null, hasValue: i.value != null && i.value !== '' }));
  }
  if (u.role === 'crew') {
    const cid = String(u.crewId || '');
    out.projects = projects.filter(p => cid && (p.lead === cid || p.crew.some(c => c.crewId === cid)));
    out.crew = crew.map(c => Object.assign({}, c, { dayRate: null }));
    out.inventory = inventory.map(i => Object.assign({}, i, { value: null }));
    delete out.links.sheet;
  }
  return out;
}

function fullProject_(p) {
  const q = Object.assign({}, p);
  q.crew = readAll_('crewAssign').filter(r => r.projectId === p.id).map(r => ({ crewId: r.crewId, role: r.role }));
  q.equipment = readAll_('eqAssign').filter(r => r.projectId === p.id).map(r => ({ itemId: r.itemId, qty: r.qty || 1 }));
  delete q.mutationId; delete q.quotePrice;
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
    quotePrice: null,   // a Projekttervező nem kezel árakat
    contactName: str_(a.contactName, 120), contactPhone: str_(a.contactPhone, 40), contactEmail: str_(a.contactEmail, 160).toLowerCase(),
    techPlan: str_(a.techPlan, 5000), notes: str_(a.notes, 5000), deliveryLink: str_(a.deliveryLink, 500), deliveredAt: iso_(a.deliveredAt)
  };
  if (p.name.length < 2) throw new Error('Add meg a projekt nevét (legalább 2 karakter).');
  if (p.endDate && (!p.date || p.endDate < p.date)) p.endDate = '';
  if (p.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.contactEmail)) throw new Error('A kapcsolattartó e-mail-címe érvénytelen.');
  if (p.deliveryLink && !/^https:\/\//i.test(p.deliveryLink)) throw new Error('Az átadási link https:// előtaggal kezdődjön.');
  Object.keys(COUNTS).forEach(k => { p[k] = int_(a[k], 0, COUNTS[k], 0); });
  FLAGS.forEach(k => { p[k] = a[k] === true; });
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
    eqIn.forEach(x => { const iid = str_(x && x.itemId, 64); if (invMap[iid]) eqm[iid] = Math.min(999, (eqm[iid] || 0) + int_(x.qty, 1, 999, 1)); });
    const equipment = Object.keys(eqm).map(k => ({ itemId: k, qty: eqm[k] }));

    const sh = sheetFor_('projects');
    const row = findRow_(sh, id);
    let old = null;
    if (row) {
      old = readRow_('projects', sh, row);
      if (old.mutationId === mutationId) return fullProject_(old);   // megismételt kérés
      if (old.updatedAt !== str_(a.baseUpdatedAt, 30)) throw new Error('CONFLICT: Közben valaki más is módosította ezt a projektet.');
      p.createdAt = old.createdAt; p.folderId = old.folderId; p.listSentAt = old.listSentAt; p.listSentTo = old.listSentTo; p.calEventId = old.calEventId;
    } else {
      if (a.baseUpdatedAt) throw new Error('Ezt a projektet közben törölték.');
      const calId = str_(a.calEventId, 200);
      if (calId) { const dup = readAll_('projects').find(x => x.calEventId === calId); if (dup) return Object.assign(fullProject_(dup), { duplicateOf: true }); }   // ugyanabból a naptáreseményből már van projekt
      p.createdAt = now_(); p.folderId = ''; p.listSentAt = ''; p.listSentTo = ''; p.calEventId = str_(a.calEventId, 200);   // naptárból importált projekt
    }
    p.updatedAt = now_(); p.updatedBy = u.name; p.mutationId = mutationId;
    putRow_('projects', sh, p, row);
    rewriteAssign_('crewAssign', r => r.projectId !== id,
      crew.map(c => ({ projectId: id, crewId: c.crewId, role: c.role, projectName: p.name, crewName: crewMap[c.crewId].name })));
    rewriteAssign_('eqAssign', r => r.projectId !== id,
      equipment.map(e => ({ projectId: id, itemId: e.itemId, qty: e.qty, projectName: p.name, itemName: invMap[e.itemId].name })));
    SpreadsheetApp.flush();
    logEvent_(u, old ? 'Projekt módosítva' : 'Projekt létrehozva', p.name, old ? diffProject_(old, p) : (p.date ? 'Dátum: ' + p.date : ''));
    const out = Object.assign({}, p, { crew: crew, equipment: equipment });
    delete out.mutationId;
    return out;
  });
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
  const eqLines = (p.equipment || []).filter(e => invMap[e.itemId]).map(e => '☐ ' + e.qty + '× ' + invMap[e.itemId].name);
  const lines = [];
  if (p.status) lines.push('Állapot: ' + (STATUS_LABELS[p.status] || p.status));
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
      ev.setTitle(title); ev.setDescription(plan.description); ev.setLocation(p.venue || '');
      if (allDay) ev.setAllDayDates(start, end); else ev.setTime(start, end);
      ev.setTag('lumosProjectId', p.id);
    }
    // vendégek: a beosztott stábtagok; a nem stábhoz tartozó vendégekhez (pl. ügyfél) nem nyúlunk
    const want = {}; plan.guests.forEach(m => { want[m] = 1; });
    const isCrew = {}; plan.crewEmails.forEach(m => { isCrew[m] = 1; });
    const have = {}; ev.getGuestList().forEach(g => { have[String(g.getEmail()).toLowerCase()] = 1; });
    Object.keys(want).forEach(m => { if (!have[m]) ev.addGuest(m); });
    Object.keys(have).forEach(m => { if (isCrew[m] && !want[m]) ev.removeGuest(m); });
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
  const cache = CacheService.getScriptCache(), key = 'pm_cal_' + from + '_' + to, hit = cache.get(key);
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
  try { cache.put(key, JSON.stringify(out), 60); } catch (e) {}
  return out;
}

/** Drive-mappa a Projektek / <év> / <projekt neve> helyen (ha már van ilyen nevű, azt használja). */
function createProjectFolder_(u, a) {
  const id = str_(a && a.id, 64);
  if (!ID_RE.test(id)) throw new Error('Hibás projektazonosító.');
  return withLock_(() => {
    const sh = sheetFor_('projects'), row = findRow_(sh, id);
    if (!row) throw new Error('A projekt nem található. Előbb mentsd el.');
    const p = readRow_('projects', sh, row);
    if (p.folderId) {
      try { const f = DriveApp.getFolderById(p.folderId); if (!f.isTrashed()) return { folderId: p.folderId, url: f.getUrl(), existed: true }; } catch (e) {}
    }
    const root = DriveApp.getFolderById(PROJECTS_FOLDER_ID);
    const year = (p.date || today_()).slice(0, 4);
    const yearFolder = childFolder_(root, year);
    const name = p.name.replace(/[\\/]/g, '-').trim() || 'Projekt';
    const folder = childFolder_(yearFolder, name);
    const col = TABLES.projects.cols.findIndex(c => c[0] === 'folderId') + 1;
    sh.getRange(row, col).setNumberFormat('@').setValue(folder.getId());   // a módosítás idejét szándékosan nem írjuk át
    SpreadsheetApp.flush();
    logEvent_(u, 'Projektmappa', p.name, year + ' / ' + name);
    return { folderId: folder.getId(), url: folder.getUrl(), existed: false };
  });
}

function childFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
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
  p.equipment.forEach(x => { const it = invMap[x.itemId]; if (!it) return; (byCat[it.category] = byCat[it.category] || []).push({ it: it, qty: x.qty }); });
  let eqHtml = '', eqTxt = '';
  INV_CATS.concat(Object.keys(byCat).filter(c => INV_CATS.indexOf(c) < 0)).forEach(cat => {
    const items = byCat[cat]; if (!items) return;
    eqHtml += '<tr><td colspan="2" style="padding:12px 0 4px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5f7381">' + e(cat) + '</td></tr>';
    eqTxt += '\n' + cat.toUpperCase() + '\n';
    items.forEach(x => {
      eqHtml += '<tr><td style="padding:5px 0;border-top:1px solid #e3e9ee;width:28px;font-size:16px">☐</td><td style="padding:5px 0;border-top:1px solid #e3e9ee"><b>' + x.qty + '×</b> ' + e(x.it.name) + (x.it.serial ? ' <span style="color:#5f7381">(' + e(x.it.serial) + ')</span>' : '') + (x.it.location ? '<br><span style="font-size:12px;color:#5f7381">Hol van: ' + e(x.it.location) + '</span>' : '') + '</td></tr>';
      eqTxt += '☐ ' + x.qty + '× ' + x.it.name + (x.it.serial ? ' (' + x.it.serial + ')' : '') + (x.it.location ? ' – hol van: ' + x.it.location : '') + '\n';
    });
  });
  if (!eqHtml) { eqHtml = '<tr><td style="color:#5f7381">Ehhez a projekthez még nincs eszköz rendelve.</td></tr>'; eqTxt = '\n(nincs eszköz rendelve)\n'; }
  const crewRows = Object.keys(onProject).filter(cid => crewMap[cid]).map(cid => ({ c: crewMap[cid], roles: onProject[cid] }));
  const crewHtml = crewRows.map(r => '<tr><td style="padding:4px 12px 4px 0"><b>' + e(r.c.name) + '</b></td><td style="padding:4px 12px 4px 0;color:#5f7381">' + e(r.roles.join(', ')) + '</td><td style="padding:4px 0">' + e(r.c.phone || '') + '</td></tr>').join('');
  const crewTxt = crewRows.map(r => '• ' + r.c.name + ' – ' + r.roles.join(', ') + (r.c.phone ? ' – ' + r.c.phone : '')).join('\n');
  const info = [['Időpont', dateTxt], ['Érkezés', p.startTime], ['Helyszín', p.venue], ['Ügyfél', p.client], ['Kapcsolattartó', [p.contactName, p.contactPhone].filter(Boolean).join(', ')]].filter(x => x[1]);
  const infoHtml = info.map(x => '<tr><td style="padding:3px 14px 3px 0;color:#5f7381;white-space:nowrap">' + x[0] + '</td><td style="padding:3px 0"><b>' + e(x[1]) + '</b></td></tr>').join('');
  const planHtml = includePlan && (p.techPlan || p.notes) ? '<h3 style="font-size:15px;margin:24px 0 6px">Forgatási és technikai terv</h3><div style="white-space:pre-wrap">' + e(p.techPlan || '—') + '</div>' + (p.notes ? '<h3 style="font-size:15px;margin:18px 0 6px">Jegyzetek</h3><div style="white-space:pre-wrap">' + e(p.notes) + '</div>' : '') : '';
  const planTxt = includePlan && (p.techPlan || p.notes) ? '\nFORGATÁSI ÉS TECHNIKAI TERV\n' + (p.techPlan || '—') + (p.notes ? '\n\nJEGYZETEK\n' + p.notes : '') + '\n' : '';
  const sentTo = [];
  recipients.forEach(cid => {
    const c = crewMap[cid];
    const first = String(c.name).trim().split(/\s+/).slice(-1)[0];
    const html = '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#173042;font-size:14px;line-height:1.5;max-width:640px">'
      + '<p>Szia ' + e(first) + '!</p>'
      + (message ? '<p style="white-space:pre-wrap">' + e(message) + '</p>' : '<p>' + (resend ? 'Frissült' : 'Itt az') + ' eszközlista a következő forgatáshoz:</p>')
      + '<h2 style="font-size:20px;margin:18px 0 8px">' + e(p.name) + '</h2>'
      + '<table style="border-collapse:collapse;font-size:14px">' + infoHtml + '</table>'
      + '<p style="margin:10px 0 0">A te szereped: <b>' + e(onProject[cid].join(', ')) + '</b></p>'
      + '<h3 style="font-size:15px;margin:24px 0 2px">Eszközlista</h3><table style="border-collapse:collapse;width:100%;font-size:14px">' + eqHtml + '</table>'
      + '<h3 style="font-size:15px;margin:24px 0 6px">Stáb</h3><table style="border-collapse:collapse;font-size:14px">' + crewHtml + '</table>'
      + planHtml
      + '<p style="margin-top:26px">A projekt az appban: <a href="' + e(FRONTEND_URL) + '">' + e(FRONTEND_LABEL) + '</a></p>'
      + '<p>Üdvözlettel,<br>' + e(u.name) + '<br>Lumos Motion</p></div>';
    const text = 'Szia ' + first + '!\n\n' + (message || ((resend ? 'Frissült' : 'Itt az') + ' eszközlista a következő forgatáshoz:')) + '\n\n' + p.name + '\n'
      + info.map(x => x[0] + ': ' + x[1]).join('\n') + '\nA te szereped: ' + onProject[cid].join(', ') + '\n\nESZKÖZLISTA' + eqTxt + '\nSTÁB\n' + crewTxt + '\n' + planTxt
      + '\nA projekt az appban: ' + FRONTEND_LABEL + '\n\nÜdvözlettel,\n' + u.name + '\nLumos Motion';
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
  const ss = ss_();
  let sh = ss.getSheetByName(LOG_TAB);
  if (!sh) {
    sh = ss.insertSheet(LOG_TAB);
    try { sh.protect().setDescription('A naplót csak a program írja').setWarningOnly(true); } catch (e) {}
  }
  ensureHeader_(sh, LOG_HEADERS, LOG_TAB);
  return sh;
}
function logEvent_(u, action, subject, details) {
  try {
    const sh = logSheet_();
    const rg = sh.getRange(sh.getLastRow() + 1, 1, 1, LOG_HEADERS.length);
    rg.setNumberFormat('@');
    rg.setValues([[now_(), u ? u.name : '', u ? (ROLE_NAMES_[u.role] || u.role) : '', action, cell_(subject || ''), cell_(String(details || '').slice(0, 2000))]]);
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
const ROLES = ['admin', 'editor'];   // Ügyvezető, Termelési vezető (a régi „crew” felhasználók csak olvasni tudnak, újat nem lehet felvenni)
const ROLE_NAMES_ = { admin: 'Ügyvezető', editor: 'Termelési vezető', crew: 'Stáb' };
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
function publicUser_(u) { return { id: u.id, name: u.name, role: u.role, crewId: String(u.crewId || '') }; }
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
const FRONTEND_LABEL = FRONTEND_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');   // a levelekben így látszik: projekttervezo.lumosmotion.hu

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
      Logger.log('Felhasználó létrehozva: ' + name + ' (' + r[1] + ') · PIN: ' + pin);
      if (email) { try { sendPinMail_(u, pin); Logger.log('PIN elküldve: ' + email); } catch (e) { Logger.log('A PIN e-mail nem ment ki: ' + e); } }
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
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  const exp = Date.now() + (SESSION_DAYS_BY_ROLE[u.role] || 2) * 86400000;
  const props = PropertiesService.getScriptProperties();
  cleanupSessions_(props);
  props.setProperty(SESSION_PREFIX + sha256hex_(token), JSON.stringify({ uid: u.id, exp: exp }));
  logEvent_(u, 'Belépés', '', '');
  return { token: token, exp: exp, user: publicUser_(u) };
}

function authUser_(token) {
  token = String(token || '');
  if (!/^[0-9a-f]{64}$/.test(token)) throw new Error('AUTH_REQUIRED');
  const raw = PropertiesService.getScriptProperties().getProperty(SESSION_PREFIX + sha256hex_(token));
  let s = null; try { s = raw ? JSON.parse(raw) : null; } catch (e) {}
  if (!s || s.exp < Date.now()) throw new Error('AUTH_REQUIRED');
  const u = loadUsers_().find(x => x.id === s.uid);
  if (!u || u.disabled) throw new Error('AUTH_REQUIRED');
  return u;
}

function saveUser_(arg) {
  const a = arg && typeof arg === 'object' ? arg : {};
  const name = String(a.name || '').trim().replace(/\s+/g, ' ');
  const role = String(a.role || '');
  const crewId = String(a.crewId || '').trim().slice(0, 64);
  let pin = String(a.pin || '').trim();
  const email = String(a.email || '').trim().toLowerCase();
  let sendPin = a.sendPin === true;
  if (name.length < 2 || name.length > 60) throw new Error('A név 2–60 karakter lehet.');
  if (ROLES.indexOf(role) < 0) throw new Error('Válassz szerepkört: Ügyvezető vagy Termelési vezető.');
  if (pin && !/^\d{6}$/.test(pin)) throw new Error('A PIN pontosan 6 számjegy legyen.');
  if (!email || email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Érvényes e-mail-cím szükséges: ezzel lép be a felhasználó.');
  let target = null, mailPin = '', list = null;
  withLock_(() => {
    const users = loadUsers_();
    if (users.some(u => u.id !== a.id && String(u.email || '').toLowerCase() === email)) throw new Error('Ezzel az e-mail-címmel már van felhasználó.');
    let u = a.id ? users.find(x => x.id === a.id) : null;
    if (a.id && !u) throw new Error('A felhasználó nem található.');
    if (!u && !pin && !email) throw new Error('Új felhasználónál adj meg e-mail-címet (ide megy a PIN), vagy írj be egy PIN-t.');
    if (sendPin && !email) throw new Error('A PIN e-mailes kiküldéséhez e-mail-cím szükséges.');
    if (!u) { if (!pin) { pin = genPin_(); sendPin = true; } }
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
    target = u; mailPin = pin;
    list = users.map(adminListUser_);
  });
  let mail = null;
  if (sendPin && target && target.email) {
    try { sendPinMail_(target, mailPin); mail = { sent: true, to: target.email }; }
    catch (e) { mail = { sent: false, to: target.email, error: String((e && e.message) || e), pin: mailPin }; }
  } else if (sendPin && mailPin) mail = { sent: false, to: '', error: 'Nincs e-mail-cím.', pin: mailPin };
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
function rpc(token, name, arg) {
  const u = authUser_(token);
  const role = u.role;
  const deny = () => { throw new Error('FORBIDDEN: ehhez nincs jogosultságod.'); };
  const canEdit = () => { if (role !== 'admin' && role !== 'editor') deny(); };
  const adminOnly = () => { if (role !== 'admin') deny(); };
  switch (String(name)) {
    case 'whoAmI': return publicUser_(u);
    case 'logout': PropertiesService.getScriptProperties().deleteProperty(SESSION_PREFIX + sha256hex_(String(token))); return { ok: true };
    case 'bootstrap': return bootstrap_(u);
    case 'calendarEvents': canEdit(); return calendarEvents_(arg);
    case 'changePin': return changePin_(u, arg, token);
    case 'saveProject': canEdit(); return saveProject_(u, arg);
    case 'deleteProject': canEdit(); return deleteProject_(u, arg);
    case 'createProjectFolder': canEdit(); return createProjectFolder_(u, arg);
    case 'sendEquipmentList': canEdit(); return sendEquipmentList_(u, arg);
    case 'saveCrew': canEdit(); return saveCrew_(u, arg);
    case 'deleteCrew': canEdit(); return deleteCrew_(u, arg);
    case 'saveItem': canEdit(); return saveItem_(u, arg);
    case 'deleteItem': canEdit(); return deleteItem_(u, arg);
    case 'getLog': adminOnly(); return getLog_();
    case 'listUsers': adminOnly(); return loadUsers_().map(adminListUser_);
    case 'saveUser': {
      adminOnly();
      const res = saveUser_(arg);
      const a = arg || {};
      logEvent_(u, 'Felhasználó mentve', String(a.name || ''), (a.id ? 'módosítva' : 'új') + ' · ' + (ROLE_NAMES_[a.role] || a.role) + (a.disabled === true ? ' · letiltva' : '') + (res.mail && res.mail.sent ? ' · PIN e-mailben kiküldve' : ''));
      return res;
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
