/* ===================== SZERZŐDÉS KÜLDÉSE AZ ÜGYFÉLNEK (Új szerződés, 3. lépés) ===================== */
function contractSender_(u) {
  const owner = loadUsers_().find(x => x.id === u.id) || u;
  const f = sigFields_(owner) || { name: owner.name || '', email: sigKey_(owner.email || ''), title: '', phone: '', photo: '' };
  const c = sigCustom_(owner.email || ''), sig = c ? { html: c, text: plainText_(c.replace(/<\/(div|tr|p|table)>/gi, '\n')).replace(/\n{3,}/g, '\n\n').trim() } : sigBuild_(f);
  return { owner: owner, f: f, sig: sig };
}
function contractSig_(u) { const r = contractSender_(u), o = mailOptsFor_(r.owner, ''); return { name: r.f.name || r.owner.name, email: r.owner.email || '', sigHtml: r.sig.html, from: o.__dwd || o.from || Session.getEffectiveUser().getEmail() || '' }; }
/** a: {client, to, cc, subject, body, pdf (base64), fileName, save, kind} – a szerződés PDF-je mellékletként; kérésre az ügyfél mappájába is mentjük */
function contractSend_(u, a) {
  a = a || {}; const r = contractSender_(u);
  const tos = str_(a.to, 600).split(/\s*,\s*/).filter(Boolean).slice(0, 8); if (!tos.length || !tos.every(x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))) throw new Error('Adj meg érvényes e-mail címet.');
  const b64 = String(a.pdf || ''); if (!b64 || b64.length > 12 * 1024 * 1024) throw new Error('Hiányzik a szerződés PDF-je.');
  const client = str_(a.client, 160).trim(), subj = str_(a.subject, 200).trim() || ('Szerződés – ' + client), body = str_(a.body, 6000);
  const fname = str_(a.fileName, 120).replace(/[\\/:*?"<>|]+/g, '-') || 'Szerzodes.pdf';
  const html = '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55">' + escapeHtml_(body).replace(/\n/g, '<br>') + '</div><br>' + r.sig.html;
  const opts = mailOptsFor_(r.owner, html); opts.attachments = [Utilities.newBlob(Utilities.base64Decode(b64), 'application/pdf', fname)];
  if (a.cc && /@/.test(String(a.cc))) opts.cc = str_(a.cc, 300);
  const live = clientMailLive_(), to = live ? tos.join(', ') : String(u.email || '');
  const ok = gmailSend_(to, (live ? '' : '[TESZT – valójában neki: ' + tos.join(', ') + '] ') + subj, body + '\n\n' + r.sig.text, opts);
  if (!ok) throw new Error('Az e-mail nem ment ki (az e-mailek szünetelnek?).');
  logEvent_(u, 'Szerződés elküldve', client, tos.join(', '));
  let status = null; if (live && (a.dealId || a.projectId)) { try { status = ctStatusSet_(u, { dealId: a.dealId, projectId: a.projectId, status: 'kikuldve' }); } catch (e) { Logger.log('Szerződés-állapot: ' + e); } }
  let saved = null; if (a.save && client) { try { saved = clientDocUpload_(u, { client: client, b64: b64, name: fname, mime: 'application/pdf', kind: a.kind === 'keret' ? 'keret' : 'egyeb' });
    if (a.docx) { try { clientDocUpload_(u, { client: client, b64: String(a.docx), name: fname.replace(/\.pdf$/i, '') + '.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', plain: true }); } catch (e) { Logger.log('docx mentés: ' + e); } }
  } catch (e) { saved = { error: String(e && e.message || e) }; } }
  return { ok: true, test: !live, saved: saved, status: status };
}
function sigList_() { const o = {}; loadUsers_().filter(x => (x.role === 'admin' || x.role === 'editor' || x.role === 'sales') && !x.disabled).forEach(x => { const f = sigFields_(x) || { name: x.name, email: sigKey_(x.email), title: '', phone: '', photo: '' }; const c = sigCustom_(x.email); o[x.id] = Object.assign({}, f, { html: c || sigBuild_(f).html, base: sigBuild_(f).html, custom: !!c, set: !!c || !!sigFields_(x) }); }); return o; }
const FRONTEND_LABEL = FRONTEND_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');   // a levelekben így látszik: projekttervezo.lumosmotion.hu

/** Nyersanyag feltöltve – e-mail a vágó(k)nak. a: {projectId, crewIds:[], link, text} */
function rawNotify_(u, a) {
  a = a || {};
  const sh = sheetFor_('projects'), row = findRow_(sh, str_(a.projectId, 64)); if (!row) throw new Error('A projekt nem található.');
  const p = readRow_('projects', sh, row), crew = byId_(readAll_('crew'));
  const ids = (Array.isArray(a.crewIds) ? a.crewIds : []).map(x => str_(x, 64)), to = ids.map(id => crew[id] && crew[id].email).filter(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || '')));
  if (!to.length) throw new Error('A kiválasztott vágónak nincs e-mail-címe a Stáb listában.');
  const link = /^https:\/\//i.test(String(a.link || '')) ? str_(a.link, 500) : '', text = str_(a.text, 5000), sig = signatureFor_(u);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.5">' + esc(text).replace(/\n/g, '<br>').replace(/(https:\/\/[^\s<]+)/g, '<a href="$1">$1</a>') + '</div>' + (sig ? '<br>' + sig.html : '');
  const opts = mailOptsFor_(u, html); delete opts.__actor;
  GmailApp.sendEmail(to.join(','), subj_('Nyersanyag feltöltve – ' + p.name), text + (sig ? '\n\n' + sig.text : ''), opts);
  logEvent_(u, 'Nyersanyag feltöltve', p.name, 'E-mail a vágónak: ' + to.join(', ') + (link ? ' · ' + link : ''));
  return { sentTo: to };
}
/** A kész videók linkjeinek módosítása (lezárt projektnél is): ügyvezető / termelési vezető. a: {projectId, link, links, pass} */
function setDeliveryLinks_(u, a) {
  a = a || {};
  if (u.role !== 'admin' && u.role !== 'editor') throw new Error('FORBIDDEN: ehhez nincs jogosultságod.');
  const pid = str_(a.projectId, 64), link = str_(a.link, 500);
  if (!/^https:\/\/\S+$/i.test(link)) throw new Error('A videók linkje https:// kezdetű legyen.');
  let p;
  withLock_(() => {
    const sh = sheetFor_('projects'), row = findRow_(sh, pid); if (!row) throw new Error('A projekt nem található.');
    p = readRow_('projects', sh, row);
    if (p.status === 'atadva') throw new Error('A projekt már át van adva – a videók linkje nem módosítható (ügyvezetőként a projekt felnyitásával lehet).');
    p.deliveryLink = link; if (Array.isArray(a.links)) p.deliveryLinks = JSON.stringify(parseLinks_(a.links)); if (a.pass !== undefined) p.deliveryPass = str_(a.pass, 120);
    p.updatedAt = now_(); p.updatedBy = u.name; p.mutationId = Utilities.getUuid();
    putRow_('projects', sh, p, row); dataBump_(); dbFlush_();
  });
  logEvent_(u, 'Kész videók linkje módosítva', p.name, link);
  return { project: projectView_(fullProject_(p), u) };
}
/** A vágó leadja a videókat: link + értesítés az ügyvezetőnek és/vagy a termelési vezetőnek; a projekt „Videók jóváhagyásra várnak” lesz. a: {projectId, link, note, notify:['admin','editor']} */
/** A leadási értesítő lehetséges címzettjei (ügyvezető, termelési vezető) – a vágó a leadás ablakában látja, kik kapják. */
function deliverRecipients_(u) {
  return loadUsers_().filter(x => !x.disabled && x.email && (x.role === 'admin' || x.role === 'editor')).map(x => ({ role: x.role, name: x.name || '', email: x.email }));
}
function crewDeliver_(u, a) {
  a = a || {};
  const pid = str_(a.projectId, 64), link = str_(a.link, 500);
  if (!/^https:\/\/\S+$/i.test(link)) throw new Error('A videók linkje https:// kezdetű legyen.');
  const isCutter = readAll_('crewAssign').some(r => r.projectId === pid && r.crewId === u.crewId && r.role === 'Vágó');
  if (u.role !== 'admin' && u.role !== 'editor' && !isCutter) throw new Error('Csak a projekt vágója adhatja le a videókat.');
  const notify = (Array.isArray(a.notify) ? a.notify : []).filter(x => x === 'admin' || x === 'editor');
  const pick = Array.isArray(a.emails) ? a.emails.map(x => String(x || '').trim().toLowerCase()).filter(Boolean) : null;   // a leadás ablakában kipipált címzettek
  if (pick ? !pick.length : !notify.length) throw new Error('Válaszd ki, kinek menjen értesítés.');
  let p;
  withLock_(() => {
    const sh = sheetFor_('projects'), row = findRow_(sh, pid); if (!row) throw new Error('A projekt nem található.');
    p = readRow_('projects', sh, row);
    if (p.status === 'atadva' || p.status === 'lemondva') throw new Error('A projekt már le van zárva.');
    p.deliveryLink = link; if (Array.isArray(a.links)) p.deliveryLinks = JSON.stringify(parseLinks_(a.links)); p.deliveryPass = str_(a.pass, 120); if (a.note !== undefined) p.deliveryNotes = str_(a.note, 3000);
    p.status = 'jovahagyas'; p.leadvaAt = p.leadvaAt || today_();
    const sd = String(p.stepsDone || '').split(',').filter(String); ['tervezes', 'helyszin', 'utomunka'].forEach(x => { if (sd.indexOf(x) < 0) sd.push(x); }); p.stepsDone = sd.join(',');
    p.updatedAt = now_(); p.updatedBy = u.name; p.mutationId = Utilities.getUuid();
    putRow_('projects', sh, p, row); dataBump_(); dbFlush_();
  });
  const to = []; try { loadUsers_().forEach(x => { if (x.disabled || !x.email || (x.role !== 'admin' && x.role !== 'editor')) return; const ok = pick ? pick.indexOf(String(x.email).toLowerCase()) >= 0 : notify.indexOf(x.role) >= 0; if (ok && to.indexOf(x.email) < 0) to.push(x.email); }); } catch (e) { }
  if (to.length) {
    const url = projLink_(p), note = str_(a.note, 3000);
    const first = (w => w.length > 1 ? w[w.length - 1] : String(u.name || ''))(String(u.name || '').trim().split(/\s+/));   // csak a keresztnév: Fodor Kata → Kata
    const one = a.single === true;   // egyetlen videó: egyes szám
    let text = first + ' elkészítette a(z) „' + p.name + (one ? '” videóját - jóváhagyásra vár.' : '” videóit - jóváhagyásra várnak.') + (note ? '\n\nMegjegyzés: ' + note : '') + '\n\n' + (one ? 'Videó: ' : 'Videók: ') + [link].concat(parseLinks_(p.deliveryLinks)).join('\n') + (p.deliveryPass ? '\nJelszó: ' + p.deliveryPass : '') + '\n\nProjekt: ' + url;
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const custom = sigSanitize_(String(a.html || ''), 30000);   // a vágó a leadás ablakában átírhatta a levelet
    const html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.5">' + (custom || esc(text).replace(/\n/g, '<br>').replace(/(https:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')) + '</div>';
    if (custom) text = plainText_(custom);
    const opts = mailOptsFor_(u, html); delete opts.__actor;
    try { GmailApp.sendEmail(to.join(','), subj_((a.single === true ? 'Videó' : 'Videók') + ' leadva – ' + p.name), text, opts); } catch (e) { Logger.log('Leadás e-mail hiba: ' + e); }
  }
  logEvent_(u, 'Videók leadva', p.name, link + (to.length ? ' · értesítve: ' + to.join(', ') : ''));
  return { project: projectView_(fullProject_(p), u), notified: to };
}
/** Meghívó Google-fiókos belépéshez (PIN nélkül). */
function sendInviteMail_(user, actor, editedHtml) {
  const m = inviteMailBuild_(user, actor);
  let html = m.html, text = m.text;
  if (editedHtml) { const h = payCleanHtml_(editedHtml); if (h.replace(/<[^>]*>/g, '').trim().length >= 20) { html = h; text = payHtmlText_(h); } }   // az előnézetben átírt változat
  let opts;
  if (actor && actor.email) opts = mailOptsFor_(actor, html);   // a meghívót küldő ügyvezető nevében, a saját aláírásával
  else { opts = { htmlBody: html, name: 'Lumos Motion', replyTo: MAIL_REPLY_TO }; try { if (GmailApp.getAliases().indexOf(MAIL_FROM) >= 0) opts.from = MAIL_FROM; } catch (e) {} }
  gmailSend_(user.email, m.subject, text, opts, 'invite');
}
/** A meghívó levél tartalma (a küldés és a Beállítások előnézete is ezt használja). */
function inviteMailBuild_(user, actor) {
  const url = appUrl_() || FRONTEND_URL, sig = signatureFor_(actor), first = String(user.name || '').trim().split(/\s+/).slice(-1)[0] || user.name;
  const intro = 'Hozzáférést kaptál a ' + APP_TITLE + ' alkalmazáshoz.';
  const lines = ['Kedves ' + first + ',', '', intro, '',
    'Belépés: nyisd meg a ' + FRONTEND_LABEL + ' oldalt, és kattints a „Bejelentkezés Google-fiókkal” gombra.',
    'Ezzel a Google-fiókkal lépj be: ' + user.email, '', sig ? sig.text : MAIL_SIGNATURE_TEXT];
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;color:#111111;line-height:1.5;font-size:14px"><p>Kedves ' + escapeHtml_(first) + ',</p><p>' + escapeHtml_(intro) + '</p>'
    + '<p>Belépés: nyisd meg a <a href="' + escapeHtml_(url) + '">' + escapeHtml_(FRONTEND_LABEL) + '</a> oldalt, és kattints a <b>„Bejelentkezés Google-fiókkal”</b> gombra.</p>'
    + '<p>Ezzel a Google-fiókkal lépj be: <b>' + escapeHtml_(user.email) + '</b></p><div style="margin-top:18px">' + (sig ? sig.html : '<p>' + MAIL_SIGNATURE_HTML + '</p>') + '</div></div>';
  return { subject: APP_TITLE + ' App – meghívó', text: lines.join('\n'), html: html, from: actor && actor.email ? (actor.name || '') + ' · Lumos Motion <' + actor.email + '>' : 'Lumos Motion <' + MAIL_FROM + '>' };
}

