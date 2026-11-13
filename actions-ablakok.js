'use strict';
/* ===== Ablakok ===== */
let modalSubmit=null,MD_KEY='';
/* Félbehagyott ablakok: amit beírtál, megmarad (bezárás, frissítés, másik munkamenet után is); a „Mégse” vagy a sikeres mentés törli. */
const mdKey=title=>'lpm_md_'+title+'|'+((S.draft&&S.draft.id)||S.tab||'');
function mdSave(){if(!MD_KEY)return;const f=$('mform');if(!f)return;const o={};
  f.querySelectorAll('input[name],textarea[name],select[name]').forEach(el=>{if(el.type==='hidden'||el.type==='password'||el.type==='file')return;const n=el.name;
    if(el.type==='checkbox'){(o[n]=o[n]||{c:[]}).c.push(el.checked?el.value:null);}else if(el.type==='radio'){if(el.checked)o[n]={v:el.value};else if(!o[n])o[n]={v:null};}else if(o[n]&&o[n].a)o[n].a.push(el.value);else o[n]={v:el.value,a:[el.value]};});
  try{localStorage.setItem(MD_KEY,JSON.stringify(o));}catch(e){}}
function mdSig(){const f=$('mform');if(!f)return '';let h=5381;const str=[...f.querySelectorAll('input[name],textarea[name],select[name]')].map(el=>el.name+'='+(el.type==='checkbox'||el.type==='radio'?(el.checked?1:0):el.value)).join('\u0001');
  for(let i=0;i<str.length;i++)h=((h<<5)+h+str.charCodeAt(i))|0;return (h>>>0).toString(36);}
function mdClear(k){try{localStorage.removeItem(k||MD_KEY);}catch(e){}}
function mdRestore(key){let o=null;try{o=JSON.parse(localStorage.getItem(key)||'null');}catch(e){}if(!o)return;const f=$('mform');if(!f||MD_KEY!==key)return;
  Object.entries(o).forEach(([n,x])=>{if(/^b(Email2?|Name|Tax|Zip|City|Addr)$/.test(n))return;   // a számla vevőadatai mindig a friss ügyféladatokból jönnek (nem a félbehagyott űrlapból)
    const els=[...f.querySelectorAll(`[name="${CSS.escape(n)}"]`)];if(!els.length)return;
    els.forEach((el,i)=>{let ch=false;if(el.type==='checkbox'){if(x.c){const v=x.c.includes(el.value);if(el.checked!==v){el.checked=v;ch=true;}}}
      else if(el.type==='radio'){if(x.v!=null&&el.value===x.v&&!el.checked){el.checked=true;ch=true;}}else{const v=els.length>1?(x.a?x.a[i]:undefined):x.v;if(v!=null&&el.value!==v){el.value=v;ch=true;}}
      if(ch){el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}});});}
document.addEventListener('input',e=>{if(MD_KEY&&e.target.closest&&e.target.closest('#mform')){clearTimeout(mdSave._t);mdSave._t=setTimeout(mdSave,300);}});
document.addEventListener('change',e=>{if(MD_KEY&&e.target.closest&&e.target.closest('#mform'))setTimeout(mdSave,0);});
document.addEventListener('change',e=>{if(e.target.id==='m-endDate'&&e.target.value){const w=e.target.closest('.np-end');if(w&&w.hidden){w.hidden=false;const m=document.querySelector('.np-multi');if(m)m.hidden=true;}}});   // visszatöltött piszkozatnál is látsszon
/* Nyitott ablak visszaállítása frissítés után (az egész appban): az ablakot nyitó művelet és adatai a munkamenetben */
const MR_KEY='lpm_modal_open',MR_SKIP=/^(vid-view|bd-lane|vv-nav|modal-bg|close-modal)$|del|storno|send|reject|approve|sync|upload|pick|logout|copy|print|export|login|paid|done|move|toggle|accept|finalize|veglegesit|lock|close/i;
function mrNote(){const L=window._lastAct;if(!L||Date.now()-L.t>4000||MR_SKIP.test(L.a))return;try{sessionStorage.setItem(MR_KEY,JSON.stringify({a:L.a,d:L.d,tab:S.tab||''}));}catch(e){}}
function mrClear(){try{sessionStorage.removeItem(MR_KEY);}catch(e){}}
function modalRestore(){if(S._mrDone)return;S._mrDone=true;let o=null;try{o=JSON.parse(sessionStorage.getItem(MR_KEY)||'null');}catch(e){}if(!o||!o.a||!ACT[o.a])return;
  let n=0;const go=()=>{if($('mform')){if(++n<20)setTimeout(go,300);return;}if(!S.loaded&&!(S.projects||[]).length){if(++n<40)setTimeout(go,300);return;}if(o.tab&&S.tab!==o.tab)return;
    const fake={dataset:Object.assign({},o.d),tagName:'BUTTON',closest:()=>null,classList:{contains:()=>false,add(){},remove(){},toggle(){}},getAttribute:()=>null,setAttribute(){},removeAttribute(){},style:{}};
    try{window._lastAct={a:o.a,d:o.d,t:Date.now()};ACT[o.a](fake);}catch(e){mrClear();}};setTimeout(go,150);}
