'use strict';
/* ===== Konstansok ===== */
const STAGES=[{id:'egyeztetes',label:'Egyeztetés'},{id:'tervezes',label:'Tervezés'},{id:'helyszin',label:'Helyszíni munka'},{id:'utomunka',label:'Utómunka'},{id:'atadva',label:'Átadva'}];
const STATUS_LABEL={egyeztetes:'Egyeztetés',tervezes:'Tervezés',helyszin:'Helyszíni munka',utomunka:'Utómunka',atadva:'Átadva',lemondva:'Lemondva'};
const EVENT_TYPES=['Konferencia','Webinárium','Csoportos találkozó','Céges rendezvény','Gála, díjátadó','Kiállítás, expo','Termékbemutató','Sportesemény','Koncert','Egyéb'];
const CREW_ROLES=['Projektvezető','Operatőr','Vágó','Fotós','Drónpilóta','Hangtechnikus','Fénytechnikus','Képkeverő / streaming','Sofőr / rakodó'];
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
  {k:'x_foto',label:'Fotózás',role:'Fotós',base:true},
  {k:'x_nyersVetel',label:'Nyersanyag megvásárlása',pct:'nyersVetel'},
  {k:'x_nyersTarolas',label:'Nyersanyag tárolása 5 évig',pct:'nyersTarolas'},
  {k:'x_rush',label:'Villámgyors kézbesítés (72 óra)',pct:'rush'}];
const REC_CAMS=[
  {k:'er_total',label:'Teljes alakos kamera szög',sub:'Alap színpadi plán'},
  {k:'er_close',label:'Közeli kamera szög kamerával',sub:'Arc és mimika'},
  {k:'er_zoom',label:'Közeli kamera szög vágói belenagyítással',sub:'Közeli a totálból, utómunkában'},
  {k:'er_crowd',label:'Közönség kamera',sub:'Hangulat és reakciók'},
  {k:'er_slides',label:'Diák rögzítése',sub:'Tiszta jel a projektorról'}];
const REC_LIVE={k:'er_stream',label:'Élő közvetítés LED falon, projektoron vagy stream',sub:'Élő képválasztás, több forrás',role:'Képkeverő / streaming'};
const REC_COUNTS=[{k:'er_clips',label:'Kivágások (40–60 mp short videók)',max:20,min:0},{k:'er_subs',label:'Feliratozás (videónként)',max:10,min:0},{k:'er_rooms',label:'Rögzített termek száma',max:10,min:1}];
const hasRec=p=>REC_CAMS.some(c=>p[c.k])||!!p.er_stream;
const TECH=[
  {k:'t_kepkeveres',label:'Élő képkeverés / streaming',role:'Képkeverő / streaming'},
  {k:'t_hang',label:'Hangtechnika',role:'Hangtechnikus'},
  {k:'t_feny',label:'Fénytechnika',role:'Fénytechnikus'}];
const USER_ROLES={admin:'Ügyvezető',editor:'Termelési vezető'};
const roleLabel=r=>USER_ROLES[r]||(r==='crew'?'Stáb (régi, csak olvas)':r);
const TOKEN_KEY='lumos_pm_token_v1';

