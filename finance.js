'use strict';
/* ===== Bevétel és kiadás (csak ügyvezető) – a régi „Lumos Motion Árbevétel” táblázat kiváltása =====
   Bevétel projektenként: díjazás → nyereség % + értékesítés % + marketing % + termelési költség, a maradék az Eszköz/Rezsi alapba.
   A rezsi- és marketingkiadások ezekből az alapokból mennek, az egyenleg hónapról hónapra áthozódik.
   A beállított hónaptól („app számol”) a projektekből számolunk, előtte a régi táblázatból importált sorokból. */
const PAY_LABEL={'':'—',var:'Fizetésre vár',eloleg:'Foglaló fizetve',teljes:'Teljes fizetve',beszamitva:'Beszámítva'};   // beszámítva: egy másik projekt számlájából levonva
const PAY_CLS={'':'',var:'p-warn',eloleg:'p-info',teljes:'p-ok',beszamitva:'p-ok'};
const FUND_LABEL={rezsi:'Eszközköltség, rezsi',marketing:'Marketing költség'};
const finOn=()=>isAdmin()&&!!(S.capabilities&&S.capabilities.finance);
const sFt=n=>(n<0?'−':'')+ftFmt(Math.abs(n));
const signedVal=s=>{const t=String(s||'').replace(/\s/g,'');if(!t)return 0;const neg=/^[-−]/.test(t),d=t.replace(/\D/g,'');return d?(neg?-1:1)*Number(d):0;};
/* Betöltés / hiba: hibánál nem próbálkozunk újra magától (különben végtelen újratöltés lenne), csak gombra */
function finLoadingView(){if(S.finErr)return `<div class="panel">${empty('Nem sikerült betölteni: '+esc(S.finErr))}<div class="btns"><button class="btn primary" type="button" data-action="fin-retry">Újrapróbálás</button></div></div>`;
  finLoad();return '<div class="loading"><span class="spin"></span>Betöltés…</div>';}
const FIN_CACHE_KEY='lumos_pm_fin_v1';   // az ügyvezető saját böngészőjében: frissítéskor azonnal látszik az utolsó állapot, a friss adat a háttérben jön
function finCacheGet(){try{const c=JSON.parse(localStorage.getItem(FIN_CACHE_KEY)||'null');if(!c||!S.me||S.me.role!=='admin'||c.tk!==String(TOKEN).slice(-16)||Date.now()-c.at>7*864e5)return null;return pendPatch(c.d);}catch(e){return null;}}
function finCacheSave(d){try{if(S.me&&S.me.role==='admin'&&d)localStorage.setItem(FIN_CACHE_KEY,JSON.stringify({tk:String(TOKEN).slice(-16),at:Date.now(),d}));}catch(e){}}
async function finLoad(force){if(!S.fin&&!S._finCacheTried){S._finCacheTried=true;const c=finCacheGet();if(c){S.fin=c;S.finErr='';force=true;setTimeout(()=>{if(S.tab==='penzugy'||S.tab==='szerzodes'||S.tab==='ugyfelek'||S.projectId)render(true);},0);}}
  if(S.fin&&!force)return;if(S._finLoading)return;if(S.fin&&(S._finLive||0)>0){setTimeout(()=>finLoad(true),1500);return;}S._finLoading=true;const mut0=S._finMut||0;
  try{const d=await call('finData');if(((S._finMut||0)!==mut0||(S._finLive||0)>0)&&S.fin){S._finLoading=false;setTimeout(()=>finLoad(true),1500);return;}   // közben módosítottál: a régebbi adat ne írja felül
    S.fin=d;S.finErr='';finCacheSave(d);}catch(e){if(!S.fin){S.finErr=errText(e)||'Hiba';}handleErr(e);}finally{S._finLoading=false;if(S.tab==='penzugy'||S.tab==='szerzodes'||(S.tab==='ugyfelek'&&!$('modalRoot').innerHTML))render(true);
    else if(S.tab==='projektek'&&S.projectId&&$('proj-bill')&&typeof projBillingPanel==='function'){const p=S.draft||projById(S.projectId);$('proj-bill').outerHTML=projBillingPanel(p)||'';}}
  const sz=S.fin&&S.fin.sz;if(sz&&sz.hasKey&&!S._szAuto&&(S.fin.invoices||[]).some(x=>num(x.invPaid)<num(x.invGross)-1)){S._szAuto=true;szSync(true);}}   // betöltéskor egyszer csendben frissítjük a kifizetéseket
const FIN_KEYS=['bankTx','bankPay','bankTxOff','bankTxLoan','szDocs','bankKeyAt','income','expense','loan','settings','invoices','billing','frameworks','tigs','sz'];
function finApply(d){const part={};FIN_KEYS.forEach(k=>{if(d&&d[k]!==undefined)part[k]=d[k];});S.fin=Object.assign({},S.fin||{},part);finCacheSave(S.fin);   // a szerver csak a módosult táblát küldi vissza
  (d.invoices||[]).forEach(x=>invPids(x).forEach(pid=>{const p=projById(pid);if(p){const st=szPayOf(pid);if(st)p.payStatus=st;}}));render(true);}
/* Közös számla: a fő projekt + a projectIds-ben felsorolt további projektek; a projekt részaránya a projektértékek arányában */
const invPids=x=>[x.projectId,...String(x.projectIds||'').split(',')].filter(Boolean);
const invShared=x=>invPids(x).length>1;
function invShare(x,pid){const ids=invPids(x);if(ids.length<2||!ids.includes(pid))return 1;const v=ids.map(id=>projTotal(projById(id)||{})),sum=v.reduce((a,b)=>a+b,0);return sum?v[ids.indexOf(pid)]/sum:1/ids.length;}
const invPaidOk=x=>(x.kind==='eloleg'&&!!x.manual)||(num(x.invGross)>0&&num(x.invPaid)>=num(x.invGross)-1);   // a kézi foglalószámla a befizetés után készül, tehát kifizetett
const szPayOf=pid=>{const l=((S.fin&&S.fin.invoices)||[]).filter(x=>invPids(x).includes(pid));if(!l.length)return '';const fin=l.filter(x=>x.kind==='szamla'||x.kind==='vegszamla'||!x.kind),adv=l.filter(x=>x.kind==='dijbekero'||x.kind==='eloleg'),any=a=>a.some(x=>num(x.invPaid)>0||invPaidOk(x));
  if(fin.length)return fin.every(invPaidOk)?'teljes':any(fin)||any(adv)?'eloleg':'var';if(!any(adv))return 'var';
  /* a foglaló a teljes összeget fedezi (pl. 100%-os, közös foglalószámla) → kifizetve – a közös számlából a projektre eső rész számít */
  try{const p=projById(pid),tot=p?num(projTotal(p)):0,pn=k=>adv.filter(x=>x.kind===k).reduce((s,x)=>{const g=num(x.invGross),pg=x.kind==='eloleg'&&x.manual?g:num(x.invPaid);return s+(g>0?pg*num(x.invNet)/g:0)*invShare(x,pid);},0),paidNet=Math.max(pn('dijbekero'),pn('eloleg'));   /* a fizetett díjbekérőből előlegszámla lesz – ugyanaz a befizetés egyszer számít */if(tot>0&&paidNet>=tot-5)return 'teljes';}catch(e){}
  return 'eloleg';};
const finSet=()=>(S.fin&&S.fin.settings)||{profitPct:30,ceoPct:5,marketingPct:5,openMonth:'',openRezsi:0,openMarketing:0,appFromMonth:''};
/* Egy projekt felosztása */
const ovPct=v=>v===''||v==null||!isFinite(Number(v))?null:Number(v);
/* Értékesítői jutalék díjsorként (az értékesítő szerepű munkatárs díja, vagy „értékesít…/jutalék” feladat): nem termelési költség */
function finSalesFees(p){const only=cid=>{const rs=(p.crew||[]).filter(a=>a.crewId===cid).map(a=>a.role);return rs.length>0&&rs.every(r=>r==='Értékesítő');};
  return (p.fees||[]).filter(f=>f.crewId&&f.kind!=='fixed'&&(only(f.crewId)||/értékesít|jutalék/i.test(String(f.task||'')))).reduce((a,f)=>a+num(f.amount),0);}
function finProjectRow(p){const st=finSet(),amount=projTotal(p),ref=Math.round((p.fees||[]).filter(f=>f.kind==='fixed'&&f.key==='ref').reduce((a,f)=>a+num(f.amount),0)),fees=Math.round(feeSum(p)-finSalesFees(p))-ref;   // az ajánlói jutalék külön oszlopban (nem munkadíj)
  const exr=typeof extrasRaw==='function'?extrasRaw(p):[],tovOnly=Math.round(exr.filter(x=>x&&x.kind==='tov').reduce((a,x)=>a+num(x.amount),0)),sajat=Math.round(exr.filter(x=>x&&x.kind==='sajat').reduce((a,x)=>a+num(x.amount),0)),
    tov=tovOnly+sajat,   /* a saját költség (pl. tankolás) a továbbszámlázotthoz hasonlóan a teljes összegből vonódik le (egy oszlopban, a lebontásban külön sorban) */
    org=Math.round(typeof orgFee==='function'?num(orgFee(p)):0),
    base=Math.max(0,amount-tov-org),
    prod=fees+tov+org+ref;   // munkadíjak + ajánlói jutalék + továbbszámlázás + szervezői jutalék: három külön oszlop, együtt a teljes költség
  const b=typeof billOf==='function'?billOf(p.id):{},cp=ovPct(b.ceoPct),rp=ovPct(b.rezsiPct);
  const dl=typeof projDeal==='function'?projDeal(p):null,
    salesAssigned=!!(dl&&String(dl.ownerId||'').trim()),
    de=salesAssigned&&typeof salesCommEst==='function'?salesCommEst(p,dl):null;
  // Értékesítő nélkül 0 Ft jutalék. A szervezői díj az átfolyó költségekhez tartozik.
  const calculated=de&&Number.isFinite(Number(de.amt))?Math.round(num(de.amt)):Math.round(base*(cp??st.ceoPct)/100);
  let ceo=salesAssigned?Math.max(0,calculated):0,marketing=Math.round(base*st.marketingPct/100);
  let profit,rezsi;if(rp!=null){rezsi=Math.round(base*rp/100);profit=amount-prod-ceo-marketing-rezsi;}else{profit=Math.round(base*st.profitPct/100);rezsi=amount-profit-ceo-marketing-prod;}
  if(!amount){profit=0;ceo=0;rezsi=0;marketing=-prod;}
  return {kind:'project',p,id:p.id,day:String(Number(pr(p).start.slice(8))),name:p.name||'Névtelen projekt',payStatus:p.payStatus||'',amount,base,fees,prod,tov,tovOnly,sajat,org,ref,profit,ceo,marketing,rezsi,salesAssigned,ceoOv:salesAssigned&&cp!=null&&!(de&&Number.isFinite(Number(de.amt))),rezsiOv:rp!=null,ceoBy:salesAssigned&&de&&de.amt>0?(dl.ownerName||'értékesítő'):''};}
/* Régi táblázat sora ↔ projekt: közös jellemző szó a névben (ügyfél, helyszín is számít), a gyakori szavak nélkül */
const LEG_STOP=new Set('technikai ugyelet konferencia rendezveny webinar stream short video videok forgatas podcast hibrid masodik eloadas youtube napja workshop kiallitas esemeny budapest hungary kft zrt bt nonprofit egyesulet alapitvany tagozat levelezo akademia gala unnepseg evzaro fesztival expo talalkozo csoportos and the of az es db 2024 2025 2026 2027 ak tal csop ut utca ter krt hotel center etterem kavehaz'.split(' '));
const legTok=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').split(' ').filter(w=>w.length>=2&&!LEG_STOP.has(w));
const HU_MN=['januar','februar','marcius','aprilis','majus','junius','julius','augusztus','szeptember','oktober','november','december'];
const monthWords=s=>{const t=String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/[^a-z]+/);return HU_MN.filter(m=>t.includes(m));};
const monthClash=(a,b)=>{const x=monthWords(a),y=monthWords(b);return x.length&&y.length&&!x.some(m=>y.includes(m));};   // pl. „… November” sor ≠ „… Október” projekt
const legHit=(a,b)=>a.some(x=>b.some(y=>x===y||(x.length>=5&&y.startsWith(x))||(y.length>=5&&x.startsWith(y))));
function finIncomeFor(m){const st=finSet(),fin=S.fin||{},appFrom=st.appFromMonth;
  const fromApp=!appFrom||m>=appFrom;
  const legAll=fromApp?[]:(fin.income||[]).filter(r=>r.month===m&&r.legacy),legR=legAll.filter(r=>!pairSet(r)),legT=legR.map(r=>legTok(r.name)),legPin=new Set(legAll.map(r=>(PAIR_RE.exec(r.note||'')||[])[1]).filter(Boolean));
  const proj=S.projects.filter(p=>p.status!=='lemondva'&&pr(p)&&pr(p).start.slice(0,7)===m&&!isMktProj(p.id)&&(projTotal(p)||feeSum(p)||!isFree(p))&&!legPin.has(p.id)&&(fromApp||!legT.some((l,k)=>!monthClash(legR[k].name,p.name)&&legHit(legTok([p.name,p.client,p.venue].join(' ')),l)))).map(finProjectRow);   // régi hónapban: az a projekt is, amely nincs a régi táblázatban
  const manual=(fin.income||[]).filter(r=>r.month===m&&(r.legacy?!fromApp:true)).map(r=>Object.assign({kind:'manual'},r,{amount:num(r.amount),prod:num(r.prod),profit:num(r.profit),ceo:num(r.ceo),marketing:num(r.marketing),rezsi:Number(r.rezsi)||0}));
  // régi sor, amely egyetlen projekthez tartozik: a projekt aktuális adataival (név, összeg, felosztás) jelenik meg – a projektben javított ár itt is látszik
  const lk=manual.map(r=>r.legacy?(incProj(r)||{}).id||'':''),cnt={};lk.forEach(id=>{if(id)cnt[id]=(cnt[id]||0)+1;});
  const shown=new Set(proj.map(x=>x.id));
  manual.forEach((r,k)=>{const id=lk[k];if(!id||cnt[id]!==1||shown.has(id))return;const p=projById(id);if(!p||p.status==='lemondva'||isMktProj(id))return;
    manual[k]=Object.assign(finProjectRow(p),{payStatus:p.payStatus||r.payStatus||'',legacyId:r.id});shown.add(id);});
  const dayN=x=>parseInt(x.day,10)||99;
  return proj.concat(manual).sort((a,b)=>dayN(a)-dayN(b)||a.name.localeCompare(b.name,'hu'));}
/* Régi / kézi bevételi sor projektje: az appból frissített sor megjegyzése vagy azonos nevű projekt ugyanabban a hónapban */
const PAIR_RE=/\[projekt:([A-Za-z0-9-]{8,64})\]/,NOPAIR_RE=/\[nincs projekt\]/;   // kézzel jóváhagyott párosítás a bevételi sor megjegyzésében
const pairSet=r=>PAIR_RE.test(r.note||'')||NOPAIR_RE.test(r.note||'');
function incProj(r){const pm=PAIR_RE.exec(r.note||'');if(pm)return projById(pm[1])||null;if(NOPAIR_RE.test(r.note||''))return null;
  const m=/^Az appból frissítve: (.+?)(?: \| |$)/.exec(r.note||''),n=(m?m[1]:r.name||'').trim();if(!n)return null;
  const inM=p=>p.status!=='lemondva'&&pr(p)&&pr(p).start.slice(0,7)===r.month;
  const ex=S.projects.find(p=>p.name===n&&pr(p)&&pr(p).start.slice(0,7)===r.month);if(ex)return ex;
  const lt=legTok(n),hit=lt.length?S.projects.filter(inM).filter(p=>!monthClash(n,p.name)&&legHit(legTok([p.name,p.client,p.venue].join(' ')),lt)):[];   // eltérő írásmód: ugyanaz a szóegyezés, ami a régi hónapokban a projektet a régi sorhoz köti
  if(hit.length===1)return hit[0];
  if(hit.length>1){const sc=p=>{const pt=legTok([p.name,p.client,p.venue].join(' '));return lt.filter(x=>legHit([x],pt)).length;},v=hit.map(sc),mx=Math.max(...v);if(v.filter(x=>x===mx).length===1)return hit[v.indexOf(mx)];}   // több jelölt: amelyikkel több szó egyezik (pl. „Dalila”)
  const d=parseInt(r.day,10);if(!d||!hit.length)return null;const ds=r.month+'-'+String(d).padStart(2,'0');   // több azonos nevű (pl. Lurdy): a nap dönt
  const byDay=hit.filter(p=>{const x=pr(p);return x.start<=ds&&ds<=(x.end||x.start);});
  return byDay.length===1?byDay[0]:null;}
/* Egy bevételi sorból beérkezett (nettó) összeg: teljes fizetés = díjazás; foglalónál a számlák kifizetett része, ennek hiányában a foglaló %-a */
/* Fizetési állapot a bizonylatokból (projekt / régi bevételi sor); ha nincs bizonylat, a régi kézi állapot */
function finPayOf(r){const lp=r.kind==='project'?null:incProj(r),pid=r.kind==='project'?r.id:lp&&lp.id;const st=pid?szPayOf(pid):(()=>{const l=invFor('income',r.id);if(!l.length)return '';const fin=l.filter(x=>x.kind==='szamla'||x.kind==='vegszamla'||!x.kind),adv=l.filter(x=>x.kind==='dijbekero'||x.kind==='eloleg'),any=a=>a.some(x=>num(x.invPaid)>0||invPaidOk(x));return fin.length?(fin.every(invPaidOk)?'teljes':any(fin)||any(adv)?'eloleg':'var'):any(adv)?'eloleg':'var';})();return st||r.payStatus||'';}
function finReceived(r){const ps=finPayOf(r);if(ps==='teljes'||ps==='beszamitva')return num(r.amount);if(ps!=='eloleg')return 0;
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
    toast(`${del.length} duplikált kiadás törölve (az ismétlődő tétel megmaradt) – ${KBD_UNDO} visszahozza`);}
  catch(e){handleErr(e);finLoad(true);}finally{S._expDedupe=false;render(true);}}
/* Saját marketing projekt (nincs ügyfélbevétel): a termelési költsége a marketing alapból megy, a Marketing költség táblában */
/* Saját marketing projekt: kézzel jelölve, vagy magától, ha nincs értéke, de van termelési költsége (pl. Bussiness Bash). A „vissza a bevételek közé” ('0') felülírja. */
const isMktProj=pid=>{if(typeof billOf!=='function')return false;const m=String(billOf(pid).mktProject||'');if(m==='1')return true;if(m==='0')return false;const p=projById(pid);return !!p&&!projTotal(p)&&feeSum(p)>0;};
function finMktProjects(m){return S.projects.filter(p=>p.status!=='lemondva'&&pr(p)&&pr(p).start.slice(0,7)===m&&isMktProj(p.id)).map(p=>({id:'proj:'+p.id,pid:p.id,kind:'proj',fund:'marketing',name:p.name||'Névtelen projekt',amount:Math.round(feeSum(p))}));}
function finExpensesFor(m){return ((S.fin&&S.fin.expense)||[]).filter(e=>e.kind==='fix'?(e.from&&e.from<=m&&(!e.to||e.to>=m)):e.month===m).concat(finMktProjects(m)).sort((a,b)=>(a.kind==='fix'?0:1)-(b.kind==='fix'?0:1)||num(b.amount)-num(a.amount)||a.name.localeCompare(b.name,'hu'));}   // fix elöl, összeg szerint csökkenő
/* A díjazáshoz viszonyított arány (pl. a termelés vagy a megmaradó eszköz-rezsi rész hány %-a a bevételnek) */
const pctOf=(v,base)=>{base=Number(base)||0;if(!base)return '';const x=Math.round(Number(v)/base*100);return `<span class="pct${x<0?' neg':''}">${x<0?'−':''}${Math.abs(x)}%</span>`;};
/* A három költségnem külön jelenik meg. A régi, kézi sorokban a szervezői jutalék még az értékesítésbe van beépítve. */
const finWages=r=>Math.round(r.fees!=null?num(r.fees):num(r.prod)-num(r.tov));
const finOrgCost=r=>Math.round(num(r.org));
const finSalesCost=r=>Math.round(num(r.ceo)-(r.kind==='project'?0:num(r.org)));
/* Módosítható %: értékesítés és eszköz-rezsi (a termelés % fix, a díjakból jön). Üresre törölve visszaáll az alapértékre. */
const pctNum=(v,base)=>{base=Number(base)||0;return base?Math.round(Number(v)/base*1000)/10:0;};
function pctIn(r,k){const v=pctNum(k==='ceo'?finSalesCost(r):r[k],r.base!=null?r.base:r.amount),ov=k==='ceo'?r.ceoOv:r.rezsiOv;
  if(k==='ceo'&&r.kind==='project')return !r.salesAssigned?'<span class="pct-lock" data-tip="Értékesítő kiválasztásáig a jutalék 0%. Az értékesítőt a projekt Pénzügyek paneljén tudod hozzárendelni.">0%</span>'   // az értékesítési % itt már nem írható át – a projekt Pénzügyek részében állítható
    :`<span class="pct-lock" data-tip="${r.ceoBy?esc(r.ceoBy)+' értékesítői jutaléka – ':'Értékesítési jutalék – '}a projekt Pénzügyek részében állítható">${String(v).replace('.',',')}%</span>`;
  return `<input class="pct-in${ov?' ov':''}${v<0?' neg':''}" type="text" inputmode="decimal" value="${String(v).replace('.',',')}" data-finpct="${k}" data-kind="${esc(r.kind)}" data-id="${esc(r.id)}" aria-label="${k==='ceo'?'Értékesítés':'Eszköz, rezsi'} %" title="${ov?'Egyedi érték – üresre törölve visszaáll az alapra':k==='ceo'&&r.ceoBy?esc(r.ceoBy)+' értékesítői jutaléka (a projekt Pénzügyek részéből) – átírhatod':k==='ceo'?'Alapérték a beállításokból – átírhatod':'A maradék – átírva a nyereség igazodik hozzá'}"${r.amount?'':' disabled'}>`;}
