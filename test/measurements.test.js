// Regression: a rest-day-only entry (undefined numeric fields, pre-normalization)
// must NOT be treated as a real weight/waist/energy measurement.
// Run: node test/measurements.test.js
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

console.log("measurementsWithWeight ignores rest-day-only entries");
{
  const st = T.defaultState();
  // A real weight entry, and a rest-day-only entry created at runtime (undefined
  // numeric fields — this is exactly what toggleRestDay produces before reload).
  st.measurements = {
    "2026-08-01": { date: "2026-08-01", weight: 250, waist: null, energy: null, strengthTrend: "", notes: "", updatedAt: 1 },
    "2026-08-02": { date: "2026-08-02", restDay: true, updatedAt: 2 }, // undefined weight/waist/energy
  };
  T.setState(st);

  const wl = T.measurementsWithWeight();
  assert(wl.length === 1, "only the real weight entry counts (rest-only excluded), got " + wl.length);
  assert(wl[0].weight === 250, "the surviving entry has the logged weight");
  assert(wl.every((e) => e.weight != null), "no undefined/null weights slip through (no NaN source)");

  // The rest-only entry is also absent from the general list (nothing displayable).
  const list = T.measurementList();
  assert(list.length === 1, "rest-only entry excluded from measurementList too");

  // Sanity: an entry with only energy IS included (it has displayable data).
  const st2 = T.defaultState();
  st2.measurements = { "2026-08-03": { date: "2026-08-03", energy: 4, restDay: true, updatedAt: 1 } };
  T.setState(st2);
  assert(T.measurementList().length === 1, "energy-only entry is kept");
  assert(T.measurementsWithWeight().length === 0, "energy-only entry has no weight");

  // weeksElapsed on daily keys stays fractional and correct.
  assert(Math.abs(T.weeksElapsed("2026-08-01", "2026-08-08") - 1) < 1e-9, "7 days apart = 1.0 weeks");
  assert(T.weeksElapsed("2026-08-08", "2026-08-01") === 0, "reversed/negative span → 0");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
