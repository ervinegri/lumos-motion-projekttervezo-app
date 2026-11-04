/* ===================== ÉRTÉKESÍTÉS =====================
   Lehetőségek a szerződésig: Új érdeklődő → Ajánlat kiküldve → Tárgyalás → Szerződve / Elveszett.
   Az ügyvezető mindet látja (és szűrhet értékesítőre), az értékesítő csak a sajátjait. Szerződéskor projekt jön létre
   (Tervezés szakasz) – az értékesítő ezután csak azt látja, hogy szerződve lett, a projekt részleteit és a díjakat nem. */
const DEAL_STAGES=[['uj','Új érdeklődő','💡'],['ajanlat','Ajánlat kiküldve','📨'],['targyalas','Tárgyalás','🤝'],['nyert','Szerződve','✅'],['elveszett','Elveszett','✕']];
const DEAL_OPEN=['uj','ajanlat','targyalas'],DEAL_CHANCE={uj:10,ajanlat:30,targyalas:60};
const DEAL_SOURCES=['Ajánlás','Visszatérő ügyfél','Weboldal','E-mail / telefon','Közösségi média','Rendezvényen','Hideg megkeresés','Egyéb'];
const dealLbl=s=>(DEAL_STAGES.find(x=>x[0]===s)||[,s])[1];
const dealById=id=>(S.deals||[]).find(d=>d.id===id);
const dealVal=d=>Math.max(0,Math.round(+d.value||0));
const dealChance=d=>d.chance==null||d.chance===''?(DEAL_CHANCE[d.stage]??0):+d.chance;
S.salesF=S.salesF||{q:'',owner:'',old:false};

/* Értékesítők a szűrőhöz és a kiosztáshoz: az ügyvezető (saját lehetőségei), az értékesítők, és akinek van lehetősége */
function salesOwners(deals){const m=new Map();if(S.me&&S.me.id)m.set(S.me.id,'⭐ '+(S.me.name||'Én')+' (saját)');
  (S.salesPeople||[]).forEach(x=>{if(x.userId&&!m.has(x.userId))m.set(x.userId,'👤 '+x.name);});
  (deals||[]).forEach(d=>{if(d.ownerId&&!m.has(d.ownerId))m.set(d.ownerId,'👤 '+(d.ownerName||'?'));});
  return [...m.entries()];}
