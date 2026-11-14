'use strict';
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
      <div class="field full rep-box${same?' rep-same':''}"><div class="fields">${mf('rep','Cég képviselője, aláíró',{max:120,ph:'Név – keresés a HubSpotban',ac:'off',v:v('rep')})}${mf('repTitle','Képviselő titulusa',{max:120,ph:'pl. ügyvezető',ac:'off',v:v('repTitle')})}<div id="hsRep" class="hs-list full"></div>${mf('repEmail','Képviselő e-mail-címe',{type:'email',max:160,ac:'off',v:v('repEmail')})}${phoneField({name:'repPhone',label:'Képviselő telefonszáma',value:v('repPhone')})}</div></div>`;})()}</div>${edit&&edit.client?clientWorkHtml(edit.client)+(isAdmin()?clInvHtml(edit.client):''):''}${edit&&isAdmin()?clientDocsHtml(edit.client):''}`,
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
  catch(err){console.error(err);try{handleErr(err);}catch(_){toast('Hiba történt: '+((err&&err.message)||err),true);}}   // váratlan hiba se maradjon néma
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
    document.body.dataset.switchTo='Váltás: '+(role==='admin'?'Ügyvezető':role==='editor'?'Termelési v.':role==='sales'?'Értékesítő':'Szakember')+' nézet…';document.body.classList.add('switching');
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
  const first=eds.length===1?huFirst(String(eds[0].name)):'';
  const tl=postTasks(d).map(t=>{const o=taskOwners(d,t.k).map(id=>(crewById(id)||{}).name).filter(Boolean);return `– ${t.k==='er_post_n'?t.n+' helyszín előadásainak utómunkája':t.label+': '+t.n}${t.k==='foto_db'?' db':''}${eds.length>1&&o.length?' ('+o.join(', ')+')':''}`;});
  const text=`Szia${first?' '+first:''}!\n\n${(w=>w[0].toUpperCase()+w.slice(1))(huArt(d.name))} „${d.name}”${r?' ('+fmtRange(d)+')':''} nyersanyaga fent van a NAS-on.\n${due?'\nLeadási határidő: '+fmtDay(due)+'.':''}${tl.length?'\n\n'+(eds.length>1?'Feladatok:':'Amit el kell készítened:')+'\n'+tl.join('\n'):''}\n\nHa kész, a projektnél húzd át az „Utómunka” lépést a „Videók jóváhagyásra várnak” lépésre, és ott add le a linket.\n\nKöszi!`;
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
  const lines=[esc(fnm(who))+' elkészítette '+huArt(p.name)+' „'+esc(p.name||'')+(CD_ONE?'” videóját - jóváhagyásra vár.':'” videóit - jóváhagyásra várnak.')];if(note)lines.push('','Megjegyzés: '+esc(note).replace(/\n/g,'<br>'));lines.push('',(CD_ONE?'Videó: ':'Videók: ')+(links.length?links.map(l=>`<a href="${esc(l)}" target="_blank" rel="noopener">${esc(l)}</a>`).join('<br>'):'<span class="muted">(még nincs link)</span>'));
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
      const base={deliveryLink:link,deliveryLinks:links,deliveryPass:passVal(fd),deliveryNotes:notes,dueKept:validISO(due)&&todayISO()>due?'nem':'igen',dueAt:validISO(due)&&(noDefDue(d)||due!==defaultDue(d))?due:''};
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
