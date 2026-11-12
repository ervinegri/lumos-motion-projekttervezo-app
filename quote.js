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
  S.q={dealId:d.id,to:d.contactEmail||'',cc:'',subject:'Árajánlat – '+(d.title||''),items,valid:'30',note:'',no,
    body:`Kedves ${qFirst(d.contactName)||'Ügyfelünk'}!\n\nKöszönöm az érdeklődést! Csatolva küldöm az árajánlatunkat${d.title?' a(z) „'+d.title+'” rendezvényhez':''}. Ha bármi kérdés felmerül, vagy módosítanátok rajta, szívesen segítek.`,sig:null};}
function qRead(fd){const q=S.q;['to','cc','subject','valid','note','body'].forEach(k=>{if(fd.has('q_'+k))q[k]=String(fd.get('q_'+k)||'').trim();});
  if(fd.has('qi_name_0')){q.items=[];for(let i=0;fd.has('qi_name_'+i);i++)q.items.push({name:String(fd.get('qi_name_'+i)||'').trim(),qty:String(fd.get('qi_qty_'+i)||'').trim(),price:String(fd.get('qi_price_'+i)||'').replace(/\s/g,'')});}}
const qTotal=()=>S.q.items.reduce((a,it)=>a+qNum(it.qty||1)*qNum(it.price),0);
ACT['deal-quote']=async b=>{const d=(S.deals||[]).find(x=>x.id===b.dataset.id);if(!d)return;
  if(!S.q||S.q.dealId!==d.id)qInit(d);qEdit();
  if(!S.q.sig)try{S.q.sig=await call('dealQuoteSig',{dealId:d.id});}catch(e){handleErr(e);}};
function qEdit(){const q=S.q,d=(S.deals||[]).find(x=>x.id===q.dealId)||{};
  openModal('📄 Árajánlat – '+(d.title||''),`<div class="fields">
    <div class="field"><label for="q-to">Címzett</label><input class="inp" id="q-to" name="q_to" type="email" value="${esc(q.to)}" placeholder="ugyfel@ceg.hu"></div>
    <div class="field"><label for="q-cc">Másolat (nem kötelező)</label><input class="inp" id="q-cc" name="q_cc" type="email" value="${esc(q.cc)}"></div>
    <div class="field full"><label for="q-subject">Tárgy</label><input class="inp" id="q-subject" name="q_subject" value="${esc(q.subject)}"></div>
    <div class="field full"><label>Tételek (nettó)</label><div class="q-items"><div class="q-row q-hd"><span>Megnevezés</span><span>Menny.</span><span>Egységár (nettó Ft)</span><span>Összesen</span><span></span></div>
      ${q.items.map((it,i)=>`<div class="q-row"><input class="inp" name="qi_name_${i}" value="${esc(it.name)}" placeholder="pl. Aftermovie (1–1,5 perc)"><input class="inp" name="qi_qty_${i}" value="${esc(it.qty)}" inputmode="decimal"><input class="inp q-price" name="qi_price_${i}" value="${esc(it.price?qFt(it.price):'')}" inputmode="numeric" placeholder="0"><span class="q-sum">${qFt(qNum(it.qty||1)*qNum(it.price))} Ft</span>${q.items.length>1?`<button type="button" class="mini" data-action="q-del" data-i="${i}" aria-label="Tétel törlése">✕</button>`:'<span></span>'}</div>`).join('')}
      <div class="q-foot"><button type="button" class="linkbtn" data-action="q-add">+ Tétel</button><span class="q-tot">Nettó összesen: <b id="q-tot">${qFt(qTotal())} Ft</b> + ${Q_VAT}% ÁFA</span></div></div></div>
    <div class="field"><label for="q-valid">Érvényesség (nap)</label><input class="inp" id="q-valid" name="q_valid" value="${esc(q.valid)}" inputmode="numeric"></div>
    <div class="field full"><label for="q-note">Megjegyzés az ajánlatban (nem kötelező)</label><textarea class="inp" id="q-note" name="q_note" rows="2" placeholder="pl. Az ár tartalmazza a stáb utazását Budapesten belül.">${esc(q.note)}</textarea></div>
    <div class="field full"><label for="q-body">A levél szövege</label><textarea class="inp" id="q-body" name="q_body" rows="6">${esc(q.body)}</textarea><span class="hint">Alá automatikusan bekerül ${q.sig?esc(q.sig.name)+' aláírása':'az értékesítő aláírása'}, a PDF pedig mellékletként megy.</span></div></div>`,
    {submitLabel:'Előnézet →',noDraft:true,left:`<button type="button" class="btn ghost" data-action="q-back">← Vissza a lehetőséghez</button>`,submit:fd=>{qRead(fd);
      if(!/@/.test(q.to)){toast('Add meg a címzett e-mail-címét.',true);return;}if(!q.items.some(it=>it.name&&qNum(it.price))){toast('Adj meg legalább egy tételt árral.',true);return;}qPreview();}});
  const mb=document.querySelector('#modalRoot .mbox');if(mb)mb.classList.add('mbox-wide','mbox-scroll');}
