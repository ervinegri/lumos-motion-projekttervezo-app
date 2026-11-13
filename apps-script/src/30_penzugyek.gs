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
    r.bank2 = ['Binx', 'OTP', 'Revolut', 'Egyéb'].find(b => b.toLowerCase() === String(a.bank2 || '').toLowerCase()) || '';   // kölcsönnél: honnan érkezett; visszafizetésnél: hova ment
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
  const out = withLock_(() => { writeProjectPay_(str_(a && a.projectId, 64), st); dbFlush_(); dataBump_(); return { projectId: a.projectId, payStatus: st }; });
  return out;
}
function writeProjectPay_(projectId, st) {
  const sh = sheetFor_('projects'), row = findRow_(sh, projectId);
  if (!row) throw new Error('A projekt nem található.');
  let wasPaid = false, wmWas = false; try { const old = readRow_('projects', sh, row); wasPaid = String(old.payStatus || '') === 'teljes'; wmWas = !wasPaid && wmActive_(old); } catch (e) { }
  if (st === 'teljes' && !wasPaid && wmWas) WM_PAID_.push(projectId);   // a vízjel most kerül le → az ügyfél e-mailt kap (a zár után)
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

