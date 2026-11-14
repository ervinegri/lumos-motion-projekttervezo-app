'use strict';
/* ===== Stáb ===== */
const prioNum=c=>9;   // a P1–P3 prioritás megszűnt (Ervin, 2026-11-10): a sorrend a húzással beállított sorrend, majd név
function prioBadge(c){return '';}
/* 3.7. pont: 12 hónapon belül 3 súlyos vagy kritikus hiba → azonnali felmondás joga */
function penStrikes(cid){const from=addDays(todayISO(),-365);let n=0;S.projects.forEach(p=>(p.penalties||[]).forEach(x=>{if(x.crewId===cid&&x.status==='approved'&&(x.kind==='severe'||x.kind==='critical')&&String(x.decidedAt||x.at).slice(0,10)>=from)n++;}));return n;}
function penStrikeNote(cid){   // az elmúlt 12 hónap összes jóváhagyott hibája, kategóriánként; a súlyos/kritikus darabszám a 3.7. pont miatt külön
  const from=addDays(todayISO(),-365),all=[];S.projects.forEach(p=>(p.penalties||[]).forEach(x=>{if(x.crewId===cid&&x.status==='approved'&&String(x.decidedAt||x.at).slice(0,10)>=from)all.push({p,x});}));
  if(!all.length)return '';const n=penStrikes(cid),by={};all.forEach(({x})=>{by[x.kind]=(by[x.kind]||0)+1;});
  const ORD=['critical','severe','unfit','prestige','light','damage'],SH={critical:'kritikus',severe:'súlyos',unfit:'alkalmatlan állapot',prestige:'presztízsveszteség',light:'enyhe',damage:'kártérítés'};
  const parts=ORD.filter(k=>by[k]).map(k=>by[k]+' '+SH[k]);
  const tip=all.sort((a,b)=>String(b.x.at).localeCompare(String(a.x.at))).map(({p,x})=>`${fmtShort(pr(p)?pr(p).start:String(x.at).slice(0,10))} · ${p.name||''} – ${(PEN_KINDS[x.kind]||{}).label||''}${x.kind==='damage'?' '+ftFmt(x.amount):' '+num(x.pct)+'%'}${x.reason?': '+String(x.reason).replace(/\s+/g,' ').slice(0,90):''}`).join('\n');
  return `<p class="pen-strike${n>=3?' bad':''}" data-tip="${esc(tip)}" tabindex="0">⚠️ ${all.length} hiba az elmúlt 12 hónapban: ${parts.join(', ')}${n>=3?' – a szerződés 3.7. pontja szerint (3 súlyos/kritikus hiba) azonnali hatályú felmondásra van jogotok.':''}</p>`;}
/* Értékesítő a stábban: akinek értékesítői fiókja van, vagy csak értékesítői (és ajánlói) szerepe */
const isSalesCrew=c=>(S.salesPeople||[]).some(x=>x.crewId===c.id)||((c.roles||[]).includes('Értékesítő')&&(c.roles||[]).every(r=>r==='Értékesítő'||r==='Ajánlói jutalék'));
/* Munkatársi szerződés (csak az ügyvezető látja – a háttér másnak nem is küldi el) */
const crewDocsOf=cid=>isAdmin()?(S.crewDocs||[]).filter(d=>d.crewId===cid).sort((a,b)=>String(b.signedAt||b.createdAt).localeCompare(String(a.signedAt||a.createdAt))):[];
function crewDocKv(c){if(!isAdmin()||!Array.isArray(S.crewDocs))return '';const L=crewDocsOf(c.id);
  return `<div class="kv"><span>Szerződés</span>${L.length?`<span class="cdoc-links">${L.map(d=>`<button class="cdoc-open" type="button" data-action="crew-doc-open" data-id="${esc(d.id)}" data-tip="${esc(d.fileName||'')}">📄 ${esc(d.title||'Szerződés')}${d.signedAt?` <span class="muted">(${esc(d.signedAt.replace(/-/g,'.'))}.)</span>`:''}</button>`).join('')}</span>`:`<button class="cdoc-open warn-txt" type="button" data-action="edit-crew" data-id="${esc(c.id)}" data-focus="cdoc">nincs feltöltve</button>`}</div>`;}
function crewDocIcon(c){if(!isAdmin())return '';const L=crewDocsOf(c.id);return L.length?`<button class="cdoc-ic" type="button" data-action="crew-doc-open" data-id="${esc(L[0].id)}" data-tip="Szerződés: ${esc(L[0].title||'')}" aria-label="${esc(c.name)} szerződése">📄</button>`:'';}
/* Naponta egyszer, a háttérben: a külsősök egyértelműen aláírt szerződései (fájlnévben „aláírt” + szerződés) bekerülnek a Gmailből */
/* Belépéskor egyszer a háttérben: Sales App szinkron (új megrendelések, értékesítő a csapatban) – ha változott valami, frissül a nézet */
function salesSyncBg(){if(!isAdmin()||S._ssBg)return;S._ssBg=1;setTimeout(async()=>{try{const r=await call('salesSyncNow');if(r&&(r.created||r.updated||r.deals||r.sellers||r.cancelled||r.orderForms||r.proformas))load(true);}catch(e){}},6000);}
function crewDocsAutoBg(){if(!isAdmin()||S._cdAuto)return;S._cdAuto=1;const k='lpm_cdauto',d=todayISO();let last='';try{last=localStorage.getItem(k)||'';}catch(e){}if(last===d)return;
  setTimeout(async()=>{try{const r=await call('crewDocsImport',{strict:true});try{localStorage.setItem(k,d);}catch(e){}const L=r.plan||[];if(r.crewDocs)S.crewDocs=r.crewDocs;
    if(L.length){toast('📥 '+L.length+' aláírt szerződés bekerült a Gmailből: '+L.map(x=>x.crew+' – '+x.title).join(', '));if(!$('modalRoot').innerHTML)render(true);}}catch(e){S._cdAuto=0;}},4000);}
function crewDocSection(c){if(!isAdmin()||!c)return '';const L=crewDocsOf(c.id);
  return `<div class="field full cdoc-sec" id="cdoc"><span class="lbl">📄 Szerződések és dokumentumok <span class="muted" style="font-weight:500">· csak az ügyvezető látja</span></span>
    ${L.length?`<div class="cdoc-list">${L.map(d=>`<div class="cdoc-row"><button class="cdoc-open" type="button" data-action="crew-doc-open" data-id="${esc(d.id)}">📄 <b>${esc(d.title||'Szerződés')}</b></button><span class="muted">${d.signedAt?'aláírva '+esc(d.signedAt.replace(/-/g,'.'))+'.':'feltöltve '+esc(String(d.createdAt||'').slice(0,10).replace(/-/g,'.'))+'.'}${d.note?' · '+esc(d.note):''}</span><button class="x cdoc-ren" type="button" data-action="crew-doc-ren" data-id="${esc(d.id)}" aria-label="Átnevezés" data-tip="Átnevezés">✏️</button><button class="x" type="button" data-action="crew-doc-del" data-id="${esc(d.id)}" aria-label="Dokumentum törlése" data-tip="Törlés">×</button></div>`).join('')}</div>`:'<p class="hint" style="margin:0">Még nincs feltöltött szerződés vagy dokumentum.</p>'}
    <div class="cdoc-add"><input class="inp" id="cdoc-title" placeholder="Megnevezés (nem kötelező – a fájlnévből kitalálom)" maxlength="120"><input class="inp" id="cdoc-date" type="date" aria-label="Aláírás dátuma" title="Aláírás dátuma (nem kötelező)"></div>
    <label class="cdoc-drop" data-id="${esc(c.id)}"><input type="file" id="cdoc-file" data-id="${esc(c.id)}" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" multiple hidden><span class="cdoc-drop-t">📎 <b>Húzd ide a szerződést vagy dokumentumot</b>, vagy kattints a kiválasztáshoz</span><small class="muted" id="cdoc-fn">PDF, Word vagy kép · legfeljebb 10 MB · azonnal feltöltődik</small></label></div>`;}
