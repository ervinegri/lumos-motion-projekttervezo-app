/* ===================== ÉRTÉKESÍTÉS =====================
   Lehetőségek a szerződésig: Új érdeklődő → Ajánlat kiküldve → Szerződve / Elveszett.
   Az ügyvezető mindet látja (és szűrhet értékesítőre), az értékesítő csak a sajátjait. Szerződéskor projekt jön létre
   (Tervezés szakasz) – az értékesítő ezután csak azt látja, hogy szerződve lett, a projekt részleteit és a díjakat nem. */
const DL_TOUCH=typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches;   // érintőképernyő: saját húzás (lásd lent)
const DEAL_STAGES=[['uj','Új érdeklődő','💡'],['ajanlat','Ajánlat kiküldve','📨'],['nyert','Szerződve','✅'],['fizetve','Díjbekérő fizetve','💰'],['elveszett','Sikertelen','✕']];   // „Díjbekérő kifizetve”: szerződött lehetőség, amelynek projektjéhez kifizetett díjbekérő / számla tartozik (magától kerül ide)
const DEAL_OPEN=['uj','ajanlat','targyalas'],DEAL_CHANCE={uj:10,ajanlat:30,targyalas:60};
const DEAL_SOURCES=['Ajánlás','Visszatérő ügyfél','Weboldal','E-mail / telefon','Közösségi média','Rendezvényen','Hideg megkeresés','Egyéb'];
const DEAL_CT=[['','Még nincs kiküldve'],['kikuldve','Kiküldve, aláírásra vár'],['visszakuldve','Visszaküldték módosításra'],['alairva','Aláírva']];
const dealCtPill=d=>d.ctStatus?`<div class="dl-ct dl-ct-${esc(d.ctStatus)}">📝 ${({kikuldve:'Szerződés kiküldve',visszakuldve:'Szerződés: módosítás alatt',alairva:'Szerződés aláírva',nemkell:'Nem kell szerződés'})[d.ctStatus]||''}${d.ctAt&&!d.projectId?' · '+esc(fmtShort(d.ctAt)):''}</div>`:'';
const dealLbl=s=>(DEAL_STAGES.find(x=>x[0]===s)||[,s])[1];
const dealById=id=>(S.deals||[]).find(d=>d.id===id);
const dealVal=d=>{
  // Szerződés után a kapcsolt projekt aktuális nettó értéke az elsődleges adat.
  const p=d&&d.projectId&&d.stage==='nyert'&&typeof projById==='function'?projById(d.projectId):null;
  const live=p&&typeof projTotal==='function'?Math.round(projTotal(p)):0;
  return Math.max(0,live>0?live:Math.round(Number(d&&d.value)||0));
};
const dealChance=d=>d.chance==null||d.chance===''?(DEAL_CHANCE[d.stage]??0):+d.chance;

/* A projekt szerződött jutaléka és a pénz beérkezése alapján elszámolt jutalék külön mutató. */
function salesCommissionPreview(d){
  if(!d||d.stage!=='nyert'||!d.projectId)return null;
  const p=typeof projById==='function'?projById(d.projectId):null;
  if(p&&isAdmin()&&typeof salesCommEst==='function'){
    const e=salesCommEst(p,d);
    if(e&&Number.isFinite(Number(e.amt)))return {amt:Math.max(0,Math.round(Number(e.amt))),pct:e.pct,base:e.base,source:'project'};
  }
  const base=dealVal(d),manual=String(d.commManual==null?'':d.commManual).trim();
  if(manual.startsWith('ft:')){
    const amount=Math.max(0,Number(manual.slice(3))||0);
    return {amt:Math.round(amount),pct:base>0?Math.round(amount/base*10000)/100:0,base,source:'manual'};
  }
  if(manual!==''&&Number.isFinite(Number(manual)))return {amt:Math.round(base*Number(manual)/100),pct:Number(manual),base,source:'manual'};
  if(d.commPct!==''&&d.commPct!=null&&Number.isFinite(Number(d.commPct)))return {amt:Math.round(base*Number(d.commPct)/100),pct:Number(d.commPct),base,source:'rate'};
  if(Number(d.commAmt)>0)return {amt:Math.round(Number(d.commAmt)),pct:base>0?Math.round(Number(d.commAmt)/base*10000)/100:0,base,source:'saved'};
  return null;
}

S.salesF=S.salesF||{q:'',owner:'',old:false};
if(!Object.prototype.hasOwnProperty.call(S.salesF,'month'))S.salesF.month=todayISO().slice(0,7);
/* Havi értékesítési nézet: az ügylet a rendezvény / projekt időpontjához tartozik.
   A dátum nélküli ügyek külön nézetben maradnak elérhetők. */
const salesShiftMonth=(m,d)=>{
  const base=/^\d{4}-\d{2}$/.test(String(m||''))?m:todayISO().slice(0,7);
  const [y,mo]=base.split('-').map(Number);
  return new Date(Date.UTC(y,mo-1+d,1)).toISOString().slice(0,7);
};
const salesDealMonth=d=>{   // Ervin döntése (2026-11-15): ahol van kifizetett díjbekérő (foglaló), annak a kifizetési hónapja; egyébként (TIG, keretszerződés, még nincs fizetés) a szerződéskötés hónapja; végül a projekt / rendezvény dátuma
  const p=d&&d.projectId&&typeof projById==='function'?projById(d.projectId):null,ok=v=>/^\d{4}-\d{2}-\d{2}/.test(String(v||''));
  const date=String(d&&!d.noAdv&&ok(d.advPaidAt)?d.advPaidAt:d&&ok(d.wonAt)?d.wonAt:p&&p.date||d&&d.eventDate||'');
  return /^\d{4}-\d{2}-\d{2}/.test(date)?date.slice(0,7):'';
};
const salesMonthText=m=>/^\d{4}-\d{2}$/.test(String(m||''))
  ?new Intl.DateTimeFormat('hu-HU',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(m+'-01T12:00:00Z'))
  :m==='undated'?'Dátum nélkül':'Összes hónap';

/* Értékesítők a szűrőhöz és a kiosztáshoz: az ügyvezető (saját lehetőségei), az értékesítők, és akinek van lehetősége */
const salesOwnerKey=s=>String(s||'').toLocaleLowerCase('hu').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean).sort().join(' ');
/* Egy személy régebbi teljes névvel és újabb rövidített fióknévvel is szerepelhet. A címzett e-mail előtagja pontosabb egyezést ad. */
function salesSelfIds(deals){
  const me=S.me||{},ids=new Set(me.id?[me.id]:[]);
  const parts=String(me.email||'').split('@')[0].split('+')[0].split(/[._-]+/).filter(Boolean);
  const emailName=parts.length>=2?salesOwnerKey(parts.join(' ')):'',current=salesOwnerKey(me.name);
  if(!emailName||!current||!parts.some(t=>salesOwnerKey(t)===current))return ids;
  (S.salesPeople||[]).forEach(x=>{if(x.userId&&salesOwnerKey(x.name)===emailName)ids.add(x.userId);});
  (deals||[]).forEach(d=>{if(d.ownerId&&salesOwnerKey(d.ownerName)===emailName)ids.add(d.ownerId);});
  return ids;
}
function salesOwners(deals){
  const m=new Map(),me=S.me||{},self=salesSelfIds(deals);
  const ownName=[...(S.salesPeople||[]).filter(x=>self.has(x.userId)).map(x=>x.name),...(deals||[]).filter(d=>self.has(d.ownerId)).map(d=>d.ownerName),me.name||'Én'].filter(Boolean).sort((a,b)=>String(b).length-String(a).length)[0];
  if(me.id)m.set(me.id,'⭐ '+ownName+' (saját)');
  (S.salesPeople||[]).forEach(x=>{const id=self.has(x.userId)?me.id:x.userId;if(id&&!m.has(id))m.set(id,'👤 '+x.name);});
  (deals||[]).forEach(d=>{const id=self.has(d.ownerId)?me.id:d.ownerId;if(id&&!m.has(id))m.set(id,'👤 '+(d.ownerName||'?'));});
  return [...m.entries()];
}
/* ===== Teljesítmény: értékesítőnként a hónap aktivitása (HubSpot), eredménye és bevétele (app) =====
   Az ügyvezető mindenkit lát, az értékesítő csak magát (a háttér is így szűr). */
