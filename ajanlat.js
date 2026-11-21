/* Fizetős javítás árajánlata – az ügyfél itt fogadja el vagy utasítja el (link a levélben). ?demo=1: bemutató, semmi nem megy el. */
(function(){
  const $=id=>document.getElementById(id),q=new URLSearchParams(location.search),t=q.get('t')||'',DEMO=q.has('demo');
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ft=n=>String(Math.round(Number(n)||0)).replace(/\B(?=(\d{3})+(?!\d))/g,' ')+' Ft';
  let DS={state:'open'};
  const api=DEMO?((fn,args)=>new Promise(res=>setTimeout(()=>{if(fn==='clientQuoteDecide')DS.state=args[1]==='ok'?'ok':'no';res({project:'Bemutató projekt',video:'Aftermovie',no:'JA-DEMO',items:[{name:'Harmadik javítási kör – vágás módosítása',net:35000}],req:'0:12 – a logó kerüljön jobbra\n0:45 – a zene legyen halkabb',total:35000,state:DS.state});},400)))
    :((fn,args)=>fetch(window.LUMOS_API_URL+'?p='+encodeURIComponent(JSON.stringify({fn,args}))).then(r=>r.json()).then(j=>{if(!j.ok)throw new Error(j.error||'Hiba');return j.data;}));
  const show=d=>{const B=$('box');
    const head=`<h1>Árajánlat – ${esc(d.video)}</h1><p class="sub">${esc(d.project)}${d.no?' · '+esc(d.no):''}</p>${d.req?`<div class="req"><b>A kért módosítás:</b><div>${esc(d.req).replace(/\n/g,'<br>')}</div></div>`:''}
      <table><tr><th>Tétel</th><th class="r">Nettó</th></tr>${(d.items||[]).map(r=>`<tr><td>${esc(r.name)}</td><td class="r">${ft(r.net)}</td></tr>`).join('')}<tr class="tot"><td>Összesen (nettó)</td><td class="r">${ft(d.total)}</td></tr></table>`;
    if(d.state==='ok'){B.innerHTML=head+'<p class="msg ok">Köszönjük, az ajánlatot elfogadtad! A javítással hamarosan jelentkezünk.</p>';return;}
    if(d.state==='no'){B.innerHTML=head+'<p class="msg">Rendben, a javítást nem kéred. A videó utolsó változata jóváhagyásra vár.</p>';return;}
    B.innerHTML=head+`<p class="hint">Ha elfogadod, elkészítjük a javítást. Ha nem kéred, az utolsó változat marad, és azt jóváhagyhatod.</p>
      <textarea id="note" maxlength="2000" placeholder="Üzenet (nem kötelező)"></textarea>
      <div class="btns"><button type="button" class="ok" id="bOk">✓ Elfogadom az ajánlatot</button><button type="button" id="bNo">Nem kérem a javítást</button></div><p class="err" id="err" hidden></p>`;
    const go=dec=>{const b1=$('bOk'),b2=$('bNo');b1.disabled=b2.disabled=true;api('clientQuoteDecide',[t,dec,($('note').value||'').trim()]).then(show).catch(e=>{b1.disabled=b2.disabled=false;const er=$('err');er.hidden=false;er.textContent=e.message||String(e);});};
    $('bOk').onclick=()=>go('ok');$('bNo').onclick=()=>{if(confirm('Biztosan nem kéred a javítást?'))go('no');};};
  if(!t&&!DEMO){$('box').innerHTML='<p class="msg">Érvénytelen link.</p>';return;}
  api('clientQuote',[t]).then(show).catch(e=>{$('box').innerHTML='<p class="msg">'+esc(e.message||String(e))+'</p>';});
})();
