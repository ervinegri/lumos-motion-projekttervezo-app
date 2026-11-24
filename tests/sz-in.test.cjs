'use strict';
/* számlázz.hu bejövő adatkapcsolat (pénz, kívülről érkező adat): hibás kulccsal semmi nem íródik be, ugyanaz a banki tétel
   kétszer csak egyszer kerül be, és a banki párosítás nem ad hamis számlaszám-egyezést (pl. „…-000” vagy egy dátum napja). */
const vm = require('vm'), fs = require('fs'), path = require('path'), assert = require('assert');
const SRC = path.join(__dirname, '..', 'apps-script', 'src');
const ctx = { console: { log() {}, warn() {}, error() {} }, Intl, Date, JSON, Math };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'gas', 'mock.js'), 'utf8'), ctx);
ctx.ContentService = { MimeType: { JSON: 'json' }, createTextOutput: t => ({ t, setMimeType() { return this; } }) };
ctx.UrlFetchApp = { fetch: () => ({ getResponseCode: () => 200, getContentText: () => '{}' }), fetchAll: () => [] };
/* XmlService: egyszerű elemfa (névtér, gyerekek, szöveg) – a számlázz.hu XML-jéhez elég */
ctx.XmlService = { parse(xml) {
  const toks = String(xml).replace(/<\?[^>]*\?>/g, '').match(/<\/?[\w:-]+[^>]*>|[^<]+/g) || [], ns = { uri: '' }, stack = [{ kids: [], text: '' }];
  toks.forEach(t => {
    if (/^<\//.test(t)) { stack.pop(); return; }
    if (/^</.test(t)) { const name = /^<([\w:-]+)/.exec(t)[1].replace(/^.*:/, ''), el = { name, kids: [], text: '' }; stack[stack.length - 1].kids.push(el); if (!/\/>$/.test(t)) stack.push(el); return; }
    stack[stack.length - 1].text += t;
  });
  const wrap = e => ({ getName: () => e.name, getNamespace: () => ns, getChild: n => { const c = e.kids.find(k => k.name === n); return c ? wrap(c) : null; }, getText: () => e.text });
  const root = wrap(stack[0].kids[0]);
  return { getRootElement: () => root };
} };
const code = fs.readdirSync(SRC).filter(f => f.endsWith('.gs')).sort().map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
vm.runInContext(code + '\n;this.__api={setup,szDataIn_,szBankMatch_,readAll_,sha256hex_,szBankSet_,finUpsert_,loanDupMergeOnce_,loanFixOnce2_};', ctx);
const A = ctx.__api;
A.setup();
ctx.PropertiesService.getScriptProperties().setProperty('SZ_BANK_KEY_H', A.sha256hex_('jo-kulcs'));

const tx = id => `<banktranz xmlns="http://www.szamlazz.hu/banktranz"><id>${id}</id><bankszamla>11700000-00000000</bankszamla><erteknap>2026-11-17</erteknap><irany>BE</irany><tipus>ATUTALAS</tipus><technikai>false</technikai><osszeg>127000</osszeg><devizanem>HUF</devizanem><kozlemeny>Teszt utalas</kozlemeny></banktranz>`;

/* 1) hibás vagy hiányzó kulcs: KEY_ERR, és nem kerül be tétel */
assert.equal(A.szDataIn_('rossz', tx('T1')).hibakod, 'KEY_ERR', 'hibás kulcs → KEY_ERR');
assert.equal(A.szDataIn_('', tx('T1')).hibakod, 'KEY_ERR', 'hiányzó kulcs → KEY_ERR');
assert.equal(A.readAll_('bankTx').length, 0, 'hibás kulccsal nem íródhat be banki tétel');

/* 2) jó kulcs: bekerül; ugyanaz a tétel másodszor: nem duplikálódik */
assert.ok(A.szDataIn_('jo-kulcs', tx('T1')).ok, 'jó kulccsal elfogadja');
A.szDataIn_('jo-kulcs', tx('T1'));
assert.equal(A.readAll_('bankTx').length, 1, 'ugyanaz a tétel kétszer → egy sor');
A.szDataIn_('jo-kulcs', tx('T2'));
assert.equal(A.readAll_('bankTx').length, 2, 'új tétel → új sor');

/* 3) banki párosítás: a számlaszám végi sorszám csak valódi (legalább 3 jegyű) egyezésre ad pontot */
const inv = (id, no, gross) => ({ id, no, invGross: gross, invPaid: 0, buyer: 'Valaki Kft.' });
const t = note => ({ amount: 50000, note, partnerName: 'Más Bt.' });
const m1 = A.szBankMatch_(t('Utalás 2026.11.12'), [inv('a', 'LUM-2026-012', 50000), inv('b', 'LUM-2026-345', 50000)]);
assert.ok(m1 && m1.sc === 50, 'egy dátum napja („12”) nem számít számlaszám-egyezésnek');
const m2 = A.szBankMatch_(t('Fizetés'), [inv('c', 'LUM-2026-000', 50000)]);
assert.ok(m2 && m2.sc === 50, 'a „000” végű számlaszám nem egyezik minden közleménnyel');
const m3 = A.szBankMatch_(t('szamla 345 kiegyenlitese'), [inv('a', 'LUM-2026-012', 50000), inv('b', 'LUM-2026-345', 50000)]);
assert.equal(m3 && m3.id, 'b', 'a közleményben szereplő sorszám a jó számlát választja');
console.log('ok');
/* 4) közleményben hivatkozott, már kifizetett számla: a tétel nem vár párosításra; egy nyitott app-számla: az a javaslat */
{
  const ctx2 = ctx; const B = vm.runInContext('({szBankRefs_, szBankRefFix_, szNoKey_})', ctx2);
  const docs = {}; const add = (no, d) => { (docs[B.szNoKey_(no)] = docs[B.szNoKey_(no)] || []).push(d); };
  add('E-LUMOS-2026-5', { gross: 100, paid: 100 }); add('E-LUMOS-2026-6', { gross: 100, paid: 100 });
  add('D-LUMOS-11', { gross: 50, paid: 50 }); add('D-LUMOS-12', { gross: 50, paid: 0, inv: { id: 'i12' } });
  add('LUMOS-2026-81', { gross: 70, paid: 70 });
  assert.equal(B.szBankRefs_('E-LUMOS-2026-5, 6', docs).length, 2, 'felsorolt számlaszámok');
  assert.equal(B.szBankRefs_('Lumos -2026-81', docs).length, 1, 'szóközös számlaszám');
  assert.equal(B.szBankRefs_('Fizetes ABC E-LUMOS-2026-5', docs).length, 1, 'előtte más szó');
  assert.equal(B.szBankRefFix_({ dir: 'BE', note: 'E-LUMOS-2026-5, 6' }, {}, docs), null, 'mind kifizetve → nem vár párosításra');
  const fx = B.szBankRefFix_({ dir: 'BE', note: 'D-LUMOS-11,12 díjbekérő' }, {}, docs);
  assert.ok(fx && fx.matchInvoice === 'i12' && fx.status === 'javaslat', 'egy nyitott app-számla → javaslat');
  assert.ok(B.szBankRefFix_({ dir: 'BE', note: 'AMZN Mktp' }, {}, docs), 'hivatkozás nélkül marad');
  add('E-LUMOS-2026-9', { no: 'E-LUMOS-2026-9', gross: 635000, paid: 0, sz: 'ki_1' });
  const z = B.szBankRefFix_({ dir: 'BE', note: 'E-LUMOS-2026-9' }, {}, docs);
  assert.ok(z && z.matchSz && z.matchSz[0].no === 'E-LUMOS-2026-9' && z.matchSz[0].rest === 635000, 'csak a számlázz.hu-ban lévő nyitott számla → javaslat');
  const all = []; Object.keys(docs).forEach(k => docs[k].forEach(d => { d.key = k; all.push(d); })); Object.defineProperty(docs, '_all', { value: all, enumerable: false });
  add('LUMOS-2026-84', { no: 'LUMOS-2026-84', gross: 88900, paid: 88900, buyer: 'Lurdy Kft.' }); docs._all.push(Object.assign(docs[B.szNoKey_('LUMOS-2026-84')][0], { key: B.szNoKey_('LUMOS-2026-84') }));
  assert.equal(B.szBankRefFix_({ dir: 'BE', note: '2026-84' }, {}, docs), null, 'csak a sorszám vége („2026-84”) → kifizetett számla, elrejtve');
  add('E-LUMOS-2026-2', { no: 'E-LUMOS-2026-2', gross: 934720, paid: 0, buyer: 'KULCSÁR AKADÉMIA KFT', sz: 'k1' }); docs._all.push(Object.assign(docs[B.szNoKey_('E-LUMOS-2026-2')][0], { key: B.szNoKey_('E-LUMOS-2026-2') }));
  const ku = B.szBankRefFix_({ dir: 'BE', note: '', partnerName: 'KULCSÁR AKADÉMIA KFT', amount: 934720 }, {}, docs);
  assert.ok(ku && ku.matchSz && ku.matchSz[0].no === 'E-LUMOS-2026-2', 'közlemény nélkül: partner + összeg → javaslat');
  add('LUMOS-2026-69', { no: 'LUMOS-2026-69', gross: 883285, paid: 883285, paidAt: '2026-09-30', buyer: 'Marketing Amazing Kft.' }); docs._all.push(Object.assign(docs[B.szNoKey_('LUMOS-2026-69')][0], { key: B.szNoKey_('LUMOS-2026-69') }));
  assert.equal(B.szBankRefFix_({ dir: 'BE', note: 'D-LUMOS-6', partnerName: 'MARKETING AMAZING KORLÁTOLT FELELŐS', amount: 883285, valueDate: '2026-09-30' }, {}, docs), null, 'ismeretlen hivatkozás, de a partner+összeg számlája aznap már kifizetve → elrejtve');
  ['LUMOS-2026-64', 88900, 'LUMOS-2026-66', 177800].forEach((v, i, A2) => { if (i % 2) return; add(v, { no: v, gross: A2[i + 1], paid: A2[i + 1], buyer: 'Lurdy Rendezvényszervező Kft' }); docs._all.push(Object.assign(docs[B.szNoKey_(v)][0], { key: B.szNoKey_(v) })); });
  assert.equal(B.szBankRefFix_({ dir: 'BE', note: '64 66', partnerName: 'LURDY RENDEZVÉNYSZERVEZŐ KORLÁTOLT', amount: 266700, valueDate: '2026-10-05' }, {}, docs), null, 'csak sorszámok („64 66”), összegük egyezik, kifizetve → elrejtve');
  { const C = vm.runInContext('szCrewOfDoc_', ctx2); let r = null; try { r = C({ partnerName: 'KOÓS NÁNDOR ÁRON, 59937126', partnerTax: '' }, [{ id: 'k', name: 'Koós Nándor', type: 'Állandó külsős' }, { id: 'z', name: 'Zajácz Dávid', type: 'Belsős' }]); } catch (e) { r = { err: String(e) }; }
    assert.ok(r && r.id === 'k', 'a számlán második keresztnévvel szereplő szakember is megtalálható: ' + JSON.stringify(r)); }
  console.log('ok2');
}

/* 5) elvetett / tagi kölcsön: a banki tétel a Tagi kölcsön táblába kerül; az elvetett visszaállítható */
{
  const u = { name: 'Teszt', role: 'admin', id: 'x' };
  A.szBankSet_(u, { id: 'bt_T2', status: 'elvetve' });
  assert.equal(A.readAll_('bankTx').find(t => t.id === 'bt_T2').status, 'elvetve');
  A.szBankSet_(u, { id: 'bt_T2', status: 'vissza' });
  assert.equal(A.readAll_('bankTx').find(t => t.id === 'bt_T2').status, '', 'visszaállítva');
  A.szBankSet_(u, { id: 'bt_T1', status: 'kolcson' });
  const L = A.readAll_('finLoan');
  assert.equal(L.length, 1, 'egy tagi kölcsön sor'); assert.equal(Number(L[0].amount), 127000); assert.equal(L[0].kind, 'be'); assert.equal(L[0].date, '2026-11-17');
  assert.equal(A.readAll_('bankTx').find(t => t.id === 'bt_T1').status, 'kolcson');
  console.log('ok3');
}

/* 6) kézzel is rögzített tagi kölcsön: a duplikátum összevonódik (a kézi sor marad, a közleménnyel) */
{
  const u = { name: 'Teszt', role: 'admin', id: 'x' };
  A.finUpsert_(u, { table: 'loan', row: { id: 'man1', date: '2026-09-25', kind: 'be', amount: 150000, note: '' } });
  A.finUpsert_(u, { table: 'loan', row: { id: 'bnk1', date: '2026-09-25', kind: 'be', amount: 150000, note: 'EGRI ERVIN – tagi kölcsön' } });
  A.finUpsert_(u, { table: 'loan', row: { id: 'man3', date: '2026-11-12', kind: 'vissza', amount: 1000000, bank: 'Binx', bank2: 'OTP' } });
  A.finUpsert_(u, { table: 'loan', row: { id: 'bnk3', date: '2026-11-12', kind: 'vissza', amount: 1000000, note: 'Egri Ervin – Tagi kölcsön résztörlesztése' } });
  A.loanDupMergeOnce_();
  const L = A.readAll_('finLoan'), ids = L.map(l => l.id).sort();
  assert.ok(ids.includes('man1') && ids.includes('man3') && !ids.includes('bnk1') && !ids.includes('bnk3'), 'a kézi sorok maradnak: ' + ids);
  assert.equal(L.find(l => l.id === 'man1').note, 'EGRI ERVIN – tagi kölcsön', 'a közlemény átkerül');
  A.szDataIn_('jo-kulcs', tx('T3').replace('127000', '50000')); A.finUpsert_(u, { table: 'loan', row: { id: 'man2', date: '2026-11-17', kind: 'be', amount: 50000, bank: 'OTP' } });
  A.szBankSet_(u, { id: 'bt_T3', status: 'kolcson' });
  assert.equal(A.readAll_('finLoan').filter(l => Number(l.amount) === 50000).length, 1, 'banki rögzítés nem duplikál');
  console.log('ok4');
}

/* 7) egyszeri bankkivonat-egyeztetés (2026-11-24): a 02-20-i duplikátum törlődik, a 03-14-i sor 04-14-re kerül; másodszor nem fut */
{
  const u = { name: 'Teszt', role: 'admin', id: 'x' };
  A.finUpsert_(u, { table: 'loan', row: { id: 'd20', date: '2026-02-20', kind: 'vissza', amount: 1200000, note: '' } });
  A.finUpsert_(u, { table: 'loan', row: { id: 'd21', date: '2026-02-21', kind: 'vissza', amount: 1200000, note: 'Egri Ervin – Tagi kölcsön visszafizetése' } });
  A.finUpsert_(u, { table: 'loan', row: { id: 'm14', date: '2026-03-14', kind: 'vissza', amount: 350000, note: '' } });
  A.finUpsert_(u, { table: 'loan', row: { id: 'k16', date: '2026-02-16', kind: 'be', amount: 7300000, note: '' } });
  A.loanFixOnce2_();
  let L = A.readAll_('finLoan');
  assert.ok(!L.some(l => l.id === 'd20'), 'a 02-20-i duplikátum törlődik');
  assert.ok(L.some(l => l.id === 'd21') && L.some(l => l.id === 'k16'), 'a többi sor marad');
  const m = L.find(l => l.id === 'm14');
  assert.equal(m.date, '2026-04-14', 'a 350 000-es sor dátuma javul');
  assert.equal(m.bank, 'Revolut'); assert.equal(m.bank2, 'Revolut');
  assert.equal(Number(m.amount), 350000, 'az összeg nem változik');
  A.finUpsert_(u, { table: 'loan', row: { id: 'd20b', date: '2026-02-20', kind: 'vissza', amount: 1200000, note: '' } });
  A.loanFixOnce2_();
  assert.ok(A.readAll_('finLoan').some(l => l.id === 'd20b'), 'csak egyszer fut');
  console.log('ok5');
}

