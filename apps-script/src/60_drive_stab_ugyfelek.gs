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
  const vat = c.vat === 'afa', first = huFirst_(String(c.name || '')) || c.name, e = escapeHtml_;
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
