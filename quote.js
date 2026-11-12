/* 📄 Árajánlat a lehetőségből (Értékesítés): tételek → előnézet (levél + PDF) → küldés az értékesítő nevével, címével és aláírásával, PDF melléklettel.
   A PDF a böngészőben készül (html2pdf, vendor), a levelet az Apps Script küldi (dealQuoteSend). */
const Q_VAT=27;
const qFt=n=>String(Math.round(num(n))).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
const qNum=v=>num(String(v==null?'':v).replace(/[^\d.,-]/g,'').replace(',','.'));
const qDate=d=>d.getFullYear()+'. '+String(d.getMonth()+1).padStart(2,'0')+'. '+String(d.getDate()).padStart(2,'0')+'.';
let H2P=null;const h2pLib=()=>H2P||(H2P=new Promise((ok,no)=>{if(window.html2pdf)return ok(window.html2pdf);const s=document.createElement('script');s.src='vendor/html2pdf.bundle.min.js';s.onload=()=>ok(window.html2pdf);s.onerror=()=>{H2P=null;no(new Error('A PDF-készítő nem tölthető be.'));};document.head.appendChild(s);}));
function qFirst(n){const p=String(n||'').trim().split(/\s+/);return p.length>1?p[p.length-1]:p[0]||'';}
function qInit(d){const sv=String(d.services||'').split(',').map(x=>x.trim()).filter(Boolean),v=num(d.value);
  const items=sv.length?sv.map((x,i)=>({name:x,qty:'1',price:sv.length===1&&v?String(v):''})):[{name:d.title||'Videós szolgáltatás',qty:'1',price:v?String(v):''}];
  const no='A-'+todayISO().replace(/-/g,'')+'-'+String(d.id||'').replace(/[^a-z0-9]/gi,'').slice(0,4).toUpperCase();
  const ev=!!d.title,a=qAuto(d,ev);S.q={dealId:d.id,to:d.contactEmail||'',cc:'',subject:a.subject,items,valid:'15',note:'',no,ev,body:a.body,sig:null};}
/* konkrét rendezvényre szóló vagy általános ajánlat: a tárgy és a levél alapszövege ehhez igazodik */
function qAuto(d,ev){return {subject:ev&&d.title?'Árajánlat – '+d.title:'Árajánlat – Lumos Motion',
  body:`Kedves ${qFirst(d.contactName)||'Ügyfelünk'}!\n\nKöszönöm az érdeklődést! Csatolva küldöm az árajánlatunkat${ev&&d.title?' a(z) „'+d.title+'” rendezvényhez':''}. Ha bármi kérdés felmerül, vagy módosítanátok rajta, szívesen segítek.`};}
function qRead(fd){const q=S.q;if(fd.has('q_ev'))q.ev=fd.get('q_ev')==='1';['to','cc','subject','valid','note','body','disc','discLbl'].forEach(k=>{if(fd.has('q_'+k))q[k]=String(fd.get('q_'+k)||'').trim();});
  if(fd.has('qi_name_0')){q.items=[];for(let i=0;fd.has('qi_name_'+i);i++)q.items.push({name:String(fd.get('qi_name_'+i)||'').trim(),qty:String(fd.get('qi_qty_'+i)||'').trim(),price:String(fd.get('qi_price_'+i)||'').replace(/\s/g,'')});}}
