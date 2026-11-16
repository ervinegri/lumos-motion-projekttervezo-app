/* A felület szkriptjeinek (az index.html és a többi oldal által betöltött *.js) szintaktikai ellenőrzése – egy elgépelt zárójel az egész appot leállítja.
   A Vercel „Ignored Build Step” is futtatja: szintaxishibás felület nem települ, a legutóbbi működő változat marad élesben. */
const fs=require('fs'),path=require('path'),root=path.join(__dirname,'..');
const files=fs.readdirSync(root).filter(f=>f.endsWith('.js')&&!f.endsWith('.min.js'));
const bad=[];files.forEach(f=>{try{new Function(fs.readFileSync(path.join(root,f),'utf8'));}catch(e){bad.push(f+': '+e.message);}});
if(bad.length){console.error('FAIL felületi szintaxis:\n  '+bad.join('\n  '));process.exit(1);}
console.log('PASS felületi szintaxis: '+files.length+' szkript');
