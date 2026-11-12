'use strict';
/* ===== Belépés (a Sales App belépőjével egyező működés) ===== */
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function loginMsg(text,info){const m=$('loginMsg');m.textContent=text||'';m.classList.toggle('info',!!info);}
/* Belépés csak Google-fiókkal (Google Identity Services). */
const G_CLIENT=String(window.LUMOS_GOOGLE_CLIENT_ID||'').trim();
let gReady=false;
function initGoogle(tries){
  if(!G_CLIENT){$('loginForm').classList.add('lc-in');loginMsg('A Google-belépés nincs beállítva.');return;}
  if(gReady)return;
  if(!(window.google&&google.accounts&&google.accounts.id)){if((tries||0)<60)setTimeout(()=>initGoogle((tries||0)+1),150);else{$('loginForm').classList.add('lc-in');loginMsg('A Google-belépés nem töltődött be. Frissítsd az oldalt, vagy próbáld másik böngészőből.');}return;}
  gReady=true;
  google.accounts.id.initialize({client_id:G_CLIENT,callback:onGoogleCredential,auto_select:false,cancel_on_tap_outside:true,ux_mode:'popup',itp_support:true});
  const gw=Math.max(240,Math.min(400,(($('gBtn').closest('.login-card')||{}).clientWidth||360)-64));
  google.accounts.id.renderButton($('gBtn'),{theme:'outline',size:'large',shape:'pill',text:'signin_with',logo_alignment:'center',locale:'hu',width:gw});
  /* a kártya bármely részére kattintva is indul a Google-belépés (a gombon kívül a Google saját belépőablaka jön fel) */
  const card=$('gBtn').closest('.login-card');if(card&&!card.dataset.clk){card.dataset.clk='1';card.classList.add('lc-click');card.addEventListener('click',e=>{if(e.target.closest('#gBtn'))return;try{google.accounts.id.prompt();}catch(err){}});}
  loginReveal();
}
/* A belépő kártya csak akkor jelenik meg (lágy beúszással), amikor a betűk és a Google-gomb is betöltött – így nem ugrál */
function loginReveal(){const box=$('gBtn'),card=box&&box.closest('.login-card');if(!card||card.classList.contains('lc-in'))return;
  let done=false;const show=()=>{if(done)return;done=true;setTimeout(()=>card.classList.add('lc-in'),180);};
  const fonts=(document.fonts&&document.fonts.ready)||Promise.resolve();
  const frame=()=>new Promise(res=>{const chk=()=>{const f=box.querySelector('iframe');if(f){f.addEventListener('load',()=>res(),{once:true});setTimeout(res,1200);return true;}return false;};if(chk())return;const mo=new MutationObserver(()=>{if(chk())mo.disconnect();});mo.observe(box,{childList:true,subtree:true});});
  Promise.all([fonts,frame()]).then(show);setTimeout(show,3000);}
