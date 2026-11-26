/* ===== Beszélgetésrögzítés az Értékesítésben (2026-11-26) =====
   A lehetőség kártyáján: személyes megbeszélés / kihangosított telefonhívás (mikrofon) vagy online megbeszélés (mikrofon + a megosztott fül hangja).
   A hangfelvétel a Drive „Lumos – beszélgetések” mappájába kerül (darabolt, folytatható feltöltés). Ha az ügyvezető megadta a Google Gemini
   API-kulcsot, a felvételből szó szerinti átirat (beszélőkkel, időbélyeggel) és összefoglaló készül, lépésenként (minden lépés külön kérés,
   így hosszú felvételnél sem fut ki az Apps Script időkorlátja). Az adatok a lehetőséghez kötve: qPut_('REC_' + dealId).
   Hozzájárulás nélkül nem indulhat felvétel (GDPR) – a tény a lehetőség jegyzetébe is bekerül. */
const REC_MAX = 120 * 1024 * 1024, REC_CHUNK = 8 * 1024 * 1024, REC_SEG = 8 * 60, GEMINI_PROP = 'GEMINI_API_KEY', GEMINI_MODEL_PROP = 'GEMINI_MODEL';
const REC_KIND = { mic: 'Személyes megbeszélés', phone: 'Telefonhívás (kihangosítva)', online: 'Online megbeszélés' };
function recFolder_() {
  const P = PropertiesService.getScriptProperties(); let f = null; try { const id = P.getProperty('REC_FOLDER'); f = id ? DriveApp.getFolderById(id) : null; } catch (e) { f = null; }
  if (!f) { f = DriveApp.createFolder('Lumos – beszélgetések'); P.setProperty('REC_FOLDER', f.getId()); }
  return f;
}
function recDeal_(u, dealId) { const d = readAll_('deals').find(x => x.id === dealId); if (!d) throw new Error('A lehetőség nem található.'); dealCan_(u, d); return d; }
function recList_(u, a) { const did = str_(a && a.dealId, 64), d = recDeal_(u, did), o = qGet_('REC_' + did) || {}, out = { list: (o.list || []).map(recPub_), ai: !!geminiKey_() };
  try {   // a felvétel bejegyzése alá ragadt régi jegyzet szétválasztása (a felület a javított jegyzetet kapja vissza, hogy mentéskor ne írja vissza a régit)
    if (noteHeadFix_(d && d.note, 'x') !== String(d && d.note || '')) withLock_(() => { const sh = sheetFor_('deals'), row = findRow_(sh, did); if (!row) return; const x = readRow_('deals', sh, row), f = noteHeadFix_(x.note, dealNoteFb_(x));
      if (f !== String(x.note || '')) { x.note = f; putRow_('deals', sh, x, row); dataBump_(); dbFlush_(); } out.note = f; });
  } catch (e) { Logger.log('recList noteFix: ' + e); }
  return out; }
function recPub_(r) { return { id: r.id, at: r.at, by: r.by, kind: r.kind, kindTxt: REC_KIND[r.kind] || '', dur: r.dur || 0, size: r.size || 0, url: r.fileId ? 'https://drive.google.com/file/d/' + r.fileId + '/view' : '',
  st: r.st || 'felvéve', seg: r.seg || 0, segs: r.segs || 0, summary: r.summary || '', needs: r.needs || '', next: r.next || '', nextDate: r.nextDate || '', err: r.err || '', retryAt: r.retryAt || '',
  trUrl: r.trId ? 'https://drive.google.com/file/d/' + r.trId + '/view' : '' }; }
function recEdit_(did, rid, fn) { let out = null; withLock_(() => { const o = qGet_('REC_' + did) || { list: [] }, r = (o.list || []).find(x => x.id === rid); if (!r) throw new Error('A felvétel nem található.'); fn(r, o); qPut_('REC_' + did, o); out = r; }); return out; }
function recNote_(u, did, txt) {   // a lehetőség jegyzetének elejére (mint az ajánlatküldésnél)
  withLock_(() => { const sh = sheetFor_('deals'), row = findRow_(sh, did); if (!row) return; const x = readRow_('deals', sh, row);
    const line = '[' + Utilities.formatDate(new Date(), SHEET_TZ, 'yyyy-MM-dd HH:mm') + ' · ' + (u.name || '') + '] ' + txt;
    dealNotePrepend_(x, line); x.updatedAt = now_(); x.updatedBy = u.name; putRow_('deals', sh, x, row); dbFlush_(); });
}
const recDurTxt_ = s => { s = Math.round(Number(s) || 0); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return (h ? h + ':' + ('0' + m).slice(-2) : m) + ':' + ('0' + ss).slice(-2); };

