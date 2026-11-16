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
      // Elfogadott meghívással rendelkező munkatárs projektről történő levétele tiltott.
      const originalInvites = parseInvites_(old.invites);
      const originalCrew = readAll_('crewAssign').filter(x => x.projectId === id);
      const beforeMembers = new Set([old.lead].concat(originalCrew.map(x => x.crewId)).filter(Boolean));
      const afterMembers = new Set([p.lead].concat(crew.map(x => x.crewId)).filter(Boolean));
      beforeMembers.forEach(cid => {
        if (originalInvites[cid] && originalInvites[cid].st === 'yes' && !afterMembers.has(cid))
          throw new Error('Az elfogadott meghívású munkatárs a projekten marad. A beosztás zárolt.');
      });
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
      if (Array.isArray(a.videos)) { const inc = parseVideos_(a.videos), im = {}; inc.forEach(x => { im[x.id] = x; }); vids = vids.map(x => im[x.id] && !x.editor && im[x.id].editor ? Object.assign({}, x, { editor: im[x.id].editor }) : x); }   // az állapotot (st) és a már beállított vágót csak a külön videóműveletek módosítják: egy régi (gyorsítótárból nyitott) projektlap mentése nem írhatja vissza
      { const onP = new Set(crewIn.map(c => String(c && c.crewId || '')).filter(String)); vids = vids.map(x => x.editor && !onP.has(x.editor) ? Object.assign({}, x, { editor: '' }) : x); }   /* a projektről levett vágó kikerül a videóiból – az aktuális vágó kapja meg */
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
    p.invites = old ? old.invites || '' : '';   // a meghívásokat csak a külön művelet (crewInvite / inviteRespond) módosítja
    if (p.payStatus == null) p.payStatus = '';
    // a közös csapat-véglegesítés megszűnt (pozíciónként, külön meghívással véglegesítünk) – nincs lépés-zár
    if (p.penalties == null) p.penalties = '';   // díjcsökkentést csak a külön műveletek módosítanak
    if (p.status === 'atadva' && (!old || old.status !== 'atadva') && (needsDelivery_(p) || p.t_kepkeveres === true) && !p.deliveryLink && !parseVideos_(p.videos).some(v => /^https?:\/\//i.test(String(v.link || ''))))
      throw new Error('Átadás előtt add meg az átadási linket (mappa vagy videók).');
    if (p.eventType === 'Videóvágás' && p.status === 'helyszin') p.status = 'utomunka';   // videóvágásnál nincs helyszíni munka
    if (['utomunka', 'leadva', 'jovahagyas', 'atadva'].indexOf(p.status) >= 0 && (!old || ['', 'egyeztetes', 'tervezes', 'helyszin'].indexOf(old.status || '') >= 0) && p.eventType !== 'Videóvágás' && !(u && u.id === 'sales-app') && /^\d{4}-\d{2}-\d{2}$/.test(String(p.date || '')) && String(p.date) > today_())   // a Sales App „forgatás megtörtént” jelzése hiteles
      throw new Error('A helyszíni munka napja (' + String(p.date).replace(/-/g, '.') + '.) még nem jött el – a projekt csak utána léphet utómunkára.');
    if (['utomunka', 'leadva', 'jovahagyas', 'atadva'].indexOf(p.status) >= 0 && (!old || old.status !== p.status) && !p.siteOk && p.eventType !== 'Videóvágás')   // a beszámoló a helyszíni munka kipipálásakor (a helyszíni munkára lépéskor még nem kell)
      throw new Error('Előbb jelöld be, hogy rendben ment-e a helyszíni munka.');
    p.updatedAt = now_(); p.updatedBy = u.name; p.mutationId = mutationId;
    putRow_('projects', sh, p, row);
    if (p.status === 'atadva' && old && old.status !== 'atadva') SALES_DONE_ = id;
    if (p.status === 'lemondva' && old && old.status !== 'lemondva') CANCEL_DONE_ = id;
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
  if (SALES_DONE_) { const sd = SALES_DONE_; SALES_DONE_ = null; salesNotify_(sd, 'done'); }
  if (CANCEL_DONE_) { const cd = CANCEL_DONE_; CANCEL_DONE_ = null; cancelNotify_(cd, u); }   // a termelési vezető értesül a lemondásról   // az értékesítő értesül az átadásról
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
  // A projekt naptáreseményének leírása üres; a szerepek és a visszaigazolások az appban szerepelnek.
  const crewMap = byId_(readAll_('crew')), roles = {};
  if (p.lead && crewMap[p.lead]) roles[p.lead] = true;
  (p.crew || []).forEach(c => { if (crewMap[c.crewId] && c.role !== 'Értékesítő') roles[c.crewId] = true; });
  const guests = Object.keys(roles).map(cid => String(crewMap[cid].email || '').toLowerCase()).filter(m => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m));
  const crewEmails = Object.keys(crewMap).map(k => String(crewMap[k].email || '').toLowerCase()).filter(Boolean);
  return { description: '', guests: guests, crewEmails: crewEmails };
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
/** Egyszeri újraszinkron: a közelgő projekt-naptáresemények régi leírásának kiürítése. */
function calPhoneFixOnce_() {
  const P = PropertiesService.getScriptProperties();
  if (P.getProperty('MIG_CALDESC_EMPTY_2026_11_14')) return;
  try {
    calResyncUpcoming();
    P.setProperty('MIG_CALDESC_EMPTY_2026_11_14', now_());
  } catch (e) { Logger.log('Naptárleírások frissítése hiba: ' + e); }
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
  calPhoneFixOnce_();
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

/* ===================== HUBSPOT VISSZAÍRÁS =====================
   Lehetőség mentésekor: kapcsolattartó (e-mail alapján) és cég (pontos név alapján) megkeresése, ha nincs, létrehozása;
   HubSpot deal létrehozása / frissítése (név, várható érték, rendezvény dátuma, szakasz, tulajdonos) a kettőhöz társítva.
   Új / módosított ügyfélnél: cég és kapcsolattartó a HubSpotban is. A jegyzetek NEM kerülnek át (érzékeny tartalom lehet).
   (A deal-tükrözés alapból kikapcsolva – lásd hsDealSync_.) Hatókörök a HUBSPOT_TOKEN-en: crm.objects.deals.read/write, crm.objects.contacts.write, crm.objects.companies.write.
   Hiba esetén a mentés megtörténik, az utolsó hiba a HS_SYNC_ERR szkripttulajdonságba kerül (a Teljesítmény panel kiírja). */
function hsOn_() { const P = PropertiesService.getScriptProperties(); return !!String(P.getProperty('HUBSPOT_TOKEN') || '').trim() && P.getProperty('HS_WRITE') !== '0'; }
function hsErr_(e) { try { PropertiesService.getScriptProperties().setProperty('HS_SYNC_ERR', now_() + ' · ' + String(e && e.message || e).slice(0, 300)); } catch (x) {} }
function hsOk_() { try { PropertiesService.getScriptProperties().deleteProperty('HS_SYNC_ERR'); } catch (x) {} }
function hsLinkGet_(id) { const sh = sheetFor_('hsLinks'), row = findRow_(sh, id); return row ? readRow_('hsLinks', sh, row) : { id: id }; }
function hsLinkPut_(x) { withLock_(() => { const sh = sheetFor_('hsLinks'); putRow_('hsLinks', sh, Object.assign({}, x, { updatedAt: now_() }), findRow_(sh, x.id) || null); }); }
function hsOwnerId_(email, name) {
  email = String(email || '').toLowerCase(); if (!email && !name) return '';
  const c = CacheService.getScriptCache(); let m = null; try { m = JSON.parse(c.get('hs_owners') || 'null'); } catch (e) {}
  if (!m) { m = {}; ((hubspot_('get', '/crm/v3/owners?limit=100').results) || []).forEach(o => { if (o.email) m[String(o.email).toLowerCase()] = String(o.id); const k = hsNameKey_([o.firstName, o.lastName].join(' ')); if (k && !m['n:' + k]) m['n:' + k] = String(o.id); }); try { c.put('hs_owners', JSON.stringify(m), 21600); } catch (e) {} }
  return m[email] || (name ? m['n:' + hsNameKey_(name)] || '' : '');
}
function hsStages_() {
  const c = CacheService.getScriptCache(); let st = null; try { st = JSON.parse(c.get('hs_stages') || 'null'); } catch (e) {}
  if (st) return st;
  let p = {}; try { p = hubspot_('get', '/crm/v3/pipelines/deals/default') || {}; } catch (e) { return { pipeline: 'default', uj: '', ajanlat: '', targyalas: '', nyert: '', elveszett: '' }; }   // szakaszok nélkül is szinkronizálunk (a szakasz kimarad)
  const L = (p.stages || []).slice().sort((a, b) => a.displayOrder - b.displayOrder);
  const md = s => s.metadata || {}, closed = s => String(md(s).isClosed) === 'true';
  const open = L.filter(s => !closed(s)), won = L.find(s => closed(s) && Number(md(s).probability) === 1), lost = L.find(s => closed(s) && Number(md(s).probability) === 0);
  const at = i => (open[Math.min(i, open.length - 1)] || {}).id || '';
  st = { pipeline: p.id || 'default', uj: at(0), ajanlat: at(2), targyalas: at(3), nyert: (won || {}).id || '', elveszett: (lost || {}).id || '' };
  try { c.put('hs_stages', JSON.stringify(st), 21600); } catch (e) {}
  return st;
}
function hsSplitName_(n) { const w = String(n || '').trim().split(/\s+/).filter(Boolean); return w.length < 2 ? { firstname: w[0] || '' } : { lastname: w[0], firstname: w.slice(1).join(' ') }; }   // magyar sorrend: vezetéknév elöl
function hsEnsureContact_(email, name, phone, company) {
  email = String(email || '').trim().toLowerCase(); if (!email) return '';
  const hit = ((hubspot_('post', '/crm/v3/objects/contacts/search', { filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }], properties: ['email'], limit: 1 }).results) || [])[0];
  if (hit) return String(hit.id);
  const props = Object.assign({ email: email }, hsSplitName_(name)); if (phone) props.phone = String(phone); if (company) props.company = String(company);
  return String((hubspot_('post', '/crm/v3/objects/contacts', { properties: props }) || {}).id || '');
}
/* Cég a HubSpotban: pontos név → hasonló név (a cégforma nélküli szavak egyezése) → a kapcsolattartó e-mail-domainje; újat csak akkor hozunk létre, ha egyik sincs. */
const HS_LEGAL_ = ['zrt', 'kft', 'bt', 'nyrt', 'kkt', 'ev', 'egyesulet', 'alapitvany', 'ltd', 'gmbh', 'inc', 'kozhasznu', 'nonprofit', 'rt'];
function hsCoTok_(n) { return String(n || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(w => w.length > 1 && HS_LEGAL_.indexOf(w) < 0); }
function hsEnsureCompany_(name, email) {
  name = String(name || '').trim(); if (name.length < 2) return '';
  const props = ['name', 'domain'];
  const exact = ((hubspot_('post', '/crm/v3/objects/companies/search', { filterGroups: [{ filters: [{ propertyName: 'name', operator: 'EQ', value: name }] }], properties: props, limit: 1 }).results) || [])[0];
  if (exact) return String(exact.id);
  const mine = hsCoTok_(name);
  if (mine.length) {
    const cands = (hubspot_('post', '/crm/v3/objects/companies/search', { query: mine[0], properties: props, limit: 20 }).results) || [];
    const best = cands.map(c => { const t = hsCoTok_((c.properties || {}).name); return { id: String(c.id), s: mine.filter(w => t.indexOf(w) >= 0).length, all: mine.every(w => t.indexOf(w) >= 0) || t.every(w => mine.indexOf(w) >= 0) }; })
      .filter(x => x.all && x.s >= 1).sort((a, b) => b.s - a.s)[0];
    if (best) return best.id;
  }
  const dom = (/@([^@\s]+)$/.exec(String(email || '').toLowerCase()) || [])[1];
  if (dom && !/^(gmail|googlemail|freemail|citromail|hotmail|outlook|yahoo|icloud|t-online|live)\./.test(dom)) {
    const byDom = ((hubspot_('post', '/crm/v3/objects/companies/search', { filterGroups: [{ filters: [{ propertyName: 'domain', operator: 'EQ', value: dom }] }], properties: props, limit: 1 }).results) || [])[0];
    if (byDom) return String(byDom.id);
  }
  return String((hubspot_('post', '/crm/v3/objects/companies', { properties: { name: name } }) || {}).id || '');
}
function hsAssoc_(from, fid, to, tid) { if (fid && tid) { try { hubspot_('post', '/crm/v4/associations/' + from + '/' + to + '/batch/associate/default', { inputs: [{ from: { id: String(fid) }, to: { id: String(tid) } }] }); /* a PUT törzs nélkül 415-öt adott (nincs Content-Type) */ } catch (e) { throw new Error('Társítás (' + from + ' → ' + to + '): ' + (e && e.message || e)); } } }
/* Meglévő HubSpot deal keresése a lehetőséghez (a HubSpotban már vezetett dealek ne duplikálódjanak):
   1) korábbi párosítás, 2) pontosan azonos nevű deal, 3) a kapcsolattartó / cég dealjei közül a név szerint leginkább egyező. */
function hsFindDeal_(d, cid, coid) {
  const name = String(d.title || '').trim(), tok = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(w => w.length > 2);
  if (name) { const hit = ((hubspot_('post', '/crm/v3/objects/deals/search', { filterGroups: [{ filters: [{ propertyName: 'dealname', operator: 'EQ', value: name }] }], properties: ['dealname'], limit: 1 }).results) || [])[0]; if (hit) return String(hit.id); }
  const ids = {};
  [['contacts', cid], ['companies', coid]].forEach(([o, id]) => { if (!id) return; try { ((hubspot_('get', '/crm/v4/objects/' + o + '/' + id + '/associations/deals?limit=100').results) || []).forEach(a => { ids[String(a.toObjectId)] = 1; }); } catch (e) {} });
  const list = Object.keys(ids).slice(0, 100); if (!list.length) return '';
  const res = (hubspot_('post', '/crm/v3/objects/deals/batch/read', { properties: ['dealname', 'createdate'], inputs: list.map(id => ({ id: id })) }).results) || [];
  const mine = tok(name + ' ' + (d.client || ''));
  const scored = res.map(x => { const t = tok((x.properties || {}).dealname); return { id: String(x.id), s: t.filter(w => mine.indexOf(w) >= 0).length }; }).filter(x => x.s >= 2).sort((a, b) => b.s - a.s);
  return scored.length ? scored[0].id : (res.length === 1 ? String(res[0].id) : '');
}
/* Ervin döntése (2026-11-15): a HubSpotban NEM vezetünk dealeket – a lehetőség gazdája az app.
   Mentéskor csak a kapcsolattartó és a cég kerül a HubSpotba (keresés / létrehozás, egymáshoz társítva); deal nem jön létre és nem módosul.
   (HS_DEALS='1' szkripttulajdonsággal a korábbi deal-tükrözés visszakapcsolható.) */
function hsDealSync_(d) {
  if (!d || !hsOn_()) return;
  try {
    const link = hsLinkGet_(d.id);
    const cid = hsEnsureContact_(d.contactEmail, d.contactName, d.contactPhone, d.client) || link.hsContact || '';
    const coid = hsEnsureCompany_(d.client, d.contactEmail) || link.hsCompany || '';
    hsAssoc_('contacts', cid, 'companies', coid);
    let dealId = String(link.hsDeal || '');
    if (PropertiesService.getScriptProperties().getProperty('HS_DEALS') === '1') dealId = hsDealMirror_(d, link, cid, coid);
    hsLinkPut_({ id: d.id, hsDeal: dealId, hsContact: cid, hsCompany: coid });
    hsOk_();
  } catch (e) { hsErr_(e); }
}
function hsDealMirror_(d, link, cid, coid) {
  const st = hsStages_();
  let dealId = String(link.hsDeal || '') || hsFindDeal_(d, cid, coid);
  const amount = d.value !== '' && d.value != null && isFinite(Number(d.value)) && Number(d.value) > 0 ? String(Math.round(Number(d.value))) : '';
  const close = /^\d{4}-\d{2}-\d{2}$/.test(String(d.eventDate || '')) ? String(d.eventDate) + 'T12:00:00Z' : '';
  if (dealId) {
    const props = {}; if (amount) props.amount = amount; if (close) props.closedate = close;
    if ((d.stage === 'nyert' || d.stage === 'elveszett') && st[d.stage]) props.dealstage = st[d.stage];
    if (Object.keys(props).length) { try { hubspot_('patch', '/crm/v3/objects/deals/' + dealId, { properties: props }); } catch (e) { if (/HTTP 404/.test(String(e && e.message))) dealId = ''; else throw e; } }
  }
  if (!dealId) {
    const owner = (() => { const us = loadUsers_(), o = us.find(x => x.id === d.ownerId); if (o) return o.email; if (String(d.ownerId || '').indexOf('crew:') === 0) { const c = readAll_('crew').find(x => x.id === String(d.ownerId).slice(5)); return c && c.email; } return ''; })();
    const props = { dealname: String(d.title || 'Lehetőség').slice(0, 200), pipeline: st.pipeline };
    if (amount) props.amount = amount; if (close) props.closedate = close; if (st[d.stage]) props.dealstage = st[d.stage];
    let oid = ''; try { oid = hsOwnerId_(owner, d.ownerName); } catch (e) {} if (oid) props.hubspot_owner_id = oid;
    const assoc = [[cid, 3], [coid, 5]].filter(x => x[0]).map(x => ({ to: { id: x[0] }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: x[1] }] }));
    dealId = String((hubspot_('post', '/crm/v3/objects/deals', { properties: props, associations: assoc }) || {}).id || '');
  }
  return dealId;
}
function hsClientSync_(c) {
  if (!c || !hsOn_()) return;
  try {
    const coid = hsEnsureCompany_(c.name, c.contactEmail), cid = hsEnsureContact_(c.contactEmail, c.contactName, c.contactPhone, c.name);
    hsAssoc_('contacts', cid, 'companies', coid);
    hsLinkPut_(Object.assign(hsLinkGet_(c.id), { hsContact: cid, hsCompany: coid }));
    hsOk_();
  } catch (e) { hsErr_(e); }
}

