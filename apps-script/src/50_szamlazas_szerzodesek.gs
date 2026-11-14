/* ===================== SZÁMLÁZÁS (számlázz.hu Számla Agent) =====================
   Számla / díjbekérő kiállítása a projektből vagy a bevételi sorból, meglévő számla hozzárendelése,
   és a kifizetések követése: a számlázz.hu IPN-értesítése (doPost ?ipn=…) és lekérdezés (szSync).
   A kifizetés alapján a projekt / bevételi sor fizetési állapota magától frissül. Az Agent-kulcs: SZAMLAZZ_AGENT_KEY. */
const SZ_SETTINGS_PROPERTY = 'LUMOS_PM_SZ';
const SZ_KIND_LABEL_ = { szamla: 'Számla', dijbekero: 'Díjbekérő', eloleg: 'Foglalószámla', vegszamla: 'Végszámla' };
const SZ_VATS = ['27', '18', '5', '0', 'AAM', 'TAM', 'EU', 'EUK', 'MAA', 'F.AFA', 'K.AFA', 'ÁKK', 'TEHK', 'HO', 'KBAET'];
const SZ_PAYMETHODS = ['Átutalás', 'Készpénz', 'Bankkártya'];
function szSettings_() {
  let s = {}; try { s = JSON.parse(PropertiesService.getScriptProperties().getProperty(SZ_SETTINGS_PROPERTY) || '{}') || {}; } catch (e) { s = {}; }
  const due = Math.round(Number(s.dueDays));
  return { ipnToken: str_(s.ipnToken, 64), dueDays: isFinite(due) && due >= 0 && due <= 120 ? due : 8, vat: SZ_VATS.indexOf(String(s.vat)) >= 0 ? String(s.vat) : '27',
    unit: str_(s.unit, 20) || 'db', payMethod: SZ_PAYMETHODS.indexOf(s.payMethod) >= 0 ? s.payMethod : 'Átutalás',
    eInvoice: true,   /* mindig e-számla (2026-11-02: Ervin kérése) */ sendEmail: s.sendEmail !== false, comment: str_(s.comment, 500), lastSync: str_(s.lastSync, 30) };
}
function szSettingsView_() { const s = szSettings_(); s.hasKey = !!szamlazzKey_(); return s; }
function szStore_(s) { delete s.hasKey; PropertiesService.getScriptProperties().setProperty(SZ_SETTINGS_PROPERTY, JSON.stringify(s)); }
function szSaveSettings_(u, a) {
  a = a || {};
  const s = szSettings_();
  if (a.agentKey !== undefined && String(a.agentKey).trim()) {
    const k = String(a.agentKey).trim();
    if (!/^[A-Za-z0-9]{20,120}$/.test(k)) throw new Error('Az Agent-kulcs formátuma nem megfelelő (csak betűk és számok).');
    PropertiesService.getScriptProperties().setProperty(SZAMLAZZ_KEY_PROPERTY, k);
    logEvent_(u, 'Számlázás', '', 'Agent-kulcs beállítva');
  }
  if (a.dueDays !== undefined) { const n = Math.round(Number(a.dueDays)); if (!isFinite(n) || n < 0 || n > 120) throw new Error('A fizetési határidő 0–120 nap lehet.'); s.dueDays = n; }
  if (a.vat !== undefined) { if (SZ_VATS.indexOf(String(a.vat)) < 0) throw new Error('Ismeretlen ÁFA-kulcs.'); s.vat = String(a.vat); }
  if (a.unit !== undefined) s.unit = str_(a.unit, 20) || 'db';
  if (a.payMethod !== undefined) { if (SZ_PAYMETHODS.indexOf(a.payMethod) < 0) throw new Error('Ismeretlen fizetési mód.'); s.payMethod = a.payMethod; }
  if (a.eInvoice !== undefined) s.eInv2 = !!a.eInvoice;
  if (a.sendEmail !== undefined) s.sendEmail = !!a.sendEmail;
  if (a.comment !== undefined) s.comment = str_(a.comment, 500);
  if (!s.ipnToken || a.newIpnToken) s.ipnToken = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  szStore_(s);
  return finData_();
}

/* --- kérés a számlázz.hu felé --- */
function szPost_(field, xml) {
  const payload = {}; payload[field] = Utilities.newBlob(xml, 'text/xml', 'request.xml');
  const res = UrlFetchApp.fetch(SZAMLAZZ_URL, { method: 'post', muteHttpExceptions: true, payload: payload });
  const h = {}; const raw = res.getAllHeaders ? res.getAllHeaders() : res.getHeaders();
  Object.keys(raw || {}).forEach(k => { h[k.toLowerCase()] = Array.isArray(raw[k]) ? raw[k][0] : raw[k]; });
  const dec = v => { try { return decodeURIComponent(String(v || '').replace(/\+/g, ' ')); } catch (e) { return String(v || ''); } };
  if (h.szlahu_error_code) throw new Error('számlázz.hu hiba (' + h.szlahu_error_code + '): ' + dec(h.szlahu_error));
  if (res.getResponseCode() !== 200) throw new Error('A számlázz.hu nem érhető el (HTTP ' + res.getResponseCode() + ').');
  return { headers: h, body: res.getContentText('UTF-8'), dec: dec };
}
const szXmlHead_ = (tag, dir) => '<?xml version="1.0" encoding="UTF-8"?><' + tag + ' xmlns="http://www.szamlazz.hu/' + tag + '" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/' + tag + ' https://www.szamlazz.hu/szamla/docs/xsds/' + dir + '/' + tag + '.xsd">';
const szEl_ = (name, v) => v === undefined || v === null ? '' : '<' + name + '>' + xmlEsc_(v) + '</' + name + '>';
function szNeedKey_() { const k = szamlazzKey_(); if (!k) throw new Error('Nincs beállítva a számlázz.hu Agent-kulcs (Bevétel és kiadás → Beállítások → Számlázás).'); return k; }

/** Egy számla aktuális adatai a számlázz.hu-ból (összeg, határidő, kifizetések; kérésre a PDF base64-ben). */
function szQuery_(no, withPdf, order) {
  const key = szNeedKey_();
  const xml = szXmlHead_('xmlszamlaxml', 'agentxml') + szEl_('szamlaagentkulcs', key) + (no ? szEl_('szamlaszam', no) : '') + (!no && order ? szEl_('rendelesSzam', order) : '') + szEl_('pdf', withPdf ? 'true' : 'false') + '</xmlszamlaxml>';
  const r = szPost_('action-szamla_agent_xml', xml);
  return szParseQuery_(r.body, no, withPdf);
}
function szParseQuery_(body, no, withPdf) {
  const r = { body: body };
  let doc; try { doc = XmlService.parse(r.body).getRootElement(); } catch (e) { throw new Error('A számlázz.hu válasza nem értelmezhető: ' + r.body.slice(0, 200)); }
  if (xmlText_(doc, 'sikeres') === 'false' || xmlText_(doc, 'hibakod')) throw new Error('számlázz.hu: ' + (xmlText_(doc, 'hibauzenet') || xmlText_(doc, 'hibakod')));
  const alap = xmlFindAll_(doc, 'alap')[0] || doc, vevo = xmlFindAll_(doc, 'vevo')[0], tot = xmlFindAll_(doc, 'totalossz')[0];
  const nr = v => { const n = Number(String(v || '').replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? Math.round(n) : 0; };
  let paid = 0, paidAt = '';
  xmlFindAll_(doc, 'kifizetes').forEach(k => { paid += nr(xmlText_(k, 'osszeg')); const d = xmlText_(k, 'datum'); if (d > paidAt) paidAt = d; });
  const out = { no: xmlText_(alap, 'szamlaszam') || no, tipus: xmlText_(alap, 'tipus'), date: xmlText_(alap, 'kelt').slice(0, 10), due: xmlText_(alap, 'fizh').slice(0, 10),
    payMethod: xmlText_(alap, 'fizmod'), buyer: vevo ? xmlText_(vevo, 'nev') : '', invNet: tot ? nr(xmlText_(tot, 'netto')) : 0, invGross: tot ? nr(xmlText_(tot, 'brutto')) : 0,
    invPaid: paid, paidAt: paidAt, fromDijbekero: xmlText_(alap, 'hivdijbekszam') };
  if (vevo) { out.buyerTax = xmlText_(vevo, 'adoszam'); out.buyerAddr = [xmlText_(vevo, 'irsz'), xmlText_(vevo, 'telepules')].filter(Boolean).join(' ') + (xmlText_(vevo, 'cim') ? ', ' + xmlText_(vevo, 'cim') : ''); out.buyerEmail = xmlText_(vevo, 'email'); }
  out.itemNames = xmlFindAll_(doc, 'tetel').map(t => xmlText_(t, 'nev') || xmlText_(t, 'megnevezes')).filter(Boolean);
  out.advReal = /^(true|1|igen)$/i.test(xmlText_(alap, 'elolegszamla'));   // valódi (végszámlán levonható) előlegszámla – a „SZÁMLA A … DÍJBEKÉRŐ ALAPJÁN” sima számla
  // típus felismerése: a számlázz.hu jelzői, a sorszám, végül a tételek szövege (foglaló / előleg / végszámla)
  const flag = t => /^(true|1|igen)$/i.test(xmlText_(alap, t)), names = xmlFindAll_(doc, 'tetel').map(t => xmlText_(t, 'megnevezes')).join(' ') + ' ' + xmlText_(alap, 'megjegyzes');
  out.kind = flag('dijbekero') || /^D-/i.test(out.no) || /^D/i.test(out.tipus) ? 'dijbekero' : flag('elolegszamla') || /^E/i.test(out.tipus) ? 'eloleg' : flag('vegszamla') ? 'vegszamla'
    : /végszámla/i.test(names) ? 'vegszamla' : /foglal[oó]|előleg/i.test(names) ? 'eloleg' : 'szamla';
  if (withPdf) { const p = doc.getChildren().find(c => c.getName() === 'pdf'); out.pdf = p ? String(p.getText() || '').replace(/\s/g, '') : ''; }
  return out;
}

/* --- fizetési állapot a számlák alapján --- */
const SZ_KINDS = ['szamla', 'dijbekero', 'eloleg', 'vegszamla'];
function szPayStatusFor_(list) {
  if (!list.length) return null;
  const fin = list.filter(x => x.kind === 'szamla' || x.kind === 'vegszamla' || !x.kind), adv = list.filter(x => x.kind === 'dijbekero' || x.kind === 'eloleg');
  const mPaid = x => x.kind === 'eloleg' && !!x.manual;   // kézi foglalószámla: a befizetés után készül
  const paidAll = l => l.length && l.every(x => mPaid(x) || (Number(x.invPaid) || 0) >= (Number(x.invGross) || 0) - 1 && (Number(x.invGross) || 0) > 0);
  const anyPaid = l => l.some(x => mPaid(x) || (Number(x.invPaid) || 0) > 0);
  if (fin.length) return paidAll(fin) ? 'teljes' : anyPaid(fin) || anyPaid(adv) ? 'eloleg' : 'var';
  return anyPaid(adv) ? 'eloleg' : 'var';
}
/** A megadott projektek / bevételi sorok fizetési állapotát a hozzájuk tartozó számlákból írja vissza (zárolás alatt hívandó). */
function szApplyPay_(targets) {
  const inv = readAll_('finInvoice');
  const seen = {};
  targets.forEach(t => {
    const key = (t.projectId ? 'p:' + t.projectId : 'i:' + t.incomeId); if (!t.projectId && !t.incomeId || seen[key]) return; seen[key] = 1;
    const li = inv.filter(x => t.projectId ? invHasProj_(x, t.projectId) : x.incomeId === t.incomeId);
    let st = szPayStatusFor_(li);
    if (st === 'eloleg' && t.projectId) {   // a foglaló/előleg a teljes összeget fedezi (pl. 100%-os foglaló) → kifizetve
      try { const pr = readAll_('projects').find(x => x.id === t.projectId), val = Number(pr && pr.quotePrice) || 0;
        const paid = li.reduce((s2, x) => s2 + (x.kind === 'eloleg' && x.manual ? (Number(x.invGross) || 0) : (Number(x.invPaid) || 0)), 0);
        if (val > 0 && paid >= Math.round(val * 1.27) - 5) st = 'teljes'; } catch (e) {}
    }
    if (!st) return;
    if (t.projectId) { let was = ''; try { const pp = readAll_('projects').find(x => x.id === t.projectId); was = String((pp && pp.payStatus) || ''); } catch (e) {}
      try { writeProjectPay_(t.projectId, st); } catch (e) {}
      if (st !== was && (st === 'teljes' || (st === 'eloleg' && was !== 'teljes'))) salesNotify_(t.projectId, 'pay', st); }
    else { const sh = sheetFor_('finIncome'), row = findRow_(sh, t.incomeId); if (row) { const r = readRow_('finIncome', sh, row); if (r.payStatus !== st) { r.payStatus = st; putRow_('finIncome', sh, r, row); } } }
  });
  dataBump_();
}
/** Közös számla: a fő projekt mellett a további projektek (vesszővel elválasztva a projectIds oszlopban). */
function invHasProj_(x, pid) { return x.projectId === pid || String(x.projectIds || '').split(',').indexOf(pid) >= 0; }
function invTargets_(x) { const o = [{ projectId: x.projectId, incomeId: x.incomeId }]; String(x.projectIds || '').split(',').filter(String).forEach(id => o.push({ projectId: id, incomeId: '' })); return o; }
function szExtraProjects_(a, main) {
  const ids = (Array.isArray(a && a.projectIds) ? a.projectIds : String((a && a.projectIds) || '').split(',')).map(x => str_(x, 64)).filter(x => x && x !== main);
  const sh = sheetFor_('projects'), out = [];
  ids.forEach(id => { if (out.indexOf(id) < 0) { if (!findRow_(sh, id)) throw new Error('A közös számla egyik projektje nem található.'); out.push(id); } });
  return out.slice(0, 40).join(',');
}
/** Rendelésszám: a projekt azonosítója; ha a projekthez már van számla, sorszámmal (a számlázz.hu nem enged ismétlődő rendelésszámot). A díjbekérő a projekt azonosítóját kapja (a foglalószámla ez alapján található meg). */
function szOrderNo_(tg, kind) {
  const base = tg.projectId || tg.incomeId;
  if (kind === 'dijbekero') return base;
  const n = readAll_('finInvoice').filter(x => (tg.projectId ? x.projectId === tg.projectId : x.incomeId === tg.incomeId) && x.kind !== 'dijbekero').length;
  return n ? base + '-' + (n + 1) : base;
}
function szTarget_(a) {
  const projectId = str_(a && a.projectId, 64), incomeId = str_(a && a.incomeId, 64);
  if (!projectId && !incomeId) throw new Error('Hiányzik, melyik projekthez vagy bevételhez tartozik a számla.');
  if (projectId && !findRow_(sheetFor_('projects'), projectId)) throw new Error('A projekt nem található.');
  if (!projectId && !findRow_(sheetFor_('finIncome'), incomeId)) throw new Error('A bevételi sor nem található.');
  return { projectId: projectId, incomeId: projectId ? '' : incomeId };
}

/** Számla vagy díjbekérő kiállítása. a: {projectId|incomeId, kind, buyer:{name,tax,zip,city,address,email}, items:[{name,qty,unit,price,vat}], fulfill, due, payMethod, comment, eInvoice, sendEmail} */
function szInvoice_(u, a) {
  a = a || {};
  const key = szNeedKey_(), tg = szTarget_(a), set = szSettings_();
  const b = a.buyer || {}, kind = SZ_KINDS.indexOf(a.kind) >= 0 ? a.kind : 'szamla';
  const dijbekeroNo = kind === 'eloleg' ? str_(a.dijbekeroNo, 60) : '', elolegNo = kind === 'vegszamla' ? str_(a.elolegNo, 60) : '';
  const buyer = { name: str_(b.name, 200), tax: str_(b.tax, 20), zip: str_(b.zip, 10), city: str_(b.city, 80), address: str_(b.address, 200), email: str_(b.email, 300) };
  if (buyer.name.length < 2) throw new Error('Add meg a vevő nevét.');
  if (!buyer.zip || !buyer.city || !buyer.address) throw new Error('Add meg a vevő teljes címét (irányítószám, település, cím).');
  if (buyer.email && !buyer.email.split(/[,;]\s*/).every(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))) throw new Error('Hibás e-mail-cím a vevőnél.');
  const items = (Array.isArray(a.items) ? a.items : []).slice(0, 30).map(it => {
    const qty = Number(String(it.qty).replace(',', '.')), price = Math.round(Number(String(it.price).replace(/\s/g, '').replace(',', '.'))), vat = String(it.vat || set.vat);
    if (str_(it.name, 300).length < 2) throw new Error('Minden tételnek adj megnevezést.');
    if (!isFinite(qty) || qty <= 0) throw new Error('Hibás mennyiség: ' + it.name);
    if (!isFinite(price)) throw new Error('Hibás egységár: ' + it.name);
    if (SZ_VATS.indexOf(vat) < 0) throw new Error('Ismeretlen ÁFA-kulcs: ' + vat);
    const net = Math.round(price * qty), rate = /^\d+$/.test(vat) ? Number(vat) : 0, vatAmt = Math.round(net * rate / 100);
    return { name: str_(it.name, 300), qty: qty, unit: str_(it.unit, 20) || set.unit, price: price, vat: vat, net: net, vatAmt: vatAmt, gross: net + vatAmt, note: str_(it.note, 300) };
  });
  if (!items.length) throw new Error('Adj meg legalább egy tételt.');
  const today = today_(), fulfill = iso_(a.fulfill) || today, due = iso_(a.due) || today;
  const payMethod = SZ_PAYMETHODS.indexOf(a.payMethod) >= 0 ? a.payMethod : set.payMethod;
  const eInvoice = true,   // mindig e-számla
    sendEmail = mailOn_('invoice') && !!buyer.email && (a.sendEmail === undefined ? set.sendEmail : !!a.sendEmail);   // kikapcsolt e-mailnél a számlázz.hu sem küldi ki
  const taxDigits = buyer.tax.replace(/\D/g, '');
  const xml = szXmlHead_('xmlszamla', 'agent')
    + '<beallitasok>' + szEl_('szamlaagentkulcs', key) + szEl_('eszamla', eInvoice ? 'true' : 'false') + szEl_('szamlaLetoltes', sendEmail ? 'true' : 'false') + szEl_('valaszVerzio', '2') + '</beallitasok>'
    + '<fejlec>' + szEl_('keltDatum', today) + szEl_('teljesitesDatum', fulfill) + szEl_('fizetesiHataridoDatum', due) + szEl_('fizmod', payMethod) + szEl_('penznem', 'Ft')
    + szEl_('szamlaNyelve', 'hu') + szEl_('megjegyzes', str_(a.comment, 1000)) + szEl_('arfolyamBank', '') + szEl_('arfolyam', '0') + szEl_('rendelesSzam', szOrderNo_(tg, kind))
    + (dijbekeroNo ? szEl_('dijbekeroSzamlaszam', dijbekeroNo) : '') + szEl_('elolegszamla', kind === 'eloleg' ? 'true' : 'false') + szEl_('vegszamla', kind === 'vegszamla' ? 'true' : 'false')
    + (elolegNo ? szEl_('elolegSzamlaszam', elolegNo) : '') + szEl_('dijbekero', kind === 'dijbekero' ? 'true' : 'false') + (a.paid ? szEl_('fizetve', 'true') : '') + '</fejlec>'
    + '<elado>' + szEl_('emailReplyto', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(u && u.email || '')) ? u.email : 'ervin.egri@lumosmotion.com') + '</elado>'   // a számlázz.hu kötelezően kéri az <elado> elemet; a vevő válasza hozzánk jön
    + '<vevo>' + szEl_('nev', buyer.name) + szEl_('irsz', buyer.zip) + szEl_('telepules', buyer.city) + szEl_('cim', buyer.address)
    + (buyer.email ? szEl_('email', buyer.email) : '') + szEl_('sendEmail', 'false')   // a számlázz.hu nem küldi: a Lumos címéről megy (PDF melléklettel)
   
    + szEl_('adoalany', taxDigits.length >= 11 ? '1' : '-1') + (taxDigits.length >= 11 ? szEl_('adoszam', taxDigits.slice(0, 8) + '-' + taxDigits[8] + '-' + taxDigits.slice(9, 11)) : '') + '</vevo>'
    + '<tetelek>' + items.map(it => '<tetel>' + szEl_('megnevezes', it.name) + szEl_('mennyiseg', String(it.qty)) + szEl_('mennyisegiEgyseg', it.unit) + szEl_('nettoEgysegar', String(it.price))
      + szEl_('afakulcs', it.vat) + szEl_('nettoErtek', String(it.net)) + szEl_('afaErtek', String(it.vatAmt)) + szEl_('bruttoErtek', String(it.gross)) + (it.note ? szEl_('megjegyzes', it.note) : '') + '</tetel>').join('') + '</tetelek>'
    + '</xmlszamla>';
  const r = szPost_('action-xmlagentxmlfile', xml);
  let pdfB64 = '';
  let no = r.dec(r.headers.szlahu_szamlaszam), gross = Number(r.headers.szlahu_bruttovegosszeg) || 0, net = Number(r.headers.szlahu_nettovegosszeg) || 0, open = null, url = r.dec(r.headers.szlahu_vevoifiokurl);
  try {
    const doc = XmlService.parse(r.body).getRootElement();
    if (xmlText_(doc, 'sikeres') === 'false') throw new Error('számlázz.hu hiba (' + xmlText_(doc, 'hibakod') + '): ' + xmlText_(doc, 'hibauzenet'));
    no = xmlText_(doc, 'szamlaszam') || no; gross = Number(xmlText_(doc, 'szamlabrutto')) || gross; net = Number(xmlText_(doc, 'szamlanetto')) || net;
    pdfB64 = String(xmlText_(doc, 'pdf') || '').replace(/\s+/g, '');
    const k = xmlText_(doc, 'kintlevoseg'); if (k !== '') open = Number(k); url = r.dec(xmlText_(doc, 'vevoifiokurl')) || url;
  } catch (e) { if (/számlázz\.hu hiba/.test(String(e.message))) throw e; }
  if (!no) throw new Error('A számlázz.hu nem adott vissza számlaszámot: ' + r.body.slice(0, 200));
  const row = { id: Utilities.getUuid(), no: no, kind: kind, advType: kind === 'eloleg' ? 'elolegszamla' : '', projectId: tg.projectId, incomeId: tg.incomeId, buyer: buyer.name, date: today, due: due,
    invNet: Math.round(net) || items.reduce((s, x) => s + x.net, 0), invGross: Math.round(gross) || items.reduce((s, x) => s + x.gross, 0), invPaid: 0, paidAt: '', payMethod: payMethod,
    createdAt: now_(), createdBy: u.name, checkedAt: now_(), note: url ? 'Vevői fiók: ' + url : '',
    items: JSON.stringify(items.map(x => ({ name: x.name, qty: x.qty, unit: x.unit, price: x.price, vat: x.vat }))), ref: dijbekeroNo || elolegNo,
    projectIds: tg.projectId ? szExtraProjects_(a, tg.projectId) : '', tigId: str_(a.tigId, 64) };
  if (open !== null && isFinite(open)) row.invPaid = Math.max(0, row.invGross - Math.round(open));
  if (a.paid && !row.invPaid) { row.invPaid = row.invGross; row.paidAt = today; }
  withLock_(() => { putRow_('finInvoice', sheetFor_('finInvoice'), row, 0); szApplyPay_(invTargets_(row)); if (row.tigId) tigMark_(row.tigId, { status: 'szamlazva', invoiceNo: no }); dbFlush_(); });
  logEvent_(u, 'Számlázás', buyer.name, SZ_KIND_LABEL_[kind] + ' kiállítva: ' + no);
  let mail = null;
  if (sendEmail) { try { mail = szInvoiceMail_(u, { no: no, kind: kind, buyer: buyer, due: due, gross: row.invGross, payMethod: payMethod, projectId: tg.projectId, pdfB64: pdfB64 }); logEvent_(u, 'Számlázás', buyer.name, SZ_KIND_LABEL_[kind] + ' e-mailben elküldve (Lumos címéről): ' + no + ' → ' + buyer.email); }
    catch (e) { mail = { ok: false, error: String(e && e.message || e) }; Logger.log('Számla-levél hiba: ' + e); } }
  return Object.assign(finData_(), { invoice: row, mail: mail });
}