/** Feltöltés indítása: a: {dealId, size, mime, kind, dur, consent} */
function recUpStart_(u, a) {
  a = a || {}; const did = str_(a.dealId, 64), d = recDeal_(u, did);
  if (a.consent !== true) throw new Error('A rögzítéshez a beszélgetőpartner hozzájárulása szükséges.');
  const size = Math.round(Number(a.size) || 0); if (!(size > 0)) throw new Error('Üres felvétel.'); if (size > REC_MAX) throw new Error('A felvétel túl nagy (legfeljebb 120 MB).');
  const mime = /^audio\/[\w.+-]+(;[\w=.,+ -]*)?$/.test(String(a.mime || '')) ? String(a.mime).split(';')[0] : 'audio/webm', kind = REC_KIND[a.kind] ? a.kind : 'mic';
  const ext = /mp4|m4a|aac/.test(mime) ? 'm4a' : /ogg/.test(mime) ? 'ogg' : 'webm';
  const fname = Utilities.formatDate(new Date(), SHEET_TZ, 'yyyy-MM-dd HH.mm') + ' – ' + String(d.title || 'Lehetőség').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').slice(0, 90) + ' – ' + (REC_KIND[kind] || '') + '.' + ext;
  const res = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', { method: 'post', contentType: 'application/json; charset=UTF-8', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Upload-Content-Type': mime, 'X-Upload-Content-Length': String(size) },
    payload: JSON.stringify({ name: fname, parents: [recFolder_().getId()], mimeType: mime, description: u.name + ' rögzítette · ' + (d.title || '') + ' · a partner hozzájárult' }) });
  const loc = res.getHeaders()['Location'] || res.getHeaders()['location']; if (res.getResponseCode() >= 300 || !loc) throw new Error('A feltöltés most nem indítható (' + res.getResponseCode() + '). Próbáld újra – a felvétel addig megmarad.');
  const id = Utilities.getUuid(); CacheService.getScriptCache().put('rec_' + id, JSON.stringify({ loc: loc, did: did, size: size, uid: u.id, mime: mime, kind: kind, dur: Math.round(Number(a.dur) || 0), name: fname }), 21600);
  return { upId: id, chunk: REC_CHUNK };
}
/** Darab feltöltése: a: {upId, offset, b64}. Az utolsó darab után a felvétel bekerül a lehetőséghez. */
function recUpChunk_(u, a) {
  a = a || {}; const C = CacheService.getScriptCache(), upId = str_(a.upId, 64), raw = C.get('rec_' + upId); if (!raw) throw new Error('A feltöltés lejárt – kezdd újra (a felvétel a böngészőben megmaradt).');
  const r = JSON.parse(raw); if (r.uid !== u.id) throw new Error('Hibás feltöltés.');
  const bytes = Utilities.base64Decode(String(a.b64 || '')), off = Math.round(Number(a.offset) || 0), end = off + bytes.length - 1;
  if (!bytes.length || end >= r.size || (bytes.length !== REC_CHUNK && end !== r.size - 1)) throw new Error('Hibás feltöltési darab.');
  const res = UrlFetchApp.fetch(r.loc, { method: 'put', contentType: 'application/octet-stream', payload: bytes, muteHttpExceptions: true, headers: { 'Content-Range': 'bytes ' + off + '-' + end + '/' + r.size } });
  const code = res.getResponseCode();
  if (code === 308) { const rg = String(res.getHeaders()['Range'] || res.getHeaders()['range'] || ''), m = /-(\d+)$/.exec(rg); return { next: m ? Number(m[1]) + 1 : end + 1 }; }
  if (code !== 200 && code !== 201) throw new Error('A feltöltés megszakadt (' + code + ') – próbáld újra.');
  const f = JSON.parse(res.getContentText() || '{}'); C.remove('rec_' + upId);
  const rec = { id: Utilities.getUuid(), at: now_(), by: u.name, uid: u.id, kind: r.kind, dur: r.dur, size: r.size, mime: r.mime, fileId: f.id, st: 'felvéve', consent: true };
  withLock_(() => { const o = qGet_('REC_' + r.did) || { list: [] }; o.list = [rec].concat(o.list || []).slice(0, 200); qPut_('REC_' + r.did, o); });
  try { recNote_(u, r.did, '🎙️ ' + (REC_KIND[r.kind] || 'Beszélgetés') + ' rögzítve (' + recDurTxt_(r.dur) + ') – a beszélgetőpartner hozzájárult a rögzítéshez.'); } catch (e) { Logger.log('recNote: ' + e); }
  logEvent_(u, 'Beszélgetés rögzítve', r.name, recDurTxt_(r.dur));
  let deals = null; try { deals = dealsFor_(u); } catch (e) {}
  return { done: true, rec: recPub_(rec), ai: !!geminiKey_(), deals: deals };
}
/** Felvétel törlése (GDPR): a hangfájl és az átirat a Drive kukájába kerül. */
function recDel_(u, a) {
  const did = str_(a && a.dealId, 64), rid = str_(a && a.id, 64); recDeal_(u, did);
  withLock_(() => { const o = qGet_('REC_' + did) || { list: [] }, r = (o.list || []).find(x => x.id === rid); if (!r) return; if (u.role !== 'admin' && r.uid !== u.id) throw new Error('FORBIDDEN: csak a saját felvételedet törölheted.');
    [r.fileId, r.trId].forEach(id => { if (id) try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }); o.list = o.list.filter(x => x.id !== rid); qPut_('REC_' + did, o); });
  logEvent_(u, 'Beszélgetés-felvétel törölve', did, ''); return recList_(u, { dealId: did });
}

