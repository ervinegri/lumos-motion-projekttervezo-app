'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const sales=fs.readFileSync(path.resolve(__dirname,'../sales.js'),'utf8');
const from=sales.indexOf('const DEAL_STAGES='),to=sales.indexOf('/* Új lehetőségnél:',from);
assert(from>=0&&to>from,'sales view helpers are available');
const projects={short:{date:'2026-11-27',projectValue:29000},oct:{date:'2026-10-10',projectValue:147000}};
const state={
  me:{id:'self',name:'Ervin',email:'ervin.egri@lumosmotion.com',role:'admin'},
  salesF:{q:'',owner:'',old:false},
  salesPeople:[{userId:'other',name:'Farkas Péter Ervin',comm:{'2026-10':{base:10000,amount:2000},'2026-11':{base:30000,amount:6000}}}],
  deals:[
    {id:'novOpen',title:'November',stage:'uj',ownerId:'self',ownerName:'Ervin',eventDate:'2026-11-25',value:400000,nextStep:'Hívás',nextDate:'2026-11-18'},
    {id:'novWon',title:'Short',stage:'nyert',ownerId:'self',ownerName:'Ervin',projectId:'short',eventDate:'2026-11-27',value:29000,wonAt:'2026-11-14',advPaidAt:'2026-10-06'},
    {id:'octWon',title:'October',stage:'nyert',ownerId:'self',ownerName:'Ervin',projectId:'oct',eventDate:'2026-10-10',value:147000,wonAt:'2026-11-12',advPaidAt:'2026-10-15'},
    {id:'febOpen',title:'February',stage:'uj',ownerId:'other',ownerName:'Farkas Péter Ervin',eventDate:'2027-02-25',value:200000,nextStep:'Ajánlat',nextDate:'2027-01-04'},
    {id:'undated',title:'Dátum nélküli',stage:'uj',ownerId:'other',ownerName:'Farkas Péter Ervin',value:100000,nextStep:'Telefon',nextDate:'2026-11-15'},
    {id:'oldWon',title:'Régi projekt',stage:'nyert',ownerId:'other',ownerName:'Farkas Péter Ervin',eventDate:'2025-01-16',value:150000,wonAt:'2025-01-10'}
  ]
};
const esc=x=>String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const fmt=x=>Math.round(Number(x)||0).toLocaleString('hu-HU')+' Ft';
const lib=new Function('S','todayISO','isAdmin','isSales','projById','projTotal','esc','fold','ftFmt','num','fmtShort',
  sales.slice(from,to)+'\nreturn {viewSales,salesShiftMonth,salesDealMonth,salesMonthText};')(
  state,()=>'2026-11-14',()=>true,()=>false,id=>projects[id]||null,p=>p.projectValue,
  esc,x=>String(x==null?'':x).toLowerCase(),fmt,x=>Number(x)||0,x=>String(x).slice(5)
);
const current=lib.viewSales();
assert.equal(state.salesF.month,'2026-11','default KPI period is current month');
assert.match(current,/2026\. november/);
assert.match(current,/data-action="sales-month-shift" data-d="-1"/);
assert.match(current,/data-action="sales-month-shift" data-d="1"/);
assert.match(current,/data-action="sales-month-today"/);
assert.match(current,/Minden időszak/,'board explains its permanent scope');
assert.doesNotMatch(current,/data-action="sales-month-undated"/,'undated leads remain directly on board');
const ids=html=>Array.from(html.matchAll(/data-deal="([^"]+)"/g),x=>x[1]);
const kpi=html=>Array.from(html.matchAll(/class="tile-n">([^<]+)</g),x=>x[1].replace(/\s+/g,''));
const pick=m=>{state.salesF.month=m;return lib.viewSales();};
const allCards=ids(current);
assert.equal(allCards.length,6,'all sales opportunities are visible on the same pipeline');
assert(allCards.includes('novOpen')&&allCards.includes('febOpen')&&allCards.includes('undated'),'future and undated leads are visible');
assert.equal(kpi(current)[2],'176000Ft','November contracted revenue follows the contract (wonAt) month');
for(const month of ['2026-10','2027-02','2025-01','2026-12','all']){
  assert.deepEqual(ids(pick(month)),allCards,'monthly navigation preserves all cards: '+month);
}
assert.equal(kpi(pick('2026-10'))[2],'0Ft','an October event signed in November counts in November');
assert.equal(kpi(pick('2027-02'))[2],'0Ft','an empty KPI month still has every card');
assert.equal(kpi(pick('2025-01'))[2],'150000Ft','historic month KPI can be reviewed');
assert.equal(kpi(pick('all'))[2],'326000Ft','all-period KPI summarizes all contracted revenue');
assert.equal(lib.salesShiftMonth('2026-12',1),'2027-01');
assert.equal(lib.salesShiftMonth('2027-01',-1),'2026-12');
assert.equal(lib.salesShiftMonth('all',1),'2026-12','arrows return from all-period view');
state.salesF.owner='self';
assert.deepEqual(ids(pick('2026-11')),['novOpen','novWon','octWon'],'owner filter applies to all cards independently of period');
assert.deepEqual(ids(pick('2026-10')),['novOpen','novWon','octWon'],'changing KPI period preserves selected seller cards');
console.log('PASS sales pipeline always shows all dates; month affects KPIs only, year boundary and owner filter');

