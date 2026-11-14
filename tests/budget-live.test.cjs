'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const project=fs.readFileSync(path.resolve(__dirname,'../actions-projekt.js'),'utf8');
const view=fs.readFileSync(path.resolve(__dirname,'../views-penzugy-vagas.js'),'utf8');
const num=x=>Number(x)||0;
const moneyFmt=x=>Math.round(x).toLocaleString('hu-HU');
const sum=p=>(p.fees||[]).reduce((a,x)=>a+num(x.amount),0);
const a=view.indexOf('const budgetRemainingFmt='),b=view.indexOf('function totalCell(p)',a);
assert(a>=0&&b>a,'budget row formatter available');
const rowFn=new Function('budgetFt','feeSum','prodBase','pctFmt','isAdmin','num','moneyFmt',
  view.slice(a,b)+'\nreturn keretRows;')(
  p=>p.budgetVal,sum,()=>29000,x=>x.toFixed(1)+'%',()=>true,num,moneyFmt);
const from=project.indexOf('function refreshFinSums(p)'),to=project.indexOf('/* Csapat véglegesítése',from);
assert(from>=0&&to>from,'live budget updater available');
const budgetPct={value:''},budgetFt={value:'10 000'};
const topBudget={textContent:''},topSpent={textContent:''};
const topLeft={textContent:'',classList:{toggle(key,val){this[key]=val}}};
const rem={querySelector:key=>key==='b'?topLeft:null};
const top={
  querySelector:key=>key==='div:first-child b'?topBudget:key==='div:nth-child(2) b'?topSpent:key==='.kt-left'?rem:null,
  classList:{toggle(key,val){this[key]=val}}
};
const blocks=Array.from({length:4},()=>({className:'',innerHTML:''}));
const amount={innerHTML:''},rent={textContent:''},aside={innerHTML:''};
const document={
  activeElement:budgetFt,
  querySelectorAll:q=>q==='.fin .keret-tr'?blocks:[],
  querySelector:q=>q==='.keret-top'?top:q==='.fin-amt'?amount:q==='.fin-rent'?rent:q==='.fin-aside'?aside:null,
  createElement(){return {
    rows:[],set innerHTML(html){this.rows=Array.from(html.matchAll(/<tr class="([^"]+)">([\s\S]*?)<\/tr>/g),m=>({className:m[1],innerHTML:m[2]}))},
    querySelectorAll(){return this.rows;}
  };}
};
const refresh=new Function('document','$','num','prodBase','salesBase','projDeal','salesCommEst','moneyFmt',
  'daySumOf','otherSumOf','fieldSumOf','postSumOf','keretRows','totalCell','rentOf','rentalSum','finAside','budgetFt','feeSum','budgetRemainingFmt',
  project.slice(from,to)+'\nreturn refreshFinSums;')(
  document,id=>id==='f-budgetPct'?budgetPct:id==='f-budgetFt'?budgetFt:null,
  num,()=>29000,()=>29000,()=>null,()=>null,moneyFmt,
  ()=>0,()=>0,()=>0,()=>0,rowFn,p=>moneyFmt(sum(p)),()=>0,()=>0,()=>'',p=>p.budgetVal,sum,
  left=>(left<0?'−':'')+moneyFmt(Math.abs(left)));
const p={budgetMode:'ft',budgetVal:10000,fees:[{amount:12000}]};
refresh(p);
assert.equal(blocks.length,4,'multi-day table has two pairs of summaries');
assert(blocks.every((x,i)=>x.className.includes('keret-tr')),'every summary row updates');
assert.match(blocks[0].innerHTML,/−2/,'negative remainder appears immediately');
assert.match(blocks[2].innerHTML,/−2/,'second workday gets same negative remainder');
assert.match(topLeft.textContent,/−2/,'team lead summary updates instantly');
p.fees[0].amount=16000;
refresh(p);
assert.match(blocks[0].innerHTML,/−6/,'editing the fee changes the budget remainder');
assert.match(blocks[2].innerHTML,/−6/,'multi-day totals update together');
assert.match(topLeft.textContent,/−6/,'team lead remainder updates with every change');
assert.match(amount.innerHTML,/16/,'fee total updates without a page redraw');
assert.equal(document.activeElement,budgetFt,'field focus stays unchanged during updates');
console.log('PASS immediate negative budget remainders, multi-day totals and input focus');