async function onGoogleCredential(resp){
  if(!resp||!resp.credential){loginMsg('A Google-belépés megszakadt.');return;}
  loginMsg('Belépés…',true);
  try{
    const r=await gs('googleLogin',resp.credential);
    TOKEN=r.token;try{localStorage.setItem(TOKEN_KEY,TOKEN);}catch(err){}
    $('loginGate').classList.add('hidden');document.documentElement.classList.add('booting');document.documentElement.classList.remove('no-auth');loginMsg('');
    await load();
  }catch(err){loginMsg(errText(err)||'A belépés sikertelen.');}
}
function showLogin(msg){
  $('loginGate').classList.remove('hidden');setTimeout(()=>{const c=$('loginForm');if(c)c.classList.add('lc-in');},3500);   // biztonsági háló: a kártya mindenképp megjelenikdocument.documentElement.classList.add('no-auth');
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


/* ===== Betöltés ===== */
/* Gyors indulás: az utolsó betöltött adatot a böngésző megjegyzi, és frissítéskor azonnal megmutatja,
   miközben a háttérben letölti a friss adatot. Kilépéskor és lejárt belépésnél törlődik. */
const BOOT_KEY='lpm_boot_v1';
function bootCacheSave(d){try{localStorage.setItem(BOOT_KEY,JSON.stringify({tk:String(TOKEN).slice(-16),at:Date.now(),d}));}catch(e){}}
function bootCacheClear(){try{localStorage.removeItem(BOOT_KEY);localStorage.removeItem('lumos_pm_fin_v1');}catch(e){}calCacheClear();}
function bootFromCache(){
  try{const c=JSON.parse(localStorage.getItem(BOOT_KEY)||'null');if(!c||c.tk!==String(TOKEN).slice(-16)||!c.d||!c.d.me)return false;
    if(Date.now()-c.at>7*864e5)return false;
    const d=c.d;S.mySales=d.mySales||[];S.capabilities=d.capabilities||{};S.mailOn=d.mailOn;S.clientMailLive=!!d.clientMailLive;S.mailCats=d.mailCats||S.mailCats;S.mailCc=d.mailCc||S.mailCc;S.crewOrder=Array.isArray(d.crewOrder)?d.crewOrder:crewOrderLocal();S.me=d.me;S.mySales=d.mySales||[];S.deals=d.deals||[];S.salesPeople=d.salesPeople||[];S.crewDocs=d.crewDocs||[];crewDocsAutoBg();S.viewAsCrew=d.viewAsCrew||[];S.viewAsSales=d.viewAsSales||[];S.crewNames=d.crewNames||{};S.projects=(d.projects||[]).map(normProj);S.crew=d.crew||[];S.inventory=d.inventory||[];S.payAdjust=d.payAdjust||[];S.paySent=d.paySent||[];S.payStatus=d.payStatus||[];S.clients=d.clients||[];S.links=d.links||{};S.loaded=true;S.lastLoad=0;
    document.body.classList.toggle('ro',ro());
    const hm=HASH_P.exec(location.hash||''),hp=hm&&projFromHash(hm[1]);
    if(hp){S.tab='projektek';S.projectId=hp.id;S.draft=prepDraft(hp);S.draftBase=clone(S.draft);}
    const ht=/^#t=([a-z]+)$/.exec(location.hash||'');if(ht&&!S.projectId&&TABS().some(t=>t.id===ht[1]))S.tab=ht[1];
    if(!TABS().some(t=>t.id===S.tab))S.tab=TABS()[0].id;
    render(true);restoreScroll();try{vvRestore();}catch(e){}try{modalRestore();}catch(e){}return true;
  }catch(e){return false;}
}
async function load(quiet,announce,pre){
  if(S.loading&&!pre)return;S.loading=true;const seq=S.loadSeq=(S.loadSeq||0)+1;   // nézetváltáskor a folyamatban lévő betöltést felülírjuk
  if(!quiet&&!S.loaded)VIEW.innerHTML='<div class="loading"><span class="spin"></span>Betöltés…</div>';
  try{
    if(!pre&&S.saving)await SAVE_Q;   // ne töltsük be a régi állapotot, amíg mentés fut
    const d=pre||await call('bootstrap',S._opened?undefined:{open:true});S._opened=true;   // az első betöltés a naplóba is bekerül (belépés)
    if(seq!==S.loadSeq)return;   // közben újabb betöltés indult (pl. nézetváltás) – ezt eldobjuk
    bootCacheSave(d);
    setTimeout(()=>{try{if(S.me&&!ro()&&!isSales())prefetchCal(S.cal.month);}catch(e){}},1200);
    setTimeout(()=>{try{if(S.me&&isAdmin()&&S.users===null)loadSettings();}catch(e){}},2500);   // Beállítások előtöltése
    S.capabilities=d.capabilities||{};S.mailOn=d.mailOn;S.clientMailLive=!!d.clientMailLive;S.mailCats=d.mailCats||S.mailCats;S.mailCc=d.mailCc||S.mailCc;S.crewOrder=Array.isArray(d.crewOrder)?d.crewOrder:crewOrderLocal();S.me=d.me;S.mySales=d.mySales||[];S.deals=d.deals||[];S.salesPeople=d.salesPeople||[];S.crewDocs=d.crewDocs||[];crewDocsAutoBg();salesSyncBg();setTimeout(()=>{try{bdResume();}catch(e){}},0);if(d.crewDocsAuto){const a=d.crewDocsAuto;setTimeout(()=>toast(a.err?'Szerződés-begyűjtés a Gmailből nem sikerült: '+a.err:a.n?'📥 '+a.n+' aláírt szerződés bekerült a Gmailből: '+a.list.join(', '):'📥 Gmail-ellenőrzés: nincs új aláírt szerződés.',!!a.err),1500);}S.viewAsCrew=d.viewAsCrew||[];S.viewAsSales=d.viewAsSales||[];S.crewNames=d.crewNames||{};S.projects=(d.projects||[]).map(normProj);S.crew=d.crew||[];S.inventory=d.inventory||[];S.payAdjust=d.payAdjust||[];S.paySent=d.paySent||[];S.payStatus=d.payStatus||[];S.clients=d.clients||[];S.links=d.links||{};S.loaded=true;S.lastLoad=Date.now();
    document.body.classList.toggle('ro',ro());
    if(S.projectId){const p=projById(S.projectId);if(!p&&!S.dirty){S.projectId=null;S.draft=null;}else if(p&&!S.dirty){S.draft=prepDraft(p);S.draftBase=clone(S.draft);}}
    if(!TABS().some(t=>t.id===S.tab))S.tab=TABS()[0].id;   // pl. az értékesítő csak az Értékesítés fület látja
    if(((S.tab==='penzugy'||S.tab==='szerzodes')&&!isAdmin())||(S.tab==='beallitasok'&&ro()))S.tab='projektek';
    if(S.me&&S.me.role==='admin'&&S.capabilities&&S.capabilities.finance)finLoad(!!S.fin);else{S.fin=null;try{localStorage.removeItem('lumos_pm_fin_v1');}catch(e){}}   // az ügyvezetőnek előre betöltjük (gyorsítótárból azonnal, a friss adat a háttérben)   // a pénzügyi adatok frissítése
    if((S.tab==='stab'||S.tab==='leltar'||S.tab==='ugyfelek')&&ro())S.tab='projektek';
    const hm=HASH_P.exec(location.hash||''),hp=hm&&projFromHash(hm[1]);   // projektlink (naptáreseményből, levélből vagy frissítés után)
    if(hp&&!S.dirty&&S.projectId!==hp.id){S.tab='projektek';S.projectId=hp.id;S.draft=prepDraft(hp);S.draftBase=clone(S.draft);}
    const ht=/^#t=([a-z]+)$/.exec(location.hash||'');   // fül frissítés után
    if(ht&&!S.projectId&&TABS().some(t=>t.id===ht[1]))S.tab=ht[1];
    render(true);restoreScroll();try{vvRestore();}catch(e){}try{modalRestore();}catch(e){}if(announce)toast('Adatok frissítve');
  }catch(e){appReveal();if(!handleErr(e)&&!S.loaded)VIEW.innerHTML=`<div class="panel">${empty('Nem sikerült betölteni az adatokat: '+esc(errText(e)))}<div class="btns"><button class="btn primary" type="button" data-action="reload">Újrapróbálás</button></div></div>`;}
  finally{if(seq===S.loadSeq)S.loading=false;}
}
/* Automatikus frissítés (nincs „Frissítés” gomb): 15 mp-enként egy olcsó verziókérdés; ha valaki közben módosított, csendben újratöltünk.
   Gépelés, nyitott ablak vagy mentetlen módosítás közben várunk. */
const idleOk=()=>{const a=document.activeElement;return S.loaded&&!S.dirty&&!S.saving&&!S.loading&&document.visibilityState==='visible'&&!$('modalRoot').innerHTML&&!(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&a.type!=='checkbox');};
let VER_BUSY=false;
/* a videótábla (csak az van nyitva, nincs benne űrlap / videónéző) frissülhet: pl. az ügyfél közben jóváhagyott */
const boardIdle=()=>{const a=document.activeElement,mr=$('modalRoot');return S.loaded&&!S.dirty&&!S.saving&&!S.loading&&document.visibilityState==='visible'&&!!(mr&&mr.querySelector('.bd-modal'))&&!(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&a.type!=='checkbox')&&!document.querySelector('#modalRoot .vv-cm, #modalRoot .cf-layer');};
setInterval(async()=>{if(!TOKEN||VER_BUSY||!(idleOk()||boardIdle()))return;VER_BUSY=true;
  try{const r=await call('dataVer');const v=r&&r.v;if(v&&S.dataVer&&v!==S.dataVer&&(idleOk()||boardIdle())){S.dataVer=v;if(S.tab==='naptar')calForceFresh();const bd=boardIdle();await load(true);if(bd&&boardIdle()&&typeof bdRefresh==='function')bdRefresh();}else if(v)S.dataVer=v;}catch(e){}finally{VER_BUSY=false;}},15000);
setInterval(()=>{const mgr=S.me&&(S.me.role==='admin'||S.me.role==='editor');if(idleOk()&&Date.now()-S.lastLoad>(mgr?120000:300000))load(true);},30000);   // a vezetőknél 2 percenként (értesítések)
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
function autoGrow(t){if(!t)return;const min=Math.max(t.classList.contains('pcrew-note')?58:110,num(t.dataset.userH));t.style.height='auto';const h=Math.max(min,t.scrollHeight+2);t.style.height=h+'px';t.dataset.autoH=h;}
/* kézzel nagyobbra húzott szövegmező: az automatikus méretezés ennél kisebbre már nem húzza vissza (pl. törléskor) */
(()=>{let rt=null,h0=0;document.addEventListener('pointerdown',e=>{const t=e.target;if(t&&t.matches&&t.matches('textarea.inp')){rt=t;h0=t.offsetHeight;}else rt=null;},true);
  document.addEventListener('pointerup',()=>{if(!rt)return;const t=rt,h=t.offsetHeight;rt=null;if(Math.abs(h-h0)>3){t.dataset.userH=h;t.dataset.autoH=h;t.style.height=h+'px';}},true);})();
document.addEventListener('input',e=>{if(e.target.matches&&e.target.matches('textarea.inp'))autoGrow(e.target);});
window.addEventListener('resize',()=>VIEW.querySelectorAll('textarea.inp').forEach(autoGrow));
/* Pénzügyek: az ügyvezetőnél a Kifizetések, a Szerződés és számlázás és a Bevétel és kiadás egy fül alá kerül (alfülekkel) */
/* Csoportosított fülek: Források (Stáb + Leltár) és – az ügyvezetőnél – Pénzügyek (Termelői fizetések, Szerződés és számlázás, Bevétel és kiadás) */
const TAB_GROUPS=[{label:'Források',ids:['stab','ertekesitok','leltar'],icons:{stab:'👥 ',ertekesitok:'🤝 ',leltar:'🎒 '}},{label:'Pénzügyek',ids:['kifizetesek','szerzodes','penzugy'],icons:{kifizetesek:'⚒️ ',szerzodes:'📄 ',penzugy:'📊 '}}];
const FIN_GROUP=TAB_GROUPS[1].ids;
S.groupSub=S.groupSub||{};
const groupOf=id=>{const all=TABS();return TAB_GROUPS.find(g=>g.ids.includes(id)&&all.filter(t=>g.ids.includes(t.id)).length>1)||null;};
const finGrouped=()=>!!groupOf('penzugy')||!!groupOf('szerzodes');
function NAV_TABS(){const all=TABS(),out=[],done={};
  all.forEach(t=>{const g=groupOf(t.id);if(!g){out.push(t);return;}if(done[g.label])return;done[g.label]=1;
    const last=S.groupSub[g.label],id=last&&all.some(x=>x.id===last)?last:g.ids.find(x=>all.some(y=>y.id===x));out.push({id,label:g.label,group:g});});
  return out;}
function finSubNav(){const g=groupOf(S.tab);if(!g)return '';S.groupSub[g.label]=S.tab;
  return `<nav class="subtabs" aria-label="${esc(g.label)}">${TABS().filter(t=>g.ids.includes(t.id)).sort((a,b)=>g.ids.indexOf(a.id)-g.ids.indexOf(b.id)).map(t=>`<a class="subtab" href="#t=${esc(t.id)}" data-action="tab" data-tab="${t.id}" aria-current="${S.tab===t.id?'page':'false'}">${g.icons[t.id]||''}${t.label}</a>`).join('')}</nav>`;}
const TABS=()=>isSales()?[{id:'ertekesites',label:'Értékesítés'}].concat(S.me.crewId?[{id:'kifizetesek',label:'Kifizetések'}]:[]):(isAdmin()?[{id:'ertekesites',label:'Értékesítés'}]:[]).concat([{id:'projektek',label:ro()?'Beosztásaim':'Projektek'}]).concat(ro()?[]:[{id:'naptar',label:'Naptár'}]).concat(ro()?[{id:'naptar',label:'Naptár'}].concat([{id:'kifizetesek',label:isAdmin()?'Fizetések':'Kifizetések'}]):[{id:'stab',label:'Stáb'}].concat(isAdmin()?[{id:'ertekesitok',label:'Értékesítők'}]:[]).concat([{id:'leltar',label:'Leltár'},{id:'ugyfelek',label:'Ügyfelek'},{id:'kifizetesek',label:isAdmin()?'Fizetések':'Kifizetések'}])).concat(isAdmin()&&S.capabilities&&S.capabilities.finance?[{id:'penzugy',label:'Bevétel és kiadás'},{id:'szerzodes',label:'Szerződés és számlázás'}]:[]).concat(!ro()?[{id:'beallitasok',label:'Beállítások'}]:[]);
/* Valódi módosítás van-e: a vázlat eltér-e a betöltött állapottól (ha mindent visszacsináltál, nincs mit menteni) */
function stableJ(v){if(Array.isArray(v))return '['+v.map(stableJ).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).filter(k=>k[0]!=='_'&&v[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+stableJ(v[k])).join(',')+'}';return JSON.stringify(v===undefined?null:v);}
function draftChanged(){if(!S.draft||!S.draftBase||S.draft.id!==S.draftBase.id)return true;try{return stableJ(S.draft)!==stableJ(S.draftBase);}catch(e){return true;}}
function renderChrome(){if(S.dirty&&S.saving<=0&&!draftChanged())S.dirty=false;
  {const b=document.querySelector('.proj-save');if(b){const busy=S.saving>0;b.disabled=!S.dirty||busy;b.className='btn '+(S.dirty?'primary':'outline')+' small proj-save';b.textContent=busy?'Mentés…':S.dirty?'💾 Mentés':'✓ Mentve';}}
  const on=!!S.me;
  {let sp=$('savingPill');if(!sp){sp=document.createElement('div');sp.id='savingPill';sp.className='saving-pill';sp.setAttribute('role','status');document.body.appendChild(sp);}
    const busy=on&&S.saving>0;sp.classList.toggle('on',busy);if(busy&&!S._saveT0)S._saveT0=Date.now();if(!busy)S._saveT0=0;const sec=busy?Math.round((Date.now()-S._saveT0)/1000):0;sp.textContent=busy?'⏳ Mentés folyamatban…'+(sec>=6?' ('+sec+' mp – a szerver lassan válaszol)':''):'';if(busy){clearTimeout(S._spT);S._spT=setTimeout(()=>{try{renderChrome();}catch(e){}},1000);}}   // látszik, amíg a háttérben ment
  ['userChip','logoutBtn'].forEach(id=>$(id).classList.toggle('hidden',!on));
  const realAdmin=on&&(S.me.role==='admin'||S.me.realRole==='admin'),va=on&&S.me.viewAs;
  $('viewAs').classList.toggle('hidden',!realAdmin);$('viewAs').classList.toggle('on',!!va);
  if(realAdmin){const sel=$('viewAs');sel.value=va?va.role:'admin';const co=sel.querySelector('option[value=crew]');const inCrew=!!(va&&va.role==='crew');co.textContent=inCrew?'🔨 Szakember: '+(va.crewName||''):'🔨 Szakember';const oo=sel.querySelector('option[value=crew-other]');if(oo){oo.hidden=!inCrew;oo.disabled=!inCrew;}const so=sel.querySelector('option[value=sales]'),inSales=!!(va&&va.role==='sales'&&va.userId);if(so)so.textContent=inSales?'🤝 Értékesítő: '+(va.crewName||''):'🤝 Értékesítő';const os=sel.querySelector('option[value=sales-other]');if(os){os.hidden=!inSales;os.disabled=!inSales;}}
  const vb=$('viewBanner');vb.classList.toggle('hidden',!va);
  if(va){const h=`<span>${va.role==='crew'?'🔨':va.role==='sales'?'🤝':'⚙️'} ${va.role==='crew'?'Szakember nézet – így látja az appot <b>'+esc(va.crewName||'')+'</b>':va.role==='sales'?(va.userId?'Értékesítő nézet – így látja az appot <b>'+esc(va.crewName||'')+'</b>':'Értékesítő nézet – így látja az appot egy értékesítő (a saját lehetőségeiddel)'):'Termelési v. nézet – így látja az appot egy termelési vezető'}. Amit itt teszel, az a te nevedben történik.</span><button class="btn outline small" type="button" data-action="view-reset">Vissza: Ügyvezető</button>`;if(vb._h!==h){vb.innerHTML=h;vb._h=h;}}
  if(!on){$('tabs').innerHTML='';return;}
  $('userChip').textContent=S.me.name+' · '+roleLabel(S.me.role);
  const counts={stab:S.crew.length,leltar:S.inventory.length};   // a Projektek mellé nem kell szám
  const tabsEl=$('tabs'),keepX=tabsEl.scrollLeft;
  $('tabs').innerHTML=NAV_TABS().map(t=>`<a class="tab" role="tab" href="#t=${esc(t.id)}" aria-selected="${t.group?t.group.ids.includes(S.tab):S.tab===t.id}" data-action="tab" data-tab="${t.id}">${t.label}${counts[t.id]!=null&&!t.group?`<span class="count">${counts[t.id]}</span>`:''}</a>`).join('');   // valódi link: jobb klikk → „Megnyitás új lapon”
  tabsEl.scrollLeft=keepX;{const act=tabsEl.querySelector('[aria-selected="true"]');if(act&&tabsEl.scrollWidth>tabsEl.clientWidth){const l=act.offsetLeft-tabsEl.offsetLeft,r=l+act.offsetWidth;if(l<tabsEl.scrollLeft)tabsEl.scrollLeft=l-16;else if(r>tabsEl.scrollLeft+tabsEl.clientWidth)tabsEl.scrollLeft=r-tabsEl.clientWidth+16;}}
  const title=S.tab==='projektek'&&S.draft?(S.draft.name||'Projekt'):((groupOf(S.tab)?groupOf(S.tab).label+' · ':'')+((TABS().find(t=>t.id===S.tab)||{}).label||''));
  $('pageTitle').textContent=title;
  const bar=$('saveBar');
  const flash=!S.dirty&&S.savedFlash&&S.draft&&S.tab==='projektek';   // mentés után fél másodpercig még látszik: „✓ Mentve”
  const showBar=!!(S.dirty&&S.draft&&S.tab==='projektek'&&!ro());   // kézi mentés: mentetlen módosításnál mentési sáv
  bar.classList.toggle('hidden',!showBar&&!flash);document.body.classList.toggle('has-savebar',!!(showBar||flash));
  if(flash){const h=`<div class="savebar-in"><p>Módosítások mentve: ${esc(S.draft.name||'projekt')}</p><button class="btn primary saved-btn" type="button" disabled>✓ Mentve</button></div>`;if(bar._h!==h){bar.innerHTML=h;bar._h=h;}}
  else if(showBar){const h=`<div class="savebar-in"><p>Mentetlen módosítások: ${esc(S.draft.name||'projekt')}</p><button class="btn ghost" type="button" data-action="discard">Elvetés</button><button class="btn primary" type="button" data-action="save" title="${KBD_SAVE}">💾 Mentés <span class="kbd">${KBD_SAVE}</span></button></div>`;if(bar._h!==h){bar.innerHTML=h;bar._h=h;}}   // ugyanazt nem rajzoljuk újra, különben a Mentés gombra kattintás elveszhet
}
/* Egységes csíkozás: csoport- és hónapsorok után újrakezdve minden második adatsor enyhén zöld */
const ZB_SKIP=/(^|\s)(sep-row|pt-month|pt-group|grp|bill-month|pt-today-row)(\s|$)/;
function zebra(root){(root||document).querySelectorAll('table tbody').forEach(tb=>{let n=0;[...tb.rows].forEach(r=>{if(ZB_SKIP.test(r.className)){n=0;return;}r.classList.toggle('zb',n%2===1);r.classList.toggle('zw',n%2===0);n++;});});}
/* A cím (#p=projekt vagy #t=fül) mindig az aktuális helyet mutatja, így frissítés után ugyanide térünk vissza. */
function wantedHash(){return S.tab==='projektek'&&S.projectId?'#p='+projSlug(projById(S.projectId)||{id:S.projectId}):S.tab&&S.tab!=='projektek'?'#t='+S.tab:'';}
function syncHash(){const h=wantedHash();if((location.hash||'')!==h){try{const url=location.pathname+location.search+h;if(S._histReady)history.pushState(null,'',url);else history.replaceState(null,'',url);}catch(e){}}S._histReady=!!S.loaded;}
/* Böngésző vissza/előre: az előző nézetre (fül vagy projekt) lépünk; a folyamatban lévő módosítás előtte elmentődik. */
window.addEventListener('popstate',()=>{if(!S.me||!S.loaded)return;
  if(document.querySelector('#modalRoot .mbox')){try{history.pushState(null,'',location.pathname+location.search+wantedHash());}catch(e){}return;}   // nyitott felugró ablak alatt nincs vissza / előre lapozás
  const h=location.hash||'';
  const go=()=>{const pm=HASH_P.exec(h),tm=/^#t=([a-z]+)$/.exec(h),pp=pm&&projFromHash(pm[1]);
    if(pp){S.tab='projektek';S.projectId=pp.id;S.draft=prepDraft(pp);S.draftBase=clone(S.draft);}
    else{S.projectId=null;S.draft=null;S.tab=tm&&TABS().some(t=>t.id===tm[1])?tm[1]:'projektek';}
    const was=S._histReady;S._histReady=false;render(true);S._histReady=was;scrollTo(0,0);};
  if(typeof guard==='function')guard(go,()=>{S._histReady=true;syncHash();});else go();});
window.addEventListener('pagehide',()=>{try{sessionStorage.setItem('lpm_scroll',JSON.stringify({h:location.hash,y:Math.round(scrollY)}));}catch(e){}});
let scrollRestored=false;
function restoreScroll(){if(scrollRestored)return;scrollRestored=true;try{const v=JSON.parse(sessionStorage.getItem('lpm_scroll')||'null');if(v&&v.h===location.hash&&v.y>0)requestAnimationFrame(()=>scrollTo(0,v.y));}catch(e){}}
/* Kattintás után a kattintott rész ne ugorjon el (pl. felül megjelenő / eltűnő „Hiányzó stáb” sáv miatt):
   az újrarajzolás után a képernyő úgy görgetődik, hogy a kártya ugyanott maradjon. */
let ANCHOR=null;
function anchorKey(t){const el=t&&t.closest&&t.closest('[data-fold],section[id],div[id].panel');if(!el||!VIEW.contains(el))return null;
  return el.dataset.fold?`[data-fold="${el.dataset.fold}"]`:'#'+CSS.escape(el.id);}
['pointerdown','focusin','change','keydown'].forEach(ev=>document.addEventListener(ev,e=>{const k=anchorKey(e.target);if(!k){if(ev==='pointerdown')ANCHOR=null;return;}const el=VIEW.querySelector(k);if(el)ANCHOR={k,top:el.getBoundingClientRect().top,at:Date.now()};},true));
['wheel','touchmove'].forEach(ev=>window.addEventListener(ev,()=>{ANCHOR=null;},{passive:true}));
function anchorFix(){const a=ANCHOR;if(!a||Date.now()-a.at>1500)return;const fix=()=>{if(ANCHOR!==a)return;const el=VIEW.querySelector(a.k);if(!el)return;const d=el.getBoundingClientRect().top-a.top;if(Math.abs(d)>1)scrollBy(0,d);};
  fix();requestAnimationFrame(()=>{fix();requestAnimationFrame(fix);});setTimeout(fix,60);setTimeout(fix,250);}
const IS_MAC=typeof navigator!=='undefined'&&/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent||''),KBD_SAVE=IS_MAC?'⌘S':'Ctrl+S',KBD_UNDO=IS_MAC?'⌘Z':'Ctrl+Z';   // gyorsbillentyű felirata a géphez igazítva
function appReveal(){const h=document.documentElement;if(h.classList.contains('booting'))requestAnimationFrame(()=>h.classList.remove('booting'));}
function render(force){setTimeout(appReveal,0);
  if(!S.me)return;
  document.body.classList.toggle('proj-locked',projLocked());
  const ae=document.activeElement;
  const keep=ae&&ae.id&&VIEW.contains(ae)&&ae.tagName!=='SELECT'?{id:ae.id,s:ae.selectionStart,e:ae.selectionEnd}:null;
  renderChrome();
  if(!S.loaded)return;
  VIEW.innerHTML=finSubNav()+(S.tab==='projektek'?viewProjects():S.tab==='naptar'?viewCalendar():S.tab==='vagas'?viewCutBoard():S.tab==='stab'||S.tab==='ertekesitok'?viewCrew():S.tab==='leltar'?viewInventory():S.tab==='ugyfelek'?viewClients():S.tab==='kifizetesek'?viewPayouts():S.tab==='penzugy'?viewFinance():S.tab==='szerzodes'?viewBilling():S.tab==='beallitasok'?viewSettings():S.tab==='ertekesites'?viewSales():viewProjects());
  {const L=window.POST_RENDER||[];window.POST_RENDER=[];L.forEach(f=>{try{f();}catch(e){}});}   // még a kirajzolás előtt (pl. az idővonal görgetési helyzete) – nincs villanás
  if(['stab','ertekesitok','leltar','kifizetesek','szerzodes','penzugy'].includes(S.tab)&&!(S.tab==='kifizetesek'&&ro())){const sn=VIEW.querySelector(':scope > .subtabs'),ph=sn&&sn.nextElementSibling;if(ph&&ph.classList.contains('page-head')){ph.prepend(sn);ph.classList.add('ph-sub');}}   /* az altabok és a fejléc egy sorban */
  {const dp=S.tab==='projektek'&&S.projectId&&S.draft;VIEW.classList.toggle('proj-done',!!(dp&&(S.draft.status==='atadva'||(ro()&&crewPast(S.draft)))));}   /* lezárt projekt: minden szürke */
  VIEW.querySelectorAll('textarea.inp').forEach(autoGrow);
  markReq();zebra(VIEW);
  syncHash();
  anchorFix();
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
const siteWaiting=p=>{const r=pr(p);return !!r&&(p.status||'')==='helyszin'&&todayISO()<r.start;};   // véglegesített csapat, de a forgatás napja még nem jött el
const stageLabel=(p,id)=>id==='helyszin'&&siteWaiting(p)?'Helyszíni munkára vár':STATUS_LABEL[id]||id;
const normProj=p=>{if(p&&(!p.status||p.status==='egyeztetes'))p.status='tervezes';return p;};   // az „Egyeztetés” lépés megszűnt
/* Videó link jelszóval: ráhúzva megjelenik a jelszó, egy kattintással másolható */
function vidLink(p,cls,label,extra){if(!/^https:\/\//i.test(p.deliveryLink||''))return '';const a=`<a class="${cls}" href="${esc(p.deliveryLink)}" target="_blank" rel="noopener"${extra||''}>${label}</a>`;
  return p.deliveryPass?`<span class="pass-wrap">${a}<span class="pass-pop" role="tooltip">🔑 Jelszó: <code>${esc(p.deliveryPass)}</code><button type="button" class="pass-copy" data-action="copy-pass" data-pass="${esc(p.deliveryPass)}">Másolás</button></span></span>`:a;}
function extraLinks(p,cls){const l=(Array.isArray(p.deliveryLinks)?p.deliveryLinks:[]).filter(x=>/^https:\/\//i.test(x));
  return l.map((u,i)=>`<a class="${cls}" href="${esc(u)}" target="_blank" rel="noopener" title="${esc(u)}">${i+2}. link ↗</a>`).join('');}
const DONE_CHECK=' <span class="done-check" title="Lezárva" aria-label="Lezárva">✓</span>';
/* Figyelmeztetés a listában: a projekt csapata még nincs véglegesítve (vagy véglegesítés óta módosult) */
function crewFinalWarn(p){if(ro()||!crewFinalOn()||p.status==='atadva'||p.status==='lemondva')return '';const r=pr(p);if(r&&r.end<todayISO())return '';
  const st=crewFinalState(p);if(st==='ok')return '';
  const left=r?diffDays(todayISO(),r.start):null,soon=left!=null&&left<14,cls='p-bad';if(left==null||left>=30)return '';   // csak az utolsó 30 napban jelenik meg, akkor pirossal
  const urg=soon?(left<=0?'⏰ A rendezvény már elkezdődött! ':`⏰ Kevesebb mint két hét van a rendezvényig (${left===1?'holnap kezdődik':'még '+left+' nap'}). `):'';
  return st==='changed'?`<span class="statuspill ${cls}" data-tip="${urg}A csapat a véglegesítés óta módosult – a projekt oldalán véglegesítsd újra, hogy a tagok értesítést kapjanak.">👥 Stáb módosult</span>`
    :`<span class="statuspill ${cls}" data-tip="${urg}${crewIds(p).size?'A csapat még nincs véglegesítve – a projekt oldalán véglegesítsd, hogy a tagok bekerüljenek a naptárba és értesítést kapjanak.':'Még nincs stáb beosztva erre a projektre.'}">👥 Stáb nincs véglegesítve</span>`;}
function statusPill(p){const s=p.status||'tervezes';return `<span class="statuspill st-${esc(s)}${siteWaiting(p)?' st-wait':''}">${esc(stageLabel(p,s))}</span>${s==='tervezes'&&!ro()&&missingReq(p).length?'<span class="statuspill p-mute" data-tip="Hiányos alapadatok – a projekt oldalán pótolhatók">📝 Piszkozat</span>':''}`;}
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
  return {due,left,cls:left<=1?'bad':left<=3?'warn':'ok',txt:left<0?`${-left} napja lejárt`:left===0?'Ma kell átadni':`${left} nap az átadásig`};
}
/* Vágónak: hány nap van hátra a leadásig (rövid és hosszú felirat) */
function cutLeft(p){const di=dueInfo(p);if(!di||di.left==null)return null;const n=di.left;
  return {cls:di.cls,short:n<0?'lejárt':n===0?'ma':n+' nap',txt:n<0?`${-n} napja lejárt a leadás`:n===0?'Ma kell leadni':n===1?'Holnap kell leadni':`${n} nap van hátra a leadásig`};}
/* Szakember nézet: a lezárt projekt szürke és nem nyitható; ha nem ő vág, az utómunkára váró projekt is */
function crewDim(p){if(!ro())return false;const st=p.status||'tervezes';if(st==='atadva'||st==='lemondva')return true;
  const r=pr(p),post=POST_STAGES.includes(st)||(r&&r.end<todayISO());if(!post)return false;
  const me=S.me&&S.me.crewId;return !(me&&(p.crew||[]).some(a=>a.crewId===me&&a.role==='Vágó'));}
function myRole(p){if(!S.me||!S.me.crewId)return '';const r=[];if(p.lead===S.me.crewId)r.push('projektvezető');(p.crew||[]).forEach(a=>{if(a.crewId===S.me.crewId)r.push(a.role.toLowerCase());});return r.join(', ');}
/* Létszám: a távolról (remote) vezető projektvezető nem számít bele */
function crewN(p){const ids=crewIds(p);if(p.leadRemote&&p.lead&&!(p.crew||[]).some(c=>c.crewId===p.lead))ids.delete(p.lead);return ids.size;}
function evRow(p,opt={}){
  const r=pr(p),T=todayISO();
  const sub=(ro()?[p.venue]:[p.client,p.venue]).filter(Boolean).join(' · ')||(ro()?'':'Nincs ügyfél megadva');
  const days=r&&r.end!==r.start?` · ${diffDays(r.start,r.end)+1} napos`:'';
  const crewPast=ro()&&r&&r.end<T;let side=crewPast?'':statusPill(p);   // szakember: a múltbeli munkánál csak a szerepe látszik
  const di=dueInfo(p);
  if(!crewPast&&di&&r&&(r.end<T||POST_STAGES.includes(p.status)))side+=`<span class="statuspill p-${di.cls}">${di.txt}</span>`;
  if(ro()){const m=myRole(p);if(m)side+=`<span class="smallnum">Te: ${esc(m)}</span>`;if(!crewPast&&p.myFee&&num(p.myFee.amount))side+=`<span class="smallnum fee-chip">${(p.penalties||[]).length?penIcon(p):''}${ftFmt(myNet(p))} nettó</span>`;}
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
function shortName(n){n=String(n||'').trim();const w=n.split(/\s+/);if(w.length<2)return n.length<=13?n:n.slice(0,12)+'…';   /* mindig „E. Ervin” formában */const s=w.slice(0,-1).map(x=>x[0]+'.').join(' ')+' '+w[w.length-1];return s.length<=16?s:s.slice(0,15)+'…';}
/* Levonások indoka (a cellára vagy a szirénára mutatva látszik) */
function penReasons(p,cid){return penOf(p,cid,'approved').filter(x=>x.kind!=='damage').map(x=>`${(PEN_KINDS[x.kind]||{}).label||'Díjcsökkentés'} ${num(x.pct)}%${x.day?' ('+dayLbl(x.day)+')':''}: ${x.reason||''}${x.caseText?' – '+x.caseText:''}`).join('\n');}
/* Havi díjösszesítő adatai egy szakembernek – ugyanaz a számítás, mint a Termelői fizetések táblázatban */
/* Bennhagyott egyenleg: a kiküldött díjösszesítő és a ténylegesen kiszámlázott (NAV) összeg különbsége, hónapról hónapra gyűlik.
   Kevesebbet számlázott → nő; többet (a bennhagyottból is) → csökken. incl: az adott hónap is beleszámít. */
function retainedBal(cid,month,incl){const items=[];let bal=0;
  (S.payStatus||[]).filter(x=>x.crewId===cid&&x.invoicedAt&&(incl?String(x.month)<=month:String(x.month)<month)).sort((a,b)=>String(a.month).localeCompare(String(b.month))).forEach(x=>{
    const s=(S.paySent||[]).find(y=>y.crewId===cid&&String(y.month)===String(x.month));if(!s)return;
    const due=Math.round(num(s.amount)),inv=x.invoiceNo?Math.round(num(x.invoiceNet)):due,d=due-inv;if(!d)return;bal+=d;items.push({m:String(x.month),due,inv,d});});
  return {bal,items};}
/* Értékesítő díjazása egy hónapra: fix fizetés + a hónapban szerződött lehetőségek jutaléka (csak az ügyvezető és maga az értékesítő kapja meg az adatot) */
/* Fiók nélküli értékesítő (munkatárs): a jutaléka projektenként, a projekt hónapjában – úgy, mint egy díj */
const dealCrewId=d=>String(d.ownerId||'').indexOf('crew:')===0?String(d.ownerId).slice(5):(d.ownerCrewId||'');
const crewSalesComm=()=>(S.deals||[]).filter(d=>d.stage==='nyert'&&dealCrewId(d)).map(d=>{const p=projById(d.projectId);if(!p||p.status==='lemondva'||!pr(p))return null;const e=salesCommEst(p,d);return e&&e.amt?{p,cid:dealCrewId(d),amt:e.amt}:null;}).filter(Boolean);
function salesPayOf(month,cid){const sp=(S.salesPeople||[]).find(x=>x.crewId===cid&&String(x.userId||'').indexOf('crew:')!==0);if(!sp)return null;
  const salary=month>=PAY_START&&(!sp.since||month>=sp.since)?num(sp.salary):0;
  const m=(sp.comm||{})[month]||{base:0,amount:0,items:[]},items=m.items||[],comm=num(m.amount);   // havi, sávos jutalék a kifizetett nettó bevételből (szerver számolja)
  return salary||comm?{salary,comm,base:num(m.base),items,sp,total:salary+comm}:null;}
const commTierTxt=s=>`${num(s.commLow)}% ${ftFmt(num(s.commLimit))}-ig, felette ${num(s.commHigh)}%`;
/* Mikorra számít a szakember díja: mindig a projekt (első) napjára – a vágó díja sem válik le külön vágási határidőre */
function payDate(p,cid){return pr(p).start;}
const payMonth=(p,cid)=>payDate(p,cid).slice(0,7);
function payStatementData(month,cid){
  const rows=[],pens=[],stamp=s=>{const d=String(s||'').slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(d)?d.replace(/-/g,'.')+'.':'';};
  const dl=r=>r.start===r.end?fmtShort(r.start):r.start.slice(0,7)===r.end.slice(0,7)?fmtShort(r.start).replace(/\.$/,'')+'–'+Number(r.end.slice(8))+'.':fmtShort(r.start)+' – '+fmtShort(r.end);
  const workDays=(p,cid,r)=>{   // csak azok a napok, amelyeken a szakember ténylegesen dolgozott
    const ds=projDays(p).length>1&&!isPostOnly(p,cid)?crewDaysOf(p,cid).slice().sort():[];if(!ds.length)return dl(r);
    const runs=[];ds.forEach(d=>{const last=runs[runs.length-1];if(last&&diffDays(last.e,d)===1)last.e=d;else runs.push({s:d,e:d});});
    return runs.map((x,i)=>{const lbl=dl({start:x.s,end:x.e});return i&&runs[i-1].s.slice(0,7)===x.s.slice(0,7)?lbl.replace(/^\D+\s*/,''):lbl;}).join(', ');};
  S.projects.filter(p=>p.status!=='lemondva'&&pr(p)&&(pr(p).start.slice(0,7)===month||payMonth(p,cid)===month)).sort(byStart).forEach(p=>{const r=pr(p),pd=payDate(p,cid),mine=pd.slice(0,7)===month,refOk=pr(p).start.slice(0,7)===month,dTxt=pd.slice(0,7)!==r.start.slice(0,7)?fmtShort(pd)+' (vágási határidő)':null;
    (p.fees||[]).forEach(f=>{
      if(f.kind==='fixed'){if(f.refCrewId===cid&&num(f.amount)&&refOk)rows.push({date:dl(r),name:'Ajánlói jutalék – '+(p.name||''),roles:'',fee:num(f.amount),ded:0});return;}
      if(f.crewId!==cid||!num(f.amount)||!mine)return;const ded=penDeduct(p,cid,f.amount);
      const rl=[...new Set((p.crew||[]).filter(a=>a.crewId===cid).map(a=>a.role))],split=isSplitCut(p,f)&&postAmt(f)>0;   // a projektben betöltött szerep(ek)
      rows.push({date:dTxt||workDays(p,cid,r),name:p.name||'Névtelen projekt',roles:(split?rl.filter(x=>x!=='Vágó'):rl).join(', '),fee:num(f.amount)-(split?postAmt(f):0),ded});
      if(split)rows.push({date:dTxt||workDays(p,cid,r),name:p.name||'Névtelen projekt',roles:'Vágás',fee:postAmt(f),ded:0});   // a vágás külön sorban
      if(ded)penOf(p,cid,'approved').filter(x=>x.kind!=='damage').forEach(x=>{const k=PEN_KINDS[x.kind]||{},da=f.dayAmounts||{};
        pens.push({project:p.name||'',amount:penAmt(p,x,f.amount),kind:k.label||'Díjcsökkentés',ref:k.ref||'',pct:num(x.pct),
          day:x.day?`a ${x.day.slice(5).replace('-','.')}-i${projDays(p).indexOf(x.day)>=0?` (${projDays(p).indexOf(x.day)+1}. nap)`:''} napi díjad, ${ftFmt(num(da[x.day]))}`:'',caseText:x.caseText||'',reason:x.reason||'',
          by:x.decidedBy&&x.decidedBy!==x.by?`Javasolta: ${x.by}, ${stamp(x.at)} · Jóváhagyta: ${x.decidedBy}`:`Kirótta: ${x.by||''}${stamp(x.at)?', '+stamp(x.at):''}`});});});});
  crewSalesComm().filter(x=>x.cid===cid&&pr(x.p).start.slice(0,7)===month).forEach(x=>rows.push({date:fmtShort(pr(x.p).start),name:'Értékesítői jutalék – '+(x.p.name||''),roles:'Értékesítő',fee:x.amt,ded:0,kind:'sales'}));
  const cr=crewById(cid),rent=OFFICE_RENT.filter(o=>cr&&o.name===cr.name).reduce((s,o)=>s+o.amount,0);
  {const sp=salesPayOf(month,cid);if(sp){const mn=F_YM.format(toDate(month+'-01'));if(sp.salary)rows.push({date:mn,name:'Fix fizetés',roles:'Értékesítő',fee:sp.salary,ded:0,kind:'salary'});
    if(sp.comm)rows.push({date:mn,name:'Értékesítési jutalék',roles:`jutalékalap ${ftFmt(sp.base)} (kifizetett nettó bevétel: ${sp.items.map(d=>d.name).filter((x,i,a)=>a.indexOf(x)===i).join(', ')}) · ${commTierTxt(sp.sp)}`,fee:sp.comm,ded:0,kind:'sales'});}}
  const ajs=(S.payAdjust||[]).filter(x=>x.crewId===cid&&String(x.month)===month&&num(x.amount)),adj=ajs.reduce((s,x)=>s+num(x.amount),0);
  const total=rows.reduce((s,r)=>s+r.fee-r.ded,0)+rent+adj;
  return {month,crewId:cid,rows,pens,rent,adj,adjs:ajs.map(x=>({amount:num(x.amount),note:x.note||'',by:[x.updatedBy,stamp(x.updatedAt)].filter(Boolean).join(', ')})),total,retained:Math.max(0,retainedBal(cid,month,false).bal)};}
const ftCell=n=>{const v=moneyFmt(n);return v?v+'\u00a0Ft':v;};   // kifizetések táblázat: összeg Ft-tal
function viewPayouts(){
  const crewMode=ro()||isSales(),noSum=crewMode||!isAdmin(),myId=crewMode?((S.me.viewAs&&S.me.viewAs.crewId)||S.me.crewId):'';
  const cur=todayISO().slice(0,7),by={},kept={};   // kept: díjcsökkentés miatt nem kerül kifizetésre (hónap → szakember)
  const why=(p,cid,f,isRef)=>isRef?'🤝 Ajánlói jutalék':(String(f&&f.task||'').trim()||[...new Set((p.crew||[]).filter(a=>a.crewId===cid).map(a=>a.role))].join(' + ')||'Díj');   // jogcím: a díjsor feladata (szerep)
  const add=(p,cid,amount,ded,isRef,lbl)=>{const d=isRef?pr(p).start:payDate(p,cid),m=d.slice(0,7),net=num(amount)-ded;if(ded){const k=(kept[m]=kept[m]||{});k[cid]=(k[cid]||0)+ded;}const dS=pr(p).start.slice(0,7)===m?pr(p).start:d;/* ugyanabban a hónapban a projekt a forgatás napjánál marad, a vágás nem válik külön */const b=(by[m]=by[m]||{}),key=p.id,row=(b[key]=b[key]||{p,d:dS,cells:{},ded:{}});if(dS<row.d)row.d=dS;/* egy hónapon belül projektenként egy sor */row.cells[cid]=(row.cells[cid]||0)+net;if(lbl){const w=(row.why=row.why||{});(w[cid]=w[cid]||[]).push({l:lbl,a:num(amount)});}if(ded)row.ded[cid]=(row.ded[cid]||0)+ded;};
  S.projects.filter(p=>p.status!=='lemondva'&&pr(p)).forEach(p=>{
    if(crewMode){if(myId&&p.myFee&&num(p.myFee.amount))add(p,myId,p.myFee.amount,penDeduct(p,myId,p.myFee.amount),false,why(p,myId,p.myFee,false));return;}   // szakember: csak a saját díja
    (p.fees||[]).forEach(f=>{const ref=f.kind==='fixed'&&f.refCrewId,cid=ref?f.refCrewId:f.kind==='fixed'?'':f.crewId;if(!cid||!num(f.amount))return;   // az ajánlói jutalék is a szakembernek jár
      add(p,cid,f.amount,ref?0:penDeduct(p,cid,f.amount),!!ref,why(p,cid,f,!!ref));});});
  if(!crewMode)crewSalesComm().forEach(x=>add(x.p,x.cid,x.amt,0,true,'💼 Értékesítői jutalék'));   // projektenkénti értékesítői jutalék
  if(crewMode&&myId)((S.mySales||[]).length?S.mySales:(S.deals||[]).length?crewSalesComm().filter(x=>x.cid===myId).map(x=>({projectId:x.p.id,amount:x.amt})):[]).forEach(x=>{const p=projById(x.projectId)||{id:x.projectId,name:x.name,date:x.date,endDate:x.endDate,status:'tervezes',crew:[],fees:[]};if(pr(p))add(p,myId,x.amount,0,true,'💼 Értékesítői jutalék');});   // a szakember saját értékesítői jutalékai
  const months=Object.keys(by).concat([cur]).filter((v,i,a)=>a.indexOf(v)===i).sort().reverse();
  const sel=/^\d{4}-\d{2}$/.test(S.payMonth||'')?S.payMonth:(by[cur]?cur:months[0]||cur),rows=Object.values(by[sel]||{}).sort((a,b)=>a.d.localeCompare(b.d)||byStart(a.p,b.p));
  const spOn=(S.salesPeople||[]).filter(x=>!crewMode||x.crewId===myId).map(x=>({cid:x.crewId,p:salesPayOf(sel,x.crewId)})).filter(x=>x.p),sp=c=>{const x=spOn.find(y=>y.cid===c);return x?x.p.total:0;},spTotal=spOn.reduce((s,x)=>s+x.p.total,0);   // értékesítő: fix + jutalék
  const rentOn=OFFICE_RENT.map(r=>({c:(S.crew||[]).find(x=>x.name===r.name),amount:r.amount})).filter(r=>r.c&&(!crewMode||r.c.id===myId)),rent=c=>rentOn.filter(r=>r.c.id===c).reduce((s,r)=>s+r.amount,0);   // fix havi irodabérlet
  const keptM=kept[sel]||{},keptTotal=Object.values(keptM).reduce((s,x)=>s+x,0);
  const adjL=(S.payAdjust||[]).filter(x=>String(x.month)===sel&&num(x.amount)&&(!crewMode||x.crewId===myId)),adjsOf=c=>adjL.filter(x=>x.crewId===c),adj=c=>adjsOf(c).reduce((s,x)=>s+num(x.amount),0),adjTotal=adjL.reduce((s,x)=>s+num(x.amount),0);   // havi korrekció (+/−)
  const sellerC=new Set(spOn.map(x=>x.cid).concat(crewMode?[]:crewSalesComm().map(x=>x.cid)));
  const tot_=c=>rows.reduce((s,r)=>s+num(r.cells[c]),0)+rent(c)+adj(c)+sp(c),cids=crewMode?[myId]:[...new Set(rows.flatMap(r=>Object.keys(r.cells)).concat(rentOn.map(r=>r.c.id),adjL.map(x=>x.crewId),spOn.map(x=>x.cid)))].sort((a,b)=>(sellerC.has(a)-sellerC.has(b))||tot_(b)-tot_(a)||((crewById(a)||{}).name||'').localeCompare((crewById(b)||{}).name||'','hu'));   // a havi összeg szerint csökkenő sorrend, az értékesítők a végén
  const colSum=cid=>rows.reduce((s,r)=>s+(r.cells[cid]||0),0)+rent(cid)+adj(cid)+sp(cid),rowSum=r=>Object.values(r.cells).reduce((s,x)=>s+x,0),rentTotal=rentOn.reduce((s,r)=>s+r.amount,0),total=rows.reduce((s,r)=>s+rowSum(r),0)+rentTotal+adjTotal+spTotal;
  const sgn=v=>(v>0?'+':v<0?'−':'')+ftCell(Math.abs(v));
  const canAdj=(isAdmin()||S.me.role==='editor')&&!crewMode,sentTo=c=>(S.paySent||[]).some(y=>y.crewId===c&&String(y.month)===sel);
  const adjCell=(c,k)=>{const x=adjsOf(c)[k],v=x?num(x.amount):0,inner=v?`<span class="${v<0?'bad-txt':'ok-txt'}">${sgn(v)}</span>`:'<span class="muted">–</span>',tip=x?esc(`${x.note||''}${x.updatedBy?'\n– '+x.updatedBy+(x.updatedAt?', '+String(x.updatedAt).slice(0,10):''):''}`):'';
    return canAdj?`<td class="r"><button class="adj-btn" type="button" data-action="pay-adj" data-cid="${esc(c)}" data-month="${sel}" data-id="${x?esc(x.id):''}"${tip?` data-tip="${tip}"`:` data-tip="Korrekció hozzáadása${sentTo(c)?' (a díjösszesítő már kiment – utána küldd ki újra)':''}"`}>${inner}</button></td>`:`<td class="r"${tip?` data-tip="${tip}" tabindex="0"`:''}>${inner}</td>`;};
  const adjN=Math.max(0,...cids.map(c=>adjsOf(c).length)),adjRowsN=adjN+(canAdj&&cids.length&&(!adjN||(S.adjNewRow===sel))?1:0);
  const adjRow=Array.from({length:adjRowsN},(_,k)=>{const rs=cids.reduce((s,c)=>{const x=adjsOf(c)[k];return s+(x?num(x.amount):0);},0);
    return `<tr class="pay-adj"><td>± Korrekció <span class="muted" style="font-weight:500">(levonás / hozzáadás)</span>${canAdj&&k===adjRowsN-1&&adjN&&S.adjNewRow!==sel?` <button type="button" class="adj-new" data-action="pay-adj-row" data-month="${sel}" >＋ Új korrekció</button>`:''}</td>${cids.map(c=>adjCell(c,k)).join('')}${noSum?'':`<td class="r"><b>${rs?sgn(rs):'–'}</b></td>`}</tr>`;}).join('');
  const keptRow=keptTotal?`<tr class="pay-left"><td>🚨 Nem kerül kifizetésre</td>${cids.map(c=>`<td class="r">${keptM[c]?ftCell(keptM[c]):'<span class="muted">–</span>'}</td>`).join('')}${noSum?'':'<td></td>'}</tr>`:'';   // az összesen oszlopba nem kerül
  const stOf=c=>(S.payStatus||[]).find(x=>x.crewId===c&&String(x.month)===sel)||{},sentOf=c=>(S.paySent||[]).find(x=>x.crewId===c&&String(x.month)===sel);
  const dshort=d=>/^\d{4}-\d{2}-\d{2}/.test(String(d||''))?fmtShort(String(d).slice(0,10)):'';
  const empC=c=>isEmployee(crewById(c));
  const nameOf=c=>(crewById(c)||{}).name||(S.crewNames||{})[c]||(crewMode?(S.me.viewAs&&S.me.viewAs.crewName)||S.me.name:'Munkatárs');
  const stCell=(c,f)=>{if(f!=='paid'&&empC(c))return `<td class="r pay-st"><span class="muted" data-tip="Bérszámfejtett (munkaviszony / megbízás) – a könyvelő számfejti, nem állít ki számlát">bér</span></td>`;
    const adm=isAdmin()&&!crewMode,cur=Math.round(colSum(c)),sx=sentOf(c);
    if(f==='sent'){const s=sx,chg=s&&Math.round(num(s.amount))!==cur;
      const tip=s?esc(`📧 Kiküldve: ${s.sentAt}${s.sentBy?' · '+s.sentBy:''}\nCímzett: ${s.email||'–'}\nÖsszeg: ${ftFmt(num(s.amount))}${s.subject?'\nTárgy: '+s.subject:''}${chg?`\nℹ️ Azóta változott: most ${ftFmt(cur)} – érdemes újraküldeni`:''}`):'';
      const sendBtn=adm?`<button class="pst-act${s?'':' full'}" type="button" data-action="pay-mail" data-month="${sel}" data-cid="${esc(c)}" data-tip="${esc((s?'Díjösszesítő újraküldése: ':'Díjösszesítő kiküldése: ')+nameOf(c))}">${s?'újraküldés':'küldés'} 📧</button>`:'';
      if(!s)return `<td class="r pay-st">${adm?sendBtn:'<span class="muted">–</span>'}</td>`;
      return `<td class="r pay-st"><span class="pst-sent${chg?' chg':''}" role="button" tabindex="0" data-action="pay-sent-open" data-month="${sel}" data-cid="${esc(c)}" data-tip="${tip}${s.hasHtml?'&#10;Kattints a levél megnyitásához':''}">✓ ${esc(dshort(s.sentAt))}${chg?' ℹ️':''}</span>${adm?`<div class="pst-sub">${sendBtn}</div>`:''}</td>`;}
    const st=stOf(c),on=!!st[f+'At'],nav=f==='invoiced'&&st.invoiceNo,due=sx?Math.round(num(sx.amount)):cur,invN=Math.round(num(st.invoiceNet)),diff=nav&&invN!==due,part=diff&&!!sx;   // kiküldött díjösszesítőnél a különbség bennhagyás (vagy a bennhagyottból számlázott)   // a kiküldött díjösszesítőhöz mérjük (ha nincs, a mostani összeghez)
    const tip=on?esc(`${f==='paid'?'Fizetve':'Számla kelte'}: ${st[f+'At']}${st[f+'By']?' · '+st[f+'By']:''}${nav?`\nNAV: ${st.invoiceNo} · nettó ${ftFmt(num(st.invoiceNet))}${diff?` – ⚠️ eltér a ${sx?'kiküldött díjösszesítőtől':'fizetendőtől'} (${ftFmt(due)})`:` – egyezik a ${sx?'kiküldött díjösszesítővel':'fizetendővel'}`}${sx&&cur!==due?`\nℹ️ A díjösszesítő kiküldése óta változott: most ${ftFmt(cur)}`:''}`:''}`):'';
    const refresh=f==='invoiced'&&adm?`<button class="nav-one" type="button" data-action="nav-sync" data-month="${sel}" data-cid="${esc(c)}" data-tip="${esc(nameOf(c)+' számlájának lekérdezése a NAV-ból'+(nav?' (újrapárosítás)':''))}" aria-label="NAV-lekérdezés">🔄</button>${nav?`<button class="nav-one" type="button" data-action="nav-unpair" data-month="${sel}" data-cid="${esc(c)}" data-nos="${esc(st.invoiceNo)}" data-tip="${esc('Téves párosítás törlése: '+st.invoiceNo)}" aria-label="Párosítás törlése">✕</button>`:''}`:'';
    const badge=nav?`<div class="pst-sub"><button type="button" class="nav-badge${diff?' diff':''}" data-action="nav-inv" data-nos="${esc(st.invoiceNo)}" data-tax="${esc(st.invoiceTax||'')}" data-tip="${esc(`🧾 ${st.invoiceNo}\nKelt: ${dshort(st.invoicedAt)||st.invoicedAt||'–'} · nettó ${ftFmt(num(st.invoiceNet))}\n${diff?`⚠️ Eltér: ${sx?'díjösszesítő':'fizetendő'} ${ftFmt(due)}`:`✓ Egyezik a ${sx?'díjösszesítővel':'fizetendővel'}`}${sx&&cur!==due?`\nℹ️ Azóta változott: most ${ftFmt(cur)}`:''}\nKattints a megnyitáshoz`)}">${diff?'⚠️ ':''}${esc((()=>{const a=String(st.invoiceNo).split(/\s*,\s*/);return a[0]+(a.length>1?' +'+(a.length-1):'');})())}</button></div>`:'';
    let main;
    if(on&&nav)main=`<button type="button" class="pst-card${part?' part':diff?' diff':''}" data-action="nav-inv" data-nos="${esc(st.invoiceNo)}" data-tax="${esc(st.invoiceTax||'')}" data-tip="${esc(`🧾 ${st.invoiceNo}\nKelt: ${st.invoicedAt||'–'} · nettó ${ftFmt(num(st.invoiceNet))}\n${part?(invN<due?`↓ Részszámla: díjösszesítő ${ftFmt(due)} – bennhagyva ${ftFmt(due-invN)}`:`↑ ${ftFmt(invN-due)}-tal több: a bennhagyott egyenlegből`)+`\nBennhagyott egyenleg összesen: ${ftFmt(retainedBal(c,sel,true).bal)}`:diff?`⚠️ Eltér: fizetendő ${ftFmt(due)}`:`✓ Egyezik a ${sx?'díjösszesítővel':'fizetendővel'}`}${sx&&cur!==due?`\nℹ️ Azóta változott: most ${ftFmt(cur)}`:''}\nKattints a számla megnyitásához`)}"><span>${part?(invN<due?'↓':'↑'):diff?'⚠️':'✓'} ${esc(dshort(st[f+'At']))}</span><small>${esc((()=>{const a=String(st.invoiceNo).split(/\s*,\s*/);return a[0]+(a.length>1?' +'+(a.length-1):'');})())}</small></button>`;   // számla: dátum + sorszám egy kártyán
    else if(on)main=`<span class="pst-sent"${tip?` data-tip="${tip}"`:''}>✓ ${esc(dshort(st[f+'At']))}</span>`;   // nem vonható vissza
    else if(adm){const lock=f==='paid'&&!empC(c)&&!st.invoicedAt;   // kifizetés csak kiállított számla után (bérszámfejtettnél nincs számla)
      main=`<label class="pst-chk${lock?' locked':''}"${lock?` data-tip="${esc(nameOf(c)+': előbb a számla kiállítása kell')}"`:''}><input type="checkbox" data-pay-st="${f}" data-cid="${esc(c)}" data-month="${sel}"${lock?' disabled':''}> ${f==='paid'?'<span class="pst-word">kifizetve</span>':''}</label>`;}
    else main='<span class="muted">–</span>';
    return `<td class="r pay-st"><div class="pst-line">${main}${refresh}</div>${on&&nav?'':badge}</td>`;};
  const stIds=f=>f==='paid'?cids:cids.filter(c=>!empC(c)),stCount=f=>stIds(f).filter(c=>f==='sent'?!!sentOf(c):!!stOf(c)[f+'At']).length;
  const statusRows=cids.length?[['sent','📧 Díjösszesítő'],['invoiced','🧾 A számla kiállítása'],['paid','Számla kifizetése']].map(([f,l],k)=>{const wait=c=>f==='paid'&&!stOf(c).invoicedAt,allW=f==='paid'&&cids.every(wait);   // amíg a számla nincs kiállítva, a „Számla fizetve” sor szürke
    return `<tr class="pay-strow${k===0?' first':''}${allW?' st-wait':''}"><td>${l}</td>${cids.map(c=>wait(c)&&!allW?stCell(c,f).replace('<td class="','<td class="st-wait-c '):stCell(c,f)).join('')}${noSum?'':`<td class="r"><b>${stCount(f)}/${stIds(f).length}</b></td>`}</tr>`;}).join(''):'';
  const bhOf=c=>{const it=retainedBal(c,sel,true).items.find(x=>x.m===sel);return it?it.d:0;},bhTot=cids.reduce((a,c)=>a+bhOf(c),0);   // ebben a hónapban bennhagyott (+) / a bennhagyottból kiszámlázott (−)
  const bhRow=cids.some(c=>bhOf(c))?`<tr class="pay-bh"><td>💼 Bennhagyva <span class="muted" style="font-weight:500">(nem számlázta ki / a korábbiból számlázta)</span></td>${cids.map(c=>{const d=bhOf(c);return `<td class="r">${d?`<span data-tip="${esc(d>0?`${nameOf(c)} ebből a hónapból ${ftFmt(d)}-ot nem számlázott ki – nála gyűlik, később kiszámlázhatja.`:`${nameOf(c)} ${ftFmt(-d)}-tal többet számlázott: a korábban bennhagyott egyenlegéből.`)}" tabindex="0" style="color:${d>0?'#2c6a9a':'#1f6b3d'};font-weight:700">${d>0?'−':'+'}${ftCell(Math.abs(d))}</span>`:'<span class="muted">–</span>'}</td>`;}).join('')}<td class="r"><b>${bhTot?(bhTot>0?'−':'+')+ftCell(Math.abs(bhTot)):'–'}</b></td></tr>`:'';
  const monthDue=(m,c)=>Object.values(by[m]||{}).reduce((a,r)=>a+num(r.cells[c]),0)+rent(c)+(S.payAdjust||[]).filter(x=>x.crewId===c&&String(x.month)===m).reduce((a,x)=>a+num(x.amount),0)+((salesPayOf(m,c)||{}).total||0);   // szakember nézet: a saját díjaiból (a projekt díjlistáját nem kapja meg)
  const owe=c=>{const items=[];let bal=0;   // még kifizetendő: hónaponként a kiküldött díjösszesítő (ha még nem ment ki, az aktuális összeg), mínusz amit már kifizettünk – PAY_START-tól a kiválasztott hónapig
    for(let m=PAY_START;m<=sel;m=(x=>{const y=Number(x.slice(0,4)),k=Number(x.slice(5,7));return new Date(Date.UTC(y,k,1)).toISOString().slice(0,7);})(m)){
      const sx=(S.paySent||[]).find(y=>y.crewId===c&&String(y.month)===m),due=sx?Math.round(num(sx.amount)):Math.round(crewMode?monthDue(m,c):payStatementData(m,c).total);if(!due)continue;
      const st=(S.payStatus||[]).find(y=>y.crewId===c&&String(y.month)===m)||{},paid=st.paidAt?(st.invoiceNo?Math.round(num(st.invoiceNet)):due):0;bal+=due-paid;items.push({m,due,paid,sent:!!sx});}
    return {bal,items};};
  const retB=Object.fromEntries(cids.map(c=>[c,owe(c)])),retTot=cids.reduce((a,c)=>a+retB[c].bal,0);
  const prevB=c=>{const it=retB[c].items.filter(x=>x.m<sel);return {bal:it.reduce((a,x)=>a+x.due-x.paid,0),items:it};},prevTot=cids.reduce((a,c)=>a+prevB(c).bal,0);
  const balCell=(c,r,lbl)=>{if(!isAdmin()&&!crewMode&&c!==S.me.crewId)return '<td class="pay-blank"></td>';return `<td class="r">${r.items.length?`<span tabindex="0" data-tip="${esc(nameOf(c)+' – '+lbl+': '+ftFmt(r.bal)+'\n'+r.items.map(x=>`${F_YM.format(toDate(x.m+'-01'))}: ${x.sent?'díjösszesítő':'összesen'} ${ftFmt(x.due)}, kifizetve ${ftFmt(x.paid)}${x.due-x.paid?` → ${ftFmt(x.due-x.paid)}`:' ✓'}`).join('\n'))}"><b${r.bal?'':' class="ok-txt"'}>${ftFmt(r.bal)}</b></span>`:'<b class="ok-txt">0 Ft</b>'}</td>`;};
  const retRow=cids.length?`<tr class="pay-strow pay-ret pay-prev"><td>💼 Egyenleg <span class="muted" style="font-weight:500">(még fizetendő az előző hónapokból)</span></td>${cids.map(c=>balCell(c,prevB(c),'elmaradás az előző hónapokból')).join('')}${noSum?'':isAdmin()?`<td class="r"><b>${ftFmt(prevTot)}</b></td>`:'<td class="pay-blank"></td>'}</tr>`
    +`<tr class="pay-strow pay-ret pay-alltot"><td>💰 Összesen <span class="muted" style="font-weight:500">(még fizetendő, ezzel a hónappal együtt)</span></td>${cids.map(c=>balCell(c,retB[c],'még kifizetendő összesen')).join('')}${noSum?'':isAdmin()?`<td class="r"><b>${ftFmt(retTot)}</b></td>`:'<td class="pay-blank"></td>'}</tr>`:'';
  const spRow=spOn.length?`<tr class="pay-sales"><td>💼 Értékesítés <span class="muted" style="font-weight:500">(fix fizetés + jutalék)</span></td>${cids.map(c=>{const x=spOn.find(y=>y.cid===c);if(!x)return '<td class="r"><span class="muted">–</span></td>';
    const tip=[x.p.salary?'Fix fizetés: '+ftFmt(x.p.salary):''].concat(x.p.items.map(d=>`${d.name}${d.invNo?' ('+d.invNo+')':''}: kifizetve ${fmtShort(d.paidAt)} · nettó ${ftFmt(d.paidNet)}${d.base!==d.paidNet?' · jutalékalap '+ftFmt(d.base):''}`).concat(x.p.comm?[`Jutalékalap ${ftFmt(x.p.base)} → jutalék ${ftFmt(x.p.comm)} (${commTierTxt(x.p.sp)})`]:[])).filter(Boolean).join('\n');
    return `<td class="r" data-tip="${esc(tip)}" tabindex="0">${ftCell(x.p.total)}</td>`;}).join('')}${noSum?'':`<td class="r"><b>${ftCell(spTotal)}</b></td>`}</tr>`:'';
  const rentRow=rentOn.length?`<tr><td>🏢 Irodabérleti és termelési vezetői díj</td>${cids.map(c=>`<td class="r">${rent(c)?ftCell(rent(c)):'<span class="muted">–</span>'}</td>`).join('')}${noSum?'':`<td class="r"><b>${ftCell(rentTotal)}</b></td>`}</tr>`:'';
  const cell=(r,c)=>{const d=r.ded[c],wl=r.why&&r.why[c]||[],jc=wl.map(x=>wl.length>1?x.l+': '+moneyFmt(x.a)+' Ft':x.l).join('\n'),why=esc([jc,d?`Díjcsökkentés: −${moneyFmt(d)} Ft\n`+penReasons(r.p,c):''].filter(Boolean).join('\n'));   // jogcím (szerep) + díjcsökkentés
    return `<td class="r${d?' pay-ded':''}"${why&&r.cells[c]!=null?` data-tip="${why}" tabindex="0"`:''}>${r.cells[c]!=null?ftCell(r.cells[c])||0:'<span class="muted">–</span>'}${d?`<small class="pay-ded-note">🚨 −${ftCell(d)}</small>`:''}</td>`;};
  const colW=`<colgroup><col class="pay-c-proj">${cids.map(()=>'<col class="pay-c-person">').join('')}${noSum?'':'<col class="pay-c-sum">'}</colgroup>`;
  return `<div class="page-head${crewMode?' pay-head-c':''}"><div class="grow"><div class="ph-ttl"><h2>${isAdmin()?'Fizetések':'Kifizetések'}</h2>${crewMode?'<p class="sub">Nettó fizetésed tételesen</p>':''}</div>${crewMode?'':monthNav('pay-month',months,sel)}</div>
      ${isAdmin()&&!crewMode?`<button class="btn outline small" type="button" data-action="nav-sync" data-month="${sel}" data-tip="A bejövő számlák lekérdezése a NAV Online Számla rendszeréből, és párosítás a kiküldött díjösszesítőkhöz (a munkatárs adószáma alapján). Naponta reggel magától is lefut.">🔄 Mindenki számlája a NAV-ból</button><button class="btn outline small" type="button" data-action="pay-mail" data-month="${sel}">📧 Díjösszesítők kiküldése</button>`:''}</div>
    ${crewMode?`<div class="pay-cbox">${monthNav('pay-month',months,sel)}`:''}${sel<PAY_START?`<div class="panel pay-nodata"><p style="margin:0;font-size:15px">🗂️ <b>Erről a hónapról nincs adat az appban.</b></p><p class="hint" style="margin:6px 0 0">A termelői fizetéseket a projekttervező 2026 októberétől követi – a korábbi hónapok elszámolása az app előtti nyilvántartásban van.</p></div>`:rows.length||rentOn.length||adjL.length||spOn.length?`<div class="sheet-wrap pay-wrap${crewMode?' pay-center':''}"><table class="sheet pay-sheet">${colW}<thead><tr><th>Projekt neve</th>${cids.map(c=>`<th class="r" title="${esc(nameOf(c))}">${esc(shortName(nameOf(c)))}</th>`).join('')}${noSum?'':'<th class="r">Projekt összesen</th>'}</tr></thead>
      <tbody>${rows.map(r=>`<tr><td>${isSales()?`<b>${esc(fmtShort(r.d))} · ${esc(r.p.name||'Névtelen projekt')}${r.d!==pr(r.p).start?' <span class="muted" style="font-weight:500">(vágási határidő)</span>':''}</b>`:`<button class="linkbtn" type="button" data-action="open-project" data-id="${esc(r.p.id)}" title="${esc(r.p.name||'')}">${esc(fmtShort(r.d))} · ${esc(r.p.name||'Névtelen projekt')}</button>${r.d!==pr(r.p).start?' <span class="muted" style="font-weight:500">(vágási határidő)</span>':''}`}</td>${cids.map(c=>cell(r,c)).join('')}${noSum?'':`<td class="r"><b>${ftCell(rowSum(r))||0}</b></td>`}</tr>`).join('')}${rows.length||spOn.length?'':`<tr><td colspan="${cids.length+2}" class="empty-row">Ebben a hónapban nincs termelői díj.</td></tr>`}${rentRow}${spRow}${adjRow}</tbody>
      <tfoot><tr class="pay-totrow"><td><b>Összesen (${esc(F_YM.format(toDate(sel+'-01')))}, nettó)</b></td>${cids.map(c=>`<td class="r"><b>${ftCell(colSum(c))||0}</b></td>`).join('')}${noSum?'':`<td class="r pay-total"><b>${ftFmt(total)}</b></td>`}</tr>${isAdmin()||crewMode?statusRows:''}${retRow}</tfoot></table></div>`
      :`<div class="panel">${empty('Ebben a hónapban nincs termelői díj.')}</div>`}${crewMode?'</div>':''}`;   /* szakember: a hónapválasztó a táblázat fölött, középen */
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
    return `<button class="ev" type="button" data-action="open-project" data-id="${esc(p.id)}"><div class="ev-b"><b>${esc(c?c.name:(S.crewNames||{})[x.crewId]||'Munkatárs')} · ${esc(k.label||'')}${x.kind==='damage'?' · '+ftFmt(x.amount):' · '+num(x.pct)+'%'}</b><small>${esc(p.name||'')} · javasolta: ${esc(x.by)} · ${esc(x.at)}</small></div></button>`;}).join('')}</div></div>`;
}
function viewProjects(){
  if(S.projectId&&S.draft)return viewProject(S.draft);
  const T=todayISO(),f=S.pf,q=f.q.trim().toLowerCase();
  const filters=[['aktiv','Aktív',S.projects.filter(isOpen).length],...STAGES.map(s=>[s.id,s.label,S.projects.filter(p=>(p.status||'tervezes')===s.id).length]),['lemondva','Lemondva',S.projects.filter(p=>p.status==='lemondva').length],['mind','Mind',S.projects.length]];
  let list=S.projects.slice();   /* az állapotszűrő sor kikerült (Ervin kérése, 2026-11-09): minden projekt látszik */
  if(ro()&&S.me&&S.me.crewId){const me=S.me.crewId,T0=todayISO();   /* szakember: csak az aktív beosztások – jövőbeli, most zajló, vagy vágás / jóváhagyás alatt, ha ő a vágó */
    list=list.filter(p=>{if(p.status==='lemondva')return false;const r=pr(p);if(!r||(r.end||r.start)>=T0)return true;
      const cut=(p.crew||[]).some(c=>c.crewId===me&&/vágó/i.test(c.role||''))||(p.videos||[]).some(v=>v.editor===me);
      return cut&&p.status!=='atadva'&&['utomunka','jovahagyas','leadva'].includes(p.status||'')&&(p.videos||[]).filter(v=>!v.editor||v.editor===me).some(v=>v.st!=='jovahagyva');});}
  if(q)list=list.filter(p=>fold([p.name,p.client,p.venue,p.eventType,p.contactName].join(' ')).includes(fold(q)));
  const closed=p=>p.status==='atadva'||p.status==='lemondva';
  const ahead=list.filter(p=>!closed(p)&&(!pr(p)||pr(p).end>=T)).sort((a,b)=>!pr(a)?1:!pr(b)?-1:byStart(b,a));   // terepi munkára vár (dátum nélküliek a végén)
  const past=list.filter(p=>!closed(p)&&pr(p)&&pr(p).end<T).sort((a,b)=>byStart(b,a));   // lezajlott, utómunkára vár
  const done=list.filter(closed).sort((a,b)=>!pr(a)?1:!pr(b)?-1:byStart(b,a));   // lezárt: hónaponként
  const issues=ro()?[]:computeIssues();
  const row=p=>{const r=pr(p),di=dueInfo(p),sub=(ro()?[p.venue]:[p.client,p.venue]).filter(Boolean).join(' · ')||(ro()?'':'Nincs ügyfél megadva'),days=r&&r.end!==r.start?` · ${diffDays(r.start,r.end)+1} napos`:'';
    const nCrew=crewN(p),sz=nCrew>=6?3:nCrew>=3?2:1,crewChip=nCrew?`<span class="pt-crew sz${sz}" title="${nCrew} fő a projekten">👥 ${nCrew}</span>`:'';   // a projekt nagysága: minél több szakember, annál feltűnőbb
    const endT=String((r&&r.end>r.start&&p.lastEndTime)||p.endTime||''),overToday=!!r&&r.end===T&&(['utomunka','leadva','jovahagyas','atadva','lemondva'].includes(p.status)||(/^\d{2}:\d{2}$/.test(endT)&&endT<=new Date().toTimeString().slice(0,5)));   // ma volt, de már véget ért
    const when=!r?'':overToday?'past':r.start<=T&&r.end>=T?'now':r.start>T?'fut':'past',rel=!r?'':when==='now'?'<span class="pt-rel now">● MA</span>':when==='fut'?`<span class="pt-rel fut">${diffDays(T,r.start)===1?'holnap':diffDays(T,r.start)+' nap múlva'}</span>`:`<span class="pt-rel past">${diffDays(r.end,T)===0?'ma, véget ért':diffDays(r.end,T)===1?'tegnap':diffDays(r.end,T)+' napja'}</span>`;
    const due=di&&r&&(r.end<T||POST_STAGES.includes(p.status))?`<span class="statuspill p-${di.cls}">${di.txt}</span>`:'';
    const extra=ro()?(myRole(p)?`<span class="smallnum">${esc(myRole(p))}</span>`:'')+(()=>{const st=p.status||'tervezes',m={leadva:'⏳ Elfogadásra vár',jovahagyas:'⏳ Elfogadásra vár',atadva:'✓ Kész',lemondva:'Lemondva',utomunka:'✂️ Utómunka'}[st]||stageLabel(p,st);return `<span class="pt-mystat st-${esc(st)}">${esc(m)}</span>`;})()
      :`<span class="smallnum">${nCrew} fő · ${eqCount(p)} eszköz</span>`;
    const dim=crewDim(p);
    return `<tr class="pt-row pt-st-${esc(p.status||'tervezes')} pt-${when||'nodate'} pt-sz${sz}${p.status==='lemondva'?' pt-cancel':''}${dim?' pt-dim':''}" data-action="open-project" data-id="${esc(p.id)}" tabindex="0"><td class="pt-proj"><div class="pt-flex">${calBlock(r&&r.start)}<span class="ev-main"><span class="ev-title">${esc(p.name||'Névtelen projekt')}${p.status==='atadva'&&!(ro()&&when==='past')?DONE_CHECK:''}${ro()&&when==='past'?'':crewChip}${rel}</span><span class="ev-sub">${esc(sub)}${days}</span></span></div></td>
      <td class="pt-status"><div class="pt-pills">${ro()&&crewCuts(p,(S.me.viewAs&&S.me.viewAs.crewId)||S.me.crewId)&&cutLeft(p)?`<span class="statuspill p-${cutLeft(p).cls}">✂️ ${esc(cutLeft(p).txt)}</span>`:''}${ro()&&when==='past'?'':statusPill(p)+crewFinalWarn(p)+due+vidLink(p,'statuspill p-info pt-video','▶ Leadott videó'+(p.deliveryPass?' 🔒':''),` data-action="ext-link" title="${esc(p.deliveryLink)}"`)}${budgetMissing(p)?`<span class="statuspill p-bad" data-tip="Hiányzik: ${esc(budgetMissing(p))}">💰 ${esc(budgetMissing(p))} hiányzik</span>`:''}</div></td>${ro()?`<td class="pt-extra">${extra}</td>`:''}</tr>`;};
  const cols=ro()?3:2;
  const grp=(t,arr,cls)=>arr.length?`<tr class="pt-group${cls?' '+cls:''}"><td colspan="${cols}">${t} <span class="muted">${arr.length}</span></td></tr>${arr.map(row).join('')}`:'';
  const months=[];done.forEach(p=>{const m=pr(p)?pr(p).start.slice(0,7):'';let g=months.find(x=>x.m===m);if(!g)months.push(g={m,arr:[]});g.arr.push(p);});
  // egyetlen lista dátum szerint csökkenő sorrendben; a jelölő sor a mai (és még tartó) projektek alatt, a jövő / mai / lezajlott sorok eltérő jelöléssel
  const all=list.slice().sort((a,b)=>!pr(a)?-1:!pr(b)?1:byStart(b,a));
  let marked=false;const todayRow=`<tr class="pt-today-row"><td colspan="${cols}"><span><b>📍 Ma · ${esc(fmtDay(T))} · <span class="pt-clock">${nowHM()}</span></b></span></td></tr>`;
  let lastM=null;const monthRow=m=>`<tr class="pt-month pt-month-sep"><td colspan="${cols}">${m?esc(F_YM.format(toDate(m+'-01'))):'Dátum nélkül'}</td></tr>`;   // hónap-elválasztó
  // a mai projektek piros keretben, a keret tetején a „MA · …” jelölővel
  const isTd=p=>{const r=pr(p);return !!r&&r.start<=T&&r.end>=T;};
  const body=all.map((p,i)=>{const r=pr(p),m=r?r.start.slice(0,7):'';let h='';if(m!==lastM){h+=monthRow(m);lastM=m;}
    if(isTd(p)){const first=!(i>0&&isTd(all[i-1])&&!h),last=!(all[i+1]&&isTd(all[i+1])&&(pr(all[i+1]).start.slice(0,7)===m));marked=true;
      return h+row(p).replace('class="pt-row ','class="pt-row pt-tf'+(first?' pt-tf-first':'')+(last?' pt-tf-last':'')+' ');}
    if(!marked&&r&&(r.end||r.start)<T){marked=true;h=(h&&h.indexOf('pt-month-sep')>=0&&m===T.slice(0,7)?h+todayRow:todayRow+h);}return h+row(p);}).join('')+(marked?'':todayRow);
  (window.POST_RENDER=window.POST_RENDER||[]).push(()=>{ptFrames();requestAnimationFrame(ptFrames);});
  return `<div class="page-head"><div class="grow"><h2>${ro()?'Beosztásaim':'Projektek'}</h2><p class="sub">${ro()?'Azok a projektek, amelyekre be vagy osztva':'Rendezvények a tervezéstől az átadásig'}</p></div>
      ${ro()?`<input class="inp search head-search" id="q-projects" type="search" placeholder="Keresés név, helyszín szerint" value="${esc(f.q)}" aria-label="Projektek keresése">`:'<button class="btn primary w" type="button" data-action="new-project">+ Új projekt</button>'}</div>
    ${ro()&&!S.me.crewId?`<div class="banner"><p>A felhasználód még nincs összekapcsolva a stáblistával, ezért nem látod a beosztásaidat. Szólj az ügyvezetőnek.</p></div>`:''}
    ${ro()||!issues.length?'':`<div class="panel issues-panel"><h3>⚠️ Figyelmeztetések <span class="aside">${issues.length} db</span></h3><div class="issues">${issues.map(i=>issueRow(i)).join('')}</div></div>`}
    ${isAdmin()?pendingPenPanel()+pendingBudgetPanel():''}
    ${ro()?'':`<div class="toolbar"><input class="inp search" id="q-projects" type="search" placeholder="Keresés név, ügyfél, helyszín szerint" value="${esc(f.q)}" aria-label="Projektek keresése">
</div>`}
    ${body?`<div class="sheet-wrap proj-wrap"><table class="sheet proj-table"><thead><tr><th>Projekt</th><th>Státusz</th>${ro()?'<th>Szereped</th>':''}</tr></thead><tbody>${body}</tbody></table></div>`
      :`<div class="panel">${empty(S.projects.length?'Nincs a szűrésnek megfelelő projekt.':ro()?'Még nem vagy beosztva egy projektre sem.':'Még nincs projekt. Hozd létre az elsőt az „Új projekt” gombbal.')}</div>`}`;
}
function fld(p,key,label,o={}){
  const v=p[key]??'';
  return `<div class="field${o.full?' full':''}"><label for="f-${key}">${label}</label><input class="inp" id="f-${key}" data-field="${key}" type="${o.type||'text'}" autocomplete="off"${key==='venue'?' name="lpm-venue-search" spellcheck="false"':''} value="${esc(v)}"${o.ph?` placeholder="${esc(o.ph)}"`:''}${o.min!=null?` min="${o.min}"`:''}${o.max!=null?` max="${o.max}"`:''}${o.step!=null?` step="${o.step}"`:''}${o.im?` inputmode="${o.im}"`:''}${key==='client'?' autocomplete="off"':''}${D()}></div>`;
}
function selField(p,key,label,opts,o={}){
  const v=p[key]??'';
  return `<div class="field${o.full?' full':''}"><label for="f-${key}">${label}</label><select class="inp" id="f-${key}" data-field="${key}"${o.cmb?` data-cmb="${esc(o.cmb)}"`:''}${D()}><option value="">${o.empty||'Válassz…'}</option>${opts.map(x=>{const [val,lab]=Array.isArray(x)?x:[x,x];return `<option value="${esc(val)}"${val===v?' selected':''}>${esc(lab)}</option>`;}).join('')}</select></div>`;
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
  return '';   // kiválasztott eszköznél nem kell a kategória / tárolási hely sor
}
const CAT_ICON={'Kamera':'📷','Objektív':'🔭','Hang':'🎤','Fény':'💡','Drón':'🚁','Képkeverés / stream':'🎛️','GoPro / akciókamera':'🎥','Gimbal / állvány':'🎚️','Akku / powerbank / táp':'🔋','Adathordozó':'💾','Laptop / tablet / telefon':'💻','Monitor / nyomtató':'🖥️','Kocsi / szállítás':'🚐','Kábel':'🔌','Egyéb':'📦'};
const catLbl=c=>(CAT_ICON[c]||'📦')+' '+c;
function itemOptions(p){
  return INV_CATS.map(cat=>{const items=S.inventory.filter(i=>(i.category||'Egyéb')===cat&&i.condition!=='selejt').sort((a,b)=>a.name.localeCompare(b.name,'hu'));
    if(!items.length)return '';return `<optgroup label="${esc(catLbl(cat))}">${items.map(i=>{const free=num(i.qty)-usedElsewhere(i.id,p)-eqQty(p,i.id);return `<option value="${esc(i.id)}"${free<=0?' disabled':''}>${esc(i.name)} — ${Math.max(0,free)}/${num(i.qty)} szabad${i.condition&&i.condition!=='ok'?' ('+CONDITIONS[i.condition].toLowerCase()+')':''}</option>`;}).join('')}</optgroup>`;}).join('');
}
function eqRowsFor(p,key){
  return (p.equipment||[]).map((e,i)=>({e,i})).filter(x=>(x.e.crewId||'')===key).map(({e,i})=>{const it=itemById(e.itemId);
    const dg=!ro()&&!projLocked()&&!eqLocked(p);
    return `<div class="eqrow${dg?' eq-drag':''}"${dg?` draggable="true" data-eq-drag="${i}" title="Húzd egy másik munkatárs kártyájára az átadáshoz"`:''}><div class="who"><b>${dg?'<span class="eq-grip" aria-hidden="true">⠿</span>':''}${esc(it?it.name:'Törölt eszköz')}</b>${eqNote(e,it,p)}</div>
      <input class="inp qty" type="number" min="1" inputmode="numeric" data-eq-i="${i}" value="${num(e.qty)}" aria-label="Darabszám"${D()}>
      <button class="x w" type="button" data-action="eq-remove" data-i="${i}" aria-label="Eszköz eltávolítása">×</button></div>`;}).join('');
}
function eqAddRow(p,key,opts){
  if(ro())return '';
  const sid='add-eq-item-'+(key||'common');
  return `<div class="eqadd eqdd"><button type="button" class="inp eqdd-btn" data-action="eqdd" data-for="${esc(sid)}" aria-haspopup="true">+ Eszköz hozzárendelése…</button><select class="inp" hidden id="${esc(sid)}" data-eq-auto="${esc(key)}" aria-label="Eszköz hozzáadása"><option value="">+ Eszköz hozzárendelése…</option>${opts}<optgroup label="➕ Más eszköz"><option value="__new">🆕 Új eszköz felvétele a leltárba…</option><option value="__own">🎒 Saját eszköz…</option><option value="__rent">🏷️ Bérelt eszköz…</option></optgroup></select></div>`;
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
const extrasRaw=p=>(p&&Array.isArray(p.extras)?p.extras:[]);   // minden sor, a szervezői jutalékkal együtt
const extrasOf=p=>extrasRaw(p).filter(x=>x&&x.kind!=='org'&&x.kind!=='tov');   // a számlán külön szereplő extrák (a szervezői jutalék nem; a továbbszámlázott költség a szerződött érték része)
/* Szervezői jutalék: rendezvényszervezőnek fizetett összeg; nem része a számlának, a termelői alapot csökkenti (a termelői % a levonás utáni összegből számolódik) */
const orgOf=p=>extrasRaw(p).find(x=>x&&x.kind==='org')||null;
const orgFee=p=>extrasRaw(p).filter(x=>x&&x.kind==='org').reduce((s,x)=>s+num(x.amount),0);
const prodBase=p=>p?salesBase(p):0;   // termelői alap = a „…után” mező: végső érték − szervezői jutalék − továbbszámlázott
const exSign=x=>x&&x.kind==='le'?-1:1;   // le = kedvezmény / jutalék (a végszámlából levonva)
const extrasPlus=p=>extrasOf(p).filter(x=>exSign(x)>0).reduce((s,x)=>s+num(x.amount),0);
const extrasMinus=p=>extrasOf(p).filter(x=>exSign(x)<0).reduce((s,x)=>s+num(x.amount),0);
const extrasSum=p=>extrasPlus(p)-extrasMinus(p);
const exBreak=p=>`szerződött ${ftFmt(num(p.projectValue))}${extrasPlus(p)?' + extra '+ftFmt(extrasPlus(p)):''}${extrasMinus(p)?' − kedvezmény '+ftFmt(extrasMinus(p)):''}`;
const projTotal=p=>num(p&&p.projectValue)+extrasSum(p);
const exTotTxt=p=>`Végső érték: <b>${ftFmt(projTotal(p))}</b> <span class="muted">(${exBreak(p)})</span>`;
const extrasMenu=p=>ro()||projLocked()?'':`<select class="inp ex-menu" data-ex-menu data-cmb="＋ Hozzáadás…" data-cmb-cls="ex-menu" aria-label="Hozzáadás az extrákhoz"><option value="">＋ Hozzáadás…</option><option value="plus">＋ Extra szolgáltatás</option><option value="le">− Kedvezmény / jutalék</option><option value="tov">＋ Továbbszámlázott költség (utazás, szállás, eszközbérlés…)</option><option value="free">🎁 Nem fizetős projekt</option>${refOn(p)?'':'<option value="ref">🤝 Ajánlói jutalék szakembernek</option>'}${salesOn(p)?'':'<option value="sales">💼 Értékesítői jutalék</option>'}${extrasRaw(p).some(x=>x&&x.kind==='org')?'':'<option value="org">🎪 Szervezői jutalék</option>'}</select>`;   // „＋ Hozzáadás…” menü (a büdzsé sorában)
/* Továbbszámlázott költség: a szervezői jutalékhoz hasonló mező a büdzsé sorában (a csatolmány az Új projekt ablakban tölthető fel) */
function tovFields(p){if(!isAdmin())return '';const dis=ro()||projLocked(),raw=extrasRaw(p);
  return raw.map((x,i)=>{if(!x||x.kind!=='tov')return '';
    const file=x.fileUrl?` <a class="tov-file-l" href="${esc(x.fileUrl)}" target="_blank" rel="noopener" title="${esc(x.fileName||'Csatolmány')}">📎</a>`:'';
    return `<div class="field fin-org fin-tov"><label>🔁 Továbbszámlázott${file}${dis?'':` <button class="x w" type="button" data-action="extra-del" data-i="${i}" title="Tétel törlése" aria-label="Tétel törlése">✕</button>`}</label>
      <div class="org-line org-g"><input class="inp" data-extra-name="${i}" value="${esc(x.name||'')}" placeholder="pl. szállás, eszközbérlés" maxlength="200" aria-label="Továbbszámlázott költség megnevezése"${dis?' disabled':''}>
      <div class="money"><span class="ex-sign">−</span><input class="inp money-inp" data-extra-amt="${i}" data-money="big" inputmode="numeric" value="${esc(moneyFmt(x.amount||''))}" placeholder="0" aria-label="Továbbszámlázott költség nettó összege (a szerződött értékből levonva)"${dis?' disabled':''}><span class="money-unit">Ft</span></div></div></div>`;}).join('');}
function extrasHtml(p){const l=extrasRaw(p);if(!l.some(x=>x&&x.kind!=='org'&&x.kind!=='tov')&&!refOn(p)&&!salesOn(p))return '';   // üres: nincs külön blokk (a menü a büdzsé sorában)

  return `<div class="extras" id="proj-extras">
    ${l.map((x,i)=>{if(x.kind==='org'||x.kind==='tov')return '';const le=exSign(x)<0;return `<div class="ex-row${le?' ex-minus':''}"><input class="inp" data-extra-name="${i}" value="${esc(x.name||'')}" placeholder="${le?'pl. jutalék – kiállítói shortok':x.kind==='tov'?'pl. szállás, utazás, eszközbérlés':'pl. +1 riport videó'}" maxlength="200" aria-label="${le?'Kedvezmény / jutalék':'Extra szolgáltatás'} megnevezése"><div class="money"><span class="ex-sign">${le?'−':'+'}</span><input class="inp money-inp" data-extra-amt="${i}" data-money="big" inputmode="numeric" value="${esc(moneyFmt(x.amount||''))}" placeholder="0" aria-label="Nettó összeg"><span class="money-unit">Ft</span></div><button class="trash" type="button" data-action="extra-del" data-i="${i}" aria-label="Törlés">🗑️</button>${x.kind==='tov'?'<span class="ex-tov" title="Az értékesítői jutalék alapjába nem számít bele">továbbszámlázott</span>':''}</div>`;}).join('')}
    ${refOption(p,true)}
    ${salesOption(p)}
    <div class="ex-foot">${extrasOf(p).length?`<span class="ex-tot" id="ex-total">${exTotTxt(p)}</span>`:''}</div></div>`;}   // egy közös „＋ Hozzáadás…” menü
const isFree=p=>!!p&&p.projectValue!=null&&p.projectValue!==''&&num(p.projectValue)===0;
function budgetFt(p){
  if(!isAdmin())return p.budgetFt==null?null:num(p.budgetFt);
  const v=p.budgetVal;if(v===''||v==null||!p.budgetMode)return null;
  if(p.budgetMode==='pct'){if(p.projectValue==null||p.projectValue==='')return null;return Math.round(prodBase(p)*num(v)/100);}   // 0 Ft-os projektnél a keret is 0
  return num(v);
}
const pctFmt=x=>(Math.round(x*10)/10).toLocaleString('hu-HU')+'%';
function finPanelBody(p){
  const adm=isAdmin(),val=prodBase(p),k=budgetFt(p);
  const pctV=p.budgetMode==='pct'?(p.budgetVal===''||p.budgetVal==null?'':String(p.budgetVal).replace('.',',')):(k!=null&&val>0?String(Math.round(k/val*1000)/10).replace('.',','):'');
  const ftV=k!=null?moneyFmt(k):'';
  if(!adm)return `<div class="fin-sum"></div>`;
  const free=isFree(p),org=!free&&orgOf(p),tov=!free&&extrasRaw(p).some(x=>x&&x.kind==='tov'),two=!!(org||tov);   // két sor csak szervezői jutaléknál / továbbszámlázott költségnél
  const valF=`<div class="field fin-val${p.projectValue==null||p.projectValue===''?' missing req':''}"><label for="f-projectValue">Nettó szerződött érték</label><div class="money"><input class="inp money-inp" id="f-projectValue" type="text" data-money="big" data-fin="projectValue" inputmode="numeric" autocomplete="off" value="${free?'':esc(moneyFmt(p.projectValue))}" placeholder="${free?'Nem fizetős projekt':'pl. 969 000'}"${free?' disabled':''}><span class="money-unit">Ft</span></div>${free?`<div class="free-on">🎁 Nem fizetős projekt${D()?'':' · <button class="linkbtn" type="button" data-action="free-off">visszavonás</button>'}</div>`:''}</div>`;
  const exm=free||ro()||projLocked()?'':`<div class="field fin-exm"><label title="A szerződött összegen felül / levonva, nettó; a végszámlára külön tételként kerülnek">➕ Extrák és kedvezmények</label>${extrasMenu(p)}</div>`;
  const sc=salesCommFields(p),salesG=sc?`<div class="fin-grp grp-sales"><div class="grp-h">💼 Értékesítés</div><div class="grp-b">${sc}</div></div>`:'';
  const prodG=`<div class="fin-grp grp-prod"><div class="grp-h">🎬 Termelés</div><div class="grp-b"><div class="field fin-eff"><label for="f-budgetPct">Hatékonyság</label>
          <div class="money"><input class="inp money-inp" id="f-budgetPct" type="text" data-fin="budgetPct" inputmode="decimal" autocomplete="off" value="${esc(pctV)}" placeholder="pl. 40" aria-label="Keret a projekt értékének százalékában"><span class="money-unit">%</span></div></div>
        <div class="field fin-budget${budgetFt(p)==null&&!free?' missing req':''}"><label for="f-budgetFt">Termelői keret</label>
          <div class="money"><input class="inp money-inp" id="f-budgetFt" type="text" data-money="big" data-fin="budgetFt" inputmode="numeric" autocomplete="off" value="${esc(ftV)}" placeholder="pl. 400 000" aria-label="Keret forintban"><span class="money-unit">Ft</span></div></div></div></div>`;
  const rows=two?`<div class="fin-r">${valF}${org?orgOption(p):''}${tov?tovFields(p):''}${exm}</div><div class="fin-r">${finNet(p)}${salesG}${prodG}</div>`:`<div class="fin-r">${valF}${salesG}${prodG}${exm}</div>`;
  return `<div class="fin-sum"><div class="fin-inputs fin-v2${two?' two':''}">${rows}</div>${free?'':extrasHtml(p)}</div>`;
}
/* Oszlopszélességek: a fejléc szélén húzva állíthatók, böngészőnként megjegyezzük. */
const FIN_COLS_DEF=[52,250,220,170,250,150];
function finCols(){let w=null;try{w=JSON.parse(localStorage.getItem('lpm_fin_cols5')||'null');}catch(e){}return Array.isArray(w)&&w.length===FIN_COLS_DEF.length?w:FIN_COLS_DEF.slice();}
/* Termelői keret és maradék a táblázat „Összesen” sora alatt, a Díj oszlopban (mint az Excelben). */
function keretRows(p){
  const k=budgetFt(p),sum=feeSum(p),left=k==null?null:k-sum,val=prodBase(p);
  const pct=isAdmin()&&k!=null?(p.budgetMode==='pct'?pctFmt(num(p.budgetVal)):val>0?pctFmt(k/val*100):''):'';
  return `<tr class="keret-tr${left==null?'':left<0?' left-over':' left-ok'}"><td></td><td></td><td class="r tf-lbl fin-left-lbl">${left!=null&&left<0?'Keret túllépése':'Maradt a keretből'}</td><td class="r fin-left ${left==null?'':left<0?'bad-txt':'ok-txt'}">${left==null?'':Math.round(left)===0?'<b class="perfekt">Pontos 🎯</b>':(left<0?'−':'')+(moneyFmt(Math.abs(left))||0)}</td><td colspan="2"></td></tr>
        <tr class="keret-tr"><td></td><td></td><td class="r tf-lbl">Termelői keret</td><td class="r fin-keret-v">${k!=null?moneyFmt(k)+(pct?` <span class="muted">(${pct})</span>`:''):''}</td><td colspan="2"></td></tr>`;
}
function totalCell(p){const amt=feeSum(p),val=prodBase(p);return (moneyFmt(amt)||0)+(isAdmin()&&val>0?` <span class="muted">(${pctFmt(feeSum(p)/val*100)})</span>`:'');}
function finSumHtml(p){
  const sum=feeSum(p),val=projTotal(p),margin=val-sum,adm=isAdmin();
  const pct=x=>val>0?pctFmt(x/val*100):'–';
  return `${adm?`<div class="kv"><span>Fedezet</span><b class="${val>0&&margin<0?'bad-txt':''}">${val>0?ftFmt(margin)+' · '+pct(margin):'–'}</b></div>
      <div class="kv"><span>Tényleges költséghányad</span><b>${pct(sum)}</b></div>`:''}`;
}
function finAside(p){
  const sum=feeSum(p),val=prodBase(p),k=budgetFt(p),parts=[];
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
  const nameCell=(f,i)=>{const fixed=f.kind==='fixed';return fixed&&/^egyeb/.test(f.key||'')?tin(i,'name',f.name,'Egyéb tétel neve'):!f.crewId&&!fixed?`<div class="cell-ro cell-flex"><span>${esc(f.name||'')}</span><button class="trash" type="button" data-action="fee-remove" data-i="${i}" title="Sor törlése" aria-label="Sor törlése">🗑️</button></div>`:f.crewId&&!fixed?`<div class="cell-ro cell-flex"><span>${esc(f.name||'')}</span><span class="cell-acts"><button class="pen-btn" type="button" data-action="pen-new" data-cid="${esc(f.crewId)}" title="Díjcsökkentés" aria-label="Díjcsökkentés: ${esc(f.name||'')}">🚨</button>${crewLocked(S.draft||{})?'':`<button class="trash" type="button" data-action="crew-person-remove" data-id="${esc(f.crewId)}" title="Levétel a projektről (a stábból is)" aria-label="${esc(f.name||'')} levétele a projektről">🗑️</button>`}</span></div>`:ro_(esc(f.name||''));};
  const rentCell=(f,i)=>f.kind==='fixed'?ro_(''):f.crewId&&rentalsOf(p,f.crewId).some(r=>!r.own)?ro_(`<span class="num-ro" title="A stábkártyán felvett bérelt eszközökből">${moneyFmt(rentalSum(p,f.crewId))}</span>`):tin(i,'rent',f.rent,'0',{money:1});
  const commonRow=()=>rentalsOf(p,'').length?`<tr class="fixed-row"><td class="n"></td><td><div class="cell-ro">Közös eszközök</div></td><td><div class="cell-ro">${esc(rentalsOf(p,'').map(r=>r.name).join(', '))}</div></td><td><div class="cell-ro"></div></td><td></td><td><div class="cell-ro"><span class="num-ro">${moneyFmt(rentalSum(p,''))}</span></div></td></tr>`:'';
  const nf=fees.filter(x=>x.kind!=='fixed').length,days=projDays(p);
  const head=`<colgroup>${cols.map(w=>`<col style="width:${w}px">`).join('')}</colgroup><thead><tr>${th('#',0,'n')}${th('Szakember',1)}${th('Termelői feladat',2)}${th('Díj (Ft)',3,'r')}${th('Eszköz neve',4)}${th('Eszközbérlés (Ft)',5,'r')}</tr></thead>`;
  const tbl=(body,foot,cls,noHead)=>`<div class="sheet-wrap${cls?' '+cls:''}"><table class="sheet fin-sheet" style="width:${cols.reduce((x,y)=>x+y,0)}px;min-width:100%">${noHead?`<colgroup>${cols.map(w=>`<col style="width:${w}px">`).join('')}</colgroup>`:head}<tbody>${body}</tbody>${foot||''}</table></div>`;
  const sumTbl=()=>`<div class="day-tbl-h">Összesítés</div>`+tbl('',foot,'sum-sheet',true);
  const foot=`<tfoot><tr><td></td><td></td><td class="r tf-lbl">Összesen</td><td class="r fin-amt">${totalCell(p)}</td><td></td><td class="r fin-rent">${moneyFmt(fees.reduce((s,f)=>s+rentOf(p,f),0)+rentalSum(p,''))||0}</td></tr>${keretRows(p)}</tfoot>`;
  const postRows=fees.map((f,i)=>({f,i})).filter(x=>x.f.kind!=='fixed'&&feePost(p,x.f.crewId));
  const hasCutter=(p.crew||[]).some(a=>a.role==='Vágó');   // a vágó a helyszíni stábban is lehet (pl. operatőr + vágó) – ilyenkor a díja a napi táblázatban van
  const splitRows=fees.map((f,i)=>({f,i})).filter(x=>isSplitCut(p,x.f));   // helyszínen is dolgozó vágó: a vágás külön sorban
  const postTbl=()=>{const all=postRows.length+splitRows.length;
    if(!all)return hasVideoPost(p)&&!hasCutter?`<div class="day-tbl-h">✂️ Utómunka</div>`+tbl(`<tr><td colspan="6" class="empty-row">Van megrendelt utómunka, de még nincs vágó beosztva – a stábnál a Beosztásban válaszd a „Vágó” szerepet.</td></tr>`,'','day-sheet'):'';
    const body=postRows.map((x,n)=>`<tr><td class="n">${n+1}</td><td>${nameCell(x.f,x.i)}</td><td>${ro_(esc(x.f.task||''))}</td><td>${tin(x.i,'amount',x.f.amount,'0',{money:1})}${penCellNote(p,x.f)}</td><td>${ro_(esc(gearOf(x.f)||''))}</td><td>${rentCell(x.f,x.i)}</td></tr>`)
      .concat(splitRows.map((x,n)=>`<tr><td class="n">${postRows.length+n+1}</td><td>${ro_(esc(x.f.name||((crewById(x.f.crewId)||{}).name)||''))}</td><td>${ro_('Vágás')}</td><td>${tin(x.i,'post',x.f.post,'0',{money:1})}</td><td>${ro_('')}</td><td>${ro_('')}</td></tr>`)).join('');
    return `<div class="day-tbl-h">✂️ Utómunka</div>`+tbl(body,`<tfoot><tr class="day-sub"><td></td><td></td><td></td><td class="r" data-post-sum="1">${moneyFmt(postSumOf(p))||0}</td><td colspan="2"></td></tr></tfoot>`,'day-sheet');};
  let tables='';
  if(days.length){   // több napos projekt: minden napnak saját táblázata, a végén az egyéb költségek és az összesítő
    const crewF=fees.map((f,i)=>({f,i})).filter(x=>x.f.kind!=='fixed'&&!feePost(p,x.f.crewId)).sort((a,b)=>(b.f.crewId===p.lead)-(a.f.crewId===p.lead)),SOx=x=>!!x.f.crewId&&feeSales(p,x.f.crewId);
    tables=days.map((dd,k)=>{const on=crewF.filter(x=>!x.f.crewId||SOx(x)?k===0:crewDaysOf(p,x.f.crewId).includes(dd));
      const firstDay=x=>!x.f.crewId||SOx(x)||crewDaysOf(p,x.f.crewId)[0]===dd;
      const daySum=daySumOf(p,dd);
      const body=on.map((x,n)=>`<tr><td class="n">${n+1}</td><td>${nameCell(x.f,x.i)}</td><td>${ro_(esc(x.f.task||(x.f.roles||[]).join(' + ')||''))}</td><td>${x.f.crewId&&!SOx(x)?tin(x.i,'day:'+dd,(x.f.dayAmounts||{})[dd],'0',{money:1}):tin(x.i,'amount',x.f.amount,'0',{money:1})}${x.f.crewId&&!SOx(x)?penCellNote(p,x.f,dd,firstDay(x)):''}</td><td>${ro_(esc(gearOf(x.f)||x.f.gear||''))}</td><td>${firstDay(x)?rentCell(x.f,x.i):ro_('')}</td></tr>`).join('')||`<tr><td colspan="6" class="empty-row">Erre a napra még nincs beosztva senki.</td></tr>`;
      return `<div class="day-tbl-h">${k+1}. nap – ${esc(dayLbl(dd))}</div>`+tbl(body,`<tfoot><tr class="day-sub"><td></td><td></td><td class="r tf-lbl">Napi összesen<small class="muted tf-sub">díjcsökkentés után</small></td><td class="r" data-day-sum="${dd}">${moneyFmt(daySum)||0}</td><td colspan="2"></td></tr></tfoot>`,'day-sheet');}).join('');
    const fixedRows=fees.map((f,i)=>({f,i})).filter(x=>x.f.kind==='fixed').sort((a,b)=>(/^egyeb/.test(a.f.key||'')?1:0)-(/^egyeb/.test(b.f.key||'')?1:0)).map(x=>`<tr class="fixed-row"><td class="n"></td><td>${nameCell(x.f,x.i)}</td><td>${ro_('')}</td><td>${tin(x.i,'amount',x.f.amount,'0',{money:1})}</td><td>${ro_('')}</td><td>${ro_('')}</td></tr>`).join('');
    tables+=`<div class="day-tbl-h">Egyéb költségek</div>`+tbl(commonRow()+fixedRows,`<tfoot><tr class="day-sub"><td></td><td></td><td></td><td class="r" data-other-sum="1">${moneyFmt(otherSumOf(p))||0}</td><td colspan="2"></td></tr></tfoot>`,'day-sheet')+postTbl()+sumTbl();
  }else{
    if(true){const field=fees.map((f,i)=>({f,i})).filter(x=>x.f.kind!=='fixed'&&!feePost(p,x.f.crewId)).sort((a,b)=>(b.f.crewId===p.lead)-(a.f.crewId===p.lead));   // a projektvezető mindig elöl
      const fr=field.map((x,n)=>`<tr data-fee-row="${x.i}"><td class="n"><div class="mv-cell"><span>${n+1}</span>${field.length>1&&!ro()?`<span class="drag-h" data-drag-fee="${x.i}" title="Húzd a sorrend módosításához" aria-label="Sor áthelyezése">⠿</span>`:''}</div></td><td>${nameCell(x.f,x.i)}</td><td>${ro_(esc((t=>isSplitCut(p,x.f)?t.split(/\s*\+\s*/).filter(z=>z!=='Vágó').join(' + '):t)(x.f.task||(x.f.roles||[]).join(' + ')||'')))}</td><td>${(isSplitCut(p,x.f)?tin(x.i,'onsite',num(x.f.amount)-postAmt(x.f),'0',{money:1}):tin(x.i,'amount',x.f.amount,'0',{money:1}))}${x.f.crewId?penCellNote(p,x.f):''}</td><td>${ro_(esc(gearOf(x.f)||x.f.gear||''))}</td><td>${rentCell(x.f,x.i)}</td></tr>`).join('')||`<tr><td colspan="6" class="empty-row">Ha beosztasz valakit a stábba, automatikusan bekerül ide.</td></tr>`;
      const fixedRows=fees.map((f,i)=>({f,i})).filter(x=>x.f.kind==='fixed').sort((a,b)=>(/^egyeb/.test(a.f.key||'')?1:0)-(/^egyeb/.test(b.f.key||'')?1:0)).map(x=>`<tr class="fixed-row"><td class="n"></td><td>${nameCell(x.f,x.i)}</td><td>${ro_('')}</td><td>${tin(x.i,'amount',x.f.amount,'0',{money:1})}</td><td>${ro_('')}</td><td>${ro_('')}</td></tr>`).join('');
      tables=(editOnly(p)?'':`<div class="day-tbl-h">📍 Helyszíni stáb</div>`+tbl(fr,field.length?`<tfoot><tr class="day-sub"><td></td><td></td><td></td><td class="r" data-field-sum="1">${moneyFmt(fieldSumOf(p))||0}</td><td></td><td class="r"><b>${moneyFmt(field.reduce((s,x)=>s+(x.f.crewId&&rentalsOf(p,x.f.crewId).some(r=>!r.own)?rentalSum(p,x.f.crewId):num(x.f.rent)),0))||0}</b></td></tr></tfoot>`:'','day-sheet')+`<div class="day-tbl-h">Egyéb költségek</div>`+tbl(commonRow()+fixedRows,`<tfoot><tr class="day-sub"><td></td><td></td><td></td><td class="r" data-other-sum="1">${moneyFmt(otherSumOf(p))||0}</td><td colspan="2"></td></tr></tfoot>`,'day-sheet'))+postTbl()+sumTbl();   // videóvágásnál nincs helyszíni stáb és egyéb költség
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
    ${refOption(p)}
    ${penPanel(p)}
  </div>`;
}
function myFeePanel(p){
  const cid=S.me&&S.me.crewId,a=num(p.myFee.amount),pens=(p.penalties||[]).filter(x=>x.crewId===cid);
  if(!pens.length)return `<div class="panel my-fee-panel"><h3>💰 Díjad ezen a projekten <span class="muted" style="font-weight:600">· nettó</span></h3><div class="my-fee-amt">${ftFmt(a)} <span class="fee-net">nettó</span></div></div>`;
  const d=penDeduct(p,cid,a),dmg=penDamage(p,cid);
  return `<div class="panel my-fee-panel"><h3>💰 Díjad ezen a projekten <span class="muted" style="font-weight:600">· nettó</span></h3>
    <div class="kv"><span>Eredeti díj</span><b>${ftFmt(a)} nettó</b></div>${d?`<div class="kv"><span>Díjcsökkentés${pens.some(x=>x.day)?'':` (${penPct(p,cid)}%)`}</span><b class="bad-txt">−${ftFmt(d)}</b></div>`:''}
    <div class="kv"><span>Kifizetendő</span><b class="my-fee-amt">${ftFmt(a-d)} <span class="fee-net">nettó</span></b></div>${dmg?`<div class="kv"><span>Kártérítési követelés</span><b class="bad-txt">${ftFmt(dmg)}</b></div>`:''}
    ${pens.map(x=>{const k=PEN_KINDS[x.kind]||{};return `<div class="pen-row approved"><div class="pen-main"><b>${esc(k.label||'')}</b>${x.kind==='damage'?' · '+ftFmt(x.amount):' · '+num(x.pct)+'%'+(x.day?' a '+esc(dayLbl(x.day))+' napi díjból':'')} <span class="muted">(szerződés ${esc(k.ref||'')} pont)</span>
      ${x.caseText?`<div class="pen-case">${esc(x.caseText)}</div>`:''}<div class="pen-reason">${esc(x.reason)}</div>${x.link?`<a class="linkbtn" href="${esc(x.link)}" target="_blank" rel="noopener">Bizonyíték ↗</a>`:''}
      ${x.objection?`<div class="pen-obj"><b>Kifogásod</b> (${esc(x.objection.at)}): ${esc(x.objection.text)}</div>`:`<button class="btn outline small" type="button" data-action="pen-object" data-pid="${esc(p.id)}" data-id="${esc(x.id)}" style="margin-top:8px">Kifogásolom</button>`}</div></div>`;}).join('')}</div>`;
}
function penCellNote(p,f,dd,first){   // dd: napi táblázat (több napos projekt) – a napra szabott levonás ott jelenik meg
  const all=penOf(p,f.crewId,'approved').filter(x=>x.kind!=='damage'),pend=penOf(p,f.crewId,'pending').length,dmg=penDamage(p,f.crewId),tot=num(f.amount);
  const tip=arr=>esc(arr.map(penTipText).join('\n\n'));
  const line=(arr,base,pre)=>{if(!arr.length)return '';const pc=Math.min(100,arr.reduce((s,x)=>s+num(x.pct),0)),d=Math.min(base,Math.round(base*pc/100));return `<span class="bad-txt pen-tip" data-tip="${tip(arr)}" tabindex="0">${pre||''}−${moneyFmt(d)||0} (${pc}%) → ${moneyFmt(base-d)||0}</span>`;};
  let h='';
  if(dd){h=line(all.filter(x=>x.day===dd),num((f.dayAmounts||{})[dd]))+(first?line(all.filter(x=>!x.day),tot,'teljes díjból: '):'');if(!first)return h?`<div class="pen-sub">${h}</div>`:'';}
  else if(all.some(x=>x.day)){const d=penDeduct(p,f.crewId,tot);h=d?`<span class="bad-txt pen-tip" data-tip="${tip(all)}" tabindex="0">−${moneyFmt(d)} → ${moneyFmt(tot-d)||0}</span>`:'';}
  else h=line(all,tot);
  if(!h&&!pend&&!dmg)return '';
  return `<div class="pen-sub">${h}${dmg?`<span class="bad-txt pen-tip" data-tip="${tip(penOf(p,f.crewId,'approved').filter(x=>x.kind==='damage'))}" tabindex="0">kártérítés: ${moneyFmt(dmg)}</span>`:''}${pend?`<span class="warn-txt pen-tip" data-tip="${tip(penOf(p,f.crewId,'pending'))}" tabindex="0">${pend} jóváhagyásra vár</span>`:''}</div>`;
}
/* A díjcsökkentés részletei a súgóban (a piros összeg fölé víve) */
function penTipText(x){const k=PEN_KINDS[x.kind]||{};
  return [`${k.label||'Díjcsökkentés'}${x.kind==='damage'?' · '+ftFmt(x.amount):' · '+num(x.pct)+'%'}${x.day?' · '+dayLbl(x.day)+' napi díjából':''}${k.ref?' (szerződés '+k.ref+' pont)':''}`,
    x.caseText?'Eset: '+x.caseText:'',x.reason?'Indoklás: '+x.reason:'',`Kirótta: ${x.by||''}${x.at?' · '+x.at:''}${x.status==='approved'&&x.decidedBy&&x.decidedBy!==x.by?' · jóváhagyta: '+x.decidedBy:''}`].filter(Boolean).join('\n');}
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
    return `<div class="pen-row ${x.status}"><div class="pen-main"><b>${esc(c?c.name:(S.crewNames||{})[x.crewId]||'Munkatárs')}</b> · ${esc(k.label||'')}${x.kind==='damage'?'':` <b>${num(x.pct)}%</b>`}${x.day?' · '+esc(dayLbl(x.day))+' napi díjából':''} · ${x.kind==='damage'?'kártérítés':'levonás'}: <b>${ftFmt(amt)}</b> ${pill}
      ${x.caseText?`<div class="pen-case">${esc(x.caseText)}</div>`:''}<div class="pen-reason">${esc(x.reason)}</div>
      ${x.link?`<a class="linkbtn" href="${esc(x.link)}" target="_blank" rel="noopener">Bizonyíték ↗</a>`:''}
      <div class="ser">Kirótta: ${esc(x.by)} · ${esc(x.at)}${x.decidedAt&&x.status!=='pending'?` · ${x.status==='approved'?'jóváhagyta':'elutasította'}: ${esc(x.decidedBy)}${x.decisionNote?' – '+esc(x.decisionNote):''}`:''}</div>
      ${x.objection?`<div class="pen-obj"><b>Kifogás</b> (${esc(x.objection.at)}): ${esc(x.objection.text)}</div>`:''}</div>
      ${isAdmin()?`<div class="pen-act">${x.status==='pending'?`<button class="btn primary small" type="button" data-action="pen-approve" data-id="${esc(x.id)}">Jóváhagyás</button><button class="btn outline small" type="button" data-action="pen-reject" data-id="${esc(x.id)}">Elutasítás</button>`:''}${penDaySelect(p,x)}<button class="trash" type="button" data-action="pen-del" data-id="${esc(x.id)}" title="Törlés" aria-label="Törlés">🗑️</button></div>`:''}</div>`;}).join('')}</div>`;
}
/* Csapat véglegesítése doboz a stáb alatt */
/* Szervezői jutalék: a rendezvényszervezőnek (ügyfél a listából) fizetett összeg; csak az ügyvezető látja */
function orgOption(p){if(!isAdmin())return '';const dis=ro()||projLocked(),raw=extrasRaw(p),i=raw.findIndex(x=>x&&x.kind==='org'),x=i>=0?raw[i]:null;
  if(!x)return '';   // a „＋ Hozzáadás…” menüből kapcsolható be; a szerződött érték alatt jelenik meg
  const opts=(S.clients||[]).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'hu')).map(c=>`<option value="${esc(c.id)}"${c.id===x.clientId?' selected':''}>${esc(c.name||'')}</option>`).join('');
  return `<div class="field fin-org"><label>🎪 Szervezői jutalék${dis?'':` <button class="x w" type="button" data-action="extra-del" data-i="${i}" title="Szervezői jutalék törlése" aria-label="Szervezői jutalék törlése">✕</button>`}</label>
    <div class="org-line org-g"><select class="inp" id="org-sel" data-cmb="Szervező (kezdj el gépelni)…"${dis?' disabled':''}><option value="">Szervező…</option>${opts}${dis?'':'<option value="__new" data-keep="1">＋ Új ügyfél felvétele…</option>'}</select>
    <div class="money"><span class="ex-sign">−</span><input class="inp money-inp" data-extra-amt="${i}" data-money="big" inputmode="numeric" value="${esc(moneyFmt(x.amount||''))}" placeholder="0" aria-label="Szervezői jutalék nettó összege"${dis?' disabled':''}><span class="money-unit">Ft</span></div></div></div>`;}
function finNet(p){if(!isAdmin())return '';const of=orgOf(p),tvs=extrasRaw(p).filter(x=>x&&x.kind==='tov');if(!of&&!tvs.length)return '';
  const names=(of?['szervezői jutalék']:[]).concat(tvs.map(x=>String(x.name||'').trim()||'továbbszámlázott költség')),lbl=(names.length>2?names.slice(0,-1).join(', ')+' és '+names[names.length-1]:names.join(' és '))+' után';
  const L=lbl.charAt(0).toUpperCase()+lbl.slice(1),tip='Végső érték − szervezői jutalék − továbbszámlázott költség (nettó). Ebből számolódik az értékesítői jutalék.';
  return `<div class="field fin-net"><label title="${esc(tip)}">${esc(L)}</label><div class="money"><input class="inp money-inp" type="text" value="${esc(moneyFmt(salesBase(p)))}" readonly tabindex="-1" aria-label="${esc(L)}"><span class="money-unit">Ft</span></div></div>`;}
/* Értékesítői jutalék: a projekthez tartozó szerződött lehetőség (Értékesítés fül) értékesítője és várható jutaléka */
const projDeal=p=>(S.deals||[]).find(d=>d.projectId===p.id&&d.stage==='nyert')||null;
const salesOn=p=>!!projDeal(p)||!!(S.salesOn||{})[p.id];
const salesBase=p=>Math.max(0,projTotal(p)-orgFee(p)-extrasRaw(p).filter(e=>e&&e.kind==='tov').reduce((s,e)=>s+num(e.amount),0));   // jutalékalap: a szervezői jutalék és a továbbszámlázott költség után   // jutalékalap: a továbbszámlázott költség nélkül
function salesCommEst(p,d){if(!d)return null;const base=salesBase(p),man=String(d.commManual==null?'':d.commManual).trim();
  if(/^ft:/.test(man)){const a=num(man.slice(3));return {amt:a,pct:base>0?Math.round(a/base*10000)/100:0,base,manual:true};}   // kézzel megadott összeg
  if(man!==''&&!isNaN(Number(man)))return {amt:Math.round(base*Number(man)/100),pct:Number(man),base,manual:true};
  const sp=(S.salesPeople||[]).find(x=>x.userId===d.ownerId);if(!sp)return num(d.commAmt)?{amt:num(d.commAmt),pct:d.commPct,base}:null;
  const pct=base>=num(sp.commLimit)?num(sp.commHigh):num(sp.commLow);return {amt:Math.round(base*pct/100),pct,base};}
function salesCommFields(p){const d=projDeal(p);if(!isAdmin()||!d||isFree(p))return '';const e=salesCommEst(p,d)||{amt:0,pct:''},dis=ro()||projLocked()?' disabled':'';
  const tip=`${esc(d.ownerName||'Értékesítő')} jutaléka${e.manual?' (ennél a projektnél kézzel megadva)':' (az értékesítő sávos szabálya szerint)'} – a jutalékalap a továbbszámlázott költség nélküli érték: ${ftFmt(salesBase(p))}. Üresre törölve visszaáll a szabályra.`;
  return `<div class="field fin-scp"><label title="${tip}">Jutalék</label><div class="money"><input class="inp money-inp" id="f-salesPct" type="text" inputmode="decimal" data-sales-pct value="${esc(String(e.pct===''?'':e.pct).replace('.',','))}" placeholder="%" aria-label="Értékesítői jutalék százaléka"${dis}><span class="money-unit">%</span></div></div>
    <div class="field fin-scf"><label title="${tip}">${esc(d.ownerName||'Értékesítő')}</label><div class="money"><input class="inp money-inp" id="f-salesFt" type="text" inputmode="numeric" data-money="big" data-sales-ft value="${esc(moneyFmt(e.amt))}" placeholder="0" aria-label="Értékesítői jutalék összege"${dis}><span class="money-unit">Ft</span></div></div>`;}
function salesOption(p){if(!isAdmin()||!salesOn(p))return '';const d=projDeal(p),dis=ro()||projLocked(),est=d?salesCommEst(p,d):null;
  const nmK=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const ppl=(S.salesPeople||[]).filter((x,i,a)=>a.findIndex(y=>nmK(y.name)===nmK(x.name))===i).concat((S.crew||[]).filter(c=>(c.roles||[]).includes('Értékesítő')&&!(S.salesPeople||[]).some(x=>x.crewId===c.id||nmK(x.name)===nmK(c.name))).map(c=>({userId:'crew:'+c.id,name:c.name,crewId:c.id})))   // névre is szűrve: egy ember egyszer   // értékesítő felhasználók + „Értékesítő” szerepű munkatársak
    .sort((a,b)=>String(a.name).localeCompare(String(b.name),'hu'));
  const opts=ppl.map(x=>`<option value="${esc(x.userId)}"${d&&d.ownerId===x.userId?' selected':''}>${esc(x.name)}</option>`).join('')+(d&&d.ownerId&&!ppl.some(x=>x.userId===d.ownerId)?`<option value="${esc(d.ownerId)}" selected>${esc(d.ownerName||'Értékesítő')}</option>`:'');
  return `<div class="ref-opt in-ex sales-opt"><label class="toggle"><input type="checkbox" data-sales-toggle checked${dis?' disabled':''}><span class="tl">💼 Értékesítői jutalék</span></label>
    <div class="ref-list org-line"><select class="inp" id="sales-sel" data-cmb="Értékesítő kiválasztása…"${dis?' disabled':''}><option value="">Értékesítő kiválasztása…</option>${opts}</select>
    ${d?'':'<span class="muted">Válaszd ki, ki értékesítette a projektet.</span>'}</div>
    <p class="hint" style="margin:4px 0 0">Összekötve az Értékesítés füllel${d?` (${esc(d.source||'')}${d.wonAt?', szerződve '+esc(fmtShort(String(d.wonAt).slice(0,10))):''})`:''}. A jutalék % és összege fent, a termelői keret mellett látszik (ott kézzel is átírható); a tényleges jutalék havonta, a befolyt nettó összeg után számolódik.</p></div>`;}
/* Ajánlói jutalék: projektopció (nem munkatársi szerep) */
const refOn=p=>(p.fees||[]).some(f=>f.kind==='fixed'&&f.key==='ref')||!!(S.refOn||{})[p.id];
function refOption(p,inEx){if(!isAdmin())return '';if(!inEx&&!isFree(p))return '';   // csak az ügyvezető látja: az Extrák és kedvezmények alatt (díjmentes projektnél lent)
  const refs=(p.fees||[]).filter(f=>f.kind==='fixed'&&f.key==='ref'),on=refOn(p),dis=ro()||projLocked();
  if(inEx&&!on)return '';   // a „＋ Hozzáadás…” menüből kapcsolható be
  const opts=(S.crew||[]).filter(c=>!refs.some(f=>f.refCrewId===c.id)).sort((a,b)=>a.name.localeCompare(b.name,'hu')).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  return `<div class="ref-opt${inEx?' in-ex':''}"><label class="toggle"><input type="checkbox" data-ref-toggle${on?' checked':''}${dis?' disabled':''}><span class="tl">🤝 Ajánlói jutalék szakembernek</span></label>
    ${on?`<div class="ref-list">${refs.map(f=>`<span class="ref-chip">🤝 ${esc((crewById(f.refCrewId)||{}).name||(S.crewNames||{})[f.refCrewId]||f.name)}${num(f.amount)?' · '+ftFmt(num(f.amount)):' · <span class="warn-txt">összeg?</span>'}${dis?'':`<button class="x w" type="button" data-action="ref-del" data-id="${esc(f.refCrewId)}" aria-label="Törlés">×</button>`}</span>`).join('')}
      ${dis?'':`<select class="inp" id="ref-add" data-cmb="+ szakember kiválasztása (kezdj el gépelni)…" data-cmb-sub="crew"><option value="">+ szakember kiválasztása…</option>${opts}</select>`}</div><p class="hint" style="margin:4px 0 0">Az összeget az Egyéb költségek között add meg; a jutalék a szakember Kifizetéseiben jelenik meg.</p>`:''}</div>`;}
function crewFinalBox(p,ids){
  if(!ids.length)return '';
  if(crewPast(p))return `<div class="crew-final past" id="crew-final"><div class="cf-msg"><b>🔒 A rendezvény már lezajlott</b><small>A csapat és az eszközök utólag nem módosíthatók.</small></div></div>`;
  const st=crewFinalState(p),f=p.crewFinal,freeCut=postTasks(p).filter(t=>!taskOwners(p,t.k).length).length,on=crewFinalOn()&&!freeCut;
  // a véglegesítő ablak nem ugrik fel magától – csak a „Módosítások véglegesítése” gombra
  const sentL=(f&&(f.sentTo&&f.sentTo.length?f.sentTo:(f.notified||[]).map(n=>({name:n,email:((S.crew||[]).find(c=>c.name===n)||{}).email||''}))))||[];
  const msg=st==='ok'?`<b>✅ Csapat véglegesítve</b><small>${esc(f.at||'')}${f.by?' · '+esc(f.by):''} · a tagok a naptárban vannak${S.mailOn===false?' · <span class="warn-txt">⏸ az e-mail értesítések szünetelnek (Beállítások), ezért e-mailt nem kaptak</span>':''}</small>${S.mailOn===false?'':sentL.length?`<div class="cf-sent">✉️ E-mail kiküldve: ${sentL.map(x=>`<span class="nowrap"><b>${esc(x.name)}</b>${x.email?` <span class="muted">(${esc(x.email)})</span>`:''}</span>`).join(', ')}</div>`:'<div class="cf-sent muted">✉️ Ennél a véglegesítésnél nem kellett új e-mailt küldeni.</div>'}`
    :st==='changed'?`<b>⚠️ A csapat módosult a véglegesítés óta</b><small>Véglegesítsd újra, hogy a naptár és az értesítések az új csapatot kövessék – vagy állítsd vissza arra, amit a munkatársak megkaptak.</small>${crewDiffHtml(p)}${ro()||projLocked()||!(f&&f.sigs)?'':'<div class="btns" style="margin-top:8px"><button class="btn outline small" type="button" data-action="crew-revert">↶ Visszaállítás a kiküldött állapotra</button></div>'}`
    :`<b>⚠️ A csapat még nincs véglegesítve</b><small>A tagok csak véglegesítéskor kerülnek a naptárba, és csak akkor kapnak e-mailt és naptárértesítést. A helyszíni munkára lépéshez kötelező.</small>`;
  const ef=p.eqFinal,es=eqFinalState(p),noEq=!(p.equipment||[]).length&&!(p.rentals||[]).length&&es==='none',eqBox=st==='ok'&&!noEq?`<div class="crew-final ${es}" id="eq-final">${es==='ok'&&!(S.eqEdit||{})[p.id]?`<button class="btn outline small" type="button" data-action="eq-edit">✏️ Eszközök módosítása</button>`:`<button class="btn ${es==='none'?'primary':'outline'} small" type="button" data-action="eq-finalize">${es==='changed'?'🔁 Eszközök újra véglegesítése':'🎒 Eszközök véglegesítése'}</button>`}<div class="cf-msg">${es==='ok'?`<b>✅ Eszközök véglegesítve</b><small>${esc(ef.at||'')}${ef.by?' · '+esc(ef.by):''}${(S.eqEdit||{})[p.id]?' · szerkesztés alatt – módosítás után véglegesítsd újra':''}</small>`:es==='changed'?'<b>⚠️ Az eszközök módosultak a véglegesítés óta</b><small>Véglegesítsd újra.</small>':'<b>🎒 Az eszközök még nincsenek véglegesítve</b><small>Rendeld hozzá a kamerákat, objektíveket és a többi eszközt, aztán véglegesítsd.</small>'}</div></div>`:'';
  const editBtn=st==='ok'?((S.crewEdit||{})[p.id]?'<small class="bad-txt"><b>⚠️ A csapat szerkesztés alatt</b> – módosítás után véglegesítsd újra, a stáb újra értesítést kap.</small>':`<button class="btn alarm small" type="button" data-action="crew-edit">⚠️ Csapat módosítása</button>`):'';
  const editing=!!(S.crewEdit||{})[p.id];
  if(st==='changed'&&!editing)return `<div class="crew-final changed" id="crew-final"><button class="btn alarm small" type="button" data-action="crew-edit">⚠️ Csapat módosítása</button><div class="cf-msg"><b>⚠️ A csapat a véglegesítés óta módosult</b><small>A változások csak a „Csapat módosítása” után (indoklással) véglegesíthetők – vagy állítsd vissza arra, amit a munkatársak megkaptak.</small>${crewDiffHtml(p)}${projLocked()||!(f&&f.sigs)?'':'<div class="btns" style="margin-top:8px"><button class="btn outline small" type="button" data-action="crew-revert">↶ Visszaállítás a kiküldött állapotra</button></div>'}</div></div>${eqBox}`;
  return `<div class="crew-final ${st}" id="crew-final">${st==='ok'?editBtn:`<button class="btn ${st==='none'?'primary':'outline'} small" type="button" data-action="crew-finalize"${on?'':' disabled'}>${st==='changed'?'✅ Módosítások véglegesítése':'✅ Csapat véglegesítése'}</button>`}<div class="cf-msg">${msg}${freeCut&&st!=='ok'?`<small class="bad-txt"><b>⛔ Nem véglegesíthető:</b> ${freeCut} videó még nincs vágóhoz rendelve${cutterIds(p).length?'':' (nincs vágó beosztva)'}.</small>`:on||freeCut?'':'<small>A háttérkód frissítése után kapcsol be.</small>'}</div></div>${eqBox}`;
}
function crewEquipPanel(p,st,c,sortedCrew,leadOpts,leadBusy,personOpts,selRole,inner){
  const ROLES=projRoles(p);if(!ROLES.includes(selRole))selRole=ROLES.includes('Vágó')?'Vágó':ROLES[0];   // videóvágásnál csak projektvezető és vágó
  const opts=itemOptions(p);
  const ids=[];if(p.lead)ids.push(p.lead);(p.crew||[]).forEach(a=>{if(!ids.includes(a.crewId))ids.push(a.crewId);});
  const PD=projDays(p),selDay=PD.includes(S.crewDay)?S.crewDay:'',shownIds=selDay?ids.filter(id=>isPostOnly(p,id)||crewDaysOf(p,id).includes(selDay)):ids;   // utómunkás (pl. vágó) nem napokhoz kötött: minden napnál látszik   // több napos: napokra bontott stáb
  const dayTabs=PD.length?`<div class="day-tabs" role="tablist" aria-label="Stáb napok szerint"><button type="button" class="day-tab${selDay?'':' on'}" data-action="crew-day-tab" data-d="" role="tab" aria-selected="${!selDay}">Minden nap <span class="c">${ids.length}</span></button>${PD.map((dd,k)=>{const n=ids.filter(id=>!isPostOnly(p,id)&&crewDaysOf(p,id).includes(dd)).length;return `<button type="button" class="day-tab${selDay===dd?' on':''}" data-action="crew-day-tab" data-d="${dd}" role="tab" aria-selected="${selDay===dd}">${k+1}. nap · ${esc(dayLbl(dd))} <span class="c">${n}</span></button>`;}).join('')}</div>${selDay&&!ro()?`<p class="hint" style="margin:6px 0 0">A ${PD.indexOf(selDay)+1}. napra beosztott stáb. Akit most veszel fel, csak erre a napra kerül.</p>`:''}`:'';
  const CL=crewLocked(p),EL=eqLocked(p);
  const cards=shownIds.map(cid=>{const cr=crewById(cid),busy=busyFor(cid,p),tight=tightFor(cid,p);
    const roles=(p.crew||[]).map((a,i)=>({a,i})).filter(x=>x.a.crewId===cid&&!(x.a.role==='Projektvezető'&&p.lead===cid));   /* a projektvezetőt a jelvény mutatja – ne jelenjen meg tévesen más szerepként */
    const roleHtml=roles.map(({a,i})=>`<span class="role-sel"><select class="inp" data-crew-role="${i}" data-cmb="Szerep…" data-cmb-cls="inp role-cmb" aria-label="Szerep"${D()}>${CREW_ROLES.filter(r=>r!=='Projektvezető'&&(ROLES.includes(r)||r===a.role||(OP_SUB.includes(r)&&ROLES.includes('Operatőr')))).map(rl=>`<option value="${esc(rl)}"${OP_SUB.includes(rl)?' data-parent="Operatőr"':''}${rl===a.role?' selected':''}>${esc(rl)}${rl==='Vágó'&&onsiteCut(p,cid)?' · 📍 Helyszíni':''}</option>`).join('')}</select><button class="x w" type="button" data-action="crew-remove" data-i="${i}" aria-label="Szerep eltávolítása" title="Levétel a projektről ebben a szerepben">×</button></span>${a.role==='Vágó'&&!ro()?`<label class="remote-chk" data-tip="A vágó alapból otthonról dolgozik, ezért nem ütközik más munkával. Pipáld be, ha a helyszínen vág."><input type="checkbox" data-edit-onsite="${esc(cid)}"${onsiteCut(p,cid)?' checked':''}${projLocked()?' disabled':''}> 📍 Helyszíni vágó</label>`:''}`).join('');
    const free=(p.lead===cid?[]:['Projektvezető']).concat(CREW_ROLES.filter(r=>r!=='Projektvezető'&&(ROLES.includes(r)||(OP_SUB.includes(r)&&ROLES.includes('Operatőr')))&&!roles.some(x=>x.a.role===r)));
    const addRole=ro()||!free.length?'':`<span class="role-sel role-add"><select class="inp" data-crew-addrole="${esc(cid)}" data-cmb="+ Szerep" data-cmb-cls="inp role-cmb" aria-label="Extra szerep hozzáadása"><option value="">+ Szerep</option>${free.map(rl=>`<option${OP_SUB.includes(rl)&&free.includes('Operatőr')?' data-parent="Operatőr"':''}>${esc(rl)}</option>`).join('')}</select></span>`;
    const rows=eqRowsFor(p,cid),leadOnly=p.lead===cid&&!roles.length,note=(p.crewNotes||{})[cid]||'';
    const first=cr?String(cr.name).split(' ').slice(-1)[0]:'';
    const rentHtml=rentalsOf(p,cid).map(r=>`<div class="eqrow rent"><div class="who"><b>${esc(r.name)}</b><small>${r.own?'Saját eszköz':'Bérelt'}${r.company?' · '+esc(r.company):''}${canSeeFees()&&num(r.price)?' · '+ftFmt(r.price):''}</small></div>${ro()?'':`<button class="trash" type="button" data-action="rent-remove" data-id="${esc(r.id)}" aria-label="Bérelt eszköz törlése">🗑️</button>`}</div>`).join('');
    const postOnly=feePost(p,cid)&&!onsiteCut(p,cid)&&!rows&&!rentHtml;   // az értékesítő kaphat eszközt (pl. tablet a standhoz)   // csak vágó (utómunka) / értékesítő: nincs eszköz, nem kap eszközlistát
    const eqBlock=postOnly?'':`<div class="pcrew-eq">${rows||rentHtml||leadOnly?'':'<p class="hint" style="margin:2px 0 0">Még nincs nála eszköz.</p>'}${rows}${rentHtml}${eqAddRow(p,cid,opts)}</div>`;
    const noteBlock=ro()?(note?`<div class="pcrew-note-ro"><b>Neked szóló jegyzet:</b> ${esc(note)}</div>`:''):`<textarea class="inp pcrew-note" data-crew-note="${esc(cid)}" rows="2" placeholder="Személyes jegyzet ${esc(first)} számára – ${postOnly?'a beosztásos levélbe kerül':'az eszközlistás levélbe is bekerül'}">${esc(note)}</textarea>`;
    return `<div class="pcrew${p.lead===cid?' is-lead':''}${CL?' locked':''}" data-eq-drop="${esc(cid)}">${p.lead===cid?`<span class="lead-badge">★ Projektvezető${p.leadRemote?' · 🛰️ Remote':''}</span>`:''}<div class="pcrew-person"${CL?' inert':''}><div class="pcrew-top">${avatar(cr)}${ro()?'':p.lead===cid?`<span class="lead-star on" data-tip="Ő a projektvezető – a stáb kapcsolattartója">★</span>`:`<button class="lead-star" type="button" data-action="make-lead" data-id="${esc(cid)}" data-tip="Kijelölés projektvezetőnek – ő lesz a stáb kapcsolattartója" aria-label="${esc(cr?cr.name:'')} kijelölése projektvezetőnek">☆</button>`}${ro()?'':`<button class="trash pcrew-del" type="button" data-action="crew-person-remove" data-id="${esc(cid)}" aria-label="Levétel a projektről" data-tip="Levétel a projektről (minden szerepével)">🗑️</button>`}<div class="who"><b>${esc(cr?cr.name:'Törölt munkatárs')}</b>${busy.length?`<span class="bad-txt">Ütközik: ${busy.map(q=>`<button class="linkbtn bad-link" type="button" data-action="open-project" data-id="${esc(q.id)}" title="${esc(q.name||'')} megnyitása">${esc(q.name||'projekt')}</button>`).join(', ')}</span>`:cr&&cr.phone?`<small>${esc(cr.phone)}</small>`:''}</div></div>
      ${tight.map(g=>`<p class="tight-note${g.gap<TRAVEL_RED_MIN?' bad':''}">${g.gap<TRAVEL_RED_MIN?'⛔':'⏱️'} ${tightText(g)}</p>`).join('')}
      <div class="pcrew-roles">${p.lead===cid?`${ro()||projLocked()||CL?'':`<button class="linkbtn lead-rm" type="button" data-action="lead-remove" title="Projektvezető szerep levétele">projektvezető levétele</button>`}${ro()?'':`<label class="remote-chk" data-tip="A projektet távolról vezeti – nem kell a helyszínen lennie, ezért nem ütközik más munkával"><input type="checkbox" data-lead-remote="1"${p.leadRemote?' checked':''}${projLocked()?' disabled':''}> 🛰️ Remote</label>${p.leadRemote&&!remoteLead(p)?(()=>{const on=[...new Set((p.crew||[]).filter(a=>a.crewId===cid&&!(POST_ROLES.includes(a.role)&&!(a.role==='Vágó'&&onsiteCut(p,cid)))).map(a=>a.role==='Vágó'?'helyszíni vágó':String(a.role).toLowerCase()))];return `<p class="hint warn-txt" style="margin:4px 0 0">⚠️ Remote vezeti, de ${esc(on.join(', ')||'helyszíni szerepben')}ként is be van osztva, ezért a helyszínen kell lennie – ezért ütközhet. Ha nem megy ki, vedd le ezt a szerepet.</p>`;})():''}`}`:''}${roleHtml}${addRole}</div>
      ${projDays(p).length&&!isPostOnly(p,cid)?`<div class="pcrew-days" aria-label="Munkanapok">${projDays(p).map(dd=>{const on=crewDaysOf(p,cid).includes(dd);return ro()?(on?`<span class="day-chip on">${esc(dayLbl(dd))}</span>`:''):`<button type="button" class="day-chip${on?' on':''}" data-action="crew-day" data-cid="${esc(cid)}" data-d="${dd}" aria-pressed="${on}" title="${on?'Dolgozik ezen a napon – kattints, ha mégsem':'Nem dolgozik ezen a napon'}">${esc(dayLbl(dd))}</button>`;}).join('')}</div>`:''}
      </div><div class="pcrew-eqwrap"${EL?' inert':''}>${eqBlock}</div><div class="pcrew-cutwrap"${CL?' inert':''}>${cutTasksBlock(p,cid)}</div><div class="pcrew-eqwrap"${EL?' inert':''}>${noteBlock}</div></div>`;}).join('');
  const commonRows=eqRowsFor(p,'')+(p.equipment||[]).map((e,i)=>({e,i})).filter(x=>x.e.crewId&&!ids.includes(x.e.crewId)).map(({e,i})=>{const it=itemById(e.itemId);
    return `<div class="eqrow"><div class="who"><b>${esc(it?it.name:'Törölt eszköz')}</b><small>${esc((crewById(e.crewId)||{}).name||'')} – már nincs a projekten</small></div><input class="inp qty" type="number" min="1" inputmode="numeric" data-eq-i="${i}" value="${num(e.qty)}" aria-label="Darabszám"${D()}><button class="x w" type="button" data-action="eq-remove" data-i="${i}" aria-label="Eszköz eltávolítása">×</button></div>`;}).join('');
  const eqN=eqCount(p),hasEq=(p.equipment||[]).length;
  const aside=`${ids.length} fő · ${eqN} eszköz`;
  const body=`<div class="need">${st.map(s=>`<span class="statuspill ${s.have>=s.need?'p-ok':'p-warn'}" title="${s.have<s.need?'Kellene: '+s.need:''}">${esc(s.role)} ${s.have}</span>`).join('')}</div>
    <p class="hint">Munkatársanként rendeld hozzá, kinél milyen eszköz lesz.</p>
    ${!p.lead&&!ro()?`<div class="need-lead-box"><b>⚠️ Nincs projektvezető</b><span>Minden projektnek kell egy vezető – ő a stáb kapcsolattartója, és nélküle a projekt nem léphet tovább.</span>${projLocked()||crewLocked(p)?'':`<select class="inp" id="lead-pick" style="width:auto"><option value="">★ Projektvezető kijelölése…</option>${(()=>{const on=new Set(ids),all=(S.crew||[]).slice().sort((a,b)=>a.name.localeCompare(b.name,'hu')),a=all.filter(c=>on.has(c.id)),b=all.filter(c=>!on.has(c.id)&&(c.roles||[]).includes('Projektvezető'));return (a.length?`<optgroup label="A projekten">${a.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</optgroup>`:'')+(b.length?`<optgroup label="Projektvezetők">${b.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</optgroup>`:'');})()}</select>`}</div>`:''}
    ${leadBusy.length?`<p class="bad-txt" style="margin:6px 0 0">A projektvezető ütközik: ${esc(leadBusy.map(q=>q.name).join(', '))}</p>`:''}
    ${dayTabs}
    <div class="pcrew-list">${cards}${ro()||projLocked()||CL?(cards?'':empty('Még nincs beosztva senki.')):`<div class="pcrew pcrew-add-card"><div class="pcrew-add-h"><span class="plus">+</span><span>Szakember hozzáadása${selDay?' erre a napra':''}</span></div>${ro()?'':S.crew.length?(()=>{const people=sortedCrew.slice().sort((x,y)=>prioNum(x)-prioNum(y)||x.name.localeCompare(y.name,'hu'));
      const on=new Set(ids),fit=people.filter(x=>(x.roles||[]).includes(selRole)),rest=people.filter(x=>!(x.roles||[]).includes(selRole));
      const opt=x=>{const busy=busyFor(x.id,p),already=selRole==='Projektvezető'?p.lead===x.id:(p.crew||[]).some(a=>a.crewId===x.id&&a.role===selRole)&&(!selDay||crewDaysOf(p,x.id).includes(selDay));return `<option value="${esc(x.id)}"${already?' disabled':''}>${prioNum(x)<9?'P'+prioNum(x)+' · ':''}${esc(x.name)}${already?' – már be van osztva':busy.length?' – foglalt':on.has(x.id)?' – már a projekten':''}</option>`;};
      return `<div class="addrow labeled add-in-card"><div class="field"><label for="add-crew-role">Beosztás</label><select class="inp" id="add-crew-role" data-cmb="Beosztás…">${ROLES.map(rl=>`<option${OP_SUB.includes(rl)?' data-parent="Operatőr"':''}${rl===selRole?' selected':''}>${esc(rl)}</option>`).join('')}</select></div>
      <div class="field"><label for="add-crew-person">Munkatárs</label><select class="inp" id="add-crew-person"><option value="">Munkatárs kiválasztása…</option>${fit.length?`<optgroup label="${esc(selRole)}">${fit.map(opt).join('')}</optgroup>`:''}${rest.length?`<optgroup label="Egyéb munkatársak">${rest.map(opt).join('')}</optgroup>`:''}</select></div></div>`;})():`<p class="hint">Előbb vegyél fel munkatársakat a <button class="linkbtn" type="button" data-action="tab" data-tab="stab">Stáb</button> fülön.</p>`}</div>`}</div>
    ${commonRows||rentalsOf(p,'').length||(!ro()&&ids.length===0)?`<div class="pcrew pcrew-common" data-eq-drop=""${EL?' inert':''}><div class="pcrew-top"><div class="who"><b>Közös eszközök</b><small>Még nincs felelőshöz rendelve</small></div></div><div class="pcrew-eq">${commonRows}${rentalsOf(p,'').map(r=>`<div class="eqrow rent"><div class="who"><b>${esc(r.name)}</b><small>${r.own?'Saját eszköz':'Bérelt'}${r.company?' · '+esc(r.company):''}${canSeeFees()&&num(r.price)?' · '+ftFmt(r.price):''}</small></div>${ro()?'':`<button class="trash" type="button" data-action="rent-remove" data-id="${esc(r.id)}" aria-label="Bérelt eszköz törlése">🗑️</button>`}</div>`).join('')}${eqAddRow(p,'',opts)}</div></div>`:''}
    ${!S.inventory.length&&!ro()?`<p class="hint">Eszközt a <button class="linkbtn" type="button" data-action="tab" data-tab="leltar">Leltár</button> fülön tudsz felvenni.</p>`:''}
    ${ro()?'':crewFinalBox(p,ids)}
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
/* Átadandó anyagok: a drónos, timelapse és POV felvétel nem önálló átadandó – csak nyersanyag az utómunkázott videókhoz */
function deliverItems(p){
  const items=[];
  DELIVERABLES.forEach(it=>{const n=num(p[it.k]);if(n>0)items.push(`${esc(it.label)}: <b>${n}</b>`);});
  if(p.er_post&&!num(p.er_post_n))items.push('<b>1</b> helyszín előadásainak utómunkája');
  REC_COUNTS.filter(it=>it.k!=='er_rooms'&&num(p[it.k])>0).forEach(it=>items.push(it.k==='er_post_n'?`<b>${num(p[it.k])}</b> helyszín előadásainak utómunkája`:`${esc(it.label)}: <b>${num(p[it.k])}</b>`));
  if(num(p.foto_db)>0)items.push(`Fotók utómunkája: <b>${num(p.foto_db)}</b> db`);
  ['x_nyersVetel','x_nyersTarolas','x_rush'].forEach(k=>{const e=EXTRAS.find(x=>x.k===k);if(e&&p[k])items.push(esc(e.label));});
  return items;
}
/* Videónkénti vágói követés: a megrendelt darabszámokból sorok (háttér hozza létre); a vezető a vágót és az állapotot, a vágó a saját videóinak vágási állapotát állítja */
const VID_ST=[['vagasra','Utómunkára vár'],['vagas','Utómunka alatt'],['ellen','Belső ellenőrzés'],['leadva','Jóváhagyásra vár'],['jovahagyva','Jóváhagyva'],['modositas','Módosítást kér']];
const VID_CLS={vagasra:'p-mute',vagas:'p-warn',ellen:'p-warn',leadva:'p-ok',jovahagyva:'p-ok',modositas:'p-bad'};
/* ===== Vágás – Trello-szerű tábla: videónként egy kártya, oszloponként az állapotok; húzással (vagy a → gombbal) léptethető ===== */
/* Ügyfél jóváhagyására vár: megnyitotta-e már a levélben kapott linket */
function seenPill(v){if(!v||v.st!=='leadva'||ro()||!(isAdmin()||(S.me&&S.me.role==='editor'))||!(v.cm||[]).some(x=>/Ügyfélnek elküldve/.test(x.t||'')))return '';const f=x=>String(x||'').slice(0,16).replace('T',' ').replace(/^\d{4}-(\d\d)-(\d\d)/,(m,a,b)=>a+'.'+b+'.');
  return v.seenAt?`<span class="bd-seen on" data-tip="${esc('A jóváhagyó oldalt megnyitották\nElőször: '+f(v.seenAt)+(v.seenN>1?'\nUtoljára: '+f(v.seenLast)+' · összesen '+v.seenN+'×':''))}">👁️ Megnyitották · ${esc(f(v.seenAt))}</span>`:`<span class="bd-seen" data-tip="A levélben kapott linket még nem nyitották meg">✉️ Még nem nyitották meg</span>`;}
