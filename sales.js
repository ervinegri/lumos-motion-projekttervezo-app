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
      <button class="btn outline" type="button" data-action="ark-open" title="Árkalkulátor: rendezvényvideó és előadásrögzítés">🧮 Árkalkulátor</button>
      <button class="btn primary" type="button" data-action="deal-new">+ Új lehetőség</button></div>
    <div class="tiles fin-tiles">
      <div class="tile"><div class="tile-n">${open.length}</div><div class="tile-l">nyitott lehetőség · ${ftFmt(sum(open))}${late?` · <b class="bad-txt">${late} lejárt teendő</b>`:noNext?` · ${noNext} teendő nélkül`:''}</div></div>
      <div class="tile" data-tip="A nyitott lehetőségek értéke az esélyükkel súlyozva"><div class="tile-n">${ftFmt(weighted)}</div><div class="tile-l">várható bevétel (súlyozott)</div></div>
      <div class="tile${wonM.length?' ok':''}"><div class="tile-n">${ftFmt(sum(wonM))}</div><div class="tile-l">szerződve ebben a hónapban · ${wonM.length} db</div></div>
      ${(()=>{const m=todayISO().slice(0,7),L=(S.salesPeople||[]).map(x=>(x.comm||{})[m]).filter(Boolean),base=L.reduce((s,x)=>s+num(x.base),0),amt=L.reduce((s,x)=>s+num(x.amount),0);
        return `<div class="tile${amt?' ok':''}" data-tip="A ténylegesen kifizetett nettó ügyfélbevétel után, sávosan (a továbbszámlázott költségek nélkül)"><div class="tile-n">${ftFmt(amt)}</div><div class="tile-l">jutalék ebben a hónapban · alap: ${ftFmt(base)}</div></div>`;})()}
    </div>
    <div class="toolbar"><input class="inp search" id="q-sales" type="search" placeholder="Keresés: név, ügyfél, kapcsolattartó…" value="${esc(f.q)}" aria-label="Keresés">
      ${admin?`<label class="sales-own"><span>Értékesítő:</span><select class="inp" id="sales-owner" data-cmb="Válassz értékesítőt…" aria-label="Kinek a lehetőségeit nézed"><option value="__all"${f.owner?'':' selected'}>👥 Mindenki</option>${owners.map(([id,n])=>`<option value="${esc(id)}"${f.owner===id?' selected':''}>${esc(n||'?')}</option>`).join('')}</select></label>`:''}</div>
    <div class="dl-board">${DEAL_STAGES.map(col).join('')}</div>
    ${hidden||f.old?`<p class="hint"><button class="linkbtn" type="button" data-action="sales-old">${f.old?'Csak az elmúlt 60 nap lezártjai':`Korábban lezárt lehetőségek mutatása (${hidden})`}</button></p>`:''}`;
}
function dealCard(d){const T=todayISO(),od=d.nextDate&&d.nextDate<T&&DEAL_OPEN.includes(d.stage),td=d.nextDate===T;
  const foot=d.stage==='nyert'?`<div class="dl-won">✅ Szerződve${d.wonAt?' · '+esc(fmtShort(d.wonAt)):''}</div>`:d.stage==='elveszett'?`<div class="dl-lost">✕ ${esc(d.lostReason||'Elveszett')}</div>`
    :(d.nextStep||d.nextDate)?`<div class="dl-next${od?' late':td?' today':''}">➜ ${esc(d.nextStep||'Teendő')}${d.nextDate?` · <b>${od?'lejárt: ':td?'ma':''}${td?'':esc(fmtShort(d.nextDate))}</b>`:''}</div>`:`<div class="dl-next none">➜ nincs következő lépés</div>`;
  return `<article class="dl-card" draggable="${d.stage==='nyert'?'false':'true'}" data-deal="${esc(d.id)}" data-action="deal-open" data-id="${esc(d.id)}" tabindex="0">
    <div class="dl-t">${esc(d.title)}</div>${d.contactName?`<div class="dl-c"><button type="button" class="linkbtn dl-hs" data-action="hs-contact" data-name="${esc(d.contactName)}" data-email="${esc(d.contactEmail||'')}" data-company="${esc(d.client||'')}" title="${esc(d.contactName)} – megnyitás a HubSpotban">${esc(d.contactName)} ↗</button></div>`:d.client?`<div class="dl-c">${esc(d.client)}</div>`:''}
    ${d.services?`<div class="dl-sv">${String(d.services).split(',').map(x=>x.trim()).filter(Boolean).map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}
    <div class="dl-m"><span>${d.eventDate?'📅 '+esc(fmtShort(d.eventDate)):'<span class="muted">nincs dátum</span>'}</span><b>${dealVal(d)?ftFmt(dealVal(d)):'<span class="muted">?</span>'}</b></div>
    ${foot}${DEAL_OPEN.includes(d.stage)||isAdmin()?`<div class="dl-f">${DEAL_OPEN.includes(d.stage)?`<span class="dl-ch" data-tip="Esély a szerződésre">${dealChance(d)}%</span>`:'<span></span>'}${isAdmin()&&d.ownerName?`<span class="dl-own-n">👤 ${esc(d.ownerName)}</span>`:''}</div>`:''}</article>`;}