/** Gyors letiltás / engedélyezés a felhasználólistából. Letiltáskor minden eszközön azonnal kilépteti. */
function setUserDisabled_(arg, self) {
  const id = String(arg && arg.id || ''), dis = !!(arg && arg.disabled);
  return withLock_(() => {
    const users = loadUsers_();
    const u = users.find(x => x.id === id);
    if (!u) throw new Error('A felhasználó nem található.');
    if (dis && self && u.id === self.id) throw new Error('Saját magadat nem tilthatod le.');
    if (dis && u.role === 'admin' && !u.disabled && users.filter(x => x.role === 'admin' && !x.disabled).length < 2) throw new Error('Legalább egy aktív ügyvezetőnek maradnia kell.');
    u.disabled = dis;
    if (dis) revokeSessionsOf_(u.id);
    saveUsers_(users);
    return { users: users.map(adminListUser_), name: u.name };
  });
}

/** EGYSZER FUTTATANDÓ a szerkesztőből: létrehozza a munkalapokat és a SETUP_USERS felhasználókat (meghívóval). */
function setup() {
  ownerOnly_();
  Object.keys(TABLES).forEach(k => {
    const sh = sheetFor_(k);
    sh.getRange(1, 1, Math.max(2, sh.getMaxRows()), TABLES[k].cols.length).setNumberFormat('@');
  });
  logSheet_();
  ['Sheet1', 'Munkalap1', 'Munkalap 1'].forEach(n => {
    const sh = ss_().getSheetByName(n);
    if (sh && sh.getLastRow() === 0 && ss_().getSheets().length > 1) ss_().deleteSheet(sh);
  });
  SETUP_USERS.forEach(r => {
    if (String(r[0]).trim().length < 2) throw new Error('Hibás név: ' + r[0]);
    if (ROLES.indexOf(r[1]) < 0) throw new Error('Hibás szerepkör: ' + r[1] + ' (admin | editor)');
  });
  if (!SETUP_USERS.some(r => r[1] === 'admin')) throw new Error('Legalább egy ügyvezető kell.');
  withLock_(() => {
    const users = loadUsers_();
    SETUP_USERS.forEach(r => {
      const name = String(r[0]).trim(), email = String(r[2] || '').trim().toLowerCase();
      if (!email) throw new Error('A SETUP_USERS listában mindenkinek kell e-mail-cím (ezzel lép be): ' + name);
      let u = users.find(x => String(x.email || '').toLowerCase() === email);
      if (u) { Logger.log('Már létezik, kihagyva: ' + name + ' (' + r[1] + ').'); return; }
      u = newUserRecord_(name, r[1], '', email);
      users.push(u);
      saveUsers_(users);
      Logger.log('Felhasználó létrehozva: ' + name + ' (' + r[1] + ')');
      if (email) { try { sendInviteMail_(u); Logger.log('Meghívó elküldve: ' + email); } catch (e) { Logger.log('A meghívó nem ment ki: ' + e); } }
    });
  });
  Logger.log('Kész. A munkalapok: ' + Object.keys(TABLES).map(k => TABLES[k].tab).join(', ') + ', ' + LOG_TAB);
}

