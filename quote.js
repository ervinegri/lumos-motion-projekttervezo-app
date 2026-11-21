/* 📄 Árajánlat a lehetőségből (Értékesítés): tételek → előnézet (levél + PDF) → küldés az értékesítő nevével, címével és aláírásával, PDF melléklettel.
   A PDF a böngészőben készül (html2pdf, vendor), a levelet az Apps Script küldi (dealQuoteSend). */
const Q_VAT=27;
/* a kalkulátorból átvett tételek rövid, ügyfélnek szóló leírása */
function qDescOf(r,n){let name=String(r.name||'').trim();const det=String(r.detail||''),hrs=+r.hours||+((/(\d+)\s*óra/.exec(det)||[])[1])||0,ops=+r.ops||+((/^(\d+)\s*fő/.exec(String(r.qty||''))||[])[1])||0;let d='';
  const db=n+' db';
  if(/^Aftermovie/i.test(name))d=db+', 90–120 másodperces rendezvényösszefoglaló videó';
  else if(/Interjú|Imázs/i.test(name))d=db+' interjú- vagy imázsfilm, külön mikrofonnal rögzítve';
  else if(/Short.*40.?60/i.test(name))d=db+', 40–60 másodperces közösségi média videó';
  else if(/Short.*20.?40/i.test(name))d=db+', 20–40 másodperces közösségi média videó';
  else if(/^Profi fotó/i.test(name)){const m=/\((\d+)\s*db/.exec(name);name='Profi fotózás';d=(m?m[1]+' db ':'')+'válogatott fotó átadása';}
  else if(/^Operatőri (szolgáltatások|munka)/i.test(name))d=[ops?ops+' fő operatőr':'',hrs?hrs+' óra rendelkezésre állás':''].filter(Boolean).join(', ');
  else if(/^Előadások utómunkája/i.test(name))d=hrs?'Az előadások teljes anyagának vágása ('+hrs+' óra felvétel)':'';
  else if(/^Kivágások/i.test(name))d=db+', 40–60 másodperces klip feliratozással';
  else if(/^Feliratozás/i.test(name))d=db+' videó feliratozása (SRT és beégetett)';
  else if(/^Short videók vágása/i.test(name))d=db+' rövid videó: vágás, színezés, zene, feliratozás';
  else if(/^Forgatókönyv/i.test(name))d=db+' videó szövege és jelenetei';
  else if(/^Vágó a helyszín/i.test(name))d='Már a rendezvény napján posztolható videók';
  else if(/Drón/i.test(name))d='Légifelvételek képesített pilótával';
  else if(/^Timelapse/i.test(name))d='Gyorsított videó a helyszín megteléséről';
  else if(/^POV/i.test(name))d='Első személyű, „ott-lét” felvételek';
  else if(/Nyersanyag megvásárlása/i.test(name))d='Minden felvétel szerkesztetlenül, eredeti minőségben';
  else if(/Nyersanyag tárolása/i.test(name))d='5 évig, biztonsági mentéssel';
  else if(/Villámgyors/i.test(name))d='Az első változat 24 órán belül';
  else if(/Élő közvetítés/i.test(name))d='Kivetítőre vagy YouTube / Facebook / LinkedIn felé';
  else if(/^Kiszállás/i.test(name))d=det&&!/Ft/.test(det)?det:'';
  else if(det&&!/Ft|×/.test(det))d=det;
  return {name,desc:d};}
const Q_SRC={rendezvenyvideok:'Kreatív videózás és fotózás','eloadas-rogzites':'Előadás rögzítés','short-videok':'Short videók'};   // kalkulátor → opció neve
const qFt=n=>String(Math.round(num(n))).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
const qNum=v=>num(String(v==null?'':v).replace(/[^\d.,-]/g,'').replace(',','.'));
const qDate=d=>d.getFullYear()+'. '+String(d.getMonth()+1).padStart(2,'0')+'. '+String(d.getDate()).padStart(2,'0')+'.';
let H2P=null;const h2pLib=()=>H2P||(H2P=new Promise((ok,no)=>{if(window.html2pdf)return ok(window.html2pdf);const s=document.createElement('script');s.src='vendor/html2pdf.bundle.min.js';s.onload=()=>ok(window.html2pdf);s.onerror=()=>{H2P=null;no(new Error('A PDF-készítő nem tölthető be.'));};document.head.appendChild(s);}));
function qFirst(n){return huFirst(n);}
/* ajánlaton: a rendezvény dátuma évvel, teljes hónapnévvel és napnévvel (pl. 2027. március 4., csütörtök) */
const qEvDate=iso=>{if(!/^\d{4}-\d{2}-\d{2}/.test(String(iso||'')))return '';const d=new Date(String(iso).slice(0,10)+'T12:00:00');return new Intl.DateTimeFormat('hu-HU',{year:'numeric',month:'long',day:'numeric',weekday:'long'}).format(d);};
/* tételnévben a szóközök közötti kötőjel nagykötőjel (–) */
const qDash=t=>String(t||'').replace(/ - /g,' – ');
function qInit(d){const sv=String(d.services||'').split(',').map(x=>x.trim()).filter(Boolean),v=num(d.value);
  const items=sv.length?sv.map((x,i)=>({name:x,qty:'1',price:sv.length===1&&v?String(v):'',src:'init'})):[{name:d.title||'Videós szolgáltatás',qty:'1',price:v?String(v):'',src:'init'}];
  const no='A-'+todayISO().replace(/-/g,'')+'-'+String(d.id||'').replace(/[^a-z0-9]/gi,'').slice(0,4).toUpperCase();
  const ev=!!d.title,a=qAuto(d,ev);S.q={evName:d.title||'',dealId:d.id,to:d.contactEmail||'',cc:d.contactEmail2||'',subject:a.subject,items,opts:[{title:'',items}],oi:0,rc:{name:d.client||d.contactName||'',person:d.client&&d.contactName?d.contactName:'',addr:'',email:''},valid:'20',note:'',no,ev,body:a.body,sig:null};}
/* több opció (pl. 1 / 3 / 5 short): S.q.opts = [{title, items}], az aktív opció tételei = S.q.items */
/* a kedvezmény opciónként külön (régi mentésnél az ajánlat-szintű beállítás minden opcióra átkerül) */
function qMig(q){if(q&&('discOn' in q||'disc' in q||'discLbl' in q)){(q.opts||[]).forEach(o=>{if(!('discOn' in o)){o.discOn=!!q.discOn;o.disc=q.disc||'';o.discLbl=q.discLbl||'';}});delete q.discOn;delete q.disc;delete q.discLbl;}return q;}
const qO=()=>{const q=qMig(S.q);return (q&&q.opts&&q.opts[q.oi])||{};};
function qSetOpt(i){const q=S.q;q.oi=Math.max(0,Math.min(q.opts.length-1,i));q.items=q.opts[q.oi].items;}
/* konkrét rendezvényre szóló vagy általános ajánlat: a tárgy és a levél alapszövege ehhez igazodik */
function qAuto(d,ev,nm,val){const T=nm!=null?nm:d.title,V=Math.max(1,parseInt(val,10)||20);return {subject:ev&&T?'Árajánlat – '+T:'Árajánlat – Lumos Motion',
  body:`Kedves ${qFirst(d.contactName)||'Ügyfelünk'}!\n\nKöszönöm az érdeklődést! Csatolva küldöm az árajánlatunkat${ev&&T?' '+huArt(T)+' „'+T+'” rendezvényhez':''}. Az ajánlat ${V} napig érvényes. Ha bármi kérdés felmerül, szívesen segítek.`};}
function qRead(fd){const q=S.q;if(!q.rc)q.rc={name:'',person:'',addr:'',email:''};['name','person','addr','email'].forEach(k=>{if(fd.has('qrc_'+k))q.rc[k]=String(fd.get('qrc_'+k)||'').trim();});if(fd.has('q_ev'))q.ev=fd.get('q_ev')==='1';if(fd.has('q_evname'))q.evName=String(fd.get('q_evname')||'').trim();if($('q-discOn'))qO().discOn=fd.has('q_discOn');if($('q-totOn'))qO().noTot=!fd.has('q_totOn');if(fd.has('q_cc'))q.cc=fd.getAll('q_cc').map(x=>String(x||'').trim()).filter(Boolean).join(', ');['to','subject','valid','note','body'].forEach(k=>{if(fd.has('q_'+k))q[k]=String(fd.get('q_'+k)||'').trim();});['disc','discLbl'].forEach(k=>{if(fd.has('q_'+k))qO()[k]=String(fd.get('q_'+k)||'').trim();});
  (q.opts||[]).forEach(o=>{if(o.discLbl==='Mennyiségi '+'kedvezmény')o.discLbl='Csomagkedvezmény';});   // a régi alapfelirat helyett
  if(fd.has('q_otitle'))q.opts[q.oi].title=String(fd.get('q_otitle')||'').trim();
  if(fd.has('qi_name_0')){const old=q.items||[];q.items=[];q.opts[q.oi].items=q.items;for(let i=0;fd.has('qi_name_'+i);i++)q.items.push({name:String(fd.get('qi_name_'+i)||'').trim(),qty:String(fd.get('qi_qty_'+i)||'').trim(),price:String(fd.get('qi_price_'+i)||'').replace(/\s/g,''),desc:String(fd.get('qi_desc_'+i)||'').trim(),src:(old[i]||{}).src||''});}}
const qOptGross=its=>its.reduce((a,it)=>a+qNum(it.qty||1)*qNum(it.price),0);
const qGross=()=>qOptGross(S.q.items);   // tételek összege (kedvezmény előtt)
const Q_DISC_MAX=20;const qDiscPct=o=>{o=o||qO();return o.discOn?Math.min(Q_DISC_MAX,Math.max(0,qNum(o.disc))):0;};   // legfeljebb 20%
const qDisc=()=>Math.round(qGross()*qDiscPct()/100);
const qTotal=()=>qGross()-qDisc();   // nettó fizetendő
/* az árajánlat az árkalkulátorral indul: a kiszámolt tételek kerülnek az ajánlatba (vagy kihagyható) */
ACT['deal-quote']=async b=>{const d=(S.deals||[]).find(x=>x.id===b.dataset.id);if(!d)return;
  const fresh=()=>{if(!S.q||S.q.dealId!==d.id)qInit(d);qSig(d.id);ACT['ark-open']({dataset:{q:d.id}});};
  if(S.q&&S.q.dealId===d.id){fresh();return;}
  let dr=null;try{dr=await call('quoteDraft',{dealId:d.id,op:'get'});}catch(e){}   /* mentett, még ki nem küldött ajánlat: folytatható */
  if(!dr||!dr.q){fresh();return;}
  openModal('Mentett ajánlat',`<p style="margin:0">Ehhez a lehetőséghez van egy mentett, még ki nem küldött ajánlat (${esc(String(dr.at||'').slice(0,16))}${dr.by?' · '+esc(dr.by):''}).</p>`,{submitLabel:'Folytatom',noDraft:true,left:`<button type="button" class="btn outline" data-action="q-draft-new" data-id="${esc(d.id)}">Újat kezdek</button>`,
    submit:()=>{closeModal();S.q=dr.q;delete S.q.sig;qSig(d.id);qEdit();}});};
ACT['q-draft-cont']=async b=>{const d=(S.deals||[]).find(x=>x.id===b.dataset.id);if(!d)return;b.disabled=true;let dr=null;try{dr=await call('quoteDraft',{dealId:d.id,op:'get'});}catch(e){handleErr(e);}finally{b.disabled=false;}
  closeModal();if(dr&&dr.q){S.q=dr.q;delete S.q.sig;qSig(d.id);qEdit();}else{d.qDraft='';qInit(d);qSig(d.id);ACT['ark-open']({dataset:{q:d.id}});}};
ACT['q-draft-new']=b=>{const d=(S.deals||[]).find(x=>x.id===b.dataset.id);closeModal();if(!d)return;d.qDraft='';call('quoteDraft',{dealId:d.id,op:'del'}).catch(()=>{});qInit(d);qSig(d.id);ACT['ark-open']({dataset:{q:d.id}});};
ACT['q-save']=async b=>{const f=$('mform');if(!S.q||!f)return;try{qRead(new FormData(f));}catch(e){}b.disabled=true;
  try{const st=Object.assign({},S.q);delete st._pdf;delete st._pdfP;delete st.sig;const r=await call('quoteDraft',{dealId:S.q.dealId,q:st});{const dd=(S.deals||[]).find(x=>x.id===S.q.dealId);if(dd)dd.qDraft=(r&&r.at)||'1';}toast('Ajánlat mentve – a lehetőségnél később folytathatod');}catch(e){handleErr(e);}finally{b.disabled=false;}};
async function qSig(id){if(S.q&&S.q.sig&&S.q.sig.name)return;try{const s=await call('dealQuoteSig',{dealId:id});if(S.q&&S.q.dealId===id){S.q.sig=s;const h=document.querySelector('#q-body+.hint');if(h)h.textContent='Alá automatikusan bekerül '+s.name+' aláírása, a PDF pedig mellékletként megy.';}}catch(e){handleErr(e);}}
ACT['q-skip']=b=>{window._arkQuoteDeal='';qEdit();};
window.addEventListener('message',e=>{if(e.origin!=='https://kalkulator.lumosmotion.hu')return;const x=(e.data||{}).arkQuoteData;if(!x||!S.q||!window._arkQuoteDeal)return;window._arkQuoteDeal='';
  const rooms=Math.max(1,num(x.rooms)||1),items=(x.rows||[]).filter(r=>num(r.amount)>0).map(r=>{const amt=Math.round(num(r.amount)),m=/^(\d+)\s*db$/.exec(String(r.qty||'').trim()),n=m?Number(m[1]):1,
    nd=qDescOf(r,n);   // a tétel neve tömör, alatta rövid leírás (darabszám, terjedelem, óraszám, létszám)
    return rooms===1&&n>1&&amt%n===0?{name:nd.name,desc:nd.desc,qty:String(n),price:String(amt/n)}:{name:nd.name,desc:nd.desc,qty:String(rooms),price:String(amt)};});
  if(!items.length){toast('A kalkulátorban nincs kiválasztott tétel.',true);window._arkQuoteDeal=S.q.dealId;return;}
  /* több kalkulátorból is gyűjthetsz egy ajánlatba: az ugyanebből a kalkulátorból korábban átvett tételek frissülnek, a többi (másik kalkulátor, kézzel írt) megmarad */
  const fr=$('ark-frame'),pg=((fr&&fr.src)||'').replace(/^.*\.hu\//,'').replace(/[?#].*$/,'').replace(/\/$/,'')||'ark';items.forEach(it=>it.src=pg);
  /* minden kalkulátor a saját opciójába kerül (Kreatív videózás és fotózás / Előadás rögzítés / Short videók) – egy levélben több szolgáltatás is mehet */
  const q=S.q,real=it=>it.src!=='init'&&(String(it.name||'').trim()||qNum(it.price));let k=q.opts.findIndex(o=>o.src===pg);
  if(k<0){k=q.opts.findIndex(o=>!o.src&&!o.items.some(real));if(k<0){q.opts.push({title:'',items:[]});k=q.opts.length-1;}else if(q.opts.length>1||q.opts.some(o=>o.src))setTimeout(()=>toast('Új opció: '+(Q_SRC[pg]||pg)),300);}
  else if(q.opts.length>1)setTimeout(()=>toast((Q_SRC[pg]||pg)+' – frissítve'),300);
  const o=q.opts[k],all=o.items.filter(it=>it.src!==pg&&real(it)).concat(items);o.items=all;o.src=pg;{const at=pg==='rendezvenyvideok'?(items.some(it=>/fot[oó]/i.test(it.name))?'Kreatív videózás és fotózás':'Kreatív videózás'):(Q_SRC[pg]||'');if(!o.title||o.title===Q_SRC[pg]||o.title==='Kreatív videózás')o.title=at;}qSetOpt(k);if(rooms>1)S.q.note=(S.q.note?S.q.note+'\n':'')+'A tételek termenként értendők ('+rooms+' terem).';qEdit();});
function qEdit(){const q=S.q,d=(S.deals||[]).find(x=>x.id===q.dealId)||{};
  openModal('📄 Árajánlat – '+(d.title||''),`<div class="fields">
    <div class="field"><label for="q-to">Címzett</label><input class="inp" id="q-to" name="q_to" type="email" value="${esc(q.to)}" placeholder="ugyfel@ceg.hu"></div>
    <div class="field"><label for="q-cc" class="q-cclbl">Másolat (nem kötelező)<button type="button" class="linkbtn q-ccadd" data-action="q-cc-add">＋ Újabb másolat</button></label>${(()=>{const L=String(q.cc||'').split(',').map(x=>x.trim()).filter(Boolean);while(L.length<Math.max(1,q.ccN||0))L.push('');return L.map((v,i)=>`<span class="q-ccw"><input class="inp q-ccin"${i?'':' id="q-cc"'} name="q_cc" type="email" value="${esc(v)}" placeholder="${i?'további címzett másolatban':''}" aria-label="Másolat ${i+1}">${L.length>1?`<button type="button" class="q-ccdel" data-action="q-cc-del" data-i="${i}" aria-label="Másolat törlése" title="Eltávolítás">✕</button>`:''}</span>`).join('');})()}</div>
    ${d.title?`<div class="field full"><label>Az ajánlat tárgya</label><div class="q-evsel" role="radiogroup"><label class="${q.ev?'on':''}"><input type="radio" name="q_ev" value="1"${q.ev?' checked':''}> 🎉 Erre a rendezvényre <small>${d.eventDate?esc(qEvDate(d.eventDate)):''}</small></label><label class="${q.ev?'':'on'}"><input type="radio" name="q_ev" value="0"${q.ev?'':' checked'}> 📄 Általános ajánlat <small>rendezvény megnevezése nélkül</small></label></div>${`<input class="inp q-evname"${q.ev?'':' hidden'} name="q_evname" value="${esc(q.evName!=null?q.evName:d.title)}" placeholder="A rendezvény neve" aria-label="A rendezvény neve (így szerepel az ajánlaton)" style="margin-top:8px">`}</div>`:''}
    <div class="field full"><label>Ajánlatot kapja <small class="muted">(így szerepel a PDF-en)</small></label><div class="q-rc"><input class="inp" name="qrc_name" value="${esc((q.rc||{}).name||'')}" placeholder="Cég neve" aria-label="Cég neve"><input class="inp" name="qrc_person" value="${esc((q.rc||{}).person||'')}" placeholder="Kapcsolattartó (nem kötelező)" aria-label="Kapcsolattartó"><input class="inp" name="qrc_addr" value="${esc((q.rc||{}).addr||'')}" placeholder="Cím (nem kötelező)" aria-label="Cím" style="grid-column:1/-1"></div></div>
    <div class="field"><label for="q-subject">Tárgy</label><input class="inp" id="q-subject" name="q_subject" value="${esc(q.subject)}"></div>
    <div class="field"><label for="q-valid">Érvényesség (nap)</label><input class="inp" id="q-valid" name="q_valid" value="${esc(q.valid)}" inputmode="numeric"></div>
    <div class="field full"><div class="q-opts"><span class="q-opts-l">Opciók:</span>${q.opts.length>1?`<button type="button" class="q-nav" data-action="q-opt" data-i="${q.oi-1}"${q.oi?'':' disabled'} aria-label="Előző opció" title="Előző opció">‹</button>`:''}${q.opts.map((o,i)=>`<button type="button" class="chip${i===q.oi?' on':''}" data-action="q-opt" data-i="${i}">${o.title?esc(o.title):(i+1)+'. opció'}<small>${qFt(qOptGross(o.items)-Math.round(qOptGross(o.items)*qDiscPct(o)/100))} Ft</small></button>`).join('')}${q.opts.length>1?`<button type="button" class="q-nav" data-action="q-opt" data-i="${q.oi+1}"${q.oi<q.opts.length-1?'':' disabled'} aria-label="Következő opció" title="Következő opció">›</button>`:''}<button type="button" class="chip q-opt-add" data-action="q-opt-add" title="Az aktív opció másolata – pl. más darabszámmal">⧉ Opció másolása</button><span class="q-cat"><button type="button" class="chip q-opt-add" data-action="q-cat-menu" aria-haspopup="true">＋ Új kategória ▾</button><span class="q-cat-menu" hidden>${Object.keys(Q_SRC).map(k=>`<button type="button" data-action="q-cat-add" data-p="${k}"${q.opts.some(o=>o.src===k)?' disabled title="Már van ilyen opció"':''}>${esc(Q_SRC[k])} <small>– kalkulátorból</small></button>`).join('')}<button type="button" data-action="q-cat-add" data-p="">Üres opció <small>– kézi tételek</small></button></span></span>${q.opts.length>1?`<button type="button" class="linkbtn q-opt-del" data-action="q-opt-del">Opció törlése</button>`:''}</div>
      ${q.opts.length>1?`<div class="q-otitle"><label for="q-otitle">Az opció neve <small class="muted">(kötelező · a PDF-ben is látszik)</small></label><input class="inp" id="q-otitle" name="q_otitle" required value="${esc(q.opts[q.oi].title)}" placeholder="pl. 3 short videó" maxlength="80"></div>`:''}
      <label for="q-nolbl">Tételek (nettó)${q.opts.length>1?' – '+(q.opts[q.oi].title?esc(q.opts[q.oi].title):(q.oi+1)+'. opció'):''} <span aria-hidden="true">🧮</span> <button type="button" class="linkbtn" data-action="q-calc">Árkalkulátorból</button></label><div class="q-items q-pdfl"><div class="q-row q-hd"><span>#</span><span>Megnevezés</span><span>Menny.</span><span>Egységár (nettó)</span><span>Nettó</span><span class="q-bh">Bruttó <span class="nw">(${Q_VAT}%&nbsp;ÁFA)</span></span><span></span></div>
      ${q.items.map((it,i)=>`<div class="q-row"><span class="q-no">${i+1}.</span><span class="q-namew"><input class="inp" name="qi_name_${i}" value="${esc(it.name)}" placeholder="pl. Aftermovie"><input class="inp q-desc" name="qi_desc_${i}" value="${esc(it.desc||'')}" placeholder="Leírás (nem kötelező) – pl. 1 db, 90–120 másodperces videó" maxlength="160"></span><input class="inp" name="qi_qty_${i}" value="${esc(it.qty)}" inputmode="decimal"><input class="inp q-price" name="qi_price_${i}" value="${esc(it.price?qFt(it.price):'')}" inputmode="numeric" placeholder="0"><span class="q-sum">${qFt(qNum(it.qty||1)*qNum(it.price))} Ft</span><span class="q-sumb">${qFt(Math.round(qNum(it.qty||1)*qNum(it.price)*(1+Q_VAT/100)))} Ft</span>${q.items.length>1?`<button type="button" class="mini" data-action="q-del" data-i="${i}" aria-label="Tétel törlése" title="Tétel törlése">✕</button>`:'<span></span>'}</div>`).join('')}
      <div class="q-foot"><button type="button" class="linkbtn" data-action="q-add">+ Tétel</button></div><div class="q-sumg" id="q-sumg">${qSumRows()}</div></div></div>
    <div class="field full"><div class="q-disc-on"><input type="checkbox" id="q-totOn" name="q_totOn"${qO().noTot?'':' checked'}><span aria-hidden="true">🧮</span><label for="q-totOn">Összesen sor az ajánlatban</label></div><div class="muted q-tot-h" style="font-size:12.5px;margin-top:4px"${qO().noTot?'':' hidden'}>Az ajánlatban csak a tételek és az egységárak látszanak (pl. napidíj, ha még nem tudni, hány nap lesz).</div></div>
    <div class="field full"><div class="q-disc-on"><input type="checkbox" id="q-discOn" name="q_discOn"${qO().discOn?' checked':''}><span aria-hidden="true">💸</span><label for="q-discOn">${q.opts.length>1?'Kedvezmény erre az opcióra':'Kedvezmény az ajánlatban'}</label></div><div class="q-disc"${qO().discOn?'':' hidden'}><input class="inp" id="q-discLbl" name="q_discLbl" value="${esc(qO().discLbl||'Csomagkedvezmény')}" maxlength="60" aria-label="A kedvezmény megnevezése"><span class="q-disc-p"><input class="inp" id="q-disc" name="q_disc" value="${esc(qO().disc||'')}" inputmode="decimal" placeholder="0" aria-label="Kedvezmény százalékban (legfeljebb 20%)" title="Legfeljebb 20%"><em>%</em></span>${[5,10,15,20].map(x=>`<button type="button" class="chip" data-action="q-discset" data-v="${x}">${x}%</button>`).join('')}</div><span class="hint q-disc-h"${qO().discOn?'':' hidden'}>A tételek összegéből vonjuk le (legfeljebb 20%); az ajánlaton külön sorban látszik.</span></div>
    <div class="field full"><label for="q-note">Megjegyzés az ajánlatban (nem kötelező)</label><textarea class="inp" maxlength="2000" id="q-note" name="q_note" rows="2" placeholder="pl. Az ár tartalmazza a stáb utazását Budapesten belül.">${esc(q.note)}</textarea></div>
    </div>`,
    {submitLabel:'Előnézet →',noDraft:true,left:`<button type="button" class="btn ghost" data-action="q-back">← Vissza az árkalkulátorhoz</button><button type="button" class="btn outline" data-action="q-save">💾 Mentés</button>`,submit:fd=>{qRead(fd);
      if(!/@/.test(q.to)){toast('Add meg a címzett e-mail-címét.',true);return;}{const nt=q.opts.length>1?q.opts.findIndex(o=>!String(o.title||'').trim()):-1;if(nt>=0){toast((nt+1)+'. opció: add meg az opció nevét.',true);if(nt!==q.oi){qSetOpt(nt);qEdit();}setTimeout(()=>{const i=$('q-otitle');if(i){i.classList.add('err');i.focus();}},60);return;}}{const bad=q.opts.findIndex(o=>!o.items.some(it=>it.name&&qNum(it.price)));if(bad>=0){toast((q.opts.length>1?(bad+1)+'. opció: ':'')+'adj meg legalább egy tételt árral.',true);if(bad!==q.oi){qSetOpt(bad);qEdit();}return;}}qPreview();}});
  const mb=document.querySelector('#modalRoot .mbox');if(mb)mb.classList.add('mbox-wide','mbox-scroll');}
/* összesítő a PDF-fel azonos szerkezetben: teljes ár → kedvezmény → kedvezményes ár (vagy csak Összesen) */
function qSumRows(){const br=n=>Math.round(n*(1+Q_VAT/100)),g=qGross(),dc=qDisc(),t=qTotal(),dp=qDiscPct(),r=(c,l,a,b)=>`<div class="q-row q-srow ${c}"><span></span><span>${l}</span><span></span><span></span><span class="q-sum">${a}</span><span class="q-sumb">${b}</span><span></span></div>`;
  return dp?r('q-s-full','Teljes ár',qFt(g)+' Ft',qFt(br(g))+' Ft')+r('q-s-disc',esc(qO().discLbl||'Csomagkedvezmény')+' ('+String(dp).replace('.',',')+'%)','−'+qFt(dc)+' Ft','−'+qFt(br(dc))+' Ft')+r('q-s-fin','Kedvezményes ár',qFt(t)+' Ft',qFt(br(t))+' Ft'):r('q-s-full','Összesen',qFt(t)+' Ft',qFt(br(t))+' Ft');}
function qTotUi(){const el=$('q-sumg');if(el)el.innerHTML=qSumRows();}
document.addEventListener('input',e=>{const t=e.target;if(!t||!S.q||!t.name||!/^(qi_(qty|price)_|q_disc$)/.test(t.name))return;const f=$('mform');if(!f)return;qRead(new FormData(f));
  if(t.name!=='q_disc'){const i=Number(t.name.split('_').pop()),it=S.q.items[i],row=t.closest('.q-row'),sm=row&&row.querySelector('.q-sum');if(sm&&it)sm.textContent=qFt(qNum(it.qty||1)*qNum(it.price))+' Ft';const sb=row&&row.querySelector('.q-sumb');if(sb&&it)sb.textContent=qFt(Math.round(qNum(it.qty||1)*qNum(it.price)*(1+Q_VAT/100)))+' Ft';}qTotUi();});
document.addEventListener('change',e=>{const t=e.target;if(!t||(t.name!=='q_ev'&&t.name!=='q_evname')||!S.q)return;const prev=S.q.ev,pn=S.q.evName,f=$('mform');if(f)qRead(new FormData(f));const q=S.q,d=(S.deals||[]).find(x=>x.id===q.dealId)||{},ev=t.name==='q_ev'?t.value==='1':prev,old=qAuto(d,prev,pn,q.valid),nw=qAuto(d,ev,q.evName,q.valid);
  if(q.subject===old.subject)q.subject=nw.subject;if(q.body===old.body)q.body=nw.body;q.ev=ev;   // csak a saját (nem átírt) alapszöveget cseréljük
  const sj=$('q-subject'),bd=$('q-body');if(sj)sj.value=q.subject;if(bd)bd.value=q.body;document.querySelectorAll('.q-evsel label').forEach(l=>l.classList.toggle('on',l.querySelector('input').checked));const en=document.querySelector('.q-evname');if(en)en.hidden=!q.ev;});
document.addEventListener('change',e=>{const t=e.target;if(t&&t.id==='q-totOn'&&S.q){qO().noTot=!t.checked;document.querySelectorAll('.q-tot-h').forEach(x=>x.hidden=t.checked);}});
document.addEventListener('change',e=>{const t=e.target;if(t&&t.id==='q-discOn'&&S.q){const o=qO();o.discOn=t.checked;document.querySelectorAll('.q-disc,.q-disc-h').forEach(x=>x.hidden=!t.checked);if(t.checked&&!qNum(o.disc)){o.disc='10';const i=$('q-disc');if(i)i.value='10';}qTotUi();if(t.checked){const i=$('q-disc');if(i)i.focus();}return;}if(t&&t.name==='q_disc'&&S.q&&qNum(t.value)>Q_DISC_MAX){t.value=String(Q_DISC_MAX);S.q.disc=t.value;qTotUi();toast('A kedvezmény legfeljebb '+Q_DISC_MAX+'% lehet.');}});
document.addEventListener('change',e=>{const t=e.target;if(t&&t.classList&&t.classList.contains('q-price')){const n=qNum(t.value);t.value=n?qFt(n):'';}});
Object.assign(ACT,{
  'q-cc-del':b=>{const L=[...document.querySelectorAll('.q-ccin')].map(x=>x.value.trim());L.splice(Number(b.dataset.i),1);const f=$('mform');if(f)qRead(new FormData(f));S.q.cc=L.filter(Boolean).join(', ');S.q.ccN=Math.max(1,L.length);qEdit();},
  'q-cc-add':()=>{const f=$('mform');if(f)qRead(new FormData(f));const q=S.q;q.ccN=String(q.cc||'').split(',').filter(x=>x.trim()).length+1;qEdit();setTimeout(()=>{const a=document.querySelectorAll('.q-ccin');if(a.length)a[a.length-1].focus();},50);},
  'q-cat-menu':b=>{const m=b.parentNode.querySelector('.q-cat-menu');m.hidden=!m.hidden;},
  /* új kategória: a kalkulátor az adott fülön nyílik, az átvett tételek új opcióba kerülnek; üres = kézi tételek */
  'q-cat-add':b=>{const f=$('mform');if(f)qRead(new FormData(f));const q=S.q,pg=b.dataset.p;
    if(!pg){q.opts.push({title:'',items:[{name:'',qty:'1',price:''}]});qSetOpt(q.opts.length-1);qEdit();setTimeout(()=>{const i=$('q-otitle');if(i)i.focus();},60);return;}
    S._arkPg=pg;ACT['ark-open']({dataset:{q:q.dealId}});},
  'q-add':()=>{const f=$('mform');if(f)qRead(new FormData(f));S.q.items.push({name:'',qty:'1',price:''});qEdit();},
  'q-del':b=>{const f=$('mform');if(f)qRead(new FormData(f));S.q.items.splice(Number(b.dataset.i),1);qEdit();},
  'q-back':()=>{const f=$('mform');if(f&&$('q-to'))qRead(new FormData(f));ACT['ark-open']({dataset:{q:S.q.dealId}});},   // az ajánlat megmarad: a kalkulátorból további tételek vehetők át
  'q-edit':()=>qEdit(),
  'q-opt':b=>{const f=$('mform');if(f)qRead(new FormData(f));qSetOpt(Number(b.dataset.i));qEdit();},
  'q-opt-add':()=>{const f=$('mform');if(f)qRead(new FormData(f));const q=S.q;{const c=qO();q.opts.push({title:'',items:q.items.map(it=>Object.assign({},it)),discOn:!!c.discOn,noTot:!!c.noTot,disc:c.disc||'',discLbl:c.discLbl||''});}qSetOpt(q.opts.length-1);qEdit();toast('Új opció: az előző másolata – írd át a darabszámot / tételeket.');},
  'q-opt-del':()=>{const f=$('mform');if(f)qRead(new FormData(f));const q=S.q;if(q.opts.length<2)return;if(!confirm((q.oi+1)+'. opció törlése?'))return;q.opts.splice(q.oi,1);qSetOpt(Math.min(q.oi,q.opts.length-1));qEdit();},
  'q-calc':()=>{const f=$('mform');if(f)qRead(new FormData(f));ACT['ark-open']({dataset:{q:S.q.dealId}});},   // a kalkulátor tételei az aktív opcióba kerülnek
  'q-discset':b=>{const i=$('q-disc');if(!i)return;i.value=b.dataset.v;qO().disc=b.dataset.v;qTotUi();},
  /* a PDF-et az előnézet megnyitásakor (előtérben) készítjük el: háttérlapon a rajzoló üres oldalt adna */
  'q-open':async b=>{const toUrl=b64=>{const bin=atob(b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);return URL.createObjectURL(new Blob([u8],{type:'application/pdf'}));};
    const q=S.q;if(!q)return;if(q._pdf){window.open(toUrl(q._pdf),'_blank');return;}
    b.disabled=true;const t=b.textContent;b.textContent='PDF készül…';try{const b64=await qPdfCached();const w=window.open(toUrl(b64),'_blank');if(!w)toast('A böngésző letiltotta az új lapot – kattints újra.',true);}catch(e){handleErr(e);}finally{b.disabled=false;b.textContent=t;}}
});
const qFileName=()=>{const d=(S.deals||[]).find(x=>x.id===S.q.dealId)||{},evn=S.q.evName!=null?S.q.evName:d.title,who=S.q.ev&&evn?evn:((S.q.rc&&S.q.rc.name)||d.client||'');   // rendezvényre szóló: a rendezvény neve; általános: a cég neve
  return 'Arajanlat_'+(who?String(who).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w]+/g,'_').replace(/^_|_$/g,'').slice(0,50)+'_':'')+'Lumos_Motion.pdf';};
