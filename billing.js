'use strict';
/* ===== Szerződés és számlázás (csak ügyvezető) =====
   Projektenként: szerződés (feltöltés / link / állapot), díjbekérő → foglaló fizetve → végszámla → fizetve.
   A bizonylatok a számlázz.hu-ból jönnek (finance.js: szInvoiceModal, IPN, szSync), az adatok a finData-ban (billing, invoices). */
const CONTRACT_LABEL={'':'Szerződés hiányzik',kikuldve:'Kiküldve, aláírásra vár',visszakuldve:'Visszaküldve, módosítás alatt',alairva:'Aláírva',nemkell:'Nincs szerződés'};
const CONTRACT_CLS={'':'p-bad',kikuldve:'p-warn',visszakuldve:'p-info',alairva:'p-ok',nemkell:'p-mute'};
const billOn=()=>isAdmin()&&!!(S.capabilities&&S.capabilities.finance);
const billOf=pid=>((S.fin&&S.fin.billing)||[]).find(b=>b.projectId===pid)||{projectId:pid,contractStatus:'',mode:'eloleg',advancePct:50,poNumber:'',note:'',contractUrl:'',contractName:''};
const projDone=p=>['leadva','jovahagyas','atadva'].includes(p.status)||(pr(p)&&pr(p).end<todayISO());
const fmtMD=d=>d?d.slice(5).replace('-','.')+'.':'';
/* Ügyfél-hónap pénzügyi csoportja: kizárólag a bizonylatok tényleges kapcsolata számít igazolt közös foglalónak. */
function billClientMonthProjects(p){
  const d=pr(p),name=String(p.client||'').trim().toLocaleLowerCase('hu');
  if(!d||!name)return [p];
  return (S.projects||[]).filter(x=>x.status!=='lemondva'&&String(x.client||'').trim().toLocaleLowerCase('hu')===name&&pr(x)&&pr(x).start.slice(0,7)===d.start.slice(0,7));
}
function billGroupAdvance(rows){
  const ps=rows.map(x=>x.p||x).filter(x=>x&&x.id),ids=new Set(ps.map(p=>p.id));
  const total=ps.reduce((a,p)=>a+projTotal(p),0);
  const expected=ps.reduce((a,p)=>a+Math.round(projTotal(p)*Math.max(0,Math.min(100,num(billOf(p.id).advancePct)))/100),0);
  const all=((S.fin&&S.fin.invoices)||[]).filter(x=>(x.kind==='dijbekero'||x.kind==='eloleg')&&invPids(x).some(id=>ids.has(id)));
  const refs=new Set(all.filter(x=>x.kind==='eloleg'&&x.ref).map(x=>String(x.ref)));
  const docs=all.filter(x=>x.kind==='eloleg'||!refs.has(String(x.no||'')));
  const coveredFraction=x=>{const linked=invPids(x),linkedSum=linked.reduce((a,id)=>a+projTotal(projById(id)||{}),0);
    return linkedSum?linked.filter(id=>ids.has(id)).reduce((a,id)=>a+projTotal(projById(id)||{}),0)/linkedSum:1;};
  const paid=Math.min(total,Math.round(docs.reduce((a,x)=>{
    const amount=x.kind==='eloleg'&&x.manual&&invPaidOk(x)?num(x.invNet):num(x.invPaid)*invNetR(x);
    return a+Math.max(0,amount)*coveredFraction(x);
  },0)));
  const qualified=docs.filter(x=>invPaidOk(x));
  const sameDay=ps.length>1&&ps.every(p=>pr(p)&&pr(p).start===pr(ps[0]).start);
  const candidate=ps.length>1&&sameDay&&ps.every(p=>billOf(p.id).mode!=='egyben')
    &&docs.length===1&&qualified.length===1&&Math.abs(num(qualified[0].invNet)-expected)<=2
    &&invPids(qualified[0]).every(id=>ids.has(id))
    &&ps.some(p=>!invPids(qualified[0]).includes(p.id))?qualified[0]:null;
  const shared=qualified.find(x=>invPids(x).length>1&&ps.every(p=>invPids(x).includes(p.id)))||null;
  return {total,expected,paid,remaining:Math.max(0,total-paid),candidate,shared,projects:ps};
}
/* Egy projekt szerződés- és számlázási állapota */
function billInfo(p){
  const b=billOf(p.id),inv=invFor('project',p.id),last=k=>inv.filter(x=>x.kind===k).pop()||null;
  const db=last('dijbekero'),el=last('eloleg'),fin=b.mode==='egyben'?(last('szamla')||last('vegszamla')):(last('vegszamla')||last('szamla'));
  const finAll=inv.filter(x=>x.kind==='szamla'||x.kind==='vegszamla'||!x.kind).sort((a,c)=>String(a.date||'').localeCompare(String(c.date||''))),finExtra=finAll.filter(x=>x!==fin);   // utólag rendelt újabb termék: további számla ugyanarra a projektre
  // a szerződés opcionális: csak akkor lépés, ha van (kiküldve / aláírva); kiküldött szerződésnél az aláírás a következő teendő
  // alapból kell szerződés; ha a „Nincs szerződés” ki van pipálva, kimarad a lépések közül
  const fw=!b.contractStatus?fwFor(p):null;   // keretszerződés az ügyféllel → nem kell külön szerződés
  const contractOk=b.contractStatus==='alairva'||b.contractStatus==='nemkell'||!!fw;
  const cStep=b.contractStatus==='nemkell'||(fw&&fw.mode==='nemkell')?[]:[['contract',fw?'Keretszerződés':'Szerződés aláírva',contractOk]];
  const advIssued=!!(db||el),advPaid=!!((db&&invPaidOk(db))||(el&&invPaidOk(el)));
  const advSkip=b.mode!=='egyben'&&!db&&!el&&!!fin;   // a rendezvény napjától díjbekérő helyett rögtön (teljes) számla is mehet: ekkor nincs foglaló-lépés
  const full=b.mode!=='egyben'&&!advSkip&&num(b.advancePct)>=100,noFin=(b.noFinal==='1'||full)&&!fin,finSteps=noFin?[]:b.mode==='egyben'||advSkip?[['finIssued','Számla kiállítva',!!fin],['finPaid','Számla kifizetve',!!fin&&finAll.every(invPaidOk)]]:[['finIssued','Végszámla kiállítva',!!fin],['finPaid','Végszámla kifizetve',!!fin&&finAll.every(invPaidOk)]];
  const free=isFree(p)&&!inv.length;   // nem fizetős projekt: nincs díjbekérő és számla
  const steps=free?[...cStep]:b.mode==='egyben'||advSkip?[...cStep,...finSteps]:[...cStep,['advIssued','Díjbekérő kiállítva',advIssued],['advPaid','Foglaló kifizetve',advPaid],...finSteps];
  const nextI=steps.findIndex(s=>!s[2]),closed=nextI<0;
  const open=inv.filter(x=>!(x.kind==='dijbekero'&&(x.ref||el))&&!invPaidOk(x)),late=open.filter(x=>x.due&&x.due<todayISO());
  const due=x=>Math.max(0,num(x.invGross)-num(x.invPaid))*invShare(x,p.id);
  let next=free?'Nem fizetős':'Lezárva',nextCls=free?'p-mute':'p-ok';
  if(!closed){const k=steps[nextI][0];
    next=k==='contract'?(b.contractStatus==='kikuldve'?'Szerződés aláírásra vár':b.contractStatus==='visszakuldve'?'Szerződés módosítása':'Szerződés hiányzik'):k==='advIssued'?'Díjbekérő kiállítása':k==='advPaid'?'Foglalóra vár':k==='finIssued'?(projDone(p)?(b.mode==='egyben'?'Számla kiállítása':'Végszámla kiállítása'):(b.mode==='egyben'?'Számla a projekt után':'Végszámla a projekt után')):'Fizetésre vár';
    nextCls=k==='contract'&&b.contractStatus!=='kikuldve'&&b.contractStatus!=='visszakuldve'?'p-bad':(k==='advIssued'||(k==='finIssued'&&projDone(p)))?'p-info':'p-warn';
    const tg=k==='finIssued'?tigOf(p.id):null;if(tg){next=tg.status==='jovahagyva'?'TIG jóváhagyva – számlázható':tg.status==='kiallitva'?'TIG elküldésre vár':'TIG jóváhagyásra vár';nextCls=tg.status==='jovahagyva'?'p-info':'p-warn';}
    if(late.length){next='Lejárt fizetés';nextCls='p-bad';}}
  return {p,b,fw,inv,db,el,fin,finAll,finExtra,noFin,full,free,advSkip,steps,nextI,closed,next,nextCls,open,late,openSum:open.reduce((s,x)=>s+due(x),0),lateSum:late.reduce((s,x)=>s+due(x),0),openNet:open.reduce((s,x)=>s+due(x)*invNetR(x),0),lateNet:late.reduce((s,x)=>s+due(x)*invNetR(x),0),todo:!closed&&steps[nextI]&&(steps[nextI][0]==='advIssued'||(steps[nextI][0]==='finIssued'&&projDone(p))),noContract:!contractOk};   // noContract = aláírásra váró szerződés
}
/* A projekt legutóbbi, még nem számlázott TIG-je */
const tigList=()=>((S.fin&&S.fin.tigs)||[]);
const tigPids=t=>String(t.projectIds||'').split(',').filter(Boolean);
const tigOf=pid=>tigList().filter(t=>t.status!=='szamlazva'&&tigPids(t).includes(pid)).pop()||null;
/* A következő kiállítandó bizonylat típusa */
function billNextType(pid){const p=projById(pid);if(!p)return 'szamla';const i=billInfo(p);if(i.b.mode==='egyben')return 'szamla';if(!i.db&&!i.el)return 'dijbekero';if(i.db&&invPaidOk(i.db)&&!i.el&&!i.db.ref)return 'eloleg';return i.el&&i.el.advType==='szamla'?'szamla':'vegszamla';}   /* díjbekérő alapján készült sima számla után a maradékról sima számla (nincs mit levonni) */

function invLine(x,label){if(!x)return '';const s=invState(x);
  const st=s==='paid'?`<span class="statuspill p-ok">✅ Fizetve${x.paidAt?' '+fmtMD(x.paidAt):''}</span>`:s==='part'?`<span class="info-txt">Részben: ${ftFmt(num(x.invPaid))}</span>`:s==='late'?`<span class="bad-txt">⚠ Lejárt ${fmtMD(x.due)}</span>`:`<span class="bad-txt">Fizetésre vár${x.due?' · '+fmtMD(x.due):''}</span>`;
  return `<div class="bl-doc"><button class="bl-no" type="button" data-action="sz-inv" data-id="${esc(x.id)}" title="${esc((SZ_KIND[x.kind]||'')+' · bruttó '+ftFmt(num(x.invGross)))}">${label?`<span class="muted">${label}</span> `:''}${esc(x.no)}</button><span class="bl-sub">${ftFmt(num(x.invGross))} · ${st}</span>${invShared(x)?`<span class="bl-shared" title="${esc(invPids(x).map(id=>(projById(id)||{}).name||'?').join(' · '))}">🔗 közös számla · ${invPids(x).length} projekt</span>`:''}</div>`;}
const billAddBtn=(pid,type,label,strong,ids)=>`<button class="btn ${strong?'primary':'outline'} small bl-add" type="button" data-action="bill-inv" data-id="${esc(pid)}"${ids&&ids.length>1?` data-ids="${esc(ids.join(','))}"`:''} data-type="${type}">+ ${label}</button>`;
function billRow(i,o){o=o||{};const p=i.p,b=i.b,r=pr(p),val=projTotal(p),ex=extrasSum(p),C=billCells(p,i,o);
  const sp=n=>n>1?` rowspan="${n}"`:'';
  const cls=[i.closed?'bl-closed':'',o.cfirst?'bl-cfirst':'',o.cshade?'bl-cshade':''].filter(Boolean).join(' ');
  return `<tr${cls?` class="${cls}"`:''}><td class="n">${r?esc(String(Number(r.start.slice(8)))):''}</td><td><button class="linkbtn bl-name" type="button" data-action="open-project" data-id="${esc(p.id)}">${esc(p.name||'Névtelen projekt')}</button>
      <div class="bl-meta">${esc(p.client||'—')}</div><div class="bl-val">${val?ftFmt(val)+' <span class="muted">nettó</span>'+(extrasOf(p).length?`<div class="bl-meta">${exBreak(p)}</div>`:''):isFree(p)?'<span class="muted">🎁 nem fizetős</span>':'<span class="muted">nincs érték megadva</span>'}</div>
      ${i.late.length?`<div class="bl-meta bad-txt">⚠ lejárt: ${ftFmt(i.lateSum)}</div>`:i.openSum?`<div class="bl-meta">kintlévő: ${ftFmt(i.openSum)}</div>`:''}${b.note?`<div class="bl-note" title="${esc(b.note)}">📝 ${esc(b.note.slice(0,60))}${b.note.length>60?'…':''}</div>`:''}</td>
    ${o.cSpan===0?'':`<td class="bt-cell${o.cSpan>1?' bt-merged':''}"${sp(o.cSpan)}>${C.contract}</td>`}${o.aSpan===0?'':`<td class="bt-cell${o.aSpan>1?' bt-merged':''}"${sp(o.aSpan)}>${C.adv}</td>`}${o.tigSpan===0?'':`<td class="bt-cell${o.tigSpan>1?' bt-merged':''}"${sp(o.tigSpan)}>${C.tig}</td>`}${o.finSpan===0?'':`<td class="bt-cell${o.finSpan>1?' bt-merged':''}"${sp(o.finSpan)}>${C.fin}</td>`}</tr>`;}
/* Egy hónapon belül az azonos megrendelő projektjei egymás után; a közös TIG és a közös végszámla egy (összevont) cellában */
const invNetR=x=>{const g=num(x.invGross),n=num(x.invNet);return g>0&&n>0?n/g:1/1.27;};   // bruttó → nettó arány a bizonylatból
function billMonthRows(arr){const n=s=>String(s||'').trim().toLowerCase(),by={},order=[];
  arr.forEach(i=>{const k=n(i.p.client)||('#'+i.p.id);if(!by[k]){by[k]=[];order.push(k);}by[k].push(i);});
  const invs=g=>g.flatMap(i=>(i.finAll||[]).concat(i.db?[i.db]:[],i.el?[i.el]:[])).filter(x=>x&&x.kind!=='storno');
  const rank=g=>{const L=invs(g),un=L.filter(x=>!invPaidOk(x));if(un.some(x=>invState(x)==='late'))return 0;if(un.length)return 1;return L.length&&g.every(i=>(i.finAll||[]).length||i.full||i.noFin||i.free)?3:2;};   // lejárt kifizetetlen → kifizetetlen → még nincs számla → kifizetve
  order.sort((a,b)=>rank(by[a])-rank(by[b]));
  const out=[];order.forEach((k,ci)=>{const g=by[k],L=g.length,merge=L>1&&g.every(i=>!i.free);
    const tk=i=>{const tg=tigList().filter(t=>tigPids(t).includes(i.p.id)).pop();return tg?'tig:'+tg.id:'none';};
    const fk=i=>{const f=(i.finAll||[])[0];return f?'inv:'+f.id:i.full||i.noFin?'':(i.db||i.el)?'adv:'+i.p.id:'none';};   // foglalós projekt végszámlája külön
    const tigSame=merge&&g.every(i=>tk(i)===tk(g[0])),finAllInv=false,finSame=finAllInv||merge&&g.every(i=>fk(i)&&fk(i)===fk(g[0])&&!/^adv:/.test(fk(i)));   // minden projektnek van számlája: egy kártya, az összes számlával
    const advSame=merge&&g.every(i=>i.b.mode==='egyben');
    const ck=i=>String(i.b.contractFileId||i.b.contractUrl||''),cMerge=merge&&g.every(i=>ck(i)===ck(g[0]));   // szerződés: csak akkor egy közös cella, ha mindegyiknél ugyanaz a dokumentum (pl. két külön megrendelőlap → két cella)   // díjbekérő: ha egyiknél sem kell, egy kártya
    out.push({head:{name:g[0].p.client||'—',n:L,sum:g.reduce((s,i)=>s+projTotal(i.p),0)}});
    const runSpan=x=>{if(finSame)return x?0:L;const k=fk(g[x]);if(!merge||!/^inv:/.test(k))return 1;if(x&&fk(g[x-1])===k)return 0;let e=x;while(e+1<L&&fk(g[e+1])===k)e++;return e-x+1;};   // ugyanaz a számla egymás alatti projekteknél: egy kártya
    const nI=g.find(i=>!i.fin&&!i.noFin&&!i.full&&!i.free&&(i.b.mode==='egyben'||i.advSkip||i.db||i.el)),newT=nI?{pid:nI.p.id,type:nI.b.mode==='egyben'?'szamla':'vegszamla',label:nI.b.mode==='egyben'?'Számla':'Végszámla',name:nI.p.name||''}:null;   // ügyfélcsoport: egyetlen gomb – először a még számlázatlan projekt
    const spans=g.map((_,x)=>runSpan(x)),lastFin=spans.map((s,x)=>s).reduce((a,s,x)=>s?x:a,0);
    g.forEach((i,x)=>out.push({i,o:{aSpan:advSame?(x?0:L):1,cfirst:!x&&ci>0,cshade:ci%2===1,cSpan:cMerge?(x?0:L):1,cIds:cMerge&&!x?g.map(y=>y.p.id):null,tigSpan:tigSame?(x?0:L):1,finSpan:spans[x],group:finSame?g:spans[x]>1?g.slice(x,x+spans[x]):null,moreBtn:!merge||x===lastFin,noAdd:merge&&L>1&&!finSame,moreNew:merge&&L>1&&!finSame&&x===lastFin?newT:null,finAllG:finAllInv&&!x?g:null}}));});
  return out.map(r=>r.head?`<tr class="bl-chead"><td colspan="6"><span class="bl-cname">🏢 ${esc(r.head.name)}</span><span class="muted"> · ${r.head.n} projekt${r.head.sum?' · '+ftFmt(r.head.sum)+' nettó':''}</span></td></tr>`:billRow(r.i,r.o)).join('');}
