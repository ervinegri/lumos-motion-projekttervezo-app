'use strict';
/* Szakember hozzáadása: kereshető, csoportosított lista (név + szerepek), a natív legördülő helyett */
if(window.MutationObserver){let acT=0;new MutationObserver(()=>{if(acT)return;acT=requestAnimationFrame(()=>{acT=0;const el=$('add-crew-person');if(el&&!el._cmb)comboSelect(el,'Kezdj el gépelni a nevet…',id=>{const c=crewById(id);return c?(c.roles||[]).join(', '):'';});});}).observe(document.documentElement,{childList:true,subtree:true});}
/* A véglegesített csapat módosult: pár másodperc szünet után felugrik az újra-véglegesítő ablak (ki milyen levelet kap) */
function cfAutoPrompt(p){if(!p||ro())return;const sig=JSON.stringify(crewFinalDiff(p));if(sig===S._cfAutoSig)return;S._cfAutoSig=sig;clearTimeout(S._cfAutoT);
  S._cfAutoT=setTimeout(()=>{const d=S.draft;if(!d||d.id!==p.id||!(S.crewEdit||{})[d.id]||crewFinalState(d)!=='changed'||postTasks(d).some(t=>!taskOwners(d,t.k).length)||$('modalRoot').innerHTML||document.activeElement&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;crewFinalizeModal();},4000);}

/* Projekt összesítő: munkatárs hozzárendelése egy munkához → automatikusan bekerül a stábba a szereppel; utómunkánál a vágó kiosztása */
document.addEventListener('change',e=>{const t=e.target,d=S.draft;if(!d||ro()||projLocked())return;
  if(t.dataset&&t.dataset.osRole!==undefined){const id=t.value,role=t.dataset.osRole;if(!id)return;const c=crewById(id),crew=clone(d.crew||[]);
    if(crew.some(a=>a.crewId===id&&a.role===role)){toast('Már be van osztva ebben a szerepben.',true);render(true);return;}
    crew.push({crewId:id,role});setDraft({crew});toast((c?c.name:'')+' beosztva: '+role+' – megjelent a Stáb és eszközöknél');return;}
  if(t.dataset&&t.dataset.osCut){const k=t.dataset.osCut,id=t.value,crew=clone(d.crew||[]),et=etWithField(d);Object.keys(et).forEach(x=>{et[x]=et[x].filter(y=>y!==k);});
    if(id){const fo=k==='foto_db';if(!crew.some(a=>a.crewId===id&&a.role===(fo?'Fotós':'Vágó')))crew.push({crewId:id,role:fo?'Fotós':'Vágó'});et[id]=(et[id]||[]).concat([k]);}   // fotók utómunkája: a fotós fotósként marad
    const y0=scrollY;setDraft({crew,editTasks:et});requestAnimationFrame(()=>scrollTo(0,y0));
    const c=crewById(id);if(id)toast((c?c.name:'')+(k==='foto_db'?' készíti – ':' vágja – ')+(postTasks(d).find(x=>x.k===k)||{}).label);}});

/* Ajánlói jutalék: projektopció – ki kap ajánlói jutalékot (külön sor az Egyéb költségek között) */
document.addEventListener('change',e=>{const t=e.target,d=S.draft;if(!d||!canSeeFees())return;
  if(t.dataset&&t.dataset.refToggle!==undefined){if(t.checked){(S.refOn=S.refOn||{})[d.id]=true;render(true);setTimeout(()=>{const s=$('ref-add');const i=s&&s.parentNode.querySelector('.cmb-in');if(i)i.focus();},80);}
    else{const n=(d.fees||[]).filter(f=>f.kind==='fixed'&&f.key==='ref').length;const off=()=>{if(S.refOn)delete S.refOn[d.id];setDraft({fees:(d.fees||[]).filter(f=>!(f.kind==='fixed'&&f.key==='ref'))});};
      if(n)confirmModal('Ajánlói jutalék törlése',`${n} ajánlói jutalék sor kikerül a díjtáblázatból. Biztosan?`,'Törlés',async()=>off());else off();render(true);}return;}
  if(t.id==='ref-add'&&t.value){const id=t.value,c=crewById(id);if((d.fees||[]).some(f=>f.kind==='fixed'&&f.key==='ref'&&f.refCrewId===id)){toast('Neki már van ajánlói jutalék sora.',true);return;}
    {const F=(d.fees||[]).slice(),row={kind:'fixed',key:'ref',refCrewId:id,name:(c?c.name:'Szakember')+' ajánlói jutaléka',amount:'',rent:''},j=F.findIndex(f=>f.kind==='fixed'&&/^egyeb/.test(f.key||''));if(j>=0)F.splice(j,0,row);else F.push(row);setDraft({fees:F});}   /* az „Egyéb tétel” sor marad az utolsó */toast((c?c.name:'')+' ajánlói jutaléka bekerült az Egyéb költségek közé – add meg az összeget');}});
ACT['ref-del']=b=>{const d=S.draft;if(!d)return;setDraft({fees:(d.fees||[]).filter(f=>!(f.kind==='fixed'&&f.key==='ref'&&f.refCrewId===b.dataset.id))});};

document.addEventListener('change',e=>{if(e.target.id!=='lead-pick'||!S.draft||!e.target.value)return;const c=crewById(e.target.value);setDraft({lead:e.target.value});toast((c?c.name:'')+' lett a projektvezető');});

/* editTasks összeállítása: a vágók mostani (akár kimondatlan) utómunkái + a terepi kiosztások (f_ kulcsok) megmaradnak */
function etWithField(d){const et0=editTasksOf(d),et={};Object.keys(et0).forEach(id=>{const f=(et0[id]||[]).filter(k=>/^f_/.test(k));if(f.length)et[id]=f.slice();});
  cutterIds(d).forEach(id=>{et[id]=(et[id]||[]).concat(taskKeysOf(d,id));});return et;}
/* Terepi feladat kiosztása az összesítőben: a munkatárs a szereppel a stábba is bekerül; újra kiválasztva lekerül a feladatról */
document.addEventListener('change',e=>{const t=e.target,d=S.draft;if(!t.dataset||t.dataset.osField===undefined||!d||ro()||projLocked())return;const k=t.dataset.osField,role=t.dataset.role,id=t.value;if(!id)return;
  const et=etWithField(d),crew=clone(d.crew||[]),c=crewById(id),has=(et[id]||[]).includes('f_'+k);
  if(has){et[id]=et[id].filter(x=>x!=='f_'+k);if(!et[id].length)delete et[id];toast((c?c.name:'')+' lekerült erről a feladatról');}
  else{et[id]=(et[id]||[]).concat(['f_'+k]);if(role&&!crew.some(a=>a.crewId===id&&a.role===role))crew.push({crewId:id,role});toast((c?c.name:'')+' beosztva: '+(t.dataset.label||role));}
  const y0=scrollY;setDraft({crew,editTasks:et});requestAnimationFrame(()=>scrollTo(0,y0));});

/* Stábkártya: a kártya bármely üres részére kattintva is megnyílik a szerkesztés (nem csak a ceruzával) */
document.addEventListener('click',e=>{const card=e.target.closest('.crew-card[data-crew-card]');if(!card||ro()||e.defaultPrevented)return;
  if(e.target.closest('button,a,input,select,textarea,label,[data-action]'))return;if(String(window.getSelection&&window.getSelection())!=='')return;   // gomb / másolás / link / kijelölés marad
  const b=card.querySelector('[data-action="edit-crew"]');if(b)b.click();});

/* „Vágó a helyszínen” ↔ a vágó kártyáján a „Helyszíni vágó”: egymást kapcsolják. Bekapcsoláskor a már beosztott vágó kapja a helyszíni feladatot
   (ha még senki), kikapcsoláskor lekerül róla. Véglegesített (zárolt) csapatnál a beosztáshoz nem nyúlunk. */
function onsiteCutCh(d,on){const ch={editOnsite:on};if(crewLocked(d))return ch;
  const et=etWithField(d),K='f_x_vago',owners=Object.keys(et).filter(id=>(et[id]||[]).includes(K));
  if(on){if(owners.length)return ch;const cut=[...new Set((d.crew||[]).filter(a=>a.role==='Vágó').map(a=>a.crewId))][0];if(!cut)return ch;
    et[cut]=(et[cut]||[]).concat([K]);ch.editTasks=et;const c=crewById(cut);setTimeout(()=>toast((c?c.name:'A vágó')+' beosztva: Vágó a helyszínen'),0);}
  else if(owners.length){owners.forEach(id=>{et[id]=et[id].filter(x=>x!==K);if(!et[id].length)delete et[id];});ch.editTasks=et;}
  return ch;}

/* Szolgáltatások: zárolt csapatnál a beosztás gombjára kattintva feloldás (indoklással), majd a választó azonnal lenyílik */
ACT['svc-unlock']=b=>{const d=S.draft;if(!d)return;const [t,k]=String(b.dataset.pick||'').split(':'),sel=t==='f'?`select[data-os-field="${k}"]`:`select[data-os-cut="${k}"]`;
  ACT['crew-edit']();let n=0;const iv=setInterval(()=>{n++;if(n>600||!S.draft||S.draft.id!==d.id){clearInterval(iv);return;}if(!(S.crewEdit||{})[d.id])return;clearInterval(iv);
    setTimeout(()=>{const s=document.querySelector(sel);if(!s)return;const i=s.parentNode.querySelector('.cmb-in')||s;i.scrollIntoView({block:'center'});i.focus();},80);},100);};

/* Előadásrögzítés termenként: terem hozzáadása / törlése / átnevezése, kamerák ki-be és darabszám */
function roomsEdit(fn){const d=S.draft;if(!d||ro()||projLocked())return;const first=!Array.isArray(d.recRooms),rooms=clone(recRoomsOf(d));if(fn(rooms)===false)return;const ch=roomsPatch(rooms);
  if(first){const et=etWithField(d);let mv=false;Object.keys(et).forEach(id=>{et[id]=et[id].map(k=>{const m=/^f_(er_total|er_close|er_crowd|er_slides)$/.exec(k);if(m&&rooms[0]){mv=true;return 'f_'+rooms[0].id+'_op';}return k;});et[id]=[...new Set(et[id])];});if(mv)ch.editTasks=et;}   // régi beosztás az első teremhez
  const y0=scrollY;setDraft(ch);requestAnimationFrame(()=>scrollTo(0,y0));}
const roomId=rooms=>{let id;do{id='r'+Math.random().toString(36).slice(2,8);}while(rooms.some(r=>r.id===id));return id;};
ACT['room-add']=()=>{roomsEdit(rooms=>{const id=roomId(rooms);(S._roomKeep=S._roomKeep||{})[id]=1;rooms.push({id,name:'',er_total:0,er_close:0,er_crowd:0,er_slides:0});});
  setTimeout(()=>{const L=document.querySelectorAll('.room-name');const x=L[L.length-1];if(x)x.focus();},60);};
ACT['room-del']=b=>{const d=S.draft;if(!d)return;const rooms=recRoomsOf(d),i=rooms.findIndex(r=>r.id===b.dataset.r);if(i<0)return;const r=rooms[i];
  const go=()=>roomsEdit(R=>{R.splice(R.findIndex(x=>x.id===r.id),1);const d2=S.draft,et=etWithField(d2);let ch=false;Object.keys(et).forEach(id=>{const n=et[id].filter(k=>k.indexOf('f_'+r.id+'_')!==0);if(n.length!==et[id].length){ch=true;et[id]=n;if(!n.length)delete et[id];}});if(ch)S.draft.editTasks=et;});
  if(roomCams(r).length)confirmModal('Helyszín törlése',`Törlöd: <b>${esc(roomName(r,i))}</b>? A kamerái és a beosztott operatőrei is lekerülnek róla.`,'Igen, törlöm',async()=>go());else go();};
ACT['room-eq-add']=b=>roomsEdit(rooms=>{const r=rooms.find(x=>x.id===b.dataset.r),k=b.dataset.k;if(!r)return false;const eq=roomEq(r,k);if(eq.length>=(ROOM_CNT[k]||1))return false;eq.push('');r[k]=eq.length;r[k+'_eq']=eq;});
ACT['room-eq-del']=b=>{const rid=b.dataset.r,k=b.dataset.k,i=Number(b.dataset.i),d=S.draft;
  if(k==='er_close'&&d){const r0=recRoomsOf(d).find(x=>x.id===rid),n=r0?roomEq(r0,k).length:0;if(n>1){const et=etWithField(d);   // a levett közeli kamera operatőre lekerül, a későbbiek egy hellyel feljebb lépnek
    Object.keys(et).forEach(id=>{et[id]=et[id].map(x=>{const m=new RegExp('^f_'+rid+'_er_close_(\\d+)$').exec(x);if(!m)return x;const j=Number(m[1])-1;return j===i?'':j>i?'f_'+rid+'_er_close_'+j:x;}).filter(Boolean);if(!et[id].length)delete et[id];});setDraft({editTasks:et});}}
  roomsEdit(rooms=>{const r=rooms.find(x=>x.id===rid);if(!r)return false;const eq=roomEq(r,k),l=roomLens(r,k);if(eq.length<2)return false;eq.splice(i,1);l.splice(i,1);r[k]=eq.length;r[k+'_eq']=eq;r[k+'_lens']=l;});};
ACT['room-step']=b=>roomsEdit(rooms=>{const r=rooms.find(x=>x.id===b.dataset.r),k=b.dataset.k;if(!r)return false;r[k]=Math.max(1,Math.min(ROOM_CNT[k]||1,num(r[k])+Number(b.dataset.d)));});
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset)return;
  if(t.dataset.roomCam){const k=t.dataset.k,rid=t.dataset.roomCam,on=t.checked;roomsEdit(rooms=>{const r=rooms.find(x=>x.id===rid);if(!r)return false;r[k]=on?1:0;});
    if(!on){const d=S.draft,et=etWithField(d),key='f_'+rid+'_'+k;let ch=false;Object.keys(et).forEach(id=>{if(et[id].includes(key)){ch=true;et[id]=et[id].filter(x=>x!==key);if(!et[id].length)delete et[id];}});if(ch)setDraft({editTasks:et});}return;}
  if(t.dataset.roomLens){const rid=t.dataset.roomLens,k=t.dataset.k,i=Number(t.dataset.i),id=t.value;roomsEdit(rooms=>{const r=rooms.find(x=>x.id===rid);if(!r)return false;const l=roomLens(r,k);l[i]=id;r[k+'_lens']=l;});
    const d=S.draft;if(id&&d&&!(d.equipment||[]).some(e=>e.itemId===id&&(e.crewId||'')===camOwner(d,rid,k,i))){const op=camOwner(d,rid,k,i);S._noTick=1;try{setDraft({equipment:(d.equipment||[]).concat([{itemId:id,qty:1,crewId:op}])});}finally{S._noTick=0;}const it=itemById(id);toast((it?it.name:'Az objektív')+' bekerült a projekt eszközei közé.');}
    return;}
  if(t.dataset.roomEq){const rid=t.dataset.roomEq,k=t.dataset.k,i=Number(t.dataset.i),id=t.value;roomsEdit(rooms=>{const r=rooms.find(x=>x.id===rid);if(!r)return false;const eq=roomEq(r,k);eq[i]=id;r[k+'_eq']=eq;});
    const d=S.draft;if(id&&d&&!(d.equipment||[]).some(e=>e.itemId===id&&(e.crewId||'')===camOwner(d,rid,k,i))){const op=camOwner(d,rid,k,i);S._noTick=1;try{setDraft({equipment:(d.equipment||[]).concat([{itemId:id,qty:1,crewId:op}])});}finally{S._noTick=0;}const it=itemById(id);toast((it?it.name:'A kamera')+' bekerült a projekt eszközei közé'+(op?' – '+((crewById(op)||{}).name||'')+' viszi':'')+'.');}   // a kiválasztott kamera az eszközlistára is felkerül
    return;}
  if(t.dataset.roomIn){const rid=t.dataset.roomIn,k=t.dataset.k;let n=parseInt(String(t.value).replace(/\D/g,''),10);roomsEdit(rooms=>{const r=rooms.find(x=>x.id===rid);if(!r)return false;r[k]=Math.max(1,Math.min(ROOM_CNT[k]||1,isFinite(n)?n:1));});return;}
  if(t.dataset.roomName){const rid=t.dataset.roomName,v=String(t.value||'').trim().slice(0,60);roomsEdit(rooms=>{const r=rooms.find(x=>x.id===rid);if(!r||r.name===v)return false;r.name=v;});}});

