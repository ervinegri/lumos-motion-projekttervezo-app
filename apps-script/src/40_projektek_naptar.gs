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
    techPlan: str_(a.techPlan, 5000), notes: str_(a.notes, 20000), deliveryLink: str_(a.deliveryLink, 500), deliveryPass: str_(a.deliveryPass, 120), deliveryNotes: str_(a.deliveryNotes, 3000), dueKept: a.dueKept === 'igen' || a.dueKept === 'nem' ? a.dueKept : '', stepsDone: (Array.isArray(a.stepsDone) ? a.stepsDone : String(a.stepsDone || '').split(',')).filter(x => ['egyeztetes', 'tervezes', 'helyszin', 'utomunka', 'jovahagyas'].indexOf(x) >= 0).join(','), siteOk: a.siteOk === 'igen' || a.siteOk === 'nem' ? a.siteOk : '', siteReport: str_(a.siteReport, 3000), deliveredAt: iso_(a.deliveredAt), dueAt: iso_(a.dueAt)
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
    if (['utomunka', 'leadva', 'jovahagyas', 'atadva'].indexOf(p.status) >= 0 && (!old || ['', 'egyeztetes', 'tervezes', 'helyszin'].indexOf(old.status || '') >= 0) && p.eventType !== 'Videóvágás' && !(u && u.id === 'sales-app') && /^\d{4}-\d{2}-\d{2}$/.test(String(p.date || '')) && String(p.date) > today_())   // a Sales App „forgatás megtörtént” jelzése hiteles
      throw new Error('A helyszíni munka napja (' + String(p.date).replace(/-/g, '.') + '.) még nem jött el – a projekt csak utána léphet utómunkára.');
    if (['utomunka', 'leadva', 'jovahagyas', 'atadva'].indexOf(p.status) >= 0 && (!old || old.status !== p.status) && !p.siteOk && p.eventType !== 'Videóvágás')   // a beszámoló a helyszíni munka kipipálásakor (a helyszíni munkára lépéskor még nem kell)
      throw new Error('Előbb jelöld be, hogy rendben ment-e a helyszíni munka.');
    p.updatedAt = now_(); p.updatedBy = u.name; p.mutationId = mutationId;
    putRow_('projects', sh, p, row);
    if (p.status === 'atadva' && old && old.status !== 'atadva') SALES_DONE_ = id;
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
  if (SALES_DONE_) { const sd = SALES_DONE_; SALES_DONE_ = null; salesNotify_(sd, 'done'); }   // az értékesítő értesül az átadásról
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
  // a projekt jegyzetei nem kerülnek a naptárba (belső / ügyféllevelezésből bemásolt tartalom)
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
  const P = PropertiesService.getScriptProperties(); if (P.getProperty('MIG_CALDESC7_2026_11_12')) return;   // 2026-11-12: a jegyzetek kikerülnek   // 2026-11-04: helyszíni vágó jelölése, felbontás és érkezés/távozás nélkül
  P.setProperty('MIG_CALDESC7_2026_11_12', now_());   // 2026-11-04 este: eszközök munkatársanként, app-link nélkül
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

