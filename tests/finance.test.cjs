const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const ctx = vm.createContext({console, Utilities:{getUuid:()=>crypto.randomUUID()}, SpreadsheetApp:{flush(){}}, Logger:{log(){}}});
vm.runInContext(fs.readFileSync(path.join(root,'apps-script/Code.gs'),'utf8'),ctx);
vm.runInContext(`
  var DB={projects:[],crew:[],inventory:[],crewAssign:[],eqAssign:[]}, USER={role:'editor',name:'Dávid',crewId:'david-123'}, LOG=[], tick=0;
  readAll_=key=>DB[key]||[];
  sheetFor_=key=>({key});
  findRow_=(sh,id)=>{const i=DB[sh.key].findIndex(x=>x.id===id);return i<0?0:i+1;};
  readRow_=(key,sh,row)=>Object.assign({},DB[key][row-1]);
  putRow_=(key,sh,obj,row)=>{if(row)DB[key][row-1]=Object.assign({},obj);else DB[key].push(Object.assign({},obj));};
  rewriteAssign_=(key,keep,add)=>{DB[key]=DB[key].filter(keep).concat(add);};
  withLock_=fn=>fn(); now_=()=>String(++tick); today_=()=> '2026-10-29';
  authUser_=()=>USER; dataBump_=()=>{}; logEvent_=(...a)=>LOG.push(a);
  DB.crew=[{id:'david-123',name:'Dávid'},{id:'bence-123',name:'Bence'},{id:'ervin-123',name:'Ervin'}];
  DB.projects=[{id:'project-123',name:'Test',status:'egyeztetes',date:'2026-10-02',endDate:'2026-10-03',quotePrice:400000,budgetMode:'ft',budgetVal:160000,updatedAt:'original',fees:'[]',crewDays:'{}'}];
  DB.crewAssign=DB.crew.map(c=>({projectId:'project-123',crewId:c.id,role:'Operatőr'}));
`,ctx);
const run=s=>vm.runInContext(s,ctx);
const json=s=>JSON.parse(JSON.stringify(run(s)));
function test(name,fn){fn();console.log('PASS',name);}

