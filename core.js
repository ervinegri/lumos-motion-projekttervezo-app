'use strict';
/* ===== Konstansok ===== */
const STAGES=[{id:'egyeztetes',label:'Egyeztetés'},{id:'tervezes',label:'Tervezés'},{id:'helyszin',label:'Helyszíni munka'},{id:'utomunka',label:'Utómunka'},{id:'leadva',label:'Videók leadva'},{id:'jovahagyas',label:'Videók jóváhagyásra várnak'},{id:'atadva',label:'Kész'}];
/* Kötelező alapadatok (a jegyzetek kivételével). Mentéskor a felület ellenőrzi. */
const REQ_FIELDS=[['name','Projekt neve'],['venue','Helyszín'],['client','Ügyfél'],['eventType','Rendezvény típusa'],['contactName','Kapcsolattartó'],['contactPhone','Kapcsolattartó telefonja'],['contactEmail','Kapcsolattartó e-mail-címe'],['date','Első nap'],['endDate','Utolsó nap'],['startTime','Érkezés a helyszínre'],['endTime','Hozzávetőleges távozási óra']];
function reqEmpty(p,k){const v=String(p[k]==null?'':p[k]).trim();
  if(k==='endDate')return !!(p._multi||p.endDate)&&!v;   // csak több napos projektnél
  if(k==='contactPhone')return v.replace(/\D/g,'').length<8;   // az országhívószám önmagában nem elég
  if(k==='contactEmail')return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  return !v;}
