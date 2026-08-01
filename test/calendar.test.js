// Tests the per-habit month calendar builder + timeAgo helper.
// Run: node test/calendar.test.js
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

function countMatches(str, re) { return (str.match(re) || []).length; }

console.log("buildMonthCalendar structure");
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "H", color: "#123456", days: [0,1,2,3,4,5,6] }] });
  T.setState(st); T.resetRenderCaches();
  const html = T.buildMonthCalendar(st.habits[0], 0);
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  // Day-number cells (non-empty) should equal days in month.
  const dayCells = countMatches(html, /class="mc-cell [^"]*"[^>]*>\d+</g);
  assert(dayCells === daysInMonth, `renders ${daysInMonth} day cells for this month`);
  assert(/mc-today/.test(html), "marks today");
  assert(/mcPrev/.test(html) && /mcNext/.test(html), "has prev/next nav");
  assert(/disabled/.test(html), "next disabled on current month (offset 0)");
}

console.log("buildMonthCalendar reflects completions");
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "H", color: "#ff0000", days: [0,1,2,3,4,5,6] }] });
  T.setState(st); T.resetRenderCaches();
  const k = T.dateKey(new Date()); // today is always in the current-month grid
  (st.completions[k] = st.completions[k] || {})["h"] = 1;
  T.resetRenderCaches();
  const html = T.buildMonthCalendar(st.habits[0], 0);
  assert(/class="mc-cell done/.test(html), "a completed day renders as done");
}

console.log("buildMonthCalendar past month has enabled next");
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "H", days: [0,1,2,3,4,5,6] }] });
  T.setState(st); T.resetRenderCaches();
  const html = T.buildMonthCalendar(st.habits[0], -1);
  // The next button should NOT be disabled when viewing a past month.
  assert(/id="mcNext"[^>]*>/.test(html) && !/id="mcNext"[^>]*disabled/.test(html), "next enabled for a past month");
}

console.log("timeAgo");
{
  assert(T.timeAgo(0) === "never", "no timestamp → never");
  assert(T.timeAgo(Date.now()) === "just now", "now → just now");
  assert(/min ago/.test(T.timeAgo(Date.now() - 5 * 60000)), "5 min → minutes ago");
  assert(/hr ago/.test(T.timeAgo(Date.now() - 3 * 3600000)), "3h → hours ago");
  assert(/day/.test(T.timeAgo(Date.now() - 2 * 86400000)), "2 days → days ago");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
