// Tests the forecast exercise-burn basis: today's burn vs the 14-day average.
// Run: node test/exercisebasis.test.js
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

console.log("effectiveExerciseBurn (today vs 14-day average)");
{
  const today = T.dateKey(new Date());
  const byDay = { [today]: 600 };
  // 6 prior days at 100 each → 14-day average = (600 + 600)/14 = 85.71 → 86.
  for (let i = 1; i <= 6; i++) byDay[T.dateKey(T.addDays(new Date(), -i))] = 100;

  const avg = T.avgExerciseKcal(byDay, 14);
  assert(avg === 86, "14-day average spreads over 14 days incl. zero days (" + avg + ")");

  // Default basis (undefined / "avg") → uses the 14-day average.
  assert(T.effectiveExerciseBurn({ exerciseByDay: byDay }) === 86, "no basis → 14-day average (86)");
  assert(T.effectiveExerciseBurn({ exerciseByDay: byDay, exerciseBasis: "avg" }) === 86, "'avg' basis → 14-day average (86)");

  // "today" basis → uses today's burn only.
  assert(T.effectiveExerciseBurn({ exerciseByDay: byDay, exerciseBasis: "today" }) === 600, "'today' basis → today's burn (600)");

  // No exercise today with "today" basis → 0 (rest day projects no exercise burn).
  const noToday = { [T.dateKey(T.addDays(new Date(), -1))]: 300 };
  assert(T.effectiveExerciseBurn({ exerciseByDay: noToday, exerciseBasis: "today" }) === 0, "no workout today + today basis → 0");
  assert(T.effectiveExerciseBurn({ exerciseByDay: {}, exerciseBasis: "today" }) === 0, "empty history → 0");
  assert(T.effectiveExerciseBurn({}) === 0, "no history at all → 0");

  // Projection differs: a 600-kcal day yields a bigger 7-day loss than an 86 avg.
  const fToday = T.calorieForecast({ weightLb: 200, caloriesIn: 2000, baseBurn: 2200, exerciseBurn: 600, metric: false });
  const fAvg = T.calorieForecast({ weightLb: 200, caloriesIn: 2000, baseBurn: 2200, exerciseBurn: 86, metric: false });
  const wkToday = fToday.horizons.find((h) => h.days === 7).changeDisp;
  const wkAvg = fAvg.horizons.find((h) => h.days === 7).changeDisp;
  assert(wkToday > wkAvg, "today's higher burn → larger 7-day projected loss (" + wkToday + " > " + wkAvg + ")");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