const missingReq=p=>p?REQ_FIELDS.filter(([k])=>reqEmpty(p,k)):[];
/* Stáb kártyáinak sorrendje: a húzással beállított közös sorrend, utána prioritás és név. */
function crewOrderLocal(){try{const a=JSON.parse(localStorage.getItem('lumos_pm_crew_order')||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}}
function crewSorted(){const ord=S.crewOrder||[],rank=id=>{const i=ord.indexOf(id);return i<0?1e6:i;};
  return S.crew.slice().sort((a,b)=>rank(a.id)-rank(b.id)||prioNum(a)-prioNum(b)||a.name.localeCompare(b.name,'hu'));}
const POST_STAGES=['utomunka','leadva','jovahagyas'];   // utómunka utáni lépések (csak átadandó anyagnál)
const videoStagesOn=()=>!!(S.capabilities&&S.capabilities.videoStages);   // az új háttérkóddal aktiválódik (a régi háttér nem ismeri ezeket az állapotokat)
const STATUS_LABEL={egyeztetes:'Egyeztetés',tervezes:'Tervezés',helyszin:'Helyszíni munka',utomunka:'Utómunka',leadva:'Videók leadva',jovahagyas:'Videók jóváhagyásra várnak',atadva:'Kész',lemondva:'Lemondva'};
const EVENT_TYPES=['Konferencia','Webinárium','Csoportos találkozó','Céges rendezvény','Gála, díjátadó','Kiállítás, expo','Termékbemutató','Sportesemény','Koncert','Short videó forgatás','Podcast','Egyéb'];
const CREW_ROLES=['Projektvezető','Értékesítő','Operatőr','Vágó','Fotós','Drónpilóta','Hangtechnikus','Fénytechnikus','Vizuáltechnikus','Képkeverő / streaming','Sofőr / rakodó','Ajánlói jutalék'];
const CREW_TYPES=['Belsős','Állandó külsős','Alkalmi freelancer'];
const CREW_SKILLS=['Statív','Gimbal','Előadásvágás','Kreatív vágás','Werk','Saját kamera','Eszközbérlés'];
const PRIO_LABEL={1:'Elsődleges',2:'Másodlagos',3:'Tartalék'};
const INV_CATS=['Kamera','Objektív','Hang','Fény','Drón','Képkeverés / stream','GoPro / akciókamera','Gimbal / állvány','Akku / powerbank / táp','Adathordozó','Laptop / tablet / telefon','Kocsi / szállítás','Kábel','Egyéb'];
const CONDITIONS={ok:'Üzemképes',javitas:'Javításra vár',szerviz:'Szervizben',selejt:'Selejtezett'};
const DELIVERABLES=[
  {k:'aftermovie',label:'Aftermovie',w:.33,max:3},
  {k:'interju',label:'Interjúk / kiállítói imázsfilmek',w:.30,max:8},
  {k:'short60',label:'Short videó (40–60 mp)',w:.09,max:15},
  {k:'short30',label:'Short videó (30–40 mp)',w:.08,max:15},
  {k:'short15',label:'Short videó (15–20 mp)',w:.07,max:15}];
const EXTRAS=[
  {k:'x_vago',label:'Vágó a helyszínen',role:'Vágó'},
  {k:'x_dron',label:'Drónos felvételek + pilóta',role:'Drónpilóta',base:true},
  {k:'x_timelapse',label:'Timelapse (GoPro)',base:true},
  {k:'x_pov',label:'POV felvétel (GoPro)',base:true},
  {k:'x_foto',label:'Fotós a helyszínen',role:'Fotós',base:true},
  {k:'x_nyersVetel',label:'Nyersanyag megvásárlása',pct:'nyersVetel'},
  {k:'x_nyersTarolas',label:'Nyersanyag tárolása 5 évig',pct:'nyersTarolas'},
  {k:'x_rush',label:'Villámgyors kézbesítés',pct:'rush'}];
const REC_CAMS=[
  {k:'er_total',label:'Teljes alakos kamera szög',sub:'Alap színpadi plán'},
  {k:'er_close',label:'Közeli kamera szög',sub:'Arc és mimika'},
  {k:'er_creative',label:'Kreatív kamera',sub:'Mozgó, hangulati képek'},
  {k:'er_crowd',label:'Közönség kamera',sub:'Hangulat és reakciók'},
  {k:'er_slides',label:'Diák rögzítése / kivetítése',sub:'Tiszta jel a projektorról'}];
/* Élő kép: kivetítés és streaming külön választható; mindkettőhöz képkeverő kell (termenként). */
const REC_LIVE=[
  {k:'er_stream',label:'Élő kivetítés LED falra vagy projektorra',role:'Képkeverő / streaming'},
  {k:'t_kepkeveres',label:'Streaming',role:'Képkeverő / streaming'}];
const CAM_COUNTS=[{k:'er_total_n',flag:'er_total',label:'Teljes alakos kamerák',max:10,min:1},{k:'er_close_n',flag:'er_close',label:'Közeli kamerák',max:10,min:1},{k:'er_creative_n',flag:'er_creative',label:'Kreatív kamerák',max:10,min:1}];   // kameraszög darabszáma
const camN=(p,flag)=>p[flag]?Math.max(1,num(p[flag+'_n'])||1):0;
const REC_COUNTS=[{k:'er_post_n',label:'Termek előadásainak utómunkája',max:10,min:0},{k:'er_summary',label:'Rövid összefoglaló videó az előadás anyagából',max:10,min:0},{k:'er_clips',label:'Kivágások (40–60 mp short videók)',max:20,min:0},{k:'er_subs',label:'Feliratozás (videónként)',max:10,min:0},{k:'er_rooms',label:'Rögzített termek száma',max:10,min:0}];
const FOTO_COUNT={k:'x_foto_n',label:'Fotós a helyszínen',max:10,min:0};
const postN=p=>num(p.er_post_n)||(p.er_post?1:0),fotoN=p=>num(p.x_foto_n)||(p.x_foto?1:0);   // régi adatnál a pipa = 1
/* Léptetős tartalommezők: a hozzájuk tartozó pipát is beállítjuk (a régi háttér a pipát menti). */
function stepPatch(d,k,n){if(k==='er_post_n')return {er_post_n:n,er_post:n>0};if(k==='x_foto_n')return {x_foto_n:n,x_foto:n>0};
  if((k==='er_clips'||k==='er_subs'||k==='er_summary')&&n>0)return {[k]:n,er_post:true,er_post_n:Math.max(1,postN(d))};return {[k]:n};}
const hasRec=p=>REC_CAMS.some(c=>p[c.k])||REC_LIVE.some(c=>p[c.k]);
const TECH=[
  {k:'t_vizual',label:'Vizuáltechnika',role:'Vizuáltechnikus'},
  {k:'t_hang',label:'Hangtechnika',role:'Hangtechnikus'},
  {k:'t_feny',label:'Fénytechnika',role:'Fénytechnikus'}];
const USER_ROLES={admin:'Ügyvezető',editor:'Termelési vezető',crew:'Szakember'};
const roleLabel=r=>USER_ROLES[r]||r;
const TOKEN_KEY='lumos_pm_token_v1';

/* ===== Állapot ===== */
const $=id=>document.getElementById(id);
const VIEW=$('view');
const S={me:null,projects:[],crew:[],inventory:[],links:{},loaded:false,loading:false,
  tab:'attekintes',projectId:null,draft:null,dirty:false,saving:false,
  pf:{status:'aktiv',q:''},cf:{q:'',role:'',prio:'',view:(()=>{try{return localStorage.getItem('lumos_pm_crewview')||'cards';}catch(e){return 'cards';}})()},inf:{q:'',cat:'',cond:''},clf:{q:''},clients:[],
  addCrew:{person:'',role:''},addEq:{item:'',qty:1},users:null,log:null,lastLoad:0,
  cal:{month:todayISO().slice(0,7),events:{},loading:{},err:{}}};
let TOKEN='';
try{TOKEN=localStorage.getItem(TOKEN_KEY)||'';}catch(e){}

/* ===== Segédfüggvények ===== */
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf=new Intl.NumberFormat('hu-HU');
const huf=n=>nf.format(Math.round(+n||0))+' Ft';
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0;};
const validISO=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s);
function todayISO(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function toDate(iso){const [y,m,d]=iso.split('-').map(Number);return new Date(Date.UTC(y,m-1,d));}
function addDays(iso,n){const d=toDate(iso);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function diffDays(a,b){return Math.round((toDate(b)-toDate(a))/864e5);}
const F_SHORT=new Intl.DateTimeFormat('hu-HU',{month:'short',day:'numeric',timeZone:'UTC'});
const F_DAY=new Intl.DateTimeFormat('hu-HU',{month:'short',day:'numeric',weekday:'short',timeZone:'UTC'});
const F_FULL=new Intl.DateTimeFormat('hu-HU',{year:'numeric',month:'long',day:'numeric',weekday:'long',timeZone:'UTC'});
const F_MON=new Intl.DateTimeFormat('hu-HU',{month:'short',timeZone:'UTC'});
const F_WD=new Intl.DateTimeFormat('hu-HU',{weekday:'short',timeZone:'UTC'});
const fmtShort=iso=>validISO(iso)?F_SHORT.format(toDate(iso)):'—';
const fmtDay=iso=>validISO(iso)?F_DAY.format(toDate(iso)):'—';
function fmtRange(p){const r=pr(p);if(!r)return 'Nincs dátum';return r.start===r.end?fmtDay(r.start):fmtShort(r.start)+' – '+fmtShort(r.end);}
const crewById=id=>S.crew.find(c=>c.id===id);
const itemById=id=>S.inventory.find(i=>i.id===id);
const projById=id=>S.projects.find(p=>p.id===id);
const isOpen=p=>p.status!=='atadva'&&p.status!=='lemondva';
function pr(p){if(!p||!validISO(p.date))return null;const end=validISO(p.endDate)&&p.endDate>=p.date?p.endDate:p.date;return {start:p.date,end};}
const overlap=(a,b)=>a&&b&&a.start<=b.end&&b.start<=a.end;
/* Időablak egynapos projektnél: érkezés + helyszíni munkaidő. Ha nincs érkezési idő, egész naposnak vesszük. */
function timeWin(p){const m=/^(\d{2}):(\d{2})$/.exec(p.startTime||'');if(!m)return null;const s=+m[1]*60+ +m[2];const x=/^(\d{2}):(\d{2})$/.exec(p.endTime||'');if(x){let e=+x[1]*60+ +x[2];if(e<=s)e+=1440;return {s,e};}return {s,e:s+Math.max(1,num(p.hours)||8)*60};}
/* Két projekt ütközik-e: átfedő napok, de ugyanazon a napon (mindkettő egynapos) a délelőtti és a délutáni munka nem ütközik. */
function clash(p,q){
  if(!p||!q)return false;if(p.id&&p.id===q.id)return true;
  const a=pr(p),b=pr(q);if(!overlap(a,b))return false;
  if(a.start===a.end&&b.start===b.end){const x=timeWin(p),y=timeWin(q);if(x&&y)return x.s<y.e&&y.s<x.e;}
  return true;
}
const byStart=(a,b)=>(pr(a)?.start||'9999').localeCompare(pr(b)?.start||'9999');
function defaultDue(p){const r=pr(p);if(!r)return null;return addDays(r.end,1);}   // alapból a forgatás utáni nap
/* Van-e átadandó anyag: kreatív tartalom, fotó, drón/GoPro felvétel, nyersanyag, vagy előadás-utómunka / kivágás / felirat.
   Csak helyszíni munkánál (pl. élő stream, utómunka nélküli rögzítés) nincs átadási határidő. Egyedi határidő mindig számít. */
function needsDelivery(p){
  if(!p)return false;if(validISO(p.dueAt))return true;
  if(DELIVERABLES.some(it=>num(p[it.k])>0))return true;
  if(num(p.foto_db)>0||p.x_foto)return true;
  if(['x_dron','x_timelapse','x_pov','x_nyersVetel','er_post'].some(k=>p[k]))return true;
  return num(p.er_clips)>0||num(p.er_subs)>0||num(p.er_summary)>0;
}
function dueDate(p){if(validISO(p.dueAt))return p.dueAt;return needsDelivery(p)?defaultDue(p):null;}   // egyedi határidő felülírja az alapértelmezettet
function crewIds(p){return new Set([p.lead,...(p.crew||[]).map(c=>c.crewId)].filter(Boolean));}
const eqQty=(p,id)=>(p.equipment||[]).filter(e=>e.itemId===id).reduce((s,e)=>s+num(e.qty),0);
const eqCount=p=>(p.equipment||[]).reduce((s,e)=>s+num(e.qty),0);
const clone=x=>JSON.parse(JSON.stringify(x));
const ro=()=>!S.me||S.me.role==='crew';
const isAdmin=()=>S.me&&S.me.role==='admin';
const projLocked=()=>!!(S.tab==='projektek'&&S.draft&&S.draft.status==='atadva');   // lezárt projekt: csak a pénzügyek módosíthatók
const D=()=>ro()||projLocked()?' disabled':'';
function uuid(){try{if(crypto.randomUUID)return crypto.randomUUID();}catch(e){}return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16);});}
function initials(n){const p=String(n||'?').trim().split(/\s+/);return ((p[0]||'?')[0]+(p.length>1?p[p.length-1][0]:'')).toUpperCase();}
function hue(s){let h=0;for(const ch of String(s))h=(h*31+ch.charCodeAt(0))%360;return h;}
function avatar(c){const n=c?c.name:'?';return `<span class="av" style="background:hsl(${hue(n)} 42% 38%)" aria-hidden="true">${esc(initials(n))}</span>`;}
const empty=t=>`<p class="empty">${t}</p>`;
const driveUrl=id=>'https://drive.google.com/drive/folders/'+encodeURIComponent(id);

