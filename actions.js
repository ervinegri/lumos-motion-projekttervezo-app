'use strict';
/* ===== Ablakok ===== */
let modalSubmit=null;
function openModal(title,body,{submit,submitLabel='Mentés',left='',cancelLabel='Mégse'}={}){
  modalSubmit=submit||null;
  $('modalRoot').innerHTML=`<div class="modal" data-action="modal-bg"><form class="mbox" id="mform" role="dialog" aria-modal="true" aria-label="${esc(title)}" novalidate>
    <div class="mhead"><h3>${esc(title)}</h3><button type="button" class="x" data-action="modal-close" aria-label="Bezárás">×</button></div>
    ${body}
    <div class="mfoot">${left?`<span class="left">${left}</span>`:''}<button type="button" class="btn outline" data-action="modal-close">${esc(cancelLabel)}</button>${submit?`<button type="submit" class="btn primary">${esc(submitLabel)}</button>`:''}</div></form></div>`;
  document.documentElement.style.overflow='hidden';
  const first=$('modalRoot').querySelector('input:not([type=checkbox]):not([type=radio]),textarea,select');if(first)first.focus();
}
function closeModal(){$('modalRoot').innerHTML='';modalSubmit=null;document.documentElement.style.overflow='';}
function confirmModal(title,text,okLabel,onOk){openModal(title,`<p style="margin:0">${esc(text)}</p>`,{submitLabel:okLabel,submit:async()=>{closeModal();await onOk();}});}
const mf=(name,label,o={})=>`<div class="field${o.full?' full':''}"><label for="m-${name}">${label}</label><input class="inp" id="m-${name}" name="${name}" type="${o.type||'text'}" value="${esc(o.v??'')}"${o.ph?` placeholder="${esc(o.ph)}"`:''}${o.min!=null?` min="${o.min}"`:''}${o.im?` inputmode="${o.im}"`:''}${o.max?` maxlength="${o.max}"`:''}></div>`;
const ms=(name,label,opts,v,o={})=>`<div class="field${o.full?' full':''}"><label for="m-${name}">${label}</label><select class="inp" id="m-${name}" name="${name}">${o.empty!=null?`<option value="">${o.empty}</option>`:''}${opts.map(x=>{const [val,lab]=Array.isArray(x)?x:[x,x];return `<option value="${esc(val)}"${val===v?' selected':''}>${esc(lab)}</option>`;}).join('')}</select></div>`;
/* Forintmező: csak számjegy, ezres tagolás, ± gomb 1000 Ft-onként */
const MONEY_MAX=9999000,MONEY_STEP=1000;
const moneyFmt=n=>n==null||n===''?'':String(Math.round(+n)).replace(/\B(?=(\d{3})+(?!\d))/g,'\u00a0');   // mindig ezres tagolás (2 000 is)
const moneyVal=s=>{const d=String(s||'').replace(/\D/g,'');return d===''?'':Math.min(MONEY_MAX,Number(d));};
const moneyField=(name,label,v,o={})=>`<div class="field"><label for="m-${name}">${label}</label><div class="money">${o.steps===false?'':`<button type="button" class="money-btn" data-action="money-step" data-for="m-${name}" data-d="-1" aria-label="${label}: −1000 Ft">−</button>`}<input class="inp money-inp" id="m-${name}" name="${name}" type="text" inputmode="numeric" autocomplete="off" placeholder="${esc(o.ph||'pl. 40 000')}" value="${esc(moneyFmt(v))}" data-money="1"><span class="money-unit">Ft</span>${o.steps===false?'':`<button type="button" class="money-btn" data-action="money-step" data-for="m-${name}" data-d="1" aria-label="${label}: +1000 Ft">+</button>`}</div></div>`;
/* a Beállítások naplója a felhasználók mentése után frissül */
function refreshLog(){if(S.tab!=='beallitasok')return;call('getLog').then(l=>{S.log=l;if(S.tab==='beallitasok'&&!$('modalRoot').innerHTML)render(true);}).catch(()=>{});}
function pinModal(){
  const pf=(n,l,ac)=>`<div class="field full"><label for="m-${n}">${l}</label><input class="inp pin" id="m-${n}" name="${n}" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="${ac}" placeholder="••••••"></div>`;
  openModal('PIN-kód módosítása',`<div class="fields">${pf('oldPin','Jelenlegi PIN','current-password')}${pf('newPin','Új PIN (6 számjegy)','new-password')}${pf('newPin2','Új PIN még egyszer','new-password')}</div>
    <p class="hint" style="margin:0">A többi eszközön, ahol be vagy lépve, ezután újra be kell lépni. Ha elfelejtetted a jelenlegi PIN-t, lépj ki, és a belépőn kérj újat („Elfelejtettem a PIN-kódom”).</p>`,
  {submitLabel:'PIN módosítása',submit:async fd=>{
    const o=String(fd.get('oldPin')||'').trim(),n=String(fd.get('newPin')||'').trim(),n2=String(fd.get('newPin2')||'').trim();
    if(!/^\d{6}$/.test(o)){toast('Add meg a jelenlegi PIN-t (6 számjegy).',true);$('m-oldPin').focus();return;}
    if(!/^\d{6}$/.test(n)){toast('Az új PIN 6 számjegy legyen.',true);$('m-newPin').focus();return;}
    if(n!==n2){toast('A két új PIN nem egyezik.',true);$('m-newPin2').value='';$('m-newPin2').focus();return;}
    try{await call('changePin',{oldPin:o,newPin:n});closeModal();toast('A PIN-kódod megváltozott.');}
    catch(e){handleErr(e);}
  }});
}
document.addEventListener('input',e=>{const t=e.target;if(t.classList&&t.classList.contains('pin')&&t.closest&&t.closest('#mform')){const v=t.value.replace(/\D/g,'').slice(0,6);if(t.value!==v)t.value=v;}});
function calEventById(id){for(const k in S.cal.events){const e=(S.cal.events[k]||[]).find(x=>x.id===id);if(e)return e;}return null;}
function calEventModal(id){
  const e=calEventById(id);if(!e)return;
  const when=e.date===e.endDate?F_FULL.format(toDate(e.date)):F_FULL.format(toDate(e.date))+' – '+F_FULL.format(toDate(e.endDate));
  const crewOf=m=>S.crew.find(c=>String(c.email||'').toLowerCase()===m);
  const guests=(e.guests||[]).map(m=>{const c=crewOf(m);return c?`<span class="statuspill">${esc(c.name)}</span>`:`<span class="statuspill" style="opacity:.7">${esc(m)}</span>`;}).join('');
  openModal(e.title||'Esemény',`<div class="kv"><span>Időpont</span><b>${esc(when)}${e.start?' · '+esc(e.start)+'–'+esc(e.end):''}</b></div>
    ${e.location?`<div class="kv"><span>Helyszín</span><b>${esc(e.location)}</b></div>`:''}
    ${guests?`<div><span class="lbl">Résztvevők</span><div class="roles" style="margin-top:6px">${guests}</div></div>`:''}
    ${e.description?`<p class="pc-note" style="max-height:220px;overflow:auto">${esc(e.description)}</p>`:''}
    <p class="hint" style="margin:0">Ez az esemény még nincs az appban. Ha projektet csinálsz belőle, a dátum, a helyszín, a leírás és a stábként felismert résztvevők átkerülnek, és ettől kezdve az app frissíti ezt a naptáreseményt.</p>`,
  {left:`<button type="button" class="btn primary small" data-action="cal-import" data-id="${esc(e.id)}">Projekt létrehozása ebből</button> <button type="button" class="btn outline small" data-action="cal-edit" data-id="${esc(e.id)}">Szerkesztés</button> <button type="button" class="btn danger small" data-action="cal-del" data-id="${esc(e.id)}">Törlés</button>`,cancelLabel:'Bezárás'});
}
function calFormModal(e,day){
  const v=e||{},d0=v.date||day||(S.cal.month===todayISO().slice(0,7)?todayISO():S.cal.month+'-01');
  const allDay=e?!!e.allDay:true;
  const crewMails=S.crew.filter(c=>EMAIL_RE.test(c.email||'')).sort((a,b)=>a.name.localeCompare(b.name,'hu'));
  const sel=new Set(v.guests||[]);
  const others=[...sel].filter(m=>!crewMails.some(c=>c.email.toLowerCase()===m));
  openModal(e?'Naptárbejegyzés szerkesztése':'Új naptárbejegyzés',`<div class="fields">
    ${mf('title','Cím',{full:true,v:v.title,ph:'pl. Helyszínbejárás – Hungexpo',max:200})}
    ${mf('date','Kezdő nap',{type:'date',v:d0})}
    ${mf('endDate','Utolsó nap (ha több napos)',{type:'date',v:v.endDate&&v.endDate!==v.date?v.endDate:''})}
    <div class="field full"><div class="rolepick"><label><input type="checkbox" name="allDay" id="m-allDay"${allDay?' checked':''}> Egész napos</label></div></div>
    <div class="field cal-time"${allDay?' hidden':''}><label for="m-start">Kezdés</label><input class="inp" id="m-start" name="start" type="time" value="${esc(v.start||'09:00')}"></div>
    <div class="field cal-time"${allDay?' hidden':''}><label for="m-end">Vége</label><input class="inp" id="m-end" name="end" type="time" value="${esc(v.end||'10:00')}"></div>
    ${mf('location','Helyszín',{full:true,v:v.location})}
    <div class="field full"><label for="m-description">Leírás</label><textarea class="inp" id="m-description" name="description">${esc(v.description||'')}</textarea></div>
    <div class="field full"><span class="lbl">Résztvevők a stábból</span><div class="rolepick">${crewMails.map(c=>`<label><input type="checkbox" name="guests" value="${esc(c.email.toLowerCase())}"${sel.has(c.email.toLowerCase())?' checked':''}>${esc(c.name)}</label>`).join('')||'<span class="hint" style="margin:0">Nincs e-mail-címmel rendelkező munkatárs.</span>'}</div></div>
    ${mf('extra','További résztvevők (e-mail-címek vesszővel)',{full:true,v:others.join(', '),ph:'pl. ugyfel@ceg.hu'})}
    ${e?'':`<div class="field full"><div class="rolepick"><label><input type="checkbox" name="sendInvites"> Meghívó e-mail küldése a résztvevőknek</label></div></div>`}
  </div><p class="hint" style="margin:0">A bejegyzés a „Terepi Munkák Lumos Motion” naptárba kerül.</p>`,
  {submitLabel:e?'Mentés':'Létrehozás',submit:async fd=>{
    const title=String(fd.get('title')||'').trim();if(title.length<2){toast('Add meg a címet.',true);$('m-title').focus();return;}
    if(!fd.get('date')){toast('Add meg a dátumot.',true);return;}
    const ad=fd.get('allDay')==='on';
    const extra=String(fd.get('extra')||'').split(/[,;\s]+/).map(s=>s.trim().toLowerCase()).filter(Boolean);
    const bad=extra.filter(m=>!EMAIL_RE.test(m));if(bad.length){toast('Hibás e-mail-cím: '+bad.join(', '),true);return;}
    const data={id:e?e.id:'',title,date:fd.get('date'),endDate:fd.get('endDate')||fd.get('date'),allDay:ad,start:ad?'':fd.get('start'),end:ad?'':fd.get('end'),
      location:String(fd.get('location')||'').trim(),description:String(fd.get('description')||'').trim(),guests:[...new Set(fd.getAll('guests').concat(extra))],sendInvites:fd.get('sendInvites')==='on'};
    try{await call('saveCalEvent',data);S.cal.events={};S.cal.month=data.date.slice(0,7);closeModal();S.tab='naptar';render(true);toast(e?'Bejegyzés mentve':'Bejegyzés létrehozva a naptárban');}
    catch(err){handleErr(err);}
  }});
}
document.addEventListener('change',e=>{if(e.target.id==='m-allDay'){document.querySelectorAll('.cal-time').forEach(x=>x.hidden=e.target.checked);}});
/* ===== Ügyfél-választó: a korábbi projektek megrendelői, a legutóbbi kapcsolattartóval ===== */
let pickItems=[];
function pickClose(){const b=$('hsBox');if(b)b.remove();pickItems=[];}
function pickShow(input,html){let b=$('hsBox');if(!b){b=document.createElement('div');b.id='hsBox';b.className='hs-box';b.setAttribute('role','listbox');document.body.appendChild(b);}
  const r=input.getBoundingClientRect();b.style.left=(r.left+scrollX)+'px';b.style.top=(r.bottom+scrollY+4)+'px';b.style.width=r.width+'px';b.innerHTML=html;}
