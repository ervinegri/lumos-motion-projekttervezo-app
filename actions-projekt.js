'use strict';
/* ===== Projekt szerkesztése ===== */
function openProject(id){if(isSales())return;   // az értékesítő nem nyithat meg projektet

  const p=projById(id);if(!p)return;S.crewDay='';
  S.tab='projektek';S.projectId=id;S.draft=prepDraft(p);S.draftBase=clone(S.draft);S.dirty=false;histReset();S.addCrew={person:'',role:''};S.addEq={item:'',qty:1};
  closeModal();render(true);scrollTo(0,0);
}
/* Visszavonás / mégis (Ctrl/⌘+Z, Ctrl/⌘+Shift+Z vagy Ctrl+Y): a projekt vázlatáról pillanatképeket tartunk. */
/* ===== Művelet-előzmény a projekten kívül (Ctrl+Z / Ctrl+Shift+Z, ↶ ↷ gombok): bevétel/kiadás/tagi kölcsön, ügyfél, munkatárs, eszköz ===== */
const OPH={u:[],r:[],busy:false};
function opRec(label,undo,redo){OPH.u.push({label,undo,redo});if(OPH.u.length>60)OPH.u.shift();OPH.r=[];if(document.querySelector('.undo-bar'))setTimeout(()=>render(true),0);}
async function opStep(dir){
  if(OPH.busy)return;const from=dir<0?OPH.u:OPH.r,to=dir<0?OPH.r:OPH.u;
  if(!from.length){toast(dir<0?'Nincs mit visszavonni.':'Nincs mit újra végrehajtani.');return;}
  const op=from.pop();OPH.busy=true;
  try{await (dir<0?op.undo:op.redo)();to.push(op);toast((dir<0?'↶ Visszavonva: ':'↷ Újra: ')+op.label);}
  catch(e){from.push(op);handleErr(e);}finally{OPH.busy=false;render(true);}
}
function undoBar(){return '';return `<div class="undo-bar btns"><button class="btn outline small" type="button" data-action="op-undo" title="Visszavonás (Ctrl+Z)${OPH.u.length?': '+esc(OPH.u[OPH.u.length-1].label):''}" aria-label="Visszavonás"${OPH.u.length?'':' disabled'}>↶</button><button class="btn outline small" type="button" data-action="op-redo" title="Újra (Ctrl+Shift+Z)${OPH.r.length?': '+esc(OPH.r[OPH.r.length-1].label):''}" aria-label="Újra"${OPH.r.length?'':' disabled'}>↷</button></div>`;}
/* Pénzügyi sorok visszaállítása adott állapotra (null = a sor ne létezzen) */
async function finRestore(table,ids,states){
  const ups=states.filter(Boolean).map(clone),dels=ids.filter((id,i)=>!states[i]);
  finLocal(table,ups);dels.forEach(id=>finLocal(table,[{id}],true));render(true);
  try{if(ups.length)finApply(await call('finUpsert',{table,rows:ups}));for(const id of dels)finApply(await call('finDelete',{table,id}));}
  catch(e){finLoad(true);throw e;}
}
/* Ügyfél / munkatárs / eszköz visszaállítása */
const ENT={
  client:{get:()=>S.clients||[],set:v=>{S.clients=v;},save:'saveClient',del:'deleteClient'},
  crew:{get:()=>S.crew||[],set:v=>{S.crew=v;},save:'saveCrew',del:'deleteCrew'},
  item:{get:()=>S.inventory||[],set:v=>{S.inventory=v;},save:'saveItem',del:'deleteItem'}};
