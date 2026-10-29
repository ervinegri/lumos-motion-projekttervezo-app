'use strict';
/* ===== Ablakok ===== */
let modalSubmit=null,MD_KEY='';
/* Félbehagyott ablakok: amit beírtál, megmarad (bezárás, frissítés, másik munkamenet után is); a „Mégse” vagy a sikeres mentés törli. */
const mdKey=title=>'lpm_md_'+title+'|'+((S.draft&&S.draft.id)||S.tab||'');
function mdSave(){if(!MD_KEY)return;const f=$('mform');if(!f)return;const o={};
  f.querySelectorAll('input[name],textarea[name],select[name]').forEach(el=>{if(el.type==='hidden'||el.type==='password'||el.type==='file')return;const n=el.name;
    if(el.type==='checkbox'){(o[n]=o[n]||{c:[]}).c.push(el.checked?el.value:null);}else if(el.type==='radio'){if(el.checked)o[n]={v:el.value};else if(!o[n])o[n]={v:null};}else o[n]={v:el.value};});
  try{localStorage.setItem(MD_KEY,JSON.stringify(o));}catch(e){}}
function mdClear(k){try{localStorage.removeItem(k||MD_KEY);}catch(e){}}
function mdRestore(key){let o=null;try{o=JSON.parse(localStorage.getItem(key)||'null');}catch(e){}if(!o)return;const f=$('mform');if(!f||MD_KEY!==key)return;
  Object.entries(o).forEach(([n,x])=>{const els=[...f.querySelectorAll(`[name="${CSS.escape(n)}"]`)];if(!els.length)return;
    els.forEach((el,i)=>{let ch=false;if(el.type==='checkbox'){if(x.c){const v=x.c.includes(el.value);if(el.checked!==v){el.checked=v;ch=true;}}}
      else if(el.type==='radio'){if(x.v!=null&&el.value===x.v&&!el.checked){el.checked=true;ch=true;}}else if(x.v!=null&&el.value!==x.v){el.value=x.v;ch=true;}
      if(ch){el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}});});}
document.addEventListener('input',e=>{if(MD_KEY&&e.target.closest&&e.target.closest('#mform')){clearTimeout(mdSave._t);mdSave._t=setTimeout(mdSave,300);}});
document.addEventListener('change',e=>{if(MD_KEY&&e.target.closest&&e.target.closest('#mform'))setTimeout(mdSave,0);});
function openModal(title,body,{submit,submitLabel='Mentés',left='',cancelLabel='Mégse'}={}){
  modalSubmit=submit||null;MD_KEY=submit?mdKey(title):'';
  $('modalRoot').innerHTML=`<div class="modal" data-action="modal-bg"><form class="mbox" id="mform" role="dialog" aria-modal="true" aria-label="${esc(title)}" novalidate>
    <div class="mhead"><h3>${esc(title)}</h3><button type="button" class="x" data-action="modal-close" aria-label="Bezárás">×</button></div>
    ${body}
    <div class="mfoot">${left?`<span class="left">${left}</span>`:''}<button type="button" class="btn outline" data-action="${submit?'modal-cancel':'modal-close'}">${esc(cancelLabel)}</button>${submit?`<button type="submit" class="btn primary">${esc(submitLabel)}</button>`:''}</div></form></div>`;
  document.documentElement.style.overflow='hidden';
  const first=$('modalRoot').querySelector('input:not([type=checkbox]):not([type=radio]),textarea,select');if(first)first.focus();
  if(MD_KEY){const k=MD_KEY;setTimeout(()=>mdRestore(k),0);}
}
/* ⌘/Ctrl + Enter: a felugró ablak fő gombja (Tovább / Mentés / Felvétel …), szövegmezőből is */
document.addEventListener('keydown',e=>{if(e.key!=='Enter'||!(e.metaKey||e.ctrlKey)||e.isComposing)return;const f=$('mform');if(!f||!modalSubmit)return;
  const b=f.querySelector('button[type=submit]');if(!b||b.disabled)return;e.preventDefault();if(f.requestSubmit)f.requestSubmit(b);else b.click();});
function closeModal(){if(MD_KEY&&$('mform'))mdSave();$('modalRoot').innerHTML='';modalSubmit=null;MD_KEY='';document.documentElement.style.overflow='';}
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
  const e=calEventById(id);if(!e)return;S._calEv=e;   // az ablak nyitva tartása alatt a naptár frissülhet – megjegyezzük az eseményt
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
  const ql=q.toLowerCase(),seen={},out=[];
  (S.clients||[]).forEach(r=>{const c=String(r.name||'').trim();if(!c)return;const k=c.toLowerCase();if(seen[k]||(ql&&k.indexOf(ql)<0))return;
    seen[k]=1;out.push({id:r.id,company:c,name:r.contactName||'',phone:r.contactPhone||'',email:r.contactEmail||'',tax:r.tax||'',address:r.address||'',note:r.note||''});});
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
async function saveClientRec(rec){
  const saved=await call('saveClient',rec);S.clients=(S.clients||[]).filter(x=>x.id!==saved.id&&x.id!==rec.id).concat([saved]);
  if(rec.oldName&&saved.renamed){const o=rec.oldName.trim().toLowerCase();S.projects.forEach(p=>{if(String(p.client||'').trim().toLowerCase()===o)p.client=saved.name;});}
  if(S.tab==='ugyfelek')render(true);return saved;
}
function editClientModal(){
  const d=S.draft;if(!d)return;newClientModal(null,d);
}
/* HubSpot: kapcsolattartó keresése; üres keresőnél az ügyfél cégéhez kapcsolt kapcsolatok */
function hubspotModal(){
  const d=S.draft;if(!d)return;
  openModal('Kapcsolattartó a HubSpotból',`<div class="field"><label for="m-hsq">Keresés (név, e-mail, cég)</label><input class="inp" id="m-hsq" autocomplete="off" placeholder="pl. Fehér Melinda"></div><div id="hsList" class="hs-list"><p class="hint">Keresés…</p></div>`,{cancelLabel:'Bezárás'});
  hsSearch('');
}
let HS_T=0,HS_SEQ=0;
async function hsInline(){   // az Új ügyfél / Ügyfél adatai ablakban: a beírt név vagy a cégnév alapján
  const box=$('hsInline');if(!box||box.style.display==='none')return;const my=++HS_SEQ;
  const q=($('m-contactName')||{}).value||'',client=($('m-client')||{}).value||'';
  if(q.trim().length<2&&client.trim().length<2){box.innerHTML='<p class="hint">Írd be a cégnevet vagy a kapcsolattartó nevét, és itt megjelennek a HubSpot-találatok.</p>';return;}
  box.innerHTML='<p class="hint">Keresés a HubSpotban…</p>';
  try{const r=await call('hubspotContacts',q.trim().length>=2?{q:q.trim()}:{q:'',client:client.trim()});if(my!==HS_SEQ||!$('hsInline'))return;S._hsi=r||[];
    $('hsInline').innerHTML=S._hsi.length?S._hsi.map((c,i)=>`<button type="button" class="hs-item" data-action="hs-ipick" data-i="${i}"><b>${esc(c.name)}</b><small>${esc([c.company,c.title,c.phone,c.email].filter(Boolean).join(' · '))}</small></button>`).join(''):'<p class="hint">Nincs találat a HubSpotban.</p>';}
  catch(e){if($('hsInline'))$('hsInline').innerHTML=`<p class="hint bad-txt">${esc(errText(e))}</p>`;}
}
async function hsSearch(q){
  const box=$('hsList');if(!box)return;const my=++HS_SEQ;box.innerHTML='<p class="hint">Keresés…</p>';
  try{const r=await call('hubspotContacts',{q,client:(S.draft&&S.draft.client)||''});if(my!==HS_SEQ||!$('hsList'))return;S._hs=r||[];
    $('hsList').innerHTML=S._hs.length?S._hs.map((c,i)=>`<button type="button" class="hs-item" data-action="hs-pick" data-i="${i}"><b>${esc(c.name)}</b><small>${esc([c.company,c.title,c.phone,c.email].filter(Boolean).join(' · '))}</small></button>`).join('')
      :`<p class="hint">${q?'Nincs találat.':'Az ügyfél cégéhez nincs kapcsolattartó a HubSpotban – keress név vagy e-mail alapján.'}</p>`;}
  catch(e){if($('hsList'))$('hsList').innerHTML=`<p class="hint bad-txt">${esc(errText(e))}</p>`;}
}
document.addEventListener('input',e=>{if(e.target.id==='m-contactName'||e.target.id==='m-client'){clearTimeout(HS_T);HS_T=setTimeout(hsInline,400);}if(e.target.id==='m-hsq'){clearTimeout(HS_T);const v=e.target.value.trim();HS_T=setTimeout(()=>hsSearch(v.length>=2?v:''),350);}});
/* ===== Díjcsökkentés ===== */
function penApply(pid,list){const p=projById(pid);if(p)p.penalties=list;if(S.draft&&S.draft.id===pid)S.draft.penalties=list;render(true);}
function penCaseOpts(kind,name){const k=PEN_KINDS[kind];   // több eset is bejelölhető
  return (k?k.cases:[]).concat(['Egyéb (az indoklásban leírva)']).map(c=>`<label class="pen-case-o"><input type="checkbox" name="${name}" value="${esc(c)}"><span>${esc(c)}</span></label>`).join('');}