/* ===== Létszámigény (árak nélkül: a Projekttervező nem fér hozzá az árakhoz) ===== */
function calc(p){
  const hours=Math.min(16,Math.max(1,num(p.hours)||8));
  const units=DELIVERABLES.reduce((s,it)=>s+num(p[it.k])*it.w,0);
  const ops=units>=3?4:units>=2?3:units>=1?2:units>0?1:0;   // ha nem kérnek videót, operatőr sem kell
  return {ops,hours};
}
function staffing(p){
  const c=calc(p),need={'Operatőr':c.ops};
  EXTRAS.forEach(e=>{if(e.role&&p[e.k])need[e.role]=(need[e.role]||0)+(e.k==='x_foto'?Math.max(1,fotoN(p)):1);});
  TECH.forEach(t=>{if(t.role&&p[t.k])need[t.role]=Math.max(need[t.role]||0,1);});
  const rooms=Math.max(1,num(p.er_rooms)||1);
  REC_CAMS.concat(REC_LIVE).forEach(t=>{if(t.role&&p[t.k])need[t.role]=Math.max(need[t.role]||0,rooms);});
  if(REC_CAMS.some(c=>p[c.k]))need['Operatőr']=Math.max(need['Operatőr']||0,rooms,rooms*(camN(p,'er_total')+camN(p,'er_close')+camN(p,'er_creative')));   // termenként kamerásonként 1 operatőr
  if(hasVideoPost(p))need['Vágó']=Math.max(need['Vágó']||0,1);   // bármilyen videós utómunkához vágó kell
  const have={};if(p.lead)have['Projektvezető']=1;
  (p.crew||[]).forEach(a=>{have[a.role]=(have[a.role]||0)+1;});
  need['Projektvezető']=1;   // projektvezető mindig kell, egyszemélyes stábnál is
  const order=['Projektvezető'].concat(Object.keys(need).filter(r=>r!=='Projektvezető'));
  return order.filter(r=>r in need&&need[r]>0).map(r=>({role:r,need:need[r],have:have[r]||0}));
}
/* A projektlistában a szerkesztés alatt álló vázlatot használjuk, hogy az ütközések azonnal látszódjanak. */
function allProjects(){if(!S.draft)return S.projects;return S.projects.map(p=>p.id===S.draft.id?S.draft:p);}
function liveProjects(){const T=todayISO();return allProjects().filter(p=>p.status!=='lemondva'&&p.status!=='atadva'&&pr(p)&&pr(p).end>=T);}
/* Utazási tartalék: azonos napon, egymás után következő munkák között ennyi perc kell (utazás + esetleges késés). */
const TRAVEL_BUFFER_MIN=60,TRAVEL_RED_MIN=30;   // 60 perc alatt figyelmeztetés, 30 perc alatt piros: ennyi idő alatt nem lehet helyszínt váltani
const hhmm=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
/* Két egynapos, azonos napi, nem átfedő munka közötti szünet percben (ha értelmezhető), különben null. */
function gapBetween(p,q){
  const a=pr(p),b=pr(q);if(!a||!b||a.start!==a.end||b.start!==b.end||a.start!==b.start)return null;
  const x=timeWin(p),y=timeWin(q);if(!x||!y||(x.s<y.e&&y.s<x.e))return null;
  return x.e<=y.s?{gap:y.s-x.e,first:p,second:q,end:x.e,start:y.s}:{gap:x.s-y.e,first:q,second:p,end:y.e,start:x.s};
}
function tightFor(personId,p){if(!pr(p))return [];return allProjects().filter(q=>q.id!==p.id&&q.status!=='lemondva'&&crewIds(q).has(personId)).map(q=>gapBetween(p,q)).filter(g=>g&&g.gap<TRAVEL_BUFFER_MIN);}
const tightText=g=>g.gap<TRAVEL_RED_MIN?`Nincs idő a helyszínváltásra: ${esc(g.first.name||'projekt')} vége ${hhmm(g.end)}, ${esc(g.second.name||'projekt')} kezdete ${hhmm(g.start)} – csak ${g.gap} perc. Ennyi idő alatt nem lehet eljutni az egyik helyszínről a másikra, módosítsátok a beosztást vagy az időpontokat.`:`Szoros váltás: ${esc(g.first.name||'projekt')} vége ${hhmm(g.end)}, ${esc(g.second.name||'projekt')} kezdete ${hhmm(g.start)} – csak ${g.gap} perc. Győződjetek meg róla, hogy lesz elég idő eljutni az egyik helyszínről a másikra, és számoljatok esetleges csúszással is.`;
function busyFor(personId,p){const r=pr(p);if(!r)return [];return allProjects().filter(q=>q.id!==p.id&&q.status!=='lemondva'&&clash(p,q)&&crewIds(q).has(personId));}
function usedElsewhere(itemId,p){const r=pr(p);if(!r)return 0;return allProjects().filter(q=>q.id!==p.id&&q.status!=='lemondva'&&clash(p,q)).reduce((s,q)=>s+eqQty(q,itemId),0);}
function computeIssues(){
  const T=todayISO(),out=[],live=liveProjects();
  for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++){
    const a=live[i],b=live[j];if(!clash(a,b))continue;
    const B=crewIds(b);
    for(const id of crewIds(a))if(B.has(id)){const c=crewById(id);
      out.push({level:'bad',text:`${c?c.name:'Egy munkatárs'} egyszerre két projektre van beosztva (${fmtShort(pr(a).start>pr(b).start?pr(a).start:pr(b).start)}).`,pids:[a.id,b.id]});}
  }
  for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++){
    const g=gapBetween(live[i],live[j]);if(!g||g.gap>=TRAVEL_BUFFER_MIN)continue;
    const B=crewIds(live[j]);const names=[...crewIds(live[i])].filter(id=>B.has(id)).map(id=>(crewById(id)||{}).name).filter(Boolean);
    if(names.length&&g.gap<TRAVEL_RED_MIN)out.push({level:'bad',text:`${names.join(', ')}: nincs idő a helyszínváltásra ${fmtShort(pr(g.first).start)} – ${g.first.name} vége ${hhmm(g.end)}, ${g.second.name} kezdete ${hhmm(g.start)} (csak ${g.gap} perc). Ennyi idő alatt nem lehet eljutni az egyik helyszínről a másikra, módosítsátok a beosztást vagy az időpontokat.`,pids:[live[i].id,live[j].id]});
    else if(names.length)out.push({level:'warn',text:`${names.join(', ')}: szoros váltás ${fmtShort(pr(g.first).start)} – ${g.first.name} vége ${hhmm(g.end)}, ${g.second.name} kezdete ${hhmm(g.start)} (csak ${g.gap} perc). Győződjetek meg róla, hogy lesz elég idő eljutni az egyik helyszínről a másikra, és számoljatok esetleges csúszással is.`,pids:[live[i].id,live[j].id]});
  }
  const seen=new Set();
  for(const it of S.inventory){
    const users=live.filter(p=>eqQty(p,it.id)>0);
    for(const p of users){
      const ov=users.filter(q=>clash(p,q));
      const need=ov.reduce((s,q)=>s+eqQty(q,it.id),0);
      if(need>num(it.qty)){const key=it.id+':'+ov.map(q=>q.id).sort().join(',');if(seen.has(key))continue;seen.add(key);
        out.push({level:'bad',text:`${it.name}: ${need} db kellene egyszerre, de csak ${num(it.qty)} db van.`,pids:ov.map(q=>q.id)});}
    }
    if(it.condition&&it.condition!=='ok'&&users.length)out.push({level:'warn',text:`${it.name} állapota: ${CONDITIONS[it.condition]||it.condition}, de be van osztva.`,pids:users.map(q=>q.id)});
  }
  if(!ro())for(const p of live){const miss=staffing(p).filter(s=>s.have<s.need);
    if(miss.length)out.push({level:'warn',text:`Hiányzó stáb: ${miss.map(m=>(m.need-m.have)+' '+m.role.toLowerCase()).join(', ')}.`,pids:[p.id]});}
  for(const p of allProjects().filter(isOpen)){const r=pr(p);if(!r||r.end>=T||!dueDate(p))continue;const left=diffDays(T,dueDate(p));
    if(left<0)out.push({level:'bad',text:`Az átadási határidő ${-left} napja lejárt (${fmtShort(dueDate(p))}).`,pids:[p.id]});}
  return out.sort((a,b)=>(a.level==='bad'?0:1)-(b.level==='bad'?0:1));
}

