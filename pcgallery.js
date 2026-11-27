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
.pcg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:6px}
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
.pcg-lb{position:fixed;inset:0;z-index:2147483000;background:rgba(8,12,18,.94);display:flex;flex-direction:column;color:#fff;touch-action:pan-y;user-select:none}
.pcg-lb-top{display:flex;align-items:center;gap:10px;padding:10px 12px;min-height:52px}
.pcg-lb-cap{flex:1;min-width:0;font-size:13px;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pcg-lb-cap small{opacity:.65;margin-left:8px}
.pcg-lb button{font:inherit;cursor:pointer}
.pcg-lb-x,.pcg-lb-nav{border:0;background:rgba(255,255,255,.12);color:#fff;border-radius:50%;width:42px;height:42px;font-size:20px;display:flex;align-items:center;justify-content:center;flex:none}
.pcg-lb-x:hover,.pcg-lb-nav:hover{background:rgba(255,255,255,.24)}
.pcg-lb-note{border:0;background:#fff;color:#101923;font-weight:700;border-radius:10px;padding:9px 14px;font-size:13px;flex:none}
.pcg-lb-mid{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;gap:10px;padding:0 10px 14px}
.pcg-lb-box{position:relative;max-width:100%;max-height:100%;display:flex;align-items:center;justify-content:center;flex:1;min-width:0;height:100%}
.pcg-lb-fr{position:relative;display:inline-block;max-width:100%;max-height:100%;line-height:0}
.pcg-lb-fr img{max-width:100%;max-height:calc(100dvh - 90px);object-fit:contain;display:block;border-radius:4px;-webkit-user-drag:none}
.pcg-lb-fr.ld img{opacity:.35}
.pcg-lb-fr .pcg-spin{position:absolute;left:50%;top:50%;margin:-11px 0 0 -11px;border-color:rgba(255,255,255,.25);border-top-color:#fff}
.pcg-lb-fail{font-size:14px;opacity:.8;text-align:center;line-height:1.5}
@media(hover:none){.pcg-t:hover img{transform:none}.pcg-t:hover .pcg-nm{opacity:0}.pcg-t.noimg .pcg-nm{opacity:1}}
@media(max-width:700px){.pcg-head{flex-wrap:nowrap;margin:0 0 8px}.pcg-head span{display:none}.pcg-head a{white-space:nowrap}}
@media(max-width:700px){.pcg-grid{grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:4px}.pcg-lb-nav{position:absolute;top:50%;margin-top:-21px;z-index:2;background:rgba(0,0,0,.35)}.pcg-lb-nav.p{left:6px}.pcg-lb-nav.n{right:6px}.pcg-lb-mid{padding:0 0 10px}.pcg-lb-note{padding:8px 10px;font-size:12px}}
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

  function mount(el,link,opts){opts=opts||{};if(!el||!parse(link))return null;css();
    const ctl={g:null,open:()=>{},el};el.classList.add('pcg');el.innerHTML='<div class="pcg-load"><span class="pcg-spin"></span>Fotók betöltése…</div>';
    const ext=opts.wm?'':`<a href="${esc(link)}" target="_blank" rel="noopener">Megnyitás a pCloudban ↗</a>`;
    list(link).then(g=>{if(!el.isConnected)return;
      if(!g||g.err){el.innerHTML=`<div class="pcg-err">${esc(g&&g.err||'A galériát nem sikerült betölteni.')}${opts.wm?'':`<a href="${esc(link)}" target="_blank" rel="noopener">📷 Fotók megnyitása</a>`}</div>`;if(opts.onFail)try{opts.onFail(g&&g.err);}catch(e){}return;}
      ctl.g=g;const multi=new Set(g.items.map(x=>x.folder)).size>1;let h='',last=null;
      g.items.forEach((it,i)=>{if(multi&&it.folder!==last){if(last!==null)h+='</div>';h+=`<div class="pcg-fold">${esc(it.folder||'Fő mappa')}</div><div class="pcg-grid">`;last=it.folder;}else if(i===0)h+='<div class="pcg-grid">';
        h+=`<button type="button" class="pcg-t" data-i="${i}" title="${esc(it.name)}"><img loading="lazy" decoding="async" alt="${esc(it.name)}" referrerpolicy="no-referrer" draggable="false" src="${esc(thumb(g,it,'320x320',1))}">${opts.wm?wmHtml(opts.wm,6):''}<span class="pcg-nm">${esc(it.name)}</span></button>`;});
      el.innerHTML=`<div class="pcg-head"><b>📷 ${g.items.length} fotó</b>${opts.onNote?'<span>Kattints egy képre a nagyításhoz – onnan megjegyzést is fűzhetsz hozzá.</span>':'<span>Kattints egy képre a nagyításhoz.</span>'}${ext}</div>${h}</div>`;
      el.querySelectorAll('.pcg-t img').forEach(im=>im.addEventListener('error',()=>{const b=im.closest('.pcg-t');if(b)b.classList.add('noimg');im.remove();},{once:true}));
      if(opts.wm)el.addEventListener('contextmenu',e=>{if(e.target.closest('.pcg-t'))e.preventDefault();});
      el.addEventListener('click',e=>{const b=e.target.closest('.pcg-t');if(b&&el.contains(b))lightbox(g,+b.dataset.i,opts);});
      ctl.open=x=>{const i=typeof x==='number'?x:g.items.findIndex(it=>norm(it.name)===norm(x));if(i<0)return false;lightbox(g,i,opts);return true;};
      if(ctl._pending){const p=ctl._pending;ctl._pending=null;ctl.open(p);}});
    ctl.open=x=>{ctl._pending=x;return true;};   // betöltés közben kért kép: betöltés után nyílik
    el._pcg=ctl;return ctl;}

  function lightbox(g,i,opts){document.querySelectorAll('.pcg-lb').forEach(x=>x.remove());
    const lb=document.createElement('div');lb.className='pcg-lb';lb.setAttribute('role','dialog');lb.setAttribute('aria-modal','true');lb.tabIndex=-1;
    lb.innerHTML=`<div class="pcg-lb-top"><div class="pcg-lb-cap"></div>${opts.onNote?'<button type="button" class="pcg-lb-note">💬 Megjegyzés ehhez a képhez</button>':''}<button type="button" class="pcg-lb-x" aria-label="Bezárás">✕</button></div>
      <div class="pcg-lb-mid"><button type="button" class="pcg-lb-nav p" aria-label="Előző kép">‹</button><div class="pcg-lb-box"></div><button type="button" class="pcg-lb-nav n" aria-label="Következő kép">›</button></div>`;
    document.body.appendChild(lb);const box=lb.querySelector('.pcg-lb-box'),cap=lb.querySelector('.pcg-lb-cap'),N=g.items.length,pre={};
    const big=it=>[thumb(g,it,'2048x1024',0),thumb(g,it,'1024x1024',0),thumb(g,it,'640x640',0)];
    const preload=k=>{const it=g.items[(k+N)%N];if(!it||pre[it.id])return;pre[it.id]=new Image();pre[it.id].referrerPolicy='no-referrer';pre[it.id].src=big(it)[0];};
    const show=k=>{i=(k+N)%N;const it=g.items[i];cap.innerHTML=`${esc(it.name)}<small>${i+1} / ${N}${it.folder?' · '+esc(it.folder):''}</small>`;
      box.innerHTML=`<div class="pcg-lb-fr ld"><img alt="${esc(it.name)}" referrerpolicy="no-referrer" draggable="false" src="${esc(thumb(g,it,'320x320',0))}"><span class="pcg-spin"></span>${opts.wm?wmHtml(opts.wm,40):''}</div>`;
      const fr=box.firstChild,im=fr.querySelector('img'),U=big(it);let u=0;const hi=new Image();hi.referrerPolicy='no-referrer';
      hi.onload=()=>{if(g.items[i]!==it)return;im.src=hi.src;fr.classList.remove('ld');const s=fr.querySelector('.pcg-spin');if(s)s.remove();};
      hi.onerror=()=>{if(g.items[i]!==it)return;if(++u<U.length)hi.src=U[u];else{box.innerHTML='<div class="pcg-lb-fail">Ezt a képet a pCloud nem tudja előnézetben megjeleníteni'+(IMG.test(it.name)&&/\.(dng|cr2|cr3|nef|arw|raf|orf|rw2|tiff?)$/i.test(it.name)?' (nyers / TIFF formátum)':'')+'.</div>';}};hi.src=U[0];
      lb.querySelector('.pcg-lb-nav.p').hidden=lb.querySelector('.pcg-lb-nav.n').hidden=N<2;preload(i+1);preload(i-1);};
    const close=()=>{lb.remove();document.removeEventListener('keydown',key,true);if(opts._focus&&opts._focus.focus)try{opts._focus.focus();}catch(e){}};
    const key=e=>{if(!lb.isConnected){document.removeEventListener('keydown',key,true);return;}
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}else if(e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();show(i+1);}else if(e.key==='ArrowLeft'){e.preventDefault();e.stopPropagation();show(i-1);}};
    document.addEventListener('keydown',key,true);   // elsőként kapja: az Esc csak a nagyítást zárja be, az alatta lévő ablakot nem
    lb.addEventListener('click',e=>{const t=e.target;if(t.closest('.pcg-lb-x'))return close();if(t.closest('.pcg-lb-nav.p'))return show(i-1);if(t.closest('.pcg-lb-nav.n'))return show(i+1);
      if(t.closest('.pcg-lb-note')){const nm=g.items[i].name;close();try{opts.onNote(nm);}catch(er){}return;}
      if(t===lb||t.classList.contains('pcg-lb-mid')||t.classList.contains('pcg-lb-box'))close();});
    if(opts.wm)lb.addEventListener('contextmenu',e=>e.preventDefault());
    let sx=null,sy=0;lb.addEventListener('touchstart',e=>{if(e.touches.length===1){sx=e.touches[0].clientX;sy=e.touches[0].clientY;}},{passive:true});
    lb.addEventListener('touchend',e=>{if(sx===null)return;const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;sx=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.3)show(dx<0?i+1:i-1);else if(dy>90&&Math.abs(dy)>Math.abs(dx)*1.5)close();},{passive:true});
    show(i);lb.focus();}

  /* hozzászólásban a [fájlnév.jpg] hivatkozás: kattintható gomb (a már escape-elt HTML-en fut) */
  function refs(html,cls){return String(html||'').replace(REF,(m,n)=>`<button type="button" class="${cls||'pcg-ref'}" data-pcg-ref="${n.replace(/"/g,'&quot;')}">${m}</button>`);}
  window.PCG={mount,list,parse,refs,REF,isLink:l=>!!parse(l)};
})();
