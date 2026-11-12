/* 📝 Új szerződés (Ügyfelek fül): sablon választása → ügyfél és projekt adatai → minta (előnézet) → letöltés / mentés az ügyfél mappájába.
   A sablonok (docx) az Apps Scriptben vannak (contractTpl, csak ügyvezető); a kitöltés a böngészőben történik (JSZip), az előnézet docx-preview-val. */
const CT_TPL=[
  {k:'lumos_hatarozott',firm:'Lumos Motion Kft.',t:'Megbízási szerződés',d:'Egy projektre: helyszín, időpont, szolgáltatások, foglaló + végszámla (ÁFA-val).',hat:true,vat:true},
  {k:'lumos_keret',firm:'Lumos Motion Kft.',t:'Keretszerződés',d:'Visszatérő ügyfélnek: a megrendelések egyenként, a keret szerint.',hat:false,vat:true},
  {k:'egri_hatarozott',firm:'Egri Ervin E.V.',t:'Megbízási szerződés',d:'Egy projektre, alanyi adómentesen (ÁFA nélkül).',hat:true,vat:false},
  {k:'egri_keret',firm:'Egri Ervin E.V.',t:'Kizárólagos keretmegállapodás',d:'Visszatérő ügyfélnek, alanyi adómentesen.',hat:false,vat:false}];
const ctTplOf=k=>CT_TPL.find(x=>x.k===k)||CT_TPL[0];
const CT_CACHE={};
const ctScript=src=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(new Error('Nem tölthető be: '+src));document.head.appendChild(s);});
async function ctLibs(){if(!window.JSZip)await jszipLib();if(!window.docx||!window.docx.renderAsync)await ctScript('vendor/docx-preview.min.js');}
const ctToday=()=>{const d=new Date();return d.getFullYear()+'. '+String(d.getMonth()+1).padStart(2,'0')+'. '+String(d.getDate()).padStart(2,'0')+'.';};
const ctFt=n=>String(Math.round(num(n))).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
const ctDay=iso=>{if(!validISO(iso))return '';const d=toDate(iso);return iso.replace(/-/g,'. ')+'., '+F_WD_LONG(d);};
function F_WD_LONG(d){return ['vasárnap','hétfő','kedd','szerda','csütörtök','péntek','szombat'][d.getUTCDay()];}
function ctNew(){S.ct={step:1,tpl:'lumos_hatarozott',client:'',c_name:'',c_addr:'',c_tax:'',c_phone:'',c_email:'',c_rep:'',sig_name:'',sig_rep:'',date:ctToday(),pid:'',fee:'',locs:[{place:'',date:''}],svcs:[{name:'',qty:'1',ext:''}],rb_mode:'pct',rb_pct:'10',rb_min:'40000',rb_amt:'',rk_mode:'pct',rk_pct:'10',rk_min:'40000',rk_amt:'',rk_years:'5'};ctStep1();}
/* 1. lépés: sablon */
/* 1. lépés: két döntés – melyik cég nevében (Lumos Motion Kft. / Egri Ervin E.V.), és milyen szerződés (Megbízási / Keretszerződés) */
function ctStep1(){const c=S.ct,cur=ctTplOf(c.tpl),firm=c._picked?cur.k.split('_')[0]:'',kind=c._picked?(cur.hat?'hatarozott':'keret'):'';   // első megnyitáskor nincs előválasztás
  const opt=(name,v,on,t,d)=>`<label class="ct-tpl${on?' on':''}"><input type="radio" name="${name}" value="${v}"${on?' checked':''}><b>${t}</b>${d?`<small>${d}</small>`:''}</label>`;
  openModal('📝 Új szerződés – 1/3: sablon',`<p class="hint" style="margin:-4px 0 8px">Melyik cég nevében?</p><div class="ct-tpls" data-g="firm">
      ${opt('ct_firm','lumos',firm==='lumos','Lumos Motion Kft.','')}${opt('ct_firm','egri',firm==='egri','Egri Ervin E.V.','')}</div>
    <div id="ct-kind"${firm?'':' hidden'}><p class="hint" style="margin:16px 0 8px">Milyen szerződés?</p><div class="ct-tpls" data-g="kind">
      ${opt('ct_kind','hatarozott',kind==='hatarozott','Megbízási szerződés','Egy projektre: helyszín, időpont, szolgáltatások, díj.')}${opt('ct_kind','keret',kind==='keret','Keretszerződés','Visszatérő ügyfélnek: a megrendelések egyenként, a keret szerint.')}</div></div>`,
    {submitLabel:'Tovább →',noDraft:true,submit:fd=>{const f=fd.get('ct_firm'),k=fd.get('ct_kind');if(!f){toast('Válaszd ki, melyik cég nevében készül.',true);return;}if(!k){toast('Válaszd ki a szerződés típusát.',true);return;}
      c.tpl=f+'_'+k;c._picked=true;ctStep2();}});
  const sb=document.querySelector('#modalRoot .mfoot [type="submit"]');if(sb)sb.hidden=true;}   // nincs Tovább gomb: a típusra kattintva lép tovább