async function entRestore(kind,id,state){
  const E=ENT[kind],cur=E.get().find(x=>x.id===id);
  if(!state){if(cur){await call(E.del,{id});E.set(E.get().filter(x=>x.id!==id));}return;}
  const rec=Object.assign({},clone(state),{baseUpdatedAt:cur?cur.updatedAt:''});
  if(kind==='client'){rec.oldName=cur?cur.name:'';await saveClientRec(rec);return;}
  const saved=await call(E.save,rec);E.set(E.get().filter(x=>x.id!==saved.id).concat([saved]));
}
function entRec(kind,label,id,before,after){opRec(label,()=>entRestore(kind,id,before),()=>entRestore(kind,id,after));}
const HIST={u:[],r:[],last:0,key:''};
function histReset(){HIST.u=[];HIST.r=[];HIST.last=0;HIST.key='';}
function histPush(){if(!S.draft)return;const s=JSON.stringify(S.draft);if(HIST.u[HIST.u.length-1]===s)return;HIST.u.push(s);if(HIST.u.length>150)HIST.u.shift();HIST.r=[];}
function histTyping(key){const now=Date.now();if(now-HIST.last>900||HIST.key!==key)histPush();HIST.last=now;HIST.key=key;}
function histStep(dir){
  if(!S.draft||ro())return;const from=dir<0?HIST.u:HIST.r,to=dir<0?HIST.r:HIST.u;if(!from.length){if(S.dirty&&!draftChanged()){S.dirty=false;renderChrome();}toast(dir<0?(S.dirty?'Nincs több visszavonható lépés – a mentetlen módosítást a „Mentés” menti, az „Elvetés” eldobja.':'Nincs mit visszavonni.'):'Nincs mit újra végrehajtani.');return;}
  to.push(JSON.stringify(S.draft));S.draft=JSON.parse(from.pop());S.dirty=true;HIST.key='';try{document.activeElement&&document.activeElement.blur();}catch(e){}render(true);
}
/* A részösszegek frissítése gépelés közben (újrarajzolás nélkül). */
function refreshFinSums(p){{const b=p?prodBase(p):0,ep=$('f-budgetPct'),ef=$('f-budgetFt'),ae=document.activeElement;if(p&&ep&&ef){if(p.budgetMode==='ft'&&ae!==ep)ep.value=b>0&&p.budgetVal!==''?String(Math.round(num(p.budgetVal)/b*1000)/10).replace('.',','):'';else if(p.budgetMode==='pct'&&ae!==ef)ef.value=b>0&&p.budgetVal!==''?moneyFmt(Math.round(b*num(p.budgetVal)/100)):'';}}   /* hatékonyság ↔ keret a „…után” összegből */
{const fn=document.querySelector('.fin-net input');if(fn&&p)fn.value=moneyFmt(salesBase(p));const d=p&&projDeal(p),e=d&&salesCommEst(p,d),sp=$('f-salesPct'),sf=$('f-salesFt');if(e&&sp&&sf&&document.activeElement!==sp&&document.activeElement!==sf){sp.value=String(e.pct).replace('.',',');sf.value=moneyFmt(e.amt);}}   // jutalék levonása utáni összeg élőben

  document.querySelectorAll('[data-day-sum]').forEach(el=>{el.textContent=moneyFmt(daySumOf(p,el.dataset.daySum))||0;});
  const o=document.querySelector('[data-other-sum]');if(o)o.textContent=moneyFmt(otherSumOf(p))||0;
  const f=document.querySelector('[data-field-sum]');if(f)f.textContent=moneyFmt(fieldSumOf(p))||0;
  const ps=document.querySelector('[data-post-sum]');if(ps)ps.textContent=moneyFmt(postSumOf(p))||0;
}
/* Csapat véglegesítése: megerősítés után a tagok a naptárba kerülnek, e-mailt és naptárértesítést kapnak. */
async function crewFinalizeModal(){
  const d=S.draft;if(!d||ro()||!crewFinalOn())return;
  flushSave();await SAVE_Q;if(S.dirty){toast('Előbb mentődjenek el a módosítások, aztán próbáld újra.',true);return;}
  const p=projById(d.id)||d,ids=crewIdsNow(p);if(!ids.length){toast('Még nincs beosztva senki.',true);return;}
  if(!validISO(p.date)){toast('Előbb add meg a projekt első napját.',true);return;}
  {const free=postTasks(p).filter(t=>!taskOwners(p,t.k).length);if(free.length){   // minden vágnivaló videónak legyen vágója
    toast(cutterIds(p).length?`Előbb rendeld vágóhoz az összes videót – még nincs vágója: ${free.map(t=>t.label).join(', ')}.`:'Vágnivaló videók vannak, de nincs vágó beosztva – előbb ossz be vágót, és rendeld hozzá a videókat.',true);
    const el=document.querySelector('.ct-chip.free')||$('add-crew-role');if(el){el.scrollIntoView({behavior:'smooth',block:'center'});}return;}}
  const roleOf=id=>(id===p.lead?['Projektvezető']:[]).concat((p.crew||[]).filter(a=>a.crewId===id).map(a=>a.role)).join(', ');
  const diff=crewFinalDiff(p),first=crewFinalState(p)==='none';
  const gearWarn=[...new Set((p.crew||[]).filter(a=>isOpRole(a.role)).map(a=>a.crewId))].map(id=>{const cats=(p.equipment||[]).filter(e=>(e.crewId||'')===id).map(e=>(itemById(e.itemId)||{}).category);
      const miss=['Kamera','Objektív'].filter(c=>!cats.includes(c));if(!miss.length)return '';const own=rentalsOf(p,id).map(r=>r.name).filter(Boolean);
      return `<li><b>${esc((crewById(id)||{}).name||'Operatőr')}</b>: nincs ${miss.map(m=>m==='Kamera'?'kamerája':'objektívje').join(' és ')} beosztva${own.length?` <span class="muted">(saját / bérelt: ${esc(own.join(', '))})</span>`:''}</li>`;}).filter(Boolean).join('');
  const noCut=!postTasks(p).length&&(p.crew||[]).some(a=>a.role==='Vágó')?`<div class="cf-gear"><b>✂️ A vágónak nincs vágnivalója</b><small>Vágót osztottál be, de az Utómunkánál nincs kiválasztva semmi. Véglegesítheted így is, de a levélben nem lesz, mit kell elkészítenie.</small></div>`:'';
  const gearBox=gearWarn?`<div class="cf-gear"><b>⚠️ Az operatőrnek nincsenek eszközei</b><ul>${gearWarn}</ul><small>Véglegesítheted így is, de előtte érdemes hozzárendelni a kamerát és az objektívet.</small></div>`:'';
  const tag=id=>first?'':diff.added.includes(id)?' <span class="cf-tag new">új tag – értesítést kap</span>':diff.changed.includes(id)?' <span class="cf-tag chg">módosult – értesítést kap</span>':' <span class="cf-tag">nem kap újra értesítést</span>';
  const self=id=>!!(S.me&&S.me.crewId&&S.me.crewId===id);
  const rows=ids.map(id=>{const c=crewById(id)||{},ok=EMAIL_RE.test(c.email||'');return `<li data-cfid="${esc(id)}"><b>${esc(c.name||'Munkatárs')}</b> <span class="muted">· ${esc(roleOf(id))}</span>${self(id)?' <span class="cf-tag">te vagy – nem kapsz levelet, csak a naptárba kerülsz</span>':tag(id)}${!self(id)&&ok?`<button type="button" class="cf-open" data-action="cf-open" data-id="${esc(id)}" aria-expanded="false">✉️ Levél <span class="cf-car">▾</span></button>`:''}<br><small class="${ok?'muted':'warn-txt'}">${ok?esc(c.email):'nincs e-mail-címe – nem kap értesítést (a Stáb fülön pótolható)'}</small></li>`;}).join('')
    +diff.removed.map(id=>`<li><b>${esc((crewById(id)||{}).name||'Munkatárs')}</b> <span class="cf-tag">levéve – kikerül a naptárbejegyzésből</span></li>`).join('');
  const cfSubj=(first?'Beosztás: ':'Módosult beosztás: ')+(p.name||'')+' – '+[p.date,p.endDate&&p.endDate>p.date?p.endDate:''].filter(Boolean).map(d=>F_FULL.format(toDate(d))).join(' – '),cfIntro=first?'Véglegesítettük a csapatot, és beosztottunk erre a projektre:':'Módosult a beosztásod ezen a projekten:';
  const cfFirst=String((crewById(ids[0])||{}).name||'Kata').split(/\s+/).pop();
  setTimeout(()=>cfPreviewLoad(p,cfSubj,cfIntro),0);
  openModal('Biztosan véglegesíted a csapatot?',`${gearBox}${noCut}<p style="margin:0 0 10px">${first?(editOnly(d)?'Ezzel a tagokat beteszed a projekt bejegyzésébe a <b>Vágói naptárban</b> (a projekt napjától a leadási határidőig). <b>Minden tag e-mailt kap a beosztásáról.</b>':'Ezzel a tagokat beteszed a projekt naptárbejegyzésébe. <b>Minden tag e-mailt kap a beosztásáról, és a forgatás bekerül a naptárába.</b>'):'A csapat a legutóbbi élesítés óta módosult. <b>Csak az új tagok, és azok kapnak értesítést, akiknek a szerepe, eszközei vagy napjai változtak.</b>'}</p>
    <div class="cf-mail"><div class="cf-mail-h">✉️ A levél szövege <span class="muted">– minden címzettnek ez megy ki</span></div>
      <div class="field"><label for="m-cfSubj">Tárgy</label><input class="inp" id="m-cfSubj" name="cfSubj" maxlength="200" value="${esc(cfSubj)}"></div>
      <div class="field"><label for="m-cfNote">Megjegyzés a csapatnak <span class="muted">(nem kötelező)</span></label><textarea class="inp" id="m-cfNote" name="cfNote" rows="3" maxlength="3000" placeholder="pl. parkolás a hátsó bejáratnál, dress code: fekete, 7:30-kor rövid eligazítás"></textarea></div></div>
    <div class="cf-mail-h" style="margin:14px 0 4px">👥 Címzettek <span class="muted">– a <b>✉️ Levél ▾</b> gombbal megnézheted, és kézzel át is írhatod az illető levelét</span></div>
    <ul class="cf-list">${rows}</ul>
    ${crewFinalState(p)==='changed'?'<p class="hint" style="margin:8px 0 0">Akit levettél a projektről, az kikerül a naptárbejegyzésből.</p>':''}
    <div class="cf-prev" hidden><div class="cf-prev-h"><b>✏️ Az e-mail szerkeszthető</b><button class="linkbtn" type="button" id="cfPrevReset" hidden>↺ Eredeti szöveg</button><select class="inp" id="cfPrevWho" aria-label="Címzett" hidden></select></div><div id="cfPrev" class="cf-prev-box"><p class="hint" style="margin:0">Előnézet betöltése…</p></div></div>`,{submitLabel:'Igen, véglegesítem a csapatot',cancelLabel:'Mégsem',submit:async fd=>{
    const subj=String(fd.get('cfSubj')||'').trim(),note=String(fd.get('cfNote')||'').trim();
    const arg={projectId:p.id,cutTasks:cutTasksFor(p)};if(subj&&subj!==cfSubj)arg.subject=subj;if(note)arg.note=note;
    const ed=Object.keys(CF_EDIT).filter(k=>CF_EDIT[k]);if(ed.length){arg.custom={};ed.forEach(k=>{arg.custom[k]=CF_EDIT[k];});}   // kézzel átírt levelek: tagonként   // ami nem változott, azt a szerver tagonként állítja be (új / módosult beosztás)
    try{const r=await call('finalizeCrew',arg);closeModal();
      const saved=r.project,i=S.projects.findIndex(x=>x.id===saved.id);if(i>=0)S.projects[i]=saved;
      if(S.draft&&S.draft.id===saved.id){if(S.dirty){S.draft.crewFinal=saved.crewFinal;S.draft.calEventId=saved.calEventId;S.draft.status=saved.status;S.draft.prevStatus=saved.prevStatus;S.draft.updatedAt=saved.updatedAt;}else S.draft=prepDraft(saved);}
      if(S.crewEdit)delete S.crewEdit[saved.id];render(true);S.cal.events={};
      const warn=[].concat(r.failed&&r.failed.length?['nem ment ki: '+r.failed.join(', ')]:[],r.noEmail&&r.noEmail.length?['nincs e-mail-címe: '+r.noEmail.join(', ')]:[]);
      if(r.stepped)toast('Csapat véglegesítve – a projekt átkerült a Helyszíni munka szakaszba.');setTimeout(()=>toast(r.mailPaused?'Csapat véglegesítve. Az e-mailek szünetelnek, értesítés nem ment ki (Beállítások → E-mail értesítések).':`Csapat véglegesítve – ${r.sent.length?'e-mail kiküldve: '+(r.sentTo&&r.sentTo.length?r.sentTo.map(x=>x.name+' ('+x.email+')'):r.sent).join(', '):'senkinek nem kellett új értesítés'}.${warn.length?' Figyelem: '+warn.join('; '):''}`,!!warn.length),r.stepped?2500:0);
    }catch(e){handleErr(e);}
  }});
}
/* A termek kamerái / objektívei / diákeszközei a terem operatőréhez tartoznak: ha az operatőr változik vagy lekerül, az eszköz vele együtt mozog (operatőr nélkül gazdátlan lesz) */
function roomEqSync(d){if(!d||!Array.isArray(d.equipment)||!Array.isArray(d.recRooms))return;const own={};
  recRoomsOf(d).forEach(r=>{Object.keys(ROOM_EQ).forEach(k=>{const E=roomEq(r,k),L=roomLens(r,k);E.forEach((id,j)=>{const op=camOwner(d,r.id,k,j);[id,L[j]].forEach(x=>{if(x)(own[x]=own[x]||new Set()).add(op);});});});});
  if(!Object.keys(own).length)return;let ch=false;const eq=d.equipment.map(e=>{const w=e&&own[e.itemId];if(w&&w.size===1&&!w.has(e.crewId||'')){ch=true;return Object.assign({},e,{crewId:[...w][0]});}return e;});if(ch)d.equipment=eq;}   // ugyanabból a típusból több darab: mindenki a sajátját viszi