function salesPerfPanel(all,owners,self,selected,m){
  const me=S.me||{},key=id=>self.has(id)?me.id:id,act=(S._hsAct||(S._hsAct={}))[m];
  if(!act&&!S._hsActBusy&&typeof call==='function'){S._hsActBusy=m;call('hsActivity',{month:m}).then(r=>{S._hsAct[m]=r||{people:[]};}).catch(e=>{S._hsAct[m]={people:[],error:errText(e)};}).finally(()=>{S._hsActBusy='';if(S.tab==='ertekesites')render(true);});}
  const isSeller=id=>id===me.id||(S.salesPeople||[]).some(x=>x.userId===id&&String(id).indexOf('crew:')!==0)||(String(id).indexOf('crew:')===0&&((crewById(String(id).slice(5))||{}).roles||[]).includes('Értékesítő'));   // csak értékesítők (+ az ügyvezető); az ajánlók (pl. „Ajánlói jutalék”) nem
  const ids=owners.map(([id])=>id).filter(id=>(!selected||id===selected)&&isSeller(id)).sort((a,b)=>(a===me.id&&isAdmin())-(b===me.id&&isAdmin()));   // az ügyvezető sora alul
  if(!ids.length)return '';
  const inM=v=>String(v||'').slice(0,7)===m,qRe=/^\[(\d{4}-\d{2})-\d{2}[^\]]*\] 📄 Árajánlat elküldve.*?(?:– ([\d\s]+) Ft)?/;
  const rows=ids.map(id=>{const ds=all.filter(d=>key(d.ownerId)===id),nm=(owners.find(o=>o[0]===id)||[])[1]||'?';
    const quotes=[],qL=[];ds.forEach(d=>String(d.note||'').split('\n').forEach(l=>{const x=qRe.exec(l);if(x&&x[1]===m){const v=num(String(x[2]||'').replace(/\s/g,''));quotes.push(v);qL.push((d.title||'?')+(v?' · '+ftFmt(v):''));}}));
    const won=ds.filter(d=>d.stage==='nyert'&&inM(d.wonAt)),lost=ds.filter(d=>d.stage==='elveszett'&&inM(d.closedAt));
    const sp=(S.salesPeople||[]).filter(x=>key(x.userId)===id),cm=sp.map(x=>(x.comm||{})[m]).filter(Boolean);
    const h=((act&&act.people)||[]).filter(x=>key(x.userId)===id),hs=k=>h.length&&h.some(x=>x.linked)?h.reduce((a,x)=>a+(num(x[k])||0),0):null;
    const nwL=ds.filter(d=>inM(d.createdAt)),negL=ds.filter(d=>d.stage==='ajanlat'||d.stage==='targyalas'),its=cm.flatMap(x=>x.items||[]);
    const tips={nw:nwL.map(d=>(d.title||'?')+(dealVal(d)?' · '+ftFmt(dealVal(d)):'')),q:qL,nego:negL.map(d=>(d.title||'?')+' · '+'ajánlat kiküldve'+(dealVal(d)?' · '+ftFmt(dealVal(d)):'')),
      won:won.map(d=>(d.title||'?')+' · '+ftFmt(dealVal(d))),conv:won.map(d=>'✅ '+(d.title||'?')).concat(lost.map(d=>'✕ '+(d.title||'?')+(d.lostReason?' – '+d.lostReason:''))),
      base:its.map(x=>x.name+' · '+(x.invNo||'számla')+' · '+String(x.paidAt||'').slice(5).replace('-','.')+'. · '+ftFmt(x.base))};
    return {tips,boss:id===me.id&&isAdmin(),nm:nm.replace(/^[⭐👤🤝]\s*/u,'').replace(/\s*\(saját\)$/,''),linked:h.some(x=>x.linked),calls:hs('calls'),meet:hs('meetings'),mail:hs('emails'),cont:hs('contacts'),
      nw:ds.filter(d=>inM(d.createdAt)).length,nego:ds.filter(d=>d.stage==='ajanlat'||d.stage==='targyalas').length,qn:quotes.length,qv:quotes.reduce((a,b)=>a+b,0),
      wn:won.length,wv:won.reduce((a,d)=>a+dealVal(d),0),conv:won.length+lost.length?Math.round(won.length*100/(won.length+lost.length)):null,
      base:cm.reduce((a,x)=>a+num(x.base),0),comm:cm.reduce((a,x)=>a+num(x.amount),0)};});
  const tl=(head,L)=>head+(L&&L.length?':\n'+L.slice(0,15).map(x=>'• '+x).join('\n')+(L.length>15?'\n… és még '+(L.length-15):''):'\n(nincs)'),
    hsT=(r,what,head)=>!act?'HubSpot-adatok betöltése…':!r.linked?'Nincs párja a HubSpot-felhasználók között':head+' · '+salesMonthText(m);
  const c=(v,tip)=>`<td class="r"${tip?` data-tip="${esc(tip)}"`:''}>${v==null?'<span class="muted">–</span>':v}</td>`,ft=v=>v?ftFmt(v):'<span class="muted">0</span>';
  const err=act&&act.error?`<p class="hint bad-txt" style="margin:6px 0 0">HubSpot: ${esc(act.error)}</p>`:''+(act&&act.syncErr?`<p class="hint bad-txt" style="margin:6px 0 0">HubSpot-visszaírás hibája: ${esc(act.syncErr)}</p>`:'');
  return `<details class="panel sales-perf" ${S._perfOpen===false?'':'open'}><summary><h3>📈 Teljesítmény · ${esc(salesMonthText(m))}</h3><span class="aside">${act?'HubSpot-aktivitás + eredmény az appból':'HubSpot-adatok betöltése…'}</span></summary>
    <div class="sheet-wrap"><table class="sheet perf-tbl"><thead><tr><th rowspan="2">Értékesítő</th><th colspan="4" class="perf-g">Aktivitás <small>(HubSpot)</small></th><th colspan="3" class="perf-g">Megkeresés, tárgyalás</th><th colspan="2" class="perf-g">Eredmény</th><th colspan="2" class="perf-g">Bevétel <small>(nettó)</small></th></tr>
    <tr><th class="r">📞 Hívás</th><th class="r">🤝 Megbeszélés</th><th class="r">✉️ E-mail</th><th class="r">👤 Új kontakt</th><th class="r">💡 Új lehetőség</th><th class="r">📄 Ajánlat ki</th><th class="r">💬 Folyamatban</th><th class="r">✅ Szerződés</th><th class="r">🎯 Arány</th><th class="r">💰 Befolyt díj</th><th class="r">Jutalék</th></tr></thead>
    <tbody>${rows.map(r=>`<tr${r.boss?' class="perf-boss"':''}><td><b>${esc(r.nm)}</b>${r.boss?' <span class="muted" data-tip="Átmeneti: az értékesítést Péter viszi – ez a szám hónapról hónapra csökkenjen">· ügyvezető</span>':''}${act&&!r.linked?' <span class="muted" data-tip="Nincs párja a HubSpot-felhasználók között (sem e-mail-cím, sem név alapján)">· nincs HubSpot</span>':''}</td>${c(r.calls,hsT(r,'hívás','A HubSpotban rögzített hívások (tulajdonos szerint)'))}${c(r.meet,hsT(r,'megbeszélés','A HubSpotban rögzített megbeszélések'))}${c(r.mail,hsT(r,'kimenő e-mail','A HubSpotban naplózott kimenő e-mailek'))}${c(r.cont,hsT(r,'új kapcsolattartó','A HubSpotban ebben a hónapban létrehozott, hozzá rendelt kapcsolattartók'))}${c(r.nw,tl('Ebben a hónapban létrehozott lehetőségek',r.tips.nw))}${c(r.qn?r.qn+(r.qv?' · '+ftFmt(r.qv):''):0,tl('Az appból kiküldött árajánlatok (nettó)',r.tips.q))}${c(r.nego,tl('Most „Ajánlat kiküldve” szakaszban',r.tips.nego))}${c(r.wn?r.wn+' · '+ftFmt(r.wv):0,tl('Ebben a hónapban szerződött lehetőségek',r.tips.won))}${c(r.conv==null?null:r.conv+'%',tl('Szerződött / (szerződött + sikertelen) ebben a hónapban',r.tips.conv))}${c(ft(r.base),tl('Ténylegesen befolyt ügyfélbevétel = jutalékalap (nettó)',r.tips.base))}${c(ft(r.comm),'A befolyt díj után járó jutalék ebben a hónapban (sávos / kézi %)')}</tr>`).join('')}</tbody></table></div>${err}</details>`;
}
/* Az „Elveszett” oszlop alapból becsukva (keskeny sáv); a nézőnként megjegyzett állapot csak kényelmi beállítás */
function salesPaidOpen(){try{return localStorage.getItem('lpm_paid_open')!=='0';}catch(e){return true;}}   /* a „Díjbekérő fizetve” oszlop is becsukható (alapból nyitva) */
function salesLostOpen(){try{return localStorage.getItem('lpm_lost_open')==='1';}catch(e){return false;}}
function viewSales(){
  const f=S.salesF,T=todayISO(),all=(S.deals||[]).filter(d=>!(d.projectId&&typeof isFree==='function'&&(q=>q&&isFree(q))(projById(d.projectId)))),admin=isAdmin();   // nem fizetős projekt nem értékesítés: nem jelenik meg a lehetőségek között
  const owners=salesOwners(all),self=salesSelfIds(all),selected=self.has(f.owner)&&S.me?S.me.id:f.owner;
  if(selected!==f.owner)f.owner=selected;  // régi szűrőérték átvezetése ugyanarra a személyre
  // Az értékesítési Kanban folyamatos: minden időpontból láthatók a lehetőségek.
  // A hónapválasztó kizárólag a havi eredmény- és jutalékmutatókat befolyásolja.
  const month=/^\d{4}-\d{2}$/.test(f.month)?f.month:f.month==='all'?'all':T.slice(0,7);
  f.month=month;
  let L=all.filter(d=>!selected||(selected===(S.me&&S.me.id)?self.has(d.ownerId):d.ownerId===selected));
  if(f.q.trim())L=L.filter(d=>fold([d.title,d.client,d.contactName,d.venue,d.note,d.ownerName].join(' ')).includes(fold(f.q.trim())));
  const open=L.filter(d=>DEAL_OPEN.includes(d.stage)),won=L.filter(d=>d.stage==='nyert'),lost=L.filter(d=>d.stage==='elveszett');
  const sum=a=>a.reduce((s,d)=>s+dealVal(d),0),weighted=open.reduce((s,d)=>s+dealVal(d)*dealChance(d)/100,0);
  const wonM=month==='all'?won:won.filter(d=>salesDealMonth(d)===month),rate=won.length+lost.length?Math.round(won.length*100/(won.length+lost.length)):null;
  const contractComms=wonM.map(salesCommissionPreview).filter(x=>x&&x.amt>0),contractedComm=contractComms.reduce((sum,x)=>sum+x.amt,0);
  const late=open.filter(d=>d.nextDate&&d.nextDate<T).length,noNext=open.filter(d=>!d.nextStep&&!d.nextDate).length;
  const stOf=d=>d.stage==='nyert'&&(d.advPaidAt||d.noAdv)?'fizetve':d.stage==='targyalas'?'ajanlat':d.stage;   /* a megszűnt „Tárgyalás” az „Ajánlat kiküldve” oszlopban */
  const byStage=s=>L.filter(d=>stOf(d)===s).sort((a,b)=>DEAL_OPEN.includes(s)?String(a.nextDate||'9999').localeCompare(String(b.nextDate||'9999'))||String(a.eventDate||'9999').localeCompare(String(b.eventDate||'9999')):String(b.closedAt||b.wonAt||'').localeCompare(String(a.closedAt||a.wonAt||'')));
  const lostOpen=salesLostOpen(),paidOpen=salesPaidOpen(),TOG={elveszett:['dl-lost-tog','Sikertelen lehetőségek kinyitása'],fizetve:['dl-paid-tog','Fizetett díjbekérős lehetőségek kinyitása']};
  const col=([s,lbl,ic])=>{const arr=byStage(s);if((s==='elveszett'&&!lostOpen)||(s==='fizetve'&&!paidOpen))return `<section class="dl-col dl-${s} dl-col-closed" data-stage="${s}"><button type="button" class="dl-col-tog" data-action="${TOG[s][0]}" aria-expanded="false" title="${TOG[s][1]}"><span class="dl-vert">${ic} ${lbl}</span><span class="dl-colc">${arr.length}</span></button></section>`;
    return `<section class="dl-col dl-${s}" data-stage="${s}"><header class="dl-colh">${TOG[s]?`<button type="button" class="dl-col-x" data-action="${TOG[s][0]}" aria-expanded="true" title="Oszlop becsukása">‹</button>`:''}<span>${ic} ${lbl}</span><span class="dl-colc">${arr.length}${DEAL_OPEN.includes(s)||s==='nyert'||s==='fizetve'?`<small>${arr.length?' · '+ftFmt(sum(arr)):''}</small>`:''}</span></header>
    ${DEAL_OPEN.includes(s)?`<button class="dl-add dl-add-top" type="button" data-action="deal-new" data-stage="${s}">＋ Hozzáadás</button>`:''}<div class="dl-list">${arr.map(dealCard).join('')||(DEAL_OPEN.includes(s)?'':`<p class="dl-empty">—</p>`)}</div></section>`;};
  return `<div class="page-head sales-head"><div class="grow">${admin?'':'<p class="sub">Csak a saját lehetőségeidet látod</p>'}</div>
      <div class="sales-monthbar">
      <div class="sales-monthnav" role="group" aria-label="Értékesítés havi nézete">
        <button class="btn outline sales-month-arrow" type="button" data-action="sales-month-shift" data-d="-1" aria-label="Előző hónap" title="Előző hónap">‹</button>
        <button class="mnav-chip on sales-month-title" type="button" data-action="sales-month-today" title="Ugrás az aktuális hónapra" aria-live="polite">${esc(salesMonthText(month))}</button>
        <button class="btn outline sales-month-arrow" type="button" data-action="sales-month-shift" data-d="1" aria-label="Következő hónap" title="Következő hónap">›</button>
        <button class="btn outline sales-month-all${month==='all'?' active':''}" type="button" data-action="sales-month-all" aria-pressed="${month==='all'}">Összes időszak</button>
      </div>
      <span class="sales-monthhint">Havi eredmények · a kártyák minden időszakból láthatók</span>
    </div>
      <div class="dl-hbtns"><button class="btn btn-ark" type="button" data-action="quote-pick" title="Árajánlat küldése egy lehetőséghez">📄 Árajánlat<span class="dl-lg">&nbsp;küldése</span></button>
      <button class="btn outline" type="button" data-action="ark-open" title="Árkalkulátor (árajánlat nélkül)">🧮 <span class="dl-lg">Árkalkulátor</span><span class="dl-sm">Kalkulátor</span></button>
      <button class="btn primary" type="button" data-action="deal-new">+ Új<span class="dl-lg">&nbsp;lehetőség</span></button></div></div>


    <div class="tiles fin-tiles">
      <div class="tile"><div class="tile-n">${open.length}</div><div class="tile-l">nyitott lehetőség · ${ftFmt(sum(open))}${late?` · <b class="bad-txt">${late} lejárt teendő</b>`:noNext?` · ${noNext} teendő nélkül`:''}</div></div>
      <div class="tile" data-tip="A nyitott lehetőségek értéke az esélyükkel súlyozva"><div class="tile-n">${ftFmt(weighted)}</div><div class="tile-l">várható bevétel (súlyozott)</div></div>
      <div class="tile${wonM.length?' ok':''}"><div class="tile-n">${ftFmt(sum(wonM))}</div><div class="tile-l">${month==='all'?'összes szerződött projekt':'szerződött projekt · '+salesMonthText(month)} · ${wonM.length} db</div></div>
      ${(()=>{const payMonth=month==='all'?T.slice(0,7):month,ow=admin&&selected,
        people=(S.salesPeople||[]).filter(x=>!ow||(ow===(S.me&&S.me.id)?self.has(x.userId)||self.has(x.id):x.userId===ow||x.id===ow)),
        records=people.map(x=>(x.comm||{})[payMonth]).filter(Boolean),
        paidBase=records.reduce((sum,x)=>sum+num(x.base),0),
        paidComm=records.reduce((sum,x)=>sum+num(x.amount),0),
        cl=wonM.map(d=>({d,c:salesCommissionPreview(d)})).filter(x=>x.c&&x.c.amt>0),its=records.flatMap(x=>x.items||[]),
        tip='A jutalék a fizetéstől számít: abban a hónapban jár, amikor az ügyfél kifizette a számlát (a befolyt nettó összeg után). A szerződött jutalék csak tájékoztató – az adott hónapban megkötött projektek teljes jutalékalapjára számolva.'
          +(cl.length?'\n\nSzerződött projektek:\n'+cl.map(x=>'• '+(x.d.title||'?')+' · alap '+ftFmt(x.c.base!=null?x.c.base:dealVal(x.d))+' · jutalék '+ftFmt(x.c.amt)+(x.c.pct!=null&&x.c.pct!==''?' ('+x.c.pct+'%)':'')).join('\n'):'')
          +(its.length?'\n\nBefolyt után elszámolt ('+payMonth+'):\n'+its.map(x=>'• '+x.name+' · '+(x.invNo||'számla')+' · '+String(x.paidAt||'').slice(5).replace('-','.')+'. · alap '+ftFmt(x.base)).join('\n'):'');
        return '<div class="tile'+(paidComm?' ok':'')+'" data-tip="'+esc(tip)+'"><div class="tile-n">'+ftFmt(paidComm)+'</div><div class="tile-l">jutalék a befolyt összeg után ('+esc(salesMonthText(payMonth))+') · kifizetett alap: '+ftFmt(paidBase)+(contractedComm?'<div class="sales-comm-settled">tájékoztató: szerződött jutalék · '+contractComms.length+' projekt: '+ftFmt(contractedComm)+'</div>':'')+'</div></div>';})()}
    </div>
    ${salesPerfPanel(all,owners,self,selected,month==="all"?T.slice(0,7):month)}
    <div class="toolbar sales-tb"><input class="inp search" id="q-sales" type="search" placeholder="Keresés: név, ügyfél, kapcsolattartó…" value="${esc(f.q)}" aria-label="Keresés">
      ${admin?`<label class="sales-own"><span>Értékesítő:</span><select class="inp" id="sales-owner" data-cmb="Válassz értékesítőt…" aria-label="Kinek a lehetőségeit nézed"><option value="__all"${f.owner?'':' selected'}>👥 Mindenki</option>${owners.map(([id,n])=>`<option value="${esc(id)}"${f.owner===id?' selected':''}>${esc(n||'?')}</option>`).join('')}</select></label>`:''}</div>
    <div class="dl-board${lostOpen?'':' lost-closed'}${paidOpen?'':' paid-closed'}">${DEAL_STAGES.map(col).join('')}</div>
`;
}
/* kiküldött ajánlat ideje: a mentett adat, vagy (régebbi ajánlatnál) a jegyzet „📄 Árajánlat elküldve” sora */
const dealSentAt=d=>{if(d.qSent)return String(d.qSent).slice(0,10);const m=/\[(\d{4}-\d{2}-\d{2}) \d{2}:\d{2}[^\]]*\] 📄 Árajánlat elküldve/.exec(String(d.note||''));return m?m[1]:'';};
function dealCard(d){const T=todayISO(),od=d.nextDate&&d.nextDate<T&&DEAL_OPEN.includes(d.stage),td=d.nextDate===T;
  const foot=d.stage==='nyert'?`<div class="dl-won">✅ Szerződve${d.wonAt?' · '+esc(fmtShort(d.wonAt)):''}</div>${!d.advPaidAt&&d.noAdv?`<div class="dl-won dl-paid">📄 ${d.noAdv==='keret'?'Keretszerződés':'TIG-gel számlázzuk'} – nem kell díjbekérő</div>`:''}${d.advPaidAt?`<div class="dl-won dl-paid">💰 Díjbekérő kifizetve${/^\d{4}-\d\d-\d\d$/.test(d.advPaidAt)?' · '+esc(fmtShort(d.advPaidAt)):''}</div>`:''}`:d.stage==='elveszett'?`<div class="dl-lost">✕ ${esc(d.lostReason||'Sikertelen')}</div>`
    :(d.nextStep||d.nextDate)?`<div class="dl-next${od?' late':td?' today':''}">➜ ${esc(d.nextStep||'Teendő')}${d.nextDate?` · <b>${od?'lejárt: ':td?'ma':''}${td?'':esc(fmtShort(d.nextDate))}</b>`:''}</div>`:`<div class="dl-next none">➜ nincs következő lépés</div>`;
  return `<article class="dl-card${d.projectId?' dl-proj':''}"${d.projectId?' title="Ehhez az ügylethez már van projekt"':''} draggable="${d.stage==='nyert'||(typeof DL_TOUCH!=='undefined'&&DL_TOUCH)?'false':'true'}" data-deal="${esc(d.id)}" data-action="deal-open" data-id="${esc(d.id)}" tabindex="0">
    <div class="dl-t">${d.projectId&&!isSales()&&typeof projById==='function'&&projById(d.projectId)?`<button type="button" class="dl-project-link" data-action="deal-proj" data-id="${esc(d.projectId)}" title="Projekt megnyitása: ${esc(d.title)}" aria-label="Projekt megnyitása: ${esc(d.title)}">${esc(d.title)} <span aria-hidden="true">↗</span></button>`:esc(d.title)}</div>${d.contactName?`<div class="dl-c"><button type="button" class="linkbtn dl-hs" data-action="hs-contact" data-name="${esc(d.contactName)}" data-email="${esc(d.contactEmail||'')}" data-company="${esc(d.client||'')}" title="${esc(d.contactName)} – megnyitás a HubSpotban">${esc(d.contactName)} ↗</button></div>`:d.client?`<div class="dl-c">${esc(d.client)}</div>`:''}
    ${(typeof dealSentAt==='function'&&dealSentAt(d))&&DEAL_OPEN.includes(d.stage)?`<button type="button" class="dl-qdraft dl-qsent" data-action="q-sent-open" data-id="${esc(d.id)}" data-work="Ajánlat betöltése – ${esc(d.title||'')}" title="A kiküldött árajánlat megnyitása">📨 Ajánlat kiküldve · ${esc(fmtShort(dealSentAt(d)))}</button>`:''}
    ${d.qDraft?`<button type="button" class="dl-qdraft" data-action="q-draft-cont" data-id="${esc(d.id)}" data-work="Mentett ajánlat betöltése – ${esc(d.title||'')}" title="Mentett, még ki nem küldött árajánlat – folytatás">📄 Mentett ajánlat</button>`:''}
    <div class="dl-m"><span>${d.eventDate?'📅 '+esc(fmtShort(d.eventDate)):'<span class="muted">nincs dátum</span>'}</span><b>${dealVal(d)?ftFmt(dealVal(d)):'<span class="muted">?</span>'}</b></div>
    ${dealCtPill(d)}${(()=>{const c=salesCommissionPreview(d);return c&&c.amt>0?'<div class="dl-comm" data-tip="A projekt szerződött jutaléka"><span>💼 Jutalék: <b>'+ftFmt(c.amt)+'</b></span>'+(c.pct!==''&&c.pct!=null?'<span class="dl-comm-pct">'+esc(String(c.pct).replace('.',','))+'%</span>':'')+'</div>':'';})()}${foot}${DEAL_OPEN.includes(d.stage)||isAdmin()?`<div class="dl-f">${DEAL_OPEN.includes(d.stage)?`<span class="dl-ch" data-tip="Esély a szerződésre">${dealChance(d)}%</span>`:'<span></span>'}${isAdmin()&&d.ownerName?`<span class="dl-own-n">👤 ${esc(d.ownerName)}</span>`:''}</div>`:''}</article>`;}