document.addEventListener('change',e=>{const t=e.target;if(t&&(t.name==='ct_firm'||t.name==='ct_kind')&&t.closest('.ct-tpls')){t.closest('.ct-tpls').querySelectorAll('.ct-tpl').forEach(l=>l.classList.toggle('on',l.contains(t)));
  if(t.name==='ct_firm'){const k=$('ct-kind');if(k&&k.hidden){k.hidden=false;k.scrollIntoView({block:'nearest',behavior:'smooth'});}}}});
/* a típusra kattintás (akkor is, ha már ki volt jelölve – pl. visszalépés után) azonnal a 2. lépésre visz */
document.addEventListener('click',e=>{const l=e.target.closest&&e.target.closest('[data-g="kind"] .ct-tpl');if(!l||!S.ct)return;const f=document.querySelector('input[name="ct_firm"]:checked'),k=l.querySelector('input');if(!f||!k)return;
  S.ct.tpl=f.value+'_'+k.value;S.ct._picked=true;setTimeout(ctStep2,120);});
/* 2. lépés: ügyfél (és egy projektre szóló szerződésnél a projekt) adatai */
function ctRead(fd){const c=S.ct;['rb_mode','rb_pct','rb_min','rb_amt','rk_mode','rk_pct','rk_min','rk_amt','rk_years'].forEach(k=>{if(fd.has(k))c[k]=String(fd.get(k)||'').trim();});['rb_min','rb_amt','rk_min','rk_amt','rk_years'].forEach(k=>{c[k]=String(c[k]||'').replace(/[^\d]/g,'');});c.rb_pct=String(c.rb_pct||'').replace(/[^\d.,]/g,'');c.rk_pct=String(c.rk_pct||'').replace(/[^\d.,]/g,'');['c_name','c_addr','c_tax','c_phone','c_email','c_rep','sig_name','sig_rep','date','fee'].forEach(k=>{if(fd.has(k))c[k]=String(fd.get(k)||'').trim();});
  c.fee=String(c.fee||'').replace(/\D/g,'');
  if(fd.has('loc_place_0')){c.locs=[];for(let i=0;fd.has('loc_place_'+i);i++)c.locs.push({place:String(fd.get('loc_place_'+i)||'').trim(),date:String(fd.get('loc_date_'+i)||'').trim()});}
  if(fd.has('svc_name_0')){c.svcs=[];for(let i=0;fd.has('svc_name_'+i);i++)c.svcs.push({name:String(fd.get('svc_name_'+i)||'').trim(),qty:String(fd.get('svc_qty_'+i)||'').trim(),ext:String(fd.get('svc_ext_'+i)||'').trim()});}}
function ctFillClient(name){const c=S.ct,cl=(S.clients||[]).find(x=>x.name===name);if(!cl)return;c.client=name;
  const rep=[cl.rep||cl.contactName,cl.repTitle||(cl.rep?'':cl.contactTitle)].filter(Boolean).join(', ');
  Object.assign(c,{c_name:cl.name||'',c_addr:cl.address||'',c_tax:cl.tax||'',c_phone:cl.repPhone||cl.contactPhone||'',c_email:cl.repEmail||cl.contactEmail||'',c_rep:rep,sig_name:cl.name||'',sig_rep:rep});}
function ctFillProject(pid){const c=S.ct,p=projById(pid);if(!p)return;c.pid=pid;const q=pr(p);
  c.locs=[{place:String(p.venue||'').trim(),date:q?(q.start===q.end?ctDay(q.start):ctDay(q.start)+' – '+ctDay(q.end)):''}];
  const sv=DELIVERABLES.filter(it=>num(p[it.k])>0).map(it=>({name:it.label,qty:String(num(p[it.k])),ext:''}));
  EXTRAS.filter(x=>p[x.k]&&!x.pct).forEach(x=>sv.push({name:x.label,qty:'1',ext:''}));if(p.x_nyersVetel)sv.push({name:'Nyersanyag átadása',qty:'1',ext:''});
  if(sv.length)c.svcs=sv;{const v=num(p.projectValue)||num(p.quotePrice);if(v)c.fee=String(Math.round(v));}if(!c.client&&p.client){ctFillClient(p.client);}}