function openModal(title,body,{submit,submitLabel='Mentés',left='',cancelLabel='Mégse',noDraft=false}={}){mrNote();
  modalSubmit=submit||null;MD_KEY=submit&&!noDraft?mdKey(title):'';if(noDraft)try{mdClear(mdKey(title));}catch(e){}   // noDraft: mindig üres űrlap (a félbehagyott nem töltődik vissza)
  $('modalRoot').innerHTML=`<div class="modal" data-action="modal-bg"><form class="mbox" id="mform" role="dialog" aria-modal="true" aria-label="${esc(title)}" novalidate>
    <div class="mhead"><h3>${esc(title)}</h3><button type="button" class="x" data-action="modal-close" aria-label="Bezárás">×</button></div>
    ${body}
    <div class="mfoot">${left?`<span class="left">${left}</span>`:''}<button type="button" class="btn outline" data-action="${submit?'modal-cancel':'modal-close'}">${esc(cancelLabel)}</button>${submit?`<button type="submit" class="btn primary">${esc(submitLabel)}</button>`:''}</div></form></div>`;
  if(MD_KEY)MD_KEY+='|'+mdSig();   // a piszkozat csak ugyanarra a kiinduló űrlapra töltődik vissza (pl. másik munkatárs szerkesztésekor nem)
  const mdBase=MD_KEY?MD_KEY.slice(0,MD_KEY.lastIndexOf('|')):'';
  document.documentElement.style.overflow='hidden';
  {const lf=$('modalRoot').querySelector('.links-field'),pf=$('modalRoot').querySelector('.pass-field'),ad=lf&&lf.querySelector('.link-add');if(lf&&pf&&ad&&!lf.querySelector('.cd-linkrow')){const row=document.createElement('div');row.className='cd-linkrow';ad.replaceWith(row);row.append(ad,pf);}}   // „+ Újabb link” és a jelszó egy sorban (minden linkes ablakban)
  const first=$('modalRoot').querySelector('input:not([type=checkbox]):not([type=radio]),textarea,select');if(first)first.focus();
  if(MD_KEY){const k0=MD_KEY;setTimeout(()=>{if(MD_KEY!==k0)return;MD_KEY=mdBase+'|'+mdSig();mdRestore(MD_KEY);},0);}   // az aláírás a már kitöltött űrlapból készül (sok ablak a megnyitás után tölti be az adatokat) – így egy ügyfél piszkozata nem kerül át egy másikra
}
/* ⌘/Ctrl + Enter: a felugró ablak fő gombja (Tovább / Mentés / Felvétel …), szövegmezőből is */
document.addEventListener('keydown',e=>{if(e.key!=='Enter'||!(e.metaKey||e.ctrlKey)||e.isComposing)return;const f=$('mform');if(!f||!modalSubmit)return;
  const b=f.querySelector('button[type=submit]');if(!b||b.disabled)return;e.preventDefault();if(f.requestSubmit)f.requestSubmit(b);else b.click();});
