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
/** Tartalék: naponta egyszer (reggel) a kifizetések lekérdezése a számlázz.hu-tól – ha egy IPN-értesítés elmaradna. */
function szDailySync() { try { if (!szamlazzKey_()) return; szSync_({ id: 'sz-auto', name: 'számlázz.hu (napi ellenőrzés)', role: 'admin', email: '' }, {}); } catch (e) { Logger.log('Napi kifizetés-ellenőrzés: ' + e); } try { if (DB_) dbFlush_(); } catch (e) { } }
function szDailyEnsure_() {
  const P = PropertiesService.getScriptProperties(); if (P.getProperty('SZ_DAILY_INSTALLED')) return;
  try { if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'szDailySync')) ScriptApp.newTrigger('szDailySync').timeBased().atHour(6).everyDays(1).inTimezone(SHEET_TZ).create(); P.setProperty('SZ_DAILY_INSTALLED', now_()); } catch (e) { Logger.log('Napi kifizetés-ellenőrzés időzítő: ' + e); }
}
function salesSyncEnsure_() {
  const P = PropertiesService.getScriptProperties();
  if (P.getProperty('SALES_SYNC_INSTALLED')) return;
  try { installSalesSync(); P.setProperty('SALES_SYNC_INSTALLED', now_()); } catch (e) { Logger.log('Sales szinkron időzítő: ' + e); }
}

/* ===================== ÁRKALKULÁTOR ÁRAI =====================
   Az ügyvezető a Projekttervezőben (Értékesítés → Árkalkulátor → ⚙️ Árak) szerkeszti; a kalkulátor-oldalak nyilvánosan olvassák.
   Csak az alapártól eltérő / megadott értékek tárolódnak: { r: {kulcs: szám}, e: {kulcs: szám} }. */
const ARK_PRICES_PROPERTY = 'ARK_PRICES';
const ARK_KEYS_ = {
  r: ['i0', 'i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'i7', 'i10', 'hour', 'equip', 'deliv', 'perkm', 'zone', 'buyb', 'buyp', 'keepb', 'keepp', 'rush'],
  e: ['i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'i7', 'i12', 'streamx', 'hour', 'edit', 'deliv', 'perkm', 'zone', 'buyb', 'buyp', 'keepb', 'keepp', 'rush'],
  s: ['edit', 'script', 'cine', 'drone', 'hour', 'labmin', 'deliv', 'perkm', 'zone']   // Short videó kalkulátor
};
function arkPrices_() {
  let o = {};
  try { o = JSON.parse(PropertiesService.getScriptProperties().getProperty(ARK_PRICES_PROPERTY) || '{}') || {}; } catch (e) { o = {}; }
  return { r: o.r || {}, e: o.e || {}, s: o.s || {}, updatedAt: o.updatedAt || '', updatedBy: o.updatedBy || '' };
}
function arkPricesSet_(u, arg) {
  const out = { r: {}, e: {}, s: {} };
  ['r', 'e', 's'].forEach(pg => {
    const src = (arg && arg[pg]) || {};
    ARK_KEYS_[pg].forEach(k => {
      if (src[k] === '' || src[k] == null) return;
      const v = Number(String(src[k]).replace(/\s/g, '').replace(',', '.'));
      if (!isFinite(v) || v < 0) throw new Error('Érvénytelen ár: ' + k);
      const pct = k === 'buyp' || k === 'keepp' || k === 'rush';
      if (pct && v > 500) throw new Error('A százalék legfeljebb 500 lehet.');
      if (!pct && v > 100000000) throw new Error('Túl nagy ár.');
      out[pg][k] = pct ? Math.round(v * 100) / 100 : Math.round(v);
    });
  });
  out.updatedAt = now_(); out.updatedBy = u.name;
  PropertiesService.getScriptProperties().setProperty(ARK_PRICES_PROPERTY, JSON.stringify(out));
  return arkPrices_();
}

/** EGYSZER, A SZERKESZTŐBŐL FUTTATVA (▶ Futtatás → engedélyezés): az időzített feladatok telepítése és állapota.
 *  Az engedélyezési ablak ekkor kéri az időzítőkhöz szükséges jogosultságot (script.scriptapp). Többször is futtatható. */
function setupTriggers() {
  const P = PropertiesService.getScriptProperties(), out = [];
  const ensure = (fn, mk) => { try { if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === fn)) { mk(); out.push(fn + ': telepítve'); } else out.push(fn + ': már fut'); } catch (e) { out.push(fn + ': HIBA – ' + e); } };
  ensure('szDailySync', () => ScriptApp.newTrigger('szDailySync').timeBased().atHour(6).everyDays(1).inTimezone(SHEET_TZ).create());
  ensure('salesSync', () => ScriptApp.newTrigger('salesSync').timeBased().everyMinutes(5).create());
  if (navConfig_().ok) ensure('navDailySync', () => ScriptApp.newTrigger('navDailySync').timeBased().atHour(7).everyDays(1).inTimezone(SHEET_TZ).create());
  if (P.getProperty(DB_MODE_PROPERTY) === 'neon') ensure('dbNightlyBackup', () => ScriptApp.newTrigger('dbNightlyBackup').timeBased().atHour(2).everyDays(1).inTimezone(SHEET_TZ).create());
  P.setProperty('SZ_DAILY_INSTALLED', now_()); P.setProperty('SALES_SYNC_INSTALLED', now_());
  Logger.log(out.join('\n')); return out;
}
/** Az időzítők állapota (ügyvezetői RPC): fut-e a napi számlázz.hu-ellenőrzés stb. */
function triggerStatus_() {
  try { return { ok: true, triggers: ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction()) }; }
  catch (e) { return { ok: false, error: String(e && e.message || e) }; }
}