/* A táblázat cellái lépésenként: Szerződés (elküldve, aláírva), TIG (elküldve, jóváhagyva), Díjbekérő (elküldve, fizetve), Végszámla (elküldve, fizetve) */
const bsStep=(on,label,extra,act)=>`<div class="bs-step${on?' on':''}">${act?`<button type="button" class="bs-dot" ${act} aria-pressed="${on}" title="${on?'Visszavonás':'Megtörtént'}">${on?'✓':''}</button>`:`<span class="bs-dot">${on?'✓':''}</span>`}<span class="bs-l${/^\d{2}\.\d{2}\.$/.test(String(extra||''))?' inl':''}"><span>${label}</span>${extra?`<span class="bs-x">${extra}</span>`:''}</span></div>`;
function bsInv(x){if(!x)return '';const s=invState(x);return `<button class="bl-no" type="button" data-action="sz-inv" data-id="${esc(x.id)}">${esc(x.no)}</button> · ${ftFmt(num(x.invGross))}${x.manual?` <span class="muted" title="Kézzel rögzített bizonylat – a kifizetést kézzel kell jelölni">✍️ ${x.issuer==='kft'?'Kft.':'E.V.'}</span>`:''}${invShared(x)?` <span class="bl-shared" title="${esc(invPids(x).map(id=>(projById(id)||{}).name||'?').join(' · '))}">🔗 ${invPids(x).length} projekt</span>`:''}`;}
function bsPaid(x){if(!x)return '';const s=invState(x);return s==='paid'?(x.paidAt?fmtMD(x.paidAt):''):s==='part'?`<span class="info-txt">részben: ${ftFmt(num(x.invPaid))}</span>`:s==='late'?`<span class="bad-txt">lejárt ${fmtMD(x.due)}</span>`:x.due?`határidő ${fmtMD(x.due)}`:'';}
const bsIss=x=>x&&x.manual&&x.issuer==='ev'?'E.V.':'L.M.';
const bsSent=(label,x)=>bsStep(true,label+' elküldve',`${x.date?fmtMD(x.date)+' · ':''}<button class="bl-no" type="button" data-action="sz-inv" data-id="${esc(x.id)}" title="Számla megnyitása (PDF)">${esc(x.no)}</button>`);
const bsPaidStep=x=>{const ok=invPaidOk(x),st=invState(x),d=x.paidAt||x.date;
  if(!ok)return bsStep(false,`${st==='part'?`Részben kifizetve <span class="bs-in">${ftFmt(num(x.invPaid))}</span>`:`Nincs kifizetve${x.due?` <span class="bs-in${st==='late'?' late':''}">· ${st==='late'?'lejárt':'határidő'} ${fmtMD(x.due)}</span>`:''}`}`);
  return bsStep(ok,ok?`Kifizetve${d?` <span class="bs-in">${fmtMD(d)}</span>`:''}`:st==='part'?`Részben kifizetve <span class="bs-in">${ftFmt(num(x.invPaid))}</span>`:`Nincs kifizetve${x.due?` <span class="bs-in${st==='late'?' late':''}">· ${st==='late'?'lejárt':'határidő'} ${fmtMD(x.due)}</span>`:''}`);};
/* Opciók gomb (⋯): jelölés fizetettnek, sztornó – a kártyán nincs véletlenül kattintható művelet */
function bsOpts(x,all){if(!x)return '';const paid=num(x.invPaid)>0||invPaidOk(x),dbk=x.kind==='dijbekero',ref=dbk&&(all||[]).some(y=>y.ref===x.no);
  const pay=!invPaidOk(x),sto=!paid&&(dbk?!ref&&isAdmin():!x.manual);if(!pay&&!sto)return '';
  return `<button class="linkbtn bs-optbtn" type="button" data-action="bs-opts" data-id="${esc(x.id)}" data-pay="${pay?1:''}" data-sto="${sto?(dbk?'dbk':'inv'):''}">⋯ Opciók</button>`;}
function billCells(p,i,o){i=i||billInfo(p);o=o||{};if(o.finAllG){const seen={},u=[];o.finAllG.forEach(y=>(y.finAll||[]).forEach(x=>{if(!seen[x.id]){seen[x.id]=1;u.push(x);}}));u.sort((a,c)=>String(a.date||'').localeCompare(String(c.date||'')));i=Object.assign({},i,{finAll:u,fin:u[u.length-1]||i.fin});}   // összevont kártya: a csoport összes számlája
  const b=i.b,pid=esc(p.id),val=num(p.projectValue),tot=projTotal(p),ex=extrasSum(p);
  const monthOver=!!pr(p)&&pr(p).start.slice(0,7)<todayISO().slice(0,7);   // a projekt hónapja letelt
  const tick=(k,on,lock,tip)=>lock?'':`<button class="stage-tick pb-tick${on?' on':''}" type="button" data-action="pb-skip" data-id="${pid}" data-k="${k}" aria-pressed="${on}" data-tip="${on?'Mégis kell':tip}">${on?'–':''}</button>`;
  const box=(k,title,body,skip,lock,tip)=>`<div class="pb-box bs-box${skip?' skip':''}"><div class="pb-t">${title}</div>${skip?'<span class="statuspill p-mute">Nem kell</span>':body}${k?tick(k,skip,lock,tip):''}</div>`;
  const freeBox=t=>`<div class="pb-box bs-box skip"><div class="pb-t">${t}</div><span class="statuspill p-mute">🎁 Nem fizetős</span></div>`;
  // Szerződés
  const cs=b.contractStatus||'',sent=cs==='kikuldve'||cs==='alairva'||cs==='visszakuldve',signed=cs==='alairva',back=cs==='visszakuldve';
  const cAct=st=>`data-action="bl-cstep" data-id="${pid}"${o.cIds?` data-ids="${esc(o.cIds.join(','))}"`:''} data-st="${st}"`;
  const contract=i.fw?`<div class="cdrop${i.fw.mode==='nemkell'?'':' ctr-ok'}" data-cdrop="${pid}">${box('','Szerződés',fwCell(i.fw,'pb-c')+'<span class="cdrop-hint">📥 Engedd el a feltöltéshez</span>')}</div>`
    :(cs==='nemkell'?'':`<div class="cdrop${signed?' ctr-ok':''}" data-cdrop="${pid}">`)+box('contract','Szerződés',`${bsStep(sent,'Szerződés elküldve','',sent?'':cAct('kikuldve'))}${back?`<div class="bs-back">↩ Visszaküldték módosításra <button class="linkbtn" type="button" ${cAct('kikuldve')}>újra kiküldve</button></div>`:sent&&!signed?`<button class="linkbtn bs-backbtn" type="button" ${cAct('visszakuldve')} title="Az ügyfél módosítást kért">↩ Visszaküldték</button>`:''}${bsStep(signed,'Szerződés aláírva',b.signedAt?fmtMD(b.signedAt):'',signed?'':cAct('alairva'))}
      ${b.contractUrl?`<a class="bl-file" href="${esc(b.contractUrl)}" target="_blank" rel="noopener" title="${esc(b.contractName||'Szerződés')}">📎 ${esc((b.contractName||'Megnyitás').replace(/\.[a-z0-9]{2,4}$/i,'').slice(0,26))}</a>`:''}${b.contractUrl?`<button class="linkbtn bl-up bl-new" type="button" data-action="cdrop-pick" data-id="${pid}" title="Vagy húzd ide a fájlt">⬆️ Új feltöltése</button>`:'<span class="cdrop-tip">📥 Húzd ide a szerződést</span>'}<span class="cdrop-hint">📥 Engedd el a feltöltéshez</span>`,cs==='nemkell',signed||!!b.contractUrl,'Nem kell szerződés?')+(cs==='nemkell'?'':'</div>');
  // TIG
  const tg=tigList().filter(t=>tigPids(t).includes(p.id)).pop()||null,appr=!!tg&&(tg.status==='jovahagyva'||tg.status==='szamlazva'),r=pr(p);
  const tigNeed=!!tg||b.tigMode==='kell'||(b.tigMode!=='nemkell'&&tigList().some(t=>String(t.client||'').trim().toLowerCase()===String(p.client||'').trim().toLowerCase()));
  const tig=box('tig','TIG',tg?`${bsStep(true,'TIG kiállítva',[tg.createdAt?fmtMD(String(tg.createdAt).slice(0,10)):'',tg.url?`<a class="linkbtn" href="${esc(tg.url)}" target="_blank" rel="noopener">📄 PDF</a>`:''].filter(Boolean).join(' · '))}${tg.sentAt?bsStep(true,'TIG elküldve',fmtMD(String(tg.sentAt).slice(0,10))):appr?'':bsStep(false,`TIG elküldése <button class="linkbtn" type="button" data-action="tig-mail" data-id="${esc(tg.id)}">✉️ Küldés</button>`,'')}${bsStep(appr,appr?'TIG jóváhagyva':'TIG jóváhagyásra vár',appr&&tg.approvedAt?fmtMD(tg.approvedAt):'',tg.status==='szamlazva'?'':`data-action="${appr?'tig-unapprove':'tig-approve'}" data-id="${esc(tg.id)}"`)}${tg.status==='szamlazva'&&tg.invoiceNo?`<div class="bs-x">Számlázva: ${esc(tg.invoiceNo)}</div>`:''}${tigReplyHtml(tg)}`
    :`<button class="btn outline small bl-add" type="button" data-action="tig-new" data-client="${esc(p.client||'')}" data-month="${r?r.start.slice(0,7):''}">📝 TIG kiállítása</button>`,!tigNeed,!!tg,'Nem kell TIG?');
  if(i.free)return {contract,tig,adv:freeBox('Díjbekérő'),fin:freeBox('Végszámla')};
  // Díjbekérő
  const dx=i.db||i.el,advPaid=!!((i.db&&invPaidOk(i.db))||(i.el&&invPaidOk(i.el))),skipA=b.mode==='egyben'||!!i.advSkip,started=!!(pr(p)&&pr(p).start<=todayISO());
  const elFirst=!!(i.el&&i.db&&invPaidOk(i.el));   /* kifizetés után a foglalószámla a hivatalos bizonylat: az kerül előre, a díjbekérő csak halvány hivatkozás */
  const adv=box('adv',`${elFirst||(i.el&&!i.db)?'Foglalószámla':'Díjbekérő'}${!skipA&&val?(dx?` <span class="muted" title="A díjbekérő már ki van állítva – a foglaló %-a nem módosítható">${num(b.advancePct)}% · ${ftFmt(num(dx.invNet)||Math.round(val*num(b.advancePct)/100))}</span>`:` <span class="pb-pct"><input class="pb-pct-in" type="text" inputmode="numeric" maxlength="3" value="${num(b.advancePct)}" data-advpct="${pid}" aria-label="Foglaló %">%</span> <span class="muted">· ${ftFmt(Math.round(val*num(b.advancePct)/100))}</span>`):''}`,
    !dx?billAddBtn(p.id,'dijbekero','Díjbekérő kiállítása',!i.closed&&i.steps[i.nextI]&&i.steps[i.nextI][0]==='advIssued')
      :elFirst?`${bsSent('Foglalószámla',i.el).replace('Foglalószámla elküldve','Foglalószámla kiállítva')}${bsPaidStep(i.el)}${i.db.manual&&i.db.createdBy==='számlázz.hu'?`<div class="bs-x bs-ref" title="Az app előtt kiállított díjbekérő – csak a belőle készült számla érhető el (fent)">díjbekérő: ${esc(i.db.no)}${i.db.date?' ('+fmtMD(i.db.date)+')':''}</div>`:`<div class="bs-x bs-ref bs-ref-on">díjbekérő: <button class="bl-no" type="button" data-action="sz-inv-db" data-id="${esc(i.db.id)}">${esc(i.db.no)}</button>${i.db.date?' ('+fmtMD(i.db.date)+')':''}</div>`}`
      :`${bsSent(i.db?'Díjbekérő':'Foglalószámla',i.db||i.el)}${bsPaidStep(i.el&&invPaidOk(i.el)?i.el:i.db||i.el)}${bsOpts(i.el&&invPaidOk(i.el)?i.el:i.db&&!i.el?i.db:i.el||i.db,(S.fin&&S.fin.invoices)||[])}${i.el&&i.db?`<div class="bs-x">Foglalószámla: <button class="bl-no" type="button" data-action="sz-inv" data-id="${esc(i.el.id)}">${esc(i.el.no)}</button></div>`:''}${i.db&&invPaidOk(i.db)&&!i.el&&!i.db.ref?`<button class="linkbtn" type="button" data-action="bill-inv" data-id="${pid}" data-type="eloleg">+ Foglalószámla</button>`:''}`,skipA,!!dx,'Nem kell díjbekérő?');
  // Végszámla
  const finT=skipA||(i.el&&i.el.advType==='szamla')?'Számla':'Végszámla',fx=i.fin,grp=o.group&&o.group.length>1?o.group:null;
  // végszámla = végső érték (szerződött + extrák) − a ténylegesen kiszámlázott foglaló (ennek hiányában a foglaló %-a a szerződött összegből)
  const advNet=i.el?num(i.el.invNet):i.db?num(i.db.invNet):0,finDue=grp?grp.reduce((s,x)=>s+projTotal(x.p),0):skipA?tot:Math.max(0,tot-(dx?advNet:Math.round(val*num(b.advancePct)/100)));
  const finCalc=!skipA&&!fx&&tot&&(ex||dx)?`<div class="bs-x">${extrasOf(p).length?exBreak(p).replace('szerződött ',''):ftFmt(tot)} − foglaló ${ftFmt(dx?advNet:Math.round(val*num(b.advancePct)/100))}</div>`:'';
  const fin=i.full&&!fx?`<div class="pb-box bs-box skip"><div class="pb-t">Végszámla</div><span class="statuspill p-mute">Nem kell – 100% foglaló</span></div>`
    :box('fin',`${finT}${fx?(()=>{const n=i.finAll.reduce((a,x)=>a+num(x.invNet),0),d=Math.round(n-finDue);return ` <span class="muted">· ${ftFmt(n)}</span>${tot&&Math.abs(d)>1?` <span class="bs-mis" data-tip="${esc('A kiállított számla nettó összege ('+ftFmt(n)+') eltér a projekt értékétől ('+ftFmt(finDue)+'). Ellenőrizd, jó projekthez tartozik-e a számla, vagy javítsd a projekt értékét.')}">⚠ projekt: ${ftFmt(finDue)}</span>`:''}`;})():tot&&!i.noFin?` <span class="muted">· ${ftFmt(finDue)}</span>`:''}`,
      fx?`${i.finAll.map((x,k)=>{const body=`${bsSent(k&&!o.finAllG?'Újabb számla':finT,x)}${bsPaidStep(x)}${bsOpts(x)}`;
        if(!o.finAllG)return `${k?'<div class="bs-sep"></div>':''}${body}`;const pn=invPids(x).map(id=>(projById(id)||{}).name).filter(Boolean).join(' + ');
        return `<div class="bs-sub${invPaidOk(x)?' paid':''}"><div class="bs-subh"><span>${esc(pn||'')}</span><b>${ftFmt(num(x.invNet))}</b></div>${body}</div>`;}).join('')}`:`${finCalc}${tigNeed&&!appr?`<div class="bs-x warn-txt">⏳ ${tg?'A TIG jóváhagyása után':'A TIG kiállítása és jóváhagyása után'} állítható ki.</div>`:tg&&tg.status==='jovahagyva'?`<button class="btn primary small bl-add" type="button" data-action="tig-invoice" data-id="${esc(tg.id)}" title="A jóváhagyott TIG tételeivel (az összes érintett projekt)">+ ${finT} kiállítása a TIG alapján</button>`:!skipA&&!dx&&!grp?(started?billAddBtn(p.id,'szamla',`Számla díjbekérő nélkül (${ftFmt(tot)})`,true):`<div class="bs-x muted">A rendezvény napjától díjbekérő helyett rögtön számla is kiállítható.</div>`):o.noAdd?'':billAddBtn(p.id,skipA?'szamla':'vegszamla',finT+(grp?` kiállítása (${grp.length} projekt)`:' kiállítása'),projDone(p)&&(skipA||!!dx),grp?grp.map(x=>x.p.id):null)}`,i.noFin&&!fx,!!fx,`Nem kell ${finT.toLowerCase()}?`);
  const multiFin=fx&&!o.finAllG&&i.finAll.length>1?i.finAll.map((x,k)=>{const cls=invState(x)==='late'?' bs-late':invPaidOk(x)?' bs-green':' bs-wait';   // több számla egy projekten: mindegyik külön kártyán
    return `<div class="pb-box bs-box${cls}"><div class="pb-t">${k?'Újabb számla':finT} <span class="muted">· ${ftFmt(num(x.invNet))}</span></div>${bsSent(finT,x)}${bsPaidStep(x)}${bsOpts(x)}</div>`;}).join(''):'';
  const late=(h,x)=>x&&invState(x)==='late'?h.replace('class="pb-box bs-box','class="pb-box bs-box bs-late'):h;   // lejárt, kifizetetlen bizonylat: piros kártya
  const paid=(h,ok)=>ok?h.replace('class="pb-box bs-box','class="pb-box bs-box bs-paid'):h,green=(h,ok)=>ok?h.replace('class="pb-box bs-box','class="pb-box bs-box bs-green'):h;   // kifizetett számla: zöld kártya   // kifizetve: szürke kártya (a linkek kattinthatók maradnak)
  const wait=(h,on)=>on&&!/bs-late|bs-green|bs-paid/.test(h.slice(0,120))?h.replace('class="pb-box bs-box','class="pb-box bs-box bs-wait'):h;   // kiállítva, kifizetésre vár: sárga kártya
  const cDone=!!i.fw||signed;   // aláírt szerződés / keretszerződés: szürke kártya
  const red=(h,on)=>on?h.replace('class="pb-box bs-box','class="pb-box bs-box bs-late'):h;   // letelt a hónap, és még nincs kész: piros kártya
  const tigOver=monthOver&&tigNeed&&!appr,finOver=monthOver&&!fx&&!i.noFin&&!i.full&&!i.free&&tot>0;
  return {contract:paid(contract,cDone),tig:paid(red(tig,tigOver),appr),adv:wait(paid(late(adv,i.db&&!invPaidOk(i.db)&&!i.el?i.db:null),advPaid),!!i.db&&!advPaid&&!invPaidOk(i.db)),fin:(o.moreNew?(h=>h+`<button class="bl-more-card" type="button" data-action="bill-inv" data-id="${esc(o.moreNew.pid)}" data-type="${o.moreNew.type}" title="${esc(o.moreNew.name)}">＋ ${o.moreNew.label} kiállítása</button>`):fx&&o.moreBtn!==false?(h=>h+`<button class="bl-more-card" type="button" data-action="bill-inv" data-id="${pid}" data-type="szamla" title="Ha az ügyfél utólag újabb terméket rendel ugyanerre a projektre">＋ Újabb számla</button>`):(h=>h))(multiFin||wait(red(green(late(fin,(i.finAll||[]).find(x=>invState(x)==='late')||fx),!!fx&&i.finAll.every(invPaidOk)),finOver),!!fx&&!i.finAll.every(invPaidOk)))};}
