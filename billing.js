'use strict';
/* ===== Szerződés és számlázás (csak ügyvezető) =====
   Projektenként: szerződés (feltöltés / link / állapot), díjbekérő → foglaló fizetve → végszámla → fizetve.
   A bizonylatok a számlázz.hu-ból jönnek (finance.js: szInvoiceModal, IPN, szSync), az adatok a finData-ban (billing, invoices). */
const CONTRACT_LABEL={'':'Szerződés hiányzik',kikuldve:'Kiküldve, aláírásra vár',alairva:'Aláírva',nemkell:'Nincs szerződés'};
const CONTRACT_CLS={'':'p-bad',kikuldve:'p-warn',alairva:'p-ok',nemkell:'p-mute'};
const billOn=()=>isAdmin()&&!!(S.capabilities&&S.capabilities.finance);
const billOf=pid=>((S.fin&&S.fin.billing)||[]).find(b=>b.projectId===pid)||{projectId:pid,contractStatus:'',mode:'eloleg',advancePct:50,poNumber:'',note:'',contractUrl:'',contractName:''};
const projDone=p=>['leadva','jovahagyas','atadva'].includes(p.status)||(pr(p)&&pr(p).end<todayISO());
const fmtMD=d=>d?d.slice(5).replace('-','.')+'.':'';
/* Egy projekt szerződés- és számlázási állapota */
function billInfo(p){
  const b=billOf(p.id),inv=invFor('project',p.id),last=k=>inv.filter(x=>x.kind===k).pop()||null;
  const db=last('dijbekero'),el=last('eloleg'),fin=b.mode==='egyben'?(last('szamla')||last('vegszamla')):(last('vegszamla')||last('szamla'));
  // a szerződés opcionális: csak akkor lépés, ha van (kiküldve / aláírva); kiküldött szerződésnél az aláírás a következő teendő
  // alapból kell szerződés; ha a „Nincs szerződés” ki van pipálva, kimarad a lépések közül
  const fw=!b.contractStatus?fwFor(p):null;   // keretszerződés az ügyféllel → nem kell külön szerződés
  const contractOk=b.contractStatus==='alairva'||b.contractStatus==='nemkell'||!!fw;
  const cStep=b.contractStatus==='nemkell'||(fw&&fw.mode==='nemkell')?[]:[['contract',fw?'Keretszerződés':'Szerződés aláírva',contractOk]];
  const advIssued=!!(db||el),advPaid=!!((db&&invPaidOk(db))||(el&&invPaidOk(el)));
  const steps=b.mode==='egyben'
    ?[...cStep,['finIssued','Számla kiállítva',!!fin],['finPaid','Számla kifizetve',!!(fin&&invPaidOk(fin))]]
    :[...cStep,['advIssued','Díjbekérő kiállítva',advIssued],['advPaid','Foglaló kifizetve',advPaid],['finIssued','Végszámla kiállítva',!!fin],['finPaid','Végszámla kifizetve',!!(fin&&invPaidOk(fin))]];
  const nextI=steps.findIndex(s=>!s[2]),closed=nextI<0;
  const open=inv.filter(x=>!(x.kind==='dijbekero'&&(x.ref||el))&&!invPaidOk(x)),late=open.filter(x=>x.due&&x.due<todayISO());
  const due=x=>Math.max(0,num(x.invGross)-num(x.invPaid));
  let next='Lezárva',nextCls='p-ok';
  if(!closed){const k=steps[nextI][0];
    next=k==='contract'?(b.contractStatus==='kikuldve'?'Szerződés aláírásra vár':'Szerződés hiányzik'):k==='advIssued'?'Díjbekérő kiállítása':k==='advPaid'?'Foglalóra vár':k==='finIssued'?(projDone(p)?(b.mode==='egyben'?'Számla kiállítása':'Végszámla kiállítása'):(b.mode==='egyben'?'Számla a projekt után':'Végszámla a projekt után')):'Fizetésre vár';
    nextCls=k==='contract'&&b.contractStatus!=='kikuldve'?'p-bad':(k==='advIssued'||(k==='finIssued'&&projDone(p)))?'p-info':'p-warn';
    if(late.length){next='Lejárt fizetés';nextCls='p-bad';}}
  return {p,b,fw,inv,db,el,fin,steps,nextI,closed,next,nextCls,open,late,openSum:open.reduce((s,x)=>s+due(x),0),lateSum:late.reduce((s,x)=>s+due(x),0),todo:!closed&&steps[nextI]&&(steps[nextI][0]==='advIssued'||(steps[nextI][0]==='finIssued'&&projDone(p))),noContract:!contractOk};   // noContract = aláírásra váró szerződés
}
/* A következő kiállítandó bizonylat típusa */
function billNextType(pid){const p=projById(pid);if(!p)return 'szamla';const i=billInfo(p);if(i.b.mode==='egyben')return 'szamla';if(!i.db&&!i.el)return 'dijbekero';if(i.db&&invPaidOk(i.db)&&!i.el&&!i.db.ref)return 'eloleg';return 'vegszamla';}