test('editor saves own, colleague and CEO fees and receives them after reload',()=>{
  run(`var saved=rpc('token','saveProject',{...DB.projects[0],baseUpdatedAt:'original',mutationId:'mutation-123',deferCal:true,crew:DB.crewAssign,fees:[{crewId:'david-123',name:'Dávid',amount:60000},{crewId:'bence-123',name:'Bence',amount:40000},{crewId:'ervin-123',name:'Ervin',amount:50000}]});`);
  assert.deepEqual(json('saved.fees.map(x=>x.amount)'),[60000,40000,50000]);
  assert.deepEqual(json("parseFees_(DB.projects[0].fees).map(x=>x.amount)"),[60000,40000,50000]);
});
test('direct editor project save preserves approved budget and hides project value',()=>{
  run(`saved=rpc('token','saveProject',{...DB.projects[0],baseUpdatedAt:DB.projects[0].updatedAt,mutationId:'mutation-456',deferCal:true,crew:DB.crewAssign,budgetMode:'ft',budgetVal:1,projectValue:1});`);
  assert.equal(run('DB.projects[0].budgetVal'),160000);
  assert.equal(run('DB.projects[0].quotePrice'),400000);
  assert.equal(run('saved.projectValue'),undefined);
  assert.equal(run('saved.budgetMode'),undefined);
});
test('editor requests a budget; effective budget remains until approval',()=>{
  run(`var pending=rpc('token','requestBudgetChange',{projectId:'project-123',baseUpdatedAt:DB.projects[0].updatedAt,amount:150000,reason:'Egyeztetett módosítás'});`);
  assert.equal(run('pending.budgetRequest.status'),'pending');
  assert.equal(run('DB.projects[0].budgetVal'),160000);
  assert.equal(run('pending.budgetFt'),160000);
  assert.equal(run('pending.projectValue'),undefined);
});
test('editor cannot approve own request',()=>{
  assert.throws(()=>run(`rpc('token','decideBudgetChange',{projectId:'project-123',id:pending.budgetRequest.id,approve:true})`),/FORBIDDEN/);
});
test('only matching pending request can be approved; decision cannot be replayed',()=>{
  run(`USER={role:'admin',name:'Ervin'};`);
  assert.throws(()=>run(`rpc('token','decideBudgetChange',{projectId:'project-123',id:'wrong',approve:true})`),/módosult/);
  run(`saved=rpc('token','decideBudgetChange',{projectId:'project-123',id:pending.budgetRequest.id,approve:true});`);
  assert.equal(run('DB.projects[0].budgetVal'),150000);
  assert.equal(run('saved.budgetRequest.status'),'approved');
  assert.throws(()=>run(`rpc('token','decideBudgetChange',{projectId:'project-123',id:pending.budgetRequest.id,approve:true})`),/módosult/);
});
test('crew cannot submit requests and receives no request, budget, or colleague fees',()=>{
  run(`USER={role:'crew',crewId:'david-123'};var crewView=projectView_(fullProject_(DB.projects[0]),USER);`);
  for(const field of ['fees','budgetRequest','budgetFt','budgetMode','budgetVal','projectValue','quotePrice'])assert.equal(run(`crewView.${field}`),undefined,field);
  assert.equal(run('crewView.myFee.amount'),60000);
  assert.throws(()=>run(`rpc('token','requestBudgetChange',{projectId:'project-123',amount:1,reason:'test request'})`),/FORBIDDEN/);
});
test('rejected requests keep existing budget; stale and duplicate requests are blocked',()=>{
  run(`USER={role:'editor',name:'Dávid'};var rejected=rpc('token','requestBudgetChange',{projectId:'project-123',baseUpdatedAt:DB.projects[0].updatedAt,amount:170000,reason:'Második javaslat'});`);
  assert.throws(()=>run(`rpc('token','requestBudgetChange',{projectId:'project-123',baseUpdatedAt:DB.projects[0].updatedAt,amount:190000,reason:'Másik javaslat'})`),/jóváhagyásra/);
  run(`USER={role:'admin',name:'Ervin'};rpc('token','decideBudgetChange',{projectId:'project-123',id:rejected.budgetRequest.id,approve:false});`);
  assert.equal(run('DB.projects[0].budgetVal'),150000);
  assert.equal(run("parseBudgetRequest_(DB.projects[0].budgetRequest).status"),'rejected');
  run(`USER={role:'editor',name:'Dávid'};`);
  assert.throws(()=>run(`rpc('token','requestBudgetChange',{projectId:'project-123',baseUpdatedAt:'outdated',amount:190000,reason:'Másik javaslat'})`),/CONFLICT/);
});
test('changed effective budget invalidates approval; new admin budget supersedes request',()=>{
  run(`USER={role:'editor',name:'Dávid'};var req=rpc('token','requestBudgetChange',{projectId:'project-123',baseUpdatedAt:DB.projects[0].updatedAt,amount:180000,reason:'Friss javaslat'}); DB.projects[0].budgetVal=155000;USER={role:'admin',name:'Ervin'};`);
  assert.throws(()=>run(`rpc('token','decideBudgetChange',{projectId:'project-123',id:req.budgetRequest.id,approve:true})`),/CONFLICT/);
  run(`rpc('token','saveProject',{...DB.projects[0],crew:DB.crewAssign,baseUpdatedAt:DB.projects[0].updatedAt,mutationId:'mutation-789',deferCal:true,budgetMode:'ft',budgetVal:151000});`);
  assert.equal(run("parseBudgetRequest_(DB.projects[0].budgetRequest).status"),'superseded');
});
test('Queens Night day two deduction is 30000; missing day map splits total instead of charging twice',()=>{
  run(`var qp={date:'2026-10-02',endDate:'2026-10-03',crewDays:'{}',fees:[{crewId:'david-123',amount:120000,dayAmounts:{'2026-10-02':60000,'2026-10-03':60000}}]}, pen={crewId:'david-123',kind:'severe',pct:50,day:'2026-10-03'};`);
  assert.equal(run('penAmount_(qp,pen)'),30000);
  run('delete qp.fees[0].dayAmounts;');
  assert.equal(run('penAmount_(qp,pen)'),30000);
  run(`qp.crewDays={'david-123':['2026-10-02']};`);
  assert.equal(run('penAmount_(qp,pen)'),0);
});
test('logs contain no financial amounts',()=>{
  assert(!/150000|160000|180000/.test(JSON.stringify(json('LOG'))));
});