/* ---- Gemini: átirat + összefoglaló ---- */
function geminiKey_() { return PropertiesService.getScriptProperties().getProperty(GEMINI_PROP) || ''; }
function geminiStatus_() { const k = geminiKey_(); return { on: !!k, tail: k ? k.slice(-4) : '', model: k ? (PropertiesService.getScriptProperties().getProperty(GEMINI_MODEL_PROP) || '') : '' }; }
/** A legújabb stabil „gemini-X.Y-flash” modell, amit a kulcs használhat (a Google időnként kivezeti a régieket → nem égetjük be). */
function geminiPickModel_(k, avoid) {
  let tok = '', all = [];
  for (let i = 0; i < 10; i++) {
    const r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000' + (tok ? '&pageToken=' + encodeURIComponent(tok) : ''), { muteHttpExceptions: true, headers: { 'x-goog-api-key': k } });
    if (r.getResponseCode() !== 200) throw new Error('A kulcs nem működik (' + r.getResponseCode() + '): ' + r.getContentText().slice(0, 200));
    const j = JSON.parse(r.getContentText()); all = all.concat(j.models || []); tok = j.nextPageToken || ''; if (!tok) break;
  }
  const ok = all.filter(m => (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0).map(m => String(m.name || '').replace(/^models\//, ''))
    .filter(n => avoid.indexOf(n) < 0);
  const ver = n => { const m = n.match(/^gemini-(\d+)(?:\.(\d+))?-flash$/); return m ? Number(m[1]) * 100 + Number(m[2] || 0) : -1; };
  let best = ok.filter(n => ver(n) >= 0).sort((a, b) => ver(b) - ver(a))[0];
  if (!best) best = ok.filter(n => /^gemini-[\d.]+-flash(-latest)?$/.test(n) || n === 'gemini-flash-latest')[0];
  if (!best) best = ok.filter(n => /^gemini-[\d.]+-flash/.test(n) && !/lite|image|tts|live|audio|embed/.test(n)).sort().reverse()[0];
  if (!best) throw new Error('A kulccsal nem érhető el Gemini Flash modell.');
  return best;
}
/** Tartalék-sorrend túlterheléshez: a kulccsal elérhető Flash modellek (stabil, újabb elöl → „latest” → előzetes → lite); 6 órára megjegyezve. */
function geminiCandidates_() {
  const C = CacheService.getScriptCache(); try { const c = C.get('gem_cands'); if (c) return JSON.parse(c); } catch (e) { }
  const k = geminiKey_(); let tok = '', all = [];
  for (let i = 0; i < 10; i++) { const r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000' + (tok ? '&pageToken=' + encodeURIComponent(tok) : ''), { muteHttpExceptions: true, headers: { 'x-goog-api-key': k } });
    if (r.getResponseCode() !== 200) return []; const j = JSON.parse(r.getContentText()); all = all.concat(j.models || []); tok = j.nextPageToken || ''; if (!tok) break; }
  const ok = all.filter(m => (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0).map(m => String(m.name || '').replace(/^models\//, ''))
    .filter(n => /^gemini-/.test(n) && /flash/.test(n) && !/image|tts|live|audio|embed|thinking|exp/.test(n));
  const ver = n => { const m = n.match(/^gemini-(\d+)(?:\.(\d+))?/); return m ? Number(m[1]) * 100 + Number(m[2] || 0) : 0; };
  const rank = n => (/lite/.test(n) ? 3 : /preview/.test(n) ? 2 : /latest/.test(n) ? 1 : 0);
  const out = ok.sort((a, b) => rank(a) - rank(b) || ver(b) - ver(a) || a.localeCompare(b));
  try { C.put('gem_cands', JSON.stringify(out), 6 * 3600); } catch (e) { } return out;
}
function geminiModel_(force, avoid) {
  const P = PropertiesService.getScriptProperties(); let m = force ? '' : P.getProperty(GEMINI_MODEL_PROP);
  if (!m) { m = geminiPickModel_(geminiKey_(), avoid || []); P.setProperty(GEMINI_MODEL_PROP, m); }
  return m;
}
function geminiSet_(u, a) {
  a = a || {}; const P = PropertiesService.getScriptProperties();
  if (a.clear) { P.deleteProperty(GEMINI_PROP); P.deleteProperty(GEMINI_MODEL_PROP); logEvent_(u, 'Beszélgetés-átirat (Gemini)', '', 'kikapcsolva'); return geminiStatus_(); }
  const k = String(a.key || '').trim(); if (!/^[\w.\-]{20,300}$/.test(k)) throw new Error('Ez nem tűnik Gemini API-kulcsnak (a Google AI Studióban létrehozott kulcsot másold be, szóköz nélkül).');   // a régi „AIza…” és az új „AQ.…” formátum is
  const m = geminiPickModel_(k, []);
  const t = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent', { method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: { 'x-goog-api-key': k }, payload: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Válaszolj egy szóval: ok' }] }], generationConfig: { maxOutputTokens: 20 } }) });
  if (t.getResponseCode() !== 200) throw new Error('A kulcs nem működik (' + t.getResponseCode() + '): ' + t.getContentText().slice(0, 200));
  P.setProperty(GEMINI_PROP, k); P.setProperty(GEMINI_MODEL_PROP, m); logEvent_(u, 'Beszélgetés-átirat (Gemini)', '', 'kulcs mentve'); return geminiStatus_();
}
function gemFetch_(url, opt) {
  const k = geminiKey_(); if (!k) throw new Error('Az átirathoz az ügyvezetőnek meg kell adnia a Gemini API-kulcsot (Beállítások).');
  const o = Object.assign({ muteHttpExceptions: true }, opt || {}); o.headers = Object.assign({}, o.headers || {}, { 'x-goog-api-key': k });   // a kulcs fejlécben (nem az URL-ben)
  const r = UrlFetchApp.fetch(url, o);
  const c = r.getResponseCode(); if (c < 300) return r;
  let msg = ''; try { msg = String((JSON.parse(r.getContentText()).error || {}).message || ''); } catch (e) {} if (!msg) msg = r.getContentText().slice(0, 300);
  const nice = c === 503 ? 'A Google Gemini most túlterhelt (ez átmeneti) – pár perc múlva próbáld újra.' : c === 429 ? 'Elértük a Gemini percenkénti / napi keretét – kicsit később próbáld újra.' : c >= 500 ? 'A Google Gemini szervere most hibát adott (átmeneti) – próbáld újra később.' : '';
  try { const C = CacheService.getScriptCache(), L = JSON.parse(C.get('gem_errs') || '[]'); L.unshift(now_() + ' ' + c + ' ' + String(url).replace(/^https:\/\/generativelanguage\.googleapis\.com\//, '').replace(/[?].*$/, '').slice(0, 90) + ' – ' + msg.slice(0, 160)); C.put('gem_errs', JSON.stringify(L.slice(0, 12)), 21600); } catch (x) { }   // hibakereséshez (kulcs nélkül): /api/dbstatus
  const err = new Error('Gemini hiba (' + c + '): ' + (nice || msg.slice(0, 300))); err.gCode = c; err.gMsg = msg; throw err;
}
function gemJson_(parts, schema, maxTok) {
  const body = { contents: [{ role: 'user', parts: parts }], generationConfig: { temperature: 0.2, maxOutputTokens: maxTok || 16000, responseMimeType: 'application/json', responseSchema: schema } };
  const call = m => gemFetch_('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent', { method: 'post', contentType: 'application/json', payload: JSON.stringify(body) });
  let m = geminiModel_(), r; try { const ok = CacheService.getScriptCache().get('gem_ok'); if (ok) m = ok; } catch (e) { }   // ami legutóbb túlterheléskor is válaszolt
  const tryCall = mm => { const wait = [0, 3000, 8000];   // átmeneti hiba (túlterhelés, keret, szerverhiba) → rövid várakozás és újrapróbálás
    for (let i = 0; ; i++) { try { return call(mm); } catch (e) { if (!(e.gCode === 429 || e.gCode >= 500) || i >= wait.length - 1) throw e; Utilities.sleep(wait[i + 1]); } } };
  try { r = tryCall(m); } catch (e) {
    if ((e.gCode === 404 || e.gCode === 400) && /model/i.test(e.gMsg || '')) {   // kivezetett / nem elérhető modell → új választás (tartósan)
      const hint = (String(e.gMsg).match(/models\/(gemini-[\w.\-]+)/g) || []).map(x => x.replace('models/', '')).filter(x => x !== m)[0];
      m = hint || geminiModel_(true, [m]); PropertiesService.getScriptProperties().setProperty(GEMINI_MODEL_PROP, m); r = tryCall(m);
    } else if (e.gCode === 503 || e.gCode === 500 || e.gCode === 429) {   // a választott modell túlterhelt → sorban a többi elérhető Flash modell (amelyik válaszol, azt használjuk 3 óráig)
      const C = CacheService.getScriptCache(), tried = [m]; let last = e;
      for (const alt of geminiCandidates_().filter(x => tried.indexOf(x) < 0).slice(0, 5)) {
        tried.push(alt); try { r = call(alt); C.put('gem_ok', alt, 3 * 3600); break; } catch (e2) { last = e2; if (!(e2.gCode === 429 || e2.gCode >= 500 || e2.gCode === 404)) break; }
      }
      if (!r) { const err = new Error(String(last.message || last) + ' (kipróbált modellek: ' + tried.join(', ') + ')'); err.gCode = last.gCode; err.gMsg = last.gMsg; throw err; }
    } else throw e;
  }
  const j = JSON.parse(r.getContentText()), t = (((j.candidates || [])[0] || {}).content || {}).parts || [];
  const txt = t.map(x => x.text || '').join(''); try { return JSON.parse(txt); } catch (e) { throw new Error('A Gemini válasza nem értelmezhető – próbáld újra.'); }
}
/** Lépésenkénti feldolgozás (a kliens hívja egymás után): a: {dealId, id}. Lépések: feltöltés a Geminibe → szakaszonkénti átirat → összefoglaló. */
function recProcess_(u, a) {
  const did = str_(a && a.dealId, 64), rid = str_(a && a.id, 64), d = recDeal_(u, did);
  const o0 = qGet_('REC_' + did) || {}, r0 = (o0.list || []).find(x => x.id === rid); if (!r0) throw new Error('A felvétel nem található.');
  if (r0.st === 'várakozik' || r0.retryAt) recRetryDrop_(did, rid);   // kézzel folytatva / az időzítő hívta: nem fut kétszer
  if (r0.st === 'kész') return { rec: recPub_(r0), more: false };   // már elkészült (pl. közben kézzel folytatták) – nem készül új összefoglaló
  try {
    if (!r0.gUri) {   // 1) a hangfájl a Gemini Files API-ba
      const blob = DriveApp.getFileById(r0.fileId).getBlob(), bytes = blob.getBytes(), mime = r0.mime || blob.getContentType() || 'audio/webm';
      const st = gemFetch_('https://generativelanguage.googleapis.com/upload/v1beta/files', { method: 'post', contentType: 'application/json',
        headers: { 'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start', 'X-Goog-Upload-Header-Content-Length': String(bytes.length), 'X-Goog-Upload-Header-Content-Type': mime },
        payload: JSON.stringify({ file: { display_name: 'rec-' + rid } }) });
      const up = st.getHeaders()['X-Goog-Upload-URL'] || st.getHeaders()['x-goog-upload-url']; if (!up) throw new Error('A Gemini feltöltés nem indult el.');
      const fin = UrlFetchApp.fetch(up, { method: 'post', contentType: mime, payload: bytes, muteHttpExceptions: true, headers: { 'X-Goog-Upload-Command': 'upload, finalize', 'X-Goog-Upload-Offset': '0' } });
      if (fin.getResponseCode() >= 300) throw new Error('A Gemini feltöltés hibás (' + fin.getResponseCode() + ').');
      const fj = JSON.parse(fin.getContentText()).file || {}, segs = Math.max(1, Math.ceil((Number(r0.dur) || 60) / REC_SEG));
      const r = recEdit_(did, rid, x => { x.retries = 0; x.retryAt = ''; x.gUri = fj.uri; x.gName = fj.name; x.gMime = mime; x.segs = segs; x.seg = 0; x.st = 'átirat készül'; x.err = ''; x.tr = []; });
      return { rec: recPub_(r), more: true };
    }
    if (r0.gName && r0.seg === 0 && !r0.gReady) {   // a feltöltött fájl feldolgozása (ACTIVE állapotig)
      const s = JSON.parse(gemFetch_('https://generativelanguage.googleapis.com/v1beta/' + r0.gName).getContentText());
      if (s.state === 'FAILED') throw new Error('A Gemini nem tudta feldolgozni a hangfájlt.');
      if (s.state !== 'ACTIVE') { Utilities.sleep(3000); return { rec: recPub_(r0), more: true }; }
      const r = recEdit_(did, rid, x => { x.retries = 0; x.retryAt = ''; x.gReady = 1; }); return { rec: recPub_(r), more: true };
    }
    if ((r0.seg || 0) < (r0.segs || 1)) {   // 2) szakaszonkénti szó szerinti átirat
      const i = r0.seg || 0, from = i * REC_SEG, to = Math.min((i + 1) * REC_SEG, Math.max(Number(r0.dur) || 0, (i + 1) * REC_SEG)), mmss = s => ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + s % 60).slice(-2);
      const prompt = 'Ez egy magyar nyelvű üzleti beszélgetés hangfelvétele (Lumos Motion – rendezvény- és videógyártás, értékesítés). Írd le SZÓ SZERINT a felvétel ' + mmss(from) + ' és ' + mmss(to) + ' közötti részét (csak ezt a részt!). '
        + 'Minden beszélőváltásnál új sor: [pp:mm] Beszélő: szöveg. A beszélőket jelöld „Beszélő 1”, „Beszélő 2”… néven, de ha a beszélgetésből kiderül a nevük, használd a nevet. Ne foglald össze, ne javítsd ki a mondatokat, ne találj ki semmit; az érthetetlen részt [érthetetlen] jelöld. Ha ebben a szakaszban nincs beszéd, a lines legyen üres.';
      const out = gemJson_([{ file_data: { mime_type: r0.gMime || 'audio/webm', file_uri: r0.gUri } }, { text: prompt }], { type: 'OBJECT', properties: { lines: { type: 'STRING' } }, required: ['lines'] }, 24000);
      const r = recEdit_(did, rid, x => { x.retries = 0; x.retryAt = ''; x.tr = (x.tr || []).concat([String(out.lines || '').trim()]); x.seg = i + 1; });
      return { rec: recPub_(r), more: true };
    }
    // 3) összefoglaló + átirat-fájl
    const full = (r0.tr || []).filter(Boolean).join('\n');
    const sum = gemJson_([{ text: 'Az alábbi egy magyar nyelvű értékesítési beszélgetés átirata (Lumos Motion – rendezvény- és videógyártás). Lehetőség: „' + (d.title || '') + '”' + (d.client ? ', ügyfél: ' + d.client : '') + '. Mai dátum: ' + today_() + '.\n'
      + 'Készíts magyarul: summary – tömör összefoglaló legfeljebb 8 pontban („• ” kezdettel, soronként); needs – az ügyfél igényei, ami elhangzott (szolgáltatás, dátum, helyszín, létszám, keret, határidő), soronként; next – a következő konkrét lépés egy mondatban (ha elhangzott); nextDate – a következő lépés dátuma ÉÉÉÉ-HH-NN formában, ha elhangzott vagy egyértelműen következik, különben üres. Csak az átiratban elhangzottakra támaszkodj.\n\nÁTIRAT:\n' + full.slice(0, 400000) }],
      { type: 'OBJECT', properties: { summary: { type: 'STRING' }, needs: { type: 'STRING' }, next: { type: 'STRING' }, nextDate: { type: 'STRING' } }, required: ['summary', 'needs', 'next', 'nextDate'] }, 4000);
    const head = (d.title || '') + ' – ' + (REC_KIND[r0.kind] || 'beszélgetés') + '\n' + r0.at + ' · rögzítette: ' + r0.by + ' · hossz: ' + recDurTxt_(r0.dur) + '\n\nÖSSZEFOGLALÓ\n' + (sum.summary || '') + '\n\nAZ ÜGYFÉL IGÉNYEI\n' + (sum.needs || '–') + '\n\nKÖVETKEZŐ LÉPÉS\n' + (sum.next || '–') + (sum.nextDate ? ' (' + sum.nextDate + ')' : '') + '\n\nSZÓ SZERINTI ÁTIRAT\n' + full + '\n';
    let trId = r0.trId || ''; try { if (trId) DriveApp.getFileById(trId).setContent(head); else trId = recFolder_().createFile(Utilities.newBlob(head, 'text/plain', DriveApp.getFileById(r0.fileId).getName().replace(/\.\w+$/, '') + ' – átirat.txt')).getId(); } catch (e) { Logger.log('Átirat-fájl: ' + e); }
    const nd = /^\d{4}-\d{2}-\d{2}$/.test(String(sum.nextDate || '')) ? sum.nextDate : '';
    const r = recEdit_(did, rid, x => { x.retries = 0; x.retryAt = ''; x.summary = String(sum.summary || '').slice(0, 4000); x.needs = String(sum.needs || '').slice(0, 3000); x.next = String(sum.next || '').slice(0, 300); x.nextDate = nd; x.trId = trId; x.st = 'kész'; x.err = ''; delete x.tr; });
    try { gemFetch_('https://generativelanguage.googleapis.com/v1beta/' + r0.gName, { method: 'delete' }); } catch (e) {}   // a Gemini-példány törlése (a felvétel a Drive-on marad)
    try { recNote_(u, did, '🎙️ Beszélgetés összefoglalója (' + recDurTxt_(r0.dur) + '):\n' + String(sum.summary || '').slice(0, 1500) + (sum.next ? '\n➜ ' + sum.next : '')); } catch (e) {}
    let deals = null; try { deals = dealsFor_(u); } catch (e) {}
    return { rec: recPub_(r), more: false, deals: deals };
  } catch (e) {
    /* átmeneti Gemini-hiba (túlterhelés, keret, szerverhiba): nem hiba, hanem várakozás – a háttér magától újrapróbálja (2, 5, 10, 20, 40, 60 perc múlva) */
    const tries = (Number(r0.retries) || 0) + 1;
    if ((e.gCode === 429 || e.gCode >= 500) && tries <= REC_RETRY_MIN.length) {
      const at = new Date(Date.now() + REC_RETRY_MIN[tries - 1] * 60000), atTxt = Utilities.formatDate(at, SHEET_TZ, 'yyyy-MM-dd HH:mm');
      let r = null; try { r = recEdit_(did, rid, x => { x.st = 'várakozik'; x.retries = tries; x.retryAt = atTxt; x.uid = u.id; x.err = String(e && e.message || e).slice(0, 300); }); } catch (_) {}
      recRetryAdd_(did, rid, u.id, at.getTime());
      return { rec: recPub_(r || r0), more: false, wait: true, retryAt: atTxt };
    }
    try { recEdit_(did, rid, x => { x.err = String(e && e.message || e).slice(0, 300); x.st = 'hiba'; x.retryAt = ''; }); } catch (_) {}
    throw e;
  }
}
/* ---- automatikus újrapróbálás (2026-11-26): átmeneti Gemini-hibánál a háttér magától folytatja, nem kell gombot nyomni ---- */
const REC_RETRY_MIN = [2, 5, 10, 20, 40, 60];
function recRetryList_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('REC_RETRY') || '[]'); } catch (e) { return []; } }
function recRetrySave_(L) { PropertiesService.getScriptProperties().setProperty('REC_RETRY', JSON.stringify(L.slice(-50))); recRetrySchedule_(L); }
function recRetryAdd_(did, rid, uid, atMs) { const L = recRetryList_().filter(x => !(x.did === did && x.rid === rid)); L.push({ did: did, rid: rid, uid: uid, at: atMs }); recRetrySave_(L); }
function recRetryDrop_(did, rid) { const L = recRetryList_(), M = L.filter(x => !(x.did === did && x.rid === rid)); if (M.length !== L.length) recRetrySave_(M); }
function recRetrySchedule_(L) {   // egyetlen egyszeri időzítő a legkorábbi esedékességre
  try { ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'recRetryTick').forEach(t => ScriptApp.deleteTrigger(t));
    if (!L.length) return; const ms = Math.max(60000, Math.min.apply(null, L.map(x => x.at)) - Date.now());
    ScriptApp.newTrigger('recRetryTick').timeBased().after(ms).create(); } catch (e) { Logger.log('Átirat-újrapróbálás időzítő: ' + e); }
}
function recRetryTick() {
  const t0 = Date.now(), users = loadUsers_(); let L = recRetryList_();
  const due = L.filter(x => x.at <= Date.now() + 30000); L = L.filter(x => due.indexOf(x) < 0); recRetrySave_(L);   // a sorra kerülőket kivesszük (újabb átmeneti hibánál a feldolgozás visszateszi)
  due.forEach(x => { const u = users.find(v => v.id === x.uid && !v.disabled); if (!u) return;
    try { let done = false; for (let n = 0; n < 60 && Date.now() - t0 < 4.5 * 60000; n++) { const r = recProcess_(u, { dealId: x.did, id: x.rid }); if (!r.more) { done = true; break; } }
      if (!done) recRetryAdd_(x.did, x.rid, x.uid, Date.now() + 60000); }   // időkeret vége: egy perc múlva folytatja
    catch (e) { Logger.log('Átirat-újrapróbálás (' + x.rid + '): ' + e); } });
}

/** A javasolt következő lépés átvétele a lehetőséghez: a: {dealId, next, nextDate} */
function recApplyNext_(u, a) {
  const did = str_(a && a.dealId, 64); recDeal_(u, did); const ns = str_(a.next, 300).trim(), nd = /^\d{4}-\d{2}-\d{2}$/.test(String(a.nextDate || '')) ? a.nextDate : '';
  if (!ns) throw new Error('Nincs következő lépés.');
  withLock_(() => { const sh = sheetFor_('deals'), row = findRow_(sh, did); if (!row) throw new Error('A lehetőség nem található.'); const x = readRow_('deals', sh, row);
    x.nextStep = ns; if (nd) x.nextDate = nd; else if (!x.nextDate) x.nextDate = today_(); x.updatedAt = now_(); x.updatedBy = u.name; putRow_('deals', sh, x, row); dbFlush_(); });
  return { deals: dealsFor_(u) };
}
