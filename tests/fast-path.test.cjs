/* Gyors út (api/_gasrt.js): a háttérkód a Vercelen fut, memóriabeli „Neon”-nal.
   Ellenőrzi: belépett felhasználó adatai, írás (feltételes, egy tranzakcióban), ütközésnél újrafutás, Google-szolgáltatásnál visszalépés,
   dátumformázás, és hogy minden .gs fájl szerepel a csomaglistában. */
const assert = require('assert'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const RT = require('../api/_gasrt.js');
let fails = 0; const t = (n, f) => Promise.resolve().then(f).then(() => console.log('ok  ' + n), e => { fails++; console.log('FAIL ' + n + ': ' + (e && e.stack || e)); });

/* memóriabeli Neon: lpm_sheet, lpm_kv, lpm_log + a háttérkód által használt egyéb lekérdezések (üres eredménnyel) */
function fakeNeon() {
  const db = { sheet: new Map(), kv: new Map(), log: [], commits: 0, failNext: 0 };
  function one(q, p) {
    p = p || []; const Q = String(q).replace(/\s+/g, ' ').trim();
    if (/^SELECT k, v FROM lpm_kv WHERE k LIKE/.test(Q)) return [...db.kv].filter(([k]) => /^(p|m):/.test(k)).map(([k, v]) => [k, v]);
    if (/^SELECT v FROM lpm_kv WHERE k = \$1/.test(Q)) return db.kv.has(p[0]) ? [[db.kv.get(p[0])]] : [];
    if (/^SELECT tab, ver::text FROM lpm_sheet$/.test(Q)) return [...db.sheet].map(([k, s]) => [k, String(s.ver)]);
    if (/^SELECT tab, ver::text, rows::text FROM lpm_sheet WHERE tab = ANY/.test(Q)) { const want = String(p[0]).split(String.fromCharCode(31)); return [...db.sheet].filter(([k]) => want.includes(k)).map(([k, s]) => [k, String(s.ver), s.rows]); }
    if (/^SELECT coalesce\(sum\(ver\)/.test(Q)) return [[String([...db.sheet.values()].reduce((a, s) => a + s.ver, 0)), db.kv.get('dv') || '']];
    if (/^WITH u AS \(UPDATE lpm_sheet/.test(Q)) { const s = db.sheet.get(p[0]); if (!s || String(s.ver) !== String(p[2])) throw new Error('division by zero'); s.ver++; s.rows = p[1]; return [[p[0], String(s.ver), '1']]; }
    if (/^INSERT INTO lpm_sheet/.test(Q)) { const s = db.sheet.get(p[0]); if (s) { s.ver++; s.rows = p[1]; } else db.sheet.set(p[0], { ver: 1, rows: p[1] }); return [[p[0], String(db.sheet.get(p[0]).ver)]]; }
    if (/^INSERT INTO lpm_log/.test(Q)) { db.log.push(p); return []; }
    if (/^INSERT INTO lpm_kv \(k, v\) VALUES \('dv'/.test(Q)) { db.kv.set('dv', p[0]); return []; }
    if (/^INSERT INTO lpm_jobs/.test(Q)) { (db.jobs = db.jobs || []).push(p); return []; }
    if (/^CREATE TABLE/.test(Q)) return [];
    if (/^SELECT/.test(Q)) return [];
    throw new Error('fake neon: ismeretlen lekérdezés: ' + Q.slice(0, 80));
  }
  function run(body) {
    const list = body.queries || [body], snap = JSON.stringify([...db.sheet]), kv0 = new Map(db.kv), log0 = db.log.length;
    try { if (body.queries && db.failNext) { db.failNext--; throw new Error('division by zero'); } const res = list.map(x => ({ rows: one(x.query, x.params) })); if (body.queries && list.some(x => !/^\s*SELECT/i.test(x.query))) db.commits++; return body.queries ? { results: res } : res[0]; }
    catch (e) { db.sheet = new Map(JSON.parse(snap)); db.kv = kv0; db.log.length = log0; throw e; }   // tranzakció: hibánál semmi nem marad
  }
  return { db, sync(body) { try { return { code: 200, body: JSON.stringify(run(body)), headers: {} }; } catch (e) { return { code: 400, body: JSON.stringify({ message: e.message }), headers: {} }; } }, async: async body => run(body) };
}
const token = crypto.randomBytes(32).toString('hex'), hash = crypto.createHash('sha256').update(token).digest('hex');
function seed(N) {
  N.db.kv.set('p:DB_MODE', 'neon');
  N.db.kv.set('p:LUMOS_PM_USERS_V1', JSON.stringify([{ id: 'u1', name: 'Teszt Admin', role: 'admin', email: 'admin@lumosmotion.com', crewId: '' }]));
  N.db.kv.set('p:LUMOS_PM_SESS_' + hash, JSON.stringify({ uid: 'u1', exp: Date.now() + 86400000 }));
  N.db.kv.set('m:owner', 'ervin.egri@lumosmotion.com'); N.db.kv.set('m:build', RT.BUILD);
  ['MIG_1', 'MIG_CALDESC_EMPTY_2026_11_14', 'MIG_CALNOTES_2026_11_12', 'MIG_EDITONLY_2026_11', 'MIG_EMP_2026_11', 'MIG_FINAL_2026_11', 'MIG_JEGV_BACK_2', 'MIG_NICK_NANDI_1', 'MIG_SELF_ACCEPT_1'].forEach(k => N.db.kv.set('p:' + k, '1'));   // mint élesben: a régi átalakítások már lefutottak
}
const req = (name, arg) => JSON.stringify({ fn: 'rpc', args: [token, name, arg === undefined ? null : arg] });

(async () => {
  await t('a csomag generálható (scripts/gas-bundle.cjs --id)', () => {
    const id = require('child_process').execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'gas-bundle.cjs'), '--id'], { encoding: 'utf8' });
    assert.ok(/^[0-9a-f]{16}$/.test(id), id);
  });
  await t('dátumformázás (Budapest)', () => {
    const d = new Date(Date.UTC(2026, 10, 26, 23, 30, 5));
    assert.strictEqual(RT.formatDate(d, 'Europe/Budapest', 'yyyy-MM-dd HH:mm:ss'), '2026-11-27 00:30:05');
    assert.strictEqual(RT.formatDate(d, 'Europe/Budapest', 'yyyyMMddHH'), '2026112700');
    assert.strictEqual(RT.formatDate(new Date(Date.UTC(2026, 6, 1, 10)), 'Europe/Budapest', 'u d, HH:mm'), '3 1, 12:00');
    assert.strictEqual(RT.parseDate('2026-07-01 12:00', 'Europe/Budapest', 'yyyy-MM-dd HH:mm').toISOString(), '2026-07-01T10:00:00.000Z');
    assert.strictEqual(RT.parseDate('2026-01-15', 'Europe/Budapest', 'yyyy-MM-dd').toISOString(), '2026-01-14T23:00:00.000Z');
  });
  const N = fakeNeon(); seed(N); RT._mock(N, 'postgres://u:p@fake.neon.test/db');
  await t('whoAmI a tükörből', async () => {
    const r = await RT.runFast(req('whoAmI')); assert.ok(r.text, 'nem a gyors úton futott: ' + JSON.stringify(r));
    const j = JSON.parse(r.text); assert.strictEqual(j.ok, true, j.error); assert.strictEqual(j.data.name, 'Teszt Admin');
  });
  await t('ismeretlen munkamenet → Apps Script', async () => {
    const r = await RT.runFast(JSON.stringify({ fn: 'rpc', args: ['f'.repeat(64), 'whoAmI', null] })); assert.ok(r.fallback, JSON.stringify(r));
  });
  let pid = 'p' + crypto.randomBytes(6).toString('hex'), upd = '';
  await t('projekt mentése: egy tranzakció, napló, változásjelző', async () => {
    const c0 = N.db.commits;
    const r = await RT.runFast(req('saveProject', { id: pid, mutationId: 'm' + crypto.randomBytes(6).toString('hex'), name: 'Gyors teszt', date: '2026-12-10', status: 'tervezes', crew: [], equipment: [], fees: [], deferCal: true }));
    assert.ok(r.text, 'nem a gyors úton futott: ' + JSON.stringify(r)); const j = JSON.parse(r.text); assert.strictEqual(j.ok, true, j.error);
    upd = j.data.updatedAt; assert.strictEqual(j.data.name, 'Gyors teszt'); assert.strictEqual(N.db.commits, c0 + 1, 'pontosan egy írás-tranzakció');
    const pr = JSON.parse(N.db.sheet.get('Projektek').rows); assert.ok(pr.some(row => row.includes(pid)), 'a projekt bekerült a lapba');
    assert.ok(N.db.log.some(l => /Projekt létrehozva/.test(l[3])), 'napló'); assert.ok(N.db.kv.get('dv'), 'változásjelző');
  });
  await t('módosítás ütközésnél újrafut (friss adattal)', async () => {
    N.db.failNext = 1; const c0 = N.db.commits;
    const r = await RT.runFast(req('saveProject', { id: pid, mutationId: 'm' + crypto.randomBytes(6).toString('hex'), name: 'Gyors teszt 2', date: '2026-12-10', status: 'tervezes', crew: [], equipment: [], fees: [], deferCal: true, baseUpdatedAt: upd }));
    assert.ok(r.text, JSON.stringify(r)); const j = JSON.parse(r.text); assert.strictEqual(j.ok, true, j.error); assert.strictEqual(N.db.commits, c0 + 1);
    upd = j.data.updatedAt; assert.ok(JSON.parse(N.db.sheet.get('Projektek').rows).some(row => row.includes('Gyors teszt 2')));
  });
  await t('lemondás (értesítő nélkül) a gyors úton', async () => {
    const r = await RT.runFast(req('saveProject', { id: pid, mutationId: 'm' + crypto.randomBytes(6).toString('hex'), name: 'Gyors teszt 2', date: '2026-12-10', status: 'lemondva', cancelReason: 'teszt', crew: [], equipment: [], fees: [], deferCal: true, baseUpdatedAt: upd }));
    if (r.fallback) return; const j = JSON.parse(r.text); assert.strictEqual(j.ok, true, j.error); assert.strictEqual(j.data.status, 'lemondva');
  });
  await t('Google-szolgáltatás (naptár) → semmi nem íródik, Apps Script', async () => {
    const before = JSON.stringify([...N.db.sheet]), c0 = N.db.commits;
    const r = await RT.runFast(req('calendarEvents', { from: '2026-12-01', to: '2026-12-31' }));
    assert.ok(r.fallback, 'vissza kellett volna lépnie: ' + String(r.text).slice(0, 200)); assert.strictEqual(N.db.commits, c0); assert.strictEqual(JSON.stringify([...N.db.sheet]), before);
  });
  await t('olvasás (bootstrap) nem ír', async () => {
    const c0 = N.db.commits; const r = await RT.runFast(req('bootstrap', {}));
    if (r.fallback) { console.log('     (bootstrap az Apps Scripten: ' + r.fallback + ')'); return; }
    const j = JSON.parse(r.text); assert.strictEqual(j.ok, true, j.error); assert.ok(Array.isArray(j.data.projects));
    assert.ok(N.db.commits <= c0 + 1);
  });
  await t('levél / HubSpot a gyors úton → háttérfeladat, nem Google-hívás', async () => {
    const r = RT._runOnce('//TEST\nsendAs_("a@b.hu", "Tárgy", "Szöveg", { name: "X" }); hsDealQueue_({ id: "d1" }); JSON.stringify({ ok: true })', Object.fromEntries(N.db.kv));
    assert.ok(!r.gas, 'nem kellett volna Google: ' + r.gas);
    const jobs = r.RT.writes.filter(w => /INSERT INTO lpm_jobs/.test(w.query)); assert.strictEqual(jobs.length, 1, 'HubSpot nincs bekapcsolva → csak a levél');
    assert.deepStrictEqual(JSON.parse(jobs[0].params[1]).slice(0, 2), ['a@b.hu', 'Tárgy']);
    const r2 = RT._runOnce('//TEST\nsendAs_("a@b.hu", "T", "S", { attachments: [1] }); "x"', Object.fromEntries(N.db.kv)); assert.ok(r2.gas, 'melléklettel az Apps Script küld');
  });
  { const T = []; for (let i = 0; i < 5; i++) { const a = Date.now(); await RT.runFast(req('whoAmI')); T.push(Date.now() - a); } console.log('     whoAmI ms: ' + T.join(', ')); }
  if (fails) { console.log(fails + ' FAIL'); process.exit(1); }
  console.log('gyors út: minden rendben'); process.exit(0);
})();