function viewCrew(){
  const T=todayISO(),f=S.cf,q=f.q.trim().toLowerCase();
  const salesTab=S.tab==='ertekesitok';   // az ügyvezetőnél külön alfül: Stáb (szakemberek) és Értékesítők
  const base=crewSorted().filter(c=>!isAdmin()||(salesTab?isSalesCrew(c):!isSalesCrew(c)));let list=base;
  if(f.role)list=list.filter(c=>(c.roles||[]).includes(f.role)||(c.skills||[]).includes(f.role));
  if(q)list=list.filter(c=>fold([c.name,c.phone,c.email,c.company,(c.roles||[]).join(' '),(c.skills||[]).join(' '),c.note].join(' ')).includes(fold(q)));
  const internal=S.crew.filter(c=>(c.type==='Belsős'||isEmployee(c))).length;
  const nextOf=c=>S.projects.filter(p=>p.status!=='lemondva'&&pr(p)&&pr(p).end>=T&&crewIds(p).has(c.id)).sort(byStart);
  const cardsOf=L=>f.view==='list'?'':L.map(c=>{
    const next=S.projects.filter(p=>p.status!=='lemondva'&&pr(p)&&pr(p).end>=T&&crewIds(p).has(c.id)).sort(byStart);
    const role=p=>p.lead===c.id?'projektvezető':((p.crew||[]).filter(a=>a.crewId===c.id).map(a=>a.role.toLowerCase()).join(', '));
    const sub=[c.type,c.company].filter(Boolean).join(' · ');
    return `<article class="pcard crew-card" data-crew-card="${esc(c.id)}"${ro()?'':' draggable="true" title="Húzd a kártyát a sorrend módosításához"'}>
      <div class="pc-top">${avatar(c)}<div class="pc-id"><div class="pc-name">${esc(c.name)} ${prioBadge(c)}</div>${sub?`<div class="pc-sub">${esc(sub)}</div>`:''}</div>
        <button class="pc-edit w" type="button" data-action="edit-crew" data-id="${esc(c.id)}" aria-label="${esc(c.name)} szerkesztése" title="Szerkesztés">✎</button></div>
      <div class="roles">${(c.roles||[]).map(r=>`<span class="statuspill">${esc(r)}</span>`).join('')||'<span class="muted" style="font-size:13px">Nincs szerep megadva</span>'}</div>
      ${(c.skills||[]).length?`<div class="skills">${c.skills.map(s=>`<span class="skill">${esc(s)}</span>`).join('')}</div>`:''}
      <div>${c.phone?`<div class="kv"><span>Telefon</span><button class="copy" type="button" data-action="copy" data-text="${esc(c.phone)}">${esc(c.phone)}</button></div>`:''}
        ${c.email?`<div class="kv"><span>E-mail</span><button class="copy mail" type="button" data-action="copy" data-text="${esc(c.email)}">${esc(c.email).replace('@','<wbr>@')}</button></div>`:'<div class="kv"><span>E-mail</span><span class="warn-txt">nincs megadva</span></div>'}
        ${crewDocKv(c)}${(()=>{const sp=isAdmin()&&(S.salesPeople||[]).find(x=>x.crewId===c.id);if(!sp)return '';   // értékesítő díjazása (csak az ügyvezető látja)
        return `<div class="kv"><span>Havi fix</span><b class="tnum">${num(sp.salary)?huf(sp.salary):'nincs'}</b></div><div class="kv"><span>Jutalék</span><b>${num(sp.commLow)}% · ${huf(sp.commLimit)} felett ${num(sp.commHigh)}%</b></div>`;})()}</div>
      ${c.note?`<p class="pc-note">${esc(c.note)}</p>`:''}
      ${penStrikeNote(c.id)}
    </article>`;}).join('');
  const rowsOf=L=>f.view!=='list'?'':L.map(c=>{const n=nextOf(c)[0];
    return `<tr><td><div class="nm" style="display:flex;gap:6px;align-items:center">${esc(c.name)} ${prioBadge(c)}${crewDocIcon(c)}</div>${c.company?`<div class="ser">${esc(c.company)}</div>`:''}</td>
      <td>${esc((c.roles||[]).join(', '))||'<span class="muted">—</span>'}${(c.skills||[]).length?`<div class="ser">${esc(c.skills.join(', '))}</div>`:''}</td>
      <td>${esc(c.type||'')}</td>
      <td>${c.phone?`<button class="copy" style="text-align:left;white-space:nowrap" type="button" data-action="copy" data-text="${esc(c.phone)}">${esc(c.phone)}</button>`:''}</td>
      <td>${c.email?`<button class="copy mail" style="text-align:left" type="button" data-action="copy" data-text="${esc(c.email)}">${esc(c.email).replace('@','<wbr>@')}</button>`:'<span class="warn-txt">nincs</span>'}</td>
      <td class="num"><button class="pc-edit w" type="button" data-action="edit-crew" data-id="${esc(c.id)}" aria-label="${esc(c.name)} szerkesztése" title="Szerkesztés">✎</button></td></tr>`;}).join('');
  const pc=n=>base.filter(c=>prioNum(c)===n).length;
  return `<div class="page-head"><div class="grow"><h2>${salesTab?'Értékesítők':'Stáb'}</h2><p class="sub">${salesTab?list.length+' értékesítő · fiókot és jutalékot a Beállításokban adhatsz meg':S.crew.length+' munkatárs'+(S.crew.length?` · ${internal} belsős`:'')}</p></div>${ro()?'':undoBar()}
      ${!salesTab&&isAdmin()&&Array.isArray(S.crewDocs)?`<button class="btn outline w" type="button" data-action="crew-docs-gmail" title="A külsősök aláírt szerződéseit megkeresi a leveleid között, és feltölti őket">📥 Szerződések a Gmailből</button>`:''}
      <button class="btn primary w" type="button" data-action="new-crew">${salesTab?'+ Új értékesítő':'+ Új munkatárs'}</button></div>
    <div class="toolbar"><input class="inp search" id="q-crew" type="search" placeholder="Keresés név, szerep, vállalkozás szerint" value="${esc(f.q)}" aria-label="Stáb keresése">
      <select class="inp" id="crew-role-filter" style="width:auto" aria-label="Szűrés szerep szerint" data-cmb="Szerep szerint…"><option value="" data-keep="1">Minden szerep</option><optgroup label="Szerep">${CREW_ROLES.map(r=>`<option${r===f.role?' selected':''}>${esc(r)}</option>`).join('')}</optgroup><optgroup label="Részletek">${CREW_SKILLS.map(r=>`<option${r===f.role?' selected':''}>${esc(r)}</option>`).join('')}</optgroup></select>
      <div class="seg" role="group" aria-label="Nézet"><button type="button" data-action="crew-view" data-v="cards" aria-pressed="${f.view!=='list'}" title="Kártyák">▦ Kártyák</button><button type="button" data-action="crew-view" data-v="list" aria-pressed="${f.view==='list'}" title="Lista">☰ Lista</button></div>
</div>
    ${(()=>{const block=L=>{const rows=rowsOf(L),cards=cardsOf(L);return rows?`<div class="tbl-wrap"><table class="crew-tbl"><thead><tr><th>Név</th><th>Szerepek</th><th>Jogviszony</th><th>Telefon</th><th>E-mail</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:cards?`<div class="cards">${cards}</div>`:'';};
      if(!list.length)return `<div class="panel">${empty(S.crew.length?'Nincs a szűrésnek megfelelő munkatárs.':'Még nincs munkatárs. Vedd fel a stábot az „Új munkatárs” gombbal.')}</div>`;
      return block(list);})()}`;
}

/* ===== Naptár ===== */
const F_MONTH=new Intl.DateTimeFormat('hu-HU',{year:'numeric',month:'long',timeZone:'UTC'});
const WD_SHORT=['H','K','Sze','Cs','P','Szo','V'];
function calRange(month){const first=month+'-01';const wd=(toDate(first).getUTCDay()+6)%7;const start=addDays(first,-wd);return {first,start,end:addDays(start,41)};}
/* Naptár gyorsítás: a hónap eseményeit a böngésző is megjegyzi (azonnal megjelenik), a háttérben frissül;
   a szomszédos hónapokat előre betöltjük. */
const CAL_LS='lpm_cal_v1_';
function calCacheGet(m){try{const c=JSON.parse(localStorage.getItem(CAL_LS+m)||'null');if(c&&c.tk===String(TOKEN).slice(-16)&&Array.isArray(c.ev))return c;}catch(e){}return null;}
function calCacheSet(m,ev){try{localStorage.setItem(CAL_LS+m,JSON.stringify({tk:String(TOKEN).slice(-16),at:Date.now(),ev}));}catch(e){}}
function calCacheClear(){try{Object.keys(localStorage).filter(k=>k.indexOf(CAL_LS)===0).forEach(k=>localStorage.removeItem(k));}catch(e){}}
const shiftMonth=(m,d)=>{const [y,mo]=m.split('-').map(Number);const t=new Date(Date.UTC(y,mo-1+d,1));return t.toISOString().slice(0,7);};
const TL_DAY_WIDTH=44;
// A következő hónap eleje széles ablakban is elérhető legyen a rács végéről.
const tlMonthsAhead=()=>Math.max(1,Math.ceil(document.documentElement.clientWidth/(28*TL_DAY_WIDTH)));
window.addEventListener('resize',()=>{
  const w=document.querySelector('.tl-wrap');
  if(w&&Number(w.dataset.ahead)!==tlMonthsAhead())render(true);
});
function loadVagoi(month){if(ro())return;const k='v:'+month;S.cal.at=S.cal.at||{};if(S.cal.loading[k])return;if(S.cal.ev2[month]&&Date.now()-(S.cal.at[k]||0)<60000)return;
  if(S.cal.err[k]&&Date.now()-((S.cal.errAt||{})[k]||0)<60000)return;const r=calRange(month);S.cal.loading[k]=true;
  call('calendarEvents',{from:r.start,to:r.end,cal:'vagoi',fresh:!!(S.cal.fresh||{})[k]}).then(ev=>{S.cal.ev2[month]=ev||[];S.cal.at[k]=Date.now();if(S.cal.fresh)delete S.cal.fresh[k];delete S.cal.err[k];})
    .catch(e=>{S.cal.err[k]=errText(e);(S.cal.errAt=S.cal.errAt||{})[k]=Date.now();})
    .finally(()=>{delete S.cal.loading[k];if(S.tab==='naptar'&&!S.projectId&&!$('modalRoot').innerHTML)render(true);});}
function loadCalEvents(month){if(ro())return;loadVagoi(month);   // a szakember csak a saját projektjeit látja (a Google Naptárhoz nincs hozzáférése)
  const r=calRange(month),key=month;S.cal.at=S.cal.at||{};
  if(S.cal.loading[key])return;
  if(!S.cal.events[key]){const c=calCacheGet(month);if(c){S.cal.events[key]=c.ev;S.cal.at[key]=0;}}
  if(S.cal.events[key]&&Date.now()-(S.cal.at[key]||0)<60000)return;
  if(S.cal.err[key]&&Date.now()-(S.cal.errAt&&S.cal.errAt[key]||0)<60000)return;   // hiba után ne kérdezzük újra azonnal (különben végtelen újrarajzolás)
  S.cal.loading[key]=true;
  call('calendarEvents',{from:r.start,to:r.end,fresh:!!(S.cal.fresh||{})[key]}).then(ev=>{S.cal.events[key]=ev||[];S.cal.at[key]=Date.now();if(S.cal.fresh)delete S.cal.fresh[key];calCacheSet(month,S.cal.events[key]);delete S.cal.err[key];if(S.cal.errAt)delete S.cal.errAt[key];})
    .catch(e=>{S.cal.err[key]=errText(e);(S.cal.errAt=S.cal.errAt||{})[key]=Date.now();if(errText(e).indexOf('AUTH_REQUIRED')>=0)handleErr(e);})
    .finally(()=>{delete S.cal.loading[key];if(S.tab==='naptar'&&S.cal.month===month)render(true);});
}
/* Friss lekérés a Google Naptárból (a szerver 5 perces gyorsítótára nélkül): Frissítés gombra, és amikor visszatérsz az app fülére
   – így a Google Naptárban törölt / módosított esemény azonnal eltűnik / frissül itt is. */
function calForceFresh(){const m=S.cal.month;S.cal.at={};S.cal.fresh={};[m,'v:'+m].forEach(k=>{S.cal.fresh[k]=1;});}
/* ha az app (pl. mobilon a háttérben) átaludt egy napot: a naptár a mai napra ugrik */
let CAL_DAY=todayISO();
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible')return;const t=todayISO();if(t===CAL_DAY)return;const was=CAL_DAY;CAL_DAY=t;if(S.cal&&(!S.cal.month||S.cal.month===was.slice(0,7))){S.cal.month=t.slice(0,7);if(!S.cal.sel||S.cal.sel===was)S.cal.sel=t;}if(S.cal)S.cal.tlPos=null;if(S.tab==='naptar')render(true);});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible'||S.tab!=='naptar'||!TOKEN)return;calForceFresh();loadCalEvents(S.cal.month);});
function prefetchCal(m,ahead){if(ro()||!TOKEN)return;loadCalEvents(m);setTimeout(()=>{
  if(!TOKEN)return;
  loadCalEvents(shiftMonth(m,-1));
  for(let i=1;i<=ahead;i++)loadCalEvents(shiftMonth(m,i));
},800);}
/* Szakember: vágóként (is) dolgozik? – akkor a naptárban választhat a terepi és a vágói munkái között */
const crewCuts=(p,me)=>!!me&&(p.crew||[]).some(a=>a.crewId===me&&a.role==='Vágó');
const crewOnSite=(p,me)=>!!me&&!editOnly(p)&&(p.lead===me||(p.crew||[]).some(a=>a.crewId===me&&(a.role!=='Vágó'||onsiteCut(p,me))));
function crewIsCutter(){const me=(S.me.viewAs&&S.me.viewAs.crewId)||S.me.crewId,c=crewById(me);return !!me&&((c&&(c.roles||[]).includes('Vágó'))||S.projects.some(p=>crewCuts(p,me)));}
function calCutDue(){try{return localStorage.getItem('lpm_cal_cutdue')!=='0';}catch(e){return true;}}
function cutOkMine(p,me){const own=(p.videos||[]).filter(v=>vidOwner(p,v)===me);return own.length>0&&own.every(v=>v.st==='jovahagyva');}   // a vágó minden videóját jóváhagyták: nála már nem kell látszania
function calKind(){return ro()&&crewIsCutter()?(S.cal.kind||''):'';}   // szakember (vágó is): '' mind, 'site' terepi, 'cut' vágói munkák
function calItems(month){
  const r=calRange(month),items=[];
  const linked=new Set(S.projects.map(p=>p.calEventId).filter(Boolean));
  const me=ro()?((S.me.viewAs&&S.me.viewAs.crewId)||S.me.crewId):'',cutter=ro()&&crewIsCutter()&&calKind()!=='site',onlyCut=calKind()==='cut';
  S.projects.forEach(p=>{const q=pr(p);let pre='';
    if(cutter){const cut=crewCuts(p,me)&&!cutOkMine(p,me);
      if(cut){const due=dueDate(p),q0=pr(p);let st=q0?addDays(q0.end,1):due;if(due&&st>due)st=due;   // a vágás a projekt utáni naptól a leadás napjáig tart
        if(due&&st<=r.end&&due>=r.start)items.push({kind:'p',cut:true,id:p.id,title:'✂️ '+(p.name||'Névtelen projekt'),date:st,endDate:due,time:'',status:p.status||'tervezes',venue:''});}   // a vágói leadási határidő külön, lilával
      if(editOnly(p))return;}
    if(!ro()&&!editOnly(p)&&calCutDue()&&p.status!=='lemondva'&&(!S.cal.cutter||crewCuts(p,S.cal.cutter))){const due=dueDate(p);   // vezetői havi naptár: a vágók leadási határideje (pipával ki-be kapcsolható)
      if(due&&due>=r.start&&due<=r.end)items.push({kind:'p',cut:true,id:p.id,title:'✂️ '+(p.name||'Névtelen projekt'),date:due,endDate:due,time:'',status:p.status||'tervezes',venue:''});}
    if(editOnly(p)){if(ro()||(S.cal.mode!=='ido'&&!calCutDue())||(S.cal.cutter&&!crewCuts(p,S.cal.cutter))||!q||q.end<r.start||q.start>r.end)return;pre='✂️ ';}   // a „Vágói határidők” pipa ezt is elrejti   // videóvágás: nem terepi munka, lilán a leadás napján
    if(onlyCut)return;   // csak a vágói munkák
    if(calKind()==='site'&&!crewOnSite(p,me))return;   // terepi szűrő: csak a saját helyszíni munkák
    if(!q||q.end<r.start||q.start>r.end)return;   // terepen: a projekt a saját napjain, zölden (ahogy a többieknél)
    items.push({kind:'p',cut:pre!=='',id:p.id,title:pre+(p.name||'Névtelen projekt'),date:q.start,endDate:q.end,time:p.startTime||'',status:p.status||'tervezes',venue:p.venue||''});});
  const cutC=!ro()&&S.cal.cutter?crewById(S.cal.cutter):null,cutMail=cutC?String(cutC.email||'').toLowerCase():'',cutNm=cutC?fold(cutC.name):'';
  const vOk=e=>!cutC||(cutMail&&(e.guests||[]).includes(cutMail))||(!!cutNm&&fold((e.title||'')+' '+(e.description||'')).includes(cutNm));   // kiválasztott vágó: csak az ő vágói bejegyzései
  const myMail=me?String((crewById(me)||{}).email||'').toLowerCase():'';   /* szakember nézetben csak a saját vágói bejegyzései (ahol ő a vendég) */
  ((ro()&&calKind()!=='site')||(!ro()&&(S.cal.mode==='ido'||calCutDue()))?(S.cal.ev2[month]||[]):[]).filter(vOk)   /* a vágói naptár bejegyzései is a „Vágói határidők” pipához tartoznak */
    .filter(e=>!ro()||(!!myMail&&(e.guests||[]).includes(myMail))).filter(e=>!(e.projectId&&projById(e.projectId))).forEach(e=>{const dl=S.cal.mode!=='ido';items.push({kind:'v',id:e.id,title:e.title||'(nincs cím)',date:dl?(e.endDate||e.date):e.date,endDate:e.endDate||e.date,time:e.start||'',venue:e.location||'',lp:vLinkProj(e)});});
  if(ro())return items.sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'99').localeCompare(b.time||'99'));
  (S.cal.events[month]||[]).forEach(e=>{if(linked.has(e.id)||(e.projectId&&projById(e.projectId)))return;
    items.push({kind:'g',id:e.id,title:e.title||'(nincs cím)',date:e.date,endDate:e.endDate||e.date,time:e.start||'',venue:e.location||''});});
  return items.sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'99').localeCompare(b.time||'99')||a.title.localeCompare(b.title,'hu'));
}
/* Épp zajló forgatás: ma van, és (ha van megadva) az érkezés és a távozás között vagyunk */
function calLive(p){if(!p||['atadva','lemondva','utomunka','leadva','jovahagyas'].includes(p.status))return false;const r=pr(p),T=todayISO();if(!r||r.start>T||r.end<T)return false;
  const now=new Date().toTimeString().slice(0,5),last=r.end===T&&r.end>r.start,st=String((T>r.start&&p.lastStartTime&&last?p.lastStartTime:p.startTime)||''),en=String((last&&p.lastEndTime)||p.endTime||'');
  return (!/^\d{2}:\d{2}$/.test(st)||now>=st)&&(!/^\d{2}:\d{2}$/.test(en)||now<en);}
function calChip(it,day){
  const cont=it.date<day;
  const dim=it.kind==='p'&&crewDim(projById(it.id)||{});
  const live=it.kind==='p'&&calLive(projById(it.id));
  const drag=!ro()&&(it.kind==='g'||it.kind==='v'||(it.kind==='p'&&it.status!=='atadva'));
  const cls=it.kind==='p'?`cal-chip p st-${esc(it.status)}${dim?' dim':''}${live?' live':''}${it.cut?' cut':''}`:it.kind==='v'?'cal-chip v':'cal-chip g';
  return `<button type="button" class="${cls}${cont?' cont':''}"${drag?` draggable="true" data-drag-day="${day}"`:''} data-action="${it.kind==='p'?'open-project':it.kind==='v'?'cal-vevent':'cal-event'}" data-id="${esc(it.id)}" data-kind="${it.kind}" data-tipid="${esc(it.id)}">${cont?'↳ ':it.time?`<b>${esc(it.time)}</b> `:''}${esc(it.title)}</button>`;
}
/* Idővonal nézet: soronként egy projekt / esemény, oszloponként a hónap napjai, függőleges vonal a mai napon */
/* Az idővonal bal felső sarkában a látható rész hónapja */
function tlCorner(w){const b=w&&w.querySelector('.tl-cm');if(!b)return;const lw=(w.querySelector('.tl-lbl')||{}).offsetWidth||0,n=Number(b.dataset.n),cw=(w.scrollWidth-lw)/n;
  const d=addDays(b.dataset.first,Math.min(n-1,Math.max(0,Math.round(w.scrollLeft/cw)+3)));const t=d.slice(0,4)+'. '+F_MONTH.format(toDate(d)).replace(/^\d{4}\.\s*/,'').toLowerCase();if(b.textContent!==t)b.textContent=t;
  /* csak azok a sorok látszanak, amelyeknek a sávja a látható időszakba esik – így nincs üres sor */
  const v0=Math.floor(w.scrollLeft/cw)+1,v1=Math.ceil((w.scrollLeft+w.clientWidth-lw)/cw);let k=0;
  w.querySelectorAll('.tl-it').forEach(r=>{const on=Number(r.dataset.b)>=v0&&Number(r.dataset.a)<=v1;if(on)k++;r.classList.toggle('tl-out',!on);r.toggleAttribute('aria-hidden',!on);});   // animáltan tűnik el / jön vissza
  const tl0=w.querySelector('.tl.tl-noanim');if(tl0)requestAnimationFrame(()=>requestAnimationFrame(()=>tl0.classList.remove('tl-noanim')));   // első rajzoláskor nincs animáció
  const c=w.querySelector('.tl-cnt');if(c)c.textContent=k+' tétel látszik';
const e=w.querySelector('.tl-none');if(e)e.hidden=k>0;
  /* A hónapválasztó követi a görgetést, az ablak megállás után az új hónap köré rendeződik. */
  const vm=d.slice(0,7),MNf=x=>F_MONTH.format(toDate(x+'-01')).replace(/^\d{4}\.\s*/,'').toLowerCase(),yr=x=>x.slice(0,4)!==vm.slice(0,4)?x.slice(0,4)+'. ':'';
  const cur=document.querySelector('.cm-cur'),sides=document.querySelectorAll('.cm-side');
  if(cur){const tt=vm.slice(0,4)+'. '+MNf(vm);if(cur.textContent!==tt){cur.textContent=tt;if(sides[0])sides[0].textContent=yr(shiftMonth(vm,-1))+MNf(shiftMonth(vm,-1));if(sides[1])sides[1].textContent=yr(shiftMonth(vm,1))+MNf(shiftMonth(vm,1));}}
  clearTimeout(window._tlRc);if(vm!==S.cal.month){const pos=w.scrollLeft/cw,idx=Math.floor(pos);const keep={d:addDays(b.dataset.first,idx),f:pos-idx,t:w.scrollTop};
    window._tlRc=setTimeout(function go(){if(!w.isConnected)return;if(w.classList.contains('panning')){window._tlRc=setTimeout(go,300);return;}S.cal.month=vm;S.cal.tlKeep=keep;S.cal.tlPos=null;render(true);},450);}}
/* Idővonal sávjának felirata: a távozás (végzés) ideje; ha nincs megadva, az érkezésé */
function tlTimes(it,p){const ok=t=>/^\d{2}:\d{2}$/.test(t||'');const en=p?(it.endDate>it.date&&p.lastEndTime?p.lastEndTime:p.endTime):'';return ok(en)?en:(ok(it.time)?it.time:'');}
function calTimeline(m,items0,T,ahead){
  const months=Array.from({length:ahead+2},(_,i)=>shiftMonth(m,i-1));
  const first=months[0]+'-01',last=addDays(shiftMonth(m,ahead+1)+'-01',-1),N=diffDays(first,last)+1,days=[];for(let i=0;i<N;i++)days.push(addDays(first,i));
  const col=d=>diffDays(first,d)+1;
  const items=[],ik=new Set();months.forEach(month=>(month===m?items0:calItems(month)).forEach(it=>{const k=it.kind+':'+it.id+(it.cut?':c':'');if(!ik.has(k)){ik.add(k);items.push(it);}}));
  /* Vágás: a projekt utáni naptól a leadási határidőig lila sáv a projekt sorában; ha a határidő a projekt napjára esik, alatta */
  const me=ro()?((S.me.viewAs&&S.me.viewAs.crewId)||S.me.crewId):'';
  const cutOf=p=>{if(!p||p.status==='lemondva'||calKind()==='site'||(ro()&&!crewCuts(p,me))||(!ro()&&S.cal.cutter&&!crewCuts(p,S.cal.cutter)))return null;const q=pr(p),due=dueDate(p);if(!q||!due)return null;
    if(editOnly(p)){const c0=String(p.createdAt||'').slice(0,10);return {st:validISO(c0)&&c0<due?c0:due,due,same:false};}   // videóvágás: a felvételtől a leadásig
    const st=due>q.end?addDays(q.end,1):due;return {st,due,same:due<=q.end};};
  const rows=items.filter(it=>!it.cut&&it.endDate>=first&&it.date<=last&&!(it.kind==='p'&&it.status==='lemondva')&&!(!ro()&&S.cal.cutter&&it.kind!=='v'&&(it.kind!=='p'||!crewCuts(projById(it.id)||{},S.cal.cutter))));   // a lemondott projekt itt nem látszik; vágó kiválasztásakor csak az ő vágói munkái
  if(calKind()==='site'){for(let i=rows.length-1;i>=0;i--){const it=rows[i];if(it.kind==='v'||(it.kind==='p'&&!crewOnSite(projById(it.id)||{},me)))rows.splice(i,1);}}   // terepi szűrő: csak ahol ő is a helyszínen dolgozik
  const seen=new Set(rows.filter(it=>it.kind==='p').map(it=>it.id));
  S.projects.forEach(p=>{if(seen.has(p.id))return;const c=cutOf(p),q=pr(p);if(!c||c.due<first||c.st>last)return;   // a vágás ide esik, a forgatás korábban volt
    rows.push({kind:'p',id:p.id,title:p.name||'Névtelen projekt',date:q.start,endDate:q.end,time:p.startTime||'',status:p.status||'tervezes',venue:p.venue||'',cutOnly:editOnly(p)||(ro()&&(!crewOnSite(p,me)||calKind()==='cut'))});});
  const vis=it=>{const p=it.kind==='p'?projById(it.id):null,c=p&&cutOf(p);return p&&editOnly(p)&&c?c.st:(c&&c.st<it.date?c.st:it.date);};   // a sorrend a sáv látható kezdete szerint (videóvágásnál a vágás eleje)
  rows.sort((a,b)=>vis(a).localeCompare(vis(b))||(a.time||'99').localeCompare(b.time||'99'));
  /* Jóváhagyásra vár: külön kategória legfelül, lapozástól függetlenül mindig látszik (amíg az ügyfél jóvá nem hagyja) */
  const waitL=S.projects.filter(p=>(p.status==='leadva'||p.status==='jovahagyas')&&cutOf(p)&&!((p.videos||[]).length&&(p.videos||[]).every(v=>v.st==='jovahagyva')))   /* a már mind jóváhagyott projekt nem vár */.sort((a,b)=>String(a.leadvaAt||'').localeCompare(String(b.leadvaAt||'')));
  let wOpen=true;try{wOpen=localStorage.getItem('lpm_tl_wait')!=='0';}catch(e){}
  const waitRows=waitL.length&&(isAdmin()||(S.me&&S.me.role==='editor'))?(()=>{   /* „Jóváhagyásra vár”: egyetlen sor – a cím és mellette a projektek címkéi (nincs külön „Idővonal” sor) */
    const pills=!wOpen?'':waitL.map(p=>{const ld=String(p.leadvaAt||p.deliveredAt||'').slice(0,10),n=validISO(ld)?diffDays(ld,T):null,cu=(p.crew||[]).filter(x=>x.role==='Vágó'&&!(ro()&&x.crewId===me)&&!(!ro()&&S.cal.cutter&&x.crewId===S.cal.cutter)).map(x=>{const c=crewById(x.crewId);return c?huFirst(String(c.name)):'';}).filter(Boolean);
      return `<button type="button" class="tl-pinnote" data-action="${(p.videos||[]).length?'bd-lane':'open-project'}" data-id="${esc(p.id)}"><span class="tl-nm">${esc(p.name||'Névtelen projekt')}</span>${n!=null?(n<=0?'Ma leadva':n+' napja leadva'):'Leadva'}${cu.length?` · ✂️ ${esc(cu.join(', '))}`:''}</button>`;}).join('');
    return `<div class="tl-row tl-sec tl-wsec"><div class="tl-lbl tl-wline"><button type="button" class="tl-wtog" data-action="tl-wait-toggle" aria-expanded="${wOpen}"><b>${wOpen?'▾':'▸'} ⏳ Jóváhagyásra vár</b><small>${waitL.length}${wOpen?'':' · elrejtve'}</small></button>${pills}</div><div class="tl-track"></div></div>`;})():'';
  const wk=d=>{const w=toDate(d).getUTCDay();return w===0||w===6;};
  const MN=d=>F_MONTH.format(toDate(d)).replace(/^\d{4}\.\s*/,'').toLowerCase();
  const head=days.map(d=>`<div class="tl-d${wk(d)?' we':''}${d===T?' today':''}${d.slice(8)==='01'?' mstart':''}${d.slice(0,7)!==m?' oth':''}">${Number(d.slice(8))}${d.slice(8)==='01'?`<small class="tl-dmn">${['jan.','febr.','márc.','ápr.','máj.','jún.','júl.','aug.','szept.','okt.','nov.','dec.'][+d.slice(5,7)-1]}</small>`:`<small>${esc(WD_SHORT[(toDate(d).getUTCDay()+6)%7])}</small>`}</div>`).join('');   // a hónap neve az 1-jén, a napok sorában (nincs külön hónapsor)
  const bands=months.map(x=>{const a=col(x+'-01'),b=col(addDays(shiftMonth(x,1)+'-01',-1));return `<div class="tl-mband${x===m?' cur':''}" style="grid-column:${a} / ${b+1}"><span>${esc((x.slice(0,4)!==T.slice(0,4)?x.slice(0,4)+'. ':'')+MN(x+'-01'))}</span></div>`;}).join('');   // a hónap neve a látható rész bal szélén marad
  const bg=days.map(d=>`<i class="${wk(d)?'we':''}${d.slice(8)==='01'?' mstart':''}"></i>`).join('');
  const body=rows.map(it=>{const a=it.date<first?first:it.date,b=it.endDate>last?last:it.endDate,c0=col(a),c1=col(b);
    const p=it.kind==='p'?projById(it.id):null,sub=p?[p.client,p.venue].filter(Boolean).join(' · '):(it.venue||'');
    const dim=p&&crewDim(p),live=p&&calLive(p);
    const cls=it.kind==='p'?`cal-chip p st-${esc(it.status)}${dim?' dim':''}${live?' live':''}${it.cut?' cut':''}`:it.kind==='v'?'cal-chip v':'cal-chip g';
    const act=it.kind==='p'?((p&&(p.videos||[]).length)?'bd-lane':'open-project'):it.kind==='v'?'cal-vevent':'cal-event';
    const showBar=it.date<=last&&it.endDate>=first&&!it.cutOnly&&!(p&&editOnly(p));
    const pOk=!!(p&&['leadva','jovahagyas','atadva'].includes(p.status)&&p.status!=='atadva'&&(v=>v&&v.tot&&v.ok===v.tot)(vidProg(p)));   // minden videó jóváhagyva: a forgatási sáv is zöld
    const cc0=p&&cutOf(p),join=!!(showBar&&cc0&&!cc0.same&&cc0.st>=first&&cc0.st<=last&&it.endDate>=first&&it.endDate<last);   // a forgatás vége és a vágás kezdete egybeolvad
    const FROM=live?'#d93025':dim?'#c2c3c6':'var(--cal-p)';   // az új designban minden forgatási sáv pára-kék (élő: piros, halvány: szürke) – az átmenet ebből indul   // az átmenet a forgatási sáv tényleges színéből indul (élő: piros, lezajlott/halvány: szürke)
    /* ugyanazon a napon forgatás + vágás: egy sáv, ferdén kettéosztva (bal: forgatás, jobb: vágás) */
    const split=showBar&&cc0&&cc0.same&&c0===c1&&cc0.st>=first&&cc0.st<=last?(['leadva','jovahagyas','atadva'].includes(p.status)?'color-mix(in srgb,var(--violet,#7e57c2) 62%,#fff)':!editOnly(p)&&pr(p)&&pr(p).end>=T?'color-mix(in srgb,var(--violet,#7e57c2) 38%,#fff)':'var(--violet,#7e57c2)'):'';
    const cc=cc0,spanA=Math.min(c0,cc?col(cc.st<first?first:cc.st):c0),spanB=Math.max(c1,cc?col(cc.due>last?last:cc.due):c1);
    return `<div class="tl-row tl-it" data-a="${spanA}" data-b="${spanB}"><button type="button" class="tl-lbl" data-action="${act}" data-id="${esc(it.id)}"><b>${esc(it.title)}</b>${sub?`<small>${esc(sub)}</small>`:''}</button>
      <div class="tl-track" data-first="${first}" data-n="${N}" data-id="${esc(it.id)}"><div class="tl-bg">${bg}</div>${showBar?`<button type="button" class="${cls}${pOk?' p-ok':''} tl-bar${join?' tl-join':''}${split?' tl-split':''}" style="grid-column:${c0} / ${c1+1};grid-row:1${split?';--from:'+FROM+';--cutc:'+split:''}"${!ro()&&(it.kind==='g'||it.kind==='v'||(it.kind==='p'&&it.status!=='atadva'))?' draggable="true"':''} data-action="${act}" data-id="${esc(it.id)}" data-kind="${it.kind}" data-tipid="${esc(it.id)}">${it.date<first?'‹ ':''}<span class="tl-nm">${esc(it.title)}</span>${it.date>=first?esc(tlTimes(it,p)):''}${(()=>{if(it.kind==='p')return it.status==='atadva'&&!cc0?'<span class="tl-ok">✓</span>':'';   /* ha van vágási sáv, a pipa csak azon látszik */const q=it.kind==='v'&&it.lp&&projById(it.lp);return q?(q.status==='atadva'?'<span class="tl-ok">✓</span>':' ⏳'):'';})()}${it.endDate>last?' ›':''}</button>`:''}${(()=>{const c=p&&cutOf(p);if(!c||c.due<first||c.st>last||split)return '';
        const cdone=['leadva','jovahagyas','atadva'].includes(p.status);   // a vágás kész: ✓
        const ld=String(p.leadvaAt||p.deliveredAt||'').slice(0,10),cEnd=cdone&&validISO(ld)&&ld<c.due?(ld<c.st?c.st:ld):c.due;   // leadás után a további napok eltűnnek (a határidő már nem él)
        const a2=c.st<first?first:c.st,b2=cEnd>last?last:cEnd;
        if(cEnd<first)return '';
        const pend=!cdone&&!editOnly(p)&&pr(p)&&pr(p).end>=T;   // még nincs leforgatva: a vágó még nem dolgozhat rajta
        const vp=vidProg(p);
        return `<button type="button" class="cal-chip p cut st-${esc(p.status||'')} tl-bar tl-cut${join?' tl-joined':''}${pend?' cut-pending':''}${cdone?' cut-done':''}${cdone&&vp&&vp.ok===vp.tot?' cut-ok':''}" style="grid-column:${col(a2)} / ${col(b2)+1};grid-row:${c.same?2:1}${join?';--from:'+FROM:''}"${ro()?'':' draggable="true"'} data-kind="cut" data-action="${vp?'bd-lane':'open-project'}" data-id="${esc(p.id)}" data-tip="${esc(p.name||'Névtelen projekt')}\n\n${esc(cutWhat(p))}✂️ Vágási határidő: ${esc(fmtDay(c.due))}${vp?esc(vp.tip)+'\n\nKattints a videók táblájáért':''}${ro()?'':' · húzd el a határidő módosításához'}">${c.st<first?'‹ ':''}${!showBar||c1-c0<2?`<span class="tl-nm">${esc(p.name||'Névtelen projekt')}</span>`:''}${cdone?(p.status==='atadva'||(vp&&vp.ok===vp.tot)?'<span class="tl-ok" title="Jóváhagyva">✓</span>':'⏳'):pend?'':'✂️'}${(()=>{const n=diffDays(c.st>T?c.st:T,c.due)+1;return n>0&&!c.same&&!pend&&!cdone?' '+n+' nap':'';})()}${vp&&!pend&&!(cdone&&vp.ok===vp.tot)?(cdone?` · ✅ ${vp.ok}/${vp.tot}`:` · ${vp.done}/${vp.tot}`):''}${c.due>last?' ›':''}${vp&&!pend?vp.html:''}</button>`;})()}</div></div>`;}).join('');
  const ti=T>=first&&T<=last?col(T):0;
  (window.POST_RENDER=window.POST_RENDER||[]).push(()=>{const w=document.querySelector('.tl-wrap');if(!w)return;const c=S.cal.tlPos;
    if(S.cal.tlKeep){const k=S.cal.tlKeep;S.cal.tlKeep=null;const lw0=(w.querySelector('.tl-lbl')||{}).offsetWidth||0,cw0=(w.scrollWidth-lw0)/N;w.scrollLeft=Math.max(0,(col(k.d)-1+k.f)*cw0);w.scrollTop=k.t||0;S.cal.tlPos={m,x:w.scrollLeft,d:todayISO()};tlCorner(w);return;}   // végtelen görgetés: ugyanott marad a kép
    if(c&&c.m===m&&c.d===T){w.scrollLeft=c.x;if(c.y)w.scrollTop=c.y;tlCorner(w);return;}   // újrarajzoláskor ott marad, ahol voltál
    const lw=(w.querySelector('.tl-lbl')||{}).offsetWidth||0,cw=(w.scrollWidth-lw)/N,isNow=T.slice(0,7)===m,target=isNow?col(T)-1:col(m+'-01')-1;   // a mai nap piros vonala középen
    w.scrollLeft=Math.max(0,isNow?(target+0.5)*cw-(w.clientWidth-lw)/2:target*cw);S.cal.tlPos={m,x:w.scrollLeft,d:todayISO()};tlCorner(w);});
  return `<div class="tl-wrap" data-ahead="${ahead}"><div class="tl tl-noanim" style="--n:${N};--dw:${TL_DAY_WIDTH}px">
    <div class="tl-row tl-head"><div class="tl-lbl tl-corner"><b class="tl-cm" data-first="${first}" data-n="${N}"></b><small><span class="tl-cnt">${rows.length} tétel</span> · húzd oldalra ↔</small></div><div class="tl-track tl-htrack">${bands}${head}</div></div>
    ${waitRows}${body}<div class="tl-empty tl-none"${rows.length?' hidden':''}>${empty('Ebben az időszakban nincs esemény – húzd oldalra az idővonalat.')}</div><div class="tl-row tl-fill" aria-hidden="true"><div class="tl-lbl"></div><div class="tl-track"><div class="tl-bg">${bg}</div></div></div>
    ${ti?`<div class="tl-now" style="--i:${ti}" title="Ma"></div>`:''}</div></div>`;
}
/* Kézzel felvett vágói naptár-esemény (nincs projekt-azonosítója): a cím első szava és a határidő alapján megkeressük a projektjét,
   hogy a sávon látszódjon, ha a videók jóváhagyásra várnak (⏳) vagy már átadva (✓) */
function vLinkProj(e){const w=fold(String(e.title||'').trim().split(/\s+/)[0]||'');if(w.length<3)return '';const end=e.endDate||e.date;
  const c=S.projects.filter(p=>['leadva','jovahagyas','atadva'].includes(p.status)&&fold(String(p.name||'').trim().split(/\s+/)[0]||'')===w).filter(p=>{const d=dueDate(p);return !d||!end||Math.abs(diffDays(d,end))<=21;});
  return c.length===1?c[0].id:'';}
function viewCalendar(){
  const m=S.cal.month,r=calRange(m),T=todayISO();
  const ahead=S.cal.mode==='ido'?tlMonthsAhead():1;
  prefetchCal(m,ahead);
  const items=calItems(m),loading=!!S.cal.loading[m]&&!S.cal.events[m],err=S.cal.err[m];
  const days=[];for(let i=0;i<42;i++)days.push(addDays(r.start,i));
  const onDay=d=>items.filter(it=>it.date<=d&&it.endDate>=d);
  const grid=days.map(d=>{const its=onDay(d),out=d.slice(0,7)!==m;
    return `<div class="cal-day${out?' out':''}${d===T?' today':''}${S.cal.sel===d?' sel':''}${S.cal.focus&&d>=S.cal.focus.start&&d<=S.cal.focus.end&&!out?' focus':''}" data-day="${d}"><div class="cal-dh"><span class="cal-dn">${Number(d.slice(8))}</span>${ro()?'':`<button type="button" class="cal-add" data-action="cal-new" data-d="${d}" aria-label="Új bejegyzés: ${esc(d)}" title="Új bejegyzés erre a napra">+</button>`}</div>${its.slice(0,4).map(it=>calChip(it,d)).join('')}${its.length>4?`<button type="button" class="cal-more" data-action="cal-day" data-d="${d}">+${its.length-4} további</button>`:''}</div>`;}).join('');
  const selD=S.cal.sel&&S.cal.sel.slice(0,7)===m?S.cal.sel:(T.slice(0,7)===m?T:m+'-01');   // mobilon (havi rács alatt) a kiválasztott nap eseményei látszanak
  const agenda=days.filter(d=>d.slice(0,7)===m).map(d=>{const its=onDay(d);if(!its.length&&d!==selD)return '';
    return `<div class="ag-day${d===T?' today':''}${d===selD?' on':''}${its.length?'':' ag-none'}" data-agd="${d}"><div class="ag-date">${esc(F_FULL.format(toDate(d)).replace(/^\d{4}\. /,''))}</div>${its.length?its.map(it=>calChip(it,d)).join(''):`<p class="hint ag-nohint">Ezen a napon nincs esemény.</p>`}${ro()?'':`<button type="button" class="btn outline small ag-new" data-action="cal-new" data-d="${d}">＋ Új projekt erre a napra</button>`}</div>`;}).join('');
  const nP=items.filter(i=>i.kind==='p'&&i.date.slice(0,7)<=m&&i.endDate.slice(0,7)>=m).length,nG=items.filter(i=>i.kind==='g'&&i.date.slice(0,7)<=m&&i.endDate.slice(0,7)>=m).length;
  const readOnly=ro(),cutters=readOnly?[]:S.crew.filter(c=>(c.roles||[]).includes('Vágó')).sort((a,b)=>a.name.localeCompare(b.name,'hu'));
  const cutterError=readOnly?'':S.cal.err['v:'+m];
  return `<div class="page-head cal-toolbar">${(()=>{const mn=x=>F_MONTH.format(toDate(x+'-01')).replace(/^\d{4}\.\s*/,'').toLowerCase(),pm=shiftMonth(m,-1),nm=shiftMonth(m,1),yr=(x)=>x.slice(0,4)!==m.slice(0,4)?x.slice(0,4)+'. ':'';
      return `<div class="cal-mnav" role="group" aria-label="Hónap választása"><span class="cm-tools"><div class="seg" role="group" aria-label="Nézet"><button type="button" data-action="cal-mode" data-v="ido" aria-pressed="${S.cal.mode==='ido'}" title="Idővonal">☰<span class="cm-lbl"> Idővonal</span></button><button type="button" data-action="cal-mode" data-v="honap" aria-pressed="${S.cal.mode!=='ido'}" title="Havi nézet">▦<span class="cm-lbl"> Havi</span></button></div><button class="btn outline cm-today" type="button" data-action="cal-nav" data-d="0" title="Ugrás a mai napra">Ma</button></span><button class="btn outline cm-arr" type="button" data-action="cal-nav" data-d="-1" aria-label="Előző hónap">‹</button><button class="btn outline cm-side" type="button" data-action="cal-nav" data-d="-1">${esc(yr(pm)+mn(pm))}</button><h2 class="cm-cur-h"><button type="button" class="cm-cur" data-action="cal-first" title="${S.cal.mode==='ido'?'Ugrás a hónap első napjára':'Ugrás a mai hónapra'}">${esc(m.slice(0,4)+'. '+mn(m))}</button></h2><button class="btn outline cm-side" type="button" data-action="cal-nav" data-d="1">${esc(yr(nm)+mn(nm))}</button><button class="btn outline cm-arr" type="button" data-action="cal-nav" data-d="1" aria-label="Következő hónap">›</button></div>`;})()}
      ${readOnly&&crewIsCutter()?`<div class="seg cal-kind" role="group" aria-label="Munkák szűrése">${[['','Minden munka'],['site','📍 Helyszíni'],['cut','✂️ Utómunka']].map(([k,l])=>`<button type="button" data-action="cal-kind" data-v="${k}" aria-pressed="${calKind()===k}">${l}</button>`).join('')}</div>`:''}
      ${!readOnly&&S.cal.mode!=='ido'?`<label class="cal-tog"><input type="checkbox" id="cal-cutdue"${calCutDue()?' checked':''}> ✂️ Vágói határidők</label>`:''}
      ${cutters.length?`<span class="cal-cutsel"><select class="inp" id="cal-cutter" data-cmb="Vágó kiválasztása…" data-cmb-hover="1" aria-label="Melyik vágó munkáit mutassa"><option value="__all"${S.cal.cutter?'':' selected'}>✂️ Minden vágó</option>${cutters.map(c=>`<option value="${esc(c.id)}"${S.cal.cutter===c.id?' selected':''}>${esc(c.name)}</option>`).join('')}</select></span>`:''}
      ${readOnly?'':`<div class="btns"><button class="btn primary small" type="button" data-action="cal-new">+<span class="cm-lbl"> Új projekt</span></button>
        <a class="btn ghost small" href="https://calendar.google.com/calendar/u/0/r/month/${r.first.replace(/-/g,'/')}" target="_blank" rel="noopener" title="Google Naptár">Google<span class="cm-lbl"> Naptár</span> ↗</a></div>`}</div>
    ${cutterError?`<div class="bad-txt">A Vágói naptár most nem érhető el: ${esc(cutterError)}</div>`:''}
    ${err&&!ro()?`<div class="banner"><p>A Google Naptár most nem érhető el: ${esc(err)}</p><button class="btn outline small" type="button" data-action="cal-retry">Újra</button></div>`:''}
    ${S.cal.mode==='ido'?calTimeline(m,items,T,ahead):`<div class="cal-wrap"><div class="cal-grid">${WD_SHORT.map(w=>`<div class="cal-wd">${w}</div>`).join('')}${grid}</div></div>
    <div class="cal-agenda">${agenda||empty('Ebben a hónapban nincs esemény.')}</div>`}`;
}

/* ===== Leltár ===== */
function viewInventory(){
  const T=todayISO(),f=S.inf,q=f.q.trim().toLowerCase();
  let list=S.inventory.slice();
  if(f.cat)list=list.filter(i=>(i.category||'Egyéb')===f.cat);
  if(f.cond)list=list.filter(i=>(i.condition||'ok')===f.cond);
  if(q)list=list.filter(i=>fold([i.name,i.serial,i.category,i.note,i.location].join(' ')).includes(fold(q)));
  const totalQty=S.inventory.reduce((s,i)=>s+num(i.qty),0);
  const value=S.inventory.reduce((s,i)=>s+num(i.value)*num(i.qty),0);
  const broken=S.inventory.filter(i=>i.condition==='javitas'||i.condition==='szerviz').length;
  const rows=INV_CATS.map(cat=>{const items=list.filter(i=>(i.category||'Egyéb')===cat).sort((a,b)=>a.name.localeCompare(b.name,'hu'));if(!items.length)return '';
    return `<tr class="grp"><td colspan="6">${esc(cat)} · ${items.reduce((s,i)=>s+num(i.qty),0)} db</td></tr>`+items.map(i=>{
      const cond=i.condition||'ok';
      const condCls=cond==='ok'?'p-ok':cond==='selejt'?'':cond==='szerviz'?'p-bad':'p-warn';
      return `<tr><td><div class="nm">${esc(i.name)}${invFmt(i)?` <span class="fmt-tag fmt-${invFmt(i)}">${FMT_LBL[invFmt(i)]}</span>`:''}</div>${i.note?`<div class="ser">${esc(i.note)}</div>`:''}</td>
        <td class="num">${num(i.qty)}</td>
        <td><span class="statuspill ${condCls}">${esc(CONDITIONS[cond]||cond)}</span></td>
        <td>${i.location?esc(i.location):'<span class="muted">—</span>'}</td>
        <td><span class="ser">${esc(i.serial||'')}</span></td>
        <td class="num"><button class="btn ghost small w" type="button" data-action="edit-item" data-id="${esc(i.id)}">Szerkesztés</button></td></tr>`;}).join('');}).join('');
  return `<div class="page-head inv-head"><div class="grow"><h2>Leltár</h2><p class="sub">${S.inventory.length} tétel · ${totalQty} db${value&&isAdmin()?` · bruttó nyilvántartási érték ${huf(value)}`:''}${broken?` · <span class="warn-txt">${broken} javításra vár / szervizben</span>`:''}</p></div>${ro()?'':undoBar()}
      <button class="btn primary w" type="button" data-action="new-item">+ Új<span class="mlg"> eszköz</span></button></div>
    <div class="toolbar inv-tb"><input class="inp search" id="q-inv" type="search" placeholder="Keresés név, hely vagy sorozatszám szerint" value="${esc(f.q)}" aria-label="Leltár keresése">
      <select class="inp" id="inv-cat" data-cmb="Minden kategória" aria-label="Kategória"><option value="">Minden kategória</option>${INV_CATS.map(c=>`<option${c===f.cat?' selected':''}>${esc(c)}</option>`).join('')}</select>
      <select class="inp" id="inv-cond" data-cmb="Minden állapot" aria-label="Állapot"><option value="">Minden állapot</option>${Object.entries(CONDITIONS).map(([k,v])=>`<option value="${k}"${k===f.cond?' selected':''}>${v}</option>`).join('')}</select></div>
    ${rows?`<div class="tbl-wrap inv-wrap"><table><thead><tr><th>Eszköz</th><th class="num">Db</th><th>Állapot</th><th>Tárolási hely</th><th>Azonosító</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:`<div class="panel">${empty(S.inventory.length?'Nincs a szűrésnek megfelelő eszköz.':'Még üres a leltár. Vedd fel az eszközöket az „Új eszköz” gombbal.')}</div>`}`;
}