/* Egyszeri áthozatal (Ervin döntése, 2026-11-15: a HubSpotban nem vezetünk dealeket): a HubSpot dealjei lehetőségként az appba.
   Nyitott szakasz → nyitott lehetőség, „Bukta” → elveszett; a „Siker” (megnyert) dealeket NEM hozzuk át (azok már projektek).
   A tulajdonos marad (HubSpot-tulajdonos → app-felhasználó név / e-mail alapján); az appban már meglévő (azonos nevű) lehetőséget kihagyjuk.
   Az eredményt a HS_DEAL_IMPORT_1 tulajdonság őrzi (JSON: átvett / kihagyott). */
const HS_STAGE_MAP_ = { qualifiedtobuy: 'uj', presentationscheduled: 'ajanlat', contractsent: 'targyalas', closedwon: 'targyalas', closedlost: 'elveszett' };
const HS_STAGE_LBL_ = { qualifiedtobuy: 'Igényfelmérés', presentationscheduled: 'Ajánlat készítés', contractsent: 'Döntésre vár', closedwon: 'Szerződés kiküldve', closedlost: 'Bukta', '5960764616': 'Siker' };
function hsDealImportOnce_() {
  const P = PropertiesService.getScriptProperties(); if (P.getProperty('HS_DEAL_IMPORT_1') || !String(P.getProperty('HUBSPOT_TOKEN') || '').trim()) return;
  const deals = []; let after = '';
  for (let i = 0; i < 10; i++) { const r = hubspot_('get', '/crm/v3/objects/deals?limit=100&archived=false&properties=dealname,amount,dealstage,closedate,createdate,hs_lastmodifieddate,hubspot_owner_id&associations=contacts,companies' + (after ? '&after=' + after : '')) || {}; (r.results || []).forEach(x => deals.push(x)); after = ((r.paging || {}).next || {}).after || ''; if (!after) break; }
  const owners = (hubspot_('get', '/crm/v3/owners?limit=100&archived=true').results || []).concat(hubspot_('get', '/crm/v3/owners?limit=100').results || []);
  const users = loadUsers_().filter(u => !u.disabled && (u.role === 'admin' || u.role === 'sales')), crew = readAll_('crew');
  const ukeys = users.map(u => ({ u: u, keys: [hsNameKey_(u.name), hsNameKey_(hsCrewNameOf_(u))].concat(crew.filter(c => u.email && String(c.email || '').toLowerCase() === String(u.email).toLowerCase()).map(c => hsNameKey_(sval_(c.name)))).filter(Boolean), mail: String(u.email || '').toLowerCase() }));
  const ownerUser = oid => { const o = owners.find(x => String(x.id) === String(oid)); if (!o) return null; const k = hsNameKey_([o.firstName, o.lastName].join(' ')), m = String(o.email || '').toLowerCase(); const hit = ukeys.find(x => (m && x.mail === m) || (k && x.keys.indexOf(k) >= 0)); return hit ? hit.u : null; };
  const tok = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const have = {}; readAll_('deals').forEach(d => { have[tok(d.title)] = 1; }); readAll_('projects').forEach(p => { have['p:' + tok(p.name)] = 1; });
  const cIds = {}, coIds = {}; deals.forEach(d => { (((d.associations || {}).contacts || {}).results || []).slice(0, 1).forEach(a => { cIds[a.id] = 1; }); (((d.associations || {}).companies || {}).results || []).slice(0, 1).forEach(a => { coIds[a.id] = 1; }); });
  const batch = (obj, ids, props) => { const out = {}, L = Object.keys(ids); for (let i = 0; i < L.length; i += 100) ((hubspot_('post', '/crm/v3/objects/' + obj + '/batch/read', { properties: props, inputs: L.slice(i, i + 100).map(id => ({ id: id })) }) || {}).results || []).forEach(x => { out[String(x.id)] = x.properties || {}; }); return out; };
  const C = batch('contacts', cIds, ['firstname', 'lastname', 'email', 'phone', 'mobilephone']), CO = batch('companies', coIds, ['name']);
  const day = v => { const d = new Date(isNaN(Number(v)) ? v : Number(v)); return isNaN(d) ? '' : Utilities.formatDate(d, SHEET_TZ, 'yyyy-MM-dd HH:mm:ss'); };
  const res = { imported: [], skipped: [] }, sh = sheetFor_('deals'), today = today_();
  withLock_(() => {
    deals.forEach(x => {
      const pr = x.properties || {}, name = String(pr.dealname || '').trim(), st = String(pr.dealstage || '');
      if (!name) return;
      if (st === '5960764616') { res.skipped.push(name + ' (Siker – már projekt)'); return; }
      if (have[tok(name)] || have['p:' + tok(name)]) { res.skipped.push(name + ' (már az appban)'); return; }
      const stage = HS_STAGE_MAP_[st] || 'uj', o = ownerUser(pr.hubspot_owner_id);
      const ca = ((((x.associations || {}).contacts || {}).results || [])[0] || {}).id, coa = ((((x.associations || {}).companies || {}).results || [])[0] || {}).id;
      const c = ca ? C[String(ca)] || {} : {}, co = coa ? CO[String(coa)] || {} : {};
      const nm = [c.lastname, c.firstname].filter(Boolean).join(' ');
      const d = { id: Utilities.getUuid(), title: name.slice(0, 160), client: String(co.name || '').slice(0, 160), contactName: nm.slice(0, 120), contactEmail: String(c.email || '').slice(0, 160), contactPhone: String(c.phone || c.mobilephone || '').slice(0, 40),
        eventType: '', venue: '', eventDate: '', value: pr.amount !== '' && pr.amount != null && isFinite(Number(pr.amount)) ? Math.round(Number(pr.amount)) : '', stage: stage, chance: stage === 'elveszett' ? 0 : stage === 'targyalas' ? 50 : stage === 'ajanlat' ? 30 : 10,
        source: 'HubSpot', nextStep: stage === 'elveszett' ? '' : 'Átvéve a HubSpotból – következő lépés megadása', nextDate: stage === 'elveszett' ? '' : today,
        ownerId: o ? o.id : '', ownerName: o ? o.name : '', note: '[' + day(Date.now()).slice(0, 16) + ' · HubSpot] Átvéve a HubSpotból (szakasz: ' + (HS_STAGE_LBL_[st] || st || '–') + (pr.closedate ? ', zárási dátum: ' + day(pr.closedate).slice(0, 10) : '') + ')',
        lostReason: stage === 'elveszett' ? 'HubSpot: Bukta' : '', projectId: '', wonAt: '', closedAt: stage === 'elveszett' ? day(pr.closedate || pr.hs_lastmodifieddate) : '',
        createdAt: day(pr.createdate) || now_(), createdBy: 'HubSpot-import', updatedAt: now_(), updatedBy: 'HubSpot-import' };
      putRow_('deals', sh, d, null); have[tok(name)] = 1;
      res.imported.push(name + ' → ' + (o ? o.name : 'gazda nélkül') + ' · ' + stage);
      try { putRow_('hsLinks', sheetFor_('hsLinks'), { id: d.id, hsDeal: String(x.id), hsContact: ca ? String(ca) : '', hsCompany: coa ? String(coa) : '', updatedAt: now_() }, null); } catch (e) {}
    });
    dbFlush_();
  });
  P.setProperty('HS_DEAL_IMPORT_1', JSON.stringify({ at: now_(), imported: res.imported.length, skipped: res.skipped.length }));
  logEvent_({ name: 'Rendszer' }, 'HubSpot-dealek átvéve', res.imported.length + ' lehetőség', res.skipped.length + ' kihagyva');
  try { P.setProperty('HS_DEAL_IMPORT_1_LIST', JSON.stringify(res).slice(0, 8500)); } catch (e) {}
}

