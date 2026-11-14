'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const code=fs.readFileSync(path.resolve(__dirname,'../finance.js'),'utf8');
const a=code.indexOf('function finProjectRow('),b=code.indexOf('/* Régi táblázat sora',a);
assert(a>=0&&b>a,'Project income calculation is available');
const num=v=>Number(v)||0;
const cfg={profitPct:30,ceoPct:5,marketingPct:5};
const create=new Function('finSet','projTotal','feeSum','finSalesFees','extrasRaw','orgFee','billOf','projDeal','salesCommEst','pr','num','ovPct',
  code.slice(a,b)+'\nreturn finProjectRow;')(
  ()=>cfg,p=>p.value,p=>p.wages,()=>0,p=>p.extras||[],p=>p.organizer||0,
  p=>p.bill||{},p=>p.deal||null,(p,d)=>d.commission===undefined?null:{amt:d.commission,pct:d.commission/p.value*100},
  p=>({start:p.date||'2026-11-14'}),num,v=>v===''||v==null?null:Number(v));
const make=(value,wages,pass=0,organizer=0,deal=null,bill=null)=>create({
  id:'test-project',name:'Kulcsár Akadémia Gála',value,wages,organizer,deal,bill,
  extras:pass?[{kind:'tov',amount:pass}]:[]
});
const balanced=r=>r.amount===r.profit+r.prod+r.ceo+r.marketing+r.rezsi;
const none=make(159000,40000,45000);
assert.equal(none.amount,159000);
assert.equal(none.fees,40000);
assert.equal(none.tov,45000);
assert.equal(none.prod,85000,'cost total includes wages and pass-through');
assert.equal(none.ceo,0,'unassigned salesperson gets zero commission');
assert.equal(none.profit,34200);
assert.equal(none.rezsi,34100,'previous default commission is retained in overhead');
assert(balanced(none),'financial categories sum to revenue');
const manualOverride=make(169000,60000,0,0,null,{ceoPct:25});
assert.equal(manualOverride.ceo,0,'override cannot create a fee without assigned seller');
assert(balanced(manualOverride));
const seller=make(159000,40000,45000,0,{ownerId:'seller-123',ownerName:'Sales',commission:11400});
assert.equal(seller.ceo,11400,'an assigned seller keeps their approved 10%');
assert(balanced(seller));
const zeroRate=make(159000,40000,45000,0,{ownerId:'seller-123',commission:0});
assert.equal(zeroRate.ceo,0,'an explicit zero percent stays zero');
const organizer=make(169000,60000,0,10000);
assert.equal(organizer.ceo,0,'organizer commission is separate from salesperson commission');
assert.equal(organizer.org,10000);
assert.equal(organizer.prod,70000);
assert(balanced(organizer));
const c=code.indexOf('const finWages='),d=code.indexOf('/* Módosítható %',c);
assert(c>=0&&d>c,'separate cost display helpers are available');
const split=new Function('num',code.slice(c,d)+'\nreturn {finWages,finOrgCost,finSalesCost};')(num);
assert.deepEqual([split.finWages(none),none.tov,split.finOrgCost(none),split.finSalesCost(none)],[40000,45000,0,0]);
assert.deepEqual([split.finWages(organizer),organizer.tov,split.finOrgCost(organizer),split.finSalesCost(organizer)],[60000,0,10000,0]);
assert.equal(split.finSalesCost({kind:'manual',ceo:9000,org:3000}),6000,'legacy organizer fee remains separate in display');
const k=code.indexOf('function pctIn('),l=code.indexOf('async function finSetPct(',k);
assert(k>=0&&l>k);
const pct=new Function('pctNum','esc','finSalesCost',code.slice(k,l)+'\nreturn pctIn;')((v,base)=>base?v/base*100:0,String,split.finSalesCost);
assert.match(pct(none,'ceo'),/0%/);
assert.doesNotMatch(pct(none,'ceo'),/data-finpct=/,'no salesperson means read-only zero percent');
assert.match(pct(seller,'ceo'),/pct-lock/,'calculated salesperson commission stays locked');
const defaultSeller=make(159000,40000,45000,0,{ownerId:'seller-123'});
assert.equal(defaultSeller.ceo,5700,'assigned seller gets default 5% if no specific rate is set');
assert.match(pct(defaultSeller,'ceo'),/data-finpct=/,'assigned seller can have editable default percentage');
assert.match(code,/colspan="2">Munkadíjak<\/th><th class="r">Továbbszámlázott<\/th><th class="r">Szervezői jutalék<\/th>/);
assert.match(code,/TFn\(finWages\)/);
assert.match(code,/TFn\(finSalesCost\)/);
assert.match(code,/colspan="14" class="empty-row"/);
console.log('PASS project fee zero without seller, separate cost columns, organizer fee, revenue balance and legacy rows');