/* ===== Ügyfelek ===== */
function viewClients(){
  const q=S.clf.q.trim().toLowerCase(),T=todayISO();
  let list=knownClients('');
  if(q)list=list.filter(c=>fold([c.company,c.tax,c.address,c.name,c.email,c.phone].join(' ')).includes(fold(q)));
  const projOf=c=>S.projects.filter(p=>String(p.client||'').trim().toLowerCase()===c.company.toLowerCase()).sort((a,b)=>byStart(b,a));
  const adm=isAdmin()&&S.capabilities&&S.capabilities.finance;if(adm&&!S.fin&&!S.finErr)setTimeout(()=>finLoad().then(()=>{if(S.tab==='ugyfelek')render(true);}),0);
  const rows=list.map(c=>{const ps=projOf(c),next=ps.filter(p=>p.status!=='lemondva'&&pr(p)&&pr(p).end>=T).sort(byStart)[0],last=next||ps[0];
    return `<tr class="cl-row" data-action="edit-client" data-name="${esc(c.company)}" title="Ügyfél adatai"><td class="cl-main"><button class="linkbtn nm cl-name" type="button" data-action="edit-client" data-name="${esc(c.company)}">${esc(c.company)}</button>${c.address?`<div class="ser">${esc(c.address)}</div>`:''}</td>
      <td class="cl-tax"><span class="ser">${esc(c.tax||'')}</span></td>
      <td class="cl-ct">${c.name?esc(c.name):'<span class="muted">—</span>'}</td>
      <td class="cl-ph">${c.phone?`<a href="tel:${esc(c.phone.replace(/\s/g,''))}">${esc(c.phone)}</a>`:'<span class="muted">—</span>'}</td>
      <td class="cl-em">${c.email?`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`:'<span class="muted">—</span>'}</td>
      ${adm?`<td class="cl-ctrc">${clContract(c,ps)}</td>`:''}</tr>`;}).join('');
  const all=knownClients('').length;
  return `<div class="page-head cl-head"><div class="grow"><h2>Ügyfelek</h2><p class="sub">${all} ügyfél${adm&&S._clDocsBusy?' · <span class="spin" style="width:11px;height:11px;vertical-align:-1px"></span> szerződések keresése a Drive-ban…':''}</p></div>${ro()?'':undoBar()}
      ${isAdmin()?'<button class="btn outline w" type="button" data-action="new-contract">📝 <span class="mlg">Új szerződés</span><span class="msm">Szerződés</span></button>':''}<button class="btn primary w" type="button" data-action="new-client">+ Új<span class="mlg"> ügyfél</span></button></div>
    <div class="toolbar cl-tb"><input class="inp search" id="q-cl" type="search" placeholder="Keresés cégnév, adószám, kapcsolattartó vagy e-mail szerint" value="${esc(S.clf.q)}" aria-label="Ügyfelek keresése"></div>
    ${rows?`<div class="tbl-wrap cl-wrap"><table><thead><tr><th>Ügyfél</th><th>Adószám</th><th>Kapcsolattartó</th><th class="cl-ph">Telefon</th><th>E-mail</th>${adm?'<th>Szerződés</th>':''}</tr></thead><tbody>${rows}</tbody></table></div>`:`<div class="panel">${empty(all?'Nincs a keresésnek megfelelő ügyfél.':'Még nincs ügyfél. Vegyél fel egyet, vagy adj meg ügyfelet egy projektnél.')}</div>`}`;
}