/* az ajánlat A4-es oldala (a PDF és az előnézet ugyanez) */
function qPageHtml(){const q=S.q,d=(S.deals||[]).find(x=>x.id===q.dealId)||{},s=q.sig||{},gross=qGross(),dp=qDiscPct(),disc=qDisc(),tot=qTotal(),vat=Math.round(tot*Q_VAT/100),now=new Date(),until=new Date(Date.now()+Math.max(1,qNum(q.valid)||20)*864e5);
  const row=(it,i)=>`<tr><td>${i+1}.</td><td>${esc(qDash(it.name))}${it.desc?`<small class="qp-desc">${esc(qDash(it.desc))}</small>`:''}</td><td class="r">${esc(it.qty||'1')}</td><td class="r">${qFt(it.price)} Ft</td><td class="r"><b>${qFt(qNum(it.qty||1)*qNum(it.price))} Ft</b></td><td class="r qp-br">${qFt(Math.round(qNum(it.qty||1)*qNum(it.price)*(1+Q_VAT/100)))} Ft</td></tr>`;
  return `<div class="qp"><div class="qp-head"><img src="mail/lumos-motion-stacked.png?v=2" alt="Lumos Motion" class="qp-logo"><div class="qp-meta"><b>ÁRAJÁNLAT</b><span>${esc(q.no)}</span><span class="qp-dates"><i>Kelt:</i><i>${qDate(now)}</i></span></div></div>
    <div class="qp-parties">${(()=>{const rc=q.rc||{name:d.client||d.contactName||'',person:d.client&&d.contactName?d.contactName:''},em=q.to;return `<div><small>Ajánlatot kapja</small><b>${esc(rc.name||'')}</b>${rc.person?`<span>${esc(rc.person)}</span>`:''}${rc.addr?`<span>${esc(rc.addr)}</span>`:''}${em?`<span>${esc(em)}</span>`:''}</div>`;})()}
      <div><small>Ajánlatot adja</small><b>Lumos Motion Kft.</b><span>Adószám: 32701573-2-41</span><span>1136 Budapest, Tátra utca 20/B, 3/5.</span></div></div>
    ${q.ev&&((q.evName!=null?q.evName:d.title)||d.eventDate||d.venue)?`<div class="qp-ev"><small>Rendezvény</small><b>${esc(q.evName!=null?q.evName:(d.title||''))}</b><span>${[d.eventDate?esc(fmtDay(d.eventDate)):'',d.venue?esc(d.venue):''].filter(Boolean).join(' · ')}</span></div>`:''}
    ${q.opts.map((o,oi)=>{const dp=qDiscPct(o),g=qOptGross(o.items),dc=Math.round(g*dp/100),t=g-dc,v=Math.round(t*Q_VAT/100),multi=q.opts.length>1;
      return `<div class="${multi?'qp-opt':''}">${multi?`<div class="qp-opt-h"><b>${o.title?esc(o.title):(oi+1)+'. opció'}</b></div>`:''}<table class="qp-tbl"><thead><tr><th>#</th><th>Megnevezés</th><th class="r">Menny.</th><th class="r">Egységár (nettó)</th><th class="r">Nettó</th><th class="r">Bruttó <span class="nw">(${Q_VAT}%&nbsp;ÁFA)</span></th></tr></thead><tbody>${o.items.filter(it=>it.name).map(row).join('')}</tbody>${o.noTot?'':`<tfoot>${dp?`<tr class="qp-fullbig"><td></td><td colspan="3">Teljes ár</td><td class="r">${qFt(g)} Ft</td><td class="r">${qFt(Math.round(g*(1+Q_VAT/100)))} Ft</td></tr><tr class="qp-disc"><td></td><td colspan="3">${esc(o.discLbl||'Csomagkedvezmény')} (${String(dp).replace('.',',')}%)</td><td class="r">−${qFt(dc)} Ft</td><td class="r">−${qFt(Math.round(dc*(1+Q_VAT/100)))} Ft</td></tr>`:''}<tr class="${dp?'qp-final':'qp-net'}"><td></td><td colspan="3">${dp?'Kedvezményes ár':'Összesen'}</td><td class="r">${qFt(t)} Ft</td><td class="r">${qFt(t+v)} Ft</td></tr></tfoot>`}</table>
    <div></div></div>`;}).join('')}
    ${q.note?`<div class="qp-note">${esc(q.note).replace(/\n/g,'<br>')}</div>`:''}
    <div class="qp-sig"><span>Üdvözlettel,</span><b>${esc(s.name||'')}</b>${s.title?`<span>${esc(s.title)}</span>`:''}<span>Lumos Motion Kft.</span>${s.phone?`<span>Tel.: ${esc(s.phone)}</span>`:''}${s.email?`<span>E-mail: ${esc(s.email)}</span>`:''}</div>
    <div class="qp-foot">Az ajánlat ${qDate(until).replace(/\.$/,'')}-ig érvényes (a keltétől számított ${esc(String(Math.max(1,qNum(q.valid)||20)))} napig).</div></div>`;}
