'use strict';
/* ===== Indítás: minden szkript betöltése után (a felület kódja több fájlban van) ===== */
if(TOKEN){const fast=bootFromCache();load(fast);}else{VIEW.innerHTML='';showLogin('');}

/* Mobilon lehúzással frissítés (a lap tetején lefelé húzva; ablak nyitva vagy görgetett lista közben nem indul) */
(()=>{if(!('ontouchstart' in window))return;let y0=null,x0=0,armed=false,busy=false;
  const ind=document.createElement('div');ind.className='ptr';ind.setAttribute('aria-hidden','true');ind.innerHTML='<span class="ptr-i">↓</span><span class="ptr-t">Húzd le a frissítéshez</span>';document.body.appendChild(ind);
  const txt=t=>{ind.querySelector('.ptr-t').textContent=t;};
  const reset=()=>{y0=null;armed=false;if(busy)return;ind.classList.remove('on','armed');ind.style.transform='';};
  const blocked=t=>{if(window.BD_BUSY>0){try{toast('Még folyamatban a videó áthelyezése / levele – egy pillanat, utána frissíthetsz.');}catch(_){}return true;}if(window.scrollY>0)return true;const mr=document.getElementById('modalRoot');if(mr&&mr.innerHTML&&!(window.matchMedia&&matchMedia('(max-width:760px)').matches))return true;   // mobilon a (teljes képernyős) ablakban is lehet lehúzással frissíteni; frissítés után az ablak visszajön
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
const SETTINGS_TAB=()=>{try{const t=TABS().find(x=>x.label==='Beállítások');return t?t.id:'';}catch(e){return '';}};
(()=>{const close=()=>{const p=document.getElementById('ucPop');if(p)p.remove();};
  document.addEventListener('click',e=>{const chip=e.target.closest&&e.target.closest('#userChip');const pop=document.getElementById('ucPop');
    if(pop&&!e.target.closest('#ucPop')){close();if(chip)return;}
    if(!chip)return;e.preventDefault();const r=chip.getBoundingClientRect(),p=document.createElement('div');p.id='ucPop';p.className='uc-pop';const st=SETTINGS_TAB();
    p.innerHTML=(st?'<button type="button" class="uc-it" data-uc="set">⚙️ Beállítások</button>':'')+'<button type="button" class="uc-it" data-uc="out">🚪 Kilépés</button>';p.style.top=(r.bottom+6)+'px';p.style.right=Math.max(8,innerWidth-r.right)+'px';document.body.appendChild(p);
    p.addEventListener('click',ev=>{const b=ev.target.closest('[data-uc]');if(!b)return;close();if(b.dataset.uc==='set'){ACT.tab({dataset:{tab:SETTINGS_TAB()}});}else{const lb=document.getElementById('logoutBtn');if(lb)lb.click();}});});
  window.addEventListener('scroll',close,{passive:true});})();

/* Mobilon (álló és fekvő nézetben) a Kilépés a nézetváltó („💼 Ügyvezető”) listájában van: érintésre a lista végén jelenik meg */
(()=>{const sel=document.getElementById('viewAs');if(!sel||!window.matchMedia)return;const mq=matchMedia('(max-width:760px),(orientation:landscape) and (max-height:560px)');let prev=sel.value;
  const sync=()=>{const keep=sel.value;sel.querySelectorAll('optgroup.va-acc').forEach(x=>x.remove());sel.querySelectorAll('option[value="__logout"],option[value="__settings"]').forEach(x=>x.remove());
    let rg=sel.querySelector('optgroup.va-roles');if(mq.matches&&!rg){rg=document.createElement('optgroup');rg.className='va-roles';rg.label='Szerepkör (nézet)';[...sel.children].filter(x=>x.tagName==='OPTION').forEach(o=>rg.appendChild(o));sel.appendChild(rg);}
    else if(!mq.matches&&rg){[...rg.children].forEach(o=>sel.insertBefore(o,rg));rg.remove();}
    if(mq.matches){const g=document.createElement('optgroup');g.className='va-acc';g.label='Fiók';if(SETTINGS_TAB()){const so=document.createElement('option');so.value='__settings';so.textContent='⚙️ Beállítások';g.appendChild(so);}const o=document.createElement('option');o.value='__logout';o.textContent='🚪 Kilépés';g.appendChild(o);sel.appendChild(g);}if(keep&&keep!=='__logout'&&keep!=='__settings')sel.value=keep;document.documentElement.classList.toggle('va-logout',mq.matches);};
  sync();if(mq.addEventListener)mq.addEventListener('change',sync);
  sel.addEventListener('focus',()=>{prev=sel.value;sync();});sel.addEventListener('pointerdown',()=>{prev=sel.value;sync();});
  document.addEventListener('change',e=>{if(e.target!==sel)return;if(sel.value==='__settings'){e.stopImmediatePropagation();sel.value=prev;ACT.tab({dataset:{tab:SETTINGS_TAB()}});return;}if(sel.value!=='__logout'){prev=sel.value;return;}e.stopImmediatePropagation();sel.value=prev;const lb=document.getElementById('logoutBtn');if(lb)lb.click();},true);})();

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
    w.querySelectorAll('.tl-track').forEach(t=>{const b=t.querySelector('.tl-bar:not(.tl-cut)'),c=t.querySelector('.tl-cut'),n=b&&c&&b.querySelector('.tl-nm');if(!n)return;   // forgatási nap + vágás: a név a teljes (közös) sáv látható elejére kerül
      const br=b.getBoundingClientRect(),right=Math.max(br.right,c.getBoundingClientRect().right);let off=0;if(br.left<L&&right>L+60)off=Math.min(L-br.left,right-br.left-90);
      if(off>0){b.style.removeProperty('padding-left');n.style.transform='translateX('+off+'px)';n.style.maxWidth=Math.max(40,right-br.left-off-16)+'px';}else{n.style.transform='';n.style.maxWidth='';}});};
  document.addEventListener('scroll',e=>{const w=e.target;if(!w||!w.classList||!w.classList.contains('tl-wrap'))return;if(!q){q=true;requestAnimationFrame(()=>fix(w));}},true);
  const v=document.getElementById('view');if(v&&window.MutationObserver)new MutationObserver(()=>{const w=v.querySelector('.tl-wrap');if(w&&!q){q=true;requestAnimationFrame(()=>fix(w));}}).observe(v,{childList:true});})();
