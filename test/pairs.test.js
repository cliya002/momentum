// Tests habit-to-habit correlation insight (habitPairInsight).
// Run: node test/pairs.test.js
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

function setup(habits) {
  const st = T.normalizeState({ habits });
  T.setState(st); T.resetRenderCaches();
  return st;
}
function mark(st, id, off) {
  const k = T.dateKey(T.addDays(new Date(), -off));
  (st.completions[k] = st.completions[k] || {})[id] = 1;
}

console.log("strong A→B link surfaces");
{
  const st = setup([
    { id: "gym", name: "Gym", days: [0,1,2,3,4,5,6] },
    { id: "sleep", name: "Sleep", days: [0,1,2,3,4,5,6] },
  ]);
  // On 20 past days do gym; on 18 of those also sleep. Also some sleep-only days.
  for (let i = 1; i <= 20; i++) { mark(st, "gym", i); if (i <= 18) mark(st, "sleep", i); }
  T.resetRenderCaches();
  const ins = T.habitPairInsight();
  assert(ins && /Gym/.test(ins.text) && /Sleep/.test(ins.text), "produces a Gym→Sleep insight");
  assert(ins && /\d+% of the time/.test(ins.text), "includes a percentage");
}

console.log("no link when B is always done anyway (no lift)");
{
  const st = setup([
    { id: "a", name: "A", days: [0,1,2,3,4,5,6] },
    { id: "b", name: "B", days: [0,1,2,3,4,5,6] },
  ]);
  // B done every day across the whole 60-day window (baseline ~100%), A done
  // half the days → conditional ≈ baseline, so there's no lift to report.
  for (let i = 1; i <= 60; i++) { mark(st, "b", i); if (i % 2 === 0) mark(st, "a", i); }
  T.resetRenderCaches();
  assert(T.habitPairInsight() === null, "no insight when there's no lift over baseline");
}

console.log("no link with too little data");
{
  const st = setup([
    { id: "a", name: "A", days: [0,1,2,3,4,5,6] },
    { id: "b", name: "B", days: [0,1,2,3,4,5,6] },
  ]);
  for (let i = 1; i <= 3; i++) { mark(st, "a", i); mark(st, "b", i); }
  T.resetRenderCaches();
  assert(T.habitPairInsight() === null, "too few shared days → null");
}

console.log("single habit → null");
{
  setup([{ id: "a", name: "A" }]);
  assert(T.habitPairInsight() === null, "need at least two habits");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
