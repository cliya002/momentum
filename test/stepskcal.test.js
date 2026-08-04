// Tests the steps → calories estimate (Progress tab).
// Run: node test/stepskcal.test.js
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

console.log("stepsToKcal (steps → calories)");
{
  // 20k steps, 180 lb, no height → default 0.75 m stride = 15 km.
  // 81.65 kg × 15 km × 0.9 ≈ 1102 kcal.
  const r = T.stepsToKcal(20000, 180, 0);
  assert(r.km === 15, "20k steps × 0.75 m stride = 15 km (" + r.km + ")");
  assert(Math.abs(r.miles - 9.3) < 0.1, "≈ 9.3 miles (" + r.miles + ")");
  assert(r.kcal > 1050 && r.kcal < 1150, "≈ 1100 kcal for 180 lb (" + r.kcal + ")");

  // Heavier person burns more for the same steps.
  const heavy = T.stepsToKcal(20000, 220, 0);
  assert(heavy.kcal > r.kcal, "heavier → more calories for same steps");

  // Height sets a proper stride: 175 cm → 0.7245 m, so distance is a bit less.
  const withH = T.stepsToKcal(20000, 180, 175);
  assert(withH.strideM === 0.72, "stride ≈ 0.414 × height (0.72 m at 175 cm)");
  assert(withH.km < r.km, "height-based stride (0.72) < default (0.75) → shorter distance");

  // Scales linearly with steps.
  const half = T.stepsToKcal(10000, 180, 0);
  assert(Math.abs(half.kcal - r.kcal / 2) <= 1, "10k steps ≈ half the calories of 20k");

  // Guards: no steps / no weight → null.
  assert(T.stepsToKcal(0, 180, 0) === null, "no steps → null");
  assert(T.stepsToKcal(20000, 0, 0) === null, "no weight → null");
  assert(T.stepsToKcal(20000, null, 170) === null, "null weight → null");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