function knownClients(q){
  const ql=q.toLowerCase(),seen={},out=[],cur=S.draft&&S.draft.id;
  S.projects.slice().sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))).forEach(p=>{
    const c=String(p.client||'').trim();if(!c)return;const k=c.toLowerCase();if(seen[k]||(ql&&k.indexOf(ql)<0))return;
    if(p.id===cur&&!S.projects.some(x=>x.id!==cur&&String(x.client||'').trim().toLowerCase()===k))return;
    seen[k]=1;out.push({company:c,name:p.contactName||'',phone:p.contactPhone||'',email:p.contactEmail||''});});
  return out.sort((a,b)=>a.company.localeCompare(b.company,'hu'));
}
function clientSearch(input){
  pickItems=knownClients(input.value.trim());
  if(!pickItems.length){pickClose();return;}
  pickShow(input,pickItems.map((it,i)=>`<button type="button" class="hs-item" data-hs="${i}"><b>${esc(it.company)}</b><small>${esc([it.name,it.phone,it.email].filter(Boolean).join(' · ')||'nincs kapcsolattartó megadva')}</small></button>`).join(''));
}
function clientPick(i){const it=pickItems[i];if(!it||!S.draft)return;pickClose();try{document.activeElement.blur();}catch(e){}
  const patch={client:it.company};if(it.name||it.phone||it.email){patch.contactName=it.name;patch.contactPhone=it.phone;patch.contactEmail=it.email;}
  setDraft(patch);toast(it.name?'Megrendelő és kapcsolattartó kitöltve':'Megrendelő kitöltve');}
