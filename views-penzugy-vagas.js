'use strict';
/* ===== Stáb és eszközök egy panelen: munkatársanként a nála lévő eszközök ===== */
function eqNote(e,it,p){
  if(!it)return '';const free=num(it.qty)-usedElsewhere(it.id,p)-(eqQty(p,it.id)-num(e.qty));
  if(num(e.qty)>free)return `<span class="bad-txt">Csak ${Math.max(0,free)} db szabad ezen a napon</span>`;
  if(it.condition&&it.condition!=='ok')return `<span class="warn-txt">${esc(CONDITIONS[it.condition])}</span>`;
  return '';   // kiválasztott eszköznél nem kell a kategória / tárolási hely sor
}
const CAT_ICON={'Kamera':'📷','Objektív':'🔭','Hang':'🎤','Fény':'💡','Drón':'🚁','Képkeverés / stream':'🎛️','GoPro / akciókamera':'🎥','Gimbal / állvány':'🎚️','Akku / powerbank / táp':'🔋','Adathordozó':'💾','Laptop / tablet / telefon':'💻','Monitor / nyomtató':'🖥️','Kocsi / szállítás':'🚐','Kábel':'🔌','Egyéb':'📦'};
const catLbl=c=>(CAT_ICON[c]||'📦')+' '+c;
function itemOptions(p){
  return INV_CATS.map(cat=>{const items=S.inventory.filter(i=>(i.category||'Egyéb')===cat&&i.condition!=='selejt').sort((a,b)=>a.name.localeCompare(b.name,'hu'));
    if(!items.length)return '';return `<optgroup label="${esc(catLbl(cat))}">${items.map(i=>{const free=num(i.qty)-usedElsewhere(i.id,p)-eqQty(p,i.id);return `<option value="${esc(i.id)}"${free<=0?' disabled':''}>${esc(i.name)} — ${Math.max(0,free)}/${num(i.qty)} szabad${i.condition&&i.condition!=='ok'?' ('+CONDITIONS[i.condition].toLowerCase()+')':''}</option>`;}).join('')}</optgroup>`;}).join('');
}
function eqRowsFor(p,key){
  return (p.equipment||[]).map((e,i)=>({e,i})).filter(x=>(x.e.crewId||'')===key).map(({e,i})=>{const it=itemById(e.itemId);
    const dg=!ro()&&!projLocked()&&!eqLocked(p);
    return `<div class="eqrow${dg?' eq-drag':''}"${dg?` draggable="true" data-eq-drag="${i}" title="Húzd egy másik munkatárs kártyájára az átadáshoz"`:''}><div class="who"><b>${dg?'<span class="eq-grip" aria-hidden="true">⠿</span>':''}${esc(it?it.name:'Törölt eszköz')}</b>${eqNote(e,it,p)}</div>
      <input class="inp qty" type="number" min="1" inputmode="numeric" data-eq-i="${i}" value="${num(e.qty)}" aria-label="Darabszám"${D()}>
      <button class="x w" type="button" data-action="eq-remove" data-i="${i}" aria-label="Eszköz eltávolítása">×</button></div>`;}).join('');
}
function eqAddRow(p,key,opts){
  if(ro())return '';
  const sid='add-eq-item-'+(key||'common');
  return `<div class="eqadd eqdd"><button type="button" class="inp eqdd-btn" data-action="eqdd" data-for="${esc(sid)}" aria-haspopup="true">+ Eszköz hozzárendelése…</button><select class="inp" hidden id="${esc(sid)}" data-eq-auto="${esc(key)}" aria-label="Eszköz hozzáadása"><option value="">+ Eszköz hozzárendelése…</option>${opts}<optgroup label="➕ Más eszköz"><option value="__new">🆕 Új eszköz felvétele a leltárba…</option><option value="__own">🎒 Saját eszköz…</option><option value="__rent">🏷️ Bérelt eszköz…</option></optgroup></select></div>`;
}
/* ===== Pénzügyek: ügyvezető = projekt értéke + termelői díjak + fedezet; termelési vezető = csak termelői díjak; szakember = semmi.
   (A háttér is így szűr: a projekt értékét csak az ügyvezető, a díjakat a szakember egyáltalán nem kapja meg.) ===== */
const ftFmt=n=>String(Math.round(+n||0)).replace(/\B(?=(\d{3})+(?!\d))/g,'\u00a0')+'\u00a0Ft';
/* Bérelt eszközök (nem leltári): a díjtáblázatban a felelős ember „Eszközbérlés” oszlopába számítanak. */
const rentalsOf=(p,cid)=>(p.rentals||[]).filter(r=>(r.crewId||'')===(cid||''));
const rentalSum=(p,cid)=>rentalsOf(p,cid).reduce((s,r)=>s+num(r.price),0);
const rentOf=(p,f)=>f.crewId&&rentalsOf(p,f.crewId).some(r=>!r.own)?rentalSum(p,f.crewId):num(f.rent);
const feeSum=p=>(p.fees||[]).reduce((s,f)=>s+num(f.amount)-(f.crewId?penDeduct(p,f.crewId,f.amount):0)+rentOf(p,f),0)+rentalSum(p,'');   // jóváhagyott díjcsökkentéssel
const canSeeFees=()=>!!S.me&&(S.me.role==='admin'||S.me.role==='editor');
/* Termelői keret forintban: az ügyvezetőnél a beállításból (% a projekt értékéből vagy fix összeg), a termelési vezetőnél a háttér által kiszámolt összeg. */
/* Ügyvezetőnek: hiányzó büdzsé / termelői keret (nyitott projekteknél) */
function budgetMissing(p){if(!isAdmin()||!isOpen(p))return '';const m=[];if(p.projectValue==null||p.projectValue==='')m.push('büdzsé');if(budgetFt(p)==null&&!isFree(p))m.push('keret');return m.join(' és ');}
/* Nem fizetős projekt: a büdzsé 0 Ft (a „Nem fizetős” pipával állítható) */
/* Extra szolgáltatások: a szerződött érték (projectValue) felett; a végső érték = szerződött + extrák (a termelői keret a szerződöttből számol) */
const extrasRaw=p=>(p&&Array.isArray(p.extras)?p.extras:[]);   // minden sor, a szervezői jutalékkal együtt
const extrasOf=p=>extrasRaw(p).filter(x=>x&&x.kind!=='org'&&x.kind!=='tov');   // a számlán külön szereplő extrák (a szervezői jutalék nem; a továbbszámlázott költség a szerződött érték része)
/* Szervezői jutalék: rendezvényszervezőnek fizetett összeg; nem része a számlának, a termelői alapot csökkenti (a termelői % a levonás utáni összegből számolódik) */
const orgOf=p=>extrasRaw(p).find(x=>x&&x.kind==='org')||null;
const orgFee=p=>extrasRaw(p).filter(x=>x&&x.kind==='org').reduce((s,x)=>s+num(x.amount),0);
const prodBase=p=>p?salesBase(p):0;   // termelői alap = a „…után” mező: végső érték − szervezői jutalék − továbbszámlázott
const exSign=x=>x&&x.kind==='le'?-1:1;   // le = kedvezmény / jutalék (a végszámlából levonva)
const extrasPlus=p=>extrasOf(p).filter(x=>exSign(x)>0).reduce((s,x)=>s+num(x.amount),0);
const extrasMinus=p=>extrasOf(p).filter(x=>exSign(x)<0).reduce((s,x)=>s+num(x.amount),0);
const extrasSum=p=>extrasPlus(p)-extrasMinus(p);
const exBreak=p=>`szerződött ${ftFmt(num(p.projectValue))}${extrasPlus(p)?' + extra '+ftFmt(extrasPlus(p)):''}${extrasMinus(p)?' − kedvezmény '+ftFmt(extrasMinus(p)):''}`;
const projTotal=p=>num(p&&p.projectValue)+extrasSum(p);
const exTotTxt=p=>`Végső érték: <b>${ftFmt(projTotal(p))}</b> <span class="muted">(${exBreak(p)})</span>`;
const extrasMenu=p=>ro()||projLocked()?'':`<select class="inp ex-menu" data-ex-menu data-cmb="＋ Hozzáadás…" data-cmb-cls="ex-menu" aria-label="Hozzáadás az extrákhoz"><option value="">＋ Hozzáadás…</option><option value="plus">＋ Extra szolgáltatás</option><option value="le">− Kedvezmény / jutalék</option><option value="tov">＋ Továbbszámlázott költség (utazás, szállás, eszközbérlés…)</option><option value="free">🎁 Nem fizetős projekt</option>${refOn(p)?'':'<option value="ref">🤝 Ajánlói jutalék szakembernek</option>'}${salesOn(p)?'':'<option value="sales">💼 Értékesítői jutalék</option>'}${extrasRaw(p).some(x=>x&&x.kind==='org')?'':'<option value="org">🎪 Szervezői jutalék</option>'}</select>`;   // „＋ Hozzáadás…” menü (a büdzsé sorában)
/* Továbbszámlázott költség: a szervezői jutalékhoz hasonló mező a büdzsé sorában (a csatolmány az Új projekt ablakban tölthető fel) */
function tovFields(p){if(!isAdmin())return '';const dis=ro()||projLocked(),raw=extrasRaw(p);
  return raw.map((x,i)=>{if(!x||x.kind!=='tov')return '';
    const file=x.fileUrl?` <a class="tov-file-l" href="${esc(x.fileUrl)}" target="_blank" rel="noopener" title="${esc(x.fileName||'Csatolmány')}">📎</a>`:'';
    return `<div class="field fin-org fin-tov"><label>🔁 Továbbszámlázott${file}${dis?'':` <button class="x w" type="button" data-action="extra-del" data-i="${i}" title="Tétel törlése" aria-label="Tétel törlése">✕</button>`}</label>
      <div class="org-line org-g"><input class="inp" data-extra-name="${i}" value="${esc(x.name||'')}" placeholder="pl. szállás, eszközbérlés" maxlength="200" aria-label="Továbbszámlázott költség megnevezése"${dis?' disabled':''}>
      <div class="money"><span class="ex-sign">−</span><input class="inp money-inp" data-extra-amt="${i}" data-money="big" inputmode="numeric" value="${esc(moneyFmt(x.amount||''))}" placeholder="0" aria-label="Továbbszámlázott költség nettó összege (a szerződött értékből levonva)"${dis?' disabled':''}><span class="money-unit">Ft</span></div></div></div>`;}).join('');}
function extrasHtml(p){const l=extrasRaw(p);if(!l.some(x=>x&&x.kind!=='org'&&x.kind!=='tov')&&!refOn(p)&&!salesOn(p))return '';   // üres: nincs külön blokk (a menü a büdzsé sorában)

  return `<div class="extras" id="proj-extras">
    ${l.map((x,i)=>{if(x.kind==='org'||x.kind==='tov')return '';const le=exSign(x)<0;return `<div class="ex-row${le?' ex-minus':''}"><input class="inp" data-extra-name="${i}" value="${esc(x.name||'')}" placeholder="${le?'pl. jutalék – kiállítói shortok':x.kind==='tov'?'pl. szállás, utazás, eszközbérlés':'pl. +1 riport videó'}" maxlength="200" aria-label="${le?'Kedvezmény / jutalék':'Extra szolgáltatás'} megnevezése"><div class="money"><span class="ex-sign">${le?'−':'+'}</span><input class="inp money-inp" data-extra-amt="${i}" data-money="big" inputmode="numeric" value="${esc(moneyFmt(x.amount||''))}" placeholder="0" aria-label="Nettó összeg"><span class="money-unit">Ft</span></div><button class="trash" type="button" data-action="extra-del" data-i="${i}" aria-label="Törlés">🗑️</button>${x.kind==='tov'?'<span class="ex-tov" title="Az értékesítői jutalék alapjába nem számít bele">továbbszámlázott</span>':''}</div>`;}).join('')}
    ${refOption(p,true)}
    ${salesOption(p)}
    <div class="ex-foot">${extrasOf(p).length?`<span class="ex-tot" id="ex-total">${exTotTxt(p)}</span>`:''}</div></div>`;}   // egy közös „＋ Hozzáadás…” menü