/* mindig egyetlen A4-es oldal: a lap pontosan oldalméretű; ha a tartalom hosszabb, arányosan kicsinyítjük, hogy elférjen */
const Q_PH=1120;
/* oldalakra bontás: a blokkok (fejléc, felek, opciók, megjegyzés, aláírás) egészben kerülnek egy-egy A4-es oldalra; ami nem fér el, új oldalra megy */
function qPages(){const m=document.createElement('div');m.style.cssText='position:fixed;left:-10000px;top:0;width:794px;visibility:hidden;pointer-events:none';m.innerHTML=qPageHtml();document.body.appendChild(m);
  try{const pg=m.firstElementChild;pg.style.minHeight='0';const kids=[...pg.children],foot=kids.pop(),cs=getComputedStyle(pg),padT=parseFloat(cs.paddingTop)||0,padB=parseFloat(cs.paddingBottom)||0;
    const tops=kids.map(k=>k.getBoundingClientRect().top),ft=foot.getBoundingClientRect(),hs=kids.map((k,i)=>(i<kids.length-1?tops[i+1]:ft.top)-tops[i]);
    const cap=Q_PH-padT-padB-ft.height-24,pages=[];let cur=[],used=0;
    /* a tételtáblázat oldalhatáron sorok mentén kettéválik (a folytatásban újra a fejléc), így az első oldal nem marad üresen */
    const split=(k,h)=>{const tb=k.querySelector('table.qp-tbl tbody'),rows=tb?[...tb.children]:[];if(rows.length<2)return null;const kr=k.getBoundingClientRect(),tr=tb.getBoundingClientRect(),th=k.querySelector('table.qp-tbl thead'),
        oh=k.querySelector('.qp-opt-h'),head=tr.top-kr.top,thH=th?th.getBoundingClientRect().height:0,ohH=oh?oh.getBoundingClientRect().bottom-kr.top:0,foot=h-(tr.bottom-kr.top),rh=rows.map(r=>r.getBoundingClientRect().height);
      const part=(from,to,withHead,withFoot)=>{const c=k.cloneNode(true),cb=c.querySelector('table.qp-tbl tbody');[...cb.children].forEach((r,j)=>{if(j<from||j>=to)r.remove();});if(!withFoot){const tf=c.querySelector('tfoot');if(tf)tf.remove();}if(!withHead){const o=c.querySelector('.qp-opt-h');if(o)o.remove();}return c.outerHTML;};
      return {rows:rows.length,rh,head,thH,ohH,foot,part};};
    kids.forEach((k,i)=>{let h=hs[i];
      if(cur.length&&used+h>cap){const sp=split(k,h);
        if(sp){let from=0,first=true;
          while(from<sp.rows){const hh=first?sp.head:sp.head-sp.ohH;let n=0,sum=hh;while(from+n<sp.rows&&sum+sp.rh[from+n]<=cap-used)sum+=sp.rh[from+n++];
            const last=from+n>=sp.rows;if(last&&sum+sp.foot>cap-used&&n>0){n--;sum-=sp.rh[from+n];}
            if(!n&&!cur.length){n=1;sum=hh+sp.rh[from];}   // egy sor önmagában is túl magas: akkor is továbblépünk
            if(n>=1&&(n>=2||!cur.length||from+n>=sp.rows)){cur.push(sp.part(from,from+n,first,from+n>=sp.rows));used+=sum+(from+n>=sp.rows?sp.foot:0);from+=n;first=false;}
            if(from<sp.rows){pages.push(cur);cur=[];used=0;}}
          return;}
        pages.push(cur);cur=[];used=0;}
      cur.push(k.outerHTML);used+=h;});pages.push(cur);
    return pages.map((p,i)=>`<div class="qp${i?' qp-cont':''}">${p.join('')}<div class="qp-foot"><span>${foot.innerHTML}</span>${pages.length>1?`<span class="qp-pn">${i+1}/${pages.length}. oldal</span>`:''}</div></div>`);}
  finally{m.remove();}}
