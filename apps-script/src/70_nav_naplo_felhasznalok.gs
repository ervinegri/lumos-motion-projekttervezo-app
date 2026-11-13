/* ===================== NAV ONLINE SZÁMLA: bejövő számlák =====================
   A szakemberek a Lumos Motion adószámára állítják ki a számlát, ez a NAV-hoz is beérkezik. Naponta (és kérésre) lekérdezzük
   a cég bejövő számláit, és a kiküldött díjösszesítőkhöz párosítjuk: szállító adószáma = a munkatárs adószáma.
   Beállítás (Script Properties, a NAV Online Számla felületén létrehozott technikai felhasználó adatai):
     NAV_LOGIN, NAV_PASSWORD, NAV_SIGN_KEY   (a jelszót és a kulcsot soha ne küldd el senkinek). */
const NAV_URL_ = 'https://api.onlineszamla.nav.gov.hu/invoiceService/v3';
const NAV_SOFTWARE_ID_ = 'HU32701573LPM-0001';
function navConfig_() {
  const P = PropertiesService.getScriptProperties(), login = P.getProperty('NAV_LOGIN') || '', pass = P.getProperty('NAV_PASSWORD') || '', sign = P.getProperty('NAV_SIGN_KEY') || '';
  return { ok: !!(login && pass && sign), login: login, pass: pass, sign: sign, tax: String(PAY_COMPANY_.tax).slice(0, 8) };
}
/* SHA3-512 (Keccak, FIPS 202) – a NAV kérés-aláírásához; az Apps Script ezt nem ismeri beépítve */
function sha3_512Hex_(str) {
  /* 64 bites sávok 32 bites hi/lo párokban (BigInt nélkül – az Apps Script nem engedi a BigInt literálokat) */
  const RC = [1,0, 32898,0, 32906,2147483648, 2147516416,2147483648, 32907,0, 2147483649,0, 2147516545,2147483648, 32777,2147483648, 138,0, 136,0, 2147516425,0, 2147483658,0, 2147516555,0, 139,2147483648, 32905,2147483648, 32771,2147483648, 32770,2147483648, 128,2147483648, 32778,0, 2147483658,2147483648, 2147516545,2147483648, 32896,2147483648, 2147483649,0, 2147516424,2147483648];
  const R = [0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14];
  const bytes = []; const u = unescape(encodeURIComponent(String(str))); for (let i = 0; i < u.length; i++) bytes.push(u.charCodeAt(i));
  const rate = 72; bytes.push(0x06); while (bytes.length % rate) bytes.push(0); bytes[bytes.length - 1] |= 0x80;
  const lo = new Array(25).fill(0), hi = new Array(25).fill(0), Bl = new Array(25), Bh = new Array(25), Cl = new Array(5), Ch = new Array(5);
  const rot = (l, h, n) => { if (n === 0) return [l, h]; if (n >= 32) { const t = l; l = h; h = t; n -= 32; } if (n === 0) return [l, h];
    return [((l << n) | (h >>> (32 - n))) >>> 0, ((h << n) | (l >>> (32 - n))) >>> 0]; };
  const f = () => { for (let r = 0; r < 24; r++) {
    for (let x = 0; x < 5; x++) { Cl[x] = lo[x] ^ lo[x + 5] ^ lo[x + 10] ^ lo[x + 15] ^ lo[x + 20]; Ch[x] = hi[x] ^ hi[x + 5] ^ hi[x + 10] ^ hi[x + 15] ^ hi[x + 20]; }
    for (let x = 0; x < 5; x++) { const t = rot(Cl[(x + 1) % 5], Ch[(x + 1) % 5], 1), Dl = Cl[(x + 4) % 5] ^ t[0], Dh = Ch[(x + 4) % 5] ^ t[1];
      for (let y = 0; y < 25; y += 5) { lo[x + y] ^= Dl; hi[x + y] ^= Dh; } }
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) { const t = rot(lo[x + 5 * y], hi[x + 5 * y], R[x + 5 * y]), k = y + 5 * ((2 * x + 3 * y) % 5); Bl[k] = t[0]; Bh[k] = t[1]; }
    for (let y = 0; y < 25; y += 5) for (let x = 0; x < 5; x++) { lo[x + y] = Bl[x + y] ^ (~Bl[(x + 1) % 5 + y] & Bl[(x + 2) % 5 + y]); hi[x + y] = Bh[x + y] ^ (~Bh[(x + 1) % 5 + y] & Bh[(x + 2) % 5 + y]); }
    lo[0] ^= RC[2 * r]; hi[0] ^= RC[2 * r + 1]; } };
  for (let o = 0; o < bytes.length; o += rate) { for (let i = 0; i < rate / 8; i++) { const q = o + i * 8;
    lo[i] ^= (bytes[q] | (bytes[q + 1] << 8) | (bytes[q + 2] << 16) | (bytes[q + 3] << 24));
    hi[i] ^= (bytes[q + 4] | (bytes[q + 5] << 8) | (bytes[q + 6] << 16) | (bytes[q + 7] << 24)); } f(); }
  let hex = ''; for (let i = 0; i < 8; i++) for (const w of [lo[i], hi[i]]) for (let b = 0; b < 4; b++) hex += ((w >>> (8 * b)) & 255).toString(16).padStart(2, '0');
  return hex.toUpperCase();
}
function navHex_(bytes) { return bytes.map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('').toUpperCase(); }
function navXmlEsc_(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function navRequest_(cfg, body, page, dir) {
  const txt = navCall_(cfg, 'QueryInvoiceDigest', '<page>' + page + '</page><invoiceDirection>' + dir + '</invoiceDirection>' + body);
  const tag = (src, n) => { const m = new RegExp('<(?:\\w+:)?' + n + '\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?' + n + '>').exec(src); return m ? m[1].trim() : ''; };
  const items = []; const re = /<(?:\w+:)?invoiceDigest>([\s\S]*?)<\/(?:\w+:)?invoiceDigest>/g; let m;
  while ((m = re.exec(txt))) { const d = m[1];
    items.push({ number: tag(d, 'invoiceNumber'), operation: tag(d, 'invoiceOperation'), issueDate: tag(d, 'invoiceIssueDate'), deliveryDate: tag(d, 'invoiceDeliveryDate'), supplierTax: tag(d, 'supplierTaxNumber'), supplierName: tag(d, 'supplierName'),
      net: Math.round(Number(tag(d, 'invoiceNetAmountHUF') || tag(d, 'invoiceNetAmount')) || 0), vat: Math.round(Number(tag(d, 'invoiceVatAmountHUF') || tag(d, 'invoiceVatAmount')) || 0) }); }
  return { items: items, pages: Number(tag(txt, 'availablePage')) || 1 };
}
/** Általános NAV Online Számla v3 hívás (op: pl. QueryInvoiceDigest, QueryInvoiceData); a válasz XML szövege */
function navCall_(cfg, op, inner) {
  const now = new Date(), ts = now.toISOString().replace(/\.\d+Z$/, '.000Z'), sigTs = ts.replace(/[-:T]/g, '').slice(0, 14);
  const rid = ('LPM' + now.getTime().toString(36) + Math.random().toString(36).slice(2, 10)).toUpperCase().slice(0, 30);
  const pw = navHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_512, cfg.pass, Utilities.Charset.UTF_8));
  const sig = sha3_512Hex_(rid + sigTs + cfg.sign);
  const xml = '<?xml version="1.0" encoding="UTF-8"?><' + op + 'Request xmlns="http://schemas.nav.gov.hu/OSA/3.0/api" xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common">'
    + '<common:header><common:requestId>' + rid + '</common:requestId><common:timestamp>' + ts + '</common:timestamp><common:requestVersion>3.0</common:requestVersion><common:headerVersion>1.0</common:headerVersion></common:header>'
    + '<common:user><common:login>' + navXmlEsc_(cfg.login) + '</common:login><common:passwordHash cryptoType="SHA-512">' + pw + '</common:passwordHash><common:taxNumber>' + cfg.tax + '</common:taxNumber><common:requestSignature cryptoType="SHA3-512">' + sig + '</common:requestSignature></common:user>'
    + '<software><softwareId>' + NAV_SOFTWARE_ID_ + '</softwareId><softwareName>Lumos Motion Projekttervezo</softwareName><softwareOperation>LOCAL_SOFTWARE</softwareOperation><softwareMainVersion>1.0</softwareMainVersion><softwareDevName>Lumos Motion Kft.</softwareDevName><softwareDevContact>' + navXmlEsc_(MAIL_REPLY_TO) + '</softwareDevContact><softwareDevCountryCode>HU</softwareDevCountryCode><softwareDevTaxNumber>' + cfg.tax + '</softwareDevTaxNumber></software>'
    + inner + '</' + op + 'Request>';
  const res = UrlFetchApp.fetch(NAV_URL_ + '/' + op.charAt(0).toLowerCase() + op.slice(1), { method: 'post', contentType: 'application/xml', payload: xml, muteHttpExceptions: true, headers: { Accept: 'application/xml' } });
  const txt = res.getContentText();
  const tag = (src, n) => { const m = new RegExp('<(?:\\w+:)?' + n + '\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?' + n + '>').exec(src); return m ? m[1].trim() : ''; };
  if (res.getResponseCode() !== 200 || tag(txt, 'funcCode') === 'ERROR') throw new Error('NAV: ' + (tag(txt, 'message') || tag(txt, 'errorCode') || ('HTTP ' + res.getResponseCode())));
  return txt;
}
/** Bejövő számla(ák) tartalma a NAV-ból (a megtekintéshez): eladó, vevő, dátumok, tételek, összesítő */
function navInvoices_(u, a) {
  const cfg = navConfig_(); if (!cfg.ok) throw new Error('A NAV-kapcsolat nincs beállítva.');
  const tax = String(a && a.tax || '').replace(/\D/g, '').slice(0, 8), nos = String(a && a.nos || '').split(/\s*,\s*/).filter(Boolean).slice(0, 6);
  if (tax.length !== 8 || !nos.length) throw new Error('Hiányzik a számlaszám vagy az adószám.');
  const tag = (src, n) => { const m = new RegExp('<(?:\\w+:)?' + n + '\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?' + n + '>').exec(src); return m ? m[1].trim() : ''; };
  const all = (src, n) => { const out = [], re = new RegExp('<(?:\\w+:)?' + n + '\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?' + n + '>', 'g'); let m; while ((m = re.exec(src))) out.push(m[1]); return out; };
  const un = s => String(s || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const addr = s => { if (!s) return ''; const p = ['postalCode', 'city'].map(k => tag(s, k)).filter(Boolean).join(' '), rest = tag(s, 'additionalAddressDetail') || [tag(s, 'streetName'), tag(s, 'publicPlaceCategory'), tag(s, 'number'), tag(s, 'building'), tag(s, 'floor'), tag(s, 'door')].filter(Boolean).join(' '); return un([p, rest].filter(Boolean).join(', ')); };
  const taxStr = s => [tag(s, 'taxpayerId'), tag(s, 'vatCode'), tag(s, 'countyCode')].filter(Boolean).join('-');
  return nos.map(no => {
    const txt = navCall_(cfg, 'QueryInvoiceData', '<invoiceNumberQuery><invoiceNumber>' + navXmlEsc_(no) + '</invoiceNumber><invoiceDirection>INBOUND</invoiceDirection><supplierTaxNumber>' + tax + '</supplierTaxNumber></invoiceNumberQuery>');
    const b64 = tag(txt, 'invoiceData'); if (!b64) return { number: no, error: 'A NAV nem adta vissza a számla adatait.' };
    let bytes = Utilities.base64Decode(b64);
    if (tag(txt, 'compressedContentIndicator') === 'true') bytes = Utilities.ungzip(Utilities.newBlob(bytes, 'application/x-gzip')).getBytes();
    const x = Utilities.newBlob(bytes).getDataAsString('UTF-8');
    const sup = tag(x, 'supplierInfo'), cus = tag(x, 'customerInfo'), det = tag(x, 'invoiceDetail'), sum = tag(x, 'invoiceSummary');
    const lines = all(x, 'line').map(l => ({ name: un(tag(l, 'lineDescription')), qty: Number(tag(l, 'quantity')) || 0, unit: un(tag(l, 'unitOfMeasureOwn') || tag(l, 'unitOfMeasure')), price: Number(tag(l, 'unitPrice')) || 0,
      net: Number(tag(l, 'lineNetAmount')) || 0, vat: tag(l, 'vatPercentage') ? Math.round(Number(tag(l, 'vatPercentage')) * 100) + '%' : (tag(tag(l, 'vatExemption'), 'case') || (tag(l, 'vatOutOfScope') ? 'ÁKK' : '')), gross: Number(tag(l, 'lineGrossAmountNormal') || tag(l, 'lineGrossAmountSimplified')) || 0 }));
    return { number: tag(x, 'invoiceNumber') || no, issueDate: tag(x, 'invoiceIssueDate'), deliveryDate: tag(det, 'invoiceDeliveryDate'), dueDate: tag(det, 'paymentDate'), payMethod: tag(det, 'paymentMethod'),
      supplier: { name: un(tag(sup, 'supplierName')), tax: taxStr(tag(sup, 'supplierTaxNumber')), address: addr(tag(sup, 'supplierAddress')), bank: tag(sup, 'supplierBankAccountNumber') },
      customer: { name: un(tag(cus, 'customerName')), address: addr(tag(cus, 'customerAddress')) },
      lines: lines, net: Number(tag(sum, 'invoiceNetAmount')) || lines.reduce((s, l) => s + l.net, 0), vat: Number(tag(sum, 'invoiceVatAmount')) || 0, gross: Number(tag(sum, 'invoiceGrossAmount')) || lines.reduce((s, l) => s + (l.gross || l.net), 0) };
  });
}
/** A cég bejövő számlái kiállítási dátum szerint (a NAV egy lekérdezésben legfeljebb 35 napot enged, ezért szakaszokban). */
function navInbound_(cfg, from, to) {
  const out = [], day = 86400000, d0 = new Date(from + 'T00:00:00Z').getTime(), d1 = new Date(to + 'T00:00:00Z').getTime(), iso = t => new Date(t).toISOString().slice(0, 10);
  for (let a = d0; a <= d1; a += 35 * day) {
    const b = Math.min(d1, a + 34 * day), body = '<invoiceQueryParams><mandatoryQueryParams><invoiceIssueDate><dateFrom>' + iso(a) + '</dateFrom><dateTo>' + iso(b) + '</dateTo></invoiceIssueDate></mandatoryQueryParams></invoiceQueryParams>';
    let page = 1, pages = 1;
    do { const r = navRequest_(cfg, body, page, 'INBOUND'); r.items.forEach(x => out.push(x)); pages = r.pages; page++; } while (page <= pages && page <= 20);
  }
  return out;
}
/** Párosítás: a kiküldött díjösszesítőkhöz (hónap + munkatárs) a szállító adószáma alapján; az összeg egyezése a megbízhatóságot jelzi. */
function navSync_(u, a) {
  const cfg = navConfig_();
  if (!cfg.ok) throw new Error('A NAV-kapcsolat nincs beállítva: add meg a NAV_LOGIN, NAV_PASSWORD és NAV_SIGN_KEY szkripttulajdonságot (Projektbeállítások → Szkripttulajdonságok).');
  const today = today_(), sent = readAll_('paySent'), crew = byId_(readAll_('crew')), status = readAll_('payStatus');
  const want = str_(a && a.month, 7), one = str_(a && a.crewId, 64), months = {};   // one: egy munkatárs külön lekérdezése (újrapárosítás)
  sent.forEach(x => { const m = String(x.month); if (!/^\d{4}-\d{2}$/.test(m) || (one && x.crewId !== one)) return; if (want ? m === want : m >= addMonths_(today.slice(0, 7), -3)) (months[m] = months[m] || []).push(x); });
  if (one && want && !months[want]) throw new Error('Ehhez a munkatárshoz ebben a hónapban még nem ment ki díjösszesítő – előbb küldd ki, utána párosítható a számla.');
  const used = {}; status.forEach(s => { if (one && s.id === want + '|' + one) return; if (s.invoiceNo) String(s.invoiceNo).split(/\s*,\s*/).forEach(no => { used[no + '|' + String(s.invoiceTax || '')] = 1; }); });
  const found = [], missingTax = [];
  Object.keys(months).sort().forEach(m => {
    const from = m + '-01', endTry = addMonths_(m, 3) + '-01', to = endTry < today ? endTry : today;
    const inv = navInbound_(cfg, from, to).filter(x => x.operation !== 'STORNO' && x.operation !== 'MODIFY');
    months[m].forEach(x => {
      const c = crew[x.crewId]; if (!c || isEmployee_(c)) return;   // alkalmazott: nem számláz
      const st = status.find(s => s.id === m + '|' + x.crewId) || {}; if (st.invoiceNo && !one) return;   // már párosítva (egyéni lekérdezésnél újrapárosít)
      const tax8 = String(c.tax || '').replace(/\D/g, '').slice(0, 8); if (tax8.length !== 8) { missingTax.push(c.name); return; }
      // nem nézünk visszamenőleg: csak a hónap utolsó napján vagy a díjösszesítő kiküldése után kiállított számlák számítanak (a hónap eleji számla az előző hónapé)
      const lastDay = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).toISOString().slice(0, 10);
      const sentD = String(x.sentAt || '').slice(0, 10), thr = sentD && sentD < lastDay ? sentD : lastDay;
      const cand = inv.filter(i => String(i.supplierTax).slice(0, 8) === tax8 && !used[i.number + '|' + tax8] && i.issueDate >= thr)
        .sort((p, q) => p.issueDate.localeCompare(q.issueDate));
      if (!cand.length) { if (one && st.invoiceNo) payStatusClear_(m, c); return; }   // egyéni újrapárosítás: a rossz párosítás törlődik
      const exp = Math.round(Number(x.amount) || 0), exact = cand.find(i => i.net === exp), pick = exact ? [exact] : cand;   // több számla (pl. projektenként): együtt
      const net = pick.reduce((s, i) => s + i.net, 0), nos = pick.map(i => i.number).join(', ').slice(0, 300), ok = net === exp;
      pick.forEach(i => { used[i.number + '|' + tax8] = 1; });
      payStatusApply_(u, m, c, { invoicedAt: pick[pick.length - 1].issueDate, invoicedBy: 'NAV', invoiceNo: nos, invoiceNet: net, invoiceTax: tax8, invoiceMatch: ok ? 'ok' : 'diff' });
      found.push({ name: c.name, month: m, number: nos, net: net, expected: exp, match: ok });
    });
  });
  PropertiesService.getScriptProperties().setProperty('NAV_LAST_SYNC', now_());
  if (found.length) logEvent_(u, 'NAV-számlák párosítva', found.map(f => f.name).join(', '), found.map(f => f.month + ': ' + f.number).join(' · '));
  return { found: found, missingTax: missingTax.filter((v, i, arr) => arr.indexOf(v) === i), payStatus: readAll_('payStatus'), at: now_() };
}
function addMonths_(ym, n) { const y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) - 1 + n; return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7); }
function payStatusClear_(month, c) {   // téves NAV-párosítás törlése
  withLock_(() => { const sh = sheetFor_('payStatus'), row = findRow_(sh, month + '|' + c.id); if (!row) return; const cur = readRow_('payStatus', sh, row);
    Object.assign(cur, { invoicedAt: '', invoicedBy: '', invoiceNo: '', invoiceNet: '', invoiceTax: '', invoiceMatch: '' }); putRow_('payStatus', sh, cur, row); });
}
function payStatusApply_(u, month, c, patch) {
  withLock_(() => {
    const sh = sheetFor_('payStatus'), id = month + '|' + c.id, row = findRow_(sh, id);
    const cur = row ? readRow_('payStatus', sh, row) : { id: id, month: month, crewId: c.id, crewName: c.name, invoicedAt: '', invoicedBy: '', paidAt: '', paidBy: '' };
    if (cur.invoicedAt && !patch.invoiceNo) return;
    Object.assign(cur, cur.invoicedAt ? { invoicedAt: patch.invoicedAt || cur.invoicedAt, invoiceNo: patch.invoiceNo, invoiceNet: patch.invoiceNet, invoiceTax: patch.invoiceTax, invoiceMatch: patch.invoiceMatch } : patch);   // kézi pipánál is a számla kiállítási dátuma kerül be
    putRow_('payStatus', sh, cur, row);
  });
}
/* Napi automatikus futás (időzítő): reggel 7 és 8 között */
function navDailySync() { if (!navConfig_().ok) return; try { navSync_({ name: 'NAV (automatikus)', role: 'admin', email: '' }, {}); } catch (e) { Logger.log('NAV szinkron hiba: ' + e); } if (DB_) dbFlush_(); }
function installNavTrigger_() {
  if (ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'navDailySync')) return;
  ScriptApp.newTrigger('navDailySync').timeBased().atHour(7).everyDays(1).inTimezone(SHEET_TZ).create();
}

