// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "7ff5b73912",
"at": "2026-11-14T20:18:29+02:00",
"msg": "fix: assign photo Kanban card to photo-retouching owner instead of video editor"
},
{
"id": "47d936f4c1",
"at": "2026-11-14T20:16:45+02:00",
"msg": "revert: restore original timeline; postproduction cards belong in Kanban"
},
{
"id": "1de9e6b31c",
"at": "2026-11-14T20:16:41+02:00",
"msg": "revert: restore original timeline; postproduction cards belong in Kanban"
},
{
"id": "65d92fb04a",
"at": "2026-11-14T20:16:37+02:00",
"msg": "revert: restore original timeline; postproduction cards belong in Kanban"
},
{
"id": "56f212df1e",
"at": "2026-11-14T20:14:38+02:00",
"msg": "ui: show selected owner's task details on timeline card hover"
},
{
"id": "04a42f74c6",
"at": "2026-11-14T20:14:20+02:00",
"msg": "style: one compact timeline lane with named editing and photo task cards"
},
{
"id": "88f5f6fe83",
"at": "2026-11-14T20:13:57+02:00",
"msg": "ui: group video and photo postproduction into a single timeline bar with per-person cards"
},
{
"id": "154f785d58",
"at": "2026-11-14T20:10:58+02:00",
"msg": "style: make sales amount 30% wider and commission input 30% narrower"
},
{
"id": "3d92985fac",
"at": "2026-11-14T20:10:46+02:00",
"msg": "ui: place sales amount before commission percentage"
},
{
"id": "7ef1507219",
"at": "2026-11-14T20:09:21+02:00",
"msg": "ui: render separate editor and photo-retouching deadline bars in shared projects"
},
{
"id": "fae1d6495a",
"at": "2026-11-14T20:08:01+02:00",
"msg": "fix: identify calendar postproduction owners from actual assigned video and photo tasks"
},
{
"id": "e90cc720b2",
"at": "2026-11-14T20:07:44+02:00",
"msg": "fix: label video vs photo postproduction tasks with actual responsible person"
},
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
