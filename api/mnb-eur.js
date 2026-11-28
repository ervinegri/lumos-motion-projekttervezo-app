'use strict';

const MNB_RATES_URL = 'https://www.mnb.hu/arfolyamok';
const MONTHS = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];

function readMnbEur(html, cur = 'EUR') {
  // A napi árfolyamtáblából ugyanahhoz a jegyzéshez olvassuk ki a dátumot és az EUR sort.
  const table = /<caption\b[^>]*>\s*Napi árfolyamok:\s*(\d{4})\.\s*([^\s<]+)\s+(\d{1,2})\.[^<]*<\/caption>([\s\S]*?)<\/table>/iu.exec(html);
  if (!table) return null;
  const [, year, monthName, day] = table;
  /* a fő devizák (EUR, USD, CHF) az első táblában vannak, a többi (pl. GBP) a lap további tábláiban – a dátum az első tábla fejlécéből jön */
  const rows = html.slice(table.index);
  const month = MONTHS.indexOf(monthName.toLowerCase()) + 1;
  const eur = new RegExp('<tr\\b[^>]*>\\s*<td\\b[^>]*>\\s*' + cur + '\\s*<\\/td>\\s*<td\\b[^>]*>[^<]*<\\/td>\\s*<td\\b[^>]*>\\s*1\\s*<\\/td>\\s*<td\\b[^>]*>\\s*(\\d+(?:[,.]\\d{1,2})?)\\s*<\\/td>', 'iu').exec(rows);
  if (!month || !eur) return null;
  const date = year + '-' + String(month).padStart(2, '0') + '-' + day.padStart(2, '0');
  const parsed = new Date(date);
  const rate = Number(eur[1].replace(',', '.'));
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || rate <= 0 || rate > 1000000) return null;
  return { rate, date };
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
  /* a weboldal lekérése: egy-egy kiesésnél még kétszer újrapróbáljuk */
  for (const get of [pageRate, pageRate, pageRate]) {
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
