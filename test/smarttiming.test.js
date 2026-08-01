// Tests smart reminder timing: recording completion clock, median suggestion,
// difference-based suggestions, and completionClock normalize + merge.
// Run: node test/smarttiming.test.js
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

console.log("suggestReminderTime");
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "H", reminderTime: "08:00" }] });
  // 6 samples around 07:10 (430 min)
  st.completionClock = { h: { samples: [425, 430, 435, 428, 432, 430], updatedAt: 1 } };
  T.setState(st); T.resetRenderCaches();
  assert(T.suggestReminderTime("h") === "07:10", "median of samples → 07:10");
}
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "H" }] });
  st.completionClock = { h: { samples: [420, 430], updatedAt: 1 } }; // < 5 samples
  T.setState(st); T.resetRenderCaches();
  assert(T.suggestReminderTime("h") === null, "too few samples → null");
}

console.log("recordCompletionClock (today)");
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "H" }] });
  T.setState(st); T.resetRenderCaches();
  T.recordCompletionClock("h", new Date());
  assert(st.completionClock.h && st.completionClock.h.samples.length === 1, "records a sample for today");
  T.recordCompletionClock("h", T.addDays(new Date(), -2)); // not today → ignored
  assert(st.completionClock.h.samples.length === 1, "ignores non-today dates");
}

console.log("smartTimingSuggestions (diff >= 45 min)");
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "H", reminderTime: "09:00" }] });
  st.completionClock = { h: { samples: [430, 430, 430, 430, 430], updatedAt: 1 } }; // 07:10
  T.setState(st); T.resetRenderCaches();
  const s = T.smartTimingSuggestions();
  assert(s.length === 1 && s[0].suggested === "07:10", "suggests when >45min off");
}
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "H", reminderTime: "07:15" }] });
  st.completionClock = { h: { samples: [430, 430, 430, 430, 430], updatedAt: 1 } }; // 07:10, ~5 min off
  T.setState(st); T.resetRenderCaches();
  assert(T.smartTimingSuggestions().length === 0, "no suggestion when close to current");
}

console.log("completionClock normalize + merge");
{
  const st = T.normalizeState({ habits: [], completionClock: { h: { samples: [10, 9999, -5, 20], updatedAt: 3 } } });
  assert(st.completionClock.h.samples.length === 2, "out-of-range samples filtered");
}
{
  const local = T.normalizeState({ habits: [], completionClock: { h: { samples: [100], updatedAt: 100 } } });
  const remote = T.normalizeState({ habits: [], completionClock: { h: { samples: [200, 210], updatedAt: 200 } } });
  const merged = T.mergeStates(local, remote);
  assert(merged.completionClock.h.updatedAt === 200 && merged.completionClock.h.samples.length === 2, "newer clock record wins");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
