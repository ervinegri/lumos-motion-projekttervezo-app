/* Az ügyfél jóváhagyó oldala (a belső ellenőrző nézet mintájára): beágyazott lejátszó, mellette az észrevételek időkóddal,
   jóváhagyás vagy módosítási kérés. A döntés csak gombnyomásra történik (a levelezők előre megnyithatják a linket). */
(function(){
  const $=id=>document.getElementById(id),q=new URLSearchParams(location.search),t=q.get('t')||'',d=q.get('d')||'';
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const api=(fn,args)=>fetch(window.LUMOS_API_URL+'?p='+encodeURIComponent(JSON.stringify({fn,args}))).then(r=>r.json()).then(j=>{if(!j.ok)throw new Error(j.error||'Hiba');return j.data;});
  const T0=Date.now(),introOut=()=>setTimeout(()=>{const i=$('intro');if(i)i.classList.add('out');},Math.max(0,1700-(Date.now()-T0)));
  const err=m=>{introOut();$('load').hidden=true;$('err').hidden=false;$('err').textContent=m;};
  const tcFmt=s=>{s=Math.max(0,Math.floor(s||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
  function embed(u){u=String(u||'').trim();let m;
    if((m=/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]{10,})/.exec(u)))return `<iframe src="https://drive.google.com/file/d/${m[1]}/preview" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    if((m=/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/.exec(u)))return `<iframe data-vert="${/shorts\//.test(u)?1:''}" src="https://www.youtube.com/embed/${m[1]}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    if((m=/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/.exec(u)))return `<iframe src="https://player.vimeo.com/video/${m[1]}${m[2]?'?h='+m[2]:''}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    if(/^https:\/\/.+\.(mp4|webm|mov|m4v)(\?|$)/i.test(u))return `<video src="${esc(u)}" controls playsinline></video>`;
    if((m=/(?:^|\/\/)(e\.)?(?:u\.)?pcloud\.link\/publink\/show\?code=([\w-]+)/i.exec(u)))return `<div class="noembed" data-pc-code="${esc(m[2])}" data-pc-eu="${m[1]?'1':''}"><span class="spin"></span>Videó betöltése…</div>`;
    return '';}
  const noEmbed=(u,why)=>`<div class="noembed">${why?esc(why)+'<br>':''}A videó itt nem játszható le.${u?`<a href="${esc(u)}" target="_blank" rel="noopener">▶ Videó megnyitása</a>`:''}</div>`;
  async function pcloud(link){const el=document.querySelector('[data-pc-code]');if(!el)return;const code=el.dataset.pcCode,hosts=el.dataset.pcEu?['eapi','api']:['api','eapi'];
    const vidOf=m=>{if(!m)return null;if(!m.isfolder)return m;const L=[];(function w(c){(c||[]).forEach(x=>{if(x.isfolder)w(x.contents);else if(/^video\//.test(x.contenttype||'')||/\.(mp4|mov|m4v|webm)$/i.test(x.name||''))L.push(x);});})(m.contents);return L[0]||null;};
    for(const h of hosts){try{const sj=await (await fetch(`https://${h}.pcloud.com/showpublink?code=${encodeURIComponent(code)}`,{referrerPolicy:'no-referrer'})).json();if(!sj||sj.result!==0)continue;
        const f=vidOf(sj.metadata);if(!f)break;
        const j=await (await fetch(`https://${h}.pcloud.com/getpublinkdownload?code=${encodeURIComponent(code)}&forcedownload=0${f.fileid&&sj.metadata.isfolder?'&fileid='+f.fileid:''}`,{referrerPolicy:'no-referrer'})).json();
        if(j&&j.result===0&&j.hosts&&j.hosts.length&&j.path){el.outerHTML=`<video src="https://${j.hosts[0]}${j.path}" referrerpolicy="no-referrer" controls playsinline></video>`;videoReady();return;}}catch(e){}}
    el.outerHTML=noEmbed(link);}
  const vd=()=>document.querySelector('#player video');
  function videoReady(){const v=vd();if(!v)return;$('bTc').hidden=false;$('tcHint').textContent='Állítsd meg a videót ott, ahol módosítást kérsz, és nyomj Entert (vagy a gombot): az időkód bekerül a szövegbe, utána írd mögé az észrevételed.';
    const upd=()=>{$('tcNow').textContent=tcFmt(v.currentTime);};['timeupdate','seeked','loadedmetadata'].forEach(e=>v.addEventListener(e,upd));
    const asp=()=>{if(v.videoWidth&&v.videoHeight>v.videoWidth){const p=$('player');p.classList.add('vert');p.style.setProperty('--ar',v.videoWidth+'/'+v.videoHeight);$('main').classList.add('vside');}};if(v.videoWidth)asp();else v.addEventListener('loadedmetadata',asp,{once:true});}
  function insTc(){const v=vd(),ta=$('fb');if(!v)return;v.pause();const s='['+tcFmt(v.currentTime)+'] ',a=ta.selectionStart,b=ta.selectionEnd,pre=ta.value.slice(0,a),nl=pre&&!pre.endsWith('\n')?'\n':'';
    ta.value=pre+nl+s+ta.value.slice(b);const c=(pre+nl+s).length;ta.focus();ta.setSelectionRange(c,c);}
  let shown=false;
  const show=i=>{introOut();$('load').hidden=true;$('main').hidden=false;$('ttl').hidden=false;$('video').textContent=i.video;$('project').textContent=i.project;
    if(i.link){$('watch2').href=i.link;$('newTab').hidden=false;}
    if(!shown){shown=true;const e=i.link?embed(i.link):'';$('player').innerHTML=e||noEmbed(i.link,i.link?'':'Ehhez a videóhoz még nincs link.');
      const yf=document.querySelector('#player iframe[data-vert="1"]');if(yf){$('player').classList.add('vert');$('main').classList.add('vside');}
      if(document.querySelector('[data-pc-code]'))pcloud(i.link);else videoReady();}
    $('ask').hidden=i.state!=='wait';$('doneOk').hidden=i.state!=='ok';$('doneMod').hidden=i.state!=='mod';};
  if(!t){err('Hiányzó vagy hibás link.');return;}
  api('clientInfo',[t]).then(i=>{show(i);if(d==='mod'&&i.state==='wait')$('fb').focus();}).catch(e=>err(e.message));
  const go=(dec,fb,btn)=>{$('err2').hidden=true;btn.disabled=true;api('clientDecide',[t,dec,fb||'']).then(show).catch(e=>{btn.disabled=false;$('err2').hidden=false;$('err2').textContent=e.message;});};
  $('bOk').onclick=e=>{if($('fb').value.trim().length>=3&&!confirm('Írtál észrevételt. Biztosan jóváhagyod a videót módosítás nélkül?'))return;go('ok','',e.currentTarget);};
  $('bSend').onclick=e=>{const fb=$('fb').value.trim();if(fb.length<3){$('err2').hidden=false;$('err2').textContent='Írd le röviden, mit módosítsunk.';$('fb').focus();return;}go('mod',fb,e.currentTarget);};
  $('bTc').onclick=insTc;
  $('fb').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.metaKey&&!e.ctrlKey&&vd()){e.preventDefault();insTc();}});
})();