/* Fizetési korrekció: havi extra levonás vagy hozzáadás szakemberenként (pl. valaki a saját keretéből kipótolja egy kolléga díját). 0 = törlés. */
function savePayAdjust_(u, a) {   // havonta szakemberenként több korrekciós sor is lehet (id: crewId|hónap[|xxxx])
  const crewId = str_(a && a.crewId, 64), month = str_(a && a.month, 7), reqId = str_(a && a.id, 100);
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Hibás hónap.');
  const c = readAll_('crew').find(x => x.id === crewId); if (!c) throw new Error('A munkatárs nem található.');
  const amount = Math.round(Number(String(a.amount == null ? '' : a.amount).replace(/[^\d-]/g, '')) || 0), note = str_(a.note, 300).trim();
  const old = reqId ? readAll_('payAdjust').find(x => x.id === reqId && x.crewId === crewId && String(x.month) === month) : null;
  if (reqId && !old) throw new Error('A korrekció nem található – frissítsd az oldalt.');
  if (readAll_('paySent').some(x => x.id === month + '|' + crewId)) {
    if (!old) throw new Error('A díjösszesítő már kiment – új korrekció erre a hónapra nem vehető fel.');
    if (Math.round(Number(old.amount) || 0) !== amount) throw new Error('A díjösszesítő már kiment – az összeg nem módosítható, csak a megjegyzés.');
  }
  if (Math.abs(amount) > FEE_MAX) throw new Error('Túl nagy összeg.');
  if (amount && note.length < 3) throw new Error('Írd be röviden, miért jár a korrekció.');
  if (!old && !amount) return readAll_('payAdjust');
  return withLock_(() => {
    const sh = sheetFor_('payAdjust'), id = old ? old.id : crewId + '|' + month + '|' + Utilities.getUuid().slice(0, 8), row = old ? findRow_(sh, id) : 0;
    if (!amount) { if (row) sh.deleteRow(row); }
    else putRow_('payAdjust', sh, { id: id, month: month, crewId: crewId, crewName: c.name, amount: amount, note: note, updatedAt: now_(), updatedBy: u.name }, row || null);
    dbFlush_();
    logEvent_(u, 'Fizetési korrekció', c.name, month + ': ' + (amount ? (amount > 0 ? '+' : '') + amount + ' Ft · ' + note : 'törölve'));
    return readAll_('payAdjust');
  });
}
function saveOfficeRent_(u, a) {
  const crewId = str_(a && a.crewId, 64), month = str_(a && a.month, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Hibás hónap.');
  const c = readAll_('crew').find(x => x.id === crewId); if (!c) throw new Error('A munkatárs nem található.');
  const clear = a.amount === '' || a.amount == null, amount = clear ? 0 : int_(a.amount, 0, FEE_MAX, 0);
  return withLock_(() => {
    const sh = sheetFor_('officeRent'), id = crewId + '|' + month, row = findRow_(sh, id);
    if (clear) { if (row) sh.deleteRow(row); }
    else putRow_('officeRent', sh, { id: id, crewId: crewId, crewName: c.name, month: month, amount: amount, updatedAt: now_(), updatedBy: u.name }, row);
    dbFlush_();
    logEvent_(u, 'Irodabérlet', c.name, month + ': ' + (clear ? 'törölve' : amount + ' Ft'));
    return readAll_('officeRent');
  });
}
function saveClient_(u, a) {
  if (!a || typeof a !== 'object') throw new Error('Hiányos adatok.');
  const id = str_(a.id, 64);
  if (!ID_RE.test(id)) throw new Error('Hibás azonosító.');
  const c = { id: id, name: str_(a.name, 160).replace(/\s+/g, ' '), tax: str_(a.tax, 20).replace(/[^\d-]/g, ''), address: str_(a.address, 300),
    contactName: str_(a.contactName, 120), contactPhone: str_(a.contactPhone, 40), contactEmail: str_(a.contactEmail, 160).toLowerCase(), note: str_(a.note, 1000), rep: str_(a.rep, 120), repPhone: str_(a.repPhone, 40), repEmail: str_(a.repEmail, 160).toLowerCase(), contactTitle: str_(a.contactTitle, 120), repTitle: str_(a.repTitle, 120), billEmail: str_(a.billEmail, 500).toLowerCase(), tigMail: a.tigMail && typeof a.tigMail === 'object' ? JSON.stringify({ to: str_(a.tigMail.to, 300), cc: str_(a.tigMail.cc, 300), subject: str_(a.tigMail.subject, 200), text: str_(a.tigMail.text, 5000) }) : str_(typeof a.tigMail === 'string' ? a.tigMail : '', 6000) };
  if (c.name.length < 2) throw new Error('Add meg az ügyfél nevét.');
  if (c.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.contactEmail)) throw new Error('Az e-mail-cím érvénytelen.');
  const oldName = str_(a.oldName, 160).trim();
  return withLock_(() => {
    const sh = sheetFor_('clients');
    let row = findRow_(sh, id), old = null;
    if (!row) {   // ugyanilyen nevű ügyfél már van → azt frissítjük (nem duplikálunk)
      const ex = readAll_('clients').find(x => String(x.name || '').trim().toLowerCase() === c.name.toLowerCase());
      if (ex) { c.id = ex.id; row = findRow_(sh, ex.id); }
    }
    if (row) { old = readRow_('clients', sh, row); c.createdAt = old.createdAt; if (a.tigMail === undefined) c.tigMail = old.tigMail || ''; if (a.billEmail === undefined) c.billEmail = old.billEmail || ''; } else c.createdAt = now_();
    c.updatedAt = now_();
    putRow_('clients', sh, c, row);
    let renamed = 0;
    const from = (oldName || (old && old.name) || '').toLowerCase();
    if (from && from !== c.name.toLowerCase()) {   // átnevezés: a projektek ügyfélmezője is
      const ps = sheetFor_('projects'), col = TABLES.projects.cols.findIndex(x => x[0] === 'client') + 1, n = ps.getLastRow() - 1;
      if (n > 0) { const rg = ps.getRange(2, col, n, 1), vals = rg.getValues();
        vals.forEach(v => { if (String(v[0] || '').trim().toLowerCase() === from) { v[0] = c.name; renamed++; } });
        if (renamed) rg.setValues(vals); }
    }
    dbFlush_();
    logEvent_(u, old ? 'Ügyfél módosítva' : 'Ügyfél felvéve', c.name, renamed ? renamed + ' projekt átnevezve' : '');
    return Object.assign({}, c, { renamed: renamed });
  });
}
function deleteClient_(u, a) {
  const id = str_(a && a.id, 64);
  return withLock_(() => {
    const sh = sheetFor_('clients'), row = findRow_(sh, id);
    if (!row) return { deleted: false, id: id };
    const old = readRow_('clients', sh, row);
    sh.deleteRow(row); dbFlush_();
    logEvent_(u, 'Ügyfél törölve', old.name, '');
    return { deleted: true, id: id };
  });
}

