'use strict';
/* Számlázz.hu CSV/TSV export importálása a már meglévő szLink RPC-n keresztül.
   A CSV-t helyben olvassuk: a szervernek csak a kiválasztott projektazonosító,
   a bizonylatszám és a típus megy át. Az összegeket a Számlázz.hu hitelesíti. */
const SZIMP_LIMIT = 250;
const SZIMP = {rows:[],name:'',busy:false};
const szImpNorm = v => String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const szImpTax = v => String(v||'').replace(/\D/g,'').slice(0,8);
const SZIMP_COLUMNS = {
  no:['szamlaszam','bizonylatszam','szamlasorszam','bizonylatsorszam','sorszam','bizonylatszamazonosito'],
  buyer:['vevoneve','vevo','partnerneve','partner','vevocegneve','vevomegnevezese'],
  tax:['vevoadoszama','vevoadoszam','partneradoszama','partneradoszam'],
  type:['bizonylattipus','szamlatipus','tipus','bizonylatfajta'],
  date:['szamlakelte','bizonylatkelte','kiallitasdatuma','kiallitasdatum','kelt','datum']
};
function szImpCsv(text,sep){
  const rows=[];let row=[],field='',quoted=false;
  text=String(text||'').replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
    else if(c===sep&&!quoted){row.push(field.trim());field='';}
    else if((c==='\n'||c==='\r')&&!quoted){
      if(c==='\r'&&text[i+1]==='\n')i++;
      row.push(field.trim());if(row.some(Boolean))rows.push(row);
      if(rows.length>12000)throw new Error('Túl sok sor: válassz rövidebb exportidőszakot.');
      row=[];field='';
    }else field+=c;
  }
  if(quoted)throw new Error('A CSV idézőjelezése hiányos.');
  row.push(field.trim());if(row.some(Boolean))rows.push(row);
  return rows;
}
function szImpHead(rows){
  let best=null;
  for(let i=0;i<Math.min(25,rows.length);i++){
    const h=rows[i].map(szImpNorm),columns={};
    for(const k of Object.keys(SZIMP_COLUMNS)){
      const idx=h.findIndex(v=>SZIMP_COLUMNS[k].includes(v));
      if(idx>=0)columns[k]=idx;
    }
    const score=(columns.no!==undefined?5:0)+(columns.buyer!==undefined?3:0)+(columns.tax!==undefined?1:0)+(columns.type!==undefined?1:0);
    if(columns.no!==undefined&&columns.buyer!==undefined&&(!best||score>best.score))best={i,columns,score};
  }
  return best;
}
function szImpKind(v){
  const t=szImpNorm(v);
  if(t.includes('dijbekero'))return 'dijbekero';
  if(t.includes('vegszamla'))return 'vegszamla';
  if(t.includes('eloleg'))return 'eloleg';
  return 'szamla';
}
function szImpProjList(){
  return (S.projects||[]).filter(p=>p&&p.id&&p.status!=='lemondva').slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
}
function szImpMatchedProject(buyer,tax){
  if(!buyer&&!tax)return '';
  const projects=szImpProjList(),clients=S.clients||[];
  const matches=projects.filter(p=>{
    const c=clients.find(c=>c.name===p.client);
    const pt=szImpTax(p.clientTax||(c&&c.tax));
    if(tax&&pt)return pt===tax;
    return !!buyer&&szImpNorm(p.client)===szImpNorm(buyer);
  });
  return matches.length===1?matches[0].id:'';
}
function szImpDecode(buffer){
  const utf=new TextDecoder('utf-8').decode(buffer);
  const bad=(utf.match(/\uFFFD/g)||[]).length;
  if(bad>=2){try{const alt=new TextDecoder('windows-1250').decode(buffer);if(!(alt.match(/\uFFFD/g)||[]).length)return alt;}catch(e){}}
  return utf;
}
function szImpRows(text){
  let parsed=null,head=null;
  for(const sep of [';','\t',',']){
    const r=szImpCsv(text,sep),h=szImpHead(r);
    if(h&&(!head||h.score>head.score)){parsed=r;head=h;}
  }
  if(!head)throw new Error('Számlaszám és vevő neve oszlopot tartalmazó Számlázz.hu CSV-export szükséges.');
  const col=head.columns,get=(r,k)=>col[k]===undefined?'':String(r[col[k]]||'').trim();
  const existing=new Set(((S.fin&&S.fin.invoices)||[]).map(x=>String(x.no||'').toUpperCase()));
  const seen=new Set(),out=[];
  let dup=0,unsupported=0;
  for(const r of parsed.slice(head.i+1)){
    const no=get(r,'no');
    if(!no||!/^[A-Za-z0-9/_\-.]{3,60}$/.test(no))continue;
    const key=no.toUpperCase();
    if(seen.has(key)){dup++;continue;}seen.add(key);
    const buyer=get(r,'buyer'),type=get(r,'type');
    if(/storno|sztorno|helyesbit|ervenytelen/i.test(szImpNorm(type))){unsupported++;continue;}
    const tax=szImpTax(get(r,'tax')),linked=existing.has(key);
    out.push({no,buyer,tax,date:get(r,'date'),kind:szImpKind(type),projectId:linked?'':szImpMatchedProject(buyer,tax),linked,result:''});
    if(out.length>SZIMP_LIMIT)throw new Error('Legfeljebb '+SZIMP_LIMIT+' különböző bizonylat importálható egyszerre. Exportálj rövidebb időszakot.');
  }
  if(!out.length)throw new Error('A fájlban feldolgozható bizonylat található helyett ellenőrizd az export oszlopait és időszakát.');
  return {rows:out,duplicates:dup,unsupported};
}
function szImpFileInput(){
  return '<div class="field full"><label for="sz-imp-file">Számlázz.hu – Listák / Forgalom lekérdezés / CSV</label>'+
    '<input class="inp" id="sz-imp-file" type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values">'+
    '<small class="hint">A fájl tartalma helyben kerül feldolgozásra. A számlák adatai a Számlázz.hu-ból érkeznek, számlaszám alapján.</small></div>';
}
function szImportOpen(){
  if(!billOn())return;
  if(!(S.fin&&S.fin.sz&&S.fin.sz.hasKey)){
    szSettingsModal('A korábban kiállított számlák lekéréséhez állítsd be a Számlázz.hu Agent-kulcsot.');
    return;
  }
  if(SZIMP.busy){toast('A számlák importálása folyamatban van.');return;}
  if(SZIMP.rows.length){szImportPreview();return;}
  openModal('Korábbi számlák importálása',szImpFileInput()+
    '<p class="hint">A Számla Agent számlaszám alapján kérdez le bizonylatokat. A korábbi számlák listáját a Számlázz.hu CSV-exportjából töltheted be.</p>');
}
function szImportPreview(){
  const projects=szImpProjList(),ready=SZIMP.rows.filter(x=>x.projectId&&!x.linked).length;
  const skipped=SZIMP.rows.filter(x=>x.linked).length,manual=SZIMP.rows.length-ready-skipped;
  const opts='<option value="">— Kihagyás / kézi párosítás később —</option>'+
    projects.map(p=>'<option value="'+esc(p.id)+'">'+esc((p.date||'')+' · '+p.name+' · '+(p.client||''))+'</option>').join('');
  const kinds=[['szamla','Számla'],['dijbekero','Díjbekérő'],['eloleg','Előlegszámla'],['vegszamla','Végszámla']];
  const rows=SZIMP.rows.map((x,i)=>{
    const status=x.linked?'Már rögzítve':x.projectId?'Párosítva':'Projekt kiválasztása szükséges';
    const choices=opts.replace('<option value="'+esc(x.projectId)+'">','<option selected value="'+esc(x.projectId)+'">');
    const kindOpts=kinds.map(([k,label])=>'<option value="'+k+'"'+(x.kind===k?' selected':'')+'>'+label+'</option>').join('');
    return '<tr><td><b>'+esc(x.no)+'</b><div class="bl-meta">'+esc(x.buyer||'Vevő nélkül')+'</div></td>'+
      '<td>'+esc(x.date||'—')+'</td>'+
      '<td><select class="inp" data-szimp-kind="'+i+'"'+(x.linked?' disabled':'')+'>'+kindOpts+'</select></td>'+
      '<td><select class="inp" data-szimp-project="'+i+'"'+(x.linked?' disabled':'')+'>'+choices+'</select>'+
      '<div class="bl-meta">'+status+'</div></td></tr>';
  }).join('');
  openModal('Korábbi számlák importálása',
    '<p class="hint">Fájl: <b>'+esc(SZIMP.name)+'</b> · '+SZIMP.rows.length+' különböző bizonylat</p>'+
    '<p><b id="sz-imp-count">'+ready+'</b> importálható · '+manual+' párosításra vár · '+skipped+' korábban hozzárendelve</p>'+
    '<div class="szimp-scroll"><table class="sheet szimp-table"><thead><tr><th>Bizonylat / vevő</th><th>Kelt</th><th>Típus</th><th>Projekt</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<p class="hint">A felajánlott projektpárosítás a vevő adószáma vagy pontos neve alapján történik, kizárólag egyértelmű találatnál. Ellenőrizd a hozzárendeléseket. A kimaradó számlák később is importálhatók.</p>'+
    '<div class="btns"><button class="btn outline" type="button" data-action="sz-imp-reset">Másik CSV kiválasztása</button>'+
    '<button class="btn primary" type="button" data-action="sz-imp-run">Kiválasztott számlák importálása</button></div>');
}
async function szImportRead(file){
  if(!file)return;
  if(file.size>3*1024*1024){toast('A CSV legfeljebb 3 MB lehet. Exportálj rövidebb időszakot.',true);return;}
  try{
    const buffer=await file.arrayBuffer(),data=szImpRows(szImpDecode(buffer));
    SZIMP.rows=data.rows;SZIMP.name=file.name;
    szImportPreview();
    if(data.duplicates||data.unsupported)toast((data.duplicates?'Többször szereplő sorok: '+data.duplicates+'. ':'')+(data.unsupported?'Sztornó/helyesbítő bizonylatok kihagyva: '+data.unsupported+'.':''));
  }catch(e){toast(errText(e),true);}
}
async function szImportRun(){
  if(SZIMP.busy)return;
  const chosen=SZIMP.rows.filter(x=>x.projectId&&!x.linked&&!x.result);
  if(!chosen.length){toast('Válassz ki legalább egy projekthez tartozó bizonylatot.',true);return;}
  SZIMP.busy=true;
  openModal('Számlák importálása', '<p id="sz-imp-progress" role="status">Lekérdezés indítása…</p><p class="hint">Az összegek és fizetési adatok a Számlázz.hu rendszeréből származnak.</p>');
  let ok=0,bad=0,last=null,completed=0;
  for(const row of chosen){
    const p=$('sz-imp-progress');if(p)p.textContent='Feldolgozás: '+(completed+1)+' / '+chosen.length+' – '+row.no;
    try{
      last=await call('szLink',{projectId:row.projectId,no:row.no,kind:row.kind});
      row.result='ok';row.linked=true;ok++;
    }catch(e){row.result=errText(e);bad++;}
    completed++;
  }
  SZIMP.busy=false;
  if(last)finApply(last);
  const errors=SZIMP.rows.filter(x=>x.result&&x.result!=='ok');
  openModal('Számlák importálása kész',
    '<p><b>'+ok+' sikeresen hozzárendelt számla</b> · '+bad+' sikertelen · '+SZIMP.rows.filter(x=>!x.linked&&!x.result).length+' kihagyott</p>'+
    (errors.length?'<div class="szimp-scroll"><ul>'+errors.map(x=>'<li><b>'+esc(x.no)+'</b>: '+esc(x.result)+'</li>').join('')+'</ul></div>':'')+
    '<div class="btns"><button type="button" class="btn outline" data-action="sz-imp-reset">Új CSV importálása</button>'+
    '<button type="button" class="btn primary" data-action="sz-imp-done">Befejezés</button></div>');
}
Object.assign(ACT,{
  'sz-imp-open':()=>szImportOpen(),
  'sz-imp-reset':()=>{SZIMP.rows=[];SZIMP.name='';szImportOpen();},
  'sz-imp-run':()=>szImportRun(),
  'sz-imp-done':()=>{SZIMP.rows=[];SZIMP.name='';closeModal();render(true);}
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.id==='sz-imp-file'){szImportRead(t.files&&t.files[0]);return;}
  if(t.dataset.szimpProject!==undefined){
    const r=SZIMP.rows[Number(t.dataset.szimpProject)];
    if(r&&!r.linked){r.projectId=t.value;const cnt=$('sz-imp-count');if(cnt)cnt.textContent=SZIMP.rows.filter(x=>x.projectId&&!x.linked).length;}
  }
  if(t.dataset.szimpKind!==undefined){const r=SZIMP.rows[Number(t.dataset.szimpKind)];if(r&&!r.linked)r.kind=t.value;}
});