/* Új lehetőségnél: milyen szolgáltatások jöhetnek szóba (többet is lehet) */
const DEAL_SERVICES=['Előadásrögzítés','Élő közvetítés (stream)','Kreatív videózás','Aftermovie / összefoglaló videó','Interjúk / imázsfilm','Short videók','Fotózás','Drónfelvétel','Videóvágás / utómunka','Vizuál-, hang- és fénytechnika','Egyéb'];
/* Általános ajánlat (árlista): az érdeklődő nem konkrét rendezvényre kér árat, csak igényei vannak (pl. összehasonlításhoz) – nincs rendezvénytípus, helyszín, dátum;
   a megnevezés és a következő lépés magától kitöltődik. A „Rendezvény típusa” mezőben tároljuk (új oszlop nélkül). */
const DEAL_GEN='Általános ajánlat',dealGen=d=>!!d&&d.eventType===DEAL_GEN;
function dGenApply(on){const f=$('mform');if(!f)return;f.classList.toggle('dl-gen',on);['m-dTitle','m-dType','m-dVenue','m-dDate','m-dValue','m-pre'].forEach(id=>{const el=$(id),fl=el&&el.closest('.field');if(fl)fl.hidden=on;});   /* árlistánál nincs megnevezés (magától: „Általános ajánlat – cég”), várható érték és előfoglalás sem */
  document.querySelectorAll('#mform .dl-kind label').forEach(l=>l.classList.toggle('on',l.querySelector('input').checked));
  if(on){const ns=$('m-dNext'),nn=$('m-dNextD');if(ns&&!ns.value.trim())ns.value='Árajánlat utánkövetése';if(nn&&!nn.value){const d=new Date();d.setDate(d.getDate()+7);const v=d.toISOString().slice(0,10);if(nn._flatpickr)nn._flatpickr.setDate(v,true);else nn.value=v;}}}