function deleteItem_(u, a) {
  const id = str_(a && a.id, 64);
  return withLock_(() => {
    const sh = sheetFor_('inventory'), row = findRow_(sh, id);
    if (!row) return { deleted: false, id: id };
    const old = readRow_('inventory', sh, row);
    sh.deleteRow(row);
    rewriteAssign_('eqAssign', r => r.itemId !== id, []);
    dbFlush_();
    logEvent_(u, 'Eszköz törölve', old.name, '');
    return { deleted: true, id: id };
  });
}

/* ===================== ESZKÖZLISTA KIKÜLDÉSE ===================== */
/** A levél feladója admin@ (ha be van állítva aliasként), a megjelenő név a küldő kolléga, a válasz hozzá megy. */
function mailOptsFor_(u, html) {
  const opts = { htmlBody: html, name: (u && u.name ? u.name + ' · ' : '') + 'Lumos Motion', replyTo: (u && u.email) || MAIL_REPLY_TO, __actor: (u && u.email) || '' };
  try {   // a küldő a művelet végzője (pl. a termelési vezető), ha a címe „Küldés másként” álnévként be van állítva a telepítő Gmail-fiókjában
    const al = GmailApp.getAliases().map(x => String(x).toLowerCase()), me = String(u && u.email || '').toLowerCase();
    if (me && al.indexOf(me) >= 0) opts.from = me; else { if (me && dwdOn_() && dwdDomainOk_(me)) opts.__dwd = me; if (al.indexOf(String(MAIL_FROM).toLowerCase()) >= 0) opts.from = MAIL_FROM; }   // álnév híján: domainszintű megbízással a kolléga saját postafiókjából
  } catch (e) {}
  return opts;
}
function fmtHuDate_(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return '';
  const d = Utilities.parseDate(iso, SHEET_TZ, 'yyyy-MM-dd');
  const days = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'];
  const months = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
  return d.getFullYear() + '. ' + months[d.getMonth()] + ' ' + d.getDate() + '., ' + days[d.getDay()];
}
function sendEquipmentList_(u, a) {
  const id = str_(a && a.projectId, 64);
  if (!ID_RE.test(id)) throw new Error('Hibás projektazonosító.');
  const wanted = (Array.isArray(a.recipients) ? a.recipients : []).map(x => str_(x, 64)).slice(0, 40);
  const message = str_(a.message, 2000), includePlan = a.includePlan !== false;
  const sh = sheetFor_('projects'), row = findRow_(sh, id);
  if (!row) throw new Error('A projekt nem található.');
  const p = fullProject_(readRow_('projects', sh, row));
  const crewMap = byId_(readAll_('crew')), invMap = byId_(readAll_('inventory'));
  const onProject = {};
  if (p.lead) onProject[p.lead] = ['Projektvezető'];
  p.crew.forEach(c => { (onProject[c.crewId] = onProject[c.crewId] || []).push(c.role); });
  const recipients = wanted.filter(cid => onProject[cid] && crewMap[cid] && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(crewMap[cid].email || '')));
  if (!recipients.length) throw new Error('Nincs olyan kiválasztott stábtag, akinek van e-mail-címe.');
  const resend = !!p.listSentAt;
  const dateTxt = fmtHuDate_(p.date) + (p.endDate && p.endDate !== p.date ? ' – ' + fmtHuDate_(p.endDate) : '');
  const subject = (resend ? 'Frissített eszközlista' : 'Eszközlista') + ' – ' + p.name + (p.date ? ' (' + p.date.replace(/-/g, '.') + '.)' : '');
  const e = escapeHtml_;
  const rentals = parseRentals_(p.rentals);
  // eszközök kategóriánként – a projektvezető a teljes listát kapja, a többiek csak a sajátjukat
  const buildEq = only => {
  const byCat = {};
  p.equipment.forEach(x => { const it = invMap[x.itemId]; if (!it) return; if (only && x.crewId !== only) return; (byCat[it.category] = byCat[it.category] || []).push({ it: it, qty: x.qty, who: x.crewId && crewMap[x.crewId] ? crewMap[x.crewId].name : '' }); });
  let eqHtml = '', eqTxt = '';
  INV_CATS.concat(Object.keys(byCat).filter(c => INV_CATS.indexOf(c) < 0)).forEach(cat => {
    const items = byCat[cat]; if (!items) return;
    eqHtml += '<tr><td colspan="2" style="padding:12px 0 4px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5f7381">' + e(cat) + '</td></tr>';
    eqTxt += '\n' + cat.toUpperCase() + '\n';
    items.forEach(x => {
      eqHtml += '<tr><td style="padding:5px 0;border-top:1px solid #e3e9ee;width:28px;font-size:16px">☐</td><td style="padding:5px 0;border-top:1px solid #e3e9ee"><b>' + x.qty + '×</b> ' + e(x.it.name) + (x.it.serial ? ' <span style="color:#5f7381">(' + e(x.it.serial) + ')</span>' : '') + (x.who ? ' <span style="color:#1f5a3d;font-weight:600">– ' + e(x.who) + '</span>' : '') + '</td></tr>';
      eqTxt += '☐ ' + x.qty + '× ' + x.it.name + (x.it.serial ? ' (' + x.it.serial + ')' : '') + (x.who ? ' – ' + x.who : '') + '\n';
    });
  });
  [['Saját eszközök', rentals.filter(r => r.own && (!only || r.crewId === only))], ['Bérelt eszközök', rentals.filter(r => !r.own && (!only || r.crewId === only))]].forEach(([title, list]) => { if (!list.length) return;
    eqHtml += '<tr><td colspan="2" style="padding:12px 0 4px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5f7381">' + title + '</td></tr>';
    eqTxt += '\n' + title.toUpperCase() + '\n';
    list.forEach(r => { const who = r.crewId && crewMap[r.crewId] ? crewMap[r.crewId].name : '';
      eqHtml += '<tr><td style="padding:5px 0;border-top:1px solid #e3e9ee;width:28px;font-size:16px">☐</td><td style="padding:5px 0;border-top:1px solid #e3e9ee">' + e(r.name) + (r.company ? ' <span style="color:#5f7381">(' + e(r.company) + ')</span>' : '') + (who ? ' – ' + e(who) : '') + '</td></tr>';
      eqTxt += '☐ ' + r.name + (r.company ? ' (' + r.company + ')' : '') + (who ? ' – ' + who : '') + '\n'; });
  });
  if (!eqHtml) { eqHtml = '<tr><td style="color:#5f7381">' + (only ? 'Ehhez a projekthez nálad nincs eszköz.' : 'Ehhez a projekthez még nincs eszköz rendelve.') + '</td></tr>'; eqTxt = '\n(' + (only ? 'nálad nincs eszköz' : 'nincs eszköz rendelve') + ')\n'; }
  return { html: eqHtml, txt: eqTxt }; };
  const crewRows = Object.keys(onProject).filter(cid => crewMap[cid]).map(cid => ({ c: crewMap[cid], roles: onProject[cid] }));
  const crewHtml = crewRows.map(r => '<tr><td style="padding:4px 12px 4px 0"><b>' + e(r.c.name) + '</b></td><td style="padding:4px 12px 4px 0;color:#5f7381">' + e(r.roles.join(', ')) + '</td><td style="padding:4px 0">' + e(r.c.phone || '') + '</td></tr>').join('');
  const crewTxt = crewRows.map(r => '• ' + r.c.name + ' – ' + r.roles.join(', ') + (r.c.phone ? ' – ' + r.c.phone : '')).join('\n');
  // kapcsolattartó: a projektvezető az ügyfél valódi kapcsolattartóját kapja, a többi szakember a projektvezető elérhetőségét
  const leadC = p.lead && crewMap[p.lead] ? crewMap[p.lead] : null;
  const contactFor = cid => cid === p.lead ? [p.contactName, p.contactPhone, p.contactEmail].filter(Boolean).join(', ')
    : (leadC ? [leadC.name + ' (projektvezető)', leadC.phone, leadC.email].filter(Boolean).join(', ') : '');
  const infoOf = cid => [['Időpont', dateTxt], ['Kezdés', p.startTime], ['Helyszín', p.venue], ['Kapcsolattartó', contactFor(cid)]].filter(x => x[1]);
  const infoHtmlOf = cid => infoOf(cid).map(x => '<tr><td style="padding:3px 14px 3px 0;color:#5f7381;white-space:nowrap">' + x[0] + '</td><td style="padding:3px 0"><b>' + e(x[1]) + '</b></td></tr>').join('');
  const planHtml = includePlan && String(p.techPlan || '').trim() ? '<h3 style="font-size:15px;margin:24px 0 6px">Forgatási és technikai terv</h3><div style="white-space:pre-wrap">' + e(p.techPlan) + '</div>' : '';   // csak ha van terv; a jegyzetek nem kerülnek a levélbe
  const planTxt = includePlan && String(p.techPlan || '').trim() ? '\nFORGATÁSI ÉS TECHNIKAI TERV\n' + p.techPlan + '\n' : '';
  const sentTo = [];
  const mine = cid => p.equipment.filter(x => x.crewId === cid && invMap[x.itemId]).map(x => x.qty + '× ' + invMap[x.itemId].name)
    .concat(rentals.filter(r => r.crewId === cid).map(r => r.name + (r.own ? ' (saját)' : ' (bérelt' + (r.company ? ', ' + r.company : '') + ')')));
  const sig = signatureFor_(u), pNotes = parseNotes_(p.crewNotes), previews = [];
  recipients.forEach(cid => {
    const c = crewMap[cid];
    const first = huFirst_(String(c.name));
    const isLead = cid === p.lead, EQ = buildEq(isLead ? null : cid);
    const html = '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#173042;font-size:14px;line-height:1.5;max-width:640px">'
      + '<p>Szia ' + e(first) + '!</p>'
      + (message ? '<p style="white-space:pre-wrap">' + e(message) + '</p>' : '<p>' + (resend ? 'Frissült' : 'Itt az') + ' eszközlista a következő forgatáshoz:</p>')
      + '<h2 style="font-size:20px;margin:18px 0 8px">' + e(p.name) + '</h2>'
      + '<table style="border-collapse:collapse;font-size:14px">' + infoHtmlOf(cid) + '</table>'
      + '<p style="margin:10px 0 0">A te szereped: <b>' + e(onProject[cid].join(', ')) + '</b></p>'
      + (pNotes[cid] ? '<p style="margin:10px 0 0;padding:10px 12px;background:#fff6e0;border-radius:10px"><b>Neked szóló megjegyzés:</b><br>' + e(pNotes[cid]).replace(/\n/g, '<br>') + '</p>' : '')
      + '<h3 style="font-size:15px;margin:24px 0 2px">' + (isLead ? 'Eszközlista (teljes)' : 'A te eszközeid') + '</h3><table style="border-collapse:collapse;width:100%;font-size:14px">' + EQ.html + '</table>'
      + '<h3 style="font-size:15px;margin:24px 0 6px">Stáb</h3><table style="border-collapse:collapse;font-size:14px">' + crewHtml + '</table>'
      + planHtml
      + (sig ? '<div style="margin-top:26px">' + sig.html + '</div></div>' : '<p style="margin-top:26px">Üdvözlettel,<br>' + e(u.name) + '<br>Lumos Motion</p></div>');
    const text = 'Szia ' + first + '!\n\n' + (message || ((resend ? 'Frissült' : 'Itt az') + ' eszközlista a következő forgatáshoz:')) + '\n\n' + p.name + '\n'
      + infoOf(cid).map(x => x[0] + ': ' + x[1]).join('\n') + '\nA te szereped: ' + onProject[cid].join(', ') + (pNotes[cid] ? '\nNeked szóló megjegyzés: ' + pNotes[cid] : '') + '\n\n' + (isLead ? 'ESZKÖZLISTA (TELJES)' : 'A TE ESZKÖZEID') + EQ.txt + '\nSTÁB\n' + crewTxt + '\n' + planTxt
      + '\n' + (sig ? sig.text : 'Üdvözlettel,\n' + u.name + '\nLumos Motion');
    if (a.preview) { previews.push({ id: cid, name: c.name, email: c.email, subject: subject, html: html }); return; }   // előnézet: nem küldjük el
    const opts = mailOptsFor_(u, html);
    if (gmailSend_(c.email, subject, text, opts, 'eqlist')) sentTo.push(c.name);
  });
  if (a.preview) return { previews: previews };
  const when = now_(), info2 = sentTo.length + ' fő: ' + sentTo.join(', ');
  withLock_(() => {
    const r2 = findRow_(sh, id);
    if (!r2) return;
    const cols = TABLES.projects.cols.map(c => c[0]);
    sh.getRange(r2, cols.indexOf('listSentAt') + 1, 1, 2).setNumberFormat('@').setValues([[when, cell_(info2)]]);   // a módosítás idejét szándékosan nem írjuk át
  });
  logEvent_(u, resend ? 'Eszközlista újraküldve' : 'Eszközlista kiküldve', p.name, info2);
  return { sent: sentTo.length, names: sentTo, listSentAt: when, listSentTo: info2, from: mailOptsFor_(u, '').from || '' };
}