async function qPdf(){const lib=await h2pLib(),pages=qPages(),host=document.createElement('div');host.style.cssText='position:fixed;left:0;top:0;z-index:-1;width:794px;background:#fff';
  host.innerHTML=pages.map(h=>'<div style="width:794px;height:'+Q_PH+'px;overflow:hidden;position:relative;background:#fff">'+h+'</div>').join('');document.body.appendChild(host);
  try{const boxes=[...host.children];await Promise.all([...host.querySelectorAll('img')].map(im=>im.complete?0:new Promise(r=>{im.onload=im.onerror=r;})));if(document.fonts&&document.fonts.ready)await document.fonts.ready;
    boxes.forEach(box=>{const pg=box.firstElementChild;pg.style.minHeight=Q_PH+'px';const h=pg.scrollHeight;   // egy blokk önmagában sem fér el egy oldalra: arányosan kicsinyítjük
      if(h>Q_PH){const k=Q_PH/h;pg.style.width=(794/k)+'px';pg.style.minHeight=(Q_PH/k)+'px';pg.style.transformOrigin='0 0';pg.style.transform='scale('+k+')';}else pg.style.height=Q_PH+'px';});
    let w=lib().set({margin:0,filename:qFileName(),image:{type:'jpeg',quality:.95},html2canvas:{scale:2,scrollX:0,scrollY:0,useCORS:true},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}}).from(boxes[0]).toPdf();
    for(let i=1;i<boxes.length;i++){const b=boxes[i];w=w.get('pdf').then(p=>{p.addPage();}).from(b).toContainer().toCanvas().toPdf();}
    const uri=await w.outputPdf('datauristring');return String(uri).split(',')[1]||'';}
  finally{host.remove();}}
