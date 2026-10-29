'use strict';
/* ===== Bevétel és kiadás (csak ügyvezető) – a régi „Lumos Motion Árbevétel” táblázat kiváltása =====
   Bevétel projektenként: díjazás → nyereség % + ügyvezető % + marketing % + termelési költség, a maradék az Eszköz/Rezsi alapba.
   A rezsi- és marketingkiadások ezekből az alapokból mennek, az egyenleg hónapról hónapra áthozódik.
   A beállított hónaptól („app számol”) a projektekből számolunk, előtte a régi táblázatból importált sorokból. */
const PAY_LABEL={'':'—',var:'Fizetésre vár',eloleg:'Előleg fizetve',teljes:'Teljes fizetve'};
const PAY_CLS={'':'',var:'p-warn',eloleg:'p-info',teljes:'p-ok'};
const FUND_LABEL={rezsi:'Eszköz, rezsi',marketing:'Marketing'};
const finOn=()=>isAdmin()&&!!(S.capabilities&&S.capabilities.finance);
const sFt=n=>(n<0?'−':'')+ftFmt(Math.abs(n));
const signedVal=s=>{const t=String(s||'').replace(/\s/g,'');if(!t)return 0;const neg=/^[-−]/.test(t),d=t.replace(/\D/g,'');return d?(neg?-1:1)*Number(d):0;};
async function finLoad(force){if(S.fin&&!force)return;if(S._finLoading)return;S._finLoading=true;
  try{S.fin=await call('finData');}catch(e){S.fin=null;handleErr(e);}finally{S._finLoading=false;if(S.tab==='penzugy')render(true);}
  const sz=S.fin&&S.fin.sz;if(sz&&sz.hasKey&&!S._szAuto&&(S.fin.invoices||[]).some(x=>num(x.invPaid)<num(x.invGross)-1)){S._szAuto=true;szSync(true);}}   // betöltéskor egyszer csendben frissítjük a kifizetéseket
function finApply(d){S.fin=Object.assign({},S.fin||{},{income:d.income,expense:d.expense,loan:d.loan,settings:d.settings},d.invoices?{invoices:d.invoices}:{},d.sz?{sz:d.sz}:{});
  (d.invoices||[]).forEach(x=>{if(x.projectId){const p=projById(x.projectId);if(p){const st=szPayOf(x.projectId);if(st)p.payStatus=st;}}});render(true);}
const szPayOf=pid=>{const l=((S.fin&&S.fin.invoices)||[]).filter(x=>x.projectId===pid),r=l.filter(x=>x.kind!=='dijbekero'),u=r.length?r:l;if(!u.length)return '';const g=u.reduce((s,x)=>s+num(x.invGross),0),p=u.reduce((s,x)=>s+num(x.invPaid),0);return g>0&&p>=g-1?'teljes':p>0?'eloleg':'var';};
const finSet=()=>(S.fin&&S.fin.settings)||{profitPct:30,ceoPct:5,marketingPct:5,openMonth:'',openRezsi:0,openMarketing:0,appFromMonth:''};
/* Egy projekt felosztása */
function finProjectRow(p){const st=finSet(),amount=num(p.projectValue),prod=Math.round(feeSum(p));
  const profit=Math.round(amount*st.profitPct/100),ceo=Math.round(amount*st.ceoPct/100),marketing=Math.round(amount*st.marketingPct/100);
  return {kind:'project',p,id:p.id,day:String(Number(pr(p).start.slice(8))),name:p.name||'Névtelen projekt',payStatus:p.payStatus||'',amount,prod,profit,ceo,marketing,rezsi:amount-profit-ceo-marketing-prod};}
function finIncomeFor(m){const st=finSet(),fin=S.fin||{},appFrom=st.appFromMonth;
  const fromApp=!appFrom||m>=appFrom;
  const proj=fromApp?S.projects.filter(p=>p.status!=='lemondva'&&pr(p)&&pr(p).start.slice(0,7)===m&&(num(p.projectValue)||feeSum(p))).map(finProjectRow):[];
  const manual=(fin.income||[]).filter(r=>r.month===m&&(r.legacy?!fromApp:true)).map(r=>Object.assign({kind:'manual'},r,{amount:num(r.amount),prod:num(r.prod),profit:num(r.profit),ceo:num(r.ceo),marketing:num(r.marketing),rezsi:Number(r.rezsi)||0}));
  const dayN=x=>parseInt(x.day,10)||99;
  return proj.concat(manual).sort((a,b)=>dayN(a)-dayN(b)||a.name.localeCompare(b.name,'hu'));}
function finExpensesFor(m){return ((S.fin&&S.fin.expense)||[]).filter(e=>e.kind==='fix'?(e.from&&e.from<=m&&(!e.to||e.to>=m)):e.month===m).sort((a,b)=>(a.kind==='fix'?0:1)-(b.kind==='fix'?0:1)||a.name.localeCompare(b.name,'hu'));}
const sumK=(arr,k)=>arr.reduce((s,x)=>s+(Number(x[k])||0),0);
/* Az alapok egyenlege hónapról hónapra a nyitó hónaptól */
function finBalances(m){const st=finSet(),start=st.openMonth||finMonths()[finMonths().length-1]||m;
  let rez=st.openRezsi||0,mkt=st.openMarketing||0;const out={};
  // a régi táblázat áthozata csak addig hiteles, amíg egy korábbi hónap sorait nem frissítettük az appból (utána a láncolt számítás érvényes)
  const edited=((S.fin&&S.fin.income)||[]).filter(r=>/^Az appból frissítve/.test(r.note||'')).map(r=>r.month).sort()[0]||'';
  for(let x=start;x<=m;x=shiftMonth(x,1)){const inc=finIncomeFor(x),exp=finExpensesFor(x),ov=(st.carries||{})[x];
    if(Array.isArray(ov)&&(!st.appFromMonth||x<st.appFromMonth)&&(!edited||x<=edited)){rez=Number(ov[0])||0;mkt=Number(ov[1])||0;}   // a régi táblázat szerinti áthozat a hiteles
    const r={carryRezsi:rez,carryMkt:mkt,inRezsi:sumK(inc,'rezsi'),inMkt:sumK(inc,'marketing'),outRezsi:sumK(exp.filter(e=>e.fund!=='marketing'),'amount'),outMkt:sumK(exp.filter(e=>e.fund==='marketing'),'amount')};
    rez=rez+r.inRezsi-r.outRezsi;mkt=mkt+r.inMkt-r.outMkt;r.endRezsi=rez;r.endMkt=mkt;out[x]=r;}
  return out[m]||{carryRezsi:rez,carryMkt:mkt,inRezsi:0,inMkt:0,outRezsi:0,outMkt:0,endRezsi:rez,endMkt:mkt};}
