'use strict';
/* ===== Szerződés és számlázás (csak ügyvezető) =====
   Projektenként: szerződés (feltöltés / link / állapot), díjbekérő → foglaló fizetve → végszámla → fizetve.
   A bizonylatok a számlázz.hu-ból jönnek (finance.js: szInvoiceModal, IPN, szSync), az adatok a finData-ban (billing, invoices). */
const CONTRACT_LABEL={'':'Szerződés hiányzik',kikuldve:'Kiküldve, aláírásra vár',alairva:'Aláírva',nemkell:'Nincs szerződés'};
const CONTRACT_CLS={'':'p-bad',kikuldve:'p-warn',alairva:'p-ok',nemkell:'p-mute'};
const billOn=()=>isAdmin()&&!!(S.capabilities&&S.capabilities.finance);
const billOf=pid=>((S.fin&&S.fin.billing)||[]).find(b=>b.projectId===pid)||{projectId:pid,contractStatus:'',mode:'eloleg',advancePct:50,poNumber:'',note:'',contractUrl:'',contractName:''};
const projDone=p=>['leadva','jovahagyas','atadva'].includes(p.status)||(pr(p)&&pr(p).end<todayISO());
const fmtMD=d=>d?d.slice(5).replace('-','.')+'.':'';
/* Egy projekt szerződés- és számlázási állapota */
function billInfo(p){
  const b=billOf(p.id),inv=invFor('project',p.id),last=k=>inv.filter(x=>x.kind===k).pop()||null;
  const db=last('dijbekero'),el=last('eloleg'),fin=b.mode==='egyben'?(last('szamla')||last('vegszamla')):(last('vegszamla')||last('szamla'));
  // a szerződés opcionális: csak akkor lépés, ha van (kiküldve / aláírva); kiküldött szerződésnél az aláírás a következő teendő
  // alapból kell szerződés; ha a „Nincs szerződés” ki van pipálva, kimarad a lépések közül
  const fw=!b.contractStatus?fwFor(p):null;   // keretszerződés az ügyféllel → nem kell külön szerződés
  const contractOk=b.contractStatus==='alairva'||b.contractStatus==='nemkell'||!!fw;
  const cStep=b.contractStatus==='nemkell'||(fw&&fw.mode==='nemkell')?[]:[['contract',fw?'Keretszerződés':'Szerződés aláírva',contractOk]];
  const advIssued=!!(db||el),advPaid=!!((db&&invPaidOk(db))||(el&&invPaidOk(el)));
  const full=b.mode!=='egyben'&&num(b.advancePct)>=100,noFin=(b.noFinal==='1'||full)&&!fin,finSteps=noFin?[]:b.mode==='egyben'?[['finIssued','Számla kiállítva',!!fin],['finPaid','Számla kifizetve',!!(fin&&invPaidOk(fin))]]:[['finIssued','Végszámla kiállítva',!!fin],['finPaid','Végszámla kifizetve',!!(fin&&invPaidOk(fin))]];
  const free=isFree(p)&&!inv.length;   // nem fizetős projekt: nincs díjbekérő és számla
  const steps=free?[...cStep]:b.mode==='egyben'?[...cStep,...finSteps]:[...cStep,['advIssued','Díjbekérő kiállítva',advIssued],['advPaid','Foglaló kifizetve',advPaid],...finSteps];
  const nextI=steps.findIndex(s=>!s[2]),closed=nextI<0;
  const open=inv.filter(x=>!(x.kind==='dijbekero'&&(x.ref||el))&&!invPaidOk(x)),late=open.filter(x=>x.due&&x.due<todayISO());
  const due=x=>Math.max(0,num(x.invGross)-num(x.invPaid))*invShare(x,p.id);
  let next=free?'Nem fizetős':'Lezárva',nextCls=free?'p-mute':'p-ok';
  if(!closed){const k=steps[nextI][0];
    next=k==='contract'?(b.contractStatus==='kikuldve'?'Szerződés aláírásra vár':'Szerződés hiányzik'):k==='advIssued'?'Díjbekérő kiállítása':k==='advPaid'?'Foglalóra vár':k==='finIssued'?(projDone(p)?(b.mode==='egyben'?'Számla kiállítása':'Végszámla kiállítása'):(b.mode==='egyben'?'Számla a projekt után':'Végszámla a projekt után')):'Fizetésre vár';
    nextCls=k==='contract'&&b.contractStatus!=='kikuldve'?'p-bad':(k==='advIssued'||(k==='finIssued'&&projDone(p)))?'p-info':'p-warn';
    const tg=k==='finIssued'?tigOf(p.id):null;if(tg){next=tg.status==='jovahagyva'?'TIG jóváhagyva – számlázható':tg.status==='kiallitva'?'TIG elküldésre vár':'TIG jóváhagyásra vár';nextCls=tg.status==='jovahagyva'?'p-info':'p-warn';}
    if(late.length){next='Lejárt fizetés';nextCls='p-bad';}}
  return {p,b,fw,inv,db,el,fin,noFin,full,free,steps,nextI,closed,next,nextCls,open,late,openSum:open.reduce((s,x)=>s+due(x),0),lateSum:late.reduce((s,x)=>s+due(x),0),todo:!closed&&steps[nextI]&&(steps[nextI][0]==='advIssued'||(steps[nextI][0]==='finIssued'&&projDone(p))),noContract:!contractOk};   // noContract = aláírásra váró szerződés
}
/* A projekt legutóbbi, még nem számlázott TIG-je */
const tigList=()=>((S.fin&&S.fin.tigs)||[]);
const tigPids=t=>String(t.projectIds||'').split(',').filter(Boolean);
const tigOf=pid=>tigList().filter(t=>t.status!=='szamlazva'&&tigPids(t).includes(pid)).pop()||null;
/* A következő kiállítandó bizonylat típusa */
function billNextType(pid){const p=projById(pid);if(!p)return 'szamla';const i=billInfo(p);if(i.b.mode==='egyben')return 'szamla';if(!i.db&&!i.el)return 'dijbekero';if(i.db&&invPaidOk(i.db)&&!i.el&&!i.db.ref)return 'eloleg';return 'vegszamla';}