function cleanupSessions_(props) {
  const now = Date.now(), all = props.getProperties();
  Object.keys(all).forEach(k => {
    if (k.indexOf('LUMOS_PM_LOCK_') === 0 || k === 'PIN_LOGIN_ENABLED') { props.deleteProperty(k); return; }   // a megszűnt PIN-es belépés maradványai
    if (k.indexOf(SESSION_PREFIX) !== 0) return;
    try { const s = JSON.parse(all[k]); if (!s || s.exp < now) props.deleteProperty(k); } catch (e) { props.deleteProperty(k); }
  });
}
function revokeSessionsOf_(uid) {
  const props = PropertiesService.getScriptProperties(), all = props.getProperties();
  Object.keys(all).forEach(k => {
    if (k.indexOf(SESSION_PREFIX) !== 0) return;
    try { if (JSON.parse(all[k]).uid === uid) props.deleteProperty(k); } catch (e) {}
  });
}
/* Napló: az app megnyitása mentett belépéssel is (felhasználónként legfeljebb félóránként egy bejegyzés). */
function appOpenMark_(u) { try { CacheService.getScriptCache().put('lpm_open_' + u.id, '1', 1800); } catch (e) { } }
function logAppOpen_(u) {
  try { const c = CacheService.getScriptCache(), k = 'lpm_open_' + u.id; if (c.get(k)) return; c.put(k, '1', 1800); } catch (e) { }
  logEvent_(u, 'Belépés (app megnyitva)', '', '');
}
function createSession_(u, logAction) {
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  const exp = Date.now() + (SESSION_DAYS_BY_ROLE[u.role] || 2) * 86400000;
  const props = PropertiesService.getScriptProperties();
  cleanupSessions_(props);
  props.setProperty(SESSION_PREFIX + sha256hex_(token), JSON.stringify({ uid: u.id, exp: exp }));
  logEvent_(u, logAction, '', '');
  appOpenMark_(u);
  return { token: token, exp: exp, user: publicUser_(u) };
}