/* ===== Szerverhívások ===== */
const API_URL=String(window.LUMOS_API_URL||'').trim();
async function gs(fn,...args){
  if(!API_URL)throw new Error('Az app még nincs összekötve az Apps Script háttérrel.');
  const body=JSON.stringify({fn,args});
  const modes=body.length<6000?['get','post']:['post','post'];
  let j=null,netErr=false;
  for(const mode of modes){
    try{
      const res=mode==='get'
        ?await fetch(API_URL+(API_URL.indexOf('?')>=0?'&':'?')+'p='+encodeURIComponent(body),{redirect:'follow',keepalive:body.length<8000})
        :await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body,redirect:'follow',keepalive:body.length<60000});   // keepalive: frissítés/bezárás közben is végigmegy a mentés
      j=await res.json();netErr=false;
    }catch(e){j=null;netErr=true;break;}
    if(j&&j.ok&&!('data' in j))continue; /* nem a kérésre érkezett válasz: próbáljuk a másik módon */
    break;
  }
  if(netErr||!j)throw new Error('Nincs kapcsolat a szerverrel. Ellenőrizd az internetet, és próbáld újra.');
  if(!j.ok)throw new Error(j.error||'Ismeretlen hiba.');
  if(!('data' in j))throw new Error('A szerver nem a várt választ adta. Töltsd újra az oldalt, és próbáld újra.');
  return j.data;
}
const call=(name,arg)=>gs('rpc',TOKEN,name,arg===undefined?null:arg);
const errText=e=>String((e&&e.message)||e||'').replace(/^(Exception|Error):\s*/,'');
function handleErr(e){
  const m=errText(e);
  if(m.indexOf('AUTH_REQUIRED')>=0){try{localStorage.removeItem('lpm_boot_v1');}catch(err){}showLogin('Lépj be újra.');return true;}
  if(m.indexOf('FORBIDDEN')===0){toast('Ehhez nincs jogosultságod.',true);return true;}
  toast(m.replace(/^CONFLICT:\s*/,'')||'Hiba történt. Próbáld újra.',true);return false;
}
let toastTimer=0;
function toast(msg,isErr){const t=$('toast');t.textContent=msg;t.classList.toggle('error',!!isErr);t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),isErr?5000:2600);}


