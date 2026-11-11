/* Az ügyfél jóváhagyó oldala (a belső ellenőrző nézet mintájára): beágyazott lejátszó, mellette az észrevételek időkóddal,
   jóváhagyás vagy módosítási kérés. A döntés csak gombnyomásra történik (a levelezők előre megnyithatják a linket). */
(function(){
  const $=id=>document.getElementById(id),q=new URLSearchParams(location.search),t=q.get('t')||'',d=q.get('d')||'';
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const api=(fn,args)=>fetch(window.LUMOS_API_URL+'?p='+encodeURIComponent(JSON.stringify({fn,args}))).then(r=>r.json()).then(j=>{if(!j.ok)throw new Error(j.error||'Hiba');return j.data;});
  const T0=Date.now();let introDone=false;const introOut=()=>{if(introDone)return;introDone=true;setTimeout(()=>{const i=$('intro');if(i)i.classList.add('lgo');setTimeout(()=>{if(i)i.classList.add('out');document.body.classList.add('ready');setTimeout(autoPlay,350);},380);},Math.max(0,700-(Date.now()-T0)));};
  /* a nyitókép eltűnése után a videó magától indul (ha a böngésző hanggal nem engedi, némítva indul, és megjelenik egy „hang bekapcsolása” gomb) */
  let played=false;const autoPlay=()=>{if(played)return;const pl=$('player');if(!pl)return;const v=pl.querySelector('video');
    if(v){played=true;   // nagy ▶ Lejátszás gomb a videón: egy kattintás, és rögtön hanggal indul (kattintás nélkül a böngésző csak némítva engedné)
      if(!v.paused)return;const b=document.createElement('button');b.type='button';b.className='bigplay';b.setAttribute('aria-label','Videó lejátszása');b.innerHTML='<span class="bp-i">▶</span><span class="bp-t">Lejátszás</span>';
      const go=e=>{if(e){e.preventDefault();e.stopPropagation();}v.muted=false;if(!v.readyState)try{v.load();}catch(x){}const p=v.play();b.remove();if(p&&p.catch)p.catch(()=>{v.muted=true;v.play().catch(()=>{});});};/* ha a hangos indítást mégsem engedi, némítva indul */b.onclick=go;pl.appendChild(b);v.addEventListener('play',()=>b.remove(),{once:true});return;}
    const f=pl.querySelector('iframe');if(!f)return;played=true;const src=f.getAttribute('src')||'';
    if(/youtube\.com\/embed/.test(src))f.contentWindow.postMessage(JSON.stringify({event:'command',func:'playVideo',args:[]}),'*');
    else if(/player\.vimeo\.com/.test(src))f.contentWindow.postMessage(JSON.stringify({method:'play'}),'*');};
  /* a nyitókép addig marad, amíg minden betöltött (adatok + a videó első képkockája / a beágyazott lejátszó), utána lágyan átúszik; legfeljebb 8 mp-ig vár */
  const introWhenReady=()=>{setTimeout(introOut,7000);const pl=$('player');if(!pl){introOut();return;}
    const hook=()=>{const v=pl.querySelector('video'),f=pl.querySelector('iframe');
      if(v){if(v.readyState>=2)introOut();else{['loadeddata','error'].forEach(e=>v.addEventListener(e,introOut,{once:true}));}return true;}
      if(f){f.addEventListener('load',introOut,{once:true});return true;}
      if(!pl.querySelector('[data-pc-code]')){introOut();return true;}return false;};
    if(!hook()){const mo=new MutationObserver(()=>{if(hook())mo.disconnect();});mo.observe(pl,{childList:true,subtree:true});}};
  const err=m=>{introOut();$('load').hidden=true;$('err').hidden=false;$('err').textContent=m;};
  const FPS=25,tcFmt=s=>{const n=Math.max(0,Math.floor((Number(s)||0)*FPS+0.01)),t=Math.floor(n/FPS);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')+':'+String(n%FPS+1).padStart(2,'0');};   // ugyanaz a formátum, mint a vágónál: perc:mp:képkocka (01–25)
  const TC_RE=/\[(\d{1,3}):(\d{2})(?:([.,:])(\d{1,3}))?\]/g,tcSec=(a,b,c,sep)=>{const t=Number(a)*60+Number(b);if(!c)return t;if(sep===':')return (t*FPS+Math.max(0,Number(c)-1))/FPS;return t+Number(String(c).padEnd(3,'0'))/1000;};
  /* időkódok kiemelése a szövegmezőben (kék címke), és kattintásra a videó oda ugrik */
  function taHl(){const ta=$('fb');if(!ta)return;let hl=ta.parentElement.querySelector('.tc-hl');
    if(!hl){const w=document.createElement('div');w.className='tc-wrap';ta.parentElement.insertBefore(w,ta);w.appendChild(ta);hl=document.createElement('div');hl.className='tc-hl';hl.setAttribute('aria-hidden','true');w.insertBefore(hl,ta);
      const cs=getComputedStyle(ta);['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','boxSizing'].forEach(k=>{hl.style[k]=cs[k];});
      ta.addEventListener('input',taHl);ta.addEventListener('scroll',()=>{hl.scrollTop=ta.scrollTop;});new ResizeObserver(()=>{hl.style.width=ta.offsetWidth+'px';hl.style.height=ta.offsetHeight+'px';}).observe(ta);
      const hit=e=>{for(const mk of hl.querySelectorAll('mark'))for(const r of mk.getClientRects())if(e.clientX>=r.left-2&&e.clientX<=r.right+2&&e.clientY>=r.top-1&&e.clientY<=r.bottom+1)return mk;return null;};
      ta.addEventListener('mousemove',e=>{ta.style.cursor=hit(e)?'pointer':'';});
      ta.addEventListener('click',e=>{const mk=hit(e),v=vd();if(!mk||!v)return;const q=mk.dataset.tc.split('|');v.pause();v.currentTime=tcSec(q[0],q[1],q[3],q[2]);hl.querySelectorAll('mark.on').forEach(x=>x.classList.remove('on'));mk.classList.add('on');});}
    hl.style.width=ta.offsetWidth+'px';hl.style.height=ta.offsetHeight+'px';
    hl.innerHTML=esc(ta.value).replace(TC_RE,(m,a,b,sep,c)=>`<mark data-tc="${a}|${b}|${sep||''}|${c||''}">${m}</mark>`)+'\n';hl.scrollTop=ta.scrollTop;}
  function embed(u){u=String(u||'').trim();let m;
    if((m=/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]{10,})/.exec(u)))return `<iframe src="https://drive.google.com/file/d/${m[1]}/preview" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    if((m=/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/.exec(u)))return `<iframe data-vert="${/shorts\//.test(u)?1:''}" src="https://www.youtube.com/embed/${m[1]}?enablejsapi=1&playsinline=1&rel=0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    if((m=/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/.exec(u)))return `<iframe src="https://player.vimeo.com/video/${m[1]}${m[2]?'?h='+m[2]:''}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    if(/^https:\/\/.+\.(mp4|webm|mov|m4v)(\?|$)/i.test(u)){dlSet(u);return `<video src="${esc(u)}" controls controlslist="nodownload noplaybackrate noremoteplayback" disablepictureinpicture disableremoteplayback oncontextmenu="return false" playsinline></video>`;}
    if((m=/(?:^|\/\/)(e\.)?(?:u\.)?pcloud\.link\/publink\/show\?code=([\w-]+)/i.exec(u)))return `<div class="noembed" data-pc-code="${esc(m[2])}" data-pc-eu="${m[1]?'1':''}"><span class="spin"></span>Videó betöltése…</div>`;
    return '';}
  const noEmbed=(u,why)=>`<div class="noembed">${why?esc(why)+'<br>':''}A videó itt nem játszható le.${u?`<a href="${esc(u)}" target="_blank" rel="noopener">▶ Videó megnyitása</a>`:''}</div>`;
  /* külön „Letöltés” gomb (a lejátszó saját menüjéből a letöltés ki van véve) */
  function dlSet(u){const a=document.getElementById('dl'),w=document.getElementById('dlWrap');if(!a||!u)return;a.href=u;a.setAttribute('download','');if(w)w.hidden=false;}
  async function pcloud(link){const el=document.querySelector('[data-pc-code]');if(!el)return;const code=el.dataset.pcCode,hosts=el.dataset.pcEu?['eapi','api']:['api','eapi'];
    const vidOf=m=>{if(!m)return null;if(!m.isfolder)return m;const L=[];(function w(c){(c||[]).forEach(x=>{if(x.isfolder)w(x.contents);else if(/^video\//.test(x.contenttype||'')||/\.(mp4|mov|m4v|webm)$/i.test(x.name||''))L.push(x);});})(m.contents);return L[0]||null;};
    for(const h of hosts){try{const sj=await (await fetch(`https://${h}.pcloud.com/showpublink?code=${encodeURIComponent(code)}`,{referrerPolicy:'no-referrer'})).json();if(!sj||sj.result!==0)continue;
        const f=vidOf(sj.metadata);if(!f)break;
        const j=await (await fetch(`https://${h}.pcloud.com/getpublinkdownload?code=${encodeURIComponent(code)}&forcedownload=0${f.fileid&&sj.metadata.isfolder?'&fileid='+f.fileid:''}`,{referrerPolicy:'no-referrer'})).json();
        if(j&&j.result===0&&j.hosts&&j.hosts.length&&j.path){el.outerHTML=`<video src="https://${j.hosts[0]}${j.path}" referrerpolicy="no-referrer" controls controlslist="nodownload noplaybackrate noremoteplayback" disablepictureinpicture disableremoteplayback oncontextmenu="return false" playsinline></video>`;videoReady();try{const jd=await (await fetch(`https://${h}.pcloud.com/getpublinkdownload?code=${encodeURIComponent(code)}&forcedownload=1${f.fileid&&sj.metadata.isfolder?'&fileid='+f.fileid:''}`,{referrerPolicy:'no-referrer'})).json();if(jd&&jd.result===0&&jd.hosts&&jd.hosts.length)dlSet('https://'+jd.hosts[0]+jd.path);}catch(e){}return;}}catch(e){}}
    el.outerHTML=noEmbed(link);}
  const vd=()=>document.querySelector('#player video');
  /* Vízjel (amíg nincs kifizetve): áttetsző felirat a lejátszó fölött, letöltés gomb nélkül */
  function wmAdd(name){const pl=$('player');const t=['LUMOS MOTION','JÓVÁHAGYÁSRA – NEM VÉGLEGES'].concat(name?[name]:[]);const w=document.createElement('div');w.className='wm';
    w.innerHTML='<div class="wm-tile">'+Array.from({length:60},(_,k)=>'<span>'+esc(t[k%t.length])+'</span>').join('')+'</div>';pl.appendChild(w);
    pl.addEventListener('contextmenu',e=>e.preventDefault());const fix=()=>{const v=vd();if(v){v.setAttribute('controlsList','nodownload nofullscreen noplaybackrate');v.setAttribute('disablePictureInPicture','');}};fix();new MutationObserver(fix).observe(pl,{childList:true,subtree:true});
    const fb=document.createElement('button');fb.type='button';fb.className='wm-fs';fb.title='Teljes képernyő';fb.textContent='⛶';fb.onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else if(pl.requestFullscreen)pl.requestFullscreen();else{const v=vd();if(v&&v.webkitEnterFullscreen)v.webkitEnterFullscreen();}};pl.appendChild(fb);   /* saját teljes képernyő: a lejátszó egésze (a vízjellel együtt) */
    const n=document.createElement('p');n.className='wm-note';n.textContent='A videón a vízjel a kifizetés után eltűnik – a végleges, vízjel nélküli változatot a kiegyenlítés után kapod meg.';const a=$('ask');if(a)a.parentNode.insertBefore(n,a);}
  /* vastagabb lejátszósáv nagy fogantyúval (a böngésző saját, vékony sávja helyett) */
  function seekBar(v){const pl=$('player');if(!pl||pl.querySelector('.sbar'))return;const b=document.createElement('div');b.className='sbar';b.innerHTML='<div class="strack"><div class="sbuf"></div><div class="sfill"></div><div class="shead"></div></div>';pl.appendChild(b);pl.classList.add('has-sbar');
    const fill=b.querySelector('.sfill'),head=b.querySelector('.shead'),buf=b.querySelector('.sbuf'),tr=b.querySelector('.strack');
    const upd=()=>{const d=v.duration||0,p=d?Math.min(1,v.currentTime/d):0;fill.style.width=(p*100)+'%';head.style.left=(p*100)+'%';try{if(d&&v.buffered.length)buf.style.width=(v.buffered.end(v.buffered.length-1)/d*100)+'%';}catch(e){}};
    ['timeupdate','loadedmetadata','progress','seeked'].forEach(t=>v.addEventListener(t,upd));(function loop(){if(!v.paused)upd();requestAnimationFrame(loop);})();
    {let t=0;pl.addEventListener('mousemove',()=>{pl.classList.add('mv');clearTimeout(t);t=setTimeout(()=>pl.classList.remove('mv'),2500);});}   /* a teljes képernyős lejátszóban egérmozgásra előjön a csúszka */
    let drag=false;const seek=e=>{const r=tr.getBoundingClientRect(),x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));if(v.duration)v.currentTime=x*v.duration;upd();};
    b.addEventListener('pointerdown',e=>{drag=true;b.classList.add('drag');b.setPointerCapture(e.pointerId);seek(e);e.stopPropagation();});
    b.addEventListener('pointermove',e=>{if(drag)seek(e);});['pointerup','pointercancel'].forEach(t=>b.addEventListener(t,()=>{drag=false;b.classList.remove('drag');}));upd();}
  function videoReady(){const v=vd();if(!v)return;taHl();seekBar(v);if(introDone&&document.body.classList.contains('ready'))setTimeout(autoPlay,200);$('bTc').hidden=false;$('tcHint').textContent='Írd le, hogy mit változtatnál. Ha egy konkrét pillanatra gondolsz, megállíthatod ott a videót, és az „Időkód beszúrása” gombbal az időpontot is beteheted.';
    const upd=()=>{$('tcNow').textContent=tcFmt(v.currentTime);};['timeupdate','seeked','loadedmetadata'].forEach(e=>v.addEventListener(e,upd));
    const asp=()=>{if(v.videoWidth&&v.videoHeight>v.videoWidth){const p=$('player');p.classList.add('vert');p.style.setProperty('--ar',v.videoWidth+'/'+v.videoHeight);$('main').classList.add('vside');}};if(v.videoWidth)asp();else v.addEventListener('loadedmetadata',asp,{once:true});}
  function insTc(){const v=vd(),ta=$('fb');if(!v)return;v.pause();const s='['+tcFmt(v.currentTime)+'] ',a=ta.selectionStart,b=ta.selectionEnd,pre=ta.value.slice(0,a),nl=pre&&!pre.endsWith('\n')?'\n':'';
    ta.value=pre+nl+s+ta.value.slice(b);const c=(pre+nl+s).length;ta.focus();ta.setSelectionRange(c,c);taHl();}
  let shown=false;
  const show=i=>{$('load').hidden=true;$('main').hidden=false;$('ttl').hidden=false;$('video').textContent=i.video;$('project').textContent=i.project;
    if(i.link&&!i.wm){$('watch2').href=i.link;$('newTab').hidden=false;}else $('newTab').hidden=true;
    if(!shown){shown=true;const e=i.link?embed(i.link):'';$('player').innerHTML=e||noEmbed(i.link,i.link?'':'Ehhez a videóhoz még nincs link.');
      const yf=document.querySelector('#player iframe[data-vert="1"]');if(yf){$('player').classList.add('vert');$('main').classList.add('vside');}
      if(i.wm)wmAdd(i.wmName);
      if(document.querySelector('[data-pc-code]'))pcloud(i.link);else videoReady();introWhenReady();}else introOut();
    $('ask').hidden=i.state!=='wait';$('doneOk').hidden=i.state!=='ok';$('doneMod').hidden=i.state!=='mod';};
  if(!t){err('Hiányzó vagy hibás link.');return;}
  api('clientInfo',[t]).then(i=>{show(i);if(d==='mod'&&i.state==='wait')$('fb').focus();}).catch(e=>err(e.message));
  const go=(dec,fb,btn)=>{{const v=vd();if(v)v.pause();}   /* döntéskor (jóváhagyás / módosítás kérése) a videó megáll */$('err2').hidden=true;btn.disabled=true;api('clientDecide',[t,dec,fb||'']).then(show).catch(e=>{btn.disabled=false;$('err2').hidden=false;$('err2').textContent=e.message;});};
  /* mennyit nézett meg a videóból (a ténylegesen lejátszott szakaszok összege) */
  const watched=()=>{const v=vd();if(!v||!isFinite(v.duration)||!v.duration)return 1;let s=0;for(let k=0;k<v.played.length;k++)s+=v.played.end(k)-v.played.start(k);return s/v.duration;};
  $('bOk').onclick=e=>{if($('fb').value.trim().length>=3&&!confirm('Írtál észrevételt. Biztosan jóváhagyod a videót módosítás nélkül?'))return;
    if(watched()<0.8&&!confirm('Még nem nézted végig a videót. Biztosan jóváhagyod?'))return;go('ok','',e.currentTarget);};
  /* „Módosítást kérek”: első kattintásra lenyílik a szövegmező (időkóddal), második kattintásra elküldi */
  const modOpen=on=>{const b=$('modBox');b.classList.toggle('open',on);$('bSend').textContent=on?'↩ Módosítás elküldése':'↩ Módosítást kérek';$('bModX').hidden=!on;$('askHint').hidden=on;
    if(on){const v=vd();setTimeout(()=>{$('fb').focus();},150);}};
  $('bModX').onclick=()=>{modOpen(false);if($('err2'))$('err2').hidden=true;};
  $('bSend').onclick=e=>{if(!$('modBox').classList.contains('open')){modOpen(true);return;}const fb=$('fb').value.trim();if(fb.length<3){$('err2').hidden=false;$('err2').textContent='Írd le röviden, mit módosítsunk.';$('fb').focus();return;}go('mod',fb,e.currentTarget);};
  $('bTc').onclick=insTc;
  /* Szóköz: lejátszás / megállítás (ha nem a szövegmezőbe ír) – az első lenyomás hanggal indítja */
  document.addEventListener('keydown',e=>{if(e.code!=='Space'&&e.key!==' ')return;const a=document.activeElement;if(a&&(a.tagName==='TEXTAREA'||a.tagName==='INPUT'||a.isContentEditable||a.tagName==='BUTTON'||a.tagName==='A'))return;const v=vd();if(!v)return;e.preventDefault();
    const bp=document.querySelector('.bigplay');if(bp){bp.click();return;}if(v.paused){v.muted=false;v.play().catch(()=>{});}else v.pause();});
  /* Enter bárhol az oldalon (pl. a videóra kattintás után, amikor a lejátszón a fókusz): időkód beszúrása, nem a videó folytatása */
})();