function googleClientId_() {
  return String(PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID') || GOOGLE_CLIENT_ID || '').trim();
}

/** Belépés Google-fiókkal: a Google által aláírt azonosító tokent a Google ellenőrző végpontjával hitelesítjük,
    majd az e-mail-cím alapján megkeressük a felhasználót. Céges címnél csak a Workspace-fiók (hd) fogadható el. */
function googleLogin(credential) {
  const clientId = googleClientId_();
  if (!clientId) throw new Error('A Google-belépés még nincs beállítva.');
  credential = String(credential || '');
  if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(credential) || credential.length > 4096) throw new Error('Érvénytelen Google-belépés.');
  const cache = CacheService.getScriptCache();
  if (cache.get('pm_glock')) throw new Error('Túl sok sikertelen próbálkozás. Próbáld újra 10 perc múlva.');
  const fail = msg => { const n = Number(cache.get('pm_gfail') || 0) + 1; cache.put('pm_gfail', String(n), 600); if (n >= 20) cache.put('pm_glock', '1', 600); Utilities.sleep(500); throw new Error(msg); };
  let info;
  try {
    const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential), { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) fail('A Google-belépés nem sikerült. Próbáld újra.');
    info = JSON.parse(res.getContentText());
  } catch (e) { if (String(e.message || e).indexOf('Google-belépés') >= 0) throw e; throw new Error('A Google-belépés most nem érhető el. Próbáld újra.'); }
  const iss = String(info.iss || '');
  if (info.aud !== clientId || (iss !== 'accounts.google.com' && iss !== 'https://accounts.google.com')) fail('Érvénytelen Google-belépés.');
  if (Number(info.exp || 0) * 1000 < Date.now()) fail('A Google-belépés lejárt. Próbáld újra.');
  if (String(info.email_verified) !== 'true') fail('Ez a Google-fiók nincs megerősítve.');
  const email = String(info.email || '').toLowerCase();
  if (email.slice(-(COMPANY_DOMAIN.length + 1)) === '@' + COMPANY_DOMAIN && String(info.hd || '').toLowerCase() !== COMPANY_DOMAIN)
    fail('A céges címmel csak a Lumos Motion Google Workspace-fiókkal lehet belépni.');
  const u = loadUsers_().find(x => String(x.email || '').toLowerCase() === email && !x.disabled);
  if (!u) fail('Ehhez a Google-fiókhoz (' + email + ') nincs hozzáférés az apphoz. Kérd az ügyvezetőt, hogy vegyen fel.');
  return createSession_(u, 'Belépés Google-lel');
}

function authUser_(token) {
  token = String(token || '');
  if (!/^[0-9a-f]{64}$/.test(token)) throw new Error('AUTH_REQUIRED');
  const raw = PropertiesService.getScriptProperties().getProperty(SESSION_PREFIX + sha256hex_(token));
  let s = null; try { s = raw ? JSON.parse(raw) : null; } catch (e) {}
  if (!s || s.exp < Date.now()) throw new Error('AUTH_REQUIRED');
  const u = loadUsers_().find(x => x.id === s.uid);
  if (!u || u.disabled) throw new Error('AUTH_REQUIRED');
  // Ügyvezetői előnézet: a munkamenet szerepköre átmenetileg termelési vezető vagy szakember, így a háttér pontosan
  // úgy szűr és engedélyez, mint annál a szerepkörnél. Csak ügyvezető kapcsolhatja be, és bármikor visszaállíthatja.
  if (s.viewAs && u.role === 'admin' && s.viewAs.role === 'sales' && s.viewAs.userId) {   // egy adott értékesítő szemével: az ő lehetőségei, jutaléka, kifizetései (a naplóban az ügyvezető neve marad)
    const su = loadUsers_().find(x => x.id === s.viewAs.userId && x.role === 'sales');
    if (su) return Object.assign({}, u, { id: su.id, role: 'sales', crewId: String(su.crewId || ''), realRole: 'admin', viewAs: s.viewAs });
  }
  if (s.viewAs && u.role === 'admin' && s.viewAs.role === 'sales') return Object.assign({}, u, { role: 'sales', crewId: u.crewId || ((readAll_('crew').find(c => String(c.email || '').toLowerCase() === String(u.email || '').toLowerCase() || c.name === u.name) || {}).id) || '', realRole: 'admin', viewAs: s.viewAs });
  if (s.viewAs && u.role === 'admin' && (s.viewAs.role === 'editor' || s.viewAs.role === 'crew'))
    return Object.assign({}, u, { role: s.viewAs.role, crewId: s.viewAs.role === 'crew' ? String(s.viewAs.crewId || '') : (u.crewId || ((readAll_('crew').find(c => String(c.email || '').toLowerCase() === String(u.email || '').toLowerCase() || c.name === u.name) || {}).id) || ''), realRole: 'admin', viewAs: s.viewAs });
  return u;
}