/* Ügyfélmappák a Drive-ban (02 Ügyfelek) – név vagy zárójeles név alapján párosítva, mint a háttérben */
const clNorm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\b(kft|bt|zrt|nyrt|kkt|llc|ltd|s l|sl|egyesulet|nonprofit)\b/g,' ').replace(/\s+/g,' ').trim();
/* Ügyfél ↔ mappa: egyezés vagy szóhatáros előtag (pl. „Bagen” ↔ „Bagen Invest Kft.”); a zárójeles név is számít */
const clMatch=(company,folder)=>{const w=clNorm(company);if(!w)return false;return [folder.replace(/\s*\(.*\)\s*$/,''),(/\(([^)]*)\)/.exec(folder)||[])[1]||''].map(clNorm).some(f=>f&&(f===w||(Math.min(f.length,w.length)>=4&&((w+' ').startsWith(f+' ')||(f+' ').startsWith(w+' ')))));};
function clDocsLoad(force){if(S._clDocsLoading)return;S._clDocsLoading=true;S._clDocsBusy=true;
  call('clientDocs',{force:!!force}).then(r=>{S.clDocs=r.folders||[];S._clDocsAt=r.at||0;
    if(!force&&Date.now()-(r.at||0)>30*60000){S._clDocsLoading=false;clDocsLoad(true);return;}   // régi a tárolt lista → a háttérben frissítjük
    S._clDocsBusy=false;S._clDocsLoading=false;}).catch(()=>{S.clDocs=S.clDocs||[];S._clDocsBusy=false;S._clDocsLoading=false;}).finally(()=>{if(S.tab==='ugyfelek'&&!$('modalRoot').innerHTML)render(true);});}