function penModal(cid){
  const d=S.draft;if(!d)return;const c=crewById(cid),f=(d.fees||[]).find(x=>x.crewId===cid),fee=f?num(f.amount):0;
  if(S.dirty){toast('Előbb mentsd el a projekt módosításait.',true);return;}
  openModal('Díjcsökkentés – '+(c?c.name:'munkatárs'),`<p class="hint" style="margin:0 0 10px">A megbízási szerződés minőségi melléklete szerint. Díj ezen a projekten: <b>${ftFmt(fee)}</b>.${isAdmin()?'':' A díjcsökkentés az ügyvezető jóváhagyása után lép érvénybe.'}</p>
    <div class="fields">
      <div class="field full"><label for="m-penKind">Kategória</label><select class="inp" id="m-penKind" name="kind">${Object.entries(PEN_KINDS).map(([k,v])=>`<option value="${k}">${esc(v.label)}${v.pct!=null?' – '+v.pct+'%':v.min?' – '+v.min+'–'+v.max+'%':' – összeg Ft-ban'} (${v.ref} pont)</option>`).join('')}</select></div>
      <div class="field" id="m-penPctF" style="display:none"><label for="m-penPct">Mérték</label><select class="inp" id="m-penPct" name="pct">${[10,20,30,40,50].map(v=>`<option value="${v}">${v}%</option>`).join('')}</select></div>
      <div class="field" id="m-penAmtF" style="display:none"><label for="m-penAmt">Kártérítés összege (Ft)</label><input class="inp" id="m-penAmt" name="amount" inputmode="numeric" data-money="1" placeholder="pl. 50 000"></div>
      <div class="field full"><label>Eset(ek) <span class="muted" style="font-weight:600">– több is bejelölhető</span></label><div class="pen-cases" id="m-penCase">${penCaseOpts('light','caseText')}</div></div>
      <div class="field full"><label for="m-penReason">Írásos indoklás <span class="muted" style="font-weight:600">(3.6. pont – kötelező)</span></label><textarea class="inp" id="m-penReason" name="reason" rows="4" maxlength="3000" placeholder="Mi történt, mikor, milyen következménnyel…"></textarea></div>
      <div class="field full"><label for="m-penLink">Bizonyíték (link, nem kötelező)</label><input class="inp" id="m-penLink" name="link" type="url" placeholder="https://drive.google.com/…"></div>
      <div class="field full"><p class="hint" id="m-penCalc" style="margin:0"></p></div>
    </div>`,{submitLabel:isAdmin()?'Kiróvás':'Javaslat küldése jóváhagyásra',submit:async fd=>{
      const kind=fd.get('kind'),reason=String(fd.get('reason')||'').trim();
      if(reason.length<5){toast('Írd le röviden az indoklást.',true);$('m-penReason').focus();return;}
      if(kind==='damage'&&!moneyVal(fd.get('amount'))){toast('Add meg a kártérítés összegét.',true);return;}
      try{const r=await call('addPenalty',{projectId:d.id,crewId:cid,kind,pct:Number(fd.get('pct'))||0,amount:moneyVal(fd.get('amount'))||0,caseText:fd.getAll('caseText').join('; '),reason,link:String(fd.get('link')||'').trim()});
        closeModal();penApply(d.id,r.penalties);toast(isAdmin()?(r.mailed?'Díjcsökkentés kiróva, a szakember e-mailt kapott':'Díjcsökkentés kiróva (e-mailt nem sikerült küldeni)'):'Elküldve jóváhagyásra az ügyvezetőnek');}
      catch(e){handleErr(e);}}});
  penCalc();
}
function penCalc(){const k=$('m-penKind');if(!k)return;const v=k.value;
  $('m-penPctF').style.display=v==='prestige'?'':'none';$('m-penAmtF').style.display=v==='damage'?'':'none';
  const t=$('m-penCalc'),K=PEN_KINDS[v];if(!t||!K)return;
  t.textContent=v==='damage'?'A kártérítés a díjon felül, külön követelésként jelenik meg.':'A díj '+(v==='prestige'?($('m-penPct').value+'%'):K.pct+'%')+'-át vonjuk le. Több levonás együtt legfeljebb a teljes díjat érintheti.';}
document.addEventListener('change',e=>{if(e.target.id==='m-penKind'){$('m-penCase').innerHTML=penCaseOpts(e.target.value,'caseText');penCalc();}else if(e.target.id==='m-penPct')penCalc();});
function penObjectModal(pid,id){
  openModal('Kifogás a díjcsökkentés ellen',`<p class="hint" style="margin:0 0 10px">Írd le, miért nem értesz egyet. Az ügyvezető e-mailben értesítést kap, és megvizsgálja.</p><div class="fields"><div class="field full"><label for="m-objText">Kifogás</label><textarea class="inp" id="m-objText" name="text" rows="5" maxlength="3000"></textarea></div></div>`,
    {submitLabel:'Kifogás elküldése',submit:async fd=>{const text=String(fd.get('text')||'').trim();if(text.length<5){toast('Írd le röviden a kifogásodat.',true);return;}
      try{const r=await call('objectPenalty',{projectId:pid,id,text});closeModal();penApply(pid,r.penalties);toast('Kifogás elküldve');}catch(e){handleErr(e);}}});
}
function newClientModal(pre,edit,reg){   // reg: az Ügyfelek fülről (nincs nyitott projekt)
  openModal(edit?'Ügyfél adatai':'Új ügyfél',`<div class="fields">${taxBlock()}${mf('contactName','Kapcsolattartó <button class="linkbtn" type="button" data-action="hs-inline" style="font-size:14px;margin-left:6px;text-decoration:none" title="Keresés a HubSpotban" aria-label="Kapcsolattartó keresése a HubSpotban">🔍</button>',{max:120})}${phoneField({name:'contactPhone',value:edit?edit.contactPhone:''})}${mf('contactEmail','E-mail',{type:'email',full:true,max:160})}<div id="hsInline" class="hs-list full" style="display:none"></div></div>`,
    {left:reg&&edit&&edit.id?`<button type="button" class="btn danger small" data-action="del-client" data-id="${esc(edit.id)}">Törlés</button>`:'',submitLabel:edit?'Mentés':'Felvétel',submit:async fd=>{const c=String(fd.get('client')||'').trim();if(c.length<2){toast('Add meg az ügyfél nevét.',true);return;}
      const patch={client:c,clientTax:String(fd.get('clientTax')||'').trim(),clientAddress:String(fd.get('clientAddress')||'').trim()};['contactName','contactPhone','contactEmail'].forEach(k=>{const v=String(fd.get(k)||'').trim();if(v||edit)patch[k]=v;});
      const rec={id:(edit&&edit.id)||uuid(),name:c,tax:patch.clientTax,address:patch.clientAddress,contactName:patch.contactName||'',contactPhone:patch.contactPhone||'',contactEmail:patch.contactEmail||'',oldName:reg&&edit?edit.client:''};
      if(reg){try{await saveClientRec(rec);closeModal();toast(edit?'Ügyfél mentve':'Ügyfél felvéve');}catch(e){handleErr(e);}return;}
      closeModal();if(S.draft)setDraft(patch);saveClientRec(rec).catch(()=>{});}});   // a projektből felvett ügyfél is bekerül az Ügyfelek közé
  if(pre){const n=$('m-client');if(n)n.value=pre;}
  if(edit){[['m-clientTax',edit.clientTax],['m-client',edit.client],['m-clientAddress',edit.clientAddress],['m-contactName',edit.contactName],['m-contactEmail',edit.contactEmail]].forEach(([id,v])=>{const e=$(id);if(e)e.value=v||'';});}
}
/* Kereshető ügyfélválasztó: gépelésre szűr, a lista végén mindig ott az „Új ügyfél felvétele”. */
function clientSearch(input,all){
  const q=all?'':input.value.trim(),cur=S.draft&&String(S.draft.client||'').trim();
  pickItems=knownClients(q);
  if(cur&&!pickItems.some(c=>c.company===cur)&&(!q||cur.toLowerCase().includes(q.toLowerCase())))pickItems.unshift({company:cur,name:S.draft.contactName||'',phone:S.draft.contactPhone||'',email:S.draft.contactEmail||'',tax:S.draft.clientTax||'',address:S.draft.clientAddress||''});
  pickItems.push({isNew:true,company:q});if(cur&&!q)pickItems.push({isNone:true,company:''});
  pickShow(input,pickItems.map((it,i)=>it.isNone?`<button type="button" class="hs-item" data-hs="${i}"><b class="muted">— Nincs ügyfél (mező ürítése)</b></button>`:it.isNew?`<button type="button" class="hs-item hs-new" data-hs="${i}"><b>+ Új ügyfél felvétele${q?`: „${esc(q)}”`:'…'}</b></button>`
    :`<div class="hs-row${it.company===cur?' cur':''}"><button type="button" class="hs-item" data-hs="${i}"><b>${esc(it.company)}</b><small>${esc([it.name,it.phone,it.email].filter(Boolean).join(' · ')||it.address||'nincs kapcsolattartó megadva')}</small></button></div>`).join('')+(pickItems.length===1&&q?'<div class="hs-empty">Nincs ilyen ügyfél.</div>':''));
}
function clientPick(i){const it=pickItems[i];if(!it||!S.draft)return;pickClose();try{document.activeElement.blur();}catch(e){}
  if(it.isNew){newClientModal(it.company);return;}
  if(it.isNone){setDraft({client:'',clientTax:'',clientAddress:''});return;}
  const patch={client:it.company,clientTax:it.tax||'',clientAddress:it.address||''};if(it.name||it.phone||it.email){patch.contactName=it.name;patch.contactPhone=it.phone;patch.contactEmail=it.email;}
  setDraft(patch);}