function viewSales(){
  const f=S.salesF,T=todayISO(),all=(S.deals||[]).slice(),admin=isAdmin();
  const owners=salesOwners(all);
  let L=all.filter(d=>!f.owner||d.ownerId===f.owner);
  if(f.q.trim())L=L.filter(d=>fold([d.title,d.client,d.contactName,d.venue,d.note,d.ownerName].join(' ')).includes(fold(f.q.trim())));
  const open=L.filter(d=>DEAL_OPEN.includes(d.stage)),won=L.filter(d=>d.stage==='nyert'),lost=L.filter(d=>d.stage==='elveszett');
  const sum=a=>a.reduce((s,d)=>s+dealVal(d),0),weighted=open.reduce((s,d)=>s+dealVal(d)*dealChance(d)/100,0);
  const m=T.slice(0,7),wonM=won.filter(d=>String(d.wonAt||'').slice(0,7)===m),rate=won.length+lost.length?Math.round(won.length*100/(won.length+lost.length)):null;
  const late=open.filter(d=>d.nextDate&&d.nextDate<T).length,noNext=open.filter(d=>!d.nextStep&&!d.nextDate).length;
  const cutoff=new Date(Date.now()-60*864e5).toISOString().slice(0,10),recent=d=>f.old||String(d.closedAt||d.wonAt||d.updatedAt||'').slice(0,10)>=cutoff;
  const byStage=s=>L.filter(d=>d.stage===s&&(DEAL_OPEN.includes(s)||recent(d))).sort((a,b)=>DEAL_OPEN.includes(s)?String(a.nextDate||'9999').localeCompare(String(b.nextDate||'9999'))||String(a.eventDate||'9999').localeCompare(String(b.eventDate||'9999')):String(b.closedAt||b.wonAt||'').localeCompare(String(a.closedAt||a.wonAt||'')));
  const hidden=L.filter(d=>!DEAL_OPEN.includes(d.stage)&&!recent(d)).length;
  const col=([s,lbl,ic])=>{const arr=byStage(s);return `<section class="dl-col dl-${s}" data-stage="${s}"><header class="dl-colh"><span>${ic} ${lbl}</span><span class="dl-colc">${arr.length}${DEAL_OPEN.includes(s)||s==='nyert'?`<small>${arr.length?' · '+ftFmt(sum(arr)):''}</small>`:''}</span></header>
    <div class="dl-list">${arr.map(dealCard).join('')||(DEAL_OPEN.includes(s)?'':`<p class="dl-empty">—</p>`)}</div>${DEAL_OPEN.includes(s)?`<button class="dl-add" type="button" data-action="deal-new" data-stage="${s}">＋ Hozzáadás</button>`:''}</section>`;};
  return `<div class="page-head"><div class="grow"><h2>Értékesítés</h2><p class="sub">Lehetőségek a szerződésig · húzd a kártyát a következő oszlopba${admin?'':' · csak a saját lehetőségeidet látod'}</p></div>
      <button class="btn primary" type="button" data-action="deal-new">+ Új lehetőség</button></div>
    <div class="tiles fin-tiles">
      <div class="tile"><div class="tile-n">${open.length}</div><div class="tile-l">nyitott lehetőség · ${ftFmt(sum(open))}${late?` · <b class="bad-txt">${late} lejárt teendő</b>`:noNext?` · ${noNext} teendő nélkül`:''}</div></div>
      <div class="tile" data-tip="A nyitott lehetőségek értéke az esélyükkel súlyozva"><div class="tile-n">${ftFmt(weighted)}</div><div class="tile-l">várható bevétel (súlyozott)</div></div>
      <div class="tile${wonM.length?' ok':''}"><div class="tile-n">${ftFmt(sum(wonM))}</div><div class="tile-l">szerződve ebben a hónapban · ${wonM.length} db</div></div>
      ${(()=>{const m=todayISO().slice(0,7),L=(S.salesPeople||[]).map(x=>(x.comm||{})[m]).filter(Boolean),base=L.reduce((s,x)=>s+num(x.base),0),amt=L.reduce((s,x)=>s+num(x.amount),0);
        return `<div class="tile${amt?' ok':''}" data-tip="A ténylegesen kifizetett nettó ügyfélbevétel után, sávosan (a továbbszámlázott költségek nélkül)"><div class="tile-n">${ftFmt(amt)}</div><div class="tile-l">jutalék ebben a hónapban · alap: ${ftFmt(base)}</div></div>`;})()}
    </div>
    <div class="toolbar"><input class="inp search" id="q-sales" type="search" placeholder="Keresés: név, ügyfél, kapcsolattartó…" value="${esc(f.q)}" aria-label="Keresés">
      ${admin?`<label class="sales-own"><span>Értékesítő:</span><select class="inp" id="sales-owner" aria-label="Kinek a lehetőségeit nézed"><option value="">👥 Mindenki</option>${owners.map(([id,n])=>`<option value="${esc(id)}"${f.owner===id?' selected':''}>${esc(n||'?')}</option>`).join('')}</select></label>`:''}</div>
    <div class="dl-board">${DEAL_STAGES.map(col).join('')}</div>
    ${hidden||f.old?`<p class="hint"><button class="linkbtn" type="button" data-action="sales-old">${f.old?'Csak az elmúlt 60 nap lezártjai':`Korábban lezárt lehetőségek mutatása (${hidden})`}</button></p>`:''}`;
}
function dealCard(d){const T=todayISO(),od=d.nextDate&&d.nextDate<T&&DEAL_OPEN.includes(d.stage),td=d.nextDate===T;
  const foot=d.stage==='nyert'?`<div class="dl-won">✅ Szerződve${d.wonAt?' · '+esc(fmtShort(d.wonAt)):''}</div>`:d.stage==='elveszett'?`<div class="dl-lost">✕ ${esc(d.lostReason||'Elveszett')}</div>`
    :(d.nextStep||d.nextDate)?`<div class="dl-next${od?' late':td?' today':''}">➜ ${esc(d.nextStep||'Teendő')}${d.nextDate?` · <b>${od?'lejárt: ':td?'ma':''}${td?'':esc(fmtShort(d.nextDate))}</b>`:''}</div>`:`<div class="dl-next none">➜ nincs következő lépés</div>`;
  return `<article class="dl-card" draggable="${d.stage==='nyert'?'false':'true'}" data-deal="${esc(d.id)}" data-action="deal-open" data-id="${esc(d.id)}" tabindex="0">
    <div class="dl-t">${esc(d.title)}</div>${d.contactName||d.client?`<div class="dl-c">${esc(d.contactName||d.client)}</div>`:''}
    <div class="dl-m"><span>${d.eventDate?'📅 '+esc(fmtShort(d.eventDate)):'<span class="muted">nincs dátum</span>'}</span><b>${dealVal(d)?ftFmt(dealVal(d)):'<span class="muted">?</span>'}</b></div>
    ${foot}${DEAL_OPEN.includes(d.stage)||isAdmin()?`<div class="dl-f">${DEAL_OPEN.includes(d.stage)?`<span class="dl-ch" data-tip="Esély a szerződésre">${dealChance(d)}%</span>`:'<span></span>'}${isAdmin()&&d.ownerName?`<span class="dl-own-n">👤 ${esc(d.ownerName)}</span>`:''}</div>`:''}</article>`;}