function finMonths(){const set=new Set([todayISO().slice(0,7),shiftMonth(todayISO().slice(0,7),1)]),fin=S.fin||{};
  (fin.income||[]).forEach(r=>r.month&&set.add(r.month));(fin.expense||[]).forEach(e=>{if(e.month)set.add(e.month);});
  S.projects.forEach(p=>{if(pr(p))set.add(pr(p).start.slice(0,7));});if(finSet().openMonth)set.add(finSet().openMonth);
  const arr=[...set].sort();const first=finSet().openMonth||arr[0],last=arr[arr.length-1],out=[];for(let x=first;x<=last;x=shiftMonth(x,1))out.push(x);return out.reverse();}
/* Kintlévőség: minden hónap fizetésre váró / előleges tétele */
function finReceivables(){const months=finMonths();let n=0,sum=0;months.forEach(m=>finIncomeFor(m).forEach(r=>{if(r.payStatus==='var'||r.payStatus==='eloleg'){n++;sum+=r.amount;}}));return {n,sum};}

function viewFinance(){
  if(!finOn())return `<div class="panel">${empty('A Bevétel és kiadás a háttérkód frissítése után érhető el.')}</div>`;
  if(!S.fin){finLoad();return '<div class="loading"><span class="spin"></span>Betöltés…</div>';}
  const months=finMonths(),m=months.includes(S.finMonth)?S.finMonth:todayISO().slice(0,7),st=finSet();S.finMonth=m;
  const inc=finIncomeFor(m),exp=finExpensesFor(m),bal=finBalances(m),rec=finReceivables();
  const fromApp=!st.appFromMonth||m>=st.appFromMonth;
  const T=k=>sumK(inc,k);
  const payCell=r=>`<select class="inp pay-sel ${PAY_CLS[r.payStatus]||''}" data-finpay="${esc(r.kind)}" data-id="${esc(r.id)}" aria-label="Fizetési állapot">${Object.entries(PAY_LABEL).map(([v,l])=>`<option value="${v}"${v===(r.payStatus||'')?' selected':''}>${l}</option>`).join('')}</select>`;
  const incRows=inc.map(r=>`<tr${r.kind==='project'?'':' class="fin-manual"'}><td class="n">${esc(r.day||'')}</td>
    <td>${r.kind==='project'?`<button class="linkbtn" type="button" data-action="open-project" data-id="${esc(r.id)}">${esc(r.name)}</button>`:`<button class="linkbtn" type="button" data-action="fin-income-edit" data-id="${esc(r.id)}" title="${esc(r.people||'')}">${esc(r.name)}</button>${r.legacy?' <span class="muted fin-leg">régi táblázat</span>':''}`}</td>
    <td>${payCell(r)}</td>${szOn()?`<td>${invCell(r)}</td>`:''}<td class="r"><b>${moneyFmt(r.amount)||0}</b></td><td class="r">${moneyFmt(r.profit)||0}</td><td class="r">${moneyFmt(r.prod)||0}</td><td class="r">${moneyFmt(r.ceo)||0}</td><td class="r${r.rezsi<0?' bad-txt':''}">${r.rezsi<0?'−':''}${moneyFmt(Math.abs(r.rezsi))||0}</td><td class="r">${moneyFmt(r.marketing)||0}</td></tr>`).join('');
  const expRows=exp.map(e=>`<tr><td><button class="linkbtn" type="button" data-action="fin-exp-edit" data-id="${esc(e.id)}">${esc(e.name)}</button></td><td>${e.kind==='fix'?`<span class="statuspill">havi fix</span>`:'<span class="statuspill p-mute">egyszeri</span>'}</td><td>${FUND_LABEL[e.fund]||'Eszköz, rezsi'}</td><td class="r"><b>${moneyFmt(e.amount)||0}</b></td></tr>`).join('');
  const loans=((S.fin.loan)||[]).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))),lIn=sumK(loans.filter(l=>l.kind!=='vissza'),'amount'),lOut=sumK(loans.filter(l=>l.kind==='vissza'),'amount');
  return `<div class="page-head"><div class="grow"><h2>Bevétel és kiadás</h2><p class="sub">Havi bevételek felosztással, kiadások, alapok egyenlege · nettó · csak te látod</p></div>
      <select class="inp" id="fin-month" style="width:auto" aria-label="Hónap">${months.map(x=>`<option value="${x}"${x===m?' selected':''}>${esc(F_YM.format(toDate(x+'-01')))}</option>`).join('')}</select>
      ${szOn()?`<button class="btn outline small" type="button" data-action="sz-sync" title="${esc(S.fin.sz.lastSync?'Utoljára: '+S.fin.sz.lastSync:'')}"${S._szSyncing?' disabled':''}>${S._szSyncing?'Frissítés…':'🔄 Kifizetések'}</button><button class="btn outline small" type="button" data-action="sz-settings">🧾 Számlázás</button>`:''}
      <button class="btn outline small" type="button" data-action="fin-settings">⚙️ Beállítások</button></div>
    <div class="tiles fin-tiles">
      <div class="tile"><div class="tile-n">${ftFmt(T('amount'))}</div><div class="tile-l">bevétel ebben a hónapban</div></div>
      <div class="tile"><div class="tile-n">${ftFmt(T('profit'))}</div><div class="tile-l">nyereség (${st.profitPct}%)</div></div>
      <div class="tile${bal.endRezsi<0?' bad':''}"><div class="tile-n">${sFt(bal.endRezsi)}</div><div class="tile-l">elérhető – eszköz, rezsi</div></div>
      <div class="tile${rec.sum?' warn':''}"><div class="tile-n">${ftFmt(rec.sum)}</div><div class="tile-l">kintlévőség (${rec.n} tétel, minden hónap)</div></div>
    </div>
    <div class="panel"><h3>💰 Bevételek <span class="aside">${fromApp?'a projektekből':'a régi táblázatból'}</span></h3>
      <div class="sheet-wrap"><table class="sheet fin-tbl fin-inc"><thead><tr><th class="n">Nap</th><th>Megnevezés</th><th>Fizetés</th>${szOn()?'<th>Számla</th>':''}<th class="r">Díjazás</th><th class="r">Nyereség ${st.profitPct}%</th><th class="r">Termelés</th><th class="r">Ügyvezető ${st.ceoPct}%</th><th class="r">Eszköz, rezsi</th><th class="r">Marketing ${st.marketingPct}%</th></tr></thead>
      <tbody>${incRows||`<tr><td colspan="${szOn()?10:9}" class="empty-row">Ebben a hónapban még nincs bevétel.${fromApp?' A projektek a projekt értékének megadása után jelennek meg itt.':''}</td></tr>`}</tbody>
      <tfoot><tr><td></td><td><b>Összesen</b></td><td></td>${szOn()?'<td></td>':''}<td class="r"><b>${moneyFmt(T('amount'))||0}</b></td><td class="r"><b>${moneyFmt(T('profit'))||0}</b></td><td class="r"><b>${moneyFmt(T('prod'))||0}</b></td><td class="r"><b>${moneyFmt(T('ceo'))||0}</b></td><td class="r${T('rezsi')<0?' bad-txt':''}"><b>${T('rezsi')<0?'−':''}${moneyFmt(Math.abs(T('rezsi')))||0}</b></td><td class="r"><b>${moneyFmt(T('marketing'))||0}</b></td></tr></tfoot></table></div>
      <div class="btns" style="margin-top:10px"><button class="btn outline small" type="button" data-action="fin-income-new">+ Egyéb bevétel</button></div>
      ${fromApp?`<p class="hint">A projektek a kezdőnapjuk hónapjához számítanak. A termelés a projekt termelői költsége (díjak díjcsökkentés után, fuvar, étel, bérlés); az eszköz-rezsi rész a maradék.</p>`:''}</div>
    <div class="grid2">
      <div class="panel"><h3>🧾 Kiadások <span class="aside">${ftFmt(sumK(exp,'amount'))}</span></h3>
        <div class="sheet-wrap"><table class="sheet fin-tbl"><thead><tr><th>Tétel</th><th>Típus</th><th>Alap</th><th class="r">Összeg</th></tr></thead><tbody>${expRows||'<tr><td colspan="4" class="empty-row">Nincs kiadás ebben a hónapban.</td></tr>'}</tbody></table></div>
        <div class="btns" style="margin-top:10px"><button class="btn outline small" type="button" data-action="fin-exp-new">+ Kiadás</button></div>
        <p class="hint">A havi fix tételek (bér, könyvelő, irodabérlet, előfizetések) minden hónapban megjelennek, amíg meg nem szünteted őket.</p></div>
      <div class="panel"><h3>📊 Alapok egyenlege</h3>
        <div class="sheet-wrap"><table class="sheet fin-tbl"><thead><tr><th></th><th class="r">Eszköz, rezsi</th><th class="r">Marketing</th></tr></thead><tbody>
          <tr><td>Áthozat az előző hónapból</td><td class="r">${sFt(bal.carryRezsi)}</td><td class="r">${sFt(bal.carryMkt)}</td></tr>
          <tr><td>Tárgyhavi bevétel</td><td class="r">${sFt(bal.inRezsi)}</td><td class="r">${sFt(bal.inMkt)}</td></tr>
          <tr><td>Kiadás</td><td class="r">${sFt(-bal.outRezsi)}</td><td class="r">${sFt(-bal.outMkt)}</td></tr></tbody>
          <tfoot><tr><td><b>Elérhető</b></td><td class="r ${bal.endRezsi<0?'bad-txt':'ok-txt'}"><b>${sFt(bal.endRezsi)}</b></td><td class="r ${bal.endMkt<0?'bad-txt':'ok-txt'}"><b>${sFt(bal.endMkt)}</b></td></tr></tfoot></table></div></div>
    </div>
    <div class="panel"><h3>🤝 Tagi kölcsön <span class="aside">fennmaradó: <b>${ftFmt(lIn-lOut)}</b></span></h3>
      <div class="sheet-wrap"><table class="sheet fin-tbl"><thead><tr><th>Dátum</th><th>Típus</th><th>Bank</th><th>Megjegyzés</th><th class="r">Összeg</th><th></th></tr></thead><tbody>${loans.map(l=>`<tr><td>${esc(l.date)}</td><td>${l.kind==='vissza'?'<span class="statuspill p-ok">Cég visszafizeti</span>':'<span class="statuspill p-warn">Kölcsön a cégnek</span>'}</td><td>${esc(loanBank(l))}</td><td>${esc(l.note||'')}</td><td class="r">${moneyFmt(l.amount)}</td><td><button class="trash" type="button" data-action="fin-loan-del" data-id="${esc(l.id)}" aria-label="Törlés">🗑️</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty-row">Nincs tagi kölcsön.</td></tr>'}</tbody>
      <tfoot><tr><td colspan="4">Kölcsön összesen: <b>${ftFmt(lIn)}</b> · visszafizetve: <b>${ftFmt(lOut)}</b></td><td class="r"><b>${ftFmt(lIn-lOut)}</b></td><td></td></tr></tfoot></table></div>
      <div class="btns" style="margin-top:10px"><button class="btn outline small" type="button" data-action="fin-loan-new">+ Tétel</button></div></div>`;
}

/* ===== Műveletek ===== */
async function finCall(name,arg,okMsg){try{const d=await call(name,arg);finApply(d);if(okMsg)toast(okMsg);return d;}catch(e){handleErr(e);return null;}}
function finIncomeModal(r){const v=r||{},m=S.finMonth,st=finSet();
  openModal(r?'Bevétel szerkesztése':'Egyéb bevétel',`<div class="fields">
    ${mf('name','Megnevezés',{full:true,v:v.name,max:200,ph:'pl. Lurdy technikai ügyelet'})}
    ${mf('day','Nap',{v:v.day||'',ph:'pl. 7',max:10})}
    ${ms('payStatus','Fizetés',Object.entries(PAY_LABEL),v.payStatus||'var')}
    ${moneyField('amount','Díjazás (nettó)',v.amount,{steps:false})}
    ${moneyField('prod','Termelési költség (szakemberek stb.)',v.prod,{steps:false})}
  </div><p class="hint" style="margin:0">A felosztás a beállított százalékokkal számolódik (nyereség ${st.profitPct}%, ügyvezető ${st.ceoPct}%, marketing ${st.marketingPct}%), a maradék az eszköz-rezsi alapba kerül.${v.people?'<br>Régi táblázat szerinti szakemberek: '+esc(v.people):''}</p>`,
  {left:r?`<button type="button" class="btn danger small" data-action="fin-income-del" data-id="${esc(r.id)}">Törlés</button>`:'',submitLabel:'Mentés',submit:async fd=>{
    const amount=num(moneyVal(fd.get('amount'))),prod=num(moneyVal(fd.get('prod')));if(!amount){toast('Add meg a díjazást.',true);return;}
    const keepSplit=r&&r.legacy&&amount===num(r.amount)&&prod===num(r.prod);   // régi sornál a régi felosztás marad, ha az összeg nem változott
    const profit=keepSplit?r.profit:Math.round(amount*st.profitPct/100),ceo=keepSplit?r.ceo:Math.round(amount*st.ceoPct/100),marketing=keepSplit?r.marketing:Math.round(amount*st.marketingPct/100);
    const row=Object.assign({},v,{id:v.id||'',month:v.month||m,name:String(fd.get('name')||'').trim(),day:String(fd.get('day')||'').trim(),payStatus:fd.get('payStatus'),amount,prod,profit,ceo,marketing,rezsi:keepSplit?r.rezsi:amount-profit-ceo-marketing-prod});
    if(await finCall('finUpsert',{table:'income',row},'Bevétel mentve'))closeModal();}});}
function finExpenseModal(e){const v=e||{},m=S.finMonth;
  openModal(e?'Kiadás szerkesztése':'Új kiadás',`<div class="fields">
    ${mf('name','Megnevezés',{full:true,v:v.name,max:200,ph:'pl. Könyvelő'})}
    ${moneyField('amount','Összeg (nettó)',v.amount,{steps:false})}
    ${ms('fund','Melyik alapból',[['rezsi','Eszköz, rezsi'],['marketing','Marketing']],v.fund||'rezsi')}
    ${ms('kind','Típus',[['egyszeri','Egyszeri (csak ebben a hónapban)'],['fix','Havi fix (minden hónapban, amíg meg nem szünteted)']],v.kind||'egyszeri',{full:true})}
  </div>${e&&e.kind==='fix'?`<p class="hint" style="margin:0">Fix tétel: ${esc(e.from)}${e.to?' – '+esc(e.to):' óta'}. Ha az összeget módosítod, a változás <b>${esc(F_YM.format(toDate(m+'-01')))}</b> hónaptól érvényes, a korábbi hónapok nem változnak.</p>`:''}`,
  {left:e?`<button type="button" class="btn danger small" data-action="fin-exp-del" data-id="${esc(e.id)}">${e.kind==='fix'&&e.from<m?'Megszüntetés ettől a hónaptól':'Törlés'}</button>`:'',submitLabel:'Mentés',submit:async fd=>{
    const amount=num(moneyVal(fd.get('amount'))),name=String(fd.get('name')||'').trim(),fund=fd.get('fund'),kind=fd.get('kind');if(!amount){toast('Add meg az összeget.',true);return;}
    let rows;
    if(e&&e.kind==='fix'&&kind==='fix'&&e.from<m&&(amount!==num(e.amount)||fund!==e.fund||name!==e.name))rows=[Object.assign({},e,{to:shiftMonth(m,-1)}),{name,amount,fund,kind:'fix',from:m,to:e.to||''}];   // ettől a hónaptól új összeg
    else rows=[Object.assign({},v,{id:v.id||'',name,amount,fund,kind,month:kind==='egyszeri'?(v.month||m):'',from:kind==='fix'?(v.from||m):'',to:kind==='fix'?(v.to||''):'',legacy:false})];
    if(await finCall('finUpsert',{table:'expense',rows},'Kiadás mentve'))closeModal();}});}
function finSettingsModal(){const st=finSet(),cur=todayISO().slice(0,7);
  openModal('Bevétel és kiadás – beállítások',`<div class="fields">
    ${mf('profitPct','Nyereség (%)',{v:st.profitPct,im:'decimal'})}${mf('ceoPct','Ügyvezető (%)',{v:st.ceoPct,im:'decimal'})}${mf('marketingPct','Marketing (%)',{v:st.marketingPct,im:'decimal'})}
    ${mf('appFromMonth','Ettől a hónaptól számol az app a projektekből',{type:'month',v:st.appFromMonth||cur})}
    ${mf('openMonth','Nyitó hónap',{type:'month',v:st.openMonth||''})}
    ${mf('openRezsi','Nyitó egyenleg – eszköz, rezsi (Ft, lehet negatív)',{v:st.openRezsi||0})}
    ${mf('openMarketing','Nyitó egyenleg – marketing (Ft)',{v:st.openMarketing||0})}
    <div class="field full fin-import"><label for="m-importUrl">Régi táblázat importálása (Google Sheets link)</label>
      <input class="inp" id="m-importUrl" name="importUrl" type="url" placeholder="https://docs.google.com/spreadsheets/d/…" value="${esc(st.importedFrom||'')}">
      <small class="hint" style="margin:4px 0 0">${st.importedAt?'Utoljára importálva: '+esc(st.importedAt)+'. ':''}Az „Ettől a hónaptól” előtti hónap-füleket (pl. „Október 26”) hozza át: bevételek, kiadások, a nyitó egyenleg és a tagi kölcsön. Újraimportáláskor a korábban importált sorokat lecseréli, a kézzel felvetteket megtartja.</small>
      <button class="btn outline small" type="button" data-action="fin-import" style="margin-top:8px">⬇️ Importálás most</button></div>
  </div>`,{submitLabel:'Mentés',submit:async fd=>{
    const d={profitPct:Number(String(fd.get('profitPct')).replace(',','.')),ceoPct:Number(String(fd.get('ceoPct')).replace(',','.')),marketingPct:Number(String(fd.get('marketingPct')).replace(',','.')),
      appFromMonth:fd.get('appFromMonth')||'',openMonth:fd.get('openMonth')||'',openRezsi:signedVal(fd.get('openRezsi')),openMarketing:signedVal(fd.get('openMarketing'))};
    if(await finCall('finSettings',d,'Beállítások mentve'))closeModal();}});}
async function finImport(){const url=($('m-importUrl')||{}).value||'',from=($('m-appFromMonth')||{}).value||'';
  if(!/^https:\/\/docs\.google\.com\/spreadsheets\//.test(url.trim())){toast('Add meg a régi táblázat linkjét.',true);return;}
  if(!/^\d{4}-\d{2}$/.test(from)){toast('Add meg, melyik hónaptól számoljon az app.',true);return;}
  const b=document.querySelector('[data-action="fin-import"]');if(b){b.disabled=true;b.textContent='Importálás… (fél perc is lehet)';}
  try{const d=await call('finImport',{url:url.trim(),appFromMonth:from});closeModal();finApply(d);const i=d.imported||{};
    toast(`Importálva: ${i.months} hónap, ${i.income} bevételi sor, ${i.expense} kiadás${i.fixes?', '+i.fixes+' havi fix tétel':''}, ${i.loans} kölcsöntétel.`);}
  catch(e){handleErr(e);if(b){b.disabled=false;b.textContent='⬇️ Importálás most';}}}
/* Bank: kölcsönnél OTP vagy Revolut, visszafizetésnél Binx is */
const LOAN_BANKS={be:['OTP','Revolut'],vissza:['Binx','OTP','Revolut']};
const loanBank=l=>l.bank||((/\b(binx|otp|revolut)\b/i.exec(l.note||'')||[])[1]||'').replace(/^./,c=>c.toUpperCase()).replace(/^Otp$/,'OTP');   // régi tételeknél a megjegyzésből
const bankOpts=k=>(LOAN_BANKS[k]||LOAN_BANKS.be).map(b=>`<option value="${b}">${b}</option>`).join('');
function finLoanModal(){openModal('Tagi kölcsön – új tétel',`<div class="fields">
    ${ms('kind','Típus',[['be','Kölcsön a cégnek'],['vissza','Cég visszafizeti']],'be')}
    ${mf('date','Dátum',{type:'date',v:todayISO()})}
    ${moneyField('amount','Összeg',null,{steps:false})}
    <div class="field"><label for="m-bank">Bank</label><select class="inp" id="m-bank" name="bank">${bankOpts('be')}</select></div>
    ${mf('note','Megjegyzés',{full:true,max:300})}</div>`,{submitLabel:'Mentés',submit:async fd=>{
    const row={kind:fd.get('kind'),date:fd.get('date'),amount:num(moneyVal(fd.get('amount'))),bank:String(fd.get('bank')||''),note:String(fd.get('note')||'').trim()};
    if(!row.amount){toast('Add meg az összeget.',true);return;}
    if(await finCall('finUpsert',{table:'loan',row},'Tétel mentve'))closeModal();}});}
Object.assign(ACT,{
  'fin-settings':()=>finSettingsModal(),
  'fin-import':()=>finImport(),
  'fin-income-new':()=>finIncomeModal(null),
  'fin-income-edit':b=>{const r=((S.fin&&S.fin.income)||[]).find(x=>x.id===b.dataset.id);if(r)finIncomeModal(r);},
  'fin-income-del':b=>{const id=b.dataset.id;confirmModal('Bevétel törlése','Biztosan törlöd ezt a bevételi sort?','Törlés',()=>finCall('finDelete',{table:'income',id},'Törölve'));},
  'fin-exp-new':()=>finExpenseModal(null),
  'fin-exp-edit':b=>{const e=((S.fin&&S.fin.expense)||[]).find(x=>x.id===b.dataset.id);if(e)finExpenseModal(e);},
  'fin-exp-del':b=>{const e=((S.fin&&S.fin.expense)||[]).find(x=>x.id===b.dataset.id);if(!e)return;const m=S.finMonth;
    if(e.kind==='fix'&&e.from<m){confirmModal('Fix kiadás megszüntetése',`A(z) „${e.name}” ${F_YM.format(toDate(m+'-01'))}-tól már nem jelenik meg; a korábbi hónapokban megmarad.`,'Megszüntetés',()=>finCall('finUpsert',{table:'expense',row:Object.assign({},e,{to:shiftMonth(m,-1)})},'Megszüntetve'));}
    else confirmModal('Kiadás törlése','Biztosan törlöd ezt a kiadást?','Törlés',()=>finCall('finDelete',{table:'expense',id:e.id},'Törölve'));},
  'fin-loan-new':()=>finLoanModal(),
  'fin-loan-del':b=>{const id=b.dataset.id;confirmModal('Tétel törlése','Biztosan törlöd ezt a tagi kölcsön tételt?','Törlés',()=>finCall('finDelete',{table:'loan',id},'Törölve'));}
});
document.addEventListener('change',async e=>{const t=e.target;
  if(t.id==='fin-month'){S.finMonth=t.value;render(true);return;}
  if(t.id==='m-kind'&&$('m-bank')){const b=$('m-bank'),cur=b.value;b.innerHTML=bankOpts(t.value);if([...b.options].some(o=>o.value===cur))b.value=cur;return;}   // a bank-lista a típushoz igazodik
  if(t.dataset&&t.dataset.finpay){const id=t.dataset.id,v=t.value;
    if(t.dataset.finpay==='project'){try{await call('finSetPay',{projectId:id,payStatus:v});const p=projById(id);if(p)p.payStatus=v;if(S.draft&&S.draft.id===id)S.draft.payStatus=v;render(true);toast('Fizetési állapot: '+PAY_LABEL[v]);}catch(err){handleErr(err);render(true);}}
    else{const r=((S.fin&&S.fin.income)||[]).find(x=>x.id===id);if(r)finCall('finUpsert',{table:'income',row:Object.assign({},r,{payStatus:v})},'Fizetési állapot: '+PAY_LABEL[v]);}}
});

/* ===== Számlázás (számlázz.hu): kiállítás, hozzárendelés, kifizetések követése ===== */
const szOn=()=>!!(S.fin&&S.fin.sz);
const SZ_VATS=[['27','27%'],['18','18%'],['5','5%'],['0','0%'],['AAM','AAM – alanyi adómentes'],['TAM','TAM – tárgyi adómentes'],['EUK','EUK – EU-n belüli'],['MAA','MAA – mentes az adó alól']];
const invFor=(kind,id)=>((S.fin&&S.fin.invoices)||[]).filter(x=>kind==='project'?x.projectId===id:x.incomeId===id);
const invState=x=>{const g=num(x.invGross),p=num(x.invPaid);if(g&&p>=g-1)return 'paid';if(p>0)return 'part';return x.due&&x.due<todayISO()?'late':'open';};
const INV_CLS={paid:'p-ok',part:'p-info',late:'p-bad',open:'p-warn'};
const invChip=x=>{const s=invState(x);return `<button class="statuspill inv-chip ${INV_CLS[s]}" type="button" data-action="sz-inv" data-id="${esc(x.id)}" title="${esc((x.kind==='dijbekero'?'Díjbekérő':'Számla')+' · '+(x.buyer||'')+' · bruttó '+ftFmt(num(x.invGross)))}">${x.kind==='dijbekero'?'D ':''}${esc(x.no)} ${s==='paid'?'✓':s==='part'?'½':s==='late'?'⚠':'…'}</button>`;};
const invCell=r=>`<div class="inv-cell">${invFor(r.kind,r.id).map(invChip).join('')}<button class="linkbtn inv-new" type="button" data-action="sz-new" data-kind="${esc(r.kind)}" data-id="${esc(r.id)}" title="Számla kiállítása vagy meglévő hozzárendelése">🧾${invFor(r.kind,r.id).length?'':' Számla'}</button></div>`;
function szBillingEmail(cl,p){const m=/Számlázási e-mail:\s*([^;\n]+)/i.exec((cl&&cl.note)||'');const first=m?m[1].split(/[,\s]+/).find(x=>x.includes('@')):'';return first||(cl&&cl.contactEmail)||(p&&p.contactEmail)||'';}
function szSplitAddr(a){const m=/^\s*(\d{4})\s+([^,]+),\s*(.+)$/.exec(a||'');return m?{zip:m[1],city:m[2].trim(),address:m[3].trim()}:{zip:'',city:'',address:String(a||'').trim()};}
function szTargetInfo(kind,id){
  if(kind==='project'){const p=projById(id);if(!p)return null;const cl=(S.clients||[]).find(c=>c.name===p.client)||null,a=szSplitAddr(p.clientAddress||(cl&&cl.address));
    const r=pr(p);return {kind,id,name:p.name||'Projekt',net:num(p.projectValue),fulfill:(r&&(r.end||r.start))||todayISO(),buyer:Object.assign({name:p.client||'',tax:p.clientTax||(cl&&cl.tax)||'',email:szBillingEmail(cl,p)},a)};}
  const r=((S.fin&&S.fin.income)||[]).find(x=>x.id===id);if(!r)return null;
  const d=String(parseInt(r.day,10)||1).padStart(2,'0'),f=r.month?r.month+'-'+d:todayISO();
  return {kind:'income',id,name:r.name,net:num(r.amount),fulfill:f,buyer:{name:'',tax:'',email:'',zip:'',city:'',address:''}};}
function szItemRow(it,i){const st=S.fin.sz;return `<div class="sz-item" data-szitem="${i}">
  <input class="inp" name="it_name" value="${esc(it.name||'')}" placeholder="Megnevezés" aria-label="Tétel megnevezése" maxlength="300">
  <input class="inp" name="it_qty" value="${esc(it.qty??1)}" inputmode="decimal" aria-label="Mennyiség">
  <input class="inp" name="it_unit" value="${esc(it.unit||st.unit)}" aria-label="Mennyiségi egység" maxlength="20">
  <input class="inp" name="it_price" value="${esc(moneyFmt(it.price))}" inputmode="numeric" data-money="1" placeholder="Nettó egységár" aria-label="Nettó egységár">
  <select class="inp" name="it_vat" aria-label="ÁFA">${SZ_VATS.map(([v,l])=>`<option value="${v}"${v===(it.vat||st.vat)?' selected':''}>${l}</option>`).join('')}</select>
  <button class="trash" type="button" data-action="sz-item-del" aria-label="Tétel törlése">🗑️</button></div>`;}
function szReadItems(){return [...document.querySelectorAll('[data-szitem]')].map(el=>({name:el.querySelector('[name=it_name]').value.trim(),qty:Number(String(el.querySelector('[name=it_qty]').value).replace(',','.'))||0,
  unit:el.querySelector('[name=it_unit]').value.trim(),price:num(moneyVal(el.querySelector('[name=it_price]').value)),vat:el.querySelector('[name=it_vat]').value}));}
function szTotals(){const its=szReadItems();let net=0,vat=0;its.forEach(it=>{const n=Math.round(it.price*it.qty);net+=n;vat+=/^\d+$/.test(it.vat)?Math.round(n*Number(it.vat)/100):0;});
  const el=$('sz-total');if(el)el.innerHTML=`Nettó <b>${ftFmt(net)}</b> · ÁFA <b>${ftFmt(vat)}</b> · Bruttó <b>${ftFmt(net+vat)}</b>`;return {net,vat,gross:net+vat};}
function szInvoiceModal(kind,id){
  const t=szTargetInfo(kind,id),st=S.fin&&S.fin.sz;if(!t||!st)return;
  if(!st.hasKey){szSettingsModal('Az Agent-kulcs megadása után tudsz számlát kiállítani.');return;}
  const done=invFor(kind,id).filter(x=>x.kind!=='dijbekero').reduce((s,x)=>s+num(x.invNet),0),rest=Math.max(0,t.net-done);
  const b=t.buyer,cls=(S.clients||[]).slice().sort((x,y)=>x.name.localeCompare(y.name,'hu'));
  openModal('Számla kiállítása – '+t.name,`<div class="fields">
    ${ms('kind','Típus',[['szamla','Számla'],['dijbekero','Díjbekérő']],'szamla')}
    <div class="field"><label for="m-szClient">Vevő az ügyfelek közül</label><select class="inp" id="m-szClient"><option value="">— kézi megadás —</option>${cls.map(c=>`<option value="${esc(c.id)}"${c.name===b.name?' selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
    ${mf('bName','Vevő neve',{full:true,v:b.name,max:200})}
    ${mf('bTax','Adószám (magánszemélynél üres)',{v:b.tax,max:20,ph:'12345678-2-42'})}
    ${mf('bEmail','E-mail (ide megy a számla)',{v:b.email,max:300,type:'email'})}
    ${mf('bZip','Irányítószám',{v:b.zip,max:10,im:'numeric'})}${mf('bCity','Település',{v:b.city,max:80})}
    ${mf('bAddr','Cím',{full:true,v:b.address,max:200})}
    <div class="field full"><span class="lbl">Tételek (nettó egységár)</span><div class="sz-items" id="sz-items">${szItemRow({name:t.name,qty:1,price:rest},0)}</div>
      <button class="linkbtn" type="button" data-action="sz-item-add" style="align-self:flex-start">+ Tétel</button>
      <div class="sz-total" id="sz-total"></div>${done?`<small class="hint" style="margin:0">Erre már kiállítottál ${ftFmt(done)} nettó értékű számlát – a tétel a maradékkal van kitöltve.</small>`:''}</div>
    ${mf('fulfill','Teljesítés dátuma',{type:'date',v:t.fulfill})}${mf('due','Fizetési határidő',{type:'date',v:addDays(todayISO(),st.dueDays)})}
    ${ms('payMethod','Fizetési mód',['Átutalás','Készpénz','Bankkártya'],st.payMethod)}
    <div class="field"><span class="lbl">Küldés</span><div class="rolepick"><label><input type="checkbox" name="eInvoice"${st.eInvoice?' checked':''}> E-számla</label><label><input type="checkbox" name="sendEmail"${st.sendEmail?' checked':''}> E-mailben a vevőnek</label></div></div>
    <div class="field full"><label for="m-comment">Megjegyzés a számlán</label><textarea class="inp" id="m-comment" name="comment" rows="2" maxlength="1000">${esc(st.comment||'')}</textarea></div>
  </div>`,{left:`<button type="button" class="btn outline small" data-action="sz-link" data-kind="${esc(kind)}" data-id="${esc(id)}">Meglévő számla hozzárendelése</button>`,submitLabel:'Tovább',submit:async fd=>{
    const items=szReadItems(),tot=szTotals();
    const a={[kind==='project'?'projectId':'incomeId']:id,kind:fd.get('kind'),buyer:{name:String(fd.get('bName')||'').trim(),tax:String(fd.get('bTax')||'').trim(),email:String(fd.get('bEmail')||'').trim(),
      zip:String(fd.get('bZip')||'').trim(),city:String(fd.get('bCity')||'').trim(),address:String(fd.get('bAddr')||'').trim()},items,fulfill:fd.get('fulfill'),due:fd.get('due'),payMethod:fd.get('payMethod'),
      comment:String(fd.get('comment')||'').trim(),eInvoice:!!fd.get('eInvoice'),sendEmail:!!fd.get('sendEmail')};
    if(a.buyer.name.length<2||!a.buyer.zip||!a.buyer.city||!a.buyer.address){toast('Add meg a vevő nevét és teljes címét.',true);return;}
    if(!items.length||items.some(it=>it.name.length<2||!it.qty)){toast('Minden tételnek legyen megnevezése és mennyisége.',true);return;}
    if(!tot.net){toast('A számla összege 0 Ft.',true);return;}
    const what=a.kind==='dijbekero'?'díjbekérőt':'számlát';
    openModal('Biztosan kiállítod?',`<p style="margin:0">${a.kind==='dijbekero'?'Díjbekérő':'Számla'} <b>${esc(a.buyer.name)}</b> részére: nettó <b>${ftFmt(tot.net)}</b>, bruttó <b>${ftFmt(tot.gross)}</b>, határidő ${esc(a.due)}.</p>
      <p class="hint" style="margin:8px 0 0">${a.kind==='dijbekero'?'':'A számla a kiállítással bekerül a NAV-hoz, utólag csak sztornózni lehet. '}${a.sendEmail&&a.buyer.email?'A számlázz.hu elküldi e-mailben: '+esc(a.buyer.email)+'.':'E-mailt nem küldünk.'}</p>`,
      {submitLabel:'Kiállítás',submit:async()=>{const btn=document.querySelector('#mform button[type=submit]');if(btn){btn.disabled=true;btn.textContent='Kiállítás…';}
        try{const d=await call('szInvoice',a);closeModal();finApply(d);toast(`${a.kind==='dijbekero'?'Díjbekérő':'Számla'} kiállítva: ${d.invoice&&d.invoice.no}`);}
        catch(e){handleErr(e);if(btn){btn.disabled=false;btn.textContent='Kiállítás';}}}});}});
  szTotals();}
