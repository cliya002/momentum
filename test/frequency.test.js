// Tests flexible-frequency ("N times per week") helpers:
// isWeekly, weeklyTarget, weeklyDoneCount, weeklyMet, todayStatus,
// currentStreak (weekly branch), weekAdherencePct (weekly branch).
// Run: node test/frequency.test.js
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

function freshWeekly(target) {
  const st = T.normalizeState({ habits: [{ id: "h", name: "Gym", freqType: "weekly", weeklyTarget: target }] });
  T.setState(st);
  T.resetRenderCaches();
  return st;
}
const habit = () => T.getState().habits[0];
function markDate(d) {
  const st = T.getState();
  const k = T.dateKey(d);
  (st.completions[k] = st.completions[k] || {})["h"] = 1;
}
// How many days (from Monday) of the current week have already occurred.
function elapsedThisWeek() {
  const ws = T.startOfWeekMonday(new Date());
  const today = new Date();
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const d = T.addDays(ws, i);
    if (d > today && T.dateKey(d) !== T.dateKey(today)) break;
    n++;
  }
  return n;
}
// Mark `k` completed days in the current week (only elapsed days).
function markCurrentWeek(k) {
  const ws = T.startOfWeekMonday(new Date());
  const avail = elapsedThisWeek();
  const n = Math.min(k, avail);
  for (let i = 0; i < n; i++) markDate(T.addDays(ws, i));
  return n;
}
// Mark `k` completed days in a past week (weekOffset >= 1 weeks ago).
function markPastWeek(weekOffset, k) {
  const ws = T.addDays(T.startOfWeekMonday(new Date()), -7 * weekOffset);
  for (let i = 0; i < k; i++) markDate(T.addDays(ws, i));
}

console.log("isWeekly / weeklyTarget");
{
  freshWeekly(3);
  assert(T.isWeekly(habit()) === true, "freqType weekly → isWeekly true");
  assert(T.weeklyTarget(habit()) === 3, "weeklyTarget reads value → 3");
}
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "D", days: [1, 3, 5] }] });
  T.setState(st); T.resetRenderCaches();
  assert(T.isWeekly(habit()) === false, "days habit → isWeekly false");
}
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "X", freqType: "weekly", weeklyTarget: 99 }] });
  T.setState(st); T.resetRenderCaches();
  assert(T.weeklyTarget(habit()) === 3, "out-of-range weeklyTarget falls back to default 3 on normalize");
}

console.log("weeklyDoneCount / weeklyMet");
{
  freshWeekly(2);
  const marked = markCurrentWeek(2);
  T.resetRenderCaches();
  assert(T.weeklyDoneCount(habit()) === marked, `counts completions this week → ${marked}`);
  // If at least 2 days have elapsed this week, quota of 2 is met.
  if (elapsedThisWeek() >= 2) assert(T.weeklyMet(habit()) === true, "quota met when done >= target");
}
{
  freshWeekly(5);
  markCurrentWeek(1);
  T.resetRenderCaches();
  assert(T.weeklyMet(habit()) === false, "quota not met when done < target");
}

console.log("todayStatus (weekly-aware)");
{
  freshWeekly(3);
  markDate(new Date()); // done today
  T.resetRenderCaches();
  assert(T.todayStatus(habit(), new Date()) === "done", "completed today → done");
}
{
  freshWeekly(1);
  markCurrentWeek(1);
  T.resetRenderCaches();
  // Quota of 1 met this week → any elapsed day reads done.
  const ws = T.startOfWeekMonday(new Date());
  assert(T.todayStatus(habit(), ws) === "done", "quota met → other days read done");
}
{
  freshWeekly(3);
  T.resetRenderCaches();
  assert(T.todayStatus(habit(), new Date()) === "pending", "nothing done, quota unmet → pending");
}

console.log("currentStreak (weekly branch)");
{
  // Previous full week met, current week not started → grace keeps streak at 1.
  freshWeekly(2);
  markPastWeek(1, 2);
  T.resetRenderCaches();
  assert(T.currentStreak(habit()) === 1, "prev week met, current in grace → 1");
}
{
  // Two prior weeks met + current week met → streak 3.
  freshWeekly(2);
  markPastWeek(1, 2);
  markPastWeek(2, 2);
  markCurrentWeek(2);
  T.resetRenderCaches();
  // Current week counts only if >=2 days elapsed and marked.
  const expected = (elapsedThisWeek() >= 2) ? 3 : 2;
  assert(T.currentStreak(habit()) === expected, `consecutive met weeks → ${expected}`);
}
{
  // Gap two weeks ago breaks the chain.
  freshWeekly(2);
  markPastWeek(1, 2);   // last week met
  markPastWeek(3, 2);   // 3 weeks ago met, but week 2 missed
  T.resetRenderCaches();
  assert(T.currentStreak(habit()) === 1, "missed week breaks streak → 1");
}

console.log("weekAdherencePct (weekly branch)");
{
  freshWeekly(2);
  markPastWeek(1, 2); // met last week
  T.resetRenderCaches();
  const ws = T.addDays(T.startOfWeekMonday(new Date()), -7);
  assert(T.weekAdherencePct(ws) === 100, "met week → 100%");
}
{
  freshWeekly(4);
  markPastWeek(1, 2); // 2 of 4 last week
  T.resetRenderCaches();
  const ws = T.addDays(T.startOfWeekMonday(new Date()), -7);
  assert(T.weekAdherencePct(ws) === 50, "half quota → 50%");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