function dealModal(d0,preset){const d=Object.assign({stage:'uj'},d0||{},preset||{}),isNew=!d0,won=d.stage==='nyert';
  const cl=knownClients('').map(c=>c.company),stOpts=DEAL_STAGES.filter(x=>x[0]!=='nyert').map(x=>[x[0],x[2]+' '+x[1]]);
  openModal(isNew?'+ Új lehetőség':(won?'✅ ':'')+(d.title||'Lehetőség'),`<div class="fields">
    ${mf('dTitle','Megnevezés',{v:d.title,full:true,ph:'pl. Mlinárik – tavaszi konferencia felvétele',max:160})}
    <div class="field"><label for="m-dClient">Ügyfél</label><input class="inp" id="m-dClient" name="dClient" list="dl-clients" value="${esc(d.client||'')}" maxlength="160" autocomplete="off" placeholder="cégnév vagy név"><datalist id="dl-clients">${cl.map(c=>`<option value="${esc(c)}">`).join('')}</datalist></div>
    ${ms('dType','Rendezvény típusa',EVENT_TYPES,d.eventType||'',{empty:'—'})}
    <div class="field"><label for="m-dCName">Kapcsolattartó <span class="muted" style="font-weight:500;font-size:12px">– keresés a HubSpotban</span></label><input class="inp" id="m-dCName" name="dCName" value="${esc(d.contactName||'')}" maxlength="120" autocomplete="off" placeholder="kezdd el gépelni a nevet vagy a céget"></div>
    ${mf('dCEmail','E-mail',{v:d.contactEmail,type:'email',max:160})}
    ${mf('dCPhone','Telefon',{v:d.contactPhone,max:40})}
    <div class="field"><label for="m-dVenue">Helyszín <a class="linkbtn" id="dl-map" href="${d.venue?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(d.venue):'#'}" target="_blank" rel="noopener" style="font-size:12px;margin-left:6px${d.venue?'':';display:none'}">📍 Térkép ↗</a></label><input class="inp" id="m-dVenue" name="dVenue" value="${esc(d.venue||'')}" maxlength="200" autocomplete="off" placeholder="kezdd el gépelni: helyszín neve vagy cím"></div>
    ${mf('dDate','Rendezvény dátuma',{v:d.eventDate,type:'date'})}
    ${moneyField('dValue','Várható érték (nettó)',d.value==null?'':d.value,{steps:false,ph:'pl. 450 000'})}
    ${won?'':ms('dStage','Szakasz',stOpts,d.stage)}
    ${won?'':`<div class="field"><label for="m-dChance">Esély (%)</label><input class="inp" id="m-dChance" name="dChance" type="number" min="0" max="100" step="5" value="${dealChance(d)}"></div>`}
    ${ms('dSource','Honnan jött?',DEAL_SOURCES,d.source||'',{empty:'—'})}
    ${won?'':`<div class="field full dl-nextf"><label for="m-dNext">Következő lépés</label><div class="dl-nextrow"><input class="inp" id="m-dNext" name="dNext" value="${esc(d.nextStep||'')}" maxlength="200" placeholder="pl. ajánlat utánkövetése telefonon"><input class="inp" id="m-dNextD" name="dNextD" type="date" value="${esc(d.nextDate||'')}" aria-label="Mikor"></div></div>`}
    <div class="field full" id="dl-lostf"${d.stage==='elveszett'?'':' hidden'}><label for="m-dLost">Miért veszett el?</label><input class="inp" id="m-dLost" name="dLost" value="${esc(d.lostReason||'')}" maxlength="300" placeholder="pl. drága volt, más céget választottak, elmarad a rendezvény"></div>
    <div class="field full"><label for="m-dNote">Jegyzet</label><textarea class="inp" id="m-dNote" name="dNote" rows="3" maxlength="3000" placeholder="igények, egyeztetett részletek, ajánlat verziói…">${esc(d.note||'')}</textarea></div>
    ${won?`<div class="field full"><p class="hint" style="margin:0">✅ Szerződve ${d.wonAt?esc(fmtShort(d.wonAt)):''} – a projekt elkészült, a további részleteket a projektnél kezeli a csapat.${isAdmin()&&d.projectId&&projById(d.projectId)?` <button class="linkbtn" type="button" data-action="deal-proj" data-id="${esc(d.projectId)}">Projekt megnyitása →</button>`:''}</p></div>`:''}
    ${isAdmin()&&!won?`<div class="field"><label for="m-dOwner">Értékesítő</label><select class="inp" id="m-dOwner" name="dOwner">${salesOwners(S.deals||[]).map(([id,n])=>`<option value="${esc(id)}"${(d.ownerId||S.salesF.owner||(S.me&&S.me.id))===id?' selected':''}>${esc(n)}</option>`).join('')}</select></div>`:''}
    ${!isNew?`<div class="field full"><p class="hint" style="margin:0">${esc(d.ownerName||'')}${d.createdAt?' · felvéve: '+esc(String(d.createdAt).slice(0,10)):''}${d.updatedAt?' · módosítva: '+esc(String(d.updatedAt).slice(0,16).replace('T',' '))+(d.updatedBy?' ('+esc(d.updatedBy)+')':''):''}</p></div>`:''}
  </div>`,{left:!isNew&&!won?`<button type="button" class="btn danger small" data-action="deal-del" data-id="${esc(d.id)}">Törlés</button>${['uj','ajanlat'].includes(d.stage)?'':`<button type="button" class="btn primary small dl-winbtn" data-action="deal-win" data-id="${esc(d.id)}">✅ Szerződve</button>`}`:'',submitLabel:'Mentés',submit:async fd=>{
    const nd=Object.assign({},d0||{},{id:d.id||'',title:String(fd.get('dTitle')||'').trim(),client:String(fd.get('dClient')||'').trim(),eventType:fd.get('dType')||'',contactName:String(fd.get('dCName')||'').trim(),contactEmail:String(fd.get('dCEmail')||'').trim(),contactPhone:String(fd.get('dCPhone')||'').trim(),
      venue:String(fd.get('dVenue')||'').trim(),eventDate:fd.get('dDate')||'',value:moneyVal(fd.get('dValue')),source:fd.get('dSource')||'',note:String(fd.get('dNote')||'').trim()});
    if(fd.get('dOwner'))nd.ownerId=fd.get('dOwner');   // az ügyvezető kioszthatja egy értékesítőnek (vagy magának)
    if(!won){nd.stage=fd.get('dStage')||'uj';nd.chance=fd.get('dChance')===''?'':Number(fd.get('dChance'));nd.nextStep=String(fd.get('dNext')||'').trim();nd.nextDate=fd.get('dNextD')||'';nd.lostReason=String(fd.get('dLost')||'').trim();}
    if(nd.title.length<2){toast('Add meg a lehetőség nevét.',true);$('m-dTitle').focus();return;}
    if(nd.stage==='elveszett'&&nd.lostReason.length<3){toast('Írd be röviden, miért veszett el.',true);$('dl-lostf').hidden=false;$('m-dLost').focus();return;}
    try{const r=await call('saveDeal',nd);S.deals=r.deals||S.deals;closeModal();render(true);toast(isNew?'Lehetőség felvéve':'Mentve');}catch(e){handleErr(e);}}});
  const mb=document.querySelector('#modalRoot .mbox');if(mb)mb.classList.add('mbox-wide');}