document.addEventListener('input',e=>{if(e.target.id==='f-client'&&!ro())clientSearch(e.target);});
document.addEventListener('focusin',e=>{if(e.target.id==='f-client'&&!ro()){e.target.select();clientSearch(e.target,true);}else if($('hsBox'))pickClose();});
document.addEventListener('focusout',e=>{if(e.target.id==='f-client'){const t=e.target;setTimeout(()=>{if(document.activeElement===t||!S.draft)return;if(!t.value.trim()&&S.draft.client){setDraft({client:'',clientTax:'',clientAddress:''});return;}t.value=S.draft.client||'';},200);}});   // üresre törölve: nincs ügyfél   // választás nélkül visszaáll
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
  const e=calEventById(id)||(S._calEv&&S._calEv.id===id?S._calEv:null);if(importing)return;
  if(!e){toast('Az esemény adatai közben frissültek – nyisd meg újra a naptárban.',true);closeModal();S.cal.events={};render(true);return;}
  const ex=S.projects.find(p=>p.calEventId===id);if(ex){closeModal();openProject(ex.id);toast('Ebből az eseményből már van projekt');return;}
  importing=true;const btn=document.querySelector('[data-action=cal-import]');if(btn){btn.disabled=true;btn.textContent='Létrehozás…';}
  try{
  const crew=[];(e.guests||[]).forEach(m=>{const c=S.crew.find(x=>String(x.email||'').toLowerCase()===m);if(c&&!crew.some(a=>a.crewId===c.id))crew.push({crewId:c.id,role:(c.roles||[]).find(r=>r!=='Projektvezető')||'Operatőr'});});
  let hours=8;if(e.start&&e.end){const [a1,a2]=e.start.split(':').map(Number),[b1,b2]=e.end.split(':').map(Number);const h=Math.round(((b1*60+b2)-(a1*60+a2))/60);if(h>=1&&h<=16)hours=h;}
  const pad=t=>{const m=/^(\d{1,2}):(\d{2})/.exec(String(t||''));return m?String(m[1]).padStart(2,'0')+':'+m[2]:'';};
  let nm=String(e.title||'').trim();if(nm.length<2)nm='Projekt – '+fmtShort(e.date);
  const p={id:uuid(),name:nm.slice(0,160),date:e.date,endDate:e.endDate&&e.endDate>e.date?e.endDate:'',startTime:pad(e.start),endTime:pad(e.end),hours,venue:String(e.location||'').slice(0,300),notes:String(e.description||'').slice(0,4900),
    status:'tervezes',crew,equipment:[],calEventId:e.id,baseUpdatedAt:'',mutationId:uuid()};
  if(crew.length&&new Set(crew.map(a=>a.crewId)).size===1)p.lead=crew[0].crewId;
  const saved=await call('saveProject',p);if(!projById(saved.id))S.projects.push(saved);closeModal();S.cal.events={};openProject(saved.id);toast(saved.duplicateOf?'Ebből az eseményből már van projekt':(saved.calError||'Projekt létrehozva a naptáreseményből'),!!saved.calError);
  }catch(err){handleErr(err);if(btn&&btn.isConnected){btn.disabled=false;btn.textContent='Projekt létrehozása ebből';}}
  finally{importing=false;}
}
function needName(form,msg){const el=form.querySelector('[name=name]');if(el.value.trim().length<2){el.focus();el.style.borderColor='var(--bad)';toast(msg||'Add meg a nevet.',true);return false;}return true;}
$('modalRoot').addEventListener('submit',async e=>{
  e.preventDefault();if(!modalSubmit)return;
  const form=e.target,btn=form.querySelector('[type=submit]');if(btn){btn.disabled=true;btn.dataset.l=btn.textContent;btn.textContent='Mentés…';}
  const k=MD_KEY;
  try{await modalSubmit(new FormData(form),form);if(MD_KEY!==k||!$('mform'))mdClear(k);}   // sikeres mentés: a piszkozat törlődik
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
document.addEventListener('change',e=>{if(e.target.id==='m-crewId'){const c=crewById(e.target.value),em=$('m-email');if(c&&c.email&&em&&!em.value)em.value=c.email;}});   // a stáblistás e-mail-cím átjön
function userModal(u){
  const v=u||{};
  const crewOpts=[['','Válassz a stáblistából…'],...S.crew.slice().sort((a,b)=>a.name.localeCompare(b.name,'hu')).map(c=>[c.id,c.name])];
  openModal(u?'Felhasználó szerkesztése':'Kolléga felvétele',`<div class="fields">
    ${ms('crewId','Munkatárs (a stáblistából – ez lesz a megjelenő név)',crewOpts,v.crewId||'',{full:true})}
    ${ms('role','Szerepkör',Object.entries(USER_ROLES).filter(([k])=>k!=='admin'||v.role==='admin'||!(S.users||[]).some(x=>x.role==='admin'&&x.id!==v.id)),USER_ROLES[v.role]?v.role:'editor')}
    ${mf('email','Google-fiók e-mail-címe (ezzel lép be)',{type:'email',v:v.email,full:true,ph:'pl. kollega@lumosmotion.com'})}
    <div class="field full"><div class="rolepick">${u?`<label><input type="checkbox" name="disabled"${v.disabled?' checked':''}> Letiltva (nem tud belépni)</label>`:`<label><input type="checkbox" name="sendInvite" checked> Meghívó küldése e-mailben</label>`}</div>
      <p class="hint" style="margin:6px 0 0">Belépés csak Google-fiókkal: céges címnél a Lumos Motion Workspace-fiókkal, külsősnél azzal a Google-fiókkal, amelyhez ez az e-mail-cím tartozik.</p></div>
  </div>`,{left:u&&u.id!==S.me.id?`<button type="button" class="btn danger small" data-action="del-user" data-id="${esc(u.id)}">Törlés</button>`:'',
  submit:async(fd,form)=>{
    const cr=crewById(fd.get('crewId'));
    if(!cr&&!(u&&v.name)){toast('Válaszd ki a munkatársat a stáblistából (ha még nincs benne, előbb vedd fel a Stáb fülön).',true);return;}
        const data={id:u?u.id:undefined,name:cr?cr.name:v.name,role:fd.get('role'),crewId:fd.get('crewId'),email:fd.get('email').trim(),disabled:fd.get('disabled')==='on',loginMode:'google',sendInvite:u?false:fd.get('sendInvite')==='on'};
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
    await Promise.race([SAVE_Q,new Promise(r=>setTimeout(r,15000))]);if(S.dirty){document.body.classList.remove('switching');toast('A módosítások mentése nem sikerült – előbb mentsd el őket, aztán válts nézetet.',true);renderChrome();return;}   // előbb fusson le minden folyamatban lévő mentés
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
/* Lezáráskor (Kész / Átadva) díjcsökkentés is kiróható – szakemberenként */
function penCrewOpts(){const p=projById(S.draft.id)||S.draft,ids=[...new Set([p.lead].concat((p.crew||[]).map(a=>a.crewId)).filter(Boolean))];
  return ids.map(id=>{const c=crewById(id);return c?[id,c.name]:null;}).filter(Boolean).sort((a,b)=>a[1].localeCompare(b[1],'hu'));}
function penBlock(show){if(!canSeeFees())return '';const co=penCrewOpts();if(!co.length)return '';
  return `<div class="field full pen-block" id="penWrap"${show?'':' style="display:none"'}><div class="pen-block-h"><b>🚨 Hiba jelzése díjcsökkentéssel</b> <span class="muted">(nem kötelező – kattints a 🚨 jelre annál, aki hibázott)</span></div>
    <div class="pen-chips">${co.map(([id,nm])=>`<button class="pen-chip" type="button" data-action="pen-row-add" data-cid="${esc(id)}" title="Díjcsökkentés: ${esc(nm)}"><span>${esc(nm)}</span><span class="pen-btn" aria-hidden="true">🚨</span></button>`).join('')}</div><div id="penRows"></div></div>`;}
let PEN_ROW_N=0;
function penRowHtml(){const n=++PEN_ROW_N,co=penCrewOpts();
  return `<div class="pen-rowf" data-penrow="${n}"><div class="pen-rowf-g">
    <select class="inp" name="pen_cid_${n}" aria-label="Szakember"><option value="">Melyik szakember?</option>${co.map(([id,nm])=>`<option value="${esc(id)}">${esc(nm)}</option>`).join('')}</select>
    <select class="inp" name="pen_kind_${n}" data-penkind="${n}" aria-label="Kategória">${Object.entries(PEN_KINDS).map(([k,v])=>`<option value="${k}">${esc(v.label)}${v.pct!=null?' – '+v.pct+'%':v.min?' – '+v.min+'–'+v.max+'%':' – Ft'}</option>`).join('')}</select>
    <select class="inp" name="pen_pct_${n}" data-penpct="${n}" style="display:none" aria-label="Mérték">${[10,20,30,40,50].map(v=>`<option value="${v}">${v}%</option>`).join('')}</select>
    <input class="inp" name="pen_amt_${n}" data-penamt="${n}" style="display:none" inputmode="numeric" data-money="1" placeholder="Összeg (Ft)" aria-label="Kártérítés összege">
    <button class="trash" type="button" data-action="pen-row-del" title="Sor törlése" aria-label="Sor törlése">🗑️</button></div>
    <div class="pen-cases" data-pencase="${n}">${penCaseOpts('light','pen_case_'+n)}</div>
    <textarea class="inp" name="pen_reason_${n}" rows="2" maxlength="3000" placeholder="Indoklás (ha üres, a beszámoló / észrevétel szövege kerül bele)"></textarea></div>`;}
function penRowsCollect(fd,fallback){
  const out=[],w=$('penWrap');if(!w||w.style.display==='none')return out;for(const r of document.querySelectorAll('#penRows [data-penrow]')){const n=r.dataset.penrow,cid=fd.get('pen_cid_'+n),kind=fd.get('pen_kind_'+n);
    if(!cid){throw new Error('Válaszd ki, melyik szakember kapja a díjcsökkentést (vagy töröld a sort).');}
    const reason=String(fd.get('pen_reason_'+n)||'').trim()||String(fallback||'').trim();
    if(reason.length<5)throw new Error('Írj indoklást a díjcsökkentéshez (a szerződés 3.6. pontja szerint kötelező).');
    if(kind==='damage'&&!moneyVal(fd.get('pen_amt_'+n)))throw new Error('Add meg a kártérítés összegét.');
    out.push({crewId:cid,kind,pct:Number(fd.get('pen_pct_'+n))||0,amount:moneyVal(fd.get('pen_amt_'+n))||0,caseText:fd.getAll('pen_case_'+n).join('; '),reason});}
  return out;}
async function penRowsSubmit(pid,list){if(!list.length)return;let last=null,mailed=0;
  for(const x of list){try{const r=await call('addPenalty',Object.assign({projectId:pid},x));last=r.penalties;if(r.mailed)mailed++;}catch(e){toast('Díjcsökkentés: '+errText(e),true);}}
  if(last){penApply(pid,last);toast(isAdmin()?`${list.length} díjcsökkentés kiróva${mailed?', a szakember e-mailt kapott':''}`:`${list.length} díjcsökkentés jóváhagyásra elküldve`);}}
document.addEventListener('change',e=>{const t=e.target,n=t.dataset&&t.dataset.penkind;if(!n)return;const row=t.closest('[data-penrow]');
  row.querySelector('[data-pencase]').innerHTML=penCaseOpts(t.value,'pen_case_'+n);row.querySelector('[data-penpct]').style.display=t.value==='prestige'?'':'none';row.querySelector('[data-penamt]').style.display=t.value==='damage'?'':'none';});
document.addEventListener('change',e=>{const t=e.target,w=$('penWrap');if(!w)return;
  if(t.name==='siteOk')w.style.display=t.value==='nem'?'':'none';else if(t.id==='m-stuck')w.style.display=t.checked?'':'none';});   // díjcsökkentés csak elakadásnál
function siteModal(next,withPen){
  const d=S.draft;if(!d)return;
  openModal('📝 Helyszíni munka beszámoló',`<div class="fields">
      <div class="field full"><label>Minden rendben ment a helyszínen?</label><div class="seg-row">
        <label class="toggle"><input type="radio" name="siteOk" value="igen"${d.siteOk==='igen'?' checked':''}><span class="tl">✅ Igen, minden rendben</span></label>
        <label class="toggle"><input type="radio" name="siteOk" value="nem"${d.siteOk==='nem'?' checked':''}><span class="tl">🚨 Elakadás történt</span></label></div></div>
      <div class="field full"><label for="m-siteReport">Beszámoló <span class="muted" style="font-weight:600">(nem kötelező)</span></label><textarea class="inp" id="m-siteReport" name="siteReport" rows="4" maxlength="3000" placeholder="Hogy ment a forgatás, volt-e csúszás, technikai gond, ügyfél-visszajelzés…">${esc(d.siteReport||'')}</textarea></div>
      ${stuckSummary(Object.assign({},d,{siteOk:''}))}
      ${penBlock(d.siteOk==='nem')}
    </div>`,{submitLabel:next?'Tovább':'Mentés',submit:async fd=>{
      const ok=String(fd.get('siteOk')||''),txt=String(fd.get('siteReport')||'').trim();
      if(!ok){toast('Jelöld be, hogy minden rendben ment-e.',true);return;}
      let pens=[];try{pens=penRowsCollect(fd,txt);}catch(e){toast(e.message,true);return;}
      const pid=d.id;closeModal();setDraft({siteOk:ok,siteReport:txt});if(next)next();penRowsSubmit(pid,pens);}});
}
function deliveryModal(){
  const d=S.draft,r=pr(d);if(!d)return;
  const its=deliverItems(d),stuck=d.siteOk==='nem';
  openModal('📦 Átadás',`${its.length?`<div class="deliv-list"><div class="sec-lbl" style="margin-top:0">Átadandó anyagok</div>${roList(its)}</div>`:''}
    <div class="fields">
      ${mf('deliveryLink','Átadási link (mappa vagy videók)',{full:true,type:'url',ph:'https://drive.google.com/…',v:d.deliveryLink||''})}
      <div class="field"><label>Rendezvény utolsó napja</label><div class="inp ro-inp"><b>${r?fmtDay(r.end):'Nincs dátum'}</b></div></div>
      <div class="field"><label for="m-dueAt">Átadási határidő</label><input class="inp" id="m-dueAt" name="dueAt" type="date" value="${esc(dueDate(d)||'')}"${r?` min="${esc(r.end)}"`:''}></div>
      <div class="field full"><label class="toggle"><input type="checkbox" name="dueKept" value="1"${d.dueKept!=='nem'?' checked':''}><span class="tl">⏱️ Sikerült tartani az átadási határidőt</span></label></div>
      ${d.status==='atadva'&&d.deliveredAt?`<div class="field full"><span class="hint" style="margin:0">Átadva: <b class="ok-txt">${fmtDay(d.deliveredAt)}</b></span></div>`:''}
      <div class="field full"><label for="m-deliveryNotes">Észrevételek</label><textarea class="inp" id="m-deliveryNotes" name="deliveryNotes" rows="4" maxlength="3000" placeholder="Hogy ment a projekt, mire figyeljünk legközelebb, mi maradt nyitva…">${esc(d.deliveryNotes||'')}</textarea></div>
      ${stuckSummary(d)}
      ${canSeeFees()&&penCrewOpts().length?`<div class="field full"><label class="toggle"><input type="checkbox" id="m-stuck"${stuck?' checked':''}><span class="tl">🚨 Elakadás történt</span></label></div>`:''}
      ${penBlock(stuck)}
    </div>`,{submitLabel:d.status==='atadva'?'Mentés':'Átadva ✓',submit:async fd=>{
      const link=String(fd.get('deliveryLink')||'').trim();if(!/^https:\/\/\S+$/i.test(link)){toast('Adj meg egy érvényes átadási linket (https://…).',true);const e=$('m-deliveryLink');if(e)e.focus();return;}
      const notes=String(fd.get('deliveryNotes')||'').trim();if(!notes){toast('Írd be az észrevételeket.',true);const e=$('m-deliveryNotes');if(e)e.focus();return;}
      let pens=[];try{pens=penRowsCollect(fd,notes);}catch(e){toast(e.message,true);return;}
      const due=String(fd.get('dueAt')||'');closeModal();penRowsSubmit(d.id,pens);
      setDraft({deliveryLink:link,deliveryNotes:notes,dueKept:fd.get('dueKept')?'igen':'nem',dueAt:validISO(due)&&due!==defaultDue(d)?due:'',status:'atadva',deliveredAt:d.deliveredAt||todayISO()});saveDraft();}});
  const e=$('m-deliveryLink');if(e&&!e.value)setTimeout(()=>e.focus(),50);
}
/* az eddigi elakadások és kirótt díjcsökkentések (beszámoló és átadás ablakban) */
function stuckSummary(d){
  const p=projById(d.id)||d,pens=(p.penalties||[]).filter(x=>x.status!=='rejected');
  if(d.siteOk!=='nem'&&!pens.length)return '';
  return `<div class="field full stuck-sum">${d.siteOk==='nem'?`<div><b>🚨 Helyszíni elakadás</b>${d.siteReport?`<div class="pen-reason">${esc(d.siteReport)}</div>`:''}</div>`:''}
    ${pens.length?`<div class="sec-lbl" style="margin:6px 0 2px">Kirótt díjcsökkentések</div>${pens.map(x=>{const k=PEN_KINDS[x.kind]||{},c=crewById(x.crewId);
      return `<div class="stuck-pen"><b>${esc(c?c.name:'Munkatárs')}</b> · ${esc(k.label||'')} ${x.kind==='damage'?ftFmt(x.amount):num(x.pct)+'%'} <span class="statuspill ${x.status==='approved'?'p-bad':'p-warn'}">${x.status==='approved'?'jóváhagyva':'jóváhagyásra vár'}</span>${x.caseText?`<div class="ser">${esc(x.caseText)}</div>`:''}</div>`;}).join('')}`:''}</div>`;
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
  const p=projById(id);if(!p)return;S.crewDay='';
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
function setDraft(patch){if(ro()||!S.draft)return;histPush();HIST.key='';Object.assign(S.draft,patch);
  if('crew' in patch&&!S.draft.lead){const ids=[...new Set((S.draft.crew||[]).map(a=>a.crewId))];if(ids.length===1)S.draft.lead=ids[0];}   // egyszemélyes stábnál ő a projektvezető
  if(('crew' in patch||'lead' in patch)&&!('fees' in patch))syncFeesWithCrew(S.draft);S.dirty=true;render(true);}
/* Beosztott munkatárs → sor a Pénzügyek táblázatában (név, feladat, napidíj × napok); a díjat ott lehet átírni.
   Ha valakit levesznek a projektről, a sora csak akkor törlődik, ha még nem írtak be díjat. */
/* Projekt megnyitásakor a már beosztott emberek sora is bekerül a díjtáblázatba (mentés csak a következő módosítással). */
function prepDraft(p){const d=clone(p);if(!d.lead){const ids=[...new Set((d.crew||[]).map(a=>a.crewId))];if(ids.length===1)d.lead=ids[0];}try{syncFeesWithCrew(d);}catch(e){}return d;}
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
    if(!f){const post=isPostOnly(d,id),myDays=days>1&&!post?crewDaysOf(d,id):[];const nf={name:c?c.name:'',crewId:id,task:rolesOf(id),autoTask:true,amount:c&&num(c.dayRate)&&!post?num(c.dayRate)*(days>1?myDays.length:1):'',rent:''};
      if(days>1&&!post&&c&&num(c.dayRate)){nf.dayAmounts={};myDays.forEach(x=>nf.dayAmounts[x]=num(c.dayRate));}
      fees.push(nf);added++;}
    else{f.crewId=id;if(f.autoTask||!f.task)f.task=rolesOf(id),f.autoTask=true;}});
  if(days>1)fees.forEach(f=>{if(f.crewId&&!isPostOnly(d,f.crewId)&&!f.dayAmounts&&num(f.amount)){const ds=crewDaysOf(d,f.crewId),per=Math.floor(num(f.amount)/ds.length);f.dayAmounts={};ds.forEach((x,k)=>f.dayAmounts[x]=k===ds.length-1?num(f.amount)-per*(ds.length-1):per);}});   // több napos: a meglévő díj napokra bontva
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
  tab:b=>guard(()=>{const fp=b.dataset.focus&&S.draft&&pr(S.draft);S.cal.focus=fp||null;if(fp)S.cal.month=fp.start.slice(0,7);S.tab=b.dataset.tab;S.projectId=null;S.draft=null;closeModal();render(true);scrollTo(0,0);}),
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
  'modal-bg':()=>{},   // mellékattintásra nem zárul be (a tartalom megmarad)
  'modal-cancel':()=>{const k=MD_KEY;MD_KEY='';mdClear(k);closeModal();},
  save:()=>saveDraft(),
  discard:()=>{histPush();const p=projById(S.projectId);S.draft=p?clone(p):null;S.dirty=false;render(true);toast('Módosítások elvetve');},
  stage:b=>{const d=S.draft;if(!d||ro())return;if(d.status==='atadva'){toast('A projekt lezárva – feloldás a ⚙️ Projekt kezelése alatt.',true);return;}
    const v=b.dataset.v,go=()=>{
      if(v==='atadva'&&needsDelivery(S.draft)){deliveryModal();return;}   // videós anyagnál felugró Átadás ablak (link kötelező)
      if(S.draft.status===v)return;
      setDraft({status:v,deliveredAt:v==='atadva'?(S.draft.deliveredAt||todayISO()):''});
      if(v==='atadva')saveDraft();};   // lezáráskor azonnal mentünk
    if(['helyszin','utomunka','atadva'].includes(v)&&!d.lead){toast('Előbb jelöld ki a projektvezetőt – minden projekthez kötelező.',true);const e=$('add-crew-role');if(e){FOLD.crew=true;const dd=e.closest('details');if(dd)dd.open=true;e.value='Projektvezető';e.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(()=>{const e2=$('add-crew-role');if(e2){e2.scrollIntoView({block:'center',behavior:'smooth'});const pp=$('add-crew-person');if(pp)setTimeout(()=>pp.focus(),300);}},50);}return;}
    const closing=v==='atadva'&&d.status!=='atadva'&&!needsDelivery(d);   // „Kész”: lezáró ablak díjcsökkentéssel
    if(['helyszin','utomunka','atadva'].includes(v)&&d.status!==v&&(!d.siteOk||closing)){siteModal(go,closing);return;}   // előbb a helyszíni beszámoló
    go();},
  'site-report':()=>siteModal(null),
  'tile-go':b=>{const g=b.dataset.go;
    if(g==='aktiv'){guard(()=>{S.pf.status='aktiv';S.tab='projektek';S.projectId=null;S.draft=null;render(true);scrollTo(0,0);});}
    else if(g==='naptar'){guard(()=>{S.tab='naptar';S.projectId=null;S.draft=null;S.cal.month=todayISO().slice(0,7);render(true);scrollTo(0,0);});}
    else if(g==='atadas'){const el=$('due-panel');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}},
  'step-done':b=>{const d=S.draft;if(!d||ro()||d.status==='atadva')return;const v=b.dataset.v,set=new Set(String(d.stepsDone||'').split(',').filter(Boolean)),on=!set.has(v);
    const ORD=['egyeztetes','tervezes','helyszin'],ix=ORD.indexOf(v);
    const apply=()=>{const s2=new Set(String(S.draft.stepsDone||'').split(',').filter(Boolean));
      if(on)ORD.slice(0,ix+1).forEach(x=>s2.add(x));else ORD.slice(ix).forEach(x=>s2.delete(x));   // előtte lévők is kipipálódnak, utána lévők visszavonódnak
      setDraft({stepsDone:ORD.filter(x=>s2.has(x)).join(',')});};
    if(on&&v==='helyszin'&&!d.siteOk){siteModal(apply);return;}   // a helyszíni munka kipipálásakor jön a beszámoló
    apply();},
  'proj-manage':()=>{const p=S.draft;if(!p)return;
    openModal('Projekt kezelése',`<div class="fields" style="margin-bottom:14px">${mf('name','Projekt neve',{full:true,v:p.name||'',max:120})}</div><div class="btns" style="margin-bottom:10px">${p.folderId?`<a class="btn outline small" href="${esc(driveUrl(p.folderId))}" target="_blank" rel="noopener">📁 Projektmappa megnyitása ↗</a>`:`<button class="btn outline small" type="button" data-action="make-folder">📁 Projektmappa létrehozása</button>`}</div>${p.status==='atadva'&&isAdmin()?`<div class="btns" style="margin-bottom:10px"><button class="btn outline small" type="button" data-action="proj-unlock">🔓 Lezárás feloldása</button></div>`:''}<div class="btns"><button class="btn outline small" type="button" data-action="cancel-toggle">${p.status==='lemondva'?'Visszaállítás':'Projekt lemondása'}</button><button class="btn danger small" type="button" data-action="del-project">Projekt törlése</button></div>
      ${p.updatedAt?`<p class="hint">Utoljára mentve: ${esc(p.updatedAt)}${p.updatedBy?' · '+esc(p.updatedBy):''}</p>`:''}`,{cancelLabel:'Bezárás',submitLabel:'Átnevezés',submit:async fd=>{
      const name=String(fd.get('name')||'').trim().replace(/\s+/g,' ');if(name.length<2){toast('Add meg a projekt nevét.',true);return;}
      closeModal();if(name===S.draft.name&&!S.dirty)return;setDraft({name});saveDraft();toast('Átnevezve – a Google Naptárban is frissül');}});},
  'cancel-toggle':()=>{closeModal();const d=S.draft;if(!d)return;if(d.status==='lemondva')setDraft({status:d.prevStatus||'egyeztetes'});else setDraft({status:'lemondva',prevStatus:d.status||'egyeztetes'});},
  'del-project':b=>arm(b,async()=>{const id=S.projectId;try{await SAVE_Q;await call('deleteProject',{id});S.cal.events={};S.projects=S.projects.filter(p=>p.id!==id);closeModal();S.projectId=null;S.draft=null;S.dirty=false;render(true);toast('Projekt törölve');}catch(e){handleErr(e);}}),
  'foto-step':b=>{const d=S.draft;if(!d)return;const cur=fotoDb(d),up=Number(b.dataset.d)>0;let n=up?(cur?cur+FOTO_STEP:FOTO_DEF):cur-FOTO_STEP;n=Math.max(0,Math.min(FOTO_MAX,n));setDraft(n>0?{foto_db:n,x_foto:true}:{foto_db:n});},
  'rec-step':b=>{const d=S.draft;if(!d)return;const it=REC_COUNTS.find(x=>x.k===b.dataset.k);if(!it)return;const cur=num(d[it.k]),n=Math.min(it.max,Math.max(it.min,cur+Number(b.dataset.d)));setDraft((it.k==='er_clips'||it.k==='er_subs'||it.k==='er_summary')&&n>0?{[it.k]:n,er_post:true}:{[it.k]:n});},
  dlv:b=>{const d=S.draft;if(!d)return;const it=DELIVERABLES.find(x=>x.k===b.dataset.k);setDraft({[it.k]:Math.min(it.max,Math.max(0,num(d[it.k])+Number(b.dataset.d)))});},
  'view-reset':()=>guard(()=>switchView('admin')),
  'lead-remove':()=>{const d=S.draft;if(!d)return;setDraft({lead:''});toast('A projektvezető szerep lekerült – jelölj ki új projektvezetőt.');},
  'crew-day-tab':b=>{S.crewDay=b.dataset.d||'';render(true);},
  'crew-person-remove':b=>{const d=S.draft;if(!d)return;const id=b.dataset.id,c=crewById(id);
    {const day=projDays(d).includes(S.crewDay)?S.crewDay:'',cur=crewDaysOf(d,id);   // napi nézetben csak arról a napról vesszük le
      if(day&&cur.includes(day)&&cur.length>1&&b.closest('.pcrew')){const all=projDays(d),cd=Object.assign({},d.crewDays||{}),nx=cur.filter(x=>x!==day);cd[id]=all.filter(x=>nx.includes(x));
        const fees=(d.fees||[]).map(f=>{if(f.crewId!==id||!f.dayAmounts)return f;const g=Object.assign({},f);g.amount=nx.reduce((s,x)=>s+num(g.dayAmounts[x]),0);return g;});
        setDraft({crewDays:cd,fees});toast((c?c.name:'Munkatárs')+' lekerült erről a napról');return;}}
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
  'cal-nav':b=>{const d=Number(b.dataset.d);if(!d){S.cal.month=todayISO().slice(0,7);S.cal.sel=todayISO();}else{const [y,m]=S.cal.month.split('-').map(Number);const n=new Date(Date.UTC(y,m-1+d,1));S.cal.month=n.toISOString().slice(0,7);}render(true);},
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
  'pen-new':b=>penModal(b.dataset.cid),
  'proj-unlock':()=>{const d=S.draft;if(!d||!isAdmin())return;closeModal();setDraft({status:needsDelivery(d)?'utomunka':'helyszin',deliveredAt:''});saveDraft();toast('Lezárás feloldva – a lépések újra módosíthatók');},
  'crew-day':b=>{const d=S.draft;if(!d)return;const cid=b.dataset.cid,day=b.dataset.d,all=projDays(d);let cur=crewDaysOf(d,cid).slice();
    if(cur.includes(day)){if(cur.length===1){toast('Legalább egy napot hagyj meg (vagy vedd le a projektről).',true);return;}cur=cur.filter(x=>x!==day);}else cur.push(day);
    const cd=Object.assign({},d.crewDays||{});if(cur.length===all.length)delete cd[cid];else cd[cid]=all.filter(x=>cur.includes(x));
    const fees=(d.fees||[]).map(f=>{if(f.crewId!==cid||!f.dayAmounts)return f;const g=Object.assign({},f);g.amount=cur.reduce((s,x)=>s+num(g.dayAmounts[x]),0);return g;});
    setDraft({crewDays:cd,fees});},
  'fee-move':b=>{const d=S.draft;if(!d)return;const i=Number(b.dataset.i),j=i+Number(b.dataset.d),f=(d.fees||[]).slice();
    if(j<0||j>=f.length||f[i].kind==='fixed'||f[j].kind==='fixed')return;[f[i],f[j]]=[f[j],f[i]];setDraft({fees:f});},
  'pen-row-add':b=>{const box=$('penRows');if(!box)return;box.insertAdjacentHTML('beforeend',penRowHtml());const row=box.lastElementChild,cs=row.querySelector('select');
    if(b.dataset.cid&&cs){cs.value=b.dataset.cid;const k=row.querySelector('[data-penkind]');if(k)k.focus();}else if(cs)cs.focus();},
  'pen-row-del':b=>{const r=b.closest('[data-penrow]');if(r)r.remove();},
  'pen-approve':async b=>{const d=S.draft;if(!d)return;b.disabled=true;try{const r=await call('decidePenalty',{projectId:d.id,id:b.dataset.id,approve:true});penApply(d.id,r.penalties);toast(r.mailed?'Jóváhagyva, a szakember e-mailt kapott':'Jóváhagyva (e-mailt nem sikerült küldeni)');}catch(e){b.disabled=false;handleErr(e);}},
  'pen-reject':b=>{const d=S.draft;if(!d)return;const id=b.dataset.id;openModal('Díjcsökkentés elutasítása',`<div class="fields"><div class="field full"><label for="m-note">Megjegyzés (nem kötelező)</label><textarea class="inp" id="m-note" name="note" rows="3"></textarea></div></div>`,
    {submitLabel:'Elutasítás',submit:async fd=>{try{const r=await call('decidePenalty',{projectId:d.id,id,approve:false,note:String(fd.get('note')||'')});closeModal();penApply(d.id,r.penalties);toast('Elutasítva');}catch(e){handleErr(e);}}});},
  'pen-del':b=>arm(b,async()=>{const d=S.draft;if(!d)return;try{const r=await call('deletePenalty',{projectId:d.id,id:b.dataset.id});penApply(d.id,r.penalties);toast('Törölve');}catch(e){handleErr(e);}}),
  'pen-object':b=>penObjectModal(b.dataset.pid,b.dataset.id),
  'pen-open':b=>{const id=b.dataset.pid;guard(()=>openProject(id));},
  'new-client':()=>newClientModal(null,null,true),
  'edit-client':b=>{const c=knownClients('').find(x=>x.company===b.dataset.name);if(!c)return;newClientModal(null,{id:c.id,client:c.company,clientTax:c.tax,clientAddress:c.address,contactName:c.name,contactPhone:c.phone,contactEmail:c.email},true);},
  'del-client':b=>arm(b,async()=>{try{await call('deleteClient',{id:b.dataset.id});S.clients=(S.clients||[]).filter(x=>x.id!==b.dataset.id);closeModal();render(true);toast('Ügyfél törölve a nyilvántartásból');}catch(e){handleErr(e);}}),
  'hs-open':()=>hubspotModal(),
  'hs-inline':()=>{const b=$('hsInline');if(!b)return;b.style.display='';hsInline();},
  'hs-ipick':b=>{const it=(S._hsi||[])[Number(b.dataset.i)];if(!it)return;const set=(id,v)=>{const e=$(id);if(e)e.value=v||'';};
    set('m-contactName',it.name);set('m-contactEmail',it.email);
    const row=document.querySelector('#modalRoot .phone-row');if(row&&it.phone){const p=phParse(it.phone);row.querySelector('.ph-cc').dataset.cc=p.cc;row.querySelector('.ph-num').value=phJoin(p.cc,p.n).replace(p.cc+' ','');phSync(row,false);}
    if(!$('m-client').value&&it.company)set('m-client',it.company);
    $('hsInline').style.display='none';toast('Kapcsolattartó kitöltve a HubSpotból');},
  'hs-pick':b=>{const it=(S._hs||[])[Number(b.dataset.i)];if(!it||!S.draft)return;closeModal();setDraft({contactName:it.name,contactPhone:it.phone?phJoin(phParse(it.phone).cc,phParse(it.phone).n):'',contactEmail:it.email});toast('Kapcsolattartó kitöltve a HubSpotból');},
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
      if(k.startsWith('day:')){f.dayAmounts=Object.assign({},f.dayAmounts||{});const v=moneyVal(t.value);if(v==='')delete f.dayAmounts[k.slice(4)];else f.dayAmounts[k.slice(4)]=v;f.amount=feeDaySum(S.draft,f);const dd=k.slice(4),ds=document.querySelector(`[data-day-sum="${dd}"]`);if(ds){const first=projDays(S.draft)[0];ds.textContent=moneyFmt(fees.reduce((s2,g)=>g.kind==='fixed'?s2:g.crewId?(crewDaysOf(S.draft,g.crewId).includes(dd)?s2+num((g.dayAmounts||{})[dd]):s2):(dd===first?s2+num(g.amount):s2),0))||0;}}
      else if(k==='amount'||k==='rent')f[k]=moneyVal(t.value);else{f[k]=t.value;if(k==='name'){const c=S.crew.find(x=>x.name===t.value.trim());f.crewId=c?c.id:'';}}}}
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
  else if(t.id==='q-cl'){S.clf.q=t.value;render(true);}
  else if(t.id==='pay-month'){S.payMonth=t.value;render(true);}
  else if(t.id==='add-eq-qty'){S.addEq.qty=t.value;}
});
/* telefonmező: országhívószám + szám → egy érték */
function phSync(row,commit){const v=phJoin(row.querySelector('.ph-cc').dataset.cc||'+36',row.querySelector('.ph-num').value),[kind,k]=row.dataset.ph.split(':');
  if(kind==='n'){const h=row.querySelector('input[type=hidden]');if(h)h.value=v;}else if(commit&&S.draft&&(S.draft[k]||'')!==v)setDraft({[k]:v});}
/* gépelés közben tagolja a magyar számot: 20 123 4567, Budapesten 1 234 5678 */
function phLive(t){const before=t.value.slice(0,t.selectionStart||0).replace(/\D/g,'').length;let d=t.value.replace(/\D/g,'');
  if(/^06/.test(d))d=d.slice(2);else if(/^36/.test(d)&&d.length>9)d=d.slice(2);
  d=d.slice(0,9);const g=d[0]==='1'?[1,3,4]:[2,3,4];let out='',i=0;for(const n of g){if(i>=d.length)break;out+=(out?' ':'')+d.slice(i,i+n);i+=n;}
  if(out===t.value)return;t.value=out;let c=0,k=0;while(c<out.length&&k<before){if(/\d/.test(out[c]))k++;c++;}try{t.setSelectionRange(c,c);}catch(_){}}
document.addEventListener('input',e=>{const r=e.target.closest&&e.target.closest('.phone-row');if(r){if(e.target.classList.contains('ph-num')&&!e.isComposing&&(r.querySelector('.ph-cc').dataset.cc||'+36')==='+36')phLive(e.target);phSync(r,false);}});
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
    setDraft(k==='foto_db'?(n>0?{foto_db:n,x_foto:true}:{foto_db:n}):(k==='er_clips'||k==='er_subs'||k==='er_summary')&&n>0?{[k]:n,er_post:true}:{[k]:n});return;}
  if(t.dataset.crewAddrole!==undefined&&d){if(!t.value)return;if(t.value==='Projektvezető'){setDraft({lead:t.dataset.crewAddrole});return;}const crew=clone(d.crew||[]);if(!crew.some(a=>a.crewId===t.dataset.crewAddrole&&a.role===t.value))crew.push({crewId:t.dataset.crewAddrole,role:t.value});setDraft({crew});return;}
  if(t.dataset.crewRole!==undefined&&d){const crew=clone(d.crew||[]);crew[Number(t.dataset.crewRole)].role=t.value;setDraft({crew});return;}
  if(t.dataset.eqI!==undefined&&d){const q=Math.max(1,Math.round(num(t.value)||1));const equipment=clone(d.equipment||[]);const ex=equipment[Number(t.dataset.eqI)];if(ex){ex.qty=q;setDraft({equipment});}return;}
  if(t.id==='add-crew-role'){S.addCrew.role=t.value;render(true);setTimeout(()=>{const e=$('add-crew-person');if(e)e.focus();},30);return;}
  if(t.id==='add-crew-person'&&d){const id=t.value;if(!id)return;const role=$('add-crew-role').value||'Operatőr';const c=crewById(id);
    if(role==='Projektvezető'){setDraft({lead:id});toast((c?c.name:'')+' projektvezető');return;}
    const crew=clone(d.crew||[]),day=projDays(d).includes(S.crewDay)?S.crewDay:'',was=crew.some(a=>a.crewId===id)||d.lead===id;
    if(day){const all=projDays(d),cd=Object.assign({},d.crewDays||{});let cur=was?crewDaysOf(d,id).slice():[];if(!cur.includes(day))cur.push(day);
      if(cur.length===all.length)delete cd[id];else cd[id]=all.filter(x=>cur.includes(x));
      if(!crew.some(a=>a.crewId===id&&a.role===role))crew.push({crewId:id,role});setDraft({crew,crewDays:cd});toast((c?c.name:'')+' beosztva a '+(all.indexOf(day)+1)+'. napra: '+role);return;}
    if(crew.some(a=>a.crewId===id&&a.role===role)){toast('Már be van osztva ebben a szerepben.',true);render(true);return;}
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
  const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);document.body.classList.remove('col-resizing');try{localStorage.setItem('lpm_fin_cols5',JSON.stringify(widths));}catch(err){}};
  document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);
});
document.addEventListener('dblclick',e=>{const g=e.target.closest&&e.target.closest('.col-grip');if(!g)return;try{localStorage.removeItem('lpm_fin_cols5');}catch(err){}render(true);});

