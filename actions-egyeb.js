'use strict';
/* ===== Indítás ===== */

/* Pénzügyek táblázat: oszlopszélesség húzással (egér és érintés), böngészőnként megjegyezve; dupla kattintás visszaállítja. */
document.addEventListener('pointerdown',e=>{
  const g=e.target.closest&&e.target.closest('.col-grip');if(!g)return;
  e.preventDefault();e.stopPropagation();
  const table=g.closest('table'),cols=[...table.querySelectorAll('col')],i=Number(g.dataset.col),startX=e.clientX;
  const widths=cols.map(c=>Math.round(c.getBoundingClientRect().width)||parseInt(c.style.width,10));const startW=widths[i];
  cols.forEach((c,k)=>c.style.width=widths[k]+'px');table.style.width=widths.reduce((a,b)=>a+b,0)+'px';table.style.minWidth='0';
  document.body.classList.add('col-resizing');
  const move=ev=>{const w=Math.max(40,Math.round(startW+ev.clientX-startX));widths[i]=w;cols[i].style.width=w+'px';table.style.width=widths.reduce((a,b)=>a+b,0)+'px';};
  const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);document.body.classList.remove('col-resizing');try{localStorage.setItem('lpm_fin_cols5',JSON.stringify(widths));}catch(err){}};
  document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);
});
document.addEventListener('dblclick',e=>{const g=e.target.closest&&e.target.closest('.col-grip');if(!g)return;try{localStorage.removeItem('lpm_fin_cols5');}catch(err){}render(true);});

/* ===== Naptár: nap kijelölése, buborék a projektekről, jobb klikkes törlés ===== */
const CAL_MOB=()=>window.matchMedia&&matchMedia('(max-width:760px)').matches;   // mobilon a havi rács alatt a kiválasztott nap listája
document.addEventListener('click',e=>{const day=e.target.closest&&e.target.closest('.cal-day');if(!day)return;if(e.target.closest('button')&&!CAL_MOB())return;if(CAL_MOB()){e.preventDefault();e.stopPropagation();}
  S.cal.sel=day.dataset.day;if(CAL_MOB()){const d=day.dataset.day;let hit=false;document.querySelectorAll('.cal-agenda .ag-day').forEach(x=>{const on=x.dataset.agd===d;x.classList.toggle('on',on);hit=hit||on;});if(!hit&&d.slice(0,7)===S.cal.month){render(true);return;}if(d.slice(0,7)!==S.cal.month){S.cal.month=d.slice(0,7);render(true);return;}}document.querySelectorAll('.cal-day.sel').forEach(x=>x.classList.remove('sel'));day.classList.add('sel');});
function calTipHtml(el){
  const id=el.dataset.tipid;
  if(el.dataset.kind==='p'){const p=projById(id);if(!p)return '';
    {let ge=null;Object.values(S.cal.events||{}).forEach(l=>(l||[]).forEach(x=>{if(!ge&&((p.calEventId&&x.id===p.calEventId)||(x.projectId&&x.projectId===p.id)))ge=x;}));   // a valódi Google Naptár-bejegyzés: amit a stáb is lát
      if(ge){const desc=String(ge.description||'').replace(/\n*Az appban:[\s\S]*$/,'').trim();
        return `<b>${esc(ge.title||p.name||'')}</b><div class="tip-src">📅 Google Naptár – így látja mindenki</div>${[['Időpont',fmtShort(ge.date)+(ge.endDate&&ge.endDate!==ge.date?' – '+fmtShort(ge.endDate):'')+(ge.start?', '+ge.start+(ge.end?'–'+ge.end:''):'')],['Helyszín',ge.location],['Vendégek',(ge.guests||[]).length?(ge.guests||[]).length+' fő':'']].filter(x=>x[1]).map(([k,v])=>`<div><span>${esc(k)}</span><em class="tv">${esc(v)}</em></div>`).join('')}${desc?`<div class="tip-desc">${esc(desc)}</div>`:''}`;}}const r=pr(p),lead=crewById(p.lead),due=dueDate(p),di=dueInfo(p);
    const rows=[['Ügyfél',p.client],['Időpont',r?fmtRange(p)+(p.startTime?', '+p.startTime+(p.endTime?'–'+p.endTime:''):''):''],['Helyszín',p.venue],['Állapot',STATUS_LABEL[p.status||'egyeztetes']],['Projektvezető',lead&&lead.name],
      ['Átadási határidő',due&&needsDelivery(p)?fmtDay(due)+(di&&p.status!=='atadva'?' · '+di.txt:''):''],['Kapcsolattartó',[p.contactName,p.contactPhone].filter(Boolean).join(', ')]].filter(x=>x[1]);
    const ids=[...crewIds(p)],crew=ids.map(cid=>{const c=crewById(cid),rl=[...new Set((p.lead===cid?['Projektvezető']:[]).concat((p.crew||[]).filter(a=>a.crewId===cid).map(a=>a.role==='Vágó'&&onsiteCut(p,cid)?'Helyszíni vágó':a.role).filter(Boolean)))];
      return `<div class="tip-crew"><span>${esc(c?c.name:'Ismeretlen')}</span>${esc(rl.join(', ')||'–')}</div>`;}).join('');   // a teljes stáb, mindenki a feladataival
    return `<b>${esc(p.name||'Névtelen projekt')}</b>${rows.map(([k,v])=>`<div><span>${esc(k)}</span><em class="tv">${esc(v)}</em></div>`).join('')}${ids.length?`<div class="tip-sec">👥 Stáb · ${ids.length} fő</div>${crew}`:''}`;}
  let ev=null;Object.values(S.cal.events||{}).concat(Object.values(S.cal.ev2||{})).forEach(l=>(l||[]).forEach(x=>{if(x.id===id)ev=x;}));if(!ev)return '';
  return `<b>${esc(ev.title||'(nincs cím)')}</b>${[['Időpont',fmtShort(ev.date)+(ev.endDate&&ev.endDate!==ev.date?' – '+fmtShort(ev.endDate):'')+(ev.start?', '+ev.start+(ev.end?'–'+ev.end:''):'')],['Helyszín',ev.location]].filter(x=>x[1]).map(([k,v])=>`<div><span>${esc(k)}</span><em class="tv">${esc(v)}</em></div>`).join('')}${ro()?"":`<div class="tip-hint">Jobb klikk: törlés</div>`}`;
}
document.addEventListener('mouseover',e=>{const el=e.target.closest&&e.target.closest('.cal-chip');if(!el){const t=$('calTip');if(t&&!e.target.closest('#calTip'))t.remove();return;}
  if(el._tip)return;document.querySelectorAll('.cal-chip').forEach(x=>x._tip=false);el._tip=true;
  clearTimeout(window._calTipT);window._calTipT=setTimeout(()=>{if(!el.isConnected||!el.matches(':hover'))return;   /* a naptár súgója kicsit később jelenik meg */
  const h=calTipHtml(el);let t=$('calTip');if(!h){if(t)t.remove();return;}
  if(!t){t=document.createElement('div');t.id='calTip';t.className='cal-tip';document.body.appendChild(t);}t.innerHTML=h;
  const r=el.getBoundingClientRect(),w=Math.min(300,innerWidth-16);t.style.width=w+'px';let x=r.left+scrollX;if(x+w>scrollX+innerWidth-8)x=scrollX+innerWidth-8-w;
  t.style.left=x+'px';t.style.top=(r.bottom+scrollY+6)+'px';},550);});
document.addEventListener('mouseout',e=>{const el=e.target.closest&&e.target.closest('.cal-chip');if(el&&!el.contains(e.relatedTarget)){el._tip=false;const t=$('calTip');if(t)t.remove();}});
document.addEventListener('contextmenu',e=>{const el=e.target.closest&&e.target.closest('.cal-chip');if(!el)return;e.preventDefault();const t=$('calTip');if(t)t.remove();
  const id=el.dataset.tipid||el.dataset.id,isP=el.dataset.kind==='p'||el.dataset.kind==='cut';let m=$('calMenu');if(m)m.remove();m=document.createElement('div');m.id='calMenu';m.className='cal-menu';
  m.innerHTML=isP?`<button type="button" data-action="open-project" data-id="${esc(id)}">Projekt megnyitása</button>`
    :`<button type="button" data-action="${el.dataset.kind==='v'?'cal-vevent':'cal-event'}" data-id="${esc(id)}">Részletek</button>${ro()?'':`<button type="button" class="bad-txt" data-action="cal-ctx-del" data-id="${esc(id)}" data-kind="${esc(el.dataset.kind||'g')}">🗑️ Törlés a naptárból</button>`}`;
  document.body.appendChild(m);m.style.left=Math.min(e.pageX,scrollX+innerWidth-200)+'px';m.style.top=e.pageY+'px';});
document.addEventListener('click',e=>{const m=$('calMenu');if(m&&!e.target.closest('#calMenu'))m.remove();else if(m&&e.target.closest('button'))setTimeout(()=>{const x=$('calMenu');if(x)x.remove();},0);},true);
ACT['cal-ctx-del']=b=>{if(ro())return;const id=b.dataset.id,vag=b.dataset.kind==='v';let ev=null;[S.cal.events||{},S.cal.ev2||{}].forEach(o=>Object.values(o).forEach(l=>(l||[]).forEach(x=>{if(x.id===id)ev=x;})));
  confirmModal('Bejegyzés törlése',`Biztosan törlöd ${huArt(ev&&ev.title)} „${ev?esc(ev.title||''):'bejegyzés'}” bejegyzést a${vag?' Vágói':' Google'} Naptárból?`,'Törlés',async()=>{
    try{await call('deleteCalEvent',vag?{id,cal:'vagoi'}:{id});[S.cal.events||{},S.cal.ev2||{}].forEach(o=>Object.keys(o).forEach(k=>{if(Array.isArray(o[k]))o[k]=o[k].filter(x=>x.id!==id);}));   // azonnal eltűnik
      if(typeof calForceFresh==='function')calForceFresh();S.cal.events={};render(true);toast('Bejegyzés törölve');}catch(e){handleErr(e);}});};