/* Szolgáltatások: egy választó = egy ember (annyi választó, ahány ember kell). A fotós kiválasztásakor a fotók utómunkáját is ő kapja (ha még senki). */
document.addEventListener('change',e=>{const t=e.target,d=S.draft;if(!t.dataset||t.dataset.osSlot===undefined||!d||ro()||projLocked())return;
  const k=t.dataset.osSlot,i=Number(t.dataset.i)||0,role=opRoleFor(t.dataset.osSlot,t.dataset.role),id=t.value,cur=slotOwners(d,k)[i]||'';if(id===cur)return;
  const et=etWithField(d),crew=clone(d.crew||[]),K='f_'+k,KS=slotKeys(d,k);
  if(cur){et[cur]=(et[cur]||[]).filter(x=>!KS.includes(x));if(!et[cur].length)delete et[cur];}
  if(id){et[id]=(et[id]||[]).concat([K]);if(role&&!crew.some(a=>a.crewId===id&&a.role===role)){const gi=role!=='Operatőr'&&OP_SUB.includes(role)?crew.findIndex(a=>a.crewId===id&&a.role==='Operatőr'):-1;if(gi>=0)crew[gi]={crewId:id,role};else crew.push({crewId:id,role});}}   /* a sima „Operatőr” szerep a konkrét típusra cserélődik */
  let extra='';
  const ex=editTasksOf(d);if(k==='x_foto'&&id&&num(d.foto_db)>0&&!Object.keys(ex).some(x=>x!==id&&(ex[x]||[]).includes('foto_db'))&&!(et[id]||[]).includes('foto_db')){   // fotós → a fotók utómunkája is az övé
    Object.keys(et).forEach(x=>{et[x]=et[x].filter(y=>y!=='foto_db');if(!et[x].length)delete et[x];});et[id]=(et[id]||[]).concat(['foto_db']);extra=' + fotók utómunkája';}
  const ch={crew,editTasks:et};if(k==='x_vago'){const any=Object.keys(et).some(x=>(et[x]||[]).includes(K));ch.editOnsite=any;}   /* helyszíni vágó jelölő a kártyán is */
  const c=crewById(id||cur),y0=scrollY;setDraft(ch);requestAnimationFrame(()=>scrollTo(0,y0));
  toast(id?(c?c.name:'')+' beosztva: '+(t.dataset.label||role)+extra:(c?c.name:'')+' lekerült erről a feladatról');});