const BOARD_COLS=[['modositas','🔁 Módosítást kér'],['vagasra','Utómunkára vár'],['vagas','✂️ Utómunka alatt'],['ellen','🔍 Belső ellenőrzés'],['leadva','📤 Jóváhagyásra vár'],['jovahagyva','✅ Jóváhagyva']];
const boardMe=()=>ro()?((S.me.viewAs&&S.me.viewAs.crewId)||S.me.crewId):'';
const vidOwner=(p,v)=>v.editor||(()=>{const c=(p.crew||[]).filter(a=>a.role==='Vágó').map(a=>a.crewId);return c.length===1?c[0]:'';})();   // egy vágónál a gazdátlan videó az övé
function boardCards(){const me=boardMe(),f=S.boardCut||'';const out=[];
  S.projects.forEach(p=>{if(p.status==='lemondva'||p.status==='atadva'||!Array.isArray(p.videos))return;p.videos.forEach(v=>{const ow=vidOwner(p,v);if(me&&ow!==me)return;if(!me&&f&&ow!==f)return;out.push({p,v,ow});});});
  return out;}
const boardForMe=()=>{const me=boardMe();return !!me&&S.projects.some(p=>Array.isArray(p.videos)&&p.videos.some(v=>vidOwner(p,v)===me));};
/* Sávos tábla: soronként egy projekt (határidő szerint, mint az idővonalon), oszloponként a vágás állapotai */
function boardLanes(cards,opt){opt=opt||{};const mgr=!ro()&&(isAdmin()||(S.me&&S.me.role==='editor')),T=todayISO();
  const showMod=cards.some(c=>c.v.st==='modositas'),COLS=BOARD_COLS.filter(([k])=>k!=='modositas'||showMod);
  const canMove=(c,to)=>{if(c.p.status==='atadva'||c.v.st==='jovahagyva')return false;   /* jóváhagyott videó nem mozdítható */if(mgr)return true;return ['vagas','ellen'].includes(to)&&!['jovahagyva','leadva'].includes(c.v.st)&&!(c.v.st==='ellen'&&to!=='ellen');};   // a vágó csak „Utómunka alatt” és „Belső ellenőrzés” oszlopba húzhat; az ügyfél-jóváhagyásba csak ügyvezető / termelési vezető
  const nextOf=st=>({modositas:'vagas',vagasra:'vagas',vagas:'ellen',ellen:mgr?'leadva':''})[st]||'';
  const card=c=>{const nx=nextOf(c.v.st),nl=nx?(BOARD_COLS.find(x=>x[0]===nx)||[])[1]:'',drag=canMove(c,nx||c.v.st);
    return `<div class="bd-card st-${esc(c.v.st)}${c.v.link?' has-link':''}"${drag?' draggable="true"':''} data-action="vid-view" data-pid="${esc(c.p.id)}" data-vid="${esc(c.v.id)}" data-bd-pid="${esc(c.p.id)}" data-bd-vid="${esc(c.v.id)}" data-bd-st="${esc(c.v.st)}"><div class="bd-t">${esc(c.v.name)}</div>${seenPill(c.v)}${c.v.link||(c.v.cm||[]).length?`<span class="bd-link">${c.v.link?'▶ videó':''}${(c.v.st==='modositas'||c.v.st==='vagas')&&c.v.fb?' · ↩ javítandó':''}${(c.v.cm||[]).length?`${c.v.link?' · ':''}💬 ${c.v.cm.length}`:''}</span>`:'<span class="bd-link bd-ph" aria-hidden="true">&nbsp;</span>'}
      ${mgr||nx?`<div class="bd-m">${mgr?`<span class="bd-who">${esc((crewById(c.ow)||{}).name||'— nincs vágó —')}</span>`:''}${nx&&canMove(c,nx)?`<button type="button" class="bd-next" data-action="bd-move" data-pid="${esc(c.p.id)}" data-vid="${esc(c.v.id)}" data-st="${nx}" title="Tovább: ${esc(nl.replace(/^\S+\s/,''))}">→</button>`:''}</div>`:''}</div>`;};
  const byP=new Map();cards.forEach(c=>{if(!byP.has(c.p.id))byP.set(c.p.id,{p:c.p,L:[]});byP.get(c.p.id).L.push(c);});
  const lanes=[...byP.values()].sort((a,b)=>String(dueDate(a.p)||'9999').localeCompare(String(dueDate(b.p)||'9999')));
  const lane=({p,L})=>{const due=dueDate(p),di=dueInfo(p),done=L.filter(c=>c.v.st==='leadva'||c.v.st==='jovahagyva').length;
    const q=pr(p),st=q?addDays(q.end,1):T,tot=due&&validISO(st)?Math.max(1,diffDays(st,due)+1):0,left=due?diffDays(T,due):null,pct=tot?Math.max(0,Math.min(100,Math.round((1-Math.max(0,left)/tot)*100))):0;
    const tone=left==null?'':left<0?'bad':left<=1?'bad':left<=3?'warn':'ok';
    const lbl=`${opt.noLink?`<b>${esc(p.name||'Névtelen projekt')}</b>`:`<button type="button" class="linkbtn bl-nm" data-action="open-project" data-id="${esc(p.id)}">${esc(p.name||'Névtelen projekt')}</button>`}
        <div class="bl-sub">${di?`<span class="statuspill p-${di.cls}">${esc(di.txt)}</span>`:''}<span class="bl-cnt">${done}/${L.length} leadva</span></div>${tot?`<div class="bl-clock ${tone}" title="Határidő: ${esc(fmtDay(due))}"><i style="width:${pct}%"></i></div>`:''}`;if(opt.single)opt.headLbl=`<div class="bl-sub">${di?`<span class="statuspill p-${di.cls}">${esc(di.txt)}</span>`:''}<span class="bl-cnt">${done}/${L.length} leadva</span></div>${tot?`<div class="bl-clock ${tone}" title="Határidő: ${esc(fmtDay(due))}"><i style="width:${pct}%"></i></div>`:''}`;
    return `<div class="bl-row" data-bl-pid="${esc(p.id)}"><div class="bl-lbl${opt.single?' bl-empty':''}">${opt.single?'':lbl}</div>
      ${COLS.map(([k])=>`<div class="bl-cell c-${k}" data-bd-col="${k}" data-bd-lane="${esc(p.id)}">${L.filter(c=>c.v.st===k).map(card).join('')}</div>`).join('')}</div>`;};
  const body=lanes.map(lane).join('');   /* egyetlen projekt (videótábla ablak): a projekt kártyája a fejléc sorába kerül */
  return `<div class="bl${opt.single?' bl-single':''}" style="--bl-n:${COLS.length}"><div class="bl-row bl-head"><div class="bl-lbl${opt.headLbl?' bl-hl':''}">${opt.headLbl||''}</div>${COLS.map(([k,l])=>{const n=cards.filter(c=>c.v.st===k).length;return `<div class="bl-h c-${k}">${l} <span class="bd-n">${n}</span>${n>1&&k!=='vagas'&&k!=='vagasra'&&cards.filter(c=>c.v.st===k&&c.v.link).length>1?`<button type="button" class="bl-play" data-action="bd-col-play" data-col="${k}" title="Átnézés: az oszlop videói egymás után" aria-label="Átnézés">▶</button>`:''}${n>1&&!opt.noSel?`<button type="button" class="bl-play bl-selall" data-action="bd-col-sel" data-col="${k}" title="Mind kijelölése (csoportos húzáshoz)" aria-label="Mind kijelölése">☑</button>`:''}</div>`;}).join('')}</div>${body}</div>`;}