/* ===== Helyszín: címkereső (OpenStreetMap / Photon), gépelés közben ===== */
let ADDR_T=0,ADDR_SEQ=0,ADDR_ITEMS=[];
function addrFmt(f){const p=f.properties||{},street=[p.street,p.housenumber].filter(Boolean).join(' '),city=[p.postcode,p.city||p.town||p.village||p.county].filter(Boolean).join(' ');
  const name=p.name&&p.name!==p.street?p.name:'';return [name,street,city].filter(Boolean).join(', ')||p.name||'';}
async function addrSearch(input){const q=input.value.trim();if(q.length<3){pickClose();return;}const my=++ADDR_SEQ,id=input.id;
  const live=()=>my===ADDR_SEQ&&document.activeElement&&document.activeElement.id===id;   // újrarajzolás után a mező új elem lehet – azonosító szerint nézzük
  const seen=new Set();ADDR_ITEMS=[];let osmDone=false,gDone=false;
  const show=()=>{if(!live())return;const el=$(id)||input;
    if(!ADDR_ITEMS.length){if(osmDone&&gDone)pickShow(el,'<div class="hs-empty">Nincs találat – írd be a címet (pl. 1016 Budapest, Krisztina krt. 99.), vagy a helyszín nevét magyarul.</div>');else pickShow(el,'<div class="hs-empty">Keresés…</div>');return;}
    pickShow(el,ADDR_ITEMS.map((t,i)=>`<button type="button" class="addr-item" data-addr="${i}"><b>${esc(t.split(', ')[0])}</b><small>${esc(t.split(', ').slice(1).join(', '))}</small></button>`).join('')+'<div class="hs-empty" style="font-size:11px">Címadatok: © OpenStreetMap, Google</div>');};
  const add=list=>list.forEach(x=>{const k=x.toLowerCase();if(x&&!seen.has(k)){seen.add(k);ADDR_ITEMS.push(x);}});
  const osm=fetch('https://photon.komoot.io/api/?limit=6&lat=47.5&lon=19.05&bbox=16.1,45.7,22.9,48.6&q='+encodeURIComponent(q)).then(r=>r.json()).then(j=>{if(my!==ADDR_SEQ)return;add((j.features||[]).map(addrFmt));}).catch(()=>{}).finally(()=>{osmDone=true;show();});
  const g=call('geoSearch',{q}).then(r=>{if(my!==ADDR_SEQ)return;const before=ADDR_ITEMS.slice();ADDR_ITEMS=[];seen.clear();add((r&&r.items)||[]);add(before);}).catch(()=>{}).finally(()=>{gDone=true;show();});   // a Google-találatok előre kerülnek (pontosabbak a cég- és intézménynevekre)
  await Promise.all([osm,g]);}
document.addEventListener('input',e=>{if(e.target.id==='f-venue'&&!ro()){clearTimeout(ADDR_T);const t=e.target;ADDR_T=setTimeout(()=>addrSearch(t),350);}});
document.addEventListener('mousedown',e=>{const it=e.target.closest&&e.target.closest('.addr-item');if(!it)return;e.preventDefault();e.stopPropagation();const v=ADDR_ITEMS[Number(it.dataset.addr)];pickClose();
  const mv=$('m-venue');if(mv&&document.activeElement===mv){if(v)mv.value=v;return;}
  const dv=$('m-dVenue');if(dv&&document.activeElement===dv){if(v){dv.value=v;const m=$('dl-map');if(m){m.style.display='';m.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(v);}}return;}   // új projekt ablak
  const inp=$('f-venue');if(inp&&v){inp.value=v;setDraft({venue:v});}},true);
document.addEventListener('focusout',e=>{if(e.target.id==='f-venue')setTimeout(()=>{if((!document.activeElement||document.activeElement.id!==e.target.id)&&$('hsBox')&&$('hsBox').querySelector('.addr-item'))pickClose();},150);});

/* Telefonmező kitöltése az ablakban (országkód + szám, a rejtett mezővel együtt); üres értékkel törli */
function mPhoneSet(id,phone){const ph=$(id);if(!ph)return;const row=ph.closest('.phone-row'),pr2=phParse(phone||'');
  if(row&&row.querySelector('.ph-cc')){row.querySelector('.ph-cc').dataset.cc=pr2.cc;}ph.value=phone?phJoin(pr2.cc,pr2.n).replace(pr2.cc+' ',''):'';
  if(row&&typeof phSync==='function'){try{phSync(row,false);}catch(e){}}
  const hid=row&&row.querySelector('input[type=hidden]');if(hid)hid.value=phone?phJoin(pr2.cc,pr2.n):'';ph.dispatchEvent(new Event('input',{bubbles:true}));}
/* ===== Kapcsolattartó: HubSpot-lenyíló (mint az Ügyfél mezőnél) ===== */
let CT_T=0,CT_SEQ=0,CT_ITEMS=[];
async function ctSearch(input){if(!S.draft)return;const q=input.value.trim(),my=++CT_SEQ;
  pickShow(input,searchingHtml('Keresés a HubSpotban'));
  try{const r=await call('hubspotContacts',q.length>=2?{q}:{q:'',client:String(S.draft.client||'')});if(my!==CT_SEQ||document.activeElement!==input)return;
    CT_ITEMS=(r||[]).slice(0,12);
    pickShow(input,CT_ITEMS.length?CT_ITEMS.map((c,i)=>`<button type="button" class="ct-item hs-item" data-ct="${i}"><b>${esc(c.name)}</b><small>${esc([c.company,c.title,c.phone?phJoin(phParse(c.phone).cc,phParse(c.phone).n):'',c.email].filter(Boolean).join(' · '))}</small></button>`).join(''):`<div class="hs-empty">${q.length>=2?'Nincs találat a HubSpotban – a beírt név marad.':'Kezdd el gépelni a nevet…'}</div>`);}
  catch(e){if(my===CT_SEQ&&document.activeElement===input)pickShow(input,`<div class="hs-empty bad-txt">${esc(errText(e))}</div>`);}}
document.addEventListener('focusin',e=>{if(e.target.id==='f-contactName'&&!ro()&&!projLocked()){e.target.setAttribute('autocomplete','off');ctSearch(e.target);}});
document.addEventListener('input',e=>{if(e.target.id==='f-contactName'&&!ro()){clearTimeout(CT_T);const t=e.target;CT_T=setTimeout(()=>ctSearch(t),350);}});
document.addEventListener('mousedown',e=>{const it=e.target.closest&&e.target.closest('.ct-item');if(!it)return;e.preventDefault();e.stopPropagation();const c=CT_ITEMS[Number(it.dataset.ct)];pickClose();if(!c||!S.draft)return;
  const ph=c.phone?phJoin(phParse(c.phone).cc,phParse(c.phone).n):'';const inp=$('f-contactName');if(inp)inp.value=c.name||'';
  setDraft({contactName:c.name||'',contactPhone:ph,contactEmail:c.email||''});render(true);toast('Kapcsolattartó kitöltve a HubSpotból');},true);
document.addEventListener('focusout',e=>{if(e.target.id==='f-contactName')setTimeout(()=>{if((!document.activeElement||document.activeElement.id!==e.target.id)&&$('hsBox')&&$('hsBox').querySelector('.ct-item,.hs-empty'))pickClose();},150);});

/* Időpont gépelése: „1000” → „10:00”, „930” → „09:30” (minden böngészőben ugyanúgy) */
function timeNorm(v){const d=String(v||'').replace(/\D/g,'').slice(0,4);if(!d)return '';let h,m;
  if(d.length<=2){h=+d;m=0;}else if(d.length===3){h=+d.slice(0,1);m=+d.slice(1);}else{h=+d.slice(0,2);m=+d.slice(2);}
  if(h>23||m>59)return null;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
document.addEventListener('input',e=>{const t=e.target;if(!t.dataset||!t.dataset.time)return;const d=t.value.replace(/\D/g,'').slice(0,4);
  const v=d.length>2?d.slice(0,d.length-2)+':'+d.slice(-2):d;if(v!==t.value){t.value=v;try{t.setSelectionRange(v.length,v.length);}catch(_){}}},true);
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||!t.dataset.time)return;const n=timeNorm(t.value);
  if(n===null){toast('Érvénytelen időpont – például 10:00 vagy 930.',true);t.value=S.draft&&S.draft[t.dataset.field]||'';return;}t.value=n;},true);

/* Stáb fül: kártyák átrendezése húzással (a sorrend mindenkinél ugyanaz, ha a háttér már ismeri). */
let CREW_DRAG=null;
function crewDropPos(card,e){const r=card.getBoundingClientRect();return e.clientX<r.left+r.width/2?'before':'after';}
function crewDropClear(){document.querySelectorAll('.crew-card.drop-before,.crew-card.drop-after').forEach(x=>x.classList.remove('drop-before','drop-after'));}
document.addEventListener('dragstart',e=>{const c=e.target.closest&&e.target.closest('[data-crew-card]');if(!c||ro())return;CREW_DRAG=c.dataset.crewCard;c.classList.add('dragging');try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',CREW_DRAG);}catch(_){}});
document.addEventListener('dragend',()=>{document.querySelectorAll('.crew-card.dragging').forEach(x=>x.classList.remove('dragging'));crewDropClear();CREW_DRAG=null;});
document.addEventListener('dragover',e=>{if(!CREW_DRAG)return;const c=e.target.closest&&e.target.closest('[data-crew-card]');if(!c||c.dataset.crewCard===CREW_DRAG)return;e.preventDefault();crewDropClear();c.classList.add(crewDropPos(c,e)==='before'?'drop-before':'drop-after');});
document.addEventListener('drop',async e=>{if(!CREW_DRAG)return;const c=e.target.closest&&e.target.closest('[data-crew-card]');const from=CREW_DRAG;crewDropClear();if(!c||c.dataset.crewCard===from)return;e.preventDefault();
  const ids=crewSorted().map(x=>x.id).filter(id=>id!==from),ti=ids.indexOf(c.dataset.crewCard);if(ti<0)return;
  ids.splice(crewDropPos(c,e)==='before'?ti:ti+1,0,from);
  S.crewOrder=ids;try{localStorage.setItem('lumos_pm_crew_order',JSON.stringify(ids));}catch(_){}render(true);
  if(S.capabilities&&S.capabilities.crewOrder){try{const r=await call('saveCrewOrder',{order:ids});if(r&&Array.isArray(r.crewOrder))S.crewOrder=r.crewOrder;}catch(err){toast('A sorrend mentése nem sikerült: '+errText(err),true);}}
});
document.addEventListener('change',async e=>{const t=e.target,id=t.dataset&&t.dataset.penDay;if(!id||!S.draft||!isAdmin())return;const pid=S.draft.id;
  try{const r=await call('movePenaltyDay',{projectId:pid,id,day:t.value});penApply(pid,r.penalties);toast(t.value?'Levonás áthelyezve: '+dayLbl(t.value):'Levonás a teljes díjból');}catch(err){handleErr(err);render(true);}});

/* Automatikus mentés indítása minden felhasználói módosítás után (a fenti kezelők után fut). */
document.addEventListener('input',()=>{if(S.dirty)autoSave(900);});
document.addEventListener('change',()=>{if(S.dirty)autoSave(200);});
document.addEventListener('click',()=>setTimeout(()=>{if(S.dirty)autoSave(300);},0));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushSave();});
window.addEventListener('pagehide',flushSave);
window.addEventListener('pagehide',()=>{try{mdSave();}catch(e){}});   // frissítéskor / bezáráskor a nyitott ablak tartalma megmarad (újranyitáskor visszajön)

