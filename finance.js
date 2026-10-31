'use strict';
/* ===== Bevétel és kiadás (csak ügyvezető) – a régi „Lumos Motion Árbevétel” táblázat kiváltása =====
   Bevétel projektenként: díjazás → nyereség % + értékesítés % + marketing % + termelési költség, a maradék az Eszköz/Rezsi alapba.
   A rezsi- és marketingkiadások ezekből az alapokból mennek, az egyenleg hónapról hónapra áthozódik.
   A beállított hónaptól („app számol”) a projektekből számolunk, előtte a régi táblázatból importált sorokból. */
const PAY_LABEL={'':'—',var:'Fizetésre vár',eloleg:'Foglaló fizetve',teljes:'Teljes fizetve'};
const PAY_CLS={'':'',var:'p-warn',eloleg:'p-info',teljes:'p-ok'};
const FUND_LABEL={rezsi:'Eszközköltség, rezsi',marketing:'Marketing költség'};
const finOn=()=>isAdmin()&&!!(S.capabilities&&S.capabilities.finance);
const sFt=n=>(n<0?'−':'')+ftFmt(Math.abs(n));
const signedVal=s=>{const t=String(s||'').replace(/\s/g,'');if(!t)return 0;const neg=/^[-−]/.test(t),d=t.replace(/\D/g,'');return d?(neg?-1:1)*Number(d):0;};
/* Betöltés / hiba: hibánál nem próbálkozunk újra magától (különben végtelen újratöltés lenne), csak gombra */
function finLoadingView(){if(S.finErr)return `<div class="panel">${empty('Nem sikerült betölteni: '+esc(S.finErr))}<div class="btns"><button class="btn primary" type="button" data-action="fin-retry">Újrapróbálás</button></div></div>`;
  finLoad();return '<div class="loading"><span class="spin"></span>Betöltés…</div>';}
async function finLoad(force){if(S.fin&&!force)return;if(S._finLoading)return;S._finLoading=true;const mut0=S._finMut||0;
  try{const d=await call('finData');if((S._finMut||0)!==mut0&&S.fin){S._finLoading=false;setTimeout(()=>finLoad(true),1500);return;}   // közben módosítottál: a régebbi adat ne írja felül
    S.fin=d;S.finErr='';}catch(e){S.fin=null;S.finErr=errText(e)||'Hiba';handleErr(e);}finally{S._finLoading=false;if(S.tab==='penzugy'||S.tab==='szerzodes'||(S.tab==='ugyfelek'&&!$('modalRoot').innerHTML))render(true);
    else if(S.tab==='projektek'&&S.projectId&&$('proj-bill')&&typeof projBillingPanel==='function'){const p=S.draft||projById(S.projectId);$('proj-bill').outerHTML=projBillingPanel(p)||'';}}
  const sz=S.fin&&S.fin.sz;if(sz&&sz.hasKey&&!S._szAuto&&(S.fin.invoices||[]).some(x=>num(x.invPaid)<num(x.invGross)-1)){S._szAuto=true;szSync(true);}}   // betöltéskor egyszer csendben frissítjük a kifizetéseket
const FIN_KEYS=['income','expense','loan','settings','invoices','billing','frameworks','tigs','sz'];
function finApply(d){const part={};FIN_KEYS.forEach(k=>{if(d&&d[k]!==undefined)part[k]=d[k];});S.fin=Object.assign({},S.fin||{},part);   // a szerver csak a módosult táblát küldi vissza
  (d.invoices||[]).forEach(x=>invPids(x).forEach(pid=>{const p=projById(pid);if(p){const st=szPayOf(pid);if(st)p.payStatus=st;}}));render(true);}
/* Közös számla: a fő projekt + a projectIds-ben felsorolt további projektek; a projekt részaránya a projektértékek arányában */
const invPids=x=>[x.projectId,...String(x.projectIds||'').split(',')].filter(Boolean);
const invShared=x=>invPids(x).length>1;
function invShare(x,pid){const ids=invPids(x);if(ids.length<2||!ids.includes(pid))return 1;const v=ids.map(id=>projTotal(projById(id)||{})),sum=v.reduce((a,b)=>a+b,0);return sum?v[ids.indexOf(pid)]/sum:1/ids.length;}
const invPaidOk=x=>(x.kind==='eloleg'&&!!x.manual)||(num(x.invGross)>0&&num(x.invPaid)>=num(x.invGross)-1);   // a kézi foglalószámla a befizetés után készül, tehát kifizetett
const szPayOf=pid=>{const l=((S.fin&&S.fin.invoices)||[]).filter(x=>invPids(x).includes(pid));if(!l.length)return '';const fin=l.filter(x=>x.kind==='szamla'||x.kind==='vegszamla'||!x.kind),adv=l.filter(x=>x.kind==='dijbekero'||x.kind==='eloleg'),any=a=>a.some(x=>num(x.invPaid)>0||invPaidOk(x));
  if(fin.length)return fin.every(invPaidOk)?'teljes':any(fin)||any(adv)?'eloleg':'var';return any(adv)?'eloleg':'var';};
const finSet=()=>(S.fin&&S.fin.settings)||{profitPct:30,ceoPct:5,marketingPct:5,openMonth:'',openRezsi:0,openMarketing:0,appFromMonth:''};
/* Egy projekt felosztása */
const ovPct=v=>v===''||v==null||!isFinite(Number(v))?null:Number(v);
function finProjectRow(p){const st=finSet(),amount=projTotal(p),prod=Math.round(feeSum(p));
  const b=typeof billOf==='function'?billOf(p.id):{},cp=ovPct(b.ceoPct),rp=ovPct(b.rezsiPct);   // projektenként egyedi értékesítés / eszköz-rezsi %
  const ceo=Math.round(amount*(cp??st.ceoPct)/100),marketing=Math.round(amount*st.marketingPct/100);
  let profit,rezsi;if(rp!=null){rezsi=Math.round(amount*rp/100);profit=amount-prod-ceo-marketing-rezsi;}else{profit=Math.round(amount*st.profitPct/100);rezsi=amount-profit-ceo-marketing-prod;}
  return {kind:'project',p,id:p.id,day:String(Number(pr(p).start.slice(8))),name:p.name||'Névtelen projekt',payStatus:p.payStatus||'',amount,prod,profit,ceo,marketing,rezsi,ceoOv:cp!=null,rezsiOv:rp!=null};}
/* Régi táblázat sora ↔ projekt: közös jellemző szó a névben (ügyfél, helyszín is számít), a gyakori szavak nélkül */
const LEG_STOP=new Set('technikai ugyelet konferencia rendezveny webinar stream short video videok forgatas podcast hibrid masodik eloadas youtube napja workshop kiallitas esemeny budapest hungary kft zrt bt nonprofit egyesulet alapitvany tagozat levelezo akademia gala unnepseg evzaro fesztival expo talalkozo csoportos and the of az es db 2024 2025 2026 2027 ak tal csop ut utca ter krt hotel center etterem kavehaz'.split(' '));
const legTok=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').split(' ').filter(w=>w.length>=2&&!LEG_STOP.has(w));
const legHit=(a,b)=>a.some(x=>b.some(y=>x===y||(x.length>=5&&y.startsWith(x))||(y.length>=5&&x.startsWith(y))));
function finIncomeFor(m){const st=finSet(),fin=S.fin||{},appFrom=st.appFromMonth;
  const fromApp=!appFrom||m>=appFrom;
  const legT=fromApp?[]:(fin.income||[]).filter(r=>r.month===m&&r.legacy).map(r=>legTok(r.name));
  const proj=S.projects.filter(p=>p.status!=='lemondva'&&pr(p)&&pr(p).start.slice(0,7)===m&&(projTotal(p)||feeSum(p))&&(fromApp||!legT.some(l=>legHit(legTok([p.name,p.client,p.venue].join(' ')),l)))).map(finProjectRow);   // régi hónapban: az a projekt is, amely nincs a régi táblázatban
  const manual=(fin.income||[]).filter(r=>r.month===m&&(r.legacy?!fromApp:true)).map(r=>Object.assign({kind:'manual'},r,{amount:num(r.amount),prod:num(r.prod),profit:num(r.profit),ceo:num(r.ceo),marketing:num(r.marketing),rezsi:Number(r.rezsi)||0}));
  const dayN=x=>parseInt(x.day,10)||99;
  return proj.concat(manual).sort((a,b)=>dayN(a)-dayN(b)||a.name.localeCompare(b.name,'hu'));}
/* Régi / kézi bevételi sor projektje: az appból frissített sor megjegyzése vagy azonos nevű projekt ugyanabban a hónapban */
function incProj(r){const m=/^Az appból frissítve: (.+?)(?: \| |$)/.exec(r.note||''),n=(m?m[1]:r.name||'').trim();if(!n)return null;
  return S.projects.find(p=>p.name===n&&pr(p)&&pr(p).start.slice(0,7)===r.month)||null;}
/* Egy bevételi sorból beérkezett (nettó) összeg: teljes fizetés = díjazás; foglalónál a számlák kifizetett része, ennek hiányában a foglaló %-a */
/* Fizetési állapot a bizonylatokból (projekt / régi bevételi sor); ha nincs bizonylat, a régi kézi állapot */
function finPayOf(r){const lp=r.kind==='project'?null:incProj(r),pid=r.kind==='project'?r.id:lp&&lp.id;const st=pid?szPayOf(pid):(()=>{const l=invFor('income',r.id);if(!l.length)return '';const fin=l.filter(x=>x.kind==='szamla'||x.kind==='vegszamla'||!x.kind),adv=l.filter(x=>x.kind==='dijbekero'||x.kind==='eloleg'),any=a=>a.some(x=>num(x.invPaid)>0||invPaidOk(x));return fin.length?(fin.every(invPaidOk)?'teljes':any(fin)||any(adv)?'eloleg':'var'):any(adv)?'eloleg':'var';})();return st||r.payStatus||'';}
function finReceived(r){const ps=finPayOf(r);if(ps==='teljes')return num(r.amount);if(ps!=='eloleg')return 0;
  const inv=invFor(r.kind,r.id).filter(x=>num(x.invGross)>0&&!(x.kind==='dijbekero'&&x.ref));
  if(inv.length)return Math.min(num(r.amount),Math.round(inv.reduce((s,x)=>s+(invPaidOk(x)?num(x.invGross):num(x.invPaid))*num(x.invNet)/num(x.invGross)*(r.kind==='project'?invShare(x,r.id):1),0)));
  const pct=r.kind==='project'&&typeof billOf==='function'?num(billOf(r.id).advancePct):50;return Math.round(num(r.amount)*(pct||50)/100);}
/* Duplikált kiadások: ismétlődőre állított tétel mellett ugyanaz (név + alap + összeg) egyszeriként, vagy kétszer fixként.
   A fix tételt megtartjuk (a legkorábbi kezdettel, a leghosszabb tartammal), a fölösleges sorokat töröljük. */
function finExpDupes(){const all=((S.fin&&S.fin.expense)||[]),key=e=>String(e.name||'').trim().toLowerCase()+'|'+(e.fund==='marketing'?'m':'r')+'|'+num(e.amount),groups={},upd=[],del=[];
  all.filter(e=>e.kind==='fix'&&e.from).forEach(e=>{(groups[key(e)]=groups[key(e)]||[]).push(e);});
  const keep={};Object.entries(groups).forEach(([k,g])=>{g.sort((a,b)=>String(a.from).localeCompare(String(b.from)));const k0=Object.assign({},g[0]);let ch=false;
    g.slice(1).forEach(x=>{if(k0.to&&x.from>shiftMonth(k0.to,1))return;del.push(x.id);ch=true;if(!x.to||!k0.to)k0.to='';else if(x.to>k0.to)k0.to=x.to;});
    if(ch&&k0.to!==(g[0].to||''))upd.push(k0);keep[k]=[k0].concat(g.slice(1).filter(x=>!del.includes(x.id)));});
  all.filter(e=>e.kind!=='fix'&&e.month).forEach(e=>{const g=keep[key(e)];if(g&&g.some(f=>f.from<=e.month&&(!f.to||f.to>=e.month)))del.push(e.id);});
  return {upd,del};}