const isFree=p=>!!p&&p.projectValue!=null&&p.projectValue!==''&&num(p.projectValue)===0;
function budgetFt(p){
  if(!isAdmin())return p.budgetFt==null?null:num(p.budgetFt);
  const v=p.budgetVal;if(v===''||v==null||!p.budgetMode)return null;
  if(p.budgetMode==='pct'){if(p.projectValue==null||p.projectValue==='')return null;return Math.round(prodBase(p)*num(v)/100);}   // 0 Ft-os projektnél a keret is 0
  return num(v);
}
const pctFmt=x=>(Math.round(x*10)/10).toLocaleString('hu-HU')+'%';
function finPanelBody(p){
  const adm=isAdmin(),val=prodBase(p),k=budgetFt(p);
  const pctV=p.budgetMode==='pct'?(p.budgetVal===''||p.budgetVal==null?'':String(p.budgetVal).replace('.',',')):(k!=null&&val>0?String(Math.round(k/val*1000)/10).replace('.',','):'');
  const ftV=k!=null?moneyFmt(k):'';
  if(!adm)return `<div class="fin-sum"></div>`;
  const free=isFree(p),org=!free&&orgOf(p),tov=!free&&extrasRaw(p).some(x=>x&&x.kind==='tov'),two=!!(org||tov);   // két sor csak szervezői jutaléknál / továbbszámlázott költségnél
  const valF=`<div class="field fin-val${p.projectValue==null||p.projectValue===''?' missing req':''}"><label for="f-projectValue">Nettó szerződött érték</label><div class="money"><input class="inp money-inp" id="f-projectValue" type="text" data-money="big" data-fin="projectValue" inputmode="numeric" autocomplete="off" value="${free?'':esc(moneyFmt(p.projectValue))}" placeholder="${free?'Nem fizetős projekt':'pl. 969 000'}"${free?' disabled':''}><span class="money-unit">Ft</span></div>${free?`<div class="free-on">🎁 Nem fizetős projekt${D()?'':' · <button class="linkbtn" type="button" data-action="free-off">visszavonás</button>'}</div>`:''}</div>`;
  const exm=free||ro()||projLocked()?'':`<div class="field fin-exm"><label title="A szerződött összegen felül / levonva, nettó; a végszámlára külön tételként kerülnek">➕ Extrák és kedvezmények</label>${extrasMenu(p)}</div>`;
  const sc=salesCommFields(p),salesG=sc?`<div class="fin-grp grp-sales"><div class="grp-h">💼 Értékesítés</div><div class="grp-b">${sc}</div></div>`:'';
  const prodG=`<div class="fin-grp grp-prod"><div class="grp-h">🎬 Termelés</div><div class="grp-b"><div class="field fin-eff"><label for="f-budgetPct">Hatékonyság</label>
          <div class="money"><input class="inp money-inp" id="f-budgetPct" type="text" data-fin="budgetPct" inputmode="decimal" autocomplete="off" value="${esc(pctV)}" placeholder="pl. 40" aria-label="Keret a projekt értékének százalékában"><span class="money-unit">%</span></div></div>
        <div class="field fin-budget${budgetFt(p)==null&&!free?' missing req':''}"><label for="f-budgetFt">Termelői keret</label>
          <div class="money"><input class="inp money-inp" id="f-budgetFt" type="text" data-money="big" data-fin="budgetFt" inputmode="numeric" autocomplete="off" value="${esc(ftV)}" placeholder="pl. 400 000" aria-label="Keret forintban"><span class="money-unit">Ft</span></div></div></div></div>`;
  const rows=two?`<div class="fin-r">${valF}${org?orgOption(p):''}${tov?tovFields(p):''}${exm}</div><div class="fin-r">${finNet(p)}${salesG}${prodG}</div>`:`<div class="fin-r">${valF}${salesG}${prodG}${exm}</div>`;
  return `<div class="fin-sum"><div class="fin-inputs fin-v2${two?' two':''}">${rows}</div>${free?'':extrasHtml(p)}</div>`;
}
/* Oszlopszélességek: a fejléc szélén húzva állíthatók, böngészőnként megjegyezzük. */
const FIN_COLS_DEF=[52,250,220,170,250,150];
function finCols(){let w=null;try{w=JSON.parse(localStorage.getItem('lpm_fin_cols5')||'null');}catch(e){}return Array.isArray(w)&&w.length===FIN_COLS_DEF.length?w:FIN_COLS_DEF.slice();}
/* Termelői keret és maradék a táblázat „Összesen” sora alatt, a Díj oszlopban (mint az Excelben). */
function keretRows(p){
  const k=budgetFt(p),sum=feeSum(p),left=k==null?null:k-sum,val=prodBase(p);
  const pct=isAdmin()&&k!=null?(p.budgetMode==='pct'?pctFmt(num(p.budgetVal)):val>0?pctFmt(k/val*100):''):'';
  return `<tr class="keret-tr${left==null?'':left<0?' left-over':' left-ok'}"><td></td><td></td><td class="r tf-lbl fin-left-lbl">${left!=null&&left<0?'Keret túllépése':'Maradt a keretből'}</td><td class="r fin-left ${left==null?'':left<0?'bad-txt':'ok-txt'}">${left==null?'':Math.round(left)===0?'<b class="perfekt">Pontos 🎯</b>':(left<0?'−':'')+(moneyFmt(Math.abs(left))||0)}</td><td colspan="2"></td></tr>
        <tr class="keret-tr"><td></td><td></td><td class="r tf-lbl">Termelői keret</td><td class="r fin-keret-v">${k!=null?moneyFmt(k)+(pct?` <span class="muted">(${pct})</span>`:''):''}</td><td colspan="2"></td></tr>`;
}
function totalCell(p){const amt=feeSum(p),val=prodBase(p);return (moneyFmt(amt)||0)+(isAdmin()&&val>0?` <span class="muted">(${pctFmt(feeSum(p)/val*100)})</span>`:'');}
function finSumHtml(p){
  const sum=feeSum(p),val=projTotal(p),margin=val-sum,adm=isAdmin();
  const pct=x=>val>0?pctFmt(x/val*100):'–';
  return `${adm?`<div class="kv"><span>Fedezet</span><b class="${val>0&&margin<0?'bad-txt':''}">${val>0?ftFmt(margin)+' · '+pct(margin):'–'}</b></div>
      <div class="kv"><span>Tényleges költséghányad</span><b>${pct(sum)}</b></div>`:''}`;
}
function finAside(p){
  const sum=feeSum(p),val=prodBase(p),k=budgetFt(p),parts=[];
  if(sum)parts.push('díjak '+ftFmt(sum));
  if(k!=null)parts.push((sum>k?'⚠️ keret ':'keret ')+ftFmt(k));
  return parts.join(' · ')||'nincs kitöltve';
}
/* Pénzügyek: lenyíló táblázat (ügyvezető: érték, díjak, keret, fedezet; termelési vezető: díjak és keret Ft-ban). */
function financePanel(p,inner){
  if(!canSeeFees())return '';
  const cols=finCols(),th=(t,i,cls)=>`<th${cls?` class="${cls}"`:''}>${t}${i<cols.length-1?`<span class="col-grip" data-col="${i}" title="Húzd az oszlop szélességéhez (dupla kattintás: alaphelyzet)"></span>`:''}</th>`;
  const fees=p.fees||[],adm=isAdmin();
  const tin=(i,k,v,ph,o={})=>`<input class="cell-in${o.money?' num':''}" type="text" id="fee-${i}-${esc(k)}" data-fee-i="${i}" data-fee-k="${k}"${o.money?' data-money="1" inputmode="numeric"':''}${o.list?` list="${o.list}"`:''} autocomplete="off" value="${o.money?(num(v)?esc(moneyFmt(v)):''):esc(v||'')}" placeholder="${ph}" aria-label="${ph}">`;
  const ro_=t=>`<div class="cell-ro">${t}</div>`;
  const gearOf=f=>f.crewId?(p.equipment||[]).filter(e=>e.crewId===f.crewId).map(e=>{const it=itemById(e.itemId);return it?(num(e.qty)>1?num(e.qty)+'× ':'')+it.name:'';}).filter(Boolean).concat(rentalsOf(p,f.crewId).map(r=>r.name+(r.own?' (saját)':' (bérelt)'))).join(', '):'';
  const nameCell=(f,i)=>{const fixed=f.kind==='fixed';return fixed&&/^egyeb/.test(f.key||'')?tin(i,'name',f.name,'Egyéb tétel neve'):!f.crewId&&!fixed?`<div class="cell-ro cell-flex"><span>${esc(f.name||'')}</span><button class="trash" type="button" data-action="fee-remove" data-i="${i}" title="Sor törlése" aria-label="Sor törlése">🗑️</button></div>`:f.crewId&&!fixed?`<div class="cell-ro cell-flex"><span>${esc(f.name||'')}</span><span class="cell-acts"><button class="pen-btn" type="button" data-action="pen-new" data-cid="${esc(f.crewId)}" title="Díjcsökkentés" aria-label="Díjcsökkentés: ${esc(f.name||'')}">🚨</button>${crewLocked(S.draft||{})?'':`<button class="trash" type="button" data-action="crew-person-remove" data-id="${esc(f.crewId)}" title="Levétel a projektről (a stábból is)" aria-label="${esc(f.name||'')} levétele a projektről">🗑️</button>`}</span></div>`:ro_(esc(f.name||''));};
  const rentCell=(f,i)=>f.kind==='fixed'?ro_(''):f.crewId&&rentalsOf(p,f.crewId).some(r=>!r.own)?ro_(`<span class="num-ro" title="A stábkártyán felvett bérelt eszközökből">${moneyFmt(rentalSum(p,f.crewId))}</span>`):tin(i,'rent',f.rent,'0',{money:1});
  const commonRow=()=>rentalsOf(p,'').length?`<tr class="fixed-row"><td class="n"></td><td><div class="cell-ro">Közös eszközök</div></td><td><div class="cell-ro">${esc(rentalsOf(p,'').map(r=>r.name).join(', '))}</div></td><td><div class="cell-ro"></div></td><td></td><td><div class="cell-ro"><span class="num-ro">${moneyFmt(rentalSum(p,''))}</span></div></td></tr>`:'';
  const nf=fees.filter(x=>x.kind!=='fixed').length,days=projDays(p);
  const head=`<colgroup>${cols.map(w=>`<col style="width:${w}px">`).join('')}</colgroup><thead><tr>${th('#',0,'n')}${th('Szakember',1)}${th('Termelői feladat',2)}${th('Díj (Ft)',3,'r')}${th('Eszköz neve',4)}${th('Eszközbérlés (Ft)',5,'r')}</tr></thead>`;
  const tbl=(body,foot,cls,noHead)=>`<div class="sheet-wrap${cls?' '+cls:''}"><table class="sheet fin-sheet" style="width:${cols.reduce((x,y)=>x+y,0)}px;min-width:100%">${noHead?`<colgroup>${cols.map(w=>`<col style="width:${w}px">`).join('')}</colgroup>`:head}<tbody>${body}</tbody>${foot||''}</table></div>`;
  const sumTbl=()=>`<div class="day-tbl-h">Összesítés</div>`+tbl('',foot,'sum-sheet',true);
  const foot=`<tfoot><tr><td></td><td></td><td class="r tf-lbl">Összesen</td><td class="r fin-amt">${totalCell(p)}</td><td></td><td class="r fin-rent">${moneyFmt(fees.reduce((s,f)=>s+rentOf(p,f),0)+rentalSum(p,''))||0}</td></tr>${keretRows(p)}</tfoot>`;
  const postRows=fees.map((f,i)=>({f,i})).filter(x=>x.f.kind!=='fixed'&&feePost(p,x.f.crewId));
  const hasCutter=(p.crew||[]).some(a=>a.role==='Vágó');   // a vágó a helyszíni stábban is lehet (pl. operatőr + vágó) – ilyenkor a díja a napi táblázatban van
  const splitRows=fees.map((f,i)=>({f,i})).filter(x=>isSplitCut(p,x.f));   // helyszínen is dolgozó vágó: a vágás külön sorban
  const postTbl=()=>{const all=postRows.length+splitRows.length;
    if(!all)return hasVideoPost(p)&&!hasCutter?`<div class="day-tbl-h">✂️ Utómunka</div>`+tbl(`<tr><td colspan="6" class="empty-row">Van megrendelt utómunka, de még nincs vágó beosztva – a stábnál a Beosztásban válaszd a „Vágó” szerepet.</td></tr>`,'','day-sheet'):'';
    const body=postRows.map((x,n)=>`<tr><td class="n">${n+1}</td><td>${nameCell(x.f,x.i)}</td><td>${ro_(esc(x.f.task||''))}</td><td>${tin(x.i,'amount',x.f.amount,'0',{money:1})}${penCellNote(p,x.f)}</td><td>${ro_(esc(gearOf(x.f)||''))}</td><td>${rentCell(x.f,x.i)}</td></tr>`)
      .concat(splitRows.map((x,n)=>`<tr><td class="n">${postRows.length+n+1}</td><td>${ro_(esc(x.f.name||((crewById(x.f.crewId)||{}).name)||''))}</td><td>${ro_('Vágás')}</td><td>${tin(x.i,'post',x.f.post,'0',{money:1})}</td><td>${ro_('')}</td><td>${ro_('')}</td></tr>`)).join('');
    return `<div class="day-tbl-h">✂️ Utómunka</div>`+tbl(body,`<tfoot><tr class="day-sub"><td></td><td></td><td></td><td class="r" data-post-sum="1">${moneyFmt(postSumOf(p))||0}</td><td colspan="2"></td></tr></tfoot>`,'day-sheet');};
  let tables='';
  if(days.length){   // több napos projekt: minden napnak saját táblázata, a végén az egyéb költségek és az összesítő
    const crewF=fees.map((f,i)=>({f,i})).filter(x=>x.f.kind!=='fixed'&&!feePost(p,x.f.crewId)).sort((a,b)=>(b.f.crewId===p.lead)-(a.f.crewId===p.lead)),SOx=x=>!!x.f.crewId&&feeSales(p,x.f.crewId);
    tables=days.map((dd,k)=>{const on=crewF.filter(x=>!x.f.crewId||SOx(x)?k===0:crewDaysOf(p,x.f.crewId).includes(dd));
      const firstDay=x=>!x.f.crewId||SOx(x)||crewDaysOf(p,x.f.crewId)[0]===dd;
      const daySum=daySumOf(p,dd);
      const body=on.map((x,n)=>`<tr><td class="n">${n+1}</td><td>${nameCell(x.f,x.i)}</td><td>${ro_(esc(x.f.task||(x.f.roles||[]).join(' + ')||''))}</td><td>${x.f.crewId&&!SOx(x)?tin(x.i,'day:'+dd,(x.f.dayAmounts||{})[dd],'0',{money:1}):tin(x.i,'amount',x.f.amount,'0',{money:1})}${x.f.crewId&&!SOx(x)?penCellNote(p,x.f,dd,firstDay(x)):''}</td><td>${ro_(esc(gearOf(x.f)||x.f.gear||''))}</td><td>${firstDay(x)?rentCell(x.f,x.i):ro_('')}</td></tr>`).join('')||`<tr><td colspan="6" class="empty-row">Erre a napra még nincs beosztva senki.</td></tr>`;
      return `<div class="day-tbl-h">${k+1}. nap – ${esc(dayLbl(dd))}</div>`+tbl(body,`<tfoot><tr class="day-sub"><td></td><td></td><td class="r tf-lbl">Napi összesen<small class="muted tf-sub">díjcsökkentés után</small></td><td class="r" data-day-sum="${dd}">${moneyFmt(daySum)||0}</td><td colspan="2"></td></tr></tfoot>`,'day-sheet');}).join('');
    const fixedRows=fees.map((f,i)=>({f,i})).filter(x=>x.f.kind==='fixed').sort((a,b)=>(/^egyeb/.test(a.f.key||'')?1:0)-(/^egyeb/.test(b.f.key||'')?1:0)).map(x=>`<tr class="fixed-row"><td class="n"></td><td>${nameCell(x.f,x.i)}</td><td>${ro_('')}</td><td>${tin(x.i,'amount',x.f.amount,'0',{money:1})}</td><td>${ro_('')}</td><td>${ro_('')}</td></tr>`).join('');
    tables+=`<div class="day-tbl-h">Egyéb költségek</div>`+tbl(commonRow()+fixedRows,`<tfoot><tr class="day-sub"><td></td><td></td><td></td><td class="r" data-other-sum="1">${moneyFmt(otherSumOf(p))||0}</td><td colspan="2"></td></tr></tfoot>`,'day-sheet')+postTbl()+sumTbl();
  }else{
    if(true){const field=fees.map((f,i)=>({f,i})).filter(x=>x.f.kind!=='fixed'&&!feePost(p,x.f.crewId)).sort((a,b)=>(b.f.crewId===p.lead)-(a.f.crewId===p.lead));   // a projektvezető mindig elöl
      const fr=field.map((x,n)=>`<tr data-fee-row="${x.i}"><td class="n"><div class="mv-cell"><span>${n+1}</span>${field.length>1&&!ro()?`<span class="drag-h" data-drag-fee="${x.i}" title="Húzd a sorrend módosításához" aria-label="Sor áthelyezése">⠿</span>`:''}</div></td><td>${nameCell(x.f,x.i)}</td><td>${ro_(esc((t=>isSplitCut(p,x.f)?t.split(/\s*\+\s*/).filter(z=>z!=='Vágó').join(' + '):t)(x.f.task||(x.f.roles||[]).join(' + ')||'')))}</td><td>${(isSplitCut(p,x.f)?tin(x.i,'onsite',num(x.f.amount)-postAmt(x.f),'0',{money:1}):tin(x.i,'amount',x.f.amount,'0',{money:1}))}${x.f.crewId?penCellNote(p,x.f):''}</td><td>${ro_(esc(gearOf(x.f)||x.f.gear||''))}</td><td>${rentCell(x.f,x.i)}</td></tr>`).join('')||`<tr><td colspan="6" class="empty-row">Ha beosztasz valakit a stábba, automatikusan bekerül ide.</td></tr>`;
      const fixedRows=fees.map((f,i)=>({f,i})).filter(x=>x.f.kind==='fixed').sort((a,b)=>(/^egyeb/.test(a.f.key||'')?1:0)-(/^egyeb/.test(b.f.key||'')?1:0)).map(x=>`<tr class="fixed-row"><td class="n"></td><td>${nameCell(x.f,x.i)}</td><td>${ro_('')}</td><td>${tin(x.i,'amount',x.f.amount,'0',{money:1})}</td><td>${ro_('')}</td><td>${ro_('')}</td></tr>`).join('');
      tables=(editOnly(p)?'':`<div class="day-tbl-h">📍 Helyszíni stáb</div>`+tbl(fr,field.length?`<tfoot><tr class="day-sub"><td></td><td></td><td></td><td class="r" data-field-sum="1">${moneyFmt(fieldSumOf(p))||0}</td><td></td><td class="r"><b>${moneyFmt(field.reduce((s,x)=>s+(x.f.crewId&&rentalsOf(p,x.f.crewId).some(r=>!r.own)?rentalSum(p,x.f.crewId):num(x.f.rent)),0))||0}</b></td></tr></tfoot>`:'','day-sheet')+`<div class="day-tbl-h">Egyéb költségek</div>`+tbl(commonRow()+fixedRows,`<tfoot><tr class="day-sub"><td></td><td></td><td></td><td class="r" data-other-sum="1">${moneyFmt(otherSumOf(p))||0}</td><td colspan="2"></td></tr></tfoot>`,'day-sheet'))+postTbl()+sumTbl();   // videóvágásnál nincs helyszíni stáb és egyéb költség
    }else{
    const rows=fees.map((f,i)=>{const fixed=f.kind==='fixed';
      const sep=fixed&&(i===0||fees[i-1].kind!=='fixed')?`<tr class="sep-row"><td colspan="6">Egyéb költségek</td></tr>${commonRow()}`:'';
      return sep+`<tr class="${fixed?'fixed-row':''}"${fixed?'':` data-fee-row="${i}"`}><td class="n">${fixed?'':`<div class="mv-cell"><span>${i+1}</span>${nf>1&&!ro()?`<span class="drag-h" data-drag-fee="${i}" title="Húzd a sorrend módosításához" aria-label="Sor áthelyezése">⠿</span>`:''}</div>`}</td><td>${nameCell(f,i)}</td><td>${ro_(fixed?'':esc(f.task||(f.roles||[]).join(' + ')||''))}</td><td>${tin(i,'amount',f.amount,'0',{money:1})}${f.crewId?penCellNote(p,f):''}</td><td>${ro_(fixed?'':esc(gearOf(f)||f.gear||''))}</td><td>${rentCell(f,i)}</td></tr>`;}).join('');
    tables=tbl(rows||`<tr><td colspan="6" class="empty-row">Ha beosztasz valakit a stábba, automatikusan bekerül ide.</td></tr>`,foot);
    }
  }
  return `<div class="${inner?'fin-inline fin':'panel fin'}">
    <p class="hint" style="margin:10px 0 8px">🔒 ${adm?'A projekt értékét és a százalékokat csak te látod. A termelési vezető a termelői díjakat és a keretet forintban látja, a szakemberek semmit.':'A szakemberek az alábbi táblázatot nem látják.'} Minden összeg nettó, ÁFA nélkül.</p>
    ${adm?'':(()=>{const k=budgetFt(p),sum=feeSum(p),left=k==null?null:k-sum;   /* termelési vezető: a termelői keret fent, jól láthatóan */
      return `<div class="keret-top${left!=null&&left<0?' over':''}"><div><span>Termelői keret</span><b>${k!=null?moneyFmt(k)+' Ft':'nincs megadva'}</b></div><div><span>Díjak összesen</span><b>${moneyFmt(sum)||0} Ft</b></div>${left!=null?`<div class="kt-left"><span>${left<0?'Keret túllépése':'Maradt a keretből'}</span><b>${left<0?'−':''}${moneyFmt(Math.abs(left))||0} Ft</b></div>`:''}</div>`;})()}
    <datalist id="fee-names">${S.crew.slice().sort((a,b)=>a.name.localeCompare(b.name,'hu')).map(c=>`<option value="${esc(c.name)}">`).join('')}</datalist>
    ${finPanelBody(p)}
    ${budgetRequestPanel(p)}
    ${tables}
    ${refOption(p)}
    ${penPanel(p)}
  </div>`;
}
function myFeePanel(p){
  const cid=S.me&&S.me.crewId,a=num(p.myFee.amount),pens=(p.penalties||[]).filter(x=>x.crewId===cid);
  if(!pens.length)return `<div class="panel my-fee-panel"><h3>💰 Díjad ezen a projekten <span class="muted" style="font-weight:600">· nettó</span></h3><div class="my-fee-amt">${ftFmt(a)} <span class="fee-net">nettó</span></div></div>`;
  const d=penDeduct(p,cid,a),dmg=penDamage(p,cid);
  return `<div class="panel my-fee-panel"><h3>💰 Díjad ezen a projekten <span class="muted" style="font-weight:600">· nettó</span></h3>
    <div class="kv"><span>Eredeti díj</span><b>${ftFmt(a)} nettó</b></div>${d?`<div class="kv"><span>Díjcsökkentés${pens.some(x=>x.day)?'':` (${penPct(p,cid)}%)`}</span><b class="bad-txt">−${ftFmt(d)}</b></div>`:''}
    <div class="kv"><span>Kifizetendő</span><b class="my-fee-amt">${ftFmt(a-d)} <span class="fee-net">nettó</span></b></div>${dmg?`<div class="kv"><span>Kártérítési követelés</span><b class="bad-txt">${ftFmt(dmg)}</b></div>`:''}
    ${pens.map(x=>{const k=PEN_KINDS[x.kind]||{};return `<div class="pen-row approved"><div class="pen-main"><b>${esc(k.label||'')}</b>${x.kind==='damage'?' · '+ftFmt(x.amount):' · '+num(x.pct)+'%'+(x.day?' a '+esc(dayLbl(x.day))+' napi díjból':'')} <span class="muted">(szerződés ${esc(k.ref||'')} pont)</span>
      ${x.caseText?`<div class="pen-case">${esc(x.caseText)}</div>`:''}<div class="pen-reason">${esc(x.reason)}</div>${x.link?`<a class="linkbtn" href="${esc(x.link)}" target="_blank" rel="noopener">Bizonyíték ↗</a>`:''}
      ${x.objection?`<div class="pen-obj"><b>Kifogásod</b> (${esc(x.objection.at)}): ${esc(x.objection.text)}</div>`:`<button class="btn outline small" type="button" data-action="pen-object" data-pid="${esc(p.id)}" data-id="${esc(x.id)}" style="margin-top:8px">Kifogásolom</button>`}</div></div>`;}).join('')}</div>`;
}
function penCellNote(p,f,dd,first){   // dd: napi táblázat (több napos projekt) – a napra szabott levonás ott jelenik meg
  const all=penOf(p,f.crewId,'approved').filter(x=>x.kind!=='damage'),pend=penOf(p,f.crewId,'pending').length,dmg=penDamage(p,f.crewId),tot=num(f.amount);
  const tip=arr=>esc(arr.map(penTipText).join('\n\n'));
  const line=(arr,base,pre)=>{if(!arr.length)return '';const pc=Math.min(100,arr.reduce((s,x)=>s+num(x.pct),0)),d=Math.min(base,Math.round(base*pc/100));return `<span class="bad-txt pen-tip" data-tip="${tip(arr)}" tabindex="0">${pre||''}−${moneyFmt(d)||0} (${pc}%) → ${moneyFmt(base-d)||0}</span>`;};
  let h='';
  if(dd){h=line(all.filter(x=>x.day===dd),num((f.dayAmounts||{})[dd]))+(first?line(all.filter(x=>!x.day),tot,'teljes díjból: '):'');if(!first)return h?`<div class="pen-sub">${h}</div>`:'';}
  else if(all.some(x=>x.day)){const d=penDeduct(p,f.crewId,tot);h=d?`<span class="bad-txt pen-tip" data-tip="${tip(all)}" tabindex="0">−${moneyFmt(d)} → ${moneyFmt(tot-d)||0}</span>`:'';}
  else h=line(all,tot);
  if(!h&&!pend&&!dmg)return '';
  return `<div class="pen-sub">${h}${dmg?`<span class="bad-txt pen-tip" data-tip="${tip(penOf(p,f.crewId,'approved').filter(x=>x.kind==='damage'))}" tabindex="0">kártérítés: ${moneyFmt(dmg)}</span>`:''}${pend?`<span class="warn-txt pen-tip" data-tip="${tip(penOf(p,f.crewId,'pending'))}" tabindex="0">${pend} jóváhagyásra vár</span>`:''}</div>`;
}
/* A díjcsökkentés részletei a súgóban (a piros összeg fölé víve) */
function penTipText(x){const k=PEN_KINDS[x.kind]||{};
  return [`${k.label||'Díjcsökkentés'}${x.kind==='damage'?' · '+ftFmt(x.amount):' · '+num(x.pct)+'%'}${x.day?' · '+dayLbl(x.day)+' napi díjából':''}${k.ref?' (szerződés '+k.ref+' pont)':''}`,
    x.caseText?'Eset: '+x.caseText:'',x.reason?'Indoklás: '+x.reason:'',`Kirótta: ${x.by||''}${x.at?' · '+x.at:''}${x.status==='approved'&&x.decidedBy&&x.decidedBy!==x.by?' · jóváhagyta: '+x.decidedBy:''}`].filter(Boolean).join('\n');}