function invLine(x,label){if(!x)return '';const s=invState(x);
  const st=s==='paid'?`<span class="statuspill p-ok">✅ Fizetve${x.paidAt?' '+fmtMD(x.paidAt):''}</span>`:s==='part'?`<span class="info-txt">Részben: ${ftFmt(num(x.invPaid))}</span>`:s==='late'?`<span class="bad-txt">⚠ Lejárt ${fmtMD(x.due)}</span>`:`<span class="warn-txt">Fizetésre vár${x.due?' · '+fmtMD(x.due):''}</span>`;
  return `<div class="bl-doc"><button class="bl-no" type="button" data-action="sz-inv" data-id="${esc(x.id)}" title="${esc((SZ_KIND[x.kind]||'')+' · bruttó '+ftFmt(num(x.invGross)))}">${label?`<span class="muted">${label}</span> `:''}${esc(x.no)}</button><span class="bl-sub">${ftFmt(num(x.invGross))} · ${st}</span>${invShared(x)?`<span class="bl-shared" title="${esc(invPids(x).map(id=>(projById(id)||{}).name||'?').join(' · '))}">🔗 közös számla · ${invPids(x).length} projekt</span>`:''}</div>`;}
const billAddBtn=(pid,type,label,strong)=>`<button class="btn ${strong?'primary':'outline'} small bl-add" type="button" data-action="bill-inv" data-id="${esc(pid)}" data-type="${type}">+ ${label}</button>`;
function billRow(i){const p=i.p,b=i.b,r=pr(p),val=projTotal(p),ex=extrasSum(p),C=billCells(p,i);
  return `<tr${i.closed?' class="bl-closed"':''}><td class="n">${r?esc(String(Number(r.start.slice(8)))):''}</td><td><button class="linkbtn bl-name" type="button" data-action="open-project" data-id="${esc(p.id)}">${esc(p.name||'Névtelen projekt')}</button>
      <div class="bl-meta">${esc(p.client||'—')}</div><div class="bl-val">${val?ftFmt(val)+' <span class="muted">nettó</span>'+(extrasOf(p).length?`<div class="bl-meta">${exBreak(p)}</div>`:''):isFree(p)?'<span class="muted">🎁 nem fizetős</span>':'<span class="muted">nincs érték megadva</span>'}</div>
      ${i.late.length?`<div class="bl-meta bad-txt">⚠ lejárt: ${ftFmt(i.lateSum)}</div>`:i.openSum?`<div class="bl-meta">kintlévő: ${ftFmt(i.openSum)}</div>`:''}${b.note?`<div class="bl-note" title="${esc(b.note)}">📝 ${esc(b.note.slice(0,60))}${b.note.length>60?'…':''}</div>`:''}</td>
    <td class="bt-cell">${C.contract}</td><td class="bt-cell">${C.adv}</td><td class="bt-cell">${C.tig}</td><td class="bt-cell">${C.fin}</td></tr>`;}
