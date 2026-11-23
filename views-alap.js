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
/* egy projekt friss (szerver által visszaadott) állapotát a helyi indító-gyorsítótárba írja – így oldalfrissítéskor sem a módosítás előtti állapot jelenik meg */
function bootCachePatch(pj){try{const c=JSON.parse(localStorage.getItem(BOOT_KEY)||'null');if(!c||!c.d||!Array.isArray(c.d.projects))return;const i=c.d.projects.findIndex(x=>x&&x.id===pj.id);if(i<0)return;const old=c.d.projects[i];
  c.d.projects[i]=Object.assign({},old,pj,{crew:pj.crew||old.crew,equipment:pj.equipment||old.equipment});localStorage.setItem(BOOT_KEY,JSON.stringify(c));}catch(e){}}
function bootCacheClear(){try{localStorage.removeItem(BOOT_KEY);localStorage.removeItem('lumos_pm_fin_v1');}catch(e){}calCacheClear();}
function bootFromCache(){
  try{const c=JSON.parse(localStorage.getItem(BOOT_KEY)||'null');if(!c||c.tk!==String(TOKEN).slice(-16)||!c.d||!c.d.me)return false;
    if(Date.now()-c.at>7*864e5)return false;
    const d=c.d;S.mySales=d.mySales||[];S.capabilities=d.capabilities||{};S.leads=d.leads||S.leads||{};S.mailOn=d.mailOn;S.clientMailLive=!!d.clientMailLive;S.mailCats=d.mailCats||S.mailCats;S.mailCc=d.mailCc||S.mailCc;S.crewOrder=Array.isArray(d.crewOrder)?d.crewOrder:crewOrderLocal();S.me=d.me;S.myNotify=d.myNotify||null;S.mySales=d.mySales||[];S.deals=d.deals||[];try{commPendApply();}catch(e){}S.salesPeople=d.salesPeople||[];S.crewDocs=d.crewDocs||[];crewDocsAutoBg();S.viewAsCrew=d.viewAsCrew||[];S.viewAsSales=d.viewAsSales||[];S.crewNames=d.crewNames||{};S.projects=(d.projects||[]).map(normProj);S.myInvites=d.myInvites||[];if(typeof bdRecent==='function')bdRecent();S.crew=d.crew||[];S.inventory=d.inventory||[];S.payAdjust=d.payAdjust||[];S.paySent=d.paySent||[];S.payStatus=d.payStatus||[];S.clients=d.clients||[];S.links=d.links||{};S.loaded=true;S.lastLoad=0;
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
    const m0=S._mut||0;const d=pre||await call('bootstrap',S._opened?undefined:{open:true});S._opened=true;   // az első betöltés a naplóba is bekerül (belépés)
    if(seq!==S.loadSeq)return;   // közben újabb betöltés indult (pl. nézetváltás) – ezt eldobjuk
    if(!pre&&S.loaded&&((S._mut||0)!==m0||(S._mutLive||0)>0)){setTimeout(()=>load(true),1500);return;}   // közben mentés futott: a régebbi adatot eldobjuk, kicsit később újratöltünk
    if(pre)pendPatch(pre);bootCacheSave(d);try{const va=d.me&&d.me.viewAs;(S._vb=S._vb||{})[va?va.role+'|'+(va.crewId||va.userId||''):'self']={d,at:Date.now()};}catch(e){}   /* nézetenként megjegyezzük: visszaváltáskor azonnal látszik */
    setTimeout(()=>{try{if(S.me&&!ro()&&!isSales())prefetchCal(S.cal.month);}catch(e){}},1200);
    setTimeout(()=>{try{if(S.me&&!ro()&&!(typeof isSales==='function'&&isSales())&&(typeof SETTINGS_TAB!=='function'||SETTINGS_TAB())&&(S.users===null||Date.now()-(S._settingsAt||0)>30000))loadSettings();}catch(e){}},900);setTimeout(()=>{try{if(S.me&&S.me.role==='admin'&&!S.me.viewAs&&!(S._vb&&S._vb['editor|']&&Date.now()-S._vb['editor|'].at<15*60*1000))call('viewBoot',{}).then(d=>{if(d&&d.me)(S._vb=S._vb||{})['editor|']={d,at:Date.now()};}).catch(()=>{});}catch(e){}},6000);   /* a Termelési v. nézet előtöltése: a váltás azonnali */   // Beállítások előtöltése (minden nézetben, ahol van Beállítások fül), hogy kattintásra azonnal megjelenjen
    S.capabilities=d.capabilities||{};S.leads=d.leads||S.leads||{};S.mailOn=d.mailOn;S.clientMailLive=!!d.clientMailLive;S.mailCats=d.mailCats||S.mailCats;S.mailCc=d.mailCc||S.mailCc;S.crewOrder=Array.isArray(d.crewOrder)?d.crewOrder:crewOrderLocal();S.me=d.me;S.myNotify=d.myNotify||null;S.mySales=d.mySales||[];S.deals=d.deals||[];try{commPendApply();}catch(e){}S.salesPeople=d.salesPeople||[];S.crewDocs=d.crewDocs||[];crewDocsAutoBg();salesSyncBg();setTimeout(()=>{try{bdResume();}catch(e){}},0);if(d.crewDocsAuto){const a=d.crewDocsAuto;setTimeout(()=>toast(a.err?'Szerződés-begyűjtés a Gmailből nem sikerült: '+a.err:a.n?'📥 '+a.n+' aláírt szerződés bekerült a Gmailből: '+a.list.join(', '):'📥 Gmail-ellenőrzés: nincs új aláírt szerződés.',!!a.err),1500);}S.viewAsCrew=d.viewAsCrew||[];S.viewAsSales=d.viewAsSales||[];S.crewNames=d.crewNames||{};S.projects=(d.projects||[]).map(normProj);S.myInvites=d.myInvites||[];if(typeof bdRecent==='function')bdRecent();S.crew=d.crew||[];S.inventory=d.inventory||[];S.payAdjust=d.payAdjust||[];S.paySent=d.paySent||[];S.payStatus=d.payStatus||[];S.clients=d.clients||[];S.links=d.links||{};S.loaded=true;S.lastLoad=Date.now();
    document.body.classList.toggle('ro',ro());
    if(S.projectId){const p=projById(S.projectId);if(!p&&!S.dirty){S.projectId=null;S.draft=null;}else if(p&&!S.dirty){S.draft=prepDraft(p);S.draftBase=clone(S.draft);}}
    if(!TABS().some(t=>t.id===S.tab))S.tab=TABS()[0].id;   // pl. az értékesítő csak az Értékesítés fület látja
    if(((S.tab==='penzugy'||S.tab==='szerzodes')&&!isAdmin())||(S.tab==='beallitasok'&&ro()))S.tab='projektek';
    if(S.me&&S.me.role==='admin'&&S.capabilities&&S.capabilities.finance)finLoad(!!S.fin);else{S.fin=null;try{localStorage.removeItem('lumos_pm_fin_v1');}catch(e){}}   // az ügyvezetőnek előre betöltjük (gyorsítótárból azonnal, a friss adat a háttérben)   // a pénzügyi adatok frissítése
    if((S.tab==='stab'||S.tab==='statisztak'||S.tab==='leltar'||S.tab==='ugyfelek')&&ro())S.tab='projektek';
    const hm=HASH_P.exec(location.hash||''),hp=hm&&projFromHash(hm[1]);   // projektlink (naptáreseményből, levélből vagy frissítés után)
    if(hp&&!S.dirty&&S.projectId!==hp.id){S.tab='projektek';S.projectId=hp.id;S.draft=prepDraft(hp);S.draftBase=clone(S.draft);}
    const ht=/^#t=([a-z]+)$/.exec(location.hash||'');   // fül frissítés után
    if(ht&&!S.projectId&&TABS().some(t=>t.id===ht[1]))S.tab=ht[1];
    try{pendPatchState();}catch(e){}if(!pre)setTimeout(()=>{try{pendReplay();}catch(e){}},0);
    S._fresh=true;    render(true);restoreScroll();try{vvRestore();}catch(e){}try{qRestore();}catch(e){}try{modalRestore();}catch(e){}try{vvPendCheck();}catch(e){}try{vvRefreshOpen();}catch(e){}if(announce)toast('Adatok frissítve');
  }catch(e){appReveal();if(!handleErr(e)&&!S.loaded)VIEW.innerHTML=`<div class="panel">${empty('Nem sikerült betölteni az adatokat: '+esc(errText(e)))}<div class="btns"><button class="btn primary" type="button" data-action="reload">Újrapróbálás</button></div></div>`;}
  finally{if(seq===S.loadSeq)S.loading=false;}
}
/* Automatikus frissítés (nincs „Frissítés” gomb): 15 mp-enként egy olcsó verziókérdés; ha valaki közben módosított, csendben újratöltünk.
   Gépelés, nyitott ablak vagy mentetlen módosítás közben várunk. */
const idleOk=()=>{const a=document.activeElement;return S.loaded&&!S.dirty&&!S.saving&&!S.loading&&document.visibilityState==='visible'&&!$('modalRoot').innerHTML&&!(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&a.type!=='checkbox');};
let VER_BUSY=false;
/* a videótábla (csak az van nyitva, nincs benne űrlap / videónéző) frissülhet: pl. az ügyfél közben jóváhagyott */
const boardIdle=()=>{const a=document.activeElement,mr=$('modalRoot');return S.loaded&&!S.dirty&&!S.saving&&!S.loading&&document.visibilityState==='visible'&&!!(mr&&mr.querySelector('.bd-modal'))&&!(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&a.type!=='checkbox')&&!document.querySelector('#modalRoot .vv-cm, #modalRoot .cf-layer');};
/* Felhasználói aktivitás: 10 perc mozdulatlanság (egér, billentyű, érintés, görgetés) után az app nem kérdez rá a változásokra
   és nem tölt újra a háttérben – így a nyitva hagyott fül nem tartja ébren az adatbázist. Az első mozdulatra azonnal frissít. */
