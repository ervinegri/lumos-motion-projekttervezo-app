'use strict';
/* ===== Indítás: minden szkript betöltése után (a felület kódja több fájlban van) ===== */
if(TOKEN){const fast=bootFromCache();load(fast);}else{VIEW.innerHTML='';showLogin('');}

/* Mobilon lehúzással frissítés (a lap tetején lefelé húzva; ablak nyitva vagy görgetett lista közben nem indul) */
(()=>{if(!('ontouchstart' in window))return;let y0=null,x0=0,armed=false,busy=false;
  const ind=document.createElement('div');ind.className='ptr';ind.setAttribute('aria-hidden','true');ind.innerHTML='<span class="ptr-i">↓</span><span class="ptr-t">Húzd le a frissítéshez</span>';document.body.appendChild(ind);
  const txt=t=>{ind.querySelector('.ptr-t').textContent=t;};
  const reset=()=>{y0=null;armed=false;if(busy)return;ind.classList.remove('on','armed');ind.style.transform='';};
  const blocked=t=>{if(window.BD_BUSY>0){try{toast('Még folyamatban a videó áthelyezése / levele – egy pillanat, utána frissíthetsz.');}catch(_){}return true;}if(window.scrollY>0)return true;const mr=document.getElementById('modalRoot');if(mr&&mr.innerHTML&&!(window.matchMedia&&matchMedia('(max-width:760px)').matches))return true;   // mobilon a (teljes képernyős) ablakban is lehet lehúzással frissíteni; frissítés után az ablak visszajön
  if(t&&t.closest&&t.closest('.pay-wrap,.sheet-wrap'))return true;   /* táblázatból nem lehet lehúzással frissíteni */
  for(let n=t;n&&n!==document.body;n=n.parentElement){if(n.scrollTop>0)return true;}return false;};
  document.addEventListener('touchstart',e=>{if(busy||e.touches.length!==1||blocked(e.target)){y0=null;return;}y0=e.touches[0].clientY;x0=e.touches[0].clientX;},{passive:true});
  document.addEventListener('touchmove',e=>{if(y0==null||busy)return;const dy=e.touches[0].clientY-y0,dx=e.touches[0].clientX-x0;
    if(dy<=0||window.scrollY>0||(Math.abs(dx)>Math.abs(dy)&&dy<24)){reset();return;}
    const d=Math.min(120,dy*.5);ind.classList.add('on');ind.style.transform=`translate(-50%,${d-44}px)`;armed=d>=70;ind.classList.toggle('armed',armed);txt(armed?'Engedd el a frissítéshez':'Húzd le a frissítéshez');},{passive:true});
  const end=()=>{if(y0==null&&!armed){return;}if(!armed){reset();return;}
    if(window.S&&(S.dirty||S.saving)){try{flushSave();}catch(_){}reset();toast('Előbb mentem a módosításaidat – húzd le újra egy pillanat múlva.');return;}
    busy=true;ind.classList.add('busy');ind.style.transform='translate(-50%,40px)';txt('Frissítés…');setTimeout(()=>location.reload(),120);};
  document.addEventListener('touchend',end,{passive:true});document.addEventListener('touchcancel',()=>{if(!busy)reset();},{passive:true});})();

/* Fekvő mobilnézetben (alacsony képernyő) lefelé görgetéskor a felső sáv eltűnik, felfelé görgetve visszajön */
(()=>{const mq=window.matchMedia&&matchMedia('(orientation:landscape) and (max-height:560px)');if(!mq)return;let last=window.scrollY,tick=false;
  const bar=()=>document.querySelector('.topbar');
  const upd=()=>{tick=false;const b=bar();if(!b)return;const y=window.scrollY;if(!mq.matches||y<60){b.classList.remove('tb-hide');last=y;return;}
    if(y>last+6)b.classList.add('tb-hide');else if(y<last-6)b.classList.remove('tb-hide');last=y;};
  window.addEventListener('scroll',()=>{if(!tick){tick=true;requestAnimationFrame(upd);}},{passive:true});
  if(mq.addEventListener)mq.addEventListener('change',upd);})();

