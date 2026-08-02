// Tests the richer full-history CSV export (mood + supplement sections).
// Run: node test/export.test.js
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

console.log("buildAllCsv (mood + supplement sections)");
{
  const st = T.defaultState();
  st.habits = [
    { id: "h1", name: "Vitamin D", category: "Supplements", type: "count", target: 1, archived: false },
    { id: "h2", name: "Magnesium", category: "Supplements", type: "count", target: 2, archived: false },
    { id: "h3", name: "Walk", category: "Fitness", type: "check", target: 1, archived: false },
  ];
  st.completions = {
    "2026-08-01": { h1: 1, h2: 1, h3: 1 },
    "2026-08-02": { h1: 1, h2: 2 },
  };
  st.moods = { "2026-08-01": { mood: 4, updatedAt: 1 }, "2026-08-02": { mood: 2, updatedAt: 1 } };
  st.journal = { "2026-08-02": { text: "tired today", updatedAt: 1 } };
  st.measurements = {};
  st.customMetrics = [];
  T.setState(st);

  const csv = T.buildAllCsv();
  assert(csv.includes("HABIT CHECK-INS"), "has check-ins section");
  assert(csv.includes("MEASUREMENTS"), "has measurements section");
  assert(csv.includes("MOOD & JOURNAL"), "has mood & journal section");
  assert(csv.includes("SUPPLEMENTS"), "has supplements section");

  // Mood + journal rows.
  assert(csv.includes("2026-08-01,4,"), "logs energy value 4 for Aug 1");
  assert(csv.includes("tired today"), "includes journal note text");

  // Supplement dose log rows with taken/target/status.
  assert(csv.includes("Vitamin D,1,1,taken"), "Vitamin D 1/1 -> taken");
  assert(csv.includes("Magnesium,1,2,partial"), "Magnesium 1/2 -> partial");
  assert(csv.includes("Magnesium,2,2,taken"), "Magnesium 2/2 -> taken");

  // A non-supplement habit must not appear in the SUPPLEMENTS section.
  const suppSection = csv.split("SUPPLEMENTS")[1] || "";
  assert(!suppSection.includes("Walk"), "non-supplement habit excluded from supplements section");

  // No supplement/mood data → those sections are omitted (no crash).
  const empty = T.defaultState();
  T.setState(empty);
  const csv2 = T.buildAllCsv();
  assert(csv2.includes("HABIT CHECK-INS"), "empty state still produces check-ins header");
  assert(!csv2.includes("SUPPLEMENTS"), "no supplement habits -> no supplements section");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