let LAST_ACT=Date.now(),WAS_IDLE=false;const USER_IDLE_MS=10*60*1000,userActive=()=>Date.now()-LAST_ACT<USER_IDLE_MS;
['pointerdown','pointermove','keydown','wheel','touchstart','scroll'].forEach(ev=>window.addEventListener(ev,()=>{const back=WAS_IDLE||Date.now()-LAST_ACT>USER_IDLE_MS;   /* telefonon alvás alatt az időzítő áll – az eltelt időből is látjuk, hogy tétlen volt */LAST_ACT=Date.now();WAS_IDLE=false;
  if(back&&S.loaded&&!S.dirty&&!S.saving&&document.visibilityState==='visible'&&Date.now()-S.lastLoad>60000)load(true);},{passive:true,capture:true}));
setInterval(()=>{if(!userActive())WAS_IDLE=true;},30000);
/* visszatérés az appba (telefon felébresztése, másik appból/fülről vissza): ha 1 percnél régebbi az adat, frissít */
const backFresh=()=>{if(document.visibilityState==='visible'&&S.loaded&&!S.dirty&&!S.saving&&Date.now()-(S.lastLoad||0)>60000){LAST_ACT=Date.now();WAS_IDLE=false;load(true);}};
document.addEventListener('visibilitychange',backFresh);window.addEventListener('pageshow',e=>{if(e.persisted)backFresh();});window.addEventListener('focus',backFresh);
setInterval(async()=>{if(!TOKEN||VER_BUSY||!userActive()||!(idleOk()||boardIdle()))return;VER_BUSY=true;
  try{const r=await call('dataVer');const v=r&&r.v;if(v&&S.dataVer&&v!==S.dataVer&&(idleOk()||boardIdle())){S.dataVer=v;if(S.tab==='naptar')calForceFresh();const bd=boardIdle();await load(true);if(bd&&boardIdle()&&typeof bdRefresh==='function')bdRefresh();}else if(v)S.dataVer=v;}catch(e){}finally{VER_BUSY=false;}},15000);
setInterval(()=>{const mgr=S.me&&(S.me.role==='admin'||S.me.role==='editor');if(userActive()&&idleOk()&&Date.now()-S.lastLoad>(mgr?120000:300000))load(true);},30000);   // a vezetőknél 2 percenként (értesítések)
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&S.loaded&&!S.dirty&&!S.saving&&Date.now()-S.lastLoad>60000)load(true);});
window.addEventListener('beforeunload',e=>{if(S.saving||(S.dirty&&S.draft&&!ro())){e.preventDefault();e.returnValue='';}});   // mentetlen módosításnál a böngésző rákérdez

/* ===== Megjelenítés ===== */
/* Lenyíló szekciók a projektlapon: alapból csukva, a nyitott állapotot megjegyezzük újrarajzolás között. */
const FOLD={};
/* Tartalom-csoport lenyíló: alapból nyitva, ha van benne kiválasztott tétel; a nyitás/zárás megmarad. */
const stepRow=(p,it)=>{const n=num(p[it.k]);return `<div class="dl${n>it.min?' on':''}"><div><div class="dl-name">${it.label}</div></div>
  <div class="stepper"><button type="button" data-action="rec-step" data-k="${it.k}" data-d="-1" aria-label="${it.label}: kevesebb"${n<=it.min||ro()?' disabled':''}>−</button><input class="step-in" type="text" inputmode="numeric" pattern="[0-9]*" data-step-k="${it.k}" data-min="${it.min}" data-max="${it.max}" aria-label="${it.label} (db)" value="${n}"${D()}><button type="button" data-action="rec-step" data-k="${it.k}" data-d="1" aria-label="${it.label}: több"${n>=it.max||ro()?' disabled':''}>+</button></div></div>`;};
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
const TAB_GROUPS=[{label:'Források',ids:['stab','ertekesitok','statisztak','leltar'],icons:{stab:'👥 ',ertekesitok:'🤝 ',statisztak:'🎭 ',leltar:'🎒 '}},{label:'Pénzügyek',ids:['kifizetesek','szerzodes','penzugy'],icons:{kifizetesek:'⚒️ ',szerzodes:'📄 ',penzugy:'📊 '}}];
const FIN_GROUP=TAB_GROUPS[1].ids;
S.groupSub=S.groupSub||{};
const groupOf=id=>{const all=TABS();return TAB_GROUPS.find(g=>g.ids.includes(id)&&all.filter(t=>g.ids.includes(t.id)).length>1)||null;};
function NAV_TABS(){const all=TABS(),out=[],done={};
  all.forEach(t=>{const g=groupOf(t.id);if(!g){out.push(t);return;}if(done[g.label])return;done[g.label]=1;
    const last=S.groupSub[g.label],id=last&&all.some(x=>x.id===last)?last:g.ids.find(x=>all.some(y=>y.id===x));out.push({id,label:g.label,group:g});});
  return out;}
function finSubNav(){const g=groupOf(S.tab);if(!g)return '';S.groupSub[g.label]=S.tab;
  return `<nav class="subtabs" aria-label="${esc(g.label)}">${TABS().filter(t=>g.ids.includes(t.id)).sort((a,b)=>g.ids.indexOf(a.id)-g.ids.indexOf(b.id)).map(t=>`<a class="subtab" href="#t=${esc(t.id)}" data-action="tab" data-tab="${t.id}" aria-current="${S.tab===t.id?'page':'false'}">${g.icons[t.id]||''}${/ és /.test(t.label)?`<span class="st-lg">${t.label}</span><span class="st-sm">${t.label.split(' és ')[0]}</span>`:t.label}</a>`).join('')}</nav>`;}