function viewCutBoard(){const me=boardMe(),mgr=!ro()&&(isAdmin()||(S.me&&S.me.role==='editor')),cards=boardCards();
  const cutters=mgr?(S.crew||[]).filter(c=>S.projects.some(p=>Array.isArray(p.videos)&&p.videos.some(v=>vidOwner(p,v)===c.id))).sort((a,b)=>String(a.name).localeCompare(String(b.name),'hu')):[];
  const filt=mgr?`<select class="inp" id="bd-cut" style="width:auto" data-cmb="Vágó szerint…"><option value="__all"${S.boardCut?'':' selected'}>Minden vágó</option>${cutters.map(c=>`<option value="${esc(c.id)}"${S.boardCut===c.id?' selected':''}>${esc(c.name)}</option>`).join('')}</select>`:'';
  return `<div class="page-head"><div class="grow"><h2>Vágás</h2><p class="sub">${me?'A saját videóid':'Videók állapot szerint'}, projektenként a határidő sorrendjében · húzd át a kártyát a projekt sorában, vagy nyomd meg a → gombot</p></div>${filt}</div>
    ${cards.length?boardLanes(cards):`<div class="panel">${empty(me?'Most nincs vágandó videód.':'Nincs vágás alatt lévő videó.')}</div>`}`;}