function invLine(x,label){if(!x)return '';const s=invState(x);
  const st=s==='paid'?`<span class="ok-txt">✓ Fizetve${x.paidAt?' '+fmtMD(x.paidAt):''}</span>`:s==='part'?`<span class="info-txt">Részben: ${ftFmt(num(x.invPaid))}</span>`:s==='late'?`<span class="bad-txt">⚠ Lejárt ${fmtMD(x.due)}</span>`:`<span class="warn-txt">Fizetésre vár${x.due?' · '+fmtMD(x.due):''}</span>`;
  return `<div class="bl-doc"><button class="bl-no" type="button" data-action="sz-inv" data-id="${esc(x.id)}" title="${esc((SZ_KIND[x.kind]||'')+' · bruttó '+ftFmt(num(x.invGross)))}">${label?`<span class="muted">${label}</span> `:''}${esc(x.no)}</button><span class="bl-sub">${ftFmt(num(x.invGross))} · ${st}</span></div>`;}
const billAddBtn=(pid,type,label,strong)=>`<button class="btn ${strong?'primary':'outline'} small bl-add" type="button" data-action="bill-inv" data-id="${esc(pid)}" data-type="${type}">+ ${label}</button>`;
function billRow(i){const p=i.p,b=i.b,r=pr(p),val=num(p.projectValue);
  const contract=i.fw?fwCell(i.fw,'bl-contract'):b.contractStatus==='nemkell'?`<div class="bl-contract"><label class="bl-nocontract"><input type="checkbox" data-nocontract="${esc(p.id)}" checked> Nincs szerződés</label></div>`:`<div class="bl-contract"><button class="statuspill ${CONTRACT_CLS[b.contractStatus||'']}" type="button" data-action="bill-edit" data-id="${esc(p.id)}">${CONTRACT_LABEL[b.contractStatus||'']}</button>
    ${b.contractUrl?`<a class="bl-file" href="${esc(b.contractUrl)}" target="_blank" rel="noopener" title="${esc(b.contractName||'Szerződés')}">📎 ${esc((b.contractName||'Megnyitás').replace(/\.[a-z0-9]{2,4}$/i,'').slice(0,22))}</a>`:`<button class="linkbtn bl-up" type="button" data-action="bill-edit" data-id="${esc(p.id)}" data-focus="file">⬆️ Feltöltés</button>`}${b.contractUrl||b.contractStatus==='alairva'||b.contractStatus==='kikuldve'?'':`<label class="bl-nocontract"><input type="checkbox" data-nocontract="${esc(p.id)}"${b.contractStatus==='nemkell'?' checked':''}> Nincs szerződés</label>`}</div>`;
  const adv=b.mode==='egyben'?'<span class="muted">nincs foglaló</span>'
    :(i.db||i.el)?invLine(i.db)+(i.el?invLine(i.el,'Foglaló:'):(i.db&&invPaidOk(i.db)&&!i.db.ref?`<button class="linkbtn" type="button" data-action="bill-inv" data-id="${esc(p.id)}" data-type="eloleg">+ Foglalószámla</button>`:''))
    :billAddBtn(p.id,'dijbekero','Díjbekérő',!i.closed&&i.steps[i.nextI][0]==='advIssued');
  const fin=i.fin?invLine(i.fin):billAddBtn(p.id,b.mode==='egyben'?'szamla':'vegszamla',b.mode==='egyben'?'Számla':'Végszámla',projDone(p)&&(b.mode==='egyben'||!!(i.db||i.el)));
  const dots=`<div class="bl-dots" aria-label="Haladás">${i.steps.map((s,k)=>`<span class="bl-dot${s[2]?' on':''}${k===i.nextI?' cur':''}" title="${esc(s[1])}${s[2]?' ✓':''}"></span>`).join('')}</div>`;
  return `<tr${i.closed?' class="bl-closed"':''}><td class="n">${r?esc(String(Number(r.start.slice(8)))):''}</td><td><button class="linkbtn bl-name" type="button" data-action="open-project" data-id="${esc(p.id)}">${esc(p.name||'Névtelen projekt')}</button>
      <div class="bl-meta">${esc(p.client||'—')}</div>${b.note?`<div class="bl-note" title="${esc(b.note)}">📝 ${esc(b.note.slice(0,60))}${b.note.length>60?'…':''}</div>`:''}</td>
    <td class="r"><b>${val?ftFmt(val):'<span class="muted">—</span>'}</b>${b.mode!=='egyben'&&val?`<div class="bl-meta">foglaló ${num(b.advancePct)}%</div>`:''}</td>
    <td>${contract}</td><td>${adv}</td><td>${fin}</td>
    <td>${dots}<span class="statuspill ${i.nextCls} bl-next">${esc(i.next)}</span>${i.openSum?`<div class="bl-meta">kintlévő: <b>${ftFmt(i.openSum)}</b></div>`:''}</td>
    <td><button class="editbtn" type="button" data-action="bill-edit" data-id="${esc(p.id)}" aria-label="Szerződés és számlázás beállításai" title="Beállítások">✏️</button></td></tr>`;}