function ctStep2(){const c=S.ct,tp=ctTplOf(c.tpl),f=(k,l,o={})=>`<div class="field${o.full?' full':''}"><label for="ct-${k}">${l}</label><input class="inp" id="ct-${k}" name="${k}" value="${esc(c[k]||'')}"${o.ph?` placeholder="${esc(o.ph)}"`:''}${o.im?` inputmode="${o.im}"`:''}></div>`;
  const cls=(S.clients||[]).slice().sort((a,b)=>String(a.name).localeCompare(String(b.name),'hu'));
  const prj=tp.hat?S.projects.filter(p=>p.status!=='lemondva'&&(!c.client||!p.client||p.client===c.client)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,60):[];
  const fee=num(c.fee),half=Math.round(fee/2);
  openModal(`📝 Új szerződés – 2/3: adatok`,`<p class="hint" style="margin:-4px 0 10px">${esc(tp.firm)} · ${esc(tp.t)}</p>
    <div class="fields"><div class="field full"><label for="ct-cl">Ügyfél a listából</label><select class="inp" id="ct-cl" data-cmb="Ügyfél kiválasztása (kitölti az adatokat)…"><option value="">– kézzel töltöm ki –</option>${cls.map(x=>`<option value="${esc(x.name)}"${c.client===x.name?' selected':''}>${esc(x.name)}</option>`).join('')}</select></div>
    <h4 class="sub-h full" style="margin:6px 0 0">Megrendelő</h4>
    ${f('c_name','Név',{full:true})}${f('c_addr','Cím',{full:true})}${f('c_tax','Adószám')}${f('c_phone','Telefonszám')}${f('c_email','E-mail cím')}${f('c_rep','Képviseli',{ph:'Név, titulus'})}
    ${tp.hat?`<h4 class="sub-h full" style="margin:10px 0 0">Projekt</h4>
    <div class="field full"><label for="ct-pj">Kitöltés projektből (nem kötelező)</label><select class="inp" id="ct-pj" data-cmb="Projekt kiválasztása…"><option value="">–</option>${prj.map(p=>`<option value="${esc(p.id)}"${c.pid===p.id?' selected':''}>${esc((p.date||'')+' · '+(p.name||''))}</option>`).join('')}</select></div>
    <div class="field full"><label>Helyszín és dátum</label><div class="ct-rows">${c.locs.map((l,i)=>`<div class="ct-row ct-row2"><input class="inp" name="loc_place_${i}" value="${esc(l.place)}" placeholder="Helyszín"><input class="inp" name="loc_date_${i}" value="${esc(l.date)}" placeholder="Dátum, pl. 2026. 11. 07., szombat">${c.locs.length>1?`<button type="button" class="mini ct-del" data-action="ct-row-del" data-t="locs" data-i="${i}" aria-label="Sor törlése">✕</button>`:''}</div>`).join('')}</div><button type="button" class="linkbtn" data-action="ct-row-add" data-t="locs">+ Helyszín</button></div>
    <div class="field full"><label>Szolgáltatások</label><div class="ct-rows"><div class="ct-row ct-row3 ct-hd"><span>Megnevezés</span><span>Darab</span><span>Terjedelem</span></div>${c.svcs.map((s,i)=>`<div class="ct-row ct-row3"><input class="inp" name="svc_name_${i}" value="${esc(s.name)}" placeholder="pl. Aftermovie"><input class="inp" name="svc_qty_${i}" value="${esc(s.qty)}" inputmode="numeric"><input class="inp" name="svc_ext_${i}" value="${esc(s.ext)}" placeholder="pl. 1–1,5 perc">${c.svcs.length>1?`<button type="button" class="mini ct-del" data-action="ct-row-del" data-t="svcs" data-i="${i}" aria-label="Sor törlése">✕</button>`:''}</div>`).join('')}</div><button type="button" class="linkbtn" data-action="ct-row-add" data-t="svcs">+ Szolgáltatás</button></div>
    <div class="field"><label for="ct-fee">Díj összesen (nettó)</label><div class="money"><input class="inp money-inp" id="ct-fee" name="fee" value="${esc(c.fee?ctFt(c.fee):'')}" inputmode="numeric" data-money="big"><span class="money-unit">Ft</span></div>${tp.vat?`<span class="hint" id="ct-half">Foglaló és végszámla: 2 × ${ctFt(half)} Ft + ÁFA</span>`:'<span class="hint">Alanyi adómentes – ÁFA nélkül</span>'}</div>`:''}
    <h4 class="sub-h full" style="margin:10px 0 0">Nyersanyag (opcionális szolgáltatások)</h4>
    ${ctRawRow('rb','Nyersanyag átadása','Mennyiért adjuk át a teljes nyersanyagot?')}
    ${ctRawRow('rk','Archiválás a NAS rendszerünkön','Mennyiért őrizzük meg a nyersanyagot?')}
    <div class="field"><label for="ct-rk_years">Archiválás időtartama</label><div class="money"><input class="inp" id="ct-rk_years" name="rk_years" value="${esc(c.rk_years||'5')}" inputmode="numeric" style="max-width:90px"><span class="money-unit">év</span></div></div>
    <h4 class="sub-h full" style="margin:10px 0 0">Aláírás</h4>
    ${f('sig_name','Aláíró cég (Megrendelő)')}${f('sig_rep','Képviseli (aláírás alatt)')}${f('date','Kelt (dátum)',{ph:'2026. 11. 12.'})}</div>`,
    {submitLabel:'Minta megtekintése →',noDraft:true,left:`<button type="button" class="btn ghost" data-action="ct-back" data-s="1">← Vissza</button>`,submit:fd=>{ctRead(fd);const c2=S.ct;
      if(!c2.c_name){toast('Add meg a megrendelő nevét.',true);return;}if(!c2.sig_name)c2.sig_name=c2.c_name;if(!c2.sig_rep)c2.sig_rep=c2.c_rep;if(tp.hat&&!num(String(c2.fee).replace(/\s/g,''))){toast('Add meg a díjat.',true);return;}ctStep3();}});}
