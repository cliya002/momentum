// Tests isAutoTimeSummary — decides whether the "Time of day" field is a
// plain auto-generated time summary (safe to refresh) or custom user text.
// Run: node test/timesummary.test.js
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

console.log("auto (safe to overwrite)");
assert(T.isAutoTimeSummary("") === true, "empty");
assert(T.isAutoTimeSummary("8:00 AM") === true, "single 12h time");
assert(T.isAutoTimeSummary("8:00 AM & 8:00 PM") === true, "two times joined with &");
assert(T.isAutoTimeSummary("08:00 & 20:00") === true, "24h times");
assert(T.isAutoTimeSummary("8:00 AM & 1:00 PM & 8:00 PM") === true, "three times");

console.log("custom (leave alone)");
assert(T.isAutoTimeSummary("8:00 AM · with meal 1") === false, "time + descriptive suffix");
assert(T.isAutoTimeSummary("Morning") === false, "word label");
assert(T.isAutoTimeSummary("All day") === false, "all day");
assert(T.isAutoTimeSummary("post-workout") === false, "free text");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