async function finExpDedupe(){if(S._expDedupe||!S.fin||!S.fin.expense)return;const {upd,del}=finExpDupes();if(!upd.length&&!del.length)return;S._expDedupe=true;
  const before=S.fin.expense.filter(e=>del.includes(e.id)||upd.some(u=>u.id===e.id)).map(clone),ids=before.map(e=>e.id);
  finLocal('expense',upd);del.forEach(id=>finLocal('expense',[{id}],true));render(true);
  try{if(upd.length)finApply(await call('finUpsert',{table:'expense',rows:upd}));for(const id of del)finApply(await call('finDelete',{table:'expense',id}));
    if(typeof opRec==='function')opRec(`duplikált kiadások törlése (${del.length})`,()=>finRestore('expense',ids,before),()=>finRestore('expense',ids,ids.map(id=>{const u=upd.find(x=>x.id===id);return u?clone(u):null;})));
    toast(`${del.length} duplikált kiadás törölve (az ismétlődő tétel megmaradt) – Ctrl+Z visszahozza`);}
  catch(e){handleErr(e);finLoad(true);}finally{S._expDedupe=false;render(true);}}
function finExpensesFor(m){return ((S.fin&&S.fin.expense)||[]).filter(e=>e.kind==='fix'?(e.from&&e.from<=m&&(!e.to||e.to>=m)):e.month===m).sort((a,b)=>(a.kind==='fix'?0:1)-(b.kind==='fix'?0:1)||num(b.amount)-num(a.amount)||a.name.localeCompare(b.name,'hu'));}   // fix elöl, összeg szerint csökkenő
/* A díjazáshoz viszonyított arány (pl. a termelés vagy a megmaradó eszköz-rezsi rész hány %-a a bevételnek) */
const pctOf=(v,base)=>{base=Number(base)||0;if(!base)return '';const x=Math.round(Number(v)/base*100);return `<span class="pct${x<0?' neg':''}">${x<0?'−':''}${Math.abs(x)}%</span>`;};
/* Módosítható %: értékesítés és eszköz-rezsi (a termelés % fix, a díjakból jön). Üresre törölve visszaáll az alapértékre. */
const pctNum=(v,base)=>{base=Number(base)||0;return base?Math.round(Number(v)/base*1000)/10:0;};
function pctIn(r,k){const v=pctNum(r[k],r.amount),ov=k==='ceo'?r.ceoOv:r.rezsiOv;
  return `<input class="pct-in${ov?' ov':''}${v<0?' neg':''}" type="text" inputmode="decimal" value="${String(v).replace('.',',')}" data-finpct="${k}" data-kind="${esc(r.kind)}" data-id="${esc(r.id)}" aria-label="${k==='ceo'?'Értékesítés':'Eszköz, rezsi'} %" title="${ov?'Egyedi érték – üresre törölve visszaáll az alapra':k==='ceo'?'Alapérték a beállításokból – átírhatod':'A maradék – átírva a nyereség igazodik hozzá'}"${r.amount?'':' disabled'}>`;}
async function finSetPct(t){const k=t.dataset.finpct,id=t.dataset.id,kind=t.dataset.kind,raw=String(t.value).trim().replace('%','').replace(',','.');
  const v=raw===''?null:Number(raw);if(v!=null&&(!isFinite(v)||v<0||v>100)){toast('0 és 100 közötti százalékot adj meg.',true);render(true);return;}
  if(kind==='project'){const f=k==='ceo'?'ceoPct':'rezsiPct',val=v==null?'':v;finSave('billSave',{projectId:id,[f]:val},'Mentve',()=>{const b=billOf(id);finLocal('billing',[Object.assign({},b,{id:b.id||newId(),projectId:id,[f]:val})]);});return;}
  const r=((S.fin&&S.fin.income)||[]).find(x=>x.id===id);if(!r)return;const st=finSet(),amount=num(r.amount),prod=num(r.prod),mk=num(r.marketing);
  let ceo=num(r.ceo),profit=num(r.profit),rezsi=Number(r.rezsi)||0;
  if(k==='ceo'){ceo=Math.round(amount*(v??st.ceoPct)/100);rezsi=amount-prod-profit-ceo-mk;}   // értékesítés változott: a maradék (eszköz-rezsi) igazodik
  else{rezsi=v==null?amount-prod-Math.round(amount*st.profitPct/100)-ceo-mk:Math.round(amount*v/100);profit=amount-prod-ceo-mk-rezsi;}   // eszköz-rezsi változott: a nyereség igazodik
  const row=Object.assign({},r,{ceo,profit,rezsi});finSave('finUpsert',{table:'income',row},'Mentve',()=>finLocal('income',[row]));}
document.addEventListener('change',e=>{const t=e.target;if(t.dataset&&t.dataset.finpct)finSetPct(t);});
document.addEventListener('keydown',e=>{const t=e.target;if(e.key==='Enter'&&t.dataset&&t.dataset.finpct){e.preventDefault();t.blur();}});
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
/* Kintlévőség: minden hónap fizetésre váró / foglalós tétele */
function finReceivables(){const months=finMonths();let n=0,sum=0;months.forEach(m=>finIncomeFor(m).forEach(r=>{if(r.payStatus==='var'||r.payStatus==='eloleg'){n++;sum+=r.amount;}}));return {n,sum};}