function setViewAs_(token, u, arg) {
  if (u.role !== 'admin' && u.realRole !== 'admin') throw new Error('FORBIDDEN: ehhez nincs jogosultságod.');
  const role = String(arg && arg.role || '');
  let view = null;
  if (role === 'editor') view = { role: 'editor' };
  else if (role === 'sales') {
    const uid = str_(arg && arg.userId, 64), su = uid ? loadUsers_().find(x => x.id === uid && x.role === 'sales') : null;
    if (uid && !su) throw new Error('Az értékesítő nem található.');
    view = su ? { role: 'sales', userId: su.id, crewName: su.name } : { role: 'sales' };
  }
  else if (role === 'crew') {
    const cid = str_(arg && arg.crewId, 64), c = readAll_('crew').find(x => x.id === cid);
    if (!c) throw new Error('Válaszd ki, melyik szakember szemével nézed az appot.');
    view = { role: 'crew', crewId: cid, crewName: c.name };
  } else if (role && role !== 'admin') throw new Error('Ismeretlen nézet.');
  const props = PropertiesService.getScriptProperties(), key = SESSION_PREFIX + sha256hex_(String(token));
  const sess = JSON.parse(props.getProperty(key) || 'null');
  if (!sess) throw new Error('AUTH_REQUIRED');
  if (view) sess.viewAs = view; else delete sess.viewAs;
  props.setProperty(key, JSON.stringify(sess));
  return { ok: true };
}