/* A terem operatőrének a Stáb és eszközök résznél kiosztott kamerái (és objektívei) automatikusan bekerülnek a terem kameraszögeihez:
   előbb a bejelölt, de üres szögek kapnak kamerát, a maradék kamerák a következő szögeket (teljes alakos → közeli → közönség) jelölik be. */
function roomOpEqFill(d,tick){if(!d||ro()||!Array.isArray(d.equipment)||!d.equipment.length)return false;const R=recRoomsOf(d);if(!R.some(r=>roomCams(r).length))return false;
  const CAM=new Set(camItems().map(x=>x.id)),LENS=new Set(lensItems().map(x=>x.id)),inv=id=>(S.inventory||[]).find(x=>x.id===id);
  const rooms=clone(R),used=new Set();rooms.forEach(r=>ROOM_CAMS.forEach(c=>{roomEq(r,c.k).concat(roomLens(r,c.k)).forEach(id=>{if(id)used.add(id);});}));
  const ANG=['er_total','er_close','er_crowd'];let ch=false;
  rooms.forEach(r=>{if(!roomCams(r).length)return;const op=(slotOwners(d,r.id+'_op')||[])[0];if(!op)return;
    const mine=pred=>d.equipment.filter(e=>e&&e.crewId===op&&pred(e.itemId)).flatMap(e=>Array(Math.max(1,num(e.qty)||1)).fill(e.itemId));
    const take=(arr,ok)=>{const i=arr.findIndex(id=>!used.has(id)&&(!ok||ok(id)));if(i<0)return '';const id=arr[i];arr.splice(i,1);used.add(id);return id;};
    const cams=mine(id=>CAM.has(id)),lenses=mine(id=>LENS.has(id));
    const SEEN=S._roomOpSeen=S._roomOpSeen||{},sk=(d.id||'')+'|'+r.id,sig=op+'|'+cams.slice().sort().join(','),fresh=SEEN[sk]!==undefined&&SEEN[sk]!==sig;SEEN[sk]=sig;   // új szöget csak akkor jelöl be, ha az operatőr vagy a kamerái tényleg változtak
    if(!cams.length)return;
    ANG.forEach(k=>{if(num(r[k])>0){const eq=roomEq(r,k);if(!eq[0]){const id=take(cams);if(id){eq[0]=id;r[k+'_eq']=eq;ch=true;}}}});
    if(tick&&fresh)ANG.forEach(k=>{if(num(r[k])>0)return;const id=take(cams);if(id){r[k]=1;r[k+'_eq']=[id];ch=true;}});   // új szöget csak eszköz- / beosztásváltozáskor jelöl be (a kézzel kivett pipát nem teszi vissza)
    ANG.forEach(k=>{if(!(num(r[k])>0))return;const eq=roomEq(r,k),ln=roomLens(r,k);if(eq[0]&&!ln[0]){const cam=inv(eq[0]),id=take(lenses,l=>lensFits(cam,inv(l)));if(id){ln[0]=id;r[k+'_lens']=ln;ch=true;}}});});
  if(ch)Object.assign(d,roomsPatch(rooms));return ch;}
