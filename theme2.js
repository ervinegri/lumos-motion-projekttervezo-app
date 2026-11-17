/* Az új design (html.th2) mostantól az alapértelmezett és egyetlen kinézet.
   Bejelentkezés nélkül (pl. inkognitóban) a menüsor nem villan fel: rögtön a belépés látszik.
   Bejelentkezve az app csak betöltés után, lágyan tűnik elő (booting). */
(function(){var h=document.documentElement;h.classList.add('th2');var t='';try{t=localStorage.getItem('lumos_pm_token_v1')||'';}catch(e){}if(!t)h.classList.add('no-auth');else h.classList.add('booting');
  setTimeout(function(){h.classList.remove('booting');},8000);})();

/* ===== Sötét mód =====
   Beállítás: localStorage 'lpm_theme' = 'light' | 'dark' | 'auto' (a rendszer szerint). Nincs külön, kézzel karbantartott sötét
   stíluslap: betöltéskor az app az összes CSS-szabályból elkészíti a sötét párját (a nagyon világos és nagyon sötét színek
   világossága megfordul, a telített márkaszínek maradnak), így minden új stílus automatikusan sötét változatot kap.
   shortcut: a JS-ben beírt (style="…") színeket nem alakítja át – ha valahol világos folt marad, azt célzottan kell javítani. */