/* Új lehetőségnél: milyen szolgáltatások jöhetnek szóba (többet is lehet) */
const DEAL_SERVICES=['Előadásrögzítés','Élő közvetítés (stream)','Kreatív videózás','Aftermovie / összefoglaló videó','Interjúk / imázsfilm','Short videók','Fotózás','Drónfelvétel','Videóvágás / utómunka','Vizuál-, hang- és fénytechnika','Egyéb'];
function dealModal(d0,preset){const d=Object.assign({stage:'uj'},d0||{},preset||{}),isNew=!d0,won=d.stage==='nyert';if(isNew&&!d.id)d.id=uuid();   // az új lehetőség azonosítója már itt megvan: újrapróbálkozáskor sem jön létre kétszer
  const cl=knownClients('').map(c=>c.company),stOpts=DEAL_STAGES.filter(x=>x[0]!=='nyert').map(x=>[x[0],x[2]+' '+x[1]]);
  openModal(isNew?'+ Új lehetőség':(won?'✅ ':'')+(d.title||'Lehetőség'),`<div class="fields">
    ${mf('dTitle','Megnevezés',{v:d.title,full:true,ph:'pl. Mlinárik – tavaszi konferencia felvétele',max:160})}
    <div class="field"><label for="m-dCName">Kapcsolattartó <span class="muted" style="font-weight:500;font-size:12px">– keresés a HubSpotban</span>${d.contactName?` <button type="button" class="linkbtn" data-action="hs-contact" style="font-size:12px;margin-left:6px">↗ Megnyitás a HubSpotban</button>`:''}</label><input class="inp" id="m-dCName" name="dCName" value="${esc(d.contactName||'')}" maxlength="120" autocomplete="off" placeholder="kezdd el gépelni a nevet vagy a céget"></div>
    ${mf('dCEmail','E-mail',{v:d.contactEmail,type:'email',max:160})}
    <div class="field"><label for="m-dClient">Cég</label><input class="inp" id="m-dClient" name="dClient" value="${esc(d.client||'')}" maxlength="160" autocomplete="off" placeholder="Kezdd el gépelni a cégnevet…"></div>
    ${ms('dType','Rendezvény típusa',EVENT_TYPES,d.eventType||'',{empty:'—',cmb:'Válassz típust…'})}
    ${(()=>{const cur=String(d.services||'').split(',').map(x=>x.trim()).filter(Boolean);return mselField('dServices','Szóba jövő szolgáltatások',DEAL_SERVICES.concat(cur.filter(x=>!DEAL_SERVICES.includes(x))),cur,'Válaszd ki, mik jöhetnek szóba (többet is lehet)…',true).replace('<div class="field"','<div class="field full"');})()}
    ${phoneField({name:'dCPhone',value:d.contactPhone||''})}
    <div class="field"><label for="m-dVenue">Helyszín <a class="linkbtn" id="dl-map" href="${d.venue?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(d.venue):'#'}" target="_blank" rel="noopener" style="font-size:12px;margin-left:6px${d.venue?'':';display:none'}">📍 Térkép ↗</a></label><input class="inp" id="m-dVenue" name="dVenue" value="${esc(d.venue||'')}" maxlength="200" autocomplete="off" placeholder="kezdd el gépelni: helyszín neve vagy cím"></div>
    ${mf('dDate','Rendezvény dátuma',{v:d.eventDate,type:'date'})}
    ${moneyField('dValue','Várható érték (nettó)',d.value==null?'':d.value,{steps:false,ph:'pl. 450 000'})}
    ${won?'':ms('dStage','Szakasz',stOpts,d.stage)}
    ${won?'':`<div class="field"><label for="m-dChance">Esély (%)</label><input class="inp" id="m-dChance" name="dChance" type="number" min="0" max="100" step="5" value="${dealChance(d)}"></div>`}
    ${ms('dSource','Honnan jött? <span class="muted" style="font-weight:500;font-size:12px">– a HubSpotból</span>',DEAL_SOURCES,d.source||'',{empty:'—',cmb:'Honnan jött?…'})}
    ${won?'':`<div class="field full dl-nextf"><label for="m-dNext">Következő lépés és dátuma <span class="req-star">*</span></label><div class="dl-nextrow"><input class="inp" id="m-dNext" name="dNext" value="${esc(d.nextStep||'')}" maxlength="200" placeholder="pl. ajánlat utánkövetése telefonon"><input class="inp" id="m-dNextD" name="dNextD" type="date" value="${esc(d.nextDate||'')}" aria-label="Mikor"></div></div>`}
    <div class="field full" id="dl-lostf"${d.stage==='elveszett'?'':' hidden'}><label for="m-dLost">Miért veszett el?</label><input class="inp" id="m-dLost" name="dLost" value="${esc(d.lostReason||'')}" maxlength="300" placeholder="pl. drága volt, más céget választottak, elmarad a rendezvény"></div>
    <div class="field full"><label for="m-dNoteNew">Jegyzetek</label><textarea class="inp" id="m-dNoteNew" name="dNoteNew" rows="2" maxlength="3000" placeholder="Új jegyzet: igények, egyeztetett részletek, ajánlat verziói… (mentéskor dátummal kerül a listába)"></textarea>
      <input type="hidden" name="dNote" id="m-dNote" value="${esc(d.note||'')}"><p class="hint" id="m-dHsSt" style="margin:8px 0 0"></p><div class="dnotes" id="m-dNotes" data-fb="${esc(dNoteFb(d))}" data-by="${esc(d.ownerName||'')}">${dNotesHtml(dNoteFix(d.note,dNoteFb(d),d.ownerName))}</div></div>
    ${won?`<div class="field full"><p class="hint" style="margin:0">✅ Szerződve ${d.wonAt?esc(fmtShort(d.wonAt)):''} – a projekt elkészült, a további részleteket a projektnél kezeli a csapat.${isAdmin()&&d.projectId&&projById(d.projectId)?` <button class="linkbtn" type="button" data-action="deal-proj" data-id="${esc(d.projectId)}">Projekt megnyitása →</button>`:''}</p></div>`:''}
    ${isAdmin()&&!won?`<div class="field"><label for="m-dOwner">Értékesítő</label><select class="inp" id="m-dOwner" name="dOwner" data-cmb="Válassz értékesítőt…">${salesOwners(S.deals||[]).map(([id,n])=>`<option value="${esc(id)}"${(d.ownerId||S.salesF.owner||(S.me&&S.me.id))===id?' selected':''}>${esc(n)}</option>`).join('')}</select></div>`:''}
    ${!isNew?`<div class="field full"><p class="hint" style="margin:0">${esc(d.ownerName||'')}${d.createdAt?' · felvéve: '+esc(String(d.createdAt).slice(0,10)):''}${d.updatedAt?' · módosítva: '+esc(String(d.updatedAt).slice(0,16).replace('T',' '))+(d.updatedBy?' ('+esc(d.updatedBy)+')':''):''}</p></div>`:''}
  </div>`,{left:!isNew&&!won?`<button type="button" class="btn danger small" data-action="deal-del" data-id="${esc(d.id)}">Törlés</button>`:'',submitLabel:'Mentés',submit:async fd=>{
    const nd=Object.assign({},d0||{},{id:d.id||'',title:String(fd.get('dTitle')||'').trim(),client:String(fd.get('dClient')||'').trim(),eventType:fd.get('dType')||'',contactName:String(fd.get('dCName')||'').trim(),contactEmail:String(fd.get('dCEmail')||'').trim(),contactPhone:String(fd.get('dCPhone')||'').trim(),
      venue:String(fd.get('dVenue')||'').trim(),eventDate:fd.get('dDate')||'',value:moneyVal(fd.get('dValue')),source:fd.get('dSource')||'',services:fd.getAll('dServices').join(', '),note:dNoteAdd(dNoteFix(String(fd.get('dNote')||''),dNoteFb(d),d.ownerName),String(fd.get('dNoteNew')||''))});
    if(fd.get('dOwner'))nd.ownerId=fd.get('dOwner');   // az ügyvezető kioszthatja egy értékesítőnek (vagy magának)
    if(!won){nd.stage=fd.get('dStage')||'uj';nd.chance=fd.get('dChance')===''?'':Number(fd.get('dChance'));nd.nextStep=String(fd.get('dNext')||'').trim();nd.nextDate=fd.get('dNextD')||'';nd.lostReason=String(fd.get('dLost')||'').trim();}
    if(nd.title.length<2){toast('Add meg a lehetőség nevét.',true);$('m-dTitle').focus();return;}
    if(!won&&nd.stage!=='elveszett'){const ns=$('m-dNext'),nn=$('m-dNextD');[ns,nn].forEach(x=>{if(x)x.style.borderColor='';});   // a következő lépés és a dátuma kötelező
      const fp=x=>x&&x._flatpickr&&x._flatpickr.altInput||x;
      if(!nd.nextStep){toast('Add meg a következő lépést.',true);if(ns){ns.style.borderColor='var(--bad)';ns.focus();}return;}
      if(!nd.nextDate){toast('Add meg a következő lépés dátumát.',true);if(nn){fp(nn).style.borderColor='var(--bad)';fp(nn).focus();}return;}}
    if(nd.stage==='elveszett'&&nd.lostReason.length<3){toast('Írd be röviden, miért veszett el.',true);$('dl-lostf').hidden=false;$('m-dLost').focus();return;}
    try{const r=await call('saveDeal',nd);S.deals=r.deals||S.deals;closeModal();render(true);toast(isNew?'Lehetőség felvéve':'Mentve');}catch(e){handleErr(e);}}});
  const mb=document.querySelector('#modalRoot .mbox');if(mb)mb.classList.add('mbox-wide');if(!isNew)setTimeout(dNotesLoadHs,50);dSourceLoad(d.source||'');}