const qGross=()=>S.q.items.reduce((a,it)=>a+qNum(it.qty||1)*qNum(it.price),0);   // tételek összege (kedvezmény előtt)
const Q_DISC_MAX=20;const qDiscPct=()=>Math.min(Q_DISC_MAX,Math.max(0,qNum(S.q.disc)));   // legfeljebb 20%
const qDisc=()=>Math.round(qGross()*qDiscPct()/100);
const qTotal=()=>qGross()-qDisc();   // nettó fizetendő
/* az árajánlat az árkalkulátorral indul: a kiszámolt tételek kerülnek az ajánlatba (vagy kihagyható) */
ACT['deal-quote']=b=>{const d=(S.deals||[]).find(x=>x.id===b.dataset.id);if(!d)return;if(!S.q||S.q.dealId!==d.id)qInit(d);qSig(d.id);ACT['ark-open']({dataset:{q:d.id}});};
async function qSig(id){if(S.q&&S.q.sig)return;try{const s=await call('dealQuoteSig',{dealId:id});if(S.q&&S.q.dealId===id){S.q.sig=s;const h=document.querySelector('#q-body+.hint');if(h)h.textContent='Alá automatikusan bekerül '+s.name+' aláírása, a PDF pedig mellékletként megy.';}}catch(e){handleErr(e);}}
ACT['q-skip']=b=>{window._arkQuoteDeal='';qEdit();};
window.addEventListener('message',e=>{if(e.origin!=='https://kalkulator.lumosmotion.hu')return;const x=(e.data||{}).arkQuoteData;if(!x||!S.q||!window._arkQuoteDeal)return;window._arkQuoteDeal='';
  const rooms=Math.max(1,num(x.rooms)||1),items=(x.rows||[]).filter(r=>num(r.amount)>0).map(r=>{const amt=Math.round(num(r.amount)),m=/^(\d+)\s*db$/.exec(String(r.qty||'').trim()),n=m?Number(m[1]):1,
    det=r.detail&&!/\d/.test(r.detail)?' – '+r.detail:'';   // számokat (óra × díj, km) nem írunk a tétel nevébe
    return rooms===1&&n>1&&amt%n===0?{name:r.name+det,qty:String(n),price:String(amt/n)}:{name:r.name+det,qty:String(rooms),price:String(amt)};});
  if(!items.length){toast('A kalkulátorban nincs kiválasztott tétel.',true);window._arkQuoteDeal=S.q.dealId;return;}
  S.q.items=items;if(rooms>1)S.q.note=(S.q.note?S.q.note+'\n':'')+'A tételek termenként értendők ('+rooms+' terem).';qEdit();});