/* A névjelvény menüje: ⚙️ Beállítások és Kilépés (érintésre / kattintásra jelenik meg) */
const THEME_LBL=()=>{const p=window.lpmTheme?lpmTheme():'light';return '🌙 Sötét mód: '+(p==='dark'?'be':'ki');},THEME_NEXT=()=>{const p=window.lpmTheme?lpmTheme():'light';return p==='dark'?'light':'dark';};   /* ki → be → a rendszer szerint → ki */
const SETTINGS_TAB=()=>{try{const t=TABS().find(x=>x.label==='Beállítások');return t?t.id:'';}catch(e){return '';}};
(()=>{const close=()=>{const p=document.getElementById('ucPop');if(p)p.remove();};
  document.addEventListener('click',e=>{const chip=e.target.closest&&e.target.closest('#userChip');const pop=document.getElementById('ucPop');
    if(pop&&!e.target.closest('#ucPop')){close();if(chip)return;}
    if(!chip)return;e.preventDefault();const r=chip.getBoundingClientRect(),p=document.createElement('div');p.id='ucPop';p.className='uc-pop';const st=SETTINGS_TAB();
    const vs=document.getElementById('viewAs'),vOpts=vs&&!vs.classList.contains('hidden')?[...vs.querySelectorAll('option')].filter(o=>(o.value===vs.value||(!o.hidden&&!o.disabled))&&!/^__/.test(o.value)):[];   /* az aktuális nézet akkor is látszik (✓), ha a listában rejtett (pl. szakember nézet) */   /* a nézetváltó is ebben a menüben (egy gomb) */
    p.innerHTML=(vOpts.length?'<div class="uc-h">Nézet – így látja az appot</div>'+vOpts.map(o=>`<button type="button" class="uc-it${o.value===vs.value?' on':''}" data-uv="${o.value}">${o.value===vs.value?'✓ ':''}${o.value===vs.value&&o.value==='crew'&&!/^🔨/.test(o.textContent)?'🔨 Szakember: ':''}${o.value==='crew-other'?'↻ Másik szakember':o.textContent}</button>`).join('')+'<hr class="uc-hr">':'')+(st?'<button type="button" class="uc-it" data-uc="set">⚙️ Beállítások</button><button type="button" class="uc-it" data-uc="kk">📖 Kézikönyv</button>':'')+'<button type="button" class="uc-it" data-uc="ax">🎨 Kinézet: '+(window.lpmAx&&lpmAx()==='sajat'?'Lumos (saját)':'Stone')+'</button>'+'<button type="button" class="uc-it" data-uc="theme">'+THEME_LBL()+'</button><button type="button" class="uc-it" data-uc="out">🚪 Kilépés</button>';p.style.top=(r.bottom+6)+'px';p.style.right=Math.max(8,innerWidth-r.right)+'px';document.body.appendChild(p);
    p.addEventListener('click',ev=>{const v=ev.target.closest('[data-uv]');if(v){close();const vs=document.getElementById('viewAs');if(vs){vs.value=v.dataset.uv;vs.dispatchEvent(new Event('change',{bubbles:true}));}return;}const b=ev.target.closest('[data-uc]');if(!b)return;close();if(b.dataset.uc==='set'||b.dataset.uc==='kk'){S.kkOn=b.dataset.uc==='kk';ACT.tab({dataset:{tab:SETTINGS_TAB()}});render(true);}else if(b.dataset.uc==='theme'){if(window.lpmTheme)lpmTheme(THEME_NEXT());}else if(b.dataset.uc==='ax'){if(window.lpmAx)lpmAx(lpmAx()==='sajat'?'stone':'sajat');}else{const lb=document.getElementById('logoutBtn');if(lb)lb.click();}});});
  window.addEventListener('scroll',close,{passive:true});})();