ACT['bl-cstep']=async btn=>{const st=btn.dataset.st;if(!S.fin||!S.fin.billing)return;const arr=S.fin.billing;
  const pids=(btn.dataset.ids?btn.dataset.ids.split(','):[btn.dataset.id]).filter(Boolean);   // összevont cella: a megrendelő összes projektjére
  const undo=[];pids.forEach(pid=>{let b=arr.find(x=>x.projectId===pid);if(!b){b=Object.assign({},billOf(pid));arr.push(b);}
    const prev=Object.assign({},b),patch={contractStatus:st};if(st==='alairva'&&!b.signedAt)patch.signedAt=todayISO();if(st!=='alairva')patch.signedAt='';Object.assign(b,patch);undo.push({pid,b,prev,patch});});render(true);
  try{let d=null;for(const u of undo)d=await call('billSave',Object.assign({projectId:u.pid},u.patch));if(d&&d.billing)S.fin.billing=d.billing;render(true);}catch(e){undo.forEach(u=>Object.assign(u.b,u.prev));render(true);handleErr(e);}};

function tigRepliesLoad(force){if(!billOn()||(S._tigRep&&!force)||S._tigRepBusy)return;if(!tigList().some(t=>t.status==='kikuldve'))return;S._tigRepBusy=1;
  call('tigReplies',{}).then(r=>{S._tigRep=r||{};S._tigRepBusy=0;if(Object.keys(S._tigRep).length&&(S.tab==='szerzodes'||S.projectId))render(true);}).catch(()=>{S._tigRepBusy=0;S._tigRep={};});}
const tigReplyHtml=t=>{const r=S._tigRep&&S._tigRep[t.id];if(!r||t.status!=='kikuldve')return '';
  return `<div class="tig-reply${r.approve?' ok':''}" data-tip="${esc(r.from+' · '+r.at+'\n'+r.text)}">📩 <b>Válasz érkezett</b> <span class="muted">${esc(r.from)} · ${esc(String(r.at).slice(5,10).replace('-','.'))}.</span><div class="tig-rq">„${esc(r.text.slice(0,140))}${r.text.length>140?'…':''}”</div>${r.approve?`<button class="btn primary small" type="button" data-action="tig-approve" data-id="${esc(t.id)}">✓ Jóváhagyottnak jelölöm</button>`:''}</div>`;};
function viewBilling(){
  setTimeout(()=>tigRepliesLoad(),0);
  if(typeof szIdxEnsure==='function')setTimeout(szIdxEnsure,0);   // a számlajegyzék előtöltése a háttérben (gyors cégnév-kereséshez)
  if(!billOn())return `<div class="panel">${empty('Ez a fül a háttérkód frissítése után érhető el.')}</div>`;
  if(!S.fin)return finLoadingView();
  if(!S.fin.billing)return `<div class="panel">${empty('A Szerződés és számlázás a legújabb háttérkód (Code.gs) bemásolása és új verzióként való telepítése után érhető el.')}</div>`;
  const f=S.blf||(S.blf={v:'honap',q:''}),q=f.q.trim().toLowerCase();
  const all=S.projects.filter(p=>p.status!=='lemondva'&&pr(p)).map(billInfo);
  const curM=f.m||todayISO().slice(0,7);
  const sets={honap:all.filter(i=>pr(i.p).start.slice(0,7)===curM),teendo:all.filter(i=>!i.closed),kint:all.filter(i=>i.openSum>0),lejart:all.filter(i=>i.late.length),kiall:all.filter(i=>i.todo),szerzodes:all.filter(i=>i.noContract&&!i.closed),lezart:all.filter(i=>i.closed),mind:all};
  const labels=[['honap','📅 '+F_YM.format(toDate(curM+'-01'))],['teendo','Nyitott'],['kiall','Kiállítandó díjbekérő / végszámla'],['szerzodes','Szerződés hiányzik'],['kint','Kintlévő'],['lejart','Lejárt'],['lezart','Lezárt'],['mind','Mind']];
  let list=sets[f.v]||all;if(q)list=list.filter(i=>fold([i.p.name,i.p.client,...i.inv.map(x=>x.no)].join(' ')).includes(fold(q)));
  list.sort((a,b)=>String(pr(b.p).start).localeCompare(String(pr(a.p).start)));
  const months=[];list.forEach(i=>{const m=pr(i.p).start.slice(0,7);let g=months.find(x=>x.m===m);if(!g)months.push(g={m,arr:[]});g.arr.push(i);});
  const cols=6,openSum=Math.round(all.reduce((s,i)=>s+i.openNet,0)),lateSum=Math.round(all.reduce((s,i)=>s+i.lateNet,0)),todo=all.filter(i=>i.todo).length,noC=sets.szerzodes.length;
  const mRev=sets.honap.reduce((s,i)=>s+projTotal(i.p),0),mPaid=sets.honap.reduce((s,i)=>s+i.inv.filter(x=>x.kind!=='storno'&&!(x.kind==='dijbekero'&&(x.ref||i.el))).reduce((a,x)=>a+num(x.invPaid)*invShare(x,i.p.id)*invNetR(x),0),0);   // a kiválasztott hónap bevétele és befolyt összege
  const sz=S.fin.sz||{},nCl=l=>new Set(l.map(i=>String(i.p.client||'').trim().toLowerCase()||i.p.id)).size;   // ügyfelek száma
  return `<div class="page-head bill-head"><div class="grow"><h2>Szerződés és számlázás</h2>${monthNav('bill-month',[...new Set(all.map(i=>pr(i.p).start.slice(0,7)).concat([todayISO().slice(0,7)]))].sort().reverse(),curM)}</div>
      ${sz.hasKey?`<button class="btn outline small" type="button" data-action="sz-sync"${S._szSyncing?' disabled':''} title="${S._szSyncing?'Lekérdezés a számlázz.hu-ból…':esc(sz.lastSync?'Utoljára: '+sz.lastSync:'')}">${S._szSyncing?'<span class="spin sm"></span> Kifizetések…':'🔄<span class="bh-lg2"> Kifizetések</span>'}</button>`:''}
      <button class="btn outline small" type="button" data-action="tig-new">📝 TIG<span class="bh-lg"> kiállítása</span></button><button class="btn outline small" type="button" data-action="sz-settings">🧾<span class="bh-lg"> Számlázás beállításai</span></button></div>
    ${sz.hasKey?'':`<div class="banner"><p>A számlák kiállításához és a kifizetések követéséhez add meg a számlázz.hu Agent-kulcsot a <b>Számlázás beállításai</b> gombbal.</p></div>`}
    <div class="tiles fin-tiles">
      <div class="tile-search"><input class="inp search" id="q-bill" type="search" placeholder="🔍 Projekt, ügyfél, számlaszám…" value="${esc(f.q)}" aria-label="Keresés">${f.v!=='honap'?`<button class="linkbtn" type="button" data-action="blf" data-v="honap">✕ ${esc((labels.find(x=>x[0]===f.v)||[,''])[1])} szűrő törlése</button>`:''}</div>
      <button class="tile tile-btn" type="button" data-action="blf" data-v="honap"><div class="tile-n">${ftFmt(mRev)}</div><div class="tile-l">${esc(F_YM.format(toDate(curM+'-01')).replace(/^\d{4}\.\s*/,''))} havi bevétel</div></button>
      <button class="tile tile-btn" type="button" data-action="blf" data-v="kint"><div class="tile-n">${ftFmt(openSum)}</div><div class="tile-l">kintlévőség</div></button>
      <button class="tile tile-btn${lateSum?' bad':''}" type="button" data-action="blf" data-v="lejart"><div class="tile-n">${ftFmt(lateSum)}</div><div class="tile-l">lejárt</div></button>
    </div>
    ${list.length?`<div class="sheet-wrap"><table class="sheet bill-tbl"><thead><tr><th class="n">Nap</th><th>Projekt</th><th>Szerződés</th><th>Díjbekérő</th><th>TIG</th><th>Végszámla</th></tr></thead>
      <tbody>${months.map(g=>`<tr class="pt-month bill-month"><td colspan="${cols}"><span class="bm-name">${esc(F_YM.format(toDate(g.m+'-01')))}</span> <span class="muted">· ${g.arr.length} projekt</span></td></tr>${billMonthRows(g.arr)}`).join('')}</tbody></table></div>
      <p class="hint">Díjbekérő → (kifizetés után foglalószámla) → végszámla, amelyből a számlázz.hu levonja a foglalót. A kifizetéseket a számlázz.hu értesítése alapján az app magától jelöli. Projektenként „Egy számla” konstrukció is választható (✏️).</p>`
      :`<div class="panel">${empty(all.length?'Nincs a szűrésnek megfelelő projekt.':'Még nincs dátummal rendelkező projekt.')}</div>`}
    `;
}
/* ===== Teljesítésigazolások: kiküldve → jóváhagyva → számla a TIG alapján (közös számla az összes tételre) ===== */
const TIG_ST={kiallitva:['Elküldésre vár','p-warn'],kikuldve:['Jóváhagyásra vár','p-warn'],jovahagyva:['Jóváhagyva','p-info'],szamlazva:['Számlázva','p-ok']};
function tigPanel(){const all=tigList().slice().sort((a,b)=>String(b.month).localeCompare(String(a.month))||String(b.createdAt).localeCompare(String(a.createdAt)));
  const open=all.filter(t=>t.status!=='szamlazva'),done=all.filter(t=>t.status==='szamlazva').slice(0,12);
  const row=t=>{const st=TIG_ST[t.status]||TIG_ST.kikuldve,ps=tigPids(t),inv=t.invoiceNo?((S.fin.invoices||[]).find(x=>x.no===t.invoiceNo)):null;
    let rows=[];try{rows=JSON.parse(t.rows||'[]');}catch(e){}
    return `<tr><td><b>${esc(t.client)}</b><div class="bl-meta">${esc(F_YM.format(toDate(t.month+'-01')))} · ${rows.length} tétel${ps.length?` · ${ps.length} projekt`:''}</div></td>
      <td class="r"><b>${ftFmt(num(t.total))}</b></td>
      <td><span class="statuspill ${st[1]}">${st[0]}${t.approvedAt&&t.status==='jovahagyva'?' '+fmtMD(t.approvedAt):''}</span>${inv?invLine(inv):t.invoiceNo?`<div class="bl-meta">${esc(t.invoiceNo)}</div>`:''}</td>
      <td><div class="tig-act">${t.url?`<a class="linkbtn" href="${esc(t.url)}" target="_blank" rel="noopener">📄 PDF</a>`:''}
        ${t.status==='kikuldve'?`<button class="btn outline small" type="button" data-action="tig-approve" data-id="${esc(t.id)}">✓ Jóváhagyták</button>`:''}
        ${t.status==='jovahagyva'?`<button class="btn primary small" type="button" data-action="tig-invoice" data-id="${esc(t.id)}">🧾 Számla a TIG alapján</button><button class="linkbtn" type="button" data-action="tig-unapprove" data-id="${esc(t.id)}">visszavonás</button>`:''}
        ${t.status!=='szamlazva'?`<button class="trash" type="button" data-action="tig-del" data-id="${esc(t.id)}" aria-label="TIG törlése" title="Törlés a listából (a PDF megmarad)">🗑️</button>`:''}</div></td></tr>`;};
  return `<details class="panel fold tig-panel" data-fold="tig"${FOLD.tig!==false?' open':''}><summary><h3>📝 Teljesítésigazolások <span class="aside">${open.length?open.length+' nyitott':all.length?'mind számlázva':'nincs'}</span></h3></summary>
    ${all.length?`<div class="sheet-wrap"><table class="sheet fin-tbl tig-tbl"><thead><tr><th>Ügyfél · hónap</th><th class="r">Összesen (nettó)</th><th>Állapot</th><th></th></tr></thead><tbody>${open.map(row).join('')}${done.length?`<tr class="pt-month"><td colspan="4"><span class="muted">Számlázva</span></td></tr>${done.map(row).join('')}`:''}</tbody></table></div>`
      :`<p class="hint" style="margin:0">Még nincs rögzített TIG. A hónap végén a <b>TIG kiállítása</b> gombbal összegyűjtheted az ügyfél havi projektjeit; ha jóváhagyták, innen egy számlát állíthatsz ki az összes tételre.</p>`}
    <p class="hint" style="margin:8px 0 0">TIG → ügyfél jóváhagyja → számla a TIG tételeivel. A számla mindegyik projekthez hozzárendelődik, így a kifizetés mindenhol megjelenik.</p><div class="btns" style="margin-top:10px"><button class="btn outline small" type="button" data-action="tig-new">+ TIG kiállítása</button></div></details>`;}
