// Tests the Progress Insights feed + time-of-day helpers:
// slotForHabit, timeOfDayStats, perfectDayCount, totalCheckins, buildInsights.
// Run: node test/insightsfeed.test.js
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

function fresh(habits) {
  const st = T.normalizeState({ habits });
  T.setState(st); T.resetRenderCaches();
  return st;
}
function markBack(id, days) {
  const st = T.getState();
  for (let i = 1; i <= days; i++) {
    const k = T.dateKey(T.addDays(new Date(), -i));
    (st.completions[k] = st.completions[k] || {})[id] = 1;
  }
}

console.log("slotForHabit");
{
  fresh([]);
  assert(T.slotForHabit({ time: "6:30 AM · gym" }) === "morning", "6:30 AM → morning");
  assert(T.slotForHabit({ time: "1:00 PM" }) === "afternoon", "1:00 PM → afternoon");
  assert(T.slotForHabit({ time: "9:00 PM" }) === "evening", "9:00 PM → evening");
  assert(T.slotForHabit({ time: "Morning" }) === "morning", "text 'Morning' → morning");
  assert(T.slotForHabit({ time: "All day" }) === "anytime", "'All day' → anytime");
  assert(T.slotForHabit({ time: "" }) === "anytime", "no time → anytime");
}

console.log("timeOfDayStats");
{
  fresh([{ id: "m", name: "AM", time: "7:00 AM", days: [0,1,2,3,4,5,6] }]);
  markBack("m", 10);
  T.resetRenderCaches();
  const tod = T.timeOfDayStats();
  assert(tod.morning.s > 0 && tod.morning.d > 0 && tod.morning.d <= tod.morning.s, "morning slot tallies completions");
  assert(tod.evening.s === 0, "no evening habits → 0 scheduled");
}

console.log("perfectDayCount");
{
  fresh([{ id: "a", name: "A", days: [0,1,2,3,4,5,6] }, { id: "b", name: "B", days: [0,1,2,3,4,5,6] }]);
  markBack("a", 3); markBack("b", 3);
  T.resetRenderCaches();
  assert(T.perfectDayCount(30) >= 3, "3 fully-complete past days counted");
}
{
  fresh([{ id: "a", name: "A", days: [0,1,2,3,4,5,6] }, { id: "b", name: "B", days: [0,1,2,3,4,5,6] }]);
  markBack("a", 3); // only one of two habits done
  T.resetRenderCaches();
  assert(T.perfectDayCount(30) === 0, "partial days are not perfect");
}

console.log("totalCheckins");
{
  fresh([{ id: "a", name: "A", days: [0,1,2,3,4,5,6] }]);
  markBack("a", 5);
  assert(T.totalCheckins() === 5, "counts positive check-ins");
}

console.log("buildInsights");
{
  fresh([]);
  assert(T.buildInsights().length === 0, "no habits → empty feed");
}
{
  fresh([{ id: "a", name: "Meditate", time: "7:00 AM", days: [0,1,2,3,4,5,6] }]);
  markBack("a", 20);
  T.resetRenderCaches();
  const items = T.buildInsights();
  assert(Array.isArray(items) && items.length > 0, "produces findings from history");
  assert(items.every((i) => i.icon && i.text), "each finding has an icon and text");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