/* Idővonal: a vágássáv alján a videók állapota színes szakaszokban */
const VPROG_ORDER=['jovahagyva','leadva','ellen','vagas','vagasra','modositas'];
function vidProg(p){const vs=(Array.isArray(p.videos)?p.videos:[]).filter(v=>!ro()||vidOwner(p,v)===boardMe());if(!vs.length)return null;
  const n=k=>vs.filter(v=>v.st===k).length,segs=VPROG_ORDER.map(k=>[k,n(k)]).filter(x=>x[1]);
  return {done:n('leadva')+n('jovahagyva'),ok:n('jovahagyva'),tot:vs.length,html:`<span class="tl-prog">${segs.map(([k,c])=>`<i class="vp-${k}" style="flex:${c}"></i>`).join('')}</span>`,tip:'\n\n🎞️ Videók állapota:\n'+VID_ST.filter(([k])=>n(k)).map(([k,l])=>'• '+l+': '+n(k)).join('\n')};}
function videosPanel(p){const vs=Array.isArray(p.videos)?p.videos:[];if(!vs.length)return '';
  const mgr=!ro()&&(isAdmin()||(S.me&&S.me.role==='editor')),me=S.me&&S.me.crewId,lock=projLocked()||p.status==='atadva'||p.status==='lemondva';
  const done=vs.filter(v=>v.st==='leadva'||v.st==='jovahagyva').length,appr=vs.filter(v=>v.st==='jovahagyva').length;
  const cutters=(S.crew||[]).filter(c=>(c.roles||[]).includes('Vágó')||(p.crew||[]).some(a=>a.crewId===c.id&&a.role==='Vágó')).sort((a,b)=>String(a.name).localeCompare(String(b.name),'hu'));
  const rows=vs.map(v=>{const own=!v.editor||v.editor===me,canSt=!lock&&(mgr||(own&&v.st!=='jovahagyva'&&v.st!=='modositas')),stOpts=(mgr?VID_ST:VID_ST.slice(0,4)).map(([k,l])=>`<option value="${k}"${k===v.st?' selected':''}>${l}</option>`).join('');
    const ed=mgr&&!lock?`<select class="inp" data-vid-ed="${esc(v.id)}" data-cmb="Vágó…"><option value="">— nincs vágó —</option>${cutters.map(c=>`<option value="${esc(c.id)}"${c.id===v.editor?' selected':''}>${esc(c.name)}</option>`).join('')}</select>`:`<span>${esc((crewById(v.editor)||{}).name||'—')}</span>`;
    return `<div class="vid-row"><span class="vid-n">🎞️ ${esc(v.name)}</span>${mgr?ed:''}</div>`;}).join('');   // az állapot a videótáblában (Utómunka lépés / Idővonal)
  return `<section class="panel content vid-panel" id="proj-videos"><h3>🎞️ Videók <span class="aside">${done}/${vs.length} leadva${appr?` · ${appr} jóváhagyva`:''}</span></h3><div class="vid-list">${rows}</div><p class="hint" style="margin:8px 0 0">Az állapotokat a <button type="button" class="linkbtn" data-action="bd-lane" data-id="${esc(p.id)}">videótáblában</button> kezeled (Utómunka lépés / Idővonal).</p></section>`;}
function roContentPanel(p){
  // a szakember ezt a részt nem látja – kivéve a vágót, aki a kért vágnivaló anyagokat igen
  const me=S.me&&S.me.crewId,isEditor=me&&(p.crew||[]).some(a=>a.crewId===me&&a.role==='Vágó');
  if(!isEditor)return '';
  const mine=taskKeysOf(p,me),tasks=postTasks(p).filter(t=>mine.includes(t.k));
  const rows=tasks.map(t=>`<div class="op-row"><span class="op-n">${t.n}${t.k==='foto_db'?' db':'×'}</span><span class="op-l">${esc(t.label)}</span></div>`);
  if(rows.length&&p.x_rush)rows.push(`<div class="op-row"><span class="op-n">⚡</span><span class="op-l">Villámgyors kézbesítés</span></div>`);
  // terepi felvételek: miből dolgozhat a vágó (kamerák, interjúk, kreatív felvételek, fotó)
  const field=[];recRoomsOf(p).forEach((r,i)=>{const cs=roomCams(r);if(cs.length)field.push(`<b>${esc(roomName(r,i))}</b>: `+cs.map(c=>esc(c.label)+(num(r[c.k])>1?' ×'+num(r[c.k]):'')).join(', '));});
  if(p.er_creative)field.push('Kreatív kamera'+(camN(p,'er_creative')>1?' ×'+camN(p,'er_creative'):''));
  INT_FLAGS.forEach(c=>{if(p[c.k])field.push(esc(c.label));});
  EXTRAS.filter(e=>!['x_foto','x_rush','x_nyersTarolas','x_nyersVetel'].includes(e.k)&&p[e.k]).forEach(e=>field.push(esc(e.label)));
  if(fotoN(p)>0)field.push('Fotós a helyszínen'+(fotoN(p)>1?' ×'+fotoN(p):''));
  REC_LIVE.forEach(c=>{if(p[c.k])field.push(esc(c.label));});
  const due=dueDate(p),di=due?dueInfo(p):null,r=pr(p);
  const dueHtml=due?`<div class="cut-due${di&&di.cls!=='ok'?' late':''}"><span>📅 Videók leadási határideje</span><b>${esc(fmtDay(due))}</b>${cutLeft(p)&&p.status!=='atadva'?`<span class="cd-left">⏳ ${esc(cutLeft(p).txt)}</span>`:''}</div>`:'';
  return `<div class="panel content"><h3>✂️ Vágás</h3>${dueHtml}<div class="cut-grid">
    ${editOnly(p)?'':`<section><h4 class="sub-h">📍 Terepi felvételek</h4>${field.length?roList(field):'<p class="hint" style="margin:0">Nincs megadva terepi felvétel.</p>'}${r?`<p class="hint" style="margin:8px 0 0">Forgatás: ${esc(fmtRange(p))}</p>`:''}</section>`}
    <section><h4 class="sub-h">✂️ Vágnivaló anyagok</h4>${rows.length?`<div class="op-list">${rows.join('')}</div>`:`<p class="hint" style="margin:0">${postTasks(p).length?'Ehhez a projekthez még nincs hozzád rendelt vágnivaló.':'Ehhez a projekthez nincs megrendelt vágnivaló anyag.'}</p>`}</section></div></div>${videosPanel(p)}`;

  const rooms=Math.max(1,num(p.er_rooms)||1),rec=[];
  REC_CAMS.forEach(c=>{if(p[c.k])rec.push(esc(c.label)+(camN(p,c.k)>1&&CAM_COUNTS.some(x=>x.flag===c.k)?' ×'+camN(p,c.k):''));});
  REC_LIVE.forEach(c=>{if(p[c.k])rec.push(esc(c.label));});
  if(p.er_post&&!num(p.er_post_n))rec.push('<b>1</b> helyszín előadásainak utómunkája');
  REC_COUNTS.filter(it=>it.k!=='er_rooms'&&num(p[it.k])>0).forEach(it=>rec.push(it.k==='er_post_n'?`<b>${num(p[it.k])}</b> helyszín előadásainak utómunkája`:`${esc(it.label)}: <b>${num(p[it.k])}</b>`));
  if(rec.length&&rooms>1)rec.unshift(`Rögzített helyszínek száma: <b>${rooms}</b>`);
  const krea=[];
  DELIVERABLES.forEach(it=>{const n=num(p[it.k]);if(n>0)krea.push(`${esc(it.label)}: <b>${n}</b>`);if(it.k==='aftermovie'&&fotoDb(p)>0)krea.push(`Fotók utómunkája: <b>${fotoDb(p)} db</b>`);});
  EXTRAS.filter(e=>e.k!=='x_foto'&&e.k!=='x_nyersTarolas'&&p[e.k]).forEach(e=>krea.push(esc(e.label)));
  const tech=TECH.filter(t=>p[t.k]).map(t=>esc(t.label)),plan=String(p.techPlan||'').trim();
  if(!rec.length&&!krea.length&&!tech.length&&!plan)return '';
  const techHtml=tech.length||plan?`<div class="tech-sec"><h4 class="sub-h">💡 Hang-, fény- és vizuáltechnika</h4>${tech.length?roList(tech):''}${plan?`<div class="sec-lbl">Forgatási és technikai terv</div><div class="ro-text">${esc(plan)}</div>`:''}</div>`:'';
  const col=(t,items)=>items.length?`<section class="content-col"><h4 class="sub-h">${t}</h4>${roList(items)}</section>`:'';
  return `<div class="panel content"><h3>🧾 Szolgáltatások</h3>${rec.length||krea.length?`<div class="content-grid${rec.length&&krea.length?'':' single'}">${col('📽️ Előadásrögzítés és kivetítés',rec)}${col('🎬 Kreatív tartalmak',krea)}</div>`:''}${techHtml}</div>`;
}
/* Tartalmak témánként: minden téma egy kártya – bal oldalt a helyszíni feladat, jobb oldalt a hozzá tartozó utómunka.
   Csak a kiválasztott tételek látszanak, a többi a „+ hozzáadás” alatt; a csukott kártya fejlécében címkéken az összefoglaló. */
/* Felelős választó egy kiválasztott szolgáltatáshoz: terepi feladat → szakember(ek), utómunka → egy vágó. A választott ember a szereppel a stábba is bekerül. */
/* Zárolt (véglegesített) csapatnál a név / „nincs beosztva” gomb: kattintásra a „Csapat módosítása”, utána rögtön lenyílik a választó */
function svcUnlockBtn(p,attr,txt,none){const can=!ro()&&!projLocked()&&!crewPast(p)&&!!S.draft&&S.draft.id===p.id&&crewLocked(p);
  return can?`<button type="button" class="op-cut op-unl${none?' none':''}" data-action="svc-unlock" ${attr} data-tip="A csapat véglegesítve van – kattints a módosításhoz">${esc(txt)} ▾</button>`:`<span class="op-cut${none?' none':''}">${esc(txt)}</span>`;}
function svcCan(p){return !ro()&&!projLocked()&&!crewLocked(p)&&!!S.draft&&S.draft.id===p.id;}
function fieldAsg(p,k,role,label,n,only){const ids=slotOwners(p,k),nm=id=>(crewById(id)||{}).name||'?',slots=Math.max(1,n||1,ids.length);   // annyi választó, ahány ember kell (pl. 2 kamera → 2 operatőr)
  if(!svcCan(p))return svcUnlockBtn(p,`data-pick="f:${esc(k)}"`,ids.length?'👥 '+ids.map(nm).join(', '):'👥 nincs beosztva',!ids.length);
  const all=(S.crew||[]).slice().sort((x,y)=>prioNum(x)-prioNum(y)||x.name.localeCompare(y.name,'hu'));
  const sel=i=>{const cur=ids[i]||'',free=all.filter(c=>c.id===cur||!ids.includes(c.id)),strict=k==='x_vago'||k==='x_foto',fit=free.filter(c=>(c.roles||[]).includes(role)||(strict&&c.id===cur)),rest=strict?[]:free.filter(c=>!(c.roles||[]).includes(role)),o=c=>`<option value="${esc(c.id)}"${c.id===cur?' selected':''}>${esc(c.name)}</option>`;
    const ph='👥 '+role.toLowerCase()+(/_op$/.test(k)?'':' kiválasztása');
    return `<select class="inp op-cutsel${cur?'':' none'}" data-cmb="${esc(ph)}" data-cmb-sub="crew" data-cmb-cls="op-cutsel${cur?'':' none'}" data-os-slot="${esc(k)}" data-i="${i}" data-role="${esc(role)}" data-label="${esc(label)}" aria-label="${esc(label)}: ${esc(role.toLowerCase())}"><option value=""${cur?' data-keep="1"':''}>${cur?'— senki (levétel) —':esc(ph)}</option>${fit.length?`<optgroup label="${esc(role)}">${fit.map(o).join('')}</optgroup>`:''}${rest.length?`<optgroup label="Egyéb munkatársak">${rest.map(o).join('')}</optgroup>`:''}</select>`;};
  if(only!=null)return sel(only);   // egyetlen választó (pl. a 2. kreatív kamera saját sorában)
  return Array.from({length:slots},(_,i)=>sel(i)).join('');}
function cutAsg(p,k){const o=taskOwners(p,k),cutters=cutterIds(p),FO=k==='foto_db',rl=FO?['Fotós']:['Vágó'];   // a fotók utómunkáját csak fotós végezheti
  if(!svcCan(p))return svcUnlockBtn(p,`data-pick="c:${esc(k)}"`,o.length?(k==='foto_db'?'📷 ':'✂️ ')+o.map(id=>(crewById(id)||{}).name||'?').join(', '):(k==='foto_db'?'📷 nincs fotós':'✂️ nincs vágóhoz rendelve'),!o.length);
  const all=(S.crew||[]).filter(c=>(c.roles||[]).some(r=>rl.includes(r))||(!FO&&cutters.includes(c.id))||o.includes(c.id)).sort((x,y)=>prioNum(x)-prioNum(y)||x.name.localeCompare(y.name,'hu'));
  const ic=FO?'📷':'✂️',ph=ic+(FO?' fotós kiválasztása':' vágó kiválasztása');
  return `<select class="inp op-cutsel${o.length?'':' none'}" data-cmb="${ph}" data-cmb-sub="crew" data-cmb-cls="op-cutsel${o.length?'':' none'}" data-os-cut="${k}" aria-label="${FO?'Fotós':'Vágó'}"><option value="">${ph}</option>${all.map(c=>`<option value="${esc(c.id)}"${o[0]===c.id?' selected':''}>${ic} ${esc(c.name)}</option>`).join('')}</select>`;}
/* mai projektek kerete: a táblázat fölé rajzolt réteg, így a táblázat elrendezése nem változik */
function ptFrames(){document.querySelectorAll('.pt-tf-ov').forEach(e=>e.remove());let pill=true;
  document.querySelectorAll('#view tr.pt-tf-first').forEach(a=>{const tb=a.closest('table'),w=tb&&tb.parentElement;if(!w)return;let b=a;while(b&&!b.classList.contains('pt-tf-last')){b=b.nextElementSibling;}if(!b)b=a;
    w.classList.add('pt-has-tf');const wr=w.getBoundingClientRect(),ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect(),tr=tb.getBoundingClientRect();
    const o=document.createElement('div');o.className='pt-tf-ov';o.style.cssText=`left:${w.scrollLeft-w.clientLeft}px;top:${ra.top-wr.top-w.clientTop+w.scrollTop}px;width:${w.offsetWidth}px;height:${rb.bottom-ra.top}px`;
    if(pill){pill=false;o.innerHTML=`<span class="pt-tf-pill">📍 Ma · ${esc(fmtDay(todayISO()))} · <span class="pt-clock">${nowHM()}</span></span>`;}w.appendChild(o);});}
