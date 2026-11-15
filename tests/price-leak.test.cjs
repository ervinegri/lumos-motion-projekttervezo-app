/* Ártitok-teszt: a háttérkódot (apps-script/src/*.gs) node-ban futtatja utánzott Google-szolgáltatásokkal,
   feltölt egy projektet egyedi „jelölő” árakkal, majd termelési vezetőként, szakemberként és értékesítőként
   lekéri a betöltést (és a többi olvasó végpontot). Ha egy jelölőszám vagy tiltott mező bárhol megjelenik
   a válaszban, a teszt elbukik.
   Szabály (munkamódszer): árat, pénzügyet csak az ügyvezető lát; a termelési vezető a díjakat és a kiszámolt
   keretet (budgetFt) igen, az árat nem; a szakember csak a saját díját; az értékesítő csak a saját lehetőségét. */
const vm = require('vm'), fs = require('fs'), path = require('path'), assert = require('assert');
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'apps-script', 'src');
const CLIENT_ID = (fs.readFileSync(path.join(SRC, '00_alap.gs'), 'utf8').match(/GOOGLE_CLIENT_ID = '([^']+)'/) || [])[1];

const ctx = { console: { log() {}, warn() {}, error() {} }, Intl, Date, JSON, Math };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'gas', 'mock.js'), 'utf8'), ctx);
ctx.ContentService = { MimeType: { JSON: 'json' }, createTextOutput: t => ({ t, setMimeType() { return this; } }) };
let ID_TOKEN = {};
ctx.UrlFetchApp = { fetch: () => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify(ID_TOKEN) }), fetchAll: () => [] };
ctx.Utilities.base64EncodeWebSafe = s => Buffer.from(String(s)).toString('base64url');
ctx.Utilities.base64Encode = s => Buffer.from(String(s)).toString('base64');
const code = fs.readdirSync(SRC).filter(f => f.endsWith('.gs')).sort().map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
vm.runInContext(code + '\n;this.__api={setup,googleLogin,rpc};', ctx);
const A = ctx.__api;
A.setup();

const login = email => {
  ID_TOKEN = { aud: CLIENT_ID, iss: 'https://accounts.google.com', exp: String(Math.floor(Date.now() / 1000) + 300), email, email_verified: 'true', hd: 'lumosmotion.com' };
  const r = A.googleLogin('a.b.c');
  assert.ok(r && r.token, 'belépés sikertelen: ' + email);
  return r.token;
};

// Jelölők: egyedi számok, amelyek máshol nem fordulhatnak elő
const M = {
  quote: 7310011, extra: 7310013, budgetFt: 7310014,
  feeA: 7310021, feeB: 7310022,
  dealAdmin: 7310031, dealSales: 7310032,
  income: 7310041, expense: 7310042
};

const admin = login('ervin.egri@lumosmotion.com');
const R = (t, n, a) => A.rpc(t, n, a);

R(admin, 'saveCrew', { id: 'crew-aaaa', name: 'Teszt Anna', roles: ['Operatőr'], email: 'anna@lumosmotion.com' });
R(admin, 'saveCrew', { id: 'crew-bbbb', name: 'Teszt Béla', roles: ['Vágó'], email: 'bela@lumosmotion.com' });
R(admin, 'saveUser', { name: 'Teszt Vezető', role: 'editor', email: 'vezeto@lumosmotion.com', sendInvite: false });
R(admin, 'saveUser', { name: 'Teszt Anna', role: 'crew', crewId: 'crew-aaaa', email: 'anna@lumosmotion.com', sendInvite: false });
R(admin, 'saveUser', { name: 'Teszt Sára', role: 'sales', email: 'sara@lumosmotion.com', salary: '0', commLow: '10', commHigh: '12', commLimit: '1000000', sendInvite: false });