function dealWinModal(d){
  /* Ha a projekt már létezik a projekttervezőben, a lehetőség ahhoz kapcsolható (nem jön létre másodpéldány) */
  const linked=new Set((S.deals||[]).filter(x=>x.id!==d.id&&x.projectId).map(x=>x.projectId));
  const cand=isAdmin()?(S.projects||[]).filter(p=>p.status!=='lemondva'&&!linked.has(p.id)):[];
  const nf=x=>fold(String(x||'')).replace(/[^a-z0-9]+/g,' ').trim(),dn=nf(d.title),dc=nf(d.client);
  const score=p=>{let s=0;const pn=nf(p.name);if(dn&&pn&&(pn===dn||pn.includes(dn)||dn.includes(pn)))s+=3;if(dc&&nf(p.client)&&(nf(p.client).includes(dc)||dc.includes(nf(p.client))))s+=2;if(d.eventDate&&p.date===d.eventDate)s+=2;if(d.contactEmail&&String(p.contactEmail||'').toLowerCase()===String(d.contactEmail).toLowerCase())s+=2;return s;};
  const best=cand.map(p=>({p,s:score(p)})).filter(x=>x.s>=3).sort((a,b)=>b.s-a.s)[0];
  const opts=cand.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).map(p=>`<option value="${esc(p.id)}"${best&&best.p.id===p.id?' selected':''}>${esc(p.name)}${p.date?' · '+esc(fmtShort(p.date)):''}${p.client?' · '+esc(p.client):''}</option>`).join('');
  const linkF=cand.length?`<div class="field full"><label for="m-wProj">Projekt</label><select class="inp" id="m-wProj" name="wProj" data-cmb="Új projekt létrehozása…"><option value="">➕ Új projekt létrehozása</option>${opts}</select><small class="hint" style="margin:4px 0 0">Ha már létrehoztad a projektet, válaszd ki – a lehetőség ahhoz kapcsolódik, nem jön létre új projekt.</small></div>`:'';
  openModal('✅ Szerződve – '+d.title,`<p style="margin:0 0 10px">Gratulálok! 🎉 Mentés után a lehetőségből <b>projekt</b> lesz a Tervezés szakaszban (vagy egy meglévő projekthez kapcsolódik).</p><div class="fields">
    ${linkF}
    ${mf('wTitle','Projekt neve',{v:d.title,full:true,max:160}).replace('<div class="field','<div class="field w-new')}
    ${moneyField('wValue','Szerződött összeg (nettó)',dealVal(d)||'',{steps:false})}
    ${mf('wDate','Rendezvény (első) napja',{v:d.eventDate,type:'date'}).replace('<div class="field','<div class="field w-new')}</div>`,{submitLabel:'✅ Szerződve',submit:async fd=>{
    const value=moneyVal(fd.get('wValue')),date=fd.get('wDate')||'',title=String(fd.get('wTitle')||'').trim(),pid=String(fd.get('wProj')||'');
    if(!value){toast('Add meg a szerződött összeget.',true);return;}if(!pid&&!date){toast('Add meg a rendezvény napját.',true);return;}
    try{const r=await call('winDeal',{id:d.id,value,eventDate:date,title,projectId:pid});S.deals=r.deals||S.deals;closeModal();render(true);toast(pid?'Szerződve – a lehetőség a meglévő projekthez kapcsolódik.':'Szerződve – a projekt elkészült (Tervezés).');
      if(isAdmin()&&typeof load==='function')setTimeout(()=>{try{load(true);}catch(x){}},300);}catch(e){handleErr(e);}}});
  const sync=()=>{const sel=$('m-wProj'),on=!!(sel&&sel.value);document.querySelectorAll('#mform .w-new').forEach(x=>x.hidden=on);};sync();
  const sel=$('m-wProj');if(sel)sel.addEventListener('change',sync);}

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
  if(t.id==='m-dClient'){const c=knownClients('').find(x=>fold(x.company)===fold(t.value.trim()));if(c){[['m-dCName',c.name],['m-dCEmail',c.email]].forEach(([id,v])=>{const el=$(id);if(el&&!el.value&&v)el.value=v;});{const ph=$('m-dCPhone');if(ph&&!ph.value&&c.phone)mPhoneSet('m-dCPhone',c.phone);}}}});
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
  set('m-dCName',c.name,true);set('m-dCEmail',c.email,true);if(c.phone)mPhoneSet('m-dCPhone',c.phone);set('m-dClient',c.company,false);dSourceSet(c.source);
  toast('Kapcsolattartó kitöltve a HubSpotból');},true);