async function finSetPct(t){const k=t.dataset.finpct,id=t.dataset.id,kind=t.dataset.kind,raw=String(t.value).trim().replace('%','').replace(',','.');
  const v=raw===''?null:Number(raw);if(v!=null&&(!isFinite(v)||v<0||v>100)){toast('0 és 100 közötti százalékot adj meg.',true);render(true);return;}
  const undoMsg='Mentve – visszavonás: '+(/Mac/.test(navigator.platform)?'⌘':'Ctrl')+' + Z';
  if(kind==='project'){if(k==='ceo'){const p=projById(id),d=p&&typeof projDeal==='function'?projDeal(p):null;if(!d||!d.ownerId){toast('Előbb válassz értékesítőt a projekt adatlapján.',true);render(true);return;}}
    const f=k==='ceo'?'ceoPct':'rezsiPct',val=v==null?'':v,prev=(billOf(id)||{})[f];FIN_UNDO.push({kind,id,f,prev:prev==null?'':prev});finSave('billSave',{projectId:id,[f]:val},undoMsg,()=>{const b=billOf(id);finLocal('billing',[Object.assign({},b,{id:b.id||newId(),projectId:id,[f]:val})]);});return;}
  const r=((S.fin&&S.fin.income)||[]).find(x=>x.id===id);if(!r)return;const st=finSet(),amount=num(r.amount),prod=num(r.prod),mk=num(r.marketing);
  let ceo=num(r.ceo),profit=num(r.profit),rezsi=Number(r.rezsi)||0;
  if(k==='ceo'){ceo=Math.round(num(r.base!=null?r.base:amount)*(v??st.ceoPct)/100)+num(r.org);rezsi=amount-prod-profit-ceo-mk;}   // értékesítés változott: a maradék (eszköz-rezsi) igazodik
  else{rezsi=v==null?amount-prod-Math.round(amount*st.profitPct/100)-ceo-mk:Math.round(amount*v/100);profit=amount-prod-ceo-mk-rezsi;}   // eszköz-rezsi változott: a nyereség igazodik
  const row=Object.assign({},r,{ceo,profit,rezsi});FIN_UNDO.push({kind,row:Object.assign({},r)});S._finInline=true;finSave('finUpsert',{table:'income',row},undoMsg,()=>finLocal('income',[row]));}
/* Projekt nélküli bevétel munkadíja (Ft) kézzel: a termelési költség változik, az eszköz-rezsi (maradék) igazodik */
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||!(t.dataset.finwage||t.dataset.finwagepct)||!isAdmin())return;const r=((S.fin&&S.fin.income)||[]).find(x=>x.id===t.dataset.id);if(!r)return;
  const pc=t.dataset.finwagepct?parseFloat(String(t.value).replace('%','').replace(',','.')):null;if(t.dataset.finwagepct&&(!isFinite(pc)||pc<0||pc>100)){toast('0 és 100 közötti százalékot adj meg.',true);return;}
  const prod=t.dataset.finwagepct?Math.round(num(r.amount)*pc/100):Number(String(t.value).replace(/\D/g,''))||0,amount=num(r.amount),row=Object.assign({},r,{prod,rezsi:amount-prod-num(r.profit)-num(r.ceo)-num(r.marketing)});
  FIN_UNDO.push({kind:'manual',row:Object.assign({},r)});S._finInline=true;finSave('finUpsert',{table:'income',row},'Munkadíj mentve – visszavonás: '+(/Mac/.test(navigator.platform)?'⌘':'Ctrl')+' + Z',()=>finLocal('income',[row]));});
document.addEventListener('keydown',e=>{const t=e.target;if(e.key==='Enter'&&t.dataset&&(t.dataset.finwage||t.dataset.finwagepct)){e.preventDefault();t.blur();}});
document.addEventListener('input',e=>{const t=e.target;if(!t.dataset||!(t.dataset.finwage||t.dataset.finwagepct))return;const r=((S.fin&&S.fin.income)||[]).find(x=>x.id===t.dataset.id);if(!r||!num(r.amount))return;const tr=t.closest('tr');if(!tr)return;   // a % és a Ft mező gépelés közben együtt mozog
  if(t.dataset.finwagepct){const o=tr.querySelector('[data-finwage]'),v=parseFloat(String(t.value).replace(',','.'));if(o&&isFinite(v))o.value=moneyFmt(Math.round(num(r.amount)*v/100));}
  else{const o=tr.querySelector('[data-finwagepct]'),v=Number(String(t.value).replace(/\D/g,''))||0;if(o)o.value=String(Math.round(v/num(r.amount)*1000)/10).replace('.',',');}});
/* Visszavonás (⌘/Ctrl + Z) a százalékmezőkön: Esc szerkesztés közben az eredeti értéket adja vissza; mentés után a legutóbbi módosítást vonja vissza */
const FIN_UNDO=[];
function finUndo(){const u=FIN_UNDO.pop();if(!u){toast('Nincs visszavonható módosítás.');return;}
  if(u.kind==='project'){finSave('billSave',{projectId:u.id,[u.f]:u.prev},'Visszavonva',()=>{const b=billOf(u.id);finLocal('billing',[Object.assign({},b,{id:b.id||newId(),projectId:u.id,[u.f]:u.prev})]);});}
  else finSave('finUpsert',{table:'income',row:u.row},'Visszavonva',()=>finLocal('income',[u.row]));}
document.addEventListener('focusin',e=>{const t=e.target;if(t.dataset&&t.dataset.finpct)t.dataset.orig=t.value;});
document.addEventListener('keydown',e=>{const t=e.target,inPct=t&&t.dataset&&t.dataset.finpct;
  if(inPct&&e.key==='Escape'){e.preventDefault();t.value=t.dataset.orig||t.value;t.blur();return;}
  if((e.metaKey||e.ctrlKey)&&!e.shiftKey&&(e.key==='z'||e.key==='Z')){if(inPct&&t.value!==t.dataset.orig)return;   /* szerkesztés közben a böngésző saját visszavonása */
    const ed=t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));if((ed&&!inPct)||!document.querySelector('.fin-inc')||!FIN_UNDO.length)return;e.preventDefault();if(inPct)t.blur();finUndo();}});
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
/* Eltérés a Szerződés és számlázás „havi bevétel” csempéjétől: tételenként, miért más a két összeg */
function finDiffRows(m){const proj=S.projects.filter(p=>p.status!=='lemondva'&&pr(p)&&pr(p).start.slice(0,7)===m),rows=finIncomeFor(m),byP={},extra=[];
  rows.forEach(r=>{const pid=r.kind==='project'?r.id:(incProj(r)||{}).id;if(pid&&proj.some(p=>p.id===pid)){(byP[pid]=byP[pid]||[]).push(r);}else extra.push(r);});
  const out=[];proj.forEach(p=>{const bill=projTotal(p),L=byP[p.id]||[],bev=L.reduce((s,r)=>s+num(r.amount),0);if(bev===bill)return;
    out.push({name:p.name||'Projekt',pid:p.id,bill,bev,why:!L.length?(isMktProj(p.id)?'saját marketing projekt – a Bevételekben nem szerepel':'nincs a Bevételek között (a régi táblázat egy hasonló nevű sora takarja, vagy nincs értéke)'):L.length>1?'több bevételi sor tartozik hozzá ('+L.map(r=>r.name).join(' + ')+')':L.some(r=>r.kind!=='project')?'a régi táblázat sorának összege eltér a projekt értékétől':'eltérő érték'});});
  extra.forEach(r=>{if(num(r.amount))out.push({name:r.name,bill:0,bev:num(r.amount),why:r.kind==='manual'&&r.legacy?'régi táblázat sora, ebben a hónapban nincs hozzá projekt':'kézi bevétel, nem projekt'});});
  return out;}
ACT['fin-diff']=b=>{const m=b.dataset.m,L=finDiffRows(m),d=L.reduce((s,x)=>s+x.bev-x.bill,0);
  openModal('Eltérés a számlázástól – '+F_YM.format(toDate(m+'-01')),`<p class="hint" style="margin:0 0 10px">Bevétel és kiadás − Szerződés és számlázás = <b>${d>0?'+':''}${sFt(d)}</b>. Tételenként:</p>
    <div class="sheet-wrap"><table class="sheet"><thead><tr><th>Tétel</th><th class="r">Számlázás</th><th class="r">Bevételek</th><th class="r">Eltérés</th></tr></thead><tbody>${L.map(x=>`<tr><td>${x.pid?`<button class="linkbtn" type="button" data-action="open-project" data-id="${esc(x.pid)}">${esc(x.name)}</button>`:esc(x.name)}<br><small class="muted">${esc(x.why)}</small></td><td class="r">${moneyFmt(x.bill)||'–'}</td><td class="r">${moneyFmt(x.bev)||'–'}</td><td class="r"><b>${x.bev>x.bill?'+':''}${sFt(x.bev-x.bill)}</b></td></tr>`).join('')||'<tr><td colspan="4" class="empty-row">Nincs eltérés.</td></tr>'}</tbody></table></div>`,{cancelLabel:'Bezárás'});const mb=document.querySelector('#modalRoot .mbox');if(mb)mb.classList.add('mbox-wide');};
/* Régi bevételi sorok ↔ projektek: egyszeri, kézi jóváhagyás minden olyan hónapra, amelyben már van projekt */
function pairRows(){const pm=new Set(S.projects.filter(p=>pr(p)).map(p=>pr(p).start.slice(0,7)));return ((S.fin&&S.fin.income)||[]).filter(r=>r.legacy&&pm.has(r.month)).sort((a,b)=>a.month.localeCompare(b.month)||(parseInt(a.day,10)||0)-(parseInt(b.day,10)||0));}
function pairTodo(){return pairRows().filter(r=>!pairSet(r));}
ACT['fin-pair']=()=>{const L=pairRows();if(!L.length){toast('Nincs ellenőrizendő régi sor.');return;}let lastM='';
  const opts=r=>{const cur=incProj(r),c=S.projects.filter(p=>p.status!=='lemondva'&&pr(p)&&pr(p).start.slice(0,7)===r.month).sort((a,b)=>pr(a).start.localeCompare(pr(b).start));
    return `<option value="__none"${pairSet(r)&&!cur?' selected':''}>— nincs hozzá projekt —</option>${c.map(p=>`<option value="${esc(p.id)}"${cur&&cur.id===p.id?' selected':''}>${esc(fmtShort(pr(p).start))} · ${esc(p.name||'')} · ${moneyFmt(projTotal(p))||0} Ft</option>`).join('')}`;};
  const body=L.map(r=>{const h=r.month!==lastM?`<tr class="pt-month"><td colspan="3"><b>${esc(F_YM.format(toDate(r.month+'-01')))}</b></td></tr>`:'';lastM=r.month;const ok=pairSet(r);
    return h+`<tr class="${ok?'pair-ok':'pair-q'}"><td class="n">${esc(r.day||'')}</td><td><b>${esc(r.name)}</b><br><small class="muted">${moneyFmt(r.amount)||0} Ft · ${ok?'✓ jóváhagyva':'❓ erősítsd meg'}</small></td><td><select class="inp" data-pair="${esc(r.id)}">${opts(r)}</select></td></tr>`;}).join('');
  openModal('🔗 Régi bevételi sorok párosítása',`<p class="hint" style="margin:0 0 10px">Minden régi sornál válaszd ki, melyik projekthez tartozik (az app által javasolt van előre kiválasztva), vagy hogy nincs hozzá projekt. Mentés után a párosítás végleges: a projekthez kötött sor a projekt nevével és árával jelenik meg, a „nincs projekt” sor pedig a saját összegével marad. Ha egy munka projektje más hónapban van, a projekt dátumát javítsd.</p>
    <div class="sheet-wrap"><table class="sheet pair-tbl"><thead><tr><th class="n">Nap</th><th>Régi sor</th><th>Projekt</th></tr></thead><tbody>${body}</tbody></table></div>`,{submitLabel:'Mentés – mindet jóváhagyom',submit:async()=>{
      const rows=[];document.querySelectorAll('[data-pair]').forEach(s=>{const r=L.find(x=>x.id===s.dataset.pair);if(!r)return;const base=String(r.note||'').replace(PAIR_RE,'').replace(NOPAIR_RE,'').trim(),mk=s.value==='__none'?'[nincs projekt]':'[projekt:'+s.value+']',note=(base?base+' ':'')+mk;if(note!==r.note)rows.push(Object.assign({},r,{note}));});
      if(!rows.length){closeModal();return;}
      try{for(let i=0;i<rows.length;i+=20){const d=await call('finUpsert',{table:'income',rows:rows.slice(i,i+20)});finApply(d);}closeModal();toast(rows.length+' sor párosítása mentve');render(true);}catch(e){handleErr(e);}}});
  const mb=document.querySelector('#modalRoot .mbox');if(mb)mb.classList.add('mbox-wide');};
/* Kintlévőség: minden hónap fizetésre váró / foglalós tétele */
function finReceivables(){const months=finMonths();let n=0,sum=0;months.forEach(m=>finIncomeFor(m).forEach(r=>{if(r.payStatus==='var'||r.payStatus==='eloleg'){n++;sum+=r.amount;}}));return {n,sum};}

/* Beérkező banki jóváírások (számlázz.hu Online pénzügyi adatkapcsolat): amit a számlázz.hu nem párosított számlához – javaslattal, egy kattintással megerősíthető */
const LOAN_RE=/tagi\s*k[öo]lcs[öo]n/i;
function bankBox(){const L=(isAdmin()&&S.fin&&S.fin.bankTx)||[],OFF=(isAdmin()&&S.fin&&S.fin.bankTxOff)||[];if(!L.length&&!OFF.length)return '';const inv=id=>((S.fin.invoices)||[]).find(x=>x.id===id);
  const rows=L.slice().sort((a,b)=>String(b.valueDate).localeCompare(String(a.valueDate))).map(t=>{const pay=/^pay:/.test(t.matchInvoice||'')?(S.payStatus||[]).find(p=>p.id===t.matchInvoice.slice(4)):null,x=!pay&&t.matchInvoice&&inv(t.matchInvoice),rest=x?Math.round((Number(x.invGross)||0)-(Number(x.invPaid)||0)):0;
    const sug=pay?(pay.paidAt?`<span class="muted">→ ${esc(pay.crewName||'')} ${esc(pay.month)} díja már kifizetve</span>`:`<span class="bk-sug">→ <b>${esc(pay.crewName||'')}</b> · ${esc(pay.month)} havi díja${pay.invoiceNo?' · '+esc(pay.invoiceNo):''}</span><button class="btn primary small" type="button" data-action="bank-ok" data-id="${esc(t.id)}" data-inv="${esc(t.matchInvoice)}">✓ Kifizetve</button>`):x&&rest>0?`<span class="bk-sug">→ <b>${esc(x.no||'')}</b> · ${esc(x.buyer||'')} · ${sFt(rest)}${Math.abs(rest-Math.round(Number(t.amount)||0))>1?' <span class="muted">(részösszeg)</span>':''}</span><button class="btn primary small" type="button" data-action="bank-ok" data-id="${esc(t.id)}" data-inv="${esc(x.id)}">✓ Kifizetve</button>`:x?`<span class="muted">→ ${esc(x.no||'')} már kifizetve</span>`:t.matchSz&&t.matchSz.length?`<span class="bk-sug">→ ${t.matchSz.map(z=>`<b>${esc(z.no)}</b> ${sFt(z.rest)}`).join(' + ')} <span class="muted">(számlázz.hu)</span>${Math.abs(t.matchSz.reduce((a,z)=>a+z.rest,0)-Math.round(Number(t.amount)||0))>1?' <span class="muted">(eltérő összeg)</span>':''}</span><button class="btn primary small" type="button" data-action="bank-sz" data-id="${esc(t.id)}">✓ Kifizetve</button>`:LOAN_RE.test(t.note||'')?`<span class="bk-sug">→ <b>Tagi kölcsön</b>${t.dir==='KI'?' (visszafizetés)':''}</span><button class="btn primary small" type="button" data-action="bank-loan" data-id="${esc(t.id)}">✓ Rögzítés</button>`:'<span class="muted">Nincs hozzá illő nyitott számla</span>';
    return `<div class="bk-row"><span class="bk-d">${esc(fmtDay(t.valueDate))}</span><span class="bk-p" data-action="bank-info" data-id="${esc(t.id)}" role="button" tabindex="0" title="Az utalás részletei"><b>${esc(t.partnerName||'Ismeretlen partner')}</b>${t.note?`<small>${esc(t.note)}</small>`:''}</span><span class="bk-a${t.dir==='KI'?' ki':''}">${t.dir==='KI'?'−':''}${sFt(Math.round(Number(t.amount)||0))}</span><span class="bk-m">${sug}<button class="btn ghost small" type="button" data-action="bank-no" data-id="${esc(t.id)}" title="Nem számlához tartozik / már kezelve">Elvetés</button></span></div>`;}).slice(0,S._bankAll?999:6).join('')+(L.length>6&&!S._bankAll?`<button class="btn ghost small bk-more" type="button" data-action="bank-all">Mind a ${L.length} tétel ▾</button>`:'')+(OFF.length?(S._bankOff?`<h4 class="sub-h" style="margin:14px 0 4px">Elvetett tételek (utóbbi 90 nap)</h4>`+OFF.slice().sort((a,b)=>String(b.valueDate).localeCompare(String(a.valueDate))).map(t=>`<div class="bk-row bk-off"><span class="bk-d">${esc(fmtDay(t.valueDate))}</span><span class="bk-p" data-action="bank-info" data-id="${esc(t.id)}" role="button" tabindex="0" title="Az utalás részletei"><b>${esc(t.partnerName||'Ismeretlen partner')}</b>${t.note?`<small>${esc(t.note)}</small>`:''}</span><span class="bk-a${t.dir==='KI'?' ki':''}">${t.dir==='KI'?'−':''}${sFt(Math.round(Number(t.amount)||0))}</span><span class="bk-m"><button class="btn outline small" type="button" data-action="bank-loan" data-id="${esc(t.id)}">→ Tagi kölcsön</button><button class="btn ghost small" type="button" data-action="bank-back" data-id="${esc(t.id)}">Visszaállítás</button></span></div>`).join(''):`<button class="btn ghost small bk-more" type="button" data-action="bank-off">Elvetett tételek (${OFF.length}) ▾</button>`):'');
  return `<div class="panel bank-box"><h3>🏦 Banki tételek – párosításra várnak <span class="aside">${L.length} db</span></h3><p class="hint" style="margin:0 0 6px">Beérkezett utalások, amelyeket a számlázz.hu nem tudott számlához kötni (pl. hiányos közlemény), és kimenő utalások, amelyek egy szakember havi díjának tűnnek. Megerősítéskor a számla / a díj kifizetett lesz (a számlázz.hu-ban is).</p>${rows}</div>`;}