function qPdfCached(){const q=S.q;if(q._pdf)return Promise.resolve(q._pdf);if(!q._pdfP)q._pdfP=qPdf().then(b=>{if(S.q===q)q._pdf=b;return b;}).finally(()=>{q._pdfP=null;});return q._pdfP;}
function qPreview(){const q=S.q,s=q.sig||{};q._pdf=null;q._pdfP=null;if(!s.name&&q.dealId){q.sig=null;qSig(q.dealId).then(()=>{if(S.q===q&&q.sig&&q.sig.name&&document.querySelector('.q-prev'))qPreview();});}   /* ha még nincs meg az aláírás (pl. mentett vagy korábbi ajánlatból nyitva), lekérjük, és az előnézet frissül */
  openModal('📄 Árajánlat – előnézet',`<div class="q-prev"><div class="q-mail"><div class="q-mh"><div><span>Feladó:</span> ${esc((s.name||'')+' · Lumos Motion')} &lt;${esc(s.from||s.email||'')}&gt;${s.from&&s.email&&s.from.toLowerCase()!==s.email.toLowerCase()?` <small class="q-from-note">(a válaszok ${esc(s.email)} címre mennek – a saját címéről küldéshez „Küldés másként” álnév kell)</small>`:''}</div><div><span>Címzett:</span> ${esc(q.to)}${q.cc?' · Másolat: '+esc(q.cc):''}</div><div><span>Tárgy:</span> <b>${esc(q.subject)}</b></div><div><span>Melléklet:</span> 📎 ${esc(qFileName())}</div></div>
      <div class="q-mb"><div id="q-mbody" class="q-mbody" contenteditable="true" spellcheck="true" title="Kattints bele és írd át – így megy ki">${esc(q.body).replace(/\n/g,'<br>')}</div><br>${s.sigHtml||''}</div></div>
    <div class="q-pdf"><div class="q-pdf-h"><span>📎 A csatolt PDF</span><button type="button" class="linkbtn" data-action="q-open">↗ Megnyitás új lapon</button></div><div class="q-pdf-page">${qPages().join('')}</div></div></div>`,
    {submitLabel:'📨 Küldés',noDraft:true,
     submit:async()=>{const btn=document.querySelector('#mform button[type=submit]');if(btn){btn.disabled=true;btn.textContent='Küldés…';}
       try{const pdf=await qPdfCached();const r=await call('dealQuoteSend',{dealId:q.dealId,to:q.to,cc:q.cc,subject:q.subject,body:q.body,pdf,fileName:qFileName(),total:q.opts.length>1?0:qTotal(),opts:q.opts.length,q:(()=>{const st=Object.assign({},q);delete st._pdf;delete st._pdfP;delete st.sig;return st;})()});
         if(r&&r.deals)S.deals=r.deals;closeModal();S.q=null;render(true);toast(r&&r.test?'TESZT: az ajánlat csak neked ment ki':'Árajánlat elküldve: '+q.to);}
       catch(e){if(btn){btn.disabled=false;btn.textContent='📨 Küldés';}handleErr(e);}}});
  const mb=document.querySelector('#modalRoot .mbox');if(mb)mb.classList.add('mbox-wide','mbox-scroll','mbox-q');
  {const sb=document.querySelector('#mform .mfoot button[type=submit]');if(sb)sb.insertAdjacentHTML('beforebegin','<button type="button" class="btn outline" data-action="q-edit">← Vissza</button>');}   // Mégse · Vissza · Küldés
  const fit=()=>{const w=document.querySelector('.q-pdf-page');if(!w)return;const z=String(Math.min(1,(w.clientWidth-24)/794));w.querySelectorAll('.qp').forEach(pg=>{pg.style.zoom=z;});};requestAnimationFrame(fit);setTimeout(fit,300);setTimeout(()=>{if(S.q===q)qPdfCached().catch(()=>{});},400);}   /* a PDF-oldal kicsinyítve, teljes szélességben látszik */