/** Meglévő (a számlázz.hu-ban kiállított) számla hozzárendelése egy projekthez / bevételi sorhoz. */
function szLink_(u, a) {
  const tg = szTarget_(a), no = str_(a && a.no, 60);
  if (!no) throw new Error('Add meg a számlaszámot.');
  const ex = readAll_('finInvoice').find(x => x.no === no);
  if (ex) {   // már hozzá van rendelve: ha projekthez, közös számlává bővítjük ezzel a projekttel (és a bejelöltekkel)
    if (!tg.projectId || !ex.projectId) throw new Error('Ez a számla már hozzá van rendelve egy bevételi sorhoz.');
    let added = [];
    withLock_(() => { const sh = sheetFor_('finInvoice'), row = findRow_(sh, ex.id), r = readRow_('finInvoice', sh, row);
      const ids = String(r.projectIds || '').split(',').filter(String);
      [tg.projectId].concat(szExtraProjects_(a, r.projectId).split(',').filter(String)).forEach(id => { if (id && id !== r.projectId && ids.indexOf(id) < 0) { ids.push(id); added.push(id); } });
      r.projectIds = ids.join(',');
      // ugyanehhez a projekthez újra hozzárendelve, másik helyről (Díjbekérő / Végszámla kártya): a helyét is igazítjuk
      if (a.slot === 'dijbekero' || a.slot === 'eloleg') { if (r.kind === 'szamla' || r.kind === 'vegszamla') r.kind = 'eloleg'; }
      else if (a.slot === 'vegszamla' || a.slot === 'szamla') { if (r.kind === 'eloleg') r.kind = 'vegszamla'; }
      putRow_('finInvoice', sh, r, row); szApplyPay_(invTargets_(r)); dbFlush_(); Object.assign(ex, r); });
    logEvent_(u, 'Számlázás', ex.buyer, 'Közös számla bővítve: ' + no + (added.length ? ' (+' + added.length + ' projekt)' : ''));
    return Object.assign(finData_(), { invoice: ex, extended: added.length });
  }
  const q = szQuery_(no, false);
  let kind = SZ_KINDS.indexOf(a.kind) >= 0 ? a.kind : q.kind || 'szamla';
  const advSlot = a.slot === 'dijbekero' || a.slot === 'eloleg';
  if (kind === 'szamla' && advSlot) kind = 'eloleg';   // a Díjbekérő helyére tett rendes számla = előre kiállított (foglaló)számla
  if (kind === 'szamla' && !advSlot && tg.projectId && readAll_('finInvoice').some(x => invHasProj_(x, tg.projectId) && (x.kind === 'eloleg' || x.kind === 'dijbekero'))) kind = 'vegszamla';   // foglaló után a sima számla a végszámla
  const row = { id: Utilities.getUuid(), no: q.no, kind: kind, advType: kind === 'eloleg' ? (q.advReal ? 'elolegszamla' : 'szamla') : '', ref: kind === 'eloleg' && q.fromDijbekero ? q.fromDijbekero : '', projectId: tg.projectId, incomeId: tg.incomeId, buyer: q.buyer, date: q.date, due: q.due,
    invNet: q.invNet, invGross: q.invGross, invPaid: q.invPaid, paidAt: q.paidAt, payMethod: q.payMethod, createdAt: now_(), createdBy: u.name, checkedAt: now_(), note: '',
    projectIds: tg.projectId ? szExtraProjects_(a, tg.projectId) : '', tigId: str_(a && a.tigId, 64) };
  withLock_(() => { putRow_('finInvoice', sheetFor_('finInvoice'), row, 0); szApplyPay_(invTargets_(row)); if (row.tigId) tigMark_(row.tigId, { status: 'szamlazva', invoiceNo: row.no }); dbFlush_(); });
  logEvent_(u, 'Számlázás', q.buyer, 'Számla hozzárendelve: ' + q.no);
  return Object.assign(finData_(), { invoice: row });
}
/** Kézi bizonylat (pl. az Egri Ervin E.V. által, nem az összekötött számlázz.hu-fiókból kiállított): rögzítés vagy (id-vel) a kifizetés módosítása.
    a: {projectId|incomeId, projectIds, no, kind, issuer, date, due, invNet, invGross, paid, paidAt, b64, name, mime} */
