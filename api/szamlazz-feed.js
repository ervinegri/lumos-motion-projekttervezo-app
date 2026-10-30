'use strict';
// Számlázz.hu 5.0 online pénzügyi adatkapcsolat: kimenő számla fogadó.
const crypto=require('crypto'),MAX_SIZE=1024*1024;
function section(xml,name){const x=new RegExp('<(?:[\\w-]+:)?'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?'+name+'\\s*>','i').exec(xml);return x?x[1]:'';}
function decode(s){return String(s||'').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(m,t)=>{const d={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};if(d[t.toLowerCase()])return d[t.toLowerCase()];const n=t.toLowerCase().startsWith('#x')?parseInt(t.slice(2),16):parseInt(t.slice(1),10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}).trim();}
const value=(xml,name)=>decode(section(xml,name).replace(/<[^>]*>/g,''));
const money=v=>{const n=Number(String(v||'').replace(/\s/g,'').replace(',','.'));return Number.isFinite(n)?n:0;};
function parseInvoice(xml){
 if(typeof xml!=='string'||xml.length>MAX_SIZE||/<!DOCTYPE|<!ENTITY/i.test(xml)||!/<(?:\w+:)?szamla(?:\s[^>]*)?>/i.test(xml))throw Error('Invalid XML');
 const a=section(xml,'alap'),b=section(xml,'vevo'),t=section(xml,'totalossz'),p=section(xml,'kifizetesek');
 const id=value(a,'id'),no=value(a,'szamlaszam');if(!/^\d+$/.test(id)||!/^[\w./-]{2,60}$/.test(no))throw Error('Invalid invoice id');
 const payments=[...p.matchAll(/<(?:[\w-]+:)?kifizetes(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w-]+:)?kifizetes>/gi)].map(m=>({amount:money(value(m[1],'osszeg')),date:value(m[1],'datum')}));
 const lines=[...section(xml,'tetelek').matchAll(/<(?:[\w-]+:)?tetel(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w-]+:)?tetel>/gi)].slice(0,40).map(m=>value(m[1],'nev')).filter(Boolean);
 return {id,no,type:value(a,'tipus'),date:value(a,'kelt'),fulfill:value(a,'telj'),due:value(a,'fizh'),method:value(a,'fizmod'),currency:value(a,'devizanem')||'HUF',order:value(a,'rendelesszam'),note:value(a,'megjegyzes').slice(0,800),
 buyer:value(b,'nev'),buyerTax:value(b,'adoszam'),net:money(value(t,'netto')),gross:money(value(t,'brutto')),paid:payments.reduce((sum,x)=>sum+x.amount,0),
 paidAt:payments.map(x=>x.date).sort().pop()||'',ref:value(a,'hivdijbekszam')||value(a,'hivszamlaszam'),items:lines};
}
async function neon(queries){
 const url=process.env.DATABASE_URL||process.env.POSTGRES_URL,m=/^postgres(?:ql)?:\/\/[^@]+@([^/:?]+)/.exec(url||'');
 if(!m)throw Error('Database environment missing');
 const body=queries.length===1?{query:queries[0].query,params:queries[0].params||[]}:{queries:queries.map(x=>({query:x.query,params:x.params||[]}))};
 const r=await fetch('https://'+m[1]+'/sql',{method:'POST',headers:{'Content-Type':'application/json','Neon-Connection-String':url,'Neon-Raw-Text-Output':'true','Neon-Array-Mode':'true'},body:JSON.stringify(body)});
 if(!r.ok)throw Error('Database HTTP '+r.status);return r.json();
}
const SCHEMA='CREATE TABLE IF NOT EXISTS lpm_szamlazz_feed (id TEXT PRIMARY KEY, invoice_no TEXT NOT NULL, document JSONB NOT NULL, revision BIGINT NOT NULL DEFAULT 1, received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), processed_at TIMESTAMPTZ)';
function matchKey(incoming,expected){const a=Buffer.from(String(incoming||'')),b=Buffer.from(String(expected||''));return !!a.length&&a.length===b.length&&crypto.timingSafeEqual(a,b);}
function response(res,id){res.statusCode=200;res.setHeader('Content-Type','application/xml; charset=utf-8');res.setHeader('Cache-Control','no-store');return res.end('<?xml version="1.0" encoding="UTF-8"?><szamlavalasz xmlns="http://www.szamlazz.hu/szamlavalasz"><alap><id>'+id+'</id></alap></szamlavalasz>');}
module.exports=async(req,res)=>{
 if(req.method!=='POST'){res.statusCode=405;return res.end('POST only');}
 const key=process.env.SZAMLAZZ_FINANCE_FEED_KEY;if(!key){res.statusCode=503;return res.end('Feed pending activation');}
 if(!matchKey(req.headers['x-szamlazzhu-key'],key)){res.statusCode=403;return res.end('Unauthorized');}
 try{
  let xml='';
  if(typeof req.body==='string')xml=req.body;else if(Buffer.isBuffer(req.body))xml=req.body.toString('utf8');
  else if(req.body&&typeof req.body==='object')throw Error('XML expected');
  else xml=await new Promise((resolve,reject)=>{const parts=[];let size=0;req.on('data',c=>{size+=c.length;if(size>MAX_SIZE){reject(Error('Too large'));req.destroy();}else parts.push(c);});req.on('end',()=>resolve(Buffer.concat(parts).toString('utf8')));req.on('error',reject);});
  const invoice=parseInvoice(xml);
  await neon([{query:SCHEMA},{query:'INSERT INTO lpm_szamlazz_feed (id,invoice_no,document) VALUES ($1,$2,$3::jsonb) ON CONFLICT (id) DO UPDATE SET invoice_no=EXCLUDED.invoice_no,document=EXCLUDED.document,revision=lpm_szamlazz_feed.revision+1,received_at=NOW(),processed_at=NULL',params:[invoice.id,invoice.no,JSON.stringify(invoice)]}]);
  return response(res,invoice.id);
 }catch(e){res.statusCode=500;res.setHeader('Content-Type','text/plain; charset=utf-8');return res.end('Processing failed');}
};
module.exports._test={parseInvoice,matchKey};