/* ===================== BESZÉLGETÉS-ÁTIRAT: OPENAI (2026-11-26) =====================
   Ha az ügyvezető megadta az OpenAI API-kulcsot (Beállítások), az átirat és az összefoglaló az OpenAI-jal készül (elsődleges),
   különben a Geminivel. Két lépés (a böngésző / a háttér-újrapróbálás egymás után hívja a recProcess_-t):
   1) átirat: a hangfájl a /v1/audio/transcriptions végpontra (gpt-transcribe; beszélők szerint, ha a modell tudja) → Drive-ra mentve
   2) összefoglaló: chat-modell, kötött JSON-szerkezettel → a közös befejezés (recFinish_).
   A kulcs csak a szkripttulajdonságban van (a Neon-tükörbe nem kerül: KV_SECRET_RE_), a kérésekben fejlécben megy. */
const OAI_PROP = 'OPENAI_API_KEY', OAI_MAX = 25 * 1024 * 1024;
function openaiKey_() { return PropertiesService.getScriptProperties().getProperty(OAI_PROP) || ''; }
function openaiStatus_() { const k = openaiKey_(); return { on: !!k, tail: k ? k.slice(-4) : '', chat: k ? (CacheService.getScriptCache().get('oai_chat') || '') : '' }; }
function openaiSet_(u, a) {
  a = a || {}; const P = PropertiesService.getScriptProperties();
  if (a.clear) { P.deleteProperty(OAI_PROP); logEvent_(u, 'Beszélgetés-átirat (OpenAI)', '', 'kikapcsolva'); return openaiStatus_(); }
  const k = String(a.key || '').trim(); if (!/^sk-[\w\-]{20,300}$/.test(k)) throw new Error('Ez nem tűnik OpenAI API-kulcsnak (a platform.openai.com → API keys oldalon létrehozott, „sk-” kezdetű kulcsot másold be, szóköz nélkül).');
  const t = UrlFetchApp.fetch('https://api.openai.com/v1/models', { muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + k } });
  if (t.getResponseCode() !== 200) throw new Error('A kulcs nem működik (' + t.getResponseCode() + '): ' + oaiMsg_(t.getContentText()).slice(0, 200));
  P.setProperty(OAI_PROP, k); try { CacheService.getScriptCache().removeAll(['oai_models', 'oai_chat']); } catch (e) { }
  logEvent_(u, 'Beszélgetés-átirat (OpenAI)', '', 'kulcs mentve'); return openaiStatus_();
}
function oaiMsg_(txt) { try { const j = JSON.parse(txt); return String((j.error && (j.error.message || j.error.code)) || txt); } catch (e) { return String(txt || ''); } }
function oaiFetch_(path, opt) {
  const k = openaiKey_(); if (!k) throw new Error('Nincs megadva OpenAI-kulcs.');
  const o = Object.assign({ muteHttpExceptions: true }, opt || {}); o.headers = Object.assign({}, o.headers || {}, { Authorization: 'Bearer ' + k });
  const r = UrlFetchApp.fetch('https://api.openai.com/v1/' + path, o), c = r.getResponseCode(); if (c < 300) return r;
  const raw = r.getContentText(), msg = oaiMsg_(raw); let code = c;
  let nice = '';
  if (c === 429 && /insufficient_quota|exceeded your current quota|billing/i.test(raw)) { nice = 'elfogyott az OpenAI-egyenleg – tölts fel a platform.openai.com → Billing oldalon, utána folytatható'; code = 402; }   // nem átmeneti: ne próbálja újra magától
  else if (c === 429) nice = 'az OpenAI most korlátozza a kéréseket (átmeneti) – kicsit később folytatódik';
  else if (c === 401) nice = 'az OpenAI-kulcs érvénytelen vagy visszavonták – add meg újra a Beállításokban';
  else if (c >= 500) nice = 'az OpenAI szervere most hibát adott (átmeneti)';
  try { const C = CacheService.getScriptCache(), L = JSON.parse(C.get('gem_errs') || '[]'); L.unshift(now_() + ' ' + c + ' openai/' + path + ' – ' + msg.slice(0, 160)); C.put('gem_errs', JSON.stringify(L.slice(0, 12)), 21600); } catch (x) { }
  const err = new Error('OpenAI hiba (' + c + '): ' + (nice || msg.slice(0, 300))); err.gCode = code; err.gMsg = msg; throw err;
}
/** A kulccsal elérhető modellek (6 órára megjegyezve). */
function oaiModels_() {
  const C = CacheService.getScriptCache(); try { const c = C.get('oai_models'); if (c) return JSON.parse(c); } catch (e) { }
  let ids = []; try { ids = (JSON.parse(oaiFetch_('models').getContentText()).data || []).map(m => String(m.id || '')); } catch (e) { if (e.gCode === 401 || e.gCode === 402) throw e; }
  try { C.put('oai_models', JSON.stringify(ids), 6 * 3600); } catch (e) { } return ids;
}
/** Összefoglaló-modell: a legújabb „gpt-X(.Y)-mini”, ennek híján a legújabb „gpt-X(.Y)”, végül gpt-4o-mini. */
function oaiChatModel_() {
  const C = CacheService.getScriptCache(), c = C.get('oai_chat'); if (c) return c;
  const ids = oaiModels_(), ver = n => { const m = n.match(/^gpt-(\d+)(?:\.(\d+))?/); return m ? Number(m[1]) * 100 + Number(m[2] || 0) : 0; };
  const pick = re => ids.filter(n => re.test(n)).sort((a, b) => ver(b) - ver(a))[0];
  const m = pick(/^gpt-\d+(\.\d+)?-mini$/) || pick(/^gpt-\d+(\.\d+)?$/) || 'gpt-4o-mini';
  try { C.put('oai_chat', m, 6 * 3600); } catch (e) { } return m;
}
/** Átirat: a lehető legjobb beállítással kezd (gpt-transcribe, magyar, beszélők szerint), és ha a modell valamelyik paramétert nem ismeri (400), egyszerűsít. */
function oaiTranscribe_(blob, mime, name, ctx) {
  const ext = /mp4|m4a|aac/.test(mime) ? 'm4a' : /ogg/.test(mime) ? 'ogg' : /mpeg|mp3/.test(mime) ? 'mp3' : /wav/.test(mime) ? 'wav' : 'webm';
  const file = blob.copyBlob().setName(String(name || 'beszelgetes').replace(/\.\w+$/, '') + '.' + ext).setContentType(mime || 'audio/webm');
  const prompt = 'Magyar nyelvű üzleti beszélgetés (Lumos Motion – rendezvény- és videógyártás, értékesítés).' + (ctx ? ' ' + ctx : '');
  const tries = [
    { model: 'gpt-transcribe', 'languages[]': 'hu', response_format: 'diarized_json', chunking_strategy: 'auto', prompt: prompt },
    { model: 'gpt-transcribe', 'languages[]': 'hu', prompt: prompt },
    { model: 'gpt-transcribe', prompt: prompt },
    { model: 'gpt-4o-transcribe-diarize', language: 'hu', response_format: 'diarized_json', chunking_strategy: 'auto' },
    { model: 'whisper-1', language: 'hu', prompt: prompt }
  ];
  let last = null;
  for (const t of tries) {
    try {
      const r = oaiFetch_('audio/transcriptions', { method: 'post', payload: Object.assign({ file: file }, t) });
      const j = JSON.parse(r.getContentText()); CacheService.getScriptCache().put('oai_tr', t.model + (t.response_format ? ' / ' + t.response_format : ''), 6 * 3600);
      return oaiTrText_(j);
    } catch (e) { last = e; if (!(e.gCode === 400 || e.gCode === 404)) throw e; }   // csak a paraméter / modell nem ismert → egyszerűbb beállítás
  }
  throw last || new Error('Az átirat nem készült el.');
}
function oaiTrText_(j) {
  const mmss = s => { s = Math.max(0, Math.round(Number(s) || 0)); return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + s % 60).slice(-2); };
  const segs = Array.isArray(j.segments) ? j.segments : [];
  if (segs.length && segs.some(s => s.speaker != null)) {   // beszélők szerint: az egymás utáni azonos beszélő egy sorba
    const names = {}, out = []; let cur = null;
    segs.forEach(s => { const sp = String(s.speaker == null ? '?' : s.speaker); if (!names[sp]) names[sp] = 'Beszélő ' + (Object.keys(names).length + 1);
      const tx = String(s.text || '').trim(); if (!tx) return;
      if (cur && cur.sp === sp) cur.t += ' ' + tx; else { cur = { sp: sp, at: s.start, t: tx }; out.push(cur); } });
    return out.map(x => '[' + mmss(x.at) + '] ' + names[x.sp] + ': ' + x.t).join('\n');
  }
  if (segs.length && segs[0].start != null) return segs.map(s => '[' + mmss(s.start) + '] ' + String(s.text || '').trim()).filter(x => !/\]\s*$/.test(x)).join('\n');
  return String(j.text || '').trim();
}
/** Kötött szerkezetű JSON-válasz a chat-modelltől (ha a kötött séma nem megy, JSON-mód). */
function oaiJson_(prompt, props) {
  const schema = { type: 'object', properties: {}, required: Object.keys(props), additionalProperties: false };
  Object.keys(props).forEach(k => { schema.properties[k] = { type: 'string', description: props[k] }; });
  const model = oaiChatModel_(), base = { model: model, messages: [{ role: 'user', content: prompt }], max_completion_tokens: 6000 };
  const variants = [Object.assign({}, base, { response_format: { type: 'json_schema', json_schema: { name: 'osszefoglalo', strict: true, schema: schema } } }),
    Object.assign({}, base, { response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt + '\n\nVálaszolj kizárólag egy JSON-objektummal, ezekkel a mezőkkel (mind szöveg): ' + Object.keys(props).join(', ') + '.' }] })];
  let last = null;
  for (const v of variants) {
    try { const j = JSON.parse(oaiFetch_('chat/completions', { method: 'post', contentType: 'application/json', payload: JSON.stringify(v) }).getContentText());
      const txt = (((j.choices || [])[0] || {}).message || {}).content || ''; return JSON.parse(txt); }
    catch (e) { last = e; if (!(e.gCode === 400)) { if (e instanceof SyntaxError) throw new Error('Az OpenAI válasza nem értelmezhető – próbáld újra.'); throw e; } }
  }
  throw last;
}
/** A felvétel feldolgozása OpenAI-jal (a recProcess_ hívja, a hibakezelés – várakozás, újrapróbálás – ott van). */
function recProcessOai_(u, did, rid, d, r0) {
  if (!r0.trRaw) {   // 1) átirat
    const f = DriveApp.getFileById(r0.fileId), blob = f.getBlob(), size = blob.getBytes().length;
    if (size > OAI_MAX) throw new Error('A felvétel túl hosszú az OpenAI-átirathoz (legfeljebb 25 MB, kb. 100 perc).');
    const txt = oaiTranscribe_(blob, r0.mime || blob.getContentType() || 'audio/webm', f.getName(), d && d.client ? 'Ügyfél: ' + d.client + '.' : '');
    const nm = f.getName().replace(/\.\w+$/, '') + ' – átirat.txt';
    let trId = r0.trId || ''; try { if (trId) DriveApp.getFileById(trId).setContent(txt); else trId = recFolder_().createFile(Utilities.newBlob(txt || '(nincs érthető beszéd)', 'text/plain', nm)).getId(); } catch (e) { trId = recFolder_().createFile(Utilities.newBlob(txt || '(nincs érthető beszéd)', 'text/plain', nm)).getId(); }
    const r = recEdit_(did, rid, x => { x.retries = 0; x.retryAt = ''; x.trId = trId; x.trRaw = 1; x.prov = 'openai'; x.seg = 1; x.segs = 1; x.st = 'összefoglaló készül'; x.err = ''; });
    return { rec: recPub_(r), more: true };
  }
  // 2) összefoglaló
  const full = DriveApp.getFileById(r0.trId).getBlob().getDataAsString('UTF-8');
  const sum = String(full).trim() && !/^\(nincs érthető beszéd\)$/.test(full.trim()) ? oaiJson_(recSumPrompt_(d) + '\n\nÁTIRAT:\n' + full.slice(0, 400000), RECSUM_FIELDS_)
    : { summary: '• A felvételen nem volt érthető beszéd.', needs: '', next: '', nextDate: '' };
  return recFinish_(u, did, rid, d, r0, full, sum, r0.trId);
}