// Evaluate actual frontend handlers without a network connection or live app data.
const listeners={};const nodes=new Map();
const element=()=>({innerHTML:'',value:'',classList:{toggle(){},add(){},remove(){}},style:{},addEventListener(){},querySelectorAll(){return []},querySelector(){return element()},contains(){return false},setAttribute(){},appendChild(){},focus(){},scrollLeft:0});
const doc={getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)},addEventListener(n,fn){(listeners[n]||=[]).push(fn)},querySelectorAll(){return []},querySelector(){return null},createElement:element,body:element(),documentElement:element(),visibilityState:'visible'};
let timers=[];

/* --- 2026-10-29: visszajelzések javításai --- */
test('backend: photographer and lecture post-production counts drive the flags (legacy flag = 1)',()=>{
  run(`USER={role:'admin',name:'Ervin'};var legacy={...DB.projects[0]};delete legacy.x_foto_n;delete legacy.er_post_n;var ph=rpc('token','saveProject',{...legacy,baseUpdatedAt:DB.projects[0].updatedAt,mutationId:'mutation-foto',deferCal:true,crew:DB.crewAssign,x_foto:true,foto_db:0});`);
  assert.equal(run('DB.projects[0].x_foto'),true);
  assert.equal(run('DB.projects[0].x_foto_n'),1);
  assert.equal(run('DB.projects[0].foto_db'),0);
  run(`rpc('token','saveProject',{...DB.projects[0],baseUpdatedAt:DB.projects[0].updatedAt,mutationId:'mutation-foto2',deferCal:true,crew:DB.crewAssign,x_foto_n:2,er_post_n:3,foto_db:0});`);
  assert.equal(run('DB.projects[0].x_foto'),true);assert.equal(run('DB.projects[0].x_foto_n'),2);
  assert.equal(run('DB.projects[0].er_post'),true);assert.equal(run('DB.projects[0].er_post_n'),3);
  run(`rpc('token','saveProject',{...DB.projects[0],baseUpdatedAt:DB.projects[0].updatedAt,mutationId:'mutation-foto3',deferCal:true,crew:DB.crewAssign,x_foto_n:0,er_post_n:0});`);
  assert.equal(run('DB.projects[0].x_foto'),false);assert.equal(run('DB.projects[0].er_post'),false);
});
test('backend accepts the new video delivery stages',()=>{
  for(const st of ['leadva','jovahagyas']){
    run(`rpc('token','saveProject',{...DB.projects[0],status:'${st}',siteOk:'igen',lead:'david-123',baseUpdatedAt:DB.projects[0].updatedAt,mutationId:'mutation-${st}',deferCal:true,crew:DB.crewAssign});`);
    assert.equal(run('DB.projects[0].status'),st);
  }
});
test('executive moves a penalty to day two without changing anything else',()=>{
  run(`DB.projects[0].fees=JSON.stringify([{crewId:'david-123',name:'Dávid',amount:120000,dayAmounts:{'2026-10-02':60000,'2026-10-03':60000}}]);
    DB.projects[0].penalties=JSON.stringify([{id:'pen-1',crewId:'david-123',kind:'severe',pct:50,day:'',status:'approved',by:'Ervin',at:'1',reason:'Helyszíni elakadás'}]);
    penMutate_=(pid,fn)=>{const p=DB.projects.find(x=>x.id===pid);const list=parsePen_(p.penalties);const res=fn(list,p);p.penalties=JSON.stringify(list);return {list,p,res};};
    var before=DB.projects[0].updatedAt;var mv=rpc('token','movePenaltyDay',{projectId:'project-123',id:'pen-1',day:'2026-10-03'});`);
  assert.equal(run('mv.penalties[0].day'),'2026-10-03');
  assert.equal(run('penAmount_(DB.projects[0],parsePen_(DB.projects[0].penalties)[0])'),30000);
  assert.equal(run('DB.projects[0].updatedAt'),run('before'));
  assert.throws(()=>run(`rpc('token','movePenaltyDay',{projectId:'project-123',id:'pen-1',day:'2026-11-01'})`),/időtartamán kívül/);
  run(`USER={role:'editor',name:'Dávid',crewId:'david-123'};`);
  assert.throws(()=>run(`rpc('token','movePenaltyDay',{projectId:'project-123',id:'pen-1',day:''})`));
  run(`USER={role:'admin',name:'Ervin'};`);
});
test('crew card order is saved, de-duplicated and limited to existing crew',()=>{
  run(`var PROPS={};PropertiesService={getScriptProperties:()=>({getProperty:k=>PROPS[k]||null,setProperty:(k,v)=>{PROPS[k]=v;}})};
    var ord=rpc('token','saveCrewOrder',{order:['bence-123','ghost','bence-123','david-123']});`);
  assert.deepEqual(json('ord.crewOrder'),['bence-123','david-123']);
  assert.deepEqual(json('crewOrder_()'),['bence-123','david-123']);
});


