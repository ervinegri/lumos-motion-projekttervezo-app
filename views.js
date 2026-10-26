'use strict';
/* ===== Belépés (a Sales App belépőjével egyező működés) ===== */
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function loginMsg(text,info){const m=$('loginMsg');m.textContent=text||'';m.classList.toggle('info',!!info);}
function showLogin(msg){
  $('loginGate').classList.remove('hidden');
  loginMsg(msg||'',!!msg&&/Kiléptél/.test(msg));
  $('loginPin').value='';
  let last='';try{last=localStorage.getItem(TOKEN_KEY+'_email')||'';}catch(e){}
  if(last&&!$('loginEmail').value)$('loginEmail').value=last;
  setTimeout(()=>{try{($('loginEmail').value?$('loginPin'):$('loginEmail')).focus();}catch(e){}},50);
}
$('loginEmail').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('loginPin').focus();}});
$('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if($('loginBtn').disabled)return;
  const email=$('loginEmail').value.trim().toLowerCase(),pin=$('loginPin').value.trim();
  if(!EMAIL_RE.test(email)){loginMsg('Írd be az e-mail-címed.');$('loginEmail').focus();return;}
  if(!/^\d{6}$/.test(pin)){loginMsg('A PIN 6 számjegyből áll.');$('loginPin').focus();return;}
  $('loginBtn').disabled=true;loginMsg('Belépés…',true);
  try{
    const r=await gs('login',email,pin);
    TOKEN=r.token;try{localStorage.setItem(TOKEN_KEY,TOKEN);localStorage.setItem(TOKEN_KEY+'_email',email);}catch(err){}
    $('loginGate').classList.add('hidden');loginMsg('');
    await load();
  }catch(err){loginMsg(errText(err)||'A belépés sikertelen.');$('loginPin').value='';$('loginPin').focus();}
  finally{$('loginBtn').disabled=false;}
});
$('loginPin').addEventListener('input',()=>{
  const p=$('loginPin'),v=p.value.replace(/\D/g,'').slice(0,6);if(p.value!==v)p.value=v;
  if(v.length<6)return;
  if(!EMAIL_RE.test($('loginEmail').value.trim())){loginMsg('Előbb írd be az e-mail-címed.');$('loginEmail').focus();return;}
  $('loginForm').requestSubmit();   // a 6. számjegy után magától belép
});
$('forgotPin').addEventListener('click',async()=>{
  const email=$('loginEmail').value.trim().toLowerCase(),b=$('forgotPin');
  if(!EMAIL_RE.test(email)){loginMsg('Írd be az e-mail-címed, utána kérj új PIN-kódot.');$('loginEmail').focus();return;}
  b.disabled=true;loginMsg('Új PIN-kód küldése…',true);
  try{
    await gs('requestPinReset',email);
    loginMsg('Ha az e-mail-cím szerepel a rendszerben, elküldtük rá az új PIN-kódot. Nézd meg a spam mappát is.',true);
    $('loginPin').value='';$('loginPin').focus();
  }catch(err){loginMsg(errText(err)||'Nem sikerült új PIN-kódot küldeni.');}
  finally{setTimeout(()=>{b.disabled=false;},3000);}
});
$('logoutBtn').addEventListener('click',()=>guard(async()=>{
  try{await call('logout');}catch(e){}
  TOKEN='';try{localStorage.removeItem(TOKEN_KEY);}catch(e){}
  S.me=null;S.loaded=false;S.projects=[];S.crew=[];S.inventory=[];S.users=null;S.log=null;S.projectId=null;S.draft=null;
  renderChrome();VIEW.innerHTML='';showLogin('Kiléptél.');
}));
$('refreshBtn').addEventListener('click',()=>load(false,true));

/* ===== Betöltés ===== */
async function load(quiet,announce){
  if(S.loading)return;S.loading=true;
  if(!quiet&&!S.loaded)VIEW.innerHTML='<div class="loading"><span class="spin"></span>Betöltés…</div>';
  try{
    const d=await call('bootstrap');
    S.me=d.me;S.projects=d.projects||[];S.crew=d.crew||[];S.inventory=d.inventory||[];S.links=d.links||{};S.loaded=true;S.lastLoad=Date.now();
    document.body.classList.toggle('ro',ro());
    if(S.projectId){const p=projById(S.projectId);if(!p&&!S.dirty){S.projectId=null;S.draft=null;}else if(p&&!S.dirty)S.draft=clone(p);}
    if(S.tab==='beallitasok'&&!isAdmin())S.tab='attekintes';
    if(S.tab==='naptar'&&ro())S.tab='attekintes';
    const hm=/^#p=([A-Za-z0-9-]{8,64})$/.exec(location.hash||'');   // a naptáreseményből érkező link
    if(hm&&!S.dirty&&projById(hm[1])){history.replaceState(null,'',location.pathname);S.tab='projektek';S.projectId=hm[1];S.draft=clone(projById(hm[1]));}
    render(true);if(announce)toast('Adatok frissítve');
  }catch(e){if(!handleErr(e)&&!S.loaded)VIEW.innerHTML=`<div class="panel">${empty('Nem sikerült betölteni az adatokat: '+esc(errText(e)))}<div class="btns"><button class="btn primary" type="button" data-action="reload">Újrapróbálás</button></div></div>`;}
  finally{S.loading=false;}
}
setInterval(()=>{if(S.loaded&&!S.dirty&&!S.saving&&document.visibilityState==='visible'&&!$('modalRoot').innerHTML&&Date.now()-S.lastLoad>90000)load(true);},15000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&S.loaded&&!S.dirty&&Date.now()-S.lastLoad>60000)load(true);});
window.addEventListener('beforeunload',e=>{if(S.dirty){e.preventDefault();e.returnValue='';}});

/* ===== Megjelenítés ===== */
const TABS=()=>[{id:'attekintes',label:'Áttekintés'},{id:'projektek',label:ro()?'Beosztásaim':'Projektek'}].concat(ro()?[]:[{id:'naptar',label:'Naptár'}]).concat([{id:'stab',label:'Stáb'},{id:'leltar',label:'Leltár'}]).concat(isAdmin()?[{id:'beallitasok',label:'Beállítások'}]:[]);
function renderChrome(){
  const on=!!S.me;
  ['userChip','refreshBtn','logoutBtn'].forEach(id=>$(id).classList.toggle('hidden',!on));
  if(!on){$('tabs').innerHTML='';return;}
  $('userChip').textContent=S.me.name+' · '+roleLabel(S.me.role)+' ▾';
  const counts={projektek:S.projects.filter(isOpen).length,stab:S.crew.length,leltar:S.inventory.length};
  const tabsEl=$('tabs'),keepX=tabsEl.scrollLeft;
  $('tabs').innerHTML=TABS().map(t=>`<button class="tab" role="tab" type="button" aria-selected="${S.tab===t.id}" data-action="tab" data-tab="${t.id}">${t.label}${counts[t.id]!=null?`<span class="count">${counts[t.id]}</span>`:''}</button>`).join('');
  tabsEl.scrollLeft=keepX;{const act=tabsEl.querySelector('[aria-selected="true"]');if(act&&tabsEl.scrollWidth>tabsEl.clientWidth){const l=act.offsetLeft-tabsEl.offsetLeft,r=l+act.offsetWidth;if(l<tabsEl.scrollLeft)tabsEl.scrollLeft=l-16;else if(r>tabsEl.scrollLeft+tabsEl.clientWidth)tabsEl.scrollLeft=r-tabsEl.clientWidth+16;}}
  const title=S.tab==='projektek'&&S.draft?(S.draft.name||'Projekt'):(TABS().find(t=>t.id===S.tab)||{}).label||'';
  $('pageTitle').textContent=title;
  const bar=$('saveBar');
  const showBar=S.dirty&&S.draft&&S.tab==='projektek';
  bar.classList.toggle('hidden',!showBar);document.body.classList.toggle('has-savebar',!!showBar);
  if(showBar){const h=`<div class="savebar-in"><p>Nem mentett módosítások: ${esc(S.draft.name||'projekt')}</p><button class="btn outline small" type="button" data-action="discard"${S.saving?' disabled':''}>Elvetés</button><button class="btn primary" type="button" data-action="save"${S.saving?' disabled':''}>${S.saving?'Mentés…':'Mentés'}</button></div>`;if(bar._h!==h){bar.innerHTML=h;bar._h=h;}}   // ugyanazt nem rajzoljuk újra, különben a Mentés gombra kattintás elveszhet
}
function render(force){
  if(!S.me)return;
  const ae=document.activeElement;
  const keep=ae&&ae.id&&VIEW.contains(ae)?{id:ae.id,s:ae.selectionStart,e:ae.selectionEnd}:null;
  renderChrome();
  if(!S.loaded)return;
  VIEW.innerHTML=S.tab==='projektek'?viewProjects():S.tab==='naptar'?viewCalendar():S.tab==='stab'?viewCrew():S.tab==='leltar'?viewInventory():S.tab==='beallitasok'?viewSettings():viewOverview();
  if(keep){const el=$(keep.id);if(el){el.focus({preventScroll:true});try{if(keep.s!=null&&el.setSelectionRange)el.setSelectionRange(keep.s,keep.e);}catch(e){}}}
}