/* Megerősítő réteg a nyitott ablak fölött: „← Vissza” visszavisz (a beírt adatok megmaradnak), a fő gomb végrehajt */
function confirmLayer(title,html,okLabel,onOk){const root=$('modalRoot');if(!root)return;const old=root.querySelector('.cf-layer');if(old)old.remove();
  const d=document.createElement('div');d.className='modal cf-layer';
  d.innerHTML=`<div class="mbox" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="mhead"><h3>${esc(title)}</h3></div>${html}<div class="mfoot"><button type="button" class="btn outline" data-cf="back">← Vissza</button><button type="button" class="btn primary" data-cf="ok">${esc(okLabel)}</button></div></div>`;
  d.addEventListener('click',e=>{const b=e.target.closest('[data-cf]');if(!b){if(e.target===d)d.remove();return;}e.stopPropagation();if(b.dataset.cf==='back'){d.remove();return;}{const r=onOk(b,d);if(r&&typeof r.then==='function')workBtn(b,r);}});
  root.appendChild(d);d.querySelector('[data-cf=ok]').focus();}
/* iframe tartalmának magassága: a body valós magassága + margók (a documentElement.scrollHeight a keretnél sosem kisebb, így minden gépeléskor nőne) */
function ifrH(f){const d=f.contentDocument,b=d&&d.body;if(!b)return 0;if(b.style.display!=='flow-root')b.style.display='flow-root';const cs=d.defaultView.getComputedStyle(b);return Math.ceil(b.getBoundingClientRect().height+(parseFloat(cs.marginTop)||0)+(parseFloat(cs.marginBottom)||0))+2;}
function closeModal(){{const mu=document.getElementById('modalUnder');if(mu)mu.innerHTML='';}let after=null;if(window.MODAL_BEFORE_CLOSE){const f=window.MODAL_BEFORE_CLOSE;window.MODAL_BEFORE_CLOSE=null;try{after=f();}catch(e){}}if(MD_KEY&&$('mform'))mdSave();$('modalRoot').innerHTML='';modalSubmit=null;MD_KEY='';document.documentElement.style.overflow='';if(typeof after==='function')try{after();}catch(e){}if(!$('mform'))mrClear();}   /* after: ugyanabban a lépésben nyíló következő ablak (nincs villanás) */
function confirmModal(title,text,okLabel,onOk){openModal(title,`<p style="margin:0">${esc(text)}</p>`,{submitLabel:okLabel,submit:async()=>{closeModal();await onOk();}});}
const mf=(name,label,o={})=>`<div class="field${o.full?' full':''}"><label for="m-${name}">${label}</label><input class="inp" id="m-${name}" name="${name}" type="${o.type||'text'}"${o.ac?` autocomplete="${o.ac}"`:''} value="${esc(o.v??'')}"${o.ph?` placeholder="${esc(o.ph)}"`:''}${o.min!=null?` min="${o.min}"`:''}${o.im?` inputmode="${o.im}"`:''}${o.max?` maxlength="${o.max}"`:''}></div>`;
const ms=(name,label,opts,v,o={})=>`<div class="field${o.full?' full':''}"><label for="m-${name}">${label}</label><select class="inp" id="m-${name}" name="${name}"${o.cmb===false?'':` data-cmb="${esc(o.cmb||'Válassz…')}"`}>${o.empty!=null?`<option value="">${o.empty}</option>`:''}${opts.map(x=>{const [val,lab]=Array.isArray(x)?x:[x,x];return `<option value="${esc(val)}"${val===v?' selected':''}>${esc(lab)}</option>`;}).join('')}</select></div>`;
/* Forintmező: csak számjegy, ezres tagolás, ± gomb 1000 Ft-onként */
const MONEY_MAX=999999999,MONEY_STEP=1000;
const moneyFmt=n=>n==null||n===''?'':String(Math.round(+n)).replace(/\B(?=(\d{3})+(?!\d))/g,'\u00a0');   // mindig ezres tagolás (2 000 is)
const moneyVal=s=>{const d=String(s||'').replace(/\D/g,'');return d===''?'':Math.min(MONEY_MAX,Number(d));};
const moneyField=(name,label,v,o={})=>`<div class="field"><label for="m-${name}">${label}</label><div class="money">${o.steps===false?'':`<button type="button" class="money-btn" data-action="money-step" data-for="m-${name}" data-d="-1" aria-label="${label}: −1000 Ft">−</button>`}<input class="inp money-inp" id="m-${name}" name="${name}" type="text" inputmode="numeric" autocomplete="off" placeholder="${esc(o.ph||'pl. 40 000')}" value="${esc(moneyFmt(v))}" data-money="1"><span class="money-unit">Ft</span>${o.steps===false?'':`<button type="button" class="money-btn" data-action="money-step" data-for="m-${name}" data-d="1" aria-label="${label}: +1000 Ft">+</button>`}</div></div>`;
/* a Beállítások naplója a felhasználók mentése után frissül */
function refreshLog(){if(S.tab!=='beallitasok'||!isAdmin())return;call('getLog').then(l=>{S.log=l;if(S.tab==='beallitasok'&&!$('modalRoot').innerHTML)render(true);}).catch(()=>{});}
function calEventById(id){for(const k in S.cal.events){const e=(S.cal.events[k]||[]).find(x=>x.id===id);if(e)return e;}return null;}
/* A Vágói naptár bejegyzéséhez tartozó projekt: a megjelölt projekt, vagy név (közös szavak) és időpont alapján a legvalószínűbb */
function vagoiProjects(ev){const P=(S.projects||[]).filter(p=>p.status!=='lemondva');
  if(ev.projectId){const p=P.find(x=>x.id===ev.projectId);if(p)return {open:p,list:[]};}
  const STOP=new Set(['a','az','es','de','2025','2026','2027','videok','video','short','shortok','shortja','aftermovie','vagas','vago','osszefoglalo','kivagasok']);
  const toks=t=>new Set(fold(t).replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(w=>w.length>1&&!STOP.has(w)));
  const et=toks(ev.title),ed=ev.endDate||ev.date;
  const sc=P.map(p=>{const q=pr(p);if(!q)return null;const gap=(toDate(ed)-toDate(q.end))/864e5;if(gap<-10||gap>75)return null;   // a vágás a forgatás körül / után van
    let n=0;toks(p.name).forEach(w=>{if(et.has(w))n++;});return n?{p,n,gap:Math.abs(gap)}:null;}).filter(Boolean).sort((a,b)=>b.n-a.n||a.gap-b.gap);
  const best=sc[0],second=sc[1];
  if(best&&(best.n>=2||(best.n===1&&et.size<=2))&&(!second||second.n<best.n||second.gap>best.gap+7))return {open:best.p,list:[]};
  return {open:null,list:sc.slice(0,3).map(x=>x.p)};}
