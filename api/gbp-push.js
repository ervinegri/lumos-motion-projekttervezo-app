// Google Cégprofil → azonnali értesítés új értékelésről (Google Cloud Pub/Sub push-feliratkozás ide küld).
// A Pub/Sub csak 2xx választ fogad el, az Apps Script webapp viszont 302-vel válaszol – ezért ez a végpont fogadja,
// továbbítja az Apps Scriptnek (az behúzza az új értékeléseket), és mindig 204-et ad. A ?t= kulcsot az Apps Script ellenőrzi; itt nincs titok.
const API_URL = process.env.LUMOS_API_URL || 'https://script.google.com/macros/s/AKfycbwM_dJllYQIIS9xyRWX68PFDChk6MMNv7BqcU-w2U3O_9LXlHi94VYZRrihClgmXfE/exec';
module.exports = async function (req, res) {
  if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
  const t = String((req.query && req.query.t) || '').slice(0, 100);
  if (t) {
    let type = '';
    try { const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); const d = b.message && b.message.data ? JSON.parse(Buffer.from(b.message.data, 'base64').toString('utf8')) : {}; type = String(d.notificationType || '').slice(0, 40); } catch (e) {}
    try { await fetch(API_URL + '?gbppush=' + encodeURIComponent(t) + '&type=' + encodeURIComponent(type), { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' }, redirect: 'follow', signal: AbortSignal.timeout(25000) }); } catch (e) {}
  }
  res.statusCode = 204; res.end();
};
