'use strict';
/* ===== Indítás: minden szkript betöltése után (a felület kódja több fájlban van) ===== */
if(TOKEN){const fast=bootFromCache();load(fast);}else{VIEW.innerHTML='';showLogin('');}

/* Mobilon lehúzással frissítés (a lap tetején lefelé húzva; ablak nyitva vagy görgetett lista közben nem indul) */
(()=>{if(!('ontouchstart' in window))return;let y0=null,x0=0,armed=false,busy=false;
  const ind=document.createElement('div');ind.className='ptr';ind.setAttribute('aria-hidden','true');ind.innerHTML='<span class="ptr-i">↓</span><span class="ptr-t">Húzd le a frissítéshez</span>';document.body.appendChild(ind);
  const txt=t=>{ind.querySelector('.ptr-t').textContent=t;};
  const reset=()=>{y0=null;armed=false;if(busy)return;ind.classList.remove('on','armed');ind.style.transform='';};
  const blocked=t=>{if(window.scrollY>0)return true;const mr=document.getElementById('modalRoot');if(mr&&mr.innerHTML)return true;for(let n=t;n&&n!==document.body;n=n.parentElement){if(n.scrollTop>0)return true;}return false;};
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

/* Fekvő mobilnézet: a Kilépés a névjelvény mögé kerül (érintésre jelenik meg) */
(()=>{const mq=window.matchMedia&&matchMedia('(orientation:landscape) and (max-height:560px)');if(!mq)return;
  const close=()=>{const p=document.getElementById('ucPop');if(p)p.remove();};
  document.addEventListener('click',e=>{const chip=e.target.closest&&e.target.closest('#userChip');const pop=document.getElementById('ucPop');
    if(pop&&!e.target.closest('#ucPop')){close();if(chip)return;}
    if(!chip||!mq.matches)return;e.preventDefault();const r=chip.getBoundingClientRect(),p=document.createElement('div');p.id='ucPop';p.className='uc-pop';
    p.innerHTML='<button type="button" class="btn ghost small" data-uc="out">Kilépés</button>';p.style.top=(r.bottom+6)+'px';p.style.right=Math.max(8,innerWidth-r.right)+'px';document.body.appendChild(p);
    p.querySelector('[data-uc="out"]').addEventListener('click',()=>{close();const lb=document.getElementById('logoutBtn');if(lb)lb.click();});});
  window.addEventListener('scroll',close,{passive:true});})();

/* Mobilon (álló és fekvő nézetben) a Kilépés a nézetváltó („💼 Ügyvezető”) listájában van: érintésre a lista végén jelenik meg */
(()=>{const sel=document.getElementById('viewAs');if(!sel||!window.matchMedia)return;const mq=matchMedia('(max-width:760px),(orientation:landscape) and (max-height:560px)');let prev=sel.value;
  const sync=()=>{let o=sel.querySelector('option[value="__logout"]');if(mq.matches&&!o){o=document.createElement('option');o.value='__logout';o.textContent='⎋ Kilépés';sel.appendChild(o);}else if(!mq.matches&&o)o.remove();document.documentElement.classList.toggle('va-logout',mq.matches);};
  sync();if(mq.addEventListener)mq.addEventListener('change',sync);
  sel.addEventListener('focus',()=>{prev=sel.value;sync();});sel.addEventListener('pointerdown',()=>{prev=sel.value;sync();});
  document.addEventListener('change',e=>{if(e.target!==sel)return;if(sel.value!=='__logout'){prev=sel.value;return;}e.stopImmediatePropagation();sel.value=prev;const lb=document.getElementById('logoutBtn');if(lb)lb.click();},true);})();