/* ===== Új projekt ablak: ugyanazok a keresők, mint az Alapadatoknál (ügyfél, helyszín, kapcsolattartó) ===== */
let MC_ITEMS=[];
function mcSetClient(it){   // ügyfél kiválasztva (ismert ügyfél: a kapcsolattartó és az adószám is kitöltődik)
  const q=$('m-clientQ'),sel=$('m-clientSel'),nb=$('m-clientNew');if(!q||!sel)return;
  if(it.isNew){sel.value='__new';q.value=it.company||q.value;if(nb)nb.style.display='';const c=$('m-client');if(c)c.value=it.company||'';setTimeout(()=>{const t=$('m-clientTax');if(t)t.focus();},30);return;}
  sel.value=it.company;q.value=it.company;if(nb)nb.style.display='none';
  const set=(id,v)=>{const e2=$(id);if(e2&&v)e2.value=v;};set('m-contactName',it.name);set('m-contactEmail',it.email);
  const ph=$('m-contactPhone');if(ph&&it.phone){const pr2=phParse(it.phone);ph.value=pr2.n;const hid=document.querySelector('#mform input[type=hidden][name=contactPhone]');if(hid)hid.value=phJoin(pr2.cc,pr2.n);}
}
function mcSearch(input){const q=input.value.trim();MC_ITEMS=knownClients(q);if(!q||!MC_ITEMS.some(c=>fold(c.company).trim()===fold(q).trim()))MC_ITEMS.push({isNew:true,company:q});
  pickShow(input,MC_ITEMS.map((it,i)=>it.isNew?`<button type="button" class="hs-item hs-new mc-item" data-mc="${i}"><b>+ Új ügyfél felvétele${q?`: „${esc(q)}”`:'…'}</b></button>`
    :`<div class="hs-row"><button type="button" class="hs-item mc-item" data-mc="${i}"><b>${esc(it.company)}</b><small>${esc([it.name,it.phone,it.email].filter(Boolean).join(' · ')||it.address||'nincs kapcsolattartó megadva')}</small></button></div>`).join('')+(MC_ITEMS.length===1&&q?'<div class="hs-empty">Nincs ilyen ügyfél.</div>':''));}
document.addEventListener('focusin',e=>{if(e.target.id==='m-clientQ')mcSearch(e.target);});
document.addEventListener('input',e=>{if(e.target.id==='m-clientQ'){const s2=$('m-clientSel');if(s2&&s2.value!=='__new')s2.value='';mcSearch(e.target);}});
document.addEventListener('mousedown',e=>{const it=e.target.closest&&e.target.closest('.mc-item');if(!it)return;e.preventDefault();e.stopPropagation();const v=MC_ITEMS[Number(it.dataset.mc)];pickClose();if(v)mcSetClient(v);},true);
document.addEventListener('focusout',e=>{if(e.target.id==='m-clientQ'){const t=e.target;setTimeout(()=>{if(document.activeElement===t)return;if($('hsBox')&&$('hsBox').querySelector('.mc-item'))pickClose();
  const s2=$('m-clientSel');if(s2&&!s2.value&&t.value.trim()){const ex=knownClients('').find(c=>c.company.toLowerCase()===t.value.trim().toLowerCase());mcSetClient(ex||{isNew:true,company:t.value.trim()});}},200);}});   // választás nélkül: ismert név → az az ügyfél, új név → új ügyfél
document.addEventListener('keydown',e=>{if(e.target.id!=='m-clientQ'||!$('hsBox'))return;const its=[...document.querySelectorAll('.mc-item')];let i=its.findIndex(x=>x.classList.contains('on'));
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();i=e.key==='ArrowDown'?Math.min(its.length-1,i+1):Math.max(0,i-1);its.forEach((x,j)=>x.classList.toggle('on',j===i));}
  else if(e.key==='Enter'&&i>=0){e.preventDefault();e.stopPropagation();const v=MC_ITEMS[Number(its[i].dataset.mc)];pickClose();if(v)mcSetClient(v);}
  else if(e.key==='Escape'||e.key==='Tab')pickClose();},true);
/* helyszín: címkereső az ablakban is */
document.addEventListener('input',e=>{if(e.target.id==='m-venue'||e.target.id==='m-dVenue'){clearTimeout(ADDR_T);const t=e.target;ADDR_T=setTimeout(()=>addrSearch(t),350);}});
document.addEventListener('focusout',e=>{if(e.target.id==='m-venue'||e.target.id==='m-dVenue')setTimeout(()=>{if((!document.activeElement||document.activeElement.id!==e.target.id)&&$('hsBox')&&$('hsBox').querySelector('.addr-item'))pickClose();},150);});
/* kapcsolattartó: HubSpot-kereső az ablakban is */
let MCT_ITEMS=[],MCT_SEQ=0,MCT_T=0;
async function mctSearch(input){const q=input.value.trim(),my=++MCT_SEQ,client=(($('m-clientSel')||{}).value==='__new'?($('m-client')||{}).value:($('m-clientSel')||{}).value)||'';
  pickShow(input,searchingHtml('Keresés a HubSpotban'));
  try{const r=await call('hubspotContacts',q.length>=2?{q}:{q:'',client:String(client)});if(my!==MCT_SEQ||document.activeElement!==input)return;
    MCT_ITEMS=(r||[]).slice(0,12);
    pickShow(input,MCT_ITEMS.length?MCT_ITEMS.map((c,i)=>`<button type="button" class="hs-item mct-item" data-mct="${i}"><b>${esc(c.name)}</b><small>${esc([c.company,c.title,c.phone?phJoin(phParse(c.phone).cc,phParse(c.phone).n):'',c.email].filter(Boolean).join(' · '))}</small></button>`).join(''):`<div class="hs-empty">${q.length>=2?'Nincs találat a HubSpotban – a beírt név marad.':'Kezdd el gépelni a nevet…'}</div>`);}
  catch(e){if(my===MCT_SEQ&&document.activeElement===input)pickShow(input,`<div class="hs-empty bad-txt">${esc(errText(e))}</div>`);}}
document.addEventListener('focusin',e=>{if(e.target.id==='m-contactName'&&$('m-clientQ'))mctSearch(e.target);});
document.addEventListener('input',e=>{if(e.target.id==='m-contactName'&&$('m-clientQ')){clearTimeout(MCT_T);const t=e.target;MCT_T=setTimeout(()=>mctSearch(t),350);}});
document.addEventListener('mousedown',e=>{const it=e.target.closest&&e.target.closest('.mct-item');if(!it)return;e.preventDefault();e.stopPropagation();const c=MCT_ITEMS[Number(it.dataset.mct)];pickClose();if(!c)return;
  const set=(id,v)=>{const e2=$(id);if(e2)e2.value=v||'';};set('m-contactName',c.name);set('m-contactEmail',c.email);   /* a választott kapcsolattartó minden adata cserélődik (a régi telefonszám nem marad bent) */
  mPhoneSet('m-contactPhone',c.phone||'');
  toast('Kapcsolattartó kitöltve a HubSpotból');},true);
document.addEventListener('focusout',e=>{if(e.target.id==='m-contactName'&&$('m-clientQ'))setTimeout(()=>{if((!document.activeElement||document.activeElement.id!==e.target.id)&&$('hsBox')&&$('hsBox').querySelector('.mct-item,.hs-empty'))pickClose();},150);});
document.addEventListener('scroll',e=>{if($('hsBox')&&e.target&&e.target.classList&&e.target.classList.contains('modal'))pickClose();},true);
/* Projekttáblázat: a sor Enterrel is megnyitható */
document.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const r=e.target.closest&&e.target.closest('.pt-row');if(!r)return;e.preventDefault();ACT['open-project'](r);});

/* 🎉 Konfetti a projekt lezárásakor (könyvtár nélkül, vászonra rajzolva, ~3 mp) */
function confetti(){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;}catch(e){}
  const c=document.createElement('canvas'),x=c.getContext('2d'),W=c.width=innerWidth,H=c.height=innerHeight;
  c.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:9999';document.body.appendChild(c);
  const cols=['#1f5c3f','#2e7d52','#f2c14e','#e4572e','#4a90d9','#b05cc5','#ffffff'],P=[];
  for(let i=0;i<520;i++){const left=i%2===0;P.push({x:left?-10:W+10,y:H*0.65,vx:(left?1:-1)*(4+Math.random()*9),vy:-(9+Math.random()*12),w:6+Math.random()*6,h:8+Math.random()*10,r:Math.random()*6,vr:(Math.random()-.5)*.35,c:cols[i%cols.length],t:Math.random()*Math.PI*2});}
  const t0=performance.now();
  (function f(now){const el=now-t0;x.clearRect(0,0,W,H);
    P.forEach(p=>{p.vy+=0.32;p.vx*=0.985;p.x+=p.vx+Math.sin(p.t+=0.08)*0.8;p.y+=p.vy;p.r+=p.vr;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.globalAlpha=Math.max(0,1-Math.max(0,el-2600)/900);x.fillStyle=p.c;x.fillRect(-p.w/2,-p.h/2,p.w,p.h*Math.abs(Math.cos(p.t)));x.restore();});
    if(el<3500)requestAnimationFrame(f);else c.remove();})(t0);
  if(!confetti._rain){confetti._rain=1;setTimeout(()=>{confetti._rain=0;confettiRain();},350);}}
