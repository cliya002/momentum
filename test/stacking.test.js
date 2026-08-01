// Tests habit stacking (anchorId) + daily mood log persistence/merge and
// the mood↔completion insight.
// Run: node test/stacking.test.js
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

console.log("anchorId normalize");
{
  const st = T.normalizeState({ habits: [
    { id: "coffee", name: "Coffee" },
    { id: "vits", name: "Vitamins", anchorId: "coffee" },
  ] });
  assert(st.habits[1].anchorId === "coffee", "anchorId survives normalize");
  assert(st.habits[0].anchorId === "", "no anchor → empty string");
}
{
  const st = T.normalizeState({ habits: [{ id: "a", name: "A", anchorId: 12345 }] });
  assert(st.habits[0].anchorId === "", "non-string anchorId rejected");
}

console.log("moods normalize");
{
  const st = T.normalizeState({ habits: [], moods: {
    "2025-01-01": { mood: 4, updatedAt: 100 },
    "2025-01-02": { mood: 9, updatedAt: 100 }, // out of range
    "2025-01-03": { mood: 2 },
  } });
  assert(st.moods["2025-01-01"].mood === 4, "valid mood kept");
  assert(!st.moods["2025-01-02"], "out-of-range mood dropped");
  assert(st.moods["2025-01-03"].mood === 2 && st.moods["2025-01-03"].updatedAt > 0, "missing updatedAt defaulted");
}

console.log("moods merge (newest updatedAt wins, union)");
{
  const local = T.normalizeState({ habits: [], moods: { "2025-01-01": { mood: 2, updatedAt: 100 } } });
  const remote = T.normalizeState({ habits: [], moods: { "2025-01-01": { mood: 5, updatedAt: 200 }, "2025-01-02": { mood: 3, updatedAt: 100 } } });
  const merged = T.mergeStates(local, remote);
  assert(merged.moods["2025-01-01"].mood === 5, "newer mood wins");
  assert(merged.moods["2025-01-02"].mood === 3, "distinct days unioned");
}

console.log("moodCompletionInsight");
{
  // Build 8 past days: high mood + done, low mood + not done → positive correlation.
  const habits = [{ id: "h", name: "H", days: [0,1,2,3,4,5,6] }];
  const moods = {};
  const st = T.normalizeState({ habits });
  T.setState(st); T.resetRenderCaches();
  for (let i = 1; i <= 8; i++) {
    const d = T.addDays(new Date(), -i);
    const k = T.dateKey(d);
    const high = i % 2 === 0;
    st.moods[k] = { mood: high ? 5 : 1, updatedAt: 100 };
    if (high) (st.completions[k] = st.completions[k] || {})["h"] = 1;
  }
  T.resetRenderCaches();
  const ins = T.moodCompletionInsight();
  assert(ins && ins.icon && ins.text, "returns an insight when mood tracks completion");
}
{
  T.setState(T.normalizeState({ habits: [{ id: "h", name: "H" }] }));
  T.resetRenderCaches();
  assert(T.moodCompletionInsight() === null, "too little data → null");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