function tigInvoice(id){const t=tigList().find(x=>x.id===id);if(!t)return;let rows=[];try{rows=JSON.parse(t.rows||'[]');}catch(e){}
  let ps=tigPids(t).filter(projById);if(!ps.length)ps=tigProjects(t.client,t.month).map(p=>p.id);
  if(!ps.length){toast('A TIG-hez nem tartozik projekt az appban – a számlát a projektnél vagy a számlázz.hu-ban állítsd ki, majd rendeld hozzá.',true);return;}
  const [y,m]=t.month.split('-').map(Number),last=new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);
  szInvoiceModal('project',ps[0],{type:'szamla',tigId:t.id,projectIds:ps.slice(1),fulfill:last,
    items:rows.map(r=>({name:(String(r.task||'').replace(/\s+/g,' ').trim()+(r.period?' – '+r.period:'')).slice(0,300),qty:1,price:num(r.amount),pid:r.pid||''}))});}
async function tigAct(b,action){if(b)b.disabled=true;try{const d=await call('tigSave',{id:b.dataset.id,action});finApply(d);toast(action==='approve'?'TIG jóváhagyva – kiállíthatod a számlát.':action==='send'?'TIG elküldve – jóváhagyásra vár.':action==='unsend'?'TIG: elküldés visszavonva.':action==='delete'?'TIG törölve a listából.':'Jóváhagyás visszavonva.');}catch(e){handleErr(e);if(b)b.disabled=false;}}
/* TIG küldése e-mailben: címzett a megrendelő képviselője (és a kapcsolattartó), szöveg szerkeszthető, a PDF csatolva */
const TIG_MAIL_DEF={subject:'Teljesítésigazolás – Lumos Motion Kft. – {honap}',text:'Kedves {nev}!\n\nMellékelten küldöm a {honap} havi teljesítésigazolást ({ugyfel}). Kérlek, nézd át, és ha minden rendben, jelezz vissza, hogy jóváhagyjátok – ezután állítjuk ki a számlát.\n\nKöszönöm!'};
const tigTpl=(s,v)=>String(s||'').replace(/\{(nev|ugyfel|honap|osszeg|tetelek)\}/g,(m,k)=>v[k]??m);
const clTigMail=c=>{try{const o=typeof c.tigMail==='string'?JSON.parse(c.tigMail||'null'):c.tigMail;return o&&typeof o==='object'?o:null;}catch(e){return null;}};
/* TIG küldése e-mailben: a sablon ügyfelenként személyre szabható ({nev}, {ugyfel}, {honap}, {osszeg}, {tetelek}), a PDF csatolva */
function tigMailModal(id){const t=tigList().find(x=>x.id===id);if(!t){toast('A TIG még nem töltődött be – frissíts.',true);return;}
  const n=s=>String(s||'').trim().toLowerCase(),c=(S.clients||[]).find(x=>n(x.name)===n(t.client))||{},own=clTigMail(c),def=(S.fin.settings&&S.fin.settings.tigMail)||TIG_MAIL_DEF;
  const MN=['január','február','március','április','május','június','július','augusztus','szeptember','október','november','december'];let rows=[];try{rows=JSON.parse(t.rows||'[]');}catch(e){}
  const v={nev:huFirst((c.rep||c.contactName||''))||'Partnerünk',ugyfel:t.client,honap:t.month?t.month.slice(0,4)+'. '+MN[Number(t.month.slice(5,7))-1]:'',osszeg:ftFmt(num(t.total))+' + ÁFA',tetelek:rows.map(r=>'• '+r.task+(r.period?' ('+r.period+')':'')).join('\n')};
  const tpl=own||def,to=own&&own.to?own.to:[c.repEmail,c.contactEmail].filter(Boolean).filter((x,i,l)=>l.indexOf(x)===i).join(', ');
  openModal('TIG küldése e-mailben',`<div class="fields">${mf('mto','Címzett',{full:true,v:to,ph:'nev@ceg.hu',max:300})}${mf('mcc','Másolat (nem kötelező)',{full:true,v:own&&own.cc||'',max:300})}${mf('msubj','Tárgy',{full:true,v:tigTpl(tpl.subject,v),max:200})}
    <div class="field full"><label for="m-mtext">Üzenet</label><textarea class="inp" id="m-mtext" name="mtext" rows="8" maxlength="5000">${esc(tigTpl(tpl.text,v))}</textarea></div>
    <div class="field full tm-save"><label><input type="checkbox" name="saveCl"> Mentés sablonként <b>${esc(t.client)}</b> ügyfélhez (címzettek, másolat, szöveg)</label><label><input type="checkbox" name="saveDef"> Mentés alapsablonként minden ügyfélhez</label>
      <small class="hint" style="margin:2px 0 0">${own?'✓ Ennek az ügyfélnek saját sablonja van. ':''}A sablonban a nevek helyett helyőrzők kerülnek mentésre: {nev}, {ugyfel}, {honap}, {osszeg}, {tetelek}.</small></div></div>
    <p class="hint" style="margin:0">📎 Csatolva: <b>${esc(t.fileName||'TIG.pdf')}</b> · Az aláírásod a levél aljára kerül.</p>`,
    {submitLabel:'Küldés',submit:async fd=>{const a={id,to:String(fd.get('mto')||'').trim(),cc:String(fd.get('mcc')||'').trim(),subject:String(fd.get('msubj')||'').trim(),text:String(fd.get('mtext')||'')};
      if(!a.to){toast('Add meg a címzettet.',true);return;}
      // a konkrét értékeket visszaírjuk helyőrzőkre, hogy a sablon más hónapra / más ügyfélre is jó legyen
      const back=s=>{let o=String(s);[['tetelek',v.tetelek],['osszeg',v.osszeg],['honap',v.honap],['ugyfel',v.ugyfel],['nev',v.nev]].forEach(([k,val])=>{if(val&&String(val).length>2)o=o.split(val).join('{'+k+'}');});return o;};
      try{const d=await call('tigSend',a);closeModal();finApply(d);toast('TIG elküldve: '+a.to);
        if(fd.get('saveCl')&&c.id)saveClientRec(Object.assign({},c,{oldName:'',tigMail:{to:a.to,cc:a.cc,subject:back(a.subject),text:back(a.text)}})).then(()=>toast('Sablon mentve: '+t.client)).catch(handleErr);
        if(fd.get('saveDef'))call('finSettings',{tigMail:{subject:back(a.subject),text:back(a.text)}}).then(r=>{finApply(r);toast('Alapsablon mentve');}).catch(handleErr);}
      catch(e){handleErr(e);}}});}
Object.assign(ACT,{'tig-mail':b=>tigMailModal(b.dataset.id),'tig-send':b=>tigAct(b,b.dataset.st),'tig-approve':b=>tigAct(b,'approve'),'tig-unapprove':b=>tigAct(b,'unapprove'),'tig-invoice':b=>tigInvoice(b.dataset.id),
  'tig-del':b=>openModal('TIG törlése a listából?','<p style="margin:0">A PDF a Drive-ban megmarad, csak a nyilvántartásból kerül ki.</p>',{submitLabel:'Törlés',submit:async()=>{closeModal();await tigAct(b,'delete');}})});

/* Projekt szerződés- és számlázási beállításai + szerződés feltöltése */
function billModal(pid,focus){const p=projById(pid);if(!p)return;const b=billOf(pid),fw=fwFor(p),fwAny=fwOfClient(p.client);
  openModal('Szerződés és számlázás – '+(p.name||''),`<div class="fields">
    ${fw&&fw.mode==='nemkell'?`<div class="field full fw-note">🚫 <b>${esc(p.client)}</b> nem igényel szerződést – ennél a projektnél sem kérjük. <button class="linkbtn" type="button" data-action="fw-edit" data-id="${esc(fw.id)}">Módosítás</button></div>`:fw?`<div class="field full fw-note">🤝 <b>${esc(p.client)}</b> céggel keretszerződés van${fw.validTo?' (érvényes: '+esc(fw.validTo)+')':''} – ennél a projektnél nem kell külön szerződés. ${fw.url?`<a href="${esc(fw.url)}" target="_blank" rel="noopener">Megnyitás</a> · `:''}<button class="linkbtn" type="button" data-action="fw-edit" data-id="${esc(fw.id)}">Keretszerződés szerkesztése</button>
      <small class="hint" style="margin:4px 0 0">Ha mégis külön szerződés kell ehhez a projekthez, állítsd be lent az állapotát.</small></div>`:fwAny?`<div class="field full fw-note warn">⚠️ ${esc(p.client)} keretszerződése ${esc(fwAny.validTo)}-ig volt érvényes, ez a projekt utána van. <button class="linkbtn" type="button" data-action="fw-edit" data-id="${esc(fwAny.id)}">Meghosszabbítás</button></div>`:''}
    ${ms('contractStatus','Szerződés állapota',Object.entries(CONTRACT_LABEL).map(([k,l])=>[k,k===''&&fw?'Keretszerződés alapján':l]),b.contractStatus||'')}
    ${mf('signedAt','Aláírás dátuma',{type:'date',v:b.signedAt||''})}
    <div class="field full"><label for="m-cfile">Szerződés feltöltése (PDF, kép, Word – max. 10 MB)</label>
      <input class="inp" id="m-cfile" name="cfile" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic">
      <small class="hint" style="margin:4px 0 0">${b.contractUrl?`Jelenleg: <a href="${esc(b.contractUrl)}" target="_blank" rel="noopener">${esc(b.contractName||b.contractUrl)}</a>${b.contractAt?' · '+esc(b.contractAt.slice(0,10)):''} – új fájllal lecseréled. <button class="linkbtn" type="button" data-action="bill-clear" data-id="${esc(pid)}">Leválasztás</button>`:'A projekt Drive-mappájába kerül (ha még nincs, létrehozzuk).'}</small></div>
    ${mf('contractUrl','…vagy szerződés linkje (pl. Drive, aláíró szolgáltatás)',{full:true,v:b.contractFileId?'':(b.contractUrl||''),ph:'https://…',max:500})}
    ${p.client&&!fw?`<div class="field full"><label class="bl-nocontract fw-chk"><input type="checkbox" name="asFw" id="m-asFw"> Ez keretszerződés – <b>${esc(p.client)}</b> további projektjeinél sem kérünk külön szerződést</label>
      <div class="fw-extra" hidden><div class="fields" style="margin-top:8px">${mf('fwValidTo','Érvényes eddig (üresen: határozatlan)',{type:'date'})}</div></div></div>`:''}
    ${ms('mode','Fizetési konstrukció',[['eloleg','Foglaló + végszámla'],['egyben','Egy számla (foglaló nélkül)']],b.mode||'eloleg')}
    ${(()=>{const ii=billInfo(p);return ii.db||ii.el?`<div class="field"><label>Foglaló (%)</label><div class="inp ro-inp" title="A díjbekérő / foglalószámla már ki van állítva – a foglaló nem módosítható">${num(b.advancePct)}% 🔒</div><input type="hidden" name="advancePct" value="${num(b.advancePct)}"></div>`:mf('advancePct','Foglaló (%)',{v:b.advancePct??50,im:'numeric'});})()}
    <div class="field full"><label for="m-note">Megjegyzés (fizetési feltétel, kapcsolattartó a pénzügyön stb.)</label><textarea class="inp" id="m-note" name="note" rows="2" maxlength="1000">${esc(b.note||'')}</textarea></div>
  </div>`,{submitLabel:'Mentés',submit:async fd=>{
    const file=($('m-cfile')||{}).files&&$('m-cfile').files[0];
    const d={projectId:pid,contractStatus:fd.get('contractStatus'),signedAt:fd.get('signedAt')||'',mode:fd.get('mode'),advancePct:Number(fd.get('advancePct')),note:String(fd.get('note')||'').trim()};
    const url=String(fd.get('contractUrl')||'').trim();if(!file&&!b.contractFileId)d.contractUrl=url;else if(!file&&url)d.contractUrl=url;
    if(!(d.advancePct>=0&&d.advancePct<=100)){toast('A foglaló 0 és 100% között legyen.',true);return;}
    if(file&&file.size>10*1024*1024){toast('A fájl legfeljebb 10 MB lehet.',true);return;}
    const btn=document.querySelector('#mform button[type=submit]');if(btn){btn.disabled=true;btn.textContent=file?'Feltöltés…':'Mentés…';}
    const asFw=!!fd.get('asFw');
    try{
      if(asFw){   // keretszerződés: az ügyfélhez kerül, a projekt állapota „keretszerződés alapján” (üres) marad
        if(!file&&!url){toast('Töltsd fel a keretszerződést vagy add meg a linkjét.',true);if(btn){btn.disabled=false;btn.textContent='Mentés';}return;}
        const f={client:p.client,signedAt:d.signedAt,validTo:fd.get('fwValidTo')||''};
        if(file){f.b64=await readB64(file);f.name=file.name;f.mime=file.type||'application/octet-stream';}else f.url=url;
        await call('fwSave',f);d.contractStatus='';delete d.contractUrl;
        const r=await call('billSave',d);closeModal();finApply(r);toast('Keretszerződés rögzítve: '+p.client);return;}
      if(file){const b64=await readB64(file);
        await call('billUpload',{projectId:pid,name:file.name,mime:file.type||'application/octet-stream',b64,contractStatus:d.contractStatus||'alairva'});
        if(!d.contractStatus)d.contractStatus='alairva';}
      const r=await call('billSave',d);closeModal();finApply(r);toast(file?'Szerződés feltöltve':'Mentve');}
    catch(e){handleErr(e);if(btn){btn.disabled=false;btn.textContent='Mentés';}}}});
  if(focus==='file'){const f=$('m-cfile');if(f)setTimeout(()=>f.click(),50);}}

Object.assign(ACT,{
  'blf':b=>{const f=S.blf||(S.blf={v:'honap',q:''});f.v=f.v===b.dataset.v?'honap':b.dataset.v;render(true);},   // a csempe ki-be kapcsolja a szűrőt
  'blf-m':b=>{const f=S.blf||(S.blf={v:'honap',q:''});f.m=shiftMonth(f.m||todayISO().slice(0,7),Number(b.dataset.d));f.v='honap';render(true);},
  'bill-edit':b=>billModal(b.dataset.id,b.dataset.focus),
  'bill-inv':b=>{if(!S.fin.sz||!S.fin.sz.hasKey){szSettingsModal('Az Agent-kulcs megadása után tudsz bizonylatot kiállítani.');return;}
    const ids=(b.dataset.ids||'').split(',').filter(id=>id&&projById(id)).sort((x,y)=>String((pr(projById(x))||{}).start).localeCompare(String((pr(projById(y))||{}).start)));   // időrendben   // összevont kártya: egy közös számla, projektenként egy tétellel
    if(ids.length>1){szInvoiceModal('project',ids[0],{type:b.dataset.type,projectIds:ids.slice(1),items:ids.map(id=>{const p=projById(id);return {name:szItemName(p),qty:1,price:projTotal(p),pid:id};})});return;}
    szInvoiceModal('project',b.dataset.id,{type:b.dataset.type});},
  'bill-clear':b=>{const id=b.dataset.id;closeModal();confirmModal('Szerződés leválasztása','A fájl a Drive-ban megmarad, csak a projektről kerül le a hivatkozás.','Leválasztás',()=>finCall('billSave',{projectId:id,clearFile:true},'Leválasztva'));}
});
document.addEventListener('input',e=>{if(e.target.id==='q-bill'){(S.blf||(S.blf={v:'honap',q:''})).q=e.target.value;const pos=e.target.selectionStart;render(true);const n=$('q-bill');if(n){n.focus();try{n.setSelectionRange(pos,pos);}catch(x){}}}});