document.addEventListener('change',e=>{if(e.target&&e.target.name==='dKind')dGenApply(e.target.value==='gen');});
function dealModal(d0,preset){const d=Object.assign({stage:'uj'},d0||{},preset||{}),isNew=!d0,won=d.stage==='nyert';if(isNew&&!d.id)d.id=uuid();   // az új lehetőség azonosítója már itt megvan: újrapróbálkozáskor sem jön létre kétszer
  const cl=knownClients('').map(c=>c.company),stOpts=DEAL_STAGES.filter(x=>x[0]!=='nyert'&&x[0]!=='fizetve').map(x=>[x[0],x[2]+' '+x[1]]);
  openModal(isNew?'+ Új lehetőség':(won?'✅ ':'')+(d.title||'Lehetőség'),`<div class="fields">
    ${won?'':`<div class="field full"><div class="q-evsel dl-kind" role="radiogroup" aria-label="Az érdeklődés tárgya"><label class="${dealGen(d)?'':'on'}"><input type="radio" name="dKind" value="ev"${dealGen(d)?'':' checked'}> 🎉 Konkrét rendezvény <small>van időpont, helyszín vagy konkrét esemény</small></label><label class="${dealGen(d)?'on':''}"><input type="radio" name="dKind" value="gen"${dealGen(d)?' checked':''}> 📄 Általános ajánlat <small>árlista igények alapján, rendezvény nélkül</small></label></div></div>`}
    ${mf('dTitle','Megnevezés',{v:d.title,full:true,ph:'pl. Mlinárik – tavaszi konferencia felvétele',max:160})}
    <div class="field"><label for="m-dCName">Kapcsolattartó <span class="muted" style="font-weight:500;font-size:12px">– keresés a HubSpotban</span>${d.contactName?` <button type="button" class="linkbtn" data-action="hs-contact" style="font-size:12px;margin-left:6px">↗ Megnyitás a HubSpotban</button>`:''}</label><input class="inp" id="m-dCName" name="dCName" value="${esc(d.contactName||'')}" maxlength="120" autocomplete="off" placeholder="kezdd el gépelni a nevet vagy a céget"></div>
    <div class="field"><label for="m-dClient">Cég</label><input class="inp" id="m-dClient" name="dClient" value="${esc(d.client||'')}" maxlength="160" autocomplete="off" placeholder="Kezdd el gépelni a cégnevet…"></div>
    ${mf('dCEmail','E-mail',{v:d.contactEmail,type:'email',max:160})}
    ${phoneField({name:'dCPhone',value:d.contactPhone||'',after:'<button class="btn ghost small vcf-btn" type="button" data-action="deal-vcf" title="Névjegy a telefonra (QR-kód)" aria-label="Névjegy a telefonra">📇</button>'})}
    ${mf('dCEmail2','Másodlagos e-mail',{v:d.contactEmail2||'',type:'email',max:160,ph:'pl. asszisztens, pénzügy (nem kötelező)'})}
    ${ms('dSource','Honnan jött? <span class="muted" style="font-weight:500;font-size:12px">– a HubSpotból</span>',DEAL_SOURCES,d.source||'',{empty:'—',cmb:'Honnan jött?…'})}
    ${ms('dType','Rendezvény típusa',d.eventType&&!dealGen(d)&&!EVENT_TYPES.includes(d.eventType)?EVENT_TYPES.concat([d.eventType]):EVENT_TYPES,dealGen(d)?'':d.eventType||'',{empty:'—',cmb:'Válassz típust…'})}
    ${(()=>{const cur=String(d.services||'').split(',').map(x=>x.trim()).filter(Boolean);return mselField('dServices','Szóba jövő szolgáltatások',DEAL_SERVICES.concat(cur.filter(x=>!DEAL_SERVICES.includes(x))),cur,'Válaszd ki, mik jöhetnek szóba (többet is lehet)…',true).replace('<div class="field"','<div class="field full"');})()}
    ${isAdmin()&&!won?`<div class="field full"><label for="m-dOwner">Értékesítő</label><select class="inp" id="m-dOwner" name="dOwner" data-cmb="Válassz értékesítőt…">${salesOwners(S.deals||[]).map(([id,n])=>`<option value="${esc(id)}"${(salesSelfIds(S.deals||[]).has(d.ownerId||S.salesF.owner)?S.me&&S.me.id:(d.ownerId||S.salesF.owner||(S.me&&S.me.id)))===id?' selected':''}>${esc(n)}</option>`).join('')}</select></div>`:''}
    <div class="field"><label for="m-dVenue">Helyszín <a class="linkbtn" id="dl-map" href="${d.venue?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(d.venue):'#'}" target="_blank" rel="noopener" style="font-size:12px;margin-left:6px${d.venue?'':';display:none'}">📍 Térkép ↗</a></label><input class="inp" id="m-dVenue" name="dVenue" value="${esc(d.venue||'')}" maxlength="200" autocomplete="off" placeholder="kezdd el gépelni: helyszín neve vagy cím"></div>
    ${mf('dDate','Rendezvény dátuma',{v:d.eventDate,type:'date'})}
    ${moneyField('dValue','Várható érték (nettó)',d.value==null?'':d.value,{steps:false,ph:'pl. 450 000'})}
    ${won?'':ms('dStage','Szakasz',stOpts,d.stage)}
    ${won?'':`<div class="field"><label for="m-dChance">Esély (%)</label><input class="inp" id="m-dChance" name="dChance" type="number" min="0" max="100" step="5" value="${dealChance(d)}"></div>`}
    ${won?'':`<div class="field full dl-nextf"><div class="dl-nextrow"><div class="dl-nc"><label for="m-dNext">Következő lépés <span class="req-star">*</span></label><input class="inp" id="m-dNext" name="dNext" value="${esc(d.nextStep||'')}" maxlength="200" placeholder="pl. ajánlat utánkövetése telefonon"></div><div class="dl-nc"><label for="m-dNextD">Mikor? <span class="req-star">*</span></label><input class="inp" id="m-dNextD" name="dNextD" type="date" value="${esc(d.nextDate||'')}" required></div></div></div>`}
    <div class="field full" id="dl-lostf"${d.stage==='elveszett'?'':' hidden'}><label for="m-dLost">Miért nem sikerült?</label><input class="inp" id="m-dLost" name="dLost" value="${esc(d.lostReason||'')}" maxlength="300" placeholder="pl. drága volt, más céget választottak, elmarad a rendezvény"></div>
    ${isAdmin()&&d.id&&!['nyert','elveszett'].includes(d.stage)?(()=>{const cur=(S.projects||[]).find(q=>q.preDeal===d.id),cand=(S.projects||[]).filter(q=>!['atadva','lemondva'].includes(q.status)&&(!q.preDeal||q.preDeal===d.id)&&!(typeof projDeal==='function'&&projDeal(q))).sort((a,b)=>String(a.date||'9').localeCompare(String(b.date||'9')));
      return `<div class="field full"><label for="m-pre">🤝 Előfoglalt projekt <span class="muted" style="font-weight:400">(ha a dátum / stáb már foglalva van)</span></label><select class="inp" id="m-pre" name="preProj" data-cmb="Nincs – válassz projektet, ha már van előfoglalás…"><option value="">— nincs —</option>${cand.map(q=>`<option value="${esc(q.id)}"${cur&&cur.id===q.id?' selected':''}>${esc(q.name)}${q.date?' · '+esc(fmtDay(q.date)):''}</option>`).join('')}</select></div>`;})():''}
    <div class="field full"><label for="m-dNoteNew">Jegyzetek</label><textarea class="inp" id="m-dNoteNew" name="dNoteNew" rows="2" maxlength="3000" placeholder="Új jegyzet: igények, egyeztetett részletek, ajánlat verziói… (mentéskor dátummal kerül a listába)"></textarea>
      <input type="hidden" name="dNote" id="m-dNote" value="${esc(d.note||'')}"><p class="hint" id="m-dHsSt" style="margin:8px 0 0"></p><div class="dnotes" id="m-dNotes" data-fb="${esc(dNoteFb(d))}" data-by="${esc(d.ownerName||'')}">${dNotesHtml(dNoteFix(d.note,dNoteFb(d),d.ownerName))}</div></div>
    ${won?`<div class="field full"><p class="hint" style="margin:0">✅ Szerződve ${d.wonAt?esc(fmtShort(d.wonAt)):''} – a projekt elkészült, a további részleteket a projektnél kezeli a csapat.${isAdmin()&&d.projectId&&projById(d.projectId)?` <button class="linkbtn" type="button" data-action="deal-proj" data-id="${esc(d.projectId)}">Projekt megnyitása →</button>`:''}</p></div>`:''}
    ${!isNew&&d.ctStatus!=='nemkell'?`<div class="field"><label for="m-dCt">Szerződés állapota</label><select class="inp" id="m-dCt" name="dCt" data-cmb="Válassz…">${DEAL_CT.map(([v,l])=>`<option value="${v}"${(d.ctStatus||'')===v?' selected':''}>${l}</option>`).join('')}</select></div>`:''}
    ${!isNew?`<div class="field full"><p class="hint" style="margin:0">${esc(d.ownerName||'')}${d.createdAt?' · felvéve: '+esc(String(d.createdAt).slice(0,10)):''}${d.updatedAt?' · módosítva: '+esc(String(d.updatedAt).slice(0,16).replace('T',' '))+(d.updatedBy?' ('+esc(d.updatedBy)+')':''):''}</p></div>`:''}
  </div>`,{left:(!isNew&&!won?`<button type="button" class="btn danger small" data-action="deal-del" data-id="${esc(d.id)}">Törlés</button>`:'')+(!isNew&&(isAdmin()||(S.me&&d.ownerId===S.me.id))?`${dealSentAt(d)?`<button type="button" class="btn outline" data-action="q-sent-open" data-id="${esc(d.id)}" data-work="Ajánlat betöltése – ${esc(d.title||'')}">📨 Kiküldött ajánlat</button>`:''}${d.qDraft?`<button type="button" class="btn q-cta" data-action="q-draft-cont" data-id="${esc(d.id)}">📄 Mentett ajánlat folytatása</button><button type="button" class="btn outline" data-action="q-draft-new" data-id="${esc(d.id)}">＋ Új árajánlat</button>`:`<button type="button" class="btn q-cta" data-action="deal-quote" data-id="${esc(d.id)}">📄 Árajánlat készítése</button>`}`:''),submitLabel:'Mentés',submit:async fd=>{
    const nd=Object.assign({},d0||{},{id:d.id||'',title:String(fd.get('dTitle')||'').trim(),client:String(fd.get('dClient')||'').trim(),eventType:fd.get('dType')||'',contactName:String(fd.get('dCName')||'').trim(),contactEmail:String(fd.get('dCEmail')||'').trim(),contactEmail2:String(fd.get('dCEmail2')||'').trim(),contactPhone:String(fd.get('dCPhone')||'').trim(),
      venue:fd.get('dKind')==='gen'?'':String(fd.get('dVenue')||'').trim(),eventDate:fd.get('dKind')==='gen'?'':fd.get('dDate')||'',value:moneyVal(fd.get('dValue')),source:fd.get('dSource')||'',services:fd.getAll('dServices').join(', '),note:dNoteAdd(dNoteFix(String(fd.get('dNote')||''),dNoteFb(d),d.ownerName),String(fd.get('dNoteNew')||''))});
    if(fd.get('dKind')==='gen'){nd.eventType=DEAL_GEN;if(nd.title.length<2||/^Általános ajánlat – /.test(nd.title))nd.title='Általános ajánlat – '+(nd.client||nd.contactName||'érdeklődő');}else if(fd.get('dKind')==='ev'&&nd.eventType===DEAL_GEN)nd.eventType='';
    if(fd.get('dOwner'))nd.ownerId=fd.get('dOwner');   // az ügyvezető kioszthatja egy értékesítőnek (vagy magának)
    if(!won){nd.stage=fd.get('dStage')||'uj';nd.chance=fd.get('dChance')===''?'':Number(fd.get('dChance'));nd.nextStep=String(fd.get('dNext')||'').trim();nd.nextDate=fd.get('dNextD')||'';nd.lostReason=String(fd.get('dLost')||'').trim();}
    if(nd.title.length<2){toast('Add meg a lehetőség nevét.',true);$('m-dTitle').focus();return;}
    if(!won&&nd.stage!=='elveszett'){const ns=$('m-dNext'),nn=$('m-dNextD');[ns,nn].forEach(x=>{if(x)x.style.borderColor='';});   // a következő lépés és a dátuma kötelező
      const fp=x=>x&&x._flatpickr&&x._flatpickr.altInput||x;
      if(!nd.nextStep){toast('Add meg a következő lépést.',true);if(ns){ns.style.borderColor='var(--bad)';ns.focus();}return;}
      if(!nd.nextDate){toast('Add meg a következő lépés dátumát.',true);if(nn){fp(nn).style.borderColor='var(--bad)';fp(nn).focus();}return;}}
    if(nd.stage==='elveszett'&&nd.lostReason.length<3){toast('Írd be röviden, miért nem sikerült.',true);$('dl-lostf').hidden=false;$('m-dLost').focus();return;}
    try{const before=new Set((S.deals||[]).map(x=>x.id));const r=await call('saveDeal',nd);S.deals=r.deals||S.deals;if(isNew&&S._qAfterNew){S._qAfterNew=false;const nw=(S.deals||[]).find(x=>!before.has(x.id));if(nw)setTimeout(()=>ACT['deal-quote']({dataset:{id:nw.id}}),50);}const pp=fd.get('preProj');if(!isNew&&pp!==null){const cur=(S.projects||[]).find(q=>q.preDeal===d.id);if((cur&&cur.id)!==(pp||undefined)&&!(!cur&&!pp)){if(cur&&cur.id!==pp){await call('projPreDeal',{projectId:cur.id,dealId:''});cur.preDeal='';}if(pp){await call('projPreDeal',{projectId:pp,dealId:d.id});const q=projById(pp);if(q)q.preDeal=d.id;}}}   /* előfoglalás összekötése innen */
    const ct=fd.get('dCt');if(!isNew&&ct!==null&&ct!==(d.ctStatus||'')){const r2=await call('ctStatus',{dealId:d.id,status:ct});if(r2.deals)S.deals=r2.deals;if(r2.billing&&S.fin)S.fin.billing=r2.billing;}closeModal();render(true);if(nd.stage==='elveszett'&&d.stage!=='elveszett')setTimeout(()=>preLostOffer(d.id),80);toast(isNew?'Lehetőség felvéve':'Mentve');}catch(e){handleErr(e);}}});
  const mb=document.querySelector('#modalRoot .mbox');if(mb)mb.classList.add('mbox-wide','mbox-scroll');if(!isNew)setTimeout(dNotesLoadHs,50);dSourceLoad(d.source||'');if(dealGen(d))setTimeout(()=>dGenApply(true),0);}