/* az előnézetben a levél szövege és tárgya is szerkeszthető – így megy ki */
document.addEventListener('input',e=>{const t=e.target;if(!S.q||!t)return;
  if(t.id==='q-mbody')S.q.body=t.innerText.replace(/ /g,' ').replace(/\n{3,}/g,'\n\n').replace(/\s+$/,'');
  else if(t.id==='q-subj-ed')S.q.subject=t.value;});
document.addEventListener('paste',e=>{const t=e.target&&e.target.closest&&e.target.closest('#q-mbody');if(!t)return;e.preventDefault();const x=(e.clipboardData||window.clipboardData).getData('text/plain');document.execCommand('insertText',false,x);});

/* Frissítés (pl. Cmd+Shift+R) után a nyitott árajánlat visszajön: kilépéskor elmentjük az állapotát, betöltéskor újranyitjuk */
const Q_KEY='lpm_q_state';
window.addEventListener('pagehide',()=>{try{const q=S.q,ed=document.getElementById('q-to'),pv=document.getElementById('q-mbody');if(!q||(!ed&&!pv)){sessionStorage.removeItem(Q_KEY);return;}
  const f=$('mform');if(ed&&f){try{qRead(new FormData(f));}catch(e){}}if(pv){q.body=pv.innerText.replace(/\n{3,}/g,'\n\n').trim();}
  const st=Object.assign({},q);delete st._pdf;delete st._pdfP;sessionStorage.setItem(Q_KEY,JSON.stringify({q:st,stage:pv?'preview':'edit',at:Date.now()}));}catch(e){}});
