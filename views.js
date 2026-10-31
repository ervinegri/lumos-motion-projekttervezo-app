'use strict';
/* ===== Belépés (a Sales App belépőjével egyező működés) ===== */
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function loginMsg(text,info){const m=$('loginMsg');m.textContent=text||'';m.classList.toggle('info',!!info);}
/* Belépés csak Google-fiókkal (Google Identity Services). */
const G_CLIENT=String(window.LUMOS_GOOGLE_CLIENT_ID||'').trim();
let gReady=false;
function initGoogle(tries){
  if(!G_CLIENT){loginMsg('A Google-belépés nincs beállítva.');return;}
  if(gReady)return;
  if(!(window.google&&google.accounts&&google.accounts.id)){if((tries||0)<60)setTimeout(()=>initGoogle((tries||0)+1),150);else loginMsg('A Google-belépés nem töltődött be. Frissítsd az oldalt, vagy próbáld másik böngészőből.');return;}
  gReady=true;
  google.accounts.id.initialize({client_id:G_CLIENT,callback:onGoogleCredential,auto_select:false,cancel_on_tap_outside:true,ux_mode:'popup',itp_support:true});
  google.accounts.id.renderButton($('gBtn'),{theme:'outline',size:'large',shape:'pill',text:'signin_with',logo_alignment:'center',locale:'hu',width:280});
}
async function onGoogleCredential(resp){
  if(!resp||!resp.credential){loginMsg('A Google-belépés megszakadt.');return;}
  loginMsg('Belépés…',true);
  try{
    const r=await gs('googleLogin',resp.credential);
    TOKEN=r.token;try{localStorage.setItem(TOKEN_KEY,TOKEN);}catch(err){}
    $('loginGate').classList.add('hidden');loginMsg('');
    await load();
  }catch(err){loginMsg(errText(err)||'A belépés sikertelen.');}
}
function showLogin(msg){
  $('loginGate').classList.remove('hidden');
  initGoogle();
  loginMsg(msg||'',!!msg&&/Kiléptél/.test(msg));
}
$('loginForm').addEventListener('submit',e=>e.preventDefault());
$('logoutBtn').addEventListener('click',()=>guard(async()=>{
  try{await call('logout');}catch(e){}
  TOKEN='';try{localStorage.removeItem(TOKEN_KEY);}catch(e){}bootCacheClear();
  try{if(window.google&&google.accounts&&google.accounts.id)google.accounts.id.disableAutoSelect();}catch(e){}
  S.me=null;S.loaded=false;S.projects=[];S.crew=[];S.inventory=[];S.users=null;S.log=null;S.projectId=null;S.draft=null;
  renderChrome();VIEW.innerHTML='';showLogin('Kiléptél.');
}));
$('refreshBtn').addEventListener('click',()=>load(false,true));

/* ===== Betöltés ===== */
/* Gyors indulás: az utolsó betöltött adatot a böngésző megjegyzi, és frissítéskor azonnal megmutatja,
   miközben a háttérben letölti a friss adatot. Kilépéskor és lejárt belépésnél törlődik. */
const BOOT_KEY='lpm_boot_v1';
function bootCacheSave(d){try{localStorage.setItem(BOOT_KEY,JSON.stringify({tk:String(TOKEN).slice(-16),at:Date.now(),d}));}catch(e){}}
function bootCacheClear(){try{localStorage.removeItem(BOOT_KEY);}catch(e){}calCacheClear();}
function bootFromCache(){
  try{const c=JSON.parse(localStorage.getItem(BOOT_KEY)||'null');if(!c||c.tk!==String(TOKEN).slice(-16)||!c.d||!c.d.me)return false;
    if(Date.now()-c.at>7*864e5)return false;
    const d=c.d;S.capabilities=d.capabilities||{};S.mailOn=d.mailOn;S.mailCats=d.mailCats||S.mailCats;S.mailCc=d.mailCc||S.mailCc;S.crewOrder=Array.isArray(d.crewOrder)?d.crewOrder:crewOrderLocal();S.me=d.me;S.projects=(d.projects||[]).map(normProj);S.crew=d.crew||[];S.inventory=d.inventory||[];S.clients=d.clients||[];S.links=d.links||{};S.loaded=true;S.lastLoad=0;
    document.body.classList.toggle('ro',ro());
    const hm=/^#p=([A-Za-z0-9-]{8,64})$/.exec(location.hash||'');
    if(hm&&projById(hm[1])){S.tab='projektek';S.projectId=hm[1];S.draft=prepDraft(projById(hm[1]));S.draftBase=clone(S.draft);}
    const ht=/^#t=([a-z]+)$/.exec(location.hash||'');if(ht&&!S.projectId&&TABS().some(t=>t.id===ht[1]))S.tab=ht[1];
    render(true);restoreScroll();return true;
  }catch(e){return false;}
}
async function load(quiet,announce,pre){
  if(S.loading&&!pre)return;S.loading=true;const seq=S.loadSeq=(S.loadSeq||0)+1;   // nézetváltáskor a folyamatban lévő betöltést felülírjuk
  if(!quiet&&!S.loaded)VIEW.innerHTML='<div class="loading"><span class="spin"></span>Betöltés…</div>';
  try{
    if(!pre&&S.saving)await SAVE_Q;   // ne töltsük be a régi állapotot, amíg mentés fut
    const d=pre||await call('bootstrap');
    if(seq!==S.loadSeq)return;   // közben újabb betöltés indult (pl. nézetváltás) – ezt eldobjuk
    bootCacheSave(d);
    setTimeout(()=>{try{if(S.me&&!ro())prefetchCal(S.cal.month);}catch(e){}},1200);
    setTimeout(()=>{try{if(S.me&&isAdmin()&&S.users===null)loadSettings();}catch(e){}},2500);   // Beállítások előtöltése
    S.capabilities=d.capabilities||{};S.mailOn=d.mailOn;S.mailCats=d.mailCats||S.mailCats;S.mailCc=d.mailCc||S.mailCc;S.crewOrder=Array.isArray(d.crewOrder)?d.crewOrder:crewOrderLocal();S.me=d.me;S.projects=(d.projects||[]).map(normProj);S.crew=d.crew||[];S.inventory=d.inventory||[];S.clients=d.clients||[];S.links=d.links||{};S.loaded=true;S.lastLoad=Date.now();
    document.body.classList.toggle('ro',ro());
    if(S.projectId){const p=projById(S.projectId);if(!p&&!S.dirty){S.projectId=null;S.draft=null;}else if(p&&!S.dirty){S.draft=prepDraft(p);S.draftBase=clone(S.draft);}}
    if((S.tab==='beallitasok'||S.tab==='penzugy'||S.tab==='szerzodes')&&!isAdmin())S.tab='projektek';
    if(S.fin&&(S.tab==='penzugy'||S.tab==='szerzodes'||S.tab==='ugyfelek'||S.projectId))finLoad(true);else S.fin=null;   // a pénzügyi adatok frissítése
    if((S.tab==='stab'||S.tab==='leltar'||S.tab==='ugyfelek')&&ro())S.tab='projektek';
    const hm=/^#p=([A-Za-z0-9-]{8,64})$/.exec(location.hash||'');   // projektlink (naptáreseményből vagy frissítés után)
    if(hm&&!S.dirty&&projById(hm[1])&&S.projectId!==hm[1]){S.tab='projektek';S.projectId=hm[1];S.draft=prepDraft(projById(hm[1]));S.draftBase=clone(S.draft);}
    const ht=/^#t=([a-z]+)$/.exec(location.hash||'');   // fül frissítés után
    if(ht&&!S.projectId&&TABS().some(t=>t.id===ht[1]))S.tab=ht[1];
    render(true);restoreScroll();if(announce)toast('Adatok frissítve');
  }catch(e){if(!handleErr(e)&&!S.loaded)VIEW.innerHTML=`<div class="panel">${empty('Nem sikerült betölteni az adatokat: '+esc(errText(e)))}<div class="btns"><button class="btn primary" type="button" data-action="reload">Újrapróbálás</button></div></div>`;}
  finally{if(seq===S.loadSeq)S.loading=false;}
}
setInterval(()=>{if(S.loaded&&!S.dirty&&!S.saving&&document.visibilityState==='visible'&&!$('modalRoot').innerHTML&&Date.now()-S.lastLoad>90000)load(true);},15000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&S.loaded&&!S.dirty&&!S.saving&&Date.now()-S.lastLoad>60000)load(true);});
window.addEventListener('beforeunload',e=>{if(S.saving||(S.dirty&&S.draft&&!ro())){e.preventDefault();e.returnValue='';}});   // mentetlen módosításnál a böngésző rákérdez

/* ===== Megjelenítés ===== */
/* Lenyíló szekciók a projektlapon: alapból csukva, a nyitott állapotot megjegyezzük újrarajzolás között. */
const FOLD={};
/* Tartalom-csoport lenyíló: alapból nyitva, ha van benne kiválasztott tétel; a nyitás/zárás megmarad. */
const stepRow=(p,it)=>{const n=num(p[it.k]);return `<div class="dl${n>it.min?' on':''}"><div><div class="dl-name">${it.label}</div></div>
  <div class="stepper"><button type="button" data-action="rec-step" data-k="${it.k}" data-d="-1" aria-label="${it.label}: kevesebb"${n<=it.min||ro()?' disabled':''}>−</button><input class="step-in" type="text" inputmode="numeric" pattern="[0-9]*" data-step-k="${it.k}" data-min="${it.min}" data-max="${it.max}" aria-label="${it.label} (db)" value="${n}"${D()}><button type="button" data-action="rec-step" data-k="${it.k}" data-d="1" aria-label="${it.label}: több"${n>=it.max||ro()?' disabled':''}>+</button></div></div>`;};
const cgrp=(key,title,n,body)=>`<details class="cgroup" data-fold="${key}"${(FOLD[key]!=null?FOLD[key]:n>0)?' open':''}><summary><span class="cg-t">${title}</span><span class="aside">${n?n+' kiválasztva':''}</span></summary><div class="cg-b">${body}</div></details>`;
const foldAside=n=>`<span class="aside">${n?n+' kiválasztva':'nincs kiválasztva'}</span>`;
document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.dataset&&d.dataset.fold)FOLD[d.dataset.fold]=d.open;if(d&&d.open)d.querySelectorAll('textarea.inp').forEach(autoGrow);},true);
function autoGrow(t){if(!t)return;const min=t.classList.contains('pcrew-note')?58:110;t.style.height='auto';t.style.height=Math.max(min,t.scrollHeight+2)+'px';}
document.addEventListener('input',e=>{if(e.target.matches&&e.target.matches('textarea.inp'))autoGrow(e.target);});
window.addEventListener('resize',()=>VIEW.querySelectorAll('textarea.inp').forEach(autoGrow));
/* Pénzügyek: az ügyvezetőnél a Kifizetések, a Szerződés és számlázás és a Bevétel és kiadás egy fül alá kerül (alfülekkel) */
/* Csoportosított fülek: Források (Stáb + Leltár) és – az ügyvezetőnél – Pénzügyek (Termelői fizetések, Szerződés és számlázás, Bevétel és kiadás) */
const TAB_GROUPS=[{label:'Források',ids:['stab','leltar'],icons:{stab:'👥 ',leltar:'🎒 '}},{label:'Pénzügyek',ids:['kifizetesek','szerzodes','penzugy'],icons:{kifizetesek:'⚒️ ',szerzodes:'📄 ',penzugy:'📊 '}}];
const FIN_GROUP=TAB_GROUPS[1].ids;
S.groupSub=S.groupSub||{};
const groupOf=id=>{const all=TABS();return TAB_GROUPS.find(g=>g.ids.includes(id)&&all.filter(t=>g.ids.includes(t.id)).length>1)||null;};
const finGrouped=()=>!!groupOf('penzugy')||!!groupOf('szerzodes');
function NAV_TABS(){const all=TABS(),out=[],done={};
  all.forEach(t=>{const g=groupOf(t.id);if(!g){out.push(t);return;}if(done[g.label])return;done[g.label]=1;
    const last=S.groupSub[g.label],id=last&&all.some(x=>x.id===last)?last:g.ids.find(x=>all.some(y=>y.id===x));out.push({id,label:g.label,group:g});});
  return out;}
function finSubNav(){const g=groupOf(S.tab);if(!g)return '';S.groupSub[g.label]=S.tab;
  return `<nav class="subtabs" aria-label="${esc(g.label)}">${TABS().filter(t=>g.ids.includes(t.id)).sort((a,b)=>g.ids.indexOf(a.id)-g.ids.indexOf(b.id)).map(t=>`<button class="subtab" type="button" data-action="tab" data-tab="${t.id}" aria-current="${S.tab===t.id?'page':'false'}">${g.icons[t.id]||''}${t.label}</button>`).join('')}</nav>`;}
const TABS=()=>[{id:'projektek',label:ro()?'Beosztásaim':'Projektek'}].concat(ro()?[]:[{id:'naptar',label:'Naptár'}]).concat(ro()?[{id:'naptar',label:'Naptár'},{id:'kifizetesek',label:isAdmin()?'Termelői fizetések':'Kifizetések'}]:[{id:'stab',label:'Stáb'},{id:'leltar',label:'Leltár'},{id:'ugyfelek',label:'Ügyfelek'},{id:'kifizetesek',label:isAdmin()?'Termelői fizetések':'Kifizetések'}]).concat(isAdmin()&&S.capabilities&&S.capabilities.finance?[{id:'penzugy',label:'Bevétel és kiadás'},{id:'szerzodes',label:'Szerződés és számlázás'}]:[]).concat(isAdmin()?[{id:'beallitasok',label:'Beállítások'}]:[]);
function renderChrome(){
  {const b=document.querySelector('.proj-save');if(b){const busy=S.saving>0;b.disabled=!S.dirty||busy;b.className='btn '+(S.dirty?'primary':'outline')+' small proj-save';b.textContent=busy?'Mentés…':S.dirty?'💾 Mentés':'✓ Mentve';}}
  const on=!!S.me;
  {let sp=$('savingPill');if(!sp){sp=document.createElement('div');sp.id='savingPill';sp.className='saving-pill';sp.setAttribute('role','status');document.body.appendChild(sp);}
    const busy=on&&S.saving>0;sp.classList.toggle('on',busy);if(busy&&!S._saveT0)S._saveT0=Date.now();if(!busy)S._saveT0=0;const sec=busy?Math.round((Date.now()-S._saveT0)/1000):0;sp.textContent=busy?'⏳ Mentés folyamatban…'+(sec>=6?' ('+sec+' mp – a szerver lassan válaszol)':''):'';if(busy){clearTimeout(S._spT);S._spT=setTimeout(()=>{try{renderChrome();}catch(e){}},1000);}}   // látszik, amíg a háttérben ment
  ['userChip','refreshBtn','logoutBtn'].forEach(id=>$(id).classList.toggle('hidden',!on));
  const realAdmin=on&&(S.me.role==='admin'||S.me.realRole==='admin'),va=on&&S.me.viewAs;
  $('viewAs').classList.toggle('hidden',!realAdmin);$('viewAs').classList.toggle('on',!!va);
  if(realAdmin){const sel=$('viewAs');sel.value=va?va.role:'admin';const co=sel.querySelector('option[value=crew]');co.textContent=va&&va.role==='crew'?'🔨 Szakember: '+(va.crewName||''):'🔨 Szakember';}
  const vb=$('viewBanner');vb.classList.toggle('hidden',!va);
  if(va){const h=`<span>${va.role==='crew'?'🔨':'⚙️'} ${va.role==='crew'?'Szakember nézet – így látja az appot <b>'+esc(va.crewName||'')+'</b>':'Termelési v. nézet – így látja az appot egy termelési vezető'}. Amit itt teszel, az a te nevedben történik.</span><button class="btn outline small" type="button" data-action="view-reset">Vissza: Ügyvezető</button>`;if(vb._h!==h){vb.innerHTML=h;vb._h=h;}}
  if(!on){$('tabs').innerHTML='';return;}
  $('userChip').textContent=S.me.name+' · '+roleLabel(S.me.role);
  const counts={projektek:S.projects.filter(isOpen).length,stab:S.crew.length,leltar:S.inventory.length};
  const tabsEl=$('tabs'),keepX=tabsEl.scrollLeft;
  $('tabs').innerHTML=NAV_TABS().map(t=>`<button class="tab" role="tab" type="button" aria-selected="${t.group?t.group.ids.includes(S.tab):S.tab===t.id}" data-action="tab" data-tab="${t.id}">${t.label}${counts[t.id]!=null&&!t.group?`<span class="count">${counts[t.id]}</span>`:''}</button>`).join('');
  tabsEl.scrollLeft=keepX;{const act=tabsEl.querySelector('[aria-selected="true"]');if(act&&tabsEl.scrollWidth>tabsEl.clientWidth){const l=act.offsetLeft-tabsEl.offsetLeft,r=l+act.offsetWidth;if(l<tabsEl.scrollLeft)tabsEl.scrollLeft=l-16;else if(r>tabsEl.scrollLeft+tabsEl.clientWidth)tabsEl.scrollLeft=r-tabsEl.clientWidth+16;}}
  const title=S.tab==='projektek'&&S.draft?(S.draft.name||'Projekt'):((groupOf(S.tab)?groupOf(S.tab).label+' · ':'')+((TABS().find(t=>t.id===S.tab)||{}).label||''));
  $('pageTitle').textContent=title;
  const bar=$('saveBar');
  const flash=!S.dirty&&S.savedFlash&&S.draft&&S.tab==='projektek';   // mentés után fél másodpercig még látszik: „✓ Mentve”
  const showBar=!!(S.dirty&&S.draft&&S.tab==='projektek'&&!ro());   // kézi mentés: mentetlen módosításnál mentési sáv
  bar.classList.toggle('hidden',!showBar&&!flash);document.body.classList.toggle('has-savebar',!!(showBar||flash));
  if(flash){const h=`<div class="savebar-in"><p>Módosítások mentve: ${esc(S.draft.name||'projekt')}</p><button class="btn primary saved-btn" type="button" disabled>✓ Mentve</button></div>`;if(bar._h!==h){bar.innerHTML=h;bar._h=h;}}
  else if(showBar){const h=`<div class="savebar-in"><p>Mentetlen módosítások: ${esc(S.draft.name||'projekt')}</p><button class="btn ghost" type="button" data-action="discard">Elvetés</button><button class="btn primary" type="button" data-action="save" title="Ctrl+S / ⌘S">💾 Mentés <span class="kbd">Ctrl+S</span></button></div>`;if(bar._h!==h){bar.innerHTML=h;bar._h=h;}}   // ugyanazt nem rajzoljuk újra, különben a Mentés gombra kattintás elveszhet
}
/* Egységes csíkozás: csoport- és hónapsorok után újrakezdve minden második adatsor enyhén zöld */
const ZB_SKIP=/(^|\s)(sep-row|pt-month|pt-group|grp|bill-month|pt-today-row)(\s|$)/;
function zebra(root){(root||document).querySelectorAll('table tbody').forEach(tb=>{let n=0;[...tb.rows].forEach(r=>{if(ZB_SKIP.test(r.className)){n=0;return;}r.classList.toggle('zb',n%2===1);r.classList.toggle('zw',n%2===0);n++;});});}
/* A cím (#p=projekt vagy #t=fül) mindig az aktuális helyet mutatja, így frissítés után ugyanide térünk vissza. */
function wantedHash(){return S.tab==='projektek'&&S.projectId?'#p='+S.projectId:S.tab&&S.tab!=='projektek'?'#t='+S.tab:'';}
function syncHash(){const h=wantedHash();if((location.hash||'')!==h){try{const url=location.pathname+location.search+h;if(S._histReady)history.pushState(null,'',url);else history.replaceState(null,'',url);}catch(e){}}S._histReady=!!S.loaded;}
/* Böngésző vissza/előre: az előző nézetre (fül vagy projekt) lépünk; a folyamatban lévő módosítás előtte elmentődik. */
window.addEventListener('popstate',()=>{if(!S.me||!S.loaded)return;
  if(document.querySelector('#modalRoot .mbox')){try{history.pushState(null,'',location.pathname+location.search+wantedHash());}catch(e){}return;}   // nyitott felugró ablak alatt nincs vissza / előre lapozás
  const h=location.hash||'';
  const go=()=>{const pm=/^#p=([A-Za-z0-9-]{8,64})$/.exec(h),tm=/^#t=([a-z]+)$/.exec(h);
    if(pm&&projById(pm[1])){S.tab='projektek';S.projectId=pm[1];S.draft=prepDraft(projById(pm[1]));S.draftBase=clone(S.draft);}
    else{S.projectId=null;S.draft=null;S.tab=tm&&TABS().some(t=>t.id===tm[1])?tm[1]:'projektek';}
    const was=S._histReady;S._histReady=false;render(true);S._histReady=was;scrollTo(0,0);};
  if(typeof guard==='function')guard(go,()=>{S._histReady=true;syncHash();});else go();});