/* Mobilon (álló és fekvő nézetben) a Kilépés a nézetváltó („💼 Ügyvezető”) listájában van: érintésre a lista végén jelenik meg */
(()=>{const sel=document.getElementById('viewAs');if(!sel||!window.matchMedia)return;const mq=matchMedia('(max-width:760px),(orientation:landscape) and (max-height:560px)');let prev=sel.value;
  const sync=()=>{const keep=sel.value;sel.querySelectorAll('optgroup.va-acc').forEach(x=>x.remove());sel.querySelectorAll('option[value="__logout"],option[value="__settings"],option[value="__kk"],option[value="__theme"]').forEach(x=>x.remove());
    let rg=sel.querySelector('optgroup.va-roles');if(mq.matches&&!rg){rg=document.createElement('optgroup');rg.className='va-roles';rg.label='Szerepkör (nézet)';[...sel.children].filter(x=>x.tagName==='OPTION').forEach(o=>rg.appendChild(o));sel.appendChild(rg);}
    else if(!mq.matches&&rg){[...rg.children].forEach(o=>sel.insertBefore(o,rg));rg.remove();}
    if(mq.matches){const g=document.createElement('optgroup');g.className='va-acc';g.label='Fiók';if(SETTINGS_TAB()){const so=document.createElement('option');so.value='__settings';so.textContent='⚙️ Beállítások';g.appendChild(so);const ko=document.createElement('option');ko.value='__kk';ko.textContent='📖 Kézikönyv';g.appendChild(ko);}{const ax=document.createElement('option');ax.value='__ax';ax.textContent='🎨 Kinézet: '+(window.lpmAx&&lpmAx()==='sajat'?'Lumos (saját)':'Stone');g.appendChild(ax);}{const to=document.createElement('option');to.value='__theme';to.textContent=THEME_LBL();g.appendChild(to);}const o=document.createElement('option');o.value='__logout';o.textContent='🚪 Kilépés';g.appendChild(o);sel.appendChild(g);}if(keep&&!/^__/.test(keep))sel.value=keep;document.documentElement.classList.toggle('va-logout',mq.matches);};
  sync();if(mq.addEventListener)mq.addEventListener('change',sync);
  sel.addEventListener('focus',()=>{prev=sel.value;sync();});sel.addEventListener('pointerdown',()=>{prev=sel.value;sync();});
  document.addEventListener('change',e=>{if(e.target!==sel)return;if(sel.value==='__ax'){e.stopImmediatePropagation();sel.value=prev;if(window.lpmAx)lpmAx(lpmAx()==='sajat'?'stone':'sajat');sync();return;}if(sel.value==='__theme'){e.stopImmediatePropagation();sel.value=prev;if(window.lpmTheme)lpmTheme(THEME_NEXT());sync();return;}if(sel.value==='__settings'||sel.value==='__kk'){e.stopImmediatePropagation();S.kkOn=sel.value==='__kk';sel.value=prev;ACT.tab({dataset:{tab:SETTINGS_TAB()}});render(true);return;}if(sel.value!=='__logout'){prev=sel.value;return;}e.stopImmediatePropagation();sel.value=prev;const lb=document.getElementById('logoutBtn');if(lb)lb.click();},true);})();