function qRestore(){if(S._qRestored)return;S._qRestored=true;let o=null;try{o=JSON.parse(sessionStorage.getItem(Q_KEY)||'null');sessionStorage.removeItem(Q_KEY);}catch(e){}
  if(!o||!o.q||Date.now()-o.at>3600000)return;S._mrDone=true;try{mrClear();}catch(e){}let n=0;const go=()=>{if(!(S.deals||[]).some(d=>d.id===o.q.dealId)||$('mform')){if(++n<40)setTimeout(go,300);return;}
    S.q=o.q;delete S.q.sig;qSig(o.q.dealId);if(o.stage==='preview')qPreview();else qEdit();};setTimeout(go,200);}

/* Érvényesség módosítása: az e-mail szövegében is frissül a napok száma */
document.addEventListener('change',e=>{const t=e.target;if(!t||t.name!=='q_valid'||!S.q)return;const n=Math.max(1,parseInt(t.value,10)||20);S.q.valid=String(n);
  S.q.body=String(S.q.body||'').replace(/Az ajánlat \d+ napig érvényes\./,'Az ajánlat '+n+' napig érvényes.');const bd=$('q-body');if(bd)bd.value=S.q.body;});

/* Kiküldött ajánlat: a lehetőség kártyáján / ablakában – a PDF megnyitása, vagy új verzió az elküldött ajánlatból */
/* a kiküldött ajánlat PDF-je: rámutatáskor előre letöltjük, és megjegyezzük – kattintásra azonnal nyílik */
const QS_C={};const qsGet=id=>QS_C[id]||(QS_C[id]=call('quoteSent',{dealId:id,op:'pdf'}).catch(e=>{delete QS_C[id];throw e;}));
document.addEventListener('pointerover',e=>{const c=e.target&&e.target.closest&&e.target.closest('.dl-card'),b=(c&&c.querySelector('[data-action="q-sent-open"]'))||(e.target&&e.target.closest&&e.target.closest('[data-action="q-sent-open"]'));   /* már a kártyára mutatva előtölt */if(b&&b.dataset.id&&!QS_C[b.dataset.id])qsGet(b.dataset.id).catch(()=>{});},{passive:true});
ACT['q-sent-open']=async b=>{const d=(S.deals||[]).find(x=>x.id===b.dataset.id);if(!d)return;
  /* betöltés közben egy másik ajánlatra kattintva: mindig az utoljára kért nyílik meg (a korábbi betöltés eredménye elvész, nem ugrik fel később) */
  const tok=S._qsTok=(S._qsTok||0)+1;document.querySelectorAll('.dl-qsent.qs-loading').forEach(x=>x.classList.remove('qs-loading'));if(b.classList)b.classList.add('qs-loading');
  let r=null;try{r=Object.assign({},await qsGet(d.id));}catch(e){if(tok===S._qsTok){if(b.classList)b.classList.remove('qs-loading');handleErr(e);}return;}
  if(b.classList)b.classList.remove('qs-loading');if(tok!==S._qsTok)return;
  if(!r||!r.b64){delete QS_C[d.id];   /* nem találtuk: a PDF feltölthető (pl. az értékesítő elküldött leveléből letöltve) */
    openModal('📨 Kiküldött ajánlat – PDF feltöltése',`<p style="margin:0 0 10px">Ennek az ajánlatnak a PDF-jét nem találtam a levelek között – valószínűleg ${esc(d.ownerName||'az értékesítő')} saját postafiókjából ment ki, ahhoz az app nem fér hozzá.</p><p class="hint" style="margin:0 0 12px">Ha megvan a PDF (pl. az elküldött levél mellékletéből letöltve), töltsd fel ide – utána a kártyáról is megnyitható lesz.</p><input class="inp" id="m-qsFile" type="file" accept="application/pdf,.pdf">`,
      {submitLabel:'Feltöltés',noDraft:true,submit:async()=>{const fi=$('m-qsFile'),f=fi&&fi.files&&fi.files[0];if(!f){toast('Válaszd ki a PDF-et.',true);return;}if(f.size>9*1024*1024){toast('A fájl túl nagy (max. 9 MB).',true);return;}
        const b64=await new Promise((ok,no)=>{const rd=new FileReader();rd.onload=()=>ok(String(rd.result).split(',')[1]||'');rd.onerror=no;rd.readAsDataURL(f);});
        try{QS_C[d.id]=call('quoteSent',{dealId:d.id,op:'upload',b64,name:f.name});await QS_C[d.id];closeModal();toast('PDF feltöltve');ACT['q-sent-open']({dataset:{id:d.id}});}catch(e){delete QS_C[d.id];handleErr(e);}}});return;}
  const bin=atob(r.b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);const url=URL.createObjectURL(new Blob([u8],{type:'application/pdf'}));delete r.b64;S._qSent=r;
  const ft=n=>String(Math.round(Number(n)||0)).replace(/\B(?=(\d{3})+(?!\d))/g,' ');   /* az ajánlat maga, ablakban (PDF-nézőben) */
  openModal('📨 '+(d.title||'Kiküldött ajánlat'),`<p class="hint" style="margin:0 0 8px">Kiküldve: ${esc(String(r.at||'').slice(0,16))}${r.by?' · küldte: '+esc(r.by):''} · ${(()=>{const ext=String(r.to||'').split(/\s*,\s*/).filter(x=>x&&!/@lumosmotion\.(com|hu)$/i.test(x));   /* a belső (saját) címeket nem mutatjuk */
    return ext.length?'<b>címzett: '+esc(ext.join(', '))+'</b>':'<span class="bad-txt">az appból csak belső címre ment ki – az ügyfélnek ('+esc(d.contactEmail||d.client||'?')+') az app nem küldte el</span>';})()}${Number(r.total)?' · '+ft(r.total)+' Ft + ÁFA (nettó)':''}</p><div class="qs-pdf" id="qs-pdf"><p class="hint" style="margin:20px">Betöltés…</p></div>`,
    {cancelLabel:'Bezárás',noDraft:true,left:`<a class="btn ghost" href="${url}" download="${esc((d.title||'Arajanlat').replace(/[\\/:*?"<>|]+/g,'-'))}.pdf">⬇ Letöltés</a><a class="btn ghost qs-newtab" href="${url}" target="_blank" rel="noopener">↗ Új lapon</a><button type="button" class="btn ghost qs-fs" data-action="qs-full" title="Teljes képernyő"><span class="qs-fs-i">⛶</span><span class="qs-fs-t"> Teljes képernyő</span></button>${r.q?`<button type="button" class="btn outline" data-action="q-sent-new" data-id="${esc(d.id)}">✏️ Új verzió ebből</button>`:''}`});
  const mb=document.querySelector('#modalRoot .mbox');if(mb)mb.classList.add('mbox-wide','qs-box');QS_DOC={u8,z:0};qsRender();};
ACT['q-sent-new']=b=>{const d=(S.deals||[]).find(x=>x.id===b.dataset.id),r=S._qSent;closeModal();if(!d||!r||!r.q)return;const q=r.q;q.dealId=d.id;q.no='A-'+todayISO().replace(/-/g,'')+'-'+String(d.id||'').replace(/[^a-z0-9]/gi,'').slice(0,4).toUpperCase();S.q=q;qSig(d.id);qEdit();toast('Új verzió az elküldött ajánlatból – módosítsd, majd küldd ki');};