function viewFinance(){
  if(!finOn())return `<div class="panel">${empty('A Bevétel és kiadás a háttérkód frissítése után érhető el.')}</div>`;
  if(!S.fin)return finLoadingView();
  const months=finMonths(),m=months.includes(S.finMonth)?S.finMonth:todayISO().slice(0,7),st=finSet();S.finMonth=m;
  if(!S._expDedupe&&(finExpDupes().del.length))setTimeout(finExpDedupe,0);   // ismétlődőre állított tételek duplikátumai
  const inc=finIncomeFor(m),exp=finExpensesFor(m),bal=finBalances(m),rec=finReceivables();
  const fromApp=!st.appFromMonth||m>=st.appFromMonth;
  const T=k=>sumK(inc,k),planned=T('amount'),recv=inc.reduce((s,r)=>s+finReceived(r),0);
  // fizetési állapot: a Szerződés és számlázás bizonylataiból (csak megjelenítés – a kifizetést ott követjük)
  const payCell=r=>{const st=finPayOf(r),lp=r.kind==='project'?null:incProj(r),pid=r.kind==='project'?r.id:lp&&lp.id,sent=pid?((S.fin&&S.fin.invoices)||[]).some(x=>invPids(x).includes(pid)):invFor('income',r.id).length>0;   // kiküldött számla után piros
    return `<span class="statuspill pay-pill ${st==='var'?(sent?'p-bad':'p-mute'):PAY_CLS[st]||''}">${esc(PAY_LABEL[st]||'—')}</span>`;};
  const incRows=inc.map(r=>`<tr${r.kind==='project'?'':' class="fin-manual"'}><td class="n">${esc(r.day||'')}</td>
    <td>${r.kind==='project'?`<button class="linkbtn" type="button" data-action="open-project" data-id="${esc(r.id)}">${esc(r.name)}</button> <button class="editbtn" type="button" data-action="inc-rename" data-kind="project" data-id="${esc(r.id)}" aria-label="Átnevezés" title="Átnevezés">✏️</button>`:(()=>{const lp=incProj(r);return `${lp?`<button class="linkbtn" type="button" data-action="open-project" data-id="${esc(lp.id)}" title="Projekt megnyitása">${esc(r.name)}</button>`:`<button class="linkbtn" type="button" data-action="fin-income-edit" data-id="${esc(r.id)}" title="${esc(r.people||'')}">${esc(r.name)}</button>`}${r.legacy&&!lp&&!ro()?` <button class="linkbtn fin-mkproj" type="button" data-action="inc-to-proj" data-id="${esc(r.id)}" title="Projekt létrehozása ebből a sorból">➕ Projekt</button>`:''} <button class="editbtn" type="button" data-action="inc-rename" data-kind="income" data-id="${esc(r.id)}" aria-label="Átnevezés" title="Átnevezés">✏️</button>`;})()}</td>
    <td>${payCell(r)}</td><td class="r"><b>${moneyFmt(r.amount)||0}</b></td><td class="r">${moneyFmt(r.profit)||0}</td><td class="pc">${pctOf(r.prod,r.amount)}</td><td class="r">${moneyFmt(r.prod)||0}</td><td class="pc">${pctIn(r,'ceo')}</td><td class="r">${moneyFmt(r.ceo)||0}</td><td class="pc">${pctOf(r.rezsi,r.amount)}</td><td class="r${r.rezsi<0?' bad-txt':''}">${r.rezsi<0?'−':''}${moneyFmt(Math.abs(r.rezsi))||0}</td><td class="r">${moneyFmt(r.marketing)||0}</td></tr>`).join('');
  const expRows=list=>list.map(e=>`<tr><td><button class="linkbtn" type="button" data-action="fin-exp-edit" data-id="${esc(e.id)}">${esc(e.name)}</button></td><td>${e.kind==='fix'?`<span class="statuspill">havi fix</span>`:'<span class="statuspill p-mute">egyszeri</span>'}</td><td class="r"><b>${moneyFmt(e.amount)||0}</b></td></tr>`).join('');
  const expPanel=(fund,icon,title)=>{const l=exp.filter(e=>fund==='marketing'?e.fund==='marketing':e.fund!=='marketing');return `<div class="panel"><h3>${icon} ${title} <span class="aside">${ftFmt(sumK(l,'amount'))}</span></h3>
        <div class="sheet-wrap"><table class="sheet fin-tbl"><thead><tr><th>Tétel</th><th>Típus</th><th class="r">Összeg</th></tr></thead><tbody>${expRows(l)||'<tr><td colspan="3" class="empty-row">Nincs kiadás ebben a hónapban.</td></tr>'}</tbody>
          <tfoot><tr><td><b>Összesen</b></td><td></td><td class="r"><b>${moneyFmt(sumK(l,'amount'))||0}</b></td></tr>
          ${(()=>{const mk=fund==='marketing',keret=mk?bal.carryMkt+bal.inMkt:bal.carryRezsi+bal.inRezsi,end=keret-sumK(l,'amount');
            const inM=mk?bal.inMkt:bal.inRezsi,car=mk?bal.carryMkt:bal.carryRezsi;
            return `<tr class="fin-keret"><td colspan="2"><b>Havi ${mk?'marketing':'eszköz, rezsi'} keret</b> <span class="muted">(e havi bevételekből)</span></td><td class="r"><b>${sFt(inM)}</b></td></tr>
            <tr class="fin-keret"><td colspan="2">Áthozat az előző hónapokból</td><td class="r${car<0?' bad-txt':''}">${sFt(car)}</td></tr>
            <tr class="fin-end ${end<0?'neg':'pos'}"><td colspan="2"><b>${end<0?'🔻 Mínuszban vagyunk':'✅ Maradék a keretből'}</b></td><td class="r"><b>${end<0?'−'+ftFmt(-end):ftFmt(end)}</b></td></tr>`;})()}</tfoot></table></div>
        <div class="btns" style="margin-top:10px"><button class="btn outline small" type="button" data-action="fin-exp-new" data-fund="${fund}">+ Kiadás</button></div></div>`;};
  const loans=((S.fin.loan)||[]).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))),lIn=sumK(loans.filter(l=>l.kind!=='vissza'),'amount'),lOut=sumK(loans.filter(l=>l.kind==='vissza'),'amount');
  return `<div class="page-head"><div class="grow"><h2>Bevétel és kiadás</h2><p class="sub">Havi bevételek felosztással, kiadások, alapok egyenlege · nettó · csak te látod</p></div>${undoBar()}
      ${szOn()?`<button class="btn outline small" type="button" data-action="sz-sync" title="${esc(S.fin.sz.lastSync?'Utoljára: '+S.fin.sz.lastSync:'')}"${S._szSyncing?' disabled':''}>${S._szSyncing?'Frissítés…':'🔄 Kifizetések'}</button>`:''}
</div>
    <div class="tiles fin-tiles tiles-2">
      <div class="tile fin-flow"><div class="btns fin-nav fin-nav-top"><button class="btn outline small" type="button" data-action="fin-nav" data-d="-1" aria-label="Előző hónap"${months.indexOf(m)>=months.length-1?' disabled':''}>‹</button><button class="btn outline small fin-nav-m" type="button" data-action="fin-nav" data-d="0" title="Ugrás az aktuális hónapra">${esc(F_YM.format(toDate(m+'-01')))}</button><button class="btn outline small" type="button" data-action="fin-nav" data-d="1" aria-label="Következő hónap"${months.indexOf(m)<=0?' disabled':''}>›</button></div><div class="flow-row plan"><span>Tervezett bevétel</span><b>${ftFmt(T('amount'))}</b></div>
        <div class="flow-row ok"><span>Beérkezett fizetés</span><b>${ftFmt(recv)}</b></div>
        <div class="flow-row${planned-recv>0?' warn':''}"><span>Kintlévőség</span><b>${ftFmt(Math.max(0,planned-recv))}</b></div></div>
      <div class="tile fin-flow fin-split"><div class="flow-row plan"><span>Nyereség (${st.profitPct}%)</span><b>${ftFmt(T('profit'))}</b></div>
        <div class="flow-row"><span>Munkadíj</span><b>${ftFmt(T('prod'))}</b></div>
        <div class="flow-row${T('rezsi')<0?' warn':''}"><span>Eszközök, rezsi</span><b>${T('rezsi')<0?'−':''}${ftFmt(Math.abs(T('rezsi')))}</b></div></div>
    </div>
    <div class="panel"><h3>💰 Bevételek ${fromApp?'<span class="aside">a projektekből</span>':''}</h3>
      <div class="sheet-wrap"><table class="sheet fin-tbl fin-inc"><thead><tr><th class="n">Nap</th><th>Megnevezés</th><th>Fizetés</th><th class="r">Díjazás</th><th class="r">Nyereség ${st.profitPct}%</th><th class="r" colspan="2">Termelés</th><th class="r" colspan="2">Értékesítés</th><th class="r" colspan="2">Eszköz, rezsi</th><th class="r">Marketing ${st.marketingPct}%</th></tr></thead>
      <tbody>${incRows||`<tr><td colspan="12" class="empty-row">Ebben a hónapban még nincs bevétel.${fromApp?' A projektek a projekt értékének megadása után jelennek meg itt.':''}</td></tr>`}</tbody>
      <tfoot><tr><td></td><td><b>Összesen</b></td><td></td><td class="r"><b>${moneyFmt(T('amount'))||0}</b></td><td class="r"><b>${moneyFmt(T('profit'))||0}</b></td><td class="pc">${pctOf(T('prod'),T('amount'))}</td><td class="r"><b>${moneyFmt(T('prod'))||0}</b></td><td class="pc">${pctOf(T('ceo'),T('amount'))}</td><td class="r"><b>${moneyFmt(T('ceo'))||0}</b></td><td class="pc">${pctOf(T('rezsi'),T('amount'))}</td><td class="r${T('rezsi')<0?' bad-txt':''}"><b>${T('rezsi')<0?'−':''}${moneyFmt(Math.abs(T('rezsi')))||0}</b></td><td class="r"><b>${moneyFmt(T('marketing'))||0}</b></td></tr></tfoot></table></div>
      <div class="btns" style="margin-top:10px"><button class="btn outline small" type="button" data-action="fin-proj-new">+ Új projekt</button><button class="btn outline small" type="button" data-action="fin-income-new">+ Egyéb bevétel</button></div>
      ${fromApp?`<p class="hint">A projektek a kezdőnapjuk hónapjához számítanak. A termelés a projekt termelői költsége (díjak díjcsökkentés után, fuvar, étel, bérlés); az eszköz-rezsi rész a maradék.</p>`:''}</div>
    <div class="grid2">
      ${expPanel('rezsi','🧾','Eszközköltség, rezsi')}${expPanel('marketing','📣','Marketing költség')}
    </div>
    <p class="hint">A havi fix tételek (bér, könyvelő, irodabérlet, előfizetések) minden hónapban megjelennek, amíg meg nem szünteted őket.</p>
    <div class="grid2">
      <div class="panel"><h3>📊 Alapok egyenlege</h3>
        <div class="sheet-wrap"><table class="sheet fin-tbl"><thead><tr><th></th><th class="r">Eszközköltség, rezsi</th><th class="r">Marketing költség</th></tr></thead><tbody>
          <tr><td>Áthozat az előző hónapból</td><td class="r">${sFt(bal.carryRezsi)}</td><td class="r">${sFt(bal.carryMkt)}</td></tr>
          <tr><td>Tárgyhavi bevétel</td><td class="r">${sFt(bal.inRezsi)}</td><td class="r">${sFt(bal.inMkt)}</td></tr>
          <tr><td>Kiadás</td><td class="r">${sFt(-bal.outRezsi)}</td><td class="r">${sFt(-bal.outMkt)}</td></tr></tbody>
          <tfoot><tr><td><b>Elérhető</b></td><td class="r ${bal.endRezsi<0?'bad-txt':'ok-txt'}"><b>${sFt(bal.endRezsi)}</b></td><td class="r ${bal.endMkt<0?'bad-txt':'ok-txt'}"><b>${sFt(bal.endMkt)}</b></td></tr></tfoot></table></div></div>
    </div>
    <div class="panel"><h3>🤝 Tagi kölcsön <span class="aside">fennmaradó: <b>${ftFmt(lIn-lOut)}</b></span></h3>
      <div class="sheet-wrap"><table class="sheet fin-tbl"><thead><tr><th>Dátum</th><th>Típus</th><th>Bank</th><th>Megjegyzés</th><th class="r">Összeg</th><th></th></tr></thead><tbody>${loans.map(l=>`<tr><td>${esc(l.date)}</td><td>${l.kind==='vissza'?'<span class="statuspill p-ok">Cég visszafizeti</span>':'<span class="statuspill p-bad">Kölcsön a cégnek</span>'}</td><td>${esc(loanBank(l))}</td><td>${esc(l.note||'')}</td><td class="r">${moneyFmt(l.amount)}</td><td class="nowrap"><button class="editbtn" type="button" data-action="fin-loan-edit" data-id="${esc(l.id)}" aria-label="Módosítás" title="Módosítás">✏️</button><button class="trash" type="button" data-action="fin-loan-del" data-id="${esc(l.id)}" aria-label="Törlés" title="Törlés">🗑️</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty-row">Nincs tagi kölcsön.</td></tr>'}</tbody>
      <tfoot><tr><td colspan="4">Kölcsön összesen: <b>${ftFmt(lIn)}</b> · visszafizetve: <b>${ftFmt(lOut)}</b></td><td class="r"><b>${ftFmt(lIn-lOut)}</b></td><td></td></tr></tfoot></table></div>
      <div class="btns" style="margin-top:10px"><button class="btn outline small" type="button" data-action="fin-loan-new">+ Tétel</button></div></div>`;
}

/* ===== Műveletek ===== */
/* Gyors mentés: a változás azonnal látszik (és a felugró ablak bezárul), a szerver a háttérben ment; hiba esetén újratöltjük */
const newId=()=>(window.crypto&&crypto.randomUUID?crypto.randomUUID():'id-'+Date.now()+'-'+Math.random().toString(36).slice(2,10));
function finLocal(key,rows,del){if(!S.fin)return;const arr=(S.fin[key]||[]).slice();(rows||[]).forEach(r=>{const i=arr.findIndex(x=>x.id===r.id);if(del){if(i>=0)arr.splice(i,1);}else if(i>=0)arr[i]=Object.assign({},arr[i],r);else arr.push(r);});S.fin[key]=arr;}
const FIN_LBL={income:'bevétel',expense:'kiadás',loan:'tagi kölcsön'};
function finSave(name,arg,okMsg,local){
  const table=arg&&arg.table,ids=!table?[]:name==='finDelete'?[arg.id]:(arg.rows||[arg.row]).filter(Boolean).map(r=>r.id),snap=()=>ids.map(id=>{const r=((S.fin&&S.fin[table])||[]).find(x=>x.id===id);return r?clone(r):null;});
  const before=snap();if(local)try{local();}catch(e){}const after=snap();
  if(ids.length&&(name==='finUpsert'||name==='finDelete')){const one=after.find(Boolean)||before.find(Boolean)||{},nm=one.name||one.note||one.date||'';
    opRec(`${FIN_LBL[table]||'tétel'} ${name==='finDelete'?'törlése':before.some(Boolean)?'módosítása':'felvétele'}${nm?': '+nm:''}`,()=>finRestore(table,ids,before),()=>finRestore(table,ids,after));}
  closeModal();render(true);
  call(name,arg).then(d=>{finApply(d);if(okMsg)toast(okMsg);}).catch(e=>{handleErr(e);finLoad(true);});return true;}
async function finCall(name,arg,okMsg){try{const d=await call(name,arg);finApply(d);if(okMsg)toast(okMsg);return d;}catch(e){handleErr(e);return null;}}
function finIncomeModal(r){const v=r||{},m=S.finMonth,st=finSet();
  openModal(r?'Bevétel szerkesztése':'Egyéb bevétel',`<div class="fields">
    ${mf('name','Megnevezés',{full:true,v:v.name,max:200,ph:'pl. Lurdy technikai ügyelet'})}
    ${r?`${mf('day','Nap',{v:v.day||'',ph:'pl. 7',max:10})}
    ${ms('payStatus','Fizetés',Object.entries(PAY_LABEL),v.payStatus||'var')}`:''}
    ${moneyField('amount','Díjazás (nettó)',v.amount,{steps:false})}
    ${r?moneyField('prod','Termelési költség (szakemberek stb.)',v.prod,{steps:false}):''}
  </div><p class="hint" style="margin:0">${r?'':'A napot, a fizetést és a termelési költséget utána a sor ✏️ gombjával állíthatod. '}A felosztás a beállított százalékokkal számolódik (nyereség ${st.profitPct}%, értékesítés ${st.ceoPct}%, marketing ${st.marketingPct}%), a maradék az eszköz-rezsi alapba kerül.${v.people?'<br>Régi táblázat szerinti szakemberek: '+esc(v.people):''}</p>`,
  {left:r?`<button type="button" class="btn danger small" data-action="fin-income-del" data-id="${esc(r.id)}">Törlés</button>`:'',submitLabel:'Mentés',submit:async fd=>{
    const amount=num(moneyVal(fd.get('amount'))),prod=num(moneyVal(fd.get('prod')));if(!amount){toast('Add meg a díjazást.',true);return;}
    const keepSplit=r&&r.legacy&&amount===num(r.amount)&&prod===num(r.prod);   // régi sornál a régi felosztás marad, ha az összeg nem változott
    const profit=keepSplit?r.profit:Math.round(amount*st.profitPct/100),ceo=keepSplit?r.ceo:Math.round(amount*st.ceoPct/100),marketing=keepSplit?r.marketing:Math.round(amount*st.marketingPct/100);
    const row=Object.assign({},v,{id:v.id||'',month:v.month||m,name:String(fd.get('name')||'').trim(),day:r?String(fd.get('day')||'').trim():'',payStatus:r?fd.get('payStatus'):'var',amount,prod,profit,ceo,marketing,rezsi:keepSplit?r.rezsi:amount-profit-ceo-marketing-prod});
    row.id=row.id||newId();finSave('finUpsert',{table:'income',row},'Bevétel mentve',()=>finLocal('income',[row]));}});}
function finExpenseModal(e){const v=e||{},m=S.finMonth;if(e&&!e.id)e=null;
  openModal((e?'Kiadás szerkesztése':'Új kiadás')+' – '+(v.fund==='marketing'?'marketing':'eszközköltség, rezsi'),`<div class="fields">
    ${mf('name','Megnevezés',{full:true,v:v.name,max:200,ph:'pl. Könyvelő'})}
    ${moneyField('amount','Összeg (nettó)',v.amount,{steps:false})}
    <input type="hidden" name="fund" value="${v.fund==='marketing'?'marketing':'rezsi'}">
    ${ms('kind','Típus',[['egyszeri','Egyszeri (csak e hónap)'],['fix','Havi fix (ismétlődő)']],v.kind||'egyszeri')}
  </div>${e&&e.kind==='fix'?`<p class="hint" style="margin:0">Fix tétel: ${esc(e.from)}${e.to?' – '+esc(e.to):' óta'}. Ha az összeget módosítod, a változás <b>${esc(F_YM.format(toDate(m+'-01')))}</b> hónaptól érvényes, a korábbi hónapok nem változnak.</p>`:''}`,
  {left:e?`<button type="button" class="btn danger small" data-action="fin-exp-del" data-id="${esc(e.id)}">${e.kind==='fix'&&e.from<m?'Megszüntetés ettől a hónaptól':'Törlés'}</button>`:'',submitLabel:'Mentés',submit:async fd=>{
    const amount=num(moneyVal(fd.get('amount'))),name=String(fd.get('name')||'').trim(),fund=fd.get('fund'),kind=fd.get('kind');if(!amount){toast('Add meg az összeget.',true);return;}
    let rows;
    if(e&&e.kind==='fix'&&kind==='fix'&&e.from<m&&(amount!==num(e.amount)||fund!==e.fund||name!==e.name))rows=[Object.assign({},e,{to:shiftMonth(m,-1)}),{name,amount,fund,kind:'fix',from:m,to:e.to||''}];   // ettől a hónaptól új összeg
    else rows=[Object.assign({},v,{id:v.id||'',name,amount,fund,kind,month:kind==='egyszeri'?(v.month||m):'',from:kind==='fix'?(v.from||m):'',to:kind==='fix'?(v.to||''):'',legacy:false})];
    rows.forEach(r=>{r.id=r.id||newId();});finSave('finUpsert',{table:'expense',rows},'Kiadás mentve',()=>finLocal('expense',rows));}});}
function finSettingsModal(){const st=finSet(),cur=todayISO().slice(0,7);
  openModal('Bevétel és kiadás – beállítások',`<div class="fields">
    ${mf('profitPct','Nyereség (%)',{v:st.profitPct,im:'decimal'})}${mf('ceoPct','Értékesítés (%)',{v:st.ceoPct,im:'decimal'})}${mf('marketingPct','Marketing (%)',{v:st.marketingPct,im:'decimal'})}
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
function finLoanModal(l){const v=l||{},k=v.kind==='vissza'?'vissza':'be',bk=l?loanBank(l):'';
  openModal(l?'Tagi kölcsön – módosítás':'Tagi kölcsön – új tétel',`<div class="fields">
    ${ms('kind','Típus',[['be','Kölcsön a cégnek'],['vissza','Cég visszafizeti']],k)}
    ${mf('date','Dátum',{type:'date',v:v.date||todayISO()})}
    ${moneyField('amount','Összeg',v.amount??null,{steps:false})}
    <div class="field"><label for="m-bank">Bank</label><select class="inp" id="m-bank" name="bank">${bk?bankOpts(k).replace(`value="${bk}"`,`value="${bk}" selected`):bankOpts(k)}</select></div>
    ${mf('note','Megjegyzés',{full:true,max:300,v:v.note||''})}</div>`,{left:l?`<button type="button" class="btn danger small" data-action="fin-loan-del" data-id="${esc(l.id)}">Törlés</button>`:'',submitLabel:'Mentés',submit:async fd=>{
    const row={id:v.id||'',kind:fd.get('kind'),date:fd.get('date'),amount:num(moneyVal(fd.get('amount'))),bank:String(fd.get('bank')||''),note:String(fd.get('note')||'').trim()};
    if(!row.amount){toast('Add meg az összeget.',true);return;}
    row.id=row.id||newId();finSave('finUpsert',{table:'loan',row},'Tétel mentve',()=>finLocal('loan',[row]));}});}