function clDir(company){if(!S.clDocs){clDocsLoad(!!S._clDocsForce);S._clDocsForce=false;return null;}
  const hits=S.clDocs.filter(d=>clMatch(company,d.name));if(hits.length<2)return hits[0]||null;   // több mappa is tartozhat egy ügyfélhez (pl. márkanév + cégnév)
  return {name:hits[0].name,url:hits[0].url,docs:[].concat(...hits.map(h=>h.docs||[])).sort((x,y)=>String(y.date).localeCompare(String(x.date)))};}
/* Ügyfél szerződései: a Drive-mappa Szerződések / Keretszerződés almappái + az appban rögzített linkek (ismétlés nélkül) */
const driveId=u=>(/[-\w]{25,}/.exec(String(u||''))||[])[0]||u;
function clDocs(c,ps){const f=fwOfClient(c.company),dir=clDir(c.company),docs=((dir&&dir.docs)||[]).slice(),have=new Set(docs.map(d=>driveId(d.url)));
  const add=(url,name,kind)=>{if(url&&!have.has(driveId(url))){have.add(driveId(url));docs.push({url,name:name||'Szerződés',kind,date:''});}};
  if(f&&f.url)add(f.url,f.fileName||'Keretszerződés','keret');ps.forEach(p=>{const b=billOf(p.id);add(b.contractUrl,b.contractName||('Szerződés – '+(p.name||'')),'sz');});
  return {f,dir,docs};}
