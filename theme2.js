/* Az új design (html.th2) mostantól az alapértelmezett és egyetlen kinézet.
   Bejelentkezés nélkül (pl. inkognitóban) a menüsor nem villan fel: rögtön a belépés látszik.
   Bejelentkezve az app csak betöltés után, lágyan tűnik elő (booting). */
(function(){var h=document.documentElement;h.classList.add('th2');var t='';try{t=localStorage.getItem('lumos_pm_token_v1')||'';}catch(e){}if(!t)h.classList.add('no-auth');else h.classList.add('booting');
  setTimeout(function(){h.classList.remove('booting');},8000);})();