function dealWinModal(d){
  /* Ha a projekt már létezik a projekttervezőben, a lehetőség ahhoz kapcsolható (nem jön létre másodpéldány) */
  const linked=new Set((S.deals||[]).filter(x=>x.id!==d.id&&x.projectId).map(x=>x.projectId));
  const cand=isAdmin()?(S.projects||[]).filter(p=>p.status!=='lemondva'&&!linked.has(p.id)):[];
  const nf=x=>fold(String(x||'')).replace(/[^a-z0-9]+/g,' ').trim(),dn=nf(d.title),dc=nf(d.client);
  const score=p=>{let s=0;const pn=nf(p.name);if(dn&&pn&&(pn===dn||pn.includes(dn)||dn.includes(pn)))s+=3;if(dc&&nf(p.client)&&(nf(p.client).includes(dc)||dc.includes(nf(p.client))))s+=2;if(d.eventDate&&p.date===d.eventDate)s+=2;if(d.contactEmail&&String(p.contactEmail||'').toLowerCase()===String(d.contactEmail).toLowerCase())s+=2;return s;};
  const pre=cand.find(p=>p.preDeal===d.id),best=pre?{p:pre,s:99}:cand.map(p=>({p,s:score(p)})).filter(x=>x.s>=3).sort((a,b)=>b.s-a.s)[0];   /* előfoglalt projekt: ez válik élessé */
  const opts=cand.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).map(p=>`<option value="${esc(p.id)}"${best&&best.p.id===p.id?' selected':''}>${esc(p.name)}${p.date?' · '+esc(fmtShort(p.date)):''}${p.client?' · '+esc(p.client):''}</option>`).join('');
  const linkF=cand.length?`<div class="field full"><label for="m-wProj">Projekt</label><select class="inp" id="m-wProj" name="wProj" data-cmb="Új projekt létrehozása…"><option value="">➕ Új projekt létrehozása</option>${opts}</select><small class="hint" style="margin:4px 0 0">Ha már létrehoztad a projektet, válaszd ki – a lehetőség ahhoz kapcsolódik, nem jön létre új projekt.</small></div>`:'';
  openModal('✅ Szerződve – '+d.title,`<p style="margin:0 0 10px">Gratulálok! 🎉 Mentés után a lehetőségből <b>projekt</b> lesz a Tervezés szakaszban (vagy egy meglévő projekthez kapcsolódik).</p><div class="fields">
    ${linkF}
    ${mf('wTitle','Projekt neve',{v:d.title,full:true,max:160}).replace('<div class="field','<div class="field w-new')}
    ${moneyField('wValue','Szerződött összeg (nettó)',dealVal(d)||'',{steps:false})}
    ${mf('wDate','Rendezvény (első) napja',{v:d.eventDate,type:'date'}).replace('<div class="field','<div class="field w-new')}</div>`,{submitLabel:'✅ Szerződve',submit:async fd=>{
    const value=moneyVal(fd.get('wValue')),date=fd.get('wDate')||'',title=String(fd.get('wTitle')||'').trim(),pid=String(fd.get('wProj')||'');
    if(!value){toast('Add meg a szerződött összeget.',true);return;}if(!pid&&!date){toast('Add meg a rendezvény napját.',true);return;}
    try{const r=await call('winDeal',{id:d.id,value,eventDate:date,title,projectId:pid});S.deals=r.deals||S.deals;closeModal();render(true);toast(pid?'Szerződve – a lehetőség a meglévő projekthez kapcsolódik.':'Szerződve – a projekt elkészült (Tervezés).');
      if(isAdmin()&&typeof load==='function')setTimeout(()=>{try{load(true);}catch(x){}},300);}catch(e){handleErr(e);}}});
  const sync=()=>{const sel=$('m-wProj'),on=!!(sel&&sel.value);document.querySelectorAll('#mform .w-new').forEach(x=>x.hidden=on);};sync();
  const sel=$('m-wProj');if(sel)sel.addEventListener('change',sync);}

async function dealMove(id,stage){const d=dealById(id);if(!d||d.stage===stage)return;
  if(stage==='fizetve'){toast('Ide magától kerül a lehetőség: ha a díjbekérőt (vagy számlát) kifizették, vagy ha az ügyfelet TIG-gel / keretszerződéssel számlázzuk.',true);return;}
  if(d.stage==='nyert'){toast('Szerződött lehetőséget nem lehet visszahúzni.',true);return;}
  if(stage==='nyert'){dealWinModal(d);return;}
  if(stage==='elveszett'){   // Sikertelen: csak az okát kérdezzük
    openModal('Sikertelen: '+d.title,`<div class="fields"><div class="field full"><label for="m-lostOnly">Miért nem sikerült?</label><input class="inp" id="m-lostOnly" name="lost" value="${esc(d.lostReason||'')}" maxlength="300" placeholder="pl. drága volt, más céget választottak, elmarad a rendezvény" autocomplete="off"></div></div>`,{submitLabel:'Mentés – sikertelen',noDraft:true,submit:async fd=>{
      const nd=Object.assign({},d,{stage:'elveszett',lostReason:String(fd.get('lost')||'').trim(),chance:0});closeModal();const prev=S.deals;S.deals=S.deals.map(x=>x.id===id?nd:x);render(true);
      try{const r=await call('saveDeal',nd);S.deals=r.deals||S.deals;render(true);toast('Sikertelen: '+d.title);}catch(e){S.deals=prev;render(true);handleErr(e);}}});
    setTimeout(()=>{const x=$('m-lostOnly');if(x)x.focus();},60);return;}
  if(DEAL_OPEN.includes(stage)&&(!d.nextStep||!d.nextDate)){toast('Előbb add meg a következő lépést és a dátumát.',true);dealModal(d);return;}   // a következő lépés és a dátuma kötelező
  const nd=Object.assign({},d,{stage});if(d.chance==null||d.chance===''||+d.chance===DEAL_CHANCE[d.stage])nd.chance=DEAL_CHANCE[stage];
  const prev=S.deals;S.deals=S.deals.map(x=>x.id===id?nd:x);render(true);
  try{const r=await call('saveDeal',nd);S.deals=r.deals||S.deals;render(true);toast(d.title+' → '+dealLbl(stage));}catch(e){S.deals=prev;render(true);handleErr(e);}}   // áthelyezés: melyik oszlopba került (nem „új érdeklődő” felvétel)

Object.assign(ACT,{
  'deal-new':b=>(S._qAfterNew=false,dealModal(null,b&&b.dataset.stage?{stage:b.dataset.stage}:null)),
  'deal-open':b=>{if(S._dragDeal)return;const d=dealById(b.dataset.id);if(d)dealModal(d);},
  'deal-win':b=>{const d=dealById(b.dataset.id);if(d){closeModal();dealWinModal(d);}},
  'deal-del':b=>{const d=dealById(b.dataset.id);if(!d)return;confirmModal('Lehetőség törlése','Biztosan törlöd: „'+d.title+'”? Ha csak nem jött össze, inkább tedd a Sikertelen oszlopba – így a nyerési arány is pontos marad.','Törlés',async()=>{try{const r=await call('deleteDeal',{id:d.id});S.deals=r.deals||S.deals;render(true);toast('Törölve');}catch(e){handleErr(e);}});},
  'deal-proj':b=>{if(isSales()||typeof openProject!=='function'||!projById(b.dataset.id))return;openProject(b.dataset.id);},
  'sales-month-shift':b=>{S.salesF.month=salesShiftMonth(S.salesF.month,Number(b.dataset.d)||0);render(true);},
  'sales-month-today':()=>{S.salesF.month=todayISO().slice(0,7);render(true);},
  'sales-month-all':()=>{S.salesF.month='all';render(true);},
  'sales-owner':b=>{S.salesF.owner=b.dataset.id||'';render(true);},
  'sales-old':()=>{S.salesF.old=!S.salesF.old;render(true);}
});
document.addEventListener('input',e=>{if(e.target&&e.target.id==='q-sales'){S.salesF.q=e.target.value;const pos=e.target.selectionStart;render(true);const i=$('q-sales');if(i){i.focus();try{i.setSelectionRange(pos,pos);}catch(x){}}}});
document.addEventListener('change',e=>{const t=e.target;if(!t)return;
  if(t.id==='m-dStage'){const lf=$('dl-lostf');if(lf)lf.hidden=t.value!=='elveszett';const ch=$('m-dChance');if(ch&&DEAL_CHANCE[t.value]!=null)ch.value=DEAL_CHANCE[t.value];if(t.value==='elveszett'&&ch)ch.value=0;}
  if(t.id==='m-dClient'){const c=knownClients('').find(x=>fold(x.company)===fold(t.value.trim()));if(c){[['m-dCName',c.name],['m-dCEmail',c.email]].forEach(([id,v])=>{const el=$(id);if(el&&!el.value&&v)el.value=v;});{const ph=$('m-dCPhone');if(ph&&!ph.value&&c.phone)mPhoneSet('m-dCPhone',c.phone);}}}});
/* Húzd és ejtsd: a kártya a másik oszlopba kerül (Szerződve: projekt létrehozása, Elveszett: ok megadása) */
/* Telefon / tablet: hosszan nyomva a kártya „felemelhető”, és ujjal áthúzható egy másik oszlopba (a böngésző saját húzása érintőn megbízhatatlan, és szövegkijelölést indít) */
(()=>{let tm=null,st=null,card=null,ghost=null,over=null,sx=0,sy=0,dx=0,dy=0,raf=0,lx=0,ly=0;
  const colAt=(x,y)=>{if(ghost)ghost.style.visibility='hidden';const el=document.elementFromPoint(x,y);if(ghost)ghost.style.visibility='';return el&&el.closest&&el.closest('.dl-col');};
  const end=()=>{clearTimeout(tm);tm=null;if(card){card.removeEventListener('touchmove',mv);card.removeEventListener('touchend',fin);card.removeEventListener('touchcancel',fin);}cancelAnimationFrame(raf);const pend=S._dlDragRender;S._dlDrag=0;S._dlDragRender=0;if(pend)setTimeout(()=>render(true),0);if(ghost)ghost.remove();ghost=null;if(card)card.classList.remove('drag');document.querySelectorAll('.dl-col.over').forEach(x=>x.classList.remove('over'));document.body.classList.remove('dl-touchdrag');card=null;st=null;over=null;};
  document.addEventListener('touchstart',e=>{if(card){if(![...e.touches].some(x=>x.identifier===st.tid))end();return;}   /* a húzó ujj már nincs a kijelzőn (elveszett felengedés): a húzás véget ér */
    const c=e.target.closest&&e.target.closest('.dl-card');if(!c||e.touches.length>1||e.target.closest('a,button,input,select,textarea'))return;const d=dealById(c.dataset.id);if(!d||d.stage==='nyert')return;
    const t=e.touches[0];sx=t.clientX;sy=t.clientY;st={c,tid:t.identifier};
    tm=setTimeout(()=>{card=c;const r=c.getBoundingClientRect();dx=sx-r.left;dy=sy-r.top;ghost=c.cloneNode(true);ghost.classList.add('dl-ghost');Object.assign(ghost.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',zIndex:9999,pointerEvents:'none'});document.body.appendChild(ghost);c.classList.add('drag');document.body.classList.add('dl-touchdrag');S._dlDrag=1;last=Date.now();c.addEventListener('touchmove',mv,{passive:false});c.addEventListener('touchend',fin);c.addEventListener('touchcancel',fin);   /* a kártyán is figyelünk: ha a dokumentumig nem jutna el az esemény, a húzás akkor se ragad be */
      clearInterval(wd);wd=setInterval(()=>{if(!card){clearInterval(wd);return;}if(Date.now()-last>8000)end();},1000);try{navigator.vibrate&&navigator.vibrate(15);}catch(x){}},380);},{passive:true});
  const scr=(ax,el)=>{let h=el;while(h&&h!==document.body&&h!==document.documentElement){const cs=getComputedStyle(h);if(ax==='x'?h.scrollWidth>h.clientWidth+2&&/(auto|scroll)/.test(cs.overflowX):h.scrollHeight>h.clientHeight+2&&/(auto|scroll)/.test(cs.overflowY))return h;h=h.parentElement;}return null;};
  const hScroller=()=>scr('x',document.querySelector('.dl-board'));
  const scrollXY=(vx,vy)=>{   /* görgetés oldalra (az oszlopok tartója) és fel-le (az a tartó, amelyik ténylegesen görög – telefonon nem mindig az ablak) */
    if(vx){const h=hScroller();if(h)h.scrollLeft+=vx;else scrollBy(vx,0);}
    if(vy){const v=scr('y',document.querySelector('.dl-board'));const before=v?v.scrollTop:scrollY;if(v)v.scrollTop+=vy;if(!v||v.scrollTop===before){const se=document.scrollingElement||document.documentElement;se.scrollTop+=vy;}}};
  let last=0,wd=0;const mv=e=>{if(!st)return;last=Date.now();const t=card&&st.tid!=null?[...e.touches].find(x=>x.identifier===st.tid)||e.touches[0]:e.touches[0];if(!card){if(Math.abs(t.clientX-sx)>8||Math.abs(t.clientY-sy)>8){clearTimeout(tm);st=null;}return;}
    e.preventDefault();
    const o=[...e.touches].find(x=>x.identifier!==st.tid);   /* a másik ujjal közben görgethető: oldalra az oszlopok, fel-le az oldal */
    if(o){if(st.o&&st.o.id===o.identifier){scrollXY(-(o.clientX-st.o.x)*1.6,-(o.clientY-st.o.y)*1.6);const col=colAt(t.clientX,t.clientY);if(col!==over){document.querySelectorAll('.dl-col.over').forEach(x=>x.classList.remove('over'));if(col)col.classList.add('over');over=col;}}st.o={id:o.identifier,x:o.clientX,y:o.clientY};}else st.o=null;ghost.style.left=(t.clientX-dx)+'px';ghost.style.top=(t.clientY-dy)+'px';
    const col=colAt(t.clientX,t.clientY);if(col!==over){document.querySelectorAll('.dl-col.over').forEach(x=>x.classList.remove('over'));if(col)col.classList.add('over');over=col;}
    cancelAnimationFrame(raf);lx=t.clientX;ly=t.clientY;const step=()=>{   /* a képernyő széléhez húzva: oldalra az oszlopok, fel-le az oldal görög (folyamatosan, amíg ott tartod) */
      const W=innerWidth,H=innerHeight,E=64,vx=lx<E?-Math.ceil((E-lx)/2)-4:lx>W-E?Math.ceil((lx-W+E)/2)+4:0,vy=ly<E+60?-Math.ceil((E+60-ly)/4):ly>H-E?Math.ceil((ly-H+E)/4):0;if(!vx&&!vy)return;
      scrollXY(vx,vy);
      const col=colAt(lx,ly);if(col!==over){document.querySelectorAll('.dl-col.over').forEach(x=>x.classList.remove('over'));if(col)col.classList.add('over');over=col;}
      raf=requestAnimationFrame(step);};raf=requestAnimationFrame(step);};
  document.addEventListener('touchmove',mv,{passive:false});
  const fin=e=>{if(!st||e._dlDone)return;e._dlDone=1;if(card&&![...e.changedTouches].some(x=>x.identifier===st.tid))return;   /* a görgető ujj felemelése nem ejti le a kártyát */
    if(card&&e.type==='touchend'){if(e.cancelable)e.preventDefault();   /* ne legyen utána „kattintás” a kártyán */
      const t=[...e.changedTouches].find(x=>x.identifier===st.tid)||e.changedTouches[0],col=colAt(t.clientX,t.clientY),id=card.dataset.deal;end();if(col&&col.dataset.stage)dealMove(id,col.dataset.stage);return;}end();};
  document.addEventListener('touchend',fin,true);document.addEventListener('touchcancel',fin,true);addEventListener('blur',()=>{if(card||st)end();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&(card||st))end();});
  document.addEventListener('gesturestart',e=>{if(card)e.preventDefault();});   /* két ujjal görgetéskor ne nagyítson az iPhone */
  document.addEventListener('contextmenu',e=>{if(e.target.closest&&e.target.closest('.dl-card'))e.preventDefault();});})();
