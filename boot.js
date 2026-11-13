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