/* ===== Telefonszám országhívószámmal (alapból +36) ===== */
const PH_CC=[['HU','🇭🇺','+36'],['AT','🇦🇹','+43'],['SK','🇸🇰','+421'],['RO','🇷🇴','+40'],['RS','🇷🇸','+381'],['HR','🇭🇷','+385'],['SI','🇸🇮','+386'],['UA','🇺🇦','+380'],
  ['DE','🇩🇪','+49'],['CZ','🇨🇿','+420'],['PL','🇵🇱','+48'],['IT','🇮🇹','+39'],['FR','🇫🇷','+33'],['ES','🇪🇸','+34'],['PT','🇵🇹','+351'],['GB','🇬🇧','+44'],['IE','🇮🇪','+353'],
  ['NL','🇳🇱','+31'],['BE','🇧🇪','+32'],['LU','🇱🇺','+352'],['CH','🇨🇭','+41'],['LI','🇱🇮','+423'],['DK','🇩🇰','+45'],['SE','🇸🇪','+46'],['NO','🇳🇴','+47'],['FI','🇫🇮','+358'],
  ['IS','🇮🇸','+354'],['EE','🇪🇪','+372'],['LV','🇱🇻','+371'],['LT','🇱🇹','+370'],['GR','🇬🇷','+30'],['BG','🇧🇬','+359'],['MK','🇲🇰','+389'],['AL','🇦🇱','+355'],['BA','🇧🇦','+387'],
  ['ME','🇲🇪','+382'],['XK','🇽🇰','+383'],['MD','🇲🇩','+373'],['MT','🇲🇹','+356'],['CY','🇨🇾','+357'],['TR','🇹🇷','+90'],['IL','🇮🇱','+972'],['AE','🇦🇪','+971'],['SA','🇸🇦','+966'],
  ['QA','🇶🇦','+974'],['US','🇺🇸','+1'],['MX','🇲🇽','+52'],['BR','🇧🇷','+55'],['AR','🇦🇷','+54'],['AU','🇦🇺','+61'],['NZ','🇳🇿','+64'],['JP','🇯🇵','+81'],['KR','🇰🇷','+82'],
  ['CN','🇨🇳','+86'],['HK','🇭🇰','+852'],['SG','🇸🇬','+65'],['IN','🇮🇳','+91'],['TH','🇹🇭','+66'],['VN','🇻🇳','+84'],['ZA','🇿🇦','+27'],['EG','🇪🇬','+20'],['MA','🇲🇦','+212']];