/* ===================== NAPLÓ ===================== */
const LOG_TAB = 'Napló';
const LOG_HEADERS = ['Mikor', 'Ki', 'Szerepkör', 'Művelet', 'Tárgy', 'Részletek'];
function logSheet_() {
  if (SHEET_MEMO_.__log) return SHEET_MEMO_.__log;
  const ss = ss_();
  let sh = ss.getSheetByName(LOG_TAB);
  if (!sh) {
    sh = ss.insertSheet(LOG_TAB);
    try { sh.protect().setDescription('A naplót csak a program írja').setWarningOnly(true); } catch (e) {}
  }
  ensureHeader_(sh, LOG_HEADERS, LOG_TAB);
  return (SHEET_MEMO_.__log = sh);
}
function logEvent_(u, action, subject, details) {
  if (dbOn_()) { try { dbLog_([now_(), u ? u.name : '', u ? (u.id === 'client' ? 'Ügyfél' : (ROLE_NAMES_[u.role] || u.role) + (u.realRole ? ' (ügyvezetői előnézet)' : '')) : '', action, cell_(subject || ''), cell_(String(details || '').slice(0, 3000))]); } catch (e) { Logger.log('Napló hiba: ' + e); } return; }
  try {
    const sh = logSheet_();
    const rg = sh.getRange(sh.getLastRow() + 1, 1, 1, LOG_HEADERS.length);
    rg.setNumberFormat('@');
    rg.setValues([[now_(), u ? u.name : '', u ? (u.id === 'client' ? 'Ügyfél' : (ROLE_NAMES_[u.role] || u.role) + (u.realRole ? ' (ügyvezetői előnézet)' : '')) : '', action, cell_(subject || ''), cell_(String(details || '').slice(0, 2000))]]);
  } catch (e) { Logger.log('Napló hiba: ' + e); }
}
/** Projekt részletei és története: létrehozás, utolsó módosítás, a naplóbejegyzések (átnevezés előtti néven is). */
function projectHistory_(u, a) {
  const id = str_(a && a.id, 64), p = readAll_('projects').find(x => x.id === id); if (!p) throw new Error('A projekt nem található.');
  const names = {}; names[String(p.name || '').trim()] = 1;
  const fetch = () => {
    const ns = Object.keys(names).filter(Boolean);
    if (dbOn_()) { const r = neonSql_([{ query: "SELECT at, who, role, action, subject, details FROM lpm_log WHERE btrim(ltrim(subject, '''')) IN (SELECT jsonb_array_elements_text($1::jsonb)) ORDER BY id DESC LIMIT 400", params: [JSON.stringify(ns)] }])[0];
      return (r.rows || []).map(x => ({ at: x[0], who: x[1], role: x[2], action: x[3], subject: String(x[4]).replace(/^'/, ''), details: String(x[5]).replace(/^'/, '') })); }
    const sh = logSheet_(), n = sh.getLastRow(); if (n < 2) return [];
    return sh.getRange(2, 1, n - 1, LOG_HEADERS.length).getDisplayValues().reverse().map(r => ({ at: r[0], who: r[1], role: r[2], action: r[3], subject: String(r[4]).replace(/^'/, ''), details: String(r[5]).replace(/^'/, '') })).filter(x => names[x.subject.trim()]);
  };
  let L = fetch();
  let more = false; L.forEach(x => { const m = /(?:Projekt neve|Név): (.+?) → /.exec(x.details); if (m && !names[m[1].trim()]) { names[m[1].trim()] = 1; more = true; } });   // korábbi név
  if (more) L = fetch();
  if (u.role !== 'admin') {   // a termelési vezető nem látja az árakat és a számlázást
    const hideAct = /számláz|bevétel|keretszerződés|díjbekér/i, hideSeg = /^(Ajánlati ár|Extra szolgáltatások|Projekt értéke|Termelői keret módja|Termelői keret \(% vagy Ft\)|Fizetési állapot)/;   // a % alapú keretből az ár visszaszámolható lenne
    L = L.filter(x => !hideAct.test(x.action)).map(x => {
      const sep = / → /.test(x.details) ? '; ' : ', ', parts = String(x.details || '').split(sep), keep = parts.filter(s => !hideSeg.test(s.trim()));
      return keep.length === parts.length ? x : Object.assign({}, x, { details: keep.join(sep), _cut: !keep.length });
    }).filter(x => !x._cut);
  }
  const created = L.slice().reverse().find(x => /létrehozva|felvéve/i.test(x.action));
  return { id: p.id, name: p.name, createdAt: p.createdAt || (created ? created.at : ''), createdBy: created ? created.who : '', updatedAt: p.updatedAt || '', updatedBy: p.updatedBy || '', status: p.status, log: L.slice(0, 300) };
}
function getLog_() { const rows = getLogRaw_(), nm = {}; try { loadUsers_().forEach(x => { nm[String(x.name || '').trim()] = 1; }); } catch (e) { }
  return rows.map(x => (x.role === ROLE_NAMES_.editor && x.who && !nm[String(x.who).trim()]) ? Object.assign(x, { role: 'Ügyfél' }) : x); }   // a jóváhagyó oldalról döntő ügyfél korábban „termelési vezetőként” került a naplóba