/* Nézetváltó: nincs külön „Másik szakember / értékesítő…” sor – másikat a sárga sáv „↻ Másik …” gombjával lehet választani */
(()=>{const sel=document.getElementById('viewAs');if(!sel)return;sel.querySelectorAll('option[value="sales-other"]').forEach(o=>o.remove());})();
ACT['view-other']=b=>{if(b.dataset.r==='sales')viewAsSalesModal();else viewAsCrewModal();};
/* fekvő telefon: a kiválasztott menüfül mindig teljesen látszódjon (a fülsor oldalra görgethető) */
(()=>{const t=document.getElementById('tabs');if(!t||!window.MutationObserver)return;const mq=matchMedia('(orientation:landscape) and (max-height:560px),(max-width:700px)');
  const edge=()=>{const ov=t.scrollWidth>t.clientWidth+2;t.classList.toggle('fl',ov&&t.scrollLeft>4);t.classList.toggle('fr',ov&&t.scrollLeft<t.scrollWidth-t.clientWidth-4);};
  const fix=()=>{if(mq.matches){const a=t.querySelector('.tab[aria-selected="true"]');const pe=t.parentElement,sc=(pe&&getComputedStyle(pe).display==='flex'&&/auto|scroll/.test(getComputedStyle(pe).overflowX))?pe:t;if(a){const tr=sc.getBoundingClientRect(),ar=a.getBoundingClientRect(),pad=sc===t?28:150;if(ar.left<tr.left+pad)sc.scrollLeft-=tr.left+pad-ar.left;else if(ar.right>tr.right-28)sc.scrollLeft+=ar.right-(tr.right-28);}}edge();};
  t.addEventListener('scroll',edge,{passive:true});
  setTimeout(fix,0);setTimeout(fix,600);addEventListener('load',()=>setTimeout(fix,100));if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>setTimeout(fix,50));
  new MutationObserver(()=>requestAnimationFrame(fix)).observe(t,{childList:true});mq.addEventListener&&mq.addEventListener('change',()=>setTimeout(fix,250));addEventListener('resize',()=>setTimeout(fix,250));})();
/* telefon: a görgethető táblázatkeretek (Fizetések, Bevételek) pontosan a képernyő aljáig érnek – így a táblázat minden sora elérhető a saját keretében, és nem kell az oldalt is görgetni */
(()=>{const v=document.getElementById('view');if(!v||!window.matchMedia)return;const mq=matchMedia('(max-width:700px),(orientation:landscape) and (max-height:560px)');let q=false;
  const fit=()=>{q=false;const ws=v.querySelectorAll('.pay-wrap');ws.forEach(w=>{if(!mq.matches){w.style.removeProperty('max-height');w.style.removeProperty('height');w.classList.remove('vfit');return;}
    const top=w.getBoundingClientRect().top+scrollY,vh=(window.visualViewport&&visualViewport.height)||innerHeight;const h=Math.max(220,Math.round(vh-top-6));w.style.setProperty('max-height',h+'px','important');w.style.removeProperty('height');w.classList.remove('vfit');});};
  const sch=()=>{if(!q){q=true;requestAnimationFrame(fit);}};new MutationObserver(sch).observe(v,{childList:true,subtree:true});const later=()=>{[60,250,600,1200].forEach(t=>setTimeout(fit,t));};addEventListener('resize',later);addEventListener('orientationchange',later);if(window.visualViewport)visualViewport.addEventListener('resize',later);mq.addEventListener&&mq.addEventListener('change',later);matchMedia('(orientation:portrait)').addEventListener&&matchMedia('(orientation:portrait)').addEventListener('change',later);setTimeout(fit,500);})();
/* telefon: a véleménymezőre koppintva a mező a billentyűzet fölé gördül */
(()=>{if(!window.matchMedia||!matchMedia('(pointer:coarse)').matches)return;
  document.addEventListener('focusin',e=>{const t=e.target;if(!t||t.id!=='m-vvCm')return;const go=()=>{try{t.scrollIntoView({block:'center',behavior:'smooth'});}catch(_){t.scrollIntoView();}};setTimeout(go,120);setTimeout(go,450);});
  if(window.visualViewport)visualViewport.addEventListener('resize',()=>{const a=document.activeElement;if(a&&a.id==='m-vvCm')setTimeout(()=>a.scrollIntoView({block:'center'}),50);});})();

/* idővonal: a forgatási nap sávjában lévő projektnév a mellette lévő vágási sáv végéig érhet */
(()=>{const v=document.getElementById('view');if(!v||!window.MutationObserver)return;let q=false;
  const fit=()=>{q=false;v.querySelectorAll('.tl-track').forEach(t=>{const b=t.querySelector('.tl-bar:not(.tl-cut)'),c=t.querySelector('.tl-cut');if(!b||!c)return;const br=b.getBoundingClientRect(),cr=c.getBoundingClientRect();const w=Math.max(br.right,cr.right)-br.left-16;if(w>20)b.style.setProperty('--nmw',w+'px');});};
  new MutationObserver(()=>{if(!q){q=true;requestAnimationFrame(fit);}}).observe(v,{childList:true,subtree:true});addEventListener('resize',()=>setTimeout(fit,100));})();