/* Bejövő szállítói számlák a számlázz.hu-ból (a szakemberek számlái maguktól a Kifizetésekhez kerülnek) – kiadásként rögzíthetők */
function inDocsBox(){const D=(isAdmin()&&S.fin&&S.fin.szDocs)||{},L=D.open||[];if(!L.length)return '';
  const rows=L.slice().sort((a,b)=>String(b.kelt).localeCompare(String(a.kelt))).map(d=>`<div class="bk-row"><span class="bk-d">${esc(fmtDay(d.kelt))}</span><span class="bk-p"><b>${esc(d.partnerName||'')}</b>${d.type==='D'?' <span class="pill-mini" data-tip="Díjbekérő: kiadásként most rögzíthető; a később érkező végszámla magától ehhez kapcsolódik, nem lesz kétszer">díjbekérő</span>':''}${d.paidTx?` <span class="pill-mini ok" data-tip="A banki utalás alapján">✓ kifizetve ${esc(fmtDay(d.paidTx))}</span>`:''}<small>${esc([d.no,d.items].filter(Boolean).join(' · '))}</small></span><span class="bk-a">${sFt(Math.round(Number(d.net)||0))}<small class="muted" style="display:block;font-weight:500;font-size:11.5px">nettó · bruttó ${sFt(Math.round(Number(d.gross)||0))}</small></span><span class="bk-m">${d.pdfUrl?`<a class="btn ghost small" href="${esc(d.pdfUrl)}" target="_blank" rel="noopener">📄 PDF</a>`:''}<button class="btn primary small" type="button" data-action="indoc-exp" data-id="${esc(d.id)}" data-fund="rezsi">＋ Rezsi</button><button class="btn outline small" type="button" data-action="indoc-exp" data-id="${esc(d.id)}" data-fund="marketing">＋ Marketing</button><button class="btn ghost small" type="button" data-action="indoc-no" data-id="${esc(d.id)}">Elvetés</button></span></div>`).join('');
  return `<div class="panel bank-box in-box"><h3>📥 Beérkezett szállítói számlák <span class="aside">${L.length} db</span></h3><p class="hint" style="margin:0 0 6px">A számlázz.hu-ba érkezett bejövő számlák. Kiadásként a teljesítés hónapjába kerülnek (nettó összeggel, a PDF linkjével); a szakemberek számlái maguktól a Kifizetésekhez párosulnak.</p>${rows}</div>`;}
/* Kifizetett, de még számla nélküli kimenő utalások (pl. díjbekérő alapján fizetett szállító): azonnal rögzíthetők kiadásként; a végszámla később ugyanehhez kapcsolódik */
/* a „＋ Rezsi / ＋ Marketing” gomb: hibánál nem némán áll meg, hanem kiírja az okát */
function bankPayExp(b){ACT['bankpay-exp0'](b);}
function payNoDocBox(){const L=(isAdmin()&&S.fin&&S.fin.bankPay)||[];if(!L.length)return '';
  const rows=L.map(t=>`<div class="bk-row"><span class="bk-d">${esc(fmtDay(t.valueDate))}</span><span class="bk-p" data-action="bank-info" data-id="${esc(t.id)}" role="button" tabindex="0" title="Az utalás részletei"><b>${esc(t.partnerName||'Ismeretlen partner')}</b>${t.note?`<small>${esc(t.note)}</small>`:''}</span><span class="bk-a ki">−${sFt(Math.round(Math.abs(Number(t.amount)||0)))}<small class="muted" style="display:block;font-weight:500;font-size:11.5px">bruttó</small></span><span class="bk-m"><button class="btn primary small" type="button" data-action="bankpay-exp" data-id="${esc(t.id)}" data-fund="rezsi">＋ Rezsi</button><button class="btn outline small" type="button" data-action="bankpay-exp" data-id="${esc(t.id)}" data-fund="marketing">＋ Marketing</button><button class="btn ghost small" type="button" data-action="bank-no" data-id="${esc(t.id)}" title="Nem kiadás (pl. saját átvezetés, már máshol rögzítve)">Elvetés</button></span></div>`).slice(0,S._payAll?999:6).join('')+(L.length>6&&!S._payAll?`<button class="btn ghost small bk-more" type="button" data-action="bankpay-all">Mind a ${L.length} tétel ▾</button>`:'');
  return `<div class="panel bank-box in-box"><h3>💸 Kifizetve, de még nincs hozzá számla <span class="aside">${L.length} db</span></h3><p class="hint" style="margin:0 0 6px">Kimenő utalások, amelyekhez nem érkezett bejövő számla – pl. díjbekérő alapján fizettél. Kiadásként az utalás hónapjába kerülnek; amikor a végszámla megérkezik, ugyanahhoz a kiadáshoz kapcsolódik, nem lesz kétszer.</p>${rows}</div>`;}
function bankMonthLine(m){const B=(isAdmin()&&S.fin&&S.fin.szDocs&&S.fin.szDocs.bankMonths)||{},o=B[m];if(!o)return '';return `<p class="hint bank-line">🏦 Bankszámla-forgalom ebben a hónapban: <b class="ok-txt">be ${sFt(o.be)}</b> · <b class="bad-txt">ki ${sFt(o.ki)}</b> · egyenleg-változás ${sFt(o.be-o.ki)}</p>`;}
function viewFinance(){
  if(!finOn())return `<div class="panel">${empty('A Bevétel és kiadás a háttérkód frissítése után érhető el.')}</div>`;
  if(!S.fin)return finLoadingView();
  const months=finMonths(),m=/^\d{4}-\d{2}$/.test(S.finMonth||'')?S.finMonth:todayISO().slice(0,7),st=finSet();S.finMonth=m;
  if(!S._expDedupe&&(finExpDupes().del.length))setTimeout(finExpDedupe,0);   // ismétlődőre állított tételek duplikátumai
  const inc=finIncomeFor(m),exp=finExpensesFor(m),bal=finBalances(m),rec=finReceivables();
  const fromApp=!st.appFromMonth||m>=st.appFromMonth;
  const T=k=>sumK(inc,k),planned=T('amount'),recv=inc.reduce((s,r)=>s+finReceived(r),0);
  // fizetési állapot: a Szerződés és számlázás bizonylataiból (csak megjelenítés – a kifizetést ott követjük)
  const payCell=r=>{const st=finPayOf(r),lp=r.kind==='project'?null:incProj(r),pid=r.kind==='project'?r.id:lp&&lp.id,sent=pid?((S.fin&&S.fin.invoices)||[]).some(x=>invPids(x).includes(pid)):invFor('income',r.id).length>0;   // kiküldött számla után piros
    const finSent=pid?((S.fin&&S.fin.invoices)||[]).some(x=>invPids(x).includes(pid)&&(x.kind==='szamla'||x.kind==='vegszamla'||!x.kind)):invFor('income',r.id).some(x=>x.kind==='szamla'||x.kind==='vegszamla'||!x.kind);   // végszámla kiállítva?
    if(st==='eloleg'&&finSent)return `<span class="statuspill pay-pill p-bad" data-tip="A foglaló be van fizetve, a végszámla még nincs kifizetve">Fizetésre vár</span>`;   // foglaló után a végszámlára vár
    const pp=pid&&projById(pid),off=st==='beszamitva'&&pp&&pp.payOffset?projById(pp.payOffset):null,pick=pid&&!sent&&isAdmin();   // számla nélküli projekt: kattintva kézzel állítható (pl. beszámítás)
    return `<span class="statuspill pay-pill ${st==='var'?(sent?'p-bad':'p-mute'):PAY_CLS[st]||''}${pick?' pay-pick':''}"${pick?` role="button" tabindex="0" data-action="fin-pay-pick" data-id="${esc(pid)}"`:''}${st==='beszamitva'?` data-tip="${esc('↪ Beszámítva'+(off?': '+(off.name||'projekt')+' számlájába':''))}"`:pick?' data-tip="Kattints a fizetési állapot beállításához (pl. beszámítás)"':''}>${esc(PAY_LABEL[st]||'—')}${st==='beszamitva'?' ↪':''}</span>`;};
  const fq=String(S.finQ||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''),incCl=r=>{const pp=r.kind==='project'?projById(r.id):incProj(r);return [r.name,pp&&pp.client,pp&&pp.name].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');};
  const incF=fq?inc.filter(r=>fq.split(/\s+/).every(w=>incCl(r).includes(w))):inc,TF=k=>sumK(incF,k),TFn=fn=>incF.reduce((sum,r)=>sum+fn(r),0);   // cég szerinti szűrés a Bevételek táblában
  const showTov=inc.some(r=>num(r.tov)),showOrg=inc.some(r=>num(finOrgCost(r))),showRef=inc.some(r=>num(r.ref));   // a továbbszámlázott és a szervezői jutalék oszlop csak akkor, ha a hónapban van ilyen tétel
  const incRows=incF.map(r=>`<tr${r.kind==='project'?'':' class="fin-manual"'}><td class="n">${esc(r.day||'')}</td>
    <td>${r.kind==='project'?`<button class="linkbtn" type="button" data-action="open-project" data-id="${esc(r.id)}">${esc(r.name)}</button>${num(r.amount)?'':` <button class="statuspill p-info fin-tomkt" type="button" data-action="fin-mkt-proj" data-id="${esc(r.id)}" data-on="1" data-tip="Saját marketing projekt: kikerül a bevételek közül, a termelési költsége a Marketing költség táblába kerül">📣 Marketing projekt</button>`}`:(()=>{const lp=incProj(r),np=null;return `${lp?`<button class="linkbtn" type="button" data-action="open-project" data-id="${esc(lp.id)}" title="Projekt megnyitása">${esc(r.name)}</button>`:np?`<button class="linkbtn" type="button" data-action="open-project" data-id="${esc(np.id)}" title="Projekt megnyitása">${esc(r.name)}</button> <span class="statuspill p-warn" data-tip="${esc('A projekt ('+np.name+') '+fmtShort(pr(np).start)+' – más hónapban van. Ha a bevétel oda tartozik, töröld ezt a régi sort (✏️), különben két hónapban is beszámít.')}">⚠ projekt: ${esc(fmtShort(pr(np).start))}</span>`:`<button class="linkbtn" type="button" data-action="fin-income-edit" data-id="${esc(r.id)}" title="${esc(r.people||'')}">${esc(r.name)}</button>`}${r.legacy&&!lp&&!np&&!ro()?` <button class="linkbtn fin-mkproj" type="button" data-action="inc-to-proj" data-id="${esc(r.id)}" title="Projekt létrehozása ebből a sorból">➕ Projekt</button>`:''} <button class="editbtn" type="button" data-action="inc-rename" data-kind="income" data-id="${esc(r.id)}" aria-label="Átnevezés" title="Átnevezés">✏️</button>`;})()}</td>
    <td>${payCell(r)}</td><td class="r"${r.tov||r.org?` data-tip="ebből ${[r.tovOnly?'továbbszámlázott: '+ftFmt(r.tovOnly):'',r.sajat?'saját költség: '+ftFmt(r.sajat):'',r.org?'szervezői jutalék: '+ftFmt(r.org)+' (a Szervezői jutalék oszlopban)':''].filter(Boolean).join(' · ')} – a százalékok nélküle számolódnak"`:''}>${r.tov||r.org?'<small class="muted">🔁</small> ':''}<b>${moneyFmt(r.amount)||0}</b></td>${showTov?`<td class="r" data-tip="Az ügyfélnek továbbszámlázott költségek">${moneyFmt(r.tov)||0}</td>`:''}${showOrg?`<td class="r" data-tip="Külön szervezői jutalék – az értékesítői díjtól elkülönítve">${moneyFmt(finOrgCost(r))||0}</td>`:''}${showRef?`<td class="r" data-tip="Szakembernek járó ajánlói jutalék (a projekt Egyéb költségei közül)">${moneyFmt(r.ref)||0}</td>`:''}<td class="r">${moneyFmt(r.profit)||0}</td><td class="pc">${r.kind==='project'?pctOf(finWages(r),r.base!=null?r.base:r.amount):`<input class="pct-in" type="text" inputmode="decimal" value="${num(r.amount)?String(Math.round(finWages(r)/num(r.amount)*1000)/10).replace('.',','):'0'}" data-finwagepct="1" data-id="${esc(r.id)}" aria-label="Munkadíjak %" title="Munkadíj a díjazás százalékában – az összeg és az eszköz-rezsi igazodik">`}</td><td class="r">${r.kind==='project'?(moneyFmt(finWages(r))||0):`<input class="pct-in fin-wage-in" type="text" inputmode="numeric" value="${esc(moneyFmt(finWages(r))||'0')}" data-finwage="1" data-id="${esc(r.id)}" aria-label="Munkadíjak (Ft)" title="Projekt nélküli tétel: a munkadíj itt írható; az eszköz-rezsi igazodik hozzá">`}</td><td class="pc">${pctIn(r,'ceo')}</td><td class="r"${(()=>{const who=r.ceoBy||(r.kind==='project'&&(d=>d&&d.ownerName)(typeof projDeal==='function'?projDeal(r.p||projById(r.id)||{}):null));return who?` data-tip="${esc('💼 Értékesítette: '+who)}"`:'';})()}>${moneyFmt(finSalesCost(r))||0}</td><td class="pc">${pctOf(r.rezsi,r.base!=null?r.base:r.amount)}</td><td class="r${r.rezsi<0?' bad-txt':''}">${r.rezsi<0?'−':''}${moneyFmt(Math.abs(r.rezsi))||0}</td><td class="r${r.marketing<0?' bad-txt':''}">${r.marketing<0?'−':''}${moneyFmt(Math.abs(r.marketing))||0}</td></tr>`).join('');
  const expRows=list=>list.map(e=>e.kind==='proj'?`<tr class="fin-mktproj"><td><button class="linkbtn" type="button" data-action="open-project" data-id="${esc(e.pid)}">🎬 ${esc(e.name)}</button> <button class="editbtn" type="button" data-action="fin-mkt-proj" data-id="${esc(e.pid)}" data-on="" data-tip="Vissza a bevételek közé">↩︎</button></td><td><span class="statuspill p-info" data-tip="Saját marketing projekt: a termelési költsége (szakemberek díja) a marketing alapból megy">projekt</span></td><td class="r"><b>${moneyFmt(e.amount)||0}</b></td></tr>`:`<tr><td><button class="linkbtn" type="button" data-action="fin-exp-edit" data-id="${esc(e.id)}">${esc(e.name)}</button></td><td>${e.kind==='fix'?`<span class="statuspill">havi fix</span>`:'<span class="statuspill p-mute">egyszeri</span>'}</td><td class="r"><b>${moneyFmt(e.amount)||0}</b></td></tr>`).join('');
  const expPanel=(fund,icon,title)=>{const l=exp.filter(e=>fund==='marketing'?e.fund==='marketing':e.fund!=='marketing');return `<div class="panel"><h3>${icon} ${title} <span class="aside">${ftFmt(sumK(l,'amount'))}</span></h3>
        <div class="sheet-wrap"><table class="sheet fin-tbl fin-exp"><thead><tr><th>Tétel</th><th>Típus</th><th class="r">Összeg</th></tr></thead><tbody>${expRows(l)||'<tr><td colspan="3" class="empty-row">Nincs kiadás ebben a hónapban.</td></tr>'}</tbody>
          <tfoot><tr class="fin-sum-tr"><td colspan="2"><b>Összesen</b></td><td class="r"><b>${moneyFmt(sumK(l,'amount'))||0} Ft</b></td></tr>
          ${(()=>{const mk=fund==='marketing',keret=mk?bal.carryMkt+bal.inMkt:bal.carryRezsi+bal.inRezsi,end=keret-sumK(l,'amount');
            const inM=mk?bal.inMkt:bal.inRezsi,car=mk?bal.carryMkt:bal.carryRezsi;
            return `<tr class="fin-keret"><td colspan="2"><b>Havi ${mk?'marketing':'eszköz, rezsi'} keret</b> <span class="muted">(e havi bevételekből)</span></td><td class="r"><b>${sFt(inM)}</b></td></tr>
            ${(()=>{const left=inM-sumK(l,'amount');return `<tr class="fin-keret"><td colspan="2">Ebből maradt az e havi tételek után</td><td class="r${left<0?' bad-txt':''}">${sFt(left)}</td></tr>`;})()}
            <tr class="fin-keret"><td colspan="2">Áthozat az előző hónapokból</td><td class="r${car<0?' bad-txt':''}">${sFt(car)}</td></tr>
            <tr class="fin-end ${end<0?'neg':'pos'}"><td colspan="2"><b>${end<0?'🔻 Mínuszban vagyunk':'✅ Maradék a keretből'}</b></td><td class="r"><b>${end<0?'−'+ftFmt(-end):ftFmt(end)}</b></td></tr>`;})()}</tfoot></table></div>
        <div class="btns" style="margin-top:10px"><button class="btn outline small" type="button" data-action="fin-exp-new" data-fund="${fund}">+ Kiadás</button></div></div>`;};
  const loans=((S.fin.loan)||[]).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))),lIn=sumK(loans.filter(l=>l.kind!=='vissza'),'amount'),lOut=sumK(loans.filter(l=>l.kind==='vissza'),'amount');
  return `<div class="page-head bill-head fin-head"><div class="grow"><h2>Bevétel és kiadás</h2>${monthNav('fin-month',months,m)}</div>${undoBar()}
      ${szOn()?`<button class="btn outline small" type="button" data-action="sz-sync" title="${esc(S.fin.sz.lastSync?'Utoljára: '+S.fin.sz.lastSync:'')}"${S._szSyncing?' disabled':''}>${S._szSyncing?'Frissítés…':'🔄 Kifizetések'}</button>`:''}
</div>${bankBox()}${inDocsBox()}${payNoDocBox()}${bankMonthLine(m)}
    <div class="tiles fin-tiles tiles-2">
      <div class="tile fin-flow"><div class="flow-row plan"><span>Tervezett bevétel</span><b>${ftFmt(T('amount'))}</b></div>${(()=>{if(!fromApp)return '';const d=finDiffRows(m).reduce((s,x)=>s+x.bev-x.bill,0);return d?`<button type="button" class="linkbtn fin-diff" data-action="fin-diff" data-m="${m}">⚠ ${d>0?'+':''}${sFt(d)} eltérés a számlázástól – mitől?</button>`:'';})()}
        <div class="flow-row ok"><span>Beérkezett fizetés</span><b>${ftFmt(recv)}</b></div>
        <div class="flow-row${planned-recv>0?' warn':''}"${planned-recv>0?` data-tip="${esc('Kintlévő tételek:\n'+inc.map(r=>({r,d:Math.round(num(r.amount)-finReceived(r))})).filter(x=>x.d>0).map(x=>'• '+String(x.r.name||x.r.title||'Tétel')+': '+ftFmt(x.d)).join('\n'))}"`:''}><span>Kintlévőség</span><b>${ftFmt(Math.max(0,planned-recv))}</b></div></div>
      <div class="tile fin-flow fin-split"><div class="flow-row plan"><span>Nyereség (${st.profitPct}%)</span><b>${ftFmt(T('profit'))}</b></div>
        <div class="flow-row"><span>Munkadíjak</span><b>${ftFmt(inc.reduce((sum,r)=>sum+finWages(r),0))}</b></div>
         <div class="flow-row"><span>Továbbszámlázott költségek</span><b>${ftFmt(T('tovOnly'))}</b></div>${T('sajat')?`<div class="flow-row"><span>Saját költségek <span class="muted">(tankolás…)</span></span><b>${ftFmt(T('sajat'))}</b></div>`:''}
         <div class="flow-row"><span>Szervezői jutalék</span><b>${ftFmt(T('org'))}</b></div>
        <div class="flow-row${T('rezsi')<0?' warn':''}"><span>Eszközök, rezsi</span><b>${T('rezsi')<0?'−':''}${ftFmt(Math.abs(T('rezsi')))}</b></div></div>
    </div>
    <div class="panel"><div class="fin-inc-head"><h3>💰 Bevételek ${fromApp?'<span class="aside">a projektekből</span>':''}${(()=>{const n=pairTodo().length;return n?` <button class="btn outline small fin-pair-btn" type="button" data-action="fin-pair">🔗 Párosítás ellenőrzése <span class="c">${n}</span></button>`:` <button class="linkbtn fin-pair-ok" type="button" data-action="fin-pair">🔗 Párosítások</button>`;})()}</h3><div class="toolbar fin-q"><input class="inp search" id="q-fin" type="search" placeholder="Szűrés cégre vagy projektre…" value="${esc(S.finQ||'')}" aria-label="Bevételek szűrése cég szerint">${fq?`<span class="muted">${incF.length} / ${inc.length} tétel</span>`:''}</div></div>
      <div class="sheet-wrap"><table class="sheet fin-tbl fin-inc"><thead><tr><th class="n">Nap</th><th>Megnevezés</th><th>Fizetés</th><th class="r">Díjazás</th>${showTov?'<th class="r">Továbbszámlázott</th>':''}${showOrg?'<th class="r">Szervezői jutalék</th>':''}${showRef?'<th class="r">Ajánlói jutalék</th>':''}<th class="r">Nyereség ${st.profitPct}%</th><th class="r" colspan="2">Munkadíjak</th><th class="r" colspan="2">Értékesítés</th><th class="r" colspan="2">Eszköz, rezsi</th><th class="r">Marketing ${st.marketingPct}%</th></tr></thead>
      <tbody>${incRows||`<tr><td colspan="${12+(showTov?1:0)+(showOrg?1:0)+(showRef?1:0)}" class="empty-row">${fq?'Nincs ilyen cég tétele ebben a hónapban.':'Ebben a hónapban még nincs bevétel.'}${fromApp?' A projektek a projekt értékének megadása után jelennek meg itt.':''}</td></tr>`}</tbody>
      <tfoot><tr><td></td><td><b>Összesen</b></td><td></td><td class="r"><b>${moneyFmt(TF('amount'))||0}</b></td>${showTov?`<td class="r"><b>${moneyFmt(TF('tov'))||0}</b></td>`:''}${showOrg?`<td class="r"><b>${moneyFmt(TFn(finOrgCost))||0}</b></td>`:''}${showRef?`<td class="r"><b>${moneyFmt(TF('ref'))||0}</b></td>`:''}<td class="r"><b>${moneyFmt(TF('profit'))||0}</b></td><td class="pc">${pctOf(TFn(finWages),TF('amount'))}</td><td class="r"><b>${moneyFmt(TFn(finWages))||0}</b></td><td class="pc">${pctOf(TFn(finSalesCost),TF('amount'))}</td><td class="r"><b>${moneyFmt(TFn(finSalesCost))||0}</b></td><td class="pc">${pctOf(TF('rezsi'),TF('amount'))}</td><td class="r${TF('rezsi')<0?' bad-txt':''}"><b>${TF('rezsi')<0?'−':''}${moneyFmt(Math.abs(TF('rezsi')))||0}</b></td><td class="r"><b>${moneyFmt(TF('marketing'))||0}</b></td></tr></tfoot></table></div>
      <div class="btns" style="margin-top:10px"><button class="btn outline small" type="button" data-action="fin-proj-new">+ Új projekt</button><button class="btn outline small" type="button" data-action="fin-income-new">+ Egyéb bevétel</button></div>
      ${fromApp?`<p class="hint">A projektek a kezdőnapjuk hónapjához számítanak. A munkadíjak, a továbbszámlázott költségek és a szervezői jutalék külön látszanak. Értékesítő kijelöléséig az értékesítési díj 0 Ft; a maradék az eszköz-rezsi alapba kerül.</p>`:''}</div>
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
      <div class="sheet-wrap"><table class="sheet fin-tbl"><thead><tr><th>Dátum</th><th>Típus</th><th>Bank</th><th>Megjegyzés</th><th class="r">Összeg</th><th></th></tr></thead><tbody>${loans.map(l=>`<tr class="loan-row" data-action="loan-info" data-id="${esc(l.id)}" title="Részletek"><td>${esc(l.date)}</td><td>${l.kind==='vissza'?'<span class="statuspill p-ok">Cég visszafizeti</span>':'<span class="statuspill p-bad">Kölcsön a cégnek</span>'}</td><td>${esc(l.kind==='vissza'?loanBank(l)+(l.bank2?' → '+l.bank2:''):(l.bank2?l.bank2+' → ':'')+loanBank(l))}</td><td>${esc(l.note||'')}</td><td class="r">${moneyFmt(l.amount)}</td><td class="nowrap"><button class="editbtn" type="button" data-action="fin-loan-edit" data-id="${esc(l.id)}" aria-label="Módosítás" title="Módosítás">✏️</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty-row">Nincs tagi kölcsön.</td></tr>'}</tbody>
      <tfoot><tr><td colspan="4">Kölcsön összesen: <b>${ftFmt(lIn)}</b> · visszafizetve: <b>${ftFmt(lOut)}</b></td><td class="r"><b>${ftFmt(lIn-lOut)}</b></td><td></td></tr></tfoot></table></div>
      ${(S.fin.bankTxLoan||[]).length?`<div class="btns" style="margin-top:10px"><button class="btn ghost small" type="button" data-action="loan-bank">🏦 Banki utalások egyeztetése (${(S.fin.bankTxLoan||[]).length})</button></div>`:''}</div>`;
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
  closeModal();if(S._finInline){S._finInline=false;S._finRerender=true;setTimeout(()=>{if(!finEditing()&&S._finRerender){S._finRerender=false;render(true);}},400);}else render(true);   // cellában írt érték: nem rajzolunk újra azonnal, hogy a következő cellába gépelés ne vesszen el
  S._finPend=(S._finPend||0)+1;   // gyors egymás utáni mentések: csak az utolsó válasz kerül alkalmazásra, és gépelés közben nem rajzolunk újra (különben a beírt érték elveszne)
  call(name,arg).then(d=>{S._finPend--;if(S._finPend>0){if(okMsg)toast(okMsg);return;}finApplySafe(d);if(okMsg)toast(okMsg);}).catch(e=>{S._finPend--;handleErr(e);finLoad(true);});return true;}
function finEditing(){const a=document.activeElement;return !!(a&&a.closest&&a.closest('#view')&&/^(INPUT|TEXTAREA)$/.test(a.tagName)&&(a.dataset.finpct||a.dataset.finwage||a.dataset.finwagepct||a.classList.contains('pct-in')));}
function finApplySafe(d){if(!finEditing()){finApply(d);return;}const part={};FIN_KEYS.forEach(k=>{if(d&&d[k]!==undefined)part[k]=d[k];});
  // a szerver adata megjön, de a most szerkesztett mező helyi értéke marad; a teljes újrarajzolás a mezőből kilépéskor történik
  const keep={};['income'].forEach(k=>{keep[k]=(S.fin&&S.fin[k]||[]).slice();});S.fin=Object.assign({},S.fin||{},part);
  if(part.income)S.fin.income=part.income.map(r=>{const loc=keep.income.find(x=>x.id===r.id);return loc&&loc._dirty?loc:r;});finCacheSave(S.fin);S._finRerender=true;}
document.addEventListener('focusout',e=>{const t=e.target;if(!S._finRerender||!t||!t.dataset||!(t.dataset.finpct||t.dataset.finwage||t.dataset.finwagepct))return;setTimeout(()=>{if(!finEditing()&&S._finRerender){S._finRerender=false;render(true);}},30);});
const FIN_BUSY=new Set();   // ugyanaz a művelet egyszerre csak egyszer fut (többszöri kattintás ellen)
const INDOC_PEND=new Set();
/* bejövő számla rögzítése / elvetése: azonnal eltűnik a listából, a mentés a háttérben fut; hibánál visszakerül */
function indocQuick(id,arg,okMsg){const D=S.fin&&S.fin.szDocs;if(!D||!D.open)return finCall('szDocSet',Object.assign({id},arg),okMsg);
  const i=D.open.findIndex(x=>x.id===id);if(i<0)return;const it=D.open.splice(i,1)[0];INDOC_PEND.add(id);render(true);if(okMsg)toast(okMsg);
  const prune=()=>{const D2=S.fin&&S.fin.szDocs;if(D2&&D2.open)D2.open=D2.open.filter(x=>!INDOC_PEND.has(x.id));};   // a gyorsan egymás után kezeltek ne ugorjanak vissza egy korábbi válasszal
  call('szDocSet',Object.assign({id},arg)).then(d=>{INDOC_PEND.delete(id);finApply(d);prune();render(true);}).catch(e=>{INDOC_PEND.delete(id);const D2=S.fin&&S.fin.szDocs;if(D2&&D2.open&&!D2.open.some(x=>x.id===id))D2.open.splice(Math.min(i,D2.open.length),0,it);render(true);handleErr(e);});}
async function finCall(name,arg,okMsg){const k=name+'|'+JSON.stringify(arg||{});if(FIN_BUSY.has(k))return null;FIN_BUSY.add(k);try{const d=await call(name,arg);finApply(d);if(okMsg)toast(okMsg);return d;}catch(e){handleErr(e);return null;}finally{FIN_BUSY.delete(k);}}
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
  const src=e&&S.fin&&S.fin.szDocs&&S.fin.szDocs.byExp&&S.fin.szDocs.byExp[e.id],kv=R=>R.filter(r=>r[1]).map(([k,x])=>`<div class="kv"><span>${esc(k)}</span><b style="word-break:break-word">${esc(x)}</b></div>`).join('');
  const srcHtml=src?`<div class="exp-src"><h4 class="sub-h" style="margin:4px 0 4px">📥 Bejövő számla${src.pdfUrl?` · <a href="${esc(src.pdfUrl)}" target="_blank" rel="noopener">📄 PDF</a>`:''}</h4><div class="kv-list">${kv([['Szállító',src.partnerName],['Adószám',src.partnerTax],['Számlaszám',src.no],['Kiállítás',src.kelt],['Teljesítés',src.telj],['Fizetési határidő',src.fizh],['Fizetési mód',src.payMethod],['Nettó',sFt(Math.round(Number(src.net)||0))],['Bruttó',sFt(Math.round(Number(src.gross)||0))],['Tételek',src.items],['Rögzítette',[src.handledBy,src.handledAt].filter(Boolean).join(' · ')]])}</div>
    <h4 class="sub-h" style="margin:10px 0 4px">🏦 Banki tranzakció</h4>${src.tx?`<div class="kv-list">${kv([['Értéknap',src.tx.valueDate],['Összeg','−'+sFt(Math.round(Number(src.tx.amount)||0))],['Kedvezményezett',src.tx.partnerName],['Kedvezményezett számla',src.tx.partnerAccount],['Közlemény',src.tx.note],['Saját számla',src.tx.account]])}</div>`:'<p class="hint" style="margin:0">Nem találtam hozzá kimenő utalást (azonos bruttó összeg és szállító, a kiállítás után).</p>'}</div>`:'';
  openModal((e?'Kiadás szerkesztése':'Új kiadás')+' – '+(v.fund==='marketing'?'marketing':'eszközköltség, rezsi'),`${srcHtml}<div class="fields">
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
const BANK2=['Binx','OTP','Revolut','Egyéb'],bank2Opts=sel=>'<option value="">– nincs megadva –</option>'+BANK2.map(b=>`<option value="${b}"${b===sel?' selected':''}>${b}</option>`).join('');
const loanL=k=>k==='vissza'?['Melyik számláról fizeti vissza','Melyik számlára fizeti vissza']:['Melyik számlára érkezett','Melyik számláról érkezett'];
const bankOpts=k=>(LOAN_BANKS[k]||LOAN_BANKS.be).map(b=>`<option value="${b}">${b}</option>`).join('');
function finLoanModal(l){const v=l||{},k=v.kind==='vissza'?'vissza':'be',bk=l?loanBank(l):'';
  openModal(l?'Tagi kölcsön – módosítás':'Tagi kölcsön – új tétel',`<div class="fields">
    ${ms('kind','Típus',[['be','Kölcsön a cégnek'],['vissza','Cég visszafizeti']],k)}
    ${mf('date','Dátum',{type:'date',v:v.date||todayISO()})}
    ${moneyField('amount','Összeg',v.amount??null,{steps:false})}
    <div class="field"><label for="m-bank" id="m-bankL">${loanL(k)[0]}</label><select class="inp" id="m-bank" name="bank" data-cmb="Bank…">${bk?bankOpts(k).replace(`value="${bk}"`,`value="${bk}" selected`):bankOpts(k)}</select></div>
    <div class="field"><label for="m-bank2" id="m-bank2L">${loanL(k)[1]}</label><select class="inp" id="m-bank2" name="bank2">${bank2Opts(v.bank2||'')}</select></div>
    ${mf('note','Megjegyzés',{full:true,max:300,v:v.note||''})}</div>`,{submitLabel:'Mentés',submit:async fd=>{
    const row={id:v.id||'',kind:fd.get('kind'),date:fd.get('date'),amount:num(moneyVal(fd.get('amount'))),bank:String(fd.get('bank')||''),bank2:String(fd.get('bank2')||''),note:String(fd.get('note')||'').trim()};
    if(!row.amount){toast('Add meg az összeget.',true);return;}
    row.id=row.id||newId();finSave('finUpsert',{table:'loan',row},'Tétel mentve',()=>finLocal('loan',[row]));}});}
