/* ===================== Videónkénti vágói követés ===================== */
const VIDEO_KINDS_ = [['int_sarok', 'Interjúsarok videó'], ['interju', 'Kiállítói videó (imázsfilm)'], ['int_resztvevo', 'Interjú'], ['aftermovie', 'Aftermovie'],
  ['short60', 'Short videó (40–60 mp)'], ['short30', 'Short videó (30–40 mp)'], ['short15', 'Short videó (15–20 mp)']];
const flagOn_ = v => v === true || v === 1 || /^(1|true|igen)$/i.test(String(v == null ? '' : v).trim());
/** Van-e a projektnek leadandó anyaga (videó, fotó, felvétel)? Ha nincs (csak helyszíni technika: fény, hang, vizuál, képkeverés, élő közvetítés), a rendezvény után rögtön kész. */
function hasDeliverables_(p) {
  if (p.eventType === 'Videóvágás') return true;
  if (VIDEO_KINDS_.some(kn => Number(p[kn[0]]) > 0) || ['er_summary', 'er_clips', 'er_subs', 'x_foto_n'].some(k => Number(p[k]) > 0)) return true;
  if (['t_eloadas', 'x_foto', 'x_timelapse', 'x_dron', 'x_pov', 'x_nyersVetel', 'i_sarok', 'i_stand', 'er_total', 'er_close', 'er_creative', 'er_crowd', 'er_slides', 'er_zoom', 'er_post', 'er_drone'].some(k => flagOn_(p[k]))) return true;
  return parseVideos_(p.videos).length > 0;
}
const VIDEO_STATES_ = ['vagasra', 'vagas', 'ellen', 'leadva', 'jovahagyva', 'modositas'];
/** Új link a videóhoz: a régi link verzióként megmarad (a hozzászólások verziónként csoportosíthatók). */
function vidSetLink_(v, link) { link = String(link || ''); if (v.link && link && v.link !== link) { v.vers = (v.vers || []).concat([{ at: now_(), link: v.link }]).slice(-30); v.seenAt = ''; v.seenLast = ''; v.seenN = 0; } v.link = link; }   // új verzió: a megnyitás újra számít
function parseVideos_(v) { let l = v; if (typeof v === 'string') { try { l = JSON.parse(v || '[]'); } catch (e) { l = []; } }
  return (Array.isArray(l) ? l : []).slice(0, 120).map(x => ({ id: str_(x && x.id, 40), k: str_(x && x.k, 30), name: str_(x && x.name, 120), editor: str_(x && x.editor, 64),
    st: x && x.st === 'modositas' ? 'vagas' : VIDEO_STATES_.indexOf(x && x.st) >= 0 ? x.st : 'vagasra', at: str_(x && x.at, 30),
    link: str_(x && x.link, 500), note: str_(x && x.note, 1000), rvTo: str_(x && x.rvTo, 120), rvBy: str_(x && x.rvBy, 120), rvAt: str_(x && x.rvAt, 30),
    fb: str_(x && x.fb, 1000), fbBy: str_(x && x.fbBy, 120), fbAt: str_(x && x.fbAt, 30), okAt: str_(x && x.okAt, 30), vers: (Array.isArray(x && x.vers) ? x.vers : []).slice(-30).map(r => ({ at: str_(r && r.at, 30), link: str_(r && r.link, 500) })).filter(r => r.at), cn: x && x.cn ? 1 : 0, seenAt: str_(x && x.seenAt, 30), seenLast: str_(x && x.seenLast, 30), seenN: Math.max(0, Math.round(Number(x && x.seenN) || 0)),
    dn: (Array.isArray(x && x.dn) ? x.dn : []).slice(-300).map(k => str_(k, 60)).filter(Boolean),
    dnBy: (() => { const o = {}, src = x && x.dnBy && typeof x.dnBy === 'object' ? x.dnBy : {}; Object.keys(src).slice(-300).forEach(k => { const r = src[k]; if (r && typeof r === 'object') o[str_(k, 60)] = { by: str_(r.by, 120), at: str_(r.at, 30) }; }); return o; })(),   // ki és mikor pipálta ki   // kipipált (elvégzett) időkódos észrevételek: „<hozzászólás ideje>#<sorszám>”
    cm: (Array.isArray(x && x.cm) ? x.cm : []).slice(-100).map(c => ({ by: str_(c && c.by, 120), at: str_(c && c.at, 30), t: str_(c && c.t, 1000), ts: c && c.ts !== '' && c.ts != null && isFinite(Number(c.ts)) ? Math.max(0, Math.round(Number(c.ts))) : '' })).filter(c => c.t) })).filter(x => x.id); }   // fb: visszadobás indoka   // rv*: belső ellenőrzésre küldés
/** A megrendelt darabszámokból videósorok: a meglévők megmaradnak, a hiányzók létrejönnek, a még érintetlen (vágásra váró, vágó nélküli) fölösek törlődnek.
    Ha a projektnek pontosan egy vágója van, a vágó nélküli sorok az övéi. */
