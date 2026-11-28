'use strict';

const MNB_RATES_URL = 'https://www.mnb.hu/arfolyamok';
const MONTHS = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];

function readMnbEur(html, cur = 'EUR') {
  // A napi árfolyamtáblából ugyanahhoz a jegyzéshez olvassuk ki a dátumot és az EUR sort.
  const table = /<caption\b[^>]*>\s*Napi árfolyamok:\s*(\d{4})\.\s*([^\s<]+)\s+(\d{1,2})\.[^<]*<\/caption>([\s\S]*?)<\/table>/iu.exec(html);
  if (!table) return null;
  const [, year, monthName, day, rows] = table;
  const month = MONTHS.indexOf(monthName.toLowerCase()) + 1;
  const eur = new RegExp('<tr\\b[^>]*>\\s*<td\\b[^>]*>\\s*' + cur + '\\s*<\\/td>\\s*<td\\b[^>]*>[^<]*<\\/td>\\s*<td\\b[^>]*>\\s*1\\s*<\\/td>\\s*<td\\b[^>]*>\\s*(\\d+(?:[,.]\\d{1,2})?)\\s*<\\/td>', 'iu').exec(rows);
  if (!month || !eur) return null;
  const date = year + '-' + String(month).padStart(2, '0') + '-' + day.padStart(2, '0');
  const parsed = new Date(date);
  const rate = Number(eur[1].replace(',', '.'));
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || rate <= 0 || rate > 1000000) return null;
  return { rate, date };
}

/* tartalék: az MNB hivatalos SOAP-szolgáltatása (ha a weboldal nem érhető el / megváltozott) */
async function soapRate(cur) {
  const body = '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><GetCurrentExchangeRates xmlns="http://www.mnb.hu/webservices/"/></soap:Body></soap:Envelope>';
  const r = await fetch('https://www.mnb.hu/arfolyamok.asmx', { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '"http://www.mnb.hu/webservices/MNBArfolyamServiceSoap/GetCurrentExchangeRates"' }, body, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  const x = (await r.text()).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  const day = /<Day date="(\d{4}-\d{2}-\d{2})">([\s\S]*?)<\/Day>/.exec(x); if (!day) return null;
  const m = new RegExp('<Rate unit="(\\d+)" curr="' + cur + '">([\\d,.]+)<\\/Rate>').exec(day[2]); if (!m) return null;
  const rate = Number(m[2].replace(',', '.')) / Number(m[1] || 1);
  return rate > 0 && rate <= 1000000 ? { rate: Math.round(rate * 100) / 100, date: day[1] } : null;
}
async function pageRate(cur) {
  const upstream = await fetch(MNB_RATES_URL, { signal: AbortSignal.timeout(8000) });
  return upstream.ok ? readMnbEur(await upstream.text(), cur) : null;
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const send = (status, data) => { res.statusCode = status; res.end(JSON.stringify(data)); };
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return send(405, { error: 'GET' });
  }
  const cur = ['EUR', 'USD', 'GBP'].includes(String((req.query && req.query.c) || '').toUpperCase()) ? String(req.query.c).toUpperCase() : 'EUR';   // ?c=EUR|USD|GBP
  /* weboldal → (újra) weboldal → SOAP: egy-egy kiesés miatt ne kelljen várni */
  for (const get of [pageRate, pageRate, soapRate]) {
    try {
      const quote = await get(cur);
      if (quote) {
        res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
        return send(200, quote);
      }
    } catch (e) {
      console.warn('MNB ' + cur + '/HUF:', e.message);
    }
  }
  res.setHeader('Cache-Control', 'no-store');
  return send(502, { error: 'Az MNB-árfolyam lekérése sikertelen.' });
};