function szManual_(u, a) {
  a = a || {};
  if (a.id) {
    withLock_(() => { const sh = sheetFor_('finInvoice'), row = findRow_(sh, str_(a.id, 64)); if (!row) throw new Error('A bizonylat nem található.'); const r = readRow_('finInvoice', sh, row);
      if (!r.manual && !a.paid) r.checkedAt = '';   // számlázz.hu-s számla: visszavonásnál a következő frissítés újra lekérdezi
      r.invPaid = a.paid ? r.invGross : 0; r.paidAt = a.paid ? (iso_(a.paidAt) || today_()) : ''; r.checkedAt = now_(); putRow_('finInvoice', sh, r, row); szApplyPay_(invTargets_(r)); dbFlush_();
      logEvent_(u, 'Számlázás', r.buyer, 'Kézi bizonylat ' + r.no + (a.paid ? ' kifizetve' : ' – kifizetés visszavonva')); });
    return finData_();
  }
  const tg = szTarget_(a), no = str_(a.no, 60);
  if (!no) throw new Error('Add meg a bizonylatszámot.');
  if (readAll_('finInvoice').some(x => x.no === no)) throw new Error('Ez a bizonylatszám már szerepel.');
  const money = v => Math.round(Number(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.'))) || 0;
  const net = money(a.invNet), gross = money(a.invGross) || net;
  if (!net) throw new Error('Add meg a nettó összeget.');
  let fileUrl = '';
  if (a.b64) {
    const b64 = String(a.b64); if (b64.length > 14 * 1024 * 1024) throw new Error('A fájl legfeljebb 10 MB lehet.');
    const mime = /^[\w.+-]+\/[\w.+-]+$/.test(String(a.mime || '')) ? String(a.mime) : 'application/pdf';
    const p0 = tg.projectId ? readRow_('projects', sheetFor_('projects'), findRow_(sheetFor_('projects'), tg.projectId)) : null;
    const cf = p0 && p0.client ? clientFolder_(p0.client) : null, year = String(iso_(a.date) || today_()).slice(0, 4), ext = (/\.[a-z0-9]{2,5}$/i.exec(String(a.name || '')) || ['.pdf'])[0];
    const folder = cf ? folderPath_(cf, 'Számlák/' + year, {}) : DriveApp.getFolderById(createProjectFolder_(u, { id: tg.projectId }).folderId);
    const f = folder.createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime, uniqueName_(folder, no.replace(/[\\/:*?"<>|]+/g, '-') + ext)));
    fileUrl = f.getUrl();
  }
  const kind0 = SZ_KINDS.indexOf(a.kind) >= 0 ? a.kind : 'szamla', paid = kind0 === 'eloleg' || !!a.paid, today = today_();
  const row = { id: Utilities.getUuid(), no: no, kind: SZ_KINDS.indexOf(a.kind) >= 0 ? a.kind : 'szamla', projectId: tg.projectId, incomeId: tg.incomeId, buyer: str_(a.buyer, 200), date: iso_(a.date) || today, due: iso_(a.due) || '',
    invNet: net, invGross: gross, invPaid: paid ? gross : 0, paidAt: paid ? (iso_(a.paidAt) || iso_(a.date) || today) : '', payMethod: str_(a.payMethod, 40), createdAt: now_(), createdBy: u.name, checkedAt: now_(), note: str_(a.note, 500), items: '', ref: '',
    projectIds: tg.projectId ? szExtraProjects_(a, tg.projectId) : '', tigId: '', manual: '1', issuer: a.issuer === 'kft' ? 'kft' : 'ev', fileUrl: fileUrl };
  withLock_(() => { putRow_('finInvoice', sheetFor_('finInvoice'), row, 0); szApplyPay_(invTargets_(row)); dbFlush_(); });
  logEvent_(u, 'Számlázás', row.buyer, 'Kézi bizonylat rögzítve: ' + no + (row.issuer === 'ev' ? ' (Egri Ervin E.V.)' : ''));
  return Object.assign(finData_(), { invoice: row });
}
/** Több meglévő számla hozzárendelése egyszerre (import): a: {items:[{projectId|incomeId, projectIds, no, kind}]} – kb. 20 mp-ig dolgozik, a többit a felület újra elküldi. */
function szLinkBatch_(u, a) {
  const items = (Array.isArray(a && a.items) ? a.items : []).slice(0, 60), started = Date.now(), have = {}, rows = [], done = [], errors = [];
  readAll_('finInvoice').forEach(x => { have[x.no] = 1; });
  items.forEach(it => {
    const no = str_(it && it.no, 60); if (!no) return;
    if (Date.now() - started > 20000) return;
    if (have[no]) { done.push(no); return; }
    try { const tg = szTarget_(it), q = szQuery_(no, false);
      rows.push({ id: Utilities.getUuid(), no: q.no || no, kind: SZ_KINDS.indexOf(it.kind) >= 0 ? it.kind : q.kind || 'szamla', projectId: tg.projectId, incomeId: tg.incomeId, buyer: q.buyer, date: q.date, due: q.due,
        invNet: q.invNet, invGross: q.invGross, invPaid: q.invPaid, paidAt: q.paidAt, payMethod: q.payMethod, createdAt: now_(), createdBy: u.name + ' (import)', checkedAt: now_(), note: 'Importálva', items: '', ref: '',
        projectIds: tg.projectId ? szExtraProjects_(it, tg.projectId) : '', tigId: '' });
      have[no] = 1; done.push(no);
    } catch (e) { errors.push(no + ': ' + e.message); done.push(no); }
  });
  if (rows.length) withLock_(() => { const sh = sheetFor_('finInvoice'); rows.forEach(r => putRow_('finInvoice', sh, r, 0)); szApplyPay_([].concat.apply([], rows.map(invTargets_))); dbFlush_(); });
  if (rows.length) logEvent_(u, 'Számlázás', '', 'Számlák importálva: ' + rows.map(r => r.no).join(', '));
  return Object.assign(finData_(), { batch: { done: done, linked: rows.map(r => r.no), errors: errors } });
}
/** Számla előnézete a hozzárendelés előtt: vevő, kelt, összeg (a számlázz.hu-tól). Rövidített számot is megpróbál (pl. LUMOS-26-75 → LUMOS-2026-75). */
/** Számla keresése vevő (cégnév) szerint. A számlázz.hu Agent nem listáz, ezért a számlaszámokat sorban lekérdezzük
    (idei és tavalyi év), és a vevőket egy tárolt jegyzékbe gyűjtjük – csak az első keresés lassú, utána csak az új számlák jönnek.
    a: {q, prefix} → {items:[{no,buyer,date,invNet,invGross,paid,linked}], partial, indexed} */
function szSearch_(u, a) {
  szNeedKey_();
  const q = String(a && a.q || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const prefix = (str_(a && a.prefix, 20) || 'LUMOS').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let idx = {}; try { idx = JSON.parse(bigGet_('SZ_INDEX') || '{}'); } catch (e) { idx = {}; }
  if (idx.p !== prefix) idx = { p: prefix, it: {}, max: {} };
  const started = Date.now(), y0 = Number(today_().slice(0, 4));
  let partial = false, changed = false;
  if (a && a.cached) return { index: idx.it, partial: !idx.full, at: idx.at || 0 };   // csak a tárolt jegyzék (azonnal)
  const key = szNeedKey_(), B = 20;
  const req = no => { const payload = {}; payload['action-szamla_agent_xml'] = Utilities.newBlob(szXmlHead_('xmlszamlaxml', 'agentxml') + szEl_('szamlaagentkulcs', key) + szEl_('szamlaszam', no) + szEl_('pdf', 'false') + '</xmlszamlaxml>', 'text/xml', 'request.xml');
    return { url: SZAMLAZZ_URL, method: 'post', muteHttpExceptions: true, payload: payload }; };
  [y0, y0 - 1].forEach(y => {   // párhuzamos lekérdezés (20 számla egyszerre)
    let n = (idx.max[y] || 0) + 1, miss = 0;
    while (miss < 3) {
      if (Date.now() - started > 20000) { partial = true; break; }
      const nos = []; for (let i = 0; i < B; i++) nos.push(prefix + '-' + y + '-' + (n + i));
      let res; try { res = UrlFetchApp.fetchAll(nos.map(req)); } catch (e) { partial = true; break; }
      for (let i = 0; i < nos.length; i++) {
        const h = res[i].getAllHeaders ? res[i].getAllHeaders() : res[i].getHeaders(), err = Object.keys(h || {}).some(k => k.toLowerCase() === 'szlahu_error_code');
        let r = null; if (!err && res[i].getResponseCode() === 200) { try { r = szParseQuery_(res[i].getContentText('UTF-8'), nos[i], false); } catch (e) { r = null; } }
        if (r) { idx.it[r.no || nos[i]] = [r.buyer, r.date, r.invNet, r.invGross, r.invPaid]; idx.max[y] = n + i; miss = 0; changed = true; }
        else if (++miss >= 3) break;
      }
      n += B;
    }
  });
  idx.full = !partial; idx.at = Date.now();
  try { bigPut_('SZ_INDEX', JSON.stringify(idx)); } catch (e) { }
  if (a && a.all) return { index: idx.it, partial: partial, at: idx.at };   // a teljes jegyzék: a kereső a böngészőben szűr (azonnali)
  const norm = v => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const linked = readAll_('finInvoice'), words = q.split(/\s+/).filter(Boolean);
  const items = Object.keys(idx.it).map(no => { const v = idx.it[no]; return { no: no, buyer: v[0], date: v[1], invNet: v[2], invGross: v[3], invPaid: v[4] }; })
    .filter(x => words.length && words.every(w => norm(x.buyer).indexOf(w) >= 0 || norm(x.no).indexOf(w) >= 0))
    .sort((x, y) => String(y.date).localeCompare(String(x.date))).slice(0, 15)
    .map(x => { const l = linked.find(z => z.no === x.no); return Object.assign(x, { linked: l ? invTargets_(l).map(t => t.projectId || t.incomeId) : [] }); });
  return { items: items, partial: partial, indexed: Object.keys(idx.it).length };
}
function szPeek_(u, a) {
  const raw = str_(a && a.no, 60).toUpperCase().replace(/\s+/g, ''), y = today_().slice(0, 4), tries = [raw];
  let m = /^([A-Z]+)-(\d{2})-(\d+)$/.exec(raw); if (m) tries.push(m[1] + '-20' + m[2] + '-' + m[3]);
  m = /^([A-Z]+)-(\d{1,4})$/.exec(raw); if (m && m[2].length < 4) tries.push(m[1] + '-' + y + '-' + m[2]);
  if (/^\d{1,4}$/.test(raw)) tries.push(str_(a.prefix, 20).toUpperCase() + '-' + y + '-' + raw);
  let last = null;
  const linked = readAll_('finInvoice');
  for (let i = 0; i < tries.length; i++) { try { const q = szQuery_(tries[i], false), l = linked.find(x => x.no === (q.no || tries[i])); return { linked: l ? invTargets_(l).map(t => t.projectId || t.incomeId) : [], no: q.no || tries[i], buyer: q.buyer, date: q.date, due: q.due, invNet: q.invNet, invGross: q.invGross, invPaid: q.invPaid, tipus: q.tipus, kind: q.kind }; } catch (e) { last = e; } }
  throw new Error('Nem található ilyen számla a számlázz.hu-ban (' + tries.join(', ') + ').');
}
/** Hozzárendelt bizonylat helyének módosítása (díjbekérő / foglaló ↔ végszámla). */
function szSetKind_(u, a) {
  const kind = SZ_KINDS.indexOf(a && a.kind) >= 0 ? a.kind : '';
  if (!kind) throw new Error('Ismeretlen típus.');
  withLock_(() => { const sh = sheetFor_('finInvoice'), row = findRow_(sh, str_(a.id, 64)); if (!row) throw new Error('A bizonylat nem található.'); const r = readRow_('finInvoice', sh, row);
    r.kind = kind; putRow_('finInvoice', sh, r, row); szApplyPay_(invTargets_(r)); dbFlush_(); logEvent_(u, 'Számlázás', r.buyer, r.no + ' típusa: ' + kind); });
  return finData_();
}
/** Számla sztornózása a számlázz.hu-ban (Agent, xmlszamlast); az eredeti kikerül az appból (a projekt újra számlázható). */
function szStorno_(u, a) {
  const key = szNeedKey_(), id = str_(a && a.id, 64), all = readAll_('finInvoice'), x = all.find(r => r.id === id);
  if (!x) throw new Error('A számla nem található.');
  if (x.manual) throw new Error('Kézzel rögzített bizonylatot a kiállító programjában lehet sztornózni.');
  if (x.kind === 'dijbekero') throw new Error('A díjbekérő nem számla – nem kell sztornózni, elég törölni a hozzárendelést.');
  if (Number(x.invPaid) > 0) throw new Error('Kifizetett számlát nem lehet sztornózni.');
  const set = szSettings_(), today = today_();
  const mails = mailOn_('invoice') ? String(a && a.email || '').split(/[,;]\s*/).map(x => x.trim().toLowerCase()).filter(x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)).join(',') : '';   // a sztornót a vevő e-mailben kapja (ha kéred)
  const xml = szXmlHead_('xmlszamlast', 'agentst')
    + '<beallitasok>' + szEl_('szamlaagentkulcs', key) + szEl_('eszamla', set.eInvoice ? 'true' : 'false') + szEl_('szamlaLetoltes', 'false') + szEl_('valaszVerzio', '2') + '</beallitasok>'
    + '<fejlec>' + szEl_('szamlaszam', x.no) + szEl_('keltDatum', today) + szEl_('tipus', 'SS') + '</fejlec>'
    + '<elado>' + szEl_('emailReplyto', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(u && u.email || '')) ? u.email : 'ervin.egri@lumosmotion.com') + '</elado>'
    + '<vevo>' + (mails ? szEl_('email', mails) + szEl_('sendEmail', 'true') : szEl_('sendEmail', 'false')) + '</vevo></xmlszamlast>';
  const r = szPost_('action-szamla_agent_st', xml);
  let no = r.dec(r.headers.szlahu_szamlaszam);
  try { const doc = XmlService.parse(r.body).getRootElement(); if (xmlText_(doc, 'sikeres') === 'false') throw new Error('számlázz.hu hiba (' + xmlText_(doc, 'hibakod') + '): ' + xmlText_(doc, 'hibauzenet')); no = xmlText_(doc, 'szamlaszam') || no; }
  catch (e) { if (/számlázz\.hu hiba/.test(String(e.message))) throw e; }
  if (!no) throw new Error('A számlázz.hu nem adott vissza sztornó számlaszámot: ' + String(r.body || '').slice(0, 200));
  withLock_(() => { const sh = sheetFor_('finInvoice'), row = findRow_(sh, id); if (row) sh.deleteRow(row); if (x.tigId) tigMark_(x.tigId, { status: 'jovahagyva', invoiceNo: '' }); dbFlush_(); });
  logEvent_(u, 'Számlázás', x.buyer, 'Sztornózva: ' + x.no + ' → ' + no);
  return Object.assign(finData_(), { stornoNo: no, original: x });
}
/** Díjbekérő „sztornó”: a számlázz.hu-ban törli a díjbekérőt (Agent, xmlszamladbkdel), és kikerül az appból (a projekthez újra kiállítható). */
function szDbkDelete_(u, a) {
  const id = str_(a && a.id, 64), all = readAll_('finInvoice'), x = all.find(r => r.id === id);
  if (!x) throw new Error('A díjbekérő nem található.');
  if (x.kind !== 'dijbekero') throw new Error('Ez nem díjbekérő.');
  if (Number(x.invPaid) > 0) throw new Error('Kifizetett díjbekérőt nem lehet sztornózni.');
  if (all.some(y => y.ref && y.ref === x.no)) throw new Error('Ehhez a díjbekérőhöz már foglalószámla készült.');
  if (!x.manual) {
    const key = szNeedKey_(), xml = szXmlHead_('xmlszamladbkdel', 'dijbekerodel') + '<beallitasok>' + szEl_('szamlaagentkulcs', key) + '</beallitasok><fejlec>' + szEl_('szamlaszam', x.no) + '</fejlec></xmlszamladbkdel>';
    let r; try { r = szPost_('action-szamla_agent_dijbekero_torlese', xml); } catch (e) { if (!/\(335\)/.test(String(e.message))) throw e; }   // 335: már nincs ilyen díjbekérő → az appból is törölhető
    if (r) { try { const doc = XmlService.parse(r.body).getRootElement(); if (xmlText_(doc, 'sikeres') === 'false' && xmlText_(doc, 'hibakod') !== '335') throw new Error('számlázz.hu hiba (' + xmlText_(doc, 'hibakod') + '): ' + xmlText_(doc, 'hibauzenet')); }
      catch (e) { if (/számlázz\.hu hiba/.test(String(e.message))) throw e; } }
  }
  withLock_(() => { const sh = sheetFor_('finInvoice'), row = findRow_(sh, id); if (row) sh.deleteRow(row); dbFlush_(); });
  logEvent_(u, 'Számlázás', x.buyer, 'Díjbekérő sztornózva (törölve): ' + x.no);
  return Object.assign(finData_(), { deletedNo: x.no });
}
/** Bizonylat áthelyezése másik projekthez (pl. két projekt számlái fel voltak cserélve). a: {id, projectId} */
function szMove_(u, a) {
  const id = str_(a && a.id, 64), pid = str_(a && a.projectId, 64);
  if (!pid || !findRow_(sheetFor_('projects'), pid)) throw new Error('A cél projekt nem található.');
  withLock_(() => { const sh = sheetFor_('finInvoice'), row = findRow_(sh, id); if (!row) throw new Error('A számla nem található.'); const r = readRow_('finInvoice', sh, row), old = invTargets_(r);
    r.projectId = pid; r.incomeId = ''; r.projectIds = String(r.projectIds || '').split(',').filter(x => x && x !== pid).join(',');
    putRow_('finInvoice', sh, r, row); szApplyPay_(old.concat(invTargets_(r))); dbFlush_();
    const p = readAll_('projects').find(x => x.id === pid);
    logEvent_(u, 'Számlázás', r.buyer, r.no + ' áthelyezve: ' + (p ? p.name : pid)); });
  return finData_();
}
function szUnlink_(u, a) {
  const id = str_(a && a.id, 64);
  withLock_(() => { const sh = sheetFor_('finInvoice'), row = findRow_(sh, id); if (!row) throw new Error('A számla nem található.'); const r = readRow_('finInvoice', sh, row); sh.deleteRow(row); if (r.tigId) tigMark_(r.tigId, { status: 'jovahagyva', invoiceNo: '' }); dbFlush_(); logEvent_(u, 'Számlázás', r.buyer, 'Hozzárendelés törölve: ' + r.no + ' (a számlázz.hu-ban a számla megmarad)'); });
  return finData_();
}

/** Kifizetések frissítése a számlázz.hu-ból: a még nem teljesen kifizetett számlák (legfeljebb 25 egy körben). */
function szSync_(u, a) {
  szNeedKey_();
  const started = Date.now(), all = readAll_('finInvoice');
  const ids = a && a.id ? [str_(a.id, 64)] : null;
  const noAdv = x => x.kind === 'dijbekero' && (Number(x.invPaid) || 0) >= (Number(x.invGross) || 0) - 1 && !all.some(y => y.ref === x.no) && String(x.checkedAt || '') < new Date(Date.now() - 3 * 3600e3).toISOString() && (!x.paidAt || String(x.paidAt).slice(0, 10) >= new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10));   // csak a kifizetés utáni 3 napban   // kifizetett díjbekérő, amelyhez még nincs foglalószámla (3 óránként újra megnézzük)
  const advUnk = x => x.kind === 'eloleg' && !x.advType;   // régi foglalószámla: egyszer lekérdezzük, valódi előlegszámla-e, és ha díjbekérő alapján készült, a díjbekérő is bekerül
  const todo = all.filter(x => !x.manual && (ids ? ids.indexOf(x.id) >= 0 : (Number(x.invPaid) || 0) < (Number(x.invGross) || 0) - 1 || noAdv(x) || advUnk(x)))
    .sort((x, y) => String(x.checkedAt).localeCompare(String(y.checkedAt))).slice(0, 25);
  const changed = [], errors = [], created = [];
  todo.forEach(x => {
    if (Date.now() - started > 22000) return;
    try { let q;
      try { q = szQuery_(x.no, false); }
      catch (e0) {   // a kifizetett díjbekérőt a számlázz.hu automatikus számlázáskor törli – ilyenkor a rendelésszám alapján a foglalószámlát kapjuk
        if (x.kind !== 'dijbekero') throw e0;
        const o = szAdvFor_(x);
        if (!o) throw new Error('a díjbekérő a számlázz.hu-ban már nem található (valószínűleg kifizették, és a foglalószámla még nem párosítható) – jelöld kézzel fizetettnek');
        szAddAdvance_(all, x, o, created);
        q = { invPaid: Number(x.invGross) || o.invGross, paidAt: o.paidAt || o.date, invGross: x.invGross, invNet: x.invNet, due: x.due };
      }
      if (x.kind === 'dijbekero' && (Number(q.invPaid) || 0) >= (Number(q.invGross || x.invGross) || 0) - 1 && !all.some(y => y.ref === x.no)) { try { const o2 = szAdvFor_(x); if (o2 && o2.kind !== 'dijbekero') szAddAdvance_(all, x, o2, created); } catch (eA) { } }   // a kifizetett díjbekérőből készült foglalószámla is bekerül
      if (x.kind === 'eloleg' && q.no) { x.advType = q.advReal ? 'elolegszamla' : 'szamla';
        if (q.fromDijbekero && !x.ref) x.ref = q.fromDijbekero;
        if (q.fromDijbekero && !all.some(y => y.no === q.fromDijbekero) && !created.some(y => y.no === q.fromDijbekero)) { const r0 = { id: Utilities.getUuid(), no: q.fromDijbekero, kind: 'dijbekero', projectId: x.projectId, incomeId: x.incomeId, buyer: x.buyer || q.buyer, date: '', due: '', invNet: q.invNet || x.invNet, invGross: q.invGross || x.invGross,
            invPaid: q.invGross || x.invGross, paidAt: q.paidAt || x.paidAt, payMethod: q.payMethod || '', createdAt: now_(), createdBy: 'számlázz.hu', checkedAt: now_(), note: 'A ' + x.no + ' számlából (a díjbekérő alapján készült)', items: '', ref: x.no, projectIds: x.projectIds || '', manual: '1', advType: '', issuer: x.issuer || 'kft' };
          created.push(r0); all.push(r0); } }   // a díjbekérő is bekerül (kifizetettként, a számlázz.hu már nem adja vissza)
      const was = Number(x.invPaid) || 0;
      Object.assign(x, { invPaid: q.invPaid, paidAt: q.paidAt || x.paidAt, invGross: q.invGross || x.invGross, invNet: q.invNet || x.invNet, due: q.due || x.due, checkedAt: now_() });
      x._dirty = true; if (q.invPaid !== was) changed.push(x);
    } catch (e) { errors.push(x.no + ': ' + e.message); }
  });
  withLock_(() => {
    const sh = sheetFor_('finInvoice');
    todo.filter(x => x._dirty).forEach(x => { const row = findRow_(sh, x.id); if (row) { delete x._dirty; putRow_('finInvoice', sh, x, row); } });
    const have = {}; readAll_('finInvoice').forEach(x => { if (x.no) have[x.kind + '|' + x.no] = 1; });
    created.forEach(x => { if (x.no && have[x.kind + '|' + x.no]) return; have[x.kind + '|' + x.no] = 1; putRow_('finInvoice', sh, x, 0); });   // két egyszerre futó lekérdezés se hozza be kétszer
    { const seen = {}, dup = []; readAll_('finInvoice').forEach(x => { if (!x.no || x.manual) return; const k = x.kind + '|' + x.no; if (seen[k]) dup.push(x.id); else seen[k] = 1; });   // korábban kétszer bekerült bizonylat: a másodpéldány törlődik
      dup.forEach(id => { const row = findRow_(sh, id); if (row) sh.deleteRow(row); }); }
    szApplyPay_([].concat.apply([], todo.map(invTargets_)));
    const s = szSettings_(); s.lastSync = now_(); szStore_(s);
    dbFlush_();
  });
  if (changed.length || created.length) logEvent_(u, 'Számlázás', '', [changed.length ? 'Kifizetés frissítve: ' + changed.map(x => x.no).join(', ') : '', created.length ? 'Foglalószámla behozva: ' + created.map(x => x.no).join(', ') : ''].filter(String).join(' · '));
  return Object.assign(finData_(), { synced: { checked: todo.length, changed: changed.map(x => ({ no: x.no, buyer: x.buyer, paid: x.invPaid, gross: x.invGross })), created: created.map(x => ({ no: x.no, ref: x.ref })), errors: errors } });
}
/** A díjbekérőből készült foglalószámla a számlázz.hu-ban, rendelésszám alapján: a projekt azonosítója, a Sales App díjbekérőinél a Sales-rendelés azonosítója (sales-<id>, vagy az lx_link párosítás). */
function szAdvFor_(x) {
  const pid0 = x.projectId || x.incomeId, cands = [pid0];
  if (/^sales-/.test(String(pid0))) cands.push(String(pid0).slice(6));
  try { (neonSql_([{ query: 'SELECT order_id FROM lx_link WHERE project_id = $1', params: [String(pid0)] }])[0].rows || []).forEach(r => cands.push(r[0])); } catch (eL) { }
  { const yrs = [String(x.date || '').slice(0, 4), String(new Date().getFullYear())].filter(y => /^\d{4}$/.test(y)); cands.slice().forEach(c => { if (c && !/^LM-/.test(c) && !/^sales-/.test(c)) yrs.forEach(y => cands.push('LM-' + y + '-' + c)); }); }   // a Sales App rendelésszáma: LM-<év>-<rendelés-azonosító>
  for (const c of cands.filter((v, i, a) => v && a.indexOf(v) === i)) { try { const t = szQuery_('', false, c); if (t && (t.fromDijbekero === x.no || (t.kind !== 'dijbekero' && Math.abs((Number(t.invGross) || 0) - (Number(x.invGross) || 0)) <= 1 && szSameBuyer_(t.buyer, x.buyer)))) return t; } catch (eQ) { } }
  return null;
}
/** Ugyanaz a vevő-e (ékezet, kis-nagybetű, cégforma nélkül): a foglalószámla csak ugyanannak a vevőnek a díjbekérőjéhez párosítható */
function szSameBuyer_(a, b) { const n = v => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\b(kft|zrt|bt|nyrt|kkt|korlatolt felelossegu tarsasag|zartkoruen mukodo reszvenytarsasag)\b\.?/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const x = n(a), y = n(b); return !!x && !!y && (x === y || x.indexOf(y) >= 0 || y.indexOf(x) >= 0); }
/** Díjbekérőből (automatikusan) készült foglalószámla felvétele, ha még nincs nálunk. */
function szAddAdvance_(all, db, q, out) {
  if (!q || !q.no || all.some(x => x.no === q.no) || out.some(x => x.no === q.no)) return;
  const r = { id: Utilities.getUuid(), no: q.no, kind: 'eloleg', projectId: db.projectId, incomeId: db.incomeId, buyer: q.buyer || db.buyer, date: q.date, due: q.due, invNet: q.invNet, invGross: q.invGross,
    invPaid: q.invPaid || q.invGross, paidAt: q.paidAt || q.date, payMethod: q.payMethod, createdAt: now_(), createdBy: 'számlázz.hu', checkedAt: now_(), note: 'A díjbekérő kifizetése után automatikusan', items: '', ref: db.no, projectIds: db.projectIds || '', advType: q.advReal ? 'elolegszamla' : 'szamla' };
  out.push(r); all.push(r);
}
function szPdf_(u, a) {
  const r = readAll_('finInvoice').find(x => x.id === str_(a && a.id, 64));
  if (!r) throw new Error('A számla nem található.');
  let q = null, err = null;
  try { q = szQuery_(r.no, true); } catch (e) { err = e; }
  if (q && q.pdf) return { name: r.no.replace(/[^\w.-]+/g, '_') + '.pdf', b64: q.pdf };
  /* a kifizetett díjbekérőt a számlázz.hu már nem adja vissza: a kiállításkor kapott másolatot keressük a levelek között (Sales App / számlázz.hu e-mail melléklete) */
  if (r.kind === 'dijbekero') { try {
    const th = GmailApp.search('"' + r.no + '" has:attachment filename:pdf', 0, 10);
    for (const t of th) for (const m of t.getMessages()) for (const at of m.getAttachments()) {
      const n = String(at.getName() || ''); if (/\.pdf$/i.test(n) && n.replace(/[^A-Za-z0-9]/g, '').toUpperCase().indexOf(r.no.replace(/[^A-Za-z0-9]/g, '').toUpperCase()) >= 0) return { name: r.no.replace(/[^\w.-]+/g, '_') + '.pdf', b64: Utilities.base64Encode(at.getBytes()) }; }
  } catch (eG) { Logger.log('Díjbekérő PDF a levelekből: ' + eG); } }
  if (err) throw err;
  throw new Error('A számlázz.hu nem adta vissza a PDF-et.');
}

/** A számlázz.hu IPN-értesítése (a beállításokban megadott URL: …/exec?ipn=<titkos kulcs>).
    Az értesítésben kapott összeget a számlázz.hu-tól lekérdezve ellenőrizzük; mindig 200-zal válaszolunk. */
function szIpn_(e) {
  const ok = () => ContentService.createTextOutput('OK');
  try {
    const s = szSettings_(), p = e.parameter || {};
    if (!s.ipnToken || String(p.ipn) !== s.ipnToken) return ok();
    const no = str_(p.szlahu_szamlaszam, 60), order = str_(p.szlahu_rendelesszam, 64);
    if (!no) return ok();
    const sys = { name: 'számlázz.hu (IPN)', role: 'admin' };
    withLock_(() => {
      const sh = sheetFor_('finInvoice'), all = readAll_('finInvoice');
      const dbNo = str_(p.szlahu_dijbekero_szama, 60), db = dbNo ? all.find(x => x.no === dbNo) : null;
      let r = all.find(x => x.no === no);
      if (!r && db) {   // kifizetett díjbekérőből automatikusan készült foglalószámla
        const extra = [];
        let q = null; try { q = szQuery_(no, false); } catch (err) { q = { no: no, date: today_(), due: '', invNet: 0, invGross: Math.round(Number(p.szlahu_bruttovegosszeg) || 0), invPaid: Math.round(Number(p.szlahu_kifizetettbrutto) || 0), paidAt: iso_(p.szlahu_kifizdat) || today_(), payMethod: str_(p.szlahu_fizetesmod, 40), buyer: db.buyer }; }
        szAddAdvance_(all, db, q, extra);
        extra.forEach(x => putRow_('finInvoice', sh, x, 0));
        db.invPaid = Number(db.invGross) || q.invPaid; db.paidAt = q.paidAt || today_(); db.checkedAt = now_(); db.ref = no;
        putRow_('finInvoice', sh, db, findRow_(sh, db.id));
        szApplyPay_(invTargets_(db));
        dbFlush_();
        logEvent_(sys, 'Számlázás', db.buyer, 'Díjbekérő kifizetve: ' + dbNo + ' → foglalószámla ' + no);
        return;
      }
      if (!r && order) {   // az appból kiállított számla rendelésszáma a projekt / bevételi sor azonosítója
        const isProj = !!findRow_(sheetFor_('projects'), order), isInc = !isProj && !!findRow_(sheetFor_('finIncome'), order);
        if (isProj || isInc) r = { id: Utilities.getUuid(), no: no, kind: 'szamla', projectId: isProj ? order : '', incomeId: isInc ? order : '',
          buyer: '', date: today_(), due: '', invNet: 0, invGross: 0, invPaid: 0, paidAt: '', payMethod: str_(p.szlahu_fizetesmod, 40), createdAt: now_(), createdBy: sys.name, checkedAt: '', note: '' };
      }
      if (!r) return;
      try { const q = szQuery_(no, false); Object.assign(r, { invPaid: q.invPaid, paidAt: q.paidAt || r.paidAt, invGross: q.invGross || r.invGross, invNet: q.invNet || r.invNet, due: q.due || r.due, buyer: r.buyer || q.buyer, date: r.date || q.date }); }
      catch (err) {   // ha a lekérdezés nem megy, az értesítés adatait használjuk
        const n = v => Math.round(Number(String(v || '').replace(',', '.'))) || 0;
        r.invPaid = n(p.szlahu_kifizetettbrutto); r.invGross = n(p.szlahu_bruttovegosszeg) || r.invGross; if (p.szlahu_kifizdat) r.paidAt = iso_(p.szlahu_kifizdat);
        if (!r.paidAt && r.invPaid) r.paidAt = today_();
      }
      r.checkedAt = now_();
      putRow_('finInvoice', sh, r, findRow_(sh, r.id));
      szApplyPay_(invTargets_(r));
      dbFlush_();
      logEvent_(sys, 'Számlázás', r.buyer, 'Kifizetési értesítés: ' + no + ' – kifizetve ' + r.invPaid + ' / ' + r.invGross + ' Ft');
    });
  } catch (err) { Logger.log('IPN hiba: ' + err); }
  return ok();
}

/* ===================== SZERZŐDÉS ÉS SZÁMLÁZÁS (projektenkénti adatok) ===================== */
const BILL_CONTRACT = ['', 'kikuldve', 'alairva', 'nemkell', 'visszakuldve'];
const CT_STATUS = ['', 'kikuldve', 'visszakuldve', 'alairva'];
/* A még projekt nélküli lehetőségek szerződés-állapota (a munkalap oszlopai érintetlenek): {dealId: {s, at}} a Script Properties-ben */
function dealCtMap_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('DEAL_CT') || '{}'); } catch (e) { return {}; } }
function dealCtPut_(id, st) { const m = dealCtMap_(); if (st) m[id] = { s: st, at: today_() }; else delete m[id]; PropertiesService.getScriptProperties().setProperty('DEAL_CT', JSON.stringify(m)); }
function billRow_(projectId) {
  const sh = sheetFor_('finBilling'), all = readAll_('finBilling'), r = all.find(x => x.projectId === projectId);
  return { sh: sh, r: r || { id: Utilities.getUuid(), projectId: projectId, contractStatus: '', contractUrl: '', contractName: '', contractFileId: '', contractAt: '', contractBy: '',
    mode: 'eloleg', advancePct: 50, poNumber: '', note: '', updatedAt: '', updatedBy: '', signedAt: '', ceoPct: '', rezsiPct: '' } };
}
/** Szerződés állapota (kiküldve / visszaküldve / aláírva): a projekten (Szerződések lap) és az értékesítési lehetőségen.
 *  a: {projectId?, dealId?, status}. A lehetőség projektje is frissül; a projekt állapota a hozzá kapcsolt lehetőségen is látszik. */