function dealWinModal(d){
  openModal('✅ Szerződve – '+d.title,`<p style="margin:0 0 10px">Gratulálok! 🎉 Mentés után a lehetőségből <b>projekt</b> lesz a Tervezés szakaszban, és bekerül a naptárba. A projekt további részleteit (stáb, eszközök, díjak) a csapat kezeli.</p><div class="fields">
    ${mf('wTitle','Projekt neve',{v:d.title,full:true,max:160})}
    ${moneyField('wValue','Szerződött összeg (nettó)',dealVal(d)||'',{steps:false})}
    ${mf('wDate','Rendezvény (első) napja',{v:d.eventDate,type:'date'})}</div>`,{submitLabel:'✅ Szerződve – projekt létrehozása',submit:async fd=>{
    const value=moneyVal(fd.get('wValue')),date=fd.get('wDate')||'',title=String(fd.get('wTitle')||'').trim();
    if(!value){toast('Add meg a szerződött összeget.',true);return;}if(!date){toast('Add meg a rendezvény napját.',true);return;}
    try{const r=await call('winDeal',{id:d.id,value,eventDate:date,title});S.deals=r.deals||S.deals;closeModal();render(true);toast('Szerződve – a projekt elkészült (Tervezés).');
      if(isAdmin()&&typeof load==='function')setTimeout(()=>{try{load(true);}catch(x){}},300);}catch(e){handleErr(e);}}});}