/* Díjcsökkentések listája a pénzügyi panel alján (vezetőknek) */
/* Ügyvezető: a levonás áthelyezhető másik napra (több napos projektnél). */
function penDaySelect(p,x){
  if(x.kind==='damage'||!(S.capabilities&&S.capabilities.penaltyDay)||projDays(p).length<2||isPostOnly(p,x.crewId))return '';
  const days=crewDaysOf(p,x.crewId);if(days.length<2&&!x.day)return '';
  return `<select class="inp pen-day" data-pen-day="${esc(x.id)}" aria-label="Melyik napi díjból" title="Melyik napi díjból vonjuk le">${days.map(d=>`<option value="${d}"${x.day===d?' selected':''}>${esc(dayLbl(d))}</option>`).join('')}<option value=""${x.day?'':' selected'}>Teljes díj</option></select>`;
}
function penPanel(p){
  const list=(p.penalties||[]).slice().sort((a,b)=>String(b.at).localeCompare(String(a.at)));if(!list.length)return '';
  return `<div class="pen-panel"><h4 class="sub-h">🚨 Díjcsökkentések</h4>${list.map(x=>{const k=PEN_KINDS[x.kind]||{},c=crewById(x.crewId),amt=penAmt(p,x);
    const pill=x.status==='approved'?'<span class="statuspill p-bad">Jóváhagyva</span>':x.status==='rejected'?'<span class="statuspill">Elutasítva</span>':'<span class="statuspill p-warn">Jóváhagyásra vár</span>';
    return `<div class="pen-row ${x.status}"><div class="pen-main"><b>${esc(c?c.name:(S.crewNames||{})[x.crewId]||'Munkatárs')}</b> · ${esc(k.label||'')}${x.kind==='damage'?'':` <b>${num(x.pct)}%</b>`}${x.day?' · '+esc(dayLbl(x.day))+' napi díjából':''} · ${x.kind==='damage'?'kártérítés':'levonás'}: <b>${ftFmt(amt)}</b> ${pill}
      ${x.caseText?`<div class="pen-case">${esc(x.caseText)}</div>`:''}<div class="pen-reason">${esc(x.reason)}</div>
      ${x.link?`<a class="linkbtn" href="${esc(x.link)}" target="_blank" rel="noopener">Bizonyíték ↗</a>`:''}
      <div class="ser">Kirótta: ${esc(x.by)} · ${esc(x.at)}${x.decidedAt&&x.status!=='pending'?` · ${x.status==='approved'?'jóváhagyta':'elutasította'}: ${esc(x.decidedBy)}${x.decisionNote?' – '+esc(x.decisionNote):''}`:''}</div>
      ${x.objection?`<div class="pen-obj"><b>Kifogás</b> (${esc(x.objection.at)}): ${esc(x.objection.text)}</div>`:''}</div>
      ${isAdmin()?`<div class="pen-act">${x.status==='pending'?`<button class="btn primary small" type="button" data-action="pen-approve" data-id="${esc(x.id)}">Jóváhagyás</button><button class="btn outline small" type="button" data-action="pen-reject" data-id="${esc(x.id)}">Elutasítás</button>`:''}${penDaySelect(p,x)}<button class="trash" type="button" data-action="pen-del" data-id="${esc(x.id)}" title="Törlés" aria-label="Törlés">🗑️</button></div>`:''}</div>`;}).join('')}</div>`;
}
/* Csapat véglegesítése doboz a stáb alatt */
/* Szervezői jutalék: a rendezvényszervezőnek (ügyfél a listából) fizetett összeg; csak az ügyvezető látja */
function orgOption(p){if(!isAdmin())return '';const dis=ro()||projLocked(),raw=extrasRaw(p),i=raw.findIndex(x=>x&&x.kind==='org'),x=i>=0?raw[i]:null;
  if(!x)return '';   // a „＋ Hozzáadás…” menüből kapcsolható be; a szerződött érték alatt jelenik meg
  const opts=(S.clients||[]).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'hu')).map(c=>`<option value="${esc(c.id)}"${c.id===x.clientId?' selected':''}>${esc(c.name||'')}</option>`).join('');
  return `<div class="field fin-org"><label>🎪 Szervezői jutalék${dis?'':` <button class="x w" type="button" data-action="extra-del" data-i="${i}" title="Szervezői jutalék törlése" aria-label="Szervezői jutalék törlése">✕</button>`}</label>
    <div class="org-line org-g"><select class="inp" id="org-sel" data-cmb="Szervező (kezdj el gépelni)…"${dis?' disabled':''}><option value="">Szervező…</option>${opts}${dis?'':'<option value="__new" data-keep="1">＋ Új ügyfél felvétele…</option>'}</select>
    <div class="money"><span class="ex-sign">−</span><input class="inp money-inp" data-extra-amt="${i}" data-money="big" inputmode="numeric" value="${esc(moneyFmt(x.amount||''))}" placeholder="0" aria-label="Szervezői jutalék nettó összege"${dis?' disabled':''}><span class="money-unit">Ft</span></div></div></div>`;}
function finNet(p){if(!isAdmin())return '';const of=orgOf(p),tvs=extrasRaw(p).filter(x=>x&&x.kind==='tov');if(!of&&!tvs.length)return '';
  const names=(of?['szervezői jutalék']:[]).concat(tvs.map(x=>String(x.name||'').trim()||'továbbszámlázott költség')),lbl=(names.length>2?names.slice(0,-1).join(', ')+' és '+names[names.length-1]:names.join(' és '))+' után';
  const L=lbl.charAt(0).toUpperCase()+lbl.slice(1),tip='Végső érték − szervezői jutalék − továbbszámlázott költség (nettó). Ebből számolódik az értékesítői jutalék.';
  return `<div class="field fin-net"><label title="${esc(tip)}">${esc(L)}</label><div class="money"><input class="inp money-inp" type="text" value="${esc(moneyFmt(salesBase(p)))}" readonly tabindex="-1" aria-label="${esc(L)}"><span class="money-unit">Ft</span></div></div>`;}
/* Értékesítői jutalék: a projekthez tartozó szerződött lehetőség (Értékesítés fül) értékesítője és várható jutaléka */
const projDeal=p=>(S.deals||[]).find(d=>d.projectId===p.id&&d.stage==='nyert')||null;
const salesOn=p=>!!projDeal(p)||!!(S.salesOn||{})[p.id];
const salesBase=p=>Math.max(0,projTotal(p)-orgFee(p)-extrasRaw(p).filter(e=>e&&e.kind==='tov').reduce((s,e)=>s+num(e.amount),0));   // jutalékalap: a szervezői jutalék és a továbbszámlázott költség után   // jutalékalap: a továbbszámlázott költség nélkül
function salesCommEst(p,d){if(!d)return null;const base=salesBase(p),man=String(d.commManual==null?'':d.commManual).trim();
  if(/^ft:/.test(man)){const a=num(man.slice(3));return {amt:a,pct:base>0?Math.round(a/base*10000)/100:0,base,manual:true};}   // kézzel megadott összeg
  if(man!==''&&!isNaN(Number(man)))return {amt:Math.round(base*Number(man)/100),pct:Number(man),base,manual:true};
  const sp=(S.salesPeople||[]).find(x=>x.userId===d.ownerId);if(!sp)return num(d.commAmt)?{amt:num(d.commAmt),pct:d.commPct,base}:null;
  const pct=base>=num(sp.commLimit)?num(sp.commHigh):num(sp.commLow);return {amt:Math.round(base*pct/100),pct,base};}
function salesPpl(){const nmK=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  return (S.salesPeople||[]).filter((x,i,a)=>a.findIndex(y=>nmK(y.name)===nmK(x.name))===i).concat((S.crew||[]).filter(c=>(c.roles||[]).includes('Értékesítő')&&!(S.salesPeople||[]).some(x=>x.crewId===c.id||nmK(x.name)===nmK(c.name))).map(c=>({userId:'crew:'+c.id,name:c.name,crewId:c.id}))).sort((a,b)=>String(a.name).localeCompare(String(b.name),'hu'));}
function salesCommFields(p){const d=projDeal(p);if(!isAdmin()||isFree(p))return '';
  if(!d){if(ro()||projLocked())return '';   /* még nincs értékesítő: a büdzsé sorában rögtön kiválasztható – utána itt jelenik meg a jutalék % és összege */
    return `<div class="field fin-ssel"><label for="sales-sel">Értékesítő</label><select class="inp" id="sales-sel" data-cmb="Válassz…"><option value="">Válassz…</option>${salesPpl().map(x=>`<option value="${esc(x.userId)}">${esc(x.name)}</option>`).join('')}</select></div>`;}const e=salesCommEst(p,d)||{amt:0,pct:''},dis=ro()||projLocked()?' disabled':'';
  const tip=`${esc(d.ownerName||'Értékesítő')} jutaléka${e.manual?' (ennél a projektnél kézzel megadva)':' (az értékesítő sávos szabálya szerint)'} – a jutalékalap a továbbszámlázott költség nélküli érték: ${ftFmt(salesBase(p))}. Üresre törölve visszaáll a szabályra.`;
  return `<div class="field fin-scp"><label title="${tip}">Jutalék</label><div class="money"><input class="inp money-inp" id="f-salesPct" type="text" inputmode="decimal" data-sales-pct value="${esc(String(e.pct===''?'':e.pct).replace('.',','))}" placeholder="%" aria-label="Értékesítői jutalék százaléka"${dis}><span class="money-unit">%</span></div></div>
    <div class="field fin-scf"><label title="${tip}">${esc(d.ownerName||'Értékesítő')}</label><div class="money"><input class="inp money-inp" id="f-salesFt" type="text" inputmode="numeric" data-money="big" data-sales-ft value="${esc(moneyFmt(e.amt))}" placeholder="0" aria-label="Értékesítői jutalék összege"${dis}><span class="money-unit">Ft</span></div></div>`;}
function salesOption(p){if(!isAdmin()||!salesOn(p))return '';const d=projDeal(p),dis=ro()||projLocked(),est=d?salesCommEst(p,d):null;
  const nmK=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const ppl=(S.salesPeople||[]).filter((x,i,a)=>a.findIndex(y=>nmK(y.name)===nmK(x.name))===i).concat((S.crew||[]).filter(c=>(c.roles||[]).includes('Értékesítő')&&!(S.salesPeople||[]).some(x=>x.crewId===c.id||nmK(x.name)===nmK(c.name))).map(c=>({userId:'crew:'+c.id,name:c.name,crewId:c.id})))   // névre is szűrve: egy ember egyszer   // értékesítő felhasználók + „Értékesítő” szerepű munkatársak
    .sort((a,b)=>String(a.name).localeCompare(String(b.name),'hu'));
  const selOf=x=>d&&(d.ownerId===x.userId||(!ppl.some(y=>y.userId===d.ownerId)&&nmK(d.ownerName)&&nmK(d.ownerName)===nmK(x.name)));   // ugyanaz az ember más azonosítóval: nem jelenik meg kétszer
  const opts=ppl.map(x=>`<option value="${esc(x.userId)}"${selOf(x)?' selected':''}>${esc(x.name)}</option>`).join('')+(d&&d.ownerId&&!ppl.some(x=>x.userId===d.ownerId||selOf(x))?`<option value="${esc(d.ownerId)}" selected>${esc(d.ownerName||'Értékesítő')}</option>`:'');
  return `<div class="ref-opt in-ex sales-opt"><label class="toggle"><input type="checkbox" data-sales-toggle checked${dis?' disabled':''}><span class="tl">💼 Értékesítői jutalék</span></label>
    <div class="ref-list org-line"><select class="inp" id="sales-sel" data-cmb="Értékesítő kiválasztása…"${dis?' disabled':''}><option value="">Értékesítő kiválasztása…</option>${opts}</select>
    ${d?'':'<span class="muted">Válaszd ki, ki értékesítette a projektet.</span>'}</div>
    <p class="hint" style="margin:4px 0 0">Összekötve az Értékesítés füllel${d?` (${esc(d.source||'')}${d.wonAt?', szerződve '+esc(fmtShort(String(d.wonAt).slice(0,10))):''})`:''}. A jutalék % és összege fent, a termelői keret mellett látszik (ott kézzel is átírható); a tényleges jutalék havonta, a befolyt nettó összeg után számolódik.</p></div>`;}
/* Ajánlói jutalék: projektopció (nem munkatársi szerep) */
const refOn=p=>(p.fees||[]).some(f=>f.kind==='fixed'&&f.key==='ref')||!!(S.refOn||{})[p.id];
function refOption(p,inEx){if(!isAdmin())return '';if(!inEx&&!isFree(p))return '';   // csak az ügyvezető látja: az Extrák és kedvezmények alatt (díjmentes projektnél lent)
  const refs=(p.fees||[]).filter(f=>f.kind==='fixed'&&f.key==='ref'),on=refOn(p),dis=ro()||projLocked();
  if(inEx&&!on)return '';   // a „＋ Hozzáadás…” menüből kapcsolható be
  const opts=(S.crew||[]).filter(c=>!refs.some(f=>f.refCrewId===c.id)).sort((a,b)=>a.name.localeCompare(b.name,'hu')).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  return `<div class="ref-opt${inEx?' in-ex':''}"><label class="toggle"><input type="checkbox" data-ref-toggle${on?' checked':''}${dis?' disabled':''}><span class="tl">🤝 Ajánlói jutalék szakembernek</span></label>
    ${on?`<div class="ref-list">${refs.map(f=>`<span class="ref-chip">🤝 ${esc((crewById(f.refCrewId)||{}).name||(S.crewNames||{})[f.refCrewId]||f.name)}${num(f.amount)?' · '+ftFmt(num(f.amount)):' · <span class="warn-txt">összeg?</span>'}${dis?'':`<button class="x w" type="button" data-action="ref-del" data-id="${esc(f.refCrewId)}" aria-label="Törlés">×</button>`}</span>`).join('')}
      ${dis?'':`<select class="inp" id="ref-add" data-cmb="+ szakember kiválasztása (kezdj el gépelni)…" data-cmb-sub="crew"><option value="">+ szakember kiválasztása…</option>${opts}</select>`}</div><p class="hint" style="margin:4px 0 0">Az összeget az Egyéb költségek között add meg; a jutalék a szakember Kifizetéseiben jelenik meg.</p>`:''}</div>`;}