document.addEventListener('dragstart',e=>{const c=e.target.closest&&e.target.closest('.dl-card');if(!c)return;S._dragDeal=c.dataset.deal;c.classList.add('drag');try{e.dataTransfer.setData('text/plain',c.dataset.deal);e.dataTransfer.effectAllowed='move';}catch(x){}});
document.addEventListener('dragend',e=>{document.querySelectorAll('.dl-card.drag').forEach(x=>x.classList.remove('drag'));document.querySelectorAll('.dl-col.over').forEach(x=>x.classList.remove('over'));setTimeout(()=>{S._dragDeal='';},50);});
document.addEventListener('dragover',e=>{const col=e.target.closest&&e.target.closest('.dl-col');if(!col||!S._dragDeal)return;e.preventDefault();document.querySelectorAll('.dl-col.over').forEach(x=>{if(x!==col)x.classList.remove('over');});col.classList.add('over');});
document.addEventListener('drop',e=>{const col=e.target.closest&&e.target.closest('.dl-col');if(!col||!S._dragDeal)return;e.preventDefault();col.classList.remove('over');const id=S._dragDeal;S._dragDeal='';dealMove(id,col.dataset.stage);});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.classList&&e.target.classList.contains('dl-card')){const d=dealById(e.target.dataset.id);if(d)dealModal(d);}});

/* Lehetőség ablak: kapcsolattartó a HubSpotból (név, e-mail, telefon, és ha üres, az ügyfél cége) */
let DCT_ITEMS=[],DCT_SEQ=0,DCT_T=0;
async function dctSearch(input){const q=input.value.trim(),my=++DCT_SEQ,client=(($('m-dClient')||{}).value||'').trim();
  if(q.length<2&&client.length<2){pickShow(input,'<div class="hs-empty">Kezdd el gépelni a nevet vagy a céget – a HubSpotban keresek.</div>');return;}
  pickShow(input,searchingHtml('Keresés a HubSpotban'));
  try{const r=await call('hubspotContacts',q.length>=2?{q}:{q:'',client});if(my!==DCT_SEQ||document.activeElement!==input)return;
    DCT_ITEMS=(r||[]).slice(0,12);
    pickShow(input,DCT_ITEMS.length?DCT_ITEMS.map((c,i)=>`<button type="button" class="hs-item dct-item" data-dct="${i}"><b>${esc(c.name||c.email)}</b><small>${esc([c.company,c.title,c.phone,c.email].filter(Boolean).join(' · '))}</small></button>`).join(''):`<div class="hs-empty">${q.length>=2?'Nincs találat a HubSpotban – a beírt név marad.':'Ennél az ügyfélnél nincs kapcsolattartó a HubSpotban.'}</div>`);}
  catch(e){if(my===DCT_SEQ&&document.activeElement===input)pickShow(input,`<div class="hs-empty bad-txt">${esc(errText(e))}</div>`);}}
document.addEventListener('focusin',e=>{if(e.target.id==='m-dCName')dctSearch(e.target);});
document.addEventListener('input',e=>{if(e.target.id==='m-dCName'){clearTimeout(DCT_T);const t=e.target;DCT_T=setTimeout(()=>dctSearch(t),350);}
  if(e.target.id==='m-dVenue'){const m=$('dl-map'),v=e.target.value.trim();if(m){m.style.display=v?'':'none';m.href=v?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(v):'#';}}});
document.addEventListener('mousedown',e=>{const it=e.target.closest&&e.target.closest('.dct-item');if(!it)return;e.preventDefault();e.stopPropagation();const c=DCT_ITEMS[Number(it.dataset.dct)];pickClose();if(!c)return;
  const set=(id,v,force)=>{const x=$(id);if(x&&v&&(force||!x.value.trim()))x.value=v;};
  set('m-dCName',c.name,true);set('m-dCEmail',c.email,true);if(c.phone)mPhoneSet('m-dCPhone',c.phone);set('m-dClient',c.company,false);dSourceSet(c.source);
  toast('Kapcsolattartó kitöltve a HubSpotból');},true);
document.addEventListener('focusout',e=>{if(e.target.id==='m-dCName')setTimeout(()=>{if((!document.activeElement||document.activeElement.id!==e.target.id)&&$('hsBox')&&$('hsBox').querySelector('.dct-item,.hs-empty'))pickClose();},150);});

document.addEventListener('change',e=>{if(e.target.id==='sales-owner'){S.salesF.owner=e.target.value==='__all'?'':e.target.value;render(true);}});

/* Lehetőség ügyfele: csak a beírt szövegre illeszkedő ügyfelek jönnek fel (a böngésző saját, pontatlan listája helyett) */
let DC_ITEMS=[],DC_SEQ=0,DC_T=0;
/* „Honnan jött?” kitöltése a CRM-ből (HubSpot eredeti forrás / visszatérő ügyfél) – csak ha még üres */
/* A „Honnan jött?” lehetőségei a HubSpotból (a CRM forrás-mezőjének értékei); hiba esetén marad az alap lista */
let HS_SRC=null;
function dSourceApply(cur){const sel=$('m-dSource');if(!sel||!HS_SRC||!HS_SRC.length)return;const L=HS_SRC.slice();if(cur&&!L.includes(cur))L.push(cur);
  sel.innerHTML='<option value="">—</option>'+L.map(x=>`<option value="${esc(x)}"${x===cur?' selected':''}>${esc(x)}</option>`).join('');const inp=sel.parentElement&&sel.parentElement.querySelector('.cmb-in');if(inp)inp.value=cur||'';}
function dSourceLoad(cur){if(HS_SRC){dSourceApply(cur);return;}call('hubspotSources').then(r=>{HS_SRC=r&&Array.isArray(r.options)?r.options.map(o=>o.label).filter(Boolean):[];const sel=$('m-dSource');if(sel)dSourceApply(sel.value||cur);}).catch(()=>{HS_SRC=[];});}
function dSourceSet(v){const sel=$('m-dSource');if(!sel||!v||sel.value||![...sel.options].some(o=>o.value===v))return;sel.value=v;const inp=sel.parentElement&&sel.parentElement.querySelector('.cmb-in');if(inp)inp.value=v;sel.dispatchEvent(new Event('change',{bubbles:true}));toast('„Honnan jött?” kitöltve: '+v);}
function dcRender(input,q,hs,loading){const fq=fold(q),loc=knownClients(q).sort((a,b)=>(fold(a.company).startsWith(fq)?0:1)-(fold(b.company).startsWith(fq)?0:1)).slice(0,6).map(c=>({company:c.company,sub:c.name||'',src:'app'}));
  const have=new Set(loc.map(x=>fold(x.company)));
  const fromHs=(hs||[]).filter(c=>!have.has(fold(c.name))).map(c=>({company:c.name,sub:[c.domain,c.city].filter(Boolean).join(' · '),src:'hs',address:c.address,source:c.source||'',deals:c.deals||0}));
  DC_ITEMS=loc.concat(fromHs).slice(0,12);
  if(!DC_ITEMS.length&&!loading){pickShow(input,'<div class="hs-empty">Nincs ilyen cég az appban és a HubSpotban – a beírt név marad.</div>');return;}
  pickShow(input,DC_ITEMS.map((it,i)=>`<div class="hs-row"><button type="button" class="hs-item dc-item" data-dc="${i}"><b>${esc(it.company)}${it.src==='hs'?' <span class="hs-tag">HubSpot</span>':''}</b>${it.sub?`<small>${esc(it.sub)}</small>`:''}</button></div>`).join('')+(loading?searchingHtml('Keresés a HubSpotban'):''));}
function dcSearch(input){const q=input.value.trim();clearTimeout(DC_T);if(q.length<2){DC_ITEMS=[];pickClose();return;}
  dcRender(input,q,null,true);const my=++DC_SEQ;   // az app ügyfelei azonnal, a HubSpot cégei kis késéssel
  DC_T=setTimeout(async()=>{let hs=[];try{hs=await call('hubspotCompanies',{q})||[];}catch(e){}if(my!==DC_SEQ||document.activeElement!==input)return;dcRender(input,q,hs,false);},300);}
function dcPick(i){const v=DC_ITEMS[i],inp=$('m-dClient');pickClose();if(v&&inp){inp.value=v.company;inp.dispatchEvent(new Event('change',{bubbles:true}));dSourceSet(v.src==='app'||v.deals>0?'Visszatérő ügyfél':v.source);const c=$('m-dCName');if(c&&!c.value)setTimeout(()=>c.focus(),30);}}   // ezután a kapcsolattartó mező a cég HubSpot-kapcsolattartóit ajánlja
document.addEventListener('input',e=>{if(e.target.id==='m-dClient')dcSearch(e.target);});
document.addEventListener('mousedown',e=>{const it=e.target.closest&&e.target.closest('.dc-item');if(!it)return;e.preventDefault();e.stopPropagation();dcPick(Number(it.dataset.dc));},true);
document.addEventListener('focusout',e=>{if(e.target.id==='m-dClient')setTimeout(()=>{if(document.activeElement!==e.target&&$('hsBox')&&$('hsBox').querySelector('.dc-item'))pickClose();},150);});
document.addEventListener('keydown',e=>{if(e.target.id!=='m-dClient'||!$('hsBox'))return;const its=[...document.querySelectorAll('.dc-item')];if(!its.length)return;let i=its.findIndex(x=>x.classList.contains('on'));
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();i=e.key==='ArrowDown'?Math.min(its.length-1,i+1):Math.max(0,i-1);its.forEach((x,j)=>x.classList.toggle('on',j===i));}
  else if(e.key==='Enter'&&i>=0){e.preventDefault();e.stopPropagation();dcPick(Number(its[i].dataset.dc));}
  else if(e.key==='Escape'||e.key==='Tab')pickClose();},true);

/* Lehetőség jegyzetei dátum szerint: „[2026-11-04 15:19 · Név] szöveg” bejegyzések, a legújabb felül (egy szövegmezőben tárolva) */
const DN_RE=/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}|Korábbi)(?: · ([^\]]*))?\] ?/;
function dNotesParse(t){t=String(t||'').trim();if(!t)return [];const out=[];let cur=null;
  t.split('\n').forEach(l=>{const m=DN_RE.exec(l);if(m){cur={at:m[1]==='Korábbi'?'':m[1],by:m[2]||'',text:l.slice(m[0].length)};out.push(cur);}else if(cur)cur.text+='\n'+l;else{cur={at:'',by:'',text:l};out.push(cur);}});
  return out.map(x=>Object.assign(x,{text:x.text.trim()})).filter(x=>x.text);}
const dNotesJoin=L=>L.map(x=>`[${x.at||'Korábbi'}${x.by?' · '+x.by:''}] `+x.text).join('\n');
function dNoteAdd(old,nw){nw=String(nw||'').trim();if(!nw)return String(old||'').trim();const d=new Date(),p=n=>String(n).padStart(2,'0');
  const at=`${todayISO()} ${p(d.getHours())}:${p(d.getMinutes())}`;return dNotesJoin([{at,by:(S.me&&S.me.name)||'',text:nw}].concat(dNotesParse(old)));}