document.addEventListener('focusout',e=>{if(e.target.id==='m-dCName')setTimeout(()=>{if((!document.activeElement||document.activeElement.id!==e.target.id)&&$('hsBox')&&$('hsBox').querySelector('.dct-item,.hs-empty'))pickClose();},150);});

document.addEventListener('change',e=>{if(e.target.id==='sales-owner'){S.salesF.owner=e.target.value==='__all'?'':e.target.value;render(true);}});

/* Lehetőség ügyfele: csak a beírt szövegre illeszkedő ügyfelek jönnek fel (a böngésző saját, pontatlan listája helyett) */
let DC_ITEMS=[],DC_SEQ=0,DC_T=0;
/* „Honnan jött?” kitöltése a CRM-ből (HubSpot eredeti forrás / visszatérő ügyfél) – csak ha még üres */
/* A „Honnan jött?” lehetőségei a HubSpotból (a CRM forrás-mezőjének értékei); hiba esetén marad az alap lista */
let HS_SRC=null;
function dSourceApply(cur){const sel=$('m-dSource');if(!sel||!HS_SRC||!HS_SRC.length)return;const L=HS_SRC.slice();if(cur&&!L.includes(cur))L.push(cur);
  sel.innerHTML='<option value="">—</option>'+L.map(x=>`<option value="${esc(x)}"${x===cur?' selected':''}>${esc(x)}</option>`).join('');const inp=sel.parentElement&&sel.parentElement.querySelector('.cmb-in');if(inp)inp.value=cur||'';}
