/* Az új design (html.th2) mostantól az alapértelmezett és egyetlen kinézet.
   Bejelentkezés nélkül (pl. inkognitóban) a menüsor nem villan fel: rögtön a belépés látszik. */
(function(){var h=document.documentElement;h.classList.add('th2');var t='';try{t=localStorage.getItem('lumos_pm_token_v1')||'';}catch(e){}if(!t)h.classList.add('no-auth');})();