const TABS=()=>isSales()?[{id:'ertekesites',label:'Értékesítés'}].concat(S.me.crewId?[{id:'kifizetesek',label:'Kifizetések'}]:[]).concat([{id:'ertesitesek',label:'Beállítások'}]):(isAdmin()?[{id:'ertekesites',label:'Értékesítés'}]:[]).concat([{id:'projektek',label:ro()?'Beosztásaim':'Projektek'}]).concat(ro()?[]:[{id:'naptar',label:'Naptár'}]).concat(ro()?[{id:'naptar',label:'Naptár'}].concat([{id:'kifizetesek',label:isAdmin()?'Fizetések':'Kifizetések'}]):[{id:'stab',label:'Stáb'}].concat(isAdmin()?[{id:'ertekesitok',label:'Értékesítők'}]:[]).concat([{id:'statisztak',label:'Szereplők'},{id:'leltar',label:'Leltár'},{id:'ugyfelek',label:'Ügyfelek'},{id:'kifizetesek',label:isAdmin()?'Fizetések':'Kifizetések'}])).concat(isAdmin()&&S.capabilities&&S.capabilities.finance?[{id:'penzugy',label:'Bevétel és kiadás'},{id:'szerzodes',label:'Szerződés és számlázás'}]:[]).concat(!ro()?[{id:'beallitasok',label:'Beállítások'}]:[{id:'ertesitesek',label:'Beállítások'}]);
/* Valódi módosítás van-e: a vázlat eltér-e a betöltött állapottól (ha mindent visszacsináltál, nincs mit menteni) */
function stableJ(v){if(Array.isArray(v))return '['+v.map(stableJ).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).filter(k=>k[0]!=='_'&&v[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+stableJ(v[k])).join(',')+'}';return JSON.stringify(v===undefined?null:v);}
function draftChanged(){if(!S.draft||!S.draftBase||S.draft.id!==S.draftBase.id)return true;if(S._commDraft&&S._commDraft.pid===S.draft.id)return true;try{return stableJ(S.draft)!==stableJ(S.draftBase);}catch(e){return true;}}
function renderChrome(){if(S.dirty&&S.saving<=0&&!draftChanged())S.dirty=false;
  {const b=document.querySelector('.proj-save');if(b){const busy=S.saving>0;b.disabled=!S.dirty||busy;b.className='btn '+(S.dirty?'primary':'outline')+' small proj-save';b.textContent=busy?'Mentés…':S.dirty?'💾 Mentés':'✓ Mentve';}}
  const on=!!S.me;
  try{if(on&&typeof bellRender==='function')bellRender();}catch(e){}   /* a csengő azonnal megjelenik (nem csak az 5 mp-es frissítéskor) */
  {let sp=$('savingPill');if(!sp){sp=document.createElement('div');sp.id='savingPill';sp.className='saving-pill';sp.setAttribute('role','status');document.body.appendChild(sp);}
    const busy=on&&S.saving>0;sp.classList.toggle('on',busy);if(busy&&!S._saveT0)S._saveT0=Date.now();if(!busy)S._saveT0=0;const sec=busy?Math.round((Date.now()-S._saveT0)/1000):0;sp.textContent=busy?'⏳ Mentés folyamatban…'+(sec>=6?' ('+sec+' mp – a szerver lassan válaszol)':''):'';if(busy){clearTimeout(S._spT);S._spT=setTimeout(()=>{try{renderChrome();}catch(e){}},1000);}}   // látszik, amíg a háttérben ment
  ['userChip','logoutBtn'].forEach(id=>$(id).classList.toggle('hidden',!on));
  const realEd=on&&(S.me.realRole?S.me.realRole==='editor':S.me.role==='editor'),realAdmin=on&&(S.me.role==='admin'||S.me.realRole==='admin'||realEd),va=on&&S.me.viewAs;
  $('viewAs').classList.toggle('hidden',!realAdmin);{const sel=$('viewAs');['admin','sales','sales-other'].forEach(v=>{const o=sel.querySelector(`option[value="${v}"]`);if(o){o.hidden=realEd;o.disabled=realEd;}});}   // termelési vezető: csak a saját nézete és a szakember nézet$('viewAs').classList.toggle('on',!!va);
  if(realAdmin){const sel=$('viewAs');sel.value=va?va.role:realEd?'editor':'admin';const co=sel.querySelector('option[value=crew]');const inCrew=!!(va&&va.role==='crew');co.textContent=inCrew?(va.crewName||'Szakember'):'🔨 Szakember';co.hidden=inCrew;const oo=sel.querySelector('option[value=crew-other]');if(oo){oo.hidden=!inCrew;oo.disabled=!inCrew;oo.textContent='↻ '+(inCrew?(va.crewName||'Szakember'):'Másik szakember');}   /* szakember nézetben a lista elemén kör nyíl: rákattintva másik szakember választható */const so=sel.querySelector('option[value=sales]'),inSales=!!(va&&va.role==='sales'&&va.userId);if(so)so.textContent=inSales?'🤝 Értékesítő: '+(va.crewName||''):'🤝 Értékesítő';const os=sel.querySelector('option[value=sales-other]');if(os){os.hidden=!inSales;os.disabled=!inSales;}}
  const vb=$('viewBanner');vb.classList.toggle('hidden',!va);
  if(va){const h=`<span>${va.role==='crew'?'🔨':va.role==='sales'?'🤝':'⚙️'} ${va.role==='crew'?'Szakember nézet – így látja az appot <b>'+esc(va.crewName||'')+'</b>':va.role==='sales'?(va.userId?'Értékesítő nézet – így látja az appot <b>'+esc(va.crewName||'')+'</b>':'Értékesítő nézet – így látja az appot egy értékesítő (a saját lehetőségeiddel)'):'Termelési v. nézet – így látja az appot egy termelési vezető'}. Amit itt teszel, az a te nevedben történik.</span><button class="btn outline small" type="button" data-action="view-reset">Vissza: ${S.me.realRole==='editor'?'Termelési v.':'Ügyvezető'}</button>${va.role==='crew'?'<button class="btn outline small" type="button" data-action="view-other" data-r="crew">↻ Másik szakember</button>':va.role==='sales'&&va.userId?'<button class="btn outline small" type="button" data-action="view-other" data-r="sales">↻ Másik értékesítő</button>':''}`;if(vb._h!==h){vb.innerHTML=h;vb._h=h;}}
  if(!on){$('tabs').innerHTML='';return;}
  {const va0=S.me.viewAs,vs0=$('viewAs'),vl=va0&&vs0?(va0.role==='crew'?'🔨 '+(va0.crewName||'Szakember'):((vs0.querySelector(`option[value="${va0.role}"]`)||{}).textContent||'')):'';$('userChip').textContent=S.me.role==='crew'&&!va0?S.me.name:S.me.name+' · '+(vl?vl.replace(/^\S+\s/,'👁 '):roleLabel(S.me.role));}   /* nézetváltáskor a gomb a választott nézetet mutatja */
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
/* Felugró ablak és a Vissza gomb: megnyíláskor egy saját előzmény-bejegyzés kerül be, így a (telefonos / böngészős) Vissza az ablakot zárja be,
   és a mögötte lévő nézetre (pl. a videótáblára) tér vissza – nem hagyja el az appot. Ha az ablak máshogy zárul, a bejegyzést mi vesszük vissza. */
const MD_HIST={on:false,skip:0,t:0};
function mdHistSync(){clearTimeout(MD_HIST.t);MD_HIST.t=setTimeout(()=>{const open=!!document.querySelector('#modalRoot .mbox');
  if(open&&!MD_HIST.on){try{history.pushState({lpmModal:1},'',location.href);MD_HIST.on=true;}catch(e){}}
  else if(!open&&MD_HIST.on){MD_HIST.on=false;if(history.state&&history.state.lpmModal){MD_HIST.skip++;try{history.back();}catch(e){MD_HIST.skip--;}}}},120);}
(()=>{const go=()=>{const r=document.getElementById('modalRoot');if(!r)return setTimeout(go,200);try{new MutationObserver(mdHistSync).observe(r,{childList:true,subtree:false});}catch(e){}};go();})();
function mdHistBack(){   /* Vissza nyitott ablaknál: a legfelső réteg zárul; beírt szöveget tartalmazó réteg nem zárul el (a szöveg nem veszhet el) */
  const cf=document.querySelector('#modalRoot .cf-layer');
  if(cf){if([...cf.querySelectorAll('textarea,input')].some(x=>String(x.value||'').trim())){try{history.pushState({lpmModal:1},'',location.href);}catch(e){}toast('Előbb küldd el vagy töröld a beírt szöveget – vagy nyomd a „← Vissza” gombot.',true);return;}cf.remove();try{history.pushState({lpmModal:1},'',location.href);}catch(e){}return;}
  MD_HIST.on=false;const x=document.querySelector('#modalRoot [data-action="modal-close"],#modalRoot .mclose,#modalRoot [aria-label="Bezárás"]');if(x)x.click();else closeModal();
  setTimeout(()=>{if(document.querySelector('#modalRoot .mbox')&&!MD_HIST.on){try{history.pushState({lpmModal:1},'',location.href);MD_HIST.on=true;}catch(e){}}},150);}
window.addEventListener('popstate',()=>{if(MD_HIST.skip>0){MD_HIST.skip--;return;}if(!S.me||!S.loaded)return;
  if(document.querySelector('#modalRoot .mbox')){mdHistBack();return;}   // nyitott felugró ablaknál a Vissza az ablakot zárja
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
function render(force){try{fixLegacyRoles();}catch(e){}setTimeout(appReveal,0);setTimeout(autoSiteStep,400);if(S._dlDrag){S._dlDragRender=1;return;}   // kártyahúzás közben (érintő) nem rajzolunk újra

  if(!S.me)return;
  document.body.classList.toggle('proj-locked',projLocked());
  const ae=document.activeElement;
  const keep=ae&&ae.id&&VIEW.contains(ae)&&ae.tagName!=='SELECT'?{id:ae.id,s:ae.selectionStart,e:ae.selectionEnd}:null;
  renderChrome();
  if(!S.loaded)return;
  const pwK=()=>S.tab+'|'+(S.payMonth||'')+'|'+((S.cal&&S.cal.month)||'')+'|'+((S.cal&&S.cal.mode)||''),pwO=VIEW.querySelector('.dock-wrap')||VIEW.querySelector('.pay-wrap'),pwS=pwO?{t:pwO.scrollTop,l:pwO.scrollLeft,k:pwK()}:null;   /* Fizetések tábla / naptár idővonal: a görgetett helyzet frissítéskor megmarad */   /* Fizetések tábla: a görgetett helyzet frissítéskor megmarad */
  VIEW.innerHTML=finSubNav()+(S.tab==='projektek'?viewProjects():S.tab==='naptar'?viewCalendar():S.tab==='vagas'?viewCutBoard():S.tab==='stab'||S.tab==='ertekesitok'||S.tab==='statisztak'?viewCrew():S.tab==='leltar'?viewInventory():S.tab==='ugyfelek'?viewClients():S.tab==='kifizetesek'?viewPayouts():S.tab==='penzugy'?viewFinance():S.tab==='szerzodes'?viewBilling():S.tab==='beallitasok'?kkWrap(viewSettings,true):S.tab==='ertesitesek'?kkWrap(viewMyNotify,!!S.myNotify):S.tab==='ertekesites'?viewSales():viewProjects());
  {const L=window.POST_RENDER||[];window.POST_RENDER=[];L.forEach(f=>{try{f();}catch(e){}});}
  let pwN=VIEW.querySelector('.pay-wrap,.tl-wrap');const pwKeep=!!(pwS&&pwN&&pwS.k===pwK());
  try{payFit();}catch(e){}   /* fizetések táblája: a munkatársak oszlopa pont a legszélesebb összegnyi */   // még a kirajzolás előtt (pl. az idővonal görgetési helyzete) – nincs villanás
  if(['stab','ertekesitok','statisztak','leltar','kifizetesek','szerzodes','penzugy'].includes(S.tab)&&!(S.tab==='kifizetesek'&&ro())){const sn=VIEW.querySelector(':scope > .subtabs'),ph=sn&&sn.nextElementSibling;if(ph&&ph.classList.contains('page-head')){ph.prepend(sn);ph.classList.add('ph-sub');}}   /* az altabok és a fejléc egy sorban */
  try{payDock();}catch(e){}
  try{if(window.tabStick)tabStick();}catch(e){}
  try{if(window.tlNameFix)tlNameFix();}catch(e){}   /* idővonal: a balra kicsúszó sávok neve látható marad */   /* tablet: a projekt neve oszlop rögzítése */   /* telefonon a Fizetések tábla egyetlen görgető felületen (a fejléc a táblával együtt görget) */
  pwN=VIEW.querySelector('.dock-wrap')||pwN;if(pwKeep){pwN.scrollLeft=pwS.l;pwN.scrollTop=pwS.t;}
  try{const tb=document.querySelector('.topbar'),dw=VIEW.querySelector('.dock-wrap');if(document.body.classList.contains('pay-dock')&&dw&&window.payDockSync)payDockSync(dw);else if(tb&&tb.style.transform){tb.style.transform='';tb.style.transition='';}}catch(e){}
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
/* Projektlista: a vágási táblán lévő videók tételesen, a stádiumukkal (a leadott/jóváhagyott, linkkel rendelkező videó kattintható) */
const VST_TONE={vagasra:'mute',vagas:'cut',ellen:'info',leadva:'info',jovahagyva:'ok',modositas:'bad'};
function vidStList(p){   // projektlista: videók összesítője – egy sor (darabszám + jóváhagyott arány) és vékony állapotsáv; kattintásra lenyílik a tételes lista
  const l=p.videos||[];if(!l.length||p.status==='lemondva')return '';   /* lemondott projektnél nincs videóállapot */
  const lab=st=>((typeof VID_ST!=='undefined'?VID_ST:[]).find(x=>x[0]===st)||[,'Utómunkára vár'])[1];
  const open=!!(S._vidOpen&&S._vidOpen[p.id]),cnt={};l.forEach(v=>{const st=v.st||'vagasra';cnt[st]=(cnt[st]||0)+1;});
  const sts=Object.keys(cnt),uni=sts.length===1?sts[0]:'',pre=['tervezes','helyszin'].includes(p.status||'tervezes')&&uni==='vagasra';   /* forgatás előtt nincs állapot */
  const ORD=['jovahagyva','leadva','ellen','vagas','vagasra','modositas'],okN=cnt.jovahagyva||0;
  const bar=pre?'':`<span class="pt-vbar" data-tip="${esc(ORD.filter(k=>cnt[k]).map(k=>lab(k)+': '+cnt[k]).join('\n'))}">${ORD.filter(k=>cnt[k]).map(k=>`<i class="vb-${k}" style="flex:${cnt[k]}"></i>`).join('')}</span>`;
  const head=`<button type="button" class="pt-vtog" data-action="pt-vid-tog" data-pid="${esc(p.id)}" aria-expanded="${open}"><span class="pt-vcar">${open?'▾':'▸'}</span> 🎞️ ${l.length} ${l.some(v=>v.k==='foto')&&l.every(v=>v.k==='foto')?'fotógaléria':'videó'}${pre?'':`<span class="pt-vcnt">${okN}/${l.length} jóváhagyva</span>`}</button>${bar}`;
  if(!open)return `<div class="pt-vids">${head}</div>`;
  return `<div class="pt-vids">${head}${l.map((v,i)=>{const st=v.st||'vagasra',nm=esc(v.name||(i+1)+'. videó'),lk=/^https:\/\//i.test(v.link||'')&&['leadva','jovahagyva'].includes(st);
    return `<div class="pt-vid">${lk?`<a href="${esc(v.link)}" target="_blank" rel="noopener" data-action="ext-link" class="pt-vn" title="${nm} megnyitása">▶ ${nm}</a>`:`<span class="pt-vn" title="${nm}">${nm}</span>`}${uni||pre?'':`<span class="pt-vs vs-${VST_TONE[st]||'mute'}">${esc(lab(st))}</span>`}</div>`;}).join('')}</div>`;}
function vidLink(p,cls,label,extra){if(!/^https:\/\//i.test(p.deliveryLink||''))return '';const a=`<a class="${cls}" href="${esc(p.deliveryLink)}" target="_blank" rel="noopener"${extra||''}>${label}</a>`;
  return p.deliveryPass?`<span class="pass-wrap">${a}<span class="pass-pop" role="tooltip">🔑 Jelszó: <code>${esc(p.deliveryPass)}</code><button type="button" class="pass-copy" data-action="copy-pass" data-pass="${esc(p.deliveryPass)}">Másolás</button></span></span>`:a;}
function extraLinks(p,cls){const l=(Array.isArray(p.deliveryLinks)?p.deliveryLinks:[]).filter(x=>/^https:\/\//i.test(x));
  return l.map((u,i)=>`<a class="${cls}" href="${esc(u)}" target="_blank" rel="noopener" title="${esc(u)}">${i+2}. link ↗</a>`).join('');}
const DONE_CHECK=' <span class="done-check done-lock" data-tip="Lezárt projekt – csak Felnyitással módosítható" aria-label="Lezárva">🔒</span>';   // lezárt (Kész) projekt: lakat
/* Figyelmeztetés a listában: a projekt csapata még nincs véglegesítve (vagy véglegesítés óta módosult) */
function crewFinalWarn(p){if(ro()||!crewFinalOn()||p.status==='atadva'||p.status==='lemondva')return '';const r=pr(p);if(r&&r.end<todayISO())return '';
  const st=crewFinalState(p);if(st==='ok')return '';
  const left=r?diffDays(todayISO(),r.start):null,soon=left!=null&&left<14,cls='p-bad';if(left==null||left>=30)return '';   // csak az utolsó 30 napban jelenik meg, akkor pirossal
  const urg=soon?(left<=0?'⏰ A rendezvény már elkezdődött! ':`⏰ Kevesebb mint két hét van a rendezvényig (${left===1?'holnap kezdődik':'még '+left+' nap'}). `):'';
  return st==='changed'?`<span class="statuspill ${cls}" data-tip="${urg}A csapat a véglegesítés óta módosult – a projekt oldalán véglegesítsd újra, hogy a tagok értesítést kapjanak.">👥 Stáb módosult</span>`
    :`<span class="statuspill ${cls}" data-tip="${urg}${crewIds(p).size?'A csapat még nincs véglegesítve – a projekt oldalán véglegesítsd, hogy a tagok bekerüljenek a naptárba és értesítést kapjanak.':'Még nincs stáb beosztva erre a projektre.'}">👥 Stáb nincs véglegesítve</span>`;}
const allApproved=p=>{const vs=p.videos||[];return vs.length>0&&vs.every(v=>v.st==='jovahagyva');};
function statusPill(p){const s=p.status||'tervezes';if((s==='jovahagyas'||s==='leadva')&&(allApproved(p)||(()=>{const d=dueInfo(p);return !!(d&&d.lead!=null);})()))return '';   // a „N napja jóváhagyásra vár” jelzés kimondja   // minden videót jóváhagytak: a „✅ Minden videó jóváhagyva” jelzés elég
  return `<span class="statuspill st-${esc(s)}${siteWaiting(p)?' st-wait':''}">${esc(stageLabel(p,s))}</span>${s==='tervezes'&&!ro()&&missingReq(p).length?'<span class="statuspill p-mute" data-tip="Hiányos alapadatok – a projekt oldalán pótolhatók">📝 Piszkozat</span>':''}`;}
function calBlock(iso){
  if(!validISO(iso))return `<span class="cal none" aria-hidden="true"><span class="cal-m">—</span><span class="cal-d">?</span></span>`;
  const d=toDate(iso);
  return `<span class="cal" aria-hidden="true"><span class="cal-m">${esc(F_MON.format(d).replace('.',''))}</span><span class="cal-d">${d.getUTCDate()}</span><span class="cal-w">${esc(F_WD.format(d))}</span></span>`;
}
/* A leadott anyagok megnevezése: videó(k), fotók, vagy mindkettő */
function appLabel(vs){const f=vs.filter(v=>v.k==='foto').length,n=vs.length-f;return n&&f?(n===1?'Videó':'Videók')+' és fotók':f?'Fotók':n===1?'Videó':'Videók';}
function dueInfo(p){
  const due=dueDate(p);if(!due||!isOpen(p))return null;
  if(p.status==='leadva'||p.status==='jovahagyas'){const n=validISO(p.leadvaAt)?diffDays(p.leadvaAt,todayISO()):null;   // a videók már leadva: nem az átadási határidőt mutatjuk
    const vs=p.videos||[],okN=vs.filter(v=>v.st==='jovahagyva').length;if(vs.length&&okN===vs.length)return {due,left:null,lead:0,cls:'ok',txt:'✅ '+appLabel(vs)+' jóváhagyva'};   // az ügyfél már mindent jóváhagyott
    if(n==null)return null;const cls=n>=14?'alarm':n>=7?'bad':'warn',w=n<=0?'Ma óta jóváhagyásra vár':`${n>=7?'🚨 ':''}${n} napja jóváhagyásra vár`;   // egy sorban, sárgán (7 nap után piros); a külön „Jóváhagyásra vár” állapotcímke ilyenkor elmarad
    return {due,left:null,lead:n,cls,txt:okN?`${w} · ${okN}/${vs.length} kész`:w};}
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
/* A helyszínen dolgozók száma: a vágó és az utómunka nélkül (aki helyszíni szerepben is szerepel, az számít) */
const POST_ROLE_RE=/vágó|utómunk|szerkeszt|grafik|színez|color|animá|motion design/i;
function siteCrewN(p){const ids=new Set();if(p.lead&&!p.leadRemote)ids.add(p.lead);(p.crew||[]).forEach(c=>{if(c.crewId&&!POST_ROLE_RE.test(c.role||''))ids.add(c.crewId);});return ids.size;}
function crewN(p){const ids=crewIds(p);if(p.leadRemote&&p.lead&&!(p.crew||[]).some(c=>c.crewId===p.lead))ids.delete(p.lead);return ids.size;}
function issueRow(i,exceptId){
  const links=i.pids.filter(id=>id!==exceptId).map(id=>{const p=projById(id);return p?`<button class="linkbtn" type="button" data-action="open-project" data-id="${esc(id)}">${esc(p.name||'Névtelen projekt')} →</button>`:'';}).join('');
  const one=i.pids.length===1&&links;   // egy projekt: első sor a projekt neve, alatta a figyelmeztetés
  const oneId=one?i.pids.find(id=>id!==exceptId):'';   // egy projekt: az egész doboz kattintható
  return `<div class="issue ${i.level}${oneId?' issue-click':''}"${oneId?` data-action="open-project" data-id="${esc(oneId)}" role="button" tabindex="0"`:''}><span class="ic" aria-hidden="true">!</span><div class="issue-t">${one?`<div class="issue-links issue-first">${links}</div><div>${esc(i.text)}</div>`:`<div>${esc(i.text)}</div>${links?`<div class="issue-links">${links}</div>`:''}`}</div></div>`;
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
const dealCrewId=d=>{const o=String(d.ownerId||'');if(o.indexOf('crew:')===0)return o.slice(5);if(d.ownerCrewId)return d.ownerCrewId;
  if(S.me&&S.me.id===o&&S.me.crewId)return S.me.crewId;   /* az ügyvezető saját eladása: az ő munkatárs-sora kapja a jutalékot */
  if((S.salesPeople||[]).some(x=>x.userId===o))return '';const nk=x=>fold(String(x||'')).replace(/\s+/g,' ').trim(),c=d.ownerName?(S.crew||[]).filter(x=>nk(x.name)===nk(d.ownerName)):[];return c.length===1?c[0].id:'';};   /* fiókhoz nem kötött munkatárs: név szerint */
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
  const add=(p,cid,amount,ded,isRef,lbl,pend)=>{const d=isRef?pr(p).start:payDate(p,cid),m=d.slice(0,7),net=num(amount)-ded;if(ded){const k=(kept[m]=kept[m]||{});k[cid]=(k[cid]||0)+ded;}const dS=pr(p).start.slice(0,7)===m?pr(p).start:d;/* ugyanabban a hónapban a projekt a forgatás napjánál marad, a vágás nem válik külön */const b=(by[m]=by[m]||{}),key=p.id,row=(b[key]=b[key]||{p,d:dS,cells:{},ded:{}});if(dS<row.d)row.d=dS;/* egy hónapon belül projektenként egy sor */if(pend==='yes'){(row.acc=row.acc||{})[cid]=1;pend='';}if(pend){row.pend=row.pend||{};row.pendSt=row.pendSt||{};row.pend[cid]=(row.pend[cid]||0)+net;row.pendSt[cid]=pend;return;}   /* el nem fogadott meghívás: látszik, de nem számít bele */row.cells[cid]=(row.cells[cid]||0)+net;if(lbl){const w=(row.why=row.why||{});(w[cid]=w[cid]||[]).push({l:lbl,a:num(amount)});}if(ded)row.ded[cid]=(row.ded[cid]||0)+ded;};
  S.projects.filter(p=>p.status!=='lemondva'&&pr(p)).forEach(p=>{
    if(crewMode){const pd=p.invPending||isTent(p);if(myId&&p.myFee&&num(p.myFee.amount))add(p,myId,p.myFee.amount,pd?0:penDeduct(p,myId,p.myFee.amount),false,why(p,myId,p.myFee,false),pd?(p.invPending?'invited':'tent'):'');return;}   /* a meg nem válaszolt meghívás díja ⏳-val látszik, de az összegbe nem számít bele */   // szakember: csak a saját díja
    (p.fees||[]).forEach(f=>{const ref=f.kind==='fixed'&&f.refCrewId,cid=ref?f.refCrewId:f.kind==='fixed'?'':f.crewId;if(!cid||!num(f.amount))return;   // az ajánlói jutalék is a szakembernek jár
      const inv=p.invites||{},iu=Object.keys(inv).length>0,ist=(inv[cid]||{}).st||'',ok=ref||p.lead===cid||ist==='yes'||(!ist&&!iu&&pr(p).end<todayISO());   // ugyanaz a szabály, mint a szakember nézetében
      add(p,cid,f.amount,ref?0:penDeduct(p,cid,f.amount),!!ref,why(p,cid,f,!!ref),ok&&!(isTent(p)&&!ref)?(ist==='yes'&&!ref?'yes':''):isTent(p)&&!ref&&ist!=='no'?'tent':(ist==='no'?'no':ist==='invited'?'invited':'none'));});});
  if(!crewMode)crewSalesComm().forEach(x=>add(x.p,x.cid,x.amt,0,true,'💼 Értékesítői jutalék'));   // projektenkénti értékesítői jutalék
  if(crewMode&&myId)((S.mySales||[]).length?S.mySales:(S.deals||[]).length?crewSalesComm().filter(x=>x.cid===myId).map(x=>({projectId:x.p.id,amount:x.amt})):[]).forEach(x=>{const p=projById(x.projectId)||{id:x.projectId,name:x.name,date:x.date,endDate:x.endDate,status:'tervezes',crew:[],fees:[]};if(pr(p))add(p,myId,x.amount,0,true,'💼 Értékesítői jutalék');});   // a szakember saját értékesítői jutalékai
  const months=Object.keys(by).concat([cur]).filter((v,i,a)=>a.indexOf(v)===i).sort().reverse();
  const sel=/^\d{4}-\d{2}$/.test(S.payMonth||'')?S.payMonth:(by[cur]?cur:months[0]||cur),rows=Object.values(by[sel]||{}).sort((a,b)=>a.d.localeCompare(b.d)||byStart(a.p,b.p));
  const spOn=(S.salesPeople||[]).filter(x=>!crewMode||x.crewId===myId).map(x=>({cid:x.crewId,p:salesPayOf(sel,x.crewId)})).filter(x=>x.p),sp=c=>{const x=spOn.find(y=>y.cid===c);return x?x.p.total:0;},spTotal=spOn.reduce((s,x)=>s+x.p.total,0);   // értékesítő: fix + jutalék
  const rentOn=OFFICE_RENT.map(r=>({c:(S.crew||[]).find(x=>x.name===r.name),amount:r.amount})).filter(r=>r.c&&(!crewMode||r.c.id===myId)),rent=c=>rentOn.filter(r=>r.c.id===c).reduce((s,r)=>s+r.amount,0);   // fix havi irodabérlet
  const keptM=kept[sel]||{},keptTotal=Object.values(keptM).reduce((s,x)=>s+x,0);
  const adjL=(S.payAdjust||[]).filter(x=>String(x.month)===sel&&num(x.amount)&&(!crewMode||x.crewId===myId)),adjsOf=c=>adjL.filter(x=>x.crewId===c),adj=c=>adjsOf(c).reduce((s,x)=>s+num(x.amount),0),adjTotal=adjL.reduce((s,x)=>s+num(x.amount),0);   // havi korrekció (+/−)
  const sellerC=new Set(spOn.map(x=>x.cid).concat(crewMode?[]:crewSalesComm().map(x=>x.cid)));
  const tot_=c=>rows.reduce((s,r)=>s+num(r.cells[c]),0)+rent(c)+adj(c)+sp(c),cids=crewMode?[myId]:[...new Set(rows.flatMap(r=>Object.keys(r.cells).concat(Object.keys(r.pend||{}))).concat(rentOn.map(r=>r.c.id),adjL.map(x=>x.crewId),spOn.map(x=>x.cid)))].sort((a,b)=>(sellerC.has(a)-sellerC.has(b))||tot_(b)-tot_(a)||((crewById(a)||{}).name||'').localeCompare((crewById(b)||{}).name||'','hu'));   // a havi összeg szerint csökkenő sorrend, az értékesítők a végén
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
    else if(on)main=adm&&f==='invoiced'?`<span class="pst-sent" role="button" tabindex="0" data-action="pay-st-undo" data-month="${sel}" data-cid="${esc(c)}" data-tip="${tip}&#10;Kattints a visszavonáshoz">✓ ${esc(dshort(st[f+'At']))}</span>`:`<span class="pst-sent"${tip?` data-tip="${tip}"`:''}>✓ ${esc(dshort(st[f+'At']))}</span>`;   // a kifizetés nem vonható vissza; a kézi „számla kiállítva” igen
    else if(adm){const lockInv=f==='invoiced'&&!sx,lock=lockInv||(f==='paid'&&!empC(c)&&!st.invoicedAt);   // számla csak kiküldött díjösszesítő után; kifizetés csak kiállított számla után (bérszámfejtettnél nincs számla)
      main=`<label class="pst-chk${lock?' locked':''}"${lock?` data-tip="${esc(nameOf(c)+(lockInv?': előbb küldd ki a díjösszesítőt':': előbb a számla kiállítása kell'))}"`:''}><input type="checkbox" data-pay-st="${f}" data-cid="${esc(c)}" data-month="${sel}"${lock?' disabled':''}> ${f==='paid'?'<span class="pst-word">kifizetve</span>':''}</label>`;}
    else main='<span class="muted">–</span>';
    if(on&&nav&&adm){   // a súgó helyett kattintható kis ablak: az adatok + a NAV-újralekérdezés és a párosítás törlése
      const mt=/ data-tip="([^"]*)"/.exec(main),txt=mt?mt[1]:'';main=main.replace(/ data-tip="[^"]*"/,'');
      const acts=refresh.replace('>🔄</button>','>🔄 Újralekérdezés a NAV-ból</button>').replace('>✕</button>','>✕ Téves párosítás törlése</button>');
      return `<td class="r pay-st"><div class="pst-line pst-hov">${main}<div class="pst-pop" role="tooltip"><div class="pst-pop-t">${txt}</div><div class="pst-pop-act">${acts}</div></div></div></td>`;}
    return `<td class="r pay-st"><div class="pst-line">${main}${refresh}</div>${on&&nav?'':badge}</td>`;};
  const stIds=f=>f==='paid'?cids:cids.filter(c=>!empC(c)),stCount=f=>stIds(f).filter(c=>f==='sent'?!!sentOf(c):!!stOf(c)[f+'At']).length;
  const statusRows=cids.length?[['sent','📧 Díjösszesítő'],['invoiced','🧾 A számla kiállítása'],['paid','Számla kifizetése']].map(([f,l],k)=>{const wait=c=>(f==='paid'&&!stOf(c).invoicedAt)||(f==='invoiced'&&!empC(c)&&!sentOf(c)),allW=f!=='sent'&&cids.every(wait);   /* amíg a díjösszesítő nincs kiküldve, a számla kiállítása is szürke */   // amíg a számla nincs kiállítva, a „Számla fizetve” sor szürke
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
  const retRow=cids.length?(cids.some(c=>prevB(c).bal>0)?`<tr class="pay-strow pay-ret pay-prev"><td>💼 Egyenleg <span class="muted" style="font-weight:500">(még fizetendő az előző hónapokból)</span></td>${cids.map(c=>balCell(c,prevB(c),'elmaradás az előző hónapokból')).join('')}${noSum?'':isAdmin()?`<td class="r"><b>${ftFmt(prevTot)}</b></td>`:'<td class="pay-blank"></td>'}</tr>`:'')
    +(cids.some(c=>retB[c].bal>0)?`<tr class="pay-strow pay-ret pay-alltot"><td>💰 Összesen <span class="muted" style="font-weight:500">(még fizetendő, ezzel a hónappal együtt)</span></td>${cids.map(c=>balCell(c,retB[c],'még kifizetendő összesen')).join('')}${noSum?'':isAdmin()?`<td class="r"><b>${ftFmt(retTot)}</b></td>`:'<td class="pay-blank"></td>'}</tr>`:''):'';
  const spRow=spOn.length?`<tr class="pay-sales"><td>💼 Értékesítés <span class="muted" style="font-weight:500">(fix fizetés + jutalék)</span></td>${cids.map(c=>{const x=spOn.find(y=>y.cid===c);if(!x)return '<td class="r"><span class="muted">–</span></td>';
    const tip=[x.p.salary?'Fix fizetés: '+ftFmt(x.p.salary):''].concat(x.p.items.map(d=>`${d.name}${d.invNo?' ('+d.invNo+')':''}: kifizetve ${fmtShort(d.paidAt)} · nettó ${ftFmt(d.paidNet)}${d.base!==d.paidNet?' · jutalékalap '+ftFmt(d.base):''}`).concat(x.p.comm?[`Jutalékalap ${ftFmt(x.p.base)} → jutalék ${ftFmt(x.p.comm)} (${commTierTxt(x.p.sp)})`]:[])).filter(Boolean).join('\n');
    return `<td class="r" data-tip="${esc(tip)}" tabindex="0">${ftCell(x.p.total)}</td>`;}).join('')}${noSum?'':`<td class="r"><b>${ftCell(spTotal)}</b></td>`}</tr>`:'';
  const rentRow=rentOn.length?`<tr><td>🏢 Irodabérleti és termelési vezetői díj</td>${cids.map(c=>`<td class="r">${rent(c)?ftCell(rent(c)):'<span class="muted">–</span>'}</td>`).join('')}${noSum?'':`<td class="r"><b>${ftCell(rentTotal)}</b></td>`}</tr>`:'';
  const cell=(r,c)=>{const d=r.ded[c],wl=r.why&&r.why[c]||[],jc=wl.map(x=>wl.length>1?x.l+': '+moneyFmt(x.a)+' Ft':x.l).join('\n'),why=esc([jc,d?`Díjcsökkentés: −${moneyFmt(d)} Ft\n`+penReasons(r.p,c):''].filter(Boolean).join('\n'));   // jogcím (szerep) + díjcsökkentés
    return `<td class="r${d?' pay-ded':''}"${why&&r.cells[c]!=null?` data-tip="${why}" tabindex="0"`:''}>${r.cells[c]!=null?(ftCell(r.cells[c])||0):r.pend&&r.pend[c]!=null?(st=>`<span class="pay-pend${st==='no'?' no':st==='invited'||st==='tent'?' inv':''}" data-tip="${st==='no'?'✗ Nem vállalta – nem számít bele':st==='tent'?'⏳ Előfoglalás – még megbeszélés alatt van, az összegbe nem számít bele':st==='invited'?(crewMode?'⏳ Még nem fogadtad el a meghívást – az elfogadás után számít bele az összegbe':'⏳ A meghívást még nem fogadta el – az összegekbe nem számít bele'):'⏳ Még nincs meghívva – az összegekbe nem számít bele'}">${st==='no'?'':st==='invited'||st==='tent'?'⏳ ':'○ '}${ftCell(r.pend[c])}</span>`)(r.pendSt[c]):'<span class="muted">–</span>'}${d?`<small class="pay-ded-note">🚨 −${ftCell(d)}</small>`:''}</td>`;};
  const colW=`<colgroup><col class="pay-c-proj">${cids.map(()=>'<col class="pay-c-person">').join('')}${noSum?'':'<col class="pay-c-sum">'}</colgroup>`;
  return `<div class="page-head pay-head${crewMode?' pay-head-c':''}"><div class="grow"><div class="ph-ttl"><h2>${isAdmin()?'Fizetések':'Kifizetések'}</h2>${crewMode?'<p class="sub">Nettó fizetésed tételesen</p>':''}</div>${crewMode?'':monthNav('pay-month',months,sel)}</div>
      ${isAdmin()&&!crewMode?`<button class="btn outline small" type="button" data-action="nav-sync" data-month="${sel}" data-tip="A bejövő számlák lekérdezése a NAV Online Számla rendszeréből, és párosítás a kiküldött díjösszesítőkhöz (a munkatárs adószáma alapján). Naponta reggel magától is lefut.">🔄 <span class="mlg">Mindenki számlája a NAV-ból</span><span class="msm">NAV</span></button><button class="btn outline small" type="button" data-action="pay-mail" data-month="${sel}">📧 <span class="mlg">Díjösszesítők kiküldése</span><span class="msm">Díjösszesítő</span></button>`:''}</div>
    ${crewMode?`<div class="pay-cbox">${monthNav('pay-month',months,sel)}`:''}${sel<PAY_START?`<div class="panel pay-nodata"><p style="margin:0;font-size:15px">🗂️ <b>Erről a hónapról nincs adat az appban.</b></p><p class="hint" style="margin:6px 0 0">A termelői fizetéseket a projekttervező 2026 októberétől követi – a korábbi hónapok elszámolása az app előtti nyilvántartásban van.</p></div>`:rows.length||rentOn.length||adjL.length||spOn.length?`<div class="sheet-wrap pay-wrap${crewMode?' pay-center':''}"><table class="sheet pay-sheet">${colW}<thead><tr><th>Projekt neve</th>${cids.map(c=>`<th class="r" title="${esc(nameOf(c))}">${!crewMode&&crewById(c)?`<button type="button" class="th-link" data-action="edit-crew" data-id="${esc(c)}" title="${esc(nameOf(c))} – profil megnyitása">${esc(shortName(nameOf(c)))}</button>`:esc(shortName(nameOf(c)))}</th>`).join('')}${noSum?'':'<th class="r">Projekt összesen</th>'}</tr></thead>
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
  let list=ro()?S.projects.filter(p=>!p.invPending):S.projects;   /* függő meghívás: a Meghívások dobozban van */   /* az állapotszűrő sor kikerült (Ervin kérése, 2026-11-09): minden projekt látszik */
  if(ro()&&S.me&&(S.me.crewId||(S.me.viewAs&&S.me.viewAs.crewId))){const me=(S.me.viewAs&&S.me.viewAs.crewId)||S.me.crewId,T0=todayISO();   /* szakember: csak az aktív beosztások – jövőbeli, most zajló, vagy vágás / jóváhagyás alatt, ha ő a vágó */
    list=list.filter(p=>{if(p.status==='lemondva')return false;const r=pr(p);if(!r||(r.end||r.start)>=T0)return true;
      const cut=crewPostWork(p,me)||(p.videos||[]).some(v=>vidOwner(p,v)===me);
      return cut&&p.status!=='atadva'&&['utomunka','jovahagyas','leadva'].includes(p.status||'')&&(p.videos||[]).filter(v=>vidOwner(p,v)===me).some(v=>v.st!=='jovahagyva');});}
  if(q)list=list.filter(p=>fold([p.name,p.client,p.venue,p.eventType,p.contactName].join(' ')).includes(fold(q)));
  const closed=p=>p.status==='atadva'||p.status==='lemondva';
  const ahead=list.filter(p=>!closed(p)&&(!pr(p)||pr(p).end>=T)).sort((a,b)=>!pr(a)?1:!pr(b)?-1:byStart(b,a));   // terepi munkára vár (dátum nélküliek a végén)
  const past=list.filter(p=>!closed(p)&&pr(p)&&pr(p).end<T).sort((a,b)=>byStart(b,a));   // lezajlott, utómunkára vár
  const done=list.filter(closed).sort((a,b)=>!pr(a)?1:!pr(b)?-1:byStart(b,a));   // lezárt: hónaponként
  const issues=ro()?[]:computeIssues();
  const badP=new Set(issues.filter(i=>i.level==='bad').flatMap(i=>i.pids||[]));   // piros figyelmeztetésű projektek: a listában is pirosan
  const row=p=>{const r=pr(p),di=dueInfo(p),sub=(ro()?[p.venue]:[p.client,p.venue]).filter(Boolean).join(' · ')||(ro()?'':'Nincs ügyfél megadva'),days=r&&r.end!==r.start?` · ${diffDays(r.start,r.end)+1} napos`:'';
    const nCrew=crewN(p),nSite=siteCrewN(p),sz=nSite>=6?3:nSite>=3?2:1,crewChip=nSite?`<span class="pt-crew sz${sz}" title="${nSite} fő a helyszínen (vágó és utómunka nélkül)">👥 ${nSite}</span>`:'';
    const tm=p.startTime&&/^\d{1,2}:\d{2}$/.test(p.startTime)?`<span class="pt-time">🕘 ${esc(p.startTime)}${p.endTime&&/^\d{1,2}:\d{2}$/.test(p.endTime)?'–'+esc(p.endTime):''}</span>`:'';   // a projekt nagysága: minél több szakember, annál feltűnőbb
    const endT=String((r&&r.end>r.start&&p.lastEndTime)||p.endTime||''),overToday=!!r&&r.end===T&&(['utomunka','leadva','jovahagyas','atadva','lemondva'].includes(p.status)||(/^\d{2}:\d{2}$/.test(endT)&&endT<=new Date().toTimeString().slice(0,5)));   // ma volt, de már véget ért
    const when=!r?'':overToday?'past':r.start<=T&&r.end>=T?'now':r.start>T?'fut':'past',rel=!r?'':when==='now'?'<span class="pt-rel now">● MA</span>':when==='fut'?`<span class="pt-rel fut">${diffDays(T,r.start)===1?'holnap':diffDays(T,r.start)+' nap múlva'}</span>`:`<span class="pt-rel past">${diffDays(r.end,T)===0?'ma, véget ért':diffDays(r.end,T)===1?'tegnap':diffDays(r.end,T)+' napja'}</span>`;
    const due=di&&r&&(r.end<T||POST_STAGES.includes(p.status))?`<span class="statuspill p-${di.cls}">${di.txt}</span>`:'';
    const cutP=ro()&&crewCuts(p,(S.me.viewAs&&S.me.viewAs.crewId)||S.me.crewId)&&cutLeft(p)?`<span class="statuspill p-${cutLeft(p).cls}">✂️ ${esc(cutLeft(p).txt)}</span>`:'';
    const extra=ro()?cutP+(myRole(p)?`<span class="smallnum">${esc(myRole(p))}</span>`:'')+(()=>{const st=p.status||'tervezes',m={leadva:'⏳ Elfogadásra vár',jovahagyas:'⏳ Elfogadásra vár',atadva:'✓ Kész',lemondva:'Lemondva',utomunka:'✂️ Utómunka'}[st]||stageLabel(p,st);return `<span class="pt-mystat st-${esc(st)}">${esc(m)}</span>`;})()
      :`<span class="smallnum">${nCrew} fő · ${eqCount(p)} eszköz</span>`;
    const dim=crewDim(p);
    const stCell=()=>`<td class="pt-status"><div class="pt-pills">${ro()&&crewCuts(p,(S.me.viewAs&&S.me.viewAs.crewId)||S.me.crewId)&&cutLeft(p)?`<span class="statuspill p-${cutLeft(p).cls}">✂️ ${esc(cutLeft(p).txt)}</span>`:''}${ro()&&when==='past'?'':statusPill(p)+crewFinalWarn(p)+(()=>{const pi=prepIssues(p);return pi?`<span class="statuspill ${pi.left<=14?'p-bad':'p-warn'}" data-tip="${esc('Még nincs kész:\n• '+pi.items.join('\n• '))}">⏰ ${pi.items.length} teendő</span>`:'';})()+due+((p.videos||[]).length?'':vidLink(p,'statuspill p-info pt-video','▶ Leadott videó'+(p.deliveryPass?' 🔒':''),` data-action="ext-link" title="${esc(p.deliveryLink)}"`)||'')+vidStList(p)}${budgetMissing(p)?`<span class="statuspill p-bad" data-tip="Hiányzik: ${esc(budgetMissing(p))}">💰 ${esc(budgetMissing(p))} hiányzik</span>`:''}</div></td>`;
    return `<tr class="pt-row pt-st-${esc(p.status||'tervezes')} pt-${when||'nodate'} pt-sz${sz}${badP.has(p.id)?' pt-bad':''}${p.status==='lemondva'?' pt-cancel':''}${isTent(p)?' pt-tent':''}${dim?' pt-dim':''}" data-action="open-project" data-id="${esc(p.id)}" tabindex="0"><td class="pt-proj"><div class="pt-flex">${calBlock(r&&r.start)}<span class="ev-main"><span class="ev-title">${esc(p.name||'Névtelen projekt')}${isTent(p)?'<span class="tent-pill" data-tip="Még megbeszélés alatt van – kérlek, tartsd szabadon a napot">⏳ Előfoglalás</span>':''}${p.status==='atadva'&&!(ro()&&when==='past')?DONE_CHECK:''}${ro()&&when==='past'?'':crewChip}${rel}${when==='past'?'':tm}</span><span class="ev-sub">${esc(sub)}${days}</span></span></div></td>
      ${ro()?'':stCell()}${ro()?`<td class="pt-extra">${extra}</td>`:''}</tr>`;};
  const cols=2;
  const grp=(t,arr,cls)=>arr.length?`<tr class="pt-group${cls?' '+cls:''}"><td colspan="${cols}">${t} <span class="muted">${arr.length}</span></td></tr>${arr.map(row).join('')}`:'';
  const months=[];done.forEach(p=>{const m=pr(p)?pr(p).start.slice(0,7):'';let g=months.find(x=>x.m===m);if(!g)months.push(g={m,arr:[]});g.arr.push(p);});
  // egyetlen lista dátum szerint csökkenő sorrendben; a jelölő sor a mai (és még tartó) projektek alatt, a jövő / mai / lezajlott sorok eltérő jelöléssel
  const closedOpen=(()=>{try{return localStorage.getItem('lpm_closed_open')==='1';}catch(e){return false;}})(),hideClosed=!q&&!ro();   // lezárt (kész / lemondott) projektek: külön, lenyitható csoportban
  const all=list.filter(p=>!(hideClosed&&closed(p))).sort((a,b)=>!pr(a)?-1:!pr(b)?1:byStart(b,a));
  let marked=false;const todayRow=`<tr class="pt-today-row"><td colspan="${cols}"><span><b>📍 Ma · ${esc(fmtDay(T))} · <span class="pt-clock">${nowHM()}</span></b></span></td></tr>`;
  let lastM=null;const monthRow=m=>`<tr class="pt-month pt-month-sep"><td colspan="${cols}">${m?esc(F_YM.format(toDate(m+'-01'))):'Dátum nélkül'}</td></tr>`;   // hónap-elválasztó
  // a mai projektek piros keretben, a keret tetején a „MA · …” jelölővel
  const isTd=p=>{const r=pr(p);return !!r&&r.start<=T&&r.end>=T;};
  const body=all.map((p,i)=>{const r=pr(p),m=r?r.start.slice(0,7):'';let h='';if(m!==lastM){h+=monthRow(m);lastM=m;}
    if(isTd(p)){const first=!(i>0&&isTd(all[i-1])&&!h),last=!(all[i+1]&&isTd(all[i+1])&&(pr(all[i+1]).start.slice(0,7)===m));marked=true;
      return h+row(p).replace('class="pt-row ','class="pt-row pt-tf'+(first?' pt-tf-first':'')+(last?' pt-tf-last':'')+' ');}
    if(!marked&&r&&(r.end||r.start)<T){marked=true;h=(h&&h.indexOf('pt-month-sep')>=0&&m===T.slice(0,7)?h+todayRow:todayRow+h);}return h+row(p);}).join('')+(marked?'':todayRow)
    +(hideClosed&&done.length?`<tr class="pt-closed-h"><td colspan="${cols}"><button type="button" class="pt-closed-tog" data-action="pt-closed-tog" aria-expanded="${closedOpen}"><span class="pt-closed-car">${closedOpen?'▾':'▸'}</span> Lezárt projektek <span class="muted">${done.length}</span></button></td></tr>${closedOpen?(()=>{let lm=null;return done.map(p=>{const m=pr(p)?pr(p).start.slice(0,7):'';const h=m!==lm?monthRow(m):'';lm=m;return h+row(p);}).join('');})():''}`:'');
  (window.POST_RENDER=window.POST_RENDER||[]).push(()=>{ptFrames();requestAnimationFrame(ptFrames);});
  const qIn=`<input class="inp search pt-q" id="q-projects" type="search" placeholder="Keresés név, ügyfél, helyszín szerint" value="${esc(f.q)}" aria-label="Projektek keresése">`;   // a keresőmező a táblázat „Projekt” fejlécében
  return `<div class="page-head${ro()?' ph-inline':''}"><div class="grow"><h2>${ro()?'Beosztásaim':'Projektek'}</h2></div>
      ${ro()?`<input class="inp search head-search" id="q-projects" type="search" placeholder="Keresés…" value="${esc(f.q)}" aria-label="Projektek keresése">`:'<button class="btn primary w" type="button" data-action="new-project">+ Új projekt</button>'}</div>
    ${invitesBox()}
    ${ro()&&!S.me.crewId?`<div class="banner"><p>A felhasználód még nincs összekapcsolva a stáblistával, ezért nem látod a beosztásaidat. Szólj az ügyvezetőnek.</p></div>`:''}
    ${ro()||!issues.length?'':`<div class="panel issues-panel"><h3>⚠️ Figyelmeztetések <span class="aside">${issues.length} db</span></h3><div class="issues">${issues.map(i=>issueRow(i)).join('')}</div></div>`}
    ${isAdmin()?pendingPenPanel()+pendingBudgetPanel():''}
    ${ro()||body?'':`<div class="toolbar">${qIn}</div>`}
    ${body?`<div class="sheet-wrap proj-wrap"><table class="sheet proj-table"><thead><tr><th>${ro()?'Projekt':`<div class="pt-th"><span>Projekt</span>${qIn}</div>`}</th>${ro()?'<th>Szereped</th>':'<th>Státusz</th>'}</tr></thead><tbody>${body}</tbody></table></div>`
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
const FOTO_DEF=200,FOTO_STEP=10,FOTO_MAX=1000;
const fotoDb=p=>num(p.foto_db);   // fotók utómunkája (db) – a helyszíni fotózás külön pipa a Terepi feladatoknál
function fotoRow(p){const n=fotoDb(p);
  return `<div class="dl${n?' on':''}"><div><div class="dl-name">Fotók utómunkája</div>${n?`<div class="dl-price">${n} db fotó</div>`:''}</div>
    <div class="stepper"><button type="button" data-action="foto-step" data-d="-1" aria-label="Fotók utómunkája: kevesebb"${n<=0||ro()?' disabled':''}>−</button><input class="step-in" type="text" inputmode="numeric" pattern="[0-9]*" data-step-k="foto_db" data-min="0" data-max="${FOTO_MAX}" aria-label="Fotók száma" value="${n}"${D()}><button type="button" data-action="foto-step" data-d="1" aria-label="Fotózás: több"${n>=FOTO_MAX||ro()?' disabled':''}>+</button></div></div>`;}

/* Saját meghívások: az ügyvezető és termelési vezető a már elfogadott / elutasított
   meghívóit is látja. A projektadatokból történő ellenőrzés a gyorsítótáras indulást is lefedi. */
function ownInvitationRows(){
  const server=Array.isArray(S.myInvites)?S.myInvites:[];
  if(ro()||!S.me)return server;
  const people=S.crew||[],norm=v=>String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
  let cid=String(S.me.crewId||'');
  if(!people.some(c=>c.id===cid)){
    const mail=String(S.me.email||'').trim().toLowerCase();
    const sameMail=mail?people.filter(c=>String(c.email||'').trim().toLowerCase()===mail):[];
    if(sameMail.length===1)cid=sameMail[0].id;
    else{const name=norm(S.me.name),sameName=name?people.filter(c=>norm(c.name)===name):[];cid=sameName.length===1?sameName[0].id:'';}
  }
  const rows=new Map(server.map(x=>[x.id,x])),today=todayISO();
  if(cid)(S.projects||[]).forEach(p=>{
    const iv=p.invites&&p.invites[cid];
    if(!iv||(!((p.lead===cid)||(p.crew||[]).some(a=>a.crewId===cid))))return;
    if(iv.st!=='invited'&&(['atadva','lemondva'].includes(p.status)||(p.endDate||p.date||'9999-12-31')<today))return;
    const post=isPostOnly(p,cid);
    rows.set(p.id,{id:p.id,name:p.name,date:p.date,endDate:post?'':p.endDate,startTime:post?'':p.startTime,endTime:post?'':p.endTime,
      venue:post?'':p.venue,eventType:p.eventType,post,roles:[p.lead===cid?'Projektvezető':''].concat((p.crew||[]).filter(a=>a.crewId===cid).map(a=>a.role)).filter(Boolean),
      at:iv.at||'',st:iv.st||'invited'});
  });
  return [...rows.values()].sort((a,b)=>(a.st==='invited'?-1:0)-(b.st==='invited'?-1:0)||String(b.at||'').localeCompare(String(a.at||'')));
}
function invitesBox(){const L=ownInvitationRows().filter(x=>(x.st||'invited')==='invited');if(!L.length)return '';   // csak a még megválaszolatlan meghívások (elfogadás / elutasítás után eltűnik)
  const one=L.length===1&&projById(L[0].id)?L[0]:null;   // egy meghívásnál az egész doboz kattintható
  return `<div class="panel inv-panel${one?' inv-click':''}"${one?` data-action="open-project" data-id="${esc(one.id)}" role="button" tabindex="0"`:''}><h3><span class="inv-bell">🔔</span> ${ro()?'Meghívások':'Saját meghívásaim'} <span class="inv-cnt">${L.filter(x=>(x.st||'invited')==='invited').length||L.length}</span><small class="inv-sub">${L.some(x=>(x.st||'invited')==='invited')?'Válaszod vár – elfogadod vagy nem vállalod?':''}</small></h3>${L.map(x=>{const st=x.st||'invited';
    return `<div class="inv-row${projById(x.id)?' inv-click':''}"${projById(x.id)?` data-action="open-project" data-id="${esc(x.id)}" role="button" tabindex="0" title="Megnyitás"`:''}><div class="inv-tx"><b>${esc(x.name)}</b>${(q=>q&&isTent(q))(projById(x.id))?'<span class="tent-pill">⏳ Előzetes foglalás – még megbeszélés alatt van</span>':''}<small>${esc(fmtDay(x.date))}${x.endDate&&x.endDate!==x.date?' – '+esc(fmtDay(x.endDate)):''}${x.startTime?' · '+esc(x.startTime)+(x.endTime?'–'+x.endTime:''):''}${x.venue?' · '+esc(x.venue):''}</small>${(x.roles||[]).length?`<span class="inv-roles">${x.roles.map(r=>`<span class="statuspill p-info">${esc(r)}</span>`).join('')}</span>`:''}</div><div class="inv-btns">${projById(x.id)?`<button type="button" class="btn ghost small" data-action="open-project" data-id="${esc(x.id)}">Megnézem</button>`:''}${st==='invited'?`<button type="button" class="btn primary small" data-action="inv-answer" data-id="${esc(x.id)}" data-a="yes">✓ Elfogadom</button><button type="button" class="btn outline small" data-action="inv-answer" data-id="${esc(x.id)}" data-a="no">Nem vállalom</button>`:`<span class="inv-st ${st==='yes'?'yes':'no'}">${st==='yes'?'✓ Elfogadta':'✗ Nem vállalja'}</span>`}</div></div>`;}).join('')}</div>`;}

/* Fizetések tábla: a munkatársak oszlopai olyan szélesek, mint a bennük lévő legszélesebb összeg (a „… Ft” cellák alapján) */
function payFit(){const VIEW=document.getElementById('view');if(!VIEW)return;VIEW.querySelectorAll('table.pay-sheet').forEach(t=>{const cols=t.querySelectorAll('col.pay-c-person');if(!cols.length)return;
  const n=cols.length,rg=document.createRange();let mx=0;
  t.querySelectorAll('tr').forEach(tr=>{const cs=tr.children;for(let i=1;i<=n&&i<cs.length;i++){const td=cs[i];if(td.colSpan>1)break;const tx=(td.textContent||'').trim();if(!/\d[\d\s\u00a0]*\s?Ft$/.test(tx))continue;
      const tcs=getComputedStyle(td),w=payTextW(td,rg)+parseFloat(tcs.paddingLeft)+parseFloat(tcs.paddingRight)+parseFloat(tcs.borderLeftWidth||0)+parseFloat(tcs.borderRightWidth||0);if(w>mx)mx=w;}});   /* a cella saját betűje és belső margója szerint (az összesítő sor nagyobb, vastagabb) */
  if(!mx)return;const w=Math.ceil(mx+4)+'px';
  cols.forEach(c=>c.style.setProperty('width',w,'important'));t.classList.add('pay-fit');
  /* rögzített elrendezés csak megadott táblaszélességgel működik: az oszlopok összege (különben a hosszú projektnév kitolja az oszlopot) */
  const pw=matchMedia('(max-width:700px)').matches?134:307,sw=t.querySelector('col.pay-c-sum')?112:0;   /* a CSS-ben megadott szélességek (pay-c-proj / pay-c-sum) */
  t.style.setProperty('width',(pw+sw+n*parseInt(w,10))+'px','important');});}
window.addEventListener('resize',()=>{try{payFit();}catch(e){}});   /* forgatáskor újraszámol */

/* Telefon (álló és fekvő), Fizetések tábla: a tábla feletti rész (altabok, hónapváltó…) a tábla görgető felületébe kerül, a tábla
   fölé – így lefelé görgetve előbb az gördül ki natívan (lendülettel, akadás nélkül), és utána görget a tábla; a nevek sora fent
   marad. A menüsáv a görgetéssel együtt csúszik ki (csak eltolás, nincs újrarendezés). */
function payDock(){const mq=matchMedia('(max-width:700px),(orientation:landscape) and (max-height:560px)'),VIEW=document.getElementById('view'),tb=document.querySelector('.topbar');
  const w=VIEW&&VIEW.querySelector('.pay-wrap,.tl-wrap'),t=w&&w.querySelector(':scope>table,:scope>.tl');   /* Fizetések tábla vagy a naptár idővonala */
  if(!w||!t||!mq.matches){document.body.classList.remove('pay-dock');if(tb){tb.style.transform='';tb.style.transition='';}return;}
  const chain=[];for(let n=w;n&&n!==VIEW;n=n.parentElement)chain.unshift(n);
  const before=[],after=[];chain.forEach(n=>{let p=n.parentElement.firstElementChild;while(p&&p!==n){before.push(p);p=p.nextElementSibling;}});
  for(let i=chain.length-1;i>=0;i--){let x=chain[i].nextElementSibling;while(x){after.push(x);x=x.nextElementSibling;}}
  const hd=document.createElement('div');hd.className='pay-hd';hd.innerHTML='<div class="pay-hd-sp"></div>';before.forEach(x=>hd.appendChild(x));w.insertBefore(hd,t);
  if(after.length){const ft=document.createElement('div');ft.className='pay-ft';after.forEach(x=>ft.appendChild(x));w.appendChild(ft);}
  w.classList.add('dock-wrap');document.body.classList.add('pay-dock');payDockFit();}
function payDockFit(){const w=document.querySelector('body.pay-dock #view .dock-wrap');if(!w)return;const cw=w.clientWidth+'px';w.querySelectorAll(':scope>.pay-hd,:scope>.pay-ft').forEach(x=>{x.style.width=cw;});
  const tb=document.querySelector('.topbar');if(tb){const sp=w.querySelector('.pay-hd-sp');if(sp)sp.style.height=tb.offsetHeight+'px';document.documentElement.style.setProperty('--pay-st',(parseFloat(getComputedStyle(tb).paddingTop)||0)+'px');}}
{let pdMq=null;try{pdMq=matchMedia('(max-width:700px),(orientation:landscape) and (max-height:560px)');}catch(e){}
  if(pdMq&&pdMq.addEventListener)pdMq.addEventListener('change',()=>{try{if(document.querySelector('#view .pay-wrap,#view .tl-wrap'))render(true);}catch(e){}});
  window.addEventListener('resize',()=>{try{payDockFit();}catch(e){}});}

/* a cella szövegének tényleges szélessége (soronként a szövegdarabok összege) – blokkos elem esetén sem a cella szélessége számít */
function payTextW(td,rg){const lines={};const tw=document.createTreeWalker(td,NodeFilter.SHOW_TEXT);let n;
  while((n=tw.nextNode())){if(!n.nodeValue.trim())continue;rg.selectNodeContents(n);for(const r of rg.getClientRects()){if(!r.width)continue;const k=Math.round((r.top+r.bottom)/12);const L=lines[k]||(lines[k]={l:r.left,r:r.right});L.l=Math.min(L.l,r.left);L.r=Math.max(L.r,r.right);}}
  let mx=0;Object.values(lines).forEach(L=>{mx=Math.max(mx,L.r-L.l);});return mx;}
