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
const lib=new Function('S','todayISO','isAdmin','projById','projTotal','esc','fold','ftFmt','num','fmtShort',
  sales.slice(from,to)+'\nreturn {viewSales,salesShiftMonth,salesDealMonth,salesMonthText};')(
  state,()=>'2026-11-14',()=>true,id=>projects[id]||null,p=>p.projectValue,
  esc,x=>String(x==null?'':x).toLowerCase(),fmt,x=>Number(x)||0,x=>String(x).slice(5)
);
const current=lib.viewSales();
assert.equal(state.salesF.month,'2026-11','default to current month');
assert.match(current,/2026\. november/);
assert.match(current,/data-action="sales-month-shift" data-d="-1"/);
assert.match(current,/data-action="sales-month-shift" data-d="1"/);
assert.match(current,/data-action="sales-month-today"/);
const ids=html=>Array.from(html.matchAll(/data-deal="([^"]+)"/g),x=>x[1]);
const pick=m=>{state.salesF.month=m;return lib.viewSales();};
assert.deepEqual(ids(current),['novOpen','novWon']);
assert.deepEqual(ids(pick('2026-10')),['octWon'],'old payments remain visible under event month');
assert.match(pick('2026-10'),/jutalék 2026-10/,'commission header follows selected payment month');
assert.deepEqual(ids(pick('2027-02')),['febOpen']);
assert.deepEqual(ids(pick('2025-01')),['oldWon'],'historic closed deals remain visible');
assert.deepEqual(ids(pick('undated')),['undated'],'undated leads stay accessible');
assert.equal(ids(pick('all')).length,6,'all-month view includes all historic deals');
assert.equal(lib.salesShiftMonth('2026-12',1),'2027-01');
assert.equal(lib.salesShiftMonth('2027-01',-1),'2026-12');
assert.equal(lib.salesShiftMonth('all',1),'2026-12','arrows return from all-month view');
state.salesF.owner='self';
assert.deepEqual(ids(pick('2026-11')),['novOpen','novWon'],'owner filter and month filter compose');
console.log('PASS sales monthly navigation, all-month view, undated leads, year boundary, KPI and owner filtering');