/* ===================== SZERZŐDÉSSABLONOK A DRIVE-BAN =====================
 * A sablonok szerkeszthető .docx fájlként a Lumos főmappa „Szerződéssablonok” mappájában vannak; a fájlnévben zárójelben a kulcs,
 * pl. „Keretszerződés – Lumos Motion Kft. (lumos_keret).docx”. Ha nincs ilyen fájl, a kódba épített sablon (Templates.gs) az alap. */
const CT_KEYS_ = { lumos_keret: 'Keretszerződés – Lumos Motion Kft.', lumos_hatarozott: 'Megbízási szerződés – Lumos Motion Kft.', lumos_shortok: 'Kiállítói videós megbízás – Lumos Motion Kft.', egri_keret: 'Kizárólagos keretmegállapodás – Egri Ervin E.V.', egri_hatarozott: 'Megbízási szerződés – Egri Ervin E.V.' };
const DOCX_MIME_ = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
function ctTplFolder_(create) {
  const P = PropertiesService.getScriptProperties(), id = P.getProperty('CT_TPL_FOLDER');
  if (id) { try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) { } }
  if (!create) return null;
  const root = lumosRoot_(); if (!root) throw new Error('A Lumos főmappa nem található.');
  const f = folderPath_(root, 'Szerződéssablonok', {}); P.setProperty('CT_TPL_FOLDER', f.getId()); return f;
}
function ctTplFile_(k) {
  const fo = ctTplFolder_(false); if (!fo) return null;
  const it = fo.getFiles(); let best = null;
  while (it.hasNext()) { const f = it.next(); if (f.getName().indexOf('(' + k + ')') < 0) continue; if (!best || f.getLastUpdated() > best.getLastUpdated()) best = f; }
  return best;
}
function ctTplGet_(k, a) {
  if (!CT_KEYS_[k]) throw new Error('Ismeretlen szerződéssablon.');
  const img = typeof CONTRACT_TPL_ !== 'undefined' ? CONTRACT_TPL_.img : '';
  if (!(a && a.builtin)) {
    try {
      const f = ctTplFile_(k);
      if (f) {
        let blob;
        if (f.getMimeType() === MimeType.GOOGLE_DOCS) blob = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + f.getId() + '/export?mimeType=' + encodeURIComponent(DOCX_MIME_), { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob();
        else blob = f.getBlob();
        return { zip: Utilities.base64Encode(blob.getBytes()), img: img, full: true, src: 'drive', name: f.getName(), url: f.getUrl(), updated: f.getLastUpdated().toISOString() };
      }
    } catch (e) { Logger.log('Drive-sablon (' + k + '): ' + e); }
  }
  if (typeof CONTRACT_TPL_ === 'undefined' || !CONTRACT_TPL_[k]) throw new Error('Ismeretlen szerződéssablon.');
  return { zip: CONTRACT_TPL_[k], img: img, src: 'builtin' };
}
/** A sablonmappa állapota: melyik sablonnak van Drive-os példánya. */
function ctTplList_() {
  const fo = ctTplFolder_(false), out = {};
  Object.keys(CT_KEYS_).forEach(k => { const f = fo ? ctTplFile_(k) : null; out[k] = f ? { name: f.getName(), url: f.getUrl(), updated: f.getLastUpdated().toISOString() } : null; });
  return { folder: fo ? fo.getUrl() : '', items: out, titles: CT_KEYS_ };
}
/** Egy sablon feltöltése a mappába (a böngésző állítja össze a teljes .docx-et a beépített sablonból). Meglévőt nem ír felül. a: {k, b64} */
function ctTplUpload_(u, a) {
  const k = String(a && a.k || ''); if (!CT_KEYS_[k]) throw new Error('Ismeretlen szerződéssablon.');
  const b64 = String(a.b64 || ''); if (!b64 || b64.length > 8 * 1024 * 1024) throw new Error('Hiányzik a sablon.');
  const fo = ctTplFolder_(true); if (ctTplFile_(k)) return ctTplList_();
  fo.createFile(Utilities.newBlob(Utilities.base64Decode(b64), DOCX_MIME_, CT_KEYS_[k] + ' (' + k + ').docx'));
  logEvent_(u, 'Szerződéssablon a Drive-ba', CT_KEYS_[k], '');
  return ctTplList_();
}