/* Extrák: egy „＋ Hozzáadás…” menüből (extra, kedvezmény, továbbszámlázott költség, ajánlói jutalék) */
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||t.dataset.exMenu===undefined)return;const v=t.value;t.value='';if(!v||!S.draft)return;
  if(v==='ref'){(S.refOn=S.refOn||{})[S.draft.id]=true;render(true);setTimeout(()=>{const s=$('ref-add');const i=s&&s.parentNode.querySelector('.cmb-in');if(i)i.focus();},80);return;}
  if(v==='sales'){(S.salesOn=S.salesOn||{})[S.draft.id]=true;render(true);setTimeout(()=>{const s=$('sales-sel');const i=s&&s.parentNode.querySelector('.cmb-in');if(i)i.focus();},80);return;}
  if(v==='free'){setDraft({projectValue:0});toast('🎁 Nem fizetős projekt');return;}
  if(v==='org'){if(ACT['org-add'])ACT['org-add']();setTimeout(()=>{const s=$('org-sel');const i=s&&s.parentNode.querySelector('.cmb-in');if(i)i.focus();},80);return;}
  ACT['extra-add']({dataset:v==='le'?{le:'1'}:v==='tov'?{tov:'1'}:{}});});
/* A fejléc magassága (a ragadós projektcímhez), és árnyék, amikor a cím fent ragad */
(()=>{const setH=()=>{const t=document.querySelector('.topbar'),v=$('viewBanner');if(!t)return;const th=t.offsetHeight,vh=v&&!v.classList.contains('hidden')?v.offsetHeight:0;   // a sárga „nézet” sáv is fent marad: a ragadós elemek alatta kezdődnek
    document.documentElement.style.setProperty('--tbh0',th+'px');document.documentElement.style.setProperty('--tbh',(th+vh)+'px');};
  window.addEventListener('resize',setH);setTimeout(setH,0);setInterval(setH,3000);
  try{const ro=new ResizeObserver(setH);const t=document.querySelector('.topbar'),v=$('viewBanner');if(t)ro.observe(t);if(v){ro.observe(v);new MutationObserver(setH).observe(v,{attributes:true,attributeFilter:['class']});}}catch(e){}
  /* görgetéskor a projekt neve fent marad: vékony sáv a fejléc alatt, amikor a cím kicsúszik a képből */
  const bar=()=>{let b=$('ptbar');if(!b){b=document.createElement('div');b.id='ptbar';b.className='ptbar';b.innerHTML='<div class="ptbar-in"><b></b><span></span></div>';b.querySelector('b').onclick=()=>scrollTo({top:0,behavior:'smooth'});document.body.appendChild(b);}return b;};
  const upd=()=>{const d=document.querySelector('.dtitle');const b=$('ptbar');if(!d||ro()){   // szakember nézetben nincs ragadós címsáv: a cím a többi tartalommal görgetődik
if(b)b.classList.remove('on');return;}const top=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tbh'))||58,on=d.getBoundingClientRect().bottom<top;
    const x=bar();if(on){const h=d.querySelector('h2'),sub=d.querySelector('.sub');const t=h?h.childNodes[0].textContent.trim():'',st=sub?sub.textContent.trim():'';if(x._t!==t+st){x._t=t+st;x.querySelector('b').textContent=t;x.querySelector('span').textContent=st;}}x.classList.toggle('on',on);};
  window.addEventListener('scroll',upd,{passive:true});setInterval(upd,1500);})();