/* ===== Naptár: nap kijelölése, buborék a projektekről, jobb klikkes törlés ===== */
document.addEventListener('click',e=>{const day=e.target.closest&&e.target.closest('.cal-day');if(!day||e.target.closest('button'))return;
  S.cal.sel=day.dataset.day;document.querySelectorAll('.cal-day.sel').forEach(x=>x.classList.remove('sel'));day.classList.add('sel');});
function calTipHtml(el){
  const id=el.dataset.tipid;
  if(el.dataset.kind==='p'){const p=projById(id);if(!p)return '';const r=pr(p),lead=crewById(p.lead),due=dueDate(p),di=dueInfo(p);
    const rows=[['Ügyfél',p.client],['Időpont',r?fmtRange(p)+(p.startTime?', '+p.startTime+(p.endTime?'–'+p.endTime:''):''):''],['Helyszín',p.venue],['Állapot',STATUS_LABEL[p.status||'egyeztetes']],['Projektvezető',lead&&lead.name],
      ['Stáb',crewIds(p).size?crewIds(p).size+' fő':''],['Átadási határidő',due&&needsDelivery(p)?fmtDay(due)+(di&&p.status!=='atadva'?' · '+di.txt:''):''],['Kapcsolattartó',[p.contactName,p.contactPhone].filter(Boolean).join(', ')]].filter(x=>x[1]);
    return `<b>${esc(p.name||'Névtelen projekt')}</b>${rows.map(([k,v])=>`<div><span>${esc(k)}</span>${esc(v)}</div>`).join('')}`;}
  let ev=null;Object.values(S.cal.events||{}).forEach(l=>(l||[]).forEach(x=>{if(x.id===id)ev=x;}));if(!ev)return '';
  return `<b>${esc(ev.title||'(nincs cím)')}</b>${[['Időpont',fmtShort(ev.date)+(ev.endDate&&ev.endDate!==ev.date?' – '+fmtShort(ev.endDate):'')+(ev.start?', '+ev.start+(ev.end?'–'+ev.end:''):'')],['Helyszín',ev.location]].filter(x=>x[1]).map(([k,v])=>`<div><span>${esc(k)}</span>${esc(v)}</div>`).join('')}<div class="tip-hint">Jobb klikk: törlés</div>`;
}
document.addEventListener('mouseover',e=>{const el=e.target.closest&&e.target.closest('.cal-chip');if(!el){const t=$('calTip');if(t&&!e.target.closest('#calTip'))t.remove();return;}
  if(el._tip)return;document.querySelectorAll('.cal-chip').forEach(x=>x._tip=false);el._tip=true;
  const h=calTipHtml(el);let t=$('calTip');if(!h){if(t)t.remove();return;}
  if(!t){t=document.createElement('div');t.id='calTip';t.className='cal-tip';document.body.appendChild(t);}t.innerHTML=h;
  const r=el.getBoundingClientRect(),w=Math.min(300,innerWidth-16);t.style.width=w+'px';let x=r.left+scrollX;if(x+w>scrollX+innerWidth-8)x=scrollX+innerWidth-8-w;
  t.style.left=x+'px';t.style.top=(r.bottom+scrollY+6)+'px';});
