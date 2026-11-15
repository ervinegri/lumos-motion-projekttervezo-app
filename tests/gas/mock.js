// Apps Script szolgáltatás-utánzatok a háttérkód node-os teszteléséhez (munkalap, tulajdonságok, cache, Gmail, Drive, naptár).
// Minimal Apps Script service mocks for local testing
(function(G){
  const sheets={};
  function mkSheet(name){
    const sh={name,data:[],maxCols:26,frozen:0,
      _ensure(r,c){while(sh.data.length<r)sh.data.push([]);for(let i=0;i<r;i++){while(sh.data[i].length<c)sh.data[i].push('');}},
      getLastRow(){for(let i=sh.data.length-1;i>=0;i--){if(sh.data[i].some(v=>v!==''&&v!=null))return i+1;}return 0;},
      getMaxColumns(){return sh.maxCols;}, getMaxRows(){return Math.max(1000,sh.data.length);},
      insertColumnsAfter(a,n){sh.maxCols+=n;}, deleteColumns(a,n){sh.maxCols-=n;sh.data.forEach(r=>r.splice(a-1,n));globalThis.__del=(globalThis.__del||0)+1;},
      setFrozenRows(n){sh.frozen=n;},
      protect(){return {setDescription(){return this;},setWarningOnly(){return this;}};},
      deleteRow(r){sh.data.splice(r-1,1);},
      getRange(r,c,nr,nc){nr=nr||1;nc=nc||1;const rg={
        getValues(){sh._ensure(r+nr-1,c+nc-1);return sh.data.slice(r-1,r-1+nr).map(row=>row.slice(c-1,c-1+nc));},
        getDisplayValues(){return rg.getValues().map(row=>row.map(v=>String(v)));},
        setValues(v){if(v.length!==nr||v[0].length!==nc)throw new Error('size mismatch '+v.length+'x'+v[0].length+' vs '+nr+'x'+nc);sh._ensure(r+nr-1,c+nc-1);v.forEach((row,i)=>row.forEach((x,j)=>{sh.data[r-1+i][c-1+j]=x;}));return rg;},
        setValue(x){return rg.setValues([[x]]);},
        clearContent(){sh._ensure(r+nr-1,c+nc-1);for(let i=0;i<nr;i++)for(let j=0;j<nc;j++)sh.data[r-1+i][c-1+j]='';return rg;},
        setNumberFormat(){return rg;},setFontWeight(){return rg;},setBackground(){return rg;}};return rg;}
    };return sh;}
  const ss={getSheetByName:n=>sheets[n]||null,insertSheet:n=>(sheets[n]=mkSheet(n)),getSheets:()=>Object.values(sheets),deleteSheet:s=>{delete sheets[s.name];}};
  sheets['Munkalap1']=mkSheet('Munkalap1');
  G.__sheets=sheets;
  G.SpreadsheetApp={openById:()=>ss,flush(){}};
  const props={};
  G.PropertiesService={getScriptProperties:()=>({getProperty:k=>k in props?props[k]:null,setProperty:(k,v)=>{props[k]=String(v);},deleteProperty:k=>{delete props[k];},getProperties:()=>Object.assign({},props)})};
  const cache={};G.CacheService={getScriptCache:()=>({get:k=>cache[k]||null,put:(k,v)=>{cache[k]=v;},remove:k=>{delete cache[k];},getAll:ks=>{const o={};ks.forEach(k=>{if(k in cache)o[k]=cache[k];});return o;},putAll:m=>{Object.assign(cache,m);G.__cachePuts=(G.__cachePuts||0)+1;}})};
  G.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
  let uu=0;
  function hash(str){const out=[];let h1=0x811c9dc5;for(let k=0;k<32;k++){for(let i=0;i<str.length;i++){h1^=str.charCodeAt(i)+k;h1=Math.imul(h1,16777619);}out.push(((h1>>>0)&255)-128);}return out;}
  G.Utilities={getUuid:()=>{uu++;const r=()=>Math.floor(Math.random()*16).toString(16);return Array.from({length:32},r).join('').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/,'$1-$2-$3-$4-$5');},
    computeDigest:(alg,text)=>hash(text),DigestAlgorithm:{SHA_256:1},Charset:{UTF_8:1},sleep(){},
    formatDate:(d,tz,fmt)=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(d).reduce((o,x)=>(o[x.type]=x.value,o),{});
      return fmt.replace('yyyy',p.year).replace('MM',p.month).replace('dd',p.day).replace('HH',p.hour==='24'?'00':p.hour).replace('mm',p.minute).replace('ss',p.second);},
    parseDate:(t)=>new Date(t)};
  G.Session={getActiveUser:()=>({getEmail:()=>'ervin.egri@lumosmotion.com'}),getEffectiveUser:()=>({getEmail:()=>'ervin.egri@lumosmotion.com'})};
  G.Logger={log:(...a)=>{(G.__log=G.__log||[]).push(a.join(' '));}};
  G.__mails=[];
  G.GmailApp={getAliases:()=>['sales@lumosmotion.com','admin@lumosmotion.com'],sendEmail:(to,subj,body,opts)=>{G.__mails.push({to,subj,body,opts});}};
  G.ScriptApp={getService:()=>({getUrl:()=>'https://script.google.com/macros/s/TEST/exec'})};
  const folders={};let fid=0;
  function mkFolder(name){const f={id:'F'+(++fid),name,children:[],getId(){return f.id;},getUrl(){return 'https://drive.google.com/drive/folders/'+f.id;},isTrashed(){return false;},
    getFoldersByName(n){const m=f.children.filter(x=>x.name===n);let i=0;return {hasNext:()=>i<m.length,next:()=>m[i++]};},createFolder(n){const c=mkFolder(n);f.children.push(c);return c;}};folders[f.id]=f;return f;}
  const root=mkFolder('Projektek');folders['1qxSBbudO4atHkdOsfH6ur6oXc_tc9OnB']=root;root.createFolder('2026');
  G.__root=root;
  G.DriveApp={getFolderById:id=>{if(!folders[id])throw new Error('no folder');return folders[id];}};
  G.HtmlService={createHtmlOutputFromFile(){return {setTitle(){return this;},addMetaTag(){return this;}};}};
})(typeof window!=='undefined'?window:globalThis);

