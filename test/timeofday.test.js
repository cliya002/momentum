// Tests bulk "Time of day" from reminder times: timeSummaryFromReminders and
// applyTimeFromReminders (fill blanks/auto vs. overwrite custom labels).
// Run: node test/timeofday.test.js
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const versionSrc = fs.readFileSync(path.join(root, "version.js"), "utf8");
const appSrc = fs.readFileSync(path.join(root, "app.js"), "utf8");
// Minimal localStorage stub so timeFmt()/fmtClockLabel() work in Node.
const store = { ht_time_format: "12" };
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
const sandbox = {};
new Function("self", "localStorage", versionSrc + "\n" + appSrc)(sandbox, global.localStorage);
const T = sandbox.__momentumTest;

let pass = 0, fail = 0;
function assert(c, m) { if (c) { pass++; console.log("  ✓ " + m); } else { fail++; console.log("  ✗ FAIL: " + m); } }

console.log("timeSummaryFromReminders");
{
  assert(T.timeSummaryFromReminders({ reminderTimes: ["08:00", "20:00"] }) === "8:00 AM & 8:00 PM", "two times → sorted 12h summary");
  assert(T.timeSummaryFromReminders({ reminderTimes: ["20:00", "08:00"] }) === "8:00 AM & 8:00 PM", "unsorted input is sorted");
  assert(T.timeSummaryFromReminders({ reminderTime: "07:30" }) === "7:30 AM", "legacy single reminderTime");
  assert(T.timeSummaryFromReminders({ reminderTimes: [] }) === "", "no times → empty");
  assert(T.timeSummaryFromReminders({}) === "", "nothing → empty");
}

console.log("isAutoTimeSummary");
{
  assert(T.isAutoTimeSummary("") === true, "empty is auto");
  assert(T.isAutoTimeSummary("8:00 AM & 8:00 PM") === true, "clock summary is auto");
  assert(T.isAutoTimeSummary("8:00 AM · with meal") === false, "custom label is not auto");
  assert(T.isAutoTimeSummary("Morning") === false, "word label is not auto");
}

console.log("applyTimeFromReminders — fill blanks + auto, keep custom");
{
  const st = T.normalizeState({ habits: [
    { id: "a", name: "Blank", reminderTimes: ["08:00"], time: "" },
    { id: "b", name: "Auto", reminderTimes: ["08:00", "20:00"], time: "9:00 AM" },
    { id: "c", name: "Custom", reminderTimes: ["08:00"], time: "8:00 AM · with meal" },
    { id: "d", name: "NoReminder", time: "" },
  ] });
  T.setState(st);
  const n = T.applyTimeFromReminders(false);
  const byId = (id) => st.habits.find((h) => h.id === id);
  assert(byId("a").time === "8:00 AM", "blank filled from reminders");
  assert(byId("b").time === "8:00 AM & 8:00 PM", "auto clock summary refreshed");
  assert(byId("c").time === "8:00 AM · with meal", "custom label preserved (not overwritten)");
  assert(byId("d").time === "", "habit with no reminders untouched");
  assert(n === 2, "reports 2 updated (blank + auto)");
}

console.log("applyTimeFromReminders — overwrite replaces custom too");
{
  const st = T.normalizeState({ habits: [
    { id: "c", name: "Custom", reminderTimes: ["08:00", "20:00"], time: "with meal" },
  ] });
  T.setState(st);
  const n = T.applyTimeFromReminders(true);
  assert(st.habits[0].time === "8:00 AM & 8:00 PM", "custom label replaced when overwrite=true");
  assert(n === 1, "reports 1 updated");
}

console.log("applyTimeFromReminders — no-op when already matching");
{
  const st = T.normalizeState({ habits: [
    { id: "a", name: "Match", reminderTimes: ["08:00"], time: "8:00 AM" },
  ] });
  T.setState(st);
  assert(T.applyTimeFromReminders(false) === 0, "already-matching habit → 0 changes");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
