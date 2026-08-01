// Tests smart template application (auto reminder time + dose message).
// Run: node test/template.test.js
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

console.log("clockFromTimeStr");
assert(T.clockFromTimeStr("8:00 AM · with meal 1") === "08:00", "'8:00 AM …' → 08:00");
assert(T.clockFromTimeStr("10:30 PM") === "22:30", "'10:30 PM' → 22:30");
assert(T.clockFromTimeStr("12:00 AM") === "00:00", "'12:00 AM' → 00:00");
assert(T.clockFromTimeStr("Morning") === "", "'Morning' → no clock");
assert(T.clockFromTimeStr("All day") === "", "'All day' → no clock");

console.log("habitFromTemplate (smart defaults)");
{
  const h = T.habitFromTemplate({ name: "D3+K2", category: "Supplements", time: "8:00 AM · with meal 1", notes: "5000 IU" });
  assert(h.reminderTime === "08:00", "auto reminder time from clock");
  assert(h.reminderMsg === "5000 IU", "supplement dose carried into reminder message");
  assert(!!h.id && !!h.createdAt && !!h.updatedAt, "gets id/timestamps");
}
{
  const h = T.habitFromTemplate({ name: "Walk", category: "Fitness", time: "Morning", notes: "10k steps" });
  assert(!h.reminderTime, "no reminder for non-clock time");
  assert(!h.reminderMsg, "non-supplement doesn't auto-set reminder message");
}
{
  const h = T.habitFromTemplate({ name: "Stretch", category: "Fitness", time: "All day" }, { defaultReminder: "07:30" });
  assert(h.reminderTime === "07:30", "falls back to provided default reminder");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