document.addEventListener('mouseout',e=>{const el=e.target.closest&&e.target.closest('.cal-chip');if(el&&!el.contains(e.relatedTarget)){el._tip=false;const t=$('calTip');if(t)t.remove();}});
document.addEventListener('contextmenu',e=>{const el=e.target.closest&&e.target.closest('.cal-chip');if(!el)return;e.preventDefault();const t=$('calTip');if(t)t.remove();
  const id=el.dataset.tipid,isP=el.dataset.kind==='p';let m=$('calMenu');if(m)m.remove();m=document.createElement('div');m.id='calMenu';m.className='cal-menu';
  m.innerHTML=isP?`<button type="button" data-action="open-project" data-id="${esc(id)}">Projekt megnyitása</button>`
    :`<button type="button" data-action="cal-event" data-id="${esc(id)}">Részletek</button><button type="button" class="bad-txt" data-action="cal-ctx-del" data-id="${esc(id)}">🗑️ Törlés a naptárból</button>`;
  document.body.appendChild(m);m.style.left=Math.min(e.pageX,scrollX+innerWidth-200)+'px';m.style.top=e.pageY+'px';});
document.addEventListener('click',e=>{const m=$('calMenu');if(m&&!e.target.closest('#calMenu'))m.remove();else if(m&&e.target.closest('button'))setTimeout(()=>{const x=$('calMenu');if(x)x.remove();},0);},true);
ACT['cal-ctx-del']=b=>{const id=b.dataset.id;let ev=null;Object.values(S.cal.events||{}).forEach(l=>(l||[]).forEach(x=>{if(x.id===id)ev=x;}));
  confirmModal('Bejegyzés törlése',`Biztosan törlöd a(z) „${ev?ev.title:'bejegyzés'}” bejegyzést a Google Naptárból?`,'Törlés',async()=>{try{await call('deleteCalEvent',{id});S.cal.events={};render(true);toast('Bejegyzés törölve');}catch(e){handleErr(e);}});};

