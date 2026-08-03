// Tests the pure rest-day impact summary used in the Progress tab.
// Run: node test/restimpact.test.js
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

console.log("computeRestImpact (rest-day impact summary)");
{
  // Empty / no rest days.
  const z = T.computeRestImpact([]);
  assert(z.restCount === 0 && z.protectedCheckins === 0, "empty → zero counts");
  assert(z.energyDelta === null, "no energy data → null delta");

  const none = T.computeRestImpact([
    { isRest: false, energy: 4, afterRest: false },
    { isRest: false, energy: 3, afterRest: false },
  ]);
  assert(none.restCount === 0, "no rest days counted");

  // Counts rest days and sums protected check-ins from rest days only.
  const imp = T.computeRestImpact([
    { isRest: true, protected: 2, energy: null, afterRest: false },
    { isRest: false, protected: 5, energy: 4, afterRest: true },   // protected ignored on non-rest days
    { isRest: true, protected: 1, energy: null, afterRest: false },
    { isRest: false, protected: 0, energy: 3, afterRest: false },
  ]);
  assert(imp.restCount === 2, "counts 2 rest days");
  assert(imp.protectedCheckins === 3, "sums protected only from rest days (2+1=3), got " + imp.protectedCheckins);

  // Energy comparison: day-after-rest vs other days (rest days themselves excluded).
  const en = T.computeRestImpact([
    { isRest: true, protected: 0, energy: 5, afterRest: false },   // rest day energy excluded from both
    { isRest: false, protected: 0, energy: 5, afterRest: true },   // after rest
    { isRest: false, protected: 0, energy: 4, afterRest: true },   // after rest
    { isRest: false, protected: 0, energy: 3, afterRest: false },  // other
    { isRest: false, protected: 0, energy: 3, afterRest: false },  // other
  ]);
  assert(Math.abs(en.energyAfterRest - 4.5) < 1e-9, "avg energy after rest = 4.5 (" + en.energyAfterRest + ")");
  assert(Math.abs(en.energyOther - 3) < 1e-9, "avg other-day energy = 3 (" + en.energyOther + ")");
  assert(Math.abs(en.energyDelta - 1.5) < 1e-9, "delta = +1.5 (" + en.energyDelta + ")");
  assert(en.afterCount === 2, "counts 2 after-rest energy samples");

  // Missing energy values are skipped, not treated as zero.
  const miss = T.computeRestImpact([
    { isRest: false, energy: null, afterRest: true },
    { isRest: false, energy: 4, afterRest: true },
    { isRest: false, energy: null, afterRest: false },
  ]);
  assert(miss.energyAfterRest === 4, "null energy skipped in after-rest avg");
  assert(miss.energyOther === null, "no other-day energy → null (not 0)");
  assert(miss.energyDelta === null, "one side missing → null delta");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
