// Tests the goal on-track status + required-vs-actual pace (Progress goal card).
// Run: node test/goalstatus.test.js
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

// Fixed "today" so date math is deterministic. Target date is 10 weeks out.
const today = "2026-01-01";
const in10wk = "2026-03-12"; // ~10 weeks after Jan 1

console.log("goalStatus (weight goal tracking)");
{
  // Reached: at or past target (losing).
  const r = T.goalStatus({ startLb: 220, latestLb: 180, targetLb: 185, avgPerWeekLb: -1, today });
  assert(r.status === "reached" && r.reached, "below target → reached");

  // Missing inputs → null.
  assert(T.goalStatus({ startLb: 200, latestLb: 190 }) === null, "no target → null");

  // Losing, need 2 lb/wk over 10 weeks (200→180). Actual −2/wk → on track.
  const onT = T.goalStatus({ startLb: 220, latestLb: 200, targetLb: 180, avgPerWeekLb: -2, targetDate: in10wk, today });
  assert(onT.status === "onTrack", "actual pace meets required → on track (" + onT.status + ")");
  assert(Math.abs(onT.requiredPerWeekLb - (-2)) < 0.05, "required ≈ -2 lb/wk (" + onT.requiredPerWeekLb + ")");
  assert(Math.abs(onT.projectedByDateLb - 180) < 0.5, "projects ~180 lb by the date (" + onT.projectedByDateLb + ")");

  // Faster than required (−3/wk vs −2 needed) → ahead.
  const ahead = T.goalStatus({ startLb: 220, latestLb: 200, targetLb: 180, avgPerWeekLb: -3, targetDate: in10wk, today });
  assert(ahead.status === "ahead", "well above required pace → ahead (" + ahead.status + ")");

  // Slower than required (−1/wk vs −2 needed) → behind.
  const behind = T.goalStatus({ startLb: 220, latestLb: 200, targetLb: 180, avgPerWeekLb: -1, targetDate: in10wk, today });
  assert(behind.status === "behind", "under required pace → behind (" + behind.status + ")");
  assert(behind.projectedByDateLb > 180, "behind → projected weight above target (" + behind.projectedByDateLb + ")");

  // Gaining while the goal is to lose → wrong direction.
  const wrong = T.goalStatus({ startLb: 220, latestLb: 200, targetLb: 180, avgPerWeekLb: 1, targetDate: in10wk, today });
  assert(wrong.status === "wrongWay" && !wrong.onRightPath, "moving away from goal → wrong direction");

  // No target date: on the right path is enough for on-track (no pace numbers).
  const noDate = T.goalStatus({ startLb: 220, latestLb: 200, targetLb: 180, avgPerWeekLb: -1 });
  assert(noDate.status === "onTrack" && noDate.requiredPerWeekLb === null, "no date + losing → on track, no required pace");
  const noDateWrong = T.goalStatus({ startLb: 220, latestLb: 200, targetLb: 180, avgPerWeekLb: 0.5 });
  assert(noDateWrong.status === "wrongWay", "no date + gaining → wrong direction");

  // Target date already passed, still short → behind.
  const passed = T.goalStatus({ startLb: 220, latestLb: 195, targetLb: 180, avgPerWeekLb: -1, targetDate: "2025-06-01", today });
  assert(passed.status === "behind", "past target date + still short → behind");

  // A gain goal (bulking): target above start, gaining → on track.
  const bulk = T.goalStatus({ startLb: 150, latestLb: 155, targetLb: 170, avgPerWeekLb: 1.5, targetDate: in10wk, today });
  assert(bulk.onRightPath && (bulk.status === "onTrack" || bulk.status === "ahead"), "gain goal + gaining → on track/ahead (" + bulk.status + ")");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
