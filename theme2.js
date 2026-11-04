/* Új design kipróbálása: a választás böngészőnként megmarad, bármikor visszakapcsolható. */
(function(){var h=document.documentElement;try{if(localStorage.getItem('lumos_theme')==='th2')h.classList.add('th2');}catch(e){}
document.addEventListener('DOMContentLoaded',function(){var b=document.getElementById('themeBtn');if(!b)return;
  function upd(){var on=h.classList.contains('th2');b.textContent=on?'↺ Régi design':'✦ Új design';b.title=on?'Vissza a régi kinézetre':'Az új, letisztult kinézet kipróbálása – bármikor visszaállítható';}
  b.addEventListener('click',function(){var on=!h.classList.contains('th2');h.classList.toggle('th2',on);try{localStorage.setItem('lumos_theme',on?'th2':'');}catch(e){}upd();});upd();});})();