/* A táblázat cellái lépésenként: Szerződés (elküldve, aláírva), TIG (elküldve, jóváhagyva), Díjbekérő (elküldve, fizetve), Végszámla (elküldve, fizetve) */
const bsStep=(on,label,extra,act)=>`<div class="bs-step${on?' on':''}">${act?`<button type="button" class="bs-dot" ${act} aria-pressed="${on}" title="${on?'Visszavonás':'Megtörtént'}">${on?'✓':''}</button>`:`<span class="bs-dot">${on?'✓':''}</span>`}<span class="bs-l"><span>${label}</span>${extra?`<span class="bs-x">${extra}</span>`:''}</span></div>`;
function bsInv(x){if(!x)return '';const s=invState(x);return `<button class="bl-no" type="button" data-action="sz-inv" data-id="${esc(x.id)}">${esc(x.no)}</button> · ${ftFmt(num(x.invGross))}${x.manual?` <span class="muted" title="Kézzel rögzített bizonylat – a kifizetést kézzel kell jelölni">✍️ ${x.issuer==='kft'?'Kft.':'E.V.'}</span>`:''}${invShared(x)?` <span class="bl-shared" title="${esc(invPids(x).map(id=>(projById(id)||{}).name||'?').join(' · '))}">🔗 ${invPids(x).length} projekt</span>`:''}`;}
function bsPaid(x){if(!x)return '';const s=invState(x);return s==='paid'?(x.paidAt?fmtMD(x.paidAt):''):s==='part'?`<span class="info-txt">részben: ${ftFmt(num(x.invPaid))}</span>`:s==='late'?`<span class="bad-txt">lejárt ${fmtMD(x.due)}</span>`:x.due?`határidő ${fmtMD(x.due)}`:'';}
const bsIss=x=>x&&x.manual&&x.issuer==='ev'?'E.V.':'L.M.';
const bsSent=(label,x)=>bsStep(true,label+' elküldve',`${x.date?fmtMD(x.date)+' · ':''}<button class="bl-no" type="button" data-action="sz-inv" data-id="${esc(x.id)}">${esc(x.no)}</button>${invShared(x)?` <span class="bl-shared" title="${esc(invPids(x).map(id=>(projById(id)||{}).name||'?').join(' · '))}">🔗 ${invPids(x).length} projekt</span>`:''}`);
const bsPaidStep=x=>{const ok=invPaidOk(x),st=invState(x),d=x.paidAt||x.date;
  return bsStep(ok,ok?`Kifizetve${d?` <span class="bs-in">${fmtMD(d)}</span>`:''}`:st==='part'?`Részben kifizetve <span class="bs-in">${ftFmt(num(x.invPaid))}</span>`:`Nincs kifizetve${x.due?` <span class="bs-in${st==='late'?' late':''}">· ${st==='late'?'lejárt':'határidő'} ${fmtMD(x.due)}</span>`:''}`);};