function phParse(v){
  v=String(v||'').trim();if(!v)return {cc:'+36',n:''};
  if(/^00/.test(v))v='+'+v.slice(2);
  if(v[0]==='+'){const d='+'+v.slice(1).replace(/\D/g,'');let best='';PH_CC.forEach(([,,c])=>{if(d.startsWith(c)&&c.length>best.length)best=c;});
    if(best){const re=new RegExp('^\\+\\s*'+best.slice(1).split('').join('[\\s-]*')+'[\\s-]*');return {cc:best,n:v.replace(re,'').trim()};}
    return {cc:'+36',n:v};}
  if(/^06/.test(v.replace(/\s/g,'')))return {cc:'+36',n:v.replace(/^0\s*6[\s-]*/,'').trim()};
  return {cc:'+36',n:v};
}
function phJoin(cc,n){n=String(n||'').trim();
  if(/^(\+|00)/.test(n)){const p=phParse(n);cc=p.cc;n=p.n;}            // ha teljes nemzetközi számot írtak/másoltak be
  if(cc==='+36')n=n.replace(/^0\s*6[\s-]*/,'');                       // magyar „06” előtag
  n=n.replace(/^0+\s*/,'');
  if(cc==='+36'&&/^\d+$/.test(n)){if(n.length===9)n=n.replace(/^(\d{2})(\d{3})(\d{4})$/,'$1 $2 $3');else if(n.length===8&&n[0]==='1')n=n.replace(/^1(\d{3})(\d{4})$/,'1 $1 $2');else if(n.length===8)n=n.replace(/^(\d{2})(\d{3})(\d{3})$/,'$1 $2 $3');}   // magyar szám tagolása
  return n?cc+' '+n:'';}
