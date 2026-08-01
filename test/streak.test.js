// Tests streak calculation with freeze (grace) days + completion stats.
// Run: node test/streak.test.js
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

function freshState() {
  const st = T.normalizeState({ habits: [{ id: "h", name: "H", target: 1, days: [0, 1, 2, 3, 4, 5, 6] }] });
  T.setState(st);
  T.resetRenderCaches();
  return st;
}
function markDone(offset) {
  const st = T.getState();
  const k = T.dateKey(T.addDays(new Date(), -offset));
  (st.completions[k] = st.completions[k] || {})["h"] = 1;
}
function freezeGlobal(offset) {
  const st = T.getState();
  const k = T.dateKey(T.addDays(new Date(), -offset));
  st.freezes.days[k] = true;
}
const habit = () => T.getState().habits[0];

console.log("currentStreak with freeze");
{
  freshState(); markDone(0); markDone(1); markDone(2); T.resetRenderCaches();
  assert(T.currentStreak(habit()) === 3, "3 consecutive done → streak 3");
}
{
  freshState(); markDone(0); markDone(1); T.resetRenderCaches(); // day2 missed
  assert(T.currentStreak(habit()) === 2, "gap breaks streak → 2");
}
{
  freshState(); markDone(0); markDone(1); freezeGlobal(2); markDone(3); T.resetRenderCaches();
  assert(T.currentStreak(habit()) === 3, "frozen day is skipped, not a break → 3");
}
{
  freshState(); markDone(0); markDone(1); freezeGlobal(2); markDone(2); markDone(3); T.resetRenderCaches();
  assert(T.currentStreak(habit()) === 4, "completed frozen day still counts → 4");
}

console.log("longestStreak");
{
  freshState(); markDone(2); markDone(3); markDone(4); T.resetRenderCaches(); // 3-run ending 2 days ago, nothing since
  assert(T.longestStreak(habit()) === 3, "longest run detected → 3");
}

console.log("countsForAdherence (freeze excluded)");
{
  freshState(); freezeGlobal(1); T.resetRenderCaches();
  const d1 = T.addDays(new Date(), -1);
  const d3 = T.addDays(new Date(), -3);
  assert(T.countsForAdherence(habit(), d1) === false, "frozen day excluded from adherence");
  assert(T.countsForAdherence(habit(), d3) === true, "non-frozen scheduled day counts");
}

console.log("habitCompletionStats");
{
  freshState(); markDone(0); markDone(1); T.resetRenderCaches();
  const s = T.habitCompletionStats(habit());
  assert(s && s.done === 2 && s.sched >= 2, "stats count completed days");
  assert(s && s.rate >= 0 && s.rate <= 100, "rate is a percentage");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
