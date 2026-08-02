// Tests the "smart" additions: dose spacing warning, count-setup suggestion,
// dose progress/nudge, skip-risk prediction, adaptive target, momentum
// forecast, and per-dose timing learning (record/suggest + normalize/merge).
// Run: node test/smart.test.js
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
function setDone(st, habitId, date, val) {
  const k = T.dateKey(date);
  (st.completions[k] = st.completions[k] || {})[habitId] = val;
}

console.log("doseSpacingWarning");
{
  assert(T.doseSpacingWarning(["08:00", "20:00"]) === "", "12h apart → no warning");
  assert(T.doseSpacingWarning(["08:00", "09:30"]) !== "", "90 min apart → warns");
  assert(/min|hr/.test(T.doseSpacingWarning(["08:00", "08:45"])), "45 min → warns with a label");
  assert(T.doseSpacingWarning(["08:00"]) === "", "single time → no warning");
  assert(T.doseSpacingWarning([]) === "", "no times → no warning");
  assert(T.doseSpacingWarning(["08:00", "11:00"]) === "", "exactly 3h → ok by default");
  assert(T.doseSpacingWarning(["08:00", "09:00"], 30) === "", "custom gap 30m → 1h ok");
}

console.log("suggestCountSetup");
{
  assert(T.suggestCountSetup("Cinnamon Turmeric ACV twice a day", 0, "check").target === 2, "'twice a day' → target 2");
  assert(T.suggestCountSetup("Vitamins 3 times a day", 0, "check").target === 3, "'3 times a day' → target 3");
  assert(T.suggestCountSetup("Eye drops 2x/day", 0, "check").target === 2, "'2x/day' → target 2");
  assert(T.suggestCountSetup("Meds thrice a day", 0, "check").target === 3, "'thrice a day' → target 3");
  assert(T.suggestCountSetup("Plain habit", 2, "check").target === 2, "2 reminder times → target 2");
  assert(T.suggestCountSetup("Plain habit", 1, "check") === null, "1 reminder → no suggestion");
  assert(T.suggestCountSetup("ACV twice a day", 0, "count") === null, "already count → null");
  assert(T.suggestCountSetup("Water 20 times a day", 0, "check") === null, "> 12 → null (not a dose habit)");
}

console.log("doseProgress + doseNudgeMessage");
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "ACV", type: "count", target: 2, increment: 1, reminderTimes: ["08:00", "20:00"] }] });
  T.setState(st); T.resetRenderCaches();
  const h = st.habits[0]; const d = new Date();
  let p = T.doseProgress(h, d);
  assert(p && p.total === 2 && p.done === 0 && p.pending === 2, "fresh day → 0 of 2 done");
  // Nothing done → no nudge even if late.
  assert(T.doseNudgeMessage(h, d, 22 * 60) === "", "no doses done → no nudge");
  // Dose 1 done, evening → nudge about dose 2.
  const k = T.dateKey(d); st.doseTicks[k] = { h: 0b01 }; st.completions[k] = { h: 1 }; T.resetRenderCaches();
  p = T.doseProgress(h, d);
  assert(p.done === 1 && p.pending === 1, "dose 1 ticked → 1 of 2");
  assert(T.doseNudgeMessage(h, d, 21 * 60) !== "", "dose 1 done + past 20:00 → nudge");
  assert(T.doseNudgeMessage(h, d, 12 * 60) === "", "dose 2 not due yet at noon → no nudge");
  // Both done → no nudge.
  st.doseTicks[k] = { h: 0b11 }; st.completions[k] = { h: 2 }; T.resetRenderCaches();
  assert(T.doseNudgeMessage(h, d, 22 * 60) === "", "both doses done → no nudge");
}

console.log("habitWeekdayRate + skipRiskHabits");
{
  // createdAt 70 days ago → ~10 prior same-weekday occurrences in the window.
  const created = T.addDays(new Date(), -70).toISOString();
  const st = T.normalizeState({ habits: [{ id: "h", name: "Gym", type: "check", createdAt: created }] });
  T.setState(st); T.resetRenderCaches();
  const today = new Date();
  const wd = T.habitWeekdayRate(st.habits[0], today.getDay());
  assert(wd && wd.rate === 0, "never done on this weekday → rate 0");
  // Today pending + weak weekday → in the risk list.
  const risky = T.skipRiskHabits(today);
  assert(risky.length === 1 && risky[0].habit.id === "h", "pending + weak weekday → flagged as skip-risk");
  // Complete today → no longer pending → drops off.
  setDone(st, "h", today, 1); T.resetRenderCaches();
  assert(T.skipRiskHabits(today).length === 0, "completed today → not at risk");
}
{
  // A brand-new habit (createdAt today) has no real history → never flagged.
  const st = T.normalizeState({ habits: [{ id: "h", name: "New", type: "check" }] });
  T.setState(st); T.resetRenderCaches();
  assert(T.habitWeekdayRate(st.habits[0], new Date().getDay()) === null, "new habit → no weekday history");
  assert(T.skipRiskHabits(new Date()).length === 0, "new habit → not flagged as skip-risk");
}
{
  // Strong weekday history → not flagged.
  const created = T.addDays(new Date(), -70).toISOString();
  const st = T.normalizeState({ habits: [{ id: "h", name: "Gym", type: "check", createdAt: created }] });
  T.setState(st);
  const today = new Date();
  for (let w = 1; w <= 10; w++) setDone(st, "h", T.addDays(today, -7 * w), 1); // every prior same-weekday done
  T.resetRenderCaches();
  const wd = T.habitWeekdayRate(st.habits[0], today.getDay());
  assert(wd.rate === 1, "always done on this weekday → rate 1");
  assert(T.skipRiskHabits(today).length === 0, "strong weekday → not flagged");
}