/* teljes képernyő: csak az ajánlat és egy kilépés gomb marad; ahol a böngésző engedi, valódi teljes képernyő is */
function qsRefit(){const D=QS_DOC,box=$('qs-pdf'),wr=box&&box.querySelector('.qs-pages');if(!D||!wr||!D.W)return;const pad=box.clientWidth<700?16:32;D.W=Math.max(200,box.clientWidth-pad);wr.style.width=Math.round(D.W*(D.z||100)/100)+'px';}
function qsFullSet(on){const mb=document.querySelector('#modalRoot .qs-box');if(!mb)return;mb.classList.toggle('qs-full',on);const b=mb.querySelector('.qs-fs');
  if(b){b.querySelector('.qs-fs-t').textContent=on?' Kilépés':' Teljes képernyő';b.querySelector('.qs-fs-i').textContent=on?'✕':'⛶';b.title=on?'Kilépés a teljes képernyőből':'Teljes képernyő';}
  requestAnimationFrame(()=>{qsRefit();const bx=$('qs-pdf');if(bx)bx.scrollTo({top:0,left:0});});}
ACT['qs-full']=()=>{const mb=document.querySelector('#modalRoot .qs-box');if(!mb)return;const on=!mb.classList.contains('qs-full');qsFullSet(on);
  try{if(on){const el=document.documentElement;if(el.requestFullscreen)el.requestFullscreen().catch(()=>{});else if(el.webkitRequestFullscreen)el.webkitRequestFullscreen();}
    else if(document.fullscreenElement||document.webkitFullscreenElement){(document.exitFullscreen||document.webkitExitFullscreen).call(document);}}catch(x){}};
['fullscreenchange','webkitfullscreenchange'].forEach(ev=>document.addEventListener(ev,()=>{const mb=document.querySelector('#modalRoot .qs-box.qs-full');if(mb&&!(document.fullscreenElement||document.webkitFullscreenElement))qsFullSet(false);}));
window.addEventListener('resize',()=>{if(document.querySelector('#modalRoot .qs-box'))qsRefit();});   /* forgatáskor / teljes képernyőnél az ajánlat a szélességhez igazodik */
{const mr=document.getElementById('modalRoot');if(mr&&window.MutationObserver)new MutationObserver(()=>{if(!mr.querySelector('.qs-box')&&(document.fullscreenElement||document.webkitFullscreenElement))try{(document.exitFullscreen||document.webkitExitFullscreen).call(document);}catch(x){}}).observe(mr,{childList:true});}   /* az ablak bezárásakor a teljes képernyő is megszűnik */
document.addEventListener('click',e=>{if(e.target&&e.target.closest&&e.target.closest('.qs-newtab'))setTimeout(()=>{try{closeModal();}catch(x){}},0);});   /* új lapon nyitva: az ablak bezárul */

/* kiküldött ajánlat nézője: a PDF oldalait maga az app rajzolja ki (pdf.js) – telefonon is működik; nagyítás / kicsinyítés / teljes szélesség */
/* kiküldött ajánlat nézője: a PDF oldalait egyszer, nagy felbontással rajzoljuk ki (pdf.js); a nagyítás csak a méretet állítja
   (nincs újrarajzolás, ezért elengedéskor sem ugrik), és a két ujj közötti pont mindig az ujjak alatt marad */
let QS_DOC=null;
async function qsRender(){const box=$('qs-pdf'),D=QS_DOC;if(!box||!D)return;try{const lib=await pdfLib();D.doc=D.doc||await lib.getDocument({data:D.u8.slice(),isEvalSupported:false}).promise;const doc=D.doc;
    const mob=box.clientWidth<700,pad=mob?16:32,W=Math.max(200,box.clientWidth-pad),dpr=Math.min(3,window.devicePixelRatio||1),wr=document.createElement('div');wr.className='qs-pages';
    for(let n=1;n<=doc.numPages;n++){const pg=await doc.getPage(n),v1=pg.getViewport({scale:1}),vp=pg.getViewport({scale:Math.min(W/v1.width*dpr*2,4000/v1.width)}),c=document.createElement('canvas');
      c.width=Math.floor(vp.width);c.height=Math.floor(vp.height);c.className='qs-page';await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;wr.appendChild(c);}
    if($('qs-pdf')!==box||QS_DOC!==D)return;   /* közben másik ajánlat nyílt meg */
    D.W=W;D.z=100;wr.style.width=W+'px';box.innerHTML='';box.appendChild(wr);}catch(e){box.innerHTML='<p class="bad-txt" style="margin:20px">A PDF nem jeleníthető meg itt – nyisd meg új lapon vagy töltsd le.</p>';}}
/* a függőlegesen ténylegesen görgető elem (telefonon a felugró ablak vagy a háttere) */
function qsScroller(el){if(el&&/(auto|scroll)/.test(getComputedStyle(el).overflowY)&&el.scrollHeight>el.clientHeight+1)return el;let e=el&&el.parentElement;while(e&&e!==document.body){const cs=getComputedStyle(e);if(/(auto|scroll)/.test(cs.overflowY)&&e.scrollHeight>e.clientHeight+1)return e;e=e.parentElement;}return document.scrollingElement||document.documentElement;}
/* nagyítás: a (cx,cy) képernyőpont alatti rész a helyén marad */
function qsZoomAt(z,cx,cy){const D=QS_DOC,box=$('qs-pdf'),wr=box&&box.querySelector('.qs-pages');if(!D||!wr||!D.W)return;z=Math.max(100,Math.min(400,z));
  const r1=wr.getBoundingClientRect(),px=(cx-r1.left)/r1.width,py=(cy-r1.top)/r1.height;D.z=z;wr.style.width=Math.round(D.W*z/100)+'px';
  const r2=wr.getBoundingClientRect(),dx=r2.left+px*r2.width-cx,dy=r2.top+py*r2.height-cy;box.scrollLeft+=dx;const sc=qsScroller(box);if(sc)sc.scrollTop+=dy;}
document.addEventListener('wheel',e=>{const box=e.target&&e.target.closest&&e.target.closest('#qs-pdf');if(!box||!e.ctrlKey||!QS_DOC)return;e.preventDefault();qsZoomAt((QS_DOC.z||100)*Math.exp(-e.deltaY*0.01),e.clientX,e.clientY);},{passive:false});
let QS_PZ=null;const qsMid=t=>({x:(t[0].clientX+t[1].clientX)/2,y:(t[0].clientY+t[1].clientY)/2,d:Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY)});
document.addEventListener('touchstart',e=>{const box=e.target&&e.target.closest&&e.target.closest('#qs-pdf');if(!box||!QS_DOC||e.touches.length!==2)return;const m=qsMid(e.touches);QS_PZ={d:m.d,z:QS_DOC.z||100,x:m.x,y:m.y};},{passive:true});
document.addEventListener('touchmove',e=>{if(!QS_PZ||e.touches.length!==2)return;e.preventDefault();const m=qsMid(e.touches);
  qsZoomAt(QS_PZ.z*m.d/QS_PZ.d,m.x,m.y);const box=$('qs-pdf'),sc=box&&qsScroller(box);if(box){box.scrollLeft-=m.x-QS_PZ.x;}if(sc)sc.scrollTop-=m.y-QS_PZ.y;QS_PZ.x=m.x;QS_PZ.y=m.y;},{passive:false});   /* csippentés közben két ujjal mozgatni is lehet */
document.addEventListener('touchend',e=>{if(QS_PZ){if(e.touches.length<2)QS_PZ=null;return;}
  /* nagyítás nélkül görgetés után az ablak pontosan visszaáll a megnyitáskori helyzetébe */
  const mb=e.target&&e.target.closest&&e.target.closest('.qs-box');if(!mb||e.touches.length||!QS_DOC||(QS_DOC.z||100)>100)return;
  setTimeout(()=>{try{const bx=$('qs-pdf'),sc=qsScroller(bx);   /* csak ha nincs mit görgetni (a tartalom elfér) – különben a görgetett helyzet marad */
    if(sc&&sc!==bx&&sc.scrollHeight<=sc.clientHeight+2)sc.scrollTo({top:0,behavior:'smooth'});if(bx&&bx.scrollWidth<=bx.clientWidth+2&&bx.scrollLeft)bx.scrollTo({left:0,behavior:'smooth'});}catch(x){}},60);},{passive:true});