function dSourceLoad(cur){if(HS_SRC){dSourceApply(cur);return;}call('hubspotSources').then(r=>{HS_SRC=r&&Array.isArray(r.options)?r.options.map(o=>o.label).filter(Boolean):[];const sel=$('m-dSource');if(sel)dSourceApply(sel.value||cur);}).catch(()=>{HS_SRC=[];});}
function dSourceSet(v){const sel=$('m-dSource');if(!sel||!v||sel.value||![...sel.options].some(o=>o.value===v))return;sel.value=v;const inp=sel.parentElement&&sel.parentElement.querySelector('.cmb-in');if(inp)inp.value=v;sel.dispatchEvent(new Event('change',{bubbles:true}));toast('„Honnan jött?” kitöltve: '+v);}
function dcRender(input,q,hs,loading){const fq=fold(q),loc=knownClients(q).sort((a,b)=>(fold(a.company).startsWith(fq)?0:1)-(fold(b.company).startsWith(fq)?0:1)).slice(0,6).map(c=>({company:c.company,sub:c.name||'',src:'app'}));
  const have=new Set(loc.map(x=>fold(x.company)));
  const fromHs=(hs||[]).filter(c=>!have.has(fold(c.name))).map(c=>({company:c.name,sub:[c.domain,c.city].filter(Boolean).join(' · '),src:'hs',address:c.address,source:c.source||'',deals:c.deals||0}));
  DC_ITEMS=loc.concat(fromHs).slice(0,12);
  if(!DC_ITEMS.length&&!loading){pickShow(input,'<div class="hs-empty">Nincs ilyen cég az appban és a HubSpotban – a beírt név marad.</div>');return;}
  pickShow(input,DC_ITEMS.map((it,i)=>`<div class="hs-row"><button type="button" class="hs-item dc-item" data-dc="${i}"><b>${esc(it.company)}${it.src==='hs'?' <span class="hs-tag">HubSpot</span>':''}</b>${it.sub?`<small>${esc(it.sub)}</small>`:''}</button></div>`).join('')+(loading?searchingHtml('Keresés a HubSpotban'):''));}