document.addEventListener('input',e=>{if(e.target.id==='f-client'&&!ro())clientSearch(e.target);});
document.addEventListener('focusin',e=>{if(e.target.id==='f-client'&&!ro())clientSearch(e.target);else if($('hsBox'))pickClose();});
document.addEventListener('mousedown',e=>{const it=e.target.closest&&e.target.closest('.hs-item');if(it){e.preventDefault();clientPick(Number(it.dataset.hs));return;}if(e.target.id!=='f-client'&&(!e.target.closest||!e.target.closest('#hsBox')))pickClose();});
document.addEventListener('keydown',e=>{if(e.target.id!=='f-client'||!$('hsBox'))return;const its=[...document.querySelectorAll('.hs-item')];
  let i=its.findIndex(x=>x.classList.contains('on'));
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();i=e.key==='ArrowDown'?Math.min(its.length-1,i+1):Math.max(0,i-1);its.forEach((x,j)=>x.classList.toggle('on',j===i));}
  else if(e.key==='Enter'&&i>=0){e.preventDefault();clientPick(Number(its[i].dataset.hs));}
  else if(e.key==='Escape'||e.key==='Tab'){pickClose();}});
window.addEventListener('scroll',()=>{if($('hsBox')&&!document.activeElement.matches('#f-client'))pickClose();},{passive:true});
/* a naptár frissítése a mentés után, a háttérben (nem kell rá várni) */
function syncCal(id){
  call('syncCalendar',{id}).then(r=>{if(!r)return;const p=projById(id);if(p&&r.calEventId&&p.calEventId!==r.calEventId){p.calEventId=r.calEventId;if(S.draft&&S.draft.id===id&&!S.dirty)S.draft.calEventId=r.calEventId;render(true);}
    S.cal.events={};if(r.calError)toast(r.calError,true);})
  .catch(e=>{const m=errText(e);if(m.indexOf('Ismeretlen művelet')<0&&m.indexOf('AUTH_REQUIRED')<0)toast('A naptár frissítése nem sikerült: '+m,true);});
}
let importing=false;
async function importCalEvent(id){
  const e=calEventById(id);if(!e||importing)return;
  const ex=S.projects.find(p=>p.calEventId===id);if(ex){closeModal();openProject(ex.id);toast('Ebből az eseményből már van projekt');return;}
  importing=true;const btn=document.querySelector('[data-action=cal-import]');if(btn){btn.disabled=true;btn.textContent='Létrehozás…';}
  const crew=[];(e.guests||[]).forEach(m=>{const c=S.crew.find(x=>String(x.email||'').toLowerCase()===m);if(c&&!crew.some(a=>a.crewId===c.id))crew.push({crewId:c.id,role:(c.roles||[]).find(r=>r!=='Projektvezető')||'Operatőr'});});
  let hours=8;if(e.start&&e.end){const [a1,a2]=e.start.split(':').map(Number),[b1,b2]=e.end.split(':').map(Number);const h=Math.round(((b1*60+b2)-(a1*60+a2))/60);if(h>=1&&h<=16)hours=h;}
  const p={id:uuid(),name:String(e.title||'Projekt').slice(0,160),date:e.date,endDate:e.endDate!==e.date?e.endDate:'',startTime:e.start||'',hours,venue:e.location||'',notes:e.description||'',
    status:'tervezes',crew,equipment:[],calEventId:e.id,baseUpdatedAt:'',mutationId:uuid()};
  try{const saved=await call('saveProject',p);if(!projById(saved.id))S.projects.push(saved);closeModal();S.cal.events={};openProject(saved.id);toast(saved.duplicateOf?'Ebből az eseményből már van projekt':(saved.calError||'Projekt létrehozva a naptáreseményből'),!!saved.calError);}
  catch(err){handleErr(err);if(btn&&btn.isConnected){btn.disabled=false;btn.textContent='Projekt létrehozása ebből';}}
  finally{importing=false;}
}
function needName(form,msg){const el=form.querySelector('[name=name]');if(el.value.trim().length<2){el.focus();el.style.borderColor='var(--bad)';toast(msg||'Add meg a nevet.',true);return false;}return true;}
$('modalRoot').addEventListener('submit',async e=>{
  e.preventDefault();if(!modalSubmit)return;
  const form=e.target,btn=form.querySelector('[type=submit]');if(btn){btn.disabled=true;btn.dataset.l=btn.textContent;btn.textContent='Mentés…';}
  try{await modalSubmit(new FormData(form),form);}
  finally{if(btn&&btn.isConnected){btn.disabled=false;btn.textContent=btn.dataset.l;}}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('modalRoot').innerHTML)closeModal();});

