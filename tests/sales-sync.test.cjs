// Sales App ↔ Projekttervező szinkron próbája (közös, memóriabeli „Neon” + a Projekttervező mentési logikája).
// Futtatás: node tests/sales-sync.test.cjs
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), crypto = require('node:crypto'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const ctx = vm.createContext({ console, Utilities: { getUuid: () => crypto.randomUUID() }, SpreadsheetApp: { flush() {} }, Logger: { log() {} },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }) } });
vm.runInContext(fs.readFileSync(path.join(root, 'apps-script/Code.gs'), 'utf8'), ctx);
vm.runInContext(`
  var DB = { projects: [], crew: [{ id: 'crew-nora-1', name: 'Marosvölgyi Nóra' }, { id: 'crew-koos-1', name: 'Koós Nándor' }], inventory: [], clients: [], crewAssign: [], eqAssign: [] }, LOG = [], T = 0;
  var NEON = { ls: null, links: {}, slog: [], afterRead: null };
  readAll_ = key => (DB[key] || []).map(x => Object.assign({}, x));
  sheetFor_ = key => ({ key });
  findRow_ = (sh, id) => { const i = DB[sh.key].findIndex(x => x.id === id); return i < 0 ? 0 : i + 1; };
  readRow_ = (key, sh, row) => Object.assign({}, DB[key][row - 1]);
  putRow_ = (key, sh, obj, row) => { const o = Object.assign({}, obj); if (row) DB[key][row - 1] = o; else DB[key].push(o); };
  rewriteAssign_ = (key, keep, add) => { DB[key] = DB[key].filter(keep).concat(add); };
  withLock_ = fn => fn(); dataBump_ = () => {}; logEvent_ = (...a) => LOG.push(a); syncCalendar_ = p => p;
  now_ = () => { T++; return '2026-11-06 16:' + String(Math.floor(T / 60)).padStart(2, '0') + ':' + String(T % 60).padStart(2, '0'); };
  today_ = () => '2026-11-06';
  loadBase_ = () => { const projects = readAll_('projects'); projects.forEach(p => { p.crew = DB.crewAssign.filter(r => r.projectId === p.id).map(r => ({ crewId: r.crewId, role: r.role })); p.equipment = []; });
    return { projects, crew: readAll_('crew'), inventory: [], clients: readAll_('clients') }; };
  dbOn_ = () => false;
  neonSql_ = list => list.map(({ query: q, params: p }) => {
    p = p || [];
    if (/^CREATE TABLE/.test(q)) return { rows: [] };
    if (/^SELECT rows::text, ver::text FROM ls_sheet/.test(q)) { const r = NEON.ls ? { rows: [[JSON.stringify(NEON.ls.rows), String(NEON.ls.ver)]] } : { rows: [] }; if (NEON.afterRead) { const f = NEON.afterRead; NEON.afterRead = null; f(); } return r; }
    if (/FROM ls_proforma/.test(q)) return { rows: NEON.proformas || [] };
    if (/^SELECT order_id/.test(q)) return { rows: Object.keys(NEON.links).map(k => [k, NEON.links[k].project_id, NEON.links[k].client_id, JSON.stringify(NEON.links[k].snap)]) };
    if (/^INSERT INTO lx_link/.test(q)) { NEON.links[p[0]] = { project_id: p[1], client_id: p[2], snap: JSON.parse(p[3]) }; return { rows: [] }; }
    if (/^UPDATE lx_link SET snap = snap \\|\\|/.test(q)) { NEON.links[p[0]].snap.deleted = '1'; return { rows: [] }; }
    if (/^UPDATE lx_link SET snap = \\$2/.test(q)) { NEON.links[p[0]].snap = JSON.parse(p[1]); return { rows: [] }; }
    if (/^UPDATE ls_sheet/.test(q)) { if (NEON.ls.ver !== Number(p[2])) return { rows: [] }; NEON.ls = { rows: JSON.parse(p[1]), ver: NEON.ls.ver + 1 }; return { rows: [[String(NEON.ls.ver)]] }; }
    if (/^INSERT INTO ls_log/.test(q)) { NEON.slog.push(p); return { rows: [] }; }
    throw new Error('Ismeretlen lekérdezés: ' + q);
  });
`, ctx);
const run = s => vm.runInContext(s, ctx), json = s => { const v = JSON.stringify(run(s)); return v === undefined ? undefined : JSON.parse(v); };
// A Sales App fejlécei (a Sales Code.gs FIELDS sorrendje)
const HEAD = ['Márka / stand', 'Kapcsolattartó', 'Email', 'Telefonszám', 'Cégnév', 'Adószám', 'Értékesítő', 'Short összesen', 'Beszédes short db', 'Zenés short db', 'Forgatás időpontja', 'Megjegyzés',
  'Értékesítési státusz', 'Rendezvény', 'Rögzítve', 'Módosítva', 'Operatőr', 'Azonosító', 'Utolsó műveletazonosító', 'Forgatás megtörtént', 'Forgatás visszaigazolva', 'Forgatási megjegyzés',
  'Második forgatás időpontja', 'Instrukció az operatőrnek', 'Instrukció az operatőrnek – második forgatás', 'Számlázási cím', 'Nettó végösszeg (Ft)', 'ÁFA-besorolás', 'Fizetés módja', 'Vállalt átadás'];
