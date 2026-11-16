/* A háttér (apps-script/src/*.gs és Templates.gs) szintaktikai ellenőrzése – hibás kód ne jusson el a telepítésig. */
const fs=require('fs'),path=require('path');const dir=path.join(__dirname,'..','apps-script');
const files=fs.readdirSync(path.join(dir,'src')).filter(f=>f.endsWith('.gs')).map(f=>path.join(dir,'src',f)).concat(fs.existsSync(path.join(dir,'Templates.gs'))?[path.join(dir,'Templates.gs')]:[]);
const bad=[];files.forEach(f=>{try{new Function(fs.readFileSync(f,'utf8'));}catch(e){bad.push(path.basename(f)+': '+e.message);}});
if(bad.length){console.error('FAIL szintaxis:\n  '+bad.join('\n  '));process.exit(1);}
console.log('PASS szintaxis: '+files.length+' háttérfájl');