function newProjectModal(){
  openModal('Új projekt',`<div class="fields">
    ${mf('name','Projekt neve',{full:true,ph:'pl. Ecommerce Expo 2027',max:160})}
    ${mf('client','Ügyfél (cég)')}
    ${ms('eventType','Rendezvény típusa',EVENT_TYPES,'',{empty:'Válassz…'})}
    ${mf('date','Első nap',{type:'date'})}
    ${mf('venue','Helyszín')}
  </div>`,{submitLabel:'Létrehozás',submit:async(fd,form)=>{
    if(!needName(form,'Add meg a projekt nevét.'))return;
    const p={id:uuid(),name:fd.get('name').trim(),client:fd.get('client').trim(),eventType:fd.get('eventType'),date:fd.get('date')||'',venue:fd.get('venue').trim(),
      status:'egyeztetes',hours:8,crew:[],equipment:[],baseUpdatedAt:'',mutationId:uuid()};
    try{const saved=await call('saveProject',Object.assign(p,{deferCal:true}));S.projects.push(saved);closeModal();openProject(saved.id);toast('Projekt létrehozva');syncCal(saved.id);}
    catch(e){handleErr(e);}
  }});
}
function crewModal(c){
  const v=c||{},roles=new Set(v.roles||[]);
  const uses=c?S.projects.filter(p=>crewIds(p).has(c.id)).length:0;
  openModal(c?'Munkatárs szerkesztése':'Új munkatárs',`<div class="fields">
    ${mf('name','Név',{full:true,v:v.name,max:100})}
    <div class="field full"><span class="lbl">Szerepek</span><div class="rolepick">${CREW_ROLES.map(r=>`<label><input type="checkbox" name="roles" value="${esc(r)}"${roles.has(r)?' checked':''}>${esc(r)}</label>`).join('')}</div></div>
    <div class="field full"><span class="lbl">Részletek</span><div class="rolepick">${CREW_SKILLS.map(r=>`<label><input type="checkbox" name="skills" value="${esc(r)}"${(v.skills||[]).includes(r)?' checked':''}>${esc(r)}</label>`).join('')}</div></div>
    ${ms('priority','Prioritás',[['1','1 – elsődleges'],['2','2 – másodlagos'],['3','3 – tartalék']],v.priority!=null?String(v.priority):'',{empty:'Nincs megadva'})}
    ${ms('type','Jogviszony',CREW_TYPES,v.type||'Belsős')}
    ${mf('company','Vállalkozás (számlázó cég)',{v:v.company,ph:'pl. Minta Kft., EV'})}
    ${moneyField('dayRate','Napidíj (nettó)',v.dayRate)}
    ${mf('phone','Telefon',{type:'tel',v:v.phone})}
    ${mf('email','E-mail',{type:'email',v:v.email})}
    ${mf('note','Megjegyzés',{full:true,v:v.note,ph:'pl. saját drón, B kategóriás jogosítvány'})}
  </div>`,{left:c?`<button type="button" class="btn danger small" data-action="del-crew" data-id="${esc(c.id)}">Törlés${uses?` (${uses} projektben szerepel)`:''}</button>`:'',
  submit:async(fd,form)=>{
    if(!needName(form))return;
    const data={id:c?c.id:uuid(),baseUpdatedAt:c?c.updatedAt:'',name:fd.get('name').trim(),roles:fd.getAll('roles'),type:fd.get('type'),dayRate:moneyVal(fd.get('dayRate')),phone:fd.get('phone').trim(),email:fd.get('email').trim(),note:fd.get('note').trim(),priority:fd.get('priority'),company:fd.get('company').trim(),skills:fd.getAll('skills')};
    try{const saved=await call('saveCrew',data);const i=S.crew.findIndex(x=>x.id===saved.id);if(i>=0)S.crew[i]=saved;else S.crew.push(saved);closeModal();render(true);toast(c?'Mentve':'Munkatárs felvéve');}
    catch(e){handleErr(e);}
  }});
}
function itemModal(it){
  const v=it||{};
  const uses=it?S.projects.filter(p=>eqQty(p,it.id)>0).length:0;
  openModal(it?'Eszköz szerkesztése':'Új eszköz',`<div class="fields">
    ${mf('name','Megnevezés',{full:true,v:v.name,ph:'pl. Sony FX3',max:160})}
    ${ms('category','Kategória',INV_CATS,v.category||'Kamera')}
    ${mf('qty','Darabszám',{type:'number',min:0,v:v.qty??1,im:'numeric'})}
    ${ms('condition','Állapot',Object.entries(CONDITIONS),v.condition||'ok')}
    ${moneyField('value','Beszerzési érték / db (bruttó)',isAdmin()?v.value:'',{steps:false,ph:!isAdmin()&&v.hasValue?'megadva – felülíráshoz írd be':'pl. 450 000'})}
    ${mf('serial','Azonosító / sorozatszám',{v:v.serial})}
    <div class="field"><label for="m-location">Tárolási hely</label><input class="inp" id="m-location" name="location" type="text" list="loc-list" maxlength="120" value="${esc(v.location||'')}" placeholder="pl. Iroda, 2. polc / FX3 táska"><datalist id="loc-list">${[...new Set(S.inventory.map(i=>i.location).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'hu')).map(l=>`<option value="${esc(l)}">`).join('')}</datalist></div>
    ${mf('note','Megjegyzés',{full:true,v:v.note,ph:'pl. tartozékok, szerviz dátuma'})}
  </div>`,{left:it?`<button type="button" class="btn danger small" data-action="del-item" data-id="${esc(it.id)}">Törlés${uses?` (${uses} projektben szerepel)`:''}</button>`:'',
  submit:async(fd,form)=>{
    if(!needName(form,'Add meg az eszköz nevét.'))return;
    const data={id:it?it.id:uuid(),baseUpdatedAt:it?it.updatedAt:'',name:fd.get('name').trim(),category:fd.get('category'),qty:fd.get('qty'),condition:fd.get('condition'),value:moneyVal(fd.get('value')),serial:fd.get('serial').trim(),location:String(fd.get('location')||'').trim(),note:fd.get('note').trim()};
    try{const saved=await call('saveItem',data);const i=S.inventory.findIndex(x=>x.id===saved.id);if(i>=0)S.inventory[i]=saved;else S.inventory.push(saved);closeModal();render(true);toast(it?'Mentve':'Eszköz felvéve');}
    catch(e){handleErr(e);}
  }});
}
function userModal(u){
  const v=u||{};
  const crewOpts=[['','Nincs összekapcsolva'],...S.crew.slice().sort((a,b)=>a.name.localeCompare(b.name,'hu')).map(c=>[c.id,c.name])];
  openModal(u?'Felhasználó szerkesztése':'Új felhasználó',`<div class="fields">
    ${mf('name','Megjelenő név',{v:v.name,max:60})}
    ${ms('role','Szerepkör',Object.entries(USER_ROLES),USER_ROLES[v.role]?v.role:'editor')}
    ${ms('crewId','Melyik munkatárs a stáblistában?',crewOpts,v.crewId||'',{full:true})}
    ${mf('email','E-mail-cím (ezzel lép be, ide megy a PIN)',{type:'email',v:v.email,full:true})}
    ${mf('pin',u?'Új PIN (üresen hagyva nem változik)':'PIN (üresen hagyva a program generál egyet)',{im:'numeric',max:6,ph:'6 számjegy'})}
    <div class="field full"><div class="rolepick"><label><input type="checkbox" name="sendPin"${u?'':' checked'}> PIN kiküldése e-mailben</label>${u?`<label><input type="checkbox" name="disabled"${v.disabled?' checked':''}> Letiltva</label>`:''}</div></div>
  </div>`,{left:u&&u.id!==S.me.id?`<button type="button" class="btn danger small" data-action="del-user" data-id="${esc(u.id)}">Törlés</button>`:'',
  submit:async(fd,form)=>{
    if(!needName(form))return;
    const data={id:u?u.id:undefined,name:fd.get('name').trim(),role:fd.get('role'),crewId:fd.get('crewId'),email:fd.get('email').trim(),pin:fd.get('pin').trim(),sendPin:fd.get('sendPin')==='on',disabled:fd.get('disabled')==='on'};
    try{
      const res=await call('saveUser',data);S.users=res.users;refreshLog();
      const m=res.mail;
      if(m&&!m.sent&&m.pin){openModal('A PIN nem ment ki e-mailben',`<p style="margin:0">Add át személyesen: <b style="font-size:20px;letter-spacing:3px">${esc(m.pin)}</b></p><p class="hint">${esc(m.error||'')}</p>`,{cancelLabel:'Rendben'});}
      else{closeModal();toast(m&&m.sent?'Mentve, a PIN-t elküldtük: '+m.to:'Mentve');}
      render(true);
    }catch(e){handleErr(e);}
  }});
}