/* második hullám: felülről hulló konfetti */
function confettiRain(){const c=document.createElement('canvas'),x=c.getContext('2d'),W=c.width=innerWidth,H=c.height=innerHeight;c.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:9999';document.body.appendChild(c);
  const cols=['#1f5c3f','#2e7d52','#f2c14e','#e4572e','#4a90d9','#b05cc5','#ffffff'],P=[];for(let i=0;i<320;i++)P.push({x:Math.random()*W,y:-20-Math.random()*H*0.8,vx:(Math.random()-.5)*2,vy:2+Math.random()*4,w:5+Math.random()*6,h:8+Math.random()*9,r:Math.random()*6,vr:(Math.random()-.5)*.3,c:cols[i%cols.length],t:Math.random()*6});
  const t0=performance.now();(function f(now){const el=now-t0;x.clearRect(0,0,W,H);P.forEach(p=>{p.x+=p.vx+Math.sin(p.t+=0.06)*1.2;p.y+=p.vy;p.r+=p.vr;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.globalAlpha=Math.max(0,1-Math.max(0,el-3600)/900);x.fillStyle=p.c;x.fillRect(-p.w/2,-p.h/2,p.w,p.h*Math.abs(Math.cos(p.t)));x.restore();});if(el<4500)requestAnimationFrame(f);else c.remove();})(t0);}

/* Naptár: üres napra kattintva új projekt (sablonnal is) – a bejegyzésekre kattintva azok nyílnak meg */
document.addEventListener('click',e=>{if(ro()||S.tab!=='naptar'||CAL_MOB())return;const d=e.target.closest&&e.target.closest('.cal-day');if(!d||e.target.closest('button,a,.cal-chip'))return;
  const day=d.dataset.day;if(day)guard(()=>newProjectModal(day));});

/* E-mail értesítések típusonként (Beállítások) */
document.addEventListener('change',async e=>{const t=e.target;if(!t.dataset||!t.dataset.mailcat)return;const cat=t.dataset.mailcat,on=t.checked;
  S.mailCats=Object.assign({},S.mailCats||{},{[cat]:on});
  try{const r=await call('setMail',{cat,on});if(r.mailCats)S.mailCats=r.mailCats;render(true);toast(on?'Bekapcsolva':'Kikapcsolva');}catch(err){S.mailCats[cat]=!on;t.checked=!on;handleErr(err);}});

/* Másolat (CC) beállítása típusonként */
document.addEventListener('change',async e=>{const t=e.target;if(!t.dataset||!t.dataset.mailcc)return;const cat=t.dataset.mailcc;
  const cur=new Set((S.mailCc&&S.mailCc[cat])||[]);if(t.checked)cur.add(t.dataset.role);else cur.delete(t.dataset.role);const list=[...cur];
  S.mailCc=Object.assign({},S.mailCc||{},{[cat]:list});t.closest('.cc-chip').classList.toggle('on',t.checked);
  try{const r=await call('setMail',{cat,cc:list});if(r.mailCc)S.mailCc=r.mailCc;toast('Másolat mentve');}catch(err){handleErr(err);render(true);}});