function getLogRaw_() {
  if (dbOn_()) return dbGetLog_().map(x => Object.assign(x, { subject: String(x.subject).replace(/^'/, ''), details: String(x.details).replace(/^'/, '') }));
  const sh = logSheet_(), n = sh.getLastRow();
  if (n < 2) return [];
  const from = Math.max(2, n - 599);
  return sh.getRange(from, 1, n - from + 1, LOG_HEADERS.length).getDisplayValues().reverse()
    .map(r => ({ at: r[0], who: r[1], role: r[2], action: r[3], subject: String(r[4]).replace(/^'/, ''), details: String(r[5]).replace(/^'/, '') }));
}

/* ===================== FELHASZNÁLÓK ÉS BELÉPÉS (a Sales App mintájára) ===================== */
const USERS_PROPERTY = 'LUMOS_PM_USERS_V1';
const SESSION_PREFIX = 'LUMOS_PM_SESS_';
const ROLES = ['admin', 'editor', 'crew', 'sales'];   // + Értékesítő: csak az Értékesítés fület látja, a saját lehetőségeivel   // Ügyvezető, Termelési vezető, Szakember (csak a saját beosztásait látja, nem szerkeszt)
const ROLE_NAMES_ = { admin: 'Ügyvezető', editor: 'Termelési vezető', crew: 'Szakember', sales: 'Értékesítő' };
const SESSION_DAYS_BY_ROLE = { admin: 7, editor: 30, crew: 30, sales: 30 };