function sendListModal(){
  const p=S.draft;if(!p||ro())return;
  if(S.dirty){toast('Előbb mentsd el a projekt módosításait, hogy a friss lista menjen ki.',true);return;}
  const ids=[...crewIds(p)];
  if(!ids.length){toast('Előbb osszál be stábot a projektre.',true);return;}
  const roleOf=id=>{const r=[];if(p.lead===id)r.push('Projektvezető');(p.crew||[]).forEach(a=>{if(a.crewId===id)r.push(a.role);});return r.join(', ');};
  const rows=ids.map(id=>{const c=crewById(id);const has=!!(c&&EMAIL_RE.test(c.email||''));
    return `<label class="toggle"><input type="checkbox" name="to" value="${esc(id)}"${has?' checked':' disabled'}><span class="tl"><b>${esc(c?c.name:'Törölt munkatárs')}</b><br><small class="muted">${esc(roleOf(id))} · ${has?esc(c.email):'nincs e-mail-cím megadva a Stáb fülön'}</small></span></label>`;}).join('');
  openModal(p.listSentAt?'Eszközlista újraküldése':'Eszközlista küldése',`<p class="hint" style="margin:0">A levél az admin@lumosmotion.com címről megy ki a te neveddel. Ha valaki válaszol, a válasz hozzád érkezik, és te is kapsz másolatot.</p>
    <div class="toggles" style="grid-template-columns:1fr">${rows}</div>
    <div class="field"><label for="m-msg">Üzenet (nem kötelező)</label><textarea class="inp" id="m-msg" name="message" placeholder="pl. Reggel 7-kor találkozunk a raktárnál."></textarea></div>
    <div class="rolepick"><label><input type="checkbox" name="plan" checked> Technikai terv és jegyzetek csatolása</label></div>
    ${p.listSentAt?`<p class="hint" style="margin:0">Utoljára kiküldve: ${esc(p.listSentAt)} · ${esc(p.listSentTo||'')}</p>`:''}`,
  {submitLabel:'Küldés',submit:async fd=>{
    const to=fd.getAll('to');if(!to.length){toast('Válassz ki legalább egy címzettet.',true);return;}
    try{
      const r=await call('sendEquipmentList',{projectId:p.id,recipients:to,message:String(fd.get('message')||'').trim(),includePlan:fd.get('plan')==='on'});
      [projById(p.id),S.draft].forEach(x=>{if(x){x.listSentAt=r.listSentAt;x.listSentTo=r.listSentTo;}});
      closeModal();render(true);toast('Eszközlista elküldve: '+r.names.join(', '));
    }catch(e){handleErr(e);}
  }});
}