function dcSearch(input){const q=input.value.trim();clearTimeout(DC_T);if(q.length<2){DC_ITEMS=[];pickClose();return;}
  dcRender(input,q,null,true);const my=++DC_SEQ;   // az app ügyfelei azonnal, a HubSpot cégei kis késéssel
  DC_T=setTimeout(async()=>{let hs=[];try{hs=await call('hubspotCompanies',{q})||[];}catch(e){}if(my!==DC_SEQ||document.activeElement!==input)return;dcRender(input,q,hs,false);},300);}
function dcPick(i){const v=DC_ITEMS[i],inp=$('m-dClient');pickClose();if(v&&inp){inp.value=v.company;inp.dispatchEvent(new Event('change',{bubbles:true}));dSourceSet(v.src==='app'||v.deals>0?'Visszatérő ügyfél':v.source);const c=$('m-dCName');if(c&&!c.value)setTimeout(()=>c.focus(),30);}}   // ezután a kapcsolattartó mező a cég HubSpot-kapcsolattartóit ajánlja
document.addEventListener('input',e=>{if(e.target.id==='m-dClient')dcSearch(e.target);});
document.addEventListener('mousedown',e=>{const it=e.target.closest&&e.target.closest('.dc-item');if(!it)return;e.preventDefault();e.stopPropagation();dcPick(Number(it.dataset.dc));},true);
document.addEventListener('focusout',e=>{if(e.target.id==='m-dClient')setTimeout(()=>{if(document.activeElement!==e.target&&$('hsBox')&&$('hsBox').querySelector('.dc-item'))pickClose();},150);});
document.addEventListener('keydown',e=>{if(e.target.id!=='m-dClient'||!$('hsBox'))return;const its=[...document.querySelectorAll('.dc-item')];if(!its.length)return;let i=its.findIndex(x=>x.classList.contains('on'));
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();i=e.key==='ArrowDown'?Math.min(its.length-1,i+1):Math.max(0,i-1);its.forEach((x,j)=>x.classList.toggle('on',j===i));}
  else if(e.key==='Enter'&&i>=0){e.preventDefault();e.stopPropagation();dcPick(Number(its[i].dataset.dc));}
  else if(e.key==='Escape'||e.key==='Tab')pickClose();},true);

