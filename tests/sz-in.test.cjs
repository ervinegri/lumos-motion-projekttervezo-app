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
vm.runInContext(code + '\n;this.__api={setup,szDataIn_,szBankMatch_,readAll_,sha256hex_};', ctx);
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
  console.log('ok2');
}