function calEventModal(id){
  const e=calEventById(id);if(!e)return;S._calEv=e;   // az ablak nyitva tartása alatt a naptár frissülhet – megjegyezzük az eseményt
  const when=e.date===e.endDate?F_FULL.format(toDate(e.date)):F_FULL.format(toDate(e.date))+' – '+F_FULL.format(toDate(e.endDate));
  const crewOf=m=>S.crew.find(c=>String(c.email||'').toLowerCase()===m);
  const guests=(e.guests||[]).map(m=>{const c=crewOf(m);return c?`<span class="statuspill">${esc(c.name)}</span>`:`<span class="statuspill" style="opacity:.7">${esc(m)}</span>`;}).join('');
  openModal(e.title||'Esemény',`<div class="kv"><span>Időpont</span><b>${esc(when)}${e.start?' · '+esc(e.start)+'–'+esc(e.end):''}</b></div>
    ${e.location?`<div class="kv"><span>Helyszín</span><b>${esc(e.location)}</b></div>`:''}
    ${guests?`<div><span class="lbl">Résztvevők</span><div class="roles" style="margin-top:6px">${guests}</div></div>`:''}
    ${e.description?`<p class="pc-note" style="max-height:220px;overflow:auto">${esc(e.description)}</p>`:''}
    ${ro()?'':`${tplFieldHtml('Ha ez egy visszatérő munka, válaszd ki a sablont: az ügyfél, a kapcsolattartó, a tartalmak, a stáb, az eszközök és a díjak a sablonból jönnek, a dátum, az időpont és a helyszín a naptáreseményből.')}`}
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
/* Másik lapon (pl. a TIG-ből megnyitott projekt) mentett projekt: ez a lap is frissül, a nyitott TIG-sorok is */
const PROJ_BC=(()=>{try{return new BroadcastChannel('lumos-pm-proj');}catch(e){return null;}})();
function projBroadcast(p){try{if(PROJ_BC)PROJ_BC.postMessage({p});}catch(e){}}
if(PROJ_BC)PROJ_BC.onmessage=ev=>{const p=ev.data&&ev.data.p;if(!p||!p.id||!S.projects)return;const k=S.projects.findIndex(x=>x.id===p.id);
  if(k>=0){if(String(S.projects[k].updatedAt||'')>String(p.updatedAt||''))return;S.projects[k]=p;}else S.projects.push(p);
  if(typeof tigSyncRows==='function'&&$('tig-rows'))tigSyncRows(p);else if(!$('mform')&&S.projectId!==p.id)render(true);};
/* „A kapcsolattartó és a cég képviselője ugyanaz”: a képviselő mezői a kapcsolattartóéit másolják (nem írhatók); pipa nélkül kézzel kell kitölteni */
function repCopy(){const ck=$('m-repSame'),box=document.querySelector('.rep-box');if(!ck||!box)return;const same=ck.checked;box.classList.toggle('rep-same',same);
  ['m-rep','m-repTitle','m-repEmail','m-repPhone'].forEach(id=>{const x=$(id);if(x)x.readOnly=same;});if(!same)return;
  const g=id=>($(id)||{}).value||'';const r=$('m-rep'),em=$('m-repEmail');if(r)r.value=g('m-contactName');if(em)em.value=g('m-contactEmail');{const t=$('m-repTitle');if(t)t.value=g('m-contactTitle');}
  const src=document.querySelector('.phone-row[data-ph="n:contactPhone"]'),dst=document.querySelector('.phone-row[data-ph="n:repPhone"]');
  if(src&&dst){const sc=src.querySelector('.ph-cc'),dc=dst.querySelector('.ph-cc');dc.dataset.cc=sc.dataset.cc;dc.innerHTML=sc.innerHTML;dst.querySelector('.ph-num').value=src.querySelector('.ph-num').value;
    const sh=src.querySelector('input[type=hidden]'),dh=dst.querySelector('input[type=hidden]');if(sh&&dh)dh.value=sh.value;}}
document.addEventListener('change',e=>{if(e.target.id!=='m-repSame')return;if(!e.target.checked){['m-rep','m-repTitle','m-repEmail','m-repPhone'].forEach(id=>{const x=$(id);if(x)x.value='';});const h=document.querySelector('.phone-row[data-ph="n:repPhone"] input[type=hidden]');if(h)h.value='';}repCopy();if(!e.target.checked){const r=$('m-rep');if(r)r.focus();}});
document.addEventListener('input',e=>{if(['m-contactName','m-contactTitle','m-contactEmail','m-contactPhone'].includes(e.target.id))setTimeout(repCopy,0);});
/* A képviselő neve is a HubSpotban keres (név alapján, üresen a cég kapcsolatai) */
let HSR_T=0,HSR_SEQ=0;
async function hsRep(){const box=$('hsRep'),inp=$('m-rep');if(!box||!inp||inp.readOnly)return;const my=++HSR_SEQ,q=inp.value.trim(),client=(($('m-client')||{}).value||'').trim();
  if(q.length<2&&client.length<2){box.innerHTML='';return;}box.innerHTML=searchingHtml('Keresés a HubSpotban');
  try{const r=await call('hubspotContacts',q.length>=2?{q}:{q:'',client});if(my!==HSR_SEQ||!$('hsRep'))return;S._hsr=r||[];
    $('hsRep').innerHTML=S._hsr.length?S._hsr.slice(0,8).map((c,i)=>`<button type="button" class="hs-item" data-action="hs-rpick" data-i="${i}"><b>${esc(c.name)}</b><small>${esc([c.company,c.title,c.phone,c.email].filter(Boolean).join(' · '))}</small></button>`).join(''):'<p class="hint">Nincs találat a HubSpotban.</p>';}
  catch(e){if($('hsRep'))$('hsRep').innerHTML=`<p class="hint bad-txt">${esc(errText(e))}</p>`;}}
document.addEventListener('input',e=>{if(e.target.id==='m-rep'){clearTimeout(HSR_T);HSR_T=setTimeout(hsRep,400);}});

function knownClients(q){
  const ql=fold(q),seen={},out=[];
  (S.clients||[]).forEach(r=>{const c=String(r.name||'').trim();if(!c)return;const k=c.toLowerCase();if(seen[k]||(ql&&fold(c).indexOf(ql)<0))return;
    seen[k]=1;out.push({id:r.id,company:c,name:r.contactName||'',phone:r.contactPhone||'',email:r.contactEmail||'',tax:r.tax||'',address:r.address||'',note:r.note||'',rep:r.rep||'',repPhone:r.repPhone||'',repEmail:r.repEmail||'',repTitle:r.repTitle||'',contactTitle:r.contactTitle||''});});
  S.projects.slice().sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))).forEach(p=>{
    const c=String(p.client||'').trim();if(!c)return;const k=c.toLowerCase();if(seen[k]||(ql&&fold(c).indexOf(ql)<0))return;
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
  box.innerHTML=searchingHtml('Keresés a HubSpotban');
  try{const r=await call('hubspotContacts',q.trim().length>=2?{q:q.trim()}:{q:'',client:client.trim()});if(my!==HS_SEQ||!$('hsInline'))return;S._hsi=r||[];
    $('hsInline').innerHTML=S._hsi.length?S._hsi.map((c,i)=>`<button type="button" class="hs-item" data-action="hs-ipick" data-i="${i}"><b>${esc(c.name)}</b><small>${esc([c.company,c.title,c.phone,c.email].filter(Boolean).join(' · '))}</small></button>`).join(''):'<p class="hint">Nincs találat a HubSpotban.</p>';}
  catch(e){if($('hsInline'))$('hsInline').innerHTML=`<p class="hint bad-txt">${esc(errText(e))}</p>`;}
}
async function hsSearch(q){
  const box=$('hsList');if(!box)return;const my=++HS_SEQ;box.innerHTML=searchingHtml('Keresés a HubSpotban');
  try{const r=await call('hubspotContacts',{q,client:(S.draft&&S.draft.client)||''});if(my!==HS_SEQ||!$('hsList'))return;S._hs=r||[];
    $('hsList').innerHTML=S._hs.length?S._hs.map((c,i)=>`<button type="button" class="hs-item" data-action="hs-pick" data-i="${i}"><b>${esc(c.name)}</b><small>${esc([c.company,c.title,c.phone,c.email].filter(Boolean).join(' · '))}</small></button>`).join('')
      :`<p class="hint">${q?'Nincs találat.':'Az ügyfél cégéhez nincs kapcsolattartó a HubSpotban – keress név vagy e-mail alapján.'}</p>`;}
  catch(e){if($('hsList'))$('hsList').innerHTML=`<p class="hint bad-txt">${esc(errText(e))}</p>`;}
}
document.addEventListener('input',e=>{if(e.target.id==='m-contactName'){const b=$('hsInline');if(b)b.style.display='';}if(e.target.id==='m-contactName'||e.target.id==='m-client'){clearTimeout(HS_T);HS_T=setTimeout(hsInline,400);}if(e.target.id==='m-hsq'){clearTimeout(HS_T);const v=e.target.value.trim();HS_T=setTimeout(()=>hsSearch(v.length>=2?v:''),350);}});
