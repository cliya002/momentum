// Tests backup export/import round-trip + validation.
// Run: node test/backup.test.js
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const versionSrc = fs.readFileSync(path.join(root, "version.js"), "utf8");
const appSrc = fs.readFileSync(path.join(root, "app.js"), "utf8");
const store = {};
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
const sandbox = {};
new Function("self", "localStorage", versionSrc + "\n" + appSrc)(sandbox, global.localStorage);
const T = sandbox.__momentumTest;

let pass = 0, fail = 0;
function assert(c, m) { if (c) { pass++; console.log("  ✓ " + m); } else { fail++; console.log("  ✗ FAIL: " + m); } }

console.log("Backup round-trip (replace)");
{
  const inc = {
    habits: [{ id: "a", name: "A", target: 1, days: [0, 1, 2, 3, 4, 5, 6], createdAt: "2024-01-01T00:00:00.000Z", updatedAt: 111 }],
    completions: { "2025-01-01": { a: 1 } },
    completionsUpdatedAt: { "2025-01-01": 222 },
  };
  const norm = T.normalizeState(inc);
  T.setState(T.normalizeState({ habits: [] }));
  const ok = T.applyBackup({ schemaVersion: 1, state: inc }, "replace");
  assert(ok === true, "applyBackup returns true");
  const got = T.getState();
  assert(JSON.stringify(got.habits) === JSON.stringify(norm.habits), "habits reproduced exactly");
  assert(JSON.stringify(got.completions) === JSON.stringify(norm.completions), "completions reproduced exactly");
}

console.log("Accepts a bare state object too");
{
  const ok = T.applyBackup({ habits: [{ id: "b", name: "B", updatedAt: 5 }] }, "replace");
  assert(ok === true && T.getState().habits.some((h) => h.id === "b"), "bare {habits:[...]} accepted");
}

console.log("Rejects invalid input");
{
  let threw = false;
  try { T.applyBackup({ foo: 1 }, "replace"); } catch (e) { threw = true; }
  assert(threw, "unrecognized structure throws");
  let threw2 = false;
  try { T.applyBackup(null, "replace"); } catch (e) { threw2 = true; }
  assert(threw2, "null throws");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
