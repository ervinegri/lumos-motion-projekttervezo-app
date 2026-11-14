'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const frontend=fs.readFileSync(path.join(root,'sales.js'),'utf8');
const backend=fs.readFileSync(path.join(root,'apps-script/src/10_adatok_ertekesites.gs'),'utf8');
const start=frontend.indexOf('const DEAL_STAGES='),end=frontend.indexOf('function viewSales(){',start);
assert(start>=0&&end>start,'sales helpers are accessible');
const P={
  conference:{id:'conference',quotePrice:296000,projectValue:296000,extras:'[]'},
  short1:{id:'short1',quotePrice:29000,projectValue:29000,extras:'[]'},
  short2:{id:'short2',quotePrice:29000,projectValue:29000,extras:'[]'}
};
const S={
  me:{id:'current-admin',name:'Ervin',email:'ervin.egri@lumosmotion.com'},
  salesPeople:[{userId:'peter',name:'Farkas Péter Ervin'},{userId:'flora',name:'Guzsloványi Flóra'}]
};
const D=[
  {id:'d1',stage:'nyert',ownerId:'legacy-admin',ownerName:'Egri Ervin',projectId:'conference',value:0},
  {id:'d2',stage:'nyert',ownerId:'current-admin',ownerName:'Ervin',projectId:'short1',value:0},
  {id:'d3',stage:'nyert',ownerId:'legacy-admin',ownerName:'Egri Ervin',projectId:'short2',value:0},
  {id:'d4',stage:'uj',ownerId:'peter',ownerName:'Farkas Péter Ervin',value:400000}
];
const h=new Function('S','projById','projTotal',frontend.slice(start,end)+'\nreturn {salesOwners,salesSelfIds,dealVal};')(
  S,id=>P[id]||null,p=>p.projectValue);
assert.deepEqual(Array.from(h.salesSelfIds(D)).sort(),['current-admin','legacy-admin']);
assert.deepEqual(h.salesOwners(D).map(x=>x[1]),['⭐ Egri Ervin (saját)','👤 Farkas Péter Ervin','👤 Guzsloványi Flóra']);
assert.deepEqual(D.slice(0,3).map(h.dealVal),[296000,29000,29000]);
assert.equal(D.slice(0,3).reduce((sum,d)=>sum+h.dealVal(d),0),354000);
assert.match(frontend,/ügyvezetői|Ügyvezetői/,'CEO calculation is labeled distinctly');
assert.match(frontend,/kifizetett alap:/,'commission is shown in the payment month');
const a=backend.indexOf('function dealsFor_(u) {'),b=backend.indexOf('function salesBootstrap_(u) {',a);
assert(a>=0&&b>a,'backend deal projection is accessible');
const readAll_=key=>({
  projects:Object.values(P),
  deals:D,
  finInvoice:[],
  finBilling:[],
  finTig:[],
  finFramework:[]
})[key]||[];
const dealsFor=new Function('readAll_','loadUsers_','dealCtMap_','parseExtras_',backend.slice(a,b)+'\nreturn dealsFor_;')(
  readAll_,()=>[{id:'current-admin',role:'admin'},{id:'legacy-admin',role:'admin'},{id:'peter',role:'sales'}],()=>({}),raw=>JSON.parse(raw||'[]'));
assert.deepEqual(dealsFor({role:'admin',id:'current-admin'}).slice(0,3).map(d=>d.value),[296000,29000,29000]);
console.log('PASS sales owner deduplication, project value display and paid-month commission labels');