function viewBilling(){
  if(!billOn())return `<div class="panel">${empty('Ez a fül a háttérkód frissítése után érhető el.')}</div>`;
  if(!S.fin)return finLoadingView();
  if(!S.fin.billing)return `<div class="panel">${empty('A Szerződés és számlázás a legújabb háttérkód (Code.gs) bemásolása és új verzióként való telepítése után érhető el.')}</div>`;
  const f=S.blf||(S.blf={v:'teendo',q:''}),q=f.q.trim().toLowerCase();
  const all=S.projects.filter(p=>p.status!=='lemondva'&&pr(p)).map(billInfo);
  const sets={teendo:all.filter(i=>!i.closed),kint:all.filter(i=>i.openSum>0),lejart:all.filter(i=>i.late.length),szerzodes:all.filter(i=>i.noContract&&!i.closed),lezart:all.filter(i=>i.closed),mind:all};
  const labels=[['teendo','Nyitott'],['szerzodes','Szerződés hiányzik'],['kint','Kintlévő'],['lejart','Lejárt'],['lezart','Lezárt'],['mind','Mind']];
  let list=sets[f.v]||all;if(q)list=list.filter(i=>[i.p.name,i.p.client,...i.inv.map(x=>x.no)].join(' ').toLowerCase().includes(q));
  list.sort((a,b)=>String(pr(b.p).start).localeCompare(String(pr(a.p).start)));
  const months=[];list.forEach(i=>{const m=pr(i.p).start.slice(0,7);let g=months.find(x=>x.m===m);if(!g)months.push(g={m,arr:[]});g.arr.push(i);});
  const cols=8,openSum=all.reduce((s,i)=>s+i.openSum,0),lateSum=all.reduce((s,i)=>s+i.lateSum,0),todo=all.filter(i=>i.todo).length,noC=sets.szerzodes.length;
  const sz=S.fin.sz||{};
  return `<div class="page-head"><div class="grow"><h2>Szerződés és számlázás</h2><p class="sub">Projektenként: szerződés → díjbekérő → foglaló → végszámla → kifizetés · csak te látod</p></div>
      ${sz.hasKey?`<button class="btn outline small" type="button" data-action="sz-sync"${S._szSyncing?' disabled':''} title="${esc(sz.lastSync?'Utoljára: '+sz.lastSync:'')}">${S._szSyncing?'Frissítés…':'🔄 Kifizetések'}</button>`:''}
      <button class="btn outline small" type="button" data-action="sz-settings">🧾 Számlázás beállításai</button></div>
    ${sz.hasKey?'':`<div class="banner"><p>A számlák kiállításához és a kifizetések követéséhez add meg a számlázz.hu Agent-kulcsot a <b>Számlázás beállításai</b> gombbal.</p></div>`}
    <div class="tiles fin-tiles">
      <button class="tile tile-btn${noC?' bad':''}" type="button" data-action="blf" data-v="szerzodes" data-k="c"><div class="tile-n">${noC}</div><div class="tile-l">szerződés hiányzik</div></button>
      <button class="tile tile-btn${todo?' warn':''}" type="button" data-action="blf" data-v="teendo"><div class="tile-n">${todo}</div><div class="tile-l">kiállítandó díjbekérő / végszámla</div></button>
      <button class="tile tile-btn" type="button" data-action="blf" data-v="kint"><div class="tile-n">${ftFmt(openSum)}</div><div class="tile-l">kintlévőség (bruttó, ${sets.kint.length} projekt)</div></button>
      <button class="tile tile-btn${lateSum?' bad':''}" type="button" data-action="blf" data-v="lejart"><div class="tile-n">${ftFmt(lateSum)}</div><div class="tile-l">lejárt (${sets.lejart.length} projekt)</div></button>
    </div>
    <div class="toolbar"><input class="inp search" id="q-bill" type="search" placeholder="Keresés projekt, ügyfél, számlaszám szerint" value="${esc(f.q)}" aria-label="Keresés">
      <div class="chips">${labels.map(([v,l])=>`<button class="chip" type="button" data-action="blf" data-v="${v}" aria-pressed="${f.v===v}">${l}<span class="c">${sets[v].length}</span></button>`).join('')}</div></div>
    ${list.length?`<div class="sheet-wrap"><table class="sheet bill-tbl"><thead><tr><th class="n">Nap</th><th>Projekt</th><th class="r">Érték (nettó)</th><th>Szerződés</th><th>Díjbekérő / foglaló</th><th>Végszámla</th><th>Állapot</th><th></th></tr></thead>
      <tbody>${months.map(g=>`<tr class="pt-month"><td colspan="${cols}">${esc(F_YM.format(toDate(g.m+'-01')))} <span class="muted">${g.arr.length}</span></td></tr>${g.arr.map(billRow).join('')}`).join('')}</tbody></table></div>
      <p class="hint">Díjbekérő → (kifizetés után foglalószámla) → végszámla, amelyből a számlázz.hu levonja a foglalót. A kifizetéseket a számlázz.hu értesítése alapján az app magától jelöli. Projektenként „Egy számla” konstrukció is választható (✏️).</p>`
      :`<div class="panel">${empty(all.length?'Nincs a szűrésnek megfelelő projekt.':'Még nincs dátummal rendelkező projekt.')}</div>`}
    ${fwPanel()}`;
}

