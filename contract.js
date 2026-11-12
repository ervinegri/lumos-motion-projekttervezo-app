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
function ctNew(){S.ct={step:1,tpl:'lumos_hatarozott',client:'',c_name:'',c_addr:'',c_tax:'',c_phone:'',c_email:'',c_rep:'',sig_name:'',sig_rep:'',date:ctToday(),pid:'',fee:'',locs:[{place:'',date:''}],svcs:[{name:'',qty:'1',ext:''}]};ctStep1();}
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
  if(t.name==='ct_firm'){const k=$('ct-kind');if(k&&k.hidden){k.hidden=false;k.scrollIntoView({block:'nearest',behavior:'smooth'});}}
  if(t.name==='ct_kind'&&S.ct){const f=document.querySelector('input[name="ct_firm"]:checked');if(f){S.ct.tpl=f.value+'_'+t.value;S.ct._picked=true;setTimeout(ctStep2,120);}}}});
/* 2. lépés: ügyfél (és egy projektre szóló szerződésnél a projekt) adatai */
function ctRead(fd){const c=S.ct;['c_name','c_addr','c_tax','c_phone','c_email','c_rep','sig_name','sig_rep','date','fee'].forEach(k=>{if(fd.has(k))c[k]=String(fd.get(k)||'').trim();});
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
  x=fill(x,{c_name:c.c_name,c_addr:c.c_addr,c_tax:c.c_tax,c_phone:c.c_phone,c_email:c.c_email,c_rep:c.c_rep,sig_name:c.sig_name||c.c_name,sig_rep:c.sig_rep||c.c_rep,date:c.date,fee_dep:ctFt(dep),fee_fin:ctFt(fee-dep),fee_tot:ctFt(fee)});
  if(!(c.sig_rep||c.c_rep))x=x.replace(/képviseli: \{sig_rep\}/,'');
  z.file('word/document.xml',x);
  const blob=await z.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  const nm=(tp.hat?'Megbizasi_szerzodes':'Keretszerzodes')+'_'+String(c.c_name||'ugyfel').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\w]+/g,'_').replace(/^_|_$/g,'')+'.docx';
  return {blob,name:nm};}
/* 3. lépés: minta (előnézet) */
async function ctStep3(){const c=S.ct,tp=ctTplOf(c.tpl);c.step=3;
  openModal('📝 Új szerződés – 3/3: minta',`<p class="hint" style="margin:-4px 0 10px">${esc(tp.firm)} · ${esc(tp.t)} · ${esc(c.c_name)} – így fog kinézni. Ha valami nem stimmel, menj vissza és javítsd.</p><div class="ct-prev" id="ctPrev"><div class="loading"><span class="spin"></span>Minta készítése…</div></div>`,
    {submitLabel:'💾 Mentés az ügyfél mappájába',noDraft:true,left:`<button type="button" class="btn ghost" data-action="ct-back" data-s="2">← Vissza</button><button type="button" class="btn outline" data-action="ct-dl">⬇ Letöltés (.docx)</button>`,
     submit:async()=>{const r=await ctBuild();const b64=await new Promise((ok,no)=>{const fr=new FileReader();fr.onload=()=>ok(String(fr.result).split(',')[1]||'');fr.onerror=no;fr.readAsDataURL(r.blob);});
       const d=await call('clientDocUpload',{client:c.client||c.c_name,b64,name:r.name,mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',kind:tp.hat?'egyeb':'keret'});
       closeModal();toast('Szerződés mentve: '+(c.client||c.c_name));if(d&&typeof billApply==='function')try{billApply(d);}catch(e){}render(true);}});
  const box=$('ctPrev');document.querySelector('#mform')&&document.querySelector('#mform').classList.add('ct-wide');
  try{const r=await ctBuild();if(!$('ctPrev'))return;box.innerHTML='';await window.docx.renderAsync(r.blob,box,null,{useBase64URL:true,inWrapper:true,ignoreLastRenderedPageBreak:true,breakPages:true});}
  catch(e){if(box)box.innerHTML=`<p class="bad-txt">A minta nem készíthető el: ${esc(errText(e))}</p>`;}}