const col = h => HEAD.indexOf(h);
const order = (o) => { const r = HEAD.map(() => ''); Object.keys(o).forEach(h => { r[col(h)] = o[h]; }); return r; };
const A = '11111111-aaaa-4aaa-8aaa-111111111111', B = '22222222-bbbb-4bbb-8bbb-222222222222', C = '33333333-cccc-4ccc-8ccc-333333333333';
const rows = [HEAD,
  order({ 'Márka / stand': 'Well Aging', 'Kapcsolattartó': 'Kiss Anna', 'Email': 'anna@wellaging.hu', 'Telefonszám': '+36 30 111 2222', 'Cégnév': 'Well Aging Kft.', 'Adószám': '12345678241',
    'Értékesítő': 'Guzsloványi Flóra', 'Beszédes short db': 2, 'Zenés short db': 1, 'Forgatás időpontja': '2026-11-15 10:20', 'Értékesítési státusz': 'megrendelt', 'Rendezvény': 'Vegan Summit 2026',
    'Módosítva': '2026-11-06 15:00:00', 'Operatőr': 'Marosvölgyi Nóra', 'Azonosító': A, 'Forgatás megtörtént': false, 'Instrukció az operatőrnek': 'Termékfotó a standnál', 'Számlázási cím': '1111 Budapest, Fő u. 1.',
    'Nettó végösszeg (Ft)': '159300', 'ÁFA-besorolás': '27', 'Fizetés módja': 'Átutalás', 'Vállalt átadás': '2026-11-22' }),
  order({ 'Márka / stand': 'Piszkozat Bt', 'Értékesítési státusz': 'piszkozat', 'Módosítva': '2026-11-06 15:00:00', 'Azonosító': B, 'Beszédes short db': 1, 'Zenés short db': 0 }),
  order({ 'Márka / stand': 'Green Bar', 'Kapcsolattartó': 'Nagy Béla', 'Email': 'bela@green.hu', 'Telefonszám': '+36 20 333 4444', 'Cégnév': 'Green Bar Kft.', 'Adószám': '87654321242',
    'Beszédes short db': 1, 'Zenés short db': 0, 'Forgatás időpontja': '2026-11-15 12:00', 'Értékesítési státusz': 'megrendelt', 'Rendezvény': 'Vegan Summit 2026', 'Módosítva': '2026-11-06 15:00:00',
    'Operatőr': 'Ismeretlen Operatőr', 'Azonosító': C })];