/* ===== Állapot ===== */
const $=id=>document.getElementById(id);
const VIEW=$('view');
const S={me:null,projects:[],crew:[],inventory:[],links:{},loaded:false,loading:false,
  tab:'attekintes',projectId:null,draft:null,dirty:false,saving:false,
  pf:{status:'aktiv',q:''},cf:{q:'',role:'',prio:'',view:(()=>{try{return localStorage.getItem('lumos_pm_crewview')||'cards';}catch(e){return 'cards';}})()},inf:{q:'',cat:'',cond:''},
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
const byStart=(a,b)=>(pr(a)?.start||'9999').localeCompare(pr(b)?.start||'9999');
function dueDate(p){const r=pr(p);if(!r)return null;return addDays(r.end,p.x_rush?3:7);}
function crewIds(p){return new Set([p.lead,...(p.crew||[]).map(c=>c.crewId)].filter(Boolean));}
const eqQty=(p,id)=>(p.equipment||[]).filter(e=>e.itemId===id).reduce((s,e)=>s+num(e.qty),0);
const eqCount=p=>(p.equipment||[]).reduce((s,e)=>s+num(e.qty),0);
const clone=x=>JSON.parse(JSON.stringify(x));
const ro=()=>!S.me||S.me.role==='crew';
const isAdmin=()=>S.me&&S.me.role==='admin';
const D=()=>ro()?' disabled':'';
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
  const ops=units>=3?4:units>=2?3:units>=1?2:1;
  return {ops,hours};
}
function staffing(p){
  const c=calc(p),need={'Projektvezető':1,'Operatőr':c.ops};
  EXTRAS.forEach(e=>{if(e.role&&p[e.k])need[e.role]=(need[e.role]||0)+1;});
  TECH.forEach(t=>{if(t.role&&p[t.k])need[t.role]=Math.max(need[t.role]||0,1);});
  const rooms=Math.max(1,num(p.er_rooms)||1);
  REC_CAMS.concat([REC_LIVE]).forEach(t=>{if(t.role&&p[t.k])need[t.role]=Math.max(need[t.role]||0,rooms);});
  if(REC_CAMS.some(c=>p[c.k]))need['Operatőr']=Math.max(need['Operatőr']||0,rooms);   // termenként legalább 1 operatőr
  const have={};if(p.lead)have['Projektvezető']=1;
  (p.crew||[]).forEach(a=>{have[a.role]=(have[a.role]||0)+1;});
  return Object.keys(need).map(r=>({role:r,need:need[r],have:have[r]||0}));
}
/* A projektlistában a szerkesztés alatt álló vázlatot használjuk, hogy az ütközések azonnal látszódjanak. */
function allProjects(){if(!S.draft)return S.projects;return S.projects.map(p=>p.id===S.draft.id?S.draft:p);}
function liveProjects(){const T=todayISO();return allProjects().filter(p=>p.status!=='lemondva'&&p.status!=='atadva'&&pr(p)&&pr(p).end>=T);}
function busyFor(personId,p){const r=pr(p);if(!r)return [];return allProjects().filter(q=>q.id!==p.id&&q.status!=='lemondva'&&overlap(r,pr(q))&&crewIds(q).has(personId));}
function usedElsewhere(itemId,p){const r=pr(p);if(!r)return 0;return allProjects().filter(q=>q.id!==p.id&&q.status!=='lemondva'&&overlap(r,pr(q))).reduce((s,q)=>s+eqQty(q,itemId),0);}
function computeIssues(){
  const T=todayISO(),out=[],live=liveProjects();
  for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++){
    const a=live[i],b=live[j];if(!overlap(pr(a),pr(b)))continue;
    const B=crewIds(b);
    for(const id of crewIds(a))if(B.has(id)){const c=crewById(id);
      out.push({level:'bad',text:`${c?c.name:'Egy munkatárs'} egyszerre két projektre van beosztva (${fmtShort(pr(a).start>pr(b).start?pr(a).start:pr(b).start)}).`,pids:[a.id,b.id]});}
  }
  const seen=new Set();
  for(const it of S.inventory){
    const users=live.filter(p=>eqQty(p,it.id)>0);
    for(const p of users){
      const ov=users.filter(q=>overlap(pr(p),pr(q)));
      const need=ov.reduce((s,q)=>s+eqQty(q,it.id),0);
      if(need>num(it.qty)){const key=it.id+':'+ov.map(q=>q.id).sort().join(',');if(seen.has(key))continue;seen.add(key);
        out.push({level:'bad',text:`${it.name}: ${need} db kellene egyszerre, de csak ${num(it.qty)} db van.`,pids:ov.map(q=>q.id)});}
    }
    if(it.condition&&it.condition!=='ok'&&users.length)out.push({level:'warn',text:`${it.name} állapota: ${CONDITIONS[it.condition]||it.condition}, de be van osztva.`,pids:users.map(q=>q.id)});
  }
  if(!ro())for(const p of live){const miss=staffing(p).filter(s=>s.have<s.need);
    if(miss.length)out.push({level:'warn',text:`Hiányzó stáb: ${miss.map(m=>(m.need-m.have)+' '+m.role.toLowerCase()).join(', ')}.`,pids:[p.id]});}
  for(const p of allProjects().filter(isOpen)){const r=pr(p);if(!r||r.end>=T)continue;const left=diffDays(T,dueDate(p));
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
        ?await fetch(API_URL+(API_URL.indexOf('?')>=0?'&':'?')+'p='+encodeURIComponent(body),{redirect:'follow'})
        :await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body,redirect:'follow'});
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
  if(m.indexOf('AUTH_REQUIRED')>=0){showLogin('Lépj be újra.');return true;}
  if(m.indexOf('FORBIDDEN')===0){toast('Ehhez nincs jogosultságod.',true);return true;}
  toast(m.replace(/^CONFLICT:\s*/,'')||'Hiba történt. Próbáld újra.',true);return false;
}
let toastTimer=0;
function toast(msg,isErr){const t=$('toast');t.textContent=msg;t.classList.toggle('error',!!isErr);t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),isErr?5000:2600);}

