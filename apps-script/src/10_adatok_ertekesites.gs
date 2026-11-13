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
  if (P.getProperty('MIG_CALNOTES_2026_11_12')) return;   // 2026-11-12: a projekt jegyzetei kikerülnek a naptárbejegyzésekből   // 2026-11-03: a stáb telefonszáma kikerül (csak a projektvezetőé marad); a lemondott (STORNO) projektek eseményei is kikerülnek a Google Naptárból
  P.setProperty('MIG_CALNOTES_2026_11_12', now_());
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
      const noPost = !hasDeliverables_(q);   // csak helyszíni technika: nincs utómunka, rögtön kész
      q.prevStatus = 'helyszin'; q.status = noPost ? 'atadva' : 'utomunka';
      const sd = String(q.stepsDone || '').split(',').filter(String); (noPost ? ['helyszin', 'utomunka', 'leadva', 'jovahagyas'] : ['helyszin']).forEach(x => { if (sd.indexOf(x) < 0) sd.push(x); }); q.stepsDone = sd.join(',');
      q.updatedAt = now_(); q.updatedBy = 'Automatikus (a forgatás véget ért)'; putRow_('projects', sh, q, r); out.push(q.name); });
    if (out.length) { dbFlush_(); dataBump_(); }
    return out;
  });
  moved.forEach(n => logEvent_(null, 'Automatikus lépés', n, 'Helyszíni munka → Utómunka (a forgatás véget ért)'));
}
function calResyncUpcoming() {
  const today = today_();
  readAll_('projects').filter(p => p.calEventId && (p.status === 'lemondva' || String(p.endDate || p.date || '') >= today)).forEach(p => { try { syncCalendar_(fullProject_(p)); } catch (e) {} });
  try { ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'calResyncUpcoming').forEach(t => { try { ScriptApp.deleteTrigger(t); } catch (e) {} }); } catch (e) {}   // időzítő-jogosultság nélkül is lefut
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
  try { if (u && u.role === 'admin') { salesSyncEnsure_(); szDailyEnsure_(); } } catch (e) {}   // a Sales App szinkron időzítése (egyszer)
  /* 2026-11-04: nincs automatikus lépés – a Helyszíni munkából az Utómunkába is kézzel (áthúzással) lép a projekt */
  const base = loadBase_();
  const projects = base.projects, crew = base.crew, inventory = base.inventory;
  const out = {
    me: publicUser_(u), myNotify: (() => { try { return u.crewId ? crewNotifyOf_(readAll_('crew').find(x => x.id === u.crewId)) : null; } catch (e) { return null; } })(), projects: projects.map(p => projectView_(p, u)), crew: crew, inventory: inventory, clients: u.role === 'crew' ? [] : (base.clients || []),
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
  const dct = dealCtMap_(), bst = {}; try { readAll_('finBilling').forEach(b => { if (b.contractStatus) bst[b.projectId] = b.contractStatus; }); } catch (e) { }
  const ck = v => String(v || '').trim().toLowerCase(), tigC = {};   // visszatérő, TIG-gel (teljesítésigazolással) számlázott ügyfél vagy keretszerződés: nem kap díjbekérőt
  try { readAll_('finTig').forEach(x => { if (ck(x.client)) tigC[ck(x.client)] = 'tig'; }); readAll_('finFramework').forEach(x => { if (ck(x.client) && String(x.mode || '') !== 'nemkell') tigC[ck(x.client)] = 'keret'; }); } catch (e) { }
  return (u.role === 'admin' ? all : all.filter(d => d.ownerId === u.id)).map(d => Object.assign({}, d, { ctStatus: d.projectId && bst[d.projectId] ? bst[d.projectId] : (dct[d.id] ? dct[d.id].s : ''), ctAt: dct[d.id] ? dct[d.id].at : '', advPaidAt: d.stage === 'nyert' && d.projectId && adv[d.projectId] ? adv[d.projectId] : '', noAdv: d.stage === 'nyert' && tigC[ck(d.client)] ? tigC[ck(d.client)] : '', ownerCrewId: String(d.ownerId || '').indexOf('crew:') === 0 ? String(d.ownerId).slice(5) : (uc[d.ownerId] && !uc[d.ownerId].sales ? uc[d.ownerId].crewId : ''), value: d.value === '' || d.value == null ? null : Number(d.value), chance: d.chance === '' || d.chance == null ? null : Number(d.chance), commPct: d.commPct === '' || d.commPct == null ? null : Number(d.commPct), commAmt: Number(d.commAmt) || 0 }));
}
function salesBootstrap_(u) {
  const base = loadBase_();
  // Kifizetések: a saját díjai (ugyanúgy, mint egy szakembernek) – csak azok a projektek, amelyeken díja van, a szakemberi nézet szűrésével
  const cu = Object.assign({}, u, { role: 'crew' }), cid = String(u.crewId || '');
  const projects = cid ? base.projects.filter(p => parseFees_(p.fees).some(f => f.crewId === cid && Number(f.amount) > 0)).map(p => projectView_(p, cu)) : [];
  const own = k => cid ? readAll_(k).filter(x => x.crewId === cid) : [];
  return { me: publicUser_(u), myNotify: (() => { try { return salesNotifyOf_(loadUsers_().find(x => x.id === u.id)); } catch (e) { return null; } })(), projects: projects, crew: [], inventory: [], payStatus: own('payStatus'), payAdjust: own('payAdjust'), paySent: paySentList_(u), clients: (base.clients || []).map(c => ({ id: c.id, name: c.name, contactName: c.contactName, contactEmail: c.contactEmail, contactPhone: c.contactPhone, tax: c.tax, address: c.address })),
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
      id: id, title: str_(a.title, 160), client: str_(a.client, 160), contactName: str_(a.contactName, 120), contactEmail: str_(a.contactEmail, 160), contactEmail2: str_(a.contactEmail2, 160).trim(), contactPhone: str_(a.contactPhone, 40),
      eventType: EVENT_TYPES.indexOf(a.eventType) >= 0 ? a.eventType : '', venue: str_(a.venue, 200), eventDate: iso_(a.eventDate), value: num(a.value, VALUE_MAX), stage: stage,
      chance: num(a.chance, 100), source: str_(a.source, 80).trim(), nextStep: str_(a.nextStep, 200), nextDate: iso_(a.nextDate),
      ownerId: owner ? owner.id : old ? old.ownerId : u.id, ownerName: owner ? owner.name : old ? old.ownerName : u.name, note: str_(a.note, 20000), services: (Array.isArray(a.services) ? a.services : String(a.services || '').split(',')).map(x => str_(x, 60).trim()).filter(Boolean).slice(0, 20).join(', '),
      lostReason: stage === 'elveszett' ? str_(a.lostReason, 300) : '', projectId: old ? old.projectId : '', wonAt: old ? old.wonAt : '', commManual: old ? old.commManual : '', commAuto: old ? old.commAuto : '', commPct: old ? old.commPct : '', commAmt: old ? old.commAmt : '',
      closedAt: stage === 'elveszett' ? (old && old.stage === 'elveszett' ? old.closedAt : today_()) : (old && old.stage === 'nyert' ? old.closedAt : ''),
      createdAt: old ? old.createdAt : now_(), createdBy: old ? old.createdBy : u.name, updatedAt: now_(), updatedBy: u.name };
    if (old && old.stage === 'nyert') d.stage = 'nyert';
    if (d.title.length < 2) throw new Error('Add meg a lehetőség nevét.');
    if (d.contactEmail2 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.contactEmail2)) throw new Error('A másodlagos e-mail-cím érvénytelen.');
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
