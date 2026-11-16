/* Projektlista videó-összesítője: lefut-e (pl. egy sorvégi megjegyzés ne nyeljen el definíciót), és jó-e a darabszám / állapotsáv. */
const fs=require('fs'),path=require('path'),assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'..','views-alap.js'),'utf8');const a=src.indexOf('const VST_TONE'),b=src.indexOf('function vidLink(');
const S={_vidOpen:{}},esc=x=>String(x),VID_ST=[['vagasra','Utómunkára vár'],['vagas','Utómunka alatt'],['jovahagyva','Jóváhagyva']];
const f=new Function('S','esc','VID_ST',src.slice(a,b)+';return vidStList;')(S,esc,VID_ST);
const h=f({id:'x',status:'utomunka',videos:[{st:'jovahagyva'},{st:'vagas'},{st:'vagasra'}]});
assert.match(h,/3 videó/);assert.match(h,/1\/3 jóváhagyva/);assert.match(h,/pt-vbar/);
assert.equal(f({id:'y',status:'lemondva',videos:[{st:'vagasra'}]}),'');
assert.doesNotMatch(f({id:'z',status:'tervezes',videos:[{st:'vagasra'}]}),/pt-vbar/);
S._vidOpen.x=true;assert.match(f({id:'x',status:'utomunka',videos:[{st:'jovahagyva',name:'A'},{st:'vagas',name:'B'}]}),/Utómunka alatt/);
console.log('PASS videó-összesítő');