Object.assign(ACT,{
  'fin-nav':b=>{const d=Number(b.dataset.d),ms=finMonths();let m=S.finMonth||todayISO().slice(0,7);
    if(!d)m=todayISO().slice(0,7);else{const t=shiftMonth(m,d);if(ms.includes(t))m=t;}S.finMonth=m;render(true);},
  'fin-settings':()=>finSettingsModal(),
  'fin-retry':()=>{S.finErr='';finLoad(true);render(true);},
  'fin-import':()=>finImport(),
  'fin-income-new':()=>finIncomeModal(null),
  'fin-income-edit':b=>{const r=((S.fin&&S.fin.income)||[]).find(x=>x.id===b.dataset.id);if(r)finIncomeModal(r);},
  'fin-income-del':b=>{const id=b.dataset.id;confirmModal('Bevétel törlése','Biztosan törlöd ezt a bevételi sort?','Törlés',()=>finSave('finDelete',{table:'income',id},'Törölve',()=>finLocal('income',[{id}],true)));},
  'fin-exp-new':b=>finExpenseModal(b&&b.dataset.fund?{fund:b.dataset.fund}:null),
  'fin-exp-edit':b=>{const e=((S.fin&&S.fin.expense)||[]).find(x=>x.id===b.dataset.id);if(e)finExpenseModal(e);},
  'fin-exp-del':b=>{const e=((S.fin&&S.fin.expense)||[]).find(x=>x.id===b.dataset.id);if(!e)return;const m=S.finMonth;
    if(e.kind==='fix'&&e.from<m){confirmModal('Fix kiadás megszüntetése',`A(z) „${e.name}” ${F_YM.format(toDate(m+'-01'))}-tól már nem jelenik meg; a korábbi hónapokban megmarad.`,'Megszüntetés',()=>{const row=Object.assign({},e,{to:shiftMonth(m,-1)});finSave('finUpsert',{table:'expense',row},'Megszüntetve',()=>finLocal('expense',[row]));});}
    else confirmModal('Kiadás törlése','Biztosan törlöd ezt a kiadást?','Törlés',()=>finSave('finDelete',{table:'expense',id:e.id},'Törölve',()=>finLocal('expense',[{id:e.id}],true)));},
  'fin-loan-new':()=>finLoanModal(null),
  'fin-loan-edit':b=>{const l=((S.fin&&S.fin.loan)||[]).find(x=>x.id===b.dataset.id);if(l)finLoanModal(l);},
  'fin-loan-del':b=>{const id=b.dataset.id;confirmModal('Tétel törlése','Biztosan törlöd ezt a tagi kölcsön tételt?','Törlés',()=>finSave('finDelete',{table:'loan',id},'Törölve',()=>finLocal('loan',[{id}],true)));}
});
document.addEventListener('change',async e=>{const t=e.target;
  if(t.id==='fin-month'){S.finMonth=t.value;render(true);return;}
  if(t.id==='m-kind'&&$('m-bank')){const b=$('m-bank'),cur=b.value;b.innerHTML=bankOpts(t.value);if([...b.options].some(o=>o.value===cur))b.value=cur;return;}   // a bank-lista a típushoz igazodik
  if(t.dataset&&t.dataset.finpay){const id=t.dataset.id,v=t.value;
    if(t.dataset.finpay==='project'){try{await call('finSetPay',{projectId:id,payStatus:v});const p=projById(id);if(p)p.payStatus=v;if(S.draft&&S.draft.id===id)S.draft.payStatus=v;render(true);toast('Fizetési állapot: '+PAY_LABEL[v]);}catch(err){handleErr(err);render(true);}}
    else{const r=((S.fin&&S.fin.income)||[]).find(x=>x.id===id);if(r){const row=Object.assign({},r,{payStatus:v});finSave('finUpsert',{table:'income',row},'Fizetési állapot: '+PAY_LABEL[v],()=>finLocal('income',[row]));}}}
});

/* ===== Számlázás (számlázz.hu): kiállítás, hozzárendelés, kifizetések követése ===== */
const szOn=()=>!!(S.fin&&S.fin.sz);
const SZ_VATS=[['27','27%'],['18','18%'],['5','5%'],['0','0%'],['AAM','AAM – alanyi adómentes'],['TAM','TAM – tárgyi adómentes'],['EUK','EUK – EU-n belüli'],['MAA','MAA – mentes az adó alól']];
const invFor=(kind,id)=>((S.fin&&S.fin.invoices)||[]).filter(x=>kind==='project'?invPids(x).includes(id):x.incomeId===id);
const invState=x=>{if(x.kind==='eloleg'&&x.manual)return 'paid';const g=num(x.invGross),p=num(x.invPaid);if(g&&p>=g-1)return 'paid';if(p>0)return 'part';return x.due&&x.due<todayISO()?'late':'open';};
const INV_CLS={paid:'p-ok',part:'p-info',late:'p-bad',open:'p-warn'};
const SZ_KIND={szamla:'Számla',dijbekero:'Díjbekérő',eloleg:'Foglalószámla',vegszamla:'Végszámla'},SZ_KIND_S={dijbekero:'D ',eloleg:'E ',vegszamla:'V '};
const invChip=x=>{const s=invState(x);return `<button class="statuspill inv-chip ${INV_CLS[s]}" type="button" data-action="sz-inv" data-id="${esc(x.id)}" title="${esc((SZ_KIND[x.kind]||'Számla')+' · '+(x.buyer||'')+' · bruttó '+ftFmt(num(x.invGross)))}">${SZ_KIND_S[x.kind]||''}${esc(x.no)} ${s==='paid'?'✓':s==='part'?'½':s==='late'?'⚠':'…'}</button>`;};
const invCell=r=>`<div class="inv-cell">${invFor(r.kind,r.id).map(invChip).join('')}<button class="linkbtn inv-new" type="button" data-action="sz-new" data-kind="${esc(r.kind)}" data-id="${esc(r.id)}" title="Számla kiállítása vagy meglévő hozzárendelése">🧾${invFor(r.kind,r.id).length?'':' Számla'}</button></div>`;
function szBillingEmail(cl,p){const m=/Számlázási e-mail:\s*([^;\n]+)/i.exec((cl&&cl.note)||'');const first=m?m[1].split(/[,\s]+/).find(x=>x.includes('@')):'';return first||(cl&&cl.contactEmail)||(p&&p.contactEmail)||'';}
function szSplitAddr(a){const m=/^\s*(\d{4})\s+([^,]+),\s*(.+)$/.exec(a||'');return m?{zip:m[1],city:m[2].trim(),address:m[3].trim()}:{zip:'',city:'',address:String(a||'').trim()};}
function szTargetInfo(kind,id){
  if(kind==='project'){const p=projById(id);if(!p)return null;const cl=(S.clients||[]).find(c=>c.name===p.client)||null,a=szSplitAddr(p.clientAddress||(cl&&cl.address));
    const r=pr(p);return {kind,id,name:p.name||'Projekt',net:projTotal(p),base:num(p.projectValue),extras:extrasOf(p),fulfill:(r&&(r.end||r.start))||todayISO(),buyer:Object.assign({name:p.client||'',tax:p.clientTax||(cl&&cl.tax)||'',email:szBillingEmail(cl,p)},a)};}
  const r=((S.fin&&S.fin.income)||[]).find(x=>x.id===id);if(!r)return null;
  const d=String(parseInt(r.day,10)||1).padStart(2,'0'),f=r.month?r.month+'-'+d:todayISO();
  return {kind:'income',id,name:r.name,net:num(r.amount),fulfill:f,buyer:{name:'',tax:'',email:'',zip:'',city:'',address:''}};}