/* Aki már nincs a helyszínen (remote vezető, csak vágó / értékesítő, vagy lekerült a projektről), annál nem maradhat eszköz: gazdátlan lesz, a stábnál újra kiosztható */
function offSiteEqRelease(d){if(!d||!Array.isArray(d.equipment))return;const on=onSiteIds(d),gone=new Set();
  const eq=d.equipment.map(e=>{if(e&&e.crewId&&!on.has(e.crewId)&&!((d.crew||[]).some(a=>a.crewId===e.crewId)&&feeSales(d,e.crewId))){gone.add(e.crewId);return Object.assign({},e,{crewId:''});}return e;});
  if(gone.size){d.equipment=eq;setTimeout(()=>toast(`${[...gone].map(id=>(crewById(id)||{}).name||'Valaki').join(', ')} már nincs a helyszínen – az eszközei gazdátlanok lettek, oszd ki őket újra.`),0);}}
function setDraft(patch){if(ro()||!S.draft)return;histPush();HIST.key='';Object.assign(S.draft,patch);
  if('crew' in patch&&!S.draft.lead){const ids=[...new Set((S.draft.crew||[]).map(a=>a.crewId))];if(ids.length===1)S.draft.lead=ids[0];}   // egyszemélyes stábnál ő a projektvezető
  if(('crew' in patch||'lead' in patch)&&!('fees' in patch))syncFeesWithCrew(S.draft);roomEqSync(S.draft);offSiteEqRelease(S.draft);if(!projLocked())roomOpEqFill(S.draft,!S._noTick);S.dirty=true;render(true);autoSave(400);}
/* Beosztott munkatárs → sor a Pénzügyek táblázatában (név, feladat, napidíj × napok); a díjat ott lehet átírni.
   Ha valakit levesznek a projektről, a sora csak akkor törlődik, ha még nem írtak be díjat. */
/* Projekt megnyitásakor a már beosztott emberek sora is bekerül a díjtáblázatba (mentés csak a következő módosítással). */
/* Ütközés (valaki más is mentette a projektet): mezőnként összefésüljük – a te módosításaid megmaradnak,
   az ő módosításai is bekerülnek; ha ugyanazt a mezőt módosítottátok, megkérdezzük, melyik maradjon. */