window.addEventListener('pagehide',()=>{try{sessionStorage.setItem('lpm_scroll',JSON.stringify({h:location.hash,y:Math.round(scrollY)}));}catch(e){}});
let scrollRestored=false;
function restoreScroll(){if(scrollRestored)return;scrollRestored=true;try{const v=JSON.parse(sessionStorage.getItem('lpm_scroll')||'null');if(v&&v.h===location.hash&&v.y>0)requestAnimationFrame(()=>scrollTo(0,v.y));}catch(e){}}
function render(force){
  if(!S.me)return;
  document.body.classList.toggle('proj-locked',projLocked());
  const ae=document.activeElement;
  const keep=ae&&ae.id&&VIEW.contains(ae)&&ae.tagName!=='SELECT'?{id:ae.id,s:ae.selectionStart,e:ae.selectionEnd}:null;
  renderChrome();
  if(!S.loaded)return;
  VIEW.innerHTML=finSubNav()+(S.tab==='projektek'?viewProjects():S.tab==='naptar'?viewCalendar():S.tab==='stab'?viewCrew():S.tab==='leltar'?viewInventory():S.tab==='ugyfelek'?viewClients():S.tab==='kifizetesek'?viewPayouts():S.tab==='penzugy'?viewFinance():S.tab==='szerzodes'?viewBilling():S.tab==='beallitasok'?viewSettings():viewProjects());
  VIEW.querySelectorAll('textarea.inp').forEach(autoGrow);
  markReq();zebra(VIEW);
  syncHash();
  if(keep){const el=$(keep.id);if(el){el.focus({preventScroll:true});try{if(keep.s!=null&&el.setSelectionRange)el.setSelectionRange(keep.s,keep.e);}catch(e){}}}
}

/* Kötelező alapadatok jelölése: csillag a címkén, piros keret az üres mezőn. */
function reqEl(k){return k==='contactPhone'?VIEW.querySelector('[data-ph="k:contactPhone"]'):$('f-'+k);}
function markReq(){
  if(S.tab!=='projektek'||!S.draft||ro())return;
  const miss=new Set(missingReq(S.draft).map(x=>x[0]));
  REQ_FIELDS.forEach(([k])=>{if(k==='endDate'&&!(S.draft._multi||S.draft.endDate))return;const el=reqEl(k);if(!el)return;const f=el.closest('.field');if(!f)return;f.classList.add('req');f.classList.toggle('missing',miss.has(k));});
}