/* idővonal: balra görgetéskor a részben kilógó sáv felirata (projekt neve) a látható rész elején marad */
(()=>{let q=false;const fix=w=>{q=false;const wr=w.getBoundingClientRect(),L=wr.left;w.querySelectorAll('.tl-track .tl-bar').forEach(b=>{if(b.style.paddingLeft)b.style.removeProperty('padding-left');});   /* a név tapadását már a CSS (position:sticky) végzi – simán, ugrálás nélkül */
    if(window.tlNameFix)return;   /* a lenti (tlNameFix) kezeli: a régi, ugyanazt író megoldás ütközött vele (dupla név) */
    w.querySelectorAll('.tl-track').forEach(t=>{const b=t.querySelector('.tl-bar:not(.tl-cut)'),c=t.querySelector('.tl-cut'),n=b&&c&&b.querySelector('.tl-nm');if(!n)return;   // forgatási nap + vágás: a név a teljes (közös) sáv látható elejére kerül
      const br=b.getBoundingClientRect(),right=Math.max(br.right,c.getBoundingClientRect().right);let off=0;if(br.left<L&&right>L+60)off=Math.min(L-br.left,right-br.left-90);
      if(off>0){b.style.removeProperty('padding-left');n.style.transform='translateX('+off+'px)';n.style.maxWidth=Math.max(40,right-br.left-off-16)+'px';}else{n.style.transform='';n.style.maxWidth='';}});};
  document.addEventListener('scroll',e=>{const w=e.target;if(!w||!w.classList||!w.classList.contains('tl-wrap'))return;if(!q){q=true;requestAnimationFrame(()=>fix(w));}},true);
  const v=document.getElementById('view');if(v&&window.MutationObserver)new MutationObserver(()=>{const w=v.querySelector('.tl-wrap');if(w&&!q){q=true;requestAnimationFrame(()=>fix(w));}}).observe(v,{childList:true});})();