/* Díjtáblázat sorainak sorrendje: húzással (a ⠿ fogantyúnál fogva) – csak ugyanazon a táblázaton belül */
let FEE_DRAG=null;
document.addEventListener('mousedown',e=>{const h=e.target.closest&&e.target.closest('[data-drag-fee]');if(!h)return;const tr=h.closest('tr');if(tr)tr.draggable=true;});
document.addEventListener('dragstart',e=>{const tr=e.target.closest&&e.target.closest('tr[data-fee-row]');if(!tr||!tr.draggable)return;FEE_DRAG={i:Number(tr.dataset.feeRow),tbody:tr.parentNode};tr.classList.add('dragging');try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','fee');}catch(_){}});
document.addEventListener('dragover',e=>{if(!FEE_DRAG)return;const tr=e.target.closest&&e.target.closest('tr[data-fee-row]');if(!tr||tr.parentNode!==FEE_DRAG.tbody)return;e.preventDefault();
  document.querySelectorAll('tr.drop-above,tr.drop-below').forEach(x=>x.classList.remove('drop-above','drop-below'));const r=tr.getBoundingClientRect();tr.classList.add(e.clientY<r.top+r.height/2?'drop-above':'drop-below');});
document.addEventListener('drop',e=>{if(!FEE_DRAG)return;const tr=e.target.closest&&e.target.closest('tr[data-fee-row]');const src=FEE_DRAG;FEE_DRAG=null;
  document.querySelectorAll('tr.drop-above,tr.drop-below,tr.dragging').forEach(x=>x.classList.remove('drop-above','drop-below','dragging'));
  if(!tr||tr.parentNode!==src.tbody||!S.draft)return;e.preventDefault();const r=tr.getBoundingClientRect(),after=e.clientY>=r.top+r.height/2;
  const f=(S.draft.fees||[]).slice(),from=src.i;let to=Number(tr.dataset.feeRow);if(from===to)return;const item=f.splice(from,1)[0];if(from<to)to--;if(after)to++;f.splice(to,0,item);setDraft({fees:f});});
document.addEventListener('dragend',()=>{FEE_DRAG=null;document.querySelectorAll('tr[data-fee-row]').forEach(x=>{x.draggable=false;x.classList.remove('dragging','drop-above','drop-below');});});
/* Naptár: lapozás húzással (jobbra-balra mindig; fel-le a lap tetején / alján) és trackpad oldalirányú görgetéssel */
(()=>{let sx=0,sy=0,st=0,on=false;const nav=d=>{if(S.tab!=='naptar'||$('mform'))return;ACT['cal-nav']({dataset:{d:String(d)}});const g=document.querySelector('.cal-grid');if(g){g.classList.remove('cal-slide-l','cal-slide-r');void g.offsetWidth;g.classList.add(d>0?'cal-slide-l':'cal-slide-r');}};
  document.addEventListener('touchstart',e=>{const g=e.target.closest&&e.target.closest('.cal-grid');on=!!g&&e.touches.length===1;if(!on)return;sx=e.touches[0].clientX;sy=e.touches[0].clientY;st=Date.now();},{passive:true});
  document.addEventListener('touchend',e=>{if(!on)return;on=false;const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Date.now()-st>800)return;
    if(Math.abs(dx)>60&&Math.abs(dx)>1.5*Math.abs(dy)){nav(dx<0?1:-1);return;}
    /* függőleges húzással nem lapozunk (rosszul mutatott) – csak oldalra */},{passive:true});
  let acc=0,lock=0,wt=0;const gridEl=()=>document.querySelector('.cal-grid');
  const follow=(g,dx)=>{g.style.transition='none';g.style.transform=`translateX(${Math.max(-160,Math.min(160,-dx))}px)`;g.style.opacity=String(1-Math.min(.35,Math.abs(dx)/600));};
  const snap=g=>{g.style.transition='transform .18s ease-out,opacity .18s';g.style.transform='';g.style.opacity='';};
  document.addEventListener('wheel',e=>{if(S.tab!=='naptar'||!(e.target.closest&&e.target.closest('.cal-grid')))return;if(Math.abs(e.deltaX)<=Math.abs(e.deltaY)){const de=document.documentElement,up=e.deltaY<0;if((up&&scrollY<=0)||(!up&&innerHeight+scrollY>=de.scrollHeight-1))e.preventDefault();return;}e.preventDefault();
    const g=gridEl();if(Date.now()<lock){acc=0;return;}acc+=e.deltaX;if(g)follow(g,acc);clearTimeout(wt);wt=setTimeout(()=>{const g2=gridEl();if(g2)snap(g2);acc=0;},160);   // a rács követi a görgetést, elég nagy mozdulatnál hónapot vált
    if(Math.abs(acc)>140){const d=acc>0?1:-1;acc=0;lock=Date.now()+650;clearTimeout(wt);nav(d);}},{passive:false});
  /* egérrel húzva is lapozható (mint az idővonal): a rács követi az egeret, elengedéskor hónapot vált */
  let dg=null;document.addEventListener('mousedown',e=>{if(e.button!==0||S.tab!=='naptar')return;const g=e.target.closest&&e.target.closest('.cal-grid');if(!g||e.target.closest('[draggable=true],button,a,input'))return;dg={x:e.clientX,g,moved:false};});
  document.addEventListener('mousemove',e=>{if(!dg)return;const dx=e.clientX-dg.x;if(!dg.moved&&Math.abs(dx)<6)return;if(!dg.moved){dg.moved=true;document.body.classList.add('cal-panning');}e.preventDefault();follow(dg.g,-dx);});
  document.addEventListener('mouseup',e=>{if(!dg)return;const d=dg;dg=null;document.body.classList.remove('cal-panning');if(!d.moved)return;const dx=e.clientX-d.x;
    const blk=ev=>{ev.stopPropagation();ev.preventDefault();};document.addEventListener('click',blk,{capture:true,once:true});setTimeout(()=>document.removeEventListener('click',blk,true),50);   // húzás után ne jelöljön ki napot
    if(Math.abs(dx)>Math.max(70,d.g.offsetWidth*.12))nav(dx<0?1:-1);else snap(d.g);});})();

ACT['raw-skip']=()=>{const n=S._rawNext;closeModal();if(n)n();};
ACT['cut-deliver']=()=>cutDeliverModal();

ACT['copy-pass']=async b=>{const v=b.dataset.pass||'';try{await navigator.clipboard.writeText(v);}catch(e){const t=document.createElement('textarea');t.value=v;document.body.appendChild(t);t.select();try{document.execCommand('copy');}catch(e2){}t.remove();}toast('Jelszó a vágólapon');};
document.addEventListener('mouseover',e=>{const w=e.target.closest&&e.target.closest('.pass-wrap');if(!w)return;const pop=w.querySelector('.pass-pop'),r=w.getBoundingClientRect();if(pop){pop.style.left=Math.max(8,Math.min(r.left,innerWidth-260))+'px';pop.style.top=(r.bottom+48>innerHeight?r.top-44:r.bottom+6)+'px';}});   // a jelszó-buborék a görgethető táblázatból se lógjon ki
/* Eszközlista: előnézet – pontosan az a levél, amit a kiválasztott címzett kap (a mentett adatokkal) */
ACT['eq-preview']=async b=>{const f=$('mform'),p=S.draft||projById(S.projectId);if(!f||!p)return;const fd=new FormData(f),to=fd.getAll('to');if(!to.length){toast('Válassz ki legalább egy címzettet.',true);return;}
  const box=$('eq-prev');if(box)box.innerHTML='<div class="sz-searching"><span class="sz-radar"></span><span>Előnézet készül<span class="sz-dots"><i>.</i><i>.</i><i>.</i></span></span></div>';
  try{if(S.dirty&&!ro())saveDraft();await SAVE_Q;
    const r=await call('sendEquipmentList',{projectId:p.id,recipients:to,message:String(fd.get('message')||'').trim(),includePlan:fd.get('plan')==='on',preview:true});S._eqPrev=r.previews||[];
    if(!$('eq-prev'))return;$('eq-prev').innerHTML=`<div class="tig-prev-h"><b>Előnézet</b> <span class="muted">– így kapja meg:</span> <select class="inp eq-prev-sel" id="eq-prev-sel" style="width:auto;display:inline-block;padding:5px 8px;font-size:13px">${S._eqPrev.map((x,i)=>`<option value="${i}">${esc(x.name)} · ${esc(x.email)}</option>`).join('')}</select></div><div class="eq-prev-subj"></div><iframe class="tig-frame" title="E-mail előnézet" sandbox></iframe>`;eqPrevShow(0);$('eq-prev').scrollIntoView({behavior:'smooth',block:'start'});}
  catch(e){if($('eq-prev'))$('eq-prev').innerHTML='';handleErr(e);}};
function eqPrevShow(i){const x=(S._eqPrev||[])[i];const box=$('eq-prev');if(!x||!box)return;box.querySelector('.eq-prev-subj').innerHTML=`<span class="muted">Tárgy:</span> <b>${esc(x.subject)}</b>`;box.querySelector('iframe').srcdoc='<html><head><meta charset="utf-8"></head><body style="margin:16px">'+x.html+'</body></html>';}
document.addEventListener('change',e=>{if(e.target.id==='eq-prev-sel')eqPrevShow(Number(e.target.value));});
/* Keresés folyamatban: forgó jel, pontok és fénycsík (HubSpot, számlázz.hu, …) */
function searchingHtml(t){return `<div class="sz-searching"><span class="sz-radar"></span><span>${esc(t)}<span class="sz-dots"><i>.</i><i>.</i><i>.</i></span></span></div>`;}

/* Ctrl/⌘/Shift + kattintás vagy középső gomb: a projekt / fül megnyitása új lapon */
function actHref(el){const a=el&&el.dataset&&el.dataset.action;if(!a)return null;
  if(a==='open-project'&&el.dataset.id)return '#p='+projSlug(projById(el.dataset.id)||{id:el.dataset.id});
  if(a==='tab'&&el.dataset.tab)return '#t='+encodeURIComponent(el.dataset.tab);
  if(a==='pen-open'&&el.dataset.pid)return '#p='+projSlug(projById(el.dataset.pid)||{id:el.dataset.pid});
  return null;}
function openNewTab(e){const el=e.target.closest&&e.target.closest('[data-action]'),h=actHref(el);if(!h)return false;e.preventDefault();e.stopImmediatePropagation();window.open(location.pathname+location.search+h,'_blank','noopener');return true;}
document.addEventListener('click',e=>{if(e.ctrlKey||e.metaKey||e.shiftKey)openNewTab(e);},true);
document.addEventListener('auxclick',e=>{if(e.button===1)openNewTab(e);},true);
document.addEventListener('mousedown',e=>{if(e.button===1&&actHref(e.target.closest&&e.target.closest('[data-action]')))e.preventDefault();},true);   // középső gombnál ne induljon görgetés

/* NAV-ból párosított bejövő számla megnyitása új lapon (a NAV-ban tárolt számlaadatokból) */
ACT['nav-inv']=async b=>{const w=window.open('about:blank','_blank');const H=h=>{if(w){w.document.open();w.document.write(h);w.document.close();}};
  const css='body{font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;color:#1d2b36;max-width:860px;margin:24px auto;padding:0 20px}h1{font-size:24px;margin:0 0 2px}.muted{color:#6b7782}.box{border:1px solid #dfe4e7;border-radius:10px;padding:12px 14px}.two{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:16px 0}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{padding:7px 8px;border-bottom:1px solid #eceff1;text-align:left}th{font-size:11px;text-transform:uppercase;color:#6b7782;background:#f5f7f8}.r{text-align:right}.tot{margin-left:auto;width:300px;margin-top:10px}.tot div{display:flex;justify-content:space-between;padding:3px 0}.tot .g{font-size:18px;font-weight:800;border-top:2px solid #1d2b36;margin-top:6px;padding-top:8px}.inv{page-break-after:always;margin-bottom:40px}.lbl{font-size:11px;text-transform:uppercase;color:#6b7782;margin-bottom:4px}.meta{display:flex;gap:28px;flex-wrap:wrap}.meta b{display:block}';
  H(`<title>Számla betöltése…</title><style>${css}</style><p class="muted">Számla betöltése a NAV-ból…</p>`);
  try{const list=await call('navInvoices',{nos:b.dataset.nos,tax:b.dataset.tax});const F=n=>ftFmt(Math.round(num(n)));const PM={TRANSFER:'Átutalás',CASH:'Készpénz',CARD:'Bankkártya',VOUCHER:'Utalvány',OTHER:'Egyéb'};
    H(`<title>${esc(list.map(x=>x.number).join(', '))}</title><style>${css}</style>`+list.map(x=>x.error?`<div class="inv"><h1>${esc(x.number)}</h1><p>${esc(x.error)}</p></div>`:`<div class="inv"><h1>Számla · ${esc(x.number)}</h1><div class="muted">A NAV Online Számla rendszerében tárolt adatok alapján</div>
      <div class="two"><div class="box"><div class="lbl">Eladó</div><b>${esc(x.supplier.name)}</b><br>${esc(x.supplier.address)}<br>Adószám: ${esc(x.supplier.tax)}${x.supplier.bank?'<br>Bankszámla: '+esc(x.supplier.bank):''}</div><div class="box"><div class="lbl">Vevő</div><b>${esc(x.customer.name)}</b>${x.customer.address?'<br>'+esc(x.customer.address):''}</div></div>
      <div class="meta"><div>Kelt<b>${esc(x.issueDate)}</b></div><div>Teljesítés<b>${esc(x.deliveryDate)}</b></div><div>Fizetési határidő<b>${esc(x.dueDate||'–')}</b></div><div>Fizetési mód<b>${esc(PM[x.payMethod]||x.payMethod||'–')}</b></div></div>
      <table><thead><tr><th>Megnevezés</th><th class="r">Menny.</th><th class="r">Egységár</th><th class="r">Nettó</th><th class="r">ÁFA</th><th class="r">Bruttó</th></tr></thead><tbody>${x.lines.map(l=>`<tr><td>${esc(l.name)}</td><td class="r">${esc(String(l.qty))} ${esc(l.unit||'')}</td><td class="r">${F(l.price)}</td><td class="r">${F(l.net)}</td><td class="r">${esc(l.vat||'')}</td><td class="r">${F(l.gross||l.net)}</td></tr>`).join('')}</tbody></table>
      <div class="tot"><div><span>Nettó</span><b>${F(x.net)}</b></div><div><span>ÁFA</span><b>${F(x.vat)}</b></div><div class="g"><span>Bruttó</span><span>${F(x.gross)}</span></div></div></div>`).join(''));}
  catch(e){if(w)w.close();handleErr(e);}};

ACT['pay-sent-open']=b=>{const c=crewById(b.dataset.cid);openModal('📧 Kiküldött díjösszesítő'+(c?' – '+c.name:''),'<div id="payPrev"></div>',{cancelLabel:'Bezárás'});
  const mb=document.querySelector('#modalRoot .mbox');if(mb)mb.classList.add('mbox-wide');ACT['pay-sent-view'](b);};

/* Kész videók linkjei – lezárt projektnél is módosíthatók */
ACT['dl-edit']=b=>{const p=projById(b.dataset.id)||S.draft;if(!p)return;
  openModal('🎬 Kész videók linkjei – '+(p.name||''),`<div class="fields">${linksField('deliveryLink','A videók linkje',p.deliveryLink,p.deliveryLinks)}${passField(p.deliveryPass)}</div>`,
    {submit:async fd=>{const link=String(fd.get('deliveryLink')||'').trim();if(!/^https:\/\/\S+$/i.test(link)){toast('A link https:// kezdetű legyen.',true);return;}
      const links=linksVal(fd,'deliveryLink');if(linksBad(links)){toast('Minden link https:// kezdetű legyen.',true);return;}if(fd.get('hasPass')&&!passVal(fd)){toast('Add meg a jelszót.',true);return;}
      try{const r=await call('setDeliveryLinks',{projectId:p.id,link,links,pass:passVal(fd)});const k=S.projects.findIndex(x=>x.id===p.id);if(k>=0&&r.project)S.projects[k]=normProj(r.project);
        if(S.projectId===p.id&&r.project&&!S.dirty){S.draft=prepDraft(r.project);S.draftBase=clone(S.draft);}closeModal();render(true);toast('Linkek mentve');}catch(e){handleErr(e);}}});};

ACT['nav-unpair']=b=>{const nm=(crewById(b.dataset.cid)||{}).name||'';
  confirmModal('Párosítás törlése',`A(z) ${b.dataset.nos} számla nem ${nm} ehavi számlája? A párosítás törlődik, a „Számlát kiállította” újra üres lesz. (A számla a NAV-ban és a számlázóban változatlan.)`,'Törlés',async()=>{
    try{S.payStatus=await call('setPayStatus',{month:b.dataset.month,crewId:b.dataset.cid,field:'invoiced',on:false});closeModal();render(true);toast(`${nm}: párosítás törölve`);}catch(e){handleErr(e);}});};

/* Projekt részletei: létrehozás, módosítások, naplóbejegyzések */
ACT['proj-history']=async b=>{const p=projById(b.dataset.id)||S.draft;if(!p)return;
  openModal('ℹ️ Részletek – '+(p.name||''),'<div id="ph-body"><p class="hint">Betöltés…</p></div>',{cancelLabel:'Bezárás'});const mb=document.querySelector('#modalRoot .mbox');if(mb)mb.classList.add('mbox-wide');
  try{const r=await call('projectHistory',{id:p.id});const box=$('ph-body');if(!box)return;const d=s=>String(s||'').replace(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2}).*/,'$1. $2. $3. $4');
    box.innerHTML=`<div class="sz-info"><div><span>Létrehozta</span><b>${esc(r.createdBy||'–')}</b></div><div><span>Létrehozva</span><b>${esc(d(r.createdAt)||'–')}</b></div><div><span>Utoljára módosította</span><b>${esc(r.updatedBy||'–')}</b></div><div><span>Utoljára módosítva</span><b>${esc(d(r.updatedAt)||'–')}</b></div><div><span>Azonosító</span><b style="font-weight:500;font-size:12px">${esc(r.id)}</b></div></div>
      <div class="sec-lbl" style="margin:14px 0 6px">Előzmények (${r.log.length})</div>
      ${r.log.length?`<div class="ph-list">${r.log.map(x=>`<div class="ph-row"><div class="ph-at">${esc(d(x.at))}</div><div class="ph-main"><b>${esc(x.action)}</b> <span class="muted">· ${esc(x.who)}${x.role?' ('+esc(x.role)+')':''}</span>${x.details?`<div class="ph-det">${esc(x.details).replace(/; /g,'<br>')}</div>`:''}</div></div>`).join('')}</div>`:'<p class="hint">Ehhez a projekthez még nincs naplóbejegyzés.</p>'}`;}
  catch(e){const box=$('ph-body');if(box)box.innerHTML=`<p class="bad-txt">${esc(errText(e))}</p>`;}};