document.addEventListener('change',e=>{if(e.target&&e.target.id==='org-sel'&&e.target.value==='__new'&&S.draft&&isAdmin()){e.stopImmediatePropagation();e.target.value='';   // új szervező: felvétel az Ügyfelek közé, majd kiválasztjuk
  const before=new Set((S.clients||[]).map(c=>c.id)),pid=S.draft.id;newClientModal(null,null,true);let n=0;const iv=setInterval(()=>{n++;const nc=(S.clients||[]).find(c=>!before.has(c.id));
    if(nc&&S.draft&&S.draft.id===pid){clearInterval(iv);setDraft({extras:(S.draft.extras||[]).map(x=>x.kind==='org'?Object.assign({},x,{clientId:nc.id,name:nc.name}):x)});toast('Szervező: '+nc.name);}
    else if(n>600||(n>10&&!$('mform')))clearInterval(iv);},200);}},true);
document.addEventListener('change',e=>{if(e.target&&e.target.id==='org-sel'&&S.draft&&isAdmin()){const c=(S.clients||[]).find(x=>x.id===e.target.value);S.draft.extras=(S.draft.extras||[]).map(x=>x.kind==='org'?Object.assign({},x,{clientId:c?c.id:'',name:c?c.name:''}):x);setDraft({extras:S.draft.extras});}});
document.addEventListener('change',async e=>{const t=e.target;if(!t||!t.dataset||(t.dataset.vidSt===undefined&&t.dataset.vidEd===undefined))return;
  const pid=S.projectId||(S.draft&&S.draft.id),id=t.dataset.vidSt!==undefined?t.dataset.vidSt:t.dataset.vidEd;if(!pid||!id)return;
  if(t.dataset.vidSt!==undefined&&t.value==='ellen'){const p0=projById(pid),v0=p0&&(p0.videos||[]).find(x=>x.id===id);if(v0)t.value=v0.st;reviewModal(pid,id);return;}   // belső ellenőrzés: kinek, link, megjegyzés
  const a={projectId:pid,id};if(t.dataset.vidSt!==undefined)a.st=t.value;else a.editor=t.value;
  try{const r=await call('videoSet',a);const pr2=r&&r.project;if(pr2){const k=S.projects.findIndex(x=>x.id===pid);if(k>=0)S.projects[k]=normProj(pr2);   // a szerkesztés alatt lévő űrlapot nem írjuk felül: csak a videók és a lépés frissül
      [S.draft,S.draftBase].forEach(d=>{if(d&&d.id===pid){['videos','status','leadvaAt','stepsDone','updatedAt','updatedBy'].forEach(f=>{d[f]=pr2[f];});}});}
    render(true);toast('Videó frissítve');}catch(err){handleErr(err);render(true);}});