document.addEventListener('change',e=>{const t=e.target;if(!t||!S.ct)return;
  if(t.id==='ct-cl'||t.id==='ct-pj'){const f=$('mform');if(f)ctRead(new FormData(f));if(t.id==='ct-cl'){if(t.value)ctFillClient(t.value);else S.ct.client='';}else if(t.value)ctFillProject(t.value);else S.ct.pid='';ctStep2();}});
document.addEventListener('input',e=>{const t=e.target;if(t&&t.id==='ct-fee'){const h=$('ct-half'),n=num(String(t.value).replace(/\s/g,''));if(h)h.textContent='Foglaló és végszámla: 2 × '+ctFt(Math.round(n/2))+' Ft + ÁFA';}});
Object.assign(ACT,{
  'new-contract':()=>{if(!isAdmin())return;ctNew();},
  'ct-back':b=>{const f=$('mform');if(f&&S.ct.step!==3)ctRead(new FormData(f));b.dataset.s==='1'?ctStep1():ctStep2();},
  'ct-row-add':b=>{const f=$('mform');if(f)ctRead(new FormData(f));const k=b.dataset.t;S.ct[k].push(k==='locs'?{place:'',date:''}:{name:'',qty:'1',ext:''});ctStep2();},
  'ct-row-del':b=>{const f=$('mform');if(f)ctRead(new FormData(f));S.ct[b.dataset.t].splice(Number(b.dataset.i),1);ctStep2();},
  'ct-pdf':async b=>{b.disabled=true;const t=b.textContent;b.textContent='PDF készül…';try{const r=await ctBuild(),b64=(S.ct&&S.ct._pdf)||await ctPdf(r.blob),bin=atob(b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([u8],{type:'application/pdf'}));a.download=r.name.replace(/\.docx$/i,'')+'.pdf';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}catch(e){handleErr(e);}finally{b.disabled=false;b.textContent=t;}},
  'ct-dl':async()=>{try{const r=await ctBuild();const a=document.createElement('a');a.href=URL.createObjectURL(r.blob);a.download=r.name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}catch(e){handleErr(e);}}
});
/* a docx kitöltése: {mező} helyőrzők; a helyszín- és szolgáltatássor annyiszor ismétlődik, ahány tétel van */
async function ctBuild(){const c=S.ct,tp=ctTplOf(c.tpl);await ctLibs();
  const t=CT_CACHE[c.tpl]||(CT_CACHE[c.tpl]=await call('contractTpl',{k:c.tpl}));
  const z=await window.JSZip.loadAsync(t.zip,{base64:true});z.file('word/media/image1.png',t.img,{base64:true});
  let x=await z.file('word/document.xml').async('string');
  const X=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const fill=(s,o)=>s.replace(/\{(\w+)\}/g,(m,k)=>Object.prototype.hasOwnProperty.call(o,k)?X(o[k]):m);
  const rep=(s,tok,items)=>{const i=s.indexOf(tok);if(i<0)return s;const st=Math.max(s.lastIndexOf('<w:tr ',i),s.lastIndexOf('<w:tr>',i)),en=s.indexOf('</w:tr>',i)+7;const row=s.slice(st,en);return s.slice(0,st)+items.map(it=>fill(row,it)).join('')+s.slice(en);};
  const fee=num(String(c.fee).replace(/\s/g,'')),dep=Math.round(fee/2);
  if(tp.hat){const L=c.locs.filter(l=>l.place||l.date),V=c.svcs.filter(s=>s.name);
    x=rep(x,'{l_place}',(L.length?L:[{place:'',date:''}]).map((l,i)=>({l_n:(i+1)+'.',l_place:l.place,l_date:l.date})));
    x=rep(x,'{s_name}',(V.length?V:[{name:'',qty:'',ext:''}]).map(s=>({s_name:s.name,s_qty:s.qty,s_ext:s.ext})));}
  x=fill(x,{raw_buy:ctRawText('rb',tp),raw_keep:ctRawText('rk',tp),c_name:c.c_name,c_addr:c.c_addr,c_tax:c.c_tax,c_phone:c.c_phone,c_email:c.c_email,c_rep:c.c_rep,sig_name:c.sig_name||c.c_name,sig_rep:c.sig_rep||c.c_rep,date:c.date,fee_dep:ctFt(dep),fee_fin:ctFt(fee-dep),fee_tot:ctFt(fee)});
  if(!(c.sig_rep||c.c_rep))x=x.replace(/képviseli: \{sig_rep\}/,'');
  z.file('word/document.xml',x);
  const blob=await z.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  const nm=(tp.hat?'Megbizasi_szerzodes':'Keretszerzodes')+'_'+String(c.c_name||'ugyfel').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\w]+/g,'_').replace(/^_|_$/g,'')+'.docx';
  return {blob,name:nm};}