function ownerOnly_() {
  let active = '', effective = '';
  try { active = Session.getActiveUser().getEmail() || ''; } catch (e) {}
  try { effective = Session.getEffectiveUser().getEmail() || ''; } catch (e) {}
  if (!active || !effective || active.toLowerCase() !== effective.toLowerCase())
    throw new Error('Ezt a függvényt csak a szkript tulajdonosa futtathatja az Apps Script szerkesztőből.');
}
function sha256hex_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
    .map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}
function sameName_(a, b) { return String(a || '').trim().toLocaleLowerCase('hu-HU') === String(b || '').trim().toLocaleLowerCase('hu-HU'); }
function loadUsers_() {
  try { const a = JSON.parse(PropertiesService.getScriptProperties().getProperty(USERS_PROPERTY) || '[]'); return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
}
function saveUsers_(users) {
  users.forEach(u => { delete u.salt; delete u.hash; });   // a régi PIN-kódok nyoma is törlődik
  const json = JSON.stringify(users);
  if (json.length > 8500) throw new Error('Elérted a felhasználók maximális számát (kb. 30).');
  PropertiesService.getScriptProperties().setProperty(USERS_PROPERTY, json);
}
function publicUser_(u) {
  const o = { id: u.id, name: u.name, role: u.role, crewId: String(u.crewId || ''), email: String(u.email || '') };   // a saját címe (levél-előnézet feladója, csengő)
  if (u.realRole) { o.realRole = u.realRole; o.viewAs = u.viewAs; }
  return o;
}
function adminListUser_(u) { return Object.assign({ id: u.id, name: u.name, role: u.role, crewId: String(u.crewId || ''), email: String(u.email || ''), disabled: !!u.disabled, createdAt: u.createdAt || '' }, u.role === 'sales' ? salesCompOf_(u) : {}); }
/** Értékesítő díjazása: fix havi fizetés (nettó) + jutalék szerződésenként: a határ alatti értéknél commLow %, felette commHigh %. */
function salesComp_(a) {
  const pct = v => { const n = Number(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 100) / 100 : NaN; };
  const lo = pct(a.commLow), hi = pct(a.commHigh), sal = Math.round(Number(String(a.salary == null ? '' : a.salary).replace(/\D/g, '')) || 0), lim = Math.round(Number(String(a.commLimit == null ? '' : a.commLimit).replace(/\D/g, '')) || 1000000);
  if (String(a.commLow == null ? '' : a.commLow).trim() === '' || isNaN(lo)) throw new Error('Értékesítőnél add meg a jutalék %-át (a határ alatt).');
  if (String(a.commHigh == null ? '' : a.commHigh).trim() === '' || isNaN(hi)) throw new Error('Értékesítőnél add meg a jutalék %-át (a határ felett).');
  if (String(a.salary == null ? '' : a.salary).trim() === '') throw new Error('Értékesítőnél add meg a fix havi fizetést (ha nincs, írj 0-t).');
  return { salary: Math.min(sal, FEE_MAX), commLow: lo, commHigh: hi, commLimit: Math.max(1, Math.min(lim, VALUE_MAX)) };
}
function salesCompOf_(u) { return { salary: Number(u.salary) || 0, commLow: Number(u.commLow) || 0, commHigh: u.commHigh == null ? Number(u.commLow) || 0 : Number(u.commHigh) || 0, commLimit: Number(u.commLimit) || 1000000 }; }
/** Az értékesítők díjazása a Kifizetésekhez: ügyvezetőnek mindenkié, értékesítőnek a sajátja (más szerepkör nem kapja meg). */
function salesPeople_(u) {
  const list = loadUsers_().filter(x => x.role === 'sales' && x.crewId && !x.disabled && (u.role === 'admin' || x.id === u.id));
  if (u.role === 'admin') {   // fiók nélküli értékesítő (munkatárs): csak a projektenként kézzel megadott jutalék % számít
    const cm = byId_(readAll_('crew')), seen = {};
    readAll_('deals').forEach(d => { const o = String(d.ownerId || ''); if (d.stage !== 'nyert' || o.indexOf('crew:') !== 0 || seen[o]) return; seen[o] = 1;
      const cid = o.slice(5), c = cm[cid]; if (c && !list.some(x => x.crewId === cid)) list.push({ id: o, name: sval_(c.name), role: 'crew', crewId: cid, salary: 0, commLow: 0, commHigh: 0, commLimit: VALUE_MAX }); });
  }
  if (!list.length) return [];
  const ctx = salesCommCtx_();
  return list.map(x => Object.assign({ userId: x.id, crewId: String(x.crewId), name: x.name, since: String(x.createdAt || '').slice(0, 7) }, salesCompOf_(x), { comm: salesCommOf_(x, ctx) }));
}
/* Értékesítői jutalék (keretszerződés 3. pont): havonta, a ténylegesen kifizetett nettó ügyfélbevétel után, sávosan
   (a havi alap határig terjedő része commLow %, a felette lévő része commHigh %). A jutalékalapba nem számít bele
   a továbbszámlázott költség (a projekt „továbbszámlázott” extrái, arányosan), és a ki nem fizetett számla sem. */
function salesCommCtx_() {
  return { deals: readAll_('deals').filter(d => d.stage === 'nyert' && d.projectId), inv: readAll_('finInvoice'), proj: byId_(readAll_('projects')) };
}
function salesCommOf_(user, ctx) {
  const c = salesCompOf_(user), pids = {};
  ctx.deals.filter(d => d.ownerId === user.id).forEach(d => { pids[d.projectId] = d; });
  const months = {}, n = v => Number(v) || 0;
  const share = (x, pid) => {   // közös számlánál a projekt része a szerződött értékek arányában
    const ids = [String(x.projectId || '')].concat(String(x.projectIds || '').split(',')).filter(String);
    if (ids.length < 2) return 1;
    const w = id => { const p = ctx.proj[id]; return p ? Math.max(0, n(p.quotePrice)) : 0; }, tot = ids.reduce((a, id) => a + w(id), 0);
    return tot > 0 ? w(pid) / tot : 1 / ids.length;
  };
  const passRatio = pid => {   // a továbbszámlázott költség aránya a projekt teljes (nettó) értékében
    const p = ctx.proj[pid]; if (!p) return 0;
    const ex = parseExtras_(p.extras), tov = ex.filter(e => e.kind === 'tov').reduce((a, e) => a + n(e.amount), 0);
    const total = n(p.quotePrice) + ex.reduce((a, e) => a + (e.kind === 'org' || e.kind === 'tov' ? 0 : e.kind === 'le' ? -1 : 1) * n(e.amount), 0);
    const org = ex.filter(e => e.kind === 'org').reduce((a, e) => a + n(e.amount), 0);   // a szervezői jutalék sem része a jutalékalapnak
    return total > 0 ? Math.min(1, (tov + org) / total) : 0;
  };
  const projBase = pid => { const p = ctx.proj[pid]; if (!p) return 0; const ex = parseExtras_(p.extras); const total = n(p.quotePrice) + ex.reduce((a, e) => a + (e.kind === 'org' || e.kind === 'tov' ? 0 : e.kind === 'le' ? -1 : 1) * n(e.amount), 0); return Math.max(0, total * (1 - passRatio(pid))); };
  Object.keys(pids).forEach(pid => {
    const p = ctx.proj[pid]; if (!p || p.status === 'lemondva') return;   // lemondott ügylet után nem jár jutalék
    const L = ctx.inv.filter(x => x.projectId === pid || String(x.projectIds || '').split(',').indexOf(pid) >= 0);
    const hasAdvInv = L.some(x => x.kind === 'eloleg');
    L.forEach(x => {
      if (x.kind === 'dijbekero' && hasAdvInv) return;   // a fizetett díjbekérőből előlegszámla lesz – egyszer számít
      const manual = x.kind === 'eloleg' && !!x.manual, gross = n(x.invGross), net = n(x.invNet);
      const paid = manual ? gross : Math.min(gross, n(x.invPaid));
      if (!(net > 0) || !(paid > 0) || !(gross > 0)) return;
      const when = String(x.paidAt || (manual ? x.date : '') || '').slice(0, 7); if (!/^\d{4}-\d{2}$/.test(when)) return;
      const paidNet = Math.round(net * paid / gross * share(x, pid)), base = Math.round(paidNet * (1 - passRatio(pid)));
      const m = months[when] || (months[when] = { base: 0, amount: 0, items: [], manBase: 0, manAmt: 0 });
      const mp = String(pids[pid].commManual == null ? '' : pids[pid].commManual).trim();   // a projektnél kézzel megadott jutalék % (nem sávos)
      if (/^ft:/.test(mp)) { const pb = projBase(pid); m.manBase += base; m.manAmt += pb > 0 ? Number(mp.slice(3)) * Math.min(1, base / pb) : 0; }   // kézi összeg: a befolyt rész arányában
      else if (mp !== '' && !isNaN(Number(mp))) { m.manBase += base; m.manAmt += base * Number(mp) / 100; }
      m.base += base; m.items.push({ projectId: pid, name: String(p.name || ''), invNo: String(x.no || ''), paidAt: String(x.paidAt || x.date || '').slice(0, 10), paidNet: paidNet, base: base });
    });
  });
  Object.keys(months).forEach(k => { const m = months[k], lim = c.commLimit;
    const ab = m.base - (m.manBase || 0);   // a sávos rész csak a kézi % nélküli projektekből
    m.amount = Math.round(Math.min(ab, lim) * c.commLow / 100 + Math.max(0, ab - lim) * c.commHigh / 100 + (m.manAmt || 0)); delete m.manBase; delete m.manAmt;
    m.items.sort((a, b) => a.paidAt < b.paidAt ? -1 : 1); });
  return months;
}
function newUserRecord_(name, role, crewId, email) {
  return { id: Utilities.getUuid(), name: name, role: role, crewId: crewId || '', email: String(email || ''), disabled: false, createdAt: new Date().toISOString() };
}
function escapeHtml_(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
/* E-mail tárgy: a GmailApp a tárgyban az emojikat hibásan kódolja (����) – ezeket kivesszük */
function subj_(t) { return String(t || '').replace(/[\uD800-\uDFFF]/g, '').replace(/[\u2600-\u27BF\uFE0F\u200D]/g, '').replace(/\s{2,}/g, ' ').trim(); }
function appUrl_() { return FRONTEND_URL; }
/* Rövid, olvasható projektlink: …/#p=ecommerce-expo-promo-shortok-d3f68107 (a név + az azonosító első 8 karaktere) */
function projSlug_(p) { return String((p && p.id) || '').slice(0, 8); }   // rövid projektlink: #p=d3f68107
function projLink_(p) { return FRONTEND_URL.replace(/\/$/, '') + '/#p=' + projSlug_(p); }
/* Személyes e-mail-aláírások (a küldő e-mail-címe szerint): az ügyvezető és a termelési vezetők a Beállítások → Hozzáférések
   alatt szerkesztik (beosztás, telefon, fotó). A képek a projekttervezo.lumosmotion.hu/sig/ alól töltődnek. */
const SIG_PROPERTY = 'LUMOS_PM_SIGS';
const SIG_DEFAULTS_ = {
  'david.zajacz@lumosmotion.com': { name: 'Zajácz Dávid', title: 'Produkciós koordinátor', phone: '+36 20 599 5583', photo: 'https://projekttervezo.lumosmotion.hu/sig/david.jpg' },
  'ervin.egri@lumosmotion.com': { name: 'Egri Ervin', title: 'Ügyvezető igazgató', phone: '+36 70 617 8235', photo: 'https://projekttervezo.lumosmotion.hu/sig/ervin.jpg' },
  'peter.farkas@lumosmotion.com': { name: 'Farkas Péter Ervin', title: 'Üzletfejlesztési menedzser', phone: '+36 20 454 1242', photo: 'https://projekttervezo.lumosmotion.hu/sig/peter.jpg' }
};
const SIG_ALIAS_ = { 'zajacz.david@lumosmotion.com': 'david.zajacz@lumosmotion.com' };   // ugyanaz a postafiók más címmel
const sigKey_ = e => { const m = String(e || '').trim().toLowerCase(); return SIG_ALIAS_[m] || m; };
function sigStore_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(SIG_PROPERTY) || '{}') || {}; } catch (e) { return {}; } }
/** Az aláírás adatai egy felhasználóhoz (mentett → alapértelmezett), vagy null, ha nincs beállítva. */
function sigFields_(user) {
  if (!user || !user.email) return null;
  const k = sigKey_(user.email), st = sigStore_()[k], d = SIG_DEFAULTS_[k];
  if (!st && !d) return null;
  const f = Object.assign({ title: '', phone: '', photo: '' }, d || {}, st || {});
  return { name: String(f.name || user.name || ''), email: k, title: String(f.title || ''), phone: String(f.phone || ''), photo: String(f.photo || '') };
}
function sigBuild_(f) {
  const e = escapeHtml_, tel = String(f.phone || '').replace(/[^\d+]/g, ''), F = 'font-family:Arial,Helvetica,sans-serif;';
  const photo = /^https:\/\//i.test(f.photo) ? '<td style="width:116px;padding:8px 0 8px 8px;vertical-align:middle;background:#f2f2f2;border-left:4px solid #111111;" valign="middle" width="116"><img alt="" height="108" src="' + e(f.photo) + '" style="display:block;width:108px;height:108px;border:0;border-radius:54px;outline:none;text-decoration:none;object-fit:cover;" width="108"/></td>' : '';
  const html = '<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;width:375px;' + F + 'color:#111111;" width="375"><tr><td colspan="2" style="padding:0 0 5pt 0;' + F + 'font-size:10pt;line-height:12pt;color:#111111;">Üdvözlettel,</td></tr><tr>' + photo
    + '<td style="padding:8px 8px 8px ' + (photo ? '0' : '12px') + ';vertical-align:middle;white-space:nowrap;background:#f2f2f2;' + (photo ? '' : 'border-left:4px solid #111111;') + F + 'color:#111111;" valign="middle">'
    + '<div style="font-size:14pt;line-height:16.8pt;font-weight:700;margin:0 0 4pt 0;">' + e(f.name) + '</div>'
    + (f.title ? '<div style="font-size:10pt;line-height:12pt;margin:0 0 4pt 0;">' + e(f.title) + '</div>' : '')
    + '<div style="font-size:10pt;line-height:12pt;font-weight:700;margin:0 0 4pt 0;">Lumos Motion Kft.</div>'
    + (f.phone ? '<div style="font-size:10pt;line-height:12pt;margin:0 0 4pt 0;">Tel.: <a href="tel:' + e(tel) + '" style="color:#1155cc;text-decoration:underline;">' + e(f.phone) + '</a></div>' : '')
    + '<div style="font-size:10pt;line-height:12pt;margin:0;">Email: <a href="mailto:' + e(f.email) + '" style="color:#1155cc;text-decoration:underline;font-size:10pt;">' + e(f.email) + '</a></div></td></tr>'
    + '<tr><td colspan="2" style="padding:6pt 0 0 0;"><a href="https://lumosmotion.com/" style="text-decoration:none;border:0;"><img alt="Lumos Motion" height="23" src="https://projekttervezo.lumosmotion.hu/sig/lumos-motion.png" style="display:block;width:224px;height:23px;border:0;outline:none;text-decoration:none;background:#ffffff;" width="224"/></a></td></tr></table>';
  const text = ['Üdvözlettel,', '', f.name, f.title, 'Lumos Motion Kft.', f.phone ? 'Tel.: ' + f.phone : '', 'Email: ' + f.email, 'https://lumosmotion.com/'].filter((x, i) => i < 2 || x).join('\n');
  return { html: html, text: text };
}
/* Beillesztett (pl. a szignó-dokumentumból másolt) aláírás: tisztított HTML, felhasználónként külön tulajdonságban */
const SIG_HTML_PREFIX = 'LUMOS_PM_SIGHTML_';
function sigCustom_(email) { try { return PropertiesService.getScriptProperties().getProperty(SIG_HTML_PREFIX + sigKey_(email)) || ''; } catch (e) { return ''; } }
function sigSanitize_(h, max) {
  let x = String(h || '');
  x = x.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|iframe|object|embed|form|input|button|textarea|select|meta|link|base)[\s\S]*?(<\/\1>|\/?>)/gi, '');
  x = x.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/(href|src)\s*=\s*("|')\s*(javascript|data|vbscript):[^"']*\2/gi, '');
  return x.trim().slice(0, max || 8500);
}
const signatureFor_ = u => {
  const c = u && u.email ? sigCustom_(u.email) : '';
  if (c) return { html: c, text: plainText_(c.replace(/<\/(div|tr|p|table)>/gi, '\n')).replace(/\n{3,}/g, '\n\n').trim() };
  const f = sigFields_(u); return f ? sigBuild_(f) : null; };
