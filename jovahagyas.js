/* Az ügyfél jóváhagyó oldala: a levélben kapott aláírt link alapján egyetlen videót hagyhat jóvá, vagy kérhet módosítást.
   A döntés csak gombnyomásra történik (a levelezők előre megnyithatják a linket). */
(function(){
  const $=id=>document.getElementById(id),q=new URLSearchParams(location.search),t=q.get('t')||'',d=q.get('d')||'';
  const api=(fn,args)=>fetch(window.LUMOS_API_URL+'?p='+encodeURIComponent(JSON.stringify({fn,args}))).then(r=>r.json()).then(j=>{if(!j.ok)throw new Error(j.error||'Hiba');return j.data;});
  const err=m=>{$('load').hidden=true;$('err').hidden=false;$('err').textContent=m;};
  const show=i=>{$('load').hidden=true;$('main').hidden=false;$('video').textContent=i.video;$('project').textContent=i.project;
    if(i.link)$('watch').href=i.link;else $('watch').hidden=true;
    $('ask').hidden=i.state!=='wait';$('doneOk').hidden=i.state!=='ok';$('doneMod').hidden=i.state!=='mod'||!$('ask').hidden;};
  if(!t){err('Hiányzó vagy hibás link.');return;}
  api('clientInfo',[t]).then(i=>{show(i);if(d==='mod'&&i.state==='wait'){$('modBox').hidden=false;$('fb').focus();}}).catch(e=>err(e.message));
  const go=(dec,fb,btn)=>{btn.disabled=true;api('clientDecide',[t,dec,fb||'']).then(i=>{show(i);if(dec==='mod'){$('doneMod').hidden=false;}}).catch(e=>{btn.disabled=false;$('err').hidden=false;$('err').textContent=e.message;});};
  $('bOk').onclick=e=>go('ok','',e.currentTarget);
  $('bMod').onclick=()=>{$('modBox').hidden=false;$('fb').focus();};
  $('bSend').onclick=e=>{const fb=$('fb').value.trim();if(fb.length<3){$('fb').focus();return;}go('mod',fb,e.currentTarget);};
})();