/* Lehetőség jegyzetei dátum szerint: „[2026-11-04 15:19 · Név] szöveg” bejegyzések, a legújabb felül (egy szövegmezőben tárolva) */
const DN_RE=/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}|Korábbi)(?: · ([^\]]*))?\] ?/;
function dNotesParse(t){t=String(t||'').trim();if(!t)return [];const out=[];let cur=null;
  t.split('\n').forEach(l=>{const m=DN_RE.exec(l);if(m){cur={at:m[1]==='Korábbi'?'':m[1],by:m[2]||'',text:l.slice(m[0].length)};out.push(cur);}else if(cur)cur.text+='\n'+l;else{cur={at:'',by:'',text:l};out.push(cur);}});
  return out.map(x=>Object.assign(x,{text:x.text.trim()})).filter(x=>x.text);}
const dNotesJoin=L=>L.map(x=>`[${x.at||'Korábbi'}${x.by?' · '+x.by:''}] `+x.text).join('\n');
function dNoteAdd(old,nw){nw=String(nw||'').trim();if(!nw)return String(old||'').trim();const d=new Date(),p=n=>String(n).padStart(2,'0');
  const at=`${todayISO()} ${p(d.getHours())}:${p(d.getMinutes())}`;return dNotesJoin([{at,by:(S.me&&S.me.name)||'',text:nw}].concat(dNotesParse(old)));}
