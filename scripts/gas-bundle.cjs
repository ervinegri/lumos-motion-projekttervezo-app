/* A háttérkód (apps-script/src/*.gs) csomagja a gyors úthoz (api/_gas_bundle.js) + a kódváltozat azonosítója.
   Az „Apps Script telepítés” Action futtatja telepítés után (és ugyanezt az azonosítót teszi az Apps Scriptbe zz_build.js-ként),
   így a gyors út csak akkor dolgozik, ha pontosan ugyanaz a kód fut mindkét helyen. Kézzel: node scripts/gas-bundle.cjs [--id] */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const dir = path.join(__dirname, '..', 'apps-script', 'src');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.gs')).sort().map(f => [f, fs.readFileSync(path.join(dir, f), 'utf8')]);
const h = crypto.createHash('sha256'); files.forEach(([n, s]) => { h.update(n + '\n'); h.update(s); h.update('\n'); });
const build = h.digest('hex').slice(0, 16);
if (process.argv.includes('--id')) { process.stdout.write(build); process.exit(0); }
const out = '// GENERÁLT FÁJL – ne szerkeszd (scripts/gas-bundle.cjs). A háttérkód a gyors úthoz; a build azonosító egyezik az Apps Scriptben futóval.\n'
  + 'module.exports = ' + JSON.stringify({ build, files }) + ';\n';
const target = path.join(__dirname, '..', 'api', '_gas_bundle.js');
const old = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
if (old !== out) { fs.writeFileSync(target, out); console.log('api/_gas_bundle.js frissítve: ' + build); } else console.log('api/_gas_bundle.js naprakész: ' + build);