const MERGE_SKIP=new Set(['updatedAt','updatedBy','mutationId','baseUpdatedAt','createdAt','calEventId','_multi','er_post_n','x_foto_n']);
const FIELD_LABEL={name:'Projekt neve',client:'Ügyfél',venue:'Helyszín',eventType:'Rendezvény típusa',date:'Első nap',endDate:'Utolsó nap',startTime:'Kezdés',endTime:'Távozás',lastStartTime:'Utolsó nap kezdés',lastEndTime:'Utolsó nap távozás',contactName:'Kapcsolattartó',contactPhone:'Telefon',contactEmail:'E-mail',notes:'Jegyzetek',techPlan:'Technikai terv',crew:'Stáb',equipment:'Eszközök',fees:'Termelői díjak',status:'Állapot',stepsDone:'Lépések',lead:'Projektvezető',projectValue:'Büdzsé',budgetVal:'Termelői keret',budgetMode:'Termelői keret módja',deliveryLink:'Átadási link',deliveryNotes:'Átadási megjegyzés'};
async function conflictMerge(mine){
  const id=mine.id,base=(S.draftBase&&S.draftBase.id===id)?S.draftBase:null;let srv=null;
  try{const bt=await call('bootstrap');srv=(bt.projects||[]).find(x=>x.id===id)||null;}catch(e){}
  if(!srv){toast('Közben valaki más is módosította ezt a projektet, és nem sikerült betölteni az új változatot. Próbáld újra a mentést.',true);return;}
  const J=v=>v==null||v===''||(Array.isArray(v)&&!v.length)?'':typeof v==='object'?JSON.stringify(v):String(v),   // null / üres / szám-szöveg különbség nem módosítás
    i=S.projects.findIndex(x=>x.id===id);if(i>=0)S.projects[i]=srv;
  const theirs=prepDraft(srv),keys=new Set([...Object.keys(mine),...Object.keys(theirs)].filter(k=>!MERGE_SKIP.has(k)));
  const myChanged=[...keys].filter(k=>base?J(mine[k])!==J(base[k]):J(mine[k])!==J(theirs[k]));
  const both=base?myChanged.filter(k=>J(theirs[k])!==J(base[k])&&J(theirs[k])!==J(mine[k])):[];
  const merged=clone(theirs);myChanged.forEach(k=>{merged[k]=clone(mine[k]);});
  const who=srv.updatedBy||'valaki más';
  const finish=keepMine=>{const m=clone(merged);if(!keepMine)both.forEach(k=>{m[k]=clone(theirs[k]);});
    S.draftBase=clone(theirs);if(S.projectId===id){S.draft=m;S.dirty=true;}render(true);saveDraft();};
  if(S.me&&srv.updatedBy===S.me.name){finish(true);return;}   /* a saját korábbi (pl. automatikus / másik lapon történt) mentésed: nincs mit kérdezni, a mostani változatod marad */
  if(!both.length){finish(true);toast(`Közben ${who} is módosította a projektet – összefésültük a módosításaitokat és elmentettük.`);return;}
  const lbl=k=>FIELD_LABEL[k]||k;
  openModal('Közben módosult a projekt',`<p style="margin:0 0 8px"><b>${esc(who)}</b> is módosította ezt a projektet, amíg szerkesztetted. A többi módosítást összefésültük, de ezeket mindketten átírtátok:</p>
    <ul style="margin:0 0 6px 18px">${both.map(k=>`<li><b>${esc(lbl(k))}</b></li>`).join('')}</ul><p class="hint" style="margin:0">Melyik változat maradjon ezeknél?</p>`,
    {left:'<button type="button" class="btn outline" data-action="merge-theirs">Az övé</button>',cancelLabel:'Mégse',submitLabel:'Az enyém',submit:async()=>{closeModal();finish(true);}});
  MERGE_THEIRS=()=>{closeModal();finish(false);};
}
let MERGE_THEIRS=null;
function prepDraft(p){const d=clone(p);d.er_post_n=postN(d);d.x_foto_n=fotoN(d);try{if(d.status!=='atadva'&&roomOpEqFill(d))setTimeout(()=>{if(S.draft&&S.draft.id===d.id){S.dirty=true;autoSave(400);}},0);}catch(e){}if(!d.lead){const ids=[...new Set((d.crew||[]).map(a=>a.crewId))];if(ids.length===1)d.lead=ids[0];}try{syncFeesWithCrew(d);}catch(e){}return d;}
function budgetApply(saved){
  const i=S.projects.findIndex(p=>p.id===saved.id);if(i>=0)S.projects[i]=saved;
  if(S.projectId===saved.id){if(S.dirty){for(const k of ['budgetRequest','budgetMode','budgetVal','budgetFt','updatedAt'])S.draft[k]=saved[k];}else S.draft=prepDraft(saved);}render(true);
}
async function budgetDecision(id,approve){
  if(!isAdmin()||!S.draft)return;
  if(S.dirty){toast('Előbb mentsd el a módosításokat a Mentés gombbal.',true);return;}await SAVE_Q;
  try{const saved=await call('decideBudgetChange',{projectId:S.draft.id,id,approve});budgetApply(saved);toast(approve?'Termelői keret jóváhagyva':'Keretkérelem elutasítva');}catch(e){handleErr(e);}
}
async function budgetRequestModal(){
  if(!S.draft||S.me.role!=='editor')return;
  if(S.dirty){toast('Előbb mentsd el a módosításokat a Mentés gombbal.',true);return;}await SAVE_Q;
  const d=S.draft;
  openModal('Termelői keret módosítása',`<p>A javasolt keret az ügyvezető jóváhagyásával lép életbe.</p><div class="fields">${moneyField('budgetAmount','Javasolt termelői keret',budgetFt(d),{steps:false})}<div class="field full"><label for="m-budgetReason">Módosítás indoka</label><textarea class="inp" id="m-budgetReason" name="reason" maxlength="1500" rows="3"></textarea></div></div>`,{submitLabel:'Jóváhagyás kérése',submit:async fd=>{
    const amount=moneyVal(fd.get('budgetAmount')),reason=String(fd.get('reason')||'').trim();
    if(amount===''||reason.length<5){toast('Add meg az összeget és a módosítás rövid indokát.',true);return;}
    try{const saved=await call('requestBudgetChange',{projectId:d.id,baseUpdatedAt:d.updatedAt,amount,reason});closeModal();budgetApply(saved);toast('Keretmódosítás elküldve ügyvezetői jóváhagyásra');}catch(e){handleErr(e);}
  }});
}
/* Fix sorok a díjtáblázat végén: fuvar és étel. */
const FIXED_FEES=[['fuvar','Fuvar'],['etel','Étel'],['egyeb','']];   // az „egyéb” sor neve szabadon írható
/* Egyéb költségek: fuvar, étel, utánuk a szabadon elnevezhető sorok – mindig marad legalább egy üres sor a következő tételnek. */
const isOther=f=>f.kind==='fixed'&&/^egyeb/.test(f.key||'');
const otherEmpty=f=>!String(f.name||'').trim()&&!num(f.amount);
function orderFees(fees){
  fees=fees.slice();FIXED_FEES.filter(([k])=>k!=='egyeb').forEach(([k,n])=>{if(!fees.some(f=>f.kind==='fixed'&&f.key===k))fees.push({kind:'fixed',key:k,name:n,amount:'',rent:''});});
  let others=fees.filter(isOther),filled=others.filter(f=>!otherEmpty(f));
  const blank=others.find(otherEmpty)||{kind:'fixed',key:'',name:'',amount:'',rent:''};
  others=filled.concat([blank]);const used=new Set();others.forEach(f=>{if(!f.key||used.has(f.key)){let k=1;while(used.has(k===1?'egyeb':'egyeb'+k)||others.some(g=>g!==f&&g.key===(k===1?'egyeb':'egyeb'+k)))k++;f.key=k===1?'egyeb':'egyeb'+k;}used.add(f.key);});   // egyedi kulcs soronként
  return fees.filter(f=>f.kind!=='fixed').concat(fees.filter(f=>f.kind==='fixed'&&f.key==='ref'),['fuvar','etel'].map(k=>fees.find(f=>f.kind==='fixed'&&f.key===k)),others);
}
function syncFeesWithCrew(d){
  if(!canSeeFees())return;
  const ids=[...crewIds(d)],days=rowDays(d);let fees=(d.fees||[]).map(f=>Object.assign({},f)),added=0;
  const REF='Ajánlói jutalék',rolesOf=id=>{const r=[];if(d.lead===id)r.push('Projektvezető');(d.crew||[]).forEach(a=>{if(a.crewId===id&&a.role!==REF&&a.role!=='Értékesítő'&&!r.includes(a.role))r.push(a.role);});return r.join(' + ');};
  const refIds=[...new Set((d.crew||[]).filter(a=>a.role===REF).map(a=>a.crewId))];   // ajánlói jutalék → külön sor az Egyéb költségek között
  refIds.forEach(id=>{const c=crewById(id),nm=(c?c.name:'Szakember')+' ajánlói jutaléka';let f=fees.find(x=>x.kind==='fixed'&&x.key==='ref'&&x.refCrewId===id);if(f)f.name=nm;else fees.push({kind:'fixed',key:'ref',refCrewId:id,name:nm,amount:'',rent:''});});
  const onlyRef=id=>d.lead!==id&&!(d.crew||[]).some(a=>a.crewId===id&&a.role!==REF&&a.role!=='Értékesítő');   /* az értékesítő nem termelői díj: nem kerül a táblázatba (a jutaléka fent, az Értékesítés részben) */
  ids.forEach(id=>{if(onlyRef(id))return;const c=crewById(id);let f=fees.find(x=>x.crewId===id)||fees.find(x=>!x.crewId&&c&&x.name===c.name);
    if(!f){const post=isPostOnly(d,id),myDays=days>1&&!post?crewDaysOf(d,id):[];const nf={name:c?c.name:'',crewId:id,task:rolesOf(id),autoTask:true,amount:c&&num(c.dayRate)&&!post?num(c.dayRate)*(days>1?myDays.length:1):'',rent:''};
      if(days>1&&!post&&c&&num(c.dayRate)){nf.dayAmounts={};myDays.forEach(x=>nf.dayAmounts[x]=num(c.dayRate));}
      fees.push(nf);added++;}
    else{f.crewId=id;if(f.autoTask||!f.task)f.task=rolesOf(id),f.autoTask=true;}});
  if(days>1)fees.forEach(f=>{if(f.crewId&&!isPostOnly(d,f.crewId)&&!f.dayAmounts&&num(f.amount)){const ds=crewDaysOf(d,f.crewId),per=Math.floor(num(f.amount)/ds.length);f.dayAmounts={};ds.forEach((x,k)=>f.dayAmounts[x]=k===ds.length-1?num(f.amount)-per*(ds.length-1):per);}});   // több napos: a meglévő díj napokra bontva
  fees.forEach(f=>{if(f.crewId&&days>1&&!isPostOnly(d,f.crewId)&&f.dayAmounts)f.amount=feeDaySum(d,f);});
  fees=fees.filter(f=>!f.crewId||(ids.includes(f.crewId)&&!onlyRef(f.crewId))||num(f.amount)||num(f.rent));
  d.fees=orderFees(fees);
}
const rowDays=p=>{const r=pr(p);return r?diffDays(r.start,r.end)+1:1;};
/* Kézi mentés: elnavigálás előtt rákérdezünk a mentetlen módosításokra (Mentés és tovább / Elvetés / Mégse) */
function guard(fn,onCancel){
  if(!(S.dirty&&S.draft&&!ro())){fn();return;}
  const name=S.draft.name||'projekt';
  openModal('Mentetlen módosítások',`<p style="margin:0">A(z) <b>${esc(name)}</b> projekten mentetlen módosítások vannak. Elmented őket?</p>`,
    {left:'<button type="button" class="btn ghost" data-action="guard-discard">Elvetés</button>',cancelLabel:'Mégse',submitLabel:'💾 Mentés és tovább',submit:async()=>{GUARD_NEXT=null;closeModal();saveDraft();fn();}});
  GUARD_NEXT={fn,onCancel};
  const mr=$('modalRoot');const cancelBtn=mr&&mr.querySelector('[data-action="modal-cancel"],[data-action="modal-close"]');
  if(onCancel&&mr)mr.addEventListener('click',function h(e){if(e.target.closest('[data-action="modal-cancel"],[data-action="modal-close"],[data-action="modal-bg"]')&&GUARD_NEXT){const c=GUARD_NEXT.onCancel;GUARD_NEXT=null;mr.removeEventListener('click',h,true);setTimeout(c,0);}},true);
}
let GUARD_NEXT=null;
function discardDraft(){const id=S.draft&&S.draft.id,p=id&&projById(id);S.dirty=false;if(p){S.draft=prepDraft(p);S.draftBase=clone(S.draft);}else{S.projectId=null;S.draft=null;}renderChrome();}
/* Automatikus mentés: minden módosítás után rövid várakozással mentünk (gépelésnél kicsit később).
   A mentések sorban futnak (SAVE_Q), mindig a legfrissebb állapotot küldik, így a gyors kattintgatás sem veszít adatot. */