/* A régi, dátum nélküli jegyzet a lehetőség felvételének (ennek híján utolsó módosításának) idejét kapja */
const dNoteFb=d=>{const t=String((d&&(d.createdAt||d.updatedAt))||'').replace('T',' ');return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(t)?t.slice(0,16):/^\d{4}-\d{2}-\d{2}/.test(t)?t.slice(0,10)+' 00:00':'';};
function dNoteFix(t,fb,by){if(!fb)return String(t||'');const L=dNotesParse(t);if(!L.some(x=>!x.at))return String(t||'');L.forEach(x=>{if(!x.at){x.at=fb;x.by=x.by||by||'';}});return dNotesJoin(L);}
function dNotesHtml(t,hs){const L=dNotesParse(t).concat((hs||[]).map(x=>({at:x.at,by:x.by,text:x.text,hs:1,kind:x.kind||''}))).sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));if(!L.length)return '<p class="hint" style="margin:6px 0 0">Még nincs jegyzet.</p>';
  return L.map((x,i)=>`<div class="dn-item${x.hs?' dn-hs':''}"><div class="dn-h">${x.hs?`<span class="hs-tag" style="margin:0">HubSpot${x.kind&&x.kind!=='Jegyzet'?' · '+esc(x.kind):''}</span>`:''}<span class="dn-at">${x.at?esc(fmtDay(x.at.slice(0,10))+(x.at.slice(11)&&x.at.slice(11)!=='00:00'?' '+x.at.slice(11):'')):'Korábbi jegyzet'}</span>${x.by?`<span class="dn-by">${esc(x.by)}</span>`:''}</div><div class="dn-t">${esc(x.text).replace(/\n/g,'<br>')}</div></div>`).join('');}

/* Kapcsolattartó megnyitása a HubSpotban (kártyán és a lehetőség ablakában) */
ACT['hs-contact']=async(b,e)=>{if(e){e.stopPropagation();e.preventDefault();}
  const f=b.closest('form'),name=f?String(($('m-dCName')||{}).value||'').trim():b.dataset.name,email=f?String(($('m-dCEmail')||{}).value||'').trim():b.dataset.email,company=f?String(($('m-dClient')||{}).value||'').trim():b.dataset.company;
  if(!name&&!email){toast('Előbb add meg a kapcsolattartót.',true);return;}
  const w=window.open('about:blank','_blank');   // azonnal nyitjuk, hogy a böngésző ne tiltsa le
  try{const r=await call('hubspotContactLink',{name,email,company});if(w){w.opener=null;w.location.href=r.url;}else location.href=r.url;if(!r.found)toast('Pontos egyezés nincs – a HubSpot keresőjét nyitottam meg.');}
  catch(err){if(w)w.close();handleErr(err);}};

/* A lehetőség ablakában a kapcsolattartó és a cég HubSpot-jegyzetei is megjelennek (csak olvasható, nem mentődnek a lehetőségbe) */
let DN_HS_SEQ=0;
async function dNotesLoadHs(){const box=$('m-dNotes'),h=$('m-dNote');if(!box||!h)return;const name=String(($('m-dCName')||{}).value||'').trim(),email=String(($('m-dCEmail')||{}).value||'').trim(),company=String(($('m-dClient')||{}).value||'').trim();
  if(!name&&!email&&!company)return;const my=++DN_HS_SEQ;const st=$('m-dHsSt');if(st)st.textContent='HubSpot-tevékenységek betöltése…';
  try{const r=await call('hubspotNotes',{name,email,company});if(my!==DN_HS_SEQ||!$('m-dNotes'))return;box.innerHTML=dNotesHtml(dNoteFix(h.value,box.dataset.fb,box.dataset.by),r.notes||[]);
    if(st)st.textContent=(r.notes||[]).length?`${r.notes.length} HubSpot-tevékenység betöltve (jegyzetek, feladatok, e-mailek, hívások, megbeszélések)`:'A HubSpotban nincs tevékenység ehhez a kapcsolattartóhoz / céghez';}
  catch(e){if(st)st.textContent='A HubSpot-jegyzetek most nem érhetők el';}}

/* Árkalkulátor (kalkulator.lumosmotion.hu) az Értékesítés fülön: nagy ablakban, a két kalkulátor között a saját fülein lehet váltani */
ACT['ark-open']=()=>{openModal('🧮 Árkalkulátor',`<iframe class="ark-frame" src="https://kalkulator.lumosmotion.hu/rendezvenyvideok" title="Lumos Motion árkalkulátor" loading="eager"></iframe>`,{cancelLabel:'Bezárás',noDraft:true});
  const mb=document.querySelector('#modalRoot .mbox');if(mb)mb.classList.add('mbox-ark');};