/* Projekt szerződés- és számlázási beállításai + szerződés feltöltése */
function billModal(pid,focus){const p=projById(pid);if(!p)return;const b=billOf(pid),fw=fwFor(p),fwAny=fwOfClient(p.client);
  openModal('Szerződés és számlázás – '+(p.name||''),`<div class="fields">
    ${fw&&fw.mode==='nemkell'?`<div class="field full fw-note">🚫 <b>${esc(p.client)}</b> nem igényel szerződést – ennél a projektnél sem kérjük. <button class="linkbtn" type="button" data-action="fw-edit" data-id="${esc(fw.id)}">Módosítás</button></div>`:fw?`<div class="field full fw-note">🤝 <b>${esc(p.client)}</b> céggel keretszerződés van${fw.validTo?' (érvényes: '+esc(fw.validTo)+')':''} – ennél a projektnél nem kell külön szerződés. ${fw.url?`<a href="${esc(fw.url)}" target="_blank" rel="noopener">Megnyitás</a> · `:''}<button class="linkbtn" type="button" data-action="fw-edit" data-id="${esc(fw.id)}">Keretszerződés szerkesztése</button>
      <small class="hint" style="margin:4px 0 0">Ha mégis külön szerződés kell ehhez a projekthez, állítsd be lent az állapotát.</small></div>`:fwAny?`<div class="field full fw-note warn">⚠️ ${esc(p.client)} keretszerződése ${esc(fwAny.validTo)}-ig volt érvényes, ez a projekt utána van. <button class="linkbtn" type="button" data-action="fw-edit" data-id="${esc(fwAny.id)}">Meghosszabbítás</button></div>`:''}
    ${ms('contractStatus','Szerződés állapota',Object.entries(CONTRACT_LABEL).map(([k,l])=>[k,k===''&&fw?'Keretszerződés alapján':l]),b.contractStatus||'')}
    ${mf('signedAt','Aláírás dátuma',{type:'date',v:b.signedAt||''})}
    <div class="field full"><label for="m-cfile">Szerződés feltöltése (PDF, kép, Word – max. 10 MB)</label>
      <input class="inp" id="m-cfile" name="cfile" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic">
      <small class="hint" style="margin:4px 0 0">${b.contractUrl?`Jelenleg: <a href="${esc(b.contractUrl)}" target="_blank" rel="noopener">${esc(b.contractName||b.contractUrl)}</a>${b.contractAt?' · '+esc(b.contractAt.slice(0,10)):''} – új fájllal lecseréled. <button class="linkbtn" type="button" data-action="bill-clear" data-id="${esc(pid)}">Leválasztás</button>`:'A projekt Drive-mappájába kerül (ha még nincs, létrehozzuk).'}</small></div>
    ${mf('contractUrl','…vagy szerződés linkje (pl. Drive, aláíró szolgáltatás)',{full:true,v:b.contractFileId?'':(b.contractUrl||''),ph:'https://…',max:500})}
    ${p.client&&!fw?`<div class="field full"><label class="bl-nocontract fw-chk"><input type="checkbox" name="asFw" id="m-asFw"> Ez keretszerződés – <b>${esc(p.client)}</b> további projektjeinél sem kérünk külön szerződést</label>
      <div class="fw-extra" hidden><div class="fields" style="margin-top:8px">${mf('fwValidTo','Érvényes eddig (üresen: határozatlan)',{type:'date'})}</div></div></div>`:''}
    ${ms('mode','Fizetési konstrukció',[['eloleg','Foglaló + végszámla'],['egyben','Egy számla (foglaló nélkül)']],b.mode||'eloleg')}
    ${mf('advancePct','Foglaló (%)',{v:b.advancePct??50,im:'numeric'})}
    <div class="field full"><label for="m-note">Megjegyzés (fizetési feltétel, kapcsolattartó a pénzügyön stb.)</label><textarea class="inp" id="m-note" name="note" rows="2" maxlength="1000">${esc(b.note||'')}</textarea></div>
  </div>`,{submitLabel:'Mentés',submit:async fd=>{
    const file=($('m-cfile')||{}).files&&$('m-cfile').files[0];
    const d={projectId:pid,contractStatus:fd.get('contractStatus'),signedAt:fd.get('signedAt')||'',mode:fd.get('mode'),advancePct:Number(fd.get('advancePct')),note:String(fd.get('note')||'').trim()};
    const url=String(fd.get('contractUrl')||'').trim();if(!file&&!b.contractFileId)d.contractUrl=url;else if(!file&&url)d.contractUrl=url;
    if(!(d.advancePct>=0&&d.advancePct<=100)){toast('A foglaló 0 és 100% között legyen.',true);return;}
    if(file&&file.size>10*1024*1024){toast('A fájl legfeljebb 10 MB lehet.',true);return;}
    const btn=document.querySelector('#mform button[type=submit]');if(btn){btn.disabled=true;btn.textContent=file?'Feltöltés…':'Mentés…';}
    const asFw=!!fd.get('asFw');
    try{
      if(asFw){   // keretszerződés: az ügyfélhez kerül, a projekt állapota „keretszerződés alapján” (üres) marad
        if(!file&&!url){toast('Töltsd fel a keretszerződést vagy add meg a linkjét.',true);if(btn){btn.disabled=false;btn.textContent='Mentés';}return;}
        const f={client:p.client,signedAt:d.signedAt,validTo:fd.get('fwValidTo')||''};
        if(file){f.b64=await readB64(file);f.name=file.name;f.mime=file.type||'application/octet-stream';}else f.url=url;
        await call('fwSave',f);d.contractStatus='';delete d.contractUrl;
        const r=await call('billSave',d);closeModal();finApply(r);toast('Keretszerződés rögzítve: '+p.client);return;}
      if(file){const b64=await readB64(file);
        await call('billUpload',{projectId:pid,name:file.name,mime:file.type||'application/octet-stream',b64,contractStatus:d.contractStatus||'alairva'});
        if(!d.contractStatus)d.contractStatus='alairva';}
      const r=await call('billSave',d);closeModal();finApply(r);toast(file?'Szerződés feltöltve':'Mentve');}
    catch(e){handleErr(e);if(btn){btn.disabled=false;btn.textContent='Mentés';}}}});
  if(focus==='file'){const f=$('m-cfile');if(f)setTimeout(()=>f.click(),50);}}

