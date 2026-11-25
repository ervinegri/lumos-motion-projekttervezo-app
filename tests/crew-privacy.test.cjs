/* Szakember-adatvédelem (Ervin, 2026-11-25: „TILOS mások ügyeit látnia”): a szakember nézet nem mutathat másokra vonatkozó figyelmeztetést,
   és a háttér a szakembernek csak a saját díját / díjcsökkentését / jegyzetét / meghívását, a munkatársakról csak nevet, telefont, szerepet ad. */
const fs = require('fs'), path = require('path'), assert = require('assert');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const core = R('core.js'), vpv = R('views-penzugy-vagas.js'), gs = fs.readdirSync(path.join(__dirname, '..', 'apps-script/src')).map(f => R('apps-script/src/' + f)).join('\n');
assert(/function computeIssues\(\)\{if\(typeof ro==='function'&&ro\(\)\)return \[\];/.test(core), 'FAIL: computeIssues szakember nézetben is fut');
assert(/iss=ro\(\)\?\[\]:computeIssues\(\)/.test(vpv), 'FAIL: a projektoldal figyelmeztetései szakember nézetben is látszanak');
assert(/out\.crew = crew\.filter\(c => onIds\[c\.id\]\)\.map\(c => \(\{ id: c\.id, name: c\.name, phone: c\.phone, roles: c\.roles \}\)\)/.test(gs), 'FAIL: a szakember a munkatársakról több adatot kap (név, telefon, szerep a megengedett)');
assert(/delete q\.fees; \}/.test(gs) && /q\.myFee = /.test(gs), 'FAIL: a szakember mások díját is megkaphatja');
assert(/q\.penalties = role === 'crew' \? pens\.filter\(x => x\.crewId === u\.crewId/.test(gs), 'FAIL: a szakember mások díjcsökkentését is megkaphatja');
assert(/q\.crewNotes = role === 'crew' \?/.test(gs), 'FAIL: a szakember mások jegyzetét is megkaphatja');
assert(/q\.invites = u\.crewId && inv\[u\.crewId\]/.test(gs), 'FAIL: a szakember mások meghívását is megkaphatja');
console.log('ok');
