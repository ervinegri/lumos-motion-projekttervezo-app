// számlázz.hu Online pénzügyi adatkapcsolat – fogadó végpont (banki tranzakciók, kimenő és bejövő számlák).
// A számlázz.hu nem követi az átirányítást (a Google Apps Script webapp 302-vel válaszol), ezért ez a Vercel-végpont fogadja
// a bizonylatot, továbbítja az Apps Scriptnek, és egyetlen HTTP 200 + XML választ ad. A kulcsot (X-Szamlazzhu-Key fejléc vagy
// ?key=) az Apps Script ellenőrzi; itt nincs titok.
const API_URL = process.env.LUMOS_API_URL || 'https://script.google.com/macros/s/AKfycbwM_dJllYQIIS9xyRWX68PFDChk6MMNv7BqcU-w2U3O_9LXlHi94VYZRrihClgmXfE/exec';
const RESP = { banktranz: 'banktranzvalasz', szamla: 'szamlavalasz', szamlabe: 'szamlabevalasz', nyugta: 'nyugtavalasz' };
const esc = s => String(s == null ? '' : s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
function reply(res, code, kind, id, hibakod) {
  const root = RESP[kind] || 'banktranzvalasz', ns = 'http://www.szamlazz.hu/' + root;
  const alap = kind && kind !== 'banktranz' && /^\d{1,9}$/.test(String(id || '')) ? '<alap><id>' + id + '</id></alap>' : '';   // az XSD szerint az id egész szám (és nem kötelező)
  res.statusCode = code; res.setHeader('Content-Type', 'application/xml; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
  res.end('<?xml version="1.0" encoding="UTF-8"?>\n<' + root + ' xmlns="' + ns + '">' + alap + (hibakod ? '<hibakod>' + hibakod + '</hibakod>' : '') + '</' + root + '>');
}
async function rawBody(req) {
  try { const b = req.body; if (typeof b === 'string' && b) return b; if (Buffer.isBuffer(b) && b.length) return b.toString('utf8');
    if (b && typeof b === 'object') { const v = Object.values(b).find(x => typeof x === 'string' && x.indexOf('<') >= 0); if (v) return v; } } catch (e) {}
  return await new Promise(resolve => { const ch = []; req.on('data', c => ch.push(c)); req.on('end', () => resolve(Buffer.concat(ch).toString('utf8'))); req.on('error', () => resolve('')); });
}
module.exports = async (req, res) => {
  if (req.method !== 'POST') return reply(res, 405);
  const raw = await rawBody(req);
  // a bizonylat XML-je: nyers törzs, űrlapmező vagy multipart rész – mindegyikből kivesszük a gyökérelemet
  const m = /<(?:[\w-]+:)?(banktranz|szamlabe|szamla|nyugta)[\s>][\s\S]*<\/(?:[\w-]+:)?\1>/.exec(raw || '');
  if (!m) return reply(res, 400);
  const kind = m[1], idm = kind === 'banktranz' ? null : /<(?:[\w-]+:)?alap[\s>][\s\S]*?<(?:[\w-]+:)?id>\s*([^<]*?)\s*</.exec(m[0]), id0 = idm ? idm[1] : '';
  const url = new URL(req.url, 'https://x');
  const key = String(req.headers['x-szamlazzhu-key'] || url.searchParams.get('key') || '').trim();
  try {
    const r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn: 'szData', args: [key, '<?xml version="1.0" encoding="UTF-8"?>' + m[0]] }), redirect: 'follow' });
    const j = await r.json();
    if (!j || !j.ok) { console.error('szdata: Apps Script hiba', kind, j && j.error); return reply(res, 500, kind, id0); }   // nem 200: a számlázz.hu később újraküldheti
    const d = j.data || {};
    return reply(res, 200, kind, d.id || id0, d.hibakod === 'KEY_ERR' ? 'KEY_ERR' : '');
  } catch (e) { console.error('szdata: továbbítási hiba', kind, e && e.message); return reply(res, 502, kind, id0); }
};