/* Projekt oldalán (csak ügyvezető): az aktuális projekt szerződése és számlázása */
/* A szerződés- és számlázási kártyák (projektoldal és a Szerződés és számlázás táblázat közös elemei) */
function billBoxes(p){
  const i=billInfo(p),b=i.b,pid=esc(p.id),val=num(p.projectValue);
  const skipC=b.contractStatus==='nemkell'&&!i.fw,skipA=b.mode==='egyben',skipF=i.noFin;
  const tick=(k,on,lock,tip)=>lock?'':`<button class="stage-tick pb-tick${on?' on':''}" type="button" data-action="pb-skip" data-id="${pid}" data-k="${k}" aria-pressed="${on}" data-tip="${on?'Mégis kell':tip}">${on?'✓':''}</button>`;
  const box=(k,title,body,on,lock,tip)=>`<div class="pb-box${on?' skip':''}"><div class="pb-t">${title}</div>${on?'<span class="statuspill p-mute">Nem kell</span>':body}${tick(k,on,lock,tip)}</div>`;
  const contract=i.fw?fwCell(i.fw,'pb-c'):`<div class="pb-c"><span class="statuspill ${CONTRACT_CLS[b.contractStatus||'']}">${CONTRACT_LABEL[b.contractStatus||'']}</span>
    ${b.contractUrl?`<a class="bl-file" href="${esc(b.contractUrl)}" target="_blank" rel="noopener">📎 ${esc(b.contractName||'Szerződés megnyitása')}</a>`:''}${b.contractUrl?'':'<span class="cdrop-tip">📥 Húzd ide a szerződést</span>'}<span class="cdrop-hint">📥 Engedd el a feltöltéshez</span>
    ${b.signedAt?`<span class="bl-meta">aláírva: ${esc(b.signedAt)}</span>`:''}</div>`;
  const adv=(i.db||i.el)?invLine(i.db)+(i.el?invLine(i.el,'Foglaló:'):(i.db&&invPaidOk(i.db)&&!i.db.ref?`<button class="linkbtn" type="button" data-action="bill-inv" data-id="${pid}" data-type="eloleg">+ Foglalószámla</button>`:''))
    :billAddBtn(p.id,'dijbekero','Díjbekérő',!i.closed&&i.steps[i.nextI]&&i.steps[i.nextI][0]==='advIssued');
  const fin=i.fin?i.finAll.map(x=>invLine(x)).join('')+`<button class="linkbtn bl-more" type="button" data-action="bill-inv" data-id="${pid}" data-type="szamla">+ Újabb számla</button>`:billAddBtn(p.id,b.mode==='egyben'?'szamla':'vegszamla',b.mode==='egyben'?'Számla':'Végszámla',projDone(p)&&(b.mode==='egyben'||!!(i.db||i.el)));
  const dots=`<div class="bl-dots">${i.steps.map((s,k)=>`<span class="bl-dot${s[2]?' on':''}${k===i.nextI?' cur':''}" title="${esc(s[1])}${s[2]?' ✓':''}"></span>`).join('')}</div>`;
  return {i,b,contract:`${skipC?'':`<div class="cdrop" data-cdrop="${pid}">`}${box('contract','Szerződés',i.fw?contract+'<span class="cdrop-hint">📥 Engedd el a feltöltéshez</span>':contract,skipC,!!i.fw||b.contractStatus==='alairva'||!!b.contractUrl,'Nem kell szerződés?')}${skipC?'':'</div>'}`,adv:`${i.free?`<div class="pb-box skip"><div class="pb-t">Díjbekérő / foglaló</div><span class="statuspill p-mute">🎁 Nem fizetős projekt</span></div><div class="pb-box skip"><div class="pb-t">Végszámla</div><span class="statuspill p-mute">🎁 Nem fizetős projekt</span></div>`:`${box('adv',`Díjbekérő / foglaló${!skipA&&val?` <span class="pb-pct"><input class="pb-pct-in" type="text" inputmode="numeric" maxlength="3" value="${num(b.advancePct)}" data-advpct="${pid}" aria-label="Foglaló %">%</span> <span class="muted">· ${ftFmt(Math.round(val*num(b.advancePct)/100))}</span>`:''}`,adv,skipA,!!(i.db||i.el),'Nem kell díjbekérő?')}
${i.full&&!i.fin?`<div class="pb-box skip"><div class="pb-t">Végszámla</div><span class="statuspill p-mute">Nem kell – 100% foglaló</span></div>`:box('fin',`${skipA?'Számla':'Végszámla'}${val&&!skipF?(skipA?` <span class="muted">${ftFmt(val)} nettó</span>`:` <span class="muted">${100-num(b.advancePct)}% · ${ftFmt(Math.round(val*(100-num(b.advancePct))/100))} nettó</span>`):''}`,fin,skipF,!!i.fin,skipA?'Nem kell számla?':'Nem kell végszámla?')}`}`,state:`<div class="pb-box"><div class="pb-t">Állapot</div>${dots}<span class="statuspill ${i.nextCls}">${esc(i.next)}</span>${i.openSum?`<div class="bl-meta">kintlévő: <b>${ftFmt(i.openSum)}</b>${i.lateSum?` · <span class="bad-txt">lejárt: ${ftFmt(i.lateSum)}</span>`:''}</div>`:''}</div>`};
}
function projBillingPanel(p){
  if(!billOn()||!p||!p.id||!projById(p.id))return '';
  const wrap=inner=>`<details class="panel fold billing-fold" id="proj-bill" data-fold="billing"${FOLD.billing!==false?' open':''}>${inner}</details>`;
  if(!S.fin){if(!S.finErr)finLoad();return wrap(`<summary><h3>📄 Szerződés és számlázás <span class="aside">${S.finErr?'nem sikerült betölteni':'betöltés…'}</span></h3></summary>${S.finErr?`<div class="btns"><button class="btn outline small" type="button" data-action="fin-retry">Újrapróbálás</button></div>`:'<div class="loading"><span class="spin"></span>Betöltés…</div>'}`);}
  if(!S.fin.billing)return wrap(`<summary><h3>📄 Szerződés és számlázás</h3></summary><p class="hint">A legújabb háttérkód (Code.gs) telepítése után érhető el.</p>`);
  const B=billBoxes(p),i=B.i,b=B.b;
  return wrap(`<summary><h3>📄 Szerződés és számlázás <span class="aside"><span class="statuspill ${i.nextCls}">${esc(i.next)}</span></span></h3></summary>
    <div class="pb-grid">${(()=>{const C=billCells(p,i);return C.contract+C.adv+C.tig+`<div class="pb-stack">${C.fin}</div>`;})()}
    </div>${b.note?`<div class="pb-foot"><span class="bl-meta">📝 ${esc(b.note)}</span></div>`:''}`);
}

/* „Nincs szerződés” pipa: a projekthez nem kérünk szerződést (kivéve, ha visszaveszed a pipát) */
document.addEventListener('change',async e=>{const t=e.target;if(!t.dataset||!t.dataset.nocontract||!S.fin||!S.fin.billing)return;
  const pid=t.dataset.nocontract,st=t.checked?'nemkell':'',arr=S.fin.billing;let b=arr.find(x=>x.projectId===pid);const prev=b?b.contractStatus:'';
  if(!b){b=Object.assign({},billOf(pid));arr.push(b);}b.contractStatus=st;render(true);   // azonnal látszik, a mentés a háttérben fut
  try{const d=await call('billSave',{projectId:pid,contractStatus:st});if(d&&d.billing){S.fin.billing=d.billing;render(true);}toast(st?'Ehhez a projekthez nem kell szerződés':'Szerződés kérve');}
  catch(err){b.contractStatus=prev;render(true);handleErr(err);}});

/* ===== Keretszerződések ===== */
const fwNorm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
const fwOfClient=c=>c?((S.fin&&S.fin.frameworks)||[]).find(f=>fwNorm(f.client)===fwNorm(c))||null:null;
/* üres sor (pl. a „Nem kell” pipa ki-be kapcsolása után): se szerződés, se „nem igényel” – nem számít keretszerződésnek */
const fwReal=f=>!!f&&(f.mode==='nemkell'||!!f.url||!!f.fileId);
function fwFor(p){const f=fwOfClient(p&&p.client);if(!fwReal(f))return null;const r=pr(p);return !f.validTo||!r||f.validTo>=r.start?f:null;}
const readB64=file=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]||'');r.onerror=()=>no(new Error('A fájl nem olvasható.'));r.readAsDataURL(file);});
const fwCell=(f,cls)=>f.mode==='nemkell'?`<div class="${cls}"><span class="statuspill p-mute" title="Az ügyfél nem igényel szerződést">🚫 Nem igényel szerződést</span></div>`:`<div class="${cls}">${f.url?`<a class="statuspill p-ok fw-link" href="${esc(f.url)}" target="_blank" rel="noopener" title="${esc(f.fileName||'Keretszerződés megnyitása')}">🤝 Keretszerződés ↗</a>`:`<span class="statuspill p-ok" title="Keretszerződés az ügyféllel">🤝 Keretszerződés</span>`}${f.validTo?`<span class="bl-meta">érvényes: ${esc(f.validTo)}</span>`:''}</div>`;
function fwPanel(){const list=((S.fin&&S.fin.frameworks)||[]).slice().sort((a,b)=>a.client.localeCompare(b.client,'hu'));const T=todayISO();
  return `<details class="panel fold" data-fold="fw"${FOLD.fw?' open':''}><summary><h3>🤝 Keretszerződések <span class="aside">${list.length?list.length+' ügyfél':'nincs'}</span></h3></summary>
    ${list.length?`<div class="sheet-wrap"><table class="sheet fin-tbl"><thead><tr><th>Ügyfél</th><th>Szerződés</th><th>Aláírva</th><th>Érvényes eddig</th><th>Projektek</th><th></th></tr></thead><tbody>${list.map(f=>{const n=S.projects.filter(p=>p.status!=='lemondva'&&fwFor(p)===f).length,exp=f.validTo&&f.validTo<T;
      return `<tr><td><b>${esc(f.client)}</b>${f.note?`<div class="bl-meta">${esc(f.note)}</div>`:''}</td><td>${f.mode==='nemkell'?'<span class="statuspill p-mute">🚫 Nem igényel szerződést</span>':f.url?`<a class="bl-file" href="${esc(f.url)}" target="_blank" rel="noopener">📎 ${esc(f.fileName||'Megnyitás')}</a>`:'<span class="muted">—</span>'}</td><td>${esc(f.signedAt||'—')}</td><td>${f.validTo?`<span class="${exp?'bad-txt':''}">${esc(f.validTo)}${exp?' (lejárt)':''}</span>`:'határozatlan'}</td><td>${n}</td>
        <td class="nowrap"><button class="editbtn" type="button" data-action="fw-edit" data-id="${esc(f.id)}" aria-label="Módosítás">✏️</button><button class="trash" type="button" data-action="fw-del" data-id="${esc(f.id)}" aria-label="Törlés">🗑️</button></td></tr>`;}).join('')}</tbody></table></div>`:'<p class="hint" style="margin:8px 0 0">Ha egy ügyféllel keretszerződés van, az ügyfél projektjeinél nem kell külön szerződés.</p>'}
    <div class="btns" style="margin-top:10px"><button class="btn outline small" type="button" data-action="fw-new">+ Keretszerződés</button></div></details>`;}
function fwModal(f){const v=f||{},isNew=!v.id,nk=v.mode==='nemkell',names=[...new Set([...(S.clients||[]).map(c=>c.name),...S.projects.map(p=>p.client)].filter(Boolean))].sort((a,b)=>a.localeCompare(b,'hu'));
  openModal(!isNew?'Szerződés – '+v.client:v.client?'Szerződés – '+v.client:'Új keretszerződés',`<div class="fields">
    <div class="field full"><label for="m-fwClient">Ügyfél</label><input class="inp" id="m-fwClient" name="client" list="fw-clients" value="${esc(v.client||'')}" maxlength="160" autocomplete="off"${!isNew?' readonly':''}><datalist id="fw-clients">${names.map(n=>`<option value="${esc(n)}">`).join('')}</datalist></div>
    <div class="field full"><label class="bl-nocontract fw-chk"><input type="checkbox" id="m-fwNone" name="fwNone"${nk?' checked':''}> Ez az ügyfél nem igényel szerződést – a projektjeinél nem kérjük</label></div>
    <div class="fw-files fields field full"${nk?' hidden':''}><div class="field full"><label for="m-fwFile">Keretszerződés feltöltése (max. 10 MB)</label><input class="inp" id="m-fwFile" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic">
      ${v.url?`<small class="hint" style="margin:4px 0 0">Jelenleg: <a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.fileName||v.url)}</a> – új fájllal lecseréled.</small>`:''}</div>
    ${mf('fwUrl','…vagy link',{full:true,v:v.fileId?'':(v.url||''),ph:'https://…',max:500})}
    ${mf('fwSigned','Aláírás dátuma',{type:'date',v:v.signedAt||''})}${mf('fwValid','Érvényes eddig (üresen: határozatlan)',{type:'date',v:v.validTo||''})}
    </div>${mf('fwNote','Megjegyzés',{full:true,v:v.note||'',max:500})}</div>`,{submitLabel:'Mentés',submit:async fd=>{
    const client=String(fd.get('client')||'').trim(),file=($('m-fwFile')||{}).files&&$('m-fwFile').files[0],url=String(fd.get('fwUrl')||'').trim();
    if(client.length<2){toast('Add meg az ügyfelet.',true);return;}if(file&&file.size>10*1024*1024){toast('A fájl legfeljebb 10 MB lehet.',true);return;}
    const none=!!($('m-fwNone')||{}).checked;const a={id:v.id||'',client,mode:none?'nemkell':'',signedAt:fd.get('fwSigned')||'',validTo:fd.get('fwValid')||'',note:String(fd.get('fwNote')||'').trim()};
    if(file){a.b64=await readB64(file);a.name=file.name;a.mime=file.type||'application/octet-stream';}else if(!v.fileId||url)a.url=url;
    const btn=document.querySelector('#mform button[type=submit]');if(btn){btn.disabled=true;btn.textContent='Mentés…';}
    try{const d=await call('fwSave',a);closeModal();if(a.b64){S.clDocs=null;S._clDocsForce=true;S._clDocsLoading=false;}finApply(d);toast((none?'Nem igényel szerződést: ':'Szerződés mentve: ')+client);}catch(e){handleErr(e);if(btn){btn.disabled=false;btn.textContent='Mentés';}}}});}
Object.assign(ACT,{
  'fw-new':()=>fwModal(null),
  'cl-folder':async b=>{const w=window.open('about:blank','_blank');   // azonnal nyitjuk (különben a böngésző letiltja), a mappa linkje utána érkezik
    try{const r=await call('clientFolder',{client:b.dataset.client});if(w)w.location.href=r.url;else location.href=r.url;}catch(e){if(w)w.close();handleErr(e);}},
  'cl-docs':b=>clDocsModal(b.dataset.client),
  'fw-client':b=>{const f=fwOfClient(b.dataset.client);closeModal();fwModal(f||{client:b.dataset.client});},
  'fw-edit':b=>{const f=((S.fin&&S.fin.frameworks)||[]).find(x=>x.id===b.dataset.id);if(f){closeModal();fwModal(f);}},
  'fw-del':b=>{const id=b.dataset.id,f=((S.fin&&S.fin.frameworks)||[]).find(x=>x.id===id);confirmModal('Keretszerződés törlése',`${f?f.client+': ':''}a projektjeinél újra kérni fogjuk a szerződést. A Drive-fájl megmarad.`,'Törlés',()=>finCall('fwDelete',{id},'Törölve'));}
});
document.addEventListener('change',e=>{if(e.target.id==='m-fwNone'){const x=document.querySelector('.fw-files');if(x)x.hidden=e.target.checked;}if(e.target.id==='m-asFw'){const x=document.querySelector('.fw-extra');if(x)x.hidden=!e.target.checked;}});

/* Ügyfelek fül: „Nem kell szerződés” pipa – azonnal látszik, a mentés a háttérben fut */
document.addEventListener('change',async e=>{const t=e.target;if(!t.dataset||t.dataset.clnone===undefined||!S.fin)return;
  const client=t.dataset.clnone,on=t.checked,list=S.fin.frameworks=(S.fin.frameworks||[]).slice();let f=fwOfClient(client);const prev=f?Object.assign({},f):null;
  if(f){Object.assign(f,{mode:on?'nemkell':''});}else{f={id:'',client,mode:on?'nemkell':'',url:''};list.push(f);}render(true);
  try{const d=await call('fwSave',{id:f.id||'',client,mode:on?'nemkell':''});finApply(d);toast(on?client+': nem kell szerződés':client+': szerződés kérve');}
  catch(err){if(prev)Object.assign(f,prev);else list.splice(list.indexOf(f),1);render(true);handleErr(err);}});

/* Projektoldal: a kártyák pipája = „nem kell” (szerződés / díjbekérő / végszámla) – azonnal látszik, a mentés a háttérben fut */
ACT['pb-skip']=async btn=>{const pid=btn.dataset.id,k=btn.dataset.k,on=btn.getAttribute('aria-pressed')!=='true';if(!S.fin||!S.fin.billing)return;
  const arr=S.fin.billing;let b=arr.find(x=>x.projectId===pid);if(!b){b=Object.assign({},billOf(pid));arr.push(b);}const prev=Object.assign({},b);
  const patch=k==='contract'?{contractStatus:on?'nemkell':''}:k==='adv'?{mode:on?'egyben':'eloleg'}:k==='tig'?{tigMode:on?'nemkell':'kell'}:{noFinal:on?'1':''};
  Object.assign(b,patch);const repaint=()=>setTimeout(()=>{const p=S.draft&&S.draft.id===pid?S.draft:projById(pid);const el=$('proj-bill');if(el&&el.isConnected&&p){try{el.outerHTML=projBillingPanel(p)||'';}catch(e){render(true);}}else render(true);},0);repaint();
  try{const d=await call('billSave',Object.assign({projectId:pid},k==='fin'?{noFinal:on}:patch));if(d&&d.billing)S.fin.billing=d.billing;repaint();}
  catch(e){Object.assign(b,prev);repaint();handleErr(e);}};