function videosEnsure_(p, cutters) {
  const cur = parseVideos_(p.videos), byId = {}; cur.forEach(x => { byId[x.id] = x; });
  const want = [];
  VIDEO_KINDS_.forEach(kn => { const n = Math.max(0, Math.min(40, Math.floor(Number(p[kn[0]]) || 0)));
    for (let i = 1; i <= n; i++) { const id = kn[0] + '-' + i, x = byId[id] || { id: id, k: kn[0], editor: '', st: 'vagasra', at: '' }; if (!x.cn) x.name = kn[1] + (n > 1 ? ' ' + i : ''); /* átnevezett videó neve megmarad */ want.push(x); } });
  if (flagOn_(p.x_foto) || Number(p.x_foto_n) > 0) want.push(byId['foto-1'] || { id: 'foto-1', k: 'foto', name: 'Fotók', editor: '', st: 'vagasra', at: '' });   // a fotógaléria is leadandó / jóváhagyandó elem
  const ids = {}; want.forEach(x => { ids[x.id] = 1; });
  cur.forEach(x => { if (!ids[x.id] && (x.st !== 'vagasra' || x.editor)) want.push(x); });   // már dolgozott rajta valaki: nem tűnik el
  const one = cutters && cutters.length === 1 ? cutters[0] : '';
  if (one) want.forEach(x => { if (!x.editor && x.k !== 'foto') x.editor = one; });   // a fotók nem a vágóé
  return want;
}
/** Egy videó állapotának / vágójának módosítása. Vezetők mindent; a vágó csak a saját (vagy gazdátlan) sorainak vágási állapotát. a: {projectId, id, st?, editor?} */
/** Videósorok a régebbi (a videókövetés előtt mentett) aktív projekteknek is: a megrendelt darabszámokból; a vágó a vágói feladatkiosztásból (vagy az egyetlen vágó). */
/** Fiók nélküli értékesítő (munkatárs) jutalékai projektenként: kézi összeg, vagy kézi % × termelői alap. A szakember csak az összeget kapja meg. */
function mySalesComm_(cid) {
  if (!cid) return [];
  const pm = byId_(readAll_('projects'));
  return readAll_('deals').filter(d => d.stage === 'nyert' && d.ownerId === 'crew:' + cid).map(d => { const p = pm[d.projectId]; if (!p || p.status === 'lemondva') return null;
    const mp = String(d.commManual == null ? '' : d.commManual).trim(), amt = /^ft:/.test(mp) ? Number(mp.slice(3)) || 0 : mp !== '' && !isNaN(Number(mp)) ? Math.round(prodBase_(p) * Number(mp) / 100) : 0;
    return amt > 0 ? { projectId: p.id, name: sval_(p.name), date: sval_(p.date), endDate: sval_(p.endDate), amount: amt } : null; }).filter(Boolean);
}
function videosBackfill_() {
  const sh = sheetFor_('projects'), ca = readAll_('crewAssign');
  readAll_('projects').forEach(p => {
    if (p.status === 'atadva' || p.status === 'lemondva') return;
    const cur0 = parseVideos_(p.videos), wantF = flagOn_(p.x_foto) || Number(p.x_foto_n) > 0;
    if (cur0.length) {   // már vannak videósorok: csak a fotógaléria sora hiányozhat
      if (!wantF || cur0.some(x => x.k === 'foto')) return;
      withLock_(() => { const r = findRow_(sh, p.id); if (!r) return; const q = readRow_('projects', sh, r), l = parseVideos_(q.videos); if (l.some(x => x.k === 'foto')) return; l.push({ id: 'foto-1', k: 'foto', name: 'Fotók', editor: '', st: 'vagasra', at: '' }); q.videos = JSON.stringify(parseVideos_(l)); putRow_('projects', sh, q, r); });
      return;
    }
    if (!VIDEO_KINDS_.some(kn => Number(p[kn[0]]) > 0) && !(flagOn_(p.x_foto) || Number(p.x_foto_n) > 0)) return;
    const cutters = [...new Set(ca.filter(r => r.projectId === p.id && r.role === 'Vágó').map(r => String(r.crewId || '')))].filter(String);
    const vids = videosEnsure_(p, cutters), et = parseEditTasks_(p.editTasks);
    vids.forEach(x => { if (!x.editor) { const o = Object.keys(et).find(id => (et[id] || []).indexOf(x.k) >= 0); if (o) x.editor = o; } });
    if (!vids.length) return;
    withLock_(() => { const r = findRow_(sh, p.id); if (!r) return; const q = readRow_('projects', sh, r); if (parseVideos_(q.videos).length) return; q.videos = JSON.stringify(vids); putRow_('projects', sh, q, r); });
  });
  dbFlush_();
}
/** Belső ellenőrzésre küldés: a videó „Belső ellenőrzés” állapotba kerül, a link és a megjegyzés mentődik, a kiválasztott vezető e-mailt kap. */
const REVIEWERS_ = { ervin: 'ervin.egri@lumosmotion.com', david: 'david.zajacz@lumosmotion.com' };
function videoReview_(u, a) {
  a = a || {};
  const to = REVIEWERS_[String(a.to || '')]; if (!to) throw new Error('Válaszd ki, ki kapja az értesítést.');
  const link = str_(a.link, 500).trim(); if (!/^https?:\/\/\S+$/i.test(link)) throw new Error('Illeszd be a videó linkjét (https://…).');
  const note = str_(a.note, 1000).trim();
  const res = videoSet_(u, { projectId: a.projectId, id: a.id, st: 'ellen' });
  const pid = str_(a.projectId, 64), vid = str_(a.id, 40); let p, v;
  withLock_(() => { const sh = sheetFor_('projects'), row = findRow_(sh, pid); p = readRow_('projects', sh, row); const vids = parseVideos_(p.videos); v = vids.find(x => x.id === vid);
    if (v) { vidSetLink_(v, link); v.note = note; v.rvTo = to; v.rvBy = u.name; v.rvAt = now_(); }
    p.videos = JSON.stringify(vids); p.updatedAt = now_(); p.updatedBy = u.name; putRow_('projects', sh, p, row); dataBump_(); dbFlush_(); });
  const rv = SIG_DEFAULTS_[to] || { name: '' }, first = huFirst_(String(rv.name || ''));
  const url = appUrl_() + '#p=' + pid + '&v=' + encodeURIComponent(vid);
  const text = 'Kedves ' + first + '!\n\n' + u.name + ' belső ellenőrzésre küldte: ' + (v ? v.name : 'videó') + ' – ' + p.name + (note ? '\n\nMegjegyzés:\n' + note : '') + '\n\nA videó megnyitása: ' + url + '\n\nEzt az értesítést a Lumos Motion Kft. Projekttervező szoftvere küldte.';
  const html = '<p>Kedves ' + escapeHtml_(first) + '!</p><p><b>' + escapeHtml_(u.name) + '</b> belső ellenőrzésre küldte: <b>' + escapeHtml_(v ? v.name : 'videó') + '</b> – ' + escapeHtml_(p.name) + '</p>' + (note ? '<p><b>Megjegyzés:</b><br>' + escapeHtml_(note).replace(/\n/g, '<br>') + '</p>' : '') + '<p><a href="' + escapeHtml_(url) + '">A videó megnyitása</a></p><p style="color:#7b8794;font-size:12px;font-style:italic;margin-top:18px">Ezt az értesítést a Lumos Motion Kft. Projekttervező szoftvere küldte.</p>';
  if (a.noMail) return { project: projectView_(fullProject_(p), u), mail: false, name: v ? v.name : 'videó', pname: p.name, pid: pid, vid: vid, link: link };   // csoportos küldés: egy közös levél megy
  let mail = false; try { mail = gmailSend_(to, 'Belső ellenőrzésre vár: ' + (v ? v.name : 'videó') + ' – ' + p.name, text, { htmlBody: html, name: 'Lumos Motion Projekttervező' }); } catch (e) { Logger.log('Ellenőrzés e-mail hiba: ' + e); }
  logEvent_(u, 'Videó belső ellenőrzésre', p.name, (v ? v.name : '') + ' → ' + (rv.name || to));
  return { project: projectView_(fullProject_(p), u), mail: mail };
}
/** Több videó egyszerre belső ellenőrzésre – egyetlen e-mail az ellenőrzőnek. a: {to, note, items:[{projectId, id, link}]} */
function videoReviewBatch_(u, a) {
  a = a || {}; const to = REVIEWERS_[String(a.to || '')]; if (!to) throw new Error('Válaszd ki, ki kapja az értesítést.');
  const items = (Array.isArray(a.items) ? a.items : []).slice(0, 40); if (!items.length) throw new Error('Nincs kiválasztott videó.');
  items.forEach(x => { if (!/^https?:\/\/\S+$/i.test(String(x && x.link || '').trim())) throw new Error('Minden videóhoz illeszd be a linket (https://…).'); });
  const note = str_(a.note, 1000).trim(), done = [], projects = {};
  items.forEach(x => { const r = videoReview_(u, { to: a.to, note: note, projectId: x.projectId, id: x.id, link: x.link, noMail: true }); done.push(r); projects[r.pid] = r.project; });
  const rv = SIG_DEFAULTS_[to] || { name: '' }, first = huFirst_(String(rv.name || '')), pn = done.map(r => r.pname).filter((x, i, arr) => arr.indexOf(x) === i).join(', ');
  const text = 'Kedves ' + first + '!\n\n' + u.name + ' belső ellenőrzésre küldött ' + done.length + ' videót – ' + pn + ':\n\n' + done.map(r => '• ' + r.name).join('\n') + (note ? '\n\nMegjegyzés:\n' + note : '') + '\n\nA projekt: ' + appUrl_() + '#p=' + done[0].pid + '\n\nEzt az értesítést a Lumos Motion Kft. Projekttervező szoftvere küldte.';
  const html = '<p>Kedves ' + escapeHtml_(first) + '!</p><p><b>' + escapeHtml_(u.name) + '</b> belső ellenőrzésre küldött <b>' + done.length + ' videót</b> – ' + escapeHtml_(pn) + ':</p><ul>' + done.map(r => '<li><a href="' + escapeHtml_(appUrl_() + '#p=' + r.pid + '&v=' + encodeURIComponent(r.vid)) + '">' + escapeHtml_(r.name) + '</a></li>').join('') + '</ul>' + (note ? '<p><b>Megjegyzés:</b><br>' + escapeHtml_(note).replace(/\n/g, '<br>') + '</p>' : '') + '<p><a href="' + escapeHtml_(appUrl_() + '#p=' + done[0].pid) + '">A projekt megnyitása</a></p><p style="color:#7b8794;font-size:12px;font-style:italic;margin-top:18px">Ezt az értesítést a Lumos Motion Kft. Projekttervező szoftvere küldte.</p>';
  let mail = false; try { mail = gmailSend_(to, 'Belső ellenőrzésre vár: ' + done.length + ' videó – ' + pn, text, { htmlBody: html, name: 'Lumos Motion Projekttervező' }); } catch (e) { Logger.log('Ellenőrzés e-mail hiba: ' + e); }
  return { projects: Object.keys(projects).map(k => projects[k]), mail: mail, n: done.length };
}
/** Hozzászólás egy videóhoz (vezető vagy a projekt vágója); ts: másodperc a videóban, ha a lejátszóból időponthoz kötötték. A vágó e-mailt kap, ha más írt; ha ő írt, az ellenőrző. */
const pinStrip_ = t => String(t || '').replace(/\s*@\d{1,3}(?:\.\d)?,\d{1,3}(?:\.\d)?\]/g, ' – jelölés]');   // az e-mailben nincs emoji (a levelezők elrontják)   // a tű koordinátái az e-mailben nem kellenek
function videoComment_(u, a) {
  a = a || {};
  const pid = str_(a.projectId, 64), vid = str_(a.id, 40), mgr = u.role === 'admin' || u.role === 'editor', t = str_(a.text, 1000).trim();
  if (t.length < 1) throw new Error('Írj valamit a hozzászólásba.');
  if (!mgr && !readAll_('crewAssign').some(r => r.projectId === pid && r.crewId === u.crewId && r.role === 'Vágó')) throw new Error('FORBIDDEN: Csak a vezetők és a projekt vágója szólhat hozzá.');
  const ts = a.ts !== '' && a.ts != null && isFinite(Number(a.ts)) ? Math.max(0, Math.round(Number(a.ts))) : '';
  let p, v;
  withLock_(() => { const sh = sheetFor_('projects'), row = findRow_(sh, pid); if (!row) throw new Error('A projekt nem található.');
    p = readRow_('projects', sh, row); const vids = parseVideos_(p.videos); v = vids.find(x => x.id === vid); if (!v) throw new Error('A videó nem található.');
    const isRep = /^⤷\{/.test(t);   // válasz egy meglévő hozzászólásra: minden állapotban mehet (beszélgetés)
    if (!isRep && v.st === 'leadva') throw new Error('Az ügyfél jóváhagyására váró videóhoz nem lehet hozzászólni.');
    if (!isRep && !mgr && v.st !== 'vagas') throw new Error('A videó már le van adva – most nem lehet hozzászólni.');
    v.cm = (v.cm || []).concat([{ by: u.name, at: now_(), t: t, ts: ts }]).slice(-100);
    p.videos = JSON.stringify(vids); p.updatedAt = now_(); p.updatedBy = u.name; p.mutationId = Utilities.getUuid(); putRow_('projects', sh, p, row); dataBump_(); dbFlush_(); });
  try { const c = v.editor ? readAll_('crew').find(x => x.id === v.editor) : null, own = c && u.crewId && c.id === u.crewId;
    const to = own ? String(v.rvTo || '').trim() : c ? String(c.email || '').trim() : '';
    if (to && to.toLowerCase() !== String(u.email || '').toLowerCase()) { const url = appUrl_() + '#p=' + pid + '&v=' + encodeURIComponent(vid), tl = ts !== '' ? ' [' + Math.floor(ts / 60) + ':' + ('0' + ts % 60).slice(-2) + ']' : '';
      gmailSend_(to, 'Hozzászólás: ' + v.name + ' – ' + p.name, u.name + ' hozzászólt: ' + v.name + ' – ' + p.name + '\n\n' + tl.trim() + (tl ? ' ' : '') + pinStrip_(t) + '\n\n' + url,
        { htmlBody: '<p><b>' + escapeHtml_(u.name) + '</b> hozzászólt: <b>' + escapeHtml_(v.name) + '</b> – ' + escapeHtml_(p.name) + '</p><p style="padding:10px 12px;background:#f3f6fb;border-left:4px solid #2f6fdf">' + (tl ? '<b>' + escapeHtml_(tl.trim()) + '</b> ' : '') + escapeHtml_(pinStrip_(t)).replace(/\n/g, '<br>') + '</p><p><a href="' + escapeHtml_(url) + '">A videó megnyitása</a></p>', name: 'Lumos Motion Projekttervező', __nk: 'vidCm' }); } } catch (e) { Logger.log('Hozzászólás e-mail hiba: ' + e); }
  logEvent_(u, 'Videó hozzászólás', p.name, v.name);
  return { project: projectView_(fullProject_(p), u) };
}
/** Hozzászólás törlése: mindenki csak a sajátját. a: {projectId, id, idx, at} – az at a véletlen rossz törlés ellen. */
function videoCommentDel_(u, a) {
  a = a || {};
  const pid = str_(a.projectId, 64), vid = str_(a.id, 40), idx = Math.floor(Number(a.idx)), at = str_(a.at, 30);
  let p;
  withLock_(() => { const sh = sheetFor_('projects'), row = findRow_(sh, pid); if (!row) throw new Error('A projekt nem található.');
    p = readRow_('projects', sh, row); const vids = parseVideos_(p.videos), v = vids.find(x => x.id === vid); if (!v) throw new Error('A videó nem található.');
    const kind = str_(a.kind, 10);
    if (kind === 'note') throw new Error('Az ellenőrzésre küldés megjegyzése nem törölhető.');
    if (v.st === 'leadva' || v.st === 'jovahagyva') throw new Error('A leadott videó hozzászólásai már nem törölhetők.');
    { const c0 = (v.cm || []).find(c => c.at === at); if (c0 && /\[\d{1,3}:\d{2}/.test(String(c0.t || ''))) throw new Error('Az időkódos észrevétel nem törölhető (a vágó ez alapján dolgozik).'); }
    if (kind === 'fb' || kind === 'note') {   // a régi visszadobási indok / az ellenőrzésre küldés megjegyzése
      const by = kind === 'fb' ? v.fbBy : v.rvBy, w = kind === 'fb' ? v.fbAt : v.rvAt;
      if (by !== u.name) throw new Error('FORBIDDEN: Csak a saját hozzászólásodat törölheted.'); if (String(w || '') !== at) throw new Error('A hozzászólás közben megváltozott – frissíts, és próbáld újra.');
      if (kind === 'fb') v.fb = ''; else v.note = '';
    } else {
    let k = (v.cm || [])[idx] && v.cm[idx].at === at && v.cm[idx].by === u.name ? idx : (v.cm || []).findIndex(c => c.at === at && c.by === u.name);   // az időbélyeg + szerző azonosít (a sorszám közben elcsúszhat)
    if (k < 0) { if ((v.cm || []).some(c => c.at === at)) throw new Error('FORBIDDEN: Csak a saját hozzászólásodat törölheted.'); k = -1; }
    if (k >= 0) v.cm.splice(k, 1);   // ha már nincs meg (pl. kétszer küldött törlés), nincs teendő
    } p.videos = JSON.stringify(vids); p.updatedAt = now_(); p.updatedBy = u.name; p.mutationId = Utilities.getUuid(); putRow_('projects', sh, p, row); dataBump_(); dbFlush_(); });
  logEvent_(u, 'Videó hozzászólás törölve', p.name, vid);
  return { project: projectView_(fullProject_(p), u) };
}
/** Időkódos észrevétel kipipálása (elvégezve): a vezető vagy a videó vágója. a: {projectId, id, key, on} */
function videoCmDone_(u, a) {
  a = a || {};
  const pid = str_(a.projectId, 64), vid = str_(a.id, 40), key = str_(a.key, 60), on = a.on === true || a.on === 'true';
  if (!key) throw new Error('Hiányzik az észrevétel azonosítója.');
  let p;
  withLock_(() => { const sh = sheetFor_('projects'), row = findRow_(sh, pid); if (!row) throw new Error('A projekt nem található.');
    p = readRow_('projects', sh, row); const vids = parseVideos_(p.videos), v = vids.find(x => x.id === vid); if (!v) throw new Error('A videó nem található.');
    const mgr = u.role === 'admin' || u.role === 'editor';
    if (u.role === 'admin' || !(v.editor && v.editor === u.crewId)) throw new Error('FORBIDDEN: Az észrevételeket csak a videó vágója pipálhatja ki.');
    if (!mgr && v.st !== 'vagas') throw new Error('A videó már le van adva – a pipákat most nem lehet módosítani.');
    const d = (v.dn || []).filter(k => k !== key); if (on) d.push(key); v.dn = d.slice(-300);
    v.dnBy = v.dnBy || {}; if (on) v.dnBy[key] = { by: u.name, at: now_() }; else delete v.dnBy[key];
    p.videos = JSON.stringify(vids); p.updatedAt = now_(); p.updatedBy = u.name; p.mutationId = Utilities.getUuid(); putRow_('projects', sh, p, row); dataBump_(); dbFlush_(); });
  return { project: projectView_(fullProject_(p), u) };
}
/** Küldés az ügyfélnek jóváhagyásra: a videó „Ügyfél jóváhagyására vár” állapotba kerül, a kapcsolattartó e-mailt kap a linkkel (és a megjegyzéssel). a: {projectId, id, to, link, note, text} */
function videoClient_(u, a) {
  a = a || {};
  if (u.role !== 'admin' && u.role !== 'editor') throw new Error('FORBIDDEN: Az ügyfélnek a projektvezető küldheti el.');
  const tos = str_(a.to, 600).split(/\s*,\s*/).map(x => x.trim()).filter(Boolean).slice(0, 8), to = tos.join(', '); if (!tos.length || !tos.every(x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))) throw new Error('Adj meg érvényes e-mail címet.');   // több címzett is lehet
  const link = str_(a.link, 500).trim(); if (!/^https?:\/\/\S+$/i.test(link)) throw new Error('Illeszd be a videó linkjét (https://…).');
  const pid = str_(a.projectId, 64), vid = str_(a.id, 40), note = str_(a.note, 1500).trim(); let text = str_(a.text, 4000).trim();
  const ids = (Array.isArray(a.ids) && a.ids.length > 1 ? a.ids : [vid]).map(x => str_(x, 40)).filter(Boolean).slice(0, 30);   // több videó egy levélben (közös jóváhagyó oldal)
  ids.forEach(id => videoSet_(u, { projectId: pid, id: id, st: 'leadva' }));
  let p, v, names = [];
  withLock_(() => { const sh = sheetFor_('projects'), row = findRow_(sh, pid); p = readRow_('projects', sh, row); const vids = parseVideos_(p.videos); v = vids.find(x => x.id === vid);
    ids.forEach(id => { const w = vids.find(x => x.id === id); if (!w) return; names.push(w.name); if (id === vid || ids.length === 1) vidSetLink_(w, link); w.seenAt = ''; w.seenLast = ''; w.seenN = 0; w.cm = (w.cm || []).concat([{ by: u.name, at: now_(), t: (clientMailLive_() ? 'Ügyfélnek elküldve (' + to + ')' : 'TESZT: az ügyfélnek szóló levél (' + to + ') csak neked ment ki') + (ids.length > 1 ? ' – ' + ids.length + ' videó egy levélben' : '') + (note ? ': ' + note : ''), ts: '' }]).slice(-100); });
    p.videos = JSON.stringify(vids); p.updatedAt = now_(); p.updatedBy = u.name; putRow_('projects', sh, p, row); dataBump_(); dbFlush_(); });
  const live = clientMailLive_(), sendTo = live ? to : String(u.email || '');   // TESZT: amíg nincs élesítve, a levél a küldőhöz megy, nem az ügyfélhez
  if (!sendTo) throw new Error('Tesztüzemben a levél neked menne, de nincs e-mail címed.');
  const pageUrl = FRONTEND_URL + '/' + clientShort_(clientToken_(Object.assign({ p: pid, v: vid, s: String(u.email || ''), c: to }, ids.length > 1 ? { vs: ids } : {})));   // rövid link: /v/<kód> → jóváhagyó oldal   // egyetlen link: a jóváhagyó oldal (ott nézi meg a videót, és ott dönt)
  text = text.split(link).join(pageUrl); if (text.indexOf(pageUrl) < 0) text = text + '\n\n' + pageUrl;
  const btn = '<a class="lmbtn" href="' + escapeHtml_(pageUrl) + '" style="display:inline-block;background:#f6efe1;border:1px solid #e3d3b0;border-radius:10px;padding:6px 22px 6px 10px;text-decoration:none;color:#1d2a38;font-family:Montserrat,Arial,sans-serif;line-height:1.2">'
    + '<img class="lmstamp" src="' + FRONTEND_URL + '/mail/stamp.png" width="48" height="48" alt="Lumos Motion" style="vertical-align:middle;border:0;display:inline-block">'
    + '<span style="display:inline-block;vertical-align:middle;border-left:1px solid #e3d3b0;padding-left:14px;margin-left:12px">'
    + '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;border-collapse:collapse;vertical-align:middle"><tr><td style="vertical-align:middle;font-size:15px;font-weight:600;color:#1d2a38;line-height:26px;white-space:nowrap">' + (ids.length > 1 ? 'Videók' : 'Videó') + ' megtekintése</td>'
    + '<td style="vertical-align:middle;padding-left:12px;line-height:0;font-size:0"><span style="display:inline-block;padding:7px 7px 7px 10px;border-radius:50%;background:#1d2a38;line-height:0;font-size:0"><span style="display:block;width:0;height:0;border-style:solid;border-width:6px 0 6px 10px;border-color:transparent transparent transparent #ffffff"></span></span></td></tr></table></span></a>';   // CSS-sel rajzolt lejátszás gomb (a ▶ jelet a Gmail sárga emojivá alakítja)   // Lumos postabélyegzős „levél” gomb (a pecsét kép: /mail/stamp.png)
  const btnCss = '<style>.lmbtn:hover{background:#efe3c6!important;border-color:#d4b97c!important;box-shadow:0 4px 12px rgba(29,42,56,.16)}.lmbtn:active{background:#e6d4ab!important;box-shadow:inset 0 2px 5px rgba(29,42,56,.18)}.lmbtn .lmstamp{transition:transform .2s}.lmbtn:hover .lmstamp{transform:rotate(-8deg) scale(1.06)}.lmbtn:active .lmstamp{transform:rotate(-8deg) scale(.96)}</style>';
  const sig = signatureFor_(u), html = text.split(/\n/).map(l => l.trim() === pageUrl ? btn : escapeHtml_(l).replace(/(https?:\/\/\S+)/g, '<a href="$1">$1</a>')).join('<br>');
  const subj = (live ? '' : '[TESZT – valójában neki: ' + to + '] ') + (str_(a.subject, 200).trim() || (ids.length > 1 ? 'Elkészültek: ' + ids.length + ' db videó – ' + p.name : 'Elkészült: ' + (v ? v.name : 'videó') + ' – ' + p.name));
  let mail = false; try { mail = gmailSend_(sendTo, subj, text + (sig ? '\n\n' + sig.text : ''), { htmlBody: btnCss + '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55">' + html + '</div>' + (sig ? '<br>' + sig.html : ''), name: u.name || 'Lumos Motion' }); } catch (e) { Logger.log('Ügyfél e-mail hiba: ' + e); }
  const tpl = ids.length > 1 ? '' : str_(a.tpl, 4000).trim();   // a kiküldött levél sablonként megmarad az ügyfélnél ({video}, {projekt}, {link} helyőrzőkkel)
  if (tpl) { try { const cn = String(p.client || '').trim().toLowerCase(), csh = sheetFor_('clients'); withLock_(() => { const c = readAll_('clients').find(x => String(x.name || '').trim().toLowerCase() === cn); if (!c) return; const r = findRow_(csh, c.id); if (!r) return; const q = readRow_('clients', csh, r); q.vidMail = tpl; q.updatedAt = now_(); putRow_('clients', csh, q, r); dbFlush_(); }); } catch (e) { Logger.log('Sablon mentése: ' + e); } }
  logEvent_(u, 'Videó ügyfélnek elküldve', p.name, (ids.length > 1 ? names.join(', ') : (v ? v.name : '')) + ' → ' + to);
  return { project: projectView_(fullProject_(p), u), mail: mail, test: !live };
}
/* Az ügyfél jóváhagyó oldala (jovahagyas.html): aláírt, 60 napig érvényes kulcs – bejelentkezés nélkül csak ezt az egy videót látja és döntheti el. */
/** Ügyfél-levelek élesen mennek (Ervin, 2026-11-09). Tesztüzem visszakapcsolása: Script Property LUMOS_CLIENT_MAIL_LIVE = '0' */
function clientMailLive_() { return PropertiesService.getScriptProperties().getProperty('LUMOS_CLIENT_MAIL_LIVE') !== '0'; }
function clientSecret_() { const P = PropertiesService.getScriptProperties(); let k = P.getProperty('LUMOS_CLIENT_SECRET'); if (!k) { k = Utilities.getUuid() + Utilities.getUuid(); P.setProperty('LUMOS_CLIENT_SECRET', k); } return k; }
function clientToken_(o) { o.x = Date.now() + 60 * 864e5; const b = Utilities.base64EncodeWebSafe(JSON.stringify(o)).replace(/=+$/, ''), sg = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(b, clientSecret_())).replace(/=+$/, ''); return b + '.' + sg; }
/** Rövid kód a hosszú, aláírt kulcshoz (Script Properties: CS_<kód>); a 60 napnál régebbieket kitakarítja. */
function clientShort_(tok) {
  const pr = PropertiesService.getScriptProperties(), abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let code = ''; for (let k = 0; k < 20; k++) { code = ''; const r = Utilities.getUuid().replace(/-/g, ''); for (let i = 0; i < 10; i++) code += abc[parseInt(r.substr(i * 3, 3), 16) % abc.length]; if (!pr.getProperty('CS_' + code)) break; }
  pr.setProperty('CS_' + code, tok);
  try { const all = pr.getProperties(), now = Date.now(); Object.keys(all).forEach(k => { if (k.indexOf('CS_') !== 0) return; try { const o = clientTokenRead_(all[k]); if (!o) pr.deleteProperty(k); } catch (e) { if (/lejárt/.test(String(e.message))) pr.deleteProperty(k); } }); } catch (e) { }
  return code;
}
function clientTokenRead_(t) { if (/^[A-Za-z0-9]{6,16}$/.test(String(t || ''))) { t = PropertiesService.getScriptProperties().getProperty('CS_' + t); if (!t) throw new Error('Érvénytelen link.'); }   // rövid link kódja
  const m = /^([\w-]+)\.([\w-]+)$/.exec(String(t || '')); if (!m) throw new Error('Érvénytelen link.');
  const sg = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(m[1], clientSecret_())).replace(/=+$/, ''); if (sg !== m[2]) throw new Error('Érvénytelen link.');
  const o = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(m[1] + '==='.slice((m[1].length + 3) % 4))).getDataAsString()); if (!o || !o.p || !o.v) throw new Error('Érvénytelen link.'); if (o.x && Date.now() > o.x) throw new Error('A link lejárt – kérj újat.'); return o; }