/* key: projektmező (azonnal a vázlatba), name: űrlapmező (rejtett inputban a teljes szám) */
function phoneField(o){
  const {cc,n}=phParse(o.value),id=o.key?'f-'+o.key:'m-'+o.name,dis=o.disabled?' disabled':'';
  return `<div class="field${o.full?' full':''}"><label for="${id}">${o.label||'Telefon'}</label><div class="phone-row" data-ph="${o.key?'k:'+o.key:'n:'+o.name}">
    <span class="inp ph-cc" data-cc="${cc}" aria-label="Országhívószám">${(PH_CC.find(x=>x[2]===cc)||['','🇭🇺'])[1]} ${cc}</span>
    <input class="inp ph-num" id="${id}" type="tel" inputmode="tel" autocomplete="off" value="${esc(n)}" placeholder="20 123 4567"${dis}>
    ${o.name?`<input type="hidden" name="${o.name}" value="${esc(phJoin(cc,n))}">`:''}</div></div>`;
}

/* ===== Díjcsökkentés (megbízási szerződés minőségi melléklete) ===== */
const PEN_KINDS={
  light:{label:'Enyhe szakmai hiba',pct:10,ref:'3.1.',cases:['Betekintő monitor, projektor, LED-fal vagy kijelző rossz beállítása / működtetése','Zúgó, recsegő, torz vagy túl halk hang','Prezentáció szakszerűtlen kezelése (rossz diasor, kurzor, menekülőkép)','Léptető hibája / az előadó tájékoztatásának elmaradása','Színpad- vagy rendezvénytechnikai elemek esztétikailag kifogásolható elhelyezése','Eszközök vagy zavaró elemek a rendezvényterületen','Helyszínen javítható, de beavatkozást igénylő technikai hiányosság','Szakmai vagy esztétikai elvárások kisebb mértékű megsértése']},
  severe:{label:'Súlyos szakmai hiba',pct:50,ref:'3.2.',cases:['Enyhe hiba ismétlődése / jelzett hiányosság kijavításának elmulasztása','Huzamosabb ideig nem megfelelő hangminőség','Életlen, hibásan exponált vagy használhatatlan felvétel jelentős mennyiségben','Fontos eseményrészlet, előadás vagy interjú részleges rögzítésének elmaradása','Előírt checklist, munkautasítás vagy ellenőrzés elmulasztása','Helytelen kamera-, hang- vagy streaming beállítás','Helyszíni technikai probléma késedelmes felismerése / kezelése','Az esemény menetét megzavaró hibás működtetés','Jelentős utómunkát vagy újraforgatást igénylő hiba']},
  critical:{label:'Kritikus hiba vagy meghiúsulás',pct:100,ref:'3.3.',cases:['Felvétel teljes vagy részleges elvesztése','Hangrögzítés teljes hiánya vagy használhatatlansága','Előadás, interjú vagy kiemelt programelem rögzítésének teljes elmaradása','Élő közvetítés / streaming / rendezvénytechnika leállása','Memóriakártya, adattároló vagy felvételi adatok elvesztése','A nyersanyag teljesítést ellehetetlenítő sérülése vagy hiánya','Ügyfél felé csak kompenzációval teljesíthető mulasztás','Megalapozott, dokumentált ügyfélreklamáció','A projekt meghiúsulását okozó magatartás vagy mulasztás']},
  prestige:{label:'Presztízsveszteség, jó hírnév sérelme',min:10,max:50,ref:'3.4.',cases:['Tiszteletlen, sértő vagy nem professzionális kommunikáció','Ügyfél előtti felkészületlenség vagy szakmai bizonytalanság','Öltözködési, megjelenési vagy viselkedési elvárások megszegése','Indokolatlan konfliktus vagy vita kezdeményezése','A Lumos Motion jó hírnevét sértő nyilatkozat vagy megjegyzés','Ügyfélpanaszt vagy bizalomvesztést okozó magatartás']},
  unfit:{label:'Munkavégzésre alkalmatlan állapot',pct:100,ref:'3.5.',cases:['Alkohol vagy tudatmódosító szer hatása alatt a helyszínen','Munkavégzésre alkalmatlan állapot alapos gyanúja']},
  damage:{label:'Kártérítés / eszközkár',ref:'4–5.',cases:['Ügyfélnek adott árengedmény vagy visszatérítés','Újraforgatás, pótfelvétel költsége','Helyettesítő szakember költsége','Sürgősségi utómunka költsége','Ügyfél által érvényesített kötbér / kártérítés','Eszköz javítási vagy pótlási költsége','Adatmentés, helyreállítás költsége','Egyéb dokumentált többletköltség']}};