/** Aláírás mentése: az ügyvezető bármelyik vezetőét, a termelési vezető a sajátját. a: {userId, title, phone, photo} */
function saveSignature_(u, a) {
  const users = loadUsers_(), t = users.find(x => x.id === String(a && a.userId || ''));
  if (!t || (t.role !== 'admin' && t.role !== 'editor' && t.role !== 'sales')) throw new Error('Aláírás csak az ügyvezetőnek és a termelési vezetőknek állítható be.');
  if (u.role !== 'admin' && t.id !== u.id) throw new Error('FORBIDDEN: csak a saját aláírásodat módosíthatod.');
  if (a && a.html !== undefined) {   // beillesztett aláírás (üres: vissza az alap, mezőkből épített aláírásra)
    const h = sigSanitize_(a.html), P = PropertiesService.getScriptProperties(), k = SIG_HTML_PREFIX + sigKey_(t.email);
    if (h.length >= 8500) throw new Error('Az aláírás túl hosszú – a képeket linkként (https://…) illeszd be, ne beágyazva.');
    if (h) P.setProperty(k, h); else P.deleteProperty(k);
    logEvent_(u, 'E-mail aláírás', t.name, h ? 'beillesztett aláírás mentve' : 'visszaállítva az alapra');
    return sigList_();
  }
  const photo = str_(a.photo, 400);
  if (photo && !/^https:\/\/\S+$/i.test(photo)) throw new Error('A fotó linkje https:// kezdetű legyen (vagy hagyd üresen).');
  const st = sigStore_(); st[sigKey_(t.email)] = { name: str_(a.name, 80), title: str_(a.title, 80), phone: str_(a.phone, 40), photo: photo };
  PropertiesService.getScriptProperties().setProperty(SIG_PROPERTY, JSON.stringify(st));
  logEvent_(u, 'E-mail aláírás', t.name, 'módosítva');
  return sigList_();
}
/* 📄 Árajánlat a lehetőségből: az értékesítő (a lehetőség gazdája) a saját nevével, címével és aláírásával küldi; a PDF a böngészőben készül. */
function dealQuoteSender_(u, a) {
  const d = readAll_('deals').find(x => x.id === str_(a && a.dealId, 64)); if (!d) throw new Error('A lehetőség nem található.');
  if (u.role !== 'admin' && d.ownerId !== u.id) throw new Error('FORBIDDEN: Csak a saját lehetőségedhez küldhetsz ajánlatot.');
  const us = loadUsers_(), owner = us.find(x => x.id === d.ownerId && x.email && !x.disabled) || us.find(x => x.id === u.id) || u;
  const f = sigFields_(owner) || { name: owner.name || '', email: sigKey_(owner.email || ''), title: owner.role === 'sales' ? 'Értékesítő' : '', phone: '', photo: '' };
  const c = sigCustom_(owner.email || ''), sig = c ? { html: c, text: plainText_(c.replace(/<\/(div|tr|p|table)>/gi, '\n')).replace(/\n{3,}/g, '\n\n').trim() } : sigBuild_(f);
  return { d: d, owner: owner, f: f, sig: sig };
}
/** Az ajánlat előnézetéhez: ki küldi, és milyen aláírással. */
function dealQuoteSig_(u, a) { const r = dealQuoteSender_(u, a); return { name: r.f.name || r.owner.name, email: r.owner.email || '', title: r.f.title || '', phone: r.f.phone || '', sigHtml: r.sig.html, from: (function () { const o = mailOptsFor_(r.owner, ''); return o.__dwd || o.from || Session.getEffectiveUser().getEmail() || ''; })() }; }   // from: a tényleges feladó (álnév, ha be van állítva)
/** a: {dealId, to, cc, subject, body, pdf (base64), fileName, total} */
function dealQuoteSend_(u, a) {
  a = a || {}; const r = dealQuoteSender_(u, a), d = r.d;
  const tos = str_(a.to, 600).split(/\s*,\s*/).filter(Boolean).slice(0, 8); if (!tos.length || !tos.every(x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))) throw new Error('Adj meg érvényes e-mail címet.');
  const b64 = String(a.pdf || ''); if (!b64 || b64.length > 12 * 1024 * 1024) throw new Error('Hiányzik az ajánlat PDF-je.');
  const subj = str_(a.subject, 200).trim() || ('Árajánlat – ' + d.title), body = str_(a.body, 6000);
  const fname = str_(a.fileName, 120).replace(/[\\/:*?"<>|]+/g, '-') || 'Arajanlat.pdf';
  const html = '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55">' + escapeHtml_(body).replace(/\n/g, '<br>') + '</div><br>' + r.sig.html;
  const opts = mailOptsFor_(r.owner, html); opts.attachments = [Utilities.newBlob(Utilities.base64Decode(b64), 'application/pdf', fname)];
  if (a.cc && /@/.test(String(a.cc))) opts.cc = str_(a.cc, 300);
  const live = clientMailLive_(), to = live ? tos.join(', ') : String(u.email || r.owner.email || '');
  const ok = gmailSend_(to, (live ? '' : '[TESZT – valójában neki: ' + tos.join(', ') + '] ') + subj, body + '\n\n' + r.sig.text, opts);
  if (!ok) throw new Error('Az e-mail nem ment ki (az e-mailek szünetelnek?).');
  let deals; withLock_(() => { const sh = sheetFor_('deals'), row = findRow_(sh, d.id); if (!row) return; const x = readRow_('deals', sh, row);
    const line = '[' + Utilities.formatDate(new Date(), SHEET_TZ, 'yyyy-MM-dd HH:mm') + ' · ' + (u.name || '') + '] 📄 Árajánlat elküldve (' + tos.join(', ') + ')' + (Number(a.total) ? ' – ' + String(Math.round(Number(a.total))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' Ft + ÁFA' : '') + (Number(a.opts) > 1 ? ' – ' + Number(a.opts) + ' opcióval' : '');
    x.note = line + (String(x.note || '').trim() ? '\n' + String(x.note).trim() : ''); if (x.stage === 'uj') x.stage = 'ajanlat'; x.updatedAt = now_(); x.updatedBy = u.name; putRow_('deals', sh, x, row); dbFlush_(); });
  logEvent_(u, 'Árajánlat elküldve', d.title, tos.join(', '));
  try { deals = dealsFor_(u); } catch (e) { }
  return { ok: true, test: !live, deals: deals };
}
/** A kitöltött szerződés (docx) PDF-be alakítása a Google-lel (ideiglenes Google-dokumentum → PDF export → törlés). a: {docx: base64} */
function contractPdf_(u, a) {
  const b64 = String((a && a.docx) || ''); if (!b64 || b64.length > 15 * 1024 * 1024) throw new Error('Hiányzik a szerződés fájlja.');
  const tok = ScriptApp.getOAuthToken(), auth = { Authorization: 'Bearer ' + tok }, bd = 'lm' + Utilities.getUuid().replace(/-/g, '');
  const meta = { name: 'Lumos_szerzodes_ideiglenes_' + Date.now(), mimeType: 'application/vnd.google-apps.document' };
  const payload = '--' + bd + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) + '\r\n--' + bd +
    '\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\nContent-Transfer-Encoding: base64\r\n\r\n' + b64 + '\r\n--' + bd + '--';
  const up = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'post', contentType: 'multipart/related; boundary=' + bd, payload: payload, headers: auth, muteHttpExceptions: true });
  const id = (JSON.parse(up.getContentText() || '{}') || {}).id; if (up.getResponseCode() >= 300 || !id) throw new Error('A PDF nem készült el (feltöltés): ' + up.getContentText().slice(0, 200));
  try {
    const ex = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + id + '/export?mimeType=application/pdf', { headers: auth, muteHttpExceptions: true });
    if (ex.getResponseCode() !== 200) throw new Error('A PDF nem készült el (export): ' + ex.getContentText().slice(0, 200));
    return { pdf: Utilities.base64Encode(ex.getContent()) };
  } finally { try { UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + id, { method: 'delete', headers: auth, muteHttpExceptions: true }); } catch (e) { } }
}