/* A régi, dátum nélküli jegyzet a lehetőség felvételének (ennek híján utolsó módosításának) idejét kapja */
const dNoteFb=d=>{const t=String((d&&(d.createdAt||d.updatedAt))||'').replace('T',' ');return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(t)?t.slice(0,16):/^\d{4}-\d{2}-\d{2}/.test(t)?t.slice(0,10)+' 00:00':'';};
function dNoteFix(t,fb,by){if(!fb)return String(t||'');const L=dNotesParse(t);if(!L.some(x=>!x.at))return String(t||'');L.forEach(x=>{if(!x.at){x.at=fb;x.by=x.by||by||'';}});return dNotesJoin(L);}
function dNotesHtml(t,hs){const L=dNotesParse(t).concat((hs||[]).map(x=>({at:x.at,by:x.by,text:x.text,hs:1,kind:x.kind||''}))).sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));if(!L.length)return '<p class="hint" style="margin:6px 0 0">Még nincs jegyzet.</p>';
  return L.map((x,i)=>`<div class="dn-item${x.hs?' dn-hs':''}"><div class="dn-h">${x.hs?`<span class="hs-tag" style="margin:0">HubSpot${x.kind&&x.kind!=='Jegyzet'?' · '+esc(x.kind):''}</span>`:''}<span class="dn-at">${x.at?esc(fmtDay(x.at.slice(0,10))+(x.at.slice(11)&&x.at.slice(11)!=='00:00'?' '+x.at.slice(11):'')):'Korábbi jegyzet'}</span>${x.by?`<span class="dn-by">${esc(x.by)}</span>`:''}</div><div class="dn-t">${esc(x.text).replace(/\n/g,'<br>')}</div></div>`).join('');}

/* Kapcsolattartó megnyitása a HubSpotban (kártyán és a lehetőség ablakában) */
ACT['hs-contact']=async(b,e)=>{if(e){e.stopPropagation();e.preventDefault();}
  const f=b.closest('form'),name=f?String(($('m-dCName')||{}).value||'').trim():b.dataset.name,email=f?String(($('m-dCEmail')||{}).value||'').trim():b.dataset.email,company=f?String(($('m-dClient')||{}).value||'').trim():b.dataset.company;
  if(!name&&!email){toast('Előbb add meg a kapcsolattartót.',true);return;}
  const w=window.open('about:blank','_blank');   // azonnal nyitjuk, hogy a böngésző ne tiltsa le
  try{const r=await call('hubspotContactLink',{name,email,company});if(w){w.opener=null;w.location.href=r.url;}else location.href=r.url;if(!r.found)toast('Pontos egyezés nincs – a HubSpot keresőjét nyitottam meg.');}
  catch(err){if(w)w.close();handleErr(err);}};

/* A lehetőség ablakában a kapcsolattartó és a cég HubSpot-jegyzetei is megjelennek (csak olvasható, nem mentődnek a lehetőségbe) */
let DN_HS_SEQ=0;
async function dNotesLoadHs(){const box=$('m-dNotes'),h=$('m-dNote');if(!box||!h)return;const name=String(($('m-dCName')||{}).value||'').trim(),email=String(($('m-dCEmail')||{}).value||'').trim(),company=String(($('m-dClient')||{}).value||'').trim();
  if(!name&&!email&&!company)return;const my=++DN_HS_SEQ;const st=$('m-dHsSt');if(st)st.textContent='HubSpot-tevékenységek betöltése…';
  try{const r=await call('hubspotNotes',{name,email,company});if(my!==DN_HS_SEQ||!$('m-dNotes'))return;box.innerHTML=dNotesHtml(dNoteFix(h.value,box.dataset.fb,box.dataset.by),r.notes||[]);
    if(st)st.textContent=(r.notes||[]).length?`${r.notes.length} HubSpot-tevékenység betöltve (jegyzetek, feladatok, e-mailek, hívások, megbeszélések)`:'A HubSpotban nincs tevékenység ehhez a kapcsolattartóhoz / céghez';}
  catch(e){if(st)st.textContent='A HubSpot-jegyzetek most nem érhetők el';}}

/* Árkalkulátor (kalkulator.lumosmotion.hu) az Értékesítés fülön: nagy ablakban; a két kalkulátor választója a címsorban, az „Árkalkulátor” szó mellett */
const ARK_URL='https://kalkulator.lumosmotion.hu/';
ACT['ark-open']=(b)=>{const qd=b&&b.dataset&&b.dataset.q;openModal(qd?'Árajánlat – számold ki az árat':'Árkalkulátor',`<iframe class="ark-frame" id="ark-frame" src="${ARK_URL}${qd&&S._arkPg||'rendezvenyvideok'}?embed=1" title="Lumos Motion árkalkulátor" loading="eager"></iframe>`,{cancelLabel:'Bezárás',noDraft:true,left:'<span class="ark-total" id="ark-total" hidden>Összesen <b></b></span><button type="button" class="btn outline" data-action="ark-msg" data-m="reset" title="Visszaállítás"><span class="msm">↺</span><span class="mlg">Visszaállítás</span></button>'+(qd?`<button type="button" class="btn ghost" data-action="q-skip" data-id="${esc(qd)}">${S.q&&S.q.dealId===qd&&(S.q.items||[]).some(it=>it.src!=='init'&&qNum(it.price))?'Vissza az árajánlathoz →':'Kalkulátor nélkül →'}</button><button type="button" class="btn primary" data-action="ark-msg" data-m="quote">Átvétel az árajánlatba →</button>`:'<button type="button" class="btn primary" data-action="ark-deal" title="Új értékesítési lehetőség az összeggel és a kiválasztott tételekkel">💾 Eredmény beküldése</button>')});window._arkQuoteDeal=qd||'';
  const mb=document.querySelector('#modalRoot .mbox');if(mb)mb.classList.add('mbox-ark');
  const h=document.querySelector('#modalRoot .mhead h3');if(h)h.insertAdjacentHTML('afterend','<div class="ark-tabs" role="tablist"><button type="button" data-action="ark-tab" data-p="rendezvenyvideok" role="tab" aria-selected="false">Rendezvény<span class="mlg"> videó</span></button><button type="button" data-action="ark-tab" data-p="eloadas-rogzites" role="tab" aria-selected="false">Előadás<span class="mlg"> rögzítés</span></button><button type="button" data-action="ark-tab" data-p="short-videok" role="tab" aria-selected="false">Short<span class="mlg"> videó</span></button>'+(isAdmin()?'<button type="button" data-action="ark-admin" role="tab" aria-selected="false" title="Ügyvezetői nézet: a kalkulátorok árainak szerkesztése">Árak</button>':'')+'</div>');{const cur=(qd&&S._arkPg)||'rendezvenyvideok';document.querySelectorAll('.ark-tabs [data-p]').forEach(x=>{const on=x.dataset.p===cur;x.classList.toggle('on',on);x.setAttribute('aria-selected',on?'true':'false');});}};
/* a kalkulátor elküldi a végösszeget: a gombsorban látszik */
window.addEventListener('message',e=>{if(e.origin!=='https://kalkulator.lumosmotion.hu')return;const d=e.data||{};if(typeof d.arkTotal!=='string')return;const el=$('ark-total');if(!el)return;const m=/^(.*?Ft)\s*(.*)$/.exec(d.arkTotal);el.querySelector('b').textContent=m?m[1]:d.arkTotal;el.hidden=false;el.lastChild&&el.lastChild.nodeType===3&&el.lastChild.remove();el.insertAdjacentText('beforeend',m&&m[2]?' '+m[2]:'');});
/* Árkalkulátor → új lehetőség: a kalkulátortól elkérjük a tételeket, és kitöltött „Új lehetőség” ablakot nyitunk (érték, szolgáltatások, tételek a jegyzetben) */
ACT['ark-deal']=()=>{const f=$('ark-frame');if(!f||!f.contentWindow)return;window._arkDealNew=Date.now();f.contentWindow.postMessage({ark:'quote'},'https://kalkulator.lumosmotion.hu');
  setTimeout(()=>{if(window._arkDealNew){window._arkDealNew=0;toast('A kalkulátor nem válaszolt – próbáld újra.',true);}},4000);};
const ARK_SVC=[[/előadás/i,'Előadásrögzítés'],[/stream|közvetít/i,'Élő közvetítés (stream)'],[/kreatív/i,'Kreatív videózás'],[/aftermovie|összefoglaló/i,'Aftermovie / összefoglaló videó'],[/interjú|imázs/i,'Interjúk / imázsfilm'],[/short/i,'Short videók'],[/fotó/i,'Fotózás'],[/drón/i,'Drónfelvétel'],[/vágás|utómunk/i,'Videóvágás / utómunka'],[/hang|fény|vizuál/i,'Vizuál-, hang- és fénytechnika']];
function arkDealPreset(x){const ft=v=>ftFmt(Math.round(num(v))),rows=(x.rows||[]).filter(r=>num(r.amount)>0),tot=(x.totals||[]),t=tot.find(z=>/összesen/i.test(z.label||''))||tot[tot.length-1]||{};
  const val=Math.round(num(t.amount))||rows.reduce((a,r)=>a+Math.round(num(r.amount)),0),svc=[];
  rows.forEach(r=>ARK_SVC.forEach(([re,n])=>{if(re.test(r.name||'')&&!svc.includes(n))svc.push(n);}));
  if(/előadás/i.test(x.title||'')&&!svc.includes('Előadásrögzítés'))svc.unshift('Előadásrögzítés');
  const note='🧮 Árkalkulátor ('+(x.title||'')+'):\n'+rows.map(r=>'• '+r.name+(r.qty&&r.qty!=='1 db'?' ('+r.qty+')':'')+': '+ft(r.amount)).join('\n')+'\nÖsszesen nettó: '+ft(val);
  return {title:x.title||'Árkalkulátor',value:val,services:svc.join(', '),note,nextStep:'Árajánlat küldése az ügyfélnek',nextDate:addDays(todayISO(),1)};}
window.addEventListener('message',e=>{if(e.origin!=='https://kalkulator.lumosmotion.hu'||!window._arkDealNew)return;const x=(e.data||{}).arkQuoteData;if(!x)return;window._arkDealNew=0;
  const pre=arkDealPreset(x);if(!pre.value){toast('Előbb válassz tételeket a kalkulátorban.',true);return;}closeModal();setTimeout(()=>dealModal(null,pre),0);});