/* menüpontok, fülek, belső linkek: ne lehessen őket elhúzni (iPhone hosszú érintés) */
document.addEventListener('dragstart',e=>{const t=e.target;if(t&&t.closest&&t.closest('a[href^="#"],.tab,.subtab,.brand-link,.topbar a,.topbar img')&&!t.closest('[draggable="true"]'))e.preventDefault();},true);
/* Meghívó levél linkje (#inv=<projekt>): betöltés után felugrik a meghívás – Elfogadom / Nem vállalom; ha már elfogadta, a projekt nyílik meg */
/* E-mailes meghívólink: a szerveren ellenőrizzük a korábbi választ, mielőtt válaszgombokat mutatunk. */
(()=>{const pid=window.__INV;if(!pid)return;let n=0;
  const go=async()=>{
    if(!(typeof S!=='undefined'&&S.me&&Array.isArray(S.projects)&&(S._fresh||n>60))){if(++n<160)setTimeout(go,500);return;}
    try{if(/inv=/.test(location.hash))history.replaceState(null,'',location.pathname+location.search);}catch(e){}
    if(S.me.viewAs&&(S.me.realRole==='admin'||S.me.realRole==='editor')&&typeof switchView==='function'&&!go._sw){
      go._sw=1;switchView(S.me.realRole).then(()=>{S._fresh=true;n=0;setTimeout(go,300);}).catch(handleErr);return;
    }
    let status;
    try{status=await call('inviteStatus',{projectId:pid});}
    catch(e){handleErr(e);return;}
    if(status&&['yes','no'].includes(status.st)){inviteAlreadyModal_(status.st,status.name);return;}
    if(!status||status.st!=='invited'){
      openModal('Meghívás állapota','<p style="margin:0">Ehhez a fiókhoz jelenleg tartozó meghívást a projektben tudod ellenőrizni.</p>',{cancelLabel:'Rendben'});return;
    }
    const x=(S.myInvites||[]).find(i=>i.id===pid);
    // A válaszra váró meghívás mindig a válaszadó felugró ablakban nyílik meg.
    S.tab='projektek';render(true);
    const name=status.name||(x&&x.name)||'Projektmeghívás';
    openModal(x&&x.pre?'⏳ Előfoglalás':'✉️ Meghívás',
      `<div class="inv-modal"><p style="margin:0 0 6px">${x&&x.pre?'Szeretnénk előre lefoglalni erre a projektre':'Meghívást kaptál erre a projektre'}${x&&(x.roles||[]).length?', mint <b>'+esc(x.roles.map(r=>r.toLowerCase()).join(' és '))+'</b>':''}:</p><h3 style="margin:0 0 4px">${esc(name)}</h3>${x?`<p class="hint" style="margin:0">${esc(fmtDay(x.date))}${x.startTime?' · '+esc(x.startTime)+(x.endTime?'–'+esc(x.endTime):''):''}${x.venue?' · '+esc(x.venue):''}</p>`:''}${(()=>{const pj=projById(pid),f=pj&&myFeeOf(pj);return f&&num(f.amount)?`<p class="hint" style="margin:6px 0 0">💰 Díjad: <b>${ftFmt(num(f.amount))}</b> nettó – az elfogadással ezt a díjat fogadod el.</p>`:'';})()}<div class="btns" style="margin-top:14px;display:flex;gap:8px"><button type="button" class="btn primary" data-action="inv-answer" data-id="${esc(pid)}" data-a="yes" data-close="1"${x&&x.pre?' data-pre="1"':''}>${x&&x.pre?'✓ Szabadon tartom':'✓ Elfogadom'}</button><button type="button" class="btn outline" data-action="inv-answer" data-id="${esc(pid)}" data-a="no" data-close="1"${x&&x.pre?' data-pre="1"':''}>${x&&x.pre?'Nem tudom':'Nem vállalom'}</button></div></div>`,
      {cancelLabel:'Később'});
  };
  setTimeout(go,300);})();

/* Telefon, Fizetések tábla (payDock): a menüsáv a tábla görgetésével együtt, 1:1-ben csúszik ki / vissza – csak eltolás (GPU), így
   lendületes görgetésnél sem akad; a felső (állapotsor alatti) sötét sáv megmarad */
(()=>{let raf=0,W=null;const upd=()=>{raf=0;const tb=document.querySelector('.topbar');if(!tb||!W||!document.body.classList.contains('pay-dock'))return;
    const safe=parseFloat(getComputedStyle(tb).paddingTop)||0,max=Math.max(0,tb.offsetHeight-safe),y=Math.min(max,Math.max(0,W.scrollTop));
    tb.style.transition='none';tb.style.transform=y?'translate3d(0,'+(-y)+'px,0)':'';};
  document.addEventListener('scroll',e=>{const w=e.target;if(!w||!w.classList||!w.classList.contains('dock-wrap')||!document.body.classList.contains('pay-dock'))return;W=w;if(!raf)raf=requestAnimationFrame(upd);},{capture:true,passive:true});
  window.payDockSync=w=>{W=w;upd();};   /* újrarajzolás után a menüsáv helyzete a (visszaállított) görgetéshez igazodik */
})();

/* Fizetések tábla telefonon: a tábla tetején lefelé / alján felfelé húzva (gyors görgetésnél is) az iPhone az egész oldalt
   „rugóztatta”, és üres sáv nyílt a tábla fölött vagy alatt – a tábla szélén a további függőleges húzást elnyeljük */