test('users: no PIN anywhere – new user gets only a Google invite, old PIN hashes are stripped',()=>{
  run(`var INV=[];sendInviteMail_=u=>INV.push(u.email);PROPS['LUMOS_PM_USERS_V1']=JSON.stringify([{id:'old-1',name:'Régi',role:'editor',email:'regi@x.hu',salt:'s',hash:'h',disabled:false}]);
    var su=saveUser_({name:'Új Kolléga',role:'editor',email:'uj@x.hu',sendInvite:true});`);
  assert.deepEqual(json('INV'),['uj@x.hu']);
  const stored=JSON.parse(run("PROPS['LUMOS_PM_USERS_V1']"));
  assert(stored.every(u=>!('salt' in u)&&!('hash' in u)));
  assert.equal(typeof run('typeof login'),'string');assert.equal(run('typeof login'),'undefined');
  assert.equal(run('typeof requestPinReset'),'undefined');assert.equal(run('typeof changePin_'),'undefined');
});
const front=vm.createContext({console,document:doc,window:{addEventListener(){},LUMOS_API_URL:'https://example.test'},localStorage:{getItem(){return null}},sessionStorage:{getItem(){return null}},location:{hash:'',pathname:'/'},history:{replaceState(){}},setInterval(){},setTimeout(fn){timers.push(fn);return timers.length},clearTimeout(){},crypto,scrollTo(){},requestAnimationFrame(){},URL,URLSearchParams});
for(const f of ['core.js','views.js','actions.js']){
  let source=fs.readFileSync(path.join(root,f),'utf8');
  source=source.replace("if(TOKEN){const fast=bootFromCache();load(fast);}else{VIEW.innerHTML='';showLogin('');}",'');
  vm.runInContext(source,front,{filename:f});
}
const fr=s=>vm.runInContext(s,front);
fr(`render=()=>{};renderChrome=()=>{};syncCal=()=>{};toast=()=>{};S.me={role:'editor',crewId:'david-123'};S.tab='projektek';S.crew=[{id:'david-123',name:'Dávid'},{id:'bence-123',name:'Bence'}];S.draft={id:'test-project',name:'Test',date:'2026-10-10',status:'utomunka',budgetFt:150000,fees:[{crewId:'david-123',amount:0},{crewId:'bence-123',amount:0}],crew:[],equipment:[]};`);
test('frontend records fee edits in the draft and autosaves on leaving the field',()=>{
  const target={dataset:{feeI:'0',feeK:'amount',money:'1'},value:'60 000',tagName:'INPUT',selectionStart:6,closest(){return null},setSelectionRange(){}};
  listeners.input.forEach(fn=>fn({target}));
  assert.equal(fr('S.draft.fees[0].amount'),60000);
  assert.equal(fr('S.dirty'),true);
  fr('var autoSaved=false;saveDraft=()=>{autoSaved=true;};');
  listeners.change.forEach(fn=>fn({target}));
  for(const fn of timers.splice(0))fn();
  assert.equal(fr('autoSaved'),true);
});
test('frontend rejects server responses that silently lose entered fees',()=>{
  assert.throws(()=>fr(`verifySavedFees(S.draft,{fees:[{crewId:'david-123',amount:0},{crewId:'bence-123',amount:0}]})`),/eltérő díjat/);
});
test('frontend computes day two penalty identically for leader and crew views',()=>{
  fr(`var p={date:'2026-10-02',endDate:'2026-10-03',fees:[{crewId:'david-123',amount:120000,dayAmounts:{'2026-10-02':60000,'2026-10-03':60000}}]},x={crewId:'david-123',kind:'severe',pct:50,day:'2026-10-03'};`);
  assert.equal(fr('penAmt(p,x)'),30000);
  fr('p.myFee=p.fees[0];delete p.fees;');
  assert.equal(fr('penAmt(p,x)'),30000);
  fr('delete p.myFee.dayAmounts;');
  assert.equal(fr('penAmt(p,x)'),30000);
});
test('approval UI preserves backward compatibility until backend is updated',()=>{
  assert.match(fr("budgetRequestPanel({})"),/disabled/);
  fr('S.capabilities={budgetApproval:true};');
  assert(!fr('budgetRequestPanel({})').includes(' disabled'));
});
test('frontend: required basics are checked, notes are optional',()=>{
  fr(`var rp={name:'X',venue:'V',client:'C',eventType:'Konferencia',contactName:'K',contactPhone:'+36 30 123 4567',contactEmail:'a@b.hu',date:'2026-10-10',startTime:'10:00',endTime:'18:00'};`);
  assert.deepEqual(JSON.parse(fr('JSON.stringify(missingReq(rp))')),[]);
  fr(`rp.contactPhone='+36 ';rp.endDate='';rp._multi=true;`);
  assert.deepEqual(JSON.parse(fr('JSON.stringify(missingReq(rp).map(x=>x[0]))')),['contactPhone','endDate']);
});
test('frontend: payouts mark the penalised item and show the kept amount to leaders',()=>{
  fr(`S.me={role:'admin'};S.crew=[{id:'david-123',name:'Dávid'}];S.payMonth='2026-10';S.projects=[{id:'q',name:'Queens',status:'atadva',date:'2026-10-02',endDate:'2026-10-03',crewDays:{},fees:[{crewId:'david-123',name:'Dávid',amount:120000,dayAmounts:{'2026-10-02':60000,'2026-10-03':60000}}],penalties:[{crewId:'david-123',kind:'severe',pct:50,day:'2026-10-03',status:'approved',reason:'Helyszíni elakadás'}]}];`);
  const html=fr('viewPayouts()');
  assert.match(html,/nem kerül kifizetésre/);
  assert.match(html,/30\s?000/);
  assert.match(html,/🚨 −30\s?000/);
  assert.match(html,/title="[^"]*Helyszíni elakadás/);
  assert.doesNotMatch(html,/kezdőnapjuk/);
  fr(`S.me={role:'editor'};`);
  assert.match(fr('viewPayouts()'),/nem kerül kifizetésre/);
});
test('frontend: daily totals include the day-two deduction and match the grand total',()=>{
  fr(`S.me={role:'admin'};var q=S.projects[0];q.fees.push({crewId:'bence-123',name:'Bence',amount:50000,dayAmounts:{'2026-10-02':25000,'2026-10-03':25000}},{kind:'fixed',key:'fuvar',name:'Fuvar',amount:10000});`);
  assert.equal(fr("daySumOf(q,'2026-10-02')"),85000);
  assert.equal(fr("daySumOf(q,'2026-10-03')"),55000);
  assert.equal(fr('otherSumOf(q)'),10000);
  assert.equal(fr("daySumOf(q,'2026-10-02')+daySumOf(q,'2026-10-03')+otherSumOf(q)"),fr('feeSum(q)'));
});
test('frontend: long names are shortened to fit the fixed payout column',()=>{
  assert.equal(fr("shortName('Gál Flóra')"),'Gál Flóra');
  assert.equal(fr("shortName('Gáspár-Kovács Flóra')"),'G. Flóra');
  assert.equal(fr("shortName('Nagy Kis Bernadett')"),'N. K. Bernadett');
});
test('frontend: crew sees only their own payout column',()=>{
  fr(`S.me={role:'crew',crewId:'bence-123'};S.crew=[{id:'david-123',name:'Zajácz Dávid'},{id:'bence-123',name:'Kiss Bence'}];S.payMonth='2026-10';
    S.projects=[{id:'q',name:'Queens',status:'atadva',date:'2026-10-02',endDate:'2026-10-03',crewDays:{},myFee:{amount:50000},penalties:[]}];`);
  const html=fr('viewPayouts()');
  assert.match(html,/Kiss Bence/);assert.doesNotMatch(html,/Zajácz/);assert.match(html,/50\s?000/);assert.doesNotMatch(html,/Projekt összesen/);
  assert(fr("TABS().some(t=>t.id==='kifizetesek')"));
});
console.log('All finance checks passed.');
