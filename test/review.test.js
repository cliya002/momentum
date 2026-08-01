// Tests guided weekly review helpers: weekKeyOf, computeWeekReview,
// and reviews persistence through normalize + merge.
// Run: node test/review.test.js
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const versionSrc = fs.readFileSync(path.join(root, "version.js"), "utf8");
const appSrc = fs.readFileSync(path.join(root, "app.js"), "utf8");
const sandbox = {};
new Function("self", versionSrc + "\n" + appSrc)(sandbox);
const T = sandbox.__momentumTest;

let pass = 0, fail = 0;
function assert(c, m) { if (c) { pass++; console.log("  ✓ " + m); } else { fail++; console.log("  ✗ FAIL: " + m); } }

function fresh() {
  const st = T.normalizeState({ habits: [{ id: "h", name: "H", days: [0, 1, 2, 3, 4, 5, 6] }] });
  T.setState(st); T.resetRenderCaches();
  return st;
}
function markDate(d) {
  const st = T.getState();
  const k = T.dateKey(d);
  (st.completions[k] = st.completions[k] || {})["h"] = 1;
}

console.log("weekKeyOf");
{
  fresh();
  const ws = T.startOfWeekMonday(new Date());
  assert(T.weekKeyOf(new Date()) === T.dateKey(ws), "weekKeyOf → Monday dateKey of the week");
}

console.log("computeWeekReview");
{
  fresh();
  const ws = T.startOfWeekMonday(new Date());
  const now = new Date();
  let elapsed = 0;
  for (let i = 0; i < 7; i++) { const d = T.addDays(ws, i); if (d > now && T.dateKey(d) !== T.dateKey(now)) break; markDate(d); elapsed++; }
  T.resetRenderCaches();
  const r = T.computeWeekReview(ws);
  assert(r.totalDone === elapsed, `counts all completed days this week → ${elapsed}`);
  assert(r.adherence === 100, "full completion → 100% adherence");
  assert(r.topHabit && r.topHabit.id === "h", "identifies most consistent habit");
  assert(r.bestVal >= 1, "records a strongest day");
}
{
  fresh();
  T.resetRenderCaches();
  const ws = T.startOfWeekMonday(new Date());
  const r = T.computeWeekReview(ws);
  assert(r.totalDone === 0, "empty week → 0 done");
}

console.log("reviews persist through normalize");
{
  const wk = T.dateKey(T.startOfWeekMonday(new Date()));
  const st = T.normalizeState({ habits: [], reviews: { [wk]: { focus: "Sleep earlier", adherence: 80, updatedAt: 123 } } });
  assert(st.reviews[wk] && st.reviews[wk].focus === "Sleep earlier", "review focus survives normalize");
  assert(st.reviews[wk].adherence === 80, "review adherence survives normalize");
}

console.log("reviews merge (newest updatedAt wins)");
{
  const wk = "2025-01-06";
  const local = T.normalizeState({ habits: [], reviews: { [wk]: { focus: "old", adherence: 50, updatedAt: 100 } } });
  const remote = T.normalizeState({ habits: [], reviews: { [wk]: { focus: "new", adherence: 90, updatedAt: 200 } } });
  const merged = T.mergeStates(local, remote);
  assert(merged.reviews[wk].focus === "new", "newer review wins on merge");
  const merged2 = T.mergeStates(remote, local);
  assert(merged2.reviews[wk].focus === "new", "merge is order-independent");
}
{
  const local = T.normalizeState({ habits: [], reviews: { "2025-01-06": { focus: "a", updatedAt: 100 } } });
  const remote = T.normalizeState({ habits: [], reviews: { "2025-01-13": { focus: "b", updatedAt: 100 } } });
  const merged = T.mergeStates(local, remote);
  assert(merged.reviews["2025-01-06"] && merged.reviews["2025-01-13"], "distinct weeks both kept");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