const docLabel=d=>(d.kind==='keret'?'Keretszerződés':'Szerződés')+(/_EV([_.\s]|$)/.test(d.name)?' (E.V.)':'');
function clContract(c,ps){
  const {f,dir,docs}=clDocs(c,ps),cl=esc(c.company),edit='';
  if(f&&f.mode==='nemkell')return `<div class="cl-ctr"><label class="bl-nocontract"><input type="checkbox" data-clnone="${cl}" checked> Nem kell szerződés</label></div>`;
  if(docs.length>1)return `<div class="cl-ctr" data-cldrop="${cl}"><button class="bl-file linkbtn" type="button" data-action="cl-docs" data-client="${cl}">📑 ${docs.length} szerződés</button>${edit}</div>`;
  if(docs.length)return `<div class="cl-ctr" data-cldrop="${cl}"><button class="bl-file linkbtn" type="button" data-action="cl-docs" data-client="${cl}" data-tip="${esc(docs[0].name)}">📄 ${esc(docLabel(docs[0]))}</button></div>`;
  return `<div class="cl-ctr cl-dropcell" data-cldrop="${cl}"><span class="cdrop-tip">📥 Húzd ide</span></div>`;
}
/* Ügyfél adatlapja (csak ügyvezető): a szerződései */
function clientDocsHtml(name){if(!name)return '';const c=knownClients('').find(x=>x.company===name)||{company:name};const ps=S.projects.filter(p=>String(p.client||'').trim().toLowerCase()===String(name).toLowerCase());
  if(!S.clDocs){clDocsLoad(false);setTimeout(()=>{const b=$('cl-docs-sec');if(b&&S.clDocs)b.outerHTML=clientDocsHtml(name);},2500);}
  const {f,docs,dir}=clDocs(c,ps);
  const body=f&&f.mode==='nemkell'?'<p class="hint" style="margin:0">Ennél az ügyfélnél nem kell szerződés.</p>':docs.length?`<div class="cl-docs">${docs.map(d=>`<div class="cl-doc-row"><a class="cl-doc" href="${esc(d.url)}" target="_blank" rel="noopener"><span class="cl-doc-k">${d.folder?'🗂️':'📄'}</span><span class="cl-doc-n">${esc(d.name)}</span><span class="cl-doc-d">${esc(d.date||'')}</span></a>${d.folder||!isAdmin()?'':`<button class="trash" type="button" data-action="cl-doc-del" data-inline="1" data-url="${esc(d.url)}" data-name="${esc(d.name)}" data-client="${esc(name)}" aria-label="Szerződés törlése" title="Törlés">🗑️</button>`}</div>`).join('')}</div>`:`<p class="hint" style="margin:0">${S.clDocs?'Még nincs feltöltött szerződés.':'Betöltés…'}</p>`;
  return `<div class="cl-work cl-docs-drop" id="cl-docs-sec"><h4>📑 Szerződések${docs.length?` <span class="muted">· ${docs.length} db</span>`:''} ${dir&&dir.url?`<a class="mini" href="${esc(dir.url)}" target="_blank" rel="noopener" style="margin-left:8px">📁 Ügyfél mappája ↗</a>`:''}</h4>${body}${isAdmin()&&!(f&&f.mode==='nemkell')?`<button type="button" class="btn outline small cl-ct-new" data-action="ct-new-client" data-client="${esc(name)}">📝 Új szerződés létrehozása</button><button type="button" class="cl-drop-box" data-action="cl-doc-pick" data-client="${esc(name)}" data-cldrop="${esc(name)}" data-inline="1"><span class="cl-drop-ic">📥</span><span><b>Új szerződés feltöltése</b><small>Húzd ide a fájlt (PDF, Word, kép), vagy kattints a tallózáshoz</small></span></button>`:''}</div>`;}