let AUTO_T=0;
function autoSave(delay){return;   // kézi mentés (Mentés gomb / Ctrl+S) – nincs automatikus mentés
  if(!S.draft||ro()||!S.dirty)return;clearTimeout(AUTO_T);AUTO_T=setTimeout(()=>{if(S.draft&&S.dirty&&!ro())saveDraft();},delay);}
function flushSave(){if(S.draft&&S.dirty&&!ro()){clearTimeout(AUTO_T);saveDraft();}}
/* Mentés azonnal a felületen (optimista), a háttérben sorban küldjük a szervernek.
   Így nem kell megvárni az Apps Scriptet; ha a mentés mégsem sikerül, visszakapod a módosításokat és szólunk. */
let SAVE_Q=Promise.resolve();
const SAVE_PENDING={};
function verifySavedFees(d,saved){
  if(!canSeeFees())return;
  const key=f=>f.kind==='fixed'?'fixed|'+f.key+'|'+(f.refCrewId||''):'crew|'+(f.crewId||f.name);
  for(const f of d.fees||[]){
    const actual=(saved.fees||[]).find(x=>key(x)===key(f));
    if(!actual&&!num(f.amount)&&!num(f.rent))continue;
    if(!actual||num(f.amount)!==num(actual.amount)||num(f.rent)!==num(actual.rent)||Object.keys(f.dayAmounts||{}).some(day=>num(f.dayAmounts[day])!==num((actual.dayAmounts||{})[day])))throw new Error('A szerver eltérő díjat igazolt vissza. A megadott összegek szerkeszthetők maradtak; frissítsd a háttérkódot, majd ments újra.');
  }
}
/* Kézi mentés (Mentés gomb, Ctrl+S): előbb a kötelező alapadatok. Az automatikus díjmentést ez nem akadályozza. */
/* Mentés előtt a éppen szerkesztett mező (amit még nem hagytál el) is bekerül: a blur kiváltja a változás-eseményt */
function commitActive(){const ae=document.activeElement;if(ae&&/^(INPUT|TEXTAREA)$/.test(ae.tagName)&&!ae.classList.contains('cmb-in'))ae.blur();}
function saveChecked(){commitActive();flushSave();}
/* Kötelező alapadatok: a hiányzó mezőkre ugrik és szól (a helyszíni munkára lépés előtt kötelező). */
function reqBlock(){
  const d=S.draft;if(!d||ro())return false;const miss=missingReq(d);if(!miss.length)return false;
  FOLD.basics=true;render(true);
  const el=reqEl(miss[0][0]);if(el){const dd=el.closest('details');if(dd)dd.open=true;el.scrollIntoView({block:'center',behavior:'smooth'});const inp=el.matches('input,select,textarea')?el:el.querySelector('input');if(inp)setTimeout(()=>inp.focus({preventScroll:true}),250);}
  toast('Előbb töltsd ki a kötelező alapadatokat: '+miss.map(x=>x[1]).join(', ')+'.',true);return true;
}
function saveDraft(){
  if(!S.draft||ro())return;
  const d=clone(S.draft);
  if(String(d.name||'').trim().length<2){toast('Add meg a projekt nevét.',true);return;}
  const i=S.projects.findIndex(x=>x.id===d.id),prev=i>=0?S.projects[i]:null;
  const local=Object.assign({},prev||{},d,{updatedAt:prev?prev.updatedAt:''});
  if(i>=0)S.projects[i]=local;else S.projects.push(local);
  S.dirty=false;S.saving=(S.saving||0)+1;SAVE_PENDING[d.id]=(SAVE_PENDING[d.id]||0)+1;
  S.cal.events={};S.savedFlash=0;render(true);
  SAVE_Q=SAVE_Q.then(async()=>{
    const payload=Object.assign({},d,{baseUpdatedAt:(projById(d.id)||{}).updatedAt||'',mutationId:uuid(),deferCal:true},finalSkipped(d)?{crewFinalSkip:true}:{});   // „saját felelősségre” kihagyott véglegesítés
    try{
      let saved;for(let k=0;;k++){try{saved=await call('saveProject',payload);break;}
        catch(e){if(k<2&&/Zárol|lock/i.test(errText(e))){toast('A szerver épp foglalt (más is ment) – újrapróbálom… ('+(k+1)+'/2)');await new Promise(r=>setTimeout(r,2000*(k+1)));continue;}throw e;}}   // foglalt szerver: pár másodperc múlva újrapróbáljuk (ugyanaz a mutationId, nem duplikál)
      normProj(saved);const current=projById(d.id);if(current)current.updatedAt=saved.updatedAt;
      verifySavedFees(d,saved);
      const newer=--SAVE_PENDING[d.id]>0;   // közben újabb mentés is indult erre a projektre
      const k=S.projects.findIndex(x=>x.id===d.id||x.id===saved.id);
      if(newer){if(k>=0)S.projects[k].updatedAt=saved.updatedAt;}
      else{if(k>=0)S.projects[k]=saved;else S.projects.push(saved);
        if(S.projectId===saved.id){S.draftBase=prepDraft(saved);if(!S.dirty){S.draft=prepDraft(saved);render(true);}}}   // a fix (üres) díjsorok is maradjanak meg
      S.cal.events={};syncCal(saved.id);projBroadcast(saved);
      S.savedFlash=1;clearTimeout(S._flashT);S._flashT=setTimeout(()=>{S.savedFlash=0;renderChrome();},1800);
    }catch(e){
      SAVE_PENDING[d.id]--;
      if(S.projectId===d.id&&!S.dirty){S.draft=clone(d);S.dirty=true;}   // a módosítások ne vesszenek el
      const m=errText(e);
      if(m.indexOf('CONFLICT')===0){setTimeout(()=>conflictMerge(d),0);
      }else{toast('Nem sikerült menteni: '+m,true);}
    }finally{S.saving--;render(true);}
  });
  return SAVE_Q;
}
function personList(p,cid){
  const c=crewById(cid);const lines=[`Eszközlista – ${p.name||'Projekt'}`,`${fmtRange(p)}${p.venue?' · '+p.venue:''}${p.startTime?' · kezdés '+p.startTime:''}`,'',((c&&c.name)||'?').toUpperCase()];
  const mine=(p.equipment||[]).filter(e=>e.crewId===cid).map(e=>({e,it:itemById(e.itemId)})).filter(x=>x.it);
  rentalsOf(p,cid).forEach(r=>lines.push(`☐ ${r.name} (${r.own?'saját':'bérelt'+(r.company?', '+r.company:'')})`));
  if(!mine.length&&!rentalsOf(p,cid).length)lines.push('(nincs nála eszköz)');
  mine.forEach(({e,it})=>lines.push(`☐ ${num(e.qty)}× ${it.name}${it.serial?' ('+it.serial+')':''}${it.location?' – '+it.location:''}`));
  return lines.join('\n');
}
function packingList(p){
  const lines=[`Pakolási lista – ${p.name||'Projekt'}`,`${fmtRange(p)}${p.venue?' · '+p.venue:''}${p.startTime?' · kezdés '+p.startTime:''}`,''];
  const eq=(p.equipment||[]).map(e=>({e,it:itemById(e.itemId)})).filter(x=>x.it);
  const line=({e,it})=>`☐ ${num(e.qty)}× ${it.name}${it.serial?' ('+it.serial+')':''}${it.location?' – '+it.location:''}`;
  const people=[...crewIds(p)];
  people.forEach(cid=>{const mine=eq.filter(x=>x.e.crewId===cid);if(!mine.length)return;const c=crewById(cid);lines.push(((c&&c.name)||'?').toUpperCase()+(c&&c.phone?' – '+c.phone:''));mine.forEach(x=>lines.push(line(x)));lines.push('');});
  const common=eq.filter(x=>!x.e.crewId||!people.includes(x.e.crewId));
  if(common.length){lines.push('KÖZÖS ESZKÖZÖK');common.forEach(x=>lines.push(line(x)));lines.push('');}
  [['SAJÁT ESZKÖZÖK',(p.rentals||[]).filter(r=>r.own)],['BÉRELT ESZKÖZÖK',(p.rentals||[]).filter(r=>!r.own)]].forEach(([tt,ls])=>{if(ls.length){lines.push(tt);ls.forEach(r=>{const c=crewById(r.crewId);lines.push(`☐ ${r.name}${r.company?' ('+r.company+')':''}${c?' – '+c.name:''}`);});lines.push('');}});
  const noEq=people.filter(cid=>!eq.some(x=>x.e.crewId===cid)).map(cid=>crewById(cid)).filter(Boolean);
  if(noEq.length){lines.push('STÁB (eszköz nélkül)');noEq.forEach(c=>lines.push(`• ${c.name}${c.phone?' – '+c.phone:''}`));}
  return lines.join('\n').trim();
}
async function copyText(t,label){
  try{await navigator.clipboard.writeText(t);toast(label||'Vágólapra másolva');}
  catch(e){const ta=document.createElement('textarea');ta.value=t;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand('copy');}catch(e2){}ta.remove();if(ok){toast(label||'Vágólapra másolva');return;}openModal('Másold ki',`<textarea class="inp copybox" id="copybox" readonly>${esc(t)}</textarea>`,{cancelLabel:'Bezárás'});const el=$('copybox');if(el){el.focus();el.select();}}
}
function arm(b,fn){
  if(b.dataset.armed){fn();return;}
  b.dataset.armed='1';const old=b.textContent;b.textContent='Biztosan? Kattints újra';b.classList.add('armed');
  setTimeout(()=>{if(b.isConnected){delete b.dataset.armed;b.textContent=old;b.classList.remove('armed');}},4000);
}