function billCells(p,i){i=i||billInfo(p);const b=i.b,pid=esc(p.id),val=num(p.projectValue),tot=projTotal(p),ex=extrasSum(p);
  const tick=(k,on,lock,tip)=>lock?'':`<button class="stage-tick pb-tick${on?' on':''}" type="button" data-action="pb-skip" data-id="${pid}" data-k="${k}" aria-pressed="${on}" data-tip="${on?'Mégis kell':tip}">${on?'–':''}</button>`;
  const box=(k,title,body,skip,lock,tip)=>`<div class="pb-box bs-box${skip?' skip':''}"><div class="pb-t">${title}</div>${skip?'<span class="statuspill p-mute">Nem kell</span>':body}${k?tick(k,skip,lock,tip):''}</div>`;
  const freeBox=t=>`<div class="pb-box bs-box skip"><div class="pb-t">${t}</div><span class="statuspill p-mute">🎁 Nem fizetős</span></div>`;
  // Szerződés
  const cs=b.contractStatus||'',sent=cs==='kikuldve'||cs==='alairva',signed=cs==='alairva';
  const cAct=st=>`data-action="bl-cstep" data-id="${pid}" data-st="${st}"`;
  const contract=i.fw?`<div class="cdrop" data-cdrop="${pid}">${box('','Szerződés',fwCell(i.fw,'pb-c')+'<span class="cdrop-hint">📥 Engedd el a feltöltéshez</span>')}</div>`
    :(cs==='nemkell'?'':`<div class="cdrop" data-cdrop="${pid}">`)+box('contract','Szerződés',`${bsStep(sent,'Szerződés elküldve','',cAct(sent?'':'kikuldve'))}${bsStep(signed,'Szerződés aláírva',b.signedAt?fmtMD(b.signedAt):'',cAct(signed?'kikuldve':'alairva'))}
      ${b.contractUrl?`<a class="bl-file" href="${esc(b.contractUrl)}" target="_blank" rel="noopener" title="${esc(b.contractName||'Szerződés')}">📎 ${esc((b.contractName||'Megnyitás').replace(/\.[a-z0-9]{2,4}$/i,'').slice(0,26))}</a>`:''}${b.contractUrl?'':'<span class="cdrop-tip">📥 Húzd ide a szerződést</span>'}<span class="cdrop-hint">📥 Engedd el a feltöltéshez</span>`,cs==='nemkell',signed||!!b.contractUrl,'Nem kell szerződés?')+(cs==='nemkell'?'':'</div>');
  // TIG
  const tg=tigList().filter(t=>tigPids(t).includes(p.id)).pop()||null,appr=!!tg&&(tg.status==='jovahagyva'||tg.status==='szamlazva'),r=pr(p);
  const tigNeed=!!tg||b.tigMode==='kell'||(b.tigMode!=='nemkell'&&tigList().some(t=>String(t.client||'').trim().toLowerCase()===String(p.client||'').trim().toLowerCase()));
  const tig=box('tig','TIG',tg?`${bsStep(true,'TIG kiállítva',[tg.createdAt?fmtMD(String(tg.createdAt).slice(0,10)):'',tg.url?`<a class="linkbtn" href="${esc(tg.url)}" target="_blank" rel="noopener">📄 PDF</a>`:'',tg.sentAt?`✉️ elküldve ${fmtMD(String(tg.sentAt).slice(0,10))}`:appr?'':`<button class="linkbtn" type="button" data-action="tig-mail" data-id="${esc(tg.id)}">✉️ Küldés</button>`].filter(Boolean).join(' · '))}${bsStep(appr,appr?'TIG jóváhagyva':'TIG jóváhagyásra vár',appr&&tg.approvedAt?fmtMD(tg.approvedAt):'',tg.status==='szamlazva'?'':`data-action="${appr?'tig-unapprove':'tig-approve'}" data-id="${esc(tg.id)}"`)}${tg.status==='jovahagyva'?`<button class="btn primary small bl-add" type="button" data-action="tig-invoice" data-id="${esc(tg.id)}">🧾 Számla a TIG alapján</button>`:tg.status==='szamlazva'&&tg.invoiceNo?`<div class="bs-x">Számlázva: ${esc(tg.invoiceNo)}</div>`:''}`
    :`<button class="btn outline small bl-add" type="button" data-action="tig-new" data-client="${esc(p.client||'')}" data-month="${r?r.start.slice(0,7):''}">📝 TIG kiállítása</button>`,!tigNeed,!!tg,'Nem kell TIG?');
  if(i.free)return {contract,tig,adv:freeBox('Díjbekérő'),fin:freeBox('Végszámla')};
  // Díjbekérő
  const dx=i.db||i.el,advPaid=!!((i.db&&invPaidOk(i.db))||(i.el&&invPaidOk(i.el))),skipA=b.mode==='egyben';
  const adv=box('adv',`Díjbekérő${!skipA&&val?` <span class="pb-pct"><input class="pb-pct-in" type="text" inputmode="numeric" maxlength="3" value="${num(b.advancePct)}" data-advpct="${pid}" aria-label="Foglaló %">%</span> <span class="muted">· ${ftFmt(Math.round(val*num(b.advancePct)/100))}</span>`:''}`,
    !dx?billAddBtn(p.id,'dijbekero','Díjbekérő kiállítása',!i.closed&&i.steps[i.nextI]&&i.steps[i.nextI][0]==='advIssued')
      :`${bsSent(i.db?'Díjbekérő':'Foglalószámla',i.db||i.el)}${bsPaidStep(i.el&&invPaidOk(i.el)?i.el:i.db||i.el)}${i.el&&i.db?`<div class="bs-x">Foglalószámla: <button class="bl-no" type="button" data-action="sz-inv" data-id="${esc(i.el.id)}">${esc(i.el.no)}</button></div>`:''}${i.db&&invPaidOk(i.db)&&!i.el&&!i.db.ref?`<button class="linkbtn" type="button" data-action="bill-inv" data-id="${pid}" data-type="eloleg">+ Foglalószámla</button>`:''}`,skipA,!!dx,'Nem kell díjbekérő?');
  // Végszámla
  const finT=skipA?'Számla':'Végszámla',fx=i.fin;
  // végszámla = végső érték (szerződött + extrák) − a ténylegesen kiszámlázott foglaló (ennek hiányában a foglaló %-a a szerződött összegből)
  const advNet=i.el?num(i.el.invNet):i.db?num(i.db.invNet):0,finDue=skipA?tot:Math.max(0,tot-(dx?advNet:Math.round(val*num(b.advancePct)/100)));
  const finCalc=!skipA&&!fx&&tot&&(ex||dx)?`<div class="bs-x">${extrasOf(p).length?exBreak(p).replace('szerződött ',''):ftFmt(tot)} − foglaló ${ftFmt(dx?advNet:Math.round(val*num(b.advancePct)/100))}</div>`:'';
  const fin=i.full&&!fx?`<div class="pb-box bs-box skip"><div class="pb-t">Végszámla</div><span class="statuspill p-mute">Nem kell – 100% foglaló</span></div>`
    :box('fin',`${finT}${tot&&!i.noFin?` <span class="muted">· ${ftFmt(finDue)}</span>`:''}`,
      fx?`${bsSent(finT,fx)}${bsPaidStep(fx)}`:`${finCalc}${tigNeed&&!appr?`<div class="bs-x warn-txt">⏳ ${tg?'A TIG jóváhagyása után':'A TIG kiállítása és jóváhagyása után'} állítható ki.</div>`:billAddBtn(p.id,skipA?'szamla':'vegszamla',finT+' kiállítása',projDone(p)&&(skipA||!!dx))}`,i.noFin&&!fx,!!fx,`Nem kell ${finT.toLowerCase()}?`);
  const late=(h,x)=>x&&invState(x)==='late'?h.replace('class="pb-box bs-box','class="pb-box bs-box bs-late'):h;   // lejárt, kifizetetlen bizonylat: piros kártya
  const paid=(h,ok)=>ok?h.replace('class="pb-box bs-box','class="pb-box bs-box bs-paid'):h;   // kifizetve: szürke kártya (a linkek kattinthatók maradnak)
  return {contract,tig,adv:paid(late(adv,i.db&&!invPaidOk(i.db)&&!i.el?i.db:null),advPaid),fin:paid(late(fin,fx),!!(fx&&invPaidOk(fx)))};}