/* Értékesítői aktivitás a HubSpotból (Teljesítmény): hívások, megbeszélések, kimenő e-mailek havonta, tulajdonosonként.
   Az app felhasználóit e-mail-cím alapján párosítjuk a HubSpot-tulajdonosokkal. Az ügyvezető mindenkit, az értékesítő csak magát kapja. */
/** Név-kulcs a HubSpot-tulajdonos és az app-felhasználó párosításához: kisbetű, ékezet nélkül, a szavak ABC-sorrendben. */
function hsNameKey_(n) { const w = String(n || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z]+/).filter(Boolean); return w.length >= 2 ? w.sort().join(' ') : ''; }
function hsCrewNameOf_(x) { try { const c = x && x.crewId ? readAll_('crew').find(r => r.id === x.crewId) : null; return c ? sval_(c.name) : ''; } catch (e) { return ''; } }
function hsActivity_(u, arg) {
  const m = /^\d{4}-\d{2}$/.test(String(arg && arg.month || '')) ? String(arg.month) : Utilities.formatDate(new Date(), SHEET_TZ, 'yyyy-MM');
  const ck = 'hsact2:' + m + ':' + (u.role === 'admin' ? 'all' : u.id), cache = CacheService.getScriptCache();
  const syncErr = u.role === 'admin' ? String(PropertiesService.getScriptProperties().getProperty('HS_SYNC_ERR') || '') : '';   // mindig friss (nem a gyorsítótárból)
  if (!(arg && arg.fresh)) { const hit = cache.get(ck); if (hit) { try { return Object.assign(JSON.parse(hit), { syncErr: syncErr }); } catch (e) {} } }
  const users = loadUsers_().filter(x => !x.disabled && (x.role === 'sales' || x.role === 'admin') && (u.role === 'admin' || x.id === u.id));
  let owners = [];
  try { owners = (hubspot_('get', '/crm/v3/owners?limit=100').results) || []; } catch (e) { return { month: m, error: String(e && e.message || e) + (/elutasította/.test(String(e && e.message)) ? ' (a HubSpot-felhasználók listája: crm.objects.owners.read hatókör kell)' : ''), people: [], syncErr: syncErr }; }
  const byMail = {}, byName = {}; owners.forEach(o => { if (o.email) byMail[String(o.email).toLowerCase()] = o; const k = hsNameKey_([o.firstName, o.lastName].join(' ')); if (k && !byName[k]) byName[k] = o; });
  const y = +m.slice(0, 4), mo = +m.slice(5, 7), from = Date.UTC(y, mo - 1, 1) - 3600e3, to = Date.UTC(mo === 12 ? y + 1 : y, mo === 12 ? 0 : mo, 1) - 3600e3;   // budapesti hónap (téli idő közelítés)
  const count = (obj, oid, extra) => {
    const filters = [{ propertyName: 'hubspot_owner_id', operator: 'EQ', value: String(oid) }, { propertyName: 'hs_timestamp', operator: 'GTE', value: String(from) }, { propertyName: 'hs_timestamp', operator: 'LT', value: String(to) }].concat(extra || []);
    try { return Number((hubspot_('post', '/crm/v3/objects/' + obj + '/search', { filterGroups: [{ filters: filters }], properties: ['hs_timestamp'], limit: 1 }) || {}).total) || 0; } catch (e) { return null; }
  };
  const people = users.map(x => {
    const o = byMail[String(x.email || '').toLowerCase()] || byName[hsNameKey_(x.name)] || byName[hsNameKey_(hsCrewNameOf_(x))];   // e-mail, vagy név (sorrendtől függetlenül: „Ervin Egri” = „Egri Ervin”)
    if (!o) return { userId: x.id, name: x.name, linked: false };
    return { userId: x.id, name: x.name, linked: true, calls: count('calls', o.id), meetings: count('meetings', o.id), emails: count('emails', o.id, [{ propertyName: 'hs_email_direction', operator: 'EQ', value: 'EMAIL' }]),
      contacts: (() => { try { return Number((hubspot_('post', '/crm/v3/objects/contacts/search', { filterGroups: [{ filters: [{ propertyName: 'hubspot_owner_id', operator: 'EQ', value: String(o.id) }, { propertyName: 'createdate', operator: 'GTE', value: String(from) }, { propertyName: 'createdate', operator: 'LT', value: String(to) }] }], limit: 1 }) || {}).total) || 0; } catch (e) { return null; } })() };
  });
  const out = { month: m, people: people, at: now_(), syncErr: syncErr };
  try { cache.put(ck, JSON.stringify(out), 1800); } catch (e) {}
  return out;
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


/* ===================== MEGHÍVÁSOK =====================
   A szakember a projektet csak akkor látja, ha a meghívást elfogadta (az appban vagy a Google Naptárban „Igen”).
   Akinek nincs meghívási bejegyzése (régi projektek), annál minden marad a régiben. */
function parseInvites_(v) { let o = v; if (typeof v === 'string') { try { o = JSON.parse(v || '{}'); } catch (e) { o = {}; } }
  const out = {}; if (o && typeof o === 'object' && !Array.isArray(o)) Object.keys(o).slice(0, 80).forEach(k => { const x = o[k] || {}; if (!/^[\w-]{1,64}$/.test(k)) return;
    out[k] = { st: ['invited', 'yes', 'no'].indexOf(x.st) >= 0 ? x.st : 'invited', at: str_(x.at, 30), by: str_(x.by, 80), bye: str_(x.bye, 160), dl: str_(x.dl, 40), ans: str_(x.ans, 30), via: str_(x.via, 10) }; });
  return out; }
/** Látja-e a szakember a projektet / a projekten belül a munkatársat: nincs meghívás → igen (régi működés); van → csak ha elfogadta. */
function inviteOk_(inv, cid) { const x = inv && inv[cid]; return !x || x.st === 'yes'; }
/** A kiküldött meghívó és az előnézet közös, azonos e-mail-sablonja. */
function crewInviteMessage_(p, c, cid, asg, dueInput, ev) {
  const em = String(c.email || '').trim().toLowerCase(), pid = p.id;
    const first = huFirst_(c.name) || c.name, rl = [p.lead === cid ? 'Projektvezető' : ''].concat((asg).filter(x => x.crewId === cid).map(x => x.role)).filter(Boolean).filter((x, i, l) => l.indexOf(x) === i);
    const post = postOnly_(Object.assign({}, p, { crew: asg }), cid);   // csak vágó (utómunka): nincs helyszín és időpont
    const asTxt = rl.length ? ', mint ' + rl.map(x => x.toLowerCase()).join(' és ') : '';
    const huD = d => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || '')); if (!m) return ''; const dt = new Date(+m[1], +m[2] - 1, +m[3]); return ['jan.', 'febr.', 'márc.', 'ápr.', 'máj.', 'jún.', 'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.'][+m[2] - 1] + ' ' + (+m[3]) + '., ' + ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'][dt.getDay()]; };   // pl. nov. 27., péntek
    const when = huD(p.date) + (p.endDate && p.endDate !== p.date ? ' – ' + huD(p.endDate) : '') + (p.startTime ? ', ' + p.startTime + (p.endTime ? '–' + p.endTime : '') : '');
    const due = str_(dueInput, 40), isCut = (asg).some(x => x.crewId === cid && x.role === 'Vágó');
    const url = appUrl_() + '#inv=' + encodeURIComponent(pid), calUrl = ev && !post ? calEventLink_(ev) : '';
    // A meghívóban a vágóknak a nyersanyag-feltöltés és a vágás pontos, magyar napnevű határideje szerepel.
    // Régebbi, már megnyitott felületek rövidített dátumát is teljes napnévre alakítjuk.
    const editorDueIso = (() => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(due)) return due;
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(p.dueAt || ''))) return p.dueAt;
      const m = /^([^\s]+)\s+(\d{1,2})\./.exec(due);
      if (!m) return '';
      const months = ['jan.', 'febr.', 'márc.', 'ápr.', 'máj.', 'jún.', 'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.'];
      const mon = months.indexOf(m[1].toLowerCase()) + 1;
      if (!mon) return '';
      const shootYear = Number(String(p.date || '').slice(0, 4)) || new Date().getFullYear();
      const shootMonth = Number(String(p.date || '').slice(5, 7)) || mon;
      const year = shootYear + (mon < shootMonth ? 1 : 0);
      return year + '-' + ('0' + mon).slice(-2) + '-' + ('0' + Number(m[2])).slice(-2);
    })();
    // Egyidejű helyszíni és vágói szerepnél az e-mail mindkét feladat adatait tartalmazza.
    const onSiteInvite = p.lead === cid || (asg).some(x => x.crewId === cid && x.role !== 'Vágó' && x.role !== 'Értékesítő');
    const rawUpload = isCut && p.date ? huD(p.date) + ', 23:00' : '';
    const cutDue = isCut && editorDueIso ? huD(editorDueIso) + ', 20:00' : '';
    const info = [onSiteInvite && when ? '🎥 Forgatás: ' + when : '', onSiteInvite && p.venue ? '📍 ' + p.venue : '',
      rawUpload ? (onSiteInvite ? '📤 Nyersanyag átadása: ' : 'Nyersanyag feltöltési határideje: ') + rawUpload : '',
      cutDue ? '✂️ Vágási határidő: ' + cutDue : ''].filter(Boolean).join('\n');
    const dlD = new Date(Date.now() + 72 * 3600 * 1000); if (dlD.getMinutes() || dlD.getSeconds()) { dlD.setHours(dlD.getHours() + 1, 0, 0, 0); }   // válaszadási határidő: a meghívástól 3 nap (egész órára kerekítve)
    const HM = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'], dlTxt = Utilities.formatDate(dlD, SHEET_TZ, 'yyyy') + ' ' + HM[+Utilities.formatDate(dlD, SHEET_TZ, 'M') - 1] + ' ' + Utilities.formatDate(dlD, SHEET_TZ, 'd, HH:mm');
    const text = 'Kedves ' + first + '!\n\nMeghívást kaptál erre a projektre' + asTxt + ':\n' + p.name + (info ? '\n\n' + info : '') + '\n\n⏰ Válaszadási határidő: ' + dlTxt + '\n\nElfogadás: ' + url + (calUrl ? '\n\n(A Google Naptárban az „Igen” válasz is elfogadásnak számít: ' + calUrl + ')' : '');
    const html = mailCard_(first, 'Meghívást kaptál erre a projektre' + escapeHtml_(asTxt) + ':<br><b style="font-size:17px">' + escapeHtml_(p.name) + '</b>', (info ? info + '\n' : '') + '⏰ Válaszadási határidő: ' + dlTxt, url, 'Válaszolok') + (calUrl ? '<p style="font-size:13px;margin:10px 0 0;color:#5b6876">A <a href="' + escapeHtml_(calUrl) + '">Google Naptárban</a> az „Igen” válasz is elfogadásnak számít.</p>' : '');
  return { to: em, subject: 'Meghívás: ' + p.name, text: text, html: html, dlTxt: dlTxt };
}
/** Megtekintés küldés előtt: kizárólag olvasás, meghívóállapot-módosítás nélkül. */
function crewInvitePreview_(u, a) {
  const pid = str_(a && a.projectId, 64), cid = str_(a && a.crewId, 64);
  const sh = sheetFor_('projects'), row = findRow_(sh, pid);
  if (!row) throw new Error('A projekt nem található.');
  const p = readRow_('projects', sh, row), asg = readAll_('crewAssign').filter(x => x.projectId === pid);
  if (!(p.lead === cid || asg.some(x => x.crewId === cid))) throw new Error('Előbb vedd fel a stábba.');
  const c = readAll_('crew').find(x => x.id === cid);
  if (!c) throw new Error('A munkatárs nem található.');
  let ev = null; try { ev = calEvent_(p.calEventId); } catch (e) {}
  return crewInviteMessage_(p, c, cid, asg, str_(a && a.due, 40), ev);
}
function crewInvite_(u, a) {
  const pid = str_(a && a.projectId, 64), cid = str_(a && a.crewId, 64); let p, c, ev = null;
  withLock_(() => { const sh = sheetFor_('projects'), r = findRow_(sh, pid); if (!r) throw new Error('A projekt nem található.'); p = readRow_('projects', sh, r);
    const asg = readAll_('crewAssign').filter(x => x.projectId === pid), on = p.lead === cid || asg.some(x => x.crewId === cid); p.__asg = asg; if (!on) throw new Error('Előbb vedd fel a stábba.');
    c = readAll_('crew').find(x => x.id === cid); if (!c) throw new Error('A munkatárs nem található.');
    const inv = parseInvites_(p.invites), cur = inv[cid];
    inv[cid] = { st: cur && cur.st === 'yes' ? 'yes' : 'invited', at: now_(), by: u.name, bye: String(u.email || '').toLowerCase(), ans: cur && cur.st === 'yes' ? cur.ans : '', via: cur && cur.st === 'yes' ? cur.via : '' };
    const asg0 = p.__asg; delete p.__asg; p.invites = JSON.stringify(inv); p.updatedAt = now_(); p.updatedBy = u.name; putRow_('projects', sh, p, r); p.__asg = asg0; dataBump_(); dbFlush_(); });
  const em = String(c.email || '').trim().toLowerCase(); let calOk = false, mail = false;
  try { ev = calEvent_(p.calEventId); } catch (e) {}
  if (ev && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { try {   // a projekt naptáreseményébe vendégként (a Google külön levelet nem küld – a meghívó a saját levelünk)
    if (typeof Calendar !== 'undefined' && Calendar.Events) { const eid = String(ev.getId()).replace(/@google\.com$/, ''), CID = evCalId_(ev), cur = Calendar.Events.get(CID, eid), att = cur.attendees || [];
      if (!att.some(x => String(x.email || '').toLowerCase() === em)) { att.push({ email: em }); Calendar.Events.patch({ attendees: att }, CID, eid, { sendUpdates: 'none' }); } }
    else if (!ev.getGuestList().some(g => String(g.getEmail()).toLowerCase() === em)) ev.addGuest(em);
    calOk = true; } catch (e) { Logger.log('Meghívás – naptár hiba: ' + e); } }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
    const msg = crewInviteMessage_(p, c, cid, p.__asg || [], str_(a && a.due, 40), ev), dlTxt = msg.dlTxt;
    try { withLock_(() => { const sh = sheetFor_('projects'), r = findRow_(sh, pid); if (!r) return; const q = readRow_('projects', sh, r), iv = parseInvites_(q.invites); if (iv[cid]) { iv[cid].dl = dlTxt; q.invites = JSON.stringify(iv); putRow_('projects', sh, q, r); p.invites = q.invites; dbFlush_(); } }); } catch (e) {}
    try { mail = gmailSend_(em, msg.subject, msg.text, { htmlBody: msg.html, name: 'Lumos Motion Projekttervező' }, 'assign'); } catch (e) { Logger.log('Meghívás e-mail hiba: ' + e); }
  }
  delete p.__asg; logEvent_(u, 'Meghívás elküldve', p.name, c.name + (mail ? ' (e-mail)' : '') + (calOk ? ' (naptár)' : ''));
  return { project: projectView_(fullProject_(p), u), mail: mail, cal: calOk, noEmail: !em };
}
/** Meghívólink megnyitásakor a saját válasz állapota, idegen projektadatok nélkül. */
function inviteStatus_(u, a) {
  const pid = str_(a && a.projectId, 64), cid = inviteOwnCrewId_(u);
  if (!cid) throw new Error('A felhasználódhoz stábrekord szükséges.');
  const sh = sheetFor_('projects'), row = findRow_(sh, pid);
  if (!row) return { st: 'missing' };
  const p = readRow_('projects', sh, row), iv = parseInvites_(p.invites)[cid];
  if (!iv) return { st: 'missing' };
  return { st: iv.st, name: p.name };
}
function inviteRespond_(u, a) {
  const pid = str_(a && a.projectId, 64), cid = inviteOwnCrewId_(u), yes = a && a.answer === 'yes'; if (!cid) throw new Error('A felhasználód nincs összekapcsolva a stáblistával.'); let p, alreadyAnswered = '';
  withLock_(() => { const sh = sheetFor_('projects'), r = findRow_(sh, pid); if (!r) throw new Error('A projekt nem található.'); p = readRow_('projects', sh, r);
    const inv = parseInvites_(p.invites); if (!inv[cid]) throw new Error('Ehhez a projekthez nincs meghívásod.');
    if (inv[cid].st === 'yes' || inv[cid].st === 'no') { alreadyAnswered = inv[cid].st; return; }
    inv[cid] = Object.assign(inv[cid], { st: yes ? 'yes' : 'no', ans: now_(), via: 'app' }); p.invites = JSON.stringify(inv); p.updatedAt = now_(); p.updatedBy = u.name; putRow_('projects', sh, p, r); dataBump_(); dbFlush_(); });
  if (alreadyAnswered) return { alreadyAnswered: true, status: alreadyAnswered, name: p.name };
  logEvent_(u, yes ? 'Meghívás elfogadva' : 'Meghívás elutasítva', p.name, '');
  try {   // visszajelzés a meghívónak
    const iv = parseInvites_(p.invites)[cid] || {}, to = iv.bye || ((loadUsers_().find(x => x.name === iv.by) || {}).email || ''), cr = readAll_('crew').find(x => x.id === cid) || {}, who = cr.name || u.name;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) { const url = appUrl_() + '#p=' + pid, first = huFirst_(iv.by || '') || '';
      // tömör értesítés: ki, mit, milyen szerepben, mikor – megszólítás és magyarázó szöveg nélkül
      const roles = readAll_('crewAssign').filter(r => r.projectId === pid && r.crewId === cid).map(r => String(r.role || '')).filter(r => r && r !== 'Értékesítő');
      if (p.lead === cid) roles.unshift('Projektvezető');
      const rl = roles.filter((r, i) => roles.indexOf(r) === i).join(', ');
      const HM = ['jan.', 'febr.', 'márc.', 'ápr.', 'máj.', 'jún.', 'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.'], md = v => { const m = /^\d{4}-(\d{2})-(\d{2})/.exec(String(v || '')); return m ? HM[+m[1] - 1] + ' ' + (+m[2]) + '.' : ''; };
      const when = md(p.date) + (p.endDate && p.endDate !== p.date ? '–' + md(p.endDate) : '');
      const subj = (yes ? '✅ ' : '❌ ') + who + (yes ? ' vállalta' : ' nem vállalta') + ' · ' + p.name + (rl ? ' · ' + rl : '') + (when ? ' · ' + when : '');
      const html = '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#202124;max-width:520px"><p style="margin:0 0 12px"><b>' + escapeHtml_(who) + '</b> ' + (yes ? '<b style="color:#1f7a44">vállalta</b>' : '<b style="color:#a33">nem vállalta</b>') + ': <b>' + escapeHtml_(p.name) + '</b>'
        + (rl ? '<br>Szerep: <b>' + escapeHtml_(rl) + '</b>' : '') + (when ? '<br>Időpont: ' + escapeHtml_(when) : '') + '</p>'
        + '<p style="margin:0"><a href="' + escapeHtml_(url) + '" style="display:inline-block;background:#1f2933;color:#fff;text-decoration:none;font-weight:bold;padding:8px 16px;border-radius:8px">Projekt megnyitása</a></p></div>';
      gmailSend_(to, subj, who + (yes ? ' vállalta' : ' nem vállalta') + ': ' + p.name + (rl ? '\nSzerep: ' + rl : '') + (when ? '\nIdőpont: ' + when : '') + '\n\n' + url, { htmlBody: html, name: 'Lumos Motion Projekttervező' }); }
  } catch (e) { Logger.log('Meghívás-visszajelzés hiba: ' + e); }
  if (yes) { try { const ev = calEvent_(p.calEventId), cr = readAll_('crew').find(x => x.id === cid) || {}, em = String(cr.email || '').trim().toLowerCase();   // elfogadás: a naptárában is ott legyen (vendégként, elfogadott válasszal)
    if (ev && em && typeof Calendar !== 'undefined' && Calendar.Events) { const eid = String(ev.getId()).replace(/@google\.com$/, ''), CID = evCalId_(ev), cur = Calendar.Events.get(CID, eid), att = cur.attendees || []; let f = att.find(x => String(x.email || '').toLowerCase() === em);
      if (!f) { f = { email: em }; att.push(f); } f.responseStatus = 'accepted'; Calendar.Events.patch({ attendees: att }, CID, eid, { sendUpdates: 'none' }); } } catch (e) { Logger.log('Meghívás – naptár (elfogadás) hiba: ' + e); } }
  return { ok: true };
}
/** A Google Naptárban adott válaszok (Igen / Nem) átvétele a függő meghívásokhoz. */
function invitesSync_(projects, onlyCid) {
  if (typeof Calendar === 'undefined' || !Calendar.Events) return false; let changed = false; const today = Utilities.formatDate(new Date(), SHEET_TZ, 'yyyy-MM-dd'); let crewEm = null;
  projects.forEach(p => { const inv = parseInvites_(p.invites), pend = Object.keys(inv).filter(k => inv[k].st === 'invited' && (!onlyCid || k === onlyCid)); if (!pend.length || !p.calEventId) return;
    if ((p.endDate || p.date || '') && (p.endDate || p.date) < today) return;
    try { const ev = calEvent_(p.calEventId); if (!ev) return; const cur = Calendar.Events.get(evCalId_(ev), String(ev.getId()).replace(/@google\.com$/, '')), st = {};
      (cur.attendees || []).forEach(x => { st[String(x.email || '').toLowerCase()] = x.responseStatus; });
      if (!crewEm) { crewEm = {}; readAll_('crew').forEach(c => { crewEm[c.id] = String(c.email || '').trim().toLowerCase(); }); }
      const upd = {}; pend.forEach(k => { const r = st[crewEm[k]]; if (r === 'accepted') upd[k] = 'yes'; else if (r === 'declined') upd[k] = 'no'; });
      if (!Object.keys(upd).length) return;
      withLock_(() => { const sh = sheetFor_('projects'), r = findRow_(sh, p.id); if (!r) return; const q = readRow_('projects', sh, r), iv = parseInvites_(q.invites);
        Object.keys(upd).forEach(k => { if (iv[k] && iv[k].st === 'invited') iv[k] = Object.assign(iv[k], { st: upd[k], ans: now_(), via: 'cal' }); });
        q.invites = JSON.stringify(iv); putRow_('projects', sh, q, r); p.invites = q.invites; changed = true; });
    } catch (e) { Logger.log('Meghívás-szinkron hiba (' + p.name + '): ' + e); } });
  if (changed) { try { dbFlush_(); dataBump_(); } catch (e) {} }
  return changed;
}