/* közös elemek */
function statusPill(p){const s=p.status||'egyeztetes';return `<span class="statuspill st-${esc(s)}">${esc(STATUS_LABEL[s]||s)}</span>`;}
function calBlock(iso){
  if(!validISO(iso))return `<span class="cal none" aria-hidden="true"><span class="cal-m">—</span><span class="cal-d">?</span></span>`;
  const d=toDate(iso);
  return `<span class="cal" aria-hidden="true"><span class="cal-m">${esc(F_MON.format(d).replace('.',''))}</span><span class="cal-d">${d.getUTCDate()}</span><span class="cal-w">${esc(F_WD.format(d))}</span></span>`;
}
function dueInfo(p){
  const due=dueDate(p);if(!due||!isOpen(p))return null;
  const left=diffDays(todayISO(),due);
  return {due,left,cls:left<0?'bad':left<=2?'warn':'ok',txt:left<0?`${-left} napja lejárt`:left===0?'Ma kell átadni':`${left} nap az átadásig`};
}
function myRole(p){if(!S.me||!S.me.crewId)return '';const r=[];if(p.lead===S.me.crewId)r.push('projektvezető');(p.crew||[]).forEach(a=>{if(a.crewId===S.me.crewId)r.push(a.role.toLowerCase());});return r.join(', ');}
function evRow(p,opt={}){
  const r=pr(p),T=todayISO();
  const sub=[p.client,p.venue].filter(Boolean).join(' · ')||'Nincs ügyfél megadva';
  const days=r&&r.end!==r.start?` · ${diffDays(r.start,r.end)+1} napos`:'';
  let side=statusPill(p);
  const di=dueInfo(p);
  if(di&&r&&(r.end<T||p.status==='utomunka'))side+=`<span class="statuspill p-${di.cls}">${di.txt}</span>`;
  if(ro()){const m=myRole(p);if(m)side+=`<span class="smallnum">Te: ${esc(m)}</span>`;}
  else side+=`<span class="smallnum">${crewIds(p).size} fő · ${eqCount(p)} eszköz</span>`;
  return `<button class="ev" type="button" data-action="open-project" data-id="${esc(p.id)}">${calBlock(r&&r.start)}
    <span class="ev-main"><span class="ev-title">${esc(p.name||'Névtelen projekt')}</span><span class="ev-sub">${esc(sub)}${days}</span></span>
    <span class="ev-side">${side}</span></button>`;
}
function issueRow(i,exceptId){
  const links=i.pids.filter(id=>id!==exceptId).map(id=>{const p=projById(id);return p?`<button class="linkbtn" type="button" data-action="open-project" data-id="${esc(id)}">${esc(p.name||'Névtelen projekt')} →</button>`:'';}).join('');
  return `<div class="issue ${i.level}"><span class="ic" aria-hidden="true">!</span><div class="issue-t"><div>${esc(i.text)}</div>${links?`<div class="issue-links">${links}</div>`:''}</div></div>`;
}

/* ===== Áttekintés ===== */
function viewOverview(){
  const T=todayISO(),all=S.projects;
  const open=all.filter(isOpen);
  const upcoming=all.filter(p=>isOpen(p)&&pr(p)&&pr(p).end>=T).sort(byStart);
  const next30=upcoming.filter(p=>pr(p).start<=addDays(T,30));
  const post=open.filter(p=>pr(p)&&pr(p).end<T).sort((a,b)=>dueDate(a).localeCompare(dueDate(b)));
  const overdue=post.filter(p=>diffDays(T,dueDate(p))<0).length;
  const issues=computeIssues();
  const tile=(n,l,cls,x)=>`<div class="tile ${cls||''}"><div class="tile-n">${n}</div><div class="tile-l">${l}</div>${x||''}</div>`;
  const welcome=!all.length&&!ro()?`<div class="panel welcome"><h3>Kezdjük el</h3>
    <p>Vedd fel a stábot és az eszközöket, aztán hozd létre az első projektet. A projektlapon megadod a megrendelt tartalmakat, és az app jelzi, ha valaki vagy valami két helyre van beosztva.</p>
    <div class="btns"><button class="btn primary" type="button" data-action="new-project">+ Új projekt</button><button class="btn outline" type="button" data-action="tab" data-tab="stab">Stáb felvétele</button><button class="btn outline" type="button" data-action="tab" data-tab="leltar">Leltár felvétele</button></div></div>`:'';
  return `<div class="page-head"><div class="grow"><h2>${ro()?'Szia, '+esc(S.me.name)+'!':'Áttekintés'}</h2><p class="sub">${esc(F_FULL.format(toDate(T)))}</p></div>
      <button class="btn primary w" type="button" data-action="new-project">+ Új projekt</button></div>
    ${welcome}
    ${ro()&&!S.me.crewId?`<div class="banner"><p>A felhasználód még nincs összekapcsolva a stáblistával, ezért nem látod a beosztásaidat. Szólj az ügyvezetőnek.</p></div>`:''}
    <div class="tiles">
      ${tile(open.length,ro()?'aktív beosztásod':'aktív projekt')}
      ${tile(next30.length,'rendezvény a következő 30 napban')}
      ${tile(post.length,'anyag átadásra vár',overdue?'bad':'',overdue?`<div class="tile-x bad">${overdue} lejárt határidő</div>`:'')}
      ${tile(issues.length,'figyelmeztetés',issues.length?'warn':'')}
    </div>
    <div class="grid2">
      <div class="panel"><h3>📅 Közelgő rendezvények <span class="aside">${upcoming.length} db</span></h3>
        <div class="list">${upcoming.slice(0,8).map(p=>evRow(p)).join('')||empty('Nincs közelgő rendezvény.')}</div>
        ${upcoming.length>8?`<button class="btn ghost small" type="button" data-action="tab" data-tab="projektek">Mind a ${upcoming.length} megnyitása →</button>`:''}</div>
      <div class="panel"><h3>⏱️ 7 napos átadási garancia</h3>
        <div class="list">${post.map(p=>evRow(p)).join('')||empty('Nincs átadásra váró anyag. Ide kerülnek a lezajlott, de még át nem adott projektek.')}</div></div>
    </div>
    <div class="panel"><h3>⚠️ Figyelmeztetések</h3>${issues.length?`<div class="issues">${issues.map(i=>issueRow(i)).join('')}</div>`:empty('Minden rendben: senki és semmi nincs duplán beosztva, és a stáb is teljes.')}</div>`;
}