Object.assign(ACT,{
  'blf':b=>{(S.blf||(S.blf={v:'teendo',q:''})).v=b.dataset.v;render(true);},
  'bill-edit':b=>billModal(b.dataset.id,b.dataset.focus),
  'bill-inv':b=>{if(!S.fin.sz||!S.fin.sz.hasKey){szSettingsModal('Az Agent-kulcs megadása után tudsz bizonylatot kiállítani.');return;}szInvoiceModal('project',b.dataset.id,{type:b.dataset.type});},
  'bill-clear':b=>{const id=b.dataset.id;closeModal();confirmModal('Szerződés leválasztása','A fájl a Drive-ban megmarad, csak a projektről kerül le a hivatkozás.','Leválasztás',()=>finCall('billSave',{projectId:id,clearFile:true},'Leválasztva'));}
});
document.addEventListener('input',e=>{if(e.target.id==='q-bill'){(S.blf||(S.blf={v:'teendo',q:''})).q=e.target.value;const pos=e.target.selectionStart;render(true);const n=$('q-bill');if(n){n.focus();try{n.setSelectionRange(pos,pos);}catch(x){}}}});

/* Projekt oldalán (csak ügyvezető): az aktuális projekt szerződése és számlázása */
function projBillingPanel(p){
  if(!billOn()||!p||!p.id||!projById(p.id))return '';
  const wrap=inner=>`<details class="panel fold billing-fold" id="proj-bill" data-fold="billing"${FOLD.billing!==false?' open':''}>${inner}</details>`;
  if(!S.fin){if(!S.finErr)finLoad();return wrap(`<summary><h3>📄 Szerződés és számlázás <span class="aside">${S.finErr?'nem sikerült betölteni':'betöltés…'}</span></h3></summary>${S.finErr?`<div class="btns"><button class="btn outline small" type="button" data-action="fin-retry">Újrapróbálás</button></div>`:'<div class="loading"><span class="spin"></span>Betöltés…</div>'}`);}
  if(!S.fin.billing)return wrap(`<summary><h3>📄 Szerződés és számlázás</h3></summary><p class="hint">A legújabb háttérkód (Code.gs) telepítése után érhető el.</p>`);
  const i=billInfo(p),b=i.b;
  const contract=i.fw?fwCell(i.fw,'pb-c'):b.contractStatus==='nemkell'?`<div class="pb-c"><label class="bl-nocontract"><input type="checkbox" data-nocontract="${esc(p.id)}" checked> Nincs szerződés</label></div>`:`<div class="pb-c"><span class="statuspill ${CONTRACT_CLS[b.contractStatus||'']}">${CONTRACT_LABEL[b.contractStatus||'']}</span>
    ${b.contractUrl?`<a class="bl-file" href="${esc(b.contractUrl)}" target="_blank" rel="noopener">📎 ${esc(b.contractName||'Szerződés megnyitása')}</a>`:`<button class="linkbtn bl-up" type="button" data-action="bill-edit" data-id="${esc(p.id)}" data-focus="file">⬆️ Szerződés feltöltése</button>`}
    ${b.signedAt?`<span class="bl-meta">aláírva: ${esc(b.signedAt)}</span>`:''}${b.contractUrl||b.contractStatus==='alairva'||b.contractStatus==='kikuldve'?'':`<label class="bl-nocontract"><input type="checkbox" data-nocontract="${esc(p.id)}"${b.contractStatus==='nemkell'?' checked':''}> Nincs szerződés</label>`}</div>`;
  const adv=b.mode==='egyben'?'<span class="muted">egy számla, nincs foglaló</span>'
    :(i.db||i.el)?invLine(i.db)+(i.el?invLine(i.el,'Foglaló:'):(i.db&&invPaidOk(i.db)&&!i.db.ref?`<button class="linkbtn" type="button" data-action="bill-inv" data-id="${esc(p.id)}" data-type="eloleg">+ Foglalószámla</button>`:''))
    :billAddBtn(p.id,'dijbekero','Díjbekérő',!i.closed&&i.steps[i.nextI][0]==='advIssued');
  const fin=i.fin?invLine(i.fin):billAddBtn(p.id,b.mode==='egyben'?'szamla':'vegszamla',b.mode==='egyben'?'Számla':'Végszámla',projDone(p)&&(b.mode==='egyben'||!!(i.db||i.el)));
  const dots=`<div class="bl-dots">${i.steps.map((s,k)=>`<span class="bl-dot${s[2]?' on':''}${k===i.nextI?' cur':''}" title="${esc(s[1])}${s[2]?' ✓':''}"></span>`).join('')}</div>`;
  const val=num(p.projectValue);
  return wrap(`<summary><h3>📄 Szerződés és számlázás <span class="aside"><span class="statuspill ${i.nextCls}">${esc(i.next)}</span></span></h3></summary>
    <div class="pb-grid">
      <div class="pb-box"><div class="pb-t">Szerződés</div>${contract}</div>
      <div class="pb-box"><div class="pb-t">${b.mode==='egyben'?'Foglaló':'Díjbekérő / foglaló'}${b.mode!=='egyben'&&val?` <span class="muted">${num(b.advancePct)}% · ${ftFmt(Math.round(val*num(b.advancePct)/100))}</span>`:''}</div>${adv}</div>
      <div class="pb-box"><div class="pb-t">${b.mode==='egyben'?'Számla':'Végszámla'}${val?` <span class="muted">${ftFmt(val)} nettó</span>`:''}</div>${fin}</div>
      <div class="pb-box"><div class="pb-t">Állapot</div>${dots}<span class="statuspill ${i.nextCls}">${esc(i.next)}</span>${i.openSum?`<div class="bl-meta">kintlévő: <b>${ftFmt(i.openSum)}</b>${i.lateSum?` · <span class="bad-txt">lejárt: ${ftFmt(i.lateSum)}</span>`:''}</div>`:''}</div>
    </div>
    <div class="pb-foot"><span class="bl-meta">${esc([b.mode==='egyben'?'Egy számla':'Foglaló + végszámla',b.note||''].filter(Boolean).join(' · '))}</span>
      <button class="btn outline small" type="button" data-action="bill-edit" data-id="${esc(p.id)}">✏️ Szerződés és számlázás beállításai</button></div>`);
}