function qEdit(){const q=S.q,d=(S.deals||[]).find(x=>x.id===q.dealId)||{};
  openModal('📄 Árajánlat – '+(d.title||''),`<div class="fields">
    <div class="field"><label for="q-to">Címzett</label><input class="inp" id="q-to" name="q_to" type="email" value="${esc(q.to)}" placeholder="ugyfel@ceg.hu"></div>
    <div class="field"><label for="q-cc">Másolat (nem kötelező)</label><input class="inp" id="q-cc" name="q_cc" type="email" value="${esc(q.cc)}"></div>
    ${d.title?`<div class="field full"><label>Az ajánlat tárgya</label><div class="q-evsel" role="radiogroup"><label class="${q.ev?'on':''}"><input type="radio" name="q_ev" value="1"${q.ev?' checked':''}> 🎉 Erre a rendezvényre <small>${esc(d.title)}${d.eventDate?' · '+esc(fmtDay(d.eventDate)):''}</small></label><label class="${q.ev?'':'on'}"><input type="radio" name="q_ev" value="0"${q.ev?'':' checked'}> 📄 Általános ajánlat <small>rendezvény megnevezése nélkül</small></label></div></div>`:''}
    <div class="field full"><label for="q-subject">Tárgy</label><input class="inp" id="q-subject" name="q_subject" value="${esc(q.subject)}"></div>
    <div class="field full"><label>Tételek (nettó)</label><div class="q-items"><div class="q-row q-hd"><span>Megnevezés</span><span>Menny.</span><span>Egységár (nettó Ft)</span><span>Összesen</span><span></span></div>
      ${q.items.map((it,i)=>`<div class="q-row"><input class="inp" name="qi_name_${i}" value="${esc(it.name)}" placeholder="pl. Aftermovie (1–1,5 perc)"><input class="inp" name="qi_qty_${i}" value="${esc(it.qty)}" inputmode="decimal"><input class="inp q-price" name="qi_price_${i}" value="${esc(it.price?qFt(it.price):'')}" inputmode="numeric" placeholder="0"><span class="q-sum">${qFt(qNum(it.qty||1)*qNum(it.price))} Ft</span>${q.items.length>1?`<button type="button" class="mini" data-action="q-del" data-i="${i}" aria-label="Tétel törlése">✕</button>`:'<span></span>'}</div>`).join('')}
      <div class="q-foot"><button type="button" class="linkbtn" data-action="q-add">+ Tétel</button><span class="q-tot"><span id="q-discl"${qDiscPct()?'':' hidden'}>${qFt(qGross())} Ft − <span id="q-discv">${qFt(qDisc())}</span> Ft kedvezmény = </span>Nettó összesen: <b id="q-tot">${qFt(qTotal())} Ft</b> + ${Q_VAT}% ÁFA</span></div></div></div>
    <div class="field full"><label>💸 Kedvezmény (nem kötelező)</label><div class="q-disc"><input class="inp" id="q-discLbl" name="q_discLbl" value="${esc(q.discLbl||'Mennyiségi kedvezmény')}" maxlength="60" aria-label="A kedvezmény megnevezése"><span class="q-disc-p"><input class="inp" id="q-disc" name="q_disc" value="${esc(q.disc||'')}" inputmode="decimal" placeholder="0" aria-label="Kedvezmény százalékban (legfeljebb 20%)" title="Legfeljebb 20%"><em>%</em></span>${[5,10,15,20].map(x=>`<button type="button" class="chip" data-action="q-discset" data-v="${x}">${x}%</button>`).join('')}</div><span class="hint">A tételek összegéből vonjuk le (legfeljebb 20%); az ajánlaton külön sorban látszik.</span></div>
    <div class="field"><label for="q-valid">Érvényesség (nap)</label><input class="inp" id="q-valid" name="q_valid" value="${esc(q.valid)}" inputmode="numeric"></div>
    <div class="field full"><label for="q-note">Megjegyzés az ajánlatban (nem kötelező)</label><textarea class="inp" id="q-note" name="q_note" rows="2" placeholder="pl. Az ár tartalmazza a stáb utazását Budapesten belül.">${esc(q.note)}</textarea></div>
    <div class="field full"><label for="q-body">A levél szövege</label><textarea class="inp" id="q-body" name="q_body" rows="6">${esc(q.body)}</textarea><span class="hint">Alá automatikusan bekerül ${q.sig?esc(q.sig.name)+' aláírása':'az értékesítő aláírása'}, a PDF pedig mellékletként megy.</span></div></div>`,
    {submitLabel:'Előnézet →',noDraft:true,left:`<button type="button" class="btn ghost" data-action="q-back">← Vissza a lehetőséghez</button>`,submit:fd=>{qRead(fd);
      if(!/@/.test(q.to)){toast('Add meg a címzett e-mail-címét.',true);return;}if(!q.items.some(it=>it.name&&qNum(it.price))){toast('Adj meg legalább egy tételt árral.',true);return;}qPreview();}});
  const mb=document.querySelector('#modalRoot .mbox');if(mb)mb.classList.add('mbox-wide','mbox-scroll');}
function qTotUi(){const tt=$('q-tot');if(tt)tt.textContent=qFt(qTotal())+' Ft';const dl=$('q-discl');if(dl){dl.hidden=!qDiscPct();const dv=$('q-discv');if(dv)dv.textContent=qFt(qDisc());dl.firstChild.textContent=qFt(qGross())+' Ft − ';}}
document.addEventListener('input',e=>{const t=e.target;if(!t||!S.q||!t.name||!/^(qi_(qty|price)_|q_disc$)/.test(t.name))return;const f=$('mform');if(!f)return;qRead(new FormData(f));
  if(t.name!=='q_disc'){const i=Number(t.name.split('_').pop()),it=S.q.items[i],row=t.closest('.q-row'),sm=row&&row.querySelector('.q-sum');if(sm&&it)sm.textContent=qFt(qNum(it.qty||1)*qNum(it.price))+' Ft';}qTotUi();});