document.addEventListener('input',e=>{const t=e.target;if(!t||!S.q||!t.name||!/^qi_(qty|price)_/.test(t.name))return;const f=$('mform');if(!f)return;qRead(new FormData(f));
  const i=Number(t.name.split('_').pop()),it=S.q.items[i],row=t.closest('.q-row'),sm=row&&row.querySelector('.q-sum');if(sm&&it)sm.textContent=qFt(qNum(it.qty||1)*qNum(it.price))+' Ft';const tt=$('q-tot');if(tt)tt.textContent=qFt(qTotal())+' Ft';});
document.addEventListener('change',e=>{const t=e.target;if(t&&t.classList&&t.classList.contains('q-price')){const n=qNum(t.value);t.value=n?qFt(n):'';}});
Object.assign(ACT,{
  'q-add':()=>{const f=$('mform');if(f)qRead(new FormData(f));S.q.items.push({name:'',qty:'1',price:''});qEdit();},
  'q-del':b=>{const f=$('mform');if(f)qRead(new FormData(f));S.q.items.splice(Number(b.dataset.i),1);qEdit();},
  'q-back':()=>{const f=$('mform');if(f&&$('q-to'))qRead(new FormData(f));const d=(S.deals||[]).find(x=>x.id===S.q.dealId);if(d&&typeof dealModal==='function')dealModal(d);else closeModal();},
  'q-edit':()=>qEdit(),
  'q-dl':async()=>{try{const b64=await qPdf();const a=document.createElement('a');a.href='data:application/pdf;base64,'+b64;a.download=qFileName();document.body.appendChild(a);a.click();a.remove();}catch(e){handleErr(e);}}
});
const qFileName=()=>{const d=(S.deals||[]).find(x=>x.id===S.q.dealId)||{};return 'Arajanlat_'+String(d.client||d.title||'Lumos').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\w]+/g,'_').replace(/^_|_$/g,'').slice(0,50)+'_'+S.q.no+'.pdf';};
/* az ajánlat A4-es oldala (a PDF és az előnézet ugyanez) */
function qPageHtml(){const q=S.q,d=(S.deals||[]).find(x=>x.id===q.dealId)||{},s=q.sig||{},tot=qTotal(),vat=Math.round(tot*Q_VAT/100),now=new Date(),until=new Date(Date.now()+Math.max(1,qNum(q.valid)||30)*864e5);
  const row=(it,i)=>`<tr><td>${i+1}.</td><td>${esc(it.name)}</td><td class="r">${esc(it.qty||'1')}</td><td class="r">${qFt(it.price)} Ft</td><td class="r"><b>${qFt(qNum(it.qty||1)*qNum(it.price))} Ft</b></td></tr>`;
  return `<div class="qp"><div class="qp-head"><img src="mail/lumos-motion.png" alt="Lumos Motion" class="qp-logo"><div class="qp-meta"><b>ÁRAJÁNLAT</b><span>${esc(q.no)}</span><span>Kelt: ${qDate(now)}</span><span>Érvényes: ${qDate(until)}</span></div></div>
    <div class="qp-parties"><div><small>Ajánlatot kapja</small><b>${esc(d.client||d.contactName||'')}</b>${d.client&&d.contactName?`<span>${esc(d.contactName)}</span>`:''}${q.to?`<span>${esc(q.to)}</span>`:''}</div>
      <div><small>Ajánlatot adja</small><b>Lumos Motion Kft.</b><span>1136 Budapest, Tátra utca 20/B, 3/5.</span><span>Adószám: 32701573-2-41</span><span>lumosmotion.hu</span></div></div>
    ${d.title||d.eventDate||d.venue?`<div class="qp-ev"><small>Rendezvény</small><b>${esc(d.title||'')}</b><span>${[d.eventDate?esc(fmtDay(d.eventDate)):'',d.venue?esc(d.venue):''].filter(Boolean).join(' · ')}</span></div>`:''}
    <table class="qp-tbl"><thead><tr><th>#</th><th>Megnevezés</th><th class="r">Menny.</th><th class="r">Egységár (nettó)</th><th class="r">Összesen (nettó)</th></tr></thead><tbody>${q.items.filter(it=>it.name).map(row).join('')}</tbody></table>
    <div class="qp-sum"><div><span>Nettó összesen</span><b>${qFt(tot)} Ft</b></div><div><span>ÁFA (${Q_VAT}%)</span><b>${qFt(vat)} Ft</b></div><div class="qp-gross"><span>Bruttó összesen</span><b>${qFt(tot+vat)} Ft</b></div></div>
    ${q.note?`<div class="qp-note">${esc(q.note).replace(/\n/g,'<br>')}</div>`:''}
    <div class="qp-sig"><span>Üdvözlettel,</span><b>${esc(s.name||'')}</b>${s.title?`<span>${esc(s.title)}</span>`:''}<span>Lumos Motion Kft.</span>${s.phone?`<span>Tel.: ${esc(s.phone)}</span>`:''}${s.email?`<span>E-mail: ${esc(s.email)}</span>`:''}</div>
    <div class="qp-foot">Az árak nettó árak, az ÁFA mértéke ${Q_VAT}%. Az ajánlat a kelte után ${esc(String(Math.max(1,qNum(q.valid)||30)))} napig érvényes.</div></div>`;}