(()=>{if(!('ontouchstart' in window))return;let w=null,x0=0,y0=0;
  document.addEventListener('touchstart',e=>{w=e.touches.length===1&&e.target.closest?e.target.closest('.pay-wrap,.dock-wrap'):null;if(w){x0=e.touches[0].clientX;y0=e.touches[0].clientY;}},{passive:true});
  document.addEventListener('touchmove',e=>{if(!w||e.touches.length!==1)return;const t=e.touches[0],dx=t.clientX-x0,dy=t.clientY-y0;if(Math.abs(dy)<=Math.abs(dx))return;
    if(w.scrollHeight<=w.clientHeight+1)return;   /* ha a tábla nem görget függőlegesen (pl. tableten az oldal görget), nem fogjuk meg */
    const atTop=w.scrollTop<=0,atBot=w.scrollTop+w.clientHeight>=w.scrollHeight-1;if((dy>0&&atTop)||(dy<0&&atBot)){if(e.cancelable)e.preventDefault();}},{passive:false});
  document.addEventListener('touchend',()=>{w=null;},{passive:true});})();

/* Tablet (701–1180 px): minden oldalra görgethető táblában a projekt neve oszlop (és az előtte lévő keskeny oszlopok, pl. „Nap”) a helyén
   marad vízszintes görgetéskor – a cellák háttere a sor saját színe, hogy alattuk ne látszódjon át a görgetett tartalom */
(()=>{const mq=window.matchMedia&&matchMedia('(min-width:701px) and (max-width:1180px)');if(!mq)return;let q=false;
  const bg=el=>{for(let n=el;n&&n.tagName!=='DIV';n=n.parentElement){const c=getComputedStyle(n).backgroundColor;if(c&&c!=='transparent'&&!/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(c))return c;}return '#fff';};
  const clear=t=>{t.querySelectorAll('[data-stk]').forEach(c=>{c.style.position='';c.style.left='';c.style.zIndex='';c.style.backgroundColor='';c.style.boxShadow='';c.removeAttribute('data-stk');});t.removeAttribute('data-stk-n');};
  const fix=()=>{q=false;const v=document.getElementById('view');if(!v)return;
    v.querySelectorAll('table.sheet').forEach(t=>{const w=t.parentElement;if(!mq.matches||!w||w.classList.contains('dock-wrap')||w.scrollWidth<=w.clientWidth+2){if(t.hasAttribute('data-stk-n'))clear(t);return;}
      const hr=t.tHead&&t.tHead.rows[t.tHead.rows.length-1];if(!hr)return;const hs=[...hr.cells];let n=hs.findIndex(c=>/projekt|megnevez|értékesítő|ügyfél/i.test(c.textContent||''))+1;if(n<1)n=1;if(n>3)n=1;
      const lefts=[];let x=0;for(let i=0;i<n;i++){lefts.push(x);x+=hs[i]?hs[i].getBoundingClientRect().width:0;}
      t.setAttribute('data-stk-n',n);
      [...t.rows].forEach(r=>{let col=0;for(const c of r.cells){if(col>=n)break;const span=c.colSpan||1;if(col+span>n&&span>1){col+=span;continue;}
        c.setAttribute('data-stk','1');c.style.position='sticky';c.style.left=lefts[col]+'px';c.style.zIndex=r.parentElement.tagName==='THEAD'?'7':'4';c.style.backgroundColor=bg(c);
        if(col+span===n)c.style.boxShadow='1px 0 0 var(--line,#d6dee6)';col+=span;}});});};
  const sch=()=>{if(!q){q=true;requestAnimationFrame(fix);}};
  window.tabStick=sch;   /* a render() hívja (nem figyelünk minden DOM-változást – nagy tábláknál az akasztana) */
  window.addEventListener('resize',sch);if(mq.addEventListener)mq.addEventListener('change',sch);})();

/* Naptár idővonal: ha balra (korábbra) görgetsz és egy sáv eleje kicsúszik a képből, a projekt neve a sáv látható részének elejére
   csúszik – így mindig olvasható (a sáv levágja a tartalmát, ezért a CSS-es „sticky” itt nem működik). */