function crewFinalBox(p,ids){
  if(!ids.length)return '';
  if(crewPast(p))return `<div class="crew-final past" id="crew-final"><div class="cf-msg"><b>🔒 A rendezvény már lezajlott</b><small>A csapat és az eszközök utólag nem módosíthatók.</small></div></div>`;
  const st=crewFinalState(p),f=p.crewFinal,freeCut=postTasks(p).filter(t=>!taskOwners(p,t.k).length).length,on=crewFinalOn()&&!freeCut;
  // a véglegesítő ablak nem ugrik fel magától – csak a „Módosítások véglegesítése” gombra
  const sentL=(f&&(f.sentTo&&f.sentTo.length?f.sentTo:(f.notified||[]).map(n=>({name:n,email:((S.crew||[]).find(c=>c.name===n)||{}).email||''}))))||[];
  const msg=st==='ok'?`<b>✅ Csapat véglegesítve</b><small>${esc(f.at||'')}${f.by?' · '+esc(f.by):''} · a tagok a naptárban vannak${S.mailOn===false?' · <span class="warn-txt">⏸ az e-mail értesítések szünetelnek (Beállítások), ezért e-mailt nem kaptak</span>':''}</small>${S.mailOn===false?'':sentL.length?`<div class="cf-sent">✉️ E-mail kiküldve: ${sentL.map(x=>`<span class="nowrap"><b>${esc(x.name)}</b>${x.email?` <span class="muted">(${esc(x.email)})</span>`:''}</span>`).join(', ')}</div>`:'<div class="cf-sent muted">✉️ Ennél a véglegesítésnél nem kellett új e-mailt küldeni.</div>'}`
    :st==='changed'?`<b>⚠️ A csapat módosult a véglegesítés óta</b><small>Véglegesítsd újra, hogy a naptár és az értesítések az új csapatot kövessék – vagy állítsd vissza arra, amit a munkatársak megkaptak.</small>${crewDiffHtml(p)}${ro()||projLocked()||!(f&&f.sigs)?'':'<div class="btns" style="margin-top:8px"><button class="btn outline small" type="button" data-action="crew-revert">↶ Visszaállítás a kiküldött állapotra</button></div>'}`
    :`<b>⚠️ A csapat még nincs véglegesítve</b><small>A tagok csak véglegesítéskor kerülnek a naptárba, és csak akkor kapnak e-mailt és naptárértesítést. A helyszíni munkára lépéshez kötelező.</small>`;
  const ef=p.eqFinal,es=eqFinalState(p),noEq=!(p.equipment||[]).length&&!(p.rentals||[]).length&&es==='none',eqBox=st==='ok'&&!noEq?`<div class="crew-final ${es}" id="eq-final">${es==='ok'&&!(S.eqEdit||{})[p.id]?`<button class="btn outline small" type="button" data-action="eq-edit">✏️ Eszközök módosítása</button>`:`<button class="btn ${es==='none'?'primary':'outline'} small" type="button" data-action="eq-finalize">${es==='changed'?'🔁 Eszközök újra véglegesítése':'🎒 Eszközök véglegesítése'}</button>`}<div class="cf-msg">${es==='ok'?`<b>✅ Eszközök véglegesítve</b><small>${esc(ef.at||'')}${ef.by?' · '+esc(ef.by):''}${(S.eqEdit||{})[p.id]?' · szerkesztés alatt – módosítás után véglegesítsd újra':''}</small>`:es==='changed'?'<b>⚠️ Az eszközök módosultak a véglegesítés óta</b><small>Véglegesítsd újra.</small>':'<b>🎒 Az eszközök még nincsenek véglegesítve</b><small>Rendeld hozzá a kamerákat, objektíveket és a többi eszközt, aztán véglegesítsd.</small>'}</div></div>`:'';
  const editBtn=st==='ok'?((S.crewEdit||{})[p.id]?'<small class="bad-txt"><b>⚠️ A csapat szerkesztés alatt</b> – módosítás után véglegesítsd újra, a stáb újra értesítést kap.</small>':`<button class="btn alarm small" type="button" data-action="crew-edit">⚠️ Csapat módosítása</button>`):'';
  const editing=!!(S.crewEdit||{})[p.id];
  if(st==='changed'&&!editing)return `<div class="crew-final changed" id="crew-final"><button class="btn alarm small" type="button" data-action="crew-edit">⚠️ Csapat módosítása</button><div class="cf-msg"><b>⚠️ A csapat a véglegesítés óta módosult</b><small>A változások csak a „Csapat módosítása” után (indoklással) véglegesíthetők – vagy állítsd vissza arra, amit a munkatársak megkaptak.</small>${crewDiffHtml(p)}${projLocked()||!(f&&f.sigs)?'':'<div class="btns" style="margin-top:8px"><button class="btn outline small" type="button" data-action="crew-revert">↶ Visszaállítás a kiküldött állapotra</button></div>'}</div></div>${eqBox}`;
  return `<div class="crew-final ${st}" id="crew-final">${st==='ok'?editBtn:`<button class="btn ${st==='none'?'primary':'outline'} small" type="button" data-action="crew-finalize"${on?'':' disabled'}>${st==='changed'?'✅ Módosítások véglegesítése':'✅ Csapat véglegesítése'}</button>`}<div class="cf-msg">${msg}${freeCut&&st!=='ok'?`<small class="bad-txt"><b>⛔ Nem véglegesíthető:</b> ${freeCut} videó még nincs vágóhoz rendelve${cutterIds(p).length?'':' (nincs vágó beosztva)'}.</small>`:on||freeCut?'':'<small>A háttérkód frissítése után kapcsol be.</small>'}</div></div>${eqBox}`;
}
function crewEquipPanel(p,st,c,sortedCrew,leadOpts,leadBusy,personOpts,selRole,inner){
  const ROLES=projRoles(p);if(!ROLES.includes(selRole))selRole=ROLES.includes('Vágó')?'Vágó':ROLES[0];   // videóvágásnál csak projektvezető és vágó
  const opts=itemOptions(p);
  const ids=[];if(p.lead)ids.push(p.lead);(p.crew||[]).forEach(a=>{if(!ids.includes(a.crewId))ids.push(a.crewId);});
  const PD=projDays(p),selDay=PD.includes(S.crewDay)?S.crewDay:'',shownIds=selDay?ids.filter(id=>isPostOnly(p,id)||crewDaysOf(p,id).includes(selDay)):ids;   // utómunkás (pl. vágó) nem napokhoz kötött: minden napnál látszik   // több napos: napokra bontott stáb
  const dayTabs=PD.length?`<div class="day-tabs" role="tablist" aria-label="Stáb napok szerint"><button type="button" class="day-tab${selDay?'':' on'}" data-action="crew-day-tab" data-d="" role="tab" aria-selected="${!selDay}">Minden nap <span class="c">${ids.length}</span></button>${PD.map((dd,k)=>{const n=ids.filter(id=>!isPostOnly(p,id)&&crewDaysOf(p,id).includes(dd)).length;return `<button type="button" class="day-tab${selDay===dd?' on':''}" data-action="crew-day-tab" data-d="${dd}" role="tab" aria-selected="${selDay===dd}">${k+1}. nap · ${esc(dayLbl(dd))} <span class="c">${n}</span></button>`;}).join('')}</div>${selDay&&!ro()?`<p class="hint" style="margin:6px 0 0">A ${PD.indexOf(selDay)+1}. napra beosztott stáb. Akit most veszel fel, csak erre a napra kerül.</p>`:''}`:'';
  const CL=crewLocked(p),EL=eqLocked(p);
  const cards=shownIds.map(cid=>{const cr=crewById(cid),busy=busyFor(cid,p),tight=tightFor(cid,p);
    const roles=(p.crew||[]).map((a,i)=>({a,i})).filter(x=>x.a.crewId===cid&&!(x.a.role==='Projektvezető'&&p.lead===cid));   /* a projektvezetőt a jelvény mutatja – ne jelenjen meg tévesen más szerepként */
    const roleHtml=roles.map(({a,i})=>`<span class="role-sel"><select class="inp" data-crew-role="${i}" data-cmb="Szerep…" data-cmb-cls="inp role-cmb" aria-label="Szerep"${D()}>${CREW_ROLES.filter(r=>r!=='Projektvezető'&&(ROLES.includes(r)||r===a.role||(OP_SUB.includes(r)&&ROLES.includes('Operatőr')))).map(rl=>`<option value="${esc(rl)}"${OP_SUB.includes(rl)?' data-parent="Operatőr"':''}${rl===a.role?' selected':''}>${esc(rl)}${rl==='Vágó'&&onsiteCut(p,cid)?' · 📍 Helyszíni':''}</option>`).join('')}</select><button class="x w" type="button" data-action="crew-remove" data-i="${i}" aria-label="Szerep eltávolítása" title="Levétel a projektről ebben a szerepben">×</button></span>${a.role==='Vágó'&&!ro()?`<label class="remote-chk" data-tip="A vágó alapból otthonról dolgozik, ezért nem ütközik más munkával. Pipáld be, ha a helyszínen vág."><input type="checkbox" data-edit-onsite="${esc(cid)}"${onsiteCut(p,cid)?' checked':''}${projLocked()?' disabled':''}> 📍 Helyszíni vágó</label>`:''}`).join('');
    const free=(p.lead===cid?[]:['Projektvezető']).concat(CREW_ROLES.filter(r=>r!=='Projektvezető'&&(ROLES.includes(r)||(OP_SUB.includes(r)&&ROLES.includes('Operatőr')))&&!roles.some(x=>x.a.role===r)));
    const addRole=ro()||!free.length?'':`<span class="role-sel role-add"><select class="inp" data-crew-addrole="${esc(cid)}" data-cmb="+ Szerep" data-cmb-cls="inp role-cmb" aria-label="Extra szerep hozzáadása"><option value="">+ Szerep</option>${free.map(rl=>`<option${OP_SUB.includes(rl)&&free.includes('Operatőr')?' data-parent="Operatőr"':''}>${esc(rl)}</option>`).join('')}</select></span>`;
    const rows=eqRowsFor(p,cid),leadOnly=p.lead===cid&&!roles.length,note=(p.crewNotes||{})[cid]||'';
    const first=cr?huFirst(String(cr.name)):'';
    const rentHtml=rentalsOf(p,cid).map(r=>`<div class="eqrow rent"><div class="who"><b>${esc(r.name)}</b><small>${r.own?'Saját eszköz':'Bérelt'}${r.company?' · '+esc(r.company):''}${canSeeFees()&&num(r.price)?' · '+ftFmt(r.price):''}</small></div>${ro()?'':`<button class="trash" type="button" data-action="rent-remove" data-id="${esc(r.id)}" aria-label="Bérelt eszköz törlése">🗑️</button>`}</div>`).join('');
    const postOnly=feePost(p,cid)&&!onsiteCut(p,cid)&&!rows&&!rentHtml;   // az értékesítő kaphat eszközt (pl. tablet a standhoz)   // csak vágó (utómunka) / értékesítő: nincs eszköz, nem kap eszközlistát
    const eqBlock=postOnly?'':`<div class="pcrew-eq">${rows||rentHtml||leadOnly?'':'<p class="hint" style="margin:2px 0 0">Még nincs nála eszköz.</p>'}${rows}${rentHtml}${eqAddRow(p,cid,opts)}</div>`;
    const noteBlock=ro()?(note?`<div class="pcrew-note-ro"><b>Neked szóló jegyzet:</b> ${esc(note)}</div>`:''):`<textarea class="inp pcrew-note" data-crew-note="${esc(cid)}" rows="2" placeholder="Személyes jegyzet ${esc(first)} számára – ${postOnly?'a beosztásos levélbe kerül':'az eszközlistás levélbe is bekerül'}">${esc(note)}</textarea>`;
    const iv=(p.invites||{})[cid],saved=!!projById(p.id),invHtml=ro()||!saved?'':`<div class="pcrew-inv">${!iv?`<button type="button" class="btn outline small inv-btn" data-action="crew-invite" data-id="${esc(cid)}" data-tip="Meghívó e-mail és naptárbejegyzés – a projektet csak az elfogadás után látja">✉️ Meghívás</button>`:iv.st==='yes'?`<span class="inv-st yes" data-tip="${esc('Elfogadta'+(iv.via==='cal'?' a Google Naptárban':iv.via==='app'?' az appban':''))}">✓ Elfogadta</span>`:iv.st==='no'?`<span class="inv-st no">✗ Nem vállalta</span><button type="button" class="linkbtn" data-action="crew-invite" data-id="${esc(cid)}">↻ Újra</button>`:`<span class="inv-st wait" data-tip="${esc('Meghívva: '+String(iv.at||'').slice(0,16))}">⏳ Meghívva – még nem válaszolt</span><button type="button" class="linkbtn" data-action="crew-invite" data-id="${esc(cid)}" data-tip="Meghívó újraküldése">↻</button>`}</div>`;
    return `<div class="pcrew${p.lead===cid?' is-lead':''}${CL?' locked':''}" data-eq-drop="${esc(cid)}">${invHtml}${p.lead===cid?`<span class="lead-badge">★ Projektvezető${p.leadRemote?' · 🛰️ Remote':''}</span>`:''}<div class="pcrew-person"${CL?' inert':''}><div class="pcrew-top">${avatar(cr)}${ro()?'':p.lead===cid?`<span class="lead-star on" data-tip="Ő a projektvezető – a stáb kapcsolattartója">★</span>`:`<button class="lead-star" type="button" data-action="make-lead" data-id="${esc(cid)}" data-tip="Kijelölés projektvezetőnek – ő lesz a stáb kapcsolattartója" aria-label="${esc(cr?cr.name:'')} kijelölése projektvezetőnek">☆</button>`}${ro()?'':`<button class="trash pcrew-del" type="button" data-action="crew-person-remove" data-id="${esc(cid)}" aria-label="Levétel a projektről" data-tip="Levétel a projektről (minden szerepével)">🗑️</button>`}<div class="who"><b>${esc(cr?cr.name:'Törölt munkatárs')}</b>${busy.length?`<span class="bad-txt">Ütközik: ${busy.map(q=>`<button class="linkbtn bad-link" type="button" data-action="open-project" data-id="${esc(q.id)}" title="${esc(q.name||'')} megnyitása">${esc(q.name||'projekt')}</button>`).join(', ')}</span>`:cr&&cr.phone?`<small>${esc(cr.phone)}</small>`:''}</div></div>
      ${tight.map(g=>`<p class="tight-note${g.gap<TRAVEL_RED_MIN?' bad':''}">${g.gap<TRAVEL_RED_MIN?'⛔':'⏱️'} ${tightText(g)}</p>`).join('')}
      <div class="pcrew-roles">${p.lead===cid?`${ro()||projLocked()||CL?'':`<button class="linkbtn lead-rm" type="button" data-action="lead-remove" title="Projektvezető szerep levétele">projektvezető levétele</button>`}${ro()?'':`<label class="remote-chk" data-tip="A projektet távolról vezeti – nem kell a helyszínen lennie, ezért nem ütközik más munkával"><input type="checkbox" data-lead-remote="1"${p.leadRemote?' checked':''}${projLocked()?' disabled':''}> 🛰️ Remote</label>${p.leadRemote&&!remoteLead(p)?(()=>{const on=[...new Set((p.crew||[]).filter(a=>a.crewId===cid&&!(POST_ROLES.includes(a.role)&&!(a.role==='Vágó'&&onsiteCut(p,cid)))).map(a=>a.role==='Vágó'?'helyszíni vágó':String(a.role).toLowerCase()))];return `<p class="hint warn-txt" style="margin:4px 0 0">⚠️ Remote vezeti, de ${esc(on.join(', ')||'helyszíni szerepben')}ként is be van osztva, ezért a helyszínen kell lennie – ezért ütközhet. Ha nem megy ki, vedd le ezt a szerepet.</p>`;})():''}`}`:''}${roleHtml}${addRole}</div>
      ${projDays(p).length&&!isPostOnly(p,cid)?`<div class="pcrew-days" aria-label="Munkanapok">${projDays(p).map(dd=>{const on=crewDaysOf(p,cid).includes(dd);return ro()?(on?`<span class="day-chip on">${esc(dayLbl(dd))}</span>`:''):`<button type="button" class="day-chip${on?' on':''}" data-action="crew-day" data-cid="${esc(cid)}" data-d="${dd}" aria-pressed="${on}" title="${on?'Dolgozik ezen a napon – kattints, ha mégsem':'Nem dolgozik ezen a napon'}">${esc(dayLbl(dd))}</button>`;}).join('')}</div>`:''}
      </div><div class="pcrew-eqwrap"${EL?' inert':''}>${eqBlock}</div><div class="pcrew-cutwrap"${CL?' inert':''}>${cutTasksBlock(p,cid)}</div><div class="pcrew-eqwrap"${EL?' inert':''}>${noteBlock}</div></div>`;}).join('');
  const commonRows=eqRowsFor(p,'')+(p.equipment||[]).map((e,i)=>({e,i})).filter(x=>x.e.crewId&&!ids.includes(x.e.crewId)).map(({e,i})=>{const it=itemById(e.itemId);
    return `<div class="eqrow"><div class="who"><b>${esc(it?it.name:'Törölt eszköz')}</b><small>${esc((crewById(e.crewId)||{}).name||'')} – már nincs a projekten</small></div><input class="inp qty" type="number" min="1" inputmode="numeric" data-eq-i="${i}" value="${num(e.qty)}" aria-label="Darabszám"${D()}><button class="x w" type="button" data-action="eq-remove" data-i="${i}" aria-label="Eszköz eltávolítása">×</button></div>`;}).join('');
  const eqN=eqCount(p),hasEq=(p.equipment||[]).length;
  const aside=`${ids.length} fő · ${eqN} eszköz`;
  const body=`<div class="need">${st.map(s=>`<span class="statuspill ${s.have>=s.need?'p-ok':'p-warn'}" title="${s.have<s.need?'Kellene: '+s.need:''}">${esc(s.role)} ${s.have}</span>`).join('')}</div>
    <p class="hint">Munkatársanként rendeld hozzá, kinél milyen eszköz lesz.</p>
    ${!p.lead&&!ro()?`<div class="need-lead-box"><b>⚠️ Nincs projektvezető</b><span>Minden projektnek kell egy vezető – ő a stáb kapcsolattartója, és nélküle a projekt nem léphet tovább.</span>${projLocked()||crewLocked(p)?'':`<select class="inp" id="lead-pick" style="width:auto"><option value="">★ Projektvezető kijelölése…</option>${(()=>{const on=new Set(ids),all=(S.crew||[]).slice().sort((a,b)=>a.name.localeCompare(b.name,'hu')),a=all.filter(c=>on.has(c.id)),b=all.filter(c=>!on.has(c.id)&&(c.roles||[]).includes('Projektvezető'));return (a.length?`<optgroup label="A projekten">${a.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</optgroup>`:'')+(b.length?`<optgroup label="Projektvezetők">${b.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</optgroup>`:'');})()}</select>`}</div>`:''}
    ${leadBusy.length?`<p class="bad-txt" style="margin:6px 0 0">A projektvezető ütközik: ${esc(leadBusy.map(q=>q.name).join(', '))}</p>`:''}
    ${dayTabs}
    <div class="pcrew-list">${cards}${ro()||projLocked()||CL?(cards?'':empty('Még nincs beosztva senki.')):`<div class="pcrew pcrew-add-card"><div class="pcrew-add-h"><span class="plus">+</span><span>Szakember hozzáadása${selDay?' erre a napra':''}</span></div>${ro()?'':S.crew.length?(()=>{const people=sortedCrew.slice().sort((x,y)=>prioNum(x)-prioNum(y)||x.name.localeCompare(y.name,'hu'));
      const on=new Set(ids),fit=people.filter(x=>(x.roles||[]).includes(selRole)),rest=people.filter(x=>!(x.roles||[]).includes(selRole));
      const opt=x=>{const busy=busyFor(x.id,p),already=selRole==='Projektvezető'?p.lead===x.id:(p.crew||[]).some(a=>a.crewId===x.id&&a.role===selRole)&&(!selDay||crewDaysOf(p,x.id).includes(selDay));return `<option value="${esc(x.id)}"${already?' disabled':''}>${prioNum(x)<9?'P'+prioNum(x)+' · ':''}${esc(x.name)}${already?' – már be van osztva':busy.length?' – foglalt':on.has(x.id)?' – már a projekten':''}</option>`;};
      return `<div class="addrow labeled add-in-card"><div class="field"><label for="add-crew-role">Beosztás</label><select class="inp" id="add-crew-role" data-cmb="Beosztás…">${ROLES.map(rl=>`<option${OP_SUB.includes(rl)?' data-parent="Operatőr"':''}${rl===selRole?' selected':''}>${esc(rl)}</option>`).join('')}</select></div>
      <div class="field"><label for="add-crew-person">Munkatárs</label><select class="inp" id="add-crew-person"><option value="">Munkatárs kiválasztása…</option>${fit.length?`<optgroup label="${esc(selRole)}">${fit.map(opt).join('')}</optgroup>`:''}${rest.length?`<optgroup label="Egyéb munkatársak">${rest.map(opt).join('')}</optgroup>`:''}</select></div></div>`;})():`<p class="hint">Előbb vegyél fel munkatársakat a <button class="linkbtn" type="button" data-action="tab" data-tab="stab">Stáb</button> fülön.</p>`}</div>`}</div>
    ${commonRows||rentalsOf(p,'').length||(!ro()&&ids.length===0)?`<div class="pcrew pcrew-common" data-eq-drop=""${EL?' inert':''}><div class="pcrew-top"><div class="who"><b>Közös eszközök</b><small>Még nincs felelőshöz rendelve</small></div></div><div class="pcrew-eq">${commonRows}${rentalsOf(p,'').map(r=>`<div class="eqrow rent"><div class="who"><b>${esc(r.name)}</b><small>${r.own?'Saját eszköz':'Bérelt'}${r.company?' · '+esc(r.company):''}${canSeeFees()&&num(r.price)?' · '+ftFmt(r.price):''}</small></div>${ro()?'':`<button class="trash" type="button" data-action="rent-remove" data-id="${esc(r.id)}" aria-label="Bérelt eszköz törlése">🗑️</button>`}</div>`).join('')}${eqAddRow(p,'',opts)}</div></div>`:''}
    ${!S.inventory.length&&!ro()?`<p class="hint">Eszközt a <button class="linkbtn" type="button" data-action="tab" data-tab="leltar">Leltár</button> fülön tudsz felvenni.</p>`:''}
    ${ro()?'':crewFinalBox(p,ids)}
    ${p.listSentAt?`<p class="hint">Eszközlista kiküldve: ${esc(p.listSentAt)} · ${esc(p.listSentTo||'')}</p>`:''}`;
  if(inner)return {body,aside};
  return `<div class="panel"><h3>👥 Stáb és eszközök <span class="aside">${aside}</span></h3>${body}</div>`;
}
/* Szakember nézet: csak a kiválasztott (pipált / nem nulla) tételek látszanak, üres panel nem jelenik meg. */
function roList(items){return `<ul class="ro-list">${items.map(t=>`<li>${t}</li>`).join('')}</ul>`;}
function roTechPanel(p){
  const items=TECH.filter(t=>p[t.k]).map(t=>esc(t.label)),plan=String(p.techPlan||'').trim();
  if(!items.length&&!plan)return '';
  return `<div class="panel"><h3>💡 Hang-, fény- és vizuáltechnika</h3>${items.length?roList(items):''}${plan?`<div class="sec-lbl">Forgatási és technikai terv</div><div class="ro-text">${esc(plan)}</div>`:''}</div>`;
}
/* a projekten kért videós / átadandó szolgáltatások (Átadás ablak, vágó nézete) */
/* Átadandó anyagok: a drónos, timelapse és POV felvétel nem önálló átadandó – csak nyersanyag az utómunkázott videókhoz */
function deliverItems(p){
  const items=[];
  DELIVERABLES.forEach(it=>{const n=num(p[it.k]);if(n>0)items.push(`${esc(it.label)}: <b>${n}</b>`);});
  if(p.er_post&&!num(p.er_post_n))items.push('<b>1</b> helyszín előadásainak utómunkája');
  REC_COUNTS.filter(it=>it.k!=='er_rooms'&&num(p[it.k])>0).forEach(it=>items.push(it.k==='er_post_n'?`<b>${num(p[it.k])}</b> helyszín előadásainak utómunkája`:`${esc(it.label)}: <b>${num(p[it.k])}</b>`));
  if(num(p.foto_db)>0)items.push(`Fotók utómunkája: <b>${num(p.foto_db)}</b> db`);
  ['x_nyersVetel','x_nyersTarolas','x_rush'].forEach(k=>{const e=EXTRAS.find(x=>x.k===k);if(e&&p[k])items.push(esc(e.label));});
  return items;
}
/* Videónkénti vágói követés: a megrendelt darabszámokból sorok (háttér hozza létre); a vezető a vágót és az állapotot, a vágó a saját videóinak vágási állapotát állítja */
const VID_ST=[['vagasra','Utómunkára vár'],['vagas','Utómunka alatt'],['ellen','Belső ellenőrzés'],['leadva','Jóváhagyásra vár'],['jovahagyva','Jóváhagyva'],['modositas','Módosítást kér']];
const VID_CLS={vagasra:'p-mute',vagas:'p-warn',ellen:'p-warn',leadva:'p-ok',jovahagyva:'p-ok',modositas:'p-bad'};
/* ===== Vágás – Trello-szerű tábla: videónként egy kártya, oszloponként az állapotok; húzással (vagy a → gombbal) léptethető ===== */
/* Ügyfél jóváhagyására vár: megnyitotta-e már a levélben kapott linket */
function seenPill(v){if(!v||v.st!=='leadva'||ro()||!(isAdmin()||(S.me&&S.me.role==='editor'))||!(v.cm||[]).some(x=>/Ügyfélnek elküldve/.test(x.t||'')))return '';const f=x=>String(x||'').slice(0,16).replace('T',' ').replace(/^\d{4}-(\d\d)-(\d\d)/,(m,a,b)=>['Jan.','Febr.','Márc.','Ápr.','Máj.','Jún.','Júl.','Aug.','Szept.','Okt.','Nov.','Dec.'][+a-1]+' '+(+b)+'.');
  const seen=v.seenAt&&String(v.seenLast||v.seenAt).slice(0,10)>=String(v.at||'').slice(0,10);   // a korábbi (pl. V1) megnyitás az újbóli leadás után már nem számít
  return seen?`<span class="bd-seen on" data-tip="${esc('A jóváhagyó oldalt megnyitották\nElőször: '+f(v.seenAt)+(v.seenN>1?'\nUtoljára: '+f(v.seenLast)+' · összesen '+v.seenN+'×':''))}">👁️ Megnyitották · ${esc(f(v.seenAt))}</span>`:`<span class="bd-seen" data-tip="${v.seenAt?'Az újbóli leadás óta még nem nyitották meg (korábban: '+esc(f(v.seenAt))+')':'A levélben kapott linket még nem nyitották meg'}">✉️ Még nem nyitották meg</span>`;}
const BOARD_COLS=[['modositas','🔁 Módosítást kér'],['vagasra','Utómunkára vár'],['vagas','✂️ Utómunka alatt'],['ellen','🔍 Belső ellenőrzés'],['leadva','📤 Jóváhagyásra vár'],['jovahagyva','✅ Jóváhagyva']];
const boardMe=()=>ro()?((S.me.viewAs&&S.me.viewAs.crewId)||S.me.crewId):'';
const vidOwner=(p,v)=>v.editor||(()=>{const c=(p.crew||[]).filter(a=>a.role==='Vágó').map(a=>a.crewId);return c.length===1?c[0]:'';})();   // egy vágónál a gazdátlan videó az övé
function boardCards(){const me=boardMe(),f=S.boardCut||'';const out=[];
  S.projects.forEach(p=>{if(p.status==='lemondva'||p.status==='atadva'||!Array.isArray(p.videos))return;p.videos.forEach(v=>{const ow=vidOwner(p,v);if(me&&ow!==me)return;if(!me&&f&&ow!==f)return;out.push({p,v,ow});});});
  return out;}
const boardForMe=()=>{const me=boardMe();return !!me&&S.projects.some(p=>Array.isArray(p.videos)&&p.videos.some(v=>vidOwner(p,v)===me));};
/* Sávos tábla: soronként egy projekt (határidő szerint, mint az idővonalon), oszloponként a vágás állapotai */
function boardLanes(cards,opt){opt=opt||{};const mgr=!ro()&&(isAdmin()||(S.me&&S.me.role==='editor')),T=todayISO();
  const showMod=cards.some(c=>c.v.st==='modositas'),COLS=BOARD_COLS.filter(([k])=>k!=='modositas'||showMod);
  const canMove=(c,to)=>{if(c.p.status==='atadva'||c.v.st==='jovahagyva')return false;   /* jóváhagyott videó nem mozdítható */if(mgr)return true;return ['vagas','ellen'].includes(to)&&!['jovahagyva','leadva'].includes(c.v.st)&&!(c.v.st==='ellen'&&to!=='ellen');};   // a vágó csak „Utómunka alatt” és „Belső ellenőrzés” oszlopba húzhat; az ügyfél-jóváhagyásba csak ügyvezető / termelési vezető
  const nextOf=st=>({modositas:'vagas',vagasra:'vagas',vagas:'ellen',ellen:mgr?'leadva':''})[st]||'';
  const card=c=>{const nx=nextOf(c.v.st),nl=nx?(BOARD_COLS.find(x=>x[0]===nx)||[])[1]:'',drag=canMove(c,nx||c.v.st);
    return `<div class="bd-card st-${esc(c.v.st)}${c.v.link?' has-link':''}"${drag?' draggable="true"':''} data-action="vid-view" data-pid="${esc(c.p.id)}" data-vid="${esc(c.v.id)}" data-bd-pid="${esc(c.p.id)}" data-bd-vid="${esc(c.v.id)}" data-bd-st="${esc(c.v.st)}"><div class="bd-t">${esc(c.v.name)}</div>${seenPill(c.v)}${c.v.link||(c.v.cm||[]).length?`<span class="bd-link">${c.v.link?'▶ videó':''}${(c.v.st==='modositas'||c.v.st==='vagas')&&c.v.fb?' · ↩ javítandó':''}${(c.v.cm||[]).length?`${c.v.link?' · ':''}💬 ${c.v.cm.length}`:''}</span>`:'<span class="bd-link bd-ph" aria-hidden="true">&nbsp;</span>'}
      ${mgr||nx?`<div class="bd-m">${mgr?`<span class="bd-who">${esc((crewById(c.ow)||{}).name||'— nincs vágó —')}</span>`:''}${nx&&canMove(c,nx)?`<button type="button" class="bd-next" data-action="bd-move" data-pid="${esc(c.p.id)}" data-vid="${esc(c.v.id)}" data-st="${nx}" title="Tovább: ${esc(nl.replace(/^\S+\s/,''))}">→</button>`:''}</div>`:''}</div>`;};
  const byP=new Map();cards.forEach(c=>{if(!byP.has(c.p.id))byP.set(c.p.id,{p:c.p,L:[]});byP.get(c.p.id).L.push(c);});
  const lanes=[...byP.values()].sort((a,b)=>String(dueDate(a.p)||'9999').localeCompare(String(dueDate(b.p)||'9999')));
  const lane=({p,L})=>{const due=dueDate(p),di=dueInfo(p),done=L.filter(c=>c.v.st==='leadva'||c.v.st==='jovahagyva').length;
    const q=pr(p),st=q?addDays(q.end,1):T,tot=due&&validISO(st)?Math.max(1,diffDays(st,due)+1):0,left=due?diffDays(T,due):null;let pct=tot?Math.max(0,Math.min(100,Math.round((1-Math.max(0,left)/tot)*100))):0;
    let tone=left==null?'':left<0?'bad':left<=1?'bad':left<=3?'warn':'ok';
    if(L.length&&done===L.length){pct=100;tone='ok';}   // minden videó leadva: a sáv végigér és zöld
    const lbl=`${opt.noLink?`<b>${esc(p.name||'Névtelen projekt')}</b>`:`<button type="button" class="linkbtn bl-nm" data-action="open-project" data-id="${esc(p.id)}">${esc(p.name||'Névtelen projekt')}</button>`}
        <div class="bl-sub">${di?`<span class="statuspill p-${di.cls}">${esc(di.txt)}</span>`:''}<span class="bl-cnt">${done}/${L.length} leadva</span></div>${tot?`<div class="bl-clock ${tone}" title="Határidő: ${esc(fmtDay(due))}"><i style="width:${pct}%"></i></div>`:''}`;if(opt.single)opt.headLbl=`<div class="bl-sub">${di?`<span class="statuspill p-${di.cls}">${esc(di.txt)}</span>`:''}<span class="bl-cnt">${done}/${L.length} leadva</span></div>${tot?`<div class="bl-clock ${tone}" title="Határidő: ${esc(fmtDay(due))}"><i style="width:${pct}%"></i></div>`:''}`;
    return `<div class="bl-row" data-bl-pid="${esc(p.id)}"><div class="bl-lbl${opt.single?' bl-empty':''}">${opt.single?'':lbl}</div>
      ${COLS.map(([k])=>`<div class="bl-cell c-${k}" data-bd-col="${k}" data-bd-lane="${esc(p.id)}">${L.filter(c=>c.v.st===k).map(card).join('')}</div>`).join('')}</div>`;};
  const body=lanes.map(lane).join('');   /* egyetlen projekt (videótábla ablak): a projekt kártyája a fejléc sorába kerül */
  return `<div class="bl${opt.single?' bl-single':''}" style="--bl-n:${COLS.length}"><div class="bl-row bl-head"><div class="bl-lbl${opt.headLbl?' bl-hl':''}">${opt.headLbl||''}</div>${COLS.map(([k,l])=>{const n=cards.filter(c=>c.v.st===k).length;return `<div class="bl-h c-${k}"><span class="bl-ht" title="${esc(String(l).replace(/<[^>]+>/g,''))}">${l}</span><span class="bd-n">${n}</span>${n>1&&k!=='vagas'&&k!=='vagasra'&&cards.filter(c=>c.v.st===k&&c.v.link).length>1?`<button type="button" class="bl-play" data-action="bd-col-play" data-col="${k}" title="Átnézés: az oszlop videói egymás után" aria-label="Átnézés">▶</button>`:''}${n>1&&!opt.noSel?`<button type="button" class="bl-play bl-selall" data-action="bd-col-sel" data-col="${k}" title="Mind kijelölése (csoportos húzáshoz)" aria-label="Mind kijelölése">☑</button>`:''}</div>`;}).join('')}</div>${body}</div>`;}
function viewCutBoard(){const me=boardMe(),mgr=!ro()&&(isAdmin()||(S.me&&S.me.role==='editor')),cards=boardCards();
  const cutters=mgr?(S.crew||[]).filter(c=>S.projects.some(p=>Array.isArray(p.videos)&&p.videos.some(v=>vidOwner(p,v)===c.id))).sort((a,b)=>String(a.name).localeCompare(String(b.name),'hu')):[];
  const filt=mgr?`<select class="inp" id="bd-cut" style="width:auto" data-cmb="Vágó szerint…" data-cmb-hover="1"><option value="__all"${S.boardCut?'':' selected'}>Minden vágó</option>${cutters.map(c=>`<option value="${esc(c.id)}"${S.boardCut===c.id?' selected':''}>${esc(c.name)}</option>`).join('')}</select>`:'';
  return `<div class="page-head"><div class="grow"><h2>Vágás</h2><p class="sub">${me?'A saját videóid':'Videók állapot szerint'}, projektenként a határidő sorrendjében · húzd át a kártyát a projekt sorában, vagy nyomd meg a → gombot</p></div>${filt}</div>
    ${cards.length?boardLanes(cards):`<div class="panel">${empty(me?'Most nincs vágandó videód.':'Nincs vágás alatt lévő videó.')}</div>`}`;}
/* Idővonal: a vágássáv alján a videók állapota színes szakaszokban */
const VPROG_ORDER=['jovahagyva','leadva','ellen','vagas','vagasra','modositas'];
function vidProg(p){const vs=(Array.isArray(p.videos)?p.videos:[]).filter(v=>!ro()||vidOwner(p,v)===boardMe());if(!vs.length)return null;
  const n=k=>vs.filter(v=>v.st===k).length,segs=VPROG_ORDER.map(k=>[k,n(k)]).filter(x=>x[1]);
  return {done:n('leadva')+n('jovahagyva'),ok:n('jovahagyva'),tot:vs.length,html:`<span class="tl-prog">${segs.map(([k,c])=>`<i class="vp-${k}" style="flex:${c}"></i>`).join('')}</span>`,tip:'\n\n🎞️ Videók állapota:\n'+VID_ST.filter(([k])=>n(k)).map(([k,l])=>'• '+l+': '+n(k)).join('\n')};}
function videosPanel(p){const vs=Array.isArray(p.videos)?p.videos:[];if(!vs.length||ro())return '';   // szakembernél nem kell (az Utómunka panel már mutatja)
  const mgr=!ro()&&(isAdmin()||(S.me&&S.me.role==='editor')),me=S.me&&S.me.crewId,lock=projLocked()||p.status==='atadva'||p.status==='lemondva';
  const done=vs.filter(v=>v.st==='leadva'||v.st==='jovahagyva').length,appr=vs.filter(v=>v.st==='jovahagyva').length;
  const cutters=(S.crew||[]).filter(c=>(c.roles||[]).includes('Vágó')||(p.crew||[]).some(a=>a.crewId===c.id&&a.role==='Vágó')).sort((a,b)=>String(a.name).localeCompare(String(b.name),'hu'));
  const rows=vs.map(v=>{const own=!v.editor||v.editor===me,canSt=!lock&&(mgr||(own&&v.st!=='jovahagyva'&&v.st!=='modositas')),stOpts=(mgr?VID_ST:VID_ST.slice(0,4)).map(([k,l])=>`<option value="${k}"${k===v.st?' selected':''}>${l}</option>`).join('');
    const ed=mgr&&!lock?`<select class="inp" data-vid-ed="${esc(v.id)}" data-cmb="Vágó…"><option value="">— nincs vágó —</option>${cutters.map(c=>`<option value="${esc(c.id)}"${c.id===v.editor?' selected':''}>${esc(c.name)}</option>`).join('')}</select>`:`<span>${esc((crewById(v.editor)||{}).name||'—')}</span>`;
    const stl=(VID_ST.find(x=>x[0]===v.st)||[,'Utómunkára vár'])[1],okv=v.st==='jovahagyva';
    return `<div class="vid-row vr-${esc(v.st||'vagasra')}"><button type="button" class="vid-n" data-action="${v.link?'vid-view':'bd-lane'}" data-pid="${esc(p.id)}" data-vid="${esc(v.id)}" data-id="${esc(p.id)}">${v.link?'▶':'🎞️'} ${esc(v.name)}</button><span class="vid-st">${okv?'<span class="tl-ok">✓</span> ':''}${esc(stl)}</span>${mgr?`<span class="vid-ed">${ed}</span>`:v.editor?`<span class="vid-ed muted">✂️ ${esc((crewById(v.editor)||{}).name||'')}</span>`:''}</div>`;}).join('');
  const pct=vs.length?Math.round(done/vs.length*100):0;
  return `<section class="panel content vid-panel" id="proj-videos"><div class="vp-head"><h3>🎞️ Videók</h3><span class="vp-prog" title="${done}/${vs.length} leadva"><i style="width:${pct}%"></i></span><span class="vp-cnt">${done}/${vs.length} leadva${appr?` · ${appr} ✓`:''}</span><span class="vp-btns"><button type="button" class="btn outline small" data-action="bd-lane" data-id="${esc(p.id)}">📋 Videótábla</button><button type="button" class="btn outline small" data-action="proj-tl" data-id="${esc(p.id)}">🗓️ Idővonal</button></span></div>${typeof pnBox==='function'?pnBox(p.id):''}<div class="vid-list">${rows}</div></section>`;}
function roContentPanel(p){
  // a szakember ezt a részt nem látja – kivéve a vágót, aki a kért vágnivaló anyagokat igen
  const me=S.me&&S.me.crewId,isEditor=me&&(p.crew||[]).some(a=>a.crewId===me&&a.role==='Vágó');
  if(!isEditor)return '';
  const mine=taskKeysOf(p,me),tasks=postTasks(p).filter(t=>mine.includes(t.k));
  const rows=tasks.map(t=>`<div class="op-row"><span class="op-n">${t.n}${t.k==='foto_db'?' db':'×'}</span><span class="op-l">${esc(t.label)}</span></div>`);
  if(rows.length&&p.x_rush)rows.push(`<div class="op-row"><span class="op-n">⚡</span><span class="op-l">Villámgyors kézbesítés</span></div>`);
  // terepi felvételek: miből dolgozhat a vágó (kamerák, interjúk, kreatív felvételek, fotó)
  const field=[];recRoomsOf(p).forEach((r,i)=>{const cs=roomCams(r);if(cs.length)field.push(`<b>${esc(roomName(r,i))}</b>: `+cs.map(c=>esc(c.label)+(num(r[c.k])>1?' ×'+num(r[c.k]):'')).join(', '));});
  if(p.er_creative)field.push('Kreatív kamera'+(camN(p,'er_creative')>1?' ×'+camN(p,'er_creative'):''));
  INT_FLAGS.forEach(c=>{if(p[c.k])field.push(esc(c.label));});
  EXTRAS.filter(e=>!['x_foto','x_rush','x_nyersTarolas','x_nyersVetel'].includes(e.k)&&p[e.k]).forEach(e=>field.push(esc(e.label)));
  if(fotoN(p)>0)field.push('Fotós a helyszínen'+(fotoN(p)>1?' ×'+fotoN(p):''));
  REC_LIVE.forEach(c=>{if(p[c.k])field.push(esc(c.label));});
  const due=dueDate(p),di=due?dueInfo(p):null,r=pr(p);
  const dueHtml=due?`<div class="cut-due${di&&di.cls!=='ok'?' late':''}"><span>📅 Videók leadási határideje</span><b>${esc(fmtDay(due))}</b>${cutLeft(p)&&p.status!=='atadva'?`<span class="cd-left">⏳ ${esc(cutLeft(p).txt)}</span>`:''}</div>`:'';
  return `<div class="panel content"><h3>✂️ Utómunka</h3>${dueHtml}<div class="cut-grid">
    ${editOnly(p)?'':`<section><h4 class="sub-h">📍 Terepi felvételek</h4>${field.length?roList(field):'<p class="hint" style="margin:0">Nincs megadva terepi felvétel.</p>'}${r?`<p class="hint" style="margin:8px 0 0">Forgatás: ${esc(fmtRange(p))}</p>`:''}</section>`}
    <section><h4 class="sub-h">✂️ Utómunka anyagok</h4>${rows.length?`<div class="op-list">${rows.join('')}</div>`:`<p class="hint" style="margin:0">${postTasks(p).length?'Ehhez a projekthez még nincs hozzád rendelt utómunka.':'Ehhez a projekthez nincs megrendelt utómunka.'}</p>`}</section></div></div>${videosPanel(p)}`;

  const rooms=Math.max(1,num(p.er_rooms)||1),rec=[];
  REC_CAMS.forEach(c=>{if(p[c.k])rec.push(esc(c.label)+(camN(p,c.k)>1&&CAM_COUNTS.some(x=>x.flag===c.k)?' ×'+camN(p,c.k):''));});
  REC_LIVE.forEach(c=>{if(p[c.k])rec.push(esc(c.label));});
  if(p.er_post&&!num(p.er_post_n))rec.push('<b>1</b> helyszín előadásainak utómunkája');
  REC_COUNTS.filter(it=>it.k!=='er_rooms'&&num(p[it.k])>0).forEach(it=>rec.push(it.k==='er_post_n'?`<b>${num(p[it.k])}</b> helyszín előadásainak utómunkája`:`${esc(it.label)}: <b>${num(p[it.k])}</b>`));
  if(rec.length&&rooms>1)rec.unshift(`Rögzített helyszínek száma: <b>${rooms}</b>`);
  const krea=[];
  DELIVERABLES.forEach(it=>{const n=num(p[it.k]);if(n>0)krea.push(`${esc(it.label)}: <b>${n}</b>`);if(it.k==='aftermovie'&&fotoDb(p)>0)krea.push(`Fotók utómunkája: <b>${fotoDb(p)} db</b>`);});
  EXTRAS.filter(e=>e.k!=='x_foto'&&e.k!=='x_nyersTarolas'&&p[e.k]).forEach(e=>krea.push(esc(e.label)));
  const tech=TECH.filter(t=>p[t.k]).map(t=>esc(t.label)),plan=String(p.techPlan||'').trim();
  if(!rec.length&&!krea.length&&!tech.length&&!plan)return '';
  const techHtml=tech.length||plan?`<div class="tech-sec"><h4 class="sub-h">💡 Hang-, fény- és vizuáltechnika</h4>${tech.length?roList(tech):''}${plan?`<div class="sec-lbl">Forgatási és technikai terv</div><div class="ro-text">${esc(plan)}</div>`:''}</div>`:'';
  const col=(t,items)=>items.length?`<section class="content-col"><h4 class="sub-h">${t}</h4>${roList(items)}</section>`:'';
  return `<div class="panel content"><h3>🧾 Szolgáltatások</h3>${rec.length||krea.length?`<div class="content-grid${rec.length&&krea.length?'':' single'}">${col('📽️ Előadásrögzítés és kivetítés',rec)}${col('🎬 Kreatív tartalmak',krea)}</div>`:''}${techHtml}</div>`;
}
/* Tartalmak témánként: minden téma egy kártya – bal oldalt a helyszíni feladat, jobb oldalt a hozzá tartozó utómunka.
   Csak a kiválasztott tételek látszanak, a többi a „+ hozzáadás” alatt; a csukott kártya fejlécében címkéken az összefoglaló. */
/* Felelős választó egy kiválasztott szolgáltatáshoz: terepi feladat → szakember(ek), utómunka → egy vágó. A választott ember a szereppel a stábba is bekerül. */
/* Zárolt (véglegesített) csapatnál a név / „nincs beosztva” gomb: kattintásra a „Csapat módosítása”, utána rögtön lenyílik a választó */
function svcUnlockBtn(p,attr,txt,none){const can=!ro()&&!projLocked()&&!crewPast(p)&&!!S.draft&&S.draft.id===p.id&&crewLocked(p);
  return can?`<button type="button" class="op-cut op-unl${none?' none':''}" data-action="svc-unlock" ${attr} data-tip="A csapat véglegesítve van – kattints a módosításhoz">${esc(txt)} ▾</button>`:`<span class="op-cut${none?' none':''}">${esc(txt)}</span>`;}
function svcCan(p){return !ro()&&!projLocked()&&!crewLocked(p)&&!!S.draft&&S.draft.id===p.id;}
function fieldAsg(p,k,role,label,n,only){const ids=slotOwners(p,k),nm=id=>(crewById(id)||{}).name||'?',slots=Math.max(1,n||1,ids.length);   // annyi választó, ahány ember kell (pl. 2 kamera → 2 operatőr)
  if(!svcCan(p))return svcUnlockBtn(p,`data-pick="f:${esc(k)}"`,ids.length?'👥 '+ids.map(nm).join(', '):'👥 nincs beosztva',!ids.length);
  const all=(S.crew||[]).slice().sort((x,y)=>prioNum(x)-prioNum(y)||x.name.localeCompare(y.name,'hu'));
  const sel=i=>{const cur=ids[i]||'',free=all.filter(c=>c.id===cur||!ids.includes(c.id)),strict=k==='x_vago'||k==='x_foto',fit=free.filter(c=>(c.roles||[]).includes(role)||(strict&&c.id===cur)),rest=strict?[]:free.filter(c=>!(c.roles||[]).includes(role)),o=c=>`<option value="${esc(c.id)}"${c.id===cur?' selected':''}>${esc(c.name)}</option>`;
    const ph='👥 '+role.toLowerCase()+(/_op$/.test(k)?'':' kiválasztása');
    return `<select class="inp op-cutsel${cur?'':' none'}" data-cmb="${esc(ph)}" data-cmb-sub="crew" data-cmb-cls="op-cutsel${cur?'':' none'}" data-os-slot="${esc(k)}" data-i="${i}" data-role="${esc(role)}" data-label="${esc(label)}" aria-label="${esc(label)}: ${esc(role.toLowerCase())}"><option value=""${cur?' data-keep="1"':''}>${cur?'— senki (levétel) —':esc(ph)}</option>${fit.length?`<optgroup label="${esc(role)}">${fit.map(o).join('')}</optgroup>`:''}${rest.length?`<optgroup label="Egyéb munkatársak">${rest.map(o).join('')}</optgroup>`:''}</select>`;};
  if(only!=null)return sel(only);   // egyetlen választó (pl. a 2. kreatív kamera saját sorában)
  return Array.from({length:slots},(_,i)=>sel(i)).join('');}
function cutAsg(p,k){const o=taskOwners(p,k),cutters=cutterIds(p),FO=k==='foto_db',rl=FO?['Fotós']:['Vágó'];   // a fotók utómunkáját csak fotós végezheti
  if(!svcCan(p))return svcUnlockBtn(p,`data-pick="c:${esc(k)}"`,o.length?(k==='foto_db'?'📷 ':'✂️ ')+o.map(id=>(crewById(id)||{}).name||'?').join(', '):(k==='foto_db'?'📷 nincs fotós':'✂️ nincs vágóhoz rendelve'),!o.length);
  const all=(S.crew||[]).filter(c=>(c.roles||[]).some(r=>rl.includes(r))||(!FO&&cutters.includes(c.id))||o.includes(c.id)).sort((x,y)=>prioNum(x)-prioNum(y)||x.name.localeCompare(y.name,'hu'));
  const ic=FO?'📷':'✂️',ph=ic+(FO?' fotós kiválasztása':' vágó kiválasztása');
  return `<select class="inp op-cutsel${o.length?'':' none'}" data-cmb="${ph}" data-cmb-sub="crew" data-cmb-cls="op-cutsel${o.length?'':' none'}" data-os-cut="${k}" aria-label="${FO?'Fotós':'Vágó'}"><option value="">${ph}</option>${all.map(c=>`<option value="${esc(c.id)}"${o[0]===c.id?' selected':''}>${ic} ${esc(c.name)}</option>`).join('')}</select>`;}
/* mai projektek kerete: a táblázat fölé rajzolt réteg, így a táblázat elrendezése nem változik */
function ptFrames(){document.querySelectorAll('.pt-tf-ov').forEach(e=>e.remove());let pill=true;
  document.querySelectorAll('#view tr.pt-tf-first').forEach(a=>{const tb=a.closest('table'),w=tb&&tb.parentElement;if(!w)return;let b=a;while(b&&!b.classList.contains('pt-tf-last')){b=b.nextElementSibling;}if(!b)b=a;
    w.classList.add('pt-has-tf');const wr=w.getBoundingClientRect(),ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect(),tr=tb.getBoundingClientRect();
    const o=document.createElement('div');o.className='pt-tf-ov';o.style.cssText=`left:${w.scrollLeft-w.clientLeft}px;top:${ra.top-wr.top-w.clientTop+w.scrollTop}px;width:${w.offsetWidth}px;height:${rb.bottom-ra.top}px`;
    if(pill){pill=false;o.innerHTML=`<span class="pt-tf-pill">📍 Ma · ${esc(fmtDay(todayISO()))} · <span class="pt-clock">${nowHM()}</span></span>`;}w.appendChild(o);});}
window.addEventListener('resize',()=>{clearTimeout(window._ptfT);window._ptfT=setTimeout(()=>{if(document.querySelector('#view tr.pt-tf-first'))ptFrames();},120);});
/* a „Ma” sávon a pontos idő, percenként frissül */
function nowHM(){const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
setInterval(()=>document.querySelectorAll('.pt-clock').forEach(e=>{e.textContent=nowHM();}),15000);
function topicCards(p,{camRow,dlRow,D}){
  const tgl=(k,label)=>`<label class="toggle"><input type="checkbox" data-flag="${k}"${p[k]?' checked':''}${D()}><span class="tl">${esc(label)}</span></label>`;
  const recCnt=it=>{const n=num(p[it.k]);return `<div class="dl${n>it.min?' on':''}"><div><div class="dl-name">${it.label}</div></div>
    <div class="stepper"><button type="button" data-action="rec-step" data-k="${it.k}" data-d="-1" aria-label="${it.label}: kevesebb"${n<=it.min||ro()?' disabled':''}>−</button><input class="step-in" type="text" inputmode="numeric" pattern="[0-9]*" data-step-k="${it.k}" data-min="${it.min}" data-max="${it.max}" aria-label="${it.label} (db)" value="${n}"${D()}><button type="button" data-action="rec-step" data-k="${it.k}" data-d="1" aria-label="${it.label}: több"${n>=it.max||ro()?' disabled':''}>+</button></div></div>`;};
  const A=(it,asg)=>{if(!it.on||!asg)return it;const a=`<div class="tc-asg">${asg}</div>`,h=it.html,i=h.lastIndexOf('<div class="stepper');   // kiválasztva: név · felelős · darabszám egy sorban
    return Object.assign({},it,{html:i>=0?h.slice(0,i)+a+h.slice(i):`<div class="tc-line">${h}${a}</div>`});};
  const OP='Operatőr',F=(it,k,role,label,n)=>A(it,fieldAsg(p,k,role,label,n)),C=(it,k)=>A(it,cutAsg(p,k));
  const cam=c=>{if(c.k==='er_creative'&&p[c.k]){const can=svcCan(p),own=slotOwners(p,c.k),nm=id=>(crewById(id)||{}).name||'?';   // kreatív kamera: minden kamera külön sor, saját operatőrrel; „+ kamera” új sort nyit
      const cc=CAM_COUNTS.find(x=>x.flag===c.k),n=camN(p,c.k),rows=Math.max(n,slotOwners(p,c.k).length),dis=!!D();
      const html=Array.from({length:rows},(_,i)=>`<div class="tc-line cam-multi">${i===0?tgl(c.k,c.label):`<span class="tl cam-n">${i+1}. ${esc(c.label.toLowerCase())}</span>`}<div class="tc-asg">${can?fieldAsg(p,c.k,OP,c.label,rows,i):i===0?fieldAsg(p,c.k,OP,c.label,rows):`<span class="op-cut${own[i]?'':' none'}">👥 ${esc(own[i]?nm(own[i]):'nincs beosztva')}</span>`}</div>${i>0&&i===rows-1&&cc&&!dis&&can?`<button class="x w" type="button" data-action="rec-step" data-k="${cc.k}" data-d="-1" title="Kamera levétele" aria-label="Kamera levétele">✕</button>`:''}</div>`).join('')
        +(cc&&!dis&&n<10?(can?`<button class="btn outline small cam-add" type="button" data-action="rec-step" data-k="${cc.k}" data-d="1">＋ Még egy kreatív kamera</button>`:''):'');
      return {on:true,html,chip:c.label+(n>1?' ×'+n:''),tg:1};}
    return F({on:!!p[c.k],html:camRow(c),chip:c.label+(camN(p,c.k)>1?' ×'+camN(p,c.k):''),tg:1},c.k,OP,c.label,camN(p,c.k));};
  const flag=(k,label,role)=>{const it={on:!!p[k],html:tgl(k,label),chip:label,tg:1};return role?F(it,k,role,label):it;};
  const cnt=it=>({on:num(p[it.k])>(it.min||0),html:recCnt(it),chip:it.label+' '+num(p[it.k])});
  const dlv=it=>({on:num(p[it.k])>0,html:dlRow(it),chip:it.label+' '+num(p[it.k])});
  const col=(key,title,items)=>{const L=items;   // minden lehetőség látszik egy egyszerű listában, állandó sorrendben; a kiválasztott sötét, félkövér
    return `<div class="tc"><div class="tc-h">${title}</div><div class="tc-list">${L.map(x=>x.html).join('')||'<p class="tc-none">—</p>'}</div></div>`;};
  const card=(key,title,items)=>{const n=items.reduce((s,x)=>s+(x.on?(x.cnt||1):0),0),open=FOLD[key]!=null?FOLD[key]:n>0;
    return `<details class="tcard${n?' has-sel':''}" data-fold="${key}"${open?' open':''}><summary><span class="tc-title">${title}</span><span class="aside">${n?`<span class="tc-cnt">✓ ${n} kiválasztva</span>`:'nincs kiválasztva'}</span></summary><div class="tc"><div class="tc-list">${items.map(x=>x.html).join('')}</div></div></details>`;};
  const rooms=(()=>{const n=num(p.er_rooms);return `<div class="dl rooms-row"><div><div class="dl-name">Rögzített helyszínek száma</div></div>
    <div class="stepper"><button type="button" data-action="rec-step" data-k="er_rooms" data-d="-1" aria-label="Helyszínek: kevesebb"${n<=0||ro()?' disabled':''}>−</button><input class="step-in" type="text" inputmode="numeric" pattern="[0-9]*" data-step-k="er_rooms" data-min="0" data-max="10" aria-label="Helyszínek száma" value="${n}"${D()}><button type="button" data-action="rec-step" data-k="er_rooms" data-d="1" aria-label="Helyszínek: több"${n>=10||ro()?' disabled':''}>+</button></div></div>`;})();
  // Előadásrögzítés termenként: név, kamerák (darabszámmal), és kameránként a beosztott operatőr
  const RR=recRoomsOf(p),dis=!!D();
  const roomBlk=(r,i)=>{const rows=ROOM_CAMS.map(c=>{const n=num(r[c.k]),on=n>0,mx=ROOM_CNT[c.k];
      const eqFor=only=>on&&ROOM_EQ[c.k]?(()=>{const SL=c.k==='er_slides',ids=roomEq(r,c.k),items=SL?slideItems():camItems(),usedHere=RR.flatMap(x=>ROOM_CAMS.filter(cc=>ROOM_EQ[cc.k]).flatMap(cc=>roomEq(x,cc.k)));
        return `<div class="room-eqs">${ids.map((id,j)=>{if(only&&!only.includes(j))return '';const cnt=usedHere.filter(x=>x===id).length;return `<span class="room-eq"><select class="inp room-cam-sel${id?'':' empty'}" data-cmb="${SL?'Válassz eszközt…':'Válassz kamerát…'}" data-cmb-cls="room-cam-sel${id?'':' empty'}" data-room-eq="${r.id}" data-k="${c.k}" data-i="${j}" aria-label="${c.label} ${j+1}. kamerája"${D()}><option value="">${SL?'Válassz eszközt (képkeverő, laptop…)':ids.length>1?(j+1)+'. kamera – válassz…':'Válassz kamerát…'}</option>${items.map(it=>{const busy=usedElsewhere(it.id,p),left=num(it.qty)-busy-usedHere.filter(x=>x===it.id&&x!==id).length;return `<option value="${esc(it.id)}"${it.id===id?' selected':''}>${esc(it.name)}${left<=0&&it.id!==id?' · ⚠️ nincs szabad':''}</option>`;}).join('')}</select>${SL?'':(()=>{const lid=roomLens(r,c.k)[j]||'',L=lensItems();return `<select class="inp room-cam-sel room-lens-sel${lid?'':' empty'}" data-cmb="Válassz objektívet…" data-cmb-cls="room-cam-sel room-lens-sel${lid?'':' empty'}" data-room-lens="${r.id}" data-k="${c.k}" data-i="${j}" aria-label="${c.label} ${j+1}. kamera objektívje"${D()}><option value="">Objektív…</option>${(()=>{const cam=id?S.inventory.find(x=>x.id===id):null;return L.map(it=>{const ok=lensFits(cam,it);return `<option value="${esc(it.id)}"${it.id===lid?' selected':''}${ok||it.id===lid?'':' disabled'}>${esc(it.name)}${ok?'':' – nem jó erre a vázra (crop)'}</option>`;}).join('');})()}</select>${(()=>{const cam=id?S.inventory.find(x=>x.id===id):null,ln=lid?S.inventory.find(x=>x.id===lid):null;return cam&&ln&&!lensFits(cam,ln)?'<span class="warn-txt" title="Crop objektív nem rakható Full Frame vázra">⚠️ Crop objektív Full Frame vázon</span>':'';})()}`;})()}${j>0&&!dis?`<button class="x w" type="button" data-action="room-eq-del" data-r="${r.id}" data-k="${c.k}" data-i="${j}" aria-label="Kamera levétele" title="Kamera levétele">×</button>`:''}${id&&cnt>Math.max(1,num((S.inventory.find(x=>x.id===id)||{}).qty))?'<span class="warn-txt" title="Ugyanez a kamera több helyen van kiválasztva, mint ahány darab van belőle">⚠️</span>':''}</span>`;}).join('')}${items.length?'':`<span class="hint" style="margin:0">${SL?'A leltárban nincs képkeverő / laptop / monitor.':'A leltárban nincs kamera.'}</span>`}</div>`;})():'',eqSel=eqFor(c.k==='er_close'?[0]:null);
      const st=eqSel||(on&&mx?`<div class="stepper cam-step"><button type="button" data-action="room-step" data-r="${r.id}" data-k="${c.k}" data-d="-1" aria-label="${c.label}: kevesebb"${n<=1||dis?' disabled':''}>−</button><input class="step-in room-in" type="text" inputmode="numeric" data-room-in="${r.id}" data-k="${c.k}" data-max="${mx}" aria-label="${c.label} száma" value="${n}"${D()}><button type="button" data-action="room-step" data-r="${r.id}" data-k="${c.k}" data-d="1" aria-label="${c.label}: több"${n>=mx||dis?' disabled':''}>+</button></div>`:'');
      const plus=c.k==='er_close'&&on&&!dis&&n<(ROOM_CNT[c.k]||1)?`<button class="cam-plus" type="button" data-action="room-eq-add" data-r="${r.id}" data-k="${c.k}" aria-label="Még egy közeli kamera" data-tip="Még egy közeli kamera (saját operatőrrel)">+</button>`:'';
      const extra=c.k==='er_close'&&on?roomEq(r,c.k).slice(1).map((_,x)=>{const j=x+1;return `<div class="cam-row has-eq cam-extra"><span class="cam-n">${j+1}. közeli kamera</span>${eqFor([j])}</div>`;}).join(''):'';
      return `<div class="cam-row${eqSel?' has-eq':''}"><label class="toggle"><input type="checkbox" data-room-cam="${r.id}" data-k="${c.k}"${on?' checked':''}${D()}><span class="tl">${c.label}</span></label>${plus}${st}</div>${extra}`;}).join('');
    const ops=roomOps(r),asg=ops?`<div class="room-ops"><span class="room-ops-l">${ops>1?ops+' operatőr':'Operatőr'}:</span><div class="tc-asg room-asg">${fieldAsg(p,r.id+'_op',OP,roomName(r,i)+' – operatőr',ops)}</div></div>`:'';   // a terem operatőrei a név után (ahány kamera, annyi)
    return `<div class="room-blk"><div class="room-h"><span class="room-no">${i+1}. Helyszín</span><input class="inp room-name" type="text" data-room-name="${r.id}" maxlength="60" value="${esc(r.name||'')}" placeholder="Név (nem kötelező)" aria-label="${i+1}. helyszín neve"${D()}>${asg}${dis?'':`<button class="x" type="button" data-action="room-del" data-r="${r.id}" title="Helyszín törlése" aria-label="${i+1}. helyszín törlése">✕</button>`}</div><div class="tc-list">${rows}</div></div>`;};
  const recL=[{on:RR.some(r=>roomCams(r).length),cnt:RR.reduce((s,r)=>s+roomCams(r).length,0),html:`<div class="rooms">${RR.map(roomBlk).join('')}${dis?'':`<button class="btn outline small room-add" type="button" data-action="room-add">＋ Új helyszín hozzáadása</button>`}</div>`}];
  const recR=REC_COUNTS.filter(it=>it.k!=='er_rooms').map(it=>C(cnt(it),it.k));
  const intL=INT_FLAGS.map(c=>flag(c.k,c.label,OP)),intR=DELIVERABLES.filter(it=>it.g==='int').map(it=>C(dlv(it),it.k));
  const krL=REC_CAMS.filter(c=>c.k==='er_creative').map(cam).concat(EXTRAS.filter(e=>!['x_nyersTarolas','x_foto','x_rush','x_nyersVetel'].includes(e.k)).map(e=>flag(e.k,e.label,e.role||OP))).concat(DELIVERABLES.filter(it=>/^short/.test(it.k)).map(it=>F(dlv(it),'rec_'+it.k,OP,it.label+' felvétele')));   // short videó készítés a kreatív videózásnál is (ugyanaz az adat, mint az Utómunkánál)
  const krR=DELIVERABLES.filter(it=>it.g!=='int').map(it=>C(dlv(it),it.k)).concat(p.x_rush?[flag('x_rush','Villámgyors kézbesítés')]:[]);   // a nyersanyag átadása utómunka, beosztás nélkül
  const foL=[F({on:fotoN(p)>0,html:stepRow(p,FOTO_COUNT),chip:'Fotós a helyszínen'+(fotoN(p)>1?' ×'+fotoN(p):'')},'x_foto','Fotós','Fotós a helyszínen',fotoN(p))],foR=[C({on:fotoDb(p)>0,html:fotoRow(p),chip:fotoDb(p)+' db fotó'},'foto_db')];
  const teL=TECH.map(t=>flag(t.k,t.label,t.role)).concat(REC_LIVE.map(c=>flag(c.k,c.label,c.role)));
  const due=needsDelivery(p)&&!editOnly(p)?(()=>{const r=pr(p),dd=dueDate(p),own=validISO(p.dueAt);return `<div class="due-row"><label for="f-dueAt">📅 Leadási határidő</label><input class="inp" id="f-dueAt" data-field="dueAt" type="date" value="${esc(dd||'')}"${r?` min="${esc(r.end)}"`:''}${ro()?' disabled':''}><span class="hint">${own?'egyedi határidő':noDefDue(p)?'nincs megadva – add meg a vágási határidőt':'alapértelmezett: a rendezvény utáni nap'}</span></div>`;})():'';
  return `${due}<div class="tc-cols${editOnly(p)?' tc-one':''}">${editOnly(p)?'':`<section><h4 class="sub-h">📍 Terepi feladatok</h4><div class="tcards">${card('t_rec','🎙️ Előadásrögzítés',recL)}${card('t_krea','🎥 Kreatív videózás',krL)}${card('t_int','🎤 Interjúk / imázsfilmek videózása',intL)}${card('t_foto','📷 Fotózás',foL)}${card('t_tech','💡 Vizuál-, hang- és fénytechnika',teL)}</div></section>`}
    <section><h4 class="sub-h">🎬 Utómunka</h4><div class="tcards">${card('p_rec','🎙️ Előadások',recR)}${card('p_int','🎤 Interjúk / imázsfilmek',intR)}${card('p_krea','🎞️ Kreatív tartalmak',krR)}${fotoN(p)>0?card('p_foto','📷 Fotók utómunkája',foR):''}${card('p_raw','📦 Nyersanyag',[flag('x_nyersVetel','Nyersanyag átadása')])}</div></section></div>`;   // a nyersanyag átadása külön kártya, beosztás nélkül   // terepi és utómunka külön: az utómunkában bármelyik felvétel felhasználható
}
/* Összesítő: mit rendelt az ügyfél (a tartalom-panel alján); az utómunkánál a felelős vágó is */
function orderSummary(p,bare){
  const T=[],can=!ro()&&!projLocked()&&!crewLocked(p)&&!!S.draft&&S.draft.id===p.id;
  const nm=id=>(crewById(id)||{}).name||'?';
  const fpick=(k,role,label,cur)=>{const all=(S.crew||[]).slice().sort((x,y)=>prioNum(x)-prioNum(y)||x.name.localeCompare(y.name,'hu')),fit=all.filter(c=>(c.roles||[]).includes(role)&&!cur.includes(c.id)),rest=all.filter(c=>!(c.roles||[]).includes(role)&&!cur.includes(c.id));
    return `<select class="inp op-cutsel add${cur.length?'':' none'}" data-os-field="${esc(k)}" data-role="${esc(role)}" data-label="${esc(label)}" aria-label="${esc(label)}: munkatárs"><option value="">${cur.length?'＋ még valaki':'👥 nincs beosztva'}</option>${cur.length?`<optgroup label="Levétel erről a feladatról">${cur.map(id=>`<option value="${esc(id)}">✕ ${esc(nm(id))}</option>`).join('')}</optgroup>`:''}${fit.length?`<optgroup label="${esc(role)}">${fit.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</optgroup>`:''}${rest.length?`<optgroup label="Egyéb munkatársak">${rest.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</optgroup>`:''}</select>`;};
  const row=(n,label,k,role)=>{const ids=k?fieldOwners(p,k):[];const tg=!k?'':can?fpick(k,role,label,ids):ids.length?`<span class="op-cut">👥 ${esc(ids.map(nm).join(', '))}</span>`:`<span class="op-cut none">👥 nincs beosztva</span>`;
    return `<div class="op-row"><span class="op-n">${n}</span><span class="op-l">${esc(label)}${ids.length?`<span class="op-names">👥 ${esc(ids.map(nm).join(', '))}</span>`:''}</span>${tg}</div>`;};   // minden terepi feladatnak saját felelőse
  const grp=(t,rows)=>{if(rows.length)T.push(`<div class="op-gh">${t}</div><div class="op-list">${rows.join('')}</div>`);};
  const OP='Operatőr',rooms=num(p.er_rooms),rec=[];if(rooms>1&&REC_CAMS.some(c=>c.k!=='er_creative'&&p[c.k]))rec.push(row(rooms+'×','Rögzített helyszín'));
  REC_CAMS.filter(c=>c.k!=='er_creative'&&p[c.k]).forEach(c=>rec.push(row((CAM_COUNTS.some(x=>x.flag===c.k)?camN(p,c.k):1)+'×',c.label,c.k,OP)));
  const kr=[];if(p.er_creative)kr.push(row(camN(p,'er_creative')+'×','Kreatív kamera','er_creative',OP));
  EXTRAS.filter(e=>!['x_foto','x_rush','x_nyersTarolas','x_nyersVetel'].includes(e.k)&&p[e.k]).forEach(e=>kr.push(row('✓',e.label,e.k,e.role||OP)));
  DELIVERABLES.filter(it=>/^short/.test(it.k)&&num(p[it.k])>0).forEach(it=>kr.push(row(num(p[it.k])+'×',it.label+' felvétele','rec_'+it.k,OP)));
  grp('🎙️ Előadásrögzítés',rec);grp('🎥 Kreatív videózás',kr);
  grp('🎤 Interjúk / imázsfilmek videózása',INT_FLAGS.filter(c=>p[c.k]).map(c=>row('✓',c.label,c.k,OP)));
  if(fotoN(p)>0)grp('📷 Fotózás',[row(fotoN(p)+'×','Fotós a helyszínen','x_foto','Fotós')]);
  grp('💡 Vizuál-, hang- és fénytechnika',TECH.filter(t=>p[t.k]).map(t=>row('✓',t.label,t.k,t.role)).concat(REC_LIVE.filter(c=>p[c.k]).map(c=>row('✓',c.label,c.k,c.role))));
  const cutters=cutterIds(p);
  const cutOf=k=>{const o=taskOwners(p,k);if(can){const all=(S.crew||[]).filter(c=>(c.roles||[]).includes('Vágó')||cutters.includes(c.id)).sort((x,y)=>prioNum(x)-prioNum(y)||x.name.localeCompare(y.name,'hu'));
      return `<select class="inp op-cutsel${o.length?'':' none'}" data-os-cut="${k}" aria-label="Vágó"><option value="">✂️ nincs vágóhoz rendelve</option>${all.map(c=>`<option value="${esc(c.id)}"${o[0]===c.id?' selected':''}>✂️ ${esc(c.name)}</option>`).join('')}</select>`;}
    return o.length?`<span class="op-cut">✂️ ${esc(o.map(id=>(crewById(id)||{}).name||'?').join(', '))}</span>`:`<span class="op-cut none">✂️ nincs vágóhoz rendelve</span>`;};
  const pRow=t=>`<div class="op-row"><span class="op-n">${t.n}${t.k==='foto_db'?' db':'×'}</span><span class="op-l">${esc(t.label)}</span>${cutOf(t.k)}</div>`;   // darab · anyag · vágó (itt is kiosztható)
  const PT=postTasks(p),intK=DELIVERABLES.filter(x=>x.g==='int').map(x=>x.k),kreK=DELIVERABLES.filter(x=>x.g!=='int').map(x=>x.k);
  const PG=[['🎙️ Előadások',PT.filter(t=>t.k==='er_post_n'||REC_COUNTS.some(x=>x.k===t.k))],['🎤 Interjúk / imázsfilmek',PT.filter(t=>intK.includes(t.k))],['🎞️ Kreatív tartalmak',PT.filter(t=>kreK.includes(t.k))],['📷 Fotók utómunkája',PT.filter(t=>t.k==='foto_db')]];
  const post=[];PG.forEach(([h,l])=>{if(l.length)post.push(`<div class="op-gh">${h}</div><div class="op-list">${l.map(pRow).join('')}</div>`);});
  {const ex=[];if(p.x_rush)ex.push(`<div class="op-row"><span class="op-n">⚡</span><span class="op-l">Villámgyors kézbesítés</span></div>`);if(p.x_nyersTarolas)ex.push(`<div class="op-row"><span class="op-n">🗄️</span><span class="op-l">Nyersanyag tárolása 5 évig</span></div>`);if(ex.length)post.push(`<div class="op-gh">➕ Egyéb</div><div class="op-list">${ex.join('')}</div>`);}
  const head=bare?'':'<h4 class="sub-h">📋 Projekt összesítő</h4>';
  if(!T.length&&!post.length)return `<div class="order-sum${bare?' bare':''}">${head}<p class="hint" style="margin:0">Még nincs kiválasztva semmi.</p></div>`;
  return `<div class="order-sum${bare?' bare':''}">${head}<div class="os-two"><section class="os-col"><h5 class="os-col-h">📍 Terepi munkák</h5>${T.length?`<div class="os-field">${T.join('')}</div>`:'<p class="hint" style="margin:0">Nincs terepi munka kiválasztva.</p>'}</section>
    <section class="os-col"><h5 class="os-col-h">🎬 Utómunka – átadandó anyagok</h5>${post.length?post.join(''):'<p class="hint" style="margin:0">Nincs utómunka kiválasztva.</p>'}</section></div>${can?'<p class="hint" style="margin:10px 0 0">A kiválasztott munkatársak automatikusan bekerülnek a Stáb és eszközök közé a megfelelő szereppel.</p>':''}</div>`;
}
/* Vágó kártyáján: mely munkákat készíti el */
/* a vágás sávjára mutatva: milyen videókat kell elkészíteni (a vágó csak a sajátjait látja) */
function cutWhat(p){const me=ro()&&S.me&&S.me.crewId,ts=postTasks(p).filter(t=>t.k!=='foto_db'||!me).filter(t=>!me||taskKeysOf(p,me).includes(t.k));if(!ts.length)return '';
  const multi=cutterIds(p).length>1&&!me,nm=id=>(crewById(id)||{}).name||'';
  return '🎬 Elkészítendő videók:\n'+ts.map(t=>'• '+(t.k==='er_post_n'?t.n+' helyszín előadásainak utómunkája':t.n+' db · '+t.label)+(multi&&taskOwners(p,t.k).length?' ('+taskOwners(p,t.k).map(nm).join(', ')+')':'')).join('\n')+'\n\n';}
function cutTasksBlock(p,cid){
  const tasks=postTasks(p).filter(t=>t.k!=='foto_db');if(!(p.crew||[]).some(a=>a.crewId===cid&&a.role==='Vágó'))return '';   // a fotók utómunkája a vágónál nem választható
  if(!tasks.length&&ro())return '';   // a szakember (vágó) nézetében nincs szervezői figyelmeztetés
  if(!tasks.length){const ri=(p.crew||[]).findIndex(a=>a.crewId===cid&&a.role==='Vágó');
    return `<div class="cut-tasks cut-none"><div class="ct-h">✂️ Elkészítendő munkák</div><p class="warn-txt" style="margin:0 0 6px"><b>⚠️ Vágó be van osztva, de nincs kiválasztva vágnivaló.</b> Jelöld be fent az Utómunkánál, mit kell elkészíteni – addig nem tudja, min dolgozik, és a leadási határidő sem számolható.</p>${ro()||crewLocked(p)?'':`<div class="btns"><button class="btn primary small" type="button" data-action="goto-post">🎬 Utómunka kiválasztása</button>${ri>=0?`<button class="btn outline small" type="button" data-action="crew-remove" data-i="${ri}">Vágó szerep levétele</button>`:''}</div>`}</div>`;}
  const mine=taskKeysOf(p,cid),implicit=!cutterIds(p).some(id=>Array.isArray(editTasksOf(p)[id]));
  if(ro())return mine.length?`<div class="cut-tasks"><div class="ct-h">✂️ Elkészítendő munkák</div><div class="ct-chips">${tasks.filter(t=>mine.includes(t.k)).map(t=>`<span class="day-chip ct-chip on">${esc(t.label)} · ${t.n} db</span>`).join('')}</div></div>`:'';
  const free=tasks.filter(t=>!taskOwners(p,t.k).length).length;
  return `<div class="cut-tasks"><div class="ct-h">✂️ Elkészítendő munkák${implicit&&mine.length?' <span class="muted">· egy vágó: minden az övé</span>':''}${free?` <span class="ct-free">⚠️ ${free} videó még nincs vágóhoz rendelve</span>`:''}</div><div class="ct-chips">${tasks.filter(t=>!taskOwners(p,t.k).some(x=>x!==cid)).map(t=>{const on=mine.includes(t.k),oth=[],nobody=!on;
    return `<button type="button" class="day-chip ct-chip${on?' on':''}${nobody?' free':''}${oth.length?' other':''}" data-action="cut-task" data-cid="${esc(cid)}" data-k="${t.k}" aria-pressed="${on}"${projLocked()||oth.length?' disabled':''} title="${on?'Ő vágja – kattints, ha mégsem':oth.length?esc(oth.map(id=>(crewById(id)||{}).name||'').join(', '))+' vágja – ha másnak adnád, előbb nála vedd le':'Még senki nem vágja – kattints, ha ő'}">${on?'✓ ':nobody?'⚠️ ':''}<span class="ct-lbl">${esc(t.label)}</span><span class="ct-n">· ${t.n} db</span>${oth.length?` <span class="ct-who">→ ${esc(oth.map(id=>huFirst(String((crewById(id)||{}).name||''))).join(', '))}</span>`:''}</button>`;}).join('')}</div></div>`;
}
/* Mi változott a véglegesítés (kiküldés) óta – emberi nyelven, munkatársanként */
function crewSigParse(sig){const [r,e,rt,d]=String(sig||'').split('|');return {roles:(r||'').split('+').filter(Boolean),eq:(e||'').split(',').filter(Boolean).map(x=>{const m=/^(.*)x(\d+)$/.exec(x);return m?{itemId:m[1],qty:Number(m[2])}:{itemId:x,qty:1};}),rent:(rt||'').split(',').filter(Boolean),days:(d||'').split(',').filter(Boolean)};}
function crewDiffHtml(p){const f=p.crewFinal;if(!f||!Array.isArray(f.ids))return '';const D=crewFinalDiff(p),nm=id=>(crewById(id)||{}).name||'Törölt munkatárs',L=[];
  D.added.forEach(id=>L.push(`<li>➕ <b>${esc(nm(id))}</b> új a csapatban</li>`));D.removed.forEach(id=>L.push(`<li>➖ <b>${esc(nm(id))}</b> lekerült</li>`));
  D.changed.forEach(id=>{const a=crewSigParse(f.sigs[id]),b=crewSigParse(crewSig(p,id)),parts=[];
    const rAdd=b.roles.filter(x=>!a.roles.includes(x)),rDel=a.roles.filter(x=>!b.roles.includes(x));if(rAdd.length)parts.push('új szerep: '+rAdd.join(', '));if(rDel.length)parts.push('levett szerep: '+rDel.join(', '));
    const en=e=>(itemById(e.itemId)||{}).name||'eszköz',ak=a.eq.map(e=>e.itemId+'x'+e.qty),bk=b.eq.map(e=>e.itemId+'x'+e.qty);const eAdd=b.eq.filter(e=>!ak.includes(e.itemId+'x'+e.qty)),eDel=a.eq.filter(e=>!bk.includes(e.itemId+'x'+e.qty));
    void eAdd;void eDel;if(a.days.join()!==b.days.join())parts.push('munkanapok változtak');   // az eszközök az eszközlistánál
    L.push(`<li>✏️ <b>${esc(nm(id))}</b>: ${esc(parts.join(' · ')||'módosult')}</li>`);});
  return L.length?`<ul class="cf-diff">${L.join('')}</ul>`:'';}
function viewProject(p){
  const c=calc(p),st=staffing(p),iss=computeIssues().filter(i=>i.pids.includes(p.id));
  const r=pr(p),T=todayISO(),di=dueInfo(p);
  const status=p.status||'tervezes',curIdx=STAGES.findIndex(s=>s.id===status);
  // átadandó anyag nélkül nincs utómunka lépés (kivéve, ha a projekt épp abban az állapotban van)
  // a szakember (ha nem vágó) nem látja az utómunkát
  const isCut=!ro()||(p.crew||[]).some(a=>a.crewId===(S.me&&S.me.crewId)&&a.role==='Vágó');
  const hasVid=Array.isArray(p.videos)&&p.videos.length>0,hidJov=hasVid&&(status==='jovahagyas'||status==='leadva');   // videós projektnél a jóváhagyás a videótáblán dől el: a lépés nem látszik, az Utómunka marad kiemelve
  const stList=STAGES.map((s,i)=>({s,i})).filter(x=>{if(x.s.id==='leadva'&&(status!=='leadva'||hasVid))return false;if(x.s.id==='jovahagyas'&&(status!=='jovahagyas'||hasVid))return false;   // a „Jóváhagyásra vár” nem külön lépés (a videótáblán dől el)
    if(x.s.id==='helyszin'&&editOnly(p)&&status!=='helyszin')return false;   // videóvágásnál nincs helyszíni munka   // a „Videók leadva” lépés megszűnt (az utómunka része)
    if(!POST_STAGES.includes(x.s.id))return true;if(x.s.id!=='utomunka'&&!videoStagesOn()&&status!==x.s.id)return false;return isCut&&(needsDelivery(p)||status===x.s.id);});
  const doneSet=new Set(String(p.stepsDone||'').split(',').filter(Boolean)),TICKS=['tervezes','helyszin','utomunka','jovahagyas'];
  const closed=status==='atadva';   // lezárt projekt: a lépések nem módosíthatók
  const canDrag=!ro()&&!closed&&status!=='lemondva'&&!projLocked();
  const cutDrag=ro()&&status==='utomunka'&&needsDelivery(p)&&(p.crew||[]).some(x=>x.crewId===(S.me&&S.me.crewId)&&x.role==='Vágó');   // a vágó az Utómunkát a „Videók jóváhagyásra várnak” lépésre húzhatja (leadás)
  const ci=hidJov?STAGES.findIndex(x=>x.id==='utomunka'):curIdx;
  const stages=stList.map(({s,i},k)=>{const curIdx=ci;const tk=TICKS.includes(s.id)||s.id==='atadva',on=doneSet.has(s.id||'')||(closed&&tk)||(tk&&status!=='lemondva'&&i<curIdx);   // a már elhagyott lépés kipipáltnak látszik
    const cur=i===curIdx,fut=status!=='lemondva'&&i>curIdx,vidS=s.id==='utomunka'&&Array.isArray(p.videos)&&p.videos.length>0,drag=(!vidS||hidJov)&&((canDrag&&cur&&s.id!=='atadva')||(cutDrag&&cur)),   /* videós utómunka: a haladás a videótáblán (részletek), itt nem húzható */tgt=(canDrag&&fut)||(cutDrag&&s.id==='jovahagyas');   // a lépés húzással halad: az aktuális kártyát a következőre kell húzni
    return `<div class="stage-w${(tk&&on)||drag?' has-tick':''}"><div class="stage${status==='lemondva'?'':i<curIdx?' done':cur?' cur':''}${on?' ticked':''} stage-static${drag?' stage-drag':''}${tgt?' stage-target':''}" data-v="${s.id}" data-si="${k}"${vidS?` data-action="bd-lane" data-id="${esc(p.id)}" role="button" tabindex="0" title="A videók táblája"`:''}${drag?' draggable="true" title="Húzd a következő lépésre, ha ez a lépés megtörtént"':''} aria-current="${cur?'step':'false'}"><span class="n">${k+1}. lépés</span><span class="t-row"><span class="t">${esc(stageLabel(p,s.id))}</span>${s.id==='helyszin'&&p.siteOk?`<${ro()?'span':'button type="button" data-action="site-report"'} class="stage-site ${p.siteOk==='nem'?'bad':'ok'}" data-tip="${esc((p.siteOk==='nem'?'🚨 Elakadás történt':'✅ Minden rendben')+(p.siteReport?'\n'+p.siteReport:'')+(ro()?'':'\nKattints a beszámoló szerkesztéséhez'))}">${p.siteOk==='nem'?'🚨 Elakadás':'✅ Rendben'}</${ro()?'span':'button'}>`:''}${s.id==='utomunka'&&Array.isArray(p.videos)&&p.videos.length?`<button type="button" class="stage-board" data-action="bd-lane" data-id="${esc(p.id)}" title="${p.videos.filter(x=>x.st==='jovahagyva').length}/${p.videos.length} videó jóváhagyva – kattints a videók táblájáért" aria-label="Videók: ${p.videos.filter(x=>x.st==='jovahagyva').length}/${p.videos.length} jóváhagyva, részletek">🎬 ${p.videos.filter(x=>x.st==='jovahagyva').length}/${p.videos.length} ✅ <b>›</b></button>`:''}</span></div>${drag?`<span class="stage-tick stage-handle" aria-hidden="true" title="Húzd a következő lépésre">⠿</span>`:tk&&on?`<span class="stage-tick on" title="Megtörtént">✓</span>`:''}</div>`;}).join('')   /* pipa csak a már teljesült lépésen (üres karika nincs) */+(canDrag&&curIdx<STAGES.length-1?'':'');
  const dlRow=it=>{const n=num(p[it.k]);return `<div class="dl${n?' on':''}"><div><div class="dl-name">${it.label}</div></div>
    <div class="stepper"><button type="button" data-action="dlv" data-k="${it.k}" data-d="-1" aria-label="${it.label}: kevesebb"${n<=0||ro()?' disabled':''}>−</button><input class="step-in" type="text" inputmode="numeric" pattern="[0-9]*" data-step-k="${it.k}" data-min="0" data-max="${it.max}" aria-label="${it.label} (db)" value="${n}"${D()}><button type="button" data-action="dlv" data-k="${it.k}" data-d="1" aria-label="${it.label}: több"${n>=it.max||ro()?' disabled':''}>+</button></div></div>`;};
  const dl=DELIVERABLES.filter(it=>it.g!=='int').map(dlRow).join(''),dlInt=DELIVERABLES.filter(it=>it.g==='int').map(dlRow).join('');
  const intTg=INT_FLAGS.map(c=>`<label class="toggle"><input type="checkbox" data-flag="${c.k}"${p[c.k]?' checked':''}${D()}><span class="tl">${c.label}</span></label>`).join('');
  const tg=k=>{const e=EXTRAS.find(x=>x.k===k);return `<label class="toggle"><input type="checkbox" data-flag="${k}"${p[k]?' checked':''}${D()}><span class="tl">${e?e.label:k}</span></label>`;};
  const ex=EXTRAS.filter(e=>!['x_nyersTarolas','x_foto','x_rush'].includes(e.k)).map(e=>{return `<label class="toggle"><input type="checkbox" data-flag="${e.k}"${p[e.k]?' checked':''}${D()}><span class="tl">${e.label}</span></label>`;}).join('');
  const nKrea=DELIVERABLES.filter(it=>num(p[it.k])>0).length+(fotoDb(p)>0?1:0)+EXTRAS.filter(e=>e.k!=='x_foto'&&p[e.k]).length;
  const nRec=REC_CAMS.filter(c=>p[c.k]).length+REC_LIVE.filter(c=>p[c.k]).length+(p.er_post?1:0);
  const nTech=TECH.filter(t=>p[t.k]).length;
  const nRecG=REC_CAMS.filter(c=>c.k!=='er_creative'&&p[c.k]).length,nKreaG=EXTRAS.filter(e=>!['x_nyersTarolas','x_foto','x_rush','x_nyersVetel'].includes(e.k)&&p[e.k]).length+(p.er_creative?1:0),nFotoG=(fotoN(p)>0?1:0)+(fotoDb(p)>0?1:0);
  const nTechG=nTech+REC_LIVE.filter(c=>p[c.k]).length,nPostErG=REC_COUNTS.filter(it=>it.k!=='er_rooms'&&num(p[it.k])>0).length,nPostKreaG=DELIVERABLES.filter(it=>it.g!=='int'&&num(p[it.k])>0).length+(p.x_rush?1:0),nPostIntG=DELIVERABLES.filter(it=>it.g==='int'&&num(p[it.k])>0).length,nIntG=INT_FLAGS.filter(c=>p[c.k]).length;
  const camRow=c=>{const cc=CAM_COUNTS.find(x=>x.flag===c.k),n=camN(p,c.k);
          return cc?`<div class="cam-row"><label class="toggle"><input type="checkbox" data-flag="${c.k}"${p[c.k]?' checked':''}${D()}><span class="tl">${c.label}</span></label>${p[c.k]?`<div class="stepper cam-step"><button type="button" data-action="rec-step" data-k="${cc.k}" data-d="-1" aria-label="${cc.label}: kevesebb"${n<=1||D()?' disabled':''}>−</button><input class="step-in" type="text" inputmode="numeric" data-step-k="${cc.k}" data-min="1" data-max="10" aria-label="${cc.label} száma" value="${n}"${D()}><button type="button" data-action="rec-step" data-k="${cc.k}" data-d="1" aria-label="${cc.label}: több"${n>=10||D()?' disabled':''}>+</button></div>`:''}</div>`
            :`<label class="toggle"><input type="checkbox" data-flag="${c.k}"${p[c.k]?' checked':''}${D()}><span class="tl">${c.label}</span></label>`;};
  const tech=TECH.map(t=>`<label class="toggle"><input type="checkbox" data-flag="${t.k}"${p[t.k]?' checked':''}${D()}><span class="tl">${t.label}</span></label>`).join('');
  const sortedCrew=S.crew.slice().sort((a,b)=>a.name.localeCompare(b.name,'hu'));
  const leadOpts=sortedCrew.map(cr=>`<option value="${esc(cr.id)}"${cr.id===p.lead?' selected':''}>${esc(cr.name)}</option>`).join('');
  const leadBusy=p.lead&&!remoteLead(p)?busyFor(p.lead,p):[];
  const assigned=(p.crew||[]).map((a,i)=>{const cr=crewById(a.crewId);const busy=busyFor(a.crewId,p);
    return `<div class="arow">${avatar(cr)}<div class="who"><b>${esc(cr?cr.name:'Törölt munkatárs')}</b>${busy.length?`<span class="bad-txt">Ütközik: ${busy.map(q=>`<button class="linkbtn bad-link" type="button" data-action="open-project" data-id="${esc(q.id)}" title="${esc(q.name||'')} megnyitása">${esc(q.name||'projekt')}</button>`).join(', ')}</span>`:cr&&cr.phone?`<small>${esc(cr.phone)}</small>`:''}</div>
      <select class="inp" data-crew-role="${i}" data-cmb="Szerep…" aria-label="Szerep"${D()}>${CREW_ROLES.map(rl=>`<option${OP_SUB.includes(rl)?' data-parent="Operatőr"':''}${rl===a.role?' selected':''}>${esc(rl)}</option>`).join('')}</select>
      <button class="x w" type="button" data-action="crew-remove" data-i="${i}" aria-label="Eltávolítás a projektből">×</button></div>`;}).join('');
  const sel='';
  const selRole=S.addCrew.role||(()=>{const miss=staffing(p).find(x=>x.have<x.need&&x.role!=='Projektvezető');return miss?miss.role:'Operatőr';})();   // alapból a hiányzó szerep (pl. fénytechnikus)
  const personOpts=sortedCrew.slice().sort((a,b)=>prioNum(a)-prioNum(b)||a.name.localeCompare(b.name,'hu')).map(cr=>{const busy=busyFor(cr.id,p);return `<option value="${esc(cr.id)}"${cr.id===sel?' selected':''}>${prioNum(cr)<9?'P'+prioNum(cr)+' · ':''}${esc(cr.name)}${(cr.roles||[]).length?' ('+esc(cr.roles.slice(0,2).join(', '))+')':''}${busy.length?' — foglalt: '+esc(busy.map(q=>q.name).join(', ')):''}</option>`;}).join('');
  const eqList=(p.equipment||[]).map(e=>({e,it:itemById(e.itemId)}));
  const catOf=x=>x.it?x.it.category||'Egyéb':'Törölt eszköz';
  const cats=[...new Set(eqList.map(catOf))].sort((a,b)=>INV_CATS.indexOf(a)-INV_CATS.indexOf(b));
  const eqHtml=cats.map(cat=>`<div class="eq-cat">${esc(cat)}</div>`+eqList.filter(x=>catOf(x)===cat).map(({e,it})=>{
    let note='';
    if(it){const free=num(it.qty)-usedElsewhere(it.id,p);
      if(num(e.qty)>free)note=`<span class="bad-txt">Csak ${Math.max(0,free)} db szabad ezen a napon</span>`;
      else if(it.condition&&it.condition!=='ok')note=`<span class="warn-txt">${esc(CONDITIONS[it.condition])}</span>`;
      else note=`<small>${free} / ${num(it.qty)} db szabad</small>`;}
    return `<div class="arow"><div class="who"><b>${esc(it?it.name:'Törölt eszköz')}</b>${note}</div>
      <input class="inp qty" type="number" min="1" inputmode="numeric" data-eq-qty="${esc(e.itemId)}" value="${num(e.qty)}" aria-label="Darabszám"${D()}>
      <button class="x w" type="button" data-action="eq-remove" data-id="${esc(e.itemId)}" aria-label="Eltávolítás">×</button></div>`;}).join('')).join('');
  const eqSel=S.addEq.item&&itemById(S.addEq.item)?S.addEq.item:'';
  const itemOpts=INV_CATS.map(cat=>{const items=S.inventory.filter(i=>(i.category||'Egyéb')===cat&&i.condition!=='selejt').sort((a,b)=>a.name.localeCompare(b.name,'hu'));
    if(!items.length)return '';return `<optgroup label="${esc(cat)}">${items.map(i=>{const free=num(i.qty)-usedElsewhere(i.id,p);return `<option value="${esc(i.id)}"${i.id===eqSel?' selected':''}>${esc(i.name)} — ${free}/${num(i.qty)} szabad${i.condition&&i.condition!=='ok'?' ('+CONDITIONS[i.condition].toLowerCase()+')':''}</option>`;}).join('')}</optgroup>`;}).join('');
  const folder=ro()?'':p.folderId?`<a class="mini" href="${esc(driveUrl(p.folderId))}" target="_blank" rel="noopener">📁 Projektmappa megnyitása ↗</a>`:ro()?'':`<button class="mini" type="button" data-action="make-folder">📁 Projektmappa létrehozása</button>`;
  const histBtn=ro()?'':`<button class="mini" type="button" data-action="proj-history" data-id="${esc(p.id)}">ℹ️ Részletek</button>`;
  const iCut=(p.crew||[]).some(a=>a.crewId===(S.me&&S.me.crewId)&&a.role==='Vágó'),canDeliver=iCut&&['tervezes','helyszin','utomunka','leadva'].includes(p.status||'tervezes')&&needsDelivery(p);
  const vl=vidLink(p,'mini','Átadási link megnyitása ↗'+(p.deliveryPass?' 🔒':'')),xl=extraLinks(p,'mini');
  const dlPanel=!!(vl||xl)&&['leadva','jovahagyas','atadva'].includes(status)&&!(ro()&&!iCut&&r&&r.end<T);   // a Kész videók panel mutatja a linket – fent nem kell még egy gomb
  const delivery=(dlPanel?xl:vl+xl);
  return `<div class="dhead${ro()?' dhead-inline':''}">
    <div class="dtitle"><button class="back back-ic" type="button" data-action="back" aria-label="Vissza: ${S._fromTab==='naptar'?'Naptár':ro()?'Beosztásaim':'Összes projekt'}" data-tip="${S._fromTab==='naptar'?'Naptár':ro()?'Beosztásaim':'Összes projekt'}">←</button>${calBlock(r&&r.start)}<div class="grow"><h2><span class="pname">${esc(p.name||'Névtelen projekt')}</span>${p.status==='atadva'?DONE_CHECK:''}${ro()?'':' <button class="editbtn title-edit" type="button" data-action="proj-rename" aria-label="Projekt nevének módosítása" data-tip="Név módosítása">✏️</button>'}</h2>
      <p class="sub proj-sub">${esc([ro()?'':p.client,p.eventType,fmtRange(p)?fmtRange(p)+(p.startTime?', '+p.startTime+(p.endTime?'–'+p.endTime:''):''):'',p.venue].filter(Boolean).join(' · '))}</p></div></div>
    <div class="btns">${ro()?'':`<button class="btn ${S.dirty?'primary':'outline'} small proj-save" type="button" data-action="save"${S.dirty?'':' disabled'} title="${KBD_SAVE}">${S.saving>0?'Mentés…':S.dirty?'💾 Mentés':'✓ Mentve'}</button>`}${folder}${histBtn}${delivery}${p.calEventId?`<button class="mini" type="button" data-action="tab" data-tab="naptar" data-focus="${esc(r?r.start:'')}" title="A „Terepi Munkák” Google Naptárban">📅 Naptárban</button>`:(validISO(p.date)&&!ro()&&!editOnly(p)?'<span class="hint" style="margin:0;align-self:center">📅 Mentéskor bekerül a Google Naptárba</span>':'')}${ro()?'':`<button class="mini" type="button" data-action="cancel-toggle">${p.status==='lemondva'?'↩️ Visszaállítás':'🚫 Projekt lemondása'}</button><button class="mini warn" type="button" data-action="del-project">🗑️ Projekt törlése</button>`}</div>
    ${status==='lemondva'?`<div class="banner"><p><b>Ez a projekt le van mondva.</b>${p.cancelReason?` <span>Ok: <i>${esc(String(p.cancelReason).replace(/[.\s]+$/,''))}</i>.</span>`:''}</p><button class="btn outline small w" type="button" data-action="cancel-toggle">Visszaállítás</button></div>`:`${ro()&&!(p.crew||[]).some(a=>a.crewId===(S.me&&S.me.crewId)&&a.role==='Vágó')?'':`<div class="stages${ro()?' ro':''}${status==='atadva'?' locked':''}" role="group" aria-label="Projekt állapota" style="--n:${stList.length}">${stages}</div>`}${status==='atadva'?`<p class="hint locked-hint">🔒 A projekt lezárva${p.deliveredAt?' ('+esc(fmtDay(p.deliveredAt))+')':''} – a lépések már nem módosíthatók.${isAdmin()?' <button class="linkbtn" type="button" data-action="proj-unlock" style="margin-left:6px">🔓 Felnyitás</button>':''}</p>`:''}${!p.siteOk&&!ro()&&!editOnly(p)&&['utomunka','leadva','jovahagyas'].includes(status)?`<div class="site-rep warn"><b>🎬 A forgatás véget ért – hogy ment a helyszíni munka?</b><span>Jelöld be a beszámolót, hogy a projekt tovább léphessen.</span><button class="btn primary small" type="button" data-action="site-report">📝 Beszámoló</button></div>`:''}`}
    ${iss.length?`<div class="issues">${iss.map(i=>issueRow(i,p.id)).join('')}</div>`:''}
  </div>
  <div class="dfull">
      ${dlPanel?`<div class="panel dl-panel"><div class="grow"><h3>🎬 Kész videók</h3><p class="hint" style="margin:2px 0 0">${p.deliveredAt?'Átadva: '+esc(fmtDay(p.deliveredAt))+' · ':''}${esc(String(p.deliveryNotes||'').slice(0,200))||'A videók letölthetők az átadási linkről.'}</p></div>${(isAdmin()||(S.me&&S.me.role==='editor'))&&status!=='atadva'?`<button class="btn outline small" type="button" data-action="dl-edit" data-id="${esc(p.id)}">✏️ Linkek módosítása</button>`:''}${vidLink(p,'btn primary','▶️ Átadási link megnyitása ↗'+(p.deliveryPass?' 🔒':''))}</div>`:''}
      <details class="panel fold basics" data-fold="basics"${FOLD.basics!==false?' open':''}><summary><h3>📋 Alapadatok</h3></summary><div class="fields">
        ${fld(p,'name','Projekt neve')}
        ${editOnly(p)?'':fld(p,'venue',`Helyszín${p.venue?` <a class="linkbtn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.venue)}" target="_blank" rel="noopener" style="font-size:12px;margin-left:6px">📍 Térkép ↗</a>`:''}`,{ph:ro()?'':'Kezdd el gépelni a címet vagy a helyszín nevét…'})}
        ${ro()?'':`<div class="field"><label for="f-client">Ügyfél</label><div class="combo"><input class="inp" id="f-client" type="text" autocomplete="off" value="${esc(p.client||'')}" placeholder="${ro()?'':'Keress vagy válassz ügyfelet… (üresen is hagyható)'}"${D()}></div>${p.clientTax||p.clientAddress?`<span class="hint" style="margin:2px 0 0">${esc([p.clientAddress,p.clientTax?'Adószám: '+p.clientTax:''].filter(Boolean).join(' · '))}</span>`:''}</div>`}
        ${selField(p,'eventType','Rendezvény típusa',p.eventType&&!EVENT_TYPES.includes(p.eventType)?EVENT_TYPES.concat([p.eventType]):EVENT_TYPES,{cmb:'Válassz típust…'})}
        ${ro()?'':`<div class="field full contact3">
        ${fld(p,'contactName','Kapcsolattartó')}
        ${phoneField({key:'contactPhone',value:p.contactPhone,disabled:ro(),after:'<button class="btn ghost small vcf-btn" type="button" data-action="vcf" title="Névjegy a telefonra (QR-kód)" aria-label="Névjegy a telefonra">📇 Névjegy</button>'})}
        ${fld(p,'contactEmail','E-mail',{type:'email'})}
        </div>`}
        ${editOnly(p)?`<div class="field">${fld(p,'date','✂️ Leadási határidő',{type:'date'}).replace(/^<div class="field[^"]*">/,'').replace(/<\/div>$/,'')}<span class="hint" style="margin:2px 0 0">Videóvágás: nincs helyszín és kezdési idő – csak a leadás napja számít.</span></div>`:(()=>{const on=!!p.endDate||!!p._multi,tm=(k,l)=>fld(p,k,l,{ph:k.endsWith('EndTime')||k==='endTime'?'pl. 18:30':'pl. 10:00',im:'numeric'}).replace('data-field=','data-time="1" maxlength="5" data-field=');
          return `<div class="field full day-cols"><div class="day-col">${fld(p,'date',on?'Első nap':'Dátum',{type:'date'})}<div class="time-pair">${tm('startTime',on?'Kezdés (első nap)':'Kezdés')}${tm('endTime',on?'Végzés kb. (első nap)':'Végzés (kb.)')}</div></div>
            ${ro()&&!on?'':`<div class="day-col">${ro()?fld(p,'endDate','Utolsó nap',{type:'date'}):`<div class="field"><label class="multi-lbl" for="f-multi"><input type="checkbox" id="f-multi" data-multi="1"${on?' checked':''}${D()}> Több napos – utolsó nap</label><input class="inp" id="f-endDate" data-field="endDate" type="date" value="${esc(p.endDate||'')}"${p.date?` min="${esc(p.date)}"`:''}${on&&!ro()?'':' disabled'}></div>`}
            ${on?'<div class="time-pair">'+tm('lastStartTime','Kezdés (utolsó nap)')+tm('lastEndTime','Végzés kb. (utolsó nap)')+'</div>':''}</div>`}</div>`;})()}
        <div class="field full"><label for="f-notes">Jegyzetek</label><div class="inp rt-notes" id="f-notes" data-rt="notes" role="textbox" aria-multiline="true" data-ph="${D()?'–':'Parkolás, beléptetés, öltözet, helyszíni kapcsolattartó… (beillesztéskor a formázás megmarad)'}" contenteditable="${D()?'false':'true'}">${notesHtml(p.notes)}</div></div>
      </div></details>
  </div>
  ${isAdmin()&&typeof projBillingPanel==='function'?projBillingPanel(p):''}
  
  ${ro()?roContentPanel(p):(()=>{const nSel=nRec+nKrea+nTech+nIntG+postTasks(p).length,openEd=FOLD.content!=null?FOLD.content:!nSel;   // egy panel: felül az összesítő (kiosztással), alatta a kiválasztás
    const SL=!ro()&&!projLocked()&&crewLocked(p),SP=crewPast(p);   // véglegesített csapatnál a szolgáltatások is zárolva (szürkén), feloldással bővíthetők
    return `<section class="panel content svc${SL?' svc-locked':''}"><h3>🧾 Szolgáltatások ${foldAside(nRec+nKrea+nTech+nIntG)}${SL&&!SP?'<button class="btn outline small svc-unlock-btn" type="button" data-action="crew-edit" title="Ha utólag extra szolgáltatást kérnek: feloldja a szolgáltatásokat és a csapatot">🔓 Szolgáltatások módosítása</button>':''}</h3><p class="hint" style="margin:-4px 0 12px">${SL&&SP?'A rendezvény már lezajlott, ezért a szolgáltatások és a csapat nem módosíthatók.':SL?'A csapat véglegesítve van, ezért a szolgáltatások zárolva vannak. Ha utólag extra szolgáltatást kérnek, a „Szolgáltatások módosítása” gombbal oldhatod fel.':'Jelöld be, mit kell csinálni – a kiválasztott tétel alatt rögtön kiválaszthatod, ki csinálja. A kiválasztott szakember a szerepével a Stáb és eszközök közé is bekerül.'}</p>
    ${(()=>{const tc=topicCards(p,{camRow,dlRow,D}),i=tc.indexOf('<div class="tc-cols');return (i>0?tc.slice(0,i):'')+`<div class="svc-body"${SL?' inert':''}>${i>0?tc.slice(i):tc}</div>`;})()}</section>`;})()}
  <div class="crew-wide">${canSeeFees()?(()=>{const ce=crewEquipPanel(p,st,c,sortedCrew,leadOpts,leadBusy,personOpts,selRole,true);
    return `<details class="panel fold crew-fin" data-fold="crew"${FOLD.crew!==false?' open':''}><summary><h3>👥 Stáb és eszközök <span class="aside">${ce.aside}</span></h3></summary><div class="crew-body">${ce.body}</div></details>
      <details class="panel fold money-panel" data-fold="money"${FOLD.money!==false?' open':''}><summary><h3>💰 ${isAdmin()?'Pénzügyek – büdzsé, termelői keret és díjak':'Termelői díjak és keret'}</h3></summary>${financePanel(p,true)}</details>`;})()
    :crewEquipPanel(p,st,c,sortedCrew,leadOpts,leadBusy,personOpts,selRole)}</div>
  ${ro()&&p.myFee&&num(p.myFee.amount)&&(p.penalties||[]).some(x=>x.crewId===(S.me&&S.me.crewId))?myFeePanel(p):''}`;   // a díj a Kifizetések fülön látszik; itt csak díjcsökkentésnél (a kifogás miatt)
}