/* ===== Helyszín: címkereső (OpenStreetMap / Photon), gépelés közben ===== */
let ADDR_T=0,ADDR_SEQ=0,ADDR_ITEMS=[];
function addrFmt(f){const p=f.properties||{},street=[p.street,p.housenumber].filter(Boolean).join(' '),city=[p.postcode,p.city||p.town||p.village||p.county].filter(Boolean).join(' ');
  const name=p.name&&p.name!==p.street?p.name:'';return [name,street,city].filter(Boolean).join(', ')||p.name||'';}
async function addrSearch(input){const q=input.value.trim();if(q.length<3){pickClose();return;}const my=++ADDR_SEQ;
  try{const r=await fetch('https://photon.komoot.io/api/?limit=7&lat=47.5&lon=19.05&q='+encodeURIComponent(q));const j=await r.json();if(my!==ADDR_SEQ||document.activeElement!==input)return;
    const seen=new Set();ADDR_ITEMS=(j.features||[]).map(addrFmt).filter(x=>x&&!seen.has(x)&&seen.add(x));
    if(!ADDR_ITEMS.length){pickClose();return;}
    pickShow(input,ADDR_ITEMS.map((t,i)=>`<button type="button" class="addr-item" data-addr="${i}"><b>${esc(t.split(', ')[0])}</b><small>${esc(t.split(', ').slice(1).join(', '))}</small></button>`).join('')+'<div class="hs-empty" style="font-size:11px">Címadatok: © OpenStreetMap</div>');}
  catch(e){}}