/* „Nincs szerződés” pipa: a projekthez nem kérünk szerződést (kivéve, ha visszaveszed a pipát) */
document.addEventListener('change',async e=>{const t=e.target;if(!t.dataset||!t.dataset.nocontract||!S.fin||!S.fin.billing)return;
  const pid=t.dataset.nocontract,st=t.checked?'nemkell':'',arr=S.fin.billing;let b=arr.find(x=>x.projectId===pid);const prev=b?b.contractStatus:'';
  if(!b){b=Object.assign({},billOf(pid));arr.push(b);}b.contractStatus=st;render(true);   // azonnal látszik, a mentés a háttérben fut
  try{const d=await call('billSave',{projectId:pid,contractStatus:st});if(d&&d.billing){S.fin.billing=d.billing;render(true);}toast(st?'Ehhez a projekthez nem kell szerződés':'Szerződés kérve');}
  catch(err){b.contractStatus=prev;render(true);handleErr(err);}});

/* ===== Keretszerződések ===== */
const fwNorm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
const fwOfClient=c=>c?((S.fin&&S.fin.frameworks)||[]).find(f=>fwNorm(f.client)===fwNorm(c))||null:null;
function fwFor(p){const f=fwOfClient(p&&p.client);if(!f)return null;const r=pr(p);return !f.validTo||!r||f.validTo>=r.start?f:null;}
const readB64=file=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]||'');r.onerror=()=>no(new Error('A fájl nem olvasható.'));r.readAsDataURL(file);});
const fwCell=(f,cls)=>f.mode==='nemkell'?`<div class="${cls}"><span class="statuspill p-mute" title="Az ügyfél nem igényel szerződést">🚫 Nem igényel szerződést</span></div>`:`<div class="${cls}"><span class="statuspill p-ok" title="Keretszerződés az ügyféllel">🤝 Keretszerződés</span>${f.url?`<a class="bl-file" href="${esc(f.url)}" target="_blank" rel="noopener">📎 ${esc((f.fileName||'Megnyitás').replace(/\.[a-z0-9]{2,4}$/i,'').slice(0,22))}</a>`:''}${f.validTo?`<span class="bl-meta">érvényes: ${esc(f.validTo)}</span>`:''}</div>`;
function fwPanel(){const list=((S.fin&&S.fin.frameworks)||[]).slice().sort((a,b)=>a.client.localeCompare(b.client,'hu'));const T=todayISO();
  return `<details class="panel fold" data-fold="fw"${FOLD.fw?' open':''}><summary><h3>🤝 Keretszerződések <span class="aside">${list.length?list.length+' ügyfél':'nincs'}</span></h3></summary>
    ${list.length?`<div class="sheet-wrap"><table class="sheet fin-tbl"><thead><tr><th>Ügyfél</th><th>Szerződés</th><th>Aláírva</th><th>Érvényes eddig</th><th>Projektek</th><th></th></tr></thead><tbody>${list.map(f=>{const n=S.projects.filter(p=>p.status!=='lemondva'&&fwFor(p)===f).length,exp=f.validTo&&f.validTo<T;
      return `<tr><td><b>${esc(f.client)}</b>${f.note?`<div class="bl-meta">${esc(f.note)}</div>`:''}</td><td>${f.mode==='nemkell'?'<span class="statuspill p-mute">🚫 Nem igényel szerződést</span>':f.url?`<a class="bl-file" href="${esc(f.url)}" target="_blank" rel="noopener">📎 ${esc(f.fileName||'Megnyitás')}</a>`:'<span class="muted">—</span>'}</td><td>${esc(f.signedAt||'—')}</td><td>${f.validTo?`<span class="${exp?'bad-txt':''}">${esc(f.validTo)}${exp?' (lejárt)':''}</span>`:'határozatlan'}</td><td>${n}</td>
        <td class="nowrap"><button class="editbtn" type="button" data-action="fw-edit" data-id="${esc(f.id)}" aria-label="Módosítás">✏️</button><button class="trash" type="button" data-action="fw-del" data-id="${esc(f.id)}" aria-label="Törlés">🗑️</button></td></tr>`;}).join('')}</tbody></table></div>`:'<p class="hint" style="margin:8px 0 0">Ha egy ügyféllel keretszerződés van, az ügyfél projektjeinél nem kell külön szerződés.</p>'}
    <div class="btns" style="margin-top:10px"><button class="btn outline small" type="button" data-action="fw-new">+ Keretszerződés</button></div></details>`;}