(function(G){
  const evs={};let n=0;
  function mk(title,s,e,allDay,o){const id='ev'+(++n)+'@google.com';const ev={_t:title,_s:s,_e:e,_ad:allDay,_d:(o&&o.description)||'',_l:(o&&o.location)||'',_tags:{},_g:[],
    getId:()=>id,_inv:(o&&o.sendInvites),getName:()=>'Terepi',getTitle:()=>ev._t,setTitle:t=>{ev._t=t;},setDescription:d=>{ev._d=d;},getDescription:()=>ev._d,setLocation:l=>{ev._l=l;},getLocation:()=>ev._l,
    setTag:(k,v)=>{ev._tags[k]=v;},getTag:k=>ev._tags[k]||null,isAllDayEvent:()=>ev._ad,getStartTime:()=>ev._s,getEndTime:()=>ev._e,getAllDayStartDate:()=>ev._s,getAllDayEndDate:()=>ev._e,
    setAllDayDates:(a,b)=>{ev._s=a;ev._e=b;ev._ad=true;},setTime:(a,b)=>{ev._s=a;ev._e=b;ev._ad=false;},
    getGuestList:()=>ev._g.map(m=>({getEmail:()=>m})),addGuest:m=>{ev._g.push(m);},removeGuest:m=>{ev._g=ev._g.filter(x=>x!==m);},deleteEvent:()=>{delete evs[id];}};evs[id]=ev;if(o&&o.guests)ev._g=o.guests.split(',');return ev;}
  const cal={getName:()=>'Terepi Munkák Lumos Motion',createAllDayEvent:(t,s,e,o)=>mk(t,s,e,true,o),createEvent:(t,s,e,o)=>mk(t,s,e,false,o),getEventById:id=>evs[id]||null,
    getEvents:(a,b)=>Object.values(evs).filter(ev=>ev._s<b&&ev._e>a)};
  G.__evs=evs;G.__mkEv=mk;
  G.CalendarApp={getCalendarById:()=>cal};
  const _pd=G.Utilities.parseDate;
  G.Utilities.parseDate=(t,tz,f)=>{const m=/^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?/.exec(t);const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+(m[4]||0)-1,+(m[5]||0)));return d;};
})(globalThis);