run(`NEON.ls = { rows: ${JSON.stringify(rows)}, ver: 5 };`);
const sales = id => { const r = json('NEON.ls.rows').find(x => x[col('Azonosító')] === id); const o = {}; HEAD.forEach((h, i) => { o[h] = r[i]; }); return o; };
const setSales = (id, h, v, upd) => run(`(() => { const r = NEON.ls.rows.find(x => x[${col('Azonosító')}] === ${JSON.stringify(id)}); r[${col(h)}] = ${JSON.stringify(v)}; r[${col('Módosítva')}] = ${JSON.stringify(upd || '2026-11-06 15:00:00')}; NEON.ls.ver++; })()`);
const proj = id => json(`DB.projects.find(p => p.id === 'sales-${id}')`);
const editProj = (id, changes) => run(`(() => { const p = loadBase_().projects.find(p => p.id === 'sales-${id}'); ['crewNotes','crewDays','editTasks'].forEach(k => delete p[k]);
  return saveProject_({ id: 'u1', name: 'Ervin', role: 'admin' }, Object.assign(p, ${JSON.stringify(changes)}, { mutationId: Utilities.getUuid(), baseUpdatedAt: p.updatedAt, crewFinalSkip: true })); })()`);
function test(name, fn) { fn(); console.log('PASS', name); }