async function qPdf(){const lib=await h2pLib(),host=document.createElement('div');host.style.cssText='position:fixed;left:0;top:0;z-index:-1;width:794px;background:#fff';host.innerHTML=qPageHtml();document.body.appendChild(host);
  try{const uri=await lib().set({margin:0,filename:qFileName(),image:{type:'jpeg',quality:.95},html2canvas:{scale:2,scrollX:0,scrollY:0,useCORS:true},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}}).from(host.firstElementChild).outputPdf('datauristring');return String(uri).split(',')[1]||'';}
  finally{host.remove();}}
function qPreview(){const q=S.q,s=q.sig||{};
  openModal('📄 Árajánlat – előnézet',`<div class="q-prev"><div class="q-mail"><div class="q-mh"><div><span>Feladó:</span> ${esc((s.name||'')+' · Lumos Motion')} &lt;${esc(s.email||'')}&gt;</div><div><span>Címzett:</span> ${esc(q.to)}${q.cc?' · Másolat: '+esc(q.cc):''}</div><div><span>Tárgy:</span> <b>${esc(q.subject)}</b></div><div><span>Melléklet:</span> 📎 ${esc(qFileName())}</div></div>
      <div class="q-mb">${esc(q.body).replace(/\n/g,'<br>')}<br><br>${s.sigHtml||''}</div></div>
    <div class="q-pdf"><div class="q-pdf-h">📎 A csatolt PDF</div><div class="q-pdf-page">${qPageHtml()}</div></div></div>`,
    {submitLabel:'📨 Küldés',noDraft:true,left:`<button type="button" class="btn ghost" data-action="q-edit">← Szerkesztés</button><button type="button" class="btn outline" data-action="q-dl">⬇ PDF letöltése</button>`,
     submit:async()=>{const btn=document.querySelector('#mform button[type=submit]');if(btn){btn.disabled=true;btn.textContent='Küldés…';}
       try{const pdf=await qPdf();const r=await call('dealQuoteSend',{dealId:q.dealId,to:q.to,cc:q.cc,subject:q.subject,body:q.body,pdf,fileName:qFileName(),total:qTotal()});
         if(r&&r.deals)S.deals=r.deals;closeModal();S.q=null;render(true);toast(r&&r.test?'TESZT: az ajánlat csak neked ment ki':'Árajánlat elküldve: '+q.to);}
       catch(e){if(btn){btn.disabled=false;btn.textContent='📨 Küldés';}handleErr(e);}}});
  const mb=document.querySelector('#modalRoot .mbox');if(mb)mb.classList.add('mbox-wide','mbox-scroll','mbox-q');
  const fit=()=>{const w=document.querySelector('.q-pdf-page'),pg=w&&w.querySelector('.qp');if(pg)pg.style.zoom=String(Math.min(1,(w.clientWidth-24)/794));};requestAnimationFrame(fit);setTimeout(fit,300);}   /* a PDF-oldal kicsinyítve, teljes szélességben látszik */