document.addEventListener('change',e=>{const t=e.target;if(!t||t.name!=='q_ev'||!S.q)return;const prev=S.q.ev,f=$('mform');if(f)qRead(new FormData(f));const q=S.q,d=(S.deals||[]).find(x=>x.id===q.dealId)||{},ev=t.value==='1',old=qAuto(d,prev),nw=qAuto(d,ev);
  if(q.subject===old.subject)q.subject=nw.subject;if(q.body===old.body)q.body=nw.body;q.ev=ev;   // csak a saját (nem átírt) alapszöveget cseréljük
  const sj=$('q-subject'),bd=$('q-body');if(sj)sj.value=q.subject;if(bd)bd.value=q.body;document.querySelectorAll('.q-evsel label').forEach(l=>l.classList.toggle('on',l.querySelector('input').checked));});
document.addEventListener('change',e=>{const t=e.target;if(t&&t.name==='q_disc'&&S.q&&qNum(t.value)>Q_DISC_MAX){t.value=String(Q_DISC_MAX);S.q.disc=t.value;qTotUi();toast('A kedvezmény legfeljebb '+Q_DISC_MAX+'% lehet.');}});
document.addEventListener('change',e=>{const t=e.target;if(t&&t.classList&&t.classList.contains('q-price')){const n=qNum(t.value);t.value=n?qFt(n):'';}});
Object.assign(ACT,{
  'q-add':()=>{const f=$('mform');if(f)qRead(new FormData(f));S.q.items.push({name:'',qty:'1',price:''});qEdit();},
  'q-del':b=>{const f=$('mform');if(f)qRead(new FormData(f));S.q.items.splice(Number(b.dataset.i),1);qEdit();},
  'q-back':()=>{const f=$('mform');if(f&&$('q-to'))qRead(new FormData(f));const d=(S.deals||[]).find(x=>x.id===S.q.dealId);if(d&&typeof dealModal==='function')dealModal(d);else closeModal();},
  'q-edit':()=>qEdit(),
  'q-discset':b=>{const i=$('q-disc');if(!i)return;i.value=b.dataset.v;S.q.disc=b.dataset.v;qTotUi();},
  /* a PDF-et az előnézet megnyitásakor (előtérben) készítjük el: háttérlapon a rajzoló üres oldalt adna */
  'q-open':async b=>{const toUrl=b64=>{const bin=atob(b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);return URL.createObjectURL(new Blob([u8],{type:'application/pdf'}));};
    const q=S.q;if(!q)return;if(q._pdf){window.open(toUrl(q._pdf),'_blank');return;}
    b.disabled=true;const t=b.textContent;b.textContent='PDF készül…';try{const b64=await qPdfCached();const w=window.open(toUrl(b64),'_blank');if(!w)toast('A böngésző letiltotta az új lapot – kattints újra.',true);}catch(e){handleErr(e);}finally{b.disabled=false;b.textContent=t;}}
});
const qFileName=()=>{const d=(S.deals||[]).find(x=>x.id===S.q.dealId)||{};return 'Arajanlat_'+String(d.client||(S.q.ev?d.title:'')||'Lumos_Motion').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\w]+/g,'_').replace(/^_|_$/g,'').slice(0,50)+'_'+S.q.no+'.pdf';};
/* az ajánlat A4-es oldala (a PDF és az előnézet ugyanez) */
function qPageHtml(){const q=S.q,d=(S.deals||[]).find(x=>x.id===q.dealId)||{},s=q.sig||{},gross=qGross(),dp=qDiscPct(),disc=qDisc(),tot=qTotal(),vat=Math.round(tot*Q_VAT/100),now=new Date(),until=new Date(Date.now()+Math.max(1,qNum(q.valid)||15)*864e5);
  const row=(it,i)=>`<tr><td>${i+1}.</td><td>${esc(it.name)}</td><td class="r">${esc(it.qty||'1')}</td><td class="r">${qFt(it.price)} Ft</td><td class="r"><b>${qFt(qNum(it.qty||1)*qNum(it.price))} Ft</b></td></tr>`;
  return `<div class="qp"><div class="qp-head"><img src="mail/lumos-motion-stacked.png" alt="Lumos Motion" class="qp-logo"><div class="qp-meta"><b>ÁRAJÁNLAT</b><span>${esc(q.no)}</span><span>Kelt: ${qDate(now)}</span><span>Érvényes: ${qDate(until)}</span></div></div>
    <div class="qp-parties"><div><small>Ajánlatot kapja</small><b>${esc(d.client||d.contactName||'')}</b>${d.client&&d.contactName?`<span>${esc(d.contactName)}</span>`:''}${q.to?`<span>${esc(q.to)}</span>`:''}</div>
      <div><small>Ajánlatot adja</small><b>Lumos Motion Kft.</b><span>1136 Budapest, Tátra utca 20/B, 3/5.</span><span>Adószám: 32701573-2-41</span><span>lumosmotion.hu</span></div></div>
    ${q.ev&&(d.title||d.eventDate||d.venue)?`<div class="qp-ev"><small>Rendezvény</small><b>${esc(d.title||'')}</b><span>${[d.eventDate?esc(fmtDay(d.eventDate)):'',d.venue?esc(d.venue):''].filter(Boolean).join(' · ')}</span></div>`:''}
    <table class="qp-tbl"><thead><tr><th>#</th><th>Megnevezés</th><th class="r">Menny.</th><th class="r">Egységár (nettó)</th><th class="r">Összesen (nettó)</th></tr></thead><tbody>${q.items.filter(it=>it.name).map(row).join('')}</tbody></table>
    <div class="qp-sum">${dp?`<div><span>Tételek összesen</span><b>${qFt(gross)} Ft</b></div><div class="qp-disc"><span>${esc(q.discLbl||'Mennyiségi kedvezmény')} (${String(dp).replace('.',',')}%)</span><b>−${qFt(disc)} Ft</b></div>`:''}<div><span>Nettó összesen</span><b>${qFt(tot)} Ft</b></div><div><span>ÁFA (${Q_VAT}%)</span><b>${qFt(vat)} Ft</b></div><div class="qp-gross"><span>Bruttó összesen</span><b>${qFt(tot+vat)} Ft</b></div></div>
    ${q.note?`<div class="qp-note">${esc(q.note).replace(/\n/g,'<br>')}</div>`:''}
    <div class="qp-sig"><span>Üdvözlettel,</span><b>${esc(s.name||'')}</b>${s.title?`<span>${esc(s.title)}</span>`:''}<span>Lumos Motion Kft.</span>${s.phone?`<span>Tel.: ${esc(s.phone)}</span>`:''}${s.email?`<span>E-mail: ${esc(s.email)}</span>`:''}</div>
    <div class="qp-foot">Az árak nettó árak, az ÁFA mértéke ${Q_VAT}%. Az ajánlat a kelte után ${esc(String(Math.max(1,qNum(q.valid)||15)))} napig érvényes.</div></div>`;}