function tigRowsRead(){return [...document.querySelectorAll('#tig-rows .tig-row')].filter(r=>r.querySelector('.tig-on').checked).map(r=>({period:r.querySelector('.tig-per').value.trim(),task:r.querySelector('.tig-task').value.trim(),link:r.querySelector('.tig-link').value.trim(),amount:moneyVal(r.querySelector('.tig-amt').value)||0,pid:r.dataset.pid||''})).filter(r=>r.task);}
async function tigPreview(btn){const f=$('mform');if(!f)return;const fd=new FormData(f),client=String(fd.get('client')||''),rows=tigRowsRead();
  if(!client){toast('Válaszd ki az ügyfelet.',true);return;}if(!rows.length){toast('Legalább egy tétel kell.',true);return;}
  btn.disabled=true;btn.textContent='Előnézet…';
  try{const r=await call('tigCreate',{preview:true,client,month:fd.get('tigMonth'),issuer:fd.get('tigIssuer'),date:fd.get('tigDate'),clientAddress:fd.get('tigAddr'),clientTax:fd.get('tigTax'),clientRep:fd.get('tigRep'),rows});
    const box=$('tig-prev');if(box){box.innerHTML='<div class="tig-prev-h"><b>Előnézet</b> <span class="muted">– így néz ki a PDF; ha minden rendben, „TIG elkészítése”</span></div><iframe class="tig-frame" title="TIG előnézet" sandbox></iframe>';const fr=box.querySelector('iframe');fr.srcdoc=r.html;box.scrollIntoView({block:'nearest',behavior:'smooth'});}}
  catch(e){handleErr(e);}finally{btn.disabled=false;btn.textContent='👁 Előnézet';}}
/* ===== Teljesítésigazolás (TIG): az ügyfél adott havi munkái egy dokumentumban (PDF a Drive-ba, az ügyfél mappájába) ===== */
const TIG_MN=['január','február','március','április','május','június','július','augusztus','szeptember','október','november','december'];
function tigProjects(client,month){const n=s=>String(s||'').trim().toLowerCase();
  return S.projects.filter(p=>p.status!=='lemondva'&&n(p.client)===n(client)&&pr(p)&&pr(p).start.slice(0,7)===month).sort(byStart);}