const salesOnly=roles=>roles.length>0&&roles.every(r=>r==='Értékesítő'||r==='Ajánlói jutalék');   // csak értékesítői szerep: a gyártási részletek és a napidíj nem kell
function crewSalesToggle(){const w=document.querySelector('.msel[data-msel=roles]');if(!w)return;const so=salesOnly([...w.querySelectorAll('input:checked')].map(i=>i.value));['f-skills','f-dayRate'].forEach(id=>{const x=$(id);if(x)x.hidden=so;});}
document.addEventListener('change',e=>{const w=e.target.closest&&e.target.closest('.msel');if(!w)return;if(w.dataset.msel==='roles')crewSalesToggle();const ph=w.dataset.ph||(w.dataset.msel==='roles'?'Válassz szerepet…':'Válassz részleteket…');w.querySelector('.msel-v').innerHTML=mselSum([...w.querySelectorAll('input:checked')].map(i=>i.value),ph);});
document.addEventListener('click',e=>{if(!e.target.closest('.msel'))document.querySelectorAll('.msel-pop').forEach(x=>{if(!x.hidden){x.hidden=true;x.closest('.msel').classList.remove('open');}});});

/* Eszközök véglegesítése: ki milyen eszközlistát kap – a „✉️ Levél ▾” gomb kinyitja a teljes levelet */
let EQ_PREV=[];
async function eqPreviewLoad(pid){const box=$('eqMailBox');let L=[];try{L=await call('eqListPreview',{projectId:pid})||[];}catch(e){if(box)box.innerHTML=`<p class="hint bad-txt" style="margin:10px 0 0">Az előnézet most nem érhető el: ${esc(errText(e))}</p>`;return;}
  EQ_PREV=L;const b=$('eqMailBox');if(!b)return;
  b.innerHTML=L.length?`<p style="margin:12px 0 4px"><b>✉️ Eszközlistát kap e-mailben:</b> <span class="muted">– a <b>✉️ Levél ▾</b> gombbal megnézheted, mi megy ki</span></p><ul class="cf-list">${L.map((x,i)=>`<li><b>${esc(x.name)}</b> <span class="muted">· ${esc(x.email)}</span><button class="btn sm cf-open" type="button" data-action="eq-open" data-i="${i}" aria-expanded="false">✉️ Levél ▾</button><div class="cf-prev" data-eqp="${i}" hidden></div></li>`).join('')}</ul>`
    :`<p class="hint" style="margin:10px 0 0">✉️ Senki nem kap eszközlistát e-mailben${S.mailOn===false?' (a levelezés ki van kapcsolva)':' (nincs kinél eszköz, vagy nincs e-mail-címe)'}.</p>`;}
ACT['eq-open']=b=>{const i=Number(b.dataset.i),x=EQ_PREV[i],box=document.querySelector(`[data-eqp="${i}"]`);if(!x||!box)return;
  const open=box.hidden;box.hidden=!open;b.setAttribute('aria-expanded',String(open));b.classList.toggle('on',open);b.textContent=open?'✉️ Levél ▴':'✉️ Levél ▾';
  if(open&&!box.dataset.done){box.dataset.done='1';box.innerHTML=`<div class="cf-prev-box"><div class="cf-prev-meta"><span>Címzett:</span> <b>${esc(x.name)}</b> &lt;${esc(x.email)}&gt;<br><span>Tárgy:</span> <b>${esc(x.subject)}</b></div><div class="cf-prev-frame"></div></div>`;
    const sr=box.querySelector('.cf-prev-frame').attachShadow({mode:'open'});sr.innerHTML=`<style>:host{display:block}.m{font:14px/1.5 Arial,Helvetica,sans-serif;color:#111;padding:10px 4px}a{color:#1a5fb4;pointer-events:none}p{margin:0 0 10px}td{vertical-align:top}</style><div class="m">${x.html}</div>`;}};

/* Csapat élesítése: a kiküldendő levél teljes előnézete tagonként, élőben frissül a tárgy / bevezető / megjegyzés szerkesztésekor */
let CF_PREV=[],CF_EDIT={};
async function cfPreviewLoad(p,defSubj,defIntro){CF_PREV=[];CF_EDIT={};
  try{CF_PREV=await call('crewFinalPreview',{projectId:p.id,cutTasks:cutTasksFor(projById(p.id)||p)})||[];}catch(e){const b=$('cfPrev');if(b)b.innerHTML=`<p class="hint bad-txt" style="margin:0">Az előnézet most nem érhető el: ${esc(errText(e))}</p>`;return;}
  const sel=$('cfPrevWho');if(!sel)return;
  if(!CF_PREV.length){$('cfPrev').innerHTML='<p class="hint" style="margin:0">Senki nem kap levelet (nincs e-mail-cím, vagy nem kell új értesítés).</p>';return;}
  sel.innerHTML=CF_PREV.map((x,i)=>`<option value="${i}">${esc(x.name)} · ${esc(x.email)}</option>`).join('');sel.hidden=true;
  cfPreviewRender(defSubj,defIntro);}
function cfPreviewRender(defSubj,defIntro){const box=$('cfPrev'),sel=$('cfPrevWho');if(!box||!sel||!CF_PREV.length)return;
  const x=CF_PREV[Number(sel.value)||0]||CF_PREV[0],v=id=>String(($(id)||{}).value||'').trim();
  const subj=v('m-cfSubj')&&v('m-cfSubj')!==defSubj?v('m-cfSubj'):x.subject,intro=x.changed?'Módosult a beosztásod ezen a projekten:':'Véglegesítettük a csapatot, és beosztottunk erre a projektre:',note=v('m-cfNote');
  const nl=s=>esc(s).replace(/\n/g,'<br>');
  let html=x.html.replace('@@INTRO@@',nl(intro));html=note?html.replace('@@NOTE@@',nl(note)):html.replace(/<p>@@NOTE@@<\/p>/,'');
  if(CF_EDIT[x.id])html=CF_EDIT[x.id];   // kézzel átírva: a megjegyzés mező már nem írja felül
  const rb=$('cfPrevReset');if(rb){rb.hidden=!CF_EDIT[x.id];rb.onclick=()=>{delete CF_EDIT[x.id];cfPreviewRender(defSubj,defIntro);};}
  box.innerHTML=`<div class="cf-prev-meta"><span>Címzett:</span> <b>${esc(x.name)}</b> &lt;${esc(x.email)}&gt;<br><span>Tárgy:</span> <b>${esc(subj)}</b></div><div class="cf-prev-frame"></div>`;
  const host=box.querySelector('.cf-prev-frame'),sr=host.attachShadow({mode:'open'});   // saját stílus, az app CSS-e nem hat rá (mint egy levelezőben)
  sr.innerHTML=`<style>:host{display:block}.m{font:14px/1.5 Arial,Helvetica,sans-serif;color:#111;padding:10px 4px}a{color:#1a5fb4}.m:focus{outline:2px solid #2e7d52;outline-offset:2px;border-radius:6px}p{margin:0 0 10px}table{margin:0 0 10px}td{vertical-align:top}td p{margin:0}</style><div class="m" contenteditable="true" spellcheck="true">${html}</div>`;
  const m=sr.querySelector('.m');m.addEventListener('input',()=>{CF_EDIT[x.id]=m.innerHTML;const r2=$('cfPrevReset');if(r2)r2.hidden=false;});
  m.addEventListener('paste',e=>{const cd=e.clipboardData;if(!cd)return;e.preventDefault();document.execCommand('insertText',false,cd.getData('text/plain')||'');});}
document.addEventListener('input',e=>{if(['m-cfSubj','m-cfNote'].includes(e.target.id)){const s=$('m-cfSubj'),i=$('m-cfIntro');cfPreviewRender(s&&s.defaultValue,i&&i.defaultValue);}});
document.addEventListener('change',e=>{if(e.target.id==='cfPrevWho'){const s=$('m-cfSubj'),i=$('m-cfIntro');cfPreviewRender(s&&s.defaultValue,i&&i.defaultValue);}});