/* 3. lépés: minta (előnézet) */
/* a Word-számozást (CSS counter / counter-set) a PDF-rajzoló nem ismeri jól („3.8.” „3.1.” helyett): kiszámoljuk, és szövegként írjuk be */
function ctFixCounters(root){const C={},roman=(n,up)=>{const m=[[1000,'m'],[900,'cm'],[500,'d'],[400,'cd'],[100,'c'],[90,'xc'],[50,'l'],[40,'xl'],[10,'x'],[9,'ix'],[5,'v'],[4,'iv'],[1,'i']];let s='';m.forEach(([v,r])=>{while(n>=v){s+=r;n-=v;}});return up?s.toUpperCase():s;};
  const fmt=(n,st)=>st==='lower-alpha'||st==='lower-latin'?String.fromCharCode(96+((n-1)%26+1)):st==='upper-alpha'||st==='upper-latin'?String.fromCharCode(64+((n-1)%26+1)):st==='lower-roman'?roman(n):st==='upper-roman'?roman(n,true):st==='decimal-leading-zero'?String(n).padStart(2,'0'):String(n);
  const parse=v=>{const out=[];if(!v||v==='none')return out;const re=/(-?[A-Za-z_][\w-]*)(?:\s+(-?\d+))?/g;let m;while((m=re.exec(v)))out.push([m[1],m[2]==null?null:+m[2]]);return out;};
  const apply=cs=>{parse(cs.counterReset).forEach(([n,v])=>{C[n]=v==null?0:v;});parse(cs.counterSet).forEach(([n,v])=>{C[n]=v==null?0:v;});parse(cs.counterIncrement).forEach(([n,v])=>{C[n]=(C[n]||0)+(v==null?1:v);});};
  const unesc=x=>x.replace(/\\([0-9a-fA-F]{1,6})\s?/g,(a,h)=>String.fromCodePoint(parseInt(h,16))).replace(/\\(.)/g,'$1');
  const cssStr=x=>'"'+x.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\t/g,'  ').replace(/\n/g,' ')+'"';
  let css='',i=0;
  root.querySelectorAll('*').forEach(el=>{apply(getComputedStyle(el));const b=getComputedStyle(el,'::before');apply(b);const ct=b.content;if(!ct||ct.indexOf('counter')<0)return;
    const txt=ct.replace(/"((?:[^"\\]|\\.)*)"|counters?\(([\w-]+)(?:,\s*"[^"]*")?(?:,\s*([\w-]+))?\)|\s+/g,(all,str,name,st)=>str!=null?unesc(str):name?fmt(C[name]||0,st||'decimal'):'');
    const id='cn'+(i++);el.setAttribute('data-cn',id);css+=`[data-cn="${id}"]::before{content:${cssStr(txt)}!important;counter-increment:none!important;counter-reset:none!important;counter-set:none!important}`;});
  const st=document.createElement('style');st.textContent=css;root.appendChild(st);}
/* a szerződés táblázatai a lapon belül maradnak (az app általános min. 780 px-es táblázatszélessége és a Word lebegő táblázatai széthúznák) */
function ctTidy(box){const hy=document.createElement('style');hy.textContent='section.docx,section.docx *{hyphens:manual!important;-webkit-hyphens:manual!important}';box.appendChild(hy);   // a böngésző automatikus elválasztását a PDF-rajzoló nem ismeri (szóvégek levágódtak)
  box.querySelectorAll('section.docx table').forEach(t=>{t.style.minWidth='0';if(t.closest('td'))return;const cols=[...t.querySelectorAll(':scope > colgroup > col')],ws=cols.map(c=>parseFloat(c.style.width)||0),sum=ws.reduce((a,b)=>a+b,0);
  t.style.float='none';t.style.marginLeft='0';t.style.marginRight='0';t.style.width='100%';t.style.tableLayout='fixed';if(cols.length===2&&sum>0){cols[0].style.width='30%';cols[1].style.width='70%';}else if(sum>0)cols.forEach((c,i)=>{c.style.width=(ws[i]/sum*100)+'%';});   // a két oszlopos (adat)táblázatok egyforma oszlopokkal
  t.querySelectorAll('td,th').forEach(td=>{td.style.wordBreak='break-word';});});}
