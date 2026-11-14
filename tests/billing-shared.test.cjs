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

/* A közös foglalóhoz egy végszámla-cella tartozik; a külön projekt-szerződésállapotok megmaradnak. */
{
  const prevDate=projects[2].date,prevLinked=invoice.projectIds,prevInvoices=S.fin.invoices;
  try{
    projects[2].date='2026-11-27';
    invoice.projectIds='short1,short2';
    S.fin.invoices=[invoice];
    const first=source.indexOf('function billMonthRows('),last=source.indexOf('/* A táblázat cellái lépésenként:',first);
    assert(first>=0&&last>first,'Billing month renderer is present');
    const makeRows=()=>projects.filter(p=>p.client==='Pletsérné Dr. Jung Andrea').map(p=>({
      p,b:{mode:'eloleg',advancePct:50,contractStatus:p.id==='conf'?'nemkell':''},
      el:invoice,db:null,fin:null,finAll:[],full:false,noFin:false,free:false
    }));
    const monthRows=new Function('billGroupAdvance','num','invPaidOk','projTotal','invPids','esc','ftFmt','billRow','tigList','tigPids','invState',
      source.slice(first,last)+'\nreturn billMonthRows;')(
      get().billGroupAdvance,v=>Number(v)||0,
      x=>(x.kind==='eloleg'&&!!x.manual)||(x.invGross>0&&x.invPaid>=x.invGross-1),
      p=>Number(p.projectValue)||0,
      x=>[x.projectId,...String(x.projectIds||'').split(',')].filter(Boolean),
      x=>String(x),x=>String(Math.round(x)),
      (i,o)=>'<tr data-final-span="'+o.finSpan+'" data-contract-span="'+o.cSpan+'"></tr>',
      ()=>[],()=>[],x=>'paid');
    const html=monthRows(makeRows());
    assert.match(html,/data-final-span="3"/,'one combined final invoice action');
    assert.equal((html.match(/data-contract-span="1"/g)||[]).length,3,'individual contracts remain individual');
    assert.match(html,/Foglaló beérkezett/);
    assert.match(html,/177000/);
    assert(source.includes('Math.round(num(i.el.invNet)*invShare(i.el,p.id))'),'deposit amount is allocated per project');
    console.log('PASS shared final invoice grouping and individual contract layout');
  }finally{
    projects[2].date=prevDate;
    invoice.projectIds=prevLinked;
    S.fin.invoices=prevInvoices;
  }
}

/* A közös foglaló után a végszámla tételei összevontan, kiállítótól függő biztonsági ellenőrzéssel készülnek. */
{
  const finance=fs.readFileSync(path.resolve(__dirname,'../finance.js'),'utf8');
  const first=finance.indexOf('function szInvoiceModal(kind,id,o={}){'),last=finance.indexOf('  const t=szTargetInfo(kind,id)',first);
  assert(first>=0&&last>first,'Shared final invoice preparation is available');
  const ps=projects.filter(p=>p.id==='conf'||p.id==='short1'||p.id==='short2');
  let advance={id:'adv',no:'EE-2026-8',kind:'eloleg',advType:'elolegszamla',projectId:'conf',projectIds:'short1,short2',invNet:177000,manual:false,issuer:'kft'};
  const byId=id=>ps.find(p=>p.id===id),amount=p=>Number(p.projectValue)||0,alerts=[];
  const create=new Function('billGroupAdvance','billClientMonthProjects','projById','billInfo','pr','num','invPids','invShare','szItemName','projTotal','toast',
    finance.slice(first,last)+'  return o;\n}\nreturn szInvoiceModal;')(
    ()=>({shared:advance,paid:177000,projects:ps}),()=>ps,byId,()=>({fin:null}),p=>({start:p.date}),
    v=>Number(v)||0,x=>[x.projectId,...String(x.projectIds||'').split(',')].filter(Boolean),
    (x,pid)=>amount(byId(pid))/354000,p=>p.name,amount,x=>alerts.push(x));
  let out=create('project','conf',{type:'vegszamla'});
  assert.equal(out.items.length,3,'one invoice with three items');
  assert.equal(out.items.reduce((a,it)=>a+it.price,0),354000,'real advance is deducted by invoice reference');
  assert.deepEqual(Array.from(out.projectIds),['short1','short2']);
  advance={...advance,advType:'szamla'};
  out=create('project','conf',{type:'vegszamla'});
  assert.equal(out.type,'szamla');
  assert.deepEqual(Array.from(out.items,it=>it.price),[148000,14500,14500],'ordinary advance is already invoiced');
  advance={...advance,manual:true,issuer:'ev'};
  assert.equal(create('project','conf',{type:'vegszamla'}),undefined,'external issuer requires review');
  assert.equal(alerts.length,1);
  console.log('PASS safe shared final invoice preview and external issuer check');
}