function clientVideo_(o) { const p = readAll_('projects').find(x => x.id === o.p); if (!p) throw new Error('A videó nem található.'); const v = parseVideos_(p.videos).find(x => x.id === o.v); if (!v) throw new Error('A videó nem található.'); return { p: p, v: v }; }
/* Vízjel a jóváhagyó lejátszón: pipával kérhető; a Sales Appból jött projekteknél alapból be van kapcsolva; kifizetés (teljes) után lekerül */
let WM_PAID_ = [];
/** Kifizetés után lekerült a vízjel: az ügyfél (akinek a jóváhagyó linket küldtük) egyszer e-mailt kap a végleges videók linkjével. */
function wmPaidMailFlush_() {
  const ids = WM_PAID_.filter((x, i, a) => a.indexOf(x) === i); WM_PAID_ = [];
  ids.forEach(pid => { try { wmPaidMail_(pid); } catch (e) { Logger.log('Vízjel-levél: ' + e); } });
}
function wmPaidMail_(pid) {
  const P = PropertiesService.getScriptProperties(), key = 'WMPAID_' + pid; if (P.getProperty(key)) return 'már elküldve';
  const p = readAll_('projects').find(x => x.id === pid); if (!p) return 'nincs projekt';
  const vids = parseVideos_(p.videos).filter(v => v.link && (v.st === 'leadva' || v.st === 'jovahagyva')); if (!vids.length) return 'nincs leadott videó linkkel';
  let to = '', by = '';
  vids.forEach(v => (v.cm || []).forEach(c => { const m = /^Ügyfélnek elküldve \(([^)]+)\)/.exec(String(c.t || '')); if (m && String(c.at) >= String((to && to.at) || '')) { to = { list: m[1], at: c.at }; by = c.by; } }));
  const tos = (to ? to.list : String(p.contactEmail || '')).split(/\s*,\s*/).filter(x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)); if (!tos.length) return 'nincs címzett';
  const users = loadUsers_(), sender = users.find(x => x.name === by && x.email) || users.find(x => x.role === 'admin' && x.email && !x.disabled) || { name: 'Lumos Motion', email: '' };
  const ids = vids.map(v => v.id), url = FRONTEND_URL + '/' + clientShort_(clientToken_(Object.assign({ p: pid, v: ids[0], s: String(sender.email || ''), c: tos.join(', ') }, ids.length > 1 ? { vs: ids } : {})));
  const fn = clientFirst_(p, tos[0]), multi = ids.length > 1, live = clientMailLive_();
  const btn = '<a href="' + escapeHtml_(url) + '" style="display:inline-block;background:#f6efe1;border:1px solid #e3d3b0;border-radius:10px;padding:6px 22px 6px 10px;text-decoration:none;color:#1d2a38;font-family:Montserrat,Arial,sans-serif;line-height:1.2"><img src="' + FRONTEND_URL + '/mail/stamp.png" width="48" height="48" alt="Lumos Motion" style="vertical-align:middle;border:0;display:inline-block"><span style="display:inline-block;vertical-align:middle;border-left:1px solid #e3d3b0;padding-left:14px;margin-left:12px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;border-collapse:collapse;vertical-align:middle"><tr><td style="vertical-align:middle;font-size:15px;font-weight:600;color:#1d2a38;line-height:26px;white-space:nowrap">' + (multi ? 'Végleges videók' : 'Végleges videó') + '</td><td style="vertical-align:middle;padding-left:12px;line-height:0;font-size:0"><span style="display:inline-block;padding:7px 7px 7px 10px;border-radius:50%;background:#1d2a38;line-height:0;font-size:0"><span style="display:block;width:0;height:0;border-style:solid;border-width:6px 0 6px 10px;border-color:transparent transparent transparent #ffffff"></span></span></td></tr></table></span></a>';
  const lines = ['Kedves ' + fn + '!', '', 'Köszönjük a kiegyenlítést! ' + (multi ? 'A videókról' : 'A videóról') + ' levettük a vízjelet – a végleges ' + (multi ? 'változatokat' : 'változatot') + ' itt nézheted meg és töltheted le:'];
  const sig = signatureFor_(sender), html = '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55">' + lines.map(escapeHtml_).join('<br>') + '<br><br>' + btn + '</div>' + (sig ? '<br>' + sig.html : '<p>Üdvözlettel,<br>' + escapeHtml_(sender.name) + '<br>Lumos Motion</p>');
  const subj = (live ? '' : '[TESZT – valójában neki: ' + tos.join(', ') + '] ') + 'Elkészült a végleges ' + (multi ? 'videók' : 'videó') + ' – ' + sval_(p.name);
  const sendTo = live ? tos.join(', ') : String(sender.email || ''); if (!sendTo) return 'nincs küldő cím';
  const opts = { htmlBody: html, name: sender.name || 'Lumos Motion' }; if (sender.email) opts.replyTo = sender.email;
  const sent = gmailSend_(sendTo, subj, lines.join('\n') + '\n\n' + url + '\n\n' + (sig ? sig.text : 'Üdvözlettel,\n' + sender.name + '\nLumos Motion'), opts);
  if (!sent) return 'a levél nem ment ki (e-mailek szünetelnek?)';
  {
    P.setProperty(key, now_());
    try { withLock_(() => { const sh = sheetFor_('projects'), row = findRow_(sh, pid); if (!row) return; const q = readRow_('projects', sh, row), vv = parseVideos_(q.videos); vv.filter(v => ids.indexOf(v.id) >= 0).forEach(v => { v.cm = (v.cm || []).concat([{ by: 'Lumos Motion', at: now_(), t: (live ? '💧 Vízjel levéve – értesítő elküldve (' : 'TESZT: vízjel-értesítő csak neked ment ki (') + tos.join(', ') + ')', ts: '' }]).slice(-100); }); q.videos = JSON.stringify(vv); putRow_('projects', sh, q, row); dataBump_(); dbFlush_(); }); } catch (e) { }
  }
  return 'ok';
}
function wmActive_(p) { const b = readAll_('finBilling').find(x => x.projectId === p.id), w = String((b && b.watermark) || '');
  const sales = String(p.id || '').indexOf('sales-') === 0 || /Forrás: Sales App/.test(String(p.notes || ''));
  return (w === '1' || (w !== '0' && sales)) && p.payStatus !== 'teljes'; }
/* Megnyitotta-e az ügyfél: a jóváhagyó oldal betöltésekor (amíg jóváhagyásra vár) feljegyezzük – első és utolsó megnyitás, darabszám */
function clientSeen_(o) {
  try { withLock_(() => { const sh = sheetFor_('projects'), row = findRow_(sh, o.p); if (!row) return; const p = readRow_('projects', sh, row), vids = parseVideos_(p.videos); let ch = false;
    (o.vs && o.vs.length ? o.vs : [o.v]).forEach(id => { const v = vids.find(x => x.id === id);
      if (!v || v.st !== 'leadva') return; ch = true; const t = now_(), first = !v.seenAt; v.seenAt = v.seenAt || t; v.seenLast = t; v.seenN = (Number(v.seenN) || 0) + 1;
      if (first) v.cm = (v.cm || []).concat([{ by: clientFirst_(p, String(o.c || '').split(',')[0]), at: t, t: '👁️ Megnyitotta a jóváhagyó oldalt', ts: '' }]).slice(-100); });
    if (!ch) return; p.videos = JSON.stringify(vids); putRow_('projects', sh, p, row); dataBump_(); dbFlush_(); }); } catch (e) { Logger.log('clientSeen_: ' + e); }
}
/** Érvényes Projekttervező-munkamenet (a csapat tagja nyitja meg az ügyfél linkjét ugyanabban a böngészőben). */
function staffTok_(tok) { if (!tok) return false; try { authUser_(tok); return true; } catch (e) { return false; } }
function clientInfo_(t, seen, vid) { const o = clientTokenRead_(t); if (seen && !o.pv) clientSeen_(o);
  const stOf = st => st === 'jovahagyva' ? 'ok' : st === 'leadva' ? 'wait' : 'mod';
  if (o.vs && o.vs.length > 1) {   // több videó egy linken: a kiválasztott (vagy az első még döntésre váró) videó + a lista
    const p0 = readAll_('projects').find(x => x.id === o.p); if (!p0) throw new Error('A videó nem található.'); const all = parseVideos_(p0.videos);
    const items = o.vs.map(id => all.find(x => x.id === id)).filter(Boolean).map(x => ({ id: x.id, name: x.name, state: stOf(x.st) }));
    if (!items.length) throw new Error('A videó nem található.');
    const cur = (vid && items.find(x => x.id === vid)) || items.find(x => x.state === 'wait') || items[0]; o.v = cur.id;
    const r2 = clientVideo_(o); let wm2 = false; try { wm2 = wmActive_(r2.p); } catch (e) { }
    return { preview: !!o.pv, items: items.map(x => o.pv ? Object.assign({}, x, { state: 'wait' }) : x), cur: cur.id, wm: wm2, wmName: wm2 ? sval_(r2.p.client) : '', project: sval_(r2.p.name), video: r2.v.name, k: r2.v.k, link: r2.v.link, state: o.pv ? 'wait' : stOf(r2.v.st) };
  }
  const r = clientVideo_(o); let wm = false; try { wm = wmActive_(r.p); } catch (e) { }
  if (o.pv) return { preview: true, wm: wm, wmName: wm ? sval_(r.p.client) : '', project: sval_(r.p.name), video: r.v.name, k: r.v.k, link: o.l || r.v.link, state: 'wait' };   // belső előnézet: nem számít megnyitásnak, döntés nincs
  return { wm: wm, wmName: wm ? sval_(r.p.client) : '', project: sval_(r.p.name), video: r.v.name, k: r.v.k, link: r.v.link, state: r.v.st === 'jovahagyva' ? 'ok' : r.v.st === 'leadva' ? 'wait' : 'mod' }; }
/** Belső előnézet a küldő ablakból: ugyanaz az oldal, amit az ügyfél kap – megnyitásnak nem számít, dönteni nem lehet. */
function clientPreview_(u, a) {
  if (u.role !== 'admin' && u.role !== 'editor') throw new Error('FORBIDDEN');
  const pid = str_(a && a.projectId, 64), vid = str_(a && a.id, 40), l = str_(a && a.link, 500).trim();
  clientVideo_({ p: pid, v: vid });
  return { url: FRONTEND_URL + '/' + clientShort_(clientToken_(Object.assign({ p: pid, v: vid, s: String(u.email || ''), c: '', pv: 1, l: /^https?:\/\/\S+$/i.test(l) ? l : '' }, Array.isArray(a.ids) && a.ids.length > 1 ? { vs: a.ids.map(x => str_(x, 40)).slice(0, 30) } : {}))) };
}
/* Az ügyfél megjelenő neve: csak a keresztneve (a kapcsolattartó nevéből, ha az e-mail egyezik; különben az e-mail cím elejéből) – e-mail cím nem látszik */
function clientFirst_(p, em) { em = String(em || '').trim().toLowerCase(); const cn = String(p && p.contactName || '').trim();
  if (cn && (!em || String(p.contactEmail || '').trim().toLowerCase() === em)) return huFirst_(cn);
  const lp = em.split('@')[0].split(/[._-]/)[0]; return lp ? lp.charAt(0).toUpperCase() + lp.slice(1) : 'Ügyfél'; }