function ctStatusSet_(u, a) {
  a = a || {}; const st = String(a.status || ''); if (CT_STATUS.indexOf(st) < 0) throw new Error('Ismeretlen szerződés-állapot.');
  let pid = str_(a.projectId, 64), did = str_(a.dealId, 64), title = '';
  withLock_(() => {
    if (did) { const sh = sheetFor_('deals'), row = findRow_(sh, did); if (row) { const d = readRow_('deals', sh, row); dealCan_(u, d); title = d.title; dealCtPut_(did, st); if (!pid && d.projectId) pid = d.projectId; } }
    if (pid && ID_RE.test(pid) && findRow_(sheetFor_('projects'), pid)) { const b = billRow_(pid), r = b.r; r.contractStatus = st; if (st === 'alairva' && !r.signedAt) r.signedAt = today_(); if (st !== 'alairva') r.signedAt = ''; r.updatedAt = now_(); r.updatedBy = u.name; putRow_('finBilling', b.sh, r, findRow_(b.sh, r.id)); }
    dbFlush_();
  });
  logEvent_(u, 'Szerződés állapota', title || pid || '', ({ '': 'törölve', kikuldve: 'kiküldve', visszakuldve: 'visszaküldve módosításra', alairva: 'aláírva' })[st]);
  return Object.assign(finPart_(['billing']), u.role === 'admin' || u.role === 'sales' ? { deals: dealsFor_(u) } : {});
}
function billSave_(u, a) {
  const pid = str_(a && a.projectId, 64);
  if (!ID_RE.test(pid) || !findRow_(sheetFor_('projects'), pid)) throw new Error('A projekt nem található.');
  withLock_(() => {
    const b = billRow_(pid), r = b.r;
    if (a.contractStatus !== undefined) { if (BILL_CONTRACT.indexOf(a.contractStatus) < 0) throw new Error('Ismeretlen szerződés-állapot.'); r.contractStatus = a.contractStatus; }
    if (a.contractUrl !== undefined) { const v = str_(a.contractUrl, 500); if (v && !/^https:\/\//.test(v)) throw new Error('A szerződés linkje https:// kezdetű legyen.'); if (v !== r.contractUrl) { r.contractUrl = v; r.contractFileId = ''; r.contractName = v ? (r.contractName && !r.contractFileId ? r.contractName : 'Link') : ''; } }
    if (a.clearFile) { r.contractUrl = ''; r.contractFileId = ''; r.contractName = ''; r.contractAt = ''; r.contractBy = ''; }
    if (a.mode !== undefined) r.mode = a.mode === 'egyben' ? 'egyben' : 'eloleg';
    if (a.noFinal !== undefined) r.noFinal = a.noFinal ? '1' : '';
    if (a.watermark !== undefined) r.watermark = a.watermark === '1' || a.watermark === true ? '1' : a.watermark === '0' || a.watermark === false ? '0' : '';   // vízjel az ügyfél jóváhagyó lejátszóján
    if (a.mktProject !== undefined) r.mktProject = a.mktProject === '0' ? '0' : a.mktProject && a.mktProject !== '' ? '1' : '';   // '0': kifejezetten nem marketing (az érték nélküli projekt is a bevételek közt marad)   // saját marketing projekt: a termelési költség a marketing alapból megy
    if (a.tigMode !== undefined) r.tigMode = a.tigMode === 'kell' || a.tigMode === 'nemkell' ? a.tigMode : '';
    if (a.advancePct !== undefined) { const n = Math.round(Number(a.advancePct)); if (!isFinite(n) || n < 0 || n > 100) throw new Error('A foglaló 0–100% lehet.'); r.advancePct = n; }
    if (a.poNumber !== undefined) r.poNumber = str_(a.poNumber, 80);
    if (a.note !== undefined) r.note = str_(a.note, 1000);
    if (a.signedAt !== undefined) r.signedAt = iso_(a.signedAt);
    ['ceoPct', 'rezsiPct'].forEach(k => { if (a[k] === undefined) return; if (a[k] === '' || a[k] === null) { r[k] = ''; return; }
      const n = Math.round(Number(a[k]) * 10) / 10; if (!isFinite(n) || n < 0 || n > 100) throw new Error('A százalék 0 és 100 között legyen.'); r[k] = String(n); });
    if (r.contractStatus === 'alairva' && !r.signedAt) r.signedAt = today_();
    r.updatedAt = now_(); r.updatedBy = u.name;
    putRow_('finBilling', b.sh, r, findRow_(b.sh, r.id));
    dbFlush_();
  });
  logEvent_(u, 'Szerződés és számlázás', (readRow_('projects', sheetFor_('projects'), findRow_(sheetFor_('projects'), pid)) || {}).name || pid, 'módosítva');
  return finPart_(['billing']);
}
/** Szerződés feltöltése a projekt Drive-mappájába (a mappát szükség esetén létrehozza). a: {projectId, name, mime, b64, contractStatus} */
/** Extra tétel (pl. továbbszámlázott költség) csatolmánya: a projekt Drive-mappájának „Továbbszámlázott” almappájába */
function extraFileUpload_(u, a) {
  const pid = str_(a && a.projectId, 64), name = (str_(a && a.name, 150).replace(/[\\/]/g, '-') || 'csatolmany.pdf'), b64 = String(a && a.b64 || '');
  if (!b64) throw new Error('Nincs feltöltendő fájl.');
  if (b64.length > 14 * 1024 * 1024) throw new Error('A fájl legfeljebb 10 MB lehet.');
  const mime = /^[\w.+-]+\/[\w.+-]+$/.test(String(a.mime || '')) ? String(a.mime) : 'application/octet-stream';
  const root = DriveApp.getFolderById(createProjectFolder_(u, { id: pid }).folderId), folder = folderPath_(root, a.folder === 'Csatolmányok' ? 'Csatolmányok' : 'Továbbszámlázott', {});
  const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime, uniqueName_(folder, name)));
  logEvent_(u, a.folder === 'Csatolmányok' ? 'Csatolmány feltöltve (új projekt)' : 'Csatolmány feltöltve (extra tétel)', name, pid);
  return { url: file.getUrl(), name: name };
}
function billUpload_(u, a) {
  const pid = str_(a && a.projectId, 64);
  const name = str_(a && a.name, 150).replace(/[\\/]/g, '-') || 'szerzodes.pdf', b64 = String(a && a.b64 || '');
  if (!b64) throw new Error('Nincs feltöltendő fájl.');
  if (b64.length > 14 * 1024 * 1024) throw new Error('A fájl legfeljebb 10 MB lehet.');
  const mime = /^[\w.+-]+\/[\w.+-]+$/.test(String(a.mime || '')) ? String(a.mime) : 'application/octet-stream';
  const pr0 = readRow_('projects', sheetFor_('projects'), findRow_(sheetFor_('projects'), pid));
  const cf = pr0 && pr0.client ? clientFolder_(pr0.client) : null;   // a főmappában: 02 Ügyfelek / <ügyfél> / Szerződések / <év>
  const year = String(pr0 && pr0.date || today_()).slice(0, 4), ext = (/\.[a-z0-9]{2,5}$/i.exec(name) || ['.pdf'])[0];
  const folder = cf ? folderPath_(cf, 'Szerződések/' + year, {}) : DriveApp.getFolderById(createProjectFolder_(u, { id: pid }).folderId);
  const fname = cf ? uniqueName_(folder, today_() + '_' + shortName_(pr0.client) + '_szerzodes_KFT' + (a.contractStatus === 'kikuldve' ? '' : '_alairt') + ext) : name;
  const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime, fname));
  withLock_(() => {
    const b = billRow_(pid), r = b.r;
    Object.assign(r, { contractUrl: file.getUrl(), contractName: name, contractFileId: file.getId(), contractAt: now_(), contractBy: u.name, updatedAt: now_(), updatedBy: u.name });
    if (BILL_CONTRACT.indexOf(a.contractStatus) > 0) r.contractStatus = a.contractStatus; else if (!r.contractStatus) r.contractStatus = 'alairva';
    if (r.contractStatus === 'alairva' && !r.signedAt) r.signedAt = today_();
    putRow_('finBilling', b.sh, r, findRow_(b.sh, r.id));
    dbFlush_();
  });
  logEvent_(u, 'Szerződés feltöltve', name, '');
  return finPart_(['billing']);
}

