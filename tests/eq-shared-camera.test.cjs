/* USECASE: egy rendezvényre megyünk videózni, és azon belül egy másik ügyfélnek is videózunk (két külön projekt, ugyanazon a napon, átfedő időben).
   Ugyanaz az operatőr ugyanazzal a kamerával dolgozik mindkettőben – ezt engedni kell, és nem lehet „túlfoglalás” figyelmeztetés.
   Ha viszont egy MÁSIK munkatárs kérné ugyanazt a (1 db-os) kamerát, az továbbra is foglalt. */
const fs=require('fs'),path=require('path'),assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'..','core.js'),'utf8');
const b=src.indexOf('/* Mi hiányzik még');
const c=src.indexOf('/* Egy időben futó másik projektekben');
const code=src.slice(c,b);
const num=x=>+x||0,eqQty=(q,id)=>(q.equipment||[]).filter(e=>e.itemId===id).reduce((s,e)=>s+num(e.qty),0);
let PS=[];const pr=p=>({start:p.date}),clash=(p,q)=>p.date===q.date,allProjects=()=>PS;
const f=new Function('num','eqQty','pr','clash','allProjects',code+';return {usedElsewhere,eqNeed,eqQtyBy};')(num,eqQty,pr,clash,allProjects);
const CAM='fx30',OP='nora',OTHER='kata';
const rend={id:'rend',date:'2026-11-27',status:'tervezes',equipment:[{itemId:CAM,qty:1,crewId:OP}]};
const ugyfel={id:'ugyfel',date:'2026-11-27',status:'tervezes',equipment:[]};
PS=[rend,ugyfel];
// 1) a másik projektben ugyanannak az operatőrnek választható a kamera (1 db van összesen)
assert.equal(1-f.usedElsewhere(CAM,ugyfel,OP),1,'ugyanannak az operatőrnek szabadnak kell látszania');
// 2) egy másik munkatársnak nem
assert.equal(1-f.usedElsewhere(CAM,ugyfel,OTHER),0,'másik munkatársnak foglalt');
// 3) hozzárendelés után: nincs túlfoglalás, és az eszközsor sem jelez hiányt
ugyfel.equipment=[{itemId:CAM,qty:1,crewId:OP}];
assert.equal(f.eqNeed([rend,ugyfel],CAM),1,'egy kamera kell, nem kettő');
assert.equal(1-f.usedElsewhere(CAM,ugyfel)-(eqQty(ugyfel,CAM)-1),1,'az eszközsor ne írja, hogy nincs szabad');
// 4) ha a másik projektben egy másik munkatárs viszi, az már valódi ütközés
const masik={id:'masik',date:'2026-11-27',status:'tervezes',equipment:[{itemId:CAM,qty:1,crewId:OTHER}]};
PS=[rend,ugyfel,masik];
assert.equal(f.eqNeed([rend,ugyfel,masik],CAM),2,'két különböző embernél két kamera kell');
console.log('PASS közös kamera ugyanannál az operatőrnél');
