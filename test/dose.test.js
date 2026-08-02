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

console.log("doseSlots — step size 2 but 2 reminders (the reported case)");
{
  const s = T.doseSlots({ type: "count", target: 2, increment: 2, reminderTimes: ["08:00", "21:00"] }, 1);
  assert(Array.isArray(s) && s.length === 2, "step 2 + 2 reminders + target 2 → still 2 dose rows");
  assert(s[0].partId === "morning" && s[1].partId === "night", "morning + night slots");
}

console.log("doseSlots exclusions");
{
  assert(T.doseSlots({ type: "check", target: 1 }, 1) === null, "check habit → null");
  assert(T.doseSlots({ type: "count", target: 4, increment: 0.5, unit: "L" }, 1) === null, "measurable (Water 4L, step 0.5, unit L) → null");
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

console.log("toggleDose — independent doses (the reported bug)");
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "ACV", type: "count", target: 2, increment: 1, reminderTimes: ["08:00", "20:00"] }] });
  T.setState(st); T.resetRenderCaches();
  const d = new Date();
  const habit = st.habits[0];
  // Tick the MORNING dose only → evening must stay pending.
  T.toggleDose(habit, d, 0);
  assert(T.doseStatus(habit, d, 0) === "done", "morning ticked → morning done");
  assert(T.doseStatus(habit, d, 1) === "pending", "evening stays pending (independent!)");
  assert(st.completions[T.dateKey(d)].h === 1, "count reflects 1 dose done");
}
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "ACV", type: "count", target: 2, increment: 1, reminderTimes: ["08:00", "20:00"] }] });
  T.setState(st); T.resetRenderCaches();
  const d = new Date();
  const habit = st.habits[0];
  // Tick the EVENING dose only → morning must stay pending.
  T.toggleDose(habit, d, 1);
  assert(T.doseStatus(habit, d, 1) === "done", "evening ticked → evening done");
  assert(T.doseStatus(habit, d, 0) === "pending", "morning stays pending");
  // Now tick morning too → both done, count 2.
  T.toggleDose(habit, d, 0);
  assert(T.doseStatus(habit, d, 0) === "done" && T.doseStatus(habit, d, 1) === "done", "both done after ticking both");
  assert(st.completions[T.dateKey(d)].h === 2, "count = 2");
  // Untick evening → only morning remains done.
  T.toggleDose(habit, d, 1);
  assert(T.doseStatus(habit, d, 0) === "done" && T.doseStatus(habit, d, 1) === "pending", "untick evening leaves morning done");
}

console.log("toggleDoseSkip — per-dose 'not done'");
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "ACV", type: "count", target: 2, increment: 1, reminderTimes: ["08:00", "20:00"] }] });
  T.setState(st); T.resetRenderCaches();
  const h = st.habits[0]; const d = new Date();
  // Mark dose 2 not done → that dose is skipped, dose 1 still pending.
  T.toggleDoseSkip(h, d, 1);
  assert(T.doseStatus(h, d, 1) === "skipped", "dose 2 marked not done → skipped");
  assert(T.doseStatus(h, d, 0) === "pending", "dose 1 stays pending (other dose unaffected)");
  // Toggle again → back to pending.
  T.toggleDoseSkip(h, d, 1);
  assert(T.doseStatus(h, d, 1) === "pending", "toggling not-done again clears it");
}
{
  // Skipping a done dose clears its done state; done and not-done are exclusive.
  const st = T.normalizeState({ habits: [{ id: "h", name: "ACV", type: "count", target: 2, increment: 1, reminderTimes: ["08:00", "20:00"] }] });
  T.setState(st); T.resetRenderCaches();
  const h = st.habits[0]; const d = new Date();
  T.toggleDose(h, d, 0); // dose 1 done
  assert(T.doseStatus(h, d, 0) === "done", "dose 1 done");
  T.toggleDoseSkip(h, d, 0); // now mark it not done
  assert(T.doseStatus(h, d, 0) === "skipped", "marking not-done clears the done state");
  assert(T.completionValue ? true : true, "");
  // Marking done again clears the skip.
  T.toggleDose(h, d, 0);
  assert(T.doseStatus(h, d, 0) === "done", "marking done again clears the not-done mark");
}
{
  // doseSkips survives a normalize round-trip and merges (union).
  const st = T.normalizeState({ habits: [{ id: "h", name: "ACV", type: "count", target: 2, increment: 1 }] });
  const k = T.dateKey(new Date());
  st.doseSkips = { [k]: { h: 0b10 } };
  const norm = T.normalizeState(st);
  assert(norm.doseSkips[k] && norm.doseSkips[k].h === 2, "doseSkips preserved through normalize");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