/* ===================== MUNKATÁRSI SZERZŐDÉSEK (csak az ügyvezető) =====================
   A fájlok a script tulajdonosának saját Drive-jában, egy nem megosztott mappában vannak (nem a közös Lumos mappában),
   és csak az alkalmazáson keresztül, ügyvezetői jogosultsággal nyithatók meg. */
const CREW_DOCS_FOLDER_PROPERTY = 'LUMOS_PM_CREW_DOCS_FOLDER';
function crewDocsFolder_() {
  const P = PropertiesService.getScriptProperties(), id = P.getProperty(CREW_DOCS_FOLDER_PROPERTY);
  if (id) { try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) { } }
  const f = DriveApp.getRootFolder().createFolder('Lumos Projekttervező – Munkatársi szerződések (bizalmas)');
  try { f.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (e) { }
  P.setProperty(CREW_DOCS_FOLDER_PROPERTY, f.getId()); return f;
}
function crewDocsList_() { return readAll_('crewDocs').map(d => ({ id: d.id, crewId: String(d.crewId || ''), title: d.title || '', fileName: d.fileName || '', mime: d.mime || '', signedAt: iso_(d.signedAt) || '', note: d.note || '', createdAt: d.createdAt || '', createdBy: d.createdBy || '' })); }
function crewDocSave_(u, a) {
  a = a || {};
  const cid = str_(a.crewId, 64), c = readAll_('crew').find(x => x.id === cid);
  if (!c) throw new Error('A munkatárs nem található.');
  if (!a.b64) throw new Error('Válaszd ki a szerződés fájlját.');
  if (String(a.b64).length > 14 * 1024 * 1024) throw new Error('A fájl legfeljebb 10 MB lehet.');
  const mime = /^[\w.+-]+\/[\w.+-]+$/.test(String(a.mime || '')) ? String(a.mime) : 'application/octet-stream';
  const name = str_(a.name, 150).replace(/[\\/]/g, '-') || 'szerzodes.pdf';
  const ext = (/\.[a-z0-9]{2,5}$/i.exec(name) || ['.pdf'])[0];
  const folder = childFolder_(crewDocsFolder_(), String(c.name || cid).replace(/[\\/]/g, '-'));
  const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(String(a.b64)), mime, (iso_(a.signedAt) || today_()) + '_' + shortName_(c.name) + '_' + (String(a.title || 'szerzodes').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'dokumentum') + ext));
  return withLock_(() => {
    const sh = sheetFor_('crewDocs');
    const r = { id: Utilities.getUuid(), crewId: cid, crewName: c.name || '', title: str_(a.title, 120) || 'Szerződés', fileName: name, fileId: file.getId(), mime: mime,
      signedAt: iso_(a.signedAt) || '', note: str_(a.note, 500), createdAt: now_(), createdBy: u.name };
    putRow_('crewDocs', sh, r, 0); dbFlush_();
    logEvent_(u, 'Munkatársi szerződés feltöltve', c.name || cid, r.title);
    return { crewDocs: crewDocsList_() };
  });
}
/** Naponta egyszer: a külsősök egyértelműen aláírt szerződései (a fájlnévben „aláírt” + szerződés) automatikusan bekerülnek.
    A bejelentkezés után egy háttérfeladat futtatja; az eredmény a következő betöltéskor az ügyvezetőnek üzenetként jelenik meg. */
