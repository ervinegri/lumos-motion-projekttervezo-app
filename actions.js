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
    seen[k]=1;out.push({company:c,name:p.contactName||'',phone:p.contactPhone||'',email:p.contactEmail||'',tax:p.clientTax||'',address:p.clientAddress||''});});
  return out.sort((a,b)=>a.company.localeCompare(b.company,'hu'));
}
function clientOptions(sel){const list=knownClients('').map(c=>c.company);return `<option value="">Válassz ügyfelet…</option>${list.map(c=>`<option value="${esc(c)}"${c===sel?' selected':''}>${esc(c)}</option>`).join('')}<option value="__new">+ Új ügyfél felvétele…</option>`;}
/* Új ügyfél: adószámból a cégnév és a székhely a NAV-ból (számlázz.hu-n keresztül, mint a Sales Appban). */
const taxBlock=()=>`<div class="field full"><label for="m-clientTax">Adószám</label><div class="tax-row"><input class="inp" id="m-clientTax" name="clientTax" inputmode="numeric" maxlength="13" placeholder="12345678-2-42" autocomplete="off"><button class="btn outline small" type="button" data-action="tax-lookup">Cégadatok betöltése</button></div>
  <button class="linkbtn" type="button" data-action="nav-search" style="align-self:flex-start;font-size:13px">🔎 Adószám keresése név alapján (NAV)</button></div>
  ${mf('client','Cégnév',{full:true,max:160})}${mf('clientAddress','Székhely',{full:true,max:300})}`;
async function taxLookup(){
  const t=$('m-clientTax'),b=document.querySelector('[data-action=tax-lookup]');if(!t)return;const v=t.value.replace(/\D/g,'');
  if(v.length<8){toast('Az adószám első 8 számjegye szükséges.',true);t.focus();return;}
  if(b){b.disabled=true;b.textContent='Betöltés…';}
  try{const r=await call('lookupTaxpayer',{tax:v});$('m-client').value=r.name||'';$('m-clientAddress').value=r.address||'';toast('Cégadatok betöltve');}
  catch(e){toast(errText(e),true);}
  finally{if(b){b.disabled=false;b.textContent='Cégadatok betöltése';}}
}
document.addEventListener('input',e=>{if(e.target.id==='m-clientTax'){const t=e.target,d=t.value.replace(/\D/g,'');if(d.length===11&&!t._done){t._done=1;t.value=d.slice(0,8)+'-'+d[8]+'-'+d.slice(9);taxLookup();}else if(d.length<11)t._done=0;}});   // teljes adószámnál magától betölt
function editClientModal(){
  const d=S.draft;if(!d)return;newClientModal(null,d);
}
function newClientModal(pre,edit){
  openModal(edit?'Ügyfél adatai':'Új ügyfél',`<div class="fields">${taxBlock()}${mf('contactName','Kapcsolattartó',{max:120})}${phoneField({name:'contactPhone',value:edit?edit.contactPhone:''})}${mf('contactEmail','E-mail',{type:'email',full:true,max:160})}</div>`,
    {submitLabel:edit?'Mentés':'Felvétel',submit:async fd=>{const c=String(fd.get('client')||'').trim();if(c.length<2){toast('Add meg az ügyfél nevét.',true);return;}
      const patch={client:c,clientTax:String(fd.get('clientTax')||'').trim(),clientAddress:String(fd.get('clientAddress')||'').trim()};['contactName','contactPhone','contactEmail'].forEach(k=>{const v=String(fd.get(k)||'').trim();if(v||edit)patch[k]=v;});
      closeModal();if(S.draft)setDraft(patch);}});
  if(pre){const n=$('m-client');if(n)n.value=pre;}
  if(edit){[['m-clientTax',edit.clientTax],['m-client',edit.client],['m-clientAddress',edit.clientAddress],['m-contactName',edit.contactName],['m-contactEmail',edit.contactEmail]].forEach(([id,v])=>{const e=$(id);if(e)e.value=v||'';});}
}
/* Kereshető ügyfélválasztó: gépelésre szűr, a lista végén mindig ott az „Új ügyfél felvétele”. */
function clientSearch(input,all){
  const q=all?'':input.value.trim(),cur=S.draft&&String(S.draft.client||'').trim();
  pickItems=knownClients(q);
  if(cur&&!pickItems.some(c=>c.company===cur)&&(!q||cur.toLowerCase().includes(q.toLowerCase())))pickItems.unshift({company:cur,name:S.draft.contactName||'',phone:S.draft.contactPhone||'',email:S.draft.contactEmail||'',tax:S.draft.clientTax||'',address:S.draft.clientAddress||''});
  pickItems.push({isNew:true,company:q});
  pickShow(input,pickItems.map((it,i)=>it.isNew?`<button type="button" class="hs-item hs-new" data-hs="${i}"><b>+ Új ügyfél felvétele${q?`: „${esc(q)}”`:'…'}</b></button>`
    :`<div class="hs-row${it.company===cur?' cur':''}"><button type="button" class="hs-item" data-hs="${i}"><b>${esc(it.company)}</b><small>${esc([it.name,it.phone,it.email].filter(Boolean).join(' · ')||it.address||'nincs kapcsolattartó megadva')}</small></button><button type="button" class="hs-edit" data-hsedit="${i}" title="Ügyfél adatainak módosítása" aria-label="${esc(it.company)} módosítása">✏️</button></div>`).join('')+(pickItems.length===1&&q?'<div class="hs-empty">Nincs ilyen ügyfél.</div>':''));
}
function clientPick(i){const it=pickItems[i];if(!it||!S.draft)return;pickClose();try{document.activeElement.blur();}catch(e){}
  if(it.isNew){newClientModal(it.company);return;}
  const patch={client:it.company,clientTax:it.tax||'',clientAddress:it.address||''};if(it.name||it.phone||it.email){patch.contactName=it.name;patch.contactPhone=it.phone;patch.contactEmail=it.email;}
  setDraft(patch);}