/* ===== Projekt szerkesztése ===== */
function openProject(id){
  const p=projById(id);if(!p)return;
  S.tab='projektek';S.projectId=id;S.draft=clone(p);S.dirty=false;S.addCrew={person:'',role:''};S.addEq={item:'',qty:1};
  closeModal();render(true);scrollTo(0,0);
}
function setDraft(patch){if(ro()||!S.draft)return;Object.assign(S.draft,patch);S.dirty=true;render(true);}
function guard(fn){
  if(!S.dirty){fn();return;}
  confirmModal('Nem mentett módosítások','A projekten vannak el nem mentett módosítások. Elveted őket?','Elvetés',()=>{S.dirty=false;S.draft=S.projectId&&projById(S.projectId)?clone(projById(S.projectId)):null;fn();});
}
async function saveDraft(){
  if(!S.draft||S.saving)return;
  const d=S.draft;
  if(String(d.name||'').trim().length<2){toast('Add meg a projekt nevét.',true);return;}
  S.saving=true;renderChrome();
  const payload=Object.assign({},d,{baseUpdatedAt:(projById(d.id)||{}).updatedAt||'',mutationId:uuid(),deferCal:true});
  try{
    const saved=await call('saveProject',payload);
    const i=S.projects.findIndex(x=>x.id===saved.id);if(i>=0)S.projects[i]=saved;else S.projects.push(saved);
    if(S.projectId===saved.id){S.draft=clone(saved);S.dirty=false;}
    S.cal.events={};toast('Mentve');syncCal(saved.id);
  }catch(e){
    const m=errText(e);
    if(m.indexOf('CONFLICT')===0){
      openModal('Közben módosult a projekt',`<p style="margin:0">Valaki más is elmentette ezt a projektet, amíg szerkesztetted. A te módosításaid csak itt vannak meg, ezért ha újratöltöd, elvesznek. Jegyezd fel, mit módosítottál, aztán töltsd újra a projektet.</p>`,{submitLabel:'Újratöltés',submit:async()=>{closeModal();S.dirty=false;await load(false);const p=projById(d.id);if(p)S.draft=clone(p);render(true);}});
    }else handleErr(e);
  }finally{S.saving=false;render(true);}
}
function packingList(p){
  const lines=[`Pakolási lista – ${p.name||'Projekt'}`,`${fmtRange(p)}${p.venue?' · '+p.venue:''}${p.startTime?' · érkezés '+p.startTime:''}`,''];
  const eq=(p.equipment||[]).map(e=>({e,it:itemById(e.itemId)})).filter(x=>x.it);
  INV_CATS.forEach(cat=>{const items=eq.filter(x=>(x.it.category||'Egyéb')===cat);if(!items.length)return;lines.push(cat.toUpperCase());items.forEach(({e,it})=>lines.push(`☐ ${num(e.qty)}× ${it.name}${it.serial?' ('+it.serial+')':''}${it.location?' – '+it.location:''}`));lines.push('');});
  const crew=[...crewIds(p)].map(id=>crewById(id)).filter(Boolean);
  if(crew.length){lines.push('STÁB');crew.forEach(c=>lines.push(`• ${c.name}${c.phone?' – '+c.phone:''}`));}
  return lines.join('\n').trim();
}
async function copyText(t,label){
  try{await navigator.clipboard.writeText(t);toast(label||'Vágólapra másolva');}
  catch(e){openModal('Másold ki',`<textarea class="inp copybox" id="copybox" readonly>${esc(t)}</textarea>`,{cancelLabel:'Bezárás'});const el=$('copybox');if(el){el.focus();el.select();}}
}
function arm(b,fn){
  if(b.dataset.armed){fn();return;}
  b.dataset.armed='1';const old=b.textContent;b.textContent='Biztosan? Kattints újra';b.classList.add('armed');
  setTimeout(()=>{if(b.isConnected){delete b.dataset.armed;b.textContent=old;b.classList.remove('armed');}},4000);
}

