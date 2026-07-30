// Tests the schedule text parser + auto-fit suggestion logic.
// Run: node test/schedule.test.js
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

console.log("Schedule text parser");
{
  const p = T.parseScheduleText("Mon 9:00 - 17:00\nTue 9am-5pm\nWed off\nThu 12:00-20:00\nFri 8-4");
  assert(p[1] && p[1].start === "09:00" && p[1].end === "17:00", "Mon 24h range");
  assert(p[2] && p[2].start === "09:00" && p[2].end === "17:00", "Tue 12h am/pm range");
  assert(p[3] && p[3].off === true, "Wed off");
  assert(p[4] && p[4].start === "12:00" && p[4].end === "20:00", "Thu afternoon shift");
  assert(p[5] && p[5].start === "08:00" && p[5].end === "16:00", "Fri '8-4' → 8:00–16:00 (PM assumed)");
}
{
  const p = T.parseScheduleText("Saturday: 10:30 AM to 6:30 PM");
  assert(p[6] && p[6].start === "10:30" && p[6].end === "18:30", "Saturday 'to' separator + am/pm");
}
{
  const p = T.parseScheduleText("random text with no schedule");
  assert(Object.keys(p).length === 0, "non-schedule text → nothing");
}

console.log("Auto-fit suggestion (suggestFit)");
{
  // work 9:00(540)–17:00(1020); a habit at 10:00(600) should move out of work
  const s = T.suggestFit(600, 540, 1020);
  assert(s < 540 || s >= 1020, "conflicting habit moved outside work hours");
  // habit near end of shift → after work
  const s2 = T.suggestFit(1000, 540, 1020);
  assert(s2 >= 1020, "late-shift habit moved to after work");
}

console.log("effectiveTime (per-day override)");
{
  const habit = { time: "6:30 AM", dayTimes: { 3: "8:00 PM" } };
  assert(T.effectiveTime(habit, 1) === "6:30 AM", "no override → base time");
  assert(T.effectiveTime(habit, 3) === "8:00 PM", "Wed override applies");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
