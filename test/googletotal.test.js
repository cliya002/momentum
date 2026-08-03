// Tests the Google measured-burn averaging window (label days match the data).
// Run: node test/googletotal.test.js
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

// Build a {dateKey:kcal} map for the last `nComplete` COMPLETE days (excludes today).
function completeDays(nComplete, kcal) {
  const byDay = {};
  for (let i = 1; i <= nComplete; i++) byDay[T.dateKey(T.addDays(new Date(), -i))] = kcal;
  return byDay;
}

console.log("latestGoogleTotal (rolling window, days match data)");
{
  // Fewer complete days than the window → uses all of them; label days == data.
  const c10 = { totalByDay: completeDays(10, 2600) };
  const g10 = T.latestGoogleTotal(c10);
  assert(g10.days === 10, "10 complete days → averages 10 (not a fixed 7), got " + g10.days);
  assert(g10.kcal === 2600, "average of equal days = 2600");
  assert(g10.partial === false, "complete-day average is not partial");

  // More complete days than the window → caps at the 14-day window.
  const c30 = { totalByDay: completeDays(30, 2500) };
  const g30 = T.latestGoogleTotal(c30);
  assert(g30.days === 14, "30 complete days → capped at the 14-day window, got " + g30.days);

  // Today-only data → partial fallback (days: 0).
  const cToday = { totalByDay: { [T.dateKey(new Date())]: 1800 } };
  const gT = T.latestGoogleTotal(cToday);
  assert(gT.partial === true && gT.days === 0, "only today's data → partial, days 0");
  assert(gT.kcal === 1800, "partial uses today's value");

  // No data → null.
  assert(T.latestGoogleTotal({ totalByDay: {} }) === null, "no data → null");

  // avgByDayComplete uses the same rolling behaviour and excludes today.
  const mixed = Object.assign(completeDays(3, 300), { [T.dateKey(new Date())]: 9999 });
  assert(T.avgByDayComplete(mixed, 14) === 300, "avgByDayComplete excludes today's value");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
