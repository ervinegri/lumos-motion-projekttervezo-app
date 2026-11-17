// számlázz.hu Online pénzügyi adatkapcsolat – banki tranzakciók fogadása.
// A számlázz.hu nem követi az átirányítást (a Google Apps Script webapp 302-vel válaszol), ezért ez a Vercel-végpont fogadja
// a tételt, továbbítja az Apps Scriptnek, és egyetlen HTTP 200 + XML választ ad. A kulcsot (X-Szamlazzhu-Key fejléc vagy az
// URL végére fűzve) az Apps Script ellenőrzi; itt nincs titok.
const API_URL = process.env.LUMOS_API_URL || 'https://script.google.com/macros/s/AKfycbwM_dJllYQIIS9xyRWX68PFDChk6MMNv7BqcU-w2U3O_9LXlHi94VYZRrihClgmXfE/exec';
const NS = 'http://www.szamlazz.hu/banktranzvalasz';
const reply = (res, code, hibakod) => {
  res.statusCode = code; res.setHeader('Content-Type', 'application/xml; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
  res.end('<?xml version="1.0" encoding="UTF-8"?>\n<banktranzvalasz xmlns="' + NS + '">' + (hibakod ? '<hibakod>' + hibakod + '</hibakod>' : '') + '</banktranzvalasz>');
};
async function rawBody(req) {
  try { const b = req.body; if (typeof b === 'string' && b) return b; if (Buffer.isBuffer(b) && b.length) return b.toString('utf8');
    if (b && typeof b === 'object') { const v = Object.values(b).find(x => typeof x === 'string' && x.indexOf('<') >= 0); if (v) return v; } } catch (e) {}
  return await new Promise(resolve => { const ch = []; req.on('data', c => ch.push(c)); req.on('end', () => resolve(Buffer.concat(ch).toString('utf8'))); req.on('error', () => resolve('')); });
}
module.exports = async (req, res) => {
  if (req.method !== 'POST') return reply(res, 405);
  const raw = await rawBody(req);
  // a tétel XML-je: nyers törzs, űrlapmező vagy multipart rész – mindegyikből kivesszük a <banktranz …>…</banktranz> részt
  const m = /<(?:[\w-]+:)?banktranz[\s>][\s\S]*<\/(?:[\w-]+:)?banktranz>/.exec(raw || '');
  if (!m) return reply(res, 400);
  const url = new URL(req.url, 'https://x'), last = url.pathname.split('/').pop();
  const key = String(req.headers['x-szamlazzhu-key'] || url.searchParams.get('key') || (last && last !== 'szbank' ? last : '') || '').trim();
  try {
    const r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn: 'szBank', args: [key, '<?xml version="1.0" encoding="UTF-8"?>' + m[0]] }), redirect: 'follow' });
    const j = await r.json();
    if (!j || !j.ok) { console.error('szbank: Apps Script hiba', j && j.error); return reply(res, 500); }   // nem 200: a számlázz.hu később újraküldheti
    return reply(res, 200, j.data && j.data.hibakod === 'KEY_ERR' ? 'KEY_ERR' : '');
  } catch (e) { console.error('szbank: továbbítási hiba', e && e.message); return reply(res, 502); }
};
