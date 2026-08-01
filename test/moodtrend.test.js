// Tests mood trend data (moodTrendData).
// Run: node test/moodtrend.test.js
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

console.log("moodTrendData");
{
  const st = T.normalizeState({ habits: [] });
  const t = T.dateKey(new Date());
  const y = T.dateKey(T.addDays(new Date(), -1));
  st.moods = { [t]: { mood: 4, updatedAt: 1 }, [y]: { mood: 2, updatedAt: 1 } };
  T.setState(st); T.resetRenderCaches();
  const data = T.moodTrendData(30);
  assert(data.length === 30, "returns 30 days");
  assert(data[data.length - 1].mood === 4, "last entry is today's mood");
  assert(data[data.length - 2].mood === 2, "yesterday's mood present");
  assert(data[0].mood === null, "untapped days are null");
  // chronological
  assert(data[1].date > data[0].date, "oldest → newest order");
}
{
  const st = T.normalizeState({ habits: [] });
  st.moods = {};
  T.setState(st); T.resetRenderCaches();
  const data = T.moodTrendData(7);
  assert(data.length === 7 && data.every((x) => x.mood === null), "no moods → all null");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
