'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../views-penzugy-vagas.js'),'utf8');
const css=fs.readFileSync(path.resolve(__dirname,'../theme2.css'),'utf8');
function section(begin,end){const a=source.indexOf(begin),b=source.indexOf(end,a);assert(a>=0&&b>a,begin+' source boundaries');return source.slice(a,b);}
const salespersonCode=section('function salesCommFields(p){','/* Ajánlói jutalék:');
const panelCode=section('function finPanelBody(p){','/* Oszlopszélességek:');
const esc=x=>String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
let deal={ownerId:'seller1',ownerName:'Egri Ervin',commManual:'10'};
const pp={id:'p1',projectValue:29000,budgetMode:'ft',budgetVal:10000,extras:[]};
const fields=new Function('projDeal','isAdmin','isFree','ro','projLocked','salesPpl','salesCommEst','salesBase','moneyFmt','esc','ftFmt',
 salespersonCode+'\nreturn salesCommFields;')(
 ()=>deal,()=>true,()=>false,()=>false,()=>false,
 ()=>[{userId:'seller1',name:'Egri Ervin'},{userId:'seller2',name:'Farkas Péter Ervin'}],
 ()=>({amt:2900,pct:10}),p=>p.projectValue,x=>String(x),esc,x=>String(x));
const panel=new Function('isAdmin','prodBase','budgetFt','moneyFmt','isFree','orgOf','extrasRaw','ro','projLocked',
 'extrasMenu','salesCommFields','orgOption','tovFields','finNet','extrasHtml','esc','num','D',
 panelCode+'\nreturn finPanelBody;')(
 ()=>true,p=>p.projectValue,p=>p.budgetVal,x=>String(x),()=>false,
 p=>p.extras.find(x=>x.kind==='org'),p=>p.extras,()=>false,()=>false,
 ()=>'<select>Extrák</select>',fields,()=>'<aside>org</aside>',()=>'<aside>tov</aside>',
 ()=>'<aside>nettó</aside>',()=>'',esc,x=>Number(x)||0,()=>'' );
const html=panel(pp);
assert.match(html,/💼 Ki értékesítette\?/,'renamed blue section');
assert(html.indexOf('grp-prod')<html.indexOf('grp-sales'),'blue sales section after production');
assert.equal((html.match(/id="sales-sel"/g)||[]).length,1,'single salesperson selector');
assert.match(html,/<option value="seller1" selected>Egri Ervin<\/option>/,'existing salesperson retained');
assert.match(html,/id="f-salesPct"[^>]*value="10"/,'commission percentage remains editable');
assert.match(html,/id="f-salesFt"[^>]*value="2900"/,'commission amount remains editable');
assert.doesNotMatch(html,/data-sales-toggle/,'legacy checkbox removed from project panel');
assert.doesNotMatch(source,/\$\{salesOption\(p\)\}/,'lower commission block removed from extras');
assert.doesNotMatch(source,/<option value="sales">💼 Értékesítői jutalék<\/option>/,'duplicated extras action removed');
assert.match(css,/grp-sales \.grp-b\{display:grid/,'responsive blue panel has a compact layout');
assert.match(css,/grp-sales \.grp-b\{display:grid;grid-template-columns:minmax\(175px,2fr\) minmax\(90px,1fr\) minmax\(130px,1\.45fr\)/,'seller, percentage and amount share one row');
assert.match(css,/grp-sales \.fin-ssel\{grid-column:1;/,'seller selector occupies first column');
deal=null;
const none=panel(pp);
assert.equal((none.match(/id="sales-sel"/g)||[]).length,1,'unassigned projects retain selection');
assert.doesNotMatch(none,/id="f-salesPct"/,'commission fields require selected salesperson');
pp.extras=[{kind:'tov',amount:2000}];
assert(panel(pp).indexOf('grp-prod')<panel(pp).indexOf('grp-sales'),'order is stable with extra costs');
console.log('PASS finance sales panel after production, selector consolidation and lower card removal');
