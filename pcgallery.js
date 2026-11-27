/* Fotógaléria az appon belül (Ervin, 2026-11-27): a pCloud megosztás képei bélyegképekben, kattintásra nagyítva, lapozhatóan.
   Közös a projekttervező (belső ellenőrzés) és az ügyfél jóváhagyó oldala között.
   PCG.mount(el, link, {wm, onNote, onFail}) → vezérlő {open(név|index)} vagy null, ha a link nem pCloud.
   A pCloud nyilvános API-ját a böngésző hívja közvetlenül (showpublink + getpubthumb), mint a videóknál – a háttér nem terhelődik. */
(function(){'use strict';
  const RE=/(?:^|\/\/)(e\.)?(?:u\.)?pcloud\.link\/publink\/show\?code=([\w-]+)/i;
  const IMG=/\.(jpe?g|png|heic|heif|webp|gif|tiff?|bmp|avif|dng|cr2|cr3|nef|arw|raf|orf|rw2)$/i;
  const REF=/\[([^\[\]\n<>]{1,140}?\.(?:jpe?g|png|heic|heif|webp|gif|tiff?|bmp|avif|dng|cr2|cr3|nef|arw|raf|orf|rw2))\]/gi;
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const CSS=`
.pcg{position:relative;font:inherit}
.pcg-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 10px;font-size:13px;color:#56656f}
.pcg-head b{color:#101923;font-size:14px}
.pcg-head a{margin-left:auto;color:inherit;font-size:12px;text-decoration:none;opacity:.85}
.pcg-head a:hover{text-decoration:underline;opacity:1}
.pcg-fold{margin:14px 0 6px;font-size:12px;font-weight:700;color:#56656f;text-transform:uppercase;letter-spacing:.04em}
.pcg-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.pcg-t{position:relative;aspect-ratio:1;border:0;padding:0;margin:0;border-radius:8px;overflow:hidden;background:#e6ecf1;cursor:zoom-in;display:block;width:100%}
.pcg-t img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .2s;-webkit-user-drag:none;user-select:none}
.pcg-t:hover img{transform:scale(1.04)}
.pcg-t:focus-visible{outline:3px solid #2f6fdf;outline-offset:2px}
.pcg-t .pcg-nm{position:absolute;inset:auto 0 0 0;padding:14px 6px 4px;font-size:10.5px;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.55));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;opacity:0;transition:opacity .15s}
.pcg-t:hover .pcg-nm,.pcg-t.noimg .pcg-nm{opacity:1}
.pcg-t.noimg{background:#dfe6ec}.pcg-t.noimg::before{content:'📷';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:26px;opacity:.5}
.pcg-t.noimg .pcg-nm{color:#101923;background:none}
.pcg-t.hl{box-shadow:0 0 0 3px #2f6fdf}
.pcg-load,.pcg-err{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;min-height:180px;color:#56656f;text-align:center;padding:20px;border-radius:12px;background:#eef3f6}
.pcg-err a{display:inline-flex;gap:8px;background:#fff;color:#101923;text-decoration:none;font-weight:700;padding:9px 15px;border-radius:10px;border:1px solid #dde4eb}
.pcg-spin{width:22px;height:22px;border-radius:50%;border:3px solid rgba(0,0,0,.12);border-top-color:#2f6fdf;animation:pcgs 0.8s linear infinite}
@keyframes pcgs{to{transform:rotate(360deg)}}
.pcg-wm{position:absolute;inset:0;pointer-events:none;overflow:hidden;display:flex;flex-wrap:wrap;align-content:space-around;justify-content:space-around;gap:18px 28px;padding:10px;transform:rotate(-24deg) scale(1.5);opacity:.55}
.pcg-wm span{color:rgba(255,255,255,.75);font:700 11px/1 Arial,sans-serif;letter-spacing:.06em;text-shadow:0 0 2px rgba(0,0,0,.6);white-space:nowrap}
.pcg-lb .pcg-wm span{font-size:15px}
.pcg-lb{position:fixed;inset:0;z-index:2147483000;background:#05080c;color:#fff;touch-action:pan-y;user-select:none;overflow:hidden}
.pcg-lb-top{position:absolute;left:0;right:0;top:0;z-index:4;display:flex;align-items:center;gap:10px;padding:12px 14px 26px;min-height:52px;background:linear-gradient(rgba(0,0,0,.6),rgba(0,0,0,0));pointer-events:none}
.pcg-lb-top>*{pointer-events:auto}
.pcg-lb-cap{flex:1;min-width:0;font-size:13px;opacity:.95;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 3px rgba(0,0,0,.7)}
.pcg-lb-cap small{opacity:.75;margin-left:8px}
.pcg-lb button{font:inherit;cursor:pointer}
.pcg-lb-x{border:0;background:rgba(0,0,0,.45);color:#fff;border-radius:50%;width:46px;height:46px;font-size:22px;display:flex;align-items:center;justify-content:center;flex:none}
.pcg-lb-x:hover{background:rgba(0,0,0,.7)}
.pcg-lb-note{border:0;background:#fff;color:#101923;font-weight:700;border-radius:10px;padding:10px 15px;font-size:13px;flex:none;box-shadow:0 2px 10px rgba(0,0,0,.35)}
.pcg-lb-mid{position:absolute;inset:0}
.pcg-lb-box{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.pcg-lb-nav{position:absolute;top:0;bottom:0;z-index:3;width:min(18%,170px);border:0;background:transparent;padding:0;display:flex;align-items:center;color:#fff}
.pcg-lb-nav.p{left:0;justify-content:flex-start;padding-left:18px}.pcg-lb-nav.n{right:0;justify-content:flex-end;padding-right:18px}
.pcg-lb-nav i{font-style:normal;width:84px;height:84px;border-radius:50%;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:54px;line-height:1;padding-bottom:6px;box-shadow:0 2px 14px rgba(0,0,0,.4);transition:background .15s,transform .15s}
.pcg-lb-nav:hover i{background:rgba(0,0,0,.78);transform:scale(1.06)}
.pcg-lb-nav[hidden]{display:none}
.pcg-lb-fr{position:relative;line-height:0;flex:none}
.pcg-lb-fr img{width:100%;height:100%;display:block;object-fit:contain;-webkit-user-drag:none}
.pcg-lb-fr.ld img{opacity:.45}
.pcg-lb-fr .pcg-spin{position:absolute;left:50%;top:50%;margin:-11px 0 0 -11px;border-color:rgba(255,255,255,.25);border-top-color:#fff}
.pcg-lb{touch-action:none;overscroll-behavior:none}
.pcg-lb-fr{transform-origin:center center;will-change:transform;cursor:zoom-in}
.pcg-lb.zm .pcg-lb-fr{cursor:grab}.pcg-lb.zm .pcg-lb-fr:active{cursor:grabbing}
.pcg-lb.zm .pcg-lb-nav{display:none}
.pcg-lb-zm{display:flex;align-items:center;gap:2px;background:rgba(0,0,0,.45);border-radius:23px;padding:3px;flex:none}
.pcg-lb-zm button{border:0;background:transparent;color:#fff;width:40px;height:40px;border-radius:50%;font-size:24px;line-height:1;display:flex;align-items:center;justify-content:center}
.pcg-lb-zm button:hover{background:rgba(255,255,255,.18)}
.pcg-lb-zm span{min-width:46px;text-align:center;font-size:12px;opacity:.9;cursor:pointer}
@media(max-width:700px){.pcg-lb-zm span{display:none}.pcg-lb-zm button{width:36px;height:36px}}
.pcg-lb-fail{font-size:14px;opacity:.8;text-align:center;line-height:1.5;padding:0 20px}
@media(hover:none){.pcg-t:hover img{transform:none}.pcg-t:hover .pcg-nm{opacity:0}.pcg-t.noimg .pcg-nm{opacity:1}}
@media(max-width:700px){.pcg-head{flex-wrap:nowrap;margin:0 0 8px}.pcg-head span{display:none}.pcg-head a{white-space:nowrap}}
@media(max-width:700px){.pcg-grid{gap:4px}.pcg-lb-nav{width:22%}.pcg-lb-nav.p{padding-left:8px}.pcg-lb-nav.n{padding-right:8px}.pcg-lb-nav i{width:62px;height:62px;font-size:42px}.pcg-lb-note{padding:8px 10px;font-size:12px}}
`;
  function css(){if(document.getElementById('pcg-css'))return;const s=document.createElement('style');s.id='pcg-css';s.textContent=CSS;document.head.appendChild(s);}
  const CACHE={};
  function parse(link){const m=RE.exec(String(link||''));return m?{code:m[2],hosts:m[1]?['eapi','api']:['api','eapi']}:null;}
  function tmo(u){const ac=new AbortController(),t=setTimeout(()=>ac.abort(),10000);return fetch(u,{referrerPolicy:'no-referrer',signal:ac.signal}).finally(()=>clearTimeout(t));}
  /* a megosztás képeinek listája (mappák bejárásával); a hibát érthető mondatként adja vissza */
  function list(link){const p=parse(link);if(!p)return Promise.resolve(null);if(CACHE[p.code])return CACHE[p.code];
    return CACHE[p.code]=(async()=>{let why='';for(const h of p.hosts){try{const sj=await (await tmo(`https://${h}.pcloud.com/showpublink?code=${encodeURIComponent(p.code)}`)).json();
        if(!sj||sj.result!==0){why=why||(sj&&sj.error)||'';continue;}const m=sj.metadata||{},L=[];
        const isImg=x=>/^image\//.test(x.contenttype||'')||IMG.test(x.name||'');
        if(!m.isfolder){if(isImg(m))L.push({id:m.fileid,name:m.name,folder:'',single:true});}
        else (function w(c,path){(c||[]).slice().sort((a,b)=>(a.isfolder-b.isfolder)||String(a.name).localeCompare(String(b.name),'hu',{numeric:true})).forEach(x=>{if(x.isfolder)w(x.contents,path?path+' / '+x.name:x.name);else if(isImg(x))L.push({id:x.fileid,name:x.name,folder:path});});})(m.contents,'');
        if(!L.length)return {err:'A megosztásban nem találtunk fotót.'};return {h,code:p.code,items:L,title:m.name||''};}
      catch(e){why=why||(e&&e.name==='AbortError'?'A pCloud nem válaszolt időben.':'A pCloud most nem érhető el.');}}
      delete CACHE[p.code];return {err:/traffic|limit/i.test(why)?'A pCloud megosztás forgalmi kerete elfogyott.':/időben|nem érhető el/.test(why)?why:'A galériát nem sikerült betölteni (lehet, hogy a megosztást törölték).'};})();}
  const thumb=(g,it,size,crop)=>`https://${g.h}.pcloud.com/getpubthumb?code=${encodeURIComponent(g.code)}${it.single?'':'&fileid='+encodeURIComponent(it.id)}&size=${size}&crop=${crop?1:0}`;
  function wmHtml(wm,n){const t=['LUMOS MOTION','JÓVÁHAGYÁSRA – NEM VÉGLEGES'].concat(typeof wm==='string'&&wm?[wm]:[]);return '<div class="pcg-wm" aria-hidden="true">'+Array.from({length:n},(_,k)=>'<span>'+esc(t[k%t.length])+'</span>').join('')+'</div>';}
  const norm=s=>String(s||'').trim().toLowerCase();

  function mount(el,link,opts){opts=Object.assign({},opts||{});if(!el||!parse(link))return null;css();opts._el=el;
    const ctl={g:null,open:()=>{},el};el.classList.add('pcg');el.innerHTML='<div class="pcg-load"><span class="pcg-spin"></span>Fotók betöltése…</div>';
    const ext=opts.wm?'':`<a href="${esc(link)}" target="_blank" rel="noopener">Megnyitás a pCloudban ↗</a>`;
    list(link).then(g=>{if(!el.isConnected)return;
      if(!g||g.err){el.innerHTML=`<div class="pcg-err">${esc(g&&g.err||'A galériát nem sikerült betölteni.')}${opts.wm?'':`<a href="${esc(link)}" target="_blank" rel="noopener">📷 Fotók megnyitása</a>`}</div>`;if(opts.onFail)try{opts.onFail(g&&g.err);}catch(e){}return;}
      ctl.g=g;const multi=new Set(g.items.map(x=>x.folder)).size>1;let h='',last=null;
      g.items.forEach((it,i)=>{if(multi&&it.folder!==last){if(last!==null)h+='</div>';h+=`<div class="pcg-fold">${esc(it.folder||'Fő mappa')}</div><div class="pcg-grid">`;last=it.folder;}else if(i===0)h+='<div class="pcg-grid">';
        h+=`<button type="button" class="pcg-t" data-i="${i}" title="${esc(it.name)}"><img loading="lazy" decoding="async" alt="${esc(it.name)}" referrerpolicy="no-referrer" draggable="false" src="${esc(thumb(g,it,'480x480',1))}">${opts.wm?wmHtml(opts.wm,6):''}<span class="pcg-nm">${esc(it.name)}</span></button>`;});
      el.innerHTML=`<div class="pcg-head"><b>📷 ${g.items.length} fotó</b>${opts.onNote?'<span>Kattints egy képre a nagyításhoz – onnan megjegyzést is fűzhetsz hozzá.</span>':'<span>Kattints egy képre a nagyításhoz.</span>'}${ext}</div>${h}</div>`;
      el.querySelectorAll('.pcg-t img').forEach(im=>im.addEventListener('error',()=>{const b=im.closest('.pcg-t');if(b)b.classList.add('noimg');im.remove();},{once:true}));
      if(opts.wm)el.addEventListener('contextmenu',e=>{if(e.target.closest('.pcg-t'))e.preventDefault();});
      el.addEventListener('click',e=>{const b=e.target.closest('.pcg-t');if(b&&el.contains(b))lightbox(g,+b.dataset.i,opts);});
      ctl.open=x=>{const i=typeof x==='number'?x:g.items.findIndex(it=>norm(it.name)===norm(x));if(i<0)return false;lightbox(g,i,opts);return true;};
      if(ctl._pending){const p=ctl._pending;ctl._pending=null;ctl.open(p);}});
    ctl.open=x=>{ctl._pending=x;return true;};   // betöltés közben kért kép: betöltés után nyílik
    el._pcg=ctl;return ctl;}

  function lightbox(g,i,opts){document.querySelectorAll('.pcg-lb').forEach(x=>x.remove());
    const own=opts._el;
    const lb=document.createElement('div');lb.className='pcg-lb';lb.setAttribute('role','dialog');lb.setAttribute('aria-modal','true');lb.tabIndex=-1;
    lb.innerHTML=`<div class="pcg-lb-top"><div class="pcg-lb-cap"></div>${opts.onNote?'<button type="button" class="pcg-lb-note">💬 Megjegyzés ehhez a képhez</button>':''}<button type="button" class="pcg-lb-x" aria-label="Bezárás">✕</button></div>
      <div class="pcg-lb-mid"><button type="button" class="pcg-lb-nav p" aria-label="Előző kép"><i>‹</i></button><div class="pcg-lb-box"></div><button type="button" class="pcg-lb-nav n" aria-label="Következő kép"><i>›</i></button></div>`;
    document.body.appendChild(lb);const box=lb.querySelector('.pcg-lb-box'),cap=lb.querySelector('.pcg-lb-cap'),N=g.items.length,pre={};
    const big=it=>[thumb(g,it,'2048x1024',0),thumb(g,it,'1024x1024',0),thumb(g,it,'640x640',0)];
    const preload=k=>{const it=g.items[(k+N)%N];if(!it||pre[it.id])return;pre[it.id]=new Image();pre[it.id].referrerPolicy='no-referrer';pre[it.id].src=big(it)[0];};
    const fit=()=>{const fr=box.querySelector('.pcg-lb-fr');if(!fr||!fr._nw)return;const W=lb.clientWidth,H=lb.clientHeight,k=Math.min(W/fr._nw,H/fr._nh);fr.style.width=Math.round(fr._nw*k)+'px';fr.style.height=Math.round(fr._nh*k)+'px';};   // a kép a képernyő széléig ér (felnagyítva is)
    const rs=()=>{if(!lb.isConnected){removeEventListener('resize',rs);return;}fit();};addEventListener('resize',rs);
    const show=k=>{i=(k+N)%N;const it=g.items[i];if(lb._zreset)lb._zreset();cap.innerHTML=`${esc(it.name)}<small>${i+1} / ${N}${it.folder?' · '+esc(it.folder):''}</small>`;
      box.innerHTML=`<div class="pcg-lb-fr ld"><img alt="${esc(it.name)}" referrerpolicy="no-referrer" draggable="false" src="${esc(thumb(g,it,'320x320',0))}"><span class="pcg-spin"></span>${opts.wm?wmHtml(opts.wm,40):''}</div>`;
      const fr=box.firstChild,im=fr.querySelector('img'),U=big(it);im.addEventListener('load',()=>{if(!fr._nw&&im.naturalWidth){fr._nw=im.naturalWidth;fr._nh=im.naturalHeight;fit();}},{once:true});let u=0;const hi=new Image();hi.referrerPolicy='no-referrer';
      hi.onload=()=>{if(g.items[i]!==it)return;fr._nw=hi.naturalWidth;fr._nh=hi.naturalHeight;fit();im.src=hi.src;fr.classList.remove('ld');const s=fr.querySelector('.pcg-spin');if(s)s.remove();};
      hi.onerror=()=>{if(g.items[i]!==it)return;if(++u<U.length)hi.src=U[u];else{box.innerHTML='<div class="pcg-lb-fail">Ezt a képet a pCloud nem tudja előnézetben megjeleníteni'+(IMG.test(it.name)&&/\.(dng|cr2|cr3|nef|arw|raf|orf|rw2|tiff?)$/i.test(it.name)?' (nyers / TIFF formátum)':'')+'.</div>';}};hi.src=U[0];
      lb.querySelector('.pcg-lb-nav.p').hidden=lb.querySelector('.pcg-lb-nav.n').hidden=N<2;preload(i+1);preload(i-1);};
    const close=()=>{lb.remove();document.removeEventListener('keydown',key,true);if(opts._focus&&opts._focus.focus)try{opts._focus.focus();}catch(e){}};
    const key=e=>{if(!lb.isConnected){document.removeEventListener('keydown',key,true);return;}
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}else if(lb._zkey&&lb._zkey(e)){e.preventDefault();e.stopPropagation();}else if(e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();show(i+1);}else if(e.key==='ArrowLeft'){e.preventDefault();e.stopPropagation();show(i-1);}};
    document.addEventListener('keydown',key,true);
    const watch=setInterval(()=>{if(!lb.isConnected){clearInterval(watch);return;}if(own&&!own.isConnected)close();},800);   // ha az alatta lévő ablak bezárult (pl. vissza gomb), a nagyítás se maradjon fent   // elsőként kapja: az Esc csak a nagyítást zárja be, az alatta lévő ablakot nem
    lb.addEventListener('click',e=>{const t=e.target;if(t.closest('.pcg-lb-x'))return close();if(t.closest('.pcg-lb-nav.p'))return show(i-1);if(t.closest('.pcg-lb-nav.n'))return show(i+1);
      if(t.closest('.pcg-lb-note')){const nm=g.items[i].name;close();try{opts.onNote(nm);}catch(er){}return;}
      if(t===lb||t.classList.contains('pcg-lb-mid')||t.classList.contains('pcg-lb-box'))close();});
    if(opts.wm)lb.addEventListener('contextmenu',e=>e.preventDefault());
    /* nagyítás (Ervin, 2026-11-27): csippentés / két ujj, egérgörgő, dupla kattintás / dupla koppintás, +/− gomb és billentyű; nagyítva húzással mozgatható.
       Nagyításkor (ha nem vízjeles) az eredeti, teljes felbontású kép töltődik be, hogy éles maradjon. */
    let z=1,tx=0,ty=0,moved=false;const P=new Map();let g0=null,lastTap=0,sw=null;
    const frE=()=>box.querySelector('.pcg-lb-fr');
    const clamp=()=>{const fr=frE();if(!fr)return;const W=lb.clientWidth,H=lb.clientHeight,fw=fr.offsetWidth*z,fh=fr.offsetHeight*z,mx=Math.max(0,(fw-W)/2),my=Math.max(0,(fh-H)/2);tx=Math.max(-mx,Math.min(mx,tx));ty=Math.max(-my,Math.min(my,ty));};
    const apply=anim=>{const fr=frE();if(!fr)return;if(z<=1.001){z=1;tx=0;ty=0;}clamp();fr.style.transition=anim?'transform .22s ease':'none';fr.style.transform=z===1?'':`translate(${tx}px,${ty}px) scale(${z})`;lb.classList.toggle('zm',z>1);zl.textContent=Math.round(z*100)+'%';if(z>1.4)orig();};
    const zoomAt=(nz,cx,cy,anim)=>{nz=Math.max(1,Math.min(8,nz));const r=lb.getBoundingClientRect(),px=cx-(r.left+r.width/2),py=cy-(r.top+r.height/2);tx=px-(px-tx)*(nz/z);ty=py-(py-ty)*(nz/z);z=nz;apply(anim);};
    const zc=k=>{const r=lb.getBoundingClientRect();zoomAt(z*k,r.left+r.width/2,r.top+r.height/2,true);};
    const orig=()=>{const it=g.items[i],fr=frE();if(opts.wm||!fr||fr._orig||!/\.(jpe?g|png|webp|gif|avif)$/i.test(it.name))return;fr._orig=1;
      fetch(`https://${g.h}.pcloud.com/getpublinkdownload?code=${encodeURIComponent(g.code)}${it.single?'':'&fileid='+encodeURIComponent(it.id)}&forcedownload=0`,{referrerPolicy:'no-referrer'}).then(r=>r.json()).then(j=>{if(!j||j.result!==0||!j.hosts||!j.hosts.length)return;
        const o=new Image();o.referrerPolicy='no-referrer';o.onload=()=>{if(g.items[i]!==it||!fr.isConnected)return;const im=fr.querySelector('img');if(im)im.src=o.src;};o.src='https://'+j.hosts[0]+j.path;}).catch(()=>{});};
    const top=lb.querySelector('.pcg-lb-top'),zw=document.createElement('div');zw.className='pcg-lb-zm';zw.innerHTML='<button type="button" data-z="-" aria-label="Kicsinyítés">−</button><span></span><button type="button" data-z="+" aria-label="Nagyítás">+</button>';top.insertBefore(zw,top.querySelector('.pcg-lb-note')||top.querySelector('.pcg-lb-x'));const zl=zw.querySelector('span');zl.textContent='100%';
    zw.addEventListener('click',e=>{const b=e.target.closest('[data-z]');if(!b)return;e.stopPropagation();if(b.dataset.z==='+')zc(1.6);else zc(1/1.6);});
    zl.addEventListener('click',e=>{e.stopPropagation();z=1;apply(true);});
    lb.addEventListener('wheel',e=>{e.preventDefault();zoomAt(z*Math.exp(-e.deltaY*(e.ctrlKey?0.01:0.0025)),e.clientX,e.clientY,false);},{passive:false});
    lb.addEventListener('dblclick',e=>{if(e.target.closest('.pcg-lb-top,.pcg-lb-nav'))return;e.preventDefault();if(z>1){z=1;apply(true);}else zoomAt(2.5,e.clientX,e.clientY,true);});
    const ptr=e=>({x:e.clientX,y:e.clientY});
    lb.addEventListener('pointerdown',e=>{if(e.target.closest('.pcg-lb-top'))return;if(e.pointerType==='mouse'&&e.button!==0)return;P.set(e.pointerId,ptr(e));moved=false;
      if(P.size===2){const [a,b]=[...P.values()];g0={d:Math.hypot(a.x-b.x,a.y-b.y)||1,mx:(a.x+b.x)/2,my:(a.y+b.y)/2,z,tx,ty};sw=null;}
      else if(P.size===1){sw={x:e.clientX,y:e.clientY,tx,ty,t:Date.now(),nav:!!e.target.closest('.pcg-lb-nav')};}});   // a léptető nyílon a dupla koppintás két lapozás, nem nagyítás
    lb.addEventListener('pointermove',e=>{if(!P.has(e.pointerId))return;P.set(e.pointerId,ptr(e));
      if(P.size>=2&&g0){const [a,b]=[...P.values()],d=Math.hypot(a.x-b.x,a.y-b.y),mx=(a.x+b.x)/2,my=(a.y+b.y)/2,nz=Math.max(1,Math.min(8,g0.z*d/g0.d)),r=lb.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
        tx=(mx-cx)-((g0.mx-cx)-g0.tx)*(nz/g0.z);ty=(my-cy)-((g0.my-cy)-g0.ty)*(nz/g0.z);z=nz;moved=true;apply(false);}
      else if(sw&&z>1){const dx=e.clientX-sw.x,dy=e.clientY-sw.y;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;tx=sw.tx+dx;ty=sw.ty+dy;apply(false);}
      else if(sw&&Math.abs(e.clientX-sw.x)+Math.abs(e.clientY-sw.y)>8)moved=true;});
    const up=e=>{if(!P.has(e.pointerId))return;P.delete(e.pointerId);if(P.size<2)g0=null;
      if(P.size===1){const [a]=[...P.values()];sw={x:a.x,y:a.y,tx,ty,t:Date.now()};return;}
      if(!sw)return;const dx=e.clientX-sw.x,dy=e.clientY-sw.y,s0=sw;sw=null;
      if(z===1&&e.pointerType!=='mouse'){if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.3){show(dx<0?i+1:i-1);return;}if(dy>90&&Math.abs(dy)>Math.abs(dx)*1.5){close();return;}}
      if(!moved&&e.pointerType!=='mouse'&&!(e.target.closest&&e.target.closest('.pcg-lb-nav'))&&!(s0.nav)){const now=Date.now();if(now-lastTap<300){lastTap=0;if(z>1){z=1;apply(true);}else zoomAt(2.5,e.clientX,e.clientY,true);moved=true;return;}lastTap=now;}   // dupla koppintás
    };
    lb.addEventListener('touchmove',e=>{e.preventDefault();},{passive:false});   // a böngésző saját gesztusai (lehúzásos frissítés, oldal nagyítása, visszapattanás) itt nem indulnak
    lb.addEventListener('pointerup',up);lb.addEventListener('pointercancel',up);
    lb.addEventListener('click',e=>{if((moved||z>1)&&!e.target.closest('.pcg-lb-top')){e.stopPropagation();moved=false;}},true);   // húzás / nagyított kép után a kattintás nem zár be
    lb._zreset=()=>{lastTap=0;z=1;tx=0;ty=0;lb.classList.remove('zm');zl.textContent='100%';};
    lb._zkey=e=>{if(e.key==='+'||e.key==='='){zc(1.6);return true;}if(e.key==='-'||e.key==='_'){zc(1/1.6);return true;}if(e.key==='0'){z=1;apply(true);return true;}return false;};
    show(i);lb.focus();}

  /* hozzászólásban a [fájlnév.jpg] hivatkozás: kattintható gomb (a már escape-elt HTML-en fut) */
  function refs(html,cls){return String(html||'').replace(REF,(m,n)=>`<button type="button" class="${cls||'pcg-ref'}" data-pcg-ref="${n.replace(/"/g,'&quot;')}">${m}</button>`);}
  window.PCG={mount,list,parse,refs,REF,isLink:l=>!!parse(l)};
})();