/* ===== Projektek ===== */
function viewProjects(){
  if(S.projectId&&S.draft)return viewProject(S.draft);
  const T=todayISO(),f=S.pf,q=f.q.trim().toLowerCase();
  const filters=[['aktiv','Aktív',S.projects.filter(isOpen).length],...STAGES.map(s=>[s.id,s.label,S.projects.filter(p=>(p.status||'egyeztetes')===s.id).length]),['lemondva','Lemondva',S.projects.filter(p=>p.status==='lemondva').length],['mind','Mind',S.projects.length]];
  let list=S.projects.filter(p=>f.status==='mind'||(f.status==='aktiv'?isOpen(p):(p.status||'egyeztetes')===f.status));
  if(q)list=list.filter(p=>[p.name,p.client,p.venue,p.eventType,p.contactName].join(' ').toLowerCase().includes(q));
  const ahead=list.filter(p=>pr(p)&&pr(p).end>=T).sort(byStart);
  const past=list.filter(p=>pr(p)&&pr(p).end<T).sort((a,b)=>byStart(b,a));
  const nod=list.filter(p=>!pr(p));
  const grp=(t,arr)=>arr.length?`<div class="gh">${t}</div>${arr.map(p=>evRow(p,{value:true})).join('')}`:'';
  const body=grp('Előttünk',ahead)+grp('Lezajlott',past)+grp('Dátum nélkül',nod);
  return `<div class="page-head"><div class="grow"><h2>${ro()?'Beosztásaim':'Projektek'}</h2><p class="sub">${ro()?'Azok a projektek, amelyekre be vagy osztva':'Rendezvények az egyeztetéstől az átadásig'}</p></div>
      <button class="btn primary w" type="button" data-action="new-project">+ Új projekt</button></div>
    <div class="toolbar"><input class="inp search" id="q-projects" type="search" placeholder="Keresés név, ügyfél, helyszín szerint" value="${esc(f.q)}" aria-label="Projektek keresése">
      <div class="chips">${filters.map(([v,l,c])=>`<button class="chip" type="button" data-action="pf" data-v="${v}" aria-pressed="${f.status===v}">${l}<span class="c">${c}</span></button>`).join('')}</div></div>
    <div class="panel"><div class="list">${body||empty(S.projects.length?'Nincs a szűrésnek megfelelő projekt.':ro()?'Még nem vagy beosztva egy projektre sem.':'Még nincs projekt. Hozd létre az elsőt az „Új projekt” gombbal.')}</div></div>`;
}
function fld(p,key,label,o={}){
  const v=p[key]??'';
  return `<div class="field${o.full?' full':''}"><label for="f-${key}">${label}</label><input class="inp" id="f-${key}" data-field="${key}" type="${o.type||'text'}" value="${esc(v)}"${o.ph?` placeholder="${esc(o.ph)}"`:''}${o.min!=null?` min="${o.min}"`:''}${o.max!=null?` max="${o.max}"`:''}${o.step!=null?` step="${o.step}"`:''}${o.im?` inputmode="${o.im}"`:''}${key==='client'?' autocomplete="off"':''}${D()}></div>`;
}
function selField(p,key,label,opts,o={}){
  const v=p[key]??'';
  return `<div class="field${o.full?' full':''}"><label for="f-${key}">${label}</label><select class="inp" id="f-${key}" data-field="${key}"${D()}><option value="">${o.empty||'Válassz…'}</option>${opts.map(x=>{const [val,lab]=Array.isArray(x)?x:[x,x];return `<option value="${esc(val)}"${val===v?' selected':''}>${esc(lab)}</option>`;}).join('')}</select></div>`;
}
const FOTO_DEF=150,FOTO_STEP=10,FOTO_MAX=1000;
const fotoDb=p=>num(p.foto_db)>0?num(p.foto_db):(p.x_foto?FOTO_DEF:0);
function fotoRow(p){const n=fotoDb(p);
  return `<div class="dl${n?' on':''}"><div><div class="dl-name">Fotózás</div>${n?`<div class="dl-price">${n} db fotó</div>`:''}</div>
    <div class="stepper"><button type="button" data-action="foto-step" data-d="-1" aria-label="Fotózás: kevesebb"${n<=0||ro()?' disabled':''}>−</button><output>${n}</output><button type="button" data-action="foto-step" data-d="1" aria-label="Fotózás: több"${n>=FOTO_MAX||ro()?' disabled':''}>+</button></div></div>`;}