R(admin, 'saveProject', {
  id: 'proj-leak01', name: 'Ártitok projekt', date: '2026-12-01', client: 'Teszt Ügyfél Kft.', venue: 'Budapest', eventType: 'Konferencia',
  lead: 'crew-aaaa', status: 'tervezes', aftermovie: 1,
  crew: [{ crewId: 'crew-aaaa', role: 'Operatőr' }, { crewId: 'crew-bbbb', role: 'Vágó' }], equipment: [],
  quotePrice: M.quote, projectValue: M.quote, extras: [{ name: 'Extra', amount: M.extra, kind: 'extra' }],
  budgetMode: 'ft', budgetVal: M.budgetFt,
  fees: [{ crewId: 'crew-aaaa', name: 'Teszt Anna', amount: M.feeA }, { crewId: 'crew-bbbb', name: 'Teszt Béla', amount: M.feeB }],
  baseUpdatedAt: '', mutationId: 'mut-leak01'
});
R(admin, 'saveDeal', { title: 'Ügyvezetői lehetőség', client: 'Másik Kft.', value: M.dealAdmin, stage: 'uj', nextStep: 'Hívás', nextDate: '2026-12-10', note: 'belső jegyzet' });
R(admin, 'finUpsert', { table: 'income', row: { month: '2026-12', name: 'Teszt bevétel', amount: M.income } });
R(admin, 'finUpsert', { table: 'expense', row: { month: '2026-12', name: 'Teszt kiadás', amount: M.expense } });

const sales = login('sara@lumosmotion.com');
R(sales, 'saveDeal', { title: 'Saját lehetőség', client: 'Sára Ügyfele Kft.', value: M.dealSales, stage: 'uj', nextStep: 'Hívás', nextDate: '2026-12-10' });

// Az ügyvezető tényleg látja az árakat (különben a teszt semmit nem bizonyítana)
{
  const s = JSON.stringify(R(admin, 'bootstrap', {}));
  [M.quote, M.extra, M.feeA, M.feeB, M.dealAdmin, M.dealSales].forEach(v => assert.ok(s.includes(String(v)), 'az ügyvezetői betöltésből hiányzik: ' + v));
}

const FORBIDDEN_KEYS = ['quotePrice', 'projectValue', 'extras', 'budgetMode', 'budgetVal', 'payStatus', 'fin', 'invoices', 'commAmt'];
const roles = {
  editor: { token: login('vezeto@lumosmotion.com'), allow: [M.feeA, M.feeB, M.budgetFt], keysOk: [] },
  crew: { token: login('anna@lumosmotion.com'), allow: [M.feeA], keysOk: [] },
  sales: { token: sales, allow: [M.dealSales], keysOk: ['commAmt'] }
};
// Olvasó végpontok, amelyeket a szerepkör meghívhat (ami tiltott, az hibát dob – az is rendben van)
const READS = [['bootstrap', {}], ['dataVer', {}], ['projectHistory', { id: 'proj-leak01' }], ['changesList', {}], ['calendarEvents', {}],
  ['finData', {}], ['settingsData', {}], ['getLog', {}], ['projSales', { id: 'proj-leak01' }], ['clientInvoices', { client: 'Teszt Ügyfél Kft.' }]];

let fails = [];
const keyHits = (o, bad, trail, out) => {
  if (Array.isArray(o)) o.forEach((x, i) => keyHits(x, bad, trail + '[' + i + ']', out));
  else if (o && typeof o === 'object') Object.keys(o).forEach(k => {
    if (bad.includes(k) && o[k] !== null && o[k] !== undefined && o[k] !== '' && !(Array.isArray(o[k]) && !o[k].length)) out.push(trail + '.' + k);
    keyHits(o[k], bad, trail + '.' + k, out);
  });
  return out;
};
for (const [role, cfg] of Object.entries(roles)) {
  const all = Object.values(M).filter(v => !cfg.allow.includes(v));
  const bad = FORBIDDEN_KEYS.filter(k => !cfg.keysOk.includes(k));
  for (const [name, arg] of READS) {
    let res;
    try { res = R(cfg.token, name, arg); } catch (e) { continue; }   // nincs jogosultsága – ez a helyes
    const s = JSON.stringify(res);
    all.forEach(v => { if (s.includes(String(v))) fails.push(`${role} · ${name}: ár/díj szivárog (${v})`); });
    keyHits(res, bad, name, []).slice(0, 5).forEach(k => fails.push(`${role} · ${name}: tiltott mező ${k}`));
  }
}
// A szakember a saját díját lássa – ha ez eltűnne, a jelölő-ellenőrzés hamis biztonságot adna
assert.ok(JSON.stringify(R(roles.crew.token, 'bootstrap', {})).includes(String(M.feeA)), 'a szakember nem látja a saját díját');
assert.ok(JSON.stringify(R(sales, 'bootstrap', {})).includes(String(M.dealSales)), 'az értékesítő nem látja a saját lehetőségét');

if (fails.length) { console.error('FAIL ártitok:\n  ' + fails.join('\n  ')); process.exit(1); }
console.log('PASS ártitok: termelési vezető, szakember és értékesítő nem kap árat, más díját vagy pénzügyi adatot (' + READS.length + ' végpont)');