/* a kitöltött szerződés PDF-ben: a docx megjelenítve, majd A4-es oldalakra tördelve (ami elfér egy oldalon, nem vágódik ketté) */
/* a PDF-et a Google készíti a kitöltött Word-fájlból (ugyanúgy néz ki, mint Wordből exportálva); ha nem sikerül, tartalékként a böngésző rajzolja */
async function ctPdf(blob){try{const docx=await new Promise((ok,no)=>{const fr=new FileReader();fr.onload=()=>ok(String(fr.result).split(',')[1]||'');fr.onerror=no;fr.readAsDataURL(blob);});
    const r=await call('contractPdf',{docx});if(r&&r.pdf)return r.pdf;}catch(e){console.warn('Google PDF nem sikerült, tartalék:',e);}
  return ctPdfLocal(blob);}
async function ctPdfLocal(blob){await ctLibs();const lib=await h2pLib(),host=document.createElement('div');host.style.cssText='position:fixed;left:0;top:0;z-index:-1;width:794px;background:#fff';host.innerHTML='<div style="width:794px;background:#fff"></div>';document.body.appendChild(host);const box=host.firstElementChild;   // a rögzített (fixed) gazdát nem adjuk át a PDF-készítőnek, csak a belső dobozt
  try{await window.docx.renderAsync(blob,box,box,{useBase64URL:true,inWrapper:true,ignoreLastRenderedPageBreak:true,breakPages:false,ignoreHeight:true});
    box.querySelectorAll('.docx-wrapper').forEach(w=>{w.style.background='#fff';w.style.padding='0';w.style.display='block';});
    box.querySelectorAll('section.docx').forEach(x=>{x.style.paddingBottom='0';x.style.minHeight='0';x.style.boxShadow='none';x.style.margin='0';x.style.background='#fff';});
    ctTidy(box);ctFixCounters(box);
    await Promise.all([...host.querySelectorAll('img')].map(im=>im.complete?0:new Promise(r=>{im.onload=im.onerror=r;})));if(document.fonts&&document.fonts.ready)await document.fonts.ready;
    const M=12,pageH=794*(297-2*M)/210,top0=box.getBoundingClientRect().top,sec=box.querySelector('section.docx');
    const els=sec?[...sec.children].flatMap(c=>c.tagName==='ARTICLE'?[...c.children]:[c]):[];let ps=0;
    els.forEach(el=>{const r=el.getBoundingClientRect(),t=r.top-top0,b=r.bottom-top0;if(b-ps<=pageH+1)return;
      if(r.height<=pageH&&t>ps+1){const sp=document.createElement('div');sp.style.cssText='height:'+(ps+pageH-t)+'px';el.parentNode.insertBefore(sp,el);
        const t2=el.getBoundingClientRect().top-top0,over=t2-(ps+pageH);if(over>0)sp.style.height=Math.max(0,parseFloat(sp.style.height)-over)+'px';ps+=pageH;}
      else{while(b-ps>pageH)ps+=pageH;}});
    const uri=await lib().set({margin:[M,0,M,0],image:{type:'jpeg',quality:.95},html2canvas:{scale:2,scrollX:0,scrollY:0,useCORS:true},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:[]}}).from(box).outputPdf('datauristring');
    return String(uri).split(',')[1]||'';}
  finally{host.remove();}}