async function dealMove(id,stage){const d=dealById(id);if(!d||d.stage===stage)return;
  if(d.stage==='nyert'){toast('Szerződött lehetőséget nem lehet visszahúzni.',true);return;}
  if(stage==='nyert'){dealWinModal(d);return;}
  if(stage==='elveszett'){dealModal(d,{stage:'elveszett'});setTimeout(()=>{const x=$('m-dLost');if(x)x.focus();},50);return;}
  const nd=Object.assign({},d,{stage});if(d.chance==null||d.chance===''||+d.chance===DEAL_CHANCE[d.stage])nd.chance=DEAL_CHANCE[stage];
  const prev=S.deals;S.deals=S.deals.map(x=>x.id===id?nd:x);render(true);
  try{const r=await call('saveDeal',nd);S.deals=r.deals||S.deals;render(true);toast(dealLbl(stage)+': '+d.title);}catch(e){S.deals=prev;render(true);handleErr(e);}}

Object.assign(ACT,{
  'deal-new':b=>dealModal(null,b&&b.dataset.stage?{stage:b.dataset.stage}:null),
  'deal-open':b=>{if(S._dragDeal)return;const d=dealById(b.dataset.id);if(d)dealModal(d);},
  'deal-win':b=>{const d=dealById(b.dataset.id);if(d){closeModal();dealWinModal(d);}},
  'deal-del':b=>{const d=dealById(b.dataset.id);if(!d)return;confirmModal('Lehetőség törlése','Biztosan törlöd: „'+d.title+'”? Ha csak nem jött össze, inkább tedd az Elveszett oszlopba – így a nyerési arány is pontos marad.','Törlés',async()=>{try{const r=await call('deleteDeal',{id:d.id});S.deals=r.deals||S.deals;render(true);toast('Törölve');}catch(e){handleErr(e);}});},
  'deal-proj':b=>{closeModal();S.tab='projektek';if(typeof openProject==='function')openProject(b.dataset.id);},
  'sales-owner':b=>{S.salesF.owner=b.dataset.id||'';render(true);},
  'sales-old':()=>{S.salesF.old=!S.salesF.old;render(true);}
});
document.addEventListener('input',e=>{if(e.target&&e.target.id==='q-sales'){S.salesF.q=e.target.value;const pos=e.target.selectionStart;render(true);const i=$('q-sales');if(i){i.focus();try{i.setSelectionRange(pos,pos);}catch(x){}}}});
document.addEventListener('change',e=>{const t=e.target;if(!t)return;
  if(t.id==='m-dStage'){const lf=$('dl-lostf');if(lf)lf.hidden=t.value!=='elveszett';const ch=$('m-dChance');if(ch&&DEAL_CHANCE[t.value]!=null)ch.value=DEAL_CHANCE[t.value];if(t.value==='elveszett'&&ch)ch.value=0;}
  if(t.id==='m-dClient'){const c=knownClients('').find(x=>fold(x.company)===fold(t.value.trim()));if(c){[['m-dCName',c.name],['m-dCEmail',c.email],['m-dCPhone',c.phone]].forEach(([id,v])=>{const el=$(id);if(el&&!el.value&&v)el.value=v;});}}});