function tigRowsHtml(client,month){const ps=tigProjects(client,month);
  if(!ps.length)return `<p class="hint">Ebben a hónapban nincs projekt ennél az ügyfélnél.</p>`;
  return ps.map((p,i)=>{const r=pr(p),per=r.start===r.end?`${TIG_MN[Number(r.start.slice(5,7))-1]} ${Number(r.start.slice(8))}.`:`${TIG_MN[Number(r.start.slice(5,7))-1]} ${Number(r.start.slice(8))}–${Number(r.end.slice(8))}.`;
    return tigRow({period:per,task:p.name||'',link:/^https:\/\//i.test(p.deliveryLink||'')?p.deliveryLink:'',amount:projTotal(p),pid:p.id},i);}).join('');}
const tigRow=(r,i)=>`<div class="tig-row"${r.pid?` data-pid="${esc(r.pid)}"`:''}><input type="checkbox" class="tig-on" checked aria-label="Bekerül"><input class="inp tig-per" value="${esc(r.period||'')}" placeholder="pl. október 6." aria-label="Időszak">${r.pid?`<span class="tig-lw"><input class="inp tig-task" value="${esc(r.task||'')}" placeholder="Feladat" aria-label="Feladat"><a class="tig-open" href="${location.pathname}#p=${esc(r.pid)}" target="_blank" rel="noopener" title="Projekt megnyitása új lapon">📂</a></span>`:`<input class="inp tig-task" value="${esc(r.task||'')}" placeholder="Feladat" aria-label="Feladat">`}<span class="tig-lw"><input class="inp tig-link" value="${esc(r.link||'')}" placeholder="Videó linkje (https://…)" aria-label="Link"><a class="tig-open" href="${esc(/^https:\/\//i.test(r.link||'')?r.link:'#')}" target="_blank" rel="noopener" title="Videó megnyitása"${/^https:\/\//i.test(r.link||'')?'':' hidden'}>↗</a></span>${r.pid?`<span class="tig-aw"><input class="inp tig-amt" readonly tabindex="-1" title="A projekt nettó értéke – a projektben módosítható" value="${esc(moneyFmt(r.amount||''))}" inputmode="numeric" data-money="1" placeholder="0" aria-label="Díjazás (nettó Ft)"><span class="tig-afa">Ft + ÁFA</span></span>`:`<span class="tig-aw"><input class="inp tig-amt" value="${esc(moneyFmt(r.amount||''))}" inputmode="numeric" data-money="1" placeholder="0" aria-label="Díjazás (nettó Ft)"><span class="tig-afa">Ft + ÁFA</span></span>`}</div>`;
function tigModal(pre){const prevM=shiftMonth(todayISO().slice(0,7),-1),m0=(pre&&pre.month)||(todayISO().slice(8)<'15'?prevM:todayISO().slice(0,7));
  const names=[...new Set(S.projects.filter(p=>p.client&&p.status!=='lemondva').map(p=>p.client.trim()))].sort((a,b)=>a.localeCompare(b,'hu'));
  const c0=(pre&&pre.client)||'';
  openModal('Teljesítésigazolás (TIG) kiállítása',`<div class="fields">
    <div class="field"><label for="m-tigClient">Ügyfél</label><select class="inp" id="m-tigClient" name="client"><option value="">Válassz…</option>${names.map(n=>`<option${n===c0?' selected':''}>${esc(n)}</option>`).join('')}</select></div>
    <div class="field"><label for="m-tigMonth">Hónap</label><select class="inp" id="m-tigMonth" name="tigMonth">${(()=>{const o=[];let m=shiftMonth(todayISO().slice(0,7),2);for(let k=0;k<26;k++){o.push(m);m=shiftMonth(m,-1);}if(!o.includes(m0))o.push(m0);
      return o.map(x=>`<option value="${x}"${x===m0?' selected':''}>${x.slice(0,4)}. ${TIG_MN[Number(x.slice(5,7))-1]}</option>`).join('');})()}</select></div>
    ${ms('tigIssuer','Szolgáltató',[['kft','Lumos Motion Kft.'],['ev','Egri Ervin E.V.']],'kft')}
    ${mf('tigDate','Kelt',{type:'date',v:todayISO()})}
    <input type="hidden" id="m-tigAddr" name="tigAddr"><input type="hidden" id="m-tigTax" name="tigTax"><input type="hidden" id="m-tigRep" name="tigRep"><div class="field full" id="tig-cl"></div>
    <div class="field full"><label>Tételek <span class="muted">– díjazás: a projekt nettó értéke + ÁFA (a projektben módosítható); a videó linkje a feladat alá kerül</span></label><div id="tig-rows">${c0?tigRowsHtml(c0,m0):'<p class="hint">Válaszd ki az ügyfelet.</p>'}</div>
      <div class="tig-sum" id="tig-sum"></div></div>
  </div><div id="tig-prev"></div><p class="hint" style="margin:0">A PDF az ügyfél Drive-mappájába kerül (Teljesítésigazolások / év), aláírásra kész.</p>`,{left:'<button type="button" class="btn outline" data-action="tig-preview">👁 Előnézet</button>',submitLabel:'TIG elkészítése',submit:async fd=>{
    const client=String(fd.get('client')||''),rows=tigRowsRead();
    if(!client){toast('Válaszd ki az ügyfelet.',true);return;}if(!rows.length){toast('Legalább egy tétel kell.',true);return;}
    const rep=String(fd.get('tigRep')||'').trim();if(rep.length<3){toast('Az ügyfélnél nincs megadva a cég képviselője – pótold az Ügyfelek fülön.',true);return;}
    const btn=document.querySelector('#mform button[type=submit]');if(btn){btn.disabled=true;btn.textContent='Készül…';}
    try{const r=await call('tigCreate',{client,month:fd.get('tigMonth'),issuer:fd.get('tigIssuer'),date:fd.get('tigDate'),clientAddress:fd.get('tigAddr'),clientTax:fd.get('tigTax'),clientRep:fd.get('tigRep'),rows});
      closeModal();S.clDocs=null;S._clDocsForce=true;S._clDocsLoading=false;
      finApply(r);openModal('TIG elkészült',`<p style="margin:0 0 12px"><b>${esc(r.name)}</b> · ${ftFmt(r.total)} + ÁFA</p><div class="btns"><button class="btn primary" type="button" data-action="tig-mail" data-id="${esc(r.tig&&r.tig.id||'')}">✉️ Küldés e-mailben</button><a class="btn outline" href="${esc(r.url)}" target="_blank" rel="noopener">📄 Megnyitás ↗</a></div><p class="hint" style="margin:12px 0 0">Ha az ügyfél jóváhagyta, a <b>Teljesítésigazolások</b> listában jelöld (Szerződés és számlázás fül alja), és onnan egy kattintással kiállíthatod a számlát az összes tételre.</p>`,{cancelLabel:'Bezárás'});}
    catch(e){handleErr(e);if(btn){btn.disabled=false;btn.textContent='TIG elkészítése';}}}});
  setTimeout(()=>{const c=$('m-tigClient'),m=$('m-tigMonth'),box=$('tig-rows');if(c&&c.value&&m&&box&&/^\d{4}-\d{2}$/.test(m.value))box.innerHTML=tigRowsHtml(c.value,m.value);tigFill();},30);}
/* A TIG-en megadott képviselő az ügyfél adataiba is bekerül (ha eltér) */
function tigSaveRep(client,full){const n=s=>String(s||'').trim().toLowerCase(),c=(S.clients||[]).find(x=>n(x.name)===n(client));
  const i=full.indexOf(','),rep=(i<0?full:full.slice(0,i)).trim(),repTitle=i<0?(c&&c.repTitle||''):full.slice(i+1).trim();   // „Név, titulus”
  if(!c||(c.rep===rep&&(c.repTitle||'')===repTitle))return;saveClientRec(Object.assign({},c,{rep,repTitle,oldName:''})).catch(()=>{});}
/* Másik lapon módosított projekt: a TIG-sor neve, összege, linkje frissül */
function tigSyncRows(p){document.querySelectorAll(`#tig-rows .tig-row[data-pid="${CSS.escape(p.id)}"]`).forEach(r=>{const t=r.querySelector('.tig-task'),a=r.querySelector('.tig-amt'),l=r.querySelector('.tig-link');
  if(t)t.value=p.name||'';if(a)a.value=moneyFmt(projTotal(p));if(l&&/^https:\/\//i.test(p.deliveryLink||'')){l.value=p.deliveryLink;l.dispatchEvent(new Event('input',{bubbles:true}));}
  r.classList.add('tig-flash');setTimeout(()=>r.classList.remove('tig-flash'),1200);});tigSum();}
function tigFill(){const c=($('m-tigClient')||{}).value;if(!c)return tigSum();const it=knownClients('').find(x=>x.company===c)||{};
  const a=$('m-tigAddr'),t=$('m-tigTax'),r=$('m-tigRep'),rep=[it.rep,it.repTitle].filter(Boolean).join(', ');if(a)a.value=it.address||'';if(t)t.value=it.tax||'';if(r)r.value=rep;
  const box=$('tig-cl');if(box)box.innerHTML=`<div class="tig-cl"><span>Megrendelő adatai <span class="muted">(az ügyfél adataiból)</span></span><b>${esc(it.address||'⚠️ nincs székhely')} · ${esc(it.tax?'adószám: '+it.tax:'⚠️ nincs adószám')} · ${it.rep?esc('aláíró: '+rep):'<span class="bad-txt">⚠️ nincs megadva a cég képviselője</span>'}</b>${!it.rep||!it.address?`<small class="hint" style="margin:2px 0 0">Pótold az Ügyfelek fülön a cég adatainál, majd nyisd meg újra a TIG-et.</small>`:''}</div>`;tigSum();}
function tigSum(){const el=$('tig-sum');if(!el)return;const s=[...document.querySelectorAll('#tig-rows .tig-row')].filter(r=>r.querySelector('.tig-on').checked).reduce((a,r)=>a+(moneyVal(r.querySelector('.tig-amt').value)||0),0);el.innerHTML=`Díjazás összesen: <b>${ftFmt(s)}</b> + ÁFA`;}
document.addEventListener('change',e=>{const id=e.target.id;if(id==='m-tigClient'||id==='m-tigMonth'){const c=($('m-tigClient')||{}).value,m=($('m-tigMonth')||{}).value,box=$('tig-rows');
    if(id==='m-tigClient'){['m-tigAddr','m-tigTax','m-tigRep'].forEach(k=>{const x=$(k);if(x)x.value='';});}
    if(box&&c&&/^\d{4}-\d{2}$/.test(m))box.innerHTML=tigRowsHtml(c,m);tigFill();}
  if(e.target.classList&&e.target.classList.contains('tig-on'))tigSum();});
document.addEventListener('input',e=>{if(e.target.classList&&e.target.classList.contains('tig-amt'))tigSum();
  if(e.target.classList&&e.target.classList.contains('tig-link')){const a=e.target.parentNode.querySelector('.tig-open'),v=e.target.value.trim(),ok=/^https:\/\/\S+$/i.test(v);if(a){a.hidden=!ok;a.href=ok?v:'#';}}});
Object.assign(ACT,{'tig-new':b=>tigModal(b&&b.dataset&&b.dataset.client?{client:b.dataset.client,month:b.dataset.month||''}:null),
  'tig-preview':b=>tigPreview(b),
  'tig-add':()=>{const box=$('tig-rows');if(!box)return;const p=box.querySelector('p.hint');if(p&&!box.querySelector('.tig-row'))p.remove();box.insertAdjacentHTML('beforeend',tigRow({},0));tigSum();}});

/* Foglaló % közvetlenül a kártyán (ablak nélkül) */
document.addEventListener('change',async e=>{const t=e.target;if(!t.dataset||!t.dataset.advpct||!S.fin||!S.fin.billing)return;
  const pid=t.dataset.advpct,v=Math.max(0,Math.min(100,Math.round(Number(t.value)||0)));{const pp=projById(pid),ii=pp&&billInfo(pp);if(ii&&(ii.db||ii.el)){toast('A díjbekérő már ki van állítva – a foglaló nem módosítható.',true);render(true);return;}}const arr=S.fin.billing;let b=arr.find(x=>x.projectId===pid);if(!b){b=Object.assign({},billOf(pid));arr.push(b);}
  const prev=b.advancePct;b.advancePct=v;const repaint=()=>setTimeout(()=>{const p=S.draft&&S.draft.id===pid?S.draft:projById(pid);const el=$('proj-bill');if(el&&el.isConnected&&p){try{el.outerHTML=projBillingPanel(p)||'';}catch(e){render(true);}}else render(true);},0);repaint();
  try{const d=await call('billSave',{projectId:pid,advancePct:v});if(d&&d.billing)S.fin.billing=d.billing;repaint();toast('Foglaló: '+v+'%');}catch(err){b.advancePct=prev;repaint();handleErr(err);}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset&&e.target.dataset.advpct){e.preventDefault();e.target.blur();}});
document.addEventListener('input',e=>{const t=e.target;if(!t.dataset||!t.dataset.advpct)return;let v=t.value.replace(/\D/g,'').slice(0,3);if(Number(v)>100)v=v.slice(0,2);if(t.value!==v)t.value=v;});   // csak 0–100

/* ===== Régi számlák importálása: a számlázz.hu „csoportos letöltés” ZIP-je (vagy PDF-ek) → javasolt projekt / bevételi sor → jóváhagyás → hozzárendelés =====
   A PDF-eket a böngésző olvassa (pdf.js), a hozzárendelést a szerver a számlázz.hu-tól lekérve hitelesíti (összeg, kifizetés). */
let JSZIPP=null;
const jszipLib=()=>JSZIPP||(JSZIPP=new Promise((ok,no)=>{const sc=document.createElement('script');sc.src='vendor/jszip.min.js';sc.onload=()=>ok(window.JSZip);sc.onerror=()=>{JSZIPP=null;no(new Error('A ZIP-olvasó nem töltődött be.'));};document.head.appendChild(sc);}));
const IMP_STOP=new Set(['kft','zrt','bt','nyrt','kkt','ev','e.v','nonprofit','egyesulet','hungaria','hungary','magyar','video','videó','szolgaltatas','forgatas','es','a','az','the','ltd','gmbh','sztori']);
const impTok=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(w=>w.length>=3&&!IMP_STOP.has(w));
function impName(text,name){const A=impTok(text),B=impTok(name);if(!A.length||!B.length)return 0;
  const m=b=>A.some(a=>{const n=Math.min(a.length,b.length);return n>=4?a.slice(0,n)===b.slice(0,n):a===b;}),hit=B.filter(m).length;
  return hit?Math.max(hit/B.length,m(B[0])?0.6:0):0;}   // az első szó (jellemzően az ügyfél, pl. „Kulcs. Ak.”) egyezése már erős jel
const impDays=(a,b)=>a&&b?Math.abs((toDate(a)-toDate(b))/864e5):999;
/* Lehetséges célok: a projektek és a régi (nem az appból jött) bevételi sorok */
function impTargets(){const T=[];const fromApp=new Set();
  S.projects.filter(p=>p.status!=='lemondva'&&pr(p)).forEach(p=>{T.push({k:'p',id:p.id,label:`${p.name||'Projekt'} · ${p.client||''}`,name:(p.client||'')+' '+(p.name||''),client:p.client||'',date:pr(p).start,amt:projTotal(p),adv:Math.round(num(p.projectValue)*num(billOf(p.id).advancePct||50)/100)});fromApp.add(p.id);});
  ((S.fin&&S.fin.income)||[]).forEach(r=>{if(typeof incProj==='function'&&incProj(r))return;const d=/^\d+/.exec(String(r.day||''));const date=r.month?r.month+'-'+String(d?d[0]:'15').padStart(2,'0'):'';
    if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date))return;T.push({k:'i',id:r.id,label:`${r.name} · ${r.month} (régi bevétel)`,name:r.name||'',client:'',date,amt:num(r.amount),adv:0});});
  return T;}
function impMatch(o,T){const txt=(o.buyer||'')+' '+(o.items||''),d0=o.fulfill||o.date,net=Math.abs(num(o.invNet)),huf=!o.currency||o.currency==='HUF';
  const sc=T.map(t=>{const nm=Math.max(impName(txt,t.name),t.client?impName(o.buyer||'',t.client)*1.1:0),dd=impDays(d0,t.date);
    let am=0;if(huf&&net){if(net===t.amt)am=45;else if(t.adv&&net===t.adv)am=35;else if(t.amt&&Math.abs(net-t.amt)/t.amt<0.02)am=30;}
    const s=nm*50+am*(nm>0?1:0.4)+(dd<=60?25*(1-dd/60):-30);return {t,s,nm,am,dd};}).filter(x=>x.nm>=0.34||(x.am>=35&&x.dd<=20)).sort((a,b)=>b.s-a.s);
  const best=sc[0];let multi=null;
  if(huf&&net){   // összesítő számla több projektre / sorra (pl. Kulcsár havi, két Lurdy-ügyelet egy számlán) (pl. Kulcsár): azonos ügyfél, a teljesítés hónapja / előtte
    const HM=['január','február','március','április','május','június','július','augusztus','szeptember','október','november','december'],mi=HM.findIndex(h=>new RegExp(h,'i').test(o.items||''));
    const mon=mi>=0?(()=>{let y=Number(d0.slice(0,4));if(mi+1>Number(d0.slice(5,7))+1)y--;return y+'-'+String(mi+1).padStart(2,'0');})():'';
    const c=sc.filter(x=>x.nm>=0.5&&x.t.amt>0&&(mon?x.t.date.slice(0,7)===mon:x.dd<=45&&x.t.date<=addDays(d0,3))).slice(0,16).map(x=>x.t);
    const rec=(i,sum,pick)=>{if(sum===net&&pick.length>1)return pick;if(i>=c.length||sum>net||pick.length>=8)return null;return rec(i+1,sum+c[i].amt,[...pick,c[i]])||rec(i+1,sum,pick);};
    let m=rec(0,0,[]);
    if(!m&&mon&&c.length>1){const sum=c.reduce((s,t)=>s+t.amt,0);if(Math.abs(sum-net)/net<=0.05)m=c;}   // a hónap összes tétele, ha az összeg majdnem egyezik (pl. közben módosult egy díj)
    if(m&&m.every(x=>x.k===m[0].k)){const md=Math.max(...m.map(t=>impDays(d0,t.date)));if(!best||best.am<35||md<best.dd)multi=m;}}
  return {cands:sc.slice(0,8),best,multi,conf:multi?80:best?Math.round(best.s):0};}
async function impRead(files){const out=[],pdfs=[];const st=$('imp-st');const say=t=>{if(st)st.textContent=t;};
  for(const f of files){if(/\.zip$/i.test(f.name)){say('ZIP kicsomagolása…');const Z=await jszipLib(),z=await Z.loadAsync(f);for(const n of Object.keys(z.files).filter(n=>/\.pdf$/i.test(n)&&!z.files[n].dir))pdfs.push({name:n.split('/').pop(),buf:()=>z.files[n].async('arraybuffer')});}
    else if(/\.pdf$/i.test(f.name))pdfs.push({name:f.name,buf:()=>f.arrayBuffer()});}
  const lib=await pdfLib(),nw=Math.min(4,Math.max(1,(navigator.hardwareConcurrency||4)-1)),W=Array.from({length:nw},()=>{try{return new lib.PDFWorker();}catch(e){return null;}});
  let n=0,k=0;const one=async w=>{while(k<pdfs.length){const f=pdfs[k++];try{const r=await pdfItems(await f.buf(),w);const o=invParseItems(r.it,r.W);o.file=f.name;if(o.no)out.push(o);}catch(e){}say(`Számlák beolvasása… ${++n} / ${pdfs.length}`);}};
  await Promise.all(W.flatMap(w=>[one(w),one(w)]));W.forEach(w=>{try{w&&w.destroy();}catch(e){}});
  return out;}
function impModal(){if(!S.fin||!S.fin.sz||!S.fin.sz.hasKey){szSettingsModal('Az importhoz előbb add meg a számlázz.hu Agent-kulcsot.');return;}
  openModal('Számlák importálása a számlázz.hu-ból',`<div class="fields"><div class="field full"><label for="m-impf">A számlázz.hu „Csoportos letöltés” ZIP-je (vagy több számla-PDF)</label><input class="inp" id="m-impf" type="file" accept=".zip,.pdf,application/zip,application/pdf" multiple></div></div>
    <p class="hint" style="margin:0">A számlázz.hu-ban: Számlák → jelöld ki az összeset → Műveletek → Csoportos letöltés. Az app minden számlához javasol egy projektet vagy régi bevételi sort; te jóváhagyod, és csak a bepipáltak kerülnek be. A sztornózott számlákat és a sztornókat kihagyja.</p>
    <p class="hint" id="imp-st" style="margin:8px 0 0"></p><div id="imp-list"></div>`,{submitLabel:'Importálás',submit:()=>impRun()});
  const mb=document.querySelector('#mform');if(mb)mb.classList.add('imp-wide');}
document.addEventListener('change',async e=>{if(e.target.id!=='m-impf')return;const files=[...(e.target.files||[])];if(!files.length)return;
  let L;try{L=await impRead(files);}catch(err){toast(errText(err),true);return;}
  const have=new Set(((S.fin&&S.fin.invoices)||[]).map(x=>x.no)),stornoed=new Set(L.filter(o=>o.storno&&o.storno!=='?').map(o=>o.storno));
  // negatív összegű (helyesbítő / sztornó) számla: az azonos vevő korábbi, ugyanekkora számláját is kihagyjuk
  const nrm=s=>impTok(s).join(' ');L.filter(o=>num(o.invNet)<0).forEach(o=>{o.storno=o.storno||'?';if(o.storno!=='?')return;const orig=L.filter(x=>x!==o&&num(x.invNet)===-num(o.invNet)&&nrm(x.buyer)===nrm(o.buyer)&&String(x.date)<=String(o.date)&&!stornoed.has(x.no)&&num(x.invNet)>0).sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0];if(orig)stornoed.add(orig.no);});
  const T=impTargets();S._imp=L.sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(o=>{const skip=o.storno?'sztornó':stornoed.has(o.no)?'sztornózva':have.has(o.no)?'már az appban':o.issuer==='ev'?'E.V. – kézi rögzítéssel':'';
    const m=skip?{cands:[],conf:0}:impMatch(o,T);const sel=m.multi?'m:'+m.multi.map(t=>t.k+':'+t.id).join(','):m.best?m.best.t.k+':'+m.best.t.id:'';
    return Object.assign(o,{skip,m,sel,on:!skip&&!!sel&&m.conf>=60});});
  // egy cél (projekt / bevételi sor) csak egy foglaló- és egy végszámlát kaphat: a legbiztosabb párosítás nyer, a többi a következő szabad jelöltre lép
  const used={},cls=k=>k==='eloleg'||k==='dijbekero'?'a':'f',key=(v,k)=>v+'|'+cls(k);
  S._imp.filter(o=>!o.skip&&o.sel).sort((a,b)=>b.m.conf-a.m.conf).forEach(o=>{const ok=v=>v.replace(/^m:/,'').split(',').every(t=>!used[key(t,o.kind)]);
    if(!ok(o.sel)){const alt=(o.m.cands||[]).map(c=>c.t.k+':'+c.t.id).find(ok);o.sel=alt||'';o.on=false;}
    if(o.sel)o.sel.replace(/^m:/,'').split(',').forEach(t=>used[key(t,o.kind)]=1);});
  impRender();});
function impRender(){const box=$('imp-list');if(!box||!S._imp)return;const L=S._imp,ok=L.filter(o=>!o.skip),on=ok.filter(o=>o.on).length;
  const st=$('imp-st');if(st)st.innerHTML=`<b>${L.length}</b> számla beolvasva · <b>${ok.length}</b> importálható · <b>${on}</b> kijelölve${L.length-ok.length?` · ${L.length-ok.length} kihagyva (sztornó / már bent / E.V.)`:''}`;
  const opt=o=>{const m=o.m,opts=[];if(m.multi)opts.push([`m:${m.multi.map(t=>t.k+':'+t.id).join(',')}`,`🔗 Közös: ${m.multi.map(t=>t.label.split(' · ')[0]).join(' + ')}`]);
    (m.cands||[]).forEach(c=>opts.push([c.t.k+':'+c.t.id,(c.t.k==='p'?'📁 ':'📒 ')+c.t.label+` · ${ftFmt(c.t.amt)}`]));
    return `<select class="inp imp-sel" data-imp="${esc(o.no)}"><option value="">— nincs párosítva —</option>${opts.map(([v,l])=>`<option value="${esc(v)}"${v===o.sel?' selected':''}>${esc(l)}</option>`).join('')}</select>`;};
  box.innerHTML=`<div class="imp-tools"><button class="linkbtn" type="button" data-action="imp-all" data-v="1">Mind ki</button> · <button class="linkbtn" type="button" data-action="imp-all" data-v="0">Egyik sem</button> <label class="imp-show"><input type="checkbox" id="imp-skipshow"${S._impShowSkip?' checked':''}> kihagyottak mutatása</label></div>
    <div class="sheet-wrap imp-wrap"><table class="sheet imp-tbl"><thead><tr><th></th><th>Számla</th><th>Vevő · tétel</th><th class="r">Nettó</th><th>Típus</th><th>Hozzárendelés</th></tr></thead><tbody>
    ${L.filter(o=>!o.skip||S._impShowSkip).map(o=>`<tr${o.skip?' class="imp-skip"':''}><td>${o.skip?'':`<input type="checkbox" data-impon="${esc(o.no)}"${o.on?' checked':''} aria-label="Importálás">`}</td>
      <td><b>${esc(o.no)}</b><div class="bl-meta">${esc((o.date||'').replace(/-/g,'.'))}</div></td><td>${esc(o.buyer||'—')}<div class="bl-meta">${esc((o.items||'').slice(0,70))}</div></td>
      <td class="r">${o.currency&&o.currency!=='HUF'?esc(o.invNet+' '+o.currency):ftFmt(o.invNet||0)}</td>
      <td>${o.skip?'':`<select class="inp imp-kind" data-impk="${esc(o.no)}">${['szamla','eloleg','vegszamla','dijbekero'].map(k=>`<option value="${k}"${k===o.kind?' selected':''}>${SZ_KIND[k]}</option>`).join('')}</select>`}</td>
      <td>${o.skip?`<span class="muted">${esc(o.skip)}</span>`:opt(o)}</td></tr>`).join('')}</tbody></table></div>`;}
document.addEventListener('change',e=>{const t=e.target;if(!S._imp)return;const f=no=>S._imp.find(o=>o.no===no);
  if(t.dataset.impon){const o=f(t.dataset.impon);if(o){o.on=t.checked;impRender();}}
  else if(t.dataset.imp){const o=f(t.dataset.imp);if(o){o.sel=t.value;o.on=!!t.value;impRender();}}
  else if(t.dataset.impk){const o=f(t.dataset.impk);if(o)o.kind=t.value;}
  else if(t.id==='imp-skipshow'){S._impShowSkip=t.checked;impRender();}});
ACT['imp-all']=b=>{(S._imp||[]).forEach(o=>{if(!o.skip)o.on=b.dataset.v==='1'&&!!o.sel;});impRender();};
ACT['imp-open']=()=>impModal();
async function impRun(){const L=(S._imp||[]).filter(o=>o.on&&!o.skip&&o.sel);if(!L.length){toast('Nincs kijelölt, párosított számla.',true);return;}
  const items=L.map(o=>{const parts=o.sel.replace(/^m:/,'').split(','),first=parts[0].split(':'),it={no:o.no,kind:o.kind};
    if(first[0]==='p'){it.projectId=first[1];it.projectIds=parts.slice(1).map(x=>x.split(':')[1]);}else it.incomeId=first[1];return it;});
  const btn=document.querySelector('#mform button[type=submit]');if(btn)btn.disabled=true;let left=items.slice(),linked=0,errs=[];
  try{while(left.length){const st=$('imp-st');if(st)st.innerHTML=`Hozzárendelés a számlázz.hu-tól ellenőrizve… ${items.length-left.length} / ${items.length}`;
      const d=await call('szLinkBatch',{items:left.slice(0,40)});const b=d.batch||{done:[]};linked+=(b.linked||[]).length;errs.push(...(b.errors||[]));
      if(!b.done.length)throw new Error('A szerver nem dolgozott fel egy számlát sem.');left=left.filter(x=>!b.done.includes(x.no));finApply(d);}
    closeModal();S._imp=null;toast(`${linked} számla importálva${errs.length?` · ${errs.length} hiba`:''}`,!!errs.length);
    if(errs.length)openModal('Import – hibák',`<ul class="imp-err">${errs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`,{cancelLabel:'Bezárás'});}
  catch(e){handleErr(e);if(btn)btn.disabled=false;}}

/* Szerződés behúzása a Szerződés kártyára: utána rákérdez, keretszerződés vagy projekt alapú */
const CDROP_OK=/\.(pdf|docx?|jpe?g|png|heic)$/i;
const hasFiles=e=>!!(e.dataTransfer&&[...(e.dataTransfer.types||[])].includes('Files'));
document.addEventListener('dragover',e=>{if(!hasFiles(e))return;const z=e.target.closest&&e.target.closest('[data-cdrop],[data-cldrop]');document.querySelectorAll('.over[data-cdrop],.over[data-cldrop]').forEach(x=>{if(x!==z)x.classList.remove('over');});if(!z)return;e.preventDefault();e.dataTransfer.dropEffect='copy';z.classList.add('over');});
document.addEventListener('dragleave',e=>{const z=e.target.closest&&e.target.closest('[data-cdrop],[data-cldrop]');if(z&&!z.contains(e.relatedTarget))z.classList.remove('over');});
document.addEventListener('drop',e=>{if(!hasFiles(e))return;const z=e.target.closest&&e.target.closest('[data-cdrop],[data-cldrop]');document.querySelectorAll('.over[data-cdrop],.over[data-cldrop]').forEach(x=>x.classList.remove('over'));if(!z)return;e.preventDefault();
  const f=e.dataTransfer.files&&e.dataTransfer.files[0];if(!f)return;
  if(!CDROP_OK.test(f.name)){toast('Szerződésként PDF, Word vagy kép tölthető fel.',true);return;}
  if(f.size>10*1024*1024){toast('A fájl legfeljebb 10 MB lehet.',true);return;}
  if(z.dataset.cldrop!==undefined)clientContractDrop(z.dataset.cldrop,f,z);else contractDropModal(z.dataset.cdrop,f);});
function contractDropModal(pid,file){const p=projById(pid);if(!p)return;const b=billOf(pid);
  openModal('Szerződés feltöltése – '+(p.name||''),`<p class="cd-file">📎 <b>${esc(file.name)}</b> <span class="muted">· ${Math.max(1,Math.round(file.size/1024))} KB</span></p>
    <div class="fields"><div class="field full"><span class="lbl">Milyen szerződés ez?</span><div class="cd-pick">
      <label class="cd-opt"><input type="radio" name="kind" value="projekt" checked><span><b>📄 Projekt alapú</b><small>Csak erre a projektre szól.</small></span></label>
      ${p.client?`<label class="cd-opt"><input type="radio" name="kind" value="keret"><span><b>🤝 Keretszerződés</b><small>${esc(p.client)} további projektjeinél sem kérünk külön szerződést.</small></span></label>`:''}</div></div>
    <div class="field full cd-valid" hidden>${'<label for="m-fwValidTo">Érvényes eddig (üresen: határozatlan)</label><input class="inp" id="m-fwValidTo" name="fwValidTo" type="date">'}</div></div>`,
  {submitLabel:'Feltöltés',submit:async fd=>{const btn=document.querySelector('#mform button[type=submit]');if(btn){btn.disabled=true;btn.textContent='Feltöltés…';}
    try{const b64=await readB64(file);
      if(fd.get('kind')==='keret'){await call('fwSave',{client:p.client,validTo:fd.get('fwValidTo')||'',b64,name:file.name,mime:file.type||'application/octet-stream'});
        const r=await call('billSave',{projectId:pid,contractStatus:''});closeModal();S.clDocs=null;finApply(r);toast('Keretszerződés rögzítve: '+p.client);return;}
      await call('billUpload',{projectId:pid,name:file.name,mime:file.type||'application/octet-stream',b64,contractStatus:'alairva'});
      const r=await call('billSave',{projectId:pid,contractStatus:'alairva'});closeModal();finApply(r);toast('Szerződés feltöltve: '+p.name);}
    catch(err){handleErr(err);if(btn){btn.disabled=false;btn.textContent='Feltöltés';}}}});}
document.addEventListener('change',e=>{if(e.target.name==='kind'&&e.target.closest('.cd-pick')){const v=document.querySelector('.cd-valid');if(v)v.hidden=e.target.value!=='keret';}});

function clientContractChoose(client,file,ex,inl){const back=!inl&&!!document.querySelector('.cl-docs');
  const opt=(d,i)=>`<label class="cd-opt"><input type="radio" name="mode" value="rep:${i}"${i===0?' checked':''}><span><b>🔁 Felülírja: ${esc(docLabel(d))}</b><small>${esc(d.name)}${d.date?' · '+esc(d.date):''} – a régi fájl a Drive kukába kerül</small></span></label>`;
  const html=`<p class="cd-file">📎 <b>${esc(file.name)}</b> <span class="muted">· ${Math.max(1,Math.round(file.size/1024))} KB</span></p>
    <div class="fields"><div class="field full"><span class="lbl">Ennél az ügyfélnél már van szerződés. Mi legyen az újjal?</span><div class="cd-pick">${ex.map(opt).join('')}
      <label class="cd-opt"><input type="radio" name="mode" value="new"><span><b>➕ Új, külön szerződésként</b><small>A meglévő is megmarad (pl. egy másik, vagy még nem mindkét fél által aláírt példány).</small></span></label></div></div>
    <div class="field full cd-newkind" hidden><span class="lbl">Milyen szerződés?</span><div class="cd-pick">
      <label class="cd-opt"><input type="radio" name="nkind" value="keret" checked><span><b>🤝 Keretszerződés</b><small>Ez lesz az ügyfél érvényes keretszerződése.</small></span></label>
      <label class="cd-opt"><input type="radio" name="nkind" value="egyeb"><span><b>📄 Egyéb szerződés</b><small>Csak az ügyfél szerződései közé kerül.</small></span></label></div></div></div>`;
  const run=async(fd,btn,done)=>{if(btn){btn.disabled=true;btn.textContent='Feltöltés…';}
    const m=String(fd.get('mode')||'new'),rd=m.startsWith('rep:')?ex[+m.slice(4)]:null,kind=rd?(rd.kind==='keret'?'keret':'egyeb'):(fd.get('nkind')==='egyeb'?'egyeb':'keret');
    try{const b64=await readB64(file);const d=await call('clientDocUpload',{client,b64,name:file.name,mime:file.type||'application/octet-stream',kind,replace:rd?rd.url:''});
      finApply(d);S.clDocs=d.folders||null;S._clDocsAt=d.at||Date.now();toast(rd?'Szerződés lecserélve: '+client:'Új szerződés feltöltve: '+client);done();}
    catch(err){handleErr(err);if(btn){btn.disabled=false;btn.textContent='Feltöltés';}}};
  if(inl){confirmLayer('Szerződés feltöltése – '+client,`<form class="cf-form">${html}</form>`,'Feltöltés',(bt,layer)=>run(new FormData(layer.querySelector('.cf-form')),null,()=>{layer.remove();const sec=$('cl-docs-sec');if(sec)sec.outerHTML=clientDocsHtml(client);}));return;}   /* az ügyfél adatlapján: rétegként, az adatlap nyitva marad */
  openModal('Szerződés feltöltése – '+client,html,{submitLabel:'Feltöltés',submit:fd=>run(fd,document.querySelector('#mform button[type=submit]'),()=>{closeModal();if(back)clDocsReopen(client);else render(true);})});}
document.addEventListener('change',e=>{if(e.target.name==='mode'&&e.target.closest('.cd-pick')){const k=document.querySelector('.cd-newkind');if(k)k.hidden=e.target.value!=='new';}});

/* Ügyfél szerződése: behúzással egyből feltöltjük (az ügyfél Keretszerződés mappájába) */
async function clientContractDrop(client,file,zone){if(!client)return;
  {const c=knownClients('').find(x=>x.company===client)||{company:client},ps=S.projects.filter(p=>String(p.client||'').trim().toLowerCase()===client.toLowerCase()),ex=(clDocs(c,ps).docs||[]).filter(d=>!d.folder&&d.url);
   if(ex.length&&!(zone&&zone.dataset.inline))return clientContractChoose(client,file,ex,null);
   if(ex.length){/* az adatlapon: kérdés nélkül, új szerződésként (a meglévők megmaradnak, a 🗑️-val törölhetők) */
     if(zone)zone.classList.add('busy');try{const b64=await readB64(file);const d=await call('clientDocUpload',{client,b64,name:file.name,mime:file.type||'application/octet-stream',kind:ex.some(x=>x.kind==='keret')?'egyeb':'keret'});
       finApply(d);S.clDocs=d.folders||S.clDocs;S._clDocsAt=d.at||Date.now();toast('Szerződés feltöltve: '+client);const sec=$('cl-docs-sec');if(sec)sec.outerHTML=clientDocsHtml(client);}
     catch(e){handleErr(e);}finally{if(zone)zone.classList.remove('busy');}return;}}   /* van már szerződés: rákérdezünk, felülírja-e vagy újként kerüljön be */
  if(zone){zone.classList.add('busy');zone.dataset.txt=zone.textContent;}
  try{const b64=await readB64(file);const d=await call('fwSave',{client,b64,name:file.name,mime:file.type||'application/octet-stream'});finApply(d);
    S.clDocs=null;S._clDocsForce=true;S._clDocsLoading=false;toast('Szerződés feltöltve: '+client);
    if(zone&&zone.dataset.inline){S.clDocs=d.folders||S.clDocs;const go=()=>{const sec=$('cl-docs-sec');if(!sec)return;if(S.clDocs)sec.outerHTML=clientDocsHtml(client);else setTimeout(go,500);};clDocsLoad(true);go();}
    else if($('modalRoot').innerHTML&&document.querySelector('.cl-docs')){closeModal();clDocsReopen(client);}else render(true);}
  catch(e){handleErr(e);}finally{if(zone)zone.classList.remove('busy');}}
function clDocsReopen(client){const go=()=>{if(S.clDocs){render(true);clDocsModal(client);}else setTimeout(go,400);};clDir(client);go();}
ACT['cl-doc-pick']=b=>{const z=b.closest('[data-cldrop]'),i=document.createElement('input');i.type='file';i.accept='.pdf,.doc,.docx,.jpg,.jpeg,.png,.heic';
  i.onchange=()=>{const f=i.files&&i.files[0];if(!f)return;if(!CDROP_OK.test(f.name)){toast('Szerződésként PDF, Word vagy kép tölthető fel.',true);return;}if(f.size>10*1024*1024){toast('A fájl legfeljebb 10 MB lehet.',true);return;}clientContractDrop(b.dataset.client,f,z);};i.click();};
ACT['cl-doc-del']=b=>{const url=b.dataset.url,name=b.dataset.name,client=b.dataset.client;
  if(b.dataset.inline){confirmLayer('Szerződés törlése',`<p style="margin:0 0 4px">A(z) „<b>${esc(name)}</b>” fájl a Drive kukájába kerül (30 napig visszaállítható), és lekerül a projektekről, illetve a keretszerződésből.</p>`,'Törlés',(bt,layer)=>{
    /* azonnal eltűnik a listából, a Drive-törlés a háttérben fut */
    layer.remove();const row=b.closest('.cl-doc-row');if(row){row.style.transition='opacity .2s';row.style.opacity='0';setTimeout(()=>row.remove(),200);}
    (S.clDocs||[]).forEach(f=>{if(f.docs)f.docs=f.docs.filter(x=>x.url!==url);});
    call('clientDocDelete',{url,client}).then(d=>{finApply(d);S.clDocs=d.folders||S.clDocs;S._clDocsAt=d.at||Date.now();toast(d.trashed?'Szerződés törölve (Drive kuka)':'Szerződés leválasztva');const sec=$('cl-docs-sec');if(sec)sec.outerHTML=clientDocsHtml(client);})
      .catch(e=>{handleErr(e);clDocsLoad(true);setTimeout(()=>{const sec=$('cl-docs-sec');if(sec&&S.clDocs)sec.outerHTML=clientDocsHtml(client);},2500);});});return;}   /* az ügyfél szerkesztő ablakában: a szerkesztés nem vész el */
  confirmModal('Szerződés törlése',`A(z) „${name}” fájl a Drive kukájába kerül (30 napig visszaállítható), és lekerül a projektekről, illetve a keretszerződésből.`,'Törlés',async()=>{
    try{const d=await call('clientDocDelete',{url,client});finApply(d);S.clDocs=d.folders||[];S._clDocsAt=d.at||Date.now();closeModal();toast(d.trashed?'Szerződés törölve (Drive kuka)':'Szerződés leválasztva');render(true);clDocsModal(client);}
    catch(e){handleErr(e);}});};

ACT['cdrop-pick']=b=>{const pid=b.dataset.id,i=document.createElement('input');i.type='file';i.accept='.pdf,.doc,.docx,.jpg,.jpeg,.png,.heic';
  i.onchange=()=>{const f=i.files&&i.files[0];if(!f)return;if(f.size>10*1024*1024){toast('A fájl legfeljebb 10 MB lehet.',true);return;}contractDropModal(pid,f);};i.click();};
/* Új verzió figyelése: ha közben frissült az app (új telepítés), egy sáv jelzi, egy kattintással betölthető */
(function(){const files=[...document.querySelectorAll('script[src]')].map(x=>x.getAttribute('src')).filter(x=>x&&!/^(https?:)?\/\//.test(x)&&!/^vendor\//.test(x)).concat('index.html');   // az összes saját szkript (a felület több fájlban van)
  let base=null,shown=false;const T0=Date.now()-60000;   // a betöltött változat ideje (≈) – az ennél újabb változások az újak
  async function sig(){const r=await Promise.all(files.map(f=>fetch(f,{method:'HEAD',cache:'no-store'}).then(x=>x.headers.get('etag')||x.headers.get('last-modified')||'').catch(()=>'')));return r.join('|');}
  async function check(){if(shown||document.hidden||location.protocol==='file:')return;try{const s=await sig();if(!s.replace(/\|/g,''))return;if(base===null){base=s;return;}
    if(s!==base){shown=true;const d=document.createElement('div');d.className='upd-bar';d.innerHTML='🔄 Elérhető az app új verziója. <button type="button" class="btn primary small">Frissítés most</button>';
      d.querySelector('button').onclick=()=>{try{if(typeof mdSave==='function')mdSave();}catch(e){}location.reload();};document.body.appendChild(d);
      /* lefelé húzással eltüntethető (mobil) */
      let y0=null,dy=0;d.addEventListener('touchstart',e=>{if(e.target.closest('button'))return;y0=e.touches[0].clientY;dy=0;d.style.transition='none';e.stopPropagation();},{passive:true});
      d.addEventListener('touchmove',e=>{if(y0===null)return;dy=Math.max(0,e.touches[0].clientY-y0);d.style.translate=`0 ${dy}px`;d.style.opacity=String(Math.max(.2,1-dy/120));e.stopPropagation();},{passive:true});
      d.addEventListener('touchend',()=>{if(y0===null)return;y0=null;d.style.transition='translate .2s,opacity .2s';if(dy>40){d.style.translate='0 160%';d.style.opacity='0';setTimeout(()=>d.remove(),220);}else{d.style.translate='';d.style.opacity='';}});
      /* hoverre: mik az újdonságok – csak az ügyvezetőnek, a háttéren keresztül (a lista nem nyilvános) */
      const tipUp=async()=>{if(!S.me||!(S.me.role==='admin'||S.me.realRole==='admin')){d.removeAttribute('data-tip');return;}   /* az újdonságok listáját csak az ügyvezető látja */
        try{const it=(((await call('changesList'))||{}).items||[]).filter(x=>Date.parse(x.at)>T0).slice(0,8);
        d.setAttribute('data-tip',it.length?'Újdonságok:\n'+it.map(x=>'• '+String(x.msg||'').split('\n')[0].slice(0,140)).join('\n'):'Kisebb javítások');d.setAttribute('tabindex','0');}catch(e){}};
      tipUp();d.addEventListener('mouseenter',tipUp);}}catch(e){}}
  setTimeout(check,4000);setInterval(check,180000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});})();

document.addEventListener('change',e=>{if(e.target&&e.target.id==='bill-month'){const f=S.blf||(S.blf={v:'honap',q:''});setMonthAll(e.target.value);f.v='honap';render(true);}});

/* „Az app frissült” értesítés: új verzió első betöltésekor megmutatjuk, mi változott – csak az ügyvezetőnek (a változásnapló nem nyilvános) */
(function(){const K='lpm_seen_ver';
  async function run(){try{if(!S.me){setTimeout(run,1500);return;}if(!(S.me.role==='admin'||S.me.realRole==='admin'))return;const items=(((await call('changesList'))||{}).items)||[];if(!items.length)return;
    let seen=null;try{seen=localStorage.getItem(K);localStorage.setItem(K,items[0].id);}catch(e){return;}
    if(!seen||seen===items[0].id)return;   // első látogatás vagy nincs újdonság
    const i=items.findIndex(x=>x.id===seen),news=(i<0?items.slice(0,6):items.slice(0,i)).slice(0,10),staff=true;
    const d=document.createElement('div');d.className='upd-done';d.setAttribute('role','status');
    d.innerHTML=`<div class="ud-h"><b>✅ Az app frissült</b><button type="button" class="x" aria-label="Bezárás">✕</button></div>`+(staff&&news.length?`<ul>${news.map(x=>`<li>${esc(x.msg)}</li>`).join('')}</ul>`:'<p>Az új változat már be van töltve.</p>');
    d.querySelector('.x').onclick=()=>d.remove();document.body.appendChild(d);setTimeout(()=>{if(d.isConnected&&!d.matches(':hover')){d.classList.add('ud-fade');setTimeout(()=>d.remove(),900);}},40000);}catch(e){}}
  setTimeout(run,1500);})();

/* Sablonból létrehozott projekt: ami a sablonnál nem volt (szerződés, díjbekérő, TIG), az újnál sem kérjük */
async function tplBillCopy(tplId,newPid){try{if(!billOn()||!S.fin||!S.fin.billing||!tplId||!newPid)return;const tp=projById(tplId);if(!tp)return;
  const tb=billOf(tplId),i=billInfo(tp),a={projectId:newPid};
  const hadContract=['kikuldve','alairva','visszakuldve'].includes(tb.contractStatus)||!!tb.contractUrl;
  if(!hadContract&&!fwFor(tp))a.contractStatus='nemkell';
  if(!i.db&&!i.el)a.mode='egyben';else if(tb.advancePct!=null&&tb.advancePct!=='')a.advancePct=num(tb.advancePct);
  if(!tigList().some(t=>tigPids(t).includes(tplId)))a.tigMode='nemkell';
  if(Object.keys(a).length<2)return;const d=await call('billSave',a);if(d&&d.billing){S.fin.billing=d.billing;render(true);}}catch(e){console.warn('Sablon számlázási beállításai:',e);}}
/* Bizonylat-kártya: az üres részére kattintva is megnyílik a bizonylat (díjbekérő, számla PDF) */
document.addEventListener('click',e=>{const box=e.target.closest&&e.target.closest('.bs-box');if(!box||e.target.closest('button,a,input,label,select,textarea,.cmb,.bs-ref'))return;
  const b=box.querySelector('[data-action="sz-inv"]');if(b)b.click();});