test('új végleges rendelésből ügyfél és projekt lesz (piszkozatból nem)', () => {
  const r = json('salesSync()');
  assert.equal(r.created, 2); assert.deepEqual(r.errors, []);
  const p = proj(A);
  assert.equal(p.name, 'Well Aging – Vegan Summit 2026'); assert.equal(p.client, 'Well Aging Kft.'); assert.equal(p.eventType, 'Short videó forgatás');
  assert.equal(p.date, '2026-11-15'); assert.equal(p.startTime, '10:20'); assert.equal(p.short60, 3); assert.equal(Number(p.quotePrice), 159300);
  assert.equal(p.status, 'tervezes'); assert.equal(p.techPlan, 'Termékfotó a standnál'); assert.equal(p.clientTax, '12345678-2-41');
  assert.match(p.notes, /2 beszédes \+ 1 zenés/); assert.match(p.notes, /Fizetés: Átutalás/); assert.match(p.notes, /ÁFA: 27%/);
  assert.deepEqual(json(`DB.crewAssign.filter(r => r.projectId === 'sales-${A}').map(r => r.crewId)`), ['crew-nora-1']);
  const c = json(`DB.clients.find(c => c.name === 'Well Aging Kft.')`);
  assert.equal(c.tax, '12345678-2-41'); assert.equal(c.address, '1111 Budapest, Fő u. 1.'); assert.equal(c.contactName, 'Kiss Anna');
  assert.equal(proj(B), undefined);
  assert.ok(json(`LOG`).some(l => /nem található a Stáb listában/.test(l[3] || '')), 'ismeretlen operatőr jelezve');
});
test('ismételt futás: nincs változás, nincs mentés', () => {
  const r = json('salesSync()'); assert.equal(r.created + r.updated + r.pulled, 0);
});
test('Salesben módosított videószám és ár átmegy', () => {
  run(`(() => { const r = NEON.ls.rows.find(x => x[${col('Azonosító')}] === '${A}'); r[${col('Zenés short db')}] = 3; r[${col('Nettó végösszeg (Ft)')}] = '212400'; r[${col('Módosítva')}] = '2026-11-06 16:30:00'; NEON.ls.ver++; })()`);
  const r = json('salesSync()'); if (r.updated !== 1) console.log(JSON.stringify(r), JSON.stringify(json("NEON.links['" + A + "'].snap"))); assert.equal(r.updated, 1);
  assert.equal(proj(A).short60, 5); assert.equal(Number(proj(A).quotePrice), 212400);
});
test('Projekttervezőben módosított időpont visszamegy a Salesbe (napló, Módosítva frissül)', () => {
  editProj(A, { startTime: '11:00', contactPhone: '+36 30 999 0000' });
  const r = json('salesSync()'); assert.equal(r.pulled, 1); assert.deepEqual(r.errors, []);
  const s = sales(A);
  assert.equal(s['Forgatás időpontja'], '2026-11-15 11:00'); assert.equal(s['Telefonszám'], '+36 30 999 0000');
  assert.notEqual(s['Módosítva'], '2026-11-06 16:30:00');
  assert.match(s['Utolsó műveletazonosító'], /^pt-sync-/);
  assert.ok(json('NEON.slog').some(l => l[3] === 'Módosítás a Projekttervezőből'));
  assert.equal(json('salesSync()').pulled, 0, 'nem pattog');
});
test('Projekttervezőben átírt ár csak ott változik, a Sales nem írja vissza', () => {
  editProj(A, { projectValue: 250000 });
  json('salesSync()');
  assert.equal(Number(proj(A).quotePrice), 250000); assert.equal(sales(A)['Nettó végösszeg (Ft)'], '212400');
});
test('ütközés: mindkét oldalon módosított mező – a később módosított nyer', () => {
  editProj(A, { contactName: 'Kiss Anna (PT)' });                              // PT: 16:xx
  setSales(A, 'Kapcsolattartó', 'Kiss Anna (Sales)', '2026-11-06 17:59:00');   // Sales: később
  json('salesSync()');
  assert.equal(proj(A).contactName, 'Kiss Anna (Sales)'); assert.equal(sales(A)['Kapcsolattartó'], 'Kiss Anna (Sales)');
  assert.ok(json('LOG').some(l => /Sales App újabb értéke maradt/.test(l[3] || '')));
});
test('visszaírás közben mentettek a Salesben: nem írja felül, a következő futás pótolja', () => {
  editProj(A, { techPlan: 'Új instrukció a PT-ből' });
  run(`NEON.afterRead = null;`);
  // a második olvasás (visszaírás előtti friss olvasás) után a Salesben valaki ment
  run(`(() => { let n = 0; const orig = neonSql_; neonSql_ = list => { const r = orig(list); if (/ls_sheet WHERE tab/.test(list[0].query) && ++n === 2) { NEON.ls.ver++; } return r; }; globalThis.__restore = () => { neonSql_ = orig; }; })()`);
  const r1 = json('salesSync()'); run('__restore()');
  assert.equal(r1.pulled, 0); assert.ok(r1.errors.some(e => /közben módosult/.test(e)));
  assert.notEqual(sales(A)['Instrukció az operatőrnek'], 'Új instrukció a PT-ből');
  const r2 = json('salesSync()'); assert.equal(r2.pulled, 1);
  assert.equal(sales(A)['Instrukció az operatőrnek'], 'Új instrukció a PT-ből'); assert.equal(proj(A).techPlan, 'Új instrukció a PT-ből');
});
test('Salesben kész forgatás → Utómunka', () => {
  setSales(A, 'Forgatás megtörtént', true, '2026-11-06 18:10:00');
  json('salesSync()'); assert.equal(proj(A).status, 'utomunka');
});
test('Projekttervezőben lemondott projekt → a Salesben „lemondva”', () => {
  editProj(C, { status: 'lemondva', prevStatus: 'tervezes', cancelReason: 'Ügyfél lemondta' });
  json('salesSync()'); assert.equal(sales(C)['Értékesítési státusz'], 'lemondva');
});
test('Salesben törölt rendelés projektje „Lemondva” lesz, nem törlődik', () => {
  run(`NEON.ls.rows = NEON.ls.rows.filter(x => x[${col('Azonosító')}] !== '${A}'); NEON.ls.ver++;`);
  const r = json('salesSync()'); assert.equal(r.cancelled, 1);
  assert.equal(proj(A).status, 'lemondva'); assert.match(proj(A).cancelReason, /Sales Appban törölték/);
  assert.equal(json('salesSync()').cancelled, 0);
});
console.log('Sales szinkron: minden rendben.');