/* ===== Események ===== */
const ACT={
  tab:b=>guard(()=>{S.tab=b.dataset.tab;S.projectId=null;S.draft=null;if(S.tab==='beallitasok'){S.users=null;S.log=null;}closeModal();render(true);scrollTo(0,0);}),
  'open-project':b=>{const id=b.dataset.id;if(S.projectId===id){closeModal();return;}guard(()=>openProject(id));},
  back:()=>guard(()=>{S.projectId=null;S.draft=null;render(true);scrollTo(0,0);}),
  reload:()=>load(),
  pf:b=>{S.pf.status=b.dataset.v;render(true);},
  'crew-prio':b=>{S.cf.prio=b.dataset.v;render(true);},
  'crew-view':b=>{S.cf.view=b.dataset.v;try{localStorage.setItem('lumos_pm_crewview',S.cf.view);}catch(e){}render(true);},
  'new-project':()=>{if(!ro())guard(newProjectModal);},
  'new-crew':()=>crewModal(null),
  'edit-crew':b=>{const c=crewById(b.dataset.id);if(c)crewModal(c);},
  'new-item':()=>itemModal(null),
  'edit-item':b=>{const i=itemById(b.dataset.id);if(i)itemModal(i);},
  'new-user':()=>userModal(null),
  'edit-user':b=>{const u=(S.users||[]).find(x=>x.id===b.dataset.id);if(u)userModal(u);},
  'reload-log':async()=>{try{S.log=await call('getLog');render(true);}catch(e){handleErr(e);}},
  'del-crew':b=>arm(b,async()=>{try{await call('deleteCrew',{id:b.dataset.id});S.crew=S.crew.filter(c=>c.id!==b.dataset.id);closeModal();await load(true);toast('Munkatárs törölve');}catch(e){handleErr(e);}}),
  'del-item':b=>arm(b,async()=>{try{await call('deleteItem',{id:b.dataset.id});S.inventory=S.inventory.filter(i=>i.id!==b.dataset.id);closeModal();await load(true);toast('Eszköz törölve');}catch(e){handleErr(e);}}),
  'del-user':b=>arm(b,async()=>{try{S.users=await call('deleteUser',{id:b.dataset.id});refreshLog();closeModal();render(true);toast('Felhasználó törölve');}catch(e){handleErr(e);}}),
  'modal-close':()=>closeModal(),
  'modal-bg':(b,e)=>{if(e.target===b)closeModal();},
  save:()=>saveDraft(),
  discard:()=>{const p=projById(S.projectId);S.draft=p?clone(p):null;S.dirty=false;render(true);toast('Módosítások elvetve');},
  stage:b=>{const d=S.draft;if(!d||d.status===b.dataset.v)return;setDraft({status:b.dataset.v,deliveredAt:b.dataset.v==='atadva'?(d.deliveredAt||todayISO()):''});},
  'cancel-toggle':()=>{const d=S.draft;if(!d)return;if(d.status==='lemondva')setDraft({status:d.prevStatus||'egyeztetes'});else setDraft({status:'lemondva',prevStatus:d.status||'egyeztetes'});},
  'del-project':b=>arm(b,async()=>{const id=S.projectId;try{await call('deleteProject',{id});S.cal.events={};S.projects=S.projects.filter(p=>p.id!==id);S.projectId=null;S.draft=null;S.dirty=false;render(true);toast('Projekt törölve');}catch(e){handleErr(e);}}),
  'foto-step':b=>{const d=S.draft;if(!d)return;const cur=fotoDb(d),up=Number(b.dataset.d)>0;let n=up?(cur?cur+FOTO_STEP:FOTO_DEF):cur-FOTO_STEP;n=Math.max(0,Math.min(FOTO_MAX,n));setDraft({foto_db:n,x_foto:n>0});},
  'rec-step':b=>{const d=S.draft;if(!d)return;const it=REC_COUNTS.find(x=>x.k===b.dataset.k);if(!it)return;const cur=it.k==='er_rooms'?Math.max(1,num(d[it.k])||1):num(d[it.k]);setDraft({[it.k]:Math.min(it.max,Math.max(it.min,cur+Number(b.dataset.d)))});},
  dlv:b=>{const d=S.draft;if(!d)return;const it=DELIVERABLES.find(x=>x.k===b.dataset.k);setDraft({[it.k]:Math.min(it.max,Math.max(0,num(d[it.k])+Number(b.dataset.d)))});},
  'crew-add':()=>{const d=S.draft;if(!d)return;const id=S.addCrew.person;if(!id){toast('Válassz munkatársat.',true);return;}
    const role=$('add-crew-role').value;const crew=clone(d.crew||[]);
    if(crew.some(a=>a.crewId===id&&a.role===role)){toast('Már be van osztva ebben a szerepben.',true);return;}
    crew.push({crewId:id,role});S.addCrew={person:'',role:''};setDraft({crew});},
  'crew-remove':b=>{const crew=clone(S.draft.crew||[]);crew.splice(Number(b.dataset.i),1);setDraft({crew});},
  'eq-add':()=>{const d=S.draft;if(!d)return;const id=S.addEq.item;if(!id){toast('Válassz eszközt.',true);return;}
    const qty=Math.max(1,Math.round(num($('add-eq-qty').value)||1));const equipment=clone(d.equipment||[]);
    const ex=equipment.find(e=>e.itemId===id);if(ex)ex.qty=num(ex.qty)+qty;else equipment.push({itemId:id,qty});
    S.addEq={item:'',qty:1};setDraft({equipment});},
  'eq-remove':b=>setDraft({equipment:clone(S.draft.equipment||[]).filter(e=>e.itemId!==b.dataset.id)}),
  'send-list':()=>sendListModal(),
  'cal-nav':b=>{const d=Number(b.dataset.d);if(!d)S.cal.month=todayISO().slice(0,7);else{const [y,m]=S.cal.month.split('-').map(Number);const n=new Date(Date.UTC(y,m-1+d,1));S.cal.month=n.toISOString().slice(0,7);}render(true);},
  'cal-retry':()=>{delete S.cal.err[S.cal.month];delete S.cal.events[S.cal.month];render(true);},
  'cal-event':b=>calEventModal(b.dataset.id),
  'cal-day':b=>{const d=b.dataset.d,its=calItems(S.cal.month).filter(it=>it.date<=d&&it.endDate>=d);openModal(F_FULL.format(toDate(d)),`<div class="cal-daylist">${its.map(it=>calChip(it,d)).join('')}</div>`,{cancelLabel:'Bezárás'});},
  'cal-import':b=>importCalEvent(b.dataset.id),
  'cal-new':b=>calFormModal(null,b.dataset.d||''),
  'cal-edit':b=>{const e=calEventById(b.dataset.id);if(e)calFormModal(e);},
  'cal-del':b=>arm(b,async()=>{try{await call('deleteCalEvent',{id:b.dataset.id});S.cal.events={};closeModal();render(true);toast('Bejegyzés törölve');}catch(e){handleErr(e);}}),
  'my-pin':()=>{if(S.me)pinModal();},
  'money-step':b=>{const el=$(b.dataset.for);if(!el)return;const cur=Number(moneyVal(el.value)||0);const n=Math.max(0,Math.min(MONEY_MAX,(Math.round(cur/MONEY_STEP)+Number(b.dataset.d))*MONEY_STEP));el.value=moneyFmt(n);el.focus();},
  'copy-pack':()=>{if(S.draft)copyText(packingList(S.draft),'Pakolási lista a vágólapon');},
  'make-folder':async b=>{const d=S.draft;if(!d)return;b.disabled=true;b.textContent='Mappa létrehozása…';
    try{const r=await call('createProjectFolder',{id:d.id});const p=projById(d.id);if(p)p.folderId=r.folderId;d.folderId=r.folderId;render(true);toast(r.existed?'A mappa már létezett':'Projektmappa létrehozva');}
    catch(e){handleErr(e);b.disabled=false;b.textContent='📁 Projektmappa létrehozása';}},
  copy:b=>copyText(b.dataset.text),
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const fn=ACT[b.dataset.action];if(fn)fn(b,e);});
function fieldValue(t){
  const k=t.dataset.field;
  if(t.type==='number'){if(t.value==='')return k==='hours'?8:null;const n=Math.round(num(t.value));return k==='hours'?Math.min(16,Math.max(1,n)):Math.max(0,n);}
  return t.value;
}
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.dataset.field!==undefined&&S.draft&&!ro()&&t.tagName!=='SELECT'){S.draft[t.dataset.field]=t.type==='number'?(t.value===''?null:num(t.value)):t.value;if(!S.dirty){S.dirty=true;renderChrome();}return;}
  if(t.dataset.money){const pos=t.value.length-t.selectionStart;const v=moneyVal(t.value);t.value=moneyFmt(v);try{const p=Math.max(0,t.value.length-pos);t.setSelectionRange(p,p);}catch(e){}return;}
  if(t.id==='q-projects'){S.pf.q=t.value;render(true);}
  else if(t.id==='q-crew'){S.cf.q=t.value;render(true);}
  else if(t.id==='q-inv'){S.inf.q=t.value;render(true);}
  else if(t.id==='add-eq-qty'){S.addEq.qty=t.value;}
});
document.addEventListener('change',e=>{
  const t=e.target,d=S.draft;
  if(t.dataset.field!==undefined&&d){setDraft({[t.dataset.field]:fieldValue(t)});return;}
  if(t.dataset.flag&&d){setDraft({[t.dataset.flag]:t.checked});return;}
  if(t.dataset.multi&&d){if(t.checked){d._multi=true;setDraft({endDate:d.endDate||(validISO(d.date)?addDays(d.date,1):'')});setTimeout(()=>{const e=$('f-endDate');if(e)e.focus();},0);}else{d._multi=false;setDraft({endDate:''});}return;}
  if(t.dataset.crewRole!==undefined&&d){const crew=clone(d.crew||[]);crew[Number(t.dataset.crewRole)].role=t.value;setDraft({crew});return;}
  if(t.dataset.eqQty!==undefined&&d){const q=Math.max(1,Math.round(num(t.value)||1));const equipment=clone(d.equipment||[]);const ex=equipment.find(x=>x.itemId===t.dataset.eqQty);if(ex){ex.qty=q;setDraft({equipment});}return;}
  if(t.id==='add-crew-person'){S.addCrew.person=t.value;const c=crewById(t.value);S.addCrew.role=(c&&(c.roles||[])[0])||'';render(true);return;}
  if(t.id==='add-crew-role'){S.addCrew.role=t.value;return;}
  if(t.id==='add-eq-item'){S.addEq.item=t.value;return;}
  if(t.id==='crew-role-filter'){S.cf.role=t.value;render(true);return;}
  if(t.id==='inv-cat'){S.inf.cat=t.value;render(true);return;}
  if(t.id==='inv-cond'){S.inf.cond=t.value;render(true);return;}
});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'&&S.dirty){e.preventDefault();saveDraft();}});

/* ===== Indítás ===== */
if(TOKEN)load();else{VIEW.innerHTML='';showLogin('');}