/* Húzd és ejtsd: a kártya a másik oszlopba kerül (Szerződve: projekt létrehozása, Elveszett: ok megadása) */
document.addEventListener('dragstart',e=>{const c=e.target.closest&&e.target.closest('.dl-card');if(!c)return;S._dragDeal=c.dataset.deal;c.classList.add('drag');try{e.dataTransfer.setData('text/plain',c.dataset.deal);e.dataTransfer.effectAllowed='move';}catch(x){}});
document.addEventListener('dragend',e=>{document.querySelectorAll('.dl-card.drag').forEach(x=>x.classList.remove('drag'));document.querySelectorAll('.dl-col.over').forEach(x=>x.classList.remove('over'));setTimeout(()=>{S._dragDeal='';},50);});
document.addEventListener('dragover',e=>{const col=e.target.closest&&e.target.closest('.dl-col');if(!col||!S._dragDeal)return;e.preventDefault();document.querySelectorAll('.dl-col.over').forEach(x=>{if(x!==col)x.classList.remove('over');});col.classList.add('over');});
document.addEventListener('drop',e=>{const col=e.target.closest&&e.target.closest('.dl-col');if(!col||!S._dragDeal)return;e.preventDefault();col.classList.remove('over');const id=S._dragDeal;S._dragDeal='';dealMove(id,col.dataset.stage);});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.classList&&e.target.classList.contains('dl-card')){const d=dealById(e.target.dataset.id);if(d)dealModal(d);}});

/* Lehetőség ablak: kapcsolattartó a HubSpotból (név, e-mail, telefon, és ha üres, az ügyfél cége) */
let DCT_ITEMS=[],DCT_SEQ=0,DCT_T=0;
async function dctSearch(input){const q=input.value.trim(),my=++DCT_SEQ,client=(($('m-dClient')||{}).value||'').trim();
  if(q.length<2&&client.length<2){pickShow(input,'<div class="hs-empty">Kezdd el gépelni a nevet vagy a céget – a HubSpotban keresek.</div>');return;}
  pickShow(input,searchingHtml('Keresés a HubSpotban'));
  try{const r=await call('hubspotContacts',q.length>=2?{q}:{q:'',client});if(my!==DCT_SEQ||document.activeElement!==input)return;
    DCT_ITEMS=(r||[]).slice(0,12);
    pickShow(input,DCT_ITEMS.length?DCT_ITEMS.map((c,i)=>`<button type="button" class="hs-item dct-item" data-dct="${i}"><b>${esc(c.name||c.email)}</b><small>${esc([c.company,c.title,c.phone,c.email].filter(Boolean).join(' · '))}</small></button>`).join(''):`<div class="hs-empty">${q.length>=2?'Nincs találat a HubSpotban – a beírt név marad.':'Ennél az ügyfélnél nincs kapcsolattartó a HubSpotban.'}</div>`);}
  catch(e){if(my===DCT_SEQ&&document.activeElement===input)pickShow(input,`<div class="hs-empty bad-txt">${esc(errText(e))}</div>`);}}
document.addEventListener('focusin',e=>{if(e.target.id==='m-dCName')dctSearch(e.target);});
document.addEventListener('input',e=>{if(e.target.id==='m-dCName'){clearTimeout(DCT_T);const t=e.target;DCT_T=setTimeout(()=>dctSearch(t),350);}
  if(e.target.id==='m-dVenue'){const m=$('dl-map'),v=e.target.value.trim();if(m){m.style.display=v?'':'none';m.href=v?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(v):'#';}}});
document.addEventListener('mousedown',e=>{const it=e.target.closest&&e.target.closest('.dct-item');if(!it)return;e.preventDefault();e.stopPropagation();const c=DCT_ITEMS[Number(it.dataset.dct)];pickClose();if(!c)return;
  const set=(id,v,force)=>{const x=$(id);if(x&&v&&(force||!x.value.trim()))x.value=v;};
  set('m-dCName',c.name,true);set('m-dCEmail',c.email,true);set('m-dCPhone',c.phone,true);set('m-dClient',c.company,false);
  toast('Kapcsolattartó kitöltve a HubSpotból');},true);
document.addEventListener('focusout',e=>{if(e.target.id==='m-dCName')setTimeout(()=>{if((!document.activeElement||document.activeElement.id!==e.target.id)&&$('hsBox')&&$('hsBox').querySelector('.dct-item,.hs-empty'))pickClose();},150);});

document.addEventListener('change',e=>{if(e.target.id==='sales-owner'){S.salesF.owner=e.target.value;render(true);}});