function szItemRow(it,i){const st=S.fin.sz;return `<div class="sz-item" data-szitem="${i}"${it.pid?` data-pid="${esc(it.pid)}"`:''}>
  <input class="inp" name="it_name" value="${esc(it.name||'')}" placeholder="Megnevezés" aria-label="Tétel megnevezése" maxlength="300">
  <input class="inp" name="it_qty" value="${esc(it.qty??1)}" inputmode="decimal" aria-label="Mennyiség">
  <input class="inp" name="it_unit" value="${esc(it.unit||st.unit)}" aria-label="Mennyiségi egység" maxlength="20">
  <input class="inp" name="it_price" value="${esc(moneyFmt(it.price))}" inputmode="numeric" data-money="1" placeholder="Nettó egységár" aria-label="Nettó egységár">
  <select class="inp" name="it_vat" aria-label="ÁFA">${SZ_VATS.map(([v,l])=>`<option value="${v}"${v===(it.vat||st.vat)?' selected':''}>${l}</option>`).join('')}</select>
  <button class="trash" type="button" data-action="sz-item-del" aria-label="Tétel törlése">🗑️</button></div>`;}
function szReadItems(){return [...document.querySelectorAll('[data-szitem]')].map(el=>({name:el.querySelector('[name=it_name]').value.trim(),qty:Number(String(el.querySelector('[name=it_qty]').value).replace(',','.'))||0,
  unit:el.querySelector('[name=it_unit]').value.trim(),price:(v=>/^\s*[-−]/.test(v)?-num(moneyVal(v)):num(moneyVal(v)))(el.querySelector('[name=it_price]').value),vat:el.querySelector('[name=it_vat]').value}));}
function szTotals(){const its=szReadItems();let net=0,vat=0;its.forEach(it=>{const n=Math.round(it.price*it.qty);net+=n;vat+=/^\d+$/.test(it.vat)?Math.round(n*Number(it.vat)/100):0;});
  const el=$('sz-total');if(el)el.innerHTML=`Nettó <b>${ftFmt(net)}</b> · ÁFA <b>${ftFmt(vat)}</b> · Bruttó <b>${ftFmt(net+vat)}</b>`;return {net,vat,gross:net+vat};}
/* Az egyes bizonylattípusok javasolt tétele (a projekt nettó értékéből, a foglaló %-ából) */
function szPreset(type,kind,id){const t=szTargetInfo(kind,id);if(!t)return {name:'',price:0};const inv=invFor(kind,id),b=kind==='project'?billOf(id):null,pct=b?num(b.advancePct):50;
  const db=inv.filter(x=>x.kind==='dijbekero').pop();
  if(type==='dijbekero')return {name:'Foglaló – '+t.name,price:Math.round(t.net*pct/100)};
  if(type==='eloleg')return {name:'Foglaló – '+t.name,price:db?num(db.invNet):Math.round(t.net*pct/100)};
  const ex=(t.extras||[]).filter(x=>num(x.amount)>0),split=ex.length?[{name:t.name,qty:1,price:t.base,pid:kind==='project'?id:''},...ex.map(x=>exSign(x)<0?{name:'Kedvezmény: '+(x.name||'jutalék'),qty:1,price:-num(x.amount)}:{name:'Extra: '+(x.name||'szolgáltatás'),qty:1,price:num(x.amount)})]:null;
  if(type==='vegszamla')return {name:t.name,price:t.net,items:split};
  const done=inv.filter(x=>x.kind==='szamla'||x.kind==='vegszamla').reduce((s,x)=>s+num(x.invNet),0);return {name:t.name,price:Math.max(0,t.net-done),items:done?null:split};}
const SZ_HINT={dijbekero:'A díjbekérő nem számla, nem kerül a NAV-hoz. Ha a számlázz.hu-ban be van kapcsolva az automatikus számlázás, a kifizetése után magától elkészül a foglalószámla.',
  eloleg:'Foglalószámla a már beérkezett foglalóról – fizetettként kerül kiállításra.',vegszamla:'A végszámla a teljes összegről szól; a számlázz.hu a projekthez tartozó foglalószámlát (rendelésszám alapján) levonja, a vevő csak a különbözetet fizeti.',
  szamla:'Egyetlen számla a teljes (vagy a még nem számlázott) összegről.'};
/* Közös számla: az ügyfél többi projektje, amelyek ugyanerre a számlára kerülhetnek */
function szSharedPick(id,sel,fixed){const p=projById(id);if(!p)return '';const n=s=>String(s||'').trim().toLowerCase();
  const cand=S.projects.filter(x=>x.id!==id&&x.status!=='lemondva'&&n(x.client)===n(p.client)&&pr(x)&&(sel.includes(x.id)||!invFor('project',x.id).some(v=>v.kind==='szamla'||v.kind==='vegszamla'))).sort(byStart).reverse().sort((a,b)=>(sel.includes(b.id)?1:0)-(sel.includes(a.id)?1:0)).slice(0,24);
  if(!cand.length)return '';
  return `<div class="field full"><span class="lbl">🔗 Közös számla – további projektek ugyanerre a számlára</span><div class="sz-share">${cand.map(x=>`<label><input type="checkbox" data-szshare="${esc(x.id)}"${sel.includes(x.id)?' checked':''}${fixed?' disabled':''}> ${esc(x.name||'Projekt')} <span class="muted">· ${esc(fmtMD(pr(x).start))} · ${ftFmt(num(x.projectValue))}</span></label>`).join('')}</div>
    <small class="hint" style="margin:4px 0 0">${fixed?'A TIG projektjei – a számla mindegyikhez hozzárendelődik.':'A bejelölt projekt tételként kerül a számlára; a kifizetés mindegyik projektnél megjelenik.'}</small></div>`;}
document.addEventListener('change',e=>{const c=e.target;if(!c.dataset||!c.dataset.szshare)return;const box=$('sz-items');if(!box)return;const pid=c.dataset.szshare,p=projById(pid);
  const ex=box.querySelector(`[data-pid="${CSS.escape(pid)}"]`);
  if(c.checked&&!ex&&p)box.insertAdjacentHTML('beforeend',szItemRow({name:p.name||'Projekt',qty:1,price:projTotal(p),pid},box.children.length));
  if(!c.checked&&ex&&box.children.length>1)ex.remove();szTotals();});