/* menüpontok, fülek, belső linkek: ne lehessen őket elhúzni (iPhone hosszú érintés) */
document.addEventListener('dragstart',e=>{const t=e.target;if(t&&t.closest&&t.closest('a[href^="#"],.tab,.subtab,.brand-link,.topbar a,.topbar img')&&!t.closest('[draggable="true"]'))e.preventDefault();},true);
/* telefon: a Kifizetések / Fizetések táblán jobbra-balra húzva hónapot vált (ha a tábla nem szélesebb a képernyőnél) */
(()=>{let x0=0,y0=0,w=null,t0=0;document.addEventListener('touchstart',e=>{const el=e.target.closest&&e.target.closest('.pay-wrap');if(!el||e.touches.length!==1){w=null;return;}w=el;x0=e.touches[0].clientX;y0=e.touches[0].clientY;t0=Date.now();},{passive:true});
  document.addEventListener('touchend',e=>{if(!w)return;const el=w;w=null;const t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;if(Date.now()-t0>800||Math.abs(dx)<60||Math.abs(dy)>Math.abs(dx)*0.6)return;
    if(el.scrollWidth>el.clientWidth+2){const atL=el.scrollLeft<=2,atR=el.scrollLeft>=el.scrollWidth-el.clientWidth-2;if(!((dx>0&&atL)||(dx<0&&atR)))return;}
    const b=document.querySelector(`.pay-cbox [data-action="mnav"][data-d="${dx<0?-1:1}"],.pay-head [data-action="mnav"][data-d="${dx<0?-1:1}"]`);if(b)b.click();},{passive:true});})();
/* Meghívó levél linkje (#inv=<projekt>): betöltés után felugrik a meghívás – Elfogadom / Nem vállalom; ha már elfogadta, a projekt nyílik meg */
(()=>{const pid=window.__INV;if(!pid)return;let n=0;
  const go=()=>{if(!(typeof S!=='undefined'&&S.me&&Array.isArray(S.projects)&&(S._fresh||n>60))){if(++n<160)setTimeout(go,500);return;}
    try{if(/inv=/.test(location.hash))history.replaceState(null,'',location.pathname+location.search);}catch(e){}
    const x=(S.myInvites||[]).find(i=>i.id===pid);
    if(x){S.tab='projektek';render(true);openModal('✉️ Meghívás',`<div class="inv-modal"><p style="margin:0 0 6px">Meghívást kaptál erre a projektre${(x.roles||[]).length?', mint <b>'+esc(x.roles.map(r=>r.toLowerCase()).join(' és '))+'</b>':''}:</p><h3 style="margin:0 0 4px">${esc(x.name)}</h3><p class="hint" style="margin:0">${esc(fmtDay(x.date))}${x.startTime?' · '+esc(x.startTime)+(x.endTime?'–'+esc(x.endTime):''):''}${x.venue?' · '+esc(x.venue):''}</p><div class="btns" style="margin-top:14px;display:flex;gap:8px"><button type="button" class="btn primary" data-action="inv-answer" data-id="${esc(pid)}" data-a="yes" data-close="1">✓ Elfogadom</button><button type="button" class="btn outline" data-action="inv-answer" data-id="${esc(pid)}" data-a="no" data-close="1">Nem vállalom</button></div></div>`,{cancelLabel:'Később'});return;}
    if(projById(pid)){openProject(pid);return;}
    toast('Ez a meghívás már nem érvényes, vagy korábban nemet mondtál rá.',true);};
  setTimeout(go,300);})();