(function(){var h=document.documentElement,mq=window.matchMedia?matchMedia('(prefers-color-scheme: dark)'):null;
  function pref(){try{return localStorage.getItem('lpm_theme')||'light';}catch(e){return 'light';}}
  function on(){var p=pref();return p==='dark'||(p==='auto'&&!!(mq&&mq.matches));}
  /* szín → sötét pár (HSL-ben): a nagyon világos (≥ 78%) és a szürkés / nagyon sötét színek világossága megfordul */
  var MODE='sym';function conv(r,g,b,a){r/=255;g/=255;b/=255;var mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,s=0,hh=0,d=mx-mn;
    if(d){s=l>.5?d/(2-mx-mn):d/(mx+mn);hh=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;hh/=6;}
    if(a<.9&&l<=.3)return null;
    if(MODE==='bg'&&l>=.66&&l<.78&&s>=.18)l=.8;if(MODE==='bg'&&l<.78&&s>=.18)return null;if(MODE==='bg'&&l<=.3)return null;   /* háttér, keret: csak a világos fordul sötétre – a sötét (pl. táblafejléc, kiemelt gomb) marad, a rajta lévő világos szöveggel együtt */
    if(MODE==='fg'&&l>=.78)return null;   /* szöveg: a világos szöveg sötét / színes háttéren van – marad */   /* áttetsző sötét fátyol (felugró ablak háttere, árnyék): marad sötét */
    if(l>=.78||l<=.3||s<.18){var lt=l>=.78;l=1-l;l=l<.5?(lt?.09+l*.55:.07+l*.86):.12+l*.86;if(s>.18)s*=lt?.38:.72;}else return null;   /* a világos színes hátterek (figyelmeztetés, címkék) visszafogott, sötét árnyalatot kapnak */   /* telített középtónus (márkaszín): marad */
    function f(t){var q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;t<0&&(t+=1);t>1&&(t-=1);return t<1/6?p+(q-p)*6*t:t<.5?q:t<2/3?p+(q-p)*(2/3-t)*6:p;}
    var R=Math.round((s?f(hh+1/3):l)*255),G=Math.round((s?f(hh):l)*255),B=Math.round((s?f(hh-1/3):l)*255);return a<1?'rgba('+R+','+G+','+B+','+a+')':'rgb('+R+','+G+','+B+')';}
  var ANY=/#([0-9a-f]{3,8})\b|rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)|\b(white|black)\b/gi;
  function cv(v){var ch=false,o=v.replace(ANY,function(m,x,r,g,b,a,nm){var n=null;   /* egyetlen menet: egy színt csak egyszer alakítunk át */
      if(x){if(x.length===3||x.length===4)x=x.split('').map(function(c){return c+c;}).join('');if(x.length!==6&&x.length!==8)return m;
        n=conv(parseInt(x.slice(0,2),16),parseInt(x.slice(2,4),16),parseInt(x.slice(4,6),16),x.length===8?parseInt(x.slice(6),16)/255:1);}
      else if(r!=null){var al=a==null?1:/%$/.test(a)?parseFloat(a)/100:+a;if(+r+ +g+ +b===0&&al<.5)return m;   /* árnyékok (átlátszó fekete) maradnak */
        n=conv(+r,+g,+b,al);}
      else if(nm)n=nm.toLowerCase()==='white'?'rgb(22,30,38)':'rgb(232,238,243)';
      if(!n)return m;ch=true;return n;});return ch?o:null;}
  var SKIP=/\.topbar|#userChip|\.work-pill|#toast|\.qs-pdf|\.qs-pages|\.brand|\.identity|\.vv-player|video|iframe|canvas|\.mn-qr|qr/i;   /* a sötét menüsáv és a már sötét elemek / képek maradnak */
  function sel(s){return s.split(',').map(function(x){x=x.trim();if(/^:root\b/.test(x))return 'html.dark'+x.slice(5);if(/^html\b/.test(x))return 'html.dark'+x.slice(4);return 'html.dark '+x;}).join(',');}
  function walk(list,out){for(var i=0;i<list.length;i++){var r=list[i];
      if(r.cssRules&&!r.selectorText){var inner=[];walk(r.cssRules,inner);if(inner.length){var c=r.conditionText||(r.media&&r.media.mediaText)||'';out.push((r instanceof CSSSupportsRule?'@supports ':'@media ')+c+'{'+inner.join('')+'}');}continue;}
      if(!r.selectorText||!r.style||SKIP.test(r.selectorText))continue;var d=[];
      /* a deklarációkat a szövegből olvassuk: a var(…, #szín) tartalékos rövidítéseknél (pl. background) a részértékek üresek lennének */
      var txt=r.style.cssText,DM=/(?:^|;)\s*([-\w]+)\s*:\s*((?:[^;(]|\([^)]*\))+?)\s*(!important)?\s*(?=;|$)/g,mm;
      while((mm=DM.exec(txt))){var p=mm[1],v=mm[2];if(v&&/^(color|fill|-webkit-text-fill-color)$/.test(p)&&/var\(--accent[,)]/.test(v)){d.push(p+':#86cfa5'+(mm[3]?'!important':''));continue;}
        if(v&&/^(background|background-color|border-color)$/.test(p)&&/var\(--fg[,)]/.test(v)&&!/gradient/.test(v)){d.push(p+':#33424f'+(mm[3]?'!important':''));continue;}   /* sötét szövegszín háttérként (pl. aktív alfül): sötét szürkéskék marad */   /* a sötétzöld kiemelőszín szövegként világoszöld */
        if(!v||!/(#|rgb|white|black)/i.test(v)||/url\(/i.test(v))continue;if(/^(--font|--shadow|--ink|--accent(-hover)?$)/.test(p))continue;   /* --ink: a sötét márkaszín (menüsáv, kiemelt gombok) marad */
        MODE=/^--/.test(p)?'sym':/^(color|-webkit-text-fill-color|caret-color|text-decoration-color|fill)$/.test(p)?'fg':'bg';var n=cv(v);MODE='sym';if(n)d.push(p+':'+n+(mm[3]?'!important':''));}
      if(d.length)out.push(sel(r.selectorText)+'{'+d.join(';')+'}');}}
  var built=false;
  function build(){if(built)return;var out=[];for(var i=0;i<document.styleSheets.length;i++){var ss=document.styleSheets[i];if(ss.ownerNode&&/^dark(Css|Pre|Cache)$/.test(ss.ownerNode.id||''))continue;var rl;try{rl=ss.cssRules;}catch(e){continue;}if(rl)walk(rl,out);}
    var st=document.getElementById('darkCss')||document.createElement('style');st.id='darkCss';
    st.textContent='html.dark .btn.primary,html.dark .btn-primary{filter:brightness(.8) saturate(.9)}html.dark .modal:not(.cf-layer){background:rgba(3,7,10,.78)}html.dark #view .page-head h2,html.dark #view .dtitle h1,html.dark #view .dtitle h2{color:#c6c9cc!important}html.dark,html.dark body{background:#0f171e!important;min-height:100vh}html.dark .tl-bar .tl-okfill{display:none!important}html.dark .tl-row .tl-track .tl-bar .tl-nm{background:none!important;box-shadow:none!important;padding:0!important;margin-left:0!important}html.dark .seg button[aria-pressed="true"],html.dark .due-chips .due-chip[aria-pressed="true"]{background:#33424f!important;color:#fff!important}html.dark .mnav-chip.on{background:#1f5a3d!important;border-color:#2d7a55!important;color:#fff!important}html.dark .upd-bar{background:#1e2a33!important;color:#e2e9ee!important;border-color:#2c3a45!important;box-shadow:0 8px 28px rgba(0,0,0,.55)!important}html.dark .btn.primary,html.dark .btn-primary{color:#1d1a12!important}html.dark .topbar .brand,html.dark .identity .brand{filter:brightness(.78)}html.dark .tl-row .tl-track .cal-chip.p.cut.tl-cut.tl-joined{--from:transparent!important}html.dark{color-scheme:dark}html.dark body{background:#0f171e;color:#e2e9ee}html.dark img:not(.brand):not([src*=".svg"]){filter:none}'+out.join('\n');
    if(!st.parentNode)document.head.appendChild(st);built=true;try{localStorage.setItem('lpm_dark_css',st.textContent);}catch(e){}}   /* a következő betöltéskor azonnal ez kerül be – nincs világos villanás */
  function apply(){var d=on();h.classList.toggle('dark',d);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',d?'#0f171e':'#1d2a38');if(d){if(document.readyState==='complete')build();}}
  if(on()){h.classList.add('dark');var cached='';try{cached=localStorage.getItem('lpm_dark_css')||'';}catch(e){}
    document.write('<style id="darkPre">html.dark,html.dark body{background:#0f171e!important}</style>'+(cached?'<style id="darkCache">'+cached.replace(/<\/style/gi,'')+'</style>':''));}   /* amíg a friss sötét pár elkészül: az előző betöltésből mentett változat azonnal érvényes */
  function ready(){if(on())build();['darkPre','darkCache'].forEach(function(id){var p=document.getElementById(id);if(p&&document.getElementById('darkCss'))p.remove();});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
  window.addEventListener('load',function(){if(on()&&!built)build();ready();});
  if(mq&&mq.addEventListener)mq.addEventListener('change',function(){if(pref()==='auto'){apply();if(on())build();}});
  window.lpmTheme=function(v){if(v){try{localStorage.setItem('lpm_theme',v);}catch(e){}}apply();if(on())build();return pref();};
})();