function clientDecide_(t, d, fb, vid) {
  if (clientTokenRead_(t).pv) throw new Error('Ez csak előnézet – itt a gombok nem küldenek semmit.');
  const o = clientTokenRead_(t); if (o.vs && o.vs.length > 1) { vid = str_(vid, 40); if (o.vs.indexOf(vid) < 0) throw new Error('Válaszd ki a videót.'); o.v = vid; }   // közös link: a kiválasztott videóról dönt
  const r = clientVideo_(o); fb = str_(fb, 1500).trim();
  if (d === 'note') {   // jóváhagyás után az ügyfél még üzenhet (nem kötelező)
    throw new Error('Üzenetet a jóváhagyással együtt tudsz küldeni.'); if (fb.length < 2) throw new Error('Írd be az üzenetedet.');
    const nm = clientFirst_(r.p, String(o.c || '').split(',')[0]);
    withLock_(() => { const sh = sheetFor_('projects'), row = findRow_(sh, o.p); if (!row) return; const p = readRow_('projects', sh, row), vids = parseVideos_(p.videos), v = vids.find(x => x.id === o.v); if (!v) return;
      v.cm = (v.cm || []).concat([{ by: nm, at: now_(), t: '💬 ' + fb, ts: '' }]).slice(-100); p.videos = JSON.stringify(vids); putRow_('projects', sh, p, row); dataBump_(); dbFlush_(); });
    try { if (o.s) { const subj = 'Üzenet az ügyféltől (jóváhagyás után): ' + r.v.name + ' – ' + r.p.name, url = appUrl_() + '#p=' + o.p + '&v=' + encodeURIComponent(o.v);
        gmailSend_(o.s, subj, subj + '\n\n' + fb + '\n\n' + url, { htmlBody: '<p><b>' + escapeHtml_(subj) + '</b></p><p style="padding:10px 12px;background:#eaf7ef;border-left:4px solid #2e9e62">' + escapeHtml_(fb).replace(/\n/g, '<br>') + '</p><p><a href="' + escapeHtml_(url) + '">A videó megnyitása</a></p>', name: 'Lumos Motion Projekttervező' }); } } catch (e) { Logger.log('Ügyfél-üzenet értesítés: ' + e); }
    return Object.assign(clientInfo_(t, false, o.v), { noted: true });
  }
  if (r.v.st !== 'leadva') return clientInfo_(t, false, o.v);   // már döntöttek (vagy visszakerült az utómunkába)
  const who = { id: 'client', name: clientFirst_(r.p, String(o.c || '').split(',')[0]), email: '', role: 'editor', crewId: '' };
  if (d === 'ok') { videoSet_(who, { projectId: o.p, id: o.v, st: 'jovahagyva' });
    withLock_(() => { const sh = sheetFor_('projects'), row = findRow_(sh, o.p); if (!row) return; const p = readRow_('projects', sh, row), vids = parseVideos_(p.videos), v = vids.find(x => x.id === o.v); if (!v) return;
      v.cm = (v.cm || []).concat([{ by: who.name, at: now_(), t: '✅ Jóváhagyta a videót', ts: '' }]).slice(-100); p.videos = JSON.stringify(vids); putRow_('projects', sh, p, row); dataBump_(); dbFlush_(); });   // a hozzászólásoknál is látszik a jóváhagyás
    if (fb) withLock_(() => { const sh = sheetFor_('projects'), row = findRow_(sh, o.p); if (!row) return; const p = readRow_('projects', sh, row), vids = parseVideos_(p.videos), v = vids.find(x => x.id === o.v); if (!v) return;
      v.cm = (v.cm || []).concat([{ by: who.name, at: now_(), t: '💬 ' + fb, ts: '' }]).slice(-100); p.videos = JSON.stringify(vids); putRow_('projects', sh, p, row); dataBump_(); dbFlush_(); }); }   // jóváhagyáshoz írt üzenet
  else if (d === 'mod') { if (fb.length < 3) throw new Error('Írd le röviden, mit módosítsunk.'); videoSet_(who, { projectId: o.p, id: o.v, st: 'vagas', fb: fb }); }
  else throw new Error('Ismeretlen döntés.');
  if (d === 'ok') { try {   // a videó vágója is értesül a jóváhagyásról (üzenet és link nélkül)
      const c = readAll_('crew').find(x => x.id === r.v.editor), em = c && String(c.email || '').trim(), fn = c ? huFirst_(String(c.name || '')) : '';
      if (em && /@/.test(em)) { const when = Utilities.formatDate(new Date(), SHEET_TZ, 'yyyy. MM. dd. HH:mm'), subj = '✅ Jóváhagyva: ' + r.v.name + ' – ' + r.p.name;
        const html = '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#202124"><p style="margin:0 0 12px">Kedves ' + escapeHtml_(fn || 'Kolléga') + '!</p><p style="margin:0 0 14px">Jó hír: a videót <b>jóváhagyták</b>.</p>'
          + '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px"><tr><td style="background:#eaf7ef;border-left:4px solid #2e9e62;padding:12px 16px;border-radius:0 8px 8px 0"><div style="font-size:15px;font-weight:bold;color:#1e7a46">✓ ' + escapeHtml_(r.v.name) + '</div><div style="font-size:13px;color:#4a5866;margin-top:3px">' + escapeHtml_(r.p.name) + '</div></td></tr></table>'
          + '<p style="margin:0 0 18px">Köszönjük a munkádat!</p><p style="margin:22px 0 0;font-size:12px;color:#80868b;font-style:italic">Ezt az értesítést a Lumos Motion Kft. Projekttervező szoftvere küldte.</p></div>';
        gmailSend_(em, subj, 'Kedves ' + (fn || 'Kolléga') + '!\n\nJó hír: a videót jóváhagyták: ' + r.v.name + ' – ' + r.p.name + '.\n\nKöszönjük a munkádat!', { htmlBody: html, name: 'Lumos Motion Projekttervező', __nk: 'vidOk' }); } } catch (e) { Logger.log('Vágó értesítés (jóváhagyás): ' + e); } }
  try { if (o.s) { const subj = (d === 'ok' ? 'Az ügyfél jóváhagyta: ' : 'Az ügyfél módosítást kér: ') + r.v.name + ' – ' + r.p.name, url = appUrl_() + '#p=' + o.p + '&v=' + encodeURIComponent(o.v);
      const edC = (() => { try { return r.v.editor ? readAll_('crew').find(x => x.id === r.v.editor) : null; } catch (e) { return null; } })(), edMine = edC && String(edC.email || '').trim().toLowerCase() === String(o.s).trim().toLowerCase(), whose = edMine ? 'a munkádat' : edC ? sval_(edC.name) + ' munkáját' : 'a videót';   // a vágó munkáját hagyták jóvá
      const ok = d === 'ok', sc = (() => { try { return readAll_('crew').find(x => String(x.email || '').trim().toLowerCase() === String(o.s).trim().toLowerCase()); } catch (e) { return null; } })(), sfn = sc ? huFirst_(String(sc.name || '')) : '';
      const html = '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#202124"><p style="margin:0 0 12px">Kedves ' + escapeHtml_(sfn || 'Kolléga') + '!</p><p style="margin:0 0 14px">' + (ok ? 'Jó hír: az ügyfél <b>jóváhagyta</b> ' + escapeHtml_(whose) + '.' : 'Az ügyfél <b>módosítást kér</b> a videón.') + '</p>'
        + '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px"><tr><td style="background:' + (ok ? '#eaf7ef;border-left:4px solid #2e9e62' : '#fff4f2;border-left:4px solid #d93025') + ';padding:12px 16px;border-radius:0 8px 8px 0"><div style="font-size:15px;font-weight:bold;color:' + (ok ? '#1e7a46' : '#b3261e') + '">' + (ok ? '✓ ' : '✎ ') + escapeHtml_(r.v.name) + '</div><div style="font-size:13px;color:#4a5866;margin-top:3px">' + escapeHtml_(r.p.name) + '</div>'
        + (fb ? '<div style="font-size:14px;color:#202124;margin-top:10px;padding-top:10px;border-top:1px solid ' + (ok ? '#cfe9d9' : '#f3d0cb') + '"><span style="font-size:12px;color:#6b7680">Az ügyfél üzenete:</span><br>' + escapeHtml_(pinStrip_(fb)).replace(/\n/g, '<br>') + '</div>' : '') + '</td></tr></table>'
        + '<p style="margin:22px 0 0;font-size:12px;color:#80868b;font-style:italic">Ezt az értesítést a Lumos Motion Kft. Projekttervező szoftvere küldte.</p></div>';
      gmailSend_(o.s, subj, 'Kedves ' + (sfn || 'Kolléga') + '!\n\n' + (ok ? 'Jó hír: az ügyfél jóváhagyta ' + whose + ': ' : 'Az ügyfél módosítást kér a videón: ') + r.v.name + ' – ' + r.p.name + '.' + (fb ? '\n\nAz ügyfél üzenete:\n' + fb : ''), { htmlBody: html, name: 'Lumos Motion Projekttervező' }); 
      if (!ok) { try { const c = readAll_('crew').find(x => x.id === r.v.editor), em = c && String(c.email || '').trim(), fn = c ? huFirst_(String(c.name || '')) : '';   // a vágó is megkapja (ügyfél említése nélkül)
        if (em && /@/.test(em) && em.toLowerCase() !== String(o.s).trim().toLowerCase()) { const fbc = pinStrip_(fb);
          const h2 = '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#202124"><p style="margin:0 0 12px">Kedves ' + escapeHtml_(fn || 'Kolléga') + '!</p><p style="margin:0 0 14px"><b>Módosítást kértek</b> a videón.</p>'
            + '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px"><tr><td style="background:#fff4f2;border-left:4px solid #d93025;padding:12px 16px;border-radius:0 8px 8px 0"><div style="font-size:15px;font-weight:bold;color:#b3261e">✎ ' + escapeHtml_(r.v.name) + '</div><div style="font-size:13px;color:#4a5866;margin-top:3px">' + escapeHtml_(r.p.name) + '</div>'
            + (fbc ? '<div style="font-size:14px;color:#202124;margin-top:10px;padding-top:10px;border-top:1px solid #f3d0cb"><span style="font-size:12px;color:#6b7680">A kért módosítás:</span><br>' + escapeHtml_(fbc).replace(/\n/g, '<br>') + '</div>' : '') + '</td></tr></table>'
            + '<p style="margin:22px 0 0;font-size:12px;color:#80868b;font-style:italic">Ezt az értesítést a Lumos Motion Kft. Projekttervező szoftvere küldte.</p></div>';
          gmailSend_(em, 'Módosítást kértek: ' + r.v.name + ' – ' + r.p.name, 'Kedves ' + (fn || 'Kolléga') + '!\n\nMódosítást kértek a videón: ' + r.v.name + ' – ' + r.p.name + '.' + (fbc ? '\n\nA kért módosítás:\n' + fbc : ''), { htmlBody: h2, name: 'Lumos Motion Projekttervező', __nk: 'vidMod' }); } } catch (e) { Logger.log('Vágó értesítés (módosítás): ' + e); } } } } catch (e) { Logger.log('Ügyfél-döntés értesítés: ' + e); }
  clientSummary_(o, t);   // ha minden videóról döntött: visszaigazoló összefoglaló az ügyfélnek
  return clientInfo_(t, false, o.v);
}
/** Visszaigazolás az ügyfélnek: amikor a linken szereplő összes videóról döntött, egy összefoglaló levél megy (jóváhagyott/módosítandó videók, a saját üzeneteivel). */
function clientSummary_(o, t) {
  try {
    const p = readAll_('projects').find(x => x.id === o.p); if (!p) return;
    const all = parseVideos_(p.videos), ids = o.vs && o.vs.length > 1 ? o.vs : [o.v], vs = ids.map(id => all.find(x => x.id === id)).filter(Boolean);
    if (!vs.length || vs.some(v => v.st === 'leadva')) return;   // még van döntésre váró videó
    const tos = String(o.c || '').split(/\s*,\s*/).filter(x => /@/.test(x)); if (!tos.length) return;
    const nm = clientFirst_(p, tos[0]);
    const rows = vs.map(v => { const ok = v.st === 'jovahagyva'; let msg = '';
      if (ok) { const c = (v.cm || []).filter(x => x.by === nm && /^💬 /.test(String(x.t || '')) && (!v.okAt || String(x.at) >= String(v.okAt))).pop(); msg = c ? String(c.t).replace(/^💬 /, '') : ''; }
      else if (v.fbBy === nm) msg = String(v.fb || ''); else return null;   // nem az ügyfél döntött róla
      return { v: v, ok: ok, msg: pinStrip_(msg).trim() }; }).filter(Boolean);
    if (!rows.length) return;
    const nOk = rows.filter(r => r.ok).length, nMod = rows.length - nOk, multi = rows.length > 1;
    const code = /^[A-Za-z0-9]{6,16}$/.test(String(t || '')) ? String(t) : clientShort_(String(t)), url = FRONTEND_URL + '/' + code;
    const art = w => /^[aáeéiíoóöőuúüű]/i.test(String(w || '').replace(/^[\s„"'(]+/, '')) ? 'az' : 'a', vn = rows[0].v.name;
    const lead = multi ? 'Köszönjük a visszajelzésedet: ' + [nOk ? nOk + ' videót jóváhagytál' : '', nMod ? nMod + ' videóhoz módosítást kértél' : ''].filter(Boolean).join(', ') + '.'
      : nOk ? 'Köszönjük, rögzítettük, hogy jóváhagytad ' + art(vn) + ' „' + vn + '” videót.' : 'Köszönjük, rögzítettük a módosítási kérésedet ' + art(vn) + ' „' + vn + '” videóhoz.';
    const next = nMod ? 'A kért módosításokon dolgozunk, és szólunk, amint elkészültek.' : 'Köszönjük a jóváhagyást!';
    const box = r => '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 10px;width:100%;max-width:560px"><tr><td style="background:' + (r.ok ? '#eaf7ef;border-left:4px solid #2e9e62' : '#fff4f2;border-left:4px solid #d93025') + ';padding:12px 16px;border-radius:0 8px 8px 0">'
      + '<div style="font-size:15px;font-weight:bold;color:' + (r.ok ? '#1e7a46' : '#b3261e') + '">' + (r.ok ? '✓ ' : '✎ ') + escapeHtml_(r.v.name) + '</div><div style="font-size:13px;color:#4a5866;margin-top:3px">' + (r.ok ? 'Jóváhagyva' : 'Módosítást kértél') + '</div>'
      + (r.msg ? '<div style="font-size:14px;color:#202124;margin-top:10px;padding-top:10px;border-top:1px solid ' + (r.ok ? '#cfe9d9' : '#f3d0cb') + '"><span style="font-size:12px;color:#6b7680">Az üzeneted:</span><br>' + escapeHtml_(r.msg).replace(/\n/g, '<br>') + '</div>' : '') + '</td></tr></table>';
    const html = '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#202124"><p style="margin:0 0 12px">Kedves ' + escapeHtml_(nm) + '!</p><p style="margin:0 0 14px">' + escapeHtml_(lead) + '</p>'
      + '<p style="margin:0 0 10px;font-weight:bold">' + escapeHtml_(sval_(p.name)) + '</p>' + rows.map(box).join('')
      + '<p style="margin:16px 0 14px">' + escapeHtml_(next) + '</p><p style="margin:0 0 14px">A videókat és a döntéseidet itt bármikor visszanézheted: <a href="' + escapeHtml_(url) + '">jóváhagyó oldal</a></p>'
      + '<p style="margin:0 0 0">Ha kérdésed van, egyszerűen válaszolj erre a levélre.</p><p style="margin:22px 0 0;font-size:12px;color:#80868b;font-style:italic">Ezt az értesítést a Lumos Motion Kft. Projekttervező szoftvere küldte.</p></div>';
    const text = 'Kedves ' + nm + '!\n\n' + lead + '\n\n' + sval_(p.name) + '\n' + rows.map(r => '\n' + (r.ok ? '✓ ' : '✎ ') + r.v.name + ' – ' + (r.ok ? 'jóváhagyva' : 'módosítást kértél') + (r.msg ? '\nAz üzeneted: ' + r.msg : '')).join('\n') + '\n\n' + next + '\n\nA jóváhagyó oldal: ' + url + '\n\nHa kérdésed van, egyszerűen válaszolj erre a levélre.';
    const live = clientMailLive_(), to = live ? tos.join(', ') : String(o.s || ''); if (!to) return;
    const subj = (live ? '' : '[TESZT – valójában neki: ' + tos.join(', ') + '] ') + 'Visszaigazolás: ' + sval_(p.name) + (multi ? ' – ' + rows.length + ' videó' : ' – ' + rows[0].v.name);
    const opts = { htmlBody: html, name: 'Lumos Motion' }; if (o.s && /@/.test(o.s)) opts.replyTo = o.s;
    gmailSend_(to, subj, text, opts);
  } catch (e) { Logger.log('Ügyfél visszaigazolás: ' + e); }
}
let FB_MAIL_ = null;
function videoSet_(u, a) {
  a = a || {};
  const pid = str_(a.projectId, 64), vid = str_(a.id, 40), mgr = u.role === 'admin' || u.role === 'editor';
  const isCutter = readAll_('crewAssign').some(r => r.projectId === pid && r.crewId === u.crewId && r.role === 'Vágó');
  if (!mgr && !isCutter) throw new Error('FORBIDDEN: Csak a projekt vágója módosíthatja a videók állapotát.');
  let p, changed = '';
  withLock_(() => {
    const sh = sheetFor_('projects'), row = findRow_(sh, pid); if (!row) throw new Error('A projekt nem található.');
    p = readRow_('projects', sh, row);
    if (p.status === 'atadva' || p.status === 'lemondva') throw new Error('A projekt már le van zárva.');
    const vids = parseVideos_(p.videos), v = vids.find(x => x.id === vid); if (!v) throw new Error('A videó nem található.');
    if (a.editor !== undefined) {
      if (!mgr) throw new Error('FORBIDDEN: A vágót a projektvezető jelöli ki.');
      const ed = str_(a.editor, 64); if (ed && !readAll_('crew').some(c => c.id === ed)) throw new Error('Ismeretlen szakember.');
      v.editor = ed; changed += 'vágó: ' + ed;
    }
    if (a.name !== undefined) { if (!mgr) throw new Error('FORBIDDEN: A videó nevét a projektvezető módosíthatja.'); const nm = str_(a.name, 120).trim(); if (!nm) throw new Error('Adj nevet a videónak.'); v.name = nm; v.cn = 1; changed += (changed ? ', ' : '') + 'név: ' + nm; }
    if (a.link !== undefined && a.st === undefined) {   // új link (pl. lejárt / forgalmi limites pCloud-link helyett): a vezető vagy a videó vágója
      if (!mgr && !(v.editor && v.editor === u.crewId)) throw new Error('FORBIDDEN: A linket a vezető vagy a videó vágója cserélheti.');
      if (v.st !== 'vagas' && !(mgr && !v.link)) throw new Error('Linket csak „Utómunka alatt” állapotban lehet beilleszteni (vagy belső ellenőrzésre küldéskor).');   // a vezető a hiányzó linket bármikor pótolhatja
      const ln = String(a.link || '').trim(); if (!/^https?:\/\/\S+$/i.test(ln)) throw new Error('Illeszd be a videó linkjét (https://…).');
      vidSetLink_(v, str_(ln, 500)); changed += (changed ? ', ' : '') + 'új link';
    }
    if (a.st !== undefined) {
      if (VIDEO_STATES_.indexOf(a.st) < 0) throw new Error('Ismeretlen állapot.');
      if (v.st === 'jovahagyva' && a.st !== 'jovahagyva' && u.role !== 'admin') throw new Error('A jóváhagyott videót csak az ügyvezető veheti vissza.');
      if (a.st === 'jovahagyva' && !v.link && !(a.link && /^https?:\/\/\S+$/i.test(String(a.link).trim()))) throw new Error('Jóváhagyottnak csak linkkel jelölhető a videó.');
      if (!mgr && !(a.st === 'vagasra' && v.st === 'vagas' && (!v.editor || v.editor === u.crewId)) && (['vagas', 'ellen'].indexOf(a.st) < 0 || v.st === 'jovahagyva' || v.st === 'leadva' || (v.editor && v.editor !== u.crewId))) throw new Error('FORBIDDEN: ezt az állapotot nem állíthatod be.');
      if (mgr && (a.st === 'modositas' || a.st === 'vagas') && a.fb) { v.fb = str_(a.fb, 1000); v.fbBy = u.name; v.fbAt = now_(); v.cm = (v.cm || []).concat([{ by: u.name, at: v.fbAt, t: '↩ ' + v.fb, ts: '' }]).slice(-100); if (u.id !== 'client') FB_MAIL_ = { v: v, by: u.name }; }   /* az ügyfél kérésénél a vágó az új stílusú levelet kapja (clientDecide_) */   // visszadobás indokkal → a vágó e-mailt kap
      if (mgr && a.link !== undefined && /^https?:\/\/\S+$/i.test(String(a.link).trim())) vidSetLink_(v, str_(String(a.link).trim(), 500));   // e-mail nélküli áthelyezésnél is a videó linkje
      if (a.st === 'jovahagyva' && v.st !== 'jovahagyva') v.okAt = now_();   // a jóváhagyás időpontja (a videóablakban látszik)
      if (a.st === 'leadva' && v.st !== 'leadva') { v.seenAt = ''; v.seenLast = ''; v.seenN = 0; }   // újbóli leadás: a korábbi megnyitás már nem számít
      v.st = a.st; if (a.st === 'leadva') v.at = today_(); if (!v.editor && !mgr) v.editor = u.crewId; changed += (changed ? ', ' : '') + v.name + ': ' + a.st;
    }
    p.videos = JSON.stringify(vids);
    const allDel = vids.length > 0 && vids.every(x => x.st === 'leadva' || x.st === 'jovahagyva');   // minden videó leadva → a projekt jóváhagyásra vár; ha újra nyitnak egyet, vissza az utómunkába
    if (p.status === 'utomunka' && allDel) { p.status = 'jovahagyas'; p.leadvaAt = p.leadvaAt || today_();
      const sd = String(p.stepsDone || '').split(',').filter(String); ['tervezes', 'helyszin', 'utomunka'].forEach(x => { if (sd.indexOf(x) < 0) sd.push(x); }); p.stepsDone = sd.join(','); }
    else if ((p.status === 'jovahagyas' || p.status === 'leadva') && vids.length && !allDel) { p.status = 'utomunka'; p.leadvaAt = ''; }
    p.updatedAt = now_(); p.updatedBy = u.name; p.mutationId = Utilities.getUuid();
    putRow_('projects', sh, p, row); dataBump_(); dbFlush_();
  });
  logEvent_(u, 'Videó állapota', p.name, changed);
  if (FB_MAIL_) { const fm = FB_MAIL_; FB_MAIL_ = null; try { const c = readAll_('crew').find(x => x.id === fm.v.editor), em = c && String(c.email || '').trim();
    if (em) { const url = appUrl_() + '#p=' + pid + '&v=' + encodeURIComponent(fm.v.id), first = huFirst_(String(c.name || ''));
      gmailSend_(em, 'Módosítást kér: ' + fm.v.name + ' – ' + p.name, 'Kedves ' + first + '!\n\n' + fm.by + ' átnézte, és módosítást kér: ' + fm.v.name + ' – ' + p.name + (fm.v.fb ? '\n\n' + pinStrip_(fm.v.fb) : '') + '\n\n' + url,
        { htmlBody: '<p>Kedves ' + escapeHtml_(first) + '!</p><p><b>' + escapeHtml_(fm.by) + '</b> átnézte, és módosítást kér: <b>' + escapeHtml_(fm.v.name) + '</b> – ' + escapeHtml_(p.name) + '</p>' + (fm.v.fb ? '<p style="padding:10px 12px;background:#fff4f2;border-left:4px solid #d93025">' + escapeHtml_(pinStrip_(fm.v.fb)).replace(/\n/g, '<br>') + '</p>' : '') + '<p><a href="' + escapeHtml_(url) + '">A videó megnyitása</a></p>', name: 'Lumos Motion Projekttervező', __nk: 'vidMod' }); } } catch (e) { Logger.log('Visszadobás e-mail hiba: ' + e); } }
  return { project: projectView_(fullProject_(p), u) };
}
function projectView_(p, u) {
  const q = Object.assign({}, p);
  const role = u && u.role;
  if (role === 'crew' && q.lead !== u.crewId) {   // szakember: kapcsolattartóként a projektvezetőt látja (a projektvezető az ügyfélét)
    const m = CREW_MAP_CACHE_ || (CREW_MAP_CACHE_ = byId_(readAll_('crew'))), l = m[q.lead];
    q.contactName = l ? l.name + ' (projektvezető)' : ''; q.contactPhone = l ? String(l.phone || '') : ''; q.contactEmail = l ? String(l.email || '') : '';
  }
  // személyes jegyzetek: a szakember csak a sajátját kapja meg
  const notes = parseNotes_(q.crewNotes);
  q.crewNotes = role === 'crew' ? (u.crewId && notes[u.crewId] ? { [u.crewId]: notes[u.crewId] } : {}) : notes;
  q.crewDays = parseCrewDays_(q.crewDays);
  q.deliveryLinks = parseLinks_(q.deliveryLinks);
  q.videos = parseVideos_(q.videos); if (role === 'crew') q.videos = q.videos.filter(x => u.crewId && x.editor === u.crewId).map(x => Object.assign({}, x, { seenAt: '', seenLast: '', seenN: 0, cm: (x.cm || []).filter(c => !/^👁️ Megnyitotta a jóváhagyó oldalt/.test(String(c.t || ''))).map(c => Object.assign({}, c, { t: /^(Ügyfélnek elküldve|TESZT: az ügyfélnek)/.test(String(c.t || '')) ? 'Továbbküldve jóváhagyásra' : String(c.t || '').replace(/\s*\([^()]*@[^()]*\)/g, '').replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '…') })) }));   // a vágó nem látja az ügyfél e-mail címét   // a vágó csak a saját videóit látja
  q.editTasks = parseEditTasks_(q.editTasks);
  q.recRooms = parseRooms_(q.recRooms);
  q.rentals = parseRentals_(q.rentals).map(r => role === 'crew' ? { id: r.id, crewId: r.crewId, name: r.name, company: r.company, own: r.own } : r);
  if (!q.status || q.status === 'egyeztetes') q.status = 'tervezes';   // az „Egyeztetés” lépés megszűnt: a tervezés az első
  if (role === 'admin') { const v = Number(q.quotePrice); q.projectValue = q.quotePrice === '' || q.quotePrice == null || !isFinite(v) ? null : v; q.extras = parseExtras_(q.extras); } else delete q.extras;
  delete q.quotePrice;
  if (role === 'admin' || role === 'editor') q.fees = parseFees_(q.fees);
  else { const mine = role === 'crew' && u.crewId ? parseFees_(q.fees).find(f => f.crewId === u.crewId) : null; if (mine && mine.amount) q.myFee = { amount: mine.amount, dayAmounts: mine.dayAmounts }; delete q.fees; }   // a szakember csak a saját díját látja
  // díjcsökkentések: vezetők mindet, a szakember csak a saját, jóváhagyott tételeit látja
  const pens = parsePen_(q.penalties);
  q.penalties = role === 'crew' ? pens.filter(x => x.crewId === u.crewId && x.status === 'approved').map(x => Object.assign({}, x, { copyEmail: '' })) : (role === 'admin' || role === 'editor' ? pens : []);
  // termelői keret: az ügyvezető a beállítást (% vagy Ft) látja, a termelési vezető csak a kiszámolt forintösszeget
  const mode = q.budgetMode === 'pct' ? 'pct' : q.budgetMode === 'ft' ? 'ft' : '', bv = Number(q.budgetVal);
  const val = Number(p.quotePrice);
  const budgetFt = !mode || q.budgetVal === '' || q.budgetVal == null || !isFinite(bv) ? null
    : mode === 'pct' ? (isFinite(val) && val > 0 ? Math.round(prodBase_(p) * bv / 100) : null) : Math.round(bv);
  if (role === 'admin') { q.budgetMode = mode; q.budgetVal = mode && isFinite(bv) && q.budgetVal !== '' ? bv : null; q.budgetFt = budgetFt; }
  else { delete q.budgetMode; delete q.budgetVal; if (role === 'editor') q.budgetFt = budgetFt; }
  if (role === 'admin' || role === 'editor') q.crewFinal = parseCrewFinal_(q.crewFinal); else delete q.crewFinal;
  { let ef = null; try { ef = q.eqFinal ? JSON.parse(q.eqFinal) : null; } catch (e) {} q.eqFinal = role === 'admin' || role === 'editor' ? ef : null; }
  if (role === 'crew') { delete q.client; delete q.clientTax; delete q.clientAddress; }   // a szakember nem látja az ügyfelet
  if (role !== 'admin') delete q.payStatus;   // a fizetési állapotot csak az ügyvezető látja
  const request = parseBudgetRequest_(q.budgetRequest);
  if (role === 'admin' || role === 'editor') q.budgetRequest = request;
  else delete q.budgetRequest;
  return q;
}

function fullProject_(p) {
  const q = Object.assign({}, p);
  q.crew = readAll_('crewAssign').filter(r => r.projectId === p.id).map(r => ({ crewId: r.crewId, role: r.role }));
  q.equipment = readAll_('eqAssign').filter(r => r.projectId === p.id).map(r => ({ itemId: r.itemId, qty: r.qty || 1, crewId: r.crewId || '' }));
  delete q.mutationId;
  return q;
}

/* ===================== CSAPAT VÉGLEGESÍTÉSE ===================== */
/* A beosztott stáb csak a „Csapat véglegesítése” gombra kerül be a projekt naptár-eseményébe vendégként.
   Ekkor minden tag e-mailt kap az appból, és a Google Naptár is értesíti (ha a Calendar speciális szolgáltatás be van kapcsolva). */
function parseCrewFinal_(raw) {
  let x = raw; if (typeof raw === 'string') { try { x = JSON.parse(raw || 'null'); } catch (e) { return null; } }
  if (!x || !x.at || !Array.isArray(x.ids)) return null;
  const sigs = {}; if (x.sigs && typeof x.sigs === 'object') Object.keys(x.sigs).forEach(k => { sigs[str_(k, 64)] = str_(x.sigs[k], 2000); });
  return { at: str_(x.at, 30), by: str_(x.by, 120), ids: x.ids.map(i => str_(i, 64)).filter(Boolean), notified: Array.isArray(x.notified) ? x.notified.map(n => str_(n, 120)) : [], sentTo: Array.isArray(x.sentTo) ? x.sentTo.slice(0, 60).map(o => ({ name: str_(o && o.name, 120), email: str_(o && o.email, 160) })) : [], sigs: sigs };
}
/* Egy tag „lenyomata”: szerepek, eszközök, bérelt/saját eszközök, napok. Ha változik, újra értesítjük.
   Ugyanez a számítás fut a felületen is (core.js: crewSig), hogy a „módosult” jelzés egyezzen. */
function sigCore_(s) { const a = String(s || '').split('|'); return (a[0] || '') + '|' + (a[3] || ''); }
function crewSig_(p, cid) {
  const roles = (p.lead === cid ? ['Projektvezető'] : []).concat((p.crew || []).filter(a => a.crewId === cid).map(a => a.role)).sort();
  const eq = (p.equipment || []).filter(e => (e.crewId || '') === cid).map(e => e.itemId + 'x' + (Number(e.qty) || 1)).sort();
  const rent = parseRentals_(p.rentals).filter(r => (r.crewId || '') === cid).map(r => r.name).sort();
  const days = (parseCrewDays_(p.crewDays)[cid] || []).slice().sort();
  return roles.join('+') + '|' + eq.join(',') + '|' + rent.join(',') + '|' + days.join(',');
}
function crewMembers_(p) {
  const crewMap = byId_(readAll_('crew')), roles = {};
  if (p.lead && crewMap[p.lead]) roles[p.lead] = ['Projektvezető'];
  (p.crew || []).forEach(c => { if (crewMap[c.crewId] && c.role !== 'Értékesítő') (roles[c.crewId] = roles[c.crewId] || []).push(c.role); });   /* az értékesítő nem kap beosztásos levelet / naptármeghívót */
  const days = parseCrewDays_(p.crewDays);
  return Object.keys(roles).map(id => ({ id: id, name: crewMap[id].name, phone: crewMap[id].phone || '', email: String(crewMap[id].email || '').trim().toLowerCase(), roles: roles[id], days: days[id] || [] }));
}
/* ===== E-mail kapcsoló: amíg nincs bekapcsolva (Beállítások → E-mail értesítések), az app SEMMILYEN e-mailt nem küld:
   sem a szakembereknek, sem az ügyfeleknek (számlázz.hu), sem naptár-meghívót. Alapértelmezés: kikapcsolva. */
const MAIL_ON_PROPERTY = 'LUMOS_PM_MAIL_ON';
/* E-mail értesítések: főkapcsoló + típusonként külön kapcsoló (alapból mind be, ha a főkapcsoló be van kapcsolva) */
const MAIL_CATS_PROPERTY = 'LUMOS_PM_MAIL_CATS';
const MAIL_CATS_ = ['assign', 'calendar', 'eqlist', 'penalty', 'penAdmin', 'invoice', 'invite', 'payStatement'];
function mailCats_() { let o = {}; try { o = JSON.parse(PropertiesService.getScriptProperties().getProperty(MAIL_CATS_PROPERTY) || '{}') || {}; } catch (e) { o = {}; } const out = {}; MAIL_CATS_.forEach(k => { out[k] = o[k] !== false; }); return out; }
const MAIL_CC_PROPERTY = 'LUMOS_PM_MAIL_CC';
const MAIL_CC_DEFAULT_ = { assign: [], eqlist: ['actor'], penalty: [], penAdmin: [], payStatement: [] };   // másolat (CC): admin = ügyvezetők, editor = termelési vezetők, actor = aki a műveletet végzi
function mailCc_() { let o = {}; try { o = JSON.parse(PropertiesService.getScriptProperties().getProperty(MAIL_CC_PROPERTY) || '{}') || {}; } catch (e) { o = {}; }
  const out = {}; Object.keys(MAIL_CC_DEFAULT_).forEach(k => { out[k] = Array.isArray(o[k]) ? o[k].filter(x => ['admin', 'editor', 'actor'].indexOf(x) >= 0) : MAIL_CC_DEFAULT_[k].slice(); }); return out; }
function mailCcList_(cat, actor) {
  const want = mailCc_()[cat] || []; if (!want.length) return [];
  const out = []; if (want.indexOf('actor') >= 0 && actor) out.push(String(actor).toLowerCase());
  try { loadUsers_().forEach(x => { if (!x.disabled && x.email && want.indexOf(x.role) >= 0) out.push(String(x.email).toLowerCase()); }); } catch (e) { }
  return out.filter((m, i) => out.indexOf(m) === i);
}
function mailOn_(cat) { try { if (PropertiesService.getScriptProperties().getProperty(MAIL_ON_PROPERTY) !== '1') return false; return !cat || mailCats_()[cat] !== false; } catch (e) { return false; } }
/* A szakember saját értesítési beállításai (Stáb lap „notify” oszlop, JSON): e-mail és appon belüli értesítések típusonként ki-be kapcsolhatók. */
const NOTIFY_KEYS_ = ['assign', 'eqlist', 'penalty', 'vidOk', 'vidMod', 'vidCm', 'appSent', 'appOk', 'appToast'];
const SALES_NOTIFY_KEYS_ = ['salePay', 'saleDone', 'appPay', 'appToast'];   // értékesítő: kifizetés érkezett, projekt átadva (e-mail), kifizetés a csengőben, felugró értesítés
function salesNotifyOf_(us) { const n = (us && us.notify) || {}; const o = {}; SALES_NOTIFY_KEYS_.forEach(k => { o[k] = n[k] !== false; }); return o; }
function crewNotifyOf_(c) { let n = {}; try { n = JSON.parse(String((c && c.notify) || '{}')) || {}; } catch (e) { n = {}; } const o = {}; NOTIFY_KEYS_.forEach(k => { o[k] = n[k] !== false; }); return o; }
function crewNotifyOk_(to, key) { try { const em = String(to || '').trim().toLowerCase(); if (!em || em.indexOf(',') >= 0) return true; const c = readAll_('crew').find(x => String(x.email || '').trim().toLowerCase() === em); return !c || crewNotifyOf_(c)[key] !== false; } catch (e) { return true; } }
/** Saját értesítési beállítások lekérése / módosítása (a bejelentkezett szakember). a: {key, on} – kulcs nélkül csak lekérés. */
function myNotify_(u, a) {
  if (u.role === 'sales') { const key = a && a.key; if (key != null && SALES_NOTIFY_KEYS_.indexOf(key) < 0) throw new Error('Ismeretlen értesítéstípus.');
    if (key == null) return { notify: salesNotifyOf_(loadUsers_().find(x => x.id === u.id)) };
    if (u.realRole) throw new Error('Értékesítő nézetben csak megnézni lehet – a beállítást az értékesítő maga módosíthatja.');
    let out; withLock_(() => { const us = loadUsers_(), me = us.find(x => x.id === u.id); if (!me) throw new Error('A felhasználó nem található.'); const n = salesNotifyOf_(me); n[key] = !!a.on; const st = {}; SALES_NOTIFY_KEYS_.forEach(k => { if (n[k] === false) st[k] = false; }); me.notify = st; saveUsers_(us); out = n; });
    return { notify: out }; }
  if (!u.crewId) throw new Error('Ehhez a fiókhoz nem tartozik szakember a stáblistában.');
  const key = a && a.key; if (key != null && NOTIFY_KEYS_.indexOf(key) < 0) throw new Error('Ismeretlen értesítéstípus.');
  let out;
  if (key != null && u.realRole) throw new Error('Szakember nézetben csak megnézni lehet – a beállítást a szakember maga módosíthatja.');
  if (key == null) { out = crewNotifyOf_(readAll_('crew').find(x => x.id === u.crewId)); return { notify: out }; }
  withLock_(() => { const sh = sheetFor_('crew'), row = findRow_(sh, u.crewId); if (!row) throw new Error('A szakember nem található.'); const c = readRow_('crew', sh, row);
    const n = crewNotifyOf_(c); n[key] = !!a.on; const st = {}; NOTIFY_KEYS_.forEach(k => { if (n[k] === false) st[k] = false; }); c.notify = JSON.stringify(st); putRow_('crew', sh, c, row); dbFlush_(); out = n; });
  return { notify: out };
}
/** Értékesítő értesítése a saját (megnyert) lehetőségéhez tartozó projektről: kifizetés érkezett / átadva. */
function salesNotify_(pid, kind, st) {
  try {
    const p = readAll_('projects').find(x => x.id === pid); if (!p) return;
    const owners = readAll_('deals').filter(d => d.projectId === pid && d.stage === 'nyert').map(d => String(d.ownerId || '')).filter((x, i, a) => x && a.indexOf(x) === i);
    if (!owners.length) return; const us = loadUsers_();
    owners.forEach(oid => { const su = us.find(x => x.id === oid && x.role === 'sales' && !x.disabled); const em = su && String(su.email || '').trim(); if (!em || !/@/.test(em)) return;
      const nk = kind === 'pay' ? 'salePay' : 'saleDone'; if (salesNotifyOf_(su)[nk] === false) return;
      const fn = huFirst_(String(su.name || '')), pn = sval_(p.name), cl = sval_(p.client);
      const head = kind === 'pay' ? (st === 'teljes' ? 'Jó hír: az ügyfeled <b>kifizette</b> a teljes összeget.' : 'Jó hír: az ügyfeled <b>kifizette</b> az előleget / díjbekérőt.') : 'A projekted <b>elkészült és átadtuk</b> az ügyfélnek.';
      const html = '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#202124"><p style="margin:0 0 12px">Kedves ' + escapeHtml_(fn || 'Kolléga') + '!</p><p style="margin:0 0 14px">' + head + '</p>'
        + '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px"><tr><td style="background:#eaf7ef;border-left:4px solid #2e9e62;padding:12px 16px;border-radius:0 8px 8px 0"><div style="font-size:15px;font-weight:bold;color:#1e7a46">' + (kind === 'pay' ? '💰 ' : '✓ ') + escapeHtml_(pn) + '</div><div style="font-size:13px;color:#4a5866;margin-top:3px">' + escapeHtml_(cl) + '</div></td></tr></table>'
        + '<p style="margin:22px 0 0;font-size:12px;color:#80868b;font-style:italic">Ezt az értesítést a Lumos Motion Kft. Projekttervező szoftvere küldte.</p></div>';
      gmailSend_(em, (kind === 'pay' ? 'Kifizetés érkezett: ' : 'Átadva: ') + pn, 'Kedves ' + (fn || 'Kolléga') + '!\n\n' + head.replace(/<\/?b>/g, '') + '\n\n' + pn + (cl ? ' – ' + cl : ''), { htmlBody: html, name: 'Lumos Motion Projekttervező' }); });
  } catch (e) { Logger.log('Értékesítő értesítés: ' + e); }
}
let SALES_DONE_ = null;
/** Formázott (HTML) jegyzet → sima szöveg (naptár, levél). */
function notesText_(s) { s = String(s || ''); if (!/<\/?(p|div|br|b|strong|i|em|u|ul|ol|li|a|h[1-6])\b/i.test(s)) return s; return s.replace(/<br\s*\/?>/gi, '\n').replace(/<li[^>]*>/gi, '• ').replace(/<\/(p|div|li|h[1-6])>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\n{3,}/g, '\n\n').trim(); }
const AUTO_FOOT_ = 'Ezt az értesítést a Lumos Motion Kft. Projekttervező szoftvere küldte.';
function gmailSend_(to, subject, text, opts, cat) {
  opts = opts || {};
  if (opts.name === 'Lumos Motion Projekttervező' && String(opts.htmlBody || '').indexOf(AUTO_FOOT_) < 0) {   // automatikus értesítés: egységes lábléc (dőlt)
    if (opts.htmlBody) opts.htmlBody += '<p style="color:#7b8794;font-size:12px;font-style:italic;margin-top:18px">' + AUTO_FOOT_ + '</p>';
    text = String(text || '') + '\n\n' + AUTO_FOOT_; } const actor = opts.__actor; delete opts.__actor;
  { const nk = opts.__nk || ({ assign: 1, eqlist: 1 }[cat] ? cat : ''); delete opts.__nk; if (nk && !crewNotifyOk_(to, nk)) { Logger.log('A címzett kikapcsolta (' + nk + '): ' + to + ' – ' + subject); return false; } }   // a szakember saját beállítása
  if (!mailOn_(cat)) { Logger.log('E-mail szünetel, nem ment ki: ' + to + ' – ' + subject); return false; }
  if (cat) { const toL = String(to).toLowerCase().split(','), cc = mailCcList_(cat, actor).concat(opts.cc ? String(opts.cc).split(',') : []).map(x => x.trim().toLowerCase()).filter(x => x && toL.indexOf(x) < 0);
    const uniq = cc.filter((m, k) => cc.indexOf(m) === k); if (uniq.length) opts.cc = uniq.join(','); else delete opts.cc; }
  const dwd = opts.__dwd; delete opts.__dwd;
  if (dwd && !opts.inlineImages) { try { dwdSend_(dwd, to, subj_(subject), text, opts); return true; } catch (e) { Logger.log('Domainszintű küldés sikertelen (' + dwd + '), a központi fiókról megy: ' + e); } }
  GmailApp.sendEmail(to, subj_(subject), text, opts); return true;
}

/* ===================== KÜLDÉS A KOLLÉGA SAJÁT CÍMÉRŐL (Google Workspace domainszintű megbízás) =====================
   Egy szolgáltatásfiók (JSON-kulcs a Beállításokban) a Workspace adminban engedélyezett gmail.send jogosultsággal
   a kolléga nevében, az ő postafiókjából küld (az Elküldött mappájában is ott lesz). Ha nincs beállítva vagy hibázik,
   a levél a megszokott módon, a központi fiókról megy (a kolléga nevével, válaszcímével). */
const DWD_PROPERTY = 'LUMOS_DWD_SA';
const DWD_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
function dwdKey_() { try { const o = JSON.parse(PropertiesService.getScriptProperties().getProperty(DWD_PROPERTY) || 'null'); return o && o.client_email && o.private_key ? o : null; } catch (e) { return null; } }
function dwdOn_() { return !!dwdKey_(); }
function dwdDomainOk_(email) { const d = String(email || '').toLowerCase().split('@')[1] || ''; return !!d && d === String(Session.getEffectiveUser().getEmail() || '').toLowerCase().split('@')[1]; }
const b64url_ = bytes => Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
function dwdToken_(email) {
  const k = dwdKey_(); if (!k) throw new Error('Nincs beállítva szolgáltatásfiók.');
  const ck = 'dwd_' + Utilities.base64EncodeWebSafe(email).slice(0, 200), c = CacheService.getScriptCache(), hit = c.get(ck); if (hit) return hit;
  const now = Math.floor(Date.now() / 1000);
  const head = b64url_(Utilities.newBlob(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).getBytes());
  const body = b64url_(Utilities.newBlob(JSON.stringify({ iss: k.client_email, scope: DWD_SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600, sub: email })).getBytes());
  const sig = b64url_(Utilities.computeRsaSha256Signature(head + '.' + body, k.private_key));
  const r = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', { method: 'post', muteHttpExceptions: true, payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: head + '.' + body + '.' + sig } });
  const j = JSON.parse(r.getContentText() || '{}');
  if (r.getResponseCode() !== 200 || !j.access_token) throw new Error(dwdErr_(j));
  c.put(ck, j.access_token, 3000); return j.access_token;
}
function dwdErr_(j) {
  const e = String((j && (j.error_description || j.error)) || 'ismeretlen hiba');
  if (/unauthorized_client|not authorized/i.test(e)) return 'A Workspace adminban még nincs engedélyezve (Domainszintű delegálás: ügyfél-azonosító + ' + DWD_SCOPE + ').';
  if (/invalid_grant/i.test(e)) return 'A Google elutasította (' + e + ') – létező lumosmotion.com-os címről küldünk? Pontos a szerver órája / a kulcs érvényes?';
  return e;
}
const mimeWord_ = t => /^[\x20-\x7e]*$/.test(t) ? t : '=?UTF-8?B?' + Utilities.base64Encode(Utilities.newBlob(String(t)).getBytes()) + '?=';
const mimeB64_ = bytes => Utilities.base64Encode(bytes).replace(/.{76}/g, '$&\r\n');
function dwdSend_(from, to, subject, text, opts) {
  const tok = dwdToken_(from), bd = 'lm' + Utilities.getUuid().replace(/-/g, ''), alt = 'la' + Utilities.getUuid().replace(/-/g, '');
  const name = opts.name ? '"' + mimeWord_(String(opts.name).replace(/"/g, '')) + '" ' : '';
  const H = ['From: ' + name + '<' + from + '>', 'To: ' + to];
  if (opts.cc) H.push('Cc: ' + opts.cc); if (opts.bcc) H.push('Bcc: ' + opts.bcc);
  if (opts.replyTo && String(opts.replyTo).toLowerCase() !== from.toLowerCase()) H.push('Reply-To: ' + opts.replyTo);
  H.push('Subject: ' + mimeWord_(subject), 'MIME-Version: 1.0', 'Content-Type: multipart/mixed; boundary="' + bd + '"');
  const P = [H.join('\r\n'), '', '--' + bd, 'Content-Type: multipart/alternative; boundary="' + alt + '"', '',
    '--' + alt, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', mimeB64_(Utilities.newBlob(String(text || '')).getBytes())];
  if (opts.htmlBody) P.push('--' + alt, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', mimeB64_(Utilities.newBlob(String(opts.htmlBody)).getBytes()));
  P.push('--' + alt + '--');
  (opts.attachments || []).forEach(b => { const n = mimeWord_(b.getName() || 'melleklet');
    P.push('--' + bd, 'Content-Type: ' + (b.getContentType() || 'application/octet-stream') + '; name="' + n + '"', 'Content-Disposition: attachment; filename="' + n + '"', 'Content-Transfer-Encoding: base64', '', mimeB64_(b.getBytes())); });
  P.push('--' + bd + '--', '');
  const r = UrlFetchApp.fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + tok }, payload: JSON.stringify({ raw: b64url_(Utilities.newBlob(P.join('\r\n')).getBytes()) }) });
  if (r.getResponseCode() >= 300) throw new Error('Gmail API ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
  return true;
}
/** Beállítások: állapot / kulcs mentése / teszt (csak az ügyvezető). A kulcsot soha nem adjuk vissza. */
function dwdStatus_() { const k = dwdKey_(); return { on: !!k, clientEmail: k ? k.client_email : '', clientId: k ? String(k.client_id || '') : '', scope: DWD_SCOPE }; }
function dwdSet_(u, a) {
  a = a || {};
  if (a.clear) { PropertiesService.getScriptProperties().deleteProperty(DWD_PROPERTY); logEvent_(u, 'Küldés a kollégák címéről', '', 'kikapcsolva'); return dwdStatus_(); }
  let o; try { o = JSON.parse(String(a.json || '')); } catch (e) { throw new Error('Ez nem érvényes JSON – a szolgáltatásfiók letöltött kulcsfájljának teljes tartalmát másold be.'); }
  if (!o || o.type !== 'service_account' || !o.client_email || !/BEGIN PRIVATE KEY/.test(o.private_key || '')) throw new Error('Ez nem szolgáltatásfiók-kulcs (type: service_account, client_email, private_key kell).');
  PropertiesService.getScriptProperties().setProperty(DWD_PROPERTY, JSON.stringify({ type: o.type, client_email: o.client_email, client_id: o.client_id || '', private_key: o.private_key }));
  logEvent_(u, 'Küldés a kollégák címéről', o.client_email, 'kulcs mentve'); return dwdStatus_();
}
/** a: {email} – csak tokent kér a kolléga nevében (levelet nem küld) */
function dwdTest_(u, a) {
  const email = String((a && a.email) || u.email || '').trim().toLowerCase();
  if (!dwdDomainOk_(email)) throw new Error('Csak a saját domain (lumosmotion.com) címeivel működik.');
  CacheService.getScriptCache().remove('dwd_' + Utilities.base64EncodeWebSafe(email).slice(0, 200));
  dwdToken_(email); return { ok: true, email: email };
}
function setMail_(u, a) {
  a = a || {};
  if (a.cat && Array.isArray(a.cc)) {
    if (!MAIL_CC_DEFAULT_[a.cat]) throw new Error('Ehhez a típushoz nem állítható másolat.');
    const c = mailCc_(); c[a.cat] = a.cc.filter(x => ['admin', 'editor', 'actor'].indexOf(x) >= 0); PropertiesService.getScriptProperties().setProperty(MAIL_CC_PROPERTY, JSON.stringify(c));
    logEvent_(u, 'E-mail másolat', a.cat, c[a.cat].join(', ') || 'nincs');
  } else if (a.cat) {
    if (MAIL_CATS_.indexOf(a.cat) < 0) throw new Error('Ismeretlen értesítéstípus.');
    const c = mailCats_(); c[a.cat] = !!a.on; PropertiesService.getScriptProperties().setProperty(MAIL_CATS_PROPERTY, JSON.stringify(c));
    logEvent_(u, 'E-mail értesítések', a.cat, a.on ? 'bekapcsolva' : 'kikapcsolva');
  } else {
    PropertiesService.getScriptProperties().setProperty(MAIL_ON_PROPERTY, a.on ? '1' : '0');
    logEvent_(u, 'E-mail értesítések', '', a.on ? 'bekapcsolva' : 'kikapcsolva');
  }
  return { mailOn: mailOn_(), mailCats: mailCats_(), mailCc: mailCc_() };
}
function calGuestsSet_(ev, emails, allCrewEmails) {   // vendéglista beállítása; a nem stábhoz tartozó vendégekhez (pl. ügyfél) nem nyúlunk
  const want = {}; emails.forEach(m => { want[m] = 1; });
  if (typeof Calendar !== 'undefined' && Calendar.Events) {   // speciális szolgáltatás: a Google értesítést is küld (sendUpdates: all)
    const eid = String(ev.getId()).replace(/@google\.com$/, '');
    const CID = evCalId_(ev), cur = Calendar.Events.get(CID, eid);
    const keep = (cur.attendees || []).filter(x => !allCrewEmails[String(x.email || '').toLowerCase()] || want[String(x.email || '').toLowerCase()]);
    const have = {}; keep.forEach(x => { have[String(x.email || '').toLowerCase()] = 1; });
    const added = emails.filter(m => !have[m]), removed = (cur.attendees || []).length - keep.length + added.length;
    if (!added.length && !removed) return false;   // nincs változás a vendéglistában: nem frissítünk, így senki nem kap újabb értesítőt
    added.forEach(m => keep.push({ email: m }));
    Calendar.Events.patch({ attendees: keep }, CID, eid, { sendUpdates: 'none' });   // a Google nem küld külön meghívólevelet – az értesítés a saját beosztásos levelünk (benne a naptárlinkkel)
    return false;
  }
  if (!mailOn_('calendar')) return false;   // speciális szolgáltatás nélkül (tartalék): a vendégek felvétele értesítést küldhet – kikapcsolt naptárlevélnél kihagyjuk
  const have = {}; ev.getGuestList().forEach(g => { have[String(g.getEmail()).toLowerCase()] = 1; });
  Object.keys(want).forEach(m => { if (!have[m]) ev.addGuest(m); });
  Object.keys(have).forEach(m => { if (allCrewEmails[m] && !want[m]) ev.removeGuest(m); });
  return false;
}
function calEventLink_(ev) {   // a naptárbejegyzés megnyitása a Google Naptárban
  const eid = String(ev.getId()).replace(/@google\.com$/, '');
  const CID = evCalId_(ev);
  try { if (typeof Calendar !== 'undefined' && Calendar.Events) { const x = Calendar.Events.get(CID, eid); if (x && x.htmlLink) return x.htmlLink; } } catch (e) {}
  return 'https://calendar.google.com/calendar/event?eid=' + Utilities.base64EncodeWebSafe(eid + ' ' + CID).replace(/=+$/, '');
}
/** A szakember helyszíni feladatai a beosztó levélbe: előadásrögzítés termenként (kameraszög + kamera / objektív), kreatív kamera, fotózás. */
function siteTasks_(p, cid) {
  const et = parseEditTasks_(p.editTasks), mine = et[cid] || [], out = [];
  if (!mine.length) return out;
  let inv = {}; try { readAll_('inventory').forEach(x => { inv[x.id] = x.name; }); } catch (e) { }
  const RL = { er_total: 'Teljes alakos kamera', er_close: 'Közeli kamera', er_crowd: 'Közönség kamera', er_slides: 'Diák rögzítése / kivetítése' };
  const rooms = parseRooms_(p.recRooms) || [], recs = [];
  rooms.forEach((r, i) => {
    const legacy = i === 0 && Object.keys(RL).some(k => mine.indexOf('f_' + k) >= 0);
    const isOp = mine.indexOf('f_' + r.id + '_op') >= 0 || legacy || Object.keys(RL).some(k => mine.indexOf('f_' + r.id + '_' + k) >= 0);
    const cs = [];
    Object.keys(RL).forEach(k => {
      const n = Number(r[k]) || 0, eq = Array.isArray(r[k + '_eq']) ? r[k + '_eq'] : [], ln = Array.isArray(r[k + '_lens']) ? r[k + '_lens'] : [];
      for (let j = 0; j < n; j++) {
        if (!isOp) continue;   // a helyszín összes kamerája a helyszín operatőréé
        const dev = [inv[eq[j]], inv[ln[j]]].filter(Boolean).join(' + ');
        cs.push(RL[k] + (dev ? ' (' + dev + ')' : ''));
      }
    });
    if (cs.length) { if (rooms.length > 1 || r.name) recs.push((i + 1) + '. helyszín' + (r.name ? ' – ' + r.name : '') + ':'); cs.forEach(x => recs.push(x)); }
  });
  if (recs.length) out.push(['Előadásrögzítés', recs.join('\n')]);   // minden kamera / eszköz külön sorban
  if (mine.indexOf('f_er_creative') >= 0 && p.er_creative === true) out.push(['Kreatív videózás', 'kreatív kamera']);
  if (mine.indexOf('f_x_foto') >= 0 && p.x_foto === true) out.push(['Fotózás', Number(p.foto_db) > 0 ? p.foto_db + ' db fotó' : 'rendezvényfotózás']);
  return out;
}
function crewFinalBuild_(p, m, lead, link, changed, cm, u) {
  const sig = signatureFor_(u), sigText = sig ? sig.text : 'Üdvözlettel,\n' + ((u && u.name) || '') + '\nLumos Motion', sigHtml = sig ? sig.html : '<p>Üdvözlettel,<br>' + escapeHtml_((u && u.name) || '') + '<br>Lumos Motion</p>';   // a szignó azé, aki élesít
  cm = cm || {};   // a felugró ablakban szerkesztett tárgy / bevezető / megjegyzés (üres = alapértelmezett)
  const range = fmtHuDate_(p.date) + (p.endDate && p.endDate > p.date ? ' – ' + fmtHuDate_(p.endDate) : '');
  const rows = [['Projekt', p.name], ['Időpont', range + (m.days.length ? ' (a te napjaid: ' + m.days.map(fmtHuDate_).join(', ') + ')' : '')],
    ['Kezdés', p.startTime || ''], ['Távozás (kb.)', p.endTime || ''], ['Helyszín', p.venue || ''], ['Szereped', m.roles.join(', ')],
    ['Projektvezető', lead && lead.id !== m.id ? lead.name + (lead.phone ? ' · ' + lead.phone : '') : '']].filter(r => r[1]);   // a projektvezető a saját levelében nem kapja meg a saját nevét / számát
  siteTasks_(p, m.id).forEach(t => rows.push(t));   // helyszíni feladat: melyik teremben, milyen kameraszöggel, milyen eszközzel
  const ct = cm.cutTasks && cm.cutTasks[m.id];   // vágó: mit kell megvágnia + leadási határidő (a felület számolja)
  if (ct && ct.items && ct.items.length) { rows.push(['Vágnivaló', ct.items.join('\n')]); if (ct.due) rows.push(['Leadási határidő', ct.due]); }
  if (postOnly_(p, m.id)) { const pn = parseNotes_(p.crewNotes)[m.id]; if (pn) rows.push(['Neked szóló megjegyzés', String(pn)]); }   // nem kap eszközlistát: a személyes jegyzet ide kerül
  const intro = cm.intro || (changed ? 'Módosult a beosztásod ezen a projekten:' : 'Véglegesítettük a csapatot, és beosztottunk erre a projektre:');
  const note = String(cm.note || '').trim(), first = huFirst_(String(m.name));
  const text = ['Kedves ' + first + ',', '', intro].concat(note ? ['', note] : []).concat([''])   // megszólítás → bevezető → megjegyzés → beosztás   // a megjegyzés rögtön a megszólítás után
    .concat(rows.map(r => /\n/.test(String(r[1])) ? r[0] + ':\n  • ' + String(r[1]).replace(/\n/g, '\n  • ') : r[0] + ': ' + r[1])).concat(link ? ['', 'Részletek a naptárbejegyzésben: ' + link] : []).concat(['', sigText]).join('\n');
  const html = '<p>Kedves ' + escapeHtml_(first) + ',</p><p>' + escapeHtml_(intro).replace(/\n/g, '<br>') + '</p>' + (note ? '<p>' + escapeHtml_(note).replace(/\n/g, '<br>') + '</p>' : '') + '<table cellpadding="4" style="border-collapse:collapse">'
    + rows.map(r => '<tr><td style="color:#555;vertical-align:top">' + escapeHtml_(r[0]) + '</td><td><b>' + escapeHtml_(r[1]).replace(/\n/g, '<br>') + '</b></td></tr>').join('') + '</table>'   // több tétel: soronként
    + (link ? '<p><a href="' + link + '">Részletek a naptárbejegyzésben</a></p>' : '') + sigHtml;
  const subj = cm.subject || ((changed ? 'Módosult beosztás: ' : 'Beosztás: ') + p.name + ' – ' + range);
  return { subject: subj, text: text, html: html };
}
function crewFinalMail_(u, p, m, lead, link, changed, cm) {
  const b = crewFinalBuild_(p, m, lead, link, changed, cm, u);
  const ch = cm && cm.custom && cm.custom[m.id];
  if (ch) { b.html = ch; b.text = plainText_(ch.replace(/<\/td>\s*<td[^>]*>/gi, ': ').replace(/<\/(div|tr|p|table)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n')).replace(/\n{3,}/g, '\n\n').trim(); }
  return gmailSend_(m.email, b.subject, b.text, mailOptsFor_(u, b.html), 'assign');
}
/** Az élesítéskor kiküldendő levelek előnézete tagonként (a bevezető és a megjegyzés helyén jelölővel – a felület élőben cseréli). */
/** A tag maga a műveletet végző felhasználó-e (stábazonosító vagy e-mail-cím szerint, az álnevekkel együtt). */
function isSelf_(u, m) {
  if (!u || !m) return false;
  if (u.crewId && String(u.crewId) === String(m.id)) return true;
  const n = e => { const x = String(e || '').trim().toLowerCase(); return SIG_ALIAS_[x] || x; };
  return !!u.email && n(u.email) === n(m.email);
}
function crewFinalPreview_(u, a) {
  const pid = str_(a && a.projectId, 64), sh = sheetFor_('projects'), row = findRow_(sh, pid);
  if (!row) throw new Error('A projekt nem található.');
  const p = fullProject_(readRow_('projects', sh, row)), members = crewMembers_(p), lead = members.find(m => m.id === p.lead) || null;
  const prev = parseCrewFinal_(p.crewFinal), link = p.calEventId ? (() => { try { const ev = calEvent_(p.calEventId); return ev ? calEventLink_(ev) : ''; } catch (e) { return ''; } })() : '';
  return members.filter(m => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email) && !isSelf_(u, m)).map(m => {
    const isNew = !prev || prev.ids.indexOf(m.id) < 0, changed = !isNew && prev.sigs && prev.sigs[m.id] !== undefined && sigCore_(prev.sigs[m.id]) !== sigCore_(crewSig_(p, m.id));   // eszközváltozás nem csapatmódosítás (külön eszközlista)
    const b = crewFinalBuild_(p, m, lead, link || 'https://calendar.google.com/', changed, { intro: '@@INTRO@@', note: '@@NOTE@@', cutTasks: cutTasksArg_(a) }, u);
    return { id: m.id, name: m.name, email: m.email, changed: changed, isNew: isNew, subject: b.subject, html: b.html };
  });
}
/** Eszközök véglegesítése (a csapat után): rögzíti, ki mikor véglegesítette, és a beosztás lenyomatát (módosítás felismeréséhez). */
/** Csak utómunkás (vágó, nem helyszíni) vagy értékesítő: nem visz eszközt, nem kap eszközlistát. */
function postOnly_(p, cid) { if (!cid || p.lead === cid) return false; const et = parseEditTasks_(p.editTasks), own = Object.keys(et).filter(id => et[id].indexOf('f_x_vago') >= 0); if (own.length ? own.indexOf(cid) >= 0 : p.editOnsite === true) return false; /* helyszíni vágó személyenként */ const r = (p.crew || []).filter(a => a.crewId === cid).map(a => a.role); return r.length > 0 && r.every(x => x === 'Vágó' || x === 'Értékesítő'); }
function cutTasksArg_(a) { const o = {}; const x = a && a.cutTasks; if (x && typeof x === 'object') Object.keys(x).slice(0, 20).forEach(k => { const v = x[k] || {}; o[str_(k, 64)] = { items: (Array.isArray(v.items) ? v.items : []).slice(0, 30).map(i => str_(i, 160)).filter(Boolean), due: str_(v.due, 60) }; }); return o; }
/** Kik kapnak eszközlistát: akiknél eszköz van (nem csak utómunkás, és nem te magad). */
function eqRecipients_(u, fp) {
  const holders = {}; (fp.equipment || []).forEach(e => { if (e.crewId) holders[e.crewId] = 1; }); parseRentals_(fp.rentals).forEach(r => { if (r.crewId) holders[r.crewId] = 1; });
  const cm = byId_(readAll_('crew'));
  return Object.keys(holders).filter(cid => !postOnly_(fp, cid)).filter(cid => !isSelf_(u, { id: cid, email: (cm[cid] || {}).email }));
}
/** Az eszközök véglegesítésekor kimenő eszközlisták előnézete (semmit nem küld el). */
function eqListPreview_(u, a) {
  const pid = str_(a && a.projectId, 64), sh = sheetFor_('projects'), r = findRow_(sh, pid); if (!r) throw new Error('A projekt nem található.');
  const rcp = eqRecipients_(u, fullProject_(readRow_('projects', sh, r)));
  if (!rcp.length || !mailOn_()) return [];
  try { return sendEquipmentList_(u, { projectId: pid, recipients: rcp, message: '', includePlan: true, preview: true }).previews || []; } catch (e) { return []; }
}
function finalizeEquipment_(u, a) {
  const pid = str_(a && a.projectId, 64);
  const saved = withLock_(() => {
    const sh = sheetFor_('projects'), r = findRow_(sh, pid); if (!r) throw new Error('A projekt nem található.');
    const q = readRow_('projects', sh, r);
    if (!parseCrewFinal_(q.crewFinal)) throw new Error('Előbb a csapatot véglegesítsd, utána az eszközöket.');
    const eq = fullProject_(q).equipment || [];
    q.eqFinal = JSON.stringify({ at: now_(), by: u.name, sig: eq.map(e => e.itemId + '|' + (e.crewId || '') + '|' + (Number(e.qty) || 1)).sort().join(',') });
    q.updatedAt = now_(); q.updatedBy = u.name; putRow_('projects', sh, q, r); dbFlush_(); return q;
  });
  let mail = null;
  if (a && a.sendList) {   // eszközlista e-mailben azoknak, akiknél eszköz van (magadnak nem)
    const rcp = eqRecipients_(u, fullProject_(saved));
    if (rcp.length) { try { mail = sendEquipmentList_(u, { projectId: pid, recipients: rcp, message: '', includePlan: true }); } catch (e) { mail = { error: String(e && e.message || e) }; } }
  }
  logEvent_(u, 'Eszközök véglegesítve', saved.name, '');
  return { project: projectView_(fullProject_(saved), u), mail: mail };
}
function finalizeCrew_(u, a) {
  const pid = str_(a && a.projectId, 64);
  const sh = sheetFor_('projects'), row = findRow_(sh, pid);
  if (!row) throw new Error('A projekt nem található.');
  let p = fullProject_(readRow_('projects', sh, row));
  if (p.status === 'lemondva') throw new Error('Lemondott projekt csapatát nem lehet véglegesíteni.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.date || ''))) throw new Error('Előbb add meg a projekt első napját.');
  const members = crewMembers_(p);
  if (!members.length) throw new Error('Még nincs beosztva senki a projektre.');
  p = syncCalendar_(p);   // az esemény biztosan létezzen
  const ev = calEvent_(p.calEventId); if (!ev) throw new Error('A naptárbejegyzést nem sikerült létrehozni. Próbáld újra.' + (p.calError ? ' (' + p.calError + ')' : ''));   // videóvágásnál a Vágói naptár eseménye
  const allCrewEmails = {}; readAll_('crew').forEach(c => { const e = String(c.email || '').trim().toLowerCase(); if (e) allCrewEmails[e] = 1; });
  const valid = members.filter(m => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email));
  const calNotified = ev ? calGuestsSet_(ev, valid.map(m => m.email), allCrewEmails) : false;
  const lead = members.find(m => m.id === p.lead) || null;
  // újraélesítés: csak az új tagok kapnak értesítést, és azok a régiek, akiknek a szerepe, eszközei vagy napjai változtak
  const prev = parseCrewFinal_(p.crewFinal), sigs = {}; members.forEach(m => { sigs[m.id] = crewSig_(p, m.id); });
  const moved = !!(a && a.dateMoved);   // a naptárban áthúzott projekt: minden korábbi tag értesítést kap az új időpontról
  const isNewM = m => !prev || prev.ids.indexOf(m.id) < 0, isChanged = m => !isNewM(m) && (moved || (prev.sigs && prev.sigs[m.id] !== undefined && prev.sigs[m.id] !== sigs[m.id]));
  const toNotify = valid.filter(m => (isNewM(m) || isChanged(m)) && !isSelf_(u, m));   // aki élesít, magának nem küld levelet (a naptárba bekerül)
  const link = ev ? calEventLink_(ev) : '';
  const cutTasks = cutTasksArg_(a);
  const cm = { subject: str_(a && a.subject, 200).trim() || (a && a.dateMoved ? 'Új időpont: ' + p.name + ' – ' + fmtHuDate_(p.date) + (p.endDate && p.endDate > p.date ? ' – ' + fmtHuDate_(p.endDate) : '') : ''), intro: str_(a && a.intro, 1000).trim() || (a && a.dateMoved ? 'Módosult a projekt időpontja – az új beosztásod:' : ''), note: str_(a && a.note, 3000).trim(), custom: {}, cutTasks: cutTasks };
  if (a && a.custom && typeof a.custom === 'object') Object.keys(a.custom).slice(0, 60).forEach(k => { const h = sigSanitize_(String(a.custom[k] || ''), 30000); if (h) cm.custom[k] = h; });   // kézzel átírt levelek
  const sent = [], failed = [], changedNames = []; let stepped = false;
  const sentTo = [];
  toNotify.forEach(m => { const ch = isChanged(m); try { if (crewFinalMail_(u, p, m, lead, link, ch, cm)) { sent.push(m.name); sentTo.push({ name: m.name, email: m.email }); if (ch) changedNames.push(m.name); } } catch (e) { failed.push(m.name); } });
  const saved = withLock_(() => {
    const r2 = findRow_(sh, pid), q = readRow_('projects', sh, r2);
    q.crewFinal = JSON.stringify({ at: now_(), by: u.name, ids: members.map(m => m.id).sort(), notified: sent, sentTo: sentTo, sigs: sigs });
    if (p.calEventId && !q.calEventId) q.calEventId = p.calEventId;
    if (!q.status || q.status === 'tervezes' || q.status === 'egyeztetes') { q.prevStatus = q.status || 'tervezes'; q.status = q.eventType === 'Videóvágás' ? 'utomunka' : 'helyszin'; stepped = true;   // videóvágás: rögtön Utómunka
      const sd = String(q.stepsDone || '').split(',').filter(String); if (sd.indexOf('tervezes') < 0) sd.push('tervezes'); q.stepsDone = sd.join(','); }   // véglegesített csapat → Helyszíni munka
    q.updatedAt = now_(); q.updatedBy = u.name;
    putRow_('projects', sh, q, r2); dbFlush_();
    return q;
  });
  logEvent_(u, 'Csapat véglegesítve', p.name, members.length + ' fő · e-mail: ' + sent.length + (failed.length ? ' · sikertelen: ' + failed.length : '') + (stepped ? ' · Állapot: Tervezés → ' + (p.eventType === 'Videóvágás' ? 'Utómunka' : 'Helyszíni munka') : ''));
  return { project: projectView_(fullProject_(saved), u), sent: sent, sentTo: sentTo, changed: changedNames, failed: failed, noEmail: members.filter(m => valid.indexOf(m) < 0).map(m => m.name), calendarNotified: calNotified, link: link, mailPaused: !mailOn_(), stepped: stepped };
}


/* ===== Utómunka-instrukciók a projekten (az összes videóra / fotóra vonatkozó megjegyzések a vágónak) =====
 * Tárolás: bigPut_('PN_<projekt>') – [{id, at, by, t, done:{by,at}|null, cm:[{at, by, t}]}], a legfrissebb elöl. A munkalap oszlopai érintetlenek. */
function pnLoad_(pid) { try { const l = JSON.parse(bigGet_('PN_' + pid) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
function pnSave_(pid, l) { bigPut_('PN_' + pid, JSON.stringify(l.slice(0, 40))); }
function pnPost_(pid) {   // a projekt utómunkásai: a vágói beosztás és a videók / fotók kijelölt utómunkása
  const ids = {}; readAll_('crewAssign').forEach(r => { if (r.projectId === pid && /vágó|utómunk|fotós/i.test(String(r.role || ''))) ids[r.crewId] = 1; });
  const sh = sheetFor_('projects'), row = findRow_(sh, pid), p = row ? readRow_('projects', sh, row) : null; if (!p) throw new Error('A projekt nem található.');
  parseVideos_(p.videos).forEach(v => { if (v.editor) ids[v.editor] = 1; });
  return { p: p, crew: readAll_('crew').filter(c => ids[c.id]) };
}
function pnCan_(u, pid, write) {
  if (u.role === 'admin' || u.role === 'editor') return pnPost_(pid);
  const x = pnPost_(pid); if (write === 'lead' || !u.crewId || !x.crew.some(c => c.id === u.crewId)) throw new Error('FORBIDDEN: ehhez nincs jogosultságod.');
  return x;
}
function postNotes_(u, a) { const pid = str_(a && a.projectId, 64); pnCan_(u, pid); return { notes: pnLoad_(pid) }; }
function postNoteAct_(u, a) {
  a = a || {}; const pid = str_(a.projectId, 64), act = String(a.act || ''), t = str_(a.text, act === 'add' ? 2000 : 1000).trim();
  const x = pnCan_(u, pid, act === 'add' || act === 'del' ? 'lead' : 'any');
  let note = null;
  withLock_(() => {
    const l = pnLoad_(pid);
    if (act === 'add') { if (t.length < 2) throw new Error('Írd be az instrukciót.'); note = { id: Utilities.getUuid().slice(0, 8), at: now_(), by: u.name, t: t, done: null, cm: [] }; l.unshift(note); }
    else { note = l.find(n => n.id === str_(a.id, 20)); if (!note) throw new Error('A bejegyzés nem található.');
      if (act === 'comment') { if (t.length < 1) throw new Error('Írj valamit.'); note.cm = (note.cm || []).concat([{ at: now_(), by: u.name, t: t }]).slice(-30); }
      else if (act === 'done') note.done = a.done ? { by: u.name, at: now_() } : null;
      else if (act === 'del') l.splice(l.indexOf(note), 1);
      else throw new Error('Ismeretlen művelet.'); }
    pnSave_(pid, l); dataBump_();
  });
  // értesítés: új instrukciónál az utómunkásoknak; hozzászólásnál a bejegyzés írójának és a többi hozzászólónak (aki nem maga)
  try {
    const url = appUrl_() + '#p=' + pid, pn = x.p.name, me = String(u.email || '').toLowerCase();
    let to = [];
    if (act === 'add' && a.notify !== false) to = x.crew.map(c => String(c.email || '').trim());
    if (act === 'comment') { const names = [note.by].concat((note.cm || []).map(c => c.by)); const users = loadUsers_(); to = names.map(n => { const us = users.find(z => z.name === n), cr = readAll_('crew').find(c => c.name === n); return String((us && us.email) || (cr && cr.email) || '').trim(); }); }
    to = to.filter((m, i) => m && /@/.test(m) && m.toLowerCase() !== me && to.indexOf(m) === i);
    if (to.length) {
      const head = act === 'add' ? u.name + ' új utómunka-instrukciót írt' : u.name + ' hozzászólt egy utómunka-instrukcióhoz', body = act === 'add' ? t : t + '\n\n(Az instrukció: ' + note.t + ')';
      gmailSend_(to.join(','), (act === 'add' ? 'Utómunka-instrukció: ' : 'Hozzászólás az instrukcióhoz: ') + pn, head + ' – ' + pn + '\n\n' + body + '\n\n' + url,
        { htmlBody: '<p><b>' + escapeHtml_(head) + '</b> – ' + escapeHtml_(pn) + '</p><p style="padding:10px 12px;background:#fff7e0;border-left:4px solid #e0a800">' + escapeHtml_(t).replace(/\n/g, '<br>') + '</p>' + (act === 'comment' ? '<p style="color:#666;font-size:13px">Az instrukció: ' + escapeHtml_(note.t).replace(/\n/g, '<br>') + '</p>' : '') + '<p><a href="' + escapeHtml_(url) + '">A projekt megnyitása</a></p>', name: 'Lumos Motion Projekttervező' });
    }
  } catch (e) { Logger.log('Instrukció e-mail: ' + e); }
  logEvent_(u, 'Utómunka-instrukció', x.p.name, { add: 'új', comment: 'hozzászólás', done: a.done ? 'kész' : 'visszavonva', del: 'törölve' }[act] || act);
  return { notes: pnLoad_(pid) };
}