document.addEventListener('change',e=>{if(e.target&&e.target.id==='cal-cutter'){S.cal.cutter=e.target.value==='__all'?'':e.target.value;render(true);}});

document.addEventListener('change',e=>{if(e.target&&e.target.id==='m-category'){const f=$('m-fmtF');if(f)f.hidden=!/^(Kamera|Objektív)/i.test(e.target.value);}});

/* Visszaállítás a kiküldött (véglegesített) állapotra: szerepek, eszközök, munkanapok úgy, ahogy a munkatársak megkapták */
ACT['crew-revert']=()=>{const d=S.draft,f=d&&d.crewFinal;if(!d||ro()||!f||!f.sigs||!Array.isArray(f.ids))return;
  confirmModal('Visszaállítás a kiküldött állapotra','A stáb szerepei és munkanapjai visszaállnak arra, amit a munkatársak a véglegesítéskor megkaptak (az eszközök maradnak – azokat az eszközlistával küldöd). Az azóta felvett szakemberek lekerülnek. (Mentés előtt még visszavonható.)','Visszaállítás',()=>{
    const crew=[],eq=[],days={};let lead='';
    f.ids.forEach(id=>{const s=crewSigParse(f.sigs[id]);s.roles.forEach(r=>{if(r==='Projektvezető')lead=id;else crew.push({crewId:id,role:r});});if(s.days.length)days[id]=s.days;});
    closeModal();setDraft({lead:lead||d.lead,crew,crewDays:Object.keys(days).length?days:d.crewDays});toast('Visszaállítva a kiküldött állapotra – mentsd el.');});};   // az eszközök maradnak (azokat az eszközlista kezeli); a lekerült tagok eszközei gazdátlanok lesznek