window.addEventListener('resize',()=>{clearTimeout(window._ptfT);window._ptfT=setTimeout(()=>{if(document.querySelector('#view tr.pt-tf-first'))ptFrames();},120);});
/* a „Ma” sávon a pontos idő, percenként frissül */
function nowHM(){const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
setInterval(()=>document.querySelectorAll('.pt-clock').forEach(e=>{e.textContent=nowHM();}),15000);
function topicCards(p,{camRow,dlRow,D}){
  const tgl=(k,label)=>`<label class="toggle"><input type="checkbox" data-flag="${k}"${p[k]?' checked':''}${D()}><span class="tl">${esc(label)}</span></label>`;
  const recCnt=it=>{const n=num(p[it.k]);return `<div class="dl${n>it.min?' on':''}"><div><div class="dl-name">${it.label}</div></div>
    <div class="stepper"><button type="button" data-action="rec-step" data-k="${it.k}" data-d="-1" aria-label="${it.label}: kevesebb"${n<=it.min||ro()?' disabled':''}>−</button><input class="step-in" type="text" inputmode="numeric" pattern="[0-9]*" data-step-k="${it.k}" data-min="${it.min}" data-max="${it.max}" aria-label="${it.label} (db)" value="${n}"${D()}><button type="button" data-action="rec-step" data-k="${it.k}" data-d="1" aria-label="${it.label}: több"${n>=it.max||ro()?' disabled':''}>+</button></div></div>`;};
  const A=(it,asg)=>{if(!it.on||!asg)return it;const a=`<div class="tc-asg">${asg}</div>`,h=it.html,i=h.lastIndexOf('<div class="stepper');   // kiválasztva: név · felelős · darabszám egy sorban
    return Object.assign({},it,{html:i>=0?h.slice(0,i)+a+h.slice(i):`<div class="tc-line">${h}${a}</div>`});};
  const OP='Operatőr',F=(it,k,role,label,n)=>A(it,fieldAsg(p,k,role,label,n)),C=(it,k)=>A(it,cutAsg(p,k));
  const cam=c=>{if(c.k==='er_creative'&&p[c.k]){const can=svcCan(p),own=slotOwners(p,c.k),nm=id=>(crewById(id)||{}).name||'?';   // kreatív kamera: minden kamera külön sor, saját operatőrrel; „+ kamera” új sort nyit
      const cc=CAM_COUNTS.find(x=>x.flag===c.k),n=camN(p,c.k),rows=Math.max(n,slotOwners(p,c.k).length),dis=!!D();
      const html=Array.from({length:rows},(_,i)=>`<div class="tc-line cam-multi">${i===0?tgl(c.k,c.label):`<span class="tl cam-n">${i+1}. ${esc(c.label.toLowerCase())}</span>`}<div class="tc-asg">${can?fieldAsg(p,c.k,OP,c.label,rows,i):i===0?fieldAsg(p,c.k,OP,c.label,rows):`<span class="op-cut${own[i]?'':' none'}">👥 ${esc(own[i]?nm(own[i]):'nincs beosztva')}</span>`}</div>${i>0&&i===rows-1&&cc&&!dis&&can?`<button class="x w" type="button" data-action="rec-step" data-k="${cc.k}" data-d="-1" title="Kamera levétele" aria-label="Kamera levétele">✕</button>`:''}</div>`).join('')
        +(cc&&!dis&&n<10?(can?`<button class="btn outline small cam-add" type="button" data-action="rec-step" data-k="${cc.k}" data-d="1">＋ Még egy kreatív kamera</button>`:''):'');
      return {on:true,html,chip:c.label+(n>1?' ×'+n:''),tg:1};}
    return F({on:!!p[c.k],html:camRow(c),chip:c.label+(camN(p,c.k)>1?' ×'+camN(p,c.k):''),tg:1},c.k,OP,c.label,camN(p,c.k));};
  const flag=(k,label,role)=>{const it={on:!!p[k],html:tgl(k,label),chip:label,tg:1};return role?F(it,k,role,label):it;};
  const cnt=it=>({on:num(p[it.k])>(it.min||0),html:recCnt(it),chip:it.label+' '+num(p[it.k])});
  const dlv=it=>({on:num(p[it.k])>0,html:dlRow(it),chip:it.label+' '+num(p[it.k])});
  const col=(key,title,items)=>{const L=items;   // minden lehetőség látszik egy egyszerű listában, állandó sorrendben; a kiválasztott sötét, félkövér
    return `<div class="tc"><div class="tc-h">${title}</div><div class="tc-list">${L.map(x=>x.html).join('')||'<p class="tc-none">—</p>'}</div></div>`;};
  const card=(key,title,items)=>{const n=items.reduce((s,x)=>s+(x.on?(x.cnt||1):0),0),open=FOLD[key]!=null?FOLD[key]:n>0;
    return `<details class="tcard${n?' has-sel':''}" data-fold="${key}"${open?' open':''}><summary><span class="tc-title">${title}</span><span class="aside">${n?`<span class="tc-cnt">✓ ${n} kiválasztva</span>`:'nincs kiválasztva'}</span></summary><div class="tc"><div class="tc-list">${items.map(x=>x.html).join('')}</div></div></details>`;};
  const rooms=(()=>{const n=num(p.er_rooms);return `<div class="dl rooms-row"><div><div class="dl-name">Rögzített helyszínek száma</div></div>
    <div class="stepper"><button type="button" data-action="rec-step" data-k="er_rooms" data-d="-1" aria-label="Helyszínek: kevesebb"${n<=0||ro()?' disabled':''}>−</button><input class="step-in" type="text" inputmode="numeric" pattern="[0-9]*" data-step-k="er_rooms" data-min="0" data-max="10" aria-label="Helyszínek száma" value="${n}"${D()}><button type="button" data-action="rec-step" data-k="er_rooms" data-d="1" aria-label="Helyszínek: több"${n>=10||ro()?' disabled':''}>+</button></div></div>`;})();
  // Előadásrögzítés termenként: név, kamerák (darabszámmal), és kameránként a beosztott operatőr
  const RR=recRoomsOf(p),dis=!!D();
  const roomBlk=(r,i)=>{const rows=ROOM_CAMS.map(c=>{const n=num(r[c.k]),on=n>0,mx=ROOM_CNT[c.k];
      const eqFor=only=>on&&ROOM_EQ[c.k]?(()=>{const SL=c.k==='er_slides',ids=roomEq(r,c.k),items=SL?slideItems():camItems(),usedHere=RR.flatMap(x=>ROOM_CAMS.filter(cc=>ROOM_EQ[cc.k]).flatMap(cc=>roomEq(x,cc.k)));
        return `<div class="room-eqs">${ids.map((id,j)=>{if(only&&!only.includes(j))return '';const cnt=usedHere.filter(x=>x===id).length;return `<span class="room-eq"><select class="inp room-cam-sel${id?'':' empty'}" data-cmb="${SL?'Válassz eszközt…':'Válassz kamerát…'}" data-cmb-cls="room-cam-sel${id?'':' empty'}" data-room-eq="${r.id}" data-k="${c.k}" data-i="${j}" aria-label="${c.label} ${j+1}. kamerája"${D()}><option value="">${SL?'Válassz eszközt (képkeverő, laptop…)':ids.length>1?(j+1)+'. kamera – válassz…':'Válassz kamerát…'}</option>${items.map(it=>{const busy=usedElsewhere(it.id,p),left=num(it.qty)-busy-usedHere.filter(x=>x===it.id&&x!==id).length;return `<option value="${esc(it.id)}"${it.id===id?' selected':''}>${esc(it.name)}${left<=0&&it.id!==id?' · ⚠️ nincs szabad':''}</option>`;}).join('')}</select>${SL?'':(()=>{const lid=roomLens(r,c.k)[j]||'',L=lensItems();return `<select class="inp room-cam-sel room-lens-sel${lid?'':' empty'}" data-cmb="Válassz objektívet…" data-cmb-cls="room-cam-sel room-lens-sel${lid?'':' empty'}" data-room-lens="${r.id}" data-k="${c.k}" data-i="${j}" aria-label="${c.label} ${j+1}. kamera objektívje"${D()}><option value="">Objektív…</option>${(()=>{const cam=id?S.inventory.find(x=>x.id===id):null;return L.map(it=>{const ok=lensFits(cam,it);return `<option value="${esc(it.id)}"${it.id===lid?' selected':''}${ok||it.id===lid?'':' disabled'}>${esc(it.name)}${ok?'':' – nem jó erre a vázra (crop)'}</option>`;}).join('');})()}</select>${(()=>{const cam=id?S.inventory.find(x=>x.id===id):null,ln=lid?S.inventory.find(x=>x.id===lid):null;return cam&&ln&&!lensFits(cam,ln)?'<span class="warn-txt" title="Crop objektív nem rakható Full Frame vázra">⚠️ Crop objektív Full Frame vázon</span>':'';})()}`;})()}${j>0&&!dis?`<button class="x w" type="button" data-action="room-eq-del" data-r="${r.id}" data-k="${c.k}" data-i="${j}" aria-label="Kamera levétele" title="Kamera levétele">×</button>`:''}${id&&cnt>Math.max(1,num((S.inventory.find(x=>x.id===id)||{}).qty))?'<span class="warn-txt" title="Ugyanez a kamera több helyen van kiválasztva, mint ahány darab van belőle">⚠️</span>':''}</span>`;}).join('')}${items.length?'':`<span class="hint" style="margin:0">${SL?'A leltárban nincs képkeverő / laptop / monitor.':'A leltárban nincs kamera.'}</span>`}</div>`;})():'',eqSel=eqFor(c.k==='er_close'?[0]:null);
      const st=eqSel||(on&&mx?`<div class="stepper cam-step"><button type="button" data-action="room-step" data-r="${r.id}" data-k="${c.k}" data-d="-1" aria-label="${c.label}: kevesebb"${n<=1||dis?' disabled':''}>−</button><input class="step-in room-in" type="text" inputmode="numeric" data-room-in="${r.id}" data-k="${c.k}" data-max="${mx}" aria-label="${c.label} száma" value="${n}"${D()}><button type="button" data-action="room-step" data-r="${r.id}" data-k="${c.k}" data-d="1" aria-label="${c.label}: több"${n>=mx||dis?' disabled':''}>+</button></div>`:'');
      const plus=c.k==='er_close'&&on&&!dis&&n<(ROOM_CNT[c.k]||1)?`<button class="cam-plus" type="button" data-action="room-eq-add" data-r="${r.id}" data-k="${c.k}" aria-label="Még egy közeli kamera" data-tip="Még egy közeli kamera (saját operatőrrel)">+</button>`:'';
      const extra=c.k==='er_close'&&on?roomEq(r,c.k).slice(1).map((_,x)=>{const j=x+1;return `<div class="cam-row has-eq cam-extra"><span class="cam-n">${j+1}. közeli kamera</span>${eqFor([j])}</div>`;}).join(''):'';
      return `<div class="cam-row${eqSel?' has-eq':''}"><label class="toggle"><input type="checkbox" data-room-cam="${r.id}" data-k="${c.k}"${on?' checked':''}${D()}><span class="tl">${c.label}</span></label>${plus}${st}</div>${extra}`;}).join('');
    const ops=roomOps(r),asg=ops?`<div class="room-ops"><span class="room-ops-l">${ops>1?ops+' operatőr':'Operatőr'}:</span><div class="tc-asg room-asg">${fieldAsg(p,r.id+'_op',OP,roomName(r,i)+' – operatőr',ops)}</div></div>`:'';   // a terem operatőrei a név után (ahány kamera, annyi)
    return `<div class="room-blk"><div class="room-h"><span class="room-no">${i+1}. Helyszín</span><input class="inp room-name" type="text" data-room-name="${r.id}" maxlength="60" value="${esc(r.name||'')}" placeholder="Név (nem kötelező)" aria-label="${i+1}. helyszín neve"${D()}>${asg}${dis?'':`<button class="x" type="button" data-action="room-del" data-r="${r.id}" title="Helyszín törlése" aria-label="${i+1}. helyszín törlése">✕</button>`}</div><div class="tc-list">${rows}</div></div>`;};
  const recL=[{on:RR.some(r=>roomCams(r).length),cnt:RR.reduce((s,r)=>s+roomCams(r).length,0),html:`<div class="rooms">${RR.map(roomBlk).join('')}${dis?'':`<button class="btn outline small room-add" type="button" data-action="room-add">＋ Új helyszín hozzáadása</button>`}</div>`}];
  const recR=REC_COUNTS.filter(it=>it.k!=='er_rooms').map(it=>C(cnt(it),it.k));
  const intL=INT_FLAGS.map(c=>flag(c.k,c.label,OP)),intR=DELIVERABLES.filter(it=>it.g==='int').map(it=>C(dlv(it),it.k));
  const krL=REC_CAMS.filter(c=>c.k==='er_creative').map(cam).concat(EXTRAS.filter(e=>!['x_nyersTarolas','x_foto','x_rush','x_nyersVetel'].includes(e.k)).map(e=>flag(e.k,e.label,e.role||OP))).concat(DELIVERABLES.filter(it=>/^short/.test(it.k)).map(it=>F(dlv(it),'rec_'+it.k,OP,it.label+' felvétele')));   // short videó készítés a kreatív videózásnál is (ugyanaz az adat, mint az Utómunkánál)
  const krR=DELIVERABLES.filter(it=>it.g!=='int').map(it=>C(dlv(it),it.k)).concat(p.x_rush?[flag('x_rush','Villámgyors kézbesítés')]:[]);   // a nyersanyag átadása utómunka, beosztás nélkül
  const foL=[F({on:fotoN(p)>0,html:stepRow(p,FOTO_COUNT),chip:'Fotós a helyszínen'+(fotoN(p)>1?' ×'+fotoN(p):'')},'x_foto','Fotós','Fotós a helyszínen',fotoN(p))],foR=[C({on:fotoDb(p)>0,html:fotoRow(p),chip:fotoDb(p)+' db fotó'},'foto_db')];
  const teL=TECH.map(t=>flag(t.k,t.label,t.role)).concat(REC_LIVE.map(c=>flag(c.k,c.label,c.role)));
  const due=needsDelivery(p)&&!editOnly(p)?(()=>{const r=pr(p),dd=dueDate(p),own=validISO(p.dueAt);return `<div class="due-row"><label for="f-dueAt">📅 Leadási határidő</label><input class="inp" id="f-dueAt" data-field="dueAt" type="date" value="${esc(dd||'')}"${r?` min="${esc(r.end)}"`:''}${D()}><span class="hint">${own?'egyedi határidő':'alapértelmezett: a rendezvény utáni nap'}</span></div>`;})():'';
  return `${due}<div class="tc-cols${editOnly(p)?' tc-one':''}">${editOnly(p)?'':`<section><h4 class="sub-h">📍 Terepi feladatok</h4><div class="tcards">${card('t_rec','🎙️ Előadásrögzítés',recL)}${card('t_krea','🎥 Kreatív videózás',krL)}${card('t_int','🎤 Interjúk / imázsfilmek videózása',intL)}${card('t_foto','📷 Fotózás',foL)}${card('t_tech','💡 Vizuál-, hang- és fénytechnika',teL)}</div></section>`}
    <section><h4 class="sub-h">🎬 Utómunka</h4><div class="tcards">${card('p_rec','🎙️ Előadások',recR)}${card('p_int','🎤 Interjúk / imázsfilmek',intR)}${card('p_krea','🎞️ Kreatív tartalmak',krR)}${fotoN(p)>0?card('p_foto','📷 Fotók utómunkája',foR):''}${card('p_raw','📦 Nyersanyag',[flag('x_nyersVetel','Nyersanyag átadása')])}</div></section></div>`;   // a nyersanyag átadása külön kártya, beosztás nélkül   // terepi és utómunka külön: az utómunkában bármelyik felvétel felhasználható
}
/* Összesítő: mit rendelt az ügyfél (a tartalom-panel alján); az utómunkánál a felelős vágó is */
function orderSummary(p,bare){
  const T=[],can=!ro()&&!projLocked()&&!crewLocked(p)&&!!S.draft&&S.draft.id===p.id;
  const nm=id=>(crewById(id)||{}).name||'?';
  const fpick=(k,role,label,cur)=>{const all=(S.crew||[]).slice().sort((x,y)=>prioNum(x)-prioNum(y)||x.name.localeCompare(y.name,'hu')),fit=all.filter(c=>(c.roles||[]).includes(role)&&!cur.includes(c.id)),rest=all.filter(c=>!(c.roles||[]).includes(role)&&!cur.includes(c.id));
    return `<select class="inp op-cutsel add${cur.length?'':' none'}" data-os-field="${esc(k)}" data-role="${esc(role)}" data-label="${esc(label)}" aria-label="${esc(label)}: munkatárs"><option value="">${cur.length?'＋ még valaki':'👥 nincs beosztva'}</option>${cur.length?`<optgroup label="Levétel erről a feladatról">${cur.map(id=>`<option value="${esc(id)}">✕ ${esc(nm(id))}</option>`).join('')}</optgroup>`:''}${fit.length?`<optgroup label="${esc(role)}">${fit.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</optgroup>`:''}${rest.length?`<optgroup label="Egyéb munkatársak">${rest.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</optgroup>`:''}</select>`;};
  const row=(n,label,k,role)=>{const ids=k?fieldOwners(p,k):[];const tg=!k?'':can?fpick(k,role,label,ids):ids.length?`<span class="op-cut">👥 ${esc(ids.map(nm).join(', '))}</span>`:`<span class="op-cut none">👥 nincs beosztva</span>`;
    return `<div class="op-row"><span class="op-n">${n}</span><span class="op-l">${esc(label)}${ids.length?`<span class="op-names">👥 ${esc(ids.map(nm).join(', '))}</span>`:''}</span>${tg}</div>`;};   // minden terepi feladatnak saját felelőse
  const grp=(t,rows)=>{if(rows.length)T.push(`<div class="op-gh">${t}</div><div class="op-list">${rows.join('')}</div>`);};
  const OP='Operatőr',rooms=num(p.er_rooms),rec=[];if(rooms>1&&REC_CAMS.some(c=>c.k!=='er_creative'&&p[c.k]))rec.push(row(rooms+'×','Rögzített helyszín'));
  REC_CAMS.filter(c=>c.k!=='er_creative'&&p[c.k]).forEach(c=>rec.push(row((CAM_COUNTS.some(x=>x.flag===c.k)?camN(p,c.k):1)+'×',c.label,c.k,OP)));
  const kr=[];if(p.er_creative)kr.push(row(camN(p,'er_creative')+'×','Kreatív kamera','er_creative',OP));
  EXTRAS.filter(e=>!['x_foto','x_rush','x_nyersTarolas','x_nyersVetel'].includes(e.k)&&p[e.k]).forEach(e=>kr.push(row('✓',e.label,e.k,e.role||OP)));
  DELIVERABLES.filter(it=>/^short/.test(it.k)&&num(p[it.k])>0).forEach(it=>kr.push(row(num(p[it.k])+'×',it.label+' felvétele','rec_'+it.k,OP)));
  grp('🎙️ Előadásrögzítés',rec);grp('🎥 Kreatív videózás',kr);
  grp('🎤 Interjúk / imázsfilmek videózása',INT_FLAGS.filter(c=>p[c.k]).map(c=>row('✓',c.label,c.k,OP)));
  if(fotoN(p)>0)grp('📷 Fotózás',[row(fotoN(p)+'×','Fotós a helyszínen','x_foto','Fotós')]);
  grp('💡 Vizuál-, hang- és fénytechnika',TECH.filter(t=>p[t.k]).map(t=>row('✓',t.label,t.k,t.role)).concat(REC_LIVE.filter(c=>p[c.k]).map(c=>row('✓',c.label,c.k,c.role))));
  const cutters=cutterIds(p);
  const cutOf=k=>{const o=taskOwners(p,k);if(can){const all=(S.crew||[]).filter(c=>(c.roles||[]).includes('Vágó')||cutters.includes(c.id)).sort((x,y)=>prioNum(x)-prioNum(y)||x.name.localeCompare(y.name,'hu'));
      return `<select class="inp op-cutsel${o.length?'':' none'}" data-os-cut="${k}" aria-label="Vágó"><option value="">✂️ nincs vágóhoz rendelve</option>${all.map(c=>`<option value="${esc(c.id)}"${o[0]===c.id?' selected':''}>✂️ ${esc(c.name)}</option>`).join('')}</select>`;}
    return o.length?`<span class="op-cut">✂️ ${esc(o.map(id=>(crewById(id)||{}).name||'?').join(', '))}</span>`:`<span class="op-cut none">✂️ nincs vágóhoz rendelve</span>`;};
  const pRow=t=>`<div class="op-row"><span class="op-n">${t.n}${t.k==='foto_db'?' db':'×'}</span><span class="op-l">${esc(t.label)}</span>${cutOf(t.k)}</div>`;   // darab · anyag · vágó (itt is kiosztható)
  const PT=postTasks(p),intK=DELIVERABLES.filter(x=>x.g==='int').map(x=>x.k),kreK=DELIVERABLES.filter(x=>x.g!=='int').map(x=>x.k);
  const PG=[['🎙️ Előadások',PT.filter(t=>t.k==='er_post_n'||REC_COUNTS.some(x=>x.k===t.k))],['🎤 Interjúk / imázsfilmek',PT.filter(t=>intK.includes(t.k))],['🎞️ Kreatív tartalmak',PT.filter(t=>kreK.includes(t.k))],['📷 Fotók utómunkája',PT.filter(t=>t.k==='foto_db')]];
  const post=[];PG.forEach(([h,l])=>{if(l.length)post.push(`<div class="op-gh">${h}</div><div class="op-list">${l.map(pRow).join('')}</div>`);});
  {const ex=[];if(p.x_rush)ex.push(`<div class="op-row"><span class="op-n">⚡</span><span class="op-l">Villámgyors kézbesítés</span></div>`);if(p.x_nyersTarolas)ex.push(`<div class="op-row"><span class="op-n">🗄️</span><span class="op-l">Nyersanyag tárolása 5 évig</span></div>`);if(ex.length)post.push(`<div class="op-gh">➕ Egyéb</div><div class="op-list">${ex.join('')}</div>`);}
  const head=bare?'':'<h4 class="sub-h">📋 Projekt összesítő</h4>';
  if(!T.length&&!post.length)return `<div class="order-sum${bare?' bare':''}">${head}<p class="hint" style="margin:0">Még nincs kiválasztva semmi.</p></div>`;
  return `<div class="order-sum${bare?' bare':''}">${head}<div class="os-two"><section class="os-col"><h5 class="os-col-h">📍 Terepi munkák</h5>${T.length?`<div class="os-field">${T.join('')}</div>`:'<p class="hint" style="margin:0">Nincs terepi munka kiválasztva.</p>'}</section>
    <section class="os-col"><h5 class="os-col-h">🎬 Utómunka – átadandó anyagok</h5>${post.length?post.join(''):'<p class="hint" style="margin:0">Nincs utómunka kiválasztva.</p>'}</section></div>${can?'<p class="hint" style="margin:10px 0 0">A kiválasztott munkatársak automatikusan bekerülnek a Stáb és eszközök közé a megfelelő szereppel.</p>':''}</div>`;
}
/* Vágó kártyáján: mely munkákat készíti el */
/* a vágás sávjára mutatva: milyen videókat kell elkészíteni (a vágó csak a sajátjait látja) */
function cutWhat(p){const me=ro()&&S.me&&S.me.crewId,ts=postTasks(p).filter(t=>t.k!=='foto_db'||!me).filter(t=>!me||taskKeysOf(p,me).includes(t.k));if(!ts.length)return '';
  const multi=cutterIds(p).length>1&&!me,nm=id=>(crewById(id)||{}).name||'';
  return '🎬 Elkészítendő videók:\n'+ts.map(t=>'• '+(t.k==='er_post_n'?t.n+' helyszín előadásainak utómunkája':t.n+' db · '+t.label)+(multi&&taskOwners(p,t.k).length?' ('+taskOwners(p,t.k).map(nm).join(', ')+')':'')).join('\n')+'\n\n';}
function cutTasksBlock(p,cid){
  const tasks=postTasks(p).filter(t=>t.k!=='foto_db');if(!(p.crew||[]).some(a=>a.crewId===cid&&a.role==='Vágó'))return '';   // a fotók utómunkája a vágónál nem választható
  if(!tasks.length&&ro())return '';   // a szakember (vágó) nézetében nincs szervezői figyelmeztetés
  if(!tasks.length){const ri=(p.crew||[]).findIndex(a=>a.crewId===cid&&a.role==='Vágó');
    return `<div class="cut-tasks cut-none"><div class="ct-h">✂️ Elkészítendő munkák</div><p class="warn-txt" style="margin:0 0 6px"><b>⚠️ Vágó be van osztva, de nincs kiválasztva vágnivaló.</b> Jelöld be fent az Utómunkánál, mit kell elkészíteni – addig nem tudja, min dolgozik, és a leadási határidő sem számolható.</p>${ro()||crewLocked(p)?'':`<div class="btns"><button class="btn primary small" type="button" data-action="goto-post">🎬 Utómunka kiválasztása</button>${ri>=0?`<button class="btn outline small" type="button" data-action="crew-remove" data-i="${ri}">Vágó szerep levétele</button>`:''}</div>`}</div>`;}
  const mine=taskKeysOf(p,cid),implicit=!cutterIds(p).some(id=>Array.isArray(editTasksOf(p)[id]));
  if(ro())return mine.length?`<div class="cut-tasks"><div class="ct-h">✂️ Elkészítendő munkák</div><div class="ct-chips">${tasks.filter(t=>mine.includes(t.k)).map(t=>`<span class="day-chip ct-chip on">${esc(t.label)} · ${t.n} db</span>`).join('')}</div></div>`:'';
  const free=tasks.filter(t=>!taskOwners(p,t.k).length).length;
  return `<div class="cut-tasks"><div class="ct-h">✂️ Elkészítendő munkák${implicit&&mine.length?' <span class="muted">· egy vágó: minden az övé</span>':''}${free?` <span class="ct-free">⚠️ ${free} videó még nincs vágóhoz rendelve</span>`:''}</div><div class="ct-chips">${tasks.filter(t=>!taskOwners(p,t.k).some(x=>x!==cid)).map(t=>{const on=mine.includes(t.k),oth=[],nobody=!on;
    return `<button type="button" class="day-chip ct-chip${on?' on':''}${nobody?' free':''}${oth.length?' other':''}" data-action="cut-task" data-cid="${esc(cid)}" data-k="${t.k}" aria-pressed="${on}"${projLocked()||oth.length?' disabled':''} title="${on?'Ő vágja – kattints, ha mégsem':oth.length?esc(oth.map(id=>(crewById(id)||{}).name||'').join(', '))+' vágja – ha másnak adnád, előbb nála vedd le':'Még senki nem vágja – kattints, ha ő'}">${on?'✓ ':nobody?'⚠️ ':''}<span class="ct-lbl">${esc(t.label)}</span><span class="ct-n">· ${t.n} db</span>${oth.length?` <span class="ct-who">→ ${esc(oth.map(id=>String((crewById(id)||{}).name||'').split(' ').pop()).join(', '))}</span>`:''}</button>`;}).join('')}</div></div>`;
}
/* Mi változott a véglegesítés (kiküldés) óta – emberi nyelven, munkatársanként */
function crewSigParse(sig){const [r,e,rt,d]=String(sig||'').split('|');return {roles:(r||'').split('+').filter(Boolean),eq:(e||'').split(',').filter(Boolean).map(x=>{const m=/^(.*)x(\d+)$/.exec(x);return m?{itemId:m[1],qty:Number(m[2])}:{itemId:x,qty:1};}),rent:(rt||'').split(',').filter(Boolean),days:(d||'').split(',').filter(Boolean)};}
function crewDiffHtml(p){const f=p.crewFinal;if(!f||!Array.isArray(f.ids))return '';const D=crewFinalDiff(p),nm=id=>(crewById(id)||{}).name||'Törölt munkatárs',L=[];
  D.added.forEach(id=>L.push(`<li>➕ <b>${esc(nm(id))}</b> új a csapatban</li>`));D.removed.forEach(id=>L.push(`<li>➖ <b>${esc(nm(id))}</b> lekerült</li>`));
  D.changed.forEach(id=>{const a=crewSigParse(f.sigs[id]),b=crewSigParse(crewSig(p,id)),parts=[];
    const rAdd=b.roles.filter(x=>!a.roles.includes(x)),rDel=a.roles.filter(x=>!b.roles.includes(x));if(rAdd.length)parts.push('új szerep: '+rAdd.join(', '));if(rDel.length)parts.push('levett szerep: '+rDel.join(', '));
    const en=e=>(itemById(e.itemId)||{}).name||'eszköz',ak=a.eq.map(e=>e.itemId+'x'+e.qty),bk=b.eq.map(e=>e.itemId+'x'+e.qty);const eAdd=b.eq.filter(e=>!ak.includes(e.itemId+'x'+e.qty)),eDel=a.eq.filter(e=>!bk.includes(e.itemId+'x'+e.qty));
    void eAdd;void eDel;if(a.days.join()!==b.days.join())parts.push('munkanapok változtak');   // az eszközök az eszközlistánál
    L.push(`<li>✏️ <b>${esc(nm(id))}</b>: ${esc(parts.join(' · ')||'módosult')}</li>`);});
  return L.length?`<ul class="cf-diff">${L.join('')}</ul>`:'';}
function viewProject(p){
  const c=calc(p),st=staffing(p),iss=computeIssues().filter(i=>i.pids.includes(p.id));
  const r=pr(p),T=todayISO(),di=dueInfo(p);
  const status=p.status||'tervezes',curIdx=STAGES.findIndex(s=>s.id===status);
  // átadandó anyag nélkül nincs utómunka lépés (kivéve, ha a projekt épp abban az állapotban van)
  // a szakember (ha nem vágó) nem látja az utómunkát
  const isCut=!ro()||(p.crew||[]).some(a=>a.crewId===(S.me&&S.me.crewId)&&a.role==='Vágó');
  const stList=STAGES.map((s,i)=>({s,i})).filter(x=>{if(x.s.id==='leadva'&&status!=='leadva')return false;if(x.s.id==='jovahagyas'&&status!=='jovahagyas')return false;   // a „Jóváhagyásra vár” nem külön lépés (a videótáblán dől el)
    if(x.s.id==='helyszin'&&editOnly(p)&&status!=='helyszin')return false;   // videóvágásnál nincs helyszíni munka   // a „Videók leadva” lépés megszűnt (az utómunka része)
    if(!POST_STAGES.includes(x.s.id))return true;if(x.s.id!=='utomunka'&&!videoStagesOn()&&status!==x.s.id)return false;return isCut&&(needsDelivery(p)||status===x.s.id);});
  const doneSet=new Set(String(p.stepsDone||'').split(',').filter(Boolean)),TICKS=['tervezes','helyszin','utomunka','jovahagyas'];
  const closed=status==='atadva';   // lezárt projekt: a lépések nem módosíthatók
  const canDrag=!ro()&&!closed&&status!=='lemondva'&&!projLocked();
  const cutDrag=ro()&&status==='utomunka'&&needsDelivery(p)&&(p.crew||[]).some(x=>x.crewId===(S.me&&S.me.crewId)&&x.role==='Vágó');   // a vágó az Utómunkát a „Videók jóváhagyásra várnak” lépésre húzhatja (leadás)
  const stages=stList.map(({s,i},k)=>{const tk=TICKS.includes(s.id)||s.id==='atadva',on=doneSet.has(s.id||'')||(closed&&tk)||(tk&&status!=='lemondva'&&i<curIdx);   // a már elhagyott lépés kipipáltnak látszik
    const cur=i===curIdx,fut=status!=='lemondva'&&i>curIdx,vidS=s.id==='utomunka'&&Array.isArray(p.videos)&&p.videos.length>0,drag=!vidS&&((canDrag&&cur&&s.id!=='atadva')||(cutDrag&&cur)),   /* videós utómunka: a haladás a videótáblán (részletek), itt nem húzható */tgt=(canDrag&&fut)||(cutDrag&&s.id==='jovahagyas');   // a lépés húzással halad: az aktuális kártyát a következőre kell húzni
    return `<div class="stage-w${(tk&&on)||drag?' has-tick':''}"><div class="stage${status==='lemondva'?'':i<curIdx?' done':cur?' cur':''}${on?' ticked':''} stage-static${drag?' stage-drag':''}${tgt?' stage-target':''}" data-v="${s.id}" data-si="${k}"${drag?' draggable="true" title="Húzd a következő lépésre, ha ez a lépés megtörtént"':''} aria-current="${cur?'step':'false'}"><span class="n">${k+1}. lépés</span><span class="t-row"><span class="t">${esc(stageLabel(p,s.id))}</span>${s.id==='helyszin'&&p.siteOk?`<${ro()?'span':'button type="button" data-action="site-report"'} class="stage-site ${p.siteOk==='nem'?'bad':'ok'}" data-tip="${esc((p.siteOk==='nem'?'🚨 Elakadás történt':'✅ Minden rendben')+(p.siteReport?'\n'+p.siteReport:'')+(ro()?'':'\nKattints a beszámoló szerkesztéséhez'))}">${p.siteOk==='nem'?'🚨 Elakadás':'✅ Rendben'}</${ro()?'span':'button'}>`:''}${s.id==='utomunka'&&Array.isArray(p.videos)&&p.videos.length?`<button type="button" class="stage-board" data-action="bd-lane" data-id="${esc(p.id)}" title="A videók táblája (állapotok, ellenőrzés)">🎬 ${p.videos.filter(x=>x.st==='jovahagyva').length}/${p.videos.length} jóváhagyva <b>Részletek ›</b></button>`:''}</span></div>${drag?`<span class="stage-tick stage-handle" aria-hidden="true" title="Húzd a következő lépésre">⠿</span>`:tk&&on?`<span class="stage-tick on" title="Megtörtént">✓</span>`:''}</div>`;}).join('')   /* pipa csak a már teljesült lépésen (üres karika nincs) */+(canDrag&&curIdx<STAGES.length-1?'':'');
  const dlRow=it=>{const n=num(p[it.k]);return `<div class="dl${n?' on':''}"><div><div class="dl-name">${it.label}</div></div>
    <div class="stepper"><button type="button" data-action="dlv" data-k="${it.k}" data-d="-1" aria-label="${it.label}: kevesebb"${n<=0||ro()?' disabled':''}>−</button><input class="step-in" type="text" inputmode="numeric" pattern="[0-9]*" data-step-k="${it.k}" data-min="0" data-max="${it.max}" aria-label="${it.label} (db)" value="${n}"${D()}><button type="button" data-action="dlv" data-k="${it.k}" data-d="1" aria-label="${it.label}: több"${n>=it.max||ro()?' disabled':''}>+</button></div></div>`;};
  const dl=DELIVERABLES.filter(it=>it.g!=='int').map(dlRow).join(''),dlInt=DELIVERABLES.filter(it=>it.g==='int').map(dlRow).join('');
  const intTg=INT_FLAGS.map(c=>`<label class="toggle"><input type="checkbox" data-flag="${c.k}"${p[c.k]?' checked':''}${D()}><span class="tl">${c.label}</span></label>`).join('');
  const tg=k=>{const e=EXTRAS.find(x=>x.k===k);return `<label class="toggle"><input type="checkbox" data-flag="${k}"${p[k]?' checked':''}${D()}><span class="tl">${e?e.label:k}</span></label>`;};
  const ex=EXTRAS.filter(e=>!['x_nyersTarolas','x_foto','x_rush'].includes(e.k)).map(e=>{return `<label class="toggle"><input type="checkbox" data-flag="${e.k}"${p[e.k]?' checked':''}${D()}><span class="tl">${e.label}</span></label>`;}).join('');
  const nKrea=DELIVERABLES.filter(it=>num(p[it.k])>0).length+(fotoDb(p)>0?1:0)+EXTRAS.filter(e=>e.k!=='x_foto'&&p[e.k]).length;
  const nRec=REC_CAMS.filter(c=>p[c.k]).length+REC_LIVE.filter(c=>p[c.k]).length+(p.er_post?1:0);
  const nTech=TECH.filter(t=>p[t.k]).length;
  const nRecG=REC_CAMS.filter(c=>c.k!=='er_creative'&&p[c.k]).length,nKreaG=EXTRAS.filter(e=>!['x_nyersTarolas','x_foto','x_rush','x_nyersVetel'].includes(e.k)&&p[e.k]).length+(p.er_creative?1:0),nFotoG=(fotoN(p)>0?1:0)+(fotoDb(p)>0?1:0);
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
      <select class="inp" data-crew-role="${i}" data-cmb="Szerep…" aria-label="Szerep"${D()}>${CREW_ROLES.map(rl=>`<option${OP_SUB.includes(rl)?' data-parent="Operatőr"':''}${rl===a.role?' selected':''}>${esc(rl)}</option>`).join('')}</select>
      <button class="x w" type="button" data-action="crew-remove" data-i="${i}" aria-label="Eltávolítás a projektből">×</button></div>`;}).join('');
  const sel='';
  const selRole=S.addCrew.role||(()=>{const miss=staffing(p).find(x=>x.have<x.need&&x.role!=='Projektvezető');return miss?miss.role:'Operatőr';})();   // alapból a hiányzó szerep (pl. fénytechnikus)
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
  const histBtn=ro()?'':`<button class="mini" type="button" data-action="proj-history" data-id="${esc(p.id)}">ℹ️ Részletek</button>`;
  const iCut=(p.crew||[]).some(a=>a.crewId===(S.me&&S.me.crewId)&&a.role==='Vágó'),canDeliver=iCut&&['tervezes','helyszin','utomunka','leadva'].includes(p.status||'tervezes')&&needsDelivery(p);
  const vl=vidLink(p,'mini','Átadási link megnyitása ↗'+(p.deliveryPass?' 🔒':'')),xl=extraLinks(p,'mini');
  const dlPanel=!!(vl||xl)&&['leadva','jovahagyas','atadva'].includes(status)&&!(ro()&&!iCut&&r&&r.end<T);   // a Kész videók panel mutatja a linket – fent nem kell még egy gomb
  const delivery=(dlPanel?xl:vl+xl);
  return `<div class="dhead${ro()?' dhead-inline':''}">
    <div class="dtitle"><button class="back back-ic" type="button" data-action="back" aria-label="Vissza: ${ro()?'Beosztásaim':'Összes projekt'}" data-tip="${ro()?'Beosztásaim':'Összes projekt'}">←</button>${calBlock(r&&r.start)}<div class="grow"><h2>${esc(p.name||'Névtelen projekt')}${p.status==='atadva'?DONE_CHECK:''}${ro()?'':' <button class="editbtn title-edit" type="button" data-action="proj-rename" aria-label="Projekt nevének módosítása" data-tip="Név módosítása">✏️</button>'}</h2>
      <p class="sub">${esc([ro()?'':p.client,p.eventType,fmtRange(p)?fmtRange(p)+(p.startTime?', '+p.startTime+(p.endTime?'–'+p.endTime:''):''):'',p.venue].filter(Boolean).join(' · '))}</p></div></div>
    <div class="btns">${ro()?'':`<button class="btn ${S.dirty?'primary':'outline'} small proj-save" type="button" data-action="save"${S.dirty?'':' disabled'} title="${KBD_SAVE}">${S.saving>0?'Mentés…':S.dirty?'💾 Mentés':'✓ Mentve'}</button>`}${folder}${histBtn}${delivery}${p.calEventId?`<button class="mini" type="button" data-action="tab" data-tab="naptar" data-focus="${esc(r?r.start:'')}" title="A „Terepi Munkák” Google Naptárban">📅 Naptárban</button>`:(validISO(p.date)&&!ro()&&!editOnly(p)?'<span class="hint" style="margin:0;align-self:center">📅 Mentéskor bekerül a Google Naptárba</span>':'')}${ro()?'':`<button class="mini" type="button" data-action="cancel-toggle">${p.status==='lemondva'?'↩️ Visszaállítás':'🚫 Projekt lemondása'}</button><button class="mini warn" type="button" data-action="del-project">🗑️ Projekt törlése</button>`}</div>
    ${status==='lemondva'?`<div class="banner"><p><b>Ez a projekt le van mondva.</b>${p.cancelReason?` <span>Ok: <i>${esc(p.cancelReason)}</i>.</span>`:''} Nem számít bele az ütközésekbe, pénzügyekbe és a határidőkbe.</p><button class="btn outline small w" type="button" data-action="cancel-toggle">Visszaállítás</button></div>`:`${ro()&&!(p.crew||[]).some(a=>a.crewId===(S.me&&S.me.crewId)&&a.role==='Vágó')?'':`<div class="stages${ro()?' ro':''}${status==='atadva'?' locked':''}" role="group" aria-label="Projekt állapota" style="--n:${stList.length}">${stages}</div>`}${status==='atadva'?`<p class="hint locked-hint">🔒 A projekt lezárva${p.deliveredAt?' ('+esc(fmtDay(p.deliveredAt))+')':''} – a lépések már nem módosíthatók.${isAdmin()?' <button class="linkbtn" type="button" data-action="proj-unlock" style="margin-left:6px">🔓 Felnyitás</button>':''}</p>`:''}${!p.siteOk&&!ro()&&!editOnly(p)&&['utomunka','leadva','jovahagyas'].includes(status)?`<div class="site-rep warn"><b>🎬 A forgatás véget ért – hogy ment a helyszíni munka?</b><span>Jelöld be a beszámolót, hogy a projekt tovább léphessen.</span><button class="btn primary small" type="button" data-action="site-report">📝 Beszámoló</button></div>`:''}`}
    ${iss.length?`<div class="issues">${iss.map(i=>issueRow(i,p.id)).join('')}</div>`:''}
  </div>
  <div class="dfull">
      ${dlPanel?`<div class="panel dl-panel"><div class="grow"><h3>🎬 Kész videók</h3><p class="hint" style="margin:2px 0 0">${p.deliveredAt?'Átadva: '+esc(fmtDay(p.deliveredAt))+' · ':''}${esc(String(p.deliveryNotes||'').slice(0,200))||'A videók letölthetők az átadási linkről.'}</p></div>${(isAdmin()||(S.me&&S.me.role==='editor'))&&status!=='atadva'?`<button class="btn outline small" type="button" data-action="dl-edit" data-id="${esc(p.id)}">✏️ Linkek módosítása</button>`:''}${vidLink(p,'btn primary','▶️ Átadási link megnyitása ↗'+(p.deliveryPass?' 🔒':''))}</div>`:''}
      <details class="panel fold basics" data-fold="basics"${FOLD.basics!==false?' open':''}><summary><h3>📋 Alapadatok</h3></summary><div class="fields">
        ${fld(p,'name','Projekt neve')}
        ${editOnly(p)?'':fld(p,'venue',`Helyszín${p.venue?` <a class="linkbtn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.venue)}" target="_blank" rel="noopener" style="font-size:12px;margin-left:6px">📍 Térkép ↗</a>`:''}`,{ph:ro()?'':'Kezdd el gépelni a címet vagy a helyszín nevét…'})}
        ${ro()?'':`<div class="field"><label for="f-client">Ügyfél</label><div class="combo"><input class="inp" id="f-client" type="text" autocomplete="off" value="${esc(p.client||'')}" placeholder="${ro()?'':'Keress vagy válassz ügyfelet… (üresen is hagyható)'}"${D()}></div>${p.clientTax||p.clientAddress?`<span class="hint" style="margin:2px 0 0">${esc([p.clientAddress,p.clientTax?'Adószám: '+p.clientTax:''].filter(Boolean).join(' · '))}</span>`:''}</div>`}
        ${selField(p,'eventType','Rendezvény típusa',EVENT_TYPES,{cmb:'Válassz típust…'})}
        ${ro()?'':`<div class="field full contact3">
        ${fld(p,'contactName','Kapcsolattartó')}
        ${phoneField({key:'contactPhone',value:p.contactPhone,disabled:ro()})}
        ${fld(p,'contactEmail','E-mail',{type:'email'})}
        </div>`}
        ${editOnly(p)?`<div class="field">${fld(p,'date','✂️ Leadási határidő',{type:'date'}).replace(/^<div class="field[^"]*">/,'').replace(/<\/div>$/,'')}<span class="hint" style="margin:2px 0 0">Videóvágás: nincs helyszín és kezdési idő – csak a leadás napja számít.</span></div>`:(()=>{const on=!!p.endDate||!!p._multi,tm=(k,l)=>fld(p,k,l,{ph:k.endsWith('EndTime')||k==='endTime'?'pl. 18:30':'pl. 10:00',im:'numeric'}).replace('data-field=','data-time="1" maxlength="5" data-field=');
          return `<div class="field full day-cols"><div class="day-col">${fld(p,'date',on?'Első nap':'Dátum',{type:'date'})}${tm('startTime',on?'Kezdés (első nap)':'Kezdés')}${tm('endTime',on?'Távozás kb. (első nap)':'Hozzávetőleges távozási óra')}</div>
            <div class="day-col"><div class="field"><label class="multi-lbl" for="f-multi"><input type="checkbox" id="f-multi" data-multi="1"${on?' checked':''}${D()}> Több napos – utolsó nap</label><input class="inp" id="f-endDate" data-field="endDate" type="date" value="${esc(p.endDate||'')}"${p.date?` min="${esc(p.date)}"`:''}${on&&!ro()?'':' disabled'}></div>
            ${on?tm('lastStartTime','Kezdés (utolsó nap)')+tm('lastEndTime','Távozás kb. (utolsó nap)'):''}</div></div>`;})()}
        <div class="field full"><label for="f-notes">Jegyzetek</label><textarea class="inp" id="f-notes" data-field="notes" placeholder="${D()?'–':'Parkolás, beléptetés, öltözet, helyszíni kapcsolattartó…'}"${D()}>${esc(p.notes||'')}</textarea></div>
      </div></details>
  </div>
  ${isAdmin()&&typeof projBillingPanel==='function'?projBillingPanel(p):''}
  
  ${ro()?roContentPanel(p):(()=>{const nSel=nRec+nKrea+nTech+nIntG+postTasks(p).length,openEd=FOLD.content!=null?FOLD.content:!nSel;   // egy panel: felül az összesítő (kiosztással), alatta a kiválasztás
    const SL=!ro()&&!projLocked()&&crewLocked(p),SP=crewPast(p);   // véglegesített csapatnál a szolgáltatások is zárolva (szürkén), feloldással bővíthetők
    return `<section class="panel content svc${SL?' svc-locked':''}"><h3>🧾 Szolgáltatások ${foldAside(nRec+nKrea+nTech+nIntG)}${SL&&!SP?'<button class="btn outline small svc-unlock-btn" type="button" data-action="crew-edit" title="Ha utólag extra szolgáltatást kérnek: feloldja a szolgáltatásokat és a csapatot">🔓 Szolgáltatások módosítása</button>':''}</h3><p class="hint" style="margin:-4px 0 12px">${SL&&SP?'A rendezvény már lezajlott, ezért a szolgáltatások és a csapat nem módosíthatók.':SL?'A csapat véglegesítve van, ezért a szolgáltatások zárolva vannak. Ha utólag extra szolgáltatást kérnek, a „Szolgáltatások módosítása” gombbal oldhatod fel.':'Jelöld be, mit kell csinálni – a kiválasztott tétel alatt rögtön kiválaszthatod, ki csinálja. A kiválasztott szakember a szerepével a Stáb és eszközök közé is bekerül.'}</p>
    <div class="svc-body"${SL?' inert':''}>${topicCards(p,{camRow,dlRow,D})}</div></section>`;})()}
  <div class="crew-wide">${canSeeFees()?(()=>{const ce=crewEquipPanel(p,st,c,sortedCrew,leadOpts,leadBusy,personOpts,selRole,true);
    return `<details class="panel fold crew-fin" data-fold="crew"${FOLD.crew!==false?' open':''}><summary><h3>👥 Stáb és eszközök <span class="aside">${ce.aside}</span></h3></summary><div class="crew-body">${ce.body}</div></details>
      <details class="panel fold money-panel" data-fold="money"${FOLD.money!==false?' open':''}><summary><h3>💰 ${isAdmin()?'Pénzügyek – büdzsé, termelői keret és díjak':'Termelői díjak és keret'}</h3></summary>${financePanel(p,true)}</details>`;})()
    :crewEquipPanel(p,st,c,sortedCrew,leadOpts,leadBusy,personOpts,selRole)}</div>
  ${ro()&&p.myFee&&num(p.myFee.amount)&&(p.penalties||[]).some(x=>x.crewId===(S.me&&S.me.crewId))?myFeePanel(p):''}`;   // a díj a Kifizetések fülön látszik; itt csak díjcsökkentésnél (a kifogás miatt)
}

/* ===== Stáb ===== */
const prioNum=c=>9;   // a P1–P3 prioritás megszűnt (Ervin, 2026-11-10): a sorrend a húzással beállított sorrend, majd név
function prioBadge(c){return '';}
/* 3.7. pont: 12 hónapon belül 3 súlyos vagy kritikus hiba → azonnali felmondás joga */
function penStrikes(cid){const from=addDays(todayISO(),-365);let n=0;S.projects.forEach(p=>(p.penalties||[]).forEach(x=>{if(x.crewId===cid&&x.status==='approved'&&(x.kind==='severe'||x.kind==='critical')&&String(x.decidedAt||x.at).slice(0,10)>=from)n++;}));return n;}
function penStrikeNote(cid){   // az elmúlt 12 hónap összes jóváhagyott hibája, kategóriánként; a súlyos/kritikus darabszám a 3.7. pont miatt külön
  const from=addDays(todayISO(),-365),all=[];S.projects.forEach(p=>(p.penalties||[]).forEach(x=>{if(x.crewId===cid&&x.status==='approved'&&String(x.decidedAt||x.at).slice(0,10)>=from)all.push({p,x});}));
  if(!all.length)return '';const n=penStrikes(cid),by={};all.forEach(({x})=>{by[x.kind]=(by[x.kind]||0)+1;});
  const ORD=['critical','severe','unfit','prestige','light','damage'],SH={critical:'kritikus',severe:'súlyos',unfit:'alkalmatlan állapot',prestige:'presztízsveszteség',light:'enyhe',damage:'kártérítés'};
  const parts=ORD.filter(k=>by[k]).map(k=>by[k]+' '+SH[k]);
  const tip=all.sort((a,b)=>String(b.x.at).localeCompare(String(a.x.at))).map(({p,x})=>`${fmtShort(pr(p)?pr(p).start:String(x.at).slice(0,10))} · ${p.name||''} – ${(PEN_KINDS[x.kind]||{}).label||''}${x.kind==='damage'?' '+ftFmt(x.amount):' '+num(x.pct)+'%'}${x.reason?': '+String(x.reason).replace(/\s+/g,' ').slice(0,90):''}`).join('\n');
  return `<p class="pen-strike${n>=3?' bad':''}" data-tip="${esc(tip)}" tabindex="0">⚠️ ${all.length} hiba az elmúlt 12 hónapban: ${parts.join(', ')}${n>=3?' – a szerződés 3.7. pontja szerint (3 súlyos/kritikus hiba) azonnali hatályú felmondásra van jogotok.':''}</p>`;}
/* Értékesítő a stábban: akinek értékesítői fiókja van, vagy csak értékesítői (és ajánlói) szerepe */
const isSalesCrew=c=>(S.salesPeople||[]).some(x=>x.crewId===c.id)||((c.roles||[]).includes('Értékesítő')&&(c.roles||[]).every(r=>r==='Értékesítő'||r==='Ajánlói jutalék'));
/* Munkatársi szerződés (csak az ügyvezető látja – a háttér másnak nem is küldi el) */
const crewDocsOf=cid=>isAdmin()?(S.crewDocs||[]).filter(d=>d.crewId===cid).sort((a,b)=>String(b.signedAt||b.createdAt).localeCompare(String(a.signedAt||a.createdAt))):[];
function crewDocKv(c){if(!isAdmin()||!Array.isArray(S.crewDocs))return '';const L=crewDocsOf(c.id);
  return `<div class="kv"><span>Szerződés</span>${L.length?`<span class="cdoc-links">${L.map(d=>`<button class="cdoc-open" type="button" data-action="crew-doc-open" data-id="${esc(d.id)}" data-tip="${esc(d.fileName||'')}">📄 ${esc(d.title||'Szerződés')}${d.signedAt?` <span class="muted">(${esc(d.signedAt.replace(/-/g,'.'))}.)</span>`:''}</button>`).join('')}</span>`:`<button class="cdoc-open warn-txt" type="button" data-action="edit-crew" data-id="${esc(c.id)}" data-focus="cdoc">nincs feltöltve</button>`}</div>`;}
function crewDocIcon(c){if(!isAdmin())return '';const L=crewDocsOf(c.id);return L.length?`<button class="cdoc-ic" type="button" data-action="crew-doc-open" data-id="${esc(L[0].id)}" data-tip="Szerződés: ${esc(L[0].title||'')}" aria-label="${esc(c.name)} szerződése">📄</button>`:'';}
/* Naponta egyszer, a háttérben: a külsősök egyértelműen aláírt szerződései (fájlnévben „aláírt” + szerződés) bekerülnek a Gmailből */
/* Belépéskor egyszer a háttérben: Sales App szinkron (új megrendelések, értékesítő a csapatban) – ha változott valami, frissül a nézet */
function salesSyncBg(){if(!isAdmin()||S._ssBg)return;S._ssBg=1;setTimeout(async()=>{try{const r=await call('salesSyncNow');if(r&&(r.created||r.updated||r.deals||r.sellers||r.cancelled||r.orderForms||r.proformas))load(true);}catch(e){}},6000);}
function crewDocsAutoBg(){if(!isAdmin()||S._cdAuto)return;S._cdAuto=1;const k='lpm_cdauto',d=todayISO();let last='';try{last=localStorage.getItem(k)||'';}catch(e){}if(last===d)return;
  setTimeout(async()=>{try{const r=await call('crewDocsImport',{strict:true});try{localStorage.setItem(k,d);}catch(e){}const L=r.plan||[];if(r.crewDocs)S.crewDocs=r.crewDocs;
    if(L.length){toast('📥 '+L.length+' aláírt szerződés bekerült a Gmailből: '+L.map(x=>x.crew+' – '+x.title).join(', '));if(!$('modalRoot').innerHTML)render(true);}}catch(e){S._cdAuto=0;}},4000);}
function crewDocSection(c){if(!isAdmin()||!c)return '';const L=crewDocsOf(c.id);
  return `<div class="field full cdoc-sec" id="cdoc"><span class="lbl">📄 Szerződések és dokumentumok <span class="muted" style="font-weight:500">· csak az ügyvezető látja</span></span>
    ${L.length?`<div class="cdoc-list">${L.map(d=>`<div class="cdoc-row"><button class="cdoc-open" type="button" data-action="crew-doc-open" data-id="${esc(d.id)}">📄 <b>${esc(d.title||'Szerződés')}</b></button><span class="muted">${d.signedAt?'aláírva '+esc(d.signedAt.replace(/-/g,'.'))+'.':'feltöltve '+esc(String(d.createdAt||'').slice(0,10).replace(/-/g,'.'))+'.'}${d.note?' · '+esc(d.note):''}</span><button class="x cdoc-ren" type="button" data-action="crew-doc-ren" data-id="${esc(d.id)}" aria-label="Átnevezés" data-tip="Átnevezés">✏️</button><button class="x" type="button" data-action="crew-doc-del" data-id="${esc(d.id)}" aria-label="Dokumentum törlése" data-tip="Törlés">×</button></div>`).join('')}</div>`:'<p class="hint" style="margin:0">Még nincs feltöltött szerződés vagy dokumentum.</p>'}
    <div class="cdoc-add"><input class="inp" id="cdoc-title" placeholder="Megnevezés (nem kötelező – a fájlnévből kitalálom)" maxlength="120"><input class="inp" id="cdoc-date" type="date" aria-label="Aláírás dátuma" title="Aláírás dátuma (nem kötelező)"></div>
    <label class="cdoc-drop" data-id="${esc(c.id)}"><input type="file" id="cdoc-file" data-id="${esc(c.id)}" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" multiple hidden><span class="cdoc-drop-t">📎 <b>Húzd ide a szerződést vagy dokumentumot</b>, vagy kattints a kiválasztáshoz</span><small class="muted" id="cdoc-fn">PDF, Word vagy kép · legfeljebb 10 MB · azonnal feltöltődik</small></label></div>`;}
function viewCrew(){
  const T=todayISO(),f=S.cf,q=f.q.trim().toLowerCase();
  const salesTab=S.tab==='ertekesitok';   // az ügyvezetőnél külön alfül: Stáb (szakemberek) és Értékesítők
  const base=crewSorted().filter(c=>!isAdmin()||(salesTab?isSalesCrew(c):!isSalesCrew(c)));let list=base;
  if(f.role)list=list.filter(c=>(c.roles||[]).includes(f.role)||(c.skills||[]).includes(f.role));
  if(q)list=list.filter(c=>fold([c.name,c.phone,c.email,c.company,(c.roles||[]).join(' '),(c.skills||[]).join(' '),c.note].join(' ')).includes(fold(q)));
  const internal=S.crew.filter(c=>(c.type==='Belsős'||isEmployee(c))).length;
  const nextOf=c=>S.projects.filter(p=>p.status!=='lemondva'&&pr(p)&&pr(p).end>=T&&crewIds(p).has(c.id)).sort(byStart);
  const cardsOf=L=>f.view==='list'?'':L.map(c=>{
    const next=S.projects.filter(p=>p.status!=='lemondva'&&pr(p)&&pr(p).end>=T&&crewIds(p).has(c.id)).sort(byStart);
    const role=p=>p.lead===c.id?'projektvezető':((p.crew||[]).filter(a=>a.crewId===c.id).map(a=>a.role.toLowerCase()).join(', '));
    const sub=[c.type,c.company].filter(Boolean).join(' · ');
    return `<article class="pcard crew-card" data-crew-card="${esc(c.id)}"${ro()?'':' draggable="true" title="Húzd a kártyát a sorrend módosításához"'}>
      <div class="pc-top">${avatar(c)}<div class="pc-id"><div class="pc-name">${esc(c.name)} ${prioBadge(c)}</div>${sub?`<div class="pc-sub">${esc(sub)}</div>`:''}</div>
        <button class="pc-edit w" type="button" data-action="edit-crew" data-id="${esc(c.id)}" aria-label="${esc(c.name)} szerkesztése" title="Szerkesztés">✎</button></div>
      <div class="roles">${(c.roles||[]).map(r=>`<span class="statuspill">${esc(r)}</span>`).join('')||'<span class="muted" style="font-size:13px">Nincs szerep megadva</span>'}</div>
      ${(c.skills||[]).length?`<div class="skills">${c.skills.map(s=>`<span class="skill">${esc(s)}</span>`).join('')}</div>`:''}
      <div>${c.phone?`<div class="kv"><span>Telefon</span><button class="copy" type="button" data-action="copy" data-text="${esc(c.phone)}">${esc(c.phone)}</button></div>`:''}
        ${c.email?`<div class="kv"><span>E-mail</span><button class="copy mail" type="button" data-action="copy" data-text="${esc(c.email)}">${esc(c.email).replace('@','<wbr>@')}</button></div>`:'<div class="kv"><span>E-mail</span><span class="warn-txt">nincs megadva</span></div>'}
        ${crewDocKv(c)}${(()=>{const sp=isAdmin()&&(S.salesPeople||[]).find(x=>x.crewId===c.id);if(!sp)return '';   // értékesítő díjazása (csak az ügyvezető látja)
        return `<div class="kv"><span>Havi fix</span><b class="tnum">${num(sp.salary)?huf(sp.salary):'nincs'}</b></div><div class="kv"><span>Jutalék</span><b>${num(sp.commLow)}% · ${huf(sp.commLimit)} felett ${num(sp.commHigh)}%</b></div>`;})()}</div>
      ${c.note?`<p class="pc-note">${esc(c.note)}</p>`:''}
      ${penStrikeNote(c.id)}
    </article>`;}).join('');
  const rowsOf=L=>f.view!=='list'?'':L.map(c=>{const n=nextOf(c)[0];
    return `<tr><td><div class="nm" style="display:flex;gap:6px;align-items:center">${esc(c.name)} ${prioBadge(c)}${crewDocIcon(c)}</div>${c.company?`<div class="ser">${esc(c.company)}</div>`:''}</td>
      <td>${esc((c.roles||[]).join(', '))||'<span class="muted">—</span>'}${(c.skills||[]).length?`<div class="ser">${esc(c.skills.join(', '))}</div>`:''}</td>
      <td>${esc(c.type||'')}</td>
      <td>${c.phone?`<button class="copy" style="text-align:left;white-space:nowrap" type="button" data-action="copy" data-text="${esc(c.phone)}">${esc(c.phone)}</button>`:''}</td>
      <td>${c.email?`<button class="copy mail" style="text-align:left" type="button" data-action="copy" data-text="${esc(c.email)}">${esc(c.email).replace('@','<wbr>@')}</button>`:'<span class="warn-txt">nincs</span>'}</td>
      <td class="num"><button class="pc-edit w" type="button" data-action="edit-crew" data-id="${esc(c.id)}" aria-label="${esc(c.name)} szerkesztése" title="Szerkesztés">✎</button></td></tr>`;}).join('');
  const pc=n=>base.filter(c=>prioNum(c)===n).length;
  return `<div class="page-head"><div class="grow"><h2>${salesTab?'Értékesítők':'Stáb'}</h2><p class="sub">${salesTab?list.length+' értékesítő · fiókot és jutalékot a Beállításokban adhatsz meg':S.crew.length+' munkatárs'+(S.crew.length?` · ${internal} belsős`:'')}</p></div>${ro()?'':undoBar()}
      ${!salesTab&&isAdmin()&&Array.isArray(S.crewDocs)?`<button class="btn outline w" type="button" data-action="crew-docs-gmail" title="A külsősök aláírt szerződéseit megkeresi a leveleid között, és feltölti őket">📥 Szerződések a Gmailből</button>`:''}
      <button class="btn primary w" type="button" data-action="new-crew">${salesTab?'+ Új értékesítő':'+ Új munkatárs'}</button></div>
    <div class="toolbar"><input class="inp search" id="q-crew" type="search" placeholder="Keresés név, szerep, vállalkozás szerint" value="${esc(f.q)}" aria-label="Stáb keresése">
      <select class="inp" id="crew-role-filter" style="width:auto" aria-label="Szűrés szerep szerint" data-cmb="Szerep szerint…"><option value="" data-keep="1">Minden szerep</option><optgroup label="Szerep">${CREW_ROLES.map(r=>`<option${r===f.role?' selected':''}>${esc(r)}</option>`).join('')}</optgroup><optgroup label="Részletek">${CREW_SKILLS.map(r=>`<option${r===f.role?' selected':''}>${esc(r)}</option>`).join('')}</optgroup></select>
      <div class="seg" role="group" aria-label="Nézet"><button type="button" data-action="crew-view" data-v="cards" aria-pressed="${f.view!=='list'}" title="Kártyák">▦ Kártyák</button><button type="button" data-action="crew-view" data-v="list" aria-pressed="${f.view==='list'}" title="Lista">☰ Lista</button></div>
</div>
    ${(()=>{const block=L=>{const rows=rowsOf(L),cards=cardsOf(L);return rows?`<div class="tbl-wrap"><table class="crew-tbl"><thead><tr><th>Név</th><th>Szerepek</th><th>Jogviszony</th><th>Telefon</th><th>E-mail</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:cards?`<div class="cards">${cards}</div>`:'';};
      if(!list.length)return `<div class="panel">${empty(S.crew.length?'Nincs a szűrésnek megfelelő munkatárs.':'Még nincs munkatárs. Vedd fel a stábot az „Új munkatárs” gombbal.')}</div>`;
      return block(list);})()}`;
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
const TL_DAY_WIDTH=44;
// A következő hónap eleje széles ablakban is elérhető legyen a rács végéről.
const tlMonthsAhead=()=>Math.max(1,Math.ceil(document.documentElement.clientWidth/(28*TL_DAY_WIDTH)));
window.addEventListener('resize',()=>{
  const w=document.querySelector('.tl-wrap');
  if(w&&Number(w.dataset.ahead)!==tlMonthsAhead())render(true);
});
function loadVagoi(month){if(ro())return;const k='v:'+month;S.cal.at=S.cal.at||{};if(S.cal.loading[k])return;if(S.cal.ev2[month]&&Date.now()-(S.cal.at[k]||0)<60000)return;
  if(S.cal.err[k]&&Date.now()-((S.cal.errAt||{})[k]||0)<60000)return;const r=calRange(month);S.cal.loading[k]=true;
  call('calendarEvents',{from:r.start,to:r.end,cal:'vagoi',fresh:!!(S.cal.fresh||{})[k]}).then(ev=>{S.cal.ev2[month]=ev||[];S.cal.at[k]=Date.now();if(S.cal.fresh)delete S.cal.fresh[k];delete S.cal.err[k];})
    .catch(e=>{S.cal.err[k]=errText(e);(S.cal.errAt=S.cal.errAt||{})[k]=Date.now();})
    .finally(()=>{delete S.cal.loading[k];if(S.tab==='naptar'&&!S.projectId&&!$('modalRoot').innerHTML)render(true);});}
function loadCalEvents(month){if(ro())return;loadVagoi(month);   // a szakember csak a saját projektjeit látja (a Google Naptárhoz nincs hozzáférése)
  const r=calRange(month),key=month;S.cal.at=S.cal.at||{};
  if(S.cal.loading[key])return;
  if(!S.cal.events[key]){const c=calCacheGet(month);if(c){S.cal.events[key]=c.ev;S.cal.at[key]=0;}}
  if(S.cal.events[key]&&Date.now()-(S.cal.at[key]||0)<60000)return;
  if(S.cal.err[key]&&Date.now()-(S.cal.errAt&&S.cal.errAt[key]||0)<60000)return;   // hiba után ne kérdezzük újra azonnal (különben végtelen újrarajzolás)
  S.cal.loading[key]=true;
  call('calendarEvents',{from:r.start,to:r.end,fresh:!!(S.cal.fresh||{})[key]}).then(ev=>{S.cal.events[key]=ev||[];S.cal.at[key]=Date.now();if(S.cal.fresh)delete S.cal.fresh[key];calCacheSet(month,S.cal.events[key]);delete S.cal.err[key];if(S.cal.errAt)delete S.cal.errAt[key];})
    .catch(e=>{S.cal.err[key]=errText(e);(S.cal.errAt=S.cal.errAt||{})[key]=Date.now();if(errText(e).indexOf('AUTH_REQUIRED')>=0)handleErr(e);})
    .finally(()=>{delete S.cal.loading[key];if(S.tab==='naptar'&&S.cal.month===month)render(true);});
}
/* Friss lekérés a Google Naptárból (a szerver 5 perces gyorsítótára nélkül): Frissítés gombra, és amikor visszatérsz az app fülére
   – így a Google Naptárban törölt / módosított esemény azonnal eltűnik / frissül itt is. */
function calForceFresh(){const m=S.cal.month;S.cal.at={};S.cal.fresh={};[m,'v:'+m].forEach(k=>{S.cal.fresh[k]=1;});}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible'||S.tab!=='naptar'||!TOKEN)return;calForceFresh();loadCalEvents(S.cal.month);});
function prefetchCal(m,ahead){if(ro()||!TOKEN)return;loadCalEvents(m);setTimeout(()=>{
  if(!TOKEN)return;
  loadCalEvents(shiftMonth(m,-1));
  for(let i=1;i<=ahead;i++)loadCalEvents(shiftMonth(m,i));
},800);}
/* Szakember: vágóként (is) dolgozik? – akkor a naptárban választhat a terepi és a vágói munkái között */
const crewCuts=(p,me)=>!!me&&(p.crew||[]).some(a=>a.crewId===me&&a.role==='Vágó');
const crewOnSite=(p,me)=>!!me&&!editOnly(p)&&(p.lead===me||(p.crew||[]).some(a=>a.crewId===me&&(a.role!=='Vágó'||onsiteCut(p,me))));
function crewIsCutter(){const me=(S.me.viewAs&&S.me.viewAs.crewId)||S.me.crewId,c=crewById(me);return !!me&&((c&&(c.roles||[]).includes('Vágó'))||S.projects.some(p=>crewCuts(p,me)));}
function calCutDue(){try{return localStorage.getItem('lpm_cal_cutdue')!=='0';}catch(e){return true;}}
function calItems(month){
  const r=calRange(month),items=[];
  const linked=new Set(S.projects.map(p=>p.calEventId).filter(Boolean));
  const me=ro()?((S.me.viewAs&&S.me.viewAs.crewId)||S.me.crewId):'',cutter=ro()&&crewIsCutter();
  S.projects.forEach(p=>{const q=pr(p);let pre='';
    if(cutter){const cut=crewCuts(p,me);
      if(cut){const due=dueDate(p),q0=pr(p);let st=q0?addDays(q0.end,1):due;if(due&&st>due)st=due;   // a vágás a projekt utáni naptól a leadás napjáig tart
        if(due&&st<=r.end&&due>=r.start)items.push({kind:'p',cut:true,id:p.id,title:'✂️ '+(p.name||'Névtelen projekt'),date:st,endDate:due,time:'',status:p.status||'tervezes',venue:''});}   // a vágói leadási határidő külön, lilával
      if(editOnly(p))return;}
    if(!ro()&&!editOnly(p)&&calCutDue()&&p.status!=='lemondva'&&(!S.cal.cutter||crewCuts(p,S.cal.cutter))){const due=dueDate(p);   // vezetői havi naptár: a vágók leadási határideje (pipával ki-be kapcsolható)
      if(due&&due>=r.start&&due<=r.end)items.push({kind:'p',cut:true,id:p.id,title:'✂️ '+(p.name||'Névtelen projekt'),date:due,endDate:due,time:'',status:p.status||'tervezes',venue:''});}
    if(editOnly(p)){if(ro()||(S.cal.mode!=='ido'&&!calCutDue())||(S.cal.cutter&&!crewCuts(p,S.cal.cutter))||!q||q.end<r.start||q.start>r.end)return;pre='✂️ ';}   // a „Vágói határidők” pipa ezt is elrejti   // videóvágás: nem terepi munka, lilán a leadás napján
    if(!q||q.end<r.start||q.start>r.end)return;   // terepen: a projekt a saját napjain, zölden (ahogy a többieknél)
    items.push({kind:'p',cut:pre!=='',id:p.id,title:pre+(p.name||'Névtelen projekt'),date:q.start,endDate:q.end,time:p.startTime||'',status:p.status||'tervezes',venue:p.venue||''});});
  const cutC=!ro()&&S.cal.cutter?crewById(S.cal.cutter):null,cutMail=cutC?String(cutC.email||'').toLowerCase():'',cutNm=cutC?fold(cutC.name):'';
  const vOk=e=>!cutC||(cutMail&&(e.guests||[]).includes(cutMail))||(!!cutNm&&fold((e.title||'')+' '+(e.description||'')).includes(cutNm));   // kiválasztott vágó: csak az ő vágói bejegyzései
  const myMail=me?String((crewById(me)||{}).email||'').toLowerCase():'';   /* szakember nézetben csak a saját vágói bejegyzései (ahol ő a vendég) */
  (ro()||S.cal.mode==='ido'||calCutDue()?(S.cal.ev2[month]||[]):[]).filter(vOk)   /* a vágói naptár bejegyzései is a „Vágói határidők” pipához tartoznak */
    .filter(e=>!ro()||(!!myMail&&(e.guests||[]).includes(myMail))).filter(e=>!(e.projectId&&projById(e.projectId))).forEach(e=>items.push({kind:'v',id:e.id,title:e.title||'(nincs cím)',date:e.date,endDate:e.endDate||e.date,time:e.start||'',venue:e.location||'',lp:vLinkProj(e)}));
  if(ro())return items.sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'99').localeCompare(b.time||'99'));
  (S.cal.events[month]||[]).forEach(e=>{if(linked.has(e.id)||(e.projectId&&projById(e.projectId)))return;
    items.push({kind:'g',id:e.id,title:e.title||'(nincs cím)',date:e.date,endDate:e.endDate||e.date,time:e.start||'',venue:e.location||''});});
  return items.sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'99').localeCompare(b.time||'99')||a.title.localeCompare(b.title,'hu'));
}
/* Épp zajló forgatás: ma van, és (ha van megadva) az érkezés és a távozás között vagyunk */
function calLive(p){if(!p||['atadva','lemondva','utomunka','leadva','jovahagyas'].includes(p.status))return false;const r=pr(p),T=todayISO();if(!r||r.start>T||r.end<T)return false;
  const now=new Date().toTimeString().slice(0,5),last=r.end===T&&r.end>r.start,st=String((T>r.start&&p.lastStartTime&&last?p.lastStartTime:p.startTime)||''),en=String((last&&p.lastEndTime)||p.endTime||'');
  return (!/^\d{2}:\d{2}$/.test(st)||now>=st)&&(!/^\d{2}:\d{2}$/.test(en)||now<en);}
function calChip(it,day){
  const cont=it.date<day;
  const dim=it.kind==='p'&&crewDim(projById(it.id)||{});
  const live=it.kind==='p'&&calLive(projById(it.id));
  const drag=!ro()&&(it.kind==='g'||it.kind==='v'||(it.kind==='p'&&it.status!=='atadva'));
  const cls=it.kind==='p'?`cal-chip p st-${esc(it.status)}${dim?' dim':''}${live?' live':''}${it.cut?' cut':''}`:it.kind==='v'?'cal-chip v':'cal-chip g';
  return `<button type="button" class="${cls}"${drag?` draggable="true" data-drag-day="${day}"`:''} data-action="${it.kind==='p'?'open-project':it.kind==='v'?'cal-vevent':'cal-event'}" data-id="${esc(it.id)}" data-kind="${it.kind}" data-tipid="${esc(it.id)}">${cont?'↳ ':it.time?`<b>${esc(it.time)}</b> `:''}${esc(it.title)}</button>`;
}
/* Idővonal nézet: soronként egy projekt / esemény, oszloponként a hónap napjai, függőleges vonal a mai napon */
/* Az idővonal bal felső sarkában a látható rész hónapja */
function tlCorner(w){const b=w&&w.querySelector('.tl-cm');if(!b)return;const lw=(w.querySelector('.tl-lbl')||{}).offsetWidth||0,n=Number(b.dataset.n),cw=(w.scrollWidth-lw)/n;
  const d=addDays(b.dataset.first,Math.min(n-1,Math.max(0,Math.round(w.scrollLeft/cw)+3)));const t=d.slice(0,4)+'. '+F_MONTH.format(toDate(d)).replace(/^\d{4}\.\s*/,'').toLowerCase();if(b.textContent!==t)b.textContent=t;
  /* csak azok a sorok látszanak, amelyeknek a sávja a látható időszakba esik – így nincs üres sor */
  const v0=Math.floor(w.scrollLeft/cw)+1,v1=Math.ceil((w.scrollLeft+w.clientWidth-lw)/cw);let k=0;
  w.querySelectorAll('.tl-it').forEach(r=>{const on=Number(r.dataset.b)>=v0&&Number(r.dataset.a)<=v1;if(on)k++;r.classList.toggle('tl-out',!on);r.toggleAttribute('aria-hidden',!on);});   // animáltan tűnik el / jön vissza
  const tl0=w.querySelector('.tl.tl-noanim');if(tl0)requestAnimationFrame(()=>requestAnimationFrame(()=>tl0.classList.remove('tl-noanim')));   // első rajzoláskor nincs animáció
  const c=w.querySelector('.tl-cnt');if(c)c.textContent=k+' tétel látszik';
const e=w.querySelector('.tl-none');if(e)e.hidden=k>0;
  /* A hónapválasztó követi a görgetést, az ablak megállás után az új hónap köré rendeződik. */
  const vm=d.slice(0,7),MNf=x=>F_MONTH.format(toDate(x+'-01')).replace(/^\d{4}\.\s*/,'').toLowerCase(),yr=x=>x.slice(0,4)!==vm.slice(0,4)?x.slice(0,4)+'. ':'';
  const cur=document.querySelector('.cm-cur'),sides=document.querySelectorAll('.cm-side');
  if(cur){const tt=vm.slice(0,4)+'. '+MNf(vm);if(cur.textContent!==tt){cur.textContent=tt;if(sides[0])sides[0].textContent=yr(shiftMonth(vm,-1))+MNf(shiftMonth(vm,-1));if(sides[1])sides[1].textContent=yr(shiftMonth(vm,1))+MNf(shiftMonth(vm,1));}}
  clearTimeout(window._tlRc);if(vm!==S.cal.month){const pos=w.scrollLeft/cw,idx=Math.floor(pos);const keep={d:addDays(b.dataset.first,idx),f:pos-idx,t:w.scrollTop};
    window._tlRc=setTimeout(function go(){if(!w.isConnected)return;if(w.classList.contains('panning')){window._tlRc=setTimeout(go,300);return;}S.cal.month=vm;S.cal.tlKeep=keep;S.cal.tlPos=null;render(true);},450);}}
/* Idővonal sávjának felirata: a távozás (végzés) ideje; ha nincs megadva, az érkezésé */
function tlTimes(it,p){const ok=t=>/^\d{2}:\d{2}$/.test(t||'');const en=p?(it.endDate>it.date&&p.lastEndTime?p.lastEndTime:p.endTime):'';return ok(en)?en:(ok(it.time)?it.time:'');}
function calTimeline(m,items0,T,ahead){
  const months=Array.from({length:ahead+2},(_,i)=>shiftMonth(m,i-1));
  const first=months[0]+'-01',last=addDays(shiftMonth(m,ahead+1)+'-01',-1),N=diffDays(first,last)+1,days=[];for(let i=0;i<N;i++)days.push(addDays(first,i));
  const col=d=>diffDays(first,d)+1;
  const items=[],ik=new Set();months.forEach(month=>(month===m?items0:calItems(month)).forEach(it=>{const k=it.kind+':'+it.id+(it.cut?':c':'');if(!ik.has(k)){ik.add(k);items.push(it);}}));
  /* Vágás: a projekt utáni naptól a leadási határidőig lila sáv a projekt sorában; ha a határidő a projekt napjára esik, alatta */
  const me=ro()?((S.me.viewAs&&S.me.viewAs.crewId)||S.me.crewId):'';
  const cutOf=p=>{if(!p||p.status==='lemondva'||(ro()&&!crewCuts(p,me))||(!ro()&&S.cal.cutter&&!crewCuts(p,S.cal.cutter)))return null;const q=pr(p),due=dueDate(p);if(!q||!due)return null;
    if(editOnly(p)){const c0=String(p.createdAt||'').slice(0,10);return {st:validISO(c0)&&c0<due?c0:due,due,same:false};}   // videóvágás: a felvételtől a leadásig
    const st=due>q.end?addDays(q.end,1):due;return {st,due,same:due<=q.end};};
  const rows=items.filter(it=>!it.cut&&it.endDate>=first&&it.date<=last&&!(it.kind==='p'&&it.status==='lemondva')&&!(!ro()&&S.cal.cutter&&it.kind!=='v'&&(it.kind!=='p'||!crewCuts(projById(it.id)||{},S.cal.cutter))));   // a lemondott projekt itt nem látszik; vágó kiválasztásakor csak az ő vágói munkái
  const seen=new Set(rows.filter(it=>it.kind==='p').map(it=>it.id));
  S.projects.forEach(p=>{if(seen.has(p.id))return;const c=cutOf(p),q=pr(p);if(!c||c.due<first||c.st>last)return;   // a vágás ide esik, a forgatás korábban volt
    rows.push({kind:'p',id:p.id,title:p.name||'Névtelen projekt',date:q.start,endDate:q.end,time:p.startTime||'',status:p.status||'tervezes',venue:p.venue||'',cutOnly:editOnly(p)||(ro()&&!crewOnSite(p,me))});});
  const vis=it=>{const p=it.kind==='p'?projById(it.id):null,c=p&&cutOf(p);return p&&editOnly(p)&&c?c.st:(c&&c.st<it.date?c.st:it.date);};   // a sorrend a sáv látható kezdete szerint (videóvágásnál a vágás eleje)
  rows.sort((a,b)=>vis(a).localeCompare(vis(b))||(a.time||'99').localeCompare(b.time||'99'));
  /* Jóváhagyásra vár: külön kategória legfelül, lapozástól függetlenül mindig látszik (amíg az ügyfél jóvá nem hagyja) */
  const waitL=S.projects.filter(p=>(p.status==='leadva'||p.status==='jovahagyas')&&cutOf(p)&&!((p.videos||[]).length&&(p.videos||[]).every(v=>v.st==='jovahagyva')))   /* a már mind jóváhagyott projekt nem vár */.sort((a,b)=>String(a.leadvaAt||'').localeCompare(String(b.leadvaAt||'')));
  let wOpen=true;try{wOpen=localStorage.getItem('lpm_tl_wait')!=='0';}catch(e){}
  const waitRows=waitL.length?`<div class="tl-row tl-sec tl-wsec"><button type="button" class="tl-lbl tl-wtog" data-action="tl-wait-toggle" aria-expanded="${wOpen}"><b>${wOpen?'▾':'▸'} ⏳ Jóváhagyásra vár</b><small>${waitL.length} projekt${wOpen?'':' · elrejtve'}</small></button><div class="tl-track"></div></div>`+(wOpen?'':'<div class="tl-row tl-sec tl-sec2"><div class="tl-lbl"><b>Idővonal</b></div><div class="tl-track"></div></div>')+(!wOpen?'':waitL.map(p=>{
    const ld=String(p.leadvaAt||p.deliveredAt||'').slice(0,10),n=validISO(ld)?diffDays(ld,T):null,cu=(p.crew||[]).filter(x=>x.role==='Vágó'&&!(ro()&&x.crewId===me)&&!(!ro()&&S.cal.cutter&&x.crewId===S.cal.cutter)).map(x=>{const c=crewById(x.crewId);return c?String(c.name).split(' ').slice(-1)[0]:'';}).filter(Boolean);
    const sub=[p.client,p.venue].filter(Boolean).join(' · ');
    return `<div class="tl-row tl-pin"><button type="button" class="tl-lbl" data-action="open-project" data-id="${esc(p.id)}"><b>${esc(p.name||'Névtelen projekt')}</b>${sub?`<small>${esc(sub)}</small>`:''}</button><div class="tl-track"><button type="button" class="tl-pinnote" data-action="${(p.videos||[]).length?'bd-lane':'open-project'}" data-id="${esc(p.id)}">${validISO(ld)?`Leadva ${esc(F_SHORT?F_SHORT.format(toDate(ld)):ld)}`:'Leadva'}${n!=null?` · ${n<=0?'ma':n+' napja'} vár jóváhagyásra`:''}${cu.length?` · ✂️ ${esc(cu.join(', '))}`:''}</button></div></div>`;}).join('')+`<div class="tl-row tl-sec tl-sec2"><div class="tl-lbl"><b>Idővonal</b></div><div class="tl-track"></div></div>`):'';
  const wk=d=>{const w=toDate(d).getUTCDay();return w===0||w===6;};
  const MN=d=>F_MONTH.format(toDate(d)).replace(/^\d{4}\.\s*/,'').toLowerCase();
  const head=days.map(d=>`<div class="tl-d${wk(d)?' we':''}${d===T?' today':''}${d.slice(8)==='01'?' mstart':''}${d.slice(0,7)!==m?' oth':''}">${Number(d.slice(8))}<small>${esc(WD_SHORT[(toDate(d).getUTCDay()+6)%7])}</small></div>`).join('');
  const bands=months.map(x=>{const a=col(x+'-01'),b=col(addDays(shiftMonth(x,1)+'-01',-1));return `<div class="tl-mband${x===m?' cur':''}" style="grid-column:${a} / ${b+1}"><span>${esc((x.slice(0,4)!==T.slice(0,4)?x.slice(0,4)+'. ':'')+MN(x+'-01'))}</span></div>`;}).join('');   // a hónap neve a látható rész bal szélén marad
  const bg=days.map(d=>`<i class="${wk(d)?'we':''}${d.slice(8)==='01'?' mstart':''}"></i>`).join('');
  const body=rows.map(it=>{const a=it.date<first?first:it.date,b=it.endDate>last?last:it.endDate,c0=col(a),c1=col(b);
    const p=it.kind==='p'?projById(it.id):null,sub=p?[p.client,p.venue].filter(Boolean).join(' · '):(it.venue||'');
    const dim=p&&crewDim(p),live=p&&calLive(p);
    const cls=it.kind==='p'?`cal-chip p st-${esc(it.status)}${dim?' dim':''}${live?' live':''}${it.cut?' cut':''}`:it.kind==='v'?'cal-chip v':'cal-chip g';
    const act=it.kind==='p'?'open-project':it.kind==='v'?'cal-vevent':'cal-event';
    const showBar=it.date<=last&&it.endDate>=first&&!it.cutOnly&&!(p&&editOnly(p));
    const pOk=!!(p&&['leadva','jovahagyas','atadva'].includes(p.status)&&p.status!=='atadva'&&(v=>v&&v.tot&&v.ok===v.tot)(vidProg(p)));   // minden videó jóváhagyva: a forgatási sáv is zöld
    const cc0=p&&cutOf(p),join=!!(showBar&&cc0&&!cc0.same&&cc0.st>=first&&cc0.st<=last&&it.endDate>=first&&it.endDate<last);   // a forgatás vége és a vágás kezdete egybeolvad
    const FROM=live?'#d93025':dim?'#c2c3c6':'var(--cal-p)';   // az új designban minden forgatási sáv pára-kék (élő: piros, halvány: szürke) – az átmenet ebből indul   // az átmenet a forgatási sáv tényleges színéből indul (élő: piros, lezajlott/halvány: szürke)
    /* ugyanazon a napon forgatás + vágás: egy sáv, ferdén kettéosztva (bal: forgatás, jobb: vágás) */
    const split=showBar&&cc0&&cc0.same&&c0===c1&&cc0.st>=first&&cc0.st<=last?(['leadva','jovahagyas','atadva'].includes(p.status)?'color-mix(in srgb,var(--violet,#7e57c2) 62%,#fff)':!editOnly(p)&&pr(p)&&pr(p).end>=T?'color-mix(in srgb,var(--violet,#7e57c2) 38%,#fff)':'var(--violet,#7e57c2)'):'';
    const cc=cc0,spanA=Math.min(c0,cc?col(cc.st<first?first:cc.st):c0),spanB=Math.max(c1,cc?col(cc.due>last?last:cc.due):c1);
    return `<div class="tl-row tl-it" data-a="${spanA}" data-b="${spanB}"><button type="button" class="tl-lbl" data-action="${act}" data-id="${esc(it.id)}"><b>${esc(it.title)}</b>${sub?`<small>${esc(sub)}</small>`:''}</button>
      <div class="tl-track" data-first="${first}" data-n="${N}" data-id="${esc(it.id)}"><div class="tl-bg">${bg}</div>${showBar?`<button type="button" class="${cls}${pOk?' p-ok':''} tl-bar${join?' tl-join':''}${split?' tl-split':''}" style="grid-column:${c0} / ${c1+1};grid-row:1${split?';--from:'+FROM+';--cutc:'+split:''}"${!ro()&&(it.kind==='g'||it.kind==='v'||(it.kind==='p'&&it.status!=='atadva'))?' draggable="true"':''} data-action="${act}" data-id="${esc(it.id)}" data-kind="${it.kind}" data-tipid="${esc(it.id)}">${it.date<first?'‹ ':''}${it.date>=first?esc(tlTimes(it,p)):''}${(()=>{if(it.kind==='p')return it.status==='atadva'?'<span class="tl-ok">✓</span>':'';const q=it.kind==='v'&&it.lp&&projById(it.lp);return q?(q.status==='atadva'?'<span class="tl-ok">✓</span>':' ⏳'):'';})()}${it.endDate>last?' ›':''}</button>`:''}${(()=>{const c=p&&cutOf(p);if(!c||c.due<first||c.st>last||split)return '';
        const cdone=['leadva','jovahagyas','atadva'].includes(p.status);   // a vágás kész: ✓
        const ld=String(p.leadvaAt||p.deliveredAt||'').slice(0,10),cEnd=cdone&&validISO(ld)&&ld<c.due?(ld<c.st?c.st:ld):c.due;   // leadás után a további napok eltűnnek (a határidő már nem él)
        const a2=c.st<first?first:c.st,b2=cEnd>last?last:cEnd;
        if(cEnd<first)return '';
        const pend=!cdone&&!editOnly(p)&&pr(p)&&pr(p).end>=T;   // még nincs leforgatva: a vágó még nem dolgozhat rajta
        const vp=vidProg(p);
        return `<button type="button" class="cal-chip p cut st-${esc(p.status||'')} tl-bar tl-cut${join?' tl-joined':''}${pend?' cut-pending':''}${cdone?' cut-done':''}${cdone&&vp&&vp.ok===vp.tot?' cut-ok':''}" style="grid-column:${col(a2)} / ${col(b2)+1};grid-row:${c.same?2:1}${join?';--from:'+FROM:''}"${ro()?'':' draggable="true"'} data-kind="cut" data-action="${vp?'bd-lane':'open-project'}" data-id="${esc(p.id)}" data-tip="${esc(p.name||'Névtelen projekt')}\n\n${esc(cutWhat(p))}✂️ Vágási határidő: ${esc(fmtDay(c.due))}${vp?esc(vp.tip)+'\n\nKattints a videók táblájáért':''}${ro()?'':' · húzd el a határidő módosításához'}">${c.st<first?'‹ ':''}${cdone?(p.status==='atadva'?'✓':vp&&vp.ok===vp.tot?'✅ Jóváhagyva':'⏳'):pend?'':'✂️'}${(()=>{const n=diffDays(c.st>T?c.st:T,c.due)+1;return n>0&&!c.same&&!pend&&!cdone?' '+n+' nap':'';})()}${vp&&!pend&&!(cdone&&vp.ok===vp.tot)?` · ${vp.done}/${vp.tot}`:''}${c.due>last?' ›':''}${vp&&!pend?vp.html:''}</button>`;})()}</div></div>`;}).join('');
  const ti=T>=first&&T<=last?col(T):0;
  (window.POST_RENDER=window.POST_RENDER||[]).push(()=>{const w=document.querySelector('.tl-wrap');if(!w)return;const c=S.cal.tlPos;
    if(S.cal.tlKeep){const k=S.cal.tlKeep;S.cal.tlKeep=null;const lw0=(w.querySelector('.tl-lbl')||{}).offsetWidth||0,cw0=(w.scrollWidth-lw0)/N;w.scrollLeft=Math.max(0,(col(k.d)-1+k.f)*cw0);w.scrollTop=k.t||0;S.cal.tlPos={m,x:w.scrollLeft};tlCorner(w);return;}   // végtelen görgetés: ugyanott marad a kép
    if(c&&c.m===m){w.scrollLeft=c.x;if(c.y)w.scrollTop=c.y;tlCorner(w);return;}   // újrarajzoláskor ott marad, ahol voltál
    const lw=(w.querySelector('.tl-lbl')||{}).offsetWidth||0,cw=(w.scrollWidth-lw)/N,target=T.slice(0,7)===m?col(T)-1-5:col(m+'-01')-1;   // a mai nap előtt 5 nap is látszik
    w.scrollLeft=Math.max(0,target*cw);S.cal.tlPos={m,x:w.scrollLeft};tlCorner(w);});
  return `<div class="tl-wrap" data-ahead="${ahead}"><div class="tl tl-noanim" style="--n:${N};--dw:${TL_DAY_WIDTH}px">
    <div class="tl-row tl-head"><div class="tl-lbl tl-corner"><b class="tl-cm" data-first="${first}" data-n="${N}"></b><small><span class="tl-cnt">${rows.length} tétel</span> · húzd oldalra ↔</small></div><div class="tl-track tl-htrack">${bands}${head}</div></div>
    ${waitRows}${body}<div class="tl-empty tl-none"${rows.length?' hidden':''}>${empty('Ebben az időszakban nincs esemény – húzd oldalra az idővonalat.')}</div><div class="tl-row tl-fill" aria-hidden="true"><div class="tl-lbl"></div><div class="tl-track"><div class="tl-bg">${bg}</div></div></div>
    ${ti?`<div class="tl-now" style="--i:${ti}" title="Ma"></div>`:''}</div></div>`;
}
/* Kézzel felvett vágói naptár-esemény (nincs projekt-azonosítója): a cím első szava és a határidő alapján megkeressük a projektjét,
   hogy a sávon látszódjon, ha a videók jóváhagyásra várnak (⏳) vagy már átadva (✓) */
function vLinkProj(e){const w=fold(String(e.title||'').trim().split(/\s+/)[0]||'');if(w.length<3)return '';const end=e.endDate||e.date;
  const c=S.projects.filter(p=>['leadva','jovahagyas','atadva'].includes(p.status)&&fold(String(p.name||'').trim().split(/\s+/)[0]||'')===w).filter(p=>{const d=dueDate(p);return !d||!end||Math.abs(diffDays(d,end))<=21;});
  return c.length===1?c[0].id:'';}
function viewCalendar(){
  const m=S.cal.month,r=calRange(m),T=todayISO();
  const ahead=S.cal.mode==='ido'?tlMonthsAhead():1;
  prefetchCal(m,ahead);
  const items=calItems(m),loading=!!S.cal.loading[m]&&!S.cal.events[m],err=S.cal.err[m];
  const days=[];for(let i=0;i<42;i++)days.push(addDays(r.start,i));
  const onDay=d=>items.filter(it=>it.date<=d&&it.endDate>=d);
  const grid=days.map(d=>{const its=onDay(d),out=d.slice(0,7)!==m;
    return `<div class="cal-day${out?' out':''}${d===T?' today':''}${S.cal.sel===d?' sel':''}${S.cal.focus&&d>=S.cal.focus.start&&d<=S.cal.focus.end&&!out?' focus':''}" data-day="${d}"><div class="cal-dh"><span class="cal-dn">${Number(d.slice(8))}</span>${ro()?'':`<button type="button" class="cal-add" data-action="cal-new" data-d="${d}" aria-label="Új bejegyzés: ${esc(d)}" title="Új bejegyzés erre a napra">+</button>`}</div>${its.slice(0,4).map(it=>calChip(it,d)).join('')}${its.length>4?`<button type="button" class="cal-more" data-action="cal-day" data-d="${d}">+${its.length-4} további</button>`:''}</div>`;}).join('');
  const agenda=days.filter(d=>d.slice(0,7)===m).map(d=>{const its=onDay(d);if(!its.length)return '';
    return `<div class="ag-day${d===T?' today':''}"><div class="ag-date">${esc(F_FULL.format(toDate(d)).replace(/^\d{4}\. /,''))}</div>${its.map(it=>calChip(it,d)).join('')}</div>`;}).join('');
  const nP=items.filter(i=>i.kind==='p'&&i.date.slice(0,7)<=m&&i.endDate.slice(0,7)>=m).length,nG=items.filter(i=>i.kind==='g'&&i.date.slice(0,7)<=m&&i.endDate.slice(0,7)>=m).length;
  const readOnly=ro(),cutters=readOnly?[]:S.crew.filter(c=>(c.roles||[]).includes('Vágó')).sort((a,b)=>a.name.localeCompare(b.name,'hu'));
  const cutterError=readOnly?'':S.cal.err['v:'+m];
  return `<div class="page-head cal-toolbar">${(()=>{const mn=x=>F_MONTH.format(toDate(x+'-01')).replace(/^\d{4}\.\s*/,'').toLowerCase(),pm=shiftMonth(m,-1),nm=shiftMonth(m,1),yr=(x)=>x.slice(0,4)!==m.slice(0,4)?x.slice(0,4)+'. ':'';
      return `<div class="cal-mnav" role="group" aria-label="Hónap választása"><span class="cm-tools"><div class="seg" role="group" aria-label="Nézet"><button type="button" data-action="cal-mode" data-v="ido" aria-pressed="${S.cal.mode==='ido'}">☰ Idővonal</button><button type="button" data-action="cal-mode" data-v="honap" aria-pressed="${S.cal.mode!=='ido'}">▦ Havi</button></div><button class="btn outline cm-today" type="button" data-action="cal-nav" data-d="0" title="Ugrás a mai napra">Ma</button></span><button class="btn outline cm-arr" type="button" data-action="cal-nav" data-d="-1" aria-label="Előző hónap">‹</button><button class="btn outline cm-side" type="button" data-action="cal-nav" data-d="-1">${esc(yr(pm)+mn(pm))}</button><h2 class="cm-cur-h"><button type="button" class="cm-cur" data-action="cal-first" title="${S.cal.mode==='ido'?'Ugrás a hónap első napjára':'Ugrás a mai hónapra'}">${esc(m.slice(0,4)+'. '+mn(m))}</button></h2><button class="btn outline cm-side" type="button" data-action="cal-nav" data-d="1">${esc(yr(nm)+mn(nm))}</button><button class="btn outline cm-arr" type="button" data-action="cal-nav" data-d="1" aria-label="Következő hónap">›</button></div>`;})()}
      ${!readOnly&&S.cal.mode!=='ido'?`<label class="cal-tog"><input type="checkbox" id="cal-cutdue"${calCutDue()?' checked':''}> ✂️ Vágói határidők</label>`:''}
      ${cutters.length?`<span class="cal-cutsel"><select class="inp" id="cal-cutter" data-cmb="Vágó kiválasztása…" aria-label="Melyik vágó munkáit mutassa"><option value="__all"${S.cal.cutter?'':' selected'}>✂️ Minden vágó</option>${cutters.map(c=>`<option value="${esc(c.id)}"${S.cal.cutter===c.id?' selected':''}>${esc(c.name)}</option>`).join('')}</select></span>`:''}
      ${readOnly?'':`<div class="btns"><button class="btn primary small" type="button" data-action="cal-new">+ Új projekt</button>
        <a class="btn ghost small" href="https://calendar.google.com/calendar/u/0/r/month/${r.first.replace(/-/g,'/')}" target="_blank" rel="noopener">Google Naptár ↗</a></div>`}</div>
    ${cutterError?`<div class="bad-txt">A Vágói naptár most nem érhető el: ${esc(cutterError)}</div>`:''}
    ${err&&!ro()?`<div class="banner"><p>A Google Naptár most nem érhető el: ${esc(err)}</p><button class="btn outline small" type="button" data-action="cal-retry">Újra</button></div>`:''}
    ${S.cal.mode==='ido'?calTimeline(m,items,T,ahead):`<div class="cal-wrap"><div class="cal-grid">${WD_SHORT.map(w=>`<div class="cal-wd">${w}</div>`).join('')}${grid}</div></div>
    <div class="cal-agenda">${agenda||empty('Ebben a hónapban nincs esemény.')}</div>`}`;
}

/* ===== Leltár ===== */
function viewInventory(){
  const T=todayISO(),f=S.inf,q=f.q.trim().toLowerCase();
  let list=S.inventory.slice();
  if(f.cat)list=list.filter(i=>(i.category||'Egyéb')===f.cat);
  if(f.cond)list=list.filter(i=>(i.condition||'ok')===f.cond);
  if(q)list=list.filter(i=>fold([i.name,i.serial,i.category,i.note,i.location].join(' ')).includes(fold(q)));
  const totalQty=S.inventory.reduce((s,i)=>s+num(i.qty),0);
  const value=S.inventory.reduce((s,i)=>s+num(i.value)*num(i.qty),0);
  const broken=S.inventory.filter(i=>i.condition==='javitas'||i.condition==='szerviz').length;
  const rows=INV_CATS.map(cat=>{const items=list.filter(i=>(i.category||'Egyéb')===cat).sort((a,b)=>a.name.localeCompare(b.name,'hu'));if(!items.length)return '';
    return `<tr class="grp"><td colspan="6">${esc(cat)} · ${items.reduce((s,i)=>s+num(i.qty),0)} db</td></tr>`+items.map(i=>{
      const cond=i.condition||'ok';
      const condCls=cond==='ok'?'p-ok':cond==='selejt'?'':cond==='szerviz'?'p-bad':'p-warn';
      return `<tr><td><div class="nm">${esc(i.name)}${invFmt(i)?` <span class="fmt-tag fmt-${invFmt(i)}">${FMT_LBL[invFmt(i)]}</span>`:''}</div>${i.note?`<div class="ser">${esc(i.note)}</div>`:''}</td>
        <td class="num">${num(i.qty)}</td>
        <td><span class="statuspill ${condCls}">${esc(CONDITIONS[cond]||cond)}</span></td>
        <td>${i.location?esc(i.location):'<span class="muted">—</span>'}</td>
        <td><span class="ser">${esc(i.serial||'')}</span></td>
        <td class="num"><button class="btn ghost small w" type="button" data-action="edit-item" data-id="${esc(i.id)}">Szerkesztés</button></td></tr>`;}).join('');}).join('');
  return `<div class="page-head"><div class="grow"><h2>Leltár</h2><p class="sub">${S.inventory.length} tétel · ${totalQty} db${value&&isAdmin()?` · bruttó nyilvántartási érték ${huf(value)}`:''}${broken?` · <span class="warn-txt">${broken} javításra vár / szervizben</span>`:''}</p></div>${ro()?'':undoBar()}
      <button class="btn primary w" type="button" data-action="new-item">+ Új eszköz</button></div>
    <div class="toolbar"><input class="inp search" id="q-inv" type="search" placeholder="Keresés név, hely vagy sorozatszám szerint" value="${esc(f.q)}" aria-label="Leltár keresése">
      <select class="inp" id="inv-cat" data-cmb="Minden kategória" aria-label="Kategória"><option value="">Minden kategória</option>${INV_CATS.map(c=>`<option${c===f.cat?' selected':''}>${esc(c)}</option>`).join('')}</select>
      <select class="inp" id="inv-cond" data-cmb="Minden állapot" aria-label="Állapot"><option value="">Minden állapot</option>${Object.entries(CONDITIONS).map(([k,v])=>`<option value="${k}"${k===f.cond?' selected':''}>${v}</option>`).join('')}</select></div>
    ${rows?`<div class="tbl-wrap"><table><thead><tr><th>Eszköz</th><th class="num">Db</th><th>Állapot</th><th>Tárolási hely</th><th>Azonosító</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:`<div class="panel">${empty(S.inventory.length?'Nincs a szűrésnek megfelelő eszköz.':'Még üres a leltár. Vedd fel az eszközöket az „Új eszköz” gombbal.')}</div>`}`;
}

/* ===== Ügyfelek ===== */
function viewClients(){
  const q=S.clf.q.trim().toLowerCase(),T=todayISO();
  let list=knownClients('');
  if(q)list=list.filter(c=>fold([c.company,c.tax,c.address,c.name,c.email,c.phone].join(' ')).includes(fold(q)));
  const projOf=c=>S.projects.filter(p=>String(p.client||'').trim().toLowerCase()===c.company.toLowerCase()).sort((a,b)=>byStart(b,a));
  const adm=isAdmin()&&S.capabilities&&S.capabilities.finance;if(adm&&!S.fin&&!S.finErr)setTimeout(()=>finLoad().then(()=>{if(S.tab==='ugyfelek')render(true);}),0);
  const rows=list.map(c=>{const ps=projOf(c),next=ps.filter(p=>p.status!=='lemondva'&&pr(p)&&pr(p).end>=T).sort(byStart)[0],last=next||ps[0];
    return `<tr class="cl-row" data-action="edit-client" data-name="${esc(c.company)}" title="Ügyfél adatai"><td><button class="linkbtn nm cl-name" type="button" data-action="edit-client" data-name="${esc(c.company)}">${esc(c.company)}</button>${c.address?`<div class="ser">${esc(c.address)}</div>`:''}</td>
      <td><span class="ser">${esc(c.tax||'')}</span></td>
      <td>${c.name?esc(c.name):'<span class="muted">—</span>'}</td>
      <td class="cl-ph">${c.phone?`<a href="tel:${esc(c.phone.replace(/\s/g,''))}">${esc(c.phone)}</a>`:'<span class="muted">—</span>'}</td>
      <td>${c.email?`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`:'<span class="muted">—</span>'}</td>
      ${adm?`<td>${clContract(c,ps)}</td>`:''}</tr>`;}).join('');
  const all=knownClients('').length;
  return `<div class="page-head"><div class="grow"><h2>Ügyfelek</h2><p class="sub">${all} ügyfél${adm&&S._clDocsBusy?' · <span class="spin" style="width:11px;height:11px;vertical-align:-1px"></span> szerződések keresése a Drive-ban…':''}</p></div>${ro()?'':undoBar()}
      <button class="btn primary w" type="button" data-action="new-client">+ Új ügyfél</button></div>
    <div class="toolbar"><input class="inp search" id="q-cl" type="search" placeholder="Keresés cégnév, adószám, kapcsolattartó vagy e-mail szerint" value="${esc(S.clf.q)}" aria-label="Ügyfelek keresése"></div>
    ${rows?`<div class="tbl-wrap"><table><thead><tr><th>Ügyfél</th><th>Adószám</th><th>Kapcsolattartó</th><th class="cl-ph">Telefon</th><th>E-mail</th>${adm?'<th>Szerződés</th>':''}</tr></thead><tbody>${rows}</tbody></table></div>`:`<div class="panel">${empty(all?'Nincs a keresésnek megfelelő ügyfél.':'Még nincs ügyfél. Vegyél fel egyet, vagy adj meg ügyfelet egy projektnél.')}</div>`}`;
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
  return `<div class="cl-ctr cl-dropcell" data-cldrop="${cl}"><span class="cdrop-tip">📥 Húzd ide</span></div>`;
}
/* Ügyfél adatlapja (csak ügyvezető): a szerződései */
function clientDocsHtml(name){if(!name)return '';const c=knownClients('').find(x=>x.company===name)||{company:name};const ps=S.projects.filter(p=>String(p.client||'').trim().toLowerCase()===String(name).toLowerCase());
  if(!S.clDocs){clDocsLoad(false);setTimeout(()=>{const b=$('cl-docs-sec');if(b&&S.clDocs)b.outerHTML=clientDocsHtml(name);},2500);}
  const {f,docs,dir}=clDocs(c,ps);
  const body=f&&f.mode==='nemkell'?'<p class="hint" style="margin:0">Ennél az ügyfélnél nem kell szerződés.</p>':docs.length?`<div class="cl-docs">${docs.map(d=>`<div class="cl-doc-row"><a class="cl-doc" href="${esc(d.url)}" target="_blank" rel="noopener"><span class="cl-doc-k">${d.folder?'🗂️':'📄'}</span><span class="cl-doc-n">${esc(d.name)}</span><span class="cl-doc-d">${esc(d.date||'')}</span></a>${d.folder||!isAdmin()?'':`<button class="trash" type="button" data-action="cl-doc-del" data-inline="1" data-url="${esc(d.url)}" data-name="${esc(d.name)}" data-client="${esc(name)}" aria-label="Szerződés törlése" title="Törlés">🗑️</button>`}</div>`).join('')}</div>`:`<p class="hint" style="margin:0">${S.clDocs?'Még nincs feltöltött szerződés.':'Betöltés…'}</p>`;
  return `<div class="cl-work cl-docs-drop" id="cl-docs-sec"><h4>📑 Szerződések${docs.length?` <span class="muted">· ${docs.length} db</span>`:''} ${dir&&dir.url?`<a class="mini" href="${esc(dir.url)}" target="_blank" rel="noopener" style="margin-left:8px">📁 Ügyfél mappája ↗</a>`:''}</h4>${body}${isAdmin()&&!(f&&f.mode==='nemkell')?`<button type="button" class="cl-drop-box" data-action="cl-doc-pick" data-client="${esc(name)}" data-cldrop="${esc(name)}" data-inline="1"><span class="cl-drop-ic">📥</span><span><b>Új szerződés feltöltése</b><small>Húzd ide a fájlt (PDF, Word, kép), vagy kattints a tallózáshoz</small></span></button>`:''}</div>`;}
function clDocsModal(name){const c=knownClients('').find(x=>x.company===name)||{company:name};const ps=S.projects.filter(p=>String(p.client||'').trim().toLowerCase()===name.toLowerCase());
  const {dir,docs}=clDocs(c,ps);
  openModal('Szerződések – '+name,`<div class="cl-docs">${docs.map(d=>`<div class="cl-doc-row"><a class="cl-doc" href="${esc(d.url)}" target="_blank" rel="noopener"><span class="cl-doc-k">${d.folder?'🗂️':'📄'}</span><span class="cl-doc-n">${esc(d.name)}</span><span class="cl-doc-d">${esc(d.date||'')}</span></a>${d.folder?'':`<button class="trash" type="button" data-action="cl-doc-del" data-url="${esc(d.url)}" data-name="${esc(d.name)}" data-client="${esc(name)}" aria-label="Szerződés törlése" title="Törlés">🗑️</button>`}</div>`).join('')||'<p class="hint" style="margin:0">Még nincs szerződés.</p>'}</div>
    <div class="cl-drop" data-cldrop="${esc(name)}">📥 Új szerződés: húzd ide a fájlt<span class="cdrop-hint">Engedd el a feltöltéshez</span></div>
    <div class="btns" style="margin-top:12px">${dir?`<a class="mini" href="${esc(dir.url)}" target="_blank" rel="noopener">📁 Ügyfél mappája ↗</a>`:''}</div>`,{cancelLabel:'Bezárás'});
  if(S.tab==='ugyfelek'&&ACT['edit-client'])window.MODAL_BEFORE_CLOSE=()=>()=>{if(!$('mform'))ACT['edit-client']({dataset:{name}});};}   /* bezáráskor vissza az ügyfél adatlapjára */

/* ===== Beállítások (admin) ===== */
function viewSettings(){
  if(S.users===null||S.log===null){loadSettings();return '<div class="loading"><span class="spin"></span>Betöltés…</div>';}
  const MC=[['assign','👥 Beosztás','Szakemberek','A stáb véglegesítésekor (és módosításkor) megkapják a beosztásukat: időpont, helyszín, szerep, stáb.'],
    ['calendar','📅 Naptármeghívó','Meghívott vendégek','A kézzel létrehozott naptárbejegyzések meghívói. A stábtagok a projekt eseményébe külön Google-levél nélkül kerülnek be – őket a beosztásos levél értesíti, benne a naptárlinkkel.'],
    ['eqlist','🎒 Eszközlista','A kiválasztott stábtagok','Az „Eszközök véglegesítése” után kiküldött levél azoknak, akiknél eszköz van: ki mit visz, személyes megjegyzés.'],
    ['penalty','⚠️ Díjcsökkentés','Az érintett szakember','Jóváhagyott díjcsökkentésről (késés, hiba, kártérítés) értesítés.'],
    ['penAdmin','🔔 Jóváhagyásra váró díjcsökkentés','Ügyvezetők','Ha a termelési vezető díjcsökkentést javasol, az ügyvezető jóváhagyást kér.'],
    ['invoice','🧾 Számla, díjbekérő','Az ügyfél (vevő)','A számlázz.hu e-mailben elküldi a kiállított bizonylatot a vevő e-mail-címére.'],
    ['invite','✉️ Meghívó','Az új kolléga','Belépési meghívó, amikor új felhasználót veszel fel.'],
    ['payStatement','💰 Díjösszesítő','Az érintett szakember','A havi díjösszesítő a Fizetések oldal „Díjösszesítő kiküldése” gombjával: tételek, levonások, számlázási adatok.']],mc=S.mailCats||{},cc=S.mailCc||{};
  const CC=[['actor','aki küldi'],['editor','termelési vezetők'],['admin','ügyvezetők']];
  const mailPanel=S.mailOn===undefined?'':`<div class="panel mail-panel${S.mailOn?'':' off'}"><h3>📧 E-mail értesítések <span class="aside"><span class="statuspill ${S.mailOn?'p-ok':'p-bad'}">${S.mailOn?'Bekapcsolva':'Szünetel – senki nem kap e-mailt'}</span></span></h3>
    <p class="hint" style="margin:6px 0 10px">A főkapcsolóval minden e-mail egyszerre szüneteltethető. Bekapcsolt állapotban típusonként is választhatsz.</p>
    <button class="btn ${S.mailOn?'outline':'primary'} small" type="button" data-action="mail-toggle">${S.mailOn?'⏸ Minden e-mail szüneteltetése':'▶️ E-mailek bekapcsolása'}</button>
    <div class="mail-cats${S.mailOn?'':' dis'}">${MC.map(([k,l,to,d])=>`<div class="mail-cat${mc[k]===false?' off':''}"><label class="mail-cat-h"><input type="checkbox" data-mailcat="${k}"${mc[k]!==false?' checked':''}${S.mailOn?'':' disabled'}><b>${l}</b></label>
      <div class="mail-to"><span class="muted">Címzett:</span> <b>${to}</b></div><small>${d}</small>
      ${cc[k]?`<div class="mail-cc"><span class="muted">Másolat:</span>${CC.map(([r,rl])=>`<label class="cc-chip${cc[k].includes(r)?' on':''}"><input type="checkbox" data-mailcc="${k}" data-role="${r}"${cc[k].includes(r)?' checked':''}${S.mailOn&&mc[k]!==false?'':' disabled'}> ${rl}</label>`).join('')}</div>`:''}</div>`).join('')}</div></div>`;
  if(Date.now()-(S._settingsAt||0)>30000)setTimeout(loadSettings,0);
  const crewName=id=>{const c=crewById(id);return c?c.name:'';};
  const UT=[['all','Mind'],['admin','Ügyvezető'],['editor','Termelési vezetők'],['crew','Szakemberek'],['sales','Értékesítők']].filter(([k])=>k==='all'||S.users.some(u=>u.role===k));
  const ut=UT.some(([k])=>k===S.userTab)?S.userTab:'all',showSig=ut==='admin'||ut==='editor';
  const userTabs=`<div class="chips log-tabs">${UT.map(([k,l])=>`<button class="chip" type="button" data-action="user-tab" data-v="${k}" aria-pressed="${ut===k}">${l}<span class="c">${k==='all'?S.users.length:S.users.filter(u=>u.role===k).length}</span></button>`).join('')}</div>`;
  const sigOf=u=>{const sg=(S.sigs||{})[u.id];if(!sg)return '';const can=isAdmin()||u.id===S.me.id;
    return `<div class="sig-box"><div class="sig-h"><b>✍️ E-mail aláírás</b>${sg.set?'':' <span class="muted">– még nincs beállítva, a levelek „Üdvözlettel, név” zárással mennek</span>'}${can?`<button class="mini" type="button" data-action="sig-edit" data-id="${esc(u.id)}">Szerkesztés</button>`:''}</div>${sg.set?`<div class="sig-prev" data-sig="${esc(u.id)}"></div>`:''}</div>`;};
  const RO_={admin:0,editor:1,crew:2},users=S.users.filter(u=>isAdmin()||u.role==='crew'||u.id===S.me.id).filter(u=>!S.userTab||S.userTab==='all'||u.role===S.userTab||!S.users.some(x=>x.role===S.userTab)).slice().sort((a,b)=>(!!a.disabled-!!b.disabled)||((RO_[a.role]??3)-(RO_[b.role]??3))||a.name.localeCompare(b.name,'hu')).map(u=>`<div class="arow${u.disabled?' off':''}"><div class="who"><b>${esc(u.name)} <span class="statuspill ${u.disabled?'p-bad':'p-ok'}">${u.disabled?'letiltva':'aktív'}</span>${u.id===S.me.id?' <span class="muted" style="font-weight:600">(te)</span>':''}</b><small>${esc(roleLabel(u.role))}${u.crewId?' · stáb: '+esc(crewName(u.crewId)||'törölt munkatárs'):''}${u.email?' · '+esc(u.email):''}</small></div>
    <div class="arow-btns">${!isAdmin()&&u.role!=='crew'?'':`${u.id!==S.me.id?`<button class="mini${u.disabled?'':' warn'}" type="button" data-action="toggle-user" data-id="${esc(u.id)}" data-dis="${u.disabled?'0':'1'}">${u.disabled?'Engedélyezés':'Letiltás'}</button>`:''}<button class="mini" type="button" data-action="edit-user" data-id="${esc(u.id)}">Szerkesztés</button>`}</div>${(S.userTab==='admin'||S.userTab==='editor')&&(u.role==='admin'||u.role==='editor')&&!u.disabled?sigOf(u):''}</div>`).join('');
  const logActors=new Map(S.users.filter(u=>u.name).map(u=>[u.name,{name:u.name,role:u.role,count:0}]));
  for(const l of S.log){
    if(!l.who)continue;
    if(!logActors.has(l.who))logActors.set(l.who,{name:l.who,role:l.role,count:0});
    logActors.get(l.who).count++;
  }
  const actors=[...logActors.values()].sort((a,b)=>(RO_[a.role]??3)-(RO_[b.role]??3)||a.name.localeCompare(b.name,'hu'));
  const logUser=S.logTab??(actors.find(u=>u.role==='admin'||u.role==='editor')?.name||'__all');
  const lt=logActors.has(logUser)?logUser:'__all';
  const logSel=lt==='__all'?S.log:S.log.filter(l=>l.who===lt);
  const logFilter=`<div class="log-tabs"><select class="inp" id="log-user" data-cmb="Felhasználó keresése…" aria-label="Napló szűrése felhasználó szerint">
    <option value="__all"${lt==='__all'?' selected':''}>Összes felhasználó (${S.log.length})</option>
    ${actors.map(u=>`<option value="${esc(u.name)}"${lt===u.name?' selected':''}>${esc(u.name)}${u.role?' · '+esc(roleLabel(u.role)):''} (${u.count})</option>`).join('')}</select></div>`;
  const log=logSel.slice(0,200).map(l=>`<div class="logrow"><span class="when">${esc(l.at)}</span><span><b>${esc(l.who)}</b> · ${esc(l.action)}${l.subject?': '+esc(l.subject):''}${l.details?`<br><span class="muted">${esc(l.details)}</span>`:''}</span></div>`).join('');
  if(!isAdmin())return `<div class="page-head"><div class="grow"><h2>Beállítások</h2><p class="sub">Hozzáférések</p></div></div>
    <div class="panel"><h3>👤 Hozzáférések – ki léphet be <span class="aside"><button class="btn primary small" type="button" data-action="new-user">+ Szakember felvétele</button></span></h3>
      <p class="hint" style="margin:0 0 10px">Csak az itt felvett, aktív e-mail-címekkel lehet belépni (Google-fiókkal). Szakemberek hozzáférését veheted fel, módosíthatod, tilthatod le vagy törölheted; az ügyvezető és a termelési vezető fiókját csak az ügyvezető kezeli.</p>
      ${userTabs}<div class="alist">${users||empty('Nincs felhasználó.')}</div></div>`;   // termelési vezető: csak a hozzáférések
  return `<div class="page-head"><div class="grow"><h2>Beállítások</h2><p class="sub">Felhasználók, napló és a háttérben futó táblázat</p></div></div>
    ${mailPanel}
    ${S.links.folder?`<div class="btns"><a class="mini" href="${esc(S.links.folder)}" target="_blank" rel="noopener">📁 Projektek mappa ↗</a></div>`:''}
    <div class="grid2">
      <div class="panel"><h3>👤 Hozzáférések – ki léphet be <span class="aside"><button class="btn primary small" type="button" data-action="new-user">+ Kolléga felvétele</button></span></h3>
        <p class="hint" style="margin:0 0 10px">Csak az itt felvett, aktív e-mail-címekkel lehet belépni (Google-fiókkal). Letiltáskor a kolléga minden eszközön azonnal kilép. Ügyvezető: mindent lát és kezel, a Beállításokat is. Termelési vezető: projekteket, stábot és leltárt szerkeszt, eszközlistát küld. Szakember: csak a saját beosztásait látja (helyszín, időpont, stáb, eszközök), szerkeszteni nem tud.</p>
        ${userTabs}<div class="alist">${users||empty('Nincs felhasználó.')}</div></div>
      <div class="panel"><h3>🧾 Napló <span class="aside"><button class="btn ghost small" type="button" data-action="reload-log">↻</button></span></h3>
        ${logFilter}<div class="log-scroll">${log||empty('Még nincs bejegyzés.')}</div></div>
    </div>`;
}
async function loadSettings(){   // egy kérés; a már betöltött adatot azonnal mutatjuk, a háttérben frissítjük
  if(S._settingsLoading)return;S._settingsLoading=true;
  try{const r=await call('settingsData');S.users=r.users||[];S.sigs=r.sigs||{};S.log=r.log||[];S._settingsAt=Date.now();}
  catch(e){handleErr(e);S.users=S.users||[];S.log=S.log||[];S._settingsAt=Date.now();}   // hiba után se próbálja újra minden kirajzolásnál (30 mp múlva újra)
  finally{S._settingsLoading=false;if(S.tab==='beallitasok'&&!$('modalRoot').innerHTML)render(true);}
}

