// Tests keystone habit of the week: keystoneId, getKeystoneHabit, normalize, merge.
// Run: node test/keystone.test.js
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

const wkNow = () => T.dateKey(T.startOfWeekMonday(new Date()));

console.log("keystoneId / getKeystoneHabit");
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "Meditate" }] });
  st.keystone = { [wkNow()]: "h" };
  T.setState(st); T.resetRenderCaches();
  assert(T.keystoneId() === "h", "returns this week's keystone id");
  const kh = T.getKeystoneHabit();
  assert(kh && kh.id === "h", "resolves to the habit");
}
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "H" }] });
  st.keystone = {};
  T.setState(st); T.resetRenderCaches();
  assert(T.keystoneId() === null, "no keystone set → null");
  assert(T.getKeystoneHabit() === null, "no keystone habit → null");
}
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "H", archived: true }] });
  st.keystone = { [wkNow()]: "h" };
  T.setState(st); T.resetRenderCaches();
  assert(T.getKeystoneHabit() === null, "archived keystone habit not returned");
}

console.log("normalize");
{
  const st = T.normalizeState({ habits: [], keystone: { "2025-01-06": "abc", "2025-01-13": 123 } });
  assert(st.keystone["2025-01-06"] === "abc", "string keystone kept");
  assert(!("2025-01-13" in st.keystone), "non-string keystone dropped");
}

console.log("merge (union by week)");
{
  const local = T.normalizeState({ habits: [], keystone: { "2025-01-06": "a" } });
  const remote = T.normalizeState({ habits: [], keystone: { "2025-01-13": "b" } });
  const merged = T.mergeStates(local, remote);
  assert(merged.keystone["2025-01-06"] === "a" && merged.keystone["2025-01-13"] === "b", "distinct weeks unioned");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