/* ===== Stáb és eszközök egy panelen: munkatársanként a nála lévő eszközök ===== */
function eqNote(e,it,p){
  if(!it)return '';const free=num(it.qty)-usedElsewhere(it.id,p)-(eqQty(p,it.id)-num(e.qty));
  if(num(e.qty)>free)return `<span class="bad-txt">Csak ${Math.max(0,free)} db szabad ezen a napon</span>`;
  if(it.condition&&it.condition!=='ok')return `<span class="warn-txt">${esc(CONDITIONS[it.condition])}</span>`;
  return `<small>${esc(it.category||'Egyéb')}${it.location?' · '+esc(it.location):''}</small>`;
}
function itemOptions(p){
  return INV_CATS.map(cat=>{const items=S.inventory.filter(i=>(i.category||'Egyéb')===cat&&i.condition!=='selejt').sort((a,b)=>a.name.localeCompare(b.name,'hu'));
    if(!items.length)return '';return `<optgroup label="${esc(cat)}">${items.map(i=>{const free=num(i.qty)-usedElsewhere(i.id,p)-eqQty(p,i.id);return `<option value="${esc(i.id)}"${free<=0?' disabled':''}>${esc(i.name)} — ${Math.max(0,free)}/${num(i.qty)} szabad${i.condition&&i.condition!=='ok'?' ('+CONDITIONS[i.condition].toLowerCase()+')':''}</option>`;}).join('')}</optgroup>`;}).join('');
}
function eqRowsFor(p,key){
  return (p.equipment||[]).map((e,i)=>({e,i})).filter(x=>(x.e.crewId||'')===key).map(({e,i})=>{const it=itemById(e.itemId);
    return `<div class="eqrow"><div class="who"><b>${esc(it?it.name:'Törölt eszköz')}</b>${eqNote(e,it,p)}</div>
      <input class="inp qty" type="number" min="1" inputmode="numeric" data-eq-i="${i}" value="${num(e.qty)}" aria-label="Darabszám"${D()}>
      <button class="x w" type="button" data-action="eq-remove" data-i="${i}" aria-label="Eszköz eltávolítása">×</button></div>`;}).join('');
}
function eqAddRow(p,key,opts){
  if(ro()||!S.inventory.length)return '';
  return `<div class="eqadd"><select class="inp" id="add-eq-item-${esc(key||'common')}" aria-label="Eszköz"><option value="">+ Eszköz hozzárendelése…</option>${opts}</select>
    <input class="inp qty" id="add-eq-qty-${esc(key||'common')}" type="number" min="1" inputmode="numeric" value="1" aria-label="Darabszám">
    <button class="btn outline small" type="button" data-action="eq-add" data-crew="${esc(key)}">Hozzáad</button></div>`;
}
function crewEquipPanel(p,st,c,sortedCrew,leadOpts,leadBusy,personOpts,selRole){
  const opts=itemOptions(p);
  const ids=[];if(p.lead)ids.push(p.lead);(p.crew||[]).forEach(a=>{if(!ids.includes(a.crewId))ids.push(a.crewId);});
  const cards=ids.map(cid=>{const cr=crewById(cid),busy=busyFor(cid,p);
    const roles=(p.crew||[]).map((a,i)=>({a,i})).filter(x=>x.a.crewId===cid);
    const roleHtml=(p.lead===cid?`<span class="statuspill p-ok">Projektvezető</span>`:'')+roles.map(({a,i})=>`<span class="role-sel"><select class="inp" data-crew-role="${i}" aria-label="Szerep"${D()}>${CREW_ROLES.filter(r=>r!=='Projektvezető').map(rl=>`<option${rl===a.role?' selected':''}>${esc(rl)}</option>`).join('')}</select><button class="x w" type="button" data-action="crew-remove" data-i="${i}" aria-label="Szerep eltávolítása" title="Levétel a projektről ebben a szerepben">×</button></span>`).join('');
    const rows=eqRowsFor(p,cid);
    return `<div class="pcrew"><div class="pcrew-top">${avatar(cr)}<div class="who"><b>${esc(cr?cr.name:'Törölt munkatárs')}</b>${busy.length?`<span class="bad-txt">Ütközik: ${esc(busy.map(q=>q.name).join(', '))}</span>`:cr&&cr.phone?`<small>${esc(cr.phone)}</small>`:''}</div></div>
      <div class="pcrew-roles">${roleHtml}</div>
      <div class="pcrew-eq">${rows||'<p class="hint" style="margin:2px 0 0">Még nincs nála eszköz.</p>'}${eqAddRow(p,cid,opts)}</div></div>`;}).join('');
  const commonRows=eqRowsFor(p,'')+(p.equipment||[]).map((e,i)=>({e,i})).filter(x=>x.e.crewId&&!ids.includes(x.e.crewId)).map(({e,i})=>{const it=itemById(e.itemId);
    return `<div class="eqrow"><div class="who"><b>${esc(it?it.name:'Törölt eszköz')}</b><small>${esc((crewById(e.crewId)||{}).name||'')} – már nincs a projekten</small></div><input class="inp qty" type="number" min="1" inputmode="numeric" data-eq-i="${i}" value="${num(e.qty)}" aria-label="Darabszám"${D()}><button class="x w" type="button" data-action="eq-remove" data-i="${i}" aria-label="Eszköz eltávolítása">×</button></div>`;}).join('');
  const eqN=eqCount(p),hasEq=(p.equipment||[]).length;
  return `<div class="panel"><h3>👥 Stáb és eszközök <span class="aside">${ids.length} fő · ${eqN} eszköz</span></h3>
    <div class="need">${st.map(s=>`<span class="statuspill ${s.have>=s.need?'p-ok':'p-warn'}">${esc(s.role)} ${s.have}/${s.need}</span>`).join('')}</div>
    <p class="hint">A megrendelt videók alapján ${c.ops} operatőr kell. Munkatársanként rendeld hozzá, kinél milyen eszköz lesz.</p>
    <div class="field" style="margin-top:14px"><label for="f-lead">Projektvezető</label><select class="inp" id="f-lead" data-field="lead"${D()}><option value="">Nincs kijelölve</option>${leadOpts}</select>
      ${leadBusy.length?`<span class="bad-txt">Ütközik: ${esc(leadBusy.map(q=>q.name).join(', '))}</span>`:''}</div>
    <div class="pcrew-list">${cards||empty('Még nincs beosztva senki.')}</div>
    ${ro()?'':S.crew.length?`<div class="addrow"><select class="inp" id="add-crew-person" aria-label="Munkatárs"><option value="">+ Munkatárs beosztása…</option>${personOpts}</select>
      <select class="inp" id="add-crew-role" aria-label="Szerep">${CREW_ROLES.filter(r=>r!=='Projektvezető').map(rl=>`<option${rl===selRole?' selected':''}>${esc(rl)}</option>`).join('')}</select>
      <button class="btn primary small" type="button" data-action="crew-add">Beosztás</button></div>`:`<p class="hint">Előbb vegyél fel munkatársakat a <button class="linkbtn" type="button" data-action="tab" data-tab="stab">Stáb</button> fülön.</p>`}
    ${commonRows||(!ro()&&S.inventory.length&&ids.length===0)?`<div class="pcrew pcrew-common"><div class="pcrew-top"><div class="who"><b>Közös eszközök</b><small>Még nincs felelőshöz rendelve</small></div></div><div class="pcrew-eq">${commonRows}${eqAddRow(p,'',opts)}</div></div>`:''}
    ${!S.inventory.length&&!ro()?`<p class="hint">Eszközt a <button class="linkbtn" type="button" data-action="tab" data-tab="leltar">Leltár</button> fülön tudsz felvenni.</p>`:''}
    ${hasEq||ids.length?`<div class="btns" style="margin-top:12px">${ro()?'':`<button class="btn primary small" type="button" data-action="send-list">✉️ Eszközlista küldése</button>`}${hasEq?`<button class="btn outline small" type="button" data-action="copy-pack">Pakolási lista másolása</button>`:''}</div>`:''}
    ${p.listSentAt?`<p class="hint">Eszközlista kiküldve: ${esc(p.listSentAt)} · ${esc(p.listSentTo||'')}</p>`:''}
  </div>`;
}
function viewProject(p){
  const c=calc(p),st=staffing(p),iss=computeIssues().filter(i=>i.pids.includes(p.id));
  const r=pr(p),T=todayISO(),di=dueInfo(p);
  const status=p.status||'egyeztetes',curIdx=STAGES.findIndex(s=>s.id===status);
  const stages=STAGES.map((s,i)=>`<button type="button" class="stage${status==='lemondva'?'':i<curIdx?' done':i===curIdx?' cur':''}" data-action="stage" data-v="${s.id}" aria-pressed="${i===curIdx}"${D()}><span class="n">${i+1}. lépés</span><span class="t">${s.label}</span></button>`).join('');
  const dl=DELIVERABLES.map(it=>{const n=num(p[it.k]);return `<div class="dl${n?' on':''}"><div><div class="dl-name">${it.label}</div></div>
    <div class="stepper"><button type="button" data-action="dlv" data-k="${it.k}" data-d="-1" aria-label="${it.label}: kevesebb"${n<=0||ro()?' disabled':''}>−</button><output>${n}</output><button type="button" data-action="dlv" data-k="${it.k}" data-d="1" aria-label="${it.label}: több"${n>=it.max||ro()?' disabled':''}>+</button></div></div>`+(it.k==='aftermovie'?fotoRow(p):'');}).join('');
  const ex=EXTRAS.filter(e=>e.k!=='x_foto').map(e=>{return `<label class="toggle"><input type="checkbox" data-flag="${e.k}"${p[e.k]?' checked':''}${D()}><span class="tl">${e.label}</span></label>`;}).join('');
  const tech=TECH.map(t=>`<label class="toggle"><input type="checkbox" data-flag="${t.k}"${p[t.k]?' checked':''}${D()}><span class="tl">${t.label}</span></label>`).join('');
  const sortedCrew=S.crew.slice().sort((a,b)=>a.name.localeCompare(b.name,'hu'));
  const leadOpts=sortedCrew.map(cr=>`<option value="${esc(cr.id)}"${cr.id===p.lead?' selected':''}>${esc(cr.name)}</option>`).join('');
  const leadBusy=p.lead?busyFor(p.lead,p):[];
  const assigned=(p.crew||[]).map((a,i)=>{const cr=crewById(a.crewId);const busy=busyFor(a.crewId,p);
    return `<div class="arow">${avatar(cr)}<div class="who"><b>${esc(cr?cr.name:'Törölt munkatárs')}</b>${busy.length?`<span class="bad-txt">Ütközik: ${esc(busy.map(q=>q.name).join(', '))}</span>`:cr&&cr.phone?`<small>${esc(cr.phone)}</small>`:''}</div>
      <select class="inp" data-crew-role="${i}" aria-label="Szerep"${D()}>${CREW_ROLES.map(rl=>`<option${rl===a.role?' selected':''}>${esc(rl)}</option>`).join('')}</select>
      <button class="x w" type="button" data-action="crew-remove" data-i="${i}" aria-label="Eltávolítás a projektből">×</button></div>`;}).join('');
  const sel=S.addCrew.person&&crewById(S.addCrew.person)?S.addCrew.person:'';
  const selRole=S.addCrew.role||(sel&&(crewById(sel).roles||[])[0])||'Operatőr';
  const personOpts=sortedCrew.slice().sort((a,b)=>prioNum(a)-prioNum(b)||a.name.localeCompare(b.name,'hu')).map(cr=>{const busy=busyFor(cr.id,p);return `<option value="${esc(cr.id)}"${cr.id===sel?' selected':''}>${prioNum(cr)<9?'P'+prioNum(cr)+' · ':''}${esc(cr.name)}${(cr.roles||[]).length?' ('+esc(cr.roles.slice(0,2).join(', '))+')':''}${busy.length?' — foglalt: '+esc(busy.map(q=>q.name).join(', ')):''}</option>`;}).join('');
  const eqList=(p.equipment||[]).map(e=>({e,it:itemById(e.itemId)}));
  const catOf=x=>x.it?x.it.category||'Egyéb':'Törölt eszköz';
  const cats=[...new Set(eqList.map(catOf))].sort((a,b)=>INV_CATS.indexOf(a)-INV_CATS.indexOf(b));
  const eqHtml=cats.map(cat=>`<div class="eq-cat">${esc(cat)}</div>`+eqList.filter(x=>catOf(x)===cat).map(({e,it})=>{
    let note='';
    if(it){const free=num(it.qty)-usedElsewhere(it.id,p);
      if(num(e.qty)>free)note=`<span class="bad-txt">Csak ${Math.max(0,free)} db szabad ezen a napon</span>`;
      else if(it.condition&&it.condition!=='ok')note=`<span class="warn-txt">${esc(CONDITIONS[it.condition])}</span>`;
      else note=`<small>${free} / ${num(it.qty)} db szabad</small>`;}
    return `<div class="arow"><div class="who"><b>${esc(it?it.name:'Törölt eszköz')}</b>${note}</div>
      <input class="inp qty" type="number" min="1" inputmode="numeric" data-eq-qty="${esc(e.itemId)}" value="${num(e.qty)}" aria-label="Darabszám"${D()}>
      <button class="x w" type="button" data-action="eq-remove" data-id="${esc(e.itemId)}" aria-label="Eltávolítás">×</button></div>`;}).join('')).join('');
  const eqSel=S.addEq.item&&itemById(S.addEq.item)?S.addEq.item:'';
  const itemOpts=INV_CATS.map(cat=>{const items=S.inventory.filter(i=>(i.category||'Egyéb')===cat&&i.condition!=='selejt').sort((a,b)=>a.name.localeCompare(b.name,'hu'));
    if(!items.length)return '';return `<optgroup label="${esc(cat)}">${items.map(i=>{const free=num(i.qty)-usedElsewhere(i.id,p);return `<option value="${esc(i.id)}"${i.id===eqSel?' selected':''}>${esc(i.name)} — ${free}/${num(i.qty)} szabad${i.condition&&i.condition!=='ok'?' ('+CONDITIONS[i.condition].toLowerCase()+')':''}</option>`;}).join('')}</optgroup>`;}).join('');
  const folder=p.folderId?`<a class="mini" href="${esc(driveUrl(p.folderId))}" target="_blank" rel="noopener">📁 Projektmappa megnyitása ↗</a>`:(ro()?'':`<button class="mini" type="button" data-action="make-folder">📁 Projektmappa létrehozása</button>`);
  const delivery=p.deliveryLink&&/^https:\/\//i.test(p.deliveryLink)?`<a class="mini" href="${esc(p.deliveryLink)}" target="_blank" rel="noopener">Átadási link megnyitása ↗</a>`:'';
  return `<div class="dhead">
    <button class="back" type="button" data-action="back">← ${ro()?'Beosztásaim':'Összes projekt'}</button>
    <div class="dtitle"><div class="grow"><h2>${esc(p.name||'Névtelen projekt')}</h2>
      <p class="sub">${esc([p.client,p.eventType,fmtRange(p),p.venue].filter(Boolean).join(' · '))}</p></div></div>
    <div class="btns">${folder}${delivery}${p.calEventId?`<button class="mini" type="button" data-action="tab" data-tab="naptar" title="A „Terepi Munkák” Google Naptárban">📅 Naptárban</button>`:(validISO(p.date)&&!ro()?'<span class="hint" style="margin:0;align-self:center">📅 Mentéskor bekerül a Google Naptárba</span>':'')}</div>
    ${status==='lemondva'?`<div class="banner"><p><b>Ez a projekt le van mondva.</b> Nem számít bele az ütközésekbe és a határidőkbe.</p><button class="btn outline small w" type="button" data-action="cancel-toggle">Visszaállítás</button></div>`:`<div class="stages" role="group" aria-label="Projekt állapota">${stages}</div>`}
    ${iss.length?`<div class="issues">${iss.map(i=>issueRow(i,p.id)).join('')}</div>`:''}
  </div>
  <div class="dgrid">
    <div class="col">
      <div class="panel"><h3>📋 Alapadatok</h3><div class="fields">
        ${fld(p,'name','Projekt neve',{full:true})}
        ${fld(p,'client','Ügyfél (cég)',{ph:ro()?'':'Válassz a korábbi megrendelők közül, vagy írj be újat'})}
        ${selField(p,'eventType','Rendezvény típusa',EVENT_TYPES)}
        ${fld(p,'venue','Helyszín',{full:true,ph:'pl. MVM Dome, Budapest'})}
        ${fld(p,'date','Első nap',{type:'date'})}
        ${(()=>{const on=!!p.endDate||!!p._multi;return `<div class="field"><label class="multi-lbl" for="f-multi"><input type="checkbox" id="f-multi" data-multi="1"${on?' checked':''}${D()}> Több napos – utolsó nap</label><input class="inp" id="f-endDate" data-field="endDate" type="date" value="${esc(p.endDate||'')}"${p.date?` min="${esc(p.date)}"`:''}${on&&!ro()?'':' disabled'}></div>`;})()}
        ${fld(p,'startTime','Érkezés a helyszínre',{type:'time'})}
        ${fld(p,'hours','Helyszíni munkaidő (óra)',{type:'number',min:1,max:16,im:'numeric'})}
        ${fld(p,'contactName','Kapcsolattartó')}
        ${fld(p,'contactPhone','Telefon',{type:'tel',ph:'+36 …'})}
        ${fld(p,'contactEmail','E-mail',{type:'email',full:true})}
      </div></div>
      <div class="panel"><h3>🎬 Kreatív tartalmak</h3>
        ${dl}
        <div class="sec-lbl">Helyszíni extrák és kiegészítők</div>
        <div class="toggles">${ex}</div></div>
      <div class="panel"><h3>🎤 Előadásrögzítés ${hasRec(p)?'<span class="aside">aktív</span>':''}</h3>
        ${(()=>{const n=Math.max(1,num(p.er_rooms)||1);return `<div class="dl on rooms-row"><div><div class="dl-name">Rögzített termek száma</div><div class="dl-price">${n>1?`Minden kiválasztott kamera és eszköz ${n} teremre értendő`:'A kiválasztott kamerák és eszközök termenként értendők'}</div></div>
          <div class="stepper"><button type="button" data-action="rec-step" data-k="er_rooms" data-d="-1" aria-label="Termek: kevesebb"${n<=1||ro()?' disabled':''}>−</button><output>${n}</output><button type="button" data-action="rec-step" data-k="er_rooms" data-d="1" aria-label="Termek: több"${n>=10||ro()?' disabled':''}>+</button></div></div>`;})()}
        <div class="sec-lbl">Rögzítés eszközei${Math.max(1,num(p.er_rooms)||1)>1?` <span class="muted" style="font-weight:600">· termenként, × ${Math.max(1,num(p.er_rooms)||1)}</span>`:''}</div>
        <div class="toggles one">${REC_CAMS.map(c=>`<label class="toggle"><input type="checkbox" data-flag="${c.k}"${p[c.k]?' checked':''}${D()}><span class="tl">${c.label}</span></label>`).join('')}</div>
        <div class="toggles one" style="margin-top:8px"><label class="toggle"><input type="checkbox" data-flag="${REC_LIVE.k}"${p[REC_LIVE.k]?' checked':''}${D()}><span class="tl">📡 ${REC_LIVE.label}</span></label></div>
        <div class="sec-lbl">Vágás és utómunka</div>
        <div class="toggles"><label class="toggle"><input type="checkbox" data-flag="er_post"${p.er_post?' checked':''}${D()}><span class="tl">Előadások utómunkája</span></label>
          <div class="field" style="align-self:center"><select class="inp" id="f-er_res" data-field="er_res" aria-label="Felbontás"${D()}><option value="hd"${p.er_res!=='4k'?' selected':''}>Full HD</option><option value="4k"${p.er_res==='4k'?' selected':''}>4K</option></select></div></div>
        ${REC_COUNTS.filter(it=>it.k!=='er_rooms').map(it=>{const n=it.k==='er_rooms'?Math.max(1,num(p[it.k])||1):num(p[it.k]);return `<div class="dl${n>it.min?' on':''}"><div><div class="dl-name">${it.label}</div></div>
          <div class="stepper"><button type="button" data-action="rec-step" data-k="${it.k}" data-d="-1" aria-label="${it.label}: kevesebb"${n<=it.min||ro()?' disabled':''}>−</button><output>${n}</output><button type="button" data-action="rec-step" data-k="${it.k}" data-d="1" aria-label="${it.label}: több"${n>=it.max||ro()?' disabled':''}>+</button></div></div>`;}).join('')}
        <p class="hint">A nyersanyag megvásárlását, tárolását és a villámgyors kézbesítést a Kreatív tartalmaknál jelölheted.</p>
      </div>
      <div class="panel"><h3>🎛️ Vizuál-, hang- és fénytechnika</h3>
        <div class="toggles">${tech}</div>
        <div class="field full" style="margin-top:16px"><label for="f-techPlan">Forgatási és technikai terv</label><textarea class="inp" id="f-techPlan" data-field="techPlan" placeholder="Kameraállások, hangforrások, prezentációs gép, stream platform, menetrend…"${D()}>${esc(p.techPlan||'')}</textarea></div>
        <div class="field full" style="margin-top:14px"><label for="f-notes">Jegyzetek</label><textarea class="inp" id="f-notes" data-field="notes" placeholder="Parkolás, beléptetés, öltözet, helyszíni kapcsolattartó…"${D()}>${esc(p.notes||'')}</textarea></div>
      </div>
    </div>
    <div class="col">
      ${crewEquipPanel(p,st,c,sortedCrew,leadOpts,leadBusy,personOpts,selRole)}
      <div class="panel"><h3>📦 Átadás</h3>
        <div class="kv"><span>Rendezvény utolsó napja</span><b>${r?fmtDay(r.end):'Nincs dátum'}</b></div>
        <div class="kv"><span>Átadási határidő</span><b>${r?fmtDay(dueDate(p)):'—'} <span class="muted" style="font-weight:500">· ${p.x_rush?'villámgyors, 72 óra':'7 napos garancia'}</span></b></div>
        ${di&&r&&r.end<T?`<div class="countdown ${di.cls}"><span class="big">${Math.abs(di.left)}</span><span>${di.left<0?'napja lejárt a határidő':di.left===0?'ma kell átadni':'nap van hátra az átadásig'}</span></div>`:''}
        ${p.status==='atadva'&&p.deliveredAt?`<div class="kv"><span>Átadva</span><b class="ok-txt">${fmtDay(p.deliveredAt)}</b></div>`:''}
        <div class="field full" style="margin-top:10px"><label for="f-deliveryLink">Átadási link (mappa vagy videók)</label><input class="inp" id="f-deliveryLink" data-field="deliveryLink" type="url" placeholder="https://drive.google.com/…" value="${esc(p.deliveryLink||'')}"${D()}></div>
      </div>
      ${ro()?'':`<div class="panel"><h3>Projekt kezelése</h3>
        <div class="btns"><button class="btn outline small" type="button" data-action="cancel-toggle">${status==='lemondva'?'Visszaállítás':'Projekt lemondása'}</button><button class="btn danger small" type="button" data-action="del-project">Projekt törlése</button></div>
        ${p.updatedAt?`<p class="hint">Utoljára mentve: ${esc(p.updatedAt)}${p.updatedBy?' · '+esc(p.updatedBy):''}</p>`:''}
      </div>`}
    </div>
  </div>`;
}