function szInvoiceModal(kind,id,o={}){
  const t=szTargetInfo(kind,id),st=S.fin&&S.fin.sz;if(!t||!st)return;
  if(!st.hasKey){szSettingsModal('Az Agent-kulcs megadása után tudsz számlát kiállítani.');return;}
  const type=o.type||'szamla',pre=szPreset(type,kind,id),inv=invFor(kind,id);
  const done=inv.filter(x=>x.kind==='szamla'||x.kind==='vegszamla').reduce((s,x)=>s+num(x.invNet),0);
  const dbRow=inv.filter(x=>x.kind==='dijbekero').pop(),elRow=inv.filter(x=>x.kind==='eloleg').pop();
  const b=t.buyer,cls=(S.clients||[]).slice().sort((x,y)=>x.name.localeCompare(y.name,'hu'));
  setTimeout(szBuyerLock,40);
  openModal((SZ_KIND[type]||'Számla')+' kiállítása – '+t.name,`<div class="fields">
    <div class="field full"><label for="m-issuer">Kiállító</label><select class="inp" id="m-issuer" name="issuer"><option value="kft" selected>Lumos Motion Kft.</option><option value="ev" disabled>Egri Ervin E.V. – még nincs bekötve a számlázz.hu-hoz</option></select></div>
    ${ms('kind','Típus',[['dijbekero','Díjbekérő (foglaló bekérése)'],['eloleg','Foglalószámla'],['vegszamla','Végszámla'],['szamla','Számla (egyben)']],type)}
    <div class="field"><label for="m-szClient">Vevő az ügyfelek közül</label><select class="inp" id="m-szClient"><option value="">— kézi megadás —</option>${cls.map(c=>`<option value="${esc(c.id)}"${c.name===b.name?' selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
    ${mf('bName','Vevő neve',{full:true,v:b.name,max:200})}
    ${mf('bTax','Adószám (magánszemélynél üres)',{v:b.tax,max:20,ph:'12345678-2-42'})}
    ${mf('bEmail','E-mail (ide megy a számla)',{v:b.email,max:300,type:'email'})}
    ${mf('bZip','Irányítószám',{v:b.zip,max:10,im:'numeric'})}${mf('bCity','Település',{v:b.city,max:80})}
    ${mf('bAddr','Cím',{full:true,v:b.address,max:200})}
    <small class="hint field full" id="sz-buyer-lock" style="margin:-6px 0 0"></small>
    <div class="field full"><span class="lbl">Tételek (nettó egységár)</span><div class="sz-items" id="sz-items">${(o.items&&o.items.length?o.items:pre.items||[{name:pre.name,qty:1,price:pre.price,pid:kind==='project'?id:''}]).map(szItemRow).join('')}</div>
      <button class="linkbtn" type="button" data-action="sz-item-add" style="align-self:flex-start">+ Tétel</button>
      <div class="sz-total" id="sz-total"></div><small class="hint" id="sz-hint" style="margin:0">${esc(SZ_HINT[type])}</small>${done&&type==='szamla'?`<small class="hint" style="margin:0">Erre már kiállítottál ${ftFmt(done)} nettó értékű számlát – a tétel a maradékkal van kitöltve.</small>`:''}</div>
    ${kind==='project'?szSharedPick(id,o.projectIds||[],!!o.tigId):''}
    ${mf('fulfill','Teljesítés dátuma',{type:'date',v:o.fulfill||t.fulfill})}${mf('due','Fizetési határidő',{type:'date',v:addDays(todayISO(),st.dueDays)})}
    ${ms('payMethod','Fizetési mód',['Átutalás','Készpénz','Bankkártya'],st.payMethod)}
    <div class="field"><span class="lbl">Küldés</span><div class="rolepick"><label><input type="checkbox" name="eInvoice"${st.eInvoice?' checked':''}> E-számla</label><label><input type="checkbox" name="sendEmail"${st.sendEmail?' checked':''}> E-mailben a vevőnek</label></div></div>
    <div class="field full"><label for="m-comment">Megjegyzés a számlán</label><textarea class="inp" id="m-comment" name="comment" rows="2" maxlength="1000">${esc(st.comment||'')}</textarea></div>
  </div><div id="sz-prev"></div>`,{left:`<button type="button" class="btn outline small" data-action="sz-preview">👁 Előnézet</button><button type="button" class="btn outline small" data-action="sz-link" data-kind="${esc(kind)}" data-id="${esc(id)}">Meglévő számla hozzárendelése</button>`,submitLabel:'Tovább',submit:async fd=>{
    const items=szReadItems(),tot=szTotals();
    const k=fd.get('kind');
    const a={[kind==='project'?'projectId':'incomeId']:id,kind:k,dijbekeroNo:k==='eloleg'&&dbRow?dbRow.no:'',elolegNo:k==='vegszamla'&&elRow?elRow.no:'',paid:k==='eloleg',buyer:{name:String(fd.get('bName')||'').trim(),tax:String(fd.get('bTax')||'').trim(),email:String(fd.get('bEmail')||'').trim(),
      zip:String(fd.get('bZip')||'').trim(),city:String(fd.get('bCity')||'').trim(),address:String(fd.get('bAddr')||'').trim()},items,fulfill:fd.get('fulfill'),due:fd.get('due'),payMethod:fd.get('payMethod'),
      comment:String(fd.get('comment')||'').trim(),eInvoice:!!fd.get('eInvoice'),sendEmail:!!fd.get('sendEmail'),
      projectIds:kind==='project'?[...document.querySelectorAll('[data-szshare]:checked')].map(x=>x.dataset.szshare):[],tigId:o.tigId||''};
    if(a.buyer.name.length<2||!a.buyer.zip||!a.buyer.city||!a.buyer.address){toast('Add meg a vevő nevét és teljes címét.',true);return;}
    if(!items.length||items.some(it=>it.name.length<2||!it.qty)){toast('Minden tételnek legyen megnevezése és mennyisége.',true);return;}
    if(!tot.net){toast('A számla összege 0 Ft.',true);return;}
    openModal('Biztosan kiállítod?',`<p style="margin:0">${SZ_KIND[a.kind]} <b>${esc(a.buyer.name)}</b> részére${a.projectIds.length?` (közös számla, ${a.projectIds.length+1} projekt)`:''}: nettó <b>${ftFmt(tot.net)}</b>, bruttó <b>${ftFmt(tot.gross)}</b>, határidő ${esc(a.due)}.</p>
      <p class="hint" style="margin:8px 0 0">${a.kind==='dijbekero'?'':'A számla a kiállítással bekerül a NAV-hoz, utólag csak sztornózni lehet. '}${a.sendEmail&&a.buyer.email?'A számlázz.hu elküldi e-mailben: '+esc(a.buyer.email)+'.':'E-mailt nem küldünk.'}</p>`,
      {submitLabel:'Kiállítás',submit:async()=>{const btn=document.querySelector('#mform button[type=submit]');if(btn){btn.disabled=true;btn.textContent='Kiállítás…';}
        try{const d=await call('szInvoice',a);closeModal();finApply(d);toast(`${SZ_KIND[a.kind]} kiállítva: ${d.invoice&&d.invoice.no}`);}
        catch(e){handleErr(e);if(btn){btn.disabled=false;btn.textContent='Kiállítás';}}}});}});
  szTotals();}
function szLinkModal(kind,id,type){const t=szTargetInfo(kind,id);if(!t)return;
  openModal('Meglévő bizonylat hozzárendelése',`<div class="fields">${mf('no','Bizonylatszám',{full:true,max:60,ph:'pl. LUMOS-2026-75'})}${kind==='project'?szSharedPick(id,[],false).replace('A bejelölt projekt tételként kerül a számlára; a kifizetés mindegyik projektnél megjelenik.','Ha a számla több munkáról szól, jelöld be a többit is – a számla és a kifizetése mindegyiknél megjelenik.'):''}</div>
    <div id="sz-peek" class="sz-peek" data-pid="${esc(id)}" data-slot="${esc(type||'')}"></div><p class="hint" style="margin:0">A számlázz.hu-ban már kiállított számlát kapcsolja ehhez: <b>${esc(t.name)}</b>. Az összeg és a kifizetések onnan töltődnek be, és a fizetési állapot magától követi.</p>
    <p class="hint" style="margin:10px 0 0">Más fiókból (pl. <b>Egri Ervin E.V.</b>) vagy kézzel kiállított bizonylat? <button class="linkbtn" type="button" data-action="sz-manual" data-kind="${esc(kind)}" data-id="${esc(id)}" data-type="${esc(type||'szamla')}">✍️ Kézi rögzítés fájlfeltöltéssel</button></p>`,
    {submitLabel:'Hozzárendelés',submit:async fd=>{let no=String(fd.get('no')||'').trim();if(!no){toast('Add meg a számlaszámot.',true);return;}
      if(S._szPeek&&S._szPeek.q===no&&S._szPeek.r)no=S._szPeek.r.no;
      try{const d=await call('szLink',{[kind==='project'?'projectId':'incomeId']:id,no,slot:type||'',projectIds:kind==='project'?[...document.querySelectorAll('[data-szshare]:checked')].map(x=>x.dataset.szshare):[]});closeModal();finApply(d);toast(d.extended!==undefined?'Közös számla: '+(d.invoice&&d.invoice.no)+' most már ehhez a projekthez is tartozik':'Számla hozzárendelve: '+(d.invoice&&d.invoice.no));}catch(e){handleErr(e);}}});}
/* Kézi bizonylat: nem az összekötött számlázz.hu-fiókból (pl. Egri Ervin E.V.) – csak a PDF-et kell feltölteni, az adatokat az app olvassa ki belőle */
let PDFJS=null;
function pdfLib(){return PDFJS||(PDFJS=new Promise((ok,no)=>{const sc=document.createElement('script');sc.src='vendor/pdfjs/pdf.min.js';sc.onload=()=>{try{window.pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdfjs/pdf.worker.min.js';ok(window.pdfjsLib);}catch(e){no(e);}};sc.onerror=()=>{PDFJS=null;no(new Error('A PDF-olvasó nem töltődött be.'));};document.head.appendChild(sc);}));}
const huDate=s=>{const m=/(\d{4})[.\-\/ ]\s*(\d{1,2})[.\-\/ ]\s*(\d{1,2})/.exec(String(s||''));return m?`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`:'';};
const huNum=s=>{const t=String(s||'').replace(/Ft/i,'').replace(/[\s ]/g,'').replace(',','.');return /^-?\d+(\.\d+)?$/.test(t)?Math.round(Number(t)):null;};
/* Számlázz.hu-s (és hasonló) számla-PDF szövegéből: szám, típus, kiállító, vevő, dátumok, összegek (magyar és angol nyelvű számla is) */
async function pdfItems(buf,worker){const lib=await pdfLib(),doc=await lib.getDocument(Object.assign({data:new Uint8Array(buf),isEvalSupported:false},worker?{worker}:{})).promise;
  const pg=await doc.getPage(1),W=pg.getViewport({scale:1}).width,tc=await pg.getTextContent();try{doc.destroy();}catch(e){}
  return {W,it:tc.items.filter(i=>i.str&&i.str.trim()).map(i=>({s:i.str.trim(),x:i.transform[4],y:i.transform[5]}))};}
async function invParsePdf(file){const r=await pdfItems(await file.arrayBuffer());return invParseItems(r.it,r.W);}
const invNum=s=>{let t=String(s||'').replace(/\b(Ft|HUF|USD|EUR)\b/gi,'').replace(/[\s ]/g,'');if(/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t))t=t.replace(/,/g,'');else t=t.replace(',','.');return /^-?\d+(\.\d+)?$/.test(t)?Math.round(Number(t)):null;};
const invDate=s=>{s=String(s||'');let m=/(\d{4})[.\-\/]\s*(\d{1,2})[.\-\/]\s*(\d{1,2})/.exec(s);if(m)return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;m=/(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:'';};
function invParseItems(it,W){const all=it.map(i=>i.s).join('\n'),find=re=>it.find(i=>re.test(i.s));
  const right=lab=>{const l=find(lab);if(!l)return '';return it.filter(i=>Math.abs(i.y-l.y)<4&&i.x>l.x&&i!==l).sort((a,b)=>a.x-b.x).map(i=>i.s).join(' ');};
  const o={};const no=/(?:Sorsz[aá]m|Number):?\s*([A-Za-z0-9][\w\-\/]*)/.exec(all);o.no=no?no[1]:'';
  o.issuer=/92286571/.test(all)?'ev':/32701573/.test(all)?'kft':'';
  const st=/([A-Z][\w]*-\d{4}-\d+)\s*SZTORNÓ SZÁMLÁJA/.exec(all);o.storno=st?st[1]:/SZTORNÓ SZÁMLÁJA/.test(all)?'?':'';
  const title=(it.find(i=>/(SZÁMLA|INVOICE|DÍJBEKÉRŐ|PROFORMA)/.test(i.s)&&i.s===i.s.toUpperCase())||{}).s||'';o.title=title;
  const hd=find(/^(Megnevez[eé]s|Description)$/),tot=it.filter(i=>/^(Összesen|Total):?$/.test(i.s)).sort((a,b)=>b.y-a.y)[0];
  o.items=hd?it.filter(i=>i.y<hd.y-2&&(!tot||i.y>tot.y+2)&&i.x<W*0.35).sort((a,b)=>b.y-a.y).map(i=>i.s).join(' '):'';
  const db=/(D-[\w-]+)\s+DÍJBEKÉRŐ ALAPJÁN/.exec(title);o.fromDb=db?db[1]:'';
  o.kind=o.storno?'storno':/ELŐLEG/.test(title)?'eloleg':/VÉGSZÁMLA/.test(title)||/végszámla/i.test(o.items)?'vegszamla':/(DÍJBEKÉRŐ|PROFORMA)/.test(title)&&!db?'dijbekero':/foglal[oó]|előleg/i.test(o.items)?'eloleg':'szamla';
  const v=find(/^(VEV[OŐ]|CUSTOMER):?$/);
  if(v){const ys=[...new Set(it.filter(i=>i.x<W*0.45&&i.y<v.y-2&&(!hd||i.y>hd.y+2)).map(i=>Math.round(i.y)))].sort((a,b)=>b-a);
    const lines=ys.map(y=>it.filter(i=>Math.round(i.y)===y&&i.x<W*0.45).sort((a,b)=>a.x-b.x).map(i=>i.s).join(' '));
    o.buyer=(lines[0]||'').replace(/^"+|"+$/g,'').trim();const tx=lines.find(l=>/^(Adósz[aá]m|Tax no)/i.test(l));o.buyerTax=tx?tx.replace(/.*?:\s*/,''):'';}
  o.date=invDate(right(/^(Kiállítás dátuma|Issue date)/i)||right(/^Kelt/i));o.fulfill=invDate(right(/^(Teljesítés dátuma|Completion date)/i));o.due=invDate(right(/^(Fizetési határidő|Due date)/i));
  const sumL=it.filter(i=>/^(Összesen|Total):?$/.test(i.s)).sort((a,b)=>b.y-a.y)[0];
  if(sumL){const nums=it.filter(i=>Math.abs(i.y-sumL.y)<4&&i.x>sumL.x).sort((a,b)=>a.x-b.x).map(i=>invNum(i.s)).filter(n=>n!==null);if(nums.length){o.invNet=nums[0];o.invGross=nums[nums.length-1];}}
  const ft=it.filter(i=>/^-?[\d\s .,]+\s*(Ft|HUF|USD|EUR)$/.test(i.s)).sort((a,b)=>a.y-b.y)[0];if(ft){const c=/(USD|EUR)/.exec(ft.s);o.currency=c?c[1]:'HUF';if(!o.invGross)o.invGross=invNum(ft.s);}if(!o.invNet)o.invNet=o.invGross;
  o.paid=/kiegyenlítve|pénzügyileg teljesítve/i.test(all);
  return o;}
function szManualModal(kind,id,type){const t=szTargetInfo(kind,id);if(!t)return;
  openModal('Bizonylat feltöltése – '+t.name,`<div class="fields">
    <div class="field full"><label for="m-mfile">Bizonylat PDF-ben (pl. az Egri Ervin E.V. számlázz.hu-s számlája)</label><input class="inp" id="m-mfile" type="file" accept=".pdf,application/pdf" data-slot="${esc(type||'')}"></div>
    <div class="field full" id="m-mparse"><p class="hint" style="margin:0">Töltsd fel a PDF-et – a számot, a típust, a vevőt, a dátumokat és az összegeket az app olvassa ki belőle.</p></div>
    ${kind==='project'?szSharedPick(id,[],false).replace('A bejelölt projekt tételként kerül a számlára; a kifizetés mindegyik projektnél megjelenik.','Ha a számla több munkáról szól, jelöld be a többit is.'):''}
    <div class="field full mp-fix" id="m-mfix" hidden><p class="hint bad-txt" style="margin:0 0 6px">Nem sikerült minden adatot kiolvasni – töltsd ki a hiányzókat:</p><div class="fields">
      ${ms('issuer','Kiállító',[['ev','Egri Ervin E.V.'],['kft','Lumos Motion Kft.']],'ev')}${ms('mkind','Típus',Object.entries(SZ_KIND),type||'szamla')}
      ${mf('no','Bizonylatszám',{max:60})}${mf('buyer','Vevő',{v:t.buyer&&t.buyer.name||'',max:200})}
      ${mf('date','Kelt',{type:'date',v:todayISO()})}${mf('due','Fizetési határidő',{type:'date'})}
      ${mf('invNet','Nettó összeg (Ft)',{im:'numeric'})}${mf('invGross','Bruttó összeg (Ft)',{im:'numeric'})}</div></div>
  </div><p class="hint" id="m-mhint" style="margin:0">A PDF az ügyfél Drive-mappájába kerül (Számlák / év). A foglalószámla kifizetettként kerül be (a befizetés után készül).</p>`,
  {submitLabel:'Rögzítés',submit:async fd=>{const file=($('m-mfile')||{}).files&&$('m-mfile').files[0];
    if(!file){toast('Válaszd ki a bizonylat PDF-jét.',true);return;}
    const a={[kind==='project'?'projectId':'incomeId']:id,no:String(fd.get('no')||'').trim(),kind:fd.get('mkind'),issuer:fd.get('issuer'),buyer:String(fd.get('buyer')||'').trim(),date:fd.get('date'),due:fd.get('due'),
      invNet:moneyVal(fd.get('invNet')),invGross:moneyVal(fd.get('invGross')),projectIds:kind==='project'?[...document.querySelectorAll('[data-szshare]:checked')].map(x=>x.dataset.szshare):[]};
    if(!a.no||!a.invNet){const d=$('m-mfix');if(d)d.hidden=false;toast('Nem sikerült mindent kiolvasni – add meg a bizonylatszámot és az összeget.',true);return;}
    if(file.size>10*1024*1024){toast('A fájl legfeljebb 10 MB lehet.',true);return;}
    const btn=document.querySelector('#mform button[type=submit]');if(btn){btn.disabled=true;btn.textContent='Feltöltés…';}
    try{if(a.issuer==='kft'&&S.fin.sz&&S.fin.sz.hasKey){   // a Lumos Motion Kft. számlája a bekötött számlázz.hu-fiókból jön: hozzárendeljük, a kifizetést magától követi
        const d=await call('szLink',{[kind==='project'?'projectId':'incomeId']:id,no:a.no,kind:a.kind==='szamla'?'':a.kind,slot:type||'',projectIds:a.projectIds});closeModal();finApply(d);toast('Számla hozzárendelve: '+a.no+' – a kifizetést a számlázz.hu-ból követi');return;}
      a.b64=await readB64(file);a.name=file.name;a.mime=file.type||'application/pdf';
      const d=await call('szManual',a);closeModal();finApply(d);toast('Bizonylat rögzítve: '+a.no);}
    catch(e){handleErr(e);if(btn){btn.disabled=false;btn.textContent='Rögzítés';}}}});}
document.addEventListener('change',async e=>{if(e.target.id!=='m-mfile')return;const f=e.target.files&&e.target.files[0],box=$('m-mparse');if(!f||!box)return;
  box.innerHTML='<p class="hint" style="margin:0"><span class="spin" style="width:11px;height:11px;vertical-align:-1px"></span> A bizonylat beolvasása…</p>';
  let o={};try{o=await invParsePdf(f);}catch(err){o={};}
  const slot=e.target.dataset.slot||'';if(o.kind==='szamla'&&(slot==='dijbekero'||slot==='eloleg'))o.kind='eloleg';   // a Díjbekérő helyére feltöltött rendes számla = előre kiállított számla
  const set=(id,v)=>{const x=$(id);if(x&&v!==undefined&&v!==null&&v!=='')x.value=v;};
  set('m-no',o.no);set('m-mkind',o.kind);set('m-issuer',o.issuer);set('m-buyer',o.buyer);set('m-date',o.date);set('m-due',o.due);if(o.invNet)set('m-invNet',moneyFmt(o.invNet));if(o.invGross)set('m-invGross',moneyFmt(o.invGross));
  const ok=o.no&&o.invNet,fix=$('m-mfix');if(fix)fix.hidden=!!ok;
  const kftLinked=ok&&o.issuer==='kft'&&S.fin&&S.fin.sz&&S.fin.sz.hasKey;const mh=$('m-mhint');if(mh)mh.hidden=!!kftLinked;
  if(!$('m-mparse'))return;
  $('m-mparse').innerHTML=ok?`<div class="mp-sum"><div><span>Bizonylat</span><b>${esc(SZ_KIND[o.kind]||'Számla')} · ${esc(o.no)}</b></div><div><span>Kiállító</span><b>${o.issuer==='kft'?'Lumos Motion Kft.':o.issuer==='ev'?'Egri Ervin E.V.':'—'}</b></div>
      <div><span>Vevő</span><b>${esc(o.buyer||'—')}</b></div><div><span>Kelt · határidő</span><b>${esc((o.date||'—').replace(/-/g,'.'))} · ${esc((o.due||'—').replace(/-/g,'.'))}</b></div>
      <div><span>Nettó / bruttó</span><b>${ftFmt(o.invNet)} / ${ftFmt(o.invGross)}</b></div>${o.paid?'<div><span>Fizetés</span><b class="ok-txt">a számlán kiegyenlítettként szerepel</b></div>':''}</div>${kftLinked?'<p class="hint" style="margin:8px 0 0">A Lumos Motion Kft. számláját a számlázz.hu-ból kapcsoljuk – a kifizetést magától követi, nem kell jelölnöd.</p>':''}`
    :`<p class="hint bad-txt" style="margin:0">Ebből a fájlból nem sikerült minden adatot kiolvasni – töltsd ki lent a hiányzókat.</p>`;});
/* Számlaszám beírásakor: a számlázz.hu-tól lekérjük a számla adatait (a rövidített számot is felismeri) */
const szPrefix=()=>{const c={};((S.fin&&S.fin.invoices)||[]).forEach(x=>{const m=/^([A-Za-z]+)-\d{4}-/.exec(x.no||'');if(m)c[m[1]]=(c[m[1]]||0)+1;});return Object.keys(c).sort((a,b)=>c[b]-c[a])[0]||'LUMOS';};
let SZPK_T=0;
document.addEventListener('input',e=>{if(e.target.id!=='m-no'||!$('sz-peek'))return;clearTimeout(SZPK_T);const v=e.target.value.trim(),box=$('sz-peek');if(v.length<2){box.innerHTML='';S._szPeek=null;return;}
  SZPK_T=setTimeout(async()=>{box.innerHTML='<div class="sz-searching"><span class="sz-radar"></span><span>Keresés a számlázz.hu-ban<span class="sz-dots"><i>.</i><i>.</i><i>.</i></span></span></div>';
    try{const r=await call('szPeek',{no:v,prefix:szPrefix()});if(($('m-no')||{}).value.trim()!==v)return;S._szPeek={q:v,r};
      const ln=(r.linked||[]).map(id=>(projById(id)||{}).name).filter(Boolean);
      box.innerHTML=`<div class="sz-peek-ok">✓ <b>${esc(SZ_KIND[r.kind]||'Számla')} · ${esc(r.no)}</b> · ${esc(r.buyer||'—')} · ${esc((r.date||'').replace(/-/g,'.'))} · nettó ${ftFmt(num(r.invNet))} · ${num(r.invPaid)>=num(r.invGross)-1&&num(r.invGross)>0?'<span class="ok-txt">kifizetve</span>':'<span class="warn-txt">fizetésre vár</span>'}${(r.linked||[]).includes(box.dataset.pid)?`<div class="bl-meta" style="margin-top:4px">Már ehhez a projekthez tartozik – ${box.dataset.slot==='dijbekero'||box.dataset.slot==='eloleg'?'átkerül a <b>Díjbekérő</b> helyére (foglalószámla).':'átkerül a <b>Végszámla</b> helyére.'}</div>`:ln.length?`<div class="bl-meta" style="margin-top:4px">🔗 Már hozzá van rendelve: <b>${esc(ln.join(', '))}</b> – ehhez is hozzáadjuk, így közös számla lesz.</div>`:''}</div>`;}
    catch(err){if(($('m-no')||{}).value.trim()!==v)return;S._szPeek=null;box.innerHTML=`<span class="bad-txt">${esc(errText(err).replace(/^Hiba:\s*/,''))}</span>`;}},700);});
document.addEventListener('change',async e=>{if(e.target.id!=='m-invslot')return;const t=e.target;t.disabled=true;
  try{const d=await call('szSetKind',{id:t.dataset.invid,kind:t.value});closeModal();finApply(d);toast('Áthelyezve: '+(SZ_KIND[t.value]||t.value));}catch(err){handleErr(err);t.disabled=false;}});
ACT['sz-manual']=b=>szManualModal(b.dataset.kind,b.dataset.id,b.dataset.type);
ACT['sz-mpaid']=async b=>{try{const d=await call('szManual',{id:b.dataset.id,paid:b.dataset.paid==='1'});closeModal();finApply(d);toast(b.dataset.paid==='1'?'Kifizetettnek jelölve':'Kifizetés visszavonva');}catch(e){handleErr(e);}};
function szInvModal(x){const s=invState(x),g=num(x.invGross),p=num(x.invPaid);
  const tgt=x.projectId?invPids(x).map(id=>(projById(id)||{}).name||'?').join(', '):(((S.fin.income||[]).find(r=>r.id===x.incomeId))||{}).name;
  openModal((SZ_KIND[x.kind]||'Számla')+' '+x.no,`<div class="sz-info">
    <div><span>Vevő</span><b>${esc(x.buyer||'—')}</b></div><div><span>${invShared(x)?'Közös számla – projektek':'Ehhez tartozik'}</span><b>${esc(tgt||'—')}</b></div>
    <div><span>Kelt</span><b>${esc(x.date||'—')}</b></div><div><span>Fizetési határidő</span><b class="${s==='late'?'bad-txt':''}">${esc(x.due||'—')}</b></div>
    <div><span>Nettó / bruttó</span><b>${ftFmt(num(x.invNet))} / ${ftFmt(g)}</b></div>
    <div><span>Kifizetve</span><b class="${s==='paid'?'ok-txt':''}">${ftFmt(p)}${x.paidAt?' · '+esc(x.paidAt):''}</b></div>
    <div><span>Hova tartozik</span><b><select class="inp" id="m-invslot" data-invid="${esc(x.id)}" style="max-width:220px;padding:5px 8px;font-size:13px">${[['dijbekero','Díjbekérő'],['eloleg','Foglalószámla (díjbekérő helyén)'],['vegszamla','Végszámla'],['szamla','Számla (egyben)']].map(([k,l])=>`<option value="${k}"${k===x.kind?' selected':''}>${l}</option>`).join('')}</select></b></div>
    <div><span>Állapot</span><b><span class="statuspill ${INV_CLS[s]}">${{paid:'Kifizetve',part:'Részben fizetve',late:'Lejárt, nincs kifizetve',open:'Fizetésre vár'}[s]}</span></b></div>
    <div><span>${x.manual?'Kiállító':'Utoljára ellenőrizve'}</span><b>${x.manual?(x.issuer==='kft'?'Lumos Motion Kft.':'Egri Ervin E.V.')+' · kézi rögzítés':esc(x.checkedAt||'—')}</b></div></div>`,
  x.manual?{left:`<button type="button" class="btn danger small" data-action="sz-unlink" data-id="${esc(x.id)}">Törlés</button>${x.fileUrl?`<a class="btn outline small" href="${esc(x.fileUrl)}" target="_blank" rel="noopener">📄 Bizonylat megnyitása</a>`:''}`,cancelLabel:'Bezárás',
    submitLabel:s==='paid'?'Kifizetés visszavonása':'✅ Kifizetve',submit:()=>ACT['sz-mpaid']({dataset:{id:x.id,paid:s==='paid'?'0':'1'}})}:
  {left:`<button type="button" class="btn danger small" data-action="sz-unlink" data-id="${esc(x.id)}">Hozzárendelés törlése</button>`,cancelLabel:'Bezárás',submitLabel:'⬇️ PDF',submit:async()=>{
    const btn=document.querySelector('#mform button[type=submit]');if(btn){btn.disabled=true;btn.textContent='Letöltés…';}
    try{const d=await call('szPdf',{id:x.id});const bin=atob(d.b64),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
      const url=URL.createObjectURL(new Blob([arr],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download=d.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
    catch(e){handleErr(e);}finally{if(btn){btn.disabled=false;btn.textContent='⬇️ PDF';}}}});
  if(x.manual)return;const f=document.querySelector('#mform .mfoot');if(f){const r=document.createElement('button');r.type='button';r.className='btn outline';r.dataset.action='sz-sync-one';r.dataset.id=x.id;r.textContent='🔄 Frissítés';f.insertBefore(r,f.querySelector('button[type=submit]'));}}
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
  catch(e){if(!silent)handleErr(e);}finally{S._szSyncing=false;if(S.tab==='penzugy'||S.tab==='szerzodes')render(true);}}
Object.assign(ACT,{
  'sz-new':b=>{const k=b.dataset.kind,id=b.dataset.id;if(!S.fin.sz.hasKey){szSettingsModal('Az Agent-kulcs megadása után tudsz számlát kiállítani.');return;}szInvoiceModal(k,id,{type:k==='project'?billNextType(id):'szamla'});},
  'sz-link':b=>szLinkModal(b.dataset.kind,b.dataset.id,(($('m-kind')||{}).value)||b.dataset.type),
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
document.addEventListener('change',e=>{const t=e.target;if(t.id!=='m-kind'||!$('sz-items'))return;const f=$('sz-items').querySelector('[data-szitem]'),b=document.querySelector('[data-action="sz-link"]');if(!f||!b)return;
  const pre=szPreset(t.value,b.dataset.kind,b.dataset.id),box=$('sz-items');if(box&&!box.querySelector('[data-pid]:not(:first-child)')){box.innerHTML=(pre.items||[{name:pre.name,qty:1,price:pre.price,pid:b.dataset.kind==='project'?b.dataset.id:''}]).map(szItemRow).join('');}else{f.querySelector('[name=it_name]').value=pre.name;f.querySelector('[name=it_price]').value=moneyFmt(pre.price);}const h=$('sz-hint');if(h)h.textContent=SZ_HINT[t.value]||'';szTotals();
  const ht=document.querySelector('#mform .mhead h3');if(ht)ht.textContent=ht.textContent.replace(/^.*? kiállítása/,(SZ_KIND[t.value]||'Számla')+' kiállítása');if($('sz-prev')&&$('sz-prev').innerHTML)szPreview();});
/* Előnézet: a bizonylat a beírt adatokkal (a végleges PDF-et a számlázz.hu készíti) */
const SZ_SELLER={name:'Lumos Motion Kft.',addr:'1136 Budapest, Tátra utca 20/B 3/5',tax:'32701573-2-41',email:'ervin.egri@lumosmotion.com'};
function szPreview(){const f=$('mform');if(!f||!$('sz-items'))return;const fd=new FormData(f),k=fd.get('kind')||'szamla',its=szReadItems(),tot=szTotals(),h=s=>esc(String(s==null?'':s));
  const vr=v=>/^\d+$/.test(v)?Number(v):0,ft=n=>moneyFmt(Math.round(n))+' Ft',d=s=>String(s||'').replace(/-/g,'.');
  const sh=[...document.querySelectorAll('[data-szshare]:checked')].length;
  const html=`<html><head><meta charset="utf-8"><style>body{font-family:Inter,Arial,sans-serif;font-size:12px;color:#222;margin:28px 34px}h1{font-size:22px;margin:0 0 2px;letter-spacing:.5px}.sub{color:#777;margin-bottom:18px}
    .two{display:flex;gap:24px;margin-bottom:16px}.two>div{flex:1;border:1px solid #ddd;border-radius:8px;padding:10px 12px}.lb{font-size:10px;text-transform:uppercase;color:#888;letter-spacing:.6px;margin-bottom:4px}
    .meta{display:flex;gap:18px;margin:0 0 14px}.meta div b{display:block;font-size:12.5px}table{width:100%;border-collapse:collapse;margin:6px 0 12px}th,td{border-bottom:1px solid #e3e3e3;padding:6px 6px;text-align:left}th{font-size:10.5px;text-transform:uppercase;color:#666;background:#f6f6f6}.r{text-align:right;white-space:nowrap}
    .tot{margin-left:auto;width:280px}.tot div{display:flex;justify-content:space-between;padding:3px 0}.tot .g{font-size:15px;font-weight:800;border-top:2px solid #333;margin-top:4px;padding-top:6px}.note{margin-top:16px;color:#555;white-space:pre-line}.wm{margin-top:22px;font-size:10.5px;color:#a33;border-top:1px dashed #ccc;padding-top:8px}</style></head><body>
    <h1>${h((SZ_KIND[k]||'Számla').toUpperCase())}</h1><div class="sub">Sorszám: a kiállításkor kapja meg${sh?` · közös számla (${sh+1} projekt)`:''}</div>
    <div class="two"><div><div class="lb">Szállító</div><b>${h(SZ_SELLER.name)}</b><br>${h(SZ_SELLER.addr)}<br>Adószám: ${h(SZ_SELLER.tax)}<br>${h(SZ_SELLER.email)}</div>
      <div><div class="lb">Vevő</div><b>${h(fd.get('bName'))}</b><br>${h([fd.get('bZip'),fd.get('bCity')].filter(Boolean).join(' '))}${fd.get('bAddr')?', '+h(fd.get('bAddr')):''}${fd.get('bTax')?'<br>Adószám: '+h(fd.get('bTax')):''}${fd.get('bEmail')?'<br>'+h(fd.get('bEmail')):''}</div></div>
    <div class="meta"><div>Kelt<b>${d(todayISO())}</b></div><div>Teljesítés<b>${d(fd.get('fulfill'))}</b></div><div>Fizetési határidő<b>${d(fd.get('due'))}</b></div><div>Fizetési mód<b>${h(fd.get('payMethod'))}</b></div></div>
    <table><tr><th>Megnevezés</th><th class="r">Menny.</th><th class="r">Nettó egységár</th><th class="r">Nettó</th><th class="r">ÁFA</th><th class="r">Bruttó</th></tr>
    ${its.map(it=>{const n=Math.round(it.price*it.qty),v=Math.round(n*vr(it.vat)/100);return `<tr><td>${h(it.name)}</td><td class="r">${h(it.qty)} ${h(it.unit)}</td><td class="r">${ft(it.price)}</td><td class="r">${ft(n)}</td><td class="r">${/^\d+$/.test(it.vat)?it.vat+'%':h(it.vat)}</td><td class="r">${ft(n+v)}</td></tr>`;}).join('')}</table>
    <div class="tot"><div><span>Nettó összesen</span><b>${ft(tot.net)}</b></div><div><span>ÁFA</span><b>${ft(tot.vat)}</b></div><div class="g"><span>Fizetendő</span><span>${ft(tot.gross)}</span></div></div>
    ${k==='vegszamla'?'<div class="note">A végszámlából a számlázz.hu levonja a már kifizetett foglalót – a vevő a különbözetet fizeti.</div>':''}${k==='dijbekero'?'<div class="note">A díjbekérő nem számla; a kifizetés után foglalószámla készül róla.</div>':''}
    ${fd.get('comment')?`<div class="note">${h(fd.get('comment'))}</div>`:''}<div class="wm">ELŐNÉZET – a végleges, sorszámozott bizonylatot a számlázz.hu állítja ki.</div></body></html>`;
  const box=$('sz-prev');if(box){box.innerHTML='<div class="tig-prev-h"><b>Előnézet</b> <span class="muted">– így kerül ki; ha minden rendben, „Tovább”</span></div><iframe class="tig-frame" title="Bizonylat előnézete" sandbox></iframe>';box.querySelector('iframe').srcdoc=html;if(!szPreview.noScroll)box.scrollIntoView({behavior:'smooth',block:'start'});}}
ACT['sz-preview']=()=>szPreview();
document.addEventListener('input',e=>{if($('sz-prev')&&$('sz-prev').innerHTML&&e.target.closest&&e.target.closest('#mform')){clearTimeout(S._szpT);S._szpT=setTimeout(()=>{const y=scrollY,b=$('sz-prev');if(!b)return;const fr=b.querySelector('iframe');szPreview.noScroll=1;szPreview();szPreview.noScroll=0;},500);}});
document.addEventListener('change',e=>{const t=e.target;if(t.closest&&t.closest('#sz-items'))szTotals();
  if(t.id==='m-szClient'){const c=(S.clients||[]).find(x=>x.id===t.value);if(!c)return;const a=szSplitAddr(c.address);
    [['m-bName',c.name],['m-bTax',c.tax],['m-bEmail',szBillingEmail(c,null)],['m-bZip',a.zip],['m-bCity',a.city],['m-bAddr',a.address]].forEach(([k,v])=>{if($(k))$(k).value=v||'';});}
  if(t.id==='m-szClient')szBuyerLock();});
/* A vevő neve, adószáma és címe az ügyféladatokból (számlázz.hu) jön – nem írható át; csak kézi megadásnál szerkeszthető */
function szBuyerLock(){const sel=$('m-szClient');if(!sel)return;const lock=!!sel.value&&!!(($('m-bName')||{}).value||'').trim();
  ['m-bName','m-bTax','m-bZip','m-bCity','m-bAddr'].forEach(k=>{const e=$(k);if(e){e.readOnly=lock;e.classList.toggle('ro-inp',lock);}});
  const h=$('sz-buyer-lock');if(h)h.textContent=lock?'🔒 A vevő adatai az ügyféltörzsből jönnek. Más vevőhöz válaszd a „kézi megadás”-t.':'';}

ACT['inc-to-proj']=b=>{const r=((S.fin&&S.fin.income)||[]).find(x=>x.id===b.dataset.id);if(!r)return;const d=parseInt(r.day,10);
  newProjectModal('',{name:r.name,amount:num(r.amount),date:r.month+'-'+String(d>=1&&d<=31?d:1).padStart(2,'0')});};

ACT['fin-proj-new']=()=>{const m=S.finMonth||todayISO().slice(0,7);guard(()=>newProjectModal(m===todayISO().slice(0,7)?todayISO():m+'-01'));};

/* Bevételek ✏️: csak a név módosítása (projektnél a projekt neve, egyéb / régi sornál a sor neve) */
ACT['inc-rename']=b=>{const id=b.dataset.id,isP=b.dataset.kind==='project',p=isP?projById(id):null,r=isP?null:((S.fin&&S.fin.income)||[]).find(x=>x.id===id);if(!p&&!r)return;
  openModal(isP?'Projekt átnevezése':'Bevétel átnevezése',`<div class="fields">${mf('name','Megnevezés',{full:true,v:(p||r).name||'',max:isP?160:200})}</div>`,{submitLabel:'Mentés',submit:async(fd,form)=>{
    const n=String(fd.get('name')||'').trim();if(n.length<2){toast('Add meg a nevet (legalább 2 karakter).',true);return;}if(n===(p||r).name){closeModal();return;}
    if(r){const row=Object.assign({},r,{name:n});finSave('finUpsert',{table:'income',row},'Átnevezve',()=>finLocal('income',[row]));return;}
    if(S.draft&&S.draft.id===id){closeModal();setDraft({name:n});setTimeout(()=>{if(S.dirty)saveDraft();},0);toast('Átnevezve');return;}
    try{const saved=await call('saveProject',Object.assign(clone(p),{name:n,baseUpdatedAt:p.updatedAt||'',mutationId:uuid(),deferCal:true}));const k=S.projects.findIndex(x=>x.id===id);if(k>=0)S.projects[k]=saved;closeModal();render(true);toast('Projekt átnevezve');if(saved.calEventId&&typeof syncCal==='function')syncCal(saved.id);}
    catch(e){handleErr(e);}}});};