function crewDocsAuto_() {
  const P = PropertiesService.getScriptProperties(), d = today_();
  if (P.getProperty('CREWDOCS_AUTO2_AT') === d) return;
  P.setProperty('CREWDOCS_AUTO2_AT', d);
  try {
    const r = crewDocsImport_({ id: 'gmail-auto', name: 'Gmail-begyűjtés', role: 'admin', email: '' }, { strict: true });
    P.setProperty('CREWDOCS_AUTO2_RES', JSON.stringify({ at: now_(), n: r.plan.length, list: r.plan.map(x => x.crew + ' – ' + x.title).slice(0, 20) }));
  } catch (e) { P.setProperty('CREWDOCS_AUTO2_RES', JSON.stringify({ at: now_(), err: String((e && e.message) || e).slice(0, 300) })); P.deleteProperty('CREWDOCS_AUTO2_AT'); }
}
function crewDocsAutoRun() { ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'crewDocsAutoRun').forEach(t => { try { ScriptApp.deleteTrigger(t); } catch (e) {} }); crewDocsAuto_(); }
function crewDocsAutoSchedule_() {
  const P = PropertiesService.getScriptProperties();
  if (P.getProperty('CREWDOCS_AUTO2_AT') === today_()) return;
  if (ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'crewDocsAutoRun')) return;
  ScriptApp.newTrigger('crewDocsAutoRun').timeBased().after(20 * 1000).create();
}
/** Aláírt munkatársi szerződések begyűjtése a Gmailből (külsősök, akiknek még nincs feltöltött szerződésük). a: {dry, crewIds?} */
function crewDocsImport_(u, a) {
  a = a || {};
  const have = {}; readAll_('crewDocs').forEach(d => { have[d.crewId] = 1; });
  /* a postafiók gazdájának saját címével nem keresünk: arra a teljes levelezése illeszkedne (így került pl. a MŰSZOL keretszerződése Egri Ervinhez) */
  let me = ''; try { me = String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (e) { }
  const own = em => { em = String(em || '').trim().toLowerCase(); return !!em && em === me; };
  const crew = readAll_('crew').filter(c => c.email && !own(c.email) && c.type !== 'Belsős' && !have[c.id] && (!a.crewIds || a.crewIds.indexOf(c.id) >= 0));
  const KW = /szerz|megb[ií]z|keret|contract|v[aá]llalk/i, SIGNED = /al[aá][ií]rt|signed|alairva|aláírva/i, DRAFT = /tervezet|draft|minta/i;
  const titleOf = n => /m[oó]dos[ií]t/i.test(n) ? 'Szerződésmódosítás' : /mell[eé]klet/i.test(n) ? 'Szerződés melléklet' : /keret/i.test(n) ? 'Keretszerződés' : /megb[ií]z/i.test(n) ? 'Megbízási szerződés' : /v[aá]llalk/i.test(n) ? 'Vállalkozási szerződés' : 'Szerződés';
  const plan = [];
  crew.forEach(c => {
    const em = String(c.email).trim().toLowerCase();
    let threads = []; try { threads = GmailApp.search('{from:' + em + ' to:' + em + '} has:attachment filename:pdf', 0, 15); } catch (e) { return; }
    const cands = [];
    threads.forEach(t => {
      const subjOk = KW.test(t.getFirstMessageSubject() || '');
      t.getMessages().forEach(m => {
        const from = String(m.getFrom() || '').toLowerCase(), byCrew = from.indexOf(em) >= 0, body = subjOk;
        m.getAttachments({ includeInlineImages: false }).forEach(at => {
          const n = at.getName() || '', isPdf = /\.pdf$/i.test(n) || at.getContentType() === 'application/pdf';
          if (!isPdf) return;
          const signedName = SIGNED.test(n), kwName = KW.test(n);
          if (/sz[aá]mla|invoice|igazol|teljes[ií]t/i.test(n)) return;
          if (!(signedName && (kwName || body)) && !(byCrew && (kwName || body) && !DRAFT.test(n))) return;
          if (DRAFT.test(n) && !signedName) return;
          if (a.strict && !(signedName && kwName)) return;
          cands.push({ at: at, name: n, size: at.getSize(), date: Utilities.formatDate(m.getDate(), SHEET_TZ, 'yyyy-MM-dd'), ts: m.getDate().getTime(), byCrew: byCrew, signedName: signedName });
        });
      });
    });
    /* fajtánként (megnevezés) a legfrissebb aláírt példány */
    const best = {};
    cands.sort((x, y) => y.ts - x.ts).forEach(x => { const k = titleOf(x.name); if (!best[k]) best[k] = x; });
    Object.keys(best).forEach(k => { const x = best[k]; if (a.only && a.only.indexOf(c.id + '|' + k) < 0) return; plan.push({ crewId: c.id, crew: c.name, title: k, name: x.name, date: x.date, kb: Math.round(x.size / 1024), byCrew: x.byCrew, _x: x }); });
  });
  if (!a.dry) plan.forEach(p => {
    const b = p._x.at.copyBlob();
    crewDocSave_(u, { crewId: p.crewId, title: p.title, signedAt: p.date, name: p.name, mime: 'application/pdf', b64: Utilities.base64Encode(b.getBytes()), note: 'Gmailből begyűjtve' });
  });
  return { plan: plan.map(p => { const o = Object.assign({}, p); delete o._x; return o; }), skipped: readAll_('crew').filter(c => c.type !== 'Belsős' && c.email && !have[c.id] && !plan.some(p => p.crewId === c.id)).map(c => c.name), crewDocs: a.dry ? undefined : crewDocsList_() };
}
function crewDocGet_(u, a) {
  const d = readAll_('crewDocs').find(x => x.id === str_(a && a.id, 64)); if (!d) throw new Error('A szerződés nem található.');
  const b = DriveApp.getFileById(String(d.fileId)).getBlob();
  if (b.getBytes().length > 10 * 1024 * 1024) throw new Error('A fájl túl nagy a megnyitáshoz.');
  return { name: d.fileName || b.getName(), mime: b.getContentType() || d.mime || 'application/pdf', b64: Utilities.base64Encode(b.getBytes()) };
}
function crewDocRename_(u, a) {
  const title = str_(a && a.title, 120).replace(/\s+/g, ' ').trim();
  if (!title) throw new Error('Add meg a dokumentum nevét.');
  return withLock_(() => {
    const sh = sheetFor_('crewDocs'), d = readAll_('crewDocs').find(x => x.id === str_(a && a.id, 64));
    if (!d) throw new Error('A dokumentum nem található.');
    const old = d.title || '';
    d.title = title; putRow_('crewDocs', sh, d, findRow_(sh, d.id)); dbFlush_();
    logEvent_(u, 'Munkatársi dokumentum átnevezve', d.crewName || d.crewId, old + ' → ' + title);
    return { crewDocs: crewDocsList_() };
  });
}
function crewDocDelete_(u, a) {
  return withLock_(() => {
    const sh = sheetFor_('crewDocs'), d = readAll_('crewDocs').find(x => x.id === str_(a && a.id, 64));
    if (!d) return { crewDocs: crewDocsList_() };
    try { DriveApp.getFileById(String(d.fileId)).setTrashed(true); } catch (e) { }   // a kukába kerül (30 napig visszaállítható)
    sh.deleteRow(findRow_(sh, d.id)); dbFlush_();
    logEvent_(u, 'Munkatársi szerződés törölve', d.crewName || d.crewId, d.title || '');
    return { crewDocs: crewDocsList_() };
  });
}

/* ===================== KERETSZERZŐDÉSEK (ügyfelenként) =====================
   Ha egy ügyféllel keretszerződés van, a projektjeinél nem kell külön szerződés (a lejárati dátumig, ha van). */
function fwSave_(u, a) {
  a = a || {};
  const client = str_(a.client, 160).replace(/\s+/g, ' ');
  if (client.length < 2) throw new Error('Hiányzik az ügyfél neve.');
  const url = str_(a.url, 500); if (url && !/^https:\/\//.test(url)) throw new Error('A link https:// kezdetű legyen.');
  let file = null;
  if (a.b64) {   // feltöltés a Projektek / Keretszerződések mappába
    if (String(a.b64).length > 14 * 1024 * 1024) throw new Error('A fájl legfeljebb 10 MB lehet.');
    const mime = /^[\w.+-]+\/[\w.+-]+$/.test(String(a.mime || '')) ? String(a.mime) : 'application/octet-stream';
    const name = str_(a.name, 150).replace(/[\\/]/g, '-') || 'keretszerzodes.pdf';
    const cf = clientFolder_(client);   // a főmappában: 02 Ügyfelek / <ügyfél> / Keretszerződés
    const folder = cf ? childFolder_(cf, 'Keretszerződés') : childFolder_(DriveApp.getFolderById(PROJECTS_FOLDER_ID), 'Keretszerződések');
    const ext = (/\.[a-z0-9]{2,5}$/i.exec(name) || ['.pdf'])[0];
    file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(String(a.b64)), mime, cf ? (iso_(a.signedAt) || today_()) + '_' + shortName_(client) + '_keretszerzodes_KFT_alairt' + ext : client.replace(/[\\/]/g, '-') + ' – ' + name));
  }
  return withLock_(() => {
    const sh = sheetFor_('finFramework'), all = readAll_('finFramework');
    const old = (a.id && all.find(x => x.id === str_(a.id, 64))) || all.find(x => String(x.client).trim().toLowerCase() === client.toLowerCase());
    const r = Object.assign({ id: Utilities.getUuid(), client: client, url: '', fileName: '', fileId: '', signedAt: '', validTo: '', note: '', createdAt: now_(), createdBy: u.name, mode: '' }, old || {});
    r.client = client;
    if (a.mode !== undefined) r.mode = a.mode === 'nemkell' ? 'nemkell' : '';
    if (file) { r.url = file.getUrl(); r.fileName = str_(a.name, 150); r.fileId = file.getId(); }
    else if (a.url !== undefined && url !== r.url) { r.url = url; r.fileId = ''; r.fileName = url ? 'Link' : ''; }
    if (a.signedAt !== undefined) r.signedAt = iso_(a.signedAt);
    if (a.validTo !== undefined) r.validTo = iso_(a.validTo);
    if (a.note !== undefined) r.note = str_(a.note, 500);
    if (r.mode !== 'nemkell' && !r.url && !r.fileId) { if (old) sh.deleteRow(findRow_(sh, old.id)); dbFlush_(); return finPart_(['frameworks']); }   // se szerződés, se „nem kell”: nincs mit tárolni
    putRow_('finFramework', sh, r, old ? findRow_(sh, old.id) : 0);
    dbFlush_();
    logEvent_(u, 'Keretszerződés', client, old ? 'módosítva' : 'felvéve');
    return finPart_(['frameworks']);
  });
}
/** Az ügyfél mappája (02 Ügyfelek / <ügyfél>) – ha több szerződés van, ezt nyitja meg az app. */
function clientFolderUrl_(a) {
  const f = clientFolder_(str_(a && a.client, 160)); if (!f) throw new Error('Még nincs beállítva a LUMOS MOTION AUTOMATIZÁLT főmappa.');
  return { url: f.getUrl() };
}
/** Ügyfélmappák áttekintése: mappánként a link és a valódi szerződések listája (csak a Szerződések és Keretszerződés almappákból;
   a _munka piszkozatai, teljesítésigazolások, számlák, ajánlatok, szereplői nyilatkozatok nem számítanak). Egy évszám nélküli almappa (pl. több oldalas fotózott szerződés) egy szerződésnek számít. 10 percig gyorsítótárban. */
/* Nagy JSON tartós tárolása a Script-tulajdonságokban, darabolva (egy érték max. 9 KB) */
function bigPut_(key, str) { const P = PropertiesService.getScriptProperties(), n = Math.ceil(str.length / 8000), o = {}; for (let i = 0; i < n; i++) o[key + '_' + i] = str.slice(i * 8000, (i + 1) * 8000); o[key + '_n'] = String(n); P.setProperties(o); }
function bigGet_(key) { const P = PropertiesService.getScriptProperties(), n = Number(P.getProperty(key + '_n') || 0); if (!n) return ''; let s = ''; for (let i = 0; i < n; i++) s += P.getProperty(key + '_' + i) || ''; return s; }
/** Egy ügyfélmappa szerződései (Szerződések és Keretszerződés almappák). */
function clientDocsOf_(f) {
  const fmt = d => d ? Utilities.formatDate(d, SHEET_TZ, 'yyyy-MM-dd') : '';
  const walk = (f, kind, out, depth) => {
    const fi = f.getFiles(); while (fi.hasNext()) { const x = fi.next(); if (x.isTrashed && x.isTrashed()) continue; out.push({ name: x.getName(), url: x.getUrl(), kind: kind, date: (/^(\d{4}-\d{2}-\d{2})/.exec(x.getName()) || [])[1] || fmt(x.getDateCreated()) }); }
    const di = f.getFolders(); while (di.hasNext()) { const d = di.next(), n = d.getName();
      if (/^_munka/i.test(n)) continue;
      if (/^\d{4}$/.test(n) && depth < 3) walk(d, kind, out, depth + 1);
      else out.push({ name: n, url: d.getUrl(), kind: kind, folder: true, date: (/^(\d{4}-\d{2}-\d{2})/.exec(n) || [])[1] || fmt(d.getDateCreated()) }); }
  };
  const docs = [], sub = f.getFolders();
  while (sub.hasNext()) { const d = sub.next(), n = d.getName(); if (/^Szerződések$/i.test(n)) walk(d, 'sz', docs, 0); else if (/^Keretszerződés/i.test(n)) walk(d, 'keret', docs, 0); }
  docs.sort((x, y) => String(y.date).localeCompare(String(x.date)));
  return docs;
}
/** Gyors frissítés: csak az adott ügyfél mappáját olvassa újra, a többi a gyorsítótárból jön (a teljes bejárás lassú). */
function clientDocsRefresh_(client) {
  const res = clientDocs_({}), cf = client ? clientFolder_(client) : null;
  if (!cf) return res;
  const ent = { name: cf.getName(), url: cf.getUrl(), docs: clientDocsOf_(cf) }, i = (res.folders || []).findIndex(x => x.url === ent.url || x.name === ent.name);
  res.folders = res.folders || []; if (i >= 0) res.folders[i] = ent; else res.folders.push(ent); res.at = Date.now();
  const js = JSON.stringify(res); try { CacheService.getScriptCache().put('clientDocs_v2', js, 21600); } catch (e) { } try { bigPut_('CLIENT_DOCS', js); } catch (e) { }
  return res;
}
function clientDocs_(a) {
  const cache = CacheService.getScriptCache(), key = 'clientDocs_v2';
  if (!(a && a.force)) { const c = cache.get(key) || bigGet_('CLIENT_DOCS'); if (c) { try { return JSON.parse(c); } catch (e) { } } }
  const root = lumosRoot_(); if (!root) return { folders: [] };
  const base = findFolder_(root, '02 Ügyfelek'); if (!base) return { folders: [] };
  const out = [], it = base.getFolders();
  while (it.hasNext()) { const f = it.next(); out.push({ name: f.getName(), url: f.getUrl(), docs: clientDocsOf_(f) }); }
  const res = { folders: out, at: Date.now() }, js = JSON.stringify(res);
  try { cache.put(key, js, 21600); } catch (e) { }
  try { bigPut_('CLIENT_DOCS', js); } catch (e) { }
  return res;
}
/* Helyszínkereső: Google geokódoló (a cégek, intézmények angol vagy magyar nevét is ismeri); 6 órás gyorsítótár */
function geoSearch_(a) {
  const q = str_(a && a.q, 160); if (q.length < 3) return { items: [] };
  const c = CacheService.getScriptCache(), key = 'geo_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, q.toLowerCase()));
  const hit = c.get(key); if (hit) return JSON.parse(hit);
  let items = [];
  try {
    const r = Maps.newGeocoder().setRegion('hu').setLanguage('hu').setBounds(45.7, 16.1, 48.6, 22.9).geocode(q);
    items = (r && r.results || []).slice(0, 5).map(x => {
      const poi = (x.address_components || []).find(k => (k.types || []).some(t => t === 'point_of_interest' || t === 'establishment' || t === 'premise'));
      const addr = String(x.formatted_address || '').replace(/,\s*Magyarország$/, '');
      return poi && addr.indexOf(poi.long_name) < 0 ? poi.long_name + ', ' + addr : addr;
    }).filter(Boolean);
  } catch (e) { items = []; }
  const out = { items: items };
  try { c.put(key, JSON.stringify(out), 21600); } catch (e) { }
  return out;
}
/* ===== Teljesítésigazolás (TIG) =====
   Az ügyfél adott havi munkáit összegző PDF a megszokott formában; az ügyfél mappájába kerül: 02 Ügyfelek / <ügyfél> / Teljesítésigazolások / <év>. */