/* ===== Stáb ===== */
const prioNum=c=>[1,2,3].includes(Number(c.priority))?Number(c.priority):9;
function prioBadge(c){const p=prioNum(c);return p<9?`<span class="prio prio-${p}" title="Prioritás: ${p} – ${esc(PRIO_LABEL[p])}">P${p}</span>`:'';}
function viewCrew(){
  const T=todayISO(),f=S.cf,q=f.q.trim().toLowerCase();
  let list=S.crew.slice().sort((a,b)=>prioNum(a)-prioNum(b)||a.name.localeCompare(b.name,'hu'));
  if(f.role)list=list.filter(c=>(c.roles||[]).includes(f.role)||(c.skills||[]).includes(f.role));
  if(f.prio)list=list.filter(c=>String(prioNum(c))===f.prio);
  if(q)list=list.filter(c=>[c.name,c.phone,c.email,c.company,(c.roles||[]).join(' '),(c.skills||[]).join(' '),c.note].join(' ').toLowerCase().includes(q));
  const internal=S.crew.filter(c=>c.type==='Belsős').length;
  const nextOf=c=>S.projects.filter(p=>p.status!=='lemondva'&&pr(p)&&pr(p).end>=T&&crewIds(p).has(c.id)).sort(byStart);
  const cards=f.view==='list'?'':list.map(c=>{
    const next=S.projects.filter(p=>p.status!=='lemondva'&&pr(p)&&pr(p).end>=T&&crewIds(p).has(c.id)).sort(byStart);
    const role=p=>p.lead===c.id?'projektvezető':((p.crew||[]).filter(a=>a.crewId===c.id).map(a=>a.role.toLowerCase()).join(', '));
    const sub=[c.type,c.company].filter(Boolean).join(' · ');
    return `<article class="pcard">
      <div class="pc-top">${avatar(c)}<div class="pc-id"><div class="pc-name">${esc(c.name)} ${prioBadge(c)}</div>${sub?`<div class="pc-sub">${esc(sub)}</div>`:''}</div>
        <button class="pc-edit w" type="button" data-action="edit-crew" data-id="${esc(c.id)}" aria-label="${esc(c.name)} szerkesztése" title="Szerkesztés">✎</button></div>
      <div class="roles">${(c.roles||[]).map(r=>`<span class="statuspill">${esc(r)}</span>`).join('')||'<span class="muted" style="font-size:13px">Nincs szerep megadva</span>'}</div>
      ${(c.skills||[]).length?`<div class="skills">${c.skills.map(s=>`<span class="skill">${esc(s)}</span>`).join('')}</div>`:''}
      <div>${c.phone?`<div class="kv"><span>Telefon</span><button class="copy" type="button" data-action="copy" data-text="${esc(c.phone)}" title="Másolás">${esc(c.phone)}</button></div>`:''}
        ${c.email?`<div class="kv"><span>E-mail</span><button class="copy mail" type="button" data-action="copy" data-text="${esc(c.email)}" title="Másolás">${esc(c.email).replace('@','<wbr>@')}</button></div>`:'<div class="kv"><span>E-mail</span><span class="warn-txt">nincs megadva</span></div>'}
        ${c.dayRate!=null&&num(c.dayRate)?`<div class="kv"><span>Napidíj</span><b class="tnum">${huf(c.dayRate)}</b></div>`:''}</div>
      ${c.note?`<p class="pc-note">${esc(c.note)}</p>`:''}
      <div class="next"><span class="lbl">${next.length?`Következő beosztás (${next.length})`:'Nincs közelgő beosztás'}</span>
        ${next.slice(0,3).map(p=>`<button class="linkbtn" type="button" data-action="open-project" data-id="${esc(p.id)}">${esc(fmtShort(pr(p).start))} · ${esc(p.name||'Névtelen projekt')} <span class="muted">(${esc(role(p))})</span></button>`).join('')}</div>
    </article>`;}).join('');
  const rows=f.view!=='list'?'':list.map(c=>{const n=nextOf(c)[0];
    return `<tr><td><div class="nm" style="display:flex;gap:6px;align-items:center">${esc(c.name)} ${prioBadge(c)}</div>${c.company?`<div class="ser">${esc(c.company)}</div>`:''}</td>
      <td>${esc((c.roles||[]).join(', '))||'<span class="muted">—</span>'}${(c.skills||[]).length?`<div class="ser">${esc(c.skills.join(', '))}</div>`:''}</td>
      <td>${esc(c.type||'')}</td>
      <td>${c.phone?`<button class="copy" style="text-align:left;white-space:nowrap" type="button" data-action="copy" data-text="${esc(c.phone)}" title="Másolás">${esc(c.phone)}</button>`:''}</td>
      <td>${c.email?`<button class="copy mail" style="text-align:left" type="button" data-action="copy" data-text="${esc(c.email)}" title="Másolás">${esc(c.email).replace('@','<wbr>@')}</button>`:'<span class="warn-txt">nincs</span>'}</td>
      <td>${n?`<button class="linkbtn" style="font-size:13px" type="button" data-action="open-project" data-id="${esc(n.id)}">${esc(fmtShort(pr(n).start))} · ${esc(n.name||'Névtelen projekt')}</button>`:'<span class="muted">—</span>'}</td>
      <td class="num"><button class="pc-edit w" type="button" data-action="edit-crew" data-id="${esc(c.id)}" aria-label="${esc(c.name)} szerkesztése" title="Szerkesztés">✎</button></td></tr>`;}).join('');
  const pc=n=>S.crew.filter(c=>prioNum(c)===n).length;
  return `<div class="page-head"><div class="grow"><h2>Stáb</h2><p class="sub">${S.crew.length} munkatárs${S.crew.length?` · ${internal} belsős`:''}</p></div>
      <button class="btn primary w" type="button" data-action="new-crew">+ Új munkatárs</button></div>
    <div class="toolbar"><input class="inp search" id="q-crew" type="search" placeholder="Keresés név, szerep, vállalkozás szerint" value="${esc(f.q)}" aria-label="Stáb keresése">
      <select class="inp" id="crew-role-filter" style="width:auto" aria-label="Szűrés szerep szerint"><option value="">Minden szerep</option><optgroup label="Szerep">${CREW_ROLES.map(r=>`<option${r===f.role?' selected':''}>${esc(r)}</option>`).join('')}</optgroup><optgroup label="Részletek">${CREW_SKILLS.map(r=>`<option${r===f.role?' selected':''}>${esc(r)}</option>`).join('')}</optgroup></select>
      <div class="seg" role="group" aria-label="Nézet"><button type="button" data-action="crew-view" data-v="cards" aria-pressed="${f.view!=='list'}" title="Kártyák">▦ Kártyák</button><button type="button" data-action="crew-view" data-v="list" aria-pressed="${f.view==='list'}" title="Lista">☰ Lista</button></div>
      <div class="chips">${[['','Mind',S.crew.length],['1','P1',pc(1)],['2','P2',pc(2)],['3','P3',pc(3)]].map(([v,l,n])=>`<button class="chip" type="button" data-action="crew-prio" data-v="${v}" aria-pressed="${(f.prio||'')===v}">${l}<span class="c">${n}</span></button>`).join('')}</div></div>
    ${rows?`<div class="tbl-wrap"><table class="crew-tbl"><thead><tr><th>Név</th><th>Szerepek</th><th>Jogviszony</th><th>Telefon</th><th>E-mail</th><th>Következő beosztás</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:cards?`<div class="cards">${cards}</div>`:`<div class="panel">${empty(S.crew.length?'Nincs a szűrésnek megfelelő munkatárs.':'Még nincs munkatárs. Vedd fel a stábot az „Új munkatárs” gombbal.')}</div>`}`;
}

/* ===== Naptár ===== */
const F_MONTH=new Intl.DateTimeFormat('hu-HU',{year:'numeric',month:'long',timeZone:'UTC'});
const WD_SHORT=['H','K','Sze','Cs','P','Szo','V'];
function calRange(month){const first=month+'-01';const wd=(toDate(first).getUTCDay()+6)%7;const start=addDays(first,-wd);return {first,start,end:addDays(start,41)};}
function loadCalEvents(month){
  const r=calRange(month),key=month;
  if(S.cal.events[key]||S.cal.loading[key])return;
  S.cal.loading[key]=true;
  call('calendarEvents',{from:r.start,to:r.end}).then(ev=>{S.cal.events[key]=ev||[];delete S.cal.err[key];})
    .catch(e=>{S.cal.err[key]=errText(e);if(errText(e).indexOf('AUTH_REQUIRED')>=0)handleErr(e);})
    .finally(()=>{delete S.cal.loading[key];if(S.tab==='naptar'&&S.cal.month===month)render(true);});
}
function calItems(month){
  const r=calRange(month),items=[];
  const linked=new Set(S.projects.map(p=>p.calEventId).filter(Boolean));
  S.projects.forEach(p=>{const q=pr(p);if(!q||q.end<r.start||q.start>r.end)return;
    items.push({kind:'p',id:p.id,title:p.name||'Névtelen projekt',date:q.start,endDate:q.end,time:p.startTime||'',status:p.status||'egyeztetes',venue:p.venue||''});});
  (S.cal.events[month]||[]).forEach(e=>{if(linked.has(e.id)||(e.projectId&&projById(e.projectId)))return;
    items.push({kind:'g',id:e.id,title:e.title||'(nincs cím)',date:e.date,endDate:e.endDate||e.date,time:e.start||'',venue:e.location||''});});
  return items.sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'99').localeCompare(b.time||'99')||a.title.localeCompare(b.title,'hu'));
}
function calChip(it,day){
  const cont=it.date<day;
  const cls=it.kind==='p'?`cal-chip p st-${esc(it.status)}`:'cal-chip g';
  return `<button type="button" class="${cls}" data-action="${it.kind==='p'?'open-project':'cal-event'}" data-id="${esc(it.id)}" title="${esc(it.title+(it.venue?' · '+it.venue:''))}">${cont?'↳ ':it.time?`<b>${esc(it.time)}</b> `:''}${esc(it.title)}</button>`;
}
function viewCalendar(){
  const m=S.cal.month,r=calRange(m),T=todayISO();
  loadCalEvents(m);
  const items=calItems(m),loading=!!S.cal.loading[m]&&!S.cal.events[m],err=S.cal.err[m];
  const days=[];for(let i=0;i<42;i++)days.push(addDays(r.start,i));
  const onDay=d=>items.filter(it=>it.date<=d&&it.endDate>=d);
  const grid=days.map(d=>{const its=onDay(d),out=d.slice(0,7)!==m;
    return `<div class="cal-day${out?' out':''}${d===T?' today':''}"><div class="cal-dh"><span class="cal-dn">${Number(d.slice(8))}</span><button type="button" class="cal-add" data-action="cal-new" data-d="${d}" aria-label="Új bejegyzés: ${esc(d)}" title="Új bejegyzés erre a napra">+</button></div>${its.slice(0,4).map(it=>calChip(it,d)).join('')}${its.length>4?`<button type="button" class="cal-more" data-action="cal-day" data-d="${d}">+${its.length-4} további</button>`:''}</div>`;}).join('');
  const agenda=days.filter(d=>d.slice(0,7)===m).map(d=>{const its=onDay(d);if(!its.length)return '';
    return `<div class="ag-day${d===T?' today':''}"><div class="ag-date">${esc(F_FULL.format(toDate(d)).replace(/^\d{4}\. /,''))}</div>${its.map(it=>calChip(it,d)).join('')}</div>`;}).join('');
  const nP=items.filter(i=>i.kind==='p'&&i.date.slice(0,7)<=m&&i.endDate.slice(0,7)>=m).length,nG=items.filter(i=>i.kind==='g'&&i.date.slice(0,7)<=m&&i.endDate.slice(0,7)>=m).length;
  return `<div class="page-head"><div class="grow"><h2 style="text-transform:capitalize">${esc(F_MONTH.format(toDate(r.first)))}</h2><p class="sub">${nP} projekt · ${nG} további esemény a „Terepi Munkák” naptárból${loading?' · betöltés…':''}</p></div>
      <div class="btns"><button class="btn primary small" type="button" data-action="cal-new">+ Új bejegyzés</button><button class="btn outline small" type="button" data-action="cal-nav" data-d="-1" aria-label="Előző hónap">‹</button><button class="btn outline small" type="button" data-action="cal-nav" data-d="0">Ma</button><button class="btn outline small" type="button" data-action="cal-nav" data-d="1" aria-label="Következő hónap">›</button>
      <a class="btn ghost small" href="https://calendar.google.com/calendar/u/0/r/month/${r.first.replace(/-/g,'/')}" target="_blank" rel="noopener">Google Naptár ↗</a></div></div>
    ${err?`<div class="banner"><p>A Google Naptár most nem érhető el: ${esc(err)}</p><button class="btn outline small" type="button" data-action="cal-retry">Újra</button></div>`:''}
    <div class="cal-legend"><span><i class="lg p"></i>Projekt az appban</span><span><i class="lg g"></i>Csak a Google Naptárban – kattints rá, és projektet csinálhatsz belőle</span></div>
    <div class="cal-wrap"><div class="cal-grid">${WD_SHORT.map(w=>`<div class="cal-wd">${w}</div>`).join('')}${grid}</div></div>
    <div class="cal-agenda">${agenda||empty('Ebben a hónapban nincs esemény.')}</div>`;
}

/* ===== Leltár ===== */
function viewInventory(){
  const T=todayISO(),f=S.inf,q=f.q.trim().toLowerCase();
  let list=S.inventory.slice();
  if(f.cat)list=list.filter(i=>(i.category||'Egyéb')===f.cat);
  if(f.cond)list=list.filter(i=>(i.condition||'ok')===f.cond);
  if(q)list=list.filter(i=>[i.name,i.serial,i.category,i.note,i.location].join(' ').toLowerCase().includes(q));
  const totalQty=S.inventory.reduce((s,i)=>s+num(i.qty),0);
  const value=S.inventory.reduce((s,i)=>s+num(i.value)*num(i.qty),0);
  const broken=S.inventory.filter(i=>i.condition==='javitas'||i.condition==='szerviz').length;
  const rows=INV_CATS.map(cat=>{const items=list.filter(i=>(i.category||'Egyéb')===cat).sort((a,b)=>a.name.localeCompare(b.name,'hu'));if(!items.length)return '';
    return `<tr class="grp"><td colspan="7">${esc(cat)} · ${items.reduce((s,i)=>s+num(i.qty),0)} db</td></tr>`+items.map(i=>{
      const uses=S.projects.filter(p=>p.status!=='lemondva'&&pr(p)&&pr(p).end>=T&&eqQty(p,i.id)>0).sort(byStart);
      const now=uses.find(p=>pr(p).start<=T),u=now||uses[0],cond=i.condition||'ok';
      const condCls=cond==='ok'?'p-ok':cond==='selejt'?'':cond==='szerviz'?'p-bad':'p-warn';
      return `<tr><td><div class="nm">${esc(i.name)}</div>${i.note?`<div class="ser">${esc(i.note)}</div>`:''}</td>
        <td class="num">${num(i.qty)}</td>
        <td><span class="statuspill ${condCls}">${esc(CONDITIONS[cond]||cond)}</span></td>
        <td>${u?`<button class="linkbtn" type="button" data-action="open-project" data-id="${esc(u.id)}">${now?'Most kint: ':esc(fmtShort(pr(u).start))+' · '}${esc(u.name||'Névtelen projekt')} (${eqQty(u,i.id)} db)</button>${uses.length>1?`<div class="ser">+${uses.length-1} további beosztás</div>`:''}`:'<span class="muted">Nincs beosztva</span>'}</td>
        <td>${i.location?esc(i.location):'<span class="muted">—</span>'}</td>
        <td><span class="ser">${esc(i.serial||'')}</span></td>
        <td class="num"><button class="btn ghost small w" type="button" data-action="edit-item" data-id="${esc(i.id)}">Szerkesztés</button></td></tr>`;}).join('');}).join('');
  return `<div class="page-head"><div class="grow"><h2>Leltár</h2><p class="sub">${S.inventory.length} tétel · ${totalQty} db${value&&isAdmin()?` · bruttó nyilvántartási érték ${huf(value)}`:''}${broken?` · <span class="warn-txt">${broken} javításra vár / szervizben</span>`:''}</p></div>
      <button class="btn primary w" type="button" data-action="new-item">+ Új eszköz</button></div>
    <div class="toolbar"><input class="inp search" id="q-inv" type="search" placeholder="Keresés név, hely vagy sorozatszám szerint" value="${esc(f.q)}" aria-label="Leltár keresése">
      <select class="inp" id="inv-cat" style="width:auto" aria-label="Kategória"><option value="">Minden kategória</option>${INV_CATS.map(c=>`<option${c===f.cat?' selected':''}>${esc(c)}</option>`).join('')}</select>
      <select class="inp" id="inv-cond" style="width:auto" aria-label="Állapot"><option value="">Minden állapot</option>${Object.entries(CONDITIONS).map(([k,v])=>`<option value="${k}"${k===f.cond?' selected':''}>${v}</option>`).join('')}</select></div>
    ${rows?`<div class="tbl-wrap"><table><thead><tr><th>Eszköz</th><th class="num">Db</th><th>Állapot</th><th>Következő használat</th><th>Tárolási hely</th><th>Azonosító</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:`<div class="panel">${empty(S.inventory.length?'Nincs a szűrésnek megfelelő eszköz.':'Még üres a leltár. Vedd fel az eszközöket az „Új eszköz” gombbal.')}</div>`}`;
}