ACT['ark-msg']=b=>{const f=$('ark-frame');if(f&&f.contentWindow)f.contentWindow.postMessage({ark:b.dataset.m},'https://kalkulator.lumosmotion.hu');};   // a kalkulátor saját gombjait indítja
/* ügyvezetői nézet: a két kalkulátor árai (a kalkulátor-oldalak a háttérből töltik be; üres mező = alapár) */
const ARK_FIELDS={
  r:{t:'🎉 Rendezvény videó',g:[['Operatőri munka',[['hour','Operatőr óradíja','Ft/óra',9900],['labmin','Operatőri munkadíj alapdíja (operatőrönként)','Ft',19000],['equip','Eszköztár operatőrönként','Ft/fő',39000],['deliv','Kiszállás alapdíja (Budapesten / zónán belül)','Ft',19000],['perkm','Kiszállás a zónán túl (oda-vissza számolva)','Ft/km',75],['zone','Alapdíjas zóna Budapesttől','km',10]]],
    ['Helyszíni extrák',[['i4','Vágó a helyszínre jön','Ft',89000],['i5','Drónos felvételek + drónpilóta','Ft',119000],['i6','Timelapse videó GoProval','Ft',79000],['i7','POV felvétel GoProval','Ft',79000],['i10','Profi fotók','Ft',219000]]],
    ['Utómunka (darabár)',[['i0','Aftermovie','Ft/db',189000],['i1','Interjúk / kiállítói imázsfilmek','Ft/db',109000],['i3','Short videók (40–60 mp)','Ft/db',39000],['i2','Short videók (20–40 mp)','Ft/db',29000]]],
    ['Nyersanyag és felár',[['buyb','Nyersanyag megvásárlása: alapdíj','Ft',40000],['buyp','Nyersanyag megvásárlása: a megrendelés %-a, ha több (kiszállás nélkül)','%',10],['keepb','Nyersanyag tárolása 5 évig: alapdíj','Ft',40000],['keepp','Nyersanyag tárolása: a megrendelés %-a, ha több (0 = csak alapdíj)','%',0],['rush','Villámgyors kézbesítés (felár)','%',30]]]]},
  e:{t:'🎤 Előadás rögzítés',g:[['Operatőri munka',[['hour','Operatőr óradíja','Ft/óra',9900],['labmin','Operatőri munkadíj alapdíja (operatőrönként)','Ft',19000],['deliv','Kiszállás alapdíja (Budapesten / zónán belül)','Ft',19000],['perkm','Kiszállás a zónán túl (oda-vissza számolva)','Ft/km',75],['zone','Alapdíjas zóna Budapesttől','km',10]]],
    ['Rögzítés eszközei',[['i3','Teljes alakos kameraszög','Ft',39000],['i4','Közeli kameraszög','Ft',39000],['i5','Közönségkamera','Ft',39000],['i6','Diák rögzítése','Ft',39000],['i12','Élő közvetítés (alapár)','Ft',189000],['streamx','Élő közvetítés: további eszközönként','Ft',19000]]],
    ['Utómunka',[['edit','Előadások utómunkája: vágói óradíj','Ft/óra',9900],['i2','Kivágások (40–60 mp short)','Ft/db',29000],['i1','Feliratozás','Ft/db',49000]]],
    ['Nyersanyag és felár',[['buyb','Nyersanyag megvásárlása: alapdíj','Ft',40000],['buyp','Nyersanyag megvásárlása: a megrendelés %-a, ha több (kiszállás nélkül)','%',10],['keepb','Nyersanyag tárolása 5 évig: alapdíj','Ft',40000],['keepp','Nyersanyag tárolása: a megrendelés %-a, ha több (0 = csak alapdíj)','%',0],['rush','Villámgyors kézbesítés (felár)','%',30]]]]},
  s:{t:'📱 Short videó',g:[['Utómunka (darabár)',[['edit','Vágói munka','Ft/db',29000],['script','Forgatókönyvírás','Ft/db',9000]]],
    ['Operatőri munka',[['hour','Operatőr óradíja','Ft/óra',9900],['labmin','Operatőri munkadíj alapdíja (operatőrönként)','Ft',40000],['cine','Mozikamera + stabilizátor','Ft/fő',39000],['drone','Drón','Ft',29000],['deliv','Kiszállás alapdíja (Budapesten / zónán belül)','Ft',19000],['perkm','Kiszállás a zónán túl (oda-vissza számolva)','Ft/km',75],['zone','Alapdíjas zóna Budapesttől','km',10]]]]}
};
const arkNum=v=>String(v).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
function arkAdminHTML(o){
  const col=pg=>{const F=ARK_FIELDS[pg],cur=(o&&o[pg])||{};
    return `<section class="arkp-col"><h4>${F.t}</h4>${F.g.map(([gt,rows])=>`<div class="arkp-grp"><div class="arkp-gt">${esc(gt)}</div>${rows.map(([k,l,u,d])=>`<label class="arkp-row"><span>${esc(l)}</span><span class="arkp-in"><input class="inp" inputmode="decimal" data-pg="${pg}" data-k="${k}" value="${cur[k]!=null?esc(String(cur[k])):''}" placeholder="${esc(arkNum(d))}"><em>${esc(u)}</em></span></label>`).join('')}</div>`).join('')}</section>`;};
  return `<div class="arkp"><p class="hint arkp-hint">Minden ár nettó. Az üres mező az alapárat (szürkén látszik) használja. Mentés után a kalkulátorok – a weboldalon is – az új árakkal számolnak.${o&&o.updatedAt?` <span class="arkp-upd">Utoljára módosította: ${esc(o.updatedBy||'')} · ${esc(String(o.updatedAt).slice(0,16).replace(/-/g,'.'))}</span>`:''}</p><div class="arkp-cols">${col('r')}${col('e')}${col('s')}</div><div class="arkp-foot"><button type="button" class="btn primary" data-action="ark-save">💾 Árak mentése</button></div></div>`;
}
ACT['ark-admin']=async b=>{
  document.querySelectorAll('.ark-tabs button').forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-selected',on?'true':'false');});
  const mb=document.querySelector('#modalRoot .mbox');if(mb)mb.classList.add('ark-adm');
  let box=$('ark-admin');const f=$('ark-frame');
  if(!box){f.insertAdjacentHTML('afterend','<div id="ark-admin" class="ark-admin"><p class="hint">Betöltés…</p></div>');box=$('ark-admin');}
  try{box.innerHTML=arkAdminHTML(await call('arkPricesGet'));}catch(e){box.innerHTML='';handleErr(e);}
};
ACT['ark-save']=async b=>{
  const o={r:{},e:{},s:{}};let bad=null;
  document.querySelectorAll('#ark-admin input[data-k]').forEach(i=>{const v=i.value.replace(/\s/g,'').replace(',','.');i.classList.remove('err');if(v==='')return;if(!/^\d+(\.\d+)?$/.test(v)){i.classList.add('err');bad=bad||i;return;}o[i.dataset.pg][i.dataset.k]=v;});
  if(bad){bad.focus();return toast('Csak számot adj meg (pl. 39000).',true);}
  b.disabled=true;try{const r=await call('arkPricesSet',o);$('ark-admin').innerHTML=arkAdminHTML(r);toast('Árak mentve – a kalkulátorok már ezekkel számolnak.');
    const f=$('ark-frame');if(f&&f.contentWindow)f.contentWindow.postMessage({arkPrices:r},'https://kalkulator.lumosmotion.hu');}
  catch(e){handleErr(e);}finally{b.disabled=false;}
};
ACT['ark-tab']=b=>{const f=$('ark-frame');if(!f)return;const mb=document.querySelector('#modalRoot .mbox');if(mb)mb.classList.remove('ark-adm');f.src=ARK_URL+b.dataset.p+'?embed=1';S._arkPg=b.dataset.p;document.querySelectorAll('.ark-tabs button').forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-selected',on?'true':'false');});};

/* Küldés a kollégák saját címéről – a Beállítások panel gombjai (az ACT objektum az actions.js-ben jön létre, ezért itt) */
ACT['dwd-save']=async b=>{const t=$('dwd-json');const v=t?t.value.trim():'';if(!v)return toast('Másold be a JSON-kulcsot.',true);b.disabled=true;try{S.dwd=await call('dwdSet',{json:v});toast('Kulcs mentve – most teszteld a kapcsolatot.');render(true);}catch(e){handleErr(e);}finally{b.disabled=false;}};
ACT['dwd-clear']=async()=>{if(!confirm('Kikapcsolod? A levelek ezután ismét a központi fiókról mennek.'))return;try{S.dwd=await call('dwdSet',{clear:true});render(true);toast('Kikapcsolva.');}catch(e){handleErr(e);}};
ACT['dwd-test']=async b=>{const m=($('dwd-mail')||{}).value||'';b.disabled=true;try{const r=await call('dwdTest',{email:m});toast('✅ Működik: az app küldhet '+r.email+' nevében.');}catch(e){handleErr(e);}finally{b.disabled=false;}};

/* Árajánlat küldése: előbb kiválasztod a lehetőséget (kártyák), utána nyílik az árajánlat */
ACT['quote-pick']=()=>{const L=(S.deals||[]).filter(d=>DEAL_OPEN.includes(d.stage)&&(isAdmin()||(S.me&&d.ownerId===S.me.id))).sort((a,b)=>DEAL_OPEN.indexOf(a.stage)-DEAL_OPEN.indexOf(b.stage)||String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
  const st=k=>(DEAL_STAGES.find(x=>x[0]===k)||[])[2]+' '+dealLbl(k);
  /* korábbi ügyfél, akinek most nincs nyitott lehetősége: új lehetőség az ügyfél adataival, majd az árajánlat */
  const openC=new Set(L.map(d=>fold(d.client||''))),CL=(isAdmin()&&typeof knownClients==='function'?knownClients(''):[]).filter(c=>!openC.has(fold(c.company))).sort((a,b)=>a.company.localeCompare(b.company,'hu'));
  openModal('📄 Árajánlat küldése',`<div class="field full"><label for="m-qpDeal">Melyik lehetőséghez?</label><select class="inp" id="m-qpDeal" name="deal" data-cmb="Kezdd el gépelni a lehetőség vagy a cég nevét…"><option value="" selected></option>${L.length?`<optgroup label="Nyitott lehetőségek">${L.map(d=>`<option value="${esc(d.id)}">${esc(st(d.stage))} · ${esc(d.title)}${d.client&&!String(d.title).includes(d.client)?' – '+esc(d.client):''}</option>`).join('')}</optgroup>`:''}${CL.length?`<optgroup label="Korábbi ügyfél – új ajánlat">${CL.map((c,i)=>`<option value="cl:${i}">🏢 ${esc(c.company)}${c.name?' · '+esc(c.name):''}</option>`).join('')}</optgroup>`:''}</select></div><div class="field full qp-new" style="flex-direction:row;align-items:center;gap:10px;flex-wrap:wrap"><span class="hint" style="margin:0">Nincs még a listában?</span><button type="button" class="btn outline small" style="width:auto" data-action="quote-new">＋ Új érdeklődő felvétele</button></div>`,
    {submitLabel:'Tovább →',noDraft:true,submit:fd=>{const id=String(fd.get('deal')||'');if(!id){toast('Válaszd ki a lehetőséget.',true);return;}closeModal();if(id==='__new'){S._qAfterNew=true;setTimeout(()=>dealModal(null,{stage:'uj'}),0);return;}if(id.indexOf('cl:')===0){const c=CL[+id.slice(3)];if(!c)return;S._qAfterNew=true;setTimeout(()=>dealModal(null,{stage:'uj',title:c.company,client:c.company,contactName:c.name,contactEmail:c.email,contactPhone:c.phone,source:'Visszatérő ügyfél'}),0);return;}setTimeout(()=>ACT['deal-quote']({dataset:{id}}),0);}});};
ACT['quote-new']=()=>{closeModal();S._qAfterNew=true;setTimeout(()=>dealModal(null,{stage:'uj'}),0);};
ACT['dl-paid-tog']=()=>{const v=!salesPaidOpen();try{localStorage.setItem('lpm_paid_open',v?'1':'0');}catch(e){}render(true);};
ACT['dl-lost-tog']=()=>{const v=!salesLostOpen();try{localStorage.setItem('lpm_lost_open',v?'1':'0');}catch(e){}render(true);};

/* Elveszett lehetőség előfoglalt projekttel: felajánljuk a projekt lemondását */
function preLostOffer(did){const p=(S.projects||[]).find(x=>x.preDeal===did&&!['lemondva','atadva'].includes(x.status));if(!p)return;
  openModal('Előfoglalt projekt',`<p style="margin:0">A lehetőséghez a(z) <b>${esc(p.name)}</b> projekt tartozik előfoglalásként${pr(p)?' ('+esc(fmtRange(p))+')':''}. Lemondod a projektet is?</p>`,
    {submitLabel:'Projekt megnyitása a lemondáshoz',cancelLabel:'Most nem',noDraft:true,submit:()=>{closeModal();openProject(p.id);setTimeout(()=>{const c=document.querySelector('[data-action="cancel-toggle"]');if(c)c.click();},500);}});}

/* 📇 a lehetőség kapcsolattartójának névjegye QR-kóddal (a lehetőség ablaka fölött nyílik, a beírt adatok megmaradnak) */
ACT['deal-vcf']=async()=>{const v=id=>String(($(id)||{}).value||'').trim(),row=document.querySelector('[data-ph="n:dCPhone"]');
  const tel=row?(((row.querySelector('.ph-cc')||{}).dataset||{}).cc||'+36')+String((row.querySelector('.ph-num')||{}).value||'').replace(/\s/g,''):'';
  const o={name:v('m-dCName'),tel:/\d{6,}/.test(tel)?tel:'',email:v('m-dCEmail'),org:v('m-dClient'),note:''};
  if(!o.name&&!o.tel&&!o.email){toast('Előbb add meg a kapcsolattartó adatait.',true);return;}
  let img='';try{await loadQr();qrcode.stringToBytes=qrcode.stringToBytesFuncs['UTF-8'];const q=qrcode(0,'M');q.addData(vcfText(o),'Byte');q.make();img=q.createDataURL(6,8);}catch(e){}
  confirmLayer('📇 Névjegy a telefonra',`<div class="vcf-box" style="text-align:center">${img?`<img class="vcf-qr" src="${img}" alt="QR-kód: ${esc(o.name)} névjegye"><p class="hint">Olvasd be a telefon kamerájával, majd koppints a „Kapcsolat hozzáadása” gombra.</p>`:'<p class="hint">A QR-kód most nem készíthető el.</p>'}<p style="margin:6px 0 0"><b>${esc(o.name)}</b>${o.org?' · '+esc(o.org):''}<br>${esc(o.tel)}${o.email?' · '+esc(o.email):''}</p></div>`,'Kész',(b,d)=>{d.remove();});};
