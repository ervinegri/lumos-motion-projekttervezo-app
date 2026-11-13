'use strict';
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
  'cal-kind':b=>{S.cal.kind=b.dataset.v||'';try{localStorage.setItem('lpm_cal_kind',S.cal.kind);}catch(e){}render(true);},
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
