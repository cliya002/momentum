// Tests multi-reminder day-part placement (dayPartsForHabit) so a twice-a-day
// habit appears in more than one Today group.
// Run: node test/daypart.test.js
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

console.log("dayPartForTime");
assert(T.dayPartForTime("08:00") === "morning", "08:00 → morning");
assert(T.dayPartForTime("20:00") === "evening", "20:00 → evening");
assert(T.dayPartForTime("13:00") === "midday", "13:00 → midday");

console.log("dayPartsForHabit");
{
  const h = { reminderTimes: ["08:00", "20:00"], time: "8:00 AM & 8:00 PM" };
  const parts = T.dayPartsForHabit(h, 1);
  assert(parts.includes("morning") && parts.includes("evening"), "8am+8pm → morning AND evening");
  assert(parts.length === 2, "exactly two parts");
}
{
  // two reminders in the same part → single part, no duplication
  const h = { reminderTimes: ["08:00", "09:00"], time: "8:00 AM" };
  const parts = T.dayPartsForHabit(h, 1);
  assert(parts.length === 1 && parts[0] === "morning", "two morning times → one morning bucket");
}
{
  // single reminder → single part from its time
  const h = { reminderTimes: ["20:00"], time: "8:00 PM" };
  const parts = T.dayPartsForHabit(h, 1);
  assert(parts.length === 1 && parts[0] === "evening", "single evening time → evening only");
}
{
  // no reminders → falls back to the habit's time field
  const h = { reminderTimes: [], time: "Morning" };
  const parts = T.dayPartsForHabit(h, 1);
  assert(parts.length === 1 && parts[0] === "morning", "no reminders uses time field");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
