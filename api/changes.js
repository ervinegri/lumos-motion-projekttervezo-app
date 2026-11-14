// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "f0ec7cf481",
"at": "2026-11-14T20:02:27+02:00",
"msg": "style: widen postproduction owner dropdown to fit renamed option"
},
{
"id": "def325876e",
"at": "2026-11-14T20:02:14+02:00",
"msg": "ui: photo postproduction tooltip uses photo-specific task labels and selected assignee"
},
{
"id": "3a7c20681d",
"at": "2026-11-14T20:01:42+02:00",
"msg": "feat: show photo postproduction deadline and photo assignee timeline rows"
},
{
"id": "ccd0040aef",
"at": "2026-11-14T20:01:03+02:00",
"msg": "feat: include photo retouching assignees in calendar postproduction filter"
},
{
"id": "7bcafc4a3b",
"at": "2026-11-14T19:56:58+02:00",
"msg": "fix: deploy orphaned video-task cleanup to Apps Script production"
},
{
"id": "7656690534",
"at": "2026-11-14T19:56:47+02:00",
"msg": "ci: allow the last available Apps Script version and warn about cleanup"
},
{
"id": "eb6dcc8d76",
"at": "2026-11-14T19:54:57+02:00",
"msg": "fix: show editor calendar deadlines only for actual video editing work"
},
{
"id": "8f4713a4c9",
"at": "2026-11-14T19:54:44+02:00",
"msg": "fix: distinguish video-editing assignments from photo-only deliverables"
},
{
"id": "ee68319ff1",
"at": "2026-11-14T19:54:20+02:00",
"msg": "fix: prune orphaned untouched video tasks, including previously assigned editors"
},
{
"id": "0e5332b4ae",
"at": "2026-11-14T19:53:17+02:00",
"msg": "ui: open answer popup directly for pending email invitation links"
},
{
"id": "ba12dec932",
"at": "2026-11-14T19:52:17+02:00",
"msg": "fix: hide invitation response buttons once invitation already answered"
},
{
"id": "d45da3bafc",
"at": "2026-11-14T19:52:00+02:00",
"msg": "fix: email invitation link shows already-answered popup on repeat opens"
},
{
"id": "8c0b38ffc7",
"at": "2026-11-14T19:51:32+02:00",
"msg": "ui: show previously submitted invitation response instead of answering twice"
},
{
"id": "61e3c94144",
"at": "2026-11-14T19:51:13+02:00",
"msg": "api: allow read-only lookup of own invitation response status"
},
{
"id": "1b2af289ca",
"at": "2026-11-14T19:51:04+02:00",
"msg": "fix: make crew invitation responses final and expose read-only status for email links"
},
{
"id": "e83ee1f56b",
"at": "2026-11-14T19:50:59+02:00",
"msg": "ui: disable preview-only email links until invitation is sent"
},
{
"id": "08f4eee78a",
"at": "2026-11-14T19:49:52+02:00",
"msg": "ui: keep accepted crew trash button clickable even when crew is finalized"
},
{
"id": "7d6a124972",
"at": "2026-11-14T19:48:59+02:00",
"msg": "fix: show own invitations and their statuses in manager project dashboard"
},
{
"id": "d1895c58c8",
"at": "2026-11-14T19:48:12+02:00",
"msg": "ui: equalize invitation call-to-action and accepted/declined badge widths"
},
{
"id": "88eb6b66de",
"at": "2026-11-14T19:48:09+02:00",
"msg": "fix: show managers accepted and declined invitations, resolve own staff record by name"
},
{
"id": "dc0ae96c66",
"at": "2026-11-14T19:46:30+02:00",
"msg": "style: present invitation email preview as readable modal card"
},
{
"id": "dd621eac7c",
"at": "2026-11-14T19:46:17+02:00",
"msg": "fix: validate invitation preview recipient email correctly"
},
{
"id": "4b155b4bde",
"at": "2026-11-14T19:46:02+02:00",
"msg": "ui: show month and day on current-year invitation timestamps"
},
{
"id": "d233204b31",
"at": "2026-11-14T19:45:11+02:00",
"msg": "feat: preview invitation email in popup before sending and resending"
},
{
"id": "123a1f3dfc",
"at": "2026-11-14T19:43:45+02:00",
"msg": "api: add read-only crew invitation preview and manager self-response"
},
{
"id": "aa915a800d",
"at": "2026-11-14T19:43:33+02:00",
"msg": "feat: shared invitation email formatter and read-only preview"
},
{
"id": "db7c47a69c",
"at": "2026-11-14T19:43:26+02:00",
"msg": "feat: show raw material handoff and edit deadline for combined onsite-editor invitations"
},
{
"id": "b49ed2054a",
"at": "2026-11-14T19:42:40+02:00",
"msg": "backend: reject removal of accepted project member on save"
},
{
"id": "146b8a5176",
"at": "2026-11-14T19:42:29+02:00",
"msg": "feat: warn and block removal of accepted crew members"
},
{
"id": "f8fa37791c",
"at": "2026-11-14T19:41:37+02:00",
"msg": "ui: match declined invitation badge dimensions with accepted status"
},
{
"id": "caf7d4e99c",
"at": "2026-11-14T19:38:32+02:00",
"msg": "ui: match accepted invitation badge size to invite button"
}
];
const TOKENS = new Map();   // token → { email, exp } (melegen tartott függvénynél nem kérdezzük újra a Google-t)
async function emailOf(token) {
  const hit = TOKENS.get(token); if (hit && hit.exp > Date.now()) return hit.email;
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(token));
  if (!r.ok) return '';
  const j = await r.json(); const email = String(j.email || '').toLowerCase();
  if (email && String(j.email_verified) !== 'false') TOKENS.set(token, { email, exp: Date.now() + Math.min(Number(j.expires_in || 300) * 1000, 300000) });
  if (TOKENS.size > 200) TOKENS.clear();
  return email;
}
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) { res.statusCode = 401; return res.end(JSON.stringify({ message: 'Hiányzó hitelesítés.' })); }
  const email = await emailOf(token).catch(() => '');
  const allowed = String(process.env.APPS_SCRIPT_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!email || !allowed.includes(email)) { res.statusCode = 403; return res.end(JSON.stringify({ message: 'Nem engedélyezett.' })); }
  res.end(JSON.stringify({ items: ITEMS }));
};