function saveUser_(arg, actor) {
  const a = arg && typeof arg === 'object' ? arg : {};
  const name = String(a.name || '').trim().replace(/\s+/g, ' ');
  const role = String(a.role || '');
  const crewId = String(a.crewId || '').trim().slice(0, 64);
  const email = String(a.email || '').trim().toLowerCase();
  if (name.length < 2 || name.length > 60) throw new Error('A név 2–60 karakter lehet.');
  if (ROLES.indexOf(role) < 0) throw new Error('Válassz szerepkört: Ügyvezető, Termelési vezető, Szakember vagy Értékesítő.');
  if (role === 'crew' && !crewId) throw new Error('Szakembernél válaszd ki, melyik munkatárs a stáblistában – csak az ő beosztásait fogja látni.');
  if (!email || email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Érvényes e-mail-cím szükséges: ezzel a Google-fiókkal lép be a felhasználó.');
  const comp = role === 'sales' ? salesComp_(a) : null;   // értékesítő: fix fizetés és jutalék
  let target = null, list = null, isNew = false;
  withLock_(() => {
    const users = loadUsers_();
    if (users.some(u => u.id !== a.id && String(u.email || '').toLowerCase() === email)) throw new Error('Ezzel az e-mail-címmel már van felhasználó.');
    if (role === 'admin' && users.some(u => u.id !== a.id && u.role === 'admin')) throw new Error('Csak egy ügyvezető lehet. Válassz Termelési vezető vagy Szakember szerepkört.');
    const otherEd = users.find(u => u.id !== a.id && u.role === 'editor');
    if (role === 'editor' && otherEd) throw new Error('Csak egy termelési vezető lehet (jelenleg: ' + otherEd.name + '). Előbb töröld őt, vagy állítsd Szakemberre.');
    let u = a.id ? users.find(x => x.id === a.id) : null;
    if (a.id && !u) throw new Error('A felhasználó nem található.');
    if (!u) {
      u = newUserRecord_(name, role, crewId, email);
      if (comp) Object.assign(u, comp);
      users.push(u);
    } else {
      const willDisable = a.disabled === true;
      if (u.role === 'admin' && !u.disabled && (role !== 'admin' || willDisable) && users.filter(x => x.role === 'admin' && !x.disabled).length < 2)
        throw new Error('Legalább egy aktív ügyvezetőnek maradnia kell.');
      const roleChanged = u.role !== role, emailChanged = String(u.email || '').toLowerCase() !== email;
      u.name = name; u.role = role; u.crewId = crewId; u.disabled = willDisable; u.email = email;
      if (comp) Object.assign(u, comp); else { delete u.salary; delete u.commLow; delete u.commHigh; delete u.commLimit; }
      if (willDisable || roleChanged || emailChanged) revokeSessionsOf_(u.id);
    }
    saveUsers_(users);
    target = u; isNew = !a.id;
    list = users.map(adminListUser_);
  });
  let mail = null;
  if (((isNew && a.sendInvite !== false) || (!isNew && a.resendInvite === true)) && target && target.email) {   // új kolléga, vagy újraküldés (pl. javított e-mail-cím)   // új kolléga: meghívó a Google-fiókos belépéshez
    try { sendInviteMail_(target, actor, a.inviteHtml); mail = { sent: true, to: target.email, invite: true }; }
    catch (e) { mail = { sent: false, to: target.email, error: String((e && e.message) || e), invite: true }; }
  }
  return { users: list, mail: mail };
}

/* A termelési vezető is kezelheti a hozzáféréseket, de csak a szakemberekét (ügyvezetőt, termelési vezetőt nem hozhat létre és nem módosíthat). */
function editorUserGuard_(u, newRole, targetId) {
  if (!u || u.role !== 'editor') return;
  if (newRole !== undefined && newRole !== 'crew') throw new Error('Termelési vezetőként csak szakember hozzáférését kezelheted.');
  if (targetId) { const t = loadUsers_().find(x => x.id === String(targetId)); if (t && t.role !== 'crew') throw new Error('Termelési vezetőként csak szakember hozzáférését kezelheted.'); }
}
function deleteUser_(arg, self) {
  const id = String(arg && arg.id || '');
  return withLock_(() => {
    const users = loadUsers_();
    const u = users.find(x => x.id === id);
    if (!u) return users.map(adminListUser_);
    if (u.id === self.id) throw new Error('A saját felhasználódat nem törölheted.');
    if (u.role === 'admin' && !u.disabled && users.filter(x => x.role === 'admin' && !x.disabled).length < 2)
      throw new Error('Legalább egy aktív ügyvezetőnek maradnia kell.');
    const rest = users.filter(x => x.id !== id);
    saveUsers_(rest);
    revokeSessionsOf_(id);
    return rest.map(adminListUser_);
  });
}

/* ===================== AZ EGYETLEN BELÉPÉSI PONT A KLIENSBŐL ===================== */
const READ_ONLY_RPC_ = { szHistBuyers: 1, clientInvoices: 1, contractTpl: 1, ctTplList: 1, arkPricesGet: 1, arkPricesSet: 1, hubspotSources: 1, deliverRecipients: 1, dataVer: 1, dbPing: 1, geoSearch: 1, driveScan: 1, whoAmI: 1, bootstrap: 1, calendarEvents: 1, crewFinalPreview: 1, eqListPreview: 1, getLog: 1, listUsers: 1, setViewAs: 1, logout: 1, lookupTaxpayer: 1, hubspotContacts: 1, settingsData: 1, finData: 1, szPdf: 1 };   // ezek nem módosítják a projektadatokat
function rpc(token, name, arg) {
  const res = rpcInner_(token, name, arg);
  if (dbOn_()) dbFlush_();   // biztonság kedvéért: a zároláson kívüli módosítások is mentődjenek
  if (!READ_ONLY_RPC_[String(name)]) dataBump_();   // módosítás után a betöltési gyorsítótár érvénytelen
  return res;
}
function rpcInner_(token, name, arg) {
  const u = authUser_(token);
  const role = u.role;
  const deny = () => { throw new Error('FORBIDDEN: ehhez nincs jogosultságod.'); };
  const canEdit = () => { if (role !== 'admin' && role !== 'editor') deny(); };
  const adminOnly = () => { if (role !== 'admin') deny(); };
  switch (String(name)) {
    case 'whoAmI': return publicUser_(u);
    case 'arkPricesGet': adminOnly(); return arkPrices_();
    case 'arkPricesSet': adminOnly(); return arkPricesSet_(u, arg);
    case 'dwdSet': adminOnly(); return dwdSet_(u, arg);
    case 'dwdTest': adminOnly(); return dwdTest_(u, arg);
    case 'dataVer': return { v: dataVer_() };   // olcsó változásfigyelés: a kliens ebből tudja, hogy frissítsen-e
    case 'setViewAs': { setViewAs_(token, u, arg); return { ok: true, boot: bootstrap_(authUser_(token)) }; }   // egy körben: nézetváltás + az új nézet adatai
    case 'logout': PropertiesService.getScriptProperties().deleteProperty(SESSION_PREFIX + sha256hex_(String(token))); return { ok: true };
    case 'bootstrap': if (arg && arg.open) logAppOpen_(u); return bootstrap_(u);
    case 'saveDeal': if (role !== 'admin' && role !== 'sales') deny(); return saveDeal_(u, arg);
    case 'deleteDeal': if (role !== 'admin' && role !== 'sales') deny(); return deleteDeal_(u, arg);
    case 'winDeal': if (role !== 'admin' && role !== 'sales') deny(); return winDeal_(u, arg);
    case 'projSalesComm': {   // a projekt értékesítői jutaléka kézzel (%); üres = az értékesítő sávos szabálya
      adminOnly(); const pid = str_(arg && arg.projectId, 64), raw = String(arg && arg.pct == null ? '' : arg.pct).replace(',', '.').trim();
      const ft = /^ft:/.test(raw) ? Math.max(0, Math.min(VALUE_MAX, Math.round(Number(raw.slice(3)) || 0))) : null;   // kézzel megadott forintösszeg (pontosan)
      if (ft == null && raw !== '' && isNaN(Number(raw))) throw new Error('Érvénytelen százalék.');
      const pct = ft != null ? 'ft:' + ft : raw === '' ? '' : Math.max(0, Math.min(100, Math.round(Number(raw) * 100) / 100));
      withLock_(() => { const sh = sheetFor_('deals'), d = readAll_('deals').find(x => x.projectId === pid && x.stage === 'nyert'); if (!d) throw new Error('A projekthez nincs értékesítő.');
        const r = findRow_(sh, d.id), q = readRow_('deals', sh, r); q.commManual = pct === '' ? '' : String(pct); if (pct !== '' && ft == null) q.commPct = pct; if (ft != null) q.commAmt = ft; q.updatedAt = now_(); q.updatedBy = u.name; putRow_('deals', sh, q, r); }); dbFlush_();
      return { deals: dealsFor_(u), salesPeople: salesPeople_(u) };
    }
    case 'projSales': {   // a projekt értékesítője (Extrák → Értékesítői jutalék)
      adminOnly(); const pid = str_(arg && arg.projectId, 64), oid = str_(arg && arg.ownerId, 64);
      const owner = oid ? salesOwnerOf_(oid) : null; if (oid && !owner) throw new Error('Az értékesítő nem található.');
      projSalesSet_(u, pid, owner, 'Projekttervező'); return { deals: dealsFor_(u), salesPeople: salesPeople_(u) };
    }
    case 'calendarEvents': canEdit(); return calendarEvents_(arg);
    case 'syncCalendar': { canEdit(); const pid = str_(arg && arg.id, 64), sh = sheetFor_('projects'), r = findRow_(sh, pid); if (!r) return { calEventId: '' }; const q = syncCalendar_(fullProject_(readRow_('projects', sh, r))); return { calEventId: q.calEventId || '', calError: q.calError || '' }; }
    case 'saveCalEvent': canEdit(); return saveCalEvent_(u, arg);
    case 'moveCalEvent': canEdit(); return moveCalEvent_(u, arg);
    case 'deleteCalEvent': canEdit(); return deleteCalEvent_(u, arg);
    case 'saveCrewOrder': canEdit(); return saveCrewOrder_(u, arg);
    case 'finalizeCrew': canEdit(); return finalizeCrew_(u, arg);
    case 'finalizeEquipment': canEdit(); return finalizeEquipment_(u, arg);
    case 'eqListPreview': canEdit(); return eqListPreview_(u, arg);
    case 'logNote': canEdit(); logEvent_(u, 'Véglegesített csapat módosítása', str_(arg && arg.subject, 200), str_(arg && arg.details, 300)); return { ok: true };
    case 'crewFinalPreview': canEdit(); return crewFinalPreview_(u, arg);
    case 'saveSignature': canEdit(); return saveSignature_(u, arg);
    case 'finData': adminOnly(); return finDataCached_();
    case 'finUpsert': adminOnly(); return finUpsert_(u, arg);
    case 'finDelete': adminOnly(); return finDelete_(u, arg);
    case 'finSettings': adminOnly(); return finSaveSettings_(u, arg);
    case 'finSetPay': adminOnly(); return finSetPay_(u, arg);
    case 'finImport': adminOnly(); return finImport_(u, arg);
    case 'szSettings': adminOnly(); return szSaveSettings_(u, arg);
    case 'szInvoice': adminOnly(); return szInvoice_(u, arg);
    case 'szLink': adminOnly(); return szLink_(u, arg);
    case 'szUnlink': adminOnly(); return szUnlink_(u, arg);
    case 'szMove': adminOnly(); return szMove_(u, arg);
    case 'szStorno': adminOnly(); return szStorno_(u, arg);
    case 'szDbkDelete': adminOnly(); return szDbkDelete_(u, arg);
    case 'szManual': adminOnly(); return szManual_(u, arg);
    case 'szLinkBatch': adminOnly(); return szLinkBatch_(u, arg);
    case 'szPeek': adminOnly(); return szPeek_(u, arg);
    case 'szSearch': adminOnly(); return szSearch_(u, arg);
    case 'szSetKind': adminOnly(); return szSetKind_(u, arg);
    case 'szSync': adminOnly(); return szSync_(u, arg);
    case 'szPdf': adminOnly(); return szPdf_(u, arg);
    case 'billSave': adminOnly(); return billSave_(u, arg);
    case 'billUpload': adminOnly(); return billUpload_(u, arg);
    case 'extraFileUpload': adminOnly(); return extraFileUpload_(u, arg);
    case 'mySignature': { const sg = signatureFor_(u); return { html: sg ? sg.html : '' }; }   // a saját e-mail aláírás előnézete (pl. az ügyfélnek küldött levél alatt)
    case 'fwSave': adminOnly(); return fwSave_(u, arg);
    case 'crewDocSave': adminOnly(); return crewDocSave_(u, arg);
    case 'crewDocGet': adminOnly(); return crewDocGet_(u, arg);
    case 'changesList': {   // az app változásnaplója – nem nyilvános, csak az ügyvezető kapja meg
      if (role !== 'admin' && u.realRole !== 'admin') deny(); const c = CacheService.getScriptCache(), hit = c.get('pm_changes');   // előnézetben (szakember/értékesítő nézet) is az ügyvezetőé if (hit) return JSON.parse(hit);
      const r = UrlFetchApp.fetch(FRONTEND_URL.replace(/\/$/, '') + '/api/changes', { muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } });
      if (r.getResponseCode() !== 200) return { items: [] };
      const out = { items: ((JSON.parse(r.getContentText()) || {}).items || []).slice(0, 40) }; try { c.put('pm_changes', JSON.stringify(out), 120); } catch (e) {} return out;
    }
    case 'crewDocsImport': adminOnly(); return crewDocsImport_(u, arg);
    case 'crewDocDelete': adminOnly(); return crewDocDelete_(u, arg);
    case 'crewDocRename': adminOnly(); return crewDocRename_(u, arg);
    case 'setMail': adminOnly(); return setMail_(u, arg);
    case 'driveScan': adminOnly(); return driveScan_(arg);
    case 'driveOps': adminOnly(); return driveOps_(u, arg);
    case 'driveMoveFolder': adminOnly(); return driveMoveFolder_(u, arg);
    case 'fwDelete': adminOnly(); return fwDelete_(u, arg);
    case 'clientDocDelete': adminOnly(); return clientDocDelete_(u, arg);
    case 'clientPreview': return clientPreview_(u, arg);
    case 'clientDocUpload': adminOnly(); return clientDocUpload_(u, arg);
    case 'contractSig': adminOnly(); return contractSig_(u);
    case 'calResyncNow': adminOnly(); { const t0 = Date.now(); calResyncUpcoming(); logEvent_(u, 'Naptár újraszinkron', '', 'közelgő események leírása'); return { ok: true, ms: Date.now() - t0 }; }
    case 'contractPdf': adminOnly(); return contractPdf_(u, arg);
    case 'contractSend': adminOnly(); return contractSend_(u, arg);
    case 'triggerStatus': adminOnly(); return triggerStatus_();
    case 'triggerDelete': adminOnly(); return triggerDelete_(arg);
    case 'szHistScan': adminOnly(); return szHistScan_(u, arg);
    case 'szHistBuyers': adminOnly(); return szHistBuyers_();
    case 'clientInvoices': adminOnly(); return clientInvoices_(arg);
    case 'ctStatus': if (role !== 'admin' && role !== 'sales') deny(); if (role !== 'admin' && arg && arg.projectId && !arg.dealId) deny(); return ctStatusSet_(u, arg);
    case 'clientFolder': adminOnly(); return clientFolderUrl_(arg);
    case 'geoSearch': return geoSearch_(arg);
    case 'dbPing': adminOnly(); return dbPing_();
    case 'salesSyncNow': adminOnly(); return salesSync();
    case 'dbMigrate': adminOnly(); return dbMigrate_(u);
    case 'dbSetMode': adminOnly(); return dbSetMode_(u, arg);
    case 'dbBackup': adminOnly(); return dbBackup_();
    case 'clientDocs': adminOnly(); return clientDocs_(arg);
    case 'tigCreate': adminOnly(); return tigCreate_(u, arg);
    case 'tigSave': adminOnly(); return tigSave_(u, arg);
    case 'tigSend': adminOnly(); return tigSend_(u, arg);
    case 'tigReplies': adminOnly(); return tigReplies_(u);
    case 'requestBudgetChange': canEdit(); return requestBudgetChange_(u, arg);
    case 'decideBudgetChange': adminOnly(); return decideBudgetChange_(u, arg);
    case 'saveProject': canEdit(); return projectView_(saveProject_(u, arg), u);
    case 'rawNotify': canEdit(); return rawNotify_(u, arg);
    case 'crewDeliver': return crewDeliver_(u, arg);
    case 'videoSet': return videoSet_(u, arg);
    case 'videoReview': return videoReview_(u, arg);
    case 'videoReviewBatch': return videoReviewBatch_(u, arg);
    case 'videoClient': return videoClient_(u, arg);
    case 'videoComment': return videoComment_(u, arg);
    case 'videoCommentDel': return videoCommentDel_(u, arg);
    case 'videoCmDone': return videoCmDone_(u, arg);
    case 'myNotify': return myNotify_(u, arg);
    case 'dealQuoteSend': return dealQuoteSend_(u, arg);
    case 'dealQuoteSig': return dealQuoteSig_(u, arg);
    case 'wmPaidMail': adminOnly(); { const pid = str_(arg && arg.projectId, 64); const why = wmPaidMail_(pid); return { sent: !!PropertiesService.getScriptProperties().getProperty('WMPAID_' + pid), why: why }; }
    case 'contractTpl': adminOnly(); return ctTplGet_(String(arg && arg.k || ''), arg);
    case 'ctTplList': adminOnly(); return ctTplList_();
    case 'ctTplUpload': adminOnly(); return ctTplUpload_(u, arg);
    case 'deliverRecipients': return deliverRecipients_(u);
    case 'setDeliveryLinks': return setDeliveryLinks_(u, arg);
    case 'deleteProject': canEdit(); return deleteProject_(u, arg);
    case 'createProjectFolder': canEdit(); return createProjectFolder_(u, arg);
    case 'lookupTaxpayer': canEdit(); return lookupTaxpayerApi_(arg);
    case 'hubspotContactLink': if (role !== 'admin' && role !== 'editor' && role !== 'sales') deny(); return hubspotContactLinkApi_(arg);
    case 'hubspotNotes': if (role !== 'admin' && role !== 'editor' && role !== 'sales') deny(); return hubspotNotesApi_(arg);
    case 'hubspotCompanies': if (role !== 'admin' && role !== 'editor' && role !== 'sales') deny(); return hubspotCompaniesApi_(arg);
    case 'hubspotSources': if (role !== 'admin' && role !== 'editor' && role !== 'sales') deny(); return hsSourceProp_();
    case 'hubspotContacts': if (role !== 'admin' && role !== 'editor' && role !== 'sales') deny(); return hubspotContactsApi_(arg);   // az értékesítő a lehetőségekhez keres kapcsolattartót
    case 'sendEquipmentList': canEdit(); return sendEquipmentList_(u, arg);
    case 'saveCrew': canEdit(); return saveCrew_(u, arg);
    case 'deleteCrew': canEdit(); return deleteCrew_(u, arg);
    case 'saveItem': canEdit(); return saveItem_(u, arg);
    case 'deleteItem': canEdit(); return deleteItem_(u, arg);
    case 'saveClient': canEdit(); return saveClient_(u, arg);
    case 'addPenalty': canEdit(); return addPenalty_(u, arg);
    case 'decidePenalty': adminOnly(); return decidePenalty_(u, arg);
    case 'deletePenalty': adminOnly(); return deletePenalty_(u, arg);
    case 'movePenaltyDay': adminOnly(); return movePenaltyDay_(u, arg);
    case 'objectPenalty': if (role !== 'crew' || !u.crewId) deny(); return objectPenalty_(u, arg);
    case 'saveOfficeRent': canEdit(); return saveOfficeRent_(u, arg);
    case 'savePayAdjust': canEdit(); return savePayAdjust_(u, arg);   // a termelési vezető is
    case 'invitePreview': canEdit(); return inviteMailBuild_({ name: str_(arg && arg.name, 60) || 'Kolléga', email: str_(arg && arg.email, 160) || '…' }, u);
    case 'payStatementPreview': adminOnly(); { const b = payStatementBuild_(u, arg); return { html: b.html, subject: b.subject, to: String(b.c.email || ''), from: (u.name || '') + ' · Lumos Motion <' + (u.email || MAIL_FROM) + '>' }; }
    case 'paySentHtml': return paySentHtml_(u, arg);
    case 'navSync': adminOnly(); { try { installNavTrigger_(); } catch (e) { } return navSync_(u, arg); }
    case 'navInvoices': adminOnly(); return navInvoices_(u, arg);
    case 'navStatus': adminOnly(); { const c = navConfig_(); return { ok: c.ok, last: PropertiesService.getScriptProperties().getProperty('NAV_LAST_SYNC') || '' }; }
    case 'setPayStatus': adminOnly(); return setPayStatus_(u, arg);
    case 'sendPayStatements': adminOnly(); return sendPayStatements_(u, arg);
    case 'deleteClient': canEdit(); return deleteClient_(u, arg);
    case 'getLog': adminOnly(); return getLog_();
    case 'projectHistory': canEdit(); return projectHistory_(u, arg);
    case 'settingsData': canEdit(); return { users: loadUsers_().filter(x => role === 'admin' || x.role === 'crew' || x.id === u.id).map(adminListUser_), sigs: role === 'admin' ? sigList_() : (o => { const r = {}; if (o[u.id]) r[u.id] = o[u.id]; return r; })(sigList_()), log: role === 'admin' ? getLog_().slice(0, 600) : [], dwd: role === 'admin' ? dwdStatus_() : null };   // a termelési vezető a hozzáféréseket látja, a naplót nem   // egy kérésben a Beállítások fülhöz
    case 'listUsers': adminOnly(); return loadUsers_().map(adminListUser_);
    case 'saveUser': {
      canEdit(); editorUserGuard_(u, String(arg && arg.role || ''), arg && arg.id);
      const res = saveUser_(arg, u);
      const a = arg || {};
      logEvent_(u, 'Felhasználó mentve', String(a.name || ''), (a.id ? 'módosítva' : 'új') + ' · ' + (ROLE_NAMES_[a.role] || a.role) + (a.disabled === true ? ' · letiltva' : '') + (res.mail && res.mail.sent ? ' · Google-meghívó kiküldve' : ''));
      return res;
    }
    case 'setUserDisabled': {
      canEdit(); editorUserGuard_(u, undefined, arg && arg.id);
      const res = setUserDisabled_(arg, u);
      logEvent_(u, arg && arg.disabled ? 'Felhasználó letiltva' : 'Felhasználó engedélyezve', res.name, '');
      return res.users;
    }
    case 'deleteUser': {
      canEdit(); editorUserGuard_(u, undefined, arg && arg.id);
      let who = ''; try { const x = loadUsers_().find(z => z.id === String(arg && arg.id || '')); who = x ? x.name : ''; } catch (e) {}
      const res = deleteUser_(arg, u);
      logEvent_(u, 'Felhasználó törölve', who, '');
      return res;
    }
    default: throw new Error('Ismeretlen művelet.');
  }
}
