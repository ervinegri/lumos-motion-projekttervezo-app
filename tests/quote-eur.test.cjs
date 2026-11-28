const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const mnbEur = require('../api/mnb-eur.js');

async function test() {
  const S = { deals: [{ id: 'demo', client: 'Example SA', contactPhone: '+32 2 555 0100' }] };
  let editor = '', rateRequests = 0;
  const ctx = vm.createContext({
    AbortSignal, S, ACT: {}, PH_CC: [['BE', '🇧🇪', '+32']], EU_CC: ['BE'],
    num: v => Number(v) || 0, esc: v => String(v ?? ''), $: () => null,
    window: { addEventListener() {} },
    document: { addEventListener() {}, getElementById() {}, querySelector() {} },
    openModal: (_, html) => { editor = html; },
    fetch: async url => {
      assert.equal(url, '/api/mnb-eur');
      rateRequests++;
      return { ok: true, json: async () => ({ date: '2026-11-27', rate: 369.7 }) };
    }
  });
  const run = expr => vm.runInContext(expr, ctx);
  run(fs.readFileSync(path.join(__dirname, '../quote.js'), 'utf8'));
  run(`
    const items=[{name:'Photography',qty:'2',price:'250000'}];
    S.q={currency:'EUR',eurRate:'400',lang:'en',dealId:'demo',items,opts:[{items}],oi:0,rc:{name:'Example SA'},sig:{name:'Egri Ervin'}};
    qEdit();
  `);
  assert.match(editor, /name="qi_eurprice_0" value=""[^>]*inputmode="decimal"/);
  assert.doesNotMatch(editor, /name="q_rate"|class="q-bh"|class="q-sumb"/);
  await run('qLoadMnb(S.q)');
  assert.equal(rateRequests, 1);
  run('qEdit()');
  assert.match(editor, /MNB-árfolyam · 1 EUR = 369,70 HUF · 2026\. 11\. 27\./);
  assert.match(editor, /name="qi_eurprice_0" value="676,22"/);

  run(`
    const fields=new Map([['qi_name_0','Photography'],['qi_qty_0','2'],['qi_eurprice_0','725,50']]);
    qRead(fields,'qi_eurprice_0');
    S.q=JSON.parse(JSON.stringify(S.q));
  `);
  assert.equal(run('qQuoteTotals(S.q).eurCents'), 145100);
  assert.equal(run('S.q.items[0].price'), '250000');
  assert.match(run('qPageHtml()'), /EUR 725\.50.*EUR 1,451\.00/);
  assert.doesNotMatch(run('qPageHtml()'), /class="r qp-br"/);
  run('S.q.currency="HUF";qEdit()');
  assert.match(editor, /name="qi_price_0" value="250 000"/);
  assert.doesNotMatch(editor, /class="q-bh"/);
  run('S.deals[0].contactPhone="+36 1 555 0100";qEdit()');
  assert.match(editor, /class="q-bh"/);

  global.fetch = async () => new Response(`
    <table><caption class="ttl">Napi árfolyamok: 2026. november 27., péntek</caption>
    <tbody><tr><td class="fw-b">EUR</td><td>euro</td><td>1</td><td>369,70</td></tr></tbody></table>
  `);
  let result;
  const res = { setHeader() {}, end(value) { result = JSON.parse(value); } };
  await mnbEur({ method: 'GET' }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(result, { rate: 369.7, date: '2026-11-27' });
  console.log('PASS direct EUR, MNB rate, foreign net-only, and domestic gross');
}
test().catch(error => { console.error(error); process.exitCode = 1; });
