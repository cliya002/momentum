// Tests per-dose slots for "times per day" habits: doseSlots + doseStatus.
// Run: node test/dose.test.js
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

console.log("doseSlots eligibility");
{
  const two = { type: "count", target: 2, increment: 1, reminderTimes: ["08:00", "20:00"] };
  const s = T.doseSlots(two, 1);
  assert(Array.isArray(s) && s.length === 2, "twice-a-day → 2 slots");
  assert(s[0].time === "08:00" && s[1].time === "20:00", "slots carry sorted times");
  assert(s[0].partId === "morning" && s[1].partId === "evening", "slots get their own day-parts");
  assert(s[0].total === 2, "slot knows the total");
}
{
  // both times same part still yields 2 dose rows (the reported bug)
  const s = T.doseSlots({ type: "count", target: 2, increment: 1, reminderTimes: ["08:00", "10:00"] }, 1);
  assert(s.length === 2 && s[0].partId === "morning" && s[1].partId === "morning", "two morning doses → 2 morning slots");
}
{
  const s = T.doseSlots({ type: "count", target: 3, increment: 1, reminderTimes: [] }, 1);
  assert(s && s.length === 3 && s[0].time === null, "no reminders → slots with null times");
}

console.log("doseSlots exclusions");
{
  assert(T.doseSlots({ type: "check", target: 1 }, 1) === null, "check habit → null");
  assert(T.doseSlots({ type: "count", target: 4, increment: 0.5 }, 1) === null, "measurable (Water 4L, step 0.5) → null");
  assert(T.doseSlots({ type: "count", target: 10000, increment: 1000 }, 1) === null, "steps → null");
  assert(T.doseSlots({ type: "count", target: 1, increment: 1 }, 1) === null, "target 1 → null");
  assert(T.doseSlots({ type: "count", target: 20, increment: 1 }, 1) === null, "target > 12 → null");
}

console.log("doseStatus");
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "ACV", type: "count", target: 2, increment: 1, reminderTimes: ["08:00", "20:00"] }] });
  T.setState(st); T.resetRenderCaches();
  const d = new Date();
  const habit = st.habits[0];
  assert(T.doseStatus(habit, d, 0) === "pending" && T.doseStatus(habit, d, 1) === "pending", "nothing done → both pending");
  const k = T.dateKey(d); (st.completions[k] = st.completions[k] || {})["h"] = 1; T.resetRenderCaches();
  assert(T.doseStatus(habit, d, 0) === "done" && T.doseStatus(habit, d, 1) === "pending", "count 1 → first done, second pending");
  st.completions[k]["h"] = 2; T.resetRenderCaches();
  assert(T.doseStatus(habit, d, 0) === "done" && T.doseStatus(habit, d, 1) === "done", "count 2 → both done");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