Object.assign(ACT,{
  'fin-nav':b=>{const d=Number(b.dataset.d),ms=finMonths();let m=S.finMonth||todayISO().slice(0,7);
    if(!d)m=todayISO().slice(0,7);else{const t=shiftMonth(m,d);if(ms.includes(t))m=t;}setMonthAll(m);render(true);},
  'fin-settings':()=>finSettingsModal(),
  'fin-retry':()=>{S.finErr='';finLoad(true);render(true);},
  'fin-import':()=>finImport(),
  'fin-income-new':()=>finIncomeModal(null),
  'fin-income-edit':b=>{const r=((S.fin&&S.fin.income)||[]).find(x=>x.id===b.dataset.id);if(r)finIncomeModal(r);},
  'fin-income-del':b=>{const id=b.dataset.id;confirmModal('Bevétel törlése','Biztosan törlöd ezt a bevételi sort?','Törlés',()=>finSave('finDelete',{table:'income',id},'Törölve',()=>finLocal('income',[{id}],true)));},
  'fin-exp-new':b=>finExpenseModal(b&&b.dataset.fund?{fund:b.dataset.fund}:null),
  'fin-exp-edit':b=>{const e=((S.fin&&S.fin.expense)||[]).find(x=>x.id===b.dataset.id);if(e)finExpenseModal(e);},
  'fin-exp-del':b=>{const e=((S.fin&&S.fin.expense)||[]).find(x=>x.id===b.dataset.id);if(!e)return;const m=S.finMonth;
    if(e.kind==='fix'&&e.from<m){confirmModal('Fix kiadás megszüntetése',`A(z) „${e.name}” ${F_YM.format(toDate(m+'-01'))}${/(szeptember|október|november|december)$/.test(F_YM.format(toDate(m+'-01')))?'től':'tól'} már nem jelenik meg; a korábbi hónapokban megmarad.`,'Megszüntetés',()=>{const row=Object.assign({},e,{to:shiftMonth(m,-1)});finSave('finUpsert',{table:'expense',row},'Megszüntetve',()=>finLocal('expense',[row]));});}
    else confirmModal('Kiadás törlése','Biztosan törlöd ezt a kiadást?','Törlés',()=>finSave('finDelete',{table:'expense',id:e.id},'Törölve',()=>finLocal('expense',[{id:e.id}],true)));},
  /* új tagi kölcsön tétel csak banki utalásból rögzíthető (Banki utalások egyeztetése → Rögzítés); kézi felvétel nincs */
  'fin-loan-edit':b=>{const l=((S.fin&&S.fin.loan)||[]).find(x=>x.id===b.dataset.id);if(l)finLoanModal(l);},
  /* tagi kölcsön tétel nem törölhető (csak módosítható) */
  'fin-loan-del':()=>{}
});
document.addEventListener('change',async e=>{const t=e.target;
  if(t.id==='fin-month'){setMonthAll(t.value);render(true);return;}
  if(t.id==='m-kind'&&$('m-bank')){const L=$('m-bankL'),L2=$('m-bank2L');if(L)L.textContent=loanL(t.value)[0];if(L2)L2.textContent=loanL(t.value)[1];const b=$('m-bank'),cur=b.value;b.innerHTML=bankOpts(t.value);if([...b.options].some(o=>o.value===cur))b.value=cur;return;}   // a bank-lista a típushoz igazodik
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
function szRepEmail(cl,p){return (cl&&(cl.repEmail||cl.contactEmail))||(p&&p.contactEmail)||'';}   // a számla a cég képviselőjéhez megy
function szFinEmail(cl){if(cl&&cl.billEmail)return cl.billEmail;const m=/Számlázási e-mail:\s*([^;\n]+)/i.exec((cl&&cl.note)||'');return m?(m[1].split(/[,\s]+/).find(x=>x.includes('@'))||''):'';}
function szSplitAddr(a){const m=/^\s*(\d{4})\s+([^,]+),\s*(.+)$/.exec(a||'');return m?{zip:m[1],city:m[2].trim(),address:m[3].trim()}:{zip:'',city:'',address:String(a||'').trim()};}
/* Projekt neve + dátuma a számlatételhez, pl. „PP Konferencia – október 14.” (több nap: „október 14–15.”) */
const SZ_MN=['január','február','március','április','május','június','július','augusztus','szeptember','október','november','december'];
function szItemName(p){const r=pr(p),n=(p&&p.name)||'Projekt';if(!r)return n;const m=Number(r.start.slice(5,7))-1,d1=Number(r.start.slice(8)),d2=Number(String(r.end||r.start).slice(8)),m2=Number(String(r.end||r.start).slice(5,7))-1;
  return n+' – '+SZ_MN[m]+' '+d1+(r.end&&r.end!==r.start?(m2!==m?'. – '+SZ_MN[m2]+' '+d2:'–'+d2):'')+'.';}
function szTargetInfo(kind,id){
  if(kind==='project'){const p=projById(id);if(!p)return null;const cl=(S.clients||[]).find(c=>c.name===p.client)||null,a=szSplitAddr(p.clientAddress||(cl&&cl.address));
    const r=pr(p);return {kind,id,name:p.name||'Projekt',item:szItemName(p),net:projTotal(p),base:num(p.projectValue),extras:extrasOf(p),fulfill:r?(r.end||r.start):todayISO(),   /* teljesítés = a rendezvény (utolsó) napja (Ervin, 2026-11-10) */buyer:Object.assign({name:p.client||'',tax:p.clientTax||(cl&&cl.tax)||'',email:szRepEmail(cl,p),email2:szFinEmail(cl),saved:cl&&cl.billEmail,clientId:cl&&cl.id},a)};}
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
  if(type==='dijbekero')return {name:'Foglaló – '+(t.item||t.name),price:Math.round(t.net*pct/100)};
  if(type==='eloleg')return {name:'Foglaló – '+(t.item||t.name),price:db?num(db.invNet):Math.round(t.net*pct/100)};
  const ex=(t.extras||[]).filter(x=>num(x.amount)>0),split=ex.length?[{name:t.item||t.name,qty:1,price:t.base,pid:kind==='project'?id:''},...ex.map(x=>exSign(x)<0?{name:'Kedvezmény: '+(x.name||'jutalék'),qty:1,price:-num(x.amount)}:{name:'Extra: '+(x.name||'szolgáltatás'),qty:1,price:num(x.amount)})]:null;
  if(type==='vegszamla')return {name:t.item||t.name,price:t.net,items:split};
  const done=inv.filter(x=>x.kind==='szamla'||x.kind==='vegszamla'||(x.kind==='eloleg'&&x.advType==='szamla')).reduce((s,x)=>s+num(x.invNet),0);   /* a díjbekérő alapján kiállított (sima) előleg-számla is már kiszámlázott rész */
  return {name:(t.item||t.name)+(done?' – fennmaradó rész':''),price:Math.max(0,t.net-done),items:done?null:split};}
const SZ_HINT={dijbekero:'A díjbekérő nem számla, nem kerül a NAV-hoz. Ha a számlázz.hu-ban be van kapcsolva az automatikus számlázás, a kifizetése után magától elkészül a foglalószámla.',
  eloleg:'Foglalószámla a már beérkezett foglalóról – fizetettként kerül kiállításra.',vegszamla:'A végszámla a teljes összegről szól; a számlázz.hu a projekthez tartozó foglalószámlát (rendelésszám alapján) levonja, a vevő csak a különbözetet fizeti.',
  szamla:'Egyetlen számla a teljes (vagy a még nem számlázott) összegről.'};
/* Közös számla: az ügyfél többi projektje, amelyek ugyanerre a számlára kerülhetnek */
function szSharedPick(id,sel,fixed){const p=projById(id);if(!p)return '';const n=s=>String(s||'').trim().toLowerCase();
  const pm=pr(p)?pr(p).start.slice(0,7):'';   // csak az adott (tárgy)hónap projektjei – a számla egy hónapról szól
  const cand=S.projects.filter(x=>x.id!==id&&x.status!=='lemondva'&&n(x.client)===n(p.client)&&pr(x)&&(sel.includes(x.id)||pr(x).start.slice(0,7)===pm)&&(sel.includes(x.id)||!invFor('project',x.id).some(v=>v.kind==='szamla'||v.kind==='vegszamla'))).sort(byStart).reverse().sort((a,b)=>(sel.includes(b.id)?1:0)-(sel.includes(a.id)?1:0)).slice(0,24);
  if(!cand.length)return '';
  return `<div class="field full"><span class="lbl">🔗 Közös számla – további projektek ugyanerre a számlára</span><div class="sz-share">${cand.map(x=>`<label><input type="checkbox" data-szshare="${esc(x.id)}"${sel.includes(x.id)?' checked':''}${fixed?' disabled':''}> ${esc(x.name||'Projekt')} <span class="muted">· ${esc(fmtMD(pr(x).start))} · ${ftFmt(num(x.projectValue))}</span></label>`).join('')}</div>
    <small class="hint" style="margin:4px 0 0">${fixed?'A TIG projektjei – a számla mindegyikhez hozzárendelődik.':'A bejelölt projekt tételként kerül a számlára; a kifizetés mindegyik projektnél megjelenik.'}</small></div>`;}
document.addEventListener('change',e=>{const c=e.target;if(!c.dataset||!c.dataset.szshare)return;const box=$('sz-items');if(!box)return;const pid=c.dataset.szshare,p=projById(pid);
  const ex=box.querySelector(`[data-pid="${CSS.escape(pid)}"]`);
  if(c.checked&&!ex&&p)box.insertAdjacentHTML('beforeend',szItemRow({name:szItemName(p),qty:1,price:projTotal(p),pid},box.children.length));
  if(!c.checked&&ex&&box.children.length>1)ex.remove();szTotals();});
function szInvoiceModal(kind,id,o={}){
  // A több projektre kiterjedő, már befizetett foglaló esetén előbb a közös bizonylat párosítását ajánljuk.
  if(kind==='project'&&o.type==='dijbekero'&&typeof billGroupAdvance==='function'){
    const p=projById(id),g=p&&billGroupAdvance(billClientMonthProjects(p)),x=g&&g.candidate;
    if(x&&!invPids(x).includes(id)){
      szLinkModal('project',id,'eloleg');
      const n=$('m-no');if(n){n.value=x.no;n.focus();}
      return;
    }
  }
  // A közös foglaló végelszámolása az összes érintett projektet és a közös előlegbizonylatot együtt kezeli.
  if(kind==='project'&&['vegszamla','szamla'].includes(o.type)){
    const p=projById(id),group=p&&typeof billGroupAdvance==='function'?billGroupAdvance(billClientMonthProjects(p)):null;
    const doc=group&&group.shared,ps=group&&group.projects||[];
    const exact=!!doc&&invPids(doc).length===ps.length&&ps.every(x=>invPids(doc).includes(x.id));
    if(exact&&doc.kind==='dijbekero'){
      toast('A közös végszámlához előbb a befizetett díjbekérő foglalószámláját szükséges kapcsolni.',true);return;
    }
    if(exact&&doc.kind==='eloleg'&&doc.manual&&doc.issuer!=='kft'){
      toast('A közös foglaló külső kiállítótól származik. A végszámla kiállításához egyeztesd a bizonylatot és a számlázó céget.',true);return;
    }
    const ready=exact&&doc.kind==='eloleg'&&Math.abs(num(group.paid)-num(doc.invNet))<=1&&ps.every(x=>!billInfo(x).fin);
    if(ready&&!o.tigId&&!o.items&&!(o.projectIds&&o.projectIds.length)){
      const ids=ps.map(x=>x.id).sort((a,b)=>String((pr(projById(a))||{}).start||'').localeCompare(String((pr(projById(b))||{}).start||'')));
      return szInvoiceModal('project',ids[0],Object.assign({},o,{
        projectIds:ids.slice(1),items:ids.map(pid=>({name:szItemName(projById(pid)),qty:1,price:projTotal(projById(pid)),pid}))
      }));
    }
    // A normál számlaként kiállított foglaló után már kizárólag a még számlázatlan részt készítjük elő.
    if(ready&&doc.advType==='szamla'&&o.items&&o.projectIds&&o.projectIds.length
      &&o.items.every(it=>it.pid&&ps.some(x=>x.id===it.pid)&&num(it.price)===projTotal(projById(it.pid)))){
      o=Object.assign({},o,{type:'szamla',items:o.items.map(it=>Object.assign({},it,{
        price:Math.max(0,num(it.price)-Math.round(num(doc.invNet)*invShare(doc,it.pid)))
      }))});
    }
  }
  const t=szTargetInfo(kind,id),st=S.fin&&S.fin.sz;if(!t||!st)return;
  if(!st.hasKey){szSettingsModal('Az Agent-kulcs megadása után tudsz számlát kiállítani.');return;}
  const inv0=invFor(kind,id),simpleAdv=inv0.some(x=>x.kind==='eloleg'&&x.advType==='szamla')&&!inv0.some(x=>x.kind==='eloleg'&&x.advType!=='szamla');
  const type=o.type==='vegszamla'&&simpleAdv?'szamla':(o.type||'szamla'),pre=szPreset(type,kind,id),inv=inv0;   /* a foglaló sima számlán ment ki: a maradékról sima számla, nem végszámla */
  S._szSimpleAdv=simpleAdv?inv0.filter(x=>x.kind==='eloleg').pop():null;
  const done=inv.filter(x=>x.kind==='szamla'||x.kind==='vegszamla'||(x.kind==='eloleg'&&x.advType==='szamla')).reduce((s,x)=>s+num(x.invNet),0);
  const dbRow=inv.filter(x=>x.kind==='dijbekero').pop(),elRow=inv.filter(x=>x.kind==='eloleg'&&x.advType!=='szamla').pop();S._szElRow=elRow||null;   /* csak a valódi előlegszámla vonható le a végszámlán */
  const b=t.buyer,cls=(S.clients||[]).slice().sort((x,y)=>x.name.localeCompare(y.name,'hu'));
  setTimeout(szBuyerLock,40);
  openModal((SZ_KIND[type]||'Számla')+' kiállítása – '+t.name,`<div class="fields">
    <div class="field"><label for="m-issuer">Kiállító</label><select class="inp" id="m-issuer" name="issuer"><option value="kft" selected>Lumos Motion Kft.</option><option value="ev" disabled>Egri Ervin E.V. (nincs bekötve)</option></select></div>
    ${ms('kind','Típus',[['dijbekero','Díjbekérő (foglaló bekérése)'],['eloleg','Foglalószámla'],['vegszamla','Végszámla'],['szamla','Számla (egyben)']],type)}
    ${kind==='project'?`<input type="hidden" id="m-szClient" value="${esc((cls.find(c=>c.name===b.name)||{}).id||'')}">`:`<div class="field"><label for="m-szClient">Vevő az ügyfelek közül</label><select class="inp" id="m-szClient"><option value="">— kézi megadás —</option>${cls.map(c=>`<option value="${esc(c.id)}"${c.name===b.name?' selected':''}>${esc(c.name)}</option>`).join('')}</select></div>`}
    ${mf('bName','Vevő neve',{full:true,v:b.name,max:200})}
    <div class="field full"><label>E-mail (ide megy a számla)</label><div id="sz-mails">${szMailList(b).map((m,k)=>szMailRow(m,k)).join('')}</div><button type="button" class="linkbtn" data-action="sz-mail-add" style="margin-top:4px">+ További e-mail-cím</button></div>
    ${mf('bTax','Adószám',{v:b.tax,max:20,ph:'12345678-2-42'})}
    ${mf('bZip','Irányítószám',{v:b.zip,max:10,im:'numeric'})}${mf('bCity','Település',{v:b.city,max:80})}
    ${mf('bAddr','Cím',{full:true,v:b.address,max:200})}
    <small class="hint field full" id="sz-buyer-lock" style="margin:-6px 0 0"></small>
    <div class="field full"><span class="lbl">Tételek (nettó egységár)</span><div class="sz-items" id="sz-items">${(o.items&&o.items.length?o.items:pre.items||[{name:pre.name,qty:1,price:pre.price,pid:kind==='project'?id:''}]).map(szItemRow).join('')}</div>
      <button class="linkbtn" type="button" data-action="sz-item-add" style="align-self:flex-start">+ Tétel</button>
      <div class="sz-total" id="sz-total"></div><small class="hint" id="sz-hint" style="margin:0">${esc(SZ_HINT[type])}</small>${done&&type==='szamla'?`<small class="hint" style="margin:0">Erre már kiállítottál ${ftFmt(done)} nettó értékű számlát – a tétel a maradékkal van kitöltve.</small>`:''}</div>
    ${kind==='project'?szSharedPick(id,o.projectIds||[],!!o.tigId):''}
    ${mf('fulfill','Teljesítés dátuma',{type:'date',v:o.fulfill||t.fulfill})}<div class="field"><label for="m-due">Fizetési határidő</label><input class="inp" id="m-due" name="due" type="date" value="${esc(addDays(todayISO(),st.dueDays))}"><div class="due-chips">${[1,5,8,15,30].map(n=>`<button type="button" class="chip due-chip" data-action="sz-due" data-n="${n}" aria-pressed="${n===num(st.dueDays)}">${n} nap</button>`).join('')}</div></div>
    ${ms('payMethod','Fizetési mód',['Átutalás','Készpénz','Bankkártya'],st.payMethod)}
    <div class="field"><span class="lbl">Küldés</span><div class="rolepick"><label><input type="checkbox" name="sendEmail"${st.sendEmail?' checked':''}> E-mailben a vevőnek</label></div>
      <div class="rolepick sz-via" id="sz-via"${st.sendEmail?'':' hidden'} style="margin-top:6px">${(()=>{let v='lumos';try{v=localStorage.getItem('lpm_sz_via')||'lumos';}catch(e){}return `<label><input type="checkbox" name="mailLumos"${v!=='szamlazz'?' checked':''}> Saját (Lumos) címről</label><label><input type="checkbox" name="mailSz"${/szamlazz/.test(v)?' checked':''}> A számlázz.hu küldje</label>`;})()}</div></div>
    <div class="field full sz-mailbox" id="sz-mailbox"${st.sendEmail&&(()=>{try{return localStorage.getItem('lpm_sz_via')!=='szamlazz';}catch(e){return true;}})()?'':' hidden'}><span class="lbl">📧 A levél – így megy ki (kattints bele és írd át)</span>
      <div class="q-mail sz-mail"><div class="q-mh"><div><span>Feladó:</span> ${esc(((S.me&&S.me.name)||'')+' · Lumos Motion')}</div><div><span>Címzett:</span> <b id="sz-mto"></b></div><div class="sz-subj-row"><span>Tárgy:</span> <input class="sz-subj" id="m-szSubj" maxlength="200" aria-label="A levél tárgya"></div><div><span>Melléklet:</span> 📎 [számlaszám].pdf</div></div>
      <div class="q-mb"><textarea class="sz-mtext" id="m-szText" rows="10" maxlength="4000" aria-label="A levél szövege"></textarea><div class="sz-sig" id="sz-sig"></div></div></div>
      <small class="hint" style="margin:4px 0 0">A [számlaszám] helyére a kiállításkor kapott sorszám kerül.</small></div>
    <div class="field full"><label for="m-comment">Megjegyzés a számlán</label><textarea class="inp" id="m-comment" name="comment" rows="2" maxlength="1000">${esc(st.comment||'')}</textarea></div>
  </div><div id="sz-prev"></div>`,{left:`<button type="button" class="btn outline small" data-action="sz-preview">👁 Előnézet</button><button type="button" class="btn outline small" data-action="sz-link" data-kind="${esc(kind)}" data-id="${esc(id)}">Meglévő számla hozzárendelése</button>`,submitLabel:'Tovább',submit:async fd=>{
    const items=szReadItems(),tot=szTotals();
    const k=fd.get('kind');
    const a={[kind==='project'?'projectId':'incomeId']:id,kind:k,dijbekeroNo:k==='eloleg'&&dbRow?dbRow.no:'',elolegNo:k==='vegszamla'&&elRow?elRow.no:'',paid:k==='eloleg',buyer:{name:String(fd.get('bName')||'').trim(),tax:String(fd.get('bTax')||'').trim(),email:fd.getAll('bEmail').map(x=>String(x||'').trim().toLowerCase()).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).join(','),
      zip:String(fd.get('bZip')||'').trim(),city:String(fd.get('bCity')||'').trim(),address:String(fd.get('bAddr')||'').trim()},items,fulfill:fd.get('fulfill'),due:fd.get('due'),payMethod:fd.get('payMethod'),
      comment:String(fd.get('comment')||'').trim(),eInvoice:true,sendEmail:!!fd.get('sendEmail'),mailLumos:!!fd.get('mailLumos'),mailSz:!!fd.get('mailSz'),mailSubject:String(($('m-szSubj')||{}).value||'').trim(),mailText:String(($('m-szText')||{}).value||'').trim(),
      projectIds:kind==='project'?[...document.querySelectorAll('[data-szshare]:checked')].map(x=>x.dataset.szshare):[],tigId:o.tigId||''};
    if(a.buyer.name.length<2||!a.buyer.zip||!a.buyer.city||!a.buyer.address){toast('Add meg a vevő nevét és teljes címét.',true);return;}
    if(!items.length||items.some(it=>it.name.length<2||!it.qty)){toast('Minden tételnek legyen megnevezése és mennyisége.',true);return;}
    if(!tot.net){toast('A számla összege 0 Ft.',true);return;}
    confirmLayer('Biztosan kiállítod?',`<p style="margin:0">${SZ_KIND[a.kind]} <b>${esc(a.buyer.name)}</b> részére${a.projectIds.length?` (közös számla, ${a.projectIds.length+1} projekt)`:''}: nettó <b>${ftFmt(tot.net)}</b>, bruttó <b>${ftFmt(tot.gross)}</b>, határidő ${esc(a.due)}.</p>
      <p class="hint" style="margin:8px 0 0">${a.kind==='dijbekero'?'':'A számla a kiállítással bekerül a NAV-hoz, utólag csak sztornózni lehet.'}</p>${(()=>{const em=esc(a.buyer.email||''),cc=((S.mailCc&&S.mailCc.invoice)||[]).map(r=>({actor:'te (küldő)',admin:'ügyvezető',editor:'termelési vezető'}[r]||r));   /* melyik csatornán, kinek megy ki a levél */
        if(!a.sendEmail||!a.buyer.email||(!a.mailLumos&&!a.mailSz))return '<div class="sz-chan none">✉️ E-mail nem megy ki.</div>';
        return `<div class="sz-chan"><b>✉️ E-mail kiküldése:</b>${a.mailLumos?`<div>• <b>Lumos címről</b> (${esc((S.me&&S.me.name)||'')} · Lumos Motion, PDF melléklettel) → ${em}${cc.length?` <span class="muted">· másolat: ${esc(cc.join(', '))}</span>`:''}</div>`:''}${a.mailSz?`<div>• <b>számlázz.hu</b> (a saját levelével) → ${em}</div>`:''}</div>`;})()}`,
      'Kiállítás',async btn=>{if(btn){btn.disabled=true;btn.textContent='Kiállítás…';}
        try{const d=await call('szInvoice',a);closeModal();finApply(d);toast(`${SZ_KIND[a.kind]} kiállítva: ${d.invoice&&d.invoice.no}`+(d.mail?(d.mail.ok?` · 📧 elküldve: ${d.mail.to}`:` · ⚠️ a levél nem ment ki: ${d.mail.error}`):''),!!(d.mail&&!d.mail.ok));
          {const e2=a.buyer.email,cl=(S.clients||[]).find(c=>c.name===a.buyer.name)||(t.buyer.clientId&&(S.clients||[]).find(c=>c.id===t.buyer.clientId));if(cl&&e2!==(cl.billEmail||'')&&typeof saveClientRec==='function')saveClientRec(Object.assign({},cl,{oldName:'',billEmail:e2})).catch(()=>{});}}   /* a pénzügyi e-mail-címet megjegyezzük az ügyfélnél */
        catch(e){handleErr(e);if(btn){btn.disabled=false;btn.textContent='Kiállítás';}}});}});
  szTotals();szMailInit(t.name);}
/* számla-levél: alapszöveg (a típus, az összeg, a határidő és a fizetési mód alapján) – amíg kézzel nem írtak bele, követi a változásokat */
function szMailDefault(pn){const f=$('mform');if(!f)return {subj:'',text:''};const k=(f.querySelector('[name=kind]')||{}).value||'szamla',tot=szTotals()||{},due=(f.querySelector('[name=due]')||{}).value||'',pm=(f.querySelector('[name=payMethod]')||{}).value||'';
  const L={szamla:['Számla','számlát'],dijbekero:['Díjbekérő','díjbekérőt'],eloleg:['Foglalószámla','foglalószámlát'],vegszamla:['Végszámla','végszámlát']}[k]||['Számla','számlát'];
  const dd=/^\d{4}-\d{2}-\d{2}$/.test(due)?due.replace(/-/g,'. ')+'.':due;
  const pj=pn?(S.projects||[]).find(x=>x.name===pn):null,fn=pj&&pj.contactName?huFirst(pj.contactName):'',vat=num(tot.gross)-num(tot.net);   /* tegező levél, a kapcsolattartó keresztnevével; nettó és bruttó összeg */
  return {subj:L[0]+' – [számlaszám] – '+(pn||'')+' – Lumos Motion',text:[fn?'Kedves '+fn+'!':'Sziasztok!','','Csatolva küldöm a(z) [számlaszám] számú '+L[1]+(pn?' ('+pn+')':'')+'.','','Nettó összeg: '+ftFmt(tot.net||0)+(vat>0?'':' (ÁFA nélkül)'),'Fizetendő: '+ftFmt(tot.gross||0)+' (bruttó)','Fizetési határidő: '+dd,'Fizetési mód: '+pm].concat(/átutal/i.test(pm)?['Közleménybe kérlek, írd be: [számlaszám]']:[]).concat(['','Ha bármi kérdésed van, válaszolj erre a levélre.']).join('\n')};}
function szMailInit(pn){const f=$('mform'),sj=$('m-szSubj'),tx=$('m-szText'),box=$('sz-mailbox');if(!f||!sj||!tx)return;let dirty=false;
  const to=()=>{const e=$('sz-mto');if(e)e.textContent=[...f.querySelectorAll('#sz-mails input')].map(x=>x.value.trim()).filter(Boolean).join(', ')||'—';};
  const grow=()=>{tx.style.height='auto';tx.style.height=(tx.scrollHeight+4)+'px';};
  const fill=()=>{to();if(dirty)return;const d=szMailDefault(pn);sj.value=d.subj;tx.value=d.text;grow();};fill();tx.addEventListener('input',grow);
  (S._mySig!=null?Promise.resolve(S._mySig):call('mySignature').then(r=>(S._mySig=(r&&r.html)||'')).catch(()=>(S._mySig=''))).then(h=>{const g=$('sz-sig');if(g)g.innerHTML=h||'';});
  [sj,tx].forEach(x=>x.addEventListener('input',()=>{dirty=true;}));
  f.addEventListener('input',e=>{if(e.target!==sj&&e.target!==tx)setTimeout(fill,0);});f.addEventListener('change',e=>{if(e.target&&['sendEmail','mailLumos','mailSz'].includes(e.target.name)){const on=!!(f.querySelector('[name=sendEmail]')||{}).checked,L=!!(f.querySelector('[name=mailLumos]')||{}).checked,Z=!!(f.querySelector('[name=mailSz]')||{}).checked;if(box)box.hidden=!(on&&L);const vp=$('sz-via');if(vp)vp.hidden=!on;if(e.target.name!=='sendEmail')try{localStorage.setItem('lpm_sz_via',L&&Z?'lumos+szamlazz':Z?'szamlazz':'lumos');}catch(_){}}if(e.target!==sj&&e.target!==tx)setTimeout(fill,0);});}
function szLinkModal(kind,id,type,back){const t=szTargetInfo(kind,id);if(!t)return;szIdxEnsure();
  openModal('Meglévő bizonylat hozzárendelése',`<div class="fields">${mf('no','Bizonylatszám vagy cégnév',{full:true,max:60,ph:'pl. LUMOS-2026-75 vagy Kulcsár Akadémia'})}${kind==='project'?szSharedPick(id,[],false).replace('A bejelölt projekt tételként kerül a számlára; a kifizetés mindegyik projektnél megjelenik.','Ha a számla több munkáról szól, jelöld be a többit is – a számla és a kifizetése mindegyiknél megjelenik.'):''}</div>
    <div id="sz-peek" class="sz-peek" data-pid="${esc(id)}" data-slot="${esc(type||'')}"></div><p class="hint" style="margin:0">A számlázz.hu-ban már kiállított számlát kapcsolja ehhez: <b>${esc(t.name)}</b>. Az összeg és a kifizetések onnan töltődnek be, és a fizetési állapot magától követi.</p>
    <p class="hint" style="margin:10px 0 0">Más fiókból (pl. <b>Egri Ervin E.V.</b>) vagy kézzel kiállított bizonylat? <button class="linkbtn" type="button" data-action="sz-manual" data-kind="${esc(kind)}" data-id="${esc(id)}" data-type="${esc(type||'szamla')}">✍️ Kézi rögzítés fájlfeltöltéssel</button></p>`,
    {submitLabel:'Hozzárendelés',submit:async fd=>{let no=String(fd.get('no')||'').trim();if(!no){toast('Add meg a számlaszámot.',true);return;}
      if(S._szPeek&&S._szPeek.q===no&&S._szPeek.r)no=S._szPeek.r.no;
      try{const d=await call('szLink',{[kind==='project'?'projectId':'incomeId']:id,no,slot:type||'',projectIds:kind==='project'?[...document.querySelectorAll('[data-szshare]:checked')].map(x=>x.dataset.szshare):[]});back=false;closeModal();finApply(d);toast(d.extended!==undefined?'Közös számla: '+(d.invoice&&d.invoice.no)+' most már ehhez a projekthez is tartozik':'Számla hozzárendelve: '+(d.invoice&&d.invoice.no));}catch(e){handleErr(e);}}});
  if(back)window.MODAL_BEFORE_CLOSE=()=>{const f=$('mform');if(!back||!f||f.getAttribute('aria-label')!=='Meglévő bizonylat hozzárendelése')return null;return ()=>{if(!$('mform'))szInvoiceModal(kind,id,{type});};};}   /* Mégse / ×: vissza a számla kiállításához */
/* Kézi bizonylat: nem az összekötött számlázz.hu-fiókból (pl. Egri Ervin E.V.) – csak a PDF-et kell feltölteni, az adatokat az app olvassa ki belőle */
let PDFJS=null;
function pdfLib(){return PDFJS||(PDFJS=new Promise((ok,no)=>{const sc=document.createElement('script');sc.src='vendor/pdfjs/pdf.min.js';sc.onload=()=>{try{window.pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdfjs/pdf.worker.min.js';ok(window.pdfjsLib);}catch(e){no(e);}};sc.onerror=()=>{PDFJS=null;no(new Error('A PDF-olvasó nem töltődött be.'));};document.head.appendChild(sc);}));}
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
    if(file.size>30*1024*1024){toast('A fájl legfeljebb 30 MB lehet.',true);return;}
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
  if(!/\d/.test(v)){S._szPeek=null;if(v.length<2){box.innerHTML='';return;}szNameSearch(v,box);return;}   // betűk: keresés cégnév szerint
  SZPK_T=setTimeout(async()=>{box.innerHTML='<div class="sz-searching"><span class="sz-radar"></span><span>Keresés a számlázz.hu-ban<span class="sz-dots"><i>.</i><i>.</i><i>.</i></span></span></div>';
    try{const r=await call('szPeek',{no:v,prefix:szPrefix()});if(($('m-no')||{}).value.trim()!==v)return;S._szPeek={q:v,r};
      const ln=(r.linked||[]).map(id=>(projById(id)||{}).name).filter(Boolean);
      box.innerHTML=`<div class="sz-peek-ok">✓ <b>${esc(SZ_KIND[r.kind]||'Számla')} · ${esc(r.no)}</b> · ${esc(r.buyer||'—')} · ${esc((r.date||'').replace(/-/g,'.'))} · nettó ${ftFmt(num(r.invNet))} · ${num(r.invPaid)>=num(r.invGross)-1&&num(r.invGross)>0?'<span class="ok-txt">kifizetve</span>':'<span class="warn-txt">fizetésre vár</span>'}${(r.linked||[]).includes(box.dataset.pid)?`<div class="bl-meta" style="margin-top:4px">Már ehhez a projekthez tartozik – ${box.dataset.slot==='dijbekero'||box.dataset.slot==='eloleg'?'átkerül a <b>Díjbekérő</b> helyére (foglalószámla).':'átkerül a <b>Végszámla</b> helyére.'}</div>`:ln.length?`<div class="bl-meta" style="margin-top:4px">🔗 Már hozzá van rendelve: <b>${esc(ln.join(', '))}</b> – ehhez is hozzáadjuk, így közös számla lesz.</div>`:''}</div>`;}
    catch(err){if(($('m-no')||{}).value.trim()!==v)return;S._szPeek=null;box.innerHTML=`<span class="bad-txt">${esc(errText(err).replace(/^Hiba:\s*/,''))}</span>`;}},700);});
document.addEventListener('change',async e=>{if(e.target.id!=='m-invslot')return;const t=e.target;t.disabled=true;
  try{const d=await call('szSetKind',{id:t.dataset.invid,kind:t.value});closeModal();finApply(d);toast('Áthelyezve: '+(SZ_KIND[t.value]||t.value));}catch(err){handleErr(err);t.disabled=false;}});
ACT['sz-manual']=b=>szManualModal(b.dataset.kind,b.dataset.id,b.dataset.type);
ACT['sz-mpaid']=async b=>{const x0=((S.fin&&S.fin.invoices)||[]).find(x=>x.id===b.dataset.id)||{},sz=!x0.manual;try{const d=await call('szManual',{id:b.dataset.id,paid:b.dataset.paid==='1'});closeModal();finApply(d);toast(b.dataset.paid==='1'?'Kifizetettnek jelölve'+(sz?' – a számlázz.hu-ban is rögzítve':''):'Kifizetés visszavonva'+(sz?' az appban – a számlázz.hu-ban a jóváírást kézzel töröld':''));}catch(e){handleErr(e);}};
function szInvModal(x){const s=invState(x),g=num(x.invGross),p=num(x.invPaid);
  const tgt=x.projectId?invPids(x).map(id=>(projById(id)||{}).name||'?').join(', '):(((S.fin.income||[]).find(r=>r.id===x.incomeId))||{}).name;
  openModal((SZ_KIND[x.kind]||'Számla')+' '+x.no,`<div class="sz-info">
    <div><span>Vevő</span><b>${esc(x.buyer||'—')}</b></div><div><span>${invShared(x)?'Közös számla – projektek':'Ehhez tartozik'}</span><b>${esc(tgt||'—')}</b></div>
    <div><span>Kelt</span><b>${esc(x.date||'—')}</b></div><div><span>Fizetési határidő</span><b class="${s==='late'?'bad-txt':''}">${esc(x.due||'—')}</b></div>
    <div><span>Nettó / bruttó</span><b>${ftFmt(num(x.invNet))} / ${ftFmt(g)}</b></div>
    <div><span>Kifizetve</span><b class="${s==='paid'?'ok-txt':''}">${ftFmt(p)}${x.paidAt?' · '+esc(x.paidAt):''}</b></div>
    <div><span>Hova tartozik</span><b><select class="inp" id="m-invslot" data-invid="${esc(x.id)}" style="max-width:220px;padding:5px 8px;font-size:13px">${[['dijbekero','Díjbekérő'],['eloleg','Foglalószámla (díjbekérő helyén)'],['vegszamla','Végszámla'],['szamla','Számla (egyben)']].map(([k,l])=>`<option value="${k}"${k===x.kind?' selected':''}>${l}</option>`).join('')}</select></b></div>
    <div><span>Állapot</span><b><span class="statuspill ${INV_CLS[s]}">${{paid:'Kifizetve',part:'Részben fizetve',late:'Lejárt, nincs kifizetve',open:'Fizetésre vár'}[s]}</span></b></div>
    <div><span>${x.manual?'Kiállító':'Utoljára ellenőrizve'}</span><b>${x.manual?(x.issuer==='ev'?'Egri Ervin E.V.':'Lumos Motion Kft.')+(x.createdBy==='számlázz.hu'?' · a számlázz.hu számlájából':' · kézi rögzítés'):esc(x.checkedAt||'—')}</b></div></div>`,
  x.manual?{left:`<button type="button" class="btn danger small" data-action="sz-unlink" data-id="${esc(x.id)}">Törlés</button>${x.fileUrl?`<a class="btn outline small" href="${esc(x.fileUrl)}" target="_blank" rel="noopener">📄 Bizonylat megnyitása</a>`:''}`,cancelLabel:'Bezárás',
    submitLabel:s==='paid'?'Kifizetés visszavonása':'✅ Kifizetve',submit:()=>ACT['sz-mpaid']({dataset:{id:x.id,paid:s==='paid'?'0':'1'}})}:
  {left:`<button type="button" class="btn danger small" data-action="sz-unlink" data-id="${esc(x.id)}">Hozzárendelés törlése</button>${x.kind!=='dijbekero'&&!x.manual&&!(num(x.invPaid)>0)&&!invPaidOk(x)?`<button type="button" class="btn outline small" data-action="sz-storno" data-id="${esc(x.id)}">↩️ Sztornó</button>`:''}${x.kind==='dijbekero'&&!(num(x.invPaid)>0)&&!invPaidOk(x)?`<button type="button" class="btn outline small" data-action="sz-dbk-del" data-id="${esc(x.id)}">↩️ Sztornó</button>`:''}`,cancelLabel:'Bezárás',submitLabel:'⬇️ PDF',submit:async()=>{
    const btn=document.querySelector('#mform button[type=submit]');if(btn){btn.disabled=true;btn.textContent='Letöltés…';}
    try{const d=await call(x.id?'szPdf':'szPdfNo',x.id?{id:x.id}:{no:x.no});const bin=atob(d.b64),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
      const url=URL.createObjectURL(new Blob([arr],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download=szFileName(x);document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
    catch(e){handleErr(e);}finally{if(btn){btn.disabled=false;btn.textContent='⬇️ PDF';}}}});
  if(x.manual)return;const f=document.querySelector('#mform .mfoot');if(f){const r=document.createElement('button');r.type='button';r.className='btn outline';r.dataset.action='sz-sync-one';r.dataset.id=x.id;r.textContent='🔄 Frissítés';f.insertBefore(r,f.querySelector('button[type=submit]'));}}
/* Számla megnyitása egy kattintással, új lapon (a PDF); ha nincs fájl (kézi rögzítés fájl nélkül), az adatlap */
/* Egységes fájlnév minden bizonylattípusnál: „Lumos Motion – <Típus> <Számlaszám> – <Vevő>.pdf” */
const SZ_KIND_NAME={szamla:'Számla',dijbekero:'Díjbekérő',eloleg:'Foglalószámla',vegszamla:'Végszámla',storno:'Sztornó számla'};
function szFileName(x){const pc=(typeof projById==='function'&&x.projectId&&projById(x.projectId)||{}).client,buyer=String(pc||x.buyer||'').replace(/\s+(korlátolt felelősségű társaság|zártkörűen működő részvénytársaság|kft\.?|zrt\.?|bt\.?)$/i,'').trim(),t=SZ_KIND_NAME[x.kind]||'Számla';
  return ('Lumos Motion – '+t+' '+(x.no||'')+(buyer?' – '+buyer:'')).replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').trim().slice(0,150)+'.pdf';}
async function szInvOpen(x,btn){
  if(x.manual&&x.kind==='dijbekero'&&x.ref){const r=((S.fin&&S.fin.invoices)||[]).find(y=>y.no===x.ref);if(r){szInvOpen(r,btn);return;}}   /* a számlázz.hu már nem adja vissza a kifizetett díjbekérőt: a belőle készült számla nyílik */
  if(x.manual){if(x.fileUrl)window.open(x.fileUrl,'_blank','noopener');else szInvModal(x);return;}
  const w=window.open('about:blank','_blank');if(w)try{w.document.title=x.no||'Számla';w.document.body.innerHTML='<p style="font:16px system-ui;padding:24px">Számla betöltése…</p>';}catch(e){}
  const old=btn&&btn.textContent;if(btn){btn.classList.add('is-busy');}
  try{const d=await call('szPdf',{id:x.id});const bin=atob(d.b64),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
    const fn=szFileName(x),url=URL.createObjectURL(new File([arr],fn,{type:'application/pdf'}));
    if(w){try{w.document.open();w.document.write('<!doctype html><html lang="hu"><head><meta charset="utf-8"><title>'+esc(fn)+'</title><style>html,body{margin:0;height:100%;background:#323639;font:14px system-ui,sans-serif}.bar{height:44px;display:flex;align-items:center;gap:12px;padding:0 14px;background:#202124;color:#eee}.bar b{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}.bar a{color:#fff;background:#1f5a3d;padding:7px 14px;border-radius:8px;text-decoration:none;font-weight:600}iframe{border:0;width:100%;height:calc(100% - 44px);display:block}</style></head><body><div class="bar"><b>📄 '+esc(fn)+'</b><a href="'+url+'" download="'+esc(fn)+'">⬇ Letöltés</a></div><iframe src="'+url+'" title="'+esc(fn)+'"></iframe></body></html>');w.document.close();}catch(_){w.location.href=url;}}
    else{const a=document.createElement('a');a.href=url;a.download=fn;document.body.appendChild(a);a.click();a.remove();}setTimeout(()=>URL.revokeObjectURL(url),600000);}
  catch(e){if(w)w.close();handleErr(e);}finally{if(btn){btn.classList.remove('is-busy');if(old!=null)btn.textContent=old;}}}
function szSettingsModal(msg){const st=(S.fin&&S.fin.sz)||{},ipn=st.ipnToken?String(window.LUMOS_API_URL||'')+'?ipn='+st.ipnToken:'';
  openModal('Számlázás – számlázz.hu',`${msg?`<p class="hint" style="margin:0 0 12px">${esc(msg)}</p>`:''}<div class="fields">
    <div class="field full"><label for="m-agentKey">Számla Agent-kulcs ${st.hasKey?'<span class="statuspill p-ok">✓ beállítva</span>':'<span class="statuspill p-warn">nincs megadva</span>'}</label>
      <input class="inp" id="m-agentKey" name="agentKey" type="password" autocomplete="off" placeholder="${st.hasKey?'Csak ha cserélni szeretnéd':'Másold be a számlázz.hu-ból'}">
      <small class="hint" style="margin:4px 0 0">számlázz.hu → Beállítások → Számla Agent kulcsok → Új kulcs. A kulcs csak a háttérkódban tárolódik, a felület nem kapja vissza.</small></div>
    <div class="field full"><label for="m-ipnUrl">IPN üzenet internetcíme – a fizetési értesítésekhez</label>
      <div class="tax-row"><input class="inp" id="m-ipnUrl" readonly value="${esc(ipn||'Mentés után jelenik meg')}"><button class="btn outline small" type="button" data-action="sz-copy-ipn"${ipn?'':' disabled'}>Másolás</button></div>
      <small class="hint" style="margin:4px 0 0">Másold be a számlázz.hu-ban: Beállítások → Fiók beállításai → Számlázási alapadatok → <b>IPN üzenet internetcíme</b>, majd Mentés. Ha egy számla kifizetése rögzül (banki párosítás vagy kézi jóváírás), néhány percen belül itt is „fizetve” lesz. Biztonsági okból az app ilyenkor visszakérdez a számlázz.hu-tól.</small></div>
    <div class="field full"><label>Online pénzügyi adatkapcsolat – banki tételek, kimenő és bejövő számlák ${st.bankKeyAt||(S.fin&&S.fin.bankKeyAt)?'<span class="statuspill p-ok">✓ kulcs generálva</span>':''}</label>
      <div class="tax-row"><input class="inp" id="m-bankUrl" readonly value="${esc(location.origin+'/api/szdata')}"><button class="btn outline small" type="button" data-action="sz-copy-bank">Másolás</button></div>
      <div class="tax-row" style="margin-top:6px"><input class="inp" id="m-bankKey" readonly placeholder="${(S.fin&&S.fin.bankKeyAt)?'Kulcs generálva: '+esc(S.fin.bankKeyAt)+' (újat generálhatsz)':'Még nincs kulcs'}"><button class="btn outline small" type="button" data-action="sz-bank-key">Új kulcs</button></div>
      <small class="hint" style="margin:4px 0 0">Fogadó URL a regisztrációhoz; a kulcsot a számlázz.hu-ban: Beállítások → Fiók beállításai → <b>Online pénzügyi adatkapcsolat</b> → Azonosító kulcs. A kulcs csak generáláskor látszik – utána az app sem mutatja.</small></div>
    ${mf('dueDays','Fizetési határidő (nap)',{v:st.dueDays??8,im:'numeric'})}
    ${ms('vat','Alapértelmezett ÁFA',SZ_VATS,st.vat||'27')}
    ${mf('unit','Mennyiségi egység',{v:st.unit||'db',max:20})}
    ${ms('payMethod','Fizetési mód',['Átutalás','Készpénz','Bankkártya'],st.payMethod||'Átutalás')}
    <div class="field full"><div class="rolepick"><label><input type="checkbox" name="sendEmail"${st.sendEmail!==false?' checked':''}> E-mailben a vevőnek</label></div></div>
    <div class="field full"><label for="m-comment">Alapértelmezett megjegyzés a számlán</label><textarea class="inp" id="m-comment" name="comment" rows="2" maxlength="500">${esc(st.comment||'')}</textarea></div>
  </div>`,{submitLabel:'Mentés',submit:async fd=>{
    const d={agentKey:String(fd.get('agentKey')||'').trim(),dueDays:Number(fd.get('dueDays')),vat:fd.get('vat'),unit:String(fd.get('unit')||'').trim(),payMethod:fd.get('payMethod'),eInvoice:true,sendEmail:!!fd.get('sendEmail'),comment:String(fd.get('comment')||'').trim()};
    const r=await finCall('szSettings',d,'Számlázási beállítások mentve');if(r){if(!ipn&&r.sz&&r.sz.ipnToken)szSettingsModal();else closeModal();}}});}
async function szSync(silent,id){if(!szOn()||!S.fin.sz.hasKey)return;if(S._szSyncing){if(!silent){S._szLoud=true;render(true);toast('A kifizetések lekérdezése folyamatban…');}return;}S._szSyncing=true;S._szLoud=!silent;if(S.tab==='szerzodes'||S.tab==='penzugy')render(true);
  try{const d=await call('szSync',id?{id}:{});finApply(d);const c=(d.synced&&d.synced.changed)||[];
    const nw=(d.synced&&d.synced.created)||[];if(c.length||nw.length)toast([c.length?'Új kifizetés: '+c.map(x=>x.no+(x.buyer?' ('+x.buyer+')':'')).join(', '):'',nw.length?'Foglalószámla behozva: '+nw.map(x=>x.no+(x.ref?' ('+x.ref+' alapján)':'')).join(', '):''].filter(Boolean).join(' · '));else if(S._szLoud)toast('A kifizetések naprakészek – nincs új befizetés.');
    if(S._szLoud&&d.synced&&d.synced.errors&&d.synced.errors.length)toast(d.synced.errors[0],true);}
  catch(e){if(S._szLoud)handleErr(e);}finally{S._szSyncing=false;S._szLoud=false;if(S.tab==='penzugy'||S.tab==='szerzodes')render(true);}}
Object.assign(ACT,{
  'sz-new':b=>{const k=b.dataset.kind,id=b.dataset.id;if(!S.fin.sz.hasKey){szSettingsModal('Az Agent-kulcs megadása után tudsz számlát kiállítani.');return;}szInvoiceModal(k,id,{type:k==='project'?billNextType(id):'szamla'});},
  'sz-link':b=>szLinkModal(b.dataset.kind,b.dataset.id,(($('m-kind')||{}).value)||b.dataset.type,!!$('m-kind')),
  'sz-inv-info':b=>{const x=((S.fin&&S.fin.invoices)||[]).find(i=>i.id===b.dataset.id);if(x)szInvModal(x);},
  'sz-inv-db':b=>ACT['sz-inv'](b),   /* díjbekérő hivatkozás (a kártya üres részére kattintva nem ez, hanem a foglalószámla nyílik) */
  'cl-inv-open':b=>{const no=b.dataset.no;if(!no)return;const x=((S.fin&&S.fin.invoices)||[]).find(i=>i.no===no)||{no,buyer:b.dataset.buyer||''};szInvOpen(x,b);},   /* ügyfél adatai → Számlázva: a sor megnyitja a számla PDF-jét */
  'sz-inv':b=>{const x=((S.fin&&S.fin.invoices)||[]).find(i=>i.id===b.dataset.id);if(x)szInvOpen(x,b);},
  'sz-unlink':b=>{const id=b.dataset.id;confirmModal('Hozzárendelés törlése','A számla az appból kikerül, a számlázz.hu-ban változatlanul megmarad (sztornózni ott tudod).','Törlés',()=>finCall('szUnlink',{id},'Hozzárendelés törölve'));},
  'sz-sync':()=>szSync(false),
  'sz-sync-one':b=>{closeModal();szSync(false,b.dataset.id);},
  'sz-settings':()=>szSettingsModal(),
  'sz-copy-ipn':()=>copyText(($('m-ipnUrl')||{}).value||'','IPN cím vágólapra másolva'),
  'sz-copy-bank':()=>copyText(($('m-bankUrl')||{}).value||'','Fogadó URL vágólapra másolva'),
  'sz-bank-key':async b=>{const go=async()=>{b.disabled=true;try{const r=await call('szBankKey');S.fin.bankKeyAt=r.at;const i=$('m-bankKey');if(i){i.value=r.key;i.select();}copyText(r.key,'Új kulcs vágólapra másolva – illeszd be a számlázz.hu-ban');}catch(e){handleErr(e);}finally{b.disabled=false;}};
    if(S.fin&&S.fin.bankKeyAt)confirmLayer('Új azonosító kulcs','<p style="margin:0">A régi kulcs azonnal érvénytelen lesz: az újat be kell másolnod a számlázz.hu-ba, különben nem érkeznek a banki tételek.</p>','Új kulcs',(bb,d)=>{if(d&&d.remove)d.remove();go();});else go();},
  'loan-bank':()=>{const L=((S.fin&&S.fin.loan)||[]),T=(S.fin.bankTxLoan||[]).slice().sort((a,b)=>String(a.valueDate).localeCompare(String(b.valueDate))),used=new Set();
    const has=t=>{const amt=Math.round(Math.abs(Number(t.amount)||0)),k=t.dir==='KI'?'vissza':'be',l=L.find(x=>!used.has(x.id)&&x.date===t.valueDate&&x.kind===k&&Math.round(Number(x.amount)||0)===amt)||L.find(x=>!used.has(x.id)&&x.kind===k&&Math.round(Number(x.amount)||0)===amt&&Math.abs(new Date(x.date)-new Date(t.valueDate))<=40*864e5);if(l)used.add(l.id);return l;};
    const rows=T.map(t=>{const l=has(t),amt=Math.round(Math.abs(Number(t.amount)||0));return `<tr><td class="nowrap">${esc(t.valueDate||'')}</td><td>${t.dir==='KI'?'<span class="statuspill p-ok">Cég visszafizeti</span>':'<span class="statuspill p-bad">Kölcsön a cégnek</span>'}</td><td><span class="link-like" data-action="bank-info" data-id="${esc(t.id)}">${esc(t.partnerName||'')}</span>${t.note?`<br><small class="muted">${esc(t.note)}</small>`:''}</td><td class="r nowrap">${sFt(amt)}</td><td>${l?`<span class="ok-txt">✓ a táblában${l.date!==t.valueDate?` <span class="muted">(${esc(l.date)} dátummal – lehet, hogy elírás)</span>`:''}</span>`:`<button class="btn primary small" type="button" data-action="bank-loan" data-id="${esc(t.id)}">→ Rögzítés</button>`}</td></tr>`;}).join('');
    const only=L.filter(l=>!used.has(l.id)),sum=a=>a.reduce((s,x)=>s+(x.kind==='vissza'?-1:1)*Math.round(Number(x.amount)||0),0),bsum=T.reduce((s,t)=>s+(t.dir==='KI'?-1:1)*Math.round(Math.abs(Number(t.amount)||0)),0);
    openModal('Tagi kölcsön – banki utalások egyeztetése',`<p class="hint" style="margin:0 0 8px">A „tagi kölcsön” közleményű (vagy annak rögzített) banki utalások, a számlázz.hu adatkapcsolat kezdetétől. A ✓ jelöltek egy azonos napú és összegű sorként szerepelnek a táblában.</p>
      <div class="sheet-wrap"><table class="sheet fin-tbl"><thead><tr><th>Dátum</th><th>Típus</th><th>Partner / közlemény</th><th class="r">Összeg</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="empty-row">Nincs ilyen banki utalás.</td></tr>'}</tbody></table></div>
      <p style="margin:10px 0 0">Banki utalások egyenlege: <b>${sFt(bsum)}</b> · a táblában banki pár nélkül: <b>${only.length} sor</b> (${sFt(sum(only))})${only.length?` – ${only.map(l=>esc(l.date)+' '+(l.kind==='vissza'?'−':'')+sFt(Math.round(Number(l.amount)||0))).join(', ')}`:''}</p>`,{submitLabel:'Bezárás',noDraft:true,submit:()=>closeModal()});
    const mb=document.querySelector('#modalRoot .mbox');if(mb)mb.classList.add('mbox-wide');},
  'loan-info':b=>{const l=((S.fin&&S.fin.loan)||[]).find(x=>x.id===b.dataset.id);if(!l)return;const amt=Math.round(Number(l.amount)||0),dir=l.kind==='vissza'?'KI':'BE',t=(S.fin.bankTxLoan||[]).find(x=>x.valueDate===l.date&&Math.round(Math.abs(Number(x.amount)||0))===amt&&x.dir===dir);
    if(t){ACT['bank-info']({dataset:{id:t.id}});return;}
    openModal('Tagi kölcsön – részletek',`<div class="kv-list">${[['Dátum',l.date],['Típus',l.kind==='vissza'?'Cég visszafizeti':'Kölcsön a cégnek'],['Összeg',sFt(amt)],['Bank',l.kind==='vissza'?loanBank(l)+(l.bank2?' → '+l.bank2:''):(l.bank2?l.bank2+' → ':'')+loanBank(l)],['Megjegyzés',l.note]].filter(r=>r[1]).map(([k,v])=>`<div class="kv"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}<p class="hint" style="margin:10px 0 0">Ehhez a sorhoz nem tartozik banki tétel (kézzel rögzítve).</p></div>`,{submitLabel:'✏️ Módosítás',noDraft:true,submit:()=>{closeModal();finLoanModal(l);}});},
  'bank-info':b=>{const t=((S.fin.bankTx||[]).concat(S.fin.bankTxOff||[],S.fin.bankTxLoan||[])).find(x=>x.id===b.dataset.id);if(!t)return;
    const R=[['Értéknap',fmtDay(t.valueDate)],['Irány',t.dir==='KI'?'Kimenő utalás':'Beérkező utalás'],['Összeg',(t.dir==='KI'?'−':'')+sFt(Math.round(Number(t.amount)||0))+(t.currency&&t.currency!=='HUF'?' '+t.currency:'')],['Partner',t.partnerName],['Partner bankszámla',t.partnerAccount],['Közlemény',t.note],['Típus',t.type],['Saját bankszámla',t.account],['számlázz.hu azonosító',t.szId],['Beérkezett',t.receivedAt],['Állapot',{elvetve:'Elvetve',parositva:'Párosítva',kolcson:'Tagi kölcsön',javaslat:'Javaslat'}[t.status]||'Párosításra vár'],['Kezelte',[t.handledBy,t.handledAt].filter(Boolean).join(' · ')]].filter(r=>r[1]);
    openModal('Az utalás részletei',`<div class="kv-list">${R.map(([k,v])=>`<div class="kv"><span>${esc(k)}</span><b style="white-space:pre-wrap;word-break:break-word">${esc(v)}</b></div>`).join('')}</div>`,{submitLabel:'Bezárás',noDraft:true,submit:()=>closeModal()});},
  'bank-all':()=>{S._bankAll=1;render(true);},
  'bank-off':()=>{S._bankOff=1;render(true);},
  'bank-back':b=>finCall('szBankSet',{id:b.dataset.id,status:'vissza'},'Visszaállítva – újra párosításra vár'),
  'bank-loan':b=>{const t=((S.fin.bankTx||[]).concat(S.fin.bankTxOff||[],S.fin.bankTxLoan||[])).find(x=>x.id===b.dataset.id);if(!t)return;
    openModal('Tagi kölcsön rögzítése',`<p style="margin:0"><b>${esc(t.partnerName||'')}</b> · ${t.dir==='KI'?'−':''}${sFt(Math.round(Number(t.amount)||0))} · ${esc(fmtDay(t.valueDate))}${t.note?`<br><span class="muted">${esc(t.note)}</span>`:''}<br><br>→ a Tagi kölcsön táblába kerül ${t.dir==='KI'?'visszafizetésként':'a cégnek adott kölcsönként'}, ${esc(fmtDay(t.valueDate))}-i dátummal. A bankot utána a táblában megadhatod.</p>`,{submitLabel:'✓ Rögzítés',noDraft:true,submit:async()=>{closeModal();await finCall('szBankSet',{id:t.id,status:'kolcson'},'Rögzítve a tagi kölcsönök közé');}});},
  'bank-sz':b=>{const t=(S.fin.bankTx||[]).find(x=>x.id===b.dataset.id);if(!t||!t.matchSz)return;const L=t.matchSz;
    openModal('Utalás párosítása',`<p style="margin:0"><b>${esc(t.partnerName||'')}</b> · ${sFt(Math.round(Number(t.amount)||0))} · ${esc(fmtDay(t.valueDate))}${t.note?`<br><span class="muted">${esc(t.note)}</span>`:''}<br><br>→ ${L.map(z=>`<b>${esc(z.no)}</b> (${sFt(z.rest)})`).join(', ')} kifizetettre állítva, a számlázz.hu-ban is jóváírva, ${esc(fmtDay(t.valueDate))}-i dátummal.</p>`,{submitLabel:'✓ Kifizetve',noDraft:true,submit:async()=>{closeModal();await finCall('szBankSet',{id:t.id,status:'parositva',szNos:L.map(z=>z.no)},'Párosítva – a számla kifizetett');}});},
  'bank-ok':b=>{const t=(S.fin.bankTx||[]).find(x=>x.id===b.dataset.id);if(!t)return;
    if(/^pay:/.test(b.dataset.inv||'')){const p=(S.payStatus||[]).find(x=>x.id===b.dataset.inv.slice(4));if(!p)return;openModal('Kimenő utalás párosítása',`<p style="margin:0"><b>${esc(t.partnerName||'')}</b> · −${sFt(Math.round(Number(t.amount)||0))} · ${esc(fmtDay(t.valueDate))}<br><br>→ <b>${esc(p.crewName||'')}</b> ${esc(p.month)} havi díja kifizetettre állítva, ${esc(fmtDay(t.valueDate))}-i dátummal.</p>`,{submitLabel:'✓ Kifizetve',noDraft:true,submit:async()=>{closeModal();const d=await finCall('szBankSet',{id:t.id,status:'parositva',invoiceId:b.dataset.inv},'Párosítva – a díj kifizetett');if(d&&typeof load==='function')load(true);}});return;}
    const x=((S.fin.invoices)||[]).find(i=>i.id===b.dataset.inv);if(!x)return;
    openModal('Utalás párosítása',`<p style="margin:0"><b>${esc(t.partnerName||'')}</b> · ${sFt(Math.round(Number(t.amount)||0))} · ${esc(fmtDay(t.valueDate))}${t.note?`<br><span class="muted">${esc(t.note)}</span>`:''}<br><br>→ <b>${esc(x.no)}</b> (${esc(x.buyer||'')}) kifizetettre állítva, a számlázz.hu-ban is jóváírva, ${esc(fmtDay(t.valueDate))}-i dátummal.</p>`,{submitLabel:'✓ Kifizetve',noDraft:true,submit:async()=>{closeModal();await finCall('szBankSet',{id:t.id,status:'parositva',invoiceId:x.id},'Párosítva – a számla kifizetett');}});},
  'bank-no':b=>finCall('szBankSet',{id:b.dataset.id,status:'elvetve'},'Elvetve'),
  'indoc-exp':b=>{const d=((S.fin.szDocs&&S.fin.szDocs.open)||[]).find(x=>x.id===b.dataset.id),m=String((d&&(d.telj||d.kelt))||todayISO()).slice(0,7);
    indocQuick(b.dataset.id,{status:'kiadas',fund:b.dataset.fund},'Kiadásként rögzítve: '+F_YM.format(toDate(m+'-01'))+', '+(b.dataset.fund==='marketing'?'marketing':'rezsi')+' (a teljesítés hónapja)');},
  'indoc-no':b=>indocQuick(b.dataset.id,{status:'elvetve'},''),
  'bankpay-all':()=>{S._payAll=1;render(true);},
  'bankpay-exp':b=>{try{bankPayExp(b);}catch(e){console.error('bankpay-exp',e);toast('Nem sikerült megnyitni a kiadás ablakát: '+(e&&e.message||e),true);}},
  'bankpay-exp0':b=>{const t=((S.fin&&S.fin.bankPay)||[]).find(x=>String(x.id)===String(b.dataset.id));if(!t){toast('Ez a tétel közben megváltozott – frissítem a listát.',true);finCall('finData',{},'');return;}const gross=Math.round(Math.abs(Number(t.amount)||0)),fund=b.dataset.fund==='marketing'?'marketing':'rezsi';
    openModal('Kiadás banki utalásból – '+(fund==='marketing'?'marketing':'eszközköltség, rezsi'),`<p class="hint" style="margin:0 0 8px">${esc(fmtDay(t.valueDate))} · ${esc(t.partnerName||'')}${t.note?' · '+esc(t.note):''} · utalva <b>${sFt(gross)}</b> (bruttó)</p><div class="fields">
      ${mf('name','Megnevezés',{full:true,v:(t.partnerName||'Szállító')+(t.note?' – '+t.note:''),max:200})}
      ${moneyField('net','Összeg (nettó)',Math.round(gross/1.27),{steps:false})}
    </div><p class="hint" style="margin:0">A nettó összeget 27% ÁFÁ-val számoltam az utalt bruttóból – ha a szállító alanyi adómentes vagy más kulccsal számláz, írd át. A kiadás ${esc(F_YM.format(toDate(String(t.valueDate||todayISO()).slice(0,7)+'-01')))} hónapjába kerül.</p>`,
      {submitLabel:'Kiadás mentése',submit:async fd=>{const net=num(moneyVal(fd.get('net')));if(!net){toast('Add meg a nettó összeget.',true);return;}if(net>gross){toast('A nettó nem lehet több az utalt '+sFt(gross)+'-nál.',true);return;}
        closeModal();S.fin.bankPay=(S.fin.bankPay||[]).filter(x=>x.id!==t.id);render(true);toast('Kiadásként rögzítve');
        try{const d=await call('bankExpense',{id:t.id,fund,net,name:String(fd.get('name')||'').trim()});finApply(d);render(true);}catch(e){handleErr(e);finCall('finData',{},'');}}});},
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
      <div><div class="lb">Vevő</div><b>${h(fd.get('bName'))}</b><br>${h([fd.get('bZip'),fd.get('bCity')].filter(Boolean).join(' '))}${fd.get('bAddr')?', '+h(fd.get('bAddr')):''}${fd.get('bTax')?'<br>Adószám: '+h(fd.get('bTax')):''}${fd.getAll('bEmail').filter(Boolean).map(x=>'<br>'+h(x)).join('')}</div></div>
    <div class="meta"><div>Kelt<b>${d(todayISO())}</b></div><div>Teljesítés<b>${d(fd.get('fulfill'))}</b></div><div>Fizetési határidő<b>${d(fd.get('due'))}</b></div><div>Fizetési mód<b>${h(fd.get('payMethod'))}</b></div></div>
    <table><tr><th>Megnevezés</th><th class="r">Menny.</th><th class="r">Nettó egységár</th><th class="r">Nettó</th><th class="r">ÁFA</th><th class="r">Bruttó</th></tr>
    ${its.map(it=>{const n=Math.round(it.price*it.qty),v=Math.round(n*vr(it.vat)/100);return `<tr><td>${h(it.name)}</td><td class="r">${h(it.qty)} ${h(it.unit)}</td><td class="r">${ft(it.price)}</td><td class="r">${ft(n)}</td><td class="r">${/^\d+$/.test(it.vat)?it.vat+'%':h(it.vat)}</td><td class="r">${ft(n+v)}</td></tr>`;}).join('')}</table>
    ${(()=>{const el=k==='vegszamla'?S._szElRow:null;if(!el)return `<div class="tot"><div><span>Nettó összesen</span><b>${ft(tot.net)}</b></div><div><span>ÁFA</span><b>${ft(tot.vat)}</b></div><div class="g"><span>Fizetendő</span><span>${ft(tot.gross)}</span></div></div>${k==='vegszamla'&&S._szSimpleAdv?`<div class="note" style="color:#a33"><b>⚠ A foglaló sima számlán ment ki (${h(S._szSimpleAdv.no)})</b> – azt a végszámla nem tudja levonni. Típusnak válaszd a „Számla” lehetőséget, és csak a fennmaradó részt számlázd ki.</div>`:k==='vegszamla'?'<div class="note" style="color:#a33"><b>⚠ Ennél a projektnél nincs foglalószámla az appban</b> – a végszámla a teljes összegről szól, a vevő a teljes összeget fizeti. Ha volt foglaló, előbb hozd be (🔄 Kifizetések / „+ Foglalószámla”).</div>':''}`;
      const eg=num(el.invGross),en=num(el.invNet)||Math.round(eg/1.27),pay=tot.gross-eg;
      return `<div class="tot"><div><span>Nettó összesen</span><b>${ft(tot.net)}</b></div><div><span>ÁFA</span><b>${ft(tot.vat)}</b></div><div><span>Bruttó összesen</span><b>${ft(tot.gross)}</b></div>
        <div style="color:#2e6b48"><span>Levonva: foglalószámla ${h(el.no)}</span><b>−${ft(eg)}</b></div><div style="font-size:11px;color:#777"><span>(ebből nettó ${ft(en)}, ÁFA ${ft(eg-en)})</span><span></span></div>
        <div class="g"><span>Fizetendő</span><span>${ft(pay)}</span></div></div><div class="note">A számlázz.hu a végszámlán levonja a ${h(el.no)} foglalószámlát (${ft(eg)}) – a vevő csak a különbözetet, ${ft(pay)}-ot fizeti. A pontos megjelenést a számlázz.hu adja.</div>`;})()}${k==='dijbekero'?'<div class="note">A díjbekérő nem számla; a kifizetés után foglalószámla készül róla.</div>':''}
    ${fd.get('comment')?`<div class="note">${h(fd.get('comment'))}</div>`:''}<div class="wm">ELŐNÉZET – a végleges, sorszámozott bizonylatot a számlázz.hu állítja ki.</div></body></html>`;
  const box=$('sz-prev');if(box){box.innerHTML='<div class="tig-prev-h"><b>Előnézet</b> <span class="muted">– így kerül ki; ha minden rendben, „Tovább”</span></div><iframe class="tig-frame" title="Bizonylat előnézete" sandbox></iframe>';box.querySelector('iframe').srcdoc=html;if(!szPreview.noScroll)box.scrollIntoView({behavior:'smooth',block:'start'});}}
ACT['sz-preview']=()=>szPreview();
document.addEventListener('input',e=>{if($('sz-prev')&&$('sz-prev').innerHTML&&e.target.closest&&e.target.closest('#mform')){clearTimeout(S._szpT);S._szpT=setTimeout(()=>{const y=scrollY,b=$('sz-prev');if(!b)return;const fr=b.querySelector('iframe');szPreview.noScroll=1;szPreview();szPreview.noScroll=0;},500);}});
document.addEventListener('change',e=>{const t=e.target;if(t.closest&&t.closest('#sz-items'))szTotals();
  if(t.id==='m-szClient'){const c=(S.clients||[]).find(x=>x.id===t.value);if(!c)return;const a=szSplitAddr(c.address);const mb=$('sz-mails');if(mb)mb.innerHTML=szMailList({email:szRepEmail(c,null),email2:szFinEmail(c),saved:c.billEmail}).map((m,k)=>szMailRow(m,k)).join('');
    [['m-bName',c.name],['m-bTax',c.tax],['m-bZip',a.zip],['m-bCity',a.city],['m-bAddr',a.address]].forEach(([k,v])=>{if($(k))$(k).value=v||'';});}
  if(t.id==='m-szClient')szBuyerLock();});
/* A vevő neve, adószáma és címe az ügyféladatokból (számlázz.hu) jön – nem írható át; csak kézi megadásnál szerkeszthető */
function szBuyerLock(){const sel=$('m-szClient');if(!sel)return;const lock=!!sel.value&&!!(($('m-bName')||{}).value||'').trim();
  ['m-bName','m-bTax','m-bZip','m-bCity','m-bAddr'].forEach(k=>{const e=$(k);if(e){e.readOnly=lock;e.classList.toggle('ro-inp',lock);}});
  const h=$('sz-buyer-lock');if(h)h.textContent=lock?(sel.type==='hidden'?'🔒 A vevő a projekt ügyfele – az adatai az ügyféltörzsből jönnek. Más vevőhöz a projekt ügyfelét módosítsd.':'🔒 A vevő adatai az ügyféltörzsből jönnek. Más vevőhöz válaszd a „kézi megadás”-t.'):'';}

ACT['inc-to-proj']=b=>{const r=((S.fin&&S.fin.income)||[]).find(x=>x.id===b.dataset.id);if(!r)return;const d=parseInt(r.day,10);
  newProjectModal('',{incId:r.id,name:r.name,amount:num(r.amount),date:r.month+'-'+String(d>=1&&d<=31?d:1).padStart(2,'0')});};

ACT['fin-proj-new']=()=>{const m=S.finMonth||todayISO().slice(0,7);guard(()=>newProjectModal(m===todayISO().slice(0,7)?todayISO():m+'-01'));};

/* Bevételek ✏️: csak a név módosítása (projektnél a projekt neve, egyéb / régi sornál a sor neve) */
ACT['inc-rename']=b=>{const id=b.dataset.id,isP=b.dataset.kind==='project',p=isP?projById(id):null,r=isP?null:((S.fin&&S.fin.income)||[]).find(x=>x.id===id);if(!p&&!r)return;
  openModal(isP?'Projekt átnevezése':'Bevétel átnevezése',`<div class="fields">${mf('name','Megnevezés',{full:true,v:(p||r).name||'',max:isP?160:200})}</div>`,{left:r?`<button type="button" class="btn danger small" data-action="fin-income-del" data-id="${esc(r.id)}">🗑️ Sor törlése</button>`:'',submitLabel:'Mentés',submit:async(fd,form)=>{
    const n=String(fd.get('name')||'').trim();if(n.length<2){toast('Add meg a nevet (legalább 2 karakter).',true);return;}if(n===(p||r).name){closeModal();return;}
    if(r){const row=Object.assign({},r,{name:n});finSave('finUpsert',{table:'income',row},'Átnevezve',()=>finLocal('income',[row]));return;}
    if(S.draft&&S.draft.id===id){closeModal();setDraft({name:n});setTimeout(()=>{if(S.dirty)saveDraft();},0);toast('Átnevezve');return;}
    try{const saved=await call('saveProject',Object.assign(clone(p),{name:n,baseUpdatedAt:p.updatedAt||'',mutationId:uuid(),deferCal:true}));const k=S.projects.findIndex(x=>x.id===id);if(k>=0)S.projects[k]=saved;closeModal();render(true);toast('Projekt átnevezve');if(saved.calEventId&&typeof syncCal==='function')syncCal(saved.id);}
    catch(e){handleErr(e);}}});};

/* Számla keresése cégnév szerint: a számlázz.hu-s számlák jegyzéke a böngészőben (azonnali szűrés gépelés közben);
   a jegyzéket a háttérben frissítjük (az első feltöltés tart tovább, utána csak az új számlák jönnek) */
const SZI={idx:null,at:0,partial:true,busy:false};
try{const o=JSON.parse(localStorage.getItem('lumos_szidx_v1')||'null');if(o&&o.idx){SZI.idx=o.idx;SZI.at=o.at||0;SZI.partial=!!o.partial;}}catch(e){}
function szIdxSave(){try{localStorage.setItem('lumos_szidx_v1',JSON.stringify({idx:SZI.idx,at:SZI.at,partial:SZI.partial}));}catch(e){}}
function szIdxEnsure(){if(SZI.busy||Date.now()-(SZI.tried||0)<60000&&SZI.idx&&!SZI.partial||Date.now()-(SZI.failAt||0)<60000||!isAdmin()||!(S.fin&&S.fin.sz&&S.fin.sz.hasKey))return;if(SZI.idx&&!SZI.partial&&Date.now()-SZI.at<5*60000)return;szIdxRefresh();}
async function szIdxRefresh(){if(SZI.busy)return;SZI.busy=true;SZI.tried=Date.now();szHitsRedo();
  try{if(!SZI.idx){const c=await call('szSearch',{cached:true,prefix:szPrefix()});SZI.idx=c.index||{};SZI.partial=c.partial;SZI.at=c.at||0;szIdxSave();szHitsRedo();}
    for(let k=0;k<20;k++){const r=await call('szSearch',{all:true,prefix:szPrefix()});SZI.idx=r.index||{};SZI.partial=!!r.partial;SZI.at=r.at||Date.now();szIdxSave();szHitsRedo();if(!SZI.partial)break;}}
  catch(e){SZI.failAt=Date.now();}finally{SZI.busy=false;szHitsRedo();}}
function szHitsRedo(){const i=$('m-no'),box=$('sz-peek');if(!i||!box)return;const v=i.value.trim();if(v.length>=3&&!/\d/.test(v))szNameSearch(v,box);}
function szNameSearch(v,box){szIdxEnsure();
  const norm=x=>String(x||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''),words=norm(v).split(/\s+/).filter(Boolean),all={};
  Object.entries(SZI.idx||{}).forEach(([no,a])=>{all[no]={no,buyer:a[0],date:a[1],invNet:a[2],invGross:a[3],invPaid:a[4]};});
  ((S.fin&&S.fin.invoices)||[]).forEach(x=>{if(x.no&&!all[x.no])all[x.no]={no:x.no,buyer:x.buyer,date:x.date,invNet:x.invNet,invGross:x.invGross,invPaid:x.invPaid};});   // a már hozzárendeltek (díjbekérők is)
  const linkedOf=no=>{const l=((S.fin&&S.fin.invoices)||[]).find(x=>x.no===no);return l?invPids(l).map(id=>(projById(id)||{}).name).filter(Boolean):[];};
  const hits=Object.values(all).filter(x=>words.every(w=>norm(x.buyer).includes(w)||norm(x.no).includes(w))).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,15);
  const list=hits.map(x=>{const ln=linkedOf(x.no),paid=num(x.invGross)>0&&num(x.invPaid)>=num(x.invGross)-1;
    return `<button type="button" class="hs-item sz-hit" data-szno="${esc(x.no)}"><span><b>${esc(x.no)}</b> · ${esc(x.buyer||'—')}</span><small>${esc((x.date||'').replace(/-/g,'.'))} · nettó ${ftFmt(num(x.invNet))} · ${paid?'kifizetve':'fizetésre vár'}${ln.length?' · 🔗 '+esc(ln.join(', ')):''}</small></button>`;}).join('');
  const n=Object.keys(SZI.idx||{}).length,loading=SZI.busy&&(SZI.partial||!SZI.idx);
  box.innerHTML=(list?`<div class="sz-hits">${list}</div>`:(loading?'':`<span class="muted">Nincs ilyen vevőjű számla (${n} számla között kerestem).</span>`))
    +(loading?`<div class="sz-searching"><span class="sz-radar"></span><span>Számlák betöltése a számlázz.hu-ból${n?` (eddig ${n} db)`:''} – csak az első alkalommal tart tovább<span class="sz-dots"><i>.</i><i>.</i><i>.</i></span></span></div>`:'');}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.sz-hit');if(!b)return;const i=$('m-no');if(!i)return;i.value=b.dataset.szno;i.dispatchEvent(new Event('input',{bubbles:true}));i.focus();});

document.addEventListener('input',e=>{if(e.target.id!=='q-fin')return;S.finQ=e.target.value;const pos=e.target.selectionStart;render(true);const n=$('q-fin');if(n){n.focus();try{n.setSelectionRange(pos,pos);}catch(x){}}});

/* Számla e-mail-címei: alapból egy (a korábbi küldések címei, ennek hiányában a cég képviselője), igény szerint több */
function szMailList(b){const uniq=a=>a.map(x=>String(x||'').trim().toLowerCase()).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i);
  const saved=uniq(String((b&&b.saved)||'').split(/[,;\s]+/).filter(x=>x.includes('@')));   // a korábbi küldések címei
  const l=saved.length?saved:uniq([b&&b.email,b&&b.email2]);return l.length?l:[''];}
const szMailRow=(m,k)=>`<div class="sz-mail-row"><input class="inp" name="bEmail" type="email" maxlength="160" value="${esc(m||'')}" placeholder="${k?'pl. penzugy@ceg.hu':'pl. ugyvezeto@ceg.hu'}" aria-label="E-mail-cím ${k+1}">${k?'<button class="x w" type="button" data-action="sz-mail-del" aria-label="Cím törlése">×</button>':''}</div>`;
ACT['sz-mail-add']=()=>{const b=$('sz-mails');if(!b)return;const k=b.querySelectorAll('.sz-mail-row').length;b.insertAdjacentHTML('beforeend',szMailRow('',k));const i=b.querySelectorAll('input');i[i.length-1].focus();};
ACT['sz-mail-del']=b=>{const r=b.closest('.sz-mail-row');if(r)r.remove();szMailsRemember();};
/* A számla e-mail-címei azonnal megjegyződnek az ügyfélnél (új cím felvétele / törlése után a következő számlánál már ezek jönnek) */
function szMailsRemember(){clearTimeout(szMailsRemember._t);szMailsRemember._t=setTimeout(()=>{const box=$('sz-mails'),nm=(($('m-bName')||{}).value||'').trim();if(!box||!nm)return;
  const list=[...box.querySelectorAll('input[name=bEmail]')].map(i=>i.value.trim().toLowerCase()).filter(v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)).filter((v,i,a)=>a.indexOf(v)===i);if(!list.length)return;
  const sid=(($('m-szClient')||{}).value||''),cl=(S.clients||[]).find(c=>c.id===sid)||(S.clients||[]).find(c=>String(c.name||'').trim().toLowerCase()===nm.toLowerCase());
  const v=list.join(',');if(!cl||v===(cl.billEmail||''))return;cl.billEmail=v;saveClientRec(Object.assign({},cl,{oldName:'',billEmail:v})).catch(()=>{});},600);}
document.addEventListener('change',e=>{if(e.target&&e.target.name==='bEmail'&&e.target.closest('#sz-mails'))szMailsRemember();});
ACT['sz-due']=b=>{const i=$('m-due');if(!i)return;const v=addDays(todayISO(),Number(b.dataset.n));if(i._flatpickr)i._flatpickr.setDate(v,false);i.value=v;   /* a szép dátummező (flatpickr) is frissüljön */document.querySelectorAll('.due-chip').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));i.dispatchEvent(new Event('change',{bubbles:true}));};
document.addEventListener('input',e=>{if(e.target.id==='m-due')document.querySelectorAll('.due-chip').forEach(x=>x.setAttribute('aria-pressed','false'));});

/* Saját marketing projekt be/ki */
ACT['fin-mkt-proj']=async btn=>{const pid=btn.dataset.id,on=!!btn.dataset.on;if(!S.fin)return;const arr=S.fin.billing=S.fin.billing||[];let b=arr.find(x=>x.projectId===pid);if(!b){b=Object.assign({},billOf(pid));arr.push(b);}
  const prev=b.mktProject;b.mktProject=on?'1':'0';render(true);
  try{const d=await call('billSave',{projectId:pid,mktProject:on?'1':'0'});if(d&&d.billing)S.fin.billing=d.billing;render(true);toast(on?'Áthelyezve a marketing költségek közé':'Visszakerült a bevételek közé');}catch(e){b.mktProject=prev;render(true);handleErr(e);}};

/* Számla sztornózása: csak sztornó, vagy sztornó + új számla az előző adataival */
ACT['bs-opts']=b=>{const old=document.querySelector('.bs-menu');if(old){const same=old.dataset.for===b.dataset.id;old.remove();if(same)return;}
  const m=document.createElement('div');m.className='bs-menu';m.dataset.for=b.dataset.id;const id=esc(b.dataset.id);
  m.innerHTML=(b.dataset.pay?`<button type="button" data-action="sz-mpaid" data-id="${id}" data-paid="1">✓ Jelölés fizetettnek</button>`:'')+(b.dataset.sto?`<button type="button" class="bad" data-action="${b.dataset.sto==='dbk'?'sz-dbk-del':'sz-storno'}" data-id="${id}">↩️ Sztornó</button>`:'');
  document.body.appendChild(m);const r=b.getBoundingClientRect();m.style.top=(r.bottom+window.scrollY+4)+'px';m.style.left=Math.max(8,Math.min(r.left+window.scrollX,window.innerWidth-m.offsetWidth-8))+'px';};
document.addEventListener('click',e=>{const m=document.querySelector('.bs-menu');if(!m||e.target.closest('[data-action="bs-opts"]'))return;setTimeout(()=>m.remove(),0);},true);
window.addEventListener('scroll',()=>{const m=document.querySelector('.bs-menu');if(m)m.remove();},true);
ACT['sz-dbk-del']=b=>{const x=((S.fin&&S.fin.invoices)||[]).find(i=>i.id===b.dataset.id);if(!x)return;if(num(x.invPaid)>0||invPaidOk(x)){toast('Kifizetett díjbekérőt nem lehet sztornózni.',true);return;}
  openModal('↩️ '+x.no+' sztornózása',`<p style="margin:0 0 10px">A <b>${esc(x.no)}</b> díjbekérő (${esc(x.buyer||'')}, bruttó ${ftFmt(num(x.invGross))}) ${x.manual?'kikerül az appból':'törlődik a számlázz.hu-ból, és kikerül az appból'}. A díjbekérő nem számla, ezért nem készül róla sztornó számla, és a NAV-hoz sem megy semmi.</p><p class="hint" style="margin:0">Utána a projekthez újra kiállíthatsz díjbekérőt. Ha az ügyfél már megkapta, érdemes neki szólni, hogy ne fizesse ki.</p>`,
    {submitLabel:'Sztornózás',submit:async()=>{const btn=document.querySelector('#mform button[type=submit]');if(btn){btn.disabled=true;btn.textContent='Sztornózás…';}
      try{const d=await call('szDbkDelete',{id:x.id});closeModal();finApply(d);toast('↩️ Díjbekérő sztornózva: '+x.no);}catch(e){handleErr(e);if(btn){btn.disabled=false;btn.textContent='Sztornózás';}}}});};
ACT['sz-storno']=b=>{const x=((S.fin&&S.fin.invoices)||[]).find(i=>i.id===b.dataset.id);if(!x)return;if(num(x.invPaid)>0||invPaidOk(x)){toast('Kifizetett számlát nem lehet sztornózni.',true);return;}
  openModal('↩️ '+x.no+' sztornózása',`<p style="margin:0 0 10px">A számlázz.hu sztornó számlát állít ki a <b>${esc(x.no)}</b> számláról (${esc(x.buyer||'')}, bruttó ${ftFmt(num(x.invGross))}). Ez a NAV-hoz is bekerül, és nem vonható vissza.</p>
    <div class="rolepick" style="flex-direction:column;align-items:flex-start;gap:8px"><label><input type="radio" name="stm" value="only" checked> <b>Csak sztornózom</b> <span class="muted">– a projekt újra számlázhatóvá válik</span></label><label><input type="radio" name="stm" value="new"> <b>Sztornózom, és újat állítok ki</b></label></div>
    <div class="field" style="margin-top:12px"><label class="toggle"><input type="checkbox" name="stMail" value="1" checked><span class="tl">📧 A sztornó számlát e-mailben elküldöm a vevőnek</span></label><input class="inp" name="stTo" value="${esc(((S.clients||[]).find(c=>c.name===x.buyer)||{}).billEmail||'')}" placeholder="vevő e-mail-címe(i), vesszővel" style="margin-top:6px"></div>`,
    {submitLabel:'Sztornózás',submit:async fd=>{const mode=fd.get('stm');const btn=document.querySelector('#mform button[type=submit]');if(btn){btn.disabled=true;btn.textContent='Sztornózás…';}
      try{const d=await call('szStorno',{id:x.id,email:fd.get('stMail')?String(fd.get('stTo')||''):''});closeModal();finApply(d);toast(`Sztornózva: ${x.no} → sztornó számla: ${d.stornoNo}`);
        if(mode==='new'&&x.projectId){let items=[];try{items=JSON.parse(x.items||'[]');}catch(e){}const ids=invPids(x);
          szInvoiceModal('project',x.projectId,{type:x.kind==='vegszamla'?'vegszamla':x.kind==='eloleg'?'eloleg':'szamla',projectIds:ids.filter(id=>id!==x.projectId),tigId:x.tigId||'',items:items.map(it=>({name:it.name,qty:it.qty,unit:it.unit,price:it.price,vat:it.vat}))});}
        else if(mode==='new')toast('Az új számlát a bevételi sornál állítsd ki.',true);}
      catch(e){handleErr(e);if(btn){btn.disabled=false;btn.textContent='Sztornózás';}}}});};

/* Számla nélküli projekt fizetési állapota kézzel – pl. „Beszámítva”: az összegét egy másik projekt számlájából vontuk le */
ACT['fin-pay-pick']=b=>{const p=projById(b.dataset.id);if(!p||!isAdmin())return;const cur=p.payStatus||'';
  const others=(S.projects||[]).filter(x=>x.id!==p.id&&x.status!=='lemondva').sort((a,c)=>String(c.date||'').localeCompare(String(a.date||'')));
  openModal('💳 Fizetési állapot – '+(p.name||'projekt'),`<div class="fields"><div class="field full"><label for="m-payst">Állapot</label><select class="inp" id="m-payst" name="st" data-cmb="Válassz…">${[['','—'],['var','Fizetésre vár'],['teljes','Teljes fizetve'],['beszamitva','Beszámítva (másik projekt számlájából levonva)']].map(([k,l])=>`<option value="${k}"${k===cur?' selected':''}>${esc(l)}</option>`).join('')}</select></div>
    <div class="field full"><label for="m-payoff">Melyik projekt számlájába számítottátok be? <span class="muted">(csak beszámításnál)</span></label><select class="inp" id="m-payoff" name="off" data-cmb="Kezdd el gépelni a projekt nevét…"><option value=""></option>${others.map(x=>`<option value="${esc(x.id)}"${x.id===p.payOffset?' selected':''}>${esc(x.name||'Projekt')}${x.date?' · '+esc(fmtShort(x.date)):''}</option>`).join('')}</select></div></div>`,
    {submitLabel:'Mentés',submit:async fd=>{const st=String(fd.get('st')||''),off=String(fd.get('off')||'');if(st==='beszamitva'&&!off){toast('Válaszd ki, melyik projekt számlájába számítottátok be.',true);return;}
      try{await call('finSetPay',{projectId:p.id,payStatus:st,offsetTo:off});p.payStatus=st;p.payOffset=st==='beszamitva'?off:'';closeModal();render(true);toast('Fizetési állapot: '+(PAY_LABEL[st]||'—'));}catch(e){handleErr(e);}}});};