document.addEventListener('input',e=>{if(e.target.id==='f-venue'&&!ro()){clearTimeout(ADDR_T);const t=e.target;ADDR_T=setTimeout(()=>addrSearch(t),350);}});
document.addEventListener('mousedown',e=>{const it=e.target.closest&&e.target.closest('.addr-item');if(!it)return;e.preventDefault();e.stopPropagation();const v=ADDR_ITEMS[Number(it.dataset.addr)];pickClose();
  const inp=$('f-venue');if(inp&&v){inp.value=v;setDraft({venue:v});}},true);
document.addEventListener('focusout',e=>{if(e.target.id==='f-venue')setTimeout(()=>{if(document.activeElement!==e.target&&$('hsBox')&&$('hsBox').querySelector('.addr-item'))pickClose();},150);});

/* Időpont gépelése: „1000” → „10:00”, „930” → „09:30” (minden böngészőben ugyanúgy) */
function timeNorm(v){const d=String(v||'').replace(/\D/g,'').slice(0,4);if(!d)return '';let h,m;
  if(d.length<=2){h=+d;m=0;}else if(d.length===3){h=+d.slice(0,1);m=+d.slice(1);}else{h=+d.slice(0,2);m=+d.slice(2);}
  if(h>23||m>59)return null;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
document.addEventListener('input',e=>{const t=e.target;if(!t.dataset||!t.dataset.time)return;const d=t.value.replace(/\D/g,'').slice(0,4);
  const v=d.length>2?d.slice(0,d.length-2)+':'+d.slice(-2):d;if(v!==t.value){t.value=v;try{t.setSelectionRange(v.length,v.length);}catch(_){}}},true);
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||!t.dataset.time)return;const n=timeNorm(t.value);
  if(n===null){toast('Érvénytelen időpont – például 10:00 vagy 930.',true);t.value=S.draft&&S.draft[t.dataset.field]||'';return;}t.value=n;},true);