/* mindig egyetlen A4-es oldal: a lap pontosan oldalméretű; ha a tartalom hosszabb, arányosan kicsinyítjük, hogy elférjen */
const Q_PH=1120;
async function qPdf(){const lib=await h2pLib(),host=document.createElement('div');host.style.cssText='position:fixed;left:0;top:0;z-index:-1;width:794px;background:#fff';host.innerHTML='<div style="width:794px;height:'+Q_PH+'px;overflow:hidden;position:relative;background:#fff">'+qPageHtml()+'</div>';document.body.appendChild(host);
  try{const box=host.firstElementChild,pg=box.firstElementChild;pg.style.minHeight=Q_PH+'px';const im=pg.querySelector('img');if(im&&!im.complete)await new Promise(r=>{im.onload=im.onerror=r;});if(document.fonts&&document.fonts.ready)await document.fonts.ready;
    const h=pg.scrollHeight;if(h>Q_PH){const k=Q_PH/h;pg.style.width=(794/k)+'px';pg.style.minHeight=(Q_PH/k)+'px';pg.style.transformOrigin='0 0';pg.style.transform='scale('+k+')';}
    else pg.style.height=Q_PH+'px';
    const uri=await lib().set({margin:0,filename:qFileName(),image:{type:'jpeg',quality:.95},html2canvas:{scale:2,scrollX:0,scrollY:0,useCORS:true,width:794,height:Q_PH,windowWidth:794},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:[]}}).from(box).outputPdf('datauristring');return String(uri).split(',')[1]||'';}
  finally{host.remove();}}
