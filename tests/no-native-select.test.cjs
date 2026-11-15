/* Natív legördülő tiltása (CLAUDE.md): minden új <select> a kereshető legördülőt használja (data-cmb="…").
   A rejtett (hidden / display:none) segédlisták és a már meglévő, felsorolt kivételek megengedettek;
   bármely ÚJ natív <select> esetén a teszt elbukik. Kivételt csak indokkal vegyél fel a listába. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const ALLOW = new Set([
  // régebbi, még átalakítandó listák (fájl#azonosító)
  'billing.js#m-tigClient', 'billing.js#m-tigMonth', 'billing.js#imp-sel', 'billing.js#imp-kind',
  'finance.js#data-pair', 'finance.js#m-bank2', 'finance.js#it_vat', 'finance.js#m-issuer', 'finance.js#m-szClient', 'finance.js#m-invslot',
  'views-penzugy-vagas.js#pen-day', 'views-penzugy-vagas.js#lead-pick', 'views-penzugy-vagas.js#op-cutsel',
  // a kód kapcsolja a láthatóságát / belső segédlista
  'core.js#select', 'views-penzugy-vagas.js#add-crew-person'   // add-crew-person: actions-projekt-stab.js alakítja át (comboSelect)
]);
const keyOf = tag => {
  const m = /\bid="([^"$]+)/.exec(tag) || /\bname="([^"$]+)/.exec(tag) || /\bdata-(pair|imp|impk|pen-day)=/.exec(tag) || /\bclass="inp ([a-z-]+)/.exec(tag);
  if (!m) return 'select';
  return { imp: 'imp-sel', impk: 'imp-kind', pair: 'data-pair' }[m[1]] || m[1].replace(/_\$\{.*$/, '');
};
const bad = [];
fs.readdirSync(ROOT).filter(f => f.endsWith('.js') || f.endsWith('.html')).forEach(f => {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  (src.match(/<select\b[^>]*>/g) || []).forEach(tag => {
    if (/data-cmb/.test(tag) || /\bhidden\b|display:none/.test(tag)) return;
    const k = f + '#' + keyOf(tag);
    if (!ALLOW.has(k)) bad.push(k + '  ' + tag.slice(0, 120));
  });
});
if (bad.length) {
  console.error('FAIL natív <select> (használd: data-cmb="Helyőrző…"):\n  ' + bad.join('\n  '));
  process.exit(1);
}
console.log('PASS natív <select>: nincs új natív legördülő');