/* ===== Beállítások (admin) ===== */
function viewSettings(){
  if(S.users===null||S.log===null){loadSettings();return '<div class="loading"><span class="spin"></span>Betöltés…</div>';}
  const crewName=id=>{const c=crewById(id);return c?c.name:'';};
  const users=S.users.slice().sort((a,b)=>a.name.localeCompare(b.name,'hu')).map(u=>`<div class="arow"><div class="who"><b>${esc(u.name)}${u.disabled?' <span class="statuspill p-bad">letiltva</span>':''}</b><small>${esc(roleLabel(u.role))}${u.crewId?' · stáb: '+esc(crewName(u.crewId)||'törölt munkatárs'):''}${u.email?' · '+esc(u.email):''}</small></div>
    <button class="mini" type="button" data-action="edit-user" data-id="${esc(u.id)}">Szerkesztés</button></div>`).join('');
  const log=S.log.slice(0,150).map(l=>`<div class="logrow"><span class="when">${esc(l.at)}</span><span><b>${esc(l.who)}</b> · ${esc(l.action)}${l.subject?': '+esc(l.subject):''}${l.details?`<br><span class="muted">${esc(l.details)}</span>`:''}</span></div>`).join('');
  return `<div class="page-head"><div class="grow"><h2>Beállítások</h2><p class="sub">Felhasználók, napló és a háttérben futó táblázat</p></div></div>
    <div class="btns">${S.links.sheet?`<a class="mini" href="${esc(S.links.sheet)}" target="_blank" rel="noopener">📊 Adatbázis megnyitása (Google Sheet) ↗</a>`:''}${S.links.folder?`<a class="mini" href="${esc(S.links.folder)}" target="_blank" rel="noopener">📁 Projektek mappa ↗</a>`:''}</div>
    <div class="grid2">
      <div class="panel"><h3>👤 Felhasználók és PIN-kódok <span class="aside"><button class="btn primary small" type="button" data-action="new-user">+ Új felhasználó</button></span></h3>
        <p class="hint" style="margin:0 0 10px">Ügyvezető: mindent lát és kezel, a Beállításokat is. Termelési vezető: projekteket, stábot és leltárt szerkeszt, eszközlistát küld.</p>
        <div class="alist">${users||empty('Nincs felhasználó.')}</div></div>
      <div class="panel"><h3>🧾 Napló <span class="aside"><button class="btn ghost small" type="button" data-action="reload-log">↻</button></span></h3>
        <div>${log||empty('Még nincs bejegyzés.')}</div></div>
    </div>`;
}
async function loadSettings(){
  if(S._settingsLoading)return;S._settingsLoading=true;
  try{const [u,l]=await Promise.all([call('listUsers'),call('getLog')]);S.users=u;S.log=l;}
  catch(e){handleErr(e);S.users=S.users||[];S.log=S.log||[];}
  finally{S._settingsLoading=false;if(S.tab==='beallitasok')render(true);}
}