const TIG_ISSUERS_ = {
  kft: { name: 'Lumos Motion Kft.', seat: '1136 Budapest, Tátra utca 20/B 3/5', tax: '32701573-2-41', rep: 'Egri Ervin, ügyvezető', code: 'KFT' },
  ev: { name: 'Egri Ervin E.V.', seat: '1136 Budapest, Tátra utca 20/B 3/5', tax: '92286571-1-41', rep: 'Egri Ervin', code: 'EV' }
};
function tigCreate_(u, a) {
  a = a || {};
  const h = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const ft = n => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' Ft + ÁFA';
  const client = str_(a.client, 160); if (client.length < 2) throw new Error('Válaszd ki az ügyfelet.');
  const month = /^\d{4}-\d{2}$/.test(String(a.month || '')) ? String(a.month) : ''; if (!month) throw new Error('Hiányzik a hónap.');
  const iss = TIG_ISSUERS_[a.issuer === 'ev' ? 'ev' : 'kft'];
  const rows = (Array.isArray(a.rows) ? a.rows : []).slice(0, 80).map(r => ({ period: str_(r.period, 60), task: str_(r.task, 300), link: /^https:\/\//i.test(String(r.link || '')) ? str_(r.link, 500) : '', amount: Math.round(Number(r.amount) || 0), pid: str_(r.pid, 64) })).filter(r => r.task);
  if (!rows.length) throw new Error('Legalább egy tétel kell.');
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const MN = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'];
  const mLabel = month.slice(0, 4) + ' ' + MN[Number(month.slice(5, 7)) - 1];
  const kelt = iso_(a.date) || today_();
  const cSeat = str_(a.clientAddress, 300).replace(/[.;,\s]+$/, ''), cTax = str_(a.clientTax, 20), cRep = str_(a.clientRep, 120);
  const html = '<html><head><meta charset="utf-8"><style>body{font-family:Georgia,"Times New Roman",serif;font-size:11pt;color:#222;margin:36px 48px}'
    + '.top{font-size:8pt;color:#777;border-bottom:2px solid #8a1c1c;padding-bottom:4px;margin-bottom:28px}h1{text-align:center;font-size:20pt;margin:0 0 4px}.sub{text-align:center;font-size:10pt;margin-bottom:22px}'
    + 'p{text-align:justify;line-height:1.55}table{border-collapse:collapse;width:100%;margin:8px 0 18px;font-size:10pt}th,td{border:1px solid #444;padding:5px 7px;vertical-align:middle}th{background:#f2f2f2}td.c{text-align:center}td.r{text-align:right;white-space:nowrap}'
    + 'a{color:#1a4fa0}.sig{margin-top:56px;width:100%;border:0}.sig td{border:0;width:50%;text-align:center;padding-top:6px;font-size:10pt}.sig .ln{border-top:1px solid #444;width:70%;margin:0 auto 4px}.small{font-size:8pt;color:#555}</style></head><body>'
    + '<div class="top">' + h(client) + ' – ' + h(iss.name) + ' – Teljesítés igazolás</div>'
    + '<h1>Teljesítés Igazolás</h1><div class="sub">' + h(client) + ' – ' + h(iss.name) + ' – TIG – ' + h(mLabel) + '</div>'
    + '<p>E jegyzőkönyv rögzíti, hogy a <b>' + h(client) + '</b> Megrendelő' + ((cSeat || cTax) ? ' (' + [cSeat ? 'székhely: ' + h(cSeat) : '', cTax ? 'adószám: ' + h(cTax) : ''].filter(String).join('; ') + ')' : '') + ' által, <b>' + h(iss.name) + '</b> (székhely: ' + h(iss.seat) + '; adószám: ' + h(iss.tax) + ') szolgáltatási feladatok maradéktalanul teljesültek. A megrendelő a hiánytalan és pontos teljesítést elismeri.</p>'
    + '<p><b>Elvégzett feladatok:</b></p><table><tr><th>Időszak</th><th>Feladat</th><th>Díjazás</th></tr>'
    + rows.map(r => '<tr><td class="c">' + h(r.period) + '</td><td class="c">' + h(r.task) + (r.link ? '<br><a href="' + h(r.link) + '">' + h(r.link) + '</a>' : '') + '</td><td class="r">' + ft(r.amount) + '</td></tr>').join('')
    + '<tr><td></td><td class="r"><b>Díjazás összesen:</b></td><td class="r"><b>' + ft(total) + '</b></td></tr></table>'
    + '<p>Teljesítéskor: fizetendő, a számla átvételétől számított 8 naptári napon belül.</p><p>Kelt: Budapest, ' + h(kelt.replace(/-/g, '.')) + '</p>'
    + '<table class="sig"><tr><td><div class="ln"></div>' + h(iss.name) + '<div class="small">Képviseli: ' + h(iss.rep) + '<br><b>Szolgáltató</b></div></td><td><div class="ln"></div>' + h(client) + '<div class="small">' + (cRep ? 'Képviseli: ' + h(cRep) + '<br>' : '') + '<b>Megrendelő</b></div></td></tr></table>'
    + '</body></html>';
  if (a.preview) return { html: html, total: total };   // előnézet: fájl nélkül
  const pdf = Utilities.newBlob(html, 'text/html', 'tig.html').getAs('application/pdf');
  const cf = clientFolder_(client); if (!cf) throw new Error('Még nincs beállítva a főmappa.');
  const folder = folderPath_(cf, 'Teljesítésigazolások/' + month.slice(0, 4), {});
  const name = uniqueName_(folder, shortName_(iss.name).replace(/-E-V$/, '-EV') + '-' + shortName_(client) + '_TIG_' + month + '.pdf');   // pl. Lumos-Motion-Kulcsár-Akadémia_TIG_2026-10.pdf
  const f = folder.createFile(pdf.setName(name));
  try { CacheService.getScriptCache().remove('clientDocs_v2'); } catch (e) { }
  const rec = { id: Utilities.getUuid(), client: client, month: month, issuer: a.issuer === 'ev' ? 'ev' : 'kft', projectIds: rows.map(r => r.pid).filter(String).filter((x, i, l) => l.indexOf(x) === i).join(','),
    rows: JSON.stringify(rows), total: total, url: f.getUrl(), fileId: f.getId(), fileName: name, status: 'kiallitva', approvedAt: '', invoiceNo: '', createdAt: now_(), createdBy: u.name, clientAddress: cSeat, clientTax: cTax };
  withLock_(() => { putRow_('finTig', sheetFor_('finTig'), rec, 0); dataBump_(); dbFlush_(); });
  logEvent_(u, 'Teljesítésigazolás', client, mLabel + ' · ' + rows.length + ' tétel · ' + total + ' Ft');
  return Object.assign(finPart_(['tigs']), { url: f.getUrl(), name: name, total: total, tig: rec });
}
/** TIG elküldése e-mailben a PDF-fel (a küldő a bejelentkezett felhasználó, ha a címe álnévként be van állítva). a: {id, to, cc, subject, text} */
/** A kiküldött (jóváhagyásra váró) TIG-ekre érkezett válaszok a Gmailből: ki, mikor, mit írt, és jóváhagyásnak tűnik-e. */
function tigReplies_(u) {
  const out = {}, me = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  readAll_('finTig').filter(t => t.status === 'kikuldve' && t.sentAt && t.sentTo).slice(0, 15).forEach(t => {
    const addrs = String(t.sentTo).split(/[,;]\s*/).map(x => x.trim().toLowerCase()).filter(x => /@/.test(x)); if (!addrs.length) return;
    const d = String(t.sentAt).slice(0, 10).replace(/-/g, '/');
    let threads = []; try { threads = GmailApp.search('from:(' + addrs.join(' OR ') + ') after:' + d + ' (teljesítésigazolás OR TIG OR jóváhagy)', 0, 8); } catch (e) { return; }
    let best = null;
    threads.forEach(th => th.getMessages().forEach(m => {
      const from = String(m.getFrom() || ''), fe = (/<([^>]+)>/.exec(from) || [, from])[1].trim().toLowerCase();
      if (fe === me || addrs.indexOf(fe) < 0) return;
      const dt = m.getDate(); if (Utilities.formatDate(dt, SHEET_TZ, 'yyyy-MM-dd HH:mm:ss') < String(t.sentAt)) return;
      if (best && best.dt > dt) return;
      const body = String(m.getPlainBody() || '').split(/\n\s*(?:>|On .+wrote:|.+ ezt írta|-----Original|Feladó:|From:)/)[0].replace(/\s+/g, ' ').trim().slice(0, 300);
      best = { dt: dt, from: from.replace(/<[^>]+>/, '').replace(/"/g, '').trim() || fe, at: Utilities.formatDate(dt, SHEET_TZ, 'yyyy-MM-dd HH:mm'), text: body,
        approve: /jóváhagy|rendben|elfogad|egyetért|mehet|oké|\bok\b|aláír|köszön/i.test(body) && !/nem (fogad|hagy)|javít|hibá|módosít/i.test(body) };
    }));
    if (best) { delete best.dt; out[t.id] = best; }
  });
  return out;
}
function tigSend_(u, a) {
  a = a || {};
  const t = readAll_('finTig').find(x => x.id === str_(a.id, 64)); if (!t) throw new Error('A teljesítésigazolás nem található.');
  const okMail = s => String(s || '').split(/[,;]\s*/).map(x => x.trim()).filter(Boolean);
  const to = okMail(a.to), cc = okMail(a.cc);
  if (!to.length) throw new Error('Add meg a címzettet.');
  if (!to.concat(cc).every(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))) throw new Error('Hibás e-mail-cím.');
  const fid = t.fileId || ((/\/d\/([\w-]{20,})/.exec(String(t.url || '')) || [])[1]);
  if (!fid) throw new Error('Nem található a TIG PDF-je a Drive-ban.');
  const pdf = DriveApp.getFileById(fid).getBlob().setName(t.fileName || 'TIG.pdf');
  const text = str_(a.text, 5000), sig = signatureFor_(u), esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.5">' + esc(text).replace(/\n/g, '<br>') + '</div>' + (sig ? '<br>' + sig.html : '');
  const opts = mailOptsFor_(u, html); delete opts.__actor; opts.attachments = [pdf]; if (cc.length) opts.cc = cc.join(',');
  GmailApp.sendEmail(to.join(','), subj_(str_(a.subject, 200) || 'Teljesítésigazolás'), text + (sig ? '\n\n' + sig.text : ''), opts);
  withLock_(() => { tigMark_(t.id, Object.assign({ sentAt: now_(), sentTo: to.concat(cc).join(', ') }, t.status === 'kiallitva' ? { status: 'kikuldve' } : {})); dbFlush_(); });
  logEvent_(u, 'Teljesítésigazolás', t.client, 'E-mailben elküldve: ' + to.join(', '));
  return finPart_(['tigs']);
}
/** TIG állapotának módosítása (zárolás alatt hívandó). */
function tigMark_(id, patch) { const sh = sheetFor_('finTig'), row = findRow_(sh, id); if (!row) return; const r = readRow_('finTig', sh, row); Object.assign(r, patch); putRow_('finTig', sh, r, row); dataBump_(); }
/** a: {id, action: 'approve' | 'unapprove' | 'delete'} */
function tigSave_(u, a) {
  const id = str_(a && a.id, 64), act = String(a && a.action || '');
  withLock_(() => {
    const sh = sheetFor_('finTig'), row = findRow_(sh, id); if (!row) throw new Error('A teljesítésigazolás nem található.');
    const r = readRow_('finTig', sh, row);
    if (act === 'delete') { if (r.status === 'szamlazva') throw new Error('Már kiállítottál számlát erre a TIG-re.'); sh.deleteRow(row); }
    else if (act === 'approve') { if (r.status !== 'szamlazva') { r.status = 'jovahagyva'; r.approvedAt = today_(); putRow_('finTig', sh, r, row); } }
    else if (act === 'unapprove') { if (r.status === 'jovahagyva') { r.status = 'kikuldve'; r.approvedAt = ''; putRow_('finTig', sh, r, row); } }
    else if (act === 'send') { if (r.status === 'kiallitva' || !r.status) { r.status = 'kikuldve'; putRow_('finTig', sh, r, row); } }
    else if (act === 'unsend') { if (r.status === 'kikuldve') { r.status = 'kiallitva'; putRow_('finTig', sh, r, row); } }
    else throw new Error('Ismeretlen művelet.');
    dataBump_(); dbFlush_();
    logEvent_(u, 'Teljesítésigazolás', r.client, (act === 'delete' ? 'Törölve (a PDF megmarad): ' : act === 'approve' ? 'Jóváhagyva: ' : act === 'send' ? 'Elküldve: ' : act === 'unsend' ? 'Elküldés visszavonva: ' : 'Jóváhagyás visszavonva: ') + r.month);
  });
  return finPart_(['tigs']);
}
/** Ügyfél szerződésének törlése: a Drive-fájl a kukába kerül (30 napig visszaállítható), a hivatkozások lekerülnek a projektekről / keretszerződésből.
    Csak olyan fájl törölhető, amely az ügyfélmappák szerződései között szerepel, vagy az app rögzítette. a: {url} */
/** Ügyfélszerződés feltöltése a választott módon: keretszerződésként (fwSave_) vagy egyéb szerződésként (02 Ügyfelek / <ügyfél> / Szerződések / <év>).
 *  replace: egy meglévő szerződés (Drive-fájl) helyett – a rá mutató hivatkozások az újra állnak át, a régi fájl a Drive kukába kerül. */
function clientDocUpload_(u, a) {
  a = a || {};
  const client = str_(a.client, 160).replace(/\s+/g, ' '); if (client.length < 2) throw new Error('Hiányzik az ügyfél neve.');
  const b64 = String(a.b64 || ''); if (!b64) throw new Error('Nincs feltöltendő fájl.'); if (b64.length > 14 * 1024 * 1024) throw new Error('A fájl legfeljebb 10 MB lehet.');
  const did = x => (/[-\w]{25,}/.exec(String(x || '')) || [])[0] || '', rep = did(a.replace);
  if (rep) { const fw = readAll_('finFramework').some(r => r.fileId === rep || did(r.url) === rep), bl = readAll_('finBilling').some(r => r.contractFileId === rep || did(r.contractUrl) === rep);
    if (!fw && !bl && !(clientDocs_({}).folders || []).some(f => (f.docs || []).some(d => !d.folder && did(d.url) === rep))) throw new Error('A lecserélendő fájl nem szerepel az ügyfél szerződései között.'); }
  let newId = '', newUrl = '';
  const name = str_(a.name, 150).replace(/[\\/]/g, '-') || 'szerzodes.pdf';
  if (a.plain) {   // kísérőfájl (pl. a szerződés szerkeszthető .docx változata): csak a mappába kerül, nyilvántartás nélkül, a megadott néven
    const mime = /^[\w.+-]+\/[\w.+-]+$/.test(String(a.mime || '')) ? String(a.mime) : 'application/octet-stream';
    const cf = clientFolder_(client); if (!cf) throw new Error('Az ügyfél mappája nem található.');
    const folder = folderPath_(cf, 'Szerződések/' + today_().slice(0, 4), {});
    const f = folder.createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime, uniqueName_(folder, name)));
    return { ok: true, url: f.getUrl(), id: f.getId(), name: f.getName() };
  }
  if (a.kind === 'keret') {
    fwSave_(u, { client: client, b64: b64, name: name, mime: a.mime });
    const r = readAll_('finFramework').find(x => String(x.client).trim().toLowerCase() === client.toLowerCase()); newId = r ? r.fileId : ''; newUrl = r ? r.url : '';
  } else {
    const mime = /^[\w.+-]+\/[\w.+-]+$/.test(String(a.mime || '')) ? String(a.mime) : 'application/octet-stream', ext = (/\.[a-z0-9]{2,5}$/i.exec(name) || ['.pdf'])[0];
    const cf = clientFolder_(client); if (!cf) throw new Error('Az ügyfél mappája nem található.');
    const folder = folderPath_(cf, 'Szerződések/' + today_().slice(0, 4), {});
    const f = folder.createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime, uniqueName_(folder, today_() + '_' + shortName_(client) + '_szerzodes_KFT' + ext)));
    newId = f.getId(); newUrl = f.getUrl();
  }
  let trashed = false;
  if (rep && newId && rep !== newId) {
    withLock_(() => {
      const fsh = sheetFor_('finFramework');
      readAll_('finFramework').filter(r => r.fileId === rep || did(r.url) === rep).forEach(r => { const row = findRow_(fsh, r.id); if (!row) return; const x = readRow_('finFramework', fsh, row); Object.assign(x, { url: newUrl, fileId: newId, fileName: name }); putRow_('finFramework', fsh, x, row); });
      const bsh = sheetFor_('finBilling');
      readAll_('finBilling').filter(r => r.contractFileId === rep || did(r.contractUrl) === rep).forEach(r => { const row = findRow_(bsh, r.id); if (!row) return; const x = readRow_('finBilling', bsh, row); Object.assign(x, { contractUrl: newUrl, contractFileId: newId, contractName: name, contractAt: now_(), contractBy: u.name, updatedAt: now_(), updatedBy: u.name }); putRow_('finBilling', bsh, x, row); });
      dbFlush_();
    });
    try { DriveApp.getFileById(rep).setTrashed(true); trashed = true; } catch (e) { }
  }
  const docs = clientDocsRefresh_(client);
  logEvent_(u, 'Szerződés feltöltve', client, (a.kind === 'keret' ? 'keretszerződés' : 'szerződés') + (rep ? ' – a korábbi helyett' + (trashed ? ' (a régi a Drive kukába került)' : '') : ''));
  return Object.assign(finPart_(['frameworks', 'billing']), { folders: docs.folders, at: docs.at, replaced: !!rep, trashed: trashed });
}
function clientDocDelete_(u, a) {
  const raw = str_(a && a.url, 500), id = (/[-\w]{25,}/.exec(raw) || [])[0];
  if (!id) throw new Error('Ismeretlen fájl.');
  const did = x => (/[-\w]{25,}/.exec(String(x || '')) || [])[0] || '';
  let known = false, name = '';
  withLock_(() => {
    const fsh = sheetFor_('finFramework');
    readAll_('finFramework').filter(r => r.fileId === id || did(r.url) === id).forEach(r => { known = true; name = name || r.client; const row = findRow_(fsh, r.id); if (row) fsh.deleteRow(row); });
    const bsh = sheetFor_('finBilling');
    readAll_('finBilling').filter(r => r.contractFileId === id || did(r.contractUrl) === id).forEach(r => { known = true; const row = findRow_(bsh, r.id); if (!row) return;
      const x = readRow_('finBilling', bsh, row); Object.assign(x, { contractUrl: '', contractFileId: '', contractName: '', contractAt: '', contractBy: '', updatedAt: now_(), updatedBy: u.name }); putRow_('finBilling', bsh, x, row); });
    dbFlush_();
  });
  if (!known && a && a.client) { const cf = clientFolder_(str_(a.client, 160)); known = !!cf && clientDocsOf_(cf).some(d => !d.folder && did(d.url) === id); }   // gyors: csak az ügyfél saját mappája
  if (!known) { const docs = clientDocs_({}); known = (docs.folders || []).some(f => (f.docs || []).some(d => !d.folder && did(d.url) === id)); }
  if (!known) throw new Error('Ez a fájl nem szerepel az ügyfelek szerződései között.');
  let trashed = false;
  try { const f = DriveApp.getFileById(id); name = f.getName(); f.setTrashed(true); trashed = true; } catch (e) { }
  const docs = a && a.client ? clientDocsRefresh_(str_(a.client, 160)) : clientDocs_({});
  logEvent_(u, 'Szerződés törölve', name, trashed ? 'A Drive-fájl a kukába került' : 'Csak a hivatkozás került le');
  return Object.assign(finPart_(['frameworks', 'billing']), { folders: docs.folders, at: docs.at, trashed: trashed });
}
function fwDelete_(u, a) {
  withLock_(() => { const sh = sheetFor_('finFramework'), row = findRow_(sh, str_(a && a.id, 64)); if (!row) throw new Error('A keretszerződés nem található.'); const r = readRow_('finFramework', sh, row); sh.deleteRow(row); dbFlush_(); logEvent_(u, 'Keretszerződés törölve', r.client, 'a Drive-fájl megmarad'); });
  return finPart_(['frameworks']);
}



