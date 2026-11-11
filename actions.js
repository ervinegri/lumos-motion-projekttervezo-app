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
/* ===== Díjcsökkentés ===== */
function penApply(pid,list){const p=projById(pid);if(p)p.penalties=list;if(S.draft&&S.draft.id===pid)S.draft.penalties=list;render(true);}
function penCaseOpts(kind,name){const k=PEN_KINDS[kind];   // több eset is bejelölhető
  return (k?k.cases:[]).concat(['Egyéb (az indoklásban leírva)']).map(c=>`<label class="pen-case-o"><input type="checkbox" name="${name}" value="${esc(c)}"><span>${esc(c)}</span></label>`).join('');}
function penModal(cid){
  const d=S.draft;if(!d)return;const c=crewById(cid),f=(d.fees||[]).find(x=>x.crewId===cid&&x.kind!=='fixed'),fee=f?num(f.amount):0;
  const cds=projDays(d).length>1&&!isPostOnly(d,cid)?crewDaysOf(d,cid):[],da=(f&&f.dayAmounts)||{};PEN_CTX={fee,da};
  if(S.dirty){toast('Előbb mentsd el a projekt módosításait.',true);return;}
  openModal('Díjcsökkentés – '+(c?c.name:'munkatárs'),`<p class="hint" style="margin:0 0 10px">A megbízási szerződés minőségi melléklete szerint. Díj ezen a projekten: <b>${ftFmt(fee)}</b>.${isAdmin()?'':' A díjcsökkentés az ügyvezető jóváhagyása után lép érvénybe.'}</p>
    <div class="fields">
      <div class="field full"><label for="m-penKind">Kategória</label><select class="inp" id="m-penKind" name="kind">${Object.entries(PEN_KINDS).map(([k,v])=>`<option value="${k}">${esc(v.label)}${v.pct!=null?' – '+v.pct+'%':v.min?' – '+v.min+'–'+v.max+'%':' – összeg Ft-ban'} (${v.ref} pont)</option>`).join('')}</select></div>
      <div class="field" id="m-penPctF" style="display:none"><label for="m-penPct">Mérték</label><select class="inp" id="m-penPct" name="pct">${[10,20,30,40,50].map(v=>`<option value="${v}">${v}%</option>`).join('')}</select></div>
      <div class="field" id="m-penAmtF" style="display:none"><label for="m-penAmt">Kártérítés összege (Ft)</label><input class="inp" id="m-penAmt" name="amount" inputmode="numeric" data-money="1" placeholder="pl. 50 000"></div>
      ${cds.length?`<div class="field" id="m-penDayF"><label for="m-penDay">Melyik napi munkájára?</label><select class="inp" id="m-penDay" name="day">${cds.map(x=>`<option value="${x}">${esc(dayLbl(x))} – ${ftFmt(num(da[x]))}</option>`).join('')}<option value="">Teljes díj (minden nap) – ${ftFmt(fee)}</option></select></div>`:''}
      <div class="field full"><label>Eset(ek) <span class="muted" style="font-weight:600">– több is bejelölhető</span></label><div class="pen-cases" id="m-penCase">${penCaseOpts('light','caseText')}</div></div>
      <div class="field full"><label for="m-penReason">Írásos indoklás <span class="muted" style="font-weight:600">(3.6. pont – kötelező)</span></label><textarea class="inp" id="m-penReason" name="reason" rows="4" maxlength="3000" placeholder="Mi történt, mikor, milyen következménnyel…"></textarea></div>
      <div class="field full"><label for="m-penLink">Bizonyíték (link, nem kötelező)</label><input class="inp" id="m-penLink" name="link" type="url" placeholder="https://drive.google.com/…"></div>
      <div class="field full"><p class="hint" id="m-penCalc" style="margin:0"></p></div>
      <div class="field full">${penCopyBox('copyMe')}</div>
    </div>`,{submitLabel:isAdmin()?'Kiróvás':'Javaslat küldése jóváhagyásra',submit:async fd=>{
      const kind=fd.get('kind'),reason=String(fd.get('reason')||'').trim();
      if(reason.length<5){toast('Írd le röviden az indoklást.',true);$('m-penReason').focus();return;}
      if(kind==='damage'&&!moneyVal(fd.get('amount'))){toast('Add meg a kártérítés összegét.',true);return;}
      try{const r=await call('addPenalty',{projectId:d.id,crewId:cid,kind,pct:Number(fd.get('pct'))||0,amount:moneyVal(fd.get('amount'))||0,caseText:fd.getAll('caseText').join('; '),day:kind==='damage'?'':String(fd.get('day')||''),reason,link:String(fd.get('link')||'').trim(),copyMe:!!fd.get('copyMe')});
        closeModal();penApply(d.id,r.penalties);toast(isAdmin()?(r.mailed?'Díjcsökkentés kiróva, a szakember e-mailt kapott':S.mailOn===false?'Díjcsökkentés kiróva (az e-mailek szünetelnek, értesítés nem ment ki)':'Díjcsökkentés kiróva (e-mailt nem sikerült küldeni)'):'Elküldve jóváhagyásra az ügyvezetőnek');}
      catch(e){handleErr(e);}}});
  penCalc();
}
let PEN_CTX={fee:0,da:{}};
function penCalc(){const k=$('m-penKind');if(!k)return;const v=k.value;
  $('m-penPctF').style.display=v==='prestige'?'':'none';$('m-penAmtF').style.display=v==='damage'?'':'none';if($('m-penDayF'))$('m-penDayF').style.display=v==='damage'?'none':'';
  const t=$('m-penCalc'),K=PEN_KINDS[v];if(!t||!K)return;
  const pc=v==='prestige'?Number($('m-penPct').value):K.pct,day=$('m-penDay')?$('m-penDay').value:'',base=day?num(PEN_CTX.da[day]):PEN_CTX.fee;
  t.textContent=v==='damage'?'A kártérítés a díjon felül, külön követelésként jelenik meg.':`${day?'A '+dayLbl(day)+' napi díj':'A díj'} ${pc}%-át vonjuk le: −${ftFmt(Math.round(base*pc/100))}. Több levonás együtt legfeljebb a teljes díjat érintheti.`;}
document.addEventListener('change',e=>{if(e.target.id==='m-penKind'){$('m-penCase').innerHTML=penCaseOpts(e.target.value,'caseText');penCalc();}else if(e.target.id==='m-penPct'||e.target.id==='m-penDay')penCalc();});
function penObjectModal(pid,id){
  openModal('Kifogás a díjcsökkentés ellen',`<p class="hint" style="margin:0 0 10px">Írd le, miért nem értesz egyet. Az ügyvezető e-mailben értesítést kap, és megvizsgálja.</p><div class="fields"><div class="field full"><label for="m-objText">Kifogás</label><textarea class="inp" id="m-objText" name="text" rows="5" maxlength="3000"></textarea></div></div>`,
    {submitLabel:'Kifogás elküldése',submit:async fd=>{const text=String(fd.get('text')||'').trim();if(text.length<5){toast('Írd le röviden a kifogásodat.',true);return;}
      try{const r=await call('objectPenalty',{projectId:pid,id,text});closeModal();penApply(pid,r.penalties);toast('Kifogás elküldve');}catch(e){handleErr(e);}}});
}
/* Ügyfél adatai: az eddigi munkák (projektek) – az ügyvezetőnek a projektértékkel és a ténylegesen befolyt (nettó) összeggel */
function paidNetOf(p){if(!S.fin||typeof billInfo!=='function')return null;const i=billInfo(p);
  return Math.round(i.inv.filter(x=>x.kind!=='storno'&&!(x.kind==='dijbekero'&&(x.ref||i.el))).reduce((a,x)=>a+num(x.invPaid)*invShare(x,p.id)*invNetR(x),0));}
function clientWorkHtml(name){const nm=String(name||'').trim().toLowerCase();if(!nm)return '';
  const ps=S.projects.filter(p=>String(p.client||'').trim().toLowerCase()===nm&&pr(p)).sort((a,b)=>byStart(b,a));
  const adm=isAdmin()&&S.capabilities&&S.capabilities.finance;if(adm&&!S.fin&&!S.finErr)setTimeout(()=>finLoad().then(()=>{const b=$('cl-work');if(b)b.outerHTML=clientWorkHtml(name);}),0);
  if(!ps.length)return `<div class="cl-work" id="cl-work"><h4>📁 Eddigi munkák</h4><p class="hint" style="margin:0">Még nincs projekt ennél az ügyfélnél.</p></div>`;
  let tv=0,tp=0;const live=ps.filter(p=>p.status!=='lemondva');
  const rows=ps.map(p=>{const off=p.status==='lemondva',v=adm&&!off?projTotal(p):0,pd=adm&&!off?paidNetOf(p):null;tv+=v;tp+=pd||0;
    return `<tr${off?' class="muted"':''}><td class="nowrap">${esc(fmtShort(pr(p).start))}</td><td><button class="linkbtn" type="button" data-action="cl-open-proj" data-id="${esc(p.id)}">${esc(p.name)}</button>${off?' <span class="muted">(lemondva)</span>':''}</td>${adm?`<td class="num">${v?ftFmt(v):'—'}</td><td class="num">${pd==null?'<span class="spin" style="width:10px;height:10px"></span>':pd?`<b>${ftFmt(pd)}</b>`:'—'}</td>`:''}</tr>`;}).join('');
  return `<div class="cl-work" id="cl-work"><h4>📁 Eddigi munkák <span class="muted">· ${live.length} projekt</span></h4><div class="tbl-wrap"><table class="cl-work-t"><thead><tr><th>Dátum</th><th>Projekt</th>${adm?'<th class="num">Érték (nettó)</th><th class="num">Befolyt (nettó)</th>':''}</tr></thead><tbody>${rows}</tbody>${adm?`<tfoot><tr><td></td><td></td><td class="num"><b>${ftFmt(tv)}</b></td><td class="num"><b>${S.fin?ftFmt(tp):''}</b></td></tr></tfoot>`:''}</table></div></div>`;}
function newClientModal(pre,edit,reg){   // reg: az Ügyfelek fülről (nincs nyitott projekt)
  openModal(edit?'Ügyfél adatai':'Új ügyfél',`<div class="fields">${taxBlock()}${mf('contactName','Kapcsolattartó',{max:120,ac:'off'})}${(()=>{const nm=String((edit&&edit.client)||pre||'').trim().toLowerCase(),cr=(S.clients||[]).find(x=>String(x.name||'').trim().toLowerCase()===nm)||{};return mf('contactTitle','Kapcsolattartó titulusa',{max:120,ph:'pl. marketingvezető',ac:'off',v:(edit&&edit.contactTitle)||cr.contactTitle||''});})()}${mf('contactEmail','Kapcsolattartó e-mail-címe',{type:'email',max:160,ac:'off'})}${phoneField({name:'contactPhone',label:'Kapcsolattartó telefonszáma',value:edit?edit.contactPhone:''})}<div id="hsInline" class="hs-list full" style="display:none"></div>
    ${(()=>{const nm=String((edit&&edit.client)||pre||'').trim().toLowerCase(),cr=(S.clients||[]).find(x=>String(x.name||'').trim().toLowerCase()===nm)||{},v=k=>(edit&&edit[k])||cr[k]||'';
      const cn=String((edit&&edit.contactName)||cr.contactName||'').trim(),same=!!v('rep')&&!!cn&&v('rep').trim()===cn;
      setTimeout(repCopy,0);
      if(!isAdmin())return `<input type="hidden" name="repKeep" value="1">`;   // a cég képviselője csak az ügyvezetőnek látszik
      return `<div class="field full rep-chk"><label><input type="checkbox" name="repSame" id="m-repSame"${same?' checked':''}> A kapcsolattartó és a cég képviselője ugyanaz</label></div>
      <div class="field full rep-box${same?' rep-same':''}"><div class="fields">${mf('rep','Cég képviselője, aláíró',{max:120,ph:'Név – keresés a HubSpotban',ac:'off',v:v('rep')})}${mf('repTitle','Képviselő titulusa',{max:120,ph:'pl. ügyvezető',ac:'off',v:v('repTitle')})}<div id="hsRep" class="hs-list full"></div>${mf('repEmail','Képviselő e-mail-címe',{type:'email',max:160,ac:'off',v:v('repEmail')})}${phoneField({name:'repPhone',label:'Képviselő telefonszáma',value:v('repPhone')})}</div></div>`;})()}</div>${edit&&edit.client?clientWorkHtml(edit.client):''}${edit&&isAdmin()?clientDocsHtml(edit.client):''}`,
    {left:reg&&edit&&edit.id?`<button type="button" class="btn danger small" data-action="del-client" data-id="${esc(edit.id)}">Törlés</button>`:'',submitLabel:edit?'Mentés':'Felvétel',submit:async fd=>{const c=String(fd.get('client')||'').trim();if(c.length<2){toast('Add meg az ügyfél nevét.',true);return;}
      const patch={client:c,clientTax:String(fd.get('clientTax')||'').trim(),clientAddress:String(fd.get('clientAddress')||'').trim()};['contactName','contactPhone','contactEmail'].forEach(k=>{const v=String(fd.get(k)||'').trim();if(v||edit)patch[k]=v;});
      const rec={id:(edit&&edit.id)||uuid(),name:c,tax:patch.clientTax,address:patch.clientAddress,contactName:patch.contactName||'',contactPhone:patch.contactPhone||'',contactEmail:patch.contactEmail||'',contactTitle:String(fd.get('contactTitle')||'').trim(),...(fd.get('repKeep')?(()=>{const nm=c.toLowerCase(),cr=(S.clients||[]).find(x=>edit&&edit.id&&x.id===edit.id)||(S.clients||[]).find(x=>String(x.name||'').trim().toLowerCase()===nm)||{};return {rep:cr.rep||'',repTitle:cr.repTitle||'',repPhone:cr.repPhone||'',repEmail:cr.repEmail||''};})():!fd.get('repSame')?{rep:String(fd.get('rep')||'').trim(),repTitle:String(fd.get('repTitle')||'').trim(),repPhone:String(fd.get('repPhone')||'').trim(),repEmail:String(fd.get('repEmail')||'').trim()}:{rep:patch.contactName||'',repTitle:String(fd.get('contactTitle')||'').trim(),repPhone:patch.contactPhone||'',repEmail:patch.contactEmail||''}),oldName:reg&&edit?edit.client:''};
      if(reg){try{const before=(S.clients||[]).find(x=>x.id===rec.id);const saved=await saveClientRec(rec);entRec('client',(before?'ügyfél módosítása: ':'ügyfél felvétele: ')+saved.name,saved.id,before?clone(before):null,clone(saved));closeModal();toast(edit?'Ügyfél mentve':'Ügyfél felvéve');}catch(e){handleErr(e);}return;}
      closeModal();if(S.draft)setDraft(patch);saveClientRec(rec).catch(()=>{});}});   // a projektből felvett ügyfél is bekerül az Ügyfelek közé
  if(pre){const n=$('m-client');if(n)n.value=pre;}
  if(edit){[['m-clientTax',edit.clientTax],['m-client',edit.client],['m-clientAddress',edit.clientAddress],['m-contactName',edit.contactName],['m-contactEmail',edit.contactEmail]].forEach(([id,v])=>{const e=$(id);if(e)e.value=v||'';});}
}
/* Kereshető ügyfélválasztó: gépelésre szűr, a lista végén mindig ott az „Új ügyfél felvétele”. */
function clientSearch(input,all){
  const q=all?'':input.value.trim(),cur=S.draft&&String(S.draft.client||'').trim();
  pickItems=knownClients(q);
  if(cur&&!pickItems.some(c=>c.company===cur)&&(!q||fhas(cur,q)))pickItems.unshift({company:cur,name:S.draft.contactName||'',phone:S.draft.contactPhone||'',email:S.draft.contactEmail||'',tax:S.draft.clientTax||'',address:S.draft.clientAddress||''});
  if(!q||!pickItems.some(c=>fold(c.company).trim()===fold(q).trim()))pickItems.push({isNew:true,company:q});if(cur&&!q)pickItems.push({isNone:true,company:''});
  pickShow(input,pickItems.map((it,i)=>it.isNone?`<button type="button" class="hs-item" data-hs="${i}"><b class="muted">— Nincs ügyfél (mező ürítése)</b></button>`:it.isNew?`<button type="button" class="hs-item hs-new" data-hs="${i}"><b>+ Új ügyfél felvétele${q?`: „${esc(q)}”`:'…'}</b></button>`
    :`<div class="hs-row${it.company===cur?' cur':''}"><button type="button" class="hs-item" data-hs="${i}"><b>${esc(it.company)}</b><small>${esc([it.name,it.phone,it.email].filter(Boolean).join(' · ')||it.address||'nincs kapcsolattartó megadva')}</small></button></div>`).join('')+(pickItems.length===1&&q?'<div class="hs-empty">Nincs ilyen ügyfél.</div>':''));
}
function clientPick(i){const it=pickItems[i];if(!it||!S.draft)return;pickClose();try{document.activeElement.blur();}catch(e){}
  if(it.isNew){newClientModal(it.company);return;}
  if(it.isNone){setDraft({client:'',clientTax:'',clientAddress:''});return;}
  const patch={client:it.company,clientTax:it.tax||'',clientAddress:it.address||''};if(it.name||it.phone||it.email){patch.contactName=it.name;patch.contactPhone=it.phone;patch.contactEmail=it.email;}
  setDraft(patch);}
document.addEventListener('input',e=>{if(e.target.id==='f-client'&&!ro())clientSearch(e.target);});
document.addEventListener('focusin',e=>{if(e.target.id==='f-client'&&!ro()){e.target.select();clientSearch(e.target,true);}else if($('hsBox')&&!['f-venue','f-contactName','m-venue','m-clientQ','m-contactName'].includes(e.target.id))pickClose();});   // újrarajzoláskor visszakapott fókusz ne zárja be a találati listát
document.addEventListener('focusout',e=>{if(e.target.id==='f-client'){const t=e.target;setTimeout(()=>{if(document.activeElement===t||!S.draft)return;if(!t.value.trim()&&S.draft.client){setDraft({client:'',clientTax:'',clientAddress:''});return;}t.value=S.draft.client||'';},200);}});   // üresre törölve: nincs ügyfél   // választás nélkül visszaáll
document.addEventListener('mousedown',e=>{const ed=e.target.closest&&e.target.closest('.hs-edit');if(ed){e.preventDefault();clientPick(Number(ed.dataset.hsedit));editClientModal();return;}const it=e.target.closest&&e.target.closest('.hs-item');if(it){e.preventDefault();clientPick(Number(it.dataset.hs));return;}if(e.target.id!=='f-client'&&(!e.target.closest||!e.target.closest('#hsBox')))pickClose();});
document.addEventListener('keydown',e=>{if(e.target.id!=='f-client'||!$('hsBox'))return;const its=[...document.querySelectorAll('.hs-item')];
  let i=its.findIndex(x=>x.classList.contains('on'));
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();i=e.key==='ArrowDown'?Math.min(its.length-1,i+1):Math.max(0,i-1);its.forEach((x,j)=>x.classList.toggle('on',j===i));}
  else if(e.key==='Enter'&&i>=0){e.preventDefault();clientPick(Number(its[i].dataset.hs));}
  else if(e.key==='Escape'||e.key==='Tab'){pickClose();}});
window.addEventListener('scroll',()=>{const b=$('hsBox'),a=document.activeElement;if(!b)return;if(a&&a.matches&&a.matches('#f-client,#f-venue,#f-contactName')){const r=a.getBoundingClientRect();b.style.left=(r.left+scrollX)+'px';b.style.top=(r.bottom+scrollY+4)+'px';}else pickClose();},{passive:true});   // görgetéskor a kereső mező alatt marad
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
    status:'tervezes',crew,equipment:[],calEventId:e.id,baseUpdatedAt:'',mutationId:uuid(),deferCal:true};   // a naptár frissítése a háttérben – gyorsabb létrehozás
  if(crew.length&&new Set(crew.map(a=>a.crewId)).size===1)p.lead=crew[0].crewId;
  const tid=($('m-tplId')||{}).value,tpl=tid&&projById(tid);
  if(tpl){p.tplFrom=tpl.id;const skip=new Set(Object.keys(p).concat(TPL_SKIP));Object.keys(tpl).forEach(k=>{if(!skip.has(k))p[k]=clone(tpl[k]);});   // sablon: a naptáresemény adatai (dátum, idő, helyszín, leírás) elsőbbséget élveznek
    if(!p.venue)p.venue=tpl.venue||'';if(!p.startTime){p.startTime=tpl.startTime||'';p.endTime=tpl.endTime||'';}
    (tpl.crew||[]).forEach(a=>{if(!p.crew.some(x=>x.crewId===a.crewId&&x.role===a.role))p.crew.push(clone(a));});
    p.equipment=clone(tpl.equipment||[]);p.fees=clone(tpl.fees||[]).map(f=>{delete f.dayAmounts;return f;});if(tpl.lead)p.lead=tpl.lead;
    if(tpl.notes&&p.notes.indexOf(tpl.notes)<0)p.notes=(p.notes?p.notes+'\n\n':'')+tpl.notes;}
  const saved=await call('saveProject',p);if(!projById(saved.id))S.projects.push(saved);closeModal();S.cal.events={};openProject(saved.id);if(!saved.duplicateOf)syncCal(saved.id);toast(saved.duplicateOf?'Ebből az eseményből már van projekt':(saved.calError||'Projekt létrehozva a naptáreseményből'),!!saved.calError);
  }catch(err){handleErr(err);if(btn&&btn.isConnected){btn.disabled=false;btn.textContent='Projekt létrehozása ebből';}}
  finally{importing=false;}
}
function needName(form,msg){const el=form.querySelector('[name=name]');if(el.value.trim().length<2){el.focus();el.style.borderColor='var(--bad)';toast(msg||'Add meg a nevet.',true);return false;}return true;}
$('modalRoot').addEventListener('submit',async e=>{
  e.preventDefault();if(!modalSubmit)return;
  const form=e.target,btn=form.querySelector('[type=submit]');if(btn){btn.dataset.l=btn.textContent;btn.textContent=btn.textContent.replace(/…$/,'')+'…';btn.disabled=true;}
  const k=MD_KEY;
  try{await workTrack(modalSubmit(new FormData(form),form));if(MD_KEY!==k||!$('mform'))mdClear(k);}   // sikeres mentés: a piszkozat törlődik
  finally{if(btn&&btn.isConnected){btn.disabled=false;btn.textContent=btn.dataset.l;}}
});
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!$('modalRoot').innerHTML)return;const cf=$('modalRoot').querySelector('.cf-layer');if(cf){cf.remove();return;}closeModal();});
/* Folyamatban lévő művelet gombja (pl. „Mentés…”, „Feltöltés…”, „Rögzítés…”): forgó jel + fénycsík, amíg tart */
const BUSY_SYNC=b=>{if(!b||b.tagName!=='BUTTON')return;const on=!!b.dataset.busy||b.disabled&&/…\s*$/.test(b.textContent||'');b.classList.toggle('is-busy',on);if(on)b.setAttribute('aria-busy','true');else b.removeAttribute('aria-busy');};
if(typeof MutationObserver!=='undefined')new MutationObserver(ms=>ms.forEach(m=>{if(m.type==='attributes')BUSY_SYNC(m.target);else if(m.type==='characterData')BUSY_SYNC(m.target.parentElement&&m.target.parentElement.closest('button'));else{BUSY_SYNC(m.target.closest&&m.target.closest('button'));}}))
  .observe(document.body,{subtree:true,attributes:true,attributeFilter:['disabled'],childList:true,characterData:true});

/* Új projekt (a Projektek és a Naptár „+ Új bejegyzés” gombja is ezt nyitja): ugyanazok a kötelező adatok, mint az Alapadatoknál.
   A projekt létrehozás után automatikusan bekerül a Google Naptárba is. */
/* Új projekt: csatolmányok (pl. árajánlat, megrendelő, beszállítói számla) – létrehozás után a projekt Drive-mappájába („Csatolmányok”) kerülnek */
let NP_FILES=[];
const npFilesField=()=>`<div class="field full"><span class="lbl">📎 Csatolmányok (nem kötelező)</span><label class="cdoc-drop np-drop" data-np-drop><input type="file" id="m-npFiles" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" hidden><b>Húzd ide a fájlokat, vagy kattints</b><small class="muted">pl. árajánlat, megrendelő, beszállítói számla – a projekt Drive-mappájába kerülnek (max. 10 MB/fájl)</small></label><div class="np-files" id="m-npList"></div></div>`;
function npFilesAdd(list){[...(list||[])].forEach(f=>{if(f.size>10*1024*1024){toast(f.name+': legfeljebb 10 MB lehet.',true);return;}if(!NP_FILES.some(x=>x.name===f.name&&x.size===f.size))NP_FILES.push(f);});npFilesShow();}
function npFilesShow(){const el=$('m-npList');if(el)el.innerHTML=NP_FILES.map((f,i)=>`<span class="np-file">📄 ${esc(f.name)} <button type="button" class="x w" data-action="np-file-del" data-i="${i}" aria-label="Eltávolítás">✕</button></span>`).join('');}
async function npFilesUpload(pid){const l=NP_FILES;NP_FILES=[];if(!l.length||!pid)return;let ok=0;
  for(const f of l){try{await call('extraFileUpload',{projectId:pid,folder:'Csatolmányok',b64:await readB64(f),name:f.name,mime:f.type||'application/octet-stream'});ok++;}catch(e){toast(f.name+': a feltöltés nem sikerült.',true);}}
  if(ok)toast(ok+' csatolmány feltöltve a projekt Drive-mappájába („Csatolmányok”)');}
document.addEventListener('change',e=>{if(e.target&&e.target.id==='m-npFiles'){npFilesAdd(e.target.files);e.target.value='';}});
document.addEventListener('dragover',e=>{const z=e.target.closest&&e.target.closest('[data-np-drop]');if(z&&e.dataTransfer&&[...e.dataTransfer.types].includes('Files')){e.preventDefault();z.classList.add('over');}});
document.addEventListener('dragleave',e=>{const z=e.target.closest&&e.target.closest('[data-np-drop]');if(z&&!z.contains(e.relatedTarget))z.classList.remove('over');});
document.addEventListener('drop',e=>{const z=e.target.closest&&e.target.closest('[data-np-drop]');if(!z||!e.dataTransfer||!e.dataTransfer.files.length)return;e.preventDefault();z.classList.remove('over');npFilesAdd(e.dataTransfer.files);});
/* Új projekt adatai az űrlapból (létrehozáshoz és piszkozathoz) */
function npBuild(fd){
  const g=k=>String(fd.get(k)||'').trim(),time=v=>/^([01]?\d|2[0-3])[:.]?([0-5]\d)$/.test(v)?v.replace(/^(\d{1,2})[:.]?(\d{2})$/,(m,h,mm)=>h.padStart(2,'0')+':'+mm):'';
  const clientNew=fd.get('clientSel')==='__new';
  const p={id:uuid(),name:g('name'),client:clientNew?g('client'):(g('clientSel')||g('clientQ')),eventType:g('eventType'),date:g('date'),endDate:g('endDate')&&g('endDate')>g('date')?g('endDate'):'',venue:g('venue'),
      contactName:g('contactName'),contactPhone:g('contactPhone'),contactEmail:g('contactEmail'),startTime:time(g('startTime')),endTime:time(g('endTime')),notes:g('notes'),
      status:'tervezes',hours:8,crew:[],equipment:[],baseUpdatedAt:'',mutationId:uuid()};
    if(clientNew){p.clientTax=g('clientTax');p.clientAddress=g('clientAddress');}
    if(p.eventType==='Videóvágás'){p.venue='';p.endDate='';p.startTime='';p.endTime='';}   // videóvágás: csak a leadás napja
    if(g('fromIncome')){p.projectValue=num(g('incAmount'))||null;p._noCal=true;}   // régi bevételi sorból: múltbeli projekt, nem kerül a naptárba
    {const it=knownClients('').find(c=>c.company===p.client);if(it&&!clientNew&&!p.clientTax){p.clientTax=it.tax;p.clientAddress=it.address;}}
  const tid=g('tplId'),tpl=tid&&projById(tid);
  if(tpl){const skip=new Set(Object.keys(p).concat(TPL_SKIP));Object.keys(tpl).forEach(k=>{if(!skip.has(k))p[k]=clone(tpl[k]);});
    p.crew=clone(tpl.crew||[]);p.equipment=clone(tpl.equipment||[]);p.lead=tpl.lead||'';
    p.fees=clone(tpl.fees||[]).map(f=>{delete f.dayAmounts;return f;});   // a napokra bontott díjak az új dátumhoz nem illenek
    if(!p.clientTax&&tpl.clientTax){p.clientTax=tpl.clientTax;p.clientAddress=tpl.clientAddress;}}
  return {p,clientNew,g};
}
function tplFieldHtml(hint){return tplList().length?`<div class="field full tpl-field"><label for="m-tplQ">📋 Sablon – egy korábbi projekt alapján (nem kötelező)</label><div class="tpl-combo"><input class="inp" id="m-tplQ" type="text" autocomplete="off" placeholder="Kattints, és válassz sablont…"><input type="hidden" name="tplId" id="m-tplId"><button type="button" class="tpl-clear" data-action="tpl-clear" aria-label="Sablon törlése" hidden>×</button></div><small class="hint" style="margin:4px 0 0">${hint||'Átveszi az ügyfelet, helyszínt, kapcsolattartót, időpontokat, a megrendelt tartalmakat, a stábot, az eszközöket és a díjakat – csak a dátumot kell megadnod.'}</small></div>`:'';}
/* Sablonok: a korábbi projektek (névenként a legutóbbi), a lemondottak nélkül */
const TPL_SKIP=['id','date','endDate','status','prevStatus','stepsDone','siteOk','siteReport','deliveredAt','dueAt','leadvaAt','deliveryLink','deliveryLinks','deliveryPass','deliveryNotes','calEventId','folderId','createdAt','updatedAt','updatedBy','mutationId','listSentAt','listSentTo','crewFinal','penalties','budgetRequest','payStatus','dueKept','crewDays','lastStartTime','lastEndTime','myFee','duplicateOf','er_post_n','x_foto_n'];
function tplList(){const g=new Map();
  S.projects.filter(p=>p.status!=='lemondva'&&p.name).forEach(p=>{const k=(p.name.trim()+'|'+(p.client||'').trim()).toLowerCase(),st=String((pr(p)||{}).start||'');let e=g.get(k);
    if(!e)g.set(k,e={p,n:0,last:''});e.n++;if(st>=e.last){e.last=st;e.p=p;}});   // névenként a legutóbbi projekt a minta, a darabszám a használat
  return [...g.values()].sort((a,b)=>b.n-a.n||String(b.last).localeCompare(String(a.last)));}
function tplSearch(input){const q=input.value.trim().toLowerCase(),items=tplList().filter(e=>!q||fhas(e.p.name+' '+(e.p.client||''),q)).slice(0,14);TPL_ITEMS=items;
  pickShow(input,items.length?items.map((e,i)=>`<button type="button" class="hs-item tpl-item" data-tpl="${i}"><span class="tpl-n">${esc(e.p.name)}</span><small>${esc(e.p.client||'Nincs ügyfél')}${e.last?' · utoljára '+esc(fmtShort(e.last)):''}</small></button>`).join(''):'<div class="hs-empty">Nincs ilyen sablon.</div>');}
let TPL_ITEMS=[];
function tplPick(e){const q=$('m-tplQ'),h=$('m-tplId'),x=document.querySelector('.tpl-clear');pickClose();if(!q||!h)return;h.value=e.p.id;q.value=e.p.name+(e.p.client?' · '+e.p.client:'');if(x)x.hidden=false;tplFill(e.p.id);}
document.addEventListener('focusin',e=>{if(e.target.id==='m-tplQ')e.target.select();});   // a lista csak kattintásra / gépelésre nyílik
document.addEventListener('click',e=>{if(e.target.id==='m-tplQ'&&!$('hsBox'))tplSearch(e.target);});
document.addEventListener('input',e=>{if(e.target.id==='m-tplQ'){const h=$('m-tplId');if(h)h.value='';tplSearch(e.target);}});
document.addEventListener('mousedown',e=>{const it=e.target.closest&&e.target.closest('.tpl-item');if(!it)return;e.preventDefault();e.stopPropagation();const v=TPL_ITEMS[Number(it.dataset.tpl)];if(v)tplPick(v);},true);
document.addEventListener('focusout',e=>{if(e.target.id==='m-tplQ')setTimeout(()=>{const a=document.activeElement;if((!a||a.id!=='m-tplQ')&&$('hsBox')&&$('hsBox').querySelector('.tpl-item'))pickClose();},150);});
document.addEventListener('keydown',e=>{if(e.target.id!=='m-tplQ')return;if(e.key==='Enter'){e.preventDefault();if(TPL_ITEMS[0])tplPick(TPL_ITEMS[0]);}else if(e.key==='Escape')pickClose();},true);
function tplFill(id){let t=projById(id);const f=$('mform');if(!t||!f)return;
  const set=(n,v)=>{const e=f.querySelector('[name='+n+']');if(e)e.value=v||'';};
  if(t.client){const it=knownClients('').find(c=>c.company===t.client);mcSetClient(it||{isNew:true,company:t.client});}
  set('name',t.name);set('eventType',t.eventType);set('venue',t.venue);{const cl=t.client&&knownClients('').find(c=>c.company===t.client)||{};set('contactName',t.contactName||cl.name);set('contactEmail',t.contactEmail||cl.email);t=Object.assign({},t,{contactPhone:t.contactPhone||cl.phone||''});}   // ha a sablonnál üres, az ügyfél kapcsolattartója
  set('startTime',t.startTime);set('endTime',t.endTime);set('notes',t.notes);
  const ph=$('m-contactPhone');if(ph){const fld=ph.closest('.field');if(fld)fld.outerHTML=phoneField({name:'contactPhone',value:t.contactPhone||''});}
  const dt=f.querySelector('[name=date]');if(dt&&!dt.value)setTimeout(()=>dt.focus(),50);}
/* Piszkozat: csak a név kötelező, a hiányzó adatok a projekt oldalán pótolhatók (piros keret jelzi) */
async function npDraft(btn){const form=$('mform');if(!form)return;if(!needName(form,'A piszkozathoz legalább a projekt nevét add meg.'))return;
  const {p}=npBuild(new FormData(form));if(p.name.length<2){toast('A projekt neve legalább 2 karakter legyen.',true);return;}
  btn.disabled=true;btn.textContent='Mentés…';const k=MD_KEY;
  try{const saved=await call('saveProject',Object.assign(p,{deferCal:true}));incLinkAfter(form,saved);npFilesUpload(saved.id);if(p.tplFrom&&typeof tplBillCopy==='function')tplBillCopy(p.tplFrom,saved.id);S.projects.push(saved);MD_KEY='';mdClear(k);closeModal();openProject(saved.id);toast('Piszkozat mentve – a hiányzó adatokat itt pótolhatod');if(saved.date&&!p._noCal)syncCal(saved.id);S.cal.events={};}
  catch(e){btn.disabled=false;btn.textContent='💾 Piszkozat mentése';handleErr(e);}}
/* Bevételi sorból készült projekt: ha a neve más lett (pl. sablonból), a sor nevét is átírjuk, hogy kapcsolódjanak */
function incLinkAfter(form,saved){try{const id=form&&form.querySelector('[name=incId]')&&form.querySelector('[name=incId]').value;if(!id||!saved)return;
  const r=((S.fin&&S.fin.income)||[]).find(x=>x.id===id);if(!r||r.name===saved.name)return;const row=Object.assign({},r,{name:saved.name});finLocal('income',[row]);call('finUpsert',{table:'income',row}).then(d=>finApply(d)).catch(handleErr);}catch(e){}}
function newProjectModal(day,pre){NP_FILES=[];
  const d0=day||(pre&&pre.date)||'';
  openModal(pre?'Projekt a bevételi sorból':'Új projekt',`<div class="fields">
    ${pre?`<div class="field full fw-note">💰 A régi táblázat „<b>${esc(pre.name)}</b>” sorából: a projekt értéke <b>${ftFmt(pre.amount)}</b> lesz, és a bevételi sor ehhez a projekthez kapcsolódik. Ha nem tudsz minden adatot, mentsd piszkozatként.</div><input type="hidden" name="incAmount" value="${num(pre.amount)}"><input type="hidden" name="fromIncome" value="1"><input type="hidden" name="incId" value="${esc(pre.incId||'')}">`+tplFieldHtml():tplFieldHtml()}
    ${mf('name','Projekt neve',{full:true,ph:'pl. Ecommerce Expo 2027',max:160,v:pre?pre.name:''})}
    <div class="field"><label for="m-clientQ">Ügyfél</label><input class="inp" id="m-clientQ" name="clientQ" type="text" autocomplete="off" placeholder="Keress vagy vegyél fel ügyfelet…"><input type="hidden" name="clientSel" id="m-clientSel"></div>
    ${ms('eventType','Rendezvény típusa',EVENT_TYPES,'',{empty:'Válassz…',cmb:'Válassz típust…'})}
    <div class="field full" id="m-clientNew" style="display:none"><div class="fields">${taxBlock()}</div></div>
    <div class="field full np-onsite"><label for="m-venue">Helyszín</label><input class="inp" id="m-venue" name="venue" type="text" autocomplete="off" spellcheck="false" maxlength="300" placeholder="Kezdd el gépelni a címet vagy a helyszín nevét…"></div>
    ${mf('contactName','Kapcsolattartó',{max:120})}
    ${phoneField({name:'contactPhone',value:''})}
    ${mf('contactEmail','Kapcsolattartó e-mail',{type:'email',full:true,max:160})}
    ${mf('date','Dátum',{type:'date',v:d0})}
    <div class="field np-multi np-onsite"><span class="lbl">&nbsp;</span><button type="button" class="btn outline small" data-action="np-multi">➕ Több nap felvétele</button></div>
    <div class="field np-end" hidden><label for="m-endDate">Utolsó nap</label><div class="np-end-row"><input class="inp" id="m-endDate" name="endDate" type="date"><button type="button" class="x w" data-action="np-multi-off" aria-label="Egy napos" title="Mégis egy napos">×</button></div></div>
    ${mf('startTime','Kezdés',{ph:'pl. 10:00',im:'numeric',max:5}).replace('<div class="field','<div class="field np-onsite')}
    ${mf('endTime','Hozzávetőleges távozási óra',{ph:'pl. 18:30',im:'numeric',max:5}).replace('<div class="field','<div class="field np-onsite')}
    <div class="field full"><label for="m-notes">Jegyzetek (nem kötelező)</label><textarea class="inp" id="m-notes" name="notes" maxlength="5000"></textarea></div>
    ${isAdmin()?npFilesField():''}
  </div><p class="hint" style="margin:0">A jegyzeteken kívül minden mező kötelező. A projekt a „Terepi Munkák” naptárba is bekerül. Ha még nincs meg minden adat, mentsd piszkozatként – később a projekt oldalán kiegészítheted.</p>`,{noDraft:true,submitLabel:'Projekt létrehozása',left:'<button type="button" class="btn ghost" data-action="np-draft">💾 Piszkozat mentése</button>',submit:async(fd,form)=>{
    if(!needName(form,'Add meg a projekt nevét.'))return;
    const {p,clientNew,g}=npBuild(fd);
    const fieldOf={client:clientNew?'client':'clientQ'};
    const miss=missingReq(p).filter(([k])=>k!=='endDate');
    if(g('startTime')&&!p.startTime)miss.unshift(['startTime','Kezdés (óó:pp formában)']);
    if(g('endTime')&&!p.endTime)miss.unshift(['endTime','Távozás (óó:pp formában)']);
    if(p.date&&p.date<todayISO()&&form.dataset.pastOk!==p.date){form.dataset.pastOk=p.date;
      let w=$('m-pastWarn');if(!w){w=document.createElement('div');w.id='m-pastWarn';w.className='past-warn';form.querySelector('.fields').after(w);}
      w.innerHTML=`⚠️ <b>A projekt első napja a múltban van (${esc(fmtDay(p.date))}).</b> Biztosan múltbeli projektet hozol létre? Ha igen, kattints újra a „Projekt létrehozása” gombra.`;w.scrollIntoView({block:'nearest',behavior:'smooth'});
      toast('A megadott dátum a múltban van – ellenőrizd, aztán kattints újra a létrehozásra.',true);return;}
    if(miss.length){const k=miss[0][0],el=form.querySelector('[name='+(fieldOf[k]||k)+']')||(k==='contactPhone'?$('m-contactPhone'):null);
      form.querySelectorAll('.inp').forEach(x=>x.style.borderColor='');miss.forEach(([mk])=>{const e2=form.querySelector('[name='+(fieldOf[mk]||mk)+']');const vis=mk==='contactPhone'?$('m-contactPhone'):e2;if(vis)vis.style.borderColor='var(--bad)';});
      if(el&&el.type!=='hidden')el.focus();toast('Kötelező mező: '+miss.map(x=>x[1]).join(', ')+'.',true);return;}
    try{const saved=await call('saveProject',Object.assign(p,{deferCal:true}));incLinkAfter(form,saved);npFilesUpload(saved.id);if(p.tplFrom&&typeof tplBillCopy==='function')tplBillCopy(p.tplFrom,saved.id);S.projects.push(saved);closeModal();openProject(saved.id);toast(p._noCal?'Projekt létrehozva a bevételi sorból':'Projekt létrehozva, a naptárba is bekerül');if(!p._noCal)syncCal(saved.id);S.cal.events={};}
    catch(e){handleErr(e);}
  }});
}
/* Ismert vállalkozások a kereséshez: a stáb többi tagjáé és az ügyfeleké (adószámmal, ha van) */
function crewCompanies(){const m=new Map();(S.crew||[]).forEach(c=>{const n=String(c.company||'').trim();if(n&&!m.has(fold(n)))m.set(fold(n),{name:n,tax:c.tax||'',vat:c.vat||''});});
  (S.clients||[]).forEach(c=>{const n=String(c.name||'').trim();if(n&&!m.has(fold(n)))m.set(fold(n),{name:n,tax:c.tax||'',vat:''});});return [...m.values()].sort((a,b)=>a.name.localeCompare(b.name,'hu'));}
/* Több elemet választó legördülő (pipákkal): a jelölőnégyzetek a formban maradnak, csak egy lenyíló panelben */
function mselField(name,label,opts,sel,ph,canAdd){const S2=new Set(sel||[]);return `<div class="field" id="f-${name}"><span class="lbl">${esc(label)}</span><div class="msel" data-msel="${name}"${ph?` data-ph="${esc(ph)}"`:''}${canAdd?' data-add="1"':''}><button type="button" class="inp msel-btn" data-action="msel" aria-haspopup="true"><span class="msel-v">${mselSum(opts.filter(o=>S2.has(o)),ph)}</span><span class="msel-car">▾</span></button>
  <div class="msel-pop" hidden><input class="inp msel-q" type="text" autocomplete="off" placeholder="${canAdd?'Keresés, vagy írj be újat és nyomj Entert…':'Keresés…'}" aria-label="Keresés"><div class="msel-add" hidden></div>${opts.map(o=>`<label><input type="checkbox" name="${name}" value="${esc(o)}"${S2.has(o)?' checked':''}>${esc(o)}</label>`).join('')}</div></div></div>`;}
function mselSum(a,ph){return a.length?a.map(x=>`<span class="msel-chip">${esc(x)}</span>`).join(''):`<span class="muted">${esc(ph||'Válassz…')}</span>`;}
function crewModal(c){
  setTimeout(crewSalesToggle,0);
  if(c&&c._new)c=Object.assign({},c);const v=c||{},roles=new Set(v.roles||[]);if(c&&c._new)c=null;
  const uses=c?S.projects.filter(p=>crewIds(p).has(c.id)).length:0;
  openModal(c?'Munkatárs szerkesztése':'Új munkatárs',`<div class="fields">
    ${mf('name','Név',{full:true,v:v.name,max:100})}
    ${mselField('roles','Szerepek',CREW_ROLES,[...roles],'Válassz szerepet…')}
    ${mselField('skills','Részletek',CREW_SKILLS,v.skills||[],'Válassz részleteket…')}
    ${ms('type','Jogviszony',CREW_TYPES,isEmployee(v)?CREW_TYPES[3]:v.type||'Belsős')}
    <div class="field"><label for="m-company">Vállalkozás (számlázó cég)</label><div class="tax-row"><input class="inp" id="m-company" name="company" list="dl-crewco" value="${esc(v.company||'')}" placeholder="kezdd el gépelni, vagy keresd adószámmal" autocomplete="off" maxlength="160"><button class="btn outline small" type="button" data-action="crew-co-lookup" title="Cégnév betöltése az adószám alapján (NAV)">🔍</button></div>
      <datalist id="dl-crewco">${crewCompanies().map(x=>`<option value="${esc(x.name)}">${esc(x.tax||'')}</option>`).join('')}</datalist></div>
    <div id="f-dayRate">${moneyField('dayRate','Napidíj (nettó)',v.dayRate)}</div>
    ${mf('tax','Adószám (a számla NAV-os párosításához)',{v:v.tax,ph:'12345678-1-42'})}
    <div class="field"><span class="lbl">ÁFA</span><div class="rolepick"><label><input type="radio" name="vat" value="aam"${v.vat!=='afa'?' checked':''}> Alanyi adómentes</label><label><input type="radio" name="vat" value="afa"${v.vat==='afa'?' checked':''}> Áfakörös</label></div></div>
    ${phoneField({name:'phone',value:v.phone})}
    ${mf('email','E-mail',{type:'email',v:v.email})}
    ${mf('note','Megjegyzés',{full:true,v:v.note,ph:'pl. saját drón, B kategóriás jogosítvány'})}
    ${isAdmin()&&c&&(c.roles||[]).includes('Értékesítő')?(()=>{const sp=(S.salesPeople||[]).find(x=>x.crewId===c.id);return `<div class="field full"><span class="lbl">💼 Értékesítői jutalék</span><div class="t-row" style="gap:10px;align-items:center">${sp?`<span>${esc(commTierTxt(sp))}${num(sp.salary)?' · fix '+huf(sp.salary)+' (nettó)':''}</span>`:'<span class="muted">Még nincs értékesítői belépése – a jutalékot a belépéssel együtt állítod be.</span>'}<button type="button" class="mini" data-action="crew-comm" data-id="${esc(c.id)}">${sp?'Jutalék módosítása':'Értékesítői belépés + jutalék'}</button></div></div>`;})():''}
    ${crewDocSection(c)}
  </div>`,{left:c?`<button type="button" class="btn danger small" data-action="del-crew" data-id="${esc(c.id)}">Törlés${uses?` (${uses} projektben szerepel)`:''}</button>`:'',
  submit:async(fd,form)=>{
    if(!needName(form))return;
    const data={id:c?c.id:uuid(),baseUpdatedAt:c?c.updatedAt:'',name:fd.get('name').trim(),roles:fd.getAll('roles'),type:fd.get('type'),dayRate:moneyVal(fd.get('dayRate')),phone:fd.get('phone').trim(),email:fd.get('email').trim(),note:fd.get('note').trim(),priority:'',company:fd.get('company').trim(),skills:fd.getAll('skills'),vat:fd.get('vat')==='afa'?'afa':'aam',tax:String(fd.get('tax')||'').trim()};
    try{let saved;try{saved=await call('saveCrew',data);}catch(e1){if(!c||!/CONFLICT/.test(errText(e1)))throw e1;   // közben máshol (pl. másik lapon) mentették: a friss adatra írjuk rá a mostani módosítást
        const b=await call('bootstrap',{});const fresh=(b.crew||[]).find(x=>x.id===c.id);if(!fresh)throw e1;data.baseUpdatedAt=fresh.updatedAt||'';saved=await call('saveCrew',data);}
      const i=S.crew.findIndex(x=>x.id===saved.id);if(i>=0)S.crew[i]=saved;else S.crew.push(saved);entRec('crew',(c?'munkatárs módosítása: ':'munkatárs felvétele: ')+saved.name,saved.id,c?clone(c):null,clone(saved));closeModal();render(true);toast(c?'Mentve':'Munkatárs felvéve');}
    catch(e){handleErr(e);}
  }});
}
function itemModal(it,after){
  const v=it||{};
  const uses=it?S.projects.filter(p=>eqQty(p,it.id)>0).length:0;
  openModal(it?'Eszköz szerkesztése':'Új eszköz',`<div class="fields">
    ${mf('name','Megnevezés',{full:true,v:v.name,ph:'pl. Sony FX3',max:160})}
    ${ms('category','Kategória',INV_CATS,v.category||'Kamera')}
    ${mf('qty','Darabszám',{type:'number',min:0,v:v.qty??1,im:'numeric'})}
    ${ms('condition','Állapot',Object.entries(CONDITIONS),v.condition||'ok')}
    <div class="field" id="m-fmtF"${/^(Kamera|Objektív)/i.test(v.category||'Kamera')?'':' hidden'}><label for="m-format">Szenzorméret</label><select class="inp" id="m-format" name="format" data-cmb="Válassz szenzorméretet…"><option value="__none"${invFmt(v)?'':' selected'}>Nincs megadva</option><option value="ff"${invFmt(v)==='ff'?' selected':''}>Full Frame</option><option value="crop"${invFmt(v)==='crop'?' selected':''}>Crop (APS-C / Super 35)</option></select><span class="hint" style="margin:2px 0 0">Crop objektív nem rakható Full Frame vázra.</span></div>
    ${moneyField('value','Beszerzési érték / db (bruttó)',isAdmin()?v.value:'',{steps:false,ph:!isAdmin()&&v.hasValue?'megadva – felülíráshoz írd be':'pl. 450 000'})}
    ${mf('serial','Azonosító / sorozatszám',{v:v.serial})}
    <div class="field"><label for="m-location">Tárolási hely</label><input class="inp" id="m-location" name="location" type="text" list="loc-list" maxlength="120" value="${esc(v.location||'')}" placeholder="pl. Iroda, 2. polc / FX3 táska"><datalist id="loc-list">${[...new Set(S.inventory.map(i=>i.location).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'hu')).map(l=>`<option value="${esc(l)}">`).join('')}</datalist></div>
    ${mf('note','Megjegyzés',{full:true,v:v.note,ph:'pl. tartozékok, szerviz dátuma'})}
  </div>`,{left:it?`<button type="button" class="btn danger small" data-action="del-item" data-id="${esc(it.id)}">Törlés${uses?` (${uses} projektben szerepel)`:''}</button>`:'',
  submit:async(fd,form)=>{
    if(!needName(form,'Add meg az eszköz nevét.'))return;
    const data={id:it?it.id:uuid(),baseUpdatedAt:it?it.updatedAt:'',name:fd.get('name').trim(),category:fd.get('category'),qty:fd.get('qty'),condition:fd.get('condition'),value:moneyVal(fd.get('value')),serial:fd.get('serial').trim(),location:String(fd.get('location')||'').trim(),format:/^(Kamera|Objektív)/i.test(fd.get('category')||'')&&['ff','crop'].includes(fd.get('format'))?fd.get('format'):'',note:fd.get('note').trim()};
    try{const saved=await call('saveItem',data);const i=S.inventory.findIndex(x=>x.id===saved.id);if(i>=0)S.inventory[i]=saved;else S.inventory.push(saved);if(!after)entRec('item',(it?'eszköz módosítása: ':'eszköz felvétele: ')+saved.name,saved.id,it?clone(it):null,clone(saved));closeModal();render(true);if(after)after(saved);else toast(it?'Mentve':'Eszköz felvéve');}
    catch(e){handleErr(e);}
  }});
}
document.addEventListener('change',e=>{if(e.target.id==='m-company'){const k=crewCompanies().find(x=>fold(x.name)===fold(e.target.value.trim()));const t=$('m-tax');if(k&&k.tax&&t&&!t.value){t.value=k.tax;}if(k&&k.vat){const r=document.querySelector('#mform [name=vat][value="'+k.vat+'"]');if(r)r.checked=true;}}});   // ismert vállalkozás: az adószám és az ÁFA is átjön
document.addEventListener('change',e=>{if(e.target.id==='m-role'){const sc=$('m-salesComp');if(sc)sc.hidden=e.target.value!=='sales';const w=$('m-edWarn');if(w&&w.innerHTML.trim())w.hidden=e.target.value!=='editor';}if(e.target.id==='m-crewId'){const nf=$('m-newCrewF');if(nf){nf.hidden=e.target.value!=='__new';if(!nf.hidden)setTimeout(()=>$('m-newName').focus(),0);}const c=crewById(e.target.value),em=$('m-email');if(c&&c.email&&em&&!em.value)em.value=c.email;}});   // a stáblistás e-mail-cím átjön
function userModal(u){
  const v=u||{};S._invEdit='';
  const crewOpts=[['','Válassz a stáblistából…'],...(u?[]:[['__new','➕ Új kolléga – még nincs a stáblistán']]),...S.crew.slice().sort((a,b)=>a.name.localeCompare(b.name,'hu')).map(c=>[c.id,c.name])];
  const otherEd=(S.users||[]).find(x=>x.role==='editor'&&x.id!==v.id),defRole=!isAdmin()?'crew':USER_ROLES[v.role]?v.role:(otherEd?'crew':'editor');
  openModal(u?(isAdmin()?'Felhasználó szerkesztése':'Szakember szerkesztése'):(isAdmin()?'Kolléga felvétele':'Szakember felvétele'),`<div class="fields">
    ${ms('crewId','Munkatárs (a stáblistából – ez lesz a megjelenő név)',crewOpts,v.crewId||'',{full:true})}
    <div class="field full" id="m-newCrewF" hidden><label for="m-newName">Új kolléga neve</label><input class="inp" id="m-newName" name="newName" maxlength="100" placeholder="pl. Kovács Péter"><p class="hint" style="margin:4px 0 0">Felvesszük a stáblistára is: értékesítő szerepkörnél az <b>Értékesítők</b>, egyébként a <b>Stáb</b> közé kerül.</p></div>
    ${isAdmin()?ms('role','Szerepkör',Object.entries(USER_ROLES).filter(([k])=>isAdmin()||k==='crew').filter(([k])=>k!=='admin'||v.role==='admin'||!(S.users||[]).some(x=>x.role==='admin'&&x.id!==v.id)),defRole):'<input type="hidden" name="role" value="crew">'}
    ${mf('email','Google-fiók e-mail-címe (ezzel lép be)',{type:'email',v:v.email,ph:'pl. kollega@lumosmotion.com',full:!isAdmin()})}
    ${isAdmin()?`<div class="field full sales-comp" id="m-salesComp"${defRole==='sales'?'':' hidden'}><span class="lbl">💼 Értékesítő díjazása</span><div class="sc-grid">
      ${moneyField('salary','Fix fizetés (nettó / hó)',v.salary==null?'':v.salary,{steps:false,ph:'pl. 300 000'})}
      ${moneyField('commLimit','Jutaléksáv határa (havi alap)',v.commLimit==null?1000000:v.commLimit,{steps:false})}
      <div class="field"><label for="m-commLow">Jutalék a határ alatt (%)</label><input class="inp" id="m-commLow" name="commLow" type="number" min="0" max="100" step="0.5" value="${v.commLow==null?'':esc(v.commLow)}" placeholder="pl. 20"></div>
      <div class="field"><label for="m-commHigh">Jutalék a határ felett (%)</label><input class="inp" id="m-commHigh" name="commHigh" type="number" min="0" max="100" step="0.5" value="${v.commHigh==null?'':esc(v.commHigh)}" placeholder="pl. 25"></div><p class="hint" style="margin:6px 0 0">A jutalék havonta, a <b>ténylegesen kifizetett nettó ügyfélbevétel</b> után jár, sávosan: a havi alap határig terjedő része az alsó, a feletti része a felső %-kal. A továbbszámlázott költségek (projekt → „+ Továbbszámlázott költség”) nem számítanak bele.</p></div>
      <p class="hint" style="margin:4px 0 0">A jutalék szerződésenként jár a szerződött nettó érték után (a határ is nettó szerződési érték), a szerződés hónapjában. A fix fizetés minden hónapban hozzáadódik a Kifizetésekhez.</p></div>`:''}
    ${u&&(u.role==='admin'||u.role==='editor')&&(S.sigs||{})[u.id]&&(isAdmin()||u.id===S.me.id)?`<div class="field full"><span class="lbl">✍️ E-mail aláírás <span class="muted" style="font-weight:500">– másold ki a szignó-dokumentumból, és illeszd be ide (Cmd+V)</span></span>
      <div class="sig-ed" id="m-sigEd" contenteditable="true" spellcheck="false" aria-label="E-mail aláírás"></div>
      <div class="sig-ed-foot"><span class="hint" id="m-sigMsg" style="margin:0">${(S.sigs[u.id]||{}).custom?'Beillesztett aláírás':'Alap aláírás (a Hozzáférések → Szerkesztés mezőiből)'}</span><button class="linkbtn" type="button" id="m-sigReset">↺ Vissza az alap aláírásra</button></div></div>`:''}
    <div class="field full ed-warn" id="m-edWarn"${defRole==='editor'&&otherEd?'':' hidden'}>${otherEd?`⚠️ <b>Már van termelési vezető: ${esc(otherEd.name)}.</b> Egyszerre csak egy termelési vezető lehet – előbb töröld őt (vagy állítsd Szakemberre) a Beállításokban, utána veheted fel az újat.`:''}</div>
    <div class="field full"><div class="rolepick">${u?`<label><input type="checkbox" name="disabled"${v.disabled?' checked':''}> Letiltva (nem tud belépni)</label><input type="hidden" name="resendInvite" id="m-resend" value="">`:`<label><input type="checkbox" name="sendInvite" checked> Meghívó küldése e-mailben</label><button class="btn outline small" type="button" data-action="invite-prev">👁 Előnézet</button>`}</div><div id="invPrev"></div>
      <p class="hint" style="margin:6px 0 0">Belépés csak Google-fiókkal: céges címnél a Lumos Motion Workspace-fiókkal, külsősnél azzal a Google-fiókkal, amelyhez ez az e-mail-cím tartozik.</p></div>
  </div>`,{left:u&&u.id!==S.me.id?`<button type="button" class="btn danger small" data-action="del-user" data-id="${esc(u.id)}">Törlés</button>`:'',
  submit:async(fd,form)=>{
    const cr=crewById(fd.get('crewId'));
    if(fd.get('role')==='editor'&&otherEd){toast('Csak egy termelési vezető lehet – előbb töröld '+otherEd.name+' fiókját, vagy állítsd Szakemberre.',true);const w=$('m-edWarn');if(w){w.hidden=false;w.scrollIntoView({block:'nearest'});}return;}
    const isNewCrew=fd.get('crewId')==='__new',newName=String(fd.get('newName')||'').trim().replace(/\s+/g,' ');
    if(isNewCrew&&newName.length<2){toast('Add meg az új kolléga nevét.',true);$('m-newName').focus();return;}
    if(!cr&&!isNewCrew&&!(u&&v.name)){toast('Válaszd ki a munkatársat a stáblistából, vagy válaszd az „Új kolléga” lehetőséget.',true);return;}
        const data={id:u?u.id:undefined,name:cr?cr.name:v.name,role:fd.get('role'),crewId:fd.get('crewId'),email:fd.get('email').trim(),disabled:fd.get('disabled')==='on',sendInvite:u?false:fd.get('sendInvite')==='on',resendInvite:!!u&&fd.get('resendInvite')==='1'};
        if(data.role==='sales'){data.salary=moneyVal(fd.get('salary'));data.commLimit=moneyVal(fd.get('commLimit'))||1000000;data.commLow=fd.get('commLow');data.commHigh=fd.get('commHigh');if(String(data.commLow).trim()===''||String(data.commHigh).trim()===''){toast('Add meg az értékesítő jutalék %-át (a határ alatt és felett).',true);return;}if(data.salary===''){toast('Add meg a fix havi fizetést (ha nincs, írj 0-t).',true);return;}}if(!u&&data.sendInvite&&S._invEdit&&$('invPrev')&&$('invPrev').querySelector('.mail-frame'))data.inviteHtml=S._invEdit;
    try{
      if(isNewCrew){const role=data.role,em=data.email;   // új kolléga: a stáblistára is felkerül (értékesítő → Értékesítők, más → Stáb)
        const nc=await call('saveCrew',{id:uuid(),baseUpdatedAt:'',name:newName,roles:role==='sales'?['Értékesítő']:role==='editor'?['Projektvezető']:[],type:'',dayRate:'',phone:'',email:em,note:'',priority:'',company:'',skills:[],vat:'aam',tax:''});
        S.crew.push(nc);data.crewId=nc.id;data.name=nc.name;}
      const res=await call('saveUser',data);S.users=res.users;refreshLog();
      if(u&&SIG_ED.dirty){try{S.sigs=await call('saveSignature',{userId:u.id,html:SIG_ED.reset?'':sigClean($('m-sigEd')?$('m-sigEd').innerHTML:'').html});}catch(e2){handleErr(e2);}}
      const m=res.mail;
      closeModal();toast(m&&m.sent?(u?'Mentve, a meghívót újraküldtük: ':'Kolléga felvéve, meghívót küldtünk: ')+m.to:(m&&m.invite?'Kolléga felvéve, de a meghívó nem ment ki: '+(m.error||''):'Mentve'),!!(m&&m.invite&&!m.sent));
      render(true);
    }catch(e){handleErr(e);}
  }});
  comboSelect($('m-crewId'),'Kezdj el gépelni: név…',crewSub);
  sigEdInit(u);
  if(u){const sb=document.querySelector('#mform .mfoot button[type=submit]');if(sb){const rb=document.createElement('button');rb.type='button';rb.className='btn primary';rb.textContent='Mentés és meghívó újraküldése';
    rb.addEventListener('click',()=>{const h=$('m-resend');if(h)h.value='1';$('mform').requestSubmit();setTimeout(()=>{if(h)h.value='';},0);});sb.before(rb);}}   // pl. javított e-mail-cím után
}

/* Ügyvezetői előnézet: a háttér a munkamenetet átállítja a választott szerepkörre, így pontosan azt kapod, amit ők. */
async function switchView(role,crewId,userId){
  try{
    document.body.classList.add('switching');
    await Promise.race([SAVE_Q,new Promise(r=>setTimeout(r,15000))]);if(S.dirty){document.body.classList.remove('switching');toast('A módosítások mentése nem sikerült – előbb mentsd el őket, aztán válts nézetet.',true);renderChrome();return;}   // előbb fusson le minden folyamatban lévő mentés
    const r=await call('setViewAs',Object.assign({role,crewId},userId?{userId}:{}));
    const keepTab=S.tab,keepPid=S.projectId;   // nézetváltás után ugyanazon a menüponton (és projekten) maradunk, ha az új nézetben is elérhető
    S.projectId=null;S.draft=null;S.dirty=false;S.users=null;S.log=null;S.cal.events={};
    if(location.hash)history.replaceState(null,'',location.pathname+location.search);
    await load(false,false,r&&r.boot);
    S.tab=TABS().some(t=>t.id===keepTab)?keepTab:TABS()[0].id;
    if(S.tab==='projektek'&&keepPid&&projById(keepPid)){S.projectId=keepPid;S.draft=prepDraft(projById(keepPid));S.draftBase=clone(S.draft);}
    render(true);document.body.classList.remove('switching');toast(role==='admin'?'Nézet: Ügyvezető':role==='editor'?'Nézet: Termelési v.':role==='sales'?'Nézet: Értékesítő':'Nézet: Szakember');
  }catch(e){document.body.classList.remove('switching');handleErr(e);renderChrome();}
}
const crewSub=id=>{const c=crewById(id)||(S.viewAsCrew||[]).find(x=>x.id===id);return c?[(c.roles||[]).join(', '),c.company].filter(Boolean).join(' · '):id==='__new'?'a stáblistára is felkerül':'';};   // a választóban a név alatt
function viewAsCrewModal(){
  const opts=((S.me&&S.me.viewAs&&S.viewAsCrew&&S.viewAsCrew.length)?S.viewAsCrew:S.crew).filter(c=>(c.roles||[]).some(r=>r!=='Értékesítő')).slice().sort((a,b)=>a.name.localeCompare(b.name,'hu')).map(c=>[c.id,c.name]);
  if(!opts.length){toast('Nincs még munkatárs a Stáb fülön.',true);renderChrome();return;}
  openModal('Szakember nézet',`<p class="hint" style="margin:0 0 10px">Válaszd ki, kinek a szemével nézed az appot: csak azokat a projekteket fogod látni, amelyekre ő be van osztva, árak és díjak nélkül.</p><div class="fields">${ms('crewId','Szakember',[['','Válassz…'],...opts],'',{full:true})}</div>`,
    {submitLabel:'Nézet bekapcsolása',submit:async fd=>{if(!fd.get('crewId')){toast('Válaszd ki a szakembert.',true);return;}closeModal();await switchView('crew',fd.get('crewId'));},onClose:()=>renderChrome()});
  comboSelect($('m-crewId'),'Kezdj el gépelni: név, szerep…',crewSub,{enterSubmit:true,clickSubmit:true});   // Enter: kiválasztja és be is kapcsolja a nézetet
  const fi=()=>{const i=$('modalRoot').querySelector('.cmb-in');if(i)i.focus();};fi();setTimeout(fi,60);
}
function viewAsSalesModal(){
  const opts=(S.viewAsSales||[]).slice().sort((a,b)=>a.name.localeCompare(b.name,'hu')).map(x=>[x.id,x.name]);
  if(!opts.length){switchView('sales');return;}   // nincs értékesítő: a saját lehetőségeiddel
  openModal('Értékesítő nézet',`<p class="hint" style="margin:0 0 10px">Válaszd ki, melyik értékesítő szemével nézed az appot: az ő lehetőségeit, jutalékát és kifizetéseit látod.</p><div class="fields">${ms('salesId','Értékesítő',[['','Válassz…'],...opts],'',{full:true})}</div>`,
    {submitLabel:'Nézet bekapcsolása',submit:async fd=>{if(!fd.get('salesId')){toast('Válaszd ki az értékesítőt.',true);return;}closeModal();await switchView('sales',null,fd.get('salesId'));},onClose:()=>renderChrome()});
  comboSelect($('m-salesId'),'Kezdj el gépelni a nevet…',()=>'',{enterSubmit:true,clickSubmit:true});
  const fi=()=>{const i=$('modalRoot').querySelector('.cmb-in');if(i)i.focus();};fi();setTimeout(fi,60);}
$('viewAs').addEventListener('change',e=>{const v=e.target.value;guard(()=>{if(v==='crew'||v==='crew-other')viewAsCrewModal();else if(v==='sales'||v==='sales-other')viewAsSalesModal();else switchView(v);});renderChrome();});
/* Lezáráskor (Kész / Átadva) díjcsökkentés is kiróható – szakemberenként */
function penCrewOpts(){const p=projById(S.draft.id)||S.draft,ids=[...new Set([p.lead].concat((p.crew||[]).map(a=>a.crewId)).filter(Boolean))];
  return ids.map(id=>{const c=crewById(id);return c?[id,c.name]:null;}).filter(Boolean).sort((a,b)=>a[1].localeCompare(b[1],'hu'));}
function penBlock(show){if(!canSeeFees())return '';const co=penCrewOpts();if(!co.length)return '';
  return `<div class="field full pen-block" id="penWrap"${show?'':' style="display:none"'}><div class="pen-block-h"><b>🚨 Hiba jelzése díjcsökkentéssel</b> <span class="muted">(nem kötelező – kattints a 🚨 jelre annál, aki hibázott)</span></div>
    <div class="pen-chips">${co.map(([id,nm])=>`<button class="pen-chip" type="button" data-action="pen-row-add" data-cid="${esc(id)}" title="Díjcsökkentés: ${esc(nm)}"><span>${esc(nm)}</span><span class="pen-btn" aria-hidden="true">🚨</span></button>`).join('')}</div><div id="penRows"></div>${penCopyBox('penCopy')}</div>`;}
const penCopyBox=name=>`<label class="toggle pen-copy"><input type="checkbox" name="${name}" value="1"><span class="tl">📧 Másolatot kérek a szakembernek küldött e-mailről</span></label><p class="hint" style="margin:4px 0 0">${isAdmin()?'A termelési vezető':'Az ügyvezető'} mindenképp megkapja a másolatot.</p>`;
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
    out.push({crewId:cid,kind,pct:Number(fd.get('pen_pct_'+n))||0,amount:moneyVal(fd.get('pen_amt_'+n))||0,caseText:fd.getAll('pen_case_'+n).join('; '),reason,copyMe:!!fd.get('penCopy')});}
  return out;}
async function penRowsSubmit(pid,list){if(!list.length)return;let last=null,mailed=0;
  for(const x of list){try{const r=await call('addPenalty',Object.assign({projectId:pid},x));last=r.penalties;if(r.mailed)mailed++;}catch(e){toast('Díjcsökkentés: '+errText(e),true);}}
  if(last){penApply(pid,last);toast(isAdmin()?`${list.length} díjcsökkentés kiróva${mailed?', a szakember e-mailt kapott':''}`:`${list.length} díjcsökkentés jóváhagyásra elküldve`);}}
document.addEventListener('change',e=>{const t=e.target,n=t.dataset&&t.dataset.penkind;if(!n)return;const row=t.closest('[data-penrow]');
  row.querySelector('[data-pencase]').innerHTML=penCaseOpts(t.value,'pen_case_'+n);row.querySelector('[data-penpct]').style.display=t.value==='prestige'?'':'none';row.querySelector('[data-penamt]').style.display=t.value==='damage'?'':'none';});
document.addEventListener('change',e=>{const t=e.target,w=$('penWrap');if(!w)return;
  if(t.name==='siteOk')w.style.display=t.value==='nem'?'':'none';else if(t.id==='m-stuck')w.style.display=t.checked?'':'none';});   // díjcsökkentés csak elakadásnál
/* egy későbbi lépésre lépve az előtte lévő lépések kipipálódnak */
function ticksUpTo(d,v){const ORD=['tervezes','helyszin','utomunka','jovahagyas'],ids=STAGES.map(s=>s.id),vi=ids.indexOf(v),s2=new Set(String(d.stepsDone||'').split(',').filter(Boolean));
  ORD.forEach(x=>{if(ids.indexOf(x)<vi)s2.add(x);});return ORD.filter(x=>s2.has(x)).join(',');}
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
      const pid=d.id;closeModal();setDraft({siteOk:ok,siteReport:txt});if(next)next();penRowsSubmit(pid,pens);setTimeout(()=>{if(S.dirty)saveDraft();},0);}});
}
/* Felugró figyelmeztetés: a helyszíni munka előtt véglegesíteni kell a stábot */
const finalSkipped=d=>!!(d&&S._finalSkip&&S._finalSkip[d.id]);   // „saját felelősségre” kihagyott véglegesítés (erre a munkamenetre)
function crewFinalPopup(d,retry){const ch=crewFinalState(d)==='changed',none=!crewIds(d).size;S._finalRetry=retry||null;
  openModal('👥 Előbb véglegesítsd a stábot',`<p style="margin:0">${none?'Ehhez a projekthez még nincs stáb beosztva. Vedd fel a csapatot, majd <b>véglegesítsd</b> – csak utána pipálható ki a helyszíni munka.':ch?'A csapat a véglegesítés óta módosult. A helyszíni munka előtt <b>véglegesítsd újra</b> a stábot.':'A helyszíni munka kipipálása előtt <b>véglegesítsd a stábot</b> – így mindenki megkapja a beosztását, és a díjak rögzülnek.'}</p>`,
    {cancelLabel:'Bezárás',left:retry?`<button type="button" class="btn ghost small final-skip" data-action="final-skip" title="A stáb nem kap beosztás-értesítést és naptármeghívót, a díjak nem rögzülnek">⚠️ Kihagyom – saját felelősségre</button>`:'',submitLabel:none?'Ugrás a stábhoz':'Véglegesítem',submit:async()=>{closeModal();gotoCrewFinal();}});}
function gotoCrewFinal(){FOLD.crew=true;render(true);
  setTimeout(()=>{const cf=$('crew-final'),target=cf||document.querySelector('[data-fold="crew"]');if(!target)return;const dd=target.closest('details')||(target.matches('details')?target:null);if(dd)dd.open=true;
    target.scrollIntoView({block:'center',behavior:'smooth'});target.classList.add('flash');setTimeout(()=>target.classList.remove('flash'),1600);
    if(!cf){const r=$('add-crew-role');if(r)setTimeout(()=>r.focus({preventScroll:true}),400);}},60);}
/* Utómunka kipipálása: észrevételek és elakadás (díjcsökkentéssel), mint az Átadás ablakban. Az észrevételek az átadásnál is megjelennek. */
function postModal(next){
  const d=S.draft;if(!d)return;
  openModal('✂️ Utómunka kész',`<div class="fields">
      ${stuckSummary(d)}
      ${canSeeFees()&&penCrewOpts().length?`<div class="field full"><label class="toggle"><input type="checkbox" id="m-stuck"><span class="tl">🚨 Elakadás történt</span></label></div>`:''}
      ${penBlock(false)}
      <div class="field full"><label for="m-deliveryNotes">Észrevételek</label><textarea class="inp" id="m-deliveryNotes" name="deliveryNotes" rows="4" maxlength="3000" placeholder="Hogy ment az utómunka, volt-e csúszás, mire figyeljünk az átadásnál…">${esc(d.deliveryNotes||'')}</textarea></div>
    </div>`,{submitLabel:'Kipipálás ✓',submit:async fd=>{
      const notes=String(fd.get('deliveryNotes')||'').trim();
      let pens=[];try{pens=penRowsCollect(fd,notes);}catch(e){toast(e.message,true);return;}
      const pid=d.id;closeModal();setDraft({deliveryNotes:notes});if(next)next();penRowsSubmit(pid,pens);setTimeout(()=>{if(S.dirty)saveDraft();},0);}});
}
/* Streames projekt lezárása: a közvetítés / felvétel linkje kötelező */
/* A projekt vágói (Vágó szereppel) */
const editorsOf=p=>[...new Set((p&&p.crew||[]).filter(a=>a.role==='Vágó').map(a=>a.crewId))].map(id=>crewById(id)).filter(Boolean);
/* Nyersanyag-értesítő csak annak a vágónak kell, akinek más is forgatott (ha ő maga az egyetlen operatőr / fotós / drónos, nála van az anyag) */
const RAW_SHOOT=new Set(['Operatőr','Kreatív operatőr','Statív operatőr','Interjúsarok operatőr','Drónpilóta','Fotós']);
/* A nyersanyag a Synology NAS-ra kerül (Dávid tölti fel); egységes mappanév: ÉÉÉÉ-HH-NN_projekt-neve */
const nasFolder=p=>{const r=pr(p),n=fold(p&&p.name).replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60).replace(/-+$/,'');return (r?r.start+'_':'')+(n||'projekt');};
const rawShot=p=>!editOnly(p)&&(p.crew||[]).some(a=>RAW_SHOOT.has(a.role));
/* feltöltésre vár: lezajlott a forgatás, és még nincs jelölve, hogy fent van a NAS-on */
const rawPending=p=>p&&['helyszin','utomunka'].includes(p.status||'')&&!p.rawSentAt&&rawShot(p)&&pr(p)&&pr(p).start<=todayISO()&&pr(p).start>=addDays(todayISO(),-21)&&needsDelivery(p);   // csak a friss (3 héten belüli) forgatások
const rawEditors=p=>editorsOf(p).filter(e=>(p.crew||[]).some(a=>RAW_SHOOT.has(a.role)&&a.crewId!==e.id));
/* Helyszíni munka után: e-mail a vágónak, hogy fent van a nyersanyag */
function rawMailModal(next){const d=S.draft;if(!d)return;const eds=rawEditors(d),r=pr(d),due=dueDate(d),nf=nasFolder(d);
  const first=eds.length===1?String(eds[0].name).split(' ').slice(-1)[0]:'';
  const tl=postTasks(d).map(t=>{const o=taskOwners(d,t.k).map(id=>(crewById(id)||{}).name).filter(Boolean);return `– ${t.k==='er_post_n'?t.n+' helyszín előadásainak utómunkája':t.label+': '+t.n}${t.k==='foto_db'?' db':''}${eds.length>1&&o.length?' ('+o.join(', ')+')':''}`;});
  const text=`Szia${first?' '+first:''}!\n\nA(z) „${d.name}”${r?' ('+fmtRange(d)+')':''} nyersanyaga fent van a NAS-on.\n${due?'\nLeadási határidő: '+fmtDay(due)+'.':''}${tl.length?'\n\n'+(eds.length>1?'Feladatok:':'Amit el kell készítened:')+'\n'+tl.join('\n'):''}\n\nHa kész, a projektnél húzd át az „Utómunka” lépést a „Videók jóváhagyásra várnak” lépésre, és ott add le a linket.\n\nKöszi!`;
  openModal('📦 Nyersanyag a NAS-on – e-mail a vágónak',`<div class="fields"><div class="field full"><span class="lbl">Címzett</span><div class="rolepick">${eds.map(c=>`<label><input type="checkbox" name="cut" value="${esc(c.id)}" checked${c.email?'':' disabled'}> ${esc(c.name)}${c.email?` <span class="muted">· ${esc(c.email)}</span>`:' <span class="bad-txt">· nincs e-mail-címe</span>'}</label>`).join('')}</div></div>
    <div class="field full"><label for="m-rawText">Üzenet</label><textarea class="inp" id="m-rawText" name="rawText" rows="9" maxlength="5000">${esc(text)}</textarea></div></div>`,
    {left:`<button type="button" class="btn outline small" data-action="raw-skip">Kihagyás – nem küldök</button>`,submitLabel:'Küldés és kipipálás',submit:async fd=>{
      const ids=fd.getAll('cut'),text=String(fd.get('rawText')||'');
      if(!ids.length){toast('Válaszd ki a vágót.',true);return;}
      try{await call('rawNotify',{projectId:d.id,crewIds:ids,link:'',text});closeModal();setDraft({rawSentAt:todayISO()});toast('E-mail elküldve a vágónak');next();}catch(e){handleErr(e);}}});
  S._rawNext=next;}

/* A vágó leadja a videókat: link, megjegyzés, kit értesítsen (ügyvezető / termelési vezető) → „Videók jóváhagyásra várnak” */
function cutDeliverModal(){const p=projById(S.projectId);if(!p)return;
  const its0=deliverItems(p);CD_ONE=postTasks(p).filter(t=>t.k!=='foto_db').reduce((x,t)=>x+num(t.n),0)===1;   // egyetlen videó: egyes szám a levélben
  openModal('📤 '+(CD_ONE?'Videó':'Videók')+' leadása – '+(p.name||''),`${its0.length?`<div class="deliv-list"><div class="sec-lbl" style="margin-top:0">Átadandó anyagok</div>${roList(its0)}</div>`:''}<div class="fields">${linksField('cdLink',(CD_ONE?'A videó linkje':'A videók linkje')+' <span class="req">*</span>',p.deliveryLink,p.deliveryLinks,'https://drive.google.com/… vagy YouTube')}${passField(p.deliveryPass)}
    <div class="field full"><label for="m-cdNote">Megjegyzés (nem kötelező)</label><textarea class="inp" id="m-cdNote" name="cdNote" rows="3" maxlength="3000">${esc(p.deliveryNotes||'')}</textarea></div>
</div>
    <div class="cd-rcpt" id="cdRcpt"><span class="lbl">Címzettek</span><div class="cd-load"><span class="spin"></span>Címzettek betöltése…</div></div>
    <details class="cd-prev"><summary><span class="cd-sum-ic">✉️</span><span class="cd-sum-t"><b>Így néz ki az e-mailed</b></span><span class="cf-car">▾</span></summary><div class="cd-prev-meta" id="cdPrevMeta"></div><div class="cd-prev-body" id="cdPrevBody" aria-label="Az e-mail szövege"></div></details>`,
    {submitLabel:'Leadás',submit:async fd=>{const a={projectId:p.id,link:String(fd.get('cdLink')||'').trim(),links:linksVal(fd,'cdLink'),note:String(fd.get('cdNote')||'').trim(),pass:passVal(fd),single:CD_ONE};if(CD_RCPT&&CD_RCPT.length)a.emails=fd.getAll('cdTo');else a.notify=['admin','editor'];if(fd.get('hasPass')&&!a.pass){toast('Add meg a jelszót.',true);return;}
      if(!/^https:\/\/\S+$/i.test(a.link)){const li=$('m-cdLink');if(li){li.classList.add('inp-bad');li.focus();}toast('Add meg a videók linkjét (https://…).',true);return;}if(linksBad(a.links)){toast('Minden link https:// kezdetű legyen.',true);return;}if(a.emails&&!a.emails.length){const rc=$('cdRcpt');if(rc){rc.classList.add('rc-bad');rc.scrollIntoView({block:'center',behavior:'smooth'});}toast('Pipálj ki legalább egy címzettet.',true);return;}
      try{const r=await call('crewDeliver',a);const k=S.projects.findIndex(x=>x.id===p.id);if(k>=0&&r.project)S.projects[k]=normProj(r.project);if(S.projectId===p.id&&r.project){S.draft=prepDraft(r.project);S.draftBase=clone(S.draft);S.dirty=false;}
        closeModal();render(true);toast('Videók leadva'+(r.notified&&r.notified.length?' – értesítve: '+r.notified.join(', '):''));}catch(e){handleErr(e);}}});
  {}   // „+ Újabb link” és a jelszó egy sorban
  CD_EDITED=false;{const fm=$('mform');if(fm)fm.addEventListener('input',e=>{if(e.target.id==='m-cdLink')e.target.classList.remove('inp-bad');});if(fm)fm.addEventListener('change',e=>{if(e.target.name==='cdTo'){const rc=$('cdRcpt');if(rc)rc.classList.remove('rc-bad');}});}
  CD_RCPT=null;const ld=n=>call('deliverRecipients').then(r=>{const L=Array.isArray(r)?r:[];if(!L.length&&n)return setTimeout(()=>ld(n-1),1500);CD_RCPT=L;cdPreview(p);}).catch(()=>{if(n)return setTimeout(()=>ld(n-1),1500);CD_RCPT=[];cdPreview(p);});ld(2);
  cdPreview(p);const f=$('mform');if(f){f.addEventListener('input',()=>cdPreview(p));f.addEventListener('change',()=>cdPreview(p));f.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#cdPrevBody,summary'))return;setTimeout(()=>cdPreview(p),0);});}}
/* a leadási értesítő előnézete – ugyanaz a szöveg, amit a háttér kiküld (crewDeliver_) */
let CD_RCPT=null,CD_EDITED=false,CD_ONE=false;
const fnm=n=>{const w=String(n||'').trim().split(/\s+/);return w.length>1?w[w.length-1]:String(n||'');};   // csak a keresztnév (Zajácz Dávid → Dávid)
function cdPreview(p){const body=$('cdPrevBody'),meta=$('cdPrevMeta'),f=$('mform');if(!body||!f)return;const fd=new FormData(f);
  const who=(S.me&&S.me.viewAs&&S.me.viewAs.crewName)||(S.me&&S.me.name)||'A vágó',links=[String(fd.get('cdLink')||'').trim()].concat(linksVal(fd,'cdLink')).filter(Boolean),pass=passVal(fd),note=String(fd.get('cdNote')||'').trim();
  const ord=x=>x.role==='editor'?0:1,all=(CD_RCPT||[]).slice().sort((x,y)=>ord(x)-ord(y)),rc=$('cdRcpt');
  if(rc&&!rc.dataset.built&&CD_RCPT!=null){rc.dataset.built='1';rc.innerHTML=`<span class="lbl">Címzettek</span>${all.length?`<div class="cd-list">${all.map(x=>`<label class="cd-to"><input type="checkbox" name="cdTo" value="${esc(x.email)}"><span><b>${esc(fnm(x.name))}</b><small class="muted">${esc(x.email)}</small></span></label>`).join('')}</div>`:'<p class="muted" style="margin:0">Az ügyvezető és a termelési vezető kapja meg.</p>'}`;}
  const picked=new Set(fd.getAll('cdTo')),people=all.filter(x=>picked.has(x.email)),toTxt=all.length?(people.length?people.map(x=>`<span class="nowrap">${esc(fnm(x.name))} &lt;${esc(x.email)}&gt;</span>`).join(', '):'<span class="bad-txt">senki – pipálj ki legalább egy címzettet</span>'):'ügyvezető, termelési vezető';
  meta.innerHTML=`<div><span>Címzett:</span> ${toTxt}</div><div><span>Feladó:</span> ${esc(who)} · Lumos Motion <span class="muted">(az app címéről; a válasz ${esc(who)} címére megy)</span></div><div><span>Tárgy:</span> <b>${CD_ONE?'Videó':'Videók'} leadva – ${esc(p.name||'')}</b></div>`;
  const lines=[esc(fnm(who))+' elkészítette a(z) „'+esc(p.name||'')+(CD_ONE?'” videóját - jóváhagyásra vár.':'” videóit - jóváhagyásra várnak.')];if(note)lines.push('','Megjegyzés: '+esc(note).replace(/\n/g,'<br>'));lines.push('',(CD_ONE?'Videó: ':'Videók: ')+(links.length?links.map(l=>`<a href="${esc(l)}" target="_blank" rel="noopener">${esc(l)}</a>`).join('<br>'):'<span class="muted">(még nincs link)</span>'));
  if(pass)lines.push('Jelszó: '+esc(pass));
  lines.push('','Projekt: <a href="#" onclick="return false">'+esc(location.origin+'/#p='+projSlug(p))+'</a>');
  if(!CD_EDITED)body.innerHTML=lines.join('<br>');}
/* Díjösszesítő előnézet: szerkeszthető, a módosítás csak annak az egy levélnek szól */
async function payPreview(month,cid,fresh){const box=$('payPrev');if(!box)return;const k=month+'|'+cid,c=crewById(cid);S._payEdit=S._payEdit||{};
  let h=fresh?'':S._payEdit[k];S._payHead=S._payHead||{};
  if(!h||!S._payHead[k]){box.innerHTML='<p class="hint">Előnézet betöltése…</p>';try{const r=await call('payStatementPreview',payStatementData(month,cid));if(!h)h=r.html;S._payHead[k]={subject:r.subject||'',to:r.to||'',from:r.from||''};}catch(e){box.innerHTML=`<p class="hint bad-txt">${esc(errText(e))}</p>`;return;}}
  const hd=S._payHead[k]||{};
  box.innerHTML=`<div class="pe-bar"><div><b>Előnézet – ${esc(c?c.name:'')}</b><small>Kattints a szövegbe, és írd át, ami kell. A módosítás csak ennek a levélnek szól, kiküldésig megmarad.</small></div><button class="btn outline small" type="button" id="pe-reset" data-action="pay-mail-reset" data-month="${month}" data-cid="${esc(cid)}"${S._payEdit&&S._payEdit[k]?'':' disabled title="Még nem módosítottad a levelet"'}>↺ Eredeti visszaállítása</button></div>
    <div class="inv-h pe-head"><div><span>Feladó:</span> ${esc(hd.from||'')}</div><div><span>Címzett:</span> ${esc(hd.to||'(nincs e-mail-cím)')}</div><div><span>Tárgy:</span> <b>${esc(hd.subject||'')}</b></div></div>`;
  const f=document.createElement('iframe');f.className='mail-frame';f.title='Díjösszesítő előnézet (szerkeszthető)';   // külön dokumentum: az app stílusai nem keverednek bele, pont úgy néz ki, mint a levélben
  f.srcdoc='<!doctype html><html><head><meta charset="utf-8"><style>body{margin:16px;background:#fff}body:focus{outline:none}</style></head><body contenteditable="true" spellcheck="true">'+h+'</body></html>';
  const fit=()=>{try{f.style.height=ifrH(f)+'px';}catch(_){}};
  f.addEventListener('load',()=>{const d=f.contentDocument;if(!d)return;noNav(d);fit();setTimeout(fit,300);d.addEventListener('input',()=>{S._payEdit=S._payEdit||{};S._payEdit[k]=d.body.innerHTML;payEditMark();fit();const rb=$('pe-reset');if(rb){rb.disabled=false;rb.title='';}});});
  box.appendChild(f);if(!payPreview._auto)setTimeout(()=>f.scrollIntoView({block:'start',behavior:'smooth'}),50);payPreview._auto=false;}
function payEditMark(){document.querySelectorAll('[data-pe-tag]').forEach(t=>{t.hidden=!(S._payEdit&&S._payEdit[t.dataset.peTag]);});}
document.addEventListener('input',e=>{const ed=e.target.closest&&e.target.closest('.mail-edit[data-pe]');if(!ed)return;S._payEdit=S._payEdit||{};S._payEdit[ed.dataset.pe]=ed.innerHTML;payEditMark();});
/* Termelői fizetések alján: számlát kiállította / számla fizetve pipálása */
document.addEventListener('change',async e=>{const t=e.target;if(!t.dataset||!t.dataset.paySt)return;const on=t.checked;
  if(t.dataset.paySt==='paid'&&on){t.checked=false;const nm=(crewById(t.dataset.cid)||{}).name||'';   // kifizetés: dátum választással (alapból ma), utólag nem vonható vissza
    openModal('✅ Kifizetve – '+nm,`<div class="fields"><div class="field"><label for="m-paidAt">Kifizetés dátuma</label><input class="inp" id="m-paidAt" name="paidAt" type="date" value="${todayISO()}" max="${todayISO()}" required></div></div><p class="hint" style="margin:6px 0 0">A kifizetés rögzítése után nem vonható vissza.</p>`,
      {submitLabel:'Kifizetve',submit:async fd=>{const d=String(fd.get('paidAt')||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(d)){toast('Add meg a dátumot.',true);return;}
        try{S.payStatus=await call('setPayStatus',{month:t.dataset.month,crewId:t.dataset.cid,field:'paid',on:true,date:d});closeModal();render(true);toast(`${nm}: kifizetve (${fmtShort(d)})`);}catch(err){handleErr(err);}}});return;}
  t.disabled=true;
  try{S.payStatus=await call('setPayStatus',{month:t.dataset.month,crewId:t.dataset.cid,field:t.dataset.paySt,on});render(true);toast(t.dataset.paySt==='paid'?(on?'Számla kifizetve':'Fizetés visszavonva'):(on?'Számla kiállítva':'Számla kiállítása visszavonva'));}
  catch(err){t.checked=!on;t.disabled=false;handleErr(err);}});
/* Havi díjösszesítő kiküldése a szakembereknek (ügyvezető) */
function pmMasterSync(){const sb=document.querySelector('#mform button[type=submit]');if(sb&&document.querySelector('#modalRoot .pay-mail-list,#modalRoot #pm-month')){const any=!!document.querySelector('#modalRoot input[name=pm]:checked');sb.disabled=!any;sb.title=any?'':'Jelölj ki legalább egy munkatársat';}const m=$('pm-master');if(!m)return;const all=[...document.querySelectorAll('#modalRoot input[name=pm]:not(:disabled)')],on=all.filter(x=>x.checked).length;m.checked=!!all.length&&on===all.length;m.indeterminate=on>0&&on<all.length;}
document.addEventListener('change',e=>{if(e.target.id==='pm-master'){document.querySelectorAll('#modalRoot input[name=pm]:not(:disabled)').forEach(x=>{x.checked=e.target.checked;});pmMasterSync();}else if(e.target.name==='pm')pmMasterSync();});
document.addEventListener('change',e=>{if(e.target.id==='pm-month'){setMonthAll(e.target.value);closeModal();render(true);payMailModal(e.target.value);}});
function payMailModal(month,only){
  const ids=new Set();S.projects.filter(p=>p.status!=='lemondva'&&pr(p)).forEach(p=>(p.fees||[]).forEach(f=>{const id=f.kind==='fixed'?f.refCrewId:f.crewId;if(id&&num(f.amount)&&(f.kind==='fixed'?pr(p).start.slice(0,7):payMonth(p,id))===month)ids.add(id);}));   // a vágó díja a vágási határidő hónapjában
  OFFICE_RENT.forEach(o=>{const c=(S.crew||[]).find(x=>x.name===o.name);if(c)ids.add(c.id);});(S.salesPeople||[]).forEach(x=>{if(salesPayOf(month,x.crewId))ids.add(x.crewId);});(S.payAdjust||[]).forEach(x=>{if(String(x.month)===month&&num(x.amount))ids.add(x.crewId);});
  const list=[...ids].map(id=>({c:crewById(id),d:payStatementData(month,id)})).filter(x=>x.c&&!isEmployee(x.c)&&(!only||x.c.id===only)).sort((a,b)=>b.d.total-a.d.total);
  const mset=new Set([todayISO().slice(0,7),month]);S.projects.forEach(p=>{if(p.status!=='lemondva'&&pr(p)&&(p.fees||[]).some(f=>num(f.amount))){mset.add(pr(p).start.slice(0,7));(p.fees||[]).forEach(f=>{if(f.crewId&&num(f.amount))mset.add(payMonth(p,f.crewId));});}});(S.payAdjust||[]).forEach(x=>mset.add(String(x.month)));
  const months=[...mset].filter(m=>/^\d{4}-\d{2}$/.test(m)).sort().reverse();
  const monthSel=`<div class="pm-top"><select class="inp" id="pm-month" style="width:auto" aria-label="Hónap">${months.map(m=>`<option value="${m}"${m===month?' selected':''}>${esc(F_YM.format(toDate(m+'-01')))}</option>`).join('')}</select></div>`;
  const sentOf=id=>(S.paySent||[]).find(x=>x.crewId===id&&String(x.month)===month);
  openModal(only?'📧 Díjösszesítő kiküldése – '+((crewById(only)||{}).name||''):'📧 Díjösszesítők kiküldése',`${monthSel}${list.length?'':`<div class="panel">${empty('Ebben a hónapban nincs kinek díjösszesítőt küldeni.')}</div>`}${(()=>{const s0=only&&sentOf(only);if(!s0)return '';const cur=(list.find(x=>x.c.id===only)||{}).d,chg=cur&&Math.round(num(s0.amount))!==Math.round(cur.total);
      return `<div class="pm-resent-warn" role="alert"><b>⚠️ Ezt a díjösszesítőt már kiküldted</b><span>${esc(s0.sentAt||'')}${s0.sentBy?' · '+esc(s0.sentBy):''} · ${esc(s0.email||'')} · ${ftFmt(num(s0.amount))}</span><span>${chg?`Azóta változott az összeg (most ${ftFmt(cur.total)}), ezért érdemes lehet újraküldeni.`:'Az összeg azóta nem változott – újraküldéskor ugyanezt kapja meg még egyszer.'}</span></div>`;})()}<p class="hint" style="margin:0 0 10px">Mindenki csak a saját összesítőjét kapja meg, a saját e-mail-címére, a te aláírásoddal. Az „Előnézet” megmutatja a levelet.</p>
    <div class="pay-mail-list">${list.length&&!only?`<div class="pml-row pml-head"><label class="pml-chk"><input type="checkbox" id="pm-master" aria-label="Mindenki kijelölése / kijelölés törlése"><span><b>Mindenki</b></span></label></div>`:''}${list.map(({c,d})=>{const s=sentOf(c.id),mail=String(c.email||'').trim();
      return `<div class="pml-row"><label class="pml-chk"><input type="checkbox" name="pm" value="${esc(c.id)}"${mail&&(only?c.id===only:!s)?' checked':''}${mail?'':' disabled'}><span><b>${esc(c.name)}</b><small>${mail?esc(mail):'<span class="bad-txt">nincs e-mail-cím</span>'}</small></span></label>
        <span class="pml-amt">${ftFmt(d.total)}</span><span class="statuspill p-info" data-pe-tag="${month}|${esc(c.id)}"${S._payEdit&&S._payEdit[month+'|'+c.id]?'':' hidden'}>✏️ szerkesztve</span><span class="pml-st">${s?`<span class="statuspill p-ok pml-sent" role="button" tabindex="0" data-action="pay-sent-view" data-month="${month}" data-cid="${esc(c.id)}" data-tip="${esc('Kiküldve: '+s.sentAt+' · '+s.sentBy+(num(s.amount)!==d.total?'\nAkkor: '+ftFmt(s.amount)+' – azóta változott!':'')+'\nKattints a kiküldött levél megnyitásához.')}">✓ kiküldve${num(s.amount)!==d.total?' ⚠️':''}</span>`:''}</span>
        <button class="linkbtn" type="button" data-action="pay-mail-prev" data-month="${month}" data-cid="${esc(c.id)}">Előnézet</button></div>`;}).join('')}</div>
    <div id="payPrev"></div>`,{submitLabel:'Kiküldés',submit:async fd=>{const sel=fd.getAll('pm');if(!sel.length){toast('Jelölj ki legalább egy munkatársat.',true);return;}
      try{const r=await call('sendPayStatements',{items:sel.map(id=>{const it=payStatementData(month,id),h=S._payEdit&&S._payEdit[month+'|'+id];if(h)it.html=h;return it;})});(r.sent||[]).forEach(x=>{if(S._payEdit)delete S._payEdit[month+'|'+x.crewId];});S.paySent=r.paySent||S.paySent;closeModal();render(true);
        toast(`Díjösszesítő kiküldve: ${r.sent.map(x=>x.name).join(', ')||'senkinek'}`+(r.failed.length?` · nem sikerült: ${r.failed.map(x=>x.name||x.crewId).join(', ')}`:''),!!r.failed.length);}catch(e){handleErr(e);}}});
  const mb=document.querySelector('#modalRoot .mbox');if(mb)mb.classList.add('mbox-wide');pmMasterSync();
  if(list.length&&(only||list.length===1)){payPreview._auto=true;payPreview(month,(only&&list.find(x=>x.c.id===only)||list[0]).c.id);}}   // egy címzett: az előnézet rögtön megjelenik
/* Több átadási link: alapból 1 mező, „+ Újabb link” gombbal legfeljebb 5 */
const LINKS_MAX=5;
function linksField(name,label,first,extra,ph){const ex=(extra||[]).slice(0,LINKS_MAX-1);
  return `<div class="field full links-field" data-links="${name}"><label for="m-${name}">${label}</label><div class="link-rows">
    <input class="inp" id="m-${name}" name="${name}" type="url" autocomplete="off" placeholder="${esc(ph||'https://drive.google.com/…')}" value="${esc(first||'')}">
    ${ex.map(v=>linkRowHtml(name,v)).join('')}</div><button class="linkbtn link-add" type="button" data-action="link-add" data-name="${name}"${ex.length>=LINKS_MAX-1?' hidden':''}>+ Újabb link</button></div>`;}
const linkRowHtml=(name,v)=>`<div class="link-row"><input class="inp" name="${name}_x" type="url" autocomplete="off" placeholder="https://…" value="${esc(v||'')}" aria-label="További link"><button class="x w" type="button" data-action="link-del" aria-label="Link törlése">×</button></div>`;
function linksVal(fd,name){return fd.getAll(name+'_x').map(x=>String(x||'').trim()).filter(Boolean);}
const linksBad=arr=>arr.find(x=>!/^https:\/\/\S+$/i.test(x));
/* Jelszó a videó linkjéhez (opcionális) */
const passField=cur=>`<div class="field full pass-field"><label class="pass-chk"><input type="checkbox" name="hasPass" id="m-hasPass"${cur?' checked':''}> 🔒 A videó jelszóval védett</label><input class="inp" name="dPass" id="m-dPass" maxlength="120" autocomplete="off" placeholder="Jelszó" value="${esc(cur||'')}"${cur?'':' hidden'}></div>`;
const passVal=fd=>fd.get('hasPass')?String(fd.get('dPass')||'').trim():'';
document.addEventListener('change',e=>{if(e.target.id!=='m-hasPass')return;const i=$('m-dPass');if(i){i.hidden=!e.target.checked;if(e.target.checked)i.focus();}});
function streamLinkModal(next){const d=S.draft;if(!d)return;
  openModal('🔴 A stream videójának linkje',`<div class="fields">${mf('deliveryLink','Videó linkje (pl. YouTube)',{full:true,type:'url',ph:'https://www.youtube.com/live/…',v:d.deliveryLink||''})}${passField(d.deliveryPass)}</div>
    <p class="hint" style="margin:0">A projekt streamet kért – a lezáráshoz add meg a közvetítés vagy a felvétel linkjét. A Projektek listában és a TIG-ben is ez jelenik meg.</p>`,
    {submitLabel:'Lezárás',submit:async fd=>{const l=String(fd.get('deliveryLink')||'').trim();if(!/^https:\/\/\S+$/i.test(l)){toast('A link https:// kezdetű legyen.',true);return;}
      const pw=passVal(fd);if(fd.get('hasPass')&&!pw){toast('Add meg a jelszót.',true);return;}closeModal();setDraft({deliveryLink:l,deliveryPass:pw});next();}});}
function deliveryModal(target){
  const d=S.draft,r=pr(d);if(!d)return;const toLead=target==='leadva';
  const its=deliverItems(d),stuck=d.siteOk==='nem';
  openModal(toLead?'✂️ Utómunka kész – videók leadása':'📦 Átadás',`${its.length?`<div class="deliv-list"><div class="sec-lbl" style="margin-top:0">Átadandó anyagok</div>${roList(its)}</div>`:''}
    <div class="fields">
      ${linksField('deliveryLink','Átadási link (YouTube, pCloud vagy más)',d.deliveryLink,d.deliveryLinks)}${passField(d.deliveryPass)}
      <div class="field"><label>${r&&r.end!==r.start?'Rendezvény utolsó napja':'Rendezvény napja'}</label><div class="inp ro-inp"><b>${r?fmtDay(r.end):'Nincs dátum'}</b></div></div>
      <div class="field"><label for="m-dueAt">Átadási határidő</label><input class="inp" id="m-dueAt" name="dueAt" type="date" value="${esc(dueDate(d)||'')}"${r?` min="${esc(r.end)}"`:''}></div>
      ${d.status==='atadva'&&d.deliveredAt?`<div class="field full"><span class="hint" style="margin:0">Átadva: <b class="ok-txt">${fmtDay(d.deliveredAt)}</b></span></div>`:''}
      ${stuckSummary(d)}
      ${canSeeFees()&&penCrewOpts().length?`<div class="field full"><label class="toggle"><input type="checkbox" id="m-stuck"${stuck?' checked':''}><span class="tl">🚨 Elakadás történt</span></label></div>`:''}
      ${penBlock(stuck)}
      <div class="field full"><label for="m-deliveryNotes">Észrevételek</label><textarea class="inp" id="m-deliveryNotes" name="deliveryNotes" rows="4" maxlength="3000" placeholder="Hogy ment a projekt, mire figyeljünk legközelebb, mi maradt nyitva…">${esc(d.deliveryNotes||'')}</textarea></div>
    </div>`,{submitLabel:toLead?'Leadva ✓':d.status==='atadva'?'Mentés':'Átadva ✓',submit:async fd=>{
      const link=String(fd.get('deliveryLink')||'').trim();if(!/^https:\/\/\S+$/i.test(link)){toast('Adj meg egy érvényes átadási linket (https://…).',true);const e=$('m-deliveryLink');if(e)e.focus();return;}
      const links=linksVal(fd,'deliveryLink');if(linksBad(links)){toast('Minden link https:// kezdetű legyen.',true);return;}
      const notes=String(fd.get('deliveryNotes')||'').trim();   // az észrevétel nem kötelező
      let pens=[];try{pens=penRowsCollect(fd,notes);}catch(e){toast(e.message,true);return;}
      const due=String(fd.get('dueAt')||'');closeModal();penRowsSubmit(d.id,pens);
      if(fd.get('hasPass')&&!passVal(fd)){toast('Add meg a jelszót.',true);return;}
      const base={deliveryLink:link,deliveryLinks:links,deliveryPass:passVal(fd),deliveryNotes:notes,dueKept:validISO(due)&&todayISO()>due?'nem':'igen',dueAt:validISO(due)&&due!==defaultDue(d)?due:''};
      if(toLead){const st=videoStagesOn()?'jovahagyas':'leadva';setDraft(Object.assign(base,{status:st,leadvaAt:d.leadvaAt||todayISO(),deliveredAt:'',stepsDone:ticksUpTo(S.draft,st)}));setTimeout(()=>{if(S.dirty)saveDraft();},0);toast('Videók leadva – jóváhagyásra várnak');return;}   // leadás után: „Videók jóváhagyásra várnak”
      setDraft(Object.assign(base,{status:'atadva',deliveredAt:d.deliveredAt||todayISO(),stepsDone:ticksUpTo(S.draft,'atadva')}));confetti();setTimeout(()=>{if(S.dirty)saveDraft();},0);}});
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
    closeModal();setDraft({rentals:(S.draft.rentals||[]).concat([{id:uuid(),crewId:crewId||'',name,company:'',price:0,own:true}])});setTimeout(()=>{if(S.dirty)saveDraft();},0);}});
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
    closeModal();setDraft({rentals:(S.draft.rentals||[]).concat([r])});setTimeout(()=>{if(S.dirty)saveDraft();},0);}});
}
async function sendListModal(only){
  if(!S.draft||ro())return;
  if(S.dirty){flushSave();await SAVE_Q;if(S.dirty){toast('A módosítások mentése nem sikerült – próbáld újra, hogy a friss lista menjen ki.',true);return;}}
  const p=S.draft;if(!p)return;
  const ids=[...crewIds(p)];
  if(!ids.length){toast('Előbb osszál be stábot a projektre.',true);return;}
  const roleOf=id=>{const r=[];if(p.lead===id)r.push('Projektvezető');(p.crew||[]).forEach(a=>{if(a.crewId===id)r.push(a.role);});return r.join(', ');};
  const rows=ids.map(id=>{const c=crewById(id);const has=!!(c&&EMAIL_RE.test(c.email||''));
    return `<label class="toggle"><input type="checkbox" name="to" value="${esc(id)}"${has?(only&&only!==id?'':' checked'):' disabled'}><span class="tl"><b>${esc(c?c.name:'Törölt munkatárs')}</b><br><small class="muted">${esc(roleOf(id))} · ${has?esc(c.email):'nincs e-mail-cím megadva a Stáb fülön'}</small></span></label>`;}).join('');
  openModal(p.listSentAt?'Eszközlista újraküldése':'Eszközlista küldése',`<p class="hint" style="margin:0">A levél az admin@lumosmotion.com címről megy ki a te neveddel. Ha valaki válaszol, a válasz hozzád érkezik, és te is kapsz másolatot.</p>
    <div class="toggles" style="grid-template-columns:1fr">${rows}</div>
    <div class="field"><label for="m-msg">Üzenet (nem kötelező)</label><textarea class="inp" id="m-msg" name="message" placeholder="pl. Reggel 7-kor találkozunk a raktárnál."></textarea></div>
    ${String(p.techPlan||'').trim()?'<div class="rolepick"><label><input type="checkbox" name="plan" checked> Forgatási és technikai terv csatolása</label></div>':''}
    ${p.listSentAt?`<p class="hint" style="margin:0">Utoljára kiküldve: ${esc(p.listSentAt)} · ${esc(p.listSentTo||'')}</p>`:''}<div id="eq-prev"></div>`,
  {left:`<button type="button" class="btn outline small" data-action="eq-preview">👁 Előnézet</button>`,submitLabel:'Küldés',submit:async fd=>{
    const to=fd.getAll('to');if(!to.length){toast('Válassz ki legalább egy címzettet.',true);return;}
    try{
      await SAVE_Q;   // a még folyamatban lévő mentés előbb érjen be, hogy a friss lista menjen ki
      const r=await call('sendEquipmentList',{projectId:p.id,recipients:to,message:String(fd.get('message')||'').trim(),includePlan:fd.get('plan')==='on'});
      [projById(p.id),S.draft].forEach(x=>{if(x){x.listSentAt=r.listSentAt;x.listSentTo=r.listSentTo;}});
      closeModal();render(true);toast(S.mailOn===false?'Az e-mailek szünetelnek – az eszközlista nem ment ki (Beállítások → E-mail értesítések).':'Eszközlista elküldve: '+r.names.join(', '),S.mailOn===false);
    }catch(e){handleErr(e);}
  }});
}

/* ===== Projekt szerkesztése ===== */
function openProject(id){if(isSales())return;   // az értékesítő nem nyithat meg projektet

  const p=projById(id);if(!p)return;S.crewDay='';
  S.tab='projektek';S.projectId=id;S.draft=prepDraft(p);S.draftBase=clone(S.draft);S.dirty=false;histReset();S.addCrew={person:'',role:''};S.addEq={item:'',qty:1};
  closeModal();render(true);scrollTo(0,0);
}
/* Visszavonás / mégis (Ctrl/⌘+Z, Ctrl/⌘+Shift+Z vagy Ctrl+Y): a projekt vázlatáról pillanatképeket tartunk. */
/* ===== Művelet-előzmény a projekten kívül (Ctrl+Z / Ctrl+Shift+Z, ↶ ↷ gombok): bevétel/kiadás/tagi kölcsön, ügyfél, munkatárs, eszköz ===== */
const OPH={u:[],r:[],busy:false};
function opRec(label,undo,redo){OPH.u.push({label,undo,redo});if(OPH.u.length>60)OPH.u.shift();OPH.r=[];if(document.querySelector('.undo-bar'))setTimeout(()=>render(true),0);}
async function opStep(dir){
  if(OPH.busy)return;const from=dir<0?OPH.u:OPH.r,to=dir<0?OPH.r:OPH.u;
  if(!from.length){toast(dir<0?'Nincs mit visszavonni.':'Nincs mit újra végrehajtani.');return;}
  const op=from.pop();OPH.busy=true;
  try{await (dir<0?op.undo:op.redo)();to.push(op);toast((dir<0?'↶ Visszavonva: ':'↷ Újra: ')+op.label);}
  catch(e){from.push(op);handleErr(e);}finally{OPH.busy=false;render(true);}
}
function undoBar(){return '';return `<div class="undo-bar btns"><button class="btn outline small" type="button" data-action="op-undo" title="Visszavonás (Ctrl+Z)${OPH.u.length?': '+esc(OPH.u[OPH.u.length-1].label):''}" aria-label="Visszavonás"${OPH.u.length?'':' disabled'}>↶</button><button class="btn outline small" type="button" data-action="op-redo" title="Újra (Ctrl+Shift+Z)${OPH.r.length?': '+esc(OPH.r[OPH.r.length-1].label):''}" aria-label="Újra"${OPH.r.length?'':' disabled'}>↷</button></div>`;}
/* Pénzügyi sorok visszaállítása adott állapotra (null = a sor ne létezzen) */
async function finRestore(table,ids,states){
  const ups=states.filter(Boolean).map(clone),dels=ids.filter((id,i)=>!states[i]);
  finLocal(table,ups);dels.forEach(id=>finLocal(table,[{id}],true));render(true);
  try{if(ups.length)finApply(await call('finUpsert',{table,rows:ups}));for(const id of dels)finApply(await call('finDelete',{table,id}));}
  catch(e){finLoad(true);throw e;}
}
/* Ügyfél / munkatárs / eszköz visszaállítása */
const ENT={
  client:{get:()=>S.clients||[],set:v=>{S.clients=v;},save:'saveClient',del:'deleteClient'},
  crew:{get:()=>S.crew||[],set:v=>{S.crew=v;},save:'saveCrew',del:'deleteCrew'},
  item:{get:()=>S.inventory||[],set:v=>{S.inventory=v;},save:'saveItem',del:'deleteItem'}};
async function entRestore(kind,id,state){
  const E=ENT[kind],cur=E.get().find(x=>x.id===id);
  if(!state){if(cur){await call(E.del,{id});E.set(E.get().filter(x=>x.id!==id));}return;}
  const rec=Object.assign({},clone(state),{baseUpdatedAt:cur?cur.updatedAt:''});
  if(kind==='client'){rec.oldName=cur?cur.name:'';await saveClientRec(rec);return;}
  const saved=await call(E.save,rec);E.set(E.get().filter(x=>x.id!==saved.id).concat([saved]));
}
function entRec(kind,label,id,before,after){opRec(label,()=>entRestore(kind,id,before),()=>entRestore(kind,id,after));}
const HIST={u:[],r:[],last:0,key:''};
function histReset(){HIST.u=[];HIST.r=[];HIST.last=0;HIST.key='';}
function histPush(){if(!S.draft)return;const s=JSON.stringify(S.draft);if(HIST.u[HIST.u.length-1]===s)return;HIST.u.push(s);if(HIST.u.length>150)HIST.u.shift();HIST.r=[];}
function histTyping(key){const now=Date.now();if(now-HIST.last>900||HIST.key!==key)histPush();HIST.last=now;HIST.key=key;}
function histStep(dir){
  if(!S.draft||ro())return;const from=dir<0?HIST.u:HIST.r,to=dir<0?HIST.r:HIST.u;if(!from.length){if(S.dirty&&!draftChanged()){S.dirty=false;renderChrome();}toast(dir<0?(S.dirty?'Nincs több visszavonható lépés – a mentetlen módosítást a „Mentés” menti, az „Elvetés” eldobja.':'Nincs mit visszavonni.'):'Nincs mit újra végrehajtani.');return;}
  to.push(JSON.stringify(S.draft));S.draft=JSON.parse(from.pop());S.dirty=true;HIST.key='';try{document.activeElement&&document.activeElement.blur();}catch(e){}render(true);
}
/* A részösszegek frissítése gépelés közben (újrarajzolás nélkül). */
function refreshFinSums(p){{const b=p?prodBase(p):0,ep=$('f-budgetPct'),ef=$('f-budgetFt'),ae=document.activeElement;if(p&&ep&&ef){if(p.budgetMode==='ft'&&ae!==ep)ep.value=b>0&&p.budgetVal!==''?String(Math.round(num(p.budgetVal)/b*1000)/10).replace('.',','):'';else if(p.budgetMode==='pct'&&ae!==ef)ef.value=b>0&&p.budgetVal!==''?moneyFmt(Math.round(b*num(p.budgetVal)/100)):'';}}   /* hatékonyság ↔ keret a „…után” összegből */
{const fn=document.querySelector('.fin-net input');if(fn&&p)fn.value=moneyFmt(salesBase(p));const d=p&&projDeal(p),e=d&&salesCommEst(p,d),sp=$('f-salesPct'),sf=$('f-salesFt');if(e&&sp&&sf&&document.activeElement!==sp&&document.activeElement!==sf){sp.value=String(e.pct).replace('.',',');sf.value=moneyFmt(e.amt);}}   // jutalék levonása utáni összeg élőben

  document.querySelectorAll('[data-day-sum]').forEach(el=>{el.textContent=moneyFmt(daySumOf(p,el.dataset.daySum))||0;});
  const o=document.querySelector('[data-other-sum]');if(o)o.textContent=moneyFmt(otherSumOf(p))||0;
  const f=document.querySelector('[data-field-sum]');if(f)f.textContent=moneyFmt(fieldSumOf(p))||0;
  const ps=document.querySelector('[data-post-sum]');if(ps)ps.textContent=moneyFmt(postSumOf(p))||0;
}
/* Csapat véglegesítése: megerősítés után a tagok a naptárba kerülnek, e-mailt és naptárértesítést kapnak. */
async function crewFinalizeModal(){
  const d=S.draft;if(!d||ro()||!crewFinalOn())return;
  flushSave();await SAVE_Q;if(S.dirty){toast('Előbb mentődjenek el a módosítások, aztán próbáld újra.',true);return;}
  const p=projById(d.id)||d,ids=crewIdsNow(p);if(!ids.length){toast('Még nincs beosztva senki.',true);return;}
  if(!validISO(p.date)){toast('Előbb add meg a projekt első napját.',true);return;}
  {const free=postTasks(p).filter(t=>!taskOwners(p,t.k).length);if(free.length){   // minden vágnivaló videónak legyen vágója
    toast(cutterIds(p).length?`Előbb rendeld vágóhoz az összes videót – még nincs vágója: ${free.map(t=>t.label).join(', ')}.`:'Vágnivaló videók vannak, de nincs vágó beosztva – előbb ossz be vágót, és rendeld hozzá a videókat.',true);
    const el=document.querySelector('.ct-chip.free')||$('add-crew-role');if(el){el.scrollIntoView({behavior:'smooth',block:'center'});}return;}}
  const roleOf=id=>(id===p.lead?['Projektvezető']:[]).concat((p.crew||[]).filter(a=>a.crewId===id).map(a=>a.role)).join(', ');
  const diff=crewFinalDiff(p),first=crewFinalState(p)==='none';
  const gearWarn=[...new Set((p.crew||[]).filter(a=>isOpRole(a.role)).map(a=>a.crewId))].map(id=>{const cats=(p.equipment||[]).filter(e=>(e.crewId||'')===id).map(e=>(itemById(e.itemId)||{}).category);
      const miss=['Kamera','Objektív'].filter(c=>!cats.includes(c));if(!miss.length)return '';const own=rentalsOf(p,id).map(r=>r.name).filter(Boolean);
      return `<li><b>${esc((crewById(id)||{}).name||'Operatőr')}</b>: nincs ${miss.map(m=>m==='Kamera'?'kamerája':'objektívje').join(' és ')} beosztva${own.length?` <span class="muted">(saját / bérelt: ${esc(own.join(', '))})</span>`:''}</li>`;}).filter(Boolean).join('');
  const noCut=!postTasks(p).length&&(p.crew||[]).some(a=>a.role==='Vágó')?`<div class="cf-gear"><b>✂️ A vágónak nincs vágnivalója</b><small>Vágót osztottál be, de az Utómunkánál nincs kiválasztva semmi. Véglegesítheted így is, de a levélben nem lesz, mit kell elkészítenie.</small></div>`:'';
  const gearBox=gearWarn?`<div class="cf-gear"><b>⚠️ Az operatőrnek nincsenek eszközei</b><ul>${gearWarn}</ul><small>Véglegesítheted így is, de előtte érdemes hozzárendelni a kamerát és az objektívet.</small></div>`:'';
  const tag=id=>first?'':diff.added.includes(id)?' <span class="cf-tag new">új tag – értesítést kap</span>':diff.changed.includes(id)?' <span class="cf-tag chg">módosult – értesítést kap</span>':' <span class="cf-tag">nem kap újra értesítést</span>';
  const self=id=>!!(S.me&&S.me.crewId&&S.me.crewId===id);
  const rows=ids.map(id=>{const c=crewById(id)||{},ok=EMAIL_RE.test(c.email||'');return `<li data-cfid="${esc(id)}"><b>${esc(c.name||'Munkatárs')}</b> <span class="muted">· ${esc(roleOf(id))}</span>${self(id)?' <span class="cf-tag">te vagy – nem kapsz levelet, csak a naptárba kerülsz</span>':tag(id)}${!self(id)&&ok?`<button type="button" class="cf-open" data-action="cf-open" data-id="${esc(id)}" aria-expanded="false">✉️ Levél <span class="cf-car">▾</span></button>`:''}<br><small class="${ok?'muted':'warn-txt'}">${ok?esc(c.email):'nincs e-mail-címe – nem kap értesítést (a Stáb fülön pótolható)'}</small></li>`;}).join('')
    +diff.removed.map(id=>`<li><b>${esc((crewById(id)||{}).name||'Munkatárs')}</b> <span class="cf-tag">levéve – kikerül a naptárbejegyzésből</span></li>`).join('');
  const cfSubj=(first?'Beosztás: ':'Módosult beosztás: ')+(p.name||'')+' – '+[p.date,p.endDate&&p.endDate>p.date?p.endDate:''].filter(Boolean).map(d=>F_FULL.format(toDate(d))).join(' – '),cfIntro=first?'Véglegesítettük a csapatot, és beosztottunk erre a projektre:':'Módosult a beosztásod ezen a projekten:';
  const cfFirst=String((crewById(ids[0])||{}).name||'Kata').split(/\s+/).pop();
  setTimeout(()=>cfPreviewLoad(p,cfSubj,cfIntro),0);
  openModal('Biztosan véglegesíted a csapatot?',`${gearBox}${noCut}<p style="margin:0 0 10px">${first?(editOnly(d)?'Ezzel a tagokat beteszed a projekt bejegyzésébe a <b>Vágói naptárban</b> (a projekt napjától a leadási határidőig). <b>Minden tag e-mailt kap a beosztásáról.</b>':'Ezzel a tagokat beteszed a projekt naptárbejegyzésébe. <b>Minden tag e-mailt kap a beosztásáról, és a forgatás bekerül a naptárába.</b>'):'A csapat a legutóbbi élesítés óta módosult. <b>Csak az új tagok, és azok kapnak értesítést, akiknek a szerepe, eszközei vagy napjai változtak.</b>'}</p>
    <div class="cf-mail"><div class="cf-mail-h">✉️ A levél szövege <span class="muted">– minden címzettnek ez megy ki</span></div>
      <div class="field"><label for="m-cfSubj">Tárgy</label><input class="inp" id="m-cfSubj" name="cfSubj" maxlength="200" value="${esc(cfSubj)}"></div>
      <div class="field"><label for="m-cfNote">Megjegyzés a csapatnak <span class="muted">(nem kötelező)</span></label><textarea class="inp" id="m-cfNote" name="cfNote" rows="3" maxlength="3000" placeholder="pl. parkolás a hátsó bejáratnál, dress code: fekete, 7:30-kor rövid eligazítás"></textarea></div></div>
    <div class="cf-mail-h" style="margin:14px 0 4px">👥 Címzettek <span class="muted">– a <b>✉️ Levél ▾</b> gombbal megnézheted, és kézzel át is írhatod az illető levelét</span></div>
    <ul class="cf-list">${rows}</ul>
    ${crewFinalState(p)==='changed'?'<p class="hint" style="margin:8px 0 0">Akit levettél a projektről, az kikerül a naptárbejegyzésből.</p>':''}
    <div class="cf-prev" hidden><div class="cf-prev-h"><b>✏️ Az e-mail szerkeszthető</b><button class="linkbtn" type="button" id="cfPrevReset" hidden>↺ Eredeti szöveg</button><select class="inp" id="cfPrevWho" aria-label="Címzett" hidden></select></div><div id="cfPrev" class="cf-prev-box"><p class="hint" style="margin:0">Előnézet betöltése…</p></div></div>`,{submitLabel:'Igen, véglegesítem a csapatot',cancelLabel:'Mégsem',submit:async fd=>{
    const subj=String(fd.get('cfSubj')||'').trim(),note=String(fd.get('cfNote')||'').trim();
    const arg={projectId:p.id,cutTasks:cutTasksFor(p)};if(subj&&subj!==cfSubj)arg.subject=subj;if(note)arg.note=note;
    const ed=Object.keys(CF_EDIT).filter(k=>CF_EDIT[k]);if(ed.length){arg.custom={};ed.forEach(k=>{arg.custom[k]=CF_EDIT[k];});}   // kézzel átírt levelek: tagonként   // ami nem változott, azt a szerver tagonként állítja be (új / módosult beosztás)
    try{const r=await call('finalizeCrew',arg);closeModal();
      const saved=r.project,i=S.projects.findIndex(x=>x.id===saved.id);if(i>=0)S.projects[i]=saved;
      if(S.draft&&S.draft.id===saved.id){if(S.dirty){S.draft.crewFinal=saved.crewFinal;S.draft.calEventId=saved.calEventId;S.draft.status=saved.status;S.draft.prevStatus=saved.prevStatus;S.draft.updatedAt=saved.updatedAt;}else S.draft=prepDraft(saved);}
      if(S.crewEdit)delete S.crewEdit[saved.id];render(true);S.cal.events={};
      const warn=[].concat(r.failed&&r.failed.length?['nem ment ki: '+r.failed.join(', ')]:[],r.noEmail&&r.noEmail.length?['nincs e-mail-címe: '+r.noEmail.join(', ')]:[]);
      if(r.stepped)toast('Csapat véglegesítve – a projekt átkerült a Helyszíni munka szakaszba.');setTimeout(()=>toast(r.mailPaused?'Csapat véglegesítve. Az e-mailek szünetelnek, értesítés nem ment ki (Beállítások → E-mail értesítések).':`Csapat véglegesítve – ${r.sent.length?'e-mail kiküldve: '+(r.sentTo&&r.sentTo.length?r.sentTo.map(x=>x.name+' ('+x.email+')'):r.sent).join(', '):'senkinek nem kellett új értesítés'}.${warn.length?' Figyelem: '+warn.join('; '):''}`,!!warn.length),r.stepped?2500:0);
    }catch(e){handleErr(e);}
  }});
}
/* A termek kamerái / objektívei / diákeszközei a terem operatőréhez tartoznak: ha az operatőr változik vagy lekerül, az eszköz vele együtt mozog (operatőr nélkül gazdátlan lesz) */
function roomEqSync(d){if(!d||!Array.isArray(d.equipment)||!Array.isArray(d.recRooms))return;const own={};
  recRoomsOf(d).forEach(r=>{Object.keys(ROOM_EQ).forEach(k=>{const E=roomEq(r,k),L=roomLens(r,k);E.forEach((id,j)=>{const op=camOwner(d,r.id,k,j);[id,L[j]].forEach(x=>{if(x)(own[x]=own[x]||new Set()).add(op);});});});});
  if(!Object.keys(own).length)return;let ch=false;const eq=d.equipment.map(e=>{const w=e&&own[e.itemId];if(w&&w.size===1&&!w.has(e.crewId||'')){ch=true;return Object.assign({},e,{crewId:[...w][0]});}return e;});if(ch)d.equipment=eq;}   // ugyanabból a típusból több darab: mindenki a sajátját viszi
/* A terem operatőrének a Stáb és eszközök résznél kiosztott kamerái (és objektívei) automatikusan bekerülnek a terem kameraszögeihez:
   előbb a bejelölt, de üres szögek kapnak kamerát, a maradék kamerák a következő szögeket (teljes alakos → közeli → közönség) jelölik be. */
function roomOpEqFill(d,tick){if(!d||ro()||!Array.isArray(d.equipment)||!d.equipment.length)return false;const R=recRoomsOf(d);if(!R.some(r=>roomCams(r).length))return false;
  const CAM=new Set(camItems().map(x=>x.id)),LENS=new Set(lensItems().map(x=>x.id)),inv=id=>(S.inventory||[]).find(x=>x.id===id);
  const rooms=clone(R),used=new Set();rooms.forEach(r=>ROOM_CAMS.forEach(c=>{roomEq(r,c.k).concat(roomLens(r,c.k)).forEach(id=>{if(id)used.add(id);});}));
  const ANG=['er_total','er_close','er_crowd'];let ch=false;
  rooms.forEach(r=>{if(!roomCams(r).length)return;const op=(slotOwners(d,r.id+'_op')||[])[0];if(!op)return;
    const mine=pred=>d.equipment.filter(e=>e&&e.crewId===op&&pred(e.itemId)).flatMap(e=>Array(Math.max(1,num(e.qty)||1)).fill(e.itemId));
    const take=(arr,ok)=>{const i=arr.findIndex(id=>!used.has(id)&&(!ok||ok(id)));if(i<0)return '';const id=arr[i];arr.splice(i,1);used.add(id);return id;};
    const cams=mine(id=>CAM.has(id)),lenses=mine(id=>LENS.has(id));
    const SEEN=S._roomOpSeen=S._roomOpSeen||{},sk=(d.id||'')+'|'+r.id,sig=op+'|'+cams.slice().sort().join(','),fresh=SEEN[sk]!==undefined&&SEEN[sk]!==sig;SEEN[sk]=sig;   // új szöget csak akkor jelöl be, ha az operatőr vagy a kamerái tényleg változtak
    if(!cams.length)return;
    ANG.forEach(k=>{if(num(r[k])>0){const eq=roomEq(r,k);if(!eq[0]){const id=take(cams);if(id){eq[0]=id;r[k+'_eq']=eq;ch=true;}}}});
    if(tick&&fresh)ANG.forEach(k=>{if(num(r[k])>0)return;const id=take(cams);if(id){r[k]=1;r[k+'_eq']=[id];ch=true;}});   // új szöget csak eszköz- / beosztásváltozáskor jelöl be (a kézzel kivett pipát nem teszi vissza)
    ANG.forEach(k=>{if(!(num(r[k])>0))return;const eq=roomEq(r,k),ln=roomLens(r,k);if(eq[0]&&!ln[0]){const cam=inv(eq[0]),id=take(lenses,l=>lensFits(cam,inv(l)));if(id){ln[0]=id;r[k+'_lens']=ln;ch=true;}}});});
  if(ch)Object.assign(d,roomsPatch(rooms));return ch;}
/* Aki már nincs a helyszínen (remote vezető, csak vágó / értékesítő, vagy lekerült a projektről), annál nem maradhat eszköz: gazdátlan lesz, a stábnál újra kiosztható */
function offSiteEqRelease(d){if(!d||!Array.isArray(d.equipment))return;const on=onSiteIds(d),gone=new Set();
  const eq=d.equipment.map(e=>{if(e&&e.crewId&&!on.has(e.crewId)&&!((d.crew||[]).some(a=>a.crewId===e.crewId)&&feeSales(d,e.crewId))){gone.add(e.crewId);return Object.assign({},e,{crewId:''});}return e;});
  if(gone.size){d.equipment=eq;setTimeout(()=>toast(`${[...gone].map(id=>(crewById(id)||{}).name||'Valaki').join(', ')} már nincs a helyszínen – az eszközei gazdátlanok lettek, oszd ki őket újra.`),0);}}
function setDraft(patch){if(ro()||!S.draft)return;histPush();HIST.key='';Object.assign(S.draft,patch);
  if('crew' in patch&&!S.draft.lead){const ids=[...new Set((S.draft.crew||[]).map(a=>a.crewId))];if(ids.length===1)S.draft.lead=ids[0];}   // egyszemélyes stábnál ő a projektvezető
  if(('crew' in patch||'lead' in patch)&&!('fees' in patch))syncFeesWithCrew(S.draft);roomEqSync(S.draft);offSiteEqRelease(S.draft);if(!projLocked())roomOpEqFill(S.draft,!S._noTick);S.dirty=true;render(true);autoSave(400);}
/* Beosztott munkatárs → sor a Pénzügyek táblázatában (név, feladat, napidíj × napok); a díjat ott lehet átírni.
   Ha valakit levesznek a projektről, a sora csak akkor törlődik, ha még nem írtak be díjat. */
/* Projekt megnyitásakor a már beosztott emberek sora is bekerül a díjtáblázatba (mentés csak a következő módosítással). */
/* Ütközés (valaki más is mentette a projektet): mezőnként összefésüljük – a te módosításaid megmaradnak,
   az ő módosításai is bekerülnek; ha ugyanazt a mezőt módosítottátok, megkérdezzük, melyik maradjon. */
const MERGE_SKIP=new Set(['updatedAt','updatedBy','mutationId','baseUpdatedAt','createdAt','calEventId','_multi','er_post_n','x_foto_n']);
const FIELD_LABEL={name:'Projekt neve',client:'Ügyfél',venue:'Helyszín',eventType:'Rendezvény típusa',date:'Első nap',endDate:'Utolsó nap',startTime:'Kezdés',endTime:'Távozás',lastStartTime:'Utolsó nap kezdés',lastEndTime:'Utolsó nap távozás',contactName:'Kapcsolattartó',contactPhone:'Telefon',contactEmail:'E-mail',notes:'Jegyzetek',techPlan:'Technikai terv',crew:'Stáb',equipment:'Eszközök',fees:'Termelői díjak',status:'Állapot',stepsDone:'Lépések',lead:'Projektvezető',projectValue:'Büdzsé',budgetVal:'Termelői keret',budgetMode:'Termelői keret módja',deliveryLink:'Átadási link',deliveryNotes:'Átadási megjegyzés'};
async function conflictMerge(mine){
  const id=mine.id,base=(S.draftBase&&S.draftBase.id===id)?S.draftBase:null;let srv=null;
  try{const bt=await call('bootstrap');srv=(bt.projects||[]).find(x=>x.id===id)||null;}catch(e){}
  if(!srv){toast('Közben valaki más is módosította ezt a projektet, és nem sikerült betölteni az új változatot. Próbáld újra a mentést.',true);return;}
  const J=v=>v==null||v===''||(Array.isArray(v)&&!v.length)?'':typeof v==='object'?JSON.stringify(v):String(v),   // null / üres / szám-szöveg különbség nem módosítás
    i=S.projects.findIndex(x=>x.id===id);if(i>=0)S.projects[i]=srv;
  const theirs=prepDraft(srv),keys=new Set([...Object.keys(mine),...Object.keys(theirs)].filter(k=>!MERGE_SKIP.has(k)));
  const myChanged=[...keys].filter(k=>base?J(mine[k])!==J(base[k]):J(mine[k])!==J(theirs[k]));
  const both=base?myChanged.filter(k=>J(theirs[k])!==J(base[k])&&J(theirs[k])!==J(mine[k])):[];
  const merged=clone(theirs);myChanged.forEach(k=>{merged[k]=clone(mine[k]);});
  const who=srv.updatedBy||'valaki más';
  const finish=keepMine=>{const m=clone(merged);if(!keepMine)both.forEach(k=>{m[k]=clone(theirs[k]);});
    S.draftBase=clone(theirs);if(S.projectId===id){S.draft=m;S.dirty=true;}render(true);saveDraft();};
  if(S.me&&srv.updatedBy===S.me.name){finish(true);return;}   /* a saját korábbi (pl. automatikus / másik lapon történt) mentésed: nincs mit kérdezni, a mostani változatod marad */
  if(!both.length){finish(true);toast(`Közben ${who} is módosította a projektet – összefésültük a módosításaitokat és elmentettük.`);return;}
  const lbl=k=>FIELD_LABEL[k]||k;
  openModal('Közben módosult a projekt',`<p style="margin:0 0 8px"><b>${esc(who)}</b> is módosította ezt a projektet, amíg szerkesztetted. A többi módosítást összefésültük, de ezeket mindketten átírtátok:</p>
    <ul style="margin:0 0 6px 18px">${both.map(k=>`<li><b>${esc(lbl(k))}</b></li>`).join('')}</ul><p class="hint" style="margin:0">Melyik változat maradjon ezeknél?</p>`,
    {left:'<button type="button" class="btn outline" data-action="merge-theirs">Az övé</button>',cancelLabel:'Mégse',submitLabel:'Az enyém',submit:async()=>{closeModal();finish(true);}});
  MERGE_THEIRS=()=>{closeModal();finish(false);};
}
let MERGE_THEIRS=null;
function prepDraft(p){const d=clone(p);d.er_post_n=postN(d);d.x_foto_n=fotoN(d);try{if(d.status!=='atadva'&&roomOpEqFill(d))setTimeout(()=>{if(S.draft&&S.draft.id===d.id){S.dirty=true;autoSave(400);}},0);}catch(e){}if(!d.lead){const ids=[...new Set((d.crew||[]).map(a=>a.crewId))];if(ids.length===1)d.lead=ids[0];}try{syncFeesWithCrew(d);}catch(e){}return d;}
function budgetApply(saved){
  const i=S.projects.findIndex(p=>p.id===saved.id);if(i>=0)S.projects[i]=saved;
  if(S.projectId===saved.id){if(S.dirty){for(const k of ['budgetRequest','budgetMode','budgetVal','budgetFt','updatedAt'])S.draft[k]=saved[k];}else S.draft=prepDraft(saved);}render(true);
}
async function budgetDecision(id,approve){
  if(!isAdmin()||!S.draft)return;
  if(S.dirty){toast('Előbb mentsd el a módosításokat a Mentés gombbal.',true);return;}await SAVE_Q;
  try{const saved=await call('decideBudgetChange',{projectId:S.draft.id,id,approve});budgetApply(saved);toast(approve?'Termelői keret jóváhagyva':'Keretkérelem elutasítva');}catch(e){handleErr(e);}
}
async function budgetRequestModal(){
  if(!S.draft||S.me.role!=='editor')return;
  if(S.dirty){toast('Előbb mentsd el a módosításokat a Mentés gombbal.',true);return;}await SAVE_Q;
  const d=S.draft;
  openModal('Termelői keret módosítása',`<p>A javasolt keret az ügyvezető jóváhagyásával lép életbe.</p><div class="fields">${moneyField('budgetAmount','Javasolt termelői keret',budgetFt(d),{steps:false})}<div class="field full"><label for="m-budgetReason">Módosítás indoka</label><textarea class="inp" id="m-budgetReason" name="reason" maxlength="1500" rows="3"></textarea></div></div>`,{submitLabel:'Jóváhagyás kérése',submit:async fd=>{
    const amount=moneyVal(fd.get('budgetAmount')),reason=String(fd.get('reason')||'').trim();
    if(amount===''||reason.length<5){toast('Add meg az összeget és a módosítás rövid indokát.',true);return;}
    try{const saved=await call('requestBudgetChange',{projectId:d.id,baseUpdatedAt:d.updatedAt,amount,reason});closeModal();budgetApply(saved);toast('Keretmódosítás elküldve ügyvezetői jóváhagyásra');}catch(e){handleErr(e);}
  }});
}
/* Fix sorok a díjtáblázat végén: fuvar és étel. */
const FIXED_FEES=[['fuvar','Fuvar'],['etel','Étel'],['egyeb','']];   // az „egyéb” sor neve szabadon írható
/* Egyéb költségek: fuvar, étel, utánuk a szabadon elnevezhető sorok – mindig marad legalább egy üres sor a következő tételnek. */
const isOther=f=>f.kind==='fixed'&&/^egyeb/.test(f.key||'');
const otherEmpty=f=>!String(f.name||'').trim()&&!num(f.amount);
function orderFees(fees){
  fees=fees.slice();FIXED_FEES.filter(([k])=>k!=='egyeb').forEach(([k,n])=>{if(!fees.some(f=>f.kind==='fixed'&&f.key===k))fees.push({kind:'fixed',key:k,name:n,amount:'',rent:''});});
  let others=fees.filter(isOther),filled=others.filter(f=>!otherEmpty(f));
  const blank=others.find(otherEmpty)||{kind:'fixed',key:'',name:'',amount:'',rent:''};
  others=filled.concat([blank]);const used=new Set();others.forEach(f=>{if(!f.key||used.has(f.key)){let k=1;while(used.has(k===1?'egyeb':'egyeb'+k)||others.some(g=>g!==f&&g.key===(k===1?'egyeb':'egyeb'+k)))k++;f.key=k===1?'egyeb':'egyeb'+k;}used.add(f.key);});   // egyedi kulcs soronként
  return fees.filter(f=>f.kind!=='fixed').concat(fees.filter(f=>f.kind==='fixed'&&f.key==='ref'),['fuvar','etel'].map(k=>fees.find(f=>f.kind==='fixed'&&f.key===k)),others);
}
function syncFeesWithCrew(d){
  if(!canSeeFees())return;
  const ids=[...crewIds(d)],days=rowDays(d);let fees=(d.fees||[]).map(f=>Object.assign({},f)),added=0;
  const REF='Ajánlói jutalék',rolesOf=id=>{const r=[];if(d.lead===id)r.push('Projektvezető');(d.crew||[]).forEach(a=>{if(a.crewId===id&&a.role!==REF&&a.role!=='Értékesítő'&&!r.includes(a.role))r.push(a.role);});return r.join(' + ');};
  const refIds=[...new Set((d.crew||[]).filter(a=>a.role===REF).map(a=>a.crewId))];   // ajánlói jutalék → külön sor az Egyéb költségek között
  refIds.forEach(id=>{const c=crewById(id),nm=(c?c.name:'Szakember')+' ajánlói jutaléka';let f=fees.find(x=>x.kind==='fixed'&&x.key==='ref'&&x.refCrewId===id);if(f)f.name=nm;else fees.push({kind:'fixed',key:'ref',refCrewId:id,name:nm,amount:'',rent:''});});
  const onlyRef=id=>d.lead!==id&&!(d.crew||[]).some(a=>a.crewId===id&&a.role!==REF&&a.role!=='Értékesítő');   /* az értékesítő nem termelői díj: nem kerül a táblázatba (a jutaléka fent, az Értékesítés részben) */
  ids.forEach(id=>{if(onlyRef(id))return;const c=crewById(id);let f=fees.find(x=>x.crewId===id)||fees.find(x=>!x.crewId&&c&&x.name===c.name);
    if(!f){const post=isPostOnly(d,id),myDays=days>1&&!post?crewDaysOf(d,id):[];const nf={name:c?c.name:'',crewId:id,task:rolesOf(id),autoTask:true,amount:c&&num(c.dayRate)&&!post?num(c.dayRate)*(days>1?myDays.length:1):'',rent:''};
      if(days>1&&!post&&c&&num(c.dayRate)){nf.dayAmounts={};myDays.forEach(x=>nf.dayAmounts[x]=num(c.dayRate));}
      fees.push(nf);added++;}
    else{f.crewId=id;if(f.autoTask||!f.task)f.task=rolesOf(id),f.autoTask=true;}});
  if(days>1)fees.forEach(f=>{if(f.crewId&&!isPostOnly(d,f.crewId)&&!f.dayAmounts&&num(f.amount)){const ds=crewDaysOf(d,f.crewId),per=Math.floor(num(f.amount)/ds.length);f.dayAmounts={};ds.forEach((x,k)=>f.dayAmounts[x]=k===ds.length-1?num(f.amount)-per*(ds.length-1):per);}});   // több napos: a meglévő díj napokra bontva
  fees.forEach(f=>{if(f.crewId&&days>1&&!isPostOnly(d,f.crewId)&&f.dayAmounts)f.amount=feeDaySum(d,f);});
  fees=fees.filter(f=>!f.crewId||(ids.includes(f.crewId)&&!onlyRef(f.crewId))||num(f.amount)||num(f.rent));
  d.fees=orderFees(fees);
}
const rowDays=p=>{const r=pr(p);return r?diffDays(r.start,r.end)+1:1;};
/* Kézi mentés: elnavigálás előtt rákérdezünk a mentetlen módosításokra (Mentés és tovább / Elvetés / Mégse) */
function guard(fn,onCancel){
  if(!(S.dirty&&S.draft&&!ro())){fn();return;}
  const name=S.draft.name||'projekt';
  openModal('Mentetlen módosítások',`<p style="margin:0">A(z) <b>${esc(name)}</b> projekten mentetlen módosítások vannak. Elmented őket?</p>`,
    {left:'<button type="button" class="btn ghost" data-action="guard-discard">Elvetés</button>',cancelLabel:'Mégse',submitLabel:'💾 Mentés és tovább',submit:async()=>{GUARD_NEXT=null;closeModal();saveDraft();fn();}});
  GUARD_NEXT={fn,onCancel};
  const mr=$('modalRoot');const cancelBtn=mr&&mr.querySelector('[data-action="modal-cancel"],[data-action="modal-close"]');
  if(onCancel&&mr)mr.addEventListener('click',function h(e){if(e.target.closest('[data-action="modal-cancel"],[data-action="modal-close"],[data-action="modal-bg"]')&&GUARD_NEXT){const c=GUARD_NEXT.onCancel;GUARD_NEXT=null;mr.removeEventListener('click',h,true);setTimeout(c,0);}},true);
}
let GUARD_NEXT=null;
function discardDraft(){const id=S.draft&&S.draft.id,p=id&&projById(id);S.dirty=false;if(p){S.draft=prepDraft(p);S.draftBase=clone(S.draft);}else{S.projectId=null;S.draft=null;}renderChrome();}
/* Automatikus mentés: minden módosítás után rövid várakozással mentünk (gépelésnél kicsit később).
   A mentések sorban futnak (SAVE_Q), mindig a legfrissebb állapotot küldik, így a gyors kattintgatás sem veszít adatot. */
let AUTO_T=0;
function autoSave(delay){return;   // kézi mentés (Mentés gomb / Ctrl+S) – nincs automatikus mentés
  if(!S.draft||ro()||!S.dirty)return;clearTimeout(AUTO_T);AUTO_T=setTimeout(()=>{if(S.draft&&S.dirty&&!ro())saveDraft();},delay);}
function flushSave(){if(S.draft&&S.dirty&&!ro()){clearTimeout(AUTO_T);saveDraft();}}
/* Mentés azonnal a felületen (optimista), a háttérben sorban küldjük a szervernek.
   Így nem kell megvárni az Apps Scriptet; ha a mentés mégsem sikerül, visszakapod a módosításokat és szólunk. */
let SAVE_Q=Promise.resolve();
const SAVE_PENDING={};
function verifySavedFees(d,saved){
  if(!canSeeFees())return;
  const key=f=>f.kind==='fixed'?'fixed|'+f.key+'|'+(f.refCrewId||''):'crew|'+(f.crewId||f.name);
  for(const f of d.fees||[]){
    const actual=(saved.fees||[]).find(x=>key(x)===key(f));
    if(!actual&&!num(f.amount)&&!num(f.rent))continue;
    if(!actual||num(f.amount)!==num(actual.amount)||num(f.rent)!==num(actual.rent)||Object.keys(f.dayAmounts||{}).some(day=>num(f.dayAmounts[day])!==num((actual.dayAmounts||{})[day])))throw new Error('A szerver eltérő díjat igazolt vissza. A megadott összegek szerkeszthetők maradtak; frissítsd a háttérkódot, majd ments újra.');
  }
}
/* Kézi mentés (Mentés gomb, Ctrl+S): előbb a kötelező alapadatok. Az automatikus díjmentést ez nem akadályozza. */
/* Mentés előtt a éppen szerkesztett mező (amit még nem hagytál el) is bekerül: a blur kiváltja a változás-eseményt */
function commitActive(){const ae=document.activeElement;if(ae&&/^(INPUT|TEXTAREA)$/.test(ae.tagName)&&!ae.classList.contains('cmb-in'))ae.blur();}
function saveChecked(){commitActive();flushSave();}
/* Kötelező alapadatok: a hiányzó mezőkre ugrik és szól (a helyszíni munkára lépés előtt kötelező). */
function reqBlock(){
  const d=S.draft;if(!d||ro())return false;const miss=missingReq(d);if(!miss.length)return false;
  FOLD.basics=true;render(true);
  const el=reqEl(miss[0][0]);if(el){const dd=el.closest('details');if(dd)dd.open=true;el.scrollIntoView({block:'center',behavior:'smooth'});const inp=el.matches('input,select,textarea')?el:el.querySelector('input');if(inp)setTimeout(()=>inp.focus({preventScroll:true}),250);}
  toast('Előbb töltsd ki a kötelező alapadatokat: '+miss.map(x=>x[1]).join(', ')+'.',true);return true;
}
function saveDraft(){
  if(!S.draft||ro())return;
  const d=clone(S.draft);
  if(String(d.name||'').trim().length<2){toast('Add meg a projekt nevét.',true);return;}
  const i=S.projects.findIndex(x=>x.id===d.id),prev=i>=0?S.projects[i]:null;
  const local=Object.assign({},prev||{},d,{updatedAt:prev?prev.updatedAt:''});
  if(i>=0)S.projects[i]=local;else S.projects.push(local);
  S.dirty=false;S.saving=(S.saving||0)+1;SAVE_PENDING[d.id]=(SAVE_PENDING[d.id]||0)+1;
  S.cal.events={};S.savedFlash=0;render(true);
  SAVE_Q=SAVE_Q.then(async()=>{
    const payload=Object.assign({},d,{baseUpdatedAt:(projById(d.id)||{}).updatedAt||'',mutationId:uuid(),deferCal:true},finalSkipped(d)?{crewFinalSkip:true}:{});   // „saját felelősségre” kihagyott véglegesítés
    try{
      let saved;for(let k=0;;k++){try{saved=await call('saveProject',payload);break;}
        catch(e){if(k<2&&/Zárol|lock/i.test(errText(e))){toast('A szerver épp foglalt (más is ment) – újrapróbálom… ('+(k+1)+'/2)');await new Promise(r=>setTimeout(r,2000*(k+1)));continue;}throw e;}}   // foglalt szerver: pár másodperc múlva újrapróbáljuk (ugyanaz a mutationId, nem duplikál)
      normProj(saved);const current=projById(d.id);if(current)current.updatedAt=saved.updatedAt;
      verifySavedFees(d,saved);
      const newer=--SAVE_PENDING[d.id]>0;   // közben újabb mentés is indult erre a projektre
      const k=S.projects.findIndex(x=>x.id===d.id||x.id===saved.id);
      if(newer){if(k>=0)S.projects[k].updatedAt=saved.updatedAt;}
      else{if(k>=0)S.projects[k]=saved;else S.projects.push(saved);
        if(S.projectId===saved.id){S.draftBase=prepDraft(saved);if(!S.dirty){S.draft=prepDraft(saved);render(true);}}}   // a fix (üres) díjsorok is maradjanak meg
      S.cal.events={};syncCal(saved.id);projBroadcast(saved);
      S.savedFlash=1;clearTimeout(S._flashT);S._flashT=setTimeout(()=>{S.savedFlash=0;renderChrome();},1800);
    }catch(e){
      SAVE_PENDING[d.id]--;
      if(S.projectId===d.id&&!S.dirty){S.draft=clone(d);S.dirty=true;}   // a módosítások ne vesszenek el
      const m=errText(e);
      if(m.indexOf('CONFLICT')===0){setTimeout(()=>conflictMerge(d),0);
      }else{toast('Nem sikerült menteni: '+m,true);}
    }finally{S.saving--;render(true);}
  });
  return SAVE_Q;
}
function personList(p,cid){
  const c=crewById(cid);const lines=[`Eszközlista – ${p.name||'Projekt'}`,`${fmtRange(p)}${p.venue?' · '+p.venue:''}${p.startTime?' · kezdés '+p.startTime:''}`,'',((c&&c.name)||'?').toUpperCase()];
  const mine=(p.equipment||[]).filter(e=>e.crewId===cid).map(e=>({e,it:itemById(e.itemId)})).filter(x=>x.it);
  rentalsOf(p,cid).forEach(r=>lines.push(`☐ ${r.name} (${r.own?'saját':'bérelt'+(r.company?', '+r.company:'')})`));
  if(!mine.length&&!rentalsOf(p,cid).length)lines.push('(nincs nála eszköz)');
  mine.forEach(({e,it})=>lines.push(`☐ ${num(e.qty)}× ${it.name}${it.serial?' ('+it.serial+')':''}${it.location?' – '+it.location:''}`));
  return lines.join('\n');
}
function packingList(p){
  const lines=[`Pakolási lista – ${p.name||'Projekt'}`,`${fmtRange(p)}${p.venue?' · '+p.venue:''}${p.startTime?' · kezdés '+p.startTime:''}`,''];
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
  catch(e){const ta=document.createElement('textarea');ta.value=t;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand('copy');}catch(e2){}ta.remove();if(ok){toast(label||'Vágólapra másolva');return;}openModal('Másold ki',`<textarea class="inp copybox" id="copybox" readonly>${esc(t)}</textarea>`,{cancelLabel:'Bezárás'});const el=$('copybox');if(el){el.focus();el.select();}}
}
function arm(b,fn){
  if(b.dataset.armed){fn();return;}
  b.dataset.armed='1';const old=b.textContent;b.textContent='Biztosan? Kattints újra';b.classList.add('armed');
  setTimeout(()=>{if(b.isConnected){delete b.dataset.armed;b.textContent=old;b.classList.remove('armed');}},4000);
}

/* ===== Események ===== */
const ACT={
  'mail-toggle':b=>{const on=!S.mailOn;const go=async()=>{b.disabled=true;try{const r=await call('setMail',{on});S.mailOn=r.mailOn;if(r.mailCats)S.mailCats=r.mailCats;render(true);toast(on?'E-mail értesítések bekapcsolva':'E-mailek szüneteltetve – senki nem kap e-mailt');}catch(e){handleErr(e);b.disabled=false;}};
    if(on)confirmModal('E-mailek bekapcsolása','Ettől kezdve a lent bepipált értesítések kimennek (a többi típus kikapcsolva marad).','Bekapcsolás',go);else go();},
  tab:b=>guard(()=>{S.finErr='';const fp=b.dataset.focus&&S.draft&&pr(S.draft);S.cal.focus=fp||null;if(fp)S.cal.month=fp.start.slice(0,7);S.tab=b.dataset.tab;S.projectId=null;S.draft=null;closeModal();render(true);scrollTo(0,0);}),
  home:(b,e)=>{if(e)e.preventDefault();if(!S.me)return;guard(()=>{S.tab='projektek';S.projectId=null;S.draft=null;render(true);scrollTo(0,0);});},
  'open-project':b=>{const id=b.dataset.id;if(S.projectId===id){closeModal();return;}guard(()=>openProject(id));},
  'np-file-del':b=>{NP_FILES.splice(Number(b.dataset.i),1);npFilesShow();},
  'extra-file-del':b=>{if(!S.draft||!isAdmin())return;const l=(S.draft.extras||[]).map(x=>Object.assign({},x)),i=Number(b.dataset.i);if(!l[i])return;l[i].fileUrl='';l[i].fileName='';setDraft({extras:l});render(true);toast('Csatolmány levéve (a fájl a Drive-ban megmarad)');},
  'extra-add':b=>{if(!S.draft||!isAdmin())return;setDraft({extras:[...(S.draft.extras||[]),Object.assign({id:uuid().slice(0,8),name:'',amount:0},b&&b.dataset&&b.dataset.le?{kind:'le'}:b&&b.dataset&&b.dataset.tov?{kind:'tov'}:{})]});setTimeout(()=>{const l=document.querySelectorAll('[data-extra-name]');if(l.length)l[l.length-1].focus();},30);},
  'org-add':()=>{if(!S.draft||!isAdmin()||orgOf(S.draft))return;setDraft({extras:[...(S.draft.extras||[]),{id:uuid().slice(0,8),name:'',amount:10000,kind:'org',clientId:''}]});},
  'extra-del':b=>{if(!S.draft||!isAdmin())return;const l=(S.draft.extras||[]).slice();l.splice(Number(b.dataset.i),1);setDraft({extras:l});},
  back:()=>guard(()=>{S.projectId=null;S.draft=null;render(true);scrollTo(0,0);}),
  reload:()=>load(),
  pf:b=>{S.pf.status=b.dataset.v;render(true);},
  'crew-prio':b=>{S.cf.prio=b.dataset.v;render(true);},
  'cal-first':()=>{if(S.cal.mode!=='ido')return;const w=document.querySelector('.tl-wrap'),b=w&&w.querySelector('.tl-cm');if(!b)return;   // az idővonalon a kiválasztott hónap 1. napjára ugrik
    const lw=(w.querySelector('.tl-lbl')||{}).offsetWidth||0,cw=(w.scrollWidth-lw)/Number(b.dataset.n);w.scrollTo({left:Math.max(0,diffDays(b.dataset.first,S.cal.month+'-01')*cw),behavior:'smooth'});},
  'cal-mode':b=>{S.cal.mode=b.dataset.v;try{localStorage.setItem('lpm_cal_mode2',S.cal.mode);}catch(e){}render(true);},
  'crew-view':b=>{S.cf.view=b.dataset.v;try{localStorage.setItem('lumos_pm_crewview',S.cf.view);}catch(e){}render(true);},
  'new-project':()=>{if(!ro())guard(newProjectModal);},
  'np-draft':b=>npDraft(b),
  'crew-co-lookup':async b=>{const t=$('m-tax'),co=$('m-company');const v=String((t&&t.value)||'').replace(/\D/g,'');if(v.length<8){toast('Írd be az adószámot (legalább az első 8 számjegyét), és abból betöltöm a cég nevét.',true);if(t)t.focus();return;}
    b.disabled=true;try{const r=await call('lookupTaxpayer',{tax:v});if(co&&r.name)co.value=r.name;toast('Cégnév betöltve: '+(r.name||''));}catch(e){handleErr(e);}finally{b.disabled=false;}},
  'msel':b=>{const w=b.closest('.msel'),pop=w.querySelector('.msel-pop'),open=pop.hidden;document.querySelectorAll('.msel-pop').forEach(x=>{x.hidden=true;});pop.hidden=!open;w.classList.toggle('open',open);if(open){pop.scrollTop=0;const q=pop.querySelector('.msel-q');if(q){q.value='';pop.querySelectorAll('label').forEach(l=>{l.hidden=false;});const ad=pop.querySelector('.msel-add');if(ad)ad.hidden=true;setTimeout(()=>{q.focus({preventScroll:true});pop.scrollTop=0;},0);}}},
  'new-crew':()=>crewModal(S.tab==='ertekesitok'?{roles:['Értékesítő'],_new:true}:null),
  'edit-crew':b=>{const c=crewById(b.dataset.id);if(c){crewModal(c);if(b.dataset.focus)setTimeout(()=>{const x=$(b.dataset.focus);if(x)x.scrollIntoView({block:'center'});},60);}},
  'crew-doc-up':b=>{const fi=$('cdoc-file');if(fi)fi.click();},
  'crew-doc-open':async b=>{const w=window.open('about:blank','_blank');
    try{const r=await call('crewDocGet',{id:b.dataset.id});const bin=atob(r.b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
      const url=URL.createObjectURL(new Blob([u8],{type:r.mime||'application/pdf'}));
      if(w&&/pdf|image/.test(r.mime||'')){w.location.href=url;}else{if(w)w.close();const a=document.createElement('a');a.href=url;a.download=r.name||'szerzodes';document.body.appendChild(a);a.click();a.remove();}
      setTimeout(()=>URL.revokeObjectURL(url),120000);}catch(e){if(w)w.close();handleErr(e);}},
  'crew-doc-ren':b=>{const d=(S.crewDocs||[]).find(x=>x.id===b.dataset.id);if(!d)return;
    confirmLayer('Dokumentum átnevezése',`<div style="margin:0 16px"><input class="inp" id="cdoc-ren" maxlength="120" value="${esc(d.title||'')}" autocomplete="off" aria-label="Új név"></div>`,'Mentés',async()=>{const v=(($('cdoc-ren')||{}).value||'').trim();if(!v)return;
      try{const r=await call('crewDocRename',{id:d.id,title:v});S.crewDocs=r.crewDocs||[];const c=crewById(d.crewId),sec=$('cdoc');if(sec&&c)sec.outerHTML=crewDocSection(c);const l=$('modalRoot').querySelector('.cf-layer');if(l)l.remove();toast('Átnevezve');}catch(e){handleErr(e);}});
    setTimeout(()=>{const i=$('cdoc-ren');if(i){i.focus();i.select();i.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const ok=document.querySelector('.cf-layer [data-cf=ok]');if(ok)ok.click();}});}},30);},
  'crew-doc-del':b=>{const d=(S.crewDocs||[]).find(x=>x.id===b.dataset.id);if(!d)return;
    confirmLayer('Dokumentum törlése',`<p style="margin:0 16px">Biztosan törlöd: <b>${esc(d.title||'Szerződés')}</b>? A fájl a Drive kukájába kerül (30 napig visszaállítható).</p>`,'Törlés',async()=>{try{const r=await call('crewDocDelete',{id:d.id});S.crewDocs=r.crewDocs||[];const c=crewById(d.crewId),sec=$('cdoc');if(sec&&c)sec.outerHTML=crewDocSection(c);const l=$('modalRoot').querySelector('.cf-layer');if(l)l.remove();toast('Dokumentum törölve');}catch(e){handleErr(e);}});},
  'new-item':()=>itemModal(null),
  'edit-item':b=>{const i=itemById(b.dataset.id);if(i)itemModal(i);},
  'new-user':()=>userModal(null),
  'crew-docs-gmail':async b=>{if(b.disabled)return;const t0=b.textContent;b.disabled=true;b.textContent='⏳ Keresés a levelek között…';
    try{const r=await call('crewDocsImport',{dry:true});const L=r.plan||[];
      const sk=(r.skipped||[]).length?`<p class="hint" style="margin:10px 16px 0">Nem találtam aláírt szerződést: ${esc(r.skipped.join(', '))}</p>`:'';
      if(!L.length){openModal('📥 Szerződések a Gmailből',`<p style="margin:0 0 6px">Nincs új, aláírt szerződés a levelek között azoknál, akiknél még nincs feltöltve.</p>${sk}`,{cancelLabel:'Bezárás'});return;}
      openModal('📥 Szerződések a Gmailből',`<p style="margin:0 0 10px">Ezeket találtam – pipáld ki, amelyeket feltöltsek (bizalmas mappába kerülnek, csak te látod):</p>
        <div class="alist">${L.map((x,i)=>`<label class="toggle" style="display:flex;gap:10px;align-items:flex-start;margin:6px 0"><input type="checkbox" name="pick" value="${i}" checked><span class="tl"><b>${esc(x.crew)}</b> – ${esc(x.title)} <span class="muted">· ${esc(x.date.replace(/-/g,'.'))}. · ${esc(x.name)} (${x.kb} KB)${x.byCrew?' · tőle érkezett':''}</span></span></label>`).join('')}</div>${sk}`,
        {submitLabel:'Feltöltés',submit:async fd=>{const pick=fd.getAll('pick').map(Number);if(!pick.length){toast('Nincs kijelölve semmi.',true);return;}
          const ids=[...new Set(pick.map(i=>L[i].crewId))];const want=new Set(pick.map(i=>L[i].crewId+'|'+L[i].title));
          try{const r2=await call('crewDocsImport',{crewIds:ids,only:[...want]});S.crewDocs=r2.crewDocs||S.crewDocs;closeModal();render(true);toast((r2.plan||[]).length+' szerződés feltöltve');}catch(e){handleErr(e);}}});}
    catch(e){handleErr(e);}finally{b.disabled=false;b.textContent=t0;}},
  'crew-comm':async b=>{const cid=b.dataset.id;if(!S.users)await loadSettings();const u=(S.users||[]).find(x=>x.crewId===cid);if(u){userModal(u);return;}
    userModal(null);const set=(id,v)=>{const e=$(id);if(e){e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}));const ci=e.parentElement&&e.parentElement.querySelector('input.cmb-in,input');if(ci&&e.selectedOptions[0]&&ci!==e)ci.value=e.selectedOptions[0].textContent;}};set('m-crewId',cid);set('m-role','sales');},
  'toggle-user':async b=>{const dis=b.dataset.dis==='1';const u=(S.users||[]).find(x=>x.id===b.dataset.id);if(!u)return;
    const go=async()=>{try{S.users=await call('setUserDisabled',{id:u.id,disabled:dis});refreshLog();render(true);toast(dis?u.name+' letiltva – nem tud belépni':u.name+' újra beléphet');}catch(e){handleErr(e);}};
    if(dis)confirmModal('Letiltás',`${u.name} nem tud többé belépni, és minden eszközön azonnal kilép. Később újra engedélyezheted.`,'Letiltás',()=>{closeModal();go();});else go();},
  'edit-user':b=>{const u=(S.users||[]).find(x=>x.id===b.dataset.id);if(u)userModal(u);},
  'reload-log':async()=>{try{S.log=await call('getLog');render(true);}catch(e){handleErr(e);}},
  'del-crew':b=>arm(b,async()=>{try{const old=S.crew.find(c=>c.id===b.dataset.id);await call('deleteCrew',{id:b.dataset.id});if(old)entRec('crew','munkatárs törlése: '+old.name,old.id,clone(old),null);S.crew=S.crew.filter(c=>c.id!==b.dataset.id);closeModal();await load(true);toast('Munkatárs törölve');}catch(e){handleErr(e);}}),
  'del-item':b=>arm(b,async()=>{try{const old=S.inventory.find(i=>i.id===b.dataset.id);await call('deleteItem',{id:b.dataset.id});if(old)entRec('item','eszköz törlése: '+old.name,old.id,clone(old),null);S.inventory=S.inventory.filter(i=>i.id!==b.dataset.id);closeModal();await load(true);toast('Eszköz törölve');}catch(e){handleErr(e);}}),
  'del-user':b=>arm(b,async()=>{try{S.users=await call('deleteUser',{id:b.dataset.id});refreshLog();closeModal();render(true);toast('Felhasználó törölve');}catch(e){handleErr(e);}}),
  'modal-close':()=>closeModal(),
  'modal-bg':()=>{},   // mellékattintásra nem zárul be (a tartalom megmarad)
  'modal-cancel':()=>{const k=MD_KEY;MD_KEY='';mdClear(k);closeModal();},
  save:()=>saveChecked(),
  'discard':()=>{discardDraft();render(true);toast('Módosítások elvetve');},
  'tpl-clear':()=>{const q=$('m-tplQ'),h=$('m-tplId'),x=document.querySelector('.tpl-clear');if(q)q.value='';if(h)h.value='';if(x)x.hidden=true;if(q)q.focus();},
  'db-ping':async b=>{b.disabled=true;try{const r=await call('dbPing');S.dbInfo={mode:r.mode,msg:`Kapcsolat rendben · ${r.tables} tábla az adatbázisban · lekérdezés ${r.queryMs} ms`};render(true);}catch(e){handleErr(e);S.dbInfo={mode:(S.dbInfo||{}).mode||'sheet',msg:'Hiba: '+errText(e)};render(true);}},
  'db-backup':async b=>{b.disabled=true;b.textContent='Mentés…';try{const r=await call('dbBackup');S.dbInfo=Object.assign({},S.dbInfo,{msg:'Biztonsági mentés kész: '+r.at});render(true);toast('A táblázat frissítve');}catch(e){handleErr(e);b.disabled=false;}},
  'db-mode':b=>{const mode=b.dataset.mode;confirmModal(mode==='neon'?'Átköltöztetés a Neon adatbázisba':'Vissza a Google-táblázatra',mode==='neon'?'Az összes adat átkerül a Neon adatbázisba, és az app ettől kezdve onnan dolgozik. Az átköltöztetés alatt (kb. 1 perc) ne mentsen senki.':'A Neon adatbázis friss tartalma visszakerül a Google-táblázatba, és az app újra onnan dolgozik.',mode==='neon'?'Átköltöztetés':'Visszaállás',async()=>{toast('Folyamatban…');try{const r=await call('dbSetMode',{mode,migrate:mode==='neon'});S.dbInfo={mode:r.mode,msg:r.migrated?'Átköltöztetve: '+Object.entries(r.migrated.copied||{}).map(([k,v])=>k+' '+v).join(' · '):'Átkapcsolva'};render(true);toast(mode==='neon'?'Az app mostantól a Neon adatbázist használja':'Az app újra a Google-táblázatot használja');}catch(e){handleErr(e);}});},
  'merge-theirs':()=>{if(MERGE_THEIRS){const f=MERGE_THEIRS;MERGE_THEIRS=null;f();}},
  'guard-discard':()=>{const g=GUARD_NEXT;GUARD_NEXT=null;closeModal();discardDraft();if(g)g.fn();},
  'budget-request':()=>budgetRequestModal(),
  'link-add':b=>{const w=b.closest('.links-field');if(!w)return;const rows=w.querySelector('.link-rows');if(rows.querySelectorAll('input').length>=LINKS_MAX)return;
    rows.insertAdjacentHTML('beforeend',linkRowHtml(b.dataset.name,''));const ins=rows.querySelectorAll('input');ins[ins.length-1].focus();if(ins.length>=LINKS_MAX)b.hidden=true;},
  'link-del':b=>{const w=b.closest('.links-field');b.closest('.link-row').remove();if(w){const a=w.querySelector('.link-add');if(a)a.hidden=false;}},
  'pay-adj-row':b=>{S.adjNewRow=b.dataset.month;render(true);},
  'pay-adj':b=>{const cid=b.dataset.cid,m=b.dataset.month,c=crewById(cid),x=b.dataset.id?(S.payAdjust||[]).find(y=>y.id===b.dataset.id):null,v=x?num(x.amount):0;
    const noteOnly=!!x&&(S.paySent||[]).some(y=>y.crewId===cid&&String(y.month)===m);   // kiküldött díjösszesítő után a termelési vezető csak a megjegyzést írhatja át
    openModal('± Korrekció – '+(c?c.name:'')+' · '+F_YM.format(toDate(m+'-01')),`<p class="hint" style="margin:0 0 10px">Extra levonás vagy hozzáadás erre a hónapra.</p>
      <div class="fields"><div class="field"><label>Típus</label><div class="rolepick"><label><input type="radio" name="sign" value="-"${v<0?' checked':''}> − Levonás</label><label><input type="radio" name="sign" value="+"${v>=0?' checked':''}> + Hozzáadás</label></div></div>
      ${moneyField('adjAmt','Összeg (nettó)',v?Math.abs(v):'',{steps:false,ph:'pl. 20 000'})}
      <div class="field full"><label for="m-adjNote">Megjegyzés</label><input class="inp" id="m-adjNote" name="note" maxlength="300" value="${esc(x?x.note:'')}"></div>
      ${noteOnly?`<div class="field full"><p class="hint" style="margin:0">🔒 A díjösszesítő már kiment – ${isAdmin()?'az összeg már nem módosítható.':'az összeg módosítását jelezd az ügyvezetőnek.'}</p></div>`:x?'<div class="field full"><p class="hint" style="margin:0">Az összeg törléséhez írj 0-t.</p></div>':''}</div>`,
      {submitLabel:'Mentés',submit:async fd=>{const a=noteOnly?Math.abs(v):(moneyVal(fd.get('adjAmt'))||0),amount=noteOnly?v:(fd.get('sign')==='-'?-a:a),note=String(fd.get('note')||'').trim();if(a&&note.length<3){toast('Írd be röviden, miért jár a korrekció.',true);$('m-adjNote').focus();return;}
        try{S.payAdjust=await call('savePayAdjust',{id:x?x.id:'',crewId:cid,month:m,amount,note});S.adjNewRow='';closeModal();render(true);toast(amount?'Korrekció mentve':'Korrekció törölve');}catch(e){handleErr(e);}}});if(noteOnly)setTimeout(()=>{document.querySelectorAll('#mform [name=sign],#mform [name=adjAmt]').forEach(e=>{e.disabled=true;});},0);},
  'pay-mail':b=>payMailModal(b.dataset.month,b.dataset.cid||''),
  'nav-sync':async b=>{b.disabled=true;const t0=b.textContent;b.textContent=b.dataset.cid?'⏳':'⏳ NAV lekérdezés…';
    try{const one=b.dataset.cid||'',r=await call('navSync',{month:b.dataset.month,crewId:one||undefined});S.payStatus=r.payStatus||S.payStatus;render(true);
      if(one){const nm=(crewById(one)||{}).name||'';const f=r.found[0];
        toast(r.missingTax&&r.missingTax.length?`${nm}: hiányzik az adószám (Munkatársak → szerkesztés).`:f?`${nm}: ${f.number} · nettó ${ftFmt(f.net)}${f.match?' – egyezik':' – ⚠️ eltér a díjösszesítőtől ('+ftFmt(f.expected)+')'}`:`${nm}: a NAV-ban nincs ehhez a hónaphoz tartozó számlája.`,!f);return;}
      const msg=r.found.length?`NAV: ${r.found.length} számla párosítva – ${r.found.map(x=>x.name+(x.match?'':' (⚠️ eltérő összeg)')).join(', ')}`:'NAV: nincs új, párosítható számla.';
      toast(msg+(r.missingTax&&r.missingTax.length?` · Adószám hiányzik: ${r.missingTax.join(', ')}`:''),!!(r.missingTax&&r.missingTax.length));}
    catch(e){handleErr(e);b.disabled=false;b.textContent=t0;}},
  'pay-st-bulk':async b=>{const on=!!b.dataset.on,f=b.dataset.f,m=b.dataset.month,st=c=>(S.payStatus||[]).find(x=>x.crewId===c&&String(x.month)===m)||{};
    const ids=b.dataset.ids.split(',').filter(c=>c&&!!st(c)[f+'At']!==on);if(!ids.length){toast(on?'Már mindenkinél be van pipálva.':'Senkinél nincs bepipálva.');return;}
    b.disabled=true;try{S.payStatus=await call('setPayStatus',{month:m,crewIds:ids,field:f,on});render(true);toast(`${f==='paid'?'Számla fizetve':'Számlát kiállította'}: ${on?'bepipálva':'visszavonva'} – ${ids.length} fő`);}catch(e){b.disabled=false;handleErr(e);}},
  'pm-all':b=>{const on=b.dataset.on==='1';document.querySelectorAll('#modalRoot input[name=pm]:not(:disabled)').forEach(x=>{x.checked=on;});},
  'invite-prev':async()=>{const box=$('invPrev');if(!box)return;const c=crewById(($('m-crewId')||{}).value),email=(($('m-email')||{}).value||'').trim();
    box.innerHTML='<p class="hint">Előnézet betöltése…</p>';{const mb=document.querySelector('#modalRoot .mbox');if(mb)mb.classList.add('mbox-wide');}
    try{const r=await call('invitePreview',{name:c?c.name:'',email});
      box.innerHTML=`<div class="inv-prev"><div class="inv-h"><div><span>Feladó:</span> ${esc(r.from)}</div><div><span>Címzett:</span> ${esc(email||'(még nincs megadva)')}</div><div><span>Tárgy:</span> <b>${esc(r.subject)}</b></div><small class="hint">Kattints a levélbe, és írd át, ami kell – ez a változat megy ki. Ha másik munkatársat választasz, nyisd meg újra az előnézetet.</small></div></div>`;
      S._invEdit='';const f=document.createElement('iframe');f.className='mail-frame';f.style.minHeight='260px';f.title='Meghívó előnézet (szerkeszthető)';
      f.srcdoc='<!doctype html><html><head><meta charset="utf-8"><style>body{margin:14px;background:#fff}body:focus{outline:none}</style></head><body contenteditable="true" spellcheck="true">'+r.html+'</body></html>';
      const fit=()=>{try{f.style.height=ifrH(f)+'px';}catch(_){}};
      f.addEventListener('load',()=>{const d=f.contentDocument;if(!d)return;noNav(d);fit();setTimeout(fit,300);d.addEventListener('input',()=>{S._invEdit=d.body.innerHTML;fit();});});
      box.querySelector('.inv-prev').appendChild(f);}
    catch(e){box.innerHTML=`<p class="hint bad-txt">${esc(errText(e))}</p>`;}},
  'pay-mail-prev':b=>payPreview(b.dataset.month,b.dataset.cid,false),
  'pay-sent-view':async b=>{const box=$('payPrev');if(!box)return;const c=crewById(b.dataset.cid);box.innerHTML='<p class="hint">A kiküldött levél betöltése…</p>';
    try{const r=await call('paySentHtml',{month:b.dataset.month,crewId:b.dataset.cid});
      box.innerHTML=`<div class="pe-bar"><div><b>Kiküldött levél – ${esc(c?c.name:'')}</b><small>${esc('Kiküldve: '+r.sentAt+(r.sentBy?' · '+r.sentBy:'')+(r.email?' · '+r.email:''))}${r.subject?' · Tárgy: '+esc(r.subject):''}</small></div></div>`;
      if(!r.html){box.insertAdjacentHTML('beforeend','<p class="hint">Ennek a levélnek a szövegét még nem mentettük el (a funkció előtt ment ki). Az „Előnézet” a mostani adatokkal mutatja.</p>');return;}
      const f=document.createElement('iframe');f.className='mail-frame';f.title='Kiküldött díjösszesítő';f.setAttribute('sandbox','allow-same-origin');
      f.srcdoc='<!doctype html><html><head><meta charset="utf-8"><style>body{margin:16px;background:#fff}</style></head><body>'+r.html+'</body></html>';
      f.addEventListener('load',()=>{try{f.style.height=ifrH(f)+'px';}catch(_){}});box.appendChild(f);setTimeout(()=>f.scrollIntoView({block:'start',behavior:'smooth'}),50);}
    catch(e){box.innerHTML=`<p class="hint bad-txt">${esc(errText(e))}</p>`;}},
  'pay-mail-reset':b=>{const k=b.dataset.month+'|'+b.dataset.cid;if(S._payEdit)delete S._payEdit[k];payEditMark();payPreview(b.dataset.month,b.dataset.cid,true);},
  'eqdd':b=>{const wrap=b.parentElement,open=wrap.querySelector('.eqdd-pop');document.querySelectorAll('.eqdd-pop').forEach(x=>x.remove());if(open)return;
    const sel=$(b.dataset.for);if(!sel)return;const id=esc(sel.id);
    const it=o=>`<button type="button" class="eqdd-it" data-action="eqdd-pick" data-for="${id}" data-v="${esc(o.value)}"${o.disabled?' disabled':''}>${esc(o.textContent)}</button>`;
    const html=[...sel.querySelectorAll('optgroup')].map(g=>{const os=[...g.querySelectorAll('option')];if(g.label.startsWith('➕'))return `<div class="eqdd-more">${os.map(it).join('')}</div>`;
      const free=os.filter(o=>!o.disabled).length;return `<details class="eqdd-cat"><summary><span>${esc(g.label)}</span><small>${free}/${os.length} szabad</small></summary>${os.map(it).join('')}</details>`;}).join('');
    const pop=document.createElement('div');pop.className='eqdd-pop';pop.innerHTML=html||'<p class="hint">Nincs eszköz a leltárban.</p>';wrap.appendChild(pop);},
  'eqdd-pick':b=>{const sel=$(b.dataset.for);document.querySelectorAll('.eqdd-pop').forEach(x=>x.remove());if(!sel)return;sel.value=b.dataset.v;sel.dispatchEvent(new Event('change',{bubbles:true}));},
  'mnav-pick':b=>{const sel=$(b.dataset.for);if(!sel||sel.value===b.dataset.m)return;sel.value=b.dataset.m;sel.dispatchEvent(new Event('input',{bubbles:true}));if(sel.isConnected)sel.dispatchEvent(new Event('change',{bubbles:true}));},
  'mnav':b=>{const sel=$(b.dataset.for);if(!sel)return;const i=sel.selectedIndex+Number(b.dataset.d);if(i<0||i>=sel.options.length)return;sel.selectedIndex=i;sel.dispatchEvent(new Event('input',{bubbles:true}));if(sel.isConnected)sel.dispatchEvent(new Event('change',{bubbles:true}));},
  'pay-step':b=>{const sel=$('pay-month');if(!sel)return;const i=sel.selectedIndex+Number(b.dataset.d);if(i<0||i>=sel.options.length)return;setMonthAll(sel.options[i].value);render(true);},
  'budget-approve':b=>budgetDecision(b.dataset.id,true),
  'budget-reject':b=>budgetDecision(b.dataset.id,false),
  discard:()=>{histPush();const p=projById(S.projectId);S.draft=p?clone(p):null;S.dirty=false;render(true);toast('Módosítások elvetve');},
  stage:b=>{const d=S.draft;if(!d||ro())return;if(d.status==='atadva'){toast('A projekt lezárva – feloldás a 🔓 Felnyitás gombbal.',true);return;}
    {const ids=STAGES.map(s=>s.id),ci=ids.indexOf(d.status||'tervezes'),ti=ids.indexOf(b.dataset.v);if(d.status!=='lemondva'&&ti>=0&&ti<ci){toast('Egy elért lépésről nem lehet visszalépni.',true);return;}}   // csak előre
    const v=b.dataset.v,go=()=>{
      if((v==='leadva'||(v==='jovahagyas'&&!S.draft.deliveryLink))&&needsDelivery(S.draft)){deliveryModal('leadva');return;}   // a „Videók leadva” lépés megszűnt: a jóváhagyásra várás előtt kérjük a linket   // videók leadása: az Átadás ablak, utána „jóváhagyásra vár”
      if(v==='atadva'&&needsDelivery(S.draft)&&!(videoStagesOn()&&S.draft.deliveryLink)){deliveryModal();return;}   // ha a leadáskor még nem rögzítették, itt kérjük a linket
      if(v==='atadva'&&S.draft.t_kepkeveres&&!needsDelivery(S.draft)&&!/^https:\/\//i.test(S.draft.deliveryLink||'')){streamLinkModal(go);return;}   // streamnél is kell a videó linkje a lezáráshoz
      if(S.draft.status===v)return;
      setDraft({status:v,deliveredAt:v==='atadva'?(S.draft.deliveredAt||todayISO()):'',leadvaAt:['leadva','jovahagyas','atadva'].includes(v)?(S.draft.leadvaAt||(v==='atadva'?'':todayISO())):'',stepsDone:ticksUpTo(S.draft,v)});
      if(v==='atadva'){confetti();setTimeout(()=>{if(S.dirty)saveDraft();},0);}};   // „Kész”: ünneplés és azonnali mentés   // lezáráskor ünneplünk (mentés a Mentés gombbal)
    if(['helyszin',...POST_STAGES,'atadva'].includes(v)&&!d.lead){toast('Előbb jelöld ki a projektvezetőt – minden projekthez kötelező.',true);const e=$('add-crew-role');if(e){FOLD.crew=true;const dd=e.closest('details');if(dd)dd.open=true;e.value='Projektvezető';e.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(()=>{const e2=$('add-crew-role');if(e2){e2.scrollIntoView({block:'center',behavior:'smooth'});const pp=$('add-crew-person');if(pp)setTimeout(()=>pp.focus(),300);}},50);}return;}
    if(['helyszin',...POST_STAGES,'atadva'].includes(v)&&d.status!==v&&reqBlock())return;
    if(crewFinalOn()&&['helyszin',...POST_STAGES,'atadva'].includes(v)&&['egyeztetes','tervezes',''].includes(d.status||'')&&crewFinalState(d)!=='ok'&&!finalSkipped(d)){
      crewFinalPopup(d,()=>ACT.stage({dataset:{v}}));return;}
    const closing=v==='atadva'&&d.status!=='atadva'&&!needsDelivery(d);   // „Kész”: lezáró ablak díjcsökkentéssel
    if(closing||(v!=='helyszin'&&d.status!==v&&!d.siteOk&&!editOnly(d))){siteModal(go,closing);return;}   // a helyszíni beszámoló csak a Helyszíni munka kipipálásakor jön fel; a „Kész” lezárásnál a díjcsökkentés miatt   // előbb a helyszíni beszámoló
    go();},
  'site-report':()=>siteModal(null),
  'step-done':b=>{const d=S.draft;if(!d||ro()||d.status==='atadva')return;const v=b.dataset.v,set=new Set(String(d.stepsDone||'').split(',').filter(Boolean)),on=!set.has(v);
    if(!on){toast('A kipipált lépés nem vonható vissza.',true);return;}
    const ORD=['tervezes','helyszin','utomunka','jovahagyas'],ix=ORD.indexOf(v);
    const apply=()=>{const s2=new Set(String(S.draft.stepsDone||'').split(',').filter(Boolean));
      if(on)ORD.slice(0,ix+1).forEach(x=>s2.add(x));else ORD.slice(ix).forEach(x=>s2.delete(x));   // előtte lévők is kipipálódnak, utána lévők visszavonódnak
      setDraft({stepsDone:ORD.filter(x=>s2.has(x)).join(',')});
      if(on){const cur=S.draft.status||'tervezes',ids=[...document.querySelectorAll('.stages .stage[data-v]')].map(x=>x.dataset.v),i=ids.indexOf(v);   // kipipált lépés → a következő lépésre lépünk (ha még ennél tartott vagy korábban)
        const ci=ids.indexOf(cur);if(i>=0&&i+1<ids.length&&ci<=i)setTimeout(()=>ACT.stage({dataset:{v:ids[i+1]}}),0);}};
    if(on&&v==='tervezes'){if(reqBlock())return;if(crewFinalOn()&&crewFinalState(d)!=='ok'&&!finalSkipped(d)){crewFinalPopup(d,()=>ACT['step-done'](b));return;}}   // a tervezés csak kitöltött adatokkal és véglegesített stábbal zárható
    if(on&&(v==='helyszin'||v==='utomunka')&&crewFinalOn()&&!set.has('helyszin')&&crewFinalState(d)!=='ok'&&!finalSkipped(d)){crewFinalPopup(d,()=>ACT['step-done'](b));return;}   // előbb a stáb véglegesítése
    const raw=next=>()=>{const eds=rawEditors(S.draft);if(v==='helyszin'&&eds.length&&needsDelivery(S.draft)&&!S.draft.rawSentAt)rawMailModal(next);else next();};   // vágói munka: e-mail a vágónak a nyersanyagról
    if(on&&v==='helyszin'&&!d.siteOk){siteModal(raw(apply));return;}   // a helyszíni munka kipipálásakor jön a beszámoló
    if(on&&v==='helyszin'){raw(apply)();return;}
    if(on&&v==='utomunka'&&!set.has('helyszin')&&!editOnly(d)){toast('Előbb a helyszíni munkát pipáld ki – utána jöhet az utómunka.',true);return;}
    if(on&&v==='jovahagyas'&&!set.has('utomunka')){toast('Előbb az utómunkát pipáld ki.',true);return;}
    if(on&&v==='utomunka'&&needsDelivery(d)&&videoStagesOn()&&['utomunka','helyszin','tervezes'].includes(d.status||'tervezes')){deliveryModal('leadva');return;}   // egy ablak: utómunka kész + videók leadása (link, elakadás, észrevételek)
    if(on&&v==='utomunka'){postModal(apply);return;}   // az utómunka kipipálásakor: észrevételek és elakadás
    apply();},
  'goto-crew-final':()=>gotoCrewFinal(),
  'final-skip':()=>{const d=S.draft,r=S._finalRetry;if(!d)return;(S._finalSkip||(S._finalSkip={}))[d.id]=true;S._finalRetry=null;closeModal();toast('Véglegesítés kihagyva – a stáb nem kap értesítést, a díjak nem rögzülnek.',true);if(r)setTimeout(r,0);},
  'proj-rename':()=>{const d=S.draft;if(!d||ro())return;
    openModal('Projekt neve',`<div class="fields">${mf('name','Projekt neve',{full:true,v:d.name||'',max:160})}</div>`,{submitLabel:'Mentés',submit:async(fd,form)=>{
      if(!needName(form,'Add meg a projekt nevét.'))return;const n=String(fd.get('name')||'').trim();closeModal();
      if(n!==d.name){setDraft({name:n});setTimeout(()=>{if(S.dirty)saveDraft();},0);toast('Projekt neve módosítva');}}});
    setTimeout(()=>{const i=$('m-name');if(i){i.value=d.name||'';i.select();}},40);},
  'proj-manage':()=>{const p=S.draft;if(!p)return;
    openModal('Projekt kezelése',`${p.status==='atadva'?`<div class="unlock-box"><div><b>🔒 Lezárt projekt</b><small>${p.deliveredAt?'Lezárva: '+esc(fmtDay(p.deliveredAt))+'. ':''}${isAdmin()?'Felnyitás után a lépések és az adatok újra szerkeszthetők.':'Felnyitni csak az ügyvezető tudja.'}</small></div>${isAdmin()?'<button class="btn small" type="button" data-action="proj-unlock">🔓 Lezárt projekt felnyitása</button>':''}</div>`:''}<div class="fields" style="margin-bottom:14px">${mf('name','Projekt neve',{full:true,v:p.name||'',max:120})}</div><div class="btns" style="margin-bottom:10px">${p.folderId?`<a class="btn outline small" href="${esc(driveUrl(p.folderId))}" target="_blank" rel="noopener">📁 Projektmappa megnyitása ↗</a>`:`<button class="btn outline small" type="button" data-action="make-folder">📁 Projektmappa létrehozása</button>`}</div><div class="btns"><button class="btn outline small" type="button" data-action="cancel-toggle">${p.status==='lemondva'?'Visszaállítás':'Projekt lemondása'}</button><button class="btn danger small" type="button" data-action="del-project">Projekt törlése</button></div>
      ${p.updatedAt?`<p class="hint">Utoljára mentve: ${esc(p.updatedAt)}${p.updatedBy?' · '+esc(p.updatedBy):''}</p>`:''}`,{cancelLabel:'Bezárás',submitLabel:'Átnevezés',submit:async fd=>{
      const name=String(fd.get('name')||'').trim().replace(/\s+/g,' ');if(name.length<2){toast('Add meg a projekt nevét.',true);return;}
      closeModal();if(name===S.draft.name&&!S.dirty)return;setDraft({name});toast('Átnevezve – mentsd el a Mentés gombbal');}});},
  'cancel-toggle':()=>{closeModal();const d=S.draft;if(!d)return;
    if(d.status==='lemondva'){setDraft({status:d.prevStatus||'tervezes',cancelReason:''});toast('Projekt visszaállítva – mentsd el a Mentés gombbal');return;}
    openModal('Biztosan lemondod a projektet?',`<p style="margin:0 0 10px">A(z) <b>${esc(d.name||'projekt')}</b> lemondott projektként nem számít bele az ütközésekbe, a pénzügyekbe és a határidőkbe. Később visszaállítható.</p>
      <div class="fields"><div class="field full"><label for="m-cancelReason">Miért mondjuk le? <span class="muted">(kötelező)</span></label><textarea class="inp" id="m-cancelReason" name="cancelReason" rows="3" maxlength="1000" placeholder="pl. az ügyfél elhalasztotta a rendezvényt, más szolgáltatót választott, költségvetés…"></textarea></div></div>`,
      {submitLabel:'🚫 Igen, lemondom',submit:async fd=>{const r=String(fd.get('cancelReason')||'').trim();if(r.length<3){toast('Írd be a lemondás okát.',true);const t=$('m-cancelReason');if(t)t.focus();return;}
        closeModal();setDraft({status:'lemondva',prevStatus:d.status||'tervezes',cancelReason:r});setTimeout(()=>{if(S.dirty)saveDraft();},0);toast('Projekt lemondva');}});},
  'del-project':()=>{const id=S.projectId,p=S.draft||projById(id);if(!p)return;const r=pr(p),inv=((S.fin&&S.fin.invoices)||[]).filter(x=>invPids(x).includes(id)).length,n=(p.crew||[]).length;
    confirmLayer('🗑️ Projekt törlése',`<div style="padding:4px 0 6px"><p style="margin:0 0 10px">Biztosan törlöd ezt a projektet?</p><p style="margin:0 0 10px"><b>${esc(p.name||'Névtelen projekt')}</b><br><span class="muted">${r?esc(fmtRange(p)):''}${p.client?' · '+esc(p.client):''}</span></p>
      <p class="hint" style="margin:0">A projekt, a stábbeosztás${n?' ('+n+' fő)':''} és az eszközbeosztás véglegesen törlődik, a naptárbejegyzés is.${inv?` <b class="bad-txt">${inv} számla / díjbekérő tartozik hozzá – ezek a számlázz.hu-ban megmaradnak.</b>`:''} Ez nem vonható vissza.</p></div>`,'Igen, törlöm',async(btn,layer)=>{btn.disabled=true;btn.textContent='Törlés…';
      try{await SAVE_Q;await call('deleteProject',{id});S.cal.events={};S.projects=S.projects.filter(x=>x.id!==id);S.deals=(S.deals||[]).filter(d=>d.projectId!==id);layer.remove();closeModal();S.projectId=null;S.draft=null;S.dirty=false;render(true);toast('Projekt törölve');}catch(e){btn.disabled=false;btn.textContent='Igen, törlöm';handleErr(e);}});
    const ok=document.querySelector('.cf-layer [data-cf=ok]');if(ok)ok.className='btn danger';},
  'foto-step':b=>{const d=S.draft;if(!d)return;const cur=fotoDb(d),up=Number(b.dataset.d)>0;let n=up?(cur?cur+FOTO_STEP:FOTO_DEF):cur-FOTO_STEP;n=Math.max(0,Math.min(FOTO_MAX,n));setDraft({foto_db:n});},
  'rec-step':b=>{const d=S.draft;if(!d)return;const it=REC_COUNTS.concat(CAM_COUNTS,[FOTO_COUNT]).find(x=>x.k===b.dataset.k);if(!it)return;const cur=it.flag?camN(d,it.flag):num(d[it.k]),n=Math.min(it.max,Math.max(it.min,cur+Number(b.dataset.d)));const patch=stepPatch(d,it.k,n);
    if(it.flag==='er_creative'&&n<cur){const own=slotOwners(d,'er_creative');if(own.length>n){const et=clone(editTasksOf(d)),last=own[own.length-1];if(Array.isArray(et[last]))et[last]=et[last].filter(x=>x!=='f_er_creative');patch.editTasks=et;}}   // a levett kreatív kamera operatőre is lekerül
    setDraft(patch);},
  dlv:b=>{const d=S.draft;if(!d)return;const it=DELIVERABLES.find(x=>x.k===b.dataset.k);setDraft({[it.k]:Math.min(it.max,Math.max(0,num(d[it.k])+Number(b.dataset.d)))});},
  'user-tab':b=>{S.userTab=b.dataset.v;render(true);},
  'sig-edit':b=>sigModal(b.dataset.id),
  'view-reset':()=>guard(()=>switchView('admin')),
  'crew-add-focus':()=>{const e=$('add-crew-person');if(!e)return;e.scrollIntoView({block:'center',behavior:'smooth'});setTimeout(()=>{const ci=e.parentNode&&e.parentNode.querySelector('.cmb-in');if(ci)ci.focus();else{e.focus();try{e.showPicker&&e.showPicker();}catch(_){}}},350);},
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
  'op-undo':()=>opStep(-1),
  'np-multi':b=>{const f=b.closest('form')||document;const dl=f.querySelector('label[for=m-date]');if(dl)dl.textContent='Első nap';const m=f.querySelector('.np-multi'),e=f.querySelector('.np-end');if(m)m.hidden=true;if(e){e.hidden=false;const i=e.querySelector('input'),d=f.querySelector('[name=date]');if(i){if(d&&d.value)i.min=d.value;i.focus();try{i.showPicker&&i.showPicker();}catch(_){}}}},
  'np-multi-off':b=>{const f=b.closest('form')||document;const dl=f.querySelector('label[for=m-date]');if(dl)dl.textContent='Dátum';const m=f.querySelector('.np-multi'),e=f.querySelector('.np-end');if(e){e.hidden=true;const i=e.querySelector('input');if(i)i.value='';}if(m)m.hidden=false;},
  'cut-task':b=>{const d=S.draft;if(!d||ro()||projLocked())return;const y0=scrollY;requestAnimationFrame(()=>{scrollTo(0,y0);requestAnimationFrame(()=>scrollTo(0,y0));});const cid=b.dataset.cid,k=b.dataset.k,et=etWithField(d);const cur=et[cid]||[];if(cur.includes(k))et[cid]=cur.filter(x=>x!==k);else{const o=taskOwners(d,k).filter(x=>x!==cid);if(o.length){toast('Ezt a videót már '+((crewById(o[0])||{}).name||'más')+' vágja – ha másnak adnád, előbb nála vedd le.',true);return;}et[cid]=cur.concat([k]);}setDraft({editTasks:et});},   // egy videó = egy vágó: aki megkapja, attól a többinél lekerül
  'op-redo':()=>opStep(1),
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
  'crew-finalize':()=>crewFinalizeModal(),
  'goto-post':()=>{const d=document.querySelector('details.svc-edit');if(d)d.open=true;setTimeout(()=>{const h=[...document.querySelectorAll('.content h4.sub-h')].find(x=>/Utómunka/.test(x.textContent))||d;if(h){h.scrollIntoView({behavior:'smooth',block:'center'});const sec=h.closest('section');if(sec){sec.classList.add('flash');setTimeout(()=>sec.classList.remove('flash'),1600);}}},50);},
  'make-lead':b=>{const d=S.draft;if(!d||ro()||projLocked())return;const id=b.dataset.id,c=crewById(id),old=d.lead&&crewById(d.lead);
    const go=()=>{setDraft({lead:id});toast((c?c.name:'')+' lett a projektvezető');};
    if(old&&old.id!==id)confirmModal('Projektvezető cseréje',`${old.name} helyett ${c?c.name:''} legyen a projektvezető?`,'Igen, csere',async()=>go());else go();},
  'crew-edit':()=>{const d=S.draft;if(!d||crewPast(d))return;const n=(d.crewFinal&&d.crewFinal.ids||[]).length;
    openModal('⚠️ Biztosan módosítod a véglegesített csapatot?',`<div class="cf-gear" style="border-color:#e8a29b;background:#fdecec;color:#8e1a1a"><b style="display:block">A csapat már véglegesítve van, ${n} fő értesítést kapott a beosztásáról.</b><small>Utólagos módosításnál a stábnak újra e-mailt kell kapnia, a naptárbejegyzés is változik – ez zavart okozhat, és rontja a tervezés megbízhatóságát. Csak akkor módosíts, ha elkerülhetetlen.</small></div><p class="hint" style="margin:10px 0 0">A módosítás oka bekerül a naplóba.</p><div class="field" style="margin-top:8px"><label for="m-ceWhy">Miért kell módosítani?</label><input class="inp" id="m-ceWhy" name="ceWhy" maxlength="200" placeholder="pl. lebetegedett az operatőr, az ügyfél bővítette a programot"></div>`,
      {submitLabel:'Igen, módosítom',cancelLabel:'Mégse',submit:async fd=>{const why=String(fd.get('ceWhy')||'').trim();if(why.length<3){toast('Írd be röviden, miért kell módosítani.',true);$('m-ceWhy').focus();return;}
        closeModal();(S.crewEdit=S.crewEdit||{})[d.id]=true;try{await call('logNote',{action:'Véglegesített csapat módosítása',subject:d.name||'',details:why});}catch(_){}render(true);}});
    const sb=document.querySelector('#mform .mfoot button[type=submit]');if(sb)sb.className='btn alarm';},
  'eq-edit':()=>{if(!S.draft)return;(S.eqEdit=S.eqEdit||{})[S.draft.id]=true;render(true);},
  'eq-finalize':async()=>{const d=S.draft;if(!d)return;if(!(d.equipment||[]).length&&!(d.rentals||[]).length){toast('Nincs még eszköz hozzárendelve – nincs mit véglegesíteni.',true);return;}flushSave();await SAVE_Q;if(S.dirty){toast('Előbb mentődjenek el a módosítások, aztán próbáld újra.',true);return;}
    const p=projById(d.id)||d,list=(p.equipment||[]).map(e=>{const it=itemById(e.itemId);return `<li><b>${esc(it?it.name:'Törölt eszköz')}</b>${num(e.qty)>1?' ×'+num(e.qty):''} <span class="muted">· ${esc(e.crewId?((crewById(e.crewId)||{}).name||''):'közös')}</span></li>`;}).join('');
    confirmLayer('🎒 Eszközök véglegesítése',`<p style="margin:0 0 8px">${list?'Ezek az eszközök mennek a projektre:':'Még nincs eszköz hozzárendelve – így is véglegesíted?'}</p>${list?`<ul class="cf-list">${list}</ul>`:''}<div id="eqMailBox" style="margin-top:10px">${searchingHtml('Kimenő eszközlisták betöltése')}</div><p class="hint" style="margin:8px 0 0">Véglegesítés után az eszközök zárolva lesznek; az „Eszközök módosítása” gombbal bármikor újra szerkeszthetők.</p>`,'Véglegesítés',async(btn,layer)=>{
      try{const r=await call('finalizeEquipment',{projectId:d.id,sendList:true});const sp=r.project,i=S.projects.findIndex(x=>x.id===sp.id);if(i>=0)S.projects[i]=sp;S.draft=prepDraft(sp);S.draftBase=clone(S.draft);S.dirty=false;if(S.eqEdit)delete S.eqEdit[sp.id];if(layer)layer.remove();render(true);const ml=r.mail;toast(ml&&ml.error?'Eszközök véglegesítve, de az eszközlista nem ment ki: '+ml.error:'Eszközök véglegesítve'+(ml&&ml.names&&ml.names.length?' – eszközlista kiküldve: '+ml.names.join(', '):''),!!(ml&&ml.error));}catch(e){handleErr(e);}});eqPreviewLoad(d.id);},
  'cal-nav':b=>{const d=Number(b.dataset.d);if(!d){S.cal.month=todayISO().slice(0,7);S.cal.sel=todayISO();S.cal.tlPos=null;}else{const [y,m]=S.cal.month.split('-').map(Number);const n=new Date(Date.UTC(y,m-1+d,1));S.cal.month=n.toISOString().slice(0,7);}render(true);},
  'cal-retry':()=>{delete S.cal.err[S.cal.month];delete S.cal.events[S.cal.month];render(true);},
  'cal-event':b=>calEventModal(b.dataset.id),
  'cal-vevent':b=>{let ev=null;Object.values(S.cal.ev2||{}).forEach(l=>(l||[]).forEach(x=>{if(x.id===b.dataset.id)ev=x;}));if(!ev)return;
    const mp=vagoiProjects(ev);if(mp.open){ACT['open-project']({dataset:{id:mp.open.id}});return;}   // a vágói bejegyzés a projektjére visz
    const sug=mp.list.length?`<p class="muted" style="margin:10px 0 6px">Kapcsolódó projekt:</p>${mp.list.map(p=>`<button type="button" class="btn outline small" style="margin:0 6px 6px 0" data-action="open-project" data-id="${esc(p.id)}">${esc(p.name)}</button>`).join('')}`:'';
    openModal('✂️ '+(ev.title||'(nincs cím)'),`<div class="kv">${[['Naptár','Vágói Naptár Lumos Motion'],['Időpont',fmtShort(ev.date)+(ev.endDate&&ev.endDate!==ev.date?' – '+fmtShort(ev.endDate):'')+(ev.start?', '+ev.start+(ev.end?'–'+ev.end:''):'')],['Helyszín',ev.location],['Leírás',ev.description]].filter(x=>x[1]).map(([k,v])=>`<p style="margin:0 0 8px"><span class="muted">${esc(k)}:</span> ${esc(v).replace(/\n/g,'<br>')}</p>`).join('')}${sug}</div>`,{cancelLabel:'Bezárás'});},
  'cal-day':b=>{const d=b.dataset.d,its=calItems(S.cal.month).filter(it=>it.date<=d&&it.endDate>=d);openModal(F_FULL.format(toDate(d)),`<div class="cal-daylist">${its.map(it=>calChip(it,d)).join('')}</div>`,{cancelLabel:'Bezárás'});},
  'cal-import':b=>importCalEvent(b.dataset.id),
  'cal-new':b=>{if(!ro())guard(()=>newProjectModal(b.dataset.d||(S.cal.month===todayISO().slice(0,7)?todayISO():S.cal.month+'-01')));},
  'cal-edit':b=>{const e=calEventById(b.dataset.id);if(e)calFormModal(e);},
  'cal-del':b=>arm(b,async()=>{try{await call('deleteCalEvent',{id:b.dataset.id});S.cal.events={};closeModal();render(true);toast('Bejegyzés törölve');}catch(e){handleErr(e);}}),
  'money-step':b=>{const el=$(b.dataset.for);if(!el)return;const cur=Number(moneyVal(el.value)||0);const n=Math.max(0,Math.min(MONEY_MAX,(Math.round(cur/MONEY_STEP)+Number(b.dataset.d))*MONEY_STEP));el.value=moneyFmt(n);el.focus();},
  'copy-pack':()=>{if(S.draft)copyText(packingList(S.draft),'Pakolási lista a vágólapon');},
  'make-folder':async b=>{const d=S.draft;if(!d)return;b.disabled=true;b.textContent='Mappa létrehozása…';
    try{const r=await call('createProjectFolder',{id:d.id});const p=projById(d.id);if(p)p.folderId=r.folderId;d.folderId=r.folderId;render(true);if($('modalRoot').innerHTML)ACT['proj-manage']();toast(r.existed?'A mappa már létezett':'Projektmappa létrehozva');}
    catch(e){handleErr(e);b.disabled=false;b.textContent='📁 Projektmappa létrehozása';}},
  copy:b=>{copyText(b.dataset.text);b.classList.add('copied');clearTimeout(b._ct);b._ct=setTimeout(()=>b.classList.remove('copied'),1400);},
  'tax-lookup':()=>taxLookup(),
  'pen-new':b=>penModal(b.dataset.cid),
  'proj-unlock':()=>{const d=S.draft;if(!d||!isAdmin())return;closeModal();setDraft({status:needsDelivery(d)?'utomunka':'helyszin',deliveredAt:''});toast('Projekt felnyitva – a lépések újra módosíthatók');},
  'crew-day':b=>{const d=S.draft;if(!d)return;const cid=b.dataset.cid,day=b.dataset.d,all=projDays(d);let cur=crewDaysOf(d,cid).slice();
    if(cur.includes(day)){if(cur.length===1){toast('Legalább egy napot hagyj meg (vagy vedd le a projektről).',true);return;}cur=cur.filter(x=>x!==day);}else cur.push(day);
    const cd=Object.assign({},d.crewDays||{});if(cur.length===all.length)delete cd[cid];else cd[cid]=all.filter(x=>cur.includes(x));
    const fees=(d.fees||[]).map(f=>{if(f.crewId!==cid||!f.dayAmounts)return f;const g=Object.assign({},f);g.amount=cur.reduce((s,x)=>s+num(g.dayAmounts[x]),0);return g;});
    setDraft({crewDays:cd,fees});},
  'fee-move':b=>{const d=S.draft;if(!d)return;const i=Number(b.dataset.i),st=Number(b.dataset.d),f=(d.fees||[]).slice(),grp=x=>feePost(d,x.crewId);
    let j=i+st;while(j>=0&&j<f.length&&f[j].kind!=='fixed'&&grp(f[j])!==grp(f[i]))j+=st;   // ugyanabban a táblázatban lévő szomszéddal cserél
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
  'tl-wait-toggle':()=>{let o=true;try{o=localStorage.getItem('lpm_tl_wait')!=='0';localStorage.setItem('lpm_tl_wait',o?'0':'1');}catch(e){}const w=document.querySelector('.tl-wrap');if(w&&S.cal.tlPos)S.cal.tlPos.x=w.scrollLeft;render(true);},
  'ph-copy':async b=>{const row=b.closest('.phone-row');if(!row)return;const n=row.querySelector('.ph-num').value.trim();if(!n){toast('Nincs telefonszám.',true);return;}const v=phJoin(row.querySelector('.ph-cc').dataset.cc||'+36',n);   // a mező közben szerkeszthető marad
    try{await navigator.clipboard.writeText(v);}catch(e){const t=document.createElement('textarea');t.value=v;document.body.appendChild(t);t.select();try{document.execCommand('copy');}catch(x){}t.remove();}b.textContent='✓';b.classList.add('ok');setTimeout(()=>{b.textContent='⧉';b.classList.remove('ok');},1400);toast('Kimásolva: '+v);},
  'edit-client':b=>{const c=knownClients('').find(x=>x.company===b.dataset.name);if(!c)return;newClientModal(null,{id:c.id,client:c.company,clientTax:c.tax,clientAddress:c.address,contactName:c.name,contactPhone:c.phone,contactEmail:c.email,rep:c.rep,repPhone:c.repPhone,repEmail:c.repEmail,repTitle:c.repTitle,contactTitle:c.contactTitle},true);},
  'del-client':b=>arm(b,async()=>{try{const old=(S.clients||[]).find(c=>c.id===b.dataset.id);await call('deleteClient',{id:b.dataset.id});if(old)entRec('client','ügyfél törlése: '+old.name,old.id,clone(old),null);S.clients=(S.clients||[]).filter(x=>x.id!==b.dataset.id);closeModal();render(true);toast('Ügyfél törölve a nyilvántartásból');}catch(e){handleErr(e);}}),
  'hs-open':()=>hubspotModal(),
  'hs-inline':()=>{const b=$('hsInline');if(!b)return;b.style.display='';hsInline();},
  'hs-ipick':b=>{const it=(S._hsi||[])[Number(b.dataset.i)];if(!it)return;const set=(id,v)=>{const e=$(id);if(e)e.value=v||'';};
    set('m-contactName',it.name);set('m-contactEmail',it.email);if(it.title)set('m-contactTitle',it.title);
    const row=document.querySelector('#modalRoot .phone-row');if(row&&it.phone){const p=phParse(it.phone);row.querySelector('.ph-cc').dataset.cc=p.cc;row.querySelector('.ph-num').value=phJoin(p.cc,p.n).replace(p.cc+' ','');phSync(row,false);}
    if(!$('m-client').value&&it.company)set('m-client',it.company);
    $('hsInline').style.display='none';repCopy();toast('Kapcsolattartó kitöltve a HubSpotból');},
  'hs-rpick':b=>{const it=(S._hsr||[])[Number(b.dataset.i)];if(!it)return;const set=(id,v)=>{const e=$(id);if(e)e.value=v||'';};set('m-rep',it.name);set('m-repEmail',it.email);set('m-repTitle',it.title);
    const row=document.querySelector('.phone-row[data-ph="n:repPhone"]');if(row){const p=phParse(it.phone||'');row.querySelector('.ph-cc').dataset.cc=p.cc;row.querySelector('.ph-num').value=it.phone?phJoin(p.cc,p.n).replace(p.cc+' ',''):'';phSync(row,false);}
    const box=$('hsRep');if(box)box.innerHTML='';toast('Képviselő kitöltve a HubSpotból');},
  'hs-pick':b=>{const it=(S._hs||[])[Number(b.dataset.i)];if(!it||!S.draft)return;closeModal();setDraft({contactName:it.name,contactPhone:it.phone?phJoin(phParse(it.phone).cc,phParse(it.phone).n):'',contactEmail:it.email});toast('Kapcsolattartó kitöltve a HubSpotból');},
  'nav-search':()=>{const n=$('m-client'),q=n?n.value.trim():'';if(q){try{navigator.clipboard.writeText(q);}catch(e){}}
    window.open('https://nav.gov.hu/adatbazisok/multilekerdezo','_blank','noopener');
    toast(q?'A NAV keresője új lapon nyílt meg, a cégnév a vágólapon van – illeszd be, majd másold vissza az adószámot.':'A NAV keresője új lapon nyílt meg – keresd meg a céget, és másold vissza az adószámot.');const t=$('m-clientTax');if(t)t.focus();},
  'client-edit':()=>editClientModal(),
};
document.addEventListener('click',e=>{if(!e.target.closest('.eqdd'))document.querySelectorAll('.eqdd-pop').forEach(x=>x.remove());});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('.eqdd-pop')){document.querySelectorAll('.eqdd-pop').forEach(x=>x.remove());e.stopPropagation();}},true);
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b||b.disabled||b.dataset.working)return;if(b.tagName==='TR'){const t=e.target.closest('a,input,label,select,textarea,button,[data-cldrop],.cl-drop,.cl-ctr');if(t&&b.contains(t)&&t!==b)return;const sel=window.getSelection&&String(window.getSelection());if(sel&&sel.trim())return;}const fn=ACT[b.dataset.action];if(fn&&b.tagName==='A'&&b.getAttribute('href'))e.preventDefault();if(fn){window._lastAct={a:b.dataset.action,d:Object.assign({},b.dataset),t:Date.now()};const r=fn(b,e);if(r&&typeof r.then==='function')workBtn(b,r);}});
/* Folyamatban lévő művelet: ha egy gomb mögötti munka nem azonnali, a gomb forog („…”), és fent egy „Dolgozom…” jelzés is látszik */
let WORK_N=0,WORK_T=0;
function workPill(){let w=$('workPill');if(!w){w=document.createElement('div');w.id='workPill';w.className='work-pill';w.setAttribute('role','status');w.setAttribute('aria-live','polite');w.innerHTML='<i></i>Dolgozom…';document.body.appendChild(w);}return w;}
function workTrack(pr){WORK_N++;clearTimeout(WORK_T);WORK_T=setTimeout(()=>{if(WORK_N>0)workPill().classList.add('on');},250);
  const done=()=>{WORK_N=Math.max(0,WORK_N-1);if(!WORK_N){clearTimeout(WORK_T);const w=$('workPill');if(w)w.classList.remove('on');}};Promise.resolve(pr).then(done,done);return pr;}
function workBtn(b,pr){b.dataset.working='1';let marked=false,txt='';
  const t=setTimeout(()=>{if(!b.isConnected||b.disabled)return;marked=true;txt=b.textContent;if(txt.trim().length>2&&!/…\s*$/.test(txt)){b.textContent=txt.replace(/\s+$/,'')+'…';}b.dataset.busy='1';b.classList.add('is-busy');b.setAttribute('aria-busy','true');},120);
  workTrack(pr);const done=()=>{clearTimeout(t);delete b.dataset.working;if(marked&&b.isConnected){delete b.dataset.busy;if(b.textContent===txt.replace(/\s+$/,'')+'…')b.textContent=txt;b.classList.remove('is-busy');b.removeAttribute('aria-busy');}};Promise.resolve(pr).then(done,done);}   // linkként megjelenő gomb (fülek): sima kattintásra az app kezeli, jobb klikkre / új lapra a böngésző
function fieldValue(t){
  const k=t.dataset.field;
  if(t.type==='number'){if(t.value==='')return k==='hours'?8:null;const n=Math.round(num(t.value));return k==='hours'?Math.min(16,Math.max(1,n)):Math.max(0,n);}
  return t.value;
}
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.dataset.crewNote!==undefined&&S.draft&&!ro()){histTyping('note|'+t.dataset.crewNote);const n=Object.assign({},S.draft.crewNotes||{});if(t.value.trim())n[t.dataset.crewNote]=t.value;else delete n[t.dataset.crewNote];S.draft.crewNotes=n;if(!S.dirty){S.dirty=true;renderChrome();}return;}
  if((t.dataset.extraName!==undefined||t.dataset.extraAmt!==undefined)&&S.draft&&isAdmin()){const l=S.draft.extras=(S.draft.extras||[]).map(x=>Object.assign({},x)),k=Number(t.dataset.extraName??t.dataset.extraAmt);if(l[k]){if(t.dataset.extraName!==undefined)l[k].name=t.value;else l[k].amount=moneyVal(t.value)||0;}
    if(!S.dirty){S.dirty=true;renderChrome();}const et=$('ex-total');if(et)et.innerHTML=exTotTxt(S.draft);refreshFinSums(S.draft);return;}
  if(S.draft&&!ro()&&(t.dataset.field!==undefined||t.dataset.feeI!==undefined||t.dataset.fin))histTyping((t.dataset.field||'')+'|'+(t.dataset.feeI||'')+'|'+(t.dataset.feeK||'')+'|'+(t.dataset.fin||''));
  if(t.dataset.field!==undefined&&S.draft&&!ro()&&t.tagName!=='SELECT'){S.draft[t.dataset.field]=t.type==='number'?(t.value===''?null:num(t.value)):t.value;if(!S.dirty){S.dirty=true;renderChrome();}return;}
  if((t.dataset.feeI!==undefined||t.dataset.fin)&&S.draft&&!ro()){
    const val=prodBase(S.draft);   /* hatékonyság / keret: a szervezői jutalék (és a továbbszámlázott) utáni összegből */
    if(t.dataset.fin==='budgetPct'){let v=String(t.value).replace(/[^\d,.]/g,'').replace('.',',');if(t.value!==v)t.value=v;const n=parseFloat(v.replace(',','.'));
      S.draft.budgetMode=v===''?'':'pct';S.draft.budgetVal=v===''||!isFinite(n)?'':Math.min(100,n);const o=$('f-budgetFt');if(o)o.value=S.draft.budgetVal!==''&&val>0?moneyFmt(Math.round(val*S.draft.budgetVal/100)):'';}
    else if(t.dataset.fin==='budgetFt'){const dg=String(t.value).replace(/\D/g,'');S.draft.budgetMode=dg===''?'':'ft';S.draft.budgetVal=dg===''?'':Math.min(9999999999,Number(dg));const o=$('f-budgetPct');if(o)o.value=dg!==''&&val>0?String(Math.round(S.draft.budgetVal/val*1000)/10).replace('.',','):'';}
    else if(t.dataset.fin==='projectValue'){const dg=String(t.value).replace(/\D/g,'');S.draft.projectValue=dg===''||Number(dg)===0?null:Math.min(9999999999,Number(dg));const nv=prodBase(S.draft);   // 0 Ft helyett a „Nem fizetős” pipa

      if(S.draft.budgetMode==='pct'){const o=$('f-budgetFt');if(o)o.value=nv>0&&S.draft.budgetVal!==''?moneyFmt(Math.round(nv*S.draft.budgetVal/100)):'';}else if(S.draft.budgetMode==='ft'){const o=$('f-budgetPct');if(o)o.value=nv>0?String(Math.round(num(S.draft.budgetVal)/nv*1000)/10).replace('.',','):'';}}

    else{const fees=S.draft.fees=(S.draft.fees||[]).map(x=>Object.assign({},x)),f=fees[Number(t.dataset.feeI)];if(f){const k=t.dataset.feeK;
      if(k.startsWith('day:')){f.dayAmounts=Object.assign({},f.dayAmounts||{});const v=moneyVal(t.value);if(v==='')delete f.dayAmounts[k.slice(4)];else f.dayAmounts[k.slice(4)]=v;f.amount=feeDaySum(S.draft,f);}
      else if(k==='onsite'){f.amount=num(moneyVal(t.value))+postAmt(f);}
      else if(k==='post'){const old=postAmt(f);f.post=moneyVal(t.value);f.amount=f.dayAmounts&&projDays(S.draft).length?feeDaySum(S.draft,f):Math.max(0,num(f.amount)-old)+postAmt(f);}
      else if(k==='amount'||k==='rent')f[k]=moneyVal(t.value);else{f[k]=t.value;if(k==='name'){const c=S.crew.find(x=>x.name===t.value.trim());f.crewId=c?c.id:'';}}}}
    if(!S.dirty){S.dirty=true;renderChrome();}
    refreshFinSums(S.draft);
    const fa=document.querySelector('.fin-aside');if(fa)fa.innerHTML=finAside(S.draft);
    {const kr=document.querySelectorAll('.keret-tr');if(kr.length===2){const tmp=document.createElement('tbody');tmp.innerHTML=keretRows(S.draft);kr[0].replaceWith(tmp.children[0]);kr[1].replaceWith(tmp.children[0]);}}
    const fsum=k=>(S.draft.fees||[]).reduce((s,f)=>s+num(f[k]),0),ea=document.querySelector('.fin-amt'),er=document.querySelector('.fin-rent');
    if(ea)ea.innerHTML=totalCell(S.draft);if(er)er.textContent=moneyFmt((S.draft.fees||[]).reduce((a,f)=>a+rentOf(S.draft,f),0)+rentalSum(S.draft,''))||0;
  }
  if(t.dataset.money==='big'){const pos=t.value.length-t.selectionStart;const d=String(t.value).replace(/\D/g,'');t.value=d===''?'':moneyFmt(Math.min(9999999999,Number(d)));try{const p=Math.max(0,t.value.length-pos);t.setSelectionRange(p,p);}catch(e){}return;}
  if(t.dataset.money){const pos=t.value.length-t.selectionStart;const v=moneyVal(t.value),neg=t.name==='it_price'&&/^\s*[-−]/.test(t.value);t.value=(neg?'-':'')+(neg&&v===''?'':moneyFmt(v));try{const p=Math.max(0,t.value.length-pos);t.setSelectionRange(p,p);}catch(e){}return;}
  if(t.id==='q-projects'){S.pf.q=t.value;render(true);}
  else if(t.id==='q-crew'){S.cf.q=t.value;render(true);}
  else if(t.id==='q-inv'){S.inf.q=t.value;render(true);}
  else if(t.id==='q-cl'){S.clf.q=t.value;render(true);}
  else if(t.id==='pay-month'){setMonthAll(t.value);render(true);}
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
  if(t.id==='log-user'){S.logTab=t.value;render(true);return;}
  if(t.dataset.clientSel&&d){if(t.value==='__new'){t.value=d.client||'';newClientModal();return;}
    const it=knownClients('').find(c=>c.company===t.value),patch={client:t.value,clientTax:it?it.tax:'',clientAddress:it?it.address:''};if(it&&(it.name||it.phone||it.email)){patch.contactName=it.name;patch.contactPhone=it.phone;patch.contactEmail=it.email;}setDraft(patch);return;}
  if(t.id==='m-clientSel'){const n=$('m-clientNew');if(n){const on=t.value==='__new';n.style.display=on?'':'none';if(on)$('m-clientTax').focus();}
    const it=knownClients('').find(c=>c.company===t.value),set=(id,v)=>{const e2=$(id);if(e2&&!e2.value&&v)e2.value=v;};
    if(it){set('m-contactName',it.name);set('m-contactEmail',it.email);const ph=$('m-contactPhone');if(ph&&!ph.value&&it.phone){const pr2=phParse(it.phone);ph.value=pr2.n;const hid=document.querySelector('input[type=hidden][name=contactPhone]');if(hid)hid.value=phJoin(pr2.cc,pr2.n);}}
    return;}
  if(t.dataset.field!==undefined&&d){const fv=fieldValue(t);if(t.tagName!=='SELECT'&&String(d[t.dataset.field]??'')===String(fv??'')&&!['date','endDate','client'].includes(t.dataset.field)){renderChrome();return;}setDraft(Object.assign({[t.dataset.field]:fv},t.dataset.field==='eventType'&&fv==='Videóvágás'?{endDate:''}:{}));return;}   // gépelt szövegnél már a draftban van – ne rajzoljuk újra (különben elveszhet a következő kattintás)
  if(t.dataset.flag&&d){const k=t.dataset.flag,ch={[k]:t.checked};
    if(t.checked&&(REC_CAMS.some(c=>c.k===k)||REC_LIVE.some(c=>c.k===k))&&!num(d.er_rooms))ch.er_rooms=1;   // rögzítési opció → legalább 1 terem
    if(k==='x_vago'){Object.assign(ch,onsiteCutCh(d,t.checked));}
    setDraft(ch);return;}
  if(t.dataset.leadRemote&&d){setDraft({leadRemote:t.checked});return;}
  if(t.dataset.editOnsite&&d){const cid=t.dataset.editOnsite,K='f_x_vago',et=etWithField(d);   // csak ennek a vágónak a jelölője
    if(!fieldOwners(d,'x_vago').length&&d.editOnsite)cutterIds(d).forEach(id=>{if(id!==cid&&(d.crew||[]).some(a=>a.crewId===id&&a.role==='Vágó'))et[id]=(et[id]||[]).concat([K]);});   // régi (projekt szintű) jelölés → a többiek megtartják
    et[cid]=(et[cid]||[]).filter(x=>x!==K);if(t.checked)et[cid].push(K);if(!et[cid].length)delete et[cid];
    const any=Object.keys(et).some(id=>(et[id]||[]).includes(K));setDraft({editTasks:et,x_vago:any,editOnsite:any});return;}
  if(t.dataset.free&&d&&isAdmin()){setDraft({projectValue:t.checked?0:null});if(!t.checked)setTimeout(()=>{const e=$('f-projectValue');if(e)e.focus();},0);return;}
  if(t.dataset.multi&&d){if(t.checked){d._multi=true;setDraft({endDate:d.endDate||(validISO(d.date)?addDays(d.date,1):'')});setTimeout(()=>{const e=$('f-endDate');if(e)e.focus();},0);}else{d._multi=false;setDraft({endDate:''});}return;}
  if((t.dataset.feeI!==undefined||t.dataset.fin)&&d){if(t.dataset.feeI!==undefined){const f=(d.fees||[])[Number(t.dataset.feeI)];if(f&&isOther(f)&&!(d.fees||[]).some(g=>isOther(g)&&otherEmpty(g))){d.fees=orderFees(d.fees);setTimeout(()=>render(true),0);}}   // kitöltött egyéb sor után új üres sor
    return;}
  if(t.dataset.stepK&&d){const k=t.dataset.stepK,min=num(t.dataset.min),max=num(t.dataset.max);let n=parseInt(String(t.value).replace(/\D/g,''),10);if(!isFinite(n))n=min;n=Math.max(min,Math.min(max,n));
    setDraft(k==='foto_db'?{foto_db:n}:stepPatch(d,k,n));return;}
  if(t.dataset.crewAddrole!==undefined&&d){if(!t.value)return;if(t.value==='Projektvezető'){setDraft({lead:t.dataset.crewAddrole});return;}const crew=clone(d.crew||[]);if(!crew.some(a=>a.crewId===t.dataset.crewAddrole&&a.role===t.value))crew.push({crewId:t.dataset.crewAddrole,role:t.value});setDraft({crew});return;}
  if(t.dataset.crewRole!==undefined&&d){const crew=clone(d.crew||[]);crew[Number(t.dataset.crewRole)].role=t.value;setDraft({crew});return;}
  if(t.dataset.eqI!==undefined&&d){const q=Math.max(1,Math.round(num(t.value)||1));const equipment=clone(d.equipment||[]);const ex=equipment[Number(t.dataset.eqI)];if(ex){ex.qty=q;setDraft({equipment});}return;}
  if(t.id==='add-crew-role'){S.addCrew.role=t.value;render(true);setTimeout(()=>{const e=$('add-crew-person'),ci=e&&e.parentNode&&e.parentNode.querySelector('.cmb-in');if(ci)ci.focus();else if(e)e.focus();},60);return;}
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
  if(t.dataset.eqAuto!==undefined&&d&&t.value==='__new'){const key=t.dataset.eqAuto;t.value='';itemModal(null,saved=>{if(!S.draft)return;const equipment=clone(S.draft.equipment||[]);equipment.push({itemId:saved.id,qty:1,crewId:key});setDraft({equipment});toast('Felvéve a leltárba és hozzárendelve: '+saved.name);});return;}
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
    if((k==='z'&&e.shiftKey)||k==='y'){e.preventDefault();histStep(1);return;}}
  else if((e.ctrlKey||e.metaKey)&&!e.altKey&&!(S.draft&&S.projectId&&S.tab==='projektek')&&!$('modalRoot').innerHTML&&!(e.target&&(e.target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)))&&!ro()){const k=e.key.toLowerCase();
    if(k==='z'&&!e.shiftKey){e.preventDefault();opStep(-1);return;}
    if((k==='z'&&e.shiftKey)||k==='y'){e.preventDefault();opStep(1);return;}}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'&&S.draft&&!ro()){e.preventDefault();commitActive();if(S.dirty)saveChecked();else toast('Nincs mentetlen módosítás');}});

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
  const h=calTipHtml(el);let t=$('calTip');if(!h){if(t)t.remove();return;}
  if(!t){t=document.createElement('div');t.id='calTip';t.className='cal-tip';document.body.appendChild(t);}t.innerHTML=h;
  const r=el.getBoundingClientRect(),w=Math.min(300,innerWidth-16);t.style.width=w+'px';let x=r.left+scrollX;if(x+w>scrollX+innerWidth-8)x=scrollX+innerWidth-8-w;
  t.style.left=x+'px';t.style.top=(r.bottom+scrollY+6)+'px';});
document.addEventListener('mouseout',e=>{const el=e.target.closest&&e.target.closest('.cal-chip');if(el&&!el.contains(e.relatedTarget)){el._tip=false;const t=$('calTip');if(t)t.remove();}});
document.addEventListener('contextmenu',e=>{const el=e.target.closest&&e.target.closest('.cal-chip');if(!el)return;e.preventDefault();const t=$('calTip');if(t)t.remove();
  const id=el.dataset.tipid||el.dataset.id,isP=el.dataset.kind==='p'||el.dataset.kind==='cut';let m=$('calMenu');if(m)m.remove();m=document.createElement('div');m.id='calMenu';m.className='cal-menu';
  m.innerHTML=isP?`<button type="button" data-action="open-project" data-id="${esc(id)}">Projekt megnyitása</button>`
    :`<button type="button" data-action="${el.dataset.kind==='v'?'cal-vevent':'cal-event'}" data-id="${esc(id)}">Részletek</button>${ro()?'':`<button type="button" class="bad-txt" data-action="cal-ctx-del" data-id="${esc(id)}" data-kind="${esc(el.dataset.kind||'g')}">🗑️ Törlés a naptárból</button>`}`;
  document.body.appendChild(m);m.style.left=Math.min(e.pageX,scrollX+innerWidth-200)+'px';m.style.top=e.pageY+'px';});
document.addEventListener('click',e=>{const m=$('calMenu');if(m&&!e.target.closest('#calMenu'))m.remove();else if(m&&e.target.closest('button'))setTimeout(()=>{const x=$('calMenu');if(x)x.remove();},0);},true);
ACT['cal-ctx-del']=b=>{if(ro())return;const id=b.dataset.id,vag=b.dataset.kind==='v';let ev=null;[S.cal.events||{},S.cal.ev2||{}].forEach(o=>Object.values(o).forEach(l=>(l||[]).forEach(x=>{if(x.id===id)ev=x;})));
  confirmModal('Bejegyzés törlése',`Biztosan törlöd a(z) „${ev?esc(ev.title||''):'bejegyzés'}” bejegyzést a${vag?' Vágói':' Google'} Naptárból?`,'Törlés',async()=>{
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
document.addEventListener('click',e=>{if(ro()||S.tab!=='naptar')return;const d=e.target.closest&&e.target.closest('.cal-day');if(!d||e.target.closest('button,a,.cal-chip'))return;
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
(()=>{let w=null,x0=0,s0=0,moved=false;
  document.addEventListener('mousedown',e=>{if(e.button!==0)return;const ww=e.target.closest&&e.target.closest('.tl-wrap');if(!ww||e.target.closest('[draggable=true]'))return;w=ww;x0=e.clientX;s0=w.scrollLeft;moved=false;});
  document.addEventListener('mousemove',e=>{if(!w)return;const dx=e.clientX-x0;if(!moved&&Math.abs(dx)<5)return;if(!moved){moved=true;w.classList.add('panning');const t=$('calTip');if(t)t.remove();}w.scrollLeft=s0-dx;e.preventDefault();});
  document.addEventListener('mouseup',()=>{if(!w)return;w.classList.remove('panning');if(moved){const m=S.cal.month;S.cal.tlPos={m,x:w.scrollLeft};}w=null;});
  document.addEventListener('click',e=>{if(moved&&e.target.closest&&e.target.closest('.tl-wrap')){e.stopPropagation();e.preventDefault();moved=false;}},true);   // húzás után ne nyíljon meg a projekt
  document.addEventListener('scroll',e=>{const t=e.target;if(t&&t.classList&&t.classList.contains('tl-wrap')){S.cal.tlPos={m:S.cal.month,x:t.scrollLeft,y:t.scrollTop};tlCorner(t);}},true);})();
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
  const upd=()=>{const d=document.querySelector('.dtitle');const b=$('ptbar');if(!d){if(b)b.classList.remove('on');return;}const top=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tbh'))||58,on=d.getBoundingClientRect().bottom<top;
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
async function projSalesSet(ownerId){const p=S.draft||projById(S.projectId);if(!p)return;
  try{const r=await call('projSales',{projectId:p.id,ownerId:ownerId||''});if(r.deals)S.deals=r.deals;if(r.salesPeople)S.salesPeople=r.salesPeople;if(!ownerId&&S.salesOn)delete S.salesOn[p.id];render(true);
    toast(ownerId?'Értékesítő: '+(((S.salesPeople||[]).find(x=>x.userId===ownerId)||{}).name||''):'Értékesítői jutalék levéve');}catch(e){handleErr(e);render(true);}}
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
  try{const r=await call('projSalesComm',{projectId:p.id,pct:val});if(r.deals)S.deals=r.deals;if(r.salesPeople)S.salesPeople=r.salesPeople;render(true);toast(val===''?'Értékesítői jutalék: az értékesítő szabálya szerint':'Értékesítői jutalék mentve');}catch(err){handleErr(err);render(true);}});

/* Vágás tábla: áthúzás / → gomb → a videó állapota (videoSet) */
/* Gyors egymás utáni húzásnál: a kérések sorban mennek, és a válasz nem írja felül a még függő (későbbi) helyi módosításokat */
let BD_Q=Promise.resolve();const BD_PEND={};
function bdApply(pid){const p=projById(pid);if(!p||!Array.isArray(p.videos))return;p.videos.forEach(v=>{const k=pid+'|'+v.id;if(BD_PEND[k])v.st=BD_PEND[k].st;});}
function bdRefresh(){render(true);const mb=document.querySelector('.bd-modal');if(mb){mb.innerHTML=laneModalBody(mb.dataset.pid);const hl=mb.querySelector('.bl-hl'),tt=document.querySelector('#mform .bl-ttl');if(hl&&tt)tt.innerHTML=hl.innerHTML;}try{bdSelBar();}catch(e){}}
/* Továbbszámlázott tétel csatolmánya: kiválasztás vagy behúzás után azonnal feltöltődik a projekt Drive-mappájába */
async function extraFileUp(i,f){if(!f||!S.draft||!isAdmin())return;if(f.size>10*1024*1024){toast('A fájl legfeljebb 10 MB lehet.',true);return;}
  const box=document.querySelector(`[data-extra-drop="${i}"] .tov-file`);if(box)box.innerHTML='<span class="muted">⏳ Feltöltés…</span>';
  try{const r=await call('extraFileUpload',{projectId:S.draft.id,b64:await readB64(f),name:f.name,mime:f.type||'application/octet-stream'});
    const l=(S.draft.extras||[]).map(x=>Object.assign({},x));if(l[i]){l[i].fileUrl=r.url;l[i].fileName=r.name;setDraft({extras:l});}render(true);toast('Csatolmány feltöltve');}
  catch(e){handleErr(e);render(true);}}
document.addEventListener('change',e=>{const t=e.target;if(t&&t.dataset&&t.dataset.extraFile!==undefined)extraFileUp(Number(t.dataset.extraFile),t.files&&t.files[0]);});
document.addEventListener('dragover',e=>{const z=e.target.closest&&e.target.closest('[data-extra-drop]');if(z&&e.dataTransfer&&[...e.dataTransfer.types].includes('Files')){e.preventDefault();z.classList.add('over');}});
document.addEventListener('dragleave',e=>{const z=e.target.closest&&e.target.closest('[data-extra-drop]');if(z&&!z.contains(e.relatedTarget))z.classList.remove('over');});
document.addEventListener('drop',e=>{const z=e.target.closest&&e.target.closest('[data-extra-drop]');if(!z||!e.dataTransfer||!e.dataTransfer.files.length)return;e.preventDefault();z.classList.remove('over');extraFileUp(Number(z.dataset.extraDrop),e.dataTransfer.files[0]);});
/* Áthúzás mentése frissítés/bezárás ellen: a még el nem mentett mozgatás a böngészőben megmarad, és betöltéskor újraküldjük */
function bdKeep(k,v){try{const m=JSON.parse(localStorage.getItem('lpm_bd_pend')||'{}');if(v)m[k]=v;else delete m[k];localStorage.setItem('lpm_bd_pend',JSON.stringify(m));}catch(e){}}
function bdResume(){let m={};try{m=JSON.parse(localStorage.getItem('lpm_bd_pend')||'{}');}catch(e){}
  Object.entries(m).forEach(([k,x])=>{if(!x||Date.now()-x.at>30*60*1000){bdKeep(k,null);return;}const p=projById(x.pid),v=p&&(p.videos||[]).find(y=>y.id===x.vid);if(!v){bdKeep(k,null);return;}
    if(v.st===x.st){bdKeep(k,null);return;}const old=v.st;v.st=x.st;
    BD_Q=BD_Q.then(async()=>{try{const r=await call('videoSet',Object.assign({projectId:x.pid,id:x.vid,st:x.st},x.fb?{fb:x.fb}:{}));bdKeep(k,null);const pr2=r&&r.project;if(pr2){const i=S.projects.findIndex(z=>z.id===x.pid);if(i>=0)S.projects[i]=normProj(pr2);}if(typeof bdRefresh==='function')bdRefresh();}
      catch(e){bdKeep(k,null);const q=projById(x.pid),w=q&&(q.videos||[]).find(z=>z.id===x.vid);if(w)w.st=old;if(typeof bdRefresh==='function')bdRefresh();}});});}
window.addEventListener('beforeunload',e=>{if(Object.keys(BD_PEND||{}).length){e.preventDefault();e.returnValue='';}});   /* még mentés alatt álló áthúzásnál figyelmeztet */
async function bdMove(pid,vid,st,extra,fb){const p=projById(pid);const v=p&&(p.videos||[]).find(x=>x.id===vid);if(!v||v.st===st)return;
  if(st==='ellen'&&!extra){reviewModal(pid,vid);return;}
  if(st==='leadva'&&!extra){clientModal(pid,vid);return;}   /* az ügyfélhez kerül: ki kapja az e-mailt (vagy e-mail nélkül) */
  if(st==='jovahagyva'&&!v.link&&!extra){   /* link nélkül nem lehet jóváhagyott */
    openModal('✅ Jóváhagyva – a videó linkje',`<p class="hint" style="margin:0 0 10px"><b>${esc(v.name)}</b> – ${esc(p.name||'')}</p><div class="field full"><label for="m-jvLink">A jóváhagyott videó linkje</label><input class="inp" id="m-jvLink" name="link" type="url" placeholder="https://…" required></div>`,
      {submitLabel:'✅ Jóváhagyva',noDraft:true,submit:async fd=>{const l=String(fd.get('link')||'').trim();if(!/^https?:\/\/\S+$/i.test(l)){toast('Illeszd be a videó linkjét (https://…).',true);return;}closeModal();bdMove(pid,vid,'jovahagyva',{noMail:true,link:l});}});return;}
  let nmLink='';if(extra&&extra.noMail){nmLink=extra.link||'';extra=null;}   // belső ellenőrzés: kinek, link, megjegyzés
  const old=v.st,k=pid+'|'+vid,tok={st};BD_PEND[k]=tok;v.st=st;if(nmLink)v.link=nmLink;bdRefresh();if(!extra)bdKeep(k,{pid,vid,st,fb:fb||'',at:Date.now()});
  BD_Q=BD_Q.then(async()=>{try{const r=extra&&extra.client?await call('videoClient',Object.assign({projectId:pid,id:vid},extra.client)):extra?await call('videoReview',Object.assign({projectId:pid,id:vid},extra)):await call('videoSet',Object.assign({projectId:pid,id:vid,st},fb?{fb}:{},nmLink?{link:nmLink}:{}));const pr2=r&&r.project;
      if(BD_PEND[k]===tok)delete BD_PEND[k];bdKeep(k,null);
      if(pr2){const i=S.projects.findIndex(x=>x.id===pid);if(i>=0)S.projects[i]=normProj(pr2);[S.draft,S.draftBase].forEach(d=>{if(d&&d.id===pid)['videos','status','leadvaAt','stepsDone','updatedAt','updatedBy'].forEach(f=>{d[f]=pr2[f];});});}
      bdApply(pid);bdRefresh();if(extra&&extra.client)toast(r&&r.test?'🧪 TESZT: a levél neked ment ki, nem az ügyfélnek':r&&r.mail?'📧 Elküldve az ügyfélnek':'Ügyfél jóváhagyására jelölve (az e-mail most nem ment ki)',!(r&&r.mail));else if(extra)toast(r&&r.mail?'📧 Elküldve ellenőrzésre':'Belső ellenőrzésre jelölve (e-mail most nem ment ki)');else if(fb)toast('↩ Visszadobva – a vágó e-mailt kapott');}
    catch(e){bdKeep(k,null);if(BD_PEND[k]===tok){delete BD_PEND[k];const q=projById(pid),w=q&&(q.videos||[]).find(x=>x.id===vid);if(w)w.st=old;}bdRefresh();handleErr(e);}});}
/* Belső ellenőrzésre küldés: kinek (Ervin / Dávid), a videó linkje (kötelező), megjegyzés */
/* Az ügyfél ismert címei: a projekt kapcsolattartója, az ügyfél adatlapja (kapcsolattartó, képviselő), az ügyfél korábbi projektjeinek kapcsolattartói */
function clientContacts(p){const L=[],seen={},add=(name,email,tag)=>{email=String(email||'').trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||seen[email.toLowerCase()])return;seen[email.toLowerCase()]=1;L.push({name:String(name||'').replace(/\s*\([^)]*\)/g,'').trim(),email,tag});};
  const cn0=String(p.client||'').trim();
  if(!cn0){   // ügyfél nélküli (saját) projekt: csak a projektvezetőnek vagy az ügyvezetőnek küldhető
    const ld=crewById(p.lead);if(ld)add(ld.name,ld.email,'projektvezető');
    (S.users||[]).filter(x=>x.role==='admin'&&!x.disabled).forEach(x=>add(x.name,x.email,'ügyvezető'));if(isAdmin()&&S.me)add(S.me.name,S.me.email,'ügyvezető');
    return L;}
  add(p.contactName,p.contactEmail,'a projekt kapcsolattartója');const cn=String(p.client||'').trim().toLowerCase(),c=(S.clients||[]).find(x=>String(x.name||'').trim().toLowerCase()===cn);
  if(c&&cn){add(c.contactName,c.contactEmail,'kapcsolattartó');add(c.rep,c.repEmail,'képviselő');}
  if(cn)(S.projects||[]).filter(q=>q.id!==p.id&&String(q.client||'').trim().toLowerCase()===cn).forEach(q=>add(q.contactName,q.contactEmail,'korábbi projekt'));return L;}
ACT['cl-nomail']=b=>{const li=$('m-clLink'),link=String(li&&li.value||'').trim();if(!/^https?:\/\/\S+$/i.test(link)){toast('Illeszd be a videó linkjét (https://…) – e-mail nélküli áthelyezésnél is kell.',true);if(li){li.focus();li.style.borderColor='var(--bad)';}return;}
  closeModal();bdMove(b.dataset.pid,b.dataset.vid,'leadva',{noMail:true,link});clAfter(b.dataset.pid,b.dataset.vid);};
function clAfter(pid,vid){if(bdGroupNext(pid,vid))return;const lp=window._clLane;window._clLane='';if(window._vvList&&vvNext())return;window._vvList=null;if(lp&&!$('mform'))ACT['bd-lane']({dataset:{id:lp}});}   /* utána: a következő kijelölt videó, vagy vissza a videótáblára */
/* Küldés az ügyfélnek: címzettek, link, tárgy és SZERKESZTHETŐ levél (tegező); a végére az aláírásod kerül. A kiküldött szöveg az ügyfélnél sablonként megmarad. */
const CL_TPL_DEF='Kedves {nev},\n\nElkészült a(z) „{video}” videó a(z) {projekt} projekthez. Nézd meg, kérlek, és jelezd, ha jóváhagyod, vagy ha módosítást szeretnél.\n\n{link}';
const clSubj=(p,v)=>{let t='';try{t=localStorage.getItem('lpm_vidsubj|'+String(p.client||'').trim().toLowerCase())||'';}catch(e){}return String(t||'Elkészült: {video} – {projekt}').replace(/\{video\}/g,v.name).replace(/\{projekt\}/g,p.name||'');};   /* a tárgy szerkezete is megmarad ügyfelenként */
const clClient=p=>{const cn=String(p.client||'').trim().toLowerCase();return (S.clients||[]).find(x=>String(x.name||'').trim().toLowerCase()===cn)||null;};
/* Névelő: „a” vagy „az” a következő szó kiejtése szerint (magánhangzó, illetve 1, 5, 50… → „az”) */
const huArt=w=>{const x=String(w||'').replace(/^[\s„"'(«»]+/,'');if(!x)return 'a';const c=x[0].toLowerCase();if('aáeéiíoóöőuúüű'.includes(c))return 'az';
  if(/\d/.test(c)){const n=(x.match(/^\d+/)||[''])[0];return c==='5'||(c==='1'&&n.length%3===1)?'az':'a';}return 'a';};
const fixArt=t=>String(t||'').replace(/\b([Aa])\(z\)(\s+)(\S+)/g,(m,a,sp,w)=>{const r=huArt(w);return (a==='A'?r[0].toUpperCase()+r.slice(1):r)+sp+w;});
const clFill=(t,o)=>fixArt(String(t||'').replace(/\{nev\}/g,o.nev||'').replace(/\{video\}/g,o.video||'').replace(/\{projekt\}/g,o.projekt||'').replace(/\{link\}/g,o.link||'{link}'));
function clientModal(pid,vid){const p=projById(pid),v=p&&(p.videos||[]).find(x=>x.id===vid);if(!v)return;if(!(isAdmin()||(S.me&&S.me.role==='editor'))||ro()){toast('Az ügyfélnek csak az ügyvezető vagy a termelési vezető küldheti el a videót.',true);return;}const lane=laneToUnder();window._clLane='';
  const CC=clientContacts(p),cl=clClient(p),first=String((CC[0]&&CC[0].name)||p.contactName||'').replace(/\([^)]*\)/g,'').trim().split(/\s+/).pop()||'',o={nev:first,video:v.name,projekt:p.name||'',link:v.link||''};
  let lt='';try{lt=localStorage.getItem('lpm_vidtpl|'+String(p.client||'').trim().toLowerCase())||'';}catch(e){}
  const body=clFill(String((cl&&cl.vidMail)||lt||CL_TPL_DEF).replace(/\n+\s*Köszönöm!?\s*$/,''),o);   // a szignó előtt nem kell „Köszönöm!” (a korábban mentett mintákból is lekerül)
  openModal('📤 Küldés az ügyfélnek jóváhagyásra',`<p class="hint" style="margin:0 0 12px"><b>${esc(v.name)}</b> – ${esc(p.name||'')}</p>${S.clientMailLive?'':'<div class="banner warn" style="margin:0 0 12px"><p>🧪 <b>Tesztüzem:</b> a levél nem az ügyfélnek, hanem <b>neked</b> megy ki (a tárgyban látod, kinek szólna). Élesítés: szólj.</p></div>'}
    <div class="field full"><label>Kinek küldjük? <span class="muted">(több is választható)</span></label><div class="cl-pick">${CC.map((c,i)=>`<label class="cl-opt"><input type="checkbox" name="toPick" value="${esc(c.email)}"${i===0?' checked':''}> <span><b>${esc(c.name||c.email)}</b>${c.name?` <small>${esc(c.email)}</small>`:''}${c.tag?` <small class="muted">· ${esc(c.tag)}</small>`:''}</span></label>`).join('')||'<p class="hint" style="margin:0">Ehhez az ügyfélhez nincs elmentett e-mail cím – add meg alább.</p>'}</div>
      ${String(p.client||'').trim()?'<input class="inp" id="m-clTo" name="to" type="email" placeholder="Másik e-mail cím (nem kötelező)" style="margin-top:8px">':'<p class="hint" style="margin:6px 0 0">Saját projekt (nincs ügyfél): csak a projektvezetőnek vagy az ügyvezetőnek küldhető.</p>'}</div>
    ${isAdmin()?wmFieldHtml(p):''}
    <div class="field full"><label for="m-clLink">A videó linkje</label><input class="inp" id="m-clLink" name="link" type="url" value="${esc(v.link||'')}" required></div>
    <div class="field full"><label for="m-clSubj">Tárgy</label><input class="inp" id="m-clSubj" name="subject" value="${esc(clSubj(p,v))}"></div>
    <div class="field full"><span class="lbl">A levél előnézete <span class="muted" style="font-weight:500">– kattints a szövegbe, és írd át, ami kell</span></span><textarea id="m-clBody" name="body" hidden>${esc(body)}</textarea>
      <div class="cl-prev-box"><div class="inv-h pe-head" id="cl-head"></div><div id="cl-prev"><p class="hint" style="padding:12px">Előnézet betöltése…</p></div></div>
      <p class="hint" style="margin:6px 0 0">A „▶ Videó megnézése és jóváhagyása” gomb a jóváhagyó oldalra visz: ott nézi meg az ügyfél a videót, és ott hagyja jóvá vagy kér módosítást. Amit itt átírsz (pl. a megszólítást), legközelebb ennél az ügyfélnél már így jön fel.</p></div>`,
    {submitLabel:'📧 Küldés az ügyfélnek',left:`<button type="button" class="btn outline" data-action="cl-nomail" data-pid="${esc(pid)}" data-vid="${esc(vid)}" title="Az ügyfél jóváhagyására vár oszlopba kerül, de e-mail nem megy ki">Áthelyezés e-mail nélkül</button>`,submit:async fd=>{
      const to=[...fd.getAll('toPick'),String(fd.get('to')||'').trim()].filter(Boolean).join(', '),link=String(fd.get('link')||'').trim(),text=String(fd.get('body')||'').trim(),subject=String(fd.get('subject')||'').trim();
      if(!to||!to.split(/\s*,\s*/).every(x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))){toast('Válassz címzettet, vagy adj meg érvényes e-mail címet.',true);return;}if(!/^https?:\/\/\S+$/i.test(link)){toast('Illeszd be a videó linkjét (https://…).',true);return;}
      if(text.length<5){toast('Írd meg a levelet.',true);return;}
      const esc2=x=>String(x).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');let tpl=text;[[link,'{link}'],[v.name,'{video}'],[p.name||'','{projekt}']].forEach(([val,ph])=>{if(val)tpl=tpl.replace(new RegExp(esc2(val),'g'),ph);});tpl=tpl.replace(/\b([Aa])z?(\s+[„"]?\{(?:video|projekt)\})/g,'$1(z)$2');   /* a névelő a következő videónál újra igazodik */
      if(cl)cl.vidMail=tpl;try{localStorage.setItem('lpm_vidtpl|'+String(p.client||'').trim().toLowerCase(),tpl);let st=subject;if(v.name)st=st.split(v.name).join('{video}');if(p.name)st=st.split(p.name).join('{projekt}');localStorage.setItem('lpm_vidsubj|'+String(p.client||'').trim().toLowerCase(),st);}catch(e){}closeModal();bdMove(pid,vid,'leadva',{client:{to,link,note:'',text,subject,tpl}});clAfter(pid,vid);}});
  let lastLink=v.link||'';const li=$('m-clLink'),bd=$('m-clBody');if(li&&bd)li.addEventListener('input',()=>{const nl=li.value.trim();if(lastLink&&bd.value.includes(lastLink))bd.value=bd.value.split(lastLink).join(nl);else if(!lastLink&&bd.value.includes('{link}'))bd.value=bd.value.split('{link}').join(nl);lastLink=nl;clPrev(true);});
  if(lane)window.MODAL_BEFORE_CLOSE=()=>()=>{if(!$('mform'))ACT['bd-lane']({dataset:{id:lane}});};
  const fm=$('mform');if(fm){fm.addEventListener('input',e=>{if(e.target.id==='m-clSubj'||e.target.id==='m-clTo')clHead();});fm.addEventListener('change',e=>{if(e.target.name==='toPick')clHead();});}
  (S._mySig!=null?Promise.resolve(S._mySig):call('mySignature').then(r=>(S._mySig=(r&&r.html)||'')).catch(()=>(S._mySig=''))).then(()=>clPrev(false));clHead();
  setTimeout(()=>{const i=$(v.link?'m-clSubj':'m-clLink');if(i)i.focus();},60);}
/* Vízjel a jóváhagyó lejátszón (projektenként): pipával; Sales App projektnél alapból be; teljes kifizetés után magától lekerül */
const wmSales=p=>String(p.id||'').indexOf('sales-')===0||/Forrás: Sales App/.test(String(p.notes||''));
const wmSet=p=>{const w=String((billOf(p.id)||{}).watermark||'');return w==='1'||(w!=='0'&&wmSales(p));};
function wmFieldHtml(p){const on=wmSet(p),paid=p.payStatus==='teljes';
  return `<div class="field full wm-field"><label class="chk"><input type="checkbox" data-wm-pid="${esc(p.id)}"${on?' checked':''}> 💧 <b>Vízjel a videón</b> <span class="muted">– amíg nincs kifizetve${wmSales(p)?' (Sales App projekt: alapból bekapcsolva)':''}</span></label>${on&&paid?'<small class="hint" style="margin:2px 0 0 26px;display:block">✅ Kifizetve – az ügyfél már vízjel nélkül látja.</small>':''}</div>`;}
document.addEventListener('change',async e=>{const t=e.target;if(!t.dataset||t.dataset.wmPid===undefined||!isAdmin())return;const pid=t.dataset.wmPid,v=t.checked?'1':'0';
  try{const d=await call('billSave',{projectId:pid,watermark:v});if(d&&d.billing&&S.fin)S.fin.billing=d.billing;else if(S.fin){const arr=S.fin.billing=S.fin.billing||[];let b=arr.find(x=>x.projectId===pid);if(!b){b=Object.assign({},billOf(pid),{projectId:pid});arr.push(b);}b.watermark=v;}
    toast(t.checked?'💧 Vízjel bekapcsolva – kifizetésig rajta marad':'Vízjel kikapcsolva');}catch(err){t.checked=!t.checked;handleErr(err);}});
/* Ügyfél-levél előnézete (mint a díjösszesítőnél): fejléc + szerkeszthető levélszöveg + aláírás. A szöveg a rejtett „body” mezőbe kerül vissza. */
function clHead(){const h=$('cl-head');if(!h)return;const fm=$('mform');const to=[...fm.querySelectorAll('[name=toPick]:checked')].map(x=>x.value).concat([String(($('m-clTo')||{}).value||'').trim()]).filter(Boolean).join(', ');
  h.innerHTML=`<div><span>Feladó:</span> ${esc((S.me&&S.me.name)||'')} · Lumos Motion &lt;${esc((S.me&&S.me.email)||'')}&gt;</div><div><span>Címzett:</span> ${esc(to||'(válassz címzettet)')}</div><div><span>Tárgy:</span> <b>${esc(String(($('m-clSubj')||{}).value||''))}</b></div>`;}
const CL_BTN='<a data-vbtn="1" class="lmbtn" contenteditable="false" href="#" onclick="return false" style="display:inline-block;background:#f6efe1;border:1px solid #e3d3b0;border-radius:10px;padding:6px 22px 6px 10px;text-decoration:none;color:#1d2a38;font-family:Montserrat,Arial,sans-serif;line-height:1.2;cursor:default"><img class="lmstamp" src="mail/stamp.png" width="48" height="48" alt="Lumos Motion" style="vertical-align:middle;border:0;display:inline-block"><span style="display:inline-block;vertical-align:middle;border-left:1px solid #e3d3b0;padding-left:14px;margin-left:12px"><span style="display:block;font-size:15px;font-weight:600;color:#1d2a38">Videó megtekintése ▶</span></span></a>';   // ugyanaz, mint a kiküldött levélben (Lumos postabélyegzős gomb)
/* Az előnézetben a linkre / gombra kattintás ne navigáljon: a keret különben a saját oldalunkat töltené be, amit a CSP letilt („This content is blocked”) */
const noNav=d=>d.addEventListener('click',e=>{const a=e.target&&e.target.closest&&e.target.closest('a[href]');if(a)e.preventDefault();},true);
function clPrev(onlyBody){const box=$('cl-prev'),bd=$('m-clBody');if(!box||!bd)return;const link=String(($('m-clLink')||{}).value||'').trim();
  const lines=bd.value.split('\n');let has=false;const html=lines.map(l=>{if(link&&l.trim()===link){has=true;return CL_BTN;}return esc(l).replace(/(https?:\/\/\S+)/g,'<a href="#" onclick="return false">$1</a>');}).join('<br>')+(has||!link?'':'<br><br>'+CL_BTN);
  const old=box.querySelector('iframe');if(onlyBody&&old&&old.contentDocument&&old.contentDocument.getElementById('ed')){old.contentDocument.getElementById('ed').innerHTML=html;return;}
  box.innerHTML='';const f=document.createElement('iframe');f.className='mail-frame';f.title='Ügyfél-levél előnézet (szerkeszthető)';
  f.srcdoc='<!doctype html><html><head><meta charset="utf-8"><style>body{margin:16px;background:#fff;font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#202124}#ed:focus{outline:none}#ed{min-height:80px}</style></head><body><div id="ed" contenteditable="true" spellcheck="true">'+html+'</div><br><div contenteditable="false">'+(S._mySig||'')+'</div></body></html>';
  const fit=()=>{try{f.style.height=ifrH(f)+'px';}catch(_){}};
  f.addEventListener('load',()=>{const d=f.contentDocument;if(!d)return;noNav(d);fit();setTimeout(fit,400);const ed=d.getElementById('ed');
    ed.addEventListener('input',()=>{const c=ed.cloneNode(true),ln=String(($('m-clLink')||{}).value||'').trim();c.querySelectorAll('[data-vbtn]').forEach(x=>x.replaceWith(d.createTextNode(ln)));c.querySelectorAll('br').forEach(x=>x.replaceWith(d.createTextNode('\n')));c.querySelectorAll('div,p').forEach(x=>{x.prepend(d.createTextNode('\n'));});
      bd.value=c.textContent.replace(/ /g,' ').replace(/^\n/,'').replace(/\n{3,}/g,'\n\n');fit();});});
  box.appendChild(f);}
function reviewModal(pid,vid){const p=projById(pid),v=p&&(p.videos||[]).find(x=>x.id===vid);if(!v)return;const lane=laneToUnder();let last='';try{last=localStorage.getItem('lpm_rv_to')||'';}catch(e){}
  openModal('🔍 Belső ellenőrzésre küldés',`<p class="hint" style="margin:0 0 12px"><b>${esc(v.name)}</b> – ${esc(p.name||'')}</p>
    <div class="field full"><label>Ki ellenőrizze? (e-mailt kap)</label><div class="rv-pick"><label><input type="radio" name="to" value="david"${last==='david'?' checked':''}> <span>Zajácz Dávid</span></label><label><input type="radio" name="to" value="ervin"${last==='ervin'?' checked':''}> <span>Egri Ervin</span></label></div></div>
    ${(v.cm||[]).length?`<div class="field full"><label for="m-rvLink">A javított videó linkje</label><input class="inp" id="m-rvLink" name="link" type="url" value="" placeholder="Illeszd be az új verzió linkjét" required><span class="hint" style="font-size:12px">Az előző verzió: ${esc(v.link||'–')}</span></div>`:`<div class="field full"><label for="m-rvLink">A videó linkje</label><input class="inp" id="m-rvLink" name="link" type="url" value="${esc(v.link||'')}" required></div>`}
    <div class="field full"><label for="m-rvNote">Megjegyzés <span class="muted">(nem kötelező)</span></label><textarea class="inp" id="m-rvNote" name="note" rows="3">${esc(v.note||'')}</textarea></div>`,
    {submitLabel:'📧 Küldés ellenőrzésre',submit:async fd=>{const to=String(fd.get('to')||''),link=String(fd.get('link')||'').trim(),note=String(fd.get('note')||'').trim();
      if(!to){toast('Válaszd ki, ki nézze át.',true);return;}if(!/^https?:\/\/\S+$/i.test(link)){toast('Illeszd be a videó linkjét (https://…).',true);return;}
      try{localStorage.setItem('lpm_rv_to',to);}catch(e){}closeModal();bdMove(pid,vid,'ellen',{to,link,note});bdGroupNext(pid,vid);}});
  if(lane)window.MODAL_BEFORE_CLOSE=()=>()=>{if(!$('mform'))ACT['bd-lane']({dataset:{id:lane}});};   /* bezárás / küldés után vissza a videótáblára */
  setTimeout(()=>{const i=$('m-rvLink');if(i)i.focus();},60);}
ACT['bd-move']=b=>bdMove(b.dataset.pid,b.dataset.vid,b.dataset.st);
/* Idővonal vágássáv → a projekt videóinak táblája (ugyanúgy húzható) */
function laneModalBody(pid){const cards=boardCards().filter(c=>c.p.id===pid);return cards.length?boardLanes(cards,{noLink:true,single:true}):'<p class="hint">Ennek a projektnek nincs videója.</p>';}
ACT['bd-lane']=b=>{const p=projById(b.dataset.id);if(!p)return;openModal((p.name||'Videók'),`<div class="bd-modal" data-pid="${esc(p.id)}">${laneModalBody(p.id)}</div>`,{submitLabel:'Projekt megnyitása',submit:async()=>{closeModal();openProject(p.id);},cancelLabel:'Bezárás'});try{sessionStorage.setItem('lpm_lane_open',p.id);}catch(e){}window.MODAL_BEFORE_CLOSE=()=>{try{sessionStorage.removeItem('lpm_lane_open');}catch(e){}S._bdSel=[];bdSelBar();};   /* frissítés után a videótábla is visszajön */
  const mb=document.querySelector('#mform .mbox,#mform');if(mb)mb.classList.add('m-wide');
  {const hl=document.querySelector('.bd-modal .bl-hl'),h=document.querySelector('#mform .mhead h3');if(hl&&h){const w=document.createElement('span');w.className='bl-ttl';w.innerHTML=hl.innerHTML;h.appendChild(w);h.classList.add('bl-h3');}}};   /* a határidő és a leadott darabszám a címsorba kerül */
/* húzás közben csak az engedélyezett oszlop világosodik ki (a vágó csak „Utómunka alatt” / „Belső ellenőrzés” oszlopba tehet) */
let BD_DRAG=null;
function bdCanTo(pid,vid,to){const p=projById(pid),v=p&&(p.videos||[]).find(x=>x.id===vid);if(!v||p.status==='atadva'||v.st==='jovahagyva')return false;if(!ro()&&(isAdmin()||(S.me&&S.me.role==='editor')))return true;
  return ['vagas','ellen'].includes(to)&&!['jovahagyva','leadva'].includes(v.st)&&!(v.st==='ellen'&&to!=='ellen');}
document.addEventListener('dragstart',e=>{const c=e.target.closest&&e.target.closest('.bd-card[draggable]');if(!c)return;BD_DRAG={pid:c.dataset.bdPid,vid:c.dataset.bdVid};e.dataTransfer.setData('text/plain','bd|'+c.dataset.bdPid+'|'+c.dataset.bdVid);e.dataTransfer.effectAllowed='move';c.classList.add('dragging');if(c.classList.contains('sel'))document.querySelectorAll('.bd-card.sel').forEach(x=>x.classList.add('dragging'));document.body.classList.add('bd-dragging');});
document.addEventListener('dragend',e=>{BD_DRAG=null;document.querySelectorAll('.bd-card.dragging').forEach(x=>x.classList.remove('dragging'));document.querySelectorAll('[data-bd-col].over').forEach(x=>x.classList.remove('over'));document.body.classList.remove('bd-dragging');});
document.addEventListener('dragover',e=>{const col=e.target.closest&&e.target.closest('[data-bd-col]');if(!col||!document.body.classList.contains('bd-dragging'))return;if(BD_DRAG&&(!bdCanTo(BD_DRAG.pid,BD_DRAG.vid,col.dataset.bdCol)||(col.dataset.bdLane&&col.dataset.bdLane!==BD_DRAG.pid))){document.querySelectorAll('[data-bd-col].over').forEach(x=>x.classList.remove('over'));return;}e.preventDefault();document.querySelectorAll('[data-bd-col].over').forEach(x=>{if(x!==col)x.classList.remove('over');});col.classList.add('over');});
/* csoportos húzás: ha a húzott kártya ki van jelölve, az összes kijelölt videó átkerül (amelyik oda mehet) */
let BD_GRP=null;   /* e-mailes oszlopnál (belső ellenőrzés / ügyfél) a kijelöltek ablakai egymás után jönnek */
function bdGroupNext(pid,vid){const g=BD_GRP;if(!g||g.cur!==pid+'|'+vid)return false;const n=g.items.shift();if(!n){BD_GRP=null;return false;}g.cur=n.pid+'|'+n.vid;setTimeout(()=>bdMove(n.pid,n.vid,g.st),300);return true;}
document.addEventListener('drop',e=>{const col=e.target.closest&&e.target.closest('[data-bd-col]');if(!col)return;const d=String(e.dataTransfer.getData('text/plain')||'').split('|');if(d[0]!=='bd')return;e.preventDefault();col.classList.remove('over');if(col.dataset.bdLane&&col.dataset.bdLane!==d[1]){toast('A videó csak a saját projektje sorában mozgatható.',true);return;}if(!bdCanTo(d[1],d[2],col.dataset.bdCol))return;
  const st=col.dataset.bdCol,k0=d[1]+'|'+d[2],sel=(S._bdSel||[]).slice();
  if(sel.length>1&&sel.includes(k0)){const items=[{pid:d[1],vid:d[2]}].concat(sel.filter(k=>k!==k0).map(k=>{const [pid,vid]=k.split('|');return {pid,vid};})).filter(x=>{const q=projById(x.pid),w=q&&(q.videos||[]).find(y=>y.id===x.vid);return w&&w.st!==st&&(!col.dataset.bdLane||col.dataset.bdLane===x.pid)&&bdCanTo(x.pid,x.vid,st);});
    S._bdSel=[];bdSelBar();if(!items.length)return;
    if(st==='ellen'||st==='leadva'){const f=items.shift();BD_GRP=items.length?{st,items,cur:f.pid+'|'+f.vid}:null;bdMove(f.pid,f.vid,st);return;}
    items.forEach(x=>bdMove(x.pid,x.vid,st));if(items.length>1)toast(items.length+' videó áthelyezve');return;}
  BD_GRP=null;bdMove(d[1],d[2],st);});
document.addEventListener('change',e=>{if(e.target&&e.target.id==='bd-cut'){S.boardCut=e.target.value==='__all'?'':e.target.value;render(true);}});

/* 🔔 Értesítések: belső ellenőrzésre váró videók (ügyvezető / termelési vezető). Új tételnél felugró értesítés a jobb felső sarokban. */
function bellItems(){if(ro()||isSales()||!(isAdmin()||(S.me&&S.me.role==='editor')))return [];const out=[];
  S.projects.forEach(p=>{if(p.status==='lemondva'||p.status==='atadva')return;(p.videos||[]).forEach(v=>{if(v.st==='ellen')out.push({p,v,key:p.id+'|'+v.id+'|'+(v.rvAt||'')});});});
  return out.sort((a,b)=>String(b.v.rvAt||'').localeCompare(String(a.v.rvAt||'')));}
/* 💰 Beérkezett kifizetések (csak ügyvezető): az elmúlt 14 nap kifizetett / részben kifizetett számlái és díjbekérői */
function bellPays(){if(isAdmin()&&S.capabilities&&S.capabilities.finance&&!S._finLoading&&!S.finErr&&typeof finLoad==='function'&&(!S._payBellAt||Date.now()-(S._payBellAt||0)>10*60000)){S._payBellAt=Date.now();try{if(S.fin&&S.fin.sz&&S.fin.sz.hasKey&&typeof szSync==='function')szSync(true);else finLoad(!!S.fin).then(()=>{if(S.fin&&S.fin.sz&&S.fin.sz.hasKey&&typeof szSync==='function')szSync(true);});}catch(e){}}   /* a kifizetések frissen: betöltéskor és 10 percenként lekérdezi a számlázz.hu-t */
  if(!isAdmin()||!S.fin)return [];const lim=new Date(Date.now()-14*864e5).toISOString().slice(0,10);
  const IV=S.fin.invoices||[];return IV.filter(x=>x&&x.kind!=='storno'&&num(x.invPaid)>0&&String(x.paidAt||'').slice(0,10)>=lim&&!(x.kind==='dijbekero'&&IV.some(y=>y.ref===x.no)))   /* egy befizetés egyszer: a díjbekérő helyett a belőle készült foglalószámla */.map(x=>{const ps=(typeof invPids==='function'?invPids(x):[x.projectId]).map(projById).filter(Boolean),p=ps[0]||projById(x.projectId);return {x,p,ps,names:ps.map(q=>q.name).filter(Boolean),key:'pay|'+x.id+'|'+num(x.invPaid)};})   // közös számla: minden projektje
    .sort((a,b)=>String(b.x.paidAt||'').localeCompare(String(a.x.paidAt||'')));}
function bellRender(){const w=$('bellW');if(!w)return;const L=bellItems(),on=!ro()&&!isSales()&&(isAdmin()||(S.me&&S.me.role==='editor'));w.classList.toggle('hidden',!on);if(!on)return;
  const myMail=String(S.me&&S.me.email||'').toLowerCase(),dot=w.querySelector('.bell-dot');
  let read=[];try{read=JSON.parse(localStorage.getItem('lpm_bell_read')||'[]');}catch(e){}
  const PY=bellPays(),unread=L.concat(PY).filter(x=>!read.includes(x.key)).length;dot.hidden=!unread;dot.textContent=unread>9?'9+':String(unread||'');   // megnyitás (elolvasás) után eltűnik
  let seen=[];try{seen=JSON.parse(localStorage.getItem('lpm_bell_seen')||'[]');}catch(e){}
  const fresh=L.filter(x=>!seen.includes(x.key)&&x.v.rvBy!==(S.me&&S.me.name));   // a saját küldésedről nem kapsz felugró értesítést
  if(fresh.length&&S._bellInit){const x=fresh[0],t=document.createElement('div');t.className='bell-toast';
    t.innerHTML=`<span class="bt-ic">${BELL_SVG}</span><span class="bt-tx"><b>Ellenőrzésre vár</b><span>${esc(x.v.name)}</span><small>${esc(x.p.name||'')}${x.v.rvBy?' · '+esc(x.v.rvBy):''}${String(x.v.rvTo||'').toLowerCase()===myMail?' · neked':''}</small></span><button type="button" class="bt-x" aria-label="Bezárás">×</button>`;
    t.onclick=e=>{t.remove();if(e.target.closest('.bt-x'))return;ACT['vid-view']({dataset:{pid:x.p.id,vid:x.v.id}});};document.body.appendChild(t);setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),300);},9000);}
  {const fp=PY.filter(x=>!seen.includes(x.key));if(fp.length&&S._bellInit&&!fresh.length){const x=fp[0],t=document.createElement('div');t.className='bell-toast bt-pay';
    t.innerHTML=`<span class="bt-ic">💰</span><span class="bt-tx"><b>Kifizetés érkezett</b><span>${esc((x.p&&x.p.client)||x.x.buyer||'')} · ${esc(ftFmt(num(x.x.invPaid)))}</span><small>${x.names.length?x.names.map(esc).join('<br>'):esc(x.x.no||'')}${fp.length>1?' · +'+(fp.length-1)+' további':''}</small></span><button type="button" class="bt-x" aria-label="Bezárás">×</button>`;
    t.onclick=e=>{t.remove();if(e.target.closest('.bt-x'))return;ACT['bell-pay']({dataset:{no:x.x.no||''}});};document.body.appendChild(t);}}   /* a kifizetés-értesítés csak az ✕-re (vagy rákattintva) tűnik el */
  S._bellInit=true;try{localStorage.setItem('lpm_bell_seen',JSON.stringify(L.map(x=>x.key).concat(PY.map(x=>x.key),seen).slice(0,400)));}catch(e){}
  const pop=$('bellPop');if(pop&&!pop.hidden)pop.innerHTML=bellPopHtml(L,myMail);}
function bellPopHtml(L,myMail){const PY=bellPays();return (isAdmin()?`<h4>💰 Beérkezett kifizetések <span class="bd-n">${PY.length}</span></h4>${PY.length?PY.slice(0,8).map(x=>`<button type="button" class="bell-it" data-action="bell-pay" data-no="${esc(x.x.no||'')}"><b>${esc((x.p&&x.p.client)||x.x.buyer||'—')} · ${esc(ftFmt(num(x.x.invPaid)))}${invPaidOk(x.x)?'':' <span class="muted">(részben)</span>'}</b><small>${x.names.map(esc).join('<br>')}${x.x.no?(x.names.length?'<br>':'')+esc(x.x.no):''}${x.x.paidAt?' · '+esc(fmtMD(x.x.paidAt)):''}</small></button>`).join(''):'<p class="hint" style="margin:6px 10px 10px">Az elmúlt 14 napban nem érkezett kifizetés.</p>'}`:'')+`<h4>Belső ellenőrzésre vár <span class="bd-n">${L.length}</span></h4>${L.length?L.map(x=>`<button type="button" class="bell-it" data-action="bell-open" data-pid="${esc(x.p.id)}" data-vid="${esc(x.v.id)}"><b>${esc(x.v.name)}</b><small>${esc(x.p.name||'')}${x.v.rvBy?' · '+esc(x.v.rvBy):''}${x.v.rvAt?' · '+esc(String(x.v.rvAt).slice(5,16).replace('T',' ')):''}${String(x.v.rvTo||'').toLowerCase()===myMail?' · <span class="me">neked</span>':''}</small>${x.v.note?`<small>💬 ${esc(x.v.note.slice(0,120))}</small>`:''}</button>`).join(''):'<p class="hint" style="margin:6px 10px 10px">Nincs ellenőrzésre váró videó.</p>'}`;}
ACT.bell=()=>{const pop=$('bellPop');if(!pop)return;pop.hidden=!pop.hidden;if(!pop.hidden){const L=bellItems().concat(bellPays());pop.innerHTML=bellPopHtml(bellItems(),String(S.me&&S.me.email||'').toLowerCase());try{localStorage.setItem('lpm_bell_read',JSON.stringify(L.map(x=>x.key)));}catch(e){}bellRender();}};   // megnyitva = elolvasva
ACT['bell-pay']=b=>{const pop=$('bellPop');if(pop)pop.hidden=true;S.blf=Object.assign(S.blf||{v:'honap',q:''},{v:'mind',q:b.dataset.no||''});ACT.tab({dataset:{tab:'szerzodes'}});};
ACT['bell-open']=b=>{const pop=$('bellPop');if(pop)pop.hidden=true;ACT['vid-view'](b);};
document.addEventListener('click',e=>{const pop=$('bellPop');if(pop&&!pop.hidden&&!e.target.closest('#bellW'))pop.hidden=true;});
(window.POST_RENDER=window.POST_RENDER||[]);setInterval(()=>{try{bellRender();}catch(e){}},5000);

const BELL_SVG='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
(()=>{const b=$('bellBtn');if(b){const s=b.querySelector('span');if(s)s.outerHTML=BELL_SVG;}})();
/* Videó megtekintése: beágyazott lejátszó + üzenet; belső ellenőrzésnél jóváhagyás (→ ügyfél jóváhagyására vár) vagy visszadobás indokkal */
function vidEmbed(u){u=String(u||'').trim();let m;
  if((m=/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]{10,})/.exec(u)))return `<iframe src="https://drive.google.com/file/d/${m[1]}/preview" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
  if((m=/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/.exec(u)))return `<iframe data-vert="${/shorts\//.test(u)?1:''}" src="https://www.youtube.com/embed/${m[1]}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  if((m=/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/.exec(u)))return `<iframe src="https://player.vimeo.com/video/${m[1]}${m[2]?'?h='+m[2]:''}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  if(/\.(mp4|webm|mov|m4v)(\?|$)/i.test(u))return `<video src="${esc(u)}" controls controlslist="nodownload noplaybackrate noremoteplayback" disablepictureinpicture disableremoteplayback oncontextmenu="return false" playsinline></video>`;
  if((m=/(?:^|\/\/)(e\.)?(?:u\.)?pcloud\.link\/publink\/show\?code=([\w-]+)/i.exec(u)))return `<div class="vv-pc" data-pc-code="${esc(m[2])}" data-pc-eu="${m[1]?'1':''}"><span class="spin"></span> pCloud videó betöltése…</div>`;   // pCloud: a közvetlen fájlcímet a pCloud API adja
  return '';}
ACT['vid-view']=b=>{const pid=b.dataset.pid,vid=b.dataset.vid,p=projById(pid),v=p&&(p.videos||[]).find(x=>x.id===vid);if(!v)return;const fromLane=!!document.querySelector('#modalRoot .bd-modal')||!!document.querySelector('#modalUnder .bd-modal')||b.dataset.lane==='1'||!!(b.dataset.list==='1'&&window._vvList&&window._vvList.lane);   /* újranyitáskor (pl. link csere, lapozás) a tábla már alul van: az is számít */
  laneToUnder();   /* a videótábla a videóablak alatt látszik marad */
  if(b.dataset.list!=='1'){window._vvList=null;if(b.classList&&b.classList.contains('bd-card')){const cell=b.closest('.bl-cell'),L=cell?[...cell.querySelectorAll('.bd-card')].map(c=>({pid:c.dataset.bdPid,vid:c.dataset.bdVid})):[];if(L.length>1)window._vvList={items:L,i:0,lane:fromLane};}}   /* a kártya oszlopának összes videója lapozható */const VL=window._vvList,li=VL?VL.items.findIndex(x=>x.pid===pid&&x.vid===vid):-1;if(VL&&li>=0)VL.i=li;   /* több videó egymás után (a táblán kijelölve) */
  const mgr=!ro()&&(isAdmin()||(S.me&&S.me.role==='editor')),rev=mgr&&v.st==='ellen'&&p.status!=='atadva',cli=mgr&&v.st==='leadva'&&p.status!=='atadva',mine=v.st==='vagas'&&p.status!=='atadva'&&!!(S.me&&S.me.crewId&&v.editor&&S.me.crewId===v.editor),emb=vidEmbed(v.link);
  try{const L=bellItems().map(x=>x.key);localStorage.setItem('lpm_bell_read',JSON.stringify([...new Set((JSON.parse(localStorage.getItem('lpm_bell_read')||'[]')).concat(L.filter(k=>k.startsWith(pid+'|'+vid+'|'))))]));bellRender();}catch(e){}
  const stL=v.st==='vagas'&&(v.cm||[]).length?'Javítás alatt':(VID_ST.find(x=>x[0]===v.st)||[])[1]||'';   /* visszadobott videó: „Javítás alatt” */
  openModal(v.name,`<p class="hint vv-meta" style="margin:-4px 0 10px">${esc(p.name||'')} · <span class="statuspill ${VID_CLS[v.st]||''}">${esc(stL)}</span>${!v.link&&((v.st==='vagas'&&(!ro()||(S.me&&S.me.crewId&&S.me.crewId===v.editor)))||(!ro()&&(isAdmin()||(S.me&&S.me.role==='editor'))))?` · <button type="button" class="linkbtn" data-action="vid-link" data-pid="${esc(p.id)}" data-vid="${esc(v.id)}">🔗 Link beillesztése</button>`:''}</p>
    <div class="vv-body">${v.link?(emb?`<div class="vv-player">${emb}</div>`:`<div class="vv-noembed">Ez a link nem játszható le itt.</div>`):'<p class="hint">Ehhez a videóhoz még nincs link.</p>'}
    <div class="vv-cm" data-pid="${esc(pid)}" data-vid="${esc(vid)}">${vidCmHtml(v)}</div></div>
    `,
    rev?{submitLabel:'✅ Jóváhagyás',cancelLabel:'Bezárás',noDraft:true,left:`<button type="button" class="btn danger" data-action="vid-reject" data-pid="${esc(pid)}" data-vid="${esc(vid)}">↩ Visszadobás</button>`,submit:async()=>{closeModal();clientModal(pid,vid);}}:cli?{submitLabel:'✅ Ügyfél jóváhagyta',cancelLabel:'Bezárás',noDraft:true,left:`<button type="button" class="btn danger" data-action="vid-reject" data-pid="${esc(pid)}" data-vid="${esc(vid)}">↩ Módosítást kér</button>`,submit:async()=>{bdMove(pid,vid,'jovahagyva');if(!vvNext())closeModal();}}:isAdmin()&&!ro()&&v.st==='jovahagyva'&&p.status!=='atadva'?{cancelLabel:'Bezárás',noDraft:true,left:`<button type="button" class="btn danger" data-action="vid-unapprove" data-pid="${esc(pid)}" data-vid="${esc(vid)}">↩ Jóváhagyás visszavonása</button>`}:mine?{submitLabel:(v.cm||[]).length?'✅ Elkészítettem a javítást':'✅ Elkészült, mehet ellenőrzésre',cancelLabel:'Bezárás',noDraft:true,submit:async()=>{const go=()=>{closeModal();bdMove(pid,vid,'ellen');   /* Mégse / ×: vissza a videóhoz (elküldés után nem) */
        window.MODAL_BEFORE_CLOSE=()=>{const q=projById(pid),w=q&&(q.videos||[]).find(x=>x.id===vid);if(!w||w.st!=='vagas')return null;return ()=>{if(!$('mform'))ACT['vid-view']({dataset:{pid,vid}});};};},left=[...document.querySelectorAll('.vv-cm input[data-vv-done]')].filter(x=>!x.checked).length;
      if(!left){go();return;}   /* maradt kipipálatlan észrevétel: rákérdezünk */
      confirmLayer('Nincs minden kipipálva',`<p style="margin:0 0 4px">Még <b>${left} észrevétel</b> nincs kipipálva. Biztosan elküldöd?</p>`,'Mégis továbbküldöm',(b,layer)=>{layer.remove();go();});}}:{cancelLabel:'Bezárás'});   /* a vágó: javított videó linkje → belső ellenőrzés */
  const mb=document.querySelector('#mform');if(mb&&v.link)mb.classList.add('m-video');{const yf=document.querySelector('.vv-player iframe[data-vert="1"]');if(yf){yf.parentElement.classList.add('vert');yf.parentElement.style.setProperty('--ar','9/16');const bd=yf.closest('.vv-body');if(bd)bd.classList.add('side');}}{const mt=document.querySelector('.vv-meta'),h=document.querySelector('#mform .mhead h3');if(mt&&h){mt.removeAttribute('style');h.classList.add('vv-h');h.appendChild(mt);}}if(mgr){const h=document.querySelector('#mform .mhead h3');if(h){const tn=[...h.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());if(tn){const sp=document.createElement('span');sp.className='vv-title';sp.textContent=tn.textContent;tn.replaceWith(sp);sp.insertAdjacentHTML('afterend',`<button type="button" class="vv-name-edit" data-action="vid-rename" data-pid="${esc(pid)}" data-vid="${esc(vid)}" title="Videó nevének módosítása">✎</button>`);}}}
  if(VL&&VL.items.length>1){const h=document.querySelector('#mform .mhead h3');if(h)h.insertAdjacentHTML('beforeend',`<span class="vv-nav"><button type="button" class="vv-nb" data-action="vv-nav" data-d="-1"${VL.i<=0?' disabled':''} title="Előző videó (⌘/Ctrl + ←)">‹</button><b>${VL.i+1} / ${VL.items.length}</b><button type="button" class="vv-nb" data-action="vv-nav" data-d="1"${VL.i>=VL.items.length-1?' disabled':''} title="Következő videó (⌘/Ctrl + →)">›</button></span>`);
    const sts=VL.items.map(x=>{const q=projById(x.pid),w=q&&(q.videos||[]).find(y=>y.id===x.vid);return w&&q.status!=='atadva'?w.st:'';}),same=sts.every(x=>x===sts[0])&&(sts[0]==='ellen'||sts[0]==='leadva');
    if(mgr&&same){const nv=document.querySelector('#mform .vv-nav');if(nv)nv.insertAdjacentHTML('beforeend',`<button type="button" class="vv-all" data-action="vv-all">${sts[0]==='ellen'?'✅ Mind jóváhagyása':'✅ Mindet jóváhagyta az ügyfél'} (${VL.items.length})</button>`);}}if(emb){const mf=document.querySelector('#mform .mfoot');if(mf){const c=mf.querySelector('.btn.outline');if(c)c.insertAdjacentHTML('afterend',VV_TCW);else mf.insertAdjacentHTML('beforeend',VV_TCW);}}   /* sorrend (CSS): Időkód · Jelölés … (Visszadobás) · Bezárás · (Jóváhagyás) */pcloudLoad();vidTsTick();vvSave({pid,vid,lane:fromLane,t:0,draft:''},true);if(VL)VL.lane=fromLane;window.MODAL_BEFORE_CLOSE=()=>{vvSave(null);vidFlush(pid,vid);return fromLane?()=>ACT['bd-lane']({dataset:{id:pid}}):null;};{const a=document.activeElement;if(a&&a.id==='m-vvCm')a.blur();}};
/* Hozzászólások a videóhoz: egy szövegmező, benne tetszőleges számú időkóddal ([perc:mp.ezred]) – az időkódra kattintva a lejátszó odaugrik.
   A hozzászólás bezáráskor (vagy jóváhagyáskor) mentődik; visszadobáskor a szöveg a visszadobás indoka. Legfrissebb felül. */
/* Időkód: perc:mp:képkocka (01-től) – a képkocka-sebességet a lejátszó méri (amíg nincs mérve: 25). */
const curFps=()=>{const v=document.querySelector('.vv-player video');return (v&&v._fps)||25;};
const tcFmt=s=>{const f=curFps(),fi=Math.round(f),n=Math.max(0,Math.floor((Number(s)||0)*f+0.01)),t=Math.floor(n/fi);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')+':'+String(n%fi+1).padStart(2,'0');};   /* a képkocka 01-től számozva (25 fps-nél 01–25) */
const tcSec=(a,b,c,sep)=>{const t=Number(a)*60+Number(b);if(!c)return t;if(sep===':'){const f=curFps(),fi=Math.round(f);return (t*fi+Math.max(0,Number(c)-1))/f;}return t+Number(c.padEnd(3,'0'))/1000;};
const mmss=tcFmt;
const VV_TCW='<span class="vv-tcw"><button type="button" class="vv-tc-ins" data-action="vid-tc" hidden data-tip="VIDEÓ&#10;• Kattintás a képen: lejátszás / megállítás&#10;• Húzás jobbra-balra a képen: tekerés képkockánként (Shift-tel 10× gyorsabb)&#10;• Szóköz: lejátszás / megállítás · hosszan nyomva: 2× sebesség&#10;• Shift + szóköz nyomva: visszafelé 2×&#10;• ← →: egy képkocka (Shift-tel 10)&#10;&#10;HOZZÁSZÓLÁS&#10;• Enter vagy ez a gomb: időkód beszúrása&#10;• Gépelés a videónál: a szöveg rögtön a hozzászólásba kerül, az aktuális időkód mögé&#10;• Gépelés közben Enter: új sor · ⌘/Ctrl + Enter: a videó folytatódik&#10;• Időkódra kattintás vagy ↑ ↓: a videó odaugrik (és megáll)&#10;• ▶ az időkód mögött: 2 mp lejátszás onnan (vagy a következő időkódig)&#10;• Backspace az időkódon: az egész időkód törlődik&#10;• Bezáráskor a hozzászólás magától mentődik&#10;&#10;JELÖLÉS A KÉPEN&#10;• ⌘/Ctrl + kattintás a képen vagy a Jelölés gomb: számozott jelölő arra a pontra&#10;• A még el nem küldött jelölő húzással áthelyezhető, a kukába húzva törölhető&#10;• A jelölő fölé állva látszik a hozzá tartozó észrevétel">⏱ Időkód beszúrása · <b id="m-vvTsL">0:00:00</b> <kbd class="vv-kbd">Enter</kbd></button><button type="button" class="vv-tc-ins vv-pin-btn" data-action="vid-pin" hidden data-tip="Kattints, majd a képen arra a pontra, amire az észrevétel vonatkozik.&#10;Ctrl + kattintás a képen: ugyanez gomb nélkül&#10;Esc: mégse">📍 Jelölés</button></span>';
const TC_RE=/\[(\d{1,3}):(\d{2})(?:([.,:])(\d{1,3}))?(?:\s*@(\d{1,3}(?:\.\d)?),(\d{1,3}(?:\.\d)?))?\]/g;   /* [p:mp:kk] vagy tűvel: [p:mp:kk @x,y] (x,y: a kép %-ában) */
const tcLinks=h=>h.replace(TC_RE,(m,a,b,sep,c,x,y)=>`<button type="button" class="vv-ts${x?' vv-ts-pin':''}" data-action="vid-seek" data-tc="${a}|${b}|${sep||''}|${c||''}"${x?` data-x="${x}" data-y="${y}"`:''} title="Ugrás ide a videóban">${a}:${b}${c?(sep===':'?':':'.')+c:''}</button><button type="button" class="vv-play" data-action="vid-play" data-tc="${a}|${b}|${sep||''}|${c||''}" title="Lejátszás innen">▶</button>`);
/* Időkód előtt pipa: a vágó (vagy a vezető) kipipálja, amit már javított – a kulcs: <hozzászólás ideje>#<sorszám> */
const vvLocked=v=>!!(ro()||!(isAdmin()||(S.me&&S.me.role==='editor')))&&v.st!=='vagas';   /* a vágó csak utómunka / javítás alatt szólhat hozzá és pipálhat (leadás után nem) */
const tcCanDone=v=>!!(S.me&&S.me.crewId&&v.editor&&S.me.crewId===v.editor)&&!vvLocked(v);   /* csak a javításon dolgozó vágó pipálhat */
const tcDone=(v,c,h)=>{let n=0;const dn=new Set(v.dn||[]),can=tcCanDone(v);return h.replace(/<button type="button" class="vv-ts/g,()=>{const k=String(c.at||'')+'#'+(n++),on=dn.has(k);
  const w=on&&v.dnBy&&v.dnBy[k],who=w?`Kipipálta: ${w.by}${w.at?' · '+String(w.at).slice(5,16).replace('T',' ').replace('-','.'):''}`:'';
  return `<label class="vv-done${on?' on':''}" title="${on?(who?who+(can?' – kattints a visszavonáshoz':''):'Elvégezve'+(can?' – kattints a visszavonáshoz':'')):'Pipáld ki, ha elvégezted'}"><input type="checkbox" data-vv-done="${esc(k)}"${on?' checked':''}${can?'':' disabled'}></label><button type="button" class="vv-ts${on?' done':''}`;});};
document.addEventListener('change',async e=>{const t=e.target;if(!t||!t.dataset||t.dataset.vvDone===undefined)return;const box=document.querySelector('.vv-cm');if(!box)return;
  const pid=box.dataset.pid,vid=box.dataset.vid,key=t.dataset.vvDone,on=t.checked,l=t.closest('.vv-done'),b=l&&l.nextElementSibling;if(l){l.classList.toggle('on',on);l.title=on?'Kipipálta: '+((S.me&&S.me.name)||'')+' · most – kattints a visszavonáshoz':'Pipáld ki, ha elvégezted';}if(b)b.classList.toggle('done',on);
  try{const r=await call('videoCmDone',{projectId:pid,id:vid,key,on});const pr2=r&&r.project;if(pr2){const i=S.projects.findIndex(x=>x.id===pid);if(i>=0)S.projects[i]=normProj(pr2);[S.draft,S.draftBase].forEach(d=>{if(d&&d.id===pid)['videos','updatedAt','updatedBy'].forEach(f=>{d[f]=pr2[f];});});}try{bdRefresh();}catch(x){}}
  catch(err){t.checked=!on;if(l)l.classList.toggle('on',!on);if(b)b.classList.toggle('done',!on);handleErr(err);}});
/* Régi ügyfél-bejegyzések („Ügyfél (e-mail)”): csak a keresztnév látszik */
const cliBy=(by,p)=>{const m=/^Ügyfél \(([^)]*@[^)]*)\)$/.exec(String(by||''));if(!m)return by;const em=m[1].trim().toLowerCase(),cn=String(p&&p.contactName||'').trim();
  if(cn&&String(p.contactEmail||'').trim().toLowerCase()===em)return cn.split(/\s+/).pop();const lp=em.split('@')[0].split(/[._-]/)[0];return lp?lp[0].toUpperCase()+lp.slice(1):'Ügyfél';};
function vidCmItems(v){const P=(S.projects||[]).find(p=>(p.videos||[]).includes(v));v=Object.assign({},v,{fbBy:cliBy(v.fbBy,P),rvBy:cliBy(v.rvBy,P),cm:(v.cm||[]).map(c=>Object.assign({},c,{by:cliBy(c.by,P)}))});const L=(v.cm||[]).map((c,i)=>({by:c.by,at:c.at,idx:i,t:(c.ts!==''&&c.ts!=null?'['+tcFmt(c.ts)+'] ':'')+c.t}));
  const nrm=t=>String(t||'').replace(/^\[[\d:]+\]\s*/,'').replace(/\s+/g,' ').trim();
  if(v.note&&!(v.cm||[]).some(c=>nrm(c.t)===nrm(v.note)))L.push({by:v.rvBy,at:v.rvAt,t:v.note,tag:'🔍 ellenőrzésre küldve',kind:'note'});   // ha ugyanez hozzászólásként is megvan, ne jelenjen meg kétszer
  if(v.fb&&!(v.cm||[]).some(c=>{const x=nrm(String(c.t).replace(/^↩\s*/,'')),y=nrm(v.fb);return x===y||(x.length>20&&y.length>20&&(x.startsWith(y.slice(0,Math.min(x.length,y.length)-3))||y.startsWith(x.slice(0,Math.min(x.length,y.length)-3))))||v.fb.endsWith(String(c.t).replace(/^↩ /,''));}))L.push({by:v.fbBy,at:v.fbAt,t:'↩ '+v.fb,kind:'fb'});
  const D=S._cmDel||{},seen={};return L.filter(c=>{const k=(c.by||'')+'|'+String(c.at||'').replace('T',' ').slice(0,16)+'|'+nrm(String(c.t||'').replace(/^↩\s*/,'')).slice(0,200);if(seen[k])return false;seen[k]=1;return true;}).filter(c=>!D[v.id+'|'+(c.kind||'cm')+'|'+c.at]).sort((x,y)=>cmTk(y.at)-cmTk(x.at));}
/* hozzászólás ideje → időbélyeg (bármilyen formátumból: ISO, „2026-11-10 13:20”, „2026. 11. 10. 13:20”) – a legfrissebb legyen felül */
function cmTk(a){const m=/(\d{4})\D+(\d{1,2})\D+(\d{1,2})(?:\D+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(String(a||''));return m?Date.UTC(+m[1],m[2]-1,+m[3],+(m[4]||0),+(m[5]||0),+(m[6]||0)):0;}
const REP_RE=/^⤷\{([^}]{1,60})\} ?/;   /* válasz egy időkódos észrevételre: „⤷{<hozzászólás ideje>#<sorszám>} szöveg” */
function vidCmBody(v,c,reps){let n=0;const dn=new Set(v.dn||[]),can=tcCanDone(v),me=S.me&&S.me.name;
  return String(c.t||'').split('\n').map(line=>{const h=tcLinks(esc(line));if(h.indexOf('class="vv-ts')<0)return esc(line)+'<br>';let first='';
    const hh=h.replace(/<button type="button" class="vv-ts/g,()=>{const k=String(c.at||'')+'#'+(n++),on=dn.has(k);if(!first)first=k;
      return `<label class="vv-done${on?' on':''}" title="${on?'Elvégezve – kattints a visszavonáshoz':'Pipáld ki, ha elvégezted'}"><input type="checkbox" data-vv-done="${esc(k)}"${on?' checked':''}${can?'':' disabled'}></label><button type="button" class="vv-ts${on?' done':''}`;});
    const R=(reps[first]||[]).map(r=>`<div class="vv-cm-i vv-rep" data-raw="${esc(r.t)}" data-by="${esc(r.by||'')}"><b>${esc(r.by||'')}</b> <span class="muted">· ${esc(String(r.at||'').slice(5,16).replace('T',' '))}</span>${r.idx!=null&&me&&r.by===me&&!S.me.viewAs?`<button type="button" class="vv-cm-del" data-action="vid-cm-del" data-idx="${r.idx}" data-kind="" data-at="${esc(r.at||'')}" title="Válasz törlése">🗑</button>`:''} ${esc(r.t)}</div>`).join('');
    return `<div class="vv-tl">${hh}${v.st==='leadva'||vvLocked(v)?'':`<button type="button" class="vv-rep-btn" data-action="vid-rep" data-key="${esc(first)}" title="Válasz erre az észrevételre">↩ válasz</button>`}${R?`<div class="vv-reps">${R}</div>`:''}</div>`;}).join('').replace(/(<br>)+$/,'');}
function vidCmHtml(v){const L0=vidCmItems(v),reps={},L=[];L0.forEach(c=>{const m=c.kind?null:REP_RE.exec(String(c.t||''));if(m){(reps[m[1]]=reps[m[1]]||[]).push(Object.assign({},c,{t:String(c.t).slice(m[0].length)}));}else L.push(c);});
  Object.keys(reps).forEach(k=>reps[k].sort((x,y)=>String(x.at).localeCompare(String(y.at))));
  const fixM=['vagas','modositas','vagasra'].includes(v.st)&&L.length>0,wait=v.st==='leadva',mgrV=!ro()&&(isAdmin()||(S.me&&S.me.role==='editor'));   // ügyfél jóváhagyására vár: hozzászólni nem lehet (a vezető csak az ügyfél módosítási kérését írhatja be a „Módosítást kér” gombhoz)
  return `<div class="vv-cm-top vv-cm-top1"><h4 class="vv-cm-h">💬 Hozzászólások${L.length?` <span class="bd-n">${L.length}</span>`:''}</h4></div>${L.length&&!wait?'<p class="hint vv-cm-howto">Az időkódok kattinthatók: az időkódra kattintva a videó odaugrik, a mögötte lévő ▶ onnan lejátszik 2 másodpercet (vagy a következő időkódig, ha az előbb jön).'+(tcCanDone(v)?' A jelölőnégyzettel kipipálhatod, amit már elvégeztél.':'')+'</p>':''}${wait?'<p class="hint vv-cm-lock">🔒 Az ügyfél jóváhagyására vár – most nem lehet hozzászólni.'+(mgrV?' Ha az ügyfél módosítást kér, a „Módosítást kér” gombbal írhatod be, mit kér.':'')+'</p>':vvLocked(v)?`<p class="hint vv-cm-lock">🔒 ${v.st==='ellen'?'Leadtad belső ellenőrzésre – amíg az ellenőrzés tart, nem lehet hozzászólni és pipálni.':'A videó már le van adva – most nem lehet hozzászólni és pipálni.'}</p>`:fixM?'':`<div class="vv-cm-new"><textarea class="inp" id="m-vvCm" rows="3" placeholder="${wait?'Ha az ügyfél módosítást kér: írd ide, mit kér (akár időkóddal), és nyomd meg a „Módosítást kér” gombot.':'Írd ide az észrevételeidet – akár többet is, mindegyiket új sorba, időkóddal.'}"></textarea></div>`}
    ${L.length?`<div class="vv-cm-l">${L.map(c=>`<div class="vv-cm-i" data-raw="${esc(c.t)}" data-by="${esc(c.by||'')}"><b>${esc(c.by||'')}</b> <span class="muted">· ${esc(String(c.at||'').slice(0,16).replace('T',' '))}${c.tag?' · '+c.tag:''}</span>${(c.idx!=null||c.kind==='fb')&&S.me&&c.by===S.me.name&&!S.me.viewAs?`<button type="button" class="vv-cm-del" data-action="vid-cm-del" data-idx="${c.idx!=null?c.idx:''}" data-kind="${c.kind||''}" data-at="${esc(c.at||'')}" title="Hozzászólás törlése">🗑</button>`:''}<div>${vidCmBody(v,c,reps)}</div>${(()=>{const gk='g:'+String(c.at||''),me=S.me&&S.me.name,R=(reps[gk]||[]).map(r=>`<div class="vv-cm-i vv-rep" data-raw="${esc(r.t)}" data-by="${esc(r.by||'')}"><b>${esc(r.by||'')}</b> <span class="muted">· ${esc(String(r.at||'').slice(5,16).replace('T',' '))}</span>${r.idx!=null&&me&&r.by===me&&!S.me.viewAs?`<button type="button" class="vv-cm-del" data-action="vid-cm-del" data-idx="${r.idx}" data-kind="" data-at="${esc(r.at||'')}" title="Válasz törlése">🗑</button>`:''} ${esc(r.t)}</div>`).join('');
      return (R?`<div class="vv-reps vv-greps">${R}</div>`:'')+(wait||vvLocked(v)||!c.at?'':`<button type="button" class="vv-grep-btn" data-action="vid-rep" data-key="${esc(gk)}" title="Válasz erre a hozzászólásra">↩ Válasz</button>`);})()}</div>`).join('')}</div>`:''}`;}
function vidAspect(vd){const f=()=>{const pl=vd.closest('.vv-player');if(pl&&vd.videoWidth&&vd.videoHeight>vd.videoWidth){pl.classList.add('vert');pl.style.setProperty('--ar',vd.videoWidth+'/'+vd.videoHeight);const bd=pl.closest('.vv-body');if(bd)bd.classList.add('side');}};if(vd.videoWidth)f();else vd.addEventListener('loadedmetadata',f,{once:true});}
/* Húzással tekerés: a videón nyomva tartott egérrel jobbra = előre, balra = vissza (a lejátszó szélessége ≈ 6 mp),
   a mért képkocka-sebességhez igazítva. Rövid kattintás: indít / megállít. ← →: egy képkocka (megállítva). A kezelősáv (alsó 48 px) érintetlen. */
function vidFps(vd){if(vd._fpsM)return;vd._fpsM=1;const key='lpm_fps|'+vd.currentSrc.split('?')[0].slice(-120);try{const f=Number(localStorage.getItem(key));if(f>0){vd._fps=f;return;}}catch(e){}
  if(!vd.requestVideoFrameCallback)return;const ts=[];let probe=false,t0=0,mu=false;
  const done=()=>{const d=ts.slice(1).map((x,i)=>x-ts[i]).filter(x=>x>0.004).sort((x,y)=>x-y);if(d.length>=6){const f=Math.round(1000/(d[d.length>>1]*1000)*100)/100,std=[23.976,24,25,29.97,30,48,50,59.94,60].find(x=>Math.abs(x-f)<0.6);vd._fps=std||f;try{localStorage.setItem(key,String(vd._fps));}catch(e){}}
    if(probe){vd.pause();vd.currentTime=t0;vd.muted=mu;probe=false;}};
  const cb=(n,m)=>{ts.push(m.mediaTime);if(ts.length<14&&!vd.paused)vd.requestVideoFrameCallback(cb);else done();};
  const start=()=>{ts.length=0;vd.requestVideoFrameCallback(cb);};
  if(!vd.paused)start();else vd.addEventListener('play',start,{once:true});}   /* a képkocka-sebességet az első lejátszáskor méri (megnyitáskor nem indítja el a videót) */
const vidSnap=(vd,t)=>{const f=vd._fps;return f?(Math.round(t*f)+0.001)/f:t;};
function vidScrub(vd){if(vd._scrub)return;vd._scrub=1;vd.tabIndex=-1;const unf=()=>setTimeout(()=>{if(document.activeElement===vd||vd.matches(':focus-within')){const f=$('mform');if(f){if(!f.hasAttribute('tabindex'))f.tabIndex=-1;f.focus({preventScroll:true});}else vd.blur();}},0);['focus','focusin','pointerup','mouseup','click','seeked','volumechange','play','pause'].forEach(ev=>vd.addEventListener(ev,unf));   /* a kezelősáv elnyelné a billentyűket (szóköz, nyilak) – a fókusz visszakerül az ablakra */
const pl=vd.closest('.vv-player');if(!pl)return;let st=null,moved=false;vidFps(vd);
  let pend=null;const seek=t=>{if(vd.seeking){pend=t;return;}pend=null;vd.currentTime=t;};vd.addEventListener('seeked',()=>{if(pend!=null&&Math.abs(pend-vd.currentTime)>1e-4){const t=pend;pend=null;vd.currentTime=t;}});   /* egyszerre csak egy ugrás: így minden megjelenített képkocka a valódi helyén van */
  const inCtl=e=>{const r=vd.getBoundingClientRect();return e.clientY>r.bottom-48;};
  vd.addEventListener('pointerdown',e=>{if(e.button!==0||inCtl(e))return;if(window._vvPinMode||e.ctrlKey||e.metaKey){e.preventDefault();pinPlace(vd,e);return;}const r=vd.getBoundingClientRect();
    st={x:e.clientX,lx:e.clientX,t:vd.currentTime,w:r.width,play:!vd.paused};moved=false;vd.setPointerCapture(e.pointerId);});
  vd.addEventListener('pointermove',e=>{if(!st)return;const dx=e.clientX-st.x;if(!moved&&Math.abs(dx)<6)return;
    if(!moved){moved=true;vd.pause();pl.classList.add('scrubbing');}
    const span=Math.min(vd.duration||6,6),inc=(e.clientX-st.lx)/st.w*span*(e.shiftKey?10:1);st.lx=e.clientX;st.t=Math.max(0,Math.min((vd.duration||1e9)-0.01,st.t+inc));seek(vidSnap(vd,st.t));});   /* Shift-tel 10× gyorsabb */
  const end=e=>{if(!st)return;const was=st;st=null;pl.classList.remove('scrubbing');try{vd.releasePointerCapture(e.pointerId);}catch(x){}
    if(moved){if(was.play)vd.play().catch(()=>{});}else if(e.type==='pointerup'){if(vd.paused)vd.play().catch(()=>{});else vd.pause();}};
  vd.addEventListener('contextmenu',e=>{if(e.ctrlKey)e.preventDefault();});   /* Macen a Ctrl + kattintás helyi menüt nyitna */
  vd.addEventListener('pointerup',end);vd.addEventListener('pointercancel',end);
  vd.addEventListener('click',e=>{if(!inCtl(e)){e.preventDefault();e.stopPropagation();}},true);   /* a böngésző saját kattintás-kezelése helyett a fenti */
  if(!window._vvKeys){window._vvKeys=1;document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&(e.key==='ArrowLeft'||e.key==='ArrowRight')&&window._vvList&&document.querySelector('.vv-cm')){const a=document.activeElement;if(!(a&&a.tagName==='TEXTAREA')){e.preventDefault();e.stopPropagation();vvGo(window._vvList.i+(e.key==='ArrowRight'?1:-1));return;}}if(e.key==='Escape'&&window._vvPinMode){e.preventDefault();e.stopPropagation();pinMode(false);return;}if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight'&&e.key!==' '&&e.key!=='Enter')return;const v=document.querySelector('.vv-player video');if(!v||!v.isConnected)return;
    const a=document.activeElement;
    if(e.key==='Enter'){if(e.isComposing)return;if(e.repeat){e.preventDefault();e.stopPropagation();return;}   /* nyomva tartott Enter: csak egy időkód */if(a&&a.id==='m-vvCm'){if(!(e.metaKey||e.ctrlKey))return;e.preventDefault();e.stopPropagation();a.blur();const f=$('mform');if(f){if(!f.hasAttribute('tabindex'))f.tabIndex=-1;f.focus({preventScroll:true});}v.play().catch(()=>{});return;}   /* gépelés közben Cmd/Ctrl + Enter: vissza a videóhoz, és megy tovább (sima Enter: új sor) */
      if(a&&a!==document.body&&a!==v&&a.id!=='mform'&&a.tagName!=='VIDEO')return;e.preventDefault();e.stopPropagation();ACT['vid-tc']();return;}   /* videó módban Enter: időkód beszúrása */
    if(a&&(a.tagName==='TEXTAREA'||a.tagName==='INPUT'))return;e.preventDefault();e.stopPropagation();
    if(e.key===' '){if(e.repeat||window._vvSp)return;if(e.shiftKey){const sp=window._vvSp={was:v.paused,fast:true};vvRev(sp,v,true);return;}   /* Shift + szóköz nyomva: visszafelé 2× */
      const sp=window._vvSp={was:v.paused,fast:false};sp.t=setTimeout(()=>{sp.fast=true;v.playbackRate=2;v.play().catch(()=>{});const pl=v.closest('.vv-player');if(pl)pl.classList.add('ff');},300);return;}   /* rövid szóköz: indít/megállít (felengedéskor); hosszan nyomva: 2× sebesség, amíg nyomod */v.pause();const f=v._fps||25,step=(e.key==='ArrowRight'?1:-1)*(e.shiftKey?10:1)/f;
    v.currentTime=vidSnap(v,Math.max(0,Math.min((v.duration||1e9)-0.01,v.currentTime+step)));},true);}}
function vidTsTick(){const bt=document.querySelector('.vv-tc-ins');if(!bt)return;const vd=document.querySelector('.vv-player video');if(!vd){setTimeout(()=>{if(document.querySelector('.vv-player video'))vidTsTick();},1500);return;}
  vidAspect(vd);vidScrub(vd);vidPins(vd);taHl();{const noTa=!$('m-vvCm');bt.hidden=noTa;const pb=document.querySelector('.vv-pin-btn');if(pb)pb.hidden=noTa;}   /* javítás alatt nincs új hozzászólás mező: időkód-beszúrás / jelölés sem kell */const upd=mt=>{const x=tcFmt(typeof mt==='number'?mt:vd.currentTime),l=$('m-vvTsL'),c=$('m-vvTc'),ta=$('m-vvCm');if(l)l.textContent=x;if(c)c.textContent=x;if(ta&&!ta.value&&!ta.dataset.reply)ta.placeholder='['+x+'] írd ide az észrevételed…';const g=document.querySelector('.vv-hl .vv-ghost');if(g)g.textContent='['+x+']';};   /* üres mezőben már látszik az aktuális időkód */
  if(vd.requestVideoFrameCallback){const loop=(n,m)=>{if(!vd.isConnected)return;upd(m.mediaTime);pinsShow(vd,m.mediaTime);vd.requestVideoFrameCallback(loop);};vd.requestVideoFrameCallback(loop);}   /* a ténylegesen megjelenített képkocka ideje */
  (vd.requestVideoFrameCallback?['loadedmetadata']:['timeupdate','seeked','loadedmetadata']).forEach(e=>vd.addEventListener(e,upd));   /* egyetlen forrás: a megjelenített képkocka (különben a két érték váltogatna) */upd();}
/* Tűs jelölés (gomb vagy Ctrl + kattintás): a megállított kép egy pontjához kötött észrevétel. A tű a hozzászólásban [p:mp:kk @x,y] alakban él (x,y: a kép %-ában),
   a lejátszón annál a képkockánál (±0,4 mp) jelenik meg; az időkódra kattintva kiemelve. */
function vidRect(vd){const r=vd.getBoundingClientRect(),vw=vd.videoWidth||16,vh=vd.videoHeight||9,s=Math.min(r.width/vw,r.height/vh),w=vw*s,h=vh*s;return {left:(r.width-w)/2,top:(r.height-h)/2,w,h,r};}
function vidPins(vd){const pl=vd.closest('.vv-player');if(!pl||pl.querySelector('.vv-pins'))return;const d=document.createElement('div');d.className='vv-pins';pl.appendChild(d);
  ['seeked','pause','play','loadedmetadata'].forEach(ev=>vd.addEventListener(ev,()=>pinsShow(vd,vd.currentTime)));window.addEventListener('resize',()=>pinsShow(vd,vd.currentTime));}
function pinsAll(){const L=[];let di=0;const add=(txt,draft,by)=>{String(txt||'').split('\n').forEach(line=>{line.replace(TC_RE,(m,a,b,sep,c,x,y,off)=>{if(x){const note=line.slice(off+m.length).split(/\[\d{1,3}:\d{2}/)[0].replace(/^[\s↩]+/,'').trim();
      L.push({t:tcSec(a,b,c,sep),x:+x,y:+y,draft,note,by,di:draft?di++:null});}return m;});});};
  document.querySelectorAll('.vv-cm-i').forEach(el=>add(el.dataset.raw,false,el.dataset.by));const ta=$('m-vvCm');if(ta)add(ta.value,true,'');return L;}
function pinsShow(vd,t){const lay=vd.closest('.vv-player')&&vd.closest('.vv-player').querySelector('.vv-pins');if(!lay)return;const R=vidRect(vd),fc=vd._pinFocus,f=vd._fps||25,win=0.5;   /* a jelölt képkocka ±0,5 mp-es környezetében látszik (megállítva és lejátszás közben is) */
  const L=pinsAll().map((p,i)=>Object.assign(p,{n:i+1})).filter(p=>Math.abs(p.t-t)<=win);if(fc&&Math.abs(fc.t-t)<1.01/f&&!L.some(p=>p.x===fc.x&&p.y===fc.y))L.push(fc);
  const html=L.map(p=>`<span class="vv-pin${p.draft?' draft':''}${fc&&fc.x===p.x&&fc.y===p.y?' focus':''}" style="left:${R.left+R.w*p.x/100}px;top:${R.top+R.h*p.y/100}px"${p.draft?` data-di="${p.di}"`:''} data-tip="${esc((p.by?p.by+': ':p.draft?'(még nincs elküldve – húzással áthelyezhető) ':'')+(p.note||'—'))}"><i>${p.n||'•'}</i></span>`).join('');
  if(lay._h!==html){lay._h=html;lay.innerHTML=html;}}   /* csak változáskor rajzolunk újra (különben a hover-súgó villogna) */
/* A még el nem küldött jelölő húzással áthelyezhető: a szövegmezőben a hozzá tartozó [.. @x,y] is frissül */
document.addEventListener('pointerdown',e=>{const pin=e.target.closest&&e.target.closest('.vv-pin.draft');if(!pin||e.button!==0)return;const vd=document.querySelector('.vv-player video'),ta=$('m-vvCm');if(!vd||!ta)return;
  e.preventDefault();e.stopPropagation();const di=Number(pin.dataset.di),R=vidRect(vd),qt=document.querySelector('.qtip');if(qt)qt.style.display='none';pin.setPointerCapture(e.pointerId);pin.classList.add('drag');let nx=null,ny=null,hot=false;const pl=vd.closest('.vv-player'),tr=document.createElement('div');tr.className='vv-trash';tr.innerHTML='🗑<span>Húzd ide a törléshez</span>';document.body.appendChild(tr);{const pr=pl.getBoundingClientRect();tr.style.left=(pr.left+pr.width/2)+'px';tr.style.top=(pr.bottom+10)+'px';}   /* a kuka a videó ALATT van, így a kép egyetlen része sincs letakarva */
  const mv=ev=>{nx=Math.max(0,Math.min(100,(ev.clientX-R.r.left-R.left)/R.w*100));ny=Math.max(0,Math.min(100,(ev.clientY-R.r.top-R.top)/R.h*100));pin.style.left=(R.left+R.w*nx/100)+'px';pin.style.top=(R.top+R.h*ny/100)+'px';const tb=tr.getBoundingClientRect();hot=ev.clientX>=tb.left-10&&ev.clientX<=tb.right+10&&ev.clientY>=tb.top-10&&ev.clientY<=tb.bottom+10;tr.classList.toggle('hot',hot);pin.classList.toggle('del',hot);};
  const up=()=>{pin.removeEventListener('pointermove',mv);pin.removeEventListener('pointerup',up);pin.removeEventListener('pointercancel',up);pin.classList.remove('drag');tr.remove();if(nx==null)return;vd._pinFocus=null;
    if(hot){let k=0;ta.value=ta.value.replace(new RegExp(TC_RE.source+' ?','g'),(m,a,b,sep,c,x,y)=>{if(!x)return m;return k++===di?'':m;}).replace(/\n{2,}/g,'\n').replace(/^\n/,'');taHl();const lay=pin.parentElement;if(lay)lay._h=null;pinsShow(vd,vd.currentTime);toast('🗑 Jelölés törölve');return;}
    let k=0;const X=Math.round(nx*10)/10,Y=Math.round(ny*10)/10;ta.value=ta.value.replace(TC_RE,(m,a,b,sep,c,x,y)=>{if(!x)return m;if(k++!==di)return m;return '['+a+':'+b+(c?(sep||':')+c:'')+' @'+X+','+Y+']';});
    taHl();const lay=pin.parentElement;if(lay)lay._h=null;pinsShow(vd,vd.currentTime);};
  pin.addEventListener('pointermove',mv);pin.addEventListener('pointerup',up);pin.addEventListener('pointercancel',up);},true);
function pinMode(on){window._vvPinMode=!!on;const pl=document.querySelector('.vv-player'),pb=document.querySelector('.vv-pin-btn');if(pl)pl.classList.toggle('pin-mode',!!on);if(pb)pb.classList.toggle('on',!!on);
  if(on){const vd=document.querySelector('.vv-player video');if(vd)vd.pause();}if(pb)pb.textContent=on?'✕ Jelölés vége':'📍 Jelölés';}
ACT['vid-pin']=()=>pinMode(!window._vvPinMode);
/* Visszafelé 2× (Shift + szóköz): a böngésző nem tud visszafelé lejátszani, ezért képkockánként lépünk hátra */
function vvRev(sp,v,on){const pl=v.closest('.vv-player');if(on){if(sp.rev)return;clearTimeout(sp.t);sp.rev=true;sp.fast=true;v.playbackRate=1;v.pause();if(pl){pl.classList.remove('ff');pl.classList.add('rw');}let last=performance.now(),tg=v.currentTime;
    const step=now=>{if(window._vvSp!==sp||!sp.rev)return;tg=Math.max(0,tg-(now-last)/1000*2);last=now;if(!v.seeking)v.currentTime=tg;if(tg>0)sp.raf=requestAnimationFrame(step);};sp.raf=requestAnimationFrame(step);}
  else{sp.rev=false;cancelAnimationFrame(sp.raf);if(pl)pl.classList.remove('rw');}}
/* Szóköz nyomva tartása közben Shift: átvált visszafelé; Shift elengedése (a szóköz még nyomva): előre 2× */
document.addEventListener('keydown',e=>{if(e.key!=='Shift'||e.repeat)return;const sp=window._vvSp,v=document.querySelector('.vv-player video');if(!sp||!v)return;vvRev(sp,v,true);},true);
document.addEventListener('keyup',e=>{if(e.key!=='Shift')return;const sp=window._vvSp,v=document.querySelector('.vv-player video');if(!sp||!v||!sp.rev)return;vvRev(sp,v,false);sp.fast=true;v.playbackRate=2;v.play().catch(()=>{});const pl=v.closest('.vv-player');if(pl)pl.classList.add('ff');},true);
/* Ha a lejátszó kezelősávja kapta meg a fókuszt, a böngésző a szóköz FELENGEDÉSEKOR is megnyomná a fókuszált gombot (és visszaállítaná, amit a lenyomás elindított) */
document.addEventListener('keyup',e=>{if(e.key!==' '&&e.key!=='Enter')return;const v=document.querySelector('.vv-player video');if(!v||!v.isConnected)return;const a=document.activeElement;if(a&&(a.tagName==='TEXTAREA'||a.tagName==='INPUT'))return;e.preventDefault();e.stopPropagation();
  if(e.key===' '&&window._vvSp){const sp=window._vvSp;window._vvSp=null;clearTimeout(sp.t);if(sp.rev){vvRev(sp,v,false);if(!sp.was)v.play().catch(()=>{});return;}if(sp.fast){v.playbackRate=1;const pl=v.closest('.vv-player');if(pl)pl.classList.remove('ff');if(sp.was)v.pause();}else{if(v.paused)v.play().catch(()=>{});else v.pause();}}},true);
window.addEventListener('blur',()=>{const sp=window._vvSp;if(!sp)return;window._vvSp=null;clearTimeout(sp.t);document.querySelectorAll('.vv-player.rw,.vv-player.ff').forEach(x=>x.classList.remove('rw','ff'));const v=document.querySelector('.vv-player video');if(v&&sp.fast){v.playbackRate=1;if(sp.was)v.pause();}});
document.addEventListener('keypress',e=>{if(e.key!==' ')return;const v=document.querySelector('.vv-player video');if(!v||!v.isConnected)return;const a=document.activeElement;if(a&&(a.tagName==='TEXTAREA'||a.tagName==='INPUT'))return;e.preventDefault();},true);
/* Ctrl / Cmd nyomva tartva: a videó fölött célkereszt jelzi, hogy kattintásra jelölő kerül a képre */
{const hint=on=>{const pl=document.querySelector('.vv-player');if(pl)pl.classList.toggle('pin-hint',on);};
  document.addEventListener('keydown',e=>{if(e.key==='Meta'||e.key==='Control')hint(true);});document.addEventListener('keyup',e=>{if(e.key==='Meta'||e.key==='Control'||!(e.metaKey||e.ctrlKey))hint(false);});
  window.addEventListener('blur',()=>hint(false));document.addEventListener('mousemove',e=>{const pl=document.querySelector('.vv-player');if(pl&&pl.classList.contains('pin-hint')!==(e.metaKey||e.ctrlKey))hint(e.metaKey||e.ctrlKey);},{passive:true});}
/* A szövegmezőben az időkódok kiemelve (a mező mögötti tükörrétegen) és kattinthatók: a lejátszó odaugrik, tűnél a tű is megjelenik */
function taHl(){const ta=$('m-vvCm');if(!ta)return;let hl=ta.parentElement.querySelector('.vv-hl');
  if(!hl){hl=document.createElement('div');hl.className='vv-hl';hl.setAttribute('aria-hidden','true');ta.parentElement.insertBefore(hl,ta);
    const cs=getComputedStyle(ta);['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','boxSizing','textIndent'].forEach(k=>{hl.style[k]=cs[k];});
    ta.addEventListener('focus',taHl);ta.addEventListener('blur',taHl);ta.addEventListener('input',()=>{taHl();const v=document.querySelector('.vv-player video');if(v)pinsShow(v,v.currentTime);});ta.addEventListener('scroll',()=>{hl.scrollTop=ta.scrollTop;});new ResizeObserver(()=>{hl.style.width=ta.offsetWidth+'px';hl.style.height=ta.offsetHeight+'px';}).observe(ta);}
  hl.style.width=ta.offsetWidth+'px';hl.style.height=ta.offsetHeight+'px';
  {const c2=getComputedStyle(ta),sb=Math.max(0,ta.offsetWidth-ta.clientWidth-(parseFloat(c2.borderLeftWidth)||0)-(parseFloat(c2.borderRightWidth)||0));hl.style.paddingRight=((parseFloat(c2.paddingRight)||0)+sb)+'px';}   /* a szövegmező görgetősávja keskenyebbé teszi a sort: a kiemelés is ugyanott törjön */
  hl.innerHTML=esc(ta.value).replace(TC_RE,(m,a,b,sep,c,x,y)=>`<mark data-tc="${a}|${b}|${sep||''}|${c||''}"${x?` data-x="${x}" data-y="${y}"`:''}>${m}</mark>`)+(ta.value&&document.activeElement!==ta&&!ta.dataset.reply?(/\n$/.test(ta.value)?'':'\n')+'<span class="vv-ghost">'+(()=>{const v=document.querySelector('.vv-player video');return v?'['+tcFmt(v.currentTime)+']':'';})()+'</span>':'')+'\n';   /* gépelés után: a következő (élő) időkód halványan a szöveg alatt – Enterrel kerül be */hl.scrollTop=ta.scrollTop;}
/* Üres mezőbe kattintva az aktuális időkód már ott van (a videó megáll) */
document.addEventListener('focusin',e=>{const ta=e.target;if(!ta||ta.id!=='m-vvCm'||ta.value.trim()||ta.dataset.reply)return;const vd=document.querySelector('.vv-player video');if(!vd||!vd.isConnected||!vd.readyState)return;
  vd.pause();ta.value='['+tcFmt(vd.currentTime)+'] ';taHl();setTimeout(()=>{const n=ta.value.length;ta.setSelectionRange(n,n);},0);});
/* Backspace / Delete egy időkódon: az egész időkód egyszerre törlődik (nem karakterenként) */
document.addEventListener('keydown',e=>{const ta=e.target;if(!ta||ta.id!=='m-vvCm'||(e.key!=='Backspace'&&e.key!=='Delete')||ta.selectionStart!==ta.selectionEnd)return;const pos=ta.selectionStart,v=ta.value;let hit=null;
  v.replace(TC_RE,(m,...g)=>{const off=g[g.length-2],end=off+m.length,endSp=v[end]===' '?end+1:end;
    if(e.key==='Backspace'?(pos>off&&pos<=endSp):(pos>=off&&pos<end))hit={s:off,e:endSp};return m;});
  if(!hit)return;e.preventDefault();ta.value=v.slice(0,hit.s)+v.slice(hit.e);ta.setSelectionRange(hit.s,hit.s);ta.dispatchEvent(new Event('input',{bubbles:true}));});
/* ↑ ↓ a szövegmezőben: a kurzor soráról a videó az adott időkódra ugrik, a kurzor az időkód mögé kerül */
document.addEventListener('keyup',e=>{const ta=e.target;if(!ta||ta.id!=='m-vvCm'||(e.key!=='ArrowUp'&&e.key!=='ArrowDown'))return;const vd=document.querySelector('.vv-player video');if(!vd)return;
  const pos=ta.selectionStart,v=ta.value,ls=v.lastIndexOf('\n',pos-1)+1,le=(v.indexOf('\n',pos)+1||v.length+1)-1,line=v.slice(ls,le);TC_RE.lastIndex=0;const m=TC_RE.exec(line);TC_RE.lastIndex=0;if(!m)return;
  vd.pause();vd.currentTime=vidSnap(vd,tcSec(m[1],m[2],m[4],m[3]));vd._pinFocus=m[5]?{x:+m[5],y:+m[6],t:vd.currentTime}:null;
  let end=ls+m.index+m[0].length;if(v[end]===' ')end++;if(pos<end)ta.setSelectionRange(end,end);
  const k=(v.slice(0,ls+m.index).match(TC_RE)||[]).length,mk=[...ta.parentElement.querySelectorAll('.vv-hl mark')][k];if(mk)hlFocus(mk);});
const taHit=e=>{const ta=$('m-vvCm'),hl=ta&&ta.parentElement.querySelector('.vv-hl');if(!hl)return null;for(const mk of hl.querySelectorAll('mark'))for(const r of mk.getClientRects())if(e.clientX>=r.left-2&&e.clientX<=r.right+2&&e.clientY>=r.top-1&&e.clientY<=r.bottom+1)return mk;return null;};
document.addEventListener('mousemove',e=>{if(!e.target||e.target.id!=='m-vvCm')return;e.target.style.cursor=taHit(e)?'pointer':'';});
document.addEventListener('click',e=>{const ta=e.target;if(!ta||ta.id!=='m-vvCm')return;const vd=document.querySelector('.vv-player video'),mk=taHit(e);if(!vd||!mk)return;
  const q=mk.dataset.tc.split('|');vd.pause();vd.currentTime=vidSnap(vd,tcSec(q[0],q[1],q[3],q[2]));vd._pinFocus=mk.dataset.x?{x:+mk.dataset.x,y:+mk.dataset.y,t:vd.currentTime}:null;
  hlFocus(mk);const k=[...mk.parentElement.querySelectorAll('mark')].indexOf(mk);let i=0,end=-1;ta.value.replace(TC_RE,(m,...g)=>{const off=g[g.length-2];if(i++===k)end=off+m.length;return m;});
  if(end>=0){if(ta.value[end]===' ')end++;else{ta.value=ta.value.slice(0,end)+' '+ta.value.slice(end);end++;taHl();hlFocus([...ta.parentElement.querySelectorAll('.vv-hl mark')][k]);}ta.focus();ta.setSelectionRange(end,end);}});   /* a kurzor az időkód mögé ugrik: lehet írni */
function hlFocus(mk){mk.parentElement.querySelectorAll('mark.on').forEach(x=>x.classList.remove('on'));mk.classList.add('on');}
function pinPlace(vd,e){const R=vidRect(vd),x=(e.clientX-R.r.left-R.left)/R.w*100,y=(e.clientY-R.r.top-R.top)/R.h*100;pinMode(false);if(x<0||x>100||y<0||y>100)return;vd.pause();
  ACT['vid-tc']({x:Math.round(x*10)/10,y:Math.round(y*10)/10});pinsShow(vd,vd.currentTime);}
/* a hozzászólásban hol állt utoljára a kurzor: oda kerül az új időkód (nem a szöveg végére), akkor is, ha közben a videóra kattintottál */
const vvCaretSave=ta=>{if(ta&&ta.id==='m-vvCm')window._vvCaret={s:ta.selectionStart,e:ta.selectionEnd,v:ta.value};};
['keyup','mouseup','input','select','blur'].forEach(ev=>document.addEventListener(ev,e=>vvCaretSave(e.target),true));
const vvCaretRestore=ta=>{const c=window._vvCaret;if(document.activeElement!==ta&&c&&c.v===ta.value&&c.s!=null)ta.setSelectionRange(c.s,c.e);};
ACT['vid-tc']=pin=>{const vd=document.querySelector('.vv-player video'),ta=$('m-vvCm');if(!vd||!ta)return;vd.pause();pin=pin&&pin.x!=null?pin:null;vvCaretRestore(ta);const sT=ta.scrollTop,keep=()=>{ta.scrollTop=ta.selectionStart>=ta.value.trimEnd().length?ta.scrollHeight:sT;ta.dispatchEvent(new Event('scroll'));};   /* a beszúrás ne görgesse a mezőt a lista aljára */
  const tc='['+tcFmt(vd.currentTime)+(pin?' @'+pin.x+','+pin.y:'')+'] ',v0=ta.value,st=ta.selectionStart??v0.length,ls=v0.lastIndexOf('\n',st-1)+1,le=(v0.indexOf('\n',st)+1||v0.length+1)-1,line=v0.slice(ls,le);
  TC_RE.lastIndex=0;const bare=line.trim()&&!line.replace(TC_RE,'').trim();TC_RE.lastIndex=0;   /* a kurzor sorában csak egy szöveg nélküli időkód van: azt cseréljük, nem kezdünk új sort */
  if(bare){ta.value=v0.slice(0,ls)+tc+v0.slice(le);taHl();const c=ls+tc.length;ta.focus({preventScroll:true});ta.setSelectionRange(c,c);keep();vvCaretSave(ta);return;}
  const pre=v0.slice(0,st),nl=pre&&!/\n$/.test(pre)?'\n':'';
  const rest=v0.slice(ta.selectionEnd??st),nl2=rest&&!/^\n/.test(rest)?'\n':'';   // a kurzor utáni szöveg a saját sorában marad
  ta.value=pre+nl+tc+nl2+rest;taHl();const c=(pre+nl+tc).length;ta.focus({preventScroll:true});ta.setSelectionRange(c,c);keep();vvCaretSave(ta);};
/* Megállított (vagy futó) videónál elkezdesz gépelni: a betű már a hozzászólásba megy, az aktuális időkód mögé */
document.addEventListener('keydown',e=>{if(e.key.length!==1||e.key===' '||e.metaKey||e.ctrlKey||e.altKey||e.isComposing)return;const v=document.querySelector('.vv-player video'),ta=$('m-vvCm');if(!v||!v.isConnected||!ta)return;
  const a=document.activeElement;if(a&&(a.tagName==='TEXTAREA'||a.tagName==='INPUT'||a.isContentEditable))return;
  if(ta.dataset.reply){ta.focus();return;}const c=window._vvCaret;if(!(c&&c.v===ta.value&&c.s!=null))ta.setSelectionRange(ta.value.length,ta.value.length);if(ta.value.trim()){ACT['vid-tc']();}else ta.focus();},true);
/* ▶ az időkód mögött: onnan lejátszás; játszás közben újra megnyomva megáll. Az időkódra kattintás csak odaugrik. */
ACT['vid-unapprove']=b=>{const pid=b.dataset.pid,vid=b.dataset.vid;confirmLayer('Jóváhagyás visszavonása','<p style="margin:0">A videó visszakerül az „Utómunka alatt” oszlopba (pl. ha az ügyfél utólag mégis módosítást kér). Csak az ügyvezető teheti meg.</p>','Visszavonás',(bt,layer)=>{layer.remove();closeModal();bdMove(pid,vid,'vagas');});};
ACT['vid-play']=b=>{const vd=document.querySelector('.vv-player video');if(!vd)return;const icon=()=>document.querySelectorAll('.vv-play').forEach(x=>{x.textContent=x===vd._playBtn&&!vd.paused?'⏸':'▶';x.classList.toggle('on',x===vd._playBtn&&!vd.paused);});
  if(!vd._playIco){vd._playIco=1;['play','pause','ended'].forEach(t=>vd.addEventListener(t,icon));}
  if(!vd.paused&&vd._playBtn&&vd._playBtn.dataset.tc===b.dataset.tc){vd.pause();return;}vd._playBtn=b;ACT['vid-seek']({dataset:{tc:b.dataset.tc,play:'1'}});
  /* csak egy rövid részt játszik le: legfeljebb 2 mp-et, vagy a következő időkódig, ha az előbb jön */
  const sec=tc=>{const q=String(tc||'').split('|');return vidSnap(vd,tcSec(q[0],q[1],q[3],q[2]));},t0=sec(b.dataset.tc),nx=[...document.querySelectorAll('.vv-cm .vv-ts[data-tc]')].map(x=>sec(x.dataset.tc)).filter(x=>x>t0+0.02).sort((x,y)=>x-y)[0],end=Math.min(t0+2,nx!=null?nx:Infinity),tok=vd._clipTok=(vd._clipTok||0)+1;
  const T1=Date.now()+15000,watch=()=>{if(vd._clipTok!==tok||vd._playBtn!==b||Date.now()>T1)return;if(!vd.paused&&vd.currentTime>=end-0.02){vd.pause();vd.currentTime=end;return;}if(!vd.paused||vd.currentTime<t0+0.05)requestAnimationFrame(watch);};setTimeout(()=>requestAnimationFrame(watch),50);};
ACT['vid-seek']=b=>{const vd=document.querySelector('.vv-player video');if(!vd){toast('Ennél a lejátszónál az időpontra ugrás nem érhető el – keresd meg kézzel.',true);return;}const q=String(b.dataset.tc||'').split('|');vd.pause();if(b.dataset.play)setTimeout(()=>vd.play().catch(()=>{}),0);   /* időkódra kattintva oda ugrik és el is indul (a jelölős időkódnál megáll, hogy a jelölő látsszon) */vd.currentTime=b.dataset.tc?vidSnap(vd,tcSec(q[0],q[1],q[3],q[2])):Number(b.dataset.ts)||0;vd._pinFocus=b.dataset.x?{x:+b.dataset.x,y:+b.dataset.y,t:vd.currentTime}:null;};
/* A videótábla ablakának másolata a következő ablak alá kerül (halványan látszik); visszaadja a projekt azonosítóját, ha volt tábla */
function laneToUnder(){const lm=document.querySelector('#modalRoot .bd-modal');if(!lm)return '';let mu=$('modalUnder');if(!mu){mu=document.createElement('div');mu.id='modalUnder';document.body.insertBefore(mu,$('modalRoot'));}
  const m=lm.closest('.modal');if(m){mu.innerHTML=m.outerHTML;mu.querySelectorAll('[id]').forEach(x=>x.id=x.id+'-u');}return lm.dataset.pid||'';}
/* Kijelölt videók egymás után: ‹ › a címsorban, jóváhagyás / visszadobás után a következő jön; „Mind jóváhagyása” egyszerre */
function vvGo(i){const VL=window._vvList;if(!VL||i<0||i>=VL.items.length)return false;const box=document.querySelector('.vv-cm');if(box){const f=window.MODAL_BEFORE_CLOSE;window.MODAL_BEFORE_CLOSE=null;vidFlush(box.dataset.pid,box.dataset.vid);}
  const x=VL.items[i];ACT['vid-view']({dataset:{pid:x.pid,vid:x.vid,list:'1',lane:VL.lane?'1':''}});return true;}
function vvNext(){const VL=window._vvList;if(!VL)return false;return vvGo(VL.i+1);}
ACT['vv-nav']=b=>{const VL=window._vvList;if(VL)vvGo(VL.i+Number(b.dataset.d||0));};
ACT['vv-all']=()=>{const VL=window._vvList;if(!VL)return;const box=document.querySelector('.vv-cm');if(box)vidFlush(box.dataset.pid,box.dataset.vid);const L=VL.items.slice();
  L.forEach(x=>{const q=projById(x.pid),w=q&&(q.videos||[]).find(y=>y.id===x.vid);if(w&&(w.st==='ellen'||w.st==='leadva'))bdMove(x.pid,x.vid,w.st==='ellen'?'leadva':'jovahagyva',w.st==='ellen'?{noMail:true}:undefined);});window._vvList=null;closeModal();toast('✅ '+L.length+' videó jóváhagyva');};
/* Kijelölés a videótáblán: ⌘/Ctrl/Shift + kattintás a kártyán; a kijelöltek egymás után nézhetők át */
S._bdSel=S._bdSel||[];
function bdSelBar(){let bar=$('bdSelBar');const n=S._bdSel.length;if(!n){if(bar)bar.remove();document.querySelectorAll('.bd-card.sel').forEach(c=>c.classList.remove('sel'));return;}
  if(!bar){bar=document.createElement('div');bar.id='bdSelBar';bar.className='bd-selbar';document.body.appendChild(bar);}
  bar.innerHTML=`<b>${n} videó kijelölve</b><button type="button" class="btn primary" data-action="bd-sel-play">▶ Átnézés egymás után</button><button type="button" class="btn outline" data-action="bd-sel-clear">Kijelölés törlése</button>`;
  document.querySelectorAll('.bd-card').forEach(c=>c.classList.toggle('sel',S._bdSel.includes(c.dataset.bdPid+'|'+c.dataset.bdVid)));}
document.addEventListener('click',e=>{const c=e.target.closest&&e.target.closest('.bd-card');if(!c||!(e.metaKey||e.ctrlKey||e.shiftKey)||e.target.closest('button'))return;e.preventDefault();e.stopPropagation();
  const k=c.dataset.bdPid+'|'+c.dataset.bdVid,i=S._bdSel.indexOf(k);if(i>=0)S._bdSel.splice(i,1);else S._bdSel.push(k);bdSelBar();},true);
ACT['bd-sel-clear']=()=>{S._bdSel=[];bdSelBar();};
ACT['bd-sel-play']=()=>{const items=S._bdSel.map(k=>{const [pid,vid]=k.split('|');return {pid,vid};}).filter(x=>{const q=projById(x.pid);return q&&(q.videos||[]).some(y=>y.id===x.vid);});if(!items.length)return;
  window._vvList={items,i:0,lane:!!document.querySelector('#modalRoot .bd-modal')};S._bdSel=[];bdSelBar();ACT['vid-view']({dataset:{pid:items[0].pid,vid:items[0].vid,list:'1'}});};
ACT['bd-col-play']=b=>{const col=b.dataset.col,pid=b.dataset.pid||'';const items=[...document.querySelectorAll(`.bl-cell[data-bd-col="${col}"] .bd-card`)].filter(c=>!pid||c.dataset.bdPid===pid).map(c=>({pid:c.dataset.bdPid,vid:c.dataset.bdVid}));if(!items.length)return;
  window._vvList={items,i:0,lane:!!document.querySelector('#modalRoot .bd-modal')};ACT['vid-view']({dataset:{pid:items[0].pid,vid:items[0].vid,list:'1'}});};
ACT['vid-rename']=b=>{const sp=document.querySelector('#mform .vv-title');if(!sp||sp.querySelector('input'))return;const pid=b.dataset.pid,vid=b.dataset.vid,p=projById(pid),v=p&&(p.videos||[]).find(x=>x.id===vid);if(!v)return;
  const inp=document.createElement('input');inp.className='inp vv-name-in';inp.value=v.name;sp.textContent='';sp.appendChild(inp);b.hidden=true;inp.focus();inp.select();let done=false;
  const fin=async ok=>{if(done)return;done=true;const nm=inp.value.trim();sp.textContent=''+(ok&&nm?nm:v.name);b.hidden=false;if(!ok||!nm||nm===v.name)return;
    try{const r=await call('videoSet',{projectId:pid,id:vid,name:nm});const pr2=r&&r.project;if(pr2){const i=S.projects.findIndex(x=>x.id===pid);if(i>=0)S.projects[i]=normProj(pr2);[S.draft,S.draftBase].forEach(d=>{if(d&&d.id===pid)['videos','updatedAt','updatedBy'].forEach(f=>{d[f]=pr2[f];});});}toast('✏️ Átnevezve');try{bdRefresh();}catch(e){}}catch(e){sp.textContent=''+v.name;handleErr(e);}};
  inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();fin(true);}else if(e.key==='Escape'){e.preventDefault();fin(false);}});inp.addEventListener('blur',()=>fin(true));};
/* A videó linkjének cseréje (pl. a pCloud-link elérte a forgalmi limitet): a vezető vagy a videó vágója */
ACT['vid-link']=b=>{const pid=b.dataset.pid,vid=b.dataset.vid,p=projById(pid),v=p&&(p.videos||[]).find(x=>x.id===vid);if(!v)return;if(v.st!=='vagas'&&!(!v.link&&!ro()&&(isAdmin()||(S.me&&S.me.role==='editor')))){toast('Linket csak „Utómunka alatt” állapotban lehet beilleszteni (vagy belső ellenőrzésre küldéskor).',true);return;}
  confirmLayer('🔗 A videó linkje',`<div style="margin:0 16px"><input class="inp" id="vid-link-in" type="url" autocomplete="off" placeholder="https://…" value="${esc(v.link||'')}" aria-label="A videó linkje"><p class="hint" style="margin:6px 0 0">Illeszd be az új pCloud- (vagy más) linket. A hozzászólások és az állapot megmaradnak.</p></div>`,'Mentés',async()=>{
    const ln=(($('vid-link-in')||{}).value||'').trim();if(!/^https?:\/\/\S+$/i.test(ln)){toast('Illeszd be a videó linkjét (https://…).',true);return;}
    try{const r=await call('videoSet',{projectId:pid,id:vid,link:ln});const pr2=r&&r.project;if(pr2){const i=S.projects.findIndex(x=>x.id===pid);if(i>=0)S.projects[i]=normProj(pr2);[S.draft,S.draftBase].forEach(d=>{if(d&&d.id===pid)['videos','updatedAt','updatedBy'].forEach(f=>{d[f]=pr2[f];});});}
      const l=$('modalRoot').querySelector('.cf-layer');if(l)l.remove();toast('🔗 Új link mentve');try{bdRefresh();}catch(e){}ACT['vid-view']({dataset:{pid,vid,list:window._vvList?'1':'',lane:document.querySelector('#modalUnder .bd-modal')?'1':''}});}catch(e){handleErr(e);}});
  setTimeout(()=>{const i=$('vid-link-in');if(i){i.focus();i.select();i.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();const ok=document.querySelector('.cf-layer [data-cf=ok]');if(ok)ok.click();}});}},30);};
/* Válasz egy időkódos észrevételre (pl. javítás után: „kész, de…”): a sor alatt nyíló mező, Enterre mentődik */
ACT['vid-rep']=b=>{const gen=b.classList.contains('vv-grep-btn'),tl=gen?b.closest('.vv-cm-i'):b.closest('.vv-tl');if(!tl)return;let f=gen?tl.querySelector(':scope>.vv-rep-in'):tl.querySelector('.vv-rep-in');if(f){f.focus();return;}
  f=document.createElement('input');f.className='inp vv-rep-in';f.placeholder=(gen?'Válasz erre a hozzászólásra…':'Válasz erre az észrevételre…')+' (Enter: küldés, Esc: mégse)';f.autocomplete='off';if(gen)tl.appendChild(f);else b.after(f);f.focus();
  f.addEventListener('keydown',async e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();f.remove();return;}if(e.key!=='Enter')return;e.preventDefault();const txt=f.value.trim();if(!txt)return;
    const box=document.querySelector('.vv-cm');if(!box)return;const pid=box.dataset.pid,vid=box.dataset.vid;f.disabled=true;
    try{const r=await call('videoComment',{projectId:pid,id:vid,text:'⤷{'+b.dataset.key+'} '+txt,ts:''});const pr2=r&&r.project;if(pr2){const i=S.projects.findIndex(x=>x.id===pid);if(i>=0)S.projects[i]=normProj(pr2);[S.draft,S.draftBase].forEach(d=>{if(d&&d.id===pid)['videos','updatedAt','updatedBy'].forEach(f2=>{d[f2]=pr2[f2];});});}
      const bx=document.querySelector('.vv-cm'),p=projById(pid),v=p&&(p.videos||[]).find(x=>x.id===vid);if(bx&&v&&bx.dataset.vid===vid){const ta=$('m-vvCm'),keep=ta?ta.value:'';bx.innerHTML=vidCmHtml(v);const t2=$('m-vvCm');if(t2&&keep){t2.value=keep;taHl();}vidTsTick();}
      toast('💬 Válasz elmentve');try{bdApply(pid);bdRefresh();}catch(x){}}catch(err){f.disabled=false;handleErr(err);}});};
let VV_DEL_Q=Promise.resolve();
ACT['vid-cm-del']=b=>{const box=document.querySelector('.vv-cm');if(!box)return;const it=b.closest('.vv-cm-i');if(it.dataset.confirm!=='1'){it.dataset.confirm='1';b.textContent='Biztos? 🗑';b.classList.add('sure');setTimeout(()=>{if(it.isConnected){it.dataset.confirm='';b.textContent='🗑';b.classList.remove('sure');}},3500);return;}
  const pid=box.dataset.pid,vid=box.dataset.vid,kind=b.dataset.kind||'',at=b.dataset.at,key=vid+'|'+(kind||'cm')+'|'+at;S._cmDel=S._cmDel||{};S._cmDel[key]=1;   /* azonnal eltűnik; a törlések sorban mennek a szerverre (gyors egymás utáni kattintásnál sem keverednek) */
  const redraw=()=>{const bx=document.querySelector('.vv-cm');const p=projById(pid),v=p&&(p.videos||[]).find(x=>x.id===vid);if(!v||!bx||bx.dataset.vid!==vid)return;const ta=$('m-vvCm'),keep=ta?ta.value:'',foc=document.activeElement===ta;bx.innerHTML=vidCmHtml(v);const t2=$('m-vvCm');if(t2){t2.value=keep;if(foc)t2.focus();}vidTsTick();};
  redraw();
  VV_DEL_Q=VV_DEL_Q.then(async()=>{try{const r=await call('videoCommentDel',{projectId:pid,id:vid,kind,at});const pr2=r&&r.project;
      if(pr2){const i=S.projects.findIndex(x=>x.id===pid);if(i>=0)S.projects[i]=normProj(pr2);[S.draft,S.draftBase].forEach(d=>{if(d&&d.id===pid)['videos','updatedAt','updatedBy'].forEach(f=>{d[f]=pr2[f];});});}
      delete S._cmDel[key];redraw();try{bdApply(pid);bdRefresh();}catch(e){}}
    catch(e){delete S._cmDel[key];redraw();handleErr(e);}});};
/* Frissítés után ugyanez a videóablak jön vissza (ugyanott a videóban, a még el nem küldött szöveggel); bezáráskor törlődik */
function vvSave(o,create){try{if(!o){sessionStorage.removeItem('lpm_vv_open');return;}if(!create&&!sessionStorage.getItem('lpm_vv_open'))return;sessionStorage.setItem('lpm_vv_open',JSON.stringify(Object.assign(JSON.parse(sessionStorage.getItem('lpm_vv_open')||'{}'),o)));}catch(e){}}
document.addEventListener('input',e=>{if(e.target&&e.target.id==='m-vvCm')vvSave({draft:e.target.value});});
setInterval(()=>{const v=document.querySelector('.vv-player video');if(v&&v.isConnected&&v.readyState)vvSave({t:v.currentTime});},1000);
function vvRestore(){if(S._vvRestored)return;   /* a betöltés korán (még a fájl végrehajtása közben) is hívhatja: itt nem használunk később definiált konstanst */
  let o=null,lane='';try{o=JSON.parse(sessionStorage.getItem('lpm_vv_open')||'null');lane=sessionStorage.getItem('lpm_lane_open')||'';}catch(e){}
  try{const hv=JSON.parse(sessionStorage.getItem('lpm_hash_vid')||'null');if(hv&&hv.pid){sessionStorage.removeItem('lpm_hash_vid');const p0=projFromHash(hv.pid);o={pid:p0?p0.id:hv.pid,vid:hv.vid};lane='';}}catch(e){}   /* levélből érkező videólink */
  if((!o||!o.pid)&&lane){S._vvRestored=true;let n=0;const tl=()=>{if(document.querySelector('.bd-modal'))return;if(!projById(lane)||$('mform')){if(++n<40)setTimeout(tl,300);return;}ACT['bd-lane']({dataset:{id:lane}});};setTimeout(tl,50);return;}
  if(!o||!o.pid){S._vvRestored=true;return;}
  S._vvRestored=true;let n=0;
  const tryOpen=()=>{const p=projById(o.pid);if(document.querySelector('.vv-cm'))return;   /* már nyitva */
    if(!p||!(p.videos||[]).some(x=>x.id===o.vid)||$('mform')||!S.loaded&&!S.projects.length){if(++n<40)setTimeout(tryOpen,300);return;}   /* várunk az adatokra / egy másik ablak bezárására (max. 12 mp) */
    if(o.lane)ACT['bd-lane']({dataset:{id:o.pid}});ACT['vid-view']({dataset:{pid:o.pid,vid:o.vid}});
    const ta=$('m-vvCm');if(ta&&o.draft){ta.value=o.draft;taHl();}vvSave({draft:o.draft||'',t:o.t||0});
    if(o.t){const go=()=>{const v=document.querySelector('.vv-player video');if(!v){if((go.n=(go.n||0)+1)<40)setTimeout(go,250);return;}const set=()=>{v.pause();v.currentTime=o.t;};if(v.readyState)set();else v.addEventListener('loadedmetadata',set,{once:true});};go();}};
  setTimeout(tryOpen,50);}
async function vidFlush(pid,vid){{const p0=projById(pid),v0=p0&&(p0.videos||[]).find(x=>x.id===vid);if(v0&&v0.st==='leadva')return;}const ta=$('m-vvCm'),t=String(ta&&ta.value||'').trim();if(!t||!t.replace(TC_RE,'').trim())return;   /* csak időkód, szöveg nélkül: nem mentjük */ta.value='';taHl();
  let lat='';{const p=projById(pid),v=p&&(p.videos||[]).find(x=>x.id===vid);if(v){const d=new Date(),z=n=>String(n).padStart(2,'0');v.cm=(v.cm||[]).concat([{by:S.me&&S.me.name||'',at:d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())+' '+z(d.getHours())+':'+z(d.getMinutes())+':'+z(d.getSeconds()),t,ts:'',_local:1}]);lat=v.cm[v.cm.length-1].at;}}   /* azonnal látszik (gyors újranyitáskor is); a szerver válasza felülírja */
  try{const r=await call('videoComment',{projectId:pid,id:vid,text:t,ts:''});const pr2=r&&r.project;
    if(pr2){const i=S.projects.findIndex(x=>x.id===pid);if(i>=0)S.projects[i]=normProj(pr2);[S.draft,S.draftBase].forEach(d=>{if(d&&d.id===pid)['videos','updatedAt','updatedBy'].forEach(f=>{d[f]=pr2[f];});});}
    const lk=vid+'|cm|'+lat;if(lat&&S._cmDel&&S._cmDel[lk]){const p=projById(pid),v=p&&(p.videos||[]).find(x=>x.id===vid),sc=v&&(v.cm||[]).slice().reverse().find(c=>c.t===t&&c.by===(S.me&&S.me.name));delete S._cmDel[lk];   /* a mentés előtt már törölted: most a szerveren is töröljük */
      if(sc){S._cmDel[vid+'|cm|'+sc.at]=1;VV_DEL_Q=VV_DEL_Q.then(()=>call('videoCommentDel',{projectId:pid,id:vid,kind:'',at:sc.at}).then(r=>{const q=r&&r.project;if(q){const i=S.projects.findIndex(x=>x.id===pid);if(i>=0)S.projects[i]=normProj(q);}delete S._cmDel[vid+'|cm|'+sc.at];}).catch(handleErr));}return;}
    toast('💬 Hozzászólás elmentve');try{bdApply(pid);bdRefresh();}catch(e){}}catch(e){handleErr(e);}}
/* pCloud nyilvános link → közvetlen videócím (getpublinkdownload), és lejátszás a saját lejátszóban */
async function pcloudLoad(){const el=document.querySelector('#modalRoot .vv-pc[data-pc-code]')||document.querySelector('.vv-pc[data-pc-code]');if(!el)return;const code=el.dataset.pcCode,hosts=el.dataset.pcEu?['eapi','api']:['api','eapi'];let why='';
  const fetch=(u,o)=>{const ac=new AbortController(),t=setTimeout(()=>ac.abort(),9000);return window.fetch(u,Object.assign({},o,{signal:ac.signal})).finally(()=>clearTimeout(t));};   // a pCloud néha nem válaszol – 9 mp után feladjuk, ne pörögjön örökké
  const vidOf=m=>{if(!m)return null;if(!m.isfolder)return m;const L=[];(function w(c){(c||[]).forEach(x=>{if(x.isfolder)w(x.contents);else if(/^video\//.test(x.contenttype||'')||/\.(mp4|mov|m4v|webm)$/i.test(x.name||''))L.push(x);});})(m.contents);return L[0]||null;};
  for(const h of hosts){try{const sj=await (await fetch(`https://${h}.pcloud.com/showpublink?code=${encodeURIComponent(code)}`,{referrerPolicy:'no-referrer'})).json();if(!sj||sj.result!==0){why=why||(sj&&sj.error)||'';console.warn('pCloud',h,code,sj);continue;}
      const f=vidOf(sj.metadata);if(!f){why='a megosztásban nincs videófájl';break;}
      const j=await (await fetch(`https://${h}.pcloud.com/getpublinkdownload?code=${encodeURIComponent(code)}&forcedownload=0${f.fileid&&sj.metadata.isfolder?'&fileid='+f.fileid:''}`,{referrerPolicy:'no-referrer'})).json();
      if(j&&j.result===0&&j.hosts&&j.hosts.length&&j.path){if(!el.isConnected)return;el.outerHTML=`<video src="https://${j.hosts[0]}${j.path}" referrerpolicy="no-referrer" controls controlslist="nodownload noplaybackrate noremoteplayback" disablepictureinpicture disableremoteplayback oncontextmenu="return false" playsinline></video>`;vidTsTick();return;}why=j&&j.error||why;}catch(e){why=why||(e&&e.name==='AbortError'?'a pCloud nem válaszolt időben':'a pCloud nem érhető el');}}
  const pl=el.closest('.vv-player')||el;if(pl.isConnected)pl.outerHTML=`<div class="vv-noembed">A pCloud videót nem sikerült itt lejátszani${why?` (${esc(why)})`:''} – nyisd meg új lapon${/traffic|limit/i.test(why||'')?', vagy tölts fel új linket':''}.${document.querySelector('[data-action=vid-link]')?' <button type="button" class="linkbtn" data-action="vid-link" data-pid="'+esc(document.querySelector('[data-action=vid-link]').dataset.pid)+'" data-vid="'+esc(document.querySelector('[data-action=vid-link]').dataset.vid)+'">🔗 Új link beillesztése</button>':''}</div>`;}
ACT['vid-reject']=b=>{if(!$('m-vvCm')){const pid=b.dataset.pid,vid=b.dataset.vid;   // ügyfél jóváhagyására vár: nincs hozzászólás-mező – külön ablakban írjuk be, mit kér az ügyfél
    confirmLayer('↩ Az ügyfél módosítást kér','<div style="margin:0 16px"><p class="hint" style="margin:0 0 8px">Írd le, mit kér az ügyfél (akár időkóddal) – a vágó ezt kapja meg.</p><textarea class="inp" id="m-cliFb" rows="5" style="width:100%"></textarea></div>','Visszaküldés a vágónak',(bb,d)=>{const t=String(($('m-cliFb')||{}).value||'').trim();if(t.length<3){toast('Írd be, mit kér az ügyfél.',true);return;}if(d&&d.remove)d.remove();bdMove(pid,vid,'vagas',null,t);if(!vvNext())closeModal();});
    setTimeout(()=>{const x=$('m-cliFb');if(x)x.focus();},50);return;}
  const ta=$('m-vvCm'),fb=String(ta&&ta.value||'').trim();if(fb.length<3){toast(b.textContent.includes('Módosítást')?'Írd be a hozzászólás mezőbe, mit kér az ügyfél.':'Írd be a hozzászólás mezőbe, mit kell javítani.',true);if(ta)ta.focus();return;}
  ta.value='';const pid=b.dataset.pid,vid=b.dataset.vid;bdMove(pid,vid,'vagas',null,fb);if(!vvNext())closeModal();};
document.addEventListener('change',e=>{if(e.target&&e.target.id==='cal-cutdue'){try{localStorage.setItem('lpm_cal_cutdue',e.target.checked?'1':'0');}catch(x){}render(true);}});
/* E-mail mezők: kis másolás gomb a mező jobb szélén (a mező közben szerkeszthető marad) */
(()=>{const enh=root=>{(root.querySelectorAll?root:document).querySelectorAll('input.inp[type="email"]:not([data-cp])').forEach(i=>{if(i.closest('.cp-wrap'))return;i.dataset.cp='1';const w=document.createElement('span');w.className='cp-wrap';i.parentNode.insertBefore(w,i);w.appendChild(i);
    const b=document.createElement('button');b.type='button';b.className='ph-copy em-copy';b.textContent='⧉';b.setAttribute('aria-label','E-mail cím másolása');b.dataset.tip='E-mail cím másolása';w.appendChild(b);
    b.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();const v=i.value.trim();if(!v){toast('Nincs e-mail cím.',true);return;}try{await navigator.clipboard.writeText(v);}catch(x){i.select();try{document.execCommand('copy');}catch(y){}}b.textContent='✓';b.classList.add('ok');setTimeout(()=>{b.textContent='⧉';b.classList.remove('ok');},1400);toast('Kimásolva: '+v);});});};
  try{new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1&&(n.matches&&n.matches('input[type="email"]')||n.querySelector&&n.querySelector('input[type="email"]'))){enh(document);return;}}).observe(document.body,{childList:true,subtree:true});}catch(e){}enh(document);})();
