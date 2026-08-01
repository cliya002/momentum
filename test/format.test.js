// Tests 12h/24h time formatting.
// Run: node test/format.test.js
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const versionSrc = fs.readFileSync(path.join(root, "version.js"), "utf8");
const appSrc = fs.readFileSync(path.join(root, "app.js"), "utf8");

// Minimal localStorage stub so timeFmt() can read the preference.
const store = {};
const sandbox = {};
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
new Function("self", "localStorage", versionSrc + "\n" + appSrc)(sandbox, global.localStorage);
const T = sandbox.__momentumTest;

let pass = 0, fail = 0;
function assert(c, m) { if (c) { pass++; console.log("  ✓ " + m); } else { fail++; console.log("  ✗ FAIL: " + m); } }

console.log("fmtClockLabel 12h vs 24h");
store["ht_time_format"] = "12";
assert(T.fmtClockLabel("15:30") === "3:30 PM", "12h: 15:30 → 3:30 PM");
assert(T.fmtClockLabel("00:05") === "12:05 AM", "12h: 00:05 → 12:05 AM");
assert(T.fmtClockLabel("09:00") === "9:00 AM", "12h: 09:00 → 9:00 AM");
store["ht_time_format"] = "24";
assert(T.fmtClockLabel("15:30") === "15:30", "24h: 15:30 → 15:30");
assert(T.fmtClockLabel("09:00") === "09:00", "24h: 09:00 → 09:00");
assert(T.fmtClockLabel("00:05") === "00:05", "24h: 00:05 → 00:05");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
