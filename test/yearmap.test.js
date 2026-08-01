// Tests the year-in-pixels data: dayAdherenceBucket + yearHeatmapCells.
// Run: node test/yearmap.test.js
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

console.log("dayAdherenceBucket");
{
  const st = T.normalizeState({ habits: [
    { id: "a", name: "A", days: [0,1,2,3,4,5,6] },
    { id: "b", name: "B", days: [0,1,2,3,4,5,6] },
  ] });
  T.setState(st); T.resetRenderCaches();
  const d = T.addDays(new Date(), -1);
  const k = T.dateKey(d);
  assert(T.dayAdherenceBucket(d) === "0", "scheduled, none done → bucket 0");
  (st.completions[k] = st.completions[k] || {})["a"] = 1;
  T.resetRenderCaches();
  assert(T.dayAdherenceBucket(d) === "2", "1 of 2 done → mid bucket 2");
  st.completions[k]["b"] = 1;
  T.resetRenderCaches();
  assert(T.dayAdherenceBucket(d) === "4", "all done → bucket 4");
}
{
  const st = T.normalizeState({ habits: [{ id: "a", name: "A", days: [1] }] }); // Mondays only
  T.setState(st); T.resetRenderCaches();
  const future = T.addDays(new Date(), 10);
  assert(T.dayAdherenceBucket(future) === "future", "future day → future");
}
{
  const st = T.normalizeState({ habits: [] });
  T.setState(st); T.resetRenderCaches();
  assert(T.dayAdherenceBucket(T.addDays(new Date(), -1)) === "none", "nothing scheduled → none");
}

console.log("yearHeatmapCells");
{
  const st = T.normalizeState({ habits: [{ id: "a", name: "A", days: [0,1,2,3,4,5,6] }] });
  T.setState(st); T.resetRenderCaches();
  const cells = T.yearHeatmapCells();
  assert(cells.length === 53 * 7, "produces 53×7 cells");
  assert(cells.every((c) => c.date && c.bucket), "each cell has a date and bucket");
  assert(cells[cells.length - 1].date >= cells[0].date, "cells are chronological");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