(()=>{let raf=0,W=null,C=null;
  /* Egyszer (rajzoláskor / átméretezéskor) lemérjük a sávokat a görgetett tartalom koordinátáiban; görgetéskor már csak számolunk
     és a transform-ot írjuk (nincs elrendezés-olvasás) – így a görgetés nem akad. */
  const build=w=>{const wr=w.getBoundingClientRect(),sl=w.scrollLeft,X=v=>v-wr.left+sl,lb=w.querySelector('.tl-row.tl-it>.tl-lbl'),lw=lb&&lb.offsetWidth&&getComputedStyle(lb).position==='sticky'?lb.offsetWidth:0;
    const box=e=>{const r=e.getBoundingClientRect();return {l:X(r.left),r:X(r.right),w:r.width};};
    const cuts=[...w.querySelectorAll('.tl-cut')].map(c=>{const cn=c.querySelector(':scope>.tl-nm'),tr=c.closest('.tl-track'),b=box(c),txt=cn?cn.textContent.trim():'',jn=c.classList.contains('tl-joined'),wm=c.classList.contains('tl-withmain');
      const ms=tr?[...tr.querySelectorAll('.tl-bar:not(.tl-cut)')].filter(x=>{const n=x.querySelector('.tl-nm');if(!n)return false;const q=box(x);return (x.dataset.id===c.dataset.id||(txt&&n.textContent.trim()===txt))&&q.l<b.l+4&&b.l-q.r<80;}):[];
      const mr=ms.length?Math.max(...ms.map(x=>box(x).r)):-1e9;c.classList.toggle('nm-dup',jn||ms.length>0||wm);if(jn)c.classList.remove('nm-show');
      return jn?null:{c,b,mr,always:!ms.length&&!wm,on:null};}).filter(Boolean);
    const names=[...w.querySelectorAll('.tl-bar>.tl-nm')].filter(n=>n.offsetParent).map(n=>{const p=n.parentElement,b=box(p);let right=b.r;
      if(p.classList.contains('tl-join')){const cj=[...p.parentElement.querySelectorAll('.tl-cut.tl-joined')].find(x=>x.dataset.id===p.dataset.id);if(cj)right=Math.max(right,box(cj).r);}
      n.style.transform='';const nat=b.l+n.offsetLeft;return {n,p,b,right,nat,join:p.classList.contains('tl-join'),cut:cuts.find(k=>k.c===p),last:''};});
    return {w,wl:Math.max(0,wr.left)-wr.left+lw,cuts,names};};
  const fix=()=>{raf=0;const w=W;if(!w||!document.contains(w))return;if(!C||C.w!==w)C=build(w);const vis=w.scrollLeft+C.wl;
    C.cuts.forEach(k=>{const on=k.always||k.mr<vis+30&&k.b.r>vis+60;if(on!==k.on){k.on=on;k.c.classList.toggle('nm-show',on);}});
    C.names.forEach(o=>{let x=0;const show=o.cut?o.cut.on:false;if(o.right>vis&&(o.nat<vis+4||show))x=Math.max(vis,o.b.l)+6-o.nat;
      const av=Math.round(o.right-(o.nat+x)-8),lim=x||o.join,key=Math.round(x)+'|'+(lim?Math.max(0,av):'');if(key===o.last)return;o.last=key;
      o.n.style.transform=x?'translateX('+Math.round(x)+'px)':'';o.n.style.maxWidth=lim?Math.max(0,av)+'px':'';o.n.style.visibility=lim&&av<22?'hidden':'';});};   /* a név a látható rész elején, sosem lóg túl a sáv végén */
  const go=()=>{if(!raf)raf=requestAnimationFrame(fix);};
  document.addEventListener('scroll',e=>{const t=e.target;if(!t||!t.classList||!t.classList.contains('tl-wrap'))return;if(W!==t){W=t;C=null;}go();},{capture:true,passive:true});
  window.addEventListener('resize',()=>{C=null;go();},{passive:true});
  window.tlNameFix=()=>{W=document.querySelector('#view .tl-wrap');C=null;if(W)go();};})();
