// Tests activity log: logActivity, normalize (cap/sort), and merge (dedup/union).
// Run: node test/activity.test.js
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

console.log("logActivity");
{
  const st = T.normalizeState({ habits: [] });
  T.setState(st);
  T.logActivity("create", "Added Meditate");
  T.logActivity("delete", "Deleted Run");
  assert(st.activity.length === 2, "entries recorded");
  assert(st.activity[0].text === "Deleted Run", "newest first");
  assert(st.activity[0].ts > 0 && st.activity[0].type === "delete", "has ts + type");
}
{
  const st = T.normalizeState({ habits: [] });
  T.setState(st);
  for (let i = 0; i < 60; i++) T.logActivity("edit", "change " + i);
  assert(st.activity.length === 50, "capped at 50 entries");
}

console.log("normalize (sort + cap)");
{
  const arr = [];
  for (let i = 0; i < 60; i++) arr.push({ ts: i, type: "x", text: "t" + i });
  const st = T.normalizeState({ habits: [], activity: arr });
  assert(st.activity.length === 50, "normalize caps at 50");
  assert(st.activity[0].ts === 59, "sorted newest first");
}
{
  const st = T.normalizeState({ habits: [], activity: [{ text: "no ts" }] });
  assert(st.activity.length === 0, "entries without ts dropped");
}

console.log("merge (union + dedup)");
{
  const local = T.normalizeState({ habits: [], activity: [{ ts: 100, type: "a", text: "one" }] });
  const remote = T.normalizeState({ habits: [], activity: [{ ts: 200, type: "b", text: "two" }, { ts: 100, type: "a", text: "one" }] });
  const merged = T.mergeStates(local, remote);
  assert(merged.activity.length === 2, "duplicate (same ts+text) collapsed");
  assert(merged.activity[0].ts === 200, "newest first after merge");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