/* E-mail aláírás (ügyvezető, termelési vezetők): beosztás, telefon, fotó – élő előnézettel */
function sigRender(el,html){if(!el)return;const sr=el.shadowRoot||el.attachShadow({mode:'open'});sr.innerHTML=`<style>:host{display:block}a{pointer-events:none}</style>${html}`;}
function sigPreviewHtml(f){const e=esc,F='font-family:Arial,Helvetica,sans-serif;',ph=/^https:\/\//i.test(f.photo||'');
  return `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:375px;${F}color:#111"><tr><td colspan="2" style="padding:0 0 5pt;font-size:10pt">Üdvözlettel,</td></tr><tr>${ph?`<td style="width:116px;padding:8px 0 8px 8px;vertical-align:middle;background:#f2f2f2;border-left:4px solid #111"><img alt="" src="${e(f.photo)}" style="display:block;width:108px;height:108px;border-radius:54px;object-fit:cover"></td>`:''}<td style="padding:8px 8px 8px ${ph?'0':'12px'};vertical-align:middle;white-space:nowrap;background:#f2f2f2;${ph?'':'border-left:4px solid #111;'}"><div style="font-size:14pt;font-weight:700;margin:0 0 4pt">${e(f.name)}</div>${f.title?`<div style="font-size:10pt;margin:0 0 4pt">${e(f.title)}</div>`:''}<div style="font-size:10pt;font-weight:700;margin:0 0 4pt">Lumos Motion Kft.</div>${f.phone?`<div style="font-size:10pt;margin:0 0 4pt">Tel.: <a style="color:#1155cc">${e(f.phone)}</a></div>`:''}<div style="font-size:10pt">Email: <a style="color:#1155cc">${e(f.email)}</a></div></td></tr><tr><td colspan="2" style="padding:6pt 0 0"><img alt="Lumos Motion" src="https://projekttervezo.lumosmotion.hu/sig/lumos-motion.png" style="display:block;width:224px;height:23px"></td></tr></table>`;}
function sigModal(uid){const sg=(S.sigs||{})[uid];if(!sg)return;
  openModal('✍️ E-mail aláírás – '+sg.name,`<div class="fields">
    ${sg.custom?'<div class="field full"><p class="hint warn-txt" style="margin:0">Most a felhasználónál beillesztett aláírás van érvényben – ezek a mezők csak akkor számítanak, ha ott visszaállítod az alap aláírásra.</p></div>':''}
    <div class="field full"><label for="m-sgName">Név az aláírásban</label><input class="inp" id="m-sgName" name="sgName" maxlength="80" value="${esc(sg.name||'')}" placeholder="pl. Egri Ervin"></div>
    <div class="field"><label for="m-sgTitle">Beosztás</label><input class="inp" id="m-sgTitle" name="sgTitle" maxlength="80" value="${esc(sg.title||'')}" placeholder="pl. Produkciós koordinátor"></div>
    <div class="field"><label for="m-sgPhone">Telefon</label><input class="inp" id="m-sgPhone" name="sgPhone" maxlength="40" value="${esc(sg.phone||'')}" placeholder="+36 20 123 4567"></div>
    <div class="field full"><label for="m-sgPhoto">Fotó linkje <span class="muted">(nem kötelező, https://…)</span></label><input class="inp" id="m-sgPhoto" name="sgPhoto" maxlength="400" value="${esc(sg.photo||'')}" placeholder="https://projekttervezo.lumosmotion.hu/sig/nev.jpg"></div>
    <div class="field full"><span class="lbl">Előnézet <span class="muted">– az e-mail-cím a felhasználói fiókból jön</span></span><div class="sig-prev" id="sgPrev"></div></div></div>`,
    {submitLabel:'Mentés',submit:async fd=>{try{S.sigs=await call('saveSignature',{userId:uid,name:String(fd.get('sgName')||'').trim(),title:String(fd.get('sgTitle')||'').trim(),phone:String(fd.get('sgPhone')||'').trim(),photo:String(fd.get('sgPhoto')||'').trim()});closeModal();render(true);toast('Aláírás mentve – a következő levelektől ezt használja az app');}catch(e){handleErr(e);}}});
  const upd=()=>sigRender($('sgPrev'),sigPreviewHtml({name:($('m-sgName')||{}).value||sg.name,email:sg.email,title:($('m-sgTitle')||{}).value,phone:($('m-sgPhone')||{}).value,photo:($('m-sgPhoto')||{}).value}));upd();
  ['m-sgName','m-sgTitle','m-sgPhone','m-sgPhoto'].forEach(id=>{const x=$(id);if(x)x.addEventListener('input',upd);});}
if(window.MutationObserver){let sgT=0;new MutationObserver(()=>{if(sgT)return;sgT=requestAnimationFrame(()=>{sgT=0;document.querySelectorAll('[data-sig]').forEach(el=>{if(el.shadowRoot)return;const sg=(S.sigs||{})[el.dataset.sig];if(sg)sigRender(el,sg.html);});});}).observe(document.documentElement,{childList:true,subtree:true});}

/* Élesítés: a névsorban a „✉️ Levél ▾” gomb az illető levelét nyitja ki a neve alatt (újra kattintva bezárja) */
ACT['cf-open']=b=>{const id=b.dataset.id,box=document.querySelector('#mform .cf-prev'),li=b.closest('li'),sel=$('cfPrevWho');if(!box||!li||!sel)return;
  const open=li.contains(box)&&!box.hidden;
  document.querySelectorAll('#mform .cf-open').forEach(x=>{x.setAttribute('aria-expanded','false');x.classList.remove('on');});
  if(open){box.hidden=true;return;}
  const i=CF_PREV.findIndex(x=>x.id===id);
  if(i<0){toast(CF_PREV.length?'Ő most nem kap levelet (nem új tag, és a beosztása sem változott).':'Az előnézet még töltődik – egy pillanat, és próbáld újra.');return;}
  sel.value=String(i);li.appendChild(box);box.hidden=false;b.setAttribute('aria-expanded','true');b.classList.add('on');
  const h=$('cfPrevHint');if(h)h.hidden=true;const s=$('m-cfSubj'),it=$('m-cfIntro');cfPreviewRender(s&&s.defaultValue,it&&it.defaultValue);};