/* Kattintható projektnevek – a címből projekt nyílik, a kártya többi része lehetőség marad. */
{
  const start=sales.indexOf('function dealCard(d){'),end=sales.indexOf('/* Új lehetőségnél:',start);
  assert(start>=0&&end>start,'sales deal card implementation available');
  const makeCard=new Function('DEAL_OPEN','dealVal','todayISO','isAdmin','isSales','projById','esc','fmtShort','ftFmt','dealCtPill','dealChance','salesCommissionPreview',
    sales.slice(start,end)+'\nreturn dealCard;');
  const deps=[['uj','ajanlat','targyalas'],d=>d.value||0,()=>'2026-11-14',()=>true,()=>false,
    id=>id==='short'?{id:'short',name:'Short video'}:null,esc,x=>String(x).slice(5),fmt,()=>'',()=>10,()=>null];
  const card=makeCard(...deps);
  const withProject=card({id:'deal1',title:'Short videó 1',stage:'nyert',projectId:'short',value:29000,wonAt:'2026-11-14'});
  assert.match(withProject,/class="dl-project-link" data-action="deal-proj" data-id="short"/,'linked project title opens project');
  assert.match(withProject,/data-action="deal-open" data-id="deal1"/,'card still opens sales deal');
  assert.match(withProject,/aria-label="Projekt megnyitása:/,'project title is accessible via keyboard');
  const openLead=card({id:'lead1',title:'Nyitott ügylet',stage:'uj',value:10000});
  assert.doesNotMatch(openLead,/dl-project-link/,'open lead title stays ordinary text');
  const salesCard=makeCard(...deps.slice(0,4),()=>true,...deps.slice(5))(
    {id:'deal1',title:'Short videó 1',stage:'nyert',projectId:'short',value:29000});
  assert.doesNotMatch(salesCard,/dl-project-link/,'sales-only user retains project access restrictions');
  const action=sales.match(/'deal-proj':b=>\{[^}]+\}/);
  assert(action&&action[0].includes('openProject(b.dataset.id)'),'project button uses existing project opener');
  assert.doesNotMatch(action[0],/S\.tab\s*=/,'project opener preserves return-to-sales navigation');
  console.log('PASS linked project title opens its project while preserving deal card and access restrictions');
}

/* Szerződött jutalék: a kiválasztott projekt hónapjában a projekten megadott 10% is látszik,
   a díjbekérő októberi befizetési dátumától függetlenül. */
{
  const p=state.deals.find(x=>x.id==='novWon');
  const original=p.commManual;
  p.commManual='10';
  state.salesF.owner='self';
  state.salesF.month='2026-11';
  const html=lib.viewSales();
  assert.match(html,/szerződött jutalék · 1 projekt/);
  assert.match(html,/Jutalék: <b>2[\u00a0\u202f ]?900 Ft<\/b>/);
  assert.match(html,/class="dl-comm-pct">10%/);
  assert.match(html,/Befolyt|Díjbekérő kifizetve/);
  p.commManual=original;
  console.log('PASS contracted commission 2 900 Ft on November short, separately from October payment');
}
