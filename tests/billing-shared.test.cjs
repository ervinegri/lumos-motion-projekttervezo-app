'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../billing.js'),'utf8');
const start=source.indexOf('function billClientMonthProjects(p){');
const end=source.indexOf('/* Egy projekt szerződés- és számlázási állapota */',start);
assert(start>=0&&end>start,'Shared advance helpers are present');

const projects=[
  {id:'conf',client:'Pletsérné Dr. Jung Andrea',name:'Konferencia',date:'2026-11-27',projectValue:296000},
  {id:'short1',client:'Pletsérné Dr. Jung Andrea',name:'Short 1',date:'2026-11-27',projectValue:29000},
  {id:'short2',client:'Pletsérné Dr. Jung Andrea',name:'Short 2',date:'2026-11-27',projectValue:29000}
];
const invoice={id:'advance',no:'EE-2026-8',kind:'eloleg',projectId:'conf',projectIds:'',invNet:177000,invGross:224790,invPaid:224790,manual:true};
const S={projects,fin:{invoices:[invoice]}};
const get=()=>new Function('S','pr','num','projTotal','invPids','invNetR','projById','invPaidOk','billOf',
  source.slice(start,end)+'\nreturn {billClientMonthProjects,billGroupAdvance};')(
  S,p=>({start:p.date}),v=>Number(v)||0,p=>Number(p.projectValue)||0,
  x=>[x.projectId,...String(x.projectIds||'').split(',')].filter(Boolean),
  x=>x.invGross?x.invNet/x.invGross:1/1.27,id=>projects.find(p=>p.id===id),
  x=>(x.kind==='eloleg'&&!!x.manual)||(x.invGross>0&&x.invPaid>=x.invGross-1),
  ()=>({advancePct:50,mode:'eloleg'})
);
let h=get();
let g=h.billGroupAdvance(h.billClientMonthProjects(projects[1]));
assert.deepEqual([g.total,g.expected,g.paid,g.remaining],[354000,177000,177000,177000]);
assert.equal(g.candidate.id,'advance');
assert.equal(g.shared,null);

invoice.projectIds='short1,short2';
g=h.billGroupAdvance(projects);
assert.equal(g.candidate,null);
assert.equal(g.shared.id,'advance');
assert.equal(g.paid,177000);

invoice.ref='D-2026-8';
S.fin.invoices.push({id:'request',no:'D-2026-8',kind:'dijbekero',projectId:'conf',projectIds:'short1,short2',invNet:177000,invGross:224790,invPaid:224790});
assert.equal(h.billGroupAdvance(projects).paid,177000,'paid invoice and linked payment request count once');

const outside={id:'other',client:'Más megrendelő',date:'2026-11-27',projectValue:100000};
S.projects.push(outside);
assert.equal(h.billClientMonthProjects(outside).length,1,'independent clients are kept separate');

invoice.projectIds='';
S.fin.invoices=[invoice];
projects[2].date='2026-11-28';
assert.equal(h.billGroupAdvance(projects).candidate,null,'projects on separate dates require explicit linking');
console.log('PASS shared-client deposit accounting, matching and duplicate prevention');