const OFFICE_RENT=[{name:'Zajácz Dávid',amount:60000}];   // fix havi irodabérlet (szakembertől bérelt iroda) – a Kifizetéseknél a díjához adódik
const penOf=(p,cid,st)=>(p.penalties||[]).filter(x=>x.crewId===cid&&(!st||x.status===st));
const penPct=(p,cid,st)=>Math.min(100,penOf(p,cid,st||'approved').filter(x=>x.kind!=='damage').reduce((s,x)=>s+num(x.pct),0));
const penDamage=(p,cid)=>penOf(p,cid,'approved').filter(x=>x.kind==='damage').reduce((s,x)=>s+num(x.amount),0);
const penBase=(p,x,total)=>{const f=(p.fees||[]).find(r=>r.crewId===x.crewId&&r.kind!=='fixed')||(S.me&&S.me.crewId===x.crewId?p.myFee:null),amount=num(total!=null?total:f&&f.amount);if(!x.day)return amount;
  const days=projDays(p).length?crewDaysOf(p,x.crewId):[p.date];if(!days.includes(x.day))return 0;
  const da=f&&f.dayAmounts;if(da&&Object.keys(da).length)return num(da[x.day]);
  const per=Math.floor(amount/days.length);return x.day===days[days.length-1]?amount-per*(days.length-1):per;};
const penAmt=(p,x,total)=>x.kind==='damage'?num(x.amount):Math.round(penBase(p,x,total)*num(x.pct)/100);
const penDeduct=(p,cid,fee)=>Math.min(num(fee),penOf(p,cid,'approved').filter(x=>x.kind!=='damage').reduce((s,x)=>s+penAmt(p,x,fee),0));   // jóváhagyott levonás forintban (legfeljebb a teljes díj)

/* ===== Több napos projekt: napok, ki melyik napon dolgozik ===== */
function projDays(p){const r=pr(p);if(!r||r.start===r.end)return [];const out=[];for(let d=r.start;d<=r.end&&out.length<31;d=addDays(d,1))out.push(d);return out;}
function crewDaysOf(p,cid){const all=projDays(p),c=(p.crewDays||{})[cid];return Array.isArray(c)&&c.length?all.filter(d=>c.includes(d)):all;}
const dayLbl=d=>{const x=toDate(d);return (x.getUTCMonth()+1)+'.'+String(x.getUTCDate()).padStart(2,'0')+'. '+F_WD.format(x);};
/* Egy szakember napi levonása: a napra szabott jóváhagyott díjcsökkentések, az első munkanapján a teljes díjra szólók is. */
function penDayDeduct(p,f,dd){if(!f||!f.crewId)return 0;const first=crewDaysOf(p,f.crewId)[0]===dd;
  return penOf(p,f.crewId,'approved').filter(x=>x.kind!=='damage'&&(x.day?x.day===dd:first)).reduce((s,x)=>s+penAmt(p,x,f.amount),0);}
/* Napi összesen (levonások után) – a napi táblázat alján, gépelés közben is ugyanezzel számolunk. */
function daySumOf(p,dd){const first=projDays(p)[0];
  return (p.fees||[]).filter(g=>g.kind!=='fixed'&&!isPostOnly(p,g.crewId)).reduce((s,g)=>g.crewId?(crewDaysOf(p,g.crewId).includes(dd)?s+num((g.dayAmounts||{})[dd])-penDayDeduct(p,g,dd):s):(dd===first?s+num(g.amount):s),0);}
/* Egyéb költségek összesen: fix sorok (fuvar, étel, egyéb) + közös bérelt eszközök. */
const otherSumOf=p=>(p.fees||[]).filter(f=>f.kind==='fixed').reduce((s,f)=>s+num(f.amount),0)+rentalSum(p,'');
/* Helyszíni stáb összesen (egynapos projekt), levonások után */
const fieldSumOf=p=>(p.fees||[]).filter(f=>f.kind!=='fixed'&&!isPostOnly(p,f.crewId)).reduce((s,f)=>s+num(f.amount)-(f.crewId?penDeduct(p,f.crewId,f.amount):0),0);
function feeDaySum(p,f){const ds=crewDaysOf(p,f.crewId),a=f.dayAmounts||{};return ds.reduce((s,d)=>s+num(a[d]),0);}

/* Utómunka: csak vágóként beosztott munkatárs (nem a projektvezető) – nem napokhoz kötött, külön táblázatba kerül */
const POST_ROLES=['Vágó'];
function isPostOnly(p,cid){if(!cid||p.lead===cid)return false;const r=(p.crew||[]).filter(a=>a.crewId===cid).map(a=>a.role);return r.length>0&&r.every(x=>POST_ROLES.includes(x));}
function hasVideoPost(p){return !!p.er_post||num(p.er_summary)>0||num(p.er_clips)>0||num(p.er_subs)>0||DELIVERABLES.some(it=>num(p[it.k])>0);}