function szLinkModal(kind,id){const t=szTargetInfo(kind,id);if(!t)return;
  openModal('Meglévő számla hozzárendelése',`<div class="fields">${mf('no','Számlaszám',{full:true,max:60,ph:'pl. E-LUMOS-2026-123'})}</div>
    <p class="hint" style="margin:0">A számlázz.hu-ban már kiállított számlát kapcsolja ehhez: <b>${esc(t.name)}</b>. Az összeg és a kifizetések onnan töltődnek be, és a fizetési állapot magától követi.</p>`,
    {submitLabel:'Hozzárendelés',submit:async fd=>{const no=String(fd.get('no')||'').trim();if(!no){toast('Add meg a számlaszámot.',true);return;}
      try{const d=await call('szLink',{[kind==='project'?'projectId':'incomeId']:id,no});closeModal();finApply(d);toast('Számla hozzárendelve: '+(d.invoice&&d.invoice.no));}catch(e){handleErr(e);}}});}
function szInvModal(x){const s=invState(x),g=num(x.invGross),p=num(x.invPaid);
  const tgt=x.projectId?(projById(x.projectId)||{}).name:(((S.fin.income||[]).find(r=>r.id===x.incomeId))||{}).name;
  openModal((x.kind==='dijbekero'?'Díjbekérő ':'Számla ')+x.no,`<div class="sz-info">
    <div><span>Vevő</span><b>${esc(x.buyer||'—')}</b></div><div><span>Ehhez tartozik</span><b>${esc(tgt||'—')}</b></div>
    <div><span>Kelt</span><b>${esc(x.date||'—')}</b></div><div><span>Fizetési határidő</span><b class="${s==='late'?'bad-txt':''}">${esc(x.due||'—')}</b></div>
    <div><span>Nettó / bruttó</span><b>${ftFmt(num(x.invNet))} / ${ftFmt(g)}</b></div>
    <div><span>Kifizetve</span><b class="${s==='paid'?'ok-txt':''}">${ftFmt(p)}${x.paidAt?' · '+esc(x.paidAt):''}</b></div>
    <div><span>Állapot</span><b><span class="statuspill ${INV_CLS[s]}">${{paid:'Kifizetve',part:'Részben fizetve',late:'Lejárt, nincs kifizetve',open:'Fizetésre vár'}[s]}</span></b></div>
    <div><span>Utoljára ellenőrizve</span><b>${esc(x.checkedAt||'—')}</b></div></div>`,
  {left:`<button type="button" class="btn danger small" data-action="sz-unlink" data-id="${esc(x.id)}">Hozzárendelés törlése</button>`,cancelLabel:'Bezárás',submitLabel:'⬇️ PDF',submit:async()=>{
    const btn=document.querySelector('#mform button[type=submit]');if(btn){btn.disabled=true;btn.textContent='Letöltés…';}
    try{const d=await call('szPdf',{id:x.id});const bin=atob(d.b64),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
      const url=URL.createObjectURL(new Blob([arr],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download=d.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
    catch(e){handleErr(e);}finally{if(btn){btn.disabled=false;btn.textContent='⬇️ PDF';}}}});
  const f=document.querySelector('#mform .mfoot');if(f){const r=document.createElement('button');r.type='button';r.className='btn outline';r.dataset.action='sz-sync-one';r.dataset.id=x.id;r.textContent='🔄 Frissítés';f.insertBefore(r,f.querySelector('button[type=submit]'));}}
function szSettingsModal(msg){const st=(S.fin&&S.fin.sz)||{},ipn=st.ipnToken?String(window.LUMOS_API_URL||'')+'?ipn='+st.ipnToken:'';
  openModal('Számlázás – számlázz.hu',`${msg?`<p class="hint" style="margin:0 0 12px">${esc(msg)}</p>`:''}<div class="fields">
    <div class="field full"><label for="m-agentKey">Számla Agent-kulcs ${st.hasKey?'<span class="statuspill p-ok">✓ beállítva</span>':'<span class="statuspill p-warn">nincs megadva</span>'}</label>
      <input class="inp" id="m-agentKey" name="agentKey" type="password" autocomplete="off" placeholder="${st.hasKey?'Csak ha cserélni szeretnéd':'Másold be a számlázz.hu-ból'}">
      <small class="hint" style="margin:4px 0 0">számlázz.hu → Beállítások → Számla Agent kulcsok → Új kulcs. A kulcs csak a háttérkódban tárolódik, a felület nem kapja vissza.</small></div>
    <div class="field full"><label for="m-ipnUrl">IPN üzenet internetcíme – a fizetési értesítésekhez</label>
      <div class="tax-row"><input class="inp" id="m-ipnUrl" readonly value="${esc(ipn||'Mentés után jelenik meg')}"><button class="btn outline small" type="button" data-action="sz-copy-ipn"${ipn?'':' disabled'}>Másolás</button></div>
      <small class="hint" style="margin:4px 0 0">Másold be a számlázz.hu-ban: Beállítások → Fiók beállításai → Számlázási alapadatok → <b>IPN üzenet internetcíme</b>, majd Mentés. Ha egy számla kifizetése rögzül (banki párosítás vagy kézi jóváírás), néhány percen belül itt is „fizetve” lesz. Biztonsági okból az app ilyenkor visszakérdez a számlázz.hu-tól.</small></div>
    ${mf('dueDays','Fizetési határidő (nap)',{v:st.dueDays??8,im:'numeric'})}
    ${ms('vat','Alapértelmezett ÁFA',SZ_VATS,st.vat||'27')}
    ${mf('unit','Mennyiségi egység',{v:st.unit||'db',max:20})}
    ${ms('payMethod','Fizetési mód',['Átutalás','Készpénz','Bankkártya'],st.payMethod||'Átutalás')}
    <div class="field full"><div class="rolepick"><label><input type="checkbox" name="eInvoice"${st.eInvoice!==false?' checked':''}> E-számla</label><label><input type="checkbox" name="sendEmail"${st.sendEmail!==false?' checked':''}> E-mailben a vevőnek</label></div></div>
    <div class="field full"><label for="m-comment">Alapértelmezett megjegyzés a számlán</label><textarea class="inp" id="m-comment" name="comment" rows="2" maxlength="500">${esc(st.comment||'')}</textarea></div>
  </div>`,{submitLabel:'Mentés',submit:async fd=>{
    const d={agentKey:String(fd.get('agentKey')||'').trim(),dueDays:Number(fd.get('dueDays')),vat:fd.get('vat'),unit:String(fd.get('unit')||'').trim(),payMethod:fd.get('payMethod'),eInvoice:!!fd.get('eInvoice'),sendEmail:!!fd.get('sendEmail'),comment:String(fd.get('comment')||'').trim()};
    const r=await finCall('szSettings',d,'Számlázási beállítások mentve');if(r){if(!ipn&&r.sz&&r.sz.ipnToken)szSettingsModal();else closeModal();}}});}
async function szSync(silent,id){if(!szOn()||!S.fin.sz.hasKey||S._szSyncing)return;S._szSyncing=true;if(!silent)render(true);
  try{const d=await call('szSync',id?{id}:{});finApply(d);const c=(d.synced&&d.synced.changed)||[];
    if(c.length)toast('Új kifizetés: '+c.map(x=>x.no+(x.buyer?' ('+x.buyer+')':'')).join(', '));else if(!silent)toast('A kifizetések naprakészek.');
    if(!silent&&d.synced&&d.synced.errors&&d.synced.errors.length)toast(d.synced.errors[0],true);}
  catch(e){if(!silent)handleErr(e);}finally{S._szSyncing=false;if(S.tab==='penzugy')render(true);}}
Object.assign(ACT,{
  'sz-new':b=>{const k=b.dataset.kind,id=b.dataset.id;if(!S.fin.sz.hasKey){szSettingsModal('Az Agent-kulcs megadása után tudsz számlát kiállítani.');return;}szInvoiceModal(k,id);},
  'sz-link':b=>szLinkModal(b.dataset.kind,b.dataset.id),
  'sz-inv':b=>{const x=((S.fin&&S.fin.invoices)||[]).find(i=>i.id===b.dataset.id);if(x)szInvModal(x);},
  'sz-unlink':b=>{const id=b.dataset.id;confirmModal('Hozzárendelés törlése','A számla az appból kikerül, a számlázz.hu-ban változatlanul megmarad (sztornózni ott tudod).','Törlés',()=>finCall('szUnlink',{id},'Hozzárendelés törölve'));},
  'sz-sync':()=>szSync(false),
  'sz-sync-one':b=>{closeModal();szSync(false,b.dataset.id);},
  'sz-settings':()=>szSettingsModal(),
  'sz-copy-ipn':()=>copyText(($('m-ipnUrl')||{}).value||'','IPN cím vágólapra másolva'),
  'sz-item-add':()=>{const box=$('sz-items');if(!box)return;box.insertAdjacentHTML('beforeend',szItemRow({name:'',qty:1,price:''},box.children.length));szTotals();},
  'sz-item-del':b=>{const box=$('sz-items');if(box&&box.children.length>1){b.closest('[data-szitem]').remove();szTotals();}else toast('Legalább egy tétel kell.',true);}
});
document.addEventListener('input',e=>{if(e.target.closest&&e.target.closest('#sz-items'))szTotals();});
document.addEventListener('change',e=>{const t=e.target;if(t.closest&&t.closest('#sz-items'))szTotals();
  if(t.id==='m-szClient'){const c=(S.clients||[]).find(x=>x.id===t.value);if(!c)return;const a=szSplitAddr(c.address);
    [['m-bName',c.name],['m-bTax',c.tax],['m-bEmail',szBillingEmail(c,null)],['m-bZip',a.zip],['m-bCity',a.city],['m-bAddr',a.address]].forEach(([k,v])=>{if($(k))$(k).value=v||'';});}});