function fwModal(f){const v=f||{},isNew=!v.id,nk=v.mode==='nemkell',names=[...new Set([...(S.clients||[]).map(c=>c.name),...S.projects.map(p=>p.client)].filter(Boolean))].sort((a,b)=>a.localeCompare(b,'hu'));
  openModal(!isNew?'Szerződés – '+v.client:v.client?'Szerződés – '+v.client:'Új keretszerződés',`<div class="fields">
    <div class="field full"><label for="m-fwClient">Ügyfél</label><input class="inp" id="m-fwClient" name="client" list="fw-clients" value="${esc(v.client||'')}" maxlength="160" autocomplete="off"${!isNew?' readonly':''}><datalist id="fw-clients">${names.map(n=>`<option value="${esc(n)}">`).join('')}</datalist></div>
    <div class="field full"><label class="bl-nocontract fw-chk"><input type="checkbox" id="m-fwNone" name="fwNone"${nk?' checked':''}> Ez az ügyfél nem igényel szerződést – a projektjeinél nem kérjük</label></div>
    <div class="fw-files fields field full"${nk?' hidden':''}><div class="field full"><label for="m-fwFile">Keretszerződés feltöltése (max. 10 MB)</label><input class="inp" id="m-fwFile" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic">
      ${v.url?`<small class="hint" style="margin:4px 0 0">Jelenleg: <a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.fileName||v.url)}</a> – új fájllal lecseréled.</small>`:''}</div>
    ${mf('fwUrl','…vagy link',{full:true,v:v.fileId?'':(v.url||''),ph:'https://…',max:500})}
    ${mf('fwSigned','Aláírás dátuma',{type:'date',v:v.signedAt||''})}${mf('fwValid','Érvényes eddig (üresen: határozatlan)',{type:'date',v:v.validTo||''})}
    </div>${mf('fwNote','Megjegyzés',{full:true,v:v.note||'',max:500})}</div>`,{submitLabel:'Mentés',submit:async fd=>{
    const client=String(fd.get('client')||'').trim(),file=($('m-fwFile')||{}).files&&$('m-fwFile').files[0],url=String(fd.get('fwUrl')||'').trim();
    if(client.length<2){toast('Add meg az ügyfelet.',true);return;}if(file&&file.size>10*1024*1024){toast('A fájl legfeljebb 10 MB lehet.',true);return;}
    const none=!!($('m-fwNone')||{}).checked;const a={id:v.id||'',client,mode:none?'nemkell':'',signedAt:fd.get('fwSigned')||'',validTo:fd.get('fwValid')||'',note:String(fd.get('fwNote')||'').trim()};
    if(file){a.b64=await readB64(file);a.name=file.name;a.mime=file.type||'application/octet-stream';}else if(!v.fileId||url)a.url=url;
    const btn=document.querySelector('#mform button[type=submit]');if(btn){btn.disabled=true;btn.textContent='Mentés…';}
    try{const d=await call('fwSave',a);closeModal();if(a.b64){S.clDocs=null;S._clDocsForce=true;}finApply(d);toast((none?'Nem igényel szerződést: ':'Szerződés mentve: ')+client);}catch(e){handleErr(e);if(btn){btn.disabled=false;btn.textContent='Mentés';}}}});}