document.addEventListener('input',e=>{if(e.target.id==='f-client'&&!ro())clientSearch(e.target);});
document.addEventListener('focusin',e=>{if(e.target.id==='f-client'&&!ro()){e.target.select();clientSearch(e.target,true);}else if($('hsBox'))pickClose();});
document.addEventListener('focusout',e=>{if(e.target.id==='f-client'){const t=e.target;setTimeout(()=>{if(document.activeElement!==t&&S.draft)t.value=S.draft.client||'';},200);}});   // választás nélkül visszaáll
document.addEventListener('mousedown',e=>{const ed=e.target.closest&&e.target.closest('.hs-edit');if(ed){e.preventDefault();clientPick(Number(ed.dataset.hsedit));editClientModal();return;}const it=e.target.closest&&e.target.closest('.hs-item');if(it){e.preventDefault();clientPick(Number(it.dataset.hs));return;}if(e.target.id!=='f-client'&&(!e.target.closest||!e.target.closest('#hsBox')))pickClose();});
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
    <div class="field"><label for="m-clientSel">Ügyfél</label><select class="inp" id="m-clientSel" name="clientSel">${clientOptions('')}</select></div>
    <div class="field full" id="m-clientNew" style="display:none"><div class="fields">${taxBlock()}</div></div>
    ${ms('eventType','Rendezvény típusa',EVENT_TYPES,'',{empty:'Válassz…'})}
    ${mf('date','Első nap',{type:'date'})}
    ${mf('venue','Helyszín')}
  </div>`,{submitLabel:'Létrehozás',submit:async(fd,form)=>{
    if(!needName(form,'Add meg a projekt nevét.'))return;
    const p={id:uuid(),name:fd.get('name').trim(),client:fd.get('clientSel')==='__new'?String(fd.get('client')||'').trim():String(fd.get('clientSel')||''),eventType:fd.get('eventType'),date:fd.get('date')||'',venue:fd.get('venue').trim(),
      status:'egyeztetes',hours:8,crew:[],equipment:[],baseUpdatedAt:'',mutationId:uuid()};
    if(fd.get('clientSel')==='__new'){p.clientTax=String(fd.get('clientTax')||'').trim();p.clientAddress=String(fd.get('clientAddress')||'').trim();}
    {const it=knownClients('').find(c=>c.company===p.client);if(it){p.contactName=it.name;p.contactPhone=it.phone;p.contactEmail=it.email;if(!p.clientTax){p.clientTax=it.tax;p.clientAddress=it.address;}}}   // ismert ügyfél: a kapcsolattartó is átjön
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
    ${phoneField({name:'phone',value:v.phone})}
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
  openModal(u?'Felhasználó szerkesztése':'Kolléga felvétele',`<div class="fields">
    ${mf('name','Megjelenő név',{v:v.name,max:60})}
    ${ms('role','Szerepkör',Object.entries(USER_ROLES).filter(([k])=>k!=='admin'||v.role==='admin'||!(S.users||[]).some(x=>x.role==='admin'&&x.id!==v.id)),USER_ROLES[v.role]?v.role:'editor')}
    ${ms('crewId','Melyik munkatárs a stáblistában? (Szakembernél kötelező)',crewOpts,v.crewId||'',{full:true})}
    ${mf('email','Google-fiók e-mail-címe (ezzel lép be)',{type:'email',v:v.email,full:true,ph:'pl. kollega@lumosmotion.com'})}
    <div class="field full"><div class="rolepick">${u?`<label><input type="checkbox" name="disabled"${v.disabled?' checked':''}> Letiltva (nem tud belépni)</label>`:`<label><input type="checkbox" name="sendInvite" checked> Meghívó küldése e-mailben</label>`}</div>
      <p class="hint" style="margin:6px 0 0">Belépés csak Google-fiókkal: céges címnél a Lumos Motion Workspace-fiókkal, külsősnél azzal a Google-fiókkal, amelyhez ez az e-mail-cím tartozik.</p></div>
  </div>`,{left:u&&u.id!==S.me.id?`<button type="button" class="btn danger small" data-action="del-user" data-id="${esc(u.id)}">Törlés</button>`:'',
  submit:async(fd,form)=>{
    if(!needName(form))return;
        const data={id:u?u.id:undefined,name:fd.get('name').trim(),role:fd.get('role'),crewId:fd.get('crewId'),email:fd.get('email').trim(),disabled:fd.get('disabled')==='on',loginMode:'google',sendInvite:u?false:fd.get('sendInvite')==='on'};
    try{
      const res=await call('saveUser',data);S.users=res.users;refreshLog();
      const m=res.mail;
      if(m&&!m.sent&&m.pin){openModal('A PIN nem ment ki e-mailben',`<p style="margin:0">Add át személyesen: <b style="font-size:20px;letter-spacing:3px">${esc(m.pin)}</b></p><p class="hint">${esc(m.error||'')}</p>`,{cancelLabel:'Rendben'});}
      else{closeModal();toast(m&&m.sent?(m.invite?'Kolléga felvéve, meghívót küldtünk: ':'Mentve, a PIN-t elküldtük: ')+m.to:(m&&m.invite?'Kolléga felvéve, de a meghívó nem ment ki: '+(m.error||''):'Mentve'),m&&m.invite&&!m.sent);}
      render(true);
    }catch(e){handleErr(e);}
  }});
}

/* Ügyvezetői előnézet: a háttér a munkamenetet átállítja a választott szerepkörre, így pontosan azt kapod, amit ők. */
async function switchView(role,crewId){
  try{
    document.body.classList.add('switching');
    await SAVE_Q;if(S.dirty){document.body.classList.remove('switching');toast('A módosítások mentése nem sikerült – előbb mentsd el őket, aztán válts nézetet.',true);renderChrome();return;}   // előbb fusson le minden folyamatban lévő mentés
    const r=await call('setViewAs',{role,crewId});
    S.projectId=null;S.draft=null;S.dirty=false;S.users=null;S.log=null;S.tab='attekintes';S.cal.events={};
    if(location.hash)history.replaceState(null,'',location.pathname+location.search);
    await load(false,false,r&&r.boot);document.body.classList.remove('switching');toast(role==='admin'?'Ügyvezetői nézet':role==='editor'?'Termelési vezető nézet':'Szakember nézet');
  }catch(e){document.body.classList.remove('switching');handleErr(e);renderChrome();}
}
function viewAsCrewModal(){
  const opts=S.crew.slice().sort((a,b)=>a.name.localeCompare(b.name,'hu')).map(c=>[c.id,c.name]);
  if(!opts.length){toast('Nincs még munkatárs a Stáb fülön.',true);renderChrome();return;}
  openModal('Szakember nézet',`<p class="hint" style="margin:0 0 10px">Válaszd ki, kinek a szemével nézed az appot: csak azokat a projekteket fogod látni, amelyekre ő be van osztva, árak és díjak nélkül.</p><div class="fields">${ms('crewId','Szakember',opts,opts[0][0],{full:true})}</div>`,
    {submitLabel:'Nézet bekapcsolása',submit:async fd=>{closeModal();await switchView('crew',fd.get('crewId'));},onClose:()=>renderChrome()});
}
$('viewAs').addEventListener('change',e=>{const v=e.target.value;guard(()=>{if(v==='crew')viewAsCrewModal();else switchView(v);});renderChrome();});
function siteModal(next){
  const d=S.draft;if(!d)return;
  openModal('📝 Helyszíni munka beszámoló',`<div class="fields">
      <div class="field full"><label>Minden rendben ment a helyszínen?</label><div class="seg-row">
        <label class="toggle"><input type="radio" name="siteOk" value="igen"${d.siteOk==='igen'?' checked':''}><span class="tl">✅ Igen, minden rendben</span></label>
        <label class="toggle"><input type="radio" name="siteOk" value="nem"${d.siteOk==='nem'?' checked':''}><span class="tl">⚠️ Nem, volt probléma</span></label></div></div>
      <div class="field full"><label for="m-siteReport">Beszámoló <span class="muted" style="font-weight:600">(nem kötelező)</span></label><textarea class="inp" id="m-siteReport" name="siteReport" rows="4" maxlength="3000" placeholder="Hogy ment a forgatás, volt-e csúszás, technikai gond, ügyfél-visszajelzés…">${esc(d.siteReport||'')}</textarea></div>
    </div>`,{submitLabel:next?'Tovább':'Mentés',submit:async fd=>{
      const ok=String(fd.get('siteOk')||''),txt=String(fd.get('siteReport')||'').trim();
      if(!ok){toast('Jelöld be, hogy minden rendben ment-e.',true);return;}
      closeModal();setDraft({siteOk:ok,siteReport:txt});if(next)next();}});
}
function deliveryModal(){
  const d=S.draft,r=pr(d);if(!d)return;
  openModal('📦 Átadás',`<div class="kv"><span>Rendezvény utolsó napja</span><b>${r?fmtDay(r.end):'Nincs dátum'}</b></div>
    <div class="fields" style="margin-top:10px">
      <div class="field"><label for="m-dueAt">Átadási határidő</label><input class="inp" id="m-dueAt" name="dueAt" type="date" value="${esc(dueDate(d)||'')}"${r?` min="${esc(r.end)}"`:''}></div>
      ${d.status==='atadva'&&d.deliveredAt?`<div class="field"><label>Átadva</label><div class="inp" style="border:0;background:none;padding-left:0"><b class="ok-txt">${fmtDay(d.deliveredAt)}</b></div></div>`:'<div></div>'}
      ${mf('deliveryLink','Átadási link (mappa vagy videók)',{full:true,type:'url',ph:'https://drive.google.com/…',v:d.deliveryLink||''})}
      <div class="field full"><label for="m-deliveryNotes">Észrevételek</label><textarea class="inp" id="m-deliveryNotes" name="deliveryNotes" rows="4" maxlength="3000" placeholder="Hogy ment a projekt, mire figyeljünk legközelebb, mi maradt nyitva…">${esc(d.deliveryNotes||'')}</textarea></div>
    </div>`,{submitLabel:d.status==='atadva'?'Mentés':'Átadva ✓',submit:async fd=>{
      const link=String(fd.get('deliveryLink')||'').trim();if(!/^https:\/\/\S+$/i.test(link)){toast('Adj meg egy érvényes átadási linket (https://…).',true);const e=$('m-deliveryLink');if(e)e.focus();return;}
      const notes=String(fd.get('deliveryNotes')||'').trim();if(!notes){toast('Írd be az észrevételeket.',true);const e=$('m-deliveryNotes');if(e)e.focus();return;}
      const due=String(fd.get('dueAt')||'');closeModal();
      setDraft({deliveryLink:link,deliveryNotes:notes,dueAt:validISO(due)&&due!==defaultDue(d)?due:'',status:'atadva',deliveredAt:d.deliveredAt||todayISO()});}});
  const e=$('m-deliveryLink');if(e)setTimeout(()=>e.focus(),50);
}
function ownGearModal(crewId){
  const c=crewById(crewId);
  openModal('Saját eszköz'+(c?' – '+c.name:' – közös'),`<p class="hint" style="margin:0 0 10px">A munkatárs saját felszerelése – nem leltári és nem bérelt.</p><div class="fields">
    ${mf('name','Eszköz neve',{full:true,ph:'pl. saját Sony A7 IV + 24-70',max:120})}
  </div>`,{submitLabel:'Hozzáadás',submit:async fd=>{
    const name=String(fd.get('name')||'').trim();if(!name){toast('Add meg az eszköz nevét.',true);return;}
    closeModal();setDraft({rentals:(S.draft.rentals||[]).concat([{id:uuid(),crewId:crewId||'',name,company:'',price:0,own:true}])});}});
}
function rentalModal(crewId){
  const c=crewById(crewId);
  openModal('Bérelt eszköz'+(c?' – '+c.name:' – közös'),`<div class="fields">
    ${mf('name','Eszköz neve',{full:true,ph:'pl. Sony FX6 + 24-70 GM',max:120})}
    ${mf('company','Bérbeadó cég',{ph:'pl. Rentalcam',max:120})}
    ${canSeeFees()?moneyField('price','Bérleti díj (nettó)','',{steps:false,ph:'pl. 25 000'}):''}
  </div>`,{submitLabel:'Hozzáadás',submit:async(fd,form)=>{
    const name=String(fd.get('name')||'').trim();if(!name){toast('Add meg az eszköz nevét.',true);return;}
    const r={id:uuid(),crewId:crewId||'',name,company:String(fd.get('company')||'').trim(),price:canSeeFees()?(moneyVal(fd.get('price'))||0):0};
    closeModal();setDraft({rentals:(S.draft.rentals||[]).concat([r])});}});
}
function sendListModal(only){
  const p=S.draft;if(!p||ro())return;
  if(S.dirty){toast('Előbb mentsd el a projekt módosításait, hogy a friss lista menjen ki.',true);return;}
  const ids=[...crewIds(p)];
  if(!ids.length){toast('Előbb osszál be stábot a projektre.',true);return;}
  const roleOf=id=>{const r=[];if(p.lead===id)r.push('Projektvezető');(p.crew||[]).forEach(a=>{if(a.crewId===id)r.push(a.role);});return r.join(', ');};
  const rows=ids.map(id=>{const c=crewById(id);const has=!!(c&&EMAIL_RE.test(c.email||''));
    return `<label class="toggle"><input type="checkbox" name="to" value="${esc(id)}"${has?(only&&only!==id?'':' checked'):' disabled'}><span class="tl"><b>${esc(c?c.name:'Törölt munkatárs')}</b><br><small class="muted">${esc(roleOf(id))} · ${has?esc(c.email):'nincs e-mail-cím megadva a Stáb fülön'}</small></span></label>`;}).join('');
  openModal(p.listSentAt?'Eszközlista újraküldése':'Eszközlista küldése',`<p class="hint" style="margin:0">A levél az admin@lumosmotion.com címről megy ki a te neveddel. Ha valaki válaszol, a válasz hozzád érkezik, és te is kapsz másolatot.</p>
    <div class="toggles" style="grid-template-columns:1fr">${rows}</div>
    <div class="field"><label for="m-msg">Üzenet (nem kötelező)</label><textarea class="inp" id="m-msg" name="message" placeholder="pl. Reggel 7-kor találkozunk a raktárnál."></textarea></div>
    <div class="rolepick"><label><input type="checkbox" name="plan" checked> Technikai terv és jegyzetek csatolása</label></div>
    ${p.listSentAt?`<p class="hint" style="margin:0">Utoljára kiküldve: ${esc(p.listSentAt)} · ${esc(p.listSentTo||'')}</p>`:''}`,
  {submitLabel:'Küldés',submit:async fd=>{
    const to=fd.getAll('to');if(!to.length){toast('Válassz ki legalább egy címzettet.',true);return;}
    try{
      await SAVE_Q;   // a még folyamatban lévő mentés előbb érjen be, hogy a friss lista menjen ki
      const r=await call('sendEquipmentList',{projectId:p.id,recipients:to,message:String(fd.get('message')||'').trim(),includePlan:fd.get('plan')==='on'});
      [projById(p.id),S.draft].forEach(x=>{if(x){x.listSentAt=r.listSentAt;x.listSentTo=r.listSentTo;}});
      closeModal();render(true);toast('Eszközlista elküldve: '+r.names.join(', '));
    }catch(e){handleErr(e);}
  }});
}

/* ===== Projekt szerkesztése ===== */
function openProject(id){
  const p=projById(id);if(!p)return;
  S.tab='projektek';S.projectId=id;S.draft=prepDraft(p);S.dirty=false;histReset();S.addCrew={person:'',role:''};S.addEq={item:'',qty:1};
  closeModal();render(true);scrollTo(0,0);
}
/* Visszavonás / mégis (Ctrl/⌘+Z, Ctrl/⌘+Shift+Z vagy Ctrl+Y): a projekt vázlatáról pillanatképeket tartunk. */
const HIST={u:[],r:[],last:0,key:''};
function histReset(){HIST.u=[];HIST.r=[];HIST.last=0;HIST.key='';}
function histPush(){if(!S.draft)return;const s=JSON.stringify(S.draft);if(HIST.u[HIST.u.length-1]===s)return;HIST.u.push(s);if(HIST.u.length>150)HIST.u.shift();HIST.r=[];}
function histTyping(key){const now=Date.now();if(now-HIST.last>900||HIST.key!==key)histPush();HIST.last=now;HIST.key=key;}
function histStep(dir){
  if(!S.draft||ro())return;const from=dir<0?HIST.u:HIST.r,to=dir<0?HIST.r:HIST.u;if(!from.length){toast(dir<0?'Nincs mit visszavonni.':'Nincs mit újra végrehajtani.');return;}
  to.push(JSON.stringify(S.draft));S.draft=JSON.parse(from.pop());S.dirty=true;HIST.key='';try{document.activeElement&&document.activeElement.blur();}catch(e){}render(true);
}
function setDraft(patch){if(ro()||!S.draft)return;histPush();HIST.key='';Object.assign(S.draft,patch);if(('crew' in patch||'lead' in patch)&&!('fees' in patch))syncFeesWithCrew(S.draft);S.dirty=true;render(true);}
/* Beosztott munkatárs → sor a Pénzügyek táblázatában (név, feladat, napidíj × napok); a díjat ott lehet átírni.
   Ha valakit levesznek a projektről, a sora csak akkor törlődik, ha még nem írtak be díjat. */
/* Projekt megnyitásakor a már beosztott emberek sora is bekerül a díjtáblázatba (mentés csak a következő módosítással). */
function prepDraft(p){const d=clone(p);try{syncFeesWithCrew(d);}catch(e){}return d;}
/* Fix sorok a díjtáblázat végén: fuvar és étel. */
const FIXED_FEES=[['fuvar','Fuvar'],['etel','Étel'],['egyeb','']];   // az „egyéb” sor neve szabadon írható
function orderFees(fees){
  fees=fees.slice();FIXED_FEES.forEach(([k,n])=>{if(!fees.some(f=>f.kind==='fixed'&&f.key===k))fees.push({kind:'fixed',key:k,name:n,amount:'',rent:''});});
  return fees.filter(f=>f.kind!=='fixed').concat(FIXED_FEES.map(([k])=>fees.find(f=>f.kind==='fixed'&&f.key===k)));
}
function syncFeesWithCrew(d){
  if(!canSeeFees())return;
  const ids=[...crewIds(d)],days=rowDays(d);let fees=(d.fees||[]).map(f=>Object.assign({},f)),added=0;
  const rolesOf=id=>{const r=[];if(d.lead===id)r.push('Projektvezető');(d.crew||[]).forEach(a=>{if(a.crewId===id&&!r.includes(a.role))r.push(a.role);});return r.join(' + ');};
  ids.forEach(id=>{const c=crewById(id);let f=fees.find(x=>x.crewId===id)||fees.find(x=>!x.crewId&&c&&x.name===c.name);
    if(!f){fees.push({name:c?c.name:'',crewId:id,task:rolesOf(id),autoTask:true,amount:c&&num(c.dayRate)?num(c.dayRate)*days:'',rent:''});added++;}
    else{f.crewId=id;if(f.autoTask||!f.task)f.task=rolesOf(id),f.autoTask=true;}});
  fees=fees.filter(f=>!f.crewId||ids.includes(f.crewId)||num(f.amount)||num(f.rent));
  d.fees=orderFees(fees);
}
const rowDays=p=>{const r=pr(p);return r?diffDays(r.start,r.end)+1:1;};
function guard(fn){
  if(!S.dirty){fn();return;}
  confirmModal('Nem mentett módosítások','A projekten vannak el nem mentett módosítások. Elveted őket?','Elvetés',()=>{S.dirty=false;S.draft=S.projectId&&projById(S.projectId)?clone(projById(S.projectId)):null;fn();});
}
/* Mentés azonnal a felületen (optimista), a háttérben sorban küldjük a szervernek.
   Így nem kell megvárni az Apps Scriptet; ha a mentés mégsem sikerül, visszakapod a módosításokat és szólunk. */
let SAVE_Q=Promise.resolve();
const SAVE_PENDING={};
function saveDraft(){
  if(!S.draft||ro())return;
  const d=clone(S.draft);
  if(String(d.name||'').trim().length<2){toast('Add meg a projekt nevét.',true);return;}
  const i=S.projects.findIndex(x=>x.id===d.id),prev=i>=0?S.projects[i]:null;
  const local=Object.assign({},prev||{},d,{updatedAt:prev?prev.updatedAt:''});
  if(i>=0)S.projects[i]=local;else S.projects.push(local);
  S.dirty=false;S.saving=(S.saving||0)+1;SAVE_PENDING[d.id]=(SAVE_PENDING[d.id]||0)+1;
  S.cal.events={};S.savedFlash=1;clearTimeout(S._flashT);S._flashT=setTimeout(()=>{S.savedFlash=0;renderChrome();},500);render(true);
  SAVE_Q=SAVE_Q.then(async()=>{
    const payload=Object.assign({},d,{baseUpdatedAt:(projById(d.id)||{}).updatedAt||'',mutationId:uuid(),deferCal:true});
    try{
      let saved;for(let k=0;;k++){try{saved=await call('saveProject',payload);break;}
        catch(e){if(k<3&&/Zárol|lock/i.test(errText(e))){await new Promise(r=>setTimeout(r,1500*(k+1)));continue;}throw e;}}   // foglalt szerver: pár másodperc múlva újrapróbáljuk (ugyanaz a mutationId, nem duplikál)
      const newer=--SAVE_PENDING[d.id]>0;   // közben újabb mentés is indult erre a projektre
      const k=S.projects.findIndex(x=>x.id===d.id||x.id===saved.id);
      if(newer){if(k>=0)S.projects[k].updatedAt=saved.updatedAt;}
      else{if(k>=0)S.projects[k]=saved;else S.projects.push(saved);
        if(S.projectId===saved.id&&!S.dirty){S.draft=prepDraft(saved);render(true);}}   // a fix (üres) díjsorok is maradjanak meg
      S.cal.events={};syncCal(saved.id);
    }catch(e){
      SAVE_PENDING[d.id]--;
      if(S.projectId===d.id&&!S.dirty){S.draft=clone(d);S.dirty=true;}   // a módosítások ne vesszenek el
      const m=errText(e);
      if(m.indexOf('CONFLICT')===0){
        openModal('Közben módosult a projekt',`<p style="margin:0">Valaki más is elmentette ezt a projektet, amíg szerkesztetted. A te módosításaid csak itt vannak meg, ezért ha újratöltöd, elvesznek. Jegyezd fel, mit módosítottál, aztán töltsd újra a projektet.</p>`,{submitLabel:'Újratöltés',submit:async()=>{closeModal();S.dirty=false;await load(false);const p=projById(d.id);if(p)S.draft=clone(p);render(true);}});
      }else{toast('Nem sikerült menteni: '+m,true);}
    }finally{S.saving--;render(true);}
  });
  return SAVE_Q;
}
function personList(p,cid){
  const c=crewById(cid);const lines=[`Eszközlista – ${p.name||'Projekt'}`,`${fmtRange(p)}${p.venue?' · '+p.venue:''}${p.startTime?' · érkezés '+p.startTime:''}`,'',((c&&c.name)||'?').toUpperCase()];
  const mine=(p.equipment||[]).filter(e=>e.crewId===cid).map(e=>({e,it:itemById(e.itemId)})).filter(x=>x.it);
  rentalsOf(p,cid).forEach(r=>lines.push(`☐ ${r.name} (${r.own?'saját':'bérelt'+(r.company?', '+r.company:'')})`));
  if(!mine.length&&!rentalsOf(p,cid).length)lines.push('(nincs nála eszköz)');
  mine.forEach(({e,it})=>lines.push(`☐ ${num(e.qty)}× ${it.name}${it.serial?' ('+it.serial+')':''}${it.location?' – '+it.location:''}`));
  return lines.join('\n');
}
function packingList(p){
  const lines=[`Pakolási lista – ${p.name||'Projekt'}`,`${fmtRange(p)}${p.venue?' · '+p.venue:''}${p.startTime?' · érkezés '+p.startTime:''}`,''];
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
  catch(e){openModal('Másold ki',`<textarea class="inp copybox" id="copybox" readonly>${esc(t)}</textarea>`,{cancelLabel:'Bezárás'});const el=$('copybox');if(el){el.focus();el.select();}}
}
function arm(b,fn){
  if(b.dataset.armed){fn();return;}
  b.dataset.armed='1';const old=b.textContent;b.textContent='Biztosan? Kattints újra';b.classList.add('armed');
  setTimeout(()=>{if(b.isConnected){delete b.dataset.armed;b.textContent=old;b.classList.remove('armed');}},4000);
}

/* ===== Események ===== */
const ACT={
  tab:b=>guard(()=>{const fp=b.dataset.focus&&S.draft&&pr(S.draft);S.cal.focus=fp||null;if(fp)S.cal.month=fp.start.slice(0,7);S.tab=b.dataset.tab;S.projectId=null;S.draft=null;if(S.tab==='beallitasok'){S.users=null;S.log=null;}closeModal();render(true);scrollTo(0,0);}),
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
  'toggle-user':async b=>{const dis=b.dataset.dis==='1';const u=(S.users||[]).find(x=>x.id===b.dataset.id);if(!u)return;
    const go=async()=>{try{S.users=await call('setUserDisabled',{id:u.id,disabled:dis});refreshLog();render(true);toast(dis?u.name+' letiltva – nem tud belépni':u.name+' újra beléphet');}catch(e){handleErr(e);}};
    if(dis)confirmModal('Letiltás',`${u.name} nem tud többé belépni, és minden eszközön azonnal kilép. Később újra engedélyezheted.`,'Letiltás',()=>{closeModal();go();});else go();},
  'edit-user':b=>{const u=(S.users||[]).find(x=>x.id===b.dataset.id);if(u)userModal(u);},
  'reload-log':async()=>{try{S.log=await call('getLog');render(true);}catch(e){handleErr(e);}},
  'del-crew':b=>arm(b,async()=>{try{await call('deleteCrew',{id:b.dataset.id});S.crew=S.crew.filter(c=>c.id!==b.dataset.id);closeModal();await load(true);toast('Munkatárs törölve');}catch(e){handleErr(e);}}),
  'del-item':b=>arm(b,async()=>{try{await call('deleteItem',{id:b.dataset.id});S.inventory=S.inventory.filter(i=>i.id!==b.dataset.id);closeModal();await load(true);toast('Eszköz törölve');}catch(e){handleErr(e);}}),
  'del-user':b=>arm(b,async()=>{try{S.users=await call('deleteUser',{id:b.dataset.id});refreshLog();closeModal();render(true);toast('Felhasználó törölve');}catch(e){handleErr(e);}}),
  'modal-close':()=>closeModal(),
  'modal-bg':(b,e)=>{if(e.target===b)closeModal();},
  save:()=>saveDraft(),
  discard:()=>{histPush();const p=projById(S.projectId);S.draft=p?clone(p):null;S.dirty=false;render(true);toast('Módosítások elvetve');},
  stage:b=>{const d=S.draft;if(!d||ro())return;
    const v=b.dataset.v,go=()=>{
      if(v==='atadva'&&needsDelivery(S.draft)){deliveryModal();return;}   // videós anyagnál felugró Átadás ablak (link kötelező)
      if(S.draft.status===v)return;
      setDraft({status:v,deliveredAt:v==='atadva'?(S.draft.deliveredAt||todayISO()):''});};
    if(['helyszin','utomunka','atadva'].includes(v)&&d.status!==v&&!d.siteOk){siteModal(go);return;}   // előbb a helyszíni beszámoló
    go();},
  'site-report':()=>siteModal(null),
  'proj-manage':()=>{const p=S.draft;if(!p)return;
    openModal('Projekt kezelése',`<div class="fields" style="margin-bottom:14px">${mf('name','Projekt neve',{full:true,v:p.name||'',max:120})}</div><div class="btns" style="margin-bottom:10px">${p.folderId?`<a class="btn outline small" href="${esc(driveUrl(p.folderId))}" target="_blank" rel="noopener">📁 Projektmappa megnyitása ↗</a>`:`<button class="btn outline small" type="button" data-action="make-folder">📁 Projektmappa létrehozása</button>`}</div><div class="btns"><button class="btn outline small" type="button" data-action="cancel-toggle">${p.status==='lemondva'?'Visszaállítás':'Projekt lemondása'}</button><button class="btn danger small" type="button" data-action="del-project">Projekt törlése</button></div>
      ${p.updatedAt?`<p class="hint">Utoljára mentve: ${esc(p.updatedAt)}${p.updatedBy?' · '+esc(p.updatedBy):''}</p>`:''}`,{cancelLabel:'Bezárás',submitLabel:'Átnevezés',submit:async fd=>{
      const name=String(fd.get('name')||'').trim().replace(/\s+/g,' ');if(name.length<2){toast('Add meg a projekt nevét.',true);return;}
      closeModal();if(name===S.draft.name&&!S.dirty)return;setDraft({name});saveDraft();toast('Átnevezve – a Google Naptárban is frissül');}});},
  'cancel-toggle':()=>{closeModal();const d=S.draft;if(!d)return;if(d.status==='lemondva')setDraft({status:d.prevStatus||'egyeztetes'});else setDraft({status:'lemondva',prevStatus:d.status||'egyeztetes'});},
  'del-project':b=>arm(b,async()=>{const id=S.projectId;try{await SAVE_Q;await call('deleteProject',{id});S.cal.events={};S.projects=S.projects.filter(p=>p.id!==id);closeModal();S.projectId=null;S.draft=null;S.dirty=false;render(true);toast('Projekt törölve');}catch(e){handleErr(e);}}),
  'foto-step':b=>{const d=S.draft;if(!d)return;const cur=fotoDb(d),up=Number(b.dataset.d)>0;let n=up?(cur?cur+FOTO_STEP:FOTO_DEF):cur-FOTO_STEP;n=Math.max(0,Math.min(FOTO_MAX,n));setDraft({foto_db:n,x_foto:n>0});},
  'rec-step':b=>{const d=S.draft;if(!d)return;const it=REC_COUNTS.find(x=>x.k===b.dataset.k);if(!it)return;const cur=num(d[it.k]),n=Math.min(it.max,Math.max(it.min,cur+Number(b.dataset.d)));setDraft((it.k==='er_clips'||it.k==='er_subs')&&n>0?{[it.k]:n,er_post:true}:{[it.k]:n});},
  dlv:b=>{const d=S.draft;if(!d)return;const it=DELIVERABLES.find(x=>x.k===b.dataset.k);setDraft({[it.k]:Math.min(it.max,Math.max(0,num(d[it.k])+Number(b.dataset.d)))});},
  'view-reset':()=>guard(()=>switchView('admin')),
  'crew-person-remove':b=>{const d=S.draft;if(!d)return;const id=b.dataset.id,c=crewById(id);
    const crew=(d.crew||[]).filter(a=>a.crewId!==id);let moved=0;const equipment=(d.equipment||[]).map(e=>{if(e.crewId===id){moved++;return Object.assign({},e,{crewId:''});}return e;});
    const fees=(d.fees||[]).filter(f=>f.crewId!==id);const crewNotes=Object.assign({},d.crewNotes||{});delete crewNotes[id];
    setDraft({crew,lead:d.lead===id?'':d.lead,equipment,fees,crewNotes});toast((c?c.name:'Munkatárs')+' lekerült a projektről'+(moved?', az eszközei a Közös eszközökhöz kerültek':'')+'. Ctrl/⌘+Z visszahozza.');},
  'eq-open':b=>{FOLD['eq_'+b.dataset.id]=true;render(true);},
  'rent-remove':b=>{const d=S.draft;if(!d)return;setDraft({rentals:(d.rentals||[]).filter(r=>r.id!==b.dataset.id)});},
  'undo':()=>histStep(-1),
  'redo':()=>histStep(1),
  'fee-add':()=>{const d=S.draft;if(!d)return;FOLD.fin=true;setDraft({fees:(d.fees||[]).concat([{name:'',crewId:'',task:'',gear:'',amount:'',rent:''}])});},
  'fee-remove':b=>{const d=S.draft;if(!d)return;const fees=(d.fees||[]).slice();fees.splice(Number(b.dataset.i),1);setDraft({fees});},
  'fee-fill':()=>{const d=S.draft;if(!d)return;const r=pr(d),days=r?diffDays(r.start,r.end)+1:1;const fees=(d.fees||[]).slice();let n=0;
    [...crewIds(d)].forEach(id=>{const c=crewById(id);if(!c||fees.some(f=>f.crewId===id||f.name===c.name))return;
      const roles=[];if(d.lead===id)roles.push('Projektvezető');(d.crew||[]).forEach(a=>{if(a.crewId===id)roles.push(a.role);});
      const gear=(d.equipment||[]).filter(e=>e.crewId===id).map(e=>{const it=itemById(e.itemId);return it?(num(e.qty)>1?e.qty+'× ':'')+it.name:'';}).filter(Boolean).join(', ');
      fees.push({name:c.name,crewId:id,task:roles.join(' + '),amount:num(c.dayRate)?num(c.dayRate)*days:'',gear,rent:''});n++;});
    if(!n){toast(crewIds(d).size?'Minden beosztott szerepel már a listában.':'Előbb osszál be stábot a projektre.',true);return;}
    setDraft({fees});toast(n+' tétel felvéve'+(days>1?' ('+days+' napra)':''));},
  'due-reset':()=>{if(S.draft)setDraft({dueAt:''});},
  'due-custom':()=>{const d=S.draft;if(!d)return;const r=pr(d);if(!r){toast('Előbb add meg a dátumot.',true);return;}setDraft({dueAt:addDays(r.end,1)});},
  'crew-add':()=>{const d=S.draft;if(!d)return;const id=S.addCrew.person;if(!id){toast('Válassz munkatársat.',true);return;}
    const role=$('add-crew-role').value;const crew=clone(d.crew||[]);
    if(crew.some(a=>a.crewId===id&&a.role===role)){toast('Már be van osztva ebben a szerepben.',true);return;}
    crew.push({crewId:id,role});S.addCrew={person:'',role:''};setDraft({crew});},
  'crew-remove':b=>{const d=S.draft;const crew=clone(d.crew||[]);const gone=crew.splice(Number(b.dataset.i),1)[0];let equipment=d.equipment||[];
    if(gone&&gone.crewId!==d.lead&&!crew.some(a=>a.crewId===gone.crewId)&&equipment.some(e=>e.crewId===gone.crewId)){equipment=clone(equipment).map(e=>e.crewId===gone.crewId?Object.assign(e,{crewId:''}):e);toast('A nála lévő eszközök a Közös eszközökhöz kerültek.');}
    setDraft({crew,equipment});},
  'eq-add':b=>{const d=S.draft;if(!d)return;const key=b.dataset.crew||'',sk=key||'common';const sel=$('add-eq-item-'+sk),qel=$('add-eq-qty-'+sk);const id=sel&&sel.value;if(!id){toast('Válassz eszközt.',true);if(sel)sel.focus();return;}
    const qty=Math.max(1,Math.round(num(qel&&qel.value)||1));const equipment=clone(d.equipment||[]);
    const ex=equipment.find(e=>e.itemId===id&&(e.crewId||'')===key);if(ex)ex.qty=num(ex.qty)+qty;else equipment.push({itemId:id,qty,crewId:key});
    setDraft({equipment});},
  'eq-remove':b=>{const equipment=clone(S.draft.equipment||[]);equipment.splice(Number(b.dataset.i),1);setDraft({equipment});},
  'send-list':()=>sendListModal(),
  'cal-nav':b=>{const d=Number(b.dataset.d);if(!d)S.cal.month=todayISO().slice(0,7);else{const [y,m]=S.cal.month.split('-').map(Number);const n=new Date(Date.UTC(y,m-1+d,1));S.cal.month=n.toISOString().slice(0,7);}render(true);},
  'cal-retry':()=>{delete S.cal.err[S.cal.month];delete S.cal.events[S.cal.month];render(true);},
  'cal-event':b=>calEventModal(b.dataset.id),
  'cal-day':b=>{const d=b.dataset.d,its=calItems(S.cal.month).filter(it=>it.date<=d&&it.endDate>=d);openModal(F_FULL.format(toDate(d)),`<div class="cal-daylist">${its.map(it=>calChip(it,d)).join('')}</div>`,{cancelLabel:'Bezárás'});},
  'cal-import':b=>importCalEvent(b.dataset.id),
  'cal-new':b=>calFormModal(null,b.dataset.d||''),
  'cal-edit':b=>{const e=calEventById(b.dataset.id);if(e)calFormModal(e);},
  'cal-del':b=>arm(b,async()=>{try{await call('deleteCalEvent',{id:b.dataset.id});S.cal.events={};closeModal();render(true);toast('Bejegyzés törölve');}catch(e){handleErr(e);}}),
  'money-step':b=>{const el=$(b.dataset.for);if(!el)return;const cur=Number(moneyVal(el.value)||0);const n=Math.max(0,Math.min(MONEY_MAX,(Math.round(cur/MONEY_STEP)+Number(b.dataset.d))*MONEY_STEP));el.value=moneyFmt(n);el.focus();},
  'copy-pack':()=>{if(S.draft)copyText(packingList(S.draft),'Pakolási lista a vágólapon');},
  'make-folder':async b=>{const d=S.draft;if(!d)return;b.disabled=true;b.textContent='Mappa létrehozása…';
    try{const r=await call('createProjectFolder',{id:d.id});const p=projById(d.id);if(p)p.folderId=r.folderId;d.folderId=r.folderId;render(true);if($('modalRoot').innerHTML)ACT['proj-manage']();toast(r.existed?'A mappa már létezett':'Projektmappa létrehozva');}
    catch(e){handleErr(e);b.disabled=false;b.textContent='📁 Projektmappa létrehozása';}},
  copy:b=>copyText(b.dataset.text),
  'tax-lookup':()=>taxLookup(),
  'nav-search':()=>{const n=$('m-client'),q=n?n.value.trim():'';if(q){try{navigator.clipboard.writeText(q);}catch(e){}}
    window.open('https://nav.gov.hu/adatbazisok/multilekerdezo','_blank','noopener');
    toast(q?'A NAV keresője új lapon nyílt meg, a cégnév a vágólapon van – illeszd be, majd másold vissza az adószámot.':'A NAV keresője új lapon nyílt meg – keresd meg a céget, és másold vissza az adószámot.');const t=$('m-clientTax');if(t)t.focus();},
  'client-edit':()=>editClientModal(),
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const fn=ACT[b.dataset.action];if(fn)fn(b,e);});
function fieldValue(t){
  const k=t.dataset.field;
  if(t.type==='number'){if(t.value==='')return k==='hours'?8:null;const n=Math.round(num(t.value));return k==='hours'?Math.min(16,Math.max(1,n)):Math.max(0,n);}
  return t.value;
}
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.dataset.crewNote!==undefined&&S.draft&&!ro()){histTyping('note|'+t.dataset.crewNote);const n=Object.assign({},S.draft.crewNotes||{});if(t.value.trim())n[t.dataset.crewNote]=t.value;else delete n[t.dataset.crewNote];S.draft.crewNotes=n;if(!S.dirty){S.dirty=true;renderChrome();}return;}
  if(S.draft&&!ro()&&(t.dataset.field!==undefined||t.dataset.feeI!==undefined||t.dataset.fin))histTyping((t.dataset.field||'')+'|'+(t.dataset.feeI||'')+'|'+(t.dataset.feeK||'')+'|'+(t.dataset.fin||''));
  if(t.dataset.field!==undefined&&S.draft&&!ro()&&t.tagName!=='SELECT'){S.draft[t.dataset.field]=t.type==='number'?(t.value===''?null:num(t.value)):t.value;if(!S.dirty){S.dirty=true;renderChrome();}return;}
  if((t.dataset.feeI!==undefined||t.dataset.fin)&&S.draft&&!ro()){
    const val=num(S.draft.projectValue);
    if(t.dataset.fin==='budgetPct'){let v=String(t.value).replace(/[^\d,.]/g,'').replace('.',',');if(t.value!==v)t.value=v;const n=parseFloat(v.replace(',','.'));
      S.draft.budgetMode=v===''?'':'pct';S.draft.budgetVal=v===''||!isFinite(n)?'':Math.min(100,n);const o=$('f-budgetFt');if(o)o.value=S.draft.budgetVal!==''&&val>0?moneyFmt(Math.round(val*S.draft.budgetVal/100)):'';}
    else if(t.dataset.fin==='budgetFt'){const dg=String(t.value).replace(/\D/g,'');S.draft.budgetMode=dg===''?'':'ft';S.draft.budgetVal=dg===''?'':Math.min(9999999999,Number(dg));const o=$('f-budgetPct');if(o)o.value=dg!==''&&val>0?String(Math.round(S.draft.budgetVal/val*1000)/10).replace('.',','):'';}
    else if(t.dataset.fin==='projectValue'){const dg=String(t.value).replace(/\D/g,'');S.draft.projectValue=dg===''?null:Math.min(9999999999,Number(dg));const nv=num(S.draft.projectValue);
      if(S.draft.budgetMode==='pct'){const o=$('f-budgetFt');if(o)o.value=nv>0&&S.draft.budgetVal!==''?moneyFmt(Math.round(nv*S.draft.budgetVal/100)):'';}else if(S.draft.budgetMode==='ft'){const o=$('f-budgetPct');if(o)o.value=nv>0?String(Math.round(num(S.draft.budgetVal)/nv*1000)/10).replace('.',','):'';}}

    else{const fees=S.draft.fees=(S.draft.fees||[]).map(x=>Object.assign({},x)),f=fees[Number(t.dataset.feeI)];if(f){const k=t.dataset.feeK;
      if(k==='amount'||k==='rent')f[k]=moneyVal(t.value);else{f[k]=t.value;if(k==='name'){const c=S.crew.find(x=>x.name===t.value.trim());f.crewId=c?c.id:'';}}}}
    if(!S.dirty){S.dirty=true;renderChrome();}
    const fa=document.querySelector('.fin-aside');if(fa)fa.innerHTML=finAside(S.draft);
    {const kr=document.querySelectorAll('.keret-tr');if(kr.length===2){const tmp=document.createElement('tbody');tmp.innerHTML=keretRows(S.draft);kr[0].replaceWith(tmp.children[0]);kr[1].replaceWith(tmp.children[0]);}}
    const fsum=k=>(S.draft.fees||[]).reduce((s,f)=>s+num(f[k]),0),ea=document.querySelector('.fin-amt'),er=document.querySelector('.fin-rent');
    if(ea)ea.innerHTML=totalCell(S.draft);if(er)er.textContent=moneyFmt((S.draft.fees||[]).reduce((a,f)=>a+rentOf(S.draft,f),0)+rentalSum(S.draft,''))||0;
  }
  if(t.dataset.money==='big'){const pos=t.value.length-t.selectionStart;const d=String(t.value).replace(/\D/g,'');t.value=d===''?'':moneyFmt(Math.min(9999999999,Number(d)));try{const p=Math.max(0,t.value.length-pos);t.setSelectionRange(p,p);}catch(e){}return;}
  if(t.dataset.money){const pos=t.value.length-t.selectionStart;const v=moneyVal(t.value);t.value=moneyFmt(v);try{const p=Math.max(0,t.value.length-pos);t.setSelectionRange(p,p);}catch(e){}return;}
  if(t.id==='q-projects'){S.pf.q=t.value;render(true);}
  else if(t.id==='q-crew'){S.cf.q=t.value;render(true);}
  else if(t.id==='q-inv'){S.inf.q=t.value;render(true);}
  else if(t.id==='add-eq-qty'){S.addEq.qty=t.value;}
});
/* telefonmező: országhívószám + szám → egy érték */
function phSync(row,commit){const v=phJoin(row.querySelector('.ph-cc').value,row.querySelector('.ph-num').value),[kind,k]=row.dataset.ph.split(':');
  if(kind==='n'){const h=row.querySelector('input[type=hidden]');if(h)h.value=v;}else if(commit&&S.draft&&(S.draft[k]||'')!==v)setDraft({[k]:v});}
document.addEventListener('input',e=>{const r=e.target.closest&&e.target.closest('.phone-row');if(r)phSync(r,false);});
document.addEventListener('change',e=>{
  const t=e.target,d=S.draft;
  {const r=t.closest&&t.closest('.phone-row');if(r){if(t.tagName==='SELECT')try{t.blur();}catch(_){}phSync(r,true);return;}}
  if(t.tagName==='SELECT'&&t.id!=='viewAs')try{t.blur();}catch(_){}   // tableten (iPad) a kiválasztás után zárjuk be a listát
  if(t.dataset.clientSel&&d){if(t.value==='__new'){t.value=d.client||'';newClientModal();return;}
    const it=knownClients('').find(c=>c.company===t.value),patch={client:t.value,clientTax:it?it.tax:'',clientAddress:it?it.address:''};if(it&&(it.name||it.phone||it.email)){patch.contactName=it.name;patch.contactPhone=it.phone;patch.contactEmail=it.email;}setDraft(patch);return;}
  if(t.id==='m-clientSel'){const n=$('m-clientNew');if(n){const on=t.value==='__new';n.style.display=on?'':'none';if(on)$('m-clientTax').focus();}return;}
  if(t.dataset.field!==undefined&&d){setDraft({[t.dataset.field]:fieldValue(t)});return;}
  if(t.dataset.flag&&d){const k=t.dataset.flag,ch={[k]:t.checked};
    if(t.checked&&(REC_CAMS.some(c=>c.k===k)||REC_LIVE.some(c=>c.k===k))&&!num(d.er_rooms))ch.er_rooms=1;   // rögzítési opció → legalább 1 terem
    setDraft(ch);return;}
  if(t.dataset.multi&&d){if(t.checked){d._multi=true;setDraft({endDate:d.endDate||(validISO(d.date)?addDays(d.date,1):'')});setTimeout(()=>{const e=$('f-endDate');if(e)e.focus();},0);}else{d._multi=false;setDraft({endDate:''});}return;}
  if((t.dataset.feeI!==undefined||t.dataset.fin)&&d)return;
  if(t.dataset.stepK&&d){const k=t.dataset.stepK,min=num(t.dataset.min),max=num(t.dataset.max);let n=parseInt(String(t.value).replace(/\D/g,''),10);if(!isFinite(n))n=min;n=Math.max(min,Math.min(max,n));
    setDraft(k==='foto_db'?{foto_db:n,x_foto:n>0}:(k==='er_clips'||k==='er_subs')&&n>0?{[k]:n,er_post:true}:{[k]:n});return;}
  if(t.dataset.crewAddrole!==undefined&&d){if(!t.value)return;const crew=clone(d.crew||[]);if(!crew.some(a=>a.crewId===t.dataset.crewAddrole&&a.role===t.value))crew.push({crewId:t.dataset.crewAddrole,role:t.value});setDraft({crew});return;}
  if(t.dataset.crewRole!==undefined&&d){const crew=clone(d.crew||[]);crew[Number(t.dataset.crewRole)].role=t.value;setDraft({crew});return;}
  if(t.dataset.eqI!==undefined&&d){const q=Math.max(1,Math.round(num(t.value)||1));const equipment=clone(d.equipment||[]);const ex=equipment[Number(t.dataset.eqI)];if(ex){ex.qty=q;setDraft({equipment});}return;}
  if(t.id==='add-crew-role'){S.addCrew.role=t.value;render(true);setTimeout(()=>{const e=$('add-crew-person');if(e)e.focus();},30);return;}
  if(t.id==='add-crew-person'&&d){const id=t.value;if(!id)return;const role=$('add-crew-role').value||'Operatőr';const c=crewById(id);
    if(role==='Projektvezető'){setDraft({lead:id});toast((c?c.name:'')+' projektvezető');return;}
    const crew=clone(d.crew||[]);if(crew.some(a=>a.crewId===id&&a.role===role)){toast('Már be van osztva ebben a szerepben.',true);render(true);return;}
    crew.push({crewId:id,role});setDraft({crew});toast((c?c.name:'')+' beosztva: '+role);return;}
  if(t.dataset.eqAuto!==undefined&&d&&t.value==='__rent'){const key=t.dataset.eqAuto;t.value='';rentalModal(key);return;}
  if(t.dataset.eqAuto!==undefined&&d&&t.value==='__own'){const key=t.dataset.eqAuto;t.value='';ownGearModal(key);return;}
  if(t.dataset.eqAuto!==undefined&&d){const id=t.value;if(!id)return;const key=t.dataset.eqAuto,equipment=clone(d.equipment||[]);const ex=equipment.find(e=>e.itemId===id&&(e.crewId||'')===key);
    if(ex)ex.qty=num(ex.qty)+1;else equipment.push({itemId:id,qty:1,crewId:key});setDraft({equipment});return;}
  if(t.id==='add-eq-item'){S.addEq.item=t.value;return;}
  if(t.id==='crew-role-filter'){S.cf.role=t.value;render(true);return;}
  if(t.id==='inv-cat'){S.inf.cat=t.value;render(true);return;}
  if(t.id==='inv-cond'){S.inf.cond=t.value;render(true);return;}
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.classList&&e.target.classList.contains('step-in')){e.preventDefault();e.target.blur();return;}
  if((e.ctrlKey||e.metaKey)&&S.draft&&S.projectId&&S.tab==='projektek'&&!ro()&&!$('modalRoot').innerHTML){const k=e.key.toLowerCase();
    if(k==='z'&&!e.shiftKey){e.preventDefault();histStep(-1);return;}
    if((k==='z'&&e.shiftKey)||k==='y'){e.preventDefault();histStep(1);return;}}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'&&S.dirty){e.preventDefault();saveDraft();}});

/* ===== Indítás ===== */
if(TOKEN){const fast=bootFromCache();load(fast);}else{VIEW.innerHTML='';showLogin('');}

/* Pénzügyek táblázat: oszlopszélesség húzással (egér és érintés), böngészőnként megjegyezve; dupla kattintás visszaállítja. */
document.addEventListener('pointerdown',e=>{
  const g=e.target.closest&&e.target.closest('.col-grip');if(!g)return;
  e.preventDefault();e.stopPropagation();
  const table=g.closest('table'),cols=[...table.querySelectorAll('col')],i=Number(g.dataset.col),startX=e.clientX;
  const widths=cols.map(c=>Math.round(c.getBoundingClientRect().width)||parseInt(c.style.width,10));const startW=widths[i];
  cols.forEach((c,k)=>c.style.width=widths[k]+'px');table.style.width=widths.reduce((a,b)=>a+b,0)+'px';table.style.minWidth='0';
  document.body.classList.add('col-resizing');
  const move=ev=>{const w=Math.max(40,Math.round(startW+ev.clientX-startX));widths[i]=w;cols[i].style.width=w+'px';table.style.width=widths.reduce((a,b)=>a+b,0)+'px';};
  const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);document.body.classList.remove('col-resizing');try{localStorage.setItem('lpm_fin_cols',JSON.stringify(widths));}catch(err){}};
  document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);
});
document.addEventListener('dblclick',e=>{const g=e.target.closest&&e.target.closest('.col-grip');if(!g)return;try{localStorage.removeItem('lpm_fin_cols');}catch(err){}render(true);});