ACT['bl-cstep']=async btn=>{const pid=btn.dataset.id,st=btn.dataset.st;if(!S.fin||!S.fin.billing)return;const arr=S.fin.billing;let b=arr.find(x=>x.projectId===pid);if(!b){b=Object.assign({},billOf(pid));arr.push(b);}
  const prev=Object.assign({},b),patch={contractStatus:st};if(st==='alairva'&&!b.signedAt)patch.signedAt=todayISO();if(st!=='alairva')patch.signedAt='';Object.assign(b,patch);render(true);
  try{const d=await call('billSave',Object.assign({projectId:pid},patch));if(d&&d.billing)S.fin.billing=d.billing;render(true);}catch(e){Object.assign(b,prev);render(true);handleErr(e);}};

function viewBilling(){
  if(!billOn())return `<div class="panel">${empty('Ez a fül a háttérkód frissítése után érhető el.')}</div>`;
  if(!S.fin)return finLoadingView();
  if(!S.fin.billing)return `<div class="panel">${empty('A Szerződés és számlázás a legújabb háttérkód (Code.gs) bemásolása és új verzióként való telepítése után érhető el.')}</div>`;
  const f=S.blf||(S.blf={v:'honap',q:''}),q=f.q.trim().toLowerCase();
  const all=S.projects.filter(p=>p.status!=='lemondva'&&pr(p)).map(billInfo);
  const curM=todayISO().slice(0,7);
  const sets={honap:all.filter(i=>pr(i.p).start.slice(0,7)===curM),teendo:all.filter(i=>!i.closed),kint:all.filter(i=>i.openSum>0),lejart:all.filter(i=>i.late.length),szerzodes:all.filter(i=>i.noContract&&!i.closed),lezart:all.filter(i=>i.closed),mind:all};
  const labels=[['honap','📅 '+F_YM.format(toDate(curM+'-01'))],['teendo','Nyitott'],['szerzodes','Szerződés hiányzik'],['kint','Kintlévő'],['lejart','Lejárt'],['lezart','Lezárt'],['mind','Mind']];
  let list=sets[f.v]||all;if(q)list=list.filter(i=>[i.p.name,i.p.client,...i.inv.map(x=>x.no)].join(' ').toLowerCase().includes(q));
  list.sort((a,b)=>String(pr(b.p).start).localeCompare(String(pr(a.p).start)));
  const months=[];list.forEach(i=>{const m=pr(i.p).start.slice(0,7);let g=months.find(x=>x.m===m);if(!g)months.push(g={m,arr:[]});g.arr.push(i);});
  const cols=6,openSum=all.reduce((s,i)=>s+i.openSum,0),lateSum=all.reduce((s,i)=>s+i.lateSum,0),todo=all.filter(i=>i.todo).length,noC=sets.szerzodes.length;
  const sz=S.fin.sz||{};
  return `<div class="page-head"><div class="grow"><h2>Szerződés és számlázás</h2><p class="sub">Projektenként: szerződés → díjbekérő → foglaló → végszámla → kifizetés · csak te látod</p></div>
      ${sz.hasKey?`<button class="btn outline small" type="button" data-action="sz-sync"${S._szSyncing?' disabled':''} title="${esc(sz.lastSync?'Utoljára: '+sz.lastSync:'')}">${S._szSyncing?'Frissítés…':'🔄 Kifizetések'}</button>`:''}
      <button class="btn outline small" type="button" data-action="imp-open">📥 Számlák importálása</button><button class="btn outline small" type="button" data-action="tig-new">📝 TIG kiállítása</button><button class="btn outline small" type="button" data-action="sz-settings">🧾 Számlázás beállításai</button></div>
    ${sz.hasKey?'':`<div class="banner"><p>A számlák kiállításához és a kifizetések követéséhez add meg a számlázz.hu Agent-kulcsot a <b>Számlázás beállításai</b> gombbal.</p></div>`}
    <div class="tiles fin-tiles">
      <button class="tile tile-btn${noC?' bad':''}" type="button" data-action="blf" data-v="szerzodes" data-k="c"><div class="tile-n">${noC}</div><div class="tile-l">szerződés hiányzik</div></button>
      <button class="tile tile-btn${todo?' warn':''}" type="button" data-action="blf" data-v="teendo"><div class="tile-n">${todo}</div><div class="tile-l">kiállítandó díjbekérő / végszámla</div></button>
      <button class="tile tile-btn" type="button" data-action="blf" data-v="kint"><div class="tile-n">${ftFmt(openSum)}</div><div class="tile-l">kintlévőség (bruttó, ${sets.kint.length} projekt)</div></button>
      <button class="tile tile-btn${lateSum?' bad':''}" type="button" data-action="blf" data-v="lejart"><div class="tile-n">${ftFmt(lateSum)}</div><div class="tile-l">lejárt (${sets.lejart.length} projekt)</div></button>
    </div>
    <div class="toolbar"><input class="inp search" id="q-bill" type="search" placeholder="Keresés projekt, ügyfél, számlaszám szerint" value="${esc(f.q)}" aria-label="Keresés">
      <div class="chips">${labels.map(([v,l])=>`<button class="chip" type="button" data-action="blf" data-v="${v}" aria-pressed="${f.v===v}">${l}<span class="c">${sets[v].length}</span></button>`).join('')}</div></div>
    ${list.length?`<div class="sheet-wrap"><table class="sheet bill-tbl"><thead><tr><th class="n">Nap</th><th>Projekt</th><th>Szerződés</th><th>Díjbekérő</th><th>TIG</th><th>Végszámla</th></tr></thead>
      <tbody>${months.map(g=>`<tr class="pt-month bill-month"><td colspan="${cols}"><span class="bm-name">${esc(F_YM.format(toDate(g.m+'-01')))}</span> <span class="muted">· ${g.arr.length} projekt</span></td></tr>${g.arr.map(billRow).join('')}`).join('')}</tbody></table></div>
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
    items:rows.map(r=>({name:(r.task+(r.period?' ('+r.period+')':'')).slice(0,300),qty:1,price:num(r.amount),pid:r.pid||''}))});}