function clDocsModal(name){const c=knownClients('').find(x=>x.company===name)||{company:name};const ps=S.projects.filter(p=>String(p.client||'').trim().toLowerCase()===name.toLowerCase());
  const {dir,docs}=clDocs(c,ps);
  openModal('Szerződések – '+name,`<div class="cl-docs">${docs.map(d=>`<div class="cl-doc-row"><a class="cl-doc" href="${esc(d.url)}" target="_blank" rel="noopener"><span class="cl-doc-k">${d.folder?'🗂️':'📄'}</span><span class="cl-doc-n">${esc(d.name)}</span><span class="cl-doc-d">${esc(d.date||'')}</span></a>${d.folder?'':`<button class="trash" type="button" data-action="cl-doc-del" data-url="${esc(d.url)}" data-name="${esc(d.name)}" data-client="${esc(name)}" aria-label="Szerződés törlése" title="Törlés">🗑️</button>`}</div>`).join('')||'<p class="hint" style="margin:0">Még nincs szerződés.</p>'}</div>
    <div class="cl-drop" data-cldrop="${esc(name)}">📥 Új szerződés: húzd ide a fájlt<span class="cdrop-hint">Engedd el a feltöltéshez</span></div>
    <div class="btns" style="margin-top:12px">${dir?`<a class="mini" href="${esc(dir.url)}" target="_blank" rel="noopener">📁 Ügyfél mappája ↗</a>`:''}</div>`,{cancelLabel:'Bezárás'});
  if(S.tab==='ugyfelek'&&ACT['edit-client'])window.MODAL_BEFORE_CLOSE=()=>()=>{if(!$('mform'))ACT['edit-client']({dataset:{name}});};}   /* bezáráskor vissza az ügyfél adatlapjára */

/* ===== Szakember: saját értesítési beállítások ===== */
function viewMyNotify(){const n=S.myNotify||{},sales=isSales(),cut=!sales&&crewIsCutter(),pv=!!S.me.viewAs;
  const row=([k,l,d])=>`<label class="ntf-row"><span class="ntf-tx"><b>${l}</b><small>${d}</small></span><span class="ntf-sw"><input type="checkbox" data-notify="${k}"${n[k]!==false?' checked':''}${pv?' disabled':''}><i></i></span></label>`;
  const EM=[['assign','👥 Beosztás','Ha beosztanak egy projektre, vagy módosul a beosztásod.'],['eqlist','🎒 Eszközlista','Milyen eszköz lesz nálad egy forgatáson.']]
    .concat(cut?[['vidOk','✅ Videó jóváhagyva','Ha jóváhagyták az általad vágott videót.'],['vidMod','✎ Módosítást kértek a videódra','Ha módosítást kértek az általad vágott videón.'],['vidCm','💬 Új hozzászólás a videódhoz','Ha valaki megjegyzést ír az általad vágott videóhoz.']]:[]);
  const SEM=[['salePay','💰 Kifizetés érkezett','Ha az ügyfeled kifizeti a díjbekérőt, az előleget vagy a teljes összeget.'],['saleDone','✅ Projekt átadva','Ha az általad hozott projekt elkészült, és átadtuk az ügyfélnek.']],SAP=[['appPay','💰 Kifizetés érkezett','A csengőben látszik, ha az ügyfeled fizetett.'],['appToast','🔔 Felugró értesítés','Új értesítésnél felugró ablak a jobb felső sarokban.']];
  const AP=[['appSent','📤 Továbbküldve jóváhagyásra','A csengőben látszik, ha a videódat továbbküldték jóváhagyásra.'],['appOk','✅ Jóváhagyva','A csengőben látszik, ha a videódat jóváhagyták.'],['appToast','🔔 Felugró értesítés','Új értesítésnél felugró ablak a jobb felső sarokban.']];
  return `<div class="ntf-page"><div class="page-head"><div class="grow"><h2>Beállítások</h2><p class="sub">Itt állíthatod be, miről kapj értesítést.</p></div></div>${pv?'<div class="banner"><p>👁 Előnézet – így látja a szakember. A kapcsolókat csak ő állíthatja át a saját fiókjában.</p></div>':''}
    <div class="panel ntf-panel"><h3>📧 E-mail értesítések</h3>${(sales?SEM:EM).map(row).join('')}<p class="hint">A díjösszesítő és a belépési meghívó mindig megérkezik.</p></div>
    ${cut||sales?`<div class="panel ntf-panel"><h3>🔔 Értesítések az appban</h3>${(sales?SAP:AP).map(row).join('')}</div>`:''}</div>`;}