/* Lépések húzással: az aktuális lépés kártyáját a következő (vagy egy későbbi) lépésre húzva halad a projekt */
(()=>{let from=null;
  document.addEventListener('dragstart',e=>{const c=e.target.closest&&e.target.closest('.stage.stage-drag');if(!c)return;from=c.dataset.v;c.classList.add('dragging');try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','stage:'+from);}catch(_){}});
  document.addEventListener('dragend',()=>{from=null;document.querySelectorAll('.stage.dragging,.stage.drop-hi').forEach(x=>x.classList.remove('dragging','drop-hi'));});
  document.addEventListener('dragover',e=>{if(!from)return;const t=e.target.closest&&e.target.closest('.stage.stage-target');document.querySelectorAll('.stage.drop-hi').forEach(x=>{if(x!==t)x.classList.remove('drop-hi');});if(!t)return;e.preventDefault();t.classList.add('drop-hi');});
  document.addEventListener('drop',e=>{if(!from)return;const t=e.target.closest&&e.target.closest('.stage.stage-target');const cur=from;from=null;document.querySelectorAll('.stage.dragging,.stage.drop-hi').forEach(x=>x.classList.remove('dragging','drop-hi'));if(!t)return;e.preventDefault();
    if(ro()){if(t.dataset.v==='jovahagyas'&&cur==='utomunka')cutDeliverModal();return;}   // vágó: a leadás ablaka (link + értesítés)
    const d=S.draft;if(!d||ro())return;const ids=[...document.querySelectorAll('.stages .stage[data-v]')].map(x=>x.dataset.v),ci=ids.indexOf(cur),ti=ids.indexOf(t.dataset.v);if(ti<=ci)return;
    const done=new Set(String(d.stepsDone||'').split(',').filter(Boolean)),TK=['tervezes','helyszin','utomunka','jovahagyas'];
    if(ti===ci+1&&TK.includes(cur)&&!done.has(cur))ACT['step-done']({dataset:{v:cur}});   // a következő lépésre: mintha kipipálnád (a beszámoló, nyersanyag-levél stb. ugyanúgy feljön)
    else ACT.stage({dataset:{v:t.dataset.v}});});})();

/* Eszköz áthúzása egyik munkatárs kártyájáról a másikra (vagy a közös eszközökhöz) */
(()=>{let from=null;const clr=()=>document.querySelectorAll('.pcrew.eq-drop-hi').forEach(x=>x.classList.remove('eq-drop-hi'));
  document.addEventListener('dragstart',e=>{const r=e.target.closest&&e.target.closest('.eqrow[data-eq-drag]');if(!r||ro()||!S.draft)return;from=Number(r.dataset.eqDrag);r.classList.add('dragging');try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','eq:'+from);}catch(_){}});
  document.addEventListener('dragend',()=>{document.querySelectorAll('.eqrow.dragging').forEach(x=>x.classList.remove('dragging'));clr();from=null;});
  const tgt=e=>{if(from==null)return null;const c=e.target.closest&&e.target.closest('.pcrew[data-eq-drop]');if(!c)return null;const eq=(S.draft.equipment||[])[from];if(!eq||(eq.crewId||'')===c.dataset.eqDrop)return null;return c;};
  document.addEventListener('dragover',e=>{const c=tgt(e);if(!c)return;e.preventDefault();try{e.dataTransfer.dropEffect='move';}catch(_){}if(!c.classList.contains('eq-drop-hi')){clr();c.classList.add('eq-drop-hi');}});
  document.addEventListener('drop',e=>{const c=tgt(e);clr();if(!c)return;e.preventDefault();const d=S.draft;if(!d||ro()||projLocked()||eqLocked(d))return;
    const to=c.dataset.eqDrop,equipment=clone(d.equipment||[]),src=equipment[from];if(!src)return;from=null;
    const j=equipment.findIndex((x,k)=>x.itemId===src.itemId&&(x.crewId||'')===to);
    if(j>=0){equipment[j].qty=num(equipment[j].qty)+num(src.qty);equipment.splice(equipment.indexOf(src),1);}else src.crewId=to;
    setDraft({equipment});const it=itemById(src.itemId),who=to?(crewById(to)||{}).name:'a közös eszközökhöz';if(typeof toast==='function')toast(`${it?it.name:'Eszköz'} → ${who}`);});
})();

/* Több választós legördülő: gépeléssel szűr, és ahol engedett (data-add), Enterrel új elemet is fel lehet venni */
(()=>{const lbls=w=>[...w.querySelectorAll('.msel-pop label')];
  const filt=(w,q)=>{const fq=fold(q.trim());lbls(w).forEach(l=>{l.hidden=!!fq&&!fold(l.textContent).includes(fq);});const ad=w.querySelector('.msel-add');if(!ad)return;
    const exact=lbls(w).some(l=>fold(l.textContent.trim())===fq);if(w.dataset.add&&fq&&!exact){ad.hidden=false;ad.innerHTML=`<button type="button" class="msel-addbtn">＋ „${esc(q.trim())}” hozzáadása</button>`;}else{ad.hidden=true;ad.innerHTML='';}};
  const addNew=(w,q)=>{const v=q.trim();if(!v)return;const nm=w.dataset.msel,ex=lbls(w).find(l=>fold(l.textContent.trim())===fold(v));
    if(ex){const cb=ex.querySelector('input');if(!cb.checked){cb.checked=true;cb.dispatchEvent(new Event('change',{bubbles:true}));}}
    else{const l=document.createElement('label');l.innerHTML=`<input type="checkbox" name="${esc(nm)}" value="${esc(v)}" checked>${esc(v)}`;w.querySelector('.msel-pop').appendChild(l);l.querySelector('input').dispatchEvent(new Event('change',{bubbles:true}));}
    const qi=w.querySelector('.msel-q');qi.value='';filt(w,'');qi.focus();};
  document.addEventListener('input',e=>{if(!e.target.classList||!e.target.classList.contains('msel-q'))return;filt(e.target.closest('.msel'),e.target.value);});
  document.addEventListener('keydown',e=>{if(!e.target.classList||!e.target.classList.contains('msel-q'))return;const w=e.target.closest('.msel');
    if(e.key==='Enter'){e.preventDefault();e.stopPropagation();const vis=lbls(w).filter(l=>!l.hidden);if(w.dataset.add)addNew(w,e.target.value);else if(vis.length===1){const cb=vis[0].querySelector('input');cb.checked=!cb.checked;cb.dispatchEvent(new Event('change',{bubbles:true}));e.target.value='';filt(w,'');}}
    else if(e.key==='Escape'){const pop=w.querySelector('.msel-pop');pop.hidden=true;w.classList.remove('open');}},true);
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.msel-addbtn');if(!b)return;e.preventDefault();const w=b.closest('.msel');addNew(w,w.querySelector('.msel-q').value);});
})();

/* „Feltöltve a NAS-ra”: ha van vágó, akinek kell, jön az értesítő; különben csak kipipálja */
ACT['raw-upload']=()=>{const d=S.draft;if(!d)return;if(rawEditors(d).length)rawMailModal(()=>{if(typeof saveNow==='function')saveNow();});else{setDraft({rawSentAt:todayISO()});toast('Nyersanyag a NAS-on – kipipálva');if(typeof saveNow==='function')saveNow();}};
ACT['nas-copy']=b=>{const v=b.dataset.v||'';try{navigator.clipboard.writeText(v);toast('Mappanév kimásolva: '+v);}catch(e){toast(v);}};
/* Munkatársi szerződés feltöltése: kiválasztás vagy behúzás után azonnal (több fájl is mehet egyszerre) */
// a megnevezés a fájlnévből: ismert iratok (szerződések, egyéni vállalkozói igazolás, kamarai igazolás…), egyébként a fájlnév maga
const cdocTitle=n=>{n=String(n||'');const b=n.replace(/\.[a-z0-9]{2,5}$/i,'');
  return /m[oó]dos[ií]t/i.test(b)?'Szerződésmódosítás':/mell[eé]klet/i.test(b)?'Szerződés melléklet':/keret/i.test(b)?'Keretszerződés':/megb[ií]z/i.test(b)?'Megbízási szerződés':/v[aá]llalkoz[aá]si/i.test(b)?'Vállalkozási szerződés':
    /(^|[^a-z])(evb|evny|uevb)([^a-z]|$)|egy[eé]ni.?v[aá]llalkoz/i.test(b)?'Egyéni vállalkozói igazolás':/kamar/i.test(b)?'Kamarai igazolás':/szerz/i.test(b)?'Szerződés':
    /nda|titoktart/i.test(b)?'Titoktartási nyilatkozat':(b.replace(/[_]+/g,' ').replace(/\s+/g,' ').trim()||'Dokumentum');};
async function crewDocUpload(cid,files){files=[...(files||[])].filter(Boolean);if(!files.length)return;const zone=document.querySelector('.cdoc-drop'),fn=$('cdoc-fn');
  const big=files.find(f=>f.size>10*1024*1024);if(big){toast(big.name+': a fájl legfeljebb 10 MB lehet.',true);return;}
  if(zone)zone.classList.add('busy');let ok=0;
  try{for(const f of files){if(fn)fn.textContent='⏳ Feltöltés: '+f.name+(files.length>1?` (${ok+1}/${files.length})`:'')+'…';
      const tt=($('cdoc-title')||{}).value||'';const r=await call('crewDocSave',{crewId:cid,title:(files.length===1&&tt.trim())||cdocTitle(f.name),signedAt:($('cdoc-date')||{}).value||'',b64:await readB64(f),name:f.name,mime:f.type||'application/octet-stream'});
      S.crewDocs=r.crewDocs||S.crewDocs;ok++;}
    const c=crewById(cid),sec=$('cdoc');if(sec&&c)sec.outerHTML=crewDocSection(c);render(true);toast(ok>1?ok+' szerződés feltöltve':'Szerződés feltöltve');}
  catch(e){handleErr(e);if(fn)fn.textContent=ok?ok+' fájl feltöltve, a többi nem sikerült.':'A feltöltés nem sikerült – próbáld újra.';const c=crewById(cid);if(ok&&c){const sec=$('cdoc');if(sec)sec.outerHTML=crewDocSection(c);render(true);}}
  finally{const z=document.querySelector('.cdoc-drop');if(z)z.classList.remove('busy');}}
document.addEventListener('change',e=>{if(e.target&&e.target.id==='cdoc-file'){const fs=e.target.files;crewDocUpload(e.target.dataset.id,fs);}});
['dragenter','dragover'].forEach(ev=>document.addEventListener(ev,e=>{const z=e.target.closest&&e.target.closest('#mform')&&document.querySelector('.cdoc-drop');if(!z||!e.dataTransfer||![...e.dataTransfer.types].includes('Files'))return;e.preventDefault();e.dataTransfer.dropEffect='copy';z.classList.add('over');}));
document.addEventListener('dragleave',e=>{const z=document.querySelector('.cdoc-drop');if(z&&(!e.relatedTarget||!e.relatedTarget.closest||!e.relatedTarget.closest('#mform')))z.classList.remove('over');});
document.addEventListener('drop',e=>{const z=document.querySelector('.cdoc-drop');if(!z||!e.target.closest||!e.target.closest('#mform')||!e.dataTransfer||!e.dataTransfer.files.length)return;e.preventDefault();z.classList.remove('over');crewDocUpload(z.dataset.id,e.dataTransfer.files);});

ACT['cl-open-proj']=b=>{closeModal();openProject(b.dataset.id);};

/* Szervezői jutalék kikapcsolása a fejléc jelölőjével (ugyanúgy, mint az ajánlói jutaléknál) */
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||t.dataset.orgToggle===undefined||t.checked)return;ACT['extra-del']({dataset:{i:t.dataset.orgToggle}});});

ACT['free-off']=()=>{if(!S.draft||!isAdmin())return;setDraft({projectValue:null});setTimeout(()=>{const e=$('f-projectValue');if(e)e.focus();},50);};

/* Értékesítői jutalék: az értékesítő kiválasztása / levétele (az Értékesítés fül szerződött lehetősége) */
function commPendApply(){const P=S._commPend||{};Object.keys(P).forEach(pid=>{const d=(S.deals||[]).find(x=>x.projectId===pid&&x.stage==='nyert');if(d)d.commManual=P[pid];});}   /* a még mentés alatt álló jutalék % ne vesszen el egy közben érkező válasz miatt */
async function projSalesSet(ownerId){const p=S.draft||projById(S.projectId);if(!p)return;
  {const d=typeof projDeal==='function'?projDeal(p):null,sp=(S.salesPeople||[]).find(x=>x.userId===ownerId)||{},nm=sp.name||(((S.crew||[]).find(c=>'crew:'+c.id===ownerId))||{}).name||'';   // azonnal látszik, a szerver a háttérben ment
    if(d&&ownerId){d.ownerId=ownerId;d.ownerName=nm;render(true);}toast(ownerId?'Értékesítő: '+nm:'Értékesítői jutalék levéve');}
  try{const r=await call('projSales',{projectId:p.id,ownerId:ownerId||''});if(r.deals){S.deals=r.deals;commPendApply();}if(r.salesPeople)S.salesPeople=r.salesPeople;if(!ownerId&&S.salesOn)delete S.salesOn[p.id];render(true);}catch(e){handleErr(e);render(true);}}
document.addEventListener('change',e=>{const t=e.target;if(!t)return;
  if(t.id==='sales-sel'&&isAdmin()){projSalesSet(t.value);return;}
  if(t.dataset&&t.dataset.salesToggle!==undefined&&!t.checked&&isAdmin()){const p=S.draft||projById(S.projectId);if(p&&projDeal(p))projSalesSet('');else{if(S.salesOn&&p)delete S.salesOn[p.id];render(true);}}});

/* Értékesítői jutalék kézzel: % vagy Ft (a beírt Ft pontosan megmarad); üres = az értékesítő sávos szabálya. Gépelés közben a másik mező azonnal frissül. */
document.addEventListener('input',e=>{const t=e.target;if(!t.dataset||(t.dataset.salesPct===undefined&&t.dataset.salesFt===undefined))return;const p=S.draft||projById(S.projectId);if(!p)return;const b=salesBase(p);
  if(t.dataset.salesPct!==undefined){const n=parseFloat(String(t.value).replace(/[^\d,.]/g,'').replace(',','.')),o=$('f-salesFt');if(o)o.value=isFinite(n)?moneyFmt(Math.round(b*n/100)):'';}
  else{const ft=Number(String(t.value).replace(/\D/g,'')),o=$('f-salesPct');if(o)o.value=b>0&&String(t.value).trim()?String(Math.round(ft/b*10000)/100).replace('.',','):'';}});
document.addEventListener('change',async e=>{const t=e.target;if(!t.dataset||(t.dataset.salesPct===undefined&&t.dataset.salesFt===undefined)||!isAdmin())return;const p=S.draft||projById(S.projectId);if(!p)return;
  let val='';const raw=String(t.value||'').trim();
  if(raw!==''){if(t.dataset.salesPct!==undefined){const n=parseFloat(raw.replace(/[^\d,.]/g,'').replace(',','.'));if(!isFinite(n)){toast('Érvénytelen érték.',true);return;}val=String(Math.round(n*100)/100);}else val='ft:'+Number(raw.replace(/\D/g,''));}
  const d=projDeal(p);if(d)d.commManual=val;   // azonnal (a mentés a háttérben)
  S._commPend=S._commPend||{};S._commPend[p.id]=val;const tk=S._commTk=(S._commTk||0)+1;
  try{const r=await call('projSalesComm',{projectId:p.id,pct:val});if(tk===S._commTk)delete S._commPend[p.id];if(r.deals){S.deals=r.deals;commPendApply();}if(r.salesPeople)S.salesPeople=r.salesPeople;render(true);toast(val===''?'Értékesítői jutalék: az értékesítő szabálya szerint':'Értékesítői jutalék mentve');}catch(err){handleErr(err);render(true);}});