/* Aláírás beillesztése (pl. Google-dokumentumból): csak biztonságos elemek maradnak; a beágyazott (data:) képeket kihagyjuk, mert a levelezők nem mutatják */
let SIG_ED={dirty:false,reset:false};
function sigClean(html){const doc=new DOMParser().parseFromString('<div>'+String(html||'')+'</div>','text/html'),root=doc.body.firstChild;let dropped=0;
  const OK=new Set(['TABLE','TBODY','THEAD','TR','TD','TH','DIV','SPAN','P','BR','B','STRONG','I','EM','U','A','IMG','FONT','SMALL','SUB','SUP','HR']),ATTR=new Set(['style','href','src','width','height','alt','colspan','rowspan','cellpadding','cellspacing','border','align','valign','bgcolor','color','face','size','target']);
  const walk=el=>{[...el.children].forEach(c=>{
    if(!OK.has(c.tagName)){if(['SCRIPT','STYLE','META','LINK','IFRAME','OBJECT','TITLE'].includes(c.tagName)){c.remove();return;}walk(c);c.replaceWith(...c.childNodes);return;}
    [...c.attributes].forEach(at=>{const n=at.name.toLowerCase(),v=at.value.trim();if(!ATTR.has(n)||((n==='href')&&!/^(https?:|mailto:|tel:)/i.test(v))||(n==='style'&&/expression|url\(\s*['"]?\s*(javascript|data):/i.test(v)))c.removeAttribute(at.name);});
    if(c.tagName==='IMG'&&!/^https:\/\//i.test(c.getAttribute('src')||'')){dropped++;c.remove();return;}
    walk(c);});};
  walk(root);return {html:root.innerHTML.trim(),dropped};}
function sigEdInit(u){const ed=$('m-sigEd');if(!ed||!u)return;SIG_ED={dirty:false,reset:false};const sg=(S.sigs||{})[u.id]||{};ed.innerHTML=sigClean(sg.html||'').html;
  const msg=t=>{const m=$('m-sigMsg');if(m)m.textContent=t;};
  ed.addEventListener('paste',e=>{const cd=e.clipboardData;if(!cd)return;const h=cd.getData('text/html');e.preventDefault();
    const r=h?sigClean(h):{html:esc(cd.getData('text/plain')||'').replace(/\n/g,'<br>'),dropped:0};
    document.execCommand('insertHTML',false,r.html);SIG_ED.dirty=true;SIG_ED.reset=false;
    msg(r.dropped?`Beillesztve – ${r.dropped} beágyazott képet kihagytam (a levelezők nem mutatják). A képek legyenek linkként a dokumentumban.`:'Beillesztett aláírás – mentéskor ez kerül a levelekbe');});
  ed.addEventListener('input',()=>{SIG_ED.dirty=true;SIG_ED.reset=false;});
  const rb=$('m-sigReset');if(rb)rb.addEventListener('click',()=>{ed.innerHTML=sigClean(sg.base||'').html;SIG_ED.dirty=true;SIG_ED.reset=true;msg('Alap aláírás – mentéskor visszaáll');});}

/* Naptár: projektek és Google-bejegyzések áthúzása másik napra (mint a Google Naptárban) */
let CAL_DRAG=null;
/* Új projekt: Videóvágásnál nincs helyszín, érkezés/távozás – a dátum a leadási határidő */
document.addEventListener('change',e=>{const t=e.target;if(!t||t.id!=='m-eventType')return;const f=t.closest('form')||document,ed=t.value==='Videóvágás';
  f.querySelectorAll('.np-onsite').forEach(x=>{x.hidden=ed;});if(ed){const ne=f.querySelector('.np-end');if(ne)ne.hidden=true;}
  const dl=f.querySelector('label[for=m-date]');if(dl)dl.textContent=ed?'✂️ Leadási határidő':(f.querySelector('.np-end:not([hidden])')?'Első nap':'Dátum');});
/* Idővonal húzása egérrel (oldalra görgetés); a sávok áthúzása és a kattintás megmarad */
(()=>{let w=null,x0=0,s0=0,y0=0,t0=0,wy0=0,moved=false;   // oldalra és fel-le is húzható
  document.addEventListener('mousedown',e=>{if(e.button!==0)return;const ww=e.target.closest&&e.target.closest('.tl-wrap');if(!ww||e.target.closest('[draggable=true]'))return;w=ww;x0=e.clientX;s0=w.scrollLeft;y0=e.clientY;t0=w.scrollTop;wy0=scrollY;moved=false;});
  document.addEventListener('mousemove',e=>{if(!w)return;const dx=e.clientX-x0,dy=e.clientY-y0;if(!moved&&Math.abs(dx)<5&&Math.abs(dy)<5)return;if(!moved){moved=true;w.classList.add('panning');const t=$('calTip');if(t)t.remove();}w.scrollLeft=s0-dx;
    if(w.scrollHeight>w.clientHeight+2)w.scrollTop=t0-dy;else window.scrollTo(scrollX,wy0-dy);e.preventDefault();});
  document.addEventListener('mouseup',()=>{if(!w)return;w.classList.remove('panning');if(moved){const m=S.cal.month;S.cal.tlPos={m,x:w.scrollLeft,d:todayISO()};}w=null;});
  document.addEventListener('click',e=>{if(moved&&e.target.closest&&e.target.closest('.tl-wrap')){e.stopPropagation();e.preventDefault();moved=false;}},true);   // húzás után ne nyíljon meg a projekt
  document.addEventListener('scroll',e=>{const t=e.target;if(t&&t.classList&&t.classList.contains('tl-wrap')){S.cal.tlPos={m:S.cal.month,x:t.scrollLeft,y:t.scrollTop,d:todayISO()};tlCorner(t);}},true);})();
/* Idővonal: melyik napra mutat az egér (oszlop a sávon belül) */
function tlDay(e){const t=e.target.closest&&e.target.closest('.tl-track[data-first]');if(!t)return '';const r=t.getBoundingClientRect(),n=Number(t.dataset.n)||30;
  const i=Math.max(0,Math.min(n-1,Math.floor((e.clientX-r.left)/(r.width/n))));return addDays(t.dataset.first,i);}
document.addEventListener('dragstart',e=>{const c=e.target.closest&&e.target.closest('.cal-chip[draggable=true]');if(!c)return;CAL_DRAG={kind:c.dataset.kind,id:c.dataset.id,from:c.closest('.tl-track')?tlDay(e):c.dataset.dragDay};c.classList.add('dragging');const t=$('calTip');if(t)t.remove();try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',c.dataset.id);}catch(_){}});
document.addEventListener('dragend',()=>{document.querySelectorAll('.cal-chip.dragging').forEach(x=>x.classList.remove('dragging'));const z=$('tlDrop');if(z)z.remove();document.querySelectorAll('.cal-day.drop').forEach(x=>x.classList.remove('drop'));CAL_DRAG=null;});
document.addEventListener('dragover',e=>{if(!CAL_DRAG)return;const tt=e.target.closest&&e.target.closest('.tl-track[data-first]');
  if(tt){e.preventDefault();const day=tlDay(e),n=Number(tt.dataset.n),i=diffDays(tt.dataset.first,day);let z=$('tlDrop');if(!z){z=document.createElement('div');z.id='tlDrop';z.className='tl-drop';}
    if(z.parentNode!==tt)tt.appendChild(z);z.style.left=(i*100/n)+'%';z.style.width=(100/n)+'%';return;}   // az idővonalon a célnap kiemelve
  const d=e.target.closest&&e.target.closest('.cal-day[data-day]');if(!d)return;e.preventDefault();document.querySelectorAll('.cal-day.drop').forEach(x=>{if(x!==d)x.classList.remove('drop');});d.classList.add('drop');});
document.addEventListener('drop',async e=>{if(!CAL_DRAG)return;const d=e.target.closest&&e.target.closest('.cal-day[data-day]'),tday=tlDay(e);const g=CAL_DRAG;CAL_DRAG=null;document.querySelectorAll('.cal-day.drop').forEach(x=>x.classList.remove('drop'));{const z=$('tlDrop');if(z)z.remove();}if(!d&&!tday)return;e.preventDefault();
  const days=diffDays(g.from,d?d.dataset.day:tday);if(!days)return;const sh=x=>validISO(x)?addDays(x,days):x;
  if(g.kind==='cut'){const p=projById(g.id),q=pr(p),due=p&&dueDate(p);if(!p||!due)return;   // vágási sáv: a leadási határidő tolódik
    if(S.dirty&&S.draft&&S.draft.id===p.id){toast('Előbb mentődjenek el a projekt módosításai.',true);return;}
    let nd=addDays(due,days);if(q&&nd<q.start)nd=q.start;if(nd===due)return;const old=p.dueAt;p.dueAt=nd;render(true);
    try{const saved=await call('saveProject',Object.assign(clone(p),{baseUpdatedAt:p.updatedAt||'',mutationId:uuid(),deferCal:true}));const k=S.projects.findIndex(x=>x.id===p.id);if(k>=0)S.projects[k]=normProj(saved);
      if(S.draft&&S.draft.id===p.id){S.draft=prepDraft(saved);S.draftBase=clone(S.draft);}render(true);toast(`„${p.name}” leadási határideje: ${fmtDay(nd)}`);}
    catch(err){p.dueAt=old;render(true);handleErr(err);}
    return;}
  if(g.kind==='p'){const p=projById(g.id);if(!p)return;
    if(S.dirty&&S.draft&&S.draft.id===p.id){toast('Előbb mentődjenek el a projekt módosításai.',true);return;}
    const fin=p.crewFinal&&Array.isArray(p.crewFinal.ids)?p.crewFinal.ids:[],me=S.me&&S.me.crewId,rcpt=fin.map(id=>crewById(id)).filter(c=>c&&c.id!==me),withMail=rcpt.filter(c=>EMAIL_RE.test(c.email||''));
    const rng=(a,b)=>fmtDay(a)+(b&&b>a?' – '+fmtDay(b):''),oldR=rng(p.date,p.endDate),newR=rng(sh(p.date),p.endDate?sh(p.endDate):'');
    const info=!fin.length?'<p class="hint" style="margin:0">A csapat még nincs véglegesítve, ezért <b>senki nem kap értesítést</b>. Az új időpont a véglegesítéskor kerül a stáb levelébe.</p>'
      :`<p style="margin:0 0 6px">📅 A „Terepi Munkák” naptárbejegyzés az új időpontra kerül – a beosztottak naptárában is átkerül.</p>
        ${withMail.length?'<p style="margin:6px 0 4px"><b>✉️ A stáb e-mailben értesítést kap az új időpontról:</b></p>':''}
        ${withMail.length?`<ul class="cf-list" style="margin:4px 0 0">${withMail.map(c=>`<li><b>${esc(c.name)}</b> <span class="muted">· ${esc(c.email)}</span></li>`).join('')}</ul>`:'<p class="hint" style="margin:0">Nincs kinek levelet küldeni (nincs e-mail-cím).</p>'}
        ${rcpt.length>withMail.length?`<p class="hint warn-txt" style="margin:6px 0 0">Nincs e-mail-címe: ${esc(rcpt.filter(c=>!withMail.includes(c)).map(c=>c.name).join(', '))}</p>`:''}
        ${S.mailOn===false?'<p class="hint warn-txt" style="margin:6px 0 0">⏸ Az e-mail értesítések szünetelnek (Beállítások), ezért levél nem megy ki.</p>':''}
        ${me&&fin.includes(me)?'<p class="hint" style="margin:6px 0 0">Te nem kapsz levelet magadtól.</p>':''}`;
    const go=await new Promise(res=>{openModal('📅 Projekt áthelyezése',`<p style="margin:0 0 10px"><b>${esc(p.name||'')}</b><br>${esc(oldR)} → <b>${esc(newR)}</b></p>${info}`,{submitLabel:'Áthelyezés',cancelLabel:'Mégse',submit:async()=>{closeModal();res({notify:fin.length>0});},onClose:()=>res(null)});});
    if(!go)return;
    const patch={date:sh(p.date),endDate:p.endDate?sh(p.endDate):p.endDate};
    const cd=p.crewDays&&typeof p.crewDays==='object'?Object.fromEntries(Object.entries(p.crewDays).map(([k,v])=>[k,Array.isArray(v)?v.map(sh):v])):p.crewDays;   // a stáb munkanapjai is tolódnak
    const old={date:p.date,endDate:p.endDate,crewDays:p.crewDays};Object.assign(p,patch,{crewDays:cd});render(true);
    try{const saved=await call('saveProject',Object.assign(clone(p),{baseUpdatedAt:p.updatedAt||'',mutationId:uuid(),deferCal:true}));const k=S.projects.findIndex(x=>x.id===p.id);if(k>=0)S.projects[k]=normProj(saved);
      if(S.draft&&S.draft.id===p.id){S.draft=prepDraft(saved);S.draftBase=clone(S.draft);}
      render(true);
      if(go.notify){try{const r=await call('finalizeCrew',{projectId:p.id,dateMoved:true,cutTasks:cutTasksFor(projById(p.id)||p)});const sp=r.project,k2=S.projects.findIndex(x=>x.id===sp.id);if(k2>=0)S.projects[k2]=sp;if(S.draft&&S.draft.id===sp.id&&!S.dirty)S.draft=prepDraft(sp);S.cal.events={};render(true);
          toast(`„${p.name}” áthelyezve: ${fmtDay(patch.date)} – értesítést kapott: ${(r.sent||[]).join(', ')||'senki'}`);}catch(err){handleErr(err);}}
      else{syncCal(p.id);toast(`„${p.name}” áthelyezve: ${fmtDay(patch.date)}${fin.length?' – a stáb nem kapott e-mailt':''}`);}}
    catch(err){Object.assign(p,old);render(true);handleErr(err);}
    return;}
  if(g.kind==='g'){const m=S.cal.month;try{await call('moveCalEvent',{id:g.id,days});S.cal.events={};render(true);toast('Bejegyzés áthelyezve');}catch(err){handleErr(err);}}
  if(g.kind==='v'){const m=S.cal.month,L=S.cal.ev2[m]||[],ev=L.find(x=>x.id===g.id);if(!ev)return;const old={date:ev.date,endDate:ev.endDate};   // Vágói naptár: azonnal átkerül, a háttérben mentődik
    ev.date=sh(ev.date);if(ev.endDate)ev.endDate=sh(ev.endDate);render(true);
    try{await call('moveCalEvent',{id:g.id,days,cal:'vagoi'});calForceFresh();loadCalEvents(m);toast(`„${ev.title||'Bejegyzés'}” áthelyezve: ${fmtDay(ev.date)}`);}catch(err){Object.assign(ev,old);render(true);handleErr(err);}}});