async function ctStep3(keep){const c=S.ct,tp=ctTplOf(c.tpl);c.step=3;if(!keep)c._pdf=null;
  openModal('📝 Új szerződés – 3/3: minta',`<p class="hint" style="margin:-4px 0 10px">${esc(tp.firm)} · ${esc(tp.t)} · ${esc(c.c_name)} – így fog kinézni. Ha valami nem stimmel, menj vissza és javítsd.</p><div class="ct-prev" id="ctPrev"><div class="loading"><span class="spin"></span>Minta készítése…</div></div>`,
    {submitLabel:'💾 Mentés a mappába',noDraft:true,left:`<button type="button" class="btn ghost" data-action="ct-back" data-s="2">← Vissza</button><button type="button" class="btn outline" data-action="ct-dl" title="Letöltés Word-fájlként">⬇ .docx</button><button type="button" class="btn outline" data-action="ct-pdf" title="Letöltés PDF-ként">⬇ .pdf</button><button type="button" class="btn outline" data-action="ct-send">📨 Küldés</button>`,
     submit:async()=>{const r=await ctBuild();const b64=c._pdf||await ctPdf(r.blob),pdfName=r.name.replace(/\.docx$/i,'')+'.pdf';   // az ügyfél mappájába PDF kerül
       const d=await call('clientDocUpload',{client:c.client||c.c_name,b64,name:pdfName,mime:'application/pdf',kind:tp.hat?'egyeb':'keret'});
       closeModal();toast('Szerződés mentve: '+(c.client||c.c_name));if(d&&typeof billApply==='function')try{billApply(d);}catch(e){}render(true);}});
  const box=$('ctPrev');document.querySelector('#mform')&&document.querySelector('#mform').classList.add('ct-wide');
  try{const r=await ctBuild(),b64=c._pdf||await ctPdf(r.blob);c._pdf=b64;if(!$('ctPrev'))return;   // a minta maga a PDF (oldalanként), pontosan ez kerül a mappába
    const lib=await pdfLib(),bin=atob(b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
    const doc=await lib.getDocument({data:u8,isEvalSupported:false}).promise,pages=[];
    for(let i=1;i<=doc.numPages;i++){const pg=await doc.getPage(i),vp=pg.getViewport({scale:1.6}),cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;pages.push(cv.toDataURL('image/jpeg',.88));}
    box.innerHTML=`<div class="ct-pages">${pages.map((u,i)=>`<div class="ct-page"><img src="${u}" alt="${i+1}. oldal"><span class="ct-pn">${i+1}/${pages.length}</span></div>`).join('')}</div>`;}
  catch(e){if(box)box.innerHTML=`<p class="bad-txt">A minta nem készíthető el: ${esc(errText(e))}</p>`;}}

/* 📨 Küldés: a szerződés PDF-je e-mailben az ügyfélnek – előtte a levél előnézete (a szöveg szerkeszthető), kérésre mentés az ügyfél mappájába is */
const ctFirst=x=>{const n=String(x||'').split(',')[0].trim().split(/\s+/);return n.length>1?n[n.length-1]:n[0]||'';};
async function ctSendPrev(){const c=S.ct,tp=ctTplOf(c.tpl);if(!c)return;
  if(!c.mail)c.mail={to:c.c_email||'',cc:'',subject:tp.t+' – '+(c.c_name||''),save:true,
    body:`Kedves ${ctFirst(c.c_rep)||'Ügyfelünk'}!\n\nCsatolva küldöm a ${tp.t.toLowerCase()} tervezetét. Kérlek, nézd át, és ha mindent rendben találsz, küldd vissza aláírva.\n\nHa bármi kérdés felmerül, szívesen segítek.`};
  if(!c.sig)try{c.sig=await call('contractSig',{});}catch(e){c.sig={};}
  const m=c.mail,sg=c.sig||{},fname=(await ctBuild()).name.replace(/\.docx$/i,'')+'.pdf';c._fname=fname;
  openModal('📨 Szerződés küldése',`<div class="fgrid"><div class="field"><label for="ctm-to">Címzett</label><input class="inp" id="ctm-to" name="ctm_to" value="${esc(m.to)}" placeholder="ugyfel@ceg.hu"></div>
    <div class="field"><label for="ctm-cc">Másolat (nem kötelező)</label><input class="inp" id="ctm-cc" name="ctm_cc" value="${esc(m.cc)}"></div>
    <div class="field full"><label for="ctm-subj">Tárgy</label><input class="inp" id="ctm-subj" name="ctm_subj" value="${esc(m.subject)}"></div></div>
    <div class="q-mail" style="margin-top:6px"><div class="q-mh"><div><span>Feladó:</span> ${esc(sg.name||'')} · Lumos Motion &lt;${esc(sg.from||sg.email||'')}&gt;</div><div><span>Melléklet:</span> 📎 ${esc(fname)}</div></div>
      <div class="q-mb"><div id="ctm-body" class="q-mbody" contenteditable="true" spellcheck="true" title="Kattints bele és írd át – így megy ki">${esc(m.body).replace(/\n/g,'<br>')}</div><br>${sg.sigHtml||''}</div></div>
    <label class="q-disc-on" style="margin-top:12px"><input type="checkbox" name="ctm_save"${m.save?' checked':''}> 💾 Mentés az ügyfél mappájába is (PDF)</label>`,
    {submitLabel:'📨 Küldés',noDraft:true,left:`<button type="button" class="btn ghost" data-action="ct-send-back">← Vissza a mintához</button>`,
     submit:async fd=>{m.to=String(fd.get('ctm_to')||'').trim();m.cc=String(fd.get('ctm_cc')||'').trim();m.subject=String(fd.get('ctm_subj')||'').trim();m.save=fd.has('ctm_save');
       if(!/@/.test(m.to)){toast('Add meg a címzett e-mail-címét.',true);return;}
       if(!confirm('Elküldöd a szerződést ide: '+m.to+'?'))return;
       const b64=c._pdf||await ctPdf((await ctBuild()).blob);
       const r=await call('contractSend',{client:c.client||c.c_name,to:m.to,cc:m.cc,subject:m.subject,body:m.body,pdf:b64,fileName:fname,save:m.save,kind:tp.hat?'egyeb':'keret'});
       closeModal();toast(r.test?'Teszt üzemmód: a levél hozzád ment ki.':'✅ Szerződés elküldve: '+m.to+(m.save&&r.saved&&!r.saved.error?' · mentve az ügyfél mappájába':''));
       if(r.saved&&r.saved.error)toast('A mentés nem sikerült: '+r.saved.error,true);else if(r.saved&&typeof billApply==='function')try{billApply(r.saved);}catch(e){}
       S.ct=null;render(true);}});
  const mb=document.querySelector('#modalRoot .mbox');if(mb)mb.classList.add('mbox-wide','mbox-scroll');}
Object.assign(ACT,{
  'ct-send':async b=>{if(!S.ct)return;b.disabled=true;try{if(!S.ct._pdf)S.ct._pdf=await ctPdf((await ctBuild()).blob);await ctSendPrev();}catch(e){handleErr(e);b.disabled=false;}},
  'ct-send-back':()=>{if(S.ct)ctStep3(true);},
});
document.addEventListener('input',e=>{const t=e.target;if(t&&t.id==='ctm-body'&&S.ct&&S.ct.mail)S.ct.mail.body=t.innerText.replace(/ /g,' ').replace(/\n{3,}/g,'\n\n').replace(/\s+$/,'');});
document.addEventListener('paste',e=>{const t=e.target&&e.target.closest&&e.target.closest('#ctm-body');if(!t)return;e.preventDefault();document.execCommand('insertText',false,(e.clipboardData||window.clipboardData).getData('text/plain'));});

/* Nyersanyag-átadás és NAS-archiválás díja a szerződésben: %-os (minimummal) / fix összeg / e-mailben egyeztetett */
const CT_RAW_MODES=[['pct','A projekt nettó díjának %-a, minimummal'],['fix','Fix összeg'],['mail','Projektenként, e-mailben egyeztetve']];
function ctRawRow(p,label,hint){const c=S.ct,m=c[p+'_mode']||'pct',vat=ctTplOf(c.tpl).vat;
  return `<div class="field full ct-raw" data-raw="${p}"><label for="ct-${p}_mode">${label}</label><div class="ct-raw-row">
    <select class="inp" id="ct-${p}_mode" name="${p}_mode" data-cmb="${esc(hint)}">${CT_RAW_MODES.map(([v,t])=>`<option value="${v}"${m===v?' selected':''}>${t}</option>`).join('')}</select>
    <span class="ct-raw-pct"${m==='pct'?'':' hidden'}><span class="money"><input class="inp" name="${p}_pct" value="${esc(c[p+'_pct']||'')}" inputmode="decimal" style="max-width:80px"><span class="money-unit">%</span></span>
      <span class="money"><span class="ct-raw-lbl">de legalább</span><input class="inp money-inp" name="${p}_min" value="${esc(c[p+'_min']?ctFt(c[p+'_min']):'')}" inputmode="numeric" data-money="1" placeholder="0" style="max-width:130px"><span class="money-unit">Ft${vat?' + ÁFA':''}</span></span></span>
    <span class="ct-raw-fix"${m==='fix'?'':' hidden'}><span class="money"><input class="inp money-inp" name="${p}_amt" value="${esc(c[p+'_amt']?ctFt(c[p+'_amt']):'')}" inputmode="numeric" data-money="1" placeholder="0" style="max-width:150px"><span class="money-unit">Ft${vat?' + ÁFA':''}</span></span></span>
    </div></div>`;}
document.addEventListener('change',e=>{const t=e.target;if(!t||!/^(rb|rk)_mode$/.test(t.name||''))return;const w=t.closest('.ct-raw');if(!w)return;
  w.querySelector('.ct-raw-pct').hidden=t.value!=='pct';w.querySelector('.ct-raw-fix').hidden=t.value!=='fix';});
const CT_NUMW=['nulla','egy','kettő','három','négy','öt','hat','hét','nyolc','kilenc','tíz','tizenegy','tizenkettő','tizenhárom','tizennégy','tizenöt'];
function ctRawText(p,tp){const c=S.ct,m=c[p+'_mode']||'pct',v=tp.vat?' + ÁFA':'',n=x=>num(String(x||'').replace(/[^\d]/g,'')),pc=String(c[p+'_pct']||'10').replace('.',','),mn=n(c[p+'_min']),am=n(c[p+'_amt']);
  const price=m==='mail'?'a Felek által projektenként e-mailben egyeztetett díj ellenében':m==='fix'?`${ctFt(am)} Ft${v} díj ellenében`:`a projekt nettó díjának ${pc}%-a${mn?`, de legalább ${ctFt(mn)} Ft${v}`:v} díj ellenében`;
  if(p==='rb')return `A Megrendelő kérésére a Szolgáltató a projekt során keletkezett teljes nyersanyagállományt ${price} átadja a Megrendelő részére.`;
  const y=Math.max(1,Math.min(15,Math.round(n(c.rk_years)||5)));
  return `A teljes nyersanyagállományt a Szolgáltató saját NAS rendszerén ${y} (${CT_NUMW[y]}) évig archiválja, ${price}.`;}