/* közös elemek */
/* Átadandó anyag nélküli projektnél az utolsó lépés neve „Kész” (nincs mit átadni). */
const stageLabel=(p,id)=>STATUS_LABEL[id]||id;
const normProj=p=>{if(p&&(!p.status||p.status==='egyeztetes'))p.status='tervezes';return p;};   // az „Egyeztetés” lépés megszűnt
/* Videó link jelszóval: ráhúzva megjelenik a jelszó, egy kattintással másolható */
function vidLink(p,cls,label,extra){if(!/^https:\/\//i.test(p.deliveryLink||''))return '';const a=`<a class="${cls}" href="${esc(p.deliveryLink)}" target="_blank" rel="noopener"${extra||''}>${label}</a>`;
  return p.deliveryPass?`<span class="pass-wrap">${a}<span class="pass-pop" role="tooltip">🔑 Jelszó: <code>${esc(p.deliveryPass)}</code><button type="button" class="pass-copy" data-action="copy-pass" data-pass="${esc(p.deliveryPass)}">Másolás</button></span></span>`:a;}
const DONE_CHECK=' <span class="done-check" title="Lezárva" aria-label="Lezárva">✓</span>';
function statusPill(p){const s=p.status||'tervezes';return `<span class="statuspill st-${esc(s)}">${esc(stageLabel(p,s))}</span>${s==='tervezes'&&!ro()&&missingReq(p).length?'<span class="statuspill p-mute" data-tip="Hiányos alapadatok – a projekt oldalán pótolhatók">📝 Piszkozat</span>':''}`;}
function calBlock(iso){
  if(!validISO(iso))return `<span class="cal none" aria-hidden="true"><span class="cal-m">—</span><span class="cal-d">?</span></span>`;
  const d=toDate(iso);
  return `<span class="cal" aria-hidden="true"><span class="cal-m">${esc(F_MON.format(d).replace('.',''))}</span><span class="cal-d">${d.getUTCDate()}</span><span class="cal-w">${esc(F_WD.format(d))}</span></span>`;
}
function dueInfo(p){
  const due=dueDate(p);if(!due||!isOpen(p))return null;
  if(p.status==='leadva'||p.status==='jovahagyas'){const n=validISO(p.leadvaAt)?diffDays(p.leadvaAt,todayISO()):null;   // a videók már leadva: nem az átadási határidőt mutatjuk
    if(n==null)return null;
    return {due,left:null,lead:n,cls:n>=14?'alarm':n>=7?'bad':n>=3?'warn':'ok',txt:n<=0?'Ma leadva – jóváhagyásra vár':`${n>=7?'🚨 ':''}${n} napja leadva – nincs jóváhagyás`};}
  const left=diffDays(todayISO(),due);
  return {due,left,cls:left<0?'bad':left<=2?'warn':'ok',txt:left<0?`${-left} napja lejárt`:left===0?'Ma kell átadni':`${left} nap az átadásig`};
}
/* Szakember nézet: a lezárt projekt szürke és nem nyitható; ha nem ő vág, az utómunkára váró projekt is */
function crewDim(p){if(!ro())return false;const st=p.status||'tervezes';if(st==='atadva'||st==='lemondva')return true;
  const r=pr(p),post=POST_STAGES.includes(st)||(r&&r.end<todayISO());if(!post)return false;
  const me=S.me&&S.me.crewId;return !(me&&(p.crew||[]).some(a=>a.crewId===me&&a.role==='Vágó'));}
function myRole(p){if(!S.me||!S.me.crewId)return '';const r=[];if(p.lead===S.me.crewId)r.push('projektvezető');(p.crew||[]).forEach(a=>{if(a.crewId===S.me.crewId)r.push(a.role.toLowerCase());});return r.join(', ');}
/* Létszám: a távolról (remote) vezető projektvezető nem számít bele */
function crewN(p){const ids=crewIds(p);if(remoteLead(p))ids.delete(p.lead);return ids.size;}
function evRow(p,opt={}){
  const r=pr(p),T=todayISO();
  const sub=(ro()?[p.venue]:[p.client,p.venue]).filter(Boolean).join(' · ')||(ro()?'':'Nincs ügyfél megadva');
  const days=r&&r.end!==r.start?` · ${diffDays(r.start,r.end)+1} napos`:'';
  let side=statusPill(p);
  const di=dueInfo(p);
  if(di&&r&&(r.end<T||POST_STAGES.includes(p.status)))side+=`<span class="statuspill p-${di.cls}">${di.txt}</span>`;
  if(ro()){const m=myRole(p);if(m)side+=`<span class="smallnum">Te: ${esc(m)}</span>`;if(p.myFee&&num(p.myFee.amount))side+=`<span class="smallnum fee-chip">${(p.penalties||[]).length?penIcon(p):''}${ftFmt(myNet(p))}</span>`;}
  else side+=`<span class="smallnum">${crewN(p)} fő · ${eqCount(p)} eszköz</span>`;
  return `<button class="ev" type="button" data-action="open-project" data-id="${esc(p.id)}">${calBlock(r&&r.start)}
    <span class="ev-main"><span class="ev-title">${esc(p.name||'Névtelen projekt')}${p.status==='atadva'?DONE_CHECK:''}</span><span class="ev-sub">${esc(sub)}${days}</span></span>
    <span class="ev-side">${side}</span></button>`;
}
function issueRow(i,exceptId){
  const links=i.pids.filter(id=>id!==exceptId).map(id=>{const p=projById(id);return p?`<button class="linkbtn" type="button" data-action="open-project" data-id="${esc(id)}">${esc(p.name||'Névtelen projekt')} →</button>`:'';}).join('');
  const one=i.pids.length===1&&links;   // egy projekt: első sor a projekt neve, alatta a figyelmeztetés
  return `<div class="issue ${i.level}"><span class="ic" aria-hidden="true">!</span><div class="issue-t">${one?`<div class="issue-links issue-first">${links}</div><div>${esc(i.text)}</div>`:`<div>${esc(i.text)}</div>${links?`<div class="issue-links">${links}</div>`:''}`}</div></div>`;
}

/* ===== Áttekintés ===== */
const F_YM=new Intl.DateTimeFormat('hu-HU',{year:'numeric',month:'long',timeZone:'UTC'});
/* ⚠️ hoverre: mit hibázott (szakember nézet) */
function penIcon(p){const t=(p.penalties||[]).map(x=>{const k=PEN_KINDS[x.kind]||{};return (k.label||'')+(x.kind==='damage'?' ('+ftFmt(x.amount)+')':' ('+num(x.pct)+'%)')+(x.caseText?' – '+x.caseText:'')+(x.reason?': '+x.reason:'');}).join('\n');
  return `<span class="pen-ic" tabindex="0" data-tip="${esc(t)}" aria-label="Díjcsökkentés: ${esc(t)}">⚠️</span>`;}
const myNet=p=>{const a=num(p.myFee&&p.myFee.amount),cid=S.me&&S.me.crewId;return cid?a-penDeduct(p,cid,a):a;};   // díjcsökkentés után
/* Kifizetések havonta: ki melyik projekten mennyit kap (díjcsökkentés után), és a hónap összesen – visszamenőleg is */
/* Kifizetések fül: soronként a projektek, oszloponként a szakemberek (díjcsökkentés után), alul a total – hónaponként, visszamenőleg is */
/* Rövid név a fix szélességű oszlophoz: ha nem fér ki, a vezetéknév(ek) kezdőbetűje + utónév (pl. „G. Flóra”). */
function shortName(n){n=String(n||'').trim();if(n.length<=13)return n;const w=n.split(/\s+/);if(w.length<2)return n.slice(0,12)+'…';const s=w.slice(0,-1).map(x=>x[0]+'.').join(' ')+' '+w[w.length-1];return s.length<=16?s:s.slice(0,15)+'…';}
/* Levonások indoka (a cellára vagy a szirénára mutatva látszik) */
function penReasons(p,cid){return penOf(p,cid,'approved').filter(x=>x.kind!=='damage').map(x=>`${(PEN_KINDS[x.kind]||{}).label||'Díjcsökkentés'} ${num(x.pct)}%${x.day?' ('+dayLbl(x.day)+')':''}: ${x.reason||''}${x.caseText?' – '+x.caseText:''}`).join('\n');}
function viewPayouts(){
  const crewMode=ro(),myId=crewMode?((S.me.viewAs&&S.me.viewAs.crewId)||S.me.crewId):'';
  const cur=todayISO().slice(0,7),by={},kept={};   // kept: díjcsökkentés miatt nem kerül kifizetésre (hónap → szakember)
  const add=(p,cid,amount,ded)=>{const m=pr(p).start.slice(0,7),net=num(amount)-ded;if(ded){const k=(kept[m]=kept[m]||{});k[cid]=(k[cid]||0)+ded;}const b=(by[m]=by[m]||{}),row=(b[p.id]=b[p.id]||{p,cells:{},ded:{}});row.cells[cid]=(row.cells[cid]||0)+net;if(ded)row.ded[cid]=(row.ded[cid]||0)+ded;};
  S.projects.filter(p=>p.status!=='lemondva'&&pr(p)).forEach(p=>{
    if(crewMode){if(myId&&p.myFee&&num(p.myFee.amount))add(p,myId,p.myFee.amount,penDeduct(p,myId,p.myFee.amount));return;}   // szakember: csak a saját díja
    (p.fees||[]).forEach(f=>{const ref=f.kind==='fixed'&&f.refCrewId,cid=ref?f.refCrewId:f.kind==='fixed'?'':f.crewId;if(!cid||!num(f.amount))return;   // az ajánlói jutalék is a szakembernek jár
      add(p,cid,f.amount,ref?0:penDeduct(p,cid,f.amount));});});
  const months=Object.keys(by).concat([cur]).filter((v,i,a)=>a.indexOf(v)===i).sort().reverse();
  const sel=months.includes(S.payMonth)?S.payMonth:(by[cur]?cur:months[0]||cur),rows=Object.values(by[sel]||{}).sort((a,b)=>byStart(a.p,b.p));
  const rentOn=OFFICE_RENT.map(r=>({c:(S.crew||[]).find(x=>x.name===r.name),amount:r.amount})).filter(r=>r.c&&(!crewMode||r.c.id===myId)),rent=c=>rentOn.filter(r=>r.c.id===c).reduce((s,r)=>s+r.amount,0);   // fix havi irodabérlet
  const keptM=kept[sel]||{},keptTotal=Object.values(keptM).reduce((s,x)=>s+x,0);
  const tot_=c=>rows.reduce((s,r)=>s+num(r.cells[c]),0)+rent(c),cids=crewMode?[myId]:[...new Set(rows.flatMap(r=>Object.keys(r.cells)).concat(rentOn.map(r=>r.c.id)))].sort((a,b)=>tot_(b)-tot_(a)||((crewById(a)||{}).name||'').localeCompare((crewById(b)||{}).name||'','hu'));   // a havi összeg szerint csökkenő sorrend
  const colSum=cid=>rows.reduce((s,r)=>s+(r.cells[cid]||0),0)+rent(cid),rowSum=r=>Object.values(r.cells).reduce((s,x)=>s+x,0),rentTotal=rentOn.reduce((s,r)=>s+r.amount,0),total=rows.reduce((s,r)=>s+rowSum(r),0)+rentTotal;
  const keptRow=keptTotal?`<tr class="pay-left"><td>🚨 Nem kerül kifizetésre</td>${cids.map(c=>`<td class="r">${keptM[c]?moneyFmt(keptM[c]):'<span class="muted">–</span>'}</td>`).join('')}${crewMode?'':'<td></td>'}</tr>`:'';   // az összesen oszlopba nem kerül
  const rentRow=rentOn.length?`<tr><td>🏢 Irodabérleti és termelési vezetői díj</td>${cids.map(c=>`<td class="r">${rent(c)?moneyFmt(rent(c)):'<span class="muted">–</span>'}</td>`).join('')}${crewMode?'':`<td class="r"><b>${moneyFmt(rentTotal)}</b></td>`}</tr>`:'';
  const nameOf=c=>(crewById(c)||{}).name||(crewMode?(S.me.viewAs&&S.me.viewAs.crewName)||S.me.name:'Munkatárs');
  const cell=(r,c)=>{const d=r.ded[c],why=d?esc(`Díjcsökkentés: −${moneyFmt(d)} Ft\n`+penReasons(r.p,c)):'';
    return `<td class="r${d?' pay-ded':''}"${d?` data-tip="${why}" tabindex="0"`:''}>${r.cells[c]!=null?moneyFmt(r.cells[c])||0:'<span class="muted">–</span>'}${d?`<small class="pay-ded-note">🚨 −${moneyFmt(d)}</small>`:''}</td>`;};
  const colW=`<colgroup><col class="pay-c-proj">${cids.map(()=>'<col class="pay-c-person">').join('')}${crewMode?'':'<col class="pay-c-sum">'}</colgroup>`;
  return `<div class="page-head"><div class="grow"><h2>${isAdmin()?'Termelői fizetések':'Kifizetések'}</h2><p class="sub">${crewMode?'Nettó fizetésed tételesen':'Termelői díjak, irodabérleti és termelési vezetői díj hónaponként, díjcsökkentés után · nettó'}</p></div>
      <select class="inp" id="pay-month" style="width:auto" aria-label="Hónap">${months.map(m=>`<option value="${m}"${m===sel?' selected':''}>${esc(F_YM.format(toDate(m+'-01')))}</option>`).join('')}</select></div>
    ${rows.length||rentOn.length?`<div class="sheet-wrap pay-wrap${crewMode?' pay-center':''}"><table class="sheet pay-sheet">${colW}<thead><tr><th>Projekt neve</th>${cids.map(c=>`<th class="r" title="${esc(nameOf(c))}">${esc(shortName(nameOf(c)))}</th>`).join('')}${crewMode?'':'<th class="r">Projekt összesen</th>'}</tr></thead>
      <tbody>${rows.map(r=>`<tr><td><button class="linkbtn" type="button" data-action="open-project" data-id="${esc(r.p.id)}">${esc(fmtShort(pr(r.p).start))} · ${esc(r.p.name||'Névtelen projekt')}</button></td>${cids.map(c=>cell(r,c)).join('')}${crewMode?'':`<td class="r"><b>${moneyFmt(rowSum(r))||0}</b></td>`}</tr>`).join('')}${rows.length?'':`<tr><td colspan="${cids.length+2}" class="empty-row">Ebben a hónapban nincs termelői díj.</td></tr>`}${rentRow}</tbody>
      <tfoot><tr><td><b>Összesen (${esc(F_YM.format(toDate(sel+'-01')))})</b></td>${cids.map(c=>`<td class="r"><b>${moneyFmt(colSum(c))||0}</b></td>`).join('')}${crewMode?'':`<td class="r pay-total"><b>${ftFmt(total)}</b></td>`}</tr>${keptRow}</tfoot></table></div>`
      :`<div class="panel">${empty('Ebben a hónapban nincs termelői díj.')}</div>`}`;
}
function pendingBudgetPanel(){
  const rows=S.projects.filter(p=>p.budgetRequest&&p.budgetRequest.status==='pending');
  if(!rows.length)return '';
  return `<div class="panel pen-pending"><h3>💰 Jóváhagyásra váró keretmódosítások <span class="aside">${rows.length} db</span></h3><div class="list">${rows.map(p=>`<button class="ev" type="button" data-action="open-project" data-id="${esc(p.id)}"><div class="ev-b"><b>${esc(p.name)} · ${ftFmt(p.budgetRequest.amount)}</b><small>${esc(p.budgetRequest.by)} · ${esc(p.budgetRequest.reason)}</small></div></button>`).join('')}</div></div>`;
}
function budgetRequestPanel(p){
  if(!canSeeFees())return '';
  const r=p.budgetRequest,waiting=r&&r.status==='pending',adm=isAdmin();
  if(!adm)return '';   // a termelési vezető nem kér keretmódosítást
  if(!waiting)return '';   // ügyvezetői nézetben csak akkor látszik, ha döntésre vár egy kérelem
  return `<div class="panel budget-request"><h4>${adm?'Keretmódosítási kérelem':'Termelői keret módosítása'}</h4>${waiting?`<p><b>${ftFmt(r.amount)}</b> · ügyvezetői jóváhagyásra vár</p><p>${esc(r.reason)} · ${esc(r.by)}</p>${adm?`<div class="btns"><button class="btn primary small" type="button" data-action="budget-approve" data-id="${esc(r.id)}">Jóváhagyás</button><button class="btn outline small" type="button" data-action="budget-reject" data-id="${esc(r.id)}">Elutasítás</button></div>`:''}`:r?`<p class="hint">${r.status==='approved'?'Jóváhagyva':r.status==='superseded'?'Új keretbeállítás lépett életbe':'Elutasítva'} · ${esc(r.decidedBy||'')} · ${esc(r.decidedAt||'')}</p>`:''}
    ${!adm&&!waiting?`<p>Aktuális keret: <b>${budgetFt(p)==null?'Kitöltésre vár':ftFmt(budgetFt(p))}</b></p><button class="btn outline small" type="button" data-action="budget-request"${S.capabilities&&S.capabilities.budgetApproval?'':' disabled'}>Keretmódosítás kérése</button>${S.capabilities&&S.capabilities.budgetApproval?'':'<p class="hint">A jóváhagyási funkció a háttérkód frissítésével aktiválódik.</p>'}`:''}</div>`;
}
function pendingPenPanel(){
  const rows=[];S.projects.forEach(p=>(p.penalties||[]).filter(x=>x.status==='pending').forEach(x=>rows.push({p,x})));
  if(!rows.length)return '';
  return `<div class="panel pen-pending"><h3>⚠️ Jóváhagyásra váró díjcsökkentések <span class="aside">${rows.length} db</span></h3><div class="list">${rows.map(({p,x})=>{const c=crewById(x.crewId),k=PEN_KINDS[x.kind]||{};
    return `<button class="ev" type="button" data-action="open-project" data-id="${esc(p.id)}"><div class="ev-b"><b>${esc(c?c.name:'Munkatárs')} · ${esc(k.label||'')}${x.kind==='damage'?' · '+ftFmt(x.amount):' · '+num(x.pct)+'%'}</b><small>${esc(p.name||'')} · javasolta: ${esc(x.by)} · ${esc(x.at)}</small></div></button>`;}).join('')}</div></div>`;
}
function viewProjects(){
  if(S.projectId&&S.draft)return viewProject(S.draft);
  const T=todayISO(),f=S.pf,q=f.q.trim().toLowerCase();
  const filters=[['aktiv','Aktív',S.projects.filter(isOpen).length],...STAGES.map(s=>[s.id,s.label,S.projects.filter(p=>(p.status||'tervezes')===s.id).length]),['lemondva','Lemondva',S.projects.filter(p=>p.status==='lemondva').length],['mind','Mind',S.projects.length]];
  let list=S.projects.filter(p=>f.status==='mind'||(f.status==='aktiv'?isOpen(p):(p.status||'tervezes')===f.status));
  if(q)list=list.filter(p=>[p.name,p.client,p.venue,p.eventType,p.contactName].join(' ').toLowerCase().includes(q));
  const closed=p=>p.status==='atadva'||p.status==='lemondva';
  const ahead=list.filter(p=>!closed(p)&&(!pr(p)||pr(p).end>=T)).sort((a,b)=>!pr(a)?1:!pr(b)?-1:byStart(b,a));   // terepi munkára vár (dátum nélküliek a végén)
  const past=list.filter(p=>!closed(p)&&pr(p)&&pr(p).end<T).sort((a,b)=>byStart(b,a));   // lezajlott, utómunkára vár
  const done=list.filter(closed).sort((a,b)=>!pr(a)?1:!pr(b)?-1:byStart(b,a));   // lezárt: hónaponként
  const issues=ro()?[]:computeIssues();
  const row=p=>{const r=pr(p),di=dueInfo(p),sub=(ro()?[p.venue]:[p.client,p.venue]).filter(Boolean).join(' · ')||(ro()?'':'Nincs ügyfél megadva'),days=r&&r.end!==r.start?` · ${diffDays(r.start,r.end)+1} napos`:'';
    const nCrew=crewN(p),sz=nCrew>=6?3:nCrew>=3?2:1,crewChip=nCrew?`<span class="pt-crew sz${sz}" title="${nCrew} fő a projekten">👥 ${nCrew}</span>`:'';   // a projekt nagysága: minél több szakember, annál feltűnőbb
    const when=!r?'':r.start<=T&&r.end>=T?'now':r.start>T?'fut':'past',rel=!r?'':when==='now'?'<span class="pt-rel now">● MA</span>':when==='fut'?`<span class="pt-rel fut">${diffDays(T,r.start)===1?'holnap':diffDays(T,r.start)+' nap múlva'}</span>`:`<span class="pt-rel past">${diffDays(r.end,T)===1?'tegnap':diffDays(r.end,T)+' napja'}</span>`;
    const due=di&&r&&(r.end<T||POST_STAGES.includes(p.status))?`<span class="statuspill p-${di.cls}">${di.txt}</span>`:'';
    const extra=ro()?(myRole(p)?`<span class="smallnum">${esc(myRole(p))}</span>`:'')
      :`<span class="smallnum">${nCrew} fő · ${eqCount(p)} eszköz</span>`;
    const dim=crewDim(p);
    return `<tr class="pt-row pt-${when||'nodate'} pt-sz${sz}${p.status==='lemondva'?' pt-cancel':''}${dim?' pt-dim':''}"${dim?' aria-disabled="true"':` data-action="open-project" data-id="${esc(p.id)}" tabindex="0"`}><td class="pt-proj"><div class="pt-flex">${calBlock(r&&r.start)}<span class="ev-main"><span class="ev-title">${esc(p.name||'Névtelen projekt')}${p.status==='atadva'?DONE_CHECK:''}${crewChip}${rel}</span><span class="ev-sub">${esc(sub)}${days}</span></span></div></td>
      <td class="pt-status"><div class="pt-pills">${statusPill(p)}${due}${vidLink(p,'statuspill p-info pt-video','▶ Leadott videó'+(p.deliveryPass?' 🔒':''),` data-action="ext-link" title="${esc(p.deliveryLink)}"`)}${budgetMissing(p)?`<span class="statuspill p-bad" data-tip="Hiányzik: ${esc(budgetMissing(p))}">💰 ${esc(budgetMissing(p))} hiányzik</span>`:''}</div></td>${ro()?`<td class="pt-extra">${extra}</td>`:''}</tr>`;};
  const cols=ro()?3:2;
  const grp=(t,arr,cls)=>arr.length?`<tr class="pt-group${cls?' '+cls:''}"><td colspan="${cols}">${t} <span class="muted">${arr.length}</span></td></tr>${arr.map(row).join('')}`:'';
  const months=[];done.forEach(p=>{const m=pr(p)?pr(p).start.slice(0,7):'';let g=months.find(x=>x.m===m);if(!g)months.push(g={m,arr:[]});g.arr.push(p);});
  // egyetlen lista dátum szerint csökkenő sorrendben; a mai napnál jelölő sor, a jövő / mai / lezajlott sorok eltérő jelöléssel
  const all=list.slice().sort((a,b)=>!pr(a)?-1:!pr(b)?1:byStart(b,a));
  let marked=false;const todayRow=`<tr class="pt-today-row"><td colspan="${cols}"><span><b>📍 Ma · ${esc(fmtDay(T))}</b></span></td></tr>`;
  const body=all.map(p=>{const r=pr(p);let h='';if(!marked&&r&&r.start<=T){marked=true;h=todayRow;}return h+row(p);}).join('')+(marked?'':todayRow);
  return `<div class="page-head"><div class="grow"><h2>${ro()?'Beosztásaim':'Projektek'}</h2><p class="sub">${ro()?'Azok a projektek, amelyekre be vagy osztva':'Rendezvények a tervezéstől az átadásig'}</p></div>
      <button class="btn primary w" type="button" data-action="new-project">+ Új projekt</button></div>
    ${ro()&&!S.me.crewId?`<div class="banner"><p>A felhasználód még nincs összekapcsolva a stáblistával, ezért nem látod a beosztásaidat. Szólj az ügyvezetőnek.</p></div>`:''}
    ${ro()||!issues.length?'':`<details class="panel fold issues-panel" data-fold="issues"${FOLD.issues!==false&&issues.length?' open':''}><summary><h3>⚠️ Figyelmeztetések <span class="aside">${issues.length?issues.length+' db':'minden rendben'}</span></h3></summary>${issues.length?`<div class="issues">${issues.map(i=>issueRow(i)).join('')}</div>`:empty('Minden rendben: senki és semmi nincs duplán beosztva, és a stáb is teljes.')}</details>`}
    ${isAdmin()?pendingPenPanel()+pendingBudgetPanel():''}
    <div class="toolbar"><input class="inp search" id="q-projects" type="search" placeholder="Keresés név, ügyfél, helyszín szerint" value="${esc(f.q)}" aria-label="Projektek keresése">
      <div class="chips">${filters.map(([v,l,c])=>`<button class="chip" type="button" data-action="pf" data-v="${v}" aria-pressed="${f.status===v}">${l}<span class="c">${c}</span></button>`).join('')}</div></div>
    ${body?`<div class="sheet-wrap proj-wrap"><table class="sheet proj-table"><thead><tr><th>Projekt</th><th>Státusz</th>${ro()?'<th>Szereped</th>':''}</tr></thead><tbody>${body}</tbody></table></div>`
      :`<div class="panel">${empty(S.projects.length?'Nincs a szűrésnek megfelelő projekt.':ro()?'Még nem vagy beosztva egy projektre sem.':'Még nincs projekt. Hozd létre az elsőt az „Új projekt” gombbal.')}</div>`}`;
}
function fld(p,key,label,o={}){
  const v=p[key]??'';
  return `<div class="field${o.full?' full':''}"><label for="f-${key}">${label}</label><input class="inp" id="f-${key}" data-field="${key}" type="${o.type||'text'}" autocomplete="off"${key==='venue'?' name="lpm-venue-search" spellcheck="false"':''} value="${esc(v)}"${o.ph?` placeholder="${esc(o.ph)}"`:''}${o.min!=null?` min="${o.min}"`:''}${o.max!=null?` max="${o.max}"`:''}${o.step!=null?` step="${o.step}"`:''}${o.im?` inputmode="${o.im}"`:''}${key==='client'?' autocomplete="off"':''}${D()}></div>`;
}
function selField(p,key,label,opts,o={}){
  const v=p[key]??'';
  return `<div class="field${o.full?' full':''}"><label for="f-${key}">${label}</label><select class="inp" id="f-${key}" data-field="${key}"${D()}><option value="">${o.empty||'Válassz…'}</option>${opts.map(x=>{const [val,lab]=Array.isArray(x)?x:[x,x];return `<option value="${esc(val)}"${val===v?' selected':''}>${esc(lab)}</option>`;}).join('')}</select></div>`;
}
const FOTO_DEF=150,FOTO_STEP=10,FOTO_MAX=1000;
const fotoDb=p=>num(p.foto_db);   // fotók utómunkája (db) – a helyszíni fotózás külön pipa a Terepi feladatoknál
function fotoRow(p){const n=fotoDb(p);
  return `<div class="dl${n?' on':''}"><div><div class="dl-name">Fotók utómunkája</div>${n?`<div class="dl-price">${n} db fotó</div>`:''}</div>
    <div class="stepper"><button type="button" data-action="foto-step" data-d="-1" aria-label="Fotók utómunkája: kevesebb"${n<=0||ro()?' disabled':''}>−</button><input class="step-in" type="text" inputmode="numeric" pattern="[0-9]*" data-step-k="foto_db" data-min="0" data-max="${FOTO_MAX}" aria-label="Fotók száma" value="${n}"${D()}><button type="button" data-action="foto-step" data-d="1" aria-label="Fotózás: több"${n>=FOTO_MAX||ro()?' disabled':''}>+</button></div></div>`;}
/* ===== Stáb és eszközök egy panelen: munkatársanként a nála lévő eszközök ===== */
function eqNote(e,it,p){
  if(!it)return '';const free=num(it.qty)-usedElsewhere(it.id,p)-(eqQty(p,it.id)-num(e.qty));
  if(num(e.qty)>free)return `<span class="bad-txt">Csak ${Math.max(0,free)} db szabad ezen a napon</span>`;
  if(it.condition&&it.condition!=='ok')return `<span class="warn-txt">${esc(CONDITIONS[it.condition])}</span>`;
  return `<small>${esc(it.category||'Egyéb')}${it.location?' · '+esc(it.location):''}</small>`;
}
const CAT_ICON={'Kamera':'📷','Objektív':'🔭','Hang':'🎙️','Fény':'💡','Drón':'🚁','Képkeverés / stream':'🎛️','GoPro / akciókamera':'🎥','Gimbal / állvány':'🎚️','Akku / powerbank / táp':'🔋','Adathordozó':'💾','Laptop / tablet / telefon':'💻','Kocsi / szállítás':'🚐','Kábel':'🔌','Egyéb':'📦'};
const catLbl=c=>(CAT_ICON[c]||'📦')+' '+c;
function itemOptions(p){
  return INV_CATS.map(cat=>{const items=S.inventory.filter(i=>(i.category||'Egyéb')===cat&&i.condition!=='selejt').sort((a,b)=>a.name.localeCompare(b.name,'hu'));
    if(!items.length)return '';return `<optgroup label="${esc(catLbl(cat))}">${items.map(i=>{const free=num(i.qty)-usedElsewhere(i.id,p)-eqQty(p,i.id);return `<option value="${esc(i.id)}"${free<=0?' disabled':''}>${esc(i.name)} — ${Math.max(0,free)}/${num(i.qty)} szabad${i.condition&&i.condition!=='ok'?' ('+CONDITIONS[i.condition].toLowerCase()+')':''}</option>`;}).join('')}</optgroup>`;}).join('');
}
function eqRowsFor(p,key){
  return (p.equipment||[]).map((e,i)=>({e,i})).filter(x=>(x.e.crewId||'')===key).map(({e,i})=>{const it=itemById(e.itemId);
    return `<div class="eqrow"><div class="who"><b>${esc(it?it.name:'Törölt eszköz')}</b>${eqNote(e,it,p)}</div>
      <input class="inp qty" type="number" min="1" inputmode="numeric" data-eq-i="${i}" value="${num(e.qty)}" aria-label="Darabszám"${D()}>
      <button class="x w" type="button" data-action="eq-remove" data-i="${i}" aria-label="Eszköz eltávolítása">×</button></div>`;}).join('');
}
function eqAddRow(p,key,opts){
  if(ro())return '';
  return `<div class="eqadd"><select class="inp" id="add-eq-item-${esc(key||'common')}" data-eq-auto="${esc(key)}" aria-label="Eszköz hozzáadása"><option value="">+ Eszköz hozzárendelése…</option>${opts}<optgroup label="➕ Más eszköz"><option value="__new">🆕 Új eszköz felvétele a leltárba…</option><option value="__own">🎒 Saját eszköz…</option><option value="__rent">🏷️ Bérelt eszköz…</option></optgroup></select></div>`;
}
/* ===== Pénzügyek: ügyvezető = projekt értéke + termelői díjak + fedezet; termelési vezető = csak termelői díjak; szakember = semmi.
   (A háttér is így szűr: a projekt értékét csak az ügyvezető, a díjakat a szakember egyáltalán nem kapja meg.) ===== */
const ftFmt=n=>String(Math.round(+n||0)).replace(/\B(?=(\d{3})+(?!\d))/g,'\u00a0')+'\u00a0Ft';
/* Bérelt eszközök (nem leltári): a díjtáblázatban a felelős ember „Eszközbérlés” oszlopába számítanak. */
const rentalsOf=(p,cid)=>(p.rentals||[]).filter(r=>(r.crewId||'')===(cid||''));
const rentalSum=(p,cid)=>rentalsOf(p,cid).reduce((s,r)=>s+num(r.price),0);
const rentOf=(p,f)=>f.crewId&&rentalsOf(p,f.crewId).some(r=>!r.own)?rentalSum(p,f.crewId):num(f.rent);
const feeSum=p=>(p.fees||[]).reduce((s,f)=>s+num(f.amount)-(f.crewId?penDeduct(p,f.crewId,f.amount):0)+rentOf(p,f),0)+rentalSum(p,'');   // jóváhagyott díjcsökkentéssel
const canSeeFees=()=>!!S.me&&(S.me.role==='admin'||S.me.role==='editor');
/* Termelői keret forintban: az ügyvezetőnél a beállításból (% a projekt értékéből vagy fix összeg), a termelési vezetőnél a háttér által kiszámolt összeg. */
/* Ügyvezetőnek: hiányzó büdzsé / termelői keret (nyitott projekteknél) */
function budgetMissing(p){if(!isAdmin()||!isOpen(p))return '';const m=[];if(p.projectValue==null||p.projectValue==='')m.push('büdzsé');if(budgetFt(p)==null&&!isFree(p))m.push('keret');return m.join(' és ');}
/* Nem fizetős projekt: a büdzsé 0 Ft (a „Nem fizetős” pipával állítható) */
/* Extra szolgáltatások: a szerződött érték (projectValue) felett; a végső érték = szerződött + extrák (a termelői keret a szerződöttből számol) */
const extrasOf=p=>(p&&Array.isArray(p.extras)?p.extras:[]);
const exSign=x=>x&&x.kind==='le'?-1:1;   // le = kedvezmény / jutalék (a végszámlából levonva)
const extrasPlus=p=>extrasOf(p).filter(x=>exSign(x)>0).reduce((s,x)=>s+num(x.amount),0);
const extrasMinus=p=>extrasOf(p).filter(x=>exSign(x)<0).reduce((s,x)=>s+num(x.amount),0);
const extrasSum=p=>extrasPlus(p)-extrasMinus(p);
const exBreak=p=>`szerződött ${ftFmt(num(p.projectValue))}${extrasPlus(p)?' + extra '+ftFmt(extrasPlus(p)):''}${extrasMinus(p)?' − kedvezmény '+ftFmt(extrasMinus(p)):''}`;
const projTotal=p=>num(p&&p.projectValue)+extrasSum(p);
const exTotTxt=p=>`Végső érték: <b>${ftFmt(projTotal(p))}</b> <span class="muted">(${exBreak(p)})</span>`;
function extrasHtml(p){const l=extrasOf(p);
  return `<div class="extras" id="proj-extras"><div class="ex-h"><b>➕ Extrák és kedvezmények</b> <span class="muted">– a szerződött összegen felül / levonva, nettó; a végszámlára külön tételként kerülnek</span></div>
    ${l.map((x,i)=>{const le=exSign(x)<0;return `<div class="ex-row${le?' ex-minus':''}"><input class="inp" data-extra-name="${i}" value="${esc(x.name||'')}" placeholder="${le?'pl. jutalék – kiállítói shortok':'pl. +1 riport videó'}" maxlength="200" aria-label="${le?'Kedvezmény / jutalék':'Extra szolgáltatás'} megnevezése"><div class="money"><span class="ex-sign">${le?'−':'+'}</span><input class="inp money-inp" data-extra-amt="${i}" data-money="big" inputmode="numeric" value="${esc(moneyFmt(x.amount||''))}" placeholder="0" aria-label="Nettó összeg"><span class="money-unit">Ft</span></div><button class="trash" type="button" data-action="extra-del" data-i="${i}" aria-label="Törlés">🗑️</button></div>`;}).join('')}
    <div class="ex-foot"><button class="linkbtn" type="button" data-action="extra-add">+ Extra szolgáltatás</button><button class="linkbtn ex-minus-btn" type="button" data-action="extra-add" data-le="1">− Kedvezmény / jutalék</button>${l.length?`<span class="ex-tot" id="ex-total">${exTotTxt(p)}</span>`:''}</div></div>`;}
const isFree=p=>!!p&&p.projectValue!=null&&p.projectValue!==''&&num(p.projectValue)===0;
function budgetFt(p){
  if(!isAdmin())return p.budgetFt==null?null:num(p.budgetFt);
  const v=p.budgetVal;if(v===''||v==null||!p.budgetMode)return null;
  if(p.budgetMode==='pct'){if(p.projectValue==null||p.projectValue==='')return null;return Math.round(num(p.projectValue)*num(v)/100);}   // 0 Ft-os projektnél a keret is 0
  return num(v);
}
const pctFmt=x=>(Math.round(x*10)/10).toLocaleString('hu-HU')+'%';
function finPanelBody(p){
  const adm=isAdmin(),val=num(p.projectValue),k=budgetFt(p);
  const pctV=p.budgetMode==='pct'?(p.budgetVal===''||p.budgetVal==null?'':String(p.budgetVal).replace('.',',')):(k!=null&&val>0?String(Math.round(k/val*1000)/10).replace('.',','):'');
  const ftV=k!=null?moneyFmt(k):'';
  return `<div class="fin-sum">
      ${adm?`<div class="fin-inputs"><div class="field fin-val${p.projectValue==null||p.projectValue===''?' missing req':''}"><label for="f-projectValue">Büdzsé – szerződött érték (nettó)</label><div class="money"><input class="inp money-inp" id="f-projectValue" type="text" data-money="big" data-fin="projectValue" inputmode="numeric" autocomplete="off" value="${isFree(p)?'':esc(moneyFmt(p.projectValue))}" placeholder="${isFree(p)?'Nem fizetős projekt':'pl. 969 000'}"${isFree(p)?' disabled':''}><span class="money-unit">Ft</span></div><label class="free-chk"><input type="checkbox" data-free="1"${isFree(p)?' checked':''}${D()}> 🎁 Nem fizetős projekt</label></div>
        <div class="field fin-eff"><label for="f-budgetPct">Hatékonyság</label>
          <div class="money"><input class="inp money-inp" id="f-budgetPct" type="text" data-fin="budgetPct" inputmode="decimal" autocomplete="off" value="${esc(pctV)}" placeholder="pl. 40" aria-label="Keret a projekt értékének százalékában"><span class="money-unit">%</span></div></div>
        <div class="field fin-budget${budgetFt(p)==null&&!isFree(p)?' missing req':''}"><label for="f-budgetFt">Termelői keret</label>
          <div class="money"><input class="inp money-inp" id="f-budgetFt" type="text" data-money="big" data-fin="budgetFt" inputmode="numeric" autocomplete="off" value="${esc(ftV)}" placeholder="pl. 400 000" aria-label="Keret forintban"><span class="money-unit">Ft</span></div></div></div>${isFree(p)?'':extrasHtml(p)}`:''}
    </div>`;
}
/* Oszlopszélességek: a fejléc szélén húzva állíthatók, böngészőnként megjegyezzük. */
const FIN_COLS_DEF=[52,250,220,170,250,150];
function finCols(){let w=null;try{w=JSON.parse(localStorage.getItem('lpm_fin_cols5')||'null');}catch(e){}return Array.isArray(w)&&w.length===FIN_COLS_DEF.length?w:FIN_COLS_DEF.slice();}
/* Termelői keret és maradék a táblázat „Összesen” sora alatt, a Díj oszlopban (mint az Excelben). */
function keretRows(p){
  const k=budgetFt(p),sum=feeSum(p),left=k==null?null:k-sum,val=num(p.projectValue);
  const pct=isAdmin()&&k!=null?(p.budgetMode==='pct'?pctFmt(num(p.budgetVal)):val>0?pctFmt(k/val*100):''):'';
  return `<tr class="keret-tr${left==null?'':left<0?' left-over':' left-ok'}"><td></td><td></td><td class="r tf-lbl fin-left-lbl">${left!=null&&left<0?'Keret túllépése':'Maradt a keretből'}</td><td class="r fin-left ${left==null?'':left<0?'bad-txt':'ok-txt'}">${left==null?'':Math.round(left)===0?'<b class="perfekt">Pontos 🎯</b>':(left<0?'−':'')+(moneyFmt(Math.abs(left))||0)}</td><td colspan="2"></td></tr>
        <tr class="keret-tr"><td></td><td></td><td class="r tf-lbl">Termelői keret</td><td class="r fin-keret-v">${k!=null?moneyFmt(k)+(pct?` <span class="muted">(${pct})</span>`:''):''}</td><td colspan="2"></td></tr>`;
}
function totalCell(p){const amt=feeSum(p),val=num(p.projectValue);return (moneyFmt(amt)||0)+(isAdmin()&&val>0?` <span class="muted">(${pctFmt(feeSum(p)/val*100)})</span>`:'');}
function finSumHtml(p){
  const sum=feeSum(p),val=projTotal(p),margin=val-sum,adm=isAdmin();
  const pct=x=>val>0?pctFmt(x/val*100):'–';
  return `${adm?`<div class="kv"><span>Fedezet</span><b class="${val>0&&margin<0?'bad-txt':''}">${val>0?ftFmt(margin)+' · '+pct(margin):'–'}</b></div>
      <div class="kv"><span>Tényleges költséghányad</span><b>${pct(sum)}</b></div>`:''}`;
}
function finAside(p){
  const sum=feeSum(p),val=num(p.projectValue),k=budgetFt(p),parts=[];
  if(sum)parts.push('díjak '+ftFmt(sum));
  if(k!=null)parts.push((sum>k?'⚠️ keret ':'keret ')+ftFmt(k));
  return parts.join(' · ')||'nincs kitöltve';
}
/* Pénzügyek: lenyíló táblázat (ügyvezető: érték, díjak, keret, fedezet; termelési vezető: díjak és keret Ft-ban). */
function financePanel(p,inner){
  if(!canSeeFees())return '';
  const cols=finCols(),th=(t,i,cls)=>`<th${cls?` class="${cls}"`:''}>${t}${i<cols.length-1?`<span class="col-grip" data-col="${i}" title="Húzd az oszlop szélességéhez (dupla kattintás: alaphelyzet)"></span>`:''}</th>`;
  const fees=p.fees||[],adm=isAdmin();
  const tin=(i,k,v,ph,o={})=>`<input class="cell-in${o.money?' num':''}" type="text" id="fee-${i}-${esc(k)}" data-fee-i="${i}" data-fee-k="${k}"${o.money?' data-money="1" inputmode="numeric"':''}${o.list?` list="${o.list}"`:''} autocomplete="off" value="${o.money?(num(v)?esc(moneyFmt(v)):''):esc(v||'')}" placeholder="${ph}" aria-label="${ph}">`;
  const ro_=t=>`<div class="cell-ro">${t}</div>`;
  const gearOf=f=>f.crewId?(p.equipment||[]).filter(e=>e.crewId===f.crewId).map(e=>{const it=itemById(e.itemId);return it?(num(e.qty)>1?num(e.qty)+'× ':'')+it.name:'';}).filter(Boolean).concat(rentalsOf(p,f.crewId).map(r=>r.name+(r.own?' (saját)':' (bérelt)'))).join(', '):'';
  const nameCell=(f,i)=>{const fixed=f.kind==='fixed';return fixed&&/^egyeb/.test(f.key||'')?tin(i,'name',f.name,'Egyéb tétel neve'):!f.crewId&&!fixed?`<div class="cell-ro cell-flex"><span>${esc(f.name||'')}</span><button class="trash" type="button" data-action="fee-remove" data-i="${i}" title="Sor törlése" aria-label="Sor törlése">🗑️</button></div>`:f.crewId&&!fixed?`<div class="cell-ro cell-flex"><span>${esc(f.name||'')}</span><span class="cell-acts"><button class="pen-btn" type="button" data-action="pen-new" data-cid="${esc(f.crewId)}" title="Díjcsökkentés" aria-label="Díjcsökkentés: ${esc(f.name||'')}">🚨</button><button class="trash" type="button" data-action="crew-person-remove" data-id="${esc(f.crewId)}" title="Levétel a projektről (a stábból is)" aria-label="${esc(f.name||'')} levétele a projektről">🗑️</button></span></div>`:ro_(esc(f.name||''));};
  const rentCell=(f,i)=>f.kind==='fixed'?ro_(''):f.crewId&&rentalsOf(p,f.crewId).some(r=>!r.own)?ro_(`<span class="num-ro" title="A stábkártyán felvett bérelt eszközökből">${moneyFmt(rentalSum(p,f.crewId))}</span>`):tin(i,'rent',f.rent,'0',{money:1});
  const commonRow=()=>rentalsOf(p,'').length?`<tr class="fixed-row"><td class="n"></td><td><div class="cell-ro">Közös eszközök</div></td><td><div class="cell-ro">${esc(rentalsOf(p,'').map(r=>r.name).join(', '))}</div></td><td><div class="cell-ro"></div></td><td></td><td><div class="cell-ro"><span class="num-ro">${moneyFmt(rentalSum(p,''))}</span></div></td></tr>`:'';
  const nf=fees.filter(x=>x.kind!=='fixed').length,days=projDays(p);
  const head=`<colgroup>${cols.map(w=>`<col style="width:${w}px">`).join('')}</colgroup><thead><tr>${th('#',0,'n')}${th('Szakember',1)}${th('Termelői feladat',2)}${th('Díj (Ft)',3,'r')}${th('Eszköz neve',4)}${th('Eszközbérlés (Ft)',5,'r')}</tr></thead>`;
  const tbl=(body,foot,cls,noHead)=>`<div class="sheet-wrap${cls?' '+cls:''}"><table class="sheet fin-sheet" style="width:${cols.reduce((x,y)=>x+y,0)}px;min-width:100%">${noHead?`<colgroup>${cols.map(w=>`<col style="width:${w}px">`).join('')}</colgroup>`:head}<tbody>${body}</tbody>${foot||''}</table></div>`;
  const sumTbl=()=>`<div class="day-tbl-h">Összesítés</div>`+tbl('',foot,'sum-sheet',true);
  const foot=`<tfoot><tr><td></td><td></td><td class="r tf-lbl">Összesen</td><td class="r fin-amt">${totalCell(p)}</td><td></td><td class="r fin-rent">${moneyFmt(fees.reduce((s,f)=>s+rentOf(p,f),0)+rentalSum(p,''))||0}</td></tr>${keretRows(p)}</tfoot>`;
  const postRows=fees.map((f,i)=>({f,i})).filter(x=>x.f.kind!=='fixed'&&isPostOnly(p,x.f.crewId));
  const hasCutter=(p.crew||[]).some(a=>a.role==='Vágó');   // a vágó a helyszíni stábban is lehet (pl. operatőr + vágó) – ilyenkor a díja a napi táblázatban van
  const postTbl=()=>!postRows.length&&hasVideoPost(p)&&!hasCutter?`<div class="day-tbl-h">✂️ Utómunka</div>`+tbl(`<tr><td colspan="6" class="empty-row">Van megrendelt utómunka, de még nincs vágó beosztva – a stábnál a Beosztásban válaszd a „Vágó” szerepet.</td></tr>`,'','day-sheet'):postRows.length?`<div class="day-tbl-h">✂️ Utómunka</div>`+tbl(postRows.map((x,n)=>`<tr><td class="n">${n+1}</td><td>${nameCell(x.f,x.i)}</td><td>${ro_(esc(x.f.task||''))}</td><td>${tin(x.i,'amount',x.f.amount,'0',{money:1})}${penCellNote(p,x.f)}</td><td>${ro_(esc(gearOf(x.f)||''))}</td><td>${rentCell(x.f,x.i)}</td></tr>`).join(''),`<tfoot><tr class="day-sub"><td></td><td></td><td class="r tf-lbl">Utómunka összesen</td><td class="r" data-post-sum="1">${moneyFmt(postRows.reduce((s,x)=>s+num(x.f.amount)-penDeduct(p,x.f.crewId,x.f.amount),0))||0}</td><td colspan="2"></td></tr></tfoot>`,'day-sheet'):'';
  let tables='';
  if(days.length){   // több napos projekt: minden napnak saját táblázata, a végén az egyéb költségek és az összesítő
    const crewF=fees.map((f,i)=>({f,i})).filter(x=>x.f.kind!=='fixed'&&!isPostOnly(p,x.f.crewId));
    tables=days.map((dd,k)=>{const on=crewF.filter(x=>!x.f.crewId?k===0:crewDaysOf(p,x.f.crewId).includes(dd));
      const firstDay=x=>!x.f.crewId||crewDaysOf(p,x.f.crewId)[0]===dd;
      const daySum=daySumOf(p,dd);
      const body=on.map((x,n)=>`<tr><td class="n">${n+1}</td><td>${nameCell(x.f,x.i)}</td><td>${ro_(esc(x.f.task||(x.f.roles||[]).join(' + ')||''))}</td><td>${x.f.crewId?tin(x.i,'day:'+dd,(x.f.dayAmounts||{})[dd],'0',{money:1}):tin(x.i,'amount',x.f.amount,'0',{money:1})}${x.f.crewId?penCellNote(p,x.f,dd,firstDay(x)):''}</td><td>${ro_(esc(gearOf(x.f)||x.f.gear||''))}</td><td>${firstDay(x)?rentCell(x.f,x.i):ro_('')}</td></tr>`).join('')||`<tr><td colspan="6" class="empty-row">Erre a napra még nincs beosztva senki.</td></tr>`;
      return `<div class="day-tbl-h">${k+1}. nap – ${esc(dayLbl(dd))}</div>`+tbl(body,`<tfoot><tr class="day-sub"><td></td><td></td><td class="r tf-lbl">Napi összesen<small class="muted tf-sub">díjcsökkentés után</small></td><td class="r" data-day-sum="${dd}">${moneyFmt(daySum)||0}</td><td colspan="2"></td></tr></tfoot>`,'day-sheet');}).join('');
    const fixedRows=fees.map((f,i)=>({f,i})).filter(x=>x.f.kind==='fixed').map(x=>`<tr class="fixed-row"><td class="n"></td><td>${nameCell(x.f,x.i)}</td><td>${ro_('')}</td><td>${tin(x.i,'amount',x.f.amount,'0',{money:1})}</td><td>${ro_('')}</td><td>${ro_('')}</td></tr>`).join('');
    tables+=`<div class="day-tbl-h">Egyéb költségek</div>`+tbl(commonRow()+fixedRows,`<tfoot><tr class="day-sub"><td></td><td></td><td class="r tf-lbl">Egyéb költségek összesen</td><td class="r" data-other-sum="1">${moneyFmt(otherSumOf(p))||0}</td><td colspan="2"></td></tr></tfoot>`,'day-sheet')+postTbl()+sumTbl();
  }else{
    if(true){const field=fees.map((f,i)=>({f,i})).filter(x=>x.f.kind!=='fixed'&&!isPostOnly(p,x.f.crewId));
      const fr=field.map((x,n)=>`<tr data-fee-row="${x.i}"><td class="n"><div class="mv-cell"><span>${n+1}</span>${field.length>1&&!ro()?`<span class="drag-h" data-drag-fee="${x.i}" title="Húzd a sorrend módosításához" aria-label="Sor áthelyezése">⠿</span>`:''}</div></td><td>${nameCell(x.f,x.i)}</td><td>${ro_(esc(x.f.task||(x.f.roles||[]).join(' + ')||''))}</td><td>${tin(x.i,'amount',x.f.amount,'0',{money:1})}${x.f.crewId?penCellNote(p,x.f):''}</td><td>${ro_(esc(gearOf(x.f)||x.f.gear||''))}</td><td>${rentCell(x.f,x.i)}</td></tr>`).join('')||`<tr><td colspan="6" class="empty-row">Ha beosztasz valakit a stábba, automatikusan bekerül ide.</td></tr>`;
      const fixedRows=fees.map((f,i)=>({f,i})).filter(x=>x.f.kind==='fixed').map(x=>`<tr class="fixed-row"><td class="n"></td><td>${nameCell(x.f,x.i)}</td><td>${ro_('')}</td><td>${tin(x.i,'amount',x.f.amount,'0',{money:1})}</td><td>${ro_('')}</td><td>${ro_('')}</td></tr>`).join('');
      tables=`<div class="day-tbl-h">📍 Helyszíni stáb</div>`+tbl(fr,field.length?`<tfoot><tr class="day-sub"><td></td><td></td><td class="r tf-lbl">Helyszíni stáb összesen</td><td class="r" data-field-sum="1">${moneyFmt(fieldSumOf(p))||0}</td><td colspan="2"></td></tr></tfoot>`:'','day-sheet')+`<div class="day-tbl-h">Egyéb költségek</div>`+tbl(commonRow()+fixedRows,`<tfoot><tr class="day-sub"><td></td><td></td><td class="r tf-lbl">Egyéb költségek összesen</td><td class="r" data-other-sum="1">${moneyFmt(otherSumOf(p))||0}</td><td colspan="2"></td></tr></tfoot>`,'day-sheet')+postTbl()+sumTbl();
    }else{
    const rows=fees.map((f,i)=>{const fixed=f.kind==='fixed';
      const sep=fixed&&(i===0||fees[i-1].kind!=='fixed')?`<tr class="sep-row"><td colspan="6">Egyéb költségek</td></tr>${commonRow()}`:'';
      return sep+`<tr class="${fixed?'fixed-row':''}"${fixed?'':` data-fee-row="${i}"`}><td class="n">${fixed?'':`<div class="mv-cell"><span>${i+1}</span>${nf>1&&!ro()?`<span class="drag-h" data-drag-fee="${i}" title="Húzd a sorrend módosításához" aria-label="Sor áthelyezése">⠿</span>`:''}</div>`}</td><td>${nameCell(f,i)}</td><td>${ro_(fixed?'':esc(f.task||(f.roles||[]).join(' + ')||''))}</td><td>${tin(i,'amount',f.amount,'0',{money:1})}${f.crewId?penCellNote(p,f):''}</td><td>${ro_(fixed?'':esc(gearOf(f)||f.gear||''))}</td><td>${rentCell(f,i)}</td></tr>`;}).join('');
    tables=tbl(rows||`<tr><td colspan="6" class="empty-row">Ha beosztasz valakit a stábba, automatikusan bekerül ide.</td></tr>`,foot);
    }
  }
  return `<div class="${inner?'fin-inline fin':'panel fin'}">
    <p class="hint" style="margin:10px 0 8px">🔒 ${adm?'A projekt értékét és a százalékokat csak te látod. A termelési vezető a termelői díjakat és a keretet forintban látja, a szakemberek semmit.':'A szakemberek az alábbi táblázatot nem látják.'} Minden összeg nettó, ÁFA nélkül.</p>
    <datalist id="fee-names">${S.crew.slice().sort((a,b)=>a.name.localeCompare(b.name,'hu')).map(c=>`<option value="${esc(c.name)}">`).join('')}</datalist>
    ${finPanelBody(p)}
    ${budgetRequestPanel(p)}
    ${tables}
    ${penPanel(p)}
  </div>`;
}
function myFeePanel(p){
  const cid=S.me&&S.me.crewId,a=num(p.myFee.amount),pens=(p.penalties||[]).filter(x=>x.crewId===cid);
  if(!pens.length)return `<div class="panel my-fee-panel"><h3>💰 Díjad ezen a projekten</h3><div class="my-fee-amt">${ftFmt(a)}</div></div>`;
  const d=penDeduct(p,cid,a),dmg=penDamage(p,cid);
  return `<div class="panel my-fee-panel"><h3>💰 Díjad ezen a projekten</h3>
    <div class="kv"><span>Eredeti díj</span><b>${ftFmt(a)}</b></div>${d?`<div class="kv"><span>Díjcsökkentés${pens.some(x=>x.day)?'':` (${penPct(p,cid)}%)`}</span><b class="bad-txt">−${ftFmt(d)}</b></div>`:''}
    <div class="kv"><span>Kifizetendő</span><b class="my-fee-amt">${ftFmt(a-d)}</b></div>${dmg?`<div class="kv"><span>Kártérítési követelés</span><b class="bad-txt">${ftFmt(dmg)}</b></div>`:''}
    ${pens.map(x=>{const k=PEN_KINDS[x.kind]||{};return `<div class="pen-row approved"><div class="pen-main"><b>${esc(k.label||'')}</b>${x.kind==='damage'?' · '+ftFmt(x.amount):' · '+num(x.pct)+'%'+(x.day?' a '+esc(dayLbl(x.day))+' napi díjból':'')} <span class="muted">(szerződés ${esc(k.ref||'')} pont)</span>
      ${x.caseText?`<div class="pen-case">${esc(x.caseText)}</div>`:''}<div class="pen-reason">${esc(x.reason)}</div>${x.link?`<a class="linkbtn" href="${esc(x.link)}" target="_blank" rel="noopener">Bizonyíték ↗</a>`:''}
      ${x.objection?`<div class="pen-obj"><b>Kifogásod</b> (${esc(x.objection.at)}): ${esc(x.objection.text)}</div>`:`<button class="btn outline small" type="button" data-action="pen-object" data-pid="${esc(p.id)}" data-id="${esc(x.id)}" style="margin-top:8px">Kifogásolom</button>`}</div></div>`;}).join('')}</div>`;
}
function penCellNote(p,f,dd,first){   // dd: napi táblázat (több napos projekt) – a napra szabott levonás ott jelenik meg
  const all=penOf(p,f.crewId,'approved').filter(x=>x.kind!=='damage'),pend=penOf(p,f.crewId,'pending').length,dmg=penDamage(p,f.crewId),tot=num(f.amount);
  const line=(arr,base,pre)=>{if(!arr.length)return '';const pc=Math.min(100,arr.reduce((s,x)=>s+num(x.pct),0)),d=Math.min(base,Math.round(base*pc/100));return `<span class="bad-txt">${pre||''}−${moneyFmt(d)||0} (${pc}%) → ${moneyFmt(base-d)||0}</span>`;};
  let h='';
  if(dd){h=line(all.filter(x=>x.day===dd),num((f.dayAmounts||{})[dd]))+(first?line(all.filter(x=>!x.day),tot,'teljes díjból: '):'');if(!first)return h?`<div class="pen-sub">${h}</div>`:'';}
  else if(all.some(x=>x.day)){const d=penDeduct(p,f.crewId,tot);h=d?`<span class="bad-txt">−${moneyFmt(d)} → ${moneyFmt(tot-d)||0}</span>`:'';}
  else h=line(all,tot);
  if(!h&&!pend&&!dmg)return '';
  return `<div class="pen-sub">${h}${dmg?`<span class="bad-txt">kártérítés: ${moneyFmt(dmg)}</span>`:''}${pend?`<span class="warn-txt">${pend} jóváhagyásra vár</span>`:''}</div>`;
}
/* Díjcsökkentések listája a pénzügyi panel alján (vezetőknek) */
/* Ügyvezető: a levonás áthelyezhető másik napra (több napos projektnél). */
function penDaySelect(p,x){
  if(x.kind==='damage'||!(S.capabilities&&S.capabilities.penaltyDay)||projDays(p).length<2||isPostOnly(p,x.crewId))return '';
  const days=crewDaysOf(p,x.crewId);if(days.length<2&&!x.day)return '';
  return `<select class="inp pen-day" data-pen-day="${esc(x.id)}" aria-label="Melyik napi díjból" title="Melyik napi díjból vonjuk le">${days.map(d=>`<option value="${d}"${x.day===d?' selected':''}>${esc(dayLbl(d))}</option>`).join('')}<option value=""${x.day?'':' selected'}>Teljes díj</option></select>`;
}
function penPanel(p){
  const list=(p.penalties||[]).slice().sort((a,b)=>String(b.at).localeCompare(String(a.at)));if(!list.length)return '';
  return `<div class="pen-panel"><h4 class="sub-h">🚨 Díjcsökkentések</h4>${list.map(x=>{const k=PEN_KINDS[x.kind]||{},c=crewById(x.crewId),amt=penAmt(p,x);
    const pill=x.status==='approved'?'<span class="statuspill p-bad">Jóváhagyva</span>':x.status==='rejected'?'<span class="statuspill">Elutasítva</span>':'<span class="statuspill p-warn">Jóváhagyásra vár</span>';
    return `<div class="pen-row ${x.status}"><div class="pen-main"><b>${esc(c?c.name:'Munkatárs')}</b> · ${esc(k.label||'')}${x.kind==='damage'?'':` <b>${num(x.pct)}%</b>`}${x.day?' · '+esc(dayLbl(x.day))+' napi díjából':''} · ${x.kind==='damage'?'kártérítés':'levonás'}: <b>${ftFmt(amt)}</b> ${pill}
      ${x.caseText?`<div class="pen-case">${esc(x.caseText)}</div>`:''}<div class="pen-reason">${esc(x.reason)}</div>
      ${x.link?`<a class="linkbtn" href="${esc(x.link)}" target="_blank" rel="noopener">Bizonyíték ↗</a>`:''}
      <div class="ser">Kirótta: ${esc(x.by)} · ${esc(x.at)}${x.decidedAt&&x.status!=='pending'?` · ${x.status==='approved'?'jóváhagyta':'elutasította'}: ${esc(x.decidedBy)}${x.decisionNote?' – '+esc(x.decisionNote):''}`:''}</div>
      ${x.objection?`<div class="pen-obj"><b>Kifogás</b> (${esc(x.objection.at)}): ${esc(x.objection.text)}</div>`:''}</div>
      ${isAdmin()?`<div class="pen-act">${x.status==='pending'?`<button class="btn primary small" type="button" data-action="pen-approve" data-id="${esc(x.id)}">Jóváhagyás</button><button class="btn outline small" type="button" data-action="pen-reject" data-id="${esc(x.id)}">Elutasítás</button>`:''}${penDaySelect(p,x)}<button class="trash" type="button" data-action="pen-del" data-id="${esc(x.id)}" title="Törlés" aria-label="Törlés">🗑️</button></div>`:''}</div>`;}).join('')}</div>`;
}
/* Csapat véglegesítése doboz a stáb alatt */
function crewFinalBox(p,ids){
  if(!ids.length)return '';
  const st=crewFinalState(p),f=p.crewFinal,on=crewFinalOn();
  const msg=st==='ok'?`<b>✅ Csapat véglegesítve</b><small>${esc(f.at||'')}${f.by?' · '+esc(f.by):''} · a tagok a naptárban vannak${S.mailOn===false?' · <span class="warn-txt">⏸ az e-mail értesítések szünetelnek (Beállítások), ezért e-mailt és meghívót nem kaptak</span>':', értesítést kaptak'}</small>`
    :st==='changed'?`<b>⚠️ A csapat módosult a véglegesítés óta</b><small>Véglegesítsd újra, hogy a naptár és az értesítések az új csapatot kövessék.</small>`
    :`<b>⚠️ A csapat még nincs véglegesítve</b><small>A tagok csak véglegesítéskor kerülnek a naptárba, és csak akkor kapnak e-mailt és naptárértesítést. A helyszíni munkára lépéshez kötelező.</small>`;
  return `<div class="crew-final ${st}" id="crew-final">${st==='ok'?'':`<button class="btn ${st==='none'?'primary':'outline'} small" type="button" data-action="crew-finalize"${on?'':' disabled'}>${st==='changed'?'🔁 Csapat újra véglegesítése':'✅ Csapat véglegesítése'}</button>`}<div class="cf-msg">${msg}${on?'':'<small>A háttérkód frissítése után kapcsol be.</small>'}</div></div>`;
}
function crewEquipPanel(p,st,c,sortedCrew,leadOpts,leadBusy,personOpts,selRole,inner){
  const opts=itemOptions(p);
  const ids=[];if(p.lead)ids.push(p.lead);(p.crew||[]).forEach(a=>{if(!ids.includes(a.crewId))ids.push(a.crewId);});
  const PD=projDays(p),selDay=PD.includes(S.crewDay)?S.crewDay:'',shownIds=selDay?ids.filter(id=>isPostOnly(p,id)||crewDaysOf(p,id).includes(selDay)):ids;   // utómunkás (pl. vágó) nem napokhoz kötött: minden napnál látszik   // több napos: napokra bontott stáb
  const dayTabs=PD.length?`<div class="day-tabs" role="tablist" aria-label="Stáb napok szerint"><button type="button" class="day-tab${selDay?'':' on'}" data-action="crew-day-tab" data-d="" role="tab" aria-selected="${!selDay}">Minden nap <span class="c">${ids.length}</span></button>${PD.map((dd,k)=>{const n=ids.filter(id=>!isPostOnly(p,id)&&crewDaysOf(p,id).includes(dd)).length;return `<button type="button" class="day-tab${selDay===dd?' on':''}" data-action="crew-day-tab" data-d="${dd}" role="tab" aria-selected="${selDay===dd}">${k+1}. nap · ${esc(dayLbl(dd))} <span class="c">${n}</span></button>`;}).join('')}</div>${selDay&&!ro()?`<p class="hint" style="margin:6px 0 0">A ${PD.indexOf(selDay)+1}. napra beosztott stáb. Akit most veszel fel, csak erre a napra kerül.</p>`:''}`:'';
  const cards=shownIds.map(cid=>{const cr=crewById(cid),busy=busyFor(cid,p),tight=tightFor(cid,p);
    const roles=(p.crew||[]).map((a,i)=>({a,i})).filter(x=>x.a.crewId===cid);
    const roleHtml=roles.map(({a,i})=>`<span class="role-sel"><select class="inp" data-crew-role="${i}" aria-label="Szerep"${D()}>${CREW_ROLES.filter(r=>r!=='Projektvezető').map(rl=>`<option value="${esc(rl)}"${rl===a.role?' selected':''}>${esc(rl)}${rl==='Vágó'&&p.editOnsite?' · 📍 Helyszíni':''}</option>`).join('')}</select><button class="x w" type="button" data-action="crew-remove" data-i="${i}" aria-label="Szerep eltávolítása" title="Levétel a projektről ebben a szerepben">×</button></span>${a.role==='Vágó'&&!ro()?`<label class="remote-chk" data-tip="A vágó alapból otthonról dolgozik, ezért nem ütközik más munkával. Pipáld be, ha a helyszínen vág."><input type="checkbox" data-edit-onsite="1"${p.editOnsite?' checked':''}${projLocked()?' disabled':''}> 📍 Helyszíni vágó</label>`:''}`).join('');
    const free=(p.lead===cid?[]:['Projektvezető']).concat(CREW_ROLES.filter(r=>r!=='Projektvezető'&&!roles.some(x=>x.a.role===r)));
    const addRole=ro()||!free.length?'':`<span class="role-sel role-add"><select class="inp" data-crew-addrole="${esc(cid)}" aria-label="Extra szerep hozzáadása"><option value="">+ Szerep</option>${free.map(rl=>`<option>${esc(rl)}</option>`).join('')}</select></span>`;
    const rows=eqRowsFor(p,cid),leadOnly=p.lead===cid&&!roles.length,note=(p.crewNotes||{})[cid]||'';
    const first=cr?String(cr.name).split(' ').slice(-1)[0]:'';
    const rentHtml=rentalsOf(p,cid).map(r=>`<div class="eqrow rent"><div class="who"><b>${esc(r.name)}</b><small>${r.own?'Saját eszköz':'Bérelt'}${r.company?' · '+esc(r.company):''}${canSeeFees()&&num(r.price)?' · '+ftFmt(r.price):''}</small></div>${ro()?'':`<button class="trash" type="button" data-action="rent-remove" data-id="${esc(r.id)}" aria-label="Bérelt eszköz törlése">🗑️</button>`}</div>`).join('');
    const eqBlock=`<div class="pcrew-eq">${rows||rentHtml||leadOnly?'':'<p class="hint" style="margin:2px 0 0">Még nincs nála eszköz.</p>'}${rows}${rentHtml}${eqAddRow(p,cid,opts)}</div>`;
    const noteBlock=ro()?(note?`<div class="pcrew-note-ro"><b>Neked szóló jegyzet:</b> ${esc(note)}</div>`:''):`<textarea class="inp pcrew-note" data-crew-note="${esc(cid)}" rows="2" placeholder="Személyes jegyzet ${esc(first)} számára – az eszközlistás levélbe is bekerül">${esc(note)}</textarea>`;
    return `<div class="pcrew${p.lead===cid?' is-lead':''}">${p.lead===cid?`<span class="lead-badge">★ Projektvezető${p.leadRemote?' · 🛰️ Remote':''}</span>`:''}<div class="pcrew-top">${avatar(cr)}${ro()?'':`<button class="trash pcrew-del" type="button" data-action="crew-person-remove" data-id="${esc(cid)}" aria-label="Levétel a projektről" title="Levétel a projektről (minden szerepével)">🗑️</button>`}<div class="who"><b>${esc(cr?cr.name:'Törölt munkatárs')}</b>${busy.length?`<span class="bad-txt">Ütközik: ${busy.map(q=>`<button class="linkbtn bad-link" type="button" data-action="open-project" data-id="${esc(q.id)}" title="${esc(q.name||'')} megnyitása">${esc(q.name||'projekt')}</button>`).join(', ')}</span>`:cr&&cr.phone?`<small>${esc(cr.phone)}</small>`:''}</div></div>
      ${tight.map(g=>`<p class="tight-note${g.gap<TRAVEL_RED_MIN?' bad':''}">${g.gap<TRAVEL_RED_MIN?'⛔':'⏱️'} ${tightText(g)}</p>`).join('')}
      <div class="pcrew-roles">${p.lead===cid?`<span class="role-sel lead-role"><span class="inp role-fixed">★ Projektvezető${p.leadRemote?' · 🛰️ Remote':''}</span>${ro()||projLocked()?'':`<button class="x w" type="button" data-action="lead-remove" aria-label="Projektvezető szerep levétele" title="Projektvezető szerep levétele">×</button>`}</span>${ro()?'':`<label class="remote-chk" data-tip="A projektet távolról vezeti – nem kell a helyszínen lennie, ezért nem ütközik más munkával"><input type="checkbox" data-lead-remote="1"${p.leadRemote?' checked':''}${projLocked()?' disabled':''}> 🛰️ Remote</label>`}`:''}${roleHtml}${addRole}</div>
      ${projDays(p).length&&!isPostOnly(p,cid)?`<div class="pcrew-days" aria-label="Munkanapok">${projDays(p).map(dd=>{const on=crewDaysOf(p,cid).includes(dd);return ro()?(on?`<span class="day-chip on">${esc(dayLbl(dd))}</span>`:''):`<button type="button" class="day-chip${on?' on':''}" data-action="crew-day" data-cid="${esc(cid)}" data-d="${dd}" aria-pressed="${on}" title="${on?'Dolgozik ezen a napon – kattints, ha mégsem':'Nem dolgozik ezen a napon'}">${esc(dayLbl(dd))}</button>`;}).join('')}</div>`:''}
      ${cutTasksBlock(p,cid)}${eqBlock}${noteBlock}</div>`;}).join('');
  const commonRows=eqRowsFor(p,'')+(p.equipment||[]).map((e,i)=>({e,i})).filter(x=>x.e.crewId&&!ids.includes(x.e.crewId)).map(({e,i})=>{const it=itemById(e.itemId);
    return `<div class="eqrow"><div class="who"><b>${esc(it?it.name:'Törölt eszköz')}</b><small>${esc((crewById(e.crewId)||{}).name||'')} – már nincs a projekten</small></div><input class="inp qty" type="number" min="1" inputmode="numeric" data-eq-i="${i}" value="${num(e.qty)}" aria-label="Darabszám"${D()}><button class="x w" type="button" data-action="eq-remove" data-i="${i}" aria-label="Eszköz eltávolítása">×</button></div>`;}).join('');
  const eqN=eqCount(p),hasEq=(p.equipment||[]).length;
  const aside=`${ids.length} fő · ${eqN} eszköz`;
  const body=`<div class="need">${st.map(s=>`<span class="statuspill ${s.have>=s.need?'p-ok':'p-warn'}" title="${s.have<s.need?'Kellene: '+s.need:''}">${esc(s.role)} ${s.have}</span>`).join('')}</div>
    <p class="hint">Munkatársanként rendeld hozzá, kinél milyen eszköz lesz.</p>
    ${!p.lead&&!ro()?`<p class="hint need-lead" style="margin:10px 0 0">⚠️ Még nincs projektvezető – a Beosztásnál válaszd a „Projektvezető” szerepet, vagy egy kártyán a „+ Szerep” listából.</p>`:''}
    ${leadBusy.length?`<p class="bad-txt" style="margin:6px 0 0">A projektvezető ütközik: ${esc(leadBusy.map(q=>q.name).join(', '))}</p>`:''}
    ${dayTabs}
    <div class="pcrew-list">${cards}${ro()||projLocked()?(cards?'':empty('Még nincs beosztva senki.')):`<div class="pcrew pcrew-add-card"><div class="pcrew-add-h"><span class="plus">+</span><span>Szakember hozzáadása${selDay?' erre a napra':''}</span></div>${ro()?'':S.crew.length?(()=>{const people=sortedCrew.slice().sort((x,y)=>prioNum(x)-prioNum(y)||x.name.localeCompare(y.name,'hu'));
      const on=new Set(ids),fit=people.filter(x=>(x.roles||[]).includes(selRole)),rest=people.filter(x=>!(x.roles||[]).includes(selRole));
      const opt=x=>{const busy=busyFor(x.id,p),already=selRole==='Projektvezető'?p.lead===x.id:(p.crew||[]).some(a=>a.crewId===x.id&&a.role===selRole)&&(!selDay||crewDaysOf(p,x.id).includes(selDay));return `<option value="${esc(x.id)}"${already?' disabled':''}>${prioNum(x)<9?'P'+prioNum(x)+' · ':''}${esc(x.name)}${already?' – már be van osztva':busy.length?' – foglalt':on.has(x.id)?' – már a projekten':''}</option>`;};
      return `<div class="addrow labeled add-in-card"><div class="field"><label for="add-crew-role">Beosztás</label><select class="inp" id="add-crew-role">${CREW_ROLES.map(rl=>`<option${rl===selRole?' selected':''}>${esc(rl)}</option>`).join('')}</select></div>
      <div class="field"><label for="add-crew-person">Munkatárs</label><select class="inp" id="add-crew-person"><option value="">Munkatárs kiválasztása…</option>${fit.length?`<optgroup label="${esc(selRole)}">${fit.map(opt).join('')}</optgroup>`:''}${rest.length?`<optgroup label="Egyéb munkatársak">${rest.map(opt).join('')}</optgroup>`:''}</select></div></div>`;})():`<p class="hint">Előbb vegyél fel munkatársakat a <button class="linkbtn" type="button" data-action="tab" data-tab="stab">Stáb</button> fülön.</p>`}</div>`}</div>
    ${commonRows||rentalsOf(p,'').length||(!ro()&&ids.length===0)?`<div class="pcrew pcrew-common"><div class="pcrew-top"><div class="who"><b>Közös eszközök</b><small>Még nincs felelőshöz rendelve</small></div></div><div class="pcrew-eq">${commonRows}${rentalsOf(p,'').map(r=>`<div class="eqrow rent"><div class="who"><b>${esc(r.name)}</b><small>${r.own?'Saját eszköz':'Bérelt'}${r.company?' · '+esc(r.company):''}${canSeeFees()&&num(r.price)?' · '+ftFmt(r.price):''}</small></div>${ro()?'':`<button class="trash" type="button" data-action="rent-remove" data-id="${esc(r.id)}" aria-label="Bérelt eszköz törlése">🗑️</button>`}</div>`).join('')}${eqAddRow(p,'',opts)}</div></div>`:''}
    ${!S.inventory.length&&!ro()?`<p class="hint">Eszközt a <button class="linkbtn" type="button" data-action="tab" data-tab="leltar">Leltár</button> fülön tudsz felvenni.</p>`:''}
    ${ro()?'':crewFinalBox(p,ids)}
    ${hasEq||ids.length?`<div class="btns" style="margin-top:12px">${ro()?'':`<button class="btn primary small" type="button" data-action="send-list">✉️ Eszközlista küldése</button>`}<button class="btn outline small" type="button" data-action="copy-pack">📋 Eszközlista másolása</button></div>`:''}
    ${p.listSentAt?`<p class="hint">Eszközlista kiküldve: ${esc(p.listSentAt)} · ${esc(p.listSentTo||'')}</p>`:''}`;
  if(inner)return {body,aside};
  return `<div class="panel"><h3>👥 Stáb és eszközök <span class="aside">${aside}</span></h3>${body}</div>`;
}
/* Szakember nézet: csak a kiválasztott (pipált / nem nulla) tételek látszanak, üres panel nem jelenik meg. */
function roList(items){return `<ul class="ro-list">${items.map(t=>`<li>${t}</li>`).join('')}</ul>`;}
function roTechPanel(p){
  const items=TECH.filter(t=>p[t.k]).map(t=>esc(t.label)),plan=String(p.techPlan||'').trim();
  if(!items.length&&!plan)return '';
  return `<div class="panel"><h3>💡 Hang-, fény- és vizuáltechnika</h3>${items.length?roList(items):''}${plan?`<div class="sec-lbl">Forgatási és technikai terv</div><div class="ro-text">${esc(plan)}</div>`:''}</div>`;
}
/* a projekten kért videós / átadandó szolgáltatások (Átadás ablak, vágó nézete) */
function deliverItems(p){
  const items=[];
  DELIVERABLES.forEach(it=>{const n=num(p[it.k]);if(n>0)items.push(`${esc(it.label)}: <b>${n}</b>`);});
  if(p.er_post&&!num(p.er_post_n))items.push('Termek előadásainak utómunkája: <b>1</b>');
  REC_COUNTS.filter(it=>it.k!=='er_rooms'&&num(p[it.k])>0).forEach(it=>items.push(`${esc(it.label)}: <b>${num(p[it.k])}</b>`));
  if(num(p.foto_db)>0)items.push(`Fotók utómunkája: <b>${num(p.foto_db)}</b> db`);
  ['x_dron','x_timelapse','x_pov','x_nyersVetel','x_nyersTarolas','x_rush'].forEach(k=>{const e=EXTRAS.find(x=>x.k===k);if(e&&p[k])items.push(esc(e.label));});
  return items;
}
function roContentPanel(p){
  // a szakember ezt a részt nem látja – kivéve a vágót, aki a kért vágnivaló anyagokat igen
  const me=S.me&&S.me.crewId,isEditor=me&&(p.crew||[]).some(a=>a.crewId===me&&a.role==='Vágó');
  if(!isEditor)return '';
  const mine=taskKeysOf(p,me),items=postTasks(p).filter(t=>mine.includes(t.k)).map(t=>`${esc(t.label)}: <b>${t.n}${t.k==='foto_db'?' db':''}</b>`);
  if(items.length&&p.x_rush)items.push('Villámgyors kézbesítés');
  const due=dueDate(p);
  return `<div class="panel content"><h3>✂️ Vágnivaló anyagok</h3>${items.length?roList(items):`<p class="hint" style="margin:0">${postTasks(p).length?'Ehhez a projekthez még nincs hozzád rendelt vágnivaló.':'Ehhez a projekthez nincs megrendelt vágnivaló anyag.'}</p>`}${due?`<p class="hint" style="margin:10px 0 0">Átadási határidő: <b>${esc(fmtDay(due))}</b></p>`:''}</div>`;

  const rooms=Math.max(1,num(p.er_rooms)||1),rec=[];
  REC_CAMS.forEach(c=>{if(p[c.k])rec.push(esc(c.label)+(camN(p,c.k)>1&&CAM_COUNTS.some(x=>x.flag===c.k)?' ×'+camN(p,c.k):''));});
  REC_LIVE.forEach(c=>{if(p[c.k])rec.push(esc(c.label));});
  if(p.er_post&&!num(p.er_post_n))rec.push('Termek előadásainak utómunkája: <b>1</b>');
  REC_COUNTS.filter(it=>it.k!=='er_rooms'&&num(p[it.k])>0).forEach(it=>rec.push(`${esc(it.label)}: <b>${num(p[it.k])}</b>`));
  if(rec.length&&rooms>1)rec.unshift(`Rögzített termek száma: <b>${rooms}</b>`);
  const krea=[];
  DELIVERABLES.forEach(it=>{const n=num(p[it.k]);if(n>0)krea.push(`${esc(it.label)}: <b>${n}</b>`);if(it.k==='aftermovie'&&fotoDb(p)>0)krea.push(`Fotók utómunkája: <b>${fotoDb(p)} db</b>`);});
  EXTRAS.filter(e=>e.k!=='x_foto'&&e.k!=='x_nyersTarolas'&&p[e.k]).forEach(e=>krea.push(esc(e.label)));
  const tech=TECH.filter(t=>p[t.k]).map(t=>esc(t.label)),plan=String(p.techPlan||'').trim();
  if(!rec.length&&!krea.length&&!tech.length&&!plan)return '';
  const techHtml=tech.length||plan?`<div class="tech-sec"><h4 class="sub-h">💡 Hang-, fény- és vizuáltechnika</h4>${tech.length?roList(tech):''}${plan?`<div class="sec-lbl">Forgatási és technikai terv</div><div class="ro-text">${esc(plan)}</div>`:''}</div>`:'';
  const col=(t,items)=>items.length?`<section class="content-col"><h4 class="sub-h">${t}</h4>${roList(items)}</section>`:'';
  return `<div class="panel content"><h3>📽️ Előadásrögzítés, kivetítés és kreatív tartalmak</h3>${rec.length||krea.length?`<div class="content-grid${rec.length&&krea.length?'':' single'}">${col('📽️ Előadásrögzítés és kivetítés',rec)}${col('🎬 Kreatív tartalmak',krea)}</div>`:''}${techHtml}</div>`;
}
/* Összesítő: mit rendelt az ügyfél (a tartalom-panel alján); az utómunkánál a felelős vágó is */
function orderSummary(p){
  const T=[],li=(t,n)=>`<li>${esc(t)}${n!=null?`: <b>${n}</b>`:''}</li>`;
  const cutNm=k=>{const cut=cutterIds(p);if(!cut.length)return '';const o=taskOwners(p,k);return o.length?` <span class="os-cut">✂️ ${esc(o.map(id=>(crewById(id)||{}).name||'?').join(', '))}</span>`:` <span class="os-cut none">✂️ nincs vágó kijelölve</span>`;};
  const grp=(t,items)=>{if(items.length)T.push(`<section class="os-g"><h5>${t}</h5><ul>${items.join('')}</ul></section>`);};
  const rooms=num(p.er_rooms),rec=[];if(rooms>0&&REC_CAMS.some(c=>c.k!=='er_creative'&&p[c.k]))rec.push(li('Rögzített termek',rooms));
  REC_CAMS.filter(c=>c.k!=='er_creative'&&p[c.k]).forEach(c=>rec.push(li(c.label+(camN(p,c.k)>1&&CAM_COUNTS.some(x=>x.flag===c.k)?' ×'+camN(p,c.k):''))));
  grp('🎙️ Előadásrögzítés',rec);
  const kr=[];if(p.er_creative)kr.push(li('Kreatív kamera'+(camN(p,'er_creative')>1?' ×'+camN(p,'er_creative'):'')));
  EXTRAS.filter(e=>!['x_foto','x_rush','x_nyersTarolas'].includes(e.k)&&p[e.k]).forEach(e=>kr.push(li(e.label)));
  grp('🎥 Kreatív videózás',kr);
  grp('🎤 Interjúk / imázsfilmek videózása',INT_FLAGS.filter(c=>p[c.k]).map(c=>li(c.label)));
  const fo=[];if(fotoN(p)>0)fo.push(li('Fotós a helyszínen',fotoN(p)));grp('📷 Fotózás',fo);
  grp('💡 Vizuál-, hang- és fénytechnika',TECH.filter(t=>p[t.k]).map(t=>li(t.label)).concat(REC_LIVE.filter(c=>p[c.k]).map(c=>li(c.label))));
  const post=postTasks(p).map(t=>`<li>${esc(t.label)}: <b>${t.n}${t.k==='foto_db'?' db':''}</b>${cutNm(t.k)}</li>`);
  if(p.x_rush)post.push(li('Villámgyors kézbesítés'));if(p.x_nyersTarolas)post.push(li('Nyersanyag tárolása 5 évig'));
  grp('🎬 Utómunka – átadandó anyagok',post);
  return `<div class="order-sum"><h4 class="sub-h">📋 Összesítő – amit az ügyfél rendelt</h4>${T.length?`<div class="os-grid">${T.join('')}</div>`:'<p class="hint" style="margin:0">Még nincs kiválasztva semmi.</p>'}</div>`;
}
/* Vágó kártyáján: mely munkákat készíti el */
function cutTasksBlock(p,cid){
  const tasks=postTasks(p);if(!(p.crew||[]).some(a=>a.crewId===cid&&a.role==='Vágó'))return '';
  if(!tasks.length)return `<div class="cut-tasks"><div class="ct-h">✂️ Elkészítendő munkák</div><p class="hint" style="margin:0">Még nincs megrendelt utómunka.</p></div>`;
  const mine=taskKeysOf(p,cid),implicit=!cutterIds(p).some(id=>Array.isArray(editTasksOf(p)[id]));
  if(ro())return mine.length?`<div class="cut-tasks"><div class="ct-h">✂️ Elkészítendő munkák</div><div class="ct-chips">${tasks.filter(t=>mine.includes(t.k)).map(t=>`<span class="day-chip ct-chip on">${esc(t.label)} · ${t.n}</span>`).join('')}</div></div>`:'';
  return `<div class="cut-tasks"><div class="ct-h">✂️ Elkészítendő munkák${implicit&&mine.length?' <span class="muted">· egy vágó: minden az övé</span>':''}</div><div class="ct-chips">${tasks.map(t=>{const on=mine.includes(t.k),oth=taskOwners(p,t.k).filter(x=>x!==cid);
    return `<button type="button" class="day-chip ct-chip${on?' on':''}" data-action="cut-task" data-cid="${esc(cid)}" data-k="${t.k}" aria-pressed="${on}"${projLocked()?' disabled':''} title="${on?'Ő készíti – kattints, ha mégsem':'Kattints, ha ő készíti'}${oth.length?' · már kijelölve: '+esc(oth.map(id=>(crewById(id)||{}).name||'').join(', ')):''}">${on?'✓ ':''}${esc(t.label)} · ${t.n}</button>`;}).join('')}</div></div>`;
}
function viewProject(p){
  const c=calc(p),st=staffing(p),iss=computeIssues().filter(i=>i.pids.includes(p.id));
  const r=pr(p),T=todayISO(),di=dueInfo(p);
  const status=p.status||'tervezes',curIdx=STAGES.findIndex(s=>s.id===status);
  // átadandó anyag nélkül nincs utómunka lépés (kivéve, ha a projekt épp abban az állapotban van)
  // a szakember (ha nem vágó) nem látja az utómunkát
  const isCut=!ro()||(p.crew||[]).some(a=>a.crewId===(S.me&&S.me.crewId)&&a.role==='Vágó');
  const stList=STAGES.map((s,i)=>({s,i})).filter(x=>{if(!POST_STAGES.includes(x.s.id))return true;if(x.s.id!=='utomunka'&&!videoStagesOn()&&status!==x.s.id)return false;return isCut&&(needsDelivery(p)||status===x.s.id);});
  const doneSet=new Set(String(p.stepsDone||'').split(',').filter(Boolean)),TICKS=['tervezes','helyszin','utomunka'];
  const closed=status==='atadva';   // lezárt projekt: a lépések nem módosíthatók
  const stages=stList.map(({s,i},k)=>{const tk=TICKS.includes(s.id),on=doneSet.has(s.id||'')||(closed&&tk);
    return `<div class="stage-w${tk?' has-tick':''}"><button type="button" class="stage${status==='lemondva'?'':i<curIdx?' done':i===curIdx?' cur':''}${on?' ticked':''}" data-action="stage" data-v="${s.id}" aria-pressed="${i===curIdx}"${closed?' disabled':D()}><span class="n">${k+1}. lépés</span><span class="t">${esc(stageLabel(p,s.id))}</span></button>${tk?(ro()||closed?(on?'<span class="stage-tick on" title="Megtörtént">✓</span>':''):`<button type="button" class="stage-tick${on?' on':''}" data-action="step-done" data-v="${s.id}" aria-pressed="${on}" title="${on?'Megtörtént – kattints a visszavonáshoz':'Jelöld, ha ez a lépés megtörtént'}" aria-label="${esc(stageLabel(p,s.id))}: megtörtént">✓</button>`):''}</div>`;}).join('');
  const dlRow=it=>{const n=num(p[it.k]);return `<div class="dl${n?' on':''}"><div><div class="dl-name">${it.label}</div></div>
    <div class="stepper"><button type="button" data-action="dlv" data-k="${it.k}" data-d="-1" aria-label="${it.label}: kevesebb"${n<=0||ro()?' disabled':''}>−</button><input class="step-in" type="text" inputmode="numeric" pattern="[0-9]*" data-step-k="${it.k}" data-min="0" data-max="${it.max}" aria-label="${it.label} (db)" value="${n}"${D()}><button type="button" data-action="dlv" data-k="${it.k}" data-d="1" aria-label="${it.label}: több"${n>=it.max||ro()?' disabled':''}>+</button></div></div>`;};
  const dl=DELIVERABLES.filter(it=>it.g!=='int').map(dlRow).join(''),dlInt=DELIVERABLES.filter(it=>it.g==='int').map(dlRow).join('');
  const intTg=INT_FLAGS.map(c=>`<label class="toggle"><input type="checkbox" data-flag="${c.k}"${p[c.k]?' checked':''}${D()}><span class="tl">${c.label}</span></label>`).join('');
  const tg=k=>{const e=EXTRAS.find(x=>x.k===k);return `<label class="toggle"><input type="checkbox" data-flag="${k}"${p[k]?' checked':''}${D()}><span class="tl">${e?e.label:k}</span></label>`;};
  const ex=EXTRAS.filter(e=>!['x_nyersTarolas','x_foto','x_rush'].includes(e.k)).map(e=>{return `<label class="toggle"><input type="checkbox" data-flag="${e.k}"${p[e.k]?' checked':''}${D()}><span class="tl">${e.label}</span></label>`;}).join('');
  const nKrea=DELIVERABLES.filter(it=>num(p[it.k])>0).length+(fotoDb(p)>0?1:0)+EXTRAS.filter(e=>e.k!=='x_foto'&&p[e.k]).length;
  const nRec=REC_CAMS.filter(c=>p[c.k]).length+REC_LIVE.filter(c=>p[c.k]).length+(p.er_post?1:0);
  const nTech=TECH.filter(t=>p[t.k]).length;
  const nRecG=REC_CAMS.filter(c=>c.k!=='er_creative'&&p[c.k]).length,nKreaG=EXTRAS.filter(e=>!['x_nyersTarolas','x_foto','x_rush'].includes(e.k)&&p[e.k]).length+(p.er_creative?1:0),nFotoG=(fotoN(p)>0?1:0)+(fotoDb(p)>0?1:0);
  const nTechG=nTech+REC_LIVE.filter(c=>p[c.k]).length,nPostErG=REC_COUNTS.filter(it=>it.k!=='er_rooms'&&num(p[it.k])>0).length,nPostKreaG=DELIVERABLES.filter(it=>it.g!=='int'&&num(p[it.k])>0).length+(p.x_rush?1:0),nPostIntG=DELIVERABLES.filter(it=>it.g==='int'&&num(p[it.k])>0).length,nIntG=INT_FLAGS.filter(c=>p[c.k]).length;
  const camRow=c=>{const cc=CAM_COUNTS.find(x=>x.flag===c.k),n=camN(p,c.k);
          return cc?`<div class="cam-row"><label class="toggle"><input type="checkbox" data-flag="${c.k}"${p[c.k]?' checked':''}${D()}><span class="tl">${c.label}</span></label>${p[c.k]?`<div class="stepper cam-step"><button type="button" data-action="rec-step" data-k="${cc.k}" data-d="-1" aria-label="${cc.label}: kevesebb"${n<=1||D()?' disabled':''}>−</button><input class="step-in" type="text" inputmode="numeric" data-step-k="${cc.k}" data-min="1" data-max="10" aria-label="${cc.label} száma" value="${n}"${D()}><button type="button" data-action="rec-step" data-k="${cc.k}" data-d="1" aria-label="${cc.label}: több"${n>=10||D()?' disabled':''}>+</button></div>`:''}</div>`
            :`<label class="toggle"><input type="checkbox" data-flag="${c.k}"${p[c.k]?' checked':''}${D()}><span class="tl">${c.label}</span></label>`;};
  const tech=TECH.map(t=>`<label class="toggle"><input type="checkbox" data-flag="${t.k}"${p[t.k]?' checked':''}${D()}><span class="tl">${t.label}</span></label>`).join('');
  const sortedCrew=S.crew.slice().sort((a,b)=>a.name.localeCompare(b.name,'hu'));
  const leadOpts=sortedCrew.map(cr=>`<option value="${esc(cr.id)}"${cr.id===p.lead?' selected':''}>${esc(cr.name)}</option>`).join('');
  const leadBusy=p.lead&&!remoteLead(p)?busyFor(p.lead,p):[];
  const assigned=(p.crew||[]).map((a,i)=>{const cr=crewById(a.crewId);const busy=busyFor(a.crewId,p);
    return `<div class="arow">${avatar(cr)}<div class="who"><b>${esc(cr?cr.name:'Törölt munkatárs')}</b>${busy.length?`<span class="bad-txt">Ütközik: ${busy.map(q=>`<button class="linkbtn bad-link" type="button" data-action="open-project" data-id="${esc(q.id)}" title="${esc(q.name||'')} megnyitása">${esc(q.name||'projekt')}</button>`).join(', ')}</span>`:cr&&cr.phone?`<small>${esc(cr.phone)}</small>`:''}</div>
      <select class="inp" data-crew-role="${i}" aria-label="Szerep"${D()}>${CREW_ROLES.map(rl=>`<option${rl===a.role?' selected':''}>${esc(rl)}</option>`).join('')}</select>
      <button class="x w" type="button" data-action="crew-remove" data-i="${i}" aria-label="Eltávolítás a projektből">×</button></div>`;}).join('');
  const sel='';
  const selRole=S.addCrew.role||'Operatőr';
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
  const folder=ro()?'':p.folderId?`<a class="mini" href="${esc(driveUrl(p.folderId))}" target="_blank" rel="noopener">📁 Projektmappa megnyitása ↗</a>`:ro()?'':`<button class="mini" type="button" data-action="make-folder">📁 Projektmappa létrehozása</button>`;
  const iCut=(p.crew||[]).some(a=>a.crewId===(S.me&&S.me.crewId)&&a.role==='Vágó'),canDeliver=iCut&&['tervezes','helyszin','utomunka','leadva'].includes(p.status||'tervezes')&&needsDelivery(p);
  const delivery=(canDeliver?`<button class="btn primary small" type="button" data-action="cut-deliver">📤 Videók leadása</button>`:'')+vidLink(p,'mini','Átadási link megnyitása ↗'+(p.deliveryPass?' 🔒':''));
  return `<div class="dhead">
    <button class="back" type="button" data-action="back">← ${ro()?'Beosztásaim':'Összes projekt'}</button>
    <div class="dtitle"><div class="grow"><h2>${esc(p.name||'Névtelen projekt')}${p.status==='atadva'?DONE_CHECK:''}${ro()?'':' <button class="editbtn title-edit" type="button" data-action="proj-rename" aria-label="Projekt nevének módosítása" data-tip="Név módosítása">✏️</button>'}</h2>
      <p class="sub">${esc([ro()?'':p.client,p.eventType,fmtRange(p)?fmtRange(p)+(p.startTime?', '+p.startTime+(p.endTime?'–'+p.endTime:''):''):'',p.venue].filter(Boolean).join(' · '))}</p></div></div>
    <div class="btns">${ro()?'':`<button class="btn ${S.dirty?'primary':'outline'} small proj-save" type="button" data-action="save"${S.dirty?'':' disabled'} title="Ctrl+S / ⌘S">${S.saving>0?'Mentés…':S.dirty?'💾 Mentés':'✓ Mentve'}</button>`}${folder}${delivery}${p.calEventId?`<button class="mini" type="button" data-action="tab" data-tab="naptar" data-focus="${esc(r?r.start:'')}" title="A „Terepi Munkák” Google Naptárban">📅 Naptárban</button>`:(validISO(p.date)&&!ro()?'<span class="hint" style="margin:0;align-self:center">📅 Mentéskor bekerül a Google Naptárba</span>':'')}${ro()?'':`<button class="mini" type="button" data-action="cancel-toggle">${p.status==='lemondva'?'↩️ Visszaállítás':'🚫 Projekt lemondása'}</button><button class="mini warn" type="button" data-action="del-project">🗑️ Projekt törlése</button>`}</div>
    ${status==='lemondva'?`<div class="banner"><p><b>Ez a projekt le van mondva.</b>${p.cancelReason?` <span>Ok: <i>${esc(p.cancelReason)}</i>.</span>`:''} Nem számít bele az ütközésekbe, pénzügyekbe és a határidőkbe.</p><button class="btn outline small w" type="button" data-action="cancel-toggle">Visszaállítás</button></div>`:`${ro()?'':`<div class="stages${status==='atadva'?' locked':''}" role="group" aria-label="Projekt állapota" style="--n:${stList.length}">${stages}</div>`}${status==='atadva'?`<p class="hint locked-hint">🔒 A projekt lezárva${p.deliveredAt?' ('+esc(fmtDay(p.deliveredAt))+')':''} – a lépések már nem módosíthatók.${isAdmin()?' <button class="linkbtn" type="button" data-action="proj-unlock" style="margin-left:6px">🔓 Felnyitás</button>':''}</p>`:''}${p.siteOk&&status!=='atadva'?`<div class="site-rep ${p.siteOk==='nem'?'bad':'ok'}"><b>${p.siteOk==='nem'?'🚨 Helyszíni munka: elakadás történt':'✅ Helyszíni munka: minden rendben'}</b><span>${esc(p.siteReport)}</span>${ro()?'':'<button class="linkbtn" type="button" data-action="site-report">Szerkesztés</button>'}</div>`:''}`}
    ${iss.length?`<div class="issues">${iss.map(i=>issueRow(i,p.id)).join('')}</div>`:''}
  </div>
  <div class="dfull">
      ${delivery&&['leadva','jovahagyas','atadva'].includes(status)?`<div class="panel dl-panel"><div class="grow"><h3>🎬 Kész videók</h3><p class="hint" style="margin:2px 0 0">${p.deliveredAt?'Átadva: '+esc(fmtDay(p.deliveredAt))+' · ':''}${esc(String(p.deliveryNotes||'').slice(0,200))||'A videók letölthetők az átadási linkről.'}</p></div>${vidLink(p,'btn primary','⬇️ Videók letöltése ↗')}</div>`:''}
      <details class="panel fold basics" data-fold="basics"${FOLD.basics!==false?' open':''}><summary><h3>📋 Alapadatok</h3></summary><div class="fields">
        ${fld(p,'name','Projekt neve')}
        ${fld(p,'venue',`Helyszín${p.venue?` <a class="linkbtn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.venue)}" target="_blank" rel="noopener" style="font-size:12px;margin-left:6px">📍 Térkép ↗</a>`:''}`,{ph:ro()?'':'Kezdd el gépelni a címet vagy a helyszín nevét…'})}
        ${ro()?'':`<div class="field"><label for="f-client">Ügyfél</label><div class="combo"><input class="inp" id="f-client" type="text" autocomplete="off" value="${esc(p.client||'')}" placeholder="${ro()?'':'Keress vagy válassz ügyfelet… (üresen is hagyható)'}"${D()}></div>${p.clientTax||p.clientAddress?`<span class="hint" style="margin:2px 0 0">${esc([p.clientAddress,p.clientTax?'Adószám: '+p.clientTax:''].filter(Boolean).join(' · '))}</span>`:''}</div>`}
        ${selField(p,'eventType','Rendezvény típusa',EVENT_TYPES)}
        ${ro()?'':`<div class="field full contact3">
        ${fld(p,'contactName','Kapcsolattartó')}
        ${phoneField({key:'contactPhone',value:p.contactPhone,disabled:ro()})}
        ${fld(p,'contactEmail','E-mail',{type:'email'})}
        </div>`}
        ${(()=>{const on=!!p.endDate||!!p._multi,tm=(k,l)=>fld(p,k,l,{ph:k.endsWith('EndTime')||k==='endTime'?'pl. 18:30':'pl. 10:00',im:'numeric'}).replace('data-field=','data-time="1" maxlength="5" data-field=');
          return `<div class="field full day-cols"><div class="day-col">${fld(p,'date','Első nap',{type:'date'})}${tm('startTime',on?'Érkezés (első nap)':'Érkezés a helyszínre')}${tm('endTime',on?'Távozás kb. (első nap)':'Hozzávetőleges távozási óra')}</div>
            <div class="day-col"><div class="field"><label class="multi-lbl" for="f-multi"><input type="checkbox" id="f-multi" data-multi="1"${on?' checked':''}${D()}> Több napos – utolsó nap</label><input class="inp" id="f-endDate" data-field="endDate" type="date" value="${esc(p.endDate||'')}"${p.date?` min="${esc(p.date)}"`:''}${on&&!ro()?'':' disabled'}></div>
            ${on?tm('lastStartTime','Érkezés (utolsó nap)')+tm('lastEndTime','Távozás kb. (utolsó nap)'):''}</div></div>`;})()}
        <div class="field full"><label for="f-notes">Jegyzetek</label><textarea class="inp" id="f-notes" data-field="notes" placeholder="Parkolás, beléptetés, öltözet, helyszíni kapcsolattartó…"${D()}>${esc(p.notes||'')}</textarea></div>
      </div></details>
  </div>
  ${isAdmin()&&typeof projBillingPanel==='function'?projBillingPanel(p):''}
  ${ro()?roContentPanel(p):`<details class="panel fold content" data-fold="content"${FOLD.content?' open':''}><summary><h3>📽️ Előadásrögzítés, kivetítés és kreatív tartalmak ${foldAside(nRec+nKrea+nTech+nIntG)}</h3></summary>
    <div class="content-grid">
      <section class="content-col"><h4 class="sub-h">📍 Terepi feladatok</h4>
        ${cgrp('c_rec','🎙️ Előadásrögzítés',nRecG,`
        ${(()=>{const n=num(p.er_rooms);return `<div class="dl rooms-row"><div><div class="dl-name">Rögzített termek száma</div></div>
          <div class="stepper"><button type="button" data-action="rec-step" data-k="er_rooms" data-d="-1" aria-label="Termek: kevesebb"${n<=0||ro()?' disabled':''}>−</button><input class="step-in" type="text" inputmode="numeric" pattern="[0-9]*" data-step-k="er_rooms" data-min="0" data-max="10" aria-label="Termek száma" value="${n}"${D()}><button type="button" data-action="rec-step" data-k="er_rooms" data-d="1" aria-label="Termek: több"${n>=10||ro()?' disabled':''}>+</button></div></div>`;})()}
        <div class="sec-lbl">Rögzítés eszközei${Math.max(1,num(p.er_rooms)||1)>1?` <span class="muted" style="font-weight:600">· termenként, × ${Math.max(1,num(p.er_rooms)||1)}</span>`:''}</div>
        <div class="toggles one">${REC_CAMS.filter(c=>c.k!=='er_creative').map(camRow).join('')}</div>
`)}
        ${cgrp('c_krea','🎥 Kreatív videózás',nKreaG,`<div class="toggles one">${REC_CAMS.filter(c=>c.k==='er_creative').map(camRow).join('')}${ex}</div>`)}
        ${cgrp('c_int','🎤 Interjúk / imázsfilmek videózása',nIntG,`<div class="toggles one">${intTg}</div>`)}
        ${cgrp('c_foto','📷 Fotózás + utómunka',nFotoG,`${stepRow(p,FOTO_COUNT)}${fotoRow(p)}`)}
        ${cgrp('c_tech','💡 Vizuál-, hang- és fénytechnika',nTechG,`<div class="toggles one">${tech}${REC_LIVE.map(c=>`<label class="toggle"><input type="checkbox" data-flag="${c.k}"${p[c.k]?' checked':''}${D()}><span class="tl">${c.label}</span></label>`).join('')}</div>`)}
      </section>
      <section class="content-col"><h4 class="sub-h">🎬 Utómunka</h4>
        ${cgrp('c_post_er','🎙️ Előadások',nPostErG,`
        ${REC_COUNTS.filter(it=>it.k!=='er_rooms').map(it=>{const n=it.k==='er_rooms'?Math.max(1,num(p[it.k])||1):num(p[it.k]);return `<div class="dl${n>it.min?' on':''}"><div><div class="dl-name">${it.label}</div></div>
          <div class="stepper"><button type="button" data-action="rec-step" data-k="${it.k}" data-d="-1" aria-label="${it.label}: kevesebb"${n<=it.min||ro()?' disabled':''}>−</button><input class="step-in" type="text" inputmode="numeric" pattern="[0-9]*" data-step-k="${it.k}" data-min="${it.min}" data-max="${it.max}" aria-label="${it.label} (db)" value="${n}"${D()}><button type="button" data-action="rec-step" data-k="${it.k}" data-d="1" aria-label="${it.label}: több"${n>=it.max||ro()?' disabled':''}>+</button></div></div>`;}).join('')}
`)}
        ${cgrp('c_post_int','🎤 Interjúk',nPostIntG,dlInt)}
        ${cgrp('c_post_krea','🎞️ Kreatív tartalmak',nPostKreaG,`${dl}${p.x_rush?`<div class="toggles one" style="margin:10px 0">${tg('x_rush')}</div><p class="hint">A villámgyors kézbesítés már nem választható; ha kikapcsolod, eltűnik.</p>`:''}`)}
      </section>
    </div>
    ${orderSummary(p)}
  </details>`}
  <div class="crew-wide">${canSeeFees()?(()=>{const ce=crewEquipPanel(p,st,c,sortedCrew,leadOpts,leadBusy,personOpts,selRole,true);
    return `<details class="panel fold crew-fin" data-fold="crew"${FOLD.crew!==false?' open':''}><summary><h3>👥 Stáb és eszközök <span class="aside">${ce.aside}</span></h3></summary><div class="crew-body">${ce.body}</div></details>
      <details class="panel fold money-panel" data-fold="money"${FOLD.money!==false?' open':''}><summary><h3>💰 ${isAdmin()?'Pénzügyek – büdzsé, termelői keret és díjak':'Termelői díjak és keret'}</h3></summary>${financePanel(p,true)}</details>`;})()
    :crewEquipPanel(p,st,c,sortedCrew,leadOpts,leadBusy,personOpts,selRole)}</div>
  ${ro()&&p.myFee&&num(p.myFee.amount)?myFeePanel(p):''}`;
}

/* ===== Stáb ===== */
const prioNum=c=>[1,2,3].includes(Number(c.priority))?Number(c.priority):9;
function prioBadge(c){const p=prioNum(c);return p<9?`<span class="prio prio-${p}" title="Prioritás: ${p} – ${esc(PRIO_LABEL[p])}">P${p}</span>`:'';}
/* 3.7. pont: 12 hónapon belül 3 súlyos vagy kritikus hiba → azonnali felmondás joga */
function penStrikes(cid){const from=addDays(todayISO(),-365);let n=0;S.projects.forEach(p=>(p.penalties||[]).forEach(x=>{if(x.crewId===cid&&x.status==='approved'&&(x.kind==='severe'||x.kind==='critical')&&String(x.decidedAt||x.at).slice(0,10)>=from)n++;}));return n;}
function penStrikeNote(cid){const n=penStrikes(cid);if(!n)return '';
  return `<p class="pen-strike${n>=3?' bad':''}">⚠️ ${n} súlyos/kritikus hiba az elmúlt 12 hónapban${n>=3?' – a szerződés 3.7. pontja szerint azonnali hatályú felmondásra van jogotok.':''}</p>`;}
function viewCrew(){
  const T=todayISO(),f=S.cf,q=f.q.trim().toLowerCase();
  let list=crewSorted();
  if(f.role)list=list.filter(c=>(c.roles||[]).includes(f.role)||(c.skills||[]).includes(f.role));
  if(f.prio)list=list.filter(c=>String(prioNum(c))===f.prio);
  if(q)list=list.filter(c=>[c.name,c.phone,c.email,c.company,(c.roles||[]).join(' '),(c.skills||[]).join(' '),c.note].join(' ').toLowerCase().includes(q));
  const internal=S.crew.filter(c=>c.type==='Belsős').length;
  const nextOf=c=>S.projects.filter(p=>p.status!=='lemondva'&&pr(p)&&pr(p).end>=T&&crewIds(p).has(c.id)).sort(byStart);
  const cards=f.view==='list'?'':list.map(c=>{
    const next=S.projects.filter(p=>p.status!=='lemondva'&&pr(p)&&pr(p).end>=T&&crewIds(p).has(c.id)).sort(byStart);
    const role=p=>p.lead===c.id?'projektvezető':((p.crew||[]).filter(a=>a.crewId===c.id).map(a=>a.role.toLowerCase()).join(', '));
    const sub=[c.type,c.company].filter(Boolean).join(' · ');
    return `<article class="pcard crew-card" data-crew-card="${esc(c.id)}"${ro()?'':' draggable="true" title="Húzd a kártyát a sorrend módosításához"'}>
      <div class="pc-top">${avatar(c)}<div class="pc-id"><div class="pc-name">${esc(c.name)} ${prioBadge(c)}</div>${sub?`<div class="pc-sub">${esc(sub)}</div>`:''}</div>
        <button class="pc-edit w" type="button" data-action="edit-crew" data-id="${esc(c.id)}" aria-label="${esc(c.name)} szerkesztése" title="Szerkesztés">✎</button></div>
      <div class="roles">${(c.roles||[]).map(r=>`<span class="statuspill">${esc(r)}</span>`).join('')||'<span class="muted" style="font-size:13px">Nincs szerep megadva</span>'}</div>
      ${(c.skills||[]).length?`<div class="skills">${c.skills.map(s=>`<span class="skill">${esc(s)}</span>`).join('')}</div>`:''}
      <div>${c.phone?`<div class="kv"><span>Telefon</span><button class="copy" type="button" data-action="copy" data-text="${esc(c.phone)}" title="Másolás">${esc(c.phone)}</button></div>`:''}
        ${c.email?`<div class="kv"><span>E-mail</span><button class="copy mail" type="button" data-action="copy" data-text="${esc(c.email)}" title="Másolás">${esc(c.email).replace('@','<wbr>@')}</button></div>`:'<div class="kv"><span>E-mail</span><span class="warn-txt">nincs megadva</span></div>'}
        ${c.dayRate!=null&&num(c.dayRate)?`<div class="kv"><span>Napidíj</span><b class="tnum">${huf(c.dayRate)}</b></div>`:''}</div>
      ${c.note?`<p class="pc-note">${esc(c.note)}</p>`:''}
      ${penStrikeNote(c.id)}
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
  return `<div class="page-head"><div class="grow"><h2>Stáb</h2><p class="sub">${S.crew.length} munkatárs${S.crew.length?` · ${internal} belsős`:''}</p></div>${ro()?'':undoBar()}
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
/* Naptár gyorsítás: a hónap eseményeit a böngésző is megjegyzi (azonnal megjelenik), a háttérben frissül;
   a szomszédos hónapokat előre betöltjük. */
const CAL_LS='lpm_cal_v1_';
function calCacheGet(m){try{const c=JSON.parse(localStorage.getItem(CAL_LS+m)||'null');if(c&&c.tk===String(TOKEN).slice(-16)&&Array.isArray(c.ev))return c;}catch(e){}return null;}
function calCacheSet(m,ev){try{localStorage.setItem(CAL_LS+m,JSON.stringify({tk:String(TOKEN).slice(-16),at:Date.now(),ev}));}catch(e){}}
function calCacheClear(){try{Object.keys(localStorage).filter(k=>k.indexOf(CAL_LS)===0).forEach(k=>localStorage.removeItem(k));}catch(e){}}
const shiftMonth=(m,d)=>{const [y,mo]=m.split('-').map(Number);const t=new Date(Date.UTC(y,mo-1+d,1));return t.toISOString().slice(0,7);};
function loadCalEvents(month){
  const r=calRange(month),key=month;S.cal.at=S.cal.at||{};
  if(S.cal.loading[key])return;
  if(!S.cal.events[key]){const c=calCacheGet(month);if(c){S.cal.events[key]=c.ev;S.cal.at[key]=0;}}
  if(S.cal.events[key]&&Date.now()-(S.cal.at[key]||0)<60000)return;
  if(S.cal.err[key]&&Date.now()-(S.cal.errAt&&S.cal.errAt[key]||0)<60000)return;   // hiba után ne kérdezzük újra azonnal (különben végtelen újrarajzolás)
  S.cal.loading[key]=true;
  call('calendarEvents',{from:r.start,to:r.end}).then(ev=>{S.cal.events[key]=ev||[];S.cal.at[key]=Date.now();calCacheSet(month,S.cal.events[key]);delete S.cal.err[key];if(S.cal.errAt)delete S.cal.errAt[key];})
    .catch(e=>{S.cal.err[key]=errText(e);(S.cal.errAt=S.cal.errAt||{})[key]=Date.now();if(errText(e).indexOf('AUTH_REQUIRED')>=0)handleErr(e);})
    .finally(()=>{delete S.cal.loading[key];if(S.tab==='naptar'&&S.cal.month===month)render(true);});
}
function prefetchCal(m){if(ro()||!TOKEN)return;loadCalEvents(m);setTimeout(()=>{if(TOKEN){loadCalEvents(shiftMonth(m,1));loadCalEvents(shiftMonth(m,-1));}},800);}
function calItems(month){
  const r=calRange(month),items=[];
  const linked=new Set(S.projects.map(p=>p.calEventId).filter(Boolean));
  S.projects.forEach(p=>{const q=pr(p);if(!q||q.end<r.start||q.start>r.end)return;
    items.push({kind:'p',id:p.id,title:p.name||'Névtelen projekt',date:q.start,endDate:q.end,time:p.startTime||'',status:p.status||'tervezes',venue:p.venue||''});});
  (S.cal.events[month]||[]).forEach(e=>{if(linked.has(e.id)||(e.projectId&&projById(e.projectId)))return;
    items.push({kind:'g',id:e.id,title:e.title||'(nincs cím)',date:e.date,endDate:e.endDate||e.date,time:e.start||'',venue:e.location||''});});
  return items.sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'99').localeCompare(b.time||'99')||a.title.localeCompare(b.title,'hu'));
}
function calChip(it,day){
  const cont=it.date<day;
  const dim=it.kind==='p'&&crewDim(projById(it.id)||{});
  const cls=it.kind==='p'?`cal-chip p st-${esc(it.status)}${dim?' dim':''}`:'cal-chip g';
  if(dim)return `<span class="${cls}">${cont?'↳ ':it.time?`<b>${esc(it.time)}</b> `:''}${esc(it.title)}</span>`;
  return `<button type="button" class="${cls}" data-action="${it.kind==='p'?'open-project':'cal-event'}" data-id="${esc(it.id)}" data-kind="${it.kind}" data-tipid="${esc(it.id)}">${cont?'↳ ':it.time?`<b>${esc(it.time)}</b> `:''}${esc(it.title)}</button>`;
}
function viewCalendar(){
  const m=S.cal.month,r=calRange(m),T=todayISO();
  prefetchCal(m);
  const items=calItems(m),loading=!!S.cal.loading[m]&&!S.cal.events[m],err=S.cal.err[m];
  const days=[];for(let i=0;i<42;i++)days.push(addDays(r.start,i));
  const onDay=d=>items.filter(it=>it.date<=d&&it.endDate>=d);
  const grid=days.map(d=>{const its=onDay(d),out=d.slice(0,7)!==m;
    return `<div class="cal-day${out?' out':''}${d===T?' today':''}${S.cal.sel===d?' sel':''}${S.cal.focus&&d>=S.cal.focus.start&&d<=S.cal.focus.end&&!out?' focus':''}" data-day="${d}"><div class="cal-dh"><span class="cal-dn">${Number(d.slice(8))}</span><button type="button" class="cal-add" data-action="cal-new" data-d="${d}" aria-label="Új bejegyzés: ${esc(d)}" title="Új bejegyzés erre a napra">+</button></div>${its.slice(0,4).map(it=>calChip(it,d)).join('')}${its.length>4?`<button type="button" class="cal-more" data-action="cal-day" data-d="${d}">+${its.length-4} további</button>`:''}</div>`;}).join('');
  const agenda=days.filter(d=>d.slice(0,7)===m).map(d=>{const its=onDay(d);if(!its.length)return '';
    return `<div class="ag-day${d===T?' today':''}"><div class="ag-date">${esc(F_FULL.format(toDate(d)).replace(/^\d{4}\. /,''))}</div>${its.map(it=>calChip(it,d)).join('')}</div>`;}).join('');
  const nP=items.filter(i=>i.kind==='p'&&i.date.slice(0,7)<=m&&i.endDate.slice(0,7)>=m).length,nG=items.filter(i=>i.kind==='g'&&i.date.slice(0,7)<=m&&i.endDate.slice(0,7)>=m).length;
  return `<div class="page-head"><div class="grow"><h2 style="text-transform:capitalize">${esc(F_MONTH.format(toDate(r.first)))}</h2><p class="sub">${ro()?`${nP} beosztásod ebben a hónapban`:`${nP} projekt · ${nG} további esemény a „Terepi Munkák” naptárból${loading?' · betöltés…':''}`}</p></div>
      <div class="btns">${ro()?'':'<button class="btn primary small" type="button" data-action="cal-new">+ Új projekt</button>'}<button class="btn outline small" type="button" data-action="cal-nav" data-d="-1" aria-label="Előző hónap">‹</button><button class="btn outline small" type="button" data-action="cal-nav" data-d="0">Ma</button><button class="btn outline small" type="button" data-action="cal-nav" data-d="1" aria-label="Következő hónap">›</button>
      ${ro()?'':`<a class="btn ghost small" href="https://calendar.google.com/calendar/u/0/r/month/${r.first.replace(/-/g,'/')}" target="_blank" rel="noopener">Google Naptár ↗</a>`}</div></div>
    ${err?`<div class="banner"><p>A Google Naptár most nem érhető el: ${esc(err)}</p><button class="btn outline small" type="button" data-action="cal-retry">Újra</button></div>`:''}
    ${ro()?'':'<div class="cal-legend"><span><i class="lg p"></i>Projekt az appban</span><span><i class="lg g"></i>Csak a Google Naptárban – kattints rá, és projektet csinálhatsz belőle</span></div>'}
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
    return `<tr class="grp"><td colspan="6">${esc(cat)} · ${items.reduce((s,i)=>s+num(i.qty),0)} db</td></tr>`+items.map(i=>{
      const cond=i.condition||'ok';
      const condCls=cond==='ok'?'p-ok':cond==='selejt'?'':cond==='szerviz'?'p-bad':'p-warn';
      return `<tr><td><div class="nm">${esc(i.name)}</div>${i.note?`<div class="ser">${esc(i.note)}</div>`:''}</td>
        <td class="num">${num(i.qty)}</td>
        <td><span class="statuspill ${condCls}">${esc(CONDITIONS[cond]||cond)}</span></td>
        <td>${i.location?esc(i.location):'<span class="muted">—</span>'}</td>
        <td><span class="ser">${esc(i.serial||'')}</span></td>
        <td class="num"><button class="btn ghost small w" type="button" data-action="edit-item" data-id="${esc(i.id)}">Szerkesztés</button></td></tr>`;}).join('');}).join('');
  return `<div class="page-head"><div class="grow"><h2>Leltár</h2><p class="sub">${S.inventory.length} tétel · ${totalQty} db${value&&isAdmin()?` · bruttó nyilvántartási érték ${huf(value)}`:''}${broken?` · <span class="warn-txt">${broken} javításra vár / szervizben</span>`:''}</p></div>${ro()?'':undoBar()}
      <button class="btn primary w" type="button" data-action="new-item">+ Új eszköz</button></div>
    <div class="toolbar"><input class="inp search" id="q-inv" type="search" placeholder="Keresés név, hely vagy sorozatszám szerint" value="${esc(f.q)}" aria-label="Leltár keresése">
      <select class="inp" id="inv-cat" style="width:auto" aria-label="Kategória"><option value="">Minden kategória</option>${INV_CATS.map(c=>`<option${c===f.cat?' selected':''}>${esc(c)}</option>`).join('')}</select>
      <select class="inp" id="inv-cond" style="width:auto" aria-label="Állapot"><option value="">Minden állapot</option>${Object.entries(CONDITIONS).map(([k,v])=>`<option value="${k}"${k===f.cond?' selected':''}>${v}</option>`).join('')}</select></div>
    ${rows?`<div class="tbl-wrap"><table><thead><tr><th>Eszköz</th><th class="num">Db</th><th>Állapot</th><th>Tárolási hely</th><th>Azonosító</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:`<div class="panel">${empty(S.inventory.length?'Nincs a szűrésnek megfelelő eszköz.':'Még üres a leltár. Vedd fel az eszközöket az „Új eszköz” gombbal.')}</div>`}`;
}

/* ===== Ügyfelek ===== */
function viewClients(){
  const q=S.clf.q.trim().toLowerCase(),T=todayISO();
  let list=knownClients('');
  if(q)list=list.filter(c=>[c.company,c.tax,c.address,c.name,c.email,c.phone].join(' ').toLowerCase().includes(q));
  const projOf=c=>S.projects.filter(p=>String(p.client||'').trim().toLowerCase()===c.company.toLowerCase()).sort((a,b)=>byStart(b,a));
  const adm=isAdmin()&&S.capabilities&&S.capabilities.finance;if(adm&&!S.fin&&!S.finErr)setTimeout(()=>finLoad().then(()=>{if(S.tab==='ugyfelek')render(true);}),0);
  const rows=list.map(c=>{const ps=projOf(c),next=ps.filter(p=>p.status!=='lemondva'&&pr(p)&&pr(p).end>=T).sort(byStart)[0],last=next||ps[0];
    return `<tr><td><button class="linkbtn nm cl-name" type="button" data-action="edit-client" data-name="${esc(c.company)}" title="Ügyfél adatai">${esc(c.company)}</button>${c.address?`<div class="ser">${esc(c.address)}</div>`:''}</td>
      <td><span class="ser">${esc(c.tax||'')}</span></td>
      <td>${c.name?esc(c.name):'<span class="muted">—</span>'}</td>
      <td class="cl-ph">${c.phone?`<a href="tel:${esc(c.phone.replace(/\s/g,''))}">${esc(c.phone)}</a>`:'<span class="muted">—</span>'}</td>
      <td>${c.email?`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`:'<span class="muted">—</span>'}</td>
      ${adm?`<td>${clContract(c,ps)}</td>`:''}
      <td class="num"><button class="btn ghost small w" type="button" data-action="edit-client" data-name="${esc(c.company)}">Szerkesztés</button></td></tr>`;}).join('');
  const all=knownClients('').length;
  return `<div class="page-head"><div class="grow"><h2>Ügyfelek</h2><p class="sub">${all} ügyfél${adm&&S._clDocsBusy?' · <span class="spin" style="width:11px;height:11px;vertical-align:-1px"></span> szerződések keresése a Drive-ban…':''}</p></div>${ro()?'':undoBar()}
      <button class="btn primary w" type="button" data-action="new-client">+ Új ügyfél</button></div>
    <div class="toolbar"><input class="inp search" id="q-cl" type="search" placeholder="Keresés cégnév, adószám, kapcsolattartó vagy e-mail szerint" value="${esc(S.clf.q)}" aria-label="Ügyfelek keresése"></div>
    ${rows?`<div class="tbl-wrap"><table><thead><tr><th>Ügyfél</th><th>Adószám</th><th>Kapcsolattartó</th><th class="cl-ph">Telefon</th><th>E-mail</th>${adm?'<th>Szerződés</th>':''}<th></th></tr></thead><tbody>${rows}</tbody></table></div>`:`<div class="panel">${empty(all?'Nincs a keresésnek megfelelő ügyfél.':'Még nincs ügyfél. Vegyél fel egyet, vagy adj meg ügyfelet egy projektnél.')}</div>`}`;
}

/* Ügyfélmappák a Drive-ban (02 Ügyfelek) – név vagy zárójeles név alapján párosítva, mint a háttérben */
const clNorm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\b(kft|bt|zrt|nyrt|kkt|llc|ltd|s l|sl|egyesulet|nonprofit)\b/g,' ').replace(/\s+/g,' ').trim();
/* Ügyfél ↔ mappa: egyezés vagy szóhatáros előtag (pl. „Bagen” ↔ „Bagen Invest Kft.”); a zárójeles név is számít */
const clMatch=(company,folder)=>{const w=clNorm(company);if(!w)return false;return [folder.replace(/\s*\(.*\)\s*$/,''),(/\(([^)]*)\)/.exec(folder)||[])[1]||''].map(clNorm).some(f=>f&&(f===w||(Math.min(f.length,w.length)>=4&&((w+' ').startsWith(f+' ')||(f+' ').startsWith(w+' ')))));};
function clDocsLoad(force){if(S._clDocsLoading)return;S._clDocsLoading=true;S._clDocsBusy=true;
  call('clientDocs',{force:!!force}).then(r=>{S.clDocs=r.folders||[];S._clDocsAt=r.at||0;
    if(!force&&Date.now()-(r.at||0)>30*60000){S._clDocsLoading=false;clDocsLoad(true);return;}   // régi a tárolt lista → a háttérben frissítjük
    S._clDocsBusy=false;S._clDocsLoading=false;}).catch(()=>{S.clDocs=S.clDocs||[];S._clDocsBusy=false;S._clDocsLoading=false;}).finally(()=>{if(S.tab==='ugyfelek'&&!$('modalRoot').innerHTML)render(true);});}
function clDir(company){if(!S.clDocs){clDocsLoad(!!S._clDocsForce);S._clDocsForce=false;return null;}
  const hits=S.clDocs.filter(d=>clMatch(company,d.name));if(hits.length<2)return hits[0]||null;   // több mappa is tartozhat egy ügyfélhez (pl. márkanév + cégnév)
  return {name:hits[0].name,url:hits[0].url,docs:[].concat(...hits.map(h=>h.docs||[])).sort((x,y)=>String(y.date).localeCompare(String(x.date)))};}
/* Ügyfél szerződései: a Drive-mappa Szerződések / Keretszerződés almappái + az appban rögzített linkek (ismétlés nélkül) */
const driveId=u=>(/[-\w]{25,}/.exec(String(u||''))||[])[0]||u;
function clDocs(c,ps){const f=fwOfClient(c.company),dir=clDir(c.company),docs=((dir&&dir.docs)||[]).slice(),have=new Set(docs.map(d=>driveId(d.url)));
  const add=(url,name,kind)=>{if(url&&!have.has(driveId(url))){have.add(driveId(url));docs.push({url,name:name||'Szerződés',kind,date:''});}};
  if(f&&f.url)add(f.url,f.fileName||'Keretszerződés','keret');ps.forEach(p=>{const b=billOf(p.id);add(b.contractUrl,b.contractName||('Szerződés – '+(p.name||'')),'sz');});
  return {f,dir,docs};}
const docLabel=d=>(d.kind==='keret'?'Keretszerződés':'Szerződés')+(/_EV([_.\s]|$)/.test(d.name)?' (E.V.)':'');
function clContract(c,ps){
  const {f,dir,docs}=clDocs(c,ps),cl=esc(c.company),edit='';
  if(f&&f.mode==='nemkell')return `<div class="cl-ctr"><label class="bl-nocontract"><input type="checkbox" data-clnone="${cl}" checked> Nem kell szerződés</label></div>`;
  if(docs.length>1)return `<div class="cl-ctr" data-cldrop="${cl}"><button class="bl-file linkbtn" type="button" data-action="cl-docs" data-client="${cl}">📑 ${docs.length} szerződés</button>${edit}</div>`;
  if(docs.length)return `<div class="cl-ctr" data-cldrop="${cl}"><button class="bl-file linkbtn" type="button" data-action="cl-docs" data-client="${cl}" data-tip="${esc(docs[0].name)}">📄 ${esc(docLabel(docs[0]))}</button></div>`;
  return `<div class="cl-ctr cl-dropcell" data-cldrop="${cl}"><span class="cdrop-tip">📥 Húzd ide</span><label class="bl-nocontract"><input type="checkbox" data-clnone="${cl}"> Nem kell</label></div>`;
}
function clDocsModal(name){const c=knownClients('').find(x=>x.company===name)||{company:name};const ps=S.projects.filter(p=>String(p.client||'').trim().toLowerCase()===name.toLowerCase());
  const {dir,docs}=clDocs(c,ps);
  openModal('Szerződések – '+name,`<div class="cl-docs">${docs.map(d=>`<div class="cl-doc-row"><a class="cl-doc" href="${esc(d.url)}" target="_blank" rel="noopener"><span class="cl-doc-k">${d.folder?'🗂️':'📄'} ${esc(docLabel(d))}</span><span class="cl-doc-n">${esc(d.name)}</span><span class="cl-doc-d">${esc(d.date||'')}</span></a>${d.folder?'':`<button class="trash" type="button" data-action="cl-doc-del" data-url="${esc(d.url)}" data-name="${esc(d.name)}" data-client="${esc(name)}" aria-label="Szerződés törlése" title="Törlés">🗑️</button>`}</div>`).join('')||'<p class="hint" style="margin:0">Még nincs szerződés.</p>'}</div>
    <div class="cl-drop" data-cldrop="${esc(name)}">📥 Új szerződés: húzd ide a fájlt<span class="cdrop-hint">Engedd el a feltöltéshez</span></div>
    <div class="btns" style="margin-top:12px">${dir?`<a class="mini" href="${esc(dir.url)}" target="_blank" rel="noopener">📁 Ügyfél mappája ↗</a>`:''}<button class="mini" type="button" data-action="tig-new" data-client="${esc(name)}">📝 TIG kiállítása</button></div>`,{cancelLabel:'Bezárás'});}

/* ===== Beállítások (admin) ===== */
function viewSettings(){
  if(S.users===null||S.log===null){loadSettings();return '<div class="loading"><span class="spin"></span>Betöltés…</div>';}
  const MC=[['assign','👥 Beosztás','Szakemberek','A stáb véglegesítésekor (és módosításkor) megkapják a beosztásukat: időpont, helyszín, szerep, stáb.'],
    ['calendar','📅 Naptármeghívó','Szakemberek','A Google Naptár meghívót és változásértesítést küld a projekt eseményéről.'],
    ['eqlist','🎒 Eszközlista','A kiválasztott stábtagok','Az „Eszközlista küldése” gombbal kiküldött levél: ki mit visz, személyes megjegyzés.'],
    ['penalty','⚠️ Díjcsökkentés','Az érintett szakember','Jóváhagyott díjcsökkentésről (késés, hiba, kártérítés) értesítés.'],
    ['penAdmin','🔔 Jóváhagyásra váró díjcsökkentés','Ügyvezetők','Ha a termelési vezető díjcsökkentést javasol, az ügyvezető jóváhagyást kér.'],
    ['invoice','🧾 Számla, díjbekérő','Az ügyfél (vevő)','A számlázz.hu e-mailben elküldi a kiállított bizonylatot a vevő e-mail-címére.'],
    ['invite','✉️ Meghívó','Az új kolléga','Belépési meghívó, amikor új felhasználót veszel fel.']],mc=S.mailCats||{},cc=S.mailCc||{};
  const CC=[['actor','aki küldi'],['editor','termelési vezetők'],['admin','ügyvezetők']];
  const mailPanel=S.mailOn===undefined?'':`<div class="panel mail-panel${S.mailOn?'':' off'}"><h3>📧 E-mail értesítések <span class="aside"><span class="statuspill ${S.mailOn?'p-ok':'p-bad'}">${S.mailOn?'Bekapcsolva':'Szünetel – senki nem kap e-mailt'}</span></span></h3>
    <p class="hint" style="margin:6px 0 10px">A főkapcsolóval minden e-mail egyszerre szüneteltethető. Bekapcsolt állapotban típusonként is választhatsz.</p>
    <button class="btn ${S.mailOn?'outline':'primary'} small" type="button" data-action="mail-toggle">${S.mailOn?'⏸ Minden e-mail szüneteltetése':'▶️ E-mailek bekapcsolása'}</button>
    <div class="mail-cats${S.mailOn?'':' dis'}">${MC.map(([k,l,to,d])=>`<div class="mail-cat${mc[k]===false?' off':''}"><label class="mail-cat-h"><input type="checkbox" data-mailcat="${k}"${mc[k]!==false?' checked':''}${S.mailOn?'':' disabled'}><b>${l}</b></label>
      <div class="mail-to"><span class="muted">Címzett:</span> <b>${to}</b></div><small>${d}</small>
      ${cc[k]?`<div class="mail-cc"><span class="muted">Másolat:</span>${CC.map(([r,rl])=>`<label class="cc-chip${cc[k].includes(r)?' on':''}"><input type="checkbox" data-mailcc="${k}" data-role="${r}"${cc[k].includes(r)?' checked':''}${S.mailOn&&mc[k]!==false?'':' disabled'}> ${rl}</label>`).join('')}</div>`:''}</div>`).join('')}</div></div>`;
  if(Date.now()-(S._settingsAt||0)>30000)setTimeout(loadSettings,0);
  const crewName=id=>{const c=crewById(id);return c?c.name:'';};
  const users=S.users.slice().sort((a,b)=>(!!a.disabled-!!b.disabled)||a.name.localeCompare(b.name,'hu')).map(u=>`<div class="arow${u.disabled?' off':''}"><div class="who"><b>${esc(u.name)} <span class="statuspill ${u.disabled?'p-bad':'p-ok'}">${u.disabled?'letiltva':'aktív'}</span>${u.id===S.me.id?' <span class="muted" style="font-weight:600">(te)</span>':''}</b><small>${esc(roleLabel(u.role))}${u.crewId?' · stáb: '+esc(crewName(u.crewId)||'törölt munkatárs'):''}${u.email?' · '+esc(u.email):''}</small></div>
    <div class="arow-btns">${u.id!==S.me.id?`<button class="mini${u.disabled?'':' warn'}" type="button" data-action="toggle-user" data-id="${esc(u.id)}" data-dis="${u.disabled?'0':'1'}">${u.disabled?'Engedélyezés':'Letiltás'}</button>`:''}<button class="mini" type="button" data-action="edit-user" data-id="${esc(u.id)}">Szerkesztés</button></div></div>`).join('');
  const log=S.log.slice(0,150).map(l=>`<div class="logrow"><span class="when">${esc(l.at)}</span><span><b>${esc(l.who)}</b> · ${esc(l.action)}${l.subject?': '+esc(l.subject):''}${l.details?`<br><span class="muted">${esc(l.details)}</span>`:''}</span></div>`).join('');
  return `<div class="page-head"><div class="grow"><h2>Beállítások</h2><p class="sub">Felhasználók, napló és a háttérben futó táblázat</p></div></div>
    ${mailPanel}
    <div class="panel db-panel"><h3>🗄️ Adatbázis <span class="aside">${S.dbInfo?`<span class="statuspill ${S.dbInfo.mode==='neon'?'p-ok':'p-mute'}">${S.dbInfo.mode==='neon'?'Neon adatbázis':'Google-táblázat'}</span>`:''}</span></h3>
      <p class="hint" style="margin:6px 0 10px">Az app adatai a gyors Neon adatbázisban vagy a Google-táblázatban lehetnek. Neon módban a táblázat éjszakánként biztonsági másolatot kap, és egy kattintással vissza lehet állni rá.</p>
      ${S.dbInfo&&S.dbInfo.msg?`<p class="hint" style="margin:0 0 10px">${esc(S.dbInfo.msg)}</p>`:''}
      <div class="btns"><button class="btn outline small" type="button" data-action="db-ping">🔌 Kapcsolat ellenőrzése</button>
        ${S.dbInfo&&S.dbInfo.mode==='neon'?`<button class="btn outline small" type="button" data-action="db-backup">💾 Mentés a táblázatba most</button><button class="btn outline small" type="button" data-action="db-mode" data-mode="sheet">↩️ Vissza a Google-táblázatra</button>`:`<button class="btn primary small" type="button" data-action="db-mode" data-mode="neon">🚀 Átköltöztetés a Neon adatbázisba</button>`}</div></div>
    <div class="btns">${S.links.sheet?`<a class="mini" href="${esc(S.links.sheet)}" target="_blank" rel="noopener">📊 Adatbázis megnyitása (Google Sheet) ↗</a>`:''}${S.links.folder?`<a class="mini" href="${esc(S.links.folder)}" target="_blank" rel="noopener">📁 Projektek mappa ↗</a>`:''}</div>
    <div class="grid2">
      <div class="panel"><h3>👤 Hozzáférések – ki léphet be <span class="aside"><button class="btn primary small" type="button" data-action="new-user">+ Kolléga felvétele</button></span></h3>
        <p class="hint" style="margin:0 0 10px">Csak az itt felvett, aktív e-mail-címekkel lehet belépni (Google-fiókkal). Letiltáskor a kolléga minden eszközön azonnal kilép. Ügyvezető: mindent lát és kezel, a Beállításokat is. Termelési vezető: projekteket, stábot és leltárt szerkeszt, eszközlistát küld. Szakember: csak a saját beosztásait látja (helyszín, időpont, stáb, eszközök), szerkeszteni nem tud.</p>
        <div class="alist">${users||empty('Nincs felhasználó.')}</div></div>
      <div class="panel"><h3>🧾 Napló <span class="aside"><button class="btn ghost small" type="button" data-action="reload-log">↻</button></span></h3>
        <div class="log-scroll">${log||empty('Még nincs bejegyzés.')}</div></div>
    </div>`;
}
async function loadSettings(){   // egy kérés; a már betöltött adatot azonnal mutatjuk, a háttérben frissítjük
  if(S._settingsLoading)return;S._settingsLoading=true;
  try{const r=await call('settingsData');S.users=r.users||[];S.log=r.log||[];S._settingsAt=Date.now();}
  catch(e){handleErr(e);S.users=S.users||[];S.log=S.log||[];}
  finally{S._settingsLoading=false;if(S.tab==='beallitasok'&&!$('modalRoot').innerHTML)render(true);}
}