Object.assign(ACT,{
  'fw-new':()=>fwModal(null),
  'cl-folder':async b=>{const w=window.open('about:blank','_blank');   // azonnal nyitjuk (különben a böngésző letiltja), a mappa linkje utána érkezik
    try{const r=await call('clientFolder',{client:b.dataset.client});if(w)w.location.href=r.url;else location.href=r.url;}catch(e){if(w)w.close();handleErr(e);}},
  'cl-docs':b=>clDocsModal(b.dataset.client),
  'fw-client':b=>{const f=fwOfClient(b.dataset.client);closeModal();fwModal(f||{client:b.dataset.client});},
  'fw-edit':b=>{const f=((S.fin&&S.fin.frameworks)||[]).find(x=>x.id===b.dataset.id);if(f){closeModal();fwModal(f);}},
  'fw-del':b=>{const id=b.dataset.id,f=((S.fin&&S.fin.frameworks)||[]).find(x=>x.id===id);confirmModal('Keretszerződés törlése',`${f?f.client+': ':''}a projektjeinél újra kérni fogjuk a szerződést. A Drive-fájl megmarad.`,'Törlés',()=>finCall('fwDelete',{id},'Törölve'));}
});
document.addEventListener('change',e=>{if(e.target.id==='m-fwNone'){const x=document.querySelector('.fw-files');if(x)x.hidden=e.target.checked;}if(e.target.id==='m-asFw'){const x=document.querySelector('.fw-extra');if(x)x.hidden=!e.target.checked;}});

/* Ügyfelek fül: „Nem kell szerződés” pipa – azonnal látszik, a mentés a háttérben fut */
document.addEventListener('change',async e=>{const t=e.target;if(!t.dataset||t.dataset.clnone===undefined||!S.fin)return;
  const client=t.dataset.clnone,on=t.checked,list=S.fin.frameworks=(S.fin.frameworks||[]).slice();let f=fwOfClient(client);const prev=f?Object.assign({},f):null;
  if(f){Object.assign(f,{mode:on?'nemkell':''});}else{f={id:'',client,mode:on?'nemkell':'',url:''};list.push(f);}render(true);
  try{const d=await call('fwSave',{id:f.id||'',client,mode:on?'nemkell':''});finApply(d);toast(on?client+': nem kell szerződés':client+': szerződés kérve');}
  catch(err){if(prev)Object.assign(f,prev);else list.splice(list.indexOf(f),1);render(true);handleErr(err);}});