async function tigAct(b,action){if(b)b.disabled=true;try{const d=await call('tigSave',{id:b.dataset.id,action});finApply(d);toast(action==='approve'?'TIG jóváhagyva – kiállíthatod a számlát.':action==='send'?'TIG elküldve – jóváhagyásra vár.':action==='unsend'?'TIG: elküldés visszavonva.':action==='delete'?'TIG törölve a listából.':'Jóváhagyás visszavonva.');}catch(e){handleErr(e);if(b)b.disabled=false;}}
/* TIG küldése e-mailben: címzett a megrendelő képviselője (és a kapcsolattartó), szöveg szerkeszthető, a PDF csatolva */
const TIG_MAIL_DEF={subject:'Teljesítésigazolás – {ugyfel} – {honap}',text:'Kedves {nev}!\n\nMellékelten küldöm a {honap} havi teljesítésigazolást ({ugyfel}). Kérlek, nézd át, és ha minden rendben, jelezz vissza, hogy jóváhagyjátok – ezután állítjuk ki a számlát.\n\nKöszönöm!'};
const tigTpl=(s,v)=>String(s||'').replace(/\{(nev|ugyfel|honap|osszeg|tetelek)\}/g,(m,k)=>v[k]??m);
const clTigMail=c=>{try{const o=typeof c.tigMail==='string'?JSON.parse(c.tigMail||'null'):c.tigMail;return o&&typeof o==='object'?o:null;}catch(e){return null;}};
/* TIG küldése e-mailben: a sablon ügyfelenként személyre szabható ({nev}, {ugyfel}, {honap}, {osszeg}, {tetelek}), a PDF csatolva */
function tigMailModal(id){const t=tigList().find(x=>x.id===id);if(!t){toast('A TIG még nem töltődött be – frissíts.',true);return;}
  const n=s=>String(s||'').trim().toLowerCase(),c=(S.clients||[]).find(x=>n(x.name)===n(t.client))||{},own=clTigMail(c),def=(S.fin.settings&&S.fin.settings.tigMail)||TIG_MAIL_DEF;
  const MN=['január','február','március','április','május','június','július','augusztus','szeptember','október','november','december'];let rows=[];try{rows=JSON.parse(t.rows||'[]');}catch(e){}
  const v={nev:(c.rep||c.contactName||'').trim().split(/\s+/).slice(-1)[0]||'Partnerünk',ugyfel:t.client,honap:t.month?t.month.slice(0,4)+'. '+MN[Number(t.month.slice(5,7))-1]:'',osszeg:ftFmt(num(t.total))+' + ÁFA',tetelek:rows.map(r=>'• '+r.task+(r.period?' ('+r.period+')':'')).join('\n')};
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
    ${mf('advancePct','Foglaló (%)',{v:b.advancePct??50,im:'numeric'})}
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
  'blf':b=>{(S.blf||(S.blf={v:'honap',q:''})).v=b.dataset.v;render(true);},
  'bill-edit':b=>billModal(b.dataset.id,b.dataset.focus),
  'bill-inv':b=>{if(!S.fin.sz||!S.fin.sz.hasKey){szSettingsModal('Az Agent-kulcs megadása után tudsz bizonylatot kiállítani.');return;}szInvoiceModal('project',b.dataset.id,{type:b.dataset.type});},
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
  const fin=i.fin?invLine(i.fin):billAddBtn(p.id,b.mode==='egyben'?'szamla':'vegszamla',b.mode==='egyben'?'Számla':'Végszámla',projDone(p)&&(b.mode==='egyben'||!!(i.db||i.el)));
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
    <div class="pb-grid">${(()=>{const C=billCells(p,i);return C.contract+C.adv+C.tig+C.fin;})()}
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
  const pid=t.dataset.advpct,v=Math.max(0,Math.min(100,Math.round(Number(t.value)||0)));const arr=S.fin.billing;let b=arr.find(x=>x.projectId===pid);if(!b){b=Object.assign({},billOf(pid));arr.push(b);}
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

/* Ügyfél szerződése: behúzással egyből feltöltjük (az ügyfél Keretszerződés mappájába) */
async function clientContractDrop(client,file,zone){if(!client)return;
  if(zone){zone.classList.add('busy');zone.dataset.txt=zone.textContent;}
  try{const b64=await readB64(file);const d=await call('fwSave',{client,b64,name:file.name,mime:file.type||'application/octet-stream'});finApply(d);
    S.clDocs=null;S._clDocsForce=true;S._clDocsLoading=false;toast('Szerződés feltöltve: '+client);
    if($('modalRoot').innerHTML&&document.querySelector('.cl-docs')){closeModal();clDocsReopen(client);}else render(true);}
  catch(e){handleErr(e);}finally{if(zone)zone.classList.remove('busy');}}
function clDocsReopen(client){const go=()=>{if(S.clDocs){render(true);clDocsModal(client);}else setTimeout(go,400);};clDir(client);go();}
ACT['cl-doc-del']=b=>{const url=b.dataset.url,name=b.dataset.name,client=b.dataset.client;
  confirmModal('Szerződés törlése',`A(z) „${name}” fájl a Drive kukájába kerül (30 napig visszaállítható), és lekerül a projektekről, illetve a keretszerződésből.`,'Törlés',async()=>{
    try{const d=await call('clientDocDelete',{url});finApply(d);S.clDocs=d.folders||[];S._clDocsAt=d.at||Date.now();closeModal();toast(d.trashed?'Szerződés törölve (Drive kuka)':'Szerződés leválasztva');render(true);clDocsModal(client);}
    catch(e){handleErr(e);}});};