function qPdfCached(){const q=S.q;if(q._pdf)return Promise.resolve(q._pdf);if(!q._pdfP)q._pdfP=qPdf().then(b=>{if(S.q===q)q._pdf=b;return b;}).finally(()=>{q._pdfP=null;});return q._pdfP;}
function qPreview(){const q=S.q,s=q.sig||{};q._pdf=null;q._pdfP=null;
  openModal('📄 Árajánlat – előnézet',`<div class="q-prev"><div class="q-mail"><div class="q-mh"><div><span>Feladó:</span> ${esc((s.name||'')+' · Lumos Motion')} &lt;${esc(s.from||s.email||'')}&gt;${s.from&&s.email&&s.from.toLowerCase()!==s.email.toLowerCase()?` <small class="q-from-note">(a válaszok ${esc(s.email)} címre mennek – a saját címéről küldéshez „Küldés másként” álnév kell)</small>`:''}</div><div><span>Címzett:</span> ${esc(q.to)}${q.cc?' · Másolat: '+esc(q.cc):''}</div><div><span>Tárgy:</span> <b>${esc(q.subject)}</b></div><div><span>Melléklet:</span> 📎 ${esc(qFileName())}</div></div>
      <div class="q-mb">${esc(q.body).replace(/\n/g,'<br>')}<br><br>${s.sigHtml||''}</div></div>
    <div class="q-pdf"><div class="q-pdf-h"><span>📎 A csatolt PDF</span><button type="button" class="linkbtn" data-action="q-open">↗ Megnyitás új lapon</button></div><div class="q-pdf-page">${qPageHtml()}</div></div></div>`,
    {submitLabel:'📨 Küldés',noDraft:true,left:`<button type="button" class="btn ghost" data-action="q-edit">← Szerkesztés</button>`,
     submit:async()=>{const btn=document.querySelector('#mform button[type=submit]');if(btn){btn.disabled=true;btn.textContent='Küldés…';}
       try{const pdf=await qPdfCached();const r=await call('dealQuoteSend',{dealId:q.dealId,to:q.to,cc:q.cc,subject:q.subject,body:q.body,pdf,fileName:qFileName(),total:qTotal()});
         if(r&&r.deals)S.deals=r.deals;closeModal();S.q=null;render(true);toast(r&&r.test?'TESZT: az ajánlat csak neked ment ki':'Árajánlat elküldve: '+q.to);}
       catch(e){if(btn){btn.disabled=false;btn.textContent='📨 Küldés';}handleErr(e);}}});
  const mb=document.querySelector('#modalRoot .mbox');if(mb)mb.classList.add('mbox-wide','mbox-scroll','mbox-q');
  const fit=()=>{const w=document.querySelector('.q-pdf-page'),pg=w&&w.querySelector('.qp');if(pg)pg.style.zoom=String(Math.min(1,(w.clientWidth-24)/794));};requestAnimationFrame(fit);setTimeout(fit,300);setTimeout(()=>{if(S.q===q)qPdfCached().catch(()=>{});},400);}   /* a PDF-oldal kicsinyítve, teljes szélességben látszik */