/* ===== Számlatörténet ügyfelenként: az összes számla a számlázz.hu-ból (sorszám szerint végigkérdezve, darabokban) =====
 * Tárolás: bigPut_('SZ_HIST') = { inv: {sorszám: [kelt, vevő, adószám, cím, nettó, bruttó, tételek, típus, e-mail]}, pos: {"LUMOS-2025": {n, done}} } */
const SZ_HIST_PREFIXES_ = ['LUMOS', 'E-LUMOS'], SZ_HIST_FROM_ = 2021;
function szHistLoad_() { try { const h = JSON.parse(bigGet_('SZ_HIST') || '{}'); h.inv = h.inv || {}; h.pos = h.pos || {}; return h; } catch (e) { return { inv: {}, pos: {} }; } }
function szHistScan_(u, a) {
  const key = szNeedKey_(), h = szHistLoad_(), started = Date.now(), y0 = Number(today_().slice(0, 4)), B = 20;
  if (a && a.reset) { h.inv = {}; h.pos = {}; }
  const req = no => { const payload = {}; payload['action-szamla_agent_xml'] = Utilities.newBlob(szXmlHead_('xmlszamlaxml', 'agentxml') + szEl_('szamlaagentkulcs', key) + szEl_('szamlaszam', no) + szEl_('pdf', 'false') + '</xmlszamlaxml>', 'text/xml', 'request.xml');
    return { url: SZAMLAZZ_URL, method: 'post', muteHttpExceptions: true, payload: payload }; };
  let partial = false;
  outer: for (const pf of SZ_HIST_PREFIXES_) for (let y = y0; y >= SZ_HIST_FROM_; y--) {
    const k = pf + '-' + y, st = h.pos[k] || (h.pos[k] = { n: 1, done: false, found: 0 });
    if (st.done && y < y0) continue;   // a folyó év mindig újra megnézi a végét (új számlák)
    let miss = 0; st.done = false;
    while (true) {
      if (Date.now() - started > 22000) { partial = true; break outer; }
      const nos = []; for (let i = 0; i < B; i++) nos.push(k + '-' + (st.n + i));
      let res; try { res = UrlFetchApp.fetchAll(nos.map(req)); } catch (e) { partial = true; break outer; }
      let last = -1;
      for (let i = 0; i < nos.length; i++) {
        const hd = res[i].getAllHeaders ? res[i].getAllHeaders() : res[i].getHeaders(), err = Object.keys(hd || {}).some(x => x.toLowerCase() === 'szlahu_error_code');
        let r = null; if (!err && res[i].getResponseCode() === 200) { try { r = szParseQuery_(res[i].getContentText('UTF-8'), nos[i], false); } catch (e) { r = null; } }
        if (r) { h.inv[r.no || nos[i]] = [r.date, r.buyer, r.buyerTax || '', r.buyerAddr || '', r.invNet, r.invGross, (r.itemNames || []).join(' · ').slice(0, 300), r.kind, r.buyerEmail || '']; st.found++; last = i; miss = 0; }
        else miss++;
      }
      if (last >= 0) st.n += last + 1; else st.n += 0;
      if (last < 0 || miss >= 3) { st.done = true; break; }   // 3 egymás utáni hiány (vagy egy üres köteg): vége a sorozatnak
    }
  }
  h.at = now_(); h.full = !partial;
  bigPut_('SZ_HIST', JSON.stringify(h));
  return { partial: partial, count: Object.keys(h.inv).length, pos: h.pos };
}
const clNorm2_ = v => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/["'„”.,]/g, ' ').replace(/\b(kft|zrt|bt|nyrt|kht|nonprofit|egyesulet|alapitvany|ev)\b/g, ' ').replace(/\s+/g, ' ').trim();
const tax8_ = v => String(v || '').replace(/\D/g, '').slice(0, 8);
/** A számlatörténet vevői, a hozzájuk tartozó ügyféllel (adószám, majd név szerint). */
function szHistBuyers_() {
  const h = szHistLoad_(), cls = readAll_('clients'), out = {};
  Object.keys(h.inv).forEach(no => { const v = h.inv[no], key = tax8_(v[2]) || 'n:' + clNorm2_(v[1]);
    const o = out[key] || (out[key] = { name: v[1], tax: v[2], addr: v[3], email: v[8] || '', count: 0, net: 0, last: '' });
    o.count++; o.net += Number(v[4]) || 0; if (v[0] > o.last) { o.last = v[0]; o.name = v[1]; o.addr = v[3] || o.addr; o.tax = v[2] || o.tax; } });
  return Object.keys(out).map(k => { const o = out[k], c = cls.find(x => (tax8_(o.tax) && tax8_(x.tax) === tax8_(o.tax)) || clNorm2_(x.name) === clNorm2_(o.name)); return Object.assign(o, { clientId: c ? c.id : '', client: c ? c.name : '' }); })
    .sort((x, y) => y.net - x.net);
}
/** Egy ügyfél számlái (számlázz.hu-történet + az appban rögzítettek, pl. E.V.), projekttel vagy a tételek nevével. a: {name} */
function clientInvoices_(a) {
  const name = str_(a && a.name, 160).trim(); if (!name) return { items: [] };
  const c = readAll_('clients').find(x => String(x.name || '').trim().toLowerCase() === name.toLowerCase()) || { name: name, tax: '' };
  const t8 = tax8_(c.tax), nn = clNorm2_(c.name), mine = (buyer, tax) => (t8 && tax8_(tax) === t8) || clNorm2_(buyer) === nn;
  const h = szHistLoad_(), app = readAll_('finInvoice'), byNo = {}; app.forEach(x => { byNo[x.no] = x; });
  const pn = {}, pc = {}; readAll_('projects').forEach(p => { pn[p.id] = p.name; pc[p.id] = String(p.client || '').trim().toLowerCase(); });
  const projOf = x => x ? invTargets_(x).map(t => pn[t.projectId]).filter(Boolean) : [];
  const items = [];
  Object.keys(h.inv).forEach(no => { const v = h.inv[no]; if (!mine(v[1], v[2])) return; const ax = byNo[no];
    items.push({ no: no, date: v[0], net: Number(v[4]) || 0, gross: Number(v[5]) || 0, kind: v[7], projects: projOf(ax), what: v[6] }); });
  app.forEach(x => { if (h.inv[x.no] || x.kind === 'dijbekero' || x.kind === 'storno') return; if (!mine(x.buyer, '') && !invTargets_(x).some(t => pc[t.projectId] === name.toLowerCase())) return;
    items.push({ no: x.no, date: x.date, net: Number(x.invNet) || 0, gross: Number(x.invGross) || 0, kind: x.kind, projects: projOf(x), what: (() => { try { const l = JSON.parse(x.items || '[]'); return Array.isArray(l) ? l.map(i => i && i.name).filter(Boolean).join(' · ') : String(x.items || ''); } catch (e) { return String(x.items || ''); } })() }); });
  items.sort((x, y) => String(y.date).localeCompare(String(x.date)));
  return { items: items, total: items.reduce((s2, x) => s2 + x.net, 0), at: h.at || '', full: !!h.full };
}

/** A kiállított számla / díjbekérő kiküldése a Lumos címéről (a számlázz.hu helyett), PDF melléklettel. (Ervin, 2026-11-14) */
function szInvoiceMail_(u, o) {
  let b64 = o.pdfB64;
  if (!b64) { const q = szQuery_(o.no, true); b64 = q && q.pdf; }
  if (!b64) throw new Error('A számlázz.hu nem adta vissza a PDF-et – a levél nem ment ki.');
  const blob = Utilities.newBlob(Utilities.base64Decode(b64), 'application/pdf', String(o.no).replace(/[^\w.-]+/g, '_') + '.pdf');
  const label = SZ_KIND_LABEL_[o.kind] || 'Számla', lbl = label.toLowerCase();
  const p = o.projectId ? readAll_('projects').find(x => x.id === o.projectId) : null, pn = p ? String(p.name || '') : '';
  const ft = n => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' Ft';
  const dd = String(o.due || '').replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1. $2. $3.');
  const lines = ['Tisztelt Partnerünk!', '', 'Csatoltan küldjük ' + huArt_(o.no) + ' ' + o.no + ' számú ' + ({ szamla: 'számlát', dijbekero: 'díjbekérőt', eloleg: 'foglalószámlát', vegszamla: 'végszámlát' }[o.kind] || lbl + 'ot') + (pn ? ' (' + pn + ')' : '') + '.', '',
    'Fizetendő: ' + ft(o.gross) + ' (bruttó)', 'Fizetési határidő: ' + dd, 'Fizetési mód: ' + (o.payMethod || ''), '', 'Ha bármi kérdés felmerül, válaszoljon erre a levélre.', '', 'Üdvözlettel,'];
  const sig = signatureFor_(u), text = lines.join('\n') + (sig ? '\n\n' + sig.text : '');
  const html = '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55">' + lines.map(l => escapeHtml_(l)).join('<br>') + '</div>' + (sig ? '<br>' + sig.html : '');
  const subj = label + ' – ' + o.no + (pn ? ' – ' + pn : '') + ' – Lumos Motion';
  const ok = gmailSend_(o.buyer.email.split(/[;]\s*/).join(','), subj, text, { htmlBody: html, attachments: [blob], name: (u && u.name ? u.name + ' · ' : '') + 'Lumos Motion', replyTo: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(u && u.email || '')) ? u.email : undefined }, 'invoice');
  if (!ok) throw new Error('Az e-mail-küldés szünetel – a levél nem ment ki.');
  return { ok: true, to: o.buyer.email };
}