console.log("adaptiveTargetSuggestion");
{
  const created = T.addDays(new Date(), -30).toISOString();
  const st = T.normalizeState({ habits: [{ id: "h", name: "Water", type: "count", target: 4, increment: 1, createdAt: created }] });
  T.setState(st);
  for (let i = 1; i <= 21; i++) setDone(st, "h", T.addDays(new Date(), -i), 2); // consistently only 2 of 4
  T.resetRenderCaches();
  const sug = T.adaptiveTargetSuggestion(st.habits[0]);
  assert(sug && sug.suggested === 2 && sug.current === 4, "avg ~2 vs target 4 → suggest 2");
}
{
  const created = T.addDays(new Date(), -30).toISOString();
  const st = T.normalizeState({ habits: [{ id: "h", name: "Water", type: "count", target: 4, increment: 1, createdAt: created }] });
  T.setState(st);
  for (let i = 1; i <= 21; i++) setDone(st, "h", T.addDays(new Date(), -i), 4); // hits target
  T.resetRenderCaches();
  assert(T.adaptiveTargetSuggestion(st.habits[0]) === null, "hitting target → no suggestion");
}
{
  // createdAt 4 days ago → fewer than 7 scheduled days of history → null.
  const created = T.addDays(new Date(), -4).toISOString();
  const st = T.normalizeState({ habits: [{ id: "h", name: "Read", type: "count", target: 3, increment: 1, createdAt: created }] });
  T.setState(st);
  for (let i = 1; i <= 3; i++) setDone(st, "h", T.addDays(new Date(), -i), 1);
  T.resetRenderCaches();
  assert(T.adaptiveTargetSuggestion(st.habits[0]) === null, "too little history (< 7 days) → null");
}

console.log("momentumForecast");
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "Gym", type: "check" }] });
  T.setState(st);
  for (let i = 1; i <= 4; i++) setDone(st, "h", T.addDays(new Date(), -i), 1); // 4-day streak, today pending
  T.resetRenderCaches();
  const morning = new Date(); morning.setHours(9, 0, 0, 0);
  const f = T.momentumForecast(st.habits, morning);
  assert(f && f.level === "watch", "streak pending in the morning → watch");
  const late = new Date(); late.setHours(21, 0, 0, 0);
  assert(T.momentumForecast(st.habits, late).level === "risk", "streak pending late → risk");
  // Complete today → safe.
  setDone(st, "h", new Date(), 1); T.resetRenderCaches();
  assert(T.momentumForecast(st.habits, morning).level === "safe", "all streaks done → safe");
}
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "New", type: "check" }] });
  T.setState(st); T.resetRenderCaches();
  assert(T.momentumForecast(st.habits, new Date()) === null, "no streaks → null");
}

console.log("recordDoseClock + suggestDoseTime + doseTimingSuggestions");
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "ACV", type: "count", target: 2, increment: 1, reminderTimes: ["08:00", "20:00"] }] });
  st.doseClock = { h: { 1: { samples: [430, 430, 430, 430, 430], updatedAt: 1 } } }; // dose 2 done ~07:10
  T.setState(st); T.resetRenderCaches();
  assert(T.suggestDoseTime("h", 1) === "07:10", "median of dose-2 samples → 07:10");
  assert(T.suggestDoseTime("h", 0) === null, "no samples for dose 1 → null");
  const s = T.doseTimingSuggestions();
  assert(s.length === 1 && s[0].doseIndex === 1 && s[0].suggested === "07:10", "dose 2 scheduled 20:00 but done 07:10 → suggestion");
}

console.log("doseClock normalize + merge");
{
  const st = T.normalizeState({ habits: [], doseClock: { h: { 0: { samples: [10, 9999, -5, 20], updatedAt: 3 } } } });
  assert(st.doseClock.h[0].samples.length === 2, "out-of-range dose samples filtered");
}
{
  const local = T.normalizeState({ habits: [], doseClock: { h: { 0: { samples: [100], updatedAt: 100 } } } });
  const remote = T.normalizeState({ habits: [], doseClock: { h: { 0: { samples: [200, 210], updatedAt: 200 } } } });
  const merged = T.mergeStates(local, remote);
  assert(merged.doseClock.h[0].updatedAt === 200 && merged.doseClock.h[0].samples.length === 2, "newer dose-clock record wins");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
