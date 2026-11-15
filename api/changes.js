// Változásnapló (csak az Apps Script kérheti le a saját Google-tokenjével; az app az ügyvezetőnek adja tovább).
// A GitHub Action generálja – ne szerkeszd kézzel. A lista nem nyilvános: érzékeny részletek is lehetnek benne.
const ITEMS = [
{
"id": "45150f8851",
"at": "2026-11-15T13:41:36+02:00",
"msg": "Teljesítmény: HubSpot-felhasználó párosítása név alapján is (pl. „Ervin Egri” = „Egri Ervin”)"
},
{
"id": "69423af953",
"at": "2026-11-15T13:29:41+02:00",
"msg": "Árajánlat a bejelentkezett felhasználó nevében és aláírásával; HubSpot: tulajdonos-lista hiánya nem állítja meg a szinkront, friss hibajelzés"
},
{
"id": "58f63f02d7",
"at": "2026-11-15T13:27:20+02:00",
"msg": "HubSpot: meglévő deal párosítása (név, kapcsolattartó / cég dealjei) – nincs duplikálás; meglévő dealnél csak összeg, dátum és lezárás frissül"
},
{
"id": "37a34f2161",
"at": "2026-11-15T13:20:07+02:00",
"msg": "Egri Ervin duplikált munkatárs-sorának egyszeri összevonása (minden hivatkozás átírva)"
},
{
"id": "cef16d4994",
"at": "2026-11-15T13:15:25+02:00",
"msg": "Teljesítmény panel: a HubSpot-visszaírás utolsó hibája (ügyvezetőnek)"
},
{
"id": "2392693404",
"at": "2026-11-15T13:13:30+02:00",
"msg": "HubSpot visszaírás: lehetőség → deal (érték, dátum, szakasz, tulajdonos, kapcsolattartó és cég társítva); új / módosított ügyfél → HubSpot cég és kapcsolattartó"
},
{
"id": "f53beaad57",
"at": "2026-11-15T13:11:36+02:00",
"msg": "Teljesítmény panel: tesztkörnyezetben nincs háttérhívás"
},
{
"id": "04a95ea8c7",
"at": "2026-11-15T13:11:18+02:00",
"msg": "Értékesítés: Teljesítmény panel – HubSpot-aktivitás (hívás, megbeszélés, e-mail, új kontakt), megkeresés, ajánlat, szerződés, befolyt díj, jutalék értékesítőnként"
},
{
"id": "4279be7439",
"at": "2026-11-15T13:09:52+02:00",
"msg": "Projekt értékesítő-választó: Ervin csak egyszer (az ügyvezető felhasználó = saját munkatárs-sora), névismétlődés kiszűrve"
},
{
"id": "e1305f0dcc",
"at": "2026-11-15T13:03:29+02:00",
"msg": "Kintlévőség: a már esedékes hónap bizonylat nélküli projektjei is beleszámítanak"
},
{
"id": "01629a2e9f",
"at": "2026-11-15T12:59:30+02:00",
"msg": "Számlázás: magyarázó szöveg törölve; Tesztek workflow YAML javítás"
},
{
"id": "e4400978ec",
"at": "2026-11-15T12:58:50+02:00",
"msg": "Árkalkulátor: az „Eredmény beküldése” kitöltött új lehetőséget nyit (érték, szolgáltatások, tételek, következő lépés)"
},
{
"id": "68ed1b6229",
"at": "2026-11-15T12:57:30+02:00",
"msg": "Fizetések: a dátum (pl. ✓ nov. 13.) egy sorban"
},
{
"id": "a18ef33043",
"at": "2026-11-15T12:56:48+02:00",
"msg": "Ártitok-teszt, natív select ellenőrzés, tesztek minden pushkor; a háttér csak sikeres ártitok-teszt után települ"
},
{
"id": "c8eac35de9",
"at": "2026-11-15T12:53:56+02:00",
"msg": "Elhalt gombkezelők törlése (cut-deliver, imp-open, nas-copy, quote-for, raw-upload, sz-move, vid-start)"
},
{
"id": "6b7c21c2d2",
"at": "2026-11-15T12:42:10+02:00",
"msg": "Szakember nézet: Kanban fül ideiglenesen elrejtve"
},
{
"id": "60f880d095",
"at": "2026-11-15T12:23:01+02:00",
"msg": "Natív legördülők helyett a kereshető legördülő (díjcsökkentés, havi kimutatás, eszközlista-előnézet, hitel)"
},
{
"id": "9154ebcb8a",
"at": "2026-11-15T12:21:35+02:00",
"msg": "Szerződéskor a lehetőség jegyzetei nem kerülnek a projektbe (+ egyszeri takarítás); telefonos videóablak: kisebb álló videó, tömör gombsor; elavult tesztek igazítása"
},
{
"id": "fd7f62615d",
"at": "2026-11-14T20:26:13+02:00",
"msg": "backend: authorize assigned photo retouchers and include photo cards in specialist Kanban"
},
{
"id": "cf5e2a26d6",
"at": "2026-11-14T20:25:52+02:00",
"msg": "fix: open postproduction Kanban from calendar deadline bars and calendar chips"
},
{
"id": "61c8e837ed",
"at": "2026-11-14T20:24:32+02:00",
"msg": "style: keep specialist Kanban project panel scrollable on smaller screens"
},
{
"id": "c7e9da3335",
"at": "2026-11-14T20:24:05+02:00",
"msg": "feat: show photo retoucher own Kanban cards and tasks in specialist project detail"
},
{
"id": "05da123279",
"at": "2026-11-14T20:23:40+02:00",
"msg": "feat: add specialist Kanban tab for photo retouchers and preserve their active projects"
},
{
"id": "177f097aeb",
"at": "2026-11-14T20:20:47+02:00",
"msg": "ui: hide photo count in Kanban and project video list"
},
{
"id": "9ff0c5f908",
"at": "2026-11-14T20:19:28+02:00",
"msg": "ui: show assigned photographer instead of video cutter in photo progress row"
},
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
"id": "8350835398",
"at": "2026-11-14T18:14:04Z",
"msg": "Változásnapló frissítése"
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
