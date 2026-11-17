'use strict';
/* Fizetési állapot: a fizetett díjbekérő és a belőle készült előlegszámla EGY befizetés – nem lehet tőlük „teljes” a projekt
   (2026-11: a Magyar Dermatológiai Társulat így lett tévesen „Teljes fizetve”, és ettől a videókról lekerülhetett a vízjel). */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const fe=fs.readFileSync(path.resolve(__dirname,'../finance.js'),'utf8');
const a=fe.indexOf('const invPaidOk='),b=fe.indexOf('\n',fe.indexOf("return 'eloleg';};",a))+1;assert(a>=0&&b>a,'szPayOf megtalálható');
const proj={id:'p1',value:258000};
const mk=inv=>new Function('S','num','invPids','projById','projTotal','invShare',fe.slice(a,b)+'\nreturn szPayOf;')(
  {fin:{invoices:inv}},v=>Number(v)||0,x=>[x.projectId,...String(x.projectIds||'').split(',')].filter(Boolean),id=>id==='p1'?proj:null,p=>p.value,()=>1);
const dij={kind:'dijbekero',projectId:'p1',invNet:129000,invGross:163830,invPaid:163830},elo={kind:'eloleg',projectId:'p1',invNet:129000,invGross:163830,invPaid:163830};
assert.equal(mk([dij,elo])('p1'),'eloleg','díjbekérő + belőle készült előlegszámla (50%) → foglaló, nem teljes');
assert.equal(mk([dij])('p1'),'eloleg','csak a fizetett díjbekérő (50%) → foglaló');
assert.equal(mk([{...dij,invNet:258000,invGross:327660,invPaid:327660},{...elo,invNet:258000,invGross:327660,invPaid:327660}])('p1'),'teljes','100%-os díjbekérő + előlegszámla → teljes');
assert.equal(mk([elo,{kind:'szamla',projectId:'p1',invNet:129000,invGross:163830,invPaid:0}])('p1'),'eloleg','végszámla kifizetetlen → foglaló');
/* a háttér ugyanezt a szabályt alkalmazza (a két csoport közül a nagyobb) */
const gs=fs.readFileSync(path.resolve(__dirname,'../apps-script/src/50_szamlazas_szerzodesek.gs'),'utf8');
assert.match(gs,/Math\.max\(li\.filter\(x => x\.kind === 'dijbekero'\)/,'a háttér is egyszer számolja a díjbekérőt és az előlegszámlát');
console.log('ok');