/* ===== Beállítások (admin) ===== */
function viewSettings(){
  if(S.users===null||S.log===null){loadSettings();return '<div class="loading"><span class="spin"></span>Betöltés…</div>';}
  const MC=[['assign','👥 Beosztás','Szakemberek','A stáb véglegesítésekor (és módosításkor) megkapják a beosztásukat: időpont, helyszín, szerep, stáb.'],
    ['calendar','📅 Naptármeghívó','Meghívott vendégek','A kézzel létrehozott naptárbejegyzések meghívói. A stábtagok a projekt eseményébe külön Google-levél nélkül kerülnek be – őket a beosztásos levél értesíti, benne a naptárlinkkel.'],
    ['eqlist','🎒 Eszközlista','A kiválasztott stábtagok','Az „Eszközök véglegesítése” után kiküldött levél azoknak, akiknél eszköz van: ki mit visz, személyes megjegyzés.'],
    ['penalty','⚠️ Díjcsökkentés','Az érintett szakember','Jóváhagyott díjcsökkentésről (késés, hiba, kártérítés) értesítés.'],
    ['penAdmin','🔔 Jóváhagyásra váró díjcsökkentés','Ügyvezetők','Ha a termelési vezető díjcsökkentést javasol, az ügyvezető jóváhagyást kér.'],
    ['invoice','🧾 Számla, díjbekérő','Az ügyfél (vevő)','A számlázz.hu e-mailben elküldi a kiállított bizonylatot a vevő e-mail-címére.'],
    ['invite','✉️ Meghívó','Az új kolléga','Belépési meghívó, amikor új felhasználót veszel fel.'],
    ['payStatement','💰 Díjösszesítő','Az érintett szakember','A havi díjösszesítő a Fizetések oldal „Díjösszesítő kiküldése” gombjával: tételek, levonások, számlázási adatok.']],mc=S.mailCats||{},cc=S.mailCc||{};
  const CC=[['actor','aki küldi'],['editor','termelési vezetők'],['admin','ügyvezetők']];
  const MG=[['👷 Szakembereknek',['assign','eqlist','penalty','payStatement']],['🤝 Ügyfeleknek és vendégeknek',['invoice','calendar']],['💼 Belső',['penAdmin','invite']]],MCo=Object.fromEntries(MC.map(x=>[x[0],x]));
  const mRow=k=>{const [,l,to,d]=MCo[k],on=mc[k]!==false,dis=!S.mailOn;return `<div class="mrow${on?'':' off'}"><label class="mrow-main"><span class="ntf-tx"><b>${l}</b><small>${d}</small><span class="mrow-to">Címzett: ${to}</span></span><span class="ntf-sw"><input type="checkbox" data-mailcat="${k}"${on?' checked':''}${dis?' disabled':''}><i></i></span></label>
      ${cc[k]?`<div class="mail-cc"><span class="muted">Másolatot kap:</span>${CC.map(([r,rl])=>`<label class="cc-chip${cc[k].includes(r)?' on':''}"><input type="checkbox" data-mailcc="${k}" data-role="${r}"${cc[k].includes(r)?' checked':''}${S.mailOn&&on?'':' disabled'}> ${rl}</label>`).join('')}</div>`:''}</div>`;};
  const mailPanel=S.mailOn===undefined?'':`<div class="panel mail-panel2${S.mailOn?'':' off'}"><div class="mp-head"><div class="grow"><h3>📧 E-mail értesítések</h3><p class="hint">${S.mailOn?'Az app leveleket küld. Típusonként is kikapcsolhatod őket, és beállíthatod, ki kapjon másolatot.':'Szünetel – most senki nem kap e-mailt az apptól.'}</p></div>
      <button type="button" class="mp-master${S.mailOn?' on':''}" data-action="mail-toggle" aria-pressed="${!!S.mailOn}"><span class="mp-lbl">${S.mailOn?'Bekapcsolva':'Szünetel'}</span><span class="mp-sw"><i></i></span></button></div>
    <div class="mp-groups${S.mailOn?'':' dis'}">${MG.map(([g,ks])=>`<section class="mp-group"><h4>${g}</h4>${ks.filter(k=>MCo[k]).map(mRow).join('')}</section>`).join('')}</div></div>`;
  if(Date.now()-(S._settingsAt||0)>30000)setTimeout(loadSettings,0);
  const crewName=id=>{const c=crewById(id);return c?c.name:'';};
  const UT=[['all','Mind'],['admin','Ügyvezető'],['editor','Termelési vezetők'],['crew','Szakemberek'],['sales','Értékesítők']].filter(([k])=>k==='all'||S.users.some(u=>u.role===k));
  const ut=UT.some(([k])=>k===S.userTab)?S.userTab:'all',showSig=ut==='admin'||ut==='editor'||ut==='sales';
  const userTabs=`<div class="chips log-tabs">${UT.map(([k,l])=>`<button class="chip" type="button" data-action="user-tab" data-v="${k}" aria-pressed="${ut===k}">${l}<span class="c">${k==='all'?S.users.length:S.users.filter(u=>u.role===k).length}</span></button>`).join('')}</div>`;
  const sigOf=u=>{const sg=(S.sigs||{})[u.id];if(!sg)return '';const can=isAdmin()||u.id===S.me.id;
    return `<div class="sig-box"><div class="sig-h"><b>✍️ E-mail aláírás</b>${sg.set?'':' <span class="muted">– még nincs beállítva, a levelek „Üdvözlettel, név” zárással mennek</span>'}${can?`<button class="mini" type="button" data-action="sig-edit" data-id="${esc(u.id)}">Szerkesztés</button>`:''}</div>${sg.set?`<div class="sig-prev" data-sig="${esc(u.id)}"></div>`:''}</div>`;};
  const RO_={admin:0,editor:1,crew:2},users=S.users.filter(u=>isAdmin()||u.role==='crew'||u.id===S.me.id).filter(u=>!S.userTab||S.userTab==='all'||u.role===S.userTab||!S.users.some(x=>x.role===S.userTab)).slice().sort((a,b)=>(!!a.disabled-!!b.disabled)||((RO_[a.role]??3)-(RO_[b.role]??3))||a.name.localeCompare(b.name,'hu')).map(u=>`<div class="arow${u.disabled?' off':''}"><div class="who"><b>${esc(u.name)} <span class="statuspill ${u.disabled?'p-bad':'p-ok'}">${u.disabled?'letiltva':'aktív'}</span>${u.id===S.me.id?' <span class="muted" style="font-weight:600">(te)</span>':''}</b><small>${esc(roleLabel(u.role))}${u.crewId?' · stáb: '+esc(crewName(u.crewId)||'törölt munkatárs'):''}${u.email?' · '+esc(u.email):''}</small></div>
    <div class="arow-btns">${!isAdmin()&&u.role!=='crew'?'':`${u.id!==S.me.id?`<button class="mini${u.disabled?'':' warn'}" type="button" data-action="toggle-user" data-id="${esc(u.id)}" data-dis="${u.disabled?'0':'1'}">${u.disabled?'Engedélyezés':'Letiltás'}</button>`:''}<button class="mini" type="button" data-action="edit-user" data-id="${esc(u.id)}">Szerkesztés</button>`}</div>${(S.userTab==='admin'||S.userTab==='editor')&&(u.role==='admin'||u.role==='editor')&&!u.disabled?sigOf(u):''}</div>`).join('');
  const logActors=new Map(S.users.filter(u=>u.name).map(u=>[u.name,{name:u.name,role:u.role,count:0,login:0,last:0}]));   // login/last 0-val indul, különben a rendezés nem működik (NaN)
  for(const l of S.log){
    if(!l.who)continue;
    if(!logActors.has(l.who))logActors.set(l.who,{name:l.who,role:l.role,count:0,login:0,last:0});
    const A=logActors.get(l.who),tk=cmTk(l.at);A.count++;if(tk>A.last)A.last=tk;if(/^Belépés/.test(l.action||'')&&tk>A.login)A.login=tk;
  }
  const actors=[...logActors.values()].sort((a,b)=>((b.login||b.last)-(a.login||a.last))||a.name.localeCompare(b.name,'hu'));   // a legutóbb belépett felül
  const logUser=S.logTab??(actors.find(u=>u.role==='admin'||u.role==='editor')?.name||'__all');
  const lt=logActors.has(logUser)?logUser:'__all';
  const logSel=lt==='__all'?S.log:S.log.filter(l=>l.who===lt);
  const logFilter=`<div class="log-tabs"><select class="inp" id="log-user" data-cmb="Felhasználó keresése…" aria-label="Napló szűrése felhasználó szerint">
    <option value="__all"${lt==='__all'?' selected':''}>Összes felhasználó (${S.log.length})</option>
    ${actors.map(u=>`<option value="${esc(u.name)}"${lt===u.name?' selected':''}>${esc(u.name)}${u.role?' · '+esc(roleLabel(u.role)):''} (${u.count})</option>`).join('')}</select></div>`;
  const log=logSel.slice(0,200).map(l=>`<div class="logrow"><span class="when">${esc(l.at)}</span><span><b>${esc(l.who)}</b> · ${esc(l.action)}${l.subject?': '+esc(l.subject):''}${l.details?`<br><span class="muted">${esc(l.details)}</span>`:''}</span></div>`).join('');
  if(!isAdmin())return `<div class="page-head"><div class="grow"><h2>Beállítások</h2><p class="sub">Hozzáférések</p></div></div>
    <div class="panel"><h3>👤 Hozzáférések – ki léphet be <span class="aside"><button class="btn primary small" type="button" data-action="new-user">+ Szakember felvétele</button></span></h3>
      <p class="hint" style="margin:0 0 10px">Csak az itt felvett, aktív e-mail-címekkel lehet belépni (Google-fiókkal). Szakemberek hozzáférését veheted fel, módosíthatod, tilthatod le vagy törölheted; az ügyvezető és a termelési vezető fiókját csak az ügyvezető kezeli.</p>
      ${userTabs}<div class="alist">${users||empty('Nincs felhasználó.')}</div></div>`;   // termelési vezető: csak a hozzáférések
  return `<div class="page-head"><div class="grow"><h2>Beállítások</h2><p class="sub">Felhasználók, napló és a háttérben futó táblázat</p></div></div>
    ${mailPanel}${dwdPanel()}
    ${S.links.folder?`<div class="btns"><a class="mini" href="${esc(S.links.folder)}" target="_blank" rel="noopener">📁 Projektek mappa ↗</a></div>`:''}
    <div class="grid2">
      <div class="panel"><h3>👤 Hozzáférések – ki léphet be <span class="aside"><button class="btn primary small" type="button" data-action="new-user">+ Kolléga felvétele</button></span></h3>
        <p class="hint" style="margin:0 0 10px">Csak az itt felvett, aktív e-mail-címekkel lehet belépni (Google-fiókkal). Letiltáskor a kolléga minden eszközön azonnal kilép. Ügyvezető: mindent lát és kezel, a Beállításokat is. Termelési vezető: projekteket, stábot és leltárt szerkeszt, eszközlistát küld. Szakember: csak a saját beosztásait látja (helyszín, időpont, stáb, eszközök), szerkeszteni nem tud.</p>
        ${userTabs}<div class="alist">${users||empty('Nincs felhasználó.')}</div></div>
      <div class="panel"><h3>🧾 Napló <span class="aside"><button class="btn ghost small" type="button" data-action="reload-log">↻</button></span></h3>
        ${logFilter}<div class="log-scroll">${log||empty('Még nincs bejegyzés.')}</div></div>
    </div>`;
}
async function loadSettings(){   // egy kérés; a már betöltött adatot azonnal mutatjuk, a háttérben frissítjük
  if(S._settingsLoading)return;S._settingsLoading=true;
  try{const r=await call('settingsData');S.users=r.users||[];S.sigs=r.sigs||{};S.log=r.log||[];S.dwd=r.dwd||null;S._settingsAt=Date.now();}
  catch(e){handleErr(e);S.users=S.users||[];S.log=S.log||[];S._settingsAt=Date.now();}   // hiba után se próbálja újra minden kirajzolásnál (30 mp múlva újra)
  finally{S._settingsLoading=false;if(S.tab==='beallitasok'&&!$('modalRoot').innerHTML)render(true);}
}


/* Küldés a kollégák saját címéről (Google Workspace domainszintű megbízás) – ügyvezetői panel */
function dwdPanel(){if(!isAdmin()||!S.dwd)return '';const d=S.dwd;
  return `<div class="panel dwd-panel"><div class="mp-head"><div class="grow"><h3>📨 Küldés a kollégák saját címéről</h3><p class="hint">${d.on?`Bekapcsolva – a kollégák (pl. az értékesítők) ajánlatai és levelei a <b>saját postafiókjukból</b> mennek ki, és az ő Elküldött mappájukban is ott lesznek. Szolgáltatásfiók: <code>${esc(d.clientEmail)}</code>${d.clientId?` · ügyfél-azonosító: <code>${esc(d.clientId)}</code>`:''}`:'Kikapcsolva – a levelek a központi fiókról mennek, a kolléga nevével és válaszcímével. A bekapcsoláshoz egy Google Cloud szolgáltatásfiók kulcsa és a Workspace admin engedélye kell (lásd a lépéseket).'}</p></div></div>
    <div class="dwd-body">${d.on?`<div class="btns"><input class="inp" id="dwd-mail" type="email" placeholder="peter.farkas@lumosmotion.com" value="peter.farkas@lumosmotion.com" style="max-width:300px"><button type="button" class="btn outline small" data-action="dwd-test">🔎 Kapcsolat tesztelése (levelet nem küld)</button><button type="button" class="btn ghost small" data-action="dwd-clear">Kikapcsolás</button></div><p class="hint">Engedélyezendő jogosultság a Workspace adminban: <code>${esc(d.scope)}</code></p>`
      :`<label class="hint" for="dwd-json" style="display:block;margin:4px 0">A szolgáltatásfiók letöltött JSON-kulcsfájljának teljes tartalma (nem jelenik meg újra, biztonságosan tároljuk):</label><textarea class="inp" id="dwd-json" rows="4" placeholder='{"type": "service_account", ...}' spellcheck="false" autocomplete="off" style="font-family:monospace;font-size:12px"></textarea><div class="btns" style="margin-top:8px"><button type="button" class="btn primary small" data-action="dwd-save">💾 Kulcs mentése</button></div>`}</div></div>`;}